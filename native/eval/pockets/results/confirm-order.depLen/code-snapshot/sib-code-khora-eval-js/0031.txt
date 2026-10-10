// sample_report.mjs -- ant-code: data and matching statistics for REPORT.md (no reader involved).
import fs from "node:fs"; import path from "node:path"; import { DATA } from "./lib.mjs";
const out = {}; const L = [];
for (const lang of ["js", "py", "rb", "ud"]) {
  const f = path.join(DATA, "sample", `${lang}.json`); if (!fs.existsSync(f)) continue; const s = JSON.parse(fs.readFileSync(f, "utf8"));
  const o = { caliper: s.caliper, files: s.files.length, units: s.files.map((x) => x.units), tokens: {} };
  if (lang !== "ud") { const c = { U: 0, E: 0, K: 0, L: 0, A: 0, P: 0 }; s.files.forEach((_, i) => { const d = JSON.parse(fs.readFileSync(path.join(DATA, "lex", `${lang}-${i}.json`), "utf8")); d.cls.flat().forEach((x) => { c[x] += 1; }); }); o.tokens = c; }
  for (const kind of ["later", "first"]) { const cal = s.caliper[kind]?.caliper; const b = s.balance[`${kind}@${cal}`]; if (!b) continue; o[kind] = Object.fromEntries(Object.entries(b).map(([pool, v]) => [pool, { n: v.n, pass: v.pass, maxAbsSMD: Math.max(...v.rows.map((r) => Math.abs(r.smd))), aucRange: [Math.min(...v.rows.map((r) => r.auc)), Math.max(...v.rows.map((r) => r.auc))], initPos: v.initPos, initNeg: v.initNeg }])); }
  out[lang] = o; L.push(`${lang}: files ${o.files} units ${o.units.join(",")} tokens ${JSON.stringify(o.tokens)} caliper ${JSON.stringify(o.caliper)}`); for (const kind of ["later", "first"]) if (o[kind]) L.push(`   ${kind}: ` + Object.entries(o[kind]).map(([p, v]) => `${p} n=${v.n} pass=${v.pass} max|SMD|=${v.maxAbsSMD.toFixed(3)} AUC[${v.aucRange.map((x) => x.toFixed(3))}] init ${v.initPos}/${v.initNeg}`).join(" | ")); }
fs.writeFileSync("results/sample-report.json", JSON.stringify(out)); console.log(L.join("\n"));
