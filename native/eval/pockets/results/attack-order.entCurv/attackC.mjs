// attackC.mjs -- ATTACK C (multiplicity and the SHARED PROPERTY) on order.entCurv. Reads table.json and the atlas planted / control cells only.
//  C0  cells tested, false-PRESENT expectation: exact t_9 reference (z uses a 10-draw sd), the atlas iid-world rate, and the entCurv-specific cells of the iid worlds and of the 20 law-free controls.
//  C1  SHARED PROPERTY of PRESENT pockets (indicator PRESENT vs not, n = 390) and SIGN SPLIT (P+ vs P-, n = 179): the atlas's own sharedProperty() re-run with 2000 permutations of pocket labels (own seed).
//  C2  the same with permutations STRATIFIED by corpus group (indicator permuted only within group): does the attribute explain beyond the source-family?
//  C3  leave-one-pocket-out: every pocket removed in turn (200 permutations each): range of eta2 / p, how often the best attribute stays "register".
//  C4  leave-one-LEVEL-out: every register, every group, the code grain, the char-bigram grain, the Hebrew script removed in turn (1000 permutations).
//  C5  out-of-sample sign / presence prediction (LOO majority-vote by register, group, grain, script; 1-D unit-length and token-count thresholds): is "register" needed, or do cruder properties do as well?
//  C6  what remains of the REVERSAL outside code and outside char-bigram grain: the list of word-grain P- pockets.
//   node attackC.mjs -> C_multiplicity.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, f, rngOf, seedOf } from "./lib.mjs";
import { sharedProperty } from "../../classify-prop.mjs";
import { dummyCats, shuffleInPlace, eta2Cat } from "../../classify-lib.mjs";
const T = TABLE(), S = "order.entCurv", DRAWS = 2000;
const real = T.rows.filter((r) => r.kind === "real" && !r.thin && r.zs[S] && r.zs[S][0] != null && r.zs[S][1] != null && r.vs[S][0] != null && r.vs[S][1] != null);
const res = { nDefined: real.length };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
// ---------------------------------------------------------------- C0
{
  // exact tail of z = (v - mhat)/shat with mhat, shat from 10 null draws: z = sqrt(1.1) * t_9
  const lg = (x) => { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for (let j = 0; j < 6; j++) s += c[j] / ++y; return -t + Math.log(2.5066282746310005 * s / x); };
  const dens = (t, nu) => Math.exp(lg((nu + 1) / 2) - lg(nu / 2)) / Math.sqrt(nu * Math.PI) * Math.pow(1 + t * t / nu, -(nu + 1) / 2);
  const tail = (a, nu) => { let s = 0; const h = 1e-3; for (let t = a; t < 400; t += h) s += dens(t + h / 2, nu) * h; return s; }; // one-sided P(T > a)
  const t4 = 4 / Math.sqrt(1.1), p1 = tail(t4, 9), p2 = tail(2 / Math.sqrt(1.1), 9);
  res.C0 = { exactNullTail: { oneSidedP_z_ge4: p1, twoSidedP: 2 * p1, presentPerCell: 2 * p1 * p1, absentBothHalves_given_null: (1 - 2 * p2) ** 2 } };
  const cellsEnt = real.length, lawTable = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8")).falsePresent;
  res.C0.atlasCells = { realDefinedCellsAllStats: lawTable.nDefinedRealCells, observedPresentRealCellsAllStats: lawTable.observedPresentRealCells, shareObservedPresent: +(lawTable.observedPresentRealCells / lawTable.nDefinedRealCells).toFixed(4), iidWorldRate4: lawTable.plantedIid.rate4, pPresentFromRate4: lawTable.plantedIid.pPresentFromRate4 };
  const nPresentEnt = real.filter((r) => r.status === "P+" || r.status === "P-").length;
  res.C0.entCurv = { cells: cellsEnt, present: nPresentEnt, expectedFalsePresent_exactT9: +(cellsEnt * 2 * p1 * p1).toFixed(5), expectedFalsePresent_atlasRate: +(cellsEnt * lawTable.plantedIid.pPresentFromRate4).toFixed(4), binomialP_atLeastObserved_exactT9: nPresentEnt > 5 ? "< 1e-300 (underflow)" : null };
  const nonReal = T.rows.filter((r) => r.kind !== "real" && r.zs[S] && r.zs[S][0] != null);
  const iid = nonReal.filter((r) => ["pl-null", "pl-null2"].includes(r.id)), ctl = nonReal.filter((r) => r.id.startsWith("ct-")), structured = nonReal.filter((r) => r.id.startsWith("pl-") && !["pl-null", "pl-null2"].includes(r.id));
  const cnt = (rs) => { const hz = rs.flatMap((r) => r.zs[S]), n4 = hz.filter((z) => Math.abs(z) >= 4).length, n2 = hz.filter((z) => Math.abs(z) >= 2).length; return { pockets: rs.length, halfCells: hz.length, absZge4: n4, absZge2: n2, present: rs.filter((r) => r.st[S] === "P+" || r.st[S] === "P-").length, maxAbsZ: +Math.max(...hz.map(Math.abs)).toFixed(2) }; };
  res.C0.iidWorlds = cnt(iid); res.C0.lawFreeControls = cnt(ctl); res.C0.structuredPlanted = { ...cnt(structured), detail: structured.map((r) => ({ id: r.id, v: r.vs[S].map((x) => +x.toFixed(4)), z: r.zs[S].map((x) => +x.toFixed(1)), status: r.st[S] })) };
  const sel = JSON.parse(fs.readFileSync(path.join(HERE, "../law-table.json"), "utf8")).statistics;
  const rv = sel.filter((s) => s.statuses?.includes("REVERSAL") || s.statuses?.includes("POCKET-SPECIFIC")), withShared = rv.filter((s) => s.sharedProperty && s.sharedProperty.pMax < 0.05);
  res.C0.selection = { statsWithReversalOrPocketSpecific: rv.length, ofWhichSharedPmaxBelow005: withShared.length, totalStats: sel.length, note: "entCurv was one of the top 8 by heterogeneity among these; a selection among ~" + withShared.length + " candidates, not among 81" };
}
// ---------------------------------------------------------------- attribute builders
const attrsFor = (rs) => [
  ...["group", "register", "script"].map((n) => ({ name: n, type: "cat", ...dummyCats(rs.map((r) => r[n])) })),
  { name: "tokens", type: "num", x: rs.map((r) => Math.log10(r.tokens)) }, { name: "meanUnitLength", type: "num", x: rs.map((r) => Math.log10(r.mul)) }, { name: "docs", type: "num", x: rs.map((r) => Math.log10(r.docs)) },
];
const present = (r) => r.status === "P+" || r.status === "P-";
const indPres = (rs) => rs.map((r) => (present(r) ? 1 : 0)), indSign = (rs) => rs.map((r) => (r.status === "P+" ? 1 : 0));
const strip = (sp) => sp && { n: sp.n, nPresent: sp.nPresent, rows: sp.rows.map((x) => ({ attr: x.attr, eta2: +x.eta2.toFixed(4), p: +x.p.toFixed(5), levels: x.levels })), best: { ...sp.best, eta2: +sp.best.eta2.toFixed(4) }, pMax: +sp.pMax.toFixed(5) };
// ---------------------------------------------------------------- C1
const presentRows = real.filter(present);
res.C1 = { presence: strip(sharedProperty(indPres(real), attrsFor(real), DRAWS, seedOf("attackC", "C1", "presence"))), sign: strip(sharedProperty(indSign(presentRows), attrsFor(presentRows), DRAWS, seedOf("attackC", "C1", "sign"))) };
// expected eta2 of register under permutation (shows the cardinality inflation)
{ const rnd = rngOf(seedOf("attackC", "inflation")); const at = attrsFor(real).find((a) => a.name === "register"), y = indPres(real); let s = 0; for (let d = 0; d < 300; d++) { shuffleInPlace(y, rnd); s += eta2Cat(y, at.cat, at.k); } res.C1.registerEta2ExpectedUnderPermutation_presence = +(s / 300).toFixed(4);
  const at2 = attrsFor(presentRows).find((a) => a.name === "register"), y2 = indSign(presentRows); s = 0; for (let d = 0; d < 300; d++) { shuffleInPlace(y2, rnd); s += eta2Cat(y2, at2.cat, at2.k); } res.C1.registerEta2ExpectedUnderPermutation_sign = +(s / 300).toFixed(4); }
// ---------------------------------------------------------------- C2 stratified permutation
function stratifiedP(rs, ind, strataKey, attrName, draws, seed) {
  const at = attrsFor(rs).find((a) => a.name === attrName), strata = new Map(); rs.forEach((r, i) => { const k = r[strataKey]; if (!strata.has(k)) strata.set(k, []); strata.get(k).push(i); });
  const eff = (y) => { if (at.type === "cat") return eta2Cat(y, at.cat, at.k); const n = y.length, mx = mean(at.x), my = mean(y); let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (at.x[i] - mx) * (y[i] - my); sxx += (at.x[i] - mx) ** 2; syy += (y[i] - my) ** 2; } return sxx > 0 && syy > 0 ? sxy * sxy / (sxx * syy) : 0; };
  const obs = eff(ind), rnd = rngOf(seed), y = ind.slice(); let ge = 0, sum = 0;
  for (let d = 0; d < draws; d++) { for (const ix of strata.values()) { const v = ix.map((i) => ind[i]); shuffleInPlace(v, rnd); ix.forEach((i, j) => (y[i] = v[j])); } const e = eff(y); sum += e; if (e >= obs - 1e-12) ge++; }
  return { attr: attrName, eta2: +obs.toFixed(4), expectedUnderStratifiedPerm: +(sum / draws).toFixed(4), p: +((1 + ge) / (1 + draws)).toFixed(5) };
}
res.C2 = { strata: "group", presence: ["register", "script", "tokens", "meanUnitLength", "docs"].map((a) => stratifiedP(real, indPres(real), "group", a, DRAWS, seedOf("attackC", "C2p", a))), sign: ["register", "script", "tokens", "meanUnitLength", "docs"].map((a) => stratifiedP(presentRows, indSign(presentRows), "group", a, DRAWS, seedOf("attackC", "C2s", a))) };
res.C2.strataByGrain = { presence: ["register", "meanUnitLength"].map((a) => stratifiedP(real, indPres(real), "grain", a, DRAWS, seedOf("attackC", "C2gp", a))), sign: ["register", "meanUnitLength", "script"].map((a) => stratifiedP(presentRows, indSign(presentRows), "grain", a, DRAWS, seedOf("attackC", "C2gs", a))) };
// ---------------------------------------------------------------- C3 leave-one-pocket-out
function loo(rs, indFn, draws, tag) {
  const out = []; let stillRegister = 0, maxP = 0, minEta = 1, maxEta = 0, maxPMax = 0;
  for (let i = 0; i < rs.length; i++) {
    const sub = rs.filter((_, j) => j !== i), sp = sharedProperty(indFn(sub), attrsFor(sub), draws, seedOf("attackC", tag, "loo", i));
    if (!sp) continue; if (sp.best.attr === "register") stillRegister++;
    const reg = sp.rows.find((x) => x.attr === "register"); maxP = Math.max(maxP, reg.p); minEta = Math.min(minEta, reg.eta2); maxEta = Math.max(maxEta, reg.eta2); maxPMax = Math.max(maxPMax, sp.pMax);
    out.push([rs[i].id, +reg.eta2.toFixed(4), +reg.p.toFixed(4)]);
  }
  return { removed: out.length, bestStillRegister: stillRegister, registerEta2Range: [+minEta.toFixed(4), +maxEta.toFixed(4)], registerMaxP: +maxP.toFixed(4), maxPMaxAcrossAttrs: +maxPMax.toFixed(4), minP_possible: +(1 / (1 + draws)).toFixed(4), worst: out.sort((a, b) => a[1] - b[1]).slice(0, 5) };
}
res.C3 = { presence: loo(real, indPres, 200, "presence"), sign: loo(presentRows, indSign, 200, "sign") };
// ---------------------------------------------------------------- C4 leave-one-level-out
function leaveLevel(rs, indFn, key, draws, tag, test = (r, lev) => r[key] === lev) {
  const levels = [...new Set(rs.map((r) => r[key]))], out = [];
  for (const lev of levels) {
    const sub = rs.filter((r) => !test(r, lev)); if (sub.length < 20) continue;
    const ind = indFn(sub), n1 = ind.reduce((a, b) => a + b, 0); if (n1 < 3 || n1 > ind.length - 3) { out.push({ removed: lev, nLeft: sub.length, note: "indicator degenerate" }); continue; }
    const sp = sharedProperty(ind, attrsFor(sub), draws, seedOf("attackC", tag, key, lev)); if (!sp) continue;
    const reg = sp.rows.find((x) => x.attr === "register");
    out.push({ removed: lev, nLeft: sub.length, nIndicator1: n1, bestAttr: sp.best.attr, bestEta2: +sp.best.eta2.toFixed(4), bestP: +sp.best.p.toFixed(4), registerEta2: +reg.eta2.toFixed(4), registerP: +reg.p.toFixed(4), pMax: +sp.pMax.toFixed(4) });
  }
  return out;
}
const biggest = (rs, key, k) => { const c = new Map(); rs.forEach((r) => c.set(r[key], (c.get(r[key]) || 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map((x) => x[0]); };
res.C4 = { presence: { byGroup: leaveLevel(real, indPres, "group", 1000, "p-group"), byGrain: leaveLevel(real, indPres, "grain", 1000, "p-grain"), byRegister_top10: leaveLevel(real.filter((r) => biggest(real, "register", 10).includes(r.register) || true), indPres, "register", 1000, "p-reg").filter((x) => biggest(real, "register", 10).includes(x.removed)) },
  sign: { byGroup: leaveLevel(presentRows, indSign, "group", 1000, "s-group"), byGrain: leaveLevel(presentRows, indSign, "grain", 1000, "s-grain"), byRegister_top10: leaveLevel(presentRows, indSign, "register", 1000, "s-reg").filter((x) => biggest(presentRows, "register", 10).includes(x.removed)),
    removeCodeAndCharbigramAndHebrew: (() => { const sub = presentRows.filter((r) => r.grain !== "code" && r.grain !== "charbigram" && r.script !== "hebr" && r.grain !== "notation"), ind = indSign(sub), n1 = ind.reduce((a, b) => a + b, 0), n0 = ind.length - n1; const sp = sharedProperty(ind, attrsFor(sub), 1000, seedOf("attackC", "s-nocode")); return { nLeft: sub.length, nPlus: n1, nMinus: n0, shared: strip(sp) }; })() } };
// ---------------------------------------------------------------- C5 LOO prediction
const maj = (xs) => (xs.reduce((a, b) => a + b, 0) / xs.length >= 0.5 ? 1 : 0);
function looCat(rs, ind, key) { let ok = 0; for (let i = 0; i < rs.length; i++) { const same = [], all = []; for (let j = 0; j < rs.length; j++) if (j !== i) { all.push(ind[j]); if (rs[j][key] === rs[i][key]) same.push(ind[j]); } if ((same.length ? maj(same) : maj(all)) === ind[i]) ok++; } return +(ok / rs.length).toFixed(4); }
function looThreshold(rs, ind, getx) { // 1-D: best single threshold + direction learned on the other pockets
  const xs = rs.map(getx); let ok = 0;
  for (let i = 0; i < rs.length; i++) {
    const idx = rs.map((_, j) => j).filter((j) => j !== i).sort((a, b) => xs[a] - xs[b]); let best = { acc: -1 };
    const tot1 = idx.reduce((s, j) => s + ind[j], 0); let c1 = 0;
    for (let k = 0; k < idx.length - 1; k++) { c1 += ind[idx[k]]; const nLow = k + 1, accHi1 = ((nLow - c1) + (tot1 - c1)) / idx.length, accLo1 = (c1 + (idx.length - nLow - (tot1 - c1))) / idx.length; // hi=1 : low predicted 0
      const cut = (xs[idx[k]] + xs[idx[k + 1]]) / 2; if (accHi1 > best.acc) best = { acc: accHi1, cut, hi: 1 }; if (accLo1 > best.acc) best = { acc: accLo1, cut, hi: 0 }; }
    const pred = xs[i] > best.cut ? best.hi : 1 - best.hi; if (pred === ind[i]) ok++;
  }
  return +(ok / rs.length).toFixed(4);
}
{
  const out = {};
  for (const [name, rs, ind] of [["sign", presentRows, indSign(presentRows)], ["presence", real, indPres(real)]]) {
    const base = Math.max(mean(ind), 1 - mean(ind));
    out[name] = { n: rs.length, majorityBaseline: +base.toFixed(4), register: looCat(rs, ind, "register"), group: looCat(rs, ind, "group"), grain: looCat(rs, ind, "grain"), script: looCat(rs, ind, "script"), language: looCat(rs, ind, "language"),
      meanUnitLength_threshold: looThreshold(rs, ind, (r) => r.mul), tokens_threshold: looThreshold(rs, ind, (r) => r.tokens), rareCurveSign: null };
    const ok = rs.filter((r, i) => (r.v["order.rareCurve"] > 0 ? 1 : 0) === ind[i]).length; out[name].rareCurveSignAgreement = +(ok / rs.length).toFixed(4);
  }
  res.C5 = out;
}
// ---------------------------------------------------------------- C6 the negative arm outside code
res.C6 = { P_minus_all: presentRows.filter((r) => r.status === "P-").length, byGrain: Object.fromEntries(["word", "code", "notation", "charbigram"].map((g) => [g, { plus: presentRows.filter((r) => r.grain === g && r.status === "P+").length, minus: presentRows.filter((r) => r.grain === g && r.status === "P-").length }])),
  wordGrainMinus: presentRows.filter((r) => r.grain === "word" && r.status === "P-").map((r) => ({ id: r.id, register: r.register, language: r.language, script: r.script, mul: +r.mul.toFixed(1), v: +r.v[S].toFixed(4) })) };
fs.writeFileSync(path.join(HERE, "C_multiplicity.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ C0: res.C0, C1: { presence: res.C1.presence.rows, sign: res.C1.sign.rows, e1: res.C1.registerEta2ExpectedUnderPermutation_presence, e2: res.C1.registerEta2ExpectedUnderPermutation_sign } }, null, 0).slice(0, 4500));
