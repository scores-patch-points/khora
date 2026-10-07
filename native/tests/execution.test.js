// tests/execution.test.js — Milestone 3: exact-transition adapters in an
// isolated runtime. Exit criterion: no side effect without matching
// construction; mutation tests expose bypasses.
//
// A transition is executable only if a constructor produced it, its derivation
// still matches its current fields, and it runs under the declared policy. A
// mutated transition (changed target, changed scope, swapped payload, stripped
// derivation) is refused before any effect. The gated operations (publication,
// person-directed communication) never touch the world — they write an outbox
// record inside the runtime.

import test from "node:test";
import assert from "node:assert/strict";
import {
  constructReadAdmittedMaterial,
  constructQueryAuthorizedSource,
  constructComputeInIsolation,
  constructProposeEdit,
  constructLeaveAlone,
  constructPublishExternally,
  constructCommunicateWithPerson,
} from "../constructors/index.js";
import { executeTransition, createExecutionRuntime, bindTransition } from "../execution/index.js";

const ENC = () => ({
  schema: "Encounter@1",
  version: 1,
  encounter_id: "enc-001",
  time: "2026-10-04T12:00:00Z",
  observer: "the-fold",
  purpose_id: "purpose-001",
  medium: "text",
  source_refs: ["perm:abc123"],
  participants: [{ kind: "observed", identity: "p1", evidence: ["seen"], scope: ["this encounter"] }],
  context: "a meeting",
  observation_method: "direct",
  disclosure_scope: ["cited-material", "queries-to-p1"],
});

test("a constructed transition executes and records its effect", () => {
  const runtime = createExecutionRuntime({ admitted: new Map([["cited-material", "the cited text"]]) });
  const t = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  const r = executeTransition(t, { runtime });
  assert.ok(r.ok, r.reason);
  assert.equal(r.result.text, "the cited text");
  assert.equal(runtime.effects.length, 1, "the effect is recorded (instrumentation)");
  assert.equal(runtime.effects[0].operation, "read_admitted_material");
  assert.equal(runtime.effects[0].policy, "ConstitutiveEthos@0.1");
});

test("a transition with no construction is refused before any effect", () => {
  const runtime = createExecutionRuntime();
  const forged = {
    schema: "SituatedTransition@1",
    version: 1,
    purpose: "p",
    encounters: [],
    affected_bearers: [],
    proposed_change: "compute_in_isolation",
    effect_forecasts: [{ effect: "x", scope: "research-only", evidence: [], revisable: true }],
    unknowns: [],
    contest_routes: [],
    operational_authority: "constructed",
    constructive_derivation: null, // no constructor produced this
    falsifiers: [],
  };
  const r = executeTransition(forged, { runtime });
  assert.ok(!r.ok, "a forged transition must be refused");
  assert.match(r.reason, /not constructed/);
  assert.equal(runtime.effects.length, 0, "no side effect without matching construction");
});

test("a mutated target cannot inherit an old derivation (mutation test)", () => {
  const runtime = createExecutionRuntime();
  const t = constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum" });
  // Mutate the transition AFTER construction: point it at a bearer it never
  // derived. The binding must refuse it — a changed target cannot inherit the
  // compute-in-isolation derivation (which affects no one).
  const mutated = {
    ...t,
    affected_bearers: [{ bearer: "p1" }],
  };
  const binding = bindTransition(mutated);
  assert.ok(!binding.ok, "changed target must break the binding");
  const r = executeTransition(mutated, { runtime });
  assert.ok(!r.ok);
  assert.match(r.reason, /changed after construction/);
  assert.equal(runtime.effects.length, 0, "no effect for a mutated transition");
});

test("a mutated scope cannot inherit an old derivation (mutation test)", () => {
  const runtime = createExecutionRuntime();
  const t = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  const mutated = {
    ...t,
    effect_forecasts: [{ effect: "read a different thing", scope: "research-only", evidence: ["x"], revisable: true }],
  };
  const r = executeTransition(mutated, { runtime });
  assert.ok(!r.ok, "changed scope must be refused");
  assert.equal(runtime.effects.length, 0);
});

test("a stripped derivation cannot inherit an old authorization", () => {
  const runtime = createExecutionRuntime();
  const t = constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum" });
  const stripped = { ...t, constructive_derivation: { schema: "ConstructiveDerivation@1", version: 1, rule: "physics", inputs: [], policy: "ConstitutiveEthos@0.1" } };
  const r = executeTransition(stripped, { runtime });
  assert.ok(!r.ok, "a gate renamed as a derivation is not a construction");
});

test("a wrong policy version is refused", () => {
  const runtime = createExecutionRuntime();
  const t = constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum" });
  const r = executeTransition(t, { runtime, policy: "SomeOtherPolicy@9" });
  assert.ok(!r.ok);
  assert.match(r.reason, /policy version mismatch/);
});

test("gated publication writes an outbox record and never publishes", () => {
  const runtime = createExecutionRuntime();
  const t = constructPublishExternally({ purpose: "p", encounters: [ENC()], artifact: "a", disclosure_scope: "public-report", authority_giver: "operator" });
  const r = executeTransition(t, { runtime });
  assert.ok(r.ok, r.reason);
  assert.equal(r.result.published, false, "nothing is actually published");
  assert.equal(runtime.outbox.length, 1, "an outbox record exists");
  assert.equal(r.result.in_outbox, true, "the outbox record is marked not-actually-published");
});

test("gated person-directed communication never contacts the person", () => {
  const runtime = createExecutionRuntime();
  const t = constructCommunicateWithPerson({ purpose: "p", encounters: [ENC()], to: "p1", message: "hi", disclosure_scope: "personal" });
  const r = executeTransition(t, { runtime });
  assert.ok(r.ok, r.reason);
  assert.equal(r.result.sent, false, "nothing is sent");
  assert.equal(runtime.outbox.length, 1);
});

test("every performed effect is instrumented on the runtime ledger", () => {
  const runtime = createExecutionRuntime({ admitted: new Map([["cited-material", "text"]]) });
  const read = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  // The isolated compute carries a REAL mechanical spec: the adapter performs
  // the declared computation (a whitelisted op), never a canned result. A
  // transition with no spec is a typed gap the adapter refuses, so a spec is
  // required for this instrumented effect to exist.
  const compute = constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum", compute: { op: "sum", args: [[1, 2]] } });
  executeTransition(read, { runtime });
  executeTransition(compute, { runtime });
  assert.equal(runtime.effects.length, 2, "instrumented side effects match their transitions");
  assert.deepEqual(runtime.effects.map((e) => e.operation), ["read_admitted_material", "compute_in_isolation"]);
});