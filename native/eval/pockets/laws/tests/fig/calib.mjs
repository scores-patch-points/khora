// tests/fig/calib.mjs — calibration on replicate iid worlds (no structure): distribution of z per statistic.  node calib.mjs [reps=30] [tokens=30000]
// Worlds: iid Zipf(1.0)/5000 types, unit lengths (a) fixed 6, (b) fixed 12, (c) lognormal median 9 sigma 0.55 on 2..45 (the planted D1). Each replicate has its own seed; 10 null draws per null kind.
import fs from "node:fs";
import { observeWithNull } from "./_t_util.mjs";
import { rngOf, seedOf } from "../../../lib/pocket.mjs";
import { STATS } from "../../fig.mjs";
const reps = Number(process.argv[2] || 30), N = Number(process.argv[3] || 30000), V = 5000;
const cdf = new Float64Array(V); let S = 0; for (let i = 0; i < V; i++) { S += 1 / (i + 1); cdf[i] = S; }
function world(id, kind) {
  const rnd = rngOf(seedOf("fig-calib", id)), gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const draw = () => { const u = rnd() * S; let lo = 0, hi = V - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] > u) hi = m; else lo = m + 1; } return "w" + lo; };
  const len = kind === "L6" ? () => 6 : kind === "L12" ? () => 12 : () => Math.max(2, Math.min(45, Math.round(Math.exp(Math.log(9) + 0.55 * gauss()))));
  const units = [], docOf = []; let n = 0, d = 0, dn = 0;
  while (n < N) { const L = len(); units.push(Array.from({ length: L }, draw)); docOf.push(d); n += L; dn += L; if (dn >= 1000) { d++; dn = 0; } }
  return { id, which: "calib", units, docOf };
}
const out = {};
for (const kind of ["L6", "L12", "LN"]) {
  const zs = Object.fromEntries(STATS.map((s) => [s.id, []]));
  for (let r = 0; r < reps; r++) { const res = observeWithNull(world(`${kind}-${r}`, kind), 10, "calib"); for (const s of STATS) if (res.stats[s.id].z != null) zs[s.id].push(res.stats[s.id].z); }
  out[kind] = Object.fromEntries(STATS.map((s) => { const a = zs[s.id], n = a.length, m = a.reduce((x, y) => x + y, 0) / n, sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1)); return [s.id, { n, meanZ: +m.toFixed(2), sdZ: +sd.toFixed(2), ge4: a.filter((z) => Math.abs(z) >= 4).length, ge2: a.filter((z) => Math.abs(z) >= 2).length }]; }));
  console.error("done", kind);
}
fs.writeFileSync(new URL("results-calib.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
