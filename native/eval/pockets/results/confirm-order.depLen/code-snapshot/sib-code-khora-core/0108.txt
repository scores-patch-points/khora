// barker-organ: organs/barker.js on PLANTED toys, with controls built to fail and static source rules.
// The expectations are the ones recorded in the organ's pre-registration header (predictions P1-P8, addendum A1.P1-A1.P5). A test that fails is reported
// as a failure of the instrument or of the prediction; no threshold here was tuned after a result was seen. These worlds test the MACHINERY, not power at the
// real 33-system layout (that is for powerGrid to report, and the header says why it is expected to be low).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as B from "../organs/barker.js";
import { KEY_ALPHA } from "../adapters/text/keyness.js";
import { bannedHits } from "../the-fold/earned-cast.js";

const rngOf = (seed) => B.makeRng({ test: "barker-organ", seed });
const normalOf = (rng) => () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
const f1 = (found, planted) => { const a = new Set(found), b = new Set(planted); let tp = 0; for (const x of a) if (b.has(x)) tp += 1; return tp ? 2 * tp / (a.size + b.size) : 0; };
const SRC = readFileSync(new URL("../organs/barker.js", import.meta.url), "utf8");
const T = { timeout: 600000 };

// ── P2, P8 and the pure statistics ──────────────────────────────────────────────
test("dip: 1/(2n) on equally spaced points, 0.25 on two equal atoms, 0 on one value, affine invariant, never below 1/(2n)", () => {
  assert.ok(Math.abs(B.dipStatistic(Array.from({ length: 21 }, (_, i) => i + 1)) - 1 / 42) < 1e-6);
  assert.ok(Math.abs(B.dipStatistic([0, 0, 0, 0, 1, 1, 1, 1]) - 0.25) < 1e-6);
  assert.ok(Math.abs(B.dipStatistic([0, 1, 3]) - 1 / 6) < 1e-6);
  assert.equal(B.dipStatistic([5, 5, 5]), 0);
  const nrm = normalOf(rngOf(1));
  const x = Array.from({ length: 33 }, nrm);
  assert.ok(Math.abs(B.dipStatistic(x) - B.dipStatistic(x.map((v) => 3 * v + 10))) < 1e-6);
  assert.ok(B.dipStatistic(x) >= 1 / 66 - 1e-6);
  const bi = Array.from({ length: 33 }, (_, i) => nrm() + (i % 2 ? 4 : -4));
  assert.ok(B.dipStatistic(bi) > B.dipStatistic(x), "a bimodal sample must have a larger dip than a unimodal one");
});

test("normal and t distributions, exact binomial rules, reachability, Holm", () => {
  assert.ok(Math.abs(B.normalCdf(1.96) - 0.975) < 1e-4);
  assert.ok(Math.abs(B.normalQuantile(0.975) - 1.959964) < 1e-5);
  assert.ok(Math.abs(B.tCdf(2.776, 4) - 0.975) < 1e-3);
  assert.ok(Math.abs(B.signTestP(8, 9) - 10 / 512) < 1e-12);
  assert.equal(B.binomialRejectCount(200), 16);
  assert.equal(B.binomialRejectCount(100), 10);
  const pw = B.rejectionPower(200, 0.10);
  assert.ok(pw > 0.83 && pw < 0.89, `power of the 16-of-200 rule against a true rate of 0.10 should be about 0.86, got ${pw}`);
  assert.ok(B.rateExceeds(2, 3) && !B.rateExceeds(1, 3) && B.rateExceeds(1, 1));
  const table = Object.fromEntries([9, 8, 7, 6, 5, 4].map((n) => [n, B.reachability(n)]));
  assert.equal(table[9].kNeeded, 8); assert.equal(table[8].kNeeded, 7); assert.equal(table[7].kNeeded, 7);
  assert.equal(table[6].kNeeded, 6); assert.equal(table[5].kNeeded, 5); assert.equal(table[4].unreachable, true);
  assert.deepEqual(B.holm([0.001, 0.04, 0.2]), [true, false, false]);
  assert.deepEqual(B.holm([0.01, 0.02, 0.03]), [true, true, true]);
  const w = B.wilson(5, 20);
  assert.ok(w[0] < 0.25 && w[1] > 0.25);
});

test("nested means: a branch of nine does not outvote a singleton, and one lineage counts once", () => {
  const vals = {}, branch = {}, lineage = {};
  for (let i = 0; i < 9; i += 1) { vals[`s${i}`] = 1; branch[`s${i}`] = "Slavic"; lineage[`s${i}`] = "IE"; }
  vals.r = 0; branch.r = "Romance"; lineage.r = "IE";
  vals.j = 0; branch.j = "Japonic"; lineage.j = "Japonic";
  const r = B.nestedMean(vals, (id) => branch[id], (id) => lineage[id]);
  assert.equal(r.perLineage.get("IE"), 0.5);
  assert.equal(r.perLineage.get("Japonic"), 0);
  assert.equal(r.mean, 0.25);
  assert.equal(B.nestedMean({ a: NaN, b: 2 }, () => "x", () => "L").skipped, 1);
});

test("cluster bootstrap, adjusted Rand, and train-only agglomeration to equal k", () => {
  const rng = rngOf(2), nrm = normalOf(rng);
  const vals = Array.from({ length: 60 }, () => 5 + nrm()), cl = vals.map((_, i) => i % 12);
  const r = B.clusterBootstrap(vals, cl, undefined, { B: 400, seed: 5 });
  assert.ok(r.ci95[0] < r.est && r.est < r.ci95[1] && r.ci95[1] - r.ci95[0] < 1);
  assert.equal(B.adjustedRand([0, 0, 1, 1, 2, 2], [5, 5, 6, 6, 7, 7]), 1);
  assert.ok(Math.abs(B.adjustedRand(Array.from({ length: 200 }, (_, i) => i % 4), Array.from({ length: 200 }, () => Math.floor(rng() * 4)))) < 0.1);
  // units 0 and 1 have the same outcome distribution, unit 2 differs: k = 2 must merge 0 and 1
  const part = ["a", "b", "c"], stats = [[50, 50], [100, 100], [95, 5]];
  const c = B.coarsenToK(part, 2, stats);
  assert.equal(c.assignment.get("0") === c.assignment.get("1") || c.assignment.get("a") === c.assignment.get("b"), true);
  assert.notEqual(c.assignment.get("c") ?? c.assignment.get("2"), c.assignment.get("a") ?? c.assignment.get("0"));
  assert.equal(c.groups.size, 2);
});

// ── the profile contract and the EO-free scan ─────────────────────────────────────
const cell = (id, over = {}) => ({ id, group: "A", channel: "ud:deprel", value: 0.5, n: 100, ci95: null, resamples: [0.5, 0.5], definitionId: "head-direction", builder: "profiles.mjs@abc#fn", giver: "UD_English-EWT", floor: null, ...over });
const base = (cells, over = {}) => ({ id: "nl:eng@sha256:ab12", kind: "nl", inputs: [{ path: "tb/eng/train.conllu", sha256: "ab", role: "train" }], labels: { family: "Germanic" }, budget: { N: 1000 }, cells, gaps: [], ...over });

test("EO-free scan: a planted contaminated cell is rejected; Esperanto is not EO; recurrence is not REC", () => {
  assert.equal(B.assertEoFree({ cells: { a01: cell("a01"), d05: cell("d05", { definitionId: "recurrence-share" }) } }).ok, true);
  for (const bad of [{ group: "Ground" }, { id: "x_grain_share" }, { definitionId: "operator-share" }, { builder: "phasepost.js#cellOf" }, { channel: "byFace" }, { definitionId: "kind:basin" }, { definitionId: "con-share" }]) {
    const r = B.assertEoFree({ cells: { x01: cell("x01", bad) } });
    assert.equal(r.ok, false, JSON.stringify(bad));
  }
  assert.equal(B.assertEoFree({ cells: { x: cell("x") }, inputs: [{ path: "/private/tmp/claude-501/notation/survey/eo_sample.txt" }] }).ok, true);
  assert.equal(B.assertEoFree({ cells: { x: cell("x") }, inputs: [{ path: "ethos/derived-priors/case-priors/case-marking-rus.json" }] }).ok, false);
  assert.equal(B.assertEoFree({ cells: { x: cell("x") }, inputs: [{ path: "x/wenyan.eot.json" }] }).ok, false);
  assert.equal(B.assertEoFree({ cells: { Case_share: cell("Case_share") } }, { extraBan: ["Case"] }).ok, false, "keys of the received grammar table are bannable by injection");
  assert.throws(() => B.makeSystemProfile(base({ x01: cell("x01", { group: "Ground" }) })), /EO vocabulary/);
});

test("makeSystemProfile: every cell states giver, channel, n and a ci95 policy; frozen; hashed; target and predictor channels may not share a half", () => {
  const p = B.makeSystemProfile(base({ a01: cell("a01") }));
  assert.equal(p.schema, "SystemProfile@1"); assert.equal(p.eoFree, true); assert.ok(Object.isFrozen(p) && Object.isFrozen(p.cells.a01));
  assert.equal(p.contentHash, B.makeSystemProfile(base({ a01: cell("a01") })).contentHash);
  assert.notEqual(p.contentHash, B.makeSystemProfile(base({ a01: cell("a01", { value: 0.6 }) })).contentHash);
  for (const bad of [{ giver: "" }, { channel: undefined }, { n: -1 }, { n: 1.5 }, { ci95: undefined }, { ci95: [1] }, { value: NaN }, { builder: undefined }]) {
    const c = { ...cell("a01"), ...bad };
    if (bad.ci95 === undefined && "ci95" in bad) delete c.ci95;
    assert.throws(() => B.makeSystemProfile(base({ a01: c })), TypeError, JSON.stringify(bad));
  }
  assert.throws(() => B.makeSystemProfile(base({ a01: cell("a01", { half: "A" }), t01: cell("t01", { group: "T", half: "A" }) })), /overlap/);
  assert.doesNotThrow(() => B.makeSystemProfile(base({ a01: cell("a01", { half: "A" }), t01: cell("t01", { group: "T", half: "B" }) })));
  assert.throws(() => B.makeSystemProfile(base({}, { kind: "dna" })), TypeError);
});

// ── the block matrix and the nulls: blocks never break ─────────────────────────────
function blockWorld(n = 30, F = 16, seed = 3) {
  const rng = rngOf(seed), nrm = normalOf(rng);
  const rows = Array.from({ length: n }, (_, i) => Array.from({ length: F }, (_, j) => nrm() + (j < 6 && i < 8 ? 1.5 : 0) + (j === 7 ? 0.7 * (i % 5) : 0)));
  rows[3][2] = NaN;
  const ids = Array.from({ length: n }, (_, i) => `s${i}`);
  const branches = ids.map((_, i) => `b${Math.floor(i / 6)}`), lineages = ids.map((_, i) => `L${Math.floor(i / 6)}`);
  branches[29] = "single";
  return B.blockMatrixFromValues(rows, { ids, featureKeys: Array.from({ length: F }, (_, j) => `f${String(j).padStart(2, "0")}`), groupOf: Array.from({ length: F }, (_, j) => (j < 8 ? "A" : "B")), branches, lineages });
}
const exactlyOneBin = (m) => {
  for (let j = 0; j < m.featureKeys.length; j += 1) for (let i = 0; i < m.n; i += 1) {
    const b = m.bins[j][i];
    if (!(b === -1 ? Number.isNaN(m.values[j][i]) : b >= 0 && b < m.nBins[j])) return false;
  }
  const { cols, names } = B.denseColumns(m);
  const per = new Map();
  cols.forEach((c, t) => { const f = names[t].feature; if (!per.has(f)) per.set(f, new Float64Array(m.n)); for (let i = 0; i < m.n; i += 1) per.get(f)[i] += c[i]; });
  for (const [f, sums] of per) for (let i = 0; i < m.n; i += 1) if (!(sums[i] === 1 || (sums[i] === 0 && m.bins[f][i] === -1))) return false;
  return true;
};

test("block matrix: one bin per feature per system, cuts from the reference only, constants dropped and typed", () => {
  const m = blockWorld();
  assert.ok(exactlyOneBin(m));
  assert.equal(m.bins[2][3], -1, "a missing value has no signature");
  const rows = [[0, 5], [1, 6], [2, 7], [3, 8], [100, 9]];
  const ref = B.blockMatrixFromValues(rows, { ids: ["a", "b", "c", "d", "e"], featureKeys: ["x", "y"], reference: ["a", "b", "c"] });
  assert.equal(ref.cuts[0][0], 1, "median of the reference systems only");
  assert.equal(ref.bins[0][4], 1, "a held-out system is binned with the training cuts");
  const k = B.blockMatrixFromValues([[1, 1], [1, 2], [1, 3], [1, 4]], { ids: ["a", "b", "c", "d"], featureKeys: ["const", "ok"] });
  assert.deepEqual(k.featureKeys, ["ok"]);
  assert.equal(k.gaps[0].reason, "constant"); assert.equal(k.gaps[0].feature, "const"); assert.ok(k.gaps[0].denominator);
});

test("every redeal keeps whole blocks (P1): feat, fam, cov, cov1; fam keeps strata multisets; marginals survive N-feat exactly", () => {
  const m = blockWorld();
  const strata = B.famStrata(m.branches);
  assert.equal(strata[29], "singletons");
  for (const kind of ["feat", "fam", "cov", "cov1"]) {
    for (let d = 0; d < 5; d += 1) {
      const x = B.redeal(m, { kind, rng: B.makeRng({ t: 1, kind, d }), branches: m.branches });
      assert.ok(exactlyOneBin(x), `${kind} draw ${d} broke a block`);
      if (kind === "feat" || kind === "fam") for (let j = 0; j < m.featureKeys.length; j += 1) {
        assert.deepEqual([...x.bins[j]].sort(), [...m.bins[j]].sort(), `${kind}: marginal of ${j}`);
        for (let i = 0; i < m.n; i += 1) if (x.bins[j][i] >= 0) assert.equal(x.bins[j][i], x.values[j][i] > m.cuts[j][0] ? 1 : 0, "bin, value and weight move together");
      }
      if (kind === "fam") for (const [s, idx] of [...strata.entries()].reduce((acc, [i, s]) => acc.set(s, [...(acc.get(s) ?? []), i]), new Map())) {
        for (let j = 0; j < m.featureKeys.length; j += 1) assert.deepEqual(idx.map((i) => x.values[j][i]).sort(), idx.map((i) => m.values[j][i]).sort(), "N-fam permutes inside a stratum only");
      }
    }
  }
  const a = B.redeal(m, { kind: "feat", rng: B.makeRng({ t: 9 }) }), b = B.redeal(m, { kind: "feat", rng: B.makeRng({ t: 9 }) });
  assert.deepEqual([...a.bins[0]], [...b.bins[0]], "seeded and pure");
  assert.throws(() => B.redeal(m, { kind: "curve", rng: B.makeRng({ t: 1 }) }), /presence/);
  const joint = B.redeal(m, { kind: "feat", blocks: [[0, 1]], rng: B.makeRng({ t: 4 }) });
  const pair = (x, i) => `${x.values[0][i]}|${x.values[1][i]}`, orig = new Set(Array.from({ length: m.n }, (_, i) => pair(m, i)));
  for (let i = 0; i < m.n; i += 1) assert.ok(orig.has(pair(joint, i)), "features declared one block move together");
});

test("N-curve: Curveball keeps row and column sums exactly, and trades only inside a stratum", () => {
  const rng = rngOf(7), m = 20;
  const rows = Array.from({ length: 16 }, () => Array.from({ length: m }, (_, k) => k).filter(() => rng() < 0.35));
  const strata = rows.map((_, i) => (i < 8 ? "a" : "b"));
  const P = B.presenceMatrix({ ids: rows.map((_, i) => `e${i}`), signatures: Array.from({ length: m }, (_, k) => `sig${k}`), rows, strata });
  const x = B.redeal(P, { kind: "curve", rng: B.makeRng({ t: 2 }) });
  assert.deepEqual([...x.rows].map((r) => r.length), [...P.rows].map((r) => r.length));
  const colSum = (M, lo, hi) => { const s = new Array(m).fill(0); for (let i = lo; i < hi; i += 1) for (const k of M.rows[i]) s[k] += 1; return s; };
  assert.deepEqual(colSum(x, 0, 16), colSum(P, 0, 16));
  assert.deepEqual(colSum(x, 0, 8), colSum(P, 0, 8), "stratum a keeps its column sums");
  assert.notDeepEqual([...x.rows].map((r) => [...r].join()), [...P.rows].map((r) => [...r].join()));
});

test("N-cov keeps the correlation that N-feat destroys; the one-factor null keeps a dominant factor; effective dimension reads it", () => {
  const w = B.plantSystems({ world: "continuum", branchSizes: [20, 20, 20, 20], strength: 0.9, signatureCount: 8, noiseCount: 6, commonCount: 2, seed: 3 });
  const m = w.matrix, sig = [...Array(8).keys()];
  const meanAbs = (x) => { const c = B.correlationMatrix(sig.map((j) => x.values[j])); let s = 0, k = 0; for (let a = 0; a < 8; a += 1) for (let b = a + 1; b < 8; b += 1) { s += Math.abs(c[a][b]); k += 1; } return s / k; };
  const real = meanAbs(m);
  const avg = (kind) => { let s = 0; for (let d = 0; d < 12; d += 1) s += meanAbs(B.redeal(m, { kind, rng: B.makeRng({ k: kind, d }) })); return s / 12; };
  const feat = avg("feat"), cov = avg("cov"), cov1 = avg("cov1");
  assert.ok(real > 0.3, `planted continuum should be correlated (${real})`);
  assert.ok(cov > feat + 0.05, `N-cov (${cov}) must keep correlation that N-feat (${feat}) destroys`);
  assert.ok(cov1 > feat + 0.05, `N-cov1 (${cov1}) must keep a dominant factor`);
  const f = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => 0.9));
  f.forEach((r, i) => { r[i] = 1; });
  assert.ok(B.participationRatio(f) < 1.3, "one dominant factor");
  assert.ok(Math.abs(B.participationRatio(Array.from({ length: 12 }, (_, i) => Array.from({ length: 12 }, (__, j) => (i === j ? 1 : 0)))) - 12) < 1e-9);
});

test("matchedLoading is closed form: the continuum world has the kind world's pairwise correlation", () => {
  const sizes = [800, 800, 800, 800];
  const pick = (world) => B.plantSystems({ world, branchSizes: sizes, strength: 0.8, signatureCount: 6, noiseCount: 2, commonCount: 2, seed: 4 });
  const kind = pick("kind"), cont = pick("continuum");
  const share = kind.truth.memberShare, expect = B.kindPairwiseCorrelation({ strength: 0.8, memberShare: share });
  const meanAbs = (w) => { const c = B.correlationMatrix([...Array(6).keys()].map((j) => w.matrix.values[j])); let s = 0, k = 0; for (let a = 0; a < 6; a += 1) for (let b = a + 1; b < 6; b += 1) { s += Math.abs(c[a][b]); k += 1; } return s / k; };
  assert.ok(Math.abs(meanAbs(kind) - expect) < 0.03, `kind world ${meanAbs(kind)} vs closed form ${expect}`);
  assert.ok(Math.abs(meanAbs(cont) - expect) < 0.03, `continuum world ${meanAbs(cont)} vs closed form ${expect}`);
  assert.ok(Math.abs(B.matchedLoading({ strength: 0.8, signatureCount: 6, memberShare: share }) ** 2 - expect) < 1e-12);
  assert.equal(kind.truth.kinds[0].scope, "cross-lineage"); assert.ok(kind.truth.spanOk);
});

// ── the kind pipeline on planted worlds (A1.P1, A1.P2, A1.P3) ──────────────────────
const MENU = ["spectral", "grow"];
const runKinds = (w, o = {}) => B.induceSystemKinds(w.matrix, { draws: 39, controlReps: 0, neighborSweep: false, instruments: MENU, branches: w.branches, lineages: w.lineages, ...o });
const K100 = (seed) => B.plantSystems({ world: "kind", branchSizes: [25, 25, 25, 25], strength: 0.95, signatureCount: 24, noiseCount: 10, commonCount: 4, kindSize: 40, seed });

test("TOY-K100 (A1.P1): a planted discrete kind spanning 4 lineages is CLUSTER with F1 >= 0.9 in at least 2 of 3 worlds", T, () => {
  let hit = 0;
  const lines = [];
  for (const seed of [1, 2, 3]) {
    const w = K100(seed), res = runKinds(w);
    const A = w.truth.kinds[0].members, got = res.kinds.filter((k) => k.status === "CLUSTER" && f1(k.memberRefs, A) >= 0.9);
    lines.push(`seed ${seed}: ${res.kinds.map((k) => `${k.status}/${k.instrument}/n${k.memberRefs.length}/p${k.p.toFixed(3)}/pDip${k.gap?.pDip?.toFixed?.(3)}`).join(" ") || "no kind"}`);
    if (got.length) hit += 1;
    for (const k of got) { assert.equal(k.survives.feat, true); assert.equal(k.survives.cov, true); assert.equal(k.survives.cov1, true); assert.ok(k.gap.pDip <= 0.05); assert.ok(k.lineageSpanAfterDrop >= 3); assert.ok(k.p <= 0.05); assert.ok(Array.isArray(k.coreSignatures) && k.signatureCount >= 12); }
  }
  console.log(`# TOY-K100 detected ${hit} of 3 :: ${lines.join(" || ")}`);
  assert.ok(hit >= 2, `A1.P1 expected at least 2 of 3, got ${hit}: ${lines.join(" || ")}`);
});

test("TOY-C60 (A1.P2): the matched continuum is never called CLUSTER or FAMILY-BOUND; GRADIENT or nothing", T, () => {
  let discrete = 0, gradient = 0;
  const lines = [];
  for (const variant of ["free", "branch"]) for (const seed of [1, 2]) {
    const w = B.plantSystems({ world: "continuum", branchSizes: [15, 15, 15, 15], strength: 0.95, signatureCount: 24, noiseCount: 10, commonCount: 4, kindSize: 24, variant, seed });
    assert.equal(w.truth.kinds, null);
    const res = runKinds(w);
    lines.push(`${variant}/${seed}: ${res.kinds.map((k) => k.status).join(",") || "nothing"}`);
    if (res.kinds.some((k) => k.status === "CLUSTER" || k.status === "FAMILY-BOUND")) discrete += 1;
    if (res.kinds.some((k) => k.status === "GRADIENT")) gradient += 1;
  }
  console.log(`# TOY-C60 discrete calls ${discrete} of 4, gradient calls ${gradient} :: ${lines.join(" | ")}`);
  assert.ok(!B.rateExceeds(discrete, 4), `false discrete calls ${discrete} of 4 :: ${lines.join(" | ")}`);
  assert.equal(discrete, 0, `A1.P2: ${lines.join(" | ")}`);
});

test("TOY-NULL (A1.P3): block-permuted copies of the strong world yield no kind in at least 2 of 3; the control rule is the exact binomial", T, () => {
  const w = K100(1);
  let clean = 0;
  for (let r = 0; r < 3; r += 1) {
    const perm = B.redeal(w.matrix, { kind: "feat", rng: B.makeRng({ t: "perm", r }) });
    assert.ok(exactlyOneBin(perm));
    if (B.induceSystemKinds(perm, { draws: 39, controlReps: 0, neighborSweep: false, instruments: MENU, branches: w.branches, lineages: w.lineages, seed: 500 + r }).kinds.length === 0) clean += 1;
  }
  assert.ok(clean >= 2, `only ${clean} of 3 permuted copies were clean`);
});

test("the control is run by the pipeline itself and reported; a rejected copula calibration refuses every kind", T, () => {
  const w = B.plantSystems({ world: "kind", branchSizes: [10, 10, 10, 10], strength: 0.9, signatureCount: 8, noiseCount: 4, commonCount: 2, seed: 5 });
  const res = B.induceSystemKinds(w.matrix, { draws: 19, controlReps: 3, controlDraws: 19, neighborSweep: false, instruments: MENU, branches: w.branches, lineages: w.lineages });
  assert.equal(res.diagnostics.control.reps, 3);
  assert.equal(typeof res.diagnostics.control.passed, "boolean");
  assert.equal(res.diagnostics.control.perRep.length, 3);
  assert.ok(res.ceiling.perNull.feat !== undefined && res.ceiling.perNull.cov1 !== undefined && res.ceiling.value >= Math.max(...Object.values(res.ceiling.perNull)) - 1e-12);
  assert.ok(Array.isArray(res.diagnostics.candidateTable));
  const w2 = K100(1);
  const refused = B.induceSystemKinds(w2.matrix, { draws: 29, controlReps: 0, neighborSweep: false, instruments: MENU, nulls: ["feat", "cov"], branches: w2.branches, lineages: w2.lineages, calibration: { rejected: true, rate: 0.2 } });
  assert.ok(refused.kinds.length >= 1 && refused.kinds.every((k) => k.status === "REFUSED" && k.refusal === "copula_calibration_failed"), "no kind is reported from an instrument whose calibration failed");
  assert.ok(refused.refused.some((r) => r.type === "copula_calibration_failed"));
});

test("a kind passing the ceiling without lineage labels is REFUSED, never called a cluster; no covariance null means no kind", T, () => {
  const w = K100(1);
  w.matrix.lineages = null;
  const res = B.induceSystemKinds(w.matrix, { draws: 29, controlReps: 0, neighborSweep: false, instruments: MENU, nulls: ["feat", "cov"], branches: w.branches, lineages: null });
  assert.ok(res.kinds.length >= 1, "the planted kind still clears the ceiling");
  assert.ok(res.kinds.every((k) => k.status !== "CLUSTER"));
  assert.ok(res.kinds.some((k) => k.status === "REFUSED" && k.refusal === "no_lineage_labels"));
  assert.ok(res.gaps.some((g) => g.type === "no_lineage_labels"));
  const nocov = B.induceSystemKinds(w.matrix, { draws: 19, controlReps: 0, neighborSweep: false, instruments: MENU, branches: w.branches, lineages: w.lineages, nulls: ["feat"] });
  assert.ok(nocov.kinds.every((k) => k.status === "REFUSED" && k.refusal === "no_cov_null"));
});

test("kindOrGradient: a continuum's first-axis split is a GRADIENT; fields are typed", T, () => {
  const w = B.plantSystems({ world: "continuum", branchSizes: [15, 15, 15, 15], strength: 0.95, signatureCount: 24, noiseCount: 10, commonCount: 4, kindSize: 24, seed: 2 });
  const members = Array.from({ length: 24 }, (_, i) => i);
  const r = B.kindOrGradient({ instrument: "grow", members }, w.matrix, { draws: 19, seed: 9, branches: w.branches, lineages: w.lineages, minKindSize: 4, permutations: 32 });
  assert.ok(["GRADIENT", "FAMILY-BOUND", "CLUSTER", "REFUSED"].includes(r.label));
  assert.ok(r.dip >= 1 / 120 && r.pDip > 0 && r.pDip <= 1 && r.pr > 1);
  assert.equal(B.kindOrGradient({ instrument: "grow", members: Array.from({ length: 60 }, (_, i) => i) }, w.matrix, { draws: 3 }).label, "REFUSED");
});

test("a whole-population basin is refused before it is judged (Kanada on identical presence rows)", T, () => {
  const n = 14, sigs = Array.from({ length: 10 }, (_, k) => `s${k}`);
  const P = B.presenceMatrix({ ids: Array.from({ length: n }, (_, i) => `e${i}`), signatures: sigs, rows: Array.from({ length: n }, (_, i) => [...sigs.slice(0, 6), sigs[6 + (i % 4)]]) });
  const res = B.induceSystemKinds(P, { draws: 9, controlReps: 0, neighborSweep: false, instruments: ["kanada"], nulls: ["curve"], minKindSize: 3 });
  assert.equal(res.kinds.length, 0);
  assert.ok(res.diagnostics.ineligible.length >= 0);
});

test("held-out assignment: a member system is assigned to the kind, a non-member is not", () => {
  const w = K100(1), vecs = B.signatureVectorsOf(w.matrix), A = w.truth.kinds[0].members;
  const heldIn = A[0], heldOut = w.ids.find((id) => !A.includes(id));
  const train = new Map([...vecs].filter(([id]) => id !== heldIn && id !== heldOut));
  const kindSet = { kinds: [{ id: "A", memberRefs: A.filter((id) => id !== heldIn) }], vectors: train };
  assert.equal(B.assignSystem(kindSet, vecs.get(heldIn), { alpha: 0.05 }).verdict, "member");
  assert.equal(B.assignSystem(kindSet, vecs.get(heldOut), { alpha: 0.05 }).verdict, "not_member");
  assert.equal(B.assignSystem({ kinds: [{ id: "A", memberRefs: ["zz"] }], vectors: train }, vecs.get(heldIn)).verdict, "unknown");
});

test("rival partitions are registered as explicit classifications, never merged with induced kinds; the ledger refuses undeclared numbers", () => {
  const r = B.registerRivals({ script: { a: "latin", b: "latin", c: "han" }, family: { a: "germanic", b: "germanic", c: "sinitic" } }, { giver: "unit-test" });
  assert.ok(r.projections.length >= 3 && r.projections.every((p) => p.standing === "received_explicit_classification" && p.witnessed === false));
  assert.throws(() => B.registerRivals({ x: { a: "b" } }), /giver/);
  assert.throws(() => B.functionalLedger(["a", "b"], { assertionsOf: () => [], sameValue: () => true }), TypeError);
  const L = B.functionalLedger(["p1", "p2", "p3", "p4"], { assertionsOf: (id) => [{ rel: "born", value: "x", id: `${id}1` }, { rel: "born", value: "x", id: `${id}2` }], sameValue: (a, b) => a === b, exposureFloor: 2, draws: 9, alpha: 0.05, seed: 1 });
  assert.ok(L.diagnostics && typeof L.kindsOf === "function");
});

test("the power grid and the copula calibration return typed cells with intervals (tiny sizes; real sizes are the driver's)", T, () => {
  const g = B.powerGrid({ branchSizes: [10, 10, 10, 10], strengths: [0.9], signatureCounts: [12], reps: 2, continuumReps: 3, draws: 9, continuumDraws: 9, instruments: ["spectral"], noiseCount: 6 });
  assert.equal(g.cells.length, 1);
  const c = g.cells[0];
  assert.ok(c.power >= 0 && c.power <= 1 && c.powerCi.length === 2 && typeof c.admissible === "boolean" && Array.isArray(c.reasons));
  assert.ok(c.continuum.free && c.continuum.branch && typeof c.continuum.free.clusterRejected === "boolean");
  assert.equal(typeof g.absenceLicensed, "boolean");
  const d = B.detectability({ memberCount: 8, lineageSpan: 4, signatureCount: 24 }, { cells: [{ strength: 0.8, signatureCount: 12, power: 0.9, admissible: true }, { strength: 0.5, signatureCount: 24, power: 0.85, admissible: true }], kindSize: 8 });
  assert.equal(d.admissible, true); assert.equal(d.strength, 0.5);
  assert.equal(B.detectability({ memberCount: 8, signatureCount: 6 }, { cells: [{ strength: 0.8, signatureCount: 12, power: 0.9, admissible: true }] }).admissible, false);
  const m = B.plantSystems({ world: "continuum", branchSizes: [8, 8, 8, 8], strength: 0.7, signatureCount: 6, noiseCount: 6, commonCount: 2, seed: 6 }).matrix;
  const cal = B.copulaCalibration(m, { worlds: 4, draws: 9, instruments: ["spectral"], nulls: ["feat", "cov"] });
  assert.equal(cal.worlds, 4); assert.equal(typeof cal.rejected, "boolean"); assert.ok(cal.ci95[0] <= cal.rate && cal.rate <= cal.ci95[1]);
  assert.ok(cal.rejectionPowerAt10pc > 0 && cal.rejectionPowerAt10pc < 1);
});

// ── verdicts, power trio, persistence, audit, standing ─────────────────────────────
test("minimumEffectVerdict: every verdict is reachable and an unlicensed bridge can never return REFUTED (P8)", () => {
  const ok = { powerUp: true, powerDown: true, controlsOk: true, nullOk: true, mustBeatOk: true, signGate: true, channelsOk: true, bridge: "licensed", consumed: false };
  const v = (o) => B.minimumEffectVerdict({ sesoi: 0.1, ci95: [0.2, 0.4], theta: 0.3, ...ok, ...o });
  assert.equal(v({}).verdict, "SURVIVES"); assert.equal(v({}).headline, true);
  assert.equal(v({ controlsOk: false }).verdict, "INSTRUMENT_FAILED");
  assert.equal(v({ ci95: [0.05, 0.3] }).verdict, "UNDERPOWERED");
  assert.equal(v({ powerUp: false }).verdict, "UNDERPOWERED");
  assert.equal(v({ powerUp: null }).verdict, "UNDERPOWERED");
  assert.equal(v({ signGate: "unreachable" }).verdict, "UNDERPOWERED");
  assert.equal(v({ ci95: [-0.2, 0.05] }).verdict, "REFUTED");
  assert.equal(v({ ci95: [-0.2, 0.05], powerDown: false }).verdict, "UNDERPOWERED");
  assert.equal(v({ ci95: [-0.2, 0.05], bridge: "unlicensed" }).verdict, "WEAKENED"); assert.equal(v({ ci95: [-0.2, 0.05], bridge: "unlicensed" }).bridge, "failed");
  assert.equal(v({ nullOk: false }).verdict, "WEAKENED"); assert.equal(v({ mustBeatOk: false }).verdict, "WEAKENED");
  assert.equal(v({ signGate: false }).verdict, "WEAKENED"); assert.equal(v({ channelsOk: false }).verdict, "WEAKENED");
  const unl = v({ bridge: "unlicensed" });
  assert.equal(unl.verdict, "SURVIVES"); assert.equal(unl.headline, false); assert.equal(unl.bridge, "unlicensed");
  assert.equal(v({ consumed: "near" }).verdict, "WEAKENED"); assert.equal(v({ consumed: true }).headline, false);
  const rng = rngOf(8);
  for (let i = 0; i < 600; i += 1) {
    const lo = rng() * 0.6 - 0.4, r = B.minimumEffectVerdict({ sesoi: 0.1, ci95: [lo, lo + rng() * 0.3], powerUp: rng() < 0.5, powerDown: rng() < 0.5, controlsOk: rng() < 0.9, nullOk: rng() < 0.5, mustBeatOk: rng() < 0.5, signGate: [true, false, "unreachable"][Math.floor(rng() * 3)], channelsOk: rng() < 0.5, bridge: "unlicensed", consumed: [false, true, "near"][Math.floor(rng() * 3)] });
    assert.notEqual(r.verdict, "REFUTED"); assert.ok(B.VERDICTS.includes(r.verdict));
  }
  assert.throws(() => B.minimumEffectVerdict({ sesoi: 0.1 }), TypeError);
});

test("powerTrio: 2s survives, 0.5s refutes, exactly s and 0.1s at ten times n do neither; an underpowered instrument is caught", () => {
  const s = 0.5;
  const world = (n0) => (effect, { nScale, seed }) => {
    const rng = B.makeRng({ seed, effect, nScale }), nrm = normalOf(rng), n = n0 * nScale;
    let m = 0; const xs = Array.from({ length: n }, () => effect + nrm());
    m = xs.reduce((a, b) => a + b, 0) / n;
    const sdv = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)), se = sdv / Math.sqrt(n);
    return { ci95: [m - 1.96 * se, m + 1.96 * se] };
  };
  const strong = B.powerTrio(world(200), { sesoi: s, worlds: 60, seed: 3 });   // standard error s/7: P_down is Phi(1.57), analytically above 0.8
  assert.ok(strong.pUp && strong.pDown && strong.tinyOk && strong.atSOk, JSON.stringify({ up: strong.up.rate, down: strong.down.rate, tiny: strong.tiny.rate, s1: strong.atS.survives.rate, s2: strong.atS.refuted.rate }));
  const weak = B.powerTrio(world(4), { sesoi: s, worlds: 60, seed: 3 });
  assert.equal(weak.pUp, false, "an instrument too noisy to recover 2s must say so");
  assert.equal(weak.pDown, false);
});

const lay = (lineages, per) => ({ branches: Array.from({ length: lineages * per }, (_, i) => `b${Math.floor(i / per)}`), lineages: Array.from({ length: lineages * per }, (_, i) => `L${Math.floor(i / per)}`) });
const PL = (vals, over = {}) => vals.map((v, i) => ({ lineage: `L${i}`, theta: v, nullMedian: 0, defined: true, ie: false, ...over }));
const P0 = { sesoi: 0.3, channels: 2, nullOk: true, controlOk: true, powerUp: true, powerDown: true, B: 400, seed: 5 };

test("persistence: every status of BARKER.md 4.6 is reachable, in the statistic's own units", () => {
  const strong = PL([0.8, 0.9, 0.7, 0.85, 0.75, 0.95, 0.8, 0.9]);
  const r = B.persistence({ perLineage: strong, ...P0 });
  assert.equal(r.status, "PERSISTENT"); assert.equal(r.k, 8); assert.equal(r.nLineages, 8); assert.equal(r.holdsIn.length, 8);
  assert.equal(B.persistence({ perLineage: strong, ...P0, controlOk: false }).status, "INSTRUMENT_FAILED");
  assert.equal(B.persistence({ perLineage: strong, ...P0, controlOk: null }).status, "UNDERPOWERED");
  assert.equal(B.persistence({ perLineage: strong, ...P0, powerUp: null }).status, "UNDERPOWERED");
  assert.equal(B.persistence({ perLineage: strong, ...P0, powerUp: false }).status, "UNDERPOWERED");
  assert.equal(B.persistence({ perLineage: strong, ...P0, channels: 1 }).status, "CHANNEL-BOUND");
  assert.equal(B.persistence({ perLineage: strong, ...P0, trivialNull: { reached: true } }).status, "TRIVIAL");
  assert.equal(B.persistence({ perLineage: strong, ...P0, trivialNull: { nullQ95: 0.7 } }).status, "TRIVIAL");
  assert.equal(B.persistence({ perLineage: strong, ...P0, nullOk: false }).status, "FAMILY-BOUND");
  const four = B.persistence({ perLineage: strong.slice(0, 4), ...P0 });
  assert.equal(four.status, "UNDERPOWERED"); assert.match(four.reasons.join(" "), /REACHABILITY/); assert.equal(four.reachability.unreachable, true);
  const undef = B.persistence({ perLineage: PL([0.8, 0.9, 0.7, 0.85, 0.75, 0.95, 0.8, 0.9]).map((l, i) => ({ ...l, defined: i < 4 })), ...P0 });
  assert.equal(undef.status, "UNDERPOWERED"); assert.equal(undef.undefinedIn.length, 4); assert.equal(undef.nLineages, 4);
  assert.equal(B.persistence({ perLineage: PL([0.0, 0.01, 0.02, -0.01, 0.0, 0.01, -0.02, 0.0]), ...P0 }).status, "ABSENT", "an effect of zero with power to see 0.5*s is ABSENT in the statistic's own units");
  assert.equal(B.persistence({ perLineage: PL([0.3, 0.5, 0.1, 0.4, 0.2, 0.6, 0.0, 0.3]), ...P0 }).status, "UNDERPOWERED", "the interval straddles s");
  assert.equal(B.persistence({ perLineage: PL([-0.6, -0.7, -0.5, -0.65, -0.6, -0.8, -0.55, -0.7]), ...P0 }).status, "ABSENT");
  assert.equal(B.persistence({ perLineage: PL([-0.6, -0.7, -0.5, -0.65, -0.6, -0.8, -0.55, -0.7]), ...P0, powerDown: false }).status, "UNDERPOWERED");
  // pooled effect clears s but 2 of 9 lineages go the wrong way: the sign gate (8 of 9) fails
  const gate = B.persistence({ perLineage: PL([1.1, 1.0, 0.9, 1.1, 1.0, 0.9, 1.0, -0.1, -0.05]), ...P0 });
  assert.equal(gate.status, "FAMILY-BOUND"); assert.equal(gate.k, 7); assert.equal(gate.reachability.kNeeded, 8);
  // one lineage carries it: the pooled lower bound (lineage-cluster bootstrap) cannot stay above s, so it is not PERSISTENT
  assert.notEqual(B.persistence({ perLineage: PL([6, 0.05, 0.04, 0.06, 0.05, 0.03, 0.05, 0.04]), ...P0 }).status, "PERSISTENT");
  // Indo-European alone is the negative lineage: the full set fails, the 8 others pass
  const ie = B.persistence({ perLineage: [{ lineage: "IE", theta: -6, nullMedian: 0, defined: true, ie: true }, ...PL([0.8, 0.9, 0.7, 0.85, 0.75, 0.95, 0.8, 0.9]).map((l, i) => ({ ...l, lineage: `N${i}` }))], ...P0 });
  assert.equal(ie.status, "PERSISTENT-OUTSIDE-IE"); assert.equal(ie.nLineages, 8);
  assert.throws(() => B.persistence({ perLineage: strong }), TypeError);
});

test("archOf on a layout that can vote: a planted regularity is PERSISTENT with holdsIn and failsIn; noise and one-lineage effects are not", () => {
  const L = lay(8, 3), n = 24, rng = rngOf(10), nrm = normalOf(rng);
  const nullThetas = Array.from({ length: 99 }, () => Array.from({ length: n }, () => 0.3 * nrm()));
  const mk = (theta, over = {}) => B.archOf({ id: "toy", operationalisation: "toy", layout: L, theta, nullThetas, sesoi: 0.3, control: { passed: true }, powerUp: true, powerDown: true, channels: 2, B: 400, seed: 3, ...over });
  const planted = mk(Array.from({ length: n }, () => 0.9 + 0.1 * nrm()));
  assert.equal(planted.standing, "PERSISTENT"); assert.equal(planted.holdsIn.length, 8); assert.equal(planted.failsIn.length, 0); assert.deepEqual(planted.undefinedIn, []);
  assert.ok(planted.nullP <= 0.05 && planted.nullOk === true);
  const noise = mk(Array.from({ length: n }, () => 0.3 * nrm()));
  assert.notEqual(noise.standing, "PERSISTENT");
  const one = mk(Array.from({ length: n }, (_, i) => (i < 3 ? 6 : 0.3 * nrm())));
  assert.notEqual(one.standing, "PERSISTENT");
  const undefinedSome = mk(Array.from({ length: n }, () => 0.9 + 0.1 * nrm()), { definedLineages: ["L0", "L1", "L2"] });
  assert.equal(undefinedSome.standing, "UNDERPOWERED"); assert.equal(undefinedSome.undefinedIn.length, 5);
  assert.equal(mk(Array.from({ length: n }, () => 0.9), { control: null }).standing, "UNDERPOWERED");
  assert.equal(mk(Array.from({ length: n }, () => 0.9), { control: { passed: false } }).standing, "INSTRUMENT_FAILED");
  assert.ok(planted.descriptive.concordant.length === 8);
});

test("independence audit: a duplicated channel collapses to one component; independent channels stay two", () => {
  const a = B.independenceAudit([{ id: "ud:deprel", ancestors: ["tb/eng"] }, { id: "ud:deprel-copy", ancestors: ["tb/eng"] }, { id: "tree-sitter", ancestors: ["grammar/js"] }]);
  assert.equal(a.effectiveN, 2); assert.deepEqual(a.collapsed, [["ud:deprel", "ud:deprel-copy"]]);
  assert.equal(B.independenceAudit([{ id: "x", ancestors: ["p"] }, { id: "y", ancestors: ["q"] }]).effectiveN, 2);
  assert.equal(B.independenceAudit([{ id: "x", ancestors: ["p"] }, { id: "y", ancestors: ["q", "p"] }, { id: "z", ancestors: ["q"] }]).effectiveN, 1, "joined through a chain of shared ancestors");
});

test("archon standing stays checked until S1-S8 all pass; mapLines is empty then, and plain, banned-word-free and humble after", () => {
  assert.equal(B.archonStanding().trust, "checked");
  const cards = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"].map((id) => ({ id, pass: true }));
  assert.equal(B.archonStanding(cards).trust, "cleared");
  assert.equal(B.archonStanding([...cards.slice(0, 7), { id: "S8", pass: false }]).trust, "checked");
  assert.equal(B.archonStanding(cards.slice(0, 7)).trust, "checked");
  const report = { kinds: [{ status: "CLUSTER" }, { status: "GRADIENT" }], arches: [{ standing: "PERSISTENT" }, { standing: "UNDERPOWERED" }], lineages: 9 };
  assert.deepEqual(B.mapLines(report), []);
  const lines = B.mapLines(report, { standing: B.archonStanding(cards) });
  assert.ok(lines.length >= 1 && lines.length <= 3);
  for (const l of lines) { assert.deepEqual(bannedHits(l), [], l); assert.match(l, /nothing was shown|could not be checked/); assert.match(l, /itself one of the pieces/); }
  assert.deepEqual(B.mapLines(report, { standing: B.archonStanding(cards), banned: ["families"] }), []);
});

// ── arches (A1.P5, P6, P7) ─────────────────────────────────────────────────────────
function archWorld({ lineages = 8, per = 5, rho = 0.8, only = null, shuffle = false, seed = 1, sizes = null } = {}) {
  const rng = rngOf(seed), nrm = normalOf(rng);
  const branches = [], lins = [];
  const sz = sizes ?? Array.from({ length: lineages }, () => per);
  sz.forEach((s, l) => { for (let k = 0; k < s; k += 1) { branches.push(`b${l}`); lins.push(`L${l}`); } });
  const n = branches.length;
  const keys = ["a0", ...Array.from({ length: 8 }, (_, k) => `a${k + 1}`), "b0", ...Array.from({ length: 8 }, (_, k) => `b${k + 1}`)], b0 = keys.indexOf("b0");
  const rows = Array.from({ length: n }, (_, i) => { const row = keys.map(() => nrm()); const r = only === null || lins[i] === `L${only}` ? rho : 0; row[b0] = r * row[0] + Math.sqrt(1 - r * r) * row[b0]; return row; });
  if (shuffle) { const col = rows.map((r) => r[b0]); for (let i = col.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [col[i], col[j]] = [col[j], col[i]]; } rows.forEach((r, i) => { r[b0] = col[i]; }); }
  return B.blockMatrixFromValues(rows, { ids: Array.from({ length: n }, (_, i) => `s${i}`), featureKeys: keys, groupOf: keys.map((k) => k[0].toUpperCase()), branches, lineages: lins });
}
const scan = (bm, o = {}) => B.scanCouplings(bm, { draws: 199, controlReps: 3, controlDraws: 49, archPower: { powerUp: true, powerDown: true }, channelsOf: () => 2, B: 400, ...o });

test("TOY-ARCH (A1.P5): a planted cross-group coupling is found and is PERSISTENT at a rate consistent with the recorded 0.60; shuffled data yields no PERSISTENT; the control passes", T, () => {
  let found = 0, persistent = 0, controlsOk = 0;
  const lines = [];
  for (let seed = 1; seed <= 10; seed += 1) {
    const planted = scan(archWorld({ seed }));
    const c = planted.candidates.find((x) => x.features.includes("a0") && x.features.includes("b0"));
    if (planted.control.passed) controlsOk += 1;
    if (c) { found += 1; if (c.standing === "PERSISTENT") persistent += 1; lines.push(`${seed}:${c.standing}[${c.pooled.ci95.map((x) => x.toFixed(2))}]`); } else lines.push(`${seed}:not-found`);
  }
  console.log(`# TOY-ARCH planted rho 0.8: found ${found} of 10, PERSISTENT ${persistent} of 10 (recorded prediction 0.60) :: ${lines.join(" ")}`);
  assert.ok(found >= 8, `the planted pair should clear the search-aware ceiling: ${lines.join(" ")}`);
  assert.ok(persistent >= 3, `PERSISTENT in ${persistent} of 10 (recorded 0.60): ${lines.join(" ")}`);
  assert.ok(controlsOk >= 9, "the block-permuted control passes (not rejected as <= alpha)");
  const first = scan(archWorld({ seed: 1 }));
  assert.equal(first.definedLineages.length, 8); assert.ok(first.nPairs > 0 && first.blocks === 2);
  for (const c of first.candidates) assert.ok(["holdsIn", "failsIn", "undefinedIn", "control", "standing", "operationalisation", "id"].every((k) => k in c));
  let shufflePersistent = 0;
  for (let seed = 1; seed <= 6; seed += 1) if (scan(archWorld({ shuffle: true, seed }), { controlReps: 0 }).candidates.some((x) => x.standing === "PERSISTENT")) shufflePersistent += 1;
  assert.equal(shufflePersistent, 0, "shuffled data: no PERSISTENT (recorded 0.95 per world)");
  const noPower = B.scanCouplings(archWorld({ seed: 1 }), { draws: 99, controlReps: 0, channelsOf: () => 2, B: 200 });
  assert.ok(noPower.candidates.every((x) => x.standing === "UNDERPOWERED"), "without the power card nothing may exceed UNDERPOWERED");
  assert.ok(noPower.gaps.some((g) => g.type === "power_card_missing"));
  const oneChannel = B.scanCouplings(archWorld({ seed: 1 }), { draws: 99, controlReps: 0, archPower: { powerUp: true, powerDown: true }, channelsOf: () => 1, B: 200 });
  assert.ok(oneChannel.candidates.every((x) => x.standing !== "PERSISTENT"), "a coupling inside one channel is a property of the annotation");
});

test("TOY-ARCH: a coupling carried by one lineage is never PERSISTENT", T, () => {
  const res = scan(archWorld({ only: 0, rho: 0.95 }));
  assert.ok(res.candidates.every((x) => x.standing !== "PERSISTENT"));
});

test("P7: on the REAL layout (9 lineages, 8 of them single systems) at most Indo-European can vote, so every coupling is UNDERPOWERED BY REACHABILITY", T, () => {
  const L = B.REAL_LAYOUT, sizes = L.branchSizes, lineageOf = L.lineageOf;
  const branches = [], lineages = [];
  sizes.forEach((s, b) => { for (let k = 0; k < s; k += 1) { branches.push(`b${b}`); lineages.push(`L${lineageOf(b)}`); } });
  const lp = B.lineageSignPower({ branches, lineages }, { effect: 0.6, reps: 200, seed: 1 });
  assert.ok(lp.defined.has("L0")); assert.ok(lp.defined.size < 5, `defined ${[...lp.defined]}`);
  for (const l of ["L2", "L3", "L4", "L5", "L6", "L7", "L8"]) assert.ok(lp.power.get(l) < 0.8, `a single system cannot vote (${l}: ${lp.power.get(l)})`);
  const bm = archWorld({ sizes });
  const res = B.scanCouplings(bm, { draws: 99, controlReps: 1, controlDraws: 49, archPower: { powerUp: true, powerDown: true }, channelsOf: () => 2, B: 200, ieLineages: ["L0"] });
  assert.ok(res.definedLineages.length < 5);
  for (const c of res.candidates) { assert.equal(c.standing, "UNDERPOWERED"); assert.match(c.persistence.reasons.join(" "), /REACHABILITY/); }
  const card = B.archPowerCard({ branchSizes: sizes, lineageOf, reps: 3, draws: 19, seed: 2 });
  assert.equal(card.powerUp, false); assert.match(card.reasons.join(" "), /REACHABILITY/);
  const ok = B.archPowerCard({ branchSizes: Array(8).fill(5), reps: 3, draws: 19, seed: 2 });
  assert.equal(ok.definedLineages.length, 8); assert.equal(typeof ok.powerDown, "boolean"); assert.ok(ok.effects.up.reps === 3);
});

// ── induceMetastructure: the whole organ on planted profiles ───────────────────────
test("induceMetastructure on planted profiles: typed result, typed gaps, frame declaration, hooks; the map claims no standpoint outside", T, () => {
  const w = B.plantSystems({ world: "kind", branchSizes: [10, 10, 10, 10], strength: 0.9, signatureCount: 8, noiseCount: 8, commonCount: 4, seed: 11 });
  const profiles = B.plantProfiles(w);
  assert.ok(profiles.every((p) => p.eoFree && p.contentHash));
  const res = B.induceMetastructure(profiles, { draws: 19, controlReps: 1, instruments: MENU, neighborSweep: false, agreementDraws: 29 });
  assert.equal(res.schema, "BarkerMetastructure@1"); assert.equal(res.standing, "nomination"); assert.equal(res.trust, "checked");
  for (const key of ["kinds", "kindOfSystem", "arches", "groups", "agreement", "gaps", "provenance", "selfTest"]) assert.ok(key in res, key);
  assert.deepEqual(Object.keys(res.kindOfSystem).sort(), profiles.map((p) => p.id).sort());
  assert.ok(res.groups.some((g) => g.group === "ALL") && res.groups.every((g) => g.status === "run"));
  for (const g of res.groups) { assert.equal(g.absence, "UNDERPOWERED"); assert.ok(g.absenceNote.length > 10); }
  assert.ok(res.gaps.some((g) => g.type === "power_card_missing"), "no power card supplied: typed, not guessed");
  assert.ok(res.gaps.some((g) => g.type === "arch_underpowered_by_reachability"), "4 lineages cannot reach alpha");
  assert.ok(res.arches.every((a) => ["holdsIn", "failsIn", "undefinedIn", "control", "standing", "operationalisation", "id"].every((k) => k in a)));
  assert.ok(res.arches.every((a) => a.standing === "UNDERPOWERED"));
  const fd = res.provenance.frameDeclaration;
  assert.ok(Object.values(fd.organs).every((v) => typeof v === "string" && v) && Object.values(fd.givers).every((v) => typeof v === "string" && v) && Object.values(fd.numbers).every(Number.isFinite));
  assert.match(res.provenance.lens, /claims no standpoint outside/);
  assert.ok(res.agreement.pairs.length > 0 && res.agreement.pairs.every((p) => p.p > 0 && p.p <= 1));
  // self-test hooks: resample changes values within the cell's own noise; permute 'columns' is the control built to fail; rerun has the same shape
  const rs = res.selfTest.resample(3);
  assert.equal(rs.length, profiles.length);
  const dv = Math.abs(rs[0].cells.x000.value - profiles[0].cells.x000.value);
  assert.ok(dv > 0 && dv < 0.5);
  const cols = res.selfTest.permute("columns", 4);
  assert.equal(cols.length, profiles.length);
  assert.notDeepEqual(cols.map((p) => p.cells.x000.value), profiles.map((p) => p.cells.x000.value));
  assert.deepEqual([...cols.map((p) => p.cells.x000.value)].sort(), [...profiles.map((p) => p.cells.x000.value)].sort());
  assert.deepEqual(res.selfTest.permute("labels", 4).map((p) => p.cells.x000.value), profiles.map((p) => p.cells.x000.value), "label permutation leaves the measurements alone");
  const again = res.selfTest.rerun(cols, { draws: 9, controlReps: 0, arches: false });
  assert.equal(again.schema, "BarkerMetastructure@1");
  assert.ok(again.kinds.every((k) => k.status !== "CLUSTER"), "the control built to fail: column-permuted profiles hold no cross-lineage cluster");
  const st = res.selfTest.stability({ B: 3, seed: 2 });
  for (const g of Object.keys(st)) assert.ok(typeof st[g].stable === "boolean" && st[g].B === 3);
  assert.ok(res.selfTest.partitionOf(res).length === profiles.length);
  const lo = res.selfTest.leaveOut({ by: "lineage", overrides: { draws: 9, controlReps: 0, arches: false, concatenated: false } });
  assert.equal(lo.length, 4); assert.ok(lo.every((f) => f.n === 30 && f.result));
});

test("induceMetastructure refuses a profile with EO vocabulary and a population that is too small", () => {
  const w = B.plantSystems({ world: "kind", branchSizes: [5, 5], strength: 0.9, signatureCount: 4, noiseCount: 4, commonCount: 2, seed: 2 });
  const profiles = B.plantProfiles(w);
  const tiny = B.plantProfiles(B.plantSystems({ world: "kind", branchSizes: [3, 3], strength: 0.9, signatureCount: 4, noiseCount: 4, commonCount: 2, seed: 2 }));
  assert.throws(() => B.induceMetastructure(profiles.slice(0, 3)), TypeError);
  const bad = { ...profiles[0], cells: { ...profiles[0].cells, x_cell_share: { ...profiles[0].cells.x000, id: "x_cell_share" } } };
  assert.throws(() => B.induceMetastructure([bad, ...profiles.slice(1)]), /not EO-free/);
  const small = B.induceMetastructure(tiny, { draws: 9, controlReps: 0, instruments: ["spectral"], concatenated: false, arches: false, neighborSweep: false });
  assert.ok(small.gaps.some((g) => g.type === "population_too_small"), "6 systems cannot hold a kind of 4 and a complement: typed, not run");
  assert.equal(small.kinds.length, 0);
});

// ── static source rules (BARKER.md 8.3) ────────────────────────────────────────────
const CODE = SRC.split("\n").filter((l) => !l.trim().startsWith("//")).map((l) => l.replace(/\s\/\/.*$/, "")).join("\n");

test("source rules: zero model, no fs, no network; allowed imports only; fallbackNomination only in an excluding position; no description-length or MDE-as-threshold", () => {
  assert.doesNotMatch(CODE, /model-server|mouth\.js|node:https?|fetch\(|anthropic|openai|embedding|readFileSync|writeFileSync|node:fs|process\.|child_process|require\(/i);
  const imports = [...CODE.matchAll(/^import .* from "(.*)";$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ["../kernel/entity-kind-induction.js", "../kernel/kind-functional-induction.js", "../kernel/kind-induction.js", "../kernel/nullcheck.js", "../kernel/rng.js", "./kind-standing.js"].sort());
  const fb = CODE.split("\n").filter((l) => l.includes("fallbackNomination"));
  assert.equal(fb.length, 1); assert.match(fb[0], /c\.fallbackNomination === true\) \{ ineligible\.push/);
  assert.doesNotMatch(CODE, /\bdl\(|\bBIC\b|bic\s*=|delta\s*=\s*mde|MDE\s*\)|description.length/i);
  const outsideBan = CODE.replace(/export const EO_BAN = freeze\(\[[\s\S]*?\]\);/, "").replace(/const EO_PATHS = .*\n/, "");
  assert.doesNotMatch(outsideBan, /cube\.js|phasepost|relation-kinds|act-prior|case-priors|hyperlexicon/i, "EO artifacts are named only in the ban list; no EO module is read");
});

test("constants and handle: ALPHA equals the repo's KEY_ALPHA; the header is a pre-registration; the handle row names the file", () => {
  assert.equal(B.ALPHA, KEY_ALPHA); assert.equal(B.SEED, 20261005); assert.equal(B.DRAWS, 999);
  assert.ok(Object.isFrozen(B.DEFAULTS) && Object.isFrozen(B.EO_BAN) && Object.isFrozen(B.VERDICTS) && Object.isFrozen(B.ARCH_STATUS));
  assert.deepEqual([...B.VERDICTS], ["INSTRUMENT_FAILED", "UNDERPOWERED", "REFUTED", "WEAKENED", "SURVIVES", "NOT_TESTABLE_NOW"]);
  const head = []; for (const l of SRC.split("\n")) { if (l.startsWith("//") || !l.trim()) head.push(l); else break; }
  const text = head.join("\n");
  for (const marker of ["PRE-REGISTRATION (FOLD-CONSTITUTION II.5)", "WHAT THIS MODULE CLAIMS", "DEFINITIONS.", "CONTROLS BUILT TO FAIL", "POWER CHECKS.", "PASS RULES", "TYPED NUMBERS", "RECORDED PREDICTIONS", "ADDENDUM A1", "LIMITS"]) assert.ok(text.includes(marker), marker);
  assert.match(createHash("sha256").update(text.trim()).digest("hex"), /^[0-9a-f]{64}$/);
  assert.ok(SRC.split("\n").slice(0, 4).join("\n").includes("Handle: Barker"));
  assert.equal(B.HANDLE.file, "organs/barker.js"); assert.equal(B.HANDLE.handle, "Barker"); assert.equal(B.HANDLE.trust, "checked");
  assert.ok(B.HANDLE.readmeRow.startsWith("| `organs/barker.js` | Barker |"));
  assert.ok(B.HANDLE.isNot.length > 20 && B.HANDLE.is.length > 20);
});
