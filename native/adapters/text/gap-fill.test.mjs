// gap-fill.test.mjs — fill the question's gap from the read's kāraka triples. Pins the 20-questions
// narrowing: each filled role is one question, each question cuts the triples that disagree, and the
// answer is the referent left in the gap's slot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillGap } from "./gap-fill.js";
import { gapRole } from "./wh-narrow.js";

const TRIPLES = [
  { predicate: "give", kartṛ: "Jonathan", karman: "book", sampradāna: "Mina" },
  { predicate: "live", kartṛ: "Mina", adhikaraṇa: "village" },
  { predicate: "read", kartṛ: "Mina", karman: "book" },
];

test("who gave the book to Mina -> Jonathan: the filled roles narrow to the one triple, the gap is its agent", () => {
  const r = fillGap({ gap: "kartṛ", filled: { predicate: "give", karman: "book", sampradāna: "Mina" }, triples: TRIPLES });
  assert.equal(r.answer, "Jonathan");
  assert.equal(r.reason, null);
  assert.deepEqual(r.matched, TRIPLES[0]);
});

test("the narrowing is the DMD: each filled role is a question that cuts the triples that disagree", () => {
  const r = fillGap({ gap: "kartṛ", filled: { predicate: "give" }, triples: TRIPLES });
  assert.equal(r.answer, "Jonathan", "predicate=give already singles out the one triple");
  assert.equal(r.dmd.find((s) => s.step === "match").matched, 1);

  // give -> only one triple; but read (Mina reads the book) is cut when the question names the patient book and the gap is the agent
  const r2 = fillGap({ gap: "kartṛ", filled: { predicate: "read", karman: "book" }, triples: TRIPLES });
  assert.equal(r2.answer, "Mina", "Mina is the agent of the reading, not Jonathan");
});

test("a filled role a triple lacks is a hole, not a match: it cuts the triple and is disclosed", () => {
  const r = fillGap({ gap: "kartṛ", filled: { predicate: "give", karman: "book", apādāna: "store" }, triples: TRIPLES });
  assert.equal(r.answer, null);
  assert.equal(r.reason, "no-triple");
  const cut = r.dmd.find((s) => s.step === "match").cut;
  assert.ok(cut.some((c) => c.missing.includes("apādāna")), "the missing apādāna role is named, not silently dropped");
});

test("two triples that both fit the filled roles leave the gap ambiguous, named as candidates", () => {
  const r = fillGap({ gap: "karman", filled: { predicate: "give" }, triples: [...TRIPLES, { predicate: "give", kartṛ: "Mina", karman: "pen", sampradāna: "Jonathan" }] });
  assert.equal(r.reason, "ambiguous");
  assert.deepEqual([...new Set(r.candidates)].sort(), ["book", "pen"]);
});

test("the two steps compose: admits -> kāraka role -> gap-filled from the DAG", () => {
  const role = gapRole("person").role; // who -> kartṛ
  const r = fillGap({ gap: role, filled: { predicate: "give", karman: "book", sampradāna: "Mina" }, triples: TRIPLES });
  assert.equal(r.answer, "Jonathan");
});
