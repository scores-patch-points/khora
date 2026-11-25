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
test("a document NAMED FOR the anchor hands every sentence to the reader (its sentences name the subject by a shorter form or a pronoun); any other document is filtered by the anchor's rarest word", async () => {
  const own = await ylirSource({ ...io, k: 1 }).find({ anchors: [{ text: "Aristotle", tokens: ["aristotle"], forms: ["Aristotle"] }], relation: null });
  assert.deepEqual(own[0].passages.map((p) => p.text), ["Aristotle was a Greek philosopher.", "He tutored Alexander the Great.", "Plato was his teacher."], "“He tutored Alexander” has no “Aristotle” in it, and it is on Aristotle's page");
  const other = await ylirSource({ ...io, k: 2 }).find({ anchors: [{ text: "Alexander", tokens: ["alexander"], forms: ["Alexander"] }], relation: null });
  assert.deepEqual(other[0].passages.map((p) => p.text), ["He tutored Alexander the Great."], "Aristotle's page is not named for Alexander: only the sentences that carry the word");
});

test("retrieval: a page NAMED FOR the anchor is always handed over first (a one-word anchor matches the last word of a fuller title), and the score is BM25 (saturating, length-normalised), not a count", async () => {
  const D = { 1: { file: "02-encyclopedic/wikipedia/Johann_Wolfgang_von_Goethe.txt", n: 500, ss: ["He wrote Faust."] }, 2: { file: "01-literature-books/gutenberg/pg100_Complete_Works.txt", n: 90000, ss: ["Goethe is quoted."] }, 3: { file: "x/Other_Essay.txt", n: 400, ss: ["Goethe is quoted."] } };
  const P2 = { goethe: [{ doc: 2, count: 400, at: 0 }, { doc: 3, count: 12, at: 0 }, { doc: 1, count: 3, at: 0 }] };
  const io2 = { lookup: (w) => P2[w] ?? [], catalog: (d) => (D[d] ? { file: D[d].file, sha256: "s", sentences: D[d].n } : null), sentences: (d) => (D[d] ? D[d].ss.map((text, k) => ({ k, from: k * 20, to: k * 20 + 19, text })) : null), total: 11640 };
  const src = ylirSource({ ...io2, k: 2 }), docs = await src.find({ anchors: [{ text: "Goethe", tokens: ["goethe"], forms: ["Goethe"] }], relation: null });
  assert.equal(docs[0].title, "Johann Wolfgang von Goethe", "the page named for Goethe leads although it has the fewest occurrences"); assert.equal(src.lastRun().docs[0].ownPage, true);
  const sc = src.lastRun().docs.map((d) => d.score), idf = Math.log(1 + (11640 - 3 + 0.5) / (3 + 0.5)); assert.ok(Math.max(...sc) <= idf * (1.2 + 1) + 0.01, "BM25 saturates at idf x (k1 + 1): 400 occurrences do not make a score of 400 times a single one (the first scoring did)");
});

test("the page markup the extraction left in a passage is cleaned in the view, not in the address: an entity space, two sentences run together, a link's target and its display text", async () => {
  const text = "He was born in the city of Stagira (ancient city)Stagira in Chalkidiki. He died on 25&nbsp;August.Concurring reports differ.";
  const io3 = { lookup: (w) => (w === "stagira" ? [{ doc: 1, count: 2, at: 0 }] : []), catalog: (d) => (d === 1 ? { file: "x/Aristotle.txt", sha256: "s", sentences: 1 } : null), sentences: (d) => (d === 1 ? [{ k: 0, from: 100, to: 100 + text.length, text }] : null), total: 5 };
  const docs = await ylirSource({ ...io3, k: 1 }).find({ anchors: [{ text: "Stagira", tokens: ["stagira"], forms: ["Stagira"] }], relation: null });
  assert.equal(docs[0].passages[0].text, "He was born in the city of Stagira in Chalkidiki. He died on 25 August. Concurring reports differ.");
  assert.equal(docs[0].passages[0].section, `bytes 100-${100 + text.length}`, "the address is the file's own span, whatever the view");
});
