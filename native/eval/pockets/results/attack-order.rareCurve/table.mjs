// table.mjs -- flatten atlas-matrix.json into table.json: one row per real non-thin pocket with every statistic's two half values and the rareCurve cell. node table.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE } from "./lib.mjs";
const m = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas-matrix.json"), "utf8"));
const S = m.statistics, ri = S.indexOf("order.rareCurve");
const rows = [];
for (const p of m.pockets) {
  if (p.kind !== "real" || p.thin) continue;
  const c = p.cells[ri];
  const vs = {}, zs = {};
  S.forEach((s, i) => { const x = p.cells[i]; if (x && x[0] != null && x[2] != null) { vs[s] = (x[0] + x[2]) / 2; zs[s] = x[1] != null && x[3] != null ? [x[1], x[3]] : null; } });
  rows.push({ id: p.id, group: p.group, register: p.register, language: p.language, script: p.script, grain: p.grain, tokens: p.tokens, units: p.units, docs: p.docs, mul: p.meanUnitLength,
    vD: c[0], zD: c[1], vC: c[2], zC: c[3], status: c[4], v: c[0] != null && c[2] != null ? (c[0] + c[2]) / 2 : null, V: vs, Z: zs });
}
fs.writeFileSync(path.join(HERE, "table.json"), JSON.stringify({ stats: S, rows }));
const cnt = {}; for (const r of rows) cnt[r.status] = (cnt[r.status] || 0) + 1;
console.log(rows.length, JSON.stringify(cnt));
