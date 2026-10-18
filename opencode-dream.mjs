// opencode-dream.mjs — the dream pass over the worknotes/EOT ledger (Phase C1).
// Runs at sleep (door idle timer), never on the hot path. Never deletes: byte length is monotone.
// Promotion requires recurrence >= k witnessed rows without contradiction; promotion is a proposal
// (a dream never speaks for the person).
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
