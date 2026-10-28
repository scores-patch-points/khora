// readerOptions.pronounGaps (default off): every pronoun of the resolver's class the read did not bind is a typed, addressed item on the entry
// (PREREG-PRONOUN-GAPS.md). Stub-free: the pronoun class is the resolver's own, no priors directory, Wiktionary pack or GUM needed.
import test from "node:test";
import assert from "node:assert/strict";
import { readWith, buildPriors } from "../../the-fold/read-core.mjs";
import { resolvePronouns } from "./pronouns.js";

const priors = buildPriors({ stem: "eng" });
const read = (text, readerOptions, language = "eng") => readWith(text, { language, priors, minCharacters: 0, ...(readerOptions ? { readerOptions } : {}) });
const CLASS = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
const REASONS = new Set(["pronoun_no_candidate", "pronoun_below_floor", "pronoun_no_margin", "pronoun_contested_no_margin", "pronoun_null_not_cleared", "frame_not_read", "no_referent_discovered"]);
const strip = (e) => JSON.stringify({ ...e, ms: 0, pronounGaps: undefined });
const overlap = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > 0;

const NAMED = "Anna Smith met Boris Jones in Paris. She liked him. Later Boris Jones left the city and he did not write. Anna Smith wrote about it. Boris Jones read her letter and he smiled. He answered Anna Smith. She said nothing. Boris Jones went home.";
const NAMELESS = "He went home late that night. She stayed there until the morning came.";

test("off (the default) the entry has no pronounGaps and is what it was; on, it adds that field and nothing else", () => {
  const off = read(NAMED), on = read(NAMED, { pronounGaps: true });
  assert.equal("pronounGaps" in off, false);
  assert.equal("pronounGaps" in read(NAMED, { pronounGaps: false }), false);
  assert.ok(Array.isArray(on.pronounGaps));
  assert.equal(strip(on), strip(off), "C2: the entry minus the new field is the entry without the option");
});

test("every pronoun of the class is either bound or has exactly one item, at its own address", () => {
  for (const text of [NAMED, NAMELESS]) {
    const e = read(text, { pronounGaps: true });
    const tokens = [...text.matchAll(CLASS)].map((m) => [m.index, m.index + m[0].length]);
    assert.ok(tokens.length > 0);
    for (const t of tokens) {
      const bound = e.pronouns.filter((p) => overlap(p.at, t)).length, items = e.pronounGaps.filter((g) => overlap(g.at, t)).length;
      assert.equal(bound + items, 1, `the pronoun at ${t} is bound or typed, never both and never neither`);
    }
    for (const g of e.pronounGaps) {
      assert.equal(text.slice(g.at[0], g.at[1]).toLowerCase(), g.pronoun, "an item's address slices out its pronoun");
      assert.ok(REASONS.has(g.reason), `${g.reason} is one of the named families`);
      assert.ok(typeof g.regime === "string" && Array.isArray(g.candidates) && typeof g.detail === "string");
      assert.ok(Number.isInteger(g.sentence) || g.sentence === -1);
    }
    assert.deepEqual(e.pronounGaps.map((g) => g.at[0]), [...e.pronounGaps.map((g) => g.at[0])].sort((a, b) => a - b), "items come in text order");
  }
});

test("a frame the refused regime does not read is typed frame_not_read with the names beside the pronoun; a passage with no being is no_referent_discovered", () => {
  const named = read(NAMED, { pronounGaps: true }).pronounGaps;
  const unread = named.filter((g) => g.reason === "frame_not_read");
  assert.ok(unread.length > 0 && unread.every((g) => g.regime === "refused" && g.candidates.length > 0 && g.candidates.every((c) => typeof c.surface === "string")));
  const nameless = read(NAMELESS, { pronounGaps: true }).pronounGaps;
  assert.deepEqual(nameless.map((g) => g.reason), ["no_referent_discovered", "no_referent_discovered"]);
  assert.ok(nameless.every((g) => g.candidates.length === 0));
});

test("another language: no pronoun prior, no items, and the entry is what it was", () => {
  const de = "Anna Schmidt traf Boris Weber in Berlin. Sie mochte ihn sehr. Später verließ er die Stadt.";
  const on = read(de, { pronounGaps: true }, "deu"), off = read(de, undefined, "deu");
  assert.deepEqual(on.pronounGaps, []);
  assert.equal(strip(on), strip(off));
});

test("the resolver: trace is additive and off by default (no unread, no candidates)", () => {
  const sentences = [{ text: "Anna Smith met Boris Jones in Paris.", offset: 0, order: 0 }, { text: "He answered Anna Smith.", offset: 37, order: 1 }, { text: "She said nothing.", offset: 61, order: 2 }];
  const s2r = new Map([["Anna Smith", "ref:a"], ["Boris Jones", "ref:b"]]);
  const dials = { minActivation: 0.05, minMargin: 0.2 };
  const plain = resolvePronouns(sentences, s2r, dials), traced = resolvePronouns(sentences, s2r, { ...dials, trace: true });
  assert.equal("unread" in plain, false);
  assert.ok(plain.gaps.every((g) => !("candidates" in g)));
  assert.deepEqual(traced.bindings, plain.bindings);
  assert.deepEqual(traced.regime, plain.regime);
  assert.ok(Array.isArray(traced.unread));
  assert.equal(traced.gaps.length + traced.unread.length + traced.bindings.length, [...sentences.map((s) => s.text).join(" ").matchAll(CLASS)].length);
});
