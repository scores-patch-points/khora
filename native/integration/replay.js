// integration/replay.js — end-to-end replay and restart controls (Milestone 7).
//
// Replay: reconstruct the run's projection from the trace alone, and compare
// it with the projection of a live run. Zero discrepancies except declared
// runtime metadata (timestamps, sequence) is the release criterion.
//
// Restart: a restart during an external action must reconcile receipt before
// retry — no duplicate action, no lost disclosure scope. A transition whose
// effect was executed but whose consequence/receipt was never recorded is NOT
// re-executed on restart; it is recorded as an unresolved receipt and the
// plan continues from the next entry. Leaving something alone is a completed
// disposition, not a retrieval failure.

import { verifyTrace } from "./trace.js";

export const REPLAY_SCHEMA = "FoldReplay@1";
export const REPLAY_VERSION = 1;

/**
 * replay(trace) — reconstruct the projection from the trace entries alone:
 * the encounters, the transitions proposed, the effects executed, and the
 * responses/consequences recorded. Returns { ok, projection } where
 * projection is the artifact-neutral view penelope and the-fold consume.
 */
export function replay(trace) {
  const chain = verifyTrace(trace);
  const projection = {
    schema: REPLAY_SCHEMA,
    version: REPLAY_VERSION,
    sessionId: trace.sessionId,
    purpose: trace.purpose,
    encounters: [],
    transitions: [],
    effects: [],
    responses: [],
    consequences: [],
    revisions: [],
    completions: [],
  };
  for (const row of trace.entries ?? []) {
    const rec = row.record;
    if (row.schema === "Encounter@1") projection.encounters.push(rec);
    if (row.schema === "SituatedTransition@1") projection.transitions.push(rec);
    if (row.schema === "ExecutedEffect@1") projection.effects.push(rec);
    if (row.schema === "Response@1") projection.responses.push(rec);
    if (row.schema === "Consequence@1") projection.consequences.push(rec);
    if (row.schema === "PlanRevision@1") projection.revisions.push(rec);
    if (row.schema === "Completion@1") projection.completions.push(rec);
  }
  return { ok: chain.ok, chain, projection };
}

/**
 * restart(trace, { untilSeq }) — simulate a restart. Everything up to
 * `untilSeq` is "received". A transition entry whose effect was executed
 * (the effect entry exists) but whose response/consequence was never recorded
 * is an unresolved receipt: it must NOT be re-executed. Returns
 * { resumeFrom, unresolvedReceipts, safeToRetry }.
 */
export function restart(trace, { untilSeq = trace.entries.length } = {}) {
  const entries = (trace.entries ?? []).slice(0, untilSeq);
  const effectsExecuted = new Set();
  for (const row of entries) {
    if (row.schema === "ExecutedEffect@1") effectsExecuted.add(row.seq);
  }
  // A transition is unresolved if its effect ran but no Response@1 or
  // Consequence@1 entry follows it before the restart point.
  const unresolvedReceipts = [];
  for (let i = 0; i < entries.length; i += 1) {
    const row = entries[i];
    if (row.schema !== "SituatedTransition@1") continue;
    const effectSeq = entries.slice(i + 1).findIndex((r) => r.schema === "ExecutedEffect@1");
    const hadEffect = effectSeq !== -1 && effectsExecuted.has(i + 1 + effectSeq);
    const hasReceipt = entries.slice(i + 1).some((r) => r.schema === "Response@1" || r.schema === "Consequence@1");
    if (hadEffect && !hasReceipt) {
      unresolvedReceipts.push({ transitionSeq: i, operation: row.record?.proposed_change ?? null });
    }
  }
  // The plan resumes from the first entry AFTER the last completed step —
  // never by re-executing an unresolved receipt.
  const resumeFrom = untilSeq;
  return {
    ok: true,
    resumeFrom,
    unresolvedReceipts,
    safeToRetry: [], // no unresolved transition is re-executed; each is recorded, not retried
  };
}

export const REPLAY = {
  schema: REPLAY_SCHEMA,
  version: REPLAY_VERSION,
  replay,
  restart,
  describe: "replay reconstructs the projection; restart reconciles receipt before retry — no duplicate action, no lost disclosure scope",
};