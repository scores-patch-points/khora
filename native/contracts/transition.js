// contracts/transition.js — SituatedTransition@1.
//
// The derived object of constructive action: a declared purpose, the
// encounters it draws on, the affected bearers, the state before, the proposed
// change, scoped and revisable effect forecasts, alternatives, unknowns,
// contest routes, operational authority, a constructive derivation and named
// falsifiers. Forecasts are scoped and revisable; declarations such as
// "understands" or "affirms" cannot establish permissible effects — the
// contract rejects a forecast whose only support is such a flag.

import { makeValidator, isNonEmptyString, isArrayOf, isPlainRecord } from "./core.js";

export const TRANSITION_SCHEMA = "SituatedTransition@1";
export const TRANSITION_VERSION = 1;

const forecastChecks = (f) => {
  if (!isPlainRecord(f)) return { ok: false, msg: "effect_forecast must be a record" };
  if (!isNonEmptyString(f.effect)) return { ok: false, msg: "forecast.effect is required" };
  if (!isNonEmptyString(f.scope)) return { ok: false, msg: "forecast.scope is required" };
  if (!isArrayOf(f.evidence, isNonEmptyString)) return { ok: false, msg: "forecast.evidence must be an array of strings" };
  if (f.revisable !== true) return { ok: false, msg: "forecast.revisable must be true (forecasts are scoped and revisable)" };
  // A flag cannot establish permissibility. Support must be evidence-shaped,
  // not an assertion of understanding or affirmation.
  if (f.understand === true || f.affirms === true) {
    return { ok: false, msg: "understand/affirms flags cannot establish permissible effects" };
  }
  return { ok: true };
};

const bearerChecks = (b) => {
  if (!isPlainRecord(b)) return { ok: false, msg: "affected bearer must be a record" };
  if (!isNonEmptyString(b.bearer)) return { ok: false, msg: "affected bearer requires a bearer name" };
  if (b.bearer === "universe" || b.bearer === "everyone") return { ok: false, msg: "a bearer cannot be an all-encompassing abstraction (universe/everyone)" };
  return { ok: true };
};

export const validateTransition = makeValidator({
  schema: TRANSITION_SCHEMA,
  version: TRANSITION_VERSION,
  checks: [
    (r) => (isNonEmptyString(r.purpose) ? { ok: true } : { ok: false, msg: "purpose is required" }),
    (r) => (isArrayOf(r.encounters, isNonEmptyString) ? { ok: true } : { ok: false, msg: "encounters must be an array of encounter_id strings" }),
    (r) => {
      if (!Array.isArray(r.affected_bearers) || r.affected_bearers.length === 0) return { ok: false, msg: "affected_bearers is required" };
      const bad = r.affected_bearers.map(bearerChecks).find((c) => !c.ok);
      return bad || { ok: true };
    },
    (r) => (isNonEmptyString(r.proposed_change) ? { ok: true } : { ok: false, msg: "proposed_change is required" }),
    (r) => {
      if (!Array.isArray(r.effect_forecasts) || r.effect_forecasts.length === 0) return { ok: false, msg: "effect_forecasts is required" };
      const bad = r.effect_forecasts.map(forecastChecks).find((c) => !c.ok);
      return bad || { ok: true };
    },
    (r) => (isArrayOf(r.unknowns, isNonEmptyString) ? { ok: true } : { ok: false, msg: "unknowns must be an array of strings" }),
    (r) => (isArrayOf(r.contest_routes, isNonEmptyString) ? { ok: true } : { ok: false, msg: "contest_routes must be an array of strings" }),
    (r) => {
      if (r.operational_authority !== undefined && typeof r.operational_authority !== "string" && typeof r.operational_authority !== "boolean") {
        return { ok: false, msg: "operational_authority must be a string or boolean" };
      }
      return { ok: true };
    },
    (r) => (isArrayOf(r.falsifiers, isNonEmptyString) ? { ok: true } : { ok: false, msg: "falsifiers must be an array of strings" }),
    (r) => {
      // A derivation must be constructive — it cannot be a renamed rejection
      // ("physics", "unrealizable") standing in for an actual construction.
      if (r.constructive_derivation !== undefined) {
        const d = r.constructive_derivation;
        if (!isPlainRecord(d) || !isNonEmptyString(d.rule) || !isArrayOf(d.inputs, isNonEmptyString)) {
          return { ok: false, msg: "constructive_derivation must carry a named rule and its inputs" };
        }
        if (/^(physics|unrealizable|refused)$/i.test(d.rule)) {
          return { ok: false, msg: "a gate or rejection renamed as a derivation cannot claim constitutive enforcement" };
        }
      }
      return { ok: true };
    },
  ],
});

export const SITUATED_TRANSITION = {
  schema: TRANSITION_SCHEMA,
  version: TRANSITION_VERSION,
  validate: validateTransition,
  describe: "declarations such as understands or affirms cannot establish permissible effects",
};