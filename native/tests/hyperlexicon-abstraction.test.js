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
test("withMetaMembership ladders any Pattern abstraction into a same-terrain meta at depth+1", () => {
  const r = createAbstractionRegistry();
  const admitted = admitAbstraction(r, { op: "CON", grain: "Pattern", terrain: "Network", label: "feedback-loop", depth: 0 });
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