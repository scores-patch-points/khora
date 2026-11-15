// text-reading.test.mjs — the rows of a text-reading entry (organs/text-reading.mjs), checked against the
// ledger's own rowsOf (ledgers/paraphrase-100/exp/diff-first/src/lib.mjs) on real readFull readings, plus a
// falsifying case for each rule the organ applies. The ledger file is only read, never changed; absent, those
// cases skip and say so.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { rowsOf, sha16, textAddr, readingAddr, textOf, toRead, readingInput, READING_KIND, READING_CELL, READER } from "./text-reading.mjs";

const LEDGER_LIB = process.env.DIFF_FIRST_LIB ?? path.join(os.homedir(), "Documents", "claude code", "ledgers", "paraphrase-100", "exp", "diff-first", "src", "lib.mjs");
const haveLedger = fs.existsSync(LEDGER_LIB);
const skipLedger = haveLedger ? false : `ledger rowsOf not found at ${LEDGER_LIB} (set DIFF_FIRST_LIB)`;

// several real sentences: one and many sentences, punctuation of every sort, a contraction, a number, a name, a quote, an empty text
const SENTENCES = [
  "The cat sat on the mat. It was happy.",
  "The committee approved the budget on Tuesday; the mayor, however, vetoed it two days later.",
  "She didn't think the 3 reports were finished. \"Not yet,\" said Dr. Okafor. They arrived in March!",
  "Dogs bark, cats meow, and birds sing at dawn.",
  "Hello!",
  "",
];

test("rowsOf reproduces the ledger's rowsOf on real readFull readings", { skip: skipLedger, timeout: 300_000 }, async () => {
  process.env.KHORA_PRIORS_DIR ||= path.join(os.homedir(), "Documents", "janus", "priors");
  const { readFull } = await import("../reading-full.js");
  const ledger = await import(pathToFileURL(LEDGER_LIB).href);
  let rows = 0, multi = 0;
  for (const text of SENTENCES) {
    const R = await readFull(text, { language: "en" });
    const mine = rowsOf(R), theirs = ledger.rowsOf(R);
    assert.deepEqual(mine, theirs, `rows differ for ${JSON.stringify(text)}`);
    assert.equal(JSON.stringify(mine), JSON.stringify(theirs));   // same key order too, so the logged body is the same bytes
    rows += mine.length; if (new Set(mine.map((r) => r.s)).size > 1) multi += 1;
  }
  assert.ok(rows > 20, `too few rows to be a test: ${rows}`);
  assert.ok(multi >= 1, "at least one text must span more than one sentence");   // readFull may keep two short sentences in one parse unit; s is whatever it returns
});

// --- the rules, each with a case that would fail if the rule were wrong ---

const row = (id, form, lemma, upos, more = {}) => ({ id, form, lemma, upos, feats: "_", head: 0, deprel: "root", ...more });

test("PUNCT rows are dropped and nothing else is", () => {
  const R = { entry: { parse: [{ rows: [row(1, "Go", "go", "VERB"), row(2, "!", "!", "PUNCT"), row(3, "x", "x", "SYM")] }] } };
  assert.deepEqual(rowsOf(R).map((r) => r.form), ["Go", "x"]);
});

test("key is the lemma lower-cased, the form when the lemma is empty; feats missing is null", () => {
  const R = { entry: { parse: [{ rows: [row(1, "Paris", "Paris", "PROPN"), row(2, "Ran", "", "VERB"), { id: 3, form: "it", lemma: "it", upos: "PRON", head: 2, deprel: "obj" }] }] } };
  const out = rowsOf(R);
  assert.deepEqual(out.map((r) => r.key), ["paris", "ran", "it"]);
  assert.equal(out[2].feats, null);
  assert.deepEqual(Object.keys(out[0]), ["s", "id", "form", "lemma", "upos", "feats", "head", "deprel", "key"]);
});

test("s is the sentence index, for each parse shape the ledger accepts", () => {
  const s1 = [row(1, "A", "a", "DET")], s2 = [row(1, "B", "b", "NOUN")];
  for (const R of [{ entry: { parse: [{ rows: s1 }, { rows: s2 }] } }, { entry: { parse: [{ tokens: s1 }, { tokens: s2 }] } }, { parse: [s1, s2] }]) {
    assert.deepEqual(rowsOf(R).map((r) => [r.s, r.key]), [[0, "a"], [1, "b"]]);
  }
  assert.deepEqual(rowsOf({ entry: { parse: s1 } }).map((r) => r.s), [0]);   // a flat row list is one sentence
  assert.deepEqual(rowsOf({ entry: { parse: [] } }), []);
});

test("sha16 is the first 16 hex of sha256 over UTF-8", () => {
  const t = "café — naïve";
  assert.equal(sha16(t), crypto.createHash("sha256").update(Buffer.from(t, "utf8")).digest("hex").slice(0, 16));
  assert.equal(textAddr(t), `text:${sha16(t)}`);
  assert.equal(readingAddr(t), `reading:${sha16(t)}`);
  assert.notEqual(sha16("a"), sha16("a "));
});

const textEntry = (text, over = {}) => ({ id: `id-${sha16(text)}`, kind: "text", cell: "INS·Ground", addr: textAddr(text), body: { text, language: "en" }, ...over });

test("a text filed at an address that is not its own is not read, and says why", () => {
  const good = textEntry("One."), bad = textEntry("Two.", { addr: textAddr("Three.") });
  assert.equal(textOf(good).ok, true);
  const t = textOf(bad);
  assert.equal(t.ok, false);
  assert.match(t.why, /is not text:/);
  assert.equal(textOf({ addr: "text:x", body: { language: "en" } }).ok, false);
  const { todo, skipped } = toRead([good, bad], []);
  assert.deepEqual(todo.map((x) => x.text), ["One."]);
  assert.equal(skipped.length, 1);
});

test("toRead: only texts with no reading, once per address; a rerun after weaving finds nothing", () => {
  const a = textEntry("Alpha."), b = textEntry("Beta."), a2 = textEntry("Alpha.", { id: "other-id", body: { text: "Alpha.", language: "en", note: 1 } });
  const first = toRead([a, b, a2], []);
  assert.deepEqual(first.todo.map((x) => [x.entry.id, x.addr]), [[a.id, readingAddr("Alpha.")], [b.id, readingAddr("Beta.")]]);
  const woven = first.todo.map((x) => ({ addr: x.addr }));
  assert.deepEqual(toRead([a, b, a2], woven).todo, []);
  assert.deepEqual(toRead([a, b], [{ addr: readingAddr("Beta.") }]).todo.map((x) => x.text), ["Alpha."]);
});

test("language is the asker's; it defaults to en only when left out", () => {
  assert.equal(textOf(textEntry("Uno.", { body: { text: "Uno.", language: "es" } })).language, "es");
  assert.equal(textOf(textEntry("Uno.", { body: { text: "Uno." } })).language, "en");
});

test("readingInput: the contract's cell, kind, address, of and body; rows only, no judgement", () => {
  const e = textEntry("Go!");
  const [item] = toRead([e], []).todo;
  const R = { entry: { parse: [{ rows: [row(1, "Go", "go", "VERB"), row(2, "!", "!", "PUNCT")] }] } };
  const w = readingInput(item, R);
  assert.deepEqual(Object.keys(w).sort(), ["addr", "body", "cell", "kind", "of"]);
  assert.equal(w.cell, READING_CELL);
  assert.equal(w.kind, READING_KIND);
  assert.equal(w.addr, readingAddr("Go!"));
  assert.deepEqual(w.of, [e.id]);
  assert.deepEqual(Object.keys(w.body).sort(), ["language", "reader", "rows"]);
  assert.equal(w.body.reader, READER);
  assert.deepEqual(w.body.rows, rowsOf(R));
});
