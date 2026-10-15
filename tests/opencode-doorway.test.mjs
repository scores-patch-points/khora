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

test("the retired line fold answers nothing, so an older client folds nothing", async () => {
  const body = Array.from({ length: 400 }, (_, i) => `alpha beta gamma ${i}`).join("\n");
  assert.deepEqual(await door.answer({ event: "fold", sessionID: "s9", ask: "alpha", text: body }), {});
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

const houdiniPresent = fs.existsSync(path.resolve(import.meta.dirname, "..", "the-fold-houdini-wired", "fold-chat-houdini.js")) || Boolean(process.env.FOLD_HOUDINI_PATH);

const exchanges = [
  { id: "m1", q: "Fix the pagination bug in the invoices list", a: "Fixed the off-by-one in invoices/list.js page offset.", files: ["invoices/list.js"], chars: 9000 },
  { id: "m2", q: "Add a retry to the webhook sender", a: "Added exponential retry in webhooks/send.js.", files: ["webhooks/send.js"], chars: 7000 },
  { id: "m3", q: "Rename the config loader", a: "Renamed loadConfig to readConfig.", files: ["config.js"], chars: 4000 },
  { id: "m4", q: "Update the README badges", a: "Updated.", files: ["README.md"], chars: 800 },
  { id: "m5", q: "Bump the version", a: "Bumped to 1.2.0.", files: ["package.json"], chars: 600 },
];

test("context projects the history by need (Houdini): older exchanges become a record, the last few ride", { skip: !houdiniPresent && "Houdini is not on disk" }, async () => {
  const before = door.meter().savings;
  const out = await door.answer({ event: "context", sessionID: "s11", ask: "does the webhook retry back off for the invoices endpoint too?", exchanges, priceIn: 3 });
  assert.ok(out.project, `no projection: ${JSON.stringify(out)}`);
  assert.deepEqual(out.project.keep.sort(), ["m4", "m5"]);
  assert.deepEqual(out.project.drop.sort(), ["m1", "m2", "m3"]);
  assert.match(out.project.record, /ON RECORD/);
  assert.match(out.project.record, /webhook sender/);
  assert.equal(out.project.droppedChars, 9000 + 7000 + 4000);
  const after = door.meter().savings;
  assert.equal(after.projections, before.projections + 1);
  assert.equal(after.projectedChars, before.projectedChars + 20000);
  assert.ok(after.savedUSD > before.savedUSD, "a priced projection moves the dollars");
});

test("a failed turn that bears on the ask is pinned: its failure rides the record, not silently lost", { skip: !houdiniPresent && "Houdini is not on disk" }, async () => {
  const ex = exchanges.map((e) => (e.id === "m3" ? { ...e, failed: 2 } : e));
  const out = await door.answer({ event: "context", sessionID: "s12", ask: "did the config loader rename finish?", exchanges: ex });
  assert.match(out.project.record, /NOT supported by that material: 2 tool calls failed/);
});

test("with no history the door sends no projection, and says nothing it cannot back", async () => {
  const out = await door.answer({ event: "context", sessionID: "s13", ask: "hello there", exchanges: [] });
  assert.equal(out.project, undefined);
});

test("context looks at the workspace (Look): the first ask starts the index, the next is answered with addresses", async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "oc-look-"));
  fs.mkdirSync(path.join(repo, "billing"));
  fs.writeFileSync(path.join(repo, "billing", "invoice.js"), "export function renderInvoice(total) {\n  return total;\n}\n");
  fs.writeFileSync(path.join(repo, "other.js"), "export const unrelated = 1;\n");
  const { execFileSync } = await import("node:child_process");
  execFileSync("git", ["-C", repo, "init", "-q"]);
  const ask = "where is renderInvoice defined";
  let out = await door.answer({ event: "context", sessionID: "s14", ask, workspace: repo });
  for (let i = 0; i < 40 && !out.look; i++) {
    await new Promise((r) => setTimeout(r, 250));
    out = await door.answer({ event: "context", sessionID: "s14", ask, workspace: repo });
  }
  assert.match(out.look, /<fold-look>/);
  assert.match(out.look, /billing\/invoice\.js/);
  assert.doesNotMatch(out.look, /other\.js/);
  const { shutdown } = await import("../opencode-context.mjs");
  shutdown();
});

test("route answers the door and declines other paths", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/meter" }, sink), true);
  assert.ok(JSON.parse(sink.body).turns >= 3);
  assert.equal(await door.route({ method: "GET", url: "/v1/models" }, sink), false);
});
