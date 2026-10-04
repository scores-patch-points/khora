// tests/integration.test.js — Milestone 7: the khora → penelope → the-fold
// trace with end-to-end replay, restart, disclosure and counterexample
// controls. Exit criterion: end-to-end replay, restart, disclosure and
// counterexample controls pass.
//
// The trace is append-only and hash-chained; replay reconstructs the
// projection from the trace alone; a restart reconciles receipt before retry
// (no duplicate action, no lost disclosure scope); the disclosure control
// produces the honest limited public account (never a false claim of complete
// knowledge); the falsification battery's counterexamples refuse end-to-end.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createTrace,
  verifyTrace,
  replay,
  restart,
  publicAccount,
  runCounterexamples,
} from "../integration/index.js";

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

// ── the trace is append-only and hash-chained ───────────────────────────────
test("the trace records every step and verifies its hash chain", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC());
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, purpose: "answer", proposed_change: "read_admitted_material" });
  trace.recordEffect({ schema: "ExecutedEffect@1", version: 1, operation: "read_admitted_material" });
  trace.recordCompletion({ schema: "Completion@1", version: 1, completion_state: "accomplished" });
  const v = verifyTrace(trace);
  assert.equal(v.ok, true, v.problems.join("; "));
});

test("a truncated trace breaks the hash chain", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC());
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, proposed_change: "x" });
  const truncated = { ...trace, entries: trace.entries.slice(0, 1) };
  const v = verifyTrace(truncated);
  assert.equal(v.ok, false, "a truncated log must break the hash chain");
  assert.ok(v.problems.some((p) => /hash chain|prevHash/.test(p)));
});

// ── replay reconstructs the projection from the trace alone ────────────────
test("replay reconstructs the projection with no added content", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({ encounter_id: "e1" }));
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, purpose: "answer", proposed_change: "read_admitted_material" });
  trace.recordResponse({
    schema: "Response@1", version: 1, responder: "p1", encounter_id: "e1",
    offered_response: "yes", actual_response: "yes", source_address: "perm:x", disclosure_limits: [],
  });
  const r = replay(trace);
  assert.equal(r.ok, true);
  assert.equal(r.projection.encounters.length, 1);
  assert.equal(r.projection.transitions.length, 1);
  assert.equal(r.projection.responses.length, 1);
  assert.equal(r.projection.encounters[0].encounter_id, "e1");
});

test("an uninterrupted trace and its replay agree with zero discrepancies", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({ encounter_id: "e1" }));
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, proposed_change: "read_admitted_material" });
  const r = replay(trace);
  assert.equal(r.chain.ok, true);
  assert.deepEqual(r.projection.encounters, [ENC({ encounter_id: "e1" })]);
});

// ── restart reconciles receipt before retry ─────────────────────────────────
test("a restart does not re-execute an action whose receipt was never recorded", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({ encounter_id: "e1" }));
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, proposed_change: "query_authorized_source" });
  trace.recordEffect({ schema: "ExecutedEffect@1", version: 1, operation: "query_authorized_source" });
  // The effect ran, but the restart happened before any Response/Consequence
  // was recorded. The restart must NOT re-execute it.
  const r = restart(trace, { untilSeq: trace.entries.length });
  assert.equal(r.safeToRetry.length, 0, "no unresolved transition is retried");
  assert.ok(r.unresolvedReceipts.length > 0, "the missing receipt is recorded");
  assert.equal(r.unresolvedReceipts[0].operation, "query_authorized_source");
});

test("a restart after receipt continues without duplicate action or lost scope", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({ encounter_id: "e1", disclosure_scope: ["cited-material"] }));
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, proposed_change: "read_admitted_material" });
  trace.recordEffect({ schema: "ExecutedEffect@1", version: 1, operation: "read_admitted_material" });
  trace.recordConsequence({
    schema: "Consequence@1", version: 1, encounter_id: "e1",
    observed_changes: ["read happened"], unresolved_effects: [], unexpected_affected: [],
  });
  const r = restart(trace, { untilSeq: trace.entries.length });
  assert.equal(r.unresolvedReceipts.length, 0, "the receipt was recorded; nothing is unresolved");
  // The disclosure scope is not lost on restart: the replay still carries it.
  const rp = replay(trace);
  assert.ok(rp.projection.encounters[0].disclosure_scope.includes("cited-material"));
});

// ── disclosure control: honest limited public account ───────────────────────
test("disclosure discloses limits and never claims complete knowledge", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({
    encounter_id: "e1",
    participants: [
      { kind: "observed", identity: "p1", evidence: ["seen"], scope: ["this encounter"] },
      { kind: "withheld", evidence: ["declined"], scope: ["this encounter"] },
    ],
  }));
  const account = publicAccount(trace);
  assert.equal(account.claimsComplete, false, "the account never claims complete knowledge");
  assert.ok(account.withheld.some((w) => /declined/.test(w)), "a withheld identity is disclosed as held, not as a fact");
  const p1 = account.participants.find((p) => p.bearer === "p1");
  assert.ok(p1 && p1.exists === true, "whose account exists is shown");
  assert.ok(account.participants.some((p) => p.held === true), "whose account does not exist is shown");
});

test("leave-alone is disclosed as a completed disposition, not a failure", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "s1" });
  trace.recordEncounter(ENC({ encounter_id: "e1" }));
  trace.recordCompletion({ schema: "Completion@1", version: 1, completion_state: "left_alone" });
  const account = publicAccount(trace);
  assert.ok(account.disclosed.some((d) => /left alone.*completed disposition/.test(d)));
});

// ── counterexample controls pass end-to-end ─────────────────────────────────
test("the counterexample controls pass through the integrated seam", () => {
  const r = runCounterexamples();
  assert.equal(r.ok, true, "every counterexample control must pass at the seam");
  // The raw mayeroffJudge may still show the falsified baseline; the SEAM is
  // what refuses. Report the raw results honestly.
  for (const c of r.results) {
    assert.equal(c.seam.refuses, c.seam.required, `${c.name}: seam must refuse`);
  }
});

test("a flag cannot launder an extractive shape through the seam", () => {
  // Baseline falsification: understand=true made mayeroffJudge return
  // realizable. The seam must refuse the shape it would have laundered.
  const r = runCounterexamples();
  const understand = r.results.find((c) => c.name.includes("understanding flag"));
  assert.ok(understand, "the understanding-flag control exists");
  assert.equal(understand.raw.realizable, true, "the raw falsified behavior is reported");
  assert.equal(understand.seam.refuses, true, "the seam refuses the laundered shape");
});

// ── end-to-end: a real pathos-loop run recorded to a trace ──────────────────
import {
  constructQueryAuthorizedSource,
  constructReadAdmittedMaterial,
} from "../constructors/index.js";
import { createPathosLoop } from "../pathos/index.js";

test("a full pathos-loop run records a verifiable trace end-to-end", () => {
  const trace = createTrace({ purpose: "answer the citation question", sessionId: "e2e-001" });
  const loop = createPathosLoop({ purpose: "answer the citation question", encounters: [ENC({ encounter_id: "e1" })], admitted: { "cited-material": "the cited text" } });

  // encounter
  trace.recordEncounter(ENC({ encounter_id: "e1" }));
  // candidate transition
  const transition = constructReadAdmittedMaterial({ purpose: "answer", encounters: [ENC({ encounter_id: "e1" })], ref: "r", scope: "cited-material" });
  trace.recordTransition(transition);
  // execution → effect
  const executed = loop.run(transition);
  assert.ok(executed.ok, executed.reason);
  for (const effect of loop.state.runtime.effects) trace.recordEffect(effect);
  // consequence → revised account
  trace.recordConsequence({
    schema: "Consequence@1", version: 1, encounter_id: "e1",
    observed_changes: ["material read"], unresolved_effects: [], unexpected_affected: [],
  });
  // completion
  trace.recordCompletion({ schema: "Completion@1", version: 1, completion_state: "accomplished", task_id: "e2e-001", checks: [], unresolved_consequences: [] });

  // The trace verifies and replays with the recorded content.
  assert.equal(verifyTrace(trace).ok, true);
  const rp = replay(trace);
  assert.equal(rp.projection.encounters.length, 1);
  assert.equal(rp.projection.transitions.length, 1);
  assert.equal(rp.projection.effects.length, 1);
  assert.equal(rp.projection.completions.length, 1);
});

test("the end-to-end trace carries disclosure scope into the public account", () => {
  const trace = createTrace({ purpose: "answer", sessionId: "e2e-002" });
  trace.recordEncounter(ENC({ encounter_id: "e1", disclosure_scope: ["cited-material"] }));
  trace.recordTransition({ schema: "SituatedTransition@1", version: 1, proposed_change: "read_admitted_material" });
  const account = publicAccount(trace);
  assert.ok(account.disclosed.some((d) => /cited-material/.test(d)), "the disclosed scope is carried");
  assert.equal(account.claimsComplete, false);
});