import test from "node:test"; import assert from "node:assert/strict";
import { karakaRows, karakaCoverage, UD_RELATIONS, PANINI_LABELS, KARAKAS, markerTableFor } from "./karaka-total.mjs";
import { karakaOf } from "./karaka-map.mjs";

// rows as the English parser emitted them on the probe paragraph (2026-11-23), lemma added where the parser gives it
const R = (id, form, lemma, upos, head, deprel, feats = "_") => ({ id, form, lemma, upos, feats, head, deprel });
const by = (rows, form) => rows.find((r) => r.form === form);

const UD_V2_UNIVERSAL = ["acl", "advcl", "advmod", "amod", "appos", "aux", "case", "cc", "ccomp", "clf", "compound", "conj", "cop", "csubj", "dep", "det", "discourse", "dislocated", "expl", "fixed", "flat", "goeswith", "iobj", "list", "mark", "nmod", "nsubj", "nummod", "obj", "obl", "orphan", "parataxis", "punct", "reparandum", "root", "vocative", "xcomp"];

test("totality: every UD v2 universal relation (37) has a label in the closed set (conj inherits)", () => {
  assert.equal(UD_V2_UNIVERSAL.length, 37);
  for (const d of UD_V2_UNIVERSAL) {
    assert.ok(Object.hasOwn(UD_RELATIONS, d), `${d} has no entry`);
    if (d === "conj") assert.equal(UD_RELATIONS[d], null);
    else assert.ok(PANINI_LABELS[UD_RELATIONS[d]], `${d} -> ${UD_RELATIONS[d]} is not in the closed set`);
  }
  for (const k of KARAKAS) assert.ok(PANINI_LABELS[k]);
});

test("passive: the subject is karman, the by-phrase is kartṛ, with-phrase karaṇa (not inverted)", () => {
  const rows = karakaRows([
    R(1, "The", "the", "DET", 2, "det"), R(2, "door", "door", "NOUN", 4, "nsubj"), R(3, "was", "be", "AUX", 4, "aux:pass"),
    R(4, "opened", "open", "VERB", 0, "root"), R(5, "by", "by", "ADP", 6, "case"), R(6, "Tom", "Tom", "PROPN", 4, "obl:agent"),
    R(7, "with", "with", "ADP", 9, "case"), R(8, "a", "a", "DET", 9, "det"), R(9, "key", "key", "NOUN", 4, "obl"), R(10, ".", ".", "PUNCT", 4, "punct"),
  ], { stem: "eng" });
  assert.equal(by(rows, "door").karaka, "karman"); assert.equal(by(rows, "door").karakaVia, "voice:passive-subject");
  assert.equal(by(rows, "Tom").karaka, "kartṛ");
  assert.equal(by(rows, "key").karaka, "karaṇa"); assert.equal(by(rows, "key").karakaVia, "marker:with");
  assert.equal(by(rows, "opened").panini, "kriyā");
  assert.equal(by(rows, "by").panini, "vibhakti"); assert.equal(by(rows, "a").panini, "viśeṣaṇa"); assert.equal(by(rows, ".").panini, "virāma");
  // the same agent attached as a bare obl: the marker "by" under a passive head decides kartṛ
  const bare = karakaRows([R(1, "door", "door", "NOUN", 3, "nsubj"), R(2, "was", "be", "AUX", 3, "aux:pass"), R(3, "opened", "open", "VERB", 0, "root"), R(4, "by", "by", "ADP", 5, "case"), R(5, "Tom", "Tom", "PROPN", 3, "obl")], { stem: "eng" });
  assert.equal(by(bare, "Tom").karaka, "kartṛ"); assert.match(by(bare, "Tom").karakaVia, /^voice:agent-marker/);
});

test("the marker child carries the role: on/after -> time or locus, from -> source, to -> recipient, because -> cause, in order to -> purpose", () => {
  const s1 = karakaRows([R(1, "Alice", "Alice", "PROPN", 2, "nsubj"), R(2, "gave", "give", "VERB", 0, "root"), R(3, "Bob", "Bob", "PROPN", 2, "iobj"), R(4, "the", "the", "DET", 5, "det"), R(5, "book", "book", "NOUN", 2, "obj"), R(6, "on", "on", "ADP", 7, "case"), R(7, "Monday", "Monday", "PROPN", 2, "obl")], { stem: "eng" });
  assert.deepEqual([by(s1, "Alice").karaka, by(s1, "Bob").karaka, by(s1, "book").karaka], ["kartṛ", "sampradāna", "karman"]);
  assert.equal(by(s1, "Monday").karaka, "adhikaraṇa"); assert.deepEqual(by(s1, "Monday").karakaContested, ["kāla"]);
  const s2 = karakaRows([R(1, "Bob", "Bob", "PROPN", 2, "nsubj"), R(2, "read", "read", "VERB", 0, "root"), R(3, "after", "after", "ADP", 4, "case"), R(4, "dinner", "dinner", "NOUN", 2, "obl")], { stem: "eng" });
  assert.equal(by(s2, "dinner").karaka, "kāla"); assert.equal(by(s2, "dinner").karakaContested, undefined);
  const s3 = karakaRows([R(1, "Mary", "Mary", "PROPN", 2, "nsubj"), R(2, "walked", "walk", "VERB", 0, "root"), R(3, "from", "from", "ADP", 5, "case"), R(4, "the", "the", "DET", 5, "det"), R(5, "station", "station", "NOUN", 2, "obl")], { stem: "eng" });
  assert.equal(by(s3, "station").karaka, "apādāna");
  const s4 = karakaRows([R(1, "Alice", "Alice", "PROPN", 2, "nsubj"), R(2, "wrote", "write", "VERB", 0, "root"), R(3, "to", "to", "ADP", 4, "case"), R(4, "Tom", "Tom", "PROPN", 2, "obl"), R(5, "in", "in", "ADP", 8, "mark"), R(6, "order", "order", "NOUN", 5, "fixed"), R(7, "to", "to", "PART", 8, "mark"), R(8, "thank", "thank", "VERB", 2, "advcl"), R(9, "him", "he", "PRON", 8, "obj", "Case=Acc")], { stem: "eng" });
  assert.equal(by(s4, "Tom").karaka, "sampradāna");
  assert.equal(by(s4, "thank").karaka, "prayojana"); assert.equal(by(s4, "thank").karakaVia, "marker:in order");
  assert.equal(by(s4, "order").panini, "samāsa");
  assert.equal(by(s4, "him").karaka, "karman");
  const s5 = karakaRows([R(1, "John", "John", "PROPN", 3, "nsubj"), R(2, "Smith", "Smith", "PROPN", 1, "flat"), R(3, "met", "meet", "VERB", 0, "root"), R(4, "Mary", "Mary", "PROPN", 3, "obj"), R(5, "because", "because", "SCONJ", 7, "mark"), R(6, "he", "he", "PRON", 7, "nsubj"), R(7, "wanted", "want", "VERB", 3, "advcl"), R(8, "tea", "tea", "NOUN", 7, "obj")], { stem: "eng" });
  assert.equal(by(s5, "Smith").panini, "samāsa"); assert.equal(by(s5, "Smith").karaka, null); // part of one name, not a second agent
  assert.equal(by(s5, "wanted").karaka, "hetu");
});

test("coordination shares the first conjunct's role; a coordinated verb is an action", () => {
  const rows = karakaRows([R(1, "met", "meet", "VERB", 0, "root"), R(2, "Mary", "Mary", "PROPN", 1, "obj"), R(3, "and", "and", "CCONJ", 4, "cc"), R(4, "Bob", "Bob", "PROPN", 2, "conj"), R(5, "laughed", "laugh", "VERB", 1, "conj")], { stem: "eng" });
  assert.equal(by(rows, "Bob").karaka, "karman"); assert.equal(by(rows, "Bob").karakaVia, "conj");
  assert.equal(by(rows, "and").panini, "samuccaya");
  assert.equal(by(rows, "laughed").panini, "kriyā");
});

test("ṣaṣṭhī: 'of' relates nominals (sambandha); on a verb's oblique it does not decide the role", () => {
  const rows = karakaRows([R(1, "died", "die", "VERB", 0, "root"), R(2, "of", "of", "ADP", 3, "case"), R(3, "hunger", "hunger", "NOUN", 1, "obl"), R(4, "the", "the", "DET", 5, "det"), R(5, "son", "son", "NOUN", 1, "nsubj"), R(6, "of", "of", "ADP", 7, "case"), R(7, "Tom", "Tom", "PROPN", 5, "nmod")], { stem: "eng" });
  assert.equal(by(rows, "Tom").panini, "sambandha");
  assert.equal(by(rows, "hunger").panini, "kāraka"); assert.match(by(rows, "hunger").karakaVia, /^marker_unlisted:of/);
});

test("Pattern languages: a bare case is the vibhakti; a governed case is not; agreement does not make a modifier a participant", () => {
  const san = karakaRows([R(1, "rāmaḥ", "rāma", "NOUN", 3, "nsubj", "Case=Nom"), R(2, "bāṇena", "bāṇa", "NOUN", 3, "obl", "Case=Ins"), R(3, "hanti", "han", "VERB", 0, "root"), R(4, "tīkṣṇam", "tīkṣṇa", "ADJ", 5, "amod", "Case=Acc"), R(5, "rākṣasam", "rākṣasa", "NOUN", 3, "obj", "Case=Acc")], { stem: "san" });
  assert.equal(by(san, "bāṇena").karaka, "karaṇa"); assert.equal(by(san, "bāṇena").karakaVia, "case:Ins");
  assert.equal(by(san, "tīkṣṇam").panini, "viśeṣaṇa"); assert.equal(by(san, "tīkṣṇam").karaka, null);
  assert.equal(by(san, "rākṣasam").karaka, "karman");
  // German "mit dem Messer": Dat is governed by the preposition; with no German marker table the role is a typed gap, never Dat -> recipient
  const deu = karakaRows([R(1, "schnitt", "schneiden", "VERB", 0, "root"), R(2, "mit", "mit", "ADP", 4, "case"), R(3, "dem", "der", "DET", 4, "det", "Case=Dat"), R(4, "Messer", "Messer", "NOUN", 1, "obl", "Case=Dat")], { stem: "deu" });
  assert.equal(by(deu, "Messer").panini, "kāraka"); assert.equal(by(deu, "Messer").karakaVia, "no_marker_table:deu");
  assert.equal(markerTableFor("deu"), null);
});

test("100% labelled: coverage counts every row, and reports specific vs generic participants beside it", () => {
  const rows = karakaRows([R(1, "x", "x", "X", 0, "root"), R(2, "y", "y", "X", 1, "dep"), R(3, "z", "z", "X", 1, "obl"), R(4, "w", "w", "X", 1, "nsubj"), R(5, "v", "v", "X", 9, "conj"), R(6, "u", "u", "X", 1, undefined)], { stem: "eng" });
  for (const r of rows) assert.ok(PANINI_LABELS[r.panini], `row ${r.id} unlabelled`);
  const c = karakaCoverage([rows]);
  assert.equal(c.labelledRate, 1);
  assert.equal(c.undetermined, 3); // dep, a conj whose head is missing, a row with no deprel
  assert.equal(c.generic, 1); assert.equal(c.specific, 1); assert.equal(c.specificRate, 0.5);
});

test("karakaOf (row-local) reaches the subtype entries and no longer makes a name part an agent", () => {
  assert.equal(karakaOf({ form: "x", upos: "NOUN", feats: "_", deprel: "obl:tmod" }), "kāla");
  assert.equal(karakaOf({ form: "x", upos: "NOUN", feats: "_", deprel: "obl:instr" }), "karaṇa");
  assert.equal(karakaOf({ form: "x", upos: "NOUN", feats: "_", deprel: "obl:agent" }), "kartṛ");
  assert.equal(karakaOf({ form: "x", upos: "NOUN", feats: "_", deprel: "nsubj:pass" }), "karman");
  assert.equal(karakaOf({ form: "x", upos: "NOUN", feats: "_", deprel: "nmod:poss" }), null);
  assert.equal(karakaOf({ form: "Smith", upos: "PROPN", feats: "_", deprel: "flat" }), null);
});
