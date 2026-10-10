// eval/law/felt-cross-reference.mjs — CROSS-REFERENCE: the felt-sense scores vs the language's parts of speech vs
// kind induction on beings, at the WORD (type) level. New file; nothing edited.
//
//   node eval/law/felt-cross-reference.mjs --stem eng [--limit N]
//
// User, 2026-10-08: "i think its worth it to cross reference the scores with the parts of speech of that language
// and kind induction on beings" ... "we dont need every token, words are fine."
//
// WHAT. Three independent readings of each word (type) in ONE text:
//   FELT   khora/native/adapters/text/felt-sense.js — the mean ablation-delta projection per word on its own POS
//          axis, from the text in question (perception; pole names from the prior, never a feature). Felt-type =
//          the axis the word sits highest on.
//   POS    the language's own parts of speech: the treebank's UPOS (the language's annotation) and the prior's
//          majority class, reported separately.
//   KIND   kind-standing.js::discoverCompanyKinds over the text's own vocabulary (company-induced kinds on beings).
// MEASURE. NMI over the words common to all three, each pair; and a permutation null for each NMI (labels redealt).
// CLAIM (falsifiable). The felt scores agree with the language's POS (NMI over a permutation null) AND with the
//   induced kinds — i.e. the felt sense is not a third, unrelated reading. FALSIFIED IF felt-vs-POS is at its null.
// LIMITS. DEV/language-with-a-prior only; word level; kinds need a vocabulary floor; English lens for prior names.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import { feltSense } from "../../adapters/text/felt-sense.js";
import { discoverCompanyKinds } from "../../organs/kind-standing.js";
import { grammarFor } from "../../the-fold/language-grammar.js";
import { readConllu, conlluPath, parseArgs } from "../competence/lib.mjs";

const argmax = (o) => { let b = null, v = -Infinity; for (const [k, x] of Object.entries(o)) if (x != null && x > v) { v = x; b = k; } return b; };
const majority = (m) => { let b = null, n = -1; for (const [k, c] of m) if (c > n) { n = c; b = k; } return b; };
const labelOverlap = (map) => {
  const keys = [...map.keys()];
  const L = (k) => map.get(k);
  const pairs = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (L(keys[i]) != null && L(keys[j]) != null) pairs.push([L(keys[i]), L(keys[j])]);
  return { keys: keys.length, pairs: pairs.length };
};
function nmi(a, b) {
  const keys = Object.keys(a).filter((k) => a[k] != null && b[k] != null);
  if (keys.length < 8) return null;
  const ca = new Map(), cb = new Map(), cab = new Map(); const N = keys.length;
  for (const k of keys) {
    ca.set(a[k], (ca.get(a[k]) ?? 0) + 1); cb.set(b[k], (cb.get(b[k]) ?? 0) + 1);
    const key = `${a[k]}\u0000${b[k]}`; cab.set(key, (cab.get(key) ?? 0) + 1);
  }
  const H = (m) => -[...m.values()].reduce((s, c) => { const p = c / N; return s + (p > 0 ? p * Math.log(p) : 0); }, 0);
  const Ha = H(ca), Hb = H(cb), Hab = H(cab);
  const mi = Ha + Hb - Hab;
  return mi > 0 && Ha > 0 && Hb > 0 ? mi / Math.sqrt(Ha * Hb) : 0;
}
function nmiNull(a, b, B = 200, seed = 1) {
  let s = seed >>> 0; const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const keys = Object.keys(a).filter((k) => a[k] != null && b[k] != null);
  const ba = keys.map((k) => a[k]), bb = keys.map((k) => b[k]);
  const obs = nmi(a, b); const draws = [];
  for (let d = 0; d < B; d++) { const p = ba.slice(); for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } const m = {}; keys.forEach((k, i) => { m[k] = p[i]; }); draws.push(nmi(m, b)); }
  draws.sort((x, y) => x - y);
  return { obs, nullQ95: draws[Math.min(draws.length - 1, Math.ceil(0.95 * draws.length) - 1)], p: (draws.filter((x) => x >= obs).length + 1) / (B + 1) };
}

function run(stem, limit) {
  const sentences = readConllu(conlluPath(stem, "dev"), limit ? { limit } : {});
  const g = grammarFor(stem); if (!g.posPrior?.forms) return { stem, gap: "no prior" };
  const text = sentences.map((s) => (s.text ?? s.tokens.map((t) => t.form).join(" "))).join("\n");
  const fsx = feltSense(text, { posPrior: g.posPrior, M: 8 });

  // per-word FELT: mean projection on its own axis, felt-type = highest axis
  const feltSum = new Map(), feltN = new Map();
  for (const t of fsx.felt) {
    if (t.score == null || !t.pos) continue;
    if (!feltSum.has(t.form)) { feltSum.set(t.form, {}); feltN.set(t.form, {}); }
    const s = feltSum.get(t.form), n = feltN.get(t.form);
    s[t.pos] = (s[t.pos] ?? 0) + t.score; n[t.pos] = (n[t.pos] ?? 0) + 1;
  }
  const feltType = {};
  for (const [w, s] of feltSum) { const n = feltN.get(w); const mean = {}; for (const k in s) mean[k] = s[k] / n[k]; feltType[w] = argmax(mean); }

  // per-word POS (gold annotation) and PRIOR majority
  const goldAcc = new Map(), priorMaj = {};
  for (const s of sentences) for (const t of s.tokens) { const f = String(t.form).toLowerCase(); if (!/^\p{L}/u.test(f)) continue; if (!goldAcc.has(f)) goldAcc.set(f, new Map()); goldAcc.get(f).set(t.upos, (goldAcc.get(f).get(t.upos) ?? 0) + 1); }
  for (const [f] of goldAcc) { const c = g.posPrior.forms[f]; if (c) priorMaj[f] = majority(new Map(Object.entries(c))); }
  const posGold = {}; for (const [f, m] of goldAcc) posGold[f] = majority(m);

  // KIND: company-induced kinds on the text's own vocabulary
  const tokSentences = sentences.map((s) => ({ text: s.tokens.map((t) => t.form).join(" ") }));
  const counts = new Map(); for (const s of tokSentences) for (const w of s.text.split(/\s+/)) counts.set(w, (counts.get(w) ?? 0) + 1);
  const vocab = new Set([...counts].filter(([, c]) => c >= 2).map(([w]) => w));
  let kind = {};
  try { for (const k of discoverCompanyKinds(tokSentences, [...vocab], { minMentions: 3, minShare: 0.3, minMembers: 4 })) for (const w of k.members) kind[w] = k.name; } catch (e) { return { stem, gap: `kinds: ${e.message}` }; }

  const A = nmiNull(feltType, posGold), B2 = nmiNull(feltType, kind), C = nmiNull(kind, posGold), D = nmiNull(feltType, priorMaj);
  return { stem, words: Object.keys(posGold).length, feltWords: Object.keys(feltType).length, kindWords: Object.keys(kind).length, common: Object.keys(posGold).filter((w) => feltType[w] && kind[w]).length, felt_vs_pos: A, felt_vs_kind: B2, kind_vs_pos: C, felt_vs_prior: D };
}
const a = parseArgs();
for (const stem of (a.stems ? String(a.stems).split(",") : [a.stem ?? "eng"])) {
  const r = run(stem, a.limit);
  if (r.gap) { console.log(`${r.stem} GAP ${r.gap}`); continue; }
  const f = (x) => x ? `NMI ${x.obs.toFixed(3)} nullQ95 ${x.nullQ95.toFixed(3)} p ${x.p.toFixed(3)} ${x.obs > x.nullQ95 ? "HOLDS" : "at null"}` : "—";
  console.log(`\n=== ${r.stem} (words ${r.words}, felt ${r.feltWords}, kinded ${r.kindWords}, all-three ${r.common}) ===`);
  console.log(`felt  vs POS(gold)   ${f(r.felt_vs_pos)}`);
  console.log(`felt  vs POS(prior)  ${f(r.felt_vs_prior)}`);
  console.log(`felt  vs KIND        ${f(r.felt_vs_kind)}`);
  console.log(`KIND  vs POS(gold)   ${f(r.kind_vs_pos)}`);
}
