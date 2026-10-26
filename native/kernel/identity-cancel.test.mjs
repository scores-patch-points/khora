// Same(a, b | W) as cancellation within a plateau [noise, DMD). Constructed violations first (lesson 70): each refusal below is a case a hand-tuned threshold would have guessed through.
import test from "node:test";
import assert from "node:assert/strict";
import { cancelIdentity } from "./identity-cancel.js";
const C = (id, ...feats) => ({ id, feats });
test("one candidate cancels the mention: same, and the plateau is read off the material", () => {
  const r = cancelIdentity({ mention: ["v:be", "w:great", "w:lake"], candidates: [C("A", "v:be", "w:great", "w:lake", "w:michigan"), C("B", "v:be", "w:river")] });
  assert.equal(r.verdict, "same"); assert.equal(r.id, "A"); assert.equal(r.noise, 0); assert.equal(r.dmd, 2); assert.deepEqual(r.margin, { from: 0, to: 2, width: 2 });
});
test("the true thing may fail to carry something (noise > 0) and still be the same, while the margin stays under the next level", () => {
  const r = cancelIdentity({ mention: ["a", "b", "c", "d"], candidates: [C("X", "a", "b", "c"), C("Y", "a")] });
  assert.equal(r.verdict, "same"); assert.equal(r.id, "X"); assert.equal(r.noise, 1); assert.equal(r.dmd, 3);
});
test("two candidates cancel equally: undecided, both named, never broken by order", () => {
  const r = cancelIdentity({ mention: ["a", "b"], candidates: [C("Z", "a", "b"), C("A", "a", "b", "c")] });
  assert.equal(r.verdict, "undecided"); assert.deepEqual(r.tied.sort(), ["A", "Z"]);
  assert.equal(cancelIdentity({ mention: ["a", "b"], candidates: [C("A", "a", "b", "c"), C("Z", "a", "b")] }).verdict, "undecided");   // the input order changes nothing
});
test("nothing cancels: refused, not 'different' and not a guess", () => {
  const r = cancelIdentity({ mention: ["a", "b"], candidates: [C("X", "p", "q"), C("Y", "r")] });
  assert.equal(r.verdict, "refused"); assert.match(r.why, /nothing cancels/);
});
test("no mention features, no candidates, a duplicate id: each refused with its reason", () => {
  assert.equal(cancelIdentity({ mention: [], candidates: [C("X", "a")] }).verdict, "refused");
  assert.equal(cancelIdentity({ mention: ["a"], candidates: [] }).verdict, "refused");
  assert.match(cancelIdentity({ mention: ["a"], candidates: [C("X", "a"), C("X", "a")] }).why, /unique/);
});
test("the perspective is not noise: another value of a one-valued dimension EXCLUDES, it is not a residual", () => {
  const M = ["v:pay", "dir=out", "w:4.0m"], P = { perspective: ["dir"] };
  const r = cancelIdentity({ mention: M, ...P, candidates: [C("we-paid", "v:pay", "dir=out", "w:4.0m"), C("we-received", "v:pay", "dir=in", "w:4.0m")] });
  assert.equal(r.verdict, "same"); assert.equal(r.id, "we-paid"); assert.deepEqual(r.excluded.map((x) => x.id), ["we-received"]);
  const only = cancelIdentity({ mention: M, ...P, candidates: [C("we-received", "v:pay", "dir=in", "w:4.0m")] });
  assert.equal(only.verdict, "refused"); assert.match(only.why, /one-valued/);
  // without the dimension declared, the opposite direction is only a missing feature (noise): the declaration IS the perspective
  assert.equal(cancelIdentity({ mention: M, candidates: [C("we-received", "v:pay", "dir=in", "w:4.0m")] }).verdict, "same");
});
test("a candidate that states no value of the dimension is thinner, not opposed: it stays, with a residual", () => {
  const r = cancelIdentity({ mention: ["v:pay", "dir=out", "w:4.0m"], perspective: ["dir"], candidates: [C("silent", "v:pay", "w:4.0m"), C("other", "q")] });
  assert.equal(r.verdict, "same"); assert.equal(r.id, "silent"); assert.equal(r.noise, 1); assert.deepEqual(r.excluded, []);
});
test("a sole candidate is the only one that cancels anything, and says no second level bounds the margin", () => {
  const r = cancelIdentity({ mention: ["a", "b"], candidates: [C("X", "a", "b")] }); assert.equal(r.dmd, null); assert.match(r.why, /only candidate/);
});
test("deterministic: the same inputs give identical bytes", () => {
  const i = { mention: ["a", "b", "c"], candidates: [C("X", "a", "b"), C("Y", "a", "c", "d"), C("Z", "q")] };
  assert.equal(JSON.stringify(cancelIdentity(i)), JSON.stringify(cancelIdentity(structuredClone(i))));
});
