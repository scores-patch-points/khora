import test from "node:test";
import assert from "node:assert/strict";
import { findFrames, voicesAt } from "./attribution-frames.js";

// the verb prior is injected: here, a stand-in with a handful of verbs (the real one is the treebank prior's VERB counts)
const VERBS = new Set("said told asked wrote testified replied believed heard stated reported saw ordered ran struck".split(" "));
const isVerb = (w) => VERBS.has(w.toLowerCase());
const asMap = (res, source = "s") => new Map(res.frames.map((f, i) => [`f${i}`, { id: `f${i}`, parent: f.parent == null ? null : `f${f.parent}`, speakerText: f.speakerText, contentAt: f.content, depth: f.depth, form: f.form, source }]));
const chainOf = (text, needle, res = findFrames(text, { isVerb })) => { const m = asMap(res); const at = text.indexOf(needle); return voicesAt(m, at, "s").chain.map((f) => f.speakerText ?? null); };

test("a quotation with its tag: who said it", () => {
  const t = "“We are sinking,” said Smith. Ismay left.";
  const r = findFrames(t, { isVerb });
  assert.equal(r.frames.length, 1);
  assert.equal(r.frames[0].speakerText, "Smith"); assert.equal(r.frames[0].form, "quotation");
  assert.deepEqual(r.frames[0].speakerAt, [t.indexOf("Smith"), t.indexOf("Smith") + 5]);
});

test("a quotation nobody tags is unowned — a typed gap, never an invented speaker", () => {
  const r = findFrames("“It is cold.” The night went on.", { isVerb });
  assert.equal(r.frames[0].speakerAt, null); assert.equal(r.gaps[0].type, "attribution_unwitnessed");
});

test("a quote inside a quote: the inner voice sits inside the outer, and the chain names both", () => {
  const t = "Smith said, “Ismay told me, ‘the ice is near,’ and left.”";
  const r = findFrames(t, { isVerb });
  assert.equal(r.frames.length, 2);
  assert.deepEqual(chainOf(t, "the ice", r), ["Ismay", "Smith"]);
  assert.deepEqual(chainOf(t, "and left", r), ["Smith"]);
});

test("indirect reports chain: A said that B said that C said … — each a frame inside the last", () => {
  const t = "Smith said that Ismay told Andrews that Lightoller heard that Murdoch said that the ship struck.";
  const r = findFrames(t, { isVerb });
  assert.deepEqual(r.frames.map((f) => f.speakerText), ["Smith", "Ismay", "Lightoller", "Murdoch"]);
  assert.deepEqual(r.frames.map((f) => f.depth), [1, 2, 3, 4]);
  assert.deepEqual(chainOf(t, "the ship", r), ["Murdoch", "Lightoller", "Ismay", "Smith"]);
  assert.ok(r.frames.every((f) => f.scope === "to-the-end-of-the-sentence"), "the right-branching scope is stated, not hidden");
});

test("'according to X,' puts the rest of the sentence in X's frame", () => {
  const t = "According to Ismay, the Captain ordered the boats lowered.";
  const r = findFrames(t, { isVerb });
  assert.equal(r.frames[0].form, "according-to"); assert.equal(r.frames[0].speakerText, "Ismay");
  assert.deepEqual(chainOf(t, "the Captain", r), ["Ismay"]);
});

test("a quote carried inside a report: the reporting frame is the parent", () => {
  const t = "Smith testified that Ismay said, “the ice is near.”";
  const r = findFrames(t, { isVerb });
  assert.deepEqual(chainOf(t, "the ice", r), ["Ismay", "Smith"]);
});

test("apostrophes are not quotation marks: don’t and Smith’s open nothing", () => {
  const r = findFrames("Smith’s boat didn’t sink; they don’t know why.", { isVerb });
  assert.equal(r.frames.length, 0);
});

test("NO DEPTH CAP: two hundred nested quotations, and a chain of three thousand reports, walk without recursion or a limit", () => {
  const N = 200; let t = "deep";
  for (let i = 0; i < N; i++) t = i % 2 === 0 ? `“x${i} ‘${t}’ y”` : `“x${i} ‘${t}’ y”`;
  // alternate marks properly: outer “ ”, inner ‘ ’, repeating — build it explicitly
  let nested = "core";
  for (let i = 0; i < N; i++) nested = i % 2 === 0 ? `‘a${i} ${nested} b’` : `“a${i} ${nested} b”`;
  nested = `“${nested}”`;
  const r = findFrames(nested, { isVerb });
  assert.ok(r.frames.length >= N, `found ${r.frames.length} frames`);
  const deepest = Math.max(...r.frames.map((f) => f.depth));
  assert.ok(deepest >= N, `deepest chain is ${deepest}`);
  const m = asMap(r);
  const out = voicesAt(m, nested.indexOf("core"), "s");
  assert.ok(out.depth >= N); assert.equal(out.truncated, null);
  // a long report chain: A0 said that A1 said that … A2999 ran.
  const K = 3000; const names = Array.from({ length: K }, (_, i) => `Voice${i}`);
  const chain = names.map((n) => `${n} said that`).join(" ") + " the ship ran.";
  const rr = findFrames(chain, { isVerb });
  assert.equal(rr.frames.length, K);
  assert.equal(Math.max(...rr.frames.map((f) => f.depth)), K);
  assert.equal(voicesAt(asMap(rr), chain.indexOf("the ship"), "s").depth, K);
});

test("a cycle in the parent chain (a person's own edit could make one) is reported, not looped on", () => {
  const frames = new Map([["a", { id: "a", parent: "b", contentAt: [0, 10], depth: 1 }], ["b", { id: "b", parent: "a", contentAt: [0, 20], depth: 2 }]]);
  const out = voicesAt(frames, 5);
  assert.equal(out.truncated, "cycle"); assert.ok(out.chain.length <= 2);
});

test("no list of speech verbs is kept: the verb prior is injected", () => {
  assert.throws(() => findFrames("x", {}), /injected/);
});
