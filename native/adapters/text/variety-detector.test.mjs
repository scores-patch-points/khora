import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDistribution, detectVariety, VARIETY_FINGERPRINTS } from "./variety-detector.mjs";

test("VARIETY_FINGERPRINTS has 5 English varieties", () => {
  const engKeys = Object.keys(VARIETY_FINGERPRINTS).filter((k) => k.startsWith("eng:"));
  assert.equal(engKeys.length, 5);
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

test("detectVariety: conversational distribution detects conversational", () => {
  const dist = VARIETY_FINGERPRINTS["eng:conversational"];
  const result = detectVariety(dist, "eng");
  assert.equal(result.variety, "conversational");
});
