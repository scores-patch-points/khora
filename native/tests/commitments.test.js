// commitments — the kernel's declared, defeasible readings (kernel/commitments.js).
// Pins: (D1) a second giver's commitment is its OWN commitment.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as K from "../kernel/commitments.js";
const { makeCommitments } = K;
const idOf = (...a) => K.idOf(...a);
const legacyIdOf = (...a) => K.legacyIdOf(...a);
import { createTaskLog, append } from "../kernel/task-log.js";

const MEMBERS = ["a|x|b", "c|x|d"];

test("D1 — a second giver over the same members gets its OWN commitment (two standings)", () => {
  const C = makeCommitments();
  let log = createTaskLog();
  const r1 = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "alice", purpose: "story-A" }); log = r1.log;
  log = C.evaluate(log, r1.id, { verdict: "holds", ground: "g-alice", broken: "redeal" }).log;
  const r2 = C.declare(log, { kind: "same-as", members: [...MEMBERS].reverse(), giver: "bob", purpose: "story-B" }); log = r2.log;
  assert.notEqual(r1.id, r2.id);
  const st = C.standings(log);
  assert.equal(st.length, 2);
  const by = Object.fromEntries(st.map((s) => [s.giver, s]));
  assert.equal(by.alice.standing, "testimony");
  assert.equal(by.alice.purpose, "story-A");
  assert.equal(by.bob.standing, "wish", "bob's wish does not inherit alice's test");
  assert.equal(by.bob.evaluated, null);
});

test("D1 — a concede by one giver leaves the other giver's commitment standing", () => {
  const C = makeCommitments();
  let log = createTaskLog();
  const a = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "alice", purpose: "p" }); log = a.log;
  const b = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "bob", purpose: "p" }); log = b.log;
  log = C.evaluate(log, a.id, { verdict: "holds", ground: "g", broken: "b" }).log;
  log = C.evaluate(log, b.id, { verdict: "holds", ground: "g", broken: "b" }).log;
  log = C.concede(log, b.id, { trigger: "bob withdraws" }).log;
  const by = Object.fromEntries(C.standings(log).map((s) => [s.giver, s.standing]));
  assert.deepEqual(by, { alice: "testimony", bob: "conceded" });
  // and a third giver can still stand on the same members after bob's concession
  const c = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "carol", purpose: "later" }); log = c.log;
  const carol = C.standings(log).find((s) => s.giver === "carol");
  assert.equal(carol.standing, "wish");
  assert.equal(C.inForce(log, { include: ["testimony", "wish"] }).length, 2);
});

test("D1 — the same giver redeclaring the same members is idempotent on id (positive control)", () => {
  const C = makeCommitments();
  let log = createTaskLog();
  const r1 = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "alice", purpose: "p" }); log = r1.log;
  const r2 = C.declare(log, { kind: "same-as", members: [...MEMBERS].reverse(), giver: " alice ", purpose: "p" }); log = r2.log;
  assert.equal(r1.id, r2.id);
  assert.equal(C.standings(log).length, 1);
});

test("D1 — idOf carries the giver; legacyIdOf is the old members-only id, exported", () => {
  const legacy = legacyIdOf({ kind: "same-as", members: MEMBERS });
  assert.equal(legacy, `commit:same-as:${[...MEMBERS].sort().map((m) => `${m.length}:${m}`).join("")}`);
  assert.notEqual(idOf({ kind: "same-as", members: MEMBERS, giver: "alice" }), idOf({ kind: "same-as", members: MEMBERS, giver: "bob" }));
  assert.notEqual(idOf({ kind: "same-as", members: MEMBERS, giver: "alice" }), legacy);
  assert.equal(idOf({ kind: "same-as", members: MEMBERS, giver: "alice" }), idOf({ kind: "same-as", members: [...MEMBERS].reverse(), giver: "alice" }));
});

test("D1 — a log written with giver-less ids folds unchanged, and the legacy id still resolves", () => {
  const C = makeCommitments();
  const T = makeCommitments(); // a second instance: reading is a pure function of the log
  let log = createTaskLog();
  const id = legacyIdOf({ kind: "same-as", members: MEMBERS });
  // exactly the entry shape the pre-fix declare appended
  log = append(log, { kind: "propose", task_id: id, operator: "DEF", operator_basis: "declared", grain: "Figure", description: "declared: same-as over 2 member(s)", commitment: "same-as", members: [...MEMBERS].sort(), giver: "alice", purpose: "old" });
  const st = C.standings(log);
  assert.equal(st.length, 1);
  assert.equal(st[0].id, id);
  assert.equal(st[0].standing, "wish");
  // evaluate / concede by the legacy id reach the legacy task
  log = C.evaluate(log, id, { verdict: "holds", ground: "g", broken: "b" }).log;
  assert.equal(T.standings(log)[0].standing, "testimony");
  // a new giver on the same members is a separate commitment beside the legacy one
  const b = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "bob", purpose: "new" });
  assert.equal(C.standings(b.log).length, 2);
  assert.equal(C.standings(b.log).find((s) => s.giver === "alice").standing, "testimony");
  // the bare legacy id is still unambiguous when only one commitment carries it ...
  const c = C.concede(log, id, { trigger: "old giver withdraws" });
  assert.equal(c.refused, null);
  assert.equal(C.standings(c.log)[0].standing, "conceded");
});

test("D1 — when several givers share a legacy id, the bare legacy id is refused as ambiguous; with giver it resolves", () => {
  const C = makeCommitments();
  let log = createTaskLog();
  const a = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "alice", purpose: "p" }); log = a.log;
  const b = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "bob", purpose: "p" }); log = b.log;
  const legacy = legacyIdOf({ kind: "same-as", members: MEMBERS });
  const amb = C.evaluate(log, legacy, { verdict: "holds", ground: "g", broken: "b" });
  assert.equal(amb.refused.type, "ambiguous_commitment");
  assert.deepEqual([...amb.refused.candidates].sort(), [a.id, b.id].sort());
  assert.equal(amb.log, log, "the log is untouched on a refusal");
  const ok = C.evaluate(log, legacy, { verdict: "holds", ground: "g", broken: "b", giver: "bob" });
  assert.equal(ok.refused, null);
  const by = Object.fromEntries(C.standings(ok.log).map((s) => [s.giver, s.standing]));
  assert.deepEqual(by, { alice: "wish", bob: "testimony" });
});

test("D1 — concede names a giver: another giver's commitment is refused (negative control)", () => {
  const C = makeCommitments();
  let log = createTaskLog();
  const a = C.declare(log, { kind: "same-as", members: MEMBERS, giver: "alice", purpose: "p" }); log = a.log;
  const r = C.concede(log, a.id, { trigger: "mine now", giver: "bob" });
  assert.equal(r.refused.type, "not_the_giver");
  assert.equal(r.log, log);
});

