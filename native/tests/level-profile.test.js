// tests/level-profile.test.js — the level profile as a fold over admitted acts.
//
// Direct kernel probes of native/kernel/level-profile.js. The laws under test:
//   · the cube classifies ACTS, never content — an occupancy counts moves;
//   · an empty terrain is a TYPED ABSENCE, never a verdict (CUBE.md:6; P64);
//   · the individuation is a NOMINATION over the grain mix, not a lookup;
//   · the II.23 control: a per-referent reading that a random act→referent
//     pairing would reproduce does not establish (real ≤ its shuffled null).

import test from "node:test";
import assert from "node:assert/strict";

import {
  LEVEL_PROFILE_SCHEMA,
  LEVEL_PROFILES_SCHEMA,
  INDIVIDUATION,
  typedAct,
  indexActs,
  dominantGrain,
  classifyIndividuation,
  levelProfile,
  buildLevelProfiles,
  meanConcentration,
  permutationControl,
  levelProfileLines,
} from "../kernel/level-profile.js";

const cells = (...pairs) => pairs.map(([op, grain]) => ({ op, grain }));
// A referent's own admitted acts, already typed (what levelProfile consumes).
const typed = (id, ...pairs) => pairs.map(([op, grain]) => typedAct({ referent: id, op, grain }));

// ── 1. The occupancy is the nine terrains, aggregated over modes ──────────
test("acts land on the right terrain; all three modes of a domain share one", () => {
  const p = levelProfile("smith", typed("smith", ["NUL", "Figure"], ["SIG", "Figure"], ["INS", "Figure"], ["CON", "Figure"], ["EVA", "Pattern"]));
  assert.equal(p.schema, LEVEL_PROFILE_SCHEMA);
  assert.equal(p.occupancy.Existence.Figure, 3, "NUL/SIG/INS·Figure are all Entity");
  assert.equal(p.occupancy.Structure.Figure, 1, "CON·Figure is Link");
  assert.equal(p.occupancy.Interpretation.Pattern, 1, "EVA·Pattern is Paradigm");
  assert.equal(p.total, 5);
  assert.equal(p.earned.length, 3);
  assert.equal(p.absent.length, 6);
  assert.deepEqual(p.earned.map((t) => t.terrain).sort(), ["Entity", "Link", "Paradigm"]);
});

// ── 2. The individuation is a nomination over the grain mix ───────────────
test("grain-dominant profiles read emanon / protogon / holon; a tie is mixed", () => {
  assert.equal(classifyIndividuation({ Ground: 3, Figure: 0, Pattern: 0 }), INDIVIDUATION.EMANON);
  assert.equal(classifyIndividuation({ Ground: 0, Figure: 3, Pattern: 1 }), INDIVIDUATION.PROTOGON);
  assert.equal(classifyIndividuation({ Ground: 0, Figure: 1, Pattern: 4 }), INDIVIDUATION.HOLON);
  assert.equal(classifyIndividuation({ Ground: 2, Figure: 2, Pattern: 0 }), INDIVIDUATION.MIXED);
  assert.equal(classifyIndividuation({ Ground: 0, Figure: 0, Pattern: 0 }), INDIVIDUATION.UNESTABLISHED);
  assert.equal(dominantGrain({ Ground: 1, Figure: 1, Pattern: 1 }), null, "a three-way tie has no dominant grain");
});

// ── 3. Non-cells and unaddressed acts are TYPED REFUSALS, never dropped ───
test("unaddressed, untyped, and non-cell acts are refused with a type", () => {
  assert.equal(typedAct({ op: "NUL", grain: "Figure" }).refusal.gap, "unaddressed_act");
  assert.equal(typedAct({ referent: "x" }).refusal.gap, "untyped_act");
  const notCell = typedAct({ referent: "x", op: "ALT", grain: "Ground" });
  assert.equal(notCell.refusal.gap, "not_a_cube_cell", "ALT is not a canonical operator");
  const terrainInGrainSlot = typedAct({ referent: "x", cell: "SEG·Field" });
  assert.equal(terrainInGrainSlot.refusal.gap, "not_a_cube_cell", "a terrain name is not a grain");
  const { byReferent, refusals } = indexActs([{ referent: "x", op: "NUL", grain: "Figure" }, { op: "NUL", grain: "Figure" }, { referent: "y", cell: "SEG·Field" }]);
  assert.equal(byReferent.get("x").length, 1);
  assert.equal(refusals.length, 2);
});

// ── 4. An empty being is disclosed, not hidden ────────────────────────────
test("a referent with no acts gets a profile of nine typed absences", () => {
  const built = buildLevelProfiles({ referents: ["smith", "ghost"], acts: cells(["NUL", "Figure"]).map((c) => ({ referent: "smith", ...c })) });
  assert.equal(built.schema, LEVEL_PROFILES_SCHEMA);
  const ghost = built.byId.get("ghost");
  assert.equal(ghost.total, 0);
  assert.equal(ghost.absent.length, 9);
  assert.equal(ghost.individuation, INDIVIDUATION.UNESTABLISHED);
  assert.equal(built.diagnostics.unestablished, 1);
  assert.ok(ghost.absent.every((a) => a.gap === "no_act_of_this_kind"));
});

// ── 5. II.23 — the positive control: a real pairing clears its null ───────
test("II.23 positive: grain-clustered referents establish above the shuffled null", () => {
  const acts = [];
  for (let i = 0; i < 6; i++) acts.push({ referent: "a", op: "NUL", grain: "Ground" });
  for (let i = 0; i < 6; i++) acts.push({ referent: "b", op: "SIG", grain: "Figure" });
  for (let i = 0; i < 6; i++) acts.push({ referent: "c", op: "INS", grain: "Pattern" });
  const ctl = permutationControl({ referents: ["a", "b", "c"], acts, reseeds: 128 });
  assert.equal(ctl.established, true, "a genuinely clustered pairing must clear the null");
  assert.ok(ctl.statistic > ctl.null95, `${ctl.statistic} vs null95 ${ctl.null95}`);
});

// ── 6. II.23 — the negative control: no signal does not establish ─────────
test("II.23 negative: a flat, referent-independent pairing does not establish", () => {
  // Every referent carries exactly one act of each grain — no grain is
  // characteristic of any referent, so the label carries nothing.
  const acts = [];
  const grains = [["NUL", "Ground"], ["SIG", "Ground"], ["INS", "Ground"], ["SEG", "Figure"], ["CON", "Figure"], ["SYN", "Figure"], ["DEF", "Pattern"], ["EVA", "Pattern"], ["REC", "Pattern"]];
  for (const referent of ["a", "b", "c", "d"]) for (const [op, grain] of grains) acts.push({ referent, op, grain });
  const ctl = permutationControl({ referents: ["a", "b", "c", "d"], acts, reseeds: 128 });
  assert.equal(ctl.established, false, "a pairing a random relabel reproduces must not establish");
  assert.ok(ctl.statistic <= ctl.null95, `${ctl.statistic} vs null95 ${ctl.null95}`);
});

// ── 7. Undeclared resolution is a typed gap, never a default ──────────────
test("the permutation resolution must be declared", () => {
  const g = permutationControl({ acts: [{ referent: "a", op: "NUL", grain: "Ground" }], reseeds: 1 });
  assert.equal(g.gap, "undeclared");
});

// ── 8. meanConcentration ignores the act-less (their absence is typed) ────
test("meanConcentration averages only referents that admitted acts", () => {
  const a = levelProfile("a", typed("a", ["NUL", "Figure"], ["SIG", "Figure"]));
  const b = levelProfile("b", typed("b", ["NUL", "Figure"], ["CON", "Pattern"]));
  const empty = levelProfile("c", []);
  assert.equal(meanConcentration([a, b, empty]), (1 + 0.5) / 2);
});

// ── 9. The render is plain text and names the typed absences ──────────────
test("levelProfileLines renders terrains and the typed-absence count", () => {
  const p = levelProfile("dawson", typed("dawson", ["SIG", "Figure"], ["EVA", "Figure"]));
  const lines = levelProfileLines(p);
  assert.equal(lines[0], "dawson · protogon · 2 acts");
  assert.ok(lines.some((l) => l.includes("absent: 7 of 9 terrains")));
});
