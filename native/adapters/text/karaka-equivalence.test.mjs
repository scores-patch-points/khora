import { test } from "node:test";
import assert from "node:assert/strict";
import { karakaSignature, karakaEquivalent, karakaOverlap } from "./karaka-equivalence.mjs";

test("karakaSignature: extracts (karaka, lemma) pairs", () => {
  const rows = [
    { form: "cat", lemma: "cat", karaka: "kartṛ" },
    { form: "mat", lemma: "mat", karaka: "adhikaraṇa" },
    { form: "the", lemma: "the", karaka: null },
  ];
  const sig = karakaSignature(rows);
  assert.ok(sig.includes("kartṛ:cat"));
  assert.ok(sig.includes("adhikaraṇa:mat"));
});

test("karakaEquivalent: same signature = equivalent", () => {
  const rowsA = [{ form: "cat", lemma: "cat", karaka: "kartṛ" }, { form: "mat", lemma: "mat", karaka: "adhikaraṇa" }];
  const rowsB = [{ form: "cat", lemma: "cat", karaka: "kartṛ" }, { form: "mat", lemma: "mat", karaka: "adhikaraṇa" }];
  assert.equal(karakaEquivalent(rowsA, rowsB).equivalent, true);
});

test("karakaEquivalent: different signature = not equivalent", () => {
  const rowsA = [{ form: "cat", lemma: "cat", karaka: "kartṛ" }];
  const rowsB = [{ form: "cat", lemma: "cat", karaka: "karman" }];
  assert.equal(karakaEquivalent(rowsA, rowsB).equivalent, false);
});

test("karakaOverlap: jaccard similarity", () => {
  const rowsA = [{ form: "cat", lemma: "cat", karaka: "kartṛ" }, { form: "mat", lemma: "mat", karaka: "adhikaraṇa" }];
  const rowsB = [{ form: "cat", lemma: "cat", karaka: "kartṛ" }, { form: "dog", lemma: "dog", karaka: "karman" }];
  const overlap = karakaOverlap(rowsA, rowsB);
  assert.ok(overlap.jaccard > 0 && overlap.jaccard < 1);
  assert.equal(overlap.intersection, 1);
});
