// null-separation.test.mjs — the softmax-vs-difference falsification the user specified (2026-11-23).
//
// The claim under test: a difference rule, where weight(item) = how much fold(state + item) differs
// from fold(state) with a measured null, makes "nothing here" a first-class state that softmax
// (which forces a sum-to-1 distribution) cannot express. The four specs, pinned to THIS system:
//
//   reference  the folded state: the kāraka triples already read (the DAG), and the query's own
//              gap + filled roles. fillGap(item) = does the passage agree with the filled roles.
//   measure    the delta = whether a passage survives the filled roles' contention (each role is a
//              difference-that-makes-a-difference); "no-triple" is the delta being zero everywhere.
//   threshold  the null: a passage is an answer only if it survives ALL filled roles (a strong, tied
//              difference); below it the rule returns empty — grounded in provenance ("no source
//              moves this"), never a score.
//   lives      the retrieval/fold layer (gap-fill.js), not a neural net.
//
// The test: answerable and deliberately unanswerable queries over a fixed corpus, softmax-weighted
// retrieval vs the difference rule, side by side. The measure is the EMPTY-RATE on the unanswerable
// set while still answering the answerable one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillGap } from "./gap-fill.js";

const CORPUS = [
  { predicate: "give", kartṛ: ["jonathan"], karman: ["book"], sampradāna: ["mina"] },
  { predicate: "live", kartṛ: ["mina"], adhikaraṇa: ["village"] },
  { predicate: "sleep", kartṛ: ["cat"], adhikaraṇa: ["mat"] },
  { predicate: "rain", kāla: ["tuesday"] },
];

const ANSWERABLE = [
  { gap: "kartṛ", filled: { predicate: "give", karman: "book", sampradāna: "mina" }, want: "jonathan" },
  { gap: "adhikaraṇa", filled: { predicate: "live", kartṛ: "mina" }, want: "village" },
  { gap: "kartṛ", filled: { predicate: "sleep", adhikaraṇa: "mat" }, want: "cat" },
];

const UNANSWERABLE = [
  { gap: "kartṛ", filled: { predicate: "eat", karman: "sandwich" } },
  { gap: "adhikaraṇa", filled: { predicate: "go", kartṛ: "jonathan" } },
  { gap: "karman", filled: { predicate: "write", kartṛ: "jonathan" } },
];

// softmax-weighted retrieval: rank passages by token overlap with the query's filled roles, softmax
// to a distribution that always sums to 1, return the argmax passage's gap slot. It can never say
// "nothing", because the distribution must sum to 1.
const unwrap = (v) => (Array.isArray(v) && v.length === 1 ? v[0] : v);
function softmaxRetrieve({ gap, filled, triples }) {
  const qTokens = new Set(Object.values(filled).flatMap((v) => (Array.isArray(v) ? v : [v])));
  const scores = triples.map((t) => {
    let overlap = 0;
    for (const v of Object.values(t).flat()) if (qTokens.has(v)) overlap++;
    return overlap;
  });
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  const probs = exps.map((e) => e / sum);
  const top = probs.indexOf(Math.max(...probs));
  return { answer: unwrap(triples[top][gap]), top, empty: false };
}

// the difference rule: fillGap returns empty (no-triple) when no passage survives the filled roles.
const differenceRetrieve = ({ gap, filled, triples }) => {
  const r = fillGap({ gap, filled, triples });
  return { answer: unwrap(r.answer), empty: r.reason === "no-triple" || r.reason === "ambiguous", reason: r.reason };
};

test("answerable queries: both methods answer, and the difference rule answers correctly", () => {
  for (const q of ANSWERABLE) {
    const d = differenceRetrieve({ ...q, triples: CORPUS });
    assert.equal(d.empty, false, `difference rule must answer: ${JSON.stringify(q.filled)}`);
    assert.equal(d.answer, q.want);
    const s = softmaxRetrieve({ ...q, triples: CORPUS });
    assert.equal(s.answer, q.want, "softmax answers correctly here too (the answerable set is not the differentiator)");
  }
});

test("the separation: the difference rule returns empty on the unanswerable, softmax cannot", () => {
  const dEmpty = UNANSWERABLE.filter((q) => differenceRetrieve({ ...q, triples: CORPUS }).empty).length;
  const sEmpty = UNANSWERABLE.filter((q) => softmaxRetrieve({ ...q, triples: CORPUS }).empty).length;
  assert.equal(dEmpty, UNANSWERABLE.length, "the difference rule returns empty on every unanswerable query");
  assert.equal(sEmpty, 0, "softmax never returns empty — it is forced to bluff");
});

test("the empty is grounded: it is 'no source moves this', not a low score", () => {
  const r = fillGap({ gap: "kartṛ", filled: { predicate: "eat", karman: "sandwich" }, triples: CORPUS });
  assert.equal(r.reason, "no-triple");
  // the softmax's bluff is concrete: it answers "jonathan" to "who ate the sandwich" because the
  // uniform distribution over four zero-overlap passages has to pick someone.
  assert.equal(softmaxRetrieve({ gap: "kartṛ", filled: { predicate: "eat", karman: "sandwich" }, triples: CORPUS }).answer, "jonathan");
});
