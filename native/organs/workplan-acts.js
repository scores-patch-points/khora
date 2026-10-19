// Handle: Mendeleev — the periodic table of the workplan. Every resolution a
// plan item can fall into is ONE of the engine's 27 phaseposts (kernel/cube.js
// cellOf), never a free string; and a resolution that lands a positive owes the
// nulls its cell's census declares (the-fold/standing-cube.js, the PAIRING RULE).
//
// workplan-acts.js — the workplan's state vocabularies, typed once and nowhere
// else, exactly as organs/claim-acts.js types the build's structural claims. The
// medium and the record have each grown a little state machine of their own —
// marks ("fact"/"claim"/"done"/"block"), a claim's life (taken / contended /
// lapsed), a scent's trail (open / released / walled), a plan node's status
// (open / resolved / blocked / refuted), the EOT stages (verify / admit / …) —
// and every one of those tokens is a MOVE on the cube that was never typed.
//
// THE OWED NULL IS DERIVED, NEVER RESTATED. `owes` is read from the census at
// load, so this table cannot drift from the algebra or from the census: change
// the census and the owes move with it, or a test fails. A positive that lands
// owing no null is the exact gap the pairing rule exists to catch ("a capacity
// registered without its null is a capacity that will read silence as support").
//
// TWO LAWS A PLAN MUST HOLD (planHelix):
//   1. INS-FIRST — nothing is judged, bonded or refuted before it is
//      instantiated: a plan item must be TAKEN/OPENED (INS) before it is
//      DONE/RESOLVED (EVA), BLOCKED (CON) or REFUTED (SEG). The same law
//      claim-acts.js's helixCheck holds over the build's claims, here over the
//      plan's own moves.
//   2. PAIRED — a positive resolution owes its cell's nulls; a resolution whose
//      cell owes none is caught, never passed.
//
// PURE of any model, and pure of any store: it types moves, it does not write
// them. The medium imports actOf() to stamp the cell on each line it writes.

import * as cube from "../kernel/cube.js";
import { makeStandingCube } from "../the-fold/standing-cube.js";

export const WORKPLAN_ACTS_SCHEMA = "WorkplanActs@1";

// The census, from the cube (injected, the cast.js pattern) — never a hand list.
const STANDING = makeStandingCube({ operators: cube });
const CENSUS = new Map(STANDING.everyCell().map((c) => [c.cell, c]));

/**
 * The resolution table. Each entry is one act at one grain. A POSITIVE resolution
 * omits `null` and OWES the cell's census nulls; a NEGATIVE resolution (a wall, a
 * block, a cut) names the specific null it lands. Keys are namespaced by the
 * object they belong to (`mark:`, `claim:`, `scent:`, `plan:`, `eot:`) because
 * the same word means a different act in a different object — a plan's `open` is
 * a birth (INS), a scent's `open` is a declared void (DEF·Ground).
 */
export const RESOLUTIONS = Object.freeze({
  // ── marks (opencode-worknotes.mjs KINDS) ────────────────────────────────────
  "mark:fact": Object.freeze({ op: "DEF", grain: "Figure", why: "a value asserted of a thing" }),
  "mark:claim": Object.freeze({ op: "INS", grain: "Figure", why: "an item taken — a unit instantiated (build / birth)" }),
  "mark:done": Object.freeze({ op: "EVA", grain: "Figure", why: "the item's own witness" }),
  "mark:block": Object.freeze({ op: "DEF", grain: "Ground", why: "a declared obstacle — the void, with its scope" }),
  // ── a claim's life ──────────────────────────────────────────────────────────
  "claim:contended": Object.freeze({ op: "CON", grain: "Figure", why: "two holders on one item — the contest" }),
  "claim:lapsed": Object.freeze({ op: "INS", grain: "Figure", null: "INCOMPLETE", why: "the build never completed — the lease expired" }),
  // ── the scent trail ─────────────────────────────────────────────────────────
  "scent:open": Object.freeze({ op: "DEF", grain: "Ground", why: "an open question declared over an extent (the void)" }),
  "scent:arrival": Object.freeze({ op: "REC", grain: "Ground", why: "the void re-zeroed by an arrival" }),
  "scent:reframe": Object.freeze({ op: "REC", grain: "Figure", why: "a coarser note replaces it (rezero)" }),
  "scent:merge": Object.freeze({ op: "SYN", grain: "Ground", why: "the ascent — settled material compiles" }),
  "scent:walled": Object.freeze({ op: "REC", grain: "Ground", null: "not_earned", why: "a terminal NUL — the tension never earned resolution" }),
  // ── plan nodes (opencode-plan.mjs status) ───────────────────────────────────
  "plan:open": Object.freeze({ op: "INS", grain: "Figure", why: "a goal node instantiated (birth)" }),
  "plan:dep": Object.freeze({ op: "CON", grain: "Figure", why: "a dependency — a bond from a premise to its dependent" }),
  "plan:resolved": Object.freeze({ op: "EVA", grain: "Figure", why: "judged, with its evidence" }),
  "plan:refuted": Object.freeze({ op: "SEG", grain: "Figure", null: "beyond-reach", why: "the cut — a veto, never a premise" }),
  "plan:blocked": Object.freeze({ op: "CON", grain: "Figure", null: "unbound", why: "the bond to a refuted premise is unbound" }),
  // ── EOT stages (opencode-eot.mjs STAGES) ────────────────────────────────────
  "eot:read": Object.freeze({ op: "NUL", grain: "Ground", why: "measure the ground" }),
  "eot:turn": Object.freeze({ op: "DEF", grain: "Figure", why: "a turn's words asserted of a thing" }),
  "eot:mark": Object.freeze({ op: "DEF", grain: "Figure", why: "a mark (its cell is the kind's — see markCell)" }),
  "eot:claim": Object.freeze({ op: "INS", grain: "Figure", why: "an item taken (a birth)" }),
  "eot:done": Object.freeze({ op: "EVA", grain: "Figure", why: "the item's own witness" }),
  "eot:draw": Object.freeze({ op: "DEF", grain: "Figure", why: "a model draw — words asserted" }),
  "eot:hunt": Object.freeze({ op: "SIG", grain: "Ground", why: "going to name what is absent (settle)" }),
  "eot:refuse": Object.freeze({ op: "SEG", grain: "Figure", null: "beyond-reach", why: "a refusal — the cut, a veto" }),
  "eot:verify": Object.freeze({ op: "EVA", grain: "Figure", why: "a witness" }),
  "eot:admit": Object.freeze({ op: "EVA", grain: "Pattern", why: "standing — a property of the set of witnesses" }),
  "eot:reject": Object.freeze({ op: "SEG", grain: "Figure", null: "beyond-reach", why: "a rejected draw — the cut" }),
  "eot:reason": Object.freeze({ op: "SYN", grain: "Figure", why: "a derivation composes from its premises" }),
  "eot:flag": Object.freeze({ op: "EVA", grain: "Figure", why: "a guard's judgment of a figure" }),
  "eot:ibid": Object.freeze({ op: "SYN", grain: "Figure", why: "a re-sighting folds into the SAME note (hear)" }),
  "eot:contend": Object.freeze({ op: "CON", grain: "Figure", why: "the contest" }),
  "eot:edit": Object.freeze({ op: "REC", grain: "Figure", why: "a part restructured at its address" }),
  "eot:exec": Object.freeze({ op: "EVA", grain: "Figure", why: "a check's witness" }),
  "eot:wt": Object.freeze({ op: "REC", grain: "Figure", why: "a worktree change — the tree re-folded" }),
});

// The marks the medium writes carry their resolution's name directly: KINDS are these.
export const MARK_KINDS = Object.freeze(["fact", "claim", "done", "block"]);
export const markResolution = (kind) => `mark:${kind}`;

// The acts that instantiate an item, and the acts that operate on one (and so require an INS first).
const INSTANTIATES = Object.freeze(["mark:claim", "plan:open"]);
const ON_ITEM = Object.freeze(["mark:done", "plan:resolved", "plan:refuted", "plan:blocked", "claim:contended"]);
const COMPLETES = Object.freeze(["mark:done", "plan:resolved"]);

/** owesFor(cell) — the nulls the census declares for a cell, DERIVED. [] for a cell the census does not carry. */
export function owesFor(cell) {
  const c = CENSUS.get(String(cell));
  return c ? [...c.nulls] : [];
}

/** The 27 cells this table may name — the cube's own, so drift is checkable. */
export const cubeCells = () => [...CENSUS.keys()];

/**
 * actOf(resolution) -> { resolution, op, grain, cell, mode, domain, terrain, stance, positive, owes, null, why, typedBy }
 * A resolution the table does not know is a typed gap, never a silent no-op; a
 * resolution naming a cell the cube does not have is the cube's own gap.
 */
export function actOf(resolution) {
  const a = RESOLUTIONS[String(resolution)];
  if (!a) return { gap: "unknown_resolution", known: Object.keys(RESOLUTIONS) };
  const cell = cube.cellOf(a.op, a.grain);
  if (cell?.gap) return cell;
  const key = `${a.op}·${a.grain}`;
  const census = CENSUS.get(key) ?? null;
  return {
    resolution: String(resolution),
    op: a.op, grain: a.grain, cell: key,
    mode: cell.mode, domain: cell.domain, terrain: cell.terrain, stance: cell.stance,
    positive: census?.positive ?? null,
    owes: census ? [...census.nulls] : [],
    null: a.null ?? null,
    why: a.why,
    typedBy: "workplan-acts",
  };
}

/** cellToken(act) — the token the medium writes on a line: "cell=INS·Figure", or "" for a gap. */
export function cellToken(act) {
  return act && !act.gap && act.cell ? `cell=${act.cell}` : "";
}

/** The cell a mark line carries, by its kind — the medium's one entry point. */
export const markCell = (kind) => {
  const a = actOf(markResolution(kind));
  return a.gap ? null : a.cell;
};

/** The resolution a scent's state and release reason name. */
export function scentResolution(state, by = "none") {
  if (state === "open") return "scent:open";
  if (state === "walled") return "scent:walled";
  if (by === "arrival") return "scent:arrival";
  if (by === "merge") return "scent:merge";
  return "scent:reframe";
}

/** drift() — the resolutions naming a cell outside the cube, or one the census does not carry. */
export function drift() {
  const cells = new Set(CENSUS.keys());
  return Object.entries(RESOLUTIONS)
    .map(([name, a]) => ({ name, cell: `${a.op}·${a.grain}` }))
    .filter(({ name, cell }) => {
      const a = actOf(name);
      return a.gap || !cells.has(cell);
    });
}

/** pairing() — every POSITIVE resolution owes a null. The failure this file exists to catch. */
export function pairing() {
  const rows = Object.entries(RESOLUTIONS).map(([name]) => {
    const a = actOf(name);
    return { name, cell: a.cell, positive: !a.null, owes: a.owes ?? [] };
  });
  return {
    paired: rows.filter((r) => r.positive && r.owes.length),
    negative: rows.filter((r) => !r.positive),
    unpaired: rows.filter((r) => r.positive && !r.owes.length).map((r) => r.name),
  };
}

/**
 * planHelix({ transitions }) -> { schema, ok, violations, acts }
 *   transitions  the workplan's typed moves, in order: { resolution, target?, item? }
 * A transition's TARGET is what the act is about (defaults to `item`). Violations:
 *   unknown_resolution  a resolution the table does not know
 *   unpaired            a positive resolution whose cell owes no null (the pairing rule)
 *   ins_first           a DONE/RESOLVED/BLOCKED/REFUTED/CONTENDED act on a target that was
 *                       never instantiated (no INS — a `mark:claim` or `plan:open` — on it)
 *   completes_before_claim  a DONE/RESOLVED before the item was ever claimed (a stricter reading
 *                       of ins_first, named separately so a caller can tell the two apart)
 */
export function planHelix({ transitions = [] } = {}) {
  const instantiated = new Set();
  const claimed = new Set();
  const violations = [];
  const acts = {};
  for (const t of transitions) {
    const a = actOf(t?.resolution);
    if (a.gap) { violations.push({ resolution: String(t?.resolution), why: `unknown resolution: ${t?.resolution}` }); continue; }
    acts[a.cell] = (acts[a.cell] ?? 0) + 1;
    const target = t.target ?? t.item ?? null;
    if (!a.null && a.owes.length === 0) {
      violations.push({ resolution: a.resolution, act: a.cell, why: `${a.cell} lands a positive owing no null — silence would read as support` });
    }
    if (INSTANTIATES.includes(a.resolution)) {
      if (target != null) { instantiated.add(target); claimed.add(target); }
      continue;
    }
    if (target != null && COMPLETES.includes(a.resolution) && !claimed.has(target)) {
      violations.push({ resolution: a.resolution, act: a.cell, why: `${target} was ${a.resolution} before it was ever claimed (no INS on the record)` });
      continue;
    }
    if (target != null && ON_ITEM.includes(a.resolution) && !instantiated.has(target)) {
      violations.push({ resolution: a.resolution, act: a.cell, why: `${target} is ${a.resolution} (${a.op}) but was never instantiated (no INS on the record)` });
    }
  }
  return { schema: WORKPLAN_ACTS_SCHEMA, ok: violations.length === 0, violations, acts };
}
