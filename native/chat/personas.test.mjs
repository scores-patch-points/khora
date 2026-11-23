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
