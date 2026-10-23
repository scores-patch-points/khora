// The revise ledger's pairing (opencode-doorway.mjs successorOf), on the sentences a live hand-back produced.
import test from "node:test";
import assert from "node:assert/strict";
const { successorOf } = await import("./opencode-doorway.mjs");

const was = "She won the 1911 Nobel Prize in Physics.";
const claim = (text, standing = "supported") => ({ text, standing });

test("the restated sentence is the successor", () => {
  const now = successorOf(was, [claim("The grounding check flags my earlier claim about the 1911 prize.", "unsupported"), claim("She won the 1911 Nobel Prize in Chemistry.")]);
  assert.equal(now?.text, "She won the 1911 Nobel Prize in Chemistry.");
});

test("a preamble that only names the topic is not a successor", () => {
  assert.equal(successorOf(was, [claim("The grounding check flags my earlier claim about the 1911 prize.", "unsupported"), claim("I'll read the source file before correcting it.", "argument")]), null);
});

test("a sentence quoting the mistake is not the correction", () => {
  assert.equal(successorOf(was, [claim('Nobel Prize: My earlier "She won the 1911 Nobel Prize in Physics" was wrong.', "unsupported")]), null);
});

test("a successor the door contradicts is not a correction", () => {
  assert.equal(successorOf(was, [claim("She won the 1912 Nobel Prize in Physics.", "contradicted")]), null);
});

test("a correction in the source's own words rests on the sentence the original was found against", () => {
  const against = "In 1911 she was awarded the Nobel Prize in Chemistry.";
  const claims = [
    { text: "curie.md says the 1911 prize was in Chemistry, not Physics.", standing: "supported", evidence: { text: against } },
    { text: "In 1911 she was awarded the Nobel Prize in Chemistry.", standing: "supported", evidence: { text: against } },
    { text: "Marie Curie was a Polish and naturalised-French physicist and chemist.", standing: "supported", evidence: { text: "Marie Curie was a Polish and naturalised-French physicist and chemist." } },
  ];
  assert.equal(successorOf(was, claims, against)?.text, "In 1911 she was awarded the Nobel Prize in Chemistry.");
  assert.equal(successorOf(was, claims, null), null, "without the source sentence, a paraphrase below half is not claimed");
});
