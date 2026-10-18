// opencode-semantic.test.mjs — the semantic fallback, with a deterministic stub embedder (no model, no network).
// S-a a synonym resolves to the vocabulary word  S-b an unrelated ask resolves to nothing  S-c FOLD_SEMANTIC=0 never calls the embedder
// S-d a down or slow embedder is a typed gap, not a throw  S-e the vocabulary is embedded once  S-f weft find: lexical miss, semantic hit
// S-g surf: extraTerms make the old turn findable  S-h (opt-in) the real nomic-embed-text separates a synonym from noise
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { semanticTerms, _resetForTests } from "./opencode-semantic.mjs";
import { STUB } from "./semantic-stub.mjs";
const VOCAB = ["retry", "backoff", "webhook", "parser", "deploy", "billing", "invoice", "staging"];

test("S-a a synonym of a vocabulary word resolves to it", async () => {
  _resetForTests();
  const r = await semanticTerms({ ask: "make the resend logic more patient", vocab: VOCAB, embedFn: STUB, env: {} });
  assert.equal(r.via, "semantic");
  assert.ok(r.terms.includes("retry"), JSON.stringify(r));
  assert.ok(!r.terms.includes("billing") && !r.terms.includes("invoice"));
});
test("S-b an ask about nothing in the vocabulary resolves to nothing (below the null ceiling)", async () => {
  _resetForTests();
  const r = await semanticTerms({ ask: "what colour is the sky over the harbour", vocab: VOCAB, embedFn: STUB, env: {} });
  assert.deepEqual(r.terms, []);
  assert.ok(r.gap);
});
test("S-c FOLD_SEMANTIC=0 is lexical-only: the embedder is never called", async () => {
  let calls = 0;
  const r = await semanticTerms({ ask: "resend", vocab: VOCAB, embedFn: async (t) => { calls++; return STUB(t); }, env: { FOLD_SEMANTIC: "0" } });
  assert.equal(calls, 0);
  assert.equal(r.gap, "semantic_off");
});
test("S-d a failing or too-slow embedder is a typed gap and never throws", async () => {
  _resetForTests();
  const down = await semanticTerms({ ask: "resend", vocab: VOCAB, embedFn: async () => { throw new Error("connect ECONNREFUSED"); }, env: {} });
  assert.equal(down.gap, "embedder_down");
  assert.deepEqual(down.terms, []);
  _resetForTests();
  process.env.FOLD_SEMANTIC_MS = "30";
  try {
    const slow = await semanticTerms({ ask: "resend", vocab: VOCAB, embedFn: () => new Promise((r) => setTimeout(() => r(STUB(["x"])), 500)), env: {} });
    assert.equal(slow.gap, "embedder_down");
  } finally { delete process.env.FOLD_SEMANTIC_MS; }
  _resetForTests();
  const wrong = await semanticTerms({ ask: "resend", vocab: VOCAB, embedFn: async () => [[1, 0]], env: {} });
  assert.equal(wrong.gap, "embedder_down"); // a different count of vectors than asked is nonsense, not a result
});
test("S-e the vocabulary is embedded once; a second ask embeds only the ask", async () => {
  _resetForTests();
  const seen = [];
  const spy = async (t) => { seen.push(t.length); return STUB(t); };
  await semanticTerms({ ask: "resend it", vocab: VOCAB, embedFn: spy, env: {} });
  await semanticTerms({ ask: "redo it", vocab: VOCAB, embedFn: spy, env: {} });
  assert.equal(seen.filter((n) => n >= VOCAB.length).length, 1, `vocabulary batches: ${seen}`);
});

// ── weft find, end to end on a real store ──
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sem-"));
process.env.FOLD_WEFT_DIR = path.join(dir, "weft");
process.env.FOLD_OPENCODE_STATE = path.join(dir, "state");
const { recordTurnsToWeft } = await import("./opencode-weft-record.mjs");
const { findInWeft, findInWeftSemantic } = await import("./opencode-weft-find.mjs");
const turns = [{ n: 1, ask: "pick the retry policy", answer: "Webhook retry uses jittered backoff. Tests pass." }, { n: 2, ask: "billing", answer: "Invoice totals are rounded. Tests pass." }];
const file = path.join(dir, "t", "a.turns.md");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, turns.map((t) => `## turn ${t.n}\n\nask: ${t.ask}\n\n${t.answer}\n`).join("\n"));
test("S-f weft find: the lexical read misses a synonym, the semantic fallback finds the sentence", async () => {
  _resetForTests();
  assert.equal(recordTurnsToWeft({ task: "t", agent: "a", turns, file }).ok, true);
  const ask = "make the resend logic more patient";
  assert.equal(findInWeft({ ask, task: "t" }).hits.length, 0, "premise: no shared word");
  const r = await findInWeftSemantic({ ask, task: "t", embedFn: STUB, env: {} });
  assert.equal(r.via, "semantic");
  assert.ok(r.hits.length > 0 && r.semantic.includes("retry"), JSON.stringify(r));
  _resetForTests(); // a cold cache, then the embedder goes away
  const down = await findInWeftSemantic({ ask, task: "t", embedFn: async () => { throw new Error("down"); }, env: {} });
  assert.equal(down.via, "lexical"); // lexical-only mode: the result it already had, with the gap named
  assert.equal(down.semanticGap, "embedder_down");
  assert.equal(down.hits.length, 0);
});
test("S-g surf: words the ask MEANS are used as if it had named them", async () => {
  const { surf } = await import("./opencode-surf.mjs");
  const FILLER = (i) => ({ n: i, ask: `please work on the ${["parser lexer", "deploy staging", "billing invoice"][i % 3]} item ${i}`, answer: `Done with item ${i}. Tests pass.`, grounds: ["edit"] });
  const hist = Array.from({ length: 60 }, (_, i) => (i + 1 === 30 ? { ...FILLER(30), ask: "pick the retry policy", answer: "Retry uses jittered backoff. Tests pass." } : FILLER(i + 1)));
  const ask = "make the resend logic more patient";
  const cites = (n) => (note) => new RegExp(`(?:turns? |,)${n}(?:[,\\s]|$)|turn ${n}:|\\b${n}–|–${n}\\b`).test(note);
  const lexical = surf({ ask, turns: hist }).note;
  assert.ok(!cites(30)(lexical), "premise: lexically the synonym misses turn 30");
  const sem = await semanticTerms({ ask, vocab: [...new Set(hist.flatMap((t) => `${t.ask} ${t.answer}`.toLowerCase().match(/[a-z]{4,}/g)))], embedFn: STUB, env: {} });
  assert.ok(cites(30)(surf({ ask, turns: hist, extraTerms: sem.terms }).note), `semantic terms ${sem.terms}`);
});
test("S-h (opt-in FOLD_TEST_EMBED=1) the real embedder separates a synonym from noise", { skip: process.env.FOLD_TEST_EMBED !== "1" }, async () => {
  _resetForTests();
  const r = await semanticTerms({ ask: "make the resend logic more patient", vocab: ["retry", "jittered", "backoff", "invoice", "billing", "locale", "parser"] });
  assert.ok(r.terms.length > 0 && !r.terms.includes("invoice"), JSON.stringify(r));
});

test("S-i a term inherits the meaning of the sentence it was said in (a bare word carries almost none)", async () => {
  _resetForTests();
  const ask = "make the resend logic more patient";
  assert.deepEqual((await semanticTerms({ ask, vocab: ["policy", "invoice"], embedFn: STUB, env: {} })).terms, [], "the bare word 'policy' says nothing about retry");
  const r = await semanticTerms({ ask, vocab: [{ term: "policy", text: "Webhook retry uses jittered backoff." }, { term: "invoice", text: "Invoice totals are rounded." }], embedFn: STUB, env: {} });
  assert.deepEqual(r.terms, ["policy"]);
});
test("S-j weft find reads each being's own sentence from the raw turns when the root is given", async () => {
  const { vocabInWeft } = await import("./opencode-weft-find.mjs");
  const root = dir; // <root>/<task>/<agent>.turns.md
  const v = vocabInWeft({ task: "t", root });
  assert.ok(v.some((e) => typeof e === "object" && /jittered backoff/.test(e.text)), JSON.stringify(v));
  _resetForTests();
  const r = await findInWeftSemantic({ ask: "make the resend logic more patient", task: "t", root, embedFn: STUB, env: {} });
  assert.equal(r.via, "semantic");
});
