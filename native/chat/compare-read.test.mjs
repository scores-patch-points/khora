// compare-read.test.mjs — the pairing of the chat's pronoun bindings with the canonical read's, with fixed inputs (no reader needed).
import test from "node:test"; import assert from "node:assert/strict";
import { compareBindings, compareSpeakers, sameName } from "./compare-read.mjs";
const b = (order, form, at, chat, open = false, candidates = []) => ({ order, form, at, chat, open, candidates, via: chat ? "name" : null });
const weft = { pronounsGuess: [{ pronoun: "she", sentence: 1, at: [10, 13], surface: "Mina", confident: false }, { pronoun: "he", sentence: 2, at: [30, 32], surface: "Mina", confident: false }, { pronoun: "her", sentence: 3, at: [50, 53], surface: "Natasha", confident: true }], pronounsPresence: [] };
test("every pair is one of six kinds, paired by sentence and the form's occurrence, not by character offset", () => {
  const chat = [b(1, "She", 999, "Mina"), b(2, "He", 5, "Pierre"), b(3, "her", 0, null, true, ["Natasha", "Mina"]), b(4, "he", 7, "Pierre"), b(5, "she", 8, null, false)];
  const r = compareBindings(chat, weft);
  assert.deepEqual(r.counts, { agree: 1, conflict: 1, chat_open: 1, chat_none: 0, canon_none: 1, both_none: 1 }); assert.equal(r.pronouns, 5); assert.equal(r.paired, 3);
  assert.deepEqual(r.items.map((x) => x.kind), ["chat_open", "conflict", "canon_none"], "in the order of the chat's own positions");
  const conflict = r.items.find((x) => x.kind === "conflict"); assert.equal(conflict.chat, "Pierre"); assert.equal(conflict.canonical, "Mina");
});
test("a pronoun the chat has nobody for, that the canonical read binds, is chat_none", () => {
  assert.equal(compareBindings([b(1, "she", 10, null, false)], weft).counts.chat_none, 1);
});
test("the same being under two spellings is not a conflict; two different beings are", () => {
  assert.equal(sameName("Mrs.", "Mrs"), true); assert.equal(sameName("Frank", "Frank Churchill"), true); assert.equal(sameName("Mrs. Weston", "Mrs Weston"), true);
  assert.equal(sameName("Frank", "Churchills"), false); assert.equal(sameName("", "Mina"), false);
  assert.equal(compareBindings([b(1, "She", 10, "Mrs. Mina")], { pronounsGuess: [{ pronoun: "she", sentence: 1, at: [10, 13], surface: "Mrs Mina" }] }).counts.agree, 1);
});
test("two occurrences of one form in a sentence are paired in order", () => {
  const w = { pronounsGuess: [{ pronoun: "he", sentence: 1, at: [5, 7], surface: "Pierre" }, { pronoun: "he", sentence: 1, at: [40, 42], surface: "Boris" }] };
  const r = compareBindings([b(1, "he", 100, "Pierre"), b(1, "he", 200, "Boris")], w); assert.equal(r.counts.agree, 2);
});

// ---- I and you: the chat binds them to the thread's participants, the canonical read to the speaker of a quotation or the narrator of the text
const p = (order, form, at, kind, chat, via = "a message the user typed") => ({ order, form, at, kind, chat, via });
const sb = (a, b2, kind, ref, via = "x") => ({ a, b: b2, cl: kind === "addressee" ? "one:addressee" : "one:speaker", ref, kind, via });
test("a first person the canonical read calls the narrator is the user, a speaker is a speaker; a you outside a quotation is only the chat's (the canonical read has no addressee there); the pairs are by offset", () => {
  const chat = [p(0, "I", 0, "speaker", "user"), p(1, "my", 20, "speaker", "user"), p(2, "you", 40, "addressee", "me"), p(3, "I", 60, "speaker", null, "inside a quotation: not the user's words")];
  const r = compareSpeakers(chat, { speakerBindings: [sb(0, 1, "narrator", "narrator"), sb(20, 22, "narrator", "narrator"), sb(60, 61, "speaker", "Mina", "tag after"), sb(80, 81, "speaker", "anon:q1", "anonymous")] });
  assert.deepEqual(r.counts, { agree: 2, conflict: 0, chat_open: 0, chat_none: 2, canon_none: 1, both_none: 0 }); assert.equal(r.paired, 3); assert.equal(r.mentions, 5);
  assert.deepEqual(r.items.map((x) => [x.kind, x.at]), [["canon_none", 40], ["chat_none", 60], ["chat_none", 80]], "the you; the quoted I the chat will not bind; a mention the chat lists nowhere");
  assert.deepEqual(r.refs, { chat: ["user"], canonical: ["narrator", "Mina", "anon:q1"] });
});
test("a speaker the canonical read calls the addressee (or the other way) is a conflict; a typed gap in the canonical entry means every chat binding is canon_none and says why", () => {
  const r = compareSpeakers([p(0, "I", 0, "speaker", "user"), p(1, "you", 10, "addressee", "me")], { speakerBindings: [sb(0, 1, "addressee", "Mina"), sb(10, 13, "speaker", "Mina")] });
  assert.deepEqual(r.counts, { agree: 0, conflict: 2, chat_open: 0, chat_none: 0, canon_none: 0, both_none: 0 });
  const g = compareSpeakers([p(0, "I", 0, "speaker", "user")], { speakerBindings: { gap: "speakers_english_only", detail: "read as fra" } });
  assert.deepEqual(g.counts.canon_none, 1); assert.equal(g.gap.gap, "speakers_english_only");
  assert.deepEqual(compareSpeakers([], { speakerBindings: [] }).counts, { agree: 0, conflict: 0, chat_open: 0, chat_none: 0, canon_none: 0, both_none: 0 });
});
