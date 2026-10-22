// ud-tokenize.test.mjs — the tokenizer learns contractions, elisions, hyphen clitics, hyphen policy and unspaced segmentation from a treebank.
//   node --test native/adapters/text/ud-tokenize.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { trainTokenizer, loadTokenizer, tokenizeWith } from "./ud-tokenize.js";
import { headOfGloss, makeGlossary } from "../../organs/wikt-gloss.js";

// a sentence in parseConllu's shape: words, plus multiword tokens as { range, form }
const S = (text, words, multi = []) => ({ text, tokens: words.map((form, i) => ({ id: i + 1, form })), multi });
const forms = (tok, t) => tokenizeWith(tok, t).map((x) => x.form);

test("contractions expand, elisions and hyphen clitics split, as the treebank writes them", () => {
  const tb = [S("El jefe del equipo.", ["El", "jefe", "de", "el", "equipo", "."], [{ range: "3-4", form: "del" }]),
    S("Le chef du groupe.", ["Le", "chef", "de", "le", "groupe", "."], [{ range: "3-4", form: "du" }]),
    S("L'eau est-il là ?", ["L'", "eau", "est", "-il", "là", "?"])];
  const tok = loadTokenizer(trainTokenizer(tb));
  assert.deepEqual(forms(tok, "La casa del pueblo."), ["La", "casa", "de", "el", "pueblo", "."]);
  assert.deepEqual(forms(tok, "L'aéroport du nord."), ["L'", "aéroport", "de", "le", "nord", "."]);
  assert.deepEqual(forms(tok, "Est-il prêt ?"), ["Est", "-il", "prêt", "?"]);
});

test("a treebank that cuts words at their hyphens is followed, one that keeps them is too", () => {
  const cut = loadTokenizer(trainTokenizer([S("Der CDU-Chef sprach.", ["Der", "CDU", "-", "Chef", "sprach", "."])]));
  assert.deepEqual(forms(cut, "Die TV-Show lief."), ["Die", "TV", "-", "Show", "lief", "."]);
  const keep = loadTokenizer(trainTokenizer([S("A well-known man.", ["A", "well-known", "man", "."])]));
  assert.deepEqual(forms(keep, "A long-term plan."), ["A", "long-term", "plan", "."]);
});

test("an unspaced script is cut by a segmenter trained on the treebank's own word boundaries", () => {
  const ws = [["光合成", "は", "葉", "で", "行わ", "れる", "。"], ["葉", "は", "緑", "で", "ある", "。"], ["根", "で", "行わ", "れる", "。"], ["光合成", "は", "根", "で", "ある", "。"]];
  const tok = loadTokenizer(trainTokenizer(Array.from({ length: 20 }, (_, i) => S(ws[i % 4].join(""), ws[i % 4])), { iterations: 8 }));
  assert.ok(tok.seg, "a segmenter is trained when most sentences are unspaced");
  assert.deepEqual(forms(tok, "光合成は葉で行われる。"), ["光合成", "は", "葉", "で", "行わ", "れる", "。"]);
});

test("a gloss's head word, by part of speech, and form-of senses followed to their lemma", () => {
  assert.equal(headOfGloss("to discover", "verb"), "discover");
  assert.equal(headOfGloss("the process of making food", "noun"), "process");
  assert.equal(headOfGloss("big, large", "adj"), "big");
  const E = { grandes: [{ pos: "adj", senses: [{ glosses: ["plural of grande"], form_of: [{ word: "grande" }] }] }], grande: [{ pos: "adj", senses: [{ glosses: ["big, large"] }] }] };
  const g = makeGlossary((lang, w) => E[w] ?? null);
  assert.equal(g("es", "grandes", "ADJ"), "big");
  assert.equal(g("es", "ninguna", "ADJ"), null, "a word with no entry keeps its own lemma (the caller's fallback)");
});
