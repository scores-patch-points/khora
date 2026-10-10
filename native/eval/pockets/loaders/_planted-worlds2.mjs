// eval/pockets/loaders/_planted-worlds2.mjs — planted worlds 2/2: pl-frames, pl-parallel, pl-length, pl-mix.
import { V, drawCdf, cdfOf, zipfW, lexicon, LENGTH_LAW, TAG } from "./_planted-core.mjs";
import { rngOf, seedOf } from "../lib/pocket.mjs";
import { D1, zA, BURST_WORLD, MARKOV } from "./_planted-worlds1.mjs";

// (4) pl-frames: rigid frames over three role classes. Type index space (lexicon A): function words = indices 0..7; names = the last 24 indices; open class A = even indices 8..4974, open class B = odd indices 9..4975,
// each class Zipf(1.0) over its own members. A unit is [vocative name] + frame; the name is drawn uniformly from the document's CAST (4 names chosen per document) with probability VOC_P.
export const FW = 8, NNAMES = 24, CAST = 4, VOC_P = 0.35;
export const NAME0 = V - NNAMES;
export const FRAMES = [["A", 0, "B"], ["A", 1, "B", 2, "A"], [3, "A", "B"], ["B", 0, "A", "A"], ["A", 4, "B", 5, "B"], [6, "A", 7, "B"], ["A", "B", 1, "A"]];
export const FRAME_W = [0.22, 0.14, 0.12, 0.14, 0.10, 0.12, 0.16];
const FRCDF = cdfOf(FRAME_W), NCLS = (V - NNAMES - FW) / 2, CLSCDF = cdfOf(zipfW(NCLS, 1.0));
export const classOf = (i) => (i < FW || i >= NAME0 ? null : (i - FW) % 2 === 0 ? "A" : "B");
const member = (cls, k) => FW + 2 * k + (cls === "A" ? 0 : 1);
export const FRAMES_WORLD = {
  lexTag: "A",
  docMaker: (rng) => {
    const pool = Array.from({ length: NNAMES }, (_, i) => NAME0 + i), cast = [];
    for (let c = 0; c < CAST; c++) { const j = c + Math.floor(rng() * (NNAMES - c)); [pool[c], pool[j]] = [pool[j], pool[c]]; cast.push(pool[c]); }
    return () => {
      const u = [];
      if (rng() < VOC_P) u.push(cast[Math.floor(rng() * CAST)]);
      for (const s of FRAMES[drawCdf(FRCDF, rng())]) u.push(typeof s === "number" ? s : member(s, drawCdf(CLSCDF, rng())));
      return u;
    };
  },
};

// (5) pl-parallel: iid Zipf(1.0) units of length D1, except that with probability COPY_P (and length >= 3) a unit copies a prefix (anaphora, prob 1/2) or a suffix (epiphora, prob 1/2) of the PREVIOUS unit of the same document,
// m = round(f * min(L, len_prev)) tokens with f ~ U(0.3, 0.7) (m >= 1, m <= L-1), the rest of the unit fresh iid. The first unit of a document is always fresh.
export const PAR = { p: 0.35, fmin: 0.3, fmax: 0.7 };
export const PARALLEL = {
  lexTag: "A",
  docMaker: (rng) => {
    let prev = null;
    return () => {
      const L = D1(rng); let u;
      if (prev && L >= 3 && rng() < PAR.p) {
        const f = PAR.fmin + (PAR.fmax - PAR.fmin) * rng(), m = Math.max(1, Math.min(L - 1, prev.length, Math.round(f * Math.min(L, prev.length)))), pre = rng() < 0.5, fresh = [];
        for (let k = 0; k < L - m; k++) fresh.push(drawCdf(zA, rng()));
        u = pre ? prev.slice(0, m).concat(fresh) : fresh.concat(prev.slice(prev.length - m));
      } else { u = []; for (let k = 0; k < L; k++) u.push(drawCdf(zA, rng())); }
      prev = u; return u;
    };
  },
};

// (6) pl-length: lexicon L has string length tied to frequency index (Zipf abbreviation, LENGTH_LAW.b letters per decade of rank); and the type drawn for a unit of length L is tilted toward short strings when L is long
// (Menzerath): weight_r = zipf_r * exp(-beta * z_L * (len_r - zRef)), z_L = (ln L - ln 9)/0.55. Tokens within a unit are iid given L; no order structure at all.
let TILT = null;
const tilts = () => {
  if (TILT) return TILT;
  const lex = lexicon("L"), zw = zipfW(V, 1.0); TILT = new Map();
  for (let L = 2; L <= 45; L++) { const z = (Math.log(L) - LENGTH_LAW.lnLRef) / LENGTH_LAW.lnLScale; TILT.set(L, cdfOf(zw.map((w, r) => w * Math.exp(-LENGTH_LAW.beta * z * (lex[r].length - LENGTH_LAW.zRef))))); }
  return TILT;
};
export const LENGTH = { lexTag: "L", docMaker: (rng) => () => { const L = D1(rng), cdf = tilts().get(L), u = []; for (let k = 0; k < L; k++) u.push(drawCdf(cdf, rng())); return u; } };

// (7) pl-mix: 120 documents, each generated wholesale by one of the worlds 2 (burst), 3 (markov), 4 (frames), exact counts 48 / 36 / 36 (0.4 / 0.3 / 0.3), order shuffled by seed; lexicon A shared by all three.
export const MIX_COUNTS = { burst: 48, markov: 36, frames: 36 }, MIX_DOCS = 120;
export const MIX_ASSIGN = (() => {
  const a = []; for (const [k, n] of Object.entries(MIX_COUNTS)) for (let i = 0; i < n; i++) a.push(k);
  const r = rngOf(seedOf(TAG, "pl-mix", "assign")); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
})();
const PARTS = { burst: BURST_WORLD, markov: MARKOV, frames: FRAMES_WORLD };
export const MIX = { lexTag: "A", docMaker: (rng, d) => PARTS[MIX_ASSIGN[d]].docMaker(rng, d) };
