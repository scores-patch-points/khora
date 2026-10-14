import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { realizeClaim, claimFromSentence, logosOrder } from "./claim-realize.js";
import { loadModel } from "../adapters/text/english-parser.js";
import en from "../adapters/text/telling-grammar.en.js";
import { readWhom } from "./whom.js";
import { makePinax } from "./pinax.js";

const here = dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
// A one-sentence "store": addresses are byte offsets into the sentence itself, so slice() can verify every copied segment.
const PX = "px_00000000000000000000/text@000000000000";
const sliceOf = (text) => async (address) => { const m = address.match(/#b(\d+)-(\d+)$/); return new TextDecoder().decode(new TextEncoder().encode(text).subarray(+m[1], +m[2])); };
const run = (text, witness) => realizeClaim({ claim: { text, address: `${PX}#b0-${new TextEncoder().encode(text).length}` }, witness }, { slice: sliceOf(text), grammar: en, model });

test("active → passive: every content word copied with its address, the verb inflected from an EWT-attested form, read back to the same claim", async () => {
  const r = await run("In 2022, the Senate passed the bill by unanimous consent.", { pred: "passed", subj: "the Senate" });
  const p = r.alternatives.find((a) => a.alternation === "passive");
  assert.ok(p?.ok, JSON.stringify(p, null, 1));
  assert.equal(p.text, "The bill was passed by the Senate in 2022 by unanimous consent.");
  assert.deepEqual(p.equate.recovered, { pred: "pass", patient: "The bill", agent: "the Senate" });
  assert.ok(p.segs.filter((x) => x.kind === "source").every((x) => /#b\d+-\d+$/.test(x.address)));
  assert.ok(p.novelty.netNew && p.novelty.newAdjacencies > 0);
});

test("a report becomes “According to X, …”, the reported clause carried whole", async () => {
  const r = await run("Critics argue it could create uncomfortably dark winter mornings, particularly in northern states.", { pred: "argue", subj: "Critics" });
  const a = r.alternatives.find((x) => x.alternation === "according-to");
  assert.ok(a?.ok);
  assert.equal(a.text, "According to critics, it could create uncomfortably dark winter mornings, particularly in northern states.");
  assert.ok(a.segs.some((x) => x.caseFolded), "the moved subject's sentence-initial capital is case-folded, and says so");
});

test("no independent witness, no paraphrase: the parser alone is one reader agreeing with itself", async () => {
  const r = await run("In 2022, the Senate passed the bill by unanimous consent.", null);
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /no independent witness/);
});

test("the witness and the parser must agree on the predicate and the subject", async () => {
  const r = await run("In 2022, the Senate passed the bill by unanimous consent.", { pred: "consent", subj: "the bill" });
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /disagree/);
});

test("logos, at the clause: a predicate hanging on a number is an untrusted parse, refused before any paraphrase", async () => {
  const r = await run("On July 14, 2026, the House passed a Sunshine Protection Act bill backed by President Trump.", { pred: "passed", subj: "the House" });
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /hangs as parataxis on “2026”/);
});

test("logos, within an argument: a carried word may not outlive or outrank its head (controls that must fail)", () => {
  const src = claimFromSentence("The House passed a Sunshine Protection Act bill.", null, { model });
  const predId = src.rows.find((r) => r.lemma === "pass").id;
  const rows = (t) => claimFromSentence(t, null, { model })?.rows ?? [];
  const dropHead = logosOrder(src.rows, rows("A Sunshine Protection Act was passed by the House."), { predId });
  assert.equal(dropHead.ok, false, "“bill” was dropped and its compound kept: outlives_head");
  assert.ok(dropHead.violations.some((v) => v.kind === "outlives_head"));
  const keep = logosOrder(src.rows, rows("A Sunshine Protection Act bill was passed by the House."), { predId });
  assert.equal(keep.ok, true, JSON.stringify(keep.violations));
});

test("another language returns a typed refusal: no bilingual lexicon, never a guessed translation", async () => {
  const r = await realizeClaim({ claim: { text: "The Senate passed the bill.", address: `${PX}#b0-27` }, lang: "es", witness: { pred: "passed" } }, { slice: sliceOf("The Senate passed the bill."), grammar: en, model });
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /bilingual lexicon/);
});

test("net new is reader-relative: an adjacency the reader's W already holds is not new to them (W = ∅: the source alone)", async () => {
  const text = "In 2022, the Senate passed the bill by unanimous consent.";
  const witness = { pred: "passed", subj: "the Senate" };
  const passive = (r) => r.alternatives.find((a) => a.alternation === "passive");
  const alone = passive(await run(text, witness));
  assert.ok(alone.novelty.netNew && alone.novelty.newForWhom === undefined);
  const shown = alone.text;
  const W = readWhom([await makePinax({ url: "whom:t.md", raw: shown, text: shown, extractor: { name: "test" } })]);
  const r = passive(await realizeClaim({ claim: { text, address: `${PX}#b0-${new TextEncoder().encode(text).length}` }, witness, whom: W }, { slice: sliceOf(text), grammar: en, model }));
  assert.equal(r.text, shown, "the paraphrase itself is unchanged; only the gate reads the reader");
  assert.equal(r.novelty.newForWhom, 0);
  assert.equal(r.novelty.heldByWhom, alone.novelty.newAdjacencies);
  assert.equal(r.novelty.netNew, false, "a reader who was already shown this paraphrase gets nothing net new from it");
  assert.equal(r.ok, false);
});
