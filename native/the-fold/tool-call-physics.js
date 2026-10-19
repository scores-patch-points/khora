// tool-call-physics.js — the tool call DERIVED by physics, never emitted by a model.
//
// The house law this makes executable (patch.js's header, code-scout.js::deltaOps):
// a small local model cannot be trusted to tool-call — it mislabels its own edit,
// or prints the call as prose the harness cannot parse. So the model is asked only
// for its NATIVE MEDIUM (the regenerated code / the file / the value), which it can
// be right about, and the machine DERIVES the operation from the bytes it already
// holds, which IT can be right about. The model supplies content; the machine
// supplies the act.
//
// This module is the general form of that law and its one hard rule: a derivation
// that does not reconstruct the model's output EXACTLY is REFUSED — a typed wall
// that escalates to a tool-capable model — never applied as a guess. The hazard is
// real and measured: on repetitive material deltaOps's anchor cannot be made unique,
// the raw pipeline still lands an op, and the change is silently moved to the wrong
// occurrence. deriveEdit reconstructs and compares; a mismatch is a wall, not a patch.
//
// Pure. Deterministic. No model, no I/O. The primitives are the fold's own
// (code-scout.js::deltaOps, patch.js::readOps/applyOps) — this file adds no second
// implementation of them.

import { deltaOps } from "./code-scout.js";
import { readOps, applyOps } from "./patch.js";

/** The artifact a reply carries, or null. Tolerant the way a reader must be: a bare
 *  fence, a language tag, prose around it. A reply with no fenced block carries no
 *  artifact — it is an answer, not an act (the caller's business, not this one's). */
export function extractArtifact(reply) {
  const m = String(reply ?? "").match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  return m ? m[1] : null;
}

/**
 * The physics of an edit, HARDENED. Given the text BEFORE (the world's real bytes)
 * and the model's text AFTER (its native medium), derive the one {find, add} op,
 * normalize it, apply it to BEFORE, and require the result to reconstruct AFTER
 * exactly.
 *
 *   { ok: true,  ops, code }                     — the derived act, verified exact
 *   { ok: false, refuse: true, reason, gap? }    — a typed wall; ESCALATE, never guess
 *
 * Reasons: no-change · no-derivable-delta · delta-did-not-normalize · op-did-not-land
 * · reconstruction-mismatch (the non-unique-anchor case).
 */
export function deriveEdit(before, after) {
  const a = String(before ?? "");
  const b = String(after ?? "");
  if (a === b) return { ok: false, refuse: true, reason: "no-change" };
  const d = deltaOps(a, b);
  if (!d) return { ok: false, refuse: true, reason: "no-derivable-delta" };
  const ops = readOps([{ find: d.find, add: d.add }]);
  if (!ops) return { ok: false, refuse: true, reason: "delta-did-not-normalize" };
  const r = applyOps(a, ops);
  if (!r.ok) return { ok: false, refuse: true, reason: "op-did-not-land", gap: r.gap };
  if (r.code !== b) return { ok: false, refuse: true, reason: "reconstruction-mismatch" };
  return { ok: true, ops, code: r.code };
}

/**
 * routeToolCall(state, reply) — the tool call, derived from the world's state and
 * the model's own bytes. No model authored a name or a JSON argument.
 *
 *   state.open          { path, text } when a file is in view, else null/undefined
 *   state.suggestedPath where a NEW artifact should land (write only)
 *
 * Returns one of:
 *   { tool: "edit",   args: { path, ops }, verified: true }   a file is open and the reply changes it
 *   { tool: "write",  args: { path, content } }               no file open; the reply is a new artifact
 *   { tool: "none",   why }                                    the reply is an answer, not an act
 *   { tool: "refuse", reason, gap, escalate: true }           the delta is not exact — a wall
 *
 * The wall is the whole point: it is the signal to escalate (a tool-capable model,
 * a different framing, a human), and it is the reason a physics-driven loop can be
 * trusted — it refuses rather than corrupts.
 */
export function routeToolCall(state, reply) {
  const code = extractArtifact(reply);
  if (code === null) return { tool: "none", why: "no artifact in the reply — an answer, not an act" };
  const open = state?.open ?? null;
  if (!open) return { tool: "write", args: { path: state?.suggestedPath ?? null, content: code } };
  if (code === open.text) return { tool: "none", why: "byte-identical to the open file — nothing to do" };
  const d = deriveEdit(open.text, code);
  if (!d.ok) return { tool: "refuse", reason: d.reason, gap: d.gap ?? null, escalate: true };
  return { tool: "edit", args: { path: open.path, ops: d.ops }, verified: true };
}
