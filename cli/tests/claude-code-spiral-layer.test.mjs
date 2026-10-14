// cli/tests/claude-code-spiral-layer.test.mjs — nesting-fix J D1: janus's spiral organs are an optional layer.
// On the merged stack (janus origin/main) reasoning-spiral.js and consequence-verdict.js do not exist; the wiring
// used to import them unconditionally (reason.mjs printed "janus: not recorded (Cannot find module …)" under an
// OK, the Stop script exited 1 and the doorway swallowed it). Absence is now a TYPED state, reported by
// reason.mjs's result and logged by the doorway on the reason ledger. A present spiral behaves as before (the
// control, skipped with its reason when this checkout has no janus spiral).
//
// Layout under test: EO_JANUS_ROOT (default: the sibling ../../janus). "Absent" is an empty root, which is exactly
// what janus@39b705e looks like to this wiring; "present" is the real sibling/EO_JANUS_ROOT the suite was given.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "spiral-layer-home-"));
const LEDGER = path.join(HOME, "ledger");
const REALROOT = process.env.EO_JANUS_ROOT ?? null; // what the suite was given, before any test overrides it
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = LEDGER;

const { probeSpiral } = await import("../spiral-layer.mjs");
const real = await probeSpiral();
const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "janus-absent-"));

const childEnv = (root) => ({ ...process.env, HOME, EO_LEDGER_DIR: LEDGER, ...(root === undefined ? (REALROOT ? { EO_JANUS_ROOT: REALROOT } : {}) : { EO_JANUS_ROOT: root }) });
const reasonOn = (root, session, flags = ["--json"]) => spawnSync(process.execPath, [path.join(CLI, "reason.mjs"), ...flags], {
  input: JSON.stringify({ session, claims: [{ id: "c1", ground: path.join(CLI, "claude-code-spiral.mjs"), rel: "imports", roles: { ARG0: "claude-code-spiral", ARG1: "spiral-layer" }, said: "claude-code-spiral imports probeSpiral from spiral-layer" }] }),
  encoding: "utf8", env: childEnv(root), timeout: 110000,
});
const ledgerLines = () => {
  const f = path.join(LEDGER, "eoreader7-reasoning:1.jsonl");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const errorsLog = () => { try { return fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "errors.log"), "utf8"); } catch { return ""; } };

test("an absent spiral is a typed 'spiral-absent' naming the module, in reason.mjs's result — and the lint verdict stands", () => {
  const r = reasonOn(emptyRoot, "layer-absent-json");
  const out = JSON.parse(r.stdout);
  assert.equal(r.status, 0, "reason.mjs exits as it always did: the lint verdict is khora's alone");
  assert.equal(out.ok, true);
  assert.equal(out.janus.state, "spiral-absent");
  assert.equal(out.janus.module, "reasoning-spiral.js");
  assert.equal(out.janus.reason, "module-not-found");
  assert.deepEqual(out.janus.missing.map((m) => m.module ?? m), ["reasoning-spiral.js", "consequence-verdict.js"]);
  assert.equal(out.janus.error, undefined, "not an 'error' string under an OK");
  assert.equal(out.janus.recorded, false);
  assert.ok(!fs.existsSync(path.join(HOME, ".claude", "eo-reason", "spiral", "layer-absent-json.jsonl")), "nothing was written to a spiral that is not there");
});

test("the printed result says spiral-absent, in plain and --compact modes, never 'not recorded (Cannot find module'", () => {
  for (const flags of [[], ["--compact"]]) {
    const r = reasonOn(emptyRoot, `layer-absent-${flags[0] ?? "plain"}`, flags);
    assert.match(r.stdout, /janus: spiral-absent: reasoning-spiral\.js — module-not-found/);
    assert.doesNotMatch(r.stdout, /Cannot find module/);
    assert.match(r.stdout, /No janus verdict exists for this run/);
  }
});

test("the spiral Stop script on an absent layer exits 0 with a typed error-log line, not exit 1", () => {
  const r = spawnSync(process.execPath, [path.join(CLI, "claude-code-spiral.mjs")], {
    input: JSON.stringify({ hook_event_name: "Stop", session_id: "layer-stop", stop_hook_active: false }),
    encoding: "utf8", env: childEnv(emptyRoot),
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  assert.match(errorsLog(), /claude-code-spiral: SpiralAbsent: spiral-absent: reasoning-spiral\.js/);
});

test("the doorway logs the absence on the reason ledger once per session, and answers without blocking", async () => {
  const { answerHook, runReason } = await import("../../claude-code-doorway.mjs");
  const prev = process.env.EO_JANUS_ROOT;
  process.env.EO_JANUS_ROOT = emptyRoot;
  try {
    const logged = [];
    const ev = { hook_event_name: "Stop", session_id: "layer-door", stop_hook_active: false, cwd: HERE };
    const a1 = await answerHook(ev, { log: (m) => logged.push(m) });
    await answerHook(ev, { log: (m) => logged.push(m) });
    assert.doesNotMatch(a1, /"decision":"block".*spiral-absent/);
    const lines = ledgerLines().filter((l) => l.kind === "layer-absent" && l.session === "layer-door");
    assert.equal(lines.length, 1, "one typed line, not one per Stop");
    assert.equal(lines[0].state, "spiral-absent");
    assert.equal(lines[0].module, "reasoning-spiral.js");
    assert.equal(lines[0].reason, "module-not-found");
    assert.ok(logged.some((m) => /spiral-absent: reasoning-spiral\.js/.test(m)));
    assert.ok(!logged.some((m) => /claude-code-spiral\.mjs exited/.test(m)), "no longer an exited-1 skip");

    // /v1/reason: same record, no session.
    const r = await runReason(JSON.stringify({ claims: [] }), ["--json"], HERE);
    assert.equal(r.status, 200);
    assert.ok(ledgerLines().some((l) => l.kind === "layer-absent" && l.session === null));
  } finally { if (prev === undefined) delete process.env.EO_JANUS_ROOT; else process.env.EO_JANUS_ROOT = prev; }
});

test("which module is absent is typed per module: consequence-verdict missing, or exporting nothing; control: both present", async () => {
  // A fresh root per case: Node's ESM loader caches a module by URL, so a rewritten file at one path is not re-read.
  const mk = (verdictSource) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "janus-partial-"));
    const organs = path.join(root, "native", "organs");
    fs.mkdirSync(organs, { recursive: true });
    fs.writeFileSync(path.join(organs, "reasoning-spiral.js"), "export const appendReasoning = (l) => l; export const reasoningAt = () => ({ claims: [] });\n");
    if (verdictSource) fs.writeFileSync(path.join(organs, "consequence-verdict.js"), verdictSource);
    return root;
  };
  const prev = process.env.EO_JANUS_ROOT;
  const roots = [];
  const probe = async (root) => { roots.push(root); process.env.EO_JANUS_ROOT = root; return probeSpiral(); };
  try {
    const a = await probe(mk(null));
    assert.equal(a.state, "spiral-absent");
    assert.equal(a.module, "consequence-verdict.js");
    assert.equal(a.reason, "module-not-found");

    const b = await probe(mk("export const somethingElse = 1;\n"));
    assert.equal(b.state, "spiral-absent");
    assert.equal(b.module, "consequence-verdict.js");
    assert.equal(b.reason, "export-missing");

    const c = await probe(mk("export const consequenceVerdict = () => ({ earned: [], withheld: [], defeated: [] });\n"));
    assert.equal(c.state, "present", "control: a root with both modules and their exports is present");
  } finally { if (prev === undefined) delete process.env.EO_JANUS_ROOT; else process.env.EO_JANUS_ROOT = prev; for (const r of roots) fs.rmSync(r, { recursive: true, force: true }); }
});

test("control: a present spiral still records the run and writes no layer-absent line", { skip: real.state === "present" ? false : `spiral-absent on this layout (${real.module}); the control needs janus@0d07b65 or later` }, () => {
  const r = reasonOn(undefined, "layer-present");
  const out = JSON.parse(r.stdout);
  assert.equal(out.janus.state, "present");
  assert.equal(out.janus.error, undefined);
  assert.equal(out.janus.earned + out.janus.withheld + out.janus.defeated, 1);
  assert.ok(!ledgerLines().some((l) => l.kind === "layer-absent" && l.session === "layer-present"));
});
