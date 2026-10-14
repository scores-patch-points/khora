// kernel/wheel.js — THE WHEEL (Void / Beings / Fold = DEF / EVA / REC), the
// one act, three positions. Every stage of the artifact pipeline is one pass
// of the wheel: it DECLARES what would satisfy it (DEF·Ground), MEASURES a
// figure against that ground (EVA — a real difference from a rebuilt ground,
// never a softmax), and LANDS the difference as the fold (REC — append-only;
// the pattern is the next stage's ground). The ledger is the REC layer; a
// correction is a superseding entry, never an edit.
//
// Handle: Friston / Warburg — the future shape drawn from the past priors,
// arranged by affinity; the felt is the economy of the reader's own
// predictions (Damasio / Gendlin / Peirce's pathos cell).
import { cellOf, TERRAIN_BY_DOMAIN } from "./cube.js";

export const WHEEL_SCHEMA = "EOWheel@1";

// A turn's operator·grain stamp is a CUBE CELL or a typed refusal — never a
// free string. The wheel's callers stamped TERRAIN names ("Field",
// "Atmosphere", "Link", "Lens") into the grain slot; nothing checked it, so
// the ledger said a turn was at a grain the cube does not have. Now a stamp
// that is not a cell lands the turn all the same (the phase, DEF, EVA and REC
// are real) with the offending slot nulled and `stamp_refused` typed beside
// it: what was offered, why, and — when the offered word IS a terrain of that
// operator's domain — the one cell it names, as a reading and never applied.
// A valid operator is kept even when its grain is refused.
function stampOf(operator, grain) {
  if (operator == null && grain == null) return { operator: null, grain: null };
  const c = operator != null && grain != null ? cellOf(operator, grain) : null;
  if (c && !c.gap) return { operator, grain, cell: `${c.op}·${c.grain}` };
  const opCell = operator != null ? cellOf(operator, "Ground") : null;
  const operatorOk = Boolean(opCell && !opCell.gap);
  if (operatorOk && grain == null) return { operator, grain: null }; // an operator alone claims no cell
  const g = operatorOk ? Object.keys(TERRAIN_BY_DOMAIN[opCell.domain]).find((k) => TERRAIN_BY_DOMAIN[opCell.domain][k] === grain) : undefined;
  const reason = operator == null ? "a grain was stamped without the operator that shares its cell" : !operatorOk ? opCell.reason : c?.reason ?? "no such cell";
  return {
    operator: operatorOk ? operator : null,
    grain: null,
    stamp_refused: Object.freeze({
      type: "not_a_cube_cell",
      offered: Object.freeze({ operator, grain }),
      reason,
      reads_as: g ? Object.freeze({ cell: `${operator}·${g}`, grain: g, terrain: grain }) : null,
    }),
  };
}

export function createWheelLedger({ task = "" } = {}) {
  const turns = [];
  const tip = { ground: null };
  return {
    schema: WHEEL_SCHEMA,
    task,
    // DEF: declare the void — what would satisfy this stage. Nothing is
    // measured before the ground is declared (the wheel's first move).
    def(phase, satisfaction, { basis = null } = {}) { tip.def = { phase, satisfaction, basis }; return this; },
    // EVA: measure the present against the DEF — a real difference.
    eva(phase, measure, { basis = null, verdict = null } = {}) { tip.eva = { phase, measure, basis, verdict }; return this; },
    // REC: land the difference — append-only; the pattern is the next ground.
    rec(phase, landing, { basis = null, operator = null, grain = null, face = null } = {}) {
      const stamp = stampOf(operator, grain);
      const turn = { seq: turns.length + 1, phase, ...stamp, face, def: tip.def ?? null, eva: tip.eva ?? null, rec: landing, basis };
      turns.push(turn);
      tip.def = null; tip.eva = null; tip.ground = landing;
      return turn;
    },
    // ONE PASS: DEF → EVA → REC, in one call — the universal rhythm. Every
    // turn names its OPERATOR (the void's nine: NUL→SIG→INS→SEG→CON→SYN→
    // DEF→EVA→REC), its GRAIN (the wheel's three: Ground/Figure/Pattern), and
    // the FACE that owns the move (Gore gathers, Wolfe writes, Murch edits,
    // Ranke grounds, Kelsen resolves, LaVar grades — else the void itself).
    turn(phase, satisfaction, measure, landing, { evaBasis = null, basis = null, operator = null, grain = null, face = null } = {}) {
      this.def(phase, satisfaction);
      this.eva(phase, measure, { basis: evaBasis });
      return this.rec(phase, landing, { basis, operator, grain, face });
    },
    // the fold: the ledger is the cone, the tip is the contraction.
    tip: () => ({ ...tip }),
    get ledger() { return turns; },
    /** Every turn whose operator·grain stamp was not a cube cell, typed. */
    get stampRefusals() { return turns.filter((t) => t.stamp_refused).map((t) => ({ seq: t.seq, phase: t.phase, ...t.stamp_refused })); },
    toJSON() { return { schema: WHEEL_SCHEMA, task, turns: [...turns] }; },
  };
}