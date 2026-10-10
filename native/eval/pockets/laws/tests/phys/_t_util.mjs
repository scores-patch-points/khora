// laws/tests/phys/_t_util.mjs — helpers of the phys test: atlas-identical z computation for the phys family; slicing/real-text/CPU timing helpers are reused from tests/freq/_t_util.mjs.
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import * as fam from "../../phys.mjs";
export { capView, discoverCap, bookView, tokensOf, round, cpuMs, regroup, mapChars } from "../freq/_t_util.mjs";

const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
/** exactly what run-atlas.mjs does for one half: observed value, `draws` null draws per null kind, z = (v - nullMean) / nullSd (null when sd = 0) */
export function atlasCells(view, draws = 10, tag = "phys-test") {
  const obs = fam.compute(view), kinds = [...new Set(fam.STATS.map((s) => s.null))], dr = {}, cell = {};
  for (const kind of kinds) { dr[kind] = []; for (let k = 0; k < draws; k++) dr[kind].push(fam.compute(nullView(view, kind, seedOf(tag, view.id, view.which, fam.FAMILY, kind, k)))); }
  for (const s of fam.STATS) {
    const xs = dr[s.null].map((d) => d[s.id]).filter(Number.isFinite), v = obs[s.id], { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
    cell[s.id] = { v: Number.isFinite(v) ? v : null, nullMean: Number.isFinite(m) ? m : null, nullSd: Number.isFinite(sd) ? sd : null, z: Number.isFinite(v) && sd > 0 ? (v - m) / sd : null, nNull: xs.length };
  }
  return cell;
}
