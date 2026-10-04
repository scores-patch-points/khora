// tests/pathos.test.js — Milestone 4: pathos in the planning loop. Exit
// criterion: corrections, refusals and new affected parties change ACTUAL
// SUBSEQUENT ACTIONS.
//
// The loop runs the required sequence (encounter → accounts → transition →
// execution → response/consequence → revised accounts and purpose → next
// transition). A refusal turns the next action into leave-alone (a completed
// disposition, not a failure). A correction turns the next action into a
// report of the opened gap. A new affected party reopens downstream
// derivations. None of this is prose attached afterward — the events change
// what the loop actually does next.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createPathosLoop,
  isRefusal,
  isCorrection,
} from "../pathos/index.js";
import {
  constructQueryAuthorizedSource,
  constructReadAdmittedMaterial,
  constructComputeInIsolation,
} from "../constructors/index.js";

const ENC = (over = {}) => ({
  schema: "Encounter@1",
  version: 1,
  encounter_id: over.encounter_id ?? "enc-001",
  time: "2026-10-04T12:00:00Z",
  observer: "the-fold",
  purpose_id: "purpose-001",
  medium: "text",
  source_refs: ["perm:abc123"],
  participants: [{ kind: "observed", identity: "p1", evidence: ["seen"], scope: ["this encounter"] }],
  context: "a meeting",
  observation_method: "direct",
  disclosure_scope: ["cited-material", "queries-to-p1"],
  ...over,
});

test("a refusal turns the next actual action into leave-alone", () => {
  const loop = createPathosLoop({
    purpose: "answer the question",
    encounters: [ENC()],
    sources: { p1: "the source answers within scope" },
  });
  // First action: query the source.
  const first = constructQueryAuthorizedSource({ purpose: "answer the question", encounters: [ENC()], source: "p1", scope: "queries-to-p1" });
  assert.ok(loop.run(first).ok);
  // The source declines. The loop must not retry — it revises to leave-alone.
  const revised = loop.reviseOnResponse({
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "answer the question",
    actual_response: "declined",
    source_address: "perm:abc123",
    disclosure_limits: ["do not ask again"],
    refusal: true,
  });
  assert.ok(revised.ok);
  assert.equal(revised.next.proposed_change, "leave_alone", "a refusal changes the subsequent action to leave-alone");
  assert.equal(loop.state.accounts.get("p1").epistemic_state, "inquiry_declined");
  // Leave-alone completes as a completed disposition, not a failure badge.
  const completion = loop.complete({ task_id: "t" });
  assert.equal(completion.completion_state, "left_alone");
  assert.ok(completion.note, "leaving alone is a completed disposition");
});

test("a correction turns the next actual action into a report of the gap", () => {
  const loop = createPathosLoop({
    purpose: "cite the fact",
    encounters: [ENC()],
    admitted: { "cited-material": "the cited text" },
  });
  const first = constructReadAdmittedMaterial({ purpose: "cite the fact", encounters: [ENC()], ref: "r", scope: "cited-material" });
  assert.ok(loop.run(first).ok);
  const revised = loop.reviseOnResponse({
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "the fact is X",
    actual_response: "the fact is actually Y",
    source_address: "perm:abc123",
    disclosure_limits: [],
    correction: true,
    plan_revisions: ["the cited fact was corrected"],
  });
  assert.ok(revised.ok);
  assert.equal(revised.next.proposed_change, "report_gap", "a correction changes the subsequent action to report the gap");
  assert.match(revised.next.effect_forecasts[0].effect, /corrected a prior claim|corrected the account|corrected/);
});

test("a new affected party reopens the derivation instead of continuing", () => {
  const loop = createPathosLoop({ purpose: "read the material", encounters: [ENC()] });
  const first = constructComputeInIsolation({ purpose: "read the material", encounters: [ENC()], what: "sum" });
  assert.ok(loop.run(first).ok);
  const revised = loop.reviseOnConsequence({
    schema: "Consequence@1",
    version: 1,
    encounter_id: "enc-001",
    observed_changes: ["the compute touched nothing"],
    unresolved_effects: [],
    unexpected_affected: ["p2"],
  });
  assert.ok(revised.ok);
  assert.deepEqual(revised.newAffected, ["p2"]);
  assert.equal(loop.state.accounts.get("p2").epistemic_state, "still_becoming");
  // The loop does NOT continue under the old, now-incomplete account — it
  // reopens with a transition that names the new party.
  assert.ok(revised.next, "a new affected party must produce a next transition");
  assert.equal(revised.next.affected_bearers[0].bearer, "p2");
  const completion = loop.complete({ task_id: "t" });
  assert.ok(completion.unresolved_consequences.length > 0, "the reopened effect is recorded as unresolved");
});

test("a plain response records the account and continues without inventing authority", () => {
  const loop = createPathosLoop({ purpose: "answer", encounters: [ENC()] });
  const r = loop.reviseOnResponse({
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "I can help",
    actual_response: "I can help",
    source_address: "perm:abc123",
    disclosure_limits: [],
  });
  assert.ok(r.ok);
  assert.equal(r.next, null, "a plain response continues the plan; it does not invent a new action");
  assert.equal(loop.state.accounts.get("p1").epistemic_state, "known");
});

test("a nonresponse is not agreement and does not fabricate a refusal", () => {
  const loop = createPathosLoop({ purpose: "answer", encounters: [ENC()] });
  const r = loop.reviseOnResponse({
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "I can help",
    source_address: "perm:abc123",
    disclosure_limits: [],
    // no actual_response — nonresponse
  });
  assert.ok(r.ok);
  assert.equal(r.next, null);
  assert.notEqual(loop.state.accounts.get("p1").epistemic_state, "inquiry_declined", "nonresponse is not a refusal");
});

test("pathos predicates only fire on explicit markers, never inferred from prose", () => {
  assert.equal(isRefusal({ actual_response: "I'd rather not, but maybe later" }), false, "prose is not a refusal marker");
  assert.equal(isRefusal({ actual_response: "declined" }), true);
  assert.equal(isRefusal({ refusal: true }), true);
  assert.equal(isCorrection({ actual_response: "that's wrong" }), false, "prose is not a correction marker");
  assert.equal(isCorrection({ correction: true }), true);
  assert.equal(isCorrection({ plan_revisions: ["recheck the source"] }), true);
});

test("a revision names its grounds and giver", () => {
  const loop = createPathosLoop({ purpose: "answer", encounters: [ENC()] });
  const r = loop.reviseOnResponse({
    schema: "Response@1",
    version: 1,
    responder: "p1",
    encounter_id: "enc-001",
    offered_response: "x",
    actual_response: "declined",
    source_address: "perm:abc123",
    disclosure_limits: [],
    refusal: true,
  });
  assert.ok(r.revision);
  assert.match(r.revision.effect_forecasts[0].effect, /declined/, "the revision's grounds are named on the forecast");
  assert.match(loop.purpose.giver ?? "", /p1/, "the revision's giver is named");
});