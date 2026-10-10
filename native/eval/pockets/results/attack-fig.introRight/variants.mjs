// variants.mjs -- generalisation of the right-hand introduction statistic of laws/_fig_adj.mjs (new file; the repo file is untouched).
// introSide(P, o): o.side 'R'|'L', o.occ k (which occurrence of a recurring type is the event; 1 = the atlas statistic), o.lc (restrict to one unit-length class 0..3), o.cntLo/cntHi (own-count range of the positive class).
// Negatives are always hapax first occurrences. With defaults the value equals the atlas introRight / introLeft exactly (checked by harness2.mjs).
import { prep, nullView, seedOf } from "./lib.mjs";
class Strat {
  constructor(S) { this.n1 = new Float64Array(S); this.s1 = new Float64Array(S); this.q1 = new Float64Array(S); this.n0 = new Float64Array(S); this.s0 = new Float64Array(S); this.q0 = new Float64Array(S); this.S = S; }
  add(s, pos, x) { if (pos) { this.n1[s]++; this.s1[s] += x; this.q1[s] += x * x; } else { this.n0[s]++; this.s0[s] += x; this.q0[s] += x * x; } }
  result(minPairs = 30) {
    let num = 0, den = 0, ss = 0, df = 0, pairs = 0;
    for (let s = 0; s < this.S; s++) {
      const a = this.n1[s], b = this.n0[s]; if (a < 1 || b < 1) continue;
      const w = (a * b) / (a + b); num += w * (this.s1[s] / a - this.s0[s] / b); den += w; pairs += Math.min(a, b);
      ss += this.q1[s] - (this.s1[s] * this.s1[s]) / a + this.q0[s] - (this.s0[s] * this.s0[s]) / b; df += a + b - 2;
    }
    if (pairs < minPairs || df < 20) return null;
    const sd = Math.sqrt(Math.max(ss, 0) / df); return sd > 0 ? num / den / sd : null;
  }
}
export const lenClass = (L) => (L <= 5 ? 0 : L <= 11 ? 1 : L <= 23 ? 2 : 3);
export function introSide(P, o = {}) {
  const { side = "R", occ = 1, lc = null, cntLo = 2, cntHi = Infinity, minPairs = 30 } = o, { N, U, T, tok, uOf, uStart, cnt, bin } = P;
  if (N < 2000) return null;
  const S = new Strat(64), seen = new Int32Array(T);
  for (let i = 0; i < N; i++) {
    const t = tok[i], k = ++seen[t], c = cnt[t]; let pos;
    if (k === 1 && c === 1) pos = false; else if (k === occ && c >= Math.max(2, occ) && c >= cntLo && c <= cntHi) pos = true; else continue;
    const u = uOf[i], p = i - uStart[u], q = uStart[u + 1] - 1 - i, m = side === "R" ? q : p; if (m < 1) continue;
    const L = uStart[u + 1] - uStart[u], l = lenClass(L); if (lc != null && l !== lc) continue;
    const ub = Math.min(7, Math.floor((8 * u) / U)), x = side === "R" ? (q >= 2 ? (bin[tok[i + 1]] + bin[tok[i + 2]]) / 2 : bin[tok[i + 1]]) : (p >= 2 ? (bin[tok[i - 1]] + bin[tok[i - 2]]) / 2 : bin[tok[i - 1]]);
    S.add((ub * 2 + (m >= 2 ? 1 : 0)) * 4 + l, pos, x);
  }
  return S.result(minPairs);
}
/** FIRST-versus-LATER contrast of recurring types (paired by type): mean over types with >= 2 occurrences having a right neighbour at both the first and the second occurrence of
 *  [x(first) - x(second)], x = right company bin (mean of 1-2 neighbours, as the atlas); in pooled-sd units. Null expectation under a within-unit shuffle is ~0. */
export function firstVsLater(P, o = {}) {
  const { N, T, tok, uOf, uStart, cnt, bin } = P, k2 = o.later ?? 2; const x1 = new Float64Array(T).fill(NaN), seen = new Int32Array(T); let n = 0, sum = 0, ss = 0, sx = 0, sxx = 0, m = 0;
  for (let i = 0; i < N; i++) {
    const t = tok[i], k = ++seen[t]; if (cnt[t] < 2 || (k !== 1 && k !== k2)) continue;
    const u = uOf[i], q = uStart[u + 1] - 1 - i; const x = q >= 1 ? (q >= 2 ? (bin[tok[i + 1]] + bin[tok[i + 2]]) / 2 : bin[tok[i + 1]]) : NaN;
    if (k === 1) x1[t] = x; else if (Number.isFinite(x) && Number.isFinite(x1[t])) { const d = x1[t] - x; sum += d; ss += d * d; n++; sx += x; sxx += x * x; m++; }
  }
  if (n < 30) return null; const mu = sx / m, sd = Math.sqrt(Math.max(sxx / m - mu * mu, 0)); return sd > 0 ? sum / n / sd : null;
}
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** generic cell: v from fn(prep(view)); null = within-unit shuffles with the ATLAS seeds seedOf(seedId, which, "fig", "within-unit", k) */
export function cellFn(view, fn, draws = 10, seedId = view.id, which = view.which) {
  const v = fn(prep(view)), xs = [];
  for (let k = 0; k < draws; k++) { const x = fn(prep(nullView(view, "within-unit", seedOf(seedId, which, "fig", "within-unit", k)))); if (Number.isFinite(x)) xs.push(x); }
  const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
export const dCell = (c) => (c.v != null && c.nullMean != null ? c.v - c.nullMean : null);
