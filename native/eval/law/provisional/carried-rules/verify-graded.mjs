// verify-graded.mjs — VERIFICATION-ONLY read of the saved graded-cast results and the rules-structure synthesis (new file).
//
// PRE-REGISTRATION (FOLD-CONSTITUTION II.5), written before the first run of this script.
// KIND. No reader is run and no corpus text is read. Recomputes numbers that the printed report() of eval/beings-graded.mjs (stages g0-foldA, g0-foldB, g0-dev)
//   and eval/rules-structure-results.json state, from beings-graded-results/<stage>/<stem>.json, so the carried rule book can quote them.
// DISCLOSURE. Already read: the beings-graded.mjs header (VG1-VG4, P1-P6) and the printed reports of g0-dev, g0-foldA, g0-foldB, g0x-*; rules-structure-results.json.
//   The printed numbers I will check: fold A mean dF1 G-B1 -0.177 (recurring gold), +0.090 (all-PROPN gold); fold B -0.160 and +0.105; single-mention clause
//   "precision >= 2 x base rate and hits > 0": 23 of 25 stems (fold A), 25 of 25 (fold B); mean Born weights class 0.705/0.731, proper 0.098/0.093,
//   key 0.129/0.115, recur 0.068/0.061 (fold A / fold B).
// TESTS. G1 means of G-B1 on rec and all; G2 single-mention clause counts and the stems that fail it; G3 mean Born weights; G4 the equal-weight blend Gq against B1 on all-PROPN
//   gold (not printed in the report; a new aggregation, labelled exploratory); G5 the evidence-rule table of rules-structure-results.json is copied unchanged.
// BLIND PREDICTIONS. G1-G3 reproduce within 0.002 / exact counts. G4: Gq beats B1 on all-PROPN gold in at least as many stems as G does (the DMD weighting is not what
//   carries the all-gold gain). Not a verdict; a description of the saved files.
// END-HEADER
import path from "node:path";
import { EVAL, STEMS, round, mean, readJson, maybe, headerSha, makeChecks, save } from "./lib.mjs";

const { rows, chk, summary } = makeChecks();
const out = { script: "verify-graded.mjs", headerSha256: headerSha(import.meta.url), note: "verification-only; no reader run", stages: {} };
const rep = { "g0-foldA": { rec: -0.177, all: 0.090, single: 23, w: [0.705, 0.098, 0.129, 0.068] }, "g0-foldB": { rec: -0.160, all: 0.105, single: 25, w: [0.731, 0.093, 0.115, 0.061] } };
const cnt = (xs, t = 0.0005) => ({ up: xs.filter((x) => x > t).length, down: xs.filter((x) => x < -t).length });
for (const stage of ["g0-dev", "g0-foldA", "g0-foldB"]) {
  const R = Object.fromEntries(STEMS.map((s) => [s, maybe(path.join(EVAL, "beings-graded-results", stage, `${s}.json`))]).filter(([, r]) => r?.rec));
  const st = Object.keys(R), dRec = st.map((s) => R[s].rec.G.F1 - R[s].rec.B1.F1), dAll = st.map((s) => R[s].all.G.F1 - R[s].all.B1.F1), dQAll = st.map((s) => R[s].all.Gq.F1 - R[s].all.B1.F1);
  const dQRec = st.map((s) => R[s].rec.Gq.F1 - R[s].rec.B1.F1);
  const ok = st.filter((s) => { const x = R[s].single; return x.picked > 0 && x.hit > 0 && x.precision != null && x.baseRate != null && x.precision >= 2 * x.baseRate; });
  const w = [0, 1, 2, 3].map((i) => mean(st.map((s) => R[s].weights.born[i])));
  const aucMean = mean(st.map((s) => R[s].auc).filter((x) => typeof x === "number"));
  const bestSingle = st.map((s) => ["class", "proper", "key", "recur"].map((k) => R[s].rec[`S_${k}`].F1)).map((v) => ["class", "proper", "key", "recur"][v.indexOf(Math.max(...v))]);
  if (rep[stage]) {
    chk(`G1.${stage}.rec`, rep[stage].rec, mean(dRec), 0.002); chk(`G1.${stage}.all`, rep[stage].all, mean(dAll), 0.002);
    chk(`G2.${stage}.singleOk`, rep[stage].single, ok.length, 0); ["class", "proper", "key", "recur"].forEach((k, i) => chk(`G3.${stage}.w.${k}`, rep[stage].w[i], w[i], 0.002));
  }
  out.stages[stage] = { n: st.length, dF1_G_minus_B1: { recurringGold: round(mean(dRec)), allPropnGold: round(mean(dAll)), recCounts: cnt(dRec), allCounts: cnt(dAll) },
    exploratory_Gq_minus_B1: { recurringGold: round(mean(dQRec)), allPropnGold: round(mean(dQAll)), allCounts: cnt(dQAll) },
    single: { stemsOk: ok.length, of: st.length, failing: st.filter((s) => !ok.includes(s)), perStem: Object.fromEntries(st.map((s) => [s, { picked: R[s].single.picked, hit: R[s].single.hit, precision: R[s].single.precision, baseRate: R[s].single.baseRate, recall: R[s].single.recall }])) },
    bornWeights: { class: round(w[0]), proper: round(w[1]), key: round(w[2]), recur: round(w[3]) }, meanAucRecurringNames: round(aucMean), bestSingleRule: Object.fromEntries(["class", "proper", "key", "recur"].map((k) => [k, bestSingle.filter((x) => x === k).length])) };
}
// rules-structure-results.json copied unchanged (it is itself a saved synthesis; this just carries the evidence-rule table and the interaction table)
const rs = readJson(path.join(EVAL, "rules-structure-results.json"));
out.rulesStructure = { interactions: rs.interactions, profileStability: rs.profileStability, propertyCorrelations: rs.propertyCorrelations, groupMeans: rs.groupMeans, evidenceRules: rs.evidenceRules };
out.checks = rows; out.summary = summary(); save("verify-graded.json", out);
console.log(JSON.stringify({ summary: out.summary, foldA: out.stages["g0-foldA"].single.stemsOk, foldB: out.stages["g0-foldB"].single.stemsOk, gq: [out.stages["g0-foldA"].exploratory_Gq_minus_B1, out.stages["g0-foldB"].exploratory_Gq_minus_B1] }));
