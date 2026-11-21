import test from "node:test"; import assert from "node:assert/strict";
import { proposeCut, sliceTokens, toEvidence, nominate, CliticSliceGap, SCHEMA } from "./clitic-slice.mjs";
const MARKERS = new Set(["'s", "n't", "'re"]);
const smell = (name, marg) => (form) => (name.has(form) ? { cls: "noun", margin: marg } : null);
test("a glued token that is unnameable, whose host is nameable, proposes the cut at the longest named marker", () => {
  const p = proposeCut({ form: "oscar's", smell: smell(new Set(["oscar"]), 0.7), markers: MARKERS });
  assert.deepEqual(p, { host: "oscar", marker: "'s", hostSmell: { cls: "noun", margin: 0.7 }, wholeSmell: null });
});
test("a glued token the smell CAN name is left alone (no reason to cut)", () => {
  assert.equal(proposeCut({ form: "its", smell: smell(new Set(["its"]), 0.9), markers: new Set(["'s"]) }), null);
});
test("a host the smell cannot name is refused: nothing is recovered by cutting", () => {
  assert.equal(proposeCut({ form: "isn't", smell: smell(new Set([]), 0), markers: MARKERS }), null);
});
test("a form that merely ends with a non-named suffix is not a candidate; the apostrophe is part of the marker", () => {
  assert.equal(proposeCut({ form: "knot", smell: smell(new Set(["k"]), 0.5), markers: new Set(["n't"]) }), null);
});
test("gaps are typed, never silent: no smell, no markers", () => {
  assert.throws(() => proposeCut({ form: "x", smell: null, markers: MARKERS }), (e) => e instanceof CliticSliceGap && e.code === "no_smell");
  assert.throws(() => proposeCut({ form: "x", smell: smell(new Set(), 0), markers: new Set() }), (e) => e.code === "no_markers");
});
test("sliceTokens walks the tokens and returns the proposals with their indices", () => {
  const out = sliceTokens({ tokens: [{ index: 0, form: "oscar's" }, { index: 1, form: "car" }], smell: smell(new Set(["oscar", "car"]), 0.7), markers: MARKERS });
  assert.equal(out.length, 1); assert.equal(out[0].index, 0); assert.equal(out[0].marker, "'s");
});
test("schema is stable", () => assert.equal(SCHEMA, "CliticSlice@1"));
test("toEvidence fires on a nameable host and carries the caller's card; nominate shapes the tokenizer-rule observation", () => {
  const p = { host: "oscar", marker: "'s", hostSmell: { cls: "noun", margin: 0.7 }, wholeSmell: null };
  const card = { lrGood: 8.3 };
  assert.equal(toEvidence(p, card).outcome, "good");
  assert.equal(toEvidence(p, card).layer, "clitic-slice-'s");
  assert.equal(toEvidence({ ...p, hostSmell: null }, card).outcome, "not_good");
  const n = nominate(p);
  assert.equal(n.cell, "tokenizer-rule"); assert.equal(n.effect, "split"); assert.equal(n.form, "'s"); assert.equal(n.hostNameable, true); assert.equal(n.wholeNameable, false);
});
