// ud-parser.test.mjs — the language-neutral UD parser: it trains on CoNLL-U and its shipped English prior reads simple English right.
//   node --test native/adapters/text/ud-parser.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as U from "./ud-parser.js";
const PRIOR = fileURLToPath(new URL("../../priors/ud-parser-eng-ewt.json.gz", import.meta.url)), LEX = fileURLToPath(new URL("../../priors/unimorph-eng-pos.json.gz", import.meta.url));
const row = (id, form, upos, head, deprel) => ({ id, form, lemma: form.toLowerCase(), upos, head, deprel, feats: "_" });
const S = (...toks) => ({ tokens: toks.map((t, i) => row(i + 1, ...t)) });
const toy = [S(["dogs", "NOUN", 2, "nsubj"], ["bark", "VERB", 0, "root"]), S(["cats", "NOUN", 2, "nsubj"], ["see", "VERB", 0, "root"], ["birds", "NOUN", 2, "obj"]), S(["birds", "NOUN", 2, "nsubj"], ["sing", "VERB", 0, "root"])];

test("it trains on any CoNLL-U and returns one tree per sentence: one root, every word headed", () => {
  const json = U.train(Array(20).fill(toy).flat(), { iterations: 3, folds: 2, tagIterations: 3, seed: "toy" });
  assert.equal(json.schema, U.UD_PARSER_SCHEMA);
  const rows = U.analyse(U.loadModel(json), ["cats", "see", "dogs"]);
  assert.equal(rows.filter((r) => r.head === 0).length, 1);
  assert.ok(rows.every((r) => r.head >= 0 && r.head <= rows.length && r.deprel));
  assert.deepEqual(rows.map((r) => [r.upos, r.deprel]), [["NOUN", "nsubj"], ["VERB", "root"], ["NOUN", "obj"]]);
});

test("the shipped English prior reads a passive, a negation and a copula", { skip: !fs.existsSync(PRIOR) && "priors/ud-parser-eng-ewt.json.gz not on disk" }, async () => {
  const m = await U.loadModelFile(PRIOR, { lexFile: fs.existsSync(LEX) ? LEX : null });
  assert.equal(m.meta.treebank, "UD_English-EWT");
  const read = (t) => U.analyse(m, U.tokenize(t).map((x) => x.form));
  const p = read("Caesar was stabbed by Brutus.");
  assert.equal(p.find((r) => r.form === "stabbed").head, 0);
  assert.match(p.find((r) => r.form === "Caesar").deprel, /^nsubj/);
  const n = read("Spiders do not have six legs.");
  assert.equal(n.find((r) => r.form === "not").head, n.find((r) => r.form === "have").id);
  const c = read("Dolphins are mammals.");
  assert.equal(c.find((r) => r.form === "mammals").head, 0);
  assert.equal(c.find((r) => r.form === "Dolphins").deprel, "nsubj");
});

test("a UniMorph file becomes the form → parts-of-speech map the tagger reads", () => {
  const lex = U.unimorphLexicon("boil\tboils\tV;PRS;3;SG\nboil\tboils\tN;PL\n");
  assert.equal(lex.get("boils"), "N|V");
  assert.equal(lex.get("boil"), "N|V");
});
