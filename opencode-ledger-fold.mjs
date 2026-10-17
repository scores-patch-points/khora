// opencode-ledger-fold.mjs — THE LEDGER FOLD (candidate; NOT wired to the door's fold event): a
// bounded projection of a text as its ledger would hold it — the beings it names and the relations
// it states, each with its byte address, ranked and budgeted. A session could read the projection
// and pull the bytes it still needs by snip; the bytes never leave the session.
//
// WHY IT IS NOT WIRED: the retired line-fold (2026-10-15) lost the identifiers the model went on
// to use as often as head/tail/random at the same size, over 1,010 real tool outputs (doorway
// header; scripts/opencode-fold-replay.mjs — absent from this checkout). That replay is this
// projection's gate: it answers only when asked (and in its test) until it beats the nulls on the
// real corpus. The local falsifier (opencode-ledger-fold.test.mjs) is a planted-identifier battery
// against head/tail/random at equal size — necessary, not sufficient.
import { predigest, loadRegister } from "./opencode-predigest.mjs";

/**
 * ledgerFold(text, { budget, maxBeings, maxRelations }) →
 *   { note, chars, beings: [[surface, at]], relations: [[e1, label, e2, at, neg]] }
 * Deterministic: same text + knobs → byte-identical note. The note is bounded by `budget` chars;
 * beings first (the identifiers a later ask reaches for are what the retired fold lost), then the
 * relations — each line carrying its `@<at>` address into the source text.
 */
export function ledgerFold(text, { budget = Number(process.env.FOLD_LEDGER_NOTE ?? 2000), maxBeings = 80, maxRelations = 40 } = {}) {
  // A missing register is a typed gap, never a thin note silently mistaken for the whole read.
  const reg = loadRegister();
  if (reg.gap) return { note: "", chars: 0, beings: [], relations: [], gap: `no-priors: ${JSON.stringify(reg.gap)} (set FOLD_ENG_PRIOR_DIR/FOLD_POS_PRIOR)` };
  const s = String(text ?? "");
  const d = predigest(s, { level: 2 });
  const lines = [
    `[ledger: ${d.ins.length} being(s), ${d.con.length} relation(s); the bytes stay in the session, addresses point at them]`,
    ...d.ins.slice(0, maxBeings).map(([b, at]) => `· ${b} @${at}`),
    ...d.con.slice(0, maxRelations).map(([e1, lab, e2, at, neg]) => `- ${e1} ${neg ? "not " : ""}${lab} ${e2} @${at}`),
  ];
  const full = lines.join("\n");
  const note = full.length > budget ? `${full.slice(0, Math.max(0, budget - 1))}…` : full;
  return { note, chars: Math.min(note.length, budget), beings: d.ins, relations: d.con };
}
