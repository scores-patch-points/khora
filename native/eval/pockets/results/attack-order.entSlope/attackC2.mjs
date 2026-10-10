// attackC2.mjs -- ATTACK C part 2: leave-one-pocket-out / leave-one-register-out stability of the sign-split eta2, LOO prediction of the sign from register vs rivals, Mantel-Haenszel English-vs-other within register.
//   node attackC2.mjs -> C_multiplicity_part2.json
import fs from "node:fs";
import path from "node:path";
import { TABLE, HERE, rngOf, seedOf, f } from "./lib.mjs";
const T = TABLE(), S = "order.entSlope";
const P = T.rows.filter((r) => r.kind === "real" && !r.thin && (r.status === "P+" || r.status === "P-")), n = P.length, y = P.map((r) => (r.status === "P+" ? 1 : 0));
const isEn = (r) => /^(en|eng)/.test(r.language);
const eta2 = (y, g) => { const m = y.reduce((a, b) => a + b, 0) / y.length, sst = y.reduce((a, b) => a + (b - m) ** 2, 0); if (!sst) return 0; const s = new Map(), c = new Map(); y.forEach((v, i) => { s.set(g[i], (s.get(g[i]) || 0) + v); c.set(g[i], (c.get(g[i]) || 0) + 1); }); let ssb = 0; for (const [k, v] of s) ssb += c.get(k) * (v / c.get(k) - m) ** 2; return ssb / sst; };
function perm(yv, g, tag, B = 2000) { const rnd = rngOf(seedOf("attackC2", tag)), obs = eta2(yv, g), gg = g.slice(); let ge = 0; for (let b = 0; b < B; b++) { for (let i = gg.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [gg[i], gg[j]] = [gg[j], gg[i]]; } if (eta2(yv, gg) >= obs - 1e-12) ge++; } return { eta2: obs, p: (ge + 1) / (B + 1) }; }
const out = { n, nPos: y.reduce((a, b) => a + b, 0) };
const reg = P.map((r) => r.register);
// ---- leave-one-pocket-out eta2 (register)
const loo = P.map((_, i) => eta2(y.filter((_, j) => j !== i), reg.filter((_, j) => j !== i)));
out.leaveOnePocketOut = { eta2Full: eta2(y, reg), min: Math.min(...loo), max: Math.max(...loo) };
// ---- leave-one-register-out: eta2 and permutation p without the register's pockets (the p uses 1000 draws)
out.leaveOneRegisterOut = [...new Set(reg)].map((k) => { const ix = P.map((_, i) => i).filter((i) => reg[i] !== k), yy = ix.map((i) => y[i]), gg = ix.map((i) => reg[i]); const r = perm(yy, gg, "lor-" + k, 1000); return { dropped: k, nDropped: n - ix.length, n: ix.length, eta2: r.eta2, p: r.p }; }).sort((a, b) => a.eta2 - b.eta2);
// ---- same for dropping a whole GROUP (does the effect live in one corpus family?)
out.leaveOneGroupOut = [...new Set(P.map((r) => r.group))].map((k) => { const ix = P.map((_, i) => i).filter((i) => P[i].group !== k), r = perm(ix.map((i) => y[i]), ix.map((i) => reg[i]), "log-" + k, 1000); return { dropped: k, nDropped: n - ix.length, eta2: r.eta2, p: r.p }; });
// ---- LOO prediction of the sign by majority of the other PRESENT pockets in the same cell (cell fallback chain), with a tie -> global minority rule never used (ties -> next level)
function looAcc(keyFns, label) {
  let ok = 0, covered = 0, okCovered = 0;
  for (let i = 0; i < n; i++) {
    let pred = null;
    for (const kf of keyFns) { const k = kf(P[i]); let p = 0, m = 0; for (let j = 0; j < n; j++) if (j !== i && kf(P[j]) === k) { m++; p += y[j]; } if (m && p * 2 !== m) { pred = p * 2 > m ? 1 : 0; if (kf === keyFns[0]) covered++; if (kf === keyFns[0] && pred === y[i]) okCovered++; break; } }
    if (pred == null) pred = 0; if (pred === y[i]) ok++;
  }
  return { label, acc: ok / n, coveredByFirstKey: covered, accWhereCovered: covered ? okCovered / covered : null };
}
const gl = (r) => "ALL", reg_ = (r) => r.register, grp_ = (r) => r.group, lang_ = (r) => r.language, en_ = (r) => (isEn(r) ? "en" : "other");
out.looPrediction = [looAcc([gl], "global majority"), looAcc([reg_, grp_, gl], "register -> group -> global"), looAcc([grp_, gl], "group -> global"), looAcc([en_, gl], "English/non-English -> global"), looAcc([(r) => r.register + "|" + en_(r), reg_, gl], "register x English -> register -> global"), looAcc([(r) => r.group + "|" + r.register, reg_, grp_, gl], "group x register -> register -> group -> global"), looAcc([(r) => r.grain + "|" + r.script, gl], "grain x script -> global")];
// ---- unit-length baseline: LOO sign by the nearest k=25 pockets by log mean unit length (majority), k=9 as well
const ml = P.map((r) => Math.log(r.mul));
out.looPrediction.push(...[9, 25].map((k) => { let ok = 0; for (let i = 0; i < n; i++) { const d = P.map((_, j) => [Math.abs(ml[j] - ml[i]), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, k); const p = d.reduce((s, [, j]) => s + y[j], 0); if ((p * 2 > k ? 1 : 0) === y[i]) ok++; } return { label: `nearest-${k} by mean unit length`, acc: ok / n }; }));
// ---- Mantel-Haenszel English vs non-English sign, stratified by register (registers with >=1 pocket of each class), exact permutation of the English label within register
const strata = new Map(); P.forEach((r, i) => { const k = r.register; if (!strata.has(k)) strata.set(k, []); strata.get(k).push(i); });
const mh = (lab) => { let num = 0, den = 0, used = 0; for (const ix of strata.values()) { let a = 0, b = 0, c = 0, d = 0; for (const i of ix) { if (lab[i]) { if (y[i]) a++; else b++; } else if (y[i]) c++; else d++; } const t = a + b + c + d; if (!(a + b) || !(c + d)) continue; used += a + b + c + d; num += (a * d) / t; den += (b * c) / t; } return { or: den ? num / den : Infinity, num, den, used }; };
const en = P.map((r) => (isEn(r) ? 1 : 0)), obs = mh(en), rnd = rngOf(seedOf("attackC2", "mh")); let ge = 0; const B = 2000;
const stat_ = (lab) => { let s = 0; for (const ix of strata.values()) { let a = 0, nE = 0, nO = 0, pE = 0, pO = 0; for (const i of ix) { if (lab[i]) { nE++; pE += y[i]; } else { nO++; pO += y[i]; } } if (nE && nO) s += pE - (nE * (pE + pO)) / (nE + nO); } return s; };
const obsS = stat_(en); const lab = en.slice();
for (let b = 0; b < B; b++) { for (const ix of strata.values()) { const l = ix.map((i) => en[i]); for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } ix.forEach((i, k) => (lab[i] = l[k])); } if (stat_(lab) >= obsS - 1e-12) ge++; }
out.englishVsOtherWithinRegister = { mhOddsRatioPositiveSign: obs.or, pocketsInInformativeStrata: obs.used, excessPositiveEnglish: obsS, permP: (ge + 1) / (B + 1), perStratum: [...strata.entries()].map(([k, ix]) => { const e = ix.filter((i) => en[i]), o = ix.filter((i) => !en[i]); return e.length && o.length ? { register: k, enPos: e.filter((i) => y[i]).length, enN: e.length, otherPos: o.filter((i) => y[i]).length, otherN: o.length } : null; }).filter(Boolean) };
// ---- reproduce the presence shared-property: register eta2 on PRESENT-indicator over all 390
const R = T.rows.filter((r) => r.kind === "real" && !r.thin && r.status !== "nodata"), ind = R.map((r) => (r.status === "P+" || r.status === "P-" ? 1 : 0));
out.presenceRegister = perm(ind, R.map((r) => r.register), "presence-register", 2000);
fs.writeFileSync(path.join(HERE, "C_multiplicity_part2.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ leaveOnePocketOut: out.leaveOnePocketOut, lor: out.leaveOneRegisterOut.slice(0, 5), log: out.leaveOneGroupOut, presenceRegister: out.presenceRegister }));
for (const a of out.looPrediction) console.log(a.label.padEnd(52), f(a.acc), a.coveredByFirstKey != null ? `covered ${a.coveredByFirstKey} acc|covered ${f(a.accWhereCovered)}` : "");
console.log(JSON.stringify(out.englishVsOtherWithinRegister));
