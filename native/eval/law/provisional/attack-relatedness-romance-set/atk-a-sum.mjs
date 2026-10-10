// attack-relatedness-romance-set/atk-a-sum.mjs — SUMMARY of ATTACK A. Applies the thresholds THR registered in the header of atk-a.mjs (its sha256 is written below); no new choice is made here.
//   NAME_COMPANY_PAIRBLOCK=1 node atk-a-sum.mjs     (reads results/A-A.json A-B.json A-C.json, writes results/A-summary.json)
import fs from "node:fs";
import path from "node:path";
import { HERE, ROM, GER } from "./atk-lib.mjs";
import { boot, round, mean } from "./atk-eval.mjs";
import { VARS, PRIMARY, THR, setHash } from "./atk-a.mjs";

const R = Object.fromEntries(["A", "B", "C"].map((s) => [s, JSON.parse(fs.readFileSync(path.join(HERE, "results", `A-${s}.json`), "utf8"))]));
const ok = (r) => r && !r.thin && r.a && r.e && r.g;
const m = (xs) => (xs.length ? mean(xs) : null);
function cell(set, v, targets) {
  const rows = targets.map((t) => ({ t, r: R[set].variants[v][t] })).filter(({ r }) => ok(r)).map(({ t, r }) => ({ t, a: r.a.auc, e: r.e.auc, g: r.g.auc, o: r.o?.auc, q95: r.a.q95, pos: r.a.pos, shuf: r.a.shuf, pairs: r.pairs, pass: r.a.auc >= THR.auc && r.a.auc > r.a.q95 && r.a.auc - r.e.auc >= THR.margin, passG: r.a.auc - r.g.auc >= THR.comparator }));
  return rows;
}
function perVariant(v, targets) {
  const bySet = Object.fromEntries(["A", "B", "C"].map((s) => [s, cell(s, v, targets)])), langs = {};
  for (const s of ["A", "B", "C"]) for (const r of bySet[s]) (langs[r.t] ??= []).push(r);
  const L = Object.entries(langs).map(([t, rs]) => ({ t, a: m(rs.map((r) => r.a)), e: m(rs.map((r) => r.e)), g: m(rs.map((r) => r.g)), o: m(rs.map((r) => r.o ?? NaN).filter((x) => !Number.isNaN(x))), sets: rs.length }));
  const all = Object.values(bySet).flat(), rate = Object.fromEntries(Object.entries(bySet).map(([s, rows]) => [s, rows.length ? `${rows.filter((r) => r.pass).length}/${rows.length}` : "-"]));
  const sh = all.filter((r) => r.shuf != null).map((r) => r.shuf);
  return { n: L.length, targetSets: all.length, passBySet: rate, passAll: `${all.filter((r) => r.pass).length}/${all.length}`, passGermanicMargin: `${all.filter((r) => r.passG).length}/${all.length}`,
    a: round(m(L.map((x) => x.a))), e: round(m(L.map((x) => x.e))), g: round(m(L.map((x) => x.g))), o: L.some((x) => x.o != null) ? round(m(L.map((x) => x.o).filter((x) => x != null))) : null, aMinusE: boot(L.map((x) => x.a - x.e)), aMinusG: boot(L.map((x) => x.a - x.g)), gMinusE: boot(L.map((x) => x.g - x.e)),
    pos: round(m(all.map((r) => r.pos))), shuf: sh.length ? round(m(sh)) : null, perLanguage: Object.fromEntries(L.map((x) => [x.t, { a: round(x.a), g: round(x.g), e: round(x.e), n: x.sets }])), passRows: bySet };
}
const out = { headerSha256: setHash(), thresholds: THR, primary: {}, secondary: {}, germanicTargets: {}, verdicts: {} };
for (const v of VARS) { out.primary[v] = perVariant(v, PRIMARY); out.secondary[v] = perVariant(v, ["glg", "ron"]); out.germanicTargets[v] = perVariant(v, GER); }
const base = out.primary.V0M0;
out.replication = { ok: Math.abs(base.a - THR.replicateA) <= THR.tol && Math.abs(base.aMinusE.mean - THR.replicateDiff) <= THR.tol, a: base.a, aMinusE: base.aMinusE.mean };
for (const v of VARS) {
  const p = out.primary[v], setsPass = Object.values(p.passBySet).filter((s) => s !== "-" && s.split("/")[0] / s.split("/")[1] >= THR.passRate).length, ctl = p.pos >= 0.45 && p.pos <= 0.55 && (p.shuf == null || p.shuf <= 0.55), d = p.aMinusE.mean;
  out.verdicts[v] = { aMinusE: d, retentionVsV0M0: round(d / base.aMinusE.mean), setsPassing: setsPass, controlsOk: ctl, verdict: d < THR.fall ? "FALLS" : d >= THR.survive && setsPass >= 2 && ctl ? "SURVIVES" : "NARROWED" };
}
out.A2 = { aMinusG: base.aMinusG, passGermanicMargin: base.passGermanicMargin, verdict: base.aMinusG.mean < THR.fall ? "FALLS" : base.aMinusG.mean >= THR.comparator && base.aMinusG.lo > 0 && base.passGermanicMargin.split("/")[0] / base.passGermanicMargin.split("/")[1] >= THR.passRate ? "SURVIVES" : "NARROWED" };
out.A3 = Object.fromEntries(["V1M0", "V2M0", "V3M0"].map((v) => [v, { shiftInBonus: round(out.primary[v].aMinusE.mean - base.aMinusE.mean), shiftInA: round(out.primary[v].a - base.a), dependent: Math.abs(out.primary[v].aMinusE.mean - base.aMinusE.mean) > THR.tokShift }]));
fs.writeFileSync(path.join(HERE, "results", "A-summary.json"), JSON.stringify(out, null, 1));
const row = (v, p) => `${v.padEnd(5)} n${p.n} pass ${p.passAll} (${Object.values(p.passBySet).join(",")}) a ${p.a} g ${p.g} o ${p.o} e ${p.e} | a-e ${p.aMinusE.mean} [${p.aMinusE.lo},${p.aMinusE.hi}] a-g ${p.aMinusG.mean} [${p.aMinusG.lo},${p.aMinusG.hi}] g-e ${p.gMinusE.mean} | pos ${p.pos} shuf ${p.shuf} passG ${p.passGermanicMargin}`;
console.log("PRIMARY (cat fra ita por spa)\n" + VARS.map((v) => row(v, out.primary[v]) + ` => ${out.verdicts[v].verdict} (retention ${out.verdicts[v].retentionVsV0M0})`).join("\n"));
console.log("SECONDARY (glg ron)\n" + VARS.map((v) => row(v, out.secondary[v])).join("\n"));
console.log("GERMANIC targets (a=Germanic donors g=Romance donors)\n" + VARS.map((v) => row(v, out.germanicTargets[v])).join("\n"));
console.log(JSON.stringify({ replication: out.replication, A2: out.A2, A3: out.A3 }));
