// attackC3.mjs -- ATTACK C part 3: leave-one-pocket/register/group/language-out of the shared-property eta^2, leave-one-out sign prediction from register/group, register purity permutation,
// register-only family-wise max-Z over statistics, sign split inside strata.   node attackC3.mjs -> attackC3.json   (imports attackC2.mjs: re-runs it, ~30 s)
import { P, n, S, DEP, cats, effect, shuffled, indicator, signSplit, etaCat, K, rngOf, seedOf, HERE, fs, path } from "./attackC.mjs";
const res = {}, I = indicator(DEP), SG = signSplit(DEP), ixI = I.ix, ixS = SG.ix, mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const BP = 400;
const etaOn = (y, attr, ix) => etaCat(y, cats[attr], ix, K(cats[attr]));
function pOf(y, attr, ix, rnd, B) {
  const lab = cats[attr], obs = etaCat(y, lab, ix, K(lab)); let ex = 0;
  for (let b = 0; b < B; b++) { const s = shuffled(rnd, ix.length), tmp = new Int32Array(n); for (let k = 0; k < ix.length; k++) tmp[ix[k]] = lab[ix[s[k]]]; if (etaCat(y, tmp, ix, K(lab)) >= obs) ex++; }
  return { eta2: obs, p: (1 + ex) / (1 + B) };
}
const summar = (rows) => ({ n: rows.length, etaMin: Math.min(...rows.map((r) => r.eta2)), etaMax: Math.max(...rows.map((r) => r.eta2)), pMax: Math.max(...rows.map((r) => r.p)), nPgt05: rows.filter((r) => r.p > 0.05).length, worst: rows.reduce((a, b) => (b.p > a.p || (b.p === a.p && b.eta2 < a.eta2) ? b : a)) });
const rnd = rngOf(seedOf("attack-depLen", "C3", "loo"));
// ---- leave-one-pocket-out
const looP = [], looS = [];
for (const i of ixI) looP.push({ drop: P[i].id, ...pOf(I.y, "register", ixI.filter((j) => j !== i), rnd, BP) });
for (const i of ixS) looS.push({ drop: P[i].id, ...pOf(SG.y, "register", ixS.filter((j) => j !== i), rnd, BP) });
res.leaveOnePocketOut = { presenceRegister: summar(looP), signSplitRegister: summar(looS), permutations: BP };
console.log("LOO pocket: presence register", JSON.stringify(res.leaveOnePocketOut.presenceRegister), "\n signSplit", JSON.stringify(res.leaveOnePocketOut.signSplitRegister));
// ---- leave-one-LEVEL-out (register, group, language): drop every pocket of the level
for (const key of ["register", "group", "language"]) {
  const levels = [...new Set(P.map((p) => p[key]))].sort(), rp = [], rs = [];
  for (const lv of levels) {
    const ip = ixI.filter((j) => P[j][key] !== lv), is = ixS.filter((j) => P[j][key] !== lv);
    if (ip.length === ixI.length || is.length < 30) continue;
    rp.push({ drop: lv, nDropped: ixI.length - ip.length, ...pOf(I.y, "register", ip, rnd, BP) }); rs.push({ drop: lv, nDropped: ixS.length - is.length, ...pOf(SG.y, "register", is, rnd, BP) });
  }
  res["leaveOne_" + key + "_Out"] = { presenceRegister: summar(rp), signSplitRegister: summar(rs) };
  console.log("LOO", key, "presence:", JSON.stringify(summar(rp)), "\n   signSplit:", JSON.stringify(summar(rs)));
}
// ---- sign prediction: leave-one-out majority of the other PRESENT pockets with the same label (fallback global majority)
const signs = ixS.map((i) => SG.y[i]);
function looAcc(labOf) {
  let ok = 0;
  for (let a = 0; a < ixS.length; a++) {
    let s = 0, c = 0, gs = 0; for (let b = 0; b < ixS.length; b++) { if (b === a) continue; gs += signs[b] ? 1 : -1; if (labOf(ixS[b]) === labOf(ixS[a])) { s += signs[b] ? 1 : -1; c++; } }
    const pred = c && s !== 0 ? s > 0 : gs > 0; if (pred === !!signs[a]) ok++;
  }
  return ok / ixS.length;
}
const regOf = (i) => P[i].register, grpOf = (i) => P[i].group, cdOf = (i) => (P[i].group === "cd" ? "cd" : "other"), baseline = Math.max(mean(signs), 1 - mean(signs));
const accReg = looAcc(regOf), accGrp = looAcc(grpOf), accCd = looAcc(cdOf);
const rnd3 = rngOf(seedOf("attack-depLen", "C3", "acc")), BA = 5000, nullReg = [], nullGrp = [];
for (let b = 0; b < BA; b++) { const s = shuffled(rnd3, ixS.length), perm = new Map(ixS.map((j, k) => [j, ixS[s[k]]])); nullReg.push(looAccPerm(regOf, perm)); nullGrp.push(looAccPerm(grpOf, perm)); }
function looAccPerm(labOf, perm) { return looAcc((i) => labOf(perm.get(i))); }
const pAcc = (acc, nl) => (1 + nl.filter((x) => x >= acc).length) / (1 + nl.length);
res.signPrediction = { nPresent: ixS.length, nPositive: signs.filter(Boolean).length, majorityBaseline: baseline, looAccuracyRegister: accReg, looAccuracyGroup: accGrp, looAccuracyCdVsOther: accCd,
  pRegisterVsPermutedLabels: pAcc(accReg, nullReg), pGroupVsPermutedLabels: pAcc(accGrp, nullGrp), permutations: BA, nullRegisterMean: mean(nullReg), nullGroupMean: mean(nullGrp) };
console.log("sign prediction", JSON.stringify(res.signPrediction));
// ---- register purity: registers with >= 4 PRESENT pockets; count of registers whose PRESENT pockets all share one sign, versus label-permutation null
const regs = [...new Set(ixS.map(regOf))].filter((r) => ixS.filter((i) => regOf(i) === r).length >= 4).sort();
const pure = (sgnOf) => regs.filter((r) => { const s = ixS.filter((i) => regOf(i) === r).map((i) => sgnOf(i)); return s.every((x) => x === s[0]); }).length;
const obsPure = pure((i) => SG.y[i]); let exPure = 0; const rnd4 = rngOf(seedOf("attack-depLen", "C3", "pure")), BQ = 20000;
for (let b = 0; b < BQ; b++) { const s = shuffled(rnd4, ixS.length), m = new Map(ixS.map((j, k) => [j, SG.y[ixS[s[k]]]])); if (pure((i) => m.get(i)) >= obsPure) exPure++; }
res.purity = { registersWith4plus: regs.length, pureRegisters: obsPure, p: (1 + exPure) / (1 + BQ), table: regs.map((r) => ({ register: r, pos: ixS.filter((i) => regOf(i) === r && SG.y[i]).length, neg: ixS.filter((i) => regOf(i) === r && !SG.y[i]).length })) };
console.log("purity", JSON.stringify(res.purity));
// ---- sign split inside strata: non-cd groups; cd only; word-grain prose groups
const strata = { nonCd: (i) => P[i].group !== "cd", cdOnly: (i) => P[i].group === "cd", wordGrain: (i) => P[i].grain === "word", nonCdWord: (i) => P[i].group !== "cd" && P[i].grain === "word" };
res.signSplitStrata = {};
for (const [k, f] of Object.entries(strata)) { const ix = ixS.filter(f), np = ix.filter((i) => SG.y[i]).length; res.signSplitStrata[k] = { n: ix.length, pos: np, neg: ix.length - np, register: pOf(SG.y, "register", ix, rnd, 2000), group: pOf(SG.y, "group", ix, rnd, 2000) }; }
console.log("sign split strata", JSON.stringify(res.signSplitStrata));
// ---- register-only family-wise: max over statistics of Z_register under 2000 permutations
const BF = 2000, rnd5 = rngOf(seedOf("attack-depLen", "C", "family")), perms = Array.from({ length: BF }, () => shuffled(rnd5, n)), zs = [];
for (let si = 0; si < S.length; si++) {
  const { y, ix } = indicator(si); if (ix.length < 60) continue; const np = ix.filter((i) => y[i]).length; if (np < 3 || np > ix.length - 3) continue;
  const o = effect(y, "register", ix), nl = perms.map((pm) => effect(y, "register", ix, pm)), m = mean(nl), sd = Math.sqrt(nl.reduce((a, b) => a + (b - m) ** 2, 0) / (BF - 1));
  zs.push({ si, Z: (o - m) / sd, nl: nl.map((x) => (x - m) / sd) });
}
const dz = zs.find((t) => t.si === DEP).Z, maxP = perms.map((_, b) => Math.max(...zs.map((t) => t.nl[b])));
res.registerOnlyFamily = { nStats: zs.length, depLenRegisterZ: dz, adjustedP: (1 + maxP.filter((m) => m >= dz).length) / (1 + BF), medianMaxZ: maxP.slice().sort((a, b) => a - b)[BF >> 1], maxMaxZ: Math.max(...maxP) };
console.log("register-only family:", JSON.stringify(res.registerOnlyFamily));
fs.writeFileSync(path.join(HERE, "attackC3.json"), JSON.stringify(res, null, 1));
