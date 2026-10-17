// opencode-stakes.mjs — STAKES AND CONTEST, in shadow (FOLD_STAKES). A stake is something the person holds (a promoted
// claim) or a declared open question (a DEF'd void); both are rows on the ledger (weft.jsonl), and the current stakes are
// a PROJECTION of those rows, never a second store. (Promotion by recurrence without contradiction stays the memory
// surface's business; this takes its outcome as `promotedBy` provenance.)
//
// A delta is meaningful for the frame when it contradicts a promoted stake, or fills / opens a declared void. A delta that
// touches none is real but not meaningful here; it is not a row (DMD). A contradiction lands as a disclosed CONTEST row:
// it NEVER supersedes the stake — only the person's word (`by:"person"`) or a witnessed check can.
import { append, rows, lean } from "./opencode-ledger.mjs";

export const STAKES_ON = () => (process.env.FOLD_STAKES ?? "0") !== "0";
const one = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

export function declareStake({ task, referent, claim = "", kind = "stake", frame, promotedBy = null, by = "person" } = {}) {
  if (!frame?.giver || !frame?.question || !frame?.ground) return { ok: false, gap: "no_for_whom" };
  if (!["stake", "void"].includes(kind)) return { ok: false, gap: "bad-kind" };
  const env = lean(task, { layer: "stake", ins: [referent], con: [[referent, kind === "void" ? "opens" : "holds", one(claim).slice(0, 80)]] });
  const r = append(task, { schema: "Stake@1", op: "DEF", task, referent, ...env, m: { kind, claim: one(claim), frame, promotedBy, by } });
  return { ok: true, id: r.id };
}

/** Current stakes: last-wins per referent over Stake@1 rows. A void answered by a block is `filled`. */
export function stakesOf(task) {
  const cur = new Map();
  for (const r of rows(task, { schema: "Stake@1" })) cur.set(r.referent, r);
  const filled = new Set(rows(task, { schema: "StakeHit@1" }).filter((h) => h.m?.class === "fills_void").map((h) => h.referent));
  return [...cur.values()].map((r) => ({ id: r.id, referent: r.referent, kind: r.m.kind, claim: r.m.claim, frame: r.m.frame, by: r.m.by, filled: filled.has(r.referent) }));
}

/** Classify an admitted block against the stakes and, when meaningful, append the row. Never edits a stake. */
export function stakeCheck({ task, block, judge = "reported" } = {}) {
  const stake = stakesOf(task).find((s) => s.referent === block.referent);
  if (!stake) return { class: "none" }; // real, not meaningful here: no row
  const d0 = one(block.delta?.[0]);
  if (stake.kind === "void") {
    if (stake.filled) return { class: "none" };
    const env = lean(task, { layer: "stake", con: [[block.referent, "fills", stake.id]], clause: block.id });
    const r = append(task, { schema: "StakeHit@1", op: "DEF", task, referent: block.referent, block: block.id, reader: "person", register: judge === "box" ? "witnessed" : "said", generation: 0, ...env, m: { class: "fills_void", stake: stake.id } });
    return { class: "fills_void", id: r.id };
  }
  if (d0 === stake.claim) return { class: "none" }; // agrees with the stake: nothing changed
  const env = lean(task, { layer: "stake", con: [[block.referent, "contests", stake.id]], clause: block.id });
  const r = append(task, {
    schema: "Contest@1", op: "EVA", task, referent: block.referent, block: block.id, reader: "person", register: judge === "box" ? "witnessed" : "said", generation: 0, ...env,
    resolved: false, m: { stake: stake.id, held: stake.claim, contest: d0.slice(0, 300), disclosed: true },
  });
  return { class: "contest", id: r.id, stake: stake.id };
}

/** Only the person's word resolves a contest (supersedes the stake); a block never does. */
export function resolveContest({ task, stakeReferent, claim, frame }) {
  return declareStake({ task, referent: stakeReferent, claim, frame, by: "person" });
}
