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

function newState(n) {
  return { n, i: 1, stack: [0], head: new Int32Array(n).fill(-1), label: new Array(n).fill(null), left: Array.from({ length: n }, () => []), right: Array.from({ length: n }, () => []) };
}
const top = (st) => st.stack[st.stack.length - 1];

function features(st, W, T, C = null) {
  const f = [];
  const add = (k, ...v) => f.push(k + "\u0001" + v.join("\u0002"));
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
function beamStep(items, parser, M, W, T, size, Cl = null) {
  const cand = [];
  for (const it of items) {
    if (it.st.i >= it.st.n) { cand.push({ ...it, done: true }); continue; }
    const v = valid(it.st, M), f = features(it.st, W, T, Cl), s = parser.scores(f);
    for (let a = 0; a < v.length; a++) if (v[a]) cand.push({ it, a, f, score: it.score + s[a] });
  }
  cand.sort((x, y) => y.score - x.score);
  return cand.slice(0, size).map((c) => { if (c.done) return c; const st = clone(c.it.st); apply(st, c.a, M); return { st, score: c.score, moves: [...c.it.moves, c.a], steps: [...c.it.steps, [c.f, c.a]] }; });
}
function parseWith(parser, M, W, T, beam = 1, Cl = null) {
  let st;
  if (beam > 1) {
    let items = [{ st: newState(W.length), score: 0, moves: [], steps: [] }], guard = 0;
    while (items.some((x) => x.st.i < x.st.n) && guard++ < 4 * W.length + 10) items = beamStep(items, parser, M, W, T, beam, Cl);
    st = items[0].st;
  } else {
    st = newState(W.length);
    let guard = 0;
    while (st.i < st.n && guard++ < 4 * st.n + 10) {
      const v = valid(st, M);
      if (!v.some(Boolean)) break;
      apply(st, parser.best(features(st, W, T, Cl), v), M);
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
function tagFeats(i, F, L, prev, prev2, lex, cl = null) {
  const f = [], add = (k, ...v) => f.push(k + "\u0001" + v.join("\u0002"));
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
export function tagWith(tagger, forms, lex = null, cl = null) {
  const L = forms.map((w) => (/^\d/.test(w) ? w.replace(/\d/g, "#") : w.toLowerCase()));
  let prev = "<s>", prev2 = "<s2>"; const out = [];
  for (let i = 0; i < forms.length; i++) { const t = tagger.classes[tagger.best(tagFeats(i, forms, L, prev, prev2, lex, cl))]; out.push(t); prev2 = prev; prev = t; }
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
  for (const f of feats) {
    let w = p.w.get(f);
    if (!w) { w = new Float32Array(p.n); p.w.set(f, w); p.tot.set(f, new Float32Array(p.n)); p.ts.set(f, new Float32Array(p.n)); }
    const tot = p.tot.get(f), ts = p.ts.get(f);
    tot[c] += (p.i - ts[c]) * w[c]; ts[c] = p.i; w[c] += v;
  }
}
/** beam training on one sentence with EARLY UPDATE (Collins & Roark 2004): the gold path is the best-scoring zero-cost move at each step;
 *  the moment it falls out of the beam, the gold prefix is rewarded and the beam's best prefix penalised, and the sentence stops */
function beamSentence(parser, M, d, size) {
  let items = [{ st: newState(d.W.length), score: 0, moves: [], steps: [] }];
  const gold = { st: newState(d.W.length), moves: [], steps: [] };
  let guard = 0, n = 0;
  while (gold.st.i < gold.st.n && guard++ < 4 * d.W.length + 10) {
    const v = valid(gold.st, M); if (!v.some(Boolean)) break;
    const f = features(gold.st, d.W, d.T, d.C), s = parser.scores(f), c = costs(gold.st, d.gh, d.gl, M);
    let g = -1; for (let a = 0; a < v.length; a++) if (v[a] && c[a] === 0 && (g < 0 || s[a] > s[g])) g = a;
    if (g < 0) { let m = Infinity; for (let a = 0; a < v.length; a++) if (v[a] && c[a] < m) { m = c[a]; g = a; } }
    apply(gold.st, g, M); gold.moves.push(g); gold.steps.push([f, g]);
    items = beamStep(items, parser, M, d.W, d.T, size, d.C); n++;
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
  const labels = [...new Set(sents.flatMap((s) => s.tokens.map((t) => t.deprel)))].sort();
  const M = moveSet(labels), parser = new Perceptron(M.names);
  const data = sents.map((s, i) => ({ W: ["ROOT", ...s.tokens.map((t) => norm(t.form))], T: ["ROOT", ...predicted[i]], gh: [-1, ...s.tokens.map((t) => t.head)], gl: ["_", ...s.tokens.map((t) => t.deprel)], C: clusters ? ["ROOT", ...s.tokens.map((t) => clusters.get(norm(t.form)) ?? null)] : null }));
  for (let it = 0; it < iterations; it++) {
    let ok = 0, n = 0;
    for (const d of shuffle(data, rand)) {
      if (beam > 1) { const r = beamSentence(parser, M, d, beam); ok += r.ok; n += r.n; continue; }
      const st = newState(d.W.length);
      let guard = 0;
      while (st.i < st.n && guard++ < 4 * st.n + 10) {
        const v = valid(st, M);
        if (!v.some(Boolean)) break;
        const f = features(st, d.W, d.T, d.C), s = parser.scores(f), c = costs(st, d.gh, d.gl, M);
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
export function loadModel(json, { lex = null, clusters = null, beam = json.meta?.beam ?? 1 } = {}) {
  return { tagger: Perceptron.fromJSON(json.tagger), parser: Perceptron.fromJSON(json.parser), M: moveSet(json.labels), lexicon: json.lexicon, meta: json.meta, lex, clusters, beam };
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
  let items = [{ st: newState(W.length), score: 0, moves: [], steps: [] }], guard = 0;
  while (items.some((x) => x.st.i < x.st.n) && guard++ < 4 * W.length + 10) items = beamStep(items, model.parser, model.M, W, T, Math.max(k, model.beam ?? 1, 4), C);
  const best = items[0]?.score ?? 0, seen = new Set(), out = [];
  for (const it of items) {
    const st = finish(it.st), key = Array.from(st.head).join(",") + "|" + st.label.join(",");
    if (seen.has(key)) continue; seen.add(key);
    out.push({ margin: best - it.score, rows: forms.map((form, j) => { const { lemma, feats } = lemmaAndFeats(model.lexicon, form, tags[j]); return { id: j + 1, form, lemma, upos: tags[j], feats, head: st.head[j + 1], deprel: st.label[j + 1] ?? "dep" }; }) });
    if (out.length >= k) break;
  }
  return out;
}

/** analyse(model, forms, tags?) → UD rows (tags given: the parse runs on them, as when a repair has re-tagged a word) {id, form, lemma, upos, feats, head, deprel} */
export function analyse(model, forms, givenTags = null) {
  const tags = givenTags ?? tagWith(model.tagger, forms, model.lex, model.clusters);
  const C = model.clusters ? ["ROOT", ...forms.map((w) => model.clusters.get(norm(w)) ?? null)] : null;
  const st = parseWith(model.parser, model.M, ["ROOT", ...forms.map(norm)], ["ROOT", ...tags], model.beam, C);
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
