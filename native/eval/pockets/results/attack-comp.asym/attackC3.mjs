// attackC3.mjs -- ATTACK C part 3: how many cells did the atlas test, what do the null worlds predict, and is the comp.asym register effect special among the statistics the atlas could have selected?
//  (1) cell counts and expected false PRESENT cells (iid planted rate, shuffled-real control rate, t(9) reference) for the atlas and for comp.asym alone;
//  (2) calibration of comp.asym itself: its z in the 2 iid planted worlds and the 20 shuffled-real controls (half cells, |z| >= 2 / >= 4) against the t(9) reference;
//  (3) family-wise register test over EVERY statistic with status REVERSAL (>= 3 PRESENT pockets of each sign): one permutation of the register labels per draw shared by all statistics, eta^2 of the sign split
//      standardised per statistic (mean/sd over draws), maximum over statistics per draw -> family-wise p of comp.asym's standardised eta^2, and the same with register labels permuted within language strata.
// Output C3.json.   node attackC3.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE } from "./lib.mjs";
import { langOf } from "./langnorm.mjs";
import { seedOf, rngOf } from "../../lib/pocket.mjs";
import { dummyCats, eta2Cat, shuffleInPlace } from "../../classify-lib.mjs";
const D = 2000, M = JSON.parse(fs.readFileSync(path.join(HERE, "../atlas-matrix.json"), "utf8")), LT = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8"));
const round = (x, d = 4) => (Number.isFinite(x) ? Number(x.toPrecision(d)) : x), S = M.statistics, I = S.indexOf("comp.asym");
const real = M.pockets.filter((p) => p.kind === "real" && !p.thin), out = {};
// (1)
const fp = LT.falsePresent, pIid = fp.binomialReference.p, defined = fp.nDefinedRealCells, nA = real.filter((p) => ["P+", "P-", "A", "M"].includes(p.cells[I][4])).length;
const lg = (x) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (const k of c) s += k / ++y; return -t + Math.log((2.5066282746310005 * s) / x); };
const tdens = (x, df) => Math.exp(lg((df + 1) / 2) - lg(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log(1 + (x * x) / df));
const tTail = (t, df = 9) => { let s = 0; const h = 0.001, top = 400; for (let x = t; x < top; x += h) s += 0.5 * (tdens(x, df) + tdens(x + h, df)) * h; return 2 * s; };
const p4 = tTail(4), p2 = tTail(2);
out.counts = { statistics: S.length, realNonThinPockets: real.length, cellsTotal: S.length * real.length, definedRealCells: defined, observedPresentRealCells: fp.observedPresentRealCells, shareObservedPresent: round(fp.observedPresentRealCells / defined),
  iidPlantedRate4: fp.plantedIid.rate4, pPresentPerCellFromIid: pIid, expectedFalsePresentAtlas: round(defined * pIid), expectedFalsePresentCompAsym: round(nA * pIid), nCompAsymDefined: nA,
  binomP_atLeast3OfOneSignAsym: round((() => { let s = 0; const n = nA; for (let k = 3; k <= 12; k++) { let l = 0; for (let t = 1; t <= k; t++) l += Math.log((n - t + 1) / t); s += Math.exp(l + k * Math.log(pIid / 2) + (n - k) * Math.log(1 - pIid / 2)); } return s; })(), 3),
  controlsRate4: fp.controls.rate4, controlsPresentCells: fp.controls.presentCellsObserved, t9TailGE4: round(p4), t9TailGE2: round(p2), t9PresentPerCell: round((p4 / 2) ** 2 * 2) };
// (2)
const nulls = M.pockets.filter((p) => p.kind !== "real").filter((p) => p.id === "pl-null" || p.id === "pl-null2" || p.kind === "control");
const zs = []; for (const p of nulls) { const c = p.cells[I]; if (c && Number.isFinite(c[1]) && Number.isFinite(c[3])) zs.push(c[1], c[3]); }
out.nullCalibration = { halfCells: zs.length, ge2: zs.filter((z) => Math.abs(z) >= 2).length, ge4: zs.filter((z) => Math.abs(z) >= 4).length, expectedGe2: round(zs.length * p2), expectedGe4: round(zs.length * p4), zAll: zs.map((z) => round(z, 3)),
  sdOfZ: round(Math.sqrt(zs.reduce((a, b) => a + b * b, 0) / zs.length)), t9Sd: round(Math.sqrt(9 / 7)) };
// (3)
const regs = real.map((p) => p.register), lang = real.map((p) => langOf(p.language)), idx = real.map((_, i) => i);
const rev = []; S.forEach((s, j) => { let a = 0, b = 0; real.forEach((p) => { const st = p.cells[j]?.[4]; if (st === "P+") a++; else if (st === "P-") b++; }); if (a >= 3 && b >= 3) rev.push({ stat: s, j, nPos: a, nNeg: b }); });
const dc = dummyCats(regs), cat = dc.cat;
const members = rev.map((r) => { const ix = idx.filter((i) => ["P+", "P-"].includes(real[i].cells[r.j][4])); return { ...r, ix, y: ix.map((i) => (real[i].cells[r.j][4] === "P+" ? 1 : 0)) }; });
const etaFor = (m, c) => { const lab = m.ix.map((i) => c[i]); return eta2Cat(m.y, lab, dc.k); };
function family(strata, seed) {
  const rnd = rngOf(seed), sm = new Map(); if (strata) lang.forEach((l, i) => { if (!sm.has(l)) sm.set(l, []); sm.get(l).push(i); });
  const groups = strata ? [...sm.values()] : [idx], cur = cat.slice(), E = members.map(() => new Float64Array(D));
  for (let d = 0; d < D; d++) { for (const g of groups) { const v = g.map((i) => cat[i]); shuffleInPlace(v, rnd); g.forEach((i, t) => { cur[i] = v[t]; }); } members.forEach((m, k) => { E[k][d] = etaFor(m, cur); }); }
  const obs = members.map((m) => etaFor(m, cat)), mu = E.map((e) => e.reduce((a, b) => a + b, 0) / D), sd = E.map((e, k) => Math.sqrt(e.reduce((a, b) => a + (b - mu[k]) ** 2, 0) / (D - 1)));
  const zo = obs.map((o, k) => (o - mu[k]) / sd[k]), maxZ = new Float64Array(D); for (let d = 0; d < D; d++) { let mx = -Infinity; for (let k = 0; k < members.length; k++) mx = Math.max(mx, (E[k][d] - mu[k]) / sd[k]); maxZ[d] = mx; }
  const ka = members.findIndex((m) => m.stat === "comp.asym"), own = (k) => (1 + E[k].filter((e) => e >= obs[k] - 1e-12).length) / (1 + D), fw = (k) => (1 + [...maxZ].filter((x) => x >= zo[k] - 1e-12).length) / (1 + D);
  return { nStatistics: members.length, compAsym: { eta2: round(obs[ka]), stdEta2: round(zo[ka]), ownP: round(own(ka)), familyWiseP: round(fw(ka)), rankByStdEta2: 1 + zo.filter((z) => z > zo[ka]).length },
    perStat: members.map((m, k) => ({ stat: m.stat, nPos: m.nPos, nNeg: m.nNeg, eta2: round(obs[k]), stdEta2: round(zo[k]), ownP: round(own(k)), familyWiseP: round(fw(k)) })).sort((a, b) => b.stdEta2 - a.stdEta2) };
}
out.familyWise = { plain: family(null, seedOf("attack-comp.asym", "fam-plain")), withinLanguage: family("lang", seedOf("attack-comp.asym", "fam-lang")) };
out.familyWise.nStatisticsWithOwnPlainPle0035 = out.familyWise.plain.perStat.filter((r) => r.ownP <= 0.0035).length;
out.familyWise.nStatisticsWithOwnLangPle005 = out.familyWise.withinLanguage.perStat.filter((r) => r.ownP <= 0.05).length;
fs.writeFileSync(path.join(HERE, "C3.json"), JSON.stringify(out, null, 1));
const brief = { counts: out.counts, nullCalibration: { ...out.nullCalibration, zAll: undefined }, plain: { ...out.familyWise.plain, perStat: out.familyWise.plain.perStat.slice(0, 6) }, lang: { ...out.familyWise.withinLanguage, perStat: out.familyWise.withinLanguage.perStat.slice(0, 6) } };
console.error(JSON.stringify(brief));
