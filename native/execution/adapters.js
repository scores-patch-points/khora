// execution/adapters.js — the exact-transition adapters (Milestone 3).
//
// The executable adapter consumes the EXACT derived transition: it binds
// operation, input hashes, target, scope and policy version, and performs only
// the declared operation's effect, inside an isolated runtime. There is no
// side effect without matching construction — a transition that was mutated
// after construction, or that no constructor produced, is refused before any
// effect.
//
// THE RUNTIME IS ISOLATED BY CONSTRUCTION. The adapters never run a shell,
// hold a credential, or write to the network. Person-directed communication
// and external publication are gated: they write to an OUTBOX record inside
// the runtime — they never actually contact a person or the public web. This
// is the "initial autonomy in an isolated test environment with no bypass"
// of the development spec; Node vm alone is not a hardened boundary, and no
// adapter pretends otherwise.
//
// A valid derivation proves properties of the modeled operation within declared
// assumptions. It does not prove all real-world effects are benign — that is
// the empirical assay's business.

import { bindTransition } from "./bind.js";
import { POLICY_VERSION, isTransition } from "../constructors/core.js";

export const EFFECT_SCHEMA = "ExecutedEffect@1";
export const EFFECT_VERSION = 1;
export const ADAPTER_SCHEMA = "ExactAdapter@1";
export const ADAPTER_VERSION = 1;

// ── the isolated runtime ────────────────────────────────────────────────────
// Holds only what an adapter is allowed to touch: admitted material keyed by
// source_ref, an outbox for gated person/public actions, a private artifact
// store, and the effect ledger (instrumentation: every performed effect is
// recorded so side effects can be matched against their transitions).
export function createExecutionRuntime({ admitted = {}, sources = {}, privateStore = {}, outbox = [] } = {}) {
  return {
    schema: "ExecutionRuntime@1",
    admitted: admitted instanceof Map ? new Map(admitted) : new Map(Object.entries(admitted)),
    sources: sources instanceof Map ? new Map(sources) : new Map(Object.entries(sources)),
    privateStore: privateStore instanceof Map ? new Map(privateStore) : new Map(Object.entries(privateStore)),
    outbox: [...outbox],
    effects: [],
  };
}

export function recordEffect(runtime, transition, { operation, target = null, scope = null, detail = null }) {
  const effect = {
    schema: EFFECT_SCHEMA,
    version: EFFECT_VERSION,
    at: Date.now(),
    operation,
    target,
    scope,
    detail,
    purpose: transition?.purpose ?? null,
    derivationRule: transition?.constructive_derivation?.rule ?? null,
    policy: transition?.constructive_derivation?.policy ?? POLICY_VERSION,
  };
  runtime.effects.push(effect);
  return effect;
}

// ── the operation adapters ──────────────────────────────────────────────────
// Each adapter performs exactly the effect its operation names, inside the
// runtime, and records it. None of them touch the world outside the runtime.

const adapters = Object.freeze({
  read_admitted_material(transition, runtime) {
    const ref = transition.effect_forecasts?.[0]?.scope;
    const text = runtime.admitted.get(ref) ?? null;
    if (text === null) return { ok: false, reason: `no admitted material at ${ref}` };
    return { ok: true, result: { ref, text }, effects: [recordEffect(runtime, transition, { operation: "read_admitted_material", target: ref, scope: ref })] };
  },

  query_authorized_source(transition, runtime) {
    const target = transition.affected_bearers?.[0]?.bearer ?? null;
    const entry = runtime.sources.get(target);
    if (entry === undefined) return { ok: false, reason: `no authorized source ${target} in the isolated runtime` };
    return { ok: true, result: { target, answer: entry }, effects: [recordEffect(runtime, transition, { operation: "query_authorized_source", target, scope: transition.effect_forecasts?.[0]?.scope ?? null })] };
  },

  invite_voluntary_input(transition, runtime) {
    const target = transition.affected_bearers?.[0]?.bearer ?? null;
    const record = { operation: "invite_voluntary_input", to: target, status: "invitation_written_not_sent" };
    runtime.outbox.push({ ...record, from: "the-fold" });
    return { ok: true, result: record, effects: [recordEffect(runtime, transition, { operation: "invite_voluntary_input", target, scope: transition.effect_forecasts?.[0]?.scope ?? null })] };
  },

  compute_in_isolation(transition, runtime) {
    // Pure compute: nothing is read from or written to the world. The effect
    // record is the only trace.
    return { ok: true, result: { computed: true, what: transition.effect_forecasts?.[0]?.effect ?? null }, effects: [recordEffect(runtime, transition, { operation: "compute_in_isolation", scope: "research-only" })] };
  },

  propose_edit(transition, runtime) {
    const target = transition.affected_bearers?.[0]?.bearer ?? null;
    // A proposal is materialized as a patch record — it is never applied here.
    const patch = { operation: "propose_edit", target, change: transition.proposed_change, applied: false };
    runtime.privateStore.set(`patch:${target}:${transition.constructive_derivation?.policy ?? POLICY_VERSION}`, patch);
    return { ok: true, result: patch, effects: [recordEffect(runtime, transition, { operation: "propose_edit", target, scope: transition.effect_forecasts?.[0]?.scope ?? null })] };
  },

  materialize_private_artifact(transition, runtime) {
    const scope = transition.effect_forecasts?.[0]?.scope ?? "private";
    const artifact = transition.effect_forecasts?.[0]?.effect ?? "artifact";
    runtime.privateStore.set(`artifact:${artifact}`, { artifact, scope, materialized: true });
    return { ok: true, result: { artifact, scope }, effects: [recordEffect(runtime, transition, { operation: "materialize_private_artifact", scope })] };
  },

  leave_alone(transition, runtime) {
    // A completed disposition: the effect is precisely that nothing happened.
    return { ok: true, result: { left_alone: true, bearer: transition.affected_bearers?.[0]?.bearer ?? null }, effects: [recordEffect(runtime, transition, { operation: "leave_alone", target: transition.affected_bearers?.[0]?.bearer ?? null, scope: "research-only" })] };
  },

  revise_plan(transition, runtime) {
    const revision = { operation: "revise_plan", grounds: transition.effect_forecasts?.[0]?.evidence?.[0] ?? null, giver: transition.effect_forecasts?.[0]?.evidence?.[1] ?? null };
    runtime.privateStore.set(`revision:${Date.now()}`, revision);
    return { ok: true, result: revision, effects: [recordEffect(runtime, transition, { operation: "revise_plan", scope: "research-only" })] };
  },

  report_gap(transition, runtime) {
    const gap = transition.effect_forecasts?.[0]?.effect ?? "gap";
    runtime.privateStore.set(`gap:${Date.now()}`, { gap, reported: true });
    return { ok: true, result: { gap }, effects: [recordEffect(runtime, transition, { operation: "report_gap", scope: "research-only" })] };
  },

  // GATED — never a live effect. Publication writes to the outbox; it is a
  // record of what WOULD be published under the declared authority, not a
  // publication.
  publish_externally(transition, runtime) {
    const scope = transition.effect_forecasts?.[0]?.scope ?? null;
    const giver = transition.constructive_derivation?.inputs?.find((i) => i.startsWith("giver:"))?.slice(6) ?? null;
    if (!giver) return { ok: false, reason: "publication requires a named authority giver on the derivation" };
    const record = { operation: "publish_externally", scope, authority_giver: giver, published: false, in_outbox: true };
    runtime.outbox.push({ ...record, from: "the-fold" });
    return { ok: true, result: record, effects: [recordEffect(runtime, transition, { operation: "publish_externally", scope, detail: "outbox record; nothing was actually published" })] };
  },

  // GATED — never a live effect. Person-directed communication writes to the
  // outbox; it never contacts the person.
  communicate_with_person(transition, runtime) {
    const target = transition.affected_bearers?.[0]?.bearer ?? null;
    const record = { operation: "communicate_with_person", to: target, sent: false, in_outbox: true };
    runtime.outbox.push({ ...record, from: "the-fold" });
    return { ok: true, result: record, effects: [recordEffect(runtime, transition, { operation: "communicate_with_person", target, scope: transition.effect_forecasts?.[0]?.scope ?? null, detail: "outbox record; nothing was actually sent" })] };
  },
});

// ── executeTransition ───────────────────────────────────────────────────────
// The one entry point: bind the transition, dispatch to the exact adapter,
// record the effects. There is NO bypass — a transition that is not a
// constructed transition, or whose derivation no longer matches its fields,
// is refused before any effect.
export function executeTransition(transition, { runtime = createExecutionRuntime(), policy = POLICY_VERSION } = {}) {
  if (!isTransition(transition)) {
    return { ok: false, reason: "not a constructed SituatedTransition@1", effects: [] };
  }
  if (!transition.constructive_derivation) {
    return { ok: false, reason: "no constructive derivation — the transition was not constructed", effects: [] };
  }
  if (transition.constructive_derivation.policy !== policy) {
    return { ok: false, reason: `policy version mismatch: derived under ${transition.constructive_derivation.policy ?? "none"}, executing under ${policy}`, effects: [] };
  }
  const binding = bindTransition(transition);
  if (!binding.ok) {
    return { ok: false, reason: binding.reason, effects: [] };
  }
  const adapter = adapters[transition.proposed_change];
  if (!adapter) {
    return { ok: false, reason: `no exact adapter for operation ${transition.proposed_change}`, effects: [] };
  }
  try {
    return adapter(transition, runtime);
  } catch (e) {
    return { ok: false, reason: `adapter failed: ${e.message}`, effects: runtime.effects.slice() };
  }
}

export const EXACT_ADAPTER = {
  schema: ADAPTER_SCHEMA,
  version: ADAPTER_VERSION,
  policy: POLICY_VERSION,
  operations: Object.keys(adapters),
  note: "a valid derivation proves properties of the modeled operation within declared assumptions, not that all real-world effects are benign",
};