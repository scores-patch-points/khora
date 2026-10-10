// attackC.mjs -- ATTACK C (multiplicity / shared property) on comp.asym.  Uses the repo's own classify-lib / classify-prop (read-only imports), the table.json columns, 2000 permutation draws.
//  C1 reproduce the atlas shared property (indicator PRESENT vs rest, n = N defined) and the sign split (P+ vs P- among PRESENT) with attributes group, register, script, log10 tokens, log10 mean unit length, log10 docs;
//  C2 leave-one-pocket-out and leave-one-register / language / group-out of the register eta^2 (1000 draws each);
//  C3 register beyond language: permute register labels WITHIN language strata (and within group strata), and the English-only test;
//  C4 register-scoped sign skew: number of registers (>= 5 PRESENT pockets) with exact two-sided binomial p < 0.05 for the sign split, observed vs label permutation (plain and language-stratified).
// Output C.json.   node attackC.mjs
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, f } from "./lib.mjs";
import { seedOf, rngOf } from "../../lib/pocket.mjs";
import { sharedProperty } from "../../classify-prop.mjs";
import { dummyCats, eta2Cat, shuffleInPlace } from "../../classify-lib.mjs";
const D = 2000, DL = 1000;
const rows = TABLE().filter((r) => r.kind === "real" && !r.thin && ["P+", "P-", "A", "M"].includes(r.status)), pres = rows.filter((r) => r.status === "P+" || r.status === "P-");
const attrsOf = (rs) => [...["group", "register", "script"].map((n) => ({ name: n, type: "cat", ...dummyCats(rs.map((r) => r[n])) })), { name: "tokens", type: "num", x: rs.map((r) => Math.log10(r.tokens)) },
  { name: "meanUnitLength", type: "num", x: rs.map((r) => Math.log10(r.meanUnitLength)) }, { name: "docs", type: "num", x: rs.map((r) => Math.log10(r.docs)) }];
const round = (x, d = 4) => (Number.isFinite(x) ? Number(x.toPrecision(d)) : x);
const out = { N: rows.length, nPresent: pres.length, nPos: pres.filter((r) => r.status === "P+").length, nNeg: pres.filter((r) => r.status === "P-").length };
const sp = (rs, ind, tag) => { const s = sharedProperty(ind, attrsOf(rs), D, seedOf("attack-comp.asym", tag)); return { n: s.n, nPresent: s.nPresent, best: s.best, pMax: s.pMax, rows: s.rows.map((r) => ({ attr: r.attr, eta2: round(r.eta2), p: round(r.p), levels: r.levels })) }; };
// C1
out.C1 = { indicator: sp(rows, rows.map((r) => (r.status === "P+" || r.status === "P-" ? 1 : 0)), "ind"), signSplit: sp(pres, pres.map((r) => (r.status === "P+" ? 1 : 0)), "sign") };
console.error("C1 indicator", JSON.stringify(out.C1.indicator.best), out.C1.indicator.pMax, " sign", JSON.stringify(out.C1.signSplit.best), out.C1.signSplit.pMax);
// helpers: eta2 of the 0/1 sign on a label vector, adjusted (omega^2-like) eta2, permutation p
const sgn = (rs) => rs.map((r) => (r.status === "P+" ? 1 : 0));
const adj = (e, n, k) => (n - k > 0 ? 1 - (1 - e) * ((n - 1) / (n - k)) : NaN);   // epsilon^2-type adjusted eta^2 (= adjusted R^2)
function regTest(rs, key, draws, seed, strata = null) {
  const y = sgn(rs), dc = dummyCats(rs.map((r) => r[key])), obs = eta2Cat(y, dc.cat, dc.k), rnd = rngOf(seed); let ge = 0;
  const sm = new Map(); if (strata) rs.forEach((r, i) => { if (!sm.has(r[strata])) sm.set(r[strata], []); sm.get(r[strata]).push(i); });
  const groups = strata ? [...sm.values()] : [rs.map((_, i) => i)];
  const cat = dc.cat.slice();
  for (let d = 0; d < draws; d++) {
    for (const g of groups) { const v = g.map((i) => dc.cat[i]); shuffleInPlace(v, rnd); g.forEach((i, j) => { cat[i] = v[j]; }); }
    if (eta2Cat(y, cat, dc.k) >= obs - 1e-12) ge++;
  }
  return { n: rs.length, k: dc.k, eta2: round(obs), adjEta2: round(adj(obs, rs.length, dc.k)), p: round((1 + ge) / (1 + draws)) };
}
// C2 leave-one-out
const base = regTest(pres, "register", D, seedOf("attack-comp.asym", "base"));
out.C2 = { base, leaveOnePocket: null, leaveOneRegister: [], leaveOneLanguage: [], leaveOneGroup: [] };
const loo = pres.map((r, i) => ({ id: r.id, ...regTest(pres.filter((_, j) => j !== i), "register", 300, seedOf("attack-comp.asym", "loo", r.id)) }));
out.C2.leaveOnePocket = { minEta2: Math.min(...loo.map((x) => x.eta2)), maxEta2: Math.max(...loo.map((x) => x.eta2)), maxP: Math.max(...loo.map((x) => x.p)), worst: loo.slice().sort((a, b) => a.eta2 - b.eta2).slice(0, 3) };
for (const [key, dest] of [["register", "leaveOneRegister"], ["language", "leaveOneLanguage"], ["group", "leaveOneGroup"]]) {
  const lv = new Map(); pres.forEach((r) => lv.set(r[key], (lv.get(r[key]) || 0) + 1));
  for (const [lvl, n] of lv) if (n >= 5) out.C2[dest].push({ level: lvl, nRemoved: n, ...regTest(pres.filter((r) => r[key] !== lvl), "register", DL, seedOf("attack-comp.asym", "lo", key, lvl)) });
  out.C2[dest].sort((a, b) => a.eta2 - b.eta2);
}
console.error("C2 base", JSON.stringify(base), "LOO pocket", JSON.stringify({ ...out.C2.leaveOnePocket, worst: undefined }));
// C3 register beyond language / group
const en = pres.filter((r) => r.language === "en");
out.C3 = { registerPlain: base, registerWithinLanguageStrata: regTest(pres, "register", D, seedOf("attack-comp.asym", "strat-lang"), "language"), registerWithinGroupStrata: regTest(pres, "register", D, seedOf("attack-comp.asym", "strat-group"), "group"),
  languageAlone: regTest(pres, "language", D, seedOf("attack-comp.asym", "lang")), englishOnlyRegister: regTest(en, "register", D, seedOf("attack-comp.asym", "en")), nEnglishPresent: en.length, englishPos: en.filter((r) => r.status === "P+").length,
  nonEnglishPos: pres.length - en.length === 0 ? 0 : pres.filter((r) => r.language !== "en" && r.status === "P+").length, nonEnglishNeg: pres.filter((r) => r.language !== "en" && r.status === "P-").length };
console.error("C3", JSON.stringify(out.C3));
fs.writeFileSync(path.join(HERE, "C.json"), JSON.stringify(out, null, 1));
