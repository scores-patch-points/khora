// calib-iid: replicate law-free (iid-token) worlds and count how often |z| >= 4 / 3 / 2 for each para statistic (10 null draws per kind, as in the atlas). Usage: node calib-iid.mjs <reps>
import fs from "node:fs";
import { evalView } from "./_t_util.mjs";
import { lengthWorld } from "./_t_worlds.mjs";
import * as para from "../../para.mjs";
const reps = Number(process.argv[2] || 20), cfgs = [["a10", {}], ["rho07", { rho: 0.7 }], ["a13", { alpha: 1.3, mu: Math.log(14), sigma: 0.8 }], ["m4", { mu: Math.log(4), sigma: 0.4 }]];
const byCfg = {}, cells = {}; for (const s of para.STATS) cells[s.id] = { n: 0, nullZ: 0, ge4: 0, ge3: 0, ge2: 0, zs: [] };
for (const [name, cfg] of cfgs) for (let k = 0; k < reps; k++) {
  const w = lengthWorld({ tag: `calib-${name}-${k}`, ...cfg }), r = evalView(w, w.id);
  for (const s of para.STATS) { const c = r.stats[s.id], t = cells[s.id]; if (c.z === null) { t.nullZ++; continue; } t.n++; t.zs.push(c.z); ((byCfg[s.id] ||= {})[name] ||= []).push(c.z); const a = Math.abs(c.z); if (a >= 4) t.ge4++; if (a >= 3) t.ge3++; if (a >= 2) t.ge2++; }
  console.error(name, k, "done");
}
const out = {}; for (const [id, t] of Object.entries(cells)) { const m = t.zs.reduce((a, b) => a + b, 0) / t.n, sd = Math.sqrt(t.zs.reduce((a, b) => a + (b - m) ** 2, 0) / (t.n - 1)); out[id] = { cells: t.n + t.nullZ, definedZ: t.n, nullZ: t.nullZ, ge4: t.ge4, ge3: t.ge3, ge2: t.ge2, meanZ: +m.toFixed(2), sdZ: +sd.toFixed(2), maxAbsZ: +Math.max(...t.zs.map(Math.abs)).toFixed(1) }; }
const perCfg = {}; for (const [id, o] of Object.entries(byCfg)) { perCfg[id] = {}; for (const [n, zs] of Object.entries(o)) perCfg[id][n] = +(zs.reduce((a, b) => a + b, 0) / zs.length).toFixed(2); }
fs.writeFileSync(new URL(`./calib-iid${process.argv[3] || ""}.json`, import.meta.url), JSON.stringify({ reps, configs: cfgs.map((c) => c[0]), out, meanZPerConfig: perCfg }, null, 1));
console.log(JSON.stringify(out));
