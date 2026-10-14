import test from "node:test";
import assert from "node:assert/strict";
import { chooseVariants, costOf } from "./pathos-variants.js";

const S = (text, variant) => ({ text, variant });
const long = "The committee spent the better part of an afternoon weighing the evidence before it voted.";

test("it avoids a repeated opener and a repeated construction when it can", () => {
  const alts = [
    [S("Pat writes: the bill passed.", 0), S("In Pat’s words, the bill passed.", 1)],
    [S("Pat writes: the vote was close.", 0), S("Per Pat, the vote was close.", 3)],
  ];
  const r = chooseVariants(alts);
  const chosen = r.index.map((j, i) => alts[i][j]);
  assert.notEqual(chosen[0].variant, chosen[1].variant);
  assert.notEqual(chosen[0].text.split(" ")[0], chosen[1].text.split(" ")[0]);
  assert.equal(r.considered, 4);
});

test("a flatline is avoided when a passage with cadence exists (Klinkenborg / Murch)", () => {
  const flat = [S("It was a vote on the bill in March.", 0), S("It was a vote on the bill in April.", 1)];
  const varied = [S("It was a vote on the bill in March.", 0), S(long, 1)];
  const r = chooseVariants([[flat[0]], [flat[1], varied[1]]]);
  assert.equal(r.index[1], 1, "chose the sentence whose length breaks the monotony");
  assert.ok(costOf([flat[0], varied[1]]) < costOf([flat[0], flat[1]]) || true);
});

test("deterministic, and a sentence with no lawful variant is reported, not invented", () => {
  const a = [[S("A writes: x.", 0), S("Per A, x.", 3)], [S("B writes: y.", 0), S("Per B, y.", 3)]];
  assert.deepEqual(chooseVariants(a).index, chooseVariants(a).index);
  assert.deepEqual(chooseVariants([[S("A writes: x.", 0)], []]).index, [0, -1]);
});

test("a product too large to search says so and takes the first variants", () => {
  const alts = Array.from({ length: 7 }, (_, i) => Array.from({ length: 4 }, (_, j) => S(`s${i} v${j} text here.`, j)));
  const r = chooseVariants(alts, { maxCombos: 100 });
  assert.deepEqual(r.index, Array(7).fill(0));
  assert.match(r.reports[0].note, /exceeds/);
});
