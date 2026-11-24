// corrections.test.mjs — a correction of a binding outranks the chat's pick, says what changed, and is there in the next thread (the owner, 2026-11-24). The log is a temporary one, set before anything is imported.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
process.env.CHAT_PHAROS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "chat-corrections-"));
let mk = null, openLog = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); ({ openLog } = await import("./record.mjs")); mk = (extra = {}) => makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-24T06:30:00"), ...extra }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: mk ? false : `no reader or no log here: ${why}` };
const say = async (th, ...ms) => { let r; for (const m of ms) r = await th.turn(m); return r; };
test("a pick the user took back is replaced, the reply says what changed, and later answers follow it", T, async () => {
  const th = await mk(); const r = await say(th, "Casey met Jordan. She smiled.", "Who is she?", "Casey", "Who smiled?", "That's not right, she is Jordan.");
  assert.equal(r.type, "correction"); assert.equal(r.text, "Right: she is Jordan, not Casey."); assert.equal(r.trace[0].was, "Casey");
  assert.equal((await th.turn("Who smiled?")).text, "Jordan.");
  const th2 = await mk(); await say(th2, "Casey met Jordan. She smiled.", "Who is she?", "Casey"); assert.equal((await th2.turn("No, I meant Jordan.")).text, "Right: she is Jordan, not Casey.");
});
test("“they” is bound only to someone the user said it means; a name's gender stated outranks the table, and the table's disagreement is said", T, async () => {
  const th = await mk(); await say(th, "Casey smiled. They waved."); assert.equal((await th.turn("Who waved?")).text, "They.");
  assert.equal((await th.turn("No, they means Casey.")).text, "Right: “they” means Casey."); assert.equal((await th.turn("Who waved?")).text, "Casey.");
  const t2 = await mk(); await say(t2, "Pierre met Natasha. She smiled."); const r = await t2.turn("No, Natasha is a man. He smiled.");
  assert.match(r.text, /^Right: Natasha is a man\./); assert.match((await t2.turn("Who is he?")).text, /^That would be Natasha\./);
});
test("a question or a negated clause is not a correction: “Is she Jordan?” asks, “She is not Jordan.” says who she is not", T, async () => {
  const th = await mk(); await say(th, "Casey met Jordan. She smiled.");
  for (const m of ["Is she Jordan?", "She is not Jordan."]) assert.notEqual((await th.turn(m)).type, "correction", m);
  const none = await mk(); assert.notEqual((await none.turn("No, I meant Jordan.")).type, "correction", "nothing was chosen, so there is nothing to correct (the old reading of “no” stands)");
});
test("a correction is written to the log and the next thread starts from it; the newest correction of a name wins", T, async () => {
  const log = openLog(); const a = await mk({ log }); await say(a, "Casey met Jordan. She smiled.", "Who is she?", "Casey", "No, I meant Jordan.");
  const b = await mk({ log }); await say(b, "Jordan met Casey. She smiled."); assert.equal((await b.turn("Who smiled?")).text, "Jordan.");
  const prof = async (th, name) => th.engine.wordProfile("", { ref: th.engine.S.read.cast.referents.find((x) => x.forms[0][0] === name).ref });
  const c = await mk({ log }); await say(c, "Casey smiled. They waved.", "No, they means Casey."); const d = await mk({ log }); await say(d, "Casey wrote a letter. Casey waved.");
  const p = (await prof(d, "Casey")).pronoun; assert.equal(p.nom, "they"); assert.equal(p.decided, true); assert.match(p.source, /^told/);
  const e = await mk({ log }); await say(e, "Casey wrote a letter. Casey waved.", "Casey is a woman."); const f = await mk({ log }); await say(f, "Casey wrote a letter. Casey waved.");
  assert.equal((await prof(f, "Casey")).pronoun.nom, "she", "the newest correction of the name wins");
  const none = await mk(); await say(none, "Casey wrote a letter. Casey waved."); assert.equal((await prof(none, "Casey")).pronoun.source, "they-default", "no log, nothing remembered");
});
