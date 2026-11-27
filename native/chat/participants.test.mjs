// participants.test.mjs — I and you are the two participants of a conversation. In what the USER TYPED, "I" is the user and "you" is the chat; so an answer that is a told "I" is said to the user as "you" ("Who lives in Paris?" -> "You."),
// a told "you" comes back as "I", and the words that are not the user's (inside a quotation, in a passage a giver supplied) are left as they were. The same test is the view the canonical comparison reads (thread.participants()).
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
process.env.CHAT_PHAROS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "participants-"));   // a test never writes to the owner's log
let mk = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); mk = (extra = {}) => makeThread({ hl: "http://127.0.0.1:1", know: null, codeRouter: null, crispr: null, shelf: null, material: null, now: () => new Date("2026-11-24T12:00:00"), ...extra }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: mk ? false : `no reader here: ${why}` };
const said = (r) => (r.trace ?? []).filter((x) => x.step === "participant");

test("an answer that is the user's own \"I\" is said to the user as \"you\"; an answer that is a name is untouched; the step is on the trace", T, async () => {
  const th = await mk(); await th.turn("I live in Paris. Mina lives in Rome.");
  const a = await th.turn("Who lives in Paris?"); assert.equal(a.text, "You.", a.text); assert.deepEqual(said(a).map((x) => [x.said, x.as]), [["I", "you"]]);
  const b = await th.turn("Who lives in Rome?"); assert.equal(b.text, "Mina."); assert.equal(said(b).length, 0);
  const c = await th.turn("Where do I live?"); assert.equal(c.text, "In Paris.", "the question side already matched the told \"I\"; it still does");
});

test("the user's \"me\" and a told \"you\": a role filled by \"me\" is \"you\" to the user, and what the user said of \"you\" comes back as \"I\"", T, async () => {
  const th = await mk(); await th.turn("Mina gave me a book. You helped Mina.");
  const a = await th.turn("Who gave me a book?"); assert.equal(a.text, "Mina.");
  const k = await th.turn("Who helped Mina?"); assert.equal(k.text, "I.", `${k.text} ${JSON.stringify(k.trace?.filter((x) => x.step === "participant"))}`); assert.deepEqual(said(k).map((x) => [x.said, x.as]), [["You", "I"]]);
});

test("words that are not the user's are not shifted: inside a quotation, and in a passage a giver supplied", T, async () => {
  const th = await mk(); await th.turn('Mina said "I will leave Paris". Pierre stayed.'); await th.say("I was born in Spain.", { given: "a passage" });
  const ps = th.participants(); assert.deepEqual(ps.map((x) => [x.form, x.chat]), [["I", null]], "the quoted I is listed with nobody bound; the passage's I is not listed at all");
  const a = await th.turn("Who will leave Paris?"); assert.equal(said(a).length, 0, `the quoted I is not the user: ${a.text}`);
  const b = await th.turn("Who was born in Spain?"); assert.equal(said(b).length, 0, `the passage's I is not the user: ${b.text}`);
});
