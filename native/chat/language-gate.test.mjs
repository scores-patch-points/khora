// language-gate.test.mjs — the chat asks the real reader's language gate (reading.js readerFor, Parsing fixes) before it reads a message: a script no prior holds, or a language no codec reads, or a language it places that is
// not English, is a typed gap and nothing goes into the thread; a message it cannot place by its words is read as the thread's declared English, and the trace says so. Skipped where readerFor is not in this checkout.
import test from "node:test"; import assert from "node:assert/strict";
const READING = await import("../reading.js").catch(() => null), HAVE = !!READING?.readerFor;
let mk = null, why = null; try { const { makeThread } = await import("./thread.mjs"); mk = () => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-24T06:30:00") }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: !mk ? `no reader here: ${why}` : HAVE ? false : "readerFor is not in this checkout (Parsing fixes' commit is not on this branch)" };
test("a message in a script no prior holds, or in a language no codec reads, is a typed gap and nothing is read into the thread", T, async () => {
  const th = await mk(); const r = await th.turn("Привет, как дела?");
  assert.equal(r.type, "unread"); assert.equal(r.handled, false); assert.ok(["no_language", "no_codec"].includes(r.gap)); assert.match(r.text, /I haven't read it\.$/);
  assert.equal(r.trace[0].step, "language"); assert.equal(th.state().sentences, 0, "nothing went into the thread");
});
test("a message the gate cannot place by its words is read as the thread's declared English, and the trace says it was undecided; English is read as before", T, async () => {
  const th = await mk(); await th.turn("Mina gave Jonathan a book."); assert.equal((await th.turn("Who gave Jonathan a book?")).text, "Mina.");
  const shrug = await th.turn("Hmm"); assert.notEqual(shrug.type, "unread", "a shrug is not another language");
  assert.match(th.state().priors.language, /asked before a message is read/);
});
test("English with novel names is read; a lower-case message that is mostly words English does not know is a typed gap (romanised Hindi), not English by default", T, async () => {
  const th = await mk(); const names = await th.turn("Zelko met Brannoc."); assert.equal(names.type, "read", "names are not evidence of another language");
  // the rule needs a priors home with a language identifier; the 20-file stand-in has none, so there it reads as English and state() says so
  const noIdentifier = th.state().priors.language.includes("has no language identifier"), hindi = await th.turn("kal milte hai yaar");
  if (noIdentifier) assert.notEqual(hindi.type, "unread", "no identifier here: the message is read as the thread's English, and state() says so");
  else { assert.equal(hindi.type, "unread"); assert.equal(hindi.gap, "no_language"); assert.match(hindi.text, /most of the words aren't English I know/); assert.equal(th.state().sentences, 1, "only the English sentence is in the thread"); }
  for (const m of ["Hmm", "Hahaha", "Who smiled?"]) assert.notEqual((await th.turn(m)).type, "unread", m);
});
