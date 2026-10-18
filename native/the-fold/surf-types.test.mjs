import test from "node:test";
import assert from "node:assert/strict";
import { SURF_VERBS, SURF_TYPES, SURF_FAMILIES, SURF_ACTS, surfTypes, surfTypeOf } from "./surf-types.js";
import { cellOf, GRAINS } from "../kernel/cube.js";

test("surf's subtypes are the closed algebra: 9 families over 27 cells, derived from cube.js", () => {
  assert.equal(SURF_FAMILIES.length, 9);
  assert.equal(SURF_TYPES.length, 27);
  assert.equal(new Set(SURF_TYPES.map((t) => t.cell)).size, 27);
  for (const family of SURF_FAMILIES) {
    assert.equal(family.cells.length, 3);
    for (const cell of family.cells) assert.ok(SURF_TYPES.some((t) => t.cell === cell), `${cell} is in the family list but not the type list`);
  }
});

test("every type agrees with the kernel algebra (terrain and stance are derived, never restated)", () => {
  for (const t of SURF_TYPES) {
    const c = cellOf(t.op, t.grain);
    assert.equal(t.terrain, c.terrain, t.cell);
    assert.equal(t.stance, c.stance, t.cell);
    assert.equal(t.name, `${c.terrain} · ${c.stance}`);
    assert.equal(t.verb, SURF_VERBS[t.op]);
    assert.ok(GRAINS.includes(t.grain));
  }
});

test("the nine verbs are exactly the nine operators' — no tenth, no missing", () => {
  const ops = [...new Set(SURF_TYPES.map((t) => t.op))].sort();
  assert.deepEqual(Object.keys(SURF_VERBS).sort(), ops);
  assert.deepEqual(ops, ["CON", "DEF", "EVA", "INS", "NUL", "REC", "SEG", "SIG", "SYN"]);
});

test("grep is among the subtypes: SEG·Figure, Link · Dissecting, and its alias look resolves the same", () => {
  const g = surfTypeOf("grep");
  assert.equal(g.cell, "SEG·Figure");
  assert.equal(g.terrain, "Link");
  assert.equal(g.stance, "Dissecting");
  assert.equal(g.verb, "snip");
  assert.deepEqual(surfTypeOf("look").cell, g.cell);
});

test("the canon's fixed acts land on their canonical cells", () => {
  assert.equal(surfTypeOf("read").cell, "SEG·Ground"); // the surfer's own act
  assert.equal(surfTypeOf("fetch").cell, "INS·Ground"); // corpus admission: material comes into being
  assert.equal(surfTypeOf("recall").cell, "CON·Figure"); // activation: one recurrent hop
  assert.equal(surfTypeOf("judge").cell, "EVA·Pattern"); // the relevance gate
  assert.equal(surfTypeOf("trail").cell, "NUL·Ground"); // the colony's ground, received not derived
  assert.equal(surfTypeOf("notes").cell, "NUL·Ground"); // alias: the worknote trail
});

test("every declared act occupies one of the 27; an undeclared act is a typed gap naming what was known", () => {
  const cells = new Set(SURF_TYPES.map((t) => t.cell));
  for (const a of SURF_ACTS) assert.ok(cells.has(a.cell), `${a.act} declares ${a.cell}, which is not a cell`);
  const gap = surfTypeOf("frobnicate");
  assert.equal(gap.gap, "unknown_surf_act");
  assert.match(gap.reason, /frobnicate/);
  assert.deepEqual(gap.known, SURF_ACTS.map((a) => a.act));
  assert.equal(surfTypes().length, 27);
});
