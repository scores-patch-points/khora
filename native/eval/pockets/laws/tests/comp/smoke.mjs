// smoke: compute on planted slices (<= 50k tokens), print raw values, timing, and the MI profile. node smoke.mjs [pocketId ...]
import { load } from "../../../loaders/planted.mjs";
import * as fam from "../../comp.mjs";
import { half, cpuMs, round, tokensOf } from "./_t_util.mjs";
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["pl-null", "pl-markov", "pl-frames"];
for (const p of await load(ids)) {
  const v = half(p, "discover", 50000), t = cpuMs(() => fam.compute(v));
  console.log(p.id, tokensOf(v), "tokens", round(t.cpu, 1), "ms cpu", JSON.stringify(Object.fromEntries(Object.entries(t.r).map(([k, x]) => [k, round(x, 4)]))));
  const m = fam.miProfile(v); console.log("   MI", m.MI.map((x) => round(x, 4)).join(" "), "| N", m.N.join(" "));
}
