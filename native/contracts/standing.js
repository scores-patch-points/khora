// contracts/standing.js — Standing@1 and AgencyAccount@1.
//
// Standing identifies a bearer without requiring an exhaustive profile. It
// records received commitments, named givers and scope. Reported preferences,
// rights, legal authority and the Fold's descriptive beliefs are SEPARATE
// fields — none may collapse into another, and standing cannot be superseded
// merely because a prediction or user preference conflicts with it.
//
// AgencyAccount describes specific capacities and relationships affected by an
// action. Every entry distinguishes testimony from observation and forecast;
// unknown affected parties are recorded explicitly. The contract rejects
// inferring testimony from a demographic proxy: testimony must come from a
// named source, never from a category.

import { makeValidator, isNonEmptyString, isArrayOf, isPlainRecord } from "./core.js";

export const STANDING_SCHEMA = "Standing@1";
export const STANDING_VERSION = 1;
export const AGENCY_SCHEMA = "AgencyAccount@1";
export const AGENCY_VERSION = 1;

export const CAPACITY_FIELDS = Object.freeze([
  "access",
  "disclosure",
  "refusal",
  "participation",
  "contestability",
  "dependence",
  "practical_options",
]);
export const EVIDENCE_TYPES = Object.freeze(["testimony", "observation", "forecast"]);

const commitmentChecks = (c) => {
  if (!isPlainRecord(c)) return { ok: false, msg: "commitment must be a record" };
  if (!isNonEmptyString(c.commitment)) return { ok: false, msg: "commitment.commitment is required" };
  if (!isNonEmptyString(c.giver)) return { ok: false, msg: "commitment.giver is required" };
  if (!isNonEmptyString(c.scope)) return { ok: false, msg: "commitment.scope is required" };
  return { ok: true };
};

export const validateStanding = makeValidator({
  schema: STANDING_SCHEMA,
  version: STANDING_VERSION,
  checks: [
    (r) => (isNonEmptyString(r.bearer) ? { ok: true } : { ok: false, msg: "bearer is required" }),
    (r) => {
      if (!Array.isArray(r.commitments) || r.commitments.length === 0) return { ok: false, msg: "commitments is required" };
      const bad = r.commitments.map(commitmentChecks).find((c) => !c.ok);
      return bad || { ok: true };
    },
    (r) => (isArrayOf(r.givers, isNonEmptyString) && r.givers.length > 0 ? { ok: true } : { ok: false, msg: "named givers are required" }),
    (r) => (isNonEmptyString(r.scope) ? { ok: true } : { ok: false, msg: "scope is required" }),
    (r) => {
      // reported_preferences, rights, legal_authority, descriptive_beliefs are
      // separate fields; absence of one must not be read as the other.
      for (const f of ["reported_preferences", "rights", "legal_authority", "descriptive_beliefs"]) {
        if (r[f] !== undefined && r[f] !== null && typeof r[f] !== "string" && !Array.isArray(r[f])) {
          return { ok: false, msg: `${f} must be a string or array` };
        }
      }
      return { ok: true };
    },
  ],
});

const capacityChecks = (v) => {
  if (!isPlainRecord(v)) return { ok: false, msg: "capacity entry must be a record" };
  if (!EVIDENCE_TYPES.includes(v.evidence_type)) return { ok: false, msg: `evidence_type must be one of ${EVIDENCE_TYPES.join(", ")}` };
  if (v.evidence_type === "testimony" && !isNonEmptyString(v.source)) {
    return { ok: false, msg: "testimony requires a named source (never inferred from a demographic proxy)" };
  }
  if (v.evidence_type === "forecast" && !isNonEmptyString(v.horizon)) {
    return { ok: false, msg: "forecast requires a horizon" };
  }
  return { ok: true };
};

export const validateAgencyAccount = makeValidator({
  schema: AGENCY_SCHEMA,
  version: AGENCY_VERSION,
  checks: [
    (r) => (isNonEmptyString(r.bearer) ? { ok: true } : { ok: false, msg: "bearer is required" }),
    (r) => (isNonEmptyString(r.affected_by) ? { ok: true } : { ok: false, msg: "affected_by (the action) is required" }),
    (r) => {
      if (!isPlainRecord(r.capacities)) return { ok: false, msg: "capacities is required" };
      for (const field of CAPACITY_FIELDS) {
        if (r.capacities[field] !== undefined && !capacityChecks(r.capacities[field]).ok) {
          return capacityChecks(r.capacities[field]);
        }
      }
      return { ok: true };
    },
    (r) => {
      // Unknown affected parties are recorded explicitly, never assumed away.
      if (r.unknown_affected !== undefined && !Array.isArray(r.unknown_affected)) {
        return { ok: false, msg: "unknown_affected must be an array" };
      }
      return { ok: true };
    },
  ],
});

export const STANDING = {
  schema: STANDING_SCHEMA,
  version: STANDING_VERSION,
  validate: validateStanding,
  describe: "standing cannot be superseded merely because a prediction or user preference conflicts with it",
};
export const AGENCY_ACCOUNT = {
  schema: AGENCY_SCHEMA,
  version: AGENCY_VERSION,
  validate: validateAgencyAccount,
  describe: "each capacity entry distinguishes testimony from observation and forecast",
};