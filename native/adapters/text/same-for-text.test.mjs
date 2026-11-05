// same-for-text — the text adapter, read by the real pipeline (readDocument + the parser's claims). Needs the janus priors (see the-fold/prior-source.mjs).
import { test as base } from "node:test";
import assert from "node:assert/strict";
import { sameFor } from "../../reading.js";

// THE READER MUST BE PRESENT. These tests read through the real pipeline, so they need the English priors the claims path loads: parser-eng-ewt.json,
// morphology-eng.json, pos-eng-lexicon.json (and, for the UD reader, ud-parser-eng-ewt.json.gz + unimorph-eng-pos.json.gz), all from janus main priors/,
// found through the prior door (KHORA_PRIORS_DIR, else <root>/janus/priors). Without them every test is SKIPPED with the reader's own gap, never failed.
const probe = await sameFor("Maria bought a car.", "Maria bought a car.");
const skip = probe.readerGap ? `the reader produced no claims (gaps: ${JSON.stringify(probe.unread)}): point KHORA_PRIORS_DIR at janus main priors/` : false;
const test = (name, fn) => base(name, { skip }, fn);

const cases = [
  ["a passive paraphrase is Same", "The council approved the plan in May.", "The plan was approved by the council in May.", "same"],
  ["the same text is Same", "Maria bought a red car.", "Maria bought a red car.", "same"],
  ["a changed agent is Other", "The council approved the plan.", "The mayor approved the plan.", "other"],
  ["a role swap is Other", "Brutus stabbed Caesar.", "Caesar stabbed Brutus.", "other"],
  ["a denial is Other", "The museum opened the new wing.", "The museum did not open the new wing.", "other"],
  ["reported against asserted is Other", "The Earth is round.", "Some people claim that the Earth is round.", "other"],
];
for (const [name, a, b, want] of cases) test(name, async () => assert.equal((await sameFor(a, b)).verdict, want));

test("an added part is NUL for a perspective that does not ask about it", async () => {
  const r = await sameFor("Maria bought a car.", "Maria bought a car from a dealer.", { questions: ["Who bought a car?", "What did Maria buy?"] });
  assert.equal(r.verdict, "same"); assert.ok(r.NUL.length >= 1);
});
test("the same added part is SIG for the reader's default perspective", async () => {
  const r = await sameFor("Maria bought a car.", "Maria bought a car from a dealer.");
  assert.equal(r.verdict, "other"); assert.ok(r.SIG.length >= 1);
});
test("a perspective that can ask nothing is a Gap", async () => assert.equal((await sameFor("Maria bought a car.", "Maria bought a car.", { questions: ["Where is the moon?"] })).verdict, "gap"));
test("two relations are one act only through a named giver", async () => {
  const lic = (x, y) => ([x, y].sort().join("~") === "nett~score" ? "same" : null);   // a stand-in giver: this test pins the route, not the lexicon
  assert.equal((await sameFor("Mbappé scored two goals.", "Mbappé netted two goals.")).verdict, "other");
  const r = await sameFor("Mbappé scored two goals.", "Mbappé netted two goals.", { licence: lic });
  assert.equal(r.verdict, "same"); assert.ok(r.standings.some((s) => s.kind === "same-as" && s.standing === "testimony" && s.giver === "the caller's licence"));
  assert.equal((await sameFor("Mbappé scored two goals.", "Kane netted two goals.", { licence: lic })).verdict, "other");
});

test("by cell: a passive paraphrase is Same for meaning and Other for surface", async () => {
  const a = "The council approved the plan in May.", b = "The plan was approved by the council in May.";
  assert.equal((await sameFor(a, b, { cells: "meaning" })).verdict, "same");
  assert.equal((await sameFor(a, b, { cells: "surface" })).verdict, "other");
});
test("by cell: a denial keeps the ties and changes the commitment", async () => {
  const r = await sameFor("The museum opened the new wing.", "The museum did not open the new wing.");
  const at = (k) => r.profile.find((x) => `${x.op}·${x.grain}@${x.level}` === k).outcome;
  assert.equal(at("CON·Figure@act"), "same"); assert.equal(at("DEF·Figure@claim"), "other"); assert.equal(r.verdict, "other");
});
test("by cell: a role swap keeps the beings and changes the ties", async () => {
  const r = await sameFor("Brutus stabbed Caesar.", "Caesar stabbed Brutus.");
  const at = (k) => r.profile.find((x) => `${x.op}·${x.grain}@${x.level}` === k).outcome;
  assert.equal(at("INS·Figure@end"), "same"); assert.equal(at("CON·Figure@act"), "other");
});

test("the verdict carries the reader's own stage report (readFull's wiring)", async () => {
  const r = await sameFor("The council approved the plan.", "The plan was approved by the council.");
  for (const side of ["first", "second"]) { const claims = r.wiring[side].find((w) => w.stage === "claims"); assert.equal(claims.status, "ran"); assert.ok(claims.claims >= 1); }
});
