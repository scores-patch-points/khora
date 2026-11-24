// hunt-source-ylir.test.mjs — Ýlir-One as a hunt source over a fake read interface: the documents the void's words point to, the passages that carry the rarest anchor with their byte addresses,
// a typed gap where the interface or a file is missing.
import test from "node:test"; import assert from "node:assert/strict";
import { ylirSource } from "./hunt-source-ylir.js";

const DOCS = { 1: { file: "02-encyclopedic/wikipedia/Aristotle.txt", sha256: "aa", ss: ["Aristotle was a Greek philosopher.", "He tutored Alexander the Great.", "Plato was his teacher."] }, 2: { file: "01-literature-books/gutenberg/pg100_Complete_Works.txt", sha256: "bb", ss: ["Alexander is not here.", "The tutor came."] }, 3: { file: "x/other.txt", sha256: "cc", ss: ["Nothing."] } };
const POST = { aristotle: [{ doc: 1, count: 40, at: 0 }], alexander: [{ doc: 1, count: 7, at: 1 }, { doc: 2, count: 5, at: 0 }, { doc: 3, count: 1, at: 0 }], tutor: [{ doc: 1, count: 9, at: 1 }, { doc: 2, count: 2, at: 1 }] };
let at = 0; const spans = (d) => d.ss.map((text) => { const from = at; at += text.length + 1; return { text, from, to: at - 1 }; });
const io = { lookup: (w) => POST[w] ?? [], catalog: (d) => DOCS[d] ? { file: DOCS[d].file, sha256: DOCS[d].sha256 } : null, sentences: (d) => (DOCS[d] ? spans(DOCS[d]).map((s, k) => ({ k, ...s })) : null), total: 11640 };
const voidOf = { anchors: [{ text: "Alexander", tokens: ["alexander"], forms: ["Alexander"] }], relation: { lemma: "tutor", kind: "verb" } };

test("the documents the void's words point to, best first, each with the sentences that carry the rarest anchor, labelled with their byte addresses", async () => {
  const s = ylirSource({ ...io, k: 2 }), docs = await s.find(voidOf);
  assert.deepEqual(docs.map((d) => d.title), ["Aristotle", "pg100 Complete Works"], "the document that has both words most often leads (the score is the sum of log(1 + count) x idf)");
  assert.deepEqual(docs[0].passages.map((p) => p.text), ["He tutored Alexander the Great."]); assert.match(docs[0].passages[0].section, /^bytes \d+-\d+$/);
  assert.equal(docs[0].url, "ylir-one:02-encyclopedic/wikipedia/Aristotle.txt"); assert.equal(docs[0].address.sha256, "aa");
  assert.equal(s.lastRun().docs.length, 2); assert.ok(s.lastRun().docs[0].score > s.lastRun().docs[1].score);
});
test("a missing interface function, a missing file and a void with no word are typed gaps and find nothing", async () => {
  const none = ylirSource({ lookup: io.lookup, total: 10 }); assert.deepEqual(await none.find(voidOf), []); assert.equal(none.lastRun().gaps[0].kind, "interface_missing"); assert.match(none.lastRun().gaps[0].how, /ingestion session/);
  const nofile = ylirSource({ ...io, sentences: () => null }); assert.deepEqual(await nofile.find(voidOf), []); assert.equal(nofile.lastRun().gaps[0].kind, "sentences_unavailable");
  const empty = ylirSource(io); assert.deepEqual(await empty.find({ anchors: [], relation: null }), []); assert.equal(empty.lastRun().gaps[0].kind, "no_words");
});
test("it reads no language: a passage is chosen by the rarest anchor word's surface form being in the sentence, and the hunt reads it", async () => {
  const docs = await ylirSource({ ...io, k: 1 }).find({ anchors: [{ text: "Aristotle", tokens: ["aristotle"], forms: ["Aristotle"] }], relation: null });
  assert.deepEqual(docs[0].passages.map((p) => p.text), ["Aristotle was a Greek philosopher."]);
});
