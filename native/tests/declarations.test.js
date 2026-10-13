// tests/declarations.test.js — the declarations register never loses a
// standing it did not record losing. A re-proposal (an acquirer re-running
// on a new corpus) may supersede a live CANDIDATE, never a GIVEN row and
// never a concession; only concede(), with a trigger, unmakes a GIVEN.

import test from "node:test";
import assert from "node:assert/strict";
import { createTaskLog } from "../kernel/task-log.js";
import { proposeCandidate, promote, concede, foldDeclarations } from "../interpretation/declarations.js";

const propose = (log, source) => proposeCandidate(log, { kind: "functional", rel: "born_in", acquisition: { subjects: 5, counterexamples: 0 }, source });
const counts = (f) => ({ given: f.given.length, candidates: f.candidates.length, conceded: f.conceded.length });

test("a re-proposal keeps the GIVEN declaration beside the new candidate", () => {
  let log = createTaskLog();
  const first = propose(log, "corpus-1"); log = first.log;
  const p = promote(log, first.id, { giver: "a named person" }); log = p.log;
  assert.equal(p.ok, true);
  const again = propose(log, "corpus-2"); log = again.log;
  const f = foldDeclarations(log);
  assert.deepEqual(counts(f), { given: 1, candidates: 1, conceded: 0 });
  assert.equal(f.given[0].taskId, first.id);
  assert.equal(f.given[0].giver, "a named person");
  assert.equal(f.candidates[0].taskId, again.id);
  assert.equal(f.candidates[0].source, "corpus-2");
});

test("only concede(), with a trigger, removes the GIVEN row — and records it", () => {
  let log = createTaskLog();
  const first = propose(log, "corpus-1"); log = first.log;
  log = promote(log, first.id, { giver: "a named person" }).log;
  log = propose(log, "corpus-2").log;
  assert.equal(concede(log, first.id, { trigger: "" }).ok, false);
  log = concede(log, first.id, { trigger: "\"x\" now binds 2 distinct objects for born_in" }).log;
  const f = foldDeclarations(log);
  assert.deepEqual(counts(f), { given: 0, candidates: 1, conceded: 1 });
  assert.equal(f.conceded[0].taskId, first.id);
  assert.equal(f.conceded[0].giver, "a named person");
});

test("promoting a candidate after a newer proposal still lands it as GIVEN", () => {
  let log = createTaskLog();
  const first = propose(log, "corpus-1"); log = first.log;
  log = propose(log, "corpus-2").log;
  const p = promote(log, first.id, { giver: "a named person" }); log = p.log;
  assert.equal(p.ok, true);
  const f = foldDeclarations(log);
  assert.deepEqual(counts(f), { given: 1, candidates: 1, conceded: 0 });
  assert.equal(f.given[0].taskId, first.id);
});

test("a re-proposal after a concession keeps the concession on the record", () => {
  let log = createTaskLog();
  const first = propose(log, "corpus-1"); log = first.log;
  log = concede(log, first.id, { trigger: "\"x\" now binds 2 distinct objects for born_in" }).log;
  log = propose(log, "corpus-2").log;
  assert.deepEqual(counts(foldDeclarations(log)), { given: 0, candidates: 1, conceded: 1 });
});

test("control: a later candidate still supersedes an earlier live candidate", () => {
  let log = createTaskLog();
  log = propose(log, "corpus-1").log;
  const second = propose(log, "corpus-2"); log = second.log;
  const f = foldDeclarations(log);
  assert.deepEqual(counts(f), { given: 0, candidates: 1, conceded: 0 });
  assert.equal(f.candidates[0].taskId, second.id);
});
