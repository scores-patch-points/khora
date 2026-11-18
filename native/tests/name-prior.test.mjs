// The name ruling (adapters/text/name-prior.js) and its wiring into the canonical read (identity/novels PREREG-ROUND14.md).
import test from "node:test"; import assert from "node:assert/strict";
import { nonPersonalFromNames, loadNamePrior, MIN_EVIDENCE } from "../adapters/text/name-prior.js";
import { readToWeft } from "../the-fold/read-process.mjs";
const prior = { words: { tianjin: [0, 5], bert: [6, 0], mixed: [3, 4], once: [0, 1] } };
const cast = [{ ref: "a", mentionSpans: [[0, 7]] }, { ref: "b", mentionSpans: [[8, 12]] }, { ref: "c", mentionSpans: [[13, 18]] }, { ref: "d", mentionSpans: [[19, 23]] }, { ref: "e", mentionSpans: [[24, 29]] }];
const text = "Tianjin Bert mixed once zzzzz";
test("a being is non-personal only when not-person outweighs person over words the table knows, with at least the declared minimum", () => {
  const np = nonPersonalFromNames({ text, cast, prior });
  assert.ok(np.has("a")); assert.ok(!np.has("b")); assert.ok(np.has("c"), "3 person vs 4 not, 7 observations"); assert.ok(!np.has("d"), "one observation is below the minimum of two"); assert.ok(!np.has("e"), "an unknown word")
});
test("an unknown word rules nothing, and no table rules nothing", () => {
  assert.equal(nonPersonalFromNames({ text: "qqq", cast: [{ ref: "x", mentionSpans: [[0, 3]] }], prior }).size, 0); assert.equal(nonPersonalFromNames({ text, cast, prior: null }).size, 0);
});
test("the shipped English table loads and rules the places it knows", () => { const p = loadNamePrior(); assert.ok(p?.words && Object.keys(p.words).length > 1000); assert.equal(p.language, "eng"); });
const BERT = "Bert walked into the room and he sat down. Tianjin is a large city in the north of China. The city of Tianjin has a port, and it grows every year. Bert said that he liked Tianjin. Then he left the room and she stayed for a while. Bert came back later. Mary met Bert at the station, and she smiled as he arrived.";
test("the canonical English read applies the name ruling: it is recorded, and the typed no-ruling gap is not filed", () => {
  const w = readToWeft(BERT.repeat(2), { address: "t:bert", language: "eng" });
  assert.ok(w && !w.error && !w.skipped); assert.equal(w.presenceInputs?.nameRuling, true);
  assert.ok(!w.gaps.some((g) => g.gap === "pronoun_presence_no_nonpersonal_ruling"));
});
test("turning the ruling off restores the typed gap, so a read without a ruling says so", () => {
  const w = readToWeft(BERT.repeat(2), { address: "t:bert", language: "eng", readerOptions: { namePersonhood: null } });
  assert.ok(w.gaps.some((g) => g.gap === "pronoun_presence_no_nonpersonal_ruling"));
});
