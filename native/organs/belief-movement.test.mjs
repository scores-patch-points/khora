import test from "node:test";
import assert from "node:assert/strict";
import { yearsIn, valuesFor, bitsOf, rankByBelief } from "./belief-movement.js";

test("yearsIn reads four-digit year tokens by character class", () => {
  assert.deepEqual(yearsIn("On July 14, 2026, the House passed it; in 2022 the Senate did. Page 1234567, H.R. 8"), ["2026", "2022"]);
  assert.deepEqual(yearsIn("no dates here"), []);
});

test("valuesFor: a passage carries a value for the slot only if its subject is the figure and its predicate the relation", () => {
  assert.deepEqual(valuesFor("time", { actor: true, relation: true, sentence: "passed in 2026" }), ["2026"]);
  assert.deepEqual(valuesFor("time", { actor: false, relation: true, sentence: "passed in 2026" }), []);
  assert.deepEqual(valuesFor("time", { actor: true, relation: false, sentence: "passed in 2026" }), []);
  assert.deepEqual(valuesFor("person", { actor: true, relation: true, subj: "Maria Lopez" }), ["Maria Lopez"]);
  assert.deepEqual(valuesFor("person", { actor: false, relation: true, subj: "Maria Lopez" }), ["Maria Lopez"], "a who-question is answered by the subject, which need not be the figure");
  assert.deepEqual(valuesFor("proposition", { actor: true, relation: true, polarity: "-" }), ["not"]);
  assert.deepEqual(valuesFor("deliberative", { actor: true, relation: true }), [], "a question with no single slot has no values");
});

test("bitsOf: a rival value moves belief more than a repeat of what is held; nothing carried moves exactly nothing", () => {
  const held = new Map([["2026", 5]]);
  const repeat = bitsOf(held, "2026"), rival = bitsOf(held, "2022"), fresh = bitsOf(new Map(), "2026");
  assert.ok(repeat > 0, "a repeat is not nothing: it strengthens");
  assert.ok(rival > repeat, "a rival moves more than a repeat");
  assert.ok(fresh > repeat, "a first value in an empty slot moves more than a repeat of an established one");
});

test("rankByBelief: greedy by movement, context moves nothing, the window stops where the conclusion stops changing", () => {
  const r = rankByBelief({
    held: [{ id: "h1", values: ["2026"] }, { id: "h2", values: ["2026"] }, { id: "h3", values: ["2026"] }],
    passages: [{ id: "repeat", values: ["2026"] }, { id: "rival", values: ["2022"] }, { id: "about-something-else", values: [] }],
  });
  assert.deepEqual(r.order.map((o) => o.id), ["rival", "repeat"], "the rival moves belief most, so it leads");
  assert.deepEqual(r.context, ["about-something-else"]);
  assert.equal(r.order[0].direction, "rival");
  assert.equal(r.order[1].direction, "strengthens");
  assert.equal(r.window, 1, "after the rival the conclusion (answer 2026, a rival held) no longer changes");
  assert.deepEqual(r.beyondWindow, ["repeat"]);
  assert.equal(r.before.answer, "2026");
});

test("rankByBelief: a passage that overturns the answer is reported as 'changes'", () => {
  const r = rankByBelief({ held: [{ id: "h", values: ["2022"] }], passages: [{ id: "a", values: ["2026"] }, { id: "b", values: ["2026"] }] });
  assert.equal(r.before.answer, "2022");
  assert.equal(r.after.answer, "2026");
  assert.ok(r.order.some((o) => o.direction === "changes"));
});

test("a tie for the lead is no single answer, never an alphabetical pick", () => {
  const r = rankByBelief({ held: [{ id: "h", values: ["2026"] }], passages: [{ id: "a", values: ["2022"] }, { id: "b", values: ["2026"] }] });
  assert.equal(r.before.answer, "2026");
  // after admitting the rival the lead is tied 1-1: the answer is null, not "2022"
  const first = r.order[0];
  assert.equal(first.values[0], "2022");
  assert.equal(first.answerAfter, null, "1-1 is contested: no answer");
  assert.equal(r.after.answer, "2026", "2-1 after the second");
});
