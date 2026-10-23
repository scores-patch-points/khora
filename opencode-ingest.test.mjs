import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
process.env.FOLD_INGEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ing-"));
const I = await import("./opencode-ingest.mjs");
const doc = Array.from({ length: 60 }, (_, i) => `---- Page ${i + 1} of 60 ----\nPOLICY ${["Rotterdam-North", "Rotterdam-South"][i % 2]}: the dwell time is ${10 + i} hours. Filler about pallets and cranes ${"lorem ".repeat(40)}`).join("\n");

test("an attachment in parts is stored once whole, as addressed pages", () => {
  I._resetForTest();
  const half = Math.floor(doc.length / 2);
  assert.equal(I.ingest({ sessionID: "s", id: "d1", name: "arc.txt", text: doc.slice(0, half), part: 0, parts: 2 }).received, 1);
  const r = I.ingest({ sessionID: "s", id: "d1", name: "arc.txt", text: doc.slice(half), part: 1, parts: 2 });
  assert.equal(r.pages, 60);
  assert.match(r.note, /60 pages kept by the machine/);
});

test("an exact name outranks its near-miss sibling, and pages are quoted whole with their address", () => {
  I._resetForTest();
  I.ingest({ sessionID: "t", id: "d1", name: "arc.txt", text: doc });
  const { note } = I.pagesNote({ sessionID: "t", ask: "What is the dwell time at Rotterdam-South?", maxPages: 3 });
  const first = note.split("\n\n")[0];
  assert.match(first, /arc\.txt#p\d+\]\nPOLICY Rotterdam-South/);
  assert.doesNotMatch(note.split("[arc.txt#").slice(1, 4).join(""), /POLICY Rotterdam-North/);
});

test("a session with no attachment gets nothing, and the store survives a restart", () => {
  I._resetForTest();
  assert.equal(I.pagesNote({ sessionID: "nobody", ask: "x" }).gap, "none");
  I.ingest({ sessionID: "u", id: "d1", name: "arc.txt", text: doc });
  I._resetForTest();
  assert.ok(I.pagesNote({ sessionID: "u", ask: "dwell time Rotterdam-North" }).note);
});

test("a document without page marks is cut at paragraph boundaries", () => {
  const pages = I.pagesOf(Array.from({ length: 20 }, (_, i) => `Paragraph ${i}. ${"word ".repeat(200)}`).join("\n\n"), { chunk: 3000 });
  assert.ok(pages.length > 3 && pages.every((p) => p.length <= 3000 + 1100));
});
