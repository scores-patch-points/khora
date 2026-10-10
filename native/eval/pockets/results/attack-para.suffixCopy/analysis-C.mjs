// analysis-C.mjs -- attack C (multiplicity + shared property): (1) how many cells were tested and how many false PRESENT cells the planted iid worlds / controls predict;
// (2) re-derive the SHARED PROPERTY of the pockets where suffixCopy is PRESENT (eta-squared of the present/not-present indicator on group, register, script, and of tokens / unit length / docs on the indicator),
// 2000 label permutations, a max-over-attributes (Westfall-Young) correction for having looked at six attributes, leave-one-pocket-out, leave-one-register-out, a within-group stratified permutation,
// and the same procedure on the other 80 statistics (is "register" a property of this law or of any statistic?).
import path from "node:path";
import { HERE, readJson, writeJson, median, mean } from "./common.mjs";
import { eta2, ranks } from "./stats.mjs";
import { rngOf, seedOf } from "./lib.mjs";
const M = readJson(path.join(HERE, "../atlas-matrix.json")), T = readJson(path.join(HERE, "../law-table.json"));
const real = M.pockets.filter((p) => p.kind === "real" && !p.thin), si = M.statistics.indexOf("para.suffixCopy");
const out = { multiplicity: {}, shared: {} };
// ---------- C1 multiplicity ----------
const fp = T.falsePresent, defined = fp.nDefinedRealCells;
const suf = T.statistics.find((s) => s.stat === "para.suffixCopy");
out.multiplicity = {
  statistics: M.statistics.length, realPockets: real.length, cellsTested: M.statistics.length * real.length, definedRealCells: defined, halfCells: 2 * defined,
  observedPresentRealCells: fp.observedPresentRealCells, sharePresent: +(fp.observedPresentRealCells / defined).toFixed(4),
  plantedIid: { halfCells: fp.plantedIid.halfCells, absZge4: fp.plantedIid.absZge4, rate4: fp.plantedIid.rate4, presentCellsObserved: fp.plantedIid.presentCellsObserved },
  controls: { halfCells: fp.controls.halfCells, absZge4: fp.controls.absZge4, rate4: fp.controls.rate4, presentCellsObserved: fp.controls.presentCellsObserved },
  binomialReference: fp.binomialReference,
  expectedFalsePresentAllCells: +(defined * fp.binomialReference.p).toFixed(2), expectedFalsePresentSuffixCopy: +(suf.N * fp.binomialReference.p).toFixed(3),
  expectedFalsePresentSuffixCopyUsingControlsRate: +(suf.N * fp.controls.rate4 ** 2 / 2).toFixed(4),
  suffixCopyPresentCells: suf.nPos + suf.nNeg, suffixCopyDefined: suf.N,
};
const rate = M.statistics.map((s, k) => { let d = 0, p = 0, n = 0; for (const r of real) { const st = r.cells[k][4]; if (st === "P+" || st === "P-" || st === "A" || st === "M") d++; if (st === "P+") p++; if (st === "P-") n++; } return { stat: s, defined: d, pPlus: p, pMinus: n, share: d ? (p + n) / d : null }; }).sort((a, b) => b.share - a.share);
out.multiplicity.presentRateRankOfSuffixCopy = rate.findIndex((r) => r.stat === "para.suffixCopy") + 1;
out.multiplicity.medianPresentRateOver81Stats = +median(rate.map((r) => r.share)).toFixed(3);
out.multiplicity.statsWithPresentRateAbove50pct = rate.filter((r) => r.share > 0.5).length;
out.multiplicity.paraFamilyRates = rate.filter((r) => r.stat.startsWith("para.")).map((r) => `${r.stat}:${r.share.toFixed(2)}`);
// ---------- C2 shared property ----------
const ok = real.filter((p) => ["P+", "P-", "A", "M"].includes(p.cells[si][4]));
const y = ok.map((p) => (p.cells[si][4] === "P+" || p.cells[si][4] === "P-" ? 1 : 0));
const ATTR = { group: (p) => p.group, register: (p) => p.register, script: (p) => p.script ?? "NA", tokens: (p) => Math.log(p.tokens), meanUnitLength: (p) => Math.log(p.meanUnitLength), docs: (p) => Math.log(p.docs) }; // numeric attributes enter as logs (this reproduces the atlas law-table eta2 values exactly)
const attrs = Object.entries(ATTR).map(([name, fn]) => ({ name, cat: ["group", "register", "script"].includes(name), vals: ok.map(fn) }));
// eta2: cat attribute -> indicator ANOVA over the levels; numeric attribute -> numeric ANOVA over the present / not-present split
const stat = (a, yy) => (a.cat ? eta2(yy, a.vals) : eta2(a.vals, yy));
const obs = attrs.map((a) => stat(a, y));
out.shared.reproduction = { n: ok.length, nPresent: y.reduce((a, b) => a + b, 0), eta2: Object.fromEntries(attrs.map((a, i) => [a.name, +obs[i].toFixed(4)])), atlasLawTable: Object.fromEntries(T.statistics.find((s) => s.stat === "para.suffixCopy").sharedProperty.rows.map((r) => [r.attr, +r.eta2.toFixed(4)])) };
const permute = (yy, rnd) => { const a = yy.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DR = 2000, rnd = rngOf(seedOf("sfxatk", "C", "perm")), nullStats = attrs.map(() => []);
for (let d = 0; d < DR; d++) { const yp = permute(y, rnd); attrs.forEach((a, i) => nullStats[i].push(stat(a, yp))); }
const pOf = (i, v) => (1 + nullStats[i].filter((x) => x >= v).length) / (DR + 1);
out.shared.perm = Object.fromEntries(attrs.map((a, i) => [a.name, { eta2: +obs[i].toFixed(4), p: +pOf(i, obs[i]).toFixed(5), nullMean: +mean(nullStats[i]).toFixed(4), nullMax: +Math.max(...nullStats[i]).toFixed(4) }]));
// Westfall-Young min-p over the six attributes
{ const pObs = obs.map((v, i) => pOf(i, v)), minObs = Math.min(...pObs); let c = 0;
  for (let d = 0; d < DR; d++) { let m = 1; for (let i = 0; i < attrs.length; i++) { const v = nullStats[i][d]; const p = (1 + nullStats[i].filter((x) => x >= v).length) / (DR + 1); if (p < m) m = p; } if (m <= minObs) c++; }
  out.shared.westfallYoungMinP = { minObservedP: +minObs.toFixed(5), adjustedP: +((1 + c) / (DR + 1)).toFixed(5), note: "permutation p floor is 1/2001 = 0.0005; adjusted p counts permutations whose smallest attribute-wise p is at most the observed smallest" }; }
// effect of register after group: stratified permutation (labels permuted within group), statistic = register eta2
{ const gi = new Map(); ok.forEach((p, i) => { const g = p.group; if (!gi.has(g)) gi.set(g, []); gi.get(g).push(i); });
  const r2 = rngOf(seedOf("sfxatk", "C", "strat")), regA = attrs.find((a) => a.name === "register"), o = stat(regA, y); let c = 0; const nl = [];
  for (let d = 0; d < DR; d++) { const yp = y.slice(); for (const ix of gi.values()) { const sub = permute(ix.map((i) => y[i]), r2); ix.forEach((i, k) => (yp[i] = sub[k])); } const v = stat(regA, yp); nl.push(v); if (v >= o) c++; }
  out.shared.registerWithinGroupStratified = { eta2: +o.toFixed(4), nullMean: +mean(nl).toFixed(4), p: +((1 + c) / (DR + 1)).toFixed(5) }; }
// leave-one-pocket-out: register eta2 and group eta2 range
{ const regA = attrs.find((a) => a.name === "register"), grpA = attrs.find((a) => a.name === "group"), lo = [], lg = [];
  for (let k = 0; k < ok.length; k++) { const keep = ok.map((_, i) => i).filter((i) => i !== k), yy = keep.map((i) => y[i]); lo.push(eta2(yy, keep.map((i) => regA.vals[i]))); lg.push(eta2(yy, keep.map((i) => grpA.vals[i]))); }
  out.shared.leaveOnePocketOut = { registerEta2: { min: +Math.min(...lo).toFixed(4), max: +Math.max(...lo).toFixed(4) }, groupEta2: { min: +Math.min(...lg).toFixed(4), max: +Math.max(...lg).toFixed(4) } }; }
// leave-one-register-out: eta2 and perm p (500 draws) of register after dropping every pocket of that register
{ const regs = [...new Set(attrs.find((a) => a.name === "register").vals)], res = [];
  const r3 = rngOf(seedOf("sfxatk", "C", "lor"));
  for (const rg of regs) { const keep = ok.map((_, i) => i).filter((i) => attrs[1].vals[i] !== rg); if (keep.length === ok.length) continue; const yy = keep.map((i) => y[i]), vv = keep.map((i) => attrs[1].vals[i]), o = eta2(yy, vv); res.push({ dropped: rg, nDropped: ok.length - keep.length, eta2: +o.toFixed(4) }); }
  res.sort((a, b) => a.eta2 - b.eta2); out.shared.leaveOneRegisterOut = { lowest5: res.slice(0, 5), highest3: res.slice(-3) };
  // drop the registers that are 100% present (code, scripture, dialect, diagram, markup, config) all at once, then test
  const allP = new Set(regs.filter((rg) => { const ix = ok.map((_, i) => i).filter((i) => attrs[1].vals[i] === rg); return ix.length >= 3 && ix.every((i) => y[i] === 1); }));
  const keep = ok.map((_, i) => i).filter((i) => !allP.has(attrs[1].vals[i])), yy = keep.map((i) => y[i]), vv = keep.map((i) => attrs[1].vals[i]), o = eta2(yy, vv); let c = 0; const nl = [];
  for (let d = 0; d < 1000; d++) { const v = eta2(permute(yy, r3), vv); nl.push(v); if (v >= o) c++; }
  out.shared.afterDroppingAllHundredPercentRegisters = { dropped: [...allP], nRemaining: keep.length, presentRemaining: yy.reduce((a, b) => a + b, 0), eta2: +o.toFixed(4), nullMean: +mean(nl).toFixed(4), p: +((1 + c) / 1001).toFixed(4) }; }
// ---------- the same shared-property procedure on all 81 statistics (register eta2 and permutation p, 500 draws) ----------
{ const r4 = rngOf(seedOf("sfxatk", "C", "panel")), panel = [];
  for (let k = 0; k < M.statistics.length; k++) {
    const rows = real.filter((p) => ["P+", "P-", "A", "M"].includes(p.cells[k][4])), yy = rows.map((p) => (p.cells[k][4] === "P+" || p.cells[k][4] === "P-" ? 1 : 0)), np = yy.reduce((a, b) => a + b, 0);
    if (np < 10 || rows.length - np < 10) continue;
    const reg = rows.map((p) => p.register), o = eta2(yy, reg); let c = 0; for (let d = 0; d < 500; d++) if (eta2(permute(yy, r4), reg) >= o) c++;
    panel.push({ stat: M.statistics[k], n: rows.length, nPresent: np, registerEta2: +o.toFixed(3), p: +((1 + c) / 501).toFixed(4) });
  }
  out.shared.panel81 = { nTestable: panel.length, nSignificantP05: panel.filter((r) => r.p < 0.05).length, nSignificantP001: panel.filter((r) => r.p <= 0.004).length, medianEta2: +median(panel.map((r) => r.registerEta2)).toFixed(3), suffixCopyRank: panel.slice().sort((a, b) => b.registerEta2 - a.registerEta2).findIndex((r) => r.stat === "para.suffixCopy") + 1, rows: panel }; }
writeJson("out/analysis-C.json", out);
const o2 = { ...out, shared: { ...out.shared, panel81: { ...out.shared.panel81, rows: undefined } } };
console.log(JSON.stringify(o2, null, 1));
