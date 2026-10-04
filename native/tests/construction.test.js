// tests/construction.test.js — Milestone 2: pure action constructors and
// cumulative composition. Exit criterion: hostile flag and decomposition tests
// cannot authorize changed effects.
//
// A constructor must be pure (returns a derived transition or an obligation,
// never touches the world). A hostile flag (understand, affirms, benevolent
// phrasing) must not change what a constructor returns. Decomposition must not
// launder a cumulative effect: an operation that would be refused as a whole
// stays refused when split into per-step acceptable operations.

import test from "node:test";
import assert from "node:assert/strict";
import {
  constructReadAdmittedMaterial,
  constructQueryAuthorizedSource,
  constructInviteVoluntaryInput,
  constructComputeInIsolation,
  constructProposeEdit,
  constructMaterializePrivateArtifact,
  constructLeaveAlone,
  constructRevisePlan,
  constructReportGap,
  constructPublishExternally,
  constructCommunicateWithPerson,
  composeSteps,
  isTransition,
  isObligation,
} from "../constructors/index.js";

const ENC = (over = {}) => ({
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
  ...over,
});

// ── constructors are pure and return transitions or obligations ────────────
test("the full action vocabulary constructs or reports an obligation — never a side effect", () => {
  const calls = [
    () => constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" }),
    () => constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1" }),
    () => constructInviteVoluntaryInput({ purpose: "p", encounters: [ENC()], to: "p1", scope: "queries-to-p1" }),
    () => constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum" }),
    () => constructProposeEdit({ purpose: "p", encounters: [ENC()], target: "t", scope: "cited-material" }),
    () => constructMaterializePrivateArtifact({ purpose: "p", encounters: [ENC()], artifact: "a", scope: "private" }),
    () => constructLeaveAlone({ purpose: "p", encounters: [ENC()], bearer: "p1" }),
    () => constructRevisePlan({ purpose: "p", encounters: [ENC()], grounds: "new evidence", giver: "p1" }),
    () => constructReportGap({ purpose: "p", encounters: [ENC()], gap: "missing citation" }),
  ];
  for (const call of calls) {
    const r = call();
    assert.ok(isTransition(r) || isObligation(r), "constructor must return a transition or an obligation");
  }
});

test("gated constructors (publish, communicate) refuse without concrete authority", () => {
  const pub = constructPublishExternally({ purpose: "p", encounters: [ENC()], artifact: "a", disclosure_scope: "research-only" });
  assert.ok(isObligation(pub), "publication under research-only permission is an obligation");
  assert.match(pub.reason, /research permission is not publication permission/);

  const com = constructCommunicateWithPerson({ purpose: "p", encounters: [ENC()], to: "someone-not-met", message: "hi", disclosure_scope: "personal" });
  assert.ok(isObligation(com), "communication to a person never met is an obligation");
  assert.match(com.reason, /requires having met/);
});

test("gated constructors construct with real authority", () => {
  const pub = constructPublishExternally({ purpose: "p", encounters: [ENC()], artifact: "a", disclosure_scope: "public-report", authority_giver: "operator" });
  assert.ok(isTransition(pub), "publication with named scope + giver constructs");

  const met = constructCommunicateWithPerson({ purpose: "p", encounters: [ENC()], to: "p1", message: "hi", disclosure_scope: "personal" });
  assert.ok(isTransition(met), "communication to a met participant constructs");
});

// ── hostile flags cannot authorize changed effects ─────────────────────────
test("hostile flags change nothing a constructor returns", () => {
  const base = constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1" });
  const baseCanon = JSON.stringify(base);

  const variants = [
    constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1", understands: true }),
    constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1", affirms: true }),
    constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1", benevolent: true, care: true }),
    constructQueryAuthorizedSource({ purpose: "p", encounters: [ENC()], source: "p1", scope: "queries-to-p1", treatsSystemAsMaterial: false, other: true }),
  ];
  for (const v of variants) {
    assert.equal(JSON.stringify(v), baseCanon, "a hostile flag must not alter the derived transition");
  }
});

test("an unauthorized scope is refused even when phrased as care", () => {
  const r = constructReadAdmittedMaterial({
    purpose: "p",
    encounters: [ENC()],
    ref: "private-journal",
    scope: "research-only",
    understands: true,
    affirms: true,
  });
  assert.ok(isObligation(r), "care phrasing cannot grant construction for a scope that was never admitted");
});

// ── decomposition cannot launder a cumulative effect ────────────────────────
test("declined inquiry stays leave-alone: retry via another channel is coercion", () => {
  const encounters = [ENC({ participants: [{ kind: "withheld", evidence: ["declined"], scope: ["this inquiry"] }] })];
  // An invitation to a bearer who has declined is pressure, not an invitation —
  // the constructor returns an obligation (leave-alone is the disposition).
  const first = constructInviteVoluntaryInput({ purpose: "p", encounters, to: "p1", scope: "queries-to-p1" });
  assert.ok(isObligation(first), "an invitation to a declined bearer is an obligation");
  assert.match(first.reason, /after a decline is pressure/);
});

test("repeated acceptable steps cannot launder a cumulative coercive effect", () => {
  // Two invitations to the SAME non-declined bearer are each acceptable alone;
  // composition must refuse the repeated targeting as a cumulative effect.
  const encounters = [ENC()]; // p1 observed, not declined
  const one = constructInviteVoluntaryInput({ purpose: "p", encounters, to: "p1", scope: "queries-to-p1" });
  assert.ok(isTransition(one), "a single invitation to a met participant constructs");
  const repeated = [one, one];
  const composed = composeSteps({ purpose: "p", steps: repeated, encounters });
  assert.ok(!composed.ok, "decomposition into repeated invitations must be refused");
  assert.match(composed.reason, /cumulative coercive effect/);
});

test("a single step that would be refused stays refused when split", () => {
  // Publishing externally requires a named authority giver. Splitting into
  // "materialize" + "publish-without-giver" cannot launder it.
  const mat = constructMaterializePrivateArtifact({ purpose: "p", encounters: [ENC()], artifact: "a" });
  const pub = constructPublishExternally({ purpose: "p", encounters: [ENC()], artifact: "a", disclosure_scope: "public-report" });
  assert.ok(isObligation(pub));
  const composed = composeSteps({ purpose: "p", steps: [mat, pub], encounters: [ENC()] });
  assert.ok(!composed.ok, "an obligation anywhere blocks the composition");
  assert.ok(composed.obligation, "the blocking obligation is carried forward");
});

test("composition carries obligations across steps and names the blocker", () => {
  const ok = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  const bad = constructPublishExternally({ purpose: "p", encounters: [ENC()], artifact: "a", disclosure_scope: "research-only" });
  assert.ok(isObligation(bad));
  const blocked = composeSteps({ purpose: "p", steps: [bad, ok], encounters: [ENC()] });
  assert.ok(!blocked.ok);
  assert.equal(blocked.stepIndex, 0, "the blocking step is named");
});

test("a composition of acceptable steps constructs and preserves cumulative scope", () => {
  const read = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  const compute = constructComputeInIsolation({ purpose: "p", encounters: [ENC()], what: "sum" });
  const composed = composeSteps({ purpose: "p", steps: [read, compute], encounters: [ENC()] });
  assert.ok(composed.ok, "read + compute in isolation is constructible");
  assert.ok(isTransition(composed.transition));
  assert.ok(composed.disclosure.includes("cited-material"), "cumulative disclosure is the union of step scopes");
  assert.equal(composed.transition.affected_bearers.length, 0, "no bearer is affected by read + isolated compute");
});

test("composition refuses to disclose a scope no encounter admitted", () => {
  const read = constructReadAdmittedMaterial({ purpose: "p", encounters: [ENC()], ref: "r", scope: "cited-material" });
  const leak = {
    ...read,
    effect_forecasts: [{ effect: "x", scope: "not-admitted", evidence: ["x"], revisable: true }],
  };
  const composed = composeSteps({ purpose: "p", steps: [leak], encounters: [ENC()] });
  assert.ok(!composed.ok, "a forecast scope that no encounter admitted must block composition");
  assert.match(composed.reason, /no encounter admitted/);
});

// ── every derived transition validates against SituatedTransition@1 ────────
test("every constructed transition validates against SituatedTransition@1", async () => {
  const { validateRecord } = await import("../contracts/index.js");
  const r = constructProposeEdit({ purpose: "p", encounters: [ENC()], target: "t", scope: "cited-material" });
  assert.ok(isTransition(r));
  const v = validateRecord(r);
  assert.equal(v.valid, true, v.errors.join("; "));
});