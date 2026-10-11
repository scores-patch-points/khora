// sealed-agent/agent.mjs — THE SEALED AGENT LOOP (THE-ONE-TIME-TEACHER,
// wired): the opencode-shaped turn executed through the ladder.
//
//   rung 0/1 — hunt the compiled lessons first: the same ask (fingerprint:
//   ask + testCommand + workspace) with an unchanged ground and a green
//   re-execution is served with ZERO frontier calls. A failed replay or a
//   changed ground DEMOTES the lesson and the turn falls through. This is
//   "recall re-probes before shipping" — a lesson is served only by being
//   re-run, never by being remembered.
//   rung 3 — the frontier plans; tools execute locally and for real; every
//   tool result is sealed before it may ride back; when the plan ends, the
//   CALLER's test command (never model-authored, /v1/code's own invariant)
//   decides pass/fail; on green, the turn compiles a new lesson.
//
// The record is the floor: every turn appends one line to
// <workspace>/.sealed-agent/record.jsonl with the outcome, the frontier call
// count, the check, and the lesson id. Deleting a lesson changes nothing; the
// store rebuilds from the record's lessons.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createSealer, sha8 } from "./seal.mjs";
import { createAgentTools, toolDefs } from "./tools.mjs";
import { createSkillStore, fingerprintOf, groundOf, groundMatches } from "./skills.mjs";

export const RECORD_SCHEMA = "SealedAgentRecord@1";
export const DEFAULT_MAX_ROUNDS = Number(process.env.SEALED_AGENT_MAX_ROUNDS ?? 8);
export const TEST_TIMEOUT_MS = Number(process.env.SEALED_AGENT_TEST_TIMEOUT_MS ?? 300000);

const cancelled = () => Object.assign(new Error("cancelled"), { code: "ERR_CANCELLED" });

/** withAbort — the caller's stop must interrupt a hanging draw, not wait for
 *  it. The frontier planner and every tool call run under this. */
function withAbort(signal, promise) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(cancelled());
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(cancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => { signal.removeEventListener("abort", onAbort); resolve(v); },
      (e) => { signal.removeEventListener("abort", onAbort); reject(e); }
    );
  });
}

// The system half of every frontier turn. The register is the mouth's own:
// the caller's test command decides success; what the tool results do not
// say is a typed gap; addresses and proofs are the currency.
export const SYSTEM = [
  "You are the planning half of a sealed local agent. Your tools execute on this machine.",
  "You see the workspace only through tool results, which are sealed projections: each carries a permanent address (perm:path or bash:h), a sha256, a byte count, and a truncation mark when it was cut.",
  "Cite the addresses you use. Plan in tool calls; do not narrate work you did not do.",
  "The caller's test command decides pass/fail. You may propose changes that make it pass; you may not report its result yourself.",
  "No value, name, or date may be invented. If the tool results do not say, state the typed gap instead of filling it.",
  "Prefer the cheapest action that reads toward the ground: read before you write, a targeted bash before a broad one, and never re-fetch what a projection already carries.",
].join("\n");

/** createAgent({ workspace, planner, sealer = null, store = null, tools = null,
 *  maxRounds = DEFAULT_MAX_ROUNDS }) */
export function createAgent({ workspace, planner, sealer = null, store = null, tools = null, maxRounds = DEFAULT_MAX_ROUNDS } = {}) {
  if (!workspace) throw new TypeError("createAgent requires a workspace");
  if (!planner || typeof planner.plan !== "function") throw new TypeError("createAgent requires a planner (createPlanner, or a scripted stand-in)");
  fs.mkdirSync(workspace, { recursive: true });
  const auditPath = path.join(workspace, ".sealed-agent", "audit.jsonl");
  const recordPath = path.join(workspace, ".sealed-agent", "record.jsonl");
  const activeSealer = sealer ?? createSealer({ auditPath });
  const agentTools = tools ?? createAgentTools({ workspace });
  const skillStore = store ?? createSkillStore({ workspace });
  const defs = toolDefs();

  const record = (entry) => {
    fs.mkdirSync(path.dirname(recordPath), { recursive: true });
    fs.appendFileSync(recordPath, JSON.stringify({ schema: RECORD_SCHEMA, ts: new Date().toISOString(), ...entry }) + "\n");
  };

  /** runTestCommand — real, local, never model-authored. */
  async function runTestCommand(command, { timeoutMs = TEST_TIMEOUT_MS } = {}) {
    const t0 = Date.now();
    const shell = fs.existsSync("/bin/zsh") ? "/bin/zsh" : "/bin/sh";
    return new Promise((resolveP) => {
      const child = spawn(shell, ["-lc", command], { cwd: workspace, env: { ...process.env, SEALED_AGENT: "1" } });
      let out = "", dead = false;
      const timer = setTimeout(() => { dead = true; child.kill("SIGKILL"); }, timeoutMs);
      child.stdout.on("data", (d) => { if (!dead) out += String(d); });
      child.stderr.on("data", (d) => { if (!dead) out += String(d); });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolveP({ ok: code === 0, code, ms: Date.now() - t0, note: out.slice(0, 2000) });
      });
      child.on("error", (e) => { clearTimeout(timer); resolveP({ ok: false, code: null, ms: Date.now() - t0, note: e.message }); });
    });
  }

  /** replayLesson — a lesson is served only by being re-run: the steps are
   *  re-executed against the current workspace, then the caller's test
   *  command is re-executed. Nothing is remembered into standing. */
  async function replayLesson(lesson, { testCommand } = {}) {
    const g = groundMatches(lesson.ground, workspace);
    if (!g.ok) return { ok: false, reason: g.reason,
      result: { frontierCalls: 0, servedBy: "lesson", text: "" }, demote: true };
    for (const step of lesson.plan?.steps ?? []) {
      const fn = agentTools[step.tool];
      if (!fn) return { ok: false, reason: `replay: unknown step tool ${step.tool}`, demote: true, result: null };
      const out = await fn(step.input);
      if (!out.ok) return { ok: false, reason: `replay: step ${step.tool} failed: ${out.reason}`, demote: true, result: null };
    }
    if (testCommand || lesson.tests?.length) {
      const cmd = testCommand ?? lesson.tests[0];
      const check = await runTestCommand(cmd);
      if (!check.ok) {
        return { ok: false, reason: `replay: test command failed (code ${check.code})`, demote: true, result: { check } };
      }
      return { ok: true, result: { frontierCalls: 0, servedBy: "lesson", text: lesson.artifactText, check } };
    }
    return { ok: true, result: { frontierCalls: 0, servedBy: "lesson", text: lesson.artifactText } };
  }

  /** runTurn — one ask down the ladder. Returns { parts, outcome, servedBy,
   *  frontierCalls, skill, rounds }. When `onPart` is given, every part is
   *  emitted live as it is ready (tool stamps as they execute, the text when
   *  the plan ends, the check last) — the opencode-style streaming feed. */
  async function runTurn({ ask, testCommand = null, sessionId = "ses-agent", signal = null, skipField = false, onPart = null } = {}) {
    const t0 = Date.now();
    const fingerprint = fingerprintOf({ ask, testCommand, workspace });
    const activity = [];
    const steps = [];
    const emit = (part) => {
      activity.push(part);
      if (onPart) onPart(part);
    };
    const push = (tool, title, status = "done", input = null) => {
      const part = { type: "tool", tool, state: { status, title: String(title).slice(0, 120), input: compactInput(input) } };
      emit(part);
      if (input !== null) steps.push({ tool, input });
    };
    const compactInput = (input) => {
      if (input === null) return null;
      const s = JSON.stringify(input);
      return s.length > 400 ? s.slice(0, 400) + "…" : s;
    };

    // ── rung 0/1: the field first (hunt-first, zero draws where the lesson holds)
    if (!skipField) {
      const lesson = skillStore.find(fingerprint);
      if (lesson) {
        const rep = await replayLesson(lesson, { testCommand });
        if (rep.ok) {
          record({ sessionId, fingerprint, outcome: "lesson", servedBy: "lesson", frontierCalls: 0, rounds: 0, ms: Date.now() - t0, check: rep.result.check ?? null, skillId: lesson.fingerprint });
          emit({ type: "text", text: rep.result.text || "Resolved from the compiled lesson — 0 frontier calls." });
          push("lesson", `replayed (${lesson.plan?.steps?.length ?? 0} steps · 0 frontier calls)`);
          return {
            parts: activity,
            outcome: "lesson", servedBy: "lesson", frontierCalls: 0, skill: lesson, rounds: 0, lesson: true,
          };
        }
        if (rep.demote) {
          skillStore.demote(lesson.fingerprint, rep.reason);
          record({ sessionId, fingerprint, outcome: "lesson_demoted", servedBy: "lesson", frontierCalls: 0, ms: Date.now() - t0, reason: rep.reason, skillId: lesson.fingerprint });
          push("lesson", `lesson demoted: ${rep.reason}`, "failed");
        }
      }
    }

    // ── rung 3: the frontier loop
    if (signal?.aborted) throw Object.assign(new Error("cancelled"), { code: "ERR_CANCELLED" });
    const messages = [{ role: "user", content: String(ask ?? "") }];
    const touched = new Set();
    const writes = [];
    let rounds = 0, planCalls = 0, finalText = null, stopReason = null, usageTotal = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    for (; rounds < maxRounds; rounds++) {
      if (signal?.aborted) throw cancelled();
      planCalls++;
      const p = await withAbort(signal, planner.plan({ system: SYSTEM, messages, tools: defs, sessionId, workspace }));
      for (const k of ["input", "output", "cacheRead", "cacheWrite"]) usageTotal[k] += Number(p.usage?.[k] ?? 0);
      stopReason = p.stopReason;
      if (!p.toolCalls.length) { finalText = p.text; break; }

      const assistantBlocks = [];
      if (p.text) assistantBlocks.push({ type: "text", text: p.text });
      for (const call of p.toolCalls) assistantBlocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.input ?? {} });
      messages.push({ role: "assistant", content: assistantBlocks });

      for (const call of p.toolCalls) {
        if (signal?.aborted) throw cancelled();
        const fn = agentTools[call.name];
        if (!fn) {
          const bad = { ok: false, reason: `no such tool: ${call.name}` };
          messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(sealFail(call.name, bad.reason)) }] });
          push(call.name, `unknown tool ${call.name}`, "failed", call.input ?? {});
          continue;
        }
        let out;
        try { out = await withAbort(signal, fn(call.input ?? {})); } catch (e) { out = { ok: false, reason: String(e?.message ?? e) }; }
        const isFile = call.name === "read" || call.name === "write";
        if (isFile) touched.add(String(call.input?.path ?? ""));
        if (call.name === "write" && out.ok) writes.push(out.result.address);
        const proj = isFile && out.ok
          ? activeSealer.project({ kind: "file", address: out.result.address, content: out.result.content ?? "", bytes: out.result.bytes, meta: { offset: call.input?.offset ?? 0 } })
          : call.name === "bash" && out.ok
            ? activeSealer.project({ kind: "bash", address: `bash:${sha8(String(call.input?.command ?? "cmd"))}`, content: `${out.result.stdout ?? ""}\n${out.result.stderr ?? ""}`.trim(), bytes: -1, meta: { command: String(call.input?.command ?? "").slice(0, 200), code: out.result.code } })
            : activeSealer.project({ kind: "refusal", address: "refusal", content: out.reason ?? "tool failed" });
        messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(proj) }] });
        push(call.name, titleFor(call, out), out.ok ? "done" : "failed", call.input ?? {});
      }
    }
    if (finalText === null) finalText = `[rounds exhausted after ${maxRounds} rounds]`;

    const check = testCommand ? await runTestCommand(testCommand) : { ok: true, note: "no test command declared", code: null, ms: 0 };
    const outcome = check.ok ? "sealed" : "checks_failed";
    const lesson = check.ok
      ? skillStore.compile({
          ask, testCommand, workspace,
          steps, frontierCalls: planCalls, sessionId, checks: check,
          artifactText: finalText, touchedPaths: [...touched],
        })
      : null;
    record({
      sessionId, fingerprint, outcome, servedBy: "frontier", frontierCalls: planCalls, rounds, ms: Date.now() - t0,
      check: { cmd: testCommand ?? null, ok: check.ok, code: check.code ?? null, ms: check.ms ?? null },
      skillId: lesson?.fingerprint ?? null, stopReason, usage: usageTotal,
    });

    push("check", testCommand ? `${testCommand} — ${check.ok ? "pass" : `fail (code ${check.code ?? "?"})`} (${Math.round(check.ms)} ms)` : "no test command declared", check.ok ? "done" : "failed");
    emit({ type: "text", text: finalText });
    return {
      parts: activity,
      outcome, servedBy: "frontier", frontierCalls: planCalls, skill: lesson, rounds, lesson: null, check,
    };
  }

  function sealFail(tool, reason) {
    return activeSealer.project({ kind: "refusal", address: "refusal", content: reason ?? "tool refused" });
  }
  function titleFor(call, out) {
    if (call.name === "read") return `${call.name} ${call.input?.path ?? ""}`;
    if (call.name === "write") return `${call.name} ${call.input?.path ?? ""}`;
    if (call.name === "bash") return `${call.name} ${String(call.input?.command ?? "").slice(0, 60)}`;
    return String(call.name);
  }

  return {
    schema: "SealedAgentLoop@1",
    workspace, runTurn, record, runTestCommand, replayLesson, fingerprint: fingerprintOf,
    store: skillStore, tools: agentTools, sealer: activeSealer, defs,
  };
}

export const AGENT = {
  schema: "SealedAgentLoop@1",
  version: 1,
  create: createAgent,
  system: SYSTEM,
  describe: "the ladder, wired: field first, frontier only for a new class, caller's checks, lesson compiled on green, re-run to serve",
};