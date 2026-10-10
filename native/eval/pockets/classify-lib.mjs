// classify-lib.mjs — numeric helpers of classify-atlas.mjs (pure functions, deterministic; permutations use rngOf/seedOf from lib/pocket.mjs).
import { rngOf, seedOf } from "./lib/pocket.mjs";

export const fin = (x) => typeof x === "number" && Number.isFinite(x);
export const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
export const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
export function quantile(a, q) { // type-7 quantile of an unsorted array
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), h = (s.length - 1) * q, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (s[hi] - s[lo]) * (h - lo);
}
export const median = (a) => quantile(a, 0.5);

export function ranks(a) { // average ranks (ties share the mean rank)
  const ix = a.map((_, i) => i).sort((i, j) => a[i] - a[j] || i - j), r = new Array(a.length);
  for (let i = 0; i < ix.length;) { let j = i; while (j + 1 < ix.length && a[ix[j + 1]] === a[ix[i]]) j++; const rk = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k]] = rk; i = j + 1; }
  return r;
}
export function pearson(x, y) {
  const n = x.length; if (n < 3) return null;
  const mx = mean(x), my = mean(y); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}
export const spearman = (x, y) => (x.length < 3 ? null : pearson(ranks(x), ranks(y)));

/** eta-squared of y on integer categories 0..k-1: between SS / total SS (0 when y is constant). */
export function eta2Cat(y, cat, k) {
  const n = y.length, m = mean(y), sum = new Float64Array(k), cnt = new Float64Array(k); let sst = 0;
  for (let i = 0; i < n; i++) { sum[cat[i]] += y[i]; cnt[cat[i]]++; sst += (y[i] - m) ** 2; }
  if (!(sst > 0)) return 0;
  let ssb = 0; for (let g = 0; g < k; g++) if (cnt[g]) ssb += cnt[g] * (sum[g] / cnt[g] - m) ** 2;
  return ssb / sst;
}
export const dummyCats = (labels) => { const m = new Map(); const c = labels.map((l) => { const key = String(l ?? "NA"); if (!m.has(key)) m.set(key, m.size); return m.get(key); }); return { cat: c, k: m.size, levels: [...m.keys()] }; };

export function shuffleInPlace(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** Permutation test of eta2(y ~ cat): permute y over the labels `draws` times. Returns {eta2, p, k}. p = (1 + #{perm >= obs}) / (1 + draws). */
export function permEta2Cat(y, cat, k, draws, seed) {
  const obs = eta2Cat(y, cat, k), rnd = rngOf(seed), yp = y.slice(); let ge = 0;
  for (let d = 0; d < draws; d++) { shuffleInPlace(yp, rnd); if (eta2Cat(yp, cat, k) >= obs - 1e-12) ge++; }
  return { eta2: obs, p: (1 + ge) / (1 + draws), k };
}

export const seedFor = (...p) => seedOf("classify-atlas-v1", ...p);
