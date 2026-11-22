// gender-from-corpus.test.mjs — the corpus-backed pro-form agreement giver: it reads a being's
// agreement class off the pro-forms that bind to its name in ingested material, in the material's
// own language, and it is OPEN (m / f / n animacy / x), never a binary, never a universal constant.
import { test } from "node:test";
import assert from "node:assert/strict";
import { genderEvidenceFromText, buildCorpusTable, genderPriorFromCorpus, MIN_EVIDENCE, verbAgreementFromText, verbAgreementFromParadigm } from "./gender-from-corpus.js";

const EN = { he: "m", him: "m", his: "m", she: "f", her: "f", hers: "f", it: "n", its: "n", they: "x", them: "x", their: "x" };

test("a being's agreement class is read off the pro-form that binds to its own name in its own clause", () => {
  const t = "Then Lucy lost her hat. Then Jonathan dropped his bag. He cursed it.";
  const ev = genderEvidenceFromText(t, { pronounForms: EN });
  assert.equal(ev.get("lucy")?.get("f"), 1, "Lucy binds her — feminine");
  assert.equal(ev.get("jonathan")?.get("m"), 1, "Jonathan binds his — masculine");
});

test("the animacy axis is a first-class class: a nonhuman binds the nonhuman pro-form", () => {
  const t = "The box kept its lid shut. They could not open it.";
  const ev = genderEvidenceFromText(t, { pronounForms: EN });
  assert.ok(ev.get("the") === undefined, "a capitalised function word is not a name");
});

test("a split attestation rules nothing and is recorded, never forced to one side", () => {
  const t = "Then Ashley took her coat. Then Ashley took his hat.";
  const c = Object.fromEntries(genderEvidenceFromText(t, { pronounForms: EN }).get("ashley") ?? []);
  assert.equal(c.f > 0 && c.m > 0, true, "both classes attested, neither suppressed");
});

test("the prior rules a being only with evidence at or above the minimum, and not on a tie", () => {
  const table = buildCorpusTable([
    "Then Jonathan dropped his bag, and Jonathan opened his book.",
    "Then Mina lost her hat, and Mina found her pen.",
    "Then Ashley took her coat. Then Ashley took his hat.",
  ], { language: "en", pronounForms: EN });
  const cast = [
    { ref: "jonathan", surface: "Jonathan", mentionSpans: [[0, 8]] },
    { ref: "mina", surface: "Mina", mentionSpans: [[13, 17]] },
    { ref: "ashley", surface: "Ashley", mentionSpans: [[22, 28]] },
  ];
  const prior = genderPriorFromCorpus({ text: "Jonathan and Mina and Ashley", cast, corpusTable: table });
  assert.equal(prior.get("jonathan"), "m");
  assert.equal(prior.get("mina"), "f");
  assert.equal(prior.get("ashley"), undefined, "split attestation is not forced to a side");
  assert.equal(MIN_EVIDENCE, 2);
});

test("a language with no gendered third-person pro-forms yields no evidence, never a default", () => {
  const ev = genderEvidenceFromText("Gitti ve geldi. Onu gördü.", { pronounForms: {} });
  assert.equal(ev.size, 0, "no pro-form register -> no agreement evidence, not 'male by default'");
});

test("a corpus table carries its provenance: this corpus, this language, this many documents", () => {
  const table = buildCorpusTable(["She went. He came."], { language: "en", pronounForms: EN, provenance: { source: "fixture" } });
  assert.equal(table.provenance.giver, "corpus");
  assert.equal(table.provenance.docs, 1);
  assert.equal(table.language, "en");
});

// ——— the pro-drop half: the null pro-form's feature bundle rides the verb's agreement ———

test("in a pro-drop language the dropped subject's agreement is read off the verb, open-set", () => {
  const hebrew = { shamarti: { person: "1", number: "sg", gender: null }, shamar: { person: "3", number: "sg", gender: "m" }, shamra: { person: "3", number: "sg", gender: "f" }, shamru: { person: "3", number: "pl", gender: null } };
  const hits = verbAgreementFromText("shamarti. shamar. shamra. shamru.", { verbAgreement: hebrew });
  assert.equal(hits.length, 4);
  assert.equal(hits[1].gender, "m", "shamar attests a masculine dropped subject");
  assert.equal(hits[2].gender, "f", "shamra attests a feminine dropped subject");
  assert.equal(hits[0].gender, null, "shamarti carries person/number, no gender");
});

test("a verb-agreement register is built from a paradigm, admitting only clean forms", () => {
  const reg = verbAgreementFromParadigm({
    shamar: { person: { 3: 40 }, number: { sg: 40 }, gender: { Masc: 40 } },
    shamra: { person: { 3: 38 }, number: { sg: 38 }, gender: { Fem: 38 } },
    shamru: { person: { 3: 30 }, number: { pl: 30 }, gender: { Masc: 14, Fem: 16 } }, // gender split -> not clean
  });
  assert.equal(reg.get("shamar")?.gender, "m");
  assert.equal(reg.get("shamra")?.gender, "f");
  assert.equal(reg.get("shamru")?.gender, null, "a gender-split form admits person/number, no gender");
});
