// ask-live.test.mjs — the reasoning chain run through the REAL parser: read a text and a question,
// attach the kārakas, narrow the DAG, answer. Skips when the shipped English parser model is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadModel } from "./english-parser.js";
import { askText } from "./ask-live.mjs";
import { readQuestion } from "./question-grammar.en.js";

const MODELS = ["/Users/mlacy/janus-main/priors/parser-eng-ewt.json", "native/priors/parser-eng-ewt.json"].filter((p) => fs.existsSync(p));
const model = MODELS.length ? loadModel(JSON.parse(fs.readFileSync(MODELS[0], "utf8"))) : null;

test("who gave the book to Mina -> jonathan, through the real parser", { skip: !model && "parser-eng-ewt.json not on disk" }, () => {
  const r = askText({ text: "Jonathan gave the book to Mina.", question: "Who gave the book to Mina?", model });
  assert.equal(r.gap, "kartṛ");
  assert.equal(r.answer, "jonathan");
  assert.equal(r.reason, null);
});

test("what did Jonathan give to Mina -> book, through the real parser", { skip: !model && "parser-eng-ewt.json not on disk" }, () => {
  const r = askText({ text: "Jonathan gave the book to Mina.", question: "What did Jonathan give to Mina?", model });
  assert.equal(r.gap, "karman");
  assert.equal(r.answer, "book");
});

test("a question the text does not hold is a no-triple, not a guess", { skip: !model && "parser-eng-ewt.json not on disk" }, () => {
  const r = askText({ text: "Jonathan gave the book to Mina.", question: "Who read the book?", model });
  assert.equal(r.reason, "no-triple");
  assert.equal(r.answer, null);
});

test("missing inputs refuse rather than guess", () => {
  assert.equal(askText({ text: null, question: "Who?", model }).reason, "missing-input");
  assert.equal(askText({ text: "x", question: "y", model: null }).reason, "no-model");
});

// --- the role of the gap comes from the MARKER on the question's phrase (wh-role.mjs), the text is labelled by the same evidence ---
// EXPLORATORY: hand-written sentences, one author, one shipped parser model. Two nearby questions are parser-limited and are NOT asserted:
// "Whom did Mina receive the book from?" (the parser roots "did" as a VERB with "receive" as its xcomp, so the predicate is "do") and
// "With what did Jonathan open the door?" (the parser hangs the fronted "With" on the verb as SCONJ/mark, not on "what").
const skip = !model && "parser-eng-ewt.json not on disk";
const ask = (text, question) => askText({ text, question, model });
const GIVE = "Jonathan gave the book to Mina.";

test("'to whom' and 'whom ... to' ask the recipient (sampradāna), not the agent, through the real parser", { skip }, () => {
  const pied = ask(GIVE, "To whom did Jonathan give the book?");
  assert.equal(pied.gap, "sampradāna"); assert.equal(pied.gapVia, "marker:to"); assert.equal(pied.answer, "mina");
  for (const q of ["Whom did Jonathan give the book to?", "Who did Jonathan give the book to?"]) {
    const r = ask(GIVE, q);
    assert.equal(r.gap, "sampradāna", q); assert.equal(r.gapVia, "stranded:to", q); assert.equal(r.answer, "mina", q);
  }
});

test("'from whom' asks the source, 'what ... with' the instrument, 'what ... in' the locus", { skip }, () => {
  const src = ask("Mina received the book from Jonathan.", "From whom did Mina receive the book?");
  assert.equal(src.gap, "apādāna"); assert.equal(src.gapVia, "marker:from"); assert.equal(src.answer, "jonathan");
  const ins = ask("Jonathan opened the door with a key.", "What did Jonathan open the door with?");
  assert.equal(ins.gap, "karaṇa"); assert.equal(ins.gapVia, "stranded:with"); assert.equal(ins.answer, "key");
  const loc = ask("Jonathan lives in Kansas.", "What does Jonathan live in?");
  assert.equal(loc.gap, "adhikaraṇa"); assert.equal(loc.gapVia, "stranded:in"); assert.equal(loc.answer, "kansas");
});

test("falsifier: the questions that already worked are unchanged (class default, same answer)", { skip }, () => {
  const a = ask(GIVE, "Who gave the book to Mina?"); assert.equal(a.gap, "kartṛ"); assert.equal(a.gapVia, "class:person"); assert.equal(a.answer, "jonathan");
  const b = ask(GIVE, "What did Jonathan give to Mina?"); assert.equal(b.gap, "karman"); assert.equal(b.gapVia, "class:thing"); assert.equal(b.answer, "book");
  const c = ask("Jonathan lives in Kansas.", "Where does Jonathan live?"); assert.equal(c.gap, "adhikaraṇa"); assert.equal(c.answer, "kansas");
  const d = ask("Mina received the book from Jonathan.", "Who received the book from Jonathan?"); assert.equal(d.answer, "mina");
});

test("a fronted preposition does not turn a WH-question into a polar one", { skip }, () => {
  const q = readQuestion("To whom did Jonathan give the book?", { model });
  assert.equal(q.form, "wh"); assert.equal(q.admits, "person");
  const polar = readQuestion("Did Jonathan give the book to Mina?", { model });
  assert.equal(polar.form, "polar"); assert.equal(polar.admits, "proposition");
});
