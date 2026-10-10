// tests/notation-ipa.test.js — regression guard for the IPA notation family:
//   (1) the ADAPTER (adapters/notation/ipa.js) reads canonical IPA the way the notation orders it, causally, with typed gaps;
//   (2) the INSTRUMENT (eval/notation-competence/ipa.mjs) is a working measuring device on a TOY fixture: a perfect reader scores 1,
//       deranged / ablated / naive controls score low, the controls are licensed (the statistic MOVES), the pre-registered pass rule
//       is a pure function that says what the header says, the peeking mock FAILS the prefix-stability check, and measure() runs
//       end to end on a toy corpus and never throws on a missing one.
// TOY FIXTURE IS AUTHORED (written by the test from a seeded generator; the gold is the generating segmentation). It says nothing about
// natural data: eval/notation-competence/ipa.mjs measures the adapter on held-out WikiPron/PHOIBLE.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import * as ipa from "../adapters/notation/ipa.js";
import * as inst from "../eval/notation-competence/ipa.mjs";

const P = ipa.loadPriors();
const toks = (s, o) => ipa.earTokens(s, { priors: P, ...o }).tokens.map((t) => t.text);

test("priors load, name their givers and carry no TEST/DEV data", () => {
  assert.equal(P.ok, true, JSON.stringify(P.gaps));
  assert.match(JSON.stringify(P.chart.giver), /IPA chart/);
  assert.match(JSON.stringify(P.chart.giver), /CC BY-SA 4\.0/);
  assert.match(P.chart.split, /No count in this file comes from TRAIN, DEV or TEST/);
  assert.equal(P.binding.giver.split, "TRAIN languages only");
  assert.equal(P.identify.giver.split, "TRAIN languages only");
  assert.equal(P.segments.giver.every((g) => /TRAIN/.test(g.split)), true);
  // the TRAIN language list in the binding prior never contains a DEV/TEST language of the manifest, when the corpus is present
  if (inst.dataAvailable()) {
    const man = inst.loadManifest();
    for (const iso of P.binding.giver.train_languages) assert.equal(man.lang_split[iso], "train", iso);
  }
});

test("adapter: segmentation of canonical IPA (diacritics, length, tie bar, tone letters, word-initial modifier)", () => {
  assert.deepEqual(toks("kʰæt"), ["kʰ", "æ", "t"]);
  assert.deepEqual(toks("t͡ʃɪp"), ["t͡ʃ", "ɪ", "p"]);
  assert.deepEqual(toks("aːbɑ̃"), ["aː", "b", "ɑ̃"]);
  assert.deepEqual(toks("ɑ̃ːb"), ["ɑ̃ː", "b"]);
  assert.deepEqual(toks("ma˥˩ɕi˧˥"), ["m", "a", "˥˩", "ɕ", "i", "˧˥"]);
  assert.deepEqual(toks("ʰa ˀɤ"), ["ʰa", "ˀɤ"], "a modifier with no host in its word binds FORWARD");
  assert.deepEqual(toks("kʰæt dɔɡ"), ["kʰ", "æ", "t", "d", "ɔ", "ɡ"], "a space ends a word and is not a token");
  assert.deepEqual(toks("t͡ʃʰːa"), ["t͡ʃʰː", "a"]);
  assert.deepEqual(toks("n̩t"), ["n̩", "t"]);
});

test("adapter: class of a segment (TRAIN-attested exact string, else the chart head), tone, typed unknown", () => {
  assert.equal(ipa.classify("ts", { priors: P }).cls, "consonant");
  assert.equal(ipa.classify("ɑ̃ː", { priors: P }).cls, "vowel");
  assert.equal(ipa.classify("ã", { priors: P }).cls, "vowel", "a precomposed letter is read by its base");
  assert.equal(ipa.classify("˥˩", { priors: P }).cls, "tone");
  assert.equal(ipa.classify("Ж", { priors: P }).cls, "unknown", "a Cyrillic letter is REFUSED, not guessed");
  assert.equal(ipa.classify("q", { priors: P }).cls, "consonant");
});

test("adapter: read() gives beings with spans, binding relations, class relations and typed gaps", () => {
  const r = ipa.read("kʰæt t͡ʃa", { priors: P });
  assert.equal(r.system, "ipa");
  assert.deepEqual(r.beings.map((b) => b.type), ["kʰ", "æ", "t", "t͡ʃ", "a"]);
  assert.deepEqual(r.beings[0].span, [0, 2]);
  assert.deepEqual(r.beings.map((b) => b.cls), ["consonant", "vowel", "consonant", "consonant", "vowel"]);
  const binds = r.relations.filter((x) => x.label === "binds" || x.label === "ties");
  assert.deepEqual(binds.map((x) => [x.label, x.mod, x.end2]), [["binds", "ʰ", "p0"], ["ties", "͡", "p3"]]);
  assert.ok(r.relations.some((x) => x.label === "isa" && x.end1 === "p1" && x.end2 === "vowel"));
  assert.ok(r.gaps.some((g) => g.reason === "claims_not_applicable"), "IPA states no propositions: typed");
  assert.equal(ipa.read("", { priors: P }).system, null);
  // stress is read per the chart but flagged as not TRAIN-attested; a stray modifier is typed
  const g = ipa.read("ˈkæt", { priors: P }).gaps.map((x) => x.reason);
  assert.ok(g.includes("stress_binding_not_train_attested"));
  // a missing prior is a typed gap, never a throw
  const none = ipa.read("kʰæt", { priors: ipa.compilePriors({}) });
  assert.deepEqual(none.beings, []);
  assert.ok(none.gaps.some((x) => /prior_missing/.test(x.reason)));
});

test("adapter: causal. what is closed in read(prefix, final:false) equals what read(full) says, and `at` never exceeds the prefix", () => {
  const lines = ["kʰæt͡ʃaːbɑ̃ɡʷɔ", "ma˥˩ɕi˧˥ʰa", "t͡ʃʰːæŋ̍n̩t", "pʲaɾʷe˥˩˧"];
  const st = inst.prefixStability(lines, (s, o) => ipa.earTokens(s, { priors: P, ...o }).tokens, { cutsPerLine: 6 });
  assert.equal(st.stability, 1);
  assert.ok(st.tot > 10);
  const bst = inst.prefixStability(lines, (s, o) => ipa.read(s, { priors: P, ...o }).beings, { cutsPerLine: 6 });
  assert.equal(bst.stability, 1);
  // the licence: a reader that judges earlier units by a WHOLE-TEXT statistic is caught by the same checker
  const peek = inst.prefixStability(["ma˥˩ɕi˧˥ʰa"], (s, o) => inst.peekTokens(s, P, o), { cutsPerLine: 6 });
  assert.ok(peek.stability < 1, `peeking mock must fail the stability check, got ${peek.stability}`);
  // an open token carries no `at`
  const open = ipa.earTokens("kʰæ", { priors: P, final: false }).tokens;
  assert.equal(open.at(-1).open, true);
  assert.equal(open.at(-1).at, null);
});

test("adapter: never throws, loses no character, keeps spans ordered, and reads NFD and NFC alike (fuzz over chart symbols + foreign scripts + spaces)", () => {
  const pool = Object.keys(P.chart.codepoints).map((h) => String.fromCodePoint(parseInt(h, 16))).filter((c) => !/\p{C}/u.test(c));
  const extra = [" ", " ", "\n", "😀", "Ж", "漢", "أ", "ब", "ˈ", "ː", "\u0361", "˥", "¹"];
  const rng = (() => { let s = 4242; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  for (let n = 0; n < 400; n++) {
    let s = ""; const L = 1 + Math.floor(rng() * 20);
    for (let i = 0; i < L; i++) s += rng() < 0.15 ? extra[Math.floor(rng() * extra.length)] : pool[Math.floor(rng() * pool.length)];
    for (const form of [s, s.normalize("NFD"), s.normalize("NFC")]) {
      const { tokens } = ipa.earTokens(form, { priors: P });
      ipa.read(form, { priors: P }); ipa.identify(form, { priors: P, trace: true }); ipa.canon(form, { priors: P });
      assert.equal(tokens.map((t) => t.text).join(""), form.replace(/\s/gu, ""), `no character lost in ${JSON.stringify(form)}`);
      let last = -1; for (const t of tokens) { assert.ok(t.span[0] >= last); last = t.span[1]; }
    }
  }
  // the same transcription in NFC and NFD gives the same number of segments and the same classes
  const a = ipa.read("ãːb ɑ̃ t͡ʃé", { priors: P }), b = ipa.read("ãːb ɑ̃ t͡ʃé".normalize("NFD"), { priors: P });
  assert.equal(a.beings.length, b.beings.length);
  assert.deepEqual(a.beings.map((x) => x.cls), b.beings.map((x) => x.cls));
});

test("R0 adapter: IPA vs orthography, undecided is not IPA, a foreign script is refused, the running LLR is a prefix function", () => {
  assert.equal(ipa.identify("ðə kwɪk bɹaʊn fɒks ɪts", { priors: P }).verdict, "ipa");
  assert.notEqual(ipa.identify("the quick brown fox jumps", { priors: P }).verdict, "ipa");
  assert.equal(ipa.identify("Привет мир как дела", { priors: P }).verdict, "not_ipa");
  const full = ipa.identify("ðə kwɪk bɹaʊn fɒks", { priors: P, trace: true });
  for (const cut of [3, 7, 12]) assert.ok(Math.abs(ipa.identify("ðə kwɪk bɹaʊn fɒks".slice(0, cut), { priors: P }).llr - full.trace[cut - 1]) < 1e-9);
  assert.equal(ipa.identify("", { priors: P }).system, null);
});

// ── instrument on a toy fixture ─────────────────────────────────────────────────────────────────────────────
const gold = [["kʰ", "æ", "t"], ["t͡ʃ", "ɪ", "p"], ["aː", "b", "ɑ̃", "d"], ["ɡʷ", "ɔ", "n̩"], ["ʈ͡ʂʰ", "u", "˥˩"]];

test("instrument R1 matcher: a perfect reader scores 1, codepoint split 0, deranged spans low", () => {
  const acc = (arm) => { const a = inst.newAcc(); gold.forEach((segs, i) => { const str = segs.join(""); inst.scoreSpans(str, inst.spansOfSegs(segs), arm(str, i), a); }); return a; };
  const f1 = (a) => (2 * a.tpM) / (2 * a.tpM + a.fpM + a.fnM);
  const perfect = acc((str, i) => inst.spansOfSegs(gold[i]));
  assert.equal(f1(perfect), 1);
  assert.equal(perfect.tpAll, perfect.tpAll + perfect.fnAll);
  const realReader = acc((str) => inst.armReader(P)(str));
  assert.equal(f1(realReader), 1, "the adapter reproduces the toy gold");
  const cp = acc((str) => inst.armCodepoint(str));
  assert.equal(cp.tpM, 0);
  const gr = acc((str) => inst.armGrapheme(str));
  assert.ok(f1(gr) < 0.7, "grapheme clusters cannot bind modifier letters or tie bars");
  // deranged: the spans of ANOTHER word (rotated), clipped to this string
  const der = acc((str, i) => inst.spansOfSegs(gold[(i + 1) % gold.length]).filter((s) => s[1] <= str.length));
  assert.ok(f1(der) < 0.5);
  // licence: ablated / deranged chart priors move the statistic
  const raw = { chart: P.chart, binding: P.binding, segments: P.segments, identify: P.identify };
  const abl = acc((str) => inst.armReader(inst.ablatedChart(raw))(str));
  const dch = acc((str) => inst.armReader(inst.derangedChart(raw))(str));
  assert.ok(f1(abl) < 0.8 && f1(dch) < 0.8, `ablated ${f1(abl)} deranged ${f1(dch)}`);
});

test("instrument pure helpers: derangement, sign test, balanced accuracy, retrieval credit, edges, token classes, decision", () => {
  const rng = inst.mulberry32(7);
  for (const n of [2, 3, 10, 50]) { const d = inst.derangement(n, rng); assert.equal(new Set(d).size, n); assert.ok(d.every((v, i) => v !== i)); }
  assert.equal(inst.derangement(1, rng), null);
  assert.ok(Math.abs(inst.signTest(5, 0).p - 1 / 32) < 1e-12);
  assert.ok(inst.signTest(0, 5).p > 0.9);
  assert.equal(inst.signTest(0, 0).p, 1);
  const pairs = [["a", "a"], ["a", "a"], ["a", "a"], ["a", "a"], ["a", "a"], ["b", "b"], ["b", "b"], ["b", "b"], ["b", "b"], ["b", "b"]];
  assert.equal(inst.balancedAccuracy(pairs).ba, 1);
  assert.equal(inst.balancedAccuracy(pairs.map(([g, p], i) => [g, i < 5 ? "unknown" : p])).ba, 0.5, "'unknown' is a miss");
  assert.equal(inst.balancedAccuracy(pairs.map(([g], i) => [g, pairs[(i + 5) % 10][0]])).ba, 0, "deranged labels");
  assert.equal(inst.retrievalCredit("kat", ["dog", "kat", "tak"], new Set([1])), 1);
  assert.equal(inst.retrievalCredit("kat", ["kat", "kat", "dog"], new Set([0])), 0.5, "ties share credit");
  assert.equal(inst.retrievalCredit("kat", ["dog", "kat"], new Set([0])), 0);
  assert.equal(inst.lev("kitten", "sitting"), 3);
  const e = (str, segs) => inst.edgesFromSpans(str, inst.spansOfSegs(segs)).map((x) => x.cls);
  assert.deepEqual(e("kʰæt", ["kʰ", "æ", "t"]), ["modifier_letter"]);
  assert.deepEqual(e("t͡ʃ", ["t͡ʃ"]), ["tie"]);
  assert.deepEqual(e("aː", ["aː"]), ["length"]);
  assert.deepEqual(e("ɑ̃", ["ɑ̃"]), ["combining"]);
  assert.deepEqual(e("ʰa", ["ʰa"]), ["prefix_modifier"]);
  assert.deepEqual(inst.edgesFromSpans("kʰ", inst.armCodepoint("kʰ")), [], "single-code-point tokens bind nothing");
  assert.deepEqual(inst.tokenClasses("t͡ʃʰː").sort(), ["length", "modifier_letter", "tie"].sort());
  assert.deepEqual(inst.tokenClasses("˥˩"), ["tone_group"]);
  const lic = { ok: true, bad: [] };
  const base = { n: 30, minN: 10, score: 0.97, floor: 0.95, margin: 0.4, marginMin: 0.1, signP: 0.001, licensed: lic, causal: true };
  assert.equal(inst.decide(base).pass, true);
  assert.equal(inst.decide({ ...base, n: 3 }).pass, null, "not measurable is null, never a pass");
  assert.equal(inst.decide({ ...base, score: 0.9 }).pass, false);
  assert.equal(inst.decide({ ...base, margin: 0.01 }).pass, false);
  assert.equal(inst.decide({ ...base, signP: 0.2 }).pass, false);
  assert.equal(inst.decide({ ...base, licensed: { ok: false, bad: ["ablated"] } }).pass, false, "a control that does as well as the real arm breaks the pass");
  assert.equal(inst.decide({ ...base, causal: false }).pass, false);
  assert.equal(inst.decide({ ...base, extras: [{ name: "class tie < floor", ok: false }] }).pass, false);
  assert.equal(inst.PREREG.r1.floor, 0.95);
});

// ── A3: the chart-free controls and what they prove ──────────────────────────────────────────────────────────
test("A3 ucd_category: a segmenter from Unicode general categories alone (no chart, no priors) reproduces the adapter on canonical IPA", () => {
  const cases = ["kʰæt", "t͡ʃɪp", "aːbɑ̃", "ɑ̃ːb", "ma˥˩ɕi˧˥", "ʰa ˀɤ", "kʰæt dɔɡ", "t͡ʃʰːa", "n̩t", "ʈ͡ʂʰu˥˩", "pʲaɾʷe"];
  for (const s of cases) {
    const ours = inst.ucdSegment(s).map(([a, b]) => s.slice(a, b));
    assert.deepEqual(ours, toks(s), `ucd_category vs adapter on ${s}`);
  }
  // total: every non-space code point is in exactly one span, in order; a stray modifier with no host is its own token
  const s = "ʰ  a ʲ";
  assert.deepEqual(inst.ucdSegment(s).map(([a, b]) => s.slice(a, b)), ["ʰ", "a", "ʲ"].map((x) => x));
  const rng = inst.mulberry32(99); const pool = ["k", "ʰ", "͡", "ː", "˥", "˩", "a", " ", "ʃ", "̃", "ˈ", "ŋ"];
  for (let n = 0; n < 300; n++) {
    let t = ""; for (let i = 0, L = 1 + Math.floor(rng() * 14); i < L; i++) t += pool[Math.floor(rng() * pool.length)];
    const sp = inst.ucdSegment(t); let last = 0, covered = "";
    for (const [a, b] of sp) { assert.ok(a >= last && b > a); last = b; covered += t.slice(a, b); }
    assert.equal(covered, t.replace(/\s/gu, ""), `no code point lost or duplicated in ${JSON.stringify(t)}`);
  }
  // it is NOT a copy of the grapheme control: it binds modifier letters and tie bars
  assert.notDeepEqual(inst.ucdSegment("kʰæt"), inst.armGrapheme("kʰæt"));
  assert.deepEqual(inst.UCD_DOUBLE_DIACRITICS.has(0x0361), true);
});

test("A3 ablations: ablatedChartKeepGc removes ONLY chart knowledge (role, class, ties, tone groups); ablatedChart (old 'ablated') removes Unicode knowledge too", () => {
  const raw = { chart: P.chart, binding: P.binding, segments: P.segments, identify: P.identify };
  const Pg = inst.ablatedChartKeepGc(raw), Pu = inst.ablatedChart(raw);
  // gc column kept, chart columns gone
  const e = Pg.chart.codepoints["02B0"]; assert.equal(e.gc, "Lm"); assert.ok(!("role" in e) && !("cls" in e) && !("desc" in e));
  assert.deepEqual(Pg.chart.sequences, {});
  assert.equal(ipa.charInfo(0x02b0, Pg).attach, "prev", "an Lm modifier still binds backward: that is Unicode category knowledge");
  assert.equal(ipa.charInfo(0x0361, Pg).role, "combining", "the tie bar is just a combining mark without the chart role");
  assert.equal(ipa.charInfo(0x0361, P).role, "tie");
  const segs = (PP, s) => ipa.earTokens(s, { priors: PP }).tokens.map((t) => t.text);
  assert.deepEqual(segs(Pg, "kʰæt"), ["kʰ", "æ", "t"], "gc alone binds the aspiration mark");
  assert.deepEqual(segs(Pg, "t͡ʃɪp"), ["t͡", "ʃ", "ɪ", "p"], "without the chart's tie role the affricate is split: this is what the chart adds");
  assert.deepEqual(segs(Pg, "ma˥˩"), ["m", "a", "˥", "˩"], "without the chart's tone-letter role the tone group is split");
  // the old ablation also lost gc: a modifier letter is a Latin-script BASE (a being of its own), which is not 'chart knowledge' being removed but Unicode knowledge
  assert.equal(ipa.charInfo(0x02b0, Pu).gc, null);
  assert.deepEqual(segs(Pu, "kʰæt"), ["k", "ʰ", "æ", "t"], "ablated_unicode loses even the aspiration binding: it is not a chart ablation");
  // binding:false empties the TRAIN table
  assert.equal(inst.ablatedChartKeepGc(raw, { binding: false }).idx.bind.size, 0);
  assert.equal(inst.ablatedBinding(raw).idx.bind.size, 0); assert.ok(inst.ablatedBinding(raw).idx.table.size > 0);
  // the declared split of controls: built to fail vs natural baselines
  assert.deepEqual(inst.BUILT_TO_FAIL.r1, ["codepoint", "ablated_unicode", "deranged"]);
  assert.ok(!inst.BUILT_TO_FAIL.r1.includes("ucd_category") && !inst.BUILT_TO_FAIL.r1.includes("ablated_chart"));
});

test("A3 R0 block baselines: Unicode-block membership, counts, ASCII share; the fit of k is TRAIN-only and absent TRAIN is a typed null", () => {
  assert.equal(inst.ruleBlockExt("kʰæt"), true, "U+02B0 is a Spacing Modifier Letter");
  assert.equal(inst.ruleBlockExt("kæt"), false, "U+00E6 is Latin-1 Supplement, not a phonetic block");
  assert.equal(inst.ruleBlockExt("ɓaɗa"), true, "Hausa orthography uses IPA-Extensions letters: a block rule calls it IPA (the trap)");
  assert.equal(inst.ruleBlockAll("tiếng việt".normalize("NFD")), true, "NFD Vietnamese diacritics are U+0300-036F: a block-all rule calls it IPA");
  assert.equal(inst.ruleBlockAll("tiếng việt".normalize("NFC")), false);
  assert.equal(inst.ruleBlockExt("ma˥˩"), true, "tone letters U+02E5-02E9 sit inside U+0250-02FF");
  assert.equal(inst.ruleNonAscii("kæt"), true); assert.equal(inst.ruleNonAscii("kat"), false);
  assert.equal(inst.countIn("kʰʰʷa", inst.BLOCKS_COUNT), 3);
  assert.equal(inst.asciiShare("kat sa"), 1); assert.equal(inst.asciiShare("kʰa"), 2 / 3); assert.equal(inst.asciiShare(" "), 1);
  // fit: TRAIN items where IPA chunks hold 2+ extension letters and orthography 0: any k in 1..2 is perfect, ties go to the smaller k
  const train = [{ script: "Latin", ipa: "kʰæt ʃɪp", ortho: "cat ship" }, { script: "Latin", ipa: "ʃʰɑ ŋɔ", ortho: "sha ngo" }, { script: "Cyrillic", ipa: "x", ortho: "x" }];
  const fit = inst.fitExtCountK(train); assert.equal(fit.k, 1); assert.equal(fit.ba, 1); assert.equal(fit.n, 2, "only the Latin-orthography (hard) items fit k");
  assert.equal(inst.fitExtCountK([]), null, "absent TRAIN: a typed null, never a guess");
  assert.equal(inst.fitExtCountK([{ script: "Cyrillic", ipa: "a", ortho: "b" }]), null);
  // a block rule is the strongest control wherever the reader merely matches it: the pass rule then fails on the margin (unchanged rule, honest result)
  const lic = { ok: true, bad: [] };
  const base = { n: 24, minN: 20, score: 0.983, floor: 0.85, margin: 0.983 - 0.9896, marginMin: 0.05, signP: 0.9, licensed: lic, causal: true };
  assert.equal(inst.decide(base).pass, false);
  assert.ok(inst.decide(base).why.some((w) => /margin/.test(w)) && inst.decide(base).why.some((w) => /sign-test/.test(w)));
});

test("A3 licence: the statistic MOVES under the built-to-fail controls; the natural baselines are exempt from the licence but not from the margin", () => {
  // a toy 'real' score of 0.99: a natural baseline at 0.99 does not break the licence (it is not in BUILT_TO_FAIL) but sets margin 0
  const raw = { chart: P.chart, binding: P.binding, segments: P.segments, identify: P.identify };
  const gold2 = [["kʰ", "æ", "t"], ["t͡ʃ", "ɪ", "p"], ["aː", "b", "ɑ̃", "d"], ["ɡʷ", "ɔ", "n̩"], ["ʈ͡ʂʰ", "u", "˥˩"]];
  const f1 = (arm) => { const a = inst.newAcc(); gold2.forEach((segs) => { const str = segs.join(""); inst.scoreSpans(str, inst.spansOfSegs(segs), arm(str), a); }); return (2 * a.tpM) / (2 * a.tpM + a.fpM + a.fnM); };
  const real = f1(inst.armReader(P)), ucd = f1(inst.armUcd), cp = f1(inst.armCodepoint), abU = f1(inst.armReader(inst.ablatedChart(raw))), abC = f1(inst.armReader(inst.ablatedChartKeepGc(raw))), der = f1(inst.armReader(inst.derangedChart(raw)));
  assert.equal(real, 1); assert.equal(ucd, 1);
  assert.ok(cp <= real - 0.05 && abU <= real - 0.05 && der <= real - 0.05, "built-to-fail controls lose by >= 0.05: licensed");
  assert.ok(abC < real, "removing the chart role column does move the statistic (ties, tone groups)");
  // had a built-to-fail control matched the reader, the licence would break and pass would be false
  assert.equal(inst.decide({ n: 30, minN: 10, score: 1, floor: 0.95, margin: 0.9, marginMin: 0.1, signP: 0.001, licensed: { ok: false, bad: ["deranged"] } }).pass, false);
});

test("A3 independent authority: panphon agreement is reported for the reader AND the chart-free arm, and the replica is visible", async () => {
  // run on a toy root with a gold-audit file: the reader, ucd_category and gold are scored against the 'panphon' column on span-alignable lines
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khora-ipa-toy2-"));
  const prev = process.env.KHORA_IPA_ROOT, prevN = process.env.KHORA_NOTATION_ROOT;
  process.env.KHORA_IPA_ROOT = root; process.env.KHORA_NOTATION_ROOT = root; writeToyCorpus(root);
  fs.mkdirSync(path.join(root, "gold"), { recursive: true });
  const rows = [{ pron: "kʰæt", segs: ["kʰ", "æ", "t"], panphon: ["kʰ", "æ", "t"], seglib: true }, { pron: "t͡ʃɪp", segs: ["t͡ʃ", "ɪ", "p"], panphon: ["t͡ʃ", "ɪ", "p"], seglib: true }, { pron: "aːb", segs: ["aː", "b"], panphon: ["aː", "b"], seglib: true }, { pron: "ma", segs: ["m", "a"], panphon: ["m"], seglib: true }];
  fs.writeFileSync(path.join(root, "gold", "wikipron-dev.jsonl.gz"), zlib.gzipSync(rows.map((r) => JSON.stringify(r)).join("\n") + "\n"));
  try {
    const m = await import(`../eval/notation-competence/ipa.mjs?toy2=${Date.now()}`);
    const res = await m.measure({ split: "dev" });
    const pan = res.rungs.r1.details.independentAuthority.panphon;
    assert.equal(pan.panphonAlignedLines, 3, "the 4th line is not span-alignable (panphon dropped a symbol): it is not scored");
    assert.equal(pan.panphonMarkedF1ByArm.real, 1); assert.equal(pan.panphonMarkedF1ByArm.ucd_category, 1); assert.equal(pan.panphonMarkedF1ByArm.gold_g1, 1);
    assert.equal(pan.panphonMarkedF1ByArm.codepoint, 0);
    const ph = res.rungs.r1.details.independentAuthority.phoibleSingleSegment;
    assert.equal(ph.singleBase.rate.real, 1); assert.equal(ph.singleBase.rate.ucd_category, 1); assert.equal(ph.singleBase.rate.codepoint < 1, true);
  } finally { if (prev === undefined) delete process.env.KHORA_IPA_ROOT; else process.env.KHORA_IPA_ROOT = prev; if (prevN === undefined) delete process.env.KHORA_NOTATION_ROOT; else process.env.KHORA_NOTATION_ROOT = prevN; fs.rmSync(root, { recursive: true, force: true }); }
});

// ── measure() end to end on an AUTHORED toy corpus ──────────────────────────────────────────────────────────
function writeToyCorpus(root) {
  const C = ["p", "t", "k", "kʰ", "t͡ʃ", "m", "n", "s", "ʃ", "d͡ʒ", "ɡʷ", "ʈ͡ʂʰ", "n̩"], V = ["a", "e", "i", "o", "u", "aː", "iː", "ɑ̃", "ɛ̃", "ə"];
  const files = []; const langs = { xx: "Latin", yy: "Latin", zz: "Cyrillic" };
  fs.mkdirSync(path.join(root, "corpus", "dev"), { recursive: true }); fs.mkdirSync(path.join(root, "corpus", "phoible"), { recursive: true });
  for (const [iso, script] of Object.entries(langs)) {
    for (const nb of ["Broad", "Narrow"]) {
      const f = `${iso}_${script === "Latin" ? "latn" : "cyrl"}_${nb.toLowerCase()}.tsv`; const rows = [];
      const rng2 = inst.mulberry32(iso.charCodeAt(0)); // the SAME seed for broad and narrow: the same word list, narrow adds aspiration
      const pick = (a) => a[Math.floor(rng2() * a.length)];
      for (let i = 0; i < 80; i++) {
        const segs = []; const k = 3 + Math.floor(rng2() * 3);
        for (let j = 0; j < k; j++) segs.push(j % 2 === 0 ? pick(C) : pick(V));
        const form = nb === "Narrow" ? segs.map((s) => (s === "p" ? "pʰ" : s === "t" ? "tʰ" : s)) : segs;
        rows.push(`${iso === "zz" ? "слово" : "word"}${i}\t${form.join(" ")}`);
      }
      fs.writeFileSync(path.join(root, "corpus", "dev", f), rows.join("\n") + "\n");
      files.push({ file: f, iso, split: "dev", script, dialect: "", nb, kept_lines: rows.length });
    }
  }
  fs.writeFileSync(path.join(root, "manifest.wikipron.json"), JSON.stringify({ files, lang_split: { xx: "dev", yy: "dev", zz: "dev" } }));
  const ph = { xx: { iso: "xx", n_inventories: 1, wikipron_language: true, phonemes: Object.fromEntries([...C, ...V].map((p) => [p, { cls: V.includes(p) ? "vowel" : "consonant", n_inv: 1 }])), allophones: [] } };
  fs.writeFileSync(path.join(root, "corpus", "phoible", "dev.json.gz"), zlib.gzipSync(JSON.stringify(ph)));
}

test("measure(): result shape for every rung, toy corpus: real arm perfect, controls low and licensed", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "khora-ipa-toy-"));
  const prev = process.env.KHORA_IPA_ROOT, prevN = process.env.KHORA_NOTATION_ROOT;
  process.env.KHORA_IPA_ROOT = root; process.env.KHORA_NOTATION_ROOT = root; writeToyCorpus(root); // no sibling-family corpora: the cross-family arm is a typed gap here
  try {
    const m = await import(`../eval/notation-competence/ipa.mjs?toy=${Date.now()}`);
    assert.equal(m.ROOT, root);
    const res = await m.measure({ split: "dev" });
    assert.equal(res.family, "ipa");
    assert.deepEqual(Object.keys(res.rungs), ["r0", "r1", "r2", "r3", "r4", "r5"]);
    for (const [k, r] of Object.entries(res.rungs)) {
      for (const f of ["id", "rung", "split", "n", "applicable", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(f in r, `${k}.${f}`);
      assert.equal(r.id, `ipa.${k}`); assert.equal(r.split, "dev"); assert.ok(Array.isArray(r.gaps));
    }
    const r1 = res.rungs.r1;
    assert.equal(r1.score, 1, "perfect reader on the toy gold");
    assert.equal(r1.controls.codepoint, 0);
    assert.ok(r1.controls.grapheme < 0.7 && r1.controls.ablated_unicode < 0.9 && r1.controls.deranged < 0.9);
    // A3: the chart-free Unicode-category segmenter REPRODUCES the toy gold (the instrument admits it: R1 is convention replication), the chart-role-only ablation does not
    assert.equal(r1.controls.ucd_category, 1, "a 15-line gc-only segmenter ties the reader on the toy gold");
    assert.ok(r1.controls.ablated_chart < 0.95, `ablated_chart ${r1.controls.ablated_chart}: no tie bars / tone groups without the chart role column`);
    assert.equal(r1.control, 1); assert.equal(r1.margin, 0, "margin is taken against the STRONGEST control, which now includes ucd_category");
    assert.equal(r1.claim, "convention_replication");
    assert.equal(r1.details.replication.claim, "convention_replication");
    assert.ok(r1.details.independentAuthority && "phoibleSingleSegment" in r1.details.independentAuthority);
    assert.ok("ablated" in r1.controls === false, "the misleading name 'ablated' is gone");
    assert.equal(r1.pass, null, "3 toy languages < MIN_N 10: not measurable is null, not a pass");
    assert.ok(r1.details.causal.stabilityReal === 1);
    const r4 = res.rungs.r4; assert.equal(r4.score, 1); assert.ok(r4.controls.codepoint < 0.1);
    assert.equal(r4.controls.ucd_category, 1); assert.equal(r4.margin, 0); assert.equal(r4.claim, "convention_replication");
    const r2 = res.rungs.r2; assert.equal(r2.score, 1, "toy PHOIBLE classes follow the chart"); assert.equal(r2.controls.deranged < 0.7, true);
    const r3 = res.rungs.r3; assert.ok(r3.score != null && r3.controls.deranged_lang != null);
    const r5 = res.rungs.r5; assert.ok(r5.score > r5.controls.deranged + 0.5, `real ${r5.score} vs deranged ${r5.controls.deranged}`);
    // R0: negatives are the ORTHOGRAPHY column; the toy IPA words contain exclusive glyphs, the toy orthography ('word7') does not
    const r0 = res.rungs.r0; assert.ok(r0.details.all.real.ba > 0.9, JSON.stringify(r0.details.all.real)); assert.ok(r0.controls.c_ascii < 0.75);
    // A3: block-membership baselines exist and are the strongest on the toy (IPA words carry exclusive glyphs, the toy orthography none); c_extcount needs TRAIN: typed gap
    for (const k of ["c_nonascii", "c_block_ext", "c_block_all", "c_deranged", "c_ascii", "c_ablated"]) assert.ok(k in r0.controls, k);
    assert.ok(!("c_extcount" in r0.controls) && r0.gaps.some((g) => /c_extcount_control_needs_a_train_corpus/.test(g.reason)));
    assert.ok(r0.controls.c_block_all >= r0.score - 1e-9, "a block rule is as good as the reader on the toy");
    assert.notEqual(r0.pass, true, "margin over a block rule is ~0: R0 cannot pass");
    for (const k of ["s1_block_trap_negatives", "s2_block_free_positives", "s3_ascii_heavy_positives", "s4_trap_union_balancedAccuracy", "s5_nfd_stress"]) assert.ok(k in r0.details.strata, k);
    const r3b = res.rungs.r3; assert.ok("ablated_unicode" in r3b.controls && "ablated_chart" in r3b.controls && !("ablated" in r3b.controls));
    const r5b = res.rungs.r5; assert.ok("ablated_unicode" in r5b.controls && "ablated_chart" in r5b.controls && !("ablated" in r5b.controls));
    assert.equal(r0.details.crossFamily, null);
    assert.ok(r0.gaps.some((g) => /other_family_corpora_absent/.test(g.reason)));
  } finally { if (prev === undefined) delete process.env.KHORA_IPA_ROOT; else process.env.KHORA_IPA_ROOT = prev; if (prevN === undefined) delete process.env.KHORA_NOTATION_ROOT; else process.env.KHORA_NOTATION_ROOT = prevN; fs.rmSync(root, { recursive: true, force: true }); }
});

test("measure(): a missing corpus or a missing prior is a typed 'unmeasured', never a throw", async () => {
  const prev = process.env.KHORA_IPA_ROOT;
  process.env.KHORA_IPA_ROOT = path.join(os.tmpdir(), "khora-ipa-does-not-exist");
  try {
    const m = await import(`../eval/notation-competence/ipa.mjs?missing=${Date.now()}`);
    const res = await m.measure({ split: "dev" });
    for (const r of Object.values(res.rungs)) { assert.equal(r.pass, null); assert.ok(r.gaps.some((g) => g.reason === "unmeasured")); assert.equal(r.score, null); }
  } finally { if (prev === undefined) delete process.env.KHORA_IPA_ROOT; else process.env.KHORA_IPA_ROOT = prev; }
});
