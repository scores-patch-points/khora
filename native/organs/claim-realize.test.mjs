import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { realizeClaim, claimFromSentence, logosOrder, segmentClauses, readRows, readClause, omissionLedger, checkDisclosure } from "./claim-realize.js";
import { loadModel, tokenize, tagSentence, tagSentenceAttested } from "../adapters/text/english-parser.js";
import en from "../adapters/text/telling-grammar.en.js";
import { readWhom } from "./whom.js";
import { makePinax } from "./pinax.js";

const here = dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(readFileSync(join(here, "../priors/parser-eng-ewt.json"), "utf8")));
// A one-sentence "store": addresses are byte offsets into the sentence itself, so slice() can verify every copied segment.
const PX = "px_00000000000000000000/text@000000000000";
const sliceOf = (text) => async (address) => { const m = address.match(/#b(\d+)-(\d+)$/); return new TextDecoder().decode(new TextEncoder().encode(text).subarray(+m[1], +m[2])); };
const run = (text, witness, roles = null) => realizeClaim({ claim: { text, address: `${PX}#b0-${new TextEncoder().encode(text).length}` }, witness, roles }, { slice: sliceOf(text), grammar: en, model });

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
  const r = await run("In 2022, the Senate passed the bill by unanimous consent.", { pred: "passed", subj: "the bill" });
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /disagree/);
});

const JULY = "On July 14, 2026, the House passed a Sunshine Protection Act bill backed by President Trump.";
test("logos, at the clause: a predicate hanging on a number is an untrusted parse (the whole-sentence reading, kept as the control)", () => {
  const c = claimFromSentence(JULY, null, { model, predForm: "passed" });
  assert.equal(c.untrusted, true);
  assert.match(c.why, /hangs as parataxis on “2026”/);
});

test("clause segmentation: the fronted date is cut off, the clause is read alone, and the two parses agree on its arguments", async () => {
  const seg = segmentClauses(JULY, readRows(model, JULY));
  assert.deepEqual(seg.fronted.map((f) => [f.kind, JULY.slice(f.from, f.to)]), [["adjunct", "On July 14, 2026"]]);
  assert.deepEqual(seg.clauses.map((c) => [c.kind, JULY.slice(c.from, c.to)]), [["main", "the House passed a Sunshine Protection Act bill backed by President Trump"]]);
  const rc = readClause(JULY, `${PX}#b0-${JULY.length}`, { model, predForm: "passed", subjText: "the House" });
  assert.equal(rc.claim.untrusted, undefined, "the clause parse is trusted where the whole-sentence parse was not");
  assert.equal(rc.claim.subj.text, "the House");
  assert.equal(rc.claim.obj.text, "a Sunshine Protection Act bill backed by President Trump", "“bill” is a noun again (closed classes held to EWT)");
  assert.ok(rc.claim.obls.some((o) => o.text === "On July 14, 2026"), "the fronted adjunct is re-joined as an oblique");
  // …and the read-back still refuses what is genuinely ambiguous: carried after "backed by President Trump", the date re-scopes.
  const r = await run(JULY, { pred: "passed", subj: "the House" });
  const end = r.alternatives.find((a) => a.alternation === "adjunct-to-end");
  assert.equal(end.ok, false);
  assert.match(end.equate.why, /reads back inside another clause/);
});

test("closed classes are held to what EWT attests: “bill” is never AUX (the plain tagger is the control, and it fails)", () => {
  const words = tokenize(JULY).map((t) => t.form);
  const k = words.indexOf("bill");
  assert.equal(tagSentence(model.tagger, words)[k], "AUX", "control: the unconstrained tagger makes the error this fixes");
  assert.equal(tagSentenceAttested(model.tagger, words, model.lexicon)[k], "NOUN");
});

test("segmentation cuts coordination and subordination, never a complement clause, never inside a quotation", () => {
  const cut = (t) => { const s = segmentClauses(t, readRows(model, t)); return s.clauses.map((c) => [c.kind, t.slice(c.from, c.to)]); };
  assert.deepEqual(cut("Rubio and Buchanan renewed the legislation in 2021, and in 2022 Rubio's bill passed the Senate by voice consent."),
    [["main", "Rubio and Buchanan renewed the legislation in 2021"], ["coordinate", "in 2022 Rubio's bill passed the Senate by voice consent"]]);
  const sub = cut("In 2022, the Senate passed the bill by unanimous consent, although several senators stated later that they would have objected.");
  assert.deepEqual(sub[0], ["main", "the Senate passed the bill by unanimous consent"]);
  assert.equal(sub[1][0], "subordinate");
  assert.ok(sub.every(([, t]) => !/^that\b/.test(t)), "“stated … that they would have objected”: a complement clause is an argument, not cut");
  const q = "“For many Americans, an extra hour of daylight means more time to play outside, or spend time with neighbors,” he said in a post.";
  assert.equal(cut(q).length, 1, "no cut inside the quotation marks");
});

test("a predicate in a subordinate clause is not asserted by the sentence: refused, typed (control: the main clause is read)", async () => {
  const t = "If the measure ultimately passes both chambers, most Americans would not fall back into standard time.";
  const r = await run(t, { pred: "passes", subj: "the measure" });
  assert.equal(r.ok, false);
  assert.match(r.refusals[0].why, /fronted subordinate clause: the sentence does not assert it/);
  const m = await run("Although critics objected, the House approved the bill.", { pred: "approved", subj: "the House" });
  assert.equal(m.clause.kind, "main");
  assert.ok(m.ok, JSON.stringify(m.alternatives.map((a) => [a.text, a.equate.why, a.lint])));
});

test("two parses must agree: a clause reading whose arguments the sentence parse does not hold is refused (control: a pair that agrees)", () => {
  const t = "In 2022, the Senate passed the bill by unanimous consent.";
  const ok = readClause(t, `${PX}#b0-${t.length}`, { model, predForm: "passed", subjText: "the Senate" });
  assert.ok(ok.claim && !ok.claim.untrusted, "control: the honest pair agrees");
  // From the DST record: the whole-sentence parse loses “the House” as the subject of “passed”; the clause parse alone has it.
  const d = "In 2026, with the support of President Donald Trump , the House passed a reintroduced version of the bill, but the Senate has yet to approve it.";
  const no = readClause(d, `${PX}#b0-${d.length}`, { model, predForm: "passed", subjText: "the House" });
  assert.equal(no.claim, undefined);
  assert.match(no.refusal, /disagree on the predicate's arguments/);
  assert.notDeepEqual(no.detail.sentence, no.detail.clause);
});

test("every dropped content word is disclosed with its address, or the paraphrase is refused; stripping the disclosure fails the gate", async () => {
  const t = "The House approved the bill by a bipartisan 308-117 vote, one of the strongest congressional showings yet for ending the twice-yearly clock change.";
  const r = await run(t, { pred: "approved", subj: "The House" });
  const p = r.alternatives.find((a) => a.alternation === "passive");
  assert.ok(p.ok, JSON.stringify(p));
  const said = p.omitted.map((u) => u.text);
  assert.ok(said.includes("for ending the twice-yearly clock change"), `was dropped silently before; now disclosed: ${said}`);
  assert.ok(said.includes("yet"));
  assert.ok(p.omitted.every((u) => /#b\d+-\d+$/.test(u.address)), "each omission carries its byte address");
  // CONTROL: the same paraphrase with its disclosure stripped.
  const rc = readClause(t, `${PX}#b0-${t.length}`, { model, predForm: "approved", subjText: "The House" });
  const carried = p.segs.filter((x) => x._part).map((x) => [x._part.from, x._part.to]);
  const stripped = checkDisclosure(rc.claim, carried, []);
  assert.equal(stripped.ok, false);
  assert.ok(stripped.silent.includes("ending"));
});

test("a dropped core argument or a dropped negation is refused, never disclosed (controls carry them and pass)", () => {
  const t = "The Senate did not pass the bill in 2022.";
  const rc = readClause(t, `${PX}#b0-${t.length}`, { model, predForm: "pass", subjText: "The Senate" });
  const c = rc.claim;
  const all = [[0, t.length]];
  assert.deepEqual(omissionLedger(c, all).refusals, [], "control: everything carried, nothing refused");
  const noObj = [[0, t.indexOf("the bill")], [t.indexOf(" in 2022"), t.length]];
  assert.ok(omissionLedger(c, noObj).refusals.some((x) => /core argument \(obj\)/.test(x.why)));
  const noNeg = [[0, t.indexOf("not")], [t.indexOf("pass"), t.length]];
  assert.ok(omissionLedger(c, noNeg).refusals.some((x) => /negation/.test(x.why)));
});

test("a nominative pronoun cannot follow a frame preposition where English has a distinct accusative; “by it” stands", async () => {
  const r = await run("Critics argue it could create uncomfortably dark winter mornings.", { pred: "argue", subj: "Critics" });
  assert.ok(r.alternatives.find((a) => a.alternation === "according-to").ok, "control: a noun after “according to”");
  const he = await run("He argues it could create uncomfortably dark winter mornings.", { pred: "argues", subj: "He" });
  const a = he.alternatives.find((x) => x.alternation === "according-to");
  assert.equal(a?.ok, false);
  assert.ok(a.lint.some((l) => l.law === "CASE"), JSON.stringify(a.lint));
  const it = await run("[ 10 ] It passed the Senate by unanimous consent on March 15, 2022.", { pred: "passed", subj: "It" });
  assert.ok(!it.alternatives.find((x) => x.alternation === "passive").lint.some((l) => l.law === "CASE"), "“it” has no distinct accusative");
});

test("ROLES from the record: a passive that makes the record's own doer the patient is refused (control: without the record it is not)", async () => {
  const t = "[ 10 ] It passed the Senate by unanimous consent on March 15, 2022.";
  const roles = new Map([["pass", new Set(["the senate", "the house"])]]);
  const withRoles = (await run(t, { pred: "passed", subj: "It" }, roles)).alternatives.find((x) => x.alternation === "passive");
  assert.equal(withRoles.ok, false);
  assert.ok(withRoles.lint.some((l) => l.law === "ROLES"));
  const without = (await run(t, { pred: "passed", subj: "It" })).alternatives.find((x) => x.alternation === "passive");
  assert.ok(!without.lint.some((l) => l.law === "ROLES"));
});

test("brackets travel in pairs: a span narrowed to “3 ] In 1918” is refused", async () => {
  const t = "[ 3 ] In 1918, they were codified into federal law by the Standard Time Act , which also included a provision for nationwide daylight saving time.";
  const r = await run(t, { pred: "were", subj: "they" });
  const end = r.alternatives.find((a) => a.alternation === "adjunct-to-end");
  assert.equal(end.ok, false);
  assert.ok(end.lint.some((l) => l.law === "PAIRS"));
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
