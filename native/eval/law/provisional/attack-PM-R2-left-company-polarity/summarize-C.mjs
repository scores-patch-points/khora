// attack-PM-R2-left-company-polarity/summarize-C.mjs -- mechanical summary of results/C.*.jsonl (rules fixed in attack-C-rivals.mjs's header). NEW FILE.  node summarize-C.mjs -> results/C-summary.json
import fs from "node:fs";
import path from "node:path";
import { HERE, round, mean, rngFor, seedFor, quantile } from "./attack-lib.mjs";
const RES = path.join(HERE, "results"), all = fs.readdirSync(RES).filter((f) => /^C\..*\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(RES, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))).filter((r) => r.variant && r.pairs > 0);
const med = (xs) => (xs.length ? round(quantile(xs, 0.5)) : null);
const pooled = (cs, tag) => { const cl = []; let off = 0; const wins = []; for (const c of cs) { const mx = Math.max(...c.cl) + 1; for (let k = 0; k < c.wins.length; k++) { wins.push(c.wins[k] === "1" ? 1 : c.wins[k] === "0" ? 0 : 0.5); cl.push(c.cl[k] + off); } off += mx; }
  if (!wins.length) return null; const by = new Map(); wins.forEach((w, k) => { const a = by.get(cl[k]) ?? by.set(cl[k], [0, 0]).get(cl[k]); a[0] += w; a[1]++; }); const S = [...by.values()], est = wins.reduce((a, b) => a + b, 0) / wins.length, rnd = rngFor(seedFor("pm-r2-attack-C", "pool", tag)), bs = [];
  for (let b = 0; b < 400; b++) { let s = 0, m = 0; for (let t = 0; t < S.length; t++) { const c = S[Math.floor(rnd() * S.length)]; s += c[0]; m += c[1]; } bs.push(s / m); } return { auc: round(est), lo: round(quantile(bs, 0.025)), hi: round(quantile(bs, 0.975)), pairs: wins.length }; };
const ORI = { es: 1, nfs: 1, nDnull: 1, Dobs: 1 }; // mechanism-oriented rivals; the rest are orientation-free (max(AUC,1-AUC) in the DLx direction)
const out = { families: {} };
for (const fam of ["irc", "code", "book", "ud"]) {
  const o = {}; for (const v of ["R0", "M2", "M5"]) {
    const cs = all.filter((c) => c.variant === v && c.fam === fam), val = cs.filter((c) => c.valid); if (!cs.length) continue;
    const dl = med(cs.map((c) => c.auc.DLx)), dir = dl > 0.5 ? 1 : -1, riv = {};
    for (const r of ["es", "nfs", "nDnull", "Dobs", "logn", "ch", "slen", "ml", "mi", "ls", "bin"]) { const m = med(cs.map((c) => c.auc[r])); const oriented = ORI[r] ? m : dir > 0 ? Math.max(m, 1 - m) : Math.min(m, 1 - m); riv[r] = { medianAuc: m, used: round(oriented), reproduces: dir > 0 ? oriented >= dl - 0.03 : oriented <= dl + 0.03 }; }
    const sh = cs.map((c) => c.shamMean); o[v] = { cells: cs.length, valid: val.length, medDLx: dl, medDLxRule: med(cs.map((c) => c.DLxRule).filter((x) => x != null)), pooledAll: pooled(cs, `${fam}${v}all`), pooledValid: pooled(val, `${fam}${v}val`), rivals: riv, shamMedMean: med(sh), shamShareIn047053: round(sh.filter((x) => x >= 0.47 && x <= 0.53).length / sh.length), medShamSd: med(cs.map((c) => c.shamSd)), perReg: ["ud"].includes(fam) ? undefined : Object.fromEntries(cs.map((c) => [c.reg, { pairs: c.pairs, DLx: c.auc.DLx, DLxRule: c.DLxRule, es: c.auc.es, nfs: c.auc.nfs, nDnull: c.auc.nDnull, Dobs: c.auc.Dobs, logn: c.auc.logn, ch: c.auc.ch, slen: c.auc.slen, ml: c.auc.ml, mi: c.auc.mi, ls: c.auc.ls, bin: c.auc.bin, sham: c.shamMean, shamSd: c.shamSd, valid: c.valid, ctrl: c.ctrl }])) };
  }
  out.families[fam] = o;
}
fs.writeFileSync(path.join(RES, "C-summary.json"), JSON.stringify(out, null, 1));
for (const [fam, o] of Object.entries(out.families)) for (const [v, x] of Object.entries(o)) { console.log(`== ${fam} ${v}: cells ${x.cells} valid ${x.valid} medDLx ${x.medDLx} (rule features2 ${x.medDLxRule}) pooledAll ${JSON.stringify(x.pooledAll)} pooledValid ${JSON.stringify(x.pooledValid)} sham med ${x.shamMedMean} inband ${x.shamShareIn047053} sd ${x.medShamSd}`); console.log("   rivals: " + Object.entries(x.rivals).map(([k, r]) => `${k} ${r.medianAuc}${r.reproduces ? "*" : ""}`).join("  ")); if (x.perReg) for (const [k, r] of Object.entries(x.perReg)) console.log(`     ${k} n${r.pairs} DLx ${r.DLx} rule ${r.DLxRule ?? "-"} es ${r.es} nfs ${r.nfs} nDnull ${r.nDnull} Dobs ${r.Dobs} logn ${r.logn} ch ${r.ch} slen ${r.slen} ml ${r.ml} mi ${r.mi} ls ${r.ls} bin ${r.bin} sham ${r.sham}+-${r.shamSd} valid ${r.valid}`); }
