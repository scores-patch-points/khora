// attackC.mjs -- ATTACK C (multiplicity, shared property, permutation of pocket labels, leave-one-out). Reads table.json (atlas) only.  node attackC.mjs -> C_multiplicity.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, rngOf, seedOf, f, spearman } from "./lib.mjs";
const T = TABLE(), S = "order.entSlope", L = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8"));
const real = T.rows.filter((r) => r.kind === "real" && !r.thin && r.status !== "nodata");
const P = real.filter((r) => r.status === "P+" || r.status === "P-");
const out = { n390: real.length, nPresent: P.length, nPos: P.filter((r) => r.status === "P+").length };
// ---------- 1. multiplicity bookkeeping
const fp = L.falsePresent, stats = Object.values(L.statistics);
out.multiplicity = {
  nStatistics: T.stats.length, nRealPockets: T.rows.filter((r) => r.kind === "real").length, definedRealCells: fp.nDefinedRealCells, observedPresentRealCells: fp.observedPresentRealCells, shareObservedPresent: fp.observedPresentRealCells / fp.nDefinedRealCells,
  plantedIid: { halfCells: fp.plantedIid.halfCells, absZge4: fp.plantedIid.absZge4, pPresentPerCell: fp.plantedIid.pPresentFromRate4, expectedFalsePresentAllCells: fp.plantedIid.expectedFalseFromRate4, expectedFalsePresentEntSlope390: 390 * fp.plantedIid.pPresentFromRate4, ruleOfThreeUpperPerCell: fp.plantedIid.ruleOfThreeUpper, expectedFalseEntSlope390AtRuleOfThree: 390 * fp.plantedIid.ruleOfThreeUpper },
  controls20: { definedCells: fp.controls.definedCells, presentObserved: fp.controls.presentCellsObserved, entSlopeCellsInControls: T.rows.filter((r) => r.kind === "control").map((r) => r.status).reduce((a, s) => ((a[s] = (a[s] || 0) + 1), a), {}) },
  entSlopePresentExcessOverNull: P.length - 390 * fp.plantedIid.pPresentFromRate4,
};
const rev = stats.filter((s) => s.statuses.includes("REVERSAL")), balance = (s) => Math.min(s.nPos, s.nNeg) / Math.max(1, s.nPos + s.nNeg);
out.reversalCheapness = { nStatsWithStatusReversal: rev.length, of: stats.length, entSlopeMinoritySignShare: balance(stats.find((s) => s.stat === S)), rankByBalance: rev.map((s) => ({ stat: s.stat, pos: s.nPos, neg: s.nNeg, bal: balance(s) })).sort((a, b) => b.bal - a.bal).slice(0, 8),
  nReversalWithMinorityShareAtLeast20pct: rev.filter((s) => balance(s) >= 0.2).length, presentShareOfCellsInRevStats: rev.map((s) => (s.nPos + s.nNeg) / s.N).reduce((a, b) => a + b, 0) / rev.length };
// ---------- 2. eta2 + permutation machinery
const eta2 = (y, g) => { const n = y.length, m = y.reduce((a, b) => a + b, 0) / n, sst = y.reduce((a, b) => a + (b - m) ** 2, 0); if (sst === 0) return 0; const s = new Map(), c = new Map(); for (let i = 0; i < n; i++) { s.set(g[i], (s.get(g[i]) || 0) + y[i]); c.set(g[i], (c.get(g[i]) || 0) + 1); } let ssb = 0; for (const [k, v] of s) ssb += c.get(k) * (v / c.get(k) - m) ** 2; return ssb / sst; };
function permP(y, g, strata, tag, B = 2000) {
  const rnd = rngOf(seedOf("attackC", tag)), obs = eta2(y, g), by = new Map(); strata.forEach((s, i) => { if (!by.has(s)) by.set(s, []); by.get(s).push(i); });
  const gg = g.slice(); let ge = 0, mean = 0;
  for (let b = 0; b < B; b++) { for (const ix of by.values()) { const lab = ix.map((i) => g[i]); for (let i = lab.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [lab[i], lab[j]] = [lab[j], lab[i]]; } ix.forEach((i, k) => (gg[i] = lab[k])); } const e = eta2(y, gg); mean += e; if (e >= obs - 1e-12) ge++; }
  return { eta2: obs, nullMean: mean / B, p: (ge + 1) / (B + 1) };
}
const ySign = P.map((r) => (r.status === "P+" ? 1 : 0)), all1 = P.map(() => "all"), att = { register: P.map((r) => r.register), group: P.map((r) => r.group), language: P.map((r) => r.language), script: P.map((r) => r.script), grain: P.map((r) => r.grain), groupLang: P.map((r) => r.group + "|" + r.language), groupGrain: P.map((r) => r.group + "|" + r.grain) };
out.signSplit = { n: P.length, levels: Object.fromEntries(Object.entries(att).map(([k, v]) => [k, new Set(v).size])) };
for (const k of ["register", "group", "language", "script", "grain"]) out.signSplit[k + "_plainPerm"] = permP(ySign, att[k], all1, "sign-" + k);
out.signSplit.registerWithinGroup = permP(ySign, att.register, att.group, "reg|group");
out.signSplit.registerWithinLanguage = permP(ySign, att.register, att.language, "reg|lang");
out.signSplit.registerWithinGroupLanguage = permP(ySign, att.register, att.groupLang, "reg|grouplang");
out.signSplit.registerWithinGroupGrain = permP(ySign, att.register, att.groupGrain, "reg|groupgrain");
out.signSplit.languageWithinRegister = permP(ySign, att.language, att.register, "lang|reg");
out.signSplit.groupWithinRegister = permP(ySign, att.group, att.register, "group|reg");
// English-only (language starts with en): register within group
const E = P.filter((r) => /^(en|eng)/.test(r.language)), yE = E.map((r) => (r.status === "P+" ? 1 : 0));
out.signSplit.englishOnly = { n: E.length, nPos: yE.reduce((a, b) => a + b, 0), register_plainPerm: permP(yE, E.map((r) => r.register), E.map(() => "a"), "en-reg"), registerWithinGroup: permP(yE, E.map((r) => r.register), E.map((r) => r.group), "en-reg|group") };
const NE = P.filter((r) => !/^(en|eng)/.test(r.language)), yN = NE.map((r) => (r.status === "P+" ? 1 : 0));
out.signSplit.nonEnglish = { n: NE.length, nPos: yN.reduce((a, b) => a + b, 0), register_plainPerm: permP(yN, NE.map((r) => r.register), NE.map(() => "a"), "ne-reg") };
out.signSplit.signShareByLanguageClass = { english: { n: E.length, pos: yE.reduce((a, b) => a + b, 0) }, nonEnglish: { n: NE.length, pos: yN.reduce((a, b) => a + b, 0) } };
fs.writeFileSync(path.join(HERE, "C_multiplicity_part1.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.multiplicity)); console.log(JSON.stringify(out.reversalCheapness)); console.log(JSON.stringify(out.signSplit, null, 0));
