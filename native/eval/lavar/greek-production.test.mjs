// greek-production.test.mjs — CONFORMANCE for the production Ancient-Greek
// reader and the grc register gate (2026-10-08).
//
// The fixture is the REAL opening of the Zenodotus Greek Iliad (polytonic),
// first ~2000 chars. The reader is the recovered seam wired through the ONE
// HOME FOR THE PRIORS (janus/priors). What is asserted is the seam's own
// posture, not a tuned output: clauses are recovered, a pro-drop subject is
// typed null and never fabricated, an overt nominative resolves to a subject,
// and the detector can reach grc where it used to answer ell.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { readGreek, PRIORS_DIR } from "./greek-production.mjs";
import { caseOf } from "./greek.mjs";
import { identifyLanguage } from "../../the-fold/langid.mjs";
import { detectLanguage } from "../../the-fold/language-grammar.js";

const FIXTURE = "/Users/mlacy/Documents/3.0/Zenodotus/11-multi-language/greek-originals/homer-iliad.txt";
const raw = fs.readFileSync(FIXTURE, "utf8");
const TEXT = raw.slice(0, 2000);

test("(d) POSITIONAL: the fixture is the Greek Iliad", () => {
  assert.equal(path.basename(FIXTURE), "homer-iliad.txt");
  assert.ok(FIXTURE.includes("greek-originals"), "the fixture is the Greek-originals corpus");
  assert.ok(raw.includes("Ὅμηρος") && raw.includes("Ἰλιάς"), "the header names Homer's Iliad");
  assert.ok(TEXT.includes("Μῆνιν ἄειδε"), "the proem opens the fixture");
  // Greek script, and not a Latin translation of it.
  const greek = (TEXT.match(/\p{Script=Greek}/gu) ?? []).length;
  const latin = (TEXT.match(/\p{Script=Latin}/gu) ?? []).length;
  assert.ok(greek > latin * 4, `Greek script dominates (greek ${greek} vs latin ${latin})`);
});

test("the priors load from the ONE home: janus/priors", () => {
  assert.ok(PRIORS_DIR.endsWith(path.join("janus", "priors")), PRIORS_DIR);
  assert.ok(fs.existsSync(path.join(PRIORS_DIR, "pos-grc.json")));
  assert.ok(fs.existsSync(path.join(PRIORS_DIR, "case-marking-grc.json")));
});

test("(a) the reader recovers at least one clause on the real opening", () => {
  const r = readGreek(TEXT, { articleMode: "soft" });
  assert.equal(r.language, "grc");
  assert.ok(r.verbs.length >= 1, "the prior-confirmed verbs that occur are heard");
  assert.ok(r.clauses.length >= 1, `expected >=1 clause, got ${r.clauses.length}`);
});

test("(b) at least one pro-drop subject is typed null — never fabricated", () => {
  const r = readGreek(TEXT, { articleMode: "soft" });
  const dropped = r.clauses.filter((c) => c.subject === null);
  assert.ok(dropped.length >= 1, "a finite verb with no overt nominative is a complete clause");
  assert.ok(r.gaps.length >= 1, "the pro-drop clauses are disclosed as gaps");
  for (const g of r.gaps) {
    assert.equal(g.subject, null, "a gap subject is null, not invented");
    assert.equal(g.kind, "pro-drop");
  }
  // The anti-self-referent law, made explicit: a dropped subject has no ref.
  for (const c of dropped) assert.equal(c.subjectRef, null, "no referent is fabricated for a dropped subject");
});

test("(c) a known overt nominative resolves to a subject (not null)", () => {
  const casePrior = JSON.parse(fs.readFileSync(path.join(PRIORS_DIR, "case-marking-grc.json"), "utf8"));
  // The −οι ending is Nom|Plur at a decisive share in the prior; θεοὶ is the
  // divine subject of the opening's address.
  const c = caseOf("θεοὶ", casePrior, { articleMode: "soft", minShare: 0.6, minCount: 20 });
  assert.ok(c, "θεοὶ is attested and cases");
  assert.equal(c.case, "Nom");

  const r = readGreek(TEXT, { articleMode: "soft" });
  const overt = r.clauses.filter((x) => x.subject && x.subject.case === "Nom");
  assert.ok(overt.length >= 1, "an overt nominative gives a subject, not null");
  assert.ok(overt.some((x) => x.subject.head === "θεοὶ"), "θεοὶ reads as an overt nominative subject");
  // The reader never emits a null AND a resolved subject for the same clause.
  for (const x of r.clauses) if (x.subject) assert.notEqual(x.subject.case, null);
});

test("readGreek is deterministic and mechanical", () => {
  const a = readGreek(TEXT, { articleMode: "soft" });
  const b = readGreek(TEXT, { articleMode: "soft" });
  assert.equal(a.clauses.length, b.clauses.length);
  assert.deepEqual(a.verbs, b.verbs);
  assert.deepEqual(a.clauses.map((c) => c.verb), b.clauses.map((c) => c.verb));
});

test("grc is reachable: the polytonic register detects as grc", () => {
  const d = identifyLanguage(TEXT);
  assert.equal(d.language, "grc", "Ancient Greek polytonic no longer defaults to ell");
  assert.equal(d.register, "ancient");
  assert.equal(detectLanguage(TEXT).language, "grc", "the production detector reaches grc too");
});

test("the ell path is not broken: monotonic Modern Greek still reads ell", () => {
  const modern = "Το γρήγορο καφέ αλεπού πηδάει πάνω από τον τεμπέλη σκύλο. Ο ήλιος λάμπει σήμερα το πρωί.";
  const d = identifyLanguage(modern);
  assert.equal(d.language, "ell");
  assert.equal(d.register, "modern");
});

test("a caller that NAMES grc bypasses the ell default", () => {
  const modern = "Το γρήγορο καφέ αλεπού πηδάει πάνω από τον τεμπέλη σκύλο.";
  const d = identifyLanguage(modern, { language: "grc" });
  assert.equal(d.language, "grc");
  assert.equal(d.forced, true);
  assert.equal(detectLanguage(modern, { language: "grc" }).language, "grc");
  // A named language with no prior is a typed gap, never a silent fall-back.
  const gap = identifyLanguage(modern, { language: "xyz" });
  assert.equal(gap.language, null);
  assert.equal(gap.confident, false);
  assert.match(gap.gap, /no prior/);
});
