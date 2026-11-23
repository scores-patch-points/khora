import test from "node:test"; import assert from "node:assert/strict";
import { textMereology, checkMereology, alignRows, paragraphSpans, byteOffsets, ancestors } from "./text-mereology.mjs";
import { karakaRows } from "./karaka-total.mjs";

const R = (id, form, lemma, upos, head, deprel, feats = "_") => ({ id, form, lemma, upos, feats, head, deprel });
const sent = (order, offset, text, rows) => ({ order, offset, text, rows: karakaRows(rows, { stem: "eng" }) });

test("alignment survives CRLF normalisation (the reader's offsets are into the cleaned sentence)", () => {
  const src = "Alice met Bob.\r\nThen she\r\nleft.";
  // the reader normalised CRLF to LF, so its row offsets drift; alignment must re-find each form in the source
  const parse = [
    sent(0, 0, "Alice met Bob.", [R(1, "Alice", "Alice", "PROPN", 2, "nsubj"), R(2, "met", "meet", "VERB", 0, "root"), R(3, "Bob", "Bob", "PROPN", 2, "obj"), R(4, ".", ".", "PUNCT", 2, "punct")]),
    sent(1, 16, "Then she\nleft.", [R(1, "Then", "then", "ADV", 3, "advmod"), R(2, "she", "she", "PRON", 3, "nsubj"), R(3, "left", "leave", "VERB", 0, "root"), R(4, ".", ".", "PUNCT", 3, "punct")]),
  ];
  const { spans, unaligned } = alignRows(src, parse);
  assert.equal(unaligned.length, 0);
  for (const p of parse) for (const r of p.rows) { const [s, e] = spans.get(`${p.order}:${r.id}`); assert.equal(src.slice(s, e), r.form); }
});

test("typographic quotes, dashes and PTB tokens align to the source characters they stand for", () => {
  const src = "“Hi,” she said—twice…";
  const parse = [sent(0, 0, src, [R(1, "``", "``", "PUNCT", 5, "punct"), R(2, "Hi", "hi", "INTJ", 5, "discourse"), R(3, ",", ",", "PUNCT", 2, "punct"), R(4, "''", "''", "PUNCT", 5, "punct"), R(5, "she", "she", "PRON", 6, "nsubj"), R(6, "said", "say", "VERB", 0, "root"), R(7, "--", "--", "PUNCT", 8, "punct"), R(8, "twice", "twice", "ADV", 6, "advmod"), R(9, "...", "...", "PUNCT", 6, "punct")].map((r) => (r.id === 5 ? { ...r, head: 6 } : r)))];
  const m = textMereology(src, parse);
  assert.equal(m.coverage.unaligned, 0);
  assert.equal(m.coverage.charRate, 1);
});

test("one tree: document > paragraph > sentence > phrase > token; the mereology checks pass; every part reaches the whole", () => {
  const src = "The door was opened by Tom with a key.\n\nThen Tom left.";
  const parse = [
    sent(0, 0, "The door was opened by Tom with a key.", [R(1, "The", "the", "DET", 2, "det"), R(2, "door", "door", "NOUN", 4, "nsubj"), R(3, "was", "be", "AUX", 4, "aux:pass"), R(4, "opened", "open", "VERB", 0, "root"), R(5, "by", "by", "ADP", 6, "case"), R(6, "Tom", "Tom", "PROPN", 4, "obl:agent"), R(7, "with", "with", "ADP", 9, "case"), R(8, "a", "a", "DET", 9, "det"), R(9, "key", "key", "NOUN", 4, "obl"), R(10, ".", ".", "PUNCT", 4, "punct")]),
    sent(1, 40, "Then Tom left.", [R(1, "Then", "then", "ADV", 3, "advmod"), R(2, "Tom", "Tom", "PROPN", 3, "nsubj"), R(3, "left", "leave", "VERB", 0, "root"), R(4, ".", ".", "PUNCT", 3, "punct")]),
  ];
  const m = textMereology(src, parse, { address: "test#1" });
  const chk = checkMereology(m);
  assert.ok(chk.ok, JSON.stringify(chk.violations.slice(0, 5)));
  assert.equal(m.coverage.paragraphs, 2);
  assert.equal(m.coverage.treeRate, 1); assert.equal(m.coverage.alignedRate, 1); assert.equal(m.coverage.charRate, 1);
  const byId = new Map(m.nodes.map((x) => [x.id, x]));
  assert.equal(byId.get("s0").parent, "p0"); assert.equal(byId.get("s1").parent, "p1");
  // "a key" is a phrase whose relation to the action is karaṇa, and the token "a" is a part of it
  assert.equal(byId.get("s0.x9").panini, "karaṇa"); assert.equal(byId.get("s0.t8").parent, "s0.x9");
  assert.deepEqual(ancestors(m, "s0.t8"), ["s0.x9", "s0", "p0", "doc"]);
  // the frame of the passive action: roles by kāraka, the patient is the door
  const f = m.frames.find((x) => x.kriya === "open");
  assert.equal(f.voice, "passive");
  assert.deepEqual(f.roles["karman"], ["s0.x2"]); assert.deepEqual(f.roles["kartṛ"], ["s0.x6"]); assert.deepEqual(f.roles["karaṇa"], ["s0.x9"]);
});

test("byte addresses count UTF-8, not UTF-16", () => {
  const src = "Ré ate 🍎.";
  const B = byteOffsets(src);
  assert.equal(B[3], 4); // "ate" starts after R(1) é(2) space(1)
  assert.equal(B[src.length], Buffer.byteLength(src));
  const m = textMereology(src, [sent(0, 0, src, [R(1, "Ré", "Ré", "PROPN", 2, "nsubj"), R(2, "ate", "eat", "VERB", 0, "root"), R(3, "🍎", "🍎", "NOUN", 2, "obj"), R(4, ".", ".", "PUNCT", 2, "punct")])]);
  const apple = m.nodes.find((x) => x.form === "🍎");
  assert.deepEqual(apple.bytes, [Buffer.byteLength("Ré ate "), Buffer.byteLength("Ré ate 🍎")]);
});

test("what the reader did not read is listed, never hidden (the 100% is measured)", () => {
  const src = "CHAPTER I\n\nAlice left.";
  const m = textMereology(src, [sent(0, 11, "Alice left.", [R(1, "Alice", "Alice", "PROPN", 2, "nsubj"), R(2, "left", "leave", "VERB", 0, "root"), R(3, ".", ".", "PUNCT", 2, "punct")])]);
  assert.equal(m.coverage.unreadRuns, 1);
  assert.ok(m.coverage.charRate < 1);
  assert.equal(m.gaps.find((g) => g.gap === "unread_chars").sample[0].text, "CHAPTER I");
});

test("an orphaned row (a head cycle) is kept, flagged and placed in its sentence; the tree stays a tree", () => {
  const src = "a b c d.";
  const rows = [R(1, "a", "a", "X", 0, "root"), R(2, "b", "b", "X", 3, "dep"), R(3, "c", "c", "X", 2, "dep"), R(4, "d", "d", "X", 1, "dep"), R(5, ".", ".", "PUNCT", 1, "punct")];
  const m = textMereology(src, [sent(0, 0, src, rows)]);
  assert.equal(m.coverage.orphans, 2);
  assert.equal(m.coverage.treeRate, 3 / 5);
  assert.ok(m.nodes.find((x) => x.form === "b").orphan);
  assert.ok(checkMereology(m).ok);
});

test("paragraphs are runs between blank lines (CRLF too)", () => {
  assert.deepEqual(paragraphSpans("a b\r\n\r\nc\n \n\nd"), [[0, 3], [7, 8], [12, 13]]);
});
