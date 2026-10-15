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

test("route answers the door and declines other paths", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/meter" }, sink), true);
  assert.equal(JSON.parse(sink.body).turns, 3);
  assert.equal(await door.route({ method: "GET", url: "/v1/models" }, sink), false);
});
