// gender-from-rows.test.mjs — the rows half of the pro-form tally (gender-from-corpus.js genderEvidenceFromRows): evidence
// only where the grammar binds a pro-form to the subject's name, read off rows, never the surface.
import test from "node:test"; import assert from "node:assert/strict";
import { genderEvidenceFromRows, proformOf, proformClass, featsOf, signTest } from "./gender-from-corpus.js";
const R = (id, form, upos, head, deprel, feats = "_", lemma = form) => ({ id, form, lemma, upos, head, deprel, feats });
// Natásha raised her head and looked at herself .
const s1 = [R(1, "Natásha", "PROPN", 2, "nsubj"), R(2, "raised", "VERB", 0, "root", "", "raise"), R(3, "her", "PRON", 4, "nmod:poss", "Case=Acc|Gender=Fem|Number=Sing|Person=3|PronType=Prs", "she"), R(4, "head", "NOUN", 2, "obj"),
  R(5, "and", "CCONJ", 6, "cc"), R(6, "looked", "VERB", 2, "conj", "", "look"), R(7, "at", "ADP", 8, "case"), R(8, "herself", "PRON", 6, "obl", "Gender=Fem|Number=Sing|Person=3|PronType=Prs|Reflex=Yes", "herself"), R(9, ".", "PUNCT", 2, "punct")];
// Her mother said that Prince Andrew had lost his way .
const s2 = [R(1, "Her", "PRON", 2, "nmod:poss", "Gender=Fem|Number=Sing|Person=3|PronType=Prs", "she"), R(2, "mother", "NOUN", 3, "nsubj"), R(3, "said", "VERB", 0, "root", "", "say"),
  R(4, "that", "SCONJ", 8, "mark"), R(5, "Prince", "PROPN", 8, "nsubj"), R(6, "Andrew", "PROPN", 5, "flat"), R(7, "had", "AUX", 8, "aux"), R(8, "lost", "VERB", 3, "ccomp", "", "lose"),
  R(9, "his", "PRON", 10, "nmod:poss", "Gender=Masc|Number=Sing|Person=3|PronType=Prs", "he"), R(10, "way", "NOUN", 8, "obj")];
// Pierre took Natásha 's hand in his .   (a possessive beside another name: evidence for neither)
const s3 = [R(1, "Pierre", "PROPN", 2, "nsubj"), R(2, "took", "VERB", 0, "root", "", "take"), R(3, "Natásha", "PROPN", 5, "nmod:poss"), R(4, "'s", "PART", 3, "case"), R(5, "hand", "NOUN", 2, "obj"),
  R(6, "his", "PRON", 2, "obl", "Gender=Masc|Number=Sing|Person=3|PronType=Prs|Poss=Yes", "he")];
const key = (r) => r.form.toLowerCase();

test("a reflexive and a possessive in the subject's own clause (with a coordinated verb sharing it) count for the name", () => {
  const e = genderEvidenceFromRows([s1], { keyOf: key }).get("natásha");
  assert.deepEqual(e, { classes: { f: 2 }, reflexive: 1, possessive: 1 });
});
test("a possessive inside the subject's phrase says nothing about the subject; a dependent clause with its own subject is its own", () => {
  const ev = genderEvidenceFromRows([s2], { keyOf: key });
  assert.equal(ev.get("mother"), undefined);
  assert.deepEqual(ev.get("prince")?.classes, { m: 1 }); assert.deepEqual(ev.get("andrew")?.classes, { m: 1 });
});
test("a possessive beside another name is evidence for neither", () => {
  assert.equal(genderEvidenceFromRows([s3], { keyOf: key }).size, 0);
});
test("the class is the pro-form's own features; first and second person carry none", () => {
  assert.equal(proformClass("Gender=Neut|Number=Sing|Person=3"), "n"); assert.equal(proformClass("Number=Plur|Person=3"), "x");
  assert.equal(proformClass("Number=Sing|Person=1"), null); assert.deepEqual(featsOf("_"), {});
});
test("proformOf decides only when the sign test does; no evidence is no answer", () => {
  assert.equal(proformOf(null), null);
  assert.equal(proformOf({ classes: { f: 40, m: 3 } }).contested, false);
  assert.equal(proformOf({ classes: { f: 3, m: 2 } }).contested, true);
  assert.ok(Math.abs(signTest(5, 10) - 1) < 1e-9);
});
