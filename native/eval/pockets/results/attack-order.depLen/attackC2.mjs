// attackC2.mjs -- ATTACK C part 2: permutations (20000 for depLen, 2000 for the family-wise max over 81 statistics x 6 attributes), within-group restricted permutation, leave-one-pocket/register/group/language-out,
// leave-one-out prediction of the sign from register.  Imports the helpers of attackC.mjs (which re-writes attackC.json with part 1, harmless).   node attackC2.mjs -> attackC2.json
import { P, n, S, DEP, ATTRS, cats, nums, effect, shuffled, indicator, signSplit, DEF, etaCat, K, rngOf, seedOf, HERE, fs, path } from "./attackC.mjs";
const res = {};
const I = indicator(DEP), SG = signSplit(DEP), ixI = I.ix, ixS = SG.ix;
const labelsOf = (attr) => cats[attr], mean = (a) => a.reduce((x, y) => x + y, 0) / a.length, sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
// permutation of labels among an index set `ix`: returns perm (Int32Array over 0..n-1) with perm[i] = pocket whose label/attribute pocket i receives
const permAmong = (rnd, ix) => { const p = Int32Array.from({ length: n }, (_, i) => i), s = shuffled(rnd, ix.length); for (let k = 0; k < ix.length; k++) p[ix[k]] = ix[s[k]]; return p; };
const permWithin = (rnd, ix, key) => { const p = Int32Array.from({ length: n }, (_, i) => i), by = new Map(); for (const i of ix) { const g = key(P[i]); if (!by.has(g)) by.set(g, []); by.get(g).push(i); } for (const g of [...by.keys()].sort()) { const m = by.get(g), s = shuffled(rnd, m.length); for (let k = 0; k < m.length; k++) p[m[k]] = m[s[k]]; } return p; };

// ---- C2a: depLen presence and sign-split, 20000 permutations, every attribute
const B = 20000, rnd0 = rngOf(seedOf("attack-depLen", "C", "perm20000"));
const obsI = Object.fromEntries(ATTRS.map((a) => [a, effect(I.y, a, ixI)])), obsS = Object.fromEntries(ATTRS.map((a) => [a, effect(SG.y, a, ixS)]));
const exI = Object.fromEntries(ATTRS.map((a) => [a, 0])), exS = Object.fromEntries(ATTRS.map((a) => [a, 0])), nullI = Object.fromEntries(ATTRS.map((a) => [a, []])), nullS = Object.fromEntries(ATTRS.map((a) => [a, []]));
let maxI = 0, maxS = 0;
for (let b = 0; b < B; b++) {
  const pI = permAmong(rnd0, ixI), pS = permAmong(rnd0, ixS);
  for (const a of ATTRS) {
    const e1 = effect(I.y, a, ixI, pI), e2 = effect(SG.y, a, ixS, pS);
    if (e1 >= obsI[a]) exI[a]++; if (e2 >= obsS[a]) exS[a]++;
    if (b < 2000) { nullI[a].push(e1); nullS[a].push(e2); }
  }
}
res.depLenPermutation = { B, presence: Object.fromEntries(ATTRS.map((a) => [a, { eta2: obsI[a], p: (1 + exI[a]) / (1 + B), nullMean: mean(nullI[a]), nullSd: sd(nullI[a]), nullMax: Math.max(...nullI[a]) }])),
  signSplit: Object.fromEntries(ATTRS.map((a) => [a, { eta2: obsS[a], p: (1 + exS[a]) / (1 + B), nullMean: mean(nullS[a]), nullSd: sd(nullS[a]), nullMax: Math.max(...nullS[a]) }])) };
console.log("C2a presence register: eta2 %s p %s null mean %s max %s | sign-split register eta2 %s p %s null mean %s max %s",
  obsI.register.toFixed(3), res.depLenPermutation.presence.register.p, res.depLenPermutation.presence.register.nullMean.toFixed(3), res.depLenPermutation.presence.register.nullMax.toFixed(3),
  obsS.register.toFixed(3), res.depLenPermutation.signSplit.register.p, res.depLenPermutation.signSplit.register.nullMean.toFixed(3), res.depLenPermutation.signSplit.register.nullMax.toFixed(3));

// ---- C2b: all 81 statistics, presence indicator, 6 attributes, 2000 shared permutations; standardised effect Z = (eta2 - nullMean)/nullSd; family-wise max-Z over (statistic, attribute)
const BF = 2000, rnd1 = rngOf(seedOf("attack-depLen", "C", "family")), perms = Array.from({ length: BF }, () => shuffled(rnd1, n));   // permutation over ALL pockets; defined cells restrict inside effect()
const tests = [];
for (let si = 0; si < S.length; si++) {
  const { y, ix } = indicator(si); if (ix.length < 60) continue; const np = ix.filter((i) => y[i]).length; if (np < 3 || np > ix.length - 3) continue;
  for (const a of ATTRS) { const o = effect(y, a, ix), nl = perms.map((pm) => effect(y, a, ix, pm)); tests.push({ si, stat: S[si], attr: a, obs: o, nullMean: mean(nl), nullSd: sd(nl), nl, nPresent: np, nDef: ix.length }); }
}
for (const t of tests) { t.Z = (t.obs - t.nullMean) / t.nullSd; t.p = (1 + t.nl.filter((x) => x >= t.obs).length) / (1 + BF); }
const maxZperm = perms.map((_, b) => Math.max(...tests.map((t) => (t.nl[b] - t.nullMean) / t.nullSd)));
const dep = tests.filter((t) => t.si === DEP), depBest = dep.reduce((a, b) => (b.Z > a.Z ? b : a));
const regTests = tests.filter((t) => t.attr === "register").sort((a, b) => b.Z - a.Z);
res.family = { nTests: tests.length, nStats: new Set(tests.map((t) => t.si)).size, depLenZ: Object.fromEntries(dep.map((t) => [t.attr, { Z: t.Z, p: t.p }])), depLenBestAttr: depBest.attr, depLenBestZ: depBest.Z,
  adjustedP_maxZoverAllTests: (1 + maxZperm.filter((m) => m >= depBest.Z).length) / (1 + BF), maxZpermQuantiles: { median: maxZperm.slice().sort((a, b) => a - b)[BF >> 1], max: Math.max(...maxZperm) },
  registerRankOfDepLenByZ: regTests.findIndex((t) => t.si === DEP) + 1, registerTests: regTests.length,
  statsWithRegisterP_lt_0_05: regTests.filter((t) => t.p < 0.05).length, statsWithRegisterP_le_floor: regTests.filter((t) => t.p <= 1 / (1 + BF) + 1e-12).length,
  topRegisterZ: regTests.slice(0, 8).map((t) => [t.stat, +t.Z.toFixed(1), +t.obs.toFixed(3)]) };
console.log("C2b family:", JSON.stringify(res.family));

// ---- C2c: restricted permutations: register labels permuted WITHIN group (does register add beyond group?) and group labels within register; presence and sign-split
const BR = 5000, rnd2 = rngOf(seedOf("attack-depLen", "C", "within"));
const restricted = { presenceRegisterWithinGroup: [0, 0], signRegisterWithinGroup: [0, 0], presenceGroupWithinRegister: [0, 0], signGroupWithinRegister: [0, 0], B: BR };
const labelPerm = (attr, perm) => Int32Array.from(cats[attr], (_, i) => cats[attr][perm[i]]);
const eta = (y, lab, ix) => etaCat(y, lab, ix, K(lab));
const o1 = eta(I.y, cats.register, ixI), o2 = eta(SG.y, cats.register, ixS), o3 = eta(I.y, cats.group, ixI), o4 = eta(SG.y, cats.group, ixS);
for (let b = 0; b < BR; b++) {
  let pm = permWithin(rnd2, ixI, (p) => p.group); if (eta(I.y, labelPerm("register", pm), ixI) >= o1) restricted.presenceRegisterWithinGroup[0]++;
  pm = permWithin(rnd2, ixS, (p) => p.group); if (eta(SG.y, labelPerm("register", pm), ixS) >= o2) restricted.signRegisterWithinGroup[0]++;
  pm = permWithin(rnd2, ixI, (p) => p.register); if (eta(I.y, labelPerm("group", pm), ixI) >= o3) restricted.presenceGroupWithinRegister[0]++;
  pm = permWithin(rnd2, ixS, (p) => p.register); if (eta(SG.y, labelPerm("group", pm), ixS) >= o4) restricted.signGroupWithinRegister[0]++;
}
for (const k of Object.keys(restricted)) if (Array.isArray(restricted[k])) { restricted[k] = { exceed: restricted[k][0], p: (1 + restricted[k][0]) / (1 + BR) }; }
restricted.observed = { presenceRegister: o1, signRegister: o2, presenceGroup: o3, signGroup: o4 };
res.restricted = restricted; console.log("C2c restricted:", JSON.stringify(restricted));
fs.writeFileSync(path.join(HERE, "attackC2.json"), JSON.stringify(res, null, 1));
export { res, permAmong, permWithin, I, SG, ixI, ixS, labelsOf, mean, sd, labelPerm, eta };
