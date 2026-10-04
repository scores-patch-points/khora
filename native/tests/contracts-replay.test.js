// tests/contracts-replay.test.js — Milestone 1: the contracts round-trip
// without collapse, and reject fabricated identities and testimony.
//
// Exit condition: "No fabricated identities or testimony; all states round-trip
// without collapse." Every contract is validated, then serialized to its
// canonical form, parsed back, and re-validated; a record that does not
// reconstruct byte-identically is a collapse and fails this test. Each
// fabricated shape (a withheld participant carrying a concrete identity, an
// observed participant without evidence, testimony without a source) is
// rejected by name.

import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACTS,
  validateRecord,
  replayRecord,
  canonicalString,
} from "../contracts/index.js";

// A valid instance of every contract — all states present, none collapsed.
const WELLFORMED = Object.freeze({
  "Encounter@1": {
    schema: "Encounter@1",
    version: 1,
    encounter_id: "enc-001",
    time: "2026-10-04T12:00:00Z",
    observer: "the-fold",
    purpose_id: "purpose-001",
    medium: "text",
    source_refs: ["perm:abc123"],
    participants: [
      { kind: "observed", identity: "p1", evidence: ["seen in source"], scope: ["this encounter"] },
      { kind: "unresolved", evidence: ["mentioned but not identified"], scope: ["this encounter"] },
      { kind: "withheld", evidence: ["declined to be identified"], scope: ["this encounter"] },
    ],
    context: "a meeting",
    observation_method: "direct",
    disclosure_scope: ["participants", "the-fold"],
    operation: "selected",
  },
  "Standing@1": {
    schema: "Standing@1",
    version: 1,
    bearer: "p1",
    commitments: [
      { commitment: "not to be investigated without consent", giver: "p1", scope: "this inquiry" },
    ],
    givers: ["p1"],
    scope: "this inquiry",
    reported_preferences: "prefers not to be contacted",
    rights: ["privacy"],
    legal_authority: null,
    descriptive_beliefs: ["p1 appears once in the source"],
  },
  "AgencyAccount@1": {
    schema: "AgencyAccount@1",
    version: 1,
    bearer: "p1",
    affected_by: "action-001",
    capacities: {
      access: { evidence_type: "observation", detail: "p1 controls the folder" },
      disclosure: { evidence_type: "testimony", source: "p1", detail: "p1 said not to share" },
      refusal: { evidence_type: "observation", detail: "p1 declined once" },
      participation: { evidence_type: "forecast", horizon: "next turn", detail: "may participate" },
      contestability: { evidence_type: "observation", detail: "p1 can appeal" },
      dependence: { evidence_type: "observation", detail: "p1 depends on the file" },
      practical_options: { evidence_type: "observation", detail: "p1 can leave" },
    },
    unknown_affected: ["someone reached via p1"],
  },
  "EpistemicPosition@1": {
    schema: "EpistemicPosition@1",
    version: 1,
    epistemic_state: "known",
    supplied_by: "p1",
    scope: "this inquiry",
    review_conditions: ["on new independent evidence", "on renewed invitation"],
  },
  "SituatedTransition@1": {
    schema: "SituatedTransition@1",
    version: 1,
    purpose: "answer the citation question",
    encounters: ["enc-001"],
    affected_bearers: [{ bearer: "p1" }],
    before: "no change",
    proposed_change: "report the cited fact",
    effect_forecasts: [
      { effect: "p1 may be contacted", scope: "this turn", evidence: ["p1 appears in source"], revisable: true },
    ],
    alternatives: ["leave alone"],
    unknowns: ["whether p1 wants contact"],
    contest_routes: ["p1 can decline"],
    operational_authority: "inquiry",
    constructive_derivation: { rule: "relational-compose@1", inputs: ["enc-001", "standing:p1"] },
    falsifiers: ["p1 later says contact was unwanted"],
  },
  "Response@1": {
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "yes I can answer",
    actual_response: "yes I can answer",
    source_address: "perm:abc123",
    disclosure_limits: ["do not attribute beyond this answer"],
    plan_revisions: ["ask only the one question"],
  },
  "Consequence@1": {
    schema: "Consequence@1",
    version: 1,
    encounter_id: "enc-001",
    observed_changes: ["p1 answered"],
    unresolved_effects: ["whether p1's answer is complete"],
    unexpected_affected: ["p2"],
    forecast_revision: "forecast updated",
  },
  "Completion@1": {
    schema: "Completion@1",
    version: 1,
    completion_state: "accomplished_with_open_effects",
    task_id: "task-001",
    checks: ["the cited fact was independently verified"],
    unresolved_consequences: ["p2's standing remains unexamined"],
  },
});

test("all eight contracts validate their well-formed instances", () => {
  assert.equal(CONTRACTS.length, 8, "the registry carries all eight contracts");
  for (const record of Object.values(WELLFORMED)) {
    const v = validateRecord(record);
    assert.equal(v.valid, true, `${record.schema} should validate: ${v.errors.join("; ")}`);
  }
});

test("all well-formed instances round-trip without collapse", () => {
  for (const record of Object.values(WELLFORMED)) {
    const rp = replayRecord(record);
    assert.equal(rp.valid, true, `${record.schema} valid`);
    assert.equal(rp.ok, true, `${record.schema} must survive canonical round-trip: ${rp.reason}`);
    assert.equal(canonicalString(rp.restored), rp.canonical, `${record.schema} reconstructed form must be canonical`);
  }
});

test("replay is byte-deterministic regardless of key order", () => {
  const a = WELLFORMED["Encounter@1"];
  const shuffled = Object.fromEntries(
    [...Object.entries(a)].sort(() => (Math.random() > 0.5 ? 1 : -1)),
  );
  assert.equal(canonicalString(shuffled), canonicalString(a), "canonical form must not depend on insertion order");
});

// ── fabricated identities and testimony are rejected by name ───────────────
test("a withheld participant carrying a concrete identity is rejected (fabricated identity)", () => {
  const record = {
    ...WELLFORMED["Encounter@1"],
    participants: [
      { kind: "withheld", identity: "the real person's name", evidence: ["declined"], scope: ["this encounter"] },
    ],
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /withheld participant must not carry a concrete identity/.test(e)));
});

test("an observed participant with no evidence is rejected", () => {
  const record = {
    ...WELLFORMED["Encounter@1"],
    participants: [{ kind: "observed", identity: "x", evidence: [], scope: ["this encounter"] }],
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /observed participant requires evidence/.test(e)));
});

test("testimony without a named source is rejected (never inferred from a proxy)", () => {
  const record = {
    ...WELLFORMED["AgencyAccount@1"],
    capacities: { disclosure: { evidence_type: "testimony", detail: "someone in that category said no" } },
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /testimony requires a named source/.test(e)));
});

test("a model-generated account cannot occupy a response as another's response", () => {
  const record = {
    ...WELLFORMED["Response@1"],
    responder: "p1",
    model_generated: true,
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /model-generated account cannot occupy/.test(e)));
});

test("nonresponse is not agreement", () => {
  const record = {
    ...WELLFORMED["Response@1"],
    actual_response: undefined,
    agreement: true,
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /nonresponse is not agreement/.test(e)));
});

// ── forbidden states are rejected ──────────────────────────────────────────
test("completion cannot certify universe approval or universal goodness", () => {
  for (const cert of ["universe_pleased", "universally_good", "morally_complete"]) {
    const record = { ...WELLFORMED["Completion@1"], [cert]: true };
    const v = validateRecord(record);
    assert.equal(v.valid, false, `${cert} must be rejected`);
  }
});

test("a transition forecast supported only by understand/affirms flags is rejected", () => {
  const record = {
    ...WELLFORMED["SituatedTransition@1"],
    effect_forecasts: [
      { effect: "harmless", scope: "this turn", evidence: ["we understand it is fine"], revisable: true, understand: true },
    ],
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /understand\/affirms flags cannot establish/.test(e)));
});

test("a derivation that is a renamed rejection is rejected", () => {
  const record = {
    ...WELLFORMED["SituatedTransition@1"],
    constructive_derivation: { rule: "physics", inputs: ["enc-001"] },
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /renamed as a derivation/.test(e)));
});

test("still_becoming is not treated as unknown", () => {
  const record = {
    ...WELLFORMED["EpistemicPosition@1"],
    epistemic_state: "still_becoming",
    treated_as_unknown: true,
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /must not be treated as unknown/.test(e)));
});

test("an all-encompassing bearer abstraction is rejected", () => {
  const record = {
    ...WELLFORMED["SituatedTransition@1"],
    affected_bearers: [{ bearer: "universe" }],
  };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
  assert.ok(v.errors.some((e) => /all-encompassing abstraction/.test(e)));
});

test("an invalid completion state is rejected", () => {
  const record = { ...WELLFORMED["Completion@1"], completion_state: "done" };
  const v = validateRecord(record);
  assert.equal(v.valid, false);
});