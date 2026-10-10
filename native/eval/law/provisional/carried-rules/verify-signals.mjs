// verify-signals.mjs — VERIFICATION-ONLY read of the saved name-signal results (new file): company probe, IRC matched round C, ant-shape extras, UD confound, chat kinds.
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. No reader is run and no corpus text is read. Recomputes headline numbers from saved JSON so the carried rule book quotes recomputed numbers.
// DISCLOSURE. Already read: NAME-COMPANY-RESULTS.md, NAME-RULE-RESULTS.md (with its CORRECTION), NAME-SHAPE-RESULTS.md, kinds-swarm ant-shape / ant-kinds-ud / ant-kinds-chat /
//   ant-kinds-novel REPORT.md, ant-adversary CRITIQUE.md, the ant-code summary and its PREREG amendments. Numbers I expect to reproduce:
//   company (amended run, results/name-company-pairblocks/report.json): BOTH LATER mean 0.615, 14 languages >= 0.60, 7 >= 0.65; LEFT FIRST mean 0.624, 14 >= 0.60, 9 >= 0.65;
//   BOTH FIRST mean 0.655, 19 >= 0.60, 12 >= 0.65; UD pooled -> IRC 0.457; IRC leave-one-day-out 0.607 (LATER, BOTH), 0.526 (FIRST, LEFT).
//   adversary round C (8 never-read days): IMP INIT 0.718 / NONINIT 0.790 / POOL 0.741; S_ENTRY 0.653 / 0.717; R_LOCAL 0.596 / 0.618; increment +0.071 / +0.149; shuffled 0.574 / 0.542.
//   ant-shape extras: message-initial share of IRC nickname positives 0.9466 (non-initial 0.1066); message-initial alone AUC 0.9183.
//   ud_confound aggregate: PROPN all 0.573 vs covariates 0.554; PROPN position-matched 0.454; NOUN all 0.577 vs 0.518; NOUN position-matched 0.579 vs 0.451.
//   chat kinds: K* 24, gap 0.0302 (< 0.10, K1 gap clause FAILS), NMI vs frequency decile 0.240, transfer ARI 0.474 vs null 0.09; kind 9 purity 0.766, enrichment 16.2.
// TESTS. Each check is "recomputed within tol of the report". New aggregations (labelled): the number of languages above their OWN permutation q95 for the company arms,
//   and the languages that fail; the strict-subset rows of round C (STRICT-*), which the CRITIQUE text does not tabulate.
// BLIND PREDICTIONS. All reported numbers reproduce within 0.002 (counts exactly). The strict rows keep IMP above 0.70 (a licence-C7 subset does not remove the record signal).
// END-HEADER
import path from "node:path";
import { EVAL, round, mean, readJson, headerSha, makeChecks, save } from "./lib.mjs";

const { rows, chk, summary } = makeChecks();
const out = { script: "verify-signals.mjs", headerSha256: headerSha(import.meta.url), note: "verification-only; no reader run" };
const LAW = path.join(EVAL, "law/results"), KS = path.join(EVAL, "kinds-swarm");
// ---- company probe (amended run)
const co = readJson(path.join(LAW, "name-company-pairblocks/report.json")), own = co.own;
const arm = (stratum, a) => Object.entries(own).filter(([, v]) => v[stratum] && !v[stratum].thin && typeof v[stratum][a] === "number").map(([l, v]) => ({ l, a: v[stratum][a], q: v[stratum].permQ95, n: v[stratum].pairs }));
const company = {};
for (const [stratum, a] of [["LATER", "BOTH"], ["LATER", "LEFT"], ["FIRST", "LEFT"], ["FIRST", "BOTH"]]) {
  const r = arm(stratum, a), ge = (t) => r.filter((x) => x.a >= t);
  company[`${stratum}.${a}`] = { n: r.length, mean: round(mean(r.map((x) => x.a))), ge060: ge(0.6).length, ge065: ge(0.65).length, aboveOwnQ95: r.filter((x) => x.a > x.q).length, languagesGe065: ge(0.65).sort((x, y) => y.a - x.a).map((x) => `${x.l} ${round(x.a, 3)}`), languagesGe060: ge(0.6).sort((x, y) => y.a - x.a).map((x) => `${x.l} ${round(x.a, 3)}`), failing: r.filter((x) => x.a <= x.q).map((x) => `${x.l} ${round(x.a, 3)} (q95 ${round(x.q, 3)}, n ${x.n})`) };
}
chk("C1.LATER.BOTH.mean", 0.615, company["LATER.BOTH"].mean, 0.002); chk("C1.LATER.BOTH.ge060", 14, company["LATER.BOTH"].ge060, 0); chk("C1.LATER.BOTH.ge065", 7, company["LATER.BOTH"].ge065, 0);
chk("C1.FIRST.LEFT.mean", 0.624, company["FIRST.LEFT"].mean, 0.002); chk("C1.FIRST.LEFT.ge060", 14, company["FIRST.LEFT"].ge060, 0); chk("C1.FIRST.LEFT.ge065", 9, company["FIRST.LEFT"].ge065, 0);
chk("C1.FIRST.BOTH.mean", 0.655, company["FIRST.BOTH"].mean, 0.002); chk("C1.FIRST.BOTH.ge060", 19, company["FIRST.BOTH"].ge060, 0); chk("C1.FIRST.BOTH.ge065", 12, company["FIRST.BOTH"].ge065, 0);
chk("C3.udPooledToIrc", 0.457, co.C3.LATER.udPooledToIrc, 0.002); chk("C3.ircLODO.later", 0.607, co.C3.LATER.ircLeaveOneDayOut, 0.002); chk("C3.ircLODO.first", 0.526, co.C3.FIRST.ircLeaveOneDayOut, 0.002);
chk("C5.later", 0.115, co.C5.LATER_BOTH_plus_RIVALS_minus_RIVALS.mean, 0.002); chk("C5.first", 0.118, co.C5.FIRST_LEFT_plus_RIVALS_minus_RIVALS.mean, 0.002);
const c4 = Object.values(co.C4); company.shuffle = { languages: c4.length, realBothMean: round(mean(c4.map((x) => x.real.BOTH))), shuffledBothMean: round(mean(c4.map((x) => x.shuffled.BOTH))), jpnReal: co.C4.jpn.real.BOTH, jpnShuffled: co.C4.jpn.shuffled.BOTH };
chk("C4.real", 0.612, company.shuffle.realBothMean, 0.002); chk("C4.shuffled", 0.516, company.shuffle.shuffledBothMean, 0.002);
company.family = { later2fam: { mean: co.C2.LATER_BOTH_2fam.mean, ci: [co.C2.LATER_BOTH_2fam.lo, co.C2.LATER_BOTH_2fam.hi], sameBeatsOther: co.C2.LATER_BOTH_2fam.sameBeatsOther, of: co.C2.LATER_BOTH_2fam.languages }, later3cl: co.C2.LATER_BOTH_3cl.mean, first2fam: co.C2.FIRST_LEFT_2fam.mean };
company.irc = { udPooledToIrcLater: co.C3.LATER.udPooledToIrc, udSovToIrcLater: co.C3.LATER.udSovToIrc, ircLodoLater: co.C3.LATER.ircLeaveOneDayOut, ircPositionArmLater: co.C3.ircPositionControl.LATER, ircLodoFirst: co.C3.FIRST.ircLeaveOneDayOut, ircPositionArmFirst: co.C3.ircPositionControl.FIRST, ircPairs: co.C3.ircPairs, days: co.C3.days.length };
out.company = company;
// ---- adversary round C
const g = readJson(path.join(KS, "ant-adversary/results/irc_analysis_C.json")).groups, rc = {};
for (const k of Object.keys(g)) { const x = g[k]; rc[k] = { pairs: x.pairs, IMP: x.auc.IMP, IMP_ci: x.ci.IMP, S_ENTRY: x.auc.S_ENTRY, S_SPAN: x.auc.S_SPAN, R_LOCAL: x.auc.R_LOCAL, R_BURST: x.auc.R_BURST, R_RECENCY: x.auc.R_RECENCY, RIV: x.auc.RIV, IMPshuffled: x.auc.IMPS, positionControl: x.auc.POS, increment: x.increment.point, incrementCI: x.increment.ci, flipQ95_IMP: x.flipQ95.IMP, fitNullQ95: x.incrementFitNull?.q95 }; }
chk("A.INIT.IMP", 0.718, rc["C:INIT"].IMP, 0.002); chk("A.NONINIT.IMP", 0.790, rc["C:NONINIT"].IMP, 0.002); chk("A.POOL.IMP", 0.741, rc["C:POOL"].IMP, 0.002);
chk("A.INIT.S_ENTRY", 0.653, rc["C:INIT"].S_ENTRY, 0.002); chk("A.NONINIT.S_ENTRY", 0.717, rc["C:NONINIT"].S_ENTRY, 0.002);
chk("A.INIT.R_LOCAL", 0.596, rc["C:INIT"].R_LOCAL, 0.002); chk("A.NONINIT.R_LOCAL", 0.618, rc["C:NONINIT"].R_LOCAL, 0.002);
chk("A.INIT.incr", 0.071, rc["C:INIT"].increment, 0.002); chk("A.NONINIT.incr", 0.149, rc["C:NONINIT"].increment, 0.002);
chk("A.INIT.shuf", 0.574, rc["C:INIT"].IMPshuffled, 0.002); chk("A.NONINIT.shuf", 0.542, rc["C:NONINIT"].IMPshuffled, 0.002);
out.ircRoundC = rc;
// ---- ant-shape extras and summary, ud confound, chat kinds
const ex = readJson(path.join(KS, "ant-shape/results/extras.json")), sm = readJson(path.join(KS, "ant-shape/results/summary.json"));
out.ircVocative = { nInitial: ex.X2.nInitial, nonInitial: ex.X2.nonInitial, initialPosShare: ex.X2.initialPosShare, nonInitialPosShare: ex.X2.nonInitialPosShare, sentInitialAuc: ex.X3_ircRivalUniAuc.sentInitial, logWinSents: ex.X3_ircRivalUniAuc.logWinSents, fullIrc: sm.L4irc.real.auc.FULL, rivalsIrc: sm.L4irc.real.auc.RIVALS, nonInitialTransfer: ex.X2.transfer };
chk("V.initialPosShare", 0.9466, out.ircVocative.initialPosShare, 0.0005); chk("V.sentInitialAuc", 0.9183, out.ircVocative.sentInitialAuc, 0.0005);
out.udShape = { armMeans: sm.armMeans, V1: sm.V1, V5: sm.V5, V3: sm.V3, V6: sm.V6, extentTokensMean: ex.X1summary.logExtentTokens.mean, extentFramesMean: ex.X1summary.logExtentFrames?.mean, ircExtentTokens: ex.X1summary.logExtentTokens.irc };
const uc = readJson(path.join(KS, "ant-adversary/results/ud_confound.json")).aggregate; out.udConfound = uc;
chk("U.PROPN.all.SIG", 0.573, uc["PROPN:all"].SIG, 0.002); chk("U.PROPN.pm.SIG", 0.454, uc["PROPN:posMatched"].SIG, 0.002); chk("U.NOUN.pm.SIG", 0.579, uc["NOUN:posMatched"].SIG, 0.002); chk("U.NOUN.pm.CONF", 0.451, uc["NOUN:posMatched"].CONF, 0.002);
const ind = readJson(path.join(KS, "ant-kinds-chat/results/induce.irc.json")), ch = ind.characterise.dev.rows, k9 = ch.find((r) => r.kind === 9), k6 = ch.find((r) => r.kind === 6);
out.chatKinds = { Kstar: ind.Kstar, gapKstar: ind.gapKstar, nmiDecile: ind.frequency.NMI_decile, transferARI: ind.heldOut.transferARI, transferNull: ind.heldOut.transferNullARI, kind9: { purity: k9.purity, E: k9.enrichment, nickTypes: k9.nickTypes, types: k9.types }, kind6: { purity: k6.purity, E: k6.enrichment, nickTypes: k6.nickTypes, types: k6.types } };
chk("K.Kstar", 24, out.chatKinds.Kstar, 0); chk("K.gap", 0.0302, out.chatKinds.gapKstar, 0.0005); chk("K.transferARI", 0.474, out.chatKinds.transferARI, 0.002); chk("K.k9purity", 0.766, k9.purity, 0.002);
out.checks = rows; out.summary = summary(); save("verify-signals.json", out);
console.log(JSON.stringify({ summary: out.summary, aboveOwnQ95: Object.fromEntries(Object.entries(company).filter(([k]) => /\./.test(k) && company[k].aboveOwnQ95 != null).map(([k, v]) => [k, `${v.aboveOwnQ95}/${v.n}`])) }));
