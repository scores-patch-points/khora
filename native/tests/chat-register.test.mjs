// Mechanics 3 and 5 of the chat reader (eval/chat-register/PLAN.md): names typed without capitals (recase.mjs) and which language a message is in (language-gate.mjs, reading.js::readerFor).
// The gate's rules are tested with a stub identifier so they hold with no priors on the machine; the integration tests need the janus priors and skip without them.
import test from "node:test"; import assert from "node:assert/strict";
import { languageOf, LATIN_MARGIN_FLOOR, VOCABULARY_FLOOR, MIN_WORDS, ANCHOR_COUNT } from "../adapters/text/language-gate.mjs";
import { recaseEnglish, markRecased } from "../adapters/text/recase.mjs";
import { availableStems } from "../the-fold/langid.mjs";

// ── the gate, with a stub identifier ────────────────────────────────────────────────────────────
const latin = (language, margin, extra = {}) => ({ language, confident: true, script: "Latin", margin, hits: 1, ...extra });
const gate = (text, { first, duel = { language: null, confident: false }, english = {}, own = {}, thread = null } = {}) => {
  const calls = [];
  const r = languageOf(text, { thread, identify: (t, o) => { calls.push(o?.stems ?? null); return o?.stems ? duel : first; }, countOf: (w) => english[w] ?? 0, knownIn: (w, stem) => (own[stem]?.[w] ?? (own[stem] ? 0 : null)) });
  return { ...r, calls };
};
test("a script that decides the language stands without a duel, a margin or a vocabulary check", () => {
  const r = gate("Мы вчера были в парке", { first: { language: "rus", confident: true, script: "Cyrillic", margin: 0 } });
  assert.equal(r.language, "rus"); assert.equal(r.evidence, "detector"); assert.deepEqual(r.calls, [null], "only the one identify call");
});
test("English beating the candidate head to head is English, whatever the margin said", () => {
  const r = gate("Hope u r bak frm baba", { first: latin("mlt", 12.5, { hits: 0 }), duel: { language: "eng", confident: true, margin: 9 } });
  assert.equal(r.language, "eng"); assert.deepEqual(r.calls[1], ["eng", "mlt"]);
});
test("a Latin-script answer stands only with two words, the margin floor and the candidate's own vocabulary", () => {
  const own = { fra: { je: 5, suis: 3, allé: 1, au: 2 } }, text = "je suis allé au marché";
  assert.equal(gate(text, { first: latin("fra", 30), own }).language, "fra", "the measured answer stands");
  const low = gate(text, { first: latin("fra", LATIN_MARGIN_FLOOR - 1), own });
  assert.equal(low.language, null); assert.equal(low.candidate, "fra"); assert.match(low.detail, /margin/);
  const noWords = gate("kal milte hai yaar", { first: latin("ind", 30), own: { ind: { hai: 1 } } });
  assert.equal(noWords.language, null, "romanised Hindi that the Indonesian lexicon barely knows is not read as Indonesian"); assert.equal(noWords.candidate, "ind"); assert.match(noWords.detail, /known to the ind prior/);
  const one = gate("Der", { first: latin("deu", 15.3), own: { deu: { der: 9 } } });
  assert.equal(one.language, null); assert.equal(one.candidate, "deu"); assert.ok(MIN_WORDS >= 2); assert.match(one.detail, /readable word/);
});
test("a candidate with no lexicon to check its words against does not stand: a typed gap, not a pass", () => {
  const r = gate("je suis allé", { first: latin("fra", 30), own: {} });
  assert.equal(r.language, null); assert.match(r.detail, /no fra lexicon/);
});
test("the thread's own language stands on a thin answer, and is the answer when nothing in the message can be read", () => {
  assert.equal(gate("ok", { first: latin("deu", 3), thread: "deu" }).evidence, "thread");
  const r = gate("??", { first: { language: null, confident: false, script: "Other", gap: "no letters" }, thread: "spa" });
  assert.equal(r.language, "spa"); assert.equal(r.evidence, "thread");
  const none = gate("??", { first: { language: null, confident: false, script: "Other", gap: "no letters" } });
  assert.equal(none.language, null); assert.equal(none.evidence, "none", "no thread and nothing to read is a gap, never English");
});
test("where the identifier did not decide, English must be a strict majority of the words with one anchor, else a typed gap (never English by default)", () => {
  const first = { language: null, confident: false, script: "Latin", gap: "no candidate clearly wins" };
  const en = { ok: ANCHOR_COUNT + 50, thanks: ANCHOR_COUNT + 5, man: ANCHOR_COUNT + 5 };
  assert.deepEqual([gate("ok thanks man", { first, english: en }).language, gate("ok thanks man", { first, english: en }).evidence], ["eng", "english-words"]);
  assert.equal(gate("kal milte hai yaar", { first, english: { hai: 2 } }).language, null, "foreign words the prior met once or twice are no anchor");
  assert.equal(gate("dei where", { first, english: { where: 300 } }).language, null, "one known word of two is not a majority");
  const surname = gate("Madame Defarge wrote a letter.", { first, english: { wrote: 80, letter: 60 } });
  assert.equal(surname.language, "eng", "a capitalised mid-sentence word the English prior does not know is a name, and a name tells nothing about the language (found by a peer session, 2026-11-23)");
  assert.equal(gate("Mikrofonu at.", { first, english: { at: 300 } }).language, null, "a capital that starts a sentence is no evidence of a name: it counts as an unknown word");
  assert.equal(gate("HAHA OMG JY", { first, english: { omg: 12 } }).language, null, "words in capitals are not names either");
  const nameOnly = languageOf("pierre loves natasha", { identify: () => first, countOf: (w) => ({ loves: 40 })[w] ?? 0, isName: (w) => w === "pierre" || w === "natasha" });
  assert.equal(nameOnly.language, "eng", "names are set aside, so one known word of one readable word is English");
});

// ── the recaser ─────────────────────────────────────────────────────────────────────────────────
test("recase: the treebank's own casing, counted: i, a country, a day, a given name", () => {
  const r = recaseEnglish("i went to france on monday with john");
  assert.equal(r.text, "I went to France on Monday with John");
  assert.deepEqual(new Set(r.changes.map((c) => c.by)), new Set(["treebank-casing"]));
});
test("recase: a name the writer capitalised once is that name wherever it recurs lowercase (the notebook), never a word the writer already cased", () => {
  const r = recaseEnglish("Pierre met Natasha. later pierre kissed natasha");
  assert.equal(r.text, "Pierre met Natasha. later pierre kissed Natasha", "the first word's casing is positional, so only the non-initial Natasha enters the notebook");
  assert.equal(r.changes.find((c) => c.typed === "natasha").by, "notebook");
  assert.equal(recaseEnglish("natasha loves pierre", { known: ["Natasha"] }).text, "Natasha loves pierre", "the thread's notebook");
  assert.equal(recaseEnglish("Pierre loves Natasha").changes.length, 0);
});
test("recase: a name only the giver knows is NOMINATED, not recased; a greeting, a split word and a lowercase chat word are left as typed", () => {
  const r = recaseEnglish("pierre loves natasha");
  assert.equal(r.text, "pierre loves natasha"); assert.deepEqual(r.candidates.map((c) => c.typed).sort(), ["natasha", "pierre"]);
  assert.equal(recaseEnglish("lol hi").text, "lol hi", "a two-letter token is never a name (the named valve)");
  assert.equal(recaseEnglish("mark the notebook").text, "mark the notebook", "where the shelf is split the sentence decides, not the shelf");
});
test("recase: text that is capitalised keeps its lowercase words: the shelves are for text typed WITHOUT capitals (a peer found formal prose recased: 'opera' to 'Opera')", () => {
  for (const t of ["The Magic Flute is an opera in two acts by Wolfgang Amadeus Mozart to a German libretto by Emanuel Schikaneder.", "Many people love opera.", "The states of the soul are many.", "Hi john, how r u", "Alice and bob went home."]) assert.equal(recaseEnglish(t).changes.length, 0, t);
  assert.equal(recaseEnglish("I went to france on monday").text, "I went to France on Monday", "the pronoun I is not a capitalising habit");
  assert.equal(recaseEnglish("Pierre met Natasha, then pierre kissed natasha").text, "Pierre met Natasha, then pierre kissed Natasha", "the notebook is the text's own evidence and always applies");
});
test("recase: a lowercase word inside a noun phrase is its head, not a name (a peer: 'Captain Salt, a weathered pirate captain' lost its appositive)", () => {
  const pos = { a: "DET", the: "DET", loves: "VERB", kissed: "VERB", dear: "ADJ", with: "ADP", and: "CCONJ", to: "ADP" };    // a stub of the POS prior: unknown words are null
  const re = (t) => recaseEnglish(t, { posOf: (w) => pos[w] ?? null });
  assert.equal(re("You are Captain Salt, a weathered pirate captain.").changes.length, 0, "the second captain stays a common noun: a determiner stands before it");
  assert.equal(re("Captain Salt sailed. the old captain waved.").text, "Captain Salt sailed. the old captain waved.");
  assert.equal(re("Mark met Natasha. later pierre kissed natasha").text, "Mark met Natasha. later pierre kissed Natasha", "behind a verb the notebook still applies");
  assert.equal(re("Then Natasha came. dear natasha, to natasha, with natasha and natasha").text, "Then Natasha came. dear Natasha, to Natasha, with Natasha and Natasha", "an adjective, a preposition, a comma or a conjunction ends the phrase: a name may follow");
  const r = re("Salt met Captain Salt, then kissed salt"), rows = [{ form: "Salt" }, { form: "met" }, { form: "Captain" }, { form: "Salt" }, { form: "then" }, { form: "kissed" }, { form: "Salt" }];
  const marked = markRecased(rows, r.changes, r.candidates);
  assert.deepEqual(marked.map((x) => x.recased?.by ?? null), [null, null, null, null, null, null, "notebook"], "the mark lands on the changed row, not on the first row that wears the same form");
});
test("recase: markRecased writes what was done on the rows, so a later read can overturn it", () => {
  const r = recaseEnglish("i went to france"), rows = [{ form: "I" }, { form: "went" }, { form: "to" }, { form: "France" }];
  const marked = markRecased(rows, r.changes, r.candidates);
  assert.deepEqual(marked[3].recased, { typed: "france", by: "treebank-casing" }); assert.equal(marked[1].recased, undefined);
  const c = markRecased([{ form: "pierre" }], [], [{ typed: "pierre", cased: "Pierre", by: "given-name-giver", attested: false }]);
  assert.deepEqual(c[0].nameCandidate, { cased: "Pierre", by: "given-name-giver", attested: false });
});

// ── readerFor, the door: the janus priors are needed ────────────────────────────────────────────
// the stand-in priors home (~/Downloads/workspace/janus/priors, 18 files) is a home too, but it holds no language identifier: the integration tests need janus' own priors (KHORA_PRIORS_DIR=~/Documents/janus/priors)
const HAVE = ["eng", "fra", "rus"].every((s) => availableStems().includes(s));
test("readerFor: English is read, a language with a codec is read as itself, and a language with none is a typed gap that says so", { skip: !HAVE }, async () => {
  const { readerFor } = await import("../reading.js");
  const en = await readerFor("pierre loves natasha"); assert.equal(en.language, "eng"); assert.equal(en.gap, null); assert.ok(en.rows.length >= 3);
  const fr = await readerFor("Je suis allé au marché ce matin"); assert.equal(fr.language, "fra"); assert.equal(fr.gap, null); assert.ok(fr.rows.length > 0);
  const ru = await readerFor("Мы вчера были в парке"); assert.equal(ru.language, "rus"); assert.deepEqual(ru.rows, []); assert.equal(ru.gap.gap, "no_codec"); assert.equal(ru.gap.language, "rus"); assert.equal(ru.gap.evidence, "detector", "the identifier decided it, by script");
  const th = await readerFor("สวัสดีครับ วันนี้เป็นอย่างไรบ้าง"); assert.equal(th.language, null); assert.deepEqual(th.rows, []); assert.equal(th.gap.gap, "no_language"); assert.equal(th.gap.language, null); assert.equal(th.gap.evidence, "script", "a script no prior holds: the gap says the script, not a language");
});
test("readerFor: romanised Hindi is never read as English: no rows and a typed gap (no_language: it is none the identifier holds); the English recaser never sees it", { skip: !HAVE }, async () => {
  const { readerFor } = await import("../reading.js");
  for (const t of ["kal milte hai yaar", "yaar kya kar raha hai tu", "mujhe pata nahi"]) { const r = await readerFor(t); assert.notEqual(r.language, "eng", t); assert.deepEqual(r.rows, [], t); assert.equal(r.gap.gap, "no_language", t); }
});
test("readerFor: a lowercase English chat line is read as English, with its names nominated, not invented", { skip: !HAVE }, async () => {
  const { readerFor } = await import("../reading.js");
  const r = await readerFor("lol ok thanks man");
  assert.equal(r.language, "eng"); assert.equal(r.gap, null); assert.ok(r.rows.length > 0);
});
