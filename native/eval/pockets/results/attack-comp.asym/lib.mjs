// lib.mjs -- shared helpers of the ATTACK on comp.asym (new file; imports the repo's own prep/asymStat/halves/nullView, edits nothing).
// comp.asym = asymStat(prep(view)).eq : mean over the 20 commonest types (>= 40 interior occurrences) of (H_R - H_L)/(H_R + H_L), Miller-Madow entropy of the rank bin of the right / left neighbour.
// cell() reproduces the atlas cell (v, nullMean, nullSd, z; 10 within-unit shuffles with the atlas seeds seedOf(id, which, "comp", "within-unit", k)); check-atlas.mjs verifies this bit for bit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { halves, nullView, seedOf, rngOf, sha256 } from "../../lib/pocket.mjs";
import { prep, entropy, entropyMM, NB } from "../../laws/_comp_prep.mjs";
import { asymStat } from "../../laws/_comp_neigh.mjs";
export { halves, nullView, seedOf, rngOf, sha256, prep, asymStat, entropy, entropyMM, NB };
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CACHE = "/private/tmp/claude-501/-Users-mlacy-Library-Application-Support-Claude-scratch-workspaces-4bf59fed-b26b-4f7d-a90f-11d28a16ba25-1a7b49f0-7962-48a4-8bfc-8a3bc2e27d2d-scratch-2026-10-05-fe56a5/d30d63fe-3592-46d4-90e3-d18dc306abd3/scratchpad/cache-dl";
export const loadCached = (id) => JSON.parse(fs.readFileSync(path.join(CACHE, `${id}.json`), "utf8"));
export const TABLE = () => JSON.parse(fs.readFileSync(path.join(HERE, "table.json"), "utf8")).rows;
export const f = (x, d = 3) => (x == null || !Number.isFinite(x) ? "NA" : Number(x).toFixed(d));
export const tokensOf = (units) => units.reduce((n, u) => n + u.length, 0);
export const meanLen = (units) => tokensOf(units) / Math.max(1, units.length);
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };

/** observed asym of a view with the repo's own functions */
export const asymOf = (view) => asymStat(prep(view)).eq;
/** the atlas cell for comp.asym of a view: v, nullMean, nullSd, z (10 within-unit draws by default, atlas seeds). fn = alternative statistic (view -> number|null), default the repo's asym. */
export function cell(view, draws = 10, seedId = view.id, which = view.which, fn = asymOf) {
  const v = fn(view), xs = [];
  for (let k = 0; k < draws; k++) {
    const nv = nullView(view, "within-unit", seedOf(seedId, which, "comp", "within-unit", k));
    const x = fn(nv); if (Number.isFinite(x)) xs.push(x);
  }
  const { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
  return { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, n: xs.length };
}
/** protocol status of two half cells: P+ / P- (|z| >= 4 both halves, same sign), A (|z| < 2 both), M otherwise, undef when a z is missing */
export const statusOf = (a, b) => {
  if (!a || !b || a.z == null || b.z == null) return "undef";
  if (Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && a.z * b.z > 0) return a.z > 0 ? "P+" : "P-";
  if (Math.abs(a.z) < 2 && Math.abs(b.z) < 2) return "A";
  return "M";
};
export const hashOrder = (n, tag) => { const k = Array.from({ length: n }, (_, i) => [sha256(`${tag}:${i}`), i]); k.sort((a, b) => (a[0] < b[0] ? -1 : 1)); return k.map((x) => x[1]); };
export const typeCounts = (units) => { const c = new Map(); for (const u of units) for (const w of u) c.set(w, (c.get(w) || 0) + 1); return c; };
export const dropTypes = (units, drop) => units.map((u) => u.filter((w) => !drop.has(w))).filter((u) => u.length);
