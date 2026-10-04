// pathos/index.js — the pathos loop seam (Milestone 4).
//
// Response/consequence-driven revisions and useful leave-alone completion.
// Corrections, refusals and new affected parties change ACTUAL SUBSEQUENT
// ACTIONS.

export * from "./loop.js";

import { PATHOS, createPathosLoop, isRefusal, isCorrection } from "./loop.js";

export const PATHOS_SEAM = {
  schema: "PathosSeam@1",
  version: 1,
  ...PATHOS,
  create: createPathosLoop,
  predicates: { isRefusal, isCorrection },
};