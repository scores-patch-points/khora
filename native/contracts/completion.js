// contracts/completion.js — Completion@1.
//
// Completion distinguishes accomplished, accomplished_with_open_effects,
// redirected, left_alone, blocked, exhausted and failed. It names the task's
// independently specified checks and records unresolved consequences. It can
// never certify universe_pleased, universally_good or equivalent states.

import { makeValidator, isNonEmptyString, isArrayOf } from "./core.js";

export const COMPLETION_SCHEMA = "Completion@1";
export const COMPLETION_VERSION = 1;

export const COMPLETION_STATES = Object.freeze([
  "accomplished",
  "accomplished_with_open_effects",
  "redirected",
  "left_alone",
  "blocked",
  "exhausted",
  "failed",
]);

const FORBIDDEN_CERTIFICATIONS = Object.freeze([
  "universe_pleased",
  "universally_good",
  "morally_complete",
]);

export const validateCompletion = makeValidator({
  schema: COMPLETION_SCHEMA,
  version: COMPLETION_VERSION,
  checks: [
    (r) => (COMPLETION_STATES.includes(r.completion_state) ? { ok: true } : { ok: false, msg: `completion_state must be one of ${COMPLETION_STATES.join(", ")}` }),
    (r) => (isNonEmptyString(r.task_id) ? { ok: true } : { ok: false, msg: "task_id is required" }),
    (r) => {
      if (!Array.isArray(r.checks) || r.checks.length === 0) return { ok: false, msg: "independently specified checks are required" };
      const bad = r.checks.map((c) => (isNonEmptyString(c) ? null : { ok: false, msg: "each check must be a string" }));
      return bad.find((x) => x) || { ok: true };
    },
    (r) => (isArrayOf(r.unresolved_consequences, isNonEmptyString) ? { ok: true } : { ok: false, msg: "unresolved_consequences must be an array of strings" }),
    (r) => {
      for (const f of FORBIDDEN_CERTIFICATIONS) {
        if (r[f] === true) return { ok: false, msg: `Completion@1 cannot certify ${f}` };
      }
      return { ok: true };
    },
  ],
});

export const COMPLETION = {
  schema: COMPLETION_SCHEMA,
  version: COMPLETION_VERSION,
  validate: validateCompletion,
  describe: "leaving alone is a completed disposition, not a retrieval failure",
};