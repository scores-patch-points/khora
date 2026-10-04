// contracts/core.js — the shared replay and validation core for the Fold's
// artifact-neutral, versioned data contracts.
//
// A contract record is a plain JSON value. "Replay" means: the record can be
// serialized, parsed, validated and reconstructed without any state collapsing
// (no field lost, no identity merged, no testimony invented in transit). This
// is the Milestone 1 exit condition made mechanical.
//
// Validation is structural AND semantic: it rejects shapes that would let a
// fabricated identity or testimony pass as a real one, and it rejects state
// that the contracts explicitly forbid (a flag that grants construction, a
// completion that certifies universe approval, an inference that turns absence
// into agreement).

export const REPLAY_ORDER = Object.freeze([
  "schema",
  "version",
  "encounter_id",
  "standing_id",
  "bearer",
  "time",
  "observer",
  "purpose_id",
  "medium",
  "source_refs",
  "participants",
  "context",
  "observation_method",
  "disclosure_scope",
  "operation",
  "commitments",
  "givers",
  "scope",
  "reported_preferences",
  "rights",
  "legal_authority",
  "descriptive_beliefs",
  "capacities",
  "epistemic_state",
  "supplied_by",
  "review_conditions",
  "purpose",
  "encounters",
  "affected_bearers",
  "before",
  "proposed_change",
  "effect_forecasts",
  "alternatives",
  "unknowns",
  "contest_routes",
  "operational_authority",
  "constructive_derivation",
  "falsifiers",
  "responder",
  "offered_response",
  "actual_response",
  "source_address",
  "plan_revisions",
  "observed_changes",
  "unresolved_effects",
  "unexpected_affected",
  "forecast_revision",
  "completion_state",
  "checks",
  "note",
]);

/**
 * canonicalString(record) — a stable, key-ordered JSON encoding so replay is
 * byte-deterministic regardless of insertion order.
 */
export function canonicalString(record, order = REPLAY_ORDER) {
  if (Array.isArray(record)) return `[${record.map((r) => canonicalString(r, order)).join(",")}]`;
  if (record === null || typeof record !== "object") return JSON.stringify(record);
  const keys = Object.keys(record).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    const ra = ia === -1 ? 1000 : ia;
    const rb = ib === -1 ? 1000 : ib;
    return ra - rb || a.localeCompare(b);
  });
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalString(record[k], order)}`).join(",")}}`;
}

/**
 * replay(record) — round-trip a record through serialization and parse, then
 * confirm the reconstruction is byte-identical. Returns { ok, canonical,
 * restored, reason }.
 */
export function replay(record, order = REPLAY_ORDER) {
  const canonical = canonicalString(record, order);
  let restored;
  try {
    restored = JSON.parse(canonical);
  } catch (e) {
    return { ok: false, canonical, restored: null, reason: `cannot parse canonical form: ${e.message}` };
  }
  const back = canonicalString(restored, order);
  return {
    ok: back === canonical,
    canonical,
    restored,
    reason: back === canonical ? "round-trip preserved all states" : "canonical form did not survive round-trip (collapse)",
  };
}

/**
 * makeValidator({ schema, version, checks }) — builds a validate(record) that
 * returns { valid, schema, version, errors }. `checks` is a list of
 * { name, ok, msg } producers; all must pass for validity.
 */
export function makeValidator({ schema, version, checks }) {
  return function validate(record) {
    const errors = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return { valid: false, schema, version, errors: ["record must be a plain object"] };
    }
    if (record.schema !== schema) errors.push(`schema must be ${schema}, got ${JSON.stringify(record.schema)}`);
    if (record.version !== version) errors.push(`version must be ${version}, got ${JSON.stringify(record.version)}`);
    for (const c of checks) {
      const r = c(record);
      if (r && !r.ok) errors.push(r.msg);
    }
    return { valid: errors.length === 0, schema, version, errors };
  };
}

export const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
export const isArrayOf = (v, pred) => Array.isArray(v) && v.every(pred);
export const isPlainRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);