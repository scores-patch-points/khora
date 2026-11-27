// salience-prior.test.mjs — the ranking, the stated confidence, the ask-or-bind decision, the refusal to state a confidence for "it", and the shipped weights' provenance (licence gate).
import test from "node:test"; import assert from "node:assert/strict";
import fs from "node:fs";
import { makeSaliencePrior, loadSalienceWeights, roleOfDeprel, WEIGHTS_FILE } from "./salience-prior.js";
// a small table by hand so the tests do not depend on a build: for a SUBJECT anaphor a subject of the sentence before is worth +1, an object +0.2, absent -0.5; this sentence's subject +2; the count +0.3
const slots = (s0, s1, s2) => [...s0, ...s1, ...s2];
const w = new Array(13).fill(0); w.splice(0, 4, 2, 0.1, 0, -2); w.splice(4, 4, 1, 0.2, -0.3, -0.5); w.splice(8, 4, 0.4, 0, 0, 0); w[12] = 0.3;
const T = { schema: "SaliencePrior@1", weights: { S: w, O: w, X: w }, measured: { calibration: { persons: [{ lo: 0.4, hi: 0.6, n: 40, right: 20 }, { lo: 0.6, hi: 0.8, n: 10, right: 7 }, { lo: 0.8, hi: 1, n: 60, right: 48 }], zero: [{ lo: 0.8, hi: 1, n: 100, right: 77 }] } } };
const P = makeSaliencePrior({ table: T });
test("roles are the reader's: nsubj* is S, obj and iobj are O, anything else X", () => {
  assert.deepEqual(["nsubj", "nsubj:pass", "obj", "iobj", "obl", "nmod:poss", "", undefined].map(roleOfDeprel), ["S", "S", "O", "O", "X", "X", "X", "X"]);
});
test("a candidate that was the subject of the sentence before outranks an object of it; the probabilities sum to one", () => {
  const r = P.rank({ anaphorRole: "S", candidates: [{ id: "casey", roles: ["-", "S", "-"], mentions: 1 }, { id: "jordan", roles: ["-", "O", "-"], mentions: 1 }] });
  assert.equal(r.top, "casey"); assert.ok(r.ranked[0].p > r.ranked[1].p); assert.ok(Math.abs(r.ranked.reduce((a, x) => a + x.p, 0) - 1) < 1e-9); assert.ok(r.confidence > 0.5 && r.margin > 0);
});
test("a candidate that is the subject of this sentence so far, and one mentioned more often, are preferred", () => {
  assert.equal(P.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: ["S", "-", "-"], mentions: 1 }, { id: "b", roles: ["-", "S", "-"], mentions: 1 }] }).top, "a");
  assert.equal(P.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: ["-", "O", "-"], mentions: 1 }, { id: "b", roles: ["-", "O", "-"], mentions: 4 }] }).top, "b");
});
test("two candidates that look the same hold half each: nothing is above one half, so it asks", () => {
  const r = P.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: ["-", "S", "-"], mentions: 1 }, { id: "b", roles: ["-", "S", "-"], mentions: 1 }] }), d = P.decide(r);
  assert.equal(r.confidence, 0.5); assert.equal(d.bind, false); assert.match(d.why, /ask/); assert.equal(P.decide(P.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: ["S", "S", "S"], mentions: 3 }, { id: "b", roles: ["-", "-", "-"], mentions: 1 }] })).bind, true);
});
test("the stated confidence carries what that confidence has been on held-out data, and refuses one for it", () => {
  const r = P.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: ["S", "S", "S"], mentions: 3 }, { id: "b", roles: ["-", "-", "-"], mentions: 1 }] });
  assert.ok(r.confidence >= 0.8); assert.deepEqual(r.calibrated, { rate: 0.8, of: 60, bin: "0.8-1.0" }); assert.equal(P.rank({ anaphorRole: "S", kind: "it", candidates: [{ id: "a", roles: ["S", "S", "S"], mentions: 3 }, { id: "b", roles: ["-", "-", "-"], mentions: 1 }] }).calibrated, null);
  assert.equal(P.rank({ anaphorRole: "S", kind: "zero", candidates: [{ id: "a", roles: ["S", "S", "S"], mentions: 3 }, { id: "b", roles: ["-", "-", "-"], mentions: 1 }] }).calibrated.of, 100);
});
test("a missing table or no candidates is said, not guessed", () => {
  const none = makeSaliencePrior({ table: null }); assert.equal(none.missing, true); assert.match(none.rank({ anaphorRole: "S", candidates: [{ id: "a", roles: [] }] }).open, /no salience weights/);
  assert.equal(P.rank({ anaphorRole: "S", candidates: [] }).open, "no candidates"); assert.match(P.rank({ anaphorRole: "Q", candidates: [{ id: "a" }] }).open, /no role/); assert.equal(none.decide(none.rank({})).bind, false);
});
const real = loadSalienceWeights();
test("the shipped weights: trained only on corpora whose licence is not non-commercial, each with its sha256, and measured on dev (skipped if not built)", { skip: real ? false : "run scripts/build-salience-prior.mjs" }, () => {
  assert.equal(real.provenance.allowNoncommercial, false); for (const t of real.provenance.trainedOn) { assert.ok(t.licence && !/NC/.test(t.licence), `${t.name}: ${t.licence}`); assert.match(t.sha256, /^[0-9a-f]{64}$/); }   // regex-ok: a licence name and a hash
  assert.ok(real.provenance.notTrainedOn.some((x) => /GUM/.test(x.name)) && real.provenance.notTrainedOn.some((x) => /Czech/.test(x.name)));   // regex-ok: a corpus name
  assert.ok(real.measured.persons.cases > 100 && real.measured.persons.rate > 0.6, "held-out persons"); assert.equal(real.measured.it.note.startsWith("NOT calibrated"), true);
});
test("the shipped weights on the owner's example: after 'Casey met Jordan.' the pronoun 'she' (a subject) goes to Casey, the subject, with its confidence and what that has been", { skip: real ? false : "needs the built weights" }, () => {
  const S = makeSaliencePrior(), r = S.rank({ anaphorRole: "S", candidates: [{ id: "casey", roles: ["-", "S", "-"], mentions: 1 }, { id: "jordan", roles: ["-", "O", "-"], mentions: 1 }] });
  assert.equal(r.top, "casey"); assert.ok(r.confidence > 0.5); assert.ok(r.calibrated === null || (r.calibrated.rate > 0.4 && r.calibrated.of >= 20)); assert.ok(fs.existsSync(WEIGHTS_FILE));
});
