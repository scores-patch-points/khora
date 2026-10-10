// classify-prop.mjs — SHARED PROPERTY of a statistic's PRESENT pockets (PROTOCOL.md): indicator vs group, register, script, log10 tokens, log10 mean unit length, log10 doc count.
import { rngOf } from "./lib/pocket.mjs";
import { mean, shuffleInPlace, eta2Cat } from "./classify-lib.mjs";

const r2 = (x, y, mx, sxx, n) => { // squared Pearson correlation of x (pre-centred stats mx, sxx) with indicator y
  let sy = 0; for (let i = 0; i < n; i++) sy += y[i];
  const my = sy / n; let sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
};

/** attrs: [{name, type: "cat", cat, k, levels} | {name, type: "num", x}] all aligned with ind (0/1 array). Returns null when the indicator has no variation.
 *  Own permutation p per attribute, the best attribute (largest eta^2), and a Westfall-Young minP across attributes (pMax). */
export function sharedProperty(ind, attrs, draws, seed) {
  const n = ind.length, n1 = ind.reduce((a, b) => a + b, 0);
  if (n1 < 2 || n1 > n - 2) return null;
  const prep = attrs.map((a) => (a.type === "num" ? { ...a, mx: mean(a.x), sxx: a.x.reduce((s, v) => s + (v - mean(a.x)) ** 2, 0) } : a));
  const eff = (a, y) => (a.type === "cat" ? eta2Cat(y, a.cat, a.k) : r2(a.x, y, a.mx, a.sxx, n));
  const obs = prep.map((a) => eff(a, ind)), rnd = rngOf(seed), yp = ind.slice(), perm = prep.map(() => new Float64Array(draws));
  for (let d = 0; d < draws; d++) { shuffleInPlace(yp, rnd); for (let j = 0; j < prep.length; j++) perm[j][d] = eff(prep[j], yp); }
  const sorted = perm.map((p) => Float64Array.from(p).sort());
  const countGe = (j, v) => { const s = sorted[j]; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v - 1e-12) lo = m + 1; else hi = m; } return s.length - lo; };
  const pOwn = obs.map((v, j) => (1 + countGe(j, v)) / (1 + draws));
  const minObs = Math.min(...pOwn); let le = 0;
  for (let d = 0; d < draws; d++) { let mn = 1; for (let j = 0; j < prep.length; j++) mn = Math.min(mn, (1 + countGe(j, perm[j][d])) / (1 + draws)); if (mn <= minObs + 1e-12) le++; }
  const rows = prep.map((a, j) => ({ attr: a.name, type: a.type, eta2: obs[j], p: pOwn[j], levels: a.type === "cat" ? a.k : undefined }));
  let bi = 0; for (let j = 1; j < rows.length; j++) if (rows[j].eta2 > rows[bi].eta2) bi = j;
  return { nPresent: n1, n, rows, best: { attr: rows[bi].attr, eta2: rows[bi].eta2, p: rows[bi].p }, pMax: (1 + le) / (1 + draws) };
}

/** Over-representation detail for the best categorical attribute: share of PRESENT within each level (levels with >= 3 pockets only). */
export function levelProfile(ind, attr, minN = 3) {
  const cnt = new Map();
  attr.cat.forEach((c, i) => { const o = cnt.get(c) || { n: 0, pres: 0 }; o.n++; o.pres += ind[i]; cnt.set(c, o); });
  return [...cnt.entries()].filter(([, o]) => o.n >= minN).map(([c, o]) => ({ level: attr.levels[c], n: o.n, present: o.pres, share: +(o.pres / o.n).toFixed(3) })).sort((a, b) => b.share - a.share || b.n - a.n);
}

/** Numeric profile for the best numeric attribute: mean (log10 scale) among PRESENT versus the rest. */
export function numProfile(ind, attr) {
  const a = [], b = []; attr.x.forEach((v, i) => (ind[i] ? a : b).push(v));
  return { meanPresent: +mean(a).toFixed(3), meanRest: +mean(b).toFixed(3) };
}
