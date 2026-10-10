// planted-test.mjs — runs the "order" family exactly as run-atlas.mjs does (both halves, 10 within-unit null draws, same seeds) on the planted pockets. node planted-test.mjs out.json [ids...]
import fs from "node:fs";
import { load as lp } from "../../../loaders/planted.mjs";
import { halves, nullView, seedOf, tokenCount } from "../../../lib/pocket.mjs";
import * as fam from "../../order.mjs";
const [out, ...ids] = process.argv.slice(2);
const stat = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b, 0) / n; return { m, sd: Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, n - 1)) }; };
const res = {};
for (const p of await lp(ids.length ? ids : null)) {
  const H = halves(p); res[p.id] = { tokens: tokenCount(p.units), cpuSec: {}, halves: {} };
  for (const which of ["discover", "confirm"]) {
    const view = H[which], c0 = process.cpuUsage(), obs = fam.compute(view), c = process.cpuUsage(c0);
    res[p.id].cpuSec[which] = +((c.user + c.system) / 1e6).toFixed(3);
    const draws = []; for (let k = 0; k < 10; k++) draws.push(fam.compute(nullView(view, "within-unit", seedOf(p.id, which, fam.FAMILY, "within-unit", k))));
    res[p.id].halves[which] = {};
    for (const s of fam.STATS) {
      const xs = draws.map((d) => d[s.id]).filter((x) => Number.isFinite(x)), v = obs[s.id], { m, sd } = xs.length >= 3 ? stat(xs) : { m: NaN, sd: NaN };
      res[p.id].halves[which][s.id] = { v: Number.isFinite(v) ? +v.toFixed(5) : null, nullMean: Number.isFinite(m) ? +m.toFixed(5) : null, nullSd: Number.isFinite(sd) ? +sd.toFixed(5) : null, z: Number.isFinite(v) && sd > 0 ? +((v - m) / sd).toFixed(2) : null, n: xs.length };
    }
  }
  console.error(p.id, "done");
}
fs.writeFileSync(out, JSON.stringify(res, null, 1));
