// lib.mjs -- shared helpers of the attack on fig.introRight (new file; imports the repo's own fig prep/intro code, edits nothing).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep } from "../../laws/_fig_prep.mjs";
import { intro } from "../../laws/_fig_adj.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad/cache";
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
/** {introRight, introLeft, introLeftFq} of a view -- exactly the atlas statistic code (laws/_fig_adj.mjs) */
export const introOf = (view) => { const o = intro(prep(view)); return o; };
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** v, nullMean, nullSd, z of a statistic key over `draws` within-unit shuffles; seeds are the atlas seeds seedOf(pocketId, which, "fig", "within-unit", k) unless seedTag overrides the pocket id */
export function cellOf(view, key, draws = 10, seedId = view.id, which = view.which) {
  const v = introOf(view)[key], xs = [];
  for (let k = 0; k < draws; k++) { const x = introOf(nullView(view, "within-unit", seedOf(seedId, which, "fig", "within-unit", k)))[key]; if (Number.isFinite(x)) xs.push(x); }
  const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const f = (x, d = 3) => (x == null ? "NA" : Number(x).toFixed(d));
