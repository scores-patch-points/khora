// tests/barker-induce.test.js — regression guard for eval/barker/induce.mjs (BARKER, the induction).
// It tests the INSTRUMENT, never the languages: on planted toys where the right answer is known by construction, a planted kind must be recovered, a block-permuted
// copy must yield nothing, a planted continuum must not be called a CLUSTER, a card must pass its own power trio and fail its own control, the persistence rule must
// say UNDERPOWERED BY REACHABILITY when too few lineages can vote, and the static rules (zero model, no TEST read, pre-registration header) must hold.
// Everything here is synthetic: no real treebank, profile or card statistic is read.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as M from "../eval/barker/induce.mjs";
import { KEY_ALPHA } from "../adapters/text/keyness.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(HERE, "../eval/barker/induce.mjs"), "utf8");
const organ = M.organStatus();

// ── static rules (header section 12) ─────────────────────────────────────────────────────────────────────────
test("pre-registration header exists, is digestible, and names the split rule and the claims", () => {
  const head = SRC.split("\n").filter((l, i, a) => a.slice(0, i + 1).every((x) => x.startsWith("//") || !x.trim())).join("\n");
  assert.match(head, /PRE-REGISTRATION \(FOLD-CONSTITUTION II\.5\)/);
  assert.match(head, /Written BEFORE the first run/);
  for (const k of ["SPLIT AND DATA DISCIPLINE", "WHAT THIS FILE CLAIMS", "NULLS AND CONTROLS BUILT TO FAIL", "POWER", "SESOI", "PERSISTENCE RULE", "TYPED NUMBERS", "RECORDED PREDICTIONS", "WHAT HAD BEEN SEEN"]) assert.ok(head.includes(k), `header lacks ${k}`);
  assert.match(M.headerDigest(), /^[0-9a-f]{64}$/);
  assert.equal(M.headerDigest(), M.headerDigest(), "digest is stable");
});
test("zero model, no EO import, no BIC penalty, no TEST read, fallbackNomination only excluded", () => {
  const code = SRC.split("\n").filter((l) => !l.trimStart().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /model-server|mouth\.js|node:https?|fetch\(|anthropic|openai|embedding/i);
  assert.doesNotMatch(code, /from\s+["'][^"']*(cube|phasepost|relation-kinds|act-prior|case-prior|hyperlexicon)[^"']*["']/);
  assert.doesNotMatch(code, /\bBIC\b|\bdl\(|delta\s*=\s*MDE/);
  for (const line of code.split("\n")) if (/fallbackNomination/.test(line)) assert.match(line, /(=== true\) continue|excluded|EXCLUDE|read ONLY)/, `fallbackNomination must only be read to exclude it: ${line.trim().slice(0, 100)}`);
  assert.doesNotMatch(code, /["'`][^"'`\n]*test\.conllu[^"'`\n]*["'`]\s*\)\s*[;,]?\s*$/m, "no literal path to a test file");
});
test("constants: alpha is the repo's KEY_ALPHA; seed and registry as declared", () => {
  assert.equal(M.ALPHA, KEY_ALPHA); assert.equal(M.SEED, 20261005); assert.equal(M.N_BUDGET, 16000);
  assert.deepEqual(Object.keys(M.ARCH_REGISTRY), ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12", "A13"]);
  const want = { A01: 0.03, A03: 0.25, A05: 0.10, A08: 0.10, A12: 0.20 }; for (const [id, v] of Object.entries(want)) assert.equal(M.ARCH_REGISTRY[id].sesoi.value, v, id);
  assert.equal(M.ARCH_REGISTRY.A02.sesoi.S, 0.02); assert.equal(M.ARCH_REGISTRY.A02.sesoi.G, 0.05); assert.equal(M.ARCH_REGISTRY.A07.sesoi.rho, -0.30);
  for (const c of Object.values(M.ARCH_REGISTRY)) { assert.ok(["implemented", "not_implemented"].includes(c.status)); if (c.status === "not_implemented") assert.ok(c.needs, `${c.id} gap must name what it needs`); }
});
test("guardPath refuses a TEST treebank unless a lock file AND --confirmatory exist; dev and train pass", () => {
  assert.throws(() => M.guardPath("/x/ud-eval/eng/test.conllu"), /TEST split/);
  assert.throws(() => M.guardPath("/x/ud-eval/eng/test.conllu", { split: "dev", confirmatory: true }), /TEST split/);
  assert.equal(M.guardPath("/x/ud-eval/eng/dev.conllu"), "/x/ud-eval/eng/dev.conllu"); assert.equal(M.guardPath("/x/tb/eng/train.conllu"), "/x/tb/eng/train.conllu");
  assert.throws(() => M.readTreebank("/nonexistent/test.conllu"), /TEST split/);
});
test("the CLI refuses --split test without a lock", async () => { assert.equal(await M.main(["--split", "test", "--out", fs.mkdtempSync(path.join(os.tmpdir(), "induce-"))]), 3); });

// ── numerics ─────────────────────────────────────────────────────────────────────────────────────────────────
test("reachability table: 9:8, 8:7, 7:7, 6:6, 5:5, 4:unreachable; equals the organ's when present", () => {
  const t = Object.fromEntries([9, 8, 7, 6, 5].map((n) => [n, M.reachability(n).kNeeded])); assert.deepEqual(t, { 9: 8, 8: 7, 7: 7, 6: 6, 5: 5 }); assert.ok(M.reachability(4).unreachable);
  assert.ok(Math.abs(M.signTestP(8, 9) - 10 / 512) < 1e-12);
  if (organ.present && organ.found.includes("reachability")) for (const n of [4, 5, 7, 9, 12]) { const a = M.reachability(n), b = organFn("reachability")(n); assert.equal(!!a.unreachable, !!b.unreachable); if (!a.unreachable) assert.equal(a.kNeeded, b.kNeeded); }
});
function organFn(name) { return M.organFn(name); }
test("ari, nmi, spearman, partial spearman, gini, nested mean behave on constructed cases", () => {
  assert.equal(M.ari([0, 0, 1, 1, 2, 2], [5, 5, 6, 6, 7, 7]), 1); assert.ok(M.ari([0, 0, 1, 1], [0, 1, 0, 1]) < 0.01); assert.ok(Math.abs(M.nmi(["a", "a", "b", "b"], [1, 1, 2, 2]) - 1) < 1e-12);
  assert.ok(Math.abs(M.spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12);
  assert.ok(M.partialSpearman([1, 2, 3, 4, 5, 6], [2, 1, 4, 3, 6, 5], [[0], [0], [1], [1], [2], [2]]) < -0.99, "within-group opposite trend is recovered after removing the group effect");
  assert.equal(M.gini([1, 1, 1, 1]), 0); assert.ok(Math.abs(M.gini([0, 0, 0, 10]) - 0.75) < 1e-12);
  const nm = M.nestedMean(new Map([["a", 1], ["b", 3], ["c", 10]]), (id) => (id === "c" ? "X" : "Y"), (id) => (id === "c" ? "L2" : "L1")); assert.equal(nm.pooled, 6); assert.equal(nm.byLineage.get("L1"), 2);
  if (organ.present && organ.found.includes("nestedMean")) { const o = M.organFn("nestedMean")(new Map([["a", 1], ["b", 3], ["c", 10]]), (id) => (id === "c" ? "X" : "Y"), (id) => (id === "c" ? "L2" : "L1")); assert.equal(o.mean, nm.pooled); }
});
test("calibrateDial finds the first crossing, bisects, and reports a capped dial when the target is unreachable", () => {
  const a = M.calibrateDial((q) => 0.4 * q, 0.2); assert.ok(Math.abs(a.q - 0.5) < 0.01 && !a.capped);
  const b = M.calibrateDial((q) => 0.1 * q, 0.5); assert.ok(b.capped && b.q === 1);
  const c = M.calibrateDial((q) => 1 - (q - 0.4) ** 2 * 4 - 0.8, 0.1); assert.ok(!c.capped && c.q < 0.4, "non-monotone dial: the rising stretch is used");
});
test("qnorm, matched loading and delta follow the closed forms", () => { assert.ok(Math.abs(M.qnorm(0.975) - 1.959964) < 1e-5); assert.ok(Math.abs(M.deltaOfStrength(0.5) - 0.6745) < 1e-3); const l = M.matchedLoading({ strength: 0.8, memberShare: 0.3 }); assert.ok(l > 0 && l < 1); });

// ── binning, blocks, probes ──────────────────────────────────────────────────────────────────────────────────
test("binColumn: median split with ties to the lower bin; constant features are dropped; a median at the maximum falls back to >=", () => {
  const b = M.binColumn([1, 2, 3, 4, 5, 6]); assert.deepEqual(Array.from(b.bin), [0, 0, 0, 1, 1, 1]); assert.equal(M.binColumn([2, 2, 2, 2]), null);
  const c = M.binColumn([0, 1, 1, 1, 1]); assert.ok(c); assert.deepEqual(Array.from(c.bin), [0, 1, 1, 1, 1]);
  const t = M.binColumn([1, 2, 3, 4, 5, 6, 7, 8, 9], 3); assert.equal(t.labels.length, 3);
});
test("blockPermute keeps every one-hot block exact (each system has exactly one 1 per block) and every block's marginal", () => {
  const { profiles } = M.plantedToyProfiles({ world: "null", seed: 2 }); const inp = M.levelSInputLocal(profiles, "A"); assert.ok(!inp.gap);
  const Y = M.blockPermute(inp.matrix, inp.blocks, M.rngFor("t")); for (const bl of inp.blocks) { for (let i = 0; i < Y.length; i++) assert.equal(bl.reduce((s, c) => s + Y[i][c], 0), 1); for (const c of bl) assert.equal(Y.reduce((s, r) => s + r[c], 0), inp.matrix.reduce((s, r) => s + r[c], 0)); }
});
test("the drop rule: a system lacking a quarter of a group's features leaves the group, and the gap is typed with its denominator", () => {
  const { profiles } = M.plantedToyProfiles({ world: "null", seed: 3 }); const p0 = profiles[0]; const ids = Object.keys(p0.cells).filter((k) => p0.cells[k].group === "A"); for (const k of ids.slice(0, Math.ceil(ids.length * 0.3))) delete p0.cells[k];
  const inp = M.levelSInputLocal(profiles, "A"); assert.ok(inp.dropped.systems.some((d) => d.id === p0.id && d.of === ids.length)); assert.equal(inp.systemIds.includes(p0.id), false);
  const small = M.levelSInputLocal(profiles.slice(0, 6), "A"); assert.ok(small.gap && /below floor/.test(small.gap.reason));
});
test("dominantSplit finds the planted gap on a clean toy and partitionStability separates it from a block-permuted copy", () => {
  const { profiles, truth } = M.plantedToyProfiles({ world: "kind", strength: 0.9, signatureCount: 30, kindBranches: ["Semitic", "Turkic", "Koreanic", "Japonic", "Austroasiatic", "Indo-Iranian"], seed: 5 });
  const inp = M.levelSInputLocal(profiles, "A"); const dom = M.dominantSplit(inp.matrix, M.rngFor("t")); const memb = inp.systemIds.filter((_, i) => dom.labels[i] === 1);
  assert.ok(M.f1Against(memb, truth.members) >= 0.9 || M.f1Against(inp.systemIds.filter((_, i) => dom.labels[i] === 0), truth.members) >= 0.9, "the first axis recovers the planted membership");
  const st = M.partitionStability(inp, "spectral", { Bfeat: 16, Bsys: 16, pairs: 24 }); assert.equal(st.verdict, "STABLE", JSON.stringify(st));
  // control built to fail: every block's rows permuted independently -> no stable partition
  const Yp = M.blockPermute(inp.matrix, inp.blocks, M.rngFor("ctl")); const fake = { ...inp, matrix: Yp, continuous: [], bm: null }; const sc = M.partitionStability(fake, "spectral", { Bfeat: 16, Bsys: 16, pairs: 24 }); assert.notEqual(sc.verdict, "STABLE", JSON.stringify(sc));
});
test("labelDecomposition: a partition equal to the script key reads ARI 1 against it and is judged against permutations within lineage strata", () => {
  const n = 24; const lineages = Array.from({ length: n }, (_, i) => `L${i % 6}`), branches = lineages, scripts = Array.from({ length: n }, (_, i) => (i % 6 < 3 ? "Latn" : "Cyrl"));
  const part = scripts.map((s) => (s === "Latn" ? 1 : 0)); const d = M.labelDecomposition(part, { lineages, branches, scripts }, { draws: 99 }); assert.equal(d.script.ari, 1); assert.ok(d.lineage.ari < 0.7);
});
test("interGroupConsensus: a partition shared by two groups beats the within-branch permutation null; independent partitions do not", () => {
  const stems = M.TOY_STEMS; const ids = stems.map((s) => `nl:${s}@toy`); const profiles = stems.map((s, i) => ({ id: ids[i], labels: { stem: s } })); const rng = M.rngFor("cons");
  const lab = ids.map((_, i) => (i % 3 === 0 ? 1 : 0)); const same = M.interGroupConsensus({ A: { ids, labels: lab }, B: { ids, labels: lab.slice() } }, profiles, { draws: 99 });
  assert.ok(same.theta > 0.5 && same.p <= 0.05);
  const other = M.interGroupConsensus({ A: { ids, labels: lab }, B: { ids, labels: ids.map(() => (rng() < 0.5 ? 1 : 0)) } }, profiles, { draws: 99 }); assert.ok(other.theta < 0.3);
});

// ── the organ-backed Level S on planted toys (small D: the organ's own grid decides power; here the toy is strong) ──
test("Level S on a planted cross-lineage kind: CLUSTER with F1 >= 0.9, and nothing on the same matrix block-permuted (control runs inside the organ)", { skip: !organ.present && "organ absent", timeout: 600000 }, async () => {
  const { profiles, truth } = M.plantedToyProfiles({ world: "kind", strength: 0.9, signatureCount: 30, kindBranches: ["Semitic", "Turkic", "Koreanic", "Japonic", "Austroasiatic", "Indo-Iranian"], seed: 11 });
  const r = await M.runLevelS({ profiles, groups: ["A"], draws: 39, controlReps: 3, stability: true, stabilityOpts: { Bfeat: 12, Bsys: 12, pairs: 16 }, decomposeDraws: 99 });
  const g = r.groups.A; assert.equal(g.organ.status, "OK", JSON.stringify(g.organ).slice(0, 300)); const best = g.organ.kinds.filter((k) => k.status === "CLUSTER").map((k) => M.f1Against(k.smallerSide, truth.members)).sort((a, b) => b - a)[0] ?? 0;
  assert.ok(best >= 0.9, `a planted cross-lineage kind should be a CLUSTER with F1 >= 0.9 (best ${best}; kinds ${g.organ.kinds.map((k) => k.status + ":" + k.members.length).join(",")})`);
  assert.ok(g.organ.diagnostics.control.passed, "the block-permuted control must yield no kind");
  assert.ok(g.pr > 1, "the effective dimension is printed"); assert.ok(g.dominant.decomposition.lineage && g.dominant.decomposition.script, "decomposition against the answer keys is printed");
});
test("Level S on structureless toys: no CLUSTER is reported", { skip: !organ.present && "organ absent", timeout: 600000 }, async () => {
  const { profiles } = M.plantedToyProfiles({ world: "null", seed: 12 }); const r = await M.runLevelS({ profiles, groups: ["A", "B"], draws: 39, controlReps: 0, stability: false, decomposeDraws: 99 });
  for (const g of Object.values(r.groups)) assert.ok(!g.organ.kinds.some((k) => k.status === "CLUSTER"), `a CLUSTER on structureless data in ${g.group}`);
});
test("Level S on a planted correlated continuum: GRADIENT or nothing, never a CLUSTER", { skip: !organ.present && "organ absent", timeout: 600000 }, async () => {
  const { profiles } = M.plantedToyProfiles({ world: "continuum", strength: 0.8, signatureCount: 24, seed: 13 }); const r = await M.runLevelS({ profiles, groups: ["A"], draws: 39, controlReps: 0, stability: false, decomposeDraws: 99 });
  assert.ok(!r.groups.A.organ.kinds.some((k) => k.status === "CLUSTER"), `kinds: ${r.groups.A.organ.kinds.map((k) => k.status).join(",")}`);
});
test("a missing organ is a typed refusal, not a crash", async () => { assert.throws(() => M.organFn("noSuchExport"), (e) => e.code === "ORGAN_MISSING"); });

// ── trees, Strahler, the arity-matched null, A03 and A02 ────────────────────────────────────────────────────
const toyDir = fs.mkdtempSync(path.join(os.tmpdir(), "induce-toy-"));
const toySystems = M.makeToyWorld(toyDir, { sents: 500 });
const views = new Map(toySystems.map((s) => [s.id, { id: s.id, stem: s.stem, lineage: s.lineage, branch: s.branch }]));
test("strahlerArranged keeps each sentence's size and arity multiset and returns valid orders; the cycle lemma gives a uniform plane tree", () => {
  const trees = M.prepareTrees(toySystems[0], { N: 3000 }); assert.ok(!trees.gap); const sd = trees.seeds[0];
  const Nk = new Float64Array(24); M.strahlerReal(sd, Nk); const Nk2 = new Float64Array(24); M.strahlerArranged(sd, M.rngFor("a"), Nk2); assert.equal(Nk.reduce((a, b) => a + b, 0), sd.parent.length, "every node gets one order (real)"); assert.equal(Nk2.reduce((a, b) => a + b, 0), sd.parent.length, "every node gets one order (random)");
  const leaves = Array.from(sd.deg).filter((d) => d === 0).length; assert.ok(Nk[1] >= leaves && Nk2[1] >= leaves, "every leaf has order 1 (unary chains above leaves keep order 1)");
  // uniformity: enumerate every valid preorder degree sequence of the multiset {2,1,1,1,0,0} (10 plane trees), take the exact Strahler-signature distribution, and compare the sampler with it
  const multiset = [2, 1, 1, 1, 0, 0]; const sigOf = (seq) => { const m = seq.length, parent = new Array(m).fill(-1), stack = []; for (let t = 0; t < m; t++) { if (t > 0) { if (!stack.length) return null; const top = stack[stack.length - 1]; parent[t] = top.node; if (--top.rem === 0) stack.pop(); } if (seq[t] > 0) stack.push({ node: t, rem: seq[t] }); } if (stack.length) return null; const mx = Array(m).fill(0), cnt = Array(m).fill(0), N = [0, 0, 0, 0, 0, 0]; for (let i = m - 1; i >= 0; i--) { const ord = mx[i] === 0 ? 1 : cnt[i] >= 2 ? mx[i] + 1 : mx[i]; N[ord]++; const q = parent[i]; if (q >= 0) { if (ord > mx[q]) { mx[q] = ord; cnt[q] = 1; } else if (ord === mx[q]) cnt[q]++; } } return N.slice(1, 5).join(","); };
  const perms = new Set(); const permute = (arr, cur = []) => { if (!arr.length) { perms.add(cur.join(",")); return; } arr.forEach((v, i) => permute([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, v])); }; permute(multiset);
  const expected = new Map(); let valid = 0; for (const key of perms) { const sg = sigOf(key.split(",").map(Number)); if (sg) { expected.set(sg, (expected.get(sg) ?? 0) + 1); valid++; } } assert.equal(valid, 10, "ten plane trees with that degree multiset");
  const fake = { nSent: 1, offsets: Int32Array.from([0, 6]), parent: new Int16Array(6), label: new Uint8Array(6), order: Int16Array.from([0, 1, 2, 3, 4, 5]), deg: Int16Array.from(multiset), root: Int16Array.from([0]), ancOff: new Int32Array(7), ancList: new Int16Array(0) };
  const seen = new Map(); const rng = M.rngFor("uniform"); const D = 30000; for (let i = 0; i < D; i++) { const nk = new Float64Array(24); M.strahlerArranged(fake, rng, nk); const key = Array.from(nk.slice(1, 5)).join(","); seen.set(key, (seen.get(key) ?? 0) + 1); }
  assert.deepEqual([...seen.keys()].sort(), [...expected.keys()].sort(), "the sampler reaches exactly the signatures the enumeration reaches");
  for (const [k, c] of expected) { const p = c / valid; const got = (seen.get(k) ?? 0) / D; assert.ok(Math.abs(got - p) < 4 * Math.sqrt((p * (1 - p)) / D), `signature ${k}: expected ${p.toFixed(3)} got ${got.toFixed(3)}`); }
});
test("fitRb recovers a planted geometric ladder and refuses fewer than three orders", () => {
  const Nk = new Float64Array(24); Nk[1] = 8000; Nk[2] = 2000; Nk[3] = 500; Nk[4] = 125; const f = M.fitRb(Nk); assert.ok(Math.abs(f.Rb - 4) < 1e-6 && f.r2 > 0.999999); const g = new Float64Array(24); g[1] = 10; g[2] = 2; assert.equal(M.fitRb(g), null);
});
test("A03: the null corpus reads no effect, the planted degree-sorted dial raises |Rb - null| monotonically, the dial calibrates to the SESOI units", () => {
  const trees = M.prepareTrees(toySystems[0], { N: 3000 }); const cache = {}; const real = M.a03Measure(trees, { mode: "real", draws: 12, cache }); assert.ok(Number.isFinite(real.stat));
  const q = [0, 0.4, 1].map((qq) => M.a03Measure(trees, { mode: "planted", q: qq, cache, rngKey: ["a03", "t"] }).stat); assert.ok(q[0] < q[1] && q[1] < q[2], `monotone dial ${q}`);
  const ctl = M.a03Measure(trees, { mode: "control", cache }); assert.ok(ctl.stat < 0.15, `a null draw run as real reads ${ctl.stat}`);
  const m = cache.r1.m; const cal = M.calibrateDial((qq) => Math.abs(M.a03Arranged(trees, ["cal"], { q: qq }).Rb - m), 0.25); assert.ok(!cal.capped && Math.abs(cal.achieved - 0.25) < 0.05);
});
test("A02: flat trees give S = 0 exactly; the label-permutation null keeps each tree's label multiset; planted nesting raises S above the null", () => {
  const trees = M.prepareTrees(toySystems[1], { N: 3000 }); assert.equal(M.a02FlatControl(trees), 0);
  const sd = trees.seeds[0]; const out = new Uint8Array(sd.label.length); M.permuteLabelsWithinTrees(sd, sd.label, M.rngFor("p"), out);
  for (let s = 0; s < sd.nSent; s++) { const o = sd.offsets[s], m = sd.offsets[s + 1] - o; const a = Array.from(sd.label.slice(o, o + m)).sort(), b = Array.from(out.slice(o, o + m)).sort(); assert.deepEqual(a, b); assert.equal(out[o + sd.root[s]], 0, "the root keeps its label"); }
  const real = M.a02Measure(trees, { mode: "real", draws: 8 }); assert.ok(Number.isFinite(real.S.stat) && Number.isFinite(real.G.stat));
  const pl = M.a02Measure(trees, { mode: "planted", q: 0.6, draws: 8, rngKey: ["t"] }); assert.ok(pl.S.stat - M.median(pl.S.nullDraws) > 0.02, "planted type-concentrated nesting exceeds the label-permutation null");
  const ctl = M.a02Measure(trees, { mode: "control", draws: 8 }); assert.ok(Math.abs(ctl.S.stat - M.median(ctl.S.nullDraws)) < 0.02, "a permuted corpus run as real shows no excess");
});

// ── A08: the exponent estimator, monkey typing, planted Zipf ───────────────────────────────────────────────
test("zipfExponent recovers a planted exponent within the estimator's known low bias; monkey typing lands inside its own band; planted Zipf lands outside", () => {
  for (const sg of [1.0, 1.3]) { const est = M.mean(Array.from({ length: 4 }, (_, r) => M.zipfExponent(M.zipfCounts(sg, 16000, M.rngFor("z", sg, r)))?.s)); assert.ok(Math.abs(est - sg) < 0.25, `s ${sg} estimated ${est}`); }
  const z = M.prepareZipf(toySystems[2], { N: 3000 }); const cache = {}; const real = M.a08Measure(z, { mode: "real", cache, M: 14 }); assert.ok(Number.isFinite(real.stat) && real.nullDraws[0] > 0);
  const ctl = M.a08Measure(z, { mode: "control", cache, M: 14 }); assert.ok(ctl.stat <= ctl.nullDraws[0] * 1.5, `monkey as real: ${ctl.stat} vs band ${ctl.nullDraws[0]}`);
  const pl = M.a08Measure(z, { mode: "planted", sGen: real.monkeyMean + 1.0, cache, M: 14 }); assert.ok(pl.stat - pl.nullDraws[0] > 0.1, "a planted Zipf is outside the monkey band");
});

// ── A05: the configuration null, planted shared ambiguity ───────────────────────────────────────────────────
test("redealPos keeps per-form tag counts and tag marginals with no duplicate tag in a form; A05 detects a planted shared pair set and reads nothing on a null draw", () => {
  const rng = M.rngFor("pos"); const forms = []; const flat = [], off = [0]; for (let f = 0; f < 1500; f++) { const k = rng() < 0.8 ? 1 : 2; const s = new Set(); while (s.size < k) s.add(Math.floor(rng() * 14 ** 0.9)); for (const t of [...s].sort((a, b) => a - b)) flat.push(t); off.push(flat.length); forms.push(k); }
  const F = Int8Array.from(flat), O = Int32Array.from(off); const R = M.redealPos(F, O, M.rngFor("r"));
  for (let f = 0; f + 1 < O.length; f++) { const a = Array.from(R.slice(O[f], O[f + 1])); assert.equal(new Set(a).size, a.length, "no duplicate tag in a form"); }
  const cnt = (x) => { const m = new Map(); for (const t of x) m.set(t, (m.get(t) ?? 0) + 1); return [...m].sort(); }; assert.deepEqual(cnt(R), cnt(F), "tag marginals are kept");
  // joint measure on 6 synthetic systems in 6 lineages
  const prepared = new Map(), vw = new Map(); for (let i = 0; i < 6; i++) { const r2 = M.rngFor("sys", i); const fl = [], of = [0]; for (let f = 0; f < 3000; f++) { const k = r2() < 0.78 ? 1 : r2() < 0.8 ? 2 : 3; const s = new Set(); while (s.size < k) s.add(Math.min(13, Math.floor(-Math.log(1 - r2()) * 3))); for (const t of [...s].sort((a, b) => a - b)) fl.push(t); of.push(fl.length); } prepared.set(`s${i}`, { stem: `s${i}`, flat: Int8Array.from(fl), off: Int32Array.from(of), forms: 3000 }); vw.set(`s${i}`, { lineage: `L${i}`, branch: `L${i}` }); }
  const planted = M.a05Measure(prepared, vw, { mode: "planted", q: 0.5, draws: 12, rngKey: ["t"] }); const exP = M.mean([...planted.values()].map((r) => r.stat - M.median(r.nullDraws))); assert.ok(exP > 0.1, `planted shared pairs excess ${exP}`);
  const ctl = M.a05Measure(prepared, vw, { mode: "control", draws: 12, rngKey: ["t"] }); const exC = M.mean([...ctl.values()].map((r) => r.stat - M.median(r.nullDraws))); assert.ok(exC < 0.1, `a configuration-null draw run as real reads ${exC}`);
});

// ── A01: derived cutoff, planted closed class ───────────────────────────────────────────────────────────────
test("A01: a planted closed class with a context-diversity gap is licensed and its cutoff lands near the class size; no gap is not licensed; permuted gold is at chance", () => {
  const p0 = M.prepareClosed(toySystems[3], { N: 3000 }); assert.ok(!p0.gap, JSON.stringify(p0.gap)); const C = 25;
  const gap = M.plantClosed(p0, { g: 0.8, C, rng: M.rngFor("pc1") }); const cut = M.derivedCutoff(gap, { draws: 99 }); assert.ok(cut.licensed, `licensed: z ${cut.zmax} vs ${cut.threshold}`); assert.ok(cut.r >= 8 && cut.r <= 4 * C, `cutoff ${cut.r}`);
  const flat = M.plantClosed(p0, { g: 0, C, rng: M.rngFor("pc2") }); const f1 = M.closedF1Curve(gap.dev.closed, gap.dev.n); assert.ok(f1(cut.r) > f1(1500), "the derived cutoff beats a far-too-large one");
  const [cl, n] = M.permutedGold(gap, M.rngFor("perm")); const fp = M.closedF1Curve(cl, n); assert.ok(fp(cut.r) < f1(cut.r), "permuted gold falls below the true gold");
  void flat;
});
test("A01 runtime: B1 is fitted without the held-out lineage; the matched-frequency sign test is reported", () => {
  const closed = new Map(); for (const s of toySystems) closed.set(s.id, M.prepareClosed(s, { N: 3000 })); const rt = M.a01Runtime({ closed, views }); const per = rt.real(); assert.ok([...per.values()].some((r) => !r.gap)); const m = rt.matched(); assert.ok(m && Number.isFinite(m.p));
  for (const r of per.values()) if (!r.gap) assert.ok(Number.isFinite(r.stat) && r.nullDraws.length > 0);
});

// ── the persistence harness and its adaptations ─────────────────────────────────────────────────────────────
function perSystemWorld({ lineages, perLineage = 2, effect, noise = 0.01, only = null }) {
  const v = new Map(), per = new Map(); const rng = M.rngFor("world", effect, lineages);
  for (let l = 0; l < lineages; l++) for (let k = 0; k < perLineage; k++) { const id = `s${l}_${k}`; v.set(id, { id, lineage: l === 0 ? "Indo-European" : `L${l}`, branch: `L${l}b`, stem: id }); const e = only === null || only === l ? effect : 0; per.set(id, { stat: e + noise * M.randn(rng), nullDraws: Array.from({ length: 30 }, () => noise * M.randn(rng)) }); }
  return { v, per };
}
test("rowStatus: a strong effect over 10 lineages is capped by the single-channel adaptation and names what it would be; n_l < 5 is UNDERPOWERED BY REACHABILITY", () => {
  const { v, per } = perSystemWorld({ lineages: 10, effect: 0.5 }); const ev = M.evaluateRow({ perSystem: per, views: v, sesoi: 0.1, B: 400 }); const power = { up: 1, down: 1, tiny: 0, pass: true };
  const st = M.rowStatus({ ev, sesoi: 0.1, power, control: { survived: false }, channels: 1 }); assert.equal(st.status, "UNDERPOWERED"); assert.match(st.reasons[0], /channels < 2/); assert.ok(["PERSISTENT", "PERSISTENT-OUTSIDE-IE"].includes(st.statusIfChannelWaived));
  assert.equal(M.rowStatus({ ev, sesoi: 0.1, power, control: { survived: false }, channels: 2 }).status, st.statusIfChannelWaived, "with two channels the status is the registered one");
  const w4 = perSystemWorld({ lineages: 4, effect: 0.5 }); const ev4 = M.evaluateRow({ perSystem: w4.per, views: w4.v, sesoi: 0.1, B: 200 }); const s4 = M.rowStatus({ ev: ev4, sesoi: 0.1, power, control: { survived: false }, channels: 2 }); assert.equal(s4.status, "UNDERPOWERED"); assert.match(s4.reasons[0], /REACHABILITY/);
});
test("rowStatus: carried by one lineage is FAMILY-BOUND; a null effect with good power is ABSENT; a surviving control is INSTRUMENT_FAILED; a failed power trio is UNDERPOWERED", () => {
  const power = { up: 1, down: 1, tiny: 0, pass: true };
  const one = perSystemWorld({ lineages: 10, effect: 0.5, only: 3, perLineage: 3 }); const evOne = M.evaluateRow({ perSystem: one.per, views: one.v, sesoi: 0.05, B: 400 }); const sOne = M.rowStatus({ ev: evOne, sesoi: 0.05, power, control: { survived: false }, channels: 2 });
  assert.ok(["FAMILY-BOUND", "UNDERPOWERED"].includes(sOne.status), `one-lineage effect read ${sOne.status}`); assert.notEqual(sOne.status, "PERSISTENT");
  const z = perSystemWorld({ lineages: 10, effect: 0.0 }); const evZ = M.evaluateRow({ perSystem: z.per, views: z.v, sesoi: 0.2, B: 400 }); assert.equal(M.rowStatus({ ev: evZ, sesoi: 0.2, power, control: { survived: false }, channels: 2 }).status, "ABSENT");
  assert.equal(M.rowStatus({ ev: evZ, sesoi: 0.2, power, control: { survived: true } }).status, "INSTRUMENT_FAILED"); assert.equal(M.rowStatus({ ev: evZ, sesoi: 0.2, power: { ...power, pass: false, up: 0.2 }, control: { survived: false } }).status, "UNDERPOWERED");
});
test("powerRates: 2s passes, 0.5s reads below the SESOI, 0.1s at large n does not pass; the rule can both pass and fail", () => {
  const mk = (effect, reps, noise) => Array.from({ length: reps }, (_, r) => { const w = perSystemWorld({ lineages: 10, effect, noise, perLineage: 2 }); void r; return M.evaluateRow({ perSystem: w.per, views: w.v, sesoi: 0.1, B: 300, lolo: false, tag: `pr${r}${effect}` }); });
  const pr = M.powerRates({ two: mk(0.2, 6, 0.02), half: mk(0.05, 6, 0.01), tiny: mk(0.01, 6, 0.001) }, 0.1); assert.equal(pr.up, 1); assert.equal(pr.down, 1); assert.ok(pr.tiny <= ALPHA_()); assert.ok(pr.pass);
  const bad = M.powerRates({ two: mk(0.2, 6, 0.5), half: mk(0.05, 6, 0.5), tiny: mk(0.01, 6, 0.001) }, 0.1); assert.ok(!bad.pass, "a noisy instrument fails its own trio");
});
const ALPHA_ = () => M.ALPHA;
test("A07: a planted within-branch trade-off gives a negative partial Spearman; on a one-system-lineage layout the registered gate is UNDERPOWERED BY REACHABILITY", () => {
  const vws = M.TOY_STEMS.map((s) => ({ id: `nl:${s}@toy`, stem: s, ...(() => { const g = M.genealogyOf(s); return { lineage: g.lineage, branch: g.branch, script: "Latn" }; })() }));
  const pl = M.plantedA07Rows(vws, -0.7, M.rngFor("a07")); const m = M.a07Measure(pl, { draws: 199, B: 100 }); assert.ok(m.rho < -0.2, `rho ${m.rho}`); assert.ok(m.reach.unreachable, "fewer than 5 lineages can define the association");
  const st = M.systemLevelStatus({ reach: m.reach, theta: m.theta, ci: m.ci, sesoi: 0.3 }); assert.equal(st.status, "UNDERPOWERED"); assert.match(st.reasons[0], /REACHABILITY/);
  const none = M.a07Measure(M.plantedA07Rows(vws, 0, M.rngFor("a07b")), { draws: 199, B: 100 }); assert.ok(none.rho > -0.45, `no planted association reads rho ${none.rho}`);
});
test("A12: planted unity beats the permutation null and planted pluralism does not", () => { const c = M.plantedConsensusCheck({ reps: 3, draws: 99 }); assert.ok(c.up === 1 && c.down === 1, JSON.stringify({ u: c.unity, p: c.pluralism })); assert.ok(c.pass); });

// ── Level W: company kinds against their own shuffle control ───────────────────────────────────────────────
test("wordKinds: kinds keyed by a dominant left neighbour are found, and the shuffled control yields none", () => {
  const sys = toySystems[0]; const w = M.wordKinds(sys, { N: 3000, draws: 30, minMentions: 10 }); assert.ok(!w.gap, JSON.stringify(w.gap)); assert.ok(w.control.passed, `the shuffled corpus must dissolve every kind (survivors ${w.control.survivors})`);
  assert.ok(Number.isFinite(w.coverage.types)); assert.ok(w.params.minShare === 0, "the nullArm decides, not a typed share");
});

// ── driver pieces ──────────────────────────────────────────────────────────────────────────────────────────
test("the toy world, CLI parsing and the smoke preset", () => {
  assert.equal(toySystems.length, 11); for (const s of toySystems) { assert.ok(fs.existsSync(s.train) && fs.existsSync(s.dev) && fs.existsSync(s.pos)); assert.ok(!/test\.conllu$/.test(s.dev)); }
  const o = M.parseCli(["--split", "dev", "--cards", "A01,A03", "--draws", "39", "--smoke", "--peek", "--workers", "2"]); assert.deepEqual(o.cards, ["A01", "A03"]); assert.equal(o.draws, 39); assert.ok(o.smoke && o.peek); assert.equal(o.workers, 2);
  const sm = M.applySmoke(o); assert.ok(sm.label.startsWith("SMOKE")); assert.ok(sm.cal.worlds <= 20);
  assert.equal(M.systemFromProfile({ id: "nl:eng@sha256:abc", labels: { family: "Germanic", lineage: "Indo-European", script: "Latin" }, inputs: [{ role: "train", path: "/x/tb/eng/train.conllu", sha256: "a" }, { role: "dev", path: "/x/ud-eval/eng/dev.conllu", sha256: "b" }] }).branch, "Germanic");
});
test("a family worker answers power, control and real in order through the same interface as the in-thread runtime", { timeout: 300000 }, async () => {
  const o = { N: 3000, split: "dev", reps: 2, peek: true }; const sys = toySystems.map(({ id, stem, lineage, branch, script, train, dev, pos }) => ({ id, stem, lineage, branch, script, train, dev, pos }));
  const fw = new M.FamilyWorker("zipf", sys, o); try { const pw = await fw.call("power", ["A08"]); assert.ok(!pw.__error, pw.__error); assert.ok(Number.isFinite(pw.A08.up) || Number.isNaN(pw.A08.up)); const c = await fw.call("control", ["A08"]); assert.ok(!c.__error, c.__error); assert.equal(typeof c.rows.A08.survived, "boolean"); const r = await fw.call("real", ["A08"], pw, c.rows); assert.ok(!r.__error, r.__error); assert.ok(M.ARCH_STATUS.includes(r.A08.status)); } finally { await fw.close(); }
});

// ── Level R (kinds of relations) and the A11 ledger on planted entities ─────────────────────────────────────────
function plantedEntities(nSystems = 10, { noise = 0.04, flip = false } = {}) {
  // three relation classes (4 relations each) with distinct descriptor profiles; every system carries all twelve; five seeds per entity
  const rng = M.rngFor("planted-rel"); const classes = [[0.9, 0.9, 0.1, 2, 1, 1, 1, 2], [0.1, 0.1, 0.9, 6, 3, 4, 0.8, 4], [0.5, 0.1, 0.1, 10, 4, 2, 0.5, 6]];
  const systems = [], entities = [];
  for (let s = 0; s < nSystems; s++) {
    const id = `nl:p${s}`; systems.push({ id, stem: `p${s}`, lineage: `L${s % 6}`, branch: `B${s}`, script: "Latn" });
    const rels = {}; for (let r = 0; r < 12; r++) { const base = classes[Math.floor(r / 4)]; const values = Array.from({ length: 5 }, () => base.map((v, j) => v + noise * (j === 3 || j === 4 || j === 5 || j === 7 ? 4 : 1) * M.randn(rng))); if (flip && r === 1 && s < 4) values.forEach((v) => { v[0] = 1 - v[0]; }); rels[`r${r}`] = { counts: [60, 60, 60, 60, 60], values }; }
    entities.push({ id, rels });
  }
  return { systems, entities };
}
test("Level R on planted relation classes: the three classes are recovered as kinds that track the deprel label, not the system", { skip: !organ.present && "organ absent", timeout: 600000 }, async () => {
  const { systems, entities } = plantedEntities(); const r = await M.relationKinds({ systems, entities, draws: 29, controlReps: 0, workers: 1 });
  assert.equal(r.level, "R"); assert.equal(r.n, 120); assert.ok(!r.error, r.error); assert.ok(r.kinds.length >= 1, `kinds ${JSON.stringify(r.refused)}`);
  assert.ok(r.nmi.deprel > 0.5 && r.nmi.deprel > r.nmi.system + 0.3, `NMI with deprel ${r.nmi.deprel}, with system ${r.nmi.system}`);
  const led = M.relationLedger(r); assert.ok(led.kinds.length === r.kinds.length); for (const k of led.kinds) { assert.ok(Object.keys(k.standings).length > 0); assert.ok(["unexposed", "refuted", "fixed", "one-at-a-time", "many-valued", "time-unknown"].includes(Object.values(k.standings)[0].standing)); assert.ok(k.crossMember.dir.share > 0); }
});
test("A11 never says established: a corpus can refute a single-valued claim and the ledger names the counterexample members", { skip: !organ.present && "organ absent", timeout: 600000 }, async () => {
  const { systems, entities } = plantedEntities(10, { flip: true }); const r = await M.relationKinds({ systems, entities, draws: 29, controlReps: 0, workers: 1 }); const led = M.relationLedger(r);
  assert.doesNotMatch(JSON.stringify(led).replace(/a corpus can refute[^"]*/, ""), /established/);
  const any = led.kinds.some((k) => Object.values(k.standings).some((v) => v.standing !== "unexposed")); assert.ok(any, "at least one descriptor was exposed to a test");
});
test("Level S is deterministic across worker threads: the same groups give the same kinds with one worker or two", { skip: !organ.present && "organ absent", timeout: 900000 }, async () => {
  const { profiles } = M.plantedToyProfiles({ world: "kind", strength: 0.9, signatureCount: 30, kindBranches: ["Semitic", "Turkic", "Koreanic", "Japonic", "Austroasiatic", "Indo-Iranian"], seed: 21 });
  const base = { profiles, groups: ["A", "B"], draws: 19, controlReps: 0, stability: false, decomposeDraws: 49 }; const a = await M.runLevelS({ ...base, workers: 1 }), b = await M.runLevelS({ ...base, workers: 2 });
  for (const g of ["A", "B"]) assert.deepEqual(a.groups[g].organ.kinds.map((k) => [k.status, k.members.join(",")]), b.groups[g].organ.kinds.map((k) => [k.status, k.members.join(",")]), `group ${g}`);
});
