// lib.mjs -- shared helpers of the ATTACK on order.entSlope (new file; imports the repo's own prep / posStats / halves / nullView, edits nothing).
// entSlope depends only on the within-view rank-bin of every token and on the token order inside units. cell() = the atlas cell: prep(view) (laws/_order_prep.mjs) gives bins, laws/_order_pos.mjs posStats()
// gives entSlope; the 10 within-unit null draws shuffle an index permutation per unit with EXACTLY the rng consumption of lib/pocket.mjs nullView (so for an unmodified view the draws are the atlas draws).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_order_prep.mjs";
import { posStats } from "../../laws/_order_pos.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep, posStats };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCR = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad";
export const CACHE = path.join(SCR, "cache-es");
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const TABLE = () => JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8"));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const meanLen = (units) => tokensOf(units) / Math.max(1, units.length);
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };

/** shuffled copy of the prepared view P: per unit, Fisher-Yates over positions with the rng of nullView (same call order), applied to xs and bs together. */
export function shuffledP(P, seed) {
  const rnd = rngOf(seed), xs = new Float64Array(P.N), bs = new Uint8Array(P.N), idx = [];
  for (let u = 0; u < P.U; u++) {
    const a = P.unitStart[u], L = P.unitStart[u + 1] - a;
    idx.length = L; for (let i = 0; i < L; i++) idx[i] = i;
    for (let i = L - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    for (let i = 0; i < L; i++) { xs[a + i] = P.xs[a + idx[i]]; bs[a + i] = P.bs[a + idx[i]]; }
  }
  return { ...P, xs, bs };
}
/** atlas-style cell of one statistic of posStats for a view: {v, nullMean, nullSd, z, n, all (all pos stats observed)}. seedId/which default to view.id/view.which (the atlas seeds). */
export function cell(view, { draws = 10, seedId = view.id, which = view.which, stats = ["entSlope"], P = null } = {}) {
  P = P || prep(view);
  if (P.N < 2000 || P.V < 30) return null;
  const obs = posStats(P), nulls = [];
  for (let k = 0; k < draws; k++) nulls.push(posStats(shuffledP(P, seedOf(seedId, which, "order", "within-unit", k))));
  const out = { N: P.N, V: P.V, U: P.U, all: obs };
  for (const s of stats) {
    const xs = nulls.map((d) => d[s]).filter((x) => Number.isFinite(x)), v = obs[s];
    const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
    out[s] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
  }
  return out;
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
/** both-halves cell of a pocket-like {id, units, docOf}; returns {D, C, status, v (mean of halves), mz} for stat s */
export function pocketCell(p, s = "entSlope", opts = {}) {
  const H = p.halvesOverride || halves(p), D = cell(H.discover, { ...opts, stats: [s] }), C = cell(H.confirm, { ...opts, stats: [s] });
  if (!D || !C) return null;
  return { D: D[s], C: C[s], status: statusOf(D[s], C[s]), v: D[s].v != null && C[s].v != null ? (D[s].v + C[s].v) / 2 : null, N: [D.N, C.N], V: [D.V, C.V], allD: D.all, allC: C.all };
}
/** Spearman / Pearson helpers */
export const rank = (a) => { const ix = a.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); let i = 0; while (i < ix.length) { let j = i; while (j + 1 < ix.length && ix[j + 1][0] === ix[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ix[k][1]] = m; i = j + 1; } return r; };
export const pearson = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxy / Math.sqrt(sxx * syy); };
export const spearman = (x, y) => pearson(rank(x), rank(y));
