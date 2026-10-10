// tests/beings-tier.test.js — the three changes to the beings tier, each with a control built to fail.
//   S  standing: a keyness test is a field of a being, and a membership test only for words the prior does not nominate as names
//   R  refusal:  a word the prior has not met is refused only below a derived floor of its frame's naming mass
//   A  affix:    the ear splits what the treebank splits (whole surfaces, apostrophe-bound affixes, host-guarded suffixes)
// What the changes DID to reading is measured, not asserted here: eval/beings-ladder.mjs (DEV and a fresh tail).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createListeningCast, ORIGINAL } from "../adapters/text/listening-cast.js";
import { makeEar, applyAffixes } from "../adapters/text/ear.js";
import { grammarFor } from "../the-fold/language-grammar.js";
import { KEY_ALPHA } from "../adapters/text/keyness.js";
import { loadGrammar, derangeContractions, affixScore } from "../eval/beings-ladder.mjs";
import { surfaceWords } from "../scripts/lib/surface-words.mjs";
import { parseConllu } from "../eval/competence/lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

// ── a toy language ────────────────────────────────────────────────────────────────────────
const posPrior = () => ({
  provenance: { tokens_read: 1000, forms_kept: 40 },
  forms: {
    the: { DET: 60 }, a: { DET: 40 }, said: { VERB: 30 }, went: { VERB: 30 }, it: { PRON: 40 },
    table: { NOUN: 12 },                       // a SETTLED common noun (>= 3 tokens, NOUN >= 0.7)
    bank: { NOUN: 130, ADJ: 70 },              // seen, mostly noun, not settled common (NOUN < 0.7), said at the language's own rate
    paris: { PROPN: 200 },                     // a name the language also says often: its received rate is high
  },
});
const frames = { "DET|VERB": { NOUN: 30, VERB: 70 }, "*|*": { NOUN: 50, VERB: 50 } };
const framePrior = () => ({ marginal: { NOUN: 50, VERB: 50 }, frames });
const hearFor = (extra = {}) => () => ({ language: "xx", grammar: { posPrior: posPrior(), framePrior: framePrior(), ...extra } });
const names = (cast) => cast.beings().map((b) => b.surface).sort();
const feed = (cast, sentences) => sentences.forEach((s) => cast.add(s));

test("the defaults are the measured design; ORIGINAL is the first one", () => {
  const cast = createListeningCast({ hear: hearFor() });
  cast.add("the paris said it");
  const l = cast.report().languages[0];
  assert.equal(l.standing, "names-exempt"); assert.equal(l.refusal, "loss-bounded");
  assert.deepEqual({ ...ORIGINAL }, { standing: "gate", refusal: "plurality" });
  assert.throws(() => createListeningCast({ hear: hearFor(), standing: "nope" }), /standing must be/);
  assert.throws(() => createListeningCast({ hear: hearFor(), refusal: "nope" }), /refusal must be/);
});

test("S: the gate refuses a name the language also says often; names-exempt keeps it", () => {
  const text = ["the paris said it", "it went the paris", "a bank said the paris", "the paris went"];
  const gate = createListeningCast({ hear: hearFor(), ...ORIGINAL });
  const exempt = createListeningCast({ hear: hearFor(), standing: "names-exempt" });
  feed(gate, text); feed(exempt, text);
  assert.ok(!names(gate).includes("paris"), "the gate drops paris: 4 arrivals in 17 words is not more than 200/1000 says it");
  assert.ok(names(exempt).includes("paris"), "the prior nominates paris as a name (PROPN), so it exists at the floor");
  const b = exempt.beings().find((x) => x.surface === "paris");
  assert.equal(b.standing, "recurring"); assert.ok(b.salience > 0 && b.salience < -Math.log(KEY_ALPHA), "its salience is reported (more than expected, not significantly), and was never used to refuse it");
});

test("S: a seen word that is not a name still has to earn standing", () => {
  const text = ["the bank said it", "it went the bank", "a bank went it"];
  const exempt = createListeningCast({ hear: hearFor(), standing: "names-exempt" });
  const sal = createListeningCast({ hear: hearFor(), standing: "salience" });
  feed(exempt, text); feed(sal, text);
  assert.ok(!names(exempt).includes("bank"), "bank is said at the language's own rate: furniture, not a being");
  assert.ok(names(sal).includes("bank"), "salience mode keeps it and says so");
});

test("S: an unseen recurring word exists without standing; descriptors mode makes only settled common nouns earn it", () => {
  const text = ["the zorbo said it", "it went the zorbo", "the table said it", "a table went it"];
  const exempt = createListeningCast({ hear: hearFor(), standing: "names-exempt" });
  const desc = createListeningCast({ hear: hearFor(), standing: "descriptors" });
  feed(exempt, text); feed(desc, text);
  assert.ok(names(exempt).includes("zorbo"));
  assert.ok(names(desc).includes("zorbo"));
  assert.ok(!names(desc).includes("table") || desc.beings().find((b) => b.surface === "table").standing === "keyed", "a settled common noun is in only if it is key");
});

test("S: a language with no baseline still has beings; the gate abstains and says so", () => {
  const noBase = () => ({ language: "xx", grammar: { posPrior: { forms: posPrior().forms, provenance: {} }, framePrior: framePrior() } });
  const text = ["the zorbo said it", "it went the zorbo"];
  const ex = createListeningCast({ hear: noBase, standing: "names-exempt" });
  const gate = createListeningCast({ hear: noBase, ...ORIGINAL });
  feed(ex, text); feed(gate, text);
  assert.ok(names(ex).includes("zorbo"));
  assert.equal(ex.beings()[0].salience, null); assert.ok(ex.beings()[0].gaps.includes("no_baseline"));
  assert.deepEqual(names(gate), [], "the original design admitted nothing without a baseline (S137)");
});

test("R: plurality refuses on a bare plurality; loss-bounded refuses only below the floor, and says when the floor is missing", () => {
  const text = ["the zorbo said it", "it went the zorbo went", "the zorbo said it"];         // frame DET|VERB: naming mass 0.3, a VERB plurality of 0.7
  const run = (opts, grammarExtra) => { const c = createListeningCast({ hear: hearFor(grammarExtra), ...opts }); feed(c, text); return c; };
  assert.ok(!names(run({ refusal: "plurality" })).includes("zorbo"), "0.7 VERB >= 0.5: refused");
  assert.ok(names(run({ refusal: "loss-bounded" })).includes("zorbo"), "no floor: falls back to KEY_ALPHA (0.05); 0.3 >= 0.05: kept");
  assert.ok(!names(run({ refusal: "loss-bounded" }, { refusalFloor: { floor: 0.5 } })).includes("zorbo"), "floor 0.5: 0.3 < 0.5 refused");
  assert.ok(names(run({ refusal: "loss-bounded" }, { refusalFloor: { floor: 0.2 } })).includes("zorbo"), "floor 0.2: 0.3 >= 0.2 kept");
  const gaps = run({ refusal: "loss-bounded" }).report().languages[0].gaps;
  assert.ok(gaps.includes("no_refusal_calibration"));
  assert.equal(run({ refusal: "loss-bounded" }, { refusalFloor: { floor: 0.2 } }).report().languages[0].refusalFloor, 0.2);
});

test("R: a word the prior HAS seen keeps the type-level rule whatever the floor", () => {
  const c = createListeningCast({ hear: hearFor({ refusalFloor: { floor: 0.0001 } }), standing: "salience" });
  feed(c, ["the table said it", "a table went it"]);
  assert.ok(names(c).includes("table"), "settled NOUN is nominated");
  const v = createListeningCast({ hear: hearFor({ refusalFloor: { floor: 0.0001 } }), standing: "salience" });
  feed(v, ["it said said", "it went said"]);
  assert.ok(!names(v).includes("said"), "a seen VERB is refused by its own tally, not by the floor");
});

test("the cast stays causal under every configuration (the answer after k sentences equals the answer at step k)", () => {
  const text = ["the zorbo said it", "it went the zorbo", "the paris said it", "it went the paris", "the zorbo said it"];
  for (const standing of ["gate", "salience", "descriptors", "names-exempt"]) for (const refusal of ["plurality", "loss-bounded"]) {
    const mid = createListeningCast({ hear: hearFor(), standing, refusal });
    const fresh = createListeningCast({ hear: hearFor(), standing, refusal });
    let snap = null;
    text.forEach((t, i) => { mid.add(t); if (i === 2) snap = JSON.stringify(mid.beings().map((b) => [b.surface, b.mentions])); });
    text.slice(0, 3).forEach((t) => fresh.add(t));
    assert.equal(JSON.stringify(fresh.beings().map((b) => [b.surface, b.mentions])), snap, `${standing}/${refusal}`);
  }
});

// ── the affix layer ─────────────────────────────────────────────────────────────────────────
const contractions = () => ({
  schema: "ContractionPrior@1",
  splits: { "don't": ["do", "n't"], del: ["de", "el"], "l'": ["l'"].slice(0, 0).concat(["le"]) },
  suffixes: [{ affix: "'s", marked: true, hosts: ["NOUN", "PROPN", "PRON"] }, { affix: "lo", marked: false, hosts: ["VERB"] }, { affix: "n't", marked: true, hosts: ["AUX"] }],
  prefixes: [{ affix: "l'" }, { affix: "dell'", comps: ["di", "l'"] }],
});
const earPrior = () => ({ forms: { do: { AUX: 9 }, hacer: { VERB: 9 }, sel: { NOUN: 5 }, pa: { NOUN: 5 }, homme: { NOUN: 9 }, italia: { PROPN: 9 }, its: { PRON: 40 }, john: { PROPN: 9 } } });

test("A: the ear splits whole surfaces, bound affixes and fused prefixes, keeping case", () => {
  const ear = makeEar({ posPrior: earPrior(), contractions: contractions() });
  assert.equal(ear.peel("Don't go"), "Do n't go", "case kept: the parts are slices of the word as written");
  assert.equal(ear.peel("del mar"), "de el mar", "a fused surface is its components");
  assert.equal(ear.peel("john's book"), "john 's book", "an unseen or seen stem takes an apostrophe-marked affix");
  assert.equal(ear.peel("Kobayashi's"), "Kobayashi 's", "an UNSEEN stem (a name) takes a marked affix");
  assert.equal(ear.peel("john’s"), "john 's", "a curly apostrophe is the same affix");
  assert.equal(ear.peel("hacerlo"), "hacer lo", "an unmarked suffix needs a seen stem of a host class");
  assert.equal(ear.peel("l'homme"), "l' homme");
  assert.equal(ear.peel("dell'italia"), "di l' italia", "a fused prefix is written as its components, the grid the priors were built on");
  assert.equal(ear.peel("Dell'Italia"), "Di l' Italia", "its case is kept on the first part");
});

test("A: what the guards refuse stays whole", () => {
  const ear = makeEar({ posPrior: earPrior(), contractions: contractions() });
  assert.equal(ear.peel("palo"), "palo", "pa is seen as a NOUN: not a host of -lo");
  assert.equal(ear.peel("sello"), "sello", "sel is a NOUN, not a VERB host");
  assert.equal(ear.peel("zzlo"), "zzlo", "an unseen stem may not take an UNMARKED affix");
  assert.equal(ear.peel("its"), "its", "a word the prior attests >= 3 times is a word, not stem+affix");
  assert.equal(makeEar({ posPrior: earPrior() }).peel, null, "no contraction prior: the ear is exactly as before");
  assert.equal(applyAffixes("john's", { prefixes: [], suffixes: [], posPrior: earPrior() }), null);
});

test("A control built to fail: a prior with its components dealt among its surfaces splits wrongly, and the score says so", () => {
  const real = contractions();
  const wrong = derangeContractions(real, 7);
  assert.notDeepEqual(wrong.splits, real.splits);
  const earReal = makeEar({ posPrior: earPrior(), contractions: real }), earWrong = makeEar({ posPrior: earPrior(), contractions: wrong });
  const sent = [{ tokens: [{ id: 1, form: "do", upos: "AUX", spaceAfter: false }, { id: 2, form: "n't", upos: "PART", spaceAfter: true }, { id: 3, form: "del", upos: "ADP", spaceAfter: true }], ranges: [{ from: 1, to: 2, form: "don't", spaceAfter: true }, { from: 3, to: 3, form: "del", spaceAfter: true }] }];
  const words = sent.flatMap(surfaceWords);
  assert.equal(words[0].surface, "don't"); assert.deepEqual(words[0].comps, ["do", "n't"]);
  assert.equal(affixScore(sent, earReal).splitRecall > affixScore(sent, earWrong).splitRecall, true, "the instrument moves when the prior is wrong");
});

test("surfaceWords: a fused multi-word token written against the next word is one surface word; a quote mark is not a word to glue to", () => {
  const conllu = [
    "# text = dell'Italia ''ciao''",
    "1-2\tdell'\t_\t_\t_\t_\t_\t_\t_\tSpaceAfter=No", "1\tdi\tdi\tADP\t_\t_\t_\t_\t_\t_", "2\tl'\tla\tDET\t_\t_\t_\t_\t_\t_",
    "3\tItalia\tItalia\tPROPN\t_\t_\t_\t_\t_\t_", "4\t''\t''\tPUNCT\t_\t_\t_\t_\t_\tSpaceAfter=No", "5\tciao\tciao\tINTJ\t_\t_\t_\t_\t_\tSpaceAfter=No", "6\t''\t''\tPUNCT\t_\t_\t_\t_\t_\t_", "",
  ].join("\n");
  const [s] = parseConllu(conllu);
  const w = surfaceWords(s);
  assert.deepEqual(w.map((x) => x.surface), ["dell'italia", "ciao"], "quote marks are dropped, not glued");
  assert.deepEqual(w[0].comps, ["di", "l'", "italia"]); assert.deepEqual(w[0].fused, { surface: "dell'", comps: ["di", "l'"] });
});

test("the builder derives splits and affix rules from a treebank, and keeps only rules that are right at least half the times they fire", () => {
  const tok = (id, form, upos, after = true) => `${id}\t${form}\t${form}\t${upos}\t_\t_\t_\t_\t_\t${after ? "_" : "SpaceAfter=No"}`;
  const sentence = (i, stem, host) => [`# text = it ${stem}n't`, tok(1, "it", "PRON"), `2-3\t${stem}n't\t_\t_\t_\t_\t_\t_\t_\t_`, tok(2, stem, "AUX"), tok(3, "n't", "PART"), ""].join("\n");
  const lines = [];
  for (let i = 0; i < 6; i++) lines.push(sentence(i, ["do", "did", "was"][i % 3]));
  for (let i = 0; i < 6; i++) lines.push(["# text = it do", tok(1, "it", "PRON"), tok(2, "do", "AUX"), ""].join("\n"));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contr-"));
  const inFile = path.join(dir, "train.conllu"), outFile = path.join(dir, "contractions-xx.json");
  fs.writeFileSync(inFile, lines.join("\n") + "\n");
  execFileSync("node", [path.join(NATIVE, "scripts", "build-contraction-prior.mjs"), inFile, outFile, "xx"], { stdio: "pipe" });
  const out = JSON.parse(fs.readFileSync(outFile, "utf8"));
  assert.deepEqual(out.splits["don't"], ["do", "n't"]);
  const nt = out.suffixes.find((x) => x.affix === "n't");
  assert.ok(nt && nt.marked && nt.precision >= 0.5 && nt.hosts.includes("AUX"));
  assert.equal(out.provenance.settle_share, 0.5);
});

// ── the shipped files and the instrument agree ──────────────────────────────────────────────────
test("grammarFor loads the contraction prior and the refusal floor; the ladder's loader reads the same files", () => {
  const g = grammarFor("eng");
  assert.equal(g.contractions?.schema, "ContractionPrior@1");
  assert.equal(g.refusalFloor?.schema, "RefusalFloor@1");
  assert.ok(g.refusalFloor.floor > KEY_ALPHA && g.refusalFloor.floor <= 0.5, "a derived floor, between the declared 5% and the settledness cut");
  const l = loadGrammar("eng", { affix: true, floor: true });
  assert.deepEqual(l.contractions, g.contractions); assert.deepEqual(l.refusalFloor, g.refusalFloor);
  assert.equal(grammarFor("cmn-hans").contractions, null, "an unspaced script gets no contraction prior (segmentation is script-segment.js's job)");
});

test("the shipped English ear splits what UD splits and leaves English alone otherwise", () => {
  const g = grammarFor("eng");
  const ear = makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions });
  assert.equal(ear.peel("I don't know Arafat's plan"), "I do n't know Arafat 's plan");
  assert.equal(ear.peel("its a cat"), "its a cat");
  assert.equal(ear.peel("The cat sat."), "The cat sat.");
});
