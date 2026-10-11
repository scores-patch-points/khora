// tests/hyperlexicon-abstraction.test.js — the Full-cube abstraction registry.
//
// Direct kernel probes of native/kernel/hyperlexicon-abstraction.js, the
// widening of the Hyperlexicon from a relation-composition dictionary into
// the ledger of what the Fold has learned to recognize across all nine
// terrains. The standing ladder is the fold self-audit experiment's ruling:
// coherence alone never earns; a row must carry measured validation, and a
// refuted row is preserved, never silently promoted back.

import test from "node:test";
import assert from "node:assert/strict";

import {
  HL_ABSTRACTION_SCHEMA,
  abstractionId,
  createAbstractionRegistry,
  admitAbstraction,
  earnAbstraction,
  refuteAbstraction,
  abstractionAt,
  compositionCoords,
  withMetaMembership,
  abstractionNotes,
  releaseDecision,
} from "../kernel/hyperlexicon-abstraction.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../kernel/hyperlexicon.js";

// ── 1. Every row carries its cube cell, depth, and referent type ─────────
test("admitted rows carry the cube cell, depth, and referent type", () => {
  const r = createAbstractionRegistry();
  const withRow = admitAbstraction(r, {
    op: "SIG",
    grain: "Pattern",
    depth: 0,
    referentType: "entity",
    label: "functional-kind",
  });
  const kind = Object.values(withRow.abstractions)[0];
  assert.equal(kind.schema, HL_ABSTRACTION_SCHEMA);
  assert.equal(kind.standing, "candidate");
  assert.equal(kind.cell.op, "SIG");
  assert.equal(kind.cell.grain, "Pattern");
  assert.equal(kind.terrain, "Kind");
  assert.equal(kind.cell.mode, "Relate");
  assert.equal(kind.cell.stance, "Tracing");
  assert.equal(kind.depth, 0);
  assert.equal(kind.referentType, "entity");
});

// ── 2. Coherence alone never earns ───────────────────────────────────────
test("earned requires measured validation; coherence-only is refused", () => {
  const r = createAbstractionRegistry();
  const admitted = admitAbstraction(r, { op: "SIG", grain: "Pattern", label: "k", depth: 0 });
  const id = Object.values(admitted.abstractions)[0].id;
  assert.throws(() => earnAbstraction(admitted, { id }), /consequence|measured|coherence/i);
  const earned = earnAbstraction(admitted, {
    id,
    validation: { method: "held_out_consequence", effect: 0.61, pValue: 0.01, nullMethod: "outer_null" },
  });
  assert.equal(earned.abstractions[id].standing, "earned");
  assert.equal(earned.abstractions[id].validation.effect, 0.61);
});

// ── 3. Refuted is preserved with its defeat, never silently re-earned ────
test("a refuted row is preserved and cannot be re-earned by override", () => {
  const r = createAbstractionRegistry();
  const admitted = admitAbstraction(r, { op: "SIG", grain: "Pattern", label: "k", depth: 0 });
  const id = Object.values(admitted.abstractions)[0].id;
  const defeated = refuteAbstraction(admitted, {
    id,
    falsifier: "two structurally identical populations exceeded the cutoff yet showed no failure",
    reason: { basis: "the rule predicted a repair benefit that a controlled counterexample contradicted" },
  });
  assert.equal(defeated.abstractions[id].standing, "refuted");
  assert.equal(defeated.abstractions[id].retractions.length, 1);
  // No override: earned on a refuted row leaves it refuted.
  const attempted = earnAbstraction(defeated, {
    id,
    validation: { method: "held_out_consequence", effect: 0.8, pValue: 0.001 },
  });
  assert.equal(attempted.abstractions[id].standing, "refuted");
});

// ── 4. Coordinate key space: cell: · terrain: · grain: composition rules ──
// Exact label-pairs always win; coordinates apply only when the base lookup
// has no given affordance — no shadowing of the given tier.
test("coordinate composition rules resolve by cell without shadowing exact pairs", () => {
  const exact = giveHyperlexiconAffordance(createHyperlexicon(), {
    left: "feeds",
    right: "uses",
    giver: "charter ground",
    meta: { chemistry: true, yields: "supply-chain" },
  });
  const withCell = giveHyperlexiconAffordance(createHyperlexicon(), {
    left: "cell:CON·Pattern",
    right: "cell:INS·Figure",
    giver: "coordinate chemistry",
    meta: { chemistry: true, yields: "traced-system" },
  });
  // Exact pair wins over the coordinate row.
  const exactRow = compositionCoords(exact, "feeds", "uses", { leftOp: "CON", leftGrain: "Pattern", rightOp: "INS", rightGrain: "Figure" });
  assert.equal(exactRow.standing, "given");
  assert.equal(exactRow.meta.yields, "supply-chain");
  // No exact pair: the coordinate row resolves.
  const coordRow = compositionCoords(withCell, "a", "b", { leftOp: "CON", leftGrain: "Pattern", rightOp: "INS", rightGrain: "Figure" });
  assert.equal(coordRow.standing, "given");
  assert.equal(coordRow.meta.yields, "traced-system");
  // No coordinate either: honest unknown, not a synthesized given.
  const absent = compositionCoords(withCell, "a", "b", { leftOp: "DEF", leftGrain: "Figure", rightOp: "REC", rightGrain: "Pattern" });
  assert.equal(absent.standing, "unknown");
});

// ── 5. The generalized meta law: Pattern abstractions have a depth ladder ─
test("withMetaMembership ladders a BOUND Pattern abstraction into its same-terrain meta at depth+1", () => {
  const r = createAbstractionRegistry();
  const admitted = admitAbstraction(r, { op: "CON", grain: "Pattern", terrain: "Network", label: "feedback-loop", depth: 0, memberRefs: ["a", "b", "c"] });
  const id = Object.values(admitted.abstractions)[0].id;
  const { registry, meta, note, refused } = withMetaMembership(admitted, { id });
  assert.equal(refused, false);
  assert.equal(meta.terrain, "Network");
  assert.equal(meta.depth, 1);
  assert.equal(meta.standing, "given");
  assert.equal(meta.meta.chemistry, true);
  assert.equal(registry.abstractions[id].memberOf.includes(meta.id), true);
  assert.equal(note.verb, "keeps-company");

  const notes = abstractionNotes(registry);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].object, meta.id);

  // Idempotent: a second call does not mint a second meta row.
  const { registry: again } = withMetaMembership(registry, { id });
  assert.equal(Object.values(again.abstractions).filter((a) => a.depth === 1).length, 1);
});

// The law, after its live falsification (step-3 arena): a second floor must
// not be generated out of nothing — an EMPTY floor (fewer than two live
// members) and a DEFEATED floor (refuted) are refused, and the refutation is
// PRESERVED: the refusal never mints an eager meta row.
test("the meta law refuses an empty floor and a defeated floor (repaired gates)", () => {
  const r = createAbstractionRegistry();
  // empty floor — one live member cannot telescope a second floor
  const single = admitAbstraction(r, { op: "SIG", grain: "Pattern", terrain: "Kind", label: "phantom", depth: 0, memberRefs: ["e1"] });
  const sId = Object.values(single.abstractions)[0].id;
  const g1 = withMetaMembership(single, { id: sId });
  assert.equal(g1.refused, true);
  assert.match(g1.basis, /fewer than two live members|empty floor/);
  // the refusal minted NOTHING — the registry is unchanged at depth 1
  assert.equal(Object.values(g1.registry.abstractions).filter((a) => a.depth === 1).length, 0);

  // defeated floor — a refuted finding is preserved but not a parent floor
  const row = admitAbstraction(r, { op: "CON", grain: "Pattern", terrain: "Kind", label: "defeated", depth: 0, memberRefs: ["e1", "e2", "e3"] });
  const defId = Object.values(row.abstractions)[0].id;
  const defeated = refuteAbstraction(row, { id: defId, falsifier: "counterexample", reason: { basis: "defeated" } });
  assert.equal(defeated.abstractions[defId].standing, "refuted");
  const g2 = withMetaMembership(defeated, { id: defId });
  assert.equal(g2.refused, true);
  assert.match(g2.basis, /refuted|not a floor/);
  assert.equal(Object.values(g2.registry.abstractions).filter((a) => a.depth === 1).length, 0);
});

test("the meta law refuses Figure and Ground rows — units and substrates are not emission points", () => {
  const r = createAbstractionRegistry();
  const figure = admitAbstraction(r, { op: "SIG", grain: "Figure", terrain: "Entity", label: "person", depth: 0 });
  const fId = Object.values(figure.abstractions)[0].id;
  const gate = withMetaMembership(figure, { id: fId });
  assert.equal(gate.refused, true);
  assert.match(gate.basis, /Figure is a unit, Ground is a substrate/);
});

// ── 6. Lookup by coordinates and honest absence ─────────────────────────
test("abstractionAt resolves terrain anchors and returns null when absent", () => {
  const r = createAbstractionRegistry();
  const admitted = admitAbstraction(r, { op: "SIG", grain: "Pattern", terrain: "Kind", depth: 0 });
  const anchor = abstractionAt(admitted, { op: "SIG", grain: "Pattern", depth: 0 });
  assert.ok(anchor);
  assert.equal(anchor.terrain, "Kind");
  assert.equal(abstractionAt(admitted, { terrain: "Lens", depth: 0 }), null);
  assert.equal(abstractionId({ terrain: "Kind", depth: 1 }), "abstraction:kind:depth1");
});

// ── 7. The standing ladder has a consumer (step-4 repair) ───────────────
test("releaseDecision decides by standing: earned releases, candidate withholds, refuted never", () => {
  const r = createAbstractionRegistry();
  const row = admitAbstraction(r, { op: "SIG", grain: "Pattern", terrain: "Kind", label: "k", depth: 0, memberRefs: ["a", "b", "c"] });
  const id = Object.values(row.abstractions)[0].id;

  // candidate — coherence releases nothing
  const beforeWithhold = Object.values(row.abstractions)[0];
  const c = releaseDecision(row, { id });
  assert.equal(c.released, false);
  assert.equal(c.standing, "candidate");
  // the withhold changed NOTHING — still candidate, still the only row
  assert.equal(Object.values(row.abstractions).length, 1);
  assert.equal(Object.values(row.abstractions)[0].standing, "candidate");

  // earned — releases with its measured validation
  const earned = earnAbstraction(row, { id, validation: { method: "held_out_consequence", effect: 0.71, pValue: 0.01 } });
  const e = releaseDecision(earned, { id });
  assert.equal(e.released, true);
  assert.equal(e.standing, "earned");
  assert.equal(e.evidence.effect, 0.71);
  assert.notEqual(c.released, e.released);

  // refuted — never releases, even after a fresh validation is attempted
  const defeated = refuteAbstraction(earned, { id, falsifier: "counterexample", reason: { basis: "defeated" } });
  const attempted = earnAbstraction(defeated, { id, validation: { method: "fresh", effect: 0.9, pValue: 0.001 } });
  const df = releaseDecision(attempted, { id });
  assert.equal(df.released, false);
  assert.equal(df.standing, "refuted");

  // honest absence
  const missing = releaseDecision(row, { id: "abstraction:none:depth0" });
  assert.equal(missing.released, false);
  assert.equal(missing.standing, "unknown");
});