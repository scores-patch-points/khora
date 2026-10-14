// cli/tests/claude-code-shadow.test.mjs — nesting-fix J D4: a spiral verdict is not shadowed by stop_hook_active.
//
// Audit repro (J.md D4, scenario "gated"): turn 2 edits a file with no reasoning → Stop #1 blocks (the
// reason-gate's coverage gap) → the model runs reason.mjs, which retracts a premise (the dependent claim is
// SUSPENDED) → Stop #2 carries stop_hook_active=true and was SILENT, because every Stop gate passes an active
// stop. The spiral gate is thus shadowed in exactly the turn the reason-gate caused the reasoning run in.
// Driven through the REAL answerHook (real ledger, reason-gate, shape-gate and spiral scripts), isolated HOME.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "..");
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), "shadow-home-"));
const LEDGER = path.join(HOME, "led");
process.env.HOME = HOME;
process.env.EO_LEDGER_DIR = LEDGER;

const { spiralLayer, spiralEventsOf, pendingDecision, claimKey } = await import("../claude-code-spiral.mjs");
const { answerHook } = await import("../../claude-code-doorway.mjs");
const skip = spiralLayer.state === "present" ? false : `${spiralLayer.module} ${spiralLayer.reason}`;

const SRC = path.join(CLI, "claude-code-spiral.mjs");
const EDITED = "/nonexistent-eo-test/app.js"; // not an exempt root; the ledger only records that it was named
const tick = () => new Promise((r) => setTimeout(r, 12));
const imp = (id, mod, extra = {}) => ({ id, ground: SRC, rel: "imports", roles: { ARG0: "claude-code-spiral", ARG1: mod }, said: `claude-code-spiral imports ${mod}`, ...extra });
const dec = (id, name, extra = {}) => ({ id, ground: SRC, rel: "declares", roles: { ARG0: "claude-code-spiral", ARG1: name }, said: `claude-code-spiral declares ${name}`, ...extra });
// A model's reasoning run, as the hook stream sees it: the real reason.mjs, then the PostToolUse event for the Bash
// call carrying its real output (the ledger reads the run's verdict and grounds back from that).
const reason = async (session, claims) => {
  const r = spawnSync(process.execPath, [path.join(CLI, "reason.mjs"), "--json"], { input: JSON.stringify({ session, claims }), encoding: "utf8", env: { ...process.env, HOME, EO_LEDGER_DIR: LEDGER }, timeout: 110000 });
  await answerHook({ hook_event_name: "PostToolUse", session_id: session, tool_name: "Bash", tool_input: { command: `node ${path.join(CLI, "reason.mjs")} /tmp/spec.json --json` }, tool_response: { stdout: r.stdout } });
  return JSON.parse(r.stdout);
};
const prompt = (sid, text) => answerHook({ hook_event_name: "UserPromptSubmit", session_id: sid, prompt: text });
const edit = (sid) => answerHook({ hook_event_name: "PostToolUse", session_id: sid, tool_name: "Edit", tool_input: { file_path: EDITED, old_string: "a", new_string: "b" }, tool_response: { filePath: EDITED } });
const stop = (sid, active) => answerHook({ hook_event_name: "Stop", session_id: sid, stop_hook_active: active, last_assistant_message: "done" });
const parse = (a) => (a ? JSON.parse(a) : null);

// premise p (an import the code reader reads) and q (a declaration resting on it)
const p = imp("p", "spiral-layer");
const q = dec("q", "recordRun", { premises: ["p"] });

test("Stop #2 (stop_hook_active) still speaks a verdict the model's own run produced; Stop #3 does not repeat it", { skip }, async () => {
  const sid = "shadow-gated";
  await prompt(sid, "turn 1");
  const first = await reason(sid, [p, q]);
  assert.equal(first.janus.earned, 2, `both stand before turn 2: ${JSON.stringify(first.janus)}`);
  await tick();

  await prompt(sid, "turn 2: edit the file");
  await edit(sid);
  const stop1 = parse(await stop(sid, false));
  assert.equal(stop1?.decision, "block");
  assert.match(stop1.reason, /coverage gap/, "Stop #1 is the reason-gate's");
  assert.doesNotMatch(stop1.reason, /janus/);

  await tick();
  const second = await reason(sid, [{ ...p, polarity: "-" }]); // the model retracts p while answering the gate
  assert.ok(second.janus.moved.some((m) => m.standing === "suspended"), JSON.stringify(second.janus));

  const stop2 = parse(await stop(sid, true));
  assert.equal(stop2?.decision, "block", "an active stop no longer shadows the spiral");
  assert.match(stop2.reason, /now \*\*suspended\*\*/);
  assert.ok(stop2.reason.includes(claimKey(q)));

  assert.equal(await stop(sid, true), "", "delivered once: the next stop is silent");
  // a fresh, non-active stop starts the reason-gate over (the file is still uncovered) — but the janus verdict is not
  // said again by anyone.
  const stop4 = await stop(sid, false);
  assert.doesNotMatch(stop4, /janus/, "…and a non-active stop does not repeat it either");
});

test("a verdict produced when no Stop followed is carried to the next turn's Stop, once, and says it is from an earlier turn", { skip }, async () => {
  const sid = "shadow-carried";
  await prompt(sid, "turn 1");
  await reason(sid, [p, q]);
  await tick();
  await prompt(sid, "turn 2");
  await tick();
  const moved = await reason(sid, [{ ...p, polarity: "-" }]);
  assert.ok(moved.janus.moved.length);
  // the turn ends without a Stop gate hearing it (an interrupt) …
  await tick();
  await prompt(sid, "turn 3: something else entirely");
  await reason(sid, [{ ...p, polarity: "-" }]); // an unchanged restatement: this turn reasoned, and moved nothing itself
  const pend = fs.readFileSync(path.join(HOME, ".claude", "eo-reason", "pending", `${sid}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(pend.some((e) => e.kind === "verdict" && e.standing === "suspended"), "recordRun wrote it down when it was produced");
  const s = parse(await stop(sid, false));
  assert.equal(s?.decision, "block");
  assert.match(s.reason, /an earlier turn moved/);
  assert.equal(await stop(sid, false), "");
});

test("control: nothing moved → every Stop, active or not, stays silent", { skip }, async () => {
  const sid = "shadow-quiet";
  await prompt(sid, "turn 1");
  await reason(sid, [p, q]);
  await tick();
  await prompt(sid, "turn 2");
  await reason(sid, [p, q]); // an unchanged restatement
  assert.equal(await stop(sid, false), "");
  assert.equal(await stop(sid, true), "");
});

test("control: a pending verdict that is no longer true is retired as resolved, never spoken", { skip }, () => {
  const t1 = "2026-10-14T10:00:00.000Z", t2 = "2026-10-14T11:00:00.000Z";
  const sources = [{ verdict: "cited", file: SRC, line: 10 }, { verdict: "cited", file: SRC, line: 20 }];
  const run = (decl, extra = {}) => ({ declared: decl, inputClaims: decl.map((c) => ({ id: c.id, premises: c.premises })), sources, findings: [], ...extra });
  const P = { id: "p", ground: SRC, rel: "returns", roles: { ARG0: "parse", ARG1: "ast" }, polarity: "+", force: "default" };
  const Q = { id: "q", ground: SRC, rel: "is-safe-for", roles: { ARG0: "parse", ARG1: "input" }, polarity: "+", force: "default", premises: ["p"] };
  let log = spiralEventsOf([], run([P, Q]), { forWhom: "session:t", at: t1 });
  const suspended = spiralEventsOf(log, run([{ ...P, polarity: "-" }], {}), { forWhom: "session:t", at: t2 });
  const asVerdict = { kind: "verdict", key: "stale-key", id: claimKey(Q), standing: "suspended", because: ["p: withdrawn"], question: "?", at: t2, turnStart: t1 };
  // while suspended: delivered
  const live = pendingDecision([asVerdict], suspended, t2);
  assert.match(live.reason, /suspended/);
  assert.deepEqual(live.deliver.includes("stale-key"), true);
  // the claim stood supported again at this position (the unmoved log): resolved, silent
  const quiet = pendingDecision([asVerdict], log, t2);
  assert.equal(quiet.reason, null);
  assert.deepEqual(quiet.resolved, ["stale-key"]);
});
