// execution/mechanical.js — the bounded mechanical evaluator (Milestone 3).
//
// compute_in_isolation performs a REAL computation — it never returns a canned
// "computed" record. The computation is a declared, whitelisted MECHANICAL
// operation over operands that are either literals or refs into the runtime's
// admitted material. No model, no shell, no network, no eval of arbitrary code:
// an operation that is not on the whitelist, or an operand that cannot be
// resolved, is a typed gap — never a silent "computed".
//
// The whitelist is the reason-gate's "mechanical" lane: arithmetic, logic,
// aggregation, string and hash operations that a machine can settle
// deterministically at zero model tokens.

import { createHash } from "node:crypto";

export const MECHANICAL_SCHEMA = "MechanicalCompute@1";
export const MECHANICAL_VERSION = 1;

// resolveOperand(op, ctx) — a literal stays a literal; { ref } resolves against
// the runtime's admitted material and sources.
function resolveOperand(op, ctx) {
  if (op && typeof op === "object" && !Array.isArray(op) && typeof op.ref === "string") {
    const v = ctx.get?.(op.ref) ?? null;
    if (v === null) return { ok: false, reason: `operand ref "${op.ref}" is not in the admitted material` };
    return { ok: true, value: v };
  }
  return { ok: true, value: op };
}

function asNumber(v, op) {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return { ok: false, reason: `${op}: operand "${JSON.stringify(v)}" is not numeric` };
  return { ok: true, value: n };
}

// ── the whitelist ───────────────────────────────────────────────────────────
// Every operation is pure, deterministic and I/O-free. Adding an operation is a
// named change to the mechanical lane, not a widening of the evaluator to
// arbitrary code.
const OPS = Object.freeze({
  // arithmetic
  add: (args) => args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number"
    ? { ok: true, value: args[0] + args[1] }
    : { ok: false, reason: "add requires two numbers" },
  subtract: (args) => args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number"
    ? { ok: true, value: args[0] - args[1] }
    : { ok: false, reason: "subtract requires two numbers" },
  multiply: (args) => args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number"
    ? { ok: true, value: args[0] * args[1] }
    : { ok: false, reason: "multiply requires two numbers" },
  divide: (args) => args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number"
    ? args[1] === 0
      ? { ok: false, reason: "divide by zero" }
      : { ok: true, value: args[0] / args[1] }
    : { ok: false, reason: "divide requires two numbers" },
  modulo: (args) => args.length === 2 && typeof args[0] === "number" && typeof args[1] === "number"
    ? args[1] === 0
      ? { ok: false, reason: "modulo by zero" }
      : { ok: true, value: args[0] % args[1] }
    : { ok: false, reason: "modulo requires two numbers" },
  // aggregation
  sum: (args) => {
    const arr = args[0];
    if (!Array.isArray(arr)) return { ok: false, reason: "sum requires an array" };
    if (arr.some((v) => typeof v !== "number")) return { ok: false, reason: "sum requires an array of numbers" };
    return { ok: true, value: arr.reduce((a, b) => a + b, 0) };
  },
  count: (args) => {
    const arr = args[0];
    if (!Array.isArray(arr)) return { ok: false, reason: "count requires an array" };
    return { ok: true, value: arr.length };
  },
  length: (args) => {
    if (args.length !== 1) return { ok: false, reason: "length requires one operand" };
    if (typeof args[0] !== "string" && !Array.isArray(args[0])) return { ok: false, reason: "length requires a string or array" };
    return { ok: true, value: args[0].length };
  },
  // logic
  eq: (args) => args.length === 2 ? { ok: true, value: args[0] === args[1] } : { ok: false, reason: "eq requires two operands" },
  neq: (args) => args.length === 2 ? { ok: true, value: args[0] !== args[1] } : { ok: false, reason: "neq requires two operands" },
  gt: (args) => args.length === 2 ? { ok: true, value: args[0] > args[1] } : { ok: false, reason: "gt requires two operands" },
  lt: (args) => args.length === 2 ? { ok: true, value: args[0] < args[1] } : { ok: false, reason: "lt requires two operands" },
  and: (args) => args.length === 2 && typeof args[0] === "boolean" && typeof args[1] === "boolean"
    ? { ok: true, value: args[0] && args[1] }
    : { ok: false, reason: "and requires two booleans" },
  or: (args) => args.length === 2 && typeof args[0] === "boolean" && typeof args[1] === "boolean"
    ? { ok: true, value: args[0] || args[1] }
    : { ok: false, reason: "or requires two booleans" },
  not: (args) => args.length === 1 && typeof args[0] === "boolean"
    ? { ok: true, value: !args[0] }
    : { ok: false, reason: "not requires one boolean" },
  // string
  concat: (args) => args.every((v) => typeof v === "string") ? { ok: true, value: args.join("") } : { ok: false, reason: "concat requires strings" },
  // hash
  sha256: (args) => {
    if (args.length !== 1) return { ok: false, reason: "sha256 requires one operand" };
    const v = typeof args[0] === "string" ? args[0] : JSON.stringify(args[0]);
    return { ok: true, value: createHash("sha256").update(v).digest("hex") };
  },
});

export const MECHANICAL_OPS = Object.freeze(Object.keys(OPS));

/**
 * evaluateMechanical(spec, ctx) — perform the declared computation for real.
 * spec = { op, args: [...] } where each arg is a literal or { ref }. Returns
 * { ok: true, value } with the actual result, or { ok: false, reason } — a
 * typed gap naming what could not be computed. Never a canned "computed".
 */
export function evaluateMechanical(spec, ctx = {}) {
  if (!spec || typeof spec !== "object") return { ok: false, reason: "no mechanical computation spec was supplied" };
  const op = spec.op;
  const fn = OPS[op];
  if (!fn) return { ok: false, reason: `unknown mechanical operation "${op}" — not on the whitelist` };
  const args = spec.args ?? [];
  if (!Array.isArray(args)) return { ok: false, reason: "compute args must be an array" };
  const resolved = [];
  for (let i = 0; i < args.length; i += 1) {
    const r = resolveOperand(args[i], ctx);
    if (!r.ok) return { ok: false, reason: r.reason };
    resolved.push(r.value);
  }
  const out = fn(resolved);
  if (!out.ok) return { ok: false, reason: out.reason };
  return { ok: true, value: out.value, op, args: resolved };
}

export const MECHANICAL = {
  schema: MECHANICAL_SCHEMA,
  version: MECHANICAL_VERSION,
  ops: MECHANICAL_OPS,
  evaluate: evaluateMechanical,
  describe: "compute_in_isolation performs a real whitelisted mechanical computation; unknown ops and unresolved refs are typed gaps, never canned results",
};