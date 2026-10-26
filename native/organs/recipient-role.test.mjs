// The RECIPIENT role has one shape in every language (atoms.js). UD marks it three ways, and a reader that knows only one of them reads one fact as
// two: the indirect object ("sold Sagard receivables"), the dative adposition ("sold receivables to Sagard") and the dative case ("Sagard nos vendió").
// Each now gives `<rel>(agent, theme)` and `<rel>_<dative>(agent, recipient)`, the dative being the language's own (grammar-packs RECIPIENT, UD Case=Dat
// first). First-person words are one referent whatever their case ("we" / "us" / "nos"): reference is an equivalence class, never a spelling (Frege).
// A reversed transfer therefore reaches the stage's direction-swap gap; it is neither supported nor contradicted (no license says a swap contradicts).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const K = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GE = await import(path.join(K, "native/adapters/text/grammar-en.js"));
const { loadGrammar } = await import(path.join(K, "native/adapters/text/grammar-ud.js"));
const { readAtoms } = await import(path.join(K, "native/organs/read-atoms.js"));
const { atomSupport } = await import(path.join(K, "native/kernel/atom-support.js"));
const { stageFromAtoms, judgeClaim } = await import(path.join(K, "native/kernel/stage.js"));
const { PACKS } = await import(path.join(K, "native/adapters/text/grammar-packs.js"));
const corefModel = JSON.parse(fs.readFileSync(path.join(K, "eval/meaning/atoms/coref-ranker.json"), "utf8"));
const en = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const read = (text, lang = "en", grammar = en) => readAtoms({ text, lang, grammar, pack: PACKS[lang] ?? null, corefModel });
const rules = (c, s) => atomSupport(read(c).atoms, read(s).atoms, { unread: read(c).unread }).verdict;
const stage = (c, s) => judgeClaim(stageFromAtoms(read(s).atoms, { doc: "s" }), read(c).atoms);

test("the indirect object and the dative adposition say one fact (rules arm: E both ways)", () => {
  assert.equal(rules("We sold Sagard some additional receivables.", "We sold additional receivables to Sagard."), "E");
  assert.equal(rules("We sold additional receivables to Sagard.", "We sold Sagard some additional receivables."), "E");
});
test("first-person words are one referent whatever their case", () => {
  const a = read("Sagard sold us the receivables.").atoms.find((x) => /^sell_to/.test(x.pred)), b = read("We sold Sagard the receivables.").atoms.find((x) => x.pred === "sell");
  assert.ok(a.args[1].person, "us carries the first-person class");
  assert.equal(a.args[1].person, b.args[0].person);
});
test("a reversed transfer is neither supported nor contradicted, and reaches the direction-swap gap", () => {
  const C = "Sagard sold additional receivables to us.", S = "We sold additional receivables to Sagard.";
  assert.notEqual(rules(C, S), "E");
  const j = stage(C, S);
  assert.notEqual(j.verdict, "E"); assert.notEqual(j.verdict, "C");
  assert.ok(j.gaps.some((g) => g.kind === "direction_swap"), JSON.stringify(j.gaps.map((g) => g.kind)));
});
// KNOWN, observed failing (lesson 70: record where the check cannot fire). The English parser attaches "to Sagard" to the object NOUN when the object has
// a determiner ("the receivables to Sagard" -> to(the receivables, Sagard)) and to the VERB when it is bare. A recipient adposition after an object is
// ambiguous without the verb's frame; the verb's lexical frame (VerbNet's Recipient role) is the giver that would decide, and no frame prior ships.
test("a recipient PP after a determiner'd object is the verb's recipient (needs the verb frame)", { todo: "PP attachment; needs a verb-frame giver" }, () => {
  assert.equal(rules("We sold Sagard the receivables.", "We sold the receivables to Sagard."), "E");
});
test("a dative CASE with no adposition reads as the language's dative, not a generic 'at' (Spanish nos, German uns)", async () => {
  for (const [l, t] of [["es", "Sagard nos vendió acciones."], ["de", "Sagard verkaufte uns Aktien."]]) {
    const g = await loadGrammar(l, {});
    const preds = read(t, l, { rowsOf: g.rowsOf, claimsOf: (x, r) => g.claimsOf(x, r) }).atoms.map((a) => a.pred);
    assert.ok(!preds.some((p) => /_at$/.test(p)), `${l}: ${preds}`);
  }
});
test("an object pronoun is not the subject of its own predicate (Ana le dio un libro: le is not Ana)", async () => {
  const g = await loadGrammar("es", {});
  const at = read("Ana le dio un libro a Boris.", "es", { rowsOf: g.rowsOf, claimsOf: (x, r) => g.claimsOf(x, r) }).atoms;
  assert.ok(!at.some((a) => a.args.length === 2 && a.args[0].entity != null && a.args[0].entity === a.args[1].entity && /^dar/.test(a.pred)), at.map((a) => a.text).join(" ; "));
});
