// opencode-shift.mjs — THE RECORD GATE: record only what SHIFTED understanding, grounded in priors.
//
// The log is a fold of transformations (fold only transformations). This sharpens it: not every
// transformation is a transformation OF UNDERSTANDING. A RESTATEMENT moves nothing — Bateson's zero:
// perceived, and therefore not testimony. A change with no prior and no witness is a claim without a
// ground. Only a DIFFERENCE against what was held, resting on the PRIOR it revises (a parent) or on a
// WITNESSED ground (bytes that exist, an exit code the box ran), is a shift worth the bytes.
//
// This is the same law the store already enforces in two places — content-addressed ids make a repeated
// sentence ONE source (idempotent INS), and `admit` needs a witnessed parent (words cannot admit
// themselves) — stated once, over any candidate transformation.
//
// Pure: no IO, no model, no clock. Typed, never throwing.

// A ground that exists: a file span, a tool result, a test exit the box or the loop judged. Anything an
// agent or a model SAID is a standpoint, not a witness.
export const WITNESS_KINDS = new Set(["file", "tool", "test", "fs"]);

const norm = (v) => (typeof v === "undefined" ? "undefined" : JSON.stringify(v ?? null));

/** Is this source a WITNESSED ground, or only an assertion? */
export function witnessed(source) {
  if (!source || !WITNESS_KINDS.has(source.kind)) return false;
  const m = source.meta ?? {};
  if (source.kind === "test") return (m.judge === "box" || m.judge === "loop") && Number.isFinite(m.exit);
  return !!(source.anchor || m.sha256 || m.exit != null);
}

/**
 * shouldRecord(candidate, prior) → { record, why, prior?, held }
 *   candidate: { unit, value, parent?, source?, event_id? }   a proposed transformation of the belief for `unit`
 *   prior:     { [unit]: { value, event_id? } }                the understanding currently held (the fold so far)
 *
 *   no_difference  the same belief, no new ground             → NOT recorded (a Bateson zero)
 *   ungrounded     a change with no parent and no witness     → NOT recorded (a typed gap)
 *   supersede      a change resting on the prior it revises   → recorded
 *   witness        a change resting on a witnessed ground     → recorded
 */
export function shouldRecord(candidate = {}, prior = {}) {
  const held = prior[candidate.unit];
  const changed = !held || norm(held.value) !== norm(candidate.value);
  if (!changed && !candidate.parent) return { record: false, why: "no_difference", held };
  if (candidate.parent) return { record: true, why: "supersede", prior: candidate.parent, held };
  if (witnessed(candidate.source)) return { record: true, why: "witness", prior: candidate.source, held };
  return { record: false, why: "ungrounded", held };
}

/**
 * recordShifts(candidates) → { understanding, kept, dropped }
 * Fold a stream of candidates into the understanding, keeping only the shifts. `understanding` is the
 * fold (unit → { value, standing, event_id }); `kept` are the recorded shifts; `dropped` are the
 * no-differences and the ungrounded, each with its typed reason — never silently lost.
 */
/**
 * understandingOf({ events, sources }) → { understanding, kept, dropped }
 * Fold a task's EOT log into the UNDERSTANDING. The raw log keeps everything (commons, provenance,
 * replay need it); the understanding — what the record believes — keeps only the shifts grounded in
 * priors: a witnessed change, or a change resting on the prior it revises. A said-thing with no ground
 * is dropped (a standpoint, not knowledge); a restatement is dropped (a Bateson zero). Both come back
 * typed in `dropped`, never lost.
 */
export function understandingOf({ events = [], sources = new Map() } = {}) {
  const prior = {}, kept = [], dropped = [];
  for (const e of events) {
    if (e?.t !== "evt") continue;
    const src = e.source_id ? sources.get(e.source_id) : null;
    const candidate = { unit: String(e.unit ?? e.event_id), value: e.detail ?? e.unit ?? null, parent: e.parent ?? null, source: src, event_id: e.event_id, stage: e.stage, said: e.standing };
    const v = shouldRecord(candidate, prior);
    if (v.record) {
      prior[candidate.unit] = { value: candidate.value, standing: v.why === "witness" ? "witnessed" : "asserted", event_id: e.event_id, stage: e.stage, why: v.why };
      kept.push({ ...candidate, why: v.why });
    } else dropped.push({ ...candidate, why: v.why });
  }
  return { understanding: prior, kept, dropped };
}

export function recordShifts(candidates = []) {
  const understanding = {}, kept = [], dropped = [];
  for (const c of candidates) {
    const v = shouldRecord(c, understanding);
    if (v.record) {
      understanding[c.unit] = { value: c.value, event_id: c.event_id ?? null, standing: v.why === "witness" ? "witnessed" : "asserted" };
      kept.push({ ...c, why: v.why });
    } else dropped.push({ ...c, why: v.why });
  }
  return { understanding, kept, dropped };
}
