// wheel ledger — an operator×grain stamp is a CUBE CELL or a typed refusal (D9).
// kernel/wheel.js; the stamp sites live in proxy-runner.mjs (never imported
// here: it opens ports — scanned as text).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createWheelLedger } from "../kernel/wheel.js";
import { cellOf } from "../kernel/cube.js";

const turn = (stamp) => createWheelLedger({ task: "t" }).turn("phase", "satisfy", { m: 1 }, { landed: true }, stamp);

test("D9 — a valid operator·grain stamps as a cube cell", () => {
  const t = turn({ operator: "INS", grain: "Pattern", face: "scout" });
  assert.equal(t.operator, "INS");
  assert.equal(t.grain, "Pattern");
  assert.equal(t.cell, "INS·Pattern");
  assert.equal(t.stamp_refused, undefined);
});

test("D9 — a TERRAIN name in the grain slot is a typed refusal, not a stamp; the turn still lands", () => {
  const w = createWheelLedger({ task: "t" });
  const t = w.turn("plan", "satisfy", { m: 1 }, { sections: [] }, { operator: "SEG", grain: "Field", face: "Murch" });
  assert.equal(t.grain, null, "the terrain name is not stamped as a grain");
  assert.equal(t.operator, "SEG", "the operator is a real operator and is kept");
  assert.equal(t.stamp_refused.type, "not_a_cube_cell");
  assert.equal(t.stamp_refused.offered.grain, "Field");
  assert.equal(t.stamp_refused.reads_as.cell, "SEG·Ground", "Field is the terrain of SEG·Ground; offered as a reading, never applied");
  assert.equal(w.ledger.length, 1, "the turn landed");
  assert.equal(t.rec.sections.length, 0);
  assert.deepEqual(w.stampRefusals.map((r) => r.seq), [1]);
  assert.equal(JSON.parse(JSON.stringify(w.toJSON())).turns[0].stamp_refused.type, "not_a_cube_cell");
});

test("D9 — every terrain a live site names resolves to the one cell of its operator's domain", () => {
  for (const [op, terrain, cell] of [["SEG", "Field", "SEG·Ground"], ["DEF", "Atmosphere", "DEF·Ground"], ["CON", "Link", "CON·Figure"], ["SYN", "Field", "SYN·Ground"], ["EVA", "Lens", "EVA·Figure"], ["REC", "Atmosphere", "REC·Ground"]]) {
    const t = turn({ operator: op, grain: terrain });
    assert.equal(t.stamp_refused.reads_as.cell, cell, `${op} ${terrain}`);
    assert.equal(cellOf(op, t.stamp_refused.reads_as.grain).terrain, terrain);
  }
});

test("D9 — negative controls: a terrain of ANOTHER domain, an unknown operator, a grain with no operator are refused with no reading", () => {
  const wrongDomain = turn({ operator: "SEG", grain: "Atmosphere" });
  assert.equal(wrongDomain.stamp_refused.type, "not_a_cube_cell");
  assert.equal(wrongDomain.stamp_refused.reads_as, null);
  const noOp = turn({ operator: "ALT", grain: "Ground" });
  assert.equal(noOp.operator, null);
  assert.equal(noOp.grain, null);
  assert.equal(noOp.stamp_refused.type, "not_a_cube_cell");
  const grainOnly = turn({ grain: "Ground" });
  assert.equal(grainOnly.grain, null);
  assert.equal(grainOnly.stamp_refused.type, "not_a_cube_cell");
});

test("D9 — positive control: no stamp at all is untouched (null, null, no refusal)", () => {
  const t = turn({});
  assert.equal(t.operator, null);
  assert.equal(t.grain, null);
  assert.equal(t.stamp_refused, undefined);
  const op = turn({ operator: "NUL" });
  assert.equal(op.operator, "NUL");
  assert.equal(op.stamp_refused, undefined);
});

test("D9 — every wheel.turn stamp literal in proxy-runner.mjs is a cube cell", () => {
  const src = fs.readFileSync(new URL("../../proxy-runner.mjs", import.meta.url), "utf8");
  const stamps = [...src.matchAll(/operator: "([A-Z]{3})", grain: "([A-Za-z]+)"/g)].map((m) => ({ op: m[1], grain: m[2] }));
  assert.ok(stamps.length >= 10, `found ${stamps.length} stamp sites`);
  const bad = stamps.filter((s) => cellOf(s.op, s.grain).gap).map((s) => `${s.op}·${s.grain}`);
  assert.deepEqual(bad, []);
});
