import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConllu } from "../../kernel/eot-rich.js";
import fs from "node:fs";
import { KarakaSniffer, buildExamples, KARAKA_LABELS, sniffKaraka } from "./karaka-sniffer.mjs";

test("KARAKA_LABELS has 9 entries", () => {
  assert.equal(KARAKA_LABELS.length, 9);
});

test("sniffKaraka: Case feat fast path", () => {
  assert.equal(sniffKaraka("rāmaḥ", "NOUN", "Case=Nom|Number=Sing", 0, 1), "kartṛ");
  assert.equal(sniffKaraka("phalam", "NOUN", "Case=Acc|Number=Sing", 0, 1), "karman");
  assert.equal(sniffKaraka("daṇḍena", "NOUN", "Case=Ins|Number=Sing", 0, 1), "karaṇa");
});

test("sniffKaraka: particle fast path", () => {
  assert.equal(sniffKaraka("以", "ADP", "_", 0, 1), "karaṇa");
  assert.equal(sniffKaraka("在", "ADP", "_", 0, 1), "adhikaraṇa");
  assert.equal(sniffKaraka("從", "ADP", "_", 0, 1), "apādāna");
});

test("KarakaSniffer: trains and predicts on Sanskrit", () => {
  const sents = parseConllu(fs.readFileSync("/tmp/ud/UD_Sanskrit-Vedic/sa_vedic-ud-train.conllu", "utf8"));
  const examples = buildExamples(sents.slice(0, 500));
  const sniffer = new KarakaSniffer();
  sniffer.train(examples, 3);
  const testSents = parseConllu(fs.readFileSync("/tmp/ud/UD_Sanskrit-Vedic/sa_vedic-ud-test.conllu", "utf8"));
  const testExamples = buildExamples(testSents.slice(0, 100));
  let correct = 0;
  for (const ex of testExamples) {
    const pred = sniffer.predict(ex.feats);
    if (pred === ex.gold) correct++;
  }
  assert.ok(correct / testExamples.length > 0.3, `accuracy ${correct}/${testExamples.length} too low`);
});
