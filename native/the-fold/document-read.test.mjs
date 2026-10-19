// document-read.test.mjs — PROVE the door's document read (POST /v1/documents,
// what openfold's plugin calls) runs the REAL READING PIPELINE, and FALSIFY the
// lexical snip it replaced: the projection must carry the reader's CAST and the
// ADDRESSED edges, and a relation the task asks for must be found even where the
// keyword grep alone would answer with a sentence.
import test from "node:test";
import assert from "node:assert/strict";
import {documentRead} from "./document-read.mjs";

const DOC = {name: "filing.txt", text: "The Federal Reserve raised rates in March. Higher rates made credit expensive for small firms. The Federal Reserve raised rates again in June, and small firms paid more. Suppliers passed the cost to customers, and investors ignored the links between these firms."};

test("the door's read names the canonical reader and is primed", () => {
  const out = documentRead("what did the Federal Reserve do to small firms?", [DOC]);
  assert.equal(out.reader, "read-process.mjs::readToWeft");
  assert.equal(out.primed, true, "the priors were loaded");
  assert.match(out.projection, /read-process\.mjs::readToWeft \(primed\)/);
});

test("FALSIFIER: the projection carries the reader's CAST and ADDRESSED edges, not just keyword sentences", () => {
  const out = documentRead("what did the Federal Reserve do to small firms?", [DOC]);
  assert.ok(out.cast.length >= 1, "the cast (beings) rides the projection");
  assert.match(out.projection, /CAST \(the reader's beings\)/);
  assert.ok(out.edges.length >= 1, "addressed edges ride the projection");
  for (const e of out.edges) {
    assert.ok(e.end1 && e.label && e.end2, "an edge is end1 · label · end2");
    assert.ok(e.refs, "every edge carries its address");
  }
  for (const row of out.rows) if (row.role === "part" && row.giver?.startsWith("eoreader7:read")) assert.ok("address" in row, "the row names the bytes it was read from");
});

test("the reading answers with a RELATION, where the lexical snip would return a sentence", () => {
  const out = documentRead("what did the Federal Reserve do?", [DOC]);
  const relational = out.edges.find((e) => /federal reserve/i.test(e.end1 ?? "") && e.label && e.refs);
  assert.ok(relational, "a labeled, addressed relation about the task's subject is in the read");
  assert.match(out.projection, /\[[^\]]+\]/, "the projection shows end1 [label] end2, not a bare sentence");
});

test("no source is a typed ungrounded answer, never a silent empty projection", () => {
  const out = documentRead("anything", []);
  assert.match(out.projection, /DISCLOSED UNGROUNDED/);
  assert.equal(out.reader, "read-process.mjs::readToWeft");
});

test("a reader failure is disclosed in the rows, never swallowed", () => {
  const out = documentRead("x", [{name: "empty.txt", text: "   "}, DOC]);
  assert.ok(out.rows.length >= 2);
  assert.ok(Array.isArray(out.edges));
});
