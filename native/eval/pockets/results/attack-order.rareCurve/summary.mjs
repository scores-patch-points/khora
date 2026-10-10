// summary.mjs -- compile the key numbers of every attack into attack-summary.json (deterministic; reads the other result files only). node summary.mjs
import fs from "node:fs";
import path from "node:path";
import { HERE } from "./lib.mjs";
const J = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8"));
const A = J("A_summary.json"), A2 = J("A2_summary.json"), A3 = J("A3_grain_counts.json"), B = J("B_rival.json"), C = J("C_multiplicity.json"), E = J("E_summary.json"), F = J("F_summary.json"), D1 = J("D_D1.json"), D2 = J("D_D2.json"), D3 = J("D_D3.json");
const pick = (o, ks) => Object.fromEntries(ks.map((k) => [k, o[k]]));
const out = { stat: "order.rareCurve", baseMatchesAtlas: { A: `${A.baseMatchesAtlas}/${A.nPockets}`, E: `${E.baseMatchesAtlas}/${E.n}` } };
out.A = Object.fromEntries(Object.entries(A.variants).map(([k, v]) => [k, { run: v.nRun, Pplus: v.basePplus && pick(v.basePplus, ["n", "signAgree", "stillPresentSameSign", "presentOppositeSign", "medianRetention"]), Pminus: v.basePminus && pick(v.basePminus, ["n", "signAgree", "stillPresentSameSign", "presentOppositeSign", "medianRetention"]), law: v.lawLevel }]));
out.A_byGrain = A3; out.A_codeAndLiturgical = Object.fromEntries(["len10", "t7500m10_r0", "t20000m10_r0"].map((k) => [k, A2[k]]));
const pt = (f) => f.trace.map((t, i) => ({ k: t.k, add: t.add, cost: t.cost, R2: t.R2, partialBeyondControls: +((t.R2 - f.controlsOnlyR2) / (1 - f.controlsOnlyR2)).toFixed(3), nestedCvR2: f.cv[i].nestedCvR2 }));
out.B = { bestSingleRivals: { all: B.subsets.all.top.slice(0, 4), present: B.subsets.present.top.slice(0, 3), wordgrain: B.subsets.wordgrain.top.slice(0, 3) }, forward: B.forward.map((f) => ({ label: f.label, nComplete: f.nComplete, controlsOnlyR2: f.controlsOnlyR2, steps: pt(f) })), signSplitAuc: B.signSplit, labelModels: B.labels };
out.C = { C1: C.C1, C2: { nPresent: C.C2.nPresent, perm: C.C2.perm2000, groupStratifiedRegister: C.C2.groupStratified[0], leaveOnePocketOut: C.C2.leaveOnePocketOut, leaveOneRegisterOut: C.C2.leaveOneRegisterOut, leaveOneGroupOut: C.C2.leaveOneGroupOut }, C3: { nPos: C.C3.nPos, nNeg: C.C3.nNeg, perm: C.C3.all, registerGroupStratified: C.C3.allGroupStratified[0], wordGrainOnly: C.C3.wordGrainOnly, leaveOneRegisterOut: C.C3.leaveOneRegisterOut, negativesWordGrain: C.C3.negativesWordGrain }, C4: C.C4 };
out.E = { signCrossTab: { Pplus: E.bySignPplus.all, Pminus: E.bySignPminus.all, PplusWord: E.bySignPplus.word, PminusCode: E.bySignPminus.code, PminusWord: E.bySignPminus.word }, medianSides: E.medianSides, trueU: { n: E.trueU.bothSidesPositiveBothHalves, of: E.trueU.nPplus, byGrain: E.trueU.byGrain }, docBootstrap: E.docBootstrap, docBootstrapByGrain: E.docBootstrapByGrain };
out.F = F; out.D = { D1: pick(D1, ["worlds", "halfCells", "absZ10ge4", "statusCounts", "maxAbsV", "maxAbsZ10", "maxAbsZ100"]), D2: D2.worlds.map((w) => ({ id: w.id, a: w.a, b: w.b, c: w.c, d: w.d, v: [w.vD, w.vC], z: [w.zD, w.zC], status: w.status, cL: w.cL[0], cR: w.cR[0], mul: w.mul })), D3: D3.map((w) => ({ id: w.id, v: [w.vD, w.vC], z: [w.zD, w.zC], status: w.status, cL: w.cL[0], cR: w.cR[0] })) };
fs.writeFileSync(path.join(HERE, "attack-summary.json"), JSON.stringify(out, null, 1));
console.log(Object.keys(out).join(","), JSON.stringify(out.B.forward.map((f) => [f.label, f.steps.map((s) => `${s.k}:${s.R2}/${s.partialBeyondControls}/${s.nestedCvR2}`)])));
