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
import { transitionSignature, POLICY_VERSION } from "../constructors/core.js";

export const BINDING_SCHEMA = "TransitionBinding@1";
export const BINDING_VERSION = 1;

export const digest = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 20);

/**
 * derivationFingerprint(derivation) — the construction-time signature: rule +
 * sorted inputs + policy + stamped signature. This is what the constructor
 * recorded.
 */
export function derivationFingerprint(derivation) {
  if (!derivation?.rule) return null;
  return digest({
    rule: derivation.rule,
    inputs: [...(derivation.inputs ?? [])].sort(),
    policy: derivation.policy ?? null,
    signature: derivation.signature ?? null,
  });
}

/**
 * bindTransition(transition) — { ok, reason, carried, demanded }:
 * carried  = the fingerprint of the recorded derivation (rule + inputs +
 *            policy + stamped signature)
 * demanded = the signature recomputed from the current fields
 * ok       = they are not both present and different.
 *
 * A transition with NO recorded derivation is not executable at all — nothing
 * constructed it. A transition whose demanded signature differs from the
 * signature stamped at construction was mutated after construction and is
 * refused.
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
  return { ok: true, reason: "the stamped construction signature matches the transition's current fields", carried, demanded };
}

export const BINDING = {
  schema: BINDING_SCHEMA,
  version: BINDING_VERSION,
  bind: bindTransition,
};