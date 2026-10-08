// identity-for-whom.test.js — THE JOIN, FALSIFIED. identity exists only for-whom
// (S113): the same record, read through two frames, must be able to give two
// verdicts with no new material. Before 2026-10-07 the identity decision was
// frame-free (deriveIdentityRevision took no for-whom), so the four seats of
// identity-at-a-point.md did not compose.
import test from "node:test";
import assert from "node:assert/strict";
import { createForWhom } from "../kernel/for-whom.js";
import { deriveIdentityRevision, deriveIdentityRevisionForWhom } from "../kernel/identity.js";

const edge = (i, relation, a, b) => ({
  schema: "EOHyperedge@1", id: `h${i}`, witness: `d#${i}`, scope: { byteOffset: i * 10 },
  relation, participants: [{ surface: a, ref: `r:${i}a` }, { surface: b, ref: `r:${i}b` }],
});
const FOLD = { graphEntries: [edge(0, "wrote", "Alice", "A."), edge(1, "wrote", "Alice", "letter"), edge(2, "met", "Alice", "A.")] };
const SUPPORTS = [{ left: "Alice", right: "A.", witness: "d#1" }];

test("the same record, two for-whoms, no new material: admit vs refuse (for-whom-relative identity)", () => {
  const mine = createForWhom({ id: "q-alice", question: "who is Alice" });
  const other = createForWhom({ id: "q-paint", question: "who painted the portrait" });

  const a = deriveIdentityRevisionForWhom(mine, { fold: FOLD, supports: SUPPORTS, gateOpts: { minRelevance: 0.5 } });
  const b = deriveIdentityRevisionForWhom(other, { fold: FOLD, supports: SUPPORTS, gateOpts: { minRelevance: 0.5 } });

  assert.equal(a.admitted, true, "the frame the record is about admits");
  assert.equal(b.admitted, false, "a frame the record is not about refuses");
  assert.equal(b.delta, null);
  assert.match(b.reason, /no admitted difference/);
  assert.notEqual(a.admitted, b.admitted, "identity is for-whom-relative on identical material");
});

test("an admitted revision carries the frame it was read under (S42 — no view from nowhere)", () => {
  const fw = createForWhom({ id: "q-alice", question: "who is Alice" });
  const r = deriveIdentityRevisionForWhom(fw, { fold: FOLD, supports: SUPPORTS });
  assert.equal(r.schema, "EOIdentityRevisionForWhom@1");
  assert.equal(r.forWhom, "q-alice");
  assert.equal(r.delta.forWhom, "q-alice");
  assert.equal(r.delta.frame.question, "who is Alice");
  assert.ok(r.delta.operations.length > 0, "a real revision landed");
});

test("the gate is the outer bound: a for-whom with no for-whom argument is refused, not defaulted", () => {
  assert.throws(() => deriveIdentityRevisionForWhom(null, { fold: FOLD, supports: SUPPORTS }), /requires a for-whom/);
});

test("frame-free deriveIdentityRevision is byte-unchanged (forWhom absent when unsupplied)", () => {
  const d = deriveIdentityRevision({ fold: FOLD, supports: SUPPORTS, witness: "d#1" });
  assert.equal("forWhom" in d, false);
  assert.equal("frame" in d, false);
});
