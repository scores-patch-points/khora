// lib.mjs -- shared helpers of the ATTACK on order.entCurv (new file; imports the repo's own prep / posStats / halves / nullView and edits nothing).
// entCurv depends only on the within-view rank-bin of every token (bin = floor(log2 mid-rank)) and on the token order inside units.
// cell() = the atlas cell: prep(view) -> posStats() gives entCurv; the 10 within-unit null draws shuffle an index permutation per unit with EXACTLY the rng consumption of lib/pocket.mjs nullView
// (so for an unmodified view the draws are the atlas draws). entc() is an independent re-implementation of the entCurv estimator that also returns the three third-entropies and offers
// alternative bin schemes / estimators; for the default options it must equal posStats().entCurv (checked in selfcheck.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
import { posStats } from "../../laws/_order_pos.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep, posStats };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCR = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad";
export const CACHE = path.join(SCR, "cache-es"); // loader output of the 391 real non-thin atlas pockets (written earlier by an entSlope attack, unmodified; verified here against the atlas by selfcheck.mjs)
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const TABLE = () => JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8"));
export const STAT = "entCurv";
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const meanLen = (units) => tokensOf(units) / Math.max(1, units.length);
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };

/** shuffled copy of the prepared view P: per unit, Fisher-Yates over positions with the rng of nullView (same call order), applied to xs, bs and T together. */
export function shuffledP(P, seed) {
  const rnd = rngOf(seed), xs = new Float64Array(P.N), bs = new Uint8Array(P.N), T = new Int32Array(P.N), idx = [];
  for (let u = 0; u < P.U; u++) {
    const a = P.unitStart[u], L = P.unitStart[u + 1] - a;
    idx.length = L; for (let i = 0; i < L; i++) idx[i] = i;
    for (let i = L - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < L; i++) { xs[a + i] = P.xs[a + idx[i]]; bs[a + i] = P.bs[a + idx[i]]; T[a + i] = P.T[a + idx[i]]; }
  }
  return { ...P, xs, bs, T };
}

const entropy = (c, mm) => {
  let n = 0, k = 0;
  for (let b = 0; b < c.length; b++) if (c[b] > 0) { n += c[b]; k++; }
  if (n <= 0) return null;
  let h = 0;
  for (let b = 0; b < c.length; b++) if (c[b] > 0) h -= (c[b] / n) * Math.log(c[b] / n);
  return mm ? h + (k - 1) / (2 * n) : h;
};
/** binScheme(P) -> {bins:Uint8Array per token, B}. "oct" = the atlas bins (floor log2 mid-rank). "half" = half-octaves floor(2 log2 mid-rank). "mass" = nq equal-token-mass bins by rank (no Zipf octave structure). */
export function binsOf(P, scheme) {
  if (!scheme || scheme === "oct") return { bins: P.bs, B: P.B };
  const { N, T, mid } = P;
  if (scheme === "half") {
    const bins = new Uint8Array(N); let B = 1;
    for (let i = 0; i < N; i++) { const b = Math.floor(2 * Math.log2(mid[T[i]]) + 1e-12); bins[i] = b; if (b + 1 > B) B = b + 1; }
    return { bins, B };
  }
  const m = /^mass(\d+)$/.exec(scheme);
  if (m) {
    const nq = Number(m[1]), V = mid.length, order = Array.from({ length: V }, (_, t) => t).sort((a, b) => mid[a] - mid[b] || a - b), cnt = P.cnt, cum = new Float64Array(V); // type -> bin by cumulative token mass share (a type is never split)
    let s = 0; for (const t of order) { cum[t] = (s + cnt[t] / 2) / N; s += cnt[t]; }
    const bins = new Uint8Array(N); for (let i = 0; i < N; i++) bins[i] = Math.min(nq - 1, Math.floor(cum[T[i]] * nq));
    return { bins, B: nq };
  }
  throw new Error("unknown bin scheme " + scheme);
}
/** entc(P, {scheme, mm, minL, maxL}) -> {curv, slope, H:[H0,H1,H2], Hp, nU, nTok}: fractional thirds exactly as _order_pos.mjs; only units with minL <= L <= maxL (default L >= 3) and mask[u] (optional Uint8Array over units) count. */
export function entc(P, { scheme = "oct", mm = true, minL = 3, maxL = Infinity, bsOverride = null, mask = null } = {}) {
  const { U, unitStart } = P, bb = bsOverride ? { bins: bsOverride, B: P.B } : binsOf(P, scheme), { bins, B } = bb;
  const C = [new Float64Array(B), new Float64Array(B), new Float64Array(B)];
  let nU = 0, nTok = 0;
  for (let u = 0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    if (L < minL || L > maxL || (mask && !mask[u])) continue;
    const third = L / 3, inv = 3 / L;
    for (let i = 0; i < L; i++) {
      const s = i * inv, e = (i + 1) * inv, b = bins[a + i];
      let t0 = Math.floor(s + 1e-12), t1 = Math.floor(e - 1e-12);
      if (t0 > 2) t0 = 2; if (t1 > 2) t1 = 2;
      if (t0 === t1) C[t0][b] += 1;
      else { const w0 = (t0 + 1 - s) * third; C[t0][b] += w0; C[t1][b] += 1 - w0; }
    }
    nTok += L; nU++;
  }
  if (nU < 300 || nTok < 2000) return null;
  const pool = new Float64Array(B); for (let b = 0; b < B; b++) pool[b] = C[0][b] + C[1][b] + C[2][b];
  const H0 = entropy(C[0], mm), H1 = entropy(C[1], mm), H2 = entropy(C[2], mm), Hp = entropy(pool, mm);
  if (H0 == null || H1 == null || H2 == null || !(Hp > 0)) return null;
  return { curv: (H1 - (H0 + H2) / 2) / Hp, slope: (H2 - H0) / Hp, H: [H0, H1, H2], Hp, nU, nTok };
}
/** atlas-style cell of entCurv for a view (or any pure function fn(P) -> number|null): {v, nullMean, nullSd, z, n} + N, V, U. seedId/which default to the atlas seeds. */
export function cell(view, { draws = 10, seedId = view.id, which = view.which, fn = (P) => posStats(P).entCurv, P = null } = {}) {
  P = P || prep(view);
  if (P.N < 2000 || P.V < 30) return null;
  const v = fn(P), nulls = [];
  for (let k = 0; k < draws; k++) nulls.push(fn(shuffledP(P, seedOf(seedId, which, "order", "within-unit", k))));
  const xs = nulls.filter((x) => Number.isFinite(x)), { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length, N: P.N, V: P.V, U: P.U };
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
/** weaker detection: both halves |z| >= 2 with the same sign (reported separately from the registered PRESENT rule) */
export const weakSign = (a, b) => (a && b && a.z != null && b.z != null && Math.abs(a.z) >= 2 && Math.abs(b.z) >= 2 && a.z * b.z > 0 ? (a.z > 0 ? "+" : "-") : null);
/** Spearman / Pearson helpers */
export const rank = (a) => { const ix = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < ix.length) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k][1]] = m; i = j + 1; } return r; };
export const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
export const median = (a) => { const s = a.filter((x) => Number.isFinite(x)).sort((p, q) => p - q), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
