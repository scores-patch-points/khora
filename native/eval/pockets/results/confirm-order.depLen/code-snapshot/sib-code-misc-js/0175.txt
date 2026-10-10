// organs/code-fix.mjs — the generate→test loop over the REAL spine
// (2026-10-04). Penelope owns the loop; the draw, the gate, and the lint are
// the system's own organs, never a parallel re-derivation:
//
//   draw   — engine.draw → generation-door → the MOUTH (:11439) → the bridge
//            (:11434), which runs the AntiStrauss gate, the host picker and
//            the upstream lanes. A draft is reason-linted and surfaced before
//            it is ever returned.
//   gate   — the code adapter's assemble + testUnits (module import, export
//            surface, callability, spec-conformance) and/or an external gate
//            script (`node <gate> <module>`), the same strict falsifier shape
//            as the improvement-task evals. The gate decides, never the
//            draft's plausibility.
//   lint   — janus's lintGfp (the reason core, code-safe identities) and the
//            khora's code-goal-lint (typed findings: contested_claim ·
//            expired_obligation · standing_contradiction · support_cycle).
//            A failed draft becomes a typed finding; the finding's atom IS
//            the sharpened instruction for the next pass (escalation is a
//            sharper atom, never a louder prompt).
//
// Law: mouth-last, hunt-first, falsify-or-die, named gaps never invented.
// The loop refuses to re-draw the same unsharpened atom; a run that exhausts
// its attempts is a gate_unmet finding, never a fabricated pass.

import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { draw } from "./generation/engine.mjs";
import codeAdapter from "./generation/adapters/code.mjs";
import { lintGfp, lintReport } from "../../janus/native/organs/reasoning-lint.js";
import { lintCodeGoal, atomClause } from "../../khora/native/organs/code-goal-lint.js";
import { claimFromTriple } from "../../khora/native/kernel/gfp-claim.js";

const execFileP = promisify(execFile);

export function buildFixPrompt({ brief = "", target = "", gateHints = [] } = {}) {
  const targetBlock = target ? `\nCURRENT SOURCE:\n${target}\n` : "";
  const hints = gateHints.length
    ? `\nThe last draft was refused for:\n${gateHints.map((h) => ` - ${h}`).join("\n")}\n`
    : "";
  return `${brief}\n${targetBlock}${hints}\nReturn ONLY the module as raw code. No prose. No markdown fences. Preserve every exported name and signature exactly.`;
}

export function extractModule(text) {
  const s = String(text ?? "").trim();
  const fence = s.match(/```[a-zA-Z0-9_+-]*\n([\s\S]*?)(?:```|$)/);
  return fence ? fence[1].trim() : s;
}

/** The reason lint over the goal sheet and one pass claim: the khora's
 *  code-goal-lint produces the TYPED finding and its atom; janus's lintGfp
 *  runs the deep reason core over the same claim. Both must speak before a
 *  draft is sharpened. Returns { ok, findings, clauses }. */
export function reasonLint({ goals = [], pass = null } = {}) {
  const findings = [];
  if (pass) {
    const goalFinding = lintCodeGoal({ goals, passClaim: pass });
    if (goalFinding) {
      findings.push({ kind: goalFinding.kind, severity: goalFinding.severity, detail: goalFinding.detail, atom: goalFinding.atom, clause: atomClause(goalFinding.atom) });
    }
  }
  const claim = pass ? claimFromTriple(pass.end1, pass.label ?? "returns", pass.end2, { ground: "module" }) : null;
  if (claim) {
    const deep = lintGfp([claim], {});
    for (const f of deep.findings) {
      if (findings.some((x) => x.kind === f.kind && x.detail === f.detail)) continue;
      findings.push({ kind: f.kind, severity: f.severity, level: f.level, detail: f.detail, clause: null });
    }
  }
  return { ok: !findings.some((f) => f.severity === "error"), findings, clauses: findings.map((f) => f.clause).filter(Boolean) };
}

export async function runGateScript(gatePath, candidatePath) {
  try {
    const { stdout } = await execFileP(process.execPath, [gatePath, candidatePath], { timeout: 60_000 });
    return { ok: true, why: (stdout ?? "").trim() || "exit 0" };
  } catch (e) {
    return { ok: false, why: String(e?.stderr || e?.stdout || e?.message || e).slice(0, 500) };
  }
}

/** The synchronous form — the engine's probeUnit/testUnits contract is sync
 *  (the code adapter's are execSync), so a gate that must ride the spiral is
 *  run with execFileSync, never a Promise leaking into the EOT. */
export function runGateScriptSync(gatePath, candidatePath) {
  try {
    const stdout = execFileSync(process.execPath, [gatePath, candidatePath], { timeout: 60_000, encoding: "utf8", stdio: "pipe" });
    return { ok: true, why: (stdout ?? "").trim() || "exit 0" };
  } catch (e) {
    return { ok: false, why: String(e?.stderr || e?.stdout || e?.message || e).slice(0, 500) };
  }
}

export function evaluateWithGateScript({ gatePath, ext = ".mjs" }) {
  return async function evaluate(candidate) {
    const dir = await mkdtemp(path.join(tmpdir(), "code-fix-"));
    try {
      const file = path.join(dir, `candidate${ext}`);
      await writeFile(file, candidate, "utf8");
      return await runGateScript(gatePath, file);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

/** The loop. Defaults are the system's own organs; tests inject only the
 *  draw (infer) and keep the real gate and the real lint. */
export async function fixCode({
  brief = "",
  target = "",
  goals = [],
  model = null,
  units = [],
  gate = null,
  maxAttempts = 3,
  infer = draw,
  lint = reasonLint,
  prompt = buildFixPrompt,
  extract = extractModule,
  assembleCode = codeAdapter.assemble,
  test = codeAdapter.testUnits,
  maxTokens = 1024,
} = {}) {
  if (typeof infer !== "function") throw new Error("infer (the draw lane) is required");
  if (typeof lint !== "function") throw new Error("lint (the reason lint) is required");
  const attempts = [];
  const gateHints = [];
  let finalGate = { ok: false, reason: "not_run", why: "" };

  for (let n = 0; n < Math.max(1, maxAttempts); n++) {
    const raw = await infer(prompt({ brief, target, gateHints }), { kind: "code", model, maxTokens });
    const text = typeof raw === "string" ? raw : (raw?.text ?? "");
    const code = extract(text);
    if (!code) {
      attempts.push({ attempt: n + 1, ok: false, why: "empty draft" });
      gateHints.push("the draw returned nothing extractable");
      continue;
    }
    const assembled = assembleCode(code, units);
    finalGate = typeof gate === "function"
      ? await gate(assembled)
      : typeof gate === "string"
        ? await evaluateWithGateScript({ gatePath: gate })(assembled)
        : test(assembled, units);
    const ok = !!finalGate?.ok;
    attempts.push({ attempt: n + 1, ok, why: ok ? null : (finalGate?.why ?? finalGate?.detail ?? "gate failed") });
    if (ok) {
      return { ok: true, code: assembled, executor: "penelope-mouth", attempts, gate: finalGate, lint: null, scars: gateHints };
    }
    const pass = passClaimFromGate(finalGate, brief, target);
    const r = lint({ goals, pass });
    const clauses = r.clauses.length ? r.clauses : r.findings.map((f) => f.detail).slice(0, 2);
    // Escalation must always move: when the lint produces no atom, the gate's
    // own finding IS the atom — a re-draw of the identical prompt is the one
    // thing this loop refuses (escalation is a sharper atom, never a louder
    // prompt, and an unchanged prompt is the loudest).
    const why = String(finalGate?.why ?? finalGate?.detail ?? "gate failed").slice(0, 200);
    gateHints.push(...(clauses.length ? clauses : [why]));
  }

  return { ok: false, reason: finalGate?.reason ?? "gate_unmet", why: finalGate?.why ?? finalGate?.detail ?? null, attempts, gate: finalGate, scars: gateHints };
}

/** The pass claim the gate would have accepted, read off the gate's own
 *  finding — never invented. When the gate names nothing, the brief's own
 *  words stand (a goal, not a guess). */
function passClaimFromGate(gate, brief = "", target = "") {
  if (gate?.actual) return { end1: gate.actual.end1 ?? null, label: "returns", end2: gate.actual.end2 ?? null };
  if (gate?.expected) return { end1: gate.expected.end1 ?? null, label: "returns", end2: gate.expected.end2 ?? null };
  const m = String(gate?.why ?? gate?.detail ?? "").match(/([A-Za-z_]\w*\s*\([^)]*\)|[A-Za-z_]\w+)\s+(?:returns?|produces?|must be|should be)\s+([^;\n]+)/i);
  if (m) return { end1: m[1].trim(), label: "returns", end2: m[2].trim() };
  return { end1: brief.split(/\s+/).slice(0, 8).join(" "), label: "returns", end2: target.slice(0, 80) };
}