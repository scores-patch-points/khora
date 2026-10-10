// table.mjs -- ATTACK on order.entCurv: flatten results/atlas-matrix.json into a pocket table (new file; reads only).
//   node table.mjs  -> table.json  { stats:[81 ids], rows:[{id,kind,group,register,language,script,grain,tokens,units,docs,mul,status, v:{stat:pocket v (mean of halves)}, mz, zs:{stat:[zD,zC]}, vs:{stat:[vD,vC]}, st:{stat:status}}] }
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)), R = path.resolve(HERE, "..");
const m = JSON.parse(fs.readFileSync(path.join(R, "atlas-matrix.json"), "utf8"));
const rows = [];
for (const p of m.pockets) {
  const v = {}, mz = {}, zs = {}, vs = {}, st = {};
  m.statistics.forEach((s, i) => {
    const c = p.cells[i];
    if (!c) return;
    const [vD, zD, vC, zC, status] = c;
    vs[s] = [vD, vC]; zs[s] = [zD, zC]; st[s] = status;
    if (vD != null && vC != null) v[s] = (vD + vC) / 2;
    if (zD != null && zC != null) mz[s] = Math.min(Math.abs(zD), Math.abs(zC));
  });
  rows.push({ id: p.id, kind: p.kind, group: p.group, register: p.register, language: p.language, script: p.script, grain: p.grain, tokens: p.tokens, units: p.units, docs: p.docs, mul: p.meanUnitLength, thin: p.thin, status: st["order.entCurv"], v, mz, zs, vs, st });
}
fs.writeFileSync(path.join(HERE, "table.json"), JSON.stringify({ stats: m.statistics, rows }));
const real = rows.filter((r) => r.kind === "real");
const c = {}; for (const r of real) c[r.status] = (c[r.status] || 0) + 1;
console.log("rows", rows.length, "real", real.length, "entCurv status counts (real):", JSON.stringify(c));
