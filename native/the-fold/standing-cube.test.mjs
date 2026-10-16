// Falsification: the standing cube.
//
// Claims under test:
//   1. GENERATED — the 27 cells come from the cube, not a hand list. everyCell() must equal
//      cube.js::algebraAddresses(), cell for cell, in order.
//   2. THE PAIRING RULE — every positive owes a null. No cell may have a positive with no null.
//   3. NO DRIFT — the census names no cell the cube does not have (and covers all of them).
//   4. THE THREE NEGATIVES land where the docs say: the cut at SEG·Figure, the void at DEF·Ground,
//      the contest at CON·Figure.
//   5. TYPED GAPS — an unknown operator or grain is the cube's own gap, never a silent no-op.
//   6. TRUE-VALUE PROPER — EVA·Pattern's positive IS the standing set (AGREE/SINGLE/DISAGREE/
//      CONTRADICTED/UNDETERMINED), with its two laws.
import test from "node:test";
import assert from "node:assert/strict";
import * as cube from "../kernel/cube.js";
import { makeStandingCube, JAIN_SEED, THE_THREE_NEGATIVES, HUB_NULLS, STANDING_VALUES } from "./standing-cube.js";

const S = makeStandingCube({ operators: cube });

test("generated: everyCell() equals the cube's own algebraAddresses()", () => {
  const generated = S.everyCell().map((c) => c.cell);
  const algebra = cube.algebraAddresses().map((c) => `${c.op}·${c.grain}`);
  assert.equal(generated.length, 27, "not 27 cells");
  assert.deepEqual(generated, algebra, "the enumeration drifted from the cube");
});

test("the pairing rule: every positive owes a null; no cell is empty", () => {
  const p = S.pairing();
  assert.deepEqual(p.positiveWithoutNull, [], "a positive with no null — silence would read as support");
  assert.deepEqual(p.nullWithoutPositive, [], "a null with no positive");
  assert.deepEqual(p.empty, [], "a cell with neither a positive nor a null");
  assert.equal(p.paired.length, 27, "not every cell is paired");
});

test("no drift: the census names no cell the cube does not have", () => {
  assert.deepEqual(S.drift(), [], "the census names a cell outside the cube");
});

test("the three negatives land on the docs' cells", () => {
  const got = S.negatives().map((n) => `${n.kind}:${n.cell.cell}`);
  assert.deepEqual(got, ["cut:SEG·Figure", "void:DEF·Ground", "contest:CON·Figure"]);
  for (const n of S.negatives()) assert.ok(n.cell.nulls.length > 0, `${n.kind} owes a null`);
  // and the cells they name are exactly the declared ones
  assert.deepEqual(THE_THREE_NEGATIVES.map((n) => n.cell), ["SEG·Figure", "DEF·Ground", "CON·Figure"]);
});

test("true-value proper: EVA·Pattern is the standing set", () => {
  const st = S.standing();
  assert.equal(st.cell, "EVA·Pattern");
  assert.deepEqual(st.values, STANDING_VALUES);
  assert.deepEqual([...STANDING_VALUES], ["AGREE", "SINGLE", "DISAGREE", "CONTRADICTED", "UNDETERMINED"]);
  assert.equal(st.laws.length, 2, "the two self-witness laws");
  assert.match(S.interrogate("EVA", "Pattern").positive, /standing/);
});

test("typed gaps: an unknown operator or grain is the cube's own gap", () => {
  assert.equal(S.interrogate("ALT", "Ground").gap, "unknown_spec", "ALT is not a canonical operator");
  assert.equal(S.interrogate("NUL", "Nope").gap, "unknown_spec");
  const hit = S.interrogate("NUL", "Figure");
  assert.equal(hit.terrain, "Entity");
  assert.ok(hit.positive && hit.nulls.length, "a real cell with nulls");
});

test("the hub nulls carry no cell", () => {
  assert.ok(HUB_NULLS.length >= 3);
  for (const h of HUB_NULLS) assert.equal(h.cell, undefined, "a hub null must not name a cell");
  assert.ok(HUB_NULLS.some((h) => h.gap === "self_referential"));
});

test("the Jain seed is the seven-fold predication", () => {
  assert.equal(JAIN_SEED.length, 7);
  assert.ok(JAIN_SEED.includes("asti") && JAIN_SEED.includes("nasti") && JAIN_SEED.includes("avaktavya"));
});
