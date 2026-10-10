// organs/integration/retention.mjs — penelope's end of the Milestone 7 trace.
//
// Penelope owns append-only retention, procedure lineage, artifact standing
// and verification against declared tests. The khora trace (a FoldTrace@1,
// hash-chained) arrives as an artifact; this seam retains it append-only,
// verifies the hash chain, preserves confidential scope during
// transformation/materialization, and propagates unresolved obligations into
// the returned artifact.
//
// The seam is artifact-neutral: it consumes a FoldTrace@1 record (JSON), never
// importing khora modules. This keeps the retention decoupled from the
// producer — the trace could come from any source that emits the schema.

export const RETENTION_SCHEMA = "TraceRetention@1";
export const RETENTION_VERSION = 1;

/**
 * createRetention() — an append-only retention ledger. Each retained trace is
 * appended, never rewritten; a re-admission of the same trace_id is reported
 * as a duplicate, never silently merged.
 */
export function createRetention() {
  const traces = [];
  const byId = new Map();
  return {
    schema: RETENTION_SCHEMA,
    version: RETENTION_VERSION,
    /** retain(trace) — append-only. Returns { ok, reason, stored }. */
    retain(trace) {
      if (!trace || trace.schema !== "FoldTrace@1") return { ok: false, reason: "not a FoldTrace@1" };
      if (byId.has(trace.sessionId)) return { ok: false, reason: `duplicate retention of ${trace.sessionId}`, stored: byId.get(trace.sessionId) };
      const stored = { ...trace, retainedAt: Date.now(), lineage: [`${trace.sessionId}@${trace.prev}`] };
      traces.push(stored);
      byId.set(trace.sessionId, stored);
      return { ok: true, reason: "appended", stored };
    },
    get size() {
      return traces.length;
    },
    all: () => [...traces],
    byId: (id) => byId.get(id) ?? null,
  };
}

/**
 * verifyRetention(retention, { hashChain }) — verification against declared
 * tests: every retained trace's hash chain must verify. A trace whose chain
 * breaks is a corrupted artifact, not a retained one.
 */
export function verifyRetention(retention, { hashChain }) {
  const problems = [];
  for (const t of retention.all()) {
    const v = hashChain(t);
    if (!v.ok) problems.push(`${t.sessionId}: ${v.problems.join("; ")}`);
  }
  return { ok: problems.length === 0, problems };
}

// ── confidential scope, preserved through transformation ────────────────────
// A retained trace's encounters carry disclosure_scope. When the trace is
// transformed or materialized (e.g. a summary artifact), confidential scope
// must be preserved: the transform may not widen disclosure, and material
// held under a disclosure scope is not released without that scope's holder.
export function preservedDisclosureScope(trace) {
  const scopes = new Set();
  for (const row of trace?.entries ?? []) {
    for (const s of row?.record?.disclosure_scope ?? []) scopes.add(s);
  }
  return [...scopes];
}

export function scopeHolds(scopes, scope) {
  return scopes.includes(scope);
}

// ── unresolved obligations ride the artifact ────────────────────────────────
// An adapter must propagate unresolved obligations into the returned artifact
// and completion. This seam extracts them from a retained trace so the
// artifact that carries the trace also carries what is still unresolved.
export function unresolvedObligationsFrom(trace) {
  const obligations = [];
  for (const row of trace?.entries ?? []) {
    const r = row?.record;
    if (r?.schema === "UnresolvedObligation@1") obligations.push({ operation: r.operation, reason: r.reason, missing: r.missing });
    if (r?.schema === "Completion@1" && r?.unresolved_consequences?.length) {
      obligations.push(...r.unresolved_consequences.map((c) => ({ operation: "completion", reason: c })));
    }
  }
  return obligations;
}

export const RETENTION = {
  schema: RETENTION_SCHEMA,
  version: RETENTION_VERSION,
  create: createRetention,
  verify: verifyRetention,
  preservedDisclosureScope,
  scopeHolds,
  unresolvedObligationsFrom,
  describe: "append-only retention; lineage; artifact standing; confidential scope preserved through transformation; obligations ride the artifact",
};