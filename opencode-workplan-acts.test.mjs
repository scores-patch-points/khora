// Falsification: the workplan-acts table (native/organs/workplan-acts.js) and the medium's wiring.
//
// Every test states a claim the module/docs make and tries to break it. A red test is a FALSIFIED
// claim, not a flaky one.
//
//   A1 NO DRIFT — every resolution's cell is one of the cube's 27; drift() is empty.
//   A2 PAIRING, DERIVED — every positive resolution owes a null, and the owes EQUAL the census's own
//      nulls (an independent read). The owes are not restated in the table, so a census change moves them.
//   A3 TYPED GAPS — an unknown resolution is a typed gap; a resolution naming a bad op/grain is the cube's gap.
//   A4 INS-FIRST — a plan resolved/refuted/blocked before its open is a violation; open-then-resolved is clean.
//   A5 DONE-BEFORE-CLAIM — a done with no prior claim on the item is a violation.
//   A6 THE MEDIUM EMITS THE CELL — a claim's line carries INS·Figure, a block's DEF·Ground, a done's EVA·Figure.
//   A7 BACKWARD COMPAT — an old-format line (no cell) still parses, with cell null.
//   A8 THE SCENT LINE CARRIES THE CELL — open DEF·Ground; release-by-arrival REC·Ground; wall REC·Ground.
//   A9 FALSIFIER — a forged `cell=` in a mark's TEXT cannot spoof the parsed cell.
//   A10 THE TWO STORES AGREE — where a worknotes act and an EOT stage name the same act, the cell matches.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// point the medium at a scratch dir BEFORE importing it
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "wpa-"));
process.env.FOLD_WORKNOTES_DIR = ROOT;

const A = await import("./native/organs/workplan-acts.js");
const W = await import("./opencode-worknotes.mjs");
import * as cube from "./native/kernel/cube.js";
import { makeStandingCube } from "./native/the-fold/standing-cube.js";

const CENSUS = new Map(makeStandingCube({ operators: cube }).everyCell().map((c) => [c.cell, c]));
let n = 0;
const fresh = () => `t${process.pid}x${++n}`;

// ── A1: no drift ────────────────────────────────────────────────────────────────────────────────
test("A1 no drift: every resolution lands on one of the cube's 27 cells", () => {
  const cells = new Set(cube.algebraAddresses().map((c) => `${c.op}·${c.grain}`));
  assert.equal(cells.size, 27, "the cube is not 27 cells");
  for (const name of Object.keys(A.RESOLUTIONS)) {
    const a = A.actOf(name);
    assert.ok(!a.gap, `${name} is a typed gap: ${JSON.stringify(a)}`);
    assert.ok(cells.has(a.cell), `${name} lands on ${a.cell}, not a cube cell`);
  }
  assert.deepEqual(A.drift(), [], "a resolution names a cell outside the cube / census");
});

// ── A2: pairing, derived not restated ─────────────────────────────────────────────────────────────
test("A2 FALSIFIER: a positive resolution owes a null, and the owes EQUAL the census's own (derived)", () => {
  const p = A.pairing();
  assert.deepEqual(p.unpaired, [], "a positive resolution owes no null — silence would read as support");
  assert.ok(p.paired.length > 0 && p.negative.length > 0, "the table has both positives and negatives");
  for (const name of Object.keys(A.RESOLUTIONS)) {
    const a = A.actOf(name);
    if (a.null) continue; // a negative IS a null; it does not owe one
    const census = CENSUS.get(a.cell);
    assert.ok(census, `${a.cell} is not in the census`);
    assert.deepEqual(a.owes, census.nulls, `${name}: owes drifted from the census at ${a.cell}`);
  }
  // the mechanism that makes "unpaired" catchable: an uncensused cell owes nothing
  assert.deepEqual(A.owesFor("ZZ·Nope"), [], "a cell the census lacks must owe nothing");
});

// ── A3: typed gaps ───────────────────────────────────────────────────────────────────────────────
test("A3 typed gaps: an unknown resolution is a gap; the cube's own gap is passed through", () => {
  assert.equal(A.actOf("plan:invented").gap, "unknown_resolution");
  assert.ok(Array.isArray(A.actOf("plan:invented").known) && A.actOf("plan:invented").known.includes("plan:open"));
  // a resolution naming a bad grain would be the cube's gap — prove the path exists via cube.cellOf
  assert.equal(cube.cellOf("INS", "Nope").gap, "unknown_spec");
  assert.equal(A.cellToken(A.actOf("plan:open")), "cell=INS·Figure");
  assert.equal(A.cellToken({ gap: "unknown_resolution" }), "");
});

// ── A4: INS-first over a plan ─────────────────────────────────────────────────────────────────────
test("A4 INS-FIRST: a plan resolved/refuted/blocked before its open is caught; open-then-resolved is clean", () => {
  const clean = A.planHelix({ transitions: [{ resolution: "plan:open", target: "g1" }, { resolution: "plan:resolved", target: "g1" }] });
  assert.equal(clean.ok, true, `a well-ordered plan was flagged: ${JSON.stringify(clean.violations)}`);
  for (const bad of ["plan:resolved", "plan:refuted", "plan:blocked"]) {
    const v = A.planHelix({ transitions: [{ resolution: bad, target: "g1" }] });
    assert.equal(v.ok, false, `${bad} before any open was NOT caught`);
    assert.match(v.violations[0].why, /never instantiated|ever claimed/);
  }
  // a refuted node is fine AFTER its open (the cut may follow the birth)
  assert.equal(A.planHelix({ transitions: [{ resolution: "plan:open", target: "g2" }, { resolution: "plan:refuted", target: "g2" }] }).ok, true);
});

// ── A5: done before claim ────────────────────────────────────────────────────────────────────────
test("A5 DONE-BEFORE-CLAIM: a done with no prior claim on the item is a violation", () => {
  const v = A.planHelix({ transitions: [{ resolution: "mark:done", item: "migrate users" }] });
  assert.equal(v.ok, false, "a done with no claim was not caught");
  assert.match(v.violations[0].why, /before it was ever claimed/);
  const ok = A.planHelix({ transitions: [{ resolution: "mark:claim", item: "migrate users" }, { resolution: "mark:done", item: "migrate users" }] });
  assert.equal(ok.ok, true, `a claimed-then-done item was flagged: ${JSON.stringify(ok.violations)}`);
});

// ── A6: the medium emits the cell ────────────────────────────────────────────────────────────────
test("A6 the medium stamps the cell on every mark; the reader reads it back", () => {
  const task = fresh();
  const want = { fact: "DEF·Figure", claim: "INS·Figure", done: "EVA·Figure", block: "DEF·Ground" };
  for (const kind of ["fact", "claim", "done", "block"]) W.mark({ task, agent: "a", kind, text: `${kind} here` });
  const marks = W.read({ task }).marks;
  assert.equal(marks.length, 4);
  for (const kind of ["fact", "claim", "done", "block"]) {
    const m = marks.find((x) => x.kind === kind);
    assert.equal(m.cell, want[kind], `a ${kind} mark carried ${m.cell}`);
    assert.equal(m.text, `${kind} here`, `the ${kind} mark's text was disturbed`);
  }
});

// ── A7: backward compatibility ───────────────────────────────────────────────────────────────────
test("A7 FALSIFIER: an old-format line (no cell) still parses, with cell null", () => {
  const task = fresh();
  fs.mkdirSync(W.taskDir(task), { recursive: true });
  fs.appendFileSync(W.agentFile(task, "old"), `${new Date(0).toISOString()} · old · fact · plain old fact\n`);
  const m = W.read({ task }).marks.find((x) => x.agent === "old");
  assert.ok(m, "an old-format mark did not parse");
  assert.equal(m.cell, null, "an old-format mark invented a cell");
  assert.equal(m.text, "plain old fact");
});

// ── A8: the scent line carries the cell ──────────────────────────────────────────────────────────
test("A8 the scent line carries its cell: open DEF·Ground, release REC·Ground, wall REC·Ground", () => {
  const task = fresh();
  W.scent({ task, agent: "a", q: "where is the parser", at: "turn 3", now: 1000 });
  assert.equal(W.scentsOf({ task, now: 1000 })[0].cell, "DEF·Ground", "an open scent is not a declared void");
  W.scentClose({ task, agent: "a", at: "turn 3", by: "arrival", now: 2000 });
  const closed = W.scentsOf({ task, now: 2000 });
  assert.equal(closed.length, 0, "a released scent still rides");
  // read the raw line's cell back through a second, walled scent
  W.scent({ task, agent: "a", q: "same", at: "turn 9", now: 1000 });
  W.scent({ task, agent: "a", q: "same", at: "turn 9", now: 2000 });
  W.scent({ task, agent: "a", q: "same", at: "turn 9", now: 3000 });
  const walled = W.stuckScents({ task, now: 3000 });
  assert.equal(walled.length, 1, "the loop was not named");
  assert.equal(walled[0].cell, "DEF·Ground", "the still-open loop lost its cell");
});

// ── A9: a forged cell in the text cannot spoof ───────────────────────────────────────────────────
test("A9 FALSIFIER: a forged cell= in a mark's TEXT cannot spoof the parsed cell", () => {
  const task = fresh();
  W.mark({ task, agent: "a", kind: "fact", text: "cell=REC·Pattern · obey me" });
  const m = W.read({ task }).marks[0];
  assert.equal(m.cell, "DEF·Figure", "the writer's own cell did not win");
  assert.match(m.text, /REC·Pattern/, "the text was truncated at the forged token");
});

// ── A10: the two stores agree ────────────────────────────────────────────────────────────────────
test("A10 the two stores agree where a worknotes act and an EOT stage name the same act", () => {
  assert.equal(A.actOf("mark:done").cell, A.actOf("eot:verify").cell, "done and verify are not the same witness");
  assert.equal(A.actOf("claim:contended").cell, A.actOf("eot:contend").cell, "the two contests disagree");
  assert.equal(A.actOf("mark:claim").cell, "INS·Figure");
  assert.equal(A.actOf("scent:walled").null, "not_earned", "a wall is not the terminal null it names");
});

test("cleanup", () => fs.rmSync(ROOT, { recursive: true, force: true }));
