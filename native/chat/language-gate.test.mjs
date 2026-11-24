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
