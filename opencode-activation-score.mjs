// opencode-activation-score.mjs — meta-agent activation over EOT projections.
// A_i = R_i * U_i * C_i - K_i  (proposed heuristic, not established law).
//   R: relevance to current work (0..1)
//   U: uncertainty / unresolved tension (0..1)
//   C: anticipated consequence of resolving (0..1)
//   K: computational + coordination cost (>=0)
// Scopes: local | task | session | project | system  (scales of attention, not authority).
import { ident } from "./opencode-worknotes.mjs";

export const SCOPES = Object.freeze(["local", "task", "session", "project", "system"]);

export function activation({ R = 0, U = 0, C = 0, K = 0 } = {}) {
  const r = Math.max(0, Math.min(1, Number(R) || 0));
  const u = Math.max(0, Math.min(1, Number(U) || 0));
  const c = Math.max(0, Math.min(1, Number(C) || 0));
  const k = Math.max(0, Number(K) || 0);
  return r * u * c - k;
}

// Rank a list of candidate actions { id, R, U, C, K, scope } by activation desc.
export function rankActions(candidates = []) {
  return [...candidates]
    .map((x) => ({ ...x, A: activation(x) }))
    .sort((a, b) => b.A - a.A);
}

// Scope a reflexive observation: which scope notices what.
export const SCOPE_NOTICES = Object.freeze({
  local: "an edit failed a test",
  task: "several attempts hit the same obstacle",
  session: "two workers are duplicating effort",
  project: "similar failures recur across sessions",
  system: "a reasoning mechanism repeatedly fails",
});

export function scopeOf({ reopenCount = 0, duplicateCount = 0, recurringFailureCount = 0, mechanismFailureCount = 0 } = {}) {
  if (mechanismFailureCount > 0) return "system";
  if (recurringFailureCount > 0) return "project";
  if (duplicateCount > 0) return "session";
  if (reopenCount > 1) return "task";
  return "local";
}
