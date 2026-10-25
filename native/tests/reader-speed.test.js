// native/tests/reader-speed.test.js — the reader's speed work changes no reading (2026-10-25).
// surprises() reads one probability per event instead of building predictNext's whole distribution, and the unspaced-script test
// and the segmenter are measured once per prior object. Each is held here to the computation it replaced, number for number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { surprises, segmentBySurprise } from "../kernel/surprise-segments.js";
import { predictNext, lcg } from "../kernel/continuation.js";
import { priorIsUnspaced, makeSegmenter } from "../adapters/text/script-segment.js";

// the computation surprises() replaced: predictNext's distribution, built for every event
function surprisesBefore(events, { order, alphabetSize = null, prime = null } = {}) {
  const ev = (events ?? []).map(String);
  const out = new Float64Array(ev.length);
  const alphabet = new Map();
  const tables = new Map();
  for (let k = 1; k <= order; k += 1) tables.set(k, new Map());
  const prior = { order, alphabet, tables };
  const floorOf = () => 1 / ((alphabetSize ?? alphabet.size) + 1);
  const sediment = (seq, i) => {
    alphabet.set(seq[i], (alphabet.get(seq[i]) ?? 0) + 1);
    for (let k = 1; k <= order && i - k >= 0; k += 1) {
      const ctx = seq.slice(i - k, i).join(" "), t = tables.get(k);
      if (!t.has(ctx)) t.set(ctx, new Map());
      const m = t.get(ctx); m.set(seq[i], (m.get(seq[i]) ?? 0) + 1);
    }
  };
  if (prime && prime.length) { const pv = prime.map(String); for (let i = 0; i < pv.length; i += 1) sediment(pv, i); }
  for (let i = 0; i < ev.length; i += 1) {
    const p = i ? predictNext(prior, ev.slice(Math.max(0, i - order), i)) : { dist: new Map() };
    out[i] = -Math.log2(Math.max(p.dist.get(ev[i]) ?? 0, floorOf()));
    sediment(ev, i);
  }
  return out;
}

const streamOf = (rng, n, vocab) => Array.from({ length: n }, () => "w" + Math.floor(rng() * vocab));

test("surprises() gives the bits predictNext's distribution gives, event for event", () => {
  const rng = lcg(7);
  for (const order of [1, 2, 3, 4]) for (const vocab of [3, 40, 900]) for (const primed of [false, true]) for (const alphabetSize of [null, 50]) {
    const ev = streamOf(rng, 600, vocab);
    const prime = primed ? streamOf(rng, 200, vocab) : null;
    const a = surprises(ev, { order, alphabetSize, prime }), b = surprisesBefore(ev, { order, alphabetSize, prime });
    assert.deepEqual(Array.from(a), Array.from(b), `order ${order} · vocab ${vocab} · primed ${primed} · alphabetSize ${alphabetSize}`);
  }
});

test("surprises() on the edges: an empty stream, one event, a stream that repeats one word", () => {
  for (const ev of [[], ["a"], Array(50).fill("a")]) assert.deepEqual(Array.from(surprises(ev, { order: 3 })), Array.from(surprisesBefore(ev, { order: 3 })));
});

test("segmentBySurprise cuts where it cut before (the null is the same reader over shuffled events)", () => {
  const rng = lcg(3);
  const figs = [["the", "ship", "sailed", "west"], ["ice", "was", "sighted", "late"], ["boats", "were", "lowered", "slowly"]];
  const ev = Array.from({ length: 120 }, () => figs[Math.floor(rng() * 3)]).flat();
  const seg = segmentBySurprise(ev, { order: 3, alpha: 0.05, draws: 20, seed: 1, minLength: 3 });
  assert.ok(seg.boundaries.length > 0, "the figures are found");
  assert.deepEqual(Array.from(seg.surprises), Array.from(surprisesBefore(ev, { order: 3 })));
});

test("priorIsUnspaced and makeSegmenter are measured once per prior object and answer as before", () => {
  const han = { forms: Object.fromEntries(Array.from({ length: 150 }, (_, i) => [String.fromCodePoint(0x4e00 + i), { NOUN: 3 }])) };
  const latin = { forms: Object.fromEntries(Array.from({ length: 150 }, (_, i) => ["w" + i, { NOUN: 3 }])) };
  assert.equal(priorIsUnspaced(han), true);
  assert.equal(priorIsUnspaced(latin), false);
  assert.equal(priorIsUnspaced(han, { share: 1.01 }), false, "the share is part of the question");
  assert.equal(priorIsUnspaced({ forms: { 一: { NOUN: 1 } } }), false, "fewer than 100 forms is never unspaced");
  assert.equal(priorIsUnspaced(null), false);
  assert.equal(makeSegmenter(latin), null);
  const s1 = makeSegmenter(han), s2 = makeSegmenter(han);
  assert.equal(typeof s1, "function");
  assert.equal(s1, s2, "one segmenter per prior object");
});

test("the quality pass reads a form the prior's object holds only by inheritance ('constructor', '__proto__') as unclassed", async () => {
  const { tokensForCues } = await import("../the-fold/read-quality.mjs");
  const pos = { forms: { ship: { NOUN: 5 }, empty: {} } };
  assert.deepEqual(tokensForCues("The constructor of the ship", pos).map((t) => t.upos), ["", "", "", "", "NOUN"]);
  assert.deepEqual(tokensForCues("__proto__ empty", pos).map((t) => t.upos), ["", ""]);
});
