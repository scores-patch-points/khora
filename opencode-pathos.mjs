// opencode-pathos.mjs — the PATHOS PASS over an opencode task, in shadow (FOLD_PATHOS). Per finished turn, the person
// is the experiencer and the record supplies the fold, beforeFold and delta, so the curve is MEASURED and `collapse`
// can fire (pathosTurn's own header: without a fold the curve is a gap and collapse structurally cannot).
// Conditions are the organ's own: stale, collapse, contested. A concession is a REC·Ground act landed on the ledger
// (weft.jsonl) with the old ground's fingerprint kept; the code model never gets feelings — the only thing that can
// reach it is a mechanical fact (`ground conceded: collapse at <block>`), and silence is the default.
import crypto from "node:crypto";
import { pathosOf, reGroundCondition, reGround, landReGround } from "./native/organs/pathos.js";
import { pathosTurn } from "./native/the-fold/pathos-turn.js";
import { blocks, liveAnswers, blocksToOperations } from "./opencode-record.mjs";
import { append, rows, lean } from "./opencode-ledger.mjs";

export const PATHOS_ON = () => (process.env.FOLD_PATHOS ?? "0") !== "0";
const ORGANS = { pathosOf, reGroundCondition, reGround, landReGround };

/** The record as the reader fold dynamics.js reads: an open obligation per parallel fork and per unresolved CONTEST. */
export function foldOf(task, list = blocks(task)) {
  const live = liveAnswers(list);
  const forked = new Set(); const seen = new Set();
  for (const b of list) { if (seen.has(b.referent) && b.supersedes === "none") forked.add(b.referent); seen.add(b.referent); }
  const forks = [...forked].map((referent) => ({ id: referent, state: (live.get(referent)?.length ?? 0) > 1 ? "open" : "resolved", grounds: [referent] }));
  const contests = rows(task, { schema: "Contest@1" }).filter((c) => !c.resolved && list.some((b) => b.id === c.block)).map((c) => ({ id: c.referent, state: "open", grounds: [c.referent] }));
  return { sequence: list.length, obligations: [...forks, ...contests] };
}

/** The delta the organ is shown is the CONSEQUENTIAL part of the block: a frame change (REC), or an act on a referent that holds an
 *  open obligation. An ordinary green admission is the ground absorbing what arrived, not a burst. */
export function consequential(delta, fold) {
  const open = new Set(fold.obligations.filter((o) => o.state === "open").map((o) => o.id));
  return { operations: delta.operations.filter((o) => o.operator === "REC" || open.has(o.payload?.id)) };
}

const fingerprint = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 12);

/** One pass. `measured:false` forces the old gap (the control). Appends PathosTurn@1 only when a concession lands. */
export function pathosPass({ task, text, person = "person", turn = null, state = {}, measured = true, lastKind = null, heldSinceLast = true } = {}) {
  const all = blocks(task);
  const last = all.at(-1) ?? null;
  const input = { organs: ORGANS, text, experiencer: { who: `person:${person}`, read: `task:${task}` }, state, lastKind, heldSinceLast, turn };
  if (measured && last) { input.fold = foldOf(task, all); input.beforeFold = foldOf(task, all.slice(0, -1)); input.delta = consequential(blocksToOperations([last]), input.fold); }
  const r = pathosTurn(input);
  const conceded = r.act ? { kind: r.condition.kind, at: last?.id ?? null, old: fingerprint(r.read.curve) } : null;
  const env = lean(task, { layer: "pathos", con: conceded ? [[`turn:${turn ?? "?"}`, "conceded", r.condition.kind]] : [], clause: last?.id ?? "" });
  const row = append(task, {
    schema: "PathosTurn@1", op: r.act ? "REC" : "EVA", task, referent: `turn:${turn ?? "?"}`, ...env,
    dmd: r.act != null, // DMD: a ground that holds is the default, not a record
    m: { condition: r.condition.kind, measured: r.read.curve.measured, experiencer: r.read.forWhom.who, concession: conceded },
  });
  const note = conceded ? `ground conceded: ${conceded.kind} at ${conceded.at ?? "e?"}` : null; // a mechanical fact; never a feeling
  return { condition: r.condition.kind, measured: r.read.curve.measured, act: r.act, note, id: row.id, lastKind: r.lastKind, heldSinceLast: r.heldSinceLast };
}
