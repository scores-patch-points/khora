// adapters/text/name-smell.test.mjs — does a surface SMELL like a name? Measured from the text's own casing and the reader's part-of-speech prior; no word list, no typed threshold.
// Written before the module; each test says what would falsify it.
import test from "node:test"; import assert from "node:assert/strict";
import { nameSmell, sentenceStartsOf } from "./name-smell.js";

// a prior in the shape of janus/priors/pos-eng.json forms: lowercase form -> { UPOS: count }
const POS = { i: { PRON: 900 }, "i’m": { PRON: 40 }, and: { CCONJ: 999 }, the: { DET: 999 }, day: { NOUN: 170, PROPN: 8 }, man: { NOUN: 36 }, see: { VERB: 205 }, yea: { INTJ: 3 }, kitty: { NOUN: 3, PROPN: 2 }, bennet: undefined, hast: undefined, shalt: undefined, wherefore: undefined };
const text = "Kitty coughed. Day came and the day went. Yea, said Bennet. See the man and the man saw Kitty. I think Bennet knew. Hast thou eaten? Shalt thou go? Wherefore did Mrs. Long call Bennet? Bennet saw Long.";
const S = sentenceStartsOf(text);
const v = (surface, o = {}) => nameSmell({ surface, text, sentenceStarts: S, pos: POS, ...o });

test("a surface capitalised away from a sentence start and never lowercase is a name, even when the prior has never seen it", () => {
  const r = v("Bennet"); assert.equal(r.verdict, "name"); assert.ok(r.capMid >= 1); assert.equal(r.lower, 0);
});
test("an open-class word the prior knows as a noun is still a name when the text capitalises it everywhere ('Kitty')", () => { assert.equal(v("Kitty").verdict, "name"); });
test("a word that also occurs lowercase in the same text is a common word, not a name ('Day', 'Man')", () => {
  assert.equal(v("Day").verdict, "not_name"); assert.match(v("Day").why, /lowercase/); assert.equal(nameSmell({ surface: "Man", text: "Man was made. The man left.", sentenceStarts: sentenceStartsOf("Man was made. The man left."), pos: POS }).verdict, "not_name");
});
test("TRAP: a word capitalised ONLY because it opens a sentence is unknown, never a name ('Yea', 'Hast', 'Shalt', 'Wherefore', 'See')", () => {
  for (const w of ["Yea", "Hast", "Shalt", "Wherefore", "See"]) { const r = v(w); assert.notEqual(r.verdict, "name", w); }
  assert.equal(v("Hast").verdict, "unknown"); assert.equal(v("Wherefore").verdict, "unknown");
});
test("TRAP: a closed-class word the prior knows (a pronoun, a conjunction) is never a name, however it is capitalised ('I', 'I’m', 'And')", () => {
  const t = "Then I went. And I saw. Bennet said I’m here. I stayed.", s = sentenceStartsOf(t);
  for (const w of ["I", "And", "I’m"]) assert.equal(nameSmell({ surface: w, text: t, sentenceStarts: s, pos: POS }).verdict, "not_name", w);
});
test("a title with its name is judged on the name: 'Mrs. Long' by 'Long'; a bare dotted title is not a being ('Mr.')", () => {
  assert.equal(v("Mrs. Long").verdict, "name");
  assert.equal(nameSmell({ surface: "Mr.", text: "Mr. Bennet came. Mr. Bennet left.", sentenceStarts: sentenceStartsOf("Mr. Bennet came. Mr. Bennet left."), pos: POS }).verdict, "not_name");
});
test("a surface that is not in the text at all is unknown, never a name by default; no prior is a typed gap on the verdict, not a crash", () => {
  assert.equal(v("Zebulun").verdict, "unknown");
  const r = nameSmell({ surface: "Bennet", text, sentenceStarts: S, pos: null }); assert.equal(r.verdict, "name"); assert.equal(r.priorGap, "no_pos_prior");
});
test("the verdict carries its evidence, so a reader can see why", () => { const r = v("Bennet"); assert.ok("capMid" in r && "capInitial" in r && "lower" in r && "why" in r); });

// ── found by running it over both builders' casts on Genesis and Pride and Prejudice (2026-11-26) ──
test("FOUND: an ALL-CAPS token is its own word: 'LORD' (the divine name) is not vetoed by the common word 'lord' in the same text", () => {
  const t = "And the LORD said unto Pharaoh, my lord, I will go. The LORD spake. A lord of Egypt came.", s = sentenceStartsOf(t);
  assert.equal(nameSmell({ surface: "LORD", text: t, sentenceStarts: s, pos: POS }).verdict, "name");
  assert.equal(nameSmell({ surface: "Lord", text: "Then Lord Byron came. The lord left.", sentenceStarts: sentenceStartsOf("Then Lord Byron came. The lord left."), pos: POS }).verdict, "not_name", "title-case still meets the lowercase test");
});
test("FOUND: the reader's own tag for the token in context decides what position cannot: a capital after the comma that opens an unmarked speech ('said unto them, Shed no blood') is not a name when the parser tags it VERB", () => {
  const t = "And Reuben said unto them, Shed no blood. Reuben went. And Judah said, Wherefore go we? Judah stayed.", s = sentenceStartsOf(t);
  const at = (w, n = 0) => { let i = -1; for (let k = 0; k <= n; k++) i = t.indexOf(w, i + 1); return i; };
  const posAt = new Map([[at("Reuben"), "PROPN"], [at("Shed"), "VERB"], [at("Reuben", 1), "PROPN"], [at("Judah"), "PROPN"], [at("Wherefore"), "ADV"], [at("Judah", 1), "PROPN"]]);
  assert.equal(nameSmell({ surface: "Shed", text: t, sentenceStarts: s, pos: POS, posAt }).verdict, "not_name"); assert.match(nameSmell({ surface: "Shed", text: t, sentenceStarts: s, pos: POS, posAt }).why, /VERB in context/);
  assert.equal(nameSmell({ surface: "Wherefore", text: t, sentenceStarts: s, pos: POS, posAt }).verdict, "not_name");
  assert.equal(nameSmell({ surface: "Reuben", text: t, sentenceStarts: s, pos: POS, posAt }).verdict, "name");
  assert.equal(nameSmell({ surface: "Shed", text: t, sentenceStarts: s, pos: POS }).verdict, "name", "without the contextual tags the verdict is the casing verdict, unchanged");
});
test("the contextual tag only ever REMOVES a name: a token the parser tags PROPN is not made a name by the tag alone (a sentence-initial one stays unknown)", () => {
  const t = "Yea, said Bennet. Yea went on.", s = sentenceStartsOf(t); const posAt = new Map([[0, "PROPN"], [t.indexOf("Yea went"), "PROPN"]]);
  assert.equal(nameSmell({ surface: "Yea", text: t, sentenceStarts: s, pos: { yea: undefined }, posAt }).verdict, "unknown");
});
