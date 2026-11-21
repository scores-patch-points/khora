import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDistribution, detectVariety, VARIETY_FINGERPRINTS } from "./variety-detector.mjs";

test("VARIETY_FINGERPRINTS has 2 DERIVED English varieties (web + legal)", () => {
  const engKeys = Object.keys(VARIETY_FINGERPRINTS).filter((k) => k.startsWith("eng:"));
  assert.equal(engKeys.length, 2);
  assert.deepEqual(engKeys.sort(), ["eng:legal", "eng:web"]);
});

test("computeDistribution: normalizes to sum to 1", () => {
  const dist = computeDistribution(["kartṛ", "karman", "adhikaraṇa", "kartṛ"]);
  const sum = Object.values(dist).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 0.001, `sum = ${sum}`);
});

test("detectVariety: legal distribution detects legal", () => {
  const dist = VARIETY_FINGERPRINTS["eng:legal"];
  const result = detectVariety(dist, "eng");
  assert.equal(result.variety, "legal");
  assert.ok(result.confidence > 0.99);
});

test("detectVariety: web distribution detects web", () => {
  const dist = VARIETY_FINGERPRINTS["eng:web"];
  const result = detectVariety(dist, "eng");
  assert.equal(result.variety, "web");
});

test("detectVariety: web distribution detects web (derived prior)", () => {
  const dist = VARIETY_FINGERPRINTS["eng:web"];
  const result = detectVariety(dist, "eng");
  assert.equal(result.variety, "web");
});
