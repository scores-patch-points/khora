// summary.mjs -- ant-code: gather results/*.json into results/summary.txt (tables for REPORT.md). usage: node summary.mjs
import fs from "node:fs";
const R = "results", files = fs.readdirSync(R).filter((f) => /^(js|py|rb|ud)-(np|raw|shuf|la16)-(PA|PE|PO|FIRST)\.json$/.test(f)).sort();
const L = [];
L.push("| lang | variant | dataset | pos/neg (files) | nonNull pos/neg | FULL [file-boot 95%] | perm q95 | COMPANY | RIVALS | MAGN | POS | SHAPE24 | FULL+RIVALS | FULL+COMPANY | S_ENTRY | LOCAL | FULL - best rival |");
L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
for (const f of files) { const d = JSON.parse(fs.readFileSync(`${R}/${f}`, "utf8")); if (d.gap) { L.push(`| ${d.lang} | ${d.variant} | ${d.dataset} | ${d.nPos}/${d.nNeg} | gap ${d.gap} |`); continue; } const a = d.arms;
  L.push(`| ${d.lang} | ${d.variant} | ${d.dataset} | ${d.nPos}/${d.nNeg} (${d.filesWithPos}) | ${d.nonNull.pos}/${d.nonNull.neg} | ${a.FULL.auc} [${a.FULL.ci}] | ${a.FULL.perm?.q95} | ${a.COMPANY.auc} | ${a.RIVALS.auc} | ${a.MAGNITUDE.auc} | ${a.POSITION.auc} | ${a.SHAPE24.auc} | ${a["FULL+RIVALS"].auc} | ${a["FULL+COMPANY"].auc} | ${d.scalars.S_ENTRY} | ${d.scalars.LOCALCOUNT} | ${d.fullMinusBestRival} |`); }
L.push(""); L.push("By negative class (PA, np): FULL / COMPANY / RIVALS AUC against E, K, L negatives");
for (const lang of ["js", "py", "rb"]) { const f = `${R}/${lang}-np-PA.json`; if (!fs.existsSync(f)) continue; const d = JSON.parse(fs.readFileSync(f, "utf8")); if (d.byNeg) L.push(`- ${lang}: ` + Object.entries(d.byNeg).map(([k, v]) => `${k} n=${v.n} ${v.FULL}/${v.COMPANY}/${v.RIVALS}`).join("; ") + `; decl/use rows ${d.declUse.decl}/${d.declUse.use}, non-null ${d.declUse.declNonNull}/${d.declUse.useNonNull}`); }
L.push(""); L.push("Single causal rival AUCs (PA, np; raw direction, 0.5 = none): ");
for (const lang of ["js", "py", "rb"]) { const f = `${R}/${lang}-np-PA.json`; if (!fs.existsSync(f)) continue; const d = JSON.parse(fs.readFileSync(f, "utf8")); if (d.rivalAuc) L.push(`- ${lang}: ` + Object.entries(d.rivalAuc).map(([k, v]) => `${k} ${v}`).join(", ")); }
fs.writeFileSync(`${R}/summary.txt`, L.join("\n")); console.log(L.join("\n"));
