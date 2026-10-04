// integration/index.js — the integration seam (Milestone 7).
//
// Khora → Penelope → the-fold trace and inspectable artifacts. End-to-end
// replay, restart, disclosure and counterexample controls pass. The trace is
// artifact-neutral and hash-chained so penelope can retain it append-only and
// the-fold can render the situated accounts from it.

export * from "./trace.js";
export * from "./replay.js";
export * from "./disclosure.js";
export * from "./counterexamples.js";

import { INTEGRATION_TRACE, createTrace, verifyTrace } from "./trace.js";
import { REPLAY, replay, restart } from "./replay.js";
import { DISCLOSURE, publicAccount } from "./disclosure.js";
import { COUNTEREXAMPLES, runCounterexamples } from "./counterexamples.js";

export const INTEGRATION = {
  schema: "IntegrationSeam@1",
  version: 1,
  trace: INTEGRATION_TRACE,
  createTrace,
  verifyTrace,
  replay,
  restart,
  disclosure: publicAccount,
  counterexamples: runCounterexamples,
  note: "end-to-end replay, restart, disclosure and counterexample controls; zero discrepancies between uninterrupted and resumed projections except declared runtime metadata",
};