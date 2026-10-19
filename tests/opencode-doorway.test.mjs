import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.FOLD_OPENCODE_STATE = fs.mkdtempSync(path.join(os.tmpdir(), "oc-door-"));
process.env.FOLD_WORKNOTES_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "oc-wn-"));
// Never read the operator's live memory surface: an ask like "rename the
// module" bears on whatever real entries exist that day, and a test that
// passes or fails with the operator's week is not a test.
process.env.FOLD_USER_MEMORY = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "oc-mem-")), "user-memory.md");
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
  assert.ok(!ctx.system, "a first ask must carry no recall (the standing openness note is not a recall)");
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
  assert.ok(!ctx.system, "an unsettled turn must not be recalled (the standing openness note is not a recall)");
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

test("the surf cut is ledgered: the chars a cut keeps out of a request are recorded, and priced", async () => {
  const before = door.meter().savings;
  await door.answer({
    event: "surf",
    sessionID: "s20",
    ask: "does the webhook retry back off for the invoices endpoint too?",
    turns: [{ n: 1, ask: "add a retry to the webhook sender", answer: "added exponential retry", grounds: ["edit"] }],
    keptOutChars: 12000,
    priceIn: 3,
  });
  const after = door.meter().savings;
  assert.equal(after.projections, before.projections + 1);
  assert.equal(after.projectedChars, before.projectedChars + 12000);
  assert.equal(after.projectedTokensEst, Math.round(after.projectedChars / 4));
  assert.equal(after.pricedProjections, before.pricedProjections + 1);
  assert.ok(after.savedUSD > before.savedUSD, "a priced surf cut moves the dollars");
});

test("a surf cut with nothing kept out does not move the ledger", async () => {
  const before = door.meter().savings;
  await door.answer({ event: "surf", sessionID: "s21", ask: "hello", turns: [], keptOutChars: 0 });
  assert.equal(door.meter().savings.projectedChars, before.projectedChars);
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

test("swarm deploys the registry, records the finding, and the next ask surfaces it", async () => {
  const material = "The council voted 6-3 to approve the budget. The mayor vetoed it. The council overrode the veto 7-2.";
  const r = await door.answer({ event: "swarm", sessionID: "s30", agent: "s30", task: "s30", ask: "what does this material hold", text: material });
  assert.equal(r.ok, true);
  assert.equal(r.mode, "all"); // the tool always deploys the whole registry
  assert.ok(["converged", "unresolved", "gap"].includes(r.standing));
  assert.equal(typeof r.reading, "string");
  assert.equal(typeof r.holes, "string");
  // The finding enters the task's medium as a swarm fact mark (asserted, never a witness).
  const { read } = await import("../opencode-worknotes.mjs");
  const marks = read({ task: "s30" }).marks.filter((m) => m.agent === "swarm" && m.kind === "fact");
  assert.equal(marks.length, 1);
  assert.match(marks[0].text, /^swarm\(/);
  // The next ask whose words bear on the finding carries it, mechanically.
  const ctx = await door.answer({ event: "context", sessionID: "s30", task: "s30", ask: "what did the swarm measure about the budget veto material" });
  assert.match(ctx.swarm, /<fold-swarm measured="1">/);
  assert.match(ctx.swarm, /swarm\(/);
  // An ask whose words do not bear on it gets no swarm note.
  const off = await door.answer({ event: "context", sessionID: "s30", task: "s30", ask: "unrelated question about quantum chromodynamics" });
  assert.equal(off.swarm, undefined);
});

test("an unnamed pointing still deploys: the swarm tool never gaps on the ask's phrasing", async () => {
  const r = await door.answer({ event: "swarm", sessionID: "s31", agent: "s31", task: "s31", ask: "what", text: "one plain sentence." });
  assert.equal(r.ok, true);
  assert.notEqual(r.mode, "gap"); // a bare "what" must not spuriously point at the `what` row alone
});

test("swarm reads any-modality material through the senses: a text file is its own ground", async () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "oc-swarm-")), "material.txt");
  fs.writeFileSync(f, "The council voted 6-3 to approve the budget.\n");
  const r = await door.answer({ event: "swarm", sessionID: "s32", agent: "s32", task: "s32", ask: "what holds", path: f });
  assert.equal(r.ok, true);
  assert.equal(r.modality, "text/plain");
  assert.equal(r.giver, "utf8-passthrough");
});

test("the sense hunt is inspectable and partitions the registry", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/senses" }, sink), true);
  const o = JSON.parse(sink.body);
  assert.equal(o.schema, "SenseSwarm@1");
  assert.ok(Array.isArray(o.hunt.found) && Array.isArray(o.hunt.missing));
});

test("route answers the door and declines other paths", async () => {
  const sink = { status: null, body: null, writeHead(s) { this.status = s; }, end(b) { this.body = b; } };
  assert.equal(await door.route({ method: "GET", url: "/v1/hooks/opencode/meter" }, sink), true);
  assert.ok(JSON.parse(sink.body).turns >= 3);
  assert.equal(await door.route({ method: "GET", url: "/v1/models" }, sink), false);
});
