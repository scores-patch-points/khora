// opencode-dream.mjs — the doorway's door TO THE DREAM. Reads the task's own record and runs
// the khora dream over it: the LIVE answers (opencode-record.js::live) become actions
// (native/organs/waking-dream.js::actionsFrom), folded by the waking dream (recurrence ·
// nomination · discrepancy, over a bounded worktree), settled (contest · meet · candidates),
// and — only when a consequence can be MEASURED — gated (native/organs/consolidation.js::promote).
//
// It names one thing and nothing more: the record's own live-answer row -> a waking action.
// A referent is a being, its live answer is the value, the answering block's id is the witness
// (an independent source — corroboration.js's rule). A fork (a referent with two live answers)
// reaches the dream as a DISCREPANCY with no special case: the same fold discloses it.
//
// PURE over the rows it is handed; dreamRows() imports no filesystem and no surface, so it is
// testable alone. dreamTask() is the one-line wire the doorway calls: it reads the record and
// hands the rows over.
import { live } from "./opencode-record.mjs";
import { actionsFrom, recall } from "./native/organs/waking-dream.js";
import { wake, settle, promote } from "./native/organs/consolidation.js";

/** The record's live-answer shape -> a waking action. being = the referent, value = its live
 *  answer, witness = the answering block's id; the predicate is the record's one relation. */
export const RECORD_LIVE_SPEC = Object.freeze({
  being: (a) => a.referent,
  predicate: () => "answer",
  value: (a) => a.delta0,
  witness: (a) => a.id,
});

/** dreamRows(rows, opts) — the dream over already-read live rows. Pure. */
export function dreamRows(rows = [], { floor = 2, cap = 64, reads = null, consequenceOf = null } = {}) {
  const { actions, skipped } = actionsFrom(rows, RECORD_LIVE_SPEC);
  const waking = wake(actions, { floor, cap });
  const settled = settle(waking, { reads });
  const gated = typeof consequenceOf === "function" ? promote(settled.candidates, { consequenceOf }) : null;
  return Object.freeze({ schema: "OpenCodeDream@1", actions, skipped, waking, settled, gated });
}

/** dreamTask({task}, opts) — the dream over ONE task's record. Reads the record, hands over. */
export function dreamTask({ task } = {}, opts = {}) {
  return dreamRows(live({ task }), opts);
}

export { recall };
