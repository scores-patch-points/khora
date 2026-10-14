import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { repairSentence, alignWords } from "./mouth-repair.js";
import { seg, sentence } from "./prose-laws.js";
import { loadModel } from "../adapters/text/english-parser.js";

const model = loadModel(JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../priors/parser-eng-ewt.json"), "utf8")));
const SRC = "In 2022, the Senate passed the bill by unanimous consent.";
// A sentence with a grammar fault the mouth may fix: a missing article before a copied noun.
const s = sentence([seg.source("Bill", "px_0/text@0#b33-37"), seg.frame(" was "), { ...seg.value("passed"), form: true }, seg.frame(" by "), seg.source("the Senate", "px_0/text@0#b9-19"), seg.frame(".")], ["a_1"]);
const stub = (reply) => async () => reply;

test("a grammar-only repair: the added article is a self:model segment; copied bytes keep their addresses", async () => {
  const r = await repairSentence(s, { draw: stub("The bill was passed by the Senate."), source: SRC, model, mouth: "gemma2:2b" });
  assert.ok(r.ok, JSON.stringify(r.refused));
  assert.equal(r.sentence.text, "The bill was passed by the Senate.");
  assert.deepEqual(r.additions, [{ text: "The", by: "self:gemma2:2b" }]);
  const bill = r.sentence.segs.find((g) => g.kind === "source" && /bill/i.test(g.t));
  assert.equal(bill.address, "px_0/text@0#b33-37");
  assert.ok(bill.caseFolded, "the case change is the declared typographic fold, recorded");
});

test("a fabricated content word refuses the repair; the unrepaired sentence stands", async () => {
  const r = await repairSentence(s, { draw: stub("The bill was quickly passed by the Senate."), source: SRC, model });
  assert.equal(r.ok, false);
  assert.match(r.refused.why, /quickly/);
  assert.equal(r.sentence, s);
});

test("deleting copied words refuses the repair", async () => {
  const r = await repairSentence(s, { draw: stub("The bill was passed."), source: SRC, model });
  assert.equal(r.ok, false);
  assert.match(r.refused.why, /deleted copied words/);
});

test("no mouth reachable: nothing changes, and it says so", async () => {
  const r = await repairSentence(s, { draw: null, source: SRC, model });
  assert.equal(r.ok, false);
  assert.match(r.refused.why, /no mouth reachable/);
});

test("the alignment is word-level LCS (a control that can fail)", () => {
  const al = alignWords(["Bill", "was", "passed"], ["The", "bill", "was", "passed"]);
  assert.deepEqual(al.map((x) => x.op), ["add", "keep", "keep", "keep"]);
});
