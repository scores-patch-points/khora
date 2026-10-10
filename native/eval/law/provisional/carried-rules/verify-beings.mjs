// verify-beings.mjs — VERIFICATION-ONLY read of the saved beings-tier results (new file; run: node verify-beings.mjs).
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. No reader is run, no corpus text is read, no new experiment. The script re-derives, from saved JSON, the headline numbers that
//   eval/BEINGS-LADDER.md, eval/rules-structure-results.json and the beings-graded stage reports state, so that the carried rule book
//   quotes numbers that were recomputed from files and not copied from prose.
// DISCLOSURE. Already read before this header: BEINGS-LADDER.md, eval/beings-graded.mjs header and its report() output (stages g0-foldA/B/dev),
//   rules-structure.mjs header and rules-structure-results.json, eval/competence/CARD.md section 7, the khora memory notes.
//   Nothing in this script was tuned on those numbers; every threshold below is the one the source report used (0.002 for an effect to count
//   as up or down; 0.05 for the loss bound; 2 x base rate for the single-mention precision clause).
// DATA. beings-ladder-results/{s4 (DEV, optimistic), t1 (fold A), t2 (fold B)}/<stem>.json; beings-graded-results/{g0-dev,g0-foldA,g0-foldB}/<stem>.json.
//   Folds A and B are the held-out 20% slices of the TRAIN treebanks with every prior rebuilt without them (the ladder's own design).
// TESTS (each is "recomputed value equals the reported value within tol"; a check that fails is reported as NOT REPRODUCED and the rule book
//   then uses the recomputed number):
//   L1 mean PROPN F1 old(000) and new(111) per stage; L2 new-old mean and up/down/flat counts; L3 main effects S, R, A per stage;
//   L4 R: stems whose held-out lost-naming <= 0.05, medians of lost/caught for loss-bounded vs plurality; L5 salience AUC mean.
//   (The graded-cast numbers are checked by verify-graded.mjs, its own header.)
// BLIND PREDICTIONS. All checks reproduce within tolerance (the reports were produced by code reading these same files). The one place a
//   count may differ by 1 is a count of stems "up", because the source report does not state its threshold for that count (0.002 assumed).
// END-HEADER
import fs from "node:fs";
import path from "node:path";
import { EVAL, STEMS, CASELESS, round, mean, median, readJson, maybe, headerSha, makeChecks, save } from "./lib.mjs";

const { rows, chk, summary } = makeChecks();
const out = { script: "verify-beings.mjs", headerSha256: headerSha(import.meta.url), note: "verification-only; no reader run" };
const C = ["000", "100", "010", "001", "110", "101", "011", "111"], IDX = { S: 0, R: 1, A: 2 };
const flip = (c, k) => c.slice(0, IDX[k]) + (c[IDX[k]] === "0" ? "1" : "0") + c.slice(IDX[k] + 1);
const ladder = (stage, stem) => maybe(path.join(EVAL, "beings-ladder-results", stage, `${stem}.json`));
const F1 = (r, c) => r.configs[c].propn.F1;
const mainEff = (r, k) => mean(C.filter((c) => c[IDX[k]] === "0").map((c) => F1(r, flip(c, k)) - F1(r, c)));
const count = (xs, t = 0.002) => ({ up: xs.filter((x) => x > t).length, down: xs.filter((x) => x < -t).length, flat: xs.filter((x) => Math.abs(x) <= t).length });

// ---- L1-L5: the ladder, per stage
const rep = { s4: { old: 0.346, nw: 0.417 }, t1: { old: 0.338, nw: 0.415, d: 0.077, cnt: [23, 0, 2], S: 0.064, R: 0.001, A: 0.013, Sup: 22, Sdn: 0, Aup: 12, Adn: 0, lb: 15 }, t2: { old: 0.311, nw: 0.378, d: 0.067, cnt: [21, 2, 2], S: 0.056, R: -0.001, A: 0.012, Sup: 19, Sdn: 1, Aup: 12, Adn: 0, lb: 12 } };
out.ladder = {};
for (const stage of ["s4", "t1", "t2"]) {
  const R = Object.fromEntries(STEMS.map((s) => [s, ladder(stage, s)]).filter(([, r]) => r?.configs));
  const st = Object.keys(R), old = st.map((s) => F1(R[s], "000")), nw = st.map((s) => F1(R[s], "111")), d = nw.map((x, i) => x - old[i]);
  const eff = Object.fromEntries(["S", "R", "A"].map((k) => [k, Object.fromEntries(st.map((s) => [s, mainEff(R[s], k)]))]));
  const cnt = count(d), m2 = st.map((s) => R[s].m2).filter(Boolean), lb = m2.filter((x) => x.lostLossBounded <= 0.05).length;
  const sal = st.map((s) => R[s].m4?.salienceAUC).filter((x) => typeof x === "number");
  chk(`L1.${stage}.old`, rep[stage].old, mean(old), 0.002); chk(`L1.${stage}.new`, rep[stage].nw, mean(nw), 0.002);
  if (rep[stage].d != null) {
    chk(`L2.${stage}.delta`, rep[stage].d, mean(d), 0.002); chk(`L2.${stage}.up`, rep[stage].cnt[0], cnt.up, 1); chk(`L2.${stage}.down`, rep[stage].cnt[1], cnt.down, 1);
    for (const k of ["S", "R", "A"]) chk(`L3.${stage}.${k}`, rep[stage][k], mean(Object.values(eff[k])), 0.002);
    chk(`L3.${stage}.Sup`, rep[stage].Sup, count(Object.values(eff.S)).up, 1); chk(`L3.${stage}.Aup`, rep[stage].Aup, count(Object.values(eff.A)).up, 1);
    chk(`L4.${stage}.stemsLossLE05`, rep[stage].lb, lb, 1, "report: F3 15 (fold A), 12 (fold B)");
  }
  out.ladder[stage] = { n: st.length, meanOld: round(mean(old)), meanNew: round(mean(nw)), delta: round(mean(d)), counts: cnt, mainEffect: Object.fromEntries(["S", "R", "A"].map((k) => [k, { mean: round(mean(Object.values(eff[k]))), ...count(Object.values(eff[k])) }])),
    R: { stemsLostLE05: lb, of: m2.length, medianLost: { lossBounded: round(median(m2.map((x) => x.lostLossBounded))), plurality: round(median(m2.map((x) => x.lostPlurality))) }, medianCaught: { lossBounded: round(median(m2.map((x) => x.caughtLossBounded))), plurality: round(median(m2.map((x) => x.caughtPlurality))) } },
    salienceAUC: { mean: round(mean(sal)), n: sal.length, below05: sal.filter((x) => x < 0.5).length }, perStem: Object.fromEntries(st.map((s, i) => [s, { old: round(old[i]), new: round(nw[i]), d: round(d[i]), S: round(eff.S[s]), R: round(eff.R[s]), A: round(eff.A[s]) }])) };
}
chk("L5.dev.salienceAUC", 0.52, out.ladder.s4.salienceAUC.mean, 0.02); chk("L5.foldB.salienceAUC", 0.45, out.ladder.t2.salienceAUC.mean, 0.02);
// ---- scope lists (both held-out folds agree)
const both = (k, f) => STEMS.filter((s) => out.ladder.t1.perStem[s] && out.ladder.t2.perStem[s] && f(out.ladder.t1.perStem[s][k]) && f(out.ladder.t2.perStem[s][k]));
out.scope = { S_ge_0p05_both_folds: both("S", (x) => x >= 0.05), S_le_0p02_both_folds: both("S", (x) => x <= 0.02), A_ge_0p01_both_folds: both("A", (x) => x >= 0.01), R_abs_ge_0p005_either: STEMS.filter((s) => out.ladder.t1.perStem[s] && (Math.abs(out.ladder.t1.perStem[s].R) >= 0.005 || Math.abs(out.ladder.t2.perStem[s].R) >= 0.005)), goldNearZero: ["arb", "kor"] };
out.scope.S_caseless_mean = round(mean(STEMS.filter((s) => CASELESS.has(s) && out.ladder.t1.perStem[s]).map((s) => (out.ladder.t1.perStem[s].S + out.ladder.t2.perStem[s].S) / 2)));
out.scope.S_cased_mean = round(mean(STEMS.filter((s) => !CASELESS.has(s) && out.ladder.t1.perStem[s]).map((s) => (out.ladder.t1.perStem[s].S + out.ladder.t2.perStem[s].S) / 2)));
out.checks = rows; out.summary = summary(); save("verify-beings.part1.json", out);
console.log(JSON.stringify({ part: 1, summary: out.summary, scope: out.scope, foldA: out.ladder.t1.counts, foldB: out.ladder.t2.counts }));
