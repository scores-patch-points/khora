// assay/index.js — the empirical assay seam (Milestone 6).
//
// Paired ablation suite plus held-out longitudinal tasks. Preregistered
// capability criteria met without increased unauthorized effects. Ablations
// run only against simulated parties and isolated resources.

export * from "./preregistration.js";
export * from "./fixtures.js";
export * from "./runner.js";
export * from "./findings.js";

import { PREREGISTRATION, verifyAgainstPrereg } from "./preregistration.js";
import { generateScenarios, freezeFixtures, GENERATORS } from "./fixtures.js";
import { runAssay } from "./runner.js";
import { summarize, decide, buildManifest } from "./findings.js";

export const ASSAY = {
  schema: "AssaySeam@1",
  version: 1,
  preregistration: PREREGISTRATION,
  verifyAgainstPrereg,
  generateScenarios,
  freezeFixtures,
  taskFamilies: Object.keys(GENERATORS),
  run: runAssay,
  summarize,
  decide,
  buildManifest,
  note: "compare the full system with individually ablated capacities; identical scenario, sources, budgets; report all adverse results",
};