import test from "node:test";
import assert from "node:assert/strict";
import { frameFromRecords, judgeFrame } from "./claim-frame.js";

// hand-built EOTRich@1-shaped sentence: "we [may|did not] enter into an agreement with Vanda" / "we licensed from Vanda"
const rec = ({ verb = "enter", markers = [], neg = false, tense = "Past", prep = "with", name = "Vanda" } = {}) => ({
  meaning: {
    nodes: [
      { key: 1, lemma: verb, upos: "VERB", feats: [{ name: "Tense", value: tense }], markers: markers.map((_, i) => 10 + i) },
      { key: 2, lemma: "we", upos: "PRON" }, { key: 3, lemma: name.toLowerCase(), upos: "PROPN", markers: [20] },
      ...(neg ? [{ key: 4, lemma: "not", upos: "PART", feats: [{ name: "Polarity", value: "Neg" }] }] : []),
    ],
    markers: [...markers.map((l, i) => ({ key: 10 + i, lemma: l })), { key: 20, lemma: prep }],
    arcs: [{ from: null, to: 1, rel: "root" }, { from: 1, to: 2, rel: "nsubj" }, { from: 1, to: 3, rel: "obl" }, ...(neg ? [{ from: 1, to: 4, rel: "advmod" }] : [])],
  },
});
test("a made agreement raises nothing", () => { assert.deepEqual(judgeFrame(frameFromRecords([rec()], ["Vanda"]), "license-agreement"), []); });
test("a negated clause is an error", () => { const j = judgeFrame(frameFromRecords([rec({ neg: true })], ["Vanda"]), "license-agreement"); assert.equal(j[0].level, "error"); assert.match(j[0].why, /negated/); });
test("a modal on a making verb is an error", () => { const f = frameFromRecords([rec({ markers: ["may"] })], ["Vanda"]); assert.deepEqual(f.modal, ["may"]); assert.equal(judgeFrame(f, "license-agreement")[0].level, "error"); });
test("an ending verb is a flag", () => { const f = frameFromRecords([rec({ verb: "terminate" })], ["Vanda"]); assert.equal(f.ending, true); assert.equal(judgeFrame(f, "license-agreement")[0].level, "flag"); });
test("direction: 'from' contradicts licensor-out, 'to' contradicts licensor-in", () => {
  assert.equal(judgeFrame(frameFromRecords([rec({ verb: "license", prep: "from" })], ["Vanda"]), "licensor-out")[0].level, "error");
  assert.equal(judgeFrame(frameFromRecords([rec({ verb: "grant", prep: "to" })], ["Vanda"]), "licensor-in")[0].level, "error");
  assert.deepEqual(judgeFrame(frameFromRecords([rec({ verb: "grant", prep: "to" })], ["Vanda"]), "licensor-out"), []);
});
test("a caller's own vocabulary replaces the defaults", () => { const f = frameFromRecords([rec({ verb: "pledge", markers: ["shall"] })], ["Vanda"], { vocab: { modals: ["shall"], creation: ["pledge"], ending: [], negators: ["not"] } }); assert.deepEqual(f.modal, ["shall"]); });
test("no record, or no alias found, gives null", () => { assert.equal(frameFromRecords([], ["Vanda"]), null); assert.equal(frameFromRecords([rec()], ["Zeta"]), null); });
