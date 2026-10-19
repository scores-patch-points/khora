import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { classifyWord, dominantClass, normalizeForm, shapeClass } from "./wordclass.js";

const posPrior = { forms: { department: { NOUN: 18, PROPN: 8 }, "o'connell": { PROPN: 1 }, the: { DET: 9064, PRON: 8 } } };

test("a curly apostrophe is a typing difference, not an absence", () => {
  const c = classifyWord("O’Connell", { posPrior });
  assert.equal(c.found, true);
  assert.deepEqual(c.via.map((v) => v.step), ["apostrophe"]);
  assert.equal(c.form, "O'Connell");
});

test("the sentence's own punctuation is not part of the form", () => {
  const c = classifyWord("Department.", { posPrior });
  assert.equal(c.found, true);
  assert.deepEqual(c.via.map((v) => v.step), ["edge-punctuation"]);
});

test("an exact entry is untouched and carries no hop", () => {
  const c = classifyWord("the", { posPrior });
  assert.equal(c.found, true);
  assert.equal("via" in c, false);
});

test("a form the prior lacks stays a typed gap", () => {
  assert.equal(classifyWord("Zzxqy.", { posPrior }).found, false);
  assert.equal(classifyWord("", { posPrior }).found, false);
  assert.equal(classifyWord(undefined, { posPrior }).found, false);
});

test("normalizeForm names every step and leaves a clean form alone", () => {
  assert.equal(normalizeForm("plain").steps.length, 0);
  assert.deepEqual(normalizeForm("(O’Connell).").steps.map((s) => s.step), ["apostrophe", "edge-punctuation"]);
});

const lexicon = { schema: "POSLexicon@1", provenance: { givers: [{ name: "test" }] }, classes: { NOUN: ["licensee"], VERB: ["indemnify"], "NOUN|VERB": ["breach"], ADV: ["hereunder"] } };
const withLex = { ...posPrior, lexicon };

test("a form missing from the treebank is answered by the lexicon, as attestation only", () => {
  const c = classifyWord("Indemnify,", { posPrior: withLex });
  assert.equal(c.found, true);
  assert.equal(c.attested, "lexicon");
  assert.deepEqual(c.candidates.map((k) => [k.upos, k.share]), [["VERB", null]]);
  assert.deepEqual(c.via.map((v) => v.step), ["edge-punctuation", "lexicon"]);
});

test("a lexicon candidate never settles a class — ambiguity is kept, and nothing is refused on attestation", () => {
  const c = classifyWord("breach", { posPrior: withLex });
  assert.deepEqual(c.candidates.map((k) => k.upos), ["NOUN", "VERB"]);
  assert.equal(dominantClass(c, { minShare: 0 }), null);
  assert.equal(dominantClass(classifyWord("licensee", { posPrior: withLex }), { minShare: 0 }), null);
});

test("the treebank still wins over the lexicon, and the lexicon is optional", () => {
  const both = { ...withLex, forms: { ...posPrior.forms, hereunder: { ADV: 3 } } };
  const c = classifyWord("hereunder", { posPrior: both });
  assert.equal(c.attested, undefined);
  assert.equal(c.total, 3);
  assert.equal(classifyWord("licensee", { posPrior }).found, false);
});

test("declared shapes settle numerals, e-mail, URLs and identifiers whatever the corpus says", () => {
  const cases = { "$2,500,000.00": "NUM", "2010,": "NUM", "12.5%": "NUM", "3rd": "ADJ", "a.b@nashville.gov": "X", "www.nashville.gov": "X", "N0068140.1": "X" };
  for (const [w, upos] of Object.entries(cases)) {
    const c = classifyWord(w, { posPrior });
    assert.equal(c.found, true, w);
    assert.equal(c.candidates[0].upos, upos, w);
    assert.equal(c.attested, "shape", w);
    assert.equal(dominantClass(c, { minShare: 0.9 }).upos, upos, w);
  }
  assert.equal(shapeClass("Department"), null);
  assert.equal(shapeClass("D.2"), null);
});

const REAL = fileURLToPath(new URL("../../../../janus/priors/", import.meta.url));
test("the real lexicon answers Metro-contract vocabulary the treebank lacks (skipped if the prior is absent)", { skip: !fs.existsSync(REAL + "pos-eng-lexicon.json") }, () => {
  const real = { ...JSON.parse(fs.readFileSync(REAL + "pos-eng.json", "utf8")), lexicon: JSON.parse(fs.readFileSync(REAL + "pos-eng-lexicon.json", "utf8")) };
  const expect = { accordance: ["NOUN"], indemnify: ["VERB"], breach: ["NOUN", "VERB"], hereunder: ["ADV"], thereof: ["ADV"], hereinafter: ["ADV"], forthwith: ["ADV"] };
  for (const [w, up] of Object.entries(expect)) assert.deepEqual(classifyWord(w, { posPrior: real }).candidates.map((k) => k.upos), up, w);
  assert.equal(classifyWord("Zzxqy.", { posPrior: real }).found, false);
});
