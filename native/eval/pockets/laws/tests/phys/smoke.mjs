// smoke test: compute() on a 50k-token slice of two planted worlds, CPU time per call
import { load } from "../../../loaders/planted.mjs";
import { discoverCap, cpuMs, tokensOf, round } from "./_t_util.mjs";
import { compute } from "../../phys.mjs";
const ps = await load(process.argv.slice(2).length ? process.argv.slice(2) : ["pl-null", "pl-burst"]);
for (const p of ps) {
  const v = discoverCap(p, 50000), t = cpuMs(() => compute(v));
  console.log(p.id, tokensOf(v), "tokens", Math.round(t.cpu), "ms cpu", Math.round(t.wall), "ms wall", JSON.stringify(Object.fromEntries(Object.entries(t.r).map(([k, x]) => [k, round(x, 4)]))));
}
