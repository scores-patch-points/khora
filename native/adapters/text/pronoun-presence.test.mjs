// The presence rung (adapters/text/pronouns.js::resolvePronounsByPresence) and its opt-in wiring (readerOptions.pronounPresence): PREREG-PRESENCE.md.
// Stub-free: synthetic sentences and mentions for the mechanics, readWith on short texts for the wiring; no priors directory, lexicon or GUM.
import test from "node:test";
import assert from "node:assert/strict";
import { resolvePronounsByPresence } from "./pronouns.js";
import { readWith, buildPriors } from "../../the-fold/read-core.mjs";

const DIALS = { window: 4, boost: 2, feed: 1, floor: 0.5, margin: 0.2 };
// sentences laid end to end; a mention is [sentence, text] located inside it
const build = (texts) => { let off = 0; return texts.map((text) => { const s = { text, offset: off }; off += text.length + 1; return s; }); };
const mention = (sents, si, ref, needle) => { const start = sents[si].offset + sents[si].text.indexOf(needle); return { ref, start, end: start + needle.length }; };
const run = (texts, mentionSpecs, opts = {}) => { const sents = build(texts); return resolvePronounsByPresence(sents, mentionSpecs.map(([si, ref, n]) => mention(sents, si, ref, n)), { ...DIALS, ...opts }); };

test("recency: the more recently mentioned being wins; the same mentions at a window of 2 and of null differ as the decay says", () => {
  const T = ["Anna lived there.", "Boris lived there.", "She waved."];
  const spec = [[0, "A", "Anna"], [1, "B", "Boris"]];
  assert.deepEqual(run(T, spec).bindings.map((b) => b.referentId), ["B"], "Boris is the more present (fired later, same first-mention boost)");
  const undecayed = run(T, spec, { window: null, margin: 0 });
  assert.equal(undecayed.bindings.length, 1, "undecayed, the tie is broken by the more recent mention, not by chance");
  assert.equal(undecayed.bindings[0].referentId, "B");
});

test("salience: a being mentioned twice outweighs a more recent one that was mentioned once, until decay says otherwise", () => {
  const T = ["Anna saw Anna.", "Boris came.", "He sat."];
  const sents = build(T);
  const mentions = [{ ref: "A", ...mention(sents, 0, "A", "Anna") }, { ref: "A", start: sents[0].offset + 9, end: sents[0].offset + 13 }, mention(sents, 1, "B", "Boris")];
  const got = resolvePronounsByPresence(sents, mentions, { ...DIALS, margin: 0 });
  assert.equal(got.bindings[0].referentId, "A", "2 (boost) + 1 decayed twice beats 2 decayed once");
});

test("floor and margin: a faint or tied winner leaves the pronoun unbound", () => {
  const T = ["Anna lived there.", "Boris lived there.", "She waved."];
  const spec = [[0, "A", "Anna"], [1, "B", "Boris"]];
  assert.equal(run(T, spec, { floor: 5 }).bindings.length, 0, "no being is present enough");
  assert.equal(run(T, spec, { margin: 0.9 }).bindings.length, 0, "the lead is too small");
  assert.equal(run(["Anna lived there.", "She waved."], [[0, "A", "Anna"]], { margin: 0.9 }).bindings.length, 1, "a lone candidate has margin 1");
});

test("non-personal beings never bind; clause-local gender evidence vetoes a clean pronoun, causally", () => {
  const T = ["March was cold.", "He waved."];
  assert.equal(run(T, [[0, "M", "March"]], { nonPersonal: ["M"] }).bindings.length, 0);
  assert.equal(run(T, [[0, "M", "March"]]).bindings.length, 1, "the ruling is what stops it");
  const G = ["Anna smiled and she left.", "He waved."];
  assert.equal(run(G, [[0, "A", "Anna"]]).bindings.filter((b) => b.pronoun === "he").length, 0, "Anna was shown to be f in her own clause: he cannot be her");
  const causal = run(["Anna said he left.", "She waved.", "He sat."], [[0, "A", "Anna"]]);
  assert.deepEqual(causal.bindings.map((b) => [b.pronoun, b.referentId]), [["he", "A"], ["he", "A"]], "in its own sentence the first he is not yet vetoed; the evidence it leaves (Anna is m) refuses the later she and admits the later he");
  assert.ok(causal.bindings.every((b) => b.pronoun !== "she"), "she is refused for a being shown to be m");
});

test("feed: a bound pronoun re-fires its being", () => {
  const T = ["Anna lived there.", "Boris lived there.", "She waved.", "He sat."];
  const spec = [[0, "A", "Anna"], [1, "B", "Boris"]];
  const fed = run(T, spec, { margin: 0, feed: 1 }), unfed = run(T, spec, { margin: 0, feed: 0 });
  assert.equal(fed.bindings.length, 2);
  assert.equal(unfed.bindings.length, 2);
  assert.ok(fed.bindings[1].activation > unfed.bindings[1].activation, "the pronoun's own binding adds presence to the being it named");
});

test("locality: the sole being named in the pronoun's own clause decides, no arithmetic; off, the ladder decides", () => {
  const T = ["Anna lived there.", "Boris saw himself."];
  const spec = [[0, "A", "Anna"], [1, "B", "Boris"]];
  const local = run(T, spec, { locality: true, floor: 99 });
  assert.deepEqual(local.bindings.map((b) => [b.referentId, b.mechanism]), [["B", "locality"]], "no floor can stop a sole same-clause antecedent");
  assert.equal(run(T, spec, { locality: false, floor: 99 }).bindings.length, 0);
  const two = run(["Anna and Boris saw himself."], [[0, "A", "Anna"], [0, "B", "Boris"]], { locality: true });
  assert.ok(two.bindings.every((b) => b.mechanism !== "locality"), "two beings in the clause: locality does not decide");
});

test("every dial is declared; another language is a typed gap, not an English attempt", () => {
  assert.throws(() => resolvePronounsByPresence([], [], { ...DIALS, window: 1 }), /window is declared/);
  assert.throws(() => resolvePronounsByPresence([], [], { ...DIALS, boost: 0 }), /boost/);
  assert.throws(() => resolvePronounsByPresence([], [], { ...DIALS, feed: 2 }), /feed/);
  assert.throws(() => resolvePronounsByPresence([], [], { ...DIALS, floor: -1 }), /floor/);
  assert.throws(() => resolvePronounsByPresence([], [], { ...DIALS, margin: 2 }), /margin/);
  assert.throws(() => resolvePronounsByPresence([], [], {}), /declared/);
  const de = resolvePronounsByPresence(build(["Anna kam."]), [], { ...DIALS, language: "de" });
  assert.deepEqual([de.bindings.length, de.gaps[0].reason], [0, "no_pronoun_prior_for_language"]);
});

const priors = buildPriors({ stem: "eng" });
const TEXT = "Anna Smith met Boris Jones in Paris. She liked him. Later Boris Jones left the city and he did not write. Anna Smith wrote about it. Boris Jones read her letter and he smiled. He answered Anna Smith. She said nothing. Boris Jones went home.";
const strip = (e) => JSON.stringify({ ...e, ms: 0, pronounsPresence: undefined });

test("wiring: off (the default) there is no field and the entry is what it was; on, the field is added and nothing else moves (C2)", () => {
  const off = readWith(TEXT, { language: "eng", priors, minCharacters: 0 });
  const on = readWith(TEXT, { language: "eng", priors, minCharacters: 0, readerOptions: { pronounPresence: { ...DIALS, locality: false } } });
  assert.equal("pronounsPresence" in off, false);
  assert.ok(Array.isArray(on.pronounsPresence) && on.pronounsPresence.length > 0);
  assert.equal(strip(on), strip(off));
  assert.deepEqual(on.pronouns, off.pronouns, "the shipped resolver's bindings are untouched: it is the control");
  assert.equal(Object.keys(on).includes("presenceInputs"), false, "the re-run inputs ride the entry, not the wire");
});

test("wiring: each item is addressed on the entry's own text and names a cast being; locality is the option's, not the default's", () => {
  const e = readWith(TEXT, { language: "eng", priors, minCharacters: 0, readerOptions: { pronounPresence: { ...DIALS, locality: true } } });
  const refs = new Set(e.cast.map((c) => c.ref));
  for (const b of e.pronounsPresence) {
    assert.equal(TEXT.slice(b.at[0], b.at[1]).toLowerCase(), b.pronoun);
    assert.ok(refs.has(b.ref) && typeof b.surface === "string");
    assert.ok(["presence", "locality"].includes(b.mechanism));
  }
  const p = readWith(TEXT, { language: "eng", priors, minCharacters: 0, readerOptions: { pronounPresence: { ...DIALS, locality: false } } });
  assert.ok(p.pronounsPresence.every((b) => b.mechanism === "presence"));
  // the pure rung re-run on the entry's own inputs gives the same bindings (what the evaluation relies on)
  const again = resolvePronounsByPresence(e.presenceInputs.sentences, e.presenceInputs.mentions, { ...DIALS, locality: true, nonPersonal: e.presenceInputs.nonPersonal });
  assert.deepEqual(again.bindings.map((b) => [b.offset, b.referentId, b.mechanism]), e.pronounsPresence.map((b) => [b.at[0], b.ref, b.mechanism]));
});

test("wiring: another language reads as it did, with no item", () => {
  const de = "Anna Schmidt traf Boris Weber in Berlin. Sie mochte ihn sehr. Später verließ er die Stadt.";
  const off = readWith(de, { language: "deu", priors, minCharacters: 0 });
  const on = readWith(de, { language: "deu", priors, minCharacters: 0, readerOptions: { pronounPresence: DIALS } });
  assert.deepEqual(on.pronounsPresence, []);
  assert.equal(strip(on), strip(off));
});
