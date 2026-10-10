// stats.mjs -- small deterministic statistics helpers for the suffixCopy attack (no randomness except through rngOf).
export const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
export const median = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
export const quantile = (a, q) => { const s = a.slice().sort((x, y) => x - y), n = s.length; if (!n) return NaN; const p = (n - 1) * q, lo = Math.floor(p), hi = Math.ceil(p); return s[lo] + (s[hi] - s[lo]) * (p - lo); };
export const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
/** average ranks (ties share the mean rank) */
export function ranks(x) {
  const n = x.length, ix = Array.from({ length: n }, (_, i) => i).sort((a, b) => x[a] - x[b] || a - b), r = new Array(n);
  for (let i = 0; i < n;) { let j = i; while (j + 1 < n && x[ix[j + 1]] === x[ix[i]]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k]] = m; i = j + 1; }
  return r;
}
export function pearson(x, y) {
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}
export const spearman = (x, y) => pearson(ranks(x), ranks(y));
/** residuals of y after OLS on the columns of Z (each an array), intercept included. Solves the normal equations by Gauss elimination (Z has <= 4 columns). */
export function residuals(y, Z) {
  const n = y.length, k = Z.length + 1, X = Array.from({ length: n }, (_, i) => [1, ...Z.map((c) => c[i])]);
  const A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += X[i][a] * X[i][b]; A[a][k] += X[i][a] * y[i]; }
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < k; r++) if (r !== c) { const t = A[r][c] / A[c][c]; for (let q = c; q <= k; q++) A[r][q] -= t * A[c][q]; }
  }
  const beta = A.map((row, i) => row[k] / row[i]);
  return y.map((yi, i) => yi - X[i].reduce((s, xv, j) => s + xv * beta[j], 0));
}
/** partial Spearman of x and y given controls Z: rank-transform everything, residualise on the ranked controls, correlate */
export function partialSpearman(x, y, Z) { const rz = Z.map(ranks); return pearson(residuals(ranks(x), rz), residuals(ranks(y), rz)); }
/** one-way ANOVA eta-squared of y over a categorical grouping g */
export function eta2(y, g) {
  const n = y.length, m = mean(y), sums = new Map(); let sst = 0;
  for (let i = 0; i < n; i++) { sst += (y[i] - m) ** 2; const e = sums.get(g[i]) || [0, 0]; e[0] += y[i]; e[1]++; sums.set(g[i], e); }
  let ssb = 0; for (const [, [s, c]] of sums) ssb += c * (s / c - m) ** 2;
  return sst > 0 ? ssb / sst : NaN;
}
/** Cramer's V of a binary vector against a categorical vector (no bias correction) */
export function cramersV(b, g) {
  const lv = [...new Set(g)], n = b.length; let chi = 0; const n1 = b.reduce((s, x) => s + x, 0), n0 = n - n1;
  for (const l of lv) { let c1 = 0, c = 0; for (let i = 0; i < n; i++) if (g[i] === l) { c++; c1 += b[i]; } const e1 = c * n1 / n, e0 = c * n0 / n; if (e1 > 0) chi += (c1 - e1) ** 2 / e1; if (e0 > 0) chi += ((c - c1) - e0) ** 2 / e0; }
  return Math.sqrt(chi / n / 1);
}
// ---- normal / Poisson tail helpers ----
export const lgamma = (x) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const cj of c) s += cj / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
/** log P(Poisson(lam) >= k) by direct summation in log space (k >= 1, lam > 0) */
export function logPoisUpper(k, lam) {
  if (k <= 0) return 0;
  const lt = (i) => -lam + i * Math.log(lam) - lgamma(i + 1);
  let mx = lt(k), acc = 1, i = k + 1, prev = mx;
  for (; i < k + 20000; i++) { const t = lt(i) - mx; if (t < -45 && i > lam) break; acc += Math.exp(t); prev = t; }
  return mx + Math.log(acc);
}
/** upper-tail standard normal quantile from a log tail probability (Acklam-type rational approximation for p >= 1e-300, asymptotic below) */
export function zFromLogP(lp) {
  if (lp >= Math.log(0.5)) return 0;
  if (lp > -690) { // p = exp(lp); invert upper tail via bisection on erfc-free asymptotic series refined by Newton
    let z = Math.sqrt(-2 * lp); for (let it = 0; it < 60; it++) { const lg = logQ(z); const d = (lg - lp) / (-(Math.exp(-0.5 * z * z - Math.log(Math.sqrt(2 * Math.PI)) - lg))); z -= d; if (Math.abs(d) < 1e-10) break; } return z;
  }
  return Math.sqrt(-2 * lp);
}
/** log of the upper normal tail Q(z) (z >= 0) */
export function logQ(z) {
  if (z < 5) { // erfc via continued numerical approximation (Numerical Recipes erfc Chebyshev)
    const x = z / Math.SQRT2, t = 1 / (1 + 0.5 * x), r = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return Math.log(0.5 * r);
  }
  return -0.5 * z * z - Math.log(z) - 0.5 * Math.log(2 * Math.PI) + Math.log(1 - 1 / (z * z) + 3 / (z ** 4));
}
/** "Poisson z" of an observed hit count against a null whose mean hit count is estimated from `draws` draws as (sum + 1)/(draws + 1) (a +1 pseudo-count so a null of zeros does not give lam = 0) */
export function poissonZ(hits, nullHitList) {
  const lam = (nullHitList.reduce((a, b) => a + b, 0) + 1) / (nullHitList.length + 1);
  if (hits <= lam) return (hits - lam) / Math.sqrt(lam);
  return zFromLogP(logPoisUpper(hits, lam));
}
