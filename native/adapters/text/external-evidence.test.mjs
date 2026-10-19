import test from "node:test";
import assert from "node:assert/strict";
import { parseWiktionary, parseWikipediaSummary, parseWikidataSearch, nominations, evidenceRows, admitLookup, classifyWithLookups, lookupWitness, UPOS_OF_HEADING, SOURCES } from "./external-evidence.js";
import { createHyperlexicon, licenseStanding, compositionAffordance } from "../../kernel/hyperlexicon.js";
import { classifyWord } from "./wordclass.js";
import { readDocumentEvidence } from "./document-evidence.js";

// shapes captured from the live public APIs (2026-10-19)
const WIKT = { en: [{ partOfSpeech: "Adverb", language: "English", definitions: [{ definition: "Under this.\n<ol><li>Under this (within the document being read).</li></ol>" }, { definition: "Under this (within the document being read)." }] }] };
const WIKT_MULTI = { en: [{ partOfSpeech: "Noun", definitions: [{ definition: "A <b>breach</b> of &amp; contract" }] }, { partOfSpeech: "Verb", definitions: [{ definition: "To break." }] }, { partOfSpeech: "Phrase", definitions: [{ definition: "x" }] }] };
const WIKI = { type: "standard", title: "Andrew Johnson", wikibase_item: "Q8612", pageid: 1624, revision: "1379868564", timestamp: "2026-10-12T10:06:05Z", description: "President of the United States from 1865 to 1869", extract: "Andrew Johnson was…", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Andrew_Johnson" } } };
const WD = { search: [{ id: "Q8612", label: "Andrew Johnson", description: "President of the United States from 1865 to 1869" }, { id: "Q47182862", label: "Andrew Johnson", description: "American rower" }, { id: "Q276306", label: "Andrew Johnson", description: "English association football player (born 1981)" }] };

test("Wiktionary: headings become classes; a heading that names no class stays a heading; HTML is stripped", () => {
  const a = parseWiktionary(WIKT, "hereunder");
  assert.deepEqual(a.upos, ["ADV"]);
  assert.equal(a.entries[0].gloss, "Under this. Under this (within the document being read).");
  const b = parseWiktionary(WIKT_MULTI, "breach");
  assert.deepEqual(b.upos, ["NOUN", "VERB"]);
  assert.equal(b.entries[0].gloss, "A breach of & contract");
  assert.equal(b.entries[2].upos, null);
  assert.equal(parseWiktionary({}, "zz").found, false);
});

test("Wikipedia: an article, its QID bridge, and a disambiguation page is never read as an entity", () => {
  const w = parseWikipediaSummary(WIKI);
  assert.equal(w.qid, "Q8612"); assert.equal(w.found, true);
  assert.equal(parseWikipediaSummary({ type: "disambiguation", title: "Johnson" }).disambiguation, true);
  assert.equal(parseWikipediaSummary(null).found, false);
  assert.equal(parseWikipediaSummary({ type: "https://mediawiki.org/wiki/HyperSwitch/errors/not_found", title: "x" }).found, false);
});

test("Wikidata: three entities for one name stay three — ambiguity kept, exactness reported", () => {
  const k = parseWikidataSearch(WD, "Andrew Johnson");
  assert.equal(k.candidates.length, 3);
  assert.equal(k.exact, 3);
  assert.equal(parseWikidataSearch(WD, "Johnson").exact, 0);
});

test("nominations enter the hyperlexicon as CANDIDATES with a named giver and a witness each — and license nothing", () => {
  const results = { dictionary: parseWiktionary(WIKT_MULTI, "breach"), wikipedia: parseWikipediaSummary(WIKI), wikidata: parseWikidataSearch(WD, "Andrew Johnson") };
  let hl = admitLookup(createHyperlexicon(), "breach", { dictionary: results.dictionary }, { retrievedAt: "2026-10-19T12:00:00Z" });
  const noun = compositionAffordance(hl, "form:breach", "class:NOUN");
  assert.equal(noun.standing, "candidate");
  assert.equal(noun.giver, SOURCES.dictionary.giver);
  assert.equal(noun.witnesses[0].retrievedAt, "2026-10-19T12:00:00Z");
  assert.equal(licenseStanding(noun).licensed, false);
  hl = admitLookup(hl, "Andrew Johnson", results);
  assert.equal(compositionAffordance(hl, "form:andrew johnson", "entity:Q8612").standing, "candidate");
  assert.equal(compositionAffordance(hl, "form:andrew johnson", "entity:Q47182862").standing, "candidate"); // the namesake is a candidate too
  assert.equal(compositionAffordance(hl, "article:Andrew Johnson", "entity:Q8612").standing, "candidate");
});

test("a disambiguation page nominates nothing as an article", () => {
  const rows = nominations("Johnson", { wikipedia: parseWikipediaSummary({ type: "disambiguation", title: "Johnson" }) });
  assert.equal(rows.length, 0);
});

test("evidence rows carry giver, license, address and time", () => {
  const rows = evidenceRows("hereunder", { dictionary: parseWiktionary(WIKT, "hereunder") }, { retrievedAt: "t" });
  assert.equal(rows[0].giver, "en.wiktionary.org"); assert.equal(rows[0].license, "CC BY-SA 4.0"); assert.equal(rows[0].retrievedAt, "t"); assert.match(rows[0].url, /wiktionary\.org\/wiki\/hereunder/);
});

test("classifyWithLookups answers a miss from a lookup already made, and never reaches the network for the rest", () => {
  const base = (f) => classifyWord(f, { posPrior: { forms: {} } });
  const cache = new Map([["hereunder", { dictionary: parseWiktionary(WIKT, "hereunder") }], ["andrew johnson", { wikidata: parseWikidataSearch(WD, "Andrew Johnson") }]]);
  const c = classifyWithLookups(base, cache);
  const h = c("hereunder,");
  assert.equal(h.found, true); assert.equal(h.attested, "dictionary"); assert.equal(h.candidates[0].upos, "ADV"); assert.equal(h.candidates[0].share, null);
  assert.equal(c("Andrew Johnson").attested, "wikidata");
  assert.equal(c("andrew johnson").found, false, "a lowercase form is not a name just because a Wikidata item bears the label");
  assert.equal(c("Zzxqy").found, false);
});

test("the witness hook lets a lookup vote inside document-evidence, and it is one more kind of evidence", () => {
  const cache = new Map([["zorbax", { wikidata: { found: true, exact: 1, candidates: [{ exact: true }] } }]]);
  const none = () => ({ found: false, candidates: [] });
  const doc = readDocumentEvidence("Call Zorbax. See Zorbax. Pay Zorbax.", { classify: none, witnesses: [lookupWitness(cache)] });
  const z = doc.readings.find((r) => r.form === "Zorbax");
  assert.ok([...z.evidence.map((e) => e.kind), ...z.redundant].includes("external-lookup"));
});

test("UPOS_OF_HEADING does not force a class on a phrase", () => { assert.equal(UPOS_OF_HEADING.Phrase, undefined); });
