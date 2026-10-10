// lib.mjs -- shared helpers of the ADVERSARY ATTACK on order.rareCurve (new file; imports the repo's own prep / halves / nullView / seedOf, edits nothing).
// rareCurve = pooled within-unit correlation of x (= ln mid-rank of the token's type in the view) with the centred quadratic (i/(L-1)-1/2)^2, units >= 3 tokens.
// rcSums() is the loop of laws/_order_pos.mjs posStats() restricted to the rareCurve sums, in the SAME floating-point summation order, so that for an unmodified view
// cell() equals the atlas cell bit for bit (checked by check-atlas.mjs). The 10 within-unit null draws shuffle positions per unit with EXACTLY the rng consumption of lib/pocket.mjs nullView.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCR = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad";
export const CACHE = path.join(SCR, "cache-dl");
export const ATLAS = path.join(HERE, "../atlas");
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const atlasOf = (id) => JSON.parse(fs.readFileSync(path.join(ATLAS, `${id}.json`), "utf8"));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const meanLen = (units) => tokensOf(units) / Math.max(1, units.length);
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
/** rareCurve sums over (xs, unitStart): returns {Sxy, Sxx, Sxq, Sqq, nU, nTok, SxqL, SxqR, Sxx3...} (units >= 3 only). Left/right split: tokens with r < 0 / r > 0 (the middle token of an odd unit has r = 0 and contributes nothing).
 *  The left and right parts add up EXACTLY (in exact arithmetic) to Sxq because the within-unit dx sum to zero; floating-point order differs only in the split variables, never in Sxq. */
export function rcSums(xs, unitStart, U, u0 = 0) {
  let Sxy = 0, Sxx = 0, Srr = 0, Sxq = 0, Sqq = 0, nTok = 0, nU = 0, SxqL = 0, SxqR = 0;
  for (let u = u0; u < U; u++) {
    const a = unitStart[u], L = unitStart[u + 1] - a;
    if (L < 3) continue;
    let xm = 0;
    for (let i = 0; i < L; i++) xm += xs[a + i];
    xm /= L;
    let sr2 = 0, sr4 = 0;
    for (let i = 0; i < L; i++) {
      const r = i / (L - 1) - 0.5, r2 = r * r, dx = xs[a + i] - xm;
      Sxy += dx * r; Sxx += dx * dx; Sxq += dx * r2; sr2 += r2; sr4 += r2 * r2;
      if (r < 0) SxqL += dx * r2; else if (r > 0) SxqR += dx * r2;
    }
    Srr += sr2; Sqq += sr4 - (sr2 * sr2) / L; nTok += L; nU++;
  }
  return { Sxy, Sxx, Srr, Sxq, Sqq, nU, nTok, SxqL, SxqR };
}
export function rcValue(S) {
  if (S.nU < 300 || S.nTok < 2000) return null;
  const eps = 1e-9 * S.nTok;
  return S.Sxx > eps && S.Sqq > eps ? S.Sxq / Math.sqrt(S.Sxx * S.Sqq) : null;
}
/** position-shuffled xs (same rng consumption as nullView within-unit) */
export function shuffledXs(P, seed) {
  const rnd = rngOf(seed), xs = new Float64Array(P.N), idx = [];
  for (let u = 0; u < P.U; u++) {
    const a = P.unitStart[u], L = P.unitStart[u + 1] - a;
    idx.length = L; for (let i = 0; i < L; i++) idx[i] = i;
    for (let i = L - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < L; i++) xs[a + i] = P.xs[a + idx[i]];
  }
  return xs;
}
/** atlas-style rareCurve cell of a view: {v, nullMean, nullSd, z, n, N, V, U}; xsOverride lets a caller change the per-token x (alternative rank definitions). */
export function cell(view, { draws = 10, seedId = view.id, which = view.which, P = null, xsOverride = null } = {}) {
  P = P || prep(view);
  if (P.N < 2000 || P.V < 30) return null;
  const xs0 = xsOverride || P.xs, PP = xsOverride ? { ...P, xs: xsOverride } : P;
  const v = rcValue(rcSums(xs0, P.unitStart, P.U)), ns = [];
  for (let k = 0; k < draws; k++) { const x = rcValue(rcSums(shuffledXs(PP, seedOf(seedId, which, "order", "within-unit", k)), P.unitStart, P.U)); if (Number.isFinite(x)) ns.push(x); }
  const { m, sd } = ns.length >= 3 ? stat(ns) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: ns.length, N: P.N, V: P.V, U: P.U };
}
/** both-halves cell of a pocket-like {id, units, docOf}: {D, C, status, v (mean of halves)} */
export function pocketCell(p, opts = {}) {
  const H = p.halvesOverride || halves(p), D = cell(H.discover, opts), C = cell(H.confirm, opts);
  if (!D || !C) return null;
  return { D, C, status: statusOf(D, C), v: D.v != null && C.v != null ? (D.v + C.v) / 2 : null };
}
export const rank = (a) => { const ix = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < ix.length) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k][1]] = m; i = j + 1; } return r; };
export const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
export const spearman = (x, y) => pearson(rank(x), rank(y));
export const median = (a) => { const s = a.filter(Number.isFinite).sort((p, q) => p - q), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
