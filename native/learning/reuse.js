// learning/reuse.js — reuse with re-derivation (Milestone 5).
//
// A stored procedure must RECONSTRUCT its derivation in a new context rather
// than replay an old authorization. Reuse therefore:
//   1. validates the procedure record;
//   2. checks the new context against the procedure's domain, effect scope and
//      invalidation conditions — a context change voids inappropriate reuse;
//   3. re-derives the transition from the CURRENT encounters and purpose (not
//      a cached transition), binding the result at construction time;
//   4. carries the procedure's obligations into the derived transition.
//
// Success cannot launder effects: a procedure that succeeded on a narrow task
// does not authorize a wider effect scope, and a changed purpose or domain
// voids reuse. The procedure can propose a revision; it cannot quietly enact
// one.

import { validateProcedure, PROCEDURE_SCHEMA, PROCEDURE_VERSION } from "./procedure.js";
import { CONSTRUCTORS } from "../constructors/index.js";
import { bindTransition } from "../execution/index.js";
import { declined } from "../constructors/core.js";

const BY_NAME = new Map(CONSTRUCTORS.map((c) => [c.name, c.fn]));

/**
 * reusableIn(procedure, context) — the context gate. Returns
 * { ok, reason, fired } where fired is the invalidation condition that voided
 * the procedure, if any.
 *
 * context: { domain, effectScope, encounters = [], purpose = null }
 */
export function reusableIn(procedure, { domain, effectScope, encounters = [], purpose = null } = {}) {
  const v = validateProcedure(procedure);
  if (!v.valid) return { ok: false, reason: v.errors[0], fired: "invalid_procedure" };

  if (domain && procedure.domain && domain !== procedure.domain) {
    return { ok: false, reason: `procedure domain ${procedure.domain} does not cover context domain ${domain}`, fired: "domain_changed" };
  }
  if (effectScope && procedure.effectScope && effectScope !== procedure.effectScope) {
    return { ok: false, reason: `procedure effect scope ${procedure.effectScope} cannot be reused for ${effectScope} — success cannot launder effects`, fired: "effect_scope_changed" };
  }
  for (const condition of procedure.invalidationConditions ?? []) {
    const fired = conditionFires(condition, { encounters, purpose, domain, effectScope, procedure });
    if (fired) {
      return { ok: false, reason: `invalidation condition fired: ${condition} (${fired})`, fired: condition };
    }
  }
  return { ok: true, reason: "procedure is reusable in this context", fired: null };
}

/**
 * conditionFires(condition, context) — checks one named invalidation condition
 * against the new context. Supported conditions:
 *   "declined-bearer"       — any participant declined the inquiry
 *   "scope-no-longer-admitted" — the procedure's effect scope is not admitted by
 *                            the current encounters
 *   "purpose-changed"       — the reuse purpose differs from a supplied one
 *   "standing-erased"       — the procedure's domain names a standing that reuse
 *                            would erase
 * Unknown conditions fire (a condition you cannot interpret must not be
 * silently ignored).
 */
export function conditionFires(condition, { encounters = [], purpose = null, domain = null, effectScope = null, procedure = null } = {}) {
  switch (condition) {
    case "declined-bearer":
      return (encounters ?? []).some((e) => (e?.participants ?? []).some((p) => p.kind === "withheld")) ? "a participant declined" : null;
    case "scope-no-longer-admitted": {
      const scope = procedure?.effectScope ?? effectScope;
      if (!scope) return null;
      const admitted = new Set((encounters ?? []).flatMap((e) => e?.disclosure_scope ?? []));
      return admitted.has(scope) ? null : `effect scope ${scope} is no longer admitted`;
    }
    case "purpose-changed":
      return purpose && procedure && purpose !== procedure.name ? `purpose changed to ${purpose}` : null;
    case "standing-erased":
      return (encounters ?? []).some((e) => (e?.participants ?? []).some((p) => p.kind === "withheld" && p.identity)) ? "a bearer standing would be erased" : null;
    default:
      return `unknown invalidation condition ${condition}`;
  }
}

/**
 * deriveProcedure(procedure, { purpose, encounters, ...constructArgs }) — the
 * re-derivation itself. Looks up the procedure's constructor by name and calls
 * it against the CURRENT context, producing a freshly bound transition (never
 * a cached one). The procedure's obligations are appended to the derived
 * transition's falsifiers so they ride the construction.
 */
export function deriveProcedure(procedure, { purpose, encounters = [], ...constructArgs } = {}) {
  const gate = reusableIn(procedure, { domain: constructArgs.domain ?? null, effectScope: procedure.effectScope, encounters, purpose });
  if (!gate.ok) return { ok: false, reason: gate.reason, fired: gate.fired };

  const fn = BY_NAME.get(procedure.constructor ?? "");
  if (!fn) return { ok: false, reason: `no constructor named ${procedure.constructor}`, fired: "unknown_constructor" };

  let derived;
  try {
    derived = fn({ purpose, encounters, ...constructArgs });
  } catch (e) {
    return { ok: false, reason: `re-derivation failed: ${e.message}`, fired: null };
  }
  if (!derived || derived.schema !== "SituatedTransition@1") {
    return { ok: false, reason: derived?.reason ?? "constructor returned no derived transition", fired: null, obligation: derived };
  }

  // The obligations ride the reconstruction: they are carried onto the
  // transition so reuse cannot silently drop what the source learned.
  const withObligations = {
    ...derived,
    falsifiers: [...(derived.falsifiers ?? []), ...(procedure.obligations ?? []).map((o) => `obligation: ${o}`)],
  };
  return { ok: true, transition: withObligations, fired: null };
}

export const REUSE = {
  schema: "ProcedureReuse@1",
  version: 1,
  reusableIn,
  conditionFires,
  derive: deriveProcedure,
  describe: "reuse re-derives in the new context; a context change invalidates inappropriate reuse; success cannot launder effects",
};