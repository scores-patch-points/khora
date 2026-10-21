// opencode-gather-typos.test.mjs — a misspelt word is mended only against the prior, and the gather only mends after reading nothing.
//   node --test opencode-gather-typos.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
const T = await import("./opencode-gather-typos.mjs");

test("a transposed or dropped letter is the prior's word", () => {
  assert.equal(T.fixWord("commerical"), "commercial");
  assert.equal(T.fixWord("airtlines"), "airlines");
  assert.equal(T.fixWord("captial"), "capital");
  assert.deepEqual(T.correct("what is the captial of Australia").fixed, [["captial", "capital"]]);
});

test("a word the prior knows, a name and a short word are left alone", () => {
  assert.equal(T.fixWord("airline"), null);
  assert.equal(T.fixWord("Rwanda"), null);
  assert.equal(T.fixWord("cat"), null);
  assert.equal(T.distance("form", "from"), 1, "a transposition is one edit");
});

test("the correction is a fallback, not a rewrite: a real rare word can look like a typo, so it is only tried after nothing was read", () => {
  // measured while building it: panthera -> panera, dehydration -> hydration, espresso -> express when mended up front
  assert.equal(T.fixWord("panthera"), "panera");
  const src = (await_import_source());
  assert.match(src, /if \(!run\.sources\.length && !io\.stop\?\.aborted\)/);
});
function await_import_source() { return fsRead(new URL("./opencode-gather.mjs", import.meta.url)); }
import fs from "node:fs";
function fsRead(u) { return fs.readFileSync(u, "utf8"); }
