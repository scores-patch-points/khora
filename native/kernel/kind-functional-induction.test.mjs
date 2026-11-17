// kind-functional-induction.test.mjs — an untested member is not an agreeing one (INDUCER-FIX-PREREG.md, sha256 b5ed9f33…).
// khora's exclusion-falsify.mjs declares every assertion witnessed, so it cannot reach the unwitnessed-disagreement path;
// these cases do. Found on real Wikidata records, where unreferenced statements made many-valued relations "fixed".
import test from "node:test";
import assert from "node:assert/strict";
import { induceKindsAndFunctions } from "./kind-functional-induction.js";

const sameValue = (a, b) => (a === b ? true : false);
const witnessed = (a) => a.ref === true;
function standings(rows) {
  const A = new Map(); let n = 0;
  for (const [m, rel, value, ref, interval] of rows) { if (!A.has(m)) A.set(m, []); A.get(m).push({ rel, value, ref, id: `a${n++}`, ...(interval ? { interval } : {}) }); }
  const members = [...A.keys()];
  const r = induceKindsAndFunctions(members, { assertionsOf: (m) => A.get(m) ?? [], sameValue, witnessed, exposureFloor: 3, declaredKinds: [{ kindKey: "k", memberRefs: members }] });
  return { table: r.relations.get("k"), register: r.register.get("k") };
}
const four = (f) => ["m1", "m2", "m3", "m4"].flatMap(f);

test("different values with an unreferenced side are untested, never agreed, and never make a relation fixed", () => {
  const { table, register } = standings(four((m) => [[m, "source", `${m}-a`, true], [m, "source", `${m}-b`, false]]));
  assert.equal(table.source.agreed, 0);
  assert.equal(table.source.untested, 4);
  assert.notEqual(table.source.standing, "fixed");
  assert.equal(register.has("source"), false);
});

test("equal values still agree, witnessed or not, and a relation agreed by enough members is still fixed", () => {
  const { table, register } = standings(four((m) => [[m, "born", `${m}-1800`, true], [m, "born", `${m}-1800`, false]]));
  assert.equal(table.born.agreed, 4);
  assert.equal(table.born.standing, "fixed");
  assert.equal(register.get("born").temporal, "fixed");
});

test("different values both witnessed still refute: simultaneous -> many-valued, untimed -> time-unknown", () => {
  const both = { lo: 0, hi: 10 };
  assert.equal(standings(four((m) => [[m, "held", `${m}-a`, true, both], [m, "held", `${m}-b`, true, both]])).table.held.standing, "many-valued");
  assert.equal(standings(four((m) => [[m, "tag", `${m}-a`, true], [m, "tag", `${m}-b`, true]])).table.tag.standing, "time-unknown");
});

test("a member with a witnessed disagreement AND an unwitnessed one still counts the witnessed refutation", () => {
  const { table } = standings(four((m) => [[m, "x", `${m}-a`, true], [m, "x", `${m}-b`, true], [m, "x", `${m}-c`, false]]));
  assert.equal(table.x.untimed, 4);
  assert.equal(table.x.untested, 0);
});
