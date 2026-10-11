// terrain-arena-step4.mjs — STEP 4 FALSIFIER: does the standing ladder change
// any downstream decision? The fold self-audit experiment's whole demand: "a
// statistically coherent Kind may do nothing useful... coherence alone cannot
// license a repair; only measured consequences may increase its standing."
// If the shipped registry exposes NO consumer that decides differently by
// standing, then earned/candidate/refuted rows are behaviorally identical and
// the discipline is decorative — FALSIFIED.
//
// Probe (three gates a consumer must be able to make through the module):
//   G1 release differs: an EARNED row releases a consequential decision with
//      its measured evidence; a CANDIDATE row does not (withheld).
//   G2 withhold is honest: the withhold leaves the row candidate and
//      provisional — never silently promoted.
//   G3 defeat persists: a REFUTED row never releases, even given a fresh
//      validation — the defeated finding is preserved, not re-earned.
//   G4 pure: the consumer only reads (returns a plain boolean decision).
//
// Usage: node terrain-arena-step4.mjs /path/to/khora/native/kernel

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const kernel = path.resolve(process.argv[2] || "./native/kernel");
const hl = await import(pathToFileURL(path.join(kernel, "hyperlexicon-abstraction.js")).href);
const { createAbstractionRegistry, admitAbstraction, earnAbstraction, refuteAbstraction } = hl;
const release = hl.releaseDecision ?? null;

const r0 = createAbstractionRegistry();
const one = (label, memberRefs) => admitAbstraction(r0, { op: "SIG", grain: "Pattern", terrain: "Kind", label, depth: 0, memberRefs });

const earnedReg = (() => {
  const row = one("earned-one", ["e1", "e2", "e3", "e4"]);
  const id = Object.values(row.abstractions)[0].id;
  return earnAbstraction(row, { id, validation: { method: "held_out_consequence", effect: 0.71, pValue: 0.01, nullMethod: "outer_null" } });
})();
const earnedId = Object.values(earnedReg.abstractions)[0].id;

const candReg = one("candidate-one", ["e5", "e6", "e7", "e8"]);
const candId = Object.values(candReg.abstractions)[0].id;

const defeatedReg = (() => {
  const row = one("defeated-one", ["e9", "e10", "e11"]);
  const id = Object.values(row.abstractions)[0].id;
  return refuteAbstraction(
    { ...row, abstractions: { ...row.abstractions, [id]: { ...row.abstractions[id] } } },
    { id, falsifier: "step4", reason: { basis: "provoked counterexample" } },
  );
})();
const defeatedId = Object.values(defeatedReg.abstractions)[0].id;

const decision = (reg, id) => (release ? release(reg, { id }) : null);
const extraEarn = (() => {
  if (!hl.earnAbstraction || !release) return null;
  const attempted = hl.earnAbstraction(defeatedReg, { id: defeatedId, validation: { method: "fresh", effect: 0.9, pValue: 0.001 } });
  return release(attempted, { id: defeatedId });
})();

const calls = {
  earned: decision(earnedReg, earnedId),
  candidate: decision(candReg, candId),
  defeated: decision(defeatedReg, defeatedId),
  extraEarnAttempt: extraEarn,
};

const gates = {
  G1_releaseDiffers: Boolean(release) && calls.earned?.released === true && calls.candidate?.released === false && calls.earned?.why !== calls.candidate?.why,
  G2_withholdHonest: Boolean(release) && calls.candidate?.released === false && candReg.abstractions[candId]?.standing === "candidate" && Object.keys(candReg.abstractions).length === 1,
  G3_defeatPersists: Boolean(release) && calls.defeated?.released === false && calls.extraEarnAttempt?.released === false,
  G4_pure: Boolean(release) && typeof calls.earned?.released === "boolean",
};

const verdict = Object.values(gates).every(Boolean)
  ? { verdict: "CONFIRMED", claim: "the standing ladder changes downstream behavior: earned releases with evidence, candidate withholds honestly, and a defeated row never re-releases — the discipline is wired, not decorative." }
  : !release
    ? { verdict: "FALSIFIED", claim: "the shipped registry exposes NO downstream consumer of standing — a coherence-promoted candidate and an earned abstraction are behaviorally identical. The ladder is decorative; repair: add a release/warrant gate keyed on standing." }
    : { verdict: "FALSIFIED", claim: "a standing gate failed — earned vs candidate did not decide differently, or a defeated row re-released." };

console.log(JSON.stringify({
  schema: "EOTerrainArenaStep4@1",
  releaseApiPresent: Boolean(release),
  decisions: Object.fromEntries(Object.entries(calls).map(([k, v]) => [k, v ? { released: v.released, standing: v.standing ?? null, why: String(v.why).slice(0, 90) } : null])),
  gates,
  verdict: verdict.verdict,
  claim: verdict.claim,
  limitations: ["The probe models a consumer question; it does not re-run the p≈0.630 outer-null — it encodes the experiment's ruling as the gate."],
}, null, 2));