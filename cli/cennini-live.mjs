#!/usr/bin/env node
// cli/cennini-live.mjs — LIVE RUNS OF THE FOLD'S AGENT LOOP, RECORDED (2026-10-13).
//
// J7's marks (cli/cennini-contract.mjs) are met only on recorded LIVE runs. A live run here is the Fold's OWN loop
// (the-fold/fold-chat-agent.js runAgent, loaded, never copied) driven through a REAL door with a REAL model and a
// REAL observer: khora's documented `POST /v1/code` door (a physics-gated coding loop in a workspace) and the
// task's own declared test. It is not the browser surface and it does not use the heimdall bridge's access token
// (`/api/code` needs it, and this file never reads or sends it). Each recorded run names its surface so a
// node-driven run is never mistaken for the browser's.
//
//   node cli/cennini-live.mjs --out RUNS.jsonl [--base http://127.0.0.1:11436] [--rounds 2]
//   node cli/cennini-contract.mjs --runs RUNS.jsonl        # prints the evidence rows
//
// `live` is true ONLY when the door answered over the network. Any injected `fetchImpl` yields live:false, so a
// fixture can never count (test). The asks are tiny, each in its own scratch workspace; the contract marks judge
// the loop's behaviour, not the difficulty of the task. RUNS.jsonl must not be inside the khora repo.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { indexWorktree, look as lookAt } from "../native/organs/repo-look.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const AGENT_PATH = path.join(HERE, "..", "..", "the-fold", "fold-chat-agent.js");
export const SURFACE = "runAgent (the-fold/fold-chat-agent.js) with khora's repo-look stage over khora POST /v1/code, node-driven, node observer; not the browser surface";

export const ASKS = [
  { id: "add", task: "Implement add(a, b) in add.js so that `node test.js` passes. add.js must export the function with module.exports.", target: "add.js",
    files: { "add.js": 'module.exports = function add(a, b) { throw new Error("TODO: add"); };\n',
             "test.js": 'const add = require("./add.js");\nconst assert = require("node:assert");\nassert.strictEqual(add(2, 3), 5);\nassert.strictEqual(add(-1, 1), 0);\nconsole.log("ok");\n' } },
  { id: "even", task: "Implement isEven(n) in even.js so that `node test.js` passes. even.js must export the function with module.exports.", target: "even.js",
    files: { "even.js": 'module.exports = function isEven(n) { throw new Error("TODO: isEven"); };\n',
             "test.js": 'const isEven = require("./even.js");\nconst assert = require("node:assert");\nassert.strictEqual(isEven(4), true);\nassert.strictEqual(isEven(7), false);\nassert.strictEqual(isEven(0), true);\nconsole.log("ok");\n' } },
  { id: "reverse", task: "Implement reverse(s) in rev.js so that `node test.js` passes. rev.js must export the function with module.exports.", target: "rev.js",
    files: { "rev.js": 'module.exports = function reverse(s) { throw new Error("TODO: reverse"); };\n',
             "test.js": 'const reverse = require("./rev.js");\nconst assert = require("node:assert");\nassert.strictEqual(reverse("abc"), "cba");\nassert.strictEqual(reverse(""), "");\nconsole.log("ok");\n' } },
];

/** Files every workspace also holds, so the look has something to choose among (near-miss words on purpose:
 *  `addition` is not `add`, `reversed` is not `reverse`). They are never the target and never edited by an ask. */
export const DISTRACTORS = Object.freeze({
  "numbers.js": 'module.exports = { sum: (xs) => xs.reduce((a, b) => a + b, 0), addition: 1 };\n',
  "lists.js": 'module.exports = { first: (xs) => xs[0], reversed: (xs) => [...xs].reverse() };\n',
  "strings.js": 'module.exports = { upper: (s) => s.toUpperCase(), padded: (s) => s.padStart(8) };\n',
  "README.md": "# scratch workspace\n\nSmall helpers. Run `node test.js`.\n",
});

/** The look stage the loop is given: index the run's own workspace (a git worktree) and look for the ask. */
export function lookFor(workspace) {
  return async (task) => {
    const t0 = Date.now();
    const index = indexWorktree(workspace);
    if (index.gap) throw new Error(`cannot look: ${index.gap}`);
    return { ...lookAt({ index, ask: task }), ms: Date.now() - t0 };
  };
}

/** Adapt khora's /v1/code result to the door answer the loop expects. Pure. */
export function doorAnswerOf(result, { text, ms, sessionId = null, model = null }) {
  const rounds = Array.isArray(result?.rounds) ? result.rounds : [];
  return {
    sessionId, text: String(text ?? ""), ms, lane: "khora-code-loop", executed: true, model: result?.model ?? model,
    activity: rounds.map((r, i) => ({ tool: "code-loop", status: r?.passed === false || r?.ok === false ? "failed" : "done", title: `round ${i + 1}` })),
  };
}

/** The observer: run the task's own declared test in the workspace and report what happened. */
export function observerFor({ workspace, testCommand }) {
  return async () => {
    const r = spawnSync("sh", ["-c", testCommand], { cwd: workspace, encoding: "utf8", timeout: 30000 });
    const ok = r.status === 0;
    return { checks: [{ name: "the declared test", ok, detail: ok ? null : String((r.stderr || r.stdout || "").split("\n").find((l) => l.trim()) ?? `exit ${r.status}`).slice(0, 160) }] };
  };
}

/** One run: real loop, real door. `live` is false for any injected fetch. */
export async function liveRun({ ask, base = "http://127.0.0.1:11436", maxRounds = 2, timeoutMs = 170000, fetchImpl = null, runAgent, workspaceRoot = os.tmpdir() }) {
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync(workspaceRoot), `cennini-live-${ask.id}-`));
  for (const [f, body] of Object.entries({ ...DISTRACTORS, ...ask.files })) fs.writeFileSync(path.join(workspace, f), body);
  spawnSync("git", ["init", "-q"], { cwd: workspace }); // the look reads a worktree; no commit is needed
  const testCommand = "node test.js";
  const doFetch = fetchImpl ?? fetch;
  const dispatch = async (prompt, o = {}) => {
    const t0 = Date.now();
    const signal = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(o.signal ? [o.signal] : [])]);
    const r = await doFetch(`${base}/v1/code`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: prompt, workspace, testCommand, maxRounds }), signal });
    if (!r.ok) { const e = new Error(`the code door answered ${r.status}`); e.status = r.status; throw e; }
    const result = await r.json();
    return doorAnswerOf(result, { text: fs.readFileSync(path.join(workspace, ask.target), "utf8"), ms: Date.now() - t0, sessionId: "ses_" + ask.id });
  };
  const events = [];
  const out = await runAgent({ task: ask.task, dispatch, observe: observerFor({ workspace, testCommand }), look: lookFor(workspace), emit: (e) => events.push(e), maxRounds, slowAfterMs: 0 });
  return { run: `live-${ask.id}`, live: fetchImpl === null, surface: SURFACE, ok: !!out?.ok, rounds: out?.rounds?.length ?? 0, events };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const outFile = arg("--out");
  if (!outFile) { console.error("usage: node cli/cennini-live.mjs --out RUNS.jsonl [--base URL] [--rounds N]"); process.exit(2); }
  const repoRoot = path.resolve(HERE, "..");
  if (path.resolve(outFile).startsWith(repoRoot + path.sep)) { console.error("refusing to write run records inside the khora repo; use a scratchpad"); process.exit(2); }
  const { runAgent } = await import(pathToFileURL(AGENT_PATH).href);
  const base = arg("--base", "http://127.0.0.1:11436"), maxRounds = Number(arg("--rounds", "2"));
  const lines = [];
  for (const ask of ASKS) {
    let run;
    try { run = await liveRun({ ask, base, maxRounds, runAgent }); }
    catch (e) { run = { run: `live-${ask.id}`, live: false, surface: SURFACE, error: String(e?.message ?? e), events: [] }; }
    lines.push(JSON.stringify(run));
    console.error(`${run.run}: live=${run.live} ok=${run.ok ?? "-"} rounds=${run.rounds ?? "-"} events=${run.events.length}${run.error ? " error=" + run.error : ""}`);
  }
  fs.writeFileSync(outFile, lines.join("\n") + "\n");
}
