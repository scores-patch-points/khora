// language-grammar-hop.test.js — the NL → grammar → EOT chain (2026-10-09):
//
//   the GRAMMAR hop is real where the reads' own grammars exist on disk
//   (language-grammar.js: the project is good with Greek and Sanskrit, and
//   increasingly German — plus eng and many others); the EOT hop (intent +
//   edges) consumes CoNLL-U, whose labels are the SAME in every UD language,
//   so it is grammar-neutral by construction. An unidentified turn is a typed
//   gap, never a guess at English.
import test from "node:test";
import assert from "node:assert/strict";
import { grammarFor, detectLanguage } from "../the-fold/language-grammar.js";
import { readIntent } from "../organs/intent-reader.js";
import { edgeFromRecords } from "../the-fold/speaker-model.js";

const rec = (text, rows) => ({ schema: "EOTRich@1", surface: { text, lines: rows.map((r) => r.join("\t")) } });
const row = (id, form, lemma, upos, feats, head, deprel) => [id, form, lemma, upos, "_", feats, head, deprel, "_", "_"];

test("the grammar hop is real for Greek, Sanskrit, and increasingly German", () => {
  for (const name of ["eng", "deu", "ell", "grc", "san"]) {
    const g = grammarFor(name);
    assert.ok(g?.language === name, `${name} has a grammar`);
    assert.ok(g.posPrior, `${name} has a POS prior`);
  }
  assert.equal(grammarFor("zzz").language, null, "an unknown language is a typed gap, never another grammar");
});

test("the NL hop routes by detection — German is German, Greek is Greek, English is English", () => {
  assert.equal(detectLanguage("Ich denke der Bürgermeister ist korrupt")?.language, "deu");
  assert.equal(detectLanguage("Εγώ πιστεύω ότι ο δήμαρχος είναι διεφθαρμένος")?.language, "ell");
  assert.equal(detectLanguage("the mayor is corrupt")?.language, "eng");
  const d = detectLanguage("blah blah zzz");
  assert.equal(d.language, null);
  assert.notEqual(d.language, "eng", "an unidentified turn is a gap, never a guess at English");
});

test("the EOT hop is grammar-neutral: it reads ANY language's CoNLL-U the same way", () => {
  // The same UD labels, German surfaces — the edge binds identically, so when
  // a deu/ell/san turn-parse lands, the EOT hop works unchanged.
  const de = rec("Der Bürgermeister ist korrupt", [
    row(1, "Der", "der", "DET", "Definite=Def", 2, "det"),
    row(2, "Bürgermeister", "bürgermeister", "NOUN", "Number=Sing", 4, "nsubj"),
    row(3, "ist", "sein", "AUX", "Mood=Ind|VerbForm=Fin", 4, "cop"),
    row(4, "korrupt", "korrupt", "ADJ", "Degree=Pos", 0, "root"),
  ]);
  const e = edgeFromRecords([de]);
  assert.equal(e.ok, true);
  assert.deepEqual(e.edge, { subject: "bürgermeister", verb: "korrupt", object: null, negated: false });

  // A German question carries its own mark + root — structural, reads the ask.
  const deQ = rec("Ist der Bürgermeister korrupt?", [
    row(1, "Ist", "sein", "AUX", "Mood=Ind|VerbForm=Fin", 4, "cop"),
    row(2, "der", "der", "DET", "Definite=Def", 3, "det"),
    row(3, "Bürgermeister", "bürgermeister", "NOUN", "Number=Sing", 4, "nsubj"),
    row(4, "korrupt", "korrupt", "ADJ", "Degree=Pos", 0, "root"),
  ]);
  assert.equal(readIntent([deQ]).intents[0], "question", "the trailing mark is read by shape, in any language");
});

test("a language whose GRAMMAR exists but whose turn-parse is not wired declares no claim", () => {
  // The proxy gates the turn-level UD read to eng; a deu turn's edge is null
  // and its intent null → the speaker model records only the visit.
  const m = updateSpeakerModelNoClaims({ intent: null, claim: "Ich denke der Bürgermeister ist korrupt", edge: null, witness: "turn:0" });
  assert.equal(m.claims.length, 0, "a turn with no bound edge and no statement-intent holds nothing");
});

// local, to keep this file self-contained: a minimal declared-turn update
import { updateSpeakerModel, EMPTY_MODEL } from "../the-fold/speaker-model.js";
const updateSpeakerModelNoClaims = (turn) => updateSpeakerModel(EMPTY_MODEL, { turn });