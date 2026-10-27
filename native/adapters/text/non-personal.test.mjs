// non-personal.test.mjs — the ruling of who is NOT a person (non-personal.js) and its wiring into the production pronoun call.
//
// The ruling is the givers': TimePrior@1's month and weekday names, and a lexicon giver's common-noun-and-no-name head words. These tests
// hand it stub givers, so they prove the RULE and the FORWARDING; the measured effect on real text is eval/referents/pronoun-golden.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { timeNamesOf, headOf, formsToAsk, surfaceIsNonPerson, nonPersonalOf, consultNonPersonal } from "./non-personal.js";
import { makeLexicon } from "../../organs/lexicon.js";
import { readDocument, readWith } from "../../the-fold/read-core.mjs";

const TIME_PRIOR = { concepts: { m3: { class: "month", en: "March" }, d2: { class: "weekday", en: "Tuesday" }, c1: { class: "century", en: "Nineteenth" }, bad: { class: "month" } } };
const TIME = timeNamesOf(TIME_PRIOR);

// a lexicon giver over a table: a form missing from the table is one the giver does not list
const ENTRIES = {
  office: [{ w: "office", pos: "noun", senses: [] }],
  home: [{ w: "home", pos: "noun", senses: [] }],
  government: [{ w: "government", pos: "noun", senses: [] }],
  Paris: [{ w: "Paris", pos: "name", senses: [] }],
  paris: [{ w: "paris", pos: "noun", senses: [] }],
  Jordan: [{ w: "Jordan", pos: "name", senses: [] }, { w: "Jordan", pos: "noun", senses: [] }],
  Mark: [{ w: "Mark", pos: "name", senses: [] }],
  mark: [{ w: "mark", pos: "noun", senses: [] }, { w: "mark", pos: "verb", senses: [] }],
};
const stubLexicon = () => makeLexicon({ lang: "en", ask: async (forms) => ({ giver: { name: "stub" }, results: Object.fromEntries(forms.map((f) => [f, ENTRIES[f] ?? null])) }) });
async function asked(forms) { const lex = stubLexicon(); await lex.want(forms); return lex; }

test("timeNamesOf reads only month and weekday names, lower-cased, and is empty without the prior", () => {
  assert.deepEqual([...TIME].sort(), ["march", "tuesday"]);
  assert.equal(timeNamesOf(null).size, 0);
  assert.equal(timeNamesOf({}).size, 0);
});

test("headOf is the surface's last token", () => {
  assert.equal(headOf("the Home Office"), "Office");
  assert.equal(headOf("Marie Curie"), "Curie");
  assert.equal(headOf("  "), null);
  assert.equal(headOf(null), null);
});

test("formsToAsk is every distinct word, as written and in lower case", () => {
  const forms = formsToAsk("The Home Office met. The office met.");
  for (const f of ["The", "the", "Home", "home", "Office", "office", "met"]) assert.ok(forms.includes(f), f);
  assert.equal(new Set(forms).size, forms.length);
});

test("a month or a weekday is non-personal by TimePrior@1, with no lexicon at all", () => {
  assert.equal(surfaceIsNonPerson("March", { timeNames: TIME }), true);
  assert.equal(surfaceIsNonPerson("last Tuesday", { timeNames: TIME }), true);
  assert.equal(surfaceIsNonPerson("March", { timeNames: new Set() }), false, "without the prior nothing is ruled");
});

test("a head word the giver lists as a common noun and never as a name is non-personal", async () => {
  const lexicon = await asked(formsToAsk("the Home Office the government"));
  assert.equal(surfaceIsNonPerson("the Home Office", { timeNames: TIME, lexicon }), true);
  assert.equal(surfaceIsNonPerson("the government", { timeNames: TIME, lexicon }), true);
});

test("the head as written is read before its lower case: a name stays a candidate even if its lower case is a noun", async () => {
  const lexicon = await asked(formsToAsk("Paris Mark Jordan"));
  assert.equal(surfaceIsNonPerson("Paris", { timeNames: TIME, lexicon }), false, "Paris is listed as a name");
  assert.equal(surfaceIsNonPerson("Mark", { timeNames: TIME, lexicon }), false, "Mark is listed as a name, mark as a noun");
  assert.equal(surfaceIsNonPerson("Jordan", { timeNames: TIME, lexicon }), false, "a name entry beside a noun entry keeps it a candidate");
});

test("a sentence-initial capitalised common noun falls back to its lower case", async () => {
  const lexicon = await asked(formsToAsk("Government spoke."));
  assert.equal(surfaceIsNonPerson("Government", { timeNames: TIME, lexicon }), true);
});

test("a word the giver does not list, or was never asked about, rules nothing", async () => {
  const lexicon = await asked(["Zxqv", "zxqv"]);
  assert.equal(surfaceIsNonPerson("Zxqv", { timeNames: TIME, lexicon }), false, "listed nowhere");
  assert.equal(surfaceIsNonPerson("office", { timeNames: TIME, lexicon }), false, "never asked");
  assert.equal(surfaceIsNonPerson("office", { timeNames: TIME, lexicon: null }), false, "no lexicon");
});

test("a hyperlexicon-shaped entry (pos as a list) is read the same way", () => {
  const lexicon = { get: (f) => (f === "office" ? [{ w: "office", kind: "lemma", pos: ["noun"], senses: [] }] : f === "Paris" ? [{ w: "Paris", kind: "lemma", pos: ["name"], senses: [] }] : null) };
  assert.equal(surfaceIsNonPerson("the office", { timeNames: TIME, lexicon }), true);
  assert.equal(surfaceIsNonPerson("Paris", { timeNames: TIME, lexicon }), false);
  assert.equal(surfaceIsNonPerson("office", { timeNames: TIME, lexicon: { get: () => [{ w: "office", kind: "form-of", pos: [], senses: [] }] } }), false, "an entry with no pos rules nothing");
});

test("a referent is non-personal only when EVERY surface it carries is", async () => {
  const lexicon = await asked(formsToAsk("office Office Home Paris March"));
  const surfaceToReferent = new Map([["Home Office", "r:office"], ["Home", "r:office"], ["March", "r:march"], ["Paris", "r:paris"], ["the office", "r:mixed"], ["Paris Hilton", "r:mixed"]]);
  const ids = nonPersonalOf(surfaceToReferent, { timeNames: TIME, lexicon });
  assert.deepEqual(ids.sort(), ["r:march", "r:office"]);
  assert.deepEqual(nonPersonalOf({ March: "r:march", Paris: "r:paris" }, { timeNames: TIME, lexicon }), ["r:march"], "a plain object works too");
});

test("consultNonPersonal asks the lexicon once, then rules synchronously", async () => {
  const lexicon = stubLexicon();
  const { nonPersonalOf: rule, report } = await consultNonPersonal("The Home Office met in March.", lexicon, { timePrior: TIME_PRIOR, language: "eng" });
  assert.equal(typeof rule, "function");
  assert.equal(report.timeNames, 2);
  assert.equal(report.gap, null);
  assert.equal(lexicon.log.length, 1, "one ask, whatever the text");
  assert.deepEqual(rule(new Map([["Home Office", "a"], ["March", "b"], ["Paris", "c"]])).sort(), ["a", "b"]);
});

test("a language other than English, or no lexicon, is a typed gap and no ruling", async () => {
  const spa = await consultNonPersonal("La oficina", stubLexicon(), { timePrior: TIME_PRIOR, language: "spa" });
  assert.equal(spa.nonPersonalOf, null);
  assert.match(spa.report.gap, /English only/);
  const none = await consultNonPersonal("The office", null, { timePrior: TIME_PRIOR });
  assert.equal(none.nonPersonalOf, null);
  assert.match(none.report.gap, /no lexicon/);
});

test("without the prior the report says so and the lexicon still rules", async () => {
  const { nonPersonalOf: rule, report } = await consultNonPersonal("The Home Office met in March.", stubLexicon(), { timePrior: null, language: "eng" });
  assert.match(report.gap, /TimePrior@1/);
  assert.deepEqual(rule(new Map([["Home Office", "a"], ["March", "b"]])), ["a"]);
});

// ── the wiring: what the production pronoun call hands the resolver ─────────────────────────────────────────────────────────

const TEXT = "Marie Curie worked at the Home Office in March. The Home Office paid Marie Curie in March. She left Paris in March, and the Home Office wrote to Marie Curie again. Marie Curie replied from Paris.";
const spyOptions = (extra = {}) => { const seen = []; return { seen, readerOptions: { resolvePronouns: (s, surf, base) => { seen.push({ surf: new Map(surf), base }); return { bindings: [] }; }, ...extra } }; };

test("readDocument with a lexicon hands the resolver the referents the givers rule non-personal, and not the people", async () => {
  const { seen, readerOptions } = spyOptions();
  const entry = await readDocument(TEXT, { language: "en", minCharacters: 0, lexicon: stubLexicon(), readerOptions });
  assert.ok(seen.length >= 1, "the resolver was called");
  const { surf, base } = seen[0];
  assert.equal(base.minActivation, 0.05);
  assert.equal(base.minMargin, 0.2);
  assert.ok(base.nonPersonal.includes(surf.get("March")), "March is a time");
  assert.ok(base.nonPersonal.includes(surf.get("Home Office")), "the Home Office is a common noun");
  for (const [s, id] of surf) if (/Marie|Curie|Paris/.test(s)) assert.ok(!base.nonPersonal.includes(id), `${s} stays a candidate`);
  assert.ok(entry.aliasReport.nonPersonal.timeNames >= 19, "the report names what was asked of the givers (12 months, 7 weekdays)");
  assert.ok(base.nonPersonal.length >= 2);
});

test("byte-identical without a ruling: no lexicon, a caller's null, or a ruling that throws or names nothing", async () => {
  const dials = { minActivation: 0.05, minMargin: 0.2 };
  const none = spyOptions();
  await readDocument(TEXT, { language: "en", minCharacters: 0, lexicon: null, readerOptions: none.readerOptions });
  assert.deepEqual(none.seen[0].base, dials, "no lexicon: the two dials alone");
  const off = spyOptions({ nonPersonalOf: null });
  await readDocument(TEXT, { language: "en", minCharacters: 0, lexicon: stubLexicon(), readerOptions: off.readerOptions });
  assert.deepEqual(off.seen[0].base, dials, "a caller's null switches the ruling off");
  const throws = spyOptions({ nonPersonalOf: () => { throw new Error("giver fell over"); } });
  readWith(TEXT, { language: "en", minCharacters: 0, readerOptions: throws.readerOptions });
  assert.deepEqual(throws.seen[0].base, dials, "a ruling that throws costs the ruling, never the read");
  const empty = spyOptions({ nonPersonalOf: () => [] });
  readWith(TEXT, { language: "en", minCharacters: 0, readerOptions: empty.readerOptions });
  assert.deepEqual(empty.seen[0].base, dials, "a ruling that names nothing adds no key");
});

test("a caller's own nonPersonalOf wins over the givers'", async () => {
  const mine = spyOptions({ nonPersonalOf: (surf) => [surf.get("Paris")] });
  await readDocument(TEXT, { language: "en", minCharacters: 0, lexicon: stubLexicon(), readerOptions: mine.readerOptions });
  const { surf, base } = mine.seen[0];
  assert.deepEqual(base.nonPersonal, [surf.get("Paris")]);
});
