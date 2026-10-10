// summary.mjs — collects the headline numbers of the four result files into results/summary.json (reads results only; computes nothing new).
import fs from "node:fs";
const rd = (f) => JSON.parse(fs.readFileSync(new URL(`./results/${f}`, import.meta.url), "utf8"));
const irc = rd("irc.json"), rob = rd("robust.json"), ex = rd("explore-nonen.json"), ud = rd("ud.json");
const slim = (c) => (c.variant === "VOID" ? { variant: "VOID", note: c.note } : { variant: c.variant, n: c.n, days: c.days, auc: c.auc, ci: c.ci, dayCi: c.dayCi, tpr: c.thr.tpr, fpr: c.thr.fpr, balPrec: c.thr.balPrec, wordshuf: c.wordshuf.auc, wordshufDrop: c.wordshuf.drop, msgshuf: c.msgshuf.auc, beyondCNT_Tinf: c.beyondCNT_Tinf.auc, beyondCNT_T128: c.beyondCNT_T128.auc, core: c.core, companions: c.companions, holds: c.holds, ctl: c.ctl, tieShare: c.tieShare });
const S = { headerSha256: irc.headerSha256, verdict: irc.verdict, registeredCells: Object.fromEntries(Object.entries(irc.cells).map(([k, c]) => [k, slim(c)])), predictions: irc.predictions,
  primaryExtras: { rivalAuc: irc.cells.PRIMARY_EN_ALL.rivalAuc, slotSham: irc.cells.PRIMARY_EN_ALL.slotSham, FNEXT: irc.cells.PRIMARY_EN_ALL.FNEXT, perDay: irc.cells.PRIMARY_EN_ALL.perDay, perDaySummary: irc.cells.PRIMARY_EN_ALL.perDaySummary, nullQ95: [irc.cells.PRIMARY_EN_ALL.nullQ95Analytic, irc.cells.PRIMARY_EN_ALL.nullQ95Flip] },
  natural: irc.natural, posthoc: { streamPosition: rob.RA, forwardDelay: rob.RB, falsePositiveAnatomy: { ...rob.RC, forms: undefined } },
  exploratoryNonEN: { equivalence: ex.equivalence, cells: Object.fromEntries(Object.entries(ex.cells).map(([k, c]) => [k, slim(c)])), reportOnly: ex.reportOnly, headerSha256: ex.headerSha256 },
  udProbe: { pooled: { n: ud.pooledAll.n, auc: ud.pooledAll.auc, ci: ud.pooledAll.ci, tieShare: ud.pooledAll.tieShare, bothZero: ud.pooledAll.bothZero }, eng: { auc: ud.eng.auc, ci: ud.eng.ci }, summary: ud.summary, predictions: ud.predictions } };
fs.writeFileSync(new URL("./results/summary.json", import.meta.url), JSON.stringify(S, null, 1)); console.log("written", Object.keys(S).join(","));
