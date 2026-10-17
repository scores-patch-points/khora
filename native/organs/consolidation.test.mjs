import test from "node:test";
import assert from "node:assert/strict";
import { dream, wake, settle, promote, projectField } from "./consolidation.js";
import { createForWhom } from "../kernel/for-whom.js";
import { identityAlternative } from "../kernel/identity.js";

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

test("settle: given reads, the MEET RUNS — a pair one for-whom joins survives; a divided pair splits", () => {
  // The Titanic, via the house's own for-whom/identity machinery: one question, several accounts.
  const fw = createForWhom({ id: "q-saved", giver: "the reader", question: "How many lives were saved?" });
  const entry = (id, doc, s, raw, ref) => ({ schema: "EOHyperedge@1", id: "value:" + id, witness: doc, scope: { byteOffset: s }, relation: "count", referent: ref, participants: [{ surface: raw, ref }, { surface: ref, ref }] });
  const entries = [
    entry("b711", "british", 100, "711", "saved"),
    entry("m705", "marshall", 200, "705", "saved"),
    entry("be705", "beesley", 300, "705", "saved"),
    entry("m1635", "marshall", 400, "1635", "lost"),
    entry("sen500", "senate", 500, "nearly 500", "sacrificed"),
  ];
  const nominated = [["711", "705"], ["711", "1635"], ["711", "nearly 500"], ["1635", "nearly 500"]].map(([a, b]) => identityAlternative({ left: a, right: b, giver: "the unit string" }));
  const supports = [{ left: "711", right: "705", witness: "british#100" }];
  const attacks = [
    { left: "711", right: "1635", witness: "british#100", reason: "different referents for this question" },
    { left: "711", right: "nearly 500", witness: "british#100", reason: "different referents for this question" },
    { left: "1635", right: "nearly 500", witness: "marshall#400", reason: "different referents for this question" },
  ];
  const reads = [{ forWhom: fw, ctx: { fold: { graphEntries: entries, unresolvedAlternatives: nominated }, supports, attacks } }];
  const s = settle(wake(actions(), { cap: 10 }), { reads });
  assert.ok(s.meet, "the meet ran");
  assert.ok(Array.isArray(s.meet.survivors) && Array.isArray(s.meet.splits));
  const key = ["705", "711"].sort().join("\u0000");
  assert.ok(s.meet.survivors.includes(key), "the supported pair 705/711 survives the meet");
  assert.equal(settle(wake(actions(), { cap: 10 })).meet, null, "no reads -> questions handed over unmett");
});

test("promote: the gate promotes ONLY on measured consequence (recurrence AND consequence)", () => {
  const cands = [{ key: "k1", value: "a" }, { key: "k2", value: "b" }];
  const p = promote(cands, { consequenceOf: (c) => (c.value === "a" ? { status: "mattered" } : { status: "recurring_no_consequence" }) });
  assert.deepEqual(p.promoted.map((x) => x.key), ["k1"]);
  assert.equal(p.promoted[0].reason, "recurrence_and_consequence");
  assert.equal(p.held[0].reason, "recurring_no_consequence");
});

test("promote: an unmeasured consequence is HELD as untested — a gap is never a silent promote", () => {
  const p = promote([{ key: "k1", value: "a" }], { consequenceOf: () => null });
  assert.equal(p.promoted.length, 0);
  assert.equal(p.held[0].reason, "consequence_untested");
});

test("promote: without a consequence measurement it refuses (consequence is never assumed)", () => {
  assert.throws(() => promote([{ key: "k1", value: "a" }]), /consequenceOf is a function/);
});
