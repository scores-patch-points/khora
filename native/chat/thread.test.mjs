// thread.test.mjs — the chat's reply to each kind of message, with no model: said facts are read in order and recalled by referent; a
// pronoun is bound by the cast; arithmetic, the clock, small talk and "who are you" are tools and rules; a request is not a fact; a
// description with no tie is a typed gap. Needs the reader's priors (KHORA_PRIORS_DIR); skips without them.
import test from "node:test"; import assert from "node:assert/strict";
let thread = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); thread = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-23T14:51:00") }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: thread ? false : `no reader here: ${why}` };
test("a statement is read in order; a question about it is answered by referent, with its sentence", T, async () => {
  const r = await thread.turn("Mina gave Jonathan a book. She lives in the village.");
  assert.equal(r.type, "read"); assert.ok(r.facts.length >= 1);
  const a = await thread.turn("Who gave Jonathan a book?");
  assert.equal(a.handled, true); assert.match(a.text, /Mina/); assert.ok(a.evidence.length >= 1); assert.ok(a.tools.some((t) => t.name === "recall"));
});
test("a pronoun in a question is bound by the cast", T, async () => {
  const a = await thread.turn("Who is she?");
  assert.equal(a.handled, true); assert.match(a.text, /^That would be Mina\./, "she is Mina (the subject, and the given-name table says Mina is a she), not Jonathan");
  const b = await thread.turn("Who is he?"); assert.match(b.text, /^That would be Jonathan\./);
});
test("arithmetic is a tool; the clock is a tool; neither touches the fold", T, async () => {
  const c = await thread.turn("what is 12 times 7?"); assert.equal(c.text, "84."); assert.equal(c.tools[0].name, "calculate");
  assert.equal((await thread.turn("what is 15 % of 80?")).text, "12.");
  const d = await thread.turn("what day is it?"); assert.match(d.text, /Today is Monday/); assert.equal(d.tools[0].name, "clock");
  assert.equal((await thread.turn("what is 2 apples times 3?")).type !== "calculation", true, "a unit word is not arithmetic");
});
test("small talk and who-are-you are answered by rule, and say so", T, async () => {
  assert.equal((await thread.turn("hello")).text, "Hello.");
  const s = await thread.turn("who are you?"); assert.equal(s.type, "self"); assert.match(s.text, /no language model/);
});
test("a request is not a fact: about what is not known it is acted on, about the world it is refused; a description nobody tied to a name is a typed gap", T, async () => {
  const before = thread.state().sentences, r = await thread.turn("go research it");
  assert.match(r.text, /nothing I'm missing/, "no gap is open, so there is nothing to look for, and it says so"); assert.equal(thread.state().sentences, before, "nothing was read into the fold");
  const w = await thread.turn("open the door"); assert.equal(w.gap, "act_not_possible"); assert.equal(thread.state().sentences, before);
  const g = await thread.turn("who is the president?"); assert.equal(g.handled, false); assert.equal(g.gap, "unknown_description");
});
test("statements and a closing question in one message: the statements are read into the fold, then the question is answered from them", T, async () => {
  const before = thread.state().sentences;
  const r = await thread.turn("Pavel gave Irina a map. Who gave Irina a map?");
  assert.equal(r.handled, true); assert.match(r.text, /Pavel/);
  assert.equal(thread.state().sentences, before + 1, "the statement was read; the question was not stored");
  assert.equal(r.introduced[0].source, null, "what the user said is not attributed to a giver");
});
test("negation is a mark carried per clause: a negated statement does not say who did it, and a later negation retracts an earlier affirmation", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-23T14:51:00") });
  let th = await mk();
  const said = await th.turn("Mina did not give Jonathan a book.");
  assert.equal(said.facts[0].neg, true, "the fact carries the reader's Polarity=Neg mark");
  const who = await th.turn("Who gave Jonathan a book?");
  assert.equal(who.handled, true); assert.equal(who.text, "Not Mina: you told me “Mina did not give Jonathan a book.”", "the negated clause is not an answer, it is the reason for “not Mina”");
  const yn = await th.turn("Did Mina give Jonathan a book?"); assert.match(yn.text, /^No: you told me “Mina did not give Jonathan a book\.”$/);
  th = await mk();
  await th.turn("Mina gave Jonathan a book.");
  assert.equal((await th.turn("Who gave Jonathan a book?")).text, "Mina.");
  assert.match((await th.turn("Did Mina give Jonathan a book?")).text, /^Yes: you told me “Mina gave Jonathan a book\.”$/);
  await th.turn("Mina did not give Jonathan a book.");
  const after = await th.turn("Who gave Jonathan a book?");
  assert.match(after.text, /^Not Mina: you told me “Mina did not give Jonathan a book\.”$/, "the later negation retracts the earlier affirmation");
});
test("the word “help” inside a longer message does not open the help screen", T, async () => {
  const r = await thread.turn("Indha help kuda panna maataengura la?:-(");
  assert.notEqual(r.type, "help");
  assert.match((await thread.turn("help")).text, /^I can tell you the date and the time/);
  assert.equal((await thread.turn("What can you do?")).type, "help");
});
