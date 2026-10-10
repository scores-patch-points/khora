// moderators.mjs: leave-one-language-out regression of own-language company AUC on the three pre-registered moderators.   node moderators.mjs OUT.json
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═══
// The registration is moderators-prereg.txt (sha256 81293b19b4b03a212de3988f09684de56abdd7fb2b030f5ba30155d967142df1), written before any descriptor existed. This header
// restates the parts that this script executes; if the two ever differ, the .txt wins and the difference is a protocol deviation to be reported.
// DISCLOSURE: all own-language AUCs of own.json were seen before registration (so M1 and M3 are not blind); descriptors.dev.json was computed after registration and its
//   M1/M2 columns printed once (FWC32, CHAIN, a few shares) before this script was written, WITHOUT any correlation with AUC computed.
// DATA: results/name-company-pairblocks/own.json (dependent variables; thin languages excluded) and results/descriptors.dev.json (moderators). Dev only. No test file.
// TESTS (all thresholds fixed): Y_LATER = BOTH@LATER, Y_FIRST = LEFT@FIRST. Models = the 7 non-empty subsets of {M1 FWC32, M2 CHAIN, M3 log2 pairs}, OLS, LOLO prediction.
//   skill = 1 - RMSE(model)/RMSE(mean-only LOLO). Selection-corrected statistic = best skill over the 7 models, permutation null (2000 permutations of the AUC vector
//   against the moderator rows). SUPPORTED iff best-of-7 skill >= 0.10 AND permutation p <= 0.05 AND every coefficient sign equals the predicted sign (+).
//   MODERATOR (single) iff skill > 0 AND sign + AND single-model permutation p <= 0.05 (uncorrected, flagged). RESIDUAL OUTLIER iff |LOLO residual| >= 2 SD of residuals.
//   EXPLORATORY: Spearman of every descriptor with each AUC (2000-permutation p), no inference, never regressed.
// BLIND PREDICTIONS: M1 +, M2 +, M3 +. Expected: M3 absorbs part of the effect in LATER (small-pair languages are the low ones).
// ═══ END OF PRE-REGISTRATION ═══
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { round, mean, sd, headerSha } from "./util.mjs";
import { fitOls, skillOf, spearman, shuffleIn, hanleyMcNeilSE, mulberry } from "./stats.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), OWN = path.join(HERE, "..", "..", "results", "name-company-pairblocks", "own.json");
const own = JSON.parse(fs.readFileSync(OWN, "utf8")), D = JSON.parse(fs.readFileSync(path.join(HERE, "results", "descriptors.dev.json"), "utf8")).languages;
const fam = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "results", "name-shape", "_report.json"), "utf8")).families.membership;
const NAMES = ["M1_FWC32", "M2_CHAIN", "M3_LOGPAIRS"], B = 2000, outFile = process.argv[2];
const SUBSETS = [1, 2, 3, 4, 5, 6, 7].map((m) => ({ m, idx: [0, 1, 2].filter((j) => m & (1 << j)) })), label = (idx) => idx.map((j) => NAMES[j]).join("+");
const STR = { LATER: "BOTH", FIRST: "LEFT" }, R = { headerSha256: headerSha(import.meta.url), preregSha256: "81293b19b4b03a212de3988f09684de56abdd7fb2b030f5ba30155d967142df1", B, strata: {} };

function flatten(d, st) { // exploratory descriptor vector for one language
  const f = { meanSentLen: d.meanSentLen, log2Sentences: Math.log2(d.sentences), log2Tokens: Math.log2(d.tokens), FWC32: d.FWC32, TTR: d.TTR, hapaxTypeShare: d.hapaxTypeShare, casedShare: d.casedShare, propnDensity: d.propn.density,
    propnChain: d.propn.CHAIN, propnSentenceInitial: d.propn.sentenceInitial, propnFlat: d.propn.flatShare, propnHapaxTokenRate: d.propn.hapaxTokenRate, propnHapaxTypeRate: d.propn.hapaxTypeRate, propnMeanChars: d.propn.meanChars };
  for (const [k, v] of Object.entries(d.propn.precededBy)) f["propnPrecededBy_" + k] = v; for (const [k, v] of Object.entries(d.propn.followedBy)) f["propnFollowedBy_" + k] = v;
  for (const [k, v] of Object.entries(d.wordOrder)) f["order_" + k] = v.n >= 30 ? v.share : null; return f;
}
for (const st of ["LATER", "FIRST"]) {
  const arm = STR[st], langs = Object.keys(own).filter((l) => !own[l][st].thin && D[l]);
  const y = langs.map((l) => own[l][st][arm]), X = langs.map((l) => [D[l].FWC32, D[l].propn.CHAIN, Math.log2(own[l][st].pairs)]), n = langs.length;
  const sel = (idx) => X.map((r) => idx.map((j) => r[j]));
  const real = SUBSETS.map((s) => ({ ...s, ...skillOf(sel(s.idx), y) })), best = real.reduce((a, b) => (b.skill > a.skill ? b : a));
  const rnd = mulberry(20261007 + (st === "LATER" ? 1 : 2)), nullBest = [], nullEach = SUBSETS.map(() => []);
  for (let b = 0; b < B; b++) { const yp = shuffleIn(y.slice(), rnd); let mx = -9; SUBSETS.forEach((s, k) => { const sk = skillOf(sel(s.idx), yp).skill; nullEach[k].push(sk); if (sk > mx) mx = sk; }); nullBest.push(mx); }
  const pOf = (arr, v) => (arr.filter((x) => x >= v).length + 1) / (arr.length + 1);
  const models = real.map((r, k) => { const fit = fitOls(sel(r.idx), y), coefRaw = r.idx.map((j, t) => round(fit.w[t + 1] / fit.s[t], 5)), coefStd = r.idx.map((_, t) => round(fit.w[t + 1], 4));
    return { label: label(r.idx), skill: round(r.skill), rmseModel: round(r.rmseModel), rmseBase: round(r.rmseBase), maeModel: round(r.maeModel), maeBase: round(r.maeBase), permP_uncorrected: round(pOf(nullEach[k], r.skill)), coefStd, coefRaw, signsAllPositive: coefStd.every((c) => c > 0), intercept: round(fit.w[0]) }; });
  const bi = SUBSETS.indexOf(SUBSETS.find((s) => s.m === best.m)), res = y.map((v, i) => v - best.pred[i]), sdRes = sd(res);
  const resFull = y.map((v, i) => v - real[6].pred[i]), baseRes = y.map((v, i) => v - real[0].predBase[i]);
  const rows = langs.map((l, i) => ({ lang: l, auc: y[i], pairs: own[l][st].pairs, seApprox: round(hanleyMcNeilSE(y[i], own[l][st].pairs, own[l][st].pairs), 3), FWC32: X[i][0], CHAIN: X[i][1], predBest: round(best.pred[i]), residBest: round(res[i]), residFull: round(resFull[i]), residMeanOnly: round(baseRes[i]), outlierBest: Math.abs(res[i]) >= 2 * sdRes, family: String(fam[l]).split("#")[0] }));
  const ex = {}; const flats = langs.map((l) => flatten(D[l], st)); flats.forEach((f, i) => { f.log2PairsStratum = Math.log2(own[langs[i]][st].pairs); f.sovLike = String(fam[langs[i]]).startsWith("SOV") ? 1 : 0; });
  for (const key of Object.keys(flats[0])) { const ok = flats.map((f, i) => i).filter((i) => flats[i][key] != null && Number.isFinite(flats[i][key])); if (ok.length < 12) continue;
    const a = ok.map((i) => flats[i][key]), t = ok.map((i) => y[i]), rho = spearman(a, t), r2 = mulberry(77 + key.length); let ge = 0; for (let b = 0; b < B; b++) if (Math.abs(spearman(a, shuffleIn(t.slice(), r2))) >= Math.abs(rho) - 1e-12) ge += 1;
    ex[key] = { rho: round(rho, 3), p: round((ge + 1) / (B + 1), 4), n: ok.length }; }
  const sov = rows.filter((r) => r.family === "SOV-like").map((r) => r.auc), svo = rows.filter((r) => r.family === "SVO-like").map((r) => r.auc);
  R.strata[st] = { arm, n, langs, meanAuc: round(mean(y)), sdAuc: round(sd(y)), models, bestOf7: { label: label(best.idx), skill: round(best.skill), permP_bestOf7: round(pOf(nullBest, best.skill)), nullBestQ95: round([...nullBest].sort((a, b) => a - b)[Math.floor(0.95 * B)]) },
    sdLoloResidualBest: round(sdRes), rows, exploratorySpearman: Object.fromEntries(Object.entries(ex).sort((a, b) => Math.abs(b[1].rho) - Math.abs(a[1].rho))), wordOrder2fam: { sovMean: round(mean(sov)), sovN: sov.length, svoMean: round(mean(svo)), svoN: svo.length, diff: round(mean(sov) - mean(svo)) } };
  const b1 = models.filter((m) => m.label.indexOf("+") < 0), top = models.find((m) => m.label === label(best.idx));
  R.strata[st].verdict = { supportedBestOf7: best.skill >= 0.1 && pOf(nullBest, best.skill) <= 0.05 && top.signsAllPositive, singleModerators: b1.filter((m) => m.skill > 0 && m.signsAllPositive && m.permP_uncorrected <= 0.05).map((m) => m.label) };
  console.error(st, n, "best", label(best.idx), round(best.skill), "p7", R.strata[st].bestOf7.permP_bestOf7);
}
fs.writeFileSync(outFile, JSON.stringify(R, null, 1)); console.log("written", outFile);
