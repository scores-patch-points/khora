import test from "node:test";
import assert from "node:assert/strict";
import { mentionsOf, referentsOfSpan, heldByReferent, headReferentsOfSpan } from "./referent-held.js";

const ents = [{ id: "r1", surfaces: ["EOT"] }, { id: "r2", surfaces: ["Bateson"] }, { id: "r3", surfaces: ["Figure"] }];

test("a referent is mentioned as a whole word, case-sensitively", () => {
  assert.deepEqual([...mentionsOf("EOT is the pivot; Bateson wrote.", ents)].sort(), ["r1", "r2"]);
  assert.deepEqual([...mentionsOf("the eot and bateson, lower-cased", ents)], []);
  assert.deepEqual([...mentionsOf("Figures and EOTs", ents)], [], "a longer word is not the surface");
  assert.deepEqual([...mentionsOf("(EOT)", ents)], ["r1"], "punctuation delimits");
});

test("a span is referent-held through its subject or object surface", () => {
  assert.deepEqual([...referentsOfSpan({ claim: { subj: "The EOT", pred: "is", obj: "a pivot" } }, ents)], ["r1"]);
  assert.deepEqual([...referentsOfSpan({ claim: { subj: "the fold", pred: "reads", obj: "Bateson's rule" } }, ents)], ["r2"], "a possessive names the referent");
  assert.deepEqual([...referentsOfSpan({ claim: { subj: "the fold", pred: "reads", obj: "Batesonian rule" } }, ents)], [], "a longer word does not");
});

test("heldByReferent reports the share of the region the reader's mentions reach", () => {
  const region = [
    { id: "a", claim: { subj: "EOT", pred: "is", obj: "a pivot" } },
    { id: "b", claim: { subj: "the fold", pred: "reads", obj: "claims" } },
    { id: "c", claim: { subj: "Figure", pred: "is", obj: "a grain" } },
  ];
  const r = heldByReferent(region, new Set(["r1"]), ents);
  assert.deepEqual(r.held.map((x) => x.id), ["a"]);
  assert.equal(r.share, 1 / 3);
  assert.equal(heldByReferent(region, new Set(), ents).share, 0);
  assert.equal(heldByReferent([], new Set(["r1"]), ents).share, null);
});

test("aboutness by head: the referent must END the subject or object surface", () => {
  const h = (subj, obj) => [...headReferentsOfSpan({ claim: { subj, pred: "is", obj } }, ents)];
  assert.deepEqual(h("The EOT", "a pivot"), ["r1"]);
  assert.deepEqual(h("the fold", "EOT"), ["r1"]);
  assert.deepEqual(h("the fold", "the EOT contract"), [], "head is 'contract'");
  assert.deepEqual(h("Bateson's rule", "x"), [], "head is 'rule'");
  assert.deepEqual(h("the fold", "Bateson's"), ["r2"], "a trailing possessive names the referent");
  assert.deepEqual(h("Figures", "x"), [], "a longer word is not the surface");
  // a head hit is always a mention hit: the class is a refinement
  for (const [a, b] of [["The EOT", "x"], ["the fold", "Bateson"], ["a path containing EOT", "y"]]) {
    const sp = { claim: { subj: a, pred: "is", obj: b } };
    for (const id of headReferentsOfSpan(sp, ents)) assert.ok(referentsOfSpan(sp, ents).has(id));
  }
});
