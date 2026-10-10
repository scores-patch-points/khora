// analyse.mjs -- ant-code T2/T5/T6/T7: leave-one-file-out CV per language/variant/dataset. usage: node analyse.mjs LANG VARIANT DATASET [--B 200]
// DATASET: PA | PE | PO (kind later) | FIRST (kind first, pool N). Writes results/<lang>-<variant>-<dataset>.json and prints one summary line.
import fs from "node:fs"; import path from "node:path";
import { RIVAL_LABELS } from "./lib.mjs";
import { loadRecs, dataset, cvArms, bootAuc, nonNullShare, SCALARS, aucIdx, featAuc, round, seedFor, DATA } from "./ana_lib.mjs";
const [lang, variant, ds] = process.argv.slice(2); const B = Number(process.argv.includes("--B") ? process.argv[process.argv.indexOf("--B") + 1] : 200);
const parts = loadRecs(lang, variant); if (!parts.length) { console.error("no records"); process.exit(1); }
const [kind, pool] = ds === "PA" ? ["later", "A"] : ds === "PE" ? ["later", "E"] : ds === "PO" ? ["later", "O"] : ["first", "N"];
const rows = dataset(parts, kind, pool, lang);
const y = rows.map((r) => r.y), blocks = rows.map((r) => r.block);
const res = { lang, variant, dataset: ds, files: parts.length, n: rows.length, nPos: y.filter((v) => v === 1).length, nNeg: y.filter((v) => v === 0).length, filesWithPos: new Set(rows.filter((r) => r.y).map((r) => r.file)).size,
  nonNull: { pos: nonNullShare(rows, 1), neg: nonNullShare(rows, 0) }, negClass: Object.fromEntries(["E", "K", "L"].map((c) => [c, rows.filter((r) => r.y === 0 && (r.meta.c === c)).length])) };
if (res.nPos < 30 || res.nNeg < 30) { res.gap = "too_few_rows"; fs.writeFileSync(path.join("results", `${lang}-${variant}-${ds}.json`), JSON.stringify(res)); console.log(JSON.stringify(res)); process.exit(0); }
const ARM_LIST = ["FULL", "SLOT", "SHAPE24", "MAGNITUDE", "RIVALS", "POSITION", "COMPANY", "FULL+RIVALS", "FULL+COMPANY"];
const cv = cvArms(rows, ARM_LIST, { perm: ["FULL", "COMPANY", "RIVALS"], B, seed: seedFor("ant-code", "perm", lang, variant, ds) });
const rivalNames = ["RIVALS", "MAGNITUDE", "POSITION"];
const scal = {}; for (const [nm, fn] of Object.entries(SCALARS)) scal[nm] = round(featAuc(rows.map(fn), y));
const bestScalar = Object.entries(scal).map(([k, v]) => [k, Math.max(v, 1 - v) === v ? v : v]).sort((a, b) => b[1] - a[1])[0];
const bestFitted = rivalNames.map((a) => [a, cv.out[a].auc]).sort((a, b) => b[1] - a[1])[0];
const cand = { FULL: cv.out.FULL.scores, ...Object.fromEntries(rivalNames.map((a) => [a, cv.out[a].scores])), COMPANY: cv.out.COMPANY.scores, "FULL+RIVALS": cv.out["FULL+RIVALS"].scores, "FULL+COMPANY": cv.out["FULL+COMPANY"].scores };
const names = Object.keys(cand), bt = bootAuc(names.map((n) => cand[n]), y, blocks, 1000, seedFor("ant-code", "boot", lang, variant, ds));
res.arms = Object.fromEntries(ARM_LIST.map((a) => [a, { auc: cv.out[a].auc, perm: cv.out[a].perm ?? null, ci: bt.ci[names.indexOf(a)] ?? null, diffVsFULL: bt.diff[names.indexOf(a)] ?? null }]));
res.rivalAuc = Object.fromEntries(RIVAL_LABELS.map((nm, j) => [nm, round(featAuc(rows.map((r) => r.rivals[j]), y))])); res.scalars = scal; res.bestFitted = bestFitted; res.bestScalar = bestScalar;
const bestRivalAuc = Math.max(bestFitted[1], bestScalar[1]);
res.fullMinusBestRival = round(cv.out.FULL.auc - bestRivalAuc);
// by negative class (PA): AUC of the FULL CV scores restricted to positives + that class of negatives
res.byNeg = {}; for (const cl of ["E", "K", "L"]) { const idx = rows.map((r, k) => (r.y === 1 || r.meta.c === cl ? k : -1)).filter((k) => k >= 0); if (idx.filter((k) => y[k] === 0).length >= 20) res.byNeg[cl] = { n: idx.length, FULL: round(aucIdx(cv.out.FULL.scores, y, idx)), COMPANY: round(aucIdx(cv.out.COMPANY.scores, y, idx)), RIVALS: round(aucIdx(cv.out.RIVALS.scores, y, idx)) }; }
// decl vs use among the positives (T7 within LATER): non-null share and mean FULL score
res.declUse = { decl: rows.filter((r) => r.y === 1 && r.meta.decl === 1).length, use: rows.filter((r) => r.y === 1 && r.meta.decl === 0).length, declNonNull: nonNullShare(rows.filter((r) => r.meta.decl === 1), 1), useNonNull: nonNullShare(rows.filter((r) => r.meta.decl === 0), 1) };
fs.mkdirSync("results", { recursive: true });
fs.writeFileSync(path.join("results", `${lang}-${variant}-${ds}.json`), JSON.stringify(res));
const a = res.arms; console.log(`${lang} ${variant} ${ds}: pos ${res.nPos} neg ${res.nNeg} files ${res.filesWithPos} nonNull ${res.nonNull.pos}/${res.nonNull.neg} FULL ${a.FULL.auc} ${JSON.stringify(a.FULL.ci)} q95 ${a.FULL.perm?.q95} | COMPANY ${a.COMPANY.auc} RIVALS ${a.RIVALS.auc} MAG ${a.MAGNITUDE.auc} POS ${a.POSITION.auc} SHAPE24 ${a.SHAPE24.auc} F+R ${a["FULL+RIVALS"].auc} F+C ${a["FULL+COMPANY"].auc} | S_ENTRY ${scal.S_ENTRY} LOCAL ${scal.LOCALCOUNT} | best rival ${JSON.stringify(bestFitted)} ${JSON.stringify(bestScalar)} diff ${res.fullMinusBestRival}`);
