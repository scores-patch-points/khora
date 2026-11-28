// the-fold/codec-regions.mjs — A TEXT IS NOT ONE LANGUAGE: the codec, per REGION, as a mixture over the ROOT codecs (owner, 2026-11-28).
// The owner's ruling: the per-language UD codecs on disk are ROOT codecs (hardcoded seeds); the codec a text is read under is GENERATED ON DEMAND for the text's own region, era and register,
// and must work organically and at once on mixed text (Spanglish, a business-formal creole). janus DESIGN-COMPUTED-CODEC.md is the design (codecFor(material, context), a derivation record on
// every reading); codec-fold.mjs finds ONE codec for a whole text and lists "mixed-language text" as not done. This is the first built piece of the composed codec: WHERE each root codec applies.
//
// HOW (no model, no hand-set threshold, nothing trained):
//   1. WHICH roots, by description length. Candidates are ALL held roots with a word cut. Start from the root that explains the most tokens; add the one that explains the most tokens still
//      unexplained, and keep it only if the fitted chain then describes the text in fewer bits by more than log2(H), the cost of naming one more root out of the H held. One root = a monolingual text.
//   2. WHERE. A hidden Markov chain over the chosen roots: a token a root's table holds costs log2(N/(1-e)) bits under it (ONE price for every root, so a small table is not a cheaper language:
//      the pcm-over-eng defect of codec-fold came from pricing by table size), an unseen one log2(U/e) (codec-fold's own escape model and constants). The chance of STAYING in a root from one
//      token to the next is not typed: it is fitted to this text by expectation-maximisation (Baum-Welch on one parameter). Viterbi gives each token its root; forward-backward its probability.
//   3. THE DERIVATION travels with the answer (CodecDerivation@1, as the design asks): the roots used, their share of the text as weights, standing "root", and the gaps.
// A token no root holds (a name, a typo) takes its neighbours' root through the chain, with a low probability of its own: it is marked `known: false`, not guessed into a language.
// NOT DONE (stated): unspaced scripts (typed gap); a word that is itself mixed (an English stem with Spanish inflection); era and register as context (the roots carry one treebank each);
// composing a PARSER for the mixture (this says where each root applies; reading each region under its root is the caller's next step); calibration of p against gold.
import fs from "node:fs";
import { loadVocab, PRIORS, ESCAPE, UNIVERSE, NOMINAL_VOCAB } from "./codec-fold.mjs";
export const REGIONS_SCHEMA = "CodecRegions@1", DERIVATION_SCHEMA = "CodecDerivation@1";
const LETTER = /[\p{L}\p{M}]/u;   // regex-ok: a Unicode property, not a reading of any language
/** word tokens with their offsets: letter runs, an inner apostrophe or hyphen kept (the same cut codec-fold scores) */
export function tokensWithOffsets(text) {
  const T = String(text ?? ""), out = []; let cur = "", at = 0, i = 0;
  const flush = (end) => { if (!cur) return; let w = cur, e = end; while (w.length && !LETTER.test(w[w.length - 1])) { w = w.slice(0, -1); e--; } if (w) out.push({ form: w, at, end: e }); cur = ""; };
  for (const ch of T) { if (LETTER.test(ch) || ((ch === "'" || ch === "’" || ch === "-") && cur)) { if (!cur) at = i; cur += ch; } else flush(i); i += ch.length; } flush(i); return out;
}
const knows = (v, w) => v.forms.has(w) || (w.includes("'") && v.forms.has(w.split("'").pop())) || (w.includes("’") && v.forms.has(w.split("’").pop()));

/** all held root codecs (the grammars on disk): the candidates are NOT taken from codec-fold's whole-text alphabet pass, which assumes one language and drops English the moment a text also holds Swedish or Turkish letters (measured 2026-11-28) */
function heldRoots() { return fs.readdirSync(PRIORS).filter((f) => f.startsWith("ud-grammar-") && f.endsWith(".json.gz")).map((f) => f.slice(11, -8)).sort(); }

/** the chain over a set of roots, fitted to the text: { stay, bits (the text's description length under it, in bits), post, lab } */
function chain(roots, K, n) {
  const S = roots.length, bK = Math.log2(NOMINAL_VOCAB / (1 - ESCAPE)), bU = Math.log2(UNIVERSE / ESCAPE), em = roots.map((c) => { const k = K[c], row = new Array(n); for (let i = 0; i < n; i++) row[i] = k[i] ? 1 : 2 ** -(bU - bK); return row; });   // emission likelihoods scaled by the known price (added back in `bits`)
  if (S === 1) { let unk = 0; for (let i = 0; i < n; i++) if (!K[roots[0]][i]) unk++; return { stay: 1, bits: n * bK + unk * (bU - bK), post: Array.from({ length: n }, () => [1]), lab: new Array(n).fill(0) }; }
  let stay = 0.9, post = null, bits = Infinity;
  for (let it = 0; it < 12; it++) {   // Baum-Welch on the one parameter: P(stay)
    const sw = (1 - stay) / (S - 1), a = [], b = [], sc = []; a[0] = roots.map((_, s) => em[s][0] / S); sc[0] = a[0].reduce((x, y) => x + y, 0); a[0] = a[0].map((x) => x / sc[0]);
    for (let i = 1; i < n; i++) { const tot = a[i - 1].reduce((x, y) => x + y, 0); a[i] = roots.map((_, s) => (a[i - 1][s] * stay + (tot - a[i - 1][s]) * sw) * em[s][i]); sc[i] = a[i].reduce((x, y) => x + y, 0); a[i] = a[i].map((x) => x / sc[i]); }
    bits = n * bK - sc.reduce((x, y) => x + Math.log2(y), 0);
    b[n - 1] = roots.map(() => 1); for (let i = n - 2; i >= 0; i--) { const w = roots.map((_, s) => b[i + 1][s] * em[s][i + 1]), tot = w.reduce((x, y) => x + y, 0); b[i] = roots.map((_, s) => (w[s] * stay + (tot - w[s]) * sw) / sc[i + 1]); }
    let same = 0, all = 0; for (let i = 0; i < n - 1; i++) { let st = 0, tt = 0; for (let s = 0; s < S; s++) for (let q = 0; q < S; q++) { const x = a[i][s] * (s === q ? stay : sw) * em[q][i + 1] * b[i + 1][q]; tt += x; if (s === q) st += x; } same += st / tt; all += 1; }
    post = a.map((row, i) => { const p = row.map((x, s) => x * b[i][s]), z = p.reduce((x, y) => x + y, 0); return p.map((x) => x / z); });
    const next = all ? Math.min(1 - 1e-6, Math.max(1 / S, same / all)) : stay; if (Math.abs(next - stay) < 1e-5) { stay = next; break; } stay = next; }
  const lab = new Array(n).fill(0), sw = (1 - stay) / (S - 1), ls = Math.log(stay), lw = Math.log(sw), d = [roots.map((_, s) => Math.log(em[s][0] / S))], bp = [];
  for (let i = 1; i < n; i++) { d[i] = []; bp[i] = []; for (let s = 0; s < S; s++) { let bv = -Infinity, bq = 0; for (let q = 0; q < S; q++) { const x = d[i - 1][q] + (q === s ? ls : lw); if (x > bv) { bv = x; bq = q; } } d[i][s] = bv + Math.log(em[s][i]); bp[i][s] = bq; } }
  let s2 = d[n - 1].indexOf(Math.max(...d[n - 1])); for (let i = n - 1; i >= 0; i--) { lab[i] = s2; if (i) s2 = bp[i][s2]; }
  return { stay, bits, post, lab };
}

/** regionCodecs(text, { codes }) -> CodecRegions@1 { roots, tokens: [{ form, at, end, codec, p, known }], regions: [{ at, end, codec, tokens, p }], mixture, stay, bits, derivation, ms } | { gap } */
export async function regionCodecs(text, { codes = null } = {}) {
  const t0 = Date.now(), held = codes ?? heldRoots(), cand = held.filter((c) => loadVocab(c).spaced), unspaced = held.filter((c) => !cand.includes(c));
  const toks = tokensWithOffsets(text), low = toks.map((t) => t.form.toLowerCase()), n = low.length;
  if (!n) return { schema: REGIONS_SCHEMA, gap: { gap: "no_letters" }, roots: [], tokens: [], regions: [] };
  const K = Object.fromEntries(cand.map((c) => { const v = loadVocab(c); return [c, low.map((w) => knows(v, w))]; }));
  // 1. WHICH roots, by description length: start from the root that explains the most tokens; add the root that explains the most tokens no chosen root explains, and KEEP it only if the fitted chain with it
  //    describes the text in fewer bits than without it by more than log2(H) bits, the cost of NAMING one more root out of the H held. Nothing typed: the bar is the size of the choice.
  const nameCost = Math.log2(Math.max(2, cand.length)), roots = [], covered = low.map(() => false); let cur = null;
  for (;;) { let best = null, gain = 0; for (const c of cand) { if (roots.includes(c)) continue; let g = 0; const k = K[c]; for (let i = 0; i < n; i++) if (!covered[i] && k[i]) g++; if (g > gain) { gain = g; best = c; } }
    if (!best) break; const trial = chain([...roots, best], K, n);
    if (roots.length && !(cur.bits - trial.bits > nameCost)) break; roots.push(best); cur = trial; for (let i = 0; i < n; i++) if (K[best][i]) covered[i] = true; }
  if (!roots.length) return { schema: REGIONS_SCHEMA, gap: { gap: "no_root_holds_any_token", why: "no held spaced root codec holds a single token of this text" }, roots: [], tokens: [], regions: [], ms: Date.now() - t0 };
  const S = roots.length, { stay, post, lab, bits } = cur;
  const tokens = toks.map((t, i) => ({ form: t.form, at: t.at, end: t.end, codec: roots[lab[i]], p: +post[i][lab[i]].toFixed(3), known: K[roots[lab[i]]][i] })), regions = [];
  for (const t of tokens) { const last = regions.at(-1); if (last && last.codec === t.codec) { last.end = t.end; last.tokens++; last.psum += t.p; } else regions.push({ at: t.at, end: t.end, codec: t.codec, tokens: 1, psum: t.p }); }
  for (const g of regions) { g.p = +(g.psum / g.tokens).toFixed(3); delete g.psum; }
  const mixture = Object.fromEntries(roots.map((c) => [c, +(tokens.filter((t) => t.codec === c).length / n).toFixed(3)])), unknown = tokens.filter((t) => !t.known).length;
  const gaps = [...(unspaced.length ? [`unspaced_roots_not_candidates:${unspaced.join(",")}`] : []), ...(unknown ? [`${unknown}_tokens_no_chosen_root_holds`] : [])];
  return { schema: REGIONS_SCHEMA, roots, tokens, regions, mixture, stay: +stay.toFixed(4), bits: +bits.toFixed(1), mixed: S > 1, ms: Date.now() - t0,
    derivation: { schema: DERIVATION_SCHEMA, material: "text", context: { mixture, regions: regions.length, stay: +stay.toFixed(4) }, sources: roots.map((c) => ({ id: `ud-grammar-${c}`, standing: "root", weight: mixture[c] })), composed: "regions over root codecs (the-fold/codec-regions.mjs)", gaps } };
}
