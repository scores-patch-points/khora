// R5 (cross-language agreement on parallel text) — the INSTRUMENT is regression-guarded here, not the reader.
// A perfect system must score 1, a deranged control must score low, a control that does as well as the real
// arm must NOT pass (II.23), a non-parallel text must not pass, the permutation test must be calibrated
// (independent text rejected at ~5%, not more), and a stem or split lacking data must say so, never throw.
// AMENDMENT A1 (2026-10-06) adds what the reviewers found missing: the VERDICT must move when the READER is broken
// (raw / deranged prior / wrong-language listener / ear off / lookahead), the causal check must be able to SEE lookahead
// (a control built to fail, on every ledger, no check = no pass), and the same-genre stratified null, the cyclic shifts and
// the derangement set are clauses, not decoration.
// The synthetic fixtures need no corpus; the data-gated cases run only when the UDHR files exist. The
// parallel-classics (TEST) corpus is NEVER read here: only a seeded toy corpus goes through the TEST-shaped path.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  RUNG, TOP_K, N_PERM, N_NP, N_DER, N_DP, STRATA, ALPHA, UDHR_DIR, UDHR_CODE, K_SWEEP, SUTS, MUTANTS, WRONG_LISTENER, wrongStemFor,
  percentile, slotMean, zOf, pearson, bestMatches, makePerms, makeStratPerms, shiftPermutations, strataFor, agree,
  decide, paragraphs, headingKey, splitUdhr, splitByHeadingLines, chunkByProfile, sentencesOfUnits, readLedger, loadUnits,
  seedUnits, resetCaches, resolveWork, pivotOf, measure, measureAll,
  baseFactory, readerSpec, scramblePrior, derangedPriorFactory, earOffFactory, lookaheadFactory, lookaheadDeafFactory,
} from "../eval/competence/r5-parallel.mjs";
import { createLanguageListener } from "../the-fold/language-listener.js";
import { mulberry32, derangement } from "../eval/competence/lib.mjs";

const HAVE_UDHR = fs.existsSync(path.join(UDHR_DIR, "udhr-eng.txt")) && fs.existsSync(path.join(UDHR_DIR, "udhr-spa.txt"));

test("the rung announces itself; the declared constants are the pre-registered ones", () => {
  assert.equal(RUNG.id, "r5");
  assert.ok(RUNG.name && RUNG.question);
  assert.equal(TOP_K, 20);
  assert.equal(N_PERM, 999);
  assert.equal(N_NP, 19);
  assert.equal(1 / (N_NP + 1), ALPHA);               // 19 non-parallel readings are exactly the fewest that give p = 0.05
  assert.deepEqual([...K_SWEEP], [10, 20, 40]);
  // A1: the same "fewest draws that give p = 0.05" for the derangements and the deranged-prior readings; 8 fine strata
  assert.equal(N_DER, 19);
  assert.equal(N_DP, 19);
  assert.equal(1 / (N_DER + 1), ALPHA);
  assert.equal(STRATA, 8);
  assert.deepEqual([...MUTANTS], ["raw", "deranged_prior", "wrong_language", "ear_off", "lookahead", "lookahead_deaf"]);
  assert.ok(SUTS.includes("production") && !MUTANTS.includes("production"));
});

// ── arithmetic ──────────────────────────────────────────────────────────────
test("pearson: perfect 1, anti -1, a constant vector is 0 (undefined is never rewarded), mismatched length 0", () => {
  assert.ok(Math.abs(pearson([1, 0, 1, 0, 0, 1], [1, 0, 1, 0, 0, 1]) - 1) < 1e-12);
  assert.ok(Math.abs(pearson([1, 0, 1, 0], [0, 1, 0, 1]) + 1) < 1e-12);
  assert.equal(pearson([1, 1, 1, 1], [1, 0, 1, 0]), 0);
  assert.equal(pearson([1, 0, 1, 0], [0, 0, 0, 0]), 0);
  assert.equal(pearson([1, 0], [1, 0, 1]), 0);
  assert.deepEqual([...zOf([1, 1, 1])], [0, 0, 0]);
});

test("percentile is the ceil(q*n)-th order statistic, never interpolated", () => {
  const xs = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(percentile(xs, 0.95), 95);
  assert.equal(percentile([3, 1, 2], 0.5), 2);
  assert.equal(percentile([], 0.5), null);
});

test("A1.1 slotMean: a reader arm is compared over K slots and an unfilled slot is 0 — one lucky being cannot beat twenty (the cmn-hans ear-off artifact)", () => {
  assert.equal(slotMean([1], 20), 1 / 20);          // a head of ONE perfect being is worth 1/20, not 1.0
  assert.equal(slotMean([1, 1], 2), 1);
  assert.equal(slotMean([], 20), 0);
  assert.equal(slotMean([0.5, 0.5, 0.5, 0.5], 2), 0.5);      // only the first K beings count
  assert.equal(slotMean([1, 1, 1], 0), 0);
  const full = Array.from({ length: 20 }, () => 0.8);
  assert.ok(slotMean(full, 20) > slotMean([1], 20), "a full head of 0.8 beats a single perfect being");
});

test("permutations: uniform shuffles are permutations; stratified ones never leave their length stratum; seeded = reproducible", () => {
  const perms = makePerms(10, 50, 7);
  for (const p of perms) assert.deepEqual([...p].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(makePerms(10, 5, 7), makePerms(10, 5, 7));
  assert.notDeepEqual(makePerms(10, 5, 7), makePerms(10, 5, 8));
  const key = [9, 1, 8, 2, 7, 3, 6, 4, 5, 0, 10, 11];
  const strata = 3;
  const order = key.map((k, i) => [k, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const groupOf = new Map();
  order.forEach((u, r) => groupOf.set(u, Math.floor((r * strata) / key.length)));
  for (const p of makeStratPerms(12, key, 40, 3, strata)) {
    assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i));
    p.forEach((to, u) => assert.equal(groupOf.get(to), groupOf.get(u)));
  }
  const d = derangement(12, mulberry32(1));
  d.forEach((to, i) => assert.notEqual(to, i));      // the deranged arm: no unit keeps its place
});

test("A1-H / A1-S: the cyclic shifts are ALL U-1 non-trivial ones; the strata are 8 where each can hold >= 3 units", () => {
  const sh = shiftPermutations(31);
  assert.equal(sh.length, 30);
  assert.equal(new Set(sh.map((p) => p.join())).size, 30);
  for (const p of sh) {
    assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: 31 }, (_, i) => i));
    assert.ok(p.every((to, u) => to !== u), "a non-trivial shift moves every unit");
    assert.ok(p.every((to, u) => to === (u + (p[0] - 0)) % 31), "a shift is cyclic");
  }
  assert.deepEqual(shiftPermutations(1), []);
  assert.equal(strataFor(31), 8);
  assert.equal(strataFor(36), 8);
  assert.equal(strataFor(12), 4);                    // alice: 12 chapters -> 4 strata of 3, never singletons
  assert.equal(strataFor(2), 1);
});

// ── the pure agreement core on synthetic presence vectors ───────────────────
const U = 20;
const randomConcepts = (n, seed, density = 0.35) => {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => { const v = Array.from({ length: U }, () => (rng() < density ? 1 : 0)); v[Math.floor(rng() * U)] = 1; v[(Math.floor(rng() * U) + 3) % U] = 0; return v; });
};
const Z = (vs) => vs.map(zOf);
const perms199 = makePerms(U, 199, 11);
const derOf = (seed) => derangement(U, mulberry32(seed));
const lenKey = Array.from({ length: U }, (_, i) => (i * 7) % 13);

const GOOD_RULE = (over = {}) => ({
  m: 0.8, p: 0.001, nullMean: 0.45, nullSd: 0.04, tauM: 0.52, mDer: 0.46, npMs: Array.from({ length: N_NP }, (_, i) => 0.5 + i * 0.001), causalOk: true,
  stratP: 0.001, stratTauM: 0.55, shiftMax: 0.5,
  readerControls: [
    { id: "raw_target", family: "raw", m: 0.6, licensed: true },
    { id: "raw_both", family: "raw", m: 0.7, licensed: true },
    { id: "deranged_prior", family: "deranged_prior", m: 0.65, licensed: true },
    { id: "wrong_language", family: "wrong_language", m: 0.55, licensed: true },
    { id: "ear_off", family: "ear_off", m: 0.9, licensed: false },          // inert ear: reported, never gating
  ],
  ...over,
});

test("a PERFECT system (same concepts, same units) scores 1, rejects every null, and its deranged/shifted twins score low", () => {
  const concepts = randomConcepts(14, 5);
  const T = Z(concepts), P = Z(concepts);
  const ders = [2, 3, 4, 5, 6].map(derOf);
  const a = agree({ T, P, K: 10, perms: perms199, derPerms: ders, shiftPerms: shiftPermutations(U), stratPerms: makeStratPerms(U, lenKey, 199, 3, strataFor(U)), Ks: [5] });
  assert.ok(Math.abs(a.m - 1) < 1e-9, `m ${a.m}`);
  assert.equal(a.share, 1);
  assert.ok(a.p <= 1 / 200 + 1e-12, `p ${a.p}`);
  assert.ok(a.nullMean < 0.75, `null mean ${a.nullMean}`);
  assert.equal(a.nDer, 5);
  assert.ok(a.mDer < 0.9 && a.mDer < a.m, `deranged max ${a.mDer}`);          // A1-D: the MAX over several derangements
  assert.ok(a.mDerMean <= a.mDer);
  assert.equal(a.nShift, U - 1);
  assert.ok(a.shiftMax < a.m, `shift max ${a.shiftMax}`);                       // A1-H
  assert.ok(a.strat.p <= 1 / 200 + 1e-12 && a.strat.n === 199, `strat p ${a.strat.p}`);   // A1-S
  assert.equal(a.sweep[5].m, 1);
  const D = decide(GOOD_RULE({ m: a.m, p: a.p, nullMean: a.nullMean, nullSd: a.nullSd, tauM: a.tauM, mDer: a.mDer, stratP: a.strat.p, stratTauM: a.strat.tauM, shiftMax: a.shiftMax }));
  assert.equal(D.pass, true, D.failed.join());
  assert.ok(D.score > 0.99);
  assert.ok(D.margin > 0);
  assert.ok(Math.abs(D.control - Math.max(a.tauM, 0.518, a.mDer, a.strat.tauM, a.shiftMax, 0.7)) < 1e-12);
});

test("agree() without the A1 arms behaves as before (a single derPerm is a one-element derPerms; the extra arms are null)", () => {
  const concepts = randomConcepts(14, 5);
  const a = agree({ T: Z(concepts), P: Z(concepts), K: 10, perms: perms199, derPerm: derOf(2) });
  assert.equal(a.nDer, 1);
  assert.equal(a.shiftMax, null);
  assert.equal(a.strat, null);
  assert.ok(a.mDer < a.m);
});

test("a DERANGED target (units moved so none keeps its place) scores like the null and fails", () => {
  const concepts = randomConcepts(14, 5);
  const P = Z(concepts);
  const T = Z(concepts.map((v) => { const der = derOf(9); return v.map((_, u) => v[der[u]]); }));
  const a = agree({ T, P, K: 10, perms: perms199, derPerms: [4, 5, 6].map(derOf), shiftPerms: shiftPermutations(U), stratPerms: makeStratPerms(U, lenKey, 199, 3, strataFor(U)) });
  assert.ok(a.m < a.tauM + 0.1, `m ${a.m} vs null95 ${a.tauM}`);
  assert.ok(a.p > ALPHA, `p ${a.p}`);
  const D = decide(GOOD_RULE({ m: a.m, p: a.p, nullMean: a.nullMean, nullSd: a.nullSd, tauM: a.tauM, mDer: a.mDer, stratP: a.strat.p, shiftMax: a.shiftMax, npMs: Array.from({ length: N_NP }, () => 0.1) }));
  assert.equal(D.pass, false);
  assert.ok(D.failed.includes("P"));
  assert.ok(D.failed.includes("S"), "the same-genre stratified null is not rejected either");
});

test("a NON-PARALLEL pivot (independent concepts) does not reach the real arm", () => {
  const real = randomConcepts(14, 5);
  const T = Z(real);
  const m = (pivotSeed) => bestMatches(T.slice(0, 10), Z(randomConcepts(14, pivotSeed)), null).reduce((a, b) => a + b, 0) / 10;
  const mReal = bestMatches(T.slice(0, 10), Z(real), null).reduce((a, b) => a + b, 0) / 10;
  const nps = Array.from({ length: N_NP }, (_, i) => m(100 + i));
  assert.ok(Math.max(...nps) < mReal - 0.15, `np max ${Math.max(...nps)} vs real ${mReal}`);
});

test("CALIBRATION (the licence): independent text is rejected by the permutation test at about 5%, a parallel one always", () => {
  let falsePos = 0, stratFalsePos = 0;
  const R = 60;
  for (let i = 0; i < R; i++) {
    const a = agree({ T: Z(randomConcepts(10, 1000 + i)), P: Z(randomConcepts(10, 5000 + i)), K: 8, perms: perms199, stratPerms: makeStratPerms(U, lenKey, 199, 3 + i, strataFor(U)) });
    if (a.p <= ALPHA) falsePos++;
    if (a.strat.p <= ALPHA) stratFalsePos++;
  }
  assert.ok(falsePos / R <= 0.13, `false-positive rate ${falsePos}/${R}`);   // 5% expected; 0.13 is the binomial 99.9th percentile for n=60
  assert.ok(stratFalsePos / R <= 0.13, `stratified false-positive rate ${stratFalsePos}/${R}`);   // the new clause S is calibrated too
  for (let i = 0; i < 8; i++) {
    const c = randomConcepts(10, 300 + i);
    assert.ok(agree({ T: Z(c), P: Z(c), K: 8, perms: perms199 }).p <= ALPHA);
  }
});

test("decide: every clause can fail the pass, and a control that reaches the real arm is flagged as a broken instrument (II.23)", () => {
  const good = GOOD_RULE();
  const D = decide(good);
  assert.equal(D.pass, true, D.failed.join());
  assert.equal(D.score, 0.8);
  assert.equal(D.control, 0.7);                                          // the strongest of every gating control: here raw_both
  assert.ok(Math.abs(D.margin - 0.1) < 1e-12);
  assert.deepEqual(D.unevaluated, []);
  // N: one non-parallel reading reaches the real arm (and the shuffled null IS rejected): fail + warning
  const np = decide({ ...good, npMs: [...good.npMs.slice(1), 0.81] });
  assert.equal(np.pass, false);
  assert.deepEqual(np.failed, ["N"]);
  assert.match(np.broken, /not a licence/);
  assert.ok(np.margin < 0);
  // D: ANY of the deranged alignments (the max) reaches the real arm
  const dd = decide({ ...good, mDer: 0.85 });
  assert.deepEqual(dd.failed, ["D"]);
  assert.match(dd.broken, /control reaches/);
  // P: the shuffled null is not rejected
  assert.ok(decide({ ...good, p: 0.2 }).failed.includes("P"));
  // fewer than N_NP non-parallel readings cannot reach p = 0.05
  assert.ok(decide({ ...good, npMs: good.npMs.slice(0, 5) }).failed.includes("N"));
  // L: a null with no spread cannot license the statistic; a null mean at/above m neither
  assert.ok(decide({ ...good, nullSd: 0 }).failed.includes("L"));
  assert.ok(decide({ ...good, nullMean: 0.9 }).failed.includes("L"));
  // C: the reader looked ahead
  assert.deepEqual(decide({ ...good, causalOk: false }).failed, ["C"]);
  // S: the same-genre stratified null is not rejected (the War and Peace arm would not have seen it)
  assert.deepEqual(decide({ ...good, stratP: 0.2 }).failed, ["S"]);
  // H: one cyclic shift reaches the real arm
  assert.deepEqual(decide({ ...good, shiftMax: 0.8 }).failed, ["H"]);
  assert.deepEqual(decide({ ...good, shiftMax: 0.81 }).failed, ["H"]);
  // score is clamped to 0..1: a negative agreement is 0, never a pass
  const neg = decide({ ...good, m: -0.2, p: 0.9 });
  assert.equal(neg.score, 0);
  assert.equal(neg.pass, false);
});

test("A1-R decide: the reader must beat EVERY licensed reader arm; a tie is 'does as well'; an unlicensed arm does not gate; no raw arm = no pass", () => {
  const good = GOOD_RULE();
  const arm = (id, m, extra = {}) => good.readerControls.map((c) => (c.id === id ? { ...c, m, ...extra } : c));
  // raw (frequency alone) reaches the real arm: the instrument does not separate the reader from frequency
  const raw = decide({ ...good, readerControls: arm("raw_both", 0.81) });
  assert.deepEqual(raw.failed, ["R"]);
  assert.deepEqual(raw.readerFailed, ["raw_both"]);
  assert.match(raw.broken, /not a licence/);
  assert.ok(raw.margin < 0);
  // a TIE with a licensed arm is not a win (II.23: a control that does as well as the real arm)
  assert.deepEqual(decide({ ...good, readerControls: arm("wrong_language", 0.8) }).readerFailed, ["wrong_language"]);
  // each family is gating
  for (const id of ["raw_target", "deranged_prior", "wrong_language"]) assert.deepEqual(decide({ ...good, readerControls: arm(id, 0.95) }).failed, ["R"], id);
  // ear_off: licensed and above the real arm fails; unlicensed (inert ear) does not gate
  assert.deepEqual(decide({ ...good, readerControls: arm("ear_off", 0.9, { licensed: true }) }).failed, ["R"]);
  assert.equal(decide({ ...good, readerControls: arm("ear_off", 0.99, { licensed: false }) }).pass, true);
  // a licensed arm that is merely non-gating (descriptive) never fails the rule
  assert.equal(decide({ ...good, readerControls: [...good.readerControls, { id: "nominated", family: "nominated", m: 0.99, licensed: true, gating: false }] }).pass, true);
  // no raw arm licensed (the prior-free head equals the production head): the text cannot separate the reader from frequency
  const noRaw = decide({ ...good, readerControls: good.readerControls.map((c) => (c.family === "raw" ? { ...c, licensed: false } : c)) });
  assert.deepEqual(noRaw.failed, ["R"]);
  assert.ok(noRaw.unevaluated.includes("R"));
  // control (the card's `control`) is the strongest licensed arm
  assert.equal(decide({ ...good, readerControls: arm("deranged_prior", 0.78) }).control, 0.78);
});

test("A1-C decide: a MISSING check is never a pass (`causalOk === true` only); every missing A1 input fails its clause closed and is listed", () => {
  const good = GOOD_RULE();
  for (const missing of [undefined, null]) {
    const D = decide({ ...good, causalOk: missing });
    assert.equal(D.pass, false);
    assert.ok(D.failed.includes("C"));
    assert.ok(D.unevaluated.includes("C"));
  }
  const noC = { ...good }; delete noC.causalOk;
  assert.equal(decide(noC).pass, false);
  const noS = decide({ ...good, stratP: undefined });
  assert.ok(noS.failed.includes("S") && noS.unevaluated.includes("S") && noS.pass === false);
  const noH = decide({ ...good, shiftMax: null });
  assert.ok(noH.failed.includes("H") && noH.unevaluated.includes("H"));
  const noR = decide({ ...good, readerControls: null });
  assert.ok(noR.failed.includes("R") && noR.unevaluated.includes("R"));
  const bare = decide({ m: 0.9, p: 0.001, nullMean: 0.4, nullSd: 0.05, tauM: 0.5, mDer: 0.4, npMs: Array.from({ length: N_NP }, () => 0.3) });   // the pre-A1 call shape
  assert.equal(bare.pass, false, "a card computed without the A1 clauses cannot pass");
  assert.deepEqual(bare.failed.sort(), ["C", "H", "R", "S"]);
});

// ── splitting a file into the same units ────────────────────────────────────
const miniUdhr = ({ title, pre, head, bodies, preamble }) => [
  "Universal Declaration of Human Rights\nLanguage: Toy (xx)\nAdopted: 1948",
  title, pre, ...preamble, ...bodies.flatMap((b, i) => [head(i + 1), b]),
].join("\n\n      ");
test("splitUdhr: the heading FAMILY (exactly N short paragraphs sharing a first letter-word) gives N+1 units; wrong counts are a typed gap", () => {
  const bodies = ["Alpha text one.", "Beta text two.", "Gamma text three. More.", "Delta text four.", "Epsilon five."];
  const latin = miniUdhr({ title: "Toy Declaration", pre: "Preamble", head: (n) => (n === 1 ? "Article premier" : `Article ${n}`), preamble: ["Whereas the preamble says something long enough to not be a heading at all.", "Now, therefore,"], bodies });
  const r = splitUdhr(latin, { articles: 5 });
  assert.equal(r.gap, null);
  assert.equal(r.units.length, 6);
  assert.match(r.units[0], /Whereas the preamble/);
  assert.match(r.units[0], /Now, therefore/);
  assert.equal(r.units[1], "Alpha text one.");
  assert.equal(r.units[3], "Gamma text three. More.");
  assert.equal(r.info.key, "article");                   // "Article premier" has no digit and is still a member
  // Han: first character is the key; kanji numerals
  const han = miniUdhr({ title: "世界宣言", pre: "序言", head: (n) => `第${"一二三四五"[n - 1]}条`, preamble: ["鉴于对人类家庭所有成员的固有尊严及其平等的和不移的权利的承认，乃是世界自由的基础。"], bodies: ["人人生而自由。", "人人有资格。", "人人有权享有生命。", "任何人不得为奴。", "任何人不得受酷刑。"] });
  const h = splitUdhr(han, { articles: 5 });
  assert.equal(h.units.length, 6);
  assert.equal(h.info.key, "第");
  // Hangul: "제 1 조"
  const kor = miniUdhr({ title: "세계 인권 선언", pre: "전 문", head: (n) => `제 ${n} 조`, preamble: ["모든 인류 구성원의 천부의 존엄성과 동등하고 양도할 수 없는 권리를 인정하는 것이 세계의 자유의 기초이며,"], bodies });
  assert.equal(splitUdhr(kor, { articles: 5 }).units.length, 6);
  // a corrupted heading (one article lost its heading word) is a gap, NEVER a guess
  const broken = latin.replace("Article 3", "rticle 3");
  const g = splitUdhr(broken, { articles: 5 });
  assert.equal(g.units, null);
  assert.equal(g.gap, "unit_count_mismatch");
  assert.equal(g.info.largestFamily.count, 4);
  // an empty unit (two headings in a row) is a gap too
  assert.equal(splitUdhr(latin.replace("Alpha text one.\n\n      ", ""), { articles: 5 }).gap, "unit_count_mismatch");
  assert.equal(splitUdhr("no metadata here\n\nat all", { articles: 5 }).gap, "no_metadata_paragraph");
  assert.equal(headingKey("1 artikla"), "artikla");
  assert.equal(headingKey("المادة 12"), "المادة");
  assert.equal(headingKey("12 . "), null);
  assert.deepEqual(paragraphs("a\r\n\r\n  b  c \n\n\n"), ["a", "b c"]);
});

test("splitByHeadingLines (classics): chapters by heading LINES; a count that disagrees is the gap", () => {
  const txt = "front matter\nCHAPTER 1\nfirst line\nsecond\nCHAPTER 2\nthird\nCHAPTER 3\nlast";
  const r = splitByHeadingLines(txt, /^\s*CHAPTER \d+\s*$/, 3);
  assert.equal(r.units.length, 3);
  assert.equal(r.units[0], "first line\nsecond");
  assert.equal(r.units[2], "last");
  assert.equal(splitByHeadingLines(txt, /^\s*CHAPTER \d+\s*$/, 4).gap, "unit_count_mismatch");
  assert.equal(splitByHeadingLines("CHAPTER 1\nCHAPTER 2\nx", /^\s*CHAPTER \d+\s*$/, 2).gap, "unit_count_mismatch");   // empty chapter
});

test("chunkByProfile: the non-parallel text takes the English unit-LENGTH profile; sentences are never split or reused", () => {
  const sentences = Array.from({ length: 60 }, (_, i) => `word${i} aa bb cc.`);       // 4 tokens each
  const { units, next } = chunkByProfile(sentences, [8, 4, 12, 1], 0);
  assert.deepEqual(units.map((u) => u.length), [2, 1, 3, 1]);
  assert.equal(next, 7);
  const second = chunkByProfile(sentences, [8, 4, 12, 1], next);
  assert.equal(second.units[0][0], sentences[7]);                      // consecutive, disjoint windows
  assert.equal(chunkByProfile(sentences.slice(0, 3), [8, 4, 12, 1], 0).units, null);   // text exhausted: the caller types the gap
});

// ── toy corpus: named beings (unseen words) + FILLER the real priors REFUSE (function words of >= 3 letters) ──
// The filler matters for A1-R: it is what a prior-free reader admits and a deranged prior can admit, and what the real prior refuses.
// Every filler word below is settled non-nominal (SCONJ/ADP/DET/ADV/AUX/CCONJ) by the shipped eng / spa / ita priors.
const NAMES = ["Quillon", "Brasta", "Zorvik", "Mendral", "Tuvik", "Ossaph", "Larnek", "Pindaro"];
const SETS = [[0, 1, 2], [2, 3, 5], [4, 7, 9], [1, 6, 10], [0, 5, 8], [3, 8, 11], [2, 6, 9], [4, 10, 11]];
const TOY_U = 12;
const FILL = {
  eng: ["Because between through under every would never these.", "However there while about after before could should.", "Without within against during although whether also only."],
  spa: ["Porque entre desde hasta sobre cada nunca estos.", "Mientras había podría aunque después antes durante según.", "También todavía siempre cuando pero sino para como."],
  ita: ["Perché tra attraverso sotto ogni sempre questi tuttavia.", "Mentre circa dopo oggi senza dentro contro durante.", "Sebbene anche solo molto allora poi invece quindi."],
  // INERT: every word of the text is unseen in every prior and the filler words each occur ONCE (never nominated, never in a raw head either), so the reader
  // has nothing to refuse and the prior-free reader reads exactly the ledger the production reader reads. Length is there so that the non-parallel readings have beings.
  inert: (u, i) => Array.from({ length: 8 }, (_, k) => [...String((u * 12 + i) * 8 + k).padStart(4, "0")].map((d) => ["zo", "bri", "qua", "xel", "fli", "mma", "tor", "gnu", "vex", "ply"][+d]).join("")).join(" ") + ".",
};
const toyUnits = (tpl, rename = (n) => n, sets = SETS, fill = tpl.fill) => Array.from({ length: TOY_U }, (_, u) =>
  [...NAMES.map((n, i) => (sets[i].includes(u) ? [tpl(rename(n)), tpl(rename(n))].join("\n\n") : null)).filter(Boolean), ...Array.from({ length: 12 }, (_, i) => (typeof fill === "function" ? fill(u, i) : fill[i % fill.length]))].join("\n\n"));
const ENG = Object.assign((n) => `${n} is here.`, { fill: FILL.eng });
const SPA = Object.assign((n) => `${n} está aquí.`, { fill: FILL.spa });
const ITA = Object.assign((n) => `${n} è qui.`, { fill: FILL.ita });
const ENG_INERT = Object.assign((n) => `blorf blorf ${n} blorf.`, { fill: FILL.inert });   // ("N blorf." is refused by the English frame prior: the template is chosen so both readers admit the names)
const SPA_INERT = Object.assign((n) => `blorf blorf ${n} blorf.`, { fill: FILL.inert });
const listen = (stem) => { const l = createLanguageListener({ declared: stem }); return (t, si) => l.listen(t, si); };
const toyLedger = (kind, lang = "eng", tpl = ENG, extra = {}) => readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(tpl)), hearFactory: readerSpec(kind, lang).factory, mode: readerSpec(kind, lang).mode, causal: true, ...extra });

// ── reading: the cast's evidence becomes a per-unit presence vector (real listeners, toy text) ──
test("readLedger: presence = the units where the cast recorded an occurrence; a capital is never seen; the reader is causal", () => {
  const hearFactory = readerSpec("production", "eng").factory;
  const upper = readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hearFactory, causal: true });
  const lower = readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG).map((u) => u.toLowerCase())), hearFactory });
  const sigOf = (L) => JSON.stringify(L.beings.map((b) => [b.surface, [...b.presence].join("")]));
  assert.equal(sigOf(upper), sigOf(lower));                            // case-stripped input gives the same ledger (heard rule)
  const quillon = upper.beings.find((b) => b.surface === "quillon");
  assert.ok(quillon, "the recurring unseen name is admitted");
  assert.equal([...quillon.presence].join(""), "111000000000");
  assert.equal(upper.units, TOY_U);
  assert.equal(upper.causal.ok, true);
  assert.ok(upper.causal.items > 0);
  assert.equal(upper.languageUnheard, 0);
  assert.ok(!upper.beings.some((b) => ["because", "between", "would", "however"].includes(b.surface)), "the real prior REFUSES the filler");
  const raw = toyLedger("raw");
  assert.ok(raw.beings.some((b) => b.surface === "because"), "a prior-free reader admits the filler (what R is built to catch)");
});

// ── A1-C: the causal check can SEE lookahead (a control built to fail), and a missing check is never a pass ──
test("A1-C: a fresh reader built from the PREFIX ALONE exposes lookahead; the production reader passes, the mechanical lookahead mutant fails", () => {
  const ok = toyLedger("production");
  assert.equal(ok.causal.ok, true);
  const deaf = toyLedger("lookahead_deaf");
  assert.equal(deaf.causal.ok, false, "a reader that needs the TOTAL length of the text is lookahead and must be caught");
  assert.ok(deaf.causal.items >= 0);
  // the mutant's whole-text ledger is NOT the prefix ledger: the check compares the 60% snapshot with a prefix-only reader
  assert.ok(deaf.causal.k < deaf.causal.of);
  // a custom factory that consults the TOTAL in another way is caught too (the check is not tied to one mutant)
  const lateSurge = (seen) => { const h = baseFactory("eng")(seen); const N = seen.sentences.length; return (t, si) => (si >= N * 0.45 && si < N * 0.5 ? { language: null, gap: "x" } : h(t, si)); };
  assert.equal(readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hearFactory: lateSurge, causal: true }).causal.ok, false);
  // a hear that depends only on what it has been told SO FAR is fine: si-dependent but total-independent
  const sofar = (seen) => { const h = baseFactory("eng")(seen); return (t, si) => h(t, si); };
  assert.equal(readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hearFactory: sofar, causal: true }).causal.ok, true);
});

test("A1-C: a bare hear CLOSURE cannot be checked (the snapshot and the fresh cast would share it): ok is null, never true, and decide() refuses a pass on it", () => {
  const bare = readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hear: listen("eng"), causal: true });
  assert.equal(bare.causal.ok, null);
  assert.match(bare.causal.reason, /no hear factory/);
  assert.ok(bare.beings.length > 0, "the ledger itself is still read");
  assert.equal(decide(GOOD_RULE({ causalOk: bare.causal.ok })).pass, false);
  assert.throws(() => readLedger({ sentencesByUnit: [["a b."]] }), /hear/);
  // the reviewer's mutant, as a closure over the WHOLE text: the closure form passes the old check; the factory form is what is caught
  const whole = sentencesOfUnits(toyUnits(ENG)).flat();
  const wholeText = whole.join("\n");
  const asClosure = (() => { const h = baseFactory("eng")({ sentences: whole, text: wholeText }); const N = whole.length; return (t, si) => (si < N / 2 ? { language: null, gap: "x" } : h(t, si)); })();
  assert.equal(readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hear: asClosure, causal: true }).causal.ok, null);
  assert.equal(readLedger({ sentencesByUnit: sentencesOfUnits(toyUnits(ENG)), hearFactory: lookaheadDeafFactory(baseFactory("eng")), causal: true }).causal.ok, false);
});

// ── the reader factories (the arms of A1-R) ─────────────────────────────────
test("A1-R readers: raw/deranged/wrong/ear-off/lookahead are real perturbations of the reader, declared and seeded", () => {
  assert.equal(wrongStemFor("spa"), "fin");
  assert.equal(wrongStemFor("fin"), "tur");
  assert.equal(wrongStemFor("rus"), "ukr");
  assert.equal(wrongStemFor("arb"), "fas");
  for (const stem of Object.keys(UDHR_CODE)) assert.notEqual(wrongStemFor(stem), stem, stem);
  for (const [a, b] of Object.entries(WRONG_LISTENER)) assert.notEqual(a, b);
  // scramblePrior: no form keeps its vector, the multiset of vectors is unchanged, seeded, __proto__ safe
  const pos = { provenance: { tokens_read: 100 }, forms: { a: { NOUN: 5 }, b: { VERB: 3 }, c: { ADP: 2 }, d: { DET: 9 }, __proto__x: { ADV: 1 } } };
  const fp = { frames: { k1: { NOUN: 1 }, k2: { VERB: 1 }, k3: { ADP: 1 } } };
  const s1 = scramblePrior(pos, fp, 7), s2 = scramblePrior(pos, fp, 7), s3 = scramblePrior(pos, fp, 8);
  for (const n of Object.keys(pos.forms)) assert.notDeepEqual(s1.posPrior.forms[n], pos.forms[n], `${n} kept its own vector`);
  assert.deepEqual(Object.values(s1.posPrior.forms).map((v) => JSON.stringify(v)).sort(), Object.values(pos.forms).map((v) => JSON.stringify(v)).sort());
  assert.deepEqual({ ...s1.posPrior.forms }, { ...s2.posPrior.forms });
  assert.ok(Object.keys(pos.forms).some((n) => JSON.stringify(s1.posPrior.forms[n]) !== JSON.stringify(s3.posPrior.forms[n])), "another seed deranges differently");
  assert.equal(s1.stats.classChanged, 5);
  assert.equal(s1.posPrior.provenance.tokens_read, 100);
  // the factories change exactly one thing
  const seen = { sentences: [], text: "" };
  const prod = baseFactory("eng")(seen)("because the law", 0);
  assert.equal(prod.language, "eng");
  const off = earOffFactory(baseFactory("eng"))(seen)("because the law", 0);
  assert.equal(off.ear, null);
  assert.equal(off.grammar.posPrior, prod.grammar.posPrior);
  const dp = derangedPriorFactory(baseFactory("eng"), 5)(seen)("because the law", 0);
  assert.notEqual(dp.grammar.posPrior, prod.grammar.posPrior);
  assert.equal(dp.ear, prod.ear === undefined ? undefined : dp.ear);                   // the ear is the real one (a listener's frozen ear)
  assert.notDeepEqual(dp.grammar.posPrior.forms.because, prod.grammar.posPrior.forms.because);
  const dp2 = derangedPriorFactory(baseFactory("eng"), 5)(seen)("because the law", 0);
  assert.deepEqual(dp2.grammar.posPrior.forms.because, dp.grammar.posPrior.forms.because);   // seeded: the same draw twice is the same prior
  const wrong = readerSpec("wrong_language", "spa");
  assert.equal(wrong.factory(seen)("derecho", 0).language, "fin");
  assert.equal(readerSpec("production", "spa").factory(seen)("derecho", 0).language, "spa");
  assert.equal(readerSpec("raw", "eng").mode, "raw");
  assert.equal(readerSpec("nominated", "eng").mode, "nominated");
  assert.notEqual(readerSpec("deranged_prior", "eng", 1).id, readerSpec("deranged_prior", "eng", 2).id);
  assert.throws(() => readerSpec("telepathy", "eng"), /unknown reader/);
  const hapax = lookaheadFactory(baseFactory("eng"))({ sentences: ["zzz zzz zzz zzz"], text: "zzz zzz zzz zzz" })("zzz zzz", 0);
  assert.deepEqual(hapax.grammar.posPrior.forms.zzz, { NOUN: 100 });                    // a form of whole-text frequency >= 3 is forced to NOUN
});

// ── the whole pipeline on a TOY corpus through the real listeners (no real corpus is read) ──
function seedToy(corpus, { spaUnits, engUnits = toyUnits(ENG) }) {
  resetCaches();
  seedUnits(corpus, corpus, "eng", engUnits);
  seedUnits(corpus, corpus, "spa", spaUnits);
}
test("END TO END (toy corpus, real listeners): a perfect translation scores ~1 and passes every clause; deranged units, non-parallel names and a shifted alignment do not", { timeout: 300000 }, async () => {
  seedToy("toy", { spaUnits: toyUnits(SPA) });
  const good = await measure({ stem: "spa", split: "dev", corpus: "toy" });
  assert.equal(good.rung, "r5");
  assert.equal(good.split, "dev");
  assert.equal(good.n, TOY_U);
  assert.ok(good.score >= 0.99, `score ${good.score} / ${JSON.stringify(good.gaps)} / ${good.notes}`);
  assert.equal(good.pass, true, `${good.notes.join(" | ")}`);
  assert.ok(good.control < good.score && good.margin > 0);
  assert.ok(Math.abs(good.margin - (good.score - good.control)) < 1e-3);
  for (const k of ["shuffled_null_p95", "shuffled_null_mean", "deranged_units", "nonparallel_max", "nonparallel_mean", "ablation_nominated", "ablation_rawTop",
    "stratified_null_p95", "cyclic_shift_max", "reader_raw_target", "reader_raw_both", "reader_deranged_prior", "reader_wrong_language", "reader_ear_off"]) assert.ok(k in good.controls, k);
  assert.ok(good.controls.deranged_units < good.score - 0.2);          // the deranged arm is built to fail and does
  assert.ok(good.controls.reader_raw_target < good.score - 0.1, `raw ${good.controls.reader_raw_target}`);   // frequency alone does NOT give the toy's agreement: the reader adds
  assert.ok(good.controls.reader_wrong_language < good.score - 0.1);
  assert.equal(good.details.np.count, N_NP);
  assert.deepEqual(good.details.checks, { P: true, N: true, D: true, L: true, C: true, S: true, H: true, R: true });
  assert.equal(good.details.derangements.n, N_DER);
  assert.equal(good.details.cyclicShifts.n, TOY_U - 1);
  assert.equal(good.details.stratified.strata, 4);
  assert.equal(good.details.reader_adds.over_raw_target, true);
  assert.equal(good.details.reader_adds.over_wrong_language, true);
  assert.equal(good.details.reader_adds.over_ear_off, null);           // the ear is inert on a spaced toy: unlicensed, never a "win"
  assert.ok(good.gaps.some((g) => g.reason === "control_not_licensed" && g.arm === "ear_off"));
  const dpc = good.details.readerControls.find((c) => c.id === "deranged_prior");
  assert.ok(dpc.licensed && dpc.draws === N_DP, JSON.stringify(dpc));
  assert.ok(good.details.causality.ledgersChecked > 40, `${good.details.causality.ledgersChecked} ledgers carry the causal check`);
  assert.equal(good.details.causality.ok, true);
  assert.equal(good.details.causality.licence.caught, true);
  assert.deepEqual(good.details.causality.unchecked, []);
  assert.equal(good.details.verdictLicence, null, "the verdict licence is opt-in on dev");
  assert.ok(good.details.topMatches.every((t) => t.target === t.pivot && t.corr > 0.99));   // the names match themselves: no dictionary, only the distribution
  assert.ok(good.gaps.some((g) => g.reason === "claims_unmeasured"));  // R4 is typed, not silently absent
  assert.ok(good.notes.some((n) => /PARALLEL-TEXT AGREEMENT OF THE HEARD LEDGER/.test(n)));

  // a SHIFTED alignment (the translation's units rotated by 5) is a deranged control run through the whole pipeline
  const shift = (units, k) => units.map((_, i) => units[(i + k) % units.length]);
  seedToy("toy", { spaUnits: shift(toyUnits(SPA), 5) });
  const shifted = await measure({ stem: "spa", split: "dev", corpus: "toy" });
  assert.equal(shifted.pass, false, shifted.notes.join(" | "));
  assert.ok(shifted.score < good.score - 0.2, `${shifted.score} vs ${good.score}`);

  // RENAMED concepts (no cognate, no shared string): the match is by DISTRIBUTION, so it still holds
  const other = ["Wexlor", "Yamunt", "Cadrel", "Voshin", "Haldek", "Ruvmar", "Nivaq", "Estrol"];
  seedToy("toy", { spaUnits: toyUnits(SPA, (n) => other[NAMES.indexOf(n)]) });
  const np = await measure({ stem: "spa", split: "dev", corpus: "toy" });
  assert.equal(np.pass, true, np.notes.join(" | "));
  assert.ok(np.score >= 0.99);
  // the SAME names over a different DISTRIBUTION (the units moved by a bijection) do not match: non-parallel
  const sets2 = SETS.map((s) => s.map((u) => (u * 7 + 3) % TOY_U));
  seedToy("toy", { spaUnits: toyUnits(SPA, (n) => n, sets2) });
  const moved = await measure({ stem: "spa", split: "dev", corpus: "toy" });
  assert.equal(moved.pass, false, moved.notes.join(" | "));
  assert.ok(moved.score < 0.99);
  resetCaches();
});

test("A1-F4 (the blocker): a text on which the READER adds nothing (every word unseen, nothing to refuse) cannot PASS: R fails closed", { timeout: 300000 }, async () => {
  seedToy("toy", { spaUnits: toyUnits(SPA_INERT), engUnits: toyUnits(ENG_INERT) });
  const r = await measure({ stem: "spa", split: "dev", corpus: "toy" });
  assert.equal(r.pass, false, r.notes.join(" | "));
  assert.ok(r.details.failed.includes("R"), r.details.failed.join());
  assert.ok(r.details.unevaluated.includes("R"));
  assert.ok(r.gaps.some((g) => g.reason === "control_not_licensed" && g.arm === "raw_target"));
  assert.ok(r.notes.some((n) => /does not separate the reader from frequency/.test(n)));
  assert.equal(r.details.reader_adds.over_raw_target, null);
  assert.deepEqual(r.details.failed, ["R"], "every OTHER clause holds: the agreement is real and the card still says fail, because agreement alone is not reading");
  assert.ok(r.score >= 0.85, `agreement ${r.score}`);
  resetCaches();
});

test("A1-V (the verdict licence): with the system under test replaced by each broken reader the rule FAILS it, and the card says so", { timeout: 600000 }, async () => {
  seedToy("toy", { spaUnits: toyUnits(SPA) });
  const out = await measure({ stem: "spa", split: "dev", corpus: "toy", mutants: true });
  assert.equal(out.pass, true, out.notes.join(" | "));
  const v = out.details.verdictLicence;
  assert.equal(v.run, true);
  assert.deepEqual(Object.keys(v.suts).sort(), [...MUTANTS].sort());
  assert.equal(v.ok, true);
  for (const kind of v.counted) assert.notEqual(v.suts[kind].pass, true, `${kind} passed the rule: ${JSON.stringify(v.suts[kind])}`);
  for (const kind of ["raw", "wrong_language", "lookahead_deaf"]) { assert.ok(v.counted.includes(kind), kind); assert.equal(v.suts[kind].pass, false, kind); }
  assert.ok(v.suts.raw.failed.includes("R"));
  assert.ok(v.suts.wrong_language.failed.includes("R"));
  assert.ok(v.suts.lookahead_deaf.failed.includes("C"));
  assert.ok(v.notMoving.includes("ear_off"), "an inert ear is not a perturbation: not counted");
  assert.ok(out.notes.some((n) => /verdict licence: \d+ counted mutants/.test(n)));
  // each mutant, run alone as the system under test, names itself and fails
  for (const sut of ["raw", "wrong_language", "lookahead_deaf"]) {
    const r = await measure({ stem: "spa", split: "dev", corpus: "toy", sut });
    assert.equal(r.details.sut, sut);
    assert.equal(r.pass, false, `${sut}: ${r.notes.join(" | ")}`);
    assert.ok(r.notes.some((n) => /SYSTEM UNDER TEST/.test(n)));
  }
  // a verdict that does NOT move under a broken reader is overridden to a fail (II.23): simulated by a rule that cannot see the mutant
  assert.equal(decide(GOOD_RULE({ readerControls: [] })).pass, false);
  resetCaches();
});

test("English is read against the Spanish pivot (never against itself); the English side is the one replaced by the non-parallel text", { timeout: 300000 }, async () => {
  assert.equal(pivotOf("eng"), "spa");
  assert.equal(pivotOf("eng", "classics"), "ita");
  assert.equal(pivotOf("kor"), "eng");
  seedToy("toy", { spaUnits: toyUnits(SPA) });
  const r = await measure({ stem: "eng", split: "dev", corpus: "toy" });
  assert.equal(r.details.pivot, "spa");
  assert.equal(r.details.np.replaces, "target");
  assert.ok(r.notes.some((n) => /cannot be scored against itself/.test(n)));
  assert.ok(r.score >= 0.99, `${r.score} ${r.notes}`);
  assert.equal(r.details.causality.ok, true);
  resetCaches();
});

test("the TEST-shaped path (corpus classics, per-unit cap) runs end to end on SEEDED toy units; no real classics file is read", { timeout: 300000 }, async () => {
  resetCaches();
  seedUnits("classics", "pinocchio", "eng", toyUnits(ENG));
  seedUnits("classics", "pinocchio", "ita", toyUnits(ITA));
  assert.equal(resolveWork("classics", "ita"), "pinocchio");
  assert.equal(resolveWork("classics", "eng"), "pinocchio");         // English is read against the Italian edition of the same work
  assert.equal(resolveWork("classics", "spa"), null);                // no Spanish edition in any work: a typed gap, nothing read
  const r = await measure({ stem: "ita", split: "test" });
  assert.equal(r.split, "test");
  assert.equal(r.details.corpus, "classics");
  assert.equal(r.details.work, "pinocchio");
  assert.equal(r.details.perUnitCap, 25);
  assert.equal(r.n, TOY_U);
  assert.equal(typeof r.pass, "boolean", `${JSON.stringify(r.gaps)} ${r.notes}`);
  assert.ok(r.score >= 0.99);
  assert.equal(r.details.verdictLicence?.run, true, "the verdict licence (A1-V) is REQUIRED for the TEST card: on by default on split test");
  assert.equal(r.details.verdictLicence.ok, true);
  const e = await measure({ stem: "eng", split: "test" });
  assert.equal(e.details.pivot, "ita");
  assert.equal(e.details.np.replaces, "target");
  resetCaches();
});

// ── never throws for a stem lacking data; typed gaps with the reason ────────
test("measure never throws: an unknown stem, a stem with no edition, the TEST split of a stem with no classics edition, a missing corpus, an unknown system under test", async () => {
  const none = await measure({ stem: "zzz", split: "dev" });
  assert.equal(none.pass, null);
  assert.ok(none.gaps.some((g) => g.reason === "unmeasured"));
  assert.equal(none.split, "dev");
  const blank = await measure({});
  assert.equal(blank.pass, null);
  // no UDHR edition (a prior exists; the corpus has no file): typed no_parallel_text, not "good"
  const ces = await measure({ stem: "ces", split: "dev" });
  assert.equal(ces.pass, null);
  assert.ok(ces.gaps.some((g) => g.reason === "no_parallel_text") || ces.gaps.some((g) => g.reason === "no_prior"));
  // TEST = parallel-classics; Spanish has no edition there: a typed gap that reads NOTHING of that corpus
  const t = await measure({ stem: "spa", split: "test" });
  assert.equal(t.split, "test");
  assert.equal(t.pass, null);
  assert.equal(t.details.corpus, "classics");
  assert.ok(t.gaps.some((g) => g.reason === "no_parallel_text"));
  assert.equal(resolveWork("classics", "spa"), null);
  const bad = await measure({ stem: "spa", split: "dev", corpus: "nonexistent" });
  assert.equal(bad.pass, null);
  const unknownSut = await measure({ stem: "spa", split: "dev", sut: "telepathy" });
  assert.equal(unknownSut.pass, null);
  assert.ok(unknownSut.gaps.some((g) => g.reason === "unknown_sut"));
  const all = await measureAll({ stems: ["zzz"], split: "dev" });
  assert.deepEqual(Object.keys(all.perStem), ["zzz"]);
  assert.deepEqual(all.pairs, []);
  assert.ok(Array.isArray(all.notes) && all.notes.length > 0);
  assert.ok(all.notes.some((n) => /verdict licence/.test(n)));
});

// ── data-gated: the real UDHR files ─────────────────────────────────────────
test("UDHR: every checked language splits into the SAME 31 units; the file's own defects are typed gaps, never a wrong count", { skip: !HAVE_UDHR }, () => {
  const len = (stem) => loadUnits("udhr", "udhr", stem).units?.map((u) => [...u].length);
  for (const stem of ["eng", "spa", "cmn-hans", "kor", "arb", "rus", "fra"]) {
    const r = loadUnits("udhr", "udhr", stem);
    assert.equal(r.gap, null, `${stem}: ${JSON.stringify(r.info)}`);
    assert.equal(r.units.length, 31, stem);
    assert.ok(r.units.every((u) => u.trim()), `${stem}: empty unit`);
  }
  const eng = len("eng");
  for (const stem of ["spa", "cmn-hans", "kor", "arb"]) assert.ok(pearson(len(stem), eng) > 0.9, `${stem}: unit-length profile disagrees with English`);
  assert.match(loadUnits("udhr", "udhr", "eng").units[0], /Whereas recognition of the inherent dignity/);
  assert.match(loadUnits("udhr", "udhr", "eng").units[1], /born free and equal in dignity/);
  for (const stem of Object.keys(UDHR_CODE)) {
    const r = loadUnits("udhr", "udhr", stem);
    assert.ok(r.units?.length === 31 || ["unit_count_mismatch", "no_parallel_text"].includes(r.gap), `${stem}: ${r.units?.length} ${r.gap}`);
  }
});

test("UDHR: the reviewer's lookahead mutant (forms of whole-text frequency >= 3 forced to NOUN) is caught by the factory-based causal check; the production reader is not", { skip: !HAVE_UDHR, timeout: 120000 }, () => {
  const sbu = sentencesOfUnits(loadUnits("udhr", "udhr", "eng").units);
  const prod = readLedger({ sentencesByUnit: sbu, hearFactory: baseFactory("eng"), causal: true });
  assert.equal(prod.causal.ok, true);
  const mut = readLedger({ sentencesByUnit: sbu, hearFactory: lookaheadFactory(baseFactory("eng")), causal: true });
  assert.equal(mut.causal.ok, false, "the old check (one shared hear closure) passed exactly this mutant");
  const deaf = readLedger({ sentencesByUnit: sbu, hearFactory: lookaheadDeafFactory(baseFactory("eng")), causal: true });
  assert.equal(deaf.causal.ok, false);
});

test("DEV smoke on the real UDHR (spa vs the English pivot): passes by the amended rule, every gating control is below the real arm, the card has the contract's shape, and a BROKEN reader does not pass", { skip: !HAVE_UDHR, timeout: 600000 }, async () => {
  resetCaches();
  const r = await measure({ stem: "spa", split: "dev" });
  assert.equal(r.stem, "spa");
  assert.equal(r.rung, "r5");
  assert.equal(r.split, "dev");
  assert.equal(r.n, 31);
  assert.ok(r.score > 0 && r.score <= 1);
  assert.equal(typeof r.pass, "boolean");
  assert.ok(Math.abs(r.margin - (r.score - r.control)) < 1e-3);
  assert.ok(r.controls.deranged_units < r.score && r.controls.shuffled_null_mean < r.score && r.controls.nonparallel_max < r.score);
  assert.ok(r.controls.stratified_null_p95 < r.score && r.controls.cyclic_shift_max < r.score);
  assert.ok(r.controls.reader_raw_both < r.score && r.controls.reader_raw_target < r.score && r.controls.reader_wrong_language < r.score && r.controls.reader_deranged_prior < r.score);
  assert.equal(r.details.checks.C, true);                               // the Spanish reader is causal, on every ledger
  assert.ok(r.details.causality.ledgersChecked > 40);
  assert.equal(r.details.causality.licence.caught, true);
  assert.equal(r.details.matching.startsWith("retrospective"), true);
  assert.equal(r.pass, true, r.notes.join(" | "));
  assert.deepEqual(r.details.failed, []);
  assert.ok(r.details.topMatches.some((t) => t.target === "derechos" && t.pivot === "rights"));   // the concept finds its counterpart with no dictionary
  assert.ok(r.details.np.passShuffleShare > 0.25);                      // P2: a length-matched non-parallel text often passes a shuffled null by length alone
  assert.ok(r.details.stratified && typeof r.details.stratified.p === "number" && r.details.stratified.gating === true);
  assert.equal(r.details.reader_adds.over_ear_off, null);               // the ear does not move a spaced Latin-script head
  assert.ok(r.details.readerControls.length === 5);
  const again = await measure({ stem: "spa", split: "dev" });
  assert.equal(JSON.stringify(again.controls), JSON.stringify(r.controls));   // deterministic (seeded)
  // the verdict moves under a broken reader (the reviewer's blocker): prior-free, wrong-language and lookahead readers FAIL the same rule
  for (const [sut, clause] of [["raw", "R"], ["wrong_language", "R"], ["lookahead_deaf", "C"]]) {
    const b = await measure({ stem: "spa", split: "dev", sut });
    assert.equal(b.details.sut, sut);
    assert.equal(b.pass, false, `${sut} PASSED the rule: ${b.notes.join(" | ")}`);
    assert.ok(b.details.failed.includes(clause), `${sut} should fail ${clause}, failed ${b.details.failed}`);
  }
});
