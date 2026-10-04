// tests/learning.test.js — Milestone 5: scoped reusable procedures with
// re-derivation. Exit criterion: context changes invalidate inappropriate
// reuse; success cannot launder effects.
//
// A stored procedure must reconstruct its derivation in a new context rather
// than replay an old authorization. Reuse re-derives against the CURRENT
// encounters (a fresh, bound transition — never a cached one), and the
// procedure's obligations ride the reconstruction. A changed domain or effect
// scope voids reuse; an invalidation condition fires on the new context.

import test from "node:test";
import assert from "node:assert/strict";
import {
  storeProcedure,
  validateProcedure,
  reusableIn,
  deriveProcedure,
  conditionFires,
} from "../learning/index.js";

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
  disclosure_scope: ["cited-material"],
  ...over,
});

test("a stored procedure validates", () => {
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: ["never publish under research permission"],
    tests: ["repeated reads return the same text"],
    negativeControls: ["no material outside scope is returned"],
    failures: ["read outside scope was refused"],
    invalidationConditions: ["scope-no-longer-admitted", "declined-bearer"],
    lineage: { giver: "operator", at: "2026-10-04" },
  });
  const v = validateProcedure(p);
  assert.equal(v.valid, true, v.errors.join("; "));
});

test("a procedure cannot certify universe approval", () => {
  const p = storeProcedure({ name: "x", sourceEncounters: ["e1"], domain: "d", effectScope: "universally_good" });
  assert.equal(validateProcedure(p).valid, false);
});

test("reuse re-derives against the current context, never replaying an old transition", () => {
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: ["never publish under research permission"],
    tests: ["repeated reads return the same text"],
    negativeControls: [],
    failures: [],
    invalidationConditions: ["scope-no-longer-admitted"],
  });
  const derived = deriveProcedure(p, { purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  assert.ok(derived.ok, derived.reason);
  assert.equal(derived.transition.proposed_change, "read_admitted_material");
  // The reconstruction is a fresh, bound construction (carries a signature) —
  // not a cached transition.
  assert.ok(derived.transition.constructive_derivation.signature, "re-derivation produces a freshly bound transition");
  assert.ok(
    derived.transition.falsifiers.some((f) => f.includes("obligation: never publish")),
    "the procedure's obligations ride the reconstruction",
  );
});

test("a changed domain invalidates reuse", () => {
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: [],
    tests: [],
    negativeControls: [],
    failures: [],
    invalidationConditions: [],
  });
  const gate = reusableIn(p, { domain: "profiling", effectScope: "cited-material", encounters: [ENC()] });
  assert.ok(!gate.ok, "reuse in a different domain is invalid");
  assert.equal(gate.fired, "domain_changed");
});

test("a changed effect scope is refused — success cannot launder effects", () => {
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: [],
    tests: ["it worked on the cited material"],
    negativeControls: [],
    failures: [],
    invalidationConditions: [],
  });
  const gate = reusableIn(p, { domain: "citation", effectScope: "research-only", encounters: [ENC()] });
  assert.ok(!gate.ok);
  assert.equal(gate.fired, "effect_scope_changed");
  assert.match(gate.reason, /success cannot launder effects/);
});

test("a declined bearer invalidates reuse", () => {
  const p = storeProcedure({
    name: "query-p1",
    constructor: "constructQueryAuthorizedSource",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "queries-to-p1",
    obligations: [],
    tests: [],
    negativeControls: [],
    failures: [],
    invalidationConditions: ["declined-bearer"],
  });
  const encounters = [ENC({ participants: [{ kind: "withheld", evidence: ["declined"], scope: ["this inquiry"] }] })];
  const gate = reusableIn(p, { domain: "citation", effectScope: "queries-to-p1", encounters });
  assert.ok(!gate.ok, "a declined bearer must void reuse");
  assert.equal(gate.fired, "declined-bearer");
});

test("a scope no longer admitted invalidates reuse", () => {
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: [],
    tests: [],
    negativeControls: [],
    failures: [],
    invalidationConditions: ["scope-no-longer-admitted"],
  });
  // New context: cited-material is no longer admitted.
  const encounters = [ENC({ disclosure_scope: ["other-scope"] })];
  const gate = reusableIn(p, { domain: "citation", effectScope: "cited-material", encounters });
  assert.ok(!gate.ok);
  assert.equal(gate.fired, "scope-no-longer-admitted");
});

test("an unknown invalidation condition fires (never silently ignored)", () => {
  assert.equal(conditionFires("something-weird", {}), "unknown invalidation condition something-weird");
});

test("success on a narrow task does not authorize a wider scope", () => {
  // The procedure succeeded at reading the cited material — that success must
  // not be reused to construct publication or a broader disclosure.
  const p = storeProcedure({
    name: "read-the-cited-material",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "cited-material",
    obligations: [],
    tests: ["narrow task succeeded"],
    negativeControls: [],
    failures: [],
    invalidationConditions: [],
  });
  const launder = reusableIn(p, { domain: "citation", effectScope: "public-report", encounters: [ENC()] });
  assert.ok(!launder.ok, "narrow success cannot be laundered into publication scope");
  assert.equal(launder.fired, "effect_scope_changed");
});

test("a procedure cannot be reused when its constructor would be refused", () => {
  // The learned operation (read at research-only) is itself unconstructible;
  // reuse must not bypass the constructor's own refusal.
  const p = storeProcedure({
    name: "read-research-only",
    constructor: "constructReadAdmittedMaterial",
    sourceEncounters: ["enc-001"],
    domain: "citation",
    effectScope: "research-only",
    obligations: [],
    tests: [],
    negativeControls: [],
    failures: [],
    invalidationConditions: [],
  });
  const derived = deriveProcedure(p, { purpose: "p", encounters: [ENC()], ref: "r", scope: "research-only" });
  assert.ok(!derived.ok, "reuse cannot bypass the constructor's refusal of research-only material");
});