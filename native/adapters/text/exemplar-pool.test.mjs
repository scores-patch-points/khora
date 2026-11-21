import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExemplarPool, getExemplarPool, mostUniqueExemplars, allExemplars, nearestCellByString } from "./exemplar-pool.mjs";

test("buildExemplarPool: 27 cells", () => {
  const pool = buildExemplarPool("English", 3);
  assert.equal(pool.nCells, 27);
  assert.equal(pool.K, 3);
});

test("mostUniqueExemplars: returns exemplars for INS|FIGURE", () => {
  const exs = mostUniqueExemplars("INS|FIGURE", 3);
  assert.ok(exs.length > 0, "no exemplars");
  assert.ok(exs[0].verb, "no verb");
});

test("allExemplars: returns 27*K exemplars", () => {
  const all = allExemplars();
  // 25 cells have scatter points (2 are empty), so 25*3 = 75
  assert.ok(all.length >= 70, `got ${all.length}`);
});

test("nearestCellByString: finds nearest centroid", () => {
  const r = nearestCellByString("go");
  assert.ok(r.cell, "no cell");
  assert.ok(r.similarity >= 0, "negative similarity");
});

test("empty cells have no exemplars", () => {
  const exs = mostUniqueExemplars("SYN|GROUND", 3);
  assert.equal(exs.length, 0, "empty cell should have no exemplars");
});
