// exploration: why is z(initEnt) over-dispersed on iid worlds? compare the spread of null draws with the spread of observed values across replicate worlds, per world kind.
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import { prep } from "../../_comp_prep.mjs";
import { edgeStats } from "../../_comp_pairs.mjs";
import { iidWorld } from "./_t_worlds.mjs";
const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length, sd = (a) => Math.sqrt(a.reduce((p, q) => p + (q - mean(a)) ** 2, 0) / (a.length - 1));
for (const kind of [{ len: "D1", alpha: 1.0 }, { len: "D2", alpha: 1.3 }, { len: "D1", alpha: 1.3 }, { len: "D2", alpha: 1.0 }]) {
  const obs = [], nsd = [], dev = [];
  for (let r = 0; r < 24; r++) {
    const w = iidWorld(`ie${r}`, 50000, kind), o = edgeStats(prep(w)).initEnt, d = [];
    for (let k = 0; k < 40; k++) d.push(edgeStats(prep(nullView(w, "within-unit", seedOf("ie", r, k)))).initEnt);
    obs.push(o); nsd.push(sd(d)); dev.push((o - mean(d)) / sd(d));
  }
  console.log(JSON.stringify(kind), "obs sd across worlds", sd(obs).toFixed(4), "| mean within-world null sd", mean(nsd).toFixed(4), "| z sd (40 draws)", sd(dev).toFixed(2));
}
