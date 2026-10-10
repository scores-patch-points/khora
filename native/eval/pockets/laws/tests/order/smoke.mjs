import { load as lp } from "../../../loaders/planted.mjs";
import { halves, nullView, seedOf } from "../../../lib/pocket.mjs";
import { compute, STATS } from "../../order.mjs";
const ids = process.argv.slice(2);
for (const p of await lp(ids)) {
  const H = halves(p).discover;
  const c0 = process.cpuUsage(); const r = compute(H); const c = process.cpuUsage(c0);
  const n = compute(nullView(H, "within-unit", seedOf("smoke", 1)));
  console.log(p.id, "cpu", ((c.user + c.system) / 1e6).toFixed(3));
  for (const s of STATS) console.log(" ", s.id.padEnd(10), String(r[s.id] == null ? null : +r[s.id].toFixed(4)).padStart(9), "null1", String(n[s.id] == null ? null : +n[s.id].toFixed(4)).padStart(9));
}
