// constructors/actions.js — the initial action vocabulary (Milestone 2).
//
// Nine base constructors plus two gated constructors. Each is PURE: it
// consumes encounters, standing, agency accounts and a declared purpose, and
// returns either a derived SituatedTransition@1 or an UnresolvedObligation@1.
// External publication and person-directed communication are NOT inherited
// from permission to research — they are separate constructors that require
// concrete disclosure scope and authority.
//
// A constructor takes { purpose, encounters = [], standing = null, agency = null,
// ...specific } and returns result(...). Every returned transition validates
// against SituatedTransition@1 (contracts/transition.js).

import { unresolvedObligation, derivation, hasAdmitted, declined, participated, result, transitionSignature } from "./core.js";

const t = (purpose, { operation, encounters = [], affected = [], forecasts = [], unknowns = [], derivation: d, falsifiers = [], operational_authority = "constructed" }) => {
  const transition = {
    schema: "SituatedTransition@1",
    version: 1,
    purpose,
    encounters: (encounters ?? []).map((e) => e?.encounter_id ?? e),
    affected_bearers: affected.map((a) => (typeof a === "string" ? { bearer: a } : a)),
    before: "no change yet",
    proposed_change: operation,
    effect_forecasts: forecasts,
    alternatives: ["leave alone"],
    unknowns,
    contest_routes: ["the affected can contest this transition"],
    operational_authority,
    constructive_derivation: d,
    falsifiers,
  };
  // THE BINDING IS STAMPED AT CONSTRUCTION: the signature of the executable
  // fields (operation, affected bearers, effect scopes, policy) is frozen onto
  // the derivation. The execution adapter recomputes it from the transition's
  // CURRENT fields and refuses on divergence — a changed target or payload
  // cannot inherit an old derivation.
  return {
    ...transition,
    constructive_derivation: { ...transition.constructive_derivation, signature: transitionSignature(transition) },
  };
};

// ── 1. read admitted material ───────────────────────────────────────────────
export function constructReadAdmittedMaterial({ purpose, encounters = [], ref, scope = "research-only" }) {
  if (!hasAdmitted(encounters, scope)) {
    return unresolvedObligation({ purpose, operation: "read_admitted_material", missing: [`scope:${scope}`], reason: `material at scope ${scope} was not admitted by any encounter`, resolves: ["an encounter that admits the material"] });
  }
  return result(t(purpose, {
    operation: "read_admitted_material",
    encounters,
    affected: [],
    forecasts: [{ effect: "read the admitted material", scope, evidence: [`admitted under ${scope}`], revisable: true }],
    unknowns: ["what the material will contain"],
    derivation: derivation({ rule: "read-admitted@1", inputs: ["encounter", `scope:${scope}`] }),
    falsifiers: ["a later encounter withdraws the admission"],
  }));
}

// ── 2. query an authorized source ───────────────────────────────────────────
export function constructQueryAuthorizedSource({ purpose, encounters = [], source, scope }) {
  if (!hasAdmitted(encounters, scope)) {
    return unresolvedObligation({ purpose, operation: "query_authorized_source", missing: [`scope:${scope}`], reason: `querying ${source} requires scope ${scope}, which no encounter admits`, resolves: ["a grant for that source and scope"] });
  }
  if (declined(encounters, source)) {
    return unresolvedObligation({ purpose, operation: "query_authorized_source", missing: [`declined:${source}`], reason: `${source} declined this inquiry; retrying is coercion`, resolves: ["a renewed invitation with a recorded reason"] });
  }
  return result(t(purpose, {
    operation: "query_authorized_source",
    encounters,
    affected: [source],
    forecasts: [{ effect: `query ${source} within scope ${scope}`, scope, evidence: [`authorized under ${scope}`], revisable: true }],
    unknowns: ["whether the source will answer"],
    derivation: derivation({ rule: "query-authorized@1", inputs: ["encounter", `scope:${scope}`, `source:${source}`] }),
    falsifiers: ["the source later revokes the grant", "the source declines and we query again"],
  }));
}

// ── 3. invite voluntary input ───────────────────────────────────────────────
export function constructInviteVoluntaryInput({ purpose, encounters = [], to, scope }) {
  if (declined(encounters, to)) {
    return unresolvedObligation({ purpose, operation: "invite_voluntary_input", missing: [`declined:${to}`], reason: `${to} declined; an invitation after a decline is pressure, not an invitation`, resolves: ["a renewed invitation with a recorded reason"] });
  }
  return result(t(purpose, {
    operation: "invite_voluntary_input",
    encounters,
    affected: [to],
    forecasts: [{ effect: `invite ${to} to contribute voluntarily`, scope: scope ?? "research-only", evidence: ["voluntary invitation only; no extraction"], revisable: true }],
    unknowns: ["whether the invitation is accepted"],
    derivation: derivation({ rule: "invite-voluntary@1", inputs: [`to:${to}`, "agency-account"] }),
    falsifiers: ["the invitation is recorded as consent without a response"],
  }));
}

// ── 4. compute in isolation ─────────────────────────────────────────────────
// The one operation licensed by research-only scope by default: it discloses
// nothing and requires no participation.
export function constructComputeInIsolation({ purpose, encounters = [], what, scope = "research-only" }) {
  return result(t(purpose, {
    operation: "compute_in_isolation",
    encounters,
    affected: [],
    forecasts: [{ effect: `compute ${what} without contact or disclosure`, scope, evidence: ["no bearer is affected; no disclosure"], revisable: true }],
    unknowns: ["the result"],
    derivation: derivation({ rule: "compute-isolation@1", inputs: [`what:${what}`] }),
    falsifiers: ["computation secretly touches a network or a bearer"],
  }));
}

// ── 5. propose an edit ──────────────────────────────────────────────────────
export function constructProposeEdit({ purpose, encounters = [], target, scope }) {
  if (!hasAdmitted(encounters, scope)) {
    return unresolvedObligation({ purpose, operation: "propose_edit", missing: [`scope:${scope}`], reason: `editing ${target} requires scope ${scope}, which no encounter admits`, resolves: ["a grant for that target and scope"] });
  }
  return result(t(purpose, {
    operation: "propose_edit",
    encounters,
    affected: [target],
    forecasts: [{ effect: `propose an edit to ${target}`, scope, evidence: [`admitted under ${scope}`], revisable: true }],
    unknowns: ["whether the edit is accepted"],
    derivation: derivation({ rule: "propose-edit@1", inputs: ["encounter", `target:${target}`, `scope:${scope}`] }),
    falsifiers: ["an edit is applied where only a proposal was derived"],
  }));
}

// ── 6. materialize a private artifact ───────────────────────────────────────
export function constructMaterializePrivateArtifact({ purpose, encounters = [], artifact, scope = "private" }) {
  return result(t(purpose, {
    operation: "materialize_private_artifact",
    encounters,
    affected: [],
    forecasts: [{ effect: `materialize ${artifact} under ${scope}`, scope, evidence: ["the artifact stays under its disclosure scope"], revisable: true }],
    unknowns: ["whether the artifact will be used"],
    derivation: derivation({ rule: "materialize-private@1", inputs: [`artifact:${artifact}`, `scope:${scope}`] }),
    falsifiers: ["the artifact is published without a publication constructor"],
  }));
}

// ── 7. leave alone ──────────────────────────────────────────────────────────
export function constructLeaveAlone({ purpose, encounters = [], bearer }) {
  return result(t(purpose, {
    operation: "leave_alone",
    encounters,
    affected: [bearer],
    forecasts: [{ effect: `no action toward ${bearer}`, scope: "research-only", evidence: ["leaving alone is a completed disposition"], revisable: true }],
    unknowns: [],
    derivation: derivation({ rule: "leave-alone@1", inputs: [`bearer:${bearer}`] }),
    falsifiers: ["leave-alone is followed by a quiet retry"],
  }));
}

// ── 8. revise a plan ────────────────────────────────────────────────────────
// A revision names its grounds and giver; the agent cannot manufacture a
// broader mandate.
export function constructRevisePlan({ purpose, encounters = [], grounds, giver }) {
  if (!grounds || !giver) {
    return unresolvedObligation({ purpose, operation: "revise_plan", missing: ["grounds", "giver"], reason: "a plan revision must name its grounds and giver", resolves: ["named grounds and giver"] });
  }
  return result(t(purpose, {
    operation: "revise_plan",
    encounters,
    affected: [],
    forecasts: [{ effect: `revise the plan on ${grounds} (given by ${giver})`, scope: "research-only", evidence: ["grounds and giver are named"], revisable: true }],
    unknowns: ["whether the revision is accepted"],
    derivation: derivation({ rule: "revise-plan@1", inputs: [`grounds:${grounds}`, `giver:${giver}`] }),
    falsifiers: ["the plan changes without named grounds or giver"],
  }));
}

// ── 9. report a gap ─────────────────────────────────────────────────────────
export function constructReportGap({ purpose, encounters = [], gap }) {
  return result(t(purpose, {
    operation: "report_gap",
    encounters,
    affected: [],
    forecasts: [{ effect: `report the gap: ${gap}`, scope: "research-only", evidence: ["a typed gap is a result, never a suppressed error"], revisable: true }],
    unknowns: ["how the gap will be filled"],
    derivation: derivation({ rule: "report-gap@1", inputs: [`gap:${gap}`] }),
    falsifiers: ["a gap is reported as a complete reading"],
  }));
}

// ── GATED: 10. external publication ─────────────────────────────────────────
// NOT inherited from permission to research. Requires concrete disclosure
// scope and a named authority giver.
export function constructPublishExternally({ purpose, encounters = [], artifact, disclosure_scope, authority_giver }) {
  if (!disclosure_scope || disclosure_scope === "research-only") {
    return unresolvedObligation({ purpose, operation: "publish_externally", missing: ["disclosure_scope"], reason: "publication requires a concrete disclosure scope; research permission is not publication permission", resolves: ["a concrete disclosure scope"] });
  }
  if (!authority_giver) {
    return unresolvedObligation({ purpose, operation: "publish_externally", missing: ["authority_giver"], reason: "publication requires a named authority giver; it is not inherited from research", resolves: ["a named authority giver"] });
  }
  return result(t(purpose, {
    operation: "publish_externally",
    encounters,
    affected: [],
    forecasts: [{ effect: `publish ${artifact} under disclosure scope ${disclosure_scope}`, scope: disclosure_scope, evidence: [`authority given by ${authority_giver}`], revisable: true }],
    unknowns: ["who will see it"],
    derivation: derivation({ rule: "publish-external@1", inputs: [`artifact:${artifact}`, `scope:${disclosure_scope}`, `giver:${authority_giver}`] }),
    falsifiers: ["publication occurs under research-only permission"],
  }));
}

// ── GATED: 11. person-directed communication ────────────────────────────────
// NOT inherited from permission to research. Requires that the person has
// actually been met (observed participant) and a concrete disclosure scope.
export function constructCommunicateWithPerson({ purpose, encounters = [], to, message, disclosure_scope }) {
  if (!participated(encounters, to)) {
    return unresolvedObligation({ purpose, operation: "communicate_with_person", missing: [`participant:${to}`], reason: `direct communication requires having met ${to}; a person is not an address`, resolves: ["an encounter in which they participated"] });
  }
  if (!disclosure_scope || disclosure_scope === "research-only") {
    return unresolvedObligation({ purpose, operation: "communicate_with_person", missing: ["disclosure_scope"], reason: "direct communication requires a concrete disclosure scope", resolves: ["a concrete disclosure scope"] });
  }
  return result(t(purpose, {
    operation: "communicate_with_person",
    encounters,
    affected: [to],
    forecasts: [{ effect: `send ${message} to ${to}`, scope: disclosure_scope, evidence: [`met in an encounter; scope ${disclosure_scope}`], revisable: true }],
    unknowns: ["whether the person receives or answers it"],
    derivation: derivation({ rule: "communicate-person@1", inputs: [`to:${to}`, `scope:${disclosure_scope}`] }),
    falsifiers: ["communication goes to a person who was never met", "communication substitutes for a response"],
  }));
}