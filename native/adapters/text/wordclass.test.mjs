import test from "node:test";
import assert from "node:assert/strict";
import { classifyWord, normalizeForm } from "./wordclass.js";

const posPrior = { forms: { department: { NOUN: 18, PROPN: 8 }, "o'connell": { PROPN: 1 }, the: { DET: 9064, PRON: 8 } } };

test("a curly apostrophe is a typing difference, not an absence", () => {
  const c = classifyWord("O’Connell", { posPrior });
  assert.equal(c.found, true);
  assert.deepEqual(c.via.map((v) => v.step), ["apostrophe"]);
  assert.equal(c.form, "O'Connell");
});

test("the sentence's own punctuation is not part of the form", () => {
  const c = classifyWord("Department.", { posPrior });
  assert.equal(c.found, true);
  assert.deepEqual(c.via.map((v) => v.step), ["edge-punctuation"]);
});

test("an exact entry is untouched and carries no hop", () => {
  const c = classifyWord("the", { posPrior });
  assert.equal(c.found, true);
  assert.equal("via" in c, false);
});

test("a form the prior lacks stays a typed gap", () => {
  assert.equal(classifyWord("Zzxqy.", { posPrior }).found, false);
  assert.equal(classifyWord("", { posPrior }).found, false);
  assert.equal(classifyWord(undefined, { posPrior }).found, false);
});

test("normalizeForm names every step and leaves a clean form alone", () => {
  assert.equal(normalizeForm("plain").steps.length, 0);
  assert.deepEqual(normalizeForm("(O’Connell).").steps.map((s) => s.step), ["apostrophe", "edge-punctuation"]);
});
