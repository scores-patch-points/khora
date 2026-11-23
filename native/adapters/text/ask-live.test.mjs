// ask-live.test.mjs — the reasoning chain run through the REAL parser: read a text and a question,
// attach the kārakas, narrow the DAG, answer. Skips when the shipped English parser model is absent.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadModel } from "./english-parser.js";
import { askText } from "./ask-live.mjs";

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
