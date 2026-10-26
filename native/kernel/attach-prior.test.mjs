// AttachPrior@1 (attach-prior.js): counts from gold, a strict-majority rule, and abstention. Constructed violations first (lesson 70): a deranged prior must disagree.
import test from "node:test";
import assert from "node:assert/strict";
import { instancesOf, buildPrior, decide } from "./attach-prior.js";
const tok = (id, form, upos, head, deprel, extra = {}) => ({ id, form, lemma: form.toLowerCase(), upos, head, deprel, feats: "", ...extra });
// "we sent the letter to Anna": to-phrase on the VERB;  "we found the letter to Anna": to-phrase on the object NOUN
const onVerb = [tok(1, "we", "PRON", 2, "nsubj"), tok(2, "sent", "VERB", 0, "root", { lemma: "send" }), tok(3, "letter", "NOUN", 2, "obj"), tok(4, "to", "ADP", 5, "case"), tok(5, "Anna", "PROPN", 2, "obl")];
const onNoun = [tok(1, "we", "PRON", 2, "nsubj"), tok(2, "found", "VERB", 0, "root", { lemma: "find" }), tok(3, "letter", "NOUN", 2, "obj"), tok(4, "to", "ADP", 5, "case"), tok(5, "Anna", "PROPN", 3, "nmod")];
const adps = new Set(["to"]);
test("a dative phrase after the object is an instance, on the verb or on the noun", () => {
  assert.deepEqual(instancesOf(onVerb, { adps }).map(({ verb, attach }) => ({ verb, attach })), [{ verb: "send", attach: "verb" }]);
  assert.deepEqual(instancesOf(onNoun, { adps }).map(({ verb, attach }) => ({ verb, attach })), [{ verb: "find", attach: "noun" }]);
});
test("a phrase with another case word is no instance; Case=Dat marks one with no adposition", () => {
  assert.equal(instancesOf(onVerb, { adps: new Set(["for"]) }).length, 0);
  const dat = onVerb.filter((t) => t.id !== 4).map((t) => (t.id === 5 ? { ...t, feats: "Case=Dat" } : t));
  assert.equal(instancesOf(dat, { adps: new Set() }).length, 1);
});
test("strict majority decides; a tie and an unseen lemma abstain", () => {
  const P = buildPrior([onVerb, onVerb, onNoun, onNoun, onNoun], { adps });
  assert.equal(decide(P, "send"), "verb"); assert.equal(decide(P, "find"), "noun");
  assert.equal(decide({ x: { verb: 1, noun: 1 } }, "x"), null); assert.equal(decide(P, "never-seen"), null);
});
test("the control built to fail: the counts of another lemma decide the other way", () => {
  const P = buildPrior([onVerb, onNoun], { adps }), swapped = { send: P.find, find: P.send };
  assert.notEqual(decide(swapped, "send"), decide(P, "send"));
});
test("deterministic: the same sentences give identical bytes", () => {
  assert.equal(JSON.stringify(buildPrior([onVerb, onNoun], { adps })), JSON.stringify(buildPrior([onVerb, onNoun], { adps })));
});
