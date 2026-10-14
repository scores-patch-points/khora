// cli/tests/claude-code-session-route.test.mjs — nesting-fix J D9/D10: the session address survives the plugin's
// own route, and steer's auto-derive can cover an edit and fails with a typed outcome.
//
// Audit repros (J.md D9, D10): /v1/reason spawned reason.mjs with the PROXY's environment, so a plugin-routed run
// was on no session's spiral and its ledger lines said session:null; steer's auto-derive spec carried no session,
// and its `text` (the claim's own sentence) switched on the prose reader — ~11 s (past the 8 s spawn budget) and,
// even given the time, the verdict "unread", which coverageOf never counts as a pass.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..");
const ROOT = path.join(CLI, "..");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "route-home-"));
const LEDGER = path.join(HOME, "led");
// a proxy started from inside some OTHER Claude Code session: the inherited id must not leak onto the route
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = LEDGER;
process.env.CLAUDE_CODE_SESSION_ID = "the-proxys-own-session";

const { runReason, route, sessionOf } = await import("../../claude-code-doorway.mjs");
const { spiralLayer } = await import("../claude-code-spiral.mjs");
const { exempt } = await import("../claude-code-state.mjs");

const SRC = path.join(CLI, "claude-code-spiral.mjs");
const spec = (extra = {}) => JSON.stringify({ claims: [{ id: "c1", ground: SRC, rel: "declares", roles: { ARG0: "claude-code-spiral", ARG1: "recordRun" }, said: "claude-code-spiral declares recordRun" }], ...extra });
const ledgerLines = () => {
  const f = path.join(LEDGER, "eoreader7-reasoning:1.jsonl");
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};
const claimLines = () => ledgerLines().filter((l) => l.kind === "reasoning-claim");

test("sessionOf accepts a session id and refuses anything else", () => {
  assert.equal(sessionOf("b58008db-1c2d-4e5f-8a9b-0123456789ab"), "b58008db-1c2d-4e5f-8a9b-0123456789ab");
  assert.equal(sessionOf(undefined), null);
  assert.equal(sessionOf("../../etc/passwd"), null);
  assert.equal(sessionOf("a b"), null);
});

test("/v1/reason records the run on the CALLER's session — ledger line and spiral — not the proxy's", async () => {
  const sid = "route-sess-1";
  const r = await runReason(spec(), ["--json"], ROOT, { session: sid });
  assert.equal(r.status, 200);
  const out = JSON.parse(r.body);
  const mine = claimLines().filter((l) => l.session === sid);
  assert.equal(mine.length, 1, `the claim line carries the caller's session: ${JSON.stringify(claimLines().map((l) => l.session))}`);
  assert.ok(!claimLines().some((l) => l.session === "the-proxys-own-session"), "the proxy's inherited session id never attributes a run");
  if (spiralLayer.state === "present") {
    assert.equal(out.janus.state, "present");
    assert.ok(fs.existsSync(path.join(HOME, ".claude", "eo-reason", "spiral", `${sid}.jsonl`)));
  } else assert.equal(out.janus.state, "spiral-absent");
});

test("control: with no session on the route the run is on none — typed, and still not the proxy's", async () => {
  const r = await runReason(spec(), ["--json"], ROOT, {});
  const out = JSON.parse(r.body);
  assert.equal(out.janus.state, "no-session");
  assert.equal(out.janus.recorded, false);
  const nulls = claimLines().filter((l) => l.session === null);
  assert.ok(nulls.length >= 1);
  assert.ok(!claimLines().some((l) => l.session === "the-proxys-own-session"));
});

test("the HTTP door reads x-er7-session", async () => {
  const server = http.createServer((req, res) => { route(req, res).then((handled) => { if (!handled) { res.writeHead(404); res.end(); } }); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  try {
    const call = (headers) => new Promise((resolve, reject) => {
      const rq = http.request({ host: "127.0.0.1", port, path: "/v1/reason", method: "POST", headers: { "x-er7-reason-flags": "--json", "x-er7-cwd": ROOT, ...headers } }, (res) => {
        let b = ""; res.on("data", (d) => { b += d; }); res.on("end", () => resolve(JSON.parse(b)));
      });
      rq.on("error", reject); rq.end(spec());
    });
    const out = await call({ "x-er7-session": "route-http-1" });
    assert.ok(claimLines().some((l) => l.session === "route-http-1"));
    assert.notEqual(out.janus.state, "no-session");
    const bare = await call({});
    assert.equal(bare.janus.state, "no-session");
  } finally { server.close(); }
});

test("the eo-reason bin sends x-er7-session from its Bash environment, and sends none when there is none", async () => {
  const seen = [];
  const server = http.createServer((req, res) => { seen.push(req.headers); req.resume(); req.on("end", () => { res.writeHead(200, { "x-er7-exit": "0" }); res.end("ok\n"); }); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const specFile = path.join(HOME, "spec.json"); fs.writeFileSync(specFile, spec());
  const run = (env) => new Promise((resolve) => {
    const e = { ...process.env, ER7_URL: `http://127.0.0.1:${port}`, ...env };
    if (!env.CLAUDE_CODE_SESSION_ID) delete e.CLAUDE_CODE_SESSION_ID;
    const c = spawn("sh", [path.join(ROOT, "claude-code", "bin", "eo-reason"), specFile, "--json"], { env: e });
    c.on("close", (code) => resolve(code));
  });
  try {
    assert.equal(await run({ CLAUDE_CODE_SESSION_ID: "bin-sess-9" }), 0);
    assert.equal(seen.at(-1)["x-er7-session"], "bin-sess-9");
    assert.equal(await run({}), 0);
    assert.equal(seen.at(-1)["x-er7-session"], undefined, "control: no session in the environment, no header");
  } finally { server.close(); }
});

const STEER = path.join(CLI, "claude-code-steer.mjs");
const editEv = (sid, oldS, newS) => JSON.stringify({ hook_event_name: "PreToolUse", session_id: sid, tool_name: "Edit", cwd: ROOT, tool_input: { file_path: SRC, old_string: oldS, new_string: newS } });
const steer = (sid, oldS, newS, env = {}) => spawnSync(process.execPath, [STEER], { input: editEv(sid, oldS, newS), encoding: "utf8", env: { ...process.env, HOME, EO_LEDGER_DIR: LEDGER, ...env }, timeout: 60000 });
const errorsLog = () => { try { return fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "errors.log"), "utf8"); } catch { return ""; } };
const skipExempt = exempt(SRC) ? "the checkout sits under an exempt root; steer would not gate the edit" : false;

test("steer auto-derive covers a clean one-token edit (it could not: `text` made the verdict 'unread'), on the caller's session", { skip: skipExempt }, () => {
  const sid = "steer-derive-1";
  const r = steer(sid, 'const FALSIFY_KIND = /falsif|strict|ant_/;', 'const FALSIFY_KIND = /falsif|strict|ant_x/;');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "", `the edit is allowed, no denial: ${r.stdout.slice(0, 300)}`);
  const mine = claimLines().filter((l) => l.session === sid);
  assert.equal(mine.length, 1, "the derived claim reached the session's ledger");
  assert.equal(mine[0].source, "claim-deriver");
});

test("steer auto-derive fails with a TYPED outcome when reason.mjs does not finish: steer-timeout, named in the denial and on the error log", { skip: skipExempt }, () => {
  const r = steer("steer-derive-timeout", "const a = 1;", "const a = 2;", { EO_STEER_DERIVE_TIMEOUT_MS: "20" });
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, "deny");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /steer-timeout/);
  assert.match(errorsLog(), /claude-code-steer: steer-timeout/);
});

test("control: an edit that is not one clean token is still denied for hand-authoring, as before", { skip: skipExempt }, () => {
  const r = steer("steer-derive-ctl", "const a = 1; const b = 2;", "const a = 5; const b = 6;");
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, "deny");
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /could not auto-derive/);
});
