#!/usr/bin/env node
// cli/cennini-ladder.mjs — ONE DRAW, GRADED AT EACH RUNG (2026-10-13). The assembled run, at the door's own grain.
//
// The first assembled run (cli/cennini-assemble.mjs) gated the door on a stub marker with one round and switched repair
// off; 9 of 12 draws made no edit. That measured the harness. This driver gives the door what it normally gets — the
// task's own real test (`node test.mjs`) — and asks it for ONE draw. The door reverts what fails, so the draw is
// reconstructed from the answer the door returns (`rounds[0].raw`) and graded at each rung, on the SAME bytes:
//
//   A  DOOR     the door alone: the file as the door left it, then the real test (the door reverts failures, so A passes
//               only when the door's own gates accepted a passing attempt)
//   R  RECEIVE  the draw's attempt as a receiver would have taken it: the door's grammar (parseProposal) first, then
//               organs/lenient-receive.js for the ADD-only shape the grammar refuses. R is A plus a mechanical receiver.
//   F  FINISH   R's attempt completed by organs/follow-through.js (the imports its calls need, from files the session holds)
//   C  CONTROL  the same attempt completed against a WRONG world (another ask's helpers): if C also passes, F proved nothing
//
// Everything past A is offline arithmetic on one draw, so there is no draw-to-draw noise between rungs. What the ladder
// does NOT measure: whether a second round would have recovered what a rung recovers (the door's own repair loop is the
// door's business; run with --rounds 3 and read `door.rounds` and A for that), and whether this is Claude-Code-level work
// (the panel is synthetic and does not count toward the exam's CHANGE-whole).
//
//   node cli/cennini-ladder.mjs --out RUNS.json [--base http://127.0.0.1:11436] [--reps 2] [--only id,id] [--rounds 1] [--signed]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PANEL, filesOf, complete, missingNames, runTest, readWorld } from "./cennini-assemble.mjs";
import { receive } from "../native/organs/lenient-receive.js";
import { indexWorktree, look as lookAt } from "../native/organs/repo-look.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SURFACE = "khora POST /v1/code (its own real test, one draw) + native/organs lenient-receive + follow-through, node-driven";
const RAW_KEPT = 1500;

const loadParse = async () => (await import("../native/the-fold/code-loop.js")).parseProposal;

/**
 * attemptOf({ raw, before, file, parse, target, onDisk, done }) -> { attempt, via, gap }
 * The first draw's attempt, as bytes. The door's own result wins when it accepted something; otherwise the door's
 * grammar reads the answer, then the lenient receiver; a refusal is a typed gap, never an invented attempt.
 */
export function attemptOf({ raw, before, file, parse, target, onDisk = null, done = false }) {
  if (done && onDisk !== null && onDisk !== before) return { attempt: onDisk, via: "door", gap: null };
  const p = parse(raw, { impliedPath: target });
  if (p.ok) {
    if (p.action !== "INS") return { attempt: null, via: null, gap: "read-not-patch" };
    const n = p.find ? before.split(p.find).length - 1 : 0;
    if (n !== 1) return { attempt: null, via: null, gap: n === 0 ? "find-unlocated" : "find-ambiguous" };
    return { attempt: before.replace(p.find, () => p.add), via: "door-grammar", gap: null };
  }
  const r = receive({ text: raw, before, file });
  return r.ok ? { attempt: r.after, via: "add-only", gap: null } : { attempt: null, via: null, gap: r.gap.kind };
}

/** One ladder run on a fresh workspace. `fetchImpl` null = the real door; any injected fetch makes `live` false. */
export async function ladderRun({ ask, rep = 1, base = "http://127.0.0.1:11436", timeoutMs = 280000, maxRounds = 1, signed = false, fetchImpl = null, parse = null, workspaceRoot = os.tmpdir(), wrongWorld = null }) {
  const parseFn = parse ?? await loadParse();
  const workspace = fs.mkdtempSync(path.join(fs.realpathSync(workspaceRoot), `cennini-lad-${ask.id}-`));
  try {
    for (const [f, body] of Object.entries(filesOf(ask, { signed }))) fs.writeFileSync(path.join(workspace, f), body);
    spawnSync("git", ["init", "-q"], { cwd: workspace });
    const abs = path.join(workspace, ask.target);
    const before = fs.readFileSync(abs, "utf8");

    // LOOK
    const idx = indexWorktree(workspace);
    const lk = idx.gap ? { candidates: [] } : lookAt({ index: idx, ask: ask.task });
    const looked = { candidates: lk.candidates.length, top: lk.candidates[0]?.path ?? null, found: lk.candidates.slice(0, 3).some((c) => c.path === ask.target) };

    // DOOR, under its own real test
    const t0 = Date.now();
    let door = { ok: false, ms: 0, done: false, rounds: 0, error: null, served: null }, answer = { raw: "", gap: null };
    try {
      const r = await (fetchImpl ?? fetch)(`${base}/v1/code`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: ask.task, workspace, testCommand: "node test.mjs", maxRounds }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!r.ok) throw new Error(`the code door answered ${r.status}`);
      const j = await r.json();
      const first = (j.rounds ?? [])[0] ?? {};
      answer = { raw: String(first.raw ?? ""), gap: first.gap?.kind ?? null };
      door = { ok: true, ms: Date.now() - t0, done: j.done === true, rounds: (j.rounds ?? []).length, error: null, served: j.served ?? null };
    } catch (e) { door = { ok: false, ms: Date.now() - t0, done: false, rounds: 0, error: String(e?.message ?? e).slice(0, 160), served: null }; }

    const onDisk = fs.readFileSync(abs, "utf8");
    const A = runTest(workspace);
    const world = readWorld(workspace, ask.target);
    const got = door.ok ? attemptOf({ raw: answer.raw, before, file: abs, parse: parseFn, target: ask.target, onDisk, done: door.done }) : { attempt: null, via: null, gap: "door-failed" };

    let R = null, F = null, C = null;
    if (got.attempt !== null) {
      fs.writeFileSync(abs, got.attempt);
      R = { ...runTest(workspace), via: got.via };
      const f = complete({ before, after: got.attempt, file: abs, world });
      fs.writeFileSync(abs, f.completed);
      F = { ...runTest(workspace), proposals: f.proposals, gaps: f.gaps, reread: f.reread, changed: f.changed };
      const wr = wrongWorld ?? [{ path: path.join(workspace, "other.mjs"), text: "export function nothing() {\n  return 0;\n}\n" }];
      const c = complete({ before, after: got.attempt, file: abs, world: wr });
      fs.writeFileSync(abs, c.completed);
      C = { ...runTest(workspace), proposals: c.proposals, changed: c.changed };
    }
    return {
      ask: ask.id, rep, live: fetchImpl === null, surface: SURFACE, control: !!ask.control, needs: ask.needs, maxRounds, signed,
      looked, door, answer: { gap: answer.gap, bytes: answer.raw.length, raw: answer.raw.slice(0, RAW_KEPT) },
      attempt: { made: got.attempt !== null, via: got.via, lost: got.gap },
      needsBound: got.attempt !== null && ask.needs.length ? ask.needs.every((n) => !missingNames(got.attempt, ask.target).includes(n)) : null,
      A, R, F, C,
    };
  } finally { fs.rmSync(workspace, { recursive: true, force: true }); }
}

/** descriptive counts over records: pass per rung, what each rung won, what each rung cost, what was lost and why. */
export function summarize(records) {
  const live = records.filter((r) => r.live && r.door.ok);
  const count = (rs, f) => rs.filter(f).length;
  const rungs = (rs) => ({
    n: rs.length,
    attempt: count(rs, (r) => r.attempt.made),
    A: count(rs, (r) => r.A.pass), R: count(rs, (r) => r.R?.pass), F: count(rs, (r) => r.F?.pass),
    wonByReceive: count(rs, (r) => !r.A.pass && r.R?.pass),
    wonByFinish: count(rs, (r) => r.R && !r.R.pass && r.F?.pass),
    harmedByReceive: count(rs, (r) => r.A.pass && r.R && !r.R.pass),
    harmedByFinish: count(rs, (r) => r.R?.pass && r.F && !r.F.pass),
    C_wouldFix: count(rs, (r) => r.R && !r.R.pass && r.C?.pass),
  });
  const lost = {};
  for (const r of live.filter((x) => !x.attempt.made)) lost[r.attempt.lost] = (lost[r.attempt.lost] ?? 0) + 1;
  const via = {};
  for (const r of live.filter((x) => x.attempt.made)) via[r.attempt.via] = (via[r.attempt.via] ?? 0) + 1;
  return {
    runs: records.length, live: records.filter((r) => r.live).length, doorFailed: records.filter((r) => !r.door.ok).length,
    all: rungs(live), needsHelper: rungs(live.filter((r) => !r.control)), control: rungs(live.filter((r) => r.control)),
    via, lost, lookFoundTarget: count(live, (r) => r.looked.found),
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const out = arg("--out");
  if (!out) { console.error("usage: node cli/cennini-ladder.mjs --out RUNS.json [--base URL] [--reps N] [--only id,id] [--rounds N]"); process.exit(2); }
  if (path.resolve(out).startsWith(path.resolve(HERE, "..") + path.sep)) { console.error("refusing to write run records inside the khora repo"); process.exit(2); }
  const only = arg("--only") ? new Set(arg("--only").split(",")) : null;
  const reps = Number(arg("--reps", "2")), base = arg("--base", "http://127.0.0.1:11436"), maxRounds = Number(arg("--rounds", "1"));
  const signed = process.argv.includes("--signed");
  const parse = await loadParse();
  const records = [];
  const flush = () => fs.writeFileSync(out, JSON.stringify({ surface: SURFACE, maxRounds, summary: summarize(records), records }, null, 1));
  for (let rep = 1; rep <= reps; rep++) for (const ask of PANEL) {
    if (only && !only.has(ask.id)) continue;
    const r = await ladderRun({ ask, rep, base, maxRounds, signed, parse });
    records.push(r);
    const g = (x) => (x === null ? "—" : x.pass ? "pass" : "FAIL");
    console.error(`${r.ask}#${rep}: door ${r.door.ok ? `ok ${r.door.ms}ms done=${r.door.done}` : "FAILED " + r.door.error} | draw ${r.attempt.made ? r.attempt.via : "LOST " + r.attempt.lost} | A ${g(r.A)} R ${g(r.R)} F ${g(r.F)} C ${g(r.C)} | finish ${r.F?.proposals.map((p) => p.kind + ":" + p.name).join(",") || "none"}`);
    flush();
  }
  console.error(JSON.stringify(summarize(records)));
}
