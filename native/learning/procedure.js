// learning/procedure.js — LearnedProcedure@1 (Milestone 5).
//
// A learned procedure is a scoped, reusable construction: source encounters,
// domain and effect scope, constructive obligations, independent tests,
// negative controls, failures and invalidation conditions. Stored procedures
// must RECONSTRUCT their derivation in a new context rather than replay an old
// authorization.
//
// Performance improvements cannot delete standing, turn opacity into consent
// or change user satisfaction into universal success. New facts can revise
// descriptive accounts; updates to received normative commitments have
// separate, explicit lineage. The agent can propose a revision but cannot
// quietly enact it through a learned procedure.

import { makeValidator, isNonEmptyString, isArrayOf, isPlainRecord } from "../contracts/core.js";

export const PROCEDURE_SCHEMA = "LearnedProcedure@1";
export const PROCEDURE_VERSION = 1;

/**
 * storeProcedure({ ... }) — create a learned procedure record. Every field the
 * spec names is required except where noted:
 *   sourceEncounters      — the encounters it was learned from
 *   domain                — the domain it applies to
 *   effectScope           — the scope its effects are authorized under
 *   obligations           — constructive obligations carried into reuse
 *   tests                 — independent tests that certified it
 *   negativeControls      — controls that must stay negative
 *   failures              — recorded failures it must not repeat
 *   invalidationConditions — predicates that void the procedure in a new context
 */
export function storeProcedure({
  name,
  constructor = null,
  sourceEncounters = [],
  domain,
  effectScope,
  obligations = [],
  tests = [],
  negativeControls = [],
  failures = [],
  invalidationConditions = [],
  lineage = null,
} = {}) {
  return Object.freeze({
    schema: PROCEDURE_SCHEMA,
    version: PROCEDURE_VERSION,
    name,
    ...(constructor ? { constructor } : {}),
    sourceEncounters: Object.freeze([...sourceEncounters]),
    domain,
    effectScope,
    obligations: Object.freeze([...obligations]),
    tests: Object.freeze([...tests]),
    negativeControls: Object.freeze([...negativeControls]),
    failures: Object.freeze([...failures]),
    invalidationConditions: Object.freeze([...invalidationConditions]),
    ...(lineage ? { lineage } : {}),
  });
}

export const validateProcedure = makeValidator({
  schema: PROCEDURE_SCHEMA,
  version: PROCEDURE_VERSION,
  checks: [
    (r) => (isNonEmptyString(r.name) ? { ok: true } : { ok: false, msg: "name is required" }),
    (r) => (r.constructor === undefined || isNonEmptyString(r.constructor) ? { ok: true } : { ok: false, msg: "constructor must be a string when present" }),
    (r) => (isArrayOf(r.sourceEncounters, isNonEmptyString) && r.sourceEncounters.length > 0 ? { ok: true } : { ok: false, msg: "sourceEncounters must be a non-empty array of encounter_id strings" }),
    (r) => (isNonEmptyString(r.domain) ? { ok: true } : { ok: false, msg: "domain is required" }),
    (r) => (isNonEmptyString(r.effectScope) ? { ok: true } : { ok: false, msg: "effectScope is required" }),
    (r) => (isArrayOf(r.obligations, isNonEmptyString) ? { ok: true } : { ok: false, msg: "obligations must be an array of strings" }),
    (r) => (isArrayOf(r.tests, isNonEmptyString) ? { ok: true } : { ok: false, msg: "tests must be an array of strings" }),
    (r) => (isArrayOf(r.negativeControls, isNonEmptyString) ? { ok: true } : { ok: false, msg: "negativeControls must be an array of strings" }),
    (r) => (isArrayOf(r.failures, isNonEmptyString) ? { ok: true } : { ok: false, msg: "failures must be an array of strings" }),
    (r) => (isArrayOf(r.invalidationConditions, isNonEmptyString) ? { ok: true } : { ok: false, msg: "invalidationConditions must be an array of strings" }),
    (r) => {
      // Reuse must never be able to launder effects: an explicit scope is
      // required, and it cannot be an all-encompassing certification.
      if (r.effectScope === "universe_pleased" || r.effectScope === "universally_good") {
        return { ok: false, msg: "a learned procedure cannot certify universe approval or universal goodness" };
      }
      return { ok: true };
    },
    (r) => {
      if (r.lineage !== undefined && !isPlainRecord(r.lineage)) return { ok: false, msg: "lineage must be a record when present" };
      return { ok: true };
    },
  ],
});

export const LEARNED_PROCEDURE = {
  schema: PROCEDURE_SCHEMA,
  version: PROCEDURE_VERSION,
  validate: validateProcedure,
  store: storeProcedure,
  describe: "stored procedures reconstruct their derivation in a new context rather than replay an old authorization",
};