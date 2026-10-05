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

import { createHash, createHmac, randomBytes } from "node:crypto";
import { TRANSITION_SCHEMA, validateTransition } from "../contracts/transition.js";

export const OBLIGATION_SCHEMA = "UnresolvedObligation@1";
export const OBLIGATION_VERSION = 1;
export const DERIVATION_SCHEMA = "ConstructiveDerivation@1";
export const DERIVATION_VERSION = 1;

export const POLICY_VERSION = "ConstitutiveEthos@0.1";

export const digest = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 20);

// ── trusted authorship ───────────────────────────────────────────────────────
// A recomputed hash proves consistency, not that an authorized constructor
// produced the transition. The constructor registry + a keyed construction
// proof close that gap: a derivation must name a REGISTERED constructor for its
// rule, and the constructor stamps a keyed proof (HMAC over the transition's
// executable fields, the rule and the recorded inputs) using a construction key
// held only by this module. The seam verifies the proof with the same key and
// checks the author against the registry — so a hand-authored transition that
// merely recomputes a public hash (or names a made-up rule) is refused.
//
// The key is per-process: construction and binding share this module, and the
// trace records the stamped proof for replay (replay never re-binds). A proof
// is a property of the constructor path, not of the source text.

const CONSTRUCTION_KEY = randomBytes(32);

/** constructionProof(transition) — the keyed proof of authorship. */
export function constructionProof(transition) {
  const d = transition?.constructive_derivation ?? {};
  return createHmac("sha256", CONSTRUCTION_KEY)
    .update(JSON.stringify({
      signature: transitionSignature(transition),
      rule: d.rule ?? null,
      author: d.author ?? null,
      inputs: [...(d.inputs ?? [])].sort(),
      policy: d.policy ?? POLICY_VERSION,
    }))
    .digest("hex");
}

/** The registry of authorized constructors: rule → { author, operation }. */
const REGISTRY = new Map();

/**
 * registerConstructor({ rule, author, operation }) — the constructor layer
 * registers each construction rule with the exact constructor that owns it and
 * the operation that rule is allowed to produce. A derivation that names a rule
 * whose author does not match the registry (or a rule no constructor registered)
 * is not a construction.
 */
export function registerConstructor({ rule, author, operation }) {
  REGISTRY.set(rule, Object.freeze({ author, operation }));
  return REGISTRY.get(rule);
}

/** registeredConstructor(rule) — the registered author/operation, or null. */
export function registeredConstructor(rule) {
  return REGISTRY.get(rule) ?? null;
}

export const CONSTRUCTOR_REGISTRY = {
  schema: "ConstructorRegistry@1",
  version: 1,
  entries: () => [...REGISTRY.entries()].map(([rule, { author, operation }]) => ({ rule, author, operation })),
  has: (rule) => REGISTRY.has(rule),
};

/**
 * transitionSignature(transition) — the construction-time signature of a
 * derived transition's executable fields: operation, affected bearers, effect
 * forecasts (scopes AND payloads), and policy. The constructor stamps this onto
 * the derivation; the execution adapter recomputes it from the transition's
 * CURRENT fields and refuses on divergence (a changed target, payload, scope or
 * policy cannot inherit an old derivation). The signature covers the payload so
 * a changed compute spec or read ref is a changed transition.
 */
export function transitionSignature(transition) {
  const targets = (transition?.affected_bearers ?? []).map((b) => (typeof b === "string" ? b : b?.bearer)).filter(Boolean).sort();
  const forecasts = (transition?.effect_forecasts ?? []).map((f) =>
    digest({ effect: f?.effect, scope: f?.scope, payload: f?.payload ?? null }),
  ).sort();
  return digest({
    operation: transition?.proposed_change ?? null,
    targets,
    forecasts,
    policy: transition?.constructive_derivation?.policy ?? POLICY_VERSION,
  });
}

// ── derivation ──────────────────────────────────────────────────────────────
// A constructive derivation names the rule that produced the transition, the
// AUTHOR that owns that rule (from the registry), and the inputs it consumed.
// It is not a gate renamed "physics": the rule must be a REGISTERED construction
// rule, and the inputs must be real records.
export function derivation({ rule, inputs = [], policy = POLICY_VERSION, signature = null }) {
  const reg = registeredConstructor(rule);
  if (!reg) {
    throw new Error(`constructors: derivation names rule "${rule}" which no authorized constructor registered`);
  }
  return Object.freeze({
    schema: DERIVATION_SCHEMA,
    version: DERIVATION_VERSION,
    rule,
    author: reg.author,
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