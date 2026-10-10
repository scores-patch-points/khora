// laws/_order_pair.mjs — NEIGHBOUR statistics of the "order" family: fnBefore, depLen, branch, asym (+ surprGrow from _order_surp.mjs).
// Each has an exactly known expectation under the within-unit shuffle (0, or 1 for the variance ratios), whatever the unit lengths and vocabulary (see the header of order.mjs).
import { surprGrow } from "./_order_surp.mjs";

export function pairStats(P) {
  const { U, T, xs, bs, mid, K, B, unitStart } = P, out = {};
  // ---- fnBefore: content centres (mid-rank > 4K) with both neighbours inside the unit; left-head rate minus right-head rate
  let nC = 0, hL = 0, hR = 0;
  const content = 4 * K;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    for (let i = 1; i < L - 1; i++) {
      const p = a + i;
      if (mid[T[p]] > content) { nC++; if (mid[T[p - 1]] <= K) hL++; if (mid[T[p + 1]] <= K) hR++; }
    }
  }
  if (nC >= 1000) out.fnBefore = (hL - hR) / nC;
  // ---- depLen: successive same-bin tokens inside a unit; chance expectation (L+1)/(m+1) per gap (uniform order statistics)
  const last = new Int32Array(B).fill(-1), gs = new Float64Array(B), ms = new Int32Array(B);
  let obs = 0, exp = 0;
  // ---- branch: normalised mean squared difference at lag 1 and lag 2 (chance = 2 (L-k) S^2 per unit, S^2 = unit sample variance of x)
  let num1 = 0, den1 = 0, num2 = 0, den2 = 0, nT3 = 0;
  // ---- asym: adjacent rank-bin pair flow matrix
  const M = new Float64Array(B * B);
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    for (let i = 0; i + 1 < L; i++) { const b0 = bs[a + i], b1 = bs[a + i + 1]; if (b0 !== b1) M[b0 * B + b1]++; }
    if (L < 3) continue;
    let xm = 0;
    for (let i = 0; i < L; i++) xm += xs[a + i];
    xm /= L;
    let ss = 0, d1 = 0, d2 = 0;
    for (let i = 0; i < L; i++) {
      const x = xs[a + i], b = bs[a + i];
      ss += (x - xm) * (x - xm);
      if (i >= 1) { const d = x - xs[a + i - 1]; d1 += d * d; }
      if (i >= 2) { const d = x - xs[a + i - 2]; d2 += d * d; }
      if (last[b] >= 0) gs[b] += i - last[b];
      last[b] = i; ms[b]++;
    }
    const S2 = ss / (L - 1);
    nT3 += L; num1 += d1; den1 += 2 * (L - 1) * S2; num2 += d2; den2 += 2 * (L - 2) * S2;
    for (let b = 0; b < B; b++) {
      if (ms[b] >= 2) { obs += gs[b]; exp += ((ms[b] - 1) * (L + 1)) / (ms[b] + 1); }
      last[b] = -1; gs[b] = 0; ms[b] = 0;
    }
  }
  if (exp > 0 && obs > 0) out.depLen = Math.log(obs / exp);
  const e3 = 1e-9 * nT3; // floating-point residue guard (x constant)
  if (den1 > e3 && den2 > e3 && num1 > e3 && num2 > e3) out.branch = Math.log(num2 / den2 / (num1 / den1));
  let numA = 0, denA = 0, pairs = 0;
  for (let a = 0; a < B; a++) for (let b = a + 1; b < B; b++) {
    const s = M[a * B + b] + M[b * B + a];
    if (s >= 20) { const d = M[a * B + b] - M[b * B + a]; numA += (d * d) / s - 1; denA += s; pairs++; }
  }
  if (pairs >= 3 && denA >= 1000) out.asym = numA / denA;
  Object.assign(out, surprGrow(P));
  return out;
}
