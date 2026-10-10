// organs/code-pipeline.mjs — THE ROBUST CODING PIPELINE (2026-10-04).
//
// Penelope's one code-generation spine, composed as sub-agents. It does NOT
// re-derive a single organ: the code adapter (adapters/code.mjs) still owns
// reading/hunting/snipping/probing/testing; the engine's draw door still
// routes every mouth draw through Heimdall's channel. What is NEW is the
// COMPOSITION:
//
//   1. SWARM THE TASK  — model-free (khora /v1/swarm). The ask is framed
//      (literal/structural/adversarial) before a single unit is read, and the
//      swarm's pointed capacities route the composition. Unreachable swarm →
//      a disclosed gap, never a silent skip.
//   2. THE FIELD READS  — readUnits names the units and each one's spec.
//   3. SUB-AGENT FILL, in law order, CONCURRENTLY (mouth-last, hunt-first):
//        field  — autofill (the fold's own memory), per unit
//        hunt   — SNIP a real implementation by address (search + real fetch)
//        mouth  — parallel draws, one named sub-agent per unit; the small
//                 model draws ONLY the irreducible residue (never tools)
//   4. ESCALATION AT THE WALL — a unit that exhausts the local mouth spiral
//      escalates to a FRONTIER mouth (claude-*) through Heimdall's sealed-
//      external gate — the answer to "when do we ask a larger model": at the
//      wall, never first, disclosed (`by: escalation` + the local failures).
//      No frontier lane configured/reachable → the wall stands disclosed
//      (the fold's law: a wall is honest, never a fabricated pass).
//   5. THE GATE — the code adapter's assemble + testUnits (module import,
//      export surface, callability, spec-conformance) AND janus's reason
//      lint over the pass claim. The gate decides, never the draft.
//   6. THE RECORD — every sub-agent act, its source address, the escalation
//      events, the verdict and the scars, returned in full.
//
// Law: mouth-last, hunt-first, falsify-or-die, named gaps never invented,
// small models never handed tools, a frontier model is disclosed on every
// line it served.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

import codeAdapter from "./generation/adapters/code.mjs";
import { draw } from "./generation/engine.mjs";
import { lintGfp } from "../../janus/native/organs/reasoning-lint.js";
import { lintCodeGoal } from "../../khora/native/organs/code-goal-lint.js";
import { claimFromTriple } from "../../khora/native/kernel/gfp-claim.js";
import { parseDeclarations } from "../../khora/native/adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Heimdall's frontier gate — the ONE place a larger, non-local model may be
// asked. The bridge serves a frontier model only with the sealed-external
// privacy label; the pipeline always presents it, so a frontier model is never
// reached raw. The bridge (networking + security) owns the key.
export const HEIMDALL_CHANNEL = String(process.env.HEIMDALL_CHANNEL_URL ?? "http://127.0.0.1:8790").replace(/\/+$/, "");
export const KHORA_SWARM = String(process.env.KHORA_SWARM_URL ?? "http://127.0.0.1:11436/v1/swarm");
export const FRONTIER_MODEL = String(process.env.PENELOPE_FRONTIER_MODEL ?? "claude-sonnet-4-6").trim() || null;
// Whether a frontier lane is configured — the escalation's gate. It is still
// probed live at the wall; a configured lane that refuses is a disclosed
// refusal, never a fabricated pass.
export const FRONTIER_READY = !!FRONTIER_MODEL;

const LOCAL_ATTEMPTS = 4; // the local mouth's spiral (the engine's own cap)
const PARALLELISM_DEFAULT = 2; // concurrent mouth sub-agents

/** Run the model-free ant-swarm on the task. Returns the reading or a
 *  disclosed gap (the swarm must never gate the pipeline on its own). */
export async function swarmTask(task, { url = KHORA_SWARM, fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ force: true, name: "code-pipeline", texts: [{ name: "task", text: String(task ?? "") }] }),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) return { routed: false, gap: "swarm answered " + r.status };
    const j = await r.json().catch(() => null);
    if (!j) return { routed: false, gap: "swarm returned no json" };
    return {
      routed: !!j.routed,
      meaning: j.meaning ?? null,
      pointed: j.pointed ?? null,
      answer: j.answer ?? null,
      ants: Array.isArray(j.ants) ? j.ants.length : null,
    };
  } catch (e) {
    return { routed: false, gap: "swarm unreachable: " + String(e?.message ?? e).slice(0, 160) };
  }
}

/** One unit's fill, in law order: field → hunt → mouth. `ctx` carries the
 *  model and the adapter's own context. Returns the sub-agent's disposition. */
export async function fillUnit(unit, adapter, ctx = {}) {
  const field = adapter.autofill ? adapter.autofill(unit, ctx) : null;
  if (field) {
    return { unit: unit.name, agent: "field", code: field.code, address: field.address ?? null, source: "autofill-frame" };
  }
  if (adapter.hunt) {
    const hunted = await adapter.hunt(unit, ctx).catch(() => null);
    if (hunted) {
      return { unit: unit.name, agent: "hunt", code: hunted.code, address: hunted.url ?? null, source: "hunt-snip" };
    }
  }
  let atom = unit.spec;
  const attempts = [];
  for (let n = 0; n < LOCAL_ATTEMPTS; n += 1) {
    const fragment = adapter.mouthFragment(unit, atom, ctx);
    const out = await draw(fragment, {
      maxTokens: adapter.mouthTokens ?? 240,
      model: ctx.model ?? null,
      kind: "build",
      priority: "batch",
    });
    const fn = adapter.snip(String(out ?? ""), unit.name);
    const alone = fn && !String(fn).includes("this.") ? adapter.probeUnit(fn, unit, ctx) : { ok: false, detail: !fn ? "no function drawn" : "used `this`" };
    if (fn && alone.ok) {
      return { unit: unit.name, agent: "mouth", code: fn, address: null, source: "draw", attempts: attempts.length + 1, model: ctx.model ?? null };
    }
    const why = String(alone?.detail ?? "gated").slice(0, 160);
    attempts.push({ attempt: n + 1, why });
    atom = adapter.sharpen ? adapter.sharpen(unit, atom, why, ctx) : atom;
  }
  return { unit: unit.name, agent: "mouth", walled: true, attempts, source: "draw", model: ctx.model ?? null };
}

/** Run a bounded pool of concurrent fill sub-agents (one per unit). */
export async function fillParallel(units, adapter, ctx = {}, parallelism = PARALLELISM_DEFAULT) {
  const results = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < units.length) {
      const i = cursor;
      cursor += 1;
      results[i] = await fillUnit(units[i], adapter, ctx);
    }
  };
  const n = Math.max(1, Math.min(parallelism, units.length || 1));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

/** ESCALATION AT THE WALL: draw through Heimdall's sealed-external frontier
 *  gate. Only the irreducible residue is asked; the frontier model never
 *  receives tools and never sees the raw task outside the sealed label.
 *
 *  THE OFF-SYSTEM LAW (2026-10-04): what leaves this machine is DE-IDENTIFIED
 *  ONLY. The fragment is scrubbed before the send (real paths, usernames,
 *  emails, keys, hostnames → deterministic fakes) and the draw's returned code
 *  is RE-IDENTIFIED on the way back, so the real test gates the real code. The
 *  mapping is disclosed on the record, never hidden. */
export async function drawFrontier(prompt, model, { channel = HEIMDALL_CHANNEL, fetchImpl = fetch } = {}) {
  const scrubbed = deidentify(String(prompt ?? ""));
  const r = await fetchImpl(channel + "/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: scrubbed.text }],
      heimdall_privacy: "sealed-external",
      max_tokens: 2000,
      stream: false,
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) {
    let msg = "frontier " + r.status;
    try { msg = (await r.json())?.error?.message || (await r.json())?.error || msg; } catch {}
    throw new Error(String(msg).slice(0, 200));
  }
  const j = await r.json().catch(() => null);
  const text = j?.choices?.[0]?.message?.content ?? j?.content ?? null;
  if (typeof text !== "string" || !text.trim()) throw new Error("frontier returned no text");
  return { text: reidentify(text, scrubbed.map), deidentified: scrubbed.map };
}

/** DE-IDENTIFICATION: what leaves the machine is scrubbed of identifying
 *  tokens (real paths, usernames, emails, keys, hostnames) and carries FAKE
 *  data in their place — the user's law, 2026-10-04. Deterministic per call so
 *  a fake is stable across one turn; the mapping is disclosed, never hidden.
 *  Pure: { text, map } where map is { original: fake }. reidentify() reverses.
 *  The mapping is the audit record; the fakes are reversible ON-SYSTEM only. */
export function deidentify(text, seed = null) {
  const map = new Map();
  const os = require("node:os");
  const realUser = String(process.env.USER || os.userInfo().username || "anon");
  const fakeUser = "anon";
  const repl = (fake) => (m) => {
    if (!map.has(m)) map.set(m, typeof fake === "function" ? fake(m) : fake);
    return map.get(m);
  };
  let out = String(text ?? "");
  // Absolute home paths: /Users/mlacy/... → /Users/anon/... (and /home/<u>/).
  out = out.replace(/(?:\/Users\/|\/home\/)[A-Za-z0-9_.-]+(?=\/|$)/g, repl(m => `/Users/${fakeUser}`));
  // The real username anywhere it stands alone as an identifier.
  if (realUser && realUser !== fakeUser) {
    out = out.replace(new RegExp(`\\b${realUser.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), repl(fakeUser));
  }
  // Emails → anon@example.invalid.
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, repl("anon@example.invalid"));
  // API keys: sk-ant-…, sk-…, a long base64-ish run. Keyed by shape, faked by kind.
  out = out.replace(/(sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,})/g, repl(m => m.startsWith("sk-ant") ? "sk-ant-FAKE-KEY-FOR-OFF-SYSTEM" : m.startsWith("AIza") ? "AIzaFAKEKEYFORDEOFFSYSTEM" : "sk-FAKE-KEY-FOR-OFF-SYSTEM"));
  // IPv4 / localhost hostnames.
  out = out.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, repl("127.0.0.1"));
  return { text: out, map: [...map.entries()] };
}

/** RE-IDENTIFY: restore the real tokens on the way back from an off-system
 *  draw, so the machine gates the REAL code, never the fakes. A draw that
 *  echoes a fake back (the frontier learned the fake name) is restored. */
export function reidentify(text, map) {
  let out = String(text ?? "");
  // Restore the LONGEST fake first: a bare username fake is a substring of an
  // email fake, so the email must come back before the username or it is
  // half-restored (measured: anon@example.invalid → mlacy@example.invalid).
  const pairs = Array.isArray(map) ? [...map] : [];
  pairs.sort((a, b) => String(b[1] ?? "").length - String(a[1] ?? "").length);
  for (const [original, fake] of pairs) {
    out = out.split(String(fake)).join(String(original));
  }
  return out;
}

/** The escalation pass: every walled local unit is re-attempted by a frontier
 *  mouth on the SAME atom (never the same prompt — the wall's own failures are
 *  the atom). Disclosed on every event. When no frontier lane is configured
 *  or the gate refuses, the wall stands — never fabricated. */
export async function escalateWalled(walled, adapter, ctx = {}, opts = {}) {
  const model = opts.model === undefined ? FRONTIER_MODEL : opts.model;
  if (!model || !walled.length) return { attempted: false, outcomes: [] };
  const outcomes = [];
  for (const w of walled) {
    const unit = { name: w.unit, spec: (opts.units ?? []).find((u) => u.name === w.unit)?.spec ?? w.unit };
    const why = (w.attempts ?? []).map((a) => a.why).slice(-2).join(" · ");
    const fragment = adapter.mouthFragment(unit, `${unit.spec}\n\nLocal attempts failed for: ${why}`, ctx);
    try {
      // The off-system send is DE-IDENTIFIED (drawFrontier scrubs and, on the
      // way back, re-identifies the returned code so the real test gates the
      // real artifact). The mapping is disclosed with the outcome.
      const { text: raw, deidentified } = await drawFrontier(fragment, model, opts);
      const fn = adapter.snip(String(raw ?? ""), unit.name);
      const alone = fn && !String(fn).includes("this.") ? adapter.probeUnit(fn, unit, ctx) : { ok: false, detail: !fn ? "no function drawn" : "used `this`" };
      if (fn && alone.ok) {
        outcomes.push({ unit: unit.name, agent: "mouth-frontier", code: fn, address: null, source: "escalation", model, by: "escalation", localFailures: why, deidentified: deidentified ?? [] });
      } else {
        outcomes.push({ unit: unit.name, agent: "mouth-frontier", walled: true, source: "escalation", model, by: "escalation", why: String(alone?.detail ?? "gated").slice(0, 160) });
      }
    } catch (e) {
      outcomes.push({ unit: unit.name, agent: "mouth-frontier", refused: true, source: "escalation", model, why: String(e?.message ?? e).slice(0, 160) });
    }
  }
  return { attempted: true, model, outcomes };
}

/** The reason lint over the goal sheet and the pass claim — janus's core,
 *  never a parallel re-derivation. */
export function reasonLint({ goals = [], pass = null } = {}) {
  const findings = [];
  if (pass) {
    const goalFinding = lintCodeGoal({ goals, passClaim: pass });
    if (goalFinding) findings.push({ kind: goalFinding.kind, severity: goalFinding.severity, detail: goalFinding.detail });
  }
  const claim = pass ? claimFromTriple(pass.end1, pass.label ?? "returns", pass.end2, { ground: "module" }) : null;
  if (claim) {
    const deep = lintGfp([claim], {});
    for (const f of deep.findings) {
      if (findings.some((x) => x.kind === f.kind && x.detail === f.detail)) continue;
      findings.push({ kind: f.kind, severity: f.severity, detail: f.detail });
    }
  }
  return { ok: !findings.some((f) => f.severity === "error"), findings };
}

/** THE REAL TEST (GL-CD-11's measured gap, closed 2026-10-04): a module whose
 *  function raises on CALL passes the structural floor. When the caller hands
 *  a behavioral verification, the pipeline runs it for REAL (node child
 *  process importing the assembled module) — and a unit whose local draw fails
 *  it is a REAL wall, escalated to the frontier. The test decides meaning,
 *  never the probe. `verification.test` is a JS body receiving `__m` (the
 *  module namespace); it must throw on failure. Returns { ok, output }. */
export function runVerification(code, test, { fetchImpl = fetch, node = process.execPath } = {}) {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const { execFileSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "code-verify-"));
  try {
    const mod = path.join(dir, "module.mjs");
    const runner = path.join(dir, "runner.mjs");
    fs.writeFileSync(mod, String(code ?? ""), "utf8");
    fs.writeFileSync(runner, `import * as __m from ${JSON.stringify(pathToFileURL(mod).href)};\n${String(test ?? "")}\n`, "utf8");
    execFileSync(node, [runner], { encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: "" };
  } catch (e) {
    return { ok: false, output: String(e?.stderr || e?.stdout || e?.message || e).slice(0, 400) };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

/** THE UNITS OF AN ITERATION come from the PRIOR ARTIFACT, not a fresh draw —
 *  the machine reads the void from the artifact's own declarations (void-loop
 *  discipline), and the change request is the spec. A prior that declares no
 *  function falls back to the reading. Pure and mechanical. */
export function unitsFromPrior(prior, task) {
  const src = String(prior ?? "");
  if (!src.trim()) return [];
  const names = new Set();
  // The prior artifact may be JS or (a stray small-model draw) Python — parse
  // both shapes and union, so an iteration anchors to the artifact whatever
  // its language (measured 2026-10-04: a python `def greet` prior parsed by
  // the JS-only path found nothing and the change reinvented functions).
  for (const file of ["prior.mjs", "prior.py"]) {
    try {
      for (const d of parseDeclarations(src, file) ?? []) {
        if (d.kind === "function" && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(d.name)) names.add(d.name);
      }
    } catch { /* one shape failed — try the other */ }
  }
  return [...names].map((name) => ({ name, spec: `apply this change to the existing function: ${String(task ?? "")}` }));
}

/** THE ROBUST CODING PIPELINE. Returns the agentic record in full: the swarm
 *  reading, every sub-agent's disposition (field | hunt | mouth |
 *  mouth-frontier), the escalation events, the gate verdict, the scars. */
export async function composeCodePipeline({
  intent,
  model = "qwen2.5-coder:1.5b",
  artifact = "code",
  constraints = {},
  verification = {},
  context = {},
  parallelism = PARALLELISM_DEFAULT,
  frontierModel = FRONTIER_MODEL,
  swarm = swarmTask,
  fill = fillParallel,
  escalate = escalateWalled,
  lint = reasonLint,
  adapter = codeAdapter,
  channel = HEIMDALL_CHANNEL,
} = {}) {
  const task = String(intent ?? "").trim();
  if (!task) return { schema: "CodePipeline@1", ok: false, status: "gap", error: "coding intent is required" };
  const t0 = Date.now();

  // 0. ITERATION VIA THE RECORD (2026-10-04): when the caller carries a prior
  //    artifact (context.prior.code — the bridge's per-session store), this
  //    turn is a CHANGE, not a fresh build. The mouth draws against the prior
  //    code (it must keep every export the artifact already has and modify
  //    what the change names); the assembled artifact is the NEW version.
  const prior = String(context?.prior?.code ?? "").trim();
  const iterAdapter = prior
    ? { ...adapter, mouthFragment: (unit, atom, c) => `The CURRENT module you are modifying (keep every export it already has, change only what the request names):\n\`\`\`js\n${prior}\n\`\`\`\n\n${adapter.mouthFragment(unit, atom, c)}` }
    : adapter;

  // 1. SWARM THE TASK — model-free framing, disclosed. It never gates the
  //    pipeline; an unreachable swarm is a named gap, not a stop.
  const swarmReading = await swarm(task).catch((e) => ({ routed: false, gap: String(e?.message ?? e).slice(0, 160) }));

  // 2. THE FIELD READS — one draw names the units and each unit's own spec.
  //    ITERATION: the units come from the PRIOR ARTIFACT's own declarations
  //    (machine-read, never a fresh draw that invents new functions); the
  //    change request is the spec.
  let units = prior ? unitsFromPrior(prior, task) : [];
  let readGap = null;
  if (prior && !units.length) readGap = "the prior artifact declares no function to change";
  if (!units.length) {
    units = await iterAdapter.readUnits(task, { model, artifact, prior, ...context }).catch(() => []);
    readGap = readGap || (!units.length ? "the field read no units from this task" : null);
  }

  // 3. SUB-AGENT FILL — field → hunt → mouth, concurrently, mouth-last.
  const ctx = { model, artifact, prior, ...context, constraints, verification };
  let filled = await fill(units, iterAdapter, ctx, parallelism);
  const dispositions = () => filled.map((f) => ({ unit: f.unit, agent: f.agent, walled: !!f.walled, address: f.address ?? null, bytes: f.code ? Buffer.byteLength(f.code) : 0, model: f.model ?? null }));
  let walledUnits = filled.filter((f) => f.walled);

  // 4. ESCALATION AT THE WALL — a larger, non-local model is asked ONLY here.
  //    The wall is REAL: a unit whose LOCAL draw fails the caller's real
  //    behavioral test (verification.test) is a wall the structural probe
  //    could not see (GL-CD-11: a function that raises on CALL passes the
  //    floor). The wall's own output is the atom the frontier mouth draws
  //    against; the test decides again after the escalation.
  let escalated = [];
  const verify = (code) => (String(verification?.test ?? "").trim() ? runVerification(code, verification.test) : { ok: true, output: "" });
  // Assembly, REPLACEMENT semantics: a walled local unit whose unit an
  // escalation filled is EXCLUDED — the frontier body takes its place, never
  // sits beside it (measured 2026-10-04: appending both declared `median`
  // twice and the real test died with a SyntaxError, not a behavioral
  // verdict). A walled unit with no replacement is absent — the export-surface
  // gate then refuses honestly.
  let body = () => {
    const replaced = new Set(escalated.filter((e) => e.code).map((e) => e.unit));
    const kept = filled.filter((f) => f.code && !(f.walled && replaced.has(f.unit)));
    return [...kept, ...escalated.filter((e) => e.code)].map((f) => f.code).join("\n\n") + "\n";
  };
  let code = iterAdapter.assemble ? iterAdapter.assemble(body(), units, ctx) : body();
  let realTest = verify(code);
  if (!realTest.ok) {
    // THE REAL WALL: the caller's own test failed. The mouth-filled units are
    // the ones to escalate (the field and hunt bodies are held pieces). The
    // test's own output is the atom — never a fabricated reason.
    const localMouth = filled.filter((f) => f.agent === "mouth" && !f.walled);
    if (localMouth.length && FRONTIER_READY) {
      const walledForEscalation = localMouth.map((f) => ({ ...f, walled: true, attempts: [{ attempt: 1, why: "behavioral test failed: " + realTest.output.slice(0, 160) }] }));
      const esc = await escalate(walledForEscalation, iterAdapter, ctx, { model: frontierModel, units, channel });
      escalated = esc.outcomes ?? [];
      walledUnits = [...walledUnits, ...localMouth];
      filled = filled.map((f) => (localMouth.includes(f) ? { ...f, walled: true, behavioralWall: realTest.output.slice(0, 200) } : f));
      code = iterAdapter.assemble ? iterAdapter.assemble(body(), units, ctx) : body();
      realTest = verify(code);
    } else {
      // No local-mouth unit to escalate (the failure is a field/hunt body) or
      // no frontier lane: the test's failure stands disclosed, never fabricated.
    }
  }

  // 5. THE GATE — real test + reason lint. The gate decides, never the draft.
  const verdict = realTest.ok ? iterAdapter.testUnits(code, units, ctx) : { ok: false, reason: "behavioral-test", detail: realTest.output.slice(0, 200) };
  const pass = { end1: "module", label: "returns", end2: (units[0]?.name ?? "artifact") };
  const lintResult = lint({ goals: [], pass });
  const gateOk = verdict.ok === true && lintResult.ok;

  const outcomes = [
    ...filled.map((f) => ({ unit: f.unit, stage: f.agent, walled: !!f.walled, by: f.source, model: f.model ?? null, behavioralWall: f.behavioralWall ?? null })),
    ...escalated.map((e) => ({ unit: e.unit, stage: e.agent, walled: !!e.walled, by: e.source ?? "escalation", model: e.model ?? null, refused: !!e.refused, why: e.why ?? null })),
  ];

  const escalationAttempted = escalated.length > 0;
  return {
    schema: "CodePipeline@1",
    ok: gateOk,
    status: gateOk ? "verified" : "gate_unmet",
    intent: task,
    model,
    frontier: { model: escalationAttempted ? (escalated[0]?.model ?? frontierModel) : null, attempted: escalationAttempted },
    artifact: { kind: artifact, value: code },
    swarm: swarmReading,
    units: units.map((u) => ({ name: u.name, spec: u.spec })),
    readGap,
    subAgents: { dispositions: dispositions(), walled: walledUnits.length, escalated: escalationAttempted },
    evidence: { outcomes, verdict, scars: [] },
    verification: { ok: gateOk, verdict, lint: lintResult, behavioralTest: String(verification?.test ?? "").trim() ? { attempted: true, ok: realTest.ok, output: realTest.output.slice(0, 200) } : { attempted: false } },
    ms: Date.now() - t0,
  };
}

export default { composeCodePipeline, swarmTask, fillUnit, fillParallel, escalateWalled, drawFrontier, reasonLint };