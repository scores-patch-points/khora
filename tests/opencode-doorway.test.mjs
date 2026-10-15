import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-door-"));
const door = await import("../opencode-doorway.mjs");

const ev = (sessionID, type, data = {}) => door.answer({ event: "event", sessionID, type, data });
const turn = async (sessionID, ask, { tool = "read", ok = true, answer = "done", end = "session.execution.succeeded" } = {}) => {
  const ctx = await door.answer({ event: "context", sessionID, ask, model: { id: "m" } });
  await ev(sessionID, "session.step.started", { model: { id: "m" } });
  await ev(sessionID, "session.tool.input.started", { id: "t1", name: tool });
  await ev(sessionID, "session.tool.called", { id: "t1", input: "{}" });
  await ev(sessionID, ok ? "session.tool.success" : "session.tool.failed", { id: "t1" });
  await ev(sessionID, "session.text.ended", { text: answer });
  await ev(sessionID, "session.step.ended", { tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 900, write: 0 } }, cost: 0.01 });
  await ev(sessionID, end);
  return ctx;
};

test("a first ask gets no recall and is recorded as an instance", async () => {
  const ctx = await turn("s1", "Fix the failing parser test");
  assert.deepEqual(ctx, {});
  const m = door.meter();
  assert.equal(m.turns, 1);
  assert.equal(m.firstAsks.tokens, 1020);
  const row = JSON.parse(fs.readFileSync(path.join(process.env.FOLD_OPENCODE_STATE, "record.jsonl"), "utf8").trim());
  assert.equal(row.kind, "instance");
  assert.equal(row.settled, true);
});

test("the same ask again is recalled, and counted as a repeat", async () => {
  const ctx = await turn("s2", "  fix the FAILING parser test ", { answer: "again" });
  assert.match(ctx.system, /<fold-recall>/);
  assert.match(ctx.system, /read×1/);
  assert.match(ctx.system, /done/);
  const m = door.meter();
  assert.equal(m.repeatAsks.n, 1);
  assert.equal(m.repeatAsks.recalled, 1);
  assert.equal(m.classes, 1);
});

test("an unsettled turn is never recalled", async () => {
  await turn("s3", "Rename the module", { ok: false, answer: "broke" });
  const ctx = await door.answer({ event: "context", sessionID: "s4", ask: "rename the module" });
  assert.deepEqual(ctx, {});
});

test("unknown events and junk fail open", async () => {
  assert.deepEqual(await door.answer({ event: "nope" }), {});
  assert.deepEqual(await door.answer(null), {});
  assert.deepEqual(await door.answer({ event: "event", type: "session.step.ended", data: {} }), {});
});

test("a fold keeps what the ask needs and receivers the elisions", async () => {
  const lines = Array.from({ length: 400 }, (_, i) => `alpha beta gamma delta ${i}`)
  lines[200] = "the secret value is XLII"
  const body = lines.join("\n")
  const before = door.meter().savings
  const fold = await door.answer({ event: "fold", sessionID: "s9", ask: "what is the secret value", text: body, priceIn: 3 })
  assert.ok(fold.folded.length < body.length);
  assert.equal(fold.savedBytes, body.length - fold.folded.length);
  assert.match(fold.folded, /XLII/);
  assert.match(fold.folded, /\[fold: lines \d+–\d+ elided/);
  const after = door.meter().savings;
  assert.equal(after.folds, before.folds + 1);
  assert.equal(after.foldedChars, before.foldedChars + fold.savedBytes);
  assert.equal(after.savedTokensEst, Math.round(after.foldedChars / 4));
  assert.ok(after.savedUSD > before.savedUSD, "a priced fold moves the dollars");
  assert.equal(after.pricedFolds, before.pricedFolds + 1);
});

test("with no ask to steer by, the fold keeps the edges and says so", async () => {
  const body = Array.from({ length: 400 }, (_, i) => `line ${i} of the output`).join("\n")
  const fold = await door.answer({ event: "fold", sessionID: "s9", text: body });
  assert.ok(fold.folded.length < body.length);
  assert.match(fold.folded, /\[fold: \d+ chars between this head and the tail/);
});

test("a title is derived from the ask, by rule, with its estimate ledgered", async () => {
  const ask = "Fix the failing parser test please"
  const before = door.meter().savings;
  const title = await door.answer({ event: "title", sessionID: "s9", ask, priceIn: 3 });
  assert.equal(title.title, ask);
  const after = door.meter().savings;
  assert.equal(after.titleTokensEst, before.titleTokensEst + Math.ceil(ask.length / 4) + 150);
  assert.equal(after.pricedTitles, before.pricedTitles + 1);
});

test("a fold with nothing to save answers nothing", async () => {
  assert.deepEqual(await door.answer({ event: "fold", sessionID: "s9", text: "short output" }), {});
  assert.deepEqual(await door.answer({ event: "fold", sessionID: "s9", text: "" }), {});
});

test("a turn's record carries what its folds kept out of the frontier", async () => {
  const body = Array.from({ length: 400 }, (_, i) => `record row ${i} of a longer output`).join("\n");
  const sessionID = "s10";
  await door.answer({ event: "context", sessionID, ask: "fold me a big thing" });
  const fold = await door.answer({ event: "fold", sessionID, text: body });
  await ev(sessionID, "session.step.started", { model: { id: "m" } });
  await ev(sessionID, "session.text.ended", { text: "folded" });
  await ev(sessionID, "session.step.ended", { tokens: { input: 10, output: 2 }, cost: 0 });
  await ev(sessionID, "session.execution.succeeded");
  const rows = fs.readFileSync(path.join(process.env.FOLD_OPENCODE_STATE, "record.jsonl"), "utf8").trim().split("\n");
  const row = JSON.parse(rows.at(-1));
  assert.equal(row.folded, fold.savedBytes);
});

test("route answers the door and declines other paths", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/meter" }, sink), true);
  assert.equal(JSON.parse(sink.body).turns, 4);
  assert.equal(await door.route({ method: "GET", url: "/v1/models" }, sink), false);
});
