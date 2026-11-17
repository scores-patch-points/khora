import test from "node:test"; import assert from "node:assert/strict";
import { finalVariants, withSandhiVariants, foldCaseForms } from "./sanskrit-sandhi.js";
test("final variants: so, anusvara, voicing", () => {
  assert.ok(finalVariants("saḥ").includes("so")); assert.ok(finalVariants("tam").includes("taṃ")); assert.ok(finalVariants("tat").includes("tad")); assert.ok(finalVariants("tāḥ").includes("tāś"));
  assert.ok(finalVariants("api").includes("apy")); assert.ok(finalVariants("anyat").includes("anyac"));
  assert.ok(finalVariants("tatas").includes("tataś") && finalVariants("tatas").includes("tato"));
  assert.ok(!finalVariants("saḥ").includes("saḥ")); assert.deepEqual(finalVariants("rāma"), []);
});
test("the POS closure adds only what is unattested and never overwrites", () => {
  const p = { forms: { tam: { PRON: 9 }, "taṃ": { NOUN: 1 }, saḥ: { PRON: 5 } } }; const c = withSandhiVariants(p);
  assert.deepEqual(c.forms["taṃ"], { NOUN: 1 }); assert.deepEqual(c.forms.so, { PRON: 5 }); assert.deepEqual(withSandhiVariants({ forms: { api: { PART: 9 } } }).forms["'pi"], { PART: 9 }); assert.equal(withSandhiVariants(p), c);
});
test("case forms of one stem fold; unrelated words do not", () => {
  const E = ["aḥ", "am", "o", "asya", "ena", "āya", "aṃ"]; const rows = ["hiraṇyako", "hiraṇyakaṃ", "hiraṇyakasya", "hiraṇyakena", "patanako", "patanakaṃ", "kāko"].map((surface) => ({ surface }));
  const { groups, n } = foldCaseForms(rows, E); assert.equal(groups.get(0), groups.get(3)); assert.equal(groups.get(4), groups.get(5)); assert.notEqual(groups.get(0), groups.get(4)); assert.notEqual(groups.get(0), groups.get(6)); assert.equal(n, 3);
});
