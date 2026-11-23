// ud-parser.js — a dependency parser for ANY language with a Universal Dependencies treebank: the grammar step of NL → grammar → EOT.
//
// Same family as english-parser.js (an averaged perceptron over transitions, no network, no model download at use), with the four changes
// the parsing literature measured to matter, so one recipe serves every treebank:
//   1. LABELLED arc-eager transitions (SHIFT, REDUCE, LEFT:l, RIGHT:l): labels are decided with the arc and are features for later moves.
//   2. The Zhang & Nivre (2011) rich feature set: words and tags of the stack top, its head and grand-head, the first three buffer words,
//      left/right-most children with their labels, distance, valency, and the label sets already attached.
//   3. A DYNAMIC oracle with exploration (Goldberg & Nivre 2012/2013): the parser learns from states its own mistakes lead to, not only
//      from the gold path; non-projective trees are trained on too (the arcs no projective path can make are simply lost, not refused).
//   4. PREDICTED tags in training (k-fold jackknife): the parser trains on the tags it will be given at use.
// The tagger and lemma lexicon are english-parser.js's own (its tagger features carry no language-specific rule).
// Declared, not measured: the exploration probability 0.9 after the first iteration and the 4 jackknife folds (Goldberg & Nivre's values).
import { Perceptron, seeded, tagSentence, lemmaAndFeats, train as trainTaggerAndLexicon, tokenize } from "./english-parser.js";

export const UD_PARSER_SCHEMA = "UDParser@1";
export { tokenize };

const norm = (w) => (w === "ROOT" ? w : /\d/.test(w) ? w.replace(/\d/g, "#").toLowerCase() : w.toLowerCase());
const dist = (d) => (d <= 4 ? String(d) : d <= 7 ? "5-7" : "8+");
// a token's FEATS string is one of a small closed set, read at every parser step for several keys: each distinct string is split
// once (the FIRST value of a key wins, as find() did) and the answer looked up after that
const _attrs = new Map();
const attr = (feats, key) => {
  if (!feats || feats === "_") return "_";
  let o = _attrs.get(feats);
  if (o === undefined) { o = new Map(); for (const x of feats.split("|")) { const i = x.indexOf("="); if (i >= 0) { const k = x.slice(0, i); if (!o.has(k)) o.set(k, x.slice(i + 1)); } } if (_attrs.size > 100000) _attrs.clear(); _attrs.set(feats, o); }
  const v = o.get(key); return v === undefined ? "_" : v;
};

// Kāraka: the semantic role a token carries, computed from surface form (not deprel, which is unknown at parse time).
// Pattern languages: Case feat -> kāraka (CASE_KARAKA). Ground languages: particle form -> kāraka. Figure languages: UPOS proxy.
const CASE_KARAKA = { Nom: "kartṛ", Acc: "karman", Ins: "karaṇa", Dat: "sampradāna", Abl: "apādāna", Loc: "adhikaraṇa" };
const PARTICLE_KARAKA = { "把": "karman", "被": "karman", "給": "sampradāna", "向": "sampradāna", "從": "apādāna", "在": "adhikaraṇa", "於": "adhikaraṇa", "用": "karaṇa", "以": "karaṇa", "時": "kāla", "時候": "kāla", "因": "hetu", "因為": "hetu", "為": "prayojana", "為了": "prayojana" };
const UPOS_KARAKA = { "NOUN": null, "PRON": "kartṛ", "VERB": null, "ADJ": null, "ADV": null, "ADP": "adhikaraṇa", "DET": null, "AUX": null, "CCONJ": null, "SCONJ": null, "PART": null, "NUM": null, "PROPN": "kartṛ" };
function karakaOf(form, upos, feats) {
  const caseVal = attr(feats, "Case");
  if (caseVal !== "_" && CASE_KARAKA[caseVal]) return CASE_KARAKA[caseVal];
  const pk = PARTICLE_KARAKA[String(form ?? "").trim()];
  if (pk) return pk;
  // Figure-language proxy: UPOS-based heuristic
  if (upos === "PRON" || upos === "PROPN") return "kartṛ";
  if (upos === "ADP") return "adhikaraṇa";
  return null;
}

function newState(n) {
  return { n, i: 1, stack: [0], head: new Int32Array(n).fill(-1), label: new Array(n).fill(null), left: Array.from({ length: n }, () => []), right: Array.from({ length: n }, () => []) };
}
const top = (st) => st.stack[st.stack.length - 1];

// `sink` (optional): called with each feature's (template, ...values) instead of its string key being built — the fast path
// of a loaded model (featureIndex below). Without it, the string keys exactly as always.
function features(st, W, T, F, C = null, Lm = null, sink = null) {
  const f = [];
  const add = sink ?? ((k, ...v) => f.push(k + "\u0001" + v.join("\u0002")));
  const s0 = st.stack.length ? top(st) : -1, n0 = st.i < st.n ? st.i : -1, n1 = st.i + 1 < st.n ? st.i + 1 : -1, n2 = st.i + 2 < st.n ? st.i + 2 : -1;
  const w = (k) => (k < 0 ? "∅" : W[k]), t = (k) => (k < 0 ? "∅" : T[k]);
  const h = (k) => (k > 0 && st.head[k] >= 0 ? st.head[k] : -1), lab = (k) => (k > 0 && st.label[k] ? st.label[k] : "∅");
  const lc = (k, j = 0) => (k > 0 && st.left[k].length > j ? st.left[k][j] : -1), rc = (k, j = 0) => (k > 0 && st.right[k].length > j ? st.right[k][st.right[k].length - 1 - j] : -1);
  const s0h = h(s0), s0h2 = h(s0h), s0l = lc(s0), s0r = rc(s0), n0l = lc(n0), s0l2 = lc(s0, 1), s0r2 = rc(s0, 1), n0l2 = lc(n0, 1);
  const d = s0 > 0 && n0 > 0 ? dist(n0 - s0) : "∅";
  const vl = (k) => (k > 0 ? st.left[k].length : 0), vr = (k) => (k > 0 ? st.right[k].length : 0);
  const setL = (k) => (k > 0 ? st.left[k].map((x) => st.label[x]).sort().join("|") : "∅"), setR = (k) => (k > 0 ? st.right[k].map((x) => st.label[x]).sort().join("|") : "∅");
  add("b");
  add("s0w", w(s0)); add("s0t", t(s0)); add("s0wt", w(s0), t(s0));
  add("n0w", w(n0)); add("n0t", t(n0)); add("n0wt", w(n0), t(n0));
  add("n1w", w(n1)); add("n1t", t(n1)); add("n1wt", w(n1), t(n1));
  add("n2w", w(n2)); add("n2t", t(n2)); add("n2wt", w(n2), t(n2));
  add("s0wt.n0wt", w(s0), t(s0), w(n0), t(n0)); add("s0wt.n0w", w(s0), t(s0), w(n0)); add("s0w.n0wt", w(s0), w(n0), t(n0));
  add("s0wt.n0t", w(s0), t(s0), t(n0)); add("s0t.n0wt", t(s0), w(n0), t(n0)); add("s0w.n0w", w(s0), w(n0)); add("s0t.n0t", t(s0), t(n0)); add("n0t.n1t", t(n0), t(n1));
  add("n0t.n1t.n2t", t(n0), t(n1), t(n2)); add("s0t.n0t.n1t", t(s0), t(n0), t(n1)); add("s0ht.s0t.n0t", t(s0h), t(s0), t(n0));
  add("s0t.s0lt.n0t", t(s0), t(s0l), t(n0)); add("s0t.s0rt.n0t", t(s0), t(s0r), t(n0)); add("s0t.n0t.n0lt", t(s0), t(n0), t(n0l));
  add("s0w.d", w(s0), d); add("s0t.d", t(s0), d); add("n0w.d", w(n0), d); add("n0t.d", t(n0), d); add("s0w.n0w.d", w(s0), w(n0), d); add("s0t.n0t.d", t(s0), t(n0), d);
  add("s0w.vr", w(s0), vr(s0)); add("s0t.vr", t(s0), vr(s0)); add("s0w.vl", w(s0), vl(s0)); add("s0t.vl", t(s0), vl(s0)); add("n0w.vl", w(n0), vl(n0)); add("n0t.vl", t(n0), vl(n0));
  add("s0hw", w(s0h)); add("s0ht", t(s0h)); add("s0l", lab(s0)); add("s0h2w", w(s0h2)); add("s0h2t", t(s0h2)); add("s0hl", lab(s0h));
  add("s0lw", w(s0l)); add("s0lt", t(s0l)); add("s0ll", lab(s0l)); add("s0rw", w(s0r)); add("s0rt", t(s0r)); add("s0rl", lab(s0r));
  add("n0lw", w(n0l)); add("n0lt", t(n0l)); add("n0ll", lab(n0l));
  add("s0l2w", w(s0l2)); add("s0l2t", t(s0l2)); add("s0l2l", lab(s0l2)); add("s0r2w", w(s0r2)); add("s0r2t", t(s0r2)); add("s0r2l", lab(s0r2));
  add("n0l2w", w(n0l2)); add("n0l2t", t(n0l2)); add("n0l2l", lab(n0l2));
  add("s0t.s0lt.s0l2t", t(s0), t(s0l), t(s0l2)); add("s0t.s0rt.s0r2t", t(s0), t(s0r), t(s0r2)); add("s0t.s0ht.s0h2t", t(s0), t(s0h), t(s0h2)); add("n0t.n0lt.n0l2t", t(n0), t(n0l), t(n0l2));
  if (C) { const c = (k, g) => (k < 0 ? "∅" : C[k]?.[g] ?? "-");
    add("s0c1", c(s0, 0)); add("n0c1", c(n0, 0)); add("n1c1", c(n1, 0)); add("s0c2", c(s0, 1)); add("n0c2", c(n0, 1));
    add("s0c1.n0c1", c(s0, 0), c(n0, 0)); add("s0c2.n0t", c(s0, 1), t(n0)); add("s0t.n0c2", t(s0), c(n0, 1)); add("s0hc1.s0c1.n0c1", c(s0h, 0), c(s0, 0), c(n0, 0)); add("n0c1.n1c1", c(n0, 0), c(n1, 0)); }
  if (F) { const fa = (k, key) => (k < 0 ? "_" : attr(F[k], key));
    add("s0case", fa(s0, "Case")); add("n0case", fa(n0, "Case")); add("n1case", fa(n1, "Case"));
    add("s0case.n0case", fa(s0, "Case"), fa(n0, "Case")); add("s0case.s0t", fa(s0, "Case"), t(s0)); add("n0case.n0t", fa(n0, "Case"), t(n0));
    // Kāraka features (semantic role, computed from surface form — universal across grains)
    const ka = (k) => (k < 0 ? "∅" : (karakaOf(W[k], T[k], F[k]) ?? "∅"));
    add("s0k", ka(s0)); add("n0k", ka(n0)); add("n1k", ka(n1));
    add("s0k.n0k", ka(s0), ka(n0)); add("s0k.s0t", ka(s0), t(s0)); add("n0k.n0t", ka(n0), t(n0));
    add("s0k.n0t", ka(s0), t(n0)); add("n0k.s0t", ka(n0), t(s0));
    add("s0num", fa(s0, "Number")); add("n0num", fa(n0, "Number")); add("s0gen", fa(s0, "Gender")); add("n0gen", fa(n0, "Gender"));
    add("s0pers", fa(s0, "Person")); add("n0pers", fa(n0, "Person")); add("s0case.s0ht", fa(s0, "Case"), t(s0h));
  }
  { const su = (k, n) => w(k).slice(-n);
    for (const [name, k] of [["s0", s0], ["n0", n0], ["n1", n1]]) {
      add(name + "s1", su(k, 1)); add(name + "s2", su(k, 2)); add(name + "s3", su(k, 3)); add(name + "s4", su(k, 4));
      add(name + "sh", shapeOf(w(k)));
    }
  }
  if (Lm) { const l = (k) => (k < 0 ? "∅" : Lm[k]);
    add("s0l", l(s0)); add("n0l", l(n0)); add("n1l", l(n1)); add("n2l", l(n2));
    add("s0l.n0l", l(s0), l(n0)); add("s0l.s0t", l(s0), t(s0)); add("n0l.n0t", l(n0), t(n0));
    add("s0l.n0t", l(s0), t(n0)); add("n0l.s0t", l(n0), t(s0));
  }
  add("s0w.sr", w(s0), setR(s0)); add("s0t.sr", t(s0), setR(s0)); add("s0w.sl", w(s0), setL(s0)); add("s0t.sl", t(s0), setL(s0)); add("n0w.sl", w(n0), setL(n0)); add("n0t.sl", t(n0), setL(n0));
  return f;
}

// moves are indexed: 0 SHIFT, 1 REDUCE, then LEFT:l and RIGHT:l for every label
function moveSet(labels) {
  const m = ["SHIFT", "REDUCE", ...labels.map((l) => `L:${l}`), ...labels.map((l) => `R:${l}`)];
  return { names: m, L0: 2, R0: 2 + labels.length, nl: labels.length };
}
function valid(st, M) {
  const s0 = top(st), buf = st.i < st.n, v = new Array(M.names.length).fill(false);
  v[0] = buf;
  v[1] = s0 > 0 && st.head[s0] >= 0;
  const canL = buf && s0 > 0 && st.head[s0] < 0, canR = buf && s0 >= 0;
  for (let k = 0; k < M.nl; k++) { v[M.L0 + k] = canL; v[M.R0 + k] = canR; }
  if (s0 === 0) for (let k = 0; k < M.nl; k++) if (M.names[M.R0 + k] !== "R:root") v[M.R0 + k] = false; // only "root" hangs off ROOT
  if (s0 > 0) { const ri = M.names.indexOf("R:root"); if (ri >= 0) v[ri] = false; }
  return v;
}
function apply(st, a, M) {
  const s0 = top(st);
  if (a === 0) { st.stack.push(st.i); st.i++; return; }
  if (a === 1) { st.stack.pop(); return; }
  if (a < M.R0) { st.head[s0] = st.i; st.label[s0] = M.names[a].slice(2); st.left[st.i].unshift(s0); st.stack.pop(); return; }
  st.head[st.i] = s0; st.label[st.i] = M.names[a].slice(2); st.right[s0].push(st.i); st.stack.push(st.i); st.i++;
}
/** the arc-eager dynamic oracle (Goldberg & Nivre 2013): the number of gold arcs a move makes unreachable, plus a wrong label on a right arc */
function costs(st, gh, gl, M) {
  const s0 = top(st), n0 = st.i < st.n ? st.i : -1, c = new Array(M.names.length).fill(Infinity), v = valid(st, M);
  const inStack = (k) => st.stack.includes(k);
  if (v[0]) { let x = 0; for (const k of st.stack) { if (gh[k] === n0 && st.head[k] < 0) x++; if (gh[n0] === k) x++; } c[0] = x; }
  if (v[1]) { let x = 0; for (let k = st.i; k < st.n; k++) if (gh[k] === s0) x++; c[1] = x; }
  if (v[M.L0]) {
    let x = 0; for (let k = st.i; k < st.n; k++) { if (gh[k] === s0) x++; if (gh[s0] === k && k !== n0) x++; }
    for (let k = 0; k < M.nl; k++) c[M.L0 + k] = x + (gh[s0] === n0 && M.names[M.L0 + k].slice(2) !== gl[s0] ? 1 : 0);
  }
  if (n0 > 0) {
    let x = 0; for (const k of st.stack) { if (k === s0) continue; if (gh[k] === n0 && st.head[k] < 0) x++; if (gh[n0] === k) x++; }
    for (let k = st.i + 1; k < st.n; k++) if (gh[n0] === k) x++;
    for (let k = 0; k < M.nl; k++) if (v[M.R0 + k]) c[M.R0 + k] = x + (gh[n0] === s0 && M.names[M.R0 + k].slice(2) !== gl[n0] ? 1 : 0);
  }
  if (!inStack(0)) return c;
  return c;
}

const clone = (st) => ({ n: st.n, i: st.i, stack: st.stack.slice(), head: st.head.slice(), label: st.label.slice(), left: st.left.map((x) => x.slice()), right: st.right.map((x) => x.slice()) });
/** one beam step: every item expanded by every valid move, the `size` best by total score kept */
function beamStep(items, parser, M, W, T, F, size, Cl = null, Lm = null) {
  const cand = [];
  for (const it of items) {
    if (it.st.i >= it.st.n) { cand.push({ ...it, done: true }); continue; }
    const v = valid(it.st, M), f = features(it.st, W, T, F, Cl, Lm), s = parser.scores(f);
    for (let a = 0; a < v.length; a++) if (v[a]) cand.push({ it, a, f, score: it.score + s[a] });
  }
  cand.sort((x, y) => y.score - x.score);
  return cand.slice(0, size).map((c) => { if (c.done) return c; const st = clone(c.it.st); apply(st, c.a, M); return { st, score: c.score, moves: [...c.it.moves, c.a], steps: [...c.it.steps, [c.f, c.a]] }; });
}
// ── THE FEATURE INDEX: a loaded model's feature keys as integer tuples (2026-11-23) ──────────────────────────────────────
// A parser step builds ~90 feature strings ("s0wt.n0w\u0001said\u0002VERB\u0002he") and hashes each to find its weights; that
// was most of the cost of reading (War and Peace: ~50 s of a ~100 s parse on one core). The values in a feature (a word, a
// tag, a label) are strings the parser already holds, whose hashes the engine keeps, and the model's keys are a closed set.
// So each model key is split once, at load, into its template and its values; the values are interned to integers; and a
// feature at run time is found by its integer tuple: one hash of the tuple, then the tuple VERIFIED against the stored one,
// so a hit is exactly the key the string would have found, and a value the model never saw ends the lookup at once.
// Each entry keeps only its nonzero weights, in class order: the same additions, in the same order, as Perceptron.scores.
const H = (h, x) => { h = Math.imul(h ^ x, 0x9e3779b1); return h ^ (h >>> 15); };
export function featureIndex(p) { return featureIndexOf(p.w, p.classes); }
/** the index from a model's JSON (classes + { key: [class, weight, …] }), with no dense rows built at all */
export function featureIndexFromJSON(pj) {
  const n = pj.classes.length, row = new Float32Array(n);
  const rows = (function* () { for (const [key, pairs] of Object.entries(pj.w)) { row.fill(0); for (let k = 0; k < pairs.length; k += 2) row[pairs[k]] = pairs[k + 1]; yield [key, row]; } })();
  return featureIndexOf(rows, pj.classes, Object.keys(pj.w).length);
}
function featureIndexOf(entries, classes, size = entries.size) {
  const vid = new Map(), tid = new Map();
  const idOf = (m, s) => { let i = m.get(s); if (i === undefined) { i = m.size; m.set(s, i); } return i; };
  const E = size;
  const idsStart = new Int32Array(E + 1), nzStart = new Int32Array(E + 1), next = new Int32Array(E).fill(-1);
  const ids = [], nzI = [], nzV = [];
  let bits = 16; while ((1 << bits) < E * 2) bits++; const mask = (1 << bits) - 1;
  const heads = new Int32Array(mask + 1).fill(-1);
  let e = 0;
  for (const [key, arr] of entries) {
    const cut = key.indexOf("\u0001");
    if (cut < 0) return null; // not this parser's key shape: no index, the string path stays
    const parts = [idOf(tid, key.slice(0, cut))];
    for (const v of key.slice(cut + 1).split("\u0002")) parts.push(idOf(vid, v));
    idsStart[e] = ids.length; for (const x of parts) ids.push(x);
    nzStart[e] = nzI.length; for (let c = 0; c < arr.length; c++) if (arr[c] !== 0) { nzI.push(c); nzV.push(arr[c]); }
    let h = parts.length; for (const x of parts) h = H(h, x); h &= mask;
    next[e] = heads[h]; heads[h] = e;
    e++;
  }
  idsStart[E] = ids.length; nzStart[E] = nzI.length;
  const small = new Int32Array(256).fill(-1); for (let k = 0; k < 256; k++) { const id = vid.get(String(k)); if (id !== undefined) small[k] = id; }
  return { vid, tid, heads, mask, next, small, idsStart, idsPool: Int32Array.from(ids), nzStart, nzIdx: Int32Array.from(nzI), nzVal: Float32Array.from(nzV), n: classes.length, classes };
}
// ── THE INTEGER FEATURES: features() above, template for template and in the same order, over ids ────────────────────────
// Every value a feature reads is a property of one word (its form, tag, lemma, suffixes, shape, FEATS keys, kāraka, cluster
// characters) or of the parser state (a label, the distance bucket, a valency, a label set). The word values are interned ONCE
// per sentence (sentenceIds); the state values per step. Each template is then a tuple of integers looked up in the index:
// the same entries as the string keys, found in the same order, so the same sums and the same tree. A value the model never saw
// has id -1 and the template is skipped, as its string key would have found nothing.
const TEMPLATES = ["b", "s0w", "s0t", "s0wt", "n0w", "n0t", "n0wt", "n1w", "n1t", "n1wt", "n2w", "n2t", "n2wt", "s0wt.n0wt", "s0wt.n0w", "s0w.n0wt", "s0wt.n0t", "s0t.n0wt", "s0w.n0w", "s0t.n0t", "n0t.n1t", "n0t.n1t.n2t", "s0t.n0t.n1t", "s0ht.s0t.n0t", "s0t.s0lt.n0t", "s0t.s0rt.n0t", "s0t.n0t.n0lt", "s0w.d", "s0t.d", "n0w.d", "n0t.d", "s0w.n0w.d", "s0t.n0t.d", "s0w.vr", "s0t.vr", "s0w.vl", "s0t.vl", "n0w.vl", "n0t.vl", "s0hw", "s0ht", "s0l", "s0h2w", "s0h2t", "s0hl", "s0lw", "s0lt", "s0ll", "s0rw", "s0rt", "s0rl", "n0lw", "n0lt", "n0ll", "s0l2w", "s0l2t", "s0l2l", "s0r2w", "s0r2t", "s0r2l", "n0l2w", "n0l2t", "n0l2l", "s0t.s0lt.s0l2t", "s0t.s0rt.s0r2t", "s0t.s0ht.s0h2t", "n0t.n0lt.n0l2t", "s0c1", "n0c1", "n1c1", "s0c2", "n0c2", "s0c1.n0c1", "s0c2.n0t", "s0t.n0c2", "s0hc1.s0c1.n0c1", "n0c1.n1c1", "s0case", "n0case", "n1case", "s0case.n0case", "s0case.s0t", "n0case.n0t", "s0k", "n0k", "n1k", "s0k.n0k", "s0k.s0t", "n0k.n0t", "s0k.n0t", "n0k.s0t", "s0num", "n0num", "s0gen", "n0gen", "s0pers", "n0pers", "s0case.s0ht", "s0s1", "s0s2", "s0s3", "s0s4", "s0sh", "n0s1", "n0s2", "n0s3", "n0s4", "n0sh", "n1s1", "n1s2", "n1s3", "n1s4", "n1sh", "n0l", "n1l", "n2l", "s0l.n0l", "s0l.s0t", "n0l.n0t", "s0l.n0t", "n0l.s0t", "s0w.sr", "s0t.sr", "s0w.sl", "s0t.sl", "n0w.sl", "n0t.sl"];
function templateIds(ix) { const o = Object.create(null); for (const t of TEMPLATES) o[t] = ix.tid.get(t) ?? -1; return o; }
const vidOf = (ix, x) => { const id = ix.vid.get(x); return id === undefined ? -1 : id; };
/** each word's value ids for one sentence (index 0 is ROOT, as in W/T/F/Lm/C), and the constants the templates use */
function sentenceIds(ix, W, T, F, C, Lm) {
  const n = W.length, I = (x) => vidOf(ix, x), A = () => new Int32Array(n);
  const X = { n, w: A(), t: A(), lm: A(), cas: A(), num: A(), gen: A(), pers: A(), ka: A(), sh: A(), s1: A(), s2: A(), s3: A(), s4: A(), c0: A(), c1: A() };
  for (let k = 0; k < n; k++) {
    const wk = W[k];
    X.w[k] = I(wk); X.t[k] = I(T[k]);
    X.lm[k] = Lm ? I(Lm[k]) : -1;
    if (F) { X.cas[k] = I(attr(F[k], "Case")); X.num[k] = I(attr(F[k], "Number")); X.gen[k] = I(attr(F[k], "Gender")); X.pers[k] = I(attr(F[k], "Person")); X.ka[k] = I(karakaOf(W[k], T[k], F[k]) ?? "∅"); }
    X.s1[k] = I(wk.slice(-1)); X.s2[k] = I(wk.slice(-2)); X.s3[k] = I(wk.slice(-3)); X.s4[k] = I(wk.slice(-4)); X.sh[k] = I(shapeOf(wk));
    if (C) { X.c0[k] = I(C[k]?.[0] ?? "-"); X.c1[k] = I(C[k]?.[1] ?? "-"); }
  }
  // the values a template reads where its word is absent (k < 0), exactly as the string closures write them
  X.NONE = I("∅"); X.UNDER = I("_"); X.EMPTY = I(""); X.NONE_SH = I(shapeOf("∅"));
  X.NONE_S = [I("∅".slice(-1)), I("∅".slice(-2)), I("∅".slice(-3)), I("∅".slice(-4))];
  X.hasF = !!F; X.hasC = !!C; X.hasLm = !!Lm;
  return X;
}
function featuresFast(ix, TP, st, X, emit) {
  const s0 = st.stack.length ? top(st) : -1, n0 = st.i < st.n ? st.i : -1, n1 = st.i + 1 < st.n ? st.i + 1 : -1, n2 = st.i + 2 < st.n ? st.i + 2 : -1;
  const NONE = X.NONE;
  const w = (k) => (k < 0 ? NONE : X.w[k]), t = (k) => (k < 0 ? NONE : X.t[k]);
  const h = (k) => (k > 0 && st.head[k] >= 0 ? st.head[k] : -1);
  const lab = (k) => (k > 0 && st.label[k] ? vidOf(ix, st.label[k]) : NONE);
  const lc = (k, j = 0) => (k > 0 && st.left[k].length > j ? st.left[k][j] : -1), rc = (k, j = 0) => (k > 0 && st.right[k].length > j ? st.right[k][st.right[k].length - 1 - j] : -1);
  const s0h = h(s0), s0h2 = h(s0h), s0l = lc(s0), s0r = rc(s0), n0l = lc(n0), s0l2 = lc(s0, 1), s0r2 = rc(s0, 1), n0l2 = lc(n0, 1);
  const d = s0 > 0 && n0 > 0 ? vidOf(ix, dist(n0 - s0)) : NONE;
  const num = (x) => (x < 256 ? ix.small[x] : vidOf(ix, String(x)));
  const vl = (k) => num(k > 0 ? st.left[k].length : 0), vr = (k) => num(k > 0 ? st.right[k].length : 0);
  const setL = (k) => (k > 0 ? vidOf(ix, st.left[k].map((x) => st.label[x]).sort().join("|")) : NONE), setR = (k) => (k > 0 ? vidOf(ix, st.right[k].map((x) => st.label[x]).sort().join("|")) : NONE);
  const e1 = (tp, a) => emit(TP[tp], 1, a, 0, 0, 0), e2 = (tp, a, b) => emit(TP[tp], 2, a, b, 0, 0), e3 = (tp, a, b, c) => emit(TP[tp], 3, a, b, c, 0), e4 = (tp, a, b, c, dd) => emit(TP[tp], 4, a, b, c, dd);
  emit(TP.b, 1, X.EMPTY, 0, 0, 0);
  e1("s0w", w(s0)); e1("s0t", t(s0)); e2("s0wt", w(s0), t(s0));
  e1("n0w", w(n0)); e1("n0t", t(n0)); e2("n0wt", w(n0), t(n0));
  e1("n1w", w(n1)); e1("n1t", t(n1)); e2("n1wt", w(n1), t(n1));
  e1("n2w", w(n2)); e1("n2t", t(n2)); e2("n2wt", w(n2), t(n2));
  e4("s0wt.n0wt", w(s0), t(s0), w(n0), t(n0)); e3("s0wt.n0w", w(s0), t(s0), w(n0)); e3("s0w.n0wt", w(s0), w(n0), t(n0));
  e3("s0wt.n0t", w(s0), t(s0), t(n0)); e3("s0t.n0wt", t(s0), w(n0), t(n0)); e2("s0w.n0w", w(s0), w(n0)); e2("s0t.n0t", t(s0), t(n0)); e2("n0t.n1t", t(n0), t(n1));
  e3("n0t.n1t.n2t", t(n0), t(n1), t(n2)); e3("s0t.n0t.n1t", t(s0), t(n0), t(n1)); e3("s0ht.s0t.n0t", t(s0h), t(s0), t(n0));
  e3("s0t.s0lt.n0t", t(s0), t(s0l), t(n0)); e3("s0t.s0rt.n0t", t(s0), t(s0r), t(n0)); e3("s0t.n0t.n0lt", t(s0), t(n0), t(n0l));
  e2("s0w.d", w(s0), d); e2("s0t.d", t(s0), d); e2("n0w.d", w(n0), d); e2("n0t.d", t(n0), d); e3("s0w.n0w.d", w(s0), w(n0), d); e3("s0t.n0t.d", t(s0), t(n0), d);
  e2("s0w.vr", w(s0), vr(s0)); e2("s0t.vr", t(s0), vr(s0)); e2("s0w.vl", w(s0), vl(s0)); e2("s0t.vl", t(s0), vl(s0)); e2("n0w.vl", w(n0), vl(n0)); e2("n0t.vl", t(n0), vl(n0));
  e1("s0hw", w(s0h)); e1("s0ht", t(s0h)); e1("s0l", lab(s0)); e1("s0h2w", w(s0h2)); e1("s0h2t", t(s0h2)); e1("s0hl", lab(s0h));
  e1("s0lw", w(s0l)); e1("s0lt", t(s0l)); e1("s0ll", lab(s0l)); e1("s0rw", w(s0r)); e1("s0rt", t(s0r)); e1("s0rl", lab(s0r));
  e1("n0lw", w(n0l)); e1("n0lt", t(n0l)); e1("n0ll", lab(n0l));
  e1("s0l2w", w(s0l2)); e1("s0l2t", t(s0l2)); e1("s0l2l", lab(s0l2)); e1("s0r2w", w(s0r2)); e1("s0r2t", t(s0r2)); e1("s0r2l", lab(s0r2));
  e1("n0l2w", w(n0l2)); e1("n0l2t", t(n0l2)); e1("n0l2l", lab(n0l2));
  e3("s0t.s0lt.s0l2t", t(s0), t(s0l), t(s0l2)); e3("s0t.s0rt.s0r2t", t(s0), t(s0r), t(s0r2)); e3("s0t.s0ht.s0h2t", t(s0), t(s0h), t(s0h2)); e3("n0t.n0lt.n0l2t", t(n0), t(n0l), t(n0l2));
  if (X.hasC) { const c = (k, g) => (k < 0 ? NONE : g === 0 ? X.c0[k] : X.c1[k]);
    e1("s0c1", c(s0, 0)); e1("n0c1", c(n0, 0)); e1("n1c1", c(n1, 0)); e1("s0c2", c(s0, 1)); e1("n0c2", c(n0, 1));
    e2("s0c1.n0c1", c(s0, 0), c(n0, 0)); e2("s0c2.n0t", c(s0, 1), t(n0)); e2("s0t.n0c2", t(s0), c(n0, 1)); e3("s0hc1.s0c1.n0c1", c(s0h, 0), c(s0, 0), c(n0, 0)); e2("n0c1.n1c1", c(n0, 0), c(n1, 0)); }
  if (X.hasF) { const fa = (k, arr) => (k < 0 ? X.UNDER : arr[k]), C_ = X.cas;
    e1("s0case", fa(s0, C_)); e1("n0case", fa(n0, C_)); e1("n1case", fa(n1, C_));
    e2("s0case.n0case", fa(s0, C_), fa(n0, C_)); e2("s0case.s0t", fa(s0, C_), t(s0)); e2("n0case.n0t", fa(n0, C_), t(n0));
    const ka = (k) => (k < 0 ? NONE : X.ka[k]);
    e1("s0k", ka(s0)); e1("n0k", ka(n0)); e1("n1k", ka(n1));
    e2("s0k.n0k", ka(s0), ka(n0)); e2("s0k.s0t", ka(s0), t(s0)); e2("n0k.n0t", ka(n0), t(n0));
    e2("s0k.n0t", ka(s0), t(n0)); e2("n0k.s0t", ka(n0), t(s0));
    e1("s0num", fa(s0, X.num)); e1("n0num", fa(n0, X.num)); e1("s0gen", fa(s0, X.gen)); e1("n0gen", fa(n0, X.gen));
    e1("s0pers", fa(s0, X.pers)); e1("n0pers", fa(n0, X.pers)); e2("s0case.s0ht", fa(s0, C_), t(s0h));
  }
  { const su = (k, m) => (k < 0 ? X.NONE_S[m - 1] : m === 1 ? X.s1[k] : m === 2 ? X.s2[k] : m === 3 ? X.s3[k] : X.s4[k]), sh = (k) => (k < 0 ? X.NONE_SH : X.sh[k]);
    e1("s0s1", su(s0, 1)); e1("s0s2", su(s0, 2)); e1("s0s3", su(s0, 3)); e1("s0s4", su(s0, 4)); e1("s0sh", sh(s0));
    e1("n0s1", su(n0, 1)); e1("n0s2", su(n0, 2)); e1("n0s3", su(n0, 3)); e1("n0s4", su(n0, 4)); e1("n0sh", sh(n0));
    e1("n1s1", su(n1, 1)); e1("n1s2", su(n1, 2)); e1("n1s3", su(n1, 3)); e1("n1s4", su(n1, 4)); e1("n1sh", sh(n1));
  }
  if (X.hasLm) { const l = (k) => (k < 0 ? NONE : X.lm[k]);
    e1("s0l", l(s0)); e1("n0l", l(n0)); e1("n1l", l(n1)); e1("n2l", l(n2));
    e2("s0l.n0l", l(s0), l(n0)); e2("s0l.s0t", l(s0), t(s0)); e2("n0l.n0t", l(n0), t(n0));
    e2("s0l.n0t", l(s0), t(n0)); e2("n0l.s0t", l(n0), t(s0));
  }
  e2("s0w.sr", w(s0), setR(s0)); e2("s0t.sr", t(s0), setR(s0)); e2("s0w.sl", w(s0), setL(s0)); e2("s0t.sl", t(s0), setL(s0)); e2("n0w.sl", w(n0), setL(n0)); e2("n0t.sl", t(n0), setL(n0));
}
// the emitter for featuresFast: template id + up to 4 value ids → the entry, verified, pushed in call order
function idEmitter(ix, hits) {
  const tup = new Int32Array(5);
  return (tp, nv, a, b, c, d) => {
    if (tp < 0 || a < 0 || (nv > 1 && b < 0) || (nv > 2 && c < 0) || (nv > 3 && d < 0)) return;
    tup[0] = tp; tup[1] = a; tup[2] = b; tup[3] = c; tup[4] = d; const len = nv + 1;
    let hh = len; for (let j = 0; j < len; j++) hh = H(hh, tup[j]); hh &= ix.mask;
    for (let e = ix.heads[hh]; e >= 0; e = ix.next[e]) {
      const s = ix.idsStart[e]; if (ix.idsStart[e + 1] - s !== len) continue;
      let same = true; for (let j = 0; j < len; j++) if (ix.idsPool[s + j] !== tup[j]) { same = false; break; }
      if (same) { hits.push(e); return; }
    }
  };
}
// a sink for features(): each (template, ...values) found in the index pushes its entry, in call order
function indexSink(ix, hits) {
  const tup = new Int32Array(8), vid = ix.vid, small = ix.small, empty = vid.get("") ?? -1;
  const idOfValue = (x) => {
    if (typeof x === "string") { const id = vid.get(x); return id === undefined ? -1 : id; }
    if (x == null) return empty; // Array.prototype.join writes null and undefined as ""
    if (typeof x === "number" && x >= 0 && x < 256 && (x | 0) === x) return small[x];
    const id = vid.get(String(x)); return id === undefined ? -1 : id;
  };
  return function (k, a, b, c, d) {
    const t = ix.tid.get(k); if (t === undefined) return;
    const nv = arguments.length - 1;
    if (nv > 4) throw new Error(`featureIndex sink: ${nv} values for ${k}; the sink takes at most 4`);
    tup[0] = t; let len = 1, id;
    if (nv === 0) { if (empty < 0) return; tup[len++] = empty; } // join([]) === "" === join([""])
    else {
      if ((id = idOfValue(a)) < 0) return; tup[len++] = id;
      if (nv > 1) { if ((id = idOfValue(b)) < 0) return; tup[len++] = id; }
      if (nv > 2) { if ((id = idOfValue(c)) < 0) return; tup[len++] = id; }
      if (nv > 3) { if ((id = idOfValue(d)) < 0) return; tup[len++] = id; }
    }
    let h = len; for (let j = 0; j < len; j++) h = H(h, tup[j]); h &= ix.mask;
    for (let e = ix.heads[h]; e >= 0; e = ix.next[e]) {
      const a = ix.idsStart[e], b = ix.idsStart[e + 1]; if (b - a !== len) continue;
      let same = true; for (let j = 0; j < len; j++) if (ix.idsPool[a + j] !== tup[j]) { same = false; break; }
      if (same) { hits.push(e); return; }
    }
  };
}
// Perceptron.best over the index's entries: the same sums, the same argmax, the same tie-break by class name
function bestOf(ix, hits, valid) {
  // one score buffer per index, zeroed each call (the same start as a new Float64Array), and the index's arrays held locally
  const n = ix.n, s = (ix.scoreBuf ??= new Float64Array(n)), nzStart = ix.nzStart, nzIdx = ix.nzIdx, nzVal = ix.nzVal, classes = ix.classes;
  s.fill(0);
  for (let j = 0; j < hits.length; j++) { const e = hits[j]; for (let k = nzStart[e], z = nzStart[e + 1]; k < z; k++) s[nzIdx[k]] += nzVal[k]; }
  let bi = -1, bv = -Infinity;
  for (let c = 0; c < n; c++) {
    if (valid && !valid[c]) continue;
    const x = s[c];
    if (x > bv || (x === bv && bi >= 0 && classes[c] < classes[bi])) { bv = x; bi = c; }
  }
  return bi;
}
function parseWith(parser, M, W, T, F, beam = 1, Cl = null, Lm = null) {
  let st;
  if (beam > 1) {
    let items = [{ st: newState(W.length), score: 0, moves: [], steps: [] }], guard = 0;
    while (items.some((x) => x.st.i < x.st.n) && guard++ < 4 * W.length + 10) items = beamStep(items, parser, M, W, T, F, beam, Cl, Lm);
    st = items[0].st;
  } else {
    st = newState(W.length);
    let guard = 0;
    const ix = parser.fx ?? null, hits = [];
    // KHORA_PARSER_SINK=1 keeps the string-valued sink (features() itself) for comparison; otherwise the integer features
    const viaSink = ix && process.env.KHORA_PARSER_SINK === "1", sink = viaSink ? indexSink(ix, hits) : null;
    const X = ix && !viaSink ? sentenceIds(ix, W, T, F, Cl, Lm) : null, TP = X ? (ix.TP ??= templateIds(ix)) : null, emit = X ? idEmitter(ix, hits) : null;
    while (st.i < st.n && guard++ < 4 * st.n + 10) {
      const v = valid(st, M);
      if (!v.some(Boolean)) break;
      if (X) { hits.length = 0; featuresFast(ix, TP, st, X, emit); apply(st, bestOf(ix, hits, v), M); }
      else if (ix) { hits.length = 0; features(st, W, T, F, Cl, Lm, sink); apply(st, bestOf(ix, hits, v), M); }
      else apply(st, parser.best(features(st, W, T, F, Cl, Lm), v), M);
    }
  }
  return finish(st);
}
// a word left without a head hangs on the root's dependent (or becomes the root if there is none): a tree, never a forest
function finish(st0) {
  const st = { ...st0, head: st0.head.slice(), label: st0.label.slice() };
  let root = -1; for (let k = 1; k < st.n; k++) if (st.head[k] === 0) { root = k; break; }
  for (let k = 1; k < st.n; k++) if (st.head[k] < 0) { if (root < 0) { root = k; st.head[k] = 0; st.label[k] = "root"; } else { st.head[k] = root; st.label[k] = "dep"; } }
  for (let k = 1; k < st.n; k++) if (st.head[k] === 0 && k !== root) { st.head[k] = root; st.label[k] = "parataxis"; }
  return st;
}

// ── the tagger: an averaged perceptron with richer features than english-parser.js's, and a received LEXICON as a feature ────────────────
// A word's lexicon entry (UniMorph: the parts of speech its form is attested with, e.g. "N|V" for "boils") is a FEATURE of that word and of
// its neighbours, never a constraint: the treebank teaches how far to trust it, and a form the lexicon lacks just has no such feature.
const shapeOf = (w) => w.replace(/[A-Z]+/g, "X").replace(/[a-z]+/g, "x").replace(/[0-9]+/g, "d").replace(/\p{L}+/gu, "l").slice(0, 8);
function tagFeats(i, F, L, prev, prev2, lex, cl = null, sink = null) {
  const f = [], add = sink ?? ((k, ...v) => f.push(k + "\u0001" + v.join("\u0002")));
  const w = F[i], lw = L[i], at = (k) => (k < 0 ? "<s>" : k >= F.length ? "</s>" : L[k]);
  const lx = (k) => (lex && k >= 0 && k < F.length ? lex.get(L[k]) ?? "-" : "?");
  add("b"); add("w", lw); add("t1", prev); add("t2", prev2); add("t12", prev, prev2); add("t1w", prev, lw);
  for (let n = 1; n <= 4; n++) { if (lw.length > n) { add(`s${n}`, lw.slice(-n)); } if (lw.length > n && n <= 3) add(`p${n}`, lw.slice(0, n)); }
  add("sh", shapeOf(w)); add("cap", /^\p{Lu}/u.test(w) ? (i === 0 ? "first" : "mid") : "no"); add("dig", /\d/.test(w) ? "y" : "n"); add("hy", w.includes("-") ? "y" : "n");
  add("w-1", at(i - 1)); add("w-2", at(i - 2)); add("w+1", at(i + 1)); add("w+2", at(i + 2)); add("w-1w", at(i - 1), lw); add("ww+1", lw, at(i + 1));
  add("s3-1", at(i - 1).slice(-3)); add("s3+1", at(i + 1).slice(-3)); add("t1w+1", prev, at(i + 1));
  if (cl) { const c = (k, g) => (k < 0 || k >= F.length ? "∅" : cl.get(L[k])?.[g] ?? "-"); add("c1", c(i, 0)); add("c2", c(i, 1)); add("c1-1", c(i - 1, 0)); add("c1+1", c(i + 1, 0)); add("t1c2", prev, c(i, 1)); add("c2s3", c(i, 1), lw.slice(-3)); }
  add("lx", lx(i)); add("lx-1", lx(i - 1)); add("lx+1", lx(i + 1)); add("lxw", lx(i), lw.slice(-3)); add("t1lx", prev, lx(i));
  return f;
}
/** tagWithMargins(tagger, forms, lex, cl, allowed) → { tags, margins, runnerUp } — the same greedy tagging, with each word's margin between its best
 *  and second class, and an optional per-position restriction (allowed: Map index → Set of classes): the place another giver's evidence enters */
export function tagWithMargins(tagger, forms, lex = null, cl = null, allowed = null) {
  const L = forms.map((w) => (/^\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase()));
  let prev = "<s>", prev2 = "<s2>"; const tags = [], margins = [], runnerUp = [];
  for (let i = 0; i < forms.length; i++) {
    const s = tagger.scores(tagFeats(i, forms, L, prev, prev2, lex, cl)), ok = allowed?.get(i);
    let b = -1, r = -1;
    for (let c = 0; c < tagger.n; c++) { if (ok && !ok.has(tagger.classes[c])) continue; if (b < 0 || s[c] > s[b]) { r = b; b = c; } else if (r < 0 || s[c] > s[r]) r = c; }
    const t = tagger.classes[b]; tags.push(t); margins.push(r < 0 ? Infinity : s[b] - s[r]); runnerUp.push(r < 0 ? null : tagger.classes[r]); prev2 = prev; prev = t;
  }
  return { tags, margins, runnerUp };
}
export function tagWith(tagger, forms, lex = null, cl = null) {
  const L = forms.map((w) => (/^\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase()));
  let prev = "<s>", prev2 = "<s2>"; const out = [];
  // a loaded tagger reads its feature index (featureIndex above): the same entries, sums and argmax as tagger.best
  const ix = tagger.fx ?? null, hits = [], sink = ix ? indexSink(ix, hits) : null;
  for (let i = 0; i < forms.length; i++) {
    let b;
    if (ix) { hits.length = 0; tagFeats(i, forms, L, prev, prev2, lex, cl, sink); b = bestOf(ix, hits, null); }
    else b = tagger.best(tagFeats(i, forms, L, prev, prev2, lex, cl));
    const t = tagger.classes[b]; out.push(t); prev2 = prev; prev = t;
  }
  return out;
}
export function trainTagger(sents, { iterations = 10, seed = "tag", lex = null, cl = null, log = () => {} } = {}) {
  const rand = seeded(seed), classes = [...new Set(sents.flatMap((s) => s.tokens.map((t) => t.upos)))].sort(), tg = new Perceptron(classes);
  for (let it = 0; it < iterations; it++) {
    let ok = 0, n = 0;
    for (const s of shuffle(sents, rand)) {
      const F = s.tokens.map((t) => t.form), L = F.map((w) => (/^\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase()));
      let prev = "<s>", prev2 = "<s2>";
      for (let i = 0; i < F.length; i++) { const f = tagFeats(i, F, L, prev, prev2, lex, cl), g = tg.best(f), t = tg.index.get(s.tokens[i].upos); tg.update(t, g, f); n++; if (g === t) ok++; prev2 = prev; prev = tg.classes[g]; }
    }
    log(`tagger iteration ${it + 1}/${iterations}: ${(100 * ok / n).toFixed(2)}% on training`);
  }
  tg.average();
  return tg;
}
/** a UniMorph file (lemma TAB form TAB features) → Map lower-cased form → its attested parts of speech, "N|V" */
export function unimorphLexicon(text) {
  const m = new Map();
  for (const line of String(text).split("\n")) { const c = line.split("\t"); if (c.length < 3) continue; const pos = c[2].split(";")[0]; for (const form of [c[1], c[0]]) { const k = form.toLowerCase(); const set = m.get(k) ?? new Set(); set.add(pos); m.set(k, set); } }
  return new Map([...m].map(([k, v]) => [k, [...v].sort().join("|")]));
}

function shuffle(a, rand) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

/** train({sents}) → JSON model. sents: [{ tokens: [{form, upos, head, deprel, lemma, feats}] }] (parseConllu's shape) */
// a feature vector moved by v for class c (the averaged perceptron's own bookkeeping, as in Perceptron.update)
function bump(p, feats, c, v) {
  p.fx = null; // a moved weight: the feature index of a loaded model is stale
  for (const f of feats) {
    let w = p.w.get(f);
    if (!w) { w = new Float32Array(p.n); p.w.set(f, w); p.tot.set(f, new Float32Array(p.n)); p.ts.set(f, new Float32Array(p.n)); }
    const tot = p.tot.get(f), ts = p.ts.get(f);
    tot[c] += (p.i - ts[c]) * w[c]; ts[c] = p.i; w[c] += v;
  }
}
/** beam training on one sentence with EARLY UPDATE (Collins & Roark 2004): the gold path is the best-scoring zero-cost move at each step;
 *  the moment it falls out of the beam, the gold prefix is rewarded and the beam's best prefix penalised, and the sentence stops */
function beamSentence(parser, M, d, F, size) {
  let items = [{ st: newState(d.W.length), score: 0, moves: [], steps: [] }];
  const gold = { st: newState(d.W.length), moves: [], steps: [] };
  let guard = 0, n = 0;
  while (gold.st.i < gold.st.n && guard++ < 4 * d.W.length + 10) {
    const v = valid(gold.st, M); if (!v.some(Boolean)) break;
    const f = features(gold.st, d.W, d.T, F, d.C, d.Lm), s = parser.scores(f), c = costs(gold.st, d.gh, d.gl, M);
    let g = -1; for (let a = 0; a < v.length; a++) if (v[a] && c[a] === 0 && (g < 0 || s[a] > s[g])) g = a;
    if (g < 0) { let m = Infinity; for (let a = 0; a < v.length; a++) if (v[a] && c[a] < m) { m = c[a]; g = a; } }
    apply(gold.st, g, M); gold.moves.push(g); gold.steps.push([f, g]);
    items = beamStep(items, parser, M, d.W, d.T, F, size, d.C, d.Lm); n++;
    const key = gold.moves.join(",");
    if (!items.some((x) => x.moves.join(",") === key)) {
      parser.i++;
      for (const [ff, a] of gold.steps) bump(parser, ff, a, 1);
      for (const [ff, a] of items[0].steps) bump(parser, ff, a, -1);
      return { ok: n - 1, n };
    }
  }
  if (items[0].moves.join(",") !== gold.moves.join(",")) { parser.i++; for (const [ff, a] of gold.steps) bump(parser, ff, a, 1); for (const [ff, a] of items[0].steps) bump(parser, ff, a, -1); }
  return { ok: n, n };
}

export function train(sents, { iterations = 10, seed = "ud", folds = 4, explore = 0.9, lex = null, lexSource = null, clusters = null, clustersSource = null, tagIterations = 10, beam = 1, log = () => {} } = {}) {
  const rand = seeded(seed);
  // the lemma lexicon from english-parser.js's builder (one pass); the tagger is this file's, with the received lexicon as a feature;
  // the parser's training tags come from k-fold taggers that never saw the sentence
  const base = trainTaggerAndLexicon(sents, { iterations: 1, seed: `${seed}#lexicon`, log: () => {} });
  const taggerAll = trainTagger(sents, { iterations: tagIterations, seed: `${seed}#tagger`, lex, cl: clusters });
  const predicted = new Array(sents.length);
  for (let f = 0; f < folds; f++) {
    const tg = trainTagger(sents.filter((_, i) => i % folds !== f), { iterations: tagIterations, seed: `${seed}#fold${f}`, lex, cl: clusters });
    sents.forEach((s, i) => { if (i % folds === f) predicted[i] = tagWith(tg, s.tokens.map((t) => t.form), lex, clusters); });
    log(`jackknife fold ${f + 1}/${folds}`);
  }
  const labels = [...new Set(sents.flatMap((s) => s.tokens.map((t) => t.deprel.split(":")[0])))].sort();
  const M = moveSet(labels), parser = new Perceptron(M.names);
  const data = sents.map((s, i) => ({ W: ["ROOT", ...s.tokens.map((t) => norm(t.form))], T: ["ROOT", ...predicted[i]], F: ["_", ...s.tokens.map((t, k) => lemmaAndFeats(base.lexicon, t.form, predicted[i][k]).feats)], Lm: ["ROOT", ...s.tokens.map((t) => norm(t.lemma))], gh: [-1, ...s.tokens.map((t) => t.head)], gl: ["_", ...s.tokens.map((t) => t.deprel.split(":")[0])], C: clusters ? ["ROOT", ...s.tokens.map((t) => clusters.get(norm(t.form)) ?? null)] : null }));
  for (let it = 0; it < iterations; it++) {
    let ok = 0, n = 0;
    for (const d of shuffle(data, rand)) {
      if (beam > 1) { const r = beamSentence(parser, M, d, d.F, beam); ok += r.ok; n += r.n; continue; }
      const st = newState(d.W.length);
      let guard = 0;
      while (st.i < st.n && guard++ < 4 * st.n + 10) {
        const v = valid(st, M);
        if (!v.some(Boolean)) break;
        const f = features(st, d.W, d.T, d.F, d.C, d.Lm), s = parser.scores(f), c = costs(st, d.gh, d.gl, M);
        let pred = -1, bestZero = -1;
        for (let a = 0; a < v.length; a++) { if (!v[a]) continue; if (pred < 0 || s[a] > s[pred]) pred = a; if (c[a] === 0 && (bestZero < 0 || s[a] > s[bestZero])) bestZero = a; }
        if (bestZero < 0) { let m = Infinity; for (let a = 0; a < v.length; a++) if (v[a] && c[a] < m) { m = c[a]; bestZero = a; } }
        n++; if (c[pred] === 0) ok++;
        parser.update(bestZero, c[pred] === 0 ? bestZero : pred, f);
        // follow the parser's own move when it explores (after the first pass), else the best zero-cost move
        apply(st, it > 0 && rand() < explore && c[pred] !== Infinity ? pred : bestZero, M);
      }
    }
    log(`iteration ${it + 1}/${iterations}: zero-cost moves ${(100 * ok / n).toFixed(2)}%`);
  }
  parser.average();
  return { schema: UD_PARSER_SCHEMA, meta: { trainedOn: sents.length, iterations, seed, folds, explore, beam, labels: labels.length, lexicon: lexSource, clusters: clustersSource }, labels, tagger: taggerAll.toJSON(), parser: parser.toJSON(), lexicon: base.lexicon };
}

/** loadModel(json, { lex }) — `lex` is the same received lexicon the model was trained with (json.meta.lexicon names it), or none */
export function loadModel(json, { lex = null, clusters = null, beam = json.meta?.beam ?? 1, fx: prebuilt = null } = {}) {
  // the greedy parse reads the feature index; the dense Perceptron (beam search, k-best readings, training) is built only when
  // something touches it, so a reader that never asks for it never holds the 200 MB of dense rows
  let parser;
  if (process.env.KHORA_PARSER_STRINGS === "1") parser = Perceptron.fromJSON(json.parser);
  else {
    let fx = prebuilt ?? featureIndexFromJSON(json.parser), real = null; const pj = json.parser;
    const realize = () => (real ??= Perceptron.fromJSON(pj));
    parser = new Proxy({}, {
      get: (_, prop) => { if (prop === "fx") return fx; if (prop === "classes") return pj.classes; if (prop === "n") return pj.classes.length; const r = realize(), v = r[prop]; return typeof v === "function" ? v.bind(r) : v; },
      set: (_, prop, val) => { if (prop === "fx") { fx = val; return true; } realize()[prop] = val; return true; },
    });
  }
  const tagger = Perceptron.fromJSON(json.tagger);
  if (process.env.KHORA_PARSER_STRINGS !== "1") tagger.fx = featureIndex(tagger);
  return { tagger, parser, M: moveSet(json.labels), lexicon: json.lexicon, meta: json.meta, lex, clusters, beam };
}
/** Measured 2026-10-21: reading sources under their 3 best parses LOWERED the meaning check (fresh set 79% → 67%): extra readings bring
 *  contradicting claims along, and beam decoding of a greedily trained model is not better than its greedy parse. Kept for callers that
 *  want alternatives; the meaning check reads one parse.
 *  analyseK(model, forms, k) → up to k parses (best first) from a beam of width max(k, model beam), each the rows analyse returns, with
 *  its score margin below the best: a sentence can be read more than one way, and a caller may let a source count under any close reading */
export function analyseK(model, forms, k = 3, givenTags = null) {
  const tags = givenTags ?? tagWith(model.tagger, forms, model.lex, model.clusters);
  const C = model.clusters ? ["ROOT", ...forms.map((w) => model.clusters.get(norm(w)) ?? null)] : null;
  const W = ["ROOT", ...forms.map(norm)], T = ["ROOT", ...tags];
  const F = ["_", ...tags.map((t, j) => lemmaAndFeats(model.lexicon, forms[j], t).feats)];
  const Lm = ["ROOT", ...tags.map((t, j) => norm(lemmaAndFeats(model.lexicon, forms[j], t).lemma))];
  let items = [{ st: newState(W.length), score: 0, moves: [], steps: [] }], guard = 0;
  while (items.some((x) => x.st.i < x.st.n) && guard++ < 4 * W.length + 10) items = beamStep(items, model.parser, model.M, W, T, F, Math.max(k, model.beam ?? 1, 4), C, Lm);
  const best = items[0]?.score ?? 0, seen = new Set(), out = [];
  for (const it of items) {
    const st = finish(it.st), key = Array.from(st.head).join(",") + "|" + st.label.join(",");
    if (seen.has(key)) continue; seen.add(key);
    out.push({ margin: best - it.score, rows: forms.map((form, j) => { const { lemma, feats } = lemmaAndFeats(model.lexicon, form, tags[j]); return { id: j + 1, form, lemma, upos: tags[j], feats, head: st.head[j + 1], deprel: st.label[j + 1] ?? "dep" }; }) });
    if (out.length >= k) break;
  }
  return out;
}

/** PREDICATE REPAIR (opt-in decoding constraint, 2026-11-20): a clause the tagger gave NO verb or auxiliary (the measured failure: "Anna works at Acme" tagged all-noun, "works" read as a plural noun) is re-tagged at the one word the tagger itself
 *  finds closest to a verb: among the words it called NOUN that follow a nominal (a name, noun or pronoun: a subject candidate) and are followed by a word that is not punctuation (a predicate governs something), the smallest gap between its best class score and its VERB score. The rest is re-tagged left to right under that
 *  restriction (the tagger's `allowed` seam) and the parse runs on those tags. Nothing is matched against a spelling; the tagger's own scores decide. Returns { tags, repaired: null | { at: index, gap } }; a sentence that has a predicate is untouched. */
// ── THE COMPILED INDEX: the feature index is a pure function of the model file, so it is built once and kept ─────────────────
// (2026-11-23) Loading a model was most of a reader's start: 36 MB of JSON parsed and 513,407 feature keys split and interned,
// in every process and every worker. openModelFile keeps the parser's index as typed arrays in a cache file keyed by the model
// file's size and modification time (KHORA_COMPILED_DIR, else ~/.khora/compiled), written to a temporary name and renamed, so
// readers starting together never see half a file. The arrays are the index itself, bit for bit, so a model opened from the
// cache parses exactly as one built from the JSON. The dense parser (beam search, k-best readings, training) is still built
// from the JSON file on the first use that needs it.
import nodeFs from "node:fs"; import nodeOs from "node:os"; import nodePath from "node:path"; import nodeZlib from "node:zlib";
const CACHE_VERSION = "ud-index-1";
const cacheDir = () => process.env.KHORA_COMPILED_DIR || nodePath.join(nodeOs.homedir(), ".khora", "compiled");
const IX_ARRAYS = [["idsStart", Int32Array], ["idsPool", Int32Array], ["nzStart", Int32Array], ["nzIdx", Int32Array], ["nzVal", Float32Array], ["next", Int32Array], ["heads", Int32Array]];
function writeIndexCache(file, ix, json) {
  const arrays = IX_ARRAYS.map(([k]) => ix[k]);
  let off = 0; const layout = arrays.map((a, i) => { const at = off; off += Math.ceil(a.byteLength / 8) * 8; return { name: IX_ARRAYS[i][0], offset: at, length: a.length }; });
  const header = Buffer.from(JSON.stringify({ v: CACHE_VERSION, mask: ix.mask, n: ix.n, classes: ix.classes, vid: [...ix.vid.keys()], tid: [...ix.tid.keys()], layout, json: { schema: json.schema, meta: json.meta, labels: json.labels, lexicon: json.lexicon, tagger: json.tagger } }));
  const head = Buffer.alloc(16); head.write("KXIDX1\n", 0, "latin1"); head.writeUInt32LE(header.length, 8);
  const pad = Buffer.alloc((8 - ((16 + header.length) % 8)) % 8);
  const data = Buffer.alloc(off); arrays.forEach((a, i) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(data, layout[i].offset));
  nodeFs.mkdirSync(nodePath.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  nodeFs.writeFileSync(tmp, Buffer.concat([head, header, pad, data])); nodeFs.renameSync(tmp, file);
}
function readIndexCache(file) {
  const buf = nodeFs.readFileSync(file);
  if (buf.toString("latin1", 0, 7) !== "KXIDX1\n") return null;
  const hl = buf.readUInt32LE(8), h = JSON.parse(buf.toString("utf8", 16, 16 + hl));
  if (h.v !== CACHE_VERSION) return null;
  const base = 16 + hl + ((8 - ((16 + hl) % 8)) % 8);
  const ix = { mask: h.mask, n: h.n, classes: h.classes, vid: new Map(h.vid.map((x, i) => [x, i])), tid: new Map(h.tid.map((x, i) => [x, i])) };
  for (const [name, T] of IX_ARRAYS) { const L = h.layout.find((x) => x.name === name); const ab = buf.buffer.slice(buf.byteOffset + base + L.offset, buf.byteOffset + base + L.offset + L.length * T.BYTES_PER_ELEMENT); ix[name] = new T(ab); }
  const small = new Int32Array(256).fill(-1); for (let k = 0; k < 256; k++) { const id = ix.vid.get(String(k)); if (id !== undefined) small[k] = id; } ix.small = small;
  return { ix, json: h.json };
}
/** openModelFile(file) → { meta, load({ lex, clusters }) → model } — the compiled index when it is cached, else built and cached */
export async function openModelFile(file) {
  if (process.env.KHORA_PARSER_STRINGS === "1") { const json = await readJsonMaybeGz(file); return { meta: json.meta, load: (o = {}) => loadModel(json, o) }; }
  const st = nodeFs.statSync(file);
  const cached = nodePath.join(cacheDir(), `${nodePath.basename(file)}.${st.size}-${Math.round(st.mtimeMs)}.${CACHE_VERSION}.bin`);
  let hit = null; try { if (nodeFs.existsSync(cached)) hit = readIndexCache(cached); } catch { hit = null; }
  if (hit) {
    // the dense parser, if anything asks for it, comes from the model file itself
    const lazyParser = () => JSON.parse(nodeZlib.gunzipSync(nodeFs.readFileSync(file))).parser;
    let parserJson = null; const json = { ...hit.json, get parser() { return (parserJson ??= lazyParser()); } };
    return { meta: hit.json.meta, load: (o = {}) => loadModelCached(json, hit.ix, o) };
  }
  const json = await readJsonMaybeGz(file);
  const fx = featureIndexFromJSON(json.parser);
  try { writeIndexCache(cached, fx, json); } catch { /* an unwritable cache only costs the next start its build */ }
  return { meta: json.meta, load: (o = {}) => loadModel(json, { ...o, fx }) };
}
// a model whose parser index came from the cache: the parser's JSON (for the dense rows) is read only when realised
function loadModelCached(json, fx, { lex = null, clusters = null, beam = json.meta?.beam ?? 1 } = {}) {
  let real = null, ix = fx; const classes = fx.classes;
  const realize = () => (real ??= Perceptron.fromJSON(json.parser));
  const parser = new Proxy({}, {
    get: (_, prop) => { if (prop === "fx") return ix; if (prop === "classes") return classes; if (prop === "n") return classes.length; const r = realize(), v = r[prop]; return typeof v === "function" ? v.bind(r) : v; },
    set: (_, prop, val) => { if (prop === "fx") { ix = val; return true; } realize()[prop] = val; return true; },
  });
  const tagger = Perceptron.fromJSON(json.tagger); tagger.fx = featureIndex(tagger);
  return { tagger, parser, M: moveSet(json.labels), lexicon: json.lexicon, meta: json.meta, lex, clusters, beam };
}
export function tagWithPredicate(model, forms) {
  const base = tagWithMargins(model.tagger, forms, model.lex, model.clusters);
  if (!model.tagger.classes.includes("VERB") || base.tags.some((t) => t === "VERB" || t === "AUX")) return { tags: base.tags, repaired: null };
  // regex-ok: the tagger's own digit mask on a token shape (the same as tagWithMargins), not language
  const L = forms.map((w) => (/^\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase())), V = model.tagger.classes.indexOf("VERB"); let best = null;
  for (let i = 1; i < forms.length; i++) {
    if (base.tags[i] !== "NOUN" || !["PROPN", "NOUN", "PRON"].includes(base.tags[i - 1])) continue;
    if (!base.tags.slice(i + 1).some((t) => t !== "PUNCT")) continue;                 // a predicate governs something: a headline or fragment ("Apple stock") ends on its last noun and is left as it is
    const sc = model.tagger.scores(tagFeats(i, forms, L, base.tags[i - 1], i > 1 ? base.tags[i - 2] : "<s2>", model.lex, model.clusters)), b = model.tagger.classes.indexOf("NOUN"), gap = sc[b] - sc[V];
    if (!best || gap < best.gap) best = { at: i, gap };
  }
  if (!best) return { tags: base.tags, repaired: null };
  return { tags: tagWithMargins(model.tagger, forms, model.lex, model.clusters, new Map([[best.at, new Set(["VERB"])]])).tags, repaired: best };
}

/** analyse(model, forms, tags?) → UD rows (tags given: the parse runs on them, as when a repair has re-tagged a word) {id, form, lemma, upos, feats, head, deprel} */
export function analyse(model, forms, givenTags = null) {
  const tags = givenTags ?? tagWith(model.tagger, forms, model.lex, model.clusters);
  const C = model.clusters ? ["ROOT", ...forms.map((w) => model.clusters.get(norm(w)) ?? null)] : null;
  const W = ["ROOT", ...forms.map(norm)], T = ["ROOT", ...tags];
  const F = ["_", ...tags.map((t, k) => lemmaAndFeats(model.lexicon, forms[k], t).feats)];
  const Lm = ["ROOT", ...tags.map((t, k) => norm(lemmaAndFeats(model.lexicon, forms[k], t).lemma))];
  const st = parseWith(model.parser, model.M, W, T, F, model.beam, C, Lm);
  return forms.map((form, k) => { const { lemma, feats } = lemmaAndFeats(model.lexicon, form, tags[k]); return { id: k + 1, form, lemma, upos: tags[k], feats, head: st.head[k + 1], deprel: st.label[k + 1] ?? "dep" }; });
}

// ── files (node only): models and lexicons ship gzipped under priors/ (janus repo), named in priors/manifest.json ─────────────────────
export async function readJsonMaybeGz(file) {
  const { readFileSync } = await import("node:fs"), { gunzipSync } = await import("node:zlib");
  const buf = readFileSync(file);
  return JSON.parse((file.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8"));
}
/** a UniMorphPOS@1 file → the Map the tagger reads */
export async function loadLexiconFile(file) { const j = await readJsonMaybeGz(file); return new Map(Object.entries(j.forms)); }
/** a UDParser@1 file (optionally with its lexicon) → a model analyse() takes */
/** a WordClusters@1 file → Map word → [coarse, fine] */
export async function loadClustersFile(file) { const j = await readJsonMaybeGz(file); return new Map(Object.entries(j.words)); }
export async function loadModelFile(file, { lexFile = null, clustersFile = null, beam } = {}) {
  const json = await readJsonMaybeGz(file);
  return loadModel(json, { lex: lexFile ? await loadLexiconFile(lexFile) : null, clusters: clustersFile ? await loadClustersFile(clustersFile) : null, ...(beam ? { beam } : {}) });
}
