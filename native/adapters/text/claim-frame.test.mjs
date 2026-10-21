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

import { engineRelationsFor } from "../../the-fold/reader-bundle.js";
import { makeFramer } from "./claim-frame.js";
const TEXT = "In 2024, we entered into a license agreement with Vanda Pharmaceuticals Inc. in March. Later, we terminated the license agreement with Vanda Pharmaceuticals Inc. for cause.";
const strip = (r) => JSON.parse(JSON.stringify(r, (k, v) => (k === "frame" || k === "frames" ? undefined : v)));
test("framer is additive: with a framer the report equals the report without it once `frame` is removed", () => {
  const plain = engineRelationsFor([TEXT]).read(TEXT);
  const framed = engineRelationsFor([TEXT], { framer: () => ({ negated: false, modal: [], ending: false, dir: null, root: "x" }) }).read(TEXT);
  assert.deepEqual(strip(framed), strip(plain));
  assert.ok(plain.claims.every((c) => c.frame === undefined));
});
test("a framer that throws leaves the claims as they were", () => {
  const plain = engineRelationsFor([TEXT]).read(TEXT), framed = engineRelationsFor([TEXT], { framer: () => { throw new Error("no"); } }).read(TEXT);
  assert.deepEqual(framed, plain);
});
test("makeFramer maps a parse to the claim's frame", () => {
  const parse = () => [{ meaning: { nodes: [{ key: 1, lemma: "enter", upos: "VERB", feats: [] }, { key: 3, lemma: "vanda", upos: "PROPN", markers: [20] }, { key: 4, lemma: "not", upos: "PART", feats: [{ name: "Polarity", value: "Neg" }] }], markers: [{ key: 20, lemma: "with" }], arcs: [{ from: null, to: 1, rel: "root" }, { from: 1, to: 3, rel: "obl" }, { from: 1, to: 4, rel: "advmod" }] } }];
  const f = makeFramer(parse)("we did not enter into an agreement with Vanda", { end1: "we", end2: "Vanda" });
  assert.equal(f.negated, true); assert.equal(f.root, "enter");
});
test("foldFrameNegation without a framer changes nothing", () => {
  const plain = engineRelationsFor([TEXT]).read(TEXT), folded = engineRelationsFor([TEXT], { foldFrameNegation: true }).read(TEXT);
  assert.deepEqual(folded, plain);
});
test("a framer that says 'negated' flips polarity only when foldFrameNegation is on", () => {
  const neg = () => ({ negated: true, modal: [], ending: false, dir: null, root: "x" });
  const off = engineRelationsFor([TEXT], { framer: neg }).read(TEXT), on = engineRelationsFor([TEXT], { framer: neg, foldFrameNegation: true }).read(TEXT);
  assert.ok(off.claims.length > 0 && off.claims.every((c) => c.polarity === "+"));
  assert.ok(on.claims.some((c) => c.polarity === "-" && c.negationFolded === "frame"));
});
