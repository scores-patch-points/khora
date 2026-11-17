// identity-exclusion-range.test.mjs — step 4: a stated range between two relations, judged on the merged pair (RULES-PREREG.md).
import test from "node:test";
import assert from "node:assert/strict";
import { makeIdentityExclusion } from "./identity-exclusion.js";
import { CONTRADICTED, UNBOUND } from "../interpretation/hl.js";

const A = { a: [], b: [] };
const make = (assert_, { given = true, difference = (u, v) => (typeof u === "number" && typeof v === "number" ? u - v : null), witnessed = null } = {}) => makeIdentityExclusion({
  kindsOf: () => new Set(["person"]),
  assertionsOf: (x) => assert_[x],
  functional: new Map(),
  sameValue: (u, v) => u === v,
  differences: new Map([["person", [given ? { rel: "died", base: "born", min: -1, max: 150, giver: "test#lifespan" } : { rel: "died", base: "born", min: -1, max: 150, standing: "candidate", evidence: { exposed: 9 } }]]]),
  difference, witnessed,
});
const rec = (rel, value, id, w = true) => ({ rel, value, id, w });

test("born after the other record's death: a given range convicts, by range, with the two assertions as proof", () => {
  const r = make({ a: [rec("born", 1850, "a1")], b: [rec("died", 1820, "b1")] }).judge("a", "b");
  assert.equal(r.verdict, CONTRADICTED);
  assert.equal(r.by, "range");
  assert.deepEqual([r.proof[0].a.id, r.proof[0].b.id].sort(), ["a1", "b1"]);
});

test("in range, or no cross pair, or incomparable: never a conflict", () => {
  assert.equal(make({ a: [rec("born", 1800, "a1")], b: [rec("died", 1850, "b1")] }).judge("a", "b").verdict, UNBOUND);
  assert.equal(make({ a: [rec("born", 1800, "a1"), rec("died", 1700, "a2")], b: [] }).judge("a", "b").verdict, UNBOUND); // a record against itself
  assert.equal(make({ a: [rec("born", "1800 (Julian)", "a1")], b: [rec("died", 1820, "b1")] }).judge("a", "b").verdict, UNBOUND);
});

test("too long a life is out of range too", () => {
  assert.equal(make({ a: [rec("born", 1700, "a1")], b: [rec("died", 1900, "b1")] }).judge("a", "b").verdict, CONTRADICTED);
});

test("one cross pair in range holds the rule: only when every decidable pair is out does it conflict", () => {
  const r = make({ a: [rec("born", 1850, "a1"), rec("born", 1790, "a2")], b: [rec("died", 1820, "b1")] }).judge("a", "b");
  assert.equal(r.verdict, UNBOUND);
});

test("an induced range only raises; an unwitnessed side only raises", () => {
  const r1 = make({ a: [rec("born", 1850, "a1")], b: [rec("died", 1820, "b1")] }, { given: false }).judge("a", "b");
  assert.equal(r1.verdict, UNBOUND); assert.equal(r1.raised[0].raisedAs, "candidate_conflict");
  const r2 = make({ a: [rec("born", 1850, "a1", false)], b: [rec("died", 1820, "b1")] }, { witnessed: (x) => x.w }).judge("a", "b");
  assert.equal(r2.verdict, UNBOUND); assert.equal(r2.raised[0].raisedAs, "unwitnessed_conflict");
});

test("a range with no giver and no evidence is refused at construction; differences need a difference function", () => {
  assert.throws(() => makeIdentityExclusion({ kindsOf: () => new Set(), assertionsOf: () => [], functional: new Map(), sameValue: () => null, differences: new Map([["k", [{ rel: "x", base: "y", min: 0, max: 1 }]]]), difference: () => 0 }), TypeError);
  assert.throws(() => makeIdentityExclusion({ kindsOf: () => new Set(), assertionsOf: () => [], functional: new Map(), sameValue: () => null, differences: new Map([["k", [{ rel: "x", base: "y", min: 0, max: 1, giver: "g" }]]]) }), TypeError);
});
