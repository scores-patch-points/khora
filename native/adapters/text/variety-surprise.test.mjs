import { test } from "node:test";
import assert from "node:assert/strict";
import { crossEntropy, surpriseVariety, surpriseRanking } from "./variety-surprise.mjs";
import { VARIETY_FINGERPRINTS } from "./variety-detector.mjs";

test("crossEntropy: a distribution is least surprising under its own prior", () => {
  const legal = VARIETY_FINGERPRINTS["eng:legal"];
  const web = VARIETY_FINGERPRINTS["eng:web"];
  assert.ok(crossEntropy(legal, legal) < crossEntropy(legal, web), "legal text is more surprising under web than under legal");
});

test("surpriseVariety: legal distribution selects legal", () => {
  const r = surpriseVariety(VARIETY_FINGERPRINTS["eng:legal"], "eng");
  assert.equal(r.variety, "legal");
});

test("surpriseVariety: web distribution selects web", () => {
  const r = surpriseVariety(VARIETY_FINGERPRINTS["eng:web"], "eng");
  assert.equal(r.variety, "web");
});

test("surpriseRanking: legal puts legal first, conversational last", () => {
  const r = surpriseRanking(VARIETY_FINGERPRINTS["eng:legal"], "eng");
  assert.equal(r[0].variety, "legal");
});
