// The reader's state and the record are one log (reader-log.js): a pass appends, never rewrites; the reader at a cursor is the projection; a being's identity is its trajectory.
import test from "node:test";
import assert from "node:assert/strict";
import { readerOf, admitPass, trajectoryOf, logOf } from "./reader-log.js";
import { stateAt, meet } from "../kernel/reader-identity.js";
const E = (id, name) => ({ entity: id, name }), atom = (pred, args) => ({ pred, args, text: `${pred}(${args.map((a) => a.name ?? a.value).join(", ")})` });
const before = [atom("orbit", [E("m", "Mercury"), E("s", "Sun")]), atom("has_radius", [E("m", "Mercury"), { value: "2,440 km", measure: "length", base: 2440000 }])];
const after = [...before, atom("has_day", [E("m", "Mercury"), { value: "59 days", measure: "time", base: 5097600 }])];
test("a pass appends admissions tagged with the pass; nothing earlier is rewritten; the reader at cursor 0 is the first reading", () => {
  const r0 = readerOf(before), r1 = admitPass(r0, { before, after, pass: 1, tier: "k-best" });
  assert.equal(r1.admissions.length, r0.admissions.length + 1); assert.deepEqual(r1.admissions.slice(0, r0.admissions.length), r0.admissions);
  assert.equal(r1.admissions.at(-1).pass, 1); assert.equal(r1.admissions.at(-1).rel, "has_day@0");
  const s0 = stateAt(r1, r0.admissions.length - 1); assert.equal(s0.admissions.length, r0.admissions.length);
});
test("a removal is a retraction event: the log grows, the projection drops it, and a cursor before the retraction still holds it", () => {
  const r0 = readerOf(after), r1 = admitPass(r0, { before: after, after: before, pass: 1, tier: "page" });
  assert.equal(r1.admissions.at(-1).kind, "retract"); assert.ok(r1.admissions.length > r0.admissions.length);
  assert.ok(!stateAt(r1).admissions.some((a) => a.rel === "has_day@0")); assert.ok(stateAt(r1, r0.admissions.length - 1).admissions.some((a) => a.rel === "has_day@0"));
});
test("a being's trajectory is its own events in order, and meeting it at a later cursor can move the verdict", () => {
  const r0 = readerOf(before), r1 = admitPass(r0, { before, after, pass: 1, tier: "k-best" });
  const t = trajectoryOf(r1, "m"); assert.deepEqual(t.map((x) => x.pass), [0, 0, 0, 1]); assert.deepEqual(t.map((x) => x.kind), ["admit", "admit", "admit", "admit"]);
  const B = [{ rel: "name", value: "mercury" }, { rel: "has_day@0", value: "time:5097600" }];
  const m0 = meet(stateAt(r1, r0.admissions.length - 1), B, { oneValued: (r) => /^has_/.test(r) }), m1 = meet(stateAt(r1), B, { oneValued: (r) => /^has_/.test(r) });
  assert.equal(m0.verdict, "same"); assert.equal(m1.verdict, "same"); assert.ok(m1.noise <= m0.noise, "after the pass the reader is less surprised by what it now holds");
  assert.ok(logOf(r1).every((row) => row.schema === "RereadAdmission@1" && "at" in row));
});
