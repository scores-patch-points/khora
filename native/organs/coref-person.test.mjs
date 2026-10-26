// A SUBJECT pronoun is not one being with another argument of its own predicate (coref-learned.js, Principle B for UD nsubj only). The rule reads the
// dependency, not a word, so it holds in every language the grammar reads; an object clitic (Spanish "lo") is exempt because it legitimately doubles an
// object. Measured on the 448 non-English sentences of the spent sets: the rule for every pronoun changed 6 and broke the Spanish doubling and French "en";
// restricted to nsubj it changes 3 (all French subject "il"), none of them a clitic.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const K = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { loadGrammar } = await import(path.join(K, "native/adapters/text/grammar-ud.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { PACKS } = await import(path.join(K, "native/adapters/text/grammar-packs.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(K, "eval/meaning/atoms/coref-ranker.json"), "utf8"));
const en = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const sell = (text) => readAtoms({ text, lang: "en", grammar: en, corefModel }).atoms.filter((a) => a.pred === "sell").map((a) => a.text);

test("'we' is not the date or the agreement it sits beside", () => {
  assert.deepEqual(sell("In May 2024, we entered into the Jemperli Amendment under which we sold additional receivables to Sagard."), ["sell(we, additional receivables)"]);
});
test("an object clitic still doubles its object (Spanish 'lo')", async () => {
  const g = await loadGrammar("es", {});
  const r = readAtoms({ text: "Normalmente este pico lo visitan muchas brigadas y colegios dominicanos.", lang: "es", grammar: { rowsOf: g.rowsOf, claimsOf: (t, rows) => g.claimsOf(t, rows) }, pack: PACKS.es ?? null, corefModel });
  assert.deepEqual(r.atoms.filter((a) => a.pred === "visitar").map((a) => a.text), ["visitar(este pico, este pico)"]);
});
