// opencode-plan.mjs — recursive planning as a dependency graph over EOT.
// A plan is a set of goals (nodes) with dependencies (edges). Each node: open | resolved | blocked | refuted.
// Stored per task: <root>/<task>/plan.json (append-friendly: rewrite on change, but history preserved in EOT).
// No model: planning is mechanical over witnessed states.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { root as notesRoot, taskDir, ident, oneLine } from "./opencode-worknotes.mjs";

const planFile = (task) => { const d = taskDir(task); return d ? path.join(d, "plan.json") : null; };

const load = (task) => {
  const f = planFile(task);
  if (!f) return { nodes: {}, edges: [] };
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return { nodes: {}, edges: [] }; }
};
const save = (task, plan) => {
  const f = planFile(task);
  if (!f) return { ok: false, gap: "bad-task" };
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(plan, null, 2));
  return { ok: true };
};

export function planCreate({ task, goal, id } = {}) {
  const t = ident(task);
  if (!t || !oneLine(goal)) return { ok: false, gap: "bad-address" };
  const plan = load(t);
  const nid = id && ident(id) ? id : `g-${crypto.createHash("sha1").update(oneLine(goal)).digest("hex").slice(0, 8)}`;
  if (plan.nodes[nid]) return { ok: false, gap: "exists", id: nid };
  plan.nodes[nid] = { id: nid, goal: oneLine(goal), status: "open", created: new Date().toISOString() };
  return save(t, plan).ok ? { ok: true, id: nid } : { ok: false, gap: "write-failed" };
}

export function planDep({ task, from, to } = {}) {
  const t = ident(task);
  if (!t || !from || !to) return { ok: false, gap: "bad-address" };
  const plan = load(t);
  if (!plan.nodes[from] || !plan.nodes[to]) return { ok: false, gap: "unknown-node" };
  if (plan.edges.some((e) => e.from === from && e.to === to)) return { ok: true, duplicate: true };
  plan.edges.push({ from, to });
  return save(t, plan).ok ? { ok: true } : { ok: false, gap: "write-failed" };
}

export function planResolve({ task, id, evidence = "" } = {}) {
  const t = ident(task);
  if (!t || !id || !ident(id)) return { ok: false, gap: "bad-address" };
  const plan = load(t);
  const n = plan.nodes[id];
  if (!n) return { ok: false, gap: "unknown-node" };
  n.status = "resolved";
  n.evidence = oneLine(evidence).slice(0, 200);
  n.resolvedAt = new Date().toISOString();
  // recompute: dependents of a resolved node stay open; a resolved node's blockers unblock
  recompute(plan);
  return save(t, plan).ok ? { ok: true } : { ok: false, gap: "write-failed" };
}

export function planRefute({ task, id, reason = "" } = {}) {
  const t = ident(task);
  if (!t || !id || !ident(id)) return { ok: false, gap: "bad-address" };
  const plan = load(t);
  const n = plan.nodes[id];
  if (!n) return { ok: false, gap: "unknown-node" };
  n.status = "refuted";
  n.reason = oneLine(reason).slice(0, 200);
  n.refutedAt = new Date().toISOString();
  // mechanical: dependents of a refuted node become blocked (lose justification)
  for (const e of plan.edges) if (e.from === id) {
    const dep = plan.nodes[e.to];
    if (dep && dep.status === "open") { dep.status = "blocked"; dep.blockedBy = id; }
  }
  recompute(plan);
  return save(t, plan).ok ? { ok: true } : { ok: false, gap: "write-failed" };
}

function recompute(plan) {
  // A node is blocked if any dependency (from) is refuted; resolved nodes stay resolved.
  for (const id of Object.keys(plan.nodes)) {
    const n = plan.nodes[id];
    if (n.status === "resolved" || n.status === "refuted") continue;
    const blockers = plan.edges.filter((e) => e.to === id).map((e) => plan.nodes[e.from]);
    if (blockers.some((b) => b && b.status === "refuted")) {
      n.status = "blocked"; n.blockedBy = blockers.find((b) => b && b.status === "refuted")?.id;
    } else if (n.status === "blocked" && !blockers.some((b) => b && b.status === "refuted")) {
      n.status = "open"; delete n.blockedBy;
    }
  }
}

export function planView({ task } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const plan = load(t);
  return { ok: true, nodes: Object.values(plan.nodes), edges: plan.edges };
}

export function planNext({ task } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const plan = load(t);
  const open = Object.values(plan.nodes).filter((n) => n.status === "open");
  // prefer nodes with no unresolved dependencies
  const ready = open.filter((n) => !plan.edges.some((e) => e.to === n.id && plan.nodes[e.from]?.status !== "resolved"));
  const pick = (ready.length ? ready : open).sort((a, b) => a.created.localeCompare(b.created))[0];
  return pick ? { ok: true, node: pick } : { ok: false, gap: "no-open" };
}

export function planRemove({ task, id } = {}) {
  const t = ident(task);
  if (!t || !id || !ident(id)) return { ok: false, gap: "bad-address" };
  const plan = load(t);
  if (!plan.nodes[id]) return { ok: false, gap: "unknown-node" };
  delete plan.nodes[id];
  plan.edges = plan.edges.filter((e) => e.from !== id && e.to !== id);
  return save(t, plan).ok ? { ok: true } : { ok: false, gap: "write-failed" };
}
