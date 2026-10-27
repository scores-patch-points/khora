// A capital is a convention (adapters/text/conventions.js); a capital the text cannot test is weighed against the treebank's use of the form
// (adapters/text/form-usage.js, read by surfaces.js). These tests use stub priors: no Wiktionary pack, no GUM, no priors directory.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formUsageOf, formUsageFor } from "./form-usage.js";
import { extractSurfaces } from "./surfaces.js";
import { conventionOf, conventionsGap } from "./conventions.js";
import { readWith, buildPriors } from "../../the-fold/read-core.mjs";
import { priorJson } from "../../the-fold/prior-source.mjs";

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
  assert.deepEqual(use("Gather"), { nominal: 0, other: 19, twin: false });
  assert.deepEqual(use("Government"), { nominal: 63, other: 0, twin: false });
  assert.deepEqual(use("French"), { nominal: 20, other: 0, twin: false }, "an adjective that names a people is nominal");
  assert.deepEqual(use("Well"), { nominal: 9, other: 204, twin: false });
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

// Conventions@1 as janus keeps it (priors/conventions-eng.json); a stub here, so no priors directory is needed
const conventionsPrior = { schema: "Conventions@1", language: "eng", provenance: { builder: "scripts/build-conventions-prior.mjs", source: "g.conllu sha256:" + "ab".repeat(32) }, conventions: [
  { stem: "capital-marks-a-name", says: "a mid-sentence capital marks a name", scope: "cased scripts", address: "native/adapters/text/surfaces.js::accumulateSurfaceEvidence", giver: null, builder: "scripts/build-conventions-prior.mjs", witnesses: [], departs: ["German"] },
  { stem: "treebank-attests-a-forms-use", says: "a treebank attests a form's use", scope: "English", address: "native/adapters/text/form-usage.js::formUsageOf", giver: "UD_English-EWT", builder: null, witnesses: [], departs: [] },
] };

test("conventionOf: the reader cites a convention by its stem from the prior it was handed; no copy is held here", () => {
  const c = conventionOf(conventionsPrior, "treebank-attests-a-forms-use");
  assert.deepEqual(c, { stem: "treebank-attests-a-forms-use", says: "a treebank attests a form's use", scope: "English", site: "native/adapters/text/form-usage.js::formUsageOf", giver: "UD_English-EWT", builder: "scripts/build-conventions-prior.mjs", source: conventionsPrior.provenance.source });
  assert.equal(conventionOf(conventionsPrior, "no-such-convention"), null);
  assert.equal(conventionOf(null, "capital-marks-a-name"), null);
  assert.equal(conventionsGap(conventionsPrior), null);
  assert.match(conventionsGap(null), /no Conventions@1 prior/, "an absent prior is a typed gap, never an invented row");
  assert.match(conventionsGap({ schema: "POSPrior@1" }), /no Conventions@1 prior/);
});

test("the cast's report cites the conventions it read by when the prior is in reach, names the gap when not, and the entry is the same either way", () => {
  const text = "Steps Gather all needed materials for the day. Paris Hilton met Paris Hilton near the river. Paris Hilton left the river early.";
  const withPrior = readWith(text, { language: "eng", priors: buildPriors({ pos: posPrior, conventions: conventionsPrior, stem: "eng" }), minCharacters: 0 });
  const without = readWith(text, { language: "eng", priors: buildPriors({ pos: posPrior, stem: "eng" }), minCharacters: 0 });
  assert.deepEqual(withPrior.formUsageReport.conventions.map((c) => c.stem), ["capital-marks-a-name", "treebank-attests-a-forms-use"]);
  assert.equal(withPrior.formUsageReport.gap, null);
  assert.deepEqual(without.formUsageReport.conventions, []);
  assert.match(without.formUsageReport.gap, /no Conventions@1 prior/);
  assert.equal(JSON.stringify({ ...withPrior, ms: 0 }), JSON.stringify({ ...without, ms: 0 }), "citing a convention changes nothing the reader reports");
});

test("the real prior, when janus is beside this checkout: every convention's site re-expands into code here (skipped without it)", (t) => {
  const prior = priorJson("conventions-eng.json");
  if (!prior) return t.skip("janus priors/conventions-eng.json is not beside this checkout");
  assert.equal(conventionsGap(prior), null);
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  for (const c of prior.conventions) {
    assert.ok(c.giver || c.builder || prior.provenance?.builder, `${c.stem}: given or extracted, never revealed`);
    assert.ok(fs.existsSync(path.join(root, c.address.split("::")[0])), `${c.stem}: its site ${c.address} re-expands into code`);
  }
});

// ── the name/function-word twin: undecided with the tied set, never decided by counts (PREREG-TWIN.md) ────────────────────────────────────────
const twinPrior = { forms: {
  may: { AUX: 186, PROPN: 53 }, us: { PRON: 169, PROPN: 162 }, a: { DET: 3756, PROPN: 7 }, gather: { VERB: 19 }, government: { NOUN: 62, PROPN: 1 },
  filler: { NOUN: 9000, VERB: 3000, ADP: 2000, DET: 2000, PUNCT: 3000 },
} };
const sents = (...texts) => texts.map((text, order) => ({ text, order }));
const withoutTwin = (use) => (s) => { const u = use(s); return u && { nominal: u.nominal, other: u.other }; };   // khora#80's usage: counts only

test("twin: a form is a twin when its name tags AND its closed-class tags each exceed the prior's own base rates; noise is not", () => {
  const use = formUsageOf(twinPrior);
  assert.equal(use("May").twin, true, "53 name tags of 239 against a base rate under 1%, 186 closed-class against about a third");
  assert.equal(use("US").twin, true);
  assert.equal(use("A").twin, false, "7 name tags among 3,763 tokens is annotation noise, not a reading");
  assert.equal(use("Gather").twin, false, "a verb with no name tag");
  assert.equal(use("Government").twin, false);
  assert.deepEqual(Object.keys(use("May")).sort(), ["nominal", "other", "twin"]);
});

test("twin: a lone capital of a twin is UNDECIDED with the tied set named, not refused or kept by counts", () => {
  const text = sents("Steps May visit all needed places for the day.", "We saw Gather near the US border.");
  const use = formUsageOf(twinPrior);
  const v1 = extractSurfaces(text, { formUsage: withoutTwin(use) }).map((s) => s.surface).sort();
  assert.ok(!v1.includes("May") && v1.includes("US"), "khora#80: the counts refuse May and keep US");
  const verdicts = { undecided: [], separated: [] };
  const v2 = extractSurfaces(text, { formUsage: use, verdicts }).map((s) => s.surface).sort();
  assert.ok(!v2.includes("May") && !v2.includes("US"), "neither is a candidate: it is not a being yet");
  assert.deepEqual(verdicts.undecided.map((u) => u.surface).sort(), ["May", "US"]);
  for (const u of verdicts.undecided) assert.deepEqual(u.tied, ["name", "function word"]);
  assert.deepEqual(v1.filter((s) => s !== "US"), v2, "nothing else moves");
});

test("twin: the text separates the readings when the form heads a capitalised run", () => {
  const text = sents("We met the US Army near the river.", "Then she saw May Day approach.");
  const verdicts = { undecided: [], separated: [] };
  const got = extractSurfaces(text, { formUsage: formUsageOf(twinPrior), verdicts }).map((s) => s.surface);
  assert.ok(got.includes("US") && got.includes("May"), "the capitalised run is the text's own evidence: both stay candidates");
  assert.deepEqual(verdicts.separated.map((s) => s.surface).sort(), ["May", "US"]);
  assert.deepEqual(verdicts.undecided, []);
});

test("twin: byte-identical to khora#80 when the usage carries no twin field, and with no sink", () => {
  const text = sents("Steps May visit all needed places for the day.", "We saw Gather near the US border.");
  const v1 = JSON.stringify(extractSurfaces(text, { formUsage: withoutTwin(formUsageOf(twinPrior)) }));
  assert.equal(JSON.stringify(extractSurfaces(text, { formUsage: withoutTwin(formUsageOf(twinPrior)), verdicts: { undecided: [], separated: [] } })), v1, "a sink changes nothing");
  assert.doesNotThrow(() => extractSurfaces(text, { formUsage: formUsageOf(twinPrior) }), "a twin with no sink handed in is still returned undecided");
});

test("twin: the cast report names the undecided and keeps them out of the cast and out of 'refused'", () => {
  const text = "Steps May visit all needed places for the day. Paris Hilton met Paris Hilton near the river. Paris Hilton left the river early.";
  const e = readWith(text, { language: "eng", priors: buildPriors({ pos: twinPrior, stem: "eng" }), minCharacters: 0 });
  assert.equal(e.error, null);
  assert.ok(!e.cast.some((c) => c.allSurfaces.includes("May")), "an undecided twin is not a being");
  assert.deepEqual(e.formUsageReport.undecided.map((u) => [u.surface, u.tied]), [["May", ["name", "function word"]]]);
  assert.ok(!e.formUsageReport.refused.includes("May"), "undecided and refused are different verdicts");
  assert.equal(Object.keys(e).includes("formUsageReport"), false, "the report rides the entry, not the wire");
});

test("twin: on the real prior, when janus is beside this checkout, the twins are exactly 'us' and 'may' (skipped without it)", async (t) => {
  const { priorsFor } = await import("../../the-fold/read-core.mjs");
  const posPrior = priorsFor("eng").posPrior;
  if (!posPrior?.forms) return t.skip("janus priors/pos-eng.json is not beside this checkout");
  const use = formUsageOf(posPrior);
  assert.deepEqual(Object.keys(posPrior.forms).filter((f) => use(f)?.twin).sort(), ["may", "us"], "PREREG-TWIN.md: two forms; 'will' is not one");
});

// ── language balance: the rule is inert wherever the language has no ledgered convention (cased, caseless, non-space-delimited) ───────────────────
const LANGUAGES = [
  ["German (every noun capitalised)", "deu", "Gestern Abend trafen wir Anna und Peter im Café am Marktplatz. Anna erzählte von ihrer Reise nach Berlin, wo sie Thomas besucht hatte. Peter hörte aufmerksam zu."],
  ["Russian (Cyrillic, cased)", "rus", "Анна Павловна встретила Пьера у входа. Потом Пьер рассказал Андрею о поездке в Петербург. Андрей слушал внимательно и молчал."],
  ["Chinese (caseless, no spaces)", "zho", "昨天晚上我们在市场广场的咖啡馆见到了安娜和彼得。安娜讲了她去柏林拜访托马斯的旅行。彼得认真地听着，又点了一杯咖啡。"],
  ["Turkish (Latin script, no filed stem: read with the English priors as a typed gap)", "tur", "Dün akşam pazar meydanındaki kafede Ayşe ve Mehmet ile buluştuk. Ayşe, Berlin'e yaptığı ve Ahmet'i ziyaret ettiği yolculuğu anlattı. Mehmet dikkatle dinledi."],
  ["Arabic (caseless, right to left)", "ara", "التقينا أمس مساء بأنا وبيتر في المقهى. حكت أنا عن رحلتها إلى برلين حيث زارت توماس. استمع بيتر باهتمام وطلب فنجانا آخر من القهوة."],
];
test("language balance: formUsageFor names the languages it has a ledgered convention for; the rest are null, so core names none", () => {
  assert.equal(typeof formUsageFor("eng", twinPrior), "function");
  for (const [, stem] of LANGUAGES) assert.equal(formUsageFor(stem, twinPrior), null, `${stem}: no ledgered capital convention here`);
  assert.equal(formUsageFor("eng", null), null);
});
for (const [name, stem, text] of LANGUAGES) {
  test(`language balance: ${name} reads byte-identically with the capital rule on and off, even with a pos prior in hand`, () => {
    const priors = buildPriors({ pos: twinPrior, stem });
    const strip = (e) => JSON.stringify({ ...e, ms: 0 });
    const on = readWith(text, { language: stem, priors, minCharacters: 0 });
    const off = readWith(text, { language: stem, priors, minCharacters: 0, readerOptions: { formUsage: null } });
    assert.equal(on.error, null);
    assert.equal(strip(on), strip(off));
    assert.equal(on.formUsageReport, null, "the rule did not run");
  });
}

test("language balance: a text whose language is neither declared nor heard is not read by an English convention", () => {
  const text = "Steps Gather all needed materials for the day. Paris Hilton met Paris Hilton near the river. Paris Hilton left the river early.";
  const e = readWith(text, { priors: buildPriors({ pos: posPrior, stem: "eng" }), minCharacters: 0, language: "xx" });
  assert.equal(e.language.source, "declared-unknown");
  assert.equal(e.formUsageReport, null, "no stem filed for xx: the English priors are a typed gap, not licence to run an English rule");
  assert.ok(e.cast.some((c) => c.allSurfaces.includes("Gather")), "the capital tier reads as it did");
});
