// ana.mjs — analysis of one corpus: node ana.mjs <corpus>  -> results/analysis-<corpus>.json (+ stdout summary). See PREREG.md.
import fs from "node:fs";
import path from "node:path";
import { loadCorpus, loadArm, rivals, realFeat, kindLevels, oneHot, cvScores, cvConditioned, aucOf, bootDiff, round, share, mean, mulberry32, seedOf, resultsDir } from "./ana-lib.mjs";
const corpusName = process.argv[2], CT = process.argv[3] ?? null;
const corpus = loadCorpus(corpusName), riv = rivals(corpus);
const ARMS = (process.env.ARMS ?? "real,deranged,company,null,shuffle").split(",").filter((a) => loadArm(corpusName, a).length);
const keyset = (arm) => new Set(loadArm(corpusName, arm).filter((r) => !CT || r.ctl === "N" || r.ctl === CT).map((r) => r.key));
let common = null; for (const a of ARMS.filter((x) => x !== "shuffle")) { const ks = keyset(a); common = common ? new Set([...common].filter((k) => ks.has(k))) : ks; }
const cat = (...names) => (f) => names.flatMap((nm) => f[nm]);
const sumsq = (rows, key, lab) => { const g = new Map(); rows.forEach((r, k) => { const a = g.get(lab[k]) ?? []; a.push(key(r)); g.set(lab[k], a); }); const m = mean(rows.map(key)); let ss = 0; for (const a of g.values()) ss += a.length * (mean(a) - m) ** 2; return ss / rows.length; };
function permP(rows, key, lab, groupOf, B = 1000, seed = 1) {
  const obs = sumsq(rows, key, lab), rnd = mulberry32(seed), groups = new Map();
  rows.forEach((r, k) => { const g = groupOf(r); (groups.get(g) ?? groups.set(g, []).get(g)).push(k); });
  let ge = 0;
  for (let b = 0; b < B; b++) { const p = lab.slice(); for (const idx of groups.values()) { const ls = idx.map((k) => lab[k]); for (let j = ls.length - 1; j > 0; j--) { const t = Math.floor(rnd() * (j + 1)); [ls[j], ls[t]] = [ls[t], ls[j]]; } idx.forEach((k, j) => { p[k] = ls[j]; }); } if (sumsq(rows, key, p) >= obs) ge += 1; }
  return { obs: round(obs, 5), p: round((ge + 1) / (B + 1), 4) };
}
const out = { corpus: corpusName, arms: {}, M: corpus.M };
let realAuc = null, realGap = null;
for (const arm of ARMS) {
  const rows = loadArm(corpusName, arm).filter((r) => !CT || r.ctl === "N" || r.ctl === CT).filter((r) => arm === "shuffle" || common.has(r.key)).sort((a, b) => a.n - b.n);
  const y = rows.map((r) => r.y), block = rows.map((r) => r.block);
  const rv = rows.map(riv), REAL = rows.map(realFeat);
  const lv = kindLevels(rows, 8), kindOf = rows.map((r) => lv.of(r)), levels = [...new Set(kindOf)].sort();
  const KIND = oneHot(kindOf, levels);
  const F = rows.map((_, k) => ({ REAL: REAL[k], FREQ: rv[k].FREQ, POS: rv[k].POS, COMPANY: rv[k].COMPANY, KIND: KIND[k] }));
  const spec = { REAL: cat("REAL"), FREQ: cat("FREQ"), POS: cat("POS"), "FREQ+POS": cat("FREQ", "POS"), "FREQ+POS+COMPANY": cat("FREQ", "POS", "COMPANY"), KIND: cat("KIND"), "FREQ+POS+KIND": cat("FREQ", "POS", "KIND"), "REAL+FREQ+POS": cat("REAL", "FREQ", "POS"), "REAL+FREQ+POS+COMPANY": cat("REAL", "FREQ", "POS", "COMPANY"), "REAL+FREQ+POS+KIND": cat("REAL", "FREQ", "POS", "KIND") };
  const sc = {}, au = {};
  for (const [n, f] of Object.entries(spec)) { sc[n] = cvScores(F.map((r) => f(r)), y, block); au[n] = round(aucOf(sc[n], y) ?? 0.5); }
  out.arms[arm] = { n: rows.length, kindLevels: levels };
  const A = out.arms[arm];
  A.auc = au;
  const nn = rows.filter((r) => r.y === 1), cc = rows.filter((r) => r.y === 0);
  A.trace = { nonNullNAME: round(share(nn.map((r) => r.nonNull))), nonNullCTL: round(share(cc.map((r) => r.nonNull))), ownExistsNAME: round(share(nn.map((r) => r.ownExists))), ownExistsCTL: round(share(cc.map((r) => r.ownExists))), relLostNAME: round(mean(nn.map((r) => r.relLost))), relLostCTL: round(mean(cc.map((r) => r.relLost))), refAbsNAME: round(mean(nn.map((r) => r.refAbs))), refAbsCTL: round(mean(cc.map((r) => r.refAbs))), nRef0: round(mean(rows.map((r) => r.nRef0)), 1) };
  A.trace.gap = round(A.trace.nonNullNAME - A.trace.nonNullCTL);
  A.diffs = { "REAL+FREQ+POS - FREQ+POS": bootDiff(sc["REAL+FREQ+POS"], sc["FREQ+POS"], y, block, 1000, 11), "REAL+FREQ+POS+KIND - FREQ+POS+KIND": bootDiff(sc["REAL+FREQ+POS+KIND"], sc["FREQ+POS+KIND"], y, block, 1000, 12), "REAL+FREQ+POS+COMPANY - FREQ+POS+COMPANY": bootDiff(sc["REAL+FREQ+POS+COMPANY"], sc["FREQ+POS+COMPANY"], y, block, 1000, 13) };
  // K3: conditioned (separate fit per kind stratum) vs kind-main-effect
  const X = rows.map((_, k) => [...REAL[k], ...rv[k].FREQ, ...rv[k].POS, ...KIND[k]]);
  const cond = cvConditioned(X, y, block, kindOf, 12);
  A.conditioned = { auc: round(aucOf(cond, y) ?? 0.5), vsMainEffect: bootDiff(cond, sc["REAL+FREQ+POS+KIND"], y, block, 1000, 14) };
  A.byKind = {};
  for (const lvl of levels) {
    const idx = rows.map((_, k) => k).filter((k) => kindOf[k] === lvl), a = idx.filter((k) => y[k] === 1), b = idx.filter((k) => y[k] === 0);
    const d = (key) => (a.length && b.length ? round(mean(a.map((k) => key(rows[k]))) - mean(b.map((k) => key(rows[k])))) : null);
    A.byKind[lvl] = { nName: a.length, nCtl: b.length, ownExistsShare: round(share(idx.map((k) => rows[k].ownExists))), nonNullShare: round(share(idx.map((k) => rows[k].nonNull))), meanOwnDelta: round(mean(idx.map((k) => rows[k].ownDelta)), 2), meanRelLost: round(mean(idx.map((k) => rows[k].relLost)), 2), dNonNull: d((r) => (r.nonNull ? 1 : 0)), dOwnDelta: d((r) => r.ownDelta), dRelLost: d((r) => r.relLost), dRefAbs: d((r) => r.refAbs), dKindFlips: d((r) => r.kindFlips), auc_REAL_inKind: idx.length > 6 && a.length && b.length ? round(aucOf(idx.map((k) => (REAL[k][0] + REAL[k][1] + REAL[k][2] + REAL[k][3] + REAL[k][4] + REAL[k][5] + REAL[k][6])), idx.map((k) => y[k])) ?? 0.5) : null };
  }
  const pooledSign = (key) => Math.sign(mean(nn.map(key)) - mean(cc.map(key)));
  A.simpson = {};
  for (const [nm, key] of [["ownDelta", (r) => r.ownDelta], ["relLost", (r) => r.relLost], ["refAbs", (r) => r.refAbs], ["nonNull", (r) => (r.nonNull ? 1 : 0)]]) {
    const ps = pooledSign(key); A.simpson[nm] = { pooledSign: ps, reversals: Object.entries(A.byKind).filter(([, v]) => v.nName >= 4 && v.nCtl >= 4).filter(([l]) => { const idx = rows.map((_, k) => k).filter((k) => kindOf[k] === l); const sg = Math.sign(mean(idx.filter((k) => y[k] === 1).map((k) => key(rows[k]))) - mean(idx.filter((k) => y[k] === 0).map((k) => key(rows[k])))); return sg !== 0 && ps !== 0 && sg !== ps; }).map(([l]) => l) };
  }
  const posClass = (r) => r.strat.split("|")[0];
  const stats = { ownExists: (r) => r.ownExists, refAbs: (r) => Math.log1p(r.refAbs), relLost: (r) => Math.log1p(r.relLost), relCollateral: (r) => Math.log1p(r.relCollateral), kindFlips: (r) => Math.log1p(r.kindFlips) };
  A.K2 = { vsRandomPartition: {}, vsRandomPartitionWithinClass: {} };
  for (const [nm, key] of Object.entries(stats)) { A.K2.vsRandomPartition[nm] = permP(rows, key, kindOf, posClass, 1000, 21); A.K2.vsRandomPartitionWithinClass[nm] = permP(rows, key, kindOf, (r) => `${r.y}|${posClass(r)}`, 1000, 22); }
  A.K2.sigStats = { random: Object.values(A.K2.vsRandomPartition).filter((v) => v.p < 0.05).length, withinClass: Object.values(A.K2.vsRandomPartitionWithinClass).filter((v) => v.p < 0.05).length };
  A.kindTable = Object.fromEntries(levels.map((l) => [l, [kindOf.filter((k, j) => k === l && y[j] === 1).length, kindOf.filter((k, j) => k === l && y[j] === 0).length]]));
  if (arm === "real") { realAuc = au.REAL; realGap = A.trace.gap; }
}
for (const arm of ARMS) { const A = out.arms[arm]; A.survival = { AUC_REAL: realAuc != null && realAuc - 0.5 >= 0.03 ? round((A.auc.REAL - 0.5) / (realAuc - 0.5)) : "undefined(real AUC<0.53)", gap: realGap >= 0.05 ? round(A.trace.gap / realGap) : "undefined(real gap<0.05)" }; }
if (ARMS.includes("shuffle")) { const sk = keyset("shuffle"), rr = loadArm(corpusName, "real").filter((r) => sk.has(r.key)).sort((a, b) => a.n - b.n); out.shuffleCompare = { n: rr.length, auc_REAL_realArmOnShuffleUnits: round(aucOf(cvScores(rr.map(realFeat), rr.map((r) => r.y), rr.map((r) => r.block)), rr.map((r) => r.y)) ?? 0.5), ownExistsNAME: round(share(rr.filter((r) => r.y === 1).map((r) => r.ownExists))), ownExistsCTL: round(share(rr.filter((r) => r.y === 0).map((r) => r.ownExists))) }; }
fs.writeFileSync(path.join(resultsDir, `analysis-${corpusName}${CT ? "-" + CT : ""}.json`), JSON.stringify(out, null, 1));
for (const arm of ARMS) { const A = out.arms[arm]; console.log(corpusName, CT ?? "", arm, "n", A.n, "AUC REAL", A.auc.REAL, "F+P", A.auc["FREQ+POS"], "POS", A.auc.POS, "R+F+P", A.auc["REAL+FREQ+POS"], "KIND", A.auc.KIND, "cond", A.conditioned.auc, "gap", A.trace.gap, "NAME/CTL nonNull", A.trace.nonNullNAME, A.trace.nonNullCTL, "surv", JSON.stringify(A.survival)); }
