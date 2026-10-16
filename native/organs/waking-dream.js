// organs/waking-dream.js — THE WAKING DREAM: the prequential half of the dream, and the
// worktree pruner.
//
// Handle: Buzsáki — after György Buzsáki, whose sharp-wave ripples replay the day's paths
// during rest AND quiet wakefulness; the dream runs while the animal is still awake.
//
// THE NIGHT AND THE DAY. organs/consolidation.js is the NIGHT: an offline elenchus, a meet,
// a promotion, a field projection, under a declared budget. Half that work is cheap,
// mechanical, and has no reason to wait for night — recurrence is knowable the moment the
// second witness arrives, a disagreement the moment the second reading arrives, an identity
// QUESTION the moment two forms appear under one being. This organ is that half, run in
// real time, on ONE side.
//
// THE ONE LAW — PREQUENTIALITY. At step t it has seen actions[0..t] and nothing else. Its
// own test holds it to memory/activation.js's left-to-right invariant, one register up:
// reading the first k actions produces EXACTLY what reading the whole log and stopping at k
// produces. A row reachable only with a later byte has smuggled the future in — the falsifier.
//
// IT NEVER PROMOTES. Standing is the night's (the-fold/consequence.js: recurrence ∧
// consequence, and consequence needs a LATER turn to be measured at all). The waking dream
// opens the recurrence half and the identity question; it decides nothing. Model-free
// (0 draws), pure, no IO, no clock.
//
// TWO LOGS — FOR NOW (operator direction, 2026-10-16). The house rule is ONE ledger, no
// second memory (consolidation.js). This keeps a pragmatic split, disclosed as a first cut:
//   action — EVERY act of the system: append-only, immortal, NEVER pruned. The source of
//            truth; nothing is ever removed from it.
//   memory — the mortal PROJECTION, folded from the action log as needed and BOUNDED by a
//            declared `cap` so the worktree cannot balloon into infinity. It is NOT an
//            independent record: it is projectMemory(actionLog), rebuildable, and a pruned
//            entry is still on the action log, re-openable by its key. "No second memory"
//            holds in spirit: memory is a projection, never a second truth.
//
// THE WORKTREE PRUNE. The live working set is the memory's entries. Over `cap`, the weakest
// fall out (lowest witness/reading weight, then oldest last-seen), and EVERY fall is
// DISCLOSED in `pruned` (key + why), never silent. Forgetting is a projection decision,
// never a deletion: the action log keeps every byte. dmdWindow (kernel/activation.js) is the
// deeper prune the night performs; this is its cheap, bounded, present-tense cousin.
//
// THE PATH BACK. Every memory entry — live or pruned — carries `addrs`: the action-log
// positions that produced it. A pruned entry is never lost; reopen(entry, actionLog) returns
// those actions verbatim, so what fell out of the worktree is one hop away on the immortal
// log. When a later action touches a pruned key the next fold simply restores it — recall is
// a re-fold, never a write.
//
// WHAT IT EMITS (three kinds, all zero-model):
//   support      — a (being,predicate,value) reached a new independent-witness count >=
//                  `floor` (the house's structural minimum, reused not re-derived):
//                  recurrence as POSSIBILITY, never standing (READING-SPEC S9 — a count is
//                  possibility, never standing). Each new count is its own row, so the
//                  action log carries the strengthening, not just the first crossing.
//   nomination   — an EOIdentityAlternative@1 opened between two value-forms under one
//                  (being,predicate): "appearance may nominate, never decide" (II.7).
//   discrepancy  — two readings of one (being,predicate) DIFFER: disclosed, never collapsed
//                  (holodeck-ambiguity.js; corroboration.js's CONTESTED — at n=2 the record
//                  keeps THAT they disagree, and no opinion about which is right).
//
// FALSIFYING CONTROL. (1) a row whose `at` exceeds the step that produced it, or a prefix
// run that disagrees with the whole run's prefix; (2) a memory that is not a pure function of
// the action prefix it was folded from (a leak); (3) any row asserting standing or a
// promotion; (4) a prune that drops an entry without listing it in `pruned`; (5) a pruned
// entry whose addrs do not resolve back to the very actions that produced it. Any concedes
// this organ.
//
// PURE: no clock, no random, no IO. Ids are content-addressed, so the same action log yields
// the same rows in the same order on two runs.
import { identityAlternative } from "../kernel/identity.js";

// EVA · Figure — the present's evaluation of each claim against the record's own recurrence
// (EVA: a particular against a general) at the Figure grain (the claim is the particular;
// the record is its ground). One register below consequence.js's promotion, which is EVA ·
// Pattern and needs a later turn this organ never sees.
export const CELL = Object.freeze({ op: "EVA", grain: "Figure" });
export const WAKE_SCHEMA = "EOWakingDream@1";

const str = (x) => String(x ?? "").trim();
const freeze = (x) => Object.freeze(x);
const k3 = (being, predicate, value) => `${str(being)}\u0000${str(predicate)}\u0000${str(value)}`;
const k2 = (being, predicate) => `${str(being)}\u0000${str(predicate)}`;
const pairKey = (a, b) => [str(a), str(b)].sort().join("\u0000");
const sorted = (set) => [...set].sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : 1));

/** An action is opaque but complete: being · predicate · value · witness are all required.
 *  `witness` is the INDEPENDENT source (corroboration.js's rule — witnesses are keyed by
 *  source, so two chunks of one file are one witness, never two). */
function checkAction(a, i) {
  if (!a || typeof a !== "object") throw new TypeError(`waking-dream: action ${i} is not an object`);
  for (const f of ["being", "predicate", "value", "witness"]) {
    if (!str(a[f])) throw new TypeError(`waking-dream: action ${i} is missing ${f} — being/predicate/value/witness are all required`);
  }
}

/** facts(actions, {floor}) — every hypothesis ROW that is true for this action prefix, keyed
 *  so that reading further only ADDS keys (append-only). Pure function of the prefix: this is
 *  what makes the whole organ prequential. */
function facts(actions, { floor }) {
  const supports = new Map(); // k3 -> { being, predicate, value, witnesses:Set, lastSeen }
  const bp = new Map();       // k2 -> { being, predicate, readings: Map(value -> { witnesses:Set, lastSeen }) }
  actions.forEach((a, t) => {
    const being = str(a.being), predicate = str(a.predicate), value = str(a.value), witness = str(a.witness);
    const ks = k3(being, predicate, value);
    let sup = supports.get(ks);
    if (!sup) { sup = { being, predicate, value, witnesses: new Set(), addrs: new Set(), lastSeen: t }; supports.set(ks, sup); }
    sup.witnesses.add(witness); sup.addrs.add(t); sup.lastSeen = t;

    const kb = k2(being, predicate);
    let e = bp.get(kb);
    if (!e) { e = { being, predicate, readings: new Map() }; bp.set(kb, e); }
    let r = e.readings.get(value);
    if (!r) { r = { value, witnesses: new Set(), addrs: new Set(), lastSeen: t }; e.readings.set(value, r); }
    r.witnesses.add(witness); r.addrs.add(t); r.lastSeen = t;
  });

  const rows = new Map();
  for (const [ks, sup] of supports) {
    const count = sup.witnesses.size;
    if (count < floor) continue; // one observation is not a distribution (the house floor)
    rows.set(`${ks}::s${count}`, { kind: "support", being: sup.being, predicate: sup.predicate, value: sup.value, refs: freeze(sorted(sup.witnesses)), count, addrs: freeze(sorted(sup.addrs)) });
  }
  for (const [kb, e] of bp) {
    const readings = [...e.readings.values()].sort((x, y) => (x.value < y.value ? -1 : 1))
      .map((r) => freeze({ value: r.value, refs: freeze(sorted(r.witnesses)), addrs: freeze(sorted(r.addrs)), lastSeen: r.lastSeen }));
    if (readings.length >= 2) rows.set(`${kb}::d${readings.length}`, { kind: "discrepancy", being: e.being, predicate: e.predicate, readings: freeze(readings), addrs: freeze(sorted(new Set(readings.flatMap((r) => r.addrs)))) });
    const vals = [...e.readings.keys()].sort();
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      rows.set(`n::${kb}::${pairKey(vals[i], vals[j])}`, {
        kind: "nomination", being: e.being, predicate: e.predicate,
        alternative: identityAlternative({ left: vals[i], right: vals[j], giver: "the unit string" }),
        addrs: freeze(sorted(new Set([...e.readings.get(vals[i]).addrs, ...e.readings.get(vals[j]).addrs]))),
      });
    }
  }
  return rows;
}

/**
 * wakingDream(actions, opts) — the waking dream over an action log, in one pure fold.
 *
 * Returns the TWO LOGS and the emitted rows:
 *   actionLog   — the input actions, unchanged and in order: the immortal log, never pruned.
 *   hypotheses  — the append-only rows, each tagged `at` = the step that first made it true.
 *   memory      — the live, bounded projection (the worktree after pruning).
 *   pruned      — every entry the cap dropped, DISCLOSED (key + why + addrs/path back),
 *                 never silent. reopen(entry, actionLog) walks the path back.
 *
 * `floor` defaults to 2 — the house's structural minimum (binding.js / memory/activation.js's
 * df >= 2 / corroboration's two sources), reused, not re-derived. `cap` is declared: how many
 * memory entries the worktree may carry. `cap: null` is the explicit "unbounded" control arm
 * (P4: a choice, not a silent default), so the balloon is visible rather than assumed away.
 */
export function wakingDream(actions = [], { floor = 2, cap = 64 } = {}) {
  if (!Number.isInteger(floor) || floor < 1) throw new TypeError("waking-dream: floor is declared and must be a positive integer");
  if (!(cap === null || (Number.isInteger(cap) && cap > 0))) throw new TypeError("waking-dream: cap is declared — a positive integer, or null for an explicitly unbounded worktree");
  const log = actions.map((a, i) => { checkAction(a, i); return freeze({ ...a }); });

  const hypotheses = [];
  let prev = facts([], { floor });
  for (let t = 0; t < log.length; t++) {
    const cur = facts(log.slice(0, t + 1), { floor });
    for (const [k, row] of cur) if (!prev.has(k)) hypotheses.push(freeze({ schema: WAKE_SCHEMA, at: t, key: k, ...row }));
    prev = cur;
  }

  const memory = projectMemory(log, { floor });
  const { worktree, pruned } = pruneWorktree(memory, { cap });
  return freeze({ schema: WAKE_SCHEMA, floor, cap, actionLog: freeze(log), hypotheses: freeze(hypotheses), memory: worktree, pruned: freeze(pruned) });
}

/** projectMemory(actions, {floor}) — the live worktree as a PURE PROJECTION of the action
 *  prefix: one entry per support that has reached the floor, per discrepancy with >= 2
 *  readings, and per nominated identity pair. Unbounded; pruneWorktree bounds it. */
export function projectMemory(actions = [], { floor = 2 } = {}) {
  const rows = facts(actions, { floor });
  const entries = [];
  const seenBase = new Set();
  for (const [k, row] of rows) {
    // Collapse the per-count support rows to the current count: the memory carries the
    // LATEST standing of each key, not its history (the history is on the action log).
    const base = row.kind === "support" ? k.slice(0, k.lastIndexOf("::s"))
      : row.kind === "discrepancy" ? k.slice(0, k.lastIndexOf("::d")) : k;
    if (seenBase.has(base)) continue;
    seenBase.add(base);
    entries.push(freeze({ key: base, ...row }));
  }
  return freeze({ schema: WAKE_SCHEMA, floor, entries: freeze(entries) });
}

/** pruneWorktree(memory, {cap}) — keep the strongest `cap` entries; DISCLOSE every drop.
 *  Weight is the recurrence the entry carries (support: witness count; discrepancy: number
 *  of readings; nomination: 1), then recency. Nothing is deleted — the action log holds it. */
export function pruneWorktree(memory = {}, { cap = 64 } = {}) {
  const entries = memory?.entries ?? [];
  if (cap === null || entries.length <= cap) return freeze({ worktree: freeze([...entries]), pruned: freeze([]) });
  const weight = (e) => (e.kind === "support" ? e.count : e.kind === "discrepancy" ? e.readings.length : 1);
  const lastSeen = (e) => (e.kind === "support" || e.kind === "discrepancy" ? Math.max(-1, ...e.readings?.map((r) => r.lastSeen) ?? [e.lastSeen ?? -1]) : -1);
  const ranked = [...entries].sort((a, b) => weight(b) - weight(a) || lastSeen(b) - lastSeen(a) || (a.key < b.key ? -1 : 1));
  const worktree = ranked.slice(0, cap);
  const pruned = ranked.slice(cap).map((e) => {
    const addrs = freeze([...(e.addrs ?? [])]);
    return freeze({
      key: e.key, kind: e.kind, addrs,
      path: freeze([...addrs].map((i) => `actionLog#${i}`)),
      why: `cap:${cap} — the worktree is bounded; the path back is addrs on the immortal action log, so recall is one hop`,
    });
  });
  return freeze({ worktree: freeze(worktree), pruned: freeze(pruned) });
}

/**
 * reopen(entry, actionLog) — THE PATH BACK. A memory entry (live OR pruned) carries the
 * action-log positions that produced it; this returns those actions verbatim, so what fell
 * out of the worktree is one hop away on the immortal log. Recall is a re-fold, never a write.
 */
export function reopen(entry, actionLog = []) {
  const addrs = entry?.addrs ?? [];
  return freeze(addrs.map((i) => actionLog[i]).filter(Boolean));
}

/**
 * recall(being, actionLog, {floor}) — REMEMBER WHAT WAS PRUNED. Whether or not the being is
 * in the current worktree, its standing is recomputed from the IMMORTAL action log and returned
 * with the addresses that back it. This is the path back made callable: a pruned being is not
 * lost, only out of the field, and asking for it is a re-fold — never a write, never a restore.
 * A being the log never named is a TYPED absent, not an empty one.
 */
export function recall(being, actionLog = [], { floor = 2 } = {}) {
  const q = str(being);
  if (!q) throw new TypeError("recall: a being is required");
  const entries = projectMemory(actionLog, { floor }).entries.filter((e) => e.being === q);
  const addrs = freeze([...new Set(entries.flatMap((e) => e.addrs ?? []))].sort((a, b) => a - b));
  if (!entries.length) return freeze({ schema: WAKE_SCHEMA, query: q, status: "absent", entries: freeze([]), addrs: freeze([]), basis: "no action names this being on the log — a typed absence, not an empty recall" });
  return freeze({ schema: WAKE_SCHEMA, query: q, status: "recalled", entries: freeze(entries), addrs, basis: "re-folded from the immortal action log — recall is a re-fold, never a write" });
}
