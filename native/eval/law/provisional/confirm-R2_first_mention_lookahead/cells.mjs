// cells.mjs — cell evaluation for the R2 confirmation (design fixed in run.mjs's pre-registration header). A "cell" = a predicate over matched pairs (scope x facet).
import { round } from "./lib.mjs";
import { pAuc, bootPairs, bootDays, flipQ95, nullQ95, thrRule, beyond, ctlOf, ctlOk, strictOf, groupBy } from "./stats.mjs";
export const RULE = { column: "INIT_Tinf", theta: 2, minN: 60, auc: 0.62, lower: 0.55, dayLower: 0.55, shufDrop: 0.05, beyondAuc: 0.6 };
/** sets = { real: {4: pairs, 8: pairs}, wordshuf: {...}, msgshuf: {...} }, each pair tagged {day, channel, lang, era, size, init}. Variant order (controls decide, never the AUC): M4 full -> M8 full -> M4 strict subset. */
export function evalCell(sets, pred, col = RULE.column, rule = RULE) {
  const pick = (mode, v) => { const base = sets[mode][v.Q].filter(pred); return v.strict ? strictOf(base) : base; };
  const VARS = [{ name: "M4", Q: 4, strict: false }, { name: "M8", Q: 8, strict: false }, { name: "M4strict", Q: 4, strict: true }];
  const tried = [];
  for (const v of VARS) {
    const ps = pick("real", v); if (!ps.length) { tried.push({ variant: v.name, n: 0 }); continue; }
    const ctl = ctlOf(ps), ok = ctlOk(ctl), need = v.strict ? 40 : rule.minN; tried.push({ variant: v.name, n: ps.length, ctl, ctlOk: ok });
    if (!ok || ps.length < need) continue;
    const o = { variant: v.name, n: ps.length, days: new Set(ps.map((p) => p.day)).size, ctl, ctlOk: true, tried };
    o.auc = round(pAuc(ps, col)); o.ci = bootPairs(ps, col); o.dayCi = bootDays(ps, col); o.nullQ95Analytic = nullQ95(ps.length); o.nullQ95Flip = flipQ95(ps, col);
    o.thr = thrRule(ps, col, rule.theta); o.tieShare = round(ps.filter((p) => p.pos[col] === p.neg[col]).length / ps.length); o.bothZero = round(ps.filter((p) => p.pos[col] === 0 && p.neg[col] === 0).length / ps.length); o.beyondCNT_Tinf = beyond(ps, col, "CNT_Tinf"); o.beyondCNT_T128 = beyond(ps, col, "CNT_T128");
    o.rivalAuc = { CNT_Tinf: round(pAuc(ps, "CNT_Tinf")), CNT_T128: round(pAuc(ps, "CNT_T128")), INIT_T128: round(pAuc(ps, "INIT_T128")) };
    o.slotSham = { SEC_Tinf: round(pAuc(ps, "SEC_Tinf")), LAST_Tinf: round(pAuc(ps, "LAST_Tinf")) }; o.FNEXT = round(pAuc(ps, "FNEXT"));
    for (const m of ["wordshuf", "msgshuf"]) { const s = pick(m, v); o[m] = { n: s.length, auc: round(pAuc(s, col)), ctl: s.length ? ctlOf(s) : null, drop: round(o.auc - (pAuc(s, col) ?? 0.5)) }; }
    const byDay = [...groupBy(ps, (p) => p.day)].map(([d, a]) => ({ day: d, n: a.length, auc: round(pAuc(a, col)) })).sort((a, b) => (a.day < b.day ? -1 : 1));
    o.perDay = byDay; const big = byDay.filter((d) => d.n >= 10); o.perDaySummary = { daysWithN10: big.length, above05: big.filter((d) => d.auc > 0.5).length, binomP: binomUpper(big.filter((d) => d.auc > 0.5).length, big.length) };
    const core = o.n >= need && o.auc >= rule.auc && o.ci[0] >= Math.max(rule.lower, o.nullQ95Analytic, o.nullQ95Flip);
    const comp = { dayCi: !!o.dayCi[0] && o.dayCi[0] >= rule.dayLower, wordshuf: o.wordshuf.drop >= rule.shufDrop, beyondCNT_Tinf: (o.beyondCNT_Tinf.auc ?? 0) >= rule.beyondAuc };
    o.core = core; o.companions = comp; o.holds = core && comp.dayCi && comp.wordshuf && comp.beyondCNT_Tinf; return o;
  }
  return { variant: "VOID", tried, holds: false, core: false, note: tried.some((t) => t.ctlOk) ? "controls fine but n below the minimum (60; strict 40)" : "controls out of [0.45,0.55] in M4, M8 and the strict subset (or no pairs)" };
}
export function binomUpper(k, n) { if (!n) return null; let lc = 0, s = 0; const lg = (x) => { let t = 0; for (let i = 2; i <= x; i++) t += Math.log(i); return t; }; for (let j = k; j <= n; j++) { lc = lg(n) - lg(j) - lg(n - j) - n * Math.log(2); s += Math.exp(lc); } return round(s); }
