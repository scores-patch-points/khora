// native/tests/surprise-gate.test.js — the canonical cycle's surprise gate
// (SEG+EVA) is present and real: the kernel's own controls hold through the
// caller, the gate refuses what is too short, and the read carries it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenEvents, surpriseCut, SURPRISE_DEFAULTS } from "../the-fold/surprise-gate.mjs";
import { readToWeft } from "../the-fold/read-process.mjs";

const FIGS = [["a", "b", "c", "d"], ["e", "f", "g", "h"], ["i", "j", "k", "l"]];
const stream = (seq) => seq.flatMap((i) => FIGS[i]);

test("tokenEvents is the material's own words, in order", () => {
  assert.deepEqual(tokenEvents("The cat sat on the mat."), ["The", "cat", "sat", "on", "the", "mat"]);
  assert.deepEqual(tokenEvents("don't stop"), ["don't", "stop"]);
  assert.deepEqual(tokenEvents(""), []);
});

test("a stream that only repeats has no figures (its own shuffled null)", () => {
  const ev = Array.from({ length: 80 }, (_, i) => ["a", "b", "c", "d"][i % 4]);
  const s = surpriseCut(ev, { order: 2, alpha: 0.05, draws: 10, seed: 1, minLength: 3 });
  assert.equal(s.schema, "SurpriseCut@1");
  assert.equal(s.figures, 0);
  assert.equal(s.refused, null);
});

test("boundaries land where one known figure gives way to another", () => {
  const seq = [0, 1, 2, 0, 2, 1, 1, 0, 2, 2, 0, 1, 2, 0, 1, 1, 2, 0];
  const seg = surpriseCut(stream(seq), { order: 2, alpha: 0.05, draws: 10, seed: 1, minLength: 3 });
  assert.ok(seg.figures >= 4, `cut something: ${seg.figures}`);
  const starts = new Set(seq.map((_, i) => i * 4).slice(1));
  const onFigure = seg.boundaries.filter((b) => starts.has(b)).length;
  assert.ok(onFigure / seg.figures >= 0.7, `${onFigure} of ${seg.figures} at a figure start`);
});

test("a stream too short to hold a figure is a typed refusal, never a silent cut", () => {
  const s = surpriseCut(["a"]);
  assert.equal(s.refused, "too_short");
  assert.equal(s.figures, 0);
  assert.equal(s.order, SURPRISE_DEFAULTS.order);
});

test("the read carries the gate: readToWeft emits WeftEntry@4 with a SurpriseCut", () => {
  const text = ("Stevenson wrote Treasure Island. Long John Silver served as the cook. " +
    "Jim Hawkins found the map in the chest. The captain drank the rum in the inn. ").repeat(4);
  const entry = readToWeft(text, { address: "probe.txt", category: "test" });
  assert.equal(entry.schema, "WeftEntry@4");
  assert.equal(entry.surprise?.schema, "SurpriseCut@1");
  assert.equal(typeof entry.surprise.cut, "number");
  assert.ok(entry.surprise.events >= 2);
  // the gate is declared, not fitted: every parameter is on the record
  for (const k of ["order", "alpha", "draws", "seed", "minLength"]) assert.ok(k in entry.surprise);
});
