// void-hunt.test.mjs — the hunt, with the reader's real rows and sources that are stubs (so it runs offline), then one live smoke test that is
// skipped unless HUNT_LIVE=1. The stubs hold what Wikipedia's text holds for these questions (a Cast section, a lead, a biography), copied in
// the form the real page has.
import test from "node:test"; import assert from "node:assert/strict";
import { voidOfQuestion, huntVoid, matchSentence } from "./void-hunt.js";
import { passagesOfWikipediaText, wikipediaSource } from "./hunt-sources.js";
import { makeTrailStore } from "./trail-store.mjs";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

let read = null, split = null, why = null;
try {
  const K = process.env.KHORA_NATIVE ? new URL(`file://${process.env.KHORA_NATIVE.replace(/\/?$/, "/")}`).href : new URL("../", import.meta.url).href;   // KHORA_NATIVE=<another checkout's native/> runs this hunt against that checkout's reader (to test a reader fix before it is merged)
  const { rowsOfFor } = await import(K + "reading.js"), { splitSentences } = await import(K + "adapters/text/spans.js"), { priorsFor, abbreviationsFor } = await import(K + "the-fold/read-core.mjs");
  const P = await rowsOfFor("eng"), pr = priorsFor("eng"), cache = new Map();
  read = (s) => { if (!cache.has(s)) cache.set(s, P.rowsOf(s) ?? []); return cache.get(s); };
  split = (t) => splitSentences(t, { abbreviations: abbreviationsFor(t, { priors: pr, aliases: [], abbreviations: null }).set }).map((c) => c.text);
} catch (e) { why = String(e?.message ?? e).slice(0, 100); }
const T = { skip: read ? false : `no reader here: ${why}` };

const LETHAL = { title: "Lethal Weapon", url: "https://en.wikipedia.org/wiki/Lethal_Weapon", passages: [
  { section: null, text: "Lethal Weapon is a 1987 American buddy cop action film directed by Richard Donner and written by Shane Black." },
  { section: "Cast", text: "Mel Gibson as Martin Riggs\nDanny Glover as Roger Murtaugh\nGary Busey as Mr. Joshua\nMitchell Ryan as General Peter McAllister" },
  { section: "Production", text: "Richard Donner was hired to direct after Black's first choice declined. Gibson and Glover rehearsed together for weeks." },
] };
const CURIE = { title: "Marie Curie", url: "https://en.wikipedia.org/wiki/Marie_Curie", passages: [
  { section: null, text: "Marie Curie was a Polish and naturalised-French physicist and chemist. She was born in Warsaw. Curie was born on 7 November 1867." },
  { section: "Early life", text: "Maria Salomea Skłodowska was born in Warsaw on 7 November 1867, the fifth and youngest child of well-known teachers. Her sister Bronisława was born in Warsaw in 1865." },
] };
const source = (...docs) => ({ name: "stub", find: async () => docs });
const voidOf = (q) => voidOfQuestion(read(q));

test("a question declares a void: what kind is missing, what is named, what ties them, which roles are already taken", T, () => {
  const v = voidOf("Who did Mel Gibson play in Lethal Weapon?");
  assert.equal(v.ok, true); assert.equal(v.admits, "person"); assert.deepEqual(v.anchors.map((a) => a.text), ["Mel Gibson", "Lethal Weapon"]);
  assert.deepEqual(v.relation, { lemma: "play", kind: "verb" }); assert.ok(v.taken.includes("kartṛ") && !v.openRoles.includes("kartṛ"), "the player is already named, so the open role is not the player's");
  const c = voidOf("What is the capital of France?"); assert.deepEqual(c.relation, { lemma: "capital", kind: "noun" }); assert.equal(c.admits, "thing");
  assert.equal(voidOf("who was napoleon").ok, false); assert.equal(voidOf("who was napoleon").gap.kind, "no_anchor");
  assert.equal(voidOfQuestion(read("Tell me about Lethal Weapon.")).gap.kind, "no_wh_word");
});

test("a Cast list alone is a lead, not an answer: no sentence says Gibson PLAYED Riggs; one sentence that does, in another document, makes the list its support", T, async () => {
  const alone = await huntVoid(voidOf("Who did Mel Gibson play in Lethal Weapon?"), { sources: [source(LETHAL)], read, split });
  assert.equal(alone.answer, null); assert.equal(alone.lead?.answer, "Martin Riggs"); assert.equal(alone.gap.kind, "relation_not_attested");
  assert.equal(alone.lead.evidence[0].section, "Cast"); assert.equal(alone.lead.evidence[0].sentence, "Mel Gibson as Martin Riggs");
  const bio = { title: "Mel Gibson", url: "https://en.wikipedia.org/wiki/Mel_Gibson", passages: [{ section: "Acting", text: "He returned to play the role of Martin Riggs in Lethal Weapon, a film which helped to cement his status." }] };
  const both = await huntVoid(voidOf("Who did Mel Gibson play in Lethal Weapon?"), { sources: [source(LETHAL, bio)], read, split });
  assert.equal(both.answer?.answer, "Martin Riggs", JSON.stringify(both.candidates.map((c) => [c.answer, c.tier, c.documents]))); assert.equal(both.answer.documents, 2);
  assert.ok(both.candidates.every((c) => c.answer !== "Mel Gibson" && c.answer !== "Lethal Weapon"), "an anchor is never its own answer");
});

test("the same document answers “who directed it” from the lead, by the relation in a passive sentence", T, async () => {
  const h = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [source(LETHAL)], read, split });
  assert.equal(h.answer?.answer, "Richard Donner", JSON.stringify(h.candidates.map((c) => [c.answer, c.tier, c.support]))); assert.equal(h.answer.tier, "role");
  assert.ok(h.answer.support >= 1 && h.answer.documents === 1);
});

test("a place and a time come from the biography's own sentences, whole span included", T, async () => {
  const w = await huntVoid(voidOf("Where was Marie Curie born?"), { sources: [source(CURIE)], read, split });
  assert.equal(w.answer?.answer, "Warsaw", JSON.stringify(w.candidates.map((c) => [c.answer, c.tier])));
  const d = await huntVoid(voidOf("When was Marie Curie born?"), { sources: [source(CURIE)], read, split });
  assert.ok(d.candidates.some((c) => c.answer.includes("1867")), JSON.stringify(d.candidates.map((c) => c.answer)));
});

test("a sentence about the page's subject under another name is not taken for it (the alias is unknown), and another person's birth is never taken for the question's", T, async () => {
  const onlyAlias = { title: "Marie Curie", passages: [{ section: "Early life", text: "Maria Salomea Skłodowska was born in Warsaw on 7 November 1867. Her sister Bronisława was born in Kraków in 1865." }] };
  const h = await huntVoid(voidOf("Where was Marie Curie born?"), { sources: [source(onlyAlias)], read, split });
  assert.equal(h.candidates.length, 0, "no sentence puts Curie, or a pronoun for her, under “born”: a typed gap, not Kraków");
  assert.equal(h.gap.kind, "nothing_fills_the_void");
});

test("names said together answer together: two founders are one answer, and a different pair is a rival", T, async () => {
  const text = { title: "Microsoft", passages: [{ section: null, text: "Microsoft was founded by Bill Gates and Paul Allen in 1975. It was founded in Albuquerque." }] };
  const h = await huntVoid(voidOf("Who founded Microsoft?"), { sources: [source(text)], read, split });
  assert.deepEqual([...h.answer.set].sort(), ["Bill Gates", "Paul Allen"]); assert.equal(h.answer.answerText.includes(" and "), true);
});

test("nothing is picked silently: two sentences that say different things about the same relation are both listed and no answer is named", T, async () => {
  const two = { title: "Lethal Weapon", passages: [{ section: null, text: "Lethal Weapon was directed by Richard Donner." }, { section: "Trivia", text: "Lethal Weapon was directed by Steven Spielberg." }] };
  const h = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [source(two)], read, split });
  assert.deepEqual(h.candidates.map((c) => c.answer).sort(), ["Richard Donner", "Steven Spielberg"]); assert.equal(h.answer, null); assert.equal(h.gap.kind, "several_fill_the_void");
});

test("a bare surname is not Albert Einstein's, and “Hans Albert Einstein” is another person: only the birth that is Einstein's is taken, and the direct place beats the one nested under it", T, async () => {
  const einstein = { title: "Albert Einstein", passages: [{ section: "Childhood", text: "Einstein was born in Ulm as a subject to the Kingdom of Württemberg in the German Empire on 14 March 1879." }] };
  const hans = { title: "Hans Albert Einstein", passages: [{ section: "Early life", text: "Hans Albert Einstein was born on May 14, 1904, in Bern, Switzerland, where his father, Albert Einstein, worked." }] };
  const h = await huntVoid(voidOf("Where was Albert Einstein born?"), { sources: [source(einstein, hans)], read, split });
  assert.equal(h.answer?.answer, "Ulm", JSON.stringify(h.candidates.map((c) => [c.answer, c.tier]))); assert.ok(h.candidates.every((c) => c.answer !== "Bern" && c.answer !== "Empire"));
});

test("a work “by” someone: the credit goes to the maker of a work, both names are listed when the sentence credits two, and a character in a film plot is never the composer", T, async () => {
  const flute = { title: "The Magic Flute", passages: [{ section: null, text: "The Magic Flute is an opera in two acts by Wolfgang Amadeus Mozart to a German libretto by Emanuel Schikaneder." }] };
  const film = { title: "The Magic Flute (2022 film)", passages: [{ section: "Plot", text: "Tim enters the operatic story of the Magic Flute as Prince Tamino, encountering the bird-catcher Papageno." }] };
  const h = await huntVoid(voidOf("Who composed The Magic Flute?"), { sources: [source(flute, film)], read, split });
  assert.equal(h.answer, null, JSON.stringify(h.candidates.map((c) => [c.answer, c.tier, c.documents])));
  assert.deepEqual(h.candidates.filter((c) => c.tier === "byline").map((c) => c.answer).sort(), ["Emanuel Schikaneder", "Wolfgang Amadeus Mozart"], "the composer and the librettist are both credited by the sentence, and the chat is told so rather than made to guess");
  assert.ok(h.candidates.filter((c) => c.tier === "byline").length === 2 && h.candidates.every((c) => c.answer !== "Prince Tamino" || c.tier === "comention"));
  const tolstoy = { title: "War and Peace", passages: [{ section: null, text: "War and Peace is an epic novel by the Russian author Leo Tolstoy." }] };
  const w = await huntVoid(voidOf("Who wrote War and Peace?"), { sources: [{ ...source(tolstoy), exists: async (name) => name === "War and Peace" }], read, split });
  assert.equal(w.void.anchors.length, 1, "“War and Peace” is one anchor because the source has a page of that name"); assert.equal(w.answer?.answer, "Leo Tolstoy", JSON.stringify(w.candidates.map((c) => [c.answer, c.tier])));
  assert.equal(w.answer.tier, "byline");
});

test("a lower-case mention of a title, inside a sentence about something else, is not the work: “master of 'war and peace'” never credits a Roman historian", T, async () => {
  const caesars = { title: "The Twelve Caesars", passages: [{ section: "Composition history", text: "Suetonius wrote that he was a master of \"war and peace\"." }] };
  const w = await huntVoid({ ...voidOf("Who wrote War and Peace?"), joinable: [] }, { sources: [source(caesars)], read, split });
  assert.equal(w.answer, null, JSON.stringify(w.candidates.map((c) => [c.answer, c.tier])));
});

test("a time budget bounds the hunt: a source that is asked after the budget is spent is on the trail and nothing is read", T, async () => {
  let t = 0; const slow = { name: "slow", find: async () => { t += 1000; return [LETHAL]; } };
  const h = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [slow, slow], read, split, budgetMs: 500, now: () => t });
  assert.ok(h.trail.some((x) => /time budget/.test(x.error ?? ""))); assert.ok(h.trail.filter((x) => x.sentencesRead != null).length <= 1);
});

test("a sentence that lacks an anchor never counts, and a hunt that finds nothing says how much it read", T, async () => {
  const other = { title: "Die Hard", passages: [{ section: "Cast", text: "Bruce Willis as John McClane\nBonnie Bedelia as Holly Gennero" }] };
  const h = await huntVoid(voidOf("Who did Mel Gibson play in Lethal Weapon?"), { sources: [source(other)], read, split });
  assert.equal(h.candidates.length, 0); assert.equal(h.gap.kind, "nothing_fills_the_void"); assert.match(h.gap.detail, /sentences read in 1 documents/);
  assert.equal(h.trail[0].title, "Die Hard"); assert.equal(h.trail[0].matched, 0);
});

test("two documents that agree corroborate; a source that fails is on the trail and does not stop the hunt", T, async () => {
  const second = { title: "Richard Donner", passages: [{ section: "Career", text: "Lethal Weapon was directed by Richard Donner and released in 1987." }] };
  const broken = { name: "broken", find: async () => { throw new Error("HTTP 503"); } };
  const h = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [broken, source(LETHAL, second)], read, split });
  assert.equal(h.answer.answer, "Richard Donner"); assert.equal(h.answer.documents, 2); assert.equal(h.answer.corroborated, true);
  assert.ok(h.trail.some((t) => t.source === "broken" && /503/.test(t.error)));
});


// Sentences copied from the real pages, in the shapes Wikipedia leads actually take (a participle with no subject of its own, a parse that
// roots the wrong clause, a capital said as “Its capital … is Paris”). Each was a confidently wrong or empty answer on the live pages.
const LEADS = {
  microsoft: { title: "Microsoft", passages: [{ section: null, text: "Founded in 1975 by Bill Gates and Paul Allen to market BASIC interpreters for the Altair 8800, Microsoft rose to dominate the personal computer operating system market." }, { section: "Founding", text: "In 1972, they founded Traf-O-Data, which sold a rudimentary computer to track and analyze automobile traffic data." }] },
  lincoln: { title: "Abraham Lincoln", passages: [{ section: "Early life", text: "Born in a one-room log cabin in Kentucky on February 12, 1809, Abraham Lincoln was raised on Sinking Spring Farm." }, { section: "Marriage and children", text: "Edward Baker \"Eddie\" Lincoln, born in 1846, died February 1, 1850, probably of tuberculosis." }] },
  ship: { title: "USS Abraham Lincoln (CVN-72)", passages: [{ section: "1990 to 1999", text: "One baby was born onboard Abraham Lincoln during the evacuation." }] },
  france: { title: "France", passages: [{ section: null, text: "Its capital, largest city and main cultural and economic centre is Paris." }, { section: "Antiquity", text: "Lugdunum was the capital of Gaul." }] },
};
test("real lead shapes: co-founders as one answer, the born-in-1809 phrase, never another person's year, never a baby for a date, the capital said as “Its capital is Paris”", T, async () => {
  const ms = await huntVoid(voidOf("Who founded Microsoft?"), { sources: [source(LEADS.microsoft)], read, split });
  assert.deepEqual([...(ms.answer?.set ?? [])].sort(), ["Bill Gates", "Paul Allen"], JSON.stringify(ms.candidates.map((c) => [c.answer, c.tier])));
  const li = await huntVoid(voidOf("When was Abraham Lincoln born?"), { sources: [source(LEADS.lincoln, LEADS.ship)], read, split });
  assert.equal(li.answer?.answer, "February 12 1809", JSON.stringify(li.candidates.map((c) => [c.answer, c.tier]))); assert.ok(li.candidates.every((c) => !c.answer.includes("1846") && !c.answer.includes("baby") && !c.answer.includes("One")));
  const fr = await huntVoid(voidOf("What is the capital of France?"), { sources: [source(LEADS.france)], read, split });
  assert.equal(fr.answer?.answer, "Paris", JSON.stringify(fr.candidates.map((c) => [c.answer, c.tier]))); assert.ok(fr.candidates.every((c) => c.answer !== "Lugdunum"), "the capital of Gaul is not the capital of France");
});


test("“Warsaw, Russian Empire”: a place and what contains it are not two answers; “A and B” are", T, async () => {
  const doc = { title: "Marie Curie", passages: [{ section: null, text: "Curie was born in Warsaw, Russian Empire, where she studied at the clandestine Flying University." }] };
  const h = await huntVoid(voidOf("Where was Marie Curie born?"), { sources: [source(doc)], read, split });
  assert.equal(h.answer?.answer, "Warsaw", JSON.stringify(h.candidates.map((c) => [c.answer, c.tier]))); assert.ok(!h.answer.set || h.answer.set.length === 1);
  assert.ok(h.candidates.every((c) => c.answer !== "Empire" && c.answer !== "Russian Empire"));
});


test("a participle chain shares its agent, a name with a particle is one name, a thing with no name is the anchor, and “The Hobbit” is the page for “Hobbit”", T, async () => {
  const titanic = { title: "Titanic (1997 film)", passages: [{ section: null, text: "Titanic is a 1997 American epic romance and disaster film directed, written, produced, and co-edited by James Cameron." }] };
  const a = await huntVoid(voidOf("Who directed Titanic?"), { sources: [source(titanic)], read, split });
  assert.equal(a.answer?.answer, "James Cameron", JSON.stringify(a.candidates.map((c) => [c.answer, c.tier])));
  const v = voidOf("Where was Leonardo da Vinci born?"); assert.deepEqual(v.anchors.map((x) => x.text), ["Leonardo da Vinci"]);
  const leo = { title: "Leonardo da Vinci", passages: [{ section: "Early life", text: "Leonardo was born on 15 April 1452 in Vinci, in the territory of Florence." }] };
  const b = await huntVoid(v, { sources: [source(leo)], read, split });
  assert.equal(b.answer?.answer, "Vinci", JSON.stringify(b.candidates.map((c) => [c.answer, c.tier])));
  const tel = voidOf("Who invented the telephone?"); assert.equal(tel.ok, true); assert.deepEqual(tel.anchors.map((x) => x.text), ["telephone"]);
  const phone = { title: "Telephone", passages: [{ section: "History", text: "The telephone was invented by Alexander Graham Bell." }] };
  const c = await huntVoid(tel, { sources: [source(phone)], read, split });
  assert.equal(c.answer?.answer, "Alexander Graham Bell", JSON.stringify(c.candidates.map((x) => [x.answer, x.tier])));
  const hob = await huntVoid(voidOf("Who wrote The Hobbit?"), { sources: [source({ title: "The Hobbit", passages: [{ section: null, text: "The Hobbit is a children's fantasy novel written by Tolkien." }] })], read, split });
  assert.equal(hob.answer?.answer, "Tolkien", JSON.stringify(hob.candidates.map((x) => [x.answer, x.tier])));
});


test("the thing asked about is never its own answer, a month is not a person, a mother is not a birthplace, and a date is the date, not the clause around it", T, async () => {
  const song = { title: "Starry Starry Night", passages: [{ section: null, text: "Starry Starry Night was painted by Van Gogh around 18 June." }] };
  const night = { title: "The Starry Night", passages: [{ section: "Painting", text: "The Starry Night was painted by Vincent van Gogh in June 1889." }] };
  const a = await huntVoid(voidOf("Who painted The Starry Night?"), { sources: [source(song, night)], read, split });
  assert.equal(a.answer?.answer, "Vincent van Gogh", JSON.stringify(a.candidates.map((c) => [c.answer, c.tier, c.documents]))); assert.ok(a.candidates.every((c) => !/starry/i.test(c.answer) && c.answer !== "June"));
  const leo = { title: "Leonardo da Vinci", passages: [{ section: "Birth", text: "Leonardo was born out of wedlock to Caterina di Meo Lippi. Leonardo was born in Vinci." }] };
  const b = await huntVoid(voidOf("Where was Leonardo da Vinci born?"), { sources: [source(leo)], read, split });
  assert.equal(b.answer?.answer, "Vinci", JSON.stringify(b.candidates.map((c) => [c.answer, c.tier]))); assert.ok(b.candidates.every((c) => !c.answer.includes("Caterina")));
  const nap = { title: "Napoleon", passages: [{ section: null, text: "Napoleon Bonaparte (15 August 1769 – 5 May 1821) was Emperor of the French. Napoleon was born on 15 August 1769 in Ajaccio, and he moved to mainland France in 1779." }] };
  const c = await huntVoid(voidOf("When was Napoleon born?"), { sources: [source(nap)], read, split });
  assert.ok(c.candidates.some((x) => x.answer === "15 August 1769"), JSON.stringify(c.candidates.map((x) => x.answer))); assert.ok(c.candidates.every((x) => x.answer.split(" ").length <= 4 && !x.answer.includes("1779 and")));
});


// ---- the hunt and its memory in the environment
const trailFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "hunt-trails-")), "t.json");
const countingSource = (docs, extra = {}) => { const calls = { find: 0, page: 0 }; return { calls, name: "Wiki", find: async () => { calls.find++; return docs; }, page: async (title) => { calls.page++; return docs.find((d) => d.title === title) ?? null; }, ...extra }; };

test("a question asked twice is settled the second time from the trail, with one page fetched and no search; and the trail is what made it so", T, async () => {
  const trails = makeTrailStore({ file: trailFile() }), src = countingSource([LETHAL]);
  const a = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [src], read, split, trails });
  assert.equal(a.answer?.answer, "Richard Donner"); assert.equal(a.via, "hunt"); assert.equal(src.calls.find, 1); assert.deepEqual(a.routes, ["Wiki|Lethal Weapon|"]);
  const b = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [src], read, split, trails });
  assert.equal(b.answer?.answer, "Richard Donner"); assert.equal(b.via, "trail"); assert.equal(src.calls.find, 1, "no second search"); assert.equal(src.calls.page, 1, "one page");
  assert.equal(b.answer.evidence[0].sentence, a.answer.evidence[0].sentence, "the sentence is still read, not remembered: the trail says where to look, never what it says");
  // a sequel page that says the same thing is a second route, but the page named for the question's subject is the one the trail goes to first and the one that is cited
  const seq = { title: "Lethal Weapon 2", passages: [{ section: null, text: "Lethal Weapon 2 is a film directed by Richard Donner." }] }, st = makeTrailStore({ file: trailFile() }), both = countingSource([seq, LETHAL]);
  await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [both], read, split, trails: st }); await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [both], read, split, trails: st });
  const third = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [both], read, split, trails: st }); assert.equal(third.answer.evidence[0].title, "Lethal Weapon", "the cited page is the subject's own");
});

test("a remembered page that no longer settles the question is not trusted: the hunt starts afresh, and an alarm makes the trail forget", T, async () => {
  const trails = makeTrailStore({ file: trailFile() });
  const first = countingSource([LETHAL]); await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [first], read, split, trails });
  const changed = { title: "Lethal Weapon", passages: [{ section: null, text: "Lethal Weapon is a film." }] }, again = countingSource([changed, { title: "Lethal Weapon 2", passages: [{ section: null, text: "Lethal Weapon 2 was directed by Richard Donner." }] }]);
  const r = await huntVoid(voidOf("Who directed Lethal Weapon?"), { sources: [again], read, split, trails });
  assert.equal(r.via, "hunt"); assert.equal(again.calls.page, 1, "the remembered page was tried first"); assert.equal(again.calls.find, 1, "and then the search was done");
  const head = r.head; for (const x of r.routes) trails.veto(head, x); const before = trails.known(head);
  assert.ok(!before.some((x) => r.routes.includes(x)), "an alarm on a route makes what it had deposited count for nothing");
});

test("the throttle is shared: one refusal is left as a mark, and a second source on the same environment sends nothing while it holds", async () => {
  const file = trailFile(); let t = 1_000_000, sent = 0;
  const refuse = async () => { sent++; throw Object.assign(new Error("rate limited (HTTP 429, retry-after 30s)"), { retryAfterMs: 30000 }); };
  const A = wikipediaSource({ getJson: refuse, trails: makeTrailStore({ file, now: () => t }), now: () => t, maxWait: 1000 }), B = wikipediaSource({ getJson: refuse, trails: makeTrailStore({ file, now: () => t }), now: () => t, maxWait: 1000 });
  await assert.rejects(() => A.page("X"), /rate limited/); assert.equal(sent, 1);
  await assert.rejects(() => B.page("X"), /shared mark/); assert.equal(sent, 1, "the other session did not ask");
  t += 31000; await assert.rejects(() => B.page("X"), /rate limited/); assert.equal(sent, 2, "after the mark lapses it asks again");
});

test("Wikipedia's own furniture (references, external links) is dropped from a page, and the sections keep their names", () => {
  const ps = passagesOfWikipediaText("Lead sentence.\n\n== Cast ==\nA as B\n\n== References ==\nSomething cited\n\n== External links ==\nhttp://x\n");
  assert.deepEqual(ps.map((p) => p.section), [null, "Cast"]);
});

test("the Wikipedia source fetches whole pages: a page named for an anchor first, and every page's full text", async () => {
  const calls = [];
  const getJson = async (url) => { calls.push(url); if (url.includes("list=search")) return { query: { search: [{ title: "Lethal Weapon 4" }, { title: "Lethal Weapon" }] } }; return { query: { pages: { 1: { title: url.includes("Lethal+Weapon+4") ? "Lethal Weapon 4" : "Lethal Weapon", extract: "Lead.\n\n== Cast ==\nMel Gibson as Martin Riggs" } } } }; };
  const docs = await wikipediaSource({ getJson, documents: 2 }).find({ anchors: [{ text: "Lethal Weapon" }], relation: { lemma: "direct" } });
  assert.equal(docs[0].title, "Lethal Weapon", "a title equal to an anchor comes first");
  assert.ok(calls.some((u) => u.includes("explaintext=1") && !u.includes("exintro")), "the whole text, not the intro");
  assert.deepEqual(docs[0].passages.map((p) => p.section), [null, "Cast"]);
});

test("live: the real article, the real Cast section (HUNT_LIVE=1)", { skip: !read || process.env.HUNT_LIVE !== "1" }, async () => {
  const h = await huntVoid(voidOf("Who did Mel Gibson play in Lethal Weapon?"), { sources: [wikipediaSource()], read, split });
  console.log(JSON.stringify({ answer: h.answer?.answer, candidates: h.candidates.slice(0, 5).map((c) => [c.answer, c.tier, c.support, c.documents]), trail: h.trail, gap: h.gap }, null, 1));
  assert.ok(h.candidates.length > 0);
});

test("the relation stand-in: when the exact verb finds nothing the hunt is run again under the near verbs of the sentences that carry the anchors, and a near verb stands in only if every near verb that answers gives the same answer", T, async () => {
  const v = voidOf("Who founded the Mongol Empire?"), one = { title: "Mongol Empire", passages: [{ section: null, text: "Genghis Khan established the Mongol Empire in 1206." }] };
  const eqOf = (list) => async (lemma, pool) => list.filter((x) => pool.includes(x.verb)), near = (verb, similarity = 0.9, near_miss = false) => ({ verb, similarity, near_miss });
  const exact = await huntVoid(v, { sources: [source(one)], read, split }); assert.equal(exact.answer, null, "the exact verb finds no sentence that says 'found': the name stands next to the anchor, a lead and never an answer");
  const h = await huntVoid(v, { sources: [source(one)], read, split, equivalents: eqOf([near("establish")]) });
  assert.equal(h.answer?.answer, "Genghis Khan"); assert.equal(h.readAs, "establish"); const st = h.trail.find((t) => t.step === "relation_stand_in"); assert.equal(st.verdict, "same"); assert.equal(st.asked, "found"); assert.deepEqual(st.agreed, ["establish"]);
  // two near verbs, two different people: none is picked and both are listed
  const two = { title: "Mongol Empire", passages: [{ section: null, text: "Genghis Khan established the Mongol Empire in 1206. Marco Polo created the Mongol Empire in a book." }] };
  const o = await huntVoid(v, { sources: [source(two)], read, split, equivalents: eqOf([near("establish"), near("create", 0.88)]) });
  assert.equal(o.answer, null); assert.equal(o.gap.kind, "several_fill_the_void"); assert.equal(o.trail.find((t) => t.step === "relation_stand_in").verdict, "other");
  // an answer the exact verb found is never replaced by a near verb's
  const exactDoc = { title: "Mongol Empire", passages: [{ section: null, text: "Temujin founded the Mongol Empire." }] }, kept = await huntVoid(v, { sources: [source(exactDoc)], read, split, equivalents: eqOf([near("establish")]) });
  assert.equal(kept.answer?.answer, "Temujin"); assert.ok(!kept.trail.some((t) => t.step === "relation_stand_in"));
  // no equivalents given, or none near: the gap is what it was
  assert.equal((await huntVoid(v, { sources: [source(one)], read, split, equivalents: eqOf([]) })).answer, null);
  const broken = await huntVoid(v, { sources: [source(one)], read, split, equivalents: async () => { throw new Error("no embedder"); } }); assert.equal(broken.answer, null); assert.equal(broken.trail.find((t) => t.step === "relation_stand_in").gap.kind, "equivalents_unavailable");
});

test("identity: “Who is X?” is answered by what the sentences say X is (a predicate noun, an apposition, a title before the name), said together with each sentence; a name beside X is not an answer, and “Hans Albert Einstein” is not Albert Einstein", T, async () => {
  const ask = async (q, text) => { const h = await huntVoid(voidOf(q), { sources: [source({ title: "t", passages: [{ section: null, text }] })], read, split }); return h; };
  const pol = await ask("Who is Polonius?", "Polonius was the Lord Chamberlain of Denmark. Polonius is the father of Ophelia and Laertes. Polonius was the father of Ophelia and Laertes. Hamlet killed Polonius.");
  assert.equal(pol.answer.answerText, "the father of Ophelia and Laertes", "a predicate whose head is a capitalised noun (“the Lord Chamberlain”) is an office or a name, and cannot be told from one: it is not taken; precision before recall"); assert.ok(pol.candidates.every((c) => c.tier === "identity")); assert.equal(pol.candidates[0].evidence[0].sentence.slice(0, 8), "Polonius");
  assert.equal((await ask("Who is Jonathan Harker?", "Jonathan Harker is a young solicitor. Jonathan Harker was a young solicitor. Mina loves Jonathan Harker.")).answer.answerText, "a young solicitor");
  assert.equal((await ask("Who is Van Helsing?", "I have written to my old friend and master, Professor Van Helsing, of Amsterdam. Professor Van Helsing arrived at noon.")).answer.answerText, "Professor", "a title the parser marks as a descriptor does not stop the name being the anchor");
  assert.equal((await ask("Who is Albert Einstein?", "Hans Albert Einstein was an engineer. Albert Einstein was a physicist. Albert Einstein is a physicist.")).answer.answerText, "a physicist");
  const none = await ask("Who is Harker?", "Jonathan Harker arrived. Mina Harker wrote a letter."); assert.equal(none.answer, null); assert.equal(none.gap.kind, "nothing_fills_the_void", "a first name before the surname is part of the name, not a description");
});

test("identity, what it must not say (the failures of the first run on real text): a description of something INSIDE the subject, a relative clause or verbs under the noun, a sentence in capitals", T, async () => {
  const ask = async (q, text) => huntVoid(voidOf(q), { sources: [source({ title: "t", passages: [{ section: null, text }] })], read, split });
  const a = await ask("Who is Aristotle?", "Aristotle's works are not well-established. In general, the chronology of Aristotle is not well-established."); assert.equal(a.answer, null, "'not well-established' is said of his works and his chronology, not of him");
  const b = await ask("Who is Polonius?", "POLONIUS IS A LORD. Polonius dies and have done but greenly in hugger-mugger."); assert.equal(b.answer, null, "a sentence in capitals is a heading or a label; a verb phrase is not a description");
});

test("identity needs corroboration: a description said by one sentence is a lead and not an answer; the same description in two different sentences is an answer (the same sentence twice is one)", T, async () => {
  const ask = async (q, text) => huntVoid(voidOf(q), { sources: [source({ title: "t", passages: [{ section: null, text }] })], read, split });
  const once = await ask("Who is Jonathan Harker?", "Jonathan Harker is a young solicitor. Mina loves Jonathan Harker."); assert.equal(once.answer, null); assert.equal(once.gap.kind, "uncorroborated"); assert.match(once.gap.detail, /a young solicitor/); assert.equal(once.lead.answer, "a young solicitor");
  const same = await ask("Who is Jonathan Harker?", "Jonathan Harker is a young solicitor. Jonathan Harker is a young solicitor."); assert.equal(same.answer, null, "the same sentence twice is one sentence");
  const twice = await ask("Who is Jonathan Harker?", "Jonathan Harker is a young solicitor. Jonathan Harker was a young solicitor."); assert.equal(twice.answer.answerText, "a young solicitor"); assert.equal(twice.candidates[0].sentences, 2);
});
