// contracts/epistemic-position.js — EpistemicPosition@1.
//
// The Fold's position on a matter, distinguished into named states. Each state
// records who supplied it, its scope and its review conditions. A refusal
// applies to a particular inquiry and context; it is neither universal nor an
// expiring obstacle by default. Leaving something alone is a completed
// disposition, not a retrieval failure — the contract rejects states that
// would retry a declined inquiry through another agent, channel or wording.

import { makeValidator, isNonEmptyString, isArrayOf } from "./core.js";

export const EPISTEMIC_SCHEMA = "EpistemicPosition@1";
export const EPISTEMIC_VERSION = 1;

export const EPISTEMIC_STATES = Object.freeze([
  "known",
  "unknown",
  "not_disclosed",
  "inquiry_declined",
  "outside_scope",
  "still_becoming",
  "contested",
  "invalidated",
]);

export const validateEpistemicPosition = makeValidator({
  schema: EPISTEMIC_SCHEMA,
  version: EPISTEMIC_VERSION,
  checks: [
    (r) => (EPISTEMIC_STATES.includes(r.epistemic_state) ? { ok: true } : { ok: false, msg: `epistemic_state must be one of ${EPISTEMIC_STATES.join(", ")}` }),
    (r) => (isNonEmptyString(r.supplied_by) ? { ok: true } : { ok: false, msg: "supplied_by is required" }),
    (r) => (isNonEmptyString(r.scope) ? { ok: true } : { ok: false, msg: "scope is required" }),
    (r) => (isArrayOf(r.review_conditions, isNonEmptyString) ? { ok: true } : { ok: false, msg: "review_conditions must be an array of strings" }),
    (r) => {
      // An inquiry that was declined cannot be quietly reopened through another
      // agent, channel or wording; reopening requires a recorded reason.
      if (r.epistemic_state === "inquiry_declined" && r.reopen_reason !== undefined && !isNonEmptyString(r.reopen_reason)) {
        return { ok: false, msg: "reopen_reason must be a recorded string when present" };
      }
      return { ok: true };
    },
    (r) => {
      // "still_becoming" and "outside_scope" are not "unknown" — collapsing
      // them would license inference on an open or excluded matter.
      if (r.epistemic_state === "still_becoming" || r.epistemic_state === "outside_scope") {
        if (r.treated_as_unknown === true) return { ok: false, msg: "still_becoming/outside_scope must not be treated as unknown" };
      }
      return { ok: true };
    },
  ],
});

export const EPISTEMIC_POSITION = {
  schema: EPISTEMIC_SCHEMA,
  version: EPISTEMIC_VERSION,
  validate: validateEpistemicPosition,
  describe: "absence, refusal, confidentiality and ongoing becoming are different states; none licenses inference",
};