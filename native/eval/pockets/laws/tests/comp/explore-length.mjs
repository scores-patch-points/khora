// exploration: pl-length divSlope z = -4.9 / -4.8 in both halves. Is the within-unit null biased there? 60 null draws vs the observed value, both halves.
import { load } from "../../../loaders/planted.mjs";
import { halves, nullView, seedOf } from "../../../lib/pocket.mjs";
import * as fam from "../../comp.mjs";
const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length, sd = (a) => Math.sqrt(a.reduce((p, q) => p + (q - mean(a)) ** 2, 0) / (a.length - 1));
const [p] = await load(["pl-length"]), H = halves(p);
for (const which of ["discover", "confirm"]) {
  const v = H[which], obs = fam.compute(v).divSlope, d = []; for (let k = 0; k < 60; k++) d.push(fam.compute(nullView(v, "within-unit", seedOf("len60", which, k))).divSlope);
  const m = mean(d), s = sd(d); d.sort((a, b) => a - b);
  console.log(which, "obs", obs.toFixed(4), "null mean", m.toFixed(4), "sd", s.toFixed(4), "z", ((obs - m) / s).toFixed(2), "| null min/median/max", d[0].toFixed(4), d[30].toFixed(4), d[59].toFixed(4), "| obs rank among nulls", d.filter((x) => x < obs).length);
}
