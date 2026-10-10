// planted-worlds.mjs -- attack D: NEW planted worlds built for the suffixCopy attack (new file; reuses the repo's planted machinery read-only).
// Every world is a seeded generator of 100 documents of ~1000 tokens (like the atlas planted pockets), lexicon "A" (5000 types, Zipf), unit length D1 (median 9) unless stated.
//   W0a   iid                  pl-null analogue: iid Zipf(1.0) tokens, no structure (calibration).
//   W0b   repertoire           units drawn iid from a shared Zipf(1.0) repertoire of 400 stock units (code-like boilerplate lines, many exact duplicates), NO adjacency dependence.
//   W1    docEnd(q)            NO adjacency mechanism: each document owns 4 favoured ending bigrams; a unit ends with one of them (uniform) with probability q, else iid. Units are exchangeable WITHIN a document.
//   W2    lenRun(stay, aS)     NO copying and NO document heterogeneity: unit length follows a 2-state run chain (short 2-4 tokens / long D1>=6) with persistence `stay`; short units draw tokens from Zipf(aS),
//                              long units from Zipf(1.0) (aS = 1.0 is the no-coupling control). Adjacent units are not copies of each other; they only tend to be of the same length class.
//   W2b   lenRun rare class     the same with the short class rare (10% of units) and sticky (stay 0.9): obs/null pair ratio up to ~9 instead of ~1.8.
//   W3    epiphora(p)          the CLAIMED mechanism: with probability p a unit copies a suffix (30-70% of its length) of the previous unit.
import { rngOf, seedOf } from "../../lib/pocket.mjs";
import { V, drawCdf, cdfOf, zipfW, lexicon, buildDocs } from "../../loaders/_planted-core.mjs";
import { D1, zA } from "../../loaders/_planted-worlds1.mjs";
const lex = lexicon("A"), zCache = new Map();
const zipfCdf = (a) => { if (!zCache.has(a)) zCache.set(a, cdfOf(zipfW(V, a))); return zCache.get(a); };
const iidUnit = (rng, L, cdf) => { const u = []; for (let k = 0; k < L; k++) u.push(drawCdf(cdf, rng())); return u; };

/** length-run world: 2-state chain, S (short, concentrated endings) with persistence P(S->S)=stay and stationary share pS; L (long, ordinary). */
const lenRun = (stay, aS, pS) => (rng) => {
  const toS = (pS * (1 - stay)) / (1 - pS), zS = zipfCdf(aS); let s = rng() < pS ? 0 : 1;
  return () => {
    s = s === 0 ? (rng() < stay ? 0 : 1) : (rng() < toS ? 0 : 1);
    if (s === 0) return iidUnit(rng, 2 + Math.floor(rng() * 3), zS);
    let L = D1(rng); while (L < 6) L = D1(rng);
    return iidUnit(rng, L, zA);
  };
};

export const WORLDS = {
  W0a: { params: {}, make: () => (rng) => () => iidUnit(rng, D1(rng), zA) },
  W0b: { params: {}, make: (tag) => {
    const r = rngOf(seedOf("sfxatk-planted", "repertoire", tag)), rep = Array.from({ length: 400 }, () => iidUnit(r, D1(r), zA)), cdf = cdfOf(zipfW(400, 1.0));
    return (rng) => () => rep[drawCdf(cdf, rng())].slice();
  } },
  W1: { params: { q: [0.1, 0.25, 0.5] }, make: (tag, { q }) => (rng) => {
    const ends = Array.from({ length: 4 }, () => [drawCdf(zA, rng()), drawCdf(zA, rng())]);
    return () => { const L = D1(rng), u = iidUnit(rng, L, zA); if (rng() < q) { const e = ends[Math.floor(rng() * 4)]; u[L - 2] = e[0]; u[L - 1] = e[1]; } return u; };
  } },
  W2: { params: { stay: [0.5, 0.8, 0.95], aS: [1.0, 1.4, 1.8] }, make: (tag, { stay, aS }) => lenRun(stay, aS, 0.5) },
  W2b: { params: { aS: [1.0, 1.8, 2.5] }, make: (tag, { aS }) => lenRun(0.9, aS, 0.1) },
  W3: { params: { p: [0.02, 0.05, 0.15] }, make: (tag, { p }) => (rng) => {
    let prev = null;
    return () => {
      const L = D1(rng); let u;
      if (prev && L >= 3 && rng() < p) { const f = 0.3 + 0.4 * rng(), m = Math.max(1, Math.min(L - 1, prev.length, Math.round(f * Math.min(L, prev.length)))); u = iidUnit(rng, L - m, zA).concat(prev.slice(prev.length - m)); }
      else u = iidUnit(rng, L, zA);
      prev = u; return u;
    };
  } },
};
/** all (world, params) settings, flat: [{key, world, params}] */
export function settings() {
  const out = [];
  for (const [w, d] of Object.entries(WORLDS)) {
    const names = Object.keys(d.params);
    const grids = names.length ? names.reduce((acc, n) => acc.flatMap((a) => d.params[n].map((v) => ({ ...a, [n]: v }))), [{}]) : [{}];
    for (const g of grids) out.push({ key: w + (names.length ? "(" + names.map((n) => `${n}=${g[n]}`).join(",") + ")" : ""), world: w, params: g });
  }
  return out;
}
export function buildPocket(setting, rep, ndocs = 100) {
  const id = `atk-${setting.key}-r${rep}`, make = WORLDS[setting.world].make(id, setting.params);
  const { units, docOf } = buildDocs(id, ndocs, (rng, d) => make(rng, d), lex);
  return { id, group: "pl", register: "planted", language: "zxx", script: "latn", units, docOf, meta: { setting: setting.key, rep } };
}
