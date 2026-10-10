// laws/tests/freq/diag-null.mjs — diagnostic: in law-free iid worlds, is z = (v - nullMean)/nullSd t-like, and what do the null distributions look like with 200 shuffles?  node diag-null.mjs <stat,stat,...> <reps>
import fs from "node:fs";
import { nullView, seedOf } from "../../../lib/pocket.mjs";
import * as fam from "../../freq.mjs";
import { iidWorld } from "./_t_worlds.mjs";
const ids = (process.argv[2] || "recurLen,zipfAlpha,ttr").split(","), R = Number(process.argv[3] || 30), S = 200, out = {};
const mom = (xs) => { const n = xs.length, m = xs.reduce((a, b) => a + b) / n, v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1), k = xs.reduce((a, b) => a + ((b - m) ** 4), 0) / n / (v * v); return { m, sd: Math.sqrt(v), kurt: k }; };
for (const id of ids) out[id] = { z200: [], vVsNullSd: [], kurt: [], z10first: [] };
for (let r = 0; r < R; r++) {
  const w = iidWorld(`diag-r${r}`, 40), obs = fam.compute(w), draws = [];
  for (let k = 0; k < S; k++) draws.push(fam.compute(nullView(w, "token-global", seedOf("diag", r, k))));
  for (const id of ids) { const xs = draws.map((d) => d[id]).filter(Number.isFinite), { m, sd, kurt } = mom(xs), m10 = mom(xs.slice(0, 10)); out[id].z200.push((obs[id] - m) / sd); out[id].kurt.push(kurt); out[id].z10first.push((obs[id] - m10.m) / m10.sd); }
}
const sdOf = (a) => { const m = a.reduce((x, y) => x + y) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const res = {}; for (const id of ids) res[id] = { reps: R, sdZ_with200draws: +sdOf(out[id].z200).toFixed(2), sdZ_with10draws: +sdOf(out[id].z10first).toFixed(2), meanNullKurtosis: +(out[id].kurt.reduce((a, b) => a + b) / R).toFixed(2), maxAbsZ200: +Math.max(...out[id].z200.map(Math.abs)).toFixed(2), maxAbsZ10: +Math.max(...out[id].z10first.map(Math.abs)).toFixed(2) };
fs.writeFileSync(new URL(`./diag-null-${ids.join("_")}.json`, import.meta.url), JSON.stringify(res, null, 1) + "\n"); console.log(JSON.stringify(res, null, 1));
