// wh-role.test.mjs — the role a WH-question's gap asks for: a marker on the phrase ("to whom", a stranded "to") overrides the declared
// class default (who -> kartṛ), and nothing else does. Pure, hand-built rows (the real-parser cases are in ask-live.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { whGapRole } from "./wh-role.mjs";
import { markerTableFor } from "./karaka-total.mjs";
import { questionDag, answerQuestion } from "./ask.mjs";
import { gapRole, KARAKA_KIND } from "./wh-narrow.js";

const R = (id, form, upos, head, deprel, extra = {}) => ({ id, form, lemma: form.toLowerCase(), upos, head, deprel, ...extra });

// "To whom did Jonathan give the book?"   (the parser hangs "To" on "whom"; the labeller reads marker:to on "whom")
const PIED = [
  R(1, "To", "ADP", 2, "case"), R(2, "whom", "PRON", 5, "obl", { karaka: "sampradāna", karakaVia: "marker:to", karakaContested: ["karman"] }),
  R(3, "did", "AUX", 5, "aux"), R(4, "Jonathan", "PROPN", 5, "nsubj", { karaka: "kartṛ", karakaVia: "relation:nsubj" }),
  R(5, "give", "VERB", 0, "root"), R(6, "the", "DET", 7, "det"), R(7, "book", "NOUN", 5, "obj", { karaka: "karman", karakaVia: "relation:obj" }),
];
// "Whom did Jonathan give the book to?"   (the parser hangs the stranded "to" on the verb as an object-less oblique)
const stranded = (adp, deprel = "obl") => [
  R(1, "Whom", "PRON", 4, "nsubj", { karaka: "kartṛ", karakaVia: "relation:nsubj" }), R(2, "did", "AUX", 4, "aux"),
  R(3, "Jonathan", "PROPN", 4, "nsubj", { karaka: "kartṛ", karakaVia: "relation:nsubj" }), R(4, "give", "VERB", 0, "root"),
  R(5, "the", "DET", 6, "det"), R(6, "book", "NOUN", 4, "obj", { karaka: "karman", karakaVia: "relation:obj" }), R(7, adp, "ADP", 4, deprel),
];

test("a marker on the WH-word's own row decides the gap: 'to whom' is the recipient, not the agent", () => {
  const g = whGapRole(PIED, "person");
  assert.equal(g.role, "sampradāna"); assert.equal(g.via, "marker:to"); assert.deepEqual(g.contested, ["karman"]);
  assert.equal(whGapRole(PIED, "person").role !== gapRole("person").role, true, "it overrides the class default (kartṛ)");
});

test("a stranded preposition gives the WH-word's role, from the SAME marker table the labeller uses", () => {
  const table = markerTableFor("eng").case;
  for (const adp of ["to", "from", "with", "in", "at", "for"]) {
    const g = whGapRole(stranded(adp), "person");
    assert.equal(g.role, table[adp][0], `${adp} -> ${table[adp][0]}`); assert.equal(g.via, `stranded:${adp}`);
    if (table[adp].length > 1) assert.deepEqual(g.contested, table[adp].slice(1), `${adp}: the other readings are reported, not dropped`);
  }
  assert.equal(whGapRole(stranded("to"), "thing").role, "sampradāna", "'what ... to' is nominal too");
});

test("anything that is not a marker leaves the declared class default, and says so", () => {
  // the WH-word's own relation is NOT evidence (WH-movement makes it unreliable): a plain "who" stays kartṛ, "what" stays karman
  const plain = [R(1, "Who", "PRON", 2, "nsubj", { karaka: "kartṛ", karakaVia: "relation:nsubj" }), R(2, "gave", "VERB", 0, "root")];
  assert.deepEqual(whGapRole(plain, "person"), { role: "kartṛ", via: "class:person" });
  assert.deepEqual(whGapRole([R(1, "What", "PRON", 2, "obj", { karaka: "karman", karakaVia: "relation:obj" }), R(2, "did", "VERB", 0, "root")], "thing"), { role: "karman", via: "class:thing" });
  assert.deepEqual(whGapRole(plain, "place"), { role: "adhikaraṇa", via: "class:place" });
  assert.deepEqual(whGapRole(plain, "proposition"), { role: null, via: "class:proposition" }, "a polar question has no kāraka gap");
  assert.deepEqual(whGapRole(null, "person"), { role: "kartṛ", via: "class:person" });
});

test("a preposition that has its own object is not stranded; an unlisted or relational one is ignored; no deprel means no claim", () => {
  const withObject = stranded("to", "case");   // deprel case: it is the marker of some noun, not an orphan
  assert.equal(whGapRole(withObject, "person").via, "class:person");
  assert.equal(whGapRole(stranded("up"), "person").via, "class:person", "'up' is not in the marker table");
  assert.equal(whGapRole(stranded("of"), "person").via, "class:person", "of is sambandha, a relation between nominals, never a gap role");
  const noDeprel = stranded("to"); delete noDeprel[6].deprel;
  assert.equal(whGapRole(noDeprel, "person").via, "class:person", "hand-built rows with no deprel cannot be read as stranded");
  const hasKid = [...stranded("to"), R(8, "Mina", "PROPN", 7, "pobj")];   // an ADP with a child is not stranded
  assert.equal(whGapRole(hasKid, "person").via, "class:person");
});

test("two stranded prepositions are a typed gap: the class default stays and both are reported, neither is picked", () => {
  const two = [...stranded("to"), R(8, "from", "ADP", 4, "obl")];
  const g = whGapRole(two, "person");
  assert.equal(g.role, "kartṛ"); assert.equal(g.via, "class:person"); assert.deepEqual(g.ambiguous, ["to", "from"]);
  assert.deepEqual(questionDag(two, "person").ambiguous, ["to", "from"], "carried through questionDag");
  assert.equal(whGapRole(stranded("to"), "person").ambiguous, undefined, "one stranded preposition is not ambiguous");
});

test("stranding applies only to a nominal WH-word: 'where ... to' keeps the place default", () => {
  const where = [R(1, "Where", "ADV", 4, "advmod"), R(2, "did", "AUX", 4, "aux"), R(3, "he", "PRON", 4, "nsubj"), R(4, "go", "VERB", 0, "root"), R(5, "to", "ADP", 4, "obl")];
  assert.deepEqual(whGapRole(where, "place"), { role: "adhikaraṇa", via: "class:place" });
});

test("questionDag and answerQuestion carry the role, its evidence and its contested readings through; the filled roles are unchanged", () => {
  const d = questionDag(PIED, "person");
  assert.equal(d.gap, "sampradāna"); assert.equal(d.via, "marker:to"); assert.deepEqual(d.contested, ["karman"]);
  assert.deepEqual(d.filled, { predicate: "give", kartṛ: "jonathan", karman: "book" }, "the WH-word is the gap, never a filled role");
  const TEXT = [
    R(1, "Jonathan", "PROPN", 2, "nsubj", { karaka: "kartṛ" }), R(2, "gave", "VERB", 0, "root", { lemma: "give" }), R(3, "the", "DET", 4, "det"),
    R(4, "book", "NOUN", 2, "obj", { karaka: "karman" }), R(5, "to", "ADP", 6, "case"), R(6, "Mina", "PROPN", 4, "nmod", { karaka: "sampradāna" }),
  ];
  const a = answerQuestion({ textRows: TEXT, questionRows: PIED, admits: "person" });
  assert.equal(a.answer, "mina"); assert.equal(a.gap, "sampradāna"); assert.equal(a.gapVia, "marker:to"); assert.deepEqual(a.gapContested, ["karman"]);
  const s = answerQuestion({ textRows: TEXT, questionRows: stranded("to"), admits: "person" });
  assert.equal(s.answer, "mina"); assert.equal(s.gapVia, "stranded:to");
});

test("falsifier: a question with no marker still asks the agent, and a text that holds no recipient answers no-triple, not a guess", () => {
  const TEXT = [R(1, "Jonathan", "PROPN", 2, "nsubj", { karaka: "kartṛ" }), R(2, "slept", "VERB", 0, "root", { lemma: "sleep" })];
  const q = [R(1, "Whom", "PRON", 4, "nsubj"), R(2, "did", "AUX", 4, "aux"), R(3, "Jonathan", "PROPN", 4, "nsubj", { karaka: "kartṛ" }), R(4, "give", "VERB", 0, "root"), R(5, "to", "ADP", 4, "obl")];
  const r = answerQuestion({ textRows: TEXT, questionRows: q, admits: "person" });
  assert.equal(r.answer, null); assert.equal(r.gap, "sampradāna"); assert.ok(["no-triple", "gap-absent"].includes(r.reason));
});

test("the kinds table admits a person as a source, so 'from whom' narrows consistently", () => {
  assert.ok(KARAKA_KIND["apādāna"].includes("person")); assert.ok(KARAKA_KIND["apādāna"].includes("place"));
  assert.deepEqual(KARAKA_KIND["sampradāna"], ["person"]);
});
