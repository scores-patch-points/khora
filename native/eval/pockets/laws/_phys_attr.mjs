// laws/_phys_attr.mjs — LOCAL ATTRACTION statistics of the "phys" family: attrPMI (window of 5 tokens) and attrDecay (exponent over single lags). See laws/phys.mjs.
// A SLOT at lag d is a directed pair (a at position i, b at position i + d), same DOCUMENT (a lag may cross a unit boundary), both types at or above the count floor (>= 10 in the sample).
// SINGLE lags are used, not lag bins: a bin of w lags counts one co-occurrence cluster up to w times, which makes pairs reach "seen twice" more easily in wide bins and inverted the sign
// of the decay in the planted burst world (exponential kernel) in the first design; at one lag a pair is "seen twice" only if the pair recurred AT THAT LAG.
// The statistics are computed on a SIZE-EQUALISED SAMPLE (8 evenly spaced blocks of ~6,000 tokens: at most 48,000 tokens, see sampleBlocks in _phys_prep.mjs), so that the raw v does not drift with the half's size;
// the count floor (>= 10) is applied to the sample's counts. Slots are enumerated over anchors i with a deterministic stride so that about min(CAP, N) anchors are looked at at EVERY lag (equal-size samples across lags).
// PMI(a->b) = ln( c(a,b) * S / (mL(a) * mR(b)) ) with c the pair count and mL, mR the left- and right-member counts of the SAMPLED slots (S eligible slots in all).
// mass(d) = sum over pairs with c >= 2 of c * max(0, PMI) / S: the mean positive PMI per slot (pairs seen once carry no weight: their PMI is the estimator's maximum, pure noise floor).
// attrPMI = mean of mass(d) over d = 1..5 (the window of 5 tokens); attrDecay = minus the OLS slope of ln mass(d) on ln d over d = 1, 2, 3, 4, 6, 8, 12, 16.

import { sampleBlocks } from "./_phys_prep.mjs";

const FLOOR = 10, CAP = 100000, MIN_TOKENS = 4000, MIN_SLOTS = 3000;
export const LAGS = [1, 2, 3, 4, 5, 6, 8, 12, 16], DECAY_LAGS = [1, 2, 3, 4, 6, 8, 12, 16];

/** mean positive PMI per slot for lags lo..hi (single lag: lo = hi); null when fewer than MIN_SLOTS eligible slots */
export function massAtLags(P, dense, T, lo, hi) {
  // every lag looks at the SAME number of candidate (anchor, lag) combinations, min(CAP, N): the stride is ceil(N / S) for a single lag
  const nl = hi - lo + 1, S = Math.min(CAP, P.N), stride = Math.max(1, Math.ceil((P.N * nl) / S)), cap = Math.ceil(P.N / stride) * nl;
  const keys = new Uint32Array(cap); let m = 0;
  for (let i = 0; i < P.N; i += stride) {
    const a = dense[P.tid[i]]; if (a < 0) continue;
    const d = P.doc[i];
    for (let l = lo; l <= hi; l++) {
      const j = i + l; if (j >= P.N || P.doc[j] !== d) break;
      const b = dense[P.tid[j]]; if (b >= 0) keys[m++] = a * T + b;
    }
  }
  if (m < MIN_SLOTS) return null;
  const ks = keys.subarray(0, m).sort(), mL = new Int32Array(T), mR = new Int32Array(T);
  for (let q = 0; q < m; q++) { const k = ks[q], a = Math.floor(k / T); mL[a]++; mR[k - a * T]++; }
  let acc = 0;
  for (let q = 0; q < m;) {
    const k = ks[q]; let r = q + 1; while (r < m && ks[r] === k) r++;
    const c = r - q;
    if (c >= 2) { const a = Math.floor(k / T), b = k - a * T, pmi = Math.log((c * m) / (mL[a] * mR[b])); if (pmi > 0) acc += c * pmi; }
    q = r;
  }
  return acc / m;
}

/** the fixed-size sample: the blocks of sampleBlocks(P) concatenated, every block its own document so that no pair spans two blocks; the count floor is applied to the SAMPLE's counts */
export function sampleOf(P) {
  const bl = sampleBlocks(P); let N = 0; for (const b of bl) N += b.ce - b.cs;
  const tid = new Int32Array(N), doc = new Int32Array(N), cnt = new Int32Array(P.V); let o = 0;
  bl.forEach((b, k) => { for (let i = b.cs; i < b.ce; i++, o++) { tid[o] = P.tid[i]; doc[o] = k * 1048576 + (P.doc[i] % 1048576); cnt[P.tid[i]]++; } });
  const dense = new Int32Array(P.V).fill(-1); let T = 0;
  for (let t = 0; t < P.V && T < 60000; t++) if (cnt[t] >= FLOOR) dense[t] = T++; // T <= 60,000 keeps a*T+b below 2^32
  return { S: { N, tid, doc }, dense, T };
}

export function attrStats(P) {
  const res = { attrPMI: null, attrDecay: null };
  if (P.N < MIN_TOKENS) return res;
  const { S, dense, T } = sampleOf(P); if (T < 10 || S.N < MIN_TOKENS) return res;
  const mass = new Map();
  for (const l of LAGS) mass.set(l, massAtLags(S, dense, T, l, l));
  const w5 = [1, 2, 3, 4, 5].map((l) => mass.get(l));
  if (w5.every((x) => x != null)) res.attrPMI = w5.reduce((x, y) => x + y, 0) / 5;
  const ms = DECAY_LAGS.map((l) => mass.get(l));
  if (ms.every((x) => x != null && x > 0)) {
    const xs = DECAY_LAGS.map(Math.log), ys = ms.map(Math.log), n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0; for (let q = 0; q < n; q++) { sxy += (xs[q] - mx) * (ys[q] - my); sxx += (xs[q] - mx) ** 2; }
    if (sxx > 0) res.attrDecay = -sxy / sxx;
  }
  return res;
}
