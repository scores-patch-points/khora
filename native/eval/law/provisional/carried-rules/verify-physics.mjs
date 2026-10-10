// verify-physics.mjs — VERIFICATION-ONLY read of the saved physics-handles results (new file).
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. No reader is run and no corpus text is read. Recomputes the headline numbers of eval/physics-handles/REPORT.md section 4 and 7 from
//   results/reader/_report.w1.json, _report.w2.json and results/gravity/_report.json, plus the war-and-peace fragility report of ant-kinds-novel.
// DISCLOSURE. Already read: physics-handles/REPORT.md, PHYSICS-HANDLES.md section 0-11, the khora memory note on physics handles, ant-kinds-novel REPORT.md.
//   Numbers I expect to reproduce: far-pair additivity slope 1.000, 99.9% exact (n 1312; wave 2 n 717, 100%); near-pair slope 0.983 (wave 2 0.972);
//   floor cliff (mean one-mention shadow at n=2 over n=3-4) 2.094 (wave 2 2.108); sub-extensive slope of log shadow on log n 0.839 (wave 2 0.750);
//   pooled Spearman(n, fragility) for n>=3 -0.0094 [-0.029, 0.009] (wave 2 -0.025); deletion empties 1.18 slots and creates 0.024 (wave 2 0.97 / 0.029);
//   collateral share 0.539 (wave 2 0.526); radius-1 share of changed slots 0.936 (0.920); reader locality exponent 1.517 [1.379, 1.685] (wave 2 1.450), power beats
//   exponential in 9/9 (wave 2 7/8); IRC nickname within-count AUC 0.8125 (wave 2 0.8058); attraction PG1 24 of 33 corpora, PG3 fold-to-fold rho -0.11, median alpha 1.14.
//   ant-kinds-novel War and Peace: cliff D1(m=2)-D1(m=3) +1.779 [1.400, 2.173]; pooled slope above floor +0.093 per doubling [-0.013, 0.239].
// TESTS. Each check is "recomputed within tol of the report" (tol 0.002 on rounded values, 0.005 on slopes that the report rounds to 3 places).
// BLIND PREDICTIONS. All reproduce. One difference is expected and is NOT a failure: the report's 'IRC nickname within-n AUC' is confounded by message position
//   (see ant-adversary), so the number reproduces but its meaning is an upper bound.
// END-HEADER
import path from "node:path";
import { EVAL, round, readJson, headerSha, makeChecks, save } from "./lib.mjs";

const { rows, chk, summary } = makeChecks();
const out = { script: "verify-physics.mjs", headerSha256: headerSha(import.meta.url), note: "verification-only; no reader run" };
const PH = path.join(EVAL, "physics-handles/results"), w = { 1: readJson(path.join(PH, "reader/_report.w1.json")).pooled, 2: readJson(path.join(PH, "reader/_report.w2.json")).pooled };
const exp = { 1: { farN: 1312, far: 0.9992, near: 0.9829, cliff: 2.094, slope: 0.839, rho: -0.0094, em: 1.18, bo: 0.0244, col: 0.539, r1: 0.936, alpha: 1.517, pw: 9, pwOf: 9, nick: 0.8125 }, 2: { farN: 717, far: 1, near: 0.9717, cliff: 2.108, slope: 0.750, rho: -0.0253, em: 0.9715, bo: 0.0285, col: 0.526, r1: 0.920, alpha: 1.450, pw: 7, pwOf: 8, nick: 0.8058 } };
out.physics = {};
for (const k of [1, 2]) {
  const p = w[k], e = exp[k];
  chk(`P.w${k}.farN`, e.farN, p.massAdd.far.n, 0); chk(`P.w${k}.farExact`, e.far, p.massAdd.far.shareEqual, 0.0005); chk(`P.w${k}.nearSlope`, e.near, p.massAdd.near.slope.point, 0.002);
  chk(`P.w${k}.cliff`, e.cliff, p.inertia.floorCliff.ratio_n2_over_n3to4, 0.002); chk(`P.w${k}.slopeLogLog`, e.slope, p.massDef.pooledSlope, 0.002);
  chk(`P.w${k}.inertiaRho`, e.rho, p.inertia.pooled.spearman_n_S.point, 0.002); chk(`P.w${k}.emptied`, e.em, p.conservation.n3up.meanEmptied, 0.005); chk(`P.w${k}.born`, e.bo, p.conservation.n3up.meanBorn, 0.002);
  chk(`P.w${k}.collateral`, e.col, p.affect.collateralShare_n3up, 0.002); chk(`P.w${k}.radius1`, e.r1, p.affect.byRadius.slotsChangedShare[1], 0.002);
  chk(`P.w${k}.alpha`, e.alpha, p.forceLaw.pooled.fit.alpha, 0.002); chk(`P.w${k}.powerWins`, e.pw, p.forceLaw.P12.powerWinsIn, 0); chk(`P.w${k}.ircNick`, e.nick, p.inertia.nameness.irc.aucWithinN.point, 0.0005);
  const nm = p.inertia.nameness, ud = Object.entries(nm).filter(([l, v]) => l.startsWith("ud-") && v.aucWithinN).map(([l, v]) => `${l} ${round(v.aucWithinN.point, 3)} [${round(v.aucWithinN.lo, 3)}, ${round(v.aucWithinN.hi, 3)}]`);
  out.physics[`wave${k}`] = { massAdd: { farN: p.massAdd.far.n, farSlope: p.massAdd.far.slope.point, farExact: p.massAdd.far.shareEqual, nearSlope: p.massAdd.near.slope.point, nearExact: p.massAdd.near.shareEqual, mentionN2: { wholeMean: p.massAdd.mentionAdditivity["n=2"].meanWhole, partsMean: p.massAdd.mentionAdditivity["n=2"].meanSumOfParts }, mentionN3exact: p.massAdd.mentionAdditivity["n=3"].wholeEqSum, informativenessGain: p.massAdd.K3_informativeness.gain },
    floorCliff: p.inertia.floorCliff, inertiaRho: p.inertia.pooled.spearman_n_S, logLogSlope: { slope: p.massDef.pooledSlope, se: p.massDef.pooledSE, Q: p.massDef.Q, p: p.massDef.p }, conservation: p.conservation.n3up, affect: { collateral: p.affect.collateralShare_n3up, ci: p.affect.collateralShareCI, radius1: p.affect.byRadius.slotsChangedShare[1], entryShare: p.affect.entryShare },
    forceLaw: { alpha: p.forceLaw.pooled.fit.alpha, alphaCI: p.forceLaw.pooled.alphaCI, powerWins: `${p.forceLaw.P12.powerWinsIn}/${p.forceLaw.P12.corpora}`, shuffledFarOK: `${p.forceLaw.P13.shuffledFarExcessLe_halfIn ?? p.forceLaw.P13.shuffledFarExcessLeHalfIn}/${p.forceLaw.P13.corpora}` }, nicknameWithinN: { irc: nm.irc.aucWithinN, ud, wp: nm.wp.aucWithinN } };
}
const gr = readJson(path.join(PH, "gravity/_report.json"));
out.gravity = { PG1: gr.tests.PG1_existence, PG2: gr.tests.PG2_form, PG3: gr.tests.PG3_stability, informalVsFormal: gr.informalVsFormal };
chk("P.PG1.k", 24, gr.tests.PG1_existence.k, 0); chk("P.PG3.rho", -0.11, gr.tests.PG3_stability.spearman, 0.005); chk("P.PG2.medianAlpha", 1.14, gr.tests.PG2_form.medianAlpha, 0.005);
const nv = readJson(path.join(EVAL, "kinds-swarm/ant-kinds-novel/results/frag-wp.report.json"));
out.novelFragility = { cliff: nv.F1, slopeAboveFloor: nv.F2_pooled, pooledCurveD1: nv.pooledCurveD1, curveBins: nv.curveBins, mechanism: nv.mechanism, determinism: nv.determinism, sham: nv.sham };
chk("N.cliff", 1.779, nv.F1.cliff_m2_minus_m3, 0.002); chk("N.slope", 0.093, nv.F2_pooled.slopePerDoubling, 0.002);
out.checks = rows; out.summary = summary(); save("verify-physics.json", out);
console.log(JSON.stringify({ summary: out.summary }));
