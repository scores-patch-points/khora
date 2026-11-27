// eval/prompted/audit.mjs — DOES THE PROMPT MAKE THE SYSTEM ANSWER DIFFERENTLY, AND CAN EVERY DIFFERENCE BE TRACED?
// The owner, 2026-11-23: "prove we can make the system respond differently by how it's prompted, and make that auditable. If we have it responding as Claude
// that should be observable and auditable."
//
// The system under test is the real chat (native/chat/thread.mjs, not edited): a prompt is read into a persona (native/chat/personas.mjs: the identity clause, and
// the prompt's own sentences read into a fold the persona is asked questions of). No model runs. What this file adds is the evidence, five kinds, each a
// check that can fail:
//   DIFFERENCE   the same question under different prompts gives different replies
//   INVARIANCE   a question the prompt cannot speak to (arithmetic, the clock, a greeting) gives the same reply under every prompt
//   DETERMINISM  the same prompt and question twice give byte-identical replies
//   CAUSE        remove the one sentence the reply was drawn from and the reply changes (an ablation, run again from scratch): the sentence did it
//   COVERAGE     where the prompt DOES say something (a fixture whose sentences are known by construction), did the system use it? A miss is a finding and a pin.
// Every reply carries its audit: the prompt's source and sha256, the span of the sentence it came from, that no model ran, and a command that replays it.
// Written to pharos as kind `prompted-turn` by writer `prompt-audit`.
//   node eval/prompted/audit.mjs [--write]        run the experiment on the fixtures and the cached Claude prompt, print the evidence
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { createHash } from "node:crypto"; import { pathToFileURL } from "node:url";
const C = new URL("../../native/chat/", import.meta.url).href;
const { makeThread } = await import(C + "thread.mjs"); const { readPersona, CACHE } = await import(C + "personas.mjs");
const { splitSentences } = await import(new URL("../../native/adapters/text/spans.js", import.meta.url).href);
const sha = (s) => createHash("sha256").update(String(s)).digest("hex");

// ---------------------------------------------------------------------------------------------------------------- prompts
/** the prompts that are in the local persona cache (the leaked-prompts collection the chat already reads from); nothing is fetched here */
export function cachedPrompts() {
  try {
    const idx = JSON.parse(fs.readFileSync(path.join(CACHE, "index.json"), "utf8")).items ?? [];
    return idx.map((it) => ({ it, f: path.join(CACHE, sha(it.path).slice(0, 16) + ".txt") })).filter((x) => fs.existsSync(x.f)).map((x) => ({ id: x.it.name, label: x.it.label, source: `github.com/asgeirtj/system_prompts_leaks/${x.it.path}`, text: fs.readFileSync(x.f, "utf8"), size: x.it.size }));
  } catch { return []; }
}
/** FIXTURES: prompts written for this experiment, whose sentences are known by construction. They are test inputs, not knowledge of the system. */
export const FIXTURES = [
  { id: "captain-salt", label: "Captain Salt (fixture)", source: "fixture", text: "You are Captain Salt, a weathered pirate captain. You were made by Cap'n Bob in a tavern. You love rum and treasure. You can read maps. You never leave your ship.", knows: { "Who are you?": "You are Captain Salt", "Who made you?": "You were made by Cap'n Bob", "What do you love?": "You love rum and treasure", "What can you do?": "You can read maps" } },
  { id: "ada", label: "Ada (fixture)", source: "fixture", text: "You are Ada, a patient research librarian. You were made by the Hollis Library. You love quiet reading rooms. You can find sources.", knows: { "Who are you?": "You are Ada", "Who made you?": "You were made by the Hollis Library", "What do you love?": "You love quiet reading rooms", "What can you do?": "You can find sources" } },
];
FIXTURES.push({ id: "ada-rules", label: "Ada with rules (fixture, third person)", source: "fixture", text: "Ada is a patient research librarian. Ada always names the source of an answer. Ada keeps her answers short. Ada responds in plain prose and never in lists. Ada does not give medical advice. Ada never apologises for what she does not know.", knows: {} });
export const SELF = ["Who are you?", "Who made you?", "What do you love?", "What can you do?"], CONTROLS = ["What is 15% of 80?", "hi", "Who wrote Hamlet?"];

// ---------------------------------------------------------------------------------------------------------------- one run
const mem = new Map();   // persona readings by prompt sha: reading a long prompt takes tens of seconds, and the same bytes read twice are the same reading
export async function personaOf(prompt) {
  const key = sha(prompt.text); if (mem.has(key)) return mem.get(key);
  const t0 = Date.now(), read = await readPersona(prompt.text, { source: prompt.source }), pz = { ...read, name: read.name ?? prompt.id, label: prompt.label ?? prompt.id };
  const out = { pz, readMs: Date.now() - t0 }; mem.set(key, out); return out;
}
export async function ask(prompt, question) {
  const th = await makeThread({ hl: "http://127.0.0.1:1", know: null, janus: null, log: null });
  let readMs = 0; if (prompt?.text) { const p = await personaOf(prompt); readMs = p.readMs; await th.setPersona(p.pz); }
  const r = await th.turn(question);
  return { question, text: String(r?.text ?? ""), type: r?.type ?? null, handled: r?.handled ?? null, cites: (r?.cites ?? []).map((c) => c.label), evidence: (r?.evidence ?? []).map((e) => String(e.text ?? e)), tools: (r?.tools ?? []).map((t) => t.name), identity: prompt?.text ? (await personaOf(prompt)).pz.identity ?? null : null, readMs };
}

/** where a sentence stands in the prompt: the span [from, to) of the first exact occurrence, or null */
export function spanOf(promptText, sentence) { const i = String(promptText).indexOf(String(sentence).trim()); return i < 0 ? null : { from: i, to: i + String(sentence).trim().length }; }
/** the span of the sentence that the reply was drawn from: the evidence sentence the persona fold quoted, or the clause the identity was read from */
export function sourceSpan(prompt, a) {
  for (const e of a.evidence) { const s = spanOf(prompt.text, e); if (s) return { ...s, text: e, how: "evidence the persona's fold quoted" }; }
  if (a.type === "self" && a.handled && a.identity) { const k = a.identity.split(",")[0]; const sents = splitSentences(prompt.text, { abbreviations: new Set() }); const hit = sents.find((c) => c.text.includes(k)); if (hit) { const s = spanOf(prompt.text, hit.text); if (s) return { ...s, text: hit.text.trim(), how: "the clause the identity was read from" }; } }
  return null;
}
const without = (text, span) => text.slice(0, span.from) + text.slice(span.to);

/** AUDIT of one reply: where it came from, that no model ran, how to replay it, and (if `prove`) the ablation that shows the sentence is the cause */
export async function audit(prompt, question, { prove = false } = {}) {
  const a = await ask(prompt, question), fromPrompt = !!prompt?.text && a.cites.some((c) => c.endsWith("prompt")), span = fromPrompt ? sourceSpan(prompt, a) : null;
  const rec = { schema: "PromptedTurn@1", at: new Date().toISOString(), simulated: !!prompt?.text, model: "none", question, reply: a.text, type: a.type, handled: a.handled, tools: a.tools, cites: a.cites, evidence: a.evidence, identity: a.identity,   // evidence: the sentences the reply quotes; identity: what the persona reading took "who I am" to be
    answeredFrom: !prompt?.text ? "the system's own description or its tools (code), no prompt" : fromPrompt ? "the prompt" : "the system's tools (code), not the prompt",
    prompt: prompt?.text ? { id: prompt.id, label: prompt.label, source: prompt.source, sha256: sha(prompt.text), bytes: Buffer.byteLength(prompt.text) } : null, span,
    replay: prompt?.text ? `node eval/prompted/audit.mjs --prompt ${JSON.stringify(prompt.id)} --q ${JSON.stringify(question)}` : `node eval/prompted/audit.mjs --q ${JSON.stringify(question)}` };
  if (prove && span) { const b = await ask({ ...prompt, text: without(prompt.text, span) }, question); rec.counterfactual = { removed: span.text, reply: b.text, changed: b.text !== a.text }; }
  return rec;
}

// ---------------------------------------------------------------------------------------------------------------- the experiment
export async function experiment({ prompts, self = SELF, controls = CONTROLS, prove = true, log = () => {} } = {}) {
  const base = prompts.map((p) => ({ prompt: p, rows: [] }));
  const none = { id: "none", label: "no prompt", text: null }, all = [none, ...prompts], matrix = {};
  for (const q of [...self, ...controls]) { matrix[q] = {}; for (const p of all) { const rec = await audit(p, q, { prove: prove && self.includes(q) && p.text && q === "Who are you?" || (prove && p.fixture && self.includes(q)) }); matrix[q][p.id] = rec; log(`${q} | ${p.id} | ${rec.reply.slice(0, 70)}`); } }
  const verdict = { difference: {}, invariance: {}, determinism: {}, cause: [], coverage: [] };
  for (const q of self) verdict.difference[q] = new Set(all.map((p) => matrix[q][p.id].reply)).size;
  for (const q of controls) verdict.invariance[q] = new Set(all.map((p) => matrix[q][p.id].reply)).size === 1;
  for (const q of ["Who are you?", "What do you love?"]) for (const p of all.filter((x) => x.text)) { const again = await ask(p, q); verdict.determinism[`${p.id} / ${q}`] = again.text === matrix[q][p.id].reply; }
  for (const q of self) for (const p of prompts) { const c = matrix[q][p.id].counterfactual; if (c) verdict.cause.push({ prompt: p.id, question: q, removed: c.removed, changed: c.changed }); }
  for (const p of prompts.filter((x) => x.knows)) for (const [q, expect] of Object.entries(p.knows)) { const r = matrix[q]?.[p.id]; verdict.coverage.push({ prompt: p.id, question: q, promptSays: expect, replied: r?.reply, used: !!r?.handled && r.answeredFrom === "the prompt" }); }
  return { matrix, verdict, prompts: all.map((p) => ({ id: p.id, label: p.label, source: p.source ?? null, sha256: p.text ? sha(p.text) : null })) };
}

// ---------------------------------------------------------------------------------------------------------------- what the prompt asks, and what the system does about it
/** the prompt's behaviours sorted into: acts on / can be checked / outside what this system does (organs/prompt-policy.js), each with the sentence and its span */
let refCache = null;
/** sentences of an unrelated book (Alice's Adventures in Wonderland, Zenodotus, public domain), every k-th, 6 to 25 words, no digits: what a sentence about nothing in particular is */
export function referenceSentences(n = 200) {
  if (refCache) return refCache;
  const f = new URL("../../../Zenodotus/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt", import.meta.url).pathname; if (!fs.existsSync(f)) return (refCache = []);
  const text = fs.readFileSync(f, "utf8").slice(3000), all = splitSentences(text, { abbreviations: new Set() }).map((c) => c.text.replaceAll("\n", " ").trim()).filter((t) => { const w = t.split(" ").length; return w >= 6 && w <= 25 && ![...t].some((ch) => (ch >= "0" && ch <= "9") || ch === "“" || ch === "\""); }), k = Math.max(1, Math.floor(all.length / n));
  return (refCache = all.filter((_, i) => i % k === 0).slice(0, n));
}
export async function policyOf(prompt, embed) {
  const { classify } = await import(new URL("../../native/organs/prompt-policy.js", import.meta.url).href);
  const { pz } = await personaOf(prompt), bs = (pz.behaviours?.sample ?? []).map((b) => ({ ...b, span: spanOf(prompt.text, b.text.slice(0, 80)) ? { from: spanOf(prompt.text, b.text.slice(0, 80)).from, to: spanOf(prompt.text, b.text.slice(0, 80)).from + b.text.length } : null }));
  return { ...(await classify(bs, { embed, reference: referenceSentences() })), read: pz.behaviours?.total ?? 0 };
}

// ---------------------------------------------------------------------------------------------------------------- pharos
export async function weaveAudits(records, { dir = path.join(os.homedir(), ".pharos", "fold-demo"), pharos = path.resolve(new URL(".", import.meta.url).pathname, "..", "..", "..", "pharos") } = {}) {
  const P = await import(pathToFileURL(path.join(pharos, "lib", "pharos.mjs")).href), h = P.open("fold-demo", { dir, writer: "prompt-audit" });
  try { P.weave(h, { cell: "DEF·Figure", kind: "kind", addr: "kind:prompted-turn", body: { name: "prompted-turn", cell: "EVA·Figure", why: "one reply of the chat under a prompt, with where it came from and the ablation that shows it" } }); } catch { /* already declared */ }
  P.weaveMany(h, records.map((r, i) => ({ cell: "EVA·Figure", kind: "prompted-turn", addr: `prompted:${r.prompt?.sha256?.slice(0, 12) ?? "none"}:${sha(r.question).slice(0, 8)}:${i}:${Date.now()}`, body: r })));
  return records.length;
}

/** the findings of the first run, as pins for whoever owns the persona route (native/chat): what the prompt says and the system did not use, with the command that shows it */
export const PINS = [
  { id: "persona-passive-made-by", title: "“Who made you?” is not answered although the prompt says “You were made by X”", bound: "That isn't something my instructions say.", shouldBe: "the sentence “You were made by Cap'n Bob in a tavern.” (span in the prompt), as the answer, with its span", lookFirst: "the persona fold stores “You were made by X” with the agent under a passive; the question “Who made Captain Salt?” is asked of it with “you” turned into the name, and the frames do not meet", repro: "node eval/prompted/audit.mjs --prompt captain-salt --q \"Who made you?\"" },
  { id: "persona-modal-can", title: "“What can you do?” is not answered although the prompt says “You can read maps”", bound: "That isn't something my instructions say.", shouldBe: "“read maps”, cited to the prompt", lookFirst: "“do” in the question is a pro-verb for the whole predicate; the fold's answer needs the open role to be the verb's object, not the verb", repro: "node eval/prompted/audit.mjs --prompt captain-salt --q \"What can you do?\"" },
  { id: "persona-love-voice", title: "“What do you love?” is voiced “Rum and treasure and and treasure.”", bound: "the coordinated object is voiced twice", shouldBe: "“Rum and treasure.”", lookFirst: "the voice of a coordinated filler: the conjunct and the whole phrase are both added", repro: "node eval/prompted/audit.mjs --prompt captain-salt --q \"What do you love?\"" },
  { id: "persona-love-ada", title: "“What do you love?” misses “You love quiet reading rooms” while it finds “You love rum and treasure”", bound: "That isn't something my instructions say.", shouldBe: "“Quiet reading rooms.”", lookFirst: "“reading” is read as a verb in “quiet reading rooms”, so the object of “love” is not a plain noun phrase; the same sentence shape works for another prompt", repro: "node eval/prompted/audit.mjs --prompt ada --q \"What do you love?\"" },
  { id: "persona-behaviour-do-not-missed", title: "“Ada does not give medical advice.” is not read as one of the prompt's rules (4 of 5 read)", bound: "the rules list for the Ada-with-rules fixture has four entries; the fifth sentence of rules is missing", shouldBe: "five rules, the fifth marked as a prohibition", lookFirst: "readPersona's behaviour reader on “does not” (auxiliary do plus not), where “never” and “always” were found", repro: "open the audit page, choose “Ada with rules (fixture, third person)”, press “What does this prompt ask of the system?”: it says it read 4 rules; the prompt has 5" },
  { id: "persona-fallback-quotes-label", title: "With the identity sentence removed, the reply quotes the persona's label and the opening of its prompt", bound: "“Claude Sonnet 5.5 · 2026-11-09 (25 KB, from the persona cache)'s prompt says “# Claude behavior …”", shouldBe: "a typed gap: “my instructions don't say who I am”", lookFirst: "the fallback in the self route when the persona has no identity: it answers from the first sentences of the prompt under the label", repro: "see the counterfactual in the audit card for “Who are you?” under the Claude prompt" },
];
export async function weavePins(pins = PINS, { dir = path.join(os.homedir(), ".pharos", "fold-demo"), pharos = path.resolve(new URL(".", import.meta.url).pathname, "..", "..", "..", "pharos") } = {}) {
  const P = await import(pathToFileURL(path.join(pharos, "lib", "pharos.mjs")).href), h = P.open("fold-demo", { dir, writer: "prompt-audit" });
  P.weaveMany(h, pins.map((x) => ({ cell: "EVA·Figure", kind: "pin", addr: `pin:${x.id}`, body: { id: x.id, status: "open", class: "persona", title: x.title, node: "native/chat persona route", bound: x.bound, shouldBe: x.shouldBe, evidence: [], lookFirst: x.lookFirst, repro: x.repro, found: "2026-11-23" } })));
  return pins.length;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  if (process.argv.includes("--pins")) { console.log("pins woven (writer prompt-audit):", await weavePins()); process.exit(0); }
  const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
  const claude = cachedPrompts().find((p) => p.size > 20000 && p.size < 30000 && p.label.includes("Claude")), prompts = [...FIXTURES.map((f) => ({ ...f, fixture: true })), ...(claude ? [claude] : [])];
  if (arg("--q")) { const p = arg("--prompt") ? prompts.find((x) => x.id === arg("--prompt")) : null; console.log(JSON.stringify(await audit(p, arg("--q"), { prove: true }), null, 1)); process.exit(0); }
  const t0 = Date.now(), out = await experiment({ prompts, log: (s) => console.log(s) });
  console.log("\nDIFFERENCE (distinct replies per self question across no-prompt + prompts):", JSON.stringify(out.verdict.difference));
  console.log("INVARIANCE (controls identical under every prompt):", JSON.stringify(out.verdict.invariance));
  console.log("DETERMINISM (same prompt, same question, twice):", JSON.stringify(out.verdict.determinism));
  console.log("CAUSE (the reply changes when its sentence is removed):", JSON.stringify(out.verdict.cause));
  console.log("COVERAGE (the fixture's prompt says it; did the system use it):", JSON.stringify(out.verdict.coverage.map((c) => `${c.prompt}: ${c.question} -> ${c.used ? "used" : "MISSED"}`)));
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (process.argv.includes("--write")) { const recs = Object.values(out.matrix).flatMap((r) => Object.values(r)); console.log("woven to pharos (writer prompt-audit):", await weaveAudits(recs)); }
  process.exit(0);
}
