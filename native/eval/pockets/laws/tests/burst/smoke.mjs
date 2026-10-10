import { load } from "../../../loaders/planted.mjs";
import { compute, STATS } from "../../burst.mjs";
const ids = process.argv.slice(2);
for (const p of await load(ids)) {
  const cut = Math.min(p.units.length, p.docOf.findIndex((d) => d >= 50)); // first 50 docs ~ 50k tokens
  const view = { id: "x", which: "discover", units: p.units.slice(0, cut), docOf: p.docOf.slice(0, cut) };
  const c0 = process.cpuUsage(), t0 = Date.now(); const r = compute(view); const c1 = process.cpuUsage(c0);
  console.log(p.id, "tokens", view.units.reduce((n, u) => n + u.length, 0), "cpu_s", ((c1.user + c1.system) / 1e6).toFixed(3), "wall_s", ((Date.now() - t0) / 1000).toFixed(2));
  console.log(JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v === null ? null : +v.toFixed(4)]))));
}
