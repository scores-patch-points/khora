// gender-chain.test.mjs — the canonical chain's order (told > corpus > title > dictionary > snapshot), what each layer reports, and that a missing layer is said, not skipped.
import test from "node:test"; import assert from "node:assert/strict";
import { genderPriorChain, genderPriorChainFor } from "./gender-chain.js";
import { makeNameGenderPrior, readCorrections } from "./gender-of-words.js";
const dict = { schema: "NameGenderDictionary@1", provenance: { measured: {} }, words: { natasha: [0, 2], pierre: [2, 0], laurie: [2, 2], casey: [0, 2] }, titles: { mrs: "f", mr: "m" } };
const text = "Mrs. Bennet spoke. Natasha smiled. Pierre left. Laurie waved. Casey wrote.", at = (w) => [text.indexOf(w), text.indexOf(w) + w.length];
const cast = [{ ref: "bennet", mentionSpans: [at("Mrs. Bennet")] }, { ref: "natasha", mentionSpans: [at("Natasha")] }, { ref: "pierre", mentionSpans: [at("Pierre")] }, { ref: "laurie", mentionSpans: [at("Laurie")] }, { ref: "casey", mentionSpans: [at("Casey")] }];
const corpusTable = { table: new Map([["natasha", new Map([["m", 9]])]]), language: "en" };   // a corpus that says Natasha is a man, to see who wins
test("the given-name layers speak below the corpus: a title, a dictionary sense; a name with both senses stays open", () => {
  const out = genderPriorChain({ text, cast, words: makeNameGenderPrior({ dictionary: dict }) }); assert.equal(out.get("bennet"), "f"); assert.equal(out.get("natasha"), "f"); assert.equal(out.get("pierre"), "m"); assert.equal(out.has("laurie"), false);
});
test("the corpus (the text's own recurring evidence) overrides the given-name layers, and what the user told overrides the corpus", () => {
  const C = readCorrections([{ kind: "correction", at: "2026-11-24T00:00:00Z", body: { key: "casey", class: "x", said: "they means Casey" } }, { kind: "correction", body: { key: "natasha", class: "f", said: "Natasha is a woman" } }]);
  const told = makeNameGenderPrior({ dictionary: dict, corrections: C }), withCorpus = genderPriorChain({ text, cast, words: makeNameGenderPrior({ dictionary: dict }), corpusTable });
  assert.equal(withCorpus.get("natasha"), "m", "the corpus beats the dictionary"); assert.equal(genderPriorChain({ text, cast, words: told, corpusTable, told }).get("natasha"), "f", "what the user told beats the corpus"); assert.equal(genderPriorChain({ text, cast, words: told, told }).get("casey"), "x");
});
test("for English the chain is the real one with its layers reported; a layer that is not there says so, and a language with no prior has no chain", () => {
  const f = genderPriorChainFor("eng"); assert.equal(typeof f, "function"); assert.ok(f.layers && f.layers.title && f.layers.dictionary && f.layers.snapshot);
  assert.match(f.layers.told, /absent: no corrections/); assert.match(f.layers.nameTable, /absent/); assert.ok(typeof f.layers.corpus === "string");
  assert.equal(genderPriorChainFor("fra"), null, "no given-name prior for French: no chain, not an English guess");
  const g = genderPriorChainFor("eng", { corrections: readCorrections([{ kind: "correction", body: { key: "casey", class: "f", said: "she is Casey" } }]) }); assert.equal(g.layers.told, "1 remembered");
  const out = f({ text: "Mrs. Bennet spoke. Natasha smiled.", cast: [{ ref: "a", mentionSpans: [[0, 11]] }, { ref: "b", mentionSpans: [[19, 26]] }] }); assert.equal(out.get("a"), "f"); assert.equal(out.get("b"), "f");
});
