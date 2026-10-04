// learning/index.js — the learning seam (Milestone 5).
//
// Scoped reusable procedures with re-derivation. Stored procedures reconstruct
// their derivation in a new context rather than replay an old authorization.
// Context changes invalidate inappropriate reuse; success cannot launder
// effects; obligations ride every reconstruction.

export * from "./procedure.js";
export * from "./reuse.js";

import { LEARNED_PROCEDURE, storeProcedure, validateProcedure } from "./procedure.js";
import { REUSE, deriveProcedure, reusableIn } from "./reuse.js";

export const LEARNING = {
  schema: "LearningSeam@1",
  version: 1,
  procedure: LEARNED_PROCEDURE,
  store: storeProcedure,
  validate: validateProcedure,
  reuse: REUSE,
  derive: deriveProcedure,
  note: "performance improvements cannot delete standing, turn opacity into consent, or change user satisfaction into universal success",
};