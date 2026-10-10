// eval/pockets/loaders/_planted-worlds1.mjs — planted worlds 1/2: pl-null, pl-null2, pl-burst, pl-markov. Each world = {lexTag, docMaker(rng, d) -> makeUnit()}.
import { V, drawCdf, cdfOf, zipfW, makeLen } from "./_planted-core.mjs";
export const D1 = makeLen("D1"), D2 = makeLen("D2");
export const ZIPF_A = 1.0, ZIPF_B = 1.3;
export const zA = cdfOf(zipfW(V, ZIPF_A)), zB = cdfOf(zipfW(V, ZIPF_B));
const iid = (rng, len, cdf) => { const L = len(rng), u = []; for (let k = 0; k < L; k++) u.push(drawCdf(cdf, rng())); return u; };

// (1) pl-null: iid Zipf(1.0), unit length iid D1, nothing else.   (8) pl-null2: iid Zipf(1.3), unit length iid D2, other lexicon seed.
export const NULL = { lexTag: "A", docMaker: (rng) => () => iid(rng, D1, zA) };
export const NULL2 = { lexTag: "B", docMaker: (rng) => () => iid(rng, D2, zB) };

// (2) pl-burst: every token, with probability q, copies a token of the document's own history (across unit boundaries) chosen by lag with weight exp(-(lag-1)/tau), lags 1..K; else a fresh Zipf(1.0) draw.
export const BURST = { q: 0.35, tau: 10, K: 60 };
const CUMW = (() => { const c = []; let s = 0; for (let l = 0; l < BURST.K; l++) { s += Math.exp(-l / BURST.tau); c.push(s); } return c; })();
export const BURST_W = CUMW.map((c, l) => c - (l ? CUMW[l - 1] : 0)); // unnormalised lag weights, lag = l + 1
export const BURST_WORLD = {
  lexTag: "A",
  docMaker: (rng) => {
    const hist = [];
    return () => {
      const L = D1(rng), u = [];
      for (let k = 0; k < L; k++) {
        let t;
        if (hist.length && rng() < BURST.q) { const m = Math.min(hist.length, BURST.K), x = rng() * CUMW[m - 1]; let l = 0; while (CUMW[l] <= x) l++; t = hist[hist.length - 1 - l]; }
        else t = drawCdf(zA, rng());
        hist.push(t); u.push(t);
      }
      return u;
    };
  },
};

// (3) pl-markov: first-order Markov chain on 8 frequency-rank bins (geometric edges); within a bin the type is Zipf(1.0) restricted to the bin; marginal is exactly Zipf(1.0).
// Bin transition matrix: pattern A[i][j] = 1 + 11*[j == FLOW[i]] (strong one-way flow i -> FLOW[i], an 8-cycle), then iterative proportional fitting so that the stationary law is the Zipf mass of each bin.
export const EDGES = [0, 2, 7, 23, 69, 204, 594, 1724, 5000]; // bin b = type indices [EDGES[b], EDGES[b+1]) = ranks 1-2, 3-7, 8-23, 24-69, 70-204, 205-594, 595-1724, 1725-5000
export const FLOW = [1, 3, 0, 5, 2, 7, 4, 6], FLOW_STRENGTH = 11;
const B = EDGES.length - 1, zw = zipfW(V, ZIPF_A), H = zw.reduce((a, b) => a + b, 0);
export const PI = Array.from({ length: B }, (_, b) => { let s = 0; for (let i = EDGES[b]; i < EDGES[b + 1]; i++) s += zw[i]; return s / H; });
export const MARKOV_M = (() => {
  let J = Array.from({ length: B }, (_, i) => Array.from({ length: B }, (_, j) => 1 + FLOW_STRENGTH * (j === FLOW[i] ? 1 : 0)));
  for (let it = 0; it < 2000; it++) {
    J = J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => (x * PI[i]) / s); });
    for (let j = 0; j < B; j++) { let s = 0; for (let i = 0; i < B; i++) s += J[i][j]; for (let i = 0; i < B; i++) J[i][j] *= PI[j] / s; }
  }
  return J.map((row, i) => { const s = row.reduce((a, b) => a + b, 0); return row.map((x) => x / s); });
})();
const MCDF = MARKOV_M.map((r) => cdfOf(r)), PICDF = cdfOf(PI);
const BINCDF = Array.from({ length: B }, (_, b) => cdfOf(zw.slice(EDGES[b], EDGES[b + 1])));
export const MARKOV = {
  lexTag: "A",
  docMaker: (rng) => () => {
    const L = D1(rng), u = []; let b = drawCdf(PICDF, rng());
    for (let k = 0; k < L; k++) { if (k) b = drawCdf(MCDF[b], rng()); u.push(EDGES[b] + drawCdf(BINCDF[b], rng())); }
    return u;
  },
};
export const binOfIndex = (i) => { let b = 0; while (i >= EDGES[b + 1]) b++; return b; };
