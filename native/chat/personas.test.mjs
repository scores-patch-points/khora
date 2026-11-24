// personas.test.mjs — a persona is a prompt read as a document ABOUT the assistant (found 2026-11-23: choosing "claude" picked Claude Code's FleetView
// agent file, and the reader only knew "you are", so every answer fell back to the default self). Checked here: the list holds only prompts, labelled so
// two files with one name can be told apart; the protagonist's identity is read from the prompt's own clauses (a name, "you", a phrase holding the name);
// and a question about "you" is answered from the prompt, in the first person, citing it. Offline; needs the reader's priors, else skips.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

process.env.KHORA_PERSONA_CACHE = fs.mkdtempSync(path.join(os.tmpdir(), "personas-"));
let P = null, thread = null, why = null;
try { P = await import("./personas.mjs"); const { makeThread } = await import("./thread.mjs"); thread = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-23T14:51:00") }); } catch (e) { why = String(e?.message ?? e).slice(0, 100); }
// the reader tags a bare present-tense verb after a name unreliably ("Claude answers questions"), so the fixture uses clauses with auxiliaries, as real prompts mostly do
const CLAUDE = "Claude can help with writing. Claude should be honest. Claude is curious. Claude will answer questions. This iteration of Claude is Claude Sonnet 5.5. Claude is accessible via an API. Claude can write code.";
const T = { skip: P && thread ? false : `no reader here: ${why}` };

test("the list holds prompts, not parts of a product, and labels tell files apart", T, async () => {
  const tree = { tree: ["Anthropic/official/2026-11-09-claude-sonnet-5.5.md", "Anthropic/claude-code/agents/claude.md", "Anthropic/claude-code/skills/pdf/REFERENCE.md", "OpenAI/gpt-5.md", "README.md"].map((p) => ({ type: "blob", path: p, size: 900 })) };
  const items = await P.listPersonas({ fetchImpl: async () => ({ ok: true, json: async () => tree }) });
  assert.deepEqual(items.map((x) => x.path).sort(), ["Anthropic/official/2026-11-09-claude-sonnet-5.5.md", "OpenAI/gpt-5.md"]);
  assert.equal(items.find((x) => x.vendor === "Anthropic").label, "Claude Sonnet 5.5 · 2026-11-09");
  assert.equal(items.find((x) => x.vendor === "Anthropic").group, "official");
  assert.equal(P.labelOf("claude"), "Claude");
});

test("the identity is read from the clause that says what the protagonist is, wherever the prompt says it", T, async () => {
  const claude = await P.readPersona(CLAUDE);
  assert.equal(claude.name, "Claude"); assert.equal(claude.identity, "Claude Sonnet 5.5", "availability (“is accessible via”) is not identity");
  const gpt = await P.readPersona("You are ChatGPT, a large language model trained by OpenAI. You can browse the web.");
  assert.match(gpt.identity, /^ChatGPT/); assert.equal(gpt.name, "ChatGPT");
  assert.ok(claude.text.includes("Claude Sonnet 5.5"), "the sentences about it are kept, for the persona to answer from");
});

test("a persona answers “who are you?” in the first person from its prompt, cites it, and says so when its prompt does not say", T, async () => {
  const pz = await P.readPersona(CLAUDE);
  await thread.setPersona({ ...pz, label: "Claude Sonnet 5.5 · 2026-11-09" });
  const r = await thread.turn("who are you?");
  assert.equal(r.handled, true); assert.equal(r.text, "I'm Claude Sonnet 5.5."); assert.deepEqual(r.cites.map((c) => c.label), ["Claude Sonnet 5.5 · 2026-11-09's prompt"]);
  assert.ok(!/simulated|program/.test(r.text), "the banner says it is a simulation; the reply speaks as the persona");
  const k = await thread.turn("what is your favourite colour?");
  assert.equal(k.handled, false); assert.equal(k.gap, "not_in_persona_prompt"); assert.equal(k.text, "That isn't something my instructions say.");
  await thread.setPersona(null);
  const plain = await thread.turn("who are you?"); assert.match(plain.text, /^I'm a program/);
});

test("what a prompt asks of its protagonist is read from the rows' marks and kept as written: behaviours with a modal or a present-tense verb, with their conditions and negations; nothing follows them", T, async () => {
  const pz = await P.readPersona("Claude is curious. If the person is upset, Claude should not give long lists. Claude can discuss any topic. Claude should answer directly. The weather is fine. This iteration of Claude is Claude Sonnet 5.5.");
  const b = pz.behaviours;
  assert.equal(b.total, 3, `behaviours found: ${b.total}`);
  const bad = b.sample.find((x) => /long lists/.test(x.text)); assert.equal(bad.negative, true); assert.equal(bad.conditional, true); assert.equal(bad.modal, true);
  assert.ok(b.sample.some((x) => /discuss any topic/.test(x.text) && !x.negative && !x.conditional));
  assert.ok(!b.sample.some((x) => /weather/.test(x.text)), "a sentence about something else is not a behaviour of the protagonist");
  assert.ok(!b.sample.some((x) => /iteration of Claude is/.test(x.text) || /is curious/.test(x.text)), "an identity or a description is not a behaviour");
  assert.deepEqual([b.conditional, b.negative, b.modal], [1, 1, 3]);
  // a limit, stated: the reader tags a present-tense verb after a bare name unreliably ("Claude uses a warm tone"), so present-tense behaviours are undercounted
});

const SALT = "You are Captain Salt, a weathered pirate captain. You were made by Cap'n Bob in a tavern. You love rum and treasure. You can read maps.";
test("a persona's prompt is read about the persona: its own “you” is the persona's name, so “Who made you?” finds “You were made by Cap'n Bob”, and the evidence quotes the prompt as written", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-23T14:51:00") });
  await th.setPersona({ ...(await P.readPersona(SALT)), label: "Captain Salt (fixture)" });
  const made = await th.turn("Who made you?");
  assert.equal(made.handled, true); assert.match(made.text, /Cap'n Bob/); assert.ok(made.evidence.some((e) => e.text === "You were made by Cap'n Bob in a tavern."), "the sentence as the prompt wrote it, not the fold's rewrite");
  assert.equal((await th.turn("Who are you?")).text, "I'm Captain Salt, a weathered pirate captain.");
  assert.equal((await th.turn("What do you love?")).text, "Rum and treasure.", "an answer that is a part of a longer answer is not said twice");
  const can = await th.turn("What can you do?"); assert.equal(can.text, "I can read maps."); assert.ok(can.evidence.every((e) => e.given === "Captain Salt (fixture)'s prompt"));
});

test("a prompt with no sentence that says who it is gives a typed gap, never a quotation of the prompt", T, async () => {
  const { makeThread } = await import("./thread.mjs");
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, now: () => new Date("2026-11-23T14:51:00") });
  await th.setPersona({ ...(await P.readPersona("You were made by Cap'n Bob in a tavern. You love rum.")), label: "Anonymous (fixture)" });
  const r = await th.turn("Who are you?");
  assert.equal(r.handled, false); assert.equal(r.gap, "no_identity_in_prompt"); assert.equal(r.text, "My instructions don't say who I am.");
  assert.ok(!/Bob|tavern|prompt says/.test(r.text));
});
