// referents-in-order.test.mjs — the cast read in order off the trees: one name, one being; a title never identifies.
import test from "node:test"; import assert from "node:assert/strict";
import { referentsInOrder, mergeBy } from "./referents-in-order.mjs";
const R = (id, form, upos, head, deprel, feats = "_") => ({ id, form, lemma: form, upos, head, deprel, feats });
const name = (order, words, verb = "spoke") => ({ order, rows: [...words.map((w, i) => R(i + 1, w, "PROPN", i ? 1 : words.length + 1, i ? "flat" : "nsubj")), R(words.length + 1, verb, "VERB", 0, "root")] });
const TITLES = new Set(["prince", "countess", "princess"]);
const read = (...s) => referentsInOrder(s, { commonNoun: (t) => TITLES.has(t) });
test("a short form joins the one being that holds it; an extension joins the name it extends", () => {
  const r = read(name(0, ["Anna", "Pávlovna"]), name(1, ["Anna", "Pávlovna", "Schérer"]), name(2, ["Anna"]));
  assert.equal(r.referents.length, 1); assert.deepEqual(r.referents[0].forms.map((f) => f[0]).sort(), ["Anna", "Anna Pávlovna", "Anna Pávlovna Schérer"]);
});
test("two full names that only share a part are two beings; the shared short form goes to the one read last, contested", () => {
  const r = read(name(0, ["Anna", "Pávlovna"]), name(1, ["Anna", "Mikháylovna"]), name(2, ["Anna"]));
  assert.equal(r.referents.length, 2); assert.equal(r.mentionOf["2.1"], r.referents[1].ref); assert.equal(r.contested, 1);
});
test("a title never identifies: Prince Andrew is not Prince Vasíli; a title alone is the last being that carried it", () => {
  const r = read(name(0, ["Prince", "Vasíli"]), name(1, ["Prince", "Andrew"]), name(2, ["Prince"]), name(3, ["Andrew"]));
  assert.equal(r.referents.length, 2); assert.equal(r.mentionOf["2.1"], r.referents[1].ref); assert.equal(r.mentionOf["3.1"], r.referents[1].ref);
});
test("each being gathers the pro-forms its own clauses bind to it, and its pro-form is decided per being", () => {
  const s = { order: 0, rows: [R(1, "Natásha", "PROPN", 2, "nsubj"), R(2, "raised", "VERB", 0, "root"), R(3, "her", "PRON", 4, "nmod:poss", "Gender=Fem|Number=Sing|Person=3|PronType=Prs"), R(4, "head", "NOUN", 2, "obj")] };
  const r = read(s, s, s, s, s, s);
  assert.deepEqual(r.referents[0].proformForms, [["her", 6]]); assert.equal(r.mentionOf["0.3"], r.referents[0].ref, "the bound pro-form points at the same node"); assert.equal(r.referents[0].proform.cls, "f"); assert.equal(r.referents[0].proform.contested, false);
});
test("names side by side are not a third name and never bridge two beings", () => {
  const r = read(name(0, ["Sónya"]), name(1, ["Natásha"]), name(2, ["Sónya", "Natásha"]), name(3, ["Natásha"]), name(4, ["Sónya"]));
  assert.equal(r.referents.length, 2); assert.equal(r.mentionOf["3.1"], r.referents[1].ref); assert.equal(r.mentionOf["4.1"], r.referents[0].ref);
});
test("titles come from the text's own lower-case common nouns (the ground), so a title never joins two names", () => {
  const noun = (order, w) => ({ order, rows: [R(1, "the", "DET", 2, "det"), R(2, w, "NOUN", 3, "nsubj"), R(3, "came", "VERB", 0, "root")] });
  const r = referentsInOrder([name(0, ["Prince", "Vasíli"]), name(1, ["Prince"]), name(2, ["Prince", "Andrew"]), noun(3, "prince"), noun(4, "prince"), name(5, ["Andrew"]), name(6, ["Prince"])]);
  assert.equal(r.referents.filter((x) => x.kind === "name").length, 2); assert.equal(r.mentionOf["1.1"], r.referents[0].ref); assert.equal(r.mentionOf["5.1"], r.referents[1].ref); assert.equal(r.mentionOf["6.1"], r.referents[1].ref);
  assert.deepEqual(r.titles, ["prince"]);
});
test("names side by side are split, each word to its own being, even when the second name arrives later", () => {
  const r = read(name(0, ["Natásha"]), name(1, ["Mary"]), name(2, ["Natásha", "Mary"]), name(3, ["Mary"]));
  assert.equal(r.referents.length, 2); assert.equal(r.mentionOf["2.1"], r.referents[0].ref); assert.equal(r.mentionOf["2.2"], r.referents[1].ref); assert.equal(r.mentionOf["3.1"], r.referents[1].ref);
});
test("a short form never lets a different full name in", () => {
  const r = read(name(0, ["Anna", "Pávlovna"]), name(1, ["Anna"]), name(2, ["Anna", "Mikháylovna"]));
  assert.equal(r.referents.length, 2);
});
test("a short form goes, without doubt, to the one being already called by it alone", () => {
  // Princess Mary first appears with her surname; she is then called "Mary"; Mary Ivánovna holds "Mary" too, but was never called by it
  const r = read(name(0, ["Princess", "Mary", "Bolkónskaya"]), name(1, ["Mary"]), name(2, ["Mary", "Ivánovna"]), name(3, ["Mary"]));
  assert.equal(r.referents.length, 2); assert.equal(r.mentionOf["3.1"], r.referents[0].ref); assert.equal(r.contested, 0);
});

// ── the second pass: noun phrases, pronouns across clauses, identity as typed edges ─────────────────────────────────────────────
const S = (order, ...rows) => ({ order, rows });
const he = (id, head, deprel = "nsubj", form = "he") => R(id, form, "PRON", head, deprel, `Case=${deprel.startsWith("nsubj") ? "Nom" : "Acc"}|Gender=Masc|Number=Sing|Person=3|PronType=Prs`);
test("a noun phrase is a referent: an indefinite opens one, a definite with the same head returns to it, another indefinite opens a second", () => {
  const r = read(
    S(0, R(1, "A", "DET", 2, "det", "Definite=Ind|PronType=Art"), R(2, "soldier", "NOUN", 3, "nsubj", "Number=Sing"), R(3, "came", "VERB", 0, "root")),
    S(1, R(1, "The", "DET", 2, "det", "Definite=Def|PronType=Art"), R(2, "soldier", "NOUN", 3, "nsubj", "Number=Sing"), R(3, "sat", "VERB", 0, "root")),
    S(2, R(1, "Another", "DET", 2, "det", "PronType=Ind"), R(2, "soldier", "NOUN", 3, "nsubj", "Number=Sing"), R(3, "laughed", "VERB", 0, "root")));
  const nom = r.referents.filter((x) => x.kind === "nominal");
  assert.equal(nom.length, 2); assert.equal(r.mentionOf["0.2"], r.mentionOf["1.2"]); assert.notEqual(r.mentionOf["2.2"], r.mentionOf["0.2"]);
});
test("a pronoun no clause binds goes to the most recent present being whose pro-form agrees, never to a co-argument", () => {
  const nat = (o) => S(o, R(1, "Natásha", "PROPN", 2, "nsubj"), R(2, "raised", "VERB", 0, "root"), R(3, "her", "PRON", 4, "nmod:poss", "Gender=Fem|Number=Sing|Person=3|PronType=Prs"), R(4, "head", "NOUN", 2, "obj"));
  const pie = (o) => S(o, R(1, "Pierre", "PROPN", 2, "nsubj"), R(2, "rubbed", "VERB", 0, "root"), R(3, "his", "PRON", 4, "nmod:poss", "Gender=Masc|Number=Sing|Person=3|PronType=Prs"), R(4, "eyes", "NOUN", 2, "obj", "Number=Plur"));
  const r = read(nat(0), pie(1), nat(2), pie(3), nat(4), pie(5), S(6, R(1, "She", "PRON", 2, "nsubj", "Case=Nom|Gender=Fem|Number=Sing|Person=3|PronType=Prs"), R(2, "smiled", "VERB", 0, "root")),
    S(7, he(1, 2), R(2, "saw", "VERB", 0, "root"), he(3, 2, "obj", "him")));
  const natRef = r.mentionOf["0.1"], pieRef = r.mentionOf["1.1"];
  assert.equal(r.mentionOf["6.1"], natRef, "she → Natásha"); assert.equal(r.mentionOf["7.1"], pieRef, "he → Pierre"); assert.notEqual(r.mentionOf["7.3"], r.mentionOf["7.1"], "him is not his own co-argument");
});
test("identity across referents is a typed edge; mergeBy collapses only the kinds a perspective names", () => {
  // Prince Andrew Bolkónski , the husband  (an apposition)
  const r = read(S(0, R(1, "Prince", "PROPN", 2, "compound"), R(2, "Andrew", "PROPN", 6, "nsubj"), R(3, ",", "PUNCT", 5, "punct"), R(4, "the", "DET", 5, "det", "Definite=Def|PronType=Art"), R(5, "husband", "NOUN", 2, "appos", "Number=Sing"), R(6, "came", "VERB", 0, "root")));
  const a = r.mentionOf["0.2"], h = r.mentionOf["0.5"];
  assert.ok(r.edges.some((e) => e.type === "apposition" && [e.a, e.b].includes(a) && [e.a, e.b].includes(h)));
  assert.notEqual(mergeBy(r, []).get(h), mergeBy(r, []).get(a), "the read itself merges nothing");
  assert.equal(mergeBy(r, ["apposition"]).get(h), mergeBy(r, ["apposition"]).get(a), "the person perspective makes them one");
});
