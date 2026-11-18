// The Chomsky seam as the canonical clause source for grc and san (adapters/text/case-marked-clauses.js, identity/novels PREREG-ROUND19.md).
import test from "node:test"; import assert from "node:assert/strict";
import { caseMarkedReaderFor, rolesFor, CASE_MARKED_STEMS } from "../adapters/text/case-marked-clauses.js";
import { readToWeft } from "../the-fold/read-process.mjs"; import { resolvePronounsByPresence } from "../adapters/text/pronouns.js";
const HAVE = !!caseMarkedReaderFor("grc")?.clausesOf;
const GRC = "ὁ Πέτρος ἦλθεν εἰς τὴν πόλιν καὶ εἶδεν τὸν Ἰωάννην. ὁ Ἰωάννης εἶπεν τῷ Πέτρῳ ὅτι οὐκ ἔστιν ἐνταῦθα. καὶ ἰδὼν τὸν Πέτρον ὁ Ἰωάννης ἔδωκεν αὐτῷ ἄρτον. ";
test("only the case-marked stems have a reader; English and every other stem get null", () => { assert.deepEqual([...CASE_MARKED_STEMS].sort(), ["grc", "san"]); assert.equal(caseMarkedReaderFor("eng"), null); assert.equal(caseMarkedReaderFor("fra"), null); });
test("Greek clauses are read off case: nominative subject, accusative object, absolute offsets", { skip: !HAVE }, () => {
  const T = GRC.repeat(3); const w = readToWeft(T, { language: "grc", address: "t:g" });
  assert.ok(w.clauses.length > 0 && w.clauses.every((c) => c.source === "case-marked")); const c = w.clauses.find((x) => x.subject && x.object);
  assert.ok(c && T.slice(c.subject.start, c.subject.end) === c.subject.text && c.subject.case === "Nom" && c.object.case === "Acc");
  assert.equal(w.quality?.clauses?.source, "case-marked");
});
test("a verb with no nominative is a null subject, recorded and never invented as a being", { skip: !HAVE }, () => {
  const w = readToWeft(GRC.repeat(3), { language: "grc", address: "t:g" }); assert.ok(w.clauses.some((c) => c.nullSubject && c.subject === null));
});
test("English is untouched: its clauses carry no case-marked source and the rung gets no roles", () => {
  const w = readToWeft("Bert walked into the room and he sat down. Mary met Bert at the station, and she smiled as he arrived. ".repeat(6), { language: "eng", address: "t:e" });
  assert.ok(!(w.clauses ?? []).some((c) => c.source === "case-marked")); assert.equal(w.presenceInputs?.roles ?? null, null);
});
test("roles: a case-read subject weighs the boost instead of the sentence's first mention, and a clause sibling is not a referent", () => {
  const S = [{ text: "Tom met Ann and she smiled", offset: 0 }]; const M = [{ ref: "tom", start: 0, end: 3 }, { ref: "ann", start: 8, end: 11 }];
  const cls = { clauses: [[[8, 11], [0, 3]]], subjects: [[8, 11]], coArgument: true }; // Ann is the subject here, Tom a sibling argument of the pronoun's clause
  const D = { window: 4, boost: 3, feed: 1, floor: 1, margin: 0, language: "en" };
  const base = resolvePronounsByPresence(S, M, D).bindings[0]?.referentId; const withSubj = resolvePronounsByPresence(S, M, { ...D, roles: { subjects: [[8, 11]], clauses: [], coArgument: false } }).bindings[0]?.referentId;
  assert.equal(base, "tom", "the first-mention proxy picks Tom"); assert.equal(withSubj, "ann", "the case-read subject picks Ann");
  const rolesOnly = rolesFor([{ subject: { start: 8, end: 11 }, object: { start: 0, end: 3 }, dative: null }], { coArgument: true }); assert.deepEqual(rolesOnly.subjects, [[8, 11]]); assert.equal(rolesOnly.coArgument, true);
});
test("absent roles leave the rung byte-identical", () => {
  const S = [{ text: "Tom met Ann. She smiled.", offset: 0 }, { text: "He left.", offset: 25 }]; const M = [{ ref: "tom", start: 0, end: 3 }, { ref: "ann", start: 8, end: 11 }]; const D = { window: 4, boost: 2, feed: 1, floor: 1, margin: 0, language: "en" };
  assert.equal(JSON.stringify(resolvePronounsByPresence(S, M, D)), JSON.stringify(resolvePronounsByPresence(S, M, { ...D, roles: null })));
});
test("dropped subjects: Greek binds them by default (the read carries proDrop), English and other stems carry none, and the profile states the Greek measurement", { skip: !HAVE }, async () => {
  const g = readToWeft(GRC.repeat(4), { language: "grc", address: "t:pd" }); assert.ok(Array.isArray(g.proDrop)); assert.ok(g.proDrop.every((b) => b.at[0] < b.at[1] && b.ref)); assert.equal(g.competency.proDrop.status, "bound"); assert.equal(g.competency.proDrop.precision, 0.551);
  const off = readToWeft(GRC.repeat(4), { language: "grc", address: "t:pd", readerOptions: { caseProDrop: "off" } }); assert.equal(off.proDrop, undefined); assert.equal(JSON.stringify(off.pronounsPresence), JSON.stringify(g.pronounsPresence), "the overt bindings do not move");
  const e = readToWeft("Bert walked into the room and he sat down. ".repeat(20), { language: "eng", address: "t:e2" }); assert.equal(e.proDrop, undefined); assert.equal(e.competency.proDrop.status, "not_applicable");
});
