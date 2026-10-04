// integration/trace.js — the integration trace (Milestone 7).
//
// The trace is the replayable record of one end-to-end run: encounters →
// candidate transitions → composition → execution → effects → response and
// consequence → revised accounts and purpose → next transition. It is
// append-only and hash-chained (each entry pins its predecessor), so a later
// step cannot be rewound into an earlier one and a truncated log is detected
// by a hash break.
//
// The trace is artifact-neutral: it carries the M1 contract records and the
// executed-effect records verbatim, so penelope can retain them append-only
// and the-fold can render the situated accounts from them.

import { createHash } from "node:crypto";

export const TRACE_SCHEMA = "FoldTrace@1";
export const TRACE_VERSION = 1;

export const hash = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

/**
 * createTrace({ purpose, sessionId }) — an append-only, hash-chained trace
 * ledger. Each entry: { seq, at, prevHash, schema, ...record }. Every entry
 * records what actually happened, with the record that licensed it.
 */
export function createTrace({ purpose, sessionId = "session-001" } = {}) {
  const entries = [];
  let prevHash = hash({ genesis: sessionId, purpose });
  const entry = (schema, record) => {
    const row = { seq: entries.length, at: Date.now(), prevHash, schema, ...record };
    prevHash = hash(row);
    entries.push(row);
    return row;
  };
  return {
    schema: TRACE_SCHEMA,
    version: TRACE_VERSION,
    purpose,
    sessionId,
    entries,
    recordEncounter: (encounter) => entry("Encounter@1", { record: encounter }),
    recordTransition: (transition) => entry("SituatedTransition@1", { record: transition }),
    recordEffect: (effect) => entry("ExecutedEffect@1", { record: effect }),
    recordResponse: (response) => entry("Response@1", { record: response }),
    recordConsequence: (consequence) => entry("Consequence@1", { record: consequence }),
    recordRevision: (revision) => entry("PlanRevision@1", { record: revision }),
    recordCompletion: (completion) => entry("Completion@1", { record: completion }),
    get prev() {
      return prevHash;
    },
  };
}

/**
 * verifyTrace(trace) — checks the hash chain: every entry's prevHash must
 * equal the hash of its predecessor, and the ledger's prevHash must equal the
 * hash of the last entry. A break means the log was truncated or rewritten.
 */
export function verifyTrace(trace) {
  const entries = trace?.entries ?? [];
  const problems = [];
  let expected = hash({ genesis: trace.sessionId, purpose: trace.purpose });
  for (let i = 0; i < entries.length; i += 1) {
    const row = entries[i];
    if (row.seq !== i) problems.push(`entry ${i} has seq ${row.seq}`);
    if (row.prevHash !== expected) problems.push(`entry ${i} breaks the hash chain`);
    expected = hash(row);
  }
  if (trace.prev !== expected) problems.push("ledger prevHash does not match the last entry");
  return { ok: problems.length === 0, problems };
}

export const INTEGRATION_TRACE = {
  schema: TRACE_SCHEMA,
  version: TRACE_VERSION,
  create: createTrace,
  verify: verifyTrace,
  describe: "append-only, hash-chained; a truncated or rewritten log is detected by a hash break",
};