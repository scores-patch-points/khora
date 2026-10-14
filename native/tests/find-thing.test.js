// native/tests/find-thing.test.js — the find organ (organs/find-thing.js). The control sits beside the claim: a callable the
// ask names must rank above where ANOTHER ask's words put it, and a word that lands nowhere is a typed gap, not a guess.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { find, wordsOf, stem, ReferentField, FIND_SCHEMA } from "../organs/find-thing.js";
import { findCapacity } from "../organs/capacities.js";
import { cellOf } from "../kernel/cube.js";

const names = new Map([
  ["slugifyTitle", "library"], ["formatCurrency", "library"], ["readJsonFile", "repo"], ["writeJsonFile", "repo"],
  ["parseCsvRow", "repo"], ["debounce", "library"], ["sumPrices", "repo"], ["renderTable", "repo"],
]);
const own = new Set(["buildReport"]);
const runtime = new Set(["push", "map", "join", "readFileSync", "parse", "stringify"]);

test("registered: capacity find-thing, SEG·Ground → Differentiate / Structure / Field, fn find", async () => {
  const c = findCapacity("find-thing");
  assert.ok(c, "the capacity exists");
  assert.equal(c.module, "organs/find-thing.js");
  assert.equal(c.fn, "find");
  assert.equal(c.op, "SEG");
  const cell = cellOf("SEG", "Ground");
  assert.equal(c.terrain, cell.terrain);
  assert.deepEqual([cell.mode, cell.domain, cell.terrain], ["Differentiate", "Structure", "Field"]);
  const mod = await import(`../${c.module}`);
  assert.equal(typeof mod[c.fn], "function");
});

test("words: camelCase and snake_case split, suffixes cut lightly, never below three letters", () => {
  assert.deepEqual([...wordsOf("formatCurrency read_json_file")].sort(), ["currency", "file", "format", "json", "read"]);
  assert.equal(stem("reading"), "read");
  assert.equal(stem("titles"), "title");
  assert.equal(stem("formatted"), "format");
  assert.equal(stem("formatting"), "format");
  assert.equal(stem("boxes"), "box");
  assert.equal(stem("queries"), "query");
  assert.equal(stem("class"), "class", "a double s is not a plural");
  assert.equal(stem("is"), "is");
  assert.equal(stem("bus"), "bus", "a three-letter word is not cut");
});

test("the callable the ask names comes first; the library kind is reported with it", () => {
  const r = find({ ask: "slugify the post titles for a url", names, own, runtime });
  assert.equal(r.ok, true);
  assert.equal(r.schema, FIND_SCHEMA);
  assert.equal(r.candidates[0].name, "slugifyTitle");
  assert.equal(r.candidates[0].kind, "library");
  assert.deepEqual(r.candidates[0].matched, ["slugify", "title"]);
});

test("THE CONTROL BUILT TO FAIL: another ask's words rank the same callable below the real ask", () => {
  const real = find({ ask: "read the config json file from disk", names, own, runtime, k: 20 });
  const other = find({ ask: "render a table of totals with prices", names, own, runtime, k: 20 });
  const rank = (r, n) => r.candidates.findIndex((c) => c.name === n);
  assert.equal(rank(real, "readJsonFile"), 0);
  assert.ok(rank(other, "readJsonFile") === -1 || rank(other, "readJsonFile") > 0, "another ask does not put it first");
});

test("an own-file declaration outranks an equal-scoring repo or runtime name (ties by kind)", () => {
  const r = find({ ask: "build the report", names: new Map([["buildReportRows", "repo"]]), own: new Set(["buildReport"]), runtime: new Set(["build"]) });
  assert.equal(r.candidates[0].name, "buildReport");
  assert.equal(r.candidates[0].kind, "own");
});

test("a word that lands nowhere is a typed gap, never a guess; an empty ask and an empty field are typed too", () => {
  assert.equal(find({ ask: "frobnicate the quux", names, own, runtime }).gap.kind, "no-word-landed");
  assert.equal(find({ ask: "", names }).gap.kind, "no-words");
  assert.equal(find({ ask: "read the file" }).gap.kind, "empty-field");
});

test("A LIMIT, named: a word and its derivation are different words (`slug` does not find `slugify`)", () => {
  const r = find({ ask: "make a slug", names, own, runtime });
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "no-word-landed");
});

test("a word nearly every name carries weighs little: the rare word decides", () => {
  const field = new Map([["getUserName", "repo"], ["getUserId", "repo"], ["getUserAge", "repo"], ["getInvoicePdf", "repo"]]);
  const r = find({ ask: "get the invoice", names: field });
  assert.equal(r.candidates[0].name, "getInvoicePdf");
});

test("the organ is pure: it never reaches for the network, a model or a write", () => {
  const src = fs.readFileSync(new URL("../organs/find-thing.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(|writeFile|appendFile|child_process|ollama/i);
});

test("REFERENTS: an ask whose words share nothing with the name still reaches the callable once those words were attested for it", () => {
  const field = new ReferentField();
  field.learn("make a url slug from the post title", ["slugifyTitle"]);
  field.learn("render a table of the totals", ["renderTable"]);
  // lexical alone: `slug` and `slugify` are different words
  assert.equal(find({ ask: "give me a slug", names, own, runtime }).ok, false);
  const r = find({ ask: "give me a slug", names, own, runtime, referents: field, mode: "referent" });
  assert.equal(r.ok, true);
  assert.equal(r.candidates[0].name, "slugifyTitle");
  const both = find({ ask: "give me a slug for the title", names, own, runtime, referents: field, mode: "both" });
  assert.equal(both.candidates[0].name, "slugifyTitle");
});

test("REFERENTS, the control built to fail: words never attested to a callable reach nothing, and an empty field is a typed gap", () => {
  const field = new ReferentField();
  field.learn("make a url slug from the post title", ["slugifyTitle"]);
  field.learn("render a table of the totals", ["renderTable"]);
  assert.equal(find({ ask: "balance the ledger quarterly", names, own, runtime, referents: field, mode: "referent" }).gap.kind, "no-referent-landed");
  assert.equal(find({ ask: "give me a slug", names, own, runtime, referents: new ReferentField(), mode: "referent" }).gap.kind, "no-referent-landed");
  // another ask's words do not put the callable first
  const other = find({ ask: "render the totals table", names, own, runtime, referents: field, mode: "referent" });
  assert.notEqual(other.candidates?.[0]?.name, "slugifyTitle");
});

test("REFERENTS only rank callables that are on the ground: an attested name the session does not hold is not proposed", () => {
  const field = new ReferentField();
  field.learn("make a url slug", ["slugifyTitle", "someOtherReposHelper"]);
  field.learn("render the totals table", ["renderTable"]);
  const r = find({ ask: "slug please", names, own, runtime, referents: field, mode: "referent" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.candidates.map((c) => c.name), ["slugifyTitle"]);
});

test("a field learns the units it is fed, in order, and scoring never mutates it (prequential)", () => {
  const field = new ReferentField();
  assert.equal(field.learn("", ["a"]), 0);
  const before = field.score("slug");
  assert.equal(before.size, 0);
  field.learn("url slug", ["slugifyTitle"]);
  const s1 = [...field.score("slug")];
  const s2 = [...field.score("slug")];
  assert.deepEqual(s1, s2);
  assert.equal(field.units, 1);
});
