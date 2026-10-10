// R1 (hear words) — the INSTRUMENT is regression-guarded on a toy fixture:
// a perfect system scores 1, deranged / shifted / no-ear arms score low, the
// plumbing arm (ear disabled) equals the no-ear arm exactly, the mechanism
// mutations (dose, shift, wrong affixes) move the statistic, the lexicon-free
// controls (affix_only, every_char) exist and mean what the header says, and the
// pass rule (v2) is a pure function that says what the pre-registration says.
// Nothing here measures the ear; eval/competence/r1-hear.mjs does that on
// held-out gold.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseConllu, conlluPath, readConllu } from "../eval/competence/lib.mjs";
import {
  RUNG, PARAMS, FLOOR_ARMS, measure, streamOf, foldText, unitsOf, buildGold, predictedFlags, evaluateSentences,
  bootstrapF1, bootstrapShare, diffCI, decide, licenceOf, strideSample, scrambleGrammar, scrambleMap, donorFor, armsFor,
  truncateLexicon, affixOnlyHear, shiftedHeard, normText, trainTextsFor, overlapWithTrain,
} from "../eval/competence/r1-hear.mjs";
import { grammarFor } from "../the-fold/language-grammar.js";
import { makeEar } from "../adapters/text/ear.js";

// ── a tiny CoNLL-U builder ──────────────────────────────────────────────────
const T = (id, form, lemma = "_", upos = "X", xpos = "_", misc = "_") => [id, form, lemma, upos, xpos, "_", "0", "dep", "_", misc].join("\t");
const R = (from, to, form) => [`${from}-${to}`, form, "_", "_", "_", "_", "_", "_", "_", "_"].join("\t");
const sentence = (id, text, rows) => `# sent_id = ${id}\n# text = ${text}\n${rows.join("\n")}\n`;
const doc = (...ss) => ss.join("\n");

// two unspaced sentences; gold word ends (stream positions) A: 1,2,4,7  B: 1,2,4,6
const A = sentence("a", "我爱北京天安门。", [T(1, "我"), T(2, "爱"), T(3, "北京"), T(4, "天安门"), T(5, "。")]);
const B = sentence("b", "他在北京工作。", [T(1, "他"), T(2, "在"), T(3, "北京"), T(4, "工作"), T(5, "。")]);
const toy = parseConllu(doc(A, B));
const SPACED = new Map([["我爱北京天安门。", "我 爱 北京 天安门 。"], ["他在北京工作。", "他 在 北京 工作 。"]]);
// the COMPLEMENT of the gold: boundaries only where the gold has none (the punctuation edge is still free: the tokeniser cuts it)
const SHIFTED = new Map([["我爱北京天安门。", "我爱北 京天 安 门。"], ["他在北京工作。", "他在北 京工 作。"]]);
const arms = (over = {}) => ({
  perfect: { text: (t) => SPACED.get(t) },
  no_ear: { text: (t) => t },
  shifted: { text: (t) => SHIFTED.get(t) },
  ...over,
});

test("streams: whitespace is removed, and remembered", () => {
  const s = streamOf("a bc  d");
  assert.deepEqual(s.cps, ["a", "b", "c", "d"]);
  assert.deepEqual(s.ws, [0, 1, 0, 1]);
  assert.equal(foldText("ÀBÇ"), "àbç");
  assert.equal([...foldText("İ")].length, 1, "folding never changes the code-point count");
});

test("gold: plain tokens end where the treebank says, aligned to the text", () => {
  const g = buildGold(toy[0]);
  assert.ok(g.ok);
  assert.equal(g.N, 8);
  assert.deepEqual([...g.G].map((v, k) => (v ? k : null)).filter((k) => k !== null), [1, 2, 4, 7]);
});

test("gold: an MWT whose parts concatenate is split inside; a contraction (al = a+el) is masked and counted, never scored", () => {
  const ar = parseConllu(sentence("ar", "وغادر", [R(1, 2, "وغادر"), T(1, "و"), T(2, "غادر")]))[0];
  const g = buildGold(ar);
  assert.ok(g.ok);
  assert.equal(g.G[1], 2, "MWT inner boundary kind 2 at the clitic edge");
  assert.equal(g.stats.mwt_concat_splits, 1);
  const es = parseConllu(sentence("es", "vamos al cine", [T(1, "vamos"), R(2, 3, "al"), T(2, "a"), T(3, "el"), T(4, "cine")]))[0];
  const e = buildGold(es);
  assert.ok(e.ok);
  assert.equal(e.stats.mwt_nonconcat_splits, 1);
  assert.equal(e.stats.mwt_nonconcat_tokens, 1);
  assert.equal(e.mask[6], 1, "the position inside 'al' is masked");
  assert.equal(e.dom[6], 0, "and out of the domain for every arm");
  assert.equal(e.G[5], 1); assert.equal(e.G[7], 1);
});

test("gold: Korean josa tier splits stem|particle only when the morphs concatenate exactly; tier all also splits verb morphs", () => {
  const ko = parseConllu(sentence("ko", "스타벅스가 주관하고", [
    T(1, "스타벅스가", "스타벅스+가", "NOUN", "NNG+JKS"),
    T(2, "주관하고", "주관+하+고", "VERB", "NNG+XSV+EC"),
  ]))[0];
  const josa = buildGold(ko, { tier: "josa" });
  assert.equal(josa.G[4], 3, "스타벅스|가");
  assert.equal(josa.G[5], 1);
  assert.equal(josa.G[7], 0, "verb morphs are not a josa split");
  const all = buildGold(ko, { tier: "all" });
  assert.equal(all.G[7], 3); assert.equal(all.G[8], 3);
  const none = buildGold(ko, { tier: "none" });
  assert.equal(none.G[4], 0);
  const fused = parseConllu(sentence("kf", "그게 좋다", [T(1, "그게", "그것+이", "PRON", "NP+JKS"), T(2, "좋다", "좋+다", "ADJ", "VA+EF")]))[0];
  const f = buildGold(fused, { tier: "josa" });
  assert.equal(f.stats.morph_unaligned, 1, "그것+이 is not a substring of 그게: masked, not guessed");
  assert.equal(f.mask[1], 1);
});

test("gold: a sentence whose forms are not in its text is dropped and counted, never thrown", () => {
  const bad = parseConllu(sentence("x", "abc def", [T(1, "abc"), T(2, "xyz")]));
  assert.equal(buildGold(bad[0]).ok, false);
  const ev = evaluateSentences(bad, { no_ear: { text: (t) => t } });
  assert.equal(ev.n, 0);
  assert.equal(ev.dropped.gold_unaligned, 1);
});

test("units: tokens with inner spaces (Vietnamese) are one unit, no gold boundary at the inner space", () => {
  const vi = parseConllu(sentence("v", "Trả lời nói", [T(1, "Trả lời"), T(2, "nói")]))[0];
  const g = buildGold(vi);
  assert.ok(g.ok);
  assert.equal(g.G[3], 0, "no boundary at the space inside 'Trả lời'");
  assert.equal(g.G[6], 1);
  assert.equal(unitsOf(vi).length, 2);
});

test("predicted boundaries: the production tokeniser, and a mismatch is detected", () => {
  assert.deepEqual([...predictedFlags("ab cd,e", 6)].map((v, k) => (v ? k : null)).filter((k) => k !== null), [2, 4, 5]);
  assert.equal(predictedFlags("ab cd", 6), null, "an arm that changed the characters is refused, not scored");
  assert.deepEqual([...predictedFlags("ab cd", 4, "space")].map((v, k) => (v ? k : null)).filter((k) => k !== null), [2]);
});

test("INSTRUMENT: a perfect system scores exactly 1; the no-ear and a deranged arm score low and below it", () => {
  const ev = evaluateSentences(toy, arms());
  assert.equal(ev.n, 2);
  const F = (n) => { const c = ev.totals[n]; return (2 * c.tp) / (2 * c.tp + c.fp + c.fn); };
  assert.equal(F("perfect"), 1);
  assert.equal(ev.totals.no_ear.tp, 2); assert.equal(ev.totals.no_ear.fn, 6);
  assert.ok(Math.abs(F("no_ear") - 0.4) < 1e-12, "letters-only tokenisation hears only the punctuation edge");
  assert.ok(F("shifted") < F("no_ear") && F("shifted") < 0.3, `a deranged placement scores low and below no-ear (${F("shifted")})`);
  assert.ok(F("perfect") - F("shifted") > 0.7, "the statistic moves under the perturbation (the licence check)");
});

test("INSTRUMENT: the random-boundary control places as many boundaries as the real arm and scores far below it", () => {
  const ev = evaluateSentences(toy, arms(), { randomOf: "perfect" });
  const F = (n) => { const c = ev.totals[n]; return (2 * c.tp) / (2 * c.tp + c.fp + c.fn); };
  assert.equal(ev.totals.random_boundaries.tp + ev.totals.random_boundaries.fp, ev.totals.perfect.tp + ev.totals.perfect.fp);
  assert.ok(F("random_boundaries") < 1);
});

test("INSTRUMENT: the inside-run sites and per-kind recall see what only an ear can place", () => {
  const ev = evaluateSentences(toy, arms());
  assert.equal(ev.insideTotals.no_ear.tp + ev.insideTotals.no_ear.fp, 0, "the no-ear arm never places a boundary inside a letters-run");
  assert.equal(ev.insideTotals.perfect.fn, 0);
  assert.equal(ev.kinds.perfect[1].gold, ev.kinds.perfect[1].hit);
  assert.ok(ev.kinds.no_ear[1].hit < ev.kinds.no_ear[1].gold);
});

test("INSTRUMENT: MUTATION — the ear disabled reproduces the no-ear arm exactly; a working ear does not", () => {
  const ev = evaluateSentences(toy, arms({ disabled: { text: (t) => t } }));
  assert.equal(ev.identical.disabled, true);
  assert.deepEqual(ev.totals.disabled, ev.totals.no_ear);
  assert.equal(ev.identical.perfect, false, "the licence check can tell a working ear from a disabled one");
  assert.equal(ev.identical.shifted, false);
});

test("bootstrap: identical arms have a zero interval; a clearly better arm has a positive lower bound; worse has a negative upper bound", () => {
  const n = 40;
  const mk = (tp, fp, fn) => Int32Array.from({ length: n * 3 }, (_, i) => [tp, fp, fn][i % 3]);
  const per = { good: mk(3, 0, 1), same: mk(3, 0, 1), bad: mk(1, 1, 3) };
  const dist = bootstrapF1(per, n, { B: 200, seed: 7 });
  const same = diffCI(dist.good, dist.same);
  assert.equal(same.lo, 0); assert.equal(same.hi, 0);
  const up = diffCI(dist.good, dist.bad);
  assert.ok(up.lo > 0, JSON.stringify(up));
  const down = diffCI(dist.bad, dist.good);
  assert.ok(down.hi < 0);
  assert.deepEqual([...bootstrapF1(per, n, { B: 50, seed: 7 }).good], [...bootstrapF1(per, n, { B: 50, seed: 7 }).good], "seeded: reproducible");
});

const F1 = (c) => (2 * c.tp) / (2 * c.tp + c.fp + c.fn);
const win = (extra = {}) => ({
  no_ear: { delta: 0.5, lo: 0.4, hi: 0.6 }, whitespace: { delta: 0.5, lo: 0.4, hi: 0.6 }, every_char: { delta: 0.2, lo: 0.1, hi: 0.3 },
  random_inside_run: { delta: 0.3, lo: 0.2, hi: 0.4 }, scrambled_lexicon: { delta: 0.3, lo: 0.2, hi: 0.4 }, ...extra,
});
const licenceOk = { ok: true, failed: [] };

test("the pass rule is the pre-registered one (v2)", () => {
  assert.equal(decide({ needs: true, active: true, licence: licenceOk, diffs: win() }).pass, true);
  assert.equal(decide({ needs: true, active: true, licence: licenceOk, diffs: win({ scrambled_lexicon: { delta: 0.0, lo: -0.01, hi: 0.01 } }) }).pass, false, "a scrambled lexicon that does as well fails the licence");
  assert.equal(decide({ needs: true, active: true, licence: licenceOk, diffs: win({ no_ear: { delta: 0.005, lo: 0.001, hi: 0.01 } }) }).pass, false, "a significant but sub-point gain is not claimed");
  assert.equal(decide({ needs: true, active: false, diffs: { no_ear: { delta: 0, lo: 0, hi: 0 } } }).pass, false, "needs an ear, has none: fail with a typed gap");
  assert.equal(decide({ needs: false, active: false, diffs: { no_ear: { delta: 0, lo: 0, hi: 0 } } }).pass, null, "inert on a language that needs none: vacuous, never a pass");
  assert.equal(decide({ needs: false, active: true, diffs: { no_ear: { delta: -0.001, lo: -0.01, hi: 0.005 } } }).pass, true, "not significantly below: no harm");
  assert.equal(decide({ needs: false, active: true, diffs: { no_ear: { delta: -0.05, lo: -0.06, hi: -0.04 } } }).pass, false, "significant harm");
  assert.equal(decide({ needs: true, active: true, plumbingOk: false, licence: licenceOk, diffs: win() }).pass, false, "a broken harness never passes");
  assert.equal(decide({ needs: true, active: true, mutationOk: false, licence: licenceOk, diffs: win() }).pass, false, "the v1 alias still breaks it");
});

test("v2 rule: no_ear is a floor, never the reference; the strongest NON-TRIVIAL control must be beaten by MIN_EFFECT, and every control needs lo > 0", () => {
  assert.deepEqual([...FLOOR_ARMS], ["no_ear", "whitespace"]);
  // lzh-like: the ear beats no_ear by 0.97 but every_char by 0.004 only (significant, sub-point)
  const lzh = win({ no_ear: { delta: 0.97, lo: 0.96, hi: 0.98 }, every_char: { delta: 0.004, lo: 0.002, hi: 0.007 } });
  const v = decide({ needs: true, active: true, licence: licenceOk, diffs: lzh });
  assert.equal(v.pass, false);
  assert.ok(v.failed.includes("min_effect_vs_strongest_control"), JSON.stringify(v));
  // lo <= 0 against affix_only (the kor finding): fails by name even when the point estimate is positive
  const kor = win({ affix_only: { delta: 0.02, lo: -0.01, hi: 0.05 } });
  const k = decide({ needs: true, active: true, licence: licenceOk, diffs: kor });
  assert.equal(k.pass, false);
  assert.ok(k.failed.includes("affix_only"), JSON.stringify(k));
  // and a negative delta against affix_only (naive stripping beats the ear) fails, loudly
  const worse = decide({ needs: true, active: true, licence: licenceOk, diffs: win({ affix_only: { delta: -0.3, lo: -0.4, hi: -0.2 } }) });
  assert.equal(worse.pass, false);
  assert.ok(worse.failed.includes("affix_only") && worse.failed.includes("min_effect_vs_strongest_control"));
  // the strongest control is named by nonTrivial: with every_char excluded from the reference the sub-point gain over it no longer trips the effect floor (lo > 0 still required)
  const ref = decide({ needs: true, active: true, licence: licenceOk, diffs: lzh, nonTrivial: ["scrambled_lexicon", "random_inside_run"] });
  assert.equal(ref.pass, true);
});

test("v2 rule: a failed LICENCE fails a needs+active stem; it is not read when the ear is not needed", () => {
  const bad = { ok: false, failed: ["dose_response_monotone"] };
  const v = decide({ needs: true, active: true, licence: bad, diffs: win() });
  assert.equal(v.pass, false);
  assert.equal(v.rule, "licence_failed");
  assert.deepEqual(v.failed, ["dose_response_monotone"]);
  assert.equal(decide({ needs: false, active: true, licence: bad, diffs: { no_ear: { delta: 0, lo: -0.01, hi: 0.01 } } }).pass, true);
  assert.equal(decide({ needs: true, active: true, licence: { ok: null, failed: [] }, diffs: win() }).pass, true, "an unavailable licence (null) does not by itself fail");
});

test("v2 rule 3 reads the ALL-DOMAIN harm interval when given", () => {
  const siteWin = { no_ear: { delta: 0.5, lo: 0.4, hi: 0.6 } };
  assert.equal(decide({ needs: false, active: true, diffs: siteWin, harm: { delta: -0.05, lo: -0.06, hi: -0.04 } }).pass, false, "an ear that adds false boundaries to a free-boundary text is harmed on the all-domain F1 even if its site F1 beats 0");
  assert.equal(decide({ needs: false, active: true, diffs: siteWin, harm: { delta: 0, lo: -0.01, hi: 0.01 } }).pass, true);
});

test("licenceOf: strictly monotone dose-response, shift and wrong-affix lower bounds; an inert ear has nothing to license", () => {
  const f1 = { real: 0.9, dose_10: 0.3, dose_50: 0.7 };
  const d = { shifted_one: { delta: 0.5, lo: 0.4, hi: 0.6 }, wrong_affixes: { delta: 0.3, lo: 0.2, hi: 0.4 } };
  const ok = licenceOf({ active: true, hasAffixes: true, f1, diffs: d });
  assert.equal(ok.ok, true);
  assert.equal(ok.checks.length, 3);
  assert.equal(licenceOf({ active: true, hasAffixes: false, f1, diffs: d }).checks.length, 2, "no affix list: no wrong_affixes check");
  const flat = licenceOf({ active: true, f1: { real: 0.9, dose_10: 0.7, dose_50: 0.7 }, diffs: d });
  assert.equal(flat.ok, false, "a lexicon that can be thrown away without moving the score is not what the score depends on");
  assert.ok(flat.failed.includes("dose_response_monotone"));
  const inverted = licenceOf({ active: true, f1: { real: 0.5, dose_10: 0.6, dose_50: 0.55 }, diffs: d });
  assert.equal(inverted.ok, false, "less lexicon scoring BETTER is an inverted response");
  assert.equal(licenceOf({ active: true, f1, diffs: { ...d, shifted_one: { delta: 0.0, lo: -0.01, hi: 0.01 } } }).ok, false, "shifting the ear's boundaries by one code point must hurt");
  assert.equal(licenceOf({ active: true, hasAffixes: true, f1, diffs: { shifted_one: d.shifted_one } }).ok, false, "a missing wrong_affixes interval is a failed check, not a pass");
  const inert = licenceOf({ active: false, f1, diffs: d });
  assert.equal(inert.applicable, false);
  assert.equal(inert.ok, null);
});

test("descriptive: the need share has an interval, apostrophe-edge boundaries and the tokeniser's own cuts are counted", () => {
  // constant share 3/10 per sentence -> every resample has share 0.3
  const per = Int32Array.from({ length: 30 }, (_, i) => [3, 0, 10][i % 3]);
  const [lo, hi] = bootstrapShare(per, 10, { B: 50, seed: 3 });
  assert.ok(Math.abs(lo - 0.3) < 1e-12 && Math.abs(hi - 0.3) < 1e-12);
  // French elision l'|homme is a gold boundary next to an apostrophe, inside a letters-run
  const fr = parseConllu(sentence("fr", "l'homme", [T(1, "l'"), T(2, "homme")]));
  const evFr = evaluateSentences(fr, { no_ear: { text: (t) => t } });
  assert.equal(evFr.gold.inside_positives, 1);
  assert.equal(evFr.gold.inside_apostrophe, 1);
  assert.equal(evFr.totals.no_ear.fn, 1, "the letters-only tokeniser keeps l'homme whole");
  // the tokeniser itself cuts a hyphenated word the gold keeps: a false boundary no ear can undo
  const hy = parseConllu(sentence("hy", "well-known idea", [T(1, "well-known"), T(2, "idea")]));
  const evHy = evaluateSentences(hy, { no_ear: { text: (t) => t } });
  assert.equal(evHy.residual.no_ear_fp_within_chunk, 2, "well|-|known cut at both hyphen edges");
  assert.equal(evHy.residual.no_ear_fp_across_space, 0);
  // a gold word that spans whitespace is a false boundary of every no-joiner arm
  const vi = parseConllu(sentence("vi", "Trả lời nói", [T(1, "Trả lời"), T(2, "nói")]));
  const evVi = evaluateSentences(vi, { no_ear: { text: (t) => t } });
  assert.equal(evVi.residual.no_ear_fp_across_space, 1);
});

test("sampling is evenly strided, deterministic and spans the split", () => {
  const items = Array.from({ length: 100 }, (_, i) => i);
  const s = strideSample(items, 10);
  assert.deepEqual(s, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  assert.equal(strideSample(items, null), items);
  assert.equal(strideSample(items, 500), items);
});

test("scrambled lexicon: a derangement per script — no character maps to itself, lengths and counts intact", () => {
  const map = scrambleMap(new Set(["北", "京", "天", "安", "门", "a", "b", "c"]));
  for (const [k, v] of map) assert.notEqual(k, v);
  assert.equal(new Set(map.values()).size, map.size, "a bijection");
  for (const c of ["北", "京", "天", "安", "门"]) assert.match(map.get(c), /\p{Script=Han}/u, "stays in its script");
  const prior = { schema: "POSPrior@1", forms: { 北京: { PROPN: 3 }, 天安门: { PROPN: 2 }, ab: { NOUN: 1 } } };
  const s = scrambleGrammar({ posPrior: prior, proclitics: ["a"], enclitics: null });
  assert.deepEqual(Object.keys(s.posPrior.forms).map((f) => [...f].length).sort(), [2, 2, 3]);
  assert.ok(!("北京" in s.posPrior.forms));
  assert.equal(s.enclitics, null);
});

test("measure never throws: a stem with no gold, or a split that is not on disk, is pass:null with an unmeasured gap", async () => {
  const none = await measure({ stem: "zzz-not-a-language", split: "dev" });
  assert.equal(none.pass, null);
  assert.equal(none.rung, "r1");
  assert.ok(none.gaps.some((g) => g.reason === "unmeasured"));
  const nosplit = await measure({ stem: "eng", split: "no-such-split" });
  assert.equal(nosplit.pass, null);
  assert.ok(nosplit.gaps.some((g) => g.reason === "unmeasured"));
  assert.equal(RUNG.id, "r1");
});

// ── v2 arms and sites, on the toy fixture ─────────────────────────────────────
test("SITES: no_ear has site F1 0 by construction, a perfect system 1; an unrepresentable MWT split is a forced miss of EVERY arm", () => {
  const ev = evaluateSentences(toy, arms({ every_char: { text: (t) => [...t].join(" ") } }), { randomOf: "perfect" });
  assert.equal(F1(ev.siteTotals.perfect), 1);
  assert.deepEqual(ev.siteTotals.no_ear, { tp: 0, fp: 0, fn: 6 }, "inside-run gold boundaries only; the punctuation edge is the input's, not a site");
  assert.equal(F1(ev.siteTotals.no_ear), 0);
  assert.ok(F1(ev.siteTotals.shifted) < 0.3, `a deranged placement scores low on the sites too (${F1(ev.siteTotals.shifted)})`);
  // every_char: every inside position flagged -> recall 1, precision = gold density at the sites
  assert.deepEqual(ev.siteTotals.every_char, { tp: 6, fp: 5, fn: 0 });
  assert.ok(Math.abs(F1(ev.siteTotals.every_char) - 12 / 17) < 1e-12);
  // the forced miss
  const es = parseConllu(sentence("es", "vamos al cine", [T(1, "vamos"), R(2, 3, "al"), T(2, "a"), T(3, "el"), T(4, "cine")]));
  const e = evaluateSentences(es, { no_ear: { text: (t) => t }, other: { text: (t) => t } });
  assert.equal(e.gold.mwt_nonconcat_splits, 1);
  assert.deepEqual(e.siteTotals.no_ear, { tp: 0, fp: 0, fn: 1 });
  assert.deepEqual(e.siteTotals.other, { tp: 0, fp: 0, fn: 1 });
  assert.deepEqual(e.perSite.no_ear, Int32Array.from([0, 0, 1]), "and in the per-sentence vector the bootstrap reads");
  assert.deepEqual(e.totals.no_ear, { tp: 2, fp: 0, fn: 0 }, "the all-domain table is v1's: the masked position inside 'al' is scored nowhere, the two real word ends are heard by the tokeniser");
});

test("random_inside is the site-level chance floor: as many boundaries as the real arm placed INSIDE-RUN, only at inside-run positions", () => {
  const ev = evaluateSentences(toy, arms(), { randomOf: "perfect" });
  const inside = (n) => ev.insideTotals[n].tp + ev.insideTotals[n].fp;
  assert.equal(inside("random_inside"), inside("perfect"));
  assert.equal(inside("perfect"), 6);
  assert.equal(ev.totals.random_inside.tp + ev.totals.random_inside.fp, inside("random_inside"), "none of its boundaries is outside the sites");
  assert.ok(F1(ev.siteTotals.random_inside) < 1 || ev.siteTotals.random_inside.fp === 0);
  assert.ok(ev.names.includes("random_boundaries") && ev.names.includes("random_inside"));
});

test("affix_only is the real ear's affixes with NO lexicon check; the real ear commits only when the remainder is attested", () => {
  const prior = { schema: "POSPrior@1", forms: { كتاب: { NOUN: 5 }, ولد: { NOUN: 5 } } };
  const only = affixOnlyHear({ proclitics: ["و"], enclitics: ["ها"] });
  assert.equal(only("وقلم"), "و قلم", "the remainder is not in any lexicon and is stripped anyway");
  assert.equal(only("كتابها"), "كتاب ها");
  assert.equal(only("وو"), "وو", "the real ear's own length floor: a 2-letter word is not split");
  assert.equal(only("ها"), "ها", "an enclitic is stripped only from a word longer than itself");
  assert.equal(only("كتاب ولد"), "كتاب و لد", "ولد is a word of the lexicon, and the lexicon-free arm splits it anyway");
  const real = makeEar({ posPrior: prior, proclitics: ["و"], enclitics: ["ها"] });
  assert.equal(real.peel("وقلم"), "وقلم", "the real ear refuses: قلم is unattested");
  assert.equal(real.peel("وكتاب"), "و كتاب", "and commits when the remainder is attested");
  assert.equal(only("وكتاب"), "و كتاب");
  const none = affixOnlyHear({});
  assert.equal(none("وكتاب"), "وكتاب", "no affix list: the identity");
});

test("armsFor builds affix_only, right_affixes_wrong_lexicon, wrong_affixes only for a stem with affixes; every stem gets every_char, shifted_one, the doses and the plumbing arm", () => {
  const prior = { schema: "POSPrior@1", forms: Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`ك${String.fromCharCode(0x0627 + (i % 20))}${String.fromCharCode(0x0627 + ((i * 3) % 26))}ب`, { NOUN: 4 }])) };
  const withAff = armsFor("zz-test", { language: "zz", posPrior: prior, proclitics: ["و", "ب"], enclitics: null });
  for (const k of ["real", "no_ear", "whitespace", "every_char", "scrambled_lexicon", "shifted_one", "dose_10", "dose_50", "plumbing_ear_disabled", "affix_only", "right_affixes_wrong_lexicon", "wrong_affixes"]) assert.ok(withAff.arms[k], `arm ${k}`);
  assert.deepEqual(withAff.roles.controls.slice(0, 4), ["no_ear", "whitespace", "every_char", "scrambled_lexicon"]);
  assert.ok(withAff.roles.controls.includes("affix_only") && withAff.roles.controls.includes("right_affixes_wrong_lexicon"));
  assert.ok(withAff.roles.licence.includes("wrong_affixes") && withAff.roles.licence.includes("shifted_one") && withAff.roles.licence.includes("dose_10") && withAff.roles.licence.includes("dose_50"));
  assert.equal(withAff.roles.plumbing, "plumbing_ear_disabled");
  assert.ok(!withAff.gaps.some((g) => g.reason === "no_affix_lists"));
  const bare = armsFor("zz-test", { language: "zz", posPrior: prior, proclitics: null, enclitics: null });
  assert.ok(!bare.arms.affix_only && !bare.arms.wrong_affixes && !bare.arms.right_affixes_wrong_lexicon);
  assert.ok(bare.gaps.some((g) => g.reason === "no_affix_lists"), "a stem without affixes says so as a typed gap");
  assert.equal(bare.arms.every_char.text("ab  cd"), "a b c d");
});

test("scrambleGrammar: lexicon-only keeps the affixes, affixes-only keeps the lexicon; both are the SAME derangement as the all-scrambled arm (a 2x2)", () => {
  const prior = { schema: "POSPrior@1", forms: { كتاب: { NOUN: 3 }, ولد: { NOUN: 2 }, قلم: { NOUN: 1 } } };
  const own = { posPrior: prior, proclitics: ["و", "ب"], enclitics: ["ها"] };
  const both = scrambleGrammar(own);
  const lex = scrambleGrammar(own, PARAMS.SCRAMBLE_SEED, { lexicon: true, affixes: false });
  const aff = scrambleGrammar(own, PARAMS.SCRAMBLE_SEED, { lexicon: false, affixes: true });
  assert.deepEqual(lex.proclitics, ["و", "ب"], "the right affixes");
  assert.deepEqual(lex.enclitics, ["ها"]);
  assert.deepEqual(Object.keys(lex.posPrior.forms), Object.keys(both.posPrior.forms), "the wrong lexicon is the all-scrambled arm's");
  assert.ok(!("كتاب" in lex.posPrior.forms));
  assert.deepEqual(aff.posPrior.forms, prior.forms, "the right lexicon");
  assert.deepEqual(aff.proclitics, both.proclitics, "the wrong affixes are the all-scrambled arm's");
  assert.deepEqual(aff.enclitics, both.enclitics);
  aff.proclitics.forEach((a, i) => assert.notEqual(a, ["و", "ب"][i], "a derangement: no affix survives"));
});

test("truncateLexicon: a seeded, NESTED random fraction of the forms (the dose of the dose-response mutation)", () => {
  const forms = Object.fromEntries(Array.from({ length: 2000 }, (_, i) => [`w${i}`, { NOUN: 1 }]));
  const prior = { schema: "POSPrior@1", forms };
  const d10 = Object.keys(truncateLexicon(prior, 0.1).forms), d50 = Object.keys(truncateLexicon(prior, 0.5).forms);
  assert.ok(d10.length > 150 && d10.length < 250, `~10%: ${d10.length}`);
  assert.ok(d50.length > 900 && d50.length < 1100, `~50%: ${d50.length}`);
  const in50 = new Set(d50);
  assert.ok(d10.every((f) => in50.has(f)), "nested: the 10% set is inside the 50% set");
  assert.deepEqual(Object.keys(truncateLexicon(prior, 0.1).forms), d10, "seeded: reproducible");
  assert.equal(Object.keys(truncateLexicon(prior, 1).forms).length, 2000);
  assert.equal(truncateLexicon(prior, 0.1).schema, "POSPrior@1");
});

test("shiftedHeard: the ear's own boundaries move one code point right; the input's own (punctuation edge, whitespace) stay", () => {
  const flagsOf = (h, N) => [...predictedFlags(h, N)].map((v, k) => (v ? k : null)).filter((k) => k !== null);
  const input = "我爱北京天安门。";                 // gold word ends at 1,2,4 inside the run and 7 at the punctuation edge
  const heard = "我 爱 北京 天安门 。";
  assert.deepEqual(flagsOf(heard, 8), [1, 2, 4, 7]);
  const shifted = shiftedHeard(heard, input);
  assert.deepEqual(flagsOf(shifted, 8), [2, 3, 5, 7]);
  assert.equal(shifted.replace(/ /g, ""), input, "only spaces differ");
  // a boundary shifted onto a position that is already a boundary vanishes; one shifted past the end vanishes
  assert.deepEqual(flagsOf(shiftedHeard("ab c d", "abcd"), 4), [3], "the ear's boundaries at 2 and 3 move to 3 and 4; the one past the end vanishes");
  assert.deepEqual(flagsOf(shiftedHeard("a b c", "abc"), 3), [2], "1 -> 2 lands on the boundary that 2 -> 3 leaves... (2 is a boundary only once; 3 is past the end)");
  // input whitespace is the input's own boundary: it does not move
  assert.deepEqual(flagsOf(shiftedHeard("ab cd", "ab cd"), 4), [2]);
  // the licence check can fail: shifting is a perturbation that lowers the perfect arm's site F1
  const ev = evaluateSentences(toy, { no_ear: { text: (t) => t }, perfect: { text: (t) => SPACED.get(t) }, shifted_one: { text: (t) => shiftedHeard(SPACED.get(t), t) } });
  assert.equal(F1(ev.siteTotals.perfect), 1);
  assert.ok(F1(ev.siteTotals.shifted_one) < 0.75, `shifted site F1 ${F1(ev.siteTotals.shifted_one)}`);
});

test("leakage: texts are compared whitespace-normalised; a stem's train files are its own and its -suffix dirs, never another stem's", () => {
  assert.equal(normText("  a \t b\n"), "a b");
  const mk = (dir, texts) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "train.conllu"), texts.map((t, i) => `# sent_id = s${i}\n# text = ${t}\n1\tx\tx\tX\t_\t_\t0\tdep\t_\t_\n`).join("\n")); };
  const tb = fs.mkdtempSync(path.join(os.tmpdir(), "r1-tb-"));
  try {
    mk(path.join(tb, "cmn"), ["猫 坐 着", "狗"]);
    mk(path.join(tb, "cmn-hans"), ["简体 句子"]);        // another STEM: not cmn's train
    mk(path.join(tb, "kor"), ["가나다"]);
    mk(path.join(tb, "kor-gsd"), ["라마 바사"]);           // a -suffix dir that is not a stem: kor's
    const cmn = trainTextsFor("cmn", { tbDir: tb });
    assert.equal(cmn.files.length, 1);
    assert.ok(cmn.texts.has("猫 坐 着") && !cmn.texts.has("简体 句子"));
    const kor = trainTextsFor("kor", { tbDir: tb });
    assert.equal(kor.files.length, 2);
    assert.ok(kor.texts.has("라마 바사") && kor.texts.has("가나다"));
    assert.equal(trainTextsFor("zzz", { tbDir: tb }).texts, null, "no train file: null, which measure() reports as a typed gap, never as clean");
    const { kept, leaked } = overlapWithTrain([{ text: "猫  坐 着" }, { text: "新 句子" }], cmn.texts);
    assert.equal(leaked.length, 1, "double space normalised");
    assert.equal(kept.length, 1);
  } finally { fs.rmSync(tb, { recursive: true, force: true }); }
});

test("a dev sentence verbatim in train is dropped before sampling and counted as a typed gap (eng dev, 67 of 2001)", { skip: !conlluPath("eng", "dev") || !trainTextsFor("eng").texts }, async () => {
  const r = await measure({ stem: "eng", split: "dev", limit: 30 });
  const gap = r.gaps.find((x) => x.reason === "dev_train_overlap");
  assert.ok(gap, "the overlap gap is reported");
  assert.equal(gap.count, 67);
  assert.equal(gap.of, 2001);
  assert.equal(r.details.leakage.overlap, 67);
  assert.equal(r.details.leakage.checked, true);
  assert.ok(r.details.sample.not_in_train <= 2001 - 67);
});

// ── the real ear on a small dev slice (skipped when the data is not on disk) ──
const devFile = conlluPath("cmn-hans", "dev");
test("smoke (cmn-hans dev, 60 sentences): the real ear beats no-ear, every_char and a scrambled lexicon on the SITES; the plumbing arm is the no-ear arm", { skip: !devFile }, () => {
  const g = grammarFor("cmn-hans");
  const { arms: a } = armsFor("cmn-hans", g);
  const sample = strideSample(readConllu(devFile).filter((s) => s.text), 60);
  const ev = evaluateSentences(sample, a, { randomOf: "real" });
  const S = (n) => F1(ev.siteTotals[n]);
  const A = (n) => F1(ev.totals[n]);
  assert.ok(ev.n >= 55, `alignment health: ${ev.n} of 60`);
  assert.equal(ev.identical.plumbing_ear_disabled, true);
  assert.deepEqual(ev.totals.plumbing_ear_disabled, ev.totals.no_ear);
  assert.deepEqual(ev.siteTotals.plumbing_ear_disabled, ev.siteTotals.no_ear);
  assert.equal(ev.identical.real, false);
  assert.ok(A("real") > A("no_ear") + 0.2, `real ${A("real")} vs no-ear ${A("no_ear")}`);
  assert.ok(S("real") > S("every_char") + 0.05, `site: real ${S("real")} vs every_char ${S("every_char")}`);
  assert.ok(S("real") > S("scrambled_lexicon") + 0.2, `site: real ${S("real")} vs scrambled ${S("scrambled_lexicon")}`);
  assert.ok(S("random_inside") < S("real"));
  assert.ok(A("random_boundaries") < A("real"));
  assert.ok(!a.affix_only, "Chinese has no affix list: its lexicon-free control is every_char");
});

test("mechanism mutations move the statistic (the licence): dose-response is strictly monotone and the shift lowers the site F1 (cmn-hans dev, 60)", { skip: !devFile }, () => {
  const g = grammarFor("cmn-hans");
  const { arms: a } = armsFor("cmn-hans", g);
  const sample = strideSample(readConllu(devFile).filter((s) => s.text), 60);
  const ev = evaluateSentences(sample, a, { randomOf: "real" });
  const S = (n) => F1(ev.siteTotals[n]);
  assert.ok(S("dose_10") < S("dose_50") && S("dose_50") < S("real"), `dose ${S("dose_10")} < ${S("dose_50")} < ${S("real")}`);
  assert.ok(S("shifted_one") < S("real") - 0.1, `shift ${S("shifted_one")} vs real ${S("real")}`);
  // and they are NOT the plumbing arm: the plumbing arm is no_ear, the mutations are somewhere in between
  assert.ok(S("dose_50") > S("no_ear"));
  const lic = licenceOf({ active: true, f1: { real: S("real"), dose_10: S("dose_10"), dose_50: S("dose_50") }, diffs: { shifted_one: { lo: S("real") - S("shifted_one") } } });
  assert.equal(lic.ok, true, JSON.stringify(lic.failed));
});

test("the deranged-lexicon donor is another language, never the stem's own family", { skip: !devFile }, () => {
  const g = grammarFor("cmn-hans");
  const d = donorFor("cmn-hans", g.posPrior);
  assert.ok(d, "a same-script donor exists for Simplified Chinese");
  assert.ok(!["cmn", "cmn-hans"].includes(d.stem));
});

test("measure() is deterministic, honours --limit by stride, and its v2 card obeys the module contract", { skip: !devFile }, async () => {
  const a = await measure({ stem: "cmn-hans", split: "dev", limit: 40 });
  const b = await measure({ stem: "cmn-hans", split: "dev", limit: 40 });
  assert.equal(a.n, 40);
  assert.equal(a.rung, "r1");
  assert.equal(a.split, "dev");
  assert.deepEqual(a.score, b.score);
  assert.deepEqual(a.controls, b.controls);
  assert.deepEqual(a.details.diffs, b.details.diffs);
  assert.ok(a.score >= 0 && a.score <= 1 && a.control >= 0 && a.control <= 1);
  assert.ok(Math.abs(a.margin - (a.score - a.control)) < 1e-12);
  assert.ok(a.pass === true || a.pass === false || a.pass === null);
  for (const k of ["no_ear", "whitespace", "every_char", "random_inside_run", "scrambled_lexicon"]) assert.equal(typeof a.controls[k], "number", k);
  assert.ok(!("affix_only" in a.controls), "no affix list, no affix control");
  assert.ok(a.gaps.some((g) => g.reason === "no_affix_lists"));
  assert.ok(Array.isArray(a.gaps) && Array.isArray(a.notes));
  assert.equal(a.details.version, "v2");
  assert.equal(a.details.plumbing.ok, true);
  assert.equal(a.details.licence.applicable, true);
  assert.deepEqual(a.details.licence.checks.map((c) => c.name), ["dose_response_monotone", "shifted_one_lowers"]);
  assert.equal(a.details.headline.strongest_control, [...Object.entries(a.controls)].filter(([k]) => !FLOOR_ARMS.includes(k)).sort((x, y) => y[1] - x[1])[0][0], "control = the strongest NON-TRIVIAL control, never no_ear");
  assert.ok(a.control >= a.controls.every_char && a.control >= a.controls.random_inside_run);
  assert.equal(a.details.leakage.checked, true);
  assert.equal(typeof a.details.all_domain.score, "number");
  assert.match(a.details.prereg_sha256, /^[0-9a-f]{64}$/);
});

const arbFile = conlluPath("arb", "dev");
test("smoke (arb dev, 40 sentences): the lexicon-free affix control and the 2x2 exist, are live, and the headline is the site F1", { skip: !arbFile }, async () => {
  const r = await measure({ stem: "arb", split: "dev", limit: 40 });
  for (const k of ["affix_only", "right_affixes_wrong_lexicon", "scrambled_lexicon", "every_char", "random_inside_run"]) assert.equal(typeof r.controls[k], "number", k);
  assert.equal(r.details.licence.checks.length, 3, "dose, shift, wrong_affixes");
  assert.ok(r.details.licence.mutations.wrong_affixes && r.details.licence.mutations.shifted_one);
  assert.equal(r.score, r.details.arms.real.f1, "score is the site F1 of the real arm");
  assert.notEqual(r.score, r.details.all_domain.score, "and not the all-domain one");
  assert.ok(r.details.arms.affix_only.f1 !== r.details.arms.no_ear.f1, "affix_only is not inert");
  assert.ok(r.details.arms.no_ear.f1 === 0 || r.details.arms.no_ear.f1 === null || r.details.inside_run.no_ear.tp === 0, "no_ear places no inside-run boundary");
  assert.ok(r.control === Math.max(...["every_char", "random_inside_run", "scrambled_lexicon", "right_affixes_wrong_lexicon", "affix_only", "deranged_lexicon"].filter((k) => k in r.controls).map((k) => r.controls[k])));
});

const vieFile = conlluPath("vie", "dev");
test("a stem with no site gold (Vietnamese: every gold word boundary is a space the input already has) gets a null score and a typed gap, never a verdict", { skip: !vieFile }, async () => {
  const r = await measure({ stem: "vie", split: "dev", limit: 50 });
  assert.equal(r.score, null);
  assert.equal(r.control, null);
  assert.equal(r.margin, null);
  assert.equal(r.pass, null);
  assert.ok(r.gaps.some((g) => g.reason === "no_site_gold"));
  assert.equal(r.details.headline.sites_gold, 0);
});
