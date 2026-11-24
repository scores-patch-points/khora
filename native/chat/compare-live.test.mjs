// compare-live.test.mjs — the opt-in comparison mode: off by default; on, a turn that read statements is compared with the canonical read AFTER the reply, one `read_comparison` entry per run, a failure is counted and
// never reaches the user. The canonical read is a stand-in function (a codec stands in for a codec); the log is a temporary one, set before anything is imported.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
process.env.CHAT_PHAROS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "chat-compare-"));
let mk = null, openLog = null, readKinds = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); ({ openLog, readKinds } = await import("./record.mjs")); mk = (extra = {}) => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, now: () => new Date("2026-11-24T12:00:00"), ...extra }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: mk ? false : `no reader or no log here: ${why}` };
const weftFor = (th) => ({ pronounsGuess: th.bindings().map((b) => ({ pronoun: b.form, sentence: b.order, at: [b.at, b.at + b.form.length], surface: b.chat === "Mina" ? "Mina" : "Somebody", confident: false })), pronounsPresence: [], sentences: [] });
test("off by default: nothing is compared and state says so", T, async () => {
  let called = 0; const th = await mk({ compareRead: async () => { called++; return {}; } }); await th.turn("Mina gave Jonathan a book. She lives in the village."); await th.compareDone();
  assert.equal(called, 0); assert.equal(th.state().compare.on, false); assert.match(th.state().compare.how, /off by default; CHAT_COMPARE=1/);
});
test("on: a turn that read statements is compared after the reply, counted, and written as one entry without the text; a question is not compared", T, async () => {
  const log = openLog(); let th; th = await mk({ log, compare: true, compareRead: async () => weftFor(th) });
  const r = await th.turn("Mina gave Jonathan a book. She lives in the village."); assert.equal(r.type, "read"); assert.equal(r.text, "Noted.", "the reply is the chat's own");
  await th.compareDone(); const c = th.state().compare; assert.equal(c.on, true); assert.equal(c.runs, 1); assert.equal(c.errors, 0); assert.equal(c.last.pronouns, 1); assert.equal(typeof c.last.counts.agree, "number");
  const q = await th.turn("Who gave Jonathan a book?"); assert.match(q.text, /Mina/); await th.compareDone(); assert.equal(th.state().compare.runs, 1, "a question reads nothing into the thread, so it is not compared");
  const rows = readKinds(log, ["read_comparison"]).filter((e) => e.body?.thread === th.id); assert.equal(rows.length, 1); assert.equal(rows[0].body.sentences, 2); assert.ok(!JSON.stringify(rows[0].body).includes("village"), "the text is never written");
});
test("a failing canonical read is counted and never reaches the user; a burst of statements is one run", T, async () => {
  const th = await mk({ compare: true, compareRead: async () => { throw new Error("the canonical read is not here"); } });
  const r = await th.turn("Mina gave Jonathan a book."); assert.equal(r.text, "Noted."); await th.compareDone(); const c = th.state().compare; assert.equal(c.errors, 1); assert.match(c.lastError, /not here/);
  let runs = 0; const t2 = await mk({ compare: true, compareRead: async () => { runs++; await new Promise((r2) => setTimeout(r2, 30)); return { pronounsGuess: [], pronounsPresence: [] }; } });
  await t2.turn("Mina gave Jonathan a book."); await t2.turn("She lives in the village."); await t2.turn("Pierre visited Mina."); await t2.compareDone(); assert.ok(runs >= 1 && runs <= 2, `a burst is coalesced (${runs} runs for 3 statements)`);
});
test("I and you: in what the user typed a first person is the user and a second person is the chat; inside a quotation and in a passage a giver supplied the chat binds nobody; the counts reach the log without the text", T, async () => {
  const log = openLog(); let th; const canon = () => ({ pronounsGuess: [], pronounsPresence: [], speakerBindings: th.participants().filter((x) => x.kind === "speaker").map((x) => ({ a: x.at, b: x.at + x.form.length, cl: "one:speaker", ref: "narrator", kind: "narrator", via: "first person outside quotations" })) });
  th = await mk({ log, compare: true, compareRead: async () => canon() });
  await th.turn("I live in Paris. My dog is named Rex. You are kind."); await th.compareDone();
  const ps = th.participants(); assert.deepEqual(ps.map((x) => [x.form.toLowerCase(), x.kind, x.chat]), [["i", "speaker", "user"], ["my", "speaker", "user"], ["you", "addressee", "me"]], JSON.stringify(ps));
  assert.ok(ps.every((x) => x.at >= 0 && th.engine.S.text.slice(x.at, x.at + x.form.length) === x.form), "each offset points at its own word in the thread's text");
  const e = readKinds(log, ["read_comparison"]).filter((r) => r.body?.thread === th.id).at(-1); assert.equal(e.body.speakers.mentions, 3); assert.deepEqual([e.body.speakers.counts.agree, e.body.speakers.counts.canon_none], [2, 1], "the I and the my agree with the narrator; the canonical read has no addressee outside a quotation");
  assert.deepEqual(e.body.speakers.refs.chat, ["user"]); assert.ok(!JSON.stringify(e.body).includes("Paris"), "the text is never written");
  await th.turn('Mina said "I will leave". I stayed.'); const q = th.participants().filter((x) => x.order >= 3);
  assert.deepEqual(q.map((x) => [x.form, x.chat]), [["I", null], ["I", "user"]], "the quoted I is Mina's, not the user's; the chat does not read quotations, so it binds nobody; the unquoted I is the user");
  await th.say("I was born in Spain.", { given: "a passage" }); assert.equal(th.participants().filter((x) => x.order >= 5).length, 0, "a passage a giver supplied is not the user's words");
});
