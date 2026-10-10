// attackC2.mjs -- ATTACK C part 2: is the SHARED PROPERTY (register) separable from LANGUAGE?  Normalised language codes (langnorm.mjs), 2000 draws.
//  (a) PRESENT counts by register x English / non-English for the 12 registers named in the claim;
//  (b) adjusted eta^2 of the sign (P+ vs P-) on register and on language (plain permutation);
//  (c) register effect AFTER removing language means: residual = sign - mean sign of the pocket's language (languages with >= 2 PRESENT pockets only), eta^2 of the residual on register, register labels permuted within language;
//      and the reverse (language effect after removing register means, language labels permuted within register);
//  (d) register skew count: registers with >= 5 PRESENT pockets whose sign split has exact two-sided binomial p < 0.05, observed vs permutation of register labels (plain, and within language strata).
// Output C2.json.   node attackC2.mjs
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE } from "./lib.mjs";
import { langOf } from "./langnorm.mjs";
import { seedOf, rngOf } from "../../lib/pocket.mjs";
import { dummyCats, eta2Cat, shuffleInPlace } from "../../classify-lib.mjs";
const D = 2000, round = (x, d = 4) => (Number.isFinite(x) ? Number(x.toPrecision(d)) : x);
const rows = TABLE().filter((r) => r.kind === "real" && !r.thin && ["P+", "P-", "A", "M"].includes(r.status)).map((r) => ({ ...r, lang: langOf(r.language) })), pres = rows.filter((r) => r.status === "P+" || r.status === "P-");
const out = { nPresent: pres.length, nLanguages: new Set(pres.map((r) => r.lang)).size };
const CLAIM = ["academic", "chat", "code", "essay", "encyclopedia", "reportage", "drama", "scripture", "children", "treatise", "novel", "book"];
// (a)
out.a = Object.fromEntries(CLAIM.map((g) => { const c = { enPos: 0, enNeg: 0, xxPos: 0, xxNeg: 0, enNotPresent: 0, xxNotPresent: 0 }; for (const r of rows) if (r.register === g) { const en = r.lang === "en" ? "en" : "xx"; if (r.status === "P+") c[en + "Pos"]++; else if (r.status === "P-") c[en + "Neg"]++; else c[en + "NotPresent"]++; } return [g, c]; }));
const sign = (rs) => rs.map((r) => (r.status === "P+" ? 1 : 0)), adj = (e, n, k) => 1 - (1 - e) * ((n - 1) / (n - k));
const eta = (rs, key) => { const dc = dummyCats(rs.map((r) => r[key])); const e = eta2Cat(sign(rs), dc.cat, dc.k); return { k: dc.k, eta2: round(e), adjEta2: round(adj(e, rs.length, dc.k)) }; };
// (b)
const permP = (rs, key, seed) => { const y = sign(rs), dc = dummyCats(rs.map((r) => r[key])), obs = eta2Cat(y, dc.cat, dc.k), rnd = rngOf(seed), yp = y.slice(); let ge = 0; for (let d = 0; d < D; d++) { shuffleInPlace(yp, rnd); if (eta2Cat(yp, dc.cat, dc.k) >= obs - 1e-12) ge++; } return round((1 + ge) / (1 + D)); };
out.b = { register: { ...eta(pres, "register"), p: permP(pres, "register", seedOf("attack-comp.asym", "b-reg")) }, language: { ...eta(pres, "lang"), p: permP(pres, "lang", seedOf("attack-comp.asym", "b-lang")) } };
// (c) residualised effect with within-stratum permutation of the tested label
function residEffect(rs, test, remove, seed) {
  const by = new Map(); rs.forEach((r, i) => { const k = r[remove]; if (!by.has(k)) by.set(k, []); by.get(k).push(i); });
  const keep = [...by.values()].filter((g) => g.length >= 2), idx = keep.flat(), y = idx.map((i) => (rs[i].status === "P+" ? 1 : 0));
  const pos = new Map(idx.map((i, j) => [i, j])), resid = new Float64Array(idx.length);
  for (const g of keep) { const m = g.reduce((s, i) => s + (rs[i].status === "P+" ? 1 : 0), 0) / g.length; for (const i of g) resid[pos.get(i)] = (rs[i].status === "P+" ? 1 : 0) - m; }
  const dc = dummyCats(idx.map((i) => rs[i][test])), obs = eta2Cat(resid, dc.cat, dc.k), rnd = rngOf(seed), cat = dc.cat.slice(), groups = keep.map((g) => g.map((i) => pos.get(i))); let ge = 0;
  for (let d = 0; d < D; d++) { for (const g of groups) { const v = g.map((j) => dc.cat[j]); shuffleInPlace(v, rnd); g.forEach((j, t) => { cat[j] = v[t]; }); } if (eta2Cat(resid, cat, dc.k) >= obs - 1e-12) ge++; }
  const nLevels = new Set(idx.map((i) => rs[i][test])).size;
  return { nPockets: idx.length, nStrata: keep.length, testLevels: nLevels, eta2OfResidual: round(obs), p: round((1 + ge) / (1 + D)) };
}
out.c = { registerAfterLanguage: residEffect(pres, "register", "lang", seedOf("attack-comp.asym", "c1")), languageAfterRegister: residEffect(pres, "lang", "register", seedOf("attack-comp.asym", "c2")) };
// (d) skew count
const binP = (k, n) => { const pm = Array.from({ length: n + 1 }, (_, i) => { let l = 0; for (let t = 1; t <= i; t++) l += Math.log((n - t + 1) / t); return Math.exp(l - n * Math.LN2); }); const o = pm[k]; return Math.min(1, pm.reduce((s, p) => (p <= o + 1e-15 ? s + p : s), 0)); };
function skew(rs, regs) { const c = new Map(); rs.forEach((r, i) => { const g = regs[i]; if (!c.has(g)) c.set(g, [0, 0]); c.get(g)[r.status === "P+" ? 0 : 1]++; }); const hits = []; for (const [g, [a, b]] of c) if (a + b >= 5 && binP(a, a + b) < 0.05) hits.push({ register: g, pos: a, neg: b, p: round(binP(a, a + b)) }); return hits; }
const obsHits = skew(pres, pres.map((r) => r.register));
function nullCount(strata, seed) { const rnd = rngOf(seed), regs = pres.map((r) => r.register), sm = new Map(); if (strata) pres.forEach((r, i) => { if (!sm.has(r[strata])) sm.set(r[strata], []); sm.get(r[strata]).push(i); });
  const groups = strata ? [...sm.values()] : [pres.map((_, i) => i)], cur = regs.slice(), counts = [];
  for (let d = 0; d < D; d++) { for (const g of groups) { const v = g.map((i) => regs[i]); shuffleInPlace(v, rnd); g.forEach((i, t) => { cur[i] = v[t]; }); } counts.push(skew(pres, cur).length); }
  const ge = counts.filter((x) => x >= obsHits.length).length; return { meanNull: round(counts.reduce((a, b) => a + b, 0) / D), maxNull: Math.max(...counts), p: round((1 + ge) / (1 + D)) }; }
out.d = { observed: obsHits.length, hits: obsHits, plainPermutation: nullCount(null, seedOf("attack-comp.asym", "d-plain")), withinLanguage: nullCount("lang", seedOf("attack-comp.asym", "d-lang")) };
const enRows = pres.filter((r) => r.lang === "en"), xxRows = pres.filter((r) => r.lang !== "en");
out.signByLanguageClass = { englishPos: enRows.filter((r) => r.status === "P+").length, englishNeg: enRows.filter((r) => r.status === "P-").length, otherPos: xxRows.filter((r) => r.status === "P+").length, otherNeg: xxRows.filter((r) => r.status === "P-").length };
out.perLanguage = Object.entries(pres.reduce((o, r) => { (o[r.lang] ||= [0, 0])[r.status === "P+" ? 0 : 1]++; return o; }, {})).filter(([, v]) => v[0] + v[1] >= 4).sort((a, b) => b[1][0] + b[1][1] - a[1][0] - a[1][1]).map(([l, v]) => ({ lang: l, pos: v[0], neg: v[1] }));
fs.writeFileSync(path.join(HERE, "C2.json"), JSON.stringify(out, null, 1));
console.error(JSON.stringify({ a: out.a, b: out.b, c: out.c, d: { observed: out.d.observed, plain: out.d.plainPermutation, withinLanguage: out.d.withinLanguage }, signByLanguageClass: out.signByLanguageClass }));
