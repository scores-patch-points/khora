// respects — Same and Other in some respect, as kernel law (kernel/respects.js). Medium-blind: levels are plain names, cells plain records.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { makeRespects, REFUSALS, cellKey, parseKey, VERDICTS } from "../kernel/respects.js";
import { makeCommitments } from "../kernel/commitments.js";
import { createTaskLog } from "../kernel/task-log.js";
const R = makeRespects({ levels: ["part", "member", "tie", "whole"] });
const C = (op, grain, level, outcome, more = {}) => ({ op, grain, level, outcome, warrant: "w", null: "n", ...more });

test("L1: a same or other with no null is refused into a gap, by name", () => {
  const c = R.cell({ op: "CON", grain: "Figure", level: "tie", outcome: "same", warrant: "w" });
  assert.equal(c.outcome, "gap"); assert.equal(c.claimed, "same"); assert.equal(c.refused.type, REFUSALS.NO_NULL);
  assert.equal(R.cell(C("CON", "Figure", "tie", "same")).outcome, "same");
  assert.equal(R.cell({ op: "REC", grain: "Ground", level: "whole", outcome: "gap" }).outcome, "gap", "a gap needs no null");
});

test("L2: a cell over a gap is a gap; it climbs every level; only a gap propagates", () => {
  const profile = [C("INS", "Figure", "member", "gap"), C("CON", "Figure", "tie", "same", { rests: ["INS·Figure@member"] }), C("SYN", "Figure", "whole", "same", { rests: ["CON·Figure@tie"] })];
  const out = Object.fromEntries(R.compose(profile).map((x) => [cellKey(x), x]));
  assert.equal(out["CON·Figure@tie"].outcome, "gap"); assert.equal(out["CON·Figure@tie"].refused.type, REFUSALS.RESTS_ON_GAP);
  assert.equal(out["SYN·Figure@whole"].outcome, "gap", "the gap climbs");
  const other = R.compose([C("INS", "Figure", "member", "other"), C("CON", "Pattern", "tie", "same", { rests: ["INS·Figure@member"] })]);
  assert.equal(other.find((x) => x.level === "tie").outcome, "same", "different parts can still be the same whole");
  assert.equal(R.compose([C("CON", "Figure", "tie", "same", { rests: ["INS·Figure@member"] })])[0].outcome, "gap", "resting on an absent cell is resting on a gap");
});

test("L3: levels are declared; a cell rests only on lower levels", () => {
  assert.equal(R.cell(C("CON", "Figure", "galaxy", "same")).refused.type, REFUSALS.UNKNOWN_LEVEL);
  assert.equal(R.cell(C("INS", "Figure", "member", "same", { rests: ["CON·Figure@tie"] })).refused.type, REFUSALS.RESTS_NOT_BELOW);
  assert.equal(R.cell(C("INS", "Figure", "member", "same", { rests: ["SEG·Figure@member"] })).refused.type, REFUSALS.RESTS_NOT_BELOW, "the same level, a LATER operator: refused");
  assert.equal(R.cell(C("EVA", "Figure", "whole", "same", { rests: ["DEF·Figure@whole"] })).refused ?? null, null, "the same level, an EARLIER operator in the helix: allowed");
  assert.equal(R.cell(C("XYZ", "Figure", "tie", "same")).refused.type, REFUSALS.UNKNOWN_CELL);
  assert.throws(() => makeRespects({}), /levels/);
});

test("L4: within a level Figure-same entails Pattern-same and Pattern-other entails Figure-other, never the reverse, never across levels", () => {
  const up = R.entail([C("CON", "Figure", "tie", "same"), { op: "CON", grain: "Pattern", level: "tie", outcome: "gap" }]);
  assert.equal(up[1].outcome, "same");
  const none = R.entail([{ op: "CON", grain: "Figure", level: "tie", outcome: "gap" }, C("CON", "Pattern", "tie", "same")]);
  assert.equal(none[0].outcome, "gap");
  const across = R.entail([C("CON", "Figure", "tie", "same"), { op: "CON", grain: "Pattern", level: "whole", outcome: "gap" }]);
  assert.equal(across[1].outcome, "gap");
});

test("a perspective's verdict is derived from its cells: other, else gap, else same; idle differences are NUL, cared ones SIG", () => {
  const profile = [C("SEG", "Figure", "part", "other"), C("INS", "Figure", "member", "same"), C("CON", "Pattern", "tie", "same", { rests: ["INS·Figure@member"] })];
  const meaning = R.verdictFor(profile, ["INS·Figure@member", "CON·Pattern@tie"]), surface = R.verdictFor(profile, ["SEG·Figure@part"]);
  assert.equal(meaning.verdict, VERDICTS.SAME); assert.deepEqual(meaning.idle.map((x) => x.glyph), ["∅"]);
  assert.equal(surface.verdict, VERDICTS.OTHER); assert.deepEqual(surface.signal.map((x) => x.glyph), ["○"]);
  assert.equal(R.verdictFor([C("CON", "Figure", "tie", "same", { rests: ["INS·Figure@member"] })], ["CON·Figure@tie"]).verdict, VERDICTS.GAP, "a tie over an unearned member is a gap, not a same");
});

test("keys parse back to their three coordinates", () => assert.deepEqual(parseKey("CON·Pattern@tie"), { op: "CON", grain: "Pattern", level: "tie" }));

test("a commitment records the cell it is about, and its difference says so", () => {
  const K = makeCommitments(); let log = createTaskLog();
  const r = K.declare(log, { kind: "noise", members: ["n1"], giver: "g", purpose: "p", about: { op: "SEG", grain: "Figure", level: "part" } }); log = r.log;
  log = K.evaluate(log, r.id, { verdict: "holds", ground: "g", broken: "ablation" }).log;
  const d = K.differencesOf(log)[0];
  assert.equal(d.cell, "SEG·Figure@part"); assert.equal(d.op, "NUL"); assert.deepEqual(K.standings(log)[0].about, { op: "SEG", grain: "Figure", level: "part" });
});

test("respects.js names no medium", () => {
  const src = fs.readFileSync(new URL("../kernel/respects.js", import.meta.url), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (const w of ["sentence", "word", "token", "pixel", "frame", "image", "text", "verb"]) assert.ok(!new RegExp(`\\b${w}\\b`, "i").test(src), `names "${w}"`);
});
