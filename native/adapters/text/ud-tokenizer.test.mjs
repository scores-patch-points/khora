// ud-tokenizer: the prior's data applied. Measured on treebank dev sets when first written (token F1: German 0.99, French 0.98, Spanish 0.99,
// Japanese 0.84 — identity-udhr-emergence/run3/validate.mjs); here the behaviours are pinned on small priors.
import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, tokenizeSpaced, tokenizeUnspaced, sentences, segmentFeatures } from "./ud-tokenizer.js";

test("no prior: whitespace and punctuation only", () => {
  assert.deepEqual(tokenize("Hello, world."), ["Hello", ",", "world", "."]);
});

test("multiword splits, abbreviations, elisions and hyphen clitics come from the prior, never from a rule", () => {
  const T = { mwt: { du: ["de", "le"], des: ["de", "les"] }, abbrev: ["etc."], words: ["l'", "qu'"], hyphenClitics: ["-il"], splitHyphens: false };
  assert.deepEqual(tokenizeSpaced("Du pain, l'eau etc. a-t-il?", T), ["De", "le", "pain", ",", "l'", "eau", "etc.", "a-t", "-il", "?"]); // the split keeps the original's capital
  assert.deepEqual(tokenizeSpaced("Du pain", null), ["Du", "pain"]);
});

test("a letter-hyphen-letter form is split only when the prior says the treebank split them", () => {
  assert.deepEqual(tokenizeSpaced("Baden-Württemberg", { splitHyphens: true }), ["Baden", "-", "Württemberg"]);
  assert.deepEqual(tokenizeSpaced("Baden-Württemberg", { splitHyphens: false }), ["Baden-Württemberg"]);
});

test("an unspaced script is cut by the prior's segmenter: B before a character opens a token", () => {
  // a toy segmenter that opens a token before every Han character preceded by a Han character (weights are the prior's own sparse form)
  const T = { segmenter: { classes: ["I", "B"], w: { "t-1t0=kk": [0, -1, 1, 1], "t-1t0=_k": [0, 1, 1, -1], "t-1t0=hk": [0, -1, 1, 1], "t-1t0=kh": [0, 1, 1, -1] } } };
  assert.deepEqual(tokenizeUnspaced("人権は", T), ["人", "権は"]);
  assert.deepEqual(tokenize("人権は", T), ["人", "権は"]);
  assert.equal(segmentFeatures([..."人権"], 1).length, 14);
});

test("sentences are khora's one cut; a paragraph break always ends one; the prior's abbreviations keep their period", () => {
  assert.deepEqual(sentences("One. Two?\n\nThree", "en"), ["One.", "Two?", "Three"]);
  assert.deepEqual(sentences("Brot, Käse usw. kamen dann. Danach nichts.", "de", { abbrev: ["usw."] }), ["Brot, Käse usw. kamen dann.", "Danach nichts."]);
  assert.deepEqual(sentences("Brot, Käse usw. Kamen dann.", "de", null), ["Brot, Käse usw.", "Kamen dann."], "FALSIFIER: without the prior the cut falls after usw.");
});
