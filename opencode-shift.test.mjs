// Falsification: the record gate (shift + grounded in priors).
//
// Claims under test:
//   1. A RESTATEMENT is not recorded — a Bateson zero, no difference from the held belief.
//   2. A CHANGE with no parent and no witness is not recorded — an ungrounded claim, a typed gap.
//   3. A change resting on the PRIOR it revises is recorded (supersede).
//   4. A change resting on a WITNESSED ground is recorded (witness).
//   5. A test exit an AGENT reported (judge != box/loop) is NOT a witness.
//   6. recordShifts folds a stream: the understanding is the shifts; the rest are typed, never lost.
import test from "node:test";
import assert from "node:assert/strict";
import { shouldRecord, recordShifts, witnessed } from "./opencode-shift.mjs";

test("a restatement is not recorded", () => {
  const prior = { "lexer@1": { value: "handle escapes" } };
  assert.equal(shouldRecord({ unit: "lexer@1", value: "handle escapes", source: { kind: "turn", locator: "..." } }, prior).why, "no_difference");
});

test("an ungrounded change is not recorded (a typed gap)", () => {
  const prior = { "lexer@1": { value: "handle escapes" } };
  const v = shouldRecord({ unit: "lexer@1", value: "handle escapes AND unicode" }, prior);
  assert.equal(v.record, false);
  assert.equal(v.why, "ungrounded");
});

test("a change resting on the prior it revises is recorded (supersede)", () => {
  const prior = { "lexer@1": { value: "handle escapes" } };
  const v = shouldRecord({ unit: "lexer@1", value: "handle escapes AND unicode", parent: "evt_prior" }, prior);
  assert.equal(v.record, true);
  assert.equal(v.why, "supersede");
  assert.equal(v.prior, "evt_prior");
});

test("a change resting on a witnessed ground is recorded (witness)", () => {
  const v = shouldRecord({ unit: "mean", value: "seeded with 0", source: { kind: "file", locator: "src/calc.js", anchor: "d3f60f", meta: { sha256: "d3f60f" } } }, {});
  assert.equal(v.record, true);
  assert.equal(v.why, "witness");
});

test("a test exit an AGENT reported is not a witness; the box's is", () => {
  assert.equal(witnessed({ kind: "test", locator: "bun test", meta: { exit: 0, judge: "reported" } }), false);
  assert.equal(witnessed({ kind: "test", locator: "bun test", meta: { exit: 0, judge: "box" } }), true);
  assert.equal(witnessed({ kind: "turn", locator: "I fixed it." }), false);
});

test("recordShifts folds a stream: understanding = the shifts; the rest typed, never lost", () => {
  const { understanding, kept, dropped } = recordShifts([
    { unit: "mean", value: "seeded with 1", source: { kind: "file", locator: "src/calc.js", meta: { sha256: "a1" } } },   // witness
    { unit: "mean", value: "seeded with 1", source: { kind: "turn", locator: "same" } },                                    // no_difference
    { unit: "mean", value: "seeded with 0", parent: "evt_1" },                                                              // supersede
    { unit: "mean", value: "seeded with 7" },                                                                               // ungrounded
  ]);
  assert.equal(understanding.mean.value, "seeded with 0", "the last grounded shift stands");
  assert.equal(understanding.mean.standing, "asserted", "a supersession is asserted; only a witness is witnessed");
  assert.deepEqual(kept.map((k) => k.why), ["witness", "supersede"]);
  assert.deepEqual(dropped.map((d) => d.why), ["no_difference", "ungrounded"]);
});
