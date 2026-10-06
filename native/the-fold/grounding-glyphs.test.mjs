// grounding-glyphs.test.mjs — the glyph table and its reverse lookup.
// REC changed from ⊛ to ◉ on 2026-10-06; ingesting older records must still
// resolve the mark they were written with.
import test from "node:test";
import assert from "node:assert/strict";
import { OPERATOR_GLYPHS, LEGACY_GLYPHS, operatorOfGlyph } from "./surface/grounding-glyphs.mjs";

test("REC is drawn as a ring around a filled circle", () => {
  assert.equal(OPERATOR_GLYPHS.REC, "◉");
});

test("every current glyph resolves back to its operator", () => {
  for (const [op, g] of Object.entries(OPERATOR_GLYPHS)) assert.equal(operatorOfGlyph(g), op, `${g} is ${op}`);
});

test("REC's earlier marks still resolve, so older records ingest", () => {
  assert.equal(operatorOfGlyph("⊛"), "REC", "the wiki's mark until 2026-10-06");
  assert.equal(operatorOfGlyph("↬"), "REC", "penelope's tapestry mark");
});

test("a legacy mark never shadows a current one", () => {
  const current = new Set(Object.values(OPERATOR_GLYPHS));
  for (const g of Object.keys(LEGACY_GLYPHS)) assert.ok(!current.has(g), `${g} is both current and legacy`);
});

test("△ is not aliased (it was INS, it is SYN) and unknown marks are null", () => {
  assert.equal(operatorOfGlyph("△"), "SYN");
  assert.equal(operatorOfGlyph("?"), null);
  assert.equal(operatorOfGlyph(undefined), null);
});
