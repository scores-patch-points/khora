import test from "node:test";
import assert from "node:assert/strict";
import { dream, wake, settle, projectField } from "./consolidation.js";

// A stand-in notes door: foldWithStanding returns the ledger's notes, hear is a no-op here.
const door = { foldWithStanding: (log) => log.notes ?? [], hear: (log) => log };
const LOG = { entries: [], notes: [{ id: "n1", sources: 2 }, { id: "n2", sources: 1 }] };

// A day's action log: 40 disputed beings (each two readings), one of them recurrent, over a
// small cap so the worktree must prune.
function actions() {
  const a = [];
  for (let i = 0; i < 40; i++) {
    a.push({ being: "x" + i, predicate: "is", value: "a", witness: "s1#" + i });
    a.push({ being: "x" + i, predicate: "is", value: "b", witness: "s2#" + i });
  }
  a.push({ being: "x0", predicate: "is", value: "a", witness: "s3#0" }); // a second witness -> recurrence
  return a;
}

test("wake: the cheap pre-pass separates recurrence, question, disagreement, and a bounded worktree", () => {
  const w = wake(actions(), { cap: 10 });
  assert.ok(w.recurrent.length >= 1, "x0/is/a reached a second independent witness");
  assert.equal(w.alternatives.length, 40);
  assert.equal(w.discrepancies.length, 40);
  assert.equal(w.worktree.length, 10, "the worktree is bounded by the declared cap");
  assert.ok(w.pruned.length > 0, "the drops are disclosed");
  assert.ok(w.pruned[0].addrs.length > 0, "every pruned entry carries its path back");
  assert.equal(w.actionLog.length, actions().length, "the action log is immortal, never pruned");
});

test("dream: the night carries the bounded worktree, and still projects the field over the ledger", async () => {
  const r = await dream(door, LOG, { actions: actions(), cap: 10 });
  assert.deepEqual(r.field.map((n) => n.id), ["n1"]);
  assert.deepEqual(r.echo.map((n) => n.id), ["n2"]);
  assert.ok(r.waking, "the waking pre-pass is carried");
  assert.equal(r.waking.worktree.length, 10);
  assert.equal(r.report.waking.pruned, r.waking.pruned.length);
  assert.ok(r.report.waking.recurrent >= 1);
});

test("dream without actions keeps the old behavior exactly (waking is null, non-breaking)", async () => {
  const r = await dream(door, LOG, {});
  assert.equal(r.waking, null);
  assert.equal(r.report.waking, undefined);
  assert.deepEqual(r.field.map((n) => n.id), ["n1"]);
  assert.deepEqual(r.echo.map((n) => n.id), ["n2"]);
});

test("projectField is untouched: a note stands on sources >= floor, else falls to the echo", () => {
  const { field, echo, cursor } = projectField(door, LOG, { floor: 2 });
  assert.equal(cursor, 0);
  assert.deepEqual(field.map((n) => n.id), ["n1"]);
  assert.deepEqual(echo.map((n) => n.id), ["n2"]);
});

test("settle: a discrepancy becomes a CONTEST (disclosed), a nomination a QUESTION, a support a CANDIDATE", () => {
  const s = settle(wake(actions(), { cap: 10 }));
  assert.equal(s.contests.length, 40, "every disagreeing being is a contest");
  assert.equal(s.questions.length, 40, "every nominated pair is a question for the meet");
  assert.ok(s.candidates.length >= 1, "the recurrent key is a candidate");
  assert.equal(s.candidates[0].owed, "consequence");
  // the disagreement is KEPT, both readings carried — never collapsed to a winner
  assert.ok(s.contests[0].readings.length >= 2);
});

test("settle NEVER PROMOTES: promoted is empty and says why", () => {
  const s = settle(wake(actions(), { cap: 10 }));
  assert.deepEqual(s.promoted, []);
  assert.match(s.reason, /never promoted/);
  assert.ok(!JSON.stringify(s).includes('"standing":"standing"'));
});
