// referent-for-whom.test.js — EVERY REFERENT HAS A FOR-WHOM, FALSIFIED.
// S113: identity exists only for-whom; S42: a claim without a frame is a view from
// nowhere. So a referent is admitted only FOR a frame — a frameless referent is a
// TYPED GAP (never a bare admit), and an admitted referent carries the frame it was
// read under. Two for-whoms over the same material can therefore differ: the frame
// the reading is about admits, a frame it is not about refuses. (2026-10-15)
import test from "node:test";
import assert from "node:assert/strict";
import { createForWhom, referentFrame, admitReferent } from "../kernel/for-whom.js";

const ref = () => ({ schema: "EOReferent@1", id: "ref:auto:alice", surfaces: ["Alice"], standing: "established_by_evidence", mentions: 3 });
const edge = (i, a) => ({ schema: "EOHyperedge@1", id: `h${i}`, encounterRef: `d#${i}`, relation: "wrote", participants: [{ surface: a }, { surface: "A." }] });

test("a frameless referent is a typed gap, never a bare admit (S113/S42)", () => {
  const r = admitReferent(ref(), null);
  assert.equal(r.admitted, false);
  assert.equal(r.referent, null);
  assert.equal(r.gap.schema, "EOReferentGap@1");
  assert.equal(r.gap.reason, "no_for_whom");
  assert.match(r.gap.detail, /for-whom/);
});

test("an admitted referent carries the frame it was read under (no view from nowhere)", () => {
  const fw = createForWhom({ id: "q-alice", question: "who is Alice", giver: "the reader", ground: "corpus" });
  const r = admitReferent(ref(), fw);
  assert.equal(r.admitted, true);
  assert.equal(r.standing, "referent");
  assert.equal(r.referent.forWhom, "q-alice");
  assert.equal(r.referent.frame.question, "who is Alice");
  assert.equal(r.referent.frame.giver, "the reader");
  assert.equal(r.referent.frame.ground, "corpus");
  assert.equal(r.referent.surfaces[0], "Alice", "the referent's own content is untouched");
});

test("the same material, two for-whoms: the frame the reading is about admits, the other refuses", () => {
  const material = [edge(0, "Alice"), edge(1, "Alice"), edge(2, "Bob")];
  const mine = createForWhom({ id: "q-alice", question: "who is Alice" });
  const other = createForWhom({ id: "q-paint", question: "who painted the portrait" });
  const a = admitReferent(ref(), mine, { entries: material, gateOpts: { minRelevance: 0.5 } });
  const b = admitReferent(ref(), other, { entries: material, gateOpts: { minRelevance: 0.5 } });
  assert.equal(a.admitted, true, "the frame the material is about admits");
  assert.equal(b.admitted, false, "a frame the material is not about refuses");
  assert.equal(b.referent, null);
  assert.equal(b.gap.reason, "no_admitted_difference");
  assert.notEqual(a.admitted, b.admitted, "referent admission is for-whom-relative on identical material");
});

test("referentFrame is null without a for-whom (the input to the gate's refusal)", () => {
  assert.equal(referentFrame(null), null);
  assert.equal(referentFrame({}), null);
  assert.equal(referentFrame({ id: "x", giver: "g", question: "q", ground: "gr" }).forWhom, "x");
});

test("admitReferent requires a named referent", () => {
  assert.throws(() => admitReferent(null, null), /requires a referent/);
});
