// wh-narrow.test.mjs — the 20-questions narrowing: a WH-question's gap is a kāraka role, and the
// role narrows the candidate answers by kind. Pins the declared bridge (who->kartṛ->person,
// where->adhikaraṇa->place, …) and falsifies the narrowing: the wrong kind is cut, with the DMD
// trace naming the difference.
import { test } from "node:test";
import assert from "node:assert/strict";
import { narrowAnswers, gapRole, ADMITS_KARAKA, KARAKA_KIND } from "./wh-narrow.js";

const UNIVERSE = [
  { ref: "Jonathan", kind: "person" },
  { ref: "Mina", kind: "person" },
  { ref: "book", kind: "thing" },
  { ref: "Kansas", kind: "place" },
  { ref: "Tuesday", kind: "time" },
  { ref: "the storm", kind: "reason" },
];
const refs = (r) => r.survivors.map((c) => c.ref).sort();

test("the declared bridge: a WH-word names a kāraka, and the kāraka admits a kind", () => {
  assert.deepEqual(gapRole("person"), { admits: "person", role: "kartṛ", kinds: ["person"] });
  assert.deepEqual(gapRole("thing"), { admits: "thing", role: "karman", kinds: ["thing", "quantity"] });
  assert.deepEqual(gapRole("place"), { admits: "place", role: "adhikaraṇa", kinds: ["place"] });
  assert.deepEqual(gapRole("time"), { admits: "time", role: "kāla", kinds: ["time"] });
  assert.deepEqual(gapRole("reason"), { admits: "reason", role: "hetu", kinds: ["reason"] });
});

test("who narrows to the beings, where to the places, when to the times", () => {
  assert.deepEqual(refs(narrowAnswers({ admits: "person", candidates: UNIVERSE })), ["Jonathan", "Mina"]);
  assert.deepEqual(refs(narrowAnswers({ admits: "place", candidates: UNIVERSE })), ["Kansas"]);
  assert.deepEqual(refs(narrowAnswers({ admits: "time", candidates: UNIVERSE })), ["Tuesday"]);
  assert.deepEqual(refs(narrowAnswers({ admits: "thing", candidates: UNIVERSE })), ["book"]);
  assert.deepEqual(refs(narrowAnswers({ admits: "reason", candidates: UNIVERSE })), ["the storm"]);
});

test("the cut is a difference that makes a difference, and the trace names it", () => {
  const r = narrowAnswers({ admits: "person", candidates: UNIVERSE });
  const narrow = r.dmd.find((s) => s.step === "narrow");
  assert.equal(narrow.kept.length, 2, "two persons survive");
  assert.ok(narrow.cut.some((c) => c.ref === "book" && /person/.test(c.why)), "book is cut because it is not a person");
  assert.equal(r.role, "kartṛ");
});

test("a non-WH gap (polar/position) admits no kāraka and narrows nothing, as a typed fact", () => {
  for (const admits of ["position", "proposition", null]) {
    const r = narrowAnswers({ admits, candidates: UNIVERSE });
    assert.equal(r.role, null);
    assert.equal(r.survivors.length, UNIVERSE.length, `"${admits}" does not narrow`);
    assert.ok(r.dmd.some((s) => s.step === "no-role"));
  }
});

test("the two declared tables cover every WH interrogative the grammar reads", () => {
  // question-grammar.en.js INTERROGATIVES -> {who/whom/whose: person, when: time, where: place,
  // why: reason, how: manner, what/which: thing}; every one of those admits maps to a kāraka here.
  for (const a of ["person", "time", "place", "reason", "manner", "thing"]) assert.ok(ADMITS_KARAKA[a], `${a} maps to a kāraka`);
  for (const k of Object.keys(ADMITS_KARAKA)) assert.ok(KARAKA_KIND[ADMITS_KARAKA[k]], `${ADMITS_KARAKA[k]} admits a kind`);
});
