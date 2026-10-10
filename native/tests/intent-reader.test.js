// intent-reader.test.js — the STRUCTURAL turn read (organs/intent-reader.js),
// pinned against the two falsifiers found 2026-10-09:
//
//   1. `endsQuestion` was `[?…]?\s*$` — the optional mark made every sentence
//      "end" in a question mark, so every copular statement parsed as
//      "question" (and the speaker model could never hold a claim);
//   2. `auxInterrogative` fired on ANY finite auxiliary/copula (VerbForm=Fin),
//      so every copular clause was a "question" even without a question mark.
//
// The read is from the parser's structure (deprels, feats, the trailing mark),
// never from a word list — omnilingual by construction (the same UD labels).
import test from "node:test";
import assert from "node:assert/strict";
import { readIntent } from "../organs/intent-reader.js";

const rec = (text, rows) => ({ schema: "EOTRich@1", surface: { text, lines: rows.map((r) => r.join("\t")) } });
const row = (id, form, lemma, upos, feats, head, deprel) => [id, form, lemma, upos, "_", feats, head, deprel, "_", "_"];

const STATEMENT = rec("I think the mayor is corrupt", [
  row(1, "I", "I", "PRON", "Case=Nom|Person=1", 2, "nsubj"),
  row(2, "think", "think", "VERB", "Mood=Ind|Tense=Pres|VerbForm=Fin", 0, "root"),
  row(3, "the", "the", "DET", "Definite=Def", 4, "det"),
  row(4, "mayor", "mayor", "NOUN", "Number=Sing", 6, "nsubj"),
  row(5, "is", "be", "AUX", "Mood=Ind|VerbForm=Fin", 6, "cop"),
  row(6, "corrupt", "corrupt", "ADJ", "Degree=Pos", 2, "ccomp"),
]);

const QUESTION = rec("Can you explain that?", [
  row(1, "can", "can", "AUX", "VerbForm=Fin", 3, "aux"),
  row(2, "you", "you", "PRON", "Case=Nom|Person=2", 3, "nsubj"),
  row(3, "explain", "explain", "VERB", "VerbForm=Inf", 0, "root"),
  row(4, "that", "that", "PRON", "PronType=Dem", 3, "obj"),
]);

const COPLESS_STATEMENT = rec("the meeting moved to Thursday", [
  row(1, "the", "the", "DET", "Definite=Def", 2, "det"),
  row(2, "meeting", "meeting", "NOUN", "Number=Sing", 3, "nsubj"),
  row(3, "moved", "move", "VERB", "Mood=Ind|Tense=Past|VerbForm=Fin", 0, "root"),
  row(4, "to", "to", "ADP", "_", 3, "obl"),
  row(5, "Thursday", "thursday", "PROPN", "Number=Sing", 4, "case"),
]);

const PHATIC = rec("thanks!", [
  row(1, "thanks", "thank", "INTJ", "_", 0, "root"),
]);

const ARABIC_QUESTION = rec("هل هذا صحيح؟", [
  row(1, "هل", "هل", "AUX", "Mood=Int", 2, "cop"),
  row(2, "هذا", "هذا", "PRON", "Number=Sing", 0, "root"),
]);

test("FALSIFIER 1: a statement with no question mark is a STATEMENT, not a question", () => {
  assert.equal(readIntent([STATEMENT]).intents[0], "statement");
  assert.equal(readIntent([COPLESS_STATEMENT]).intents[0], "statement");
});

test("FALSIFIER 2: a finite copula inside the clause is not an interrogative signal", () => {
  // the embedded "is" (cop, VerbForm=Fin) must not turn the sentence into a
  // question — it is a plain declarative.
  assert.equal(readIntent([STATEMENT]).intents[0], "statement");
});

test("a clearly-marked question is a question; the mark is script-neutral", () => {
  assert.equal(readIntent([QUESTION]).intents[0], "question");
  assert.equal(readIntent([ARABIC_QUESTION]).intents[0], "question", "the Arabic mark ؟ reads the ask");
});

test("an interjection is phatic — never a claim", () => {
  assert.equal(readIntent([PHATIC]).intents[0], "phatic");
});