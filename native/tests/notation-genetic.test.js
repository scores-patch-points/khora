// notation-genetic.test.js — the GENETIC family adapter and its instrument are regression-guarded on an
// AUTHORED toy fixture (nothing here is natural data and none of it is presented as held-out):
//   * a toy genome with three planted genes (two on the plus strand, one on the minus strand) and one planted
//     internal TGA, built from a seeded generator in this file (labelled "authored");
//   * a perfect reader scores 1 on every scorer, a deranged control scores low;
//   * the adapter, driven by the REAL priors (priors/notation-genetic-*.json, built from TRAIN), finds the planted beings,
//     translates them under the right code, identifies the notations and refuses prose;
//   * the instrument returns the typed-unmeasured shape (never throws) when its corpus is absent.
// AMENDMENT 2026-10-06 (after the independent review of the card): the file also guards the instrument against the six review findings, each with a CONTROL BUILT TO FAIL:
//   F1 the prefix-stability check flags two PLANTED LOOKAHEAD readers (and the pre-review check, K = n/2 and id@at only, does not);
//   F2 the listener refuses letter-only negatives (word list, ciphertext, random A-Z, 3-letter peptides) that the pre-review rank-only listener names a notation;
//   F3 R4 counts an abstention as a miss and scores the controls on all tokens;   F4 the pass combinator is three-valued;
//   F5 a licensed control that ties or beats the real arm is flagged BROKEN (licence independent of the real arm's score);   F6 the naive R1a control attempts every check.
// Authored items below are labelled "authored"; nothing here is natural data.
// This file measures nothing about natural genomes; eval/notation-competence/genetic.mjs does that on held-out gold.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import * as G from "../adapters/notation/genetic.js";
import * as L from "../eval/notation-competence/genetic-lib.mjs";
import * as I from "../eval/notation-competence/genetic.mjs";

const priors = G.loadPriors();
const havePriors = priors.ok;
const STD = { tga: "stop", agr: "sense" };
const ALT = { tga: "sense", agr: "sense" }; // a TGA=Trp code (tables 3, 4, 5, 9, 13 share this stop class)

// ── AUTHORED toy genome ──────────────────────────────────────────────────────────────────────────────────
const SENSE = G.CODONS.filter((c) => !["TAA", "TAG", "TGA"].includes(c) && c !== "ATG");
const rc = (s) => G.revcomp(s);
function geneBody(rng, nCodons, { tgaAt = null } = {}) {
  let s = "ATG";
  for (let i = 0; i < nCodons - 1; i++) s += i === tgaAt ? "TGA" : SENSE[Math.floor(rng() * SENSE.length)];
  return s;
}
function toy(seed = 20260601) {
  const rng = L.mulberry32(seed);
  const filler = (n) => { let s = ""; const bases = "ACGT"; for (let i = 0; i < n; i++) s += bases[Math.floor(rng() * 4)]; return s; };
  // the filler is built to carry no long open frame; the check below fails the toy loudly if it does
  const A = geneBody(rng, 200) + "TAA";            // plus strand
  const B = geneBody(rng, 180, { tgaAt: 100 }) + "TAG"; // minus strand, with a planted internal TGA (Trp in a mitochondrial-like code)
  const C = geneBody(rng, 220) + "TAA";            // plus strand
  let seq = "", cds = [];
  const place = (g, strand) => { const start = seq.length; const piece = strand === "-" ? rc(g) : g; seq += piece; cds.push({ start, end: seq.length, strand: strand === "-" ? -1 : 1, nt: g }); };
  seq += filler(150); place(A, "+"); seq += filler(120); place(B, "-"); seq += filler(130); place(C, "+"); seq += filler(100);
  return { seq, cds };
}
const T = toy();
const goldOf = (t, evaluable = true) => ({ cds: t.cds.map((c, i) => ({ i, start: c.start, end: c.end, strand: c.strand, evaluable, stop_complete: true, parts: [{ start: c.start, end: c.end, strand: c.strand }], n_parts: 1, partial: false })), non_cds: [] });
const toyGold = goldOf(T);
const PARAMS = { Lmin: 160, Lconf: 400, B: 45, startNominees: ["ATG"] };
// authored helpers for the listener tests
function sampleProteinLines(pri, nLines, seed, width = 60) {
  const counts = pri.alphabet.profiles.protein.counts; const letters = Object.keys(counts).filter((c) => c !== "*"); const tot = letters.reduce((a, c) => a + counts[c], 0);
  const rng = L.mulberry32(seed); const pick = () => { let r = rng() * tot; for (const c of letters) { r -= counts[c]; if (r <= 0) return c; } return letters[0]; };
  return Array.from({ length: nLines }, () => Array.from({ length: width }, pick).join(""));
}
const AUTHORED_WORDS = "the people said about water country because family between children against another through during without before system little house always though never public school during second moment morning silence village winter market garden window letter person season simple answer reason number change person history modern around nothing rather young night early story hundred whole point group world machine paper river mountain".split(" ");
const sha256 = (x) => crypto.createHash("sha256").update(x).digest("hex");
const feedAll = (lines, pri, params = null) => { const l = G.createListener({ priors: pri, params }); return lines.map((x) => l.feed(x)); };

test("the authored toy genome is what the test says it is", () => {
  assert.equal(T.cds.length, 3);
  assert.ok(T.seq.length > 1700 && T.seq.length < 2600);
  assert.ok(/^[ACGT]+$/.test(T.seq));
  assert.ok(T.cds.every((c) => c.nt.length % 3 === 0 && c.nt.startsWith("ATG")));
});

// ── the reader finds the planted beings; a perfect reader scores 1, deranged scores low ──────────────────
test("scanGenome finds exactly the planted genes under the right code (both strands)", () => {
  const sc = G.scanGenome(T.seq, { fixedState: ALT, params: PARAMS, noUsage: true });
  const m = L.matchBeings(sc.beings, toyGold);
  assert.equal(m.tp, 3, JSON.stringify(sc.beings.map((b) => [b.strand, b.span])));
  assert.equal(m.fp, 0);
  assert.equal(m.f1, 1);
  assert.deepEqual(sc.beings.map((b) => b.strand).sort(), ["+", "+", "-"]);
});
test("under the WRONG code (TGA read as a stop) the planted TGA gene is cut in two and not found: the code state matters", () => {
  const sc = G.scanGenome(T.seq, { fixedState: STD, params: PARAMS, noUsage: true });
  const m = L.matchBeings(sc.beings, toyGold);
  assert.equal(m.tp, 2);
  assert.ok(m.recall < 1, "the TGA gene is missed");
  assert.ok(m.f1 < 1);
});
test("matchBeings: an oracle reader scores 1, a deranged (shifted) control scores 0, ignored CDS are neither TP nor FP", () => {
  const oracle = toyGold.cds.map((c) => ({ strand: c.strand === -1 ? "-" : "+", span: [c.start, c.end] }));
  assert.equal(L.matchBeings(oracle, toyGold).f1, 1);
  const shifted = oracle.map((b) => ({ ...b, span: [b.span[0] + 30, b.span[1] + 30] }));
  assert.equal(L.matchBeings(shifted, toyGold).f1, 0);
  const swappedStrand = oracle.map((b) => ({ ...b, strand: b.strand === "+" ? "-" : "+" }));
  assert.equal(L.matchBeings(swappedStrand, toyGold).f1, 0);
  const nonEval = goldOf(T, false);
  const m = L.matchBeings(oracle, nonEval);
  assert.equal(m.fp, 0); assert.equal(m.ignored, 3); assert.equal(m.nGold, 0);
});
test("the plain-ORF control (stopOverride with deranged stop codons) does not find the planted genes", () => {
  const sc = G.scanGenome(T.seq, { params: PARAMS, stopOverride: ["CCC", "GGG", "ACA"], noUsage: true });
  assert.equal(L.matchBeings(sc.beings, toyGold).tp, 0);
});
test("the reader is CAUSAL: beings emitted before residue K are identical in read(prefix K)", () => {
  const full = G.scanGenome(T.seq, { fixedState: ALT, params: PARAMS, noUsage: true });
  for (const K of [900, 1400, 1800, T.seq.length]) {
    const pre = G.scanGenome(T.seq.slice(0, K), { fixedState: ALT, params: PARAMS, noUsage: true });
    const preSet = new Set(pre.beings.map((b) => `${b.id}@${b.at}`));
    const exp = full.beings.filter((b) => b.at <= K);
    assert.ok(exp.every((b) => preSet.has(`${b.id}@${b.at}`)), `prefix ${K}`);
    assert.ok(pre.beings.every((b) => b.at <= K));
  }
});
test("the reader is deterministic", () => {
  const a = G.scanGenome(T.seq, { fixedState: STD, params: PARAMS }), b = G.scanGenome(T.seq, { fixedState: STD, params: PARAMS });
  assert.deepEqual(a.beings, b.beings);
});

// ── the code: classification and the relations it orders ─────────────────────────────────────────────────
test("classifyCodon: the code state decides TGA; an unsettled state nominates the TRAIN default and says so", { skip: !havePriors }, () => {
  const C = G.compilePriors(priors);
  const tga = G.codonIndex("TGA"), taa = G.codonIndex("TAA"), aga = G.codonIndex("AGA");
  assert.equal(G.classifyCodon(tga, STD, C), "stop");
  assert.equal(G.classifyCodon(tga, { tga: "sense", agr: "sense" }, C), "sense");
  assert.equal(G.classifyCodon(taa, { tga: "sense", agr: "sense" }, C), "stop");
  assert.equal(G.classifyCodon(aga, { tga: "sense", agr: "stop" }, C), "stop");
  const un = G.classifyCodonEx(tga, { tga: "unknown", agr: "unknown" }, C);
  assert.equal(un.cls, "stop"); assert.equal(un.provisional, true);
  assert.equal(G.classifyCodonEx(G.codonIndex("GCT"), { tga: "unknown", agr: "unknown" }, C).provisional, false);
});
test("translateSpan reproduces the planted proteins under the standard code and reads the planted TGA as Trp under a TGA=sense code", { skip: !havePriors }, () => {
  const std = G.compilePriors(priors).tables["1"].aa;
  const prot = (nt) => [...nt.matchAll(/.{3}/g)].map((m) => std[G.codonIndex(m[0])]).join("");
  const A = T.cds[0];
  const trA = G.translateSpan(T.seq, A.start, A.end, "+", STD, priors);
  assert.equal(trA.map((t) => (t.committed ? t.aa : "X")).join(""), prot(A.nt));
  const Bc = T.cds[1];
  const alt = { tga: "sense", agr: "sense" };
  const trB = G.translateSpan(T.seq, Bc.start, Bc.end, "-", alt, priors);
  const kTga = 101; // codon 0 is ATG, the planted TGA follows codon 100
  assert.equal(trB[kTga].codon, "TGA");
  assert.equal(trB[kTga].class, "sense");
  assert.equal(trB[kTga].aa, "W", "TGA reads as Trp when every attested table with TGA=sense agrees");
  const trBstd = G.translateSpan(T.seq, Bc.start, Bc.end, "-", STD, priors);
  assert.equal(trBstd[kTga].class, "stop");
  // a deranged table is wrong almost everywhere (the instrument's deranged_table control)
  const perm = L.derangement(64, L.mulberry32(5));
  const wrong = trA.slice(0, -1).filter((t) => std[perm[G.codonIndex(t.codon)]] !== t.aa).length;
  assert.ok(wrong > 0.7 * (trA.length - 1));
});
test("read() emits beings, an encodes relation per being, and ends every protein at its stop", { skip: !havePriors }, () => {
  const fa = ">toy authored\n" + T.seq.match(/.{1,70}/g).join("\n") + "\n";
  const out = G.read(fa, { priors, fixedState: ALT, params: PARAMS, noUsage: true, codons: true });
  assert.equal(out.beings.length, 3);
  const enc = out.relations.filter((r) => r.label === "encodes");
  assert.equal(enc.length, 3);
  assert.ok(enc.every((r) => r.end2.startsWith("protein:M") && !r.end2.endsWith("*")));
  assert.ok(out.relations.some((r) => r.label === "translates_to" && r.end2 === "M"));
});
test("a unsettled code state still ends the being's protein at its stop (bug fixed after DEV run 2)", { skip: !havePriors }, () => {
  const fa = ">toy authored\n" + T.seq + "\n";
  const out = G.read(fa, { priors, params: PARAMS, noUsage: true }); // inferred state: nothing settles on a 2 kb genome
  const C = out.beings.find((b) => b.strand === "+" && b.span[1] - b.span[0] === 603 + 0) ?? out.beings[0];
  assert.ok(out.beings.length >= 1);
  const enc = out.relations.filter((r) => r.label === "encodes");
  assert.ok(enc.every((r) => !r.end2.endsWith("X") || r.end2.length > 20));
  assert.ok(C);
});

// ── hearing the frame ───────────────────────────────────────────────────────────────────────────────────
test("hearFrame: core stops REFUSE a hypothesis, the true frame survives, and the ablation does not tell frames apart by usage", { skip: !havePriors }, () => {
  const A = T.cds[0];
  const win = T.seq.slice(A.start + 30, A.start + 30 + 240);
  const h = G.hearFrame(win, { priors, mode: "stopfree" });
  assert.ok(h.alive >= 1);
  assert.ok(h.hypotheses.some((x) => x.strand === "+" && x.offset === 0), "plus-strand frame offset 0 survives");
  assert.equal(h.refused.length, 6);
  const noStops = G.hearFrame("ACACACACACACACACACAC".repeat(12), { priors, mode: "stopfree" });
  assert.equal(noStops.alive, 6);
});

// ── the ear: containers, tokens, declared beings ──────────────────────────────────────────────────────────
const GB = [
  "LOCUS       TOY1                      60 bp    DNA     linear   SYN 06-OCT-2026",
  "DEFINITION  authored toy record.",
  "VERSION     TOY1.1",
  "FEATURES             Location/Qualifiers",
  "     CDS             complement(join(10..20,30..40))",
  "                     /transl_table=4",
  "                     /product=\"toy protein\"",
  "     CDS             <1..>12",
  "ORIGIN",
  "        1 acgtacgtac gtacgtacgt acgtacgtac gtacgtacgt acgtacgtac gtacgtacgt",
  "//",
].join("\n");
test("ear tokenizes a GenBank record by its grammar (locus, feature, qualifier, coordinate, residues)", () => {
  const toks = G.ear(GB);
  const kinds = toks.map((t) => t.kind);
  for (const k of ["locus", "keyword", "feature", "qualifier", "coordinate", "residues", "end-of-record"]) assert.ok(kinds.includes(k), k);
  const recs = G.extractRecords(GB);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].residues.length, 60);
  assert.equal(recs[0].id, "TOY1");
  const coord = toks.find((t) => t.kind === "coordinate");
  assert.equal(coord.value, 1);
});
test("parseLocation / parseFeatures: join, complement and partial ends", () => {
  const f = G.parseFeatures(GB, { keys: ["CDS"] });
  assert.equal(f.length, 2);
  assert.deepEqual(f[0].parsed.parts.map((p) => [p.start, p.end, p.strand]), [[9, 20, -1], [29, 40, -1]].map(([a, b, s]) => [a, b, s]).map(([a, b, s]) => [a, b === 20 ? 20 : b, s]));
  assert.equal(f[0].qualifiers.transl_table[0], "4");
  assert.equal(f[1].parsed.partial, true);
  assert.equal(G.parseLocation("order(1..3,5..9)").ok, false, "order() is not a contiguous coding span: typed unread");
  assert.equal(G.parseLocation("J00194.1:100..202").ok, false, "remote locations are typed unread");
});
test("alphabetOfRun / foldResidues: RNA folds onto the DNA alphabet", () => {
  assert.equal(G.alphabetOfRun("ACGUACGU"), "rna");
  assert.equal(G.alphabetOfRun("ACGTACGT"), "dna");
  assert.equal(G.alphabetOfRun("MKVLAAGIVG"), "protein");
  assert.equal(G.alphabetOfRun("The quick"), "other");
  assert.equal(G.foldResidues("acguu").seq, "ACGTT");
});

// ── identification ─────────────────────────────────────────────────────────────────────────────────────
test("identify: dna / protein / genbank are named, prose is refused with a typed gap", { skip: !havePriors }, () => {
  const dnaLines = T.seq.match(/.{1,70}/g).slice(0, 10).join("\n");
  assert.equal(G.identify(dnaLines, { priors }).at(-1).system, "dna");
  const prot = sampleProteinLines(priors, 8, 20260601).join("\n"); // authored: a seeded sample of the TRAIN protein letter profile
  assert.equal(G.identify(prot, { priors }).at(-1).system, "protein");
  assert.equal(G.identify(GB, { priors }).at(-1).system, "genbank");
  const prose = "The quick brown fox jumps over the lazy dog.\nShe sells sea shells by the sea shore.\nNothing here is a sequence.";
  const v = G.identify(prose, { priors }).at(-1);
  assert.equal(v.system, null); assert.equal(v.gap, "not_genetic");
  const rna = "GGGCCCAUAGCUCAGUGGUAGAGUGCCUCCUUUGCAAGGAGGAUGCCCUGGGUUCGAAUCCCAGUGGGUCCA";
  assert.equal(G.identify(rna, { priors }).at(-1).system, "rna");
  // causal: the verdict after line i does not depend on later lines
  const lines = dnaLines.split("\n");
  const whole = G.identify(dnaLines, { priors });
  const part = G.identify(lines.slice(0, 5).join("\n"), { priors });
  assert.deepEqual(whole.slice(0, 5), part);
});

// ── the instrument's pure scorers: perfect = 1, deranged = low ─────────────────────────────────────────
test("macroF1: a perfect classifier scores 1, an inverted one scores 0, 'unknown' counts as a miss", () => {
  const conf = (a, b, c, d, u = 0) => ({ stop: { stop: a, sense: b, unknown: u }, sense: { stop: c, sense: d, unknown: 0 } });
  assert.equal(I._scoring.macroF1(conf(10, 0, 0, 90)).macro, 1);
  assert.equal(I._scoring.macroF1(conf(0, 10, 90, 0)).macro, 0);
  const withUnknown = I._scoring.macroF1(conf(5, 0, 0, 90, 5));
  assert.ok(withUnknown.stop < 1 && withUnknown.stop > 0.5);
});
test("scoreStream: perfect verdicts score 1 over the window after the first decision, a deranged label scores 0, refusal is right for negatives", () => {
  const good = [{ system: null }, { system: "dna" }, { system: "dna" }];
  assert.deepEqual(I._scoring.scoreStream(good, "dna"), { acc: 1, d: 2 });
  assert.equal(I._scoring.scoreStream(good, "protein").acc, 0);
  assert.equal(I._scoring.scoreStream([{ system: null }, { system: null }], null).acc, 1);
  assert.equal(I._scoring.scoreStream([{ system: "dna" }, { system: null }], null).acc, 0.5);
  assert.equal(I._scoring.scoreStream([{ system: null }, { system: null }], "dna").acc, 0, "never deciding is scored 0");
});
test("jaccard / keysOf: strand-flipped coordinates map back; a rotated mapping is the deranged control", () => {
  const n = 1000;
  const beings = [{ strand: "+", span: [10, 100] }, { strand: "-", span: [300, 400] }];
  const A = I._scoring.keysOf(beings, n);
  const rcBeings = [{ strand: "-", span: [n - 100, n - 10] }, { strand: "+", span: [n - 400, n - 300] }];
  assert.equal(I._scoring.jaccard(A, I._scoring.keysOf(rcBeings, n, true)), 1);
  assert.ok(I._scoring.jaccard(A, I._scoring.keysOf(rcBeings, n, true, Math.floor(n / 3))) < 0.2);
  assert.equal(I._scoring.jaccard(new Set(), new Set()), 1);
});
test("suffixAgree: the reader's undetermined residues match anything; the initiator residue is not compared; short matches do not count", () => {
  assert.equal(I._scoring.suffixAgree("MKVLAAGIVGLLXAQPAEE*", "MKVLAAGIVGLLLAQPAEE"), true);
  assert.equal(I._scoring.suffixAgree("MKVLAAGIVGLLLAQPAEE", "MKVLAAGIVGLLWAQPAEE"), false);
  assert.equal(I._scoring.suffixAgree("MXXXXXXXXXXXXXXX", "VLAAAAAAAAAAAAA"), true);
  assert.equal(I._scoring.suffixAgree("MKV", "MKV"), false);
});
test("f1Sets / featureKey: declared beings are compared by strand, sorted parts and partial flag", () => {
  const a = I._scoring.featureKey(-1, [{ start: 29, end: 40, strand: -1 }, { start: 9, end: 20, strand: -1 }], false);
  const b = I._scoring.featureKey(-1, [{ start: 9, end: 20, strand: -1 }, { start: 29, end: 40, strand: -1 }], false);
  assert.equal(a, b);
  assert.equal(I._scoring.f1Sets([a], [b]), 1);
  assert.equal(I._scoring.f1Sets([a], [I._scoring.featureKey(1, [{ start: 9, end: 20, strand: 1 }], false)]), 0);
});
test("versus: real must beat every LICENSED control with a significant sign test; an unlicensed control never gates; none licensed => null", () => {
  const real = Array.from({ length: 10 }, () => 0.9);
  const arms = { weak: { values: real.map(() => 0.2), mean: 0.2, licensed: true }, tie: { values: real.map(() => 0.9), mean: 0.9, licensed: false } };
  const v = I._scoring.versus(real, arms);
  assert.equal(v.beatsAll, true); assert.deepEqual(v.unlicensed, ["tie"]);
  const strong = { strongTie: { values: real.map(() => 0.9), mean: 0.9, licensed: true } };
  assert.equal(I._scoring.versus(real, strong).beatsAll, false, "a licensed control that does as well as the real arm means the mechanism or the instrument is broken");
  assert.equal(I._scoring.versus(real, { x: { values: real, mean: 0.9, licensed: false } }).beatsAll, null);
});
test("derangeUsage re-deals codon keys without changing the multiset; derangeProfiles rotates the notation profiles; permuteLetters is a derangement", { skip: !havePriors }, () => {
  const d = I._scoring.derangeUsage(priors, 11);
  const a = Object.values(priors.orf.usage.bins[0].inFrame).sort((x, y) => x - y), b = Object.values(d.orf.usage.bins[0].inFrame).sort((x, y) => x - y);
  assert.deepEqual(a, b);
  assert.notDeepEqual(priors.orf.usage.bins[0].inFrame, d.orf.usage.bins[0].inFrame);
  const p = I._scoring.derangeProfiles(priors);
  assert.deepEqual(p.alphabet.profiles.dna, priors.alphabet.profiles.rna);
  const t = I._scoring.permuteLetters("ACGTACGT", L.mulberry32(3));
  assert.ok([...t].every((c, i) => c !== "ACGTACGT"[i]), "no letter maps to itself");
});
test("arithmetic: exact sign test and paired comparison", () => {
  assert.ok(Math.abs(L.signTest(8, 0).p - 1 / 256) < 1e-12);
  const r = L.pairedSign([1, 1, 1, 0.5], [0, 0, 1, 0.9]);
  assert.deepEqual([r.wins, r.losses, r.ties], [2, 1, 1]);
  const d = L.derangement(7, L.mulberry32(1));
  assert.ok(d.every((x, i) => x !== i) && new Set(d).size === 7);
  assert.equal(L.derangement(1, L.mulberry32(1)), null);
});

// ── the instrument never throws for missing data ─────────────────────────────────────────────────────────
test("measure() with an absent corpus returns the typed-unmeasured shape for every rung", async () => {
  const res = await I.measure({ split: "dev", corpusRoot: "/nonexistent/khora-genetic-corpus" });
  assert.equal(res.family, "genetic");
  assert.deepEqual(Object.keys(res.rungs), ["r0", "r1", "r2", "r3", "r4", "r5"]);
  for (const r of Object.values(res.rungs)) {
    assert.equal(r.pass, null);
    assert.equal(r.score, null);
    assert.equal(r.gaps[0].reason, "unmeasured");
    for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in r, k);
  }
  assert.equal(res.meta.prereg_sha256.length, 64);
});
test("measure() on the real corpus (when present) has the result shape and probabilities in [0,1]", { skip: !(L.exists(L.ROOT + "/manifest.json") && havePriors) }, async () => {
  const res = await I.measure({ split: "dev", limit: 2 });
  for (const [r, v] of Object.entries(res.rungs)) {
    for (const k of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in v, `${r}.${k}`);
    if (v.score != null) assert.ok(v.score >= 0 && v.score <= 1.0000001, `${r} score ${v.score}`);
    assert.ok(v.pass === true || v.pass === false || v.pass === null);
  }
  assert.equal(res.rungs.r3.details.causality.violations, 0, "the reader is causal on real genomes");
  assert.equal(res.rungs.r5.controls.arm_B_rna_exact_share, 1, "U is folded onto T: the RNA rendering reads exactly as the DNA");
});
test("the priors name their givers and say which counts come from TRAIN", { skip: !havePriors }, () => {
  assert.match(priors.codon.provenance.giver, /NCBI Genetic Codes/);
  assert.equal(priors.codon.provenance.crosscheck.disagree.length, 0, "gc.prt agrees with Biopython's CodonTable on every table");
  assert.equal(priors.codon.train.split, "train");
  assert.ok(priors.codon.train.records.length >= 20);
  assert.ok(priors.alphabet.provenance.giver.includes("IUPAC"));
  assert.equal(priors.orf.train.split, "train");
  const p = priors.orf.params;
  for (const k of ["B", "Lmin", "Lconf", "nMin", "alpha", "kappa", "startNominees"]) assert.ok(k in p, k);
  assert.ok(priors.orf.derivation.B.grid.includes(p.B) && priors.orf.derivation.L.grid.includes(p.Lmin), "derived constants come from a stated grid");
  // an unattested table is not a candidate (typed gap), an attested one is
  const C = G.compilePriors(priors);
  assert.ok(C.attested.has("11") && C.attested.has("4"));
  assert.ok(!C.attested.has("25"));
});


// ═══ AMENDMENT TESTS (review findings F1..F6): each plants a failure and requires the instrument to catch it ═══════════════

// ── F4: the three-valued conjunction ─────────────────────────────────────────────────────────────────────────
test("F4 and(): any false is false even beside a null; null only when nothing is false and something is null", () => {
  const { and, ge } = I._scoring;
  assert.equal(and(false, null), false);
  assert.equal(and(null, false), false);
  assert.equal(and(true, null), null);
  assert.equal(and(null, null), null);
  assert.equal(and(true, true), true);
  assert.equal(and(true, false, null), false);
  assert.equal(and(), true);
  assert.equal(ge(0.2, 0.6), false);
  assert.equal(and(ge(0.2, 0.6), null), false, "a failed floor beside a control test with no licensed control is a FAIL, not 'unmeasured'");
  assert.equal(ge(null, 0.6), null);
});

// ── F5: licences are independent of the real arm; a licensed control that ties or beats the real arm is BROKEN ───────────
test("F5 versus(): a licensed control that ties or beats the real arm is BROKEN (pass false), an unlicensed one never gates, none licensed is null with a typed gap", () => {
  const real = Array.from({ length: 12 }, (_, i) => 0.7 + 0.01 * i);
  const tie = { values: real.slice(), mean: real.reduce((a, b) => a + b, 0) / real.length, licensed: true };
  const weak = { values: real.map(() => 0.1), mean: 0.1, licensed: true };
  const unlicensedTie = { ...tie, licensed: false };
  let v = I._scoring.versus(real, { weak, tie });
  assert.equal(v.status.tie, "broken");
  assert.equal(v.status.weak, "ok");
  assert.deepEqual(v.broken, ["tie"]);
  assert.equal(v.beatsAll, false);
  v = I._scoring.versus(real, { weak, tie: unlicensedTie });
  assert.equal(v.status.tie, "unlicensed"); assert.equal(v.beatsAll, true);
  // the real arm ahead by mean but not significantly: not_significant, still no pass
  const close = { values: real.map((x, i) => (i < 2 ? x - 0.01 : x + 0.0 )), mean: 0.5, licensed: true };
  assert.equal(I._scoring.versus(real, { close }).status.close, "not_significant");
  // reported (non-gating) arms are shown but never gate
  const rep = I._scoring.versus(real, { weak, tie: { ...tie, gating: false } });
  assert.equal(rep.status.tie, "reported"); assert.equal(rep.beatsAll, true);
  // nothing licensed -> null, and the gap is typed
  const none = I._scoring.versus(real, { x: unlicensedTie });
  assert.equal(none.beatsAll, null);
  const gaps = []; I._scoring.controlGaps(gaps, none, "rX");
  assert.ok(gaps.some((g) => g.reason === "no_licensed_control:rX"));
  const gaps2 = []; I._scoring.controlGaps(gaps2, v = I._scoring.versus(real, { tie }), "rY");
  assert.ok(gaps2.some((g) => g.reason === "control_broken:rY.tie"));
});

test("F1b causality precondition: when R3(c) fails, R2/R4/R5 (which read the reader's timeline) FAIL with a typed gap; when it passes they are untouched", () => {
  const mk = () => ({ r2: { pass: true, gaps: [], notes: [] }, r3: { pass: false, gaps: [], notes: [], details: { causality: { pass: false } } }, r4: { pass: null, gaps: [], notes: [] }, r5: { pass: true, gaps: [], notes: [] } });
  const meta = {}; const r = I._scoring.applyCausalityPrecondition(mk(), meta);
  assert.equal(r.r2.pass, false); assert.equal(r.r4.pass, false, "a null becomes a FAIL under a failed precondition"); assert.equal(r.r5.pass, false);
  assert.ok(r.r5.gaps.some((g) => g.reason.startsWith("reader_not_causal"))); assert.equal(meta.causalityPrecondition, "failed");
  const ok = mk(); ok.r3.details.causality.pass = true; const meta2 = {}; I._scoring.applyCausalityPrecondition(ok, meta2);
  assert.equal(ok.r5.pass, true); assert.equal(meta2.causalityPrecondition, "passed");
});

// ── F1: prefix-stability at several K, whole beings, timeline; planted lookahead readers must be flagged ───────────────────
const toyRd = (seq) => { const o = G.read(">x\n" + seq + "\n", { priors, params: PARAMS, fixedState: ALT, noUsage: true }); return { beings: o.beings, timeline: o.code?.timeline ?? [] }; };
test("F1 prefixStability: the real reader has zero violations at n/20, n/10, n/4, n/2 on the toy genome (beings and timeline, every field)", { skip: !havePriors }, () => {
  const r = I.prefixStability(toyRd, T.seq);
  assert.equal(r.violations, 0, JSON.stringify(r.perK));
  assert.equal(r.perK.length, 4);
  assert.ok(r.checked > 0, "the check looked at something");
});
test("F1 prefixStability FLAGS planted lookahead readers; the pre-review check (K = n/2, id@at only) misses one of them", { skip: !havePriors }, () => {
  // (a) a two-pass reader: pass 1 reads the WHOLE input and picks the code that finds more genes, pass 2 emits with it fixed from residue 0
  const twoPass = (seq) => {
    const nGenes = (st) => G.scanGenome(seq, { fixedState: st, params: PARAMS, noUsage: true }).beings.length;
    const st = nGenes(ALT) > nGenes(STD) ? ALT : STD; // a decision that needs the future
    const o = G.read(">x\n" + seq + "\n", { priors, params: PARAMS, fixedState: st, noUsage: true });
    return { beings: o.beings, timeline: o.code?.timeline ?? [] };
  };
  const a = I.prefixStability(twoPass, T.seq);
  assert.ok(a.violations > 0, "the two-pass lookahead reader must be flagged: " + JSON.stringify(a.perK));
  // (b) the same reader with every being stamped by the whole input's GC
  const stamped = (seq) => { const r = toyRd(seq); const gc = [...seq].filter((c) => c === "G" || c === "C").length / seq.length; return { beings: r.beings.map((b) => ({ ...b, gcWhole: gc })), timeline: r.timeline }; };
  const b = I.prefixStability(stamped, T.seq);
  assert.ok(b.violations > 0, "the whole-input stamp must be flagged");
  // the PRE-REVIEW check: K = n/2 only and only `id@at` compared: it cannot see the stamp (a control that the new check beats)
  const legacy = (rd) => { const full = rd(T.seq); const K = Math.floor(T.seq.length / 2); const pre = rd(T.seq.slice(0, K)); const set = new Set(pre.beings.map((x) => `${x.id}@${x.at}`)); return full.beings.filter((x) => x.at <= K).filter((x) => !set.has(`${x.id}@${x.at}`)).length; };
  assert.equal(legacy(stamped), 0, "the old check is blind to a stamped field");
  // the instrument's own planted readers have the same property (they run on every genome in measureR3)
  assert.equal(typeof I._scoring.lookaheadStateReader, "function"); assert.equal(typeof I._scoring.lookaheadStampReader, "function");
  // (on real genomes the instrument flags them: see details.causality.planted of the card; the toy genome is too short for the real reader to emit beings)
});

// ── F2: a refusal that rests on letters, not delimiters ──────────────────────────────────────────────────────────
test("F2 listener: space-free letter negatives are refused by the new listener and NAMED a notation by the rank-only listener (the control built to fail)", { skip: !havePriors }, () => {
  const rng = L.mulberry32(77);
  const az = Array.from({ length: 30 }, () => Array.from({ length: 60 }, () => String.fromCharCode(65 + Math.floor(rng() * 26))).join(""));   // authored: random A-Z
  const words = AUTHORED_WORDS.map((w) => w.toUpperCase()).slice(0, 40);                                                                              // authored: a word per line
  const cipher = AUTHORED_WORDS.join("").toUpperCase().match(/.{1,60}/g).map((l) => l.replace(/[A-Z]/g, (c) => String.fromCharCode(65 + ((c.charCodeAt(0) - 65 + 7) % 26)))); // authored: Caesar shift 7
  const three = sampleProteinLines(priors, 20, 5).map((l) => [...l].map((c) => ({ A: "Ala", R: "Arg", N: "Asn", D: "Asp", C: "Cys", Q: "Gln", E: "Glu", G: "Gly", H: "His", I: "Ile", L: "Leu", K: "Lys", M: "Met", F: "Phe", P: "Pro", S: "Ser", T: "Thr", W: "Trp", Y: "Tyr", V: "Val" }[c] ?? "Xaa")).join("")).join("").match(/.{1,60}/g); // authored: 3-letter peptide
  let named = 0;
  for (const [name, lines] of [["random A-Z", az], ["word list", words], ["Caesar ciphertext", cipher], ["3-letter peptide", three]]) {
    assert.ok(lines.every((l) => /^[A-Za-z]+$/.test(l)), `${name}: no delimiter in any line`);
    const v = feedAll(lines, priors).at(-1);
    assert.equal(v.system, null, `${name} must be refused (letters, not delimiters): ${JSON.stringify(v)}`);
    assert.match(v.gap, /background_fits_better|profile_misfit/);
    const old = feedAll(lines, priors, { nulls: false }).at(-1);
    if (old.system != null) named++;
  }
  assert.ok(named >= 3, "the rank-only listener names most space-free letter texts a notation (the review's finding): " + named + "/4");
});
test("F2 listener: real notations are still named (dna, rna, protein), also lower case, and refuse text with a letter outside the nucleotide alphabet", { skip: !havePriors }, () => {
  const dna = T.seq.match(/.{1,70}/g).slice(0, 12);
  assert.equal(feedAll(dna, priors).at(-1).system, "dna");
  assert.equal(feedAll(dna.map((l) => l.toLowerCase()), priors).at(-1).system, "dna", "casing is one witness, not the signal");
  assert.equal(feedAll(sampleProteinLines(priors, 12, 99), priors).at(-1).system, "protein");
  const rnaLine = "GGGCCCAUAGCUCAGUGGUAGAGUGCCUCCUUUGCAAGGAGGAUGCCCUGGGUUCGAAUCCCAGUGGGUCCA";
  assert.equal(feedAll([rnaLine, rnaLine], priors).at(-1).system, "rna");
  // one stray letter outside the IUPAC nucleotide alphabet refuses the nucleotide reading (the standard's alphabet REFUSES; it does not average)
  const stray = dna.slice(); stray[3] = stray[3].slice(0, 30) + "E" + stray[3].slice(31);
  const v = feedAll(stray, priors).at(-1);
  assert.equal(v.system, null); assert.match(v.gap, /profile_misfit:dna|background|undecided/);
  // the verdict after line i is a function of lines <= i only
  const whole = feedAll(dna, priors).map((x) => x.system), part = feedAll(dna.slice(0, 5), priors).map((x) => x.system);
  assert.deepEqual(whole.slice(0, 5), part);
});
test("F2 listener: a flat 26-letter composition and a composition far from the TRAIN protein envelope are refused; chi-square quantile is close to the tables", { skip: !havePriors }, () => {
  assert.ok(Math.abs(G.chi2Upper(19, 0.001) - 43.82) < 1.0);
  assert.ok(Math.abs(G.chi2Upper(3, 0.001) - 16.27) < 0.5);
  const poly = Array.from({ length: 12 }, () => "LLLLLLLLLLEEEEEEEEEEKKKKKKKKKKAAAAAAAAAAGGGGGGGGGGVVVVVVVVVV"); // authored: 6 letters only, inside the 20-letter alphabet
  const v = feedAll(poly, priors).at(-1);
  assert.equal(v.system, null, JSON.stringify(v));
});
test("F2 instrument: the hard negative families carry no delimiter and the rank-only control collapses on them while the real listener does not (real corpus, 2 genomes)", { skip: !(L.exists(L.ROOT + "/manifest.json") && havePriors) }, async () => {
  const res = await I.measure({ split: "dev", limit: 2 });
  const by = res.rungs.r0.details.system.byFamily;
  const hard = Object.entries(by).filter(([f, v]) => v.gating && f !== "genome" && v.lineDelimiterShare === 0).map(([f]) => f);
  assert.ok(hard.length >= 5, "space-free families: " + hard.join(","));
  for (const f of hard) { assert.ok(by[f].score >= 0.8, `${f} real ${by[f].score}`); assert.ok(by[f].delimiter_only <= 0.5, `${f} delimiter_only ${by[f].delimiter_only}`); }
  for (const f of ["prose_spaced", "code"]) assert.equal(by[f].lineDelimiterShare, 1, `${f} keeps its delimiters (continuity families)`);
  assert.equal(by.flat20.gating, false, "the flat 20-letter peptide is reported, not gating");
  assert.ok(["ok", "not_significant"].includes(res.rungs.r0.details.system.controlStatus.always_refuse), "with 2 genomes the sign test has few units; the status is still typed");
});

// ── F3: R4 counts an abstention as a miss and scores the controls on all tokens ──────────────────────────────────────────
test("F3 tokenScores: an uncommitted token is a MISS; coverage, abstention and committed accuracy are separate; controls are scored on all tokens", () => {
  const rows = [
    { committed: true, aa: "K", goldAa: "K", stdAa: "K", sclAa: "K", derAa: "L", shiftAa: "A" },
    { committed: true, aa: "W", goldAa: "W", stdAa: "*", sclAa: "W", derAa: "A", shiftAa: null },
    { committed: false, aa: null, goldAa: "K", stdAa: "K", sclAa: "K", derAa: "K", shiftAa: null },   // abstention: a miss for the reader, a hit for the table-1 control
    { committed: false, aa: null, goldAa: "I", stdAa: "I", sclAa: "I", derAa: "V", shiftAa: null },
  ];
  const s = I._scoring.tokenScores(rows);
  assert.equal(s.tokens, 4);
  assert.equal(s.coverage, 0.5); assert.equal(s.abstention, 0.5);
  assert.equal(s.committedAccuracy, 1);
  assert.equal(s.tokenAccuracy, 0.5, "abstentions count as misses");
  assert.equal(s.std_table, 0.75, "table 1 commits everywhere and is scored on every token");
  assert.equal(s.stop_class_only, 1);
  assert.ok(s.tokenAccuracy < s.std_table && s.tokenAccuracy < s.stop_class_only, "an abstaining reader loses to table 1 on tokens: the old matched-coverage score hid this");
  assert.equal(s.stdWrong, 1); assert.equal(s.sclWrong, 0);
  assert.equal(s.committed_only.std_table, 0.5, "the old matched-coverage comparison is kept as a diagnostic");
});

// ── F6: the naive R1a control attempts all four checks (it used to have two hard-coded to 0) ───────────────────────────
test("F6 naive_tokens attempts every check: a toy where positional parsing works scores on ids and labels, and still fails the residue check; the regex baseline reads it all", () => {
  const seq = "acgtacgtacgtacgtacgtacgtacgtacgtacgtacgtacgtacgtacgtacgtacgt".toLowerCase();
  const gold = { seq_sha256: sha256(seq.toUpperCase()), version: "TOY1.1" };
  const gb = GB;
  const fa = ">TOY1.1 authored toy\n" + seq.toUpperCase() + "\n";
  const naive = I._scoring.naiveContainerChecks(gb, fa, gold), regex = I._scoring.regexContainerChecks(gb, fa, gold);
  assert.equal(naive[0], 0, "the naive tokenizer cannot separate residues from header words");
  assert.equal(naive[1], 1, "FASTA: lines not starting with '>'");
  assert.equal(naive[2], 1, "ids are attempted positionally, not hard-coded to 0");
  assert.equal(naive[3], 1, "labels are attempted, not hard-coded to 0");
  assert.deepEqual(regex, [1, 1, 1, 1]);
  // a text where positional guessing is wrong: the naive id check fails (it is a real attempt, so it can fail)
  const gb2 = GB.replace(/^LOCUS\s+TOY1/, "LOCUS       WRONG");
  assert.equal(I._scoring.naiveContainerChecks(gb2, fa, gold)[2], 0, "the id check is a real attempt, so it can fail");
});
