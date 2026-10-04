// constructors/index.js — the constructors registry (Milestone 2).
//
// Pure action construction: every constructor consumes encounters, standing,
// agency accounts and a declared purpose, and returns either a derived
// SituatedTransition@1 or an UnresolvedObligation@1. Composition carries
// obligations and cumulative effects across steps. No constructor reads text,
// runs a model, or touches the world — that is the execution milestone's
// exact-transition adapters.

export * from "./core.js";
export * from "./actions.js";
export * from "./compose.js";

import * as actions from "./actions.js";

export const CONSTRUCTORS = Object.freeze([
  "constructReadAdmittedMaterial",
  "constructQueryAuthorizedSource",
  "constructInviteVoluntaryInput",
  "constructComputeInIsolation",
  "constructProposeEdit",
  "constructMaterializePrivateArtifact",
  "constructLeaveAlone",
  "constructRevisePlan",
  "constructReportGap",
  "constructPublishExternally",
  "constructCommunicateWithPerson",
].map((name) => ({ name, fn: actions[name] })));

export const INITIAL_ACTION_VOCABULARY = Object.freeze({
  read: "read_admitted_material",
  query: "query_authorized_source",
  invite: "invite_voluntary_input",
  compute: "compute_in_isolation",
  edit: "propose_edit",
  materialize: "materialize_private_artifact",
  leaveAlone: "leave_alone",
  revise: "revise_plan",
  reportGap: "report_gap",
  publish: "publish_externally",
  communicate: "communicate_with_person",
});