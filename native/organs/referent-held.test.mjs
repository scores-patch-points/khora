import test from "node:test";
import assert from "node:assert/strict";
import { mentionsOf, referentsOfSpan, heldByReferent } from "./referent-held.js";

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
