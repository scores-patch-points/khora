// contracts/index.js — the versioned contract registry.
//
// Every contract here is artifact-neutral (a plain JSON record), versioned,
// and replayable (Milestone 1 exit: no fabricated identities or testimony; all
// states round-trip without collapse). Constructors and adapters consume these
// records; the exact-transition adapters (Milestone 3) bind operation, input
// hashes, target, scope and policy version against these same schemas.

import { replay, canonicalString } from "./core.js";
import { ENCOUNTER, validateEncounter } from "./encounter.js";
import { STANDING, AGENCY_ACCOUNT, validateStanding, validateAgencyAccount } from "./standing.js";
import { EPISTEMIC_POSITION, validateEpistemicPosition } from "./epistemic-position.js";
import { SITUATED_TRANSITION, validateTransition } from "./transition.js";
import { RESPONSE, CONSEQUENCE, validateResponse, validateConsequence } from "./response.js";
import { COMPLETION, validateCompletion } from "./completion.js";

export * from "./core.js";
export * from "./encounter.js";
export * from "./standing.js";
export * from "./epistemic-position.js";
export * from "./transition.js";
export * from "./response.js";
export * from "./completion.js";

export const CONTRACTS = Object.freeze([
  ENCOUNTER,
  STANDING,
  AGENCY_ACCOUNT,
  EPISTEMIC_POSITION,
  SITUATED_TRANSITION,
  RESPONSE,
  CONSEQUENCE,
  COMPLETION,
]);

const VALIDATORS = Object.freeze({
  [ENCOUNTER.schema]: validateEncounter,
  [STANDING.schema]: validateStanding,
  [AGENCY_ACCOUNT.schema]: validateAgencyAccount,
  [EPISTEMIC_POSITION.schema]: validateEpistemicPosition,
  [SITUATED_TRANSITION.schema]: validateTransition,
  [RESPONSE.schema]: validateResponse,
  [CONSEQUENCE.schema]: validateConsequence,
  [COMPLETION.schema]: validateCompletion,
});

/**
 * validateRecord(record) — dispatch a record to its schema validator.
 * Returns { valid, schema, version, errors }.
 */
export function validateRecord(record) {
  if (!record || typeof record.schema !== "string") {
    return { valid: false, schema: null, version: null, errors: ["record carries no schema"] };
  }
  const validate = VALIDATORS[record.schema];
  if (!validate) return { valid: false, schema: record.schema, version: record.version, errors: [`unknown schema: ${record.schema}`] };
  return validate(record);
}

/**
 * replayRecord(record) — validate then round-trip a record, returning
 * { valid, ok, canonical, restored, errors }. `ok` is the replay result; a
 * record that is valid but does not survive round-trip is a collapse.
 */
export function replayRecord(record) {
  const v = validateRecord(record);
  if (!v.valid) return { valid: false, ok: false, canonical: null, restored: null, errors: v.errors };
  const rp = replay(record);
  return { valid: true, ...rp, errors: [] };
}