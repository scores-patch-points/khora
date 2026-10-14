import test from "node:test";
import assert from "node:assert/strict";
import { lintClaims, formLaws, CLAIM_LAWS } from "./claim-lint.js";

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
