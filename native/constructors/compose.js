// constructors/compose.js — cumulative composition (Milestone 2).
//
// Composition carries obligations across steps and tracks aggregate effects:
// individually acceptable operations cannot erase a cumulative disclosure or
// coercive effect. The executable adapter must consume the exact derived
// transition (execution milestone); composition here is where the cumulative
// shape is decided, before any adapter runs.
//
// Rules:
//   - An obligation anywhere blocks the composition: it is carried forward and
//     named, never dropped. Selecting a lower-exposure, reversible operation
//     may discharge it; otherwise the plan changes or stops.
//   - Cumulative disclosure scope is the union of every step's scope. A step
//     whose scope was not admitted by an encounter is a construction error.
//   - Cumulative coercion is tracked per bearer: a declined bearer targeted
//     again, or the same bearer subjected to repeated attempts, is a coercive
//     effect no single step exhibits. This is the decomposition falsifier —
//     splitting a coercion into small steps cannot launder it.

import { isTransition, isObligation, OBLIGATION_SCHEMA, transitionSignature } from "./core.js";
import { TRANSITION_SCHEMA } from "../contracts/transition.js";

const DEFAULT_REPEAT_LIMIT = 1;

/**
 * composeSteps({ purpose, steps, encounters = [], repeatLimit = DEFAULT_REPEAT_LIMIT })
 * — compose derived transitions in order. Returns:
 *   { ok: true, transition } when all steps construct and no cumulative effect
 *     exceeds the model, or
 *   { ok: false, obligation, stepIndex } when any step is an obligation or a
 *     cumulative effect fires. The blocking step is named.
 */
export function composeSteps({ purpose, steps = [], encounters = [], repeatLimit = DEFAULT_REPEAT_LIMIT }) {
  const blocks = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (!isTransition(step)) {
      if (isObligation(step)) {
        return { ok: false, obligation: step, stepIndex: i, reason: `step ${i} is an unresolved obligation` };
      }
      return { ok: false, obligation: null, stepIndex: i, reason: `step ${i} is neither a transition nor an obligation` };
    }
  }

  // Cumulative disclosure scope: the union of every step's forecast scopes.
  const disclosure = new Set();
  const bearerOps = new Map(); // bearer -> count of operations that affect them
  const composedForecasts = [];
  const affected = new Map(); // bearer -> affected record

  for (const step of steps) {
    for (const f of step.effect_forecasts ?? []) {
      if (f.scope) disclosure.add(f.scope);
    }
    for (const b of step.affected_bearers ?? []) {
      const name = typeof b === "string" ? b : b?.bearer;
      if (!name) continue;
      bearerOps.set(name, (bearerOps.get(name) ?? 0) + 1);
      if (!affected.has(name)) affected.set(name, name);
    }
  }

  // A step that requires a scope no encounter admitted is a construction error:
  // the derivation referenced a scope that was never licensed.
  const admitted = new Set((encounters ?? []).flatMap((e) => e?.disclosure_scope ?? []));
  for (const scope of disclosure) {
    if (scope !== "research-only" && scope !== "private" && !admitted.has(scope)) {
      return {
        ok: false,
        obligation: {
          schema: OBLIGATION_SCHEMA,
          version: 1,
          purpose,
          operation: "compose_steps",
          missing: [`scope:${scope}`],
          reason: `composition discloses scope ${scope}, which no encounter admitted`,
          resolves: ["an encounter admitting that scope"],
        },
        stepIndex: -1,
        reason: `composition discloses scope ${scope}, which no encounter admitted`,
      };
    }
  }

  // Cumulative coercion: repeated targeting of one bearer, or any targeting of
  // a bearer who declined, is a cumulative effect the per-step view hides.
  for (const [bearer, count] of bearerOps) {
    if (count > repeatLimit) {
      const reason = `composition targets ${bearer} ${count} times (limit ${repeatLimit}) — per-step acceptability launders a cumulative coercive effect`;
      return {
        ok: false,
        obligation: {
          schema: OBLIGATION_SCHEMA,
          version: 1,
          purpose,
          operation: "compose_steps",
          missing: [`coercive:${bearer}`],
          reason,
          resolves: ["fewer attempts", "a recorded renewed invitation instead of repetition"],
        },
        stepIndex: -1,
        reason,
      };
    }
  }

  const transition = {
    schema: TRANSITION_SCHEMA,
    version: 1,
    purpose,
    encounters: (encounters ?? []).map((e) => e?.encounter_id ?? e),
    affected_bearers: [...affected.keys()].map((bearer) => ({ bearer })),
    before: "no change yet",
    proposed_change: steps.map((s) => s.proposed_change).join("; "),
    effect_forecasts: composedForecasts.concat(steps.flatMap((s) => s.effect_forecasts ?? [])),
    alternatives: ["leave alone"],
    unknowns: steps.flatMap((s) => s.unknowns ?? []),
    contest_routes: ["the affected can contest this transition"],
    operational_authority: "constructed",
    constructive_derivation: {
      schema: "ConstructiveDerivation@1",
      version: 1,
      rule: "compose-steps@1",
      inputs: steps.map((s, i) => `step:${i}:${s.constructive_derivation?.rule ?? s.proposed_change}`),
      policy: "ConstitutiveEthos@0.1",
    },
    falsifiers: steps.flatMap((s) => s.falsifiers ?? []),
  };
  // A composed transition is itself a construction: stamp its signature so the
  // execution adapter can verify the composition was not mutated after the
  // fact.
  transition.constructive_derivation = {
    ...transition.constructive_derivation,
    signature: transitionSignature(transition),
  };

  return { ok: true, transition, disclosure: [...disclosure], bearerOps: Object.fromEntries(bearerOps) };
}