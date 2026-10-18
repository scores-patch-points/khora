// opencode-ecology.mjs — session ecology: N workers + 1 periodically-activated meta-worker,
// all coordinating through the shared EOT/worknotes medium (no agent-to-agent messages).
import { mark, read, taskDir, ident, oneLine, claim, done } from "./opencode-worknotes.mjs";
import { planCreate, planView } from "./opencode-plan.mjs";
import { activation, rankActions, scopeOf } from "./opencode-activation-score.mjs";

export const WORKERS = 3;
export const META_EVERY_MS = Number(process.env.FOLD_META_EVERY_MS ?? 30_000);

// A worker acts on one high-activation opportunity and leaves a trace.
export function workerAct({ task, agent, observation, R = 0.5, U = 0.5, C = 0.5, K = 0.1 } = {}) {
  const a = ident(agent);
  if (!a || !oneLine(observation)) return { ok: false, gap: "bad-address" };
  mark({ task, agent: a, kind: "fact", text: observation });
  const A = activation({ R, U, C, K });
  return { ok: true, activation: A, scope: scopeOf({ reopenCount: A < 0 ? 1 : 0 }) };
}

// A worker selects the highest-activation opportunity it can CLAIM (claims are the
// contention mark: two workers never take the same item). Returns its assignment.
export function workerPick({ task, agent, candidates = [], now = Date.now() } = {}) {
  const a = ident(agent);
  if (!a) return { ok: false, gap: "bad-address" };
  const ranked = rankActions(candidates);
  for (const c of ranked) {
    const item = `act:${c.id}`;
    const got = claim({ task, agent: a, item, now });
    if (got.ok) return { ok: true, agent: a, id: c.id, activation: c.A, claimed: true };
    // contended or done: try the next opportunity
  }
  return { ok: false, gap: "no-free-opportunity", agent: a };
}

// Run an ecology: N workers each pick+claim a distinct opportunity, then one meta-worker
// reads the shared record and nominates a plan goal. All coordination is through the medium.
export function runEcology({ task, candidates = [], workers = WORKERS, now = Date.now() } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const assignments = [];
  for (let i = 0; i < workers; i++) {
    const r = workerPick({ task: t, agent: `w${i}`, candidates, now });
    if (r.ok) {
      mark({ task: t, agent: r.agent, kind: "fact", text: `working: ${r.id}`, now });
      done({ task: t, agent: r.agent, item: `act:${r.id}`, now });
      assignments.push({ agent: r.agent, id: r.id, activation: r.activation });
    }
  }
  const meta = metaWorkerTick({ task: t, now });
  return { ok: true, task: t, assignments, meta };
}

// Meta-worker reads the shared record's patterns and nominates a plan goal.
export function metaWorkerTick({ task, agent = "meta" } = {}) {
  const v = read({ task });
  const facts = v.marks.filter((m) => m.kind === "fact");
  // detect recurring terms across facts
  const termCounts = new Map();
  for (const f of facts) for (const w of String(f.text).toLowerCase().split(/\W+/)) {
    if (w.length < 4) continue;
    termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
  }
  const recurring = [...termCounts.entries()].filter(([, c]) => c >= 2).map(([w]) => w);
  const goal = recurring.length ? `investigate recurring: ${recurring.slice(0, 5).join(", ")}` : "no recurring pattern yet";
  const r = planCreate({ task, goal });
  // deposit the finding in the shared medium so other agents encounter it (stigmergy by construction)
  if (recurring.length) mark({ task, agent: "meta", kind: "fact", text: goal });
  return { ok: true, recurring, goal, plan: r };
}

export function ecologyStatus({ task } = {}) {
  const v = read({ task });
  return { marks: v.marks.length, open: v.open.length, finished: v.finished.length, plan: planView({ task }) };
}
