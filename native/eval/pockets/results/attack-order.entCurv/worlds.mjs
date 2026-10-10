// worlds.mjs -- NEW planted worlds for the ATTACK D on order.entCurv (new file; imports the atlas's own planted machinery, edits nothing).
// Each world = a docMaker over the shared lexicon "A" (V = 5000 types, index 0 = designed commonest), 100 documents x ~1000 tokens, in two unit-length regimes:
//   LONG  = D1 (lognormal, mean ~10.4, as pl-null)      SHORT = 3 + geometric(p = 0.35), capped 14 (mean ~4.9; code-line-like)
// Worlds (position-locked structure only; none uses capitals, word lists or POS):
//   null     iid Zipf(1.0)                                              expect ABSENT (exchangeable inside a unit: the within-unit null is exact)
//   null2    iid Zipf(1.5)                                              expect ABSENT (another exponent; pl-null2-like)
//   lenmix   unit composition depends on unit LENGTH (short: Zipf 1.6, long: Zipf 0.8), no position structure   expect ABSENT
//   both     first token from closed class C1 (8 types, prob .8), last from C2 (8 types, prob .8), rest Zipf(1.0)     the claimed mechanism (two specialised edges): expect +
//   start    only the first token from C1                               ONE specialised edge
//   end      only the last token from C2                                ONE specialised edge
//   drift    token drawn from head-Zipf(1.5, top 200) with prob 1-t, from tail-Zipf(0.8, rest) with prob t, t = i/(L-1): monotone drift, no special edge
//   mid      the middle token (floor(L/2)) from C1 (prob .8), rest Zipf(1.0)    closed class in the MIDDLE (true "edges richer than the middle")
//   kw1      statement-initial singleton keyword: first token is type 0 with prob .6, everywhere else Zipf(1.0) over types 1..V-1 (type 0 never occurs elsewhere)
//   startrich first token from flat Zipf(0.5) over all types, rest from concentrated Zipf(1.6): ONE rich edge, no U
//   kwpeak   as kw1 but the rest is Zipf(1.0) over types 16..1999 only (mid-rank-peaked octave profile, no head types inside the unit): the keyword adds a NEW occupied rank bin at the start
//   rareedges first and last token from a RARE class (types 300..4999, Zipf(1.5) inside it) with prob .8, rest Zipf(1.0): the edges carry RARE words (real prose pairs entCurv>0 with rareCurve>0)
//   bothpeak the claimed two-edge mechanism of `both` (closed classes C1 first, C2 last, prob .8) but the rest is the mid-rank-peaked Zipf(1.0) over types 16..1999
import { V, drawCdf, cdfOf, zipfW, makeLen, buildDocs, lexicon } from "../../loaders/_planted-core.mjs";
const D1 = makeLen("D1");
export const LONG = (rng) => D1(rng);
export const SHORT = (rng) => { let L = 3; while (L < 14 && rng() > 0.35) L++; return L; };
const zc = (s, from = 0, to = V) => { const w = zipfW(V, s); for (let i = 0; i < from; i++) w[i] = 0; for (let i = to; i < V; i++) w[i] = 0; return cdfOf(w); };
const Zrare = zc(1.5, 300), Zpk = zc(1.0, 16, 2000), Z1 = zc(1.0), Z15 = zc(1.5), Z08 = zc(0.8), Z16 = zc(1.6), Z05 = zc(0.5), Z1x = zc(1.0, 1), Z15head = zc(1.5, 0, 200), Z08tail = zc(0.8, 200);
const draw = (cdf, rng) => drawCdf(cdf, rng());
const cls = (base, rng) => base + Math.floor(rng() * 8); // closed class of 8 types starting at index `base`
const P = 0.8;
const TOK = {
  null: (rng) => draw(Z1, rng), null2: (rng) => draw(Z15, rng),
  both: (rng, i, L) => (i === 0 && rng() < P ? cls(0, rng) : i === L - 1 && rng() < P ? cls(8, rng) : draw(Z1, rng)),
  start: (rng, i) => (i === 0 && rng() < P ? cls(0, rng) : draw(Z1, rng)),
  end: (rng, i, L) => (i === L - 1 && rng() < P ? cls(8, rng) : draw(Z1, rng)),
  drift: (rng, i, L) => (rng() < 1 - i / (L - 1) ? draw(Z15head, rng) : draw(Z08tail, rng)),
  mid: (rng, i, L) => (i === Math.floor(L / 2) && rng() < P ? cls(0, rng) : draw(Z1, rng)),
  kw1: (rng, i) => (i === 0 && rng() < 0.6 ? 0 : draw(Z1x, rng)),
  startrich: (rng, i) => (i === 0 ? draw(Z05, rng) : draw(Z16, rng)),
  rareedges: (rng, i, L) => ((i === 0 || i === L - 1) && rng() < P ? draw(Zrare, rng) : draw(Z1, rng)),
  kwpeak: (rng, i) => (i === 0 && rng() < 0.6 ? 0 : draw(Zpk, rng)),
  bothpeak: (rng, i, L) => (i === 0 && rng() < P ? cls(0, rng) : i === L - 1 && rng() < P ? cls(8, rng) : draw(Zpk, rng)),
};
export const WORLD_NAMES = ["null", "null2", "lenmix", "both", "start", "end", "drift", "mid", "kw1", "startrich", "kwpeak", "bothpeak", "rareedges"];
export function worldSpec(name, lenName) {
  const lenFn = lenName === "short" ? SHORT : LONG;
  if (name === "lenmix") return { lexTag: "A", docMaker: (rng) => () => { const L = lenFn(rng), cdf = L <= 7 ? Z16 : Z08, u = []; for (let k = 0; k < L; k++) u.push(draw(cdf, rng)); return u; } };
  const tok = TOK[name];
  return { lexTag: "A", docMaker: (rng) => () => { const L = lenFn(rng), u = []; for (let k = 0; k < L; k++) u.push(tok(rng, k, L)); return u; } };
}
/** pocket-like {id, units, docOf}: 100 documents; id = `ecd-<world>-<len>` (seeds of the null draws derive from the id) */
export function buildWorld(name, lenName, ndocs = 100) {
  const id = `ecd-${name}-${lenName}`, w = worldSpec(name, lenName), { units, docOf } = buildDocs(id, ndocs, w.docMaker, lexicon(w.lexTag));
  return { id, units, docOf };
}
