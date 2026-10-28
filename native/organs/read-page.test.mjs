import test from "node:test";
import assert from "node:assert/strict";
import * as GE from "../adapters/text/grammar-en.js";
import { readAtoms, readPage } from "./read-atoms.js";

// readPage resolves a page ONCE, so an entity keeps its id from the sentence that introduces it to the last: a document read as a page has nodes with real
// occurrence counts. readAtoms (one sentence with the page before it) is readPage from the last sentence, and says what it always said.
const grammar = { rowsOf: GE.rowsOf, claimsOf: (t, rows) => GE.claimsOf(t, rows) };
const page = ["Sourcewell is a public institution in Minnesota.", "Motorola Solutions, Inc. is a supplier.", "Sourcewell awarded Motorola Solutions, Inc. a master agreement."];
const ids = (r, name) => [...new Set(r.atoms.flatMap((a) => a.args).filter((x) => x.entity != null && x.name === name).map((x) => x.entity))];

test("a name met in several sentences keeps its entity across the page", () => {
  const R = readPage({ sentences: page, lang: "en", grammar });
  assert.equal(R.length, 3);
  const m = R.flatMap((r) => ids(r, "Motorola Solutions, Inc"));
  assert.ok(m.length >= 2, "Motorola Solutions is named in two sentences");
  assert.equal(new Set(m).size, 1, `one entity, got ${m}`);
  assert.deepEqual(R[2].entities, R[0].entities, "the page is resolved once: every sentence reads the same entities");
});

test("readAtoms is readPage from the last sentence: the same atoms, spans and unread", () => {
  const all = readPage({ sentences: page, lang: "en", grammar }), one = readAtoms({ text: page[2], previous: page.slice(0, 2), grammar });
  assert.deepEqual(one, all[2], "the whole reading, its page, forms, cuts and span map included");
  assert.equal(readPage({ sentences: page, lang: "en", grammar, from: 2 }).length, 1);
});
