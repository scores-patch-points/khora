// tests/standing-gate.test.js — the standing gate lives in the kernel's own
// diagnostics: every induced population Kind is disclosed as a WITHHELD
// candidate by default (coherence alone earns nothing), so any consumer of
// kindDiagnostics() inherits the discipline with no per-surface change.
// A pipeline that has independently measured a consequence promotes upstream.
import test from "node:test";
import assert from "node:assert/strict";

import { createKindInductionIndex, indexKindEntries, kindEvidence, kindDiagnostics } from "../kernel/kind-induction.js";
import { createAbstractionRegistry, admitAbstraction, earnAbstraction, releaseDecision } from "../kernel/hyperlexicon-abstraction.js";

function grant(index) {
  // a small population with three entities sharing features, so a basin forms
  const entries = [];
  for (let i = 0; i < 9; i += 1) {
    const eid = `entity:${i}`;
    entries.push(kindEvidence({ id: `ev:${i}:1`, entityRef: eid, featureKey: `group:${i % 3}`, featureValue: true, sequencePosition: i }));
    entries.push(kindEvidence({ id: `ev:${i}:2`, entityRef: eid, featureKey: `shared`, featureValue: true, sequencePosition: i + 100 }));
  }
  indexKindEntries(index, entries);
  return index;
}

test("kindDiagnostics discloses every population candidate as withheld (candidate)", () => {
  const index = grant(createKindInductionIndex([], { populationMinPrevalence: 0.02, populationPermutations: 12 }));
  const diag = kindDiagnostics(index);
  assert.equal(diag.populationKindCandidates.length > 0, true);
  for (const c of diag.populationKindCandidates) {
    assert.equal(c.released, false);
    assert.equal(c.standing, "candidate");
    assert.match(c.releaseWhy, /WITHHELD|candidate|coherence/i);
  }
});

test("an earned abstraction is the only released path", () => {
  const reg0 = createAbstractionRegistry();
  const admitted = admitAbstraction(reg0, { op: "SIG", grain: "Pattern", terrain: "Kind", label: "validated", depth: 0, memberRefs: ["a", "b", "c"] });
  const id = Object.values(admitted.abstractions)[0].id;
  const earned = earnAbstraction(admitted, { id, validation: { method: "held_out_consequence", effect: 0.5, pValue: 0.01 } });
  assert.equal(releaseDecision(earned, { id }).released, true);
  const cand = releaseDecision(admitted, { id });
  assert.equal(cand.released, false);
});