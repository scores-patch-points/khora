// tests/fig/_t_util.mjs — shared helpers of the "fig" family tests. Deterministic: seeds come from lib/pocket.mjs; no Math.random, no Date.
import { performance } from "node:perf_hooks";
import { halves, nullView, seedOf, rngOf, tokenCount } from "../../../lib/pocket.mjs";
import { FAMILY, STATS, compute } from "../../fig.mjs";

/** first whole documents of a view up to maxTokens (documents are never cut) */
export function sliceView(view, maxTokens) {
  const units = [], docOf = []; let n = 0;
  for (let k = 0; k < view.units.length; k++) {
    if (k && view.docOf[k] !== view.docOf[k - 1] && n >= maxTokens) break;
    if (n + view.units[k].length > maxTokens * 1.3) break;
    units.push(view.units[k]); docOf.push(view.docOf[k]); n += view.units[k].length;
  }
  return { ...view, units, docOf };
}
export const kinds = () => [...new Set(STATS.map((s) => s.null))];
/** observed + `draws` null draws per null kind -> {stat: {v, nullMean, nullSd, z, n}} and timing (ms per compute call) */
export function observeWithNull(view, draws = 10, tag = "t") {
  const t0 = performance.now(), obs = compute(view), tObs = performance.now() - t0, dr = {};
  for (const kind of kinds()) { dr[kind] = []; for (let k = 0; k < draws; k++) dr[kind].push(compute(nullView(view, kind, seedOf(view.id, view.which, FAMILY, kind, k, tag)))); }
  const out = {};
  for (const s of STATS) {
    const xs = dr[s.null].map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id];
    const m = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN, sd = xs.length > 2 ? Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)) : NaN;
    out[s.id] = { v, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
  }
  return { stats: out, ms: Math.round(tObs), tokens: tokenCount(view.units), units: view.units.length };
}
export const r4 = (x) => (x == null ? null : Math.round(x * 1e4) / 1e4);
export const flat = (res) => Object.fromEntries(Object.entries(res.stats).map(([k, o]) => [k, { v: r4(o.v), nm: r4(o.nullMean), sd: r4(o.nullSd), z: o.z == null ? null : Math.round(o.z * 10) / 10 }]));
export { halves, rngOf, seedOf, tokenCount };
