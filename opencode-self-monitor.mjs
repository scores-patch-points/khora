// opencode-self-monitor.mjs — self-monitoring scopes over the shared record (M4).
// Scopes: local | task | session | project | system (scales of attention, not authority).
// This module reports the scope of attention from observed signals; it does NOT
// fabricate a level-profile from mark kinds (marks are not typed acts). A caller
// that holds typed acts may pass them to `levelProfile` directly.
import { read as readNotes, ident } from "./opencode-worknotes.mjs";
import { scopeOf, SCOPE_NOTICES } from "./opencode-activation-score.mjs";

export { SCOPE_NOTICES };

export function selfCheck({ task, agent = null, signals = {} } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const v = readNotes({ task: t });
  const marks = v.marks ?? [];
  const byAgent = new Map();
  for (const m of marks) byAgent.set(m.agent, (byAgent.get(m.agent) ?? 0) + 1);
  const scope = scopeOf(signals);
  return {
    ok: true,
    task: t,
    scope,
    notices: SCOPE_NOTICES[scope],
    agents: byAgent.size,
    marks: marks.length,
    open: v.open?.length ?? 0,
    finished: v.finished?.length ?? 0,
  };
}
