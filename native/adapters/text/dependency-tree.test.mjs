import { test } from "node:test";
import assert from "node:assert/strict";
import { treeOf, treeSize, treeDepth, flattenTree } from "./dependency-tree.mjs";

const rows = [
  { id: 1, form: "Genoa", head: 5, deprel: "nsubj", karaka: "kartṛ" },
  { id: 2, form: "and", head: 3, deprel: "cc", karaka: null },
  { id: 3, form: "Lucca", head: 1, deprel: "conj", karaka: "kartṛ" },
  { id: 4, form: "of", head: 5, deprel: "case", karaka: null },
  { id: 5, form: "estates", head: 0, deprel: "root", karaka: null },
  { id: 6, form: "Buonapartes", head: 5, deprel: "nmod", karaka: "adhikaraṇa" },
];

test("treeOf: root is head 0, children nested by head", () => {
  const t = treeOf(rows);
  assert.equal(t.form, "estates");
  assert.equal(t.children.length, 3); // Genoa, of, Buonapartes (head 5)
  const genoa = t.children.find((c) => c.form === "Genoa");
  assert.equal(genoa.children[0].form, "Lucca"); // Lucca conj of Genoa
});

test("treeSize: equals row count (lossless)", () => {
  assert.equal(treeSize(treeOf(rows)), rows.length);
});

test("flattenTree: round-trips to the input rows (lossless)", () => {
  const flat = flattenTree(treeOf(rows));
  assert.equal(flat.length, rows.length);
  const ids = flat.map((f) => f.id).sort();
  assert.deepEqual(ids, rows.map((r) => r.id).sort());
});

test("treeDepth: measures nesting", () => {
  assert.ok(treeDepth(treeOf(rows)) >= 3);
});
