import { load } from "../../../loaders/planted.mjs";
import { halves, nullView, seedOf } from "../../../lib/pocket.mjs";
import { capView } from "./_t_util.mjs";
import { prep } from "../../_phys_prep.mjs";
import { affectStats } from "../../_phys_affect.mjs";
const ps = await load(["pl-null2", "pl-null"]);
for (const p of ps) for (const w of ["discover", "confirm"]) {
  const v = capView(halves(p)[w], 50000), obs = affectStats(prep(v)), xs = [];
  for (let k = 0; k < 60; k++) xs.push(affectStats(prep(nullView(v, "within-unit", seedOf("dbg3", p.id, w, k)))).affect);
  const m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
  console.log(p.id, w, "obs", obs.affect.toFixed(5), "null mean(60)", m.toFixed(5), "sd", sd.toFixed(5), "z", ((obs.affect - m) / sd).toFixed(2), "max null", Math.max(...xs).toFixed(5), "units", v.units.length);
}
