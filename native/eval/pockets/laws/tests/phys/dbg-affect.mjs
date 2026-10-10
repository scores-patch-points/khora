import { atlasCells } from "./_t_util.mjs";
import { iidReplicate } from "./_t_worlds.mjs";
const zs = [];
for (let r = 0; r < 20; r++) { const v = iidReplicate(`iid-rep${r}`, 50, r); const c = atlasCells(v, 10).affect; zs.push(c.z); }
const m = zs.reduce((a, b) => a + b, 0) / zs.length; console.log("affect z over 20 iid reps: mean", m.toFixed(2), "sd", Math.sqrt(zs.reduce((a, b) => a + (b - m) ** 2, 0) / 19).toFixed(2), zs.map((z) => z.toFixed(1)).join(" "));
