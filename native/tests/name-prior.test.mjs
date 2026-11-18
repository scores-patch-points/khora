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
import { resolvePronounsByPresence } from "../adapters/text/pronouns.js";
// the rung's overcomeable priors (identity/novels PREREG-ROUND20 NOTE-1)
const S3 = [{ text: "Ann met Bo. She smiled. She laughed. She nodded at Ann.", offset: 0 }]; const M3 = [{ ref: "ann", start: 0, end: 3 }, { ref: "bo", start: 8, end: 10 }, { ref: "ann", start: 49, end: 52 }];
const D3 = { window: 4, boost: 2, feed: 1, floor: 1, margin: 0, language: "en" };
test("a non-personal ruling is a veto by default and a prior the text can overcome with nonPersonalSoft", () => {
  const hard = resolvePronounsByPresence(S3, M3, { ...D3, nonPersonal: ["ann", "bo"] }); assert.equal(hard.bindings.length, 0, "both beings ruled non-personal: nothing binds");
  const soft = resolvePronounsByPresence(S3, M3, { ...D3, nonPersonal: ["ann", "bo"], nonPersonalSoft: true }); assert.equal(soft.bindings.length, 0, "no text evidence yet: the ruling still stands");
});
test("a gender prior speaks only for a being the text has not spoken of", () => {
  const T = [{ text: "Tom met Ann and she smiled", offset: 0 }]; const M = [{ ref: "tom", start: 0, end: 3 }, { ref: "ann", start: 8, end: 11 }]; const D = { ...D3, boost: 3 };
  assert.equal(resolvePronounsByPresence(T, M, D).bindings[0]?.referentId, "tom", "without a prior the first mention (boost 3) wins");
  assert.equal(resolvePronounsByPresence(T, M, { ...D, priorGender: new Map([["tom", "m"]]) }).bindings[0]?.referentId, "ann", "the giver says Tom is male: she is not offered Tom, Ann wins");
  assert.equal(resolvePronounsByPresence(T, M, { ...D, priorGender: new Map([["tom", "m"], ["ann", "m"]]) }).bindings.length, 0, "a giver says both are male: she binds nobody");
  assert.equal(JSON.stringify(resolvePronounsByPresence(T, M, D)), JSON.stringify(resolvePronounsByPresence(T, M, { ...D, priorGender: null, nonPersonalSoft: false })), "absent options: byte-identical");
});
