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

test("a bare fragment is NOT social by having nothing else in it: it is something the chat cannot place, and says so (of 618 messages declared social on no predicate alone, 10% were interjection-only)", () => {
  const j = verdict([row(1, "Bangalore", "PROPN")]);
  assert.equal(j.working, "fragment"); assert.equal(j.open, false); assert.deepEqual(j.claims.map((c) => c.act), ["fragment"]);
});

test("positive evidence makes a remark social: it opens with an interjection (the reader's own tag) and has no predicate", () => {
  const j = verdict([row(1, "ok", "INTJ"), row(2, "dear", "ADJ")]);
  assert.equal(j.working, "social"); assert.equal(j.open, false);
  assert.deepEqual(j.claims.map((c) => [c.act, c.standing]).sort(), [["fragment", "refuted"], ["social", "holds"]], "the unplaceable reading is shown as ruled out, with the mark that rules it out");
  assert.equal(takenAs(j), null, "nothing to say when it is clear");
  assert.equal(verdict([row(1, "hello", "NOUN")], { small: true }).working, "social", "a known greeting or thanks is positive evidence too");
});

test("a fragment with a question mark is AMBIGUOUS: both acts hold and stay open, and the message is routed to the one that changes the thread least", () => {
  const j = verdict([row(1, "really", "ADV"), Q]);
  assert.equal(j.open, true); assert.equal(j.working, "fragment"); assert.deepEqual(j.alternatives, ["question"]);
  assert.ok(j.claims.every((c) => c.standing === "open"));
  assert.match(takenAs(j), /^I took that as something I can't place; it could also be a question\. Say “no” if I got it wrong\.$/);
});

test("a question word makes a fragment a question, not something unplaceable", () => {
  const j = verdict([row(1, "who", "PRON"), Q], { wh: true });
  assert.equal(j.working, "question"); assert.equal(j.open, false);
  assert.equal(j.claims.find((c) => c.act === "fragment").standing, "refuted");
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
  assert.deepEqual([...LEAST_HARM], ["social", "fragment", "question", "request", "statement"]); assert.ok(SPECIFIC.includes("puzzle") && SPECIFIC.includes("calculation"));
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

test("a known greeting or thanks outranks a lone question mark; a question word or an auxiliary before the subject does not give way", () => {
  const thanks = verdict([row(1, "thank", "VERB"), row(2, "you", "PRON"), row(3, "?", "PUNCT"), row(4, "?", "PUNCT")], { small: true });
  assert.equal(thanks.working, "social"); assert.equal(thanks.open, false);
  assert.equal(thanks.claims.find((c) => c.act === "question").standing, "refuted");
  const how = verdict([row(1, "how", "ADV"), row(2, "are", "AUX"), row(3, "you", "PRON", { deprel: "nsubj", head: 2 }), Q], { small: true, wh: true });
  assert.equal(how.working, "question", "“how are you?” keeps its question word");
});
