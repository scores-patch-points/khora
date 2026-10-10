// extras.mjs -- ant-code T7b: declaration sites vs later uses of user identifiers inside LATER (PA, np): AUC of the leave-one-file-out scores (FULL, COMPANY, RIVALS) of decl positives vs ALL negatives
// and of use positives vs ALL negatives; plus the causal non-null shares. usage: node extras.mjs LANG
import fs from "node:fs";
import { loadRecs, dataset, cvArms, aucIdx, round } from "./ana_lib.mjs";
const lang = process.argv[2], rows = dataset(loadRecs(lang, "np"), "later", "A", lang), y = rows.map((r) => r.y);
const cv = cvArms(rows, ["FULL", "COMPANY", "RIVALS", "MAGNITUDE"]), out = { lang, n: rows.length };
for (const [nm, pred] of [["decl", (r) => r.meta.decl === 1], ["use", (r) => r.meta.decl === 0]]) {
  const idx = rows.map((r, k) => (r.y === 0 || (r.y === 1 && pred(r)) ? k : -1)).filter((k) => k >= 0);
  out[nm] = { pos: idx.filter((k) => y[k] === 1).length, neg: idx.filter((k) => y[k] === 0).length, nonNull: round(rows.filter((r) => r.y === 1 && pred(r)).filter((r) => !r.isNull).length / Math.max(1, idx.filter((k) => y[k] === 1).length)), ...Object.fromEntries(["FULL", "COMPANY", "RIVALS", "MAGNITUDE"].map((a) => [a, round(aucIdx(cv.out[a].scores, y, idx))])) };
}
fs.writeFileSync(`results/extras-${lang}.json`, JSON.stringify(out)); console.log(JSON.stringify(out));
