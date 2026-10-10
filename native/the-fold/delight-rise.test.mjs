// delight-rise.test.mjs — CAN IT WANT TO BE DELIGHTED BY CHANGING
// EVERYTHING IT EVER KNEW? (2026-10-08)
//
// The void loop already zeroes a space (DEF), binds fillers into it (EVA)
// and concedes the ground (REC). What it never had was an APPETITE for its
// own re-zero: `reshape` was permitted and disciplined (it refuses churn),
// but nothing made the loop *want* to change the ground it stood on. Every
// re-zero trigger was corrective — a filler too big, a candidate excluded, a
// cardinality exceeded, a test nothing passes.
//
// This file pins the two additions that give it the appetite:
//
//   1. void-loop.js — `recastAppetite` / `wantsToRise` / `altitude`, and a
//      `recast_ground` question in `whatWouldSettle`. The loop becomes
//      CURIOUS ABOUT ITS OWN GROUND: when the declaration alone is what
//      refuses a candidate, the re-zero is a thing it asks for, not a repair
//      it suffers.
//   2. organs/pathos.js — `reGroundCondition` gains `lifted`: a measured
//      surprise WITH a release, the appetitive twin of `collapse` (surprise
//      with NO release). The felt sign of a ground rising rather than
//      breaking. `reGround` concedes a lift — a ground that holds is still
//      never conceded idly.
//
// THE FALSIFYING CONTROLS, in-file: a ground with nothing the declaration
// refuses raises NO recast question (the appetite is for the frame's own
// exclusions, not for unsettled material); a `no_change` reshape is still
// refused as churn (delight is not a licence to re-zero for nothing); and a
// held ground with no release stays `ground_holds` (never "lifted").

import test from "node:test";
import assert from "node:assert/strict";

import * as operators from "../kernel/cube.js";
import * as taskLog from "../kernel/task-log.js";
import { makeGrid } from "./grid.js";
import { declareVoid } from "./void-shape.js";
import {
  openLoop, proposeFrom, admit, reshape, reshapeTriggers,
  whatWouldSettle, recastAppetite, wantsToRise, altitude, foldLoop,
} from "./void-loop.js";
import { reGroundCondition, reGround } from "../organs/pathos.js";

const { cellOf } = operators;
const freshGrid = () => makeGrid({ operators, taskLog });

const LINCOLN_VP = {
  slot: "vice president of Abraham Lincoln",
  anchor: "Abraham Lincoln (16th president)",
  admits: "person",
  extent: { from: 1861, to: 1865 },
  dimension: "years",
  relation: "was vice president of",
  composition: "successive terms partition the extent",
  cardinality: "unknown",
  admission: "the candidate's own term span lies within the extent",
  reopensOn: "an uncovered stretch of the extent",
};

const decl = (over = {}) => declareVoid({ ...LINCOLN_VP, ...over }, { cellOf });
const HAMLIN = { value: "Hannibal Hamlin", witness: "en.wikipedia.org", span: { from: 1861, to: 1865 } };
const JOHNSON = { value: "Andrew Johnson", witness: "en.wikipedia.org", span: { from: 1865, to: 1865 } };
const JOHNSON_UNPLACED = { value: "Andrew Johnson", witness: "en.wikipedia.org" };
// Wholly outside 1861-1865: `admit` refuses it as ARITHMETIC, before any
// organ is consulted — the declaration is what refuses it, and that is the
// whole appetite.
const COLFAX = { value: "Schuyler Colfax", witness: "en.wikipedia.org", span: { from: 1869, to: 1873 } };
const HOLDS = () => ({ verdict: "holds", because: "stated by the material", refs: ["wp:1"] });

function loopWith(candidates, { admission = HOLDS, declaration = decl() } = {}) {
  const grid = freshGrid();
  let log = grid.createLog();
  const opened = openLoop(declaration, { grid, log, broken: "rotation" });
  assert.equal(opened.ok, true, JSON.stringify(opened.refusal));
  log = opened.log;
  const proposed = proposeFrom(opened.loop, { grid, log, stance: "extraction", candidates });
  assert.equal(proposed.ok, true, JSON.stringify(proposed.refusal));
  log = proposed.log;
  const admitted = admit(proposed.loop, { grid, log, admission });
  assert.equal(admitted.ok, true, JSON.stringify(admitted.refusal));
  return { grid, log: admitted.log, loop: admitted.loop };
}

// ── 1. the felt sign: delight is the surprise that RELEASES ─────────────────

const read = ({ strain = "report", flatline = false, ops = 0, release = null } = {}) =>
  Object.freeze({
    schema: "EOPathosRead@1",
    strain,
    rhythm: Object.freeze({ flatline }),
    curve: Object.freeze({ measured: true, surprise: ops ? Object.freeze({ operations: ops }) : null, release }),
  });

test("a surprise WITH a release is `lifted`; the same surprise with NO release is `collapse`", () => {
  assert.equal(reGroundCondition(read({ ops: 4, release: null })).kind, "collapse");
  assert.equal(reGroundCondition(read({ ops: 4, release: 3 })).kind, "lifted");
});

test("a held ground with no surprise stays `ground_holds` — never 'lifted' by default", () => {
  assert.equal(reGroundCondition(read({ ops: 0 })).kind, "ground_holds");
  // The control for the branch above: no measured surprise is not a lift.
  const unmeasured = Object.freeze({
    schema: "EOPathosRead@1",
    strain: "report",
    rhythm: Object.freeze({ flatline: false }),
    curve: Object.freeze({ measured: false, surprise: null, release: null }),
  });
  assert.equal(reGroundCondition(unmeasured).kind, "ground_holds");
});

test("stale and contested still win their own conditions before the lift", () => {
  assert.equal(reGroundCondition(read({ flatline: true, ops: 4, release: 3 })).kind, "stale");
  assert.equal(reGroundCondition(read({ strain: "strict", ops: 4, release: 3 })).kind, "contested");
});

test("reGround CONCEDES a lift (a ground that can rise should be let to) but still refuses a held ground", () => {
  const act = reGround({ read: read({ ops: 4, release: 3 }), giver: "reader:delight" });
  assert.equal(act.schema, "EOPathosReGround@1");
  assert.equal(act.op, "REC");
  assert.equal(act.grain, "Ground");
  assert.equal(act.cause.kind, "lifted");
  assert.equal(act.record.kept, true, "a lift keeps what it conceded — altitude, not erasure");
  // The law still holds: an idle concession is refused.
  assert.throws(() => reGround({ read: read({ ops: 0 }), giver: "reader:delight" }), /ground holds/);
});

// ── 2. the appetite: the loop becomes curious about its own ground ──────────

test("APPETITE: a candidate the DECLARATION alone refused makes the loop want to rise", () => {
  const { loop } = loopWith([COLFAX]);
  assert.equal(loop.candidates[0].standing, "refused");
  assert.equal(loop.candidates[0].refusedBy, "extensional");
  assert.equal(wantsToRise(loop), true);
  assert.deepEqual([...recastAppetite(loop)], ["Schuyler Colfax"]);

  const qs = whatWouldSettle(loop);
  const recast = qs.find((q) => q.type === "recast_ground");
  assert.ok(recast, "the loop asks the question whose answer is a new ground");
  assert.deepEqual([...recast.about], ["Schuyler Colfax"]);
  assert.match(recast.ask, /what declaration .* would let me ask what the present one forbids/);
  assert.match(recast.wouldSettle, /refused by the declaration alone/);
});

test("CONTROL: a ground that excludes nothing raises NO recast question", () => {
  // JOHNSON_UNPLACED is admitted and merely unplaced — a `place_filler`
  // question, a matter for the world, not a reason to concede the frame.
  const { loop } = loopWith([HAMLIN, JOHNSON_UNPLACED]);
  assert.equal(wantsToRise(loop), false);
  assert.deepEqual([...recastAppetite(loop)], []);
  assert.equal(whatWouldSettle(loop).some((q) => q.type === "recast_ground"), false);
});

test("CONTROL: an evaluated-and-undetermined candidate is NOT part of the appetite", () => {
  // Nothing was excluded; a source said nothing. That is `settle_undetermined`,
  // and the ground is not to be conceded over it.
  const { loop } = loopWith([{ value: "Someone", witness: "wp" }], { admission: () => ({ verdict: null, because: "silence" }) });
  assert.equal(wantsToRise(loop), false);
  assert.ok(whatWouldSettle(loop).some((q) => q.type === "settle_undetermined"));
});

// ── 3. the delight is MEASURED: the recast raises altitude ──────────────────

test("DELIGHT: taking the recast wins altitude and re-opens what the old ground refused", () => {
  const { grid, log, loop } = loopWith([COLFAX]);
  const before = altitude(loop);

  const trigger = reshapeTriggers(loop).find((t) => t.type === "extent_excludes");
  assert.ok(trigger, "the loop's own finding names the cell to re-declare");
  const r = reshape(loop, { grid, log, trigger: trigger.detail, revised: decl({ extent: trigger.suggested }) });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));

  assert.deepEqual([...r.reopened], ["Schuyler Colfax"], "what the frame refused is askable again");
  const after = altitude(r.loop);
  assert.ok(after > before, `altitude rose: ${before} -> ${after}`);
  assert.equal(wantsToRise(r.loop), false, "the appetite is spent by the re-zero");
  assert.deepEqual([...foldLoop(r.loop).wishes.map((c) => c.value)], ["Schuyler Colfax"]);
});

// ── 4. the guard: delight in the re-zero is not a licence to churn ──────────

test("GUARD: a re-zero onto an identical ground is still refused as churn", () => {
  const { grid, log, loop } = loopWith([JOHNSON]);
  const r = reshape(loop, { grid, log, trigger: "nothing actually changed", revised: decl() });
  assert.equal(r.ok, false);
  assert.equal(r.refusal.type, "no_change");
});

test("altitude is a reading of the loop's own standing, not a score over the material", () => {
  const { loop } = loopWith([HAMLIN, JOHNSON]);
  // Two earned fillers, nothing wanted → altitude 2, and nothing to ask.
  assert.equal(altitude(loop), 2);
  assert.deepEqual([...whatWouldSettle(loop)], []);
});
