// hunt-check.test.mjs — the first live hunt said "Suetonius" for "Who wrote War and Peace?" (one sentence in a section about the title's history) with "Leo Tolstoy" (two pages, the
// novel's own lead) among the candidates. The check is what a careful reader does: say it only if nobody else has more pages behind them. Pure; the objects are the hunt's real shape.
import test from "node:test"; import assert from "node:assert/strict";
import { settled } from "./hunt-check.mjs";

const suetonius = { answer: "Suetonius", tier: "role", documents: 1, support: 1 }, tolstoy = { answer: "Leo Tolstoy", tier: "byline", documents: 2, support: 3 }, bbc = { answer: "BBC", tier: "comention", documents: 1, support: 2 };

test("a unique answer that another candidate out-supports is not stated: what was found is listed, with the pages behind each", () => {
  const r = settled({ unique: true, answer: suetonius, candidates: [suetonius, tolstoy, bbc] });
  assert.equal(r.ok, false); assert.deepEqual(r.rivals, ["Leo Tolstoy"]);
  assert.equal(r.text, "Wikipedia doesn't settle it: Suetonius is credited on one page, but Leo Tolstoy is named next to it on 2 pages.");
});

test("an answer nobody out-supports is stated, and so is one that only ties", () => {
  assert.equal(settled({ unique: true, answer: tolstoy, candidates: [tolstoy, suetonius, bbc] }).ok, true);
  assert.equal(settled({ unique: true, answer: suetonius, candidates: [suetonius, bbc] }).ok, true, "a tie in pages is the hunt's own judgement (its tier), not a rival");
});

test("names said together are one answer, not rivals of each other; a hunt that found no unique answer is not this check's business", () => {
  const gates = { answer: "Bill Gates", tier: "role", documents: 2, support: 2, set: ["Bill Gates", "Paul Allen"], answerText: "Bill Gates and Paul Allen" }, allen = { answer: "Paul Allen", tier: "role", documents: 2, support: 2 };
  assert.equal(settled({ unique: true, answer: gates, candidates: [gates, allen] }).ok, true);
  assert.equal(settled({ unique: false, answer: null, candidates: [suetonius, tolstoy] }).ok, true);
});

test("a name seen next to the anchors with no sentence that says the relation never blocks an answer, however many pages it has", () => {
  const founders = { answer: "Bill Gates", tier: "role", documents: 2, support: 2 }, windows = { answer: "Windows", tier: "comention", documents: 3, support: 3 };
  assert.equal(settled({ unique: true, answer: founders, candidates: [founders, windows] }).ok, true);
});
