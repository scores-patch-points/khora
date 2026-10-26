import test from "node:test";
import assert from "node:assert/strict";
import { stageFromAtoms, judgeClaim } from "./stage.js";

// Stage@1's INS binds a claim end to a source anchor. A shared name only NOMINATES; when the caller injects holographic identity, the nominated anchor is
// asked whether it is the same being, and the answer is one of four standings (see bindEnd). The standings are scripted here so each is pinned alone;
// adapters/text/atom-world.test.mjs plants a world and lets the real fold answer.
const fig = (value, km) => ({ value, measure: "length", base: km * 1000, alts: [] });
const radius = (km, entity = 1) => ({ pred: "has_radius", args: [{ entity, name: "Mercury" }, fig(`${km} km`, km)], neg: false, hedged: false, approx: false, start: 17, end: 56, text: `has_radius(Mercury, ${km} km)` });
const source = () => stageFromAtoms([radius(2440)], { doc: "src" });
const idn = (st) => ({ standing: () => st });
const DEEP = { kind: "needs_deeper_reading", same: false, against: false, reason: "not_enough_reading", have: [2, 5], need: 3 };

test("without identity nothing changes: a different figure for the same being is C, said settled by depth", () => {
  const j = judgeClaim(source(), [radius(6000)]);
  assert.equal(j.verdict, "C");
  assert.match(j.proofs[0].binds[0], /identity settled by depth/);
  assert.equal(j.reach, undefined);
  assert.deepEqual(j.standings, []);
});

test("same: the bind is settled and the verdict says so", () => {
  const j = judgeClaim(source(), [radius(6000)], { identity: idn({ kind: "same", same: true, against: false, reason: "pattern", have: [60, 60], need: 3 }) });
  assert.equal(j.verdict, "C");
  assert.match(j.proofs[0].binds[0], /holographic identity: the same being/);
  assert.deepEqual(j.reach, { standing: "settled" });
  assert.equal(j.gaps.filter((g) => g.kind === "needs_deeper_reading").length, 0);
});

test("needs deeper reading: the bind by name and DMD stands, provisional, with how much reading is missing", () => {
  const j = judgeClaim(source(), [radius(6000)], { identity: idn(DEEP) });
  assert.equal(j.verdict, "C", "the verdict letter does not move");
  assert.match(j.proofs[0].binds[0], /needs deeper reading \(not_enough_reading; 2 and 5 occurrence\(s\), 3 needed\)/);
  assert.equal(j.reach.standing, "needs_deeper_reading");
  assert.equal(j.reach.ends[0].end, "Mercury");
  const gap = j.gaps.find((g) => g.kind === "needs_deeper_reading");
  assert.deepEqual([gap.end, gap.reason, gap.have, gap.need], ["Mercury", "not_enough_reading", [2, 5], 3]);
});

test("a support is provisional too when the being it rests on is not settled", () => {
  const j = judgeClaim(source(), [radius(2440)], { identity: idn(DEEP) });
  assert.equal(j.verdict, "E");
  assert.equal(j.reach.standing, "needs_deeper_reading");
  assert.equal(judgeClaim(source(), [radius(2440)], { identity: idn({ kind: "same", same: true, against: false, reason: "pattern", have: [9, 9], need: 3 }) }).reach.standing, "settled");
});

test("raised difference convicts nothing: the bind stands and carries the standing", () => {
  const j = judgeClaim(source(), [radius(6000)], { identity: idn({ kind: "raised_difference", same: false, against: false, reason: "worlds_differ", have: [30, 30], need: 3 }) });
  assert.equal(j.verdict, "C");
  assert.match(j.proofs[0].binds[0], /a difference of use is raised, nothing is convicted/);
  assert.equal(j.reach.standing, "needs_deeper_reading");
  assert.ok(j.gaps.some((g) => g.kind === "raised_difference"));
});

test("against: the end is not that being, so it binds to nothing and no contradiction is read against a different being", () => {
  const j = judgeClaim(source(), [radius(6000)], { identity: idn({ kind: "against", same: false, against: true, reason: "exclusion", have: [30, 30], need: 3 }) });
  assert.equal(j.verdict, "N");
  assert.equal(j.proofs.length, 0);
});

test("an end that is no referent is never asked", () => {
  let asked = 0;
  judgeClaim(source(), [{ ...radius(6000), args: [{ value: "the planet" }, fig("6,000 km", 6000)] }], { identity: { standing: () => { asked++; return DEEP; } } });
  assert.equal(asked, 0);
});
