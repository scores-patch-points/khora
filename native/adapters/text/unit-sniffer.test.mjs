import test from "node:test";
import assert from "node:assert/strict";
import { classMeans, poolCanon, claimBounds, sniffText, sniffTexts, unitCanonToPrior, unitCanonFromPrior, loadUnitCanon, unitPriorName, UNIT_SNIFFER_SCHEMA } from "./unit-sniffer.mjs";

const v = (...xs) => Float32Array.from(xs);

test("poolCanon gives each language equal weight and skips the ones excluded", () => {
  const big = classMeans(Array.from({ length: 50 }, () => ({ cls: "a", vec: v(1, 0) }))), small = classMeans([{ cls: "a", vec: v(0, 1) }]);
  const both = poolCanon([{ id: "big", means: big }, { id: "small", means: small }]);
  assert.ok(Math.abs(both.classes.a.centroid[0] - both.classes.a.centroid[1]) < 1e-6, "one word in a small language weighs as much as fifty in a big one");
  const noSmall = poolCanon([{ id: "big", means: big }, { id: "small", means: small }], new Set(["small"]));
  assert.ok(noSmall.classes.a.centroid[0] > 0.99 && noSmall.classes.a.groups === 1, "an excluded language contributes nothing");
});

test("claimBounds is the 95th percentile of cosines against other classes", () => {
  const canon = poolCanon([{ id: "x", means: classMeans([{ cls: "a", vec: v(1, 0) }, { cls: "b", vec: v(0, 1) }]) }]);
  const entries = [{ cls: "b", vec: v(0, 1) }, { cls: "b", vec: v(0.3, 1) }, { cls: "a", vec: v(1, 0) }];
  const bounds = claimBounds(canon, entries);
  assert.ok(bounds.a < 0.5 && bounds.b < 0.5, "a class's bound is set by words that are not in it");
});

test("a prior round-trips, and an unattributed canon is refused", () => {
  const canon = poolCanon([{ id: "x", means: classMeans([{ cls: "a", vec: v(1, 0, 0) }, { cls: "b", vec: v(0, 1, 0) }]) }]);
  assert.throws(() => unitCanonToPrior(canon, {}, { model: "m" }), /unattributed centroid is refused/);
  const back = unitCanonFromPrior(JSON.parse(JSON.stringify(unitCanonToPrior(canon, { a: 0.4, b: 0.5 }, { model: "m", head: "op", giver: "g" }))));
  assert.equal(back.canon.schema, UNIT_SNIFFER_SCHEMA); assert.deepEqual(Object.keys(back.canon.classes).sort(), ["a", "b"]); assert.equal(back.bounds.a, 0.4);
  assert.equal(unitCanonFromPrior({ schema: "other" }), null);
});

test("sniffText embeds the text, ranks the classes, and says so when the vector is empty", async () => {
  const canon = poolCanon([{ id: "x", means: classMeans([{ cls: "a", vec: v(1, 0) }, { cls: "b", vec: v(0, 1) }]) }]);
  const r = await sniffText(async (ts) => ts.map(() => v(0.9, 0.1)), "anything", canon, { a: 0.5, b: 0.5 });
  assert.equal(r.best, "a"); assert.ok(r.margin > 0.5); assert.deepEqual(r.claimed, ["a"]);
  const gap = await sniffText(async (ts) => ts.map(() => v(0, 0)), "x", canon, {}); assert.equal(gap.gap, "empty_vector"); assert.equal(gap.best, null);
  const many = await sniffTexts(async (ts) => ts.map((t) => (t === "p" ? v(1, 0) : v(0, 1))), ["p", "q"], canon, {}); assert.deepEqual(many.map((m) => m.best), ["a", "b"]);
});

test("a model with no prior is a typed gap, never another model's centroids", () => {
  assert.equal(loadUnitCanon("no-such-embedding-model:1b", "op"), null);
  assert.equal(unitPriorName("Qwen3-Embedding:4b", "op"), "unit-cells-qwen3-embedding_4b-op.json");
});

test("the wired prior, where this checkout's priors home holds it, is a labelled proposer", (t) => {
  const op = loadUnitCanon("qwen3-embedding:4b", "op");
  if (!op) return t.skip("no unit-cells prior in this priors home: a typed gap, which is correct");
  assert.equal(Object.keys(op.canon.classes).length, 9); assert.equal(Object.values(op.canon.classes)[0].centroid.length, 2560);
  assert.equal(op.meta.useAs, "proposer"); assert.ok(op.meta.caveats.length > 0, "the caveats travel with the prior");
  assert.deepEqual(Object.keys(op.meta.classNames).sort(), ["ALT", "CON", "DES", "INS", "NUL", "REC", "SEG", "SUP", "SYN"]);
  assert.equal(op.meta.classNames.ALT, "DEF"); assert.equal(op.meta.classNames.DES, "SIG"); assert.equal(op.meta.classNames.SUP, "EVA");
  const cell = loadUnitCanon("qwen3-embedding:4b", "cell"); assert.equal(Object.keys(cell.canon.classes).length, 27); assert.ok(Object.values(cell.meta.classNames).every((n) => n.includes("·")));
});
