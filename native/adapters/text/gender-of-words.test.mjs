// gender-of-words.test.mjs — the order of evidence (a title that precedes a name, then the name's dictionary sense, then an optional snapshot), the surname guard, and what stays open.
// A small table stands in for the dictionary-built one, so the tests do not depend on a build; the last test reads the real table if it has been built.
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs";
import { makeNameGenderPrior, makeDefaultNameGenderPrior, loadNameGenderDictionary, reliabilityOf, pronounsFor, readCorrections, SNAPSHOT_FILE } from "./gender-of-words.js";
const dict = { schema: "NameGenderDictionary@1", provenance: { measured: { dev: { title: [14, 13], dictionary: [29, 28], wikidata: [26, 23] }, fresh: { title: [12, 10], dictionary: [15, 13], wikidata: [19, 15] } } },
  words: { natasha: [0, 2], pierre: [2, 0], dana: [0, 2], lucas: [2, 0], laurie: [2, 2], tom: [2, 0], mary: [0, 2], john: [2, 0] }, titles: { mrs: "f", miss: "f", mr: "m", madame: "f", aunt: "f", uncle: "m", holmes: "m" } };
const P = makeNameGenderPrior({ dictionary: dict });
const g = (...w) => P.explain(w);
test("the name looked up: a female given name, a male one", () => {
  assert.equal(g("Natasha").gender, "f"); assert.equal(g("Natasha").source, "name");
  assert.equal(g("Pierre").gender, "m"); assert.equal(g("Natasha", "Rostova").gender, "f");
});
test("a title that precedes a name gives it away, and outweighs the surname's given-name sense", () => {
  assert.deepEqual([g("Mrs.", "Bennet").gender, g("Mrs.", "Bennet").source], ["f", "title"]);
  assert.equal(g("Miss", "Lucas").gender, "f", "Lucas is a man's given name, but after Miss it is a surname");
  assert.equal(g("Mr.", "Darcy").gender, "m"); assert.equal(g("Madame", "Defarge").gender, "f"); assert.equal(g("Aunt", "March").gender, "f"); assert.equal(g("Uncle", "Tom").gender, "m");
});
test("a title that is the last word says nothing (a surname that is also a title word)", () => {
  assert.equal(g("Sherlock", "Holmes").gender, null);   // Holmes is a title word in the table, last here, and Sherlock has no sense: open
});
test("both kinds of sense, no sense, or disagreeing titles stay open and say why", () => {
  assert.equal(g("Laurie").gender, null); assert.match(g("Laurie").open, /both a man's and a woman's/);
  assert.equal(g("Jonathan").gender, null); assert.match(g("Jonathan").open, /nothing in the words says/);
  assert.equal(g("Mr.", "Mrs.", "Smith").gender, null); assert.match(g("Mr.", "Mrs.", "Smith").open, /titles disagree/);
});
test("every answer carries where it came from and how often that source has been right", () => {
  const e = g("Natasha"); assert.equal(e.reliability.right, 41); assert.equal(e.reliability.of, 44); assert.match(e.reliability.text, /right 93% \(41 of 44\) on held-out novels/);
  assert.equal(reliabilityOf(dict, "title").of, 26);
});
test("a missing table is said, not skipped; a non-person gets no gender", () => {
  const none = makeNameGenderPrior({ dictionary: null }); assert.equal(none.missing, true); assert.equal(none.explain(["Natasha"]).open, "no table of given names");
  const city = makeNameGenderPrior({ dictionary: dict, isPerson: (ws) => ws[0] !== "Paris" }); assert.equal(city.explain(["Paris"]).open, "not a person");
});
test("the snapshot speaks only where the table is silent, and only with a single answer", () => {
  const ids = { male: "M", female: "F", unisex: "U" }, snap = { get: (w) => ({ Wilhelmina: { exact: [{ p31: ["F"] }] }, Alex: { exact: [{ p31: ["M", "F"] }] }, Sam: { exact: [{ p31: ["U"] }] } })[w] };
  const S = makeNameGenderPrior({ dictionary: dict, snapshot: snap, snapshotIds: ids });
  assert.deepEqual([S.explain(["Wilhelmina"]).gender, S.explain(["Wilhelmina"]).source], ["f", "snapshot"]);
  assert.equal(S.explain(["Alex"]).gender, null); assert.equal(S.explain(["Sam"]).gender, null); assert.equal(S.explain(["Natasha"]).source, "name", "the table is stronger than the snapshot");
});
test("the words the system uses for a person: he/she when decided, singular they when not sure", () => {
  assert.deepEqual([pronounsFor("m").nom, pronounsFor("m").acc, pronounsFor("m").poss, pronounsFor("m").decided], ["he", "him", "his", true]);
  assert.deepEqual([pronounsFor("f").nom, pronounsFor("f").acc, pronounsFor("f").poss, pronounsFor("f").decided], ["she", "her", "her", true]);
  for (const unsure of [null, undefined, "x", "n", "", "both"]) { const p = pronounsFor(unsure); assert.deepEqual([p.cls, p.nom, p.acc, p.poss, p.refl, p.decided], ["x", "they", "them", "their", "themself", false], String(unsure)); }
  assert.deepEqual([pronounsFor(null).is, pronounsFor(null).was, pronounsFor("f").is, pronounsFor("f").was], ["are", "were", "is", "was"], "singular they takes the plural verb");
  // the prior's own answer feeds it: an open name gets they, a title or a given name does not
  assert.equal(pronounsFor(g("Laurie").gender).nom, "they"); assert.equal(pronounsFor(g("Jonathan").gender).nom, "they");
  assert.equal(pronounsFor(g("Mrs.", "Bennet").gender).nom, "she"); assert.equal(pronounsFor(g("Pierre").gender).nom, "he");
  assert.equal(pronounsFor(makeNameGenderPrior({ dictionary: null }).genderOf(["Natasha"])).nom, "they", "a missing table is unsure, so they");
  assert.equal(pronounsFor("f", { language: "fr" }), null, "another language is a typed gap, not English by default");
});
test("what the user told outranks every other source, is read in log order, and a later entry or a retraction replaces it", () => {
  const e = (key, cls, said, at) => ({ kind: "correction", at, body: { key, class: cls, said, thread: "t" } });
  const log = [e("casey", "f", "she is Casey", "2026-11-24T06:00:00Z"), e("natasha", "m", "Natasha is a man", "2026-11-24T06:01:00Z"), { kind: "utterance", body: {} }, e("casey", "m", "no, he", "2026-11-24T06:02:00Z"), e("jordan", "x", "they means Jordan", "2026-11-24T06:03:00Z"), e("pierre", "f", "x", "2026-11-24T06:04:00Z"), e("pierre", null, "never mind", "2026-11-24T06:05:00Z")];
  const C = readCorrections(log); assert.equal(C.get("casey").class, "m", "the latest for a name wins"); assert.equal(C.has("pierre"), false, "a null class retracts"); assert.equal(C.size, 3);
  const T = makeNameGenderPrior({ dictionary: dict, corrections: C });
  const n = T.explain(["Natasha"]); assert.deepEqual([n.gender, n.class, n.source], ["m", "m", "told"], "the user's word outranks the dictionary's given-name sense"); assert.match(n.reliability.text, /you told me on 2026-11-24: “Natasha is a man”/);
  assert.equal(T.explain(["Pierre"]).gender, "m", "retracted: back to the dictionary"); assert.equal(T.explain(["Pierre"]).source, "name");
  assert.equal(T.explain(["Mrs.", "Casey"]).gender, "m", "told, by the first word that is not a title, beats the title"); assert.equal(T.explain(["Mrs.", "Casey"]).source, "told");
  const j = T.explain(["Jordan"]); assert.deepEqual([j.gender, j.class, j.source, j.pronouns.nom, j.pronouns.decided], [null, "x", "told", "they", true], "told 'they': voiced they, decided, not the default"); assert.equal(T.genderOf(["Jordan"]), null, "he/she consumers still see no he/she"); assert.equal(T.classOf(["Jordan"]), "x");
  assert.deepEqual([T.explain(["Laurie"]).class, T.explain(["Laurie"]).pronouns.nom, T.explain(["Laurie"]).pronouns.decided], [null, "they", false], "unsure and untold: the they default, not decided");
  assert.equal(makeNameGenderPrior({ dictionary: null, corrections: C }).explain(["Casey"]).gender, "m", "told works with no table");
});
const real = loadNameGenderDictionary();
test("the table built from the dictionary (skipped if it has not been built)", { skip: real ? false : "run scripts/build-name-gender-dictionary.mjs" }, () => {
  const R = makeNameGenderPrior({ dictionary: real });
  for (const [w, want] of [[["Natasha"], "f"], [["Pierre"], "m"], [["Mary"], "f"], [["John"], "m"], [["Dana"], "f"], [["Mrs.", "Bennet"], "f"], [["Mr.", "Darcy"], "m"], [["Miss", "Lucas"], "f"]]) assert.equal(R.genderOf(w), want, w.join(" "));
  assert.equal(R.genderOf(["Jonathan"]), null, "the dictionary has no given-name sense for Jonathan: open, not guessed");
  assert.equal(real.provenance.license, "CC BY-SA 4.0"); assert.ok(real.provenance.sha256 && real.provenance.measured.dev);
});

test("the default prior adds the Wikidata snapshot as the third layer, and says how reliable it is there (skipped without the table or the snapshot)", { skip: real && fs.existsSync(SNAPSHOT_FILE) ? false : "needs the built table and identity/givers/wikidata-given-names-en.json" }, () => {
  const j = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8")), M = new Set(j.male), F = new Set(j.female), U = new Set(j.unisex);
  const only = j.female.find((w) => /^\p{Lu}[a-z]+$/u.test(w) && !M.has(w) && !U.has(w) && !real.words[w.toLowerCase()] && !real.titles[w.toLowerCase()]);   // regex-ok: a plain capitalised label in a test
  const D = makeDefaultNameGenderPrior(), e = D.explain([only]);
  assert.equal(D.missing, false); assert.deepEqual([e.gender, e.source], ["f", "snapshot"], `${only} is in the snapshot only`);
  assert.match(e.reliability.text, /where the other sources are silent/); assert.equal(D.explain(["Natasha"]).source, "name", "the table is stronger than the snapshot"); assert.equal(D.explain(["Mrs.", "Bennet"]).source, "title");
});
