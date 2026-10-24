import test from "node:test";
import assert from "node:assert/strict";
import { makeSameBeing } from "./corpus-identity.js";

// A planted-truth record, the way the registered identity evals plant one: eight people, each with its own company and verbs; one person is
// split in two halves (the SAME being met in two sources); another person is a decoy that shares a surname with it but has its own world.
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const occurrencesOf = (person, n, r) => Array.from({ length: n }, () => [...new Set(Array.from({ length: 4 }, () => `v:${person}${Math.floor(r() * 6)}`).concat([`w:${person}co${Math.floor(r() * 5)}`, "v:said"]))].map((f) => ({ f, hop: 1 })));

test("holographic identity joins one being met in two sources, and does not join a different being with the same surname", () => {
  const r = rng(11), record = new Map();
  for (let p = 0; p < 8; p++) record.set(`p${p}`, occurrencesOf(`p${p}`, 60, r));
  const whole = record.get("p0"); record.delete("p0");
  record.set("p0@src_a", whole.filter((_, i) => i % 2 === 0)); record.set("p0@src_b", whole.filter((_, i) => i % 2 === 1));
  const judge = makeSameBeing().prepare(record);
  const same = judge("p0@src_a", "p0@src_b"), other = judge("p0@src_a", "p3");
  assert.equal(same.same, true, JSON.stringify({ v: same.verdict, r: same.reason }));
  assert.equal(other.same, false);
  assert.ok(same.forWhom && same.forWhom.question, "a verdict is always someone's");
});

test("too little reading is a typed gap and never a verdict of difference", () => {
  const r = rng(5), record = new Map([["a", occurrencesOf("x", 2, r)], ["b", occurrencesOf("x", 2, r)], ["c", occurrencesOf("y", 40, r)], ["d", occurrencesOf("z", 40, r)]]);
  const v = makeSameBeing().prepare(record)("a", "b");
  assert.equal(v.same, false); assert.notEqual(v.verdict, "contradicted");
  assert.match(v.basis, /not joined/);
});
