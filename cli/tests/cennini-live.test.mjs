// cli/tests/cennini-live.test.mjs — the live-run driver: pure adapters, the observer, and "a fake door is never live".
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ASKS, AGENT_PATH, DISTRACTORS, doorAnswerOf, observerFor, lookFor, liveRun, SURFACE } from "../cennini-live.mjs";
import { judgeRun } from "../cennini-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = () => fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "live-test-"));
const haveAgent = fs.existsSync(AGENT_PATH);

test("doorAnswerOf adapts khora's /v1/code result to the door answer the loop expects", () => {
  const a = doorAnswerOf({ done: true, rounds: [{ passed: false }, { passed: true }], model: "gemma2:2b" }, { text: "x", ms: 12, sessionId: "s" });
  assert.equal(a.text, "x");
  assert.equal(a.lane, "khora-code-loop");
  assert.equal(a.model, "gemma2:2b");
  assert.deepEqual(a.activity.map((x) => x.status), ["failed", "done"]);
});

test("the observer runs the declared test and reports what happened, never an opinion", async () => {
  const dir = tmp();
  try {
    fs.writeFileSync(path.join(dir, "t.js"), "process.exit(Number(process.env.X ?? 0));\n");
    const ok = await observerFor({ workspace: dir, testCommand: "node t.js" })();
    assert.equal(ok.checks[0].ok, true);
    fs.writeFileSync(path.join(dir, "t.js"), 'console.error("boom: add is not implemented"); process.exit(1);\n');
    const bad = await observerFor({ workspace: dir, testCommand: "node t.js" })();
    assert.equal(bad.checks[0].ok, false);
    assert.match(bad.checks[0].detail, /boom/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("every ask ships a stub that FAILS its own test (a task already solved would teach nothing)", async () => {
  for (const ask of ASKS) {
    const dir = tmp();
    try {
      for (const [f, b] of Object.entries(ask.files)) fs.writeFileSync(path.join(dir, f), b);
      const o = await observerFor({ workspace: dir, testCommand: "node test.js" })();
      assert.equal(o.checks[0].ok, false, `${ask.id} stub must fail`);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("A FAKE DOOR IS NEVER LIVE: a run through an injected fetch is live:false, so a fixture cannot count", { skip: !haveAgent && "the-fold is not beside khora" }, async () => {
  const { runAgent } = await import(pathToFileURL(AGENT_PATH).href);
  const root = tmp();
  try {
    const ask = ASKS[0];
    const fetchImpl = async (_url, init) => {
      const { workspace } = JSON.parse(init.body);
      fs.writeFileSync(path.join(workspace, ask.target), "function add(a, b) {\n  return a + b;\n}\nmodule.exports = add;\n");
      return { ok: true, status: 200, json: async () => ({ done: true, rounds: [{ passed: true }], model: "fake" }) };
    };
    const run = await liveRun({ ask, fetchImpl, runAgent, workspaceRoot: root });
    assert.equal(run.live, false);
    assert.equal(run.surface, SURFACE);
    assert.equal(run.ok, true);
    const types = run.events.map((e) => e.type);
    assert.ok(types.includes("plan") && types.includes("act") && types.includes("check") && types.at(-1) === "done");
    assert.ok(types.indexOf("look") > types.indexOf("plan") && types.indexOf("look") < types.indexOf("act"), "the run LOOKS at the workspace before it acts");
    const look = run.events.find((e) => e.type === "look");
    assert.equal(look.top[0].path, ASKS[0].target, "the ask names add.js, so the look puts it first");
    assert.ok(look.candidates > 1, "and it was chosen among the distractor files, not alone");
    const j = judgeRun(run.events);
    assert.equal(j["looks-first"].ok, true);
    assert.equal(j["plan-first"].ok, true);
    assert.equal(j["observes-and-stops-by-measure"].ok, true);
    assert.equal(j["stays-local"].ok, true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the driver never touches the heimdall access token and writes nothing inside the repo", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "cennini-live.mjs"), "utf8");
  assert.doesNotMatch(src, /x-heimdall-token|heimdall\/state|\.heimdall|HEIMDALL_TOKEN/i);
  assert.match(src, /refusing to write run records inside the khora repo/);
});

test("the workspace is a real choice: distractors with near-miss words are present, and the target is not the only candidate", async () => {
  assert.ok(Object.keys(DISTRACTORS).length >= 4);
  const dir = tmp();
  try {
    const { spawnSync } = await import("node:child_process");
    for (const [f, b] of Object.entries({ ...DISTRACTORS, ...ASKS[0].files })) fs.writeFileSync(path.join(dir, f), b);
    spawnSync("git", ["init", "-q"], { cwd: dir });
    const l = await lookFor(dir)("Implement add(a, b) in add.js so that `node test.js` passes");
    assert.equal(l.candidates[0].path, "add.js");
    assert.equal(l.candidates[0].named, true);
    const addition = l.candidates.find((c) => c.path === "numbers.js");
    assert.ok(!addition || addition.matches.every((m) => m.word !== "add"), "`addition` is not the whole word `add`");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
