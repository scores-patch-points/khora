// opencode-delta.mjs — the MEANING DELTA, in shadow (FOLD_DELTA): how far one admitted block moves a reader's
// holograph. Logos is the delta to the held state; it is measured as KL (bayes), never surprisal — noise is
// maximally surprising, a revision is what moves belief. Slots are STRUCTURE, never words: referent kind,
// relation (new | restated | superseded | negated), check-verdict class, whether the referent was green before.
//
//   - Rows land on the ledger (weft.jsonl) as MeaningDelta@1, with alpha, gamma and reader declared in every row.
//     The holograph is a projection of those rows (rebuilt incrementally), never a second store.
//   - REGISTER GATE: only witnessed rows (the box ran the check) admit to the world holograph; anything else
//     feeds a separate said-holograph. The two never mix (MODEL_NOT_WITNESS applied to the delta).
//   - READERS ARE PLURAL: the workspace reader admits; foreign priors (Zenodotus pockets) are read with predict()
//     only, never admit()ed from the workspace, and their divergence is logged beside, never averaged in.
//   - A delta with no frame {giver, question, ground} is a typed gap (no_for_whom): logged, not counted.
//   - The number lives in the audit row only. rankOf() returns an ORDER (ids), never a score, for surf.
import { createHolograph, admit as holoAdmit, predict } from "./native/kernel/bayes-surprise.js";
import { append, rows, lean } from "./opencode-ledger.mjs";
import { blocks } from "./opencode-record.mjs";
import { turnsOf } from "./opencode-worknotes.mjs";

export const DELTA_ON = () => (process.env.FOLD_DELTA ?? "0") !== "0";
export const DECLARED = Object.freeze({ alpha: 1, gamma: 1 });
const NEGATION = /^\s*(not|no|never|remove[ds]?|revert(ed)?|drop(ped)?|undo|without)\b/i;
const kindOf = (referent) => String(referent).split(/[@:/]/)[0] || "(none)";

/** The structural slots of a block against the block it follows for its referent. */
export function slotsOf(block, prior) {
  const d0 = block.delta?.[0] ?? "";
  let relation = "new";
  if (prior) relation = (prior.delta?.[0] ?? "") === d0 ? "restated" : NEGATION.test(d0) ? "negated" : "superseded";
  return { kind: kindOf(block.referent), relation, verdict: block.check ? "checked" : "unchecked", wasGreen: prior ? "yes" : "no" };
}

// holographs are projections of the ledger's MeaningDelta rows, extended incrementally
const holos = new Map(); // key -> { holo, consumed }
function holoFor(task, reader, register, generation, { alpha, gamma }) {
  const key = `${task}|${reader}|${register}|${generation}`;
  let h = holos.get(key);
  if (!h) { h = { holo: createHolograph({ alpha, gamma }), consumed: 0 }; holos.set(key, h); }
  const mine = rows(task, { schema: "MeaningDelta@1" }).filter((r) => r.reader === reader && r.register === register && r.generation === generation && r.m?.slots && !r.m.gap);
  for (; h.consumed < mine.length; h.consumed++) holoAdmit(h.holo, mine[h.consumed].m.slots);
  return h.holo;
}
export const _forgetHolos = () => holos.clear();

/** Current holograph generation for a reader+register: re-zero rows bump it (old counts stay in the ledger, frozen). */
export const generationOf = (task, reader, register) =>
  rows(task, { schema: "HolographRezero@1" }).filter((r) => r.reader === reader && r.register === register).length;

/**
 * measure({ task, block, judge, frame, reader, priors, alpha, gamma }) → the logged row (and its id).
 * `block` is an EOT block as blocks() parses it; `judge` is "box" | "reported" from admit.
 */
export function measure({ task, block, judge = "reported", frame = null, reader = "workspace", priors = {}, alpha = DECLARED.alpha, gamma = DECLARED.gamma, git = null } = {}) {
  const register = judge === "box" ? "witnessed" : "said";
  const generation = generationOf(task, reader, register);
  const base = { schema: "MeaningDelta@1", op: "EVA", task, referent: block.referent, block: block.id, reader, register, generation, alpha, gamma };
  if (!frame || !frame.giver || !frame.question || !frame.ground) {
    const r = append(task, { ...base, ...lean(task, { clause: block.id }), counted: false, m: { gap: "no_for_whom" } });
    return { ok: true, gap: "no_for_whom", id: r.id };
  }
  const list = blocks(task);
  const idx = list.findIndex((b) => b.id === block.id);
  const prior = [...list.slice(0, idx < 0 ? list.length : idx)].reverse().find((b) => b.referent === block.referent) ?? null;
  const slots = slotsOf(block, prior);
  // DMD gate: a restatement made no difference — the default is not a record. Scored zero, never admitted, never appended.
  if (slots.relation === "restated") return { ok: true, skipped: "no-difference", slots, bayes: 0, surprisal: 0, register };
  const holo = holoFor(task, reader, register, generation, { alpha, gamma });
  // foreign readers: predict() only, never admitted to; their divergence is read beside the workspace's
  const divergence = {};
  for (const [name, foreign] of Object.entries(priors)) divergence[name] = Object.entries(slots).reduce((s, [slot, v]) => s + predict(foreign, slot, String(v)).bits, 0);
  const m = holoAdmit(holo, slots); // measured against the prior as it stood before, then counted
  const h = holos.get(`${task}|${reader}|${register}|${generation}`); h.consumed += 1; // this row is about to land; do not admit it twice
  // the envelope says WHAT HAPPENED (a being admitted, a relation to the block it redefines, a sign changed); `m` is the audit
  const env = lean(task, {
    ins: slots.relation === "new" ? [block.referent] : [],
    con: prior ? [[block.referent, slots.relation, prior.id]] : [],
    eva: slots.relation === "negated" ? [["con", 0]] : [], clause: block.id,
  });
  const r = append(task, { ...base, ...env, git, counted: true, m: { frame, slots, bayes: m.bayes, surprisal: m.surprisal, perSlot: m.perSlot, divergence } });
  return { ok: true, id: r.id, skipped: r.skipped, slots, bayes: m.bayes, surprisal: m.surprisal, register, divergence };
}

/** Re-zero: a new generation, seeded from the reader prior, never from the old counts. The old rows stay on the ledger. */
export function rezero({ task, reader = "workspace", register = "witnessed", reason }) {
  return append(task, { schema: "HolographRezero@1", op: "REC", task, reader, register, reason: String(reason ?? "").slice(0, 200) });
}

/** C4 FADING: per reader, gamma is declared (every MeaningDelta row carries it); the holograph is a
 *  projection of those rows, so decay is a fold, never hidden state. The dream calls this at sleep to
 *  report the generations and drop the in-memory projection so the next read re-derives it fresh. */
export function fade({ task, reader = "workspace", register = "witnessed" } = {}) {
  const gens = rows(task, { schema: "HolographRezero@1" }).filter((r) => r.reader === reader && r.register === register);
  const deltaRows = rows(task, { schema: "MeaningDelta@1" }).filter((r) => r.reader === reader && r.register === register && r.counted);
  const gamma = deltaRows.at(-1)?.gamma ?? DECLARED.gamma;
  _forgetHolos(); // the next read re-derives from the rows (the fold), never a cached count
  return { ok: true, reader, register, generation: gens.length, rows: deltaRows.length, gamma, rededuced: true };
}

/** D1 IMPRESSIONS (audit only): the reader's slots and how settled each is — a projection of the ledger,
 *  named for the audit view. NEVER reaches a model-facing note (see the D2 firewall test). */
export function impressionOf({ task, reader = "workspace", register = "witnessed" } = {}) {
  const generation = generationOf(task, reader, register);
  const mine = rows(task, { schema: "MeaningDelta@1" }).filter((r) => r.reader === reader && r.register === register && r.generation === generation && r.m?.slots && !r.m.gap && r.counted);
  const slots = {};
  for (const r of mine) {
    const s = r.m.slots;
    for (const [k, v] of Object.entries(s)) {
      slots[k] ??= { values: {}, count: 0 };
      slots[k].values[String(v)] = (slots[k].values[String(v)] ?? 0) + 1;
      slots[k].count += 1;
    }
  }
  return { schema: "Impression@1", task, reader, register, generation, alpha: DECLARED.alpha, gamma: DECLARED.gamma, slots, rows: mine.length };
}

/** The ORDER of blocks by delta, highest first (counted witnessed rows only), ids never scores. For surf. */
export function rankOf(task, { reader = "workspace", register = "witnessed" } = {}) {
  return rows(task, { schema: "MeaningDelta@1" })
    .filter((r) => r.counted && r.reader === reader && r.register === register)
    .map((r, i) => ({ block: r.block, referent: r.referent, bayes: r.m.bayes, i }))
    .sort((a, b) => b.bayes - a.bayes || b.i - a.i)
    .map((r) => r.block);
}

/** The ORDER as a turn map (turn n -> position, 0 = moved the reader most), for surf's delta arm.
 *  A block has no turn number, so a turn is scored by the highest-ranked referent its own text names;
 *  a turn naming none is unranked (Infinity). ORDER only: no number reaches the note. */
export function rankTurns(task, opts = {}) {
  const order = rankOf(task, opts); // block ids, highest delta first
  if (!order.length) return new Map();
  const byId = new Map(blocks(task).map((b) => [b.id, b.referent]));
  const posOf = new Map(order.map((id, pos) => [byId.get(id) ?? id, pos]));
  const rank = new Map();
  for (const t of turnsOf({ task })) {
    const text = `${t.ask ?? ""} ${t.text ?? ""}`.toLowerCase();
    let best = Infinity;
    for (const [referent, pos] of posOf) {
      if (referent && text.includes(String(referent).toLowerCase()) && pos < best) best = pos;
    }
    rank.set(t.n, best);
  }
  return rank;
}
