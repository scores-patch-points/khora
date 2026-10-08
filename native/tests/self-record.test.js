import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SELF_RECORD_SCHEMA, LOG_ENTRY_SCHEMA, EVIDENCE_BAR, claimKey,
  emptyLog, appendEntry, readEntry, reviseEntry, projectEntries,
  adjudicated, createRecord, valueAt, distinguish,
} from "../kernel/self-record.js";

test("claimKey is subject|relation|object", () => {
  assert.equal(claimKey({ subject: "Tesla", relation: "rival of", object: "Edison" }), "Tesla|rival of|Edison");
});

test("P1 — the past is immutable: append returns a NEW log, the old is untouched", () => {
  const l0 = emptyLog();
  const l1 = readEntry(l0, { subject: "Tesla", relation: "was born in", object: "Smiljan" });
  const l2 = readEntry(l1, { subject: "Tesla", relation: "rival of", object: "Edison" });
  assert.equal(l0.length, 0);
  assert.equal(l1.length, 1);
  assert.equal(l2.length, 2);
  assert.notEqual(l1, l2);
  assert.equal(Object.isFrozen(l2[1]), true);
  assert.equal(l2[1].schema, LOG_ENTRY_SCHEMA);
});

test("P2/P3 — after a REVISE, the old cursor still returns the ORIGINAL meaning", () => {
  let log = emptyLog();
  log = readEntry(log, { subject: "Tesla", relation: "was born in", object: "Smiljan" });
  log = readEntry(log, { subject: "Tesla", relation: "rival of", object: "Edison" });
  const rivalSeq = 1;
  log = reviseEntry(log, rivalSeq, { subject: "Tesla", relation: "collaborated with", object: "Edison" });
  const past = projectEntries(log, rivalSeq);
  const now = projectEntries(log);
  assert.equal(past.get("Tesla|rival of|Edison").meaning.relation, "rival of");
  assert.equal(now.get("Tesla|collaborated with|Edison").meaning.relation, "collaborated with");
  // the past entry is re-keyed, not erased: it stays under its own key
  assert.ok(now.get("Tesla|rival of|Edison"));
});

test("K1 — projection is deterministic", () => {
  const build = () => {
    let log = emptyLog();
    log = readEntry(log, { subject: "a", relation: "r", object: "b" });
    log = reviseEntry(log, 0, { subject: "a", relation: "r2", object: "b" });
    return [...projectEntries(log).entries()];
  };
  assert.deepEqual(build(), build());
});

test("the evidence gate: a candidate below the bar is recorded but never believed", () => {
  const R = createRecord([{ seq: 0, key: "tesla|rival", value: "rival of Edison" }]);
  R.revisions.push({ seq: 1.5, key: "tesla|rival", to: "friend of Edison", evidence: 1, standing: "candidate" });
  assert.equal(adjudicated(R.revisions[0]), false);
  assert.equal(valueAt(R, Infinity, "tesla|rival"), "rival of Edison");
  R.revisions.push({ seq: 2.5, key: "tesla|rival", to: "collaborated with Edison", evidence: EVIDENCE_BAR, standing: "candidate" });
  assert.equal(adjudicated(R.revisions[1]), true);
  assert.equal(valueAt(R, Infinity, "tesla|rival"), "collaborated with Edison");
  assert.equal(valueAt(R, 2, "tesla|rival"), "rival of Edison"); // before it was adopted
});

test("FALSIFY: a non-candidate counts at any evidence; the gate is only for candidates", () => {
  assert.equal(adjudicated({ standing: "adopted", evidence: 0 }), true);
  assert.equal(adjudicated({ standing: "candidate", evidence: EVIDENCE_BAR - 1 }), false);
  assert.equal(adjudicated({ standing: "candidate", evidence: EVIDENCE_BAR }), true);
});

test("the middle: mechanical on a consistent arrival, nothing appended", () => {
  const R = createRecord([{ seq: 0, key: "tesla|rival", value: "rival of Edison" }]);
  const w = distinguish(R, { asOf: 0, key: "tesla|rival", arrival: "rival of Edison" });
  assert.equal(w.mode, "mechanical");
  assert.equal(w.appended, false);
  assert.equal(R.revisions.length, 0);
});

test("the middle: a conflict hangs at one witness, adopts at the bar, reopens a given", () => {
  const R = createRecord([{ seq: 0, key: "tesla|rival", value: "rival of Edison", standing: "given" }]);
  const w1 = distinguish(R, { asOf: 0, key: "tesla|rival", arrival: "friend of Edison", weight: 1 });
  assert.equal(w1.mode, "participatory");
  assert.equal(w1.standing, "pending");
  assert.equal(w1.reopens, true);
  assert.equal(valueAt(R, 0.6, "tesla|rival"), "rival of Edison");
  const w2 = distinguish(R, { asOf: 1, key: "tesla|rival", arrival: "collaborated with Edison", weight: 1 });
  assert.equal(w2.standing, "adopted");
  assert.equal(valueAt(R, 10, "tesla|rival"), "collaborated with Edison");
  assert.equal(valueAt(R, 0, "tesla|rival"), "rival of Edison"); // past preserved
});

test("K1 at the module: a record learns where a two-term in-place editor cannot", () => {
  // two-term: latest wins, no cursor, no gate
  const dyad = (v) => ({ value: v });
  const A = dyad("rival of Edison");
  A.value = "friend of Edison"; // flips on one weak witness
  assert.notEqual(A.value, "rival of Edison"); // past lost
  // three-term: the record suspends the weak witness and keeps the past
  const R = createRecord([{ seq: 0, key: "tesla|rival", value: "rival of Edison" }]);
  distinguish(R, { asOf: 0, key: "tesla|rival", arrival: "friend of Edison", weight: 1 });
  assert.equal(valueAt(R, Infinity, "tesla|rival"), "rival of Edison");
  assert.equal(valueAt(R, 0, "tesla|rival"), "rival of Edison");
  assert.equal(R.schema, SELF_RECORD_SCHEMA);
});
