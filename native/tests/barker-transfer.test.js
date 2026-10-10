// tests/barker-transfer.test.js — regression guard for the LEARN-BETTER instrument (eval/barker/transfer.mjs, transfer-data.mjs,
// transfer-gates.mjs). It tests the INSTRUMENT on planted toys whose right answer is known by construction, never a language:
//   * a planted transfer is recovered (a kind model beats the global mean when kinds carry the target) and random kinds / shuffled labels do not;
//   * the gain rule's five components each fail when they should, on constructed cases;
//   * the power card can both pass and fail (a large planted effect passes (a)-(d), the null does not, the effect ladder is monotone);
//   * the typed-gate machinery reads a gate that cannot matter as INERT and recovers a planted kind-dependent tau*;
//   * reachability, Holm, nested means and the exact tests agree with organs/barker.js where that organ exists;
//   * static source rules: zero model, EO-free inputs, DEV only, fallbackNomination excluded, no description-length penalty.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as T from "../eval/barker/transfer.mjs";
import * as D from "../eval/barker/transfer-data.mjs";
import * as G from "../eval/barker/transfer-gates.mjs";
import { frameDistribution } from "../adapters/text/heard-nominals.js";
import { wordFloor } from "../adapters/text/script-floor.js";
import { KEY_ALPHA } from "../adapters/text/keyness.js";
import { createSeededRng } from "../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..");

// ── a toy layout: 8 lineages (two of them with two branches), 3 systems each ────────────────────────────────────────
function toyDataset(n = 24) {
  const ids = [], lineage = [], branch = [];
  for (let i = 0; i < n; i++) { const l = i % 8; ids.push(`s${String(i).padStart(2, "0")}`); lineage.push(`L${l}`); branch.push(l < 2 ? `L${l}${i % 16 < 8 ? "a" : "b"}` : `L${l}`); }
  return T.makeDataset({ ids, lineage, branch, macro: lineage.map((l) => (l === "L0" ? "IE" : "nonIE")), script: ids.map(() => "Latin"), features: ["x"], value: new Float64Array(n), resamp: new Float64Array(n * 10) });
}
const rngOf = (tag) => createSeededRng({ seed: T.SEED, tag });

// ═══ statistics ═══════════════════════════════════════════════════════════════════════════════════════════════════
test("reachability: the sign test cannot reach alpha below five defined lineages; the passing counts are the registered ones", () => {
  const want = { 5: 5, 6: 6, 7: 7, 8: 7, 9: 8, 10: 9, 11: 9, 12: 10 };
  for (const [n, k] of Object.entries(want)) assert.equal(T.reachability(Number(n)).kNeeded, k, `n_l = ${n}`);
  for (const n of [1, 2, 3, 4]) assert.equal(T.reachability(n).unreachable, true, `n_l = ${n}`);
  assert.ok(Math.abs(T.reachability(9).p - 0.01953125) < 1e-12);
});
test("signTestP is the exact binomial tail; holm is step-down; signFlipP is exact", () => {
  assert.ok(Math.abs(T.signTestP(8, 9) - 10 / 512) < 1e-12);
  assert.equal(T.signTestP(0, 9), 1);
  assert.deepEqual(T.holm([0.001, 0.2, 0.011], 0.05), [true, false, true]);
  assert.deepEqual(T.holm([0.03, 0.04], 0.05), [false, false]); // 0.03 > 0.05/2: the step-down stops at once
  assert.ok(Math.abs(T.signFlipP([1, 1, 1, 1, 1]) - 1 / 32) < 1e-12);
  assert.equal(T.signFlipP([1, -1, 1, -1]), 11 / 16);
});
test("nestedMean: a lineage is one vote and a branch is one vote inside it", () => {
  const vals = { a: 1, b: 3, c: 10, d: 20 }, branchOf = { a: "B1", b: "B1", c: "B2", d: "B3" }, lineageOf = { a: "L1", b: "L1", c: "L1", d: "L2" };
  const nm = T.nestedMean(vals, branchOf, lineageOf);
  assert.equal(nm.perBranch.get("B1"), 2);
  assert.equal(nm.perLineage.get("L1"), (2 + 10) / 2);
  assert.equal(nm.mean, (6 + 20) / 2);
});
test("clusterBootstrap: interval brackets the mean; constant input has a degenerate interval", () => {
  const b = T.clusterBootstrap([1, 2, 3, 4, 5, 6, 7, 8, 9], { B: 500 });
  assert.ok(b.ci95[0] < 5 && b.ci95[1] > 5);
  const c = T.clusterBootstrap([2, 2, 2, 2], { B: 100 });
  assert.deepEqual(c.ci95, [2, 2]);
});
test("local statistics agree with organs/barker.js where the organ exists (the contract is shared)", async () => {
  let organ = null;
  try { organ = await import("../organs/barker.js"); } catch { /* the organ is built concurrently */ }
  if (!organ) return;
  for (const [k, n] of [[8, 9], [5, 5], [3, 12], [0, 6]]) assert.ok(Math.abs(organ.signTestP(k, n) - T.signTestP(k, n)) < 1e-12);
  for (const n of [4, 5, 6, 7, 8, 9]) { const a = organ.reachability(n), b = T.reachability(n); assert.equal(Boolean(a.unreachable), Boolean(b.unreachable)); if (!a.unreachable) assert.equal(a.kNeeded, b.kNeeded); }
  const ps = [0.001, 0.2, 0.011, 0.04];
  assert.deepEqual(organ.holm(ps, 0.05), T.holm(ps, 0.05));
});

// ═══ folds and the dataset ═════════════════════════════════════════════════════════════════════════════════════════
test("lofoFolds: branch folds partition the systems; every Indo-European branch is its own fold; macro trains IE only", () => {
  const ds = toyDataset();
  const folds = T.lofoFolds(ds, { by: "branch" });
  const seen = folds.flatMap((f) => f.test).sort((a, b) => a - b);
  assert.deepEqual(seen, Array.from({ length: ds.n }, (_, i) => i));
  for (const f of folds) { assert.equal(f.train.length + f.test.length, ds.n); assert.ok(f.test.every((i) => !f.train.includes(i))); const b = ds.branch[f.test[0]]; assert.ok(f.test.every((i) => ds.branch[i] === b)); assert.ok(f.train.every((i) => ds.branch[i] !== b)); }
  const lin = T.lofoFolds(ds, { by: "lineage" });
  assert.equal(lin.length, ds.nLineages);
  const sys = T.lofoFolds(ds, { by: "system" });
  assert.equal(sys.length, ds.n);
  const macro = T.lofoFolds(ds, { by: "macro" })[0];
  assert.ok(macro.train.every((i) => ds.macro[i] === "IE") && macro.test.every((i) => ds.macro[i] !== "IE"));
  assert.throws(() => T.lofoFolds(ds, { by: "nonsense" }));
});

// ═══ the gain rule, case by case ═══════════════════════════════════════════════════════════════════════════════════
const lossPair = (ds, gainByLineage, base = 1) => {
  const m0 = new Float64Array(ds.n).fill(base), m3 = new Float64Array(ds.n);
  for (let i = 0; i < ds.n; i++) m3[i] = base - gainByLineage[ds.lineageIdx[i]];
  return { m0, m3 };
};
const okPower = { up: 0.9, down: 0.9, nullOk: true };
const m4Worse = (ds, D = 100, extra = 0.2) => { const a = new Float64Array(D * ds.n); for (let d = 0; d < D; d++) for (let i = 0; i < ds.n; i++) a[d * ds.n + i] = 1 + extra + 0.01 * (d % 5); return a; };
const shuffleLow = Array.from({ length: 99 }, (_, i) => -0.05 - 0.001 * i);

test("gainRule: a uniform gain above the SESOI passes (a)-(d) and reaches GAIN when the planted power holds", () => {
  const ds = toyDataset();
  const { m0, m3 } = lossPair(ds, Array(8).fill(0.3));
  const r = T.gainRule({ ds, lossM0: m0, lossM3: m3, loss4: m4Worse(ds), D: 100, shuffleGains: shuffleLow, sesoi: 0.05, power: okPower });
  assert.deepEqual(r.components, { a: true, b1: true, b2: true, c: true, d: true, e: true });
  assert.equal(r.verdict, "GAIN");
});
test("gainRule: each conjunct fails when it should", () => {
  const ds = toyDataset();
  const base = { ds, loss4: m4Worse(ds), D: 100, shuffleGains: shuffleLow, sesoi: 0.05, power: okPower };
  // (c) the gain is in only three of eight lineages: the sign gate fails
  let { m0, m3 } = lossPair(ds, [0.5, 0.5, 0.5, 0, 0, 0, 0, 0]);
  let r = T.gainRule({ ...base, lossM0: m0, lossM3: m3 });
  assert.equal(r.components.c, false); assert.notEqual(r.verdict, "GAIN");
  // (d) one lineage carries the whole gain: the jackknife fails (and so does the sign gate)
  ({ m0, m3 } = lossPair(ds, [4, 0, 0, 0, 0, 0, 0, 0]));
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3 });
  assert.equal(r.components.d, false);
  // (a) a gain below the SESOI in every lineage: the interval's lower bound does not clear it
  ({ m0, m3 } = lossPair(ds, Array(8).fill(0.01)));
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3 });
  assert.equal(r.components.a, false); assert.notEqual(r.verdict, "GAIN");
  // (b1) random kinds do as well: the M4 comparison fails
  ({ m0, m3 } = lossPair(ds, Array(8).fill(0.3)));
  const m4Same = new Float64Array(100 * ds.n); for (let d = 0; d < 100; d++) for (let i = 0; i < ds.n; i++) m4Same[d * ds.n + i] = m3[i];
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3, loss4: m4Same });
  assert.equal(r.components.b1, false);
  // (b2) shuffled-label worlds do as well: the permutation comparison fails
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3, shuffleGains: Array(99).fill(0.31) });
  assert.equal(r.components.b2, false);
  // (e) the planted power fails: UNDERPOWERED, never GAIN, whatever the data show
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3, power: { up: 0.1, down: 0.9, nullOk: true } });
  assert.equal(r.components.e, false); assert.equal(r.verdict, "UNDERPOWERED");
  r = T.gainRule({ ...base, lossM0: m0, lossM3: m3, power: null });
  assert.equal(r.components.e, null); assert.equal(r.verdict, "UNDERPOWERED");
});
test("gainRule: NO_GAIN needs the interval's UPPER bound below the SESOI and the power to say so; unreachable lineages are UNDERPOWERED", () => {
  const ds = toyDataset();
  const base = { ds, loss4: m4Worse(ds), D: 100, shuffleGains: shuffleLow, sesoi: 0.05, power: okPower };
  const { m0, m3 } = lossPair(ds, Array(8).fill(0));
  assert.equal(T.gainRule({ ...base, lossM0: m0, lossM3: m3 }).verdict, "NO_GAIN");
  assert.equal(T.gainRule({ ...base, lossM0: m0, lossM3: m3, power: { up: 0.9, down: 0.2, nullOk: true } }).verdict, "UNDERPOWERED"); // cannot resolve a negligible effect
  // fewer than five lineages define the target
  const m0b = new Float64Array(ds.n).fill(NaN), m3b = new Float64Array(ds.n).fill(NaN);
  for (let i = 0; i < ds.n; i++) if (ds.lineageIdx[i] < 4) { m0b[i] = 1; m3b[i] = 0.5; }
  const r = T.gainRule({ ...base, lossM0: m0b, lossM3: m3b });
  assert.equal(r.stats.reach.unreachable, true); assert.equal(r.verdict, "UNDERPOWERED");
});
test("Holm adjustment for exploratory sources multiplies p before the step-down", () => {
  assert.deepEqual(T.adjustTask([0.001, 0.2], { exploratoryFactor: 1 }), [true, false]);
  assert.deepEqual(T.adjustTask([0.02, 0.5], { exploratoryFactor: 3 }), [false, false]);
});

// ═══ a planted transfer is recovered; random kinds and shuffled labels are not ══════════════════════════════════════════
test("planted transfer: with detectable kinds that carry the target, a kind model beats the global mean; random kinds and shuffled labels do not", () => {
  const base = toyDataset(40);
  const { ds2, truth } = T.plantWorld(base, { kinds: 2, share: 0.4, seed: T.SEED, tag: "toy" });
  const sep = 4;
  const y = T.plantTarget(truth, sep, rngOf("y"));
  const folds = T.lofoFolds(ds2, { by: "branch" });
  const models = T.buildFoldModels(ds2, folds, { source: "linkage-nearest", m4Draws: 100, seed: T.SEED });
  const ev = T.evalModels(ds2, models, T.scalarScorer(y));
  const m0 = T.lineageMean(T.lossByLineage(ds2, ev.loss.M0star)), m3 = T.lineageMean(T.lossByLineage(ds2, ev.loss.M3));
  assert.ok(m3 < 0.7 * m0, `kinds should cut the loss (M3 ${m3.toFixed(3)} vs M0* ${m0.toFixed(3)})`);
  const m4 = []; for (let d = 0; d < ev.D; d++) m4.push(T.lineageMean(T.lossByLineage(ds2, ev.loss4.subarray(d * ds2.n, (d + 1) * ds2.n))));
  m4.sort((a, b) => a - b);
  const m4med = m4[Math.floor(m4.length / 2)];
  assert.ok(m4med > m3, "random kinds of the same size profile do worse than the planted ones");
  // random kinds keep SOME information (a random subset still contains a few true kin and the held-out system is assigned by feature similarity), so the
  // control is a hard one: the planted kinds must beat it by a wide margin, not merely lose to the global mean
  assert.ok(m0 - m4med < 0.8 * (m0 - m3), `random kinds recover ${(m0 - m4med).toFixed(3)} of the ${(m0 - m3).toFixed(3)} that the planted kinds recover`);
  // shuffled labels: the planted structure no longer predicts anything
  const gains = T.shuffledGains(ds2, models, y, "sq", { R: 40, seed: T.SEED, tag: "toyshuf" });
  const obs = m0 - m3;
  assert.ok(gains.every((g) => g < obs), "no shuffled-label world reaches the observed gain");
  assert.ok(T.mean(gains) < 0.1 * obs);
});
test("planted transfer: an oracle that knows the kinds passes (a)-(d); the same target with labels shuffled does not", () => {
  const base = toyDataset(40);
  const { ds2, truth } = T.plantWorld(base, { kinds: 2, share: 0.4, seed: T.SEED, tag: "orc" });
  const folds = T.lofoFolds(ds2, { by: "branch" });
  const models = T.buildFoldModels(ds2, folds, { source: "oracle", m4Draws: 100, seed: T.SEED, truthKinds: truth.kindOf });
  const y = T.plantTarget(truth, 6, rngOf("orc-y"));
  const one = T.scalarGainOnce(ds2, models, y, "sq");
  const sg = T.shuffledGains(ds2, models, y, "sq", { R: 99, seed: T.SEED, tag: "orc" });
  const sesoi = 0.05 * T.lineageMean(T.lossByLineage(ds2, one.ev.loss.M0star));
  const r = T.gainRule({ ds: ds2, lossM0: one.ev.loss.M0star, lossM3: one.ev.loss.M3, loss4: one.ev.loss4, D: one.ev.D, shuffleGains: sg, sesoi, power: okPower });
  assert.equal(r.conjunctAD, true, JSON.stringify(r.components));
  // shuffled
  const rng = rngOf("perm"); const ys = Float64Array.from(y); for (let i = ys.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ys[i], ys[j]] = [ys[j], ys[i]]; }
  const two = T.scalarGainOnce(ds2, models, ys, "sq");
  const sg2 = T.shuffledGains(ds2, models, ys, "sq", { R: 99, seed: T.SEED, tag: "orc2" });
  const r2 = T.gainRule({ ds: ds2, lossM0: two.ev.loss.M0star, lossM3: two.ev.loss.M3, loss4: two.ev.loss4, D: two.ev.D, shuffleGains: sg2, sesoi, power: okPower });
  assert.equal(r2.conjunctAD, false);
});

// ═══ the power card can pass and can fail ═════════════════════════════════════════════════════════════════════════
test("calibrateSeparation: the oracle's mean reduction at the calibrated separation is the planted effect (fresh noise)", () => {
  const base = toyDataset(40);
  const { ds2, truth } = T.plantWorld(base, { kinds: 2, share: 0.4, seed: T.SEED, tag: "cal" });
  const folds = T.lofoFolds(ds2, { by: "branch" });
  const d = T.calibrateSeparation(ds2, folds, truth, 0.4, { reps: 160 });
  assert.ok(d > 0.5 && d < 8, `separation ${d}`);
  // the realised reduction on fresh noise, through the public pieces
  const models = T.buildFoldModels(ds2, folds, { source: "oracle", m4Draws: 2, seed: 1, truthKinds: truth.kindOf });
  let s = 0; const reps = 120;
  const rng = rngOf("fresh");
  for (let r = 0; r < reps; r++) { const y = T.plantTarget(truth, d, rng); const ev = T.evalModels(ds2, models, T.scalarScorer(y)); s += 1 - T.lineageMean(T.lossByLineage(ds2, ev.loss.M3)) / T.lineageMean(T.lossByLineage(ds2, ev.loss.M0star)); }
  assert.ok(Math.abs(s / reps - 0.4) < 0.08, `mean realised reduction ${(s / reps).toFixed(3)} vs 0.4`);
});
test("plantedPowerTrio: the null never reaches GAIN, a large planted effect passes (a)-(d) more often than a small one, and the registered 2 s_L is called underpowered at this n", () => {
  const base = toyDataset(40);
  const r = T.plantedPowerTrio(base, { source: "oracle", reps: 8, m4Draws: 60, shuffles: 59, holmFamily: 1, ladder: [0.8], seed: T.SEED });
  assert.equal(r.nullHits, 0);
  assert.equal(r.nullOk, true);
  assert.ok(r.byEffect["ladder0.8"].rate >= r.byEffect.up.rate, "the rule is monotone in the planted effect");
  assert.ok(r.byEffect["ladder0.8"].rate > 0, "the rule CAN pass: a large planted effect reaches (a)-(d) in some replicate");
  assert.ok(r.up < 0.8, "the registered 2 s_L effect is below the rule's power at this n: the card must say UNDERPOWERED, not pass");
  assert.equal(r.mdeRelativeLoss === null || r.mdeRelativeLoss >= 0.4, true);
});
test("controls built to fail: shuffled labels never reach GAIN on the toy; a structureless inducer run is measured, not assumed", () => {
  const base = toyDataset(40);
  const { ds2, truth } = T.plantWorld(base, { kinds: 2, share: 0.4, seed: T.SEED, tag: "ctl" });
  const folds = T.lofoFolds(ds2, { by: "branch" });
  const models = T.buildFoldModels(ds2, folds, { source: "linkage-gated", m4Draws: 60, seed: T.SEED });
  const y = T.plantTarget(truth, 0, rngOf("ctl-y")); // a target with no kind structure at all
  const c = T.falseGainControl(ds2, models, y, "sq", { R: 40, seed: T.SEED, tag: "toy" });
  assert.equal(c.hits, 0); assert.equal(c.rejectedAsLeAlpha, false);
  const cal = T.inducerFalseKindRate(ds2, { reps: 6, seed: T.SEED });
  assert.equal(cal.reps, 6); assert.ok(cal.rate >= 0 && cal.rate <= 1);
});
test("plantWorld: every planted kind spans at least three lineages on the real layout; feature blocks are exact complements after binning", () => {
  const stems = ["rus", "ukr", "pol", "spa", "ita", "por", "fra", "eng", "deu", "nld", "swe", "hin", "urd", "fas", "ell", "arb", "heb", "cmn", "jpn", "kor", "tur", "fin", "est", "ind", "vie", "kat", "eus"];
  const g = stems.map((s) => D.genealogyOf(s));
  const ds = T.makeDataset({ ids: stems, lineage: g.map((x) => x.lineage), branch: g.map((x) => x.branch), macro: g.map((x) => x.macro), script: stems.map(() => "Latin"), features: ["x"], value: new Float64Array(stems.length), resamp: new Float64Array(stems.length * 10) });
  const { ds2, truth } = T.plantWorld(ds, { seed: T.SEED, tag: "real" });
  for (let k = 0; k < 2; k++) { const span = new Set(); truth.kindOf.forEach((q, i) => { if (q === k) span.add(ds2.lineageIdx[i]); }); assert.ok(span.size >= 3, `kind ${k} spans ${span.size}`); }
  const cuts = T.foldCuts(ds2, Array.from({ length: ds2.n }, (_, i) => i));
  const { cnt, D: Dm } = T.signatureVectors(ds2, cuts);
  for (let i = 0; i < ds2.n; i++) for (let j = 0; j < ds2.F; j++) assert.equal(cnt[i * Dm + 2 * j] + cnt[i * Dm + 2 * j + 1], ds2.R, "lo + hi counts of one block sum to the number of resamples");
});

// ═══ continuous comparators ═══════════════════════════════════════════════════════════════════════════════════════════
test("invertSPD inverts; ridge recovers a linear target on standardised features and loses to nothing on noise", () => {
  const A = Float64Array.from([4, 1, 0, 1, 3, 1, 0, 1, 2]);
  const inv = T.invertSPD(A, 3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += A[i * 3 + k] * inv[k * 3 + j]; assert.ok(Math.abs(s - (i === j ? 1 : 0)) < 1e-9); }
  const n = 40, F = 6, rng = rngOf("ridge");
  const gauss = () => { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
  const value = Float64Array.from({ length: n * F }, gauss), resamp = Float64Array.from({ length: n * F * 10 }, (_, i) => value[Math.floor(i / 10)] + 0.1 * gauss());
  const ids = Array.from({ length: n }, (_, i) => `r${i}`), lineage = ids.map((_, i) => `L${i % 8}`);
  const ds = T.makeDataset({ ids, lineage, branch: lineage, script: ids.map(() => "X"), features: Array.from({ length: F }, (_, j) => `f${j}`), value, resamp });
  const y = Float64Array.from({ length: n }, (_, i) => 2 * value[i * F] - value[i * F + 1] + 0.05 * gauss());
  const models = T.buildFoldModels(ds, T.lofoFolds(ds, { by: "branch" }), { source: "linkage-gated", m4Draws: 2, seed: 1 });
  const ev = T.evalModels(ds, models, T.scalarScorer(y));
  const ridge = T.ridgeLoss(ds, models, y);
  assert.ok(T.lineageMean(T.lossByLineage(ds, ridge.loss)) < 0.1 * T.lineageMean(T.lossByLineage(ds, ev.loss.M0star)));
});

// ═══ L3: the frame table, the backoff, the scorer ═════════════════════════════════════════════════════════════════════
test("frameDist backs off P|N, P|*, *|N, *|* exactly as the reader's frameDistribution does, and smooths to a proper distribution", () => {
  const frames = { "DET|VERB": { NOUN: 8, ADJ: 2 }, "DET|*": { NOUN: 20, PROPN: 5 }, "*|VERB": { NOUN: 3 }, "*|*": { NOUN: 10, VERB: 5, ADJ: 5 } };
  for (const [p, n, key] of [["DET", "VERB", "DET|VERB"], ["DET", "ADP", "DET|*"], ["ADP", "VERB", "*|VERB"], ["ADP", "ADP", "*|*"], ["^", "$", "*|*"]]) {
    const mine = D.frameDist(frames, p, n), theirs = frameDistribution({ frames }, p, n);
    assert.equal(mine.key, key); assert.equal(mine.key, theirs.key);
    let s = 0; for (const v of mine.dist) s += v; assert.ok(Math.abs(s - 1) < 1e-9);
    // the smoothed distribution keeps the reader's ordering of classes
    const top = D.UPOS[mine.dist.indexOf(Math.max(...mine.dist))], topTheirs = Object.entries(theirs.dist).sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(top, topTheirs);
  }
});
test("frameScorer: the cross-entropy of a donor mixture equals the hand calculation; a donor with the right table beats the wrong one", () => {
  const ds = toyDataset(8);
  const noun = D.UPOS.indexOf("NOUN"), verb = D.UPOS.indexOf("VERB");
  const counts = new Array(D.UPOS.length).fill(0); counts[noun] = 6; counts[verb] = 2;
  const summaries = ds.ids.map((_, i) => (i === 0 ? { l3: { nTok: 8, ctx: { "DET|*": counts } } } : null));
  const A = { "*|*": { NOUN: 100 }, "DET|*": { NOUN: 100 } }, B = { "*|*": { VERB: 100 }, "DET|*": { VERB: 100 } };
  const frames = [null, A, B, A, B, A, B, A];
  const sc = T.frameScorer(ds, summaries, frames);
  const a = D.smoothedCell(A["DET|*"]), b = D.smoothedCell(B["DET|*"]);
  const bitsA = -(6 * Math.log2(a[noun]) + 2 * Math.log2(a[verb])) / 8;
  assert.ok(Math.abs(sc(0, [1], null) - bitsA) < 1e-9);
  assert.ok(sc(0, [1], null) < sc(0, [2], null));
  const mixNoun = (a[noun] + b[noun]) / 2, mixVerb = (a[verb] + b[verb]) / 2;
  assert.ok(Math.abs(sc(0, [1, 2], null) - -(6 * Math.log2(mixNoun) + 2 * Math.log2(mixVerb)) / 8) < 1e-9);
  assert.ok(Number.isNaN(sc(1, [2], null)), "a system with no OOV summary is undefined, never zero");
});
test("buildFrameTable reproduces the builder's rules on a toy: hapax only, floor keeps *|*, classes by majority with count < 2 -> UNK", () => {
  const mk = (forms) => ({ tokens: forms.map(([f, u], i) => ({ id: i + 1, form: f, lemma: f, upos: u, feats: "_", head: "0", deprel: "dep" })), ranges: [] });
  const sents = [mk([["the", "DET"], ["zorp", "NOUN"], ["runs", "VERB"]]), mk([["the", "DET"], ["dog", "NOUN"], ["runs", "VERB"]]), mk([["the", "DET"], ["dog", "NOUN"], ["sleeps", "VERB"]])];
  const t = D.buildFrameTable(sents, { floor: 1 });
  assert.equal(t.hapax, 2); // zorp, sleeps are hapax
  assert.deepEqual(t.frames["*|*"], { NOUN: 1, VERB: 1 });
  assert.ok(t.frames["DET|VERB"]); // the context class of "the" is DET and of "runs" is VERB
  assert.ok(D.applyFloor(t, 5)["*|*"] && !D.applyFloor(t, 5)["DET|VERB"], "the floor drops thin cells and keeps *|*");
  const oov = D.oovTokens([mk([["the", "DET"], ["blorp", "NOUN"], ["runs", "VERB"]])], D.formTally(sents));
  assert.equal(oov.length, 1); assert.equal(oov[0].P, "DET"); assert.equal(oov[0].N, "VERB");
});
test("integrity (control built to fail): the re-implemented frame builder reproduces the received prior, and a perturbed table does not", () => {
  const stem = "eng";
  if (!fs.existsSync(D.trainPath(stem)) || !D.readFramePrior(stem)) return;
  const sys = G.loadSys(stem);
  const r = G.frameIntegrity(stem, sys.train);
  if (!r.comparable) return; // the received prior was built from another source; the transfer card reports it as source_differs
  assert.equal(r.equal, true, `${r.mismatches} mismatching cells`);
  const rec = D.readFramePrior(stem);
  const perturbed = D.buildFrameTable(sys.train.slice(0, Math.floor(sys.train.length / 2)), { floor: 5 });
  assert.notEqual(JSON.stringify(perturbed.frames), JSON.stringify(rec.frames), "dropping half the sentences must change the table: the check can fail");
});

// ═══ L2: typed gates ═════════════════════════════════════════════════════════════════════════════════════════════════
test("G-floor uses the repo's own wordFloor: dense scripts cap the base at 2, abjads at 3; the grid is typed x 2^k", () => {
  assert.equal(wordFloor("北京", 3), 2); assert.equal(wordFloor("שלום", 3), 3); assert.equal(wordFloor("abc", 3), 3); assert.equal(wordFloor("abc", 6), 6);
  assert.deepEqual(G.GATE_FLOOR.grid, [0.75, 1.5, 3, 6, 12, 24, 48]);
  assert.deepEqual(G.GATE_FRAME.grid, [1.25, 2.5, 5, 10, 20, 40, 80]);
  assert.deepEqual(G.GATE_VOLUME.grid, [5, 10, 20, 40, 80, 160, 320]);
  assert.equal(G.GRID_K[G.K_TYPED], 0);
});
test("G-floor F1 equals the hand calculation on a toy dev file; tau* breaks ties toward the typed value", () => {
  const mk = (forms) => ({ tokens: forms.map(([f, u], i) => ({ id: i + 1, form: f, lemma: f, upos: u, feats: "_", head: "0", deprel: "dep" })), ranges: [] });
  const dev = [mk([["the", "DET"], ["Anna", "PROPN"], ["of", "ADP"], ["Bo", "PROPN"], ["walked", "VERB"]])];
  const prep = G.GATE_FLOOR.prepare({ dev });
  // tau = 3: pass = length >= 3 -> Anna (PROPN, tp), the (3, fp), walked (fp); Bo (len 2) is a miss (fn); of fails
  const st3 = G.GATE_FLOOR.stats(prep, 3);
  const f1 = G.GATE_FLOOR.y(Float64Array.from([st3[0], st3[1], st3[2]]));
  assert.equal(f1, (2 * 1) / (2 * 1 + 2 + 1));
  // a flat Y reads flat and tau* is the typed index
  const flatY = [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  assert.equal(G.argBest(G.GATE_FLOOR, flatY), G.K_TYPED);
  assert.equal(G.argBest(G.GATE_FRAME, [2.2, 2.1, 2.3, 2.3, 2.1, 2.5, 2.6]), 1, "the nearer-to-typed of two equal minima wins");
  assert.equal(G.argBest(G.GATE_FRAME, [2.2, 2.3, 2.1, 2.3, 2.1, 2.5, 2.6]), 2, "the typed value wins a tie with itself");
});
test("flatness (control built to fail): a gate whose outcome cannot move with tau reads INERT; a gate with a real optimum does not", () => {
  const nSent = 40, w = 3;
  const mkTab = (fn) => ({ Y: [0, 1, 2, 3, 4, 5, 6].map((k) => 0), stats: [0, 1, 2, 3, 4, 5, 6].map((k) => { const a = new Float64Array(nSent * w); for (let s = 0; s < nSent; s++) { const [tp, fp, fn2] = fn(k, s); a[s * w] = tp; a[s * w + 1] = fp; a[s * w + 2] = fn2; } return a; }) });
  const constant = mkTab(() => [3, 1, 1]);
  constant.Y = constant.stats.map((st) => G.GATE_FLOOR.y(st.reduce((acc, v, i) => { acc[i % w] += v; return acc; }, new Float64Array(w))));
  const f1 = G.flatness(G.GATE_FLOOR, constant);
  assert.equal(f1.flat, true);
  const peaked = mkTab((k, s) => (k === 4 ? [8, 1, 0] : [2, 4, 5]));
  peaked.Y = peaked.stats.map((st) => G.GATE_FLOOR.y(st.reduce((acc, v, i) => { acc[i % w] += v; return acc; }, new Float64Array(w))));
  const f2 = G.flatness(G.GATE_FLOOR, peaked);
  assert.equal(f2.kStar, 4); assert.equal(f2.flat, false);
});
test("planted tau*: a threshold that depends on a kind is recovered by the kind-mate route and not by the typed or the global route", () => {
  const base = toyDataset(40);
  const { ds2, truth } = T.plantWorld(base, { kinds: 2, share: 0.4, seed: T.SEED, tag: "tau" });
  const rng = rngOf("tau");
  const kStar = Float64Array.from({ length: ds2.n }, (_, i) => (truth.kindOf[i] === 0 ? 0 : truth.kindOf[i] === 1 ? 4 : 2) + (rng() < 0.15 ? 1 : 0));
  const scorer = (h, idx, w = null) => { const vals = idx.map((i) => kStar[i]).filter(Number.isFinite).sort((a, b) => a - b); if (!vals.length) return NaN; const k = Math.round(vals[Math.floor(vals.length / 2)]); return 0.02 * Math.abs(kStar[h] - k); };
  const models = T.buildFoldModels(ds2, T.lofoFolds(ds2, { by: "branch" }), { source: "oracle", m4Draws: 50, seed: 1, truthKinds: truth.kindOf });
  const ev = T.evalModels(ds2, models, scorer);
  const t0 = new Float64Array(ds2.n); for (let i = 0; i < ds2.n; i++) t0[i] = 0.02 * Math.abs(kStar[i] - G.K_TYPED);
  const m3 = T.lineageMean(T.lossByLineage(ds2, ev.loss.M3)), m0 = T.lineageMean(T.lossByLineage(ds2, ev.loss.M0)), typed = T.lineageMean(T.lossByLineage(ds2, t0));
  assert.ok(m3 < 0.5 * Math.min(m0, typed), `kind-mate route ${m3.toFixed(4)} vs global ${m0.toFixed(4)} vs typed ${typed.toFixed(4)}`);
});

// ═══ static source rules ═══════════════════════════════════════════════════════════════════════════════════════════════
const SRC = ["transfer.mjs", "transfer-data.mjs", "transfer-gates.mjs"].map((f) => [f, fs.readFileSync(path.join(NATIVE, "eval", "barker", f), "utf8")]);
const code = (txt) => txt.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
test("source rules: zero model, no network, EO-free inputs", () => {
  for (const [f, txt] of SRC) {
    assert.ok(!/model-server|mouth\.js|node:https?|\bfetch\(|anthropic|openai|embedding/i.test(code(txt)), `${f}: a model or network reference`);
    assert.ok(!/cube\.js|phasepost|relation-kinds|act-prior|case-priors|hyperlexicon|byFace|CELL_OF_GRAMMAR/.test(code(txt)), `${f}: an EO-shaped input`);
  }
});
test("source rules: DEV only — no file names the other split, and devPath refuses it", () => {
  for (const [f, txt] of SRC) assert.ok(!/test\.conllu|[\"'`]test[\"'`]\s*[,)]/.test(code(txt).replace(/by:\s*["']test["']/g, "")), `${f} names the held-out test split`);
  assert.throws(() => D.devPath("eng", "test"));
  assert.ok(D.devPath("eng").endsWith("/eng/dev.conllu"));
  assert.ok(D.trainPath("kor").endsWith("/kor-gsd/train.conllu"), "kor pairs with the treebank its priors were built from");
});
test("source rules: fallbackNomination is only ever excluded; no description-length penalty; no MDE-as-threshold", () => {
  const all = SRC.map(([, t]) => code(t)).join("\n");
  for (const line of all.split("\n")) if (/fallbackNomination/.test(line)) assert.ok(/continue/.test(line), `fallbackNomination read: ${line.trim()}`);
  assert.ok(!/\bBIC\b|\bdl\(|delta\s*=\s*MDE/.test(all));
});
test("source rules: the genealogy answer keys are never read by a feature builder; ALPHA is the repo's KEY_ALPHA", () => {
  const txt = fs.readFileSync(path.join(NATIVE, "eval", "barker", "transfer-data.mjs"), "utf8");
  const a = txt.indexOf("export function liteFeatures"), b = txt.indexOf("export const LITE_DIRECTION");
  assert.ok(a > 0 && b > a);
  assert.ok(!/GENEALOGY|genealogyOf|lineage|branch/.test(txt.slice(a, b).replace(/\/\/.*$/gm, "")), "liteFeatures must not read genealogy");
  assert.equal(T.ALPHA, KEY_ALPHA); assert.equal(T.SEED, 20261005);
});
test("pre-registration: the header is first, names the rule, the controls, the power card and the predictions; the digest is stable", () => {
  const txt = fs.readFileSync(path.join(NATIVE, "eval", "barker", "transfer.mjs"), "utf8");
  assert.ok(txt.startsWith("// ═══ PRE-REGISTRATION"));
  const header = txt.split("\n").filter((l, i, arr) => arr.slice(0, i + 1).every((x) => x.startsWith("//") || !x.trim())).join("\n");
  for (const w of ["THE GAIN RULE", "CONTROLS BUILT TO FAIL", "POWER CHECKS", "RECORDED PREDICTIONS", "TYPED NUMBERS", "SPLITS"]) assert.ok(header.includes(w), `header lacks ${w}`);
  assert.match(T.registryDigest(), /^[0-9a-f]{64}$/);
  assert.equal(T.registryDigest(), T.registryDigest());
  for (const f of ["transfer-data.mjs", "transfer-gates.mjs"]) assert.ok(fs.readFileSync(path.join(NATIVE, "eval", "barker", f), "utf8").startsWith("// ═══ PRE-REGISTRATION"));
});
test("the genealogy answer keys are complete for every system on disk and Indo-European branches share one lineage", () => {
  const { stems } = D.discoverStems();
  for (const s of stems) assert.ok(D.genealogyOf(s), `no key for ${s}`);
  const ie = Object.entries(D.GENEALOGY).filter(([, g]) => g.macro === "IE");
  assert.ok(ie.every(([, g]) => g.lineage === "Indo-European"));
  assert.ok(new Set(ie.map(([, g]) => g.branch)).size >= 5);
  assert.ok(new Set(Object.values(D.GENEALOGY).map((g) => g.lineage)).size >= 9);
});
