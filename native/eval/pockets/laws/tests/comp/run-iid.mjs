// law-free calibration of the comp family: R replicate iid Zipf worlds (no structure of any kind; alternating the planted settings D1/alpha 1.0 and D2/alpha 1.3, 50k tokens each), atlas-identical z.
// For each statistic: mean and sd of z over replicates (a calibrated z has mean 0, sd ~1.13 for a 10-draw t(9)), share |z| >= 4 and >= 2, v - nullMean mean (bias of the null mean), and the share of null cells.
import { iidWorld } from "./_t_worlds.mjs";
import * as fam from "../../comp.mjs";
import { atlasCells, round } from "./_t_util.mjs";
const R = Number(process.argv[2] ?? 40), rows = [];
for (let r = 0; r < R; r++) {
  const kind = r % 2 ? { len: "D2", alpha: 1.3, types: 5000 } : { len: "D1", alpha: 1.0, types: 5000 };
  rows.push({ rep: r, kind: kind.len, cells: atlasCells(iidWorld(`rep${r}`, 50000, kind), 10, "iid-test") });
  console.error("rep", r);
}
const out = { R, note: "iid replicates; z from 10 null draws per kind", perStat: {} };
for (const s of fam.STATS) {
  const z = rows.map((x) => x.cells[s.id].z).filter((x) => x != null), v = rows.map((x) => x.cells[s.id].v).filter((x) => x != null), d = rows.map((x) => (x.cells[s.id].v != null && x.cells[s.id].nullMean != null ? x.cells[s.id].v - x.cells[s.id].nullMean : null)).filter((x) => x != null);
  const mean = (a) => a.reduce((p, q) => p + q, 0) / a.length, sd = (a) => Math.sqrt(a.reduce((p, q) => p + (q - mean(a)) ** 2, 0) / (a.length - 1));
  out.perStat[s.id] = { null: s.null, definedCells: z.length, nullZ: rows.length - z.length, zMean: round(mean(z), 3), zSd: round(sd(z), 3), share4: round(z.filter((x) => Math.abs(x) >= 4).length / z.length, 4), share2: round(z.filter((x) => Math.abs(x) >= 2).length / z.length, 4), zMax: round(Math.max(...z.map(Math.abs)), 2), vMean: round(mean(v), 5), vSd: round(sd(v), 5), nullMeanBias: round(mean(d), 6) };
}
console.log(JSON.stringify(out, null, 1));
