// cli/reasoning-pharos.mjs — a reasoning run, woven into the shared log (2026-11-14).
// Khora's ARITHMETIC, as entries: one `reasoning-run` entry and one
// `reasoning-claim` entry per declared claim. Nothing here is handed to another
// repo; whoever needs these (janus for the shapes, penelope for the verdicts)
// reads them from the log.
//
// It takes the records cli/reasoning-ledger.mjs already wrote (scrubbed, keyed,
// chained) and never re-derives them, so the file ledger and the log say the
// same thing. The file ledger stays as it was; this is a second, shared record.
//
//   reasoning-run    INS·Figure  addr run:<at>      body { at, session, instrument, ok, errors, denominators }
//   reasoning-claim  INS·Figure  addr unit:<sha16>  body { unit, nth, ground, rel, roles, polarity, said, ref, ... }
//                                of [ the run entry, the last entry stating the same unit (if any) ]
//
// THE UNIT IS THE ADDRESS. Every statement of one unit sits at one addr, so the
// successor chain is the log's own `of`, and "stated N times" is a count of
// entries at an address. Cells are nominations (INS: one more of what exists),
// not earned from data. `ok`/`errors` on the run are reason.mjs's own report of
// what it found, recorded as it happened; a verdict entry is Penelope's to write.
import crypto from "node:crypto";
import { openDoor } from "./pharos-door.mjs";
import { unitKeyOf } from "./reasoning-ledger.mjs";

export const RUN_KIND = "reasoning-run";
export const CLAIM_KIND = "reasoning-claim";
export const CELL = "INS·Figure";
const WHY = {
  [RUN_KIND]: "one reasoning run: when, by which instrument, and how much it read (its denominators)",
  [CLAIM_KIND]: "one statement of a unit (ground, polarity, relation, roles) in a run, chained to the last statement of the same unit",
};
export const unitAddr = (unit) => `unit:${crypto.createHash("sha256").update(String(unit)).digest("hex").slice(0, 16)}`;

/** weaveReasoning(records, opts) -> { on, why, woven, refused, runEntry }. records = appendReasoningLedger(...).records. Never throws. */
export async function weaveReasoning(records = [], opts = {}) {
  const door = opts.door ?? await openDoor(opts);
  if (!door.on) return { on: false, why: door.why, woven: 0, refused: 0, runEntry: null };
  const run = records.find((r) => r?.kind === RUN_KIND);
  const claims = records.filter((r) => r?.kind === CLAIM_KIND);
  if (!run) return { on: true, why: "no run record", woven: 0, refused: 0, runEntry: null };
  door.declare(RUN_KIND, CELL, WHY[RUN_KIND]);
  door.declare(CLAIM_KIND, CELL, WHY[CLAIM_KIND]);
  const before = { ...door.counts };
  const at = String(run.title ?? "").replace(/^\/reason\//, "") || run.appendedAt;
  const runEntry = door.weave({
    cell: CELL, kind: RUN_KIND, addr: `run:${at}`,
    body: { at, session: run.session ?? null, instrument: run.instrument ?? null, ok: run.ok ?? null, errors: run.errors ?? null, denominators: run.denominators ?? null },
    basis: { giver: "khora cli/reason.mjs", ledgerId: run.id },
  });
  if (runEntry) {
    // the tip of each unit's chain, read once: the last live entry at that address
    const tips = new Map();
    for (const e of door.fold({ kind: CLAIM_KIND }) ?? []) tips.set(e.addr, e);
    for (const c of claims) {
      const unit = unitKeyOf(c);
      const addr = unitAddr(unit);
      const prev = tips.get(addr) ?? null;
      const nth = prev ? Number(prev.body?.nth ?? 1) + 1 : 1;
      const e = door.weave({
        cell: CELL, kind: CLAIM_KIND, addr, of: prev ? [runEntry.id, prev.id] : [runEntry.id],
        body: {
          unit, nth, run: runEntry.id, ground: c.ground, rel: c.rel, roles: c.roles ?? {}, polarity: c.polarity ?? null,
          said: c.said ?? null, ref: c.ref ?? null, verdict: c.verdict ?? null, fingerprint: c.fingerprint ?? null,
          source: c.source ?? null, instrument: c.instrument ?? null,
        },
        basis: { giver: "khora cli/reason.mjs", ledgerId: c.id, witness: c.witness ?? null },
      });
      if (e) tips.set(addr, e);
    }
  }
  return { on: true, why: door.why, woven: door.counts.woven - before.woven, refused: door.counts.refused - before.refused, lastReason: door.counts.lastReason, runEntry };
}
