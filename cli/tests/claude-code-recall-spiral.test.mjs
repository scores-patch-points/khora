// cli/tests/claude-code-recall-spiral.test.mjs — nesting-fix J D3: a janus verdict reaches next turn's recall.
//
// Audit repro (J.md D3, BRANCH layout): two claims for a one-valued relation (`imports`); the spiral holds both
// against themselves (refuted / withdrawn: "defeated 2"). The next turn's recall printed
// "[single-witness · 1 grounded run(s)] claude-code-spiral imports node:path" — "Build on these". The test drives
// the REAL cli/reason.mjs (ledger + spiral) and then the REAL recall hook, in an isolated HOME and ledger.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "recall-spiral-home-"));
const LEDGER = path.join(HOME, "led");
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = LEDGER;

const { spiralLayer } = await import("../claude-code-spiral.mjs");
const { recallContextFor } = await import("../claude-code-recall.mjs");
const skip = spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}`;

const SRC = path.join(CLI, "claude-code-spiral.mjs");
const reason = (session, spec, env = {}) => spawnSync(process.execPath, [path.join(CLI, "reason.mjs"), "--json"], {
  input: JSON.stringify({ session, ...spec }), encoding: "utf8", env: { ...process.env, HOME, EO_LEDGER_DIR: LEDGER, ...env }, timeout: 110000,
});
const imp = (id, mod) => ({ id, ground: SRC, rel: "imports", roles: { ARG0: "claude-code-spiral", ARG1: mod }, said: `claude-code-spiral imports ${mod}` });
const PROMPT = "does claude-code-spiral import node:path or node:fs, and does it declare recordRun";
const lineFor = (ctx, object) => ctx.split("\n").find((l) => l.startsWith("- ") && l.endsWith(` ${object}`));

test("a claim janus refuted or withdrew is recalled as that, not as a single-witness claim to build on", { skip }, () => {
  const session = "d3-recall";
  // two claims only: recall's relevance filter returns every candidate when fewer than three are in scope.
  const r = reason(session, { declare: { functional: ["imports"] }, claims: [imp("a", "node:path"), imp("b", "node:fs")] });
  const out = JSON.parse(r.stdout);
  assert.equal(out.janus.defeated, 2, `the spiral defeated both imports: ${JSON.stringify(out.janus)}`);
  assert.equal(out.janus.earned, 0);

  const ctx = recallContextFor({ session_id: session, prompt: PROMPT });
  assert.ok(ctx, "recall injects");
  const fs_ = lineFor(ctx, "node:fs"), path_ = lineFor(ctx, "node:path");
  assert.match(fs_, /^- \[refuted · janus/, ctx);
  assert.match(path_, /^- \[withdrawn · janus/, ctx);
  assert.doesNotMatch(fs_, /\[single-witness/);
  assert.doesNotMatch(path_, /\[single-witness/);
  assert.match(fs_, /\| ledger: /, "the ledger's own standing rides behind the verdict, for reference");
  assert.match(ctx, /do not build on it/);
});

test("control: claims janus holds SUPPORTED read exactly as the ledger folds them, with no janus tag, and no legend line is added", { skip }, () => {
  const session = "d3-supported";
  const r = reason(session, { declare: { functional: ["imports"] }, claims: [imp("a", "node:path"),
    { id: "c", ground: SRC, rel: "declares", roles: { ARG0: "claude-code-spiral", ARG1: "recordRun" }, said: "claude-code-spiral declares recordRun" }] });
  assert.equal(JSON.parse(r.stdout).janus.earned, 2);
  const ctx = recallContextFor({ session_id: session, prompt: PROMPT });
  for (const needle of ["recordRun", "node:path"]) {
    const line = lineFor(ctx, needle);
    assert.ok(line, ctx);
    assert.doesNotMatch(line, /janus/);
    assert.match(line, /^- \[(single-witness|corroborated|ungrounded)/);
  }
  assert.doesNotMatch(ctx, /do not build on it/);
});

test("control: another session's recall is untouched by this session's verdicts", { skip }, () => {
  assert.equal(recallContextFor({ session_id: "d3-other", prompt: PROMPT }), null);
});

test("on a stack with no spiral, recall reads the ledger alone and does not pretend (layer absent: no janus tag)", () => {
  const session = "d3-absent";
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "janus-absent-"));
  reason(session, { declare: { functional: ["imports"] }, claims: [imp("a", "node:path"), imp("b", "node:fs")] }, { EO_JANUS_ROOT: empty });
  const r = spawnSync(process.execPath, [path.join(CLI, "claude-code-recall.mjs")], {
    input: JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: session, prompt: PROMPT }),
    encoding: "utf8", env: { ...process.env, HOME, EO_LEDGER_DIR: LEDGER, EO_JANUS_ROOT: empty },
  });
  assert.equal(r.status, 0);
  const ctx = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /claude-code-spiral imports node:path/);
  assert.doesNotMatch(ctx, /· janus/);
});
