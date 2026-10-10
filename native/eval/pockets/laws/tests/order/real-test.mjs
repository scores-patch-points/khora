// real-test.mjs — the "order" family exactly as run-atlas.mjs runs it (both halves, 10 within-unit null draws, same seeds) on real pockets, optionally capped to <= CAP tokens per half (whole documents).
//   node real-test.mjs out.json CAP id1 id2 ...      (ids are routed to their loader by prefix)
import fs from "node:fs";
import { halves, nullView, seedOf, tokenCount } from "../../../lib/pocket.mjs";
import * as fam from "../../order.mjs";
const LOADER = { bk: "books", ud: "ud", ml: "ml", oc: "organic", cd: "codemisc", fm: "formal", pl: "planted" };
const [out, capArg, ...ids] = process.argv.slice(2), CAP = Number(capArg);
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const cap = (v, n) => { let t = 0, e = v.units.length; for (let i = 0; i < v.units.length; i++) { t += v.units[i].length; if (t >= n && v.docOf[i + 1] !== v.docOf[i]) { e = i + 1; break; } } return { ...v, units: v.units.slice(0, e), docOf: v.docOf.slice(0, e) }; };
const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
for (const id of ids) {
  if (res[id]) continue;
  const { load } = await import(`../../../loaders/${LOADER[id.split("-")[0]]}.mjs`);
  const ps = await load([id]); if (!ps.length) { res[id] = { error: "not found" }; continue; }
  const p = ps[0], H = halves(p); res[id] = { tokens: tokenCount(p.units), units: p.units.length, meanUnitLen: +(tokenCount(p.units) / p.units.length).toFixed(2), cpuSec: {}, halves: {} };
  for (const which of ["discover", "confirm"]) {
    const view = cap(H[which], CAP), c0 = process.cpuUsage(), obs = fam.compute(view), c = process.cpuUsage(c0);
    res[id].cpuSec[which] = +((c.user + c.system) / 1e6).toFixed(3); res[id].halves[which] = { tokens: tokenCount(view.units) };
    const draws = []; for (let k = 0; k < 10; k++) draws.push(fam.compute(nullView(view, "within-unit", seedOf(p.id, which, fam.FAMILY, "within-unit", k))));
    for (const s of fam.STATS) {
      const xs = draws.map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id], { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
      res[id].halves[which][s.id] = { v: Number.isFinite(v) ? +v.toFixed(5) : null, nullMean: Number.isFinite(m) ? +m.toFixed(5) : null, nullSd: Number.isFinite(sd) ? +sd.toFixed(5) : null, z: Number.isFinite(v) && sd > 0 ? +((v - m) / sd).toFixed(2) : null };
    }
  }
  fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.error(id, "done", JSON.stringify(res[id].cpuSec));
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
