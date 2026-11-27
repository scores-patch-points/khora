// audit.test.mjs — the five checks, on the fixtures (fast): the prompt makes the reply differ, controls do not move, the same bytes come back, the sentence a reply came from is
// its cause, and the span in the audit is where that sentence stands. Skips where the chat or its reader's priors are not available.
import test from "node:test"; import assert from "node:assert/strict";
let M = null, why = null;
try { M = await import("./audit.mjs"); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: M ? false : `no chat here: ${why}` };
const salt = M?.FIXTURES.find((f) => f.id === "captain-salt");

test("the same question under different prompts gives different replies, and the audit names the prompt by its sha256", T, async () => {
  const none = await M.audit(null, "Who are you?"), a = await M.audit(salt, "Who are you?");
  assert.notEqual(none.reply, a.reply); assert.equal(a.reply, "I'm Captain Salt, a weathered pirate captain."); assert.equal(a.simulated, true); assert.equal(a.model, "none");
  assert.equal(a.prompt.sha256.length, 64); assert.equal(a.answeredFrom, "the prompt"); assert.equal(none.answeredFrom, "the system's own description or its tools (code), no prompt"); assert.equal(none.prompt, null);
});

test("a question the prompt cannot speak to is answered the same under every prompt", T, async () => {
  for (const q of M.CONTROLS) { const r = await Promise.all([null, salt, M.FIXTURES[1]].map((p) => M.audit(p, q))); assert.equal(new Set(r.map((x) => x.reply)).size, 1, q); assert.ok(r.every((x) => x.answeredFrom !== "the prompt"), "and it says it did not come from the prompt"); }
});

test("the same prompt and question twice give byte-identical replies", T, async () => {
  const a = await M.ask(salt, "What do you love?"), b = await M.ask(salt, "What do you love?"); assert.equal(a.text, b.text);
});

test("the span in the audit is where the sentence stands, and removing it changes the reply: that sentence is the cause", T, async () => {
  const a = await M.audit(salt, "Who are you?", { prove: true }); assert.equal(salt.text.slice(a.span.from, a.span.to), "You are Captain Salt, a weathered pirate captain.");
  assert.equal(a.counterfactual.changed, true); assert.notEqual(a.counterfactual.reply, a.reply);
  const l = await M.audit(salt, "What do you love?", { prove: true }); assert.equal(salt.text.slice(l.span.from, l.span.to), "You love rum and treasure."); assert.equal(l.counterfactual.changed, true);
});

test("where the prompt says it, the system uses it, and a miss would be reported, never hidden: the first run found 3 of 8 and the chat's owner closed it to 8 of 8", T, async () => {
  const r = await M.audit(salt, "Who made you?");
  assert.equal(r.answeredFrom, "the prompt", "if this fails the system has stopped using a sentence the prompt says: that is a COVERAGE miss, a pin, not a flaky test"); assert.equal(r.reply, "By Cap'n Bob."); assert.equal(salt.text.slice(r.span.from, r.span.to), "You were made by Cap'n Bob in a tavern.");
  const miss = await M.audit({ ...salt, text: salt.text.replace("You were made by Cap'n Bob in a tavern. ", "") }, "Who made you?"); assert.equal(miss.reply, "That isn't something my instructions say.", "with the sentence gone the system says it was not told");
});
