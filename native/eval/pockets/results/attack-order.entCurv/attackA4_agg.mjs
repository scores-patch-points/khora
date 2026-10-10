// attackA4_agg.mjs -- aggregate A4_raw_*.jsonl (equal size / equal mean unit length, ranks held fixed) and compare with A_raw (ranks re-estimated on the subsample) -> A4_summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, median } from "./lib.mjs";
const read = (pre, n) => Array.from({ length: n }, (_, i) => i).flatMap((i) => fs.readFileSync(path.join(HERE, `${pre}_raw_${i}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
const rows = read("A4", 4), A = new Map(read("A", 4).map((r) => [r.id, r]));
const VN = Object.keys(rows[0].variants), sg = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const out = { n: rows.length, variants: {}, vsReRanked: {} };
const grp = (rs, name) => { const o = { n: rs.length, evaluated: 0, skipped: 0, "P+": 0, "P-": 0, M: 0, A: 0, vs: [], mul: [] };
  for (const r of rs) { const x = r.variants[name]; if (!x || x.skipped) { o.skipped++; continue; } o.evaluated++; o[x.status]++; o.vs.push(x.v); o.mul.push((x.discover.mul + x.confirm.mul) / 2); }
  o.medianV = o.vs.length ? +median(o.vs).toFixed(5) : null; o.sharePos = o.vs.length ? +(o.vs.filter((x) => x > 0).length / o.vs.length).toFixed(3) : null; o.medianMeanUnitLength = o.mul.length ? +median(o.mul).toFixed(1) : null; delete o.vs; delete o.mul; return o; };
for (const name of VN) {
  out.variants[name] = {};
  for (const [lab, f] of [["word-grain", (r) => r.grain === "word"], ["code-grain", (r) => r.grain === "code"], ["notation", (r) => r.grain === "notation"], ["charbigram", (r) => r.grain === "charbigram"], ["atlasPlus", (r) => r.status0 === "P+"], ["atlasMinus", (r) => r.status0 === "P-"], ["atlasMinus_wordGrain", (r) => r.status0 === "P-" && r.grain === "word"], ["atlasMinus_code", (r) => r.status0 === "P-" && r.grain === "code"]]) out.variants[name][lab] = grp(rows.filter(f), name);
}
// same pockets, same design: fixed ranks (A4) vs re-estimated ranks (A) on the 179 atlas-PRESENT pockets: median signed retention v*sign(v0)/|v0| by grain
const retention = (get) => { const r = {}; for (const [lab, f] of [["word-grain P+", (x) => x.grain === "word" && x.v0 > 0], ["code-grain P-", (x) => x.grain === "code" && x.v0 < 0], ["word-grain P-", (x) => x.grain === "word" && x.v0 < 0], ["charbigram P-", (x) => x.grain === "charbigram" && x.v0 < 0], ["code-grain P+", (x) => x.grain === "code" && x.v0 > 0]]) { const vs = rows.filter(f).map((x) => get(x)).filter((v) => v != null); r[lab] = { n: vs.length, medianRetention: vs.length ? +median(vs).toFixed(3) : null, signKeptShare: vs.length ? +(vs.filter((v) => v > 0).length / vs.length).toFixed(3) : null }; } return r; };
const ret = (x, name) => { const v = x.variants[name]; return v && !v.skipped && v.v != null ? (v.v * sg(x.v0)) / Math.abs(x.v0) : null; };
const retA = (x, name) => { const a = A.get(x.id); if (!a) return null; const v = a.variants[name]; return v && !v.skipped && v.v != null ? (v.v * sg(a.v0)) / Math.abs(a.v0) : null; };
out.vsReRanked = { len10: { fixedRanks: retention((x) => ret(x, "fixLen10")), reRanked: retention((x) => retA(x, "len10full")) }, tok7500len10: { fixedRanks: retention((x) => { const a = ret(x, "fixLen10Tok7500_r0"), b = ret(x, "fixLen10Tok7500_r1"); return a != null && b != null ? (a + b) / 2 : a ?? b; }), reRanked: retention((x) => { const a = retA(x, "tok7500len10_r0"), b = retA(x, "tok7500len10_r1"); return a != null && b != null ? (a + b) / 2 : a ?? b; }) }, tok7500: { fixedRanks: retention((x) => { const a = ret(x, "fixTok7500_r0"), b = ret(x, "fixTok7500_r1"); return a != null && b != null ? (a + b) / 2 : a ?? b; }), reRanked: retention((x) => { const a = retA(x, "tok7500_r0"), b = retA(x, "tok7500_r1"); return a != null && b != null ? (a + b) / 2 : a ?? b; }) } };
fs.writeFileSync(path.join(HERE, "A4_summary.json"), JSON.stringify(out, null, 1));
const pr = (o) => `n${o.n} ev${o.evaluated} P+${o["P+"]} P-${o["P-"]} M${o.M} A${o.A} medV ${o.medianV} pos ${o.sharePos} mul ${o.medianMeanUnitLength}`;
for (const name of VN) { console.log("==", name); for (const lab of ["word-grain", "code-grain", "charbigram", "atlasMinus_wordGrain"]) console.log("  ", lab.padEnd(22), pr(out.variants[name][lab])); }
console.log(JSON.stringify(out.vsReRanked, null, 0));
