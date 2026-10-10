// laws/_fig_adj.mjs — INTRODUCTION-FRAME statistics of the "fig" family (null: within-unit): introLeft, introRight, introLeftFq.
// Company of an event = mean frequency-rank bin (floor(log2(mid-rank)), see _fig_prep) of its one or two neighbours on one side, inside the unit. Larger bin = rarer neighbours. Nothing else is read.
import { WIN } from "./_fig_prep.mjs";

/** stratified standardised mean difference (positives minus negatives) in units of the pooled within-stratum sd; weights n1*n0/(n1+n0); null if fewer than 30 matched pairs */
class Strat {
  constructor(S) { this.n1 = new Float64Array(S); this.s1 = new Float64Array(S); this.q1 = new Float64Array(S); this.n0 = new Float64Array(S); this.s0 = new Float64Array(S); this.q0 = new Float64Array(S); this.S = S; }
  add(s, pos, x) { if (pos) { this.n1[s]++; this.s1[s] += x; this.q1[s] += x * x; } else { this.n0[s]++; this.s0[s] += x; this.q0[s] += x * x; } }
  result() {
    let num = 0, den = 0, ss = 0, df = 0, pairs = 0;
    for (let s = 0; s < this.S; s++) {
      const a = this.n1[s], b = this.n0[s];
      if (a < 1 || b < 1) continue;
      const w = (a * b) / (a + b);
      num += w * (this.s1[s] / a - this.s0[s] / b); den += w; pairs += Math.min(a, b);
      ss += this.q1[s] - (this.s1[s] * this.s1[s]) / a + this.q0[s] - (this.s0[s] * this.s0[s]) / b; df += a + b - 2;
    }
    if (pairs < 30 || df < 20) return null;
    const sd = Math.sqrt(Math.max(ss, 0) / df);
    return sd > 0 ? num / den / sd : null;
  }
}
const lenClass = (L) => (L <= 5 ? 0 : L <= 11 ? 1 : L <= 23 ? 2 : 3);

export function intro(P) {
  const { N, U, T, tok, uOf, uStart, cnt, bin, gp, gn } = P;
  const out = { introLeft: null, introRight: null, introLeftFq: null };
  if (N < 2000) return out;
  // (a) first occurrence of every type, in the view: positive = the type goes on to recur (count >= 2), negative = hapax. Strata: 8 unit-index buckets x position class (1 or >=2 neighbours on the side) x unit-length class.
  const first = new Int32Array(T).fill(-1);
  for (let i = 0; i < N; i++) if (first[tok[i]] < 0) first[tok[i]] = i;
  const L = new Strat(64), R = new Strat(64);
  for (let t = 0; t < T; t++) {
    const i = first[t], u = uOf[i], p = i - uStart[u], q = uStart[u + 1] - 1 - i, ub = Math.min(7, Math.floor((8 * u) / U)), lc = lenClass(uStart[u + 1] - uStart[u]), pos = cnt[t] >= 2;
    if (p >= 1) L.add((ub * 2 + (p >= 2 ? 1 : 0)) * 4 + lc, pos, p >= 2 ? (bin[tok[i - 1]] + bin[tok[i - 2]]) / 2 : bin[tok[i - 1]]);
    if (q >= 1) R.add((ub * 2 + (q >= 2 ? 1 : 0)) * 4 + lc, pos, q >= 2 ? (bin[tok[i + 1]] + bin[tok[i + 2]]) / 2 : bin[tok[i + 1]]);
  }
  out.introLeft = L.result(); out.introRight = R.result();
  // (b) frequency-stratified: events = every token that opens a window (no same-type token in the 127 units before it); positive = it recurs inside the window (a figure birth), negative = it does not.
  //     Strata add the type's own count bin (floor(log2(count)) capped at 11), so recurrence is compared at equal own frequency; 4 unit-index buckets x position class x 3 length classes.
  const F = new Strat(12 * 2 * 4 * 3);
  for (let i = 0; i < N; i++) {
    if (gp[i] <= WIN) continue;
    const u = uOf[i], p = i - uStart[u];
    if (p < 1) continue;
    const t = tok[i], cb = Math.min(11, 31 - Math.clz32(cnt[t])), ub = Math.min(3, Math.floor((4 * u) / U)), lc = Math.min(2, lenClass(uStart[u + 1] - uStart[u]));
    F.add(((cb * 4 + ub) * 2 + (p >= 2 ? 1 : 0)) * 3 + lc, gn[i] <= WIN, p >= 2 ? (bin[tok[i - 1]] + bin[tok[i - 2]]) / 2 : bin[tok[i - 1]]);
  }
  out.introLeftFq = F.result();
  return out;
}
