import test from "node:test";
import assert from "node:assert/strict";
import { dreamRows, RECORD_LIVE_SPEC } from "./opencode-dream.mjs";

// A record's live answers, after last-wins-with-fork (opencode-record.js::live): saved has two
// live answers (711 and 705), and 705 is seconded by a second source (a candidate).
const LIVE = [
  { referent: "saved", id: "british#1", delta0: "711" },
  { referent: "saved", id: "marshall#2", delta0: "705" },
  { referent: "saved", id: "beesley#3", delta0: "705" },
];

test("the record's live answers reach the dream: a fork is a disclosed discrepancy, agreement is a candidate", () => {
  const d = dreamRows(LIVE, { cap: 64 });
  assert.equal(d.schema, "OpenCodeDream@1");
  const contest = d.settled.contests[0];
  assert.ok(contest, "the fork (two live answers) is a contest");
  assert.deepEqual(contest.readings.map((r) => r.value).sort(), ["705", "711"]);
  assert.ok(d.settled.candidates.some((c) => c.value === "705" && c.count === 2), "the seconded answer is a candidate (recurrence met)");
});

test("the gate runs ONLY when a consequence is supplied", () => {
  assert.equal(dreamRows(LIVE).gated, null, "no consequence measurement -> no gate");
  const g = dreamRows(LIVE, { consequenceOf: () => ({ status: "mattered" }) }).gated;
  assert.ok(g, "the gate ran");
  assert.ok(g.promoted.length >= 1, "the candidate with measured consequence promotes");
});

test("the spec names the record's shape and nothing else", () => {
  assert.deepEqual(RECORD_LIVE_SPEC.being({ referent: "r" }), "r");
  assert.equal(RECORD_LIVE_SPEC.value({ delta0: "x" }), "x");
  assert.equal(RECORD_LIVE_SPEC.witness({ id: "i" }), "i");
  assert.equal(RECORD_LIVE_SPEC.predicate({}), "answer");
});

test("an empty record dreams nothing", () => {
  const d = dreamRows([]);
  assert.equal(d.actions.length, 0);
  assert.equal(d.settled.contests.length, 0);
  assert.equal(d.settled.candidates.length, 0);
});
