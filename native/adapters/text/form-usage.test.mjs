// A capital is a convention (adapters/text/conventions.js); a capital the text cannot test is weighed against the treebank's use of the form
// (adapters/text/form-usage.js, read by surfaces.js). These tests use stub priors: no Wiktionary pack, no GUM, no priors directory.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formUsageOf } from "./form-usage.js";
import { extractSurfaces } from "./surfaces.js";
import { conventionsLedger, CONVENTIONS } from "./conventions.js";
import { readWith, buildPriors } from "../../the-fold/read-core.mjs";

// POSPrior@1-shaped: a form keeps every UPOS tag with its count (the keys are case-folded)
const posPrior = { forms: { gather: { VERB: 19 }, government: { NOUN: 62, PROPN: 1 }, french: { ADJ: 15, PROPN: 4, NOUN: 1 }, paris: { PROPN: 50 }, well: { ADV: 161, INTJ: 43, ADJ: 7, NOUN: 2 }, foo: { VERB: 100 } } };
const sentences = [
  { text: "Steps Gather all needed materials.", order: 0 },
  { text: "We then met Paris and Zorblax near the Government.", order: 1 },
  { text: "She spoke French to Paris.", order: 2 },
];
const surfacesOf = (opts) => extractSurfaces(sentences, opts).map((s) => s.surface).sort();

test("formUsageOf: the nominal and the other uses of a form, from the prior's own counts", () => {
  const use = formUsageOf(posPrior);
  assert.deepEqual(use("Gather"), { nominal: 0, other: 19 });
  assert.deepEqual(use("Government"), { nominal: 63, other: 0 });
  assert.deepEqual(use("French"), { nominal: 20, other: 0 }, "an adjective that names a people is nominal");
  assert.deepEqual(use("Well"), { nominal: 9, other: 204 });
  assert.equal(use("Zorblax"), null, "a form the treebank has not seen is undecided");
  assert.equal(use("2.5"), null, "a shape attests a class and counts nothing");
});

test("formUsageOf: no prior, no answer", () => {
  assert.equal(formUsageOf(null), null);
  assert.equal(formUsageOf({}), null);
});

test("a lone capital the text cannot test is weighed against the treebank's use: the verb is refused, the noun, the name and the unseen stay", () => {
  const without = surfacesOf({});
  assert.deepEqual(without, ["French", "Gather", "Government", "Paris", "Zorblax"], "today's tier admits the lone capital of a verb");
  const withUse = surfacesOf({ formUsage: formUsageOf(posPrior) });
  assert.ok(without.includes("Gather") && !withUse.includes("Gather"));
  for (const kept of ["Government", "Paris", "Zorblax", "French"]) assert.ok(withUse.includes(kept), `${kept} stays a candidate`);
  assert.deepEqual(without.filter((s) => s !== "Gather"), withUse, "nothing else moves");
});

test("byte-identical when the evidence is absent: no formUsage, null, or a giver that answers nothing", () => {
  const base = JSON.stringify(extractSurfaces(sentences, {}));
  assert.equal(JSON.stringify(extractSurfaces(sentences, { formUsage: null })), base);
  assert.equal(JSON.stringify(extractSurfaces(sentences, { formUsage: () => null })), base);
  assert.equal(JSON.stringify(extractSurfaces(sentences, { formUsage: formUsageOf(null) })), base);
});

test("the text's own two-sided evidence stands: a word it also writes lower-case is not asked of the giver", () => {
  const text = Array.from({ length: 7 }, (_, i) => ({ text: "We met Foo there.", order: i })).concat([{ text: "We foo there.", order: 7 }]);
  const base = extractSurfaces(text, {}).map((s) => s.surface);
  assert.ok(base.includes("Foo"), "seven capitals against one lower-case clear the text's own test");
  assert.deepEqual(extractSurfaces(text, { formUsage: formUsageOf(posPrior) }).map((s) => s.surface), base, "foo is a verb 100 times in the prior and is not asked");
});

test("the text's capitals count on the nominal side: a form refused at one capital is kept when the text capitalises it enough", () => {
  const many = Array.from({ length: 200 }, (_, i) => ({ text: "We saw Well there.", order: i }));
  const use = formUsageOf(posPrior);
  assert.ok(!extractSurfaces(many.slice(0, 1), { formUsage: use }).some((s) => s.surface === "Well"));
  assert.ok(extractSurfaces(many, { formUsage: use }).some((s) => s.surface === "Well"), "200 capitals and 9 nominal uses balance 204 non-nominal ones within the tail");
});

test("the cast: the pipeline's tier refuses the lone capital and keeps it with the heard rows; the reader's own admission is unchanged", () => {
  const text = "Steps Gather all needed materials for the day. Paris Hilton met Paris Hilton near the river. Paris Hilton left the river early. Paris Hilton then saw Paris Hilton again.";
  const priors = buildPriors({ pos: posPrior, stem: "eng" });
  const on = readWith(text, { language: "eng", priors, minCharacters: 0 });
  const off = readWith(text, { language: "eng", priors, minCharacters: 0, readerOptions: { formUsage: null } });
  assert.equal(on.error, null);
  assert.ok(on.cast.length <= off.cast.length, "the rule only ever removes");
  assert.ok(!on.cast.some((c) => c.allSurfaces.includes("Gather")));
  assert.deepEqual(on.cast.map((c) => c.surface), off.cast.filter((c) => !c.allSurfaces.includes("Gather")).map((c) => c.surface));
  assert.deepEqual(on.formUsageReport.refused.filter((s) => s === "Gather"), ["Gather"]);
  assert.equal(Object.keys(on).includes("formUsageReport"), false, "the report rides the entry, not the wire");
  assert.equal(off.formUsageReport, null);
  assert.ok(off.cast.every((c) => on.cast.some((d) => d.ref === c.ref) || on.heard.some((h) => h.ref === c.ref)), "a refused being is kept in `heard`");
});

test("byte-identical with no pos prior, and for another language", () => {
  const text = "Steps Gather all needed materials for the day. Paris Hilton met Paris Hilton near the river. Paris Hilton left the river early.";
  const bare = buildPriors({ stem: "eng" });
  const strip = (e) => JSON.stringify({ ...e, ms: 0 });
  assert.equal(strip(readWith(text, { language: "eng", priors: bare, minCharacters: 0 })), strip(readWith(text, { language: "eng", priors: bare, minCharacters: 0, readerOptions: { formUsage: null } })));
  const withPrior = buildPriors({ pos: posPrior, stem: "deu" });
  assert.equal(strip(readWith(text, { language: "deu", priors: withPrior, minCharacters: 0 })), strip(readWith(text, { language: "deu", priors: withPrior, minCharacters: 0, readerOptions: { formUsage: null } })), "the capital is English's convention here; German reads as it was");
});

test("the ledger: every convention names its giver or its builder (never revealed), where the reader stands on it, and where it departs", () => {
  const ledger = conventionsLedger();
  assert.equal(ledger.schema, "Nomos@1");
  assert.equal(ledger.rows.length, CONVENTIONS.length);
  assert.ok(Object.isFrozen(ledger.rows) && ledger.rows.every((r) => Object.isFrozen(r)));
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  for (const r of ledger.rows) {
    assert.equal(r.schema, "NomosRule@1");
    assert.equal(r.kind, "convention");
    assert.ok(r.giver || r.builder, `${r.stem}: a convention is given or extracted, never revealed`);
    assert.ok(r.standing === (r.giver ? "given" : "candidate"), `${r.stem}: standing follows the giver`);
    assert.ok(r.says && r.scope && r.basis && r.witnesses.length && r.departs.length, `${r.stem}: complete`);
    const file = r.address.split("::")[0];
    assert.ok(fs.existsSync(path.join(root, file)), `${r.stem}: its address ${file} re-expands into code`);
    if (r.builder) assert.ok(fs.existsSync(path.join(root, r.builder)), `${r.stem}: its builder ${r.builder} exists`);
  }
  assert.deepEqual(ledger.stats.byStanding, { candidate: 3, given: 1 });
});
