// laws/_comp_pairs.mjs — rank-bin statistics of the "comp" family: adjacent conditional entropies, MI at distances 1..8 and its decay exponent, unit-edge laws.
import { NB, entropy, jointEntropies, finite } from "./_comp_prep.mjs";

export const DMAX = 8, MCAP = 8000, MMIN = 1500;
/** one pass over the pairs inside units. T1 = full NB x NB table of adjacent pairs (d = 1, every pair). TS[d-1] = table of a SYSTEMATIC subsample of exactly M pairs at distance d (M = min(8000, pairs at d = 8),
 *  the same M at every d: the plug-in floor of MI is then the same constant at every distance and in every pocket larger than ~25k tokens), picked by an integer Bresenham stride, no randomness. */
export function pairTables(P) {
  const { us, tb, nUnits } = P, T1 = new Float64Array(NB * NB), TS = [], Nd = [];
  for (let d = 1; d <= DMAX; d++) { let n = 0; for (let k = 0; k < nUnits; k++) n += Math.max(0, us[k + 1] - us[k] - d); Nd.push(n); TS.push(new Float64Array(NB * NB)); }
  const M = Math.min(MCAP, Nd[DMAX - 1]), acc = new Float64Array(DMAX);
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1];
    for (let i = s; i < e - 1; i++) {
      const a = tb[i] * NB; T1[a + tb[i + 1]]++;
      const lim = Math.min(DMAX, e - 1 - i);
      for (let d = 1; d <= lim; d++) { acc[d - 1] += M; if (acc[d - 1] >= Nd[d - 1]) { acc[d - 1] -= Nd[d - 1]; TS[d - 1][a + tb[i + d]]++; } }
    }
  }
  return { T1, TS, M, Nd };
}
/** {N: pairs per distance (all pairs), MI: plug-in mutual information in bits per distance on the FULL tables (levels), MIs: on the fixed-M subsample (what miDecay fits)} */
export function miProfile(view, P) {
  const { TS, Nd, M } = pairTables(P), full = fullTables(P), MI = [], MIs = [];
  for (const t of full) { const j = jointEntropies(t); MI.push(j.n > 0 ? j.Ha + j.Hb - j.Hab : null); }
  for (const t of TS) { const j = jointEntropies(t); MIs.push(j.n > 0 ? j.Ha + j.Hb - j.Hab : null); }
  return { N: Nd, M, MI, MIs };
}
function fullTables(P) {
  const { us, tb, nUnits } = P, T = []; for (let d = 0; d < DMAX; d++) T.push(new Float64Array(NB * NB));
  for (let k = 0; k < nUnits; k++) { const s = us[k], e = us[k + 1]; for (let i = s; i < e - 1; i++) { const a = tb[i] * NB, lim = Math.min(DMAX, e - 1 - i); for (let d = 1; d <= lim; d++) T[d - 1][a + tb[i + d]]++; } }
  return T;
}
export function condStats(T1) {
  const j = jointEntropies(T1);
  if (j.n < 100 || !(j.Ha > 0) || !(j.Hb > 0)) return { condR: null, condL: null };
  return { condR: finite((j.Hab - j.Ha) / j.Hb), condL: finite((j.Hab - j.Hb) / j.Ha) };
}
/** -slope of ln MI_d on ln d, d = 1..8, on the fixed-M subsample; null unless M >= 1500 and every MI_d > 0 */
export function miDecay({ TS, M }) {
  if (M < MMIN) return null;
  const xs = [], ys = [];
  for (let d = 1; d <= DMAX; d++) {
    const j = jointEntropies(TS[d - 1]), mi = j.Ha + j.Hb - j.Hab; if (!(mi > 0)) return null;
    xs.push(Math.log(d)); ys.push(Math.log(mi));
  }
  const mx = xs.reduce((a, b) => a + b, 0) / DMAX, my = ys.reduce((a, b) => a + b, 0) / DMAX;
  let sxy = 0, sxx = 0; for (let i = 0; i < DMAX; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  return finite(-sxy / sxx);
}
/** unit-edge laws over units of >= 2 tokens: entropy (bits) of the rank-bin law of first / last tokens; edgeGap = mean over units of [ln rank(last token) - ln rank(first token)] / ln V (V = types in the half).
 *  Scaling by ln V: the raw gap in log-rank grows with the vocabulary (rare words sit deeper in a bigger pocket's ranking): on prefixes of one novel, 10k -> 150k tokens, the bin gap went 2.36 -> 2.92
 *  while this scaled gap stayed 0.224-0.233. */
export function edgeStats(P) {
  const { us, w, tb, lnr, V, nUnits } = P, hi = new Float64Array(NB), hf = new Float64Array(NB); let n = 0, sg = 0;
  for (let k = 0; k < nUnits; k++) {
    const s = us[k], e = us[k + 1]; if (e - s < 2) continue;
    hi[tb[s]]++; hf[tb[e - 1]]++; n++; sg += lnr[w[e - 1]] - lnr[w[s]];
  }
  if (n < 30 || V < 3) return { initEnt: null, finEnt: null, edgeGap: null };
  return { initEnt: finite(entropy(hi)[0]), finEnt: finite(entropy(hf)[0]), edgeGap: finite(sg / n / Math.log(V)) };
}
