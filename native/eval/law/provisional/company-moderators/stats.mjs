// stats.mjs: tiny OLS / LOLO / permutation helpers (NEW FILE).
import { mean, sd } from "./util.mjs";

export function solve(A, b) { // Gaussian elimination with partial pivoting, A is k x k
  const k = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < k; c++) { let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12; for (let j = c; j <= k; j++) M[c][j] /= d; for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; } }
  return M.map((r) => r[k]);
}
/** OLS with intercept on z-scored features (scaler from the training rows). Returns predict(x) and the standardised coefficients. */
export function fitOls(X, y, ridge = 1e-8) {
  const p = X[0]?.length ?? 0, mu = [], s = [];
  for (let j = 0; j < p; j++) { const col = X.map((r) => r[j]); mu.push(mean(col)); s.push(sd(col) || 1); }
  const Z = X.map((r) => [1, ...r.map((v, j) => (v - mu[j]) / s[j])]), k = p + 1;
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0);
  for (let i = 0; i < Z.length; i++) for (let a = 0; a < k; a++) { b[a] += Z[i][a] * y[i]; for (let c = 0; c < k; c++) A[a][c] += Z[i][a] * Z[i][c]; }
  for (let a = 1; a < k; a++) A[a][a] += ridge;
  const w = solve(A, b);
  return { w, mu, s, predict: (x) => w[0] + x.reduce((t, v, j) => t + w[j + 1] * ((v - mu[j]) / s[j]), 0) };
}
/** Leave-one-row-out predictions; empty feature set = mean-only baseline. */
export function lolo(X, y) {
  return y.map((_, i) => { const tr = y.map((__, j) => j).filter((j) => j !== i), yt = tr.map((j) => y[j]);
    if (!X[0]?.length) return mean(yt); return fitOls(tr.map((j) => X[j]), yt).predict(X[i]); });
}
export const rmse = (a, b) => Math.sqrt(mean(a.map((v, i) => (v - b[i]) ** 2)));
export const mae = (a, b) => mean(a.map((v, i) => Math.abs(v - b[i])));
export function skillOf(X, y) { const base = lolo(y.map(() => []), y), mod = lolo(X, y), rb = rmse(base, y), rm = rmse(mod, y); return { rmseBase: rb, rmseModel: rm, maeBase: mae(base, y), maeModel: mae(mod, y), skill: 1 - rm / rb, pred: mod, predBase: base }; }
export function ranks(xs) { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(xs.length); let i = 0;
  while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const rk = (i + j) / 2 + 1; for (let t = i; t <= j; t++) r[idx[t][1]] = rk; i = j + 1; } return r; }
export function pearson(a, b) { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : 0; }
export const spearman = (a, b) => pearson(ranks(a), ranks(b));
export function shuffleIn(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function hanleyMcNeilSE(A, n1, n2) { const Q1 = A / (2 - A), Q2 = (2 * A * A) / (1 + A); return Math.sqrt((A * (1 - A) + (n1 - 1) * (Q1 - A * A) + (n2 - 1) * (Q2 - A * A)) / (n1 * n2)); }
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
