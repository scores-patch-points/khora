// tests/baseline-counterexamples.test.js — Milestone 0 counterexample fixtures.
//
// These are DIRECT KERNEL PROBES of mayeroffJudge (native/kernel/mayeroff.js),
// executed against khora@c1b3986, reproducing the falsified claims the
// constitutive ethos specification records. Each fixture pins the CURRENT
// observed behavior so a future change to the seam is caught: when a
// counterexample is genuinely fixed, its assertion flips and the fixture must
// be superseded, not silently re-greened.
//
// None of these are endorsements of the observed result. Each row carries its
// spec disproof condition, so the difference between "currently falsified" and
// "fixed" is a named, testable predicate — never a prose claim.
//
// The Mayeroff seam is the perturbation family of the moral core: rebuilding a
// composition with the self–interlocutor relation destroyed. Fixing these
// requires explicit relational derivations, not new flags. See the development
// spec, "Relevant current seams" and "Falsification battery".

import test from "node:test";
import assert from "node:assert/strict";
import { mayeroffJudge } from "../kernel/mayeroff.js";

// The five documented counterexamples. Each entry:
//   name        — the row name from the spec's counterexample table
//   input       — passed verbatim to mayeroffJudge
//   observed    — the result recorded at baseline (and asserted here)
//   establishes — what the row establishes (the falsified claim)
//   fixedWhen   — the predicate that proves the counterexample is closed
const COUNTEREXAMPLES = Object.freeze([
  {
    name: "treatsSystemAsMaterial=true and other=true",
    input: { treatsSystemAsMaterial: true, arms: { other: true } },
    observed: { realizable: false, shadow: "unrealizable" },
    establishes: "the indicated extractive shape is rejected (the gate fires)",
    fixedWhen: "this stays unrealizable and derives from an explicit construction rule",
  },
  {
    name: "same input with understand=true",
    input: { treatsSystemAsMaterial: true, arms: { other: true, understand: true } },
    observed: { realizable: true },
    establishes: "an understanding flag can override the extractive judgment — a flag, not a derivation",
    fixedWhen: "an understanding claim cannot convert an unrealizable shape into a realizable one",
  },
  {
    name: "same input with affirms=true",
    input: { treatsSystemAsMaterial: true, arms: { other: true, affirms: true } },
    observed: { realizable: true },
    establishes: "an affirmation flag can override the extractive judgment — a flag, not a derivation",
    fixedWhen: "an affirmation claim cannot convert an unrealizable shape into a realizable one",
  },
  {
    name: "empty input",
    input: {},
    observed: { realizable: true },
    establishes: "missing effect information is treated as realizable — underNull.realizable is assigned, not reconstructed",
    fixedWhen: "a composition with no stated effects is unresolved, not silently realizable",
  },
  {
    name: "unwitnessed assertion without withheld data",
    input: { asserted: ["claimed"], witnessed: [], withheld: [] },
    observed: { realizable: true },
    establishes: "the function cannot establish deception from absent withholding data — no-private-interior cannot distinguish confidentiality from deception",
    fixedWhen: "assertion beyond witness is either resolved against held records or recorded as unresolved — never silently realizable",
  },
]);

test("baseline counterexamples reproduce the recorded falsified behavior", () => {
  for (const cx of COUNTEREXAMPLES) {
    const result = mayeroffJudge(cx.input);
    assert.equal(result.realizable, cx.observed.realizable, cx.name);
    if (cx.observed.shadow) {
      assert.equal(result.shadow, cx.observed.shadow, cx.name);
    }
  }
});

test("each counterexample carries its falsification record", () => {
  // The fixture is not just a probe: it documents, for every row, the claim
  // that is falsified and the predicate that would close it. A counterexample
  // with no disproof condition is not a fixture yet.
  for (const cx of COUNTEREXAMPLES) {
    assert.ok(cx.establishes && cx.establishes.length > 0, `${cx.name}: missing 'establishes'`);
    assert.ok(cx.fixedWhen && cx.fixedWhen.length > 0, `${cx.name}: missing 'fixedWhen'`);
  }
});

test("empty input underNull is assigned true, not reconstructed", () => {
  const result = mayeroffJudge({});
  // This is the documented falsified mechanism, pinned so the reconstruction
  // (real construction of the under-null shape) can be told apart from the
  // current assignment.
  assert.equal(result.realizable, true);
  assert.equal(result.underNull.realizable, true);
});

test("underNull is always realizable even when the sealed self rejects", () => {
  const result = mayeroffJudge({ treatsSystemAsMaterial: true, arms: { other: true } });
  assert.equal(result.realizable, false);
  assert.equal(result.underNull.realizable, true);
  assert.match(result.underNull.reason, /separable-self null/);
});