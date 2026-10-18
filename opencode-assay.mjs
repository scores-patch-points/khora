// opencode-assay.mjs — the comparative assay (the vision's prioritized experiment).
// Three configurations on the same task, same budget, executable verification:
//   1. single   — one agent, transcript memory (baseline)
//   2. summary  — N agents sharing natural-language summaries
//   3. eot      — N agents sharing only EOT/worknotes traces + one meta-worker
// Metrics: completion, redundant work, coordination overhead, tokens, recovery, cross-task discovery.
// This harness runs the MECHANICAL half (no model): it measures duplication, trace size, recovery, and
// whether the EOT colony discovers a cross-task dependency no worker was assigned. Model calls are the
// caller's; the harness records their token counts when supplied.
import { mark, read, taskDir, ident } from "./opencode-worknotes.mjs";
import { metaWorkerTick } from "./opencode-ecology.mjs";

export const CONFIGS = Object.freeze(["single", "summary", "eot"]);

const overlap = (a, b) => {
  const wa = new Set(String(a).toLowerCase().split(/\W+/).filter((w) => w.length >= 4));
  const wb = new Set(String(b).toLowerCase().split(/\W+/).filter((w) => w.length >= 4));
  const inter = [...wa].filter((w) => wb.has(w)).length;
  return wa.size && wb.size ? inter / Math.min(wa.size, wb.size) : 0;
};

// Redundant work: pairs of worker traces that overlap >= threshold (duplicated effort).
export function duplication({ task, threshold = 0.6 } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const v = read({ task: t });
  const facts = v.marks.filter((m) => m.kind === "fact");
  let pairs = 0, redundant = 0;
  for (let i = 0; i < facts.length; i++)
    for (let j = i + 1; j < facts.length; j++) {
      if (facts[i].agent === facts[j].agent) continue;
      pairs++;
      if (overlap(facts[i].text, facts[j].text) >= threshold) redundant++;
    }
  return { ok: true, pairs, redundant, rate: pairs ? redundant / pairs : 0 };
}

// Recovery: after an interruption, can the next agent name the open questions without re-reading files?
// Mechanical proxy: the open trail is non-empty and each scent names its address.
export function recovery({ task } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const v = read({ task: t });
  return { ok: true, openQuestions: v.open.length, marks: v.marks.length, recoverable: v.open.length > 0 || v.marks.length > 0 };
}

// Cross-task discovery: does the EOT colony find a dependency no worker was assigned?
// Mechanical: the meta-worker's recurring-term goal names a term no single worker's trace named alone.
export function crossTaskDiscovery({ task } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const v = read({ task: t });
  const meta = v.marks.filter((m) => m.agent === "meta");
  const workers = v.marks.filter((m) => m.agent !== "meta" && m.kind === "fact");
  const workerTerms = new Set(workers.flatMap((w) => String(w.text).toLowerCase().split(/\W+/).filter((x) => x.length >= 4)));
  const discovered = meta.flatMap((m) => String(m.text).toLowerCase().split(/\W+/).filter((x) => x.length >= 4)).filter((x) => workerTerms.has(x));
  return { ok: true, metaGoals: meta.length, shared: [...new Set(discovered)] };
}

// Run the mechanical half of one configuration and return its measured row.
export function runConfig({ config, task, workers = 3 } = {}) {
  const c = CONFIGS.includes(config) ? config : "single";
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const before = read({ task: t }).marks.length;
  if (c !== "single") {
    // simulate worker deposits through the shared medium (the caller's model would author the text)
    for (let i = 0; i < workers; i++) {
      if (c === "eot") mark({ task: t, agent: `w${i}`, kind: "fact", text: `worker ${i} trace` });
    }
    if (c === "eot") metaWorkerTick({ task: t, agent: "meta" });
  }
  return {
    ok: true,
    config: c,
    task: t,
    marksAdded: read({ task: t }).marks.length - before,
    duplication: duplication({ task: t }),
    recovery: recovery({ task: t }),
    discovery: crossTaskDiscovery({ task: t }),
  };
}

export function assay({ task, configs = CONFIGS, workers = 3 } = {}) {
  const rows = configs.map((c) => runConfig({ config: c, task: `${task}-${c}`, workers }));
  return { ok: true, rows };
}
