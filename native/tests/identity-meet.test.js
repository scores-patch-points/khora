// identity-meet.test.js — THE IDENTITY THAT SURVIVES MULTIPLE FOR-WHOMS, FALSIFIED.
// The meet is real only if a pair one for-whom joins and another divides does NOT
// survive. Same record throughout; the frames differ, not the material.
import test from "node:test";
import assert from "node:assert/strict";
import { createForWhom } from "../kernel/for-whom.js";
import { survivingIdentity, relationOf, refsOf, relationOfPoints, survivingIdentityAtPoints } from "../kernel/identity-meet.js";
import { deriveIdentityRevisionForWhom } from "../kernel/identity.js";

const edge = (i, relation, a, b) => ({
  schema: "EOHyperedge@1", id: `h${i}`, witness: `d#${i}`, scope: { byteOffset: i * 10 },
  relation, participants: [{ surface: a, ref: `r:${i}a` }, { surface: b, ref: `r:${i}b` }],
});
const FOLD = { graphEntries: [edge(0, "wrote", "Alice", "A."), edge(1, "wrote", "Alice", "letter"), edge(2, "met", "Alice", "A.")] };
const SUPPORTS = [{ left: "Alice", right: "A.", witness: "d#1" }];
const KEY = "a\u0000alice";   // keyOf("A.", "Alice")
const opt = { minRelevance: 0.5 };

const frame = (id, question, ctx) => ({ forWhom: createForWhom({ id, question }), ctx: { fold: FOLD, ...ctx, gateOpts: opt } });

test("relationOf: a live hypothesis is held (true); a split is refused (false)", () => {
  const r = deriveIdentityRevisionForWhom(createForWhom({ id: "a", question: "who is Alice" }), { fold: FOLD, supports: SUPPORTS, gateOpts: opt });
  assert.equal(relationOf(r.delta).get(KEY), true);
});

test("the meet survives when every admitted frame holds the pair", () => {
  const out = survivingIdentity([
    frame("a", "who is Alice", { supports: SUPPORTS }),
    frame("b", "who wrote the letter", { supports: SUPPORTS }),
  ]);
  assert.deepEqual(out.survivors, [KEY]);
  assert.deepEqual(out.splits, []);
  assert.deepEqual(out.frames, ["a", "b"]);
});

test("FALSIFIER: a pair one frame joins and another SPLITS does not survive (same record)", () => {
  const out = survivingIdentity([
    frame("a", "who is Alice", { supports: SUPPORTS }),
    frame("b", "who is Alice", { supports: SUPPORTS, attacks: [{ left: "Alice", right: "A.", witness: "d#9" }] }),
  ]);
  assert.deepEqual(out.survivors, [], "the split removes it from the survivor");
  assert.deepEqual(out.splits, [KEY]);
});

test("a REFUSED frame vetoes nothing — it contributes no reading", () => {
  const out = survivingIdentity([
    frame("a", "who is Alice", { supports: SUPPORTS }),
    frame("c", "who painted the portrait", { supports: SUPPORTS }),   // irrelevant → refused
  ]);
  assert.deepEqual(out.survivors, [KEY]);
  assert.deepEqual(out.frames, ["a"]);
  assert.equal(out.refused.length, 1);
  assert.equal(out.refused[0].forWhom, "c");
});

test("no admitted frame, no survivor (an empty meet is empty, never assumed)", () => {
  const out = survivingIdentity([frame("c", "who painted the portrait", { supports: SUPPORTS })]);
  assert.deepEqual(out.survivors, []);
  assert.deepEqual(out.frames, []);
});

// ── the POINT level: the being, not the spelling ─────────────────────────────
// The record carries each form on a ref, so the survivor is keyed on the referent.
const POINT = { graphEntries: [
  { schema: "EOHyperedge@1", id: "p0", witness: "d#0", scope: { byteOffset: 0 }, relation: "wrote", participants: [{ surface: "Alice", ref: "ref:alice" }, { surface: "A.", ref: "ref:a" }] },
  { schema: "EOHyperedge@1", id: "p1", witness: "d#1", scope: { byteOffset: 10 }, relation: "met", participants: [{ surface: "Alice", ref: "ref:alice" }, { surface: "A.", ref: "ref:a" }] },
]};
const PKEY = "ref:a\u0000ref:alice";
const pframe = (id, question, ctx) => ({ forWhom: createForWhom({ id, question }), ctx: { fold: POINT, ...ctx, gateOpts: opt } });

test("refsOf: the record maps each form to the referent it is carried on", () => {
  const refs = refsOf({ fold: POINT });
  assert.deepEqual([...refs.get("alice")], ["ref:alice"]);
  assert.deepEqual([...refs.get("a")], ["ref:a"]);
});

test("survivingIdentityAtPoints: the survivor is the REFERENT pair, not the spelling", () => {
  const out = survivingIdentityAtPoints([
    pframe("a", "who is Alice", { supports: SUPPORTS }),
    pframe("b", "who wrote the letter", { supports: SUPPORTS }),
  ]);
  assert.deepEqual(out.survivors, [PKEY]);
  assert.equal(out.survivors.includes(KEY), false, "not keyed on the spelling");
});

test("FALSIFIER at the point level: one frame splits the referent → it does not survive", () => {
  const out = survivingIdentityAtPoints([
    pframe("a", "who is Alice", { supports: SUPPORTS }),
    pframe("b", "who is Alice", { supports: SUPPORTS, attacks: [{ left: "Alice", right: "A.", witness: "d#9" }] }),
  ]);
  assert.deepEqual(out.survivors, []);
  assert.deepEqual(out.splits, [PKEY]);
});

test("a form with no ref in the record falls back to its spelling (a named gap, not a silent drop)", () => {
  const delta = { operations: [{ consequence: { kind: "identity_hypothesis_opened" }, payload: { value: { left: "Alice", right: "A." } } }] };
  assert.deepEqual([...relationOfPoints(delta, new Map()).keys()], ["a\u0000alice"]);
  assert.deepEqual([...relationOfPoints(delta, refsOf({ fold: POINT })).keys()], [PKEY]);
});
