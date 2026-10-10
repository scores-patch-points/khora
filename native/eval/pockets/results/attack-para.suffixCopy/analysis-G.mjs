// analysis-G.mjs -- per-register narrowing table: P+ counts under the atlas null (10 and 20 draws) and under the within-document / length-class / both nulls, over ALL real pockets of the register.
import { dirJson, statusOf, atlasRows, writeJson, median } from "./common.mjs";
const R = dirJson("out/real"), A = atlasRows(), KINDS = ["unit-order", "within-doc", "len", "doc-len"];
const regs = {}; for (const id of Object.keys(R)) { const rg = R[id].meta.register; (regs[rg] ||= []).push(id); }
const rows = [];
for (const [rg, ids] of Object.entries(regs)) {
  const row = { register: rg, n: ids.length, atlas10: ids.filter((id) => A[id]?.status === "P+").length };
  for (const k of KINDS) row[k] = ids.filter((id) => statusOf(R[id].halves.discover[k].suffixCopy, R[id].halves.confirm[k].suffixCopy) === "P+").length;
  row.medianRatioWithinDoc = +median(ids.map((id) => { const d = R[id].halves.discover["within-doc"]._meta, c = R[id].halves.confirm["within-doc"]._meta; return (d.S2 + c.S2) / Math.max(1e-9, d.nullS2Mean + c.nullS2Mean); })).toFixed(2);
  row.medianRatioGlobal = +median(ids.map((id) => { const d = R[id].halves.discover["unit-order"]._meta, c = R[id].halves.confirm["unit-order"]._meta; return (d.S2 + c.S2) / Math.max(1e-9, d.nullS2Mean + c.nullS2Mean); })).toFixed(2);
  rows.push(row);
}
rows.sort((a, b) => b.n - a.n); writeJson("out/analysis-G.json", rows);
console.log("register".padEnd(14), "n".padStart(3), "atlas10".padStart(8), "unit-ord".padStart(9), "within-doc".padStart(11), "len".padStart(5), "doc-len".padStart(8), " medRatio(global) medRatio(within-doc)");
for (const r of rows.filter((x) => x.n >= 4)) console.log(r.register.padEnd(14), String(r.n).padStart(3), String(r.atlas10).padStart(8), String(r["unit-order"]).padStart(9), String(r["within-doc"]).padStart(11), String(r.len).padStart(5), String(r["doc-len"]).padStart(8), "   ", r.medianRatioGlobal, "  ", r.medianRatioWithinDoc);
