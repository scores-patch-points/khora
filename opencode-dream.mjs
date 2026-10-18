// opencode-dream.mjs — the doorway's door TO THE DREAM. Reads the task's own record and runs
// the khora dream over it: the LIVE answers (opencode-record.js::live) become actions
// (native/organs/waking-dream.js::actionsFrom), folded by the waking dream (recurrence ·
// nomination · discrepancy, over a bounded worktree), settled (contest · meet · candidates),
// and — only when a consequence can be MEASURED — gated (native/organs/consolidation.js::promote).
//
// It names one thing and nothing more: the record's own live-answer row -> a waking action.
// A referent is a being, its live answer is the value, the answering block's id is the witness
// (an independent source — corroboration.js's rule). A fork (a referent with two live answers)
// reaches the dream as a DISCREPANCY with no special case: the same fold discloses it.
//
// PURE over the rows it is handed; dreamRows() imports no filesystem and no surface, so it is
// testable alone. dreamTask() is the one-line wire the doorway calls: it reads the record and
// hands the rows over.
import { live } from "./opencode-record.mjs";
import { actionsFrom, recall } from "./native/organs/waking-dream.js";
import { wake, settle, promote } from "./native/organs/consolidation.js";

/** The record's live-answer shape -> a waking action. being = the referent, value = its live
 *  answer, witness = the answering block's id; the predicate is the record's one relation. */
export const RECORD_LIVE_SPEC = Object.freeze({
  being: (a) => a.referent,
  predicate: () => "answer",
  value: (a) => a.delta0,
  witness: (a) => a.id,
});

/** dreamRows(rows, opts) — the dream over already-read live rows. Pure. */
export function dreamRows(rows = [], { floor = 2, cap = 64, reads = null, consequenceOf = null } = {}) {
  const { actions, skipped } = actionsFrom(rows, RECORD_LIVE_SPEC);
  const waking = wake(actions, { floor, cap });
  const settled = settle(waking, { reads });
  const gated = typeof consequenceOf === "function" ? promote(settled.candidates, { consequenceOf }) : null;
  return Object.freeze({ schema: "OpenCodeDream@1", actions, skipped, waking, settled, gated });
}

/** dreamTask({task}, opts) — the dream over ONE task's record. Reads the record, hands over. */
export function dreamTask({ task } = {}, opts = {}) {
  return dreamRows(live({ task }), opts);
}

export { recall };

// ── the worknotes recurrence dream (the door's idle pass; P1/C1/C2/C4) ──
import fs from "node:fs";
import { read as readNotes, mark, taskDir, ident, oneLine } from "./opencode-worknotes.mjs";
import { turnsOf } from "./opencode-worknotes.mjs";
import { declareStake } from "./opencode-stakes.mjs";
import { fade } from "./opencode-delta.mjs";

const K = Number(process.env.FOLD_DREAM_K ?? 2);

export function dream({ task, now = Date.now(), k = K } = {}) {
  const t = ident(task);
  if (!t) return { ok: false, gap: "bad-task" };
  const v = readNotes({ task: t, now });
  const turns = turnsOf({ task: t });
  // recurrence: terms appearing in >= k distinct marks/turns
  const termCounts = new Map();
  const sources = new Map();
  for (const m of v.marks) for (const w of String(m.text).toLowerCase().split(/\W+/)) {
    if (w.length < 4) continue;
    termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
    if (!sources.has(w)) sources.set(w, new Set());
    sources.get(w).add(m.agent);
  }
  for (const turn of turns) {
    const text = `${turn.ask ?? ""} ${turn.text ?? ""}`;
    for (const w of text.toLowerCase().split(/\W+/)) {
      if (w.length < 4) continue;
      // turns count as witnessed (mechanical) recurrence only if grounded in tool calls
      if (turn.grounds?.length) {
        termCounts.set(w, (termCounts.get(w) ?? 0) + 1);
        if (!sources.has(w)) sources.set(w, new Set());
        sources.get(w).add(turn.agent);
      }
    }
  }
  const promoted = [];
  for (const [term, count] of termCounts) {
    if (count < k) continue;
    // never promote said-register rows alone: require >=2 distinct agents (independent witnesses)
    if ((sources.get(term)?.size ?? 0) < 2) continue;
    // contradiction check: if a mark refutes this term, skip
    const refuted = v.marks.some((m) => m.kind === "block" && String(m.text).toLowerCase().includes(term));
    if (refuted) continue;
    mark({ task: t, agent: "dream", kind: "fact", text: `promoted: ${term} (recurrence:${count}, by:dream)` });
    // C2: also land a Stake@1 row (a PROPOSAL — by:"dream", promotedBy provenance; a dream never speaks for the person)
    let stake = null;
    try {
      stake = declareStake({
        task: t,
        referent: `recurrence:${term}`,
        claim: `recurs across ${count} witnessed rows (${sources.get(term)?.size ?? 0} witnesses) without contradiction`,
        kind: "stake",
        frame: { giver: "dream", question: `is ${term} a standing fact of this task?`, ground: `task:${t}` },
        promotedBy: `recurrence:${count}`,
        by: "dream",
      });
    } catch { /* a stake write never blocks the dream */ }
    promoted.push({ term, count, witnesses: sources.get(term)?.size ?? 0, stake: stake?.id ?? null });
  }
  // C4: the night re-derives the reader's holographs so decay is a fold, not hidden state.
  let faded = null;
  try { faded = fade({ task: t }); } catch { /* fading never blocks the dream */ }
  return { ok: true, task: t, promoted, k, marksBefore: v.marks.length, faded };
}
