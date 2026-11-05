// respects.js — Same and Other IN SOME RESPECT, as kernel law. Medium-blind.
//
// Same and Other are always in some respect, and the respects are the cube's transformations. A judgment of sameness is therefore addressed by
// THREE coordinates, never one:
//   op     the transformation the two are compared under (the nine operators, from cube.js)
//   grain  WITHIN a level: Ground = the field the unit stands in, Figure = the unit itself, Pattern = the unit as a kind that recurs
//   level  WHICH holon: the medium's own units, part to whole, DECLARED by the caller in order (this file names none)
// Each cell carries an OUTCOME (same | other | gap | n/a), its WARRANT (where the evidence came from) and its NULL (what it was measured against).
// A warrant is never a grain; a grain is never a level.
//
// THE LAWS, enforced here so no caller can break them quietly (each a typed refusal that turns the cell into a Gap, never a silent pass):
//   L1 NO VERDICT WITHOUT A NULL. A cell that says same or other names its warrant and its null. Without them it is a gap ("an opinion wearing a
//      measurement's clothes", commitments.js's own rule, applied to cells). An exact identity names its null as exact.
//   L2 NULLS COMPOSE DOWNWARD. A cell declares the cells it RESTS ON, at lower levels. If any of them is a gap, this cell is a gap: a tie between
//      parts cannot be judged while a part is unearned. Only a gap propagates: a difference below does not force a difference above (different
//      parts can still be the same whole; that is what a paraphrase is).
//   L3 LEVELS ARE DECLARED, IN ORDER. Every cell's level is one the caller declared, and every cell it rests on is at a LOWER level (holon
//      nesting), or at the SAME level with an EARLIER operator in the helix (NUL SIG INS SEG CON SYN DEF EVA REC): an EVA is judged on what a DEF
//      defined at that holon. Nothing rests on a later operator at its own level, or on anything above it.
//   L4 WITHIN A LEVEL, Same at Figure entails Same at Pattern (one instance is one kind), and Other at Pattern entails Other at Figure. Never the reverse.
// A PERSPECTIVE is the set of cells it cares about; the verdict for it is DERIVED, never stored: other if any cared-for cell is other, else gap if
// any is a gap, else same. A difference in a cell it does not care about is NUL (∅) for it; one it cares about is SIG (○).
import { GRAINS } from "./cube.js";

export const OUTCOMES = Object.freeze({ SAME: "same", OTHER: "other", GAP: "gap", NA: "n/a" });
export const VERDICTS = Object.freeze({ SAME: "same", OTHER: "other", GAP: "gap" });
export const OPERATORS = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
export const REFUSALS = Object.freeze({
  NO_NULL: "no_null",               // L1: a same/other with no warrant or no null
  RESTS_ON_GAP: "rests_on_gap",     // L2: a cell over an unearned cell
  UNKNOWN_LEVEL: "unknown_level",   // L3: a level the caller did not declare
  RESTS_NOT_BELOW: "rests_not_below", // L3: a rested-on cell above, or at the same level with a later (or the same) operator
  UNKNOWN_CELL: "unknown_cell",     // an operator or grain the cube does not have
});
export const cellKey = ({ op, grain, level }) => `${op}·${grain}@${level}`;
export function parseKey(key) { const m = /^([A-Z]+)·([A-Za-z]+)@(.+)$/.exec(String(key)); return m ? { op: m[1], grain: m[2], level: m[3] } : null; }

/** makeRespects({ levels }) → the laws, over a caller's declared levels (part to whole) */
export function makeRespects({ levels } = {}) {
  if (!Array.isArray(levels) || !levels.length) throw new TypeError("makeRespects: the caller declares its levels, part to whole");
  const rank = new Map(levels.map((l, i) => [l, i]));
  const grains = [...(GRAINS ?? ["Ground", "Figure", "Pattern"])];

  /** cell(fields) → a cell record, checked against L1 and L3 (L2 needs the whole profile: see compose) */
  function cell({ op, grain, level, outcome, warrant = null, null: against = null, because = null, rests = [] } = {}) {
    const c = { op, grain, level, outcome, warrant, null: against, because, rests: [...rests] };
    if (!OPERATORS.includes(op) || !grains.includes(grain)) return refuse(c, REFUSALS.UNKNOWN_CELL, `${op}·${grain} is not a cell of the cube`);
    if (!rank.has(level)) return refuse(c, REFUSALS.UNKNOWN_LEVEL, `"${level}" is not a declared level (${levels.join(" < ")})`);
    const helix = (o) => OPERATORS.indexOf(o);
    for (const k of c.rests) { const p = parseKey(k), below = p && rank.has(p.level) && (rank.get(p.level) < rank.get(level) || (rank.get(p.level) === rank.get(level) && helix(p.op) >= 0 && helix(p.op) < helix(op))); if (!below) return refuse(c, REFUSALS.RESTS_NOT_BELOW, `${k} is neither at a level below ${level} nor at it with an operator earlier than ${op}`); }
    if ((outcome === OUTCOMES.SAME || outcome === OUTCOMES.OTHER) && (!warrant || !against)) return refuse(c, REFUSALS.NO_NULL, "a same or other names its warrant and the null it was measured against");
    return c;
  }
  const refuse = (c, type, detail) => ({ ...c, claimed: c.outcome, outcome: OUTCOMES.GAP, refused: { type, detail } });

  /** compose(profile) → L2 applied: a cell over a gap is a gap, by name; applied until nothing changes (a gap can climb several levels) */
  function compose(profile) {
    const out = profile.map((c) => ({ ...c })), byKey = new Map(out.map((c) => [cellKey(c), c]));
    for (let changed = true; changed; ) {
      changed = false;
      for (const c of out) {
        if (c.outcome === OUTCOMES.GAP || c.outcome === OUTCOMES.NA) continue;
        const rests = c.rests ?? [], under = rests.map((k) => byKey.get(k));   // a cell that declares nothing below it rests on nothing
        const missing = rests.filter((k, i) => !under[i]), gapped = under.filter((u) => u && u.outcome === OUTCOMES.GAP).map(cellKey);
        if (missing.length || gapped.length) { Object.assign(c, { claimed: c.outcome, outcome: OUTCOMES.GAP, refused: { type: REFUSALS.RESTS_ON_GAP, detail: `rests on ${[...missing.map((k) => `${k} (absent)`), ...gapped].join(", ")}` } }); changed = true; }
      }
    }
    return out;
  }

  /** entail(profile) → L4 applied within each level (never across) */
  function entail(profile) {
    const out = profile.map((c) => ({ ...c })), byKey = new Map(out.map((c) => [cellKey(c), c]));
    for (const c of profile) {
      if (c.grain === "Figure" && c.outcome === OUTCOMES.SAME) { const p = byKey.get(cellKey({ ...c, grain: "Pattern" })); if (p && p.outcome === OUTCOMES.GAP && !p.refused) Object.assign(p, { outcome: OUTCOMES.SAME, entailedBy: cellKey(c) }); }
      if (c.grain === "Pattern" && c.outcome === OUTCOMES.OTHER) { const f = byKey.get(cellKey({ ...c, grain: "Figure" })); if (f && f.outcome === OUTCOMES.GAP && !f.refused) Object.assign(f, { outcome: OUTCOMES.OTHER, entailedBy: cellKey(c) }); }
    }
    return out;
  }

  /** verdictFor(profile, cells) → { verdict, cells, idle } — the perspective's verdict, derived after L1–L4 */
  function verdictFor(profile, cells) {
    const full = entail(compose(profile.map((c) => (c.refused ? c : cell(c))))), byKey = new Map(full.map((c) => [cellKey(c), c]));
    const cared = cells.map((k) => byKey.get(k) ?? { ...(parseKey(k) ?? {}), outcome: OUTCOMES.GAP, because: "no evidence at this cell" });
    const live = cared.filter((c) => c.outcome !== OUTCOMES.NA);
    const verdict = live.some((c) => c.outcome === OUTCOMES.OTHER) ? VERDICTS.OTHER : !live.length || live.some((c) => c.outcome === OUTCOMES.GAP) ? VERDICTS.GAP : VERDICTS.SAME;
    const idle = full.filter((c) => c.outcome === OUTCOMES.OTHER && !cells.includes(cellKey(c))).map((c) => ({ key: cellKey(c), op: "NUL", glyph: "∅" }));
    const signal = cared.filter((c) => c.outcome === OUTCOMES.OTHER).map((c) => ({ key: cellKey(c), op: "SIG", glyph: "○" }));
    return { verdict, cells: cared.map((c) => ({ key: cellKey(c), outcome: c.outcome, warrant: c.warrant ?? null, null: c.null ?? null, because: c.because ?? null, entailedBy: c.entailedBy ?? null, refused: c.refused ?? null })), signal, idle, profile: full };
  }
  return { levels: [...levels], cell, compose, entail, verdictFor };
}
