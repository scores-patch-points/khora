import test from "node:test";
import assert from "node:assert/strict";
import { readRecords, computeNote, intervalOf } from "./opencode-records.mjs";
// a different domain from the PoC archive on purpose: clinic visits, a dosage schedule, a staff list
const pages = [
  "VISIT NOTE V-101 — North Clinic\nSeverity: urgent. Date: 2026-04-03. Patients seen: 12. Lead: Ana Silva.",
  "VISIT NOTE V-102 — South Clinic\nSeverity: routine. Date: 2026-04-20. Patients seen: 40. Lead: Ben Okafor.",
  "VISIT NOTE V-103 — North Clinic\nSeverity: urgent. Date: 2026-05-11. Patients seen: 40. Lead: Ana Silva.",
  "VISIT NOTE V-104 — North Clinic\nSeverity: urgent. Date: 2026-08-02. Patients seen: 7. Lead: Ben Okafor.",
  "DOSAGE SCHEDULE — North Clinic\nThe maximum daily dose at North Clinic is 40 milligrams.",
  "AMENDMENT 2 (effective 2026-06-01): The maximum daily dose at North Clinic is now 30 milligrams.",
  "STAFF LIST\nThe pager number for Ana Silva is 7712. The pager number for Ben Okafor is 7713.",
  "REVIEW R-9 — North Clinic\nReviewer: Ana Silva. Outcome: pass.",
];
const doc = { name: "clinic.txt", pages, labels: pages.map((_, i) => i + 1) };

test("records: the kind is the head's capitals, slots are labels three records share, types come from the values", () => {
  const { records, slots } = readRecords(doc);
  assert.equal(records[0].kind, "VISIT NOTE"); assert.equal(records[0].id, "V-101"); assert.equal(records[0].subject, "North Clinic");
  const s = slots.get("VISIT NOTE");
  assert.equal(s.date.type, "date"); assert.equal(s["patients seen"].type, "number"); assert.equal(s.severity.type, "enum");
  assert.equal(slots.get("REVIEW")?.reviewer, undefined); // one record is not a slot
});

test("count: exact name, enum value and a date interval filter the records; the near-miss name does not match", () => {
  const n = computeNote({ doc: { ...doc }, ask: "How many urgent visit notes were filed for North Clinic between April and June 2026?" }).note;
  assert.match(n, /count of VISIT NOTE records where North Clinic, severity = urgent, date in april–june 2026: 2 — V-101 \(clinic\.txt#p1\), V-103 \(clinic\.txt#p3\)/);
});

test("max names every tie, with its page", () => {
  const n = computeNote({ doc: { ...doc }, ask: "Which visit note saw the most patients, and how many?" }).note;
  assert.match(n, /largest patients seen among 4 VISIT NOTE records: 40 — V-102 \(clinic\.txt#p2\), V-103 \(clinic\.txt#p3\) \(tie\)/);
});

test("a statement's current value is the latest by effective date, and the chain is shown", () => {
  const n = computeNote({ doc: { ...doc }, ask: "What is the maximum daily dose at North Clinic now?" }).note;
  assert.match(n, /CURRENT 30 milligrams \(effective 2026-06-01, clinic\.txt#p6\); earlier: 40 milligrams \(original, clinic\.txt#p5\)/);
});

test("one hop: a record named by id lends its people, and statements about them are found", () => {
  const n = computeNote({ doc: { ...doc }, ask: "Who reviewed R-9, and what is that person's pager number?" }).note;
  assert.match(n, /reviewer of R-9 \(clinic\.txt#p8\): Ana Silva/);
  assert.match(n, /pager number at Ana Silva: CURRENT 7712|pager number for Ana Silva|Ana Silva: CURRENT 7712/);
});

test("nothing computable is a gap, not a guess; intervals read quarters and single months", () => {
  assert.equal(computeNote({ doc: { ...doc }, ask: "Tell me about the weather." }).gap, "nothing-computed");
  assert.deepEqual(intervalOf("in Q2 2026"), { from: "2026-04-01", to: "2026-06-31", said: "Q2 2026" });
  assert.equal(intervalOf("in March 2026").from, "2026-03-01");
});

test("the answer is checked against the computed facts: a wrong number is contradicted, the right one and a replaced value named as replaced are not", async () => {
  const { checkAgainstFacts } = await import("./opencode-records.mjs");
  const facts = computeNote({ doc: { ...doc }, ask: "What is the maximum daily dose at North Clinic now?" }).facts;
  assert.equal(checkAgainstFacts("The maximum daily dose at North Clinic is 30 milligrams.", facts).length, 0);
  assert.equal(checkAgainstFacts("The maximum daily dose at North Clinic is 30 milligrams. It was 40 before the amendment.", facts).length, 0);
  const bad = checkAgainstFacts("The maximum daily dose at North Clinic is 40 milligrams.", facts);
  assert.equal(bad.length, 1); assert.equal(bad[0].standing, "contradicted"); assert.match(bad[0].evidence.text, /is 30 milligrams/);
  const cf = computeNote({ doc: { ...doc }, ask: "How many urgent visit notes were filed for North Clinic between April and June 2026?" }).facts;
  assert.equal(checkAgainstFacts("There were 3 urgent visit notes for North Clinic.", cf).length, 1);
  assert.equal(checkAgainstFacts("There were 2 urgent visit notes for North Clinic: V-101 and V-103.", cf).length, 0);
});
