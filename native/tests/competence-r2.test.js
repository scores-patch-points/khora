// tests/competence-r2.test.js — regression guard for the R2 (classify) INSTRUMENT.
// It tests the instrument, never the reader: on a toy treebank where the right
// answer is known by construction, a perfect system must score 1, a deranged
// prior must score low, a constant must not pass, and the instrument must say
// "unmeasured" (not "good") when it cannot measure.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  measure, measureCore, prepare, scopeOf, predictNominal, refusedBy, derangeFramePrior, marginalOnlyFramePrior,
  blockSign, RUNG, DERANGE_DRAWS,
  // v2 (amendment 2026-10-06)
  analyseStratum, prefixOnlyFramePrior, pairedF1Permutation, clusterBootstrap, aucTable, aucAt, f1c, mccOf, compactIds,
  sentenceCounts, heardSpans, heardUnitsUnspaced, preregDigests, LOST_CEILING, ALPHA, PREREG_V1_SHA256, PERM_EXACT_MAX,
} from "../eval/competence/r2-class.mjs";
import { parseConllu, derangement, mulberry32, signTest, minDiscordantFor, summarise, confusion, auc, headerDigest } from "../eval/competence/lib.mjs";
import { makeSegmenter, priorIsUnspaced } from "../adapters/text/script-segment.js";

// ── toy fixture ─────────────────────────────────────────────────────────────
const POS = {
  schema: "POSPrior@1", language: "toy", provenance: { tokens_read: 400 },
  forms: { the: { DET: 50 }, dog: { NOUN: 20 }, cat: { NOUN: 20 }, runs: { VERB: 20 }, was: { AUX: 40 }, very: { ADV: 30 }, old: { ADJ: 30 }, and: { CCONJ: 50 } },
};
const FRAME = {
  schema: "FramePrior@1", language: "toy", provenance: { hapax: 30 },
  marginal: { NOUN: 10, VERB: 10, ADJ: 10 },
  frames: { "DET|VERB": { NOUN: 10 }, "AUX|ADV": { VERB: 10 }, "*|*": { ADJ: 10 } },
};
const nonce = (p, i) => p + String.fromCharCode(97 + i); // zorpa, zorpb … letters only, not reduplication
const conllu = (sents) => sents.map((toks, k) => `# sent_id = t${k}\n` + toks.map((t, i) => [i + 1, t[0], t[0], t[1], "_", "_", 0, "_", "_", t[2] ?? "_"].join("\t")).join("\n") + "\n").join("\n");
// 12 noun-frame sentences "the NOUN runs" and 12 verb-frame sentences "dog was VERB very old"
const toySentences = (n = 12) => {
  const s = [];
  for (let i = 0; i < n; i++) s.push([["the", "DET"], [nonce("zorp", i), "NOUN"], ["runs", "VERB"]]);
  for (let i = 0; i < n; i++) s.push([["dog", "NOUN"], ["was", "AUX"], [nonce("blorp", i), "VERB"], ["very", "ADV"], ["old", "ADJ"]]);
  return parseConllu(conllu(s));
};
const run = (over = {}) => measureCore({ sentences: toySentences(), posPrior: POS, framePrior: FRAME, ...over });

// ── the parser and the scope ────────────────────────────────────────────────
test("parseConllu: syntactic words, MWT ranges, SpaceAfter, empty nodes; --limit caps sentences", () => {
  const text = [
    "# sent_id = a", "# text = del dog's", "1-2\tdel\t_\t_\t_\t_\t_\t_\t_\t_", "1\tde\tde\tADP\t_\t_\t0\t_\t_\t_", "2\tel\tel\tDET\t_\t_\t0\t_\t_\t_",
    "3\tdog\tdog\tNOUN\t_\t_\t0\t_\t_\tSpaceAfter=No", "4\t's\t's\tPART\t_\t_\t0\t_\t_\t_", "4.1\tghost\tghost\tNOUN\t_\t_\t_\t_\t_\t_", "",
    "# sent_id = b", "1\tcat\tcat\tNOUN\t_\t_\t0\t_\t_\t_", "",
  ].join("\n");
  const ss = parseConllu(text);
  assert.equal(ss.length, 2);
  assert.deepEqual(ss[0].tokens.map((t) => t.form), ["de", "el", "dog", "'s"]);
  assert.equal(ss[0].ranges.length, 1);
  assert.equal(ss[0].tokens[2].spaceAfter, false);
  assert.equal(ss[0].tokens[1].spaceAfter, true);
  assert.equal(ss[0].text, "del dog's");
  assert.equal(parseConllu(text, { limit: 1 }).length, 1);
});

test("scopeOf mirrors the cast's scope with typed reasons", () => {
  assert.equal(scopeOf("the"), "in");
  assert.equal(scopeOf("北京"), "in"); // dense script: a two-character word is a word
  assert.equal(scopeOf("of"), "below_script_floor");
  assert.equal(scopeOf("123"), "numeric");
  assert.equal(scopeOf("hahaha"), "reduplication");
  assert.equal(scopeOf("e-mail"), "not_a_word_unit");
  assert.equal(scopeOf(",", "PUNCT"), "punct_or_symbol");
});

test("prepare: MWT surface words and apostrophe-glued tokens are typed gaps, neighbours are gold neighbours, edges are null", () => {
  const text = [
    "# sent_id = a", "1-2\tdel\t_\t_\t_\t_\t_\t_\t_\t_", "1\tde\tde\tADP\t_\t_\t0\t_\t_\t_", "2\tel\tel\tDET\t_\t_\t0\t_\t_\t_", "3\tperro\tperro\tNOUN\t_\t_\t0\t_\t_\t_", "",
    "# sent_id = b", "1\tdo\tdo\tAUX\t_\t_\t0\t_\t_\tSpaceAfter=No", "2\tn't\tnot\tPART\t_\t_\t0\t_\t_\t_", "3\tjohn\tjohn\tPROPN\t_\t_\t0\t_\t_\t_", "",
  ].join("\n");
  const p = prepare(parseConllu(text));
  assert.equal(p.excluded.mwt_surface, 2);
  assert.equal(p.excluded.apostrophe_glued, 2);
  const perro = p.rows.find((r) => r.unit === "perro");
  assert.equal(perro.prev, "el");
  assert.equal(perro.next, null); // sentence edge
  assert.equal(p.rows.find((r) => r.unit === "john").prev, "n't");
  assert.equal(p.rows.find((r) => r.unit === "john").gold, true);
});

// ── the arithmetic ──────────────────────────────────────────────────────────
test("exact binomial sign test: 12 wins, 0 losses is p = 2^-12; a tie is p = 1; minDiscordant = 5 at alpha .05", () => {
  assert.ok(Math.abs(signTest(12, 0).p - 2 ** -12) < 1e-12);
  assert.equal(signTest(0, 0).p, 1);
  assert.ok(Math.abs(signTest(5, 5).p - 0.623046875) < 1e-9);
  assert.equal(minDiscordantFor(0.05), 5);
});

test("blockSign: the SENTENCE is the unit — 10 tokens in one sentence are one vote", () => {
  const sent = Array(10).fill(0);
  const r = blockSign(sent, Array(10).fill(true), Array(10).fill(false));
  assert.equal(r.block.wins, 1);
  assert.equal(r.token.wins, 10);
  assert.ok(r.block.p > r.token.p);
});

test("derangement has no fixed point; F1/AUC arithmetic", () => {
  for (let seed = 1; seed < 60; seed++) for (const n of [2, 3, 7, 40]) {
    const d = derangement(n, mulberry32(seed));
    assert.equal(new Set(d).size, n);
    assert.ok(d.every((v, i) => v !== i));
  }
  assert.equal(derangement(1, mulberry32(1)), null);
  const s = summarise(confusion([true, true, false, false], [true, false, true, false]));
  assert.equal(s.f1, 0.5); assert.equal(s.accuracy, 0.5);
  assert.equal(summarise(confusion([true, false], [false, false])).f1, null); // no gold positive: undefined, not 0
  const constant = summarise(confusion([true, true, true, true], [true, true, false, false]));
  assert.equal(constant.macroF1, (2 / 3 + 0) / 2); // an all-nominal arm scores 0 on the non-nominal class — macro-F1 is defined
  assert.equal(auc([0.9, 0.8, 0.2, 0.1], [true, true, false, false]), 1);
  assert.equal(auc([0.1, 0.2, 0.8, 0.9], [true, true, false, false]), 0);
  assert.equal(auc([0.5, 0.5, 0.5, 0.5], [true, true, false, false]), 0.5);
});

test("the reader's rules as the instrument reads them: nominal at .5, settled refusal of a non-nominal class only", () => {
  assert.equal(predictNominal({ NOUN: 0.3, PROPN: 0.2, VERB: 0.5 }), true);
  assert.equal(predictNominal({ NOUN: 0.2, VERB: 0.8 }), false);
  assert.equal(predictNominal(null), false); // an abstention admits nothing
  assert.equal(refusedBy({ VERB: 0.9, NOUN: 0.1 }), true);
  assert.equal(refusedBy({ NOUN: 0.9, VERB: 0.1 }), false);
  assert.equal(refusedBy({ NOUN: 0.4, VERB: 0.3, ADJ: 0.3 }), false); // unsettled: kept, never refused
  assert.equal(refusedBy(null), false);
});

test("derangeFramePrior moves EVERY row; marginal-only keeps just the context-free row", () => {
  const d = derangeFramePrior(FRAME, 7);
  for (const k of Object.keys(FRAME.frames)) assert.notDeepEqual(d.frames[k], FRAME.frames[k]);
  assert.deepEqual(Object.keys(d.frames).sort(), Object.keys(FRAME.frames).sort());
  assert.deepEqual(d.marginal, FRAME.marginal);
  assert.deepEqual(Object.keys(marginalOnlyFramePrior(FRAME).frames), ["*|*"]);
  assert.equal(derangeFramePrior({ frames: { "*|*": { NOUN: 1 } } }, 1), null);
});

// ── the instrument's own licence ────────────────────────────────────────────
test("a PERFECT system scores 1 on the unseen words and passes the whole rule", () => {
  const r = run();
  assert.equal(r.n, 24);                      // 12 nouns + 12 verbs, all unseen
  assert.equal(r.score, 1);
  assert.equal(r.details.unseen.real.accuracy, 1);
  assert.equal(r.details.unseen.real.precision, 1);
  assert.equal(r.details.unseen.real.recall, 1);
  assert.equal(r.details.seen.real.accuracy, 1);
  assert.equal(r.pass, true);
  assert.equal(r.details.rule.licence.licensed, true);
  assert.equal(r.details.refusal.pooled.precision, 1);
  assert.equal(r.details.refusal.pooled.lostNominal, 0);
  assert.equal(r.details.rule.vsAllNominal.significant, true);
  assert.equal(r.margin, Number((r.score - r.control).toFixed(4)));
});

test("a DERANGED prior scores LOW on the same gold, and every draw changes predictions", () => {
  const r = run();
  assert.equal(r.details.unseen.derangedF1PerDraw.length, DERANGE_DRAWS);
  for (const f of r.details.unseen.derangedF1PerDraw) assert.ok(f <= 0.1, `deranged F1 ${f} should be low`);
  assert.ok(r.controls.deranged_best <= 0.1);
  assert.ok(r.details.rule.licence.flipsPerDraw.every((n) => n > 0));
  assert.ok(r.details.unseen.auc.real > 0.99);
  assert.ok(r.details.unseen.auc.deranged_best < 0.6);
});

test("controls are built to fail: constants sit at the base rate, shuffled gold collapses, prior_only admits nothing", () => {
  const r = run();
  assert.ok(Math.abs(r.controls.all_nominal - 2 / 3) < 1e-3);   // F1 of "everything nominal" at a 50% base rate
  assert.equal(r.controls.prior_only, 0);                       // no frame prior: an unseen word is not admitted
  assert.ok(r.controls.shuffled_gold < 0.7);
  assert.ok(r.control < r.score);
});

test("MUTATION: feeding the instrument a deranged prior as 'the reader' must NOT pass", () => {
  const r = run({ framePrior: derangeFramePrior(FRAME, 11) });
  assert.ok(r.score <= 0.1);
  assert.notEqual(r.pass, true);
});

test("MUTATION: a constant 'reader' (every frame says nominal) does not pass and is not licensed", () => {
  const constant = { ...FRAME, frames: { "DET|VERB": { NOUN: 10 }, "AUX|ADV": { NOUN: 10 }, "*|*": { NOUN: 10 } } };
  const r = run({ framePrior: constant });
  assert.ok(Math.abs(r.score - 2 / 3) < 1e-3);
  assert.equal(r.pass, false);
  assert.equal(r.details.rule.licence.licensed, false); // real F1 is not above the shuffled-gold quantile
});

test("MUTATION: shuffling the GOLD under the perfect reader drops the score (the statistic moves)", () => {
  const ss = toySentences();
  // swap the gold UPOS of nouns and verbs among unseen tokens: the same predictions are now wrong
  for (const s of ss) for (const t of s.tokens) if (/^(zorp|blorp)/.test(t.form)) t.upos = t.upos === "NOUN" ? "VERB" : "NOUN";
  const r = measureCore({ sentences: ss, posPrior: POS, framePrior: FRAME });
  assert.equal(r.score, 0);
  assert.notEqual(r.pass, true);
});

test("typed gaps: no frame prior, too few unseen sentences, no nominal among the unseen — pass is null, never true", () => {
  const noFrame = run({ framePrior: null });
  assert.equal(noFrame.pass, null);
  assert.ok(noFrame.gaps.some((g) => g.reason === "no_frame_prior"));
  assert.ok(noFrame.gaps.some((g) => g.reason === "unmeasured"));

  const few = measureCore({ sentences: toySentences(2), posPrior: POS, framePrior: FRAME }); // 4 sentences hold an unseen word < 5
  assert.equal(few.pass, null);
  assert.ok(few.gaps.some((g) => g.reason === "unmeasured"));

  const verbsOnly = parseConllu(conllu(Array.from({ length: 8 }, (_, i) => [["dog", "NOUN"], ["was", "AUX"], [nonce("blorp", i), "VERB"], ["very", "ADV"], ["old", "ADJ"]])));
  const vo = measureCore({ sentences: verbsOnly, posPrior: POS, framePrior: FRAME });
  assert.equal(vo.pass, null);
  assert.match(vo.gaps.find((g) => g.reason === "unmeasured").note, /no nominal/);

  assert.equal(measureCore({ sentences: toySentences(), posPrior: null, framePrior: FRAME }).pass, null);
  assert.equal(measureCore({ sentences: [], posPrior: POS, framePrior: FRAME }).pass, null);
});

test("unscored tokens are typed gaps with denominators, not silently dropped", () => {
  const r = run();
  assert.ok(r.details.excluded.below_script_floor == null || r.details.excluded.below_script_floor >= 0);
  const text = "# sent_id = x\n1\tthe\tthe\tDET\t_\t_\t0\t_\t_\t_\n2\t,\t,\tPUNCT\t_\t_\t0\t_\t_\t_\n3\t42\t42\tNUM\t_\t_\t0\t_\t_\t_\n";
  const g = measureCore({ sentences: parseConllu(text), posPrior: POS, framePrior: FRAME }).gaps;
  assert.ok(g.some((x) => x.reason === "unscored:punct_or_symbol" && x.count === 1));
  assert.ok(g.some((x) => x.reason === "unscored:numeric" && x.count === 1));
});

// ── post-registration diagnostics (never gate pass) ─────────────────────────
test("mwtSurface: a contraction read as ONE unit; a frame that says 'nominal' everywhere is caught by falseNominalRate", () => {
  const mwt = "# sent_id = m\n1-2\tdel\t_\t_\t_\t_\t_\t_\t_\t_\n1\tde\tde\tADP\t_\t_\t0\t_\t_\t_\n2\tel\tel\tDET\t_\t_\t0\t_\t_\t_\n3\tdog\tdog\tNOUN\t_\t_\t0\t_\t_\t_\n";
  const ss = [...toySentences(), ...parseConllu(mwt)];
  const ok = measureCore({ sentences: ss, posPrior: POS, framePrior: FRAME });
  assert.equal(ok.details.mwtSurface.n, 1);
  assert.equal(ok.details.mwtSurface.goldNominalShare, 0);   // de + el: neither names a being
  assert.equal(ok.details.mwtSurface.falseNominalRate, 0);   // the toy frame says non-nominal for "del"
  assert.equal(ok.details.excluded.mwt_surface, 2);          // the headline rows still exclude it, as pre-registered
  const nominalEverywhere = { ...FRAME, frames: { ...FRAME.frames, "*|*": { NOUN: 10 } } };
  const bad = measureCore({ sentences: ss, posPrior: POS, framePrior: nominalEverywhere });
  assert.equal(bad.details.mwtSurface.falseNominalRate, 1);  // "del" read as a possible being
  assert.equal(run().details.mwtSurface, null);              // no MWT in the plain toy: absent, not zero
});

test("mwtSurface.peeled: the reader's own peeler rescues a glued nominal the raw surface unit misses", () => {
  const glued = "# sent_id = g\n1-2\tthedog\t_\t_\t_\t_\t_\t_\t_\t_\n1\tthe\tthe\tDET\t_\t_\t0\t_\t_\t_\n2\tdog\tdog\tNOUN\t_\t_\t0\t_\t_\t_\n3\truns\truns\tVERB\t_\t_\t0\t_\t_\t_\n";
  const ss = [...toySentences(), ...parseConllu(glued)];
  const peel = (w) => (w === "thedog" ? "the dog" : w);
  const r = measureCore({ sentences: ss, posPrior: POS, framePrior: FRAME, peel });
  assert.equal(r.details.mwtSurface.goldNominalShare, 1);     // the + dog contains a noun
  assert.equal(r.details.mwtSurface.recall, 0);               // read raw, "thedog" is an unseen word in a verbless-frame: missed
  assert.equal(r.details.mwtSurface.peeled.recall, 1);        // heard through the peeler it is found
  assert.equal(measureCore({ sentences: ss, posPrior: POS, framePrior: FRAME }).details.mwtSurface.peeled, null); // no peeler, no claim
});

test("xSensitivity: gold X among the unseen is non-nominal in the score and reported separately as the names the reader would miss or find", () => {
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push([["the", "DET"], [nonce("zorp", i), "NOUN"], ["runs", "VERB"]]);
  for (let i = 0; i < 6; i++) rows.push([["the", "DET"], [nonce("zork", i), "X"], ["runs", "VERB"]]);
  for (let i = 0; i < 12; i++) rows.push([["dog", "NOUN"], ["was", "AUX"], [nonce("blorp", i), "VERB"], ["very", "ADV"], ["old", "ADJ"]]);
  const r = measureCore({ sentences: parseConllu(conllu(rows)), posPrior: POS, framePrior: FRAME });
  assert.ok(r.gaps.some((g) => g.reason === "unseen_gold_X_counted_non_nominal" && g.count === 6));
  assert.ok(Math.abs(r.score - 2 / 3) < 1e-3);                // X counted against the reader, as the brief says (D4)
  assert.equal(r.details.xSensitivity.unseenX, 6);
  assert.equal(r.details.xSensitivity.xPredictedNominal, 1);  // the frame DID read them as names
  assert.equal(r.details.xSensitivity.f1_real, 1);            // …and with X counted as nominal the reader is perfect
  assert.equal(run().details.xSensitivity, null);
});

// ── the module contract ─────────────────────────────────────────────────────
test("measure(): a stem with no prior or no gold returns pass:null + typed gap, never throws", async () => {
  const a = await measure({ stem: "zzz-no-such-language", split: "dev" });
  assert.equal(a.rung, RUNG.id);
  assert.equal(a.pass, null);
  assert.ok(a.gaps.some((g) => g.reason === "unmeasured"));
  const b = await measure({ stem: "eng", split: "no-such-split" });
  assert.equal(b.pass, null);
  assert.ok(b.gaps.some((g) => g.reason === "no_gold"));
});

test("measure(): the result card has the contract's fields and stamps the pre-registration digest", async (t) => {
  if (!fs.existsSync("/private/tmp/claude-501/ud-eval/eng/dev.conllu")) return t.skip("no dev gold on this machine");
  const r = await measure({ stem: "eng", split: "dev", limit: 120 });
  for (const k of ["stem", "rung", "split", "n", "score", "control", "margin", "pass", "controls", "gaps", "notes", "details"]) assert.ok(k in r, `missing ${k}`);
  assert.equal(r.rung, "r2");
  assert.equal(r.split, "dev");
  assert.match(r.details.prereg_sha256, /^[0-9a-f]{64}$/);
  assert.equal(r.details.prereg_sha256, headerDigest(new URL("../eval/competence/r2-class.mjs", import.meta.url).pathname));
  assert.equal(r.details.prereg_version, "v2");
  assert.equal(r.details.prereg_v1_verified, true);              // the v1 block was not edited
  assert.equal(r.details.prereg_v1_sha256, PREREG_V1_SHA256);
  assert.ok(r.score >= 0 && r.score <= 1);
});

// ═══ v2 (amendment 2026-10-06): one test per reviewer finding ═══════════════
// Each reproduces the reviewer's failure on a fixture built so the old rule would
// have been fooled, then shows the v2 rule is not.

// ── (blocker) the test names the statistic it compares ──────────────────────
test("F1 permutation: the smallest reachable p is 2^-m, so 5 discordant sentences can reject at .05 and 4 cannot", () => {
  const mk = (m) => { // A beats B on m sentences (one true positive each), tied on 30 more
    const k = m + 30;
    const a = { tp: new Float64Array(k), fp: new Float64Array(k), fn: new Float64Array(k) };
    const b = { tp: new Float64Array(k), fp: new Float64Array(k), fn: new Float64Array(k) };
    for (let s = 0; s < k; s++) { if (s < m) { a.tp[s] = 1; b.fn[s] = 1; } else { a.tp[s] = 1; b.tp[s] = 1; } }
    return [a, b];
  };
  const [a5, b5] = mk(5), [a4, b4] = mk(4);
  const p5 = pairedF1Permutation(a5, b5), p4 = pairedF1Permutation(a4, b4);
  assert.equal(p5.exact, true); assert.equal(p5.discordantSentences, 5);
  assert.ok(Math.abs(p5.p - 2 ** -5) < 1e-12);
  assert.ok(Math.abs(p4.p - 2 ** -4) < 1e-12);
  assert.ok(p5.p < ALPHA && p4.p > ALPHA);
  assert.equal(2 ** -minDiscordantFor(ALPHA) < ALPHA, true);
  const tie = pairedF1Permutation(a5, a5);
  assert.equal(tie.p, 1); assert.equal(tie.discordantSentences, 0);
  assert.ok(PERM_EXACT_MAX >= 5);
});

test("BLOCKER: an arm that wins ACCURACY by over-predicting nominal ties on F1 — v1's sign test passed it, the v2 F1 test does not", () => {
  // 1000 tokens, 23% nominal, 250 sentences of 4. B = all-nominal. A finds 100 of 230 nominals and raises 200 false alarms.
  const N = 1000, rng = mulberry32(5);
  const order = Array.from({ length: N }, (_, i) => [rng(), i]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const gold = new Array(N).fill(false); order.slice(0, 230).forEach((i) => (gold[i] = true));
  const A = new Array(N).fill(false);
  order.slice(0, 100).forEach((i) => (A[i] = true)); order.slice(230, 430).forEach((i) => (A[i] = true));
  const B = new Array(N).fill(true);
  const sent = Array.from({ length: N }, (_, i) => Math.floor(i / 4));
  const { ids, k } = compactIds(sent);
  const ca = sentenceCounts(ids, k, A, gold), cb = sentenceCounts(ids, k, B, gold);
  const f = (c) => f1c(c.tp.reduce((x, y) => x + y, 0), c.fp.reduce((x, y) => x + y, 0), c.fn.reduce((x, y) => x + y, 0));
  assert.ok(Math.abs(f(ca) - f(cb)) < 0.01, `F1s should tie: ${f(ca)} vs ${f(cb)}`);
  const acc = (P) => P.filter((p, i) => p === gold[i]).length / N;
  assert.ok(acc(A) - acc(B) > 0.4);
  const v1 = blockSign(sent, A.map((p, i) => p === gold[i]), B.map((p, i) => p === gold[i]));
  assert.ok(v1.block.p < 1e-10, "the superseded sign test reads accuracy and rejects");
  const v2 = pairedF1Permutation(ca, cb, { rng: mulberry32(1) });
  assert.ok(v2.p > 0.2, `the F1 test must not reject a tie: p=${v2.p}`);
  const boot = clusterBootstrap(k, { d: (ix) => { const x = [0, 1, 2].map((c) => [ca.tp, ca.fp, ca.fn][c]), y = [cb.tp, cb.fp, cb.fn]; const s = (arr) => { let t = 0; for (const i of ix) t += arr[i]; return t; }; return f1c(s(x[0]), s(x[1]), s(x[2])) - f1c(s(y[0]), s(y[1]), s(y[2])); } }, { draws: 400, rng: mulberry32(3) });
  assert.ok(boot.d.lower < 0, `bootstrap lower bound of the F1 difference must include zero: ${boot.d.lower}`);
});

test("the opposite failure: an arm clearly better at everything but accuracy-parity is not hidden by the accuracy test (F1 is what is tested)", () => {
  // A = perfect on 40 positives out of 100; B = all-nominal... A wins F1 AND accuracy; flip: B = perfect, A = all-nominal. The test must read the direction.
  const gold = Array.from({ length: 100 }, (_, i) => i < 40);
  const sent = Array.from({ length: 100 }, (_, i) => Math.floor(i / 2));
  const { ids, k } = compactIds(sent);
  const perfect = sentenceCounts(ids, k, gold, gold), allNom = sentenceCounts(ids, k, gold.map(() => true), gold);
  assert.ok(pairedF1Permutation(perfect, allNom, { rng: mulberry32(1) }).p < ALPHA);
  assert.ok(pairedF1Permutation(allNom, perfect, { rng: mulberry32(1) }).p > 0.9, "the constant does not beat the perfect arm");
});

test("MCC: a constant scores 0, a perfect arm 1, an inverted arm -1; AUC of a constant is .5", () => {
  assert.equal(mccOf(confusion([true, true, true, true], [true, true, false, false])), 0);
  assert.equal(mccOf(confusion([true, true, false, false], [true, true, false, false])), 1);
  assert.equal(mccOf(confusion([false, false, true, true], [true, true, false, false])), -1);
  assert.equal(f1c(0, 0, 0), null);
});

// ── (major) AUC: the threshold-free statistic constants score at the floor on ─
test("aucAt equals the reference AUC on tied scores; a constant arm is exactly .5; the bootstrap contains the point value", () => {
  const rng = mulberry32(9);
  const n = 400;
  const gold = Array.from({ length: n }, () => rng() < 0.4);
  const score = gold.map((g) => Math.round((rng() * 0.6 + (g ? 0.25 : 0)) * 20) / 20); // heavy ties
  const sent = Array.from({ length: n }, (_, i) => Math.floor(i / 3));
  const { ids, k } = compactIds(sent);
  const t = aucTable(ids, k, score, gold);
  assert.ok(Math.abs(aucAt(t) - auc(score, gold)) < 1e-12);
  const constant = aucTable(ids, k, gold.map(() => 1), gold);
  assert.equal(aucAt(constant), 0.5);
  const boot = clusterBootstrap(k, { a: (ix) => aucAt(t, ix) }, { draws: 300, rng: mulberry32(4) });
  assert.ok(boot.a.lower <= auc(score, gold) && auc(score, gold) <= boot.a.upper + 0.05);
  assert.ok(boot.a.lower > 0.5, "an informative score clears the constant");
});

// ── (major) lookahead is labelled, and a prefix-only arm sits beside it ─────
test("prefixOnlyFramePrior keeps only the P|* and *|* backoff rows: no key with a concrete right neighbour class survives", () => {
  const fp = { frames: { "DET|VERB": { NOUN: 1 }, "DET|*": { NOUN: 2 }, "*|VERB": { NOUN: 3 }, "*|*": { ADJ: 1 }, "DET|$": { NOUN: 1 } } };
  const p = prefixOnlyFramePrior(fp);
  assert.deepEqual(Object.keys(p.frames).sort(), ["*|*", "DET|*"]);
  assert.equal(prefixOnlyFramePrior({ frames: { "A|B": { NOUN: 1 } } }), null);
  assert.equal(prefixOnlyFramePrior(null), null);
});

test("D5 is relabelled SENTENCE-LOOKAHEAD, and the prefix-only arm of the toy cannot see the right neighbour the real arm needs", () => {
  const r = run();
  assert.match(r.details.granularity, /SENTENCE-LOOKAHEAD/);
  assert.equal(r.details.prefixOnly.lookaheadF1, 1);
  assert.equal(r.details.prefixOnly.real.f1, 0);                 // toy rows are keyed on prev|next only: no P|* row exists, the marginal says ADJ
  assert.equal(r.details.prefixOnly.measurable, false);          // a one-row prefix prior cannot be deranged: no control, so no verdict (typed, never "good")
  assert.match(r.details.prefixOnly.why, /too small to derange/);
  assert.equal(r.details.prefixOnly.claimA, null);
  assert.equal(r.details.rule.prefixOnlyClaimA, null);
  assert.equal(r.pass, true);                                    // the headline pass is at sentence granularity and says so
});

test("a prefix-sufficient frame prior is read in full by the prefix-only arm (positive control: the arm is not broken)", () => {
  const prefixFrame = { ...FRAME, frames: { "DET|*": { NOUN: 10 }, "AUX|*": { VERB: 10 }, "*|*": { ADJ: 10 } } };
  const r = run({ framePrior: prefixFrame });
  assert.equal(r.details.prefixOnly.real.f1, 1);
  assert.equal(r.details.prefixOnly.claimA, true);
  assert.equal(r.details.unseen.real.f1, 1);                     // identical, because nothing here needs the right neighbour
});

// ── (major) claim B: gated on the UNSEEN stratum, with a control built to fail and a loss ceiling ─
test("claim B on the toy: unseen refusal beats chance (B1), beats the deranged prior's refusal (B2), loses no being (B3)", () => {
  const r = run();
  const B = r.details.rule.refusal;
  assert.equal(B.B1_unseen_refusal_beats_chance, true);
  assert.equal(B.B2_beats_deranged_refusal, true);
  assert.equal(B.vacuousControl, false);
  assert.equal(B.B3_lost_beings_within_ceiling, true);
  assert.equal(r.details.rule.claimB, true);
  assert.equal(r.details.refusal.unseen.lostNominal, 0);
  assert.equal(LOST_CEILING, ALPHA);
});

test("LOST BEINGS (B3): a prior that refuses true beings fails claim B and the pass even when the refusal beats chance", () => {
  // a second noun context ("old X runs": ADJ|VERB) whose frame row WRONGLY says verb: 2 of the 14 unseen nominals are refused (14% > the 5% ceiling)
  const POS2 = { ...POS, forms: { ...POS.forms } };
  const wrongRow = { ...FRAME, frames: { ...FRAME.frames, "ADJ|VERB": { VERB: 10 } } };
  const s = [];
  for (let i = 0; i < 12; i++) s.push([["the", "DET"], [nonce("zorp", i), "NOUN"], ["runs", "VERB"]]);
  for (let i = 0; i < 2; i++) s.push([["old", "ADJ"], [nonce("zork", i), "NOUN"], ["runs", "VERB"]]);
  for (let i = 0; i < 12; i++) s.push([["dog", "NOUN"], ["was", "AUX"], [nonce("blorp", i), "VERB"], ["very", "ADV"], ["old", "ADJ"]]);
  const r = measureCore({ sentences: parseConllu(conllu(s)), posPrior: POS2, framePrior: wrongRow });
  const B = r.details.rule.refusal;
  assert.equal(B.B1_unseen_refusal_beats_chance, true);          // 12 of 14 refusals are right at a 46% base rate
  assert.equal(B.B3_lost_beings_within_ceiling, false);
  assert.ok(B.lostNominalRate > LOST_CEILING);
  assert.equal(r.details.rule.claimB, false);
  assert.notEqual(r.pass, true);
  assert.ok(r.notes.some((x) => /B3/.test(x)));
});

const SYN_REAL = { frames: { a: 1 }, tag: "real" };
const synth = (n, tweak = () => {}) => {
  const gold = Array.from({ length: n }, (_, i) => i % 2 === 0);
  const rng = mulberry32(77);
  const arms = {
    real: { pred: gold.slice(), mass: gold.map((g) => (g ? 1 : 0)), refused: gold.map((g) => !g) },
    same: { pred: gold.slice(), mass: gold.map((g) => (g ? 1 : 0)), refused: gold.map((g) => !g) },
    random: (() => { const p = gold.map(() => rng() < 0.5); return { pred: p, mass: p.map((x) => (x ? 0.9 : 0.1)), refused: p.map((x) => !x) }; })(),
    silent: { pred: gold.map(() => false), mass: gold.map(() => 0), refused: gold.map(() => false) },
  };
  tweak(arms, gold);
  const classify = (fp) => arms[fp?.tag ?? "silent"];
  const idx = gold.map((_, i) => i);
  return { gold, sent: idx.slice(), idx, classify };
};
const synRun = ({ gold, sent, idx, classify }, deranged) => analyseStratum({ gold, sent, idx, classify, variants: { real: SYN_REAL, marginal: null, deranged }, full: false });

test("a CONTROL THAT DOES AS WELL AS THE REAL ARM breaks the instrument's verdict: real vs an identical 'deranged' arm is not demonstrated (A) and B2 fails", () => {
  const r = synRun(synth(60), [{ frames: { a: 1 }, tag: "same" }]);
  assert.equal(r.measurable, true);
  assert.equal(r.tests.vsDerangedBest.demonstrated, false);
  assert.equal(r.tests.aucVsDeranged.demonstrated, false);
  assert.equal(r.claimBparts.B2_beats_deranged_refusal, false);
  assert.equal(r.pass, false);
});

test("against a RANDOM control the same real arm demonstrates every gate; against a SILENT control (refuses nothing) B2 is VACUOUS and says so", () => {
  const s = synth(60);
  const rnd = synRun(s, [{ frames: { a: 1 }, tag: "random" }]);
  assert.equal(rnd.claimA, true); assert.equal(rnd.claimBparts.B2_beats_deranged_refusal, true); assert.equal(rnd.pass, true);
  const sil = synRun(s, [{ frames: { a: 1 }, tag: "silent" }]);
  assert.equal(sil.claimBparts.vacuousControl, true);
  assert.equal(sil.claimBparts.B2_beats_deranged_refusal, true);
});

test("the unseen REFUSAL gate needs >= 5 refused tokens and a binomial below alpha: 3 refusals cannot pass however clean", () => {
  const s = synth(60, (arms, gold) => { // the real arm refuses only the first 3 non-nominals; everything else is left unsettled
    let c = 0; arms.real.refused = gold.map((g) => { if (!g && c < 3) { c++; return true; } return false; });
  });
  const r = synRun(s, [{ frames: { a: 1 }, tag: "random" }]);
  assert.equal(r.claimBparts.refusedTokens, 3);
  assert.equal(r.claimBparts.B1_unseen_refusal_beats_chance, false);
  assert.equal(r.claimB, false);
});

test("MUTATION: injecting the held-out gold into the POS prior (every unseen word becomes seen) leaves pooled refusal perfect — and the instrument says UNMEASURED, never good", () => {
  const leaked = { ...POS, forms: { ...POS.forms } };
  for (const s of toySentences()) for (const t of s.tokens) if (/^(zorp|blorp)/.test(t.form)) leaked.forms[t.form] = { [t.upos]: 6 };
  const r = measureCore({ sentences: toySentences(), posPrior: leaked, framePrior: FRAME });
  assert.equal(r.details.refusal.pooled.precision, 1);           // v1's pooled gate would have been happy
  assert.equal(r.details.unseenN, 0);
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => g.reason === "unmeasured" && /no unseen tokens/.test(g.note)));
});

// ── (blocker) the stamps: the v1 text is provably unedited, the v1 verdict is kept as superseded ──
test("the v1 pre-registration block is byte-for-byte intact: its digest, recomputed from this file, is the one stamped at v1", () => {
  const file = new URL("../eval/competence/r2-class.mjs", import.meta.url).pathname;
  const d = preregDigests(file);
  assert.equal(d.v1, PREREG_V1_SHA256);
  assert.equal(d.v1Verified, true);
  assert.notEqual(d.whole, d.v1);                                // the amendment changed the whole-block digest
  assert.match(fs.readFileSync(file, "utf8"), /PRE-REGISTRATION v2 — AMENDMENT 2026-10-06/);
});

test("the superseded v1 verdict is stored beside the v2 pass so the disagreement is visible", () => {
  const r = run();
  assert.equal(r.details.rule.v1_superseded.pass, true);
  assert.match(r.details.rule.v1_superseded.note, /SUPERSEDED/);
  assert.equal(r.details.rule.version, "v2");
});

// ── (major) the heard rule: the real ear decides what an unspaced word is ───
const hanPair = (i) => String.fromCodePoint(0x9a00 + 2 * i, 0x9a00 + 2 * i + 1);
const HAN_FILL = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [String.fromCodePoint(0x5000 + 2 * i, 0x5000 + 2 * i + 1), { NOUN: 3 }]));
const HAN_POS = { schema: "POSPrior@1", language: "toyhan", provenance: { tokens_read: 600 }, forms: { 这: { DET: 50 }, 跑: { VERB: 20 }, 狗: { NOUN: 20 }, 是: { AUX: 40 }, 很: { ADV: 30 }, 老: { ADJ: 30 }, ...HAN_FILL } };
const hanSentences = (n = 12) => {
  const s = [];
  for (let i = 0; i < n; i++) s.push([["这", "DET"], [hanPair(i), "NOUN"], ["跑", "VERB"]]);
  for (let i = 0; i < n; i++) s.push([["狗", "NOUN"], ["是", "AUX"], [hanPair(n + i), "VERB"], ["很", "ADV"], ["老", "ADJ"]]);
  return parseConllu(conllu(s));
};

test("the toy Han prior is an unspaced-script prior and the reader's segmenter hears each OOV pair as ONE unit with exact gold spans", () => {
  assert.equal(priorIsUnspaced(HAN_POS), true);
  const segment = makeSegmenter(HAN_POS);
  const text = `这${hanPair(0)}跑`;
  assert.equal(segment(text), `这 ${hanPair(0)} 跑`);
  const hs = heardSpans(text, segment);
  assert.deepEqual(hs.units.map((u) => [u.u, u.s, u.e]), [["这", 0, 1], [hanPair(0), 1, 3], ["跑", 3, 4]]);
  assert.equal(hs.total, 4);
});

test("HEARD ARM, positive control: with the reader's own segmenter every unseen toy word is recovered and the stem still passes end to end", () => {
  const segment = makeSegmenter(HAN_POS);
  const r = measureCore({ sentences: hanSentences(), posPrior: HAN_POS, framePrior: FRAME, segment });
  assert.equal(r.n, 24);
  assert.equal(r.details.rule.oracleBoundaryPass, true);
  assert.equal(r.details.heardArm.kind, "segmenter");
  assert.equal(r.details.heardArm.recoveredUnseen, 24);
  assert.equal(r.details.heardArm.recoveredShareUnseen, 1);
  assert.equal(r.details.heardArm.pass, true);
  assert.equal(r.pass, true);
  assert.match(r.details.boundary.scope, /heard arm \(segmenter\)/);
  const gap = r.gaps.find((g) => g.reason === "heard_unit_not_recovered:unseen");
  assert.deepEqual([gap.count, gap.denominator], [0, 24]);
});

test("HEARD ARM, MUTATION: a DEAF ear (cuts every character) leaves the oracle-boundary pass true and FAILS the stem, with recovery a typed gap and a denominator", () => {
  const deaf = (t) => [...t].join(" ");
  const r = measureCore({ sentences: hanSentences(), posPrior: HAN_POS, framePrior: FRAME, segment: deaf });
  assert.equal(r.details.rule.oracleBoundaryPass, true);         // gold boundaries make the oracle arm perfect — exactly the reviewer's point
  assert.equal(r.details.heardArm.recoveredUnseen, 0);
  assert.equal(r.details.heardArm.pass, false);
  assert.equal(r.pass, false);
  const gap = r.gaps.find((g) => g.reason === "heard_unit_not_recovered:unseen");
  assert.deepEqual([gap.count, gap.denominator], [24, 24]);
  assert.ok(r.notes.some((x) => /heard arm \(segmenter\) FAILS/.test(x)));
});

test("HEARD ARM: a sentence whose gold tokens do not concatenate to its raw text is a typed gap, never silently scored", () => {
  const ss = hanSentences(1);
  ss[0].text = "完全不同的句子";
  const { per, unalignedSentences, unalignedRows } = heardUnitsUnspaced({ sentences: ss, rows: prepare(ss).rows, segment: makeSegmenter(HAN_POS) });
  const rows = prepare(ss).rows;
  assert.equal(unalignedSentences, 1);
  assert.equal(unalignedRows, rows.filter((r) => r.si === 0).length);
  rows.forEach((r, i) => {
    if (r.si === 0) assert.ok(per[i].unaligned && per[i].units.length === 0);
    else assert.ok(!per[i].unaligned && per[i].units.length === 1);   // the intact sentence is still heard
  });
});

test("HEARD ARM (peeler): applies only when the peeler changes a scored form; the heard unit's neighbours are the PEELED neighbours", () => {
  // the enclitic "x" is attested as a verb-class unit, so the peeled neighbour class equals the gold one and every frame row stays UNIQUE
  // (two keys with the same effect would let a deranged draw reproduce the real arm exactly — the instrument would then rightly refuse to demonstrate a win)
  const POSX = { ...POS, forms: { ...POS.forms, x: { VERB: 30 } } };
  const FRAMEX = FRAME;
  const text = (s) => parseConllu(conllu(s));
  const s = [];
  for (let i = 0; i < 12; i++) s.push([["the", "DET"], [nonce("zorp", i) + "x", "NOUN"], ["runs", "VERB"]]);
  for (let i = 0; i < 12; i++) s.push([["dog", "NOUN"], ["was", "AUX"], [nonce("blorp", i) + "x", "VERB"], ["very", "ADV"], ["old", "ADJ"]]);
  const peel = (w) => w.replace(/x$/, " x");
  const r = measureCore({ sentences: text(s), posPrior: POSX, framePrior: FRAMEX, peel });
  assert.equal(r.details.heardArm.kind, "peeler");
  assert.equal(r.details.boundary.ear, "peeler");
  assert.equal(r.details.heardArm.measurable, true);
  assert.equal(r.details.heardArm.pass, true);
  assert.equal(r.pass, true);
  const none = measureCore({ sentences: text(s), posPrior: POSX, framePrior: FRAMEX, peel: (w) => w }); // peels nothing: the ear changes no unit
  assert.equal(none.details.heardArm, null);
  assert.equal(none.details.boundary.ear, "none");
  assert.match(none.details.boundary.scope, /the ear changes no unit/);
});

test("the plain toy has no ear arm and says its pass is at gold-token boundaries", () => {
  const r = run();
  assert.equal(r.details.heardArm, null);
  assert.equal(r.details.boundary.oracleBoundaries, true);
  assert.match(r.details.boundary.scope, /gold-token boundaries/);
});

test("an UNMEASURABLE heard arm leaves a passing oracle rule NULL — unmeasured is never good — with a typed gap", () => {
  // a peeler that shatters every word into single characters: no scorable heard unit survives, so the heard stratum is empty
  const r = measureCore({ sentences: toySentences(), posPrior: POS, framePrior: FRAME, peel: (w) => [...w].join(" ") });
  assert.equal(r.details.rule.oracleBoundaryPass, true);
  assert.equal(r.details.heardArm.kind, "peeler");
  assert.equal(r.details.heardArm.measurable, false);
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => g.reason === "heard_arm_unmeasured"));
  assert.ok(r.notes.some((x) => /heard arm \(peeler\) unmeasured/.test(x)));
});

test("the heard arm can only make a pass harder: when the oracle rule FAILS, an unmeasurable heard arm leaves it false, not null", () => {
  const constant = { ...FRAME, frames: { "DET|VERB": { NOUN: 10 }, "AUX|ADV": { NOUN: 10 }, "*|*": { NOUN: 10 } } };
  const r = measureCore({ sentences: toySentences(), posPrior: POS, framePrior: constant, peel: (w) => [...w].join(" ") });
  assert.equal(r.details.rule.oracleBoundaryPass, false);
  assert.equal(r.pass, false);
});
