// contracts/encounter.js — Encounter@1.
//
// An encounter is the Fold's record of a situated meeting with material or
// beings. It licenses an account of the encounter, never an exhaustive
// identity of what was met. participant entries MUST distinguish observed
// identities, unresolved referents and deliberately withheld identities; each
// identity relation carries its own evidence and scope. The record says
// whether the Fold elicited, selected, transformed or published the material.
//
// The contract rejects fabricated identities: a participant cannot be asserted
// as "observed" without evidence, and cannot be assigned a concrete identity
// while marked withheld. Public availability does not grant unlimited
// permission to aggregate or repurpose.

import { makeValidator, isNonEmptyString, isArrayOf, isPlainRecord } from "./core.js";

export const ENCOUNTER_SCHEMA = "Encounter@1";
export const ENCOUNTER_VERSION = 1;

export const PARTICIPANT_KINDS = Object.freeze(["observed", "unresolved", "withheld"]);
export const ENCOUNTER_OPERATIONS = Object.freeze(["elicited", "selected", "transformed", "published"]);

const participantChecks = (participant) => {
  if (!isPlainRecord(participant)) return { ok: false, msg: "participant must be a record" };
  if (!PARTICIPANT_KINDS.includes(participant.kind)) return { ok: false, msg: `participant.kind must be one of ${PARTICIPANT_KINDS.join(", ")}` };
  if (!isArrayOf(participant.evidence, isNonEmptyString)) return { ok: false, msg: "participant.evidence must be a non-empty array of strings" };
  if (!isArrayOf(participant.scope, isNonEmptyString)) return { ok: false, msg: "participant.scope must be a non-empty array of strings" };
  // An observed participant must carry identity evidence; a withheld one must
  // not be assigned a concrete identity the Fold could not have earned.
  if (participant.kind === "observed" && participant.evidence.length === 0) return { ok: false, msg: "observed participant requires evidence" };
  if (participant.kind === "withheld" && participant.identity) return { ok: false, msg: "withheld participant must not carry a concrete identity (fabricated identity)" };
  return { ok: true };
};

export const validateEncounter = makeValidator({
  schema: ENCOUNTER_SCHEMA,
  version: ENCOUNTER_VERSION,
  checks: [
    (r) => (isNonEmptyString(r.encounter_id) ? { ok: true } : { ok: false, msg: "encounter_id is required" }),
    (r) => (typeof r.time === "string" || typeof r.time === "number" ? { ok: true } : { ok: false, msg: "time is required" }),
    (r) => (isNonEmptyString(r.observer) ? { ok: true } : { ok: false, msg: "observer is required" }),
    (r) => (isNonEmptyString(r.medium) ? { ok: true } : { ok: false, msg: "medium is required" }),
    (r) => (isArrayOf(r.source_refs, isNonEmptyString) ? { ok: true } : { ok: false, msg: "source_refs must be an array of strings" }),
    (r) => {
      if (!Array.isArray(r.participants) || r.participants.length === 0) return { ok: false, msg: "participants is required" };
      const bad = r.participants.map(participantChecks).find((c) => !c.ok);
      return bad || { ok: true };
    },
    (r) => (isNonEmptyString(r.context) ? { ok: true } : { ok: false, msg: "context is required" }),
    (r) => {
      if (!Array.isArray(r.disclosure_scope) || r.disclosure_scope.length === 0) return { ok: false, msg: "disclosure_scope is required" };
      return { ok: true };
    },
    (r) => {
      if (!r.operation) return { ok: true }; // operation optional; absence records the Fold did not choose a mode
      if (!ENCOUNTER_OPERATIONS.includes(r.operation)) return { ok: false, msg: `operation must be one of ${ENCOUNTER_OPERATIONS.join(", ")}` };
      return { ok: true };
    },
  ],
});

export const ENCOUNTER = {
  schema: ENCOUNTER_SCHEMA,
  version: ENCOUNTER_VERSION,
  validate: validateEncounter,
  describe: "an encounter licenses an account of that encounter, never an exhaustive identity",
};