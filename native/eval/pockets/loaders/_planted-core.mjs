// eval/pockets/loaders/_planted-core.mjs — shared machinery of the PLANTED worlds (leading underscore: the atlas ignores this file; loaders/planted.mjs is the loader).
// Everything is deterministic: every document of every world has its own rng, rngOf(seedOf(TAG, worldId, "doc", d)); no Math.random, no Date.
import { rngOf, seedOf } from "../lib/pocket.mjs";
export const TAG = "planted-v1";
export const V = 5000;          // designed vocabulary (types); realised types in a 100k-token Zipf sample are fewer, see planted-truth.json
export const DOC_TOKENS = 1000; // a document closes at the first unit boundary at or after this many tokens (units are never cut)
export const NDOCS = 100;       // documents per single-process world (pl-mix has 120)

/** first index i with cdf[i] > u (cdf ascending, last entry exactly 1) */
export const drawCdf = (cdf, u) => { let lo = 0, hi = cdf.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return lo; };
export function cdfOf(w) { const c = new Float64Array(w.length); let s = 0; for (let i = 0; i < w.length; i++) { s += w[i]; c[i] = s; } for (let i = 0; i < c.length; i++) c[i] /= s; c[c.length - 1] = 1; return c; }
/** Zipf weights 1/(i+1)^s for i = 0..n-1 (index 0 is the commonest type) */
export const zipfW = (n, s) => Float64Array.from({ length: n }, (_, i) => Math.pow(i + 1, -s));
export const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

/** Unit-length distributions (tokens per unit). D1: discretised lognormal (median ~9, mean ~10.4) on 2..45.  D2: shifted exponential (mode 2, mean ~16) on 2..70. */
export const LEN_PARAMS = { D1: { kind: "lognormal", mu: Math.log(9), sigma: 0.55, min: 2, max: 45 }, D2: { kind: "shifted-exponential", mean: 14, min: 2, max: 70 } };
export function lenPmf(name) {
  const p = LEN_PARAMS[name], w = [];
  for (let k = p.min; k <= p.max; k++) w.push(name === "D1" ? Math.exp(-((Math.log(k) - p.mu) ** 2) / (2 * p.sigma ** 2)) / k : Math.exp(-(k - p.min) / p.mean));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x, i) => ({ len: p.min + i, p: x / s }));
}
export function makeLen(name) { const pm = lenPmf(name), cdf = cdfOf(pm.map((x) => x.p)); return (rnd) => pm[drawCdf(cdf, rnd())].len; }
export const pmfMean = (name) => lenPmf(name).reduce((a, x) => a + x.len * x.p, 0);

/** Lexicon: index -> unique pronounceable lowercase a-z string. lenOf(i, rnd) gives the desired string length of type i. Collisions bump the length by one (counted in .bumps). */
const CONS = "bdfgklmnprstvz", VOW = "aeiou";
export const LEX_A_LEN = [[3, .10], [4, .20], [5, .25], [6, .20], [7, .13], [8, .08], [9, .04]]; // string length iid per type, independent of its frequency rank
export const lenIid = (rnd) => { let u = rnd(), s = 0; for (const [n, p] of LEX_A_LEN) { s += p; if (u < s) return n; } return 9; };
export function makeLexicon(tag, lenOf) {
  const rnd = rngOf(seedOf(TAG, "lexicon", tag)), seen = new Set(), words = []; let bumps = 0;
  for (let i = 0; i < V; i++) {
    let n = lenOf(i, rnd), w, tries = 0;
    for (;;) {
      let cons = rnd() < 0.8; w = "";
      for (let k = 0; k < n; k++, cons = !cons) w += cons ? CONS[Math.floor(rnd() * CONS.length)] : VOW[Math.floor(rnd() * VOW.length)];
      if (!seen.has(w)) break;
      if (++tries > 40) { n++; bumps++; tries = 0; }
    }
    seen.add(w); words.push(w);
  }
  words.bumps = bumps;
  return words;
}
const LEX = new Map();
/** tags: "A" iid lengths (null, burst, markov, frames, parallel, mix); "B" iid lengths, other seed (null2); "L" length tied to rank (pl-length). */
export function lexicon(tag) {
  if (!LEX.has(tag)) LEX.set(tag, makeLexicon(tag, tag === "L" ? (i, rnd) => Math.max(2, Math.min(14, Math.round(LENGTH_LAW.a + LENGTH_LAW.b * Math.log10(i + 1) + LENGTH_LAW.noise * gauss(rnd)))) : (i, rnd) => lenIid(rnd)));
  return LEX.get(tag);
}
/** pl-length design: string length of type with 0-based frequency index i = round(a + b*log10(i+1) + noise*N(0,1)), clamped to [2,14] (b letters per decade of rank). */
export const LENGTH_LAW = { a: 2, b: 2.4, noise: 0.7, beta: 0.1, zRef: 7, lnLRef: Math.log(9), lnLScale: 0.55 };

/** Build {units, docOf} for a world. docMaker(rng, d) returns a closure makeUnit() -> number[] (type indices) holding the document's state. */
export function buildDocs(id, ndocs, docMaker, lex) {
  const units = [], docOf = [];
  for (let d = 0; d < ndocs; d++) {
    const rng = rngOf(seedOf(TAG, id, "doc", d)), make = docMaker(rng, d); let tok = 0;
    while (tok < DOC_TOKENS) { const u = make(); units.push(u.map((t) => lex[t])); docOf.push(d); tok += u.length; }
  }
  return { units, docOf };
}
