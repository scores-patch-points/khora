// opencode-lane.test.mjs — the falsifying controls for the lane pass
// (opencode-lane.mjs). Each test names the control from the module header; a
// green here is a claim the control would break.
import test from "node:test";
import assert from "node:assert/strict";
import { laneFor, lanePass, laneBlock, groundingFor, warm } from "./opencode-lane.mjs";

// The parser is a 16 MB one-time load; warm it once so the assertions measure
// the lane, not the load.
test.before(async () => {
  await warm();
});

test("FALSIFIER: a non-English ask reports grounding structural-only, never full", async () => {
  const info = await laneFor({ ask: "¿qué es la justicia?" });
  assert.equal(info.language, "spa", "the language leg reads the ask's own language");
  assert.equal(info.grounding, "structural-only", "claim binding passes only for eng — spa must be structural-only");
  const block = laneBlock(info);
  assert.match(block, /grounding="structural-only"/);
  assert.doesNotMatch(block, /grounding="full"/, "a non-English ask must never be advertised as full grounding");
});

test("groundingFor: eng is full, every other language is structural-only, unread is unknown", () => {
  assert.equal(groundingFor("eng"), "full");
  assert.equal(groundingFor("spa"), "structural-only");
  assert.equal(groundingFor("cmn"), "structural-only");
  assert.equal(groundingFor(null), "unknown");
});

test("FALSIFIER: a mechanical ask is settled at zero tokens and the block carries it", async () => {
  const info = await laneFor({ ask: "what is 17 times 24" });
  assert.equal(info.lane, "mechanical", "the shared mechanism list must settle arithmetic");
  assert.equal(info.observation?.text, "408", "the computed value rides the lane, never a model draw");
  assert.match(laneBlock(info), /settled: 408/);
});

test("FALSIFIER: a demand is typed imperative and its block forbids asserting past a span", async () => {
  const info = await laneFor({ ask: "write me an essay" });
  assert.equal(info.demand, true, "an imperative is a demand, read structurally — never from a word list");
  assert.ok(info.intents.includes("imperative"), `expected imperative, got ${JSON.stringify(info.intents)}`);
  const block = laneBlock(info);
  assert.match(block, /shape: a demand \(imperative\)/);
  assert.match(block, /\[voice\] or a holding, never a world fact/);
});

test("FALSIFIER: the intent-reader no longer reads every ask as a question (the optional-class bug)", async () => {
  // `/[?]?/` matched the empty string, so readIntent returned "question" for
  // everything. The regression control: a plain imperative is imperative, and a
  // real question is still a question.
  const demand = await laneFor({ ask: "tell me a story about the sea" });
  assert.ok(demand.intents.includes("imperative"), `a story demand must read imperative, got ${JSON.stringify(demand.intents)}`);
  assert.ok(!demand.intents.includes("question"), "a demand with no question mark must not read as a question");
  const question = await laneFor({ ask: "what is the capital of France?" });
  assert.ok(question.intents.includes("question"), `a question mark must still read question, got ${JSON.stringify(question.intents)}`);
});

test("FALSIFIER: the register lane's block cites II.9 (the gate wiring is live)", async () => {
  const info = await laneFor({ ask: "hello there" });
  assert.equal(info.lane, "register");
  assert.match(laneBlock(info), /never reason to a fact \(II\.9\)/);
});

test("FALSIFIER: an empty ask yields no block (the empty guard)", async () => {
  const info = await laneFor({ ask: "   " });
  assert.equal(info.ok, false);
  assert.equal(info.gap, "empty-ask");
  assert.equal(laneBlock(info), null);
});

test("FALSIFIER: a budget-exceeded call returns a typed gap and never throws", async () => {
  // The parser and mechanisms are warmed (test.before), so a -1 ms budget must
  // lose the race and surface a typed gap without throwing.
  const res = await lanePass({ ask: "write me an essay", budgetMs: 0 });
  assert.equal(res.ok, false, "a zero budget must lose the race");
  assert.equal(typeof res.gap, "string");
  assert.equal(res.block, null);
});

// THE ISTHMUS: a lane whose mechanisms failed to load says so on every verdict, never an empty list read as "nothing to settle".
test("Isthmus: the lane carries a mechanisms gap, and the block shows it", async () => {
  const { laneFor, laneBlock } = await import("./opencode-lane.mjs");
  const info = await laneFor({ ask: "What is 17 times 24?" });
  assert.ok("mechanismsGap" in info, "FALSIFIER: the lane has no field for a failed mechanism load");
  if (info.mechanismsGap === null) assert.equal(info.lane, "mechanical");
  const block = laneBlock({ ...info, lane: "register", mechanismsGap: "the mechanisms did not load (ERR_MODULE_NOT_FOUND)" });
  assert.match(block, /mechanisms: GAP/);
});
