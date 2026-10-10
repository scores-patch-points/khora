import { load } from "../../../loaders/planted.mjs";
import { halves } from "../../../lib/pocket.mjs";
import * as para from "../../para.mjs";
const ids = process.argv.slice(2);
for (const p of await load(ids)) {
  const H = halves(p).discover; const t0 = process.cpuUsage(); const r = para.compute(H); const c = process.cpuUsage(t0);
  console.log(p.id, "tokens", H.units.reduce((a, u) => a + u.length, 0), "units", H.units.length, "cpu s", ((c.user + c.system) / 1e6).toFixed(3));
  console.log(JSON.stringify(r));
}
