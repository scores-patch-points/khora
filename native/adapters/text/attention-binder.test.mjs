// The attention binder (adapters/text/attention-binder.js): "it" and "The <word>" bound to the attended non-person referent.
// Stub-free: synthetic sentences and mentions; no priors directory, lexicon, corpus or reader.
import test from "node:test";
import assert from "node:assert/strict";
import { bindAttended, predicateKind } from "./attention-binder.js";
import { THIRD_PERSON_SINGULAR, NEUTER_THIRD_PERSON } from "./priors.js";

const DIALS = { window: 8, minActivation: 0.5, minMargin: 0.2, boost: 2, feed: true, centerVeto: true, clauseMateVeto: true };
const build = (texts) => { let off = 0; return texts.map((text, order) => { const s = { text, offset: off, order }; off += text.length + 1; return s; }); };
// a mention is [sentence, ref, needle]; the span is the needle's first occurrence in that sentence
const spans = (sents, specs) => specs.map(([si, ref, needle]) => { const start = sents[si].offset + sents[si].text.indexOf(needle); return { ref, start, end: start + needle.length }; });
const run = (texts, specs, opts = {}) => { const sents = build(texts); return bindAttended(sents, spans(sents, specs), { ...DIALS, ...opts }); };

test("an 'It' binds to the attended being, with its address and the evidence", () => {
  const out = run(["The Tower is old.", "It is tall."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 1);
  assert.equal(out.bindings[0].referentId, "T");
  assert.equal(out.bindings[0].kind, "pronoun");
  assert.equal(out.bindings[0].surface, "It");
  assert.equal(out.bindings[0].via, "attended");
  assert.deepEqual(out.gaps, []);
});

test("a definite description binds through a word of the being's own surface, and a clitic is not part of the address", () => {
  const texts = ["The Eiffel Tower is old.", "The tower's base is wide."];
  const out = run(texts, [[0, "E", "Eiffel Tower"]]);
  assert.equal(out.bindings.length, 1);
  assert.equal(out.bindings[0].via, "surface-word");
  assert.equal(out.bindings[0].surface, "The tower");
});

test("a definite description binds through the kind the text predicates of the being with a copula", () => {
  const texts = ["Concorde is a British-French supersonic airliner with four engines.", "The airliner had range."];
  const out = run(texts, [[0, "C", "Concorde"]]);
  assert.equal(out.bindings[0]?.referentId, "C");
  assert.equal(out.bindings[0]?.via, "predicate-kind");
  assert.deepEqual(predicateKind(" is a British-French supersonic airliner with four engines."), ["supersonic", "airliner", "with", "four", "engines"]);
});

test("the noun phrase containing a name lends its words to the being (the Statue of | Liberty)", () => {
  const out = run(["The Statue of Liberty is old.", "The statue was built."], [[0, "L", "Liberty"]]);
  assert.equal(out.bindings[0]?.referentId, "L");
});

test("a description whose word the text never gave any being is a typed gap, not a guess (no noun list exists to consult)", () => {
  const out = run(["The Tower is old.", "The weather was fine."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 0);
  assert.equal(out.gaps[0].reason, "description_unbound");
});

test("two beings equally present leave the 'It' unbound with the two named; a floor above the presence does the same", () => {
  const a = run(["The Tower and the Bridge are old.", "It is tall."], [[0, "T", "Tower"], [0, "B", "Bridge"]], { boost: 1 });
  assert.equal(a.bindings.length, 0);
  assert.equal(a.gaps[0].reason, "pronoun_no_margin");
  assert.deepEqual([a.gaps[0].top, a.gaps[0].runnerUp].sort(), ["B", "T"]);
  const b = run(["The Tower is old.", "It is tall."], [[0, "T", "Tower"]], { minActivation: 50 });
  assert.equal(b.gaps[0].reason, "pronoun_below_floor");
});

test("the subject's position counts more: the first-named being leads a sentence naming two", () => {
  const out = run(["The Tower overlooks the Bridge.", "It is tall."], [[0, "T", "Tower"], [0, "B", "Bridge"]]);
  assert.equal(out.bindings[0]?.referentId, "T");
});

test("an 'It' after a sentence that began with a description the cast does not know is the centre moving elsewhere: a gap, and off, a binding", () => {
  const texts = ["The Tower is old.", "The committee met on Monday.", "It was large."];
  const on = run(texts, [[0, "T", "Tower"]]);
  assert.equal(on.gaps.find((g) => g.sentenceOrder === 2).reason, "center_elsewhere");
  const off = run(texts, [[0, "T", "Tower"]], { centerVeto: false });
  assert.equal(off.bindings.find((b) => b.sentenceOrder === 2).referentId, "T");
});

test("an earlier clause-mate that is another candidate vetoes the pronoun (Principle B), and off it does not", () => {
  const texts = ["The Tower is old.", "The Bridge held what it carried."];
  const specs = [[0, "T", "Tower"], [1, "B", "Bridge"]];
  assert.equal(run(texts, specs).gaps.find((g) => g.sentenceOrder === 1)?.reason, "clause_mate");
  assert.equal(run(texts, specs, { clauseMateVeto: false }).bindings.find((b) => b.sentenceOrder === 1 && b.kind === "pronoun")?.referentId, "T");
});

test("the giver's ruling is exactly the candidate set; without it, a being the text shows to be a person is not a candidate", () => {
  const texts = ["Anna built the Tower.", "It is old."];
  const specs = [[0, "A", "Anna"], [0, "T", "Tower"]];
  assert.equal(run(texts, specs, { nonPersonal: new Set(["T"]) }).ruling, "giver");
  assert.equal(run(texts, specs, { nonPersonal: new Set(["T"]) }).bindings[0]?.referentId, "T");
  assert.equal(run(texts, specs, { nonPersonal: new Set(["A"]) }).bindings[0]?.referentId, "A", "the set decides, whatever the text says");
  const textEvidence = run(["Anna lived there. She waved to it.", "It stood."], [[0, "A", "Anna"]]);
  assert.equal(textEvidence.ruling, "text_evidence");
  assert.ok(textEvidence.bindings.every((b) => b.referentId !== "A"), "Anna has a clause-local 'She': a person");
});

test("a mention inside a longer mention of another being is not that being's firing", () => {
  const sents = build(["The Hoover Dam is old.", "It is tall."]);
  const base = sents[0].offset;
  const mentions = [{ ref: "H", start: base + 4, end: base + 10 }, { ref: "D", start: base + 4, end: base + 14 }];
  const out = bindAttended(sents, mentions, DIALS);
  assert.equal(out.bindings[0]?.referentId, "D");
});

test("he and she are never looked at here, and the neuter class is separate from the gendered table", () => {
  const out = run(["The Tower is old.", "He said so, and she agreed."], [[0, "T", "Tower"]]);
  assert.equal(out.bindings.length, 0);
  assert.equal(out.gaps.length, 0);
  assert.deepEqual(Object.keys(THIRD_PERSON_SINGULAR).sort(), ["he", "her", "hers", "herself", "him", "himself", "his", "she"]);
  assert.deepEqual([...NEUTER_THIRD_PERSON].sort(), ["it", "its", "itself"]);
});

test("every dial is declared; none is defaulted", () => {
  for (const k of ["window", "minActivation", "minMargin", "boost", "feed", "centerVeto", "clauseMateVeto"]) {
    const { [k]: _gone, ...rest } = DIALS;
    const sents = build(["The Tower is old."]);
    assert.throws(() => bindAttended(sents, [], rest), TypeError, k);
  }
});

test("the code keeps no noun, synonym or kind list: every set of words it reads is a received class from priors.js", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./attention-binder.js", import.meta.url), "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert.equal(/new Set\(\[\s*["'`]/.test(src), false, "no Set literal of words");
  assert.equal(/\[\s*["'`][a-z]+["'`]\s*,\s*["'`][a-z]+["'`]/i.test(src), false, "no array literal of words");
});

test("the switch is OFF unless asked: absent or false files nothing; on, it binds from an entry's own cast", async () => {
  const { attendedBindingsFor } = await import("./attention-switch.js");
  const sents = build(["The Tower is old.", "It is tall."]);
  const entry = { sentences: sents, cast: [{ ref: "T", mentionSpans: [[sents[0].offset + 4, sents[0].offset + 9]] }] };
  assert.equal(attendedBindingsFor(entry), null);
  assert.equal(attendedBindingsFor(entry, { enabled: false, ...DIALS }), null);
  assert.equal(attendedBindingsFor(entry, { enabled: "yes", ...DIALS }), null, "only true turns it on");
  assert.equal(attendedBindingsFor(entry, { enabled: true, ...DIALS }).bindings[0].referentId, "T");
});
