import { test } from "node:test";
import assert from "node:assert/strict";
import { sentencePhasepost, sentenceKarakas, paragraphPhasepost, paragraphKarakas, documentPhasepost } from "./unit-karaka.mjs";

test("sentencePhasepost: returns root's phasepost", () => {
  const rows = [
    { id: 1, form: "cat", karaka: "kartṛ", phasepost: "INS|FIGURE", head: 2 },
    { id: 2, form: "sat", karaka: null, phasepost: "ALT|FIGURE", head: 0 },
    { id: 3, form: "mat", karaka: "adhikaraṇa", phasepost: "SYN|FIGURE", head: 2 },
  ];
  assert.equal(sentencePhasepost(rows), "ALT|FIGURE");
});

test("sentenceKarakas: groups by role", () => {
  const rows = [
    { form: "cat", karaka: "kartṛ" },
    { form: "mat", karaka: "adhikaraṇa" },
  ];
  const k = sentenceKarakas(rows);
  assert.deepEqual(k.kartṛ, ["cat"]);
  assert.deepEqual(k.adhikaraṇa, ["mat"]);
});

test("paragraphPhasepost: most frequent", () => {
  const sents = [{ phasepost: "INS|FIGURE" }, { phasepost: "INS|FIGURE" }, { phasepost: "ALT|FIGURE" }];
  assert.equal(paragraphPhasepost(sents), "INS|FIGURE");
});

test("documentPhasepost: most frequent across paragraphs", () => {
  const paras = [{ phasepost: "INS|FIGURE" }, { phasepost: "ALT|FIGURE" }, { phasepost: "INS|FIGURE" }];
  assert.equal(documentPhasepost(paras), "INS|FIGURE");
});
