// execution/index.js — the execution seam (Milestone 3).
//
// Exact-transition adapters in an isolated runtime. No side effect without
// matching construction: every executed transition was derived by a
// constructor, bound to its current fields, and performed by its exact
// adapter inside the runtime. Mutation tests expose bypasses.

export * from "./bind.js";
export * from "./adapters.js";

import { executeTransition, createExecutionRuntime, EXACT_ADAPTER } from "./adapters.js";
import { bindTransition } from "./bind.js";

export const EXECUTION = {
  schema: "ExecutionSeam@1",
  version: 1,
  policy: EXACT_ADAPTER.policy,
  operations: EXACT_ADAPTER.operations,
  execute: executeTransition,
  bind: bindTransition,
  runtime: createExecutionRuntime,
  note: "initial autonomy runs in an isolated test environment with no bypass; Node vm alone is not a hardened boundary",
};