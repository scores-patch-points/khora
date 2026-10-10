import { nullView, seedOf } from "../../../lib/pocket.mjs";
import { iidReplicate } from "./_t_worlds.mjs";
import { prep } from "../../_phys_prep.mjs";
import { affectStats } from "../../_phys_affect.mjs";
const REPS = 120, zs = [], vs = [], ms = [];
for (let r = 100; r < 100 + REPS; r++) {
  const v = iidReplicate(`iid-rep${r}`, 50, r), obs = affectStats(prep(v)).affect, xs = [];
  for (let k = 0; k < 10; k++) xs.push(affectStats(prep(nullView(v, "within-unit", seedOf("dbg", r, k)))).affect);
  const m = xs.reduce((a, b) => a + b, 0) / 10, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / 9);
  zs.push((obs - m) / sd); vs.push(obs); ms.push(m);
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
console.log("affect, 120 fresh iid worlds: mean z", mean(zs).toFixed(3), "sd z", sd(zs).toFixed(3), "share z>=4", zs.filter((z) => z >= 4).length, "share |z|>=2", zs.filter((z) => Math.abs(z) >= 2).length, "mean v - mean null", (mean(vs) - mean(ms)).toFixed(5), "sd v", sd(vs).toFixed(5));
