// opencode-shape.test.mjs — the falsifying controls for THE SHAPE CHECK
// (opencode-shape.mjs). A hunt act declares its cell; a wrong-shaped hunt is a
// typed gap, never a silent miss.
import test from "node:test";
import assert from "node:assert/strict";
import { shapeOf, checkShape, surfActOf } from "./opencode-shape.mjs";

test("FALSIFIER: each hunt tool declares its algebra cell (the domicile)", () => {
  assert.equal(shapeOf("read").cell, "SEG·Ground", "read cuts an addressed reach-unit out");
  assert.equal(shapeOf("grep").cell, "SEG·Figure", "grep lands a Link from a word to a place");
  assert.equal(shapeOf("fetch").cell, "INS·Ground", "a page comes into being as material");
  assert.equal(shapeOf("glob").cell, "SIG·Figure");
  assert.equal(shapeOf("list").cell, "SIG·Ground");
});

test("FALSIFIER: a hunt act of the wrong shape against the void is a typed gap", () => {
  // The void needs a Ground cut; a grep (SEG·Figure) is the wrong shape.
  const wrong = checkShape({ tool: "grep", require: "SEG·Ground" });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.gap.type, "wrong_shape");
  assert.match(wrong.gap.detail, /grep.*SEG·Figure.*SEG·Ground/);
  // The right shape passes.
  assert.equal(checkShape({ tool: "read", require: "SEG·Ground" }).ok, true);
  // An operator-level requirement accepts any grain of that operator.
  assert.equal(checkShape({ tool: "grep", require: "SEG" }).ok, true);
});

test("FALSIFIER: a producing act is never reported as a surf act", () => {
  assert.equal(surfActOf("write"), null, "write composes, it does not reach");
  assert.equal(surfActOf("edit"), null);
  assert.equal(surfActOf("bash"), null);
  const r = checkShape({ tool: "write", require: "SEG" });
  assert.equal(r.ok, true, "a producing act is not a shape violation — it is simply not surf");
  assert.equal(r.act, null);
  assert.equal(r.cell, null);
  assert.match(r.note, /not a surf act/);
});

test("FALSIFIER: an unknown hunt act answers a typed gap, never a guessed home", () => {
  assert.equal(shapeOf("frobnicate"), null);
  assert.equal(surfActOf("frobnicate"), null);
});
