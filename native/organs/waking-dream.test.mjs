import test from "node:test";
import assert from "node:assert/strict";
import { wakingDream, projectMemory, pruneWorktree, reopen, recall, actionsFrom, WAKE_SCHEMA } from "./waking-dream.js";

// The Titanic, 1912 — one night, several accounts that do not agree on how many were saved.
// This is the living corpus the organ was built against (holodeck-samples/titanic-1912 and
// holodeck/.scratch-contradiction.mjs), reduced to actions. `witness` is the INDEPENDENT
// source (corroboration.js: two chunks of one file are one witness, never two).
const A = [
  { being: "saved", predicate: "count-of", value: "711", witness: "british#100" },
  { being: "saved", predicate: "count-of", value: "705", witness: "marshall#200" },
  { being: "saved", predicate: "count-of", value: "705", witness: "beesley#300" },
  { being: "lost", predicate: "count-of", value: "1635", witness: "marshall#400" },
  { being: "saved", predicate: "count-of", value: "nearly 500", witness: "senate#500" },
];

test("PURE PROJECTION: the memory is a function of the action prefix alone (no future leak)", () => {
  const k = 3;
  const prefixMemory = wakingDream(A.slice(0, k), { cap: null }).memory;
  assert.deepEqual(prefixMemory, projectMemory(A.slice(0, k)).entries);
});

test("PREQUENTIAL: reading the first k actions == reading the whole log and taking rows with at < k", () => {
  for (let k = 1; k <= A.length; k++) {
    const prefix = wakingDream(A.slice(0, k));
    const filtered = wakingDream(A).hypotheses.filter((h) => h.at < k);
    assert.deepEqual(prefix.hypotheses, filtered, `prefix k=${k}`);
  }
});

test("SUPPORT: recurrence is a second independent witness, a possibility never standing", () => {
  const { hypotheses } = wakingDream(A);
  const sup = hypotheses.filter((h) => h.kind === "support" && h.value === "705");
  assert.ok(sup.length, "saved/705 reached two witnesses");
  const last = sup[sup.length - 1];
  assert.equal(last.count, 2);
  assert.deepEqual(last.refs, ["beesley#300", "marshall#200"]); // distinct sources, sorted
  assert.deepEqual(last.addrs, [1, 2]);                          // the path back: the actions
  assert.equal(last.standing, undefined, "it does not assert standing");
});

test("DISCREPANCY: two readings of one being are DISCLOSED, never collapsed", () => {
  const { memory } = wakingDream(A);
  const d = memory.find((e) => e.kind === "discrepancy");
  assert.ok(d, "saved has more than one reading");
  assert.deepEqual(d.readings.map((r) => r.value), ["705", "711", "nearly 500"]);
  assert.deepEqual(d.readings.find((r) => r.value === "nearly 500").refs, ["senate#500"]);
});

test("NOMINATION: an identity alternative is opened and never decided (II.7)", () => {
  const { hypotheses } = wakingDream(A);
  const nom = hypotheses.filter((h) => h.kind === "nomination");
  assert.equal(nom.length, 3, "three pairs among {705, 711, nearly 500}");
  for (const n of nom) {
    assert.equal(n.alternative.schema, "EOIdentityAlternative@1");
    assert.equal(n.alternative.standing, "live_hypothesis");
    assert.deepEqual(n.alternative.supportRefs, []);
    assert.deepEqual(n.alternative.attackRefs, []);
  }
});

test("NEVER PROMOTES: no row asserts standing; every kind is one of the three", () => {
  const { hypotheses } = wakingDream(A);
  const kinds = new Set(hypotheses.map((h) => h.kind));
  for (const k of kinds) assert.ok(["support", "nomination", "discrepancy"].includes(k), k);
  assert.ok(!JSON.stringify(hypotheses).includes('"standing":"standing"'));
});

test("TWO LOGS + PRUNE: the action log is immortal, the memory is bounded and every drop is disclosed", () => {
  const many = [];
  for (let i = 0; i < 40; i++) { // 20 disputed keys -> memory entries, forced over a small cap
    many.push({ being: "x" + i, predicate: "is", value: "a", witness: "s1#" + i });
    many.push({ being: "x" + i, predicate: "is", value: "b", witness: "s2#" + i });
  }
  const r = wakingDream(many, { cap: 10 });
  assert.equal(r.actionLog.length, many.length, "the action log is never pruned");
  assert.ok(r.memory.length <= 10, "the worktree is bounded");
  assert.ok(r.pruned.length > 0, "the drops are disclosed");
  for (const p of r.pruned) {
    assert.ok(p.addrs.length > 0, "every pruned entry carries a path back");
    assert.equal(p.path[0], "actionLog#" + p.addrs[0]);
  }
});

test("PATH BACK: reopen returns the very actions that produced a pruned entry", () => {
  const many = [];
  for (let i = 0; i < 40; i++) {
    many.push({ being: "x" + i, predicate: "is", value: "a", witness: "s1#" + i });
    many.push({ being: "x" + i, predicate: "is", value: "b", witness: "s2#" + i });
  }
  const r = wakingDream(many, { cap: 10 });
  const back = reopen(r.pruned[0], r.actionLog);
  assert.equal(back.length, r.pruned[0].addrs.length);
  assert.ok(back.every((a) => a && a.being && a.witness), "the actions are recoverable verbatim");
  // The recalled actions all belong to the one being the pruned entry is about.
  assert.equal(new Set(back.map((a) => a.being)).size, 1);
});

test("RECALL: a pruned being is remembered by re-folding the immortal log (never a restore)", () => {
  const many = [];
  for (let i = 0; i < 40; i++) {
    many.push({ being: "x" + i, predicate: "is", value: "a", witness: "s1#" + i });
    many.push({ being: "x" + i, predicate: "is", value: "b", witness: "s2#" + i });
  }
  const { actionLog, memory } = wakingDream(many, { cap: 10 });
  const gone = "x0";
  assert.ok(!memory.some((e) => e.being === gone), "the cap did prune x0 out of the worktree");
  const r = recall(gone, actionLog);
  assert.equal(r.status, "recalled");
  assert.ok(r.entries.length > 0, "its standing comes back");
  assert.ok(r.addrs.length > 0, "with the addresses that back it");
});

test("RECALL of a being the log never named is a typed absence, not an empty one", () => {
  const r = recall("nobody", A);
  assert.equal(r.status, "absent");
  assert.deepEqual(r.entries, []);
  assert.match(r.basis, /typed absence/);
});

test("CLEAN CONTROL: a log with no recurrence and no disagreement emits nothing", () => {
  const clean = [
    { being: "a", predicate: "p", value: "1", witness: "s1" },
    { being: "b", predicate: "p", value: "2", witness: "s2" },
    { being: "c", predicate: "p", value: "3", witness: "s3" },
  ];
  const { hypotheses, memory, pruned } = wakingDream(clean);
  assert.equal(hypotheses.length, 0);
  assert.equal(memory.length, 0);
  assert.equal(pruned.length, 0);
});

test("THE DAY'S READER: the record's live answers map to actions, and a fork becomes a discrepancy", () => {
  const live = [
    { referent: "saved", delta0: "711", id: "british#1" },
    { referent: "saved", delta0: "705", id: "marshall#2" },
    { referent: "saved", delta0: "nearly 500", id: "senate#3" },
  ];
  const { actions, skipped } = actionsFrom(live, {
    being: (a) => a.referent, predicate: () => "answer", value: (a) => a.delta0, witness: (a) => a.id,
  });
  assert.equal(actions.length, 3);
  assert.equal(skipped.length, 0);
  const d = wakingDream(actions).memory.find((e) => e.kind === "discrepancy");
  assert.ok(d, "one referent, three answers: the fork is disclosed, never collapsed");
  assert.deepEqual(d.readings.map((r) => r.value), ["705", "711", "nearly 500"]);
});

test("THE DAY'S READER: an incomplete row is a TYPED skip, never a throw and never a guess", () => {
  const { actions, skipped } = actionsFrom(
    [{ referent: "ok", answer: "1", id: "s1" }, { referent: "no answer", id: "s2" }],
    { being: (r) => r.referent, predicate: () => "answer", value: (r) => r.answer, witness: (r) => r.id },
  );
  assert.equal(actions.length, 1);
  assert.equal(skipped.length, 1);
  assert.match(skipped[0].why, /typed|skipped/);
});

test("THE DAY'S READER: a spec missing a function refuses — the caller owns the shape", () => {
  assert.throws(() => actionsFrom([], { being: (r) => r.x }), /spec\.predicate is a function/);
});

test("the schema is declared", () => {
  assert.equal(wakingDream(A).schema, WAKE_SCHEMA);
});
