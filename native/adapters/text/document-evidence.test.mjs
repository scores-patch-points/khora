import test from "node:test";
import assert from "node:assert/strict";
import { readDocumentEvidence, classifyWithDocument, findDefinitions } from "./document-evidence.js";
import { classifyWord } from "./wordclass.js";

const posPrior = {
  forms: { the: { DET: 9 }, shall: { AUX: 9 }, pay: { VERB: 9 }, to: { ADP: 9 }, and: { CCONJ: 9 }, of: { ADP: 9 }, is: { AUX: 9 }, by: { ADP: 9 }, between: { ADP: 9 }, agreement: { NOUN: 9 }, this: { DET: 9 }, county: { NOUN: 5, PROPN: 3 }, metropolitan: { ADJ: 3 }, party: { NOUN: 9 }, with: { ADP: 9 }, work: { NOUN: 5, VERB: 4 }, for: { ADP: 9 }, in: { ADP: 9 }, school: { NOUN: 9 }, schools: { NOUN: 9 }, public: { ADJ: 9 }, nashville: { PROPN: 9 }, government: { NOUN: 9 }, a: { DET: 9 }, will: { AUX: 9 }, inspect: { VERB: 9 }, ordinance: { NOUN: 4 } },
  lexicon: { classes: { NOUN: ["licensee", "contractor"] } },
};
const classify = (f) => classifyWord(f, { posPrior });

const DOC = [
  "This Agreement is between the Metropolitan Government of Nashville and Davidson County (“Metro”) and Acme Services LLC (the “Contractor”).",
  "“Grantee” means the party that signs this Agreement.",
  "The Metropolitan Nashville Public Schools (MNPS) shall inspect the work.",
  "Metro shall pay the Contractor. The Contractor shall work with MNPS in Davidson for Metro.",
  "Metro will pay Davidson. MNPS shall pay Davidson. The Grantee shall pay Metro and the Contractor.",
  "The Ordinance is in force. The ordinance applies. An ordinance, the ordinance, a lawful ordinance, any ordinance. Zorbax pays.",
].join("\n\n");

test("definitions are found as referent bindings with ranges back into the text", () => {
  const defs = findDefinitions(DOC);
  const by = Object.fromEntries(defs.map((d) => [d.term, d]));
  assert.equal(by.Metro.pattern, "parenthetical");
  assert.equal(by.Metro.kind, "name");
  assert.equal(by.Contractor.pattern, "parenthetical");
  assert.equal(by.Grantee.pattern, "means");
  assert.equal(by.Grantee.kind, "role");
  assert.equal(by.MNPS.pattern, "abbreviation");
  assert.match(by.MNPS.definiens, /Metropolitan Nashville Public Schools/);
  for (const d of defs) assert.equal(DOC.slice(d.at[0], d.at[1]), d.term.replace(/[,.;]+$/, ""));
});

test("an abbreviation whose letters are not the initials of the long form is not a definition", () => {
  assert.equal(findDefinitions("The Board of Zoning Appeals (XYZ) met.").length, 0);
});

test("a parenthetical that is not a definition lead-in is not read as one", () => {
  assert.equal(findDefinitions('See the clause (see “Exhibit A”) for terms.').length, 0);
});

test("a defined, always-capitalised form settles as a candidate with the evidence that earned it", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  const r = Object.fromEntries(doc.readings.map((x) => [x.form, x]));
  assert.equal(r.MNPS.leader, "PROPN");
  assert.equal(r.MNPS.standing, "candidate");
  assert.ok(r.MNPS.evidence.every((e) => e.at.length === 2));
  assert.ok(r.Davidson.candidates[0].upos === "PROPN");
  const mass = r.MNPS.candidates.reduce((a, k) => a + k.mass, 0);
  assert.ok(Math.abs(mass - 1) < 1e-9);
});

test("the Born mass keeps ambiguity: a defined role noun is a candidate set, not a forced class", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  const r = doc.readings.find((x) => x.form === "Grantee");
  assert.ok(r.candidates.some((k) => k.upos === "NOUN"));
  assert.ok(r.candidates.some((k) => k.upos === "PROPN"));
});

test("a lowercase habit blocks a settle: 'Ordinance' is mostly written lowercase, so no class is asserted", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  // 'ordinance' is placed by classify, so it is not a target at all — and a target with lowercase habit never settles as a name
  assert.equal(doc.readings.some((x) => x.form === "Ordinance"), false);
  const doc2 = readDocumentEvidence("Zebra pays. A zebra, the zebra, any zebra, one zebra, a zebra. Zebra again.", { classify: () => ({ found: false, candidates: [] }) });
  const z = doc2.readings.find((x) => x.form === "Zebra");
  assert.equal(z.settled, false);
});

test("the floors are derived from the document itself, and the schema states its one declared constant", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  assert.match(doc.floors.derivedFrom, /median over \d+ forms|declared bootstrap/);
  assert.equal(doc.alpha, 1);
  assert.equal(doc.unit, "utf16");
});

test("evidence that moves no verdict is left out of the reading and counted as redundant", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  const m = doc.readings.find((x) => x.form === "Metro");
  const kinds = [...m.evidence.map((e) => e.kind), ...m.redundant];
  assert.ok(kinds.includes("definition") && kinds.includes("capitalisation"));
  assert.equal(new Set([...m.evidence.map((e) => e.kind)].filter((k) => m.redundant.includes(k))).size, 0);
});

test("classifyWithDocument answers a settled form from the document and leaves the rest a typed gap", () => {
  const doc = readDocumentEvidence(DOC, { classify });
  const c = classifyWithDocument(classify, doc);
  const mnps = c("Metro,");
  assert.equal(mnps.found, true);
  assert.equal(mnps.attested, "document");
  assert.equal(mnps.via[0].step, "document-evidence");
  assert.equal(c("the").attested, undefined); // a form the base chain places is untouched
  assert.equal(c("Qwxzt").found, false);
});

test("no prior is assumed: classify must be injected", () => {
  assert.throws(() => readDocumentEvidence("x"), /classify is injected/);
});

const none = () => ({ found: false, candidates: [] });

const known = (f) => ({ nashville: { found: true, total: 9, candidates: [{ upos: "PROPN", share: 1 }] }, contract: { found: true, total: 9, candidates: [{ upos: "NOUN", share: 1 }] } })[f.toLowerCase()] ?? { found: false, candidates: [] };
const calibratedDoc = [
  ...Array.from({ length: 25 }, () => "We call Nashville today."),
  ...Array.from({ length: 25 }, () => "We read the Contract today."),
  "We pay the Widget fee. We send the Widget now. We use the Widget. We call Zenith today. We sign with Zenith. We trust Zenith. We ask Zenith.",
].join("\n");

test("determiner-frame, calibrated in the document: a bare form reads as a name, one that takes 'the' as a role noun", () => {
  const doc = readDocumentEvidence(calibratedDoc, { classify: known });
  assert.ok(doc.reliability["determiner-frame"] > 0.9);
  const w = doc.readings.find((x) => x.form === "Widget");
  const z = doc.readings.find((x) => x.form === "Zenith");
  assert.equal(w.leader, "NOUN");
  assert.equal(z.leader, "PROPN");
});

test("a signal that does not separate the document's own known names from its known nouns is given no say", () => {
  // here BOTH the known name and the known noun appear bare (a heading-heavy genre): the frame cannot discriminate
  const flat = [...Array.from({ length: 25 }, () => "We call Nashville today."), ...Array.from({ length: 25 }, () => "We read Contract today."), "We call Zenith today. We call Zenith. Zenith."].join("\n");
  const doc = readDocumentEvidence(flat, { classify: known });
  assert.equal(doc.reliability["determiner-frame"], 0);
  const z = doc.readings.find((x) => x.form === "Zenith");
  assert.equal([...z.evidence, ...z.redundant.map((k) => ({ kind: k }))].some((e) => e.kind === "determiner-frame"), false);
});

test("with too few calibrators the document cannot vouch for a frame signal, so none is used", () => {
  const doc = readDocumentEvidence("Pay the Widget fee. Zenith pays.", { classify: known });
  assert.equal(doc.reliability["determiner-frame"], 0);
});

test("an organisation designator, an honorific and an apposition each make the token beside them a name", () => {
  const t = "We hired Vantage Corp today. Then Mayor Gentry spoke. Then Brightpath, a Tennessee nonprofit corporation, signed.";
  const doc = readDocumentEvidence(t, { classify: none });
  const kinds = (f) => doc.readings.find((x) => x.form === f);
  assert.equal(kinds("Vantage").leader, "PROPN");
  assert.equal(kinds("Gentry").leader, "PROPN");
  assert.equal(kinds("Brightpath").leader, "PROPN");
  for (const f of ["Vantage", "Gentry", "Brightpath"]) assert.ok(kinds(f).evidence.some((e) => ["organisation-designator", "honorific", "apposition"].includes(e.kind)) || kinds(f).redundant.length);
});

test("a sentence-initial capital is position, not evidence: it casts no frame vote", () => {
  const doc = readDocumentEvidence("Widget costs money. Widget is here. Widget again.", { classify: none });
  const w = doc.readings.find((x) => x.form === "Widget");
  assert.equal(w?.evidence.some((e) => e.kind === "determiner-frame") ?? false, false);
});

test("an external witness (corpus, ledger) is one more kind of evidence, drawn through the injected hook", () => {
  const witnesses = [{ kind: "ledger-vendor", lookup: (key) => (key === "acme" ? { votes: { PROPN: 1 }, detail: { source: "contract ledger", contracts: 41 }, at: null } : null) }];
  const doc = readDocumentEvidence("Acme pays. Pay Acme. Acme again.", { classify: none, witnesses });
  const a = doc.readings.find((x) => x.form === "Acme");
  assert.ok([...a.evidence.map((e) => e.kind), ...a.redundant].includes("ledger-vendor"));
  assert.equal(a.leader, "PROPN");
});

test("difference that makes a difference: with many agreeing signals, a redundant one is not carried", () => {
  const t = "Mayor Gentry spoke. Mayor Gentry left. Call Gentry. Gentry, a Tennessee corporation, signed. Gentry Inc sued. Pay Gentry. See Gentry.";
  const doc = readDocumentEvidence(t, { classify: none });
  const g = doc.readings.find((x) => x.form === "Gentry");
  assert.ok(g.evidence.length + g.redundant.length >= 3);
  assert.ok(g.redundant.length >= 1);
});

test("a name run does not cross a parenthetical or a quoted term", () => {
  const t = "with the Metropolitan Government of Nashville and Davidson County (“Metro”) and Acme Services LLC (the “Contractor”) hereby";
  const doc = readDocumentEvidence(t, { classify: () => ({ found: false, candidates: [] }) });
  const org = doc.nameRuns.find((r) => r.via.includes("LLC"));
  assert.equal(org.text, "Acme Services LLC");
});

test("a legal-form designator marks the run an occurrence of a name; a form also written lowercase is not promoted", () => {
  const t = "We hired Rock Solid Security, Inc. today. Security is needed. Provide security. The security plan. More security.";
  const doc = readDocumentEvidence(t, { classify: () => ({ found: false, candidates: [] }) });
  assert.ok(doc.nameRuns.some((r) => r.text.startsWith("Rock Solid Security")));
  const sec = doc.readings.find((x) => x.form === "Security");
  assert.ok(!sec || ![...sec.evidence].some((e) => e.kind === "organisation-designator"));
});

test("a defined term that is a word of its own definiens is a common-noun short form, not a name", () => {
  const defs = findDefinitions('“Executive Director” or “Director” means the Executive Director of The Fairgrounds. The GMO Allocation Fund (the “Fund”) is closed.');
  const by = Object.fromEntries(defs.map((d) => [d.term, d]));
  assert.equal(by.Fund.kind, "short-form");
});
