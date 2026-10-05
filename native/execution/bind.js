// execution/bind.js — the transition binding (Milestone 3).
//
// The executable adapter must consume the EXACT derived transition: bind
// operation, input hashes, target, scope and policy version so a changed
// target or payload cannot inherit an old derivation. This is realization of
// the plan's semantics, not evidence that its effect forecast is infallible.
//
// Binding is a comparison between two signatures:
//   carried   — the signature the constructor STAMPED onto the derivation at
//               construction time (transitionSignature, constructors/core.js)
//   demanded  — the signature recomputed from the transition's CURRENT fields
// If the two diverge, the transition was mutated after construction and
// execution is refused: no side effect without matching construction.

import { createHash } from "node:crypto";
import { transitionSignature, constructionProof, registeredConstructor, POLICY_VERSION } from "../constructors/core.js";

export const BINDING_SCHEMA = "TransitionBinding@1";
export const BINDING_VERSION = 1;

export const digest = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 20);

/**
 * derivationFingerprint(derivation) — the construction-time signature: rule +
 * author + sorted inputs + policy + stamped signature. This is what the
 * constructor recorded.
 */
export function derivationFingerprint(derivation) {
  if (!derivation?.rule) return null;
  return digest({
    rule: derivation.rule,
    author: derivation.author ?? null,
    inputs: [...(derivation.inputs ?? [])].sort(),
    policy: derivation.policy ?? null,
    signature: derivation.signature ?? null,
  });
}

/**
 * bindTransition(transition) — { ok, reason, carried, demanded }:
 * carried  = the fingerprint of the recorded derivation (rule + author +
 *            inputs + policy + stamped signature)
 * demanded = the signature recomputed from the current fields
 * ok       = they are not both present and different.
 *
 * A transition with NO recorded derivation is not executable at all — nothing
 * constructed it. A transition whose demanded signature differs from the
 * signature stamped at construction was mutated after construction and is
 * refused. A transition whose KEYED PROOF does not verify, or whose derivation
 * names a rule no authorized constructor registered (or an author that does not
 * own the rule), was never produced by an authorized constructor and is
 * refused — recomputing the public hash is not authorship.
 */
export function bindTransition(transition) {
  const carried = derivationFingerprint(transition?.constructive_derivation);
  if (!carried) {
    return { ok: false, reason: "no constructive derivation — the transition was not constructed", carried: null, demanded: null };
  }
  const demanded = transitionSignature(transition);
  const stamped = transition?.constructive_derivation?.signature;
  if (!stamped) {
    return { ok: false, reason: "the derivation carries no construction signature — it was not stamped by a constructor", carried, demanded: null };
  }
  if (stamped !== demanded) {
    return {
      ok: false,
      reason: "the transition was changed after construction — a changed target or payload cannot inherit an old derivation",
      carried,
      demanded,
    };
  }
  // Trusted authorship: the rule must be REGISTERED to an authorized
  // constructor, the derivation must claim that constructor as its author, and
  // the keyed proof must verify. A hand-authored transition that recomputes the
  // public hash but has no valid proof is refused.
  const reg = registeredConstructor(transition?.constructive_derivation?.rule);
  if (!reg) {
    return { ok: false, reason: `the derivation names rule "${transition.constructive_derivation.rule}" which no authorized constructor registered`, carried, demanded };
  }
  if (transition.constructive_derivation.author !== reg.author) {
    return { ok: false, reason: `rule "${transition.constructive_derivation.rule}" is owned by ${reg.author}, not ${transition.constructive_derivation.author ?? "an unregistered author"}`, carried, demanded };
  }
  const proof = transition?.constructive_derivation?.proof;
  if (!proof || proof !== constructionProof(transition)) {
    return { ok: false, reason: "the derivation carries no valid keyed construction proof — a recomputed hash is not authorship", carried, demanded };
  }
  return { ok: true, reason: "the stamped construction signature matches the transition's current fields and the keyed proof verifies against the registered constructor", carried, demanded };
}

export const BINDING = {
  schema: BINDING_SCHEMA,
  version: BINDING_VERSION,
  bind: bindTransition,
};