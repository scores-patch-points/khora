// exploration: calibration of the soft rigid share on 40 iid replicates for several softness scales (z from 10 within-unit draws). node explore-soft.mjs
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import { prep } from "../../_comp_prep.mjs";
import { neighbourTypeStats } from "../../_comp_neigh.mjs";
import { iidWorld, collocWorld } from "./_t_worlds.mjs";
import { round } from "./_t_util.mjs";
const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length, sd = (a) => Math.sqrt(a.reduce((p, q) => p + (q - mean(a)) ** 2, 0) / (a.length - 1));
for (const soft of [0.05, 0.1, 0.15, 0.2, 0.3]) {
  const zs = { rigidL: [], rigidR: [] };
  for (let r = 0; r < 30; r++) {
    const w = iidWorld(`rep${r}`, 50000, r % 2 ? { len: "D2", alpha: 1.3 } : { len: "D1", alpha: 1.0 });
    const obs = neighbourTypeStats(prep(w), soft), dr = [];
    for (let k = 0; k < 10; k++) dr.push(neighbourTypeStats(prep(nullView(w, "within-unit", seedOf("soft", r, k))), soft));
    for (const id of ["rigidL", "rigidR"]) { const x = dr.map((d) => d[id]).filter((v) => v != null); if (x.length >= 3 && sd(x) > 0 && obs[id] != null) zs[id].push((obs[id] - mean(x)) / sd(x)); }
  }
  const c = collocWorld("c1", 50000), P = prep(c), o = neighbourTypeStats(P, soft), nn = neighbourTypeStats(prep(nullView(c, "within-unit", 5)), soft);
  console.log("soft", soft, ...["rigidL", "rigidR"].map((id) => `${id}: zSd ${round(sd(zs[id]), 2)} share>=4 ${round(zs[id].filter((x) => Math.abs(x) >= 4).length / zs[id].length, 3)} zMax ${round(Math.max(...zs[id].map(Math.abs)), 1)} n ${zs[id].length}`), "| colloc v", round(o.rigidL, 4), round(o.rigidR, 4), "hard", round(o.hardL, 4), round(o.hardR, 4), "null", round(nn.rigidL, 5), round(nn.rigidR, 5));
}
