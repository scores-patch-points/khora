// negation read-off — clause polarity is READ OFF the parse (adapters/text/
// negation-read.js), not off a hand-typed cue list. Replaces D13's
// negation-cues.test.js (35830003: no/nobody/nothing/none + hand-typed
// exceptives), which the no-fixed-lists rule forbids
// (nesting-fix-2026-10-14/NO-FIXED-LISTS.md).
//
// The gold is DATA (native/tests/negation-gold.json), never a runtime list.
// The tests that need the trained parser skip, loudly and typed, when
// native/priors/parser-eng-ewt.json is not on disk (a checkout without the
// janus priors); the typed-gap and attestation tests run on hand-built rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, analyse, tokenize } from "../adapters/text/english-parser.js";
import { readPolarity, polarityOfHead, polaritySource, negationClassOf, POLARITY_GAP } from "../adapters/text/negation-read.js";
import { createEnglishParserPerceiver } from "../adapters/text/english-parser-perceiver.mjs";
import { extractRelations } from "../adapters/text/relations.js";
import * as priors from "../adapters/text/priors.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(here, "../priors/parser-eng-ewt.json");
const haveModel = fs.existsSync(MODEL_PATH);
const model = haveModel ? loadModel(JSON.parse(fs.readFileSync(MODEL_PATH, "utf8"))) : null;
const skip = haveModel ? false : "native/priors/parser-eng-ewt.json not on disk (typed absence: the janus priors are not linked in this checkout)";
const gold = JSON.parse(fs.readFileSync(path.join(here, "negation-gold.json"), "utf8")).items;

const rowsOf = (text) => analyse(model, tokenize(text).map((t) => t.form));
const readOf = (text) => readPolarity(model, rowsOf(text));
const predicted = (text) => (readOf(text).heads.size ? "-" : "+");

// The measured residual on the gold, pinned so an improvement or a regression
// flips the test on purpose. Each is a stated reason, not a threshold.
const KNOWN_WRONG = {
  "Mary hardly knows Lincoln.": "UD English-EWT marks \"hardly\" with no negation feature: a degree negator the treebank does not annotate as one (the pre-D13 hand list read it)",
  "Lincoln did not sign the bill but vetoed the amendment.": "negation on a coordinated predicate is the typed gap coordinated-scope: correlative vs contrastive is the conjunction's form, which has no feature",
  "No doubt Lincoln appointed Hamlin.": "the parser attaches \"doubt\" as the core subject (Lincoln as its appositive): a parse error the read-off inherits",
  "No wonder Mary loves Lincoln.": "same parse error as \"No doubt\": \"wonder\" read as nsubj",
  "Nothing but a bill pleased Mary.": "\"but\" attaches as a case marker, structurally the partitive \"None of the senators\"; no UD relation or feature tells them apart",
  "Lincoln cannot appoint Hamlin.": "english-parser.js tokenize() keeps \"cannot\" whole (the treebank splits it can + not), so the parse breaks and no negator token exists; a tokenizer gap, not a polarity one",
  "Lincoln no longer signs the bill.": "\"no\" in \"no longer\" is tagged ADV and the treebank gives that form|ADV no feature (the extractor's regex special-cases it)",
  "Neither Lincoln nor Grant signed the bill.": "negation under coordination is the typed gap coordinated-scope; here the coordination is itself the negation (neither/nor), which only the conjunction's form says",
  "No doubt the mayor attended the hearing.": "same parse error as \"No doubt Lincoln appointed Hamlin.\"",
  "Nobody except the clerk saw the letter.": "\"except\" attaches as a case marker of an oblique, the same shape as the partitive; no feature distinguishes the exceptive",
};

test("negation read-off — the runtime path carries no D13 list and no cue-word literal", () => {
  assert.equal(priors.NEGATION_QUANTIFIERS, undefined);
  assert.equal(priors.NEGATION_EXCEPTIVES, undefined);
  const rel = fs.readFileSync(path.join(here, "../adapters/text/relations.js"), "utf8");
  assert.ok(!/NEGATION_QUANTIFIERS|NEGATION_EXCEPTIVES|INTERJECTION_QUANTIFIER/.test(rel));
  // negation-read.js names UD feature/relation vocabulary only: no quoted English negator.
  const src = fs.readFileSync(path.join(here, "../adapters/text/negation-read.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\/\/ .*$/gm, "");
  const cue = /["'`](?:no|not|never|nobody|nothing|none|neither|nor|nowhere|without|nothing|n't|hardly|scarcely)["'`]/i;
  assert.equal(cue.test(src), false);
});

test("negation read-off — the extractor's own window reads no quantifier negator (pre-D13 behaviour restored); the parse carries it", () => {
  const verbs = new Set(["appointed", "signed"]);
  for (const t of ["Nobody appointed Hamlin.", "No senator signed the bill."]) {
    assert.equal(extractRelations(t, { verbs }).map((r) => r.polarity).join("/"), "+", t);
  }
  // the pre-existing closed class is untouched
  assert.equal(extractRelations("Lincoln never appointed Hamlin.", { verbs }).map((r) => r.polarity).join("/"), "-");
});

test("negation read-off — the source is generated: the model's lexicon marks the negators, none is typed here", { skip }, () => {
  const s = polaritySource(model);
  assert.equal(s.available, true);
  assert.ok(s.carriers > 10);
  const cls = negationClassOf(model);
  // what the treebank annotates is what is read; checked against the gold's own cue forms, which are test data
  for (const w of ["not", "never", "nobody", "nothing", "none", "no"]) assert.ok(cls.has(w), w);
  assert.ok(!cls.has("without") && !cls.has("hardly"), "the treebank does not annotate without/hardly as negators");
});

test("negation read-off — the gold: every item reads as pinned (right, or a stated KNOWN_WRONG)", { skip }, () => {
  const wrong = {};
  for (const g of gold) if (predicted(g.text) !== g.gold) wrong[g.text] = `${g.gold} -> ${predicted(g.text)}`;
  assert.deepEqual(Object.keys(wrong).sort(), Object.keys(KNOWN_WRONG).sort(), JSON.stringify(wrong, null, 1));
});

test("negation read-off — positive control: affirmative sentences stay '+', and the old pre-verbal cues still read '-'", { skip }, () => {
  for (const g of gold.filter((x) => x.cls === "control-affirmative")) assert.equal(predicted(g.text), "+", g.text);
  for (const g of gold.filter((x) => x.cls === "neg-adverb-preverbal")) assert.equal(predicted(g.text), "-", g.text);
});

test("negation read-off — the post-verbal and object negations the window cannot reach read '-' (D13's OPEN class)", { skip }, () => {
  for (const t of ["Andrew Johnson was never the president.", "Lincoln has no relation to Hamlin.", "Lincoln signed nothing.", "I have no idea."]) {
    assert.equal(predicted(t), "-", t);
  }
});

test("negation read-off — negative control: interjection, correlative and without never read '-'; exceptive and correlative are typed gaps", { skip }, () => {
  for (const t of ["No, Lincoln appointed Hamlin.", "Not only Lincoln but also Grant visited the capital.", "Lincoln left without saying goodbye.", "Without a doubt Lincoln appointed Hamlin."]) {
    assert.equal(predicted(t), "+", t);
  }
  const gapsOf = (t) => readOf(t).gaps.map((g) => g.gap);
  assert.ok(gapsOf("No, Lincoln appointed Hamlin.").includes("answer-particle"));
  assert.ok(gapsOf("Nobody but Lincoln appointed Hamlin.").includes("coordinated-scope"));
  assert.ok(gapsOf("Not only Lincoln but also Grant visited the capital.").includes("coordinated-scope"));
});

test("negation read-off — typed gap: a model whose lexicon carries no negation feature returns no-polarity-source, never a silent '+'", { skip }, () => {
  const stripped = { ...model, lexicon: { ...model.lexicon, form: Object.fromEntries(Object.entries(model.lexicon.form).map(([k, v]) => [k, v.split("\t")[0] + "\t_"])) } };
  assert.equal(polaritySource(stripped).gap, POLARITY_GAP);
  const rows = analyse(stripped, tokenize("Nobody appointed Hamlin.").map((t) => t.form));
  const r = readPolarity(stripped, rows);
  assert.equal(r.gap, POLARITY_GAP);
  assert.equal(r.heads.size, 0);
  const verb = rows.find((x) => x.upos === "VERB");
  assert.deepEqual(polarityOfHead(r, verb.id), { polarity: "+", gap: POLARITY_GAP });
  assert.equal(negationClassOf(stripped).size, 0);
});

test("negation read-off — typed gap on hand-built rows: no model lexicon at all", () => {
  const bare = { lexicon: { form: {}, suffix: {}, upos: {} } };
  const r = readPolarity(bare, [{ id: 1, form: "x", upos: "VERB", feats: "_", head: 0, deprel: "root" }]);
  assert.equal(r.gap, POLARITY_GAP);
  assert.equal(polaritySource({}).gap, POLARITY_GAP);
});

test("negation read-off — only an ATTESTED form is a negator: a feature that came from a suffix backoff is not read", () => {
  const lexicon = {
    form: { "nay|ADV": "nay\tPronType=Neg", "ran|VERB": "run\tTense=Past" },
    suffix: { "ot|2|PART": "0:\tPolarity=Neg" },
    upos: {},
  };
  const stub = { lexicon };
  const rows = [
    { id: 1, form: "Zot", upos: "PART", feats: "Polarity=Neg", head: 2, deprel: "advmod" }, // feats by suffix backoff only
    { id: 2, form: "ran", upos: "VERB", feats: "Tense=Past", head: 0, deprel: "root" },
  ];
  assert.equal(readPolarity(stub, rows).heads.size, 0);
  const attested = [{ id: 1, form: "Nay", upos: "ADV", feats: "PronType=Neg", head: 2, deprel: "advmod" }, rows[1]];
  assert.equal(readPolarity(stub, attested).heads.get(2).polarity, "-");
});

test("negation read-off — the perceiver reads polarity off the parse and types its gap", { skip }, async () => {
  const p = createEnglishParserPerceiver({ model });
  const cands = await p.perceive({ modality: "text", material: "Nobody appointed Hamlin. Lincoln appointed Hamlin.", source: "t" });
  assert.deepEqual(cands.map((c) => [c.end1, c.polarity]), [["Nobody", "-"], ["Lincoln", "+"]]);
  assert.ok(cands[0].polarity_read.length >= 1);
  assert.equal(cands[1].polarity_gap, undefined);
  const stripped = { ...model, lexicon: { ...model.lexicon, form: Object.fromEntries(Object.entries(model.lexicon.form).map(([k, v]) => [k, v.split("\t")[0] + "\t_"])) } };
  const q = await createEnglishParserPerceiver({ model: stripped }).perceive({ modality: "text", material: "Nobody appointed Hamlin.", source: "t" });
  assert.equal(q[0].polarity, "+");
  assert.equal(q[0].polarity_gap, POLARITY_GAP);
});
