import { test } from "node:test";
import assert from "node:assert/strict";
import { sniffPhasepost, PHASEPOST_LABELS } from "./phasepost-sniffer.mjs";

test("PHASEPOST_LABELS has 27 entries", () => {
  assert.equal(PHASEPOST_LABELS.length, 27);
});

test("sniffPhasepost: Figure determiner", () => {
  assert.equal(sniffPhasepost("the", "DET", "_", "figure"), "determiner");
});

test("sniffPhasepost: Figure copula", () => {
  assert.equal(sniffPhasepost("is", "AUX", "_", "figure"), "copula");
});

test("sniffPhasepost: Figure conjunction", () => {
  assert.equal(sniffPhasepost("and", "CCONJ", "_", "figure"), "conjunction");
});

test("sniffPhasepost: Figure modifier", () => {
  assert.equal(sniffPhasepost("big", "ADJ", "_", "figure"), "modifier");
});

test("sniffPhasepost: Ground aspect", () => {
  assert.equal(sniffPhasepost("了", "PART", "_", "ground"), "aspect");
});

test("sniffPhasepost: Ground modal", () => {
  assert.equal(sniffPhasepost("能", "AUX", "_", "ground"), "modal");
});

test("sniffPhasepost: Ground sentence-final", () => {
  assert.equal(sniffPhasepost("吗", "PART", "_", "ground"), "sentence-final");
});

test("sniffPhasepost: Ground connective", () => {
  assert.equal(sniffPhasepost("而", "CCONJ", "_", "ground"), "connective");
});

test("sniffPhasepost: Pattern kāraka from Case", () => {
  assert.equal(sniffPhasepost("rāmaḥ", "NOUN", "Case=Nom", "pattern"), "kartṛ");
});
