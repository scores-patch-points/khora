import test from "node:test";
import assert from "node:assert/strict";
import { lintClaims, formLaws, CLAIM_LAWS, dominantTag } from "./claim-lint.js";

let n = 0;
const sp = (subj, pred, obj, text, polarity = "+") => ({ id: `s${n++}`, address: `px_t/text@h#b${n * 10}-${n * 10 + 5}`, text, claim: { subj, pred, obj, polarity } });

test("a sense-making claim passes the form laws", () => {
  assert.deepEqual(formLaws(sp("The council", "approved", "the budget", "The council approved the budget on Tuesday.")), []);
});

test("CL1: no subject, no predicate, a question, or a relation of a thing to itself", () => {
  assert.ok(formLaws(sp("", "approved", "the budget", "approved the budget.")).includes("CL1"));
  assert.ok(formLaws(sp("The council", "", "the budget", "The council the budget.")).includes("CL1"));
  assert.ok(formLaws(sp("The council", "approved", "the budget", "Did the council approve the budget?")).includes("CL1"));
  assert.ok(formLaws(sp("The council", "is", "the council", "The council is the council.")).includes("CL1"));
});

test("CL2: a claim whose terms are not in its own bytes is refused", () => {
  assert.ok(formLaws(sp("The council", "approved", "the budget", "Weather was mild all week.")).includes("CL2"));
  assert.ok(formLaws(sp("The council", "approved", "the lease", "The council approved the budget on Tuesday.")).includes("CL2"), "the object is not stated");
});

test("CL3: a subject with no content token (a bare function word) is not a thing", () => {
  assert.ok(formLaws(sp("it", "approved", "the budget", "It approved the budget.")).includes("CL3"));
  assert.ok(!formLaws(sp("fold", "stands", "on bytes", "The fold stands on bytes.")).includes("CL3"));
});

test("lintClaims refuses typed and keeps the sound, with counts", () => {
  const good = sp("The council", "approved", "the budget", "The council approved the budget.");
  const bad = sp("it", "did", "that", "It did that.");
  const r = lintClaims([good, bad]);
  assert.equal(r.counts.sound, 1);
  assert.equal(r.refused[0].id, bad.id);
  assert.ok(r.refused[0].laws.length > 0);
});

test("CL4: a cycle in the claim graph is flagged, not silently dropped", () => {
  const a = sp("Alpha", "supports", "Beta", "Alpha supports Beta.");
  const b = sp("Beta", "supports", "Gamma", "Beta supports Gamma.");
  const c = sp("Gamma", "supports", "Alpha", "Gamma supports Alpha.");
  const r = lintClaims([a, b, c]);
  assert.equal(r.counts.sound, 3, "the cycle does not remove claims");
  assert.ok(r.logos.cycle, "a cycle is reported");
  assert.equal(r.flagged.length, 3);
  assert.ok(r.flagged.every((f) => f.laws.includes("CL4")));
});

test("every law names its giver and its kind", () => {
  for (const [id, law] of Object.entries(CLAIM_LAWS)) { assert.ok(law.giver, id); assert.ok(["form", "logos"].includes(law.kind), id); }
});

test("declared relations reach the logos lint, but only with a named giver", () => {
  const a = sp("Maria", "born", "Lisbon", "Maria was born in Lisbon.");
  const b = sp("Maria", "born", "Porto", "Maria was born in Porto.");
  const none = lintClaims([a, b]);
  assert.equal(none.flagged.length, 0, "undeclared: convicts nobody");
  const withGiver = lintClaims([a, b], { declared: { functional: [{ rel: "born", role: "ARG1", giver: "the user, 2026-10-14" }] } });
  assert.deepEqual(withGiver.logos.declared.used, [{ kind: "functional", rel: "born", giver: "the user, 2026-10-14" }]);
  assert.ok(withGiver.flagged.length >= 1, "a one-valued relation with two values is flagged");
  assert.equal(withGiver.counts.sound, 2, "flagged, not refused");
  const noGiver = lintClaims([a, b], { declared: { functional: [{ rel: "born" }, "born"] } });
  assert.equal(noGiver.logos.declared.ignored.length, 2);
  assert.equal(noGiver.flagged.length, 0);
});

test("CL6: with a received POS prior the predicate must be a verb or auxiliary; without one the law does not run", () => {
  const prior = { forms: { as: { ADP: 438, SCONJ: 388, ADV: 218 }, cell: { NOUN: 13 }, again: { ADV: 134 }, approved: { VERB: 40 }, are: { AUX: 1162, VERB: 116 } } };
  assert.equal(dominantTag(prior, "As"), "ADP");
  assert.equal(dominantTag(prior, "zzzz"), null, "unknown forms are not judged");
  const prep = sp("The council", "as", "a body", "The council as a body.");
  const noun = sp("The council", "cell", "a unit", "The council cell a unit.");
  const verb = sp("The council", "approved", "the budget", "The council approved the budget.");
  const cop = sp("The reader", "are", "witnesses", "The readers are witnesses.");
  const unknown = sp("The council", "zzzz", "the budget", "The council zzzz the budget.");
  assert.ok(formLaws(prep, prior).includes("CL6"));
  assert.ok(formLaws(noun, prior).includes("CL6"));
  assert.ok(!formLaws(verb, prior).includes("CL6"));
  assert.ok(!formLaws(cop, prior).includes("CL6"), "a copula is a relation");
  assert.ok(!formLaws(unknown, prior).includes("CL6"), "the prior only refuses what it knows");
  assert.ok(!formLaws(prep).includes("CL6"), "no prior: the law does not run");
  const r = lintClaims([prep, noun, verb], { posPrior: prior });
  assert.equal(r.counts.sound, 1);
  assert.equal(r.logos.cl6, "run");
  assert.equal(lintClaims([prep]).logos.cl6, "not run: no received POS prior");
});
