// organs/integration/retention.fixture.mjs — a FoldTrace@1 fixture for the
// penelope retention test. This is a self-contained, artifact-neutral trace
// in the exact shape khora's integration seam produces (hash-chained entries
// wrapping M1 records). Penelope consumes it as JSON; it never imports khora.

import { createHash } from "node:crypto";

const hash = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

export function hashChain(trace) {
  const problems = [];
  let expected = hash({ genesis: trace.sessionId, purpose: trace.purpose });
  for (let i = 0; i < (trace.entries ?? []).length; i += 1) {
    const row = trace.entries[i];
    if (row.prevHash !== expected) problems.push(`entry ${i} breaks the hash chain`);
    expected = hash(row);
  }
  if (trace.prev !== expected) problems.push("ledger prevHash does not match the last entry");
  return { ok: problems.length === 0, problems };
}

/**
 * traceFixture() — a deterministic FoldTrace@1 with one encounter, one
 * transition, one effect, one consequence and one completion, hash-chained.
 */
export function traceFixture() {
  const entries = [];
  let prevHash = hash({ genesis: "session-retention", purpose: "answer" });
  const entry = (schema, record) => {
    const row = { seq: entries.length, at: Date.now(), prevHash, schema, record };
    prevHash = hash(row);
    entries.push(row);
    return row;
  };
  entry("Encounter@1", {
    schema: "Encounter@1", version: 1, encounter_id: "enc-r1", time: "2026-10-04T12:00:00Z",
    observer: "the-fold", purpose_id: "purpose-r", medium: "text", source_refs: ["perm:r"],
    participants: [{ kind: "observed", identity: "p1", evidence: ["seen"], scope: ["this encounter"] }],
    context: "a meeting", observation_method: "direct", disclosure_scope: ["cited-material", "queries-to-p1"],
  });
  entry("SituatedTransition@1", { schema: "SituatedTransition@1", version: 1, purpose: "answer", proposed_change: "read_admitted_material" });
  entry("ExecutedEffect@1", { schema: "ExecutedEffect@1", version: 1, operation: "read_admitted_material" });
  entry("Consequence@1", { schema: "Consequence@1", version: 1, encounter_id: "enc-r1", observed_changes: ["read"], unresolved_effects: [], unexpected_affected: [] });
  entry("Completion@1", { schema: "Completion@1", version: 1, completion_state: "accomplished", task_id: "task-r", checks: [], unresolved_consequences: [] });
  return {
    schema: "FoldTrace@1",
    version: 1,
    purpose: "answer",
    sessionId: "session-retention",
    entries,
    prev: prevHash,
  };
}