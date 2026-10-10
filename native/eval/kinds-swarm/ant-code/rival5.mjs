// rival5.mjs -- ant-code: the brief's NARROW rival set (local mention count, burstiness, recency, unit length, token index) as one fitted arm, and the fitted company-diversity-only subset
// (sameLeft, sameRight, leftDiv, rightDiv, neighbour window frequencies), vs FULL; leave-one-file-out on PA np. usage: node rival5.mjs LANG
import fs from "node:fs";
import { loadRecs, dataset, cvArms, ARMS2, bootAuc, round } from "./ana_lib.mjs";
const lang = process.argv[2]; const rows = dataset(loadRecs(lang, "np"), "later", "A", lang);
ARMS2.RIVALS5 = [(r) => [r.rivals[0], r.rivals[4], r.rivals[2], r.rivals[14], Math.log1p(r.i)]];
ARMS2.DIVERSITY = [(r) => [r.rivals[6], r.rivals[7], r.rivals[8], r.rivals[9], r.rivals[10], r.rivals[11]]];
ARMS2["FULL+RIVALS5"] = [(r) => [...r.sig, ...r.atm, ...r.span, ...r.c], (r) => [r.rivals[0], r.rivals[4], r.rivals[2], r.rivals[14], Math.log1p(r.i)]];
const cv = cvArms(rows, ["FULL", "RIVALS5", "DIVERSITY", "FULL+RIVALS5", "RIVALS"]), y = rows.map((r) => r.y), blocks = rows.map((r) => r.block);
const names = ["FULL", "RIVALS5", "DIVERSITY", "FULL+RIVALS5", "RIVALS"], bt = bootAuc(names.map((n) => cv.out[n].scores), y, blocks, 1000, 7);
const out = { lang, n: rows.length, ...Object.fromEntries(names.map((n, k) => [n, { auc: cv.out[n].auc, ci: bt.ci[k], diffVsFULL: bt.diff[k] }])) };
fs.writeFileSync(`results/rival5-${lang}.json`, JSON.stringify(out)); console.log(JSON.stringify(out));
