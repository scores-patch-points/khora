// negation cues — the polarity door's closed class (adapters/text/priors.js ->
// adapters/text/relations.js). The kernel reads negation as the door's
// polarity "-" and nothing else; the extractor flipped it only on NEGATION_WORDS
// (not, never, hardly, ... and the n't forms), so "Nobody appointed Hamlin."
// read "+". GOLD below was built by hand and each candidate cue was measured
// against it ONE AT A TIME before it was admitted:
//
//   cue      flips (gold -)   breaks (gold +)            decision
//   none     2 / 2            0                          admitted, "but" guard
//   nobody   2 / 2            1 (nobody but ...)         admitted, "but" guard
//   nothing  2 / 2            1 (nothing but ...)        admitted, "but" guard
//   no       4 / 4            3 (no doubt/wonder, in no time) + "no one but", "No," -> admitted, guarded
//   without  0                1 (without a doubt)        REFUSED: it modifies manner, not polarity
//   nowhere  0                0                          REFUSED: the gold gives it no work
//
// The false-positive classes are the ones the cue words are also found in:
// exceptive "X but Y" (= only), idiomatic "no doubt / no wonder / no matter /
// in no time", the interjection "No, ...", and the correlative "not only ...
// but also" (already guarded).
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractRelations } from "../adapters/text/relations.js";
import * as P from "../adapters/text/priors.js";
const { NEGATION_WORDS } = P;
const NEGATION_QUANTIFIERS = P.NEGATION_QUANTIFIERS ?? new Set();
const NEGATION_EXCEPTIVES = P.NEGATION_EXCEPTIVES ?? {};

const verbs = new Set(["appointed", "loves", "signed", "approved", "has", "was", "doubts", "denies", "left", "pleased", "knows", "made", "visited", "is"]);
const polarityOf = (text) => { const r = extractRelations(text, { verbs }); return r.length ? r.map((x) => x.polarity).join("/") : "noedge"; };

// [sentence, gold polarity of the edge it yields]
const AFFIRMATIVE_CONTROLS = [
  ["Lincoln appointed Hamlin.", "+"],
  ["Lincoln loves Hamlin.", "+"],
  ["The senate approved the treaty.", "+"],
  ["Mary has a brother.", "+"],
  ["Grant visited the capital.", "+"],
];
const OLD_CUES = [
  ["Lincoln never appointed Hamlin.", "-"],
  ["Grant never visited the capital.", "-"],
  ["Mary hardly knows Lincoln.", "-"],
];
const NEW_CUES = [
  ["Nobody appointed Hamlin.", "-"],
  ["Nobody loves Hamlin.", "-"],
  ["No one appointed Hamlin.", "-"],
  ["No one visited the capital.", "-"],
  ["No senator signed the bill.", "-"],
  ["No president visited the capital.", "-"],
  ["Nothing pleased Mary.", "-"],
  ["None of the senators signed the bill.", "-"],
  ["None approved the treaty.", "-"],
  // the same matrix reading the existing cues give: "Mary never denies ..." is '-'
  ["Nobody denies Lincoln appointed Hamlin.", "-"],
  ["No one doubts Lincoln appointed Hamlin.", "-"],
];
const FALSE_POSITIVE_CLASSES = [
  ["No doubt Lincoln appointed Hamlin.", "+", "idiom: no doubt"],
  ["No wonder Mary loves Lincoln.", "+", "idiom: no wonder"],
  ["No matter the cost Lincoln signed the bill.", "+", "idiom: no matter"],
  ["In no time Lincoln signed the bill.", "+", "idiom: in no time"],
  ["Nobody but Lincoln appointed Hamlin.", "+", "exceptive: nobody but"],
  ["No one but Lincoln appointed Hamlin.", "+", "exceptive: no one but"],
  ["None but Lincoln appointed Hamlin.", "+", "exceptive: none but"],
  ["Nothing but a bill pleased Mary.", "+", "exceptive: nothing but"],
  ["No, Lincoln appointed Hamlin.", "+", "interjection: No,"],
  ["Not only Lincoln but also Grant visited the capital.", "+", "correlative: not only ... but also"],
  ["Without a doubt Lincoln appointed Hamlin.", "+", "without is not a polarity cue"],
  ["Lincoln left without saying goodbye.", "+", "without is not a polarity cue"],
];

test("negation — the cues the gold supports flip polarity (none, nobody, nothing, no)", () => {
  const wrong = NEW_CUES.filter(([t, g]) => polarityOf(t) !== g).map(([t, g]) => `${t} -> ${polarityOf(t)} (gold ${g})`);
  assert.deepEqual(wrong, []);
});

test("negation — positive control: affirmative sentences with none of the cues stay '+', the old cues still flip", () => {
  assert.deepEqual(AFFIRMATIVE_CONTROLS.filter(([t, g]) => polarityOf(t) !== g), []);
  assert.deepEqual(OLD_CUES.filter(([t, g]) => polarityOf(t) !== g), []);
});

test("negation — negative control: the false-positive classes never flip (idiom, exceptive, interjection, correlative, without)", () => {
  const flipped = FALSE_POSITIVE_CLASSES.filter(([t, g]) => polarityOf(t) !== g && polarityOf(t) !== "noedge").map(([t, g, why]) => `${t} -> ${polarityOf(t)} [${why}]`);
  assert.deepEqual(flipped, []);
});

test("negation — the cue set is declared: the four quantifier cues, their exceptives, and NOT without/nowhere", () => {
  assert.deepEqual([...NEGATION_QUANTIFIERS].sort(), ["no", "nobody", "none", "nothing"]);
  for (const q of NEGATION_QUANTIFIERS) assert.ok(NEGATION_EXCEPTIVES[q]?.length > 0, `${q} declares what cancels it`);
  assert.ok(!NEGATION_QUANTIFIERS.has("without") && !NEGATION_QUANTIFIERS.has("nowhere"));
});

test("negation — NEGATION_WORDS (the token-level class copula-claims/charter/stance/judgment-reader/widget read unguarded) is deliberately not widened", () => {
  for (const q of NEGATION_QUANTIFIERS) assert.equal(NEGATION_WORDS.has(q), false);
});

test("negation — a caller-injected negation set is untouched by the English cues", () => {
  const eu = new Set(["ez"]);
  const r = extractRelations("Nobody appointed Hamlin.", { verbs, negationWords: eu });
  assert.equal(r.map((x) => x.polarity).join("/"), "+");
});

// ── OPEN (typed, pinned so a later fix flips them on purpose) ────────────────
// These are not missing CUE WORDS: "never" is a member. The negation sits AFTER
// the matched verb, inside the object, outside the polarity window by
// construction (window = clause start .. end of subject).
test("negation — OPEN: post-verbal negation is outside the polarity window (not a cue-set defect)", () => {
  const open = [
    "Andrew Johnson was never the president.",
    "Lincoln has no relation to Hamlin.",
    "Lincoln signed nothing.",
  ];
  for (const t of open) assert.equal(polarityOf(t), "+", t);
});
