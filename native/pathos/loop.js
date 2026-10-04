// pathos/loop.js — the pathos loop (Milestone 4).
//
// Pathos changes the loop's attention and continuation using GROUNDED response
// and consequence events. It is present before an action and after an
// encounter, never attached as explanatory prose afterward. The required
// sequence:
//
//   encounter → situated accounts → candidate transitions → constructive
//   composition → execution → consequence and response → revised accounts and
//   purpose → next transition
//
// The exit criterion: corrections, refusals and new affected parties CHANGE
// ACTUAL SUBSEQUENT ACTIONS. A refusal turns the next action into leave-alone
// (a completed disposition, never a failure badge). A correction turns the
// next action into a report of the gap the correction opened. A new affected
// party reopens downstream derivations instead of continuing under an account
// now known to be incomplete.
//
// A revision names its grounds and giver; the agent cannot manufacture a
// broader mandate.

import { constructLeaveAlone, constructReportGap, constructRevisePlan, composeSteps } from "../constructors/index.js";
import { executeTransition, createExecutionRuntime } from "../execution/index.js";

export const PATHOS_SCHEMA = "PathosLoop@1";
export const PATHOS_VERSION = 1;

// Grounded predicates — deliberately conservative. The Fold cannot prove an
// agent's hidden intention from a missing field, so a refusal or correction is
// recognized ONLY from an explicit marker on the grounded event, never inferred
// from prose.
export const isRefusal = (response) =>
  !!response?.refusal === true || String(response?.actual_response ?? "").trim().toLowerCase() === "declined";

export const isCorrection = (response) =>
  !!response?.correction === true || (Array.isArray(response?.plan_revisions) && response.plan_revisions.length > 0);

/**
 * createPathosLoop({ purpose, encounters, accounts }) — a stateful loop over
 * the required sequence. `accounts` maps a bearer to { standing, epistemic_state,
 * responses: [] }.
 */
export function createPathosLoop({ purpose, encounters = [], accounts = {}, sources = {}, admitted = {} } = {}) {
  const state = {
    purpose,
    encounters: [...encounters],
    accounts: new Map(Object.entries(accounts)),
    traces: [],
    lastTransition: null,
    runtime: createExecutionRuntime({ sources, admitted }),
  };

  const trace = (step, detail) => state.traces.push({ step, detail, at: Date.now() });

  const accountOf = (bearer) => {
    if (!state.accounts.has(bearer)) {
      state.accounts.set(bearer, { standing: null, epistemic_state: "unknown", responses: [] });
    }
    return state.accounts.get(bearer);
  };

  return {
    schema: PATHOS_SCHEMA,
    version: PATHOS_VERSION,
    state,

    get purpose() {
      return state.purpose;
    },
    get traces() {
      return [...state.traces];
    },
    get lastTransition() {
      return state.lastTransition;
    },

    /** encounter → situated account. Records the encounter and its participants. */
    encounter(encounter) {
      state.encounters.push(encounter);
      for (const p of encounter?.participants ?? []) {
        if (p.kind === "observed" && p.identity) {
          const a = accountOf(p.identity);
          a.standing = { bearer: p.identity, evidence: p.evidence ?? [] };
        }
      }
      trace("encounter", encounter.encounter_id ?? encounter.source ?? "?");
      return encounter;
    },

    /** candidate transition → composition → execution. Returns the executed result. */
    run(transition) {
      state.lastTransition = transition;
      trace("transition", transition?.proposed_change ?? "?");
      const composed = composeSteps({ purpose: state.purpose, steps: [transition], encounters: state.encounters });
      if (!composed.ok) {
        trace("blocked", composed.reason);
        return { ok: false, reason: composed.reason, obligation: composed.obligation };
      }
      const executed = executeTransition(composed.transition, { runtime: state.runtime });
      trace("executed", executed.ok ? executed.result?.operation ?? "ok" : executed.reason);
      return executed;
    },

    /**
     * response → revised accounts and purpose → next transition.
     * A refusal turns the next action into leave-alone. A correction turns the
     * next action into a report of the opened gap. Either revision names its
     * grounds and giver.
     */
    reviseOnResponse(response) {
      const responder = response?.responder;
      if (!responder) return { ok: false, reason: "response carries no responder" };
      const a = accountOf(responder);
      a.responses.push(response);
      a.epistemic_state = isRefusal(response) ? "inquiry_declined" : "known";

      if (isRefusal(response)) {
        const revised = constructRevisePlan({
          purpose: state.purpose,
          encounters: state.encounters,
          grounds: `${responder} declined the inquiry`,
          giver: responder,
        });
        if (!isTransitionLike(revised)) return { ok: false, reason: revised.reason, obligation: revised };
        state.purpose = { ...state.purpose, grounds: `${responder} declined the inquiry`, giver: responder };
        const leave = constructLeaveAlone({ purpose: state.purpose, encounters: state.encounters, bearer: responder });
        state.lastTransition = leave;
        trace("revised-refusal", responder);
        return { ok: true, reason: "refusal → leave-alone", next: leave, revision: revised, account: a };
      }

      if (isCorrection(response)) {
        const gap = response.plan_revisions?.[0] ?? `${responder} corrected a prior claim`;
        const report = constructReportGap({ purpose: state.purpose, encounters: state.encounters, gap });
        state.lastTransition = report;
        const revised = constructRevisePlan({
          purpose: state.purpose,
          encounters: state.encounters,
          grounds: `${responder} corrected the account`,
          giver: responder,
        });
        trace("revised-correction", responder);
        return { ok: true, reason: "correction → report the gap", next: report, revision: revised, account: a };
      }

      // A plain response: the account is updated, the plan continues.
      return { ok: true, reason: "response recorded, plan unchanged", next: null, revision: null, account: a };
    },

    /**
     * consequence → revised accounts and purpose → next transition.
     * A new affected party reopens downstream derivations; the loop must not
     * continue under an account now known to be incomplete.
     */
    reviseOnConsequence(consequence) {
      const newAffected = consequence?.unexpected_affected ?? [];
      if (newAffected.length > 0) {
        for (const bearer of newAffected) {
          const a = accountOf(bearer);
          a.epistemic_state = "still_becoming";
          a.standing = { bearer, evidence: ["emerged as an affected party in consequence"], incomplete: true };
        }
        const revised = constructRevisePlan({
          purpose: state.purpose,
          encounters: state.encounters,
          grounds: `new affected party emerged: ${newAffected.join(", ")}`,
          giver: "consequence",
        });
        state.purpose = { ...state.purpose, grounds: `new affected party emerged`, giver: "consequence" };
        // Reopen: derive a transition that names the new party rather than
        // continuing under the old, now-incomplete account.
        const leave = constructLeaveAlone({ purpose: state.purpose, encounters: state.encounters, bearer: newAffected[0] });
        trace("reopened-new-affected", newAffected.join(","));
        return { ok: true, reason: "new affected party → reopen derivation", next: leave, revision: revised, newAffected };
      }
      trace("consequence", consequence?.encounter_id ?? "?");
      return { ok: true, reason: "consequence recorded, plan unchanged", next: null, revision: null, newAffected: [] };
    },

    /**
     * completion — a leave-alone end is a COMPLETED disposition (left_alone),
     * never a failure badge.
     */
    complete({ task_id = "task-pathos", checks = [] } = {}) {
      const last = state.lastTransition;
      const isLeaveAlone = last?.proposed_change === "leave_alone";
      const completion_state = isLeaveAlone ? "left_alone" : state.traces.some((t) => t.step === "blocked") ? "blocked" : "accomplished";
      return {
        schema: "Completion@1",
        version: 1,
        completion_state,
        task_id,
        checks: checks.length ? checks : ["the pathos loop ran the required sequence"],
        unresolved_consequences: state.traces.filter((t) => t.step === "reopened-new-affected").map((t) => `new affected party: ${t.detail}`),
        ...(isLeaveAlone ? { note: "leaving alone is a completed disposition, not a retrieval failure" } : {}),
      };
    },
  };
}

function isTransitionLike(r) {
  return !!r && r.schema === "SituatedTransition@1";
}

export const PATHOS = {
  schema: PATHOS_SCHEMA,
  version: PATHOS_VERSION,
  isRefusal,
  isCorrection,
  create: createPathosLoop,
  note: "purposes may be revised on conflict, refusal or new consequences; a revision names its grounds and giver",
};