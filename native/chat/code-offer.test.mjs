// code-offer.test.mjs — a request the chat would refuse is OFFERED to the code door when the code session's mark says it is near what functions on this machine do (a weak hint: topic, not intent),
// the offer quotes the nearest function's own words, and nothing runs until a yes. The router is a stand-in with fixed scores: a codec stands in for a codec.
import test from "node:test"; import assert from "node:assert/strict";
let mk = null, why = null;
try { const { makeThread } = await import("./thread.mjs"); mk = (extra = {}) => makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-24T06:30:00"), ...extra }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: mk ? false : `no reader here: ${why}` };
const router = { score: async (text) => ({ unitSim: /\breverse\b/i.test(text) ? 0.81 : 0.31, bankSim: null, nearest: { name: /\breverse\b/i.test(text) ? "reversed" : "open", score: 0.81 } }), describe: (name) => (name === "reversed" ? "reversed: Return the characters of a string in the opposite order.\nMore text." : null) };   // regex-ok: the stand-in router's fixed scores in a test, not language reading
test("a request about data is offered to the code door, with the nearest function's own words and the promise to ask for an example; nothing runs", T, async () => {
  const th = await mk({ codeRouter: router }); const r = await th.turn("Reverse this string.");
  assert.equal(r.handled, false); assert.equal(r.gap, "code_offered");
  assert.match(r.text, /^I can't do that myself, but I can look for code on this machine that might\./); assert.match(r.text, /“reversed”/); assert.match(r.text, /Return the characters of a string in the opposite order/); assert.match(r.text, /ask you for an example first\. Want me to look\?$/);
  assert.ok(r.trace.some((t) => t.step === "code_offer" && t.mark === "code-request" && t.nearest === "reversed")); assert.ok(!r.trace.some((t) => t.step === "slash"), "nothing was run");
});
test("a yes calls the door with the sentence that was asked; a no (lower case: the reader tags a capitalised “No.” as the abbreviation for “number”, a reader defect) drops it; anything else drops it and is read as itself", T, async () => {
  const yes = await mk({ codeRouter: router }); await yes.turn("Reverse this string."); const y = await yes.turn("Yes.");
  assert.equal(y.trace[0].step, "code_offer_accepted"); assert.equal(y.trace[0].sentence, "Reverse this string."); assert.ok(y.trace.some((t) => t.step === "slash" && t.door === "code"), "the door was called, as /code");
  const no = await mk({ codeRouter: router }); await no.turn("Reverse this string."); const n = await no.turn("no"); assert.equal(n.text, "Okay."); assert.equal(n.trace[0].step, "code_offer_declined");
  assert.ok(!(await no.turn("Yes.")).trace.some((t) => t.step === "code_offer_accepted"), "a declined offer is gone");
  const other = await mk({ codeRouter: router }); await other.turn("Reverse this string."); const o = await other.turn("What is 2 + 2?"); assert.equal(o.text, "4."); assert.ok(!(await other.turn("Yes.")).trace?.some((t) => t.step === "code_offer_accepted"), "an unrelated message drops the offer");
});
test("a request the mark does not flag, or no router at all, keeps the old refusal", T, async () => {
  const far = await mk({ codeRouter: router }); const f = await far.turn("Open the door."); assert.equal(f.gap, "act_not_possible"); assert.match(f.text, /I can't do that\.$/);
  const none = await mk({ codeRouter: null }); assert.equal((await none.turn("Reverse this string.")).gap, "act_not_possible");
});
test("the quoted words are the function's own: the codec's prefix and the repeated name are dropped", T, async () => {
  const raw = { score: async () => ({ unitSim: 0.9, bankSim: null, nearest: { name: "reversed", score: 0.9 } }), describe: () => "search_document: reversed. Return the characters in the opposite order.\nMore." };
  const r = await (await mk({ codeRouter: raw })).turn("Reverse this string."); assert.match(r.text, /\(“Return the characters in the opposite order”\)/); assert.doesNotMatch(r.text, /search_document/);
});
