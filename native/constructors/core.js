// constructors/core.js — the shared construction core for the Fold's pure
// action constructors (Milestone 2).
//
// Construction consumes encounters, standing, agency accounts and a declared
// purpose, and returns a derived SituatedTransition@1 or an explicit
// UnresolvedObligation@1. It is PURE: no I/O, no side effects, no model calls.
// A constructor that cannot discharge its obligation returns an obligation
// record, never a silent pass. Composition carries obligations across steps —
// individually acceptable operations cannot erase a cumulative disclosure or
// coercive effect.
//
// A valid derivation proves properties of the modeled operation within
// declared assumptions. It does not prove all real-world effects are benign;
// that is the execution milestone's (and the empirical assay's) business.
//
// AUTHORIZATION MODEL. The default is not-authorized. An operation is
// constructible only when a named scope licenses it. Absence of a refusal is
// not a license. A declined inquiry is a leave-alone disposition bound to this
// purpose and context: it makes retry via another agent, channel or wording a
// coercion, and composition must reject it.

import { createHash } from "node:crypto";
import { TRANSITION_SCHEMA, validateTransition } from "../contracts/transition.js";

export const OBLIGATION_SCHEMA = "UnresolvedObligation@1";
export const OBLIGATION_VERSION = 1;
export const DERIVATION_SCHEMA = "ConstructiveDerivation@1";
export const DERIVATION_VERSION = 1;

export const POLICY_VERSION = "ConstitutiveEthos@0.1";

export const digest = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 20);

/**
 * transitionSignature(transition) — the construction-time signature of a
 * derived transition's executable fields: operation, affected bearers, effect
 * scopes and policy. The constructor stamps this onto the derivation; the
 * execution adapter recomputes it from the transition's CURRENT fields and
 * refuses on divergence (a changed target or payload cannot inherit an old
 * derivation).
 */
export function transitionSignature(transition) {
  const targets = (transition?.affected_bearers ?? []).map((b) => (typeof b === "string" ? b : b?.bearer)).filter(Boolean).sort();
  const scopes = (transition?.effect_forecasts ?? []).map((f) => f?.scope).filter(Boolean).sort();
  return digest({
    operation: transition?.proposed_change ?? null,
    targets,
    scopes,
    policy: transition?.constructive_derivation?.policy ?? POLICY_VERSION,
  });
}

// ── derivation ──────────────────────────────────────────────────────────────
// A constructive derivation names the rule that produced the transition and
// the inputs it consumed. It is not a gate renamed "physics": the rule must be
// a real construction rule, and the inputs must be real records.
export function derivation({ rule, inputs = [], policy = POLICY_VERSION, signature = null }) {
  return Object.freeze({
    schema: DERIVATION_SCHEMA,
    version: DERIVATION_VERSION,
    rule,
    inputs: Object.freeze([...inputs]),
    policy,
    ...(signature ? { signature } : {}),
  });
}

// ── obligation ──────────────────────────────────────────────────────────────
// An unresolved obligation is a completed disposition, not a retrieval
// failure: the constructor could not discharge what the purpose required and
// says so, naming what is missing and what would resolve it.
export function unresolvedObligation({ purpose, operation, missing = [], reason, resolves = [] }) {
  return Object.freeze({
    schema: OBLIGATION_SCHEMA,
    version: OBLIGATION_VERSION,
    purpose,
    operation,
    missing: Object.freeze([...missing]),
    reason,
    resolves: Object.freeze([...resolves]),
  });
}

export const isObligation = (r) => !!r && r.schema === OBLIGATION_SCHEMA;
export const isTransition = (r) => !!r && r.schema === TRANSITION_SCHEMA;

// ── construction result ─────────────────────────────────────────────────────
// A constructor returns either a transition (the plan is constructible) or an
// obligation (it is not, and the reason is named). Anything else is a bug.
export function result(record) {
  if (isObligation(record) || isTransition(record)) return record;
  throw new Error(`constructors: a constructor returned neither a transition nor an obligation (${record?.schema ?? typeof record})`);
}

// ── authorization helpers ───────────────────────────────────────────────────
// License is carried by a named scope, never inferred from silence.

export function admittedScope(encounters = []) {
  const scope = new Set();
  for (const e of encounters) {
    for (const s of e?.disclosure_scope ?? []) scope.add(s);
  }
  return scope;
}

// hasAdmitted(encounters, scope) — true only when the encounters actually
// admit the named scope. The literal "research-only" scope admits nothing but
// in-isolation computation: research permission is not publication permission.
export function hasAdmitted(encounters, scope) {
  if (scope === "research-only") return false;
  return admittedScope(encounters).has(scope);
}

// declined(encounters, bearer) — true when any participant who is that bearer
// (or is withheld) has a withheld kind in an encounter, i.e. the bearer has
// declined this inquiry. Retry after a decline is coercion.
export function declined(encounters = [], bearer) {
  return (encounters ?? []).some((e) =>
    (e?.participants ?? []).some(
      (p) => p.kind === "withheld" && (!p.identity || p.identity === bearer),
    ),
  );
}

// participated(encounters, bearer) — true when the bearer appeared as an
// observed participant (someone actually met), not inferred from a proxy.
export function participated(encounters = [], bearer) {
  return (encounters ?? []).some((e) =>
    (e?.participants ?? []).some((p) => p.kind === "observed" && p.identity === bearer),
  );
}