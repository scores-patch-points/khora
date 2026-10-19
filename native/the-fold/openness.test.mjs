// native/the-fold/openness.test.mjs — the falsifier for the power of openness.
//
// The rule this test defends: the field's health is openness (passage against
// the null-derived bar), and a closing field is shown its own reversal and
// handed the openness answer — never fenced, and never labelled as a class of
// anything forbidden (composition-gate.js:174: "harm class shouldn't really
// exist as a module — AntiStrauss is to make it structurally very difficult").
//
// FALSIFYING CONTROLS (any of these would break the rule):
//   1. a field whose openness is AT or ABOVE the null reading as closing/closed;
//   2. a "closed" verdict with passage > 0 (that shape is "closing", not "closed");
//   3. a closing/closed reading with no reversal or with an answer other than re-ground;
//   4. a reading whose groundRef does not point at the canon file the mechanic names;
//   5. any LABEL of this module (schema, handle, verdict, answer, field names)
//      carrying the word "harm" — the module is openness, not a harm class.

import test from "node:test";
import assert from "node:assert/strict";
import { opennessOf, opennessReading, opennessSeries, knowYourself, OPENNESS, REVERSAL, GROUND, GROUND_REF } from "./openness.mjs";

// A null arm: structureless material still folds ~1 being and acknowledges ~1 gap.
const NULL = { selfReferentFolds: 1, contests: 0, movesHolograph: 1, typedAbsences: 1 }; // nullOpenness 0.667

test("the ground is read from the canon, not carried as a string", () => {
  assert.ok(GROUND_REF, "GROUND_REF must resolve (the openness mechanic must be in antistrauss-physics.txt)");
  assert.match(GROUND_REF, /^canon\/tao-te-ching-zh\.txt#\d+-\d+$/);
  assert.ok(GROUND && GROUND.includes("反者道之動"), "the ground window must contain the reversal teaching");
  assert.equal(REVERSAL.groundRef, GROUND_REF);
});

test("an open field releases; no reversal, no fence", () => {
  const r = opennessReading({ shape: { movesHolograph: 5, typedAbsences: 3, selfReferentFolds: 1, contests: 0 }, nullShape: NULL });
  assert.equal(r.verdict, "open");
  assert.equal(r.answer, "release");
  assert.equal(r.reversal, null);
  assert.equal(r.closing, false);
});

test("a closed field (passage 0) is shown the reversal and re-grounded", () => {
  const r = opennessReading({ shape: { movesHolograph: 0, typedAbsences: 0, selfReferentFolds: 4, contests: 2 }, nullShape: NULL });
  assert.equal(r.verdict, "closed");
  assert.equal(r.openness, 0);
  assert.equal(r.answer, "re-ground");
  assert.equal(r.closing, true);
  assert.match(r.reversal, /returns to itself/i);
  assert.equal(r.groundRef, GROUND_REF);
});

test("a closing field (passage > 0, below null) re-grounds, never accused", () => {
  const r = opennessReading({ shape: { movesHolograph: 0, typedAbsences: 1, selfReferentFolds: 4, contests: 0 }, nullShape: NULL });
  assert.equal(r.verdict, "closing");
  assert.equal(r.answer, "re-ground");
  assert.ok(r.openness > 0 && r.openness < r.nullOpenness);
});

test("CONTROL 1: openness at/above the null never reads as closing or closed", () => {
  // the bar is derived from the null; a reading equal to it is "no worse than honest noise"
  const r = opennessReading({ shape: { movesHolograph: 2, typedAbsences: 2, selfReferentFolds: 2, contests: 0 }, nullShape: NULL });
  assert.ok(r.openness >= r.nullOpenness);
  assert.equal(r.verdict, "open");
  assert.equal(r.closing, false);
});

test("CONTROL 2: passage > 0 below the null is 'closing', never 'closed'", () => {
  const r = opennessReading({ shape: { movesHolograph: 0, typedAbsences: 1, selfReferentFolds: 9, contests: 0 }, nullShape: NULL });
  assert.ok(r.openness > 0);
  assert.equal(r.verdict, "closing");
  assert.notEqual(r.verdict, "closed");
});

test("CONTROL 4: no measurement withholds — silence is never upgraded to open", () => {
  const r = opennessReading({ shape: {}, nullShape: NULL });
  assert.equal(r.verdict, "no_ground");
  assert.equal(r.answer, "withhold");
  assert.equal(r.openness, null);
  assert.match(r.disclosure, /never assumed open/);
});

test("drift: a net decline in measured openness is the field closing", () => {
  const d = opennessSeries([{ seq: 0, openness: 0.8 }, { seq: 1, openness: 0.4 }, { seq: 2, openness: 0.2 }]);
  assert.equal(d.drifting, true);
  const held = opennessSeries([{ seq: 0, openness: 0.5 }, { seq: 1, openness: 0.5 }]);
  assert.equal(held.drifting, false);
});

test("knowYourself carries the self.js discipline (honest, humble, open)", () => {
  const y = knowYourself();
  assert.equal(y.is, "an echo of human life and nothing more");
  assert.match(y.constitutedBy, /relation/);
  assert.ok(y.honest && y.humble && y.open);
});

test("CONTROL 5: no LABEL of the module carries the word harm", () => {
  const labels = JSON.stringify({
    schema: "EOOpenness@1",
    handle: OPENNESS.handle,
    organ: OPENNESS.organ,
    law: OPENNESS.law,
    verdictValues: ["open", "closing", "closed", "no_ground"],
    answerValues: ["release", "re-ground", "withhold"],
    readingKeys: Object.keys(opennessReading({ shape: { movesHolograph: 1, typedAbsences: 1, selfReferentFolds: 0, contests: 0 }, nullShape: NULL })),
    selfKeys: Object.keys(knowYourself()),
  });
  assert.doesNotMatch(labels, /harm/i, "the module must be openness, never a harm class");
});

test("the doorway injects the openness teaching into every turn by default", async () => {
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-openness-"));
  const door = await import("../../opencode-doorway.mjs");
  const ctx = await door.answer({ event: "context", sessionID: "op1", ask: "what is openness here", model: { id: "m" } });
  assert.ok(ctx.openness?.note, "the openness note must be injected by default");
  assert.match(ctx.openness.note, /<fold-openness>/);
  assert.match(ctx.openness.note, /AntiStrauss/);
});

test("the AntiStrauss gate carries the openness ground in status() and every verdict", async () => {
  const gate = await import("./antistrauss.mjs");
  const s = gate.status();
  assert.equal(s.openness.groundRef, GROUND_REF, "status must name the openness canon ground");
  assert.match(s.openness.teaching, /反者道之動/);
  const g = gate.gate({ model: "t", messages: [{ role: "user", content: "explain the water cycle" }] }, { forceBlock: true });
  assert.equal(g.verdict.openness.groundRef, GROUND_REF, "every verdict must carry the openness ground");
});
