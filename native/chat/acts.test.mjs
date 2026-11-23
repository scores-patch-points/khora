// acts.test.mjs — what the chat thinks a message IS, as claims that rest on marks and can be wrong (acts.mjs). Pure: rows are written by hand, so this needs no reader.
import test from "node:test"; import assert from "node:assert/strict";
import { marksOf, candidates, judge, takenAs, LABEL, SPECIFIC, LEAST_HARM } from "./acts.mjs";

const row = (id, form, upos, extra = {}) => ({ id, form, upos, head: 0, deprel: "dep", feats: "", ...extra });
const Q = row(9, "?", "PUNCT");
const verdict = (rows, ctx = {}) => judge(candidates(marksOf(rows, ctx)));

test("a statement: a subject with a predicate, nothing against it", () => {
  const j = verdict([row(1, "Mina", "PROPN", { deprel: "nsubj", head: 2 }), row(2, "sleeps", "VERB"), row(3, ".", "PUNCT")]);
  assert.equal(j.working, "statement"); assert.equal(j.open, false);
});

test("a statement with a question mark is not simply a statement: the mark opposes it, and the message is a question", () => {
  const j = verdict([row(1, "Mina", "PROPN", { deprel: "nsubj", head: 2 }), row(2, "sleeps", "VERB"), Q]);
  assert.equal(j.working, "question");
  assert.deepEqual(j.claims.map((c) => [c.act, c.standing]).sort(), [["question", "holds"], ["statement", "refuted"]]);
  assert.deepEqual(j.claims.find((c) => c.act === "statement").against, ["final_question_mark"]);
});

test("a fragment with a question mark is AMBIGUOUS: both acts hold and stay open, and the message is routed to the one that changes the thread least", () => {
  const j = verdict([row(1, "really", "ADV"), Q]);
  assert.equal(j.open, true); assert.equal(j.working, "social"); assert.deepEqual(j.alternatives, ["question"]);
  assert.ok(j.claims.every((c) => c.standing === "open"));
  assert.match(takenAs(j), /^I took that as a social remark; it could also be a question\. Say “no” if I got it wrong\.$/);
  assert.equal(takenAs(verdict([row(1, "ok", "INTJ")])), null, "nothing to say when it is clear");
});

test("a question word makes a fragment a question, not a social remark", () => {
  const j = verdict([row(1, "who", "PRON"), Q], { wh: true });
  assert.equal(j.working, "question"); assert.equal(j.open, false);
  assert.equal(j.claims.find((c) => c.act === "social").standing, "refuted");
});

test("an imperative is a request; a specific act that holds is the working reading alone", () => {
  assert.equal(verdict([row(1, "find", "VERB"), row(2, "Tolstoy", "PROPN", { deprel: "obj", head: 1 })], { request: true }).working, "request");
  const j = verdict([row(1, "what", "PRON"), row(2, "is", "AUX"), row(3, "12", "NUM"), Q], { wh: true, calc: true });
  assert.equal(j.working, "calculation"); assert.deepEqual(j.claims.map((c) => c.act), ["calculation"]);
});

test("no mark at all is a typed gap, never a guess", () => {
  const j = verdict([row(1, "…", "PUNCT")]);
  assert.equal(j.working, "unread"); assert.deepEqual(j.claims, []);
});

test("the correction mark is the reader's own: an opening interjection with negative polarity", () => {
  assert.equal(!!marksOf([row(1, "no", "INTJ", { feats: "Polarity=Neg" }), row(2, ",", "PUNCT")]).correction_mark, true);
  assert.equal(!!marksOf([row(1, "yes", "INTJ"), row(2, ",", "PUNCT")]).correction_mark, false);
});

test("the tie-break and the specific acts are declared, in one place, each with its reason", () => {
  assert.deepEqual([...LEAST_HARM], ["social", "question", "request", "statement"]); assert.ok(SPECIFIC.includes("puzzle") && SPECIFIC.includes("calculation"));
  assert.ok(Object.keys(LABEL.eng).every((k) => typeof LABEL.eng[k] === "string"));
});

test("a question that rests on the final question mark alone is fragile, and says so; one backed by a question word or an auxiliary is not", () => {
  const stm = verdict([row(1, "Mina", "PROPN", { deprel: "nsubj", head: 2 }), row(2, "sleeps", "VERB"), Q]);
  assert.equal(stm.working, "question"); assert.equal(stm.fragile, true);
  assert.match(takenAs(stm), /^I took that as a question because of the question mark\. Say “no” if you meant it as something you're telling me\.$/);
  const wh = verdict([row(1, "who", "PRON", { deprel: "nsubj", head: 3 }), row(2, "sleeps", "VERB"), Q], { wh: true });
  assert.equal(wh.working, "question"); assert.equal(!!wh.fragile, false); assert.equal(takenAs(wh), null);
  const aux = verdict([row(1, "does", "AUX"), row(2, "Mina", "PROPN", { deprel: "nsubj", head: 3 }), row(3, "sleep", "VERB"), Q]);
  assert.equal(!!aux.fragile, false);
});
