// ask.test.mjs — the full question -> answer chain, composed end-to-end at the row level: the text's
// kāraka triples, the question's gap + filled roles, and the fill. Pure (hand-built rows); the
// lemma-based referent identity is the disclosed simplification of this layer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, triplesOfRows, questionDag } from "./ask.mjs";

// id is 1-based; head 0 = root. karaka is what the read attaches (karaka-map.mjs).
const ROW = (id, form, lemma, upos, head, deprel, karaka) => ({ id, form, lemma, upos, feats: "_", head, deprel, karaka });

const TEXT = [
  ROW(1, "Jonathan", "Jonathan", "PROPN", 2, "nsubj", "kartṛ"),
  ROW(2, "gave", "give", "VERB", 0, "root", null),
  ROW(3, "the", "the", "DET", 4, "det", null),
  ROW(4, "book", "book", "NOUN", 2, "obj", "karman"),
  ROW(5, "to", "to", "ADP", 6, "case", null),
  ROW(6, "Mina", "Mina", "PROPN", 2, "obl", "sampradāna"),
  ROW(7, "Mina", "Mina", "PROPN", 8, "nsubj", "kartṛ"),
  ROW(8, "lives", "live", "VERB", 0, "root", null),
  ROW(9, "in", "in", "ADP", 11, "case", null),
  ROW(10, "the", "the", "DET", 11, "det", null),
  ROW(11, "village", "village", "NOUN", 8, "obl", "adhikaraṇa"),
];

test("triplesOfRows builds one triple per relation, grouped by the head chain", () => {
  const triples = triplesOfRows(TEXT);
  assert.equal(triples.length, 2, "two roots -> two triples");
  const give = triples.find((t) => t.predicate === "give");
  assert.deepEqual(give.kartṛ, ["jonathan"]);
  assert.deepEqual(give.karman, ["book"]);
  assert.deepEqual(give.sampradāna, ["mina"]);
  assert.equal(triples.find((t) => t.predicate === "live").adhikaraṇa[0], "village");
});

test("who gave the book to Mina -> jonathan", () => {
  const q = [
    ROW(1, "Who", "who", "PRON", 2, "nsubj", "kartṛ"),
    ROW(2, "gave", "give", "VERB", 0, "root", null),
    ROW(3, "the", "the", "DET", 4, "det", null),
    ROW(4, "book", "book", "NOUN", 2, "obj", "karman"),
    ROW(5, "to", "to", "ADP", 6, "case", null),
    ROW(6, "Mina", "Mina", "PROPN", 2, "obl", "sampradāna"),
  ];
  const r = answerQuestion({ textRows: TEXT, questionRows: q, admits: "person" });
  assert.equal(r.gap, "kartṛ");
  assert.equal(r.answer, "jonathan");
  assert.equal(r.reason, null);
});

test("what did Jonathan give to Mina -> book", () => {
  const q = [
    ROW(1, "What", "what", "PRON", 2, "obj", "karman"),
    ROW(2, "did", "do", "AUX", 3, "aux", null),
    ROW(3, "give", "give", "VERB", 0, "root", null),
    ROW(4, "Jonathan", "Jonathan", "PROPN", 3, "nsubj", "kartṛ"),
    ROW(5, "to", "to", "ADP", 6, "case", null),
    ROW(6, "Mina", "Mina", "PROPN", 3, "obl", "sampradāna"),
  ];
  const r = answerQuestion({ textRows: TEXT, questionRows: q, admits: "thing" });
  assert.equal(r.gap, "karman");
  assert.equal(r.answer, "book");
});

test("where does Mina live -> village", () => {
  const q = [
    ROW(1, "Where", "where", "ADV", 3, "advmod", "adhikaraṇa"),
    ROW(2, "does", "do", "AUX", 3, "aux", null),
    ROW(3, "live", "live", "VERB", 0, "root", null),
    ROW(4, "Mina", "Mina", "PROPN", 3, "nsubj", "kartṛ"),
  ];
  const r = answerQuestion({ textRows: TEXT, questionRows: q, admits: "place" });
  assert.equal(r.gap, "adhikaraṇa");
  assert.equal(r.answer, "village");
});

test("a question about a relation the text does not hold is a no-triple, not a guess", () => {
  const q = [
    ROW(1, "Who", "who", "PRON", 2, "nsubj", "kartṛ"),
    ROW(2, "read", "read", "VERB", 0, "root", null),
    ROW(3, "the", "the", "DET", 4, "det", null),
    ROW(4, "book", "book", "NOUN", 2, "obj", "karman"),
  ];
  const r = answerQuestion({ textRows: TEXT, questionRows: q, admits: "person" });
  assert.equal(r.reason, "no-triple");
  assert.equal(r.answer, null);
});

test("questionDag reads the WH-word as the gap and every other kāraka as a filled role", () => {
  const q = [
    ROW(1, "Who", "who", "PRON", 2, "nsubj", "kartṛ"),
    ROW(2, "gave", "give", "VERB", 0, "root", null),
    ROW(3, "book", "book", "NOUN", 2, "obj", "karman"),
  ];
  const d = questionDag(q, "person");
  assert.equal(d.gap, "kartṛ");
  assert.deepEqual(d.filled, { predicate: "give", karman: "book" });
});
