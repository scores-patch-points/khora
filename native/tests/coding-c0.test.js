// coding-c0: the INSTRUMENT for C0 (identify a programming language from content alone) is regression-guarded here.
// It tests eval/coding-competence/c0-identify.mjs and adapters/code/identify.js on a TOY fixture whose answer is known by construction:
// a perfect system scores 1, a deranged control scores low, a lookahead cheat is caught by the causality licence, the pass rule
// refuses when a control does as well as the real arm. The toy "languages" are AUTHORED by the model (labelled so below); they are
// never held-out natural data and nothing here measures a real language. A few authored one-file snippets check the vendored prior
// is wired (they can fail: that is the point), and are skipped when priors/code-identify.json is absent.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  stripShebang, splitLines, featuresOfLine, trainPrior, createIdentifier, loadIdentifyPrior, identifyText, wordShape,
} from "../adapters/code/identify.js";
import {
  argmaxCombined, leaderAtLine, finalLeader, lucs, majorityOf, pairedSign, zscoreVec, analyse, analyseArm, armCore, decide,
  samplePool, samplePoolDetailed, causalityCheck, measure, PARAMS, RUNG, amendmentDigest, splitAudit,
  repoPaired, clusterBootstrap, goldBasisOf, normLineSet, makeNearDupFilter, refusalFiltersByLanguage, resolvedStratum,
  testGate, fingerprintDiff, writeCard, ARM_NAMES, armSpec, LOCK_FILE, READS_FILE, OUT_DIR,
} from "../eval/coding-competence/c0-identify.mjs";
import { derangement, mulberry32 } from "../eval/competence/lib.mjs";

// ── AUTHORED toy fixture: three languages that differ ONLY in their reserved words ──────────────────────────────────────
// Same punctuation, same indent, same line length, same first token (`let`, which no set owns): the shape channel carries nothing,
// so the keyword channel is the only discriminator and a deranged keyword assignment must fail.
const TOY = {
  aa: ["foo", "bar", "baz"],
  bb: ["qux", "quux", "corge"],
  cc: ["grault", "garply", "waldo"],
};
const TOY_IDS = Object.keys(TOY);
const toyLine = (kws, i) => `let v${i} = ${kws[i % 3]}(w${i}, ${kws[(i + 1) % 3]});`;
const toyDoc = (id, n, salt) => Array.from({ length: n }, (_, i) => toyLine(TOY[id], i + salt)).join("\n") + "\n";
const toyPrior = () => {
  const body = trainPrior({
    languages: TOY_IDS.map((id) => ({
      id,
      keywords: TOY[id],
      keywordSource: { giver: "AUTHORED toy fixture", kind: "authored" },
      files: Array.from({ length: 6 }, (_, f) => ({ text: toyDoc(id, 40, f * 7), repo: `toy/${id}${f % 2}` })),
    })),
    minCount: 1,
    minFiles: 1,
  });
  return { schema: "CodeIdentifyPrior@1", version: "toy", ...body };
};
// 12 held-out files per toy language over SIX repositories (A4-U: a slice needs >= MIN_REPOS = 5 repositories before any repository-level test can reach alpha)
const toyHeldOut = () => TOY_IDS.flatMap((id, truth) => Array.from({ length: 12 }, (_, f) => ({ truth, id, repo: `toy/h${f % 6}`, text: toyDoc(id, 9 + (f % 3) * 2, 101 + f * 5) })));

const recordsOf = (identifier, docs) => docs.map((d) => {
  const t = identifier.trace(d.text);
  return { truth: d.truth, A: Array.from(t.state.A), B: Array.from(t.state.B), transitions: t.transitions, nLines: t.nLines, margin: t.final?.margin ?? null, repo: d.repo ?? "toy", resolution: null };
});

test("the toy prior is built from keyword sets that separate (rates a > b), nothing else carries information", () => {
  const prior = toyPrior();
  for (const l of prior.languages) {
    assert.equal(l.status, "ok");
    assert.ok(l.a > l.b, `${l.id}: a=${l.a} b=${l.b}`);
  }
});

test("L4 split audit: a repository or a file shared with TRAIN is leakage and turns a pass into a fail", () => {
  const clean = splitAudit({ trainRepos: new Set(["r1"]), trainShas: new Set(["h1"]), poolRepos: new Set(["r2"]), poolShas: new Set(["h2"]) });
  assert.equal(clean.ok, true);
  const repoLeak = splitAudit({ trainRepos: new Set(["r1"]), trainShas: new Set(["h1"]), poolRepos: new Set(["r1"]), poolShas: new Set(["h2"]) });
  assert.equal(repoLeak.ok, false);
  assert.equal(repoLeak.repo_overlap_n, 1);
  const shaLeak = splitAudit({ trainRepos: new Set(["r1"]), trainShas: new Set(["h1"]), poolRepos: new Set(["r2"]), poolShas: new Set(["h1"]) });
  assert.equal(shaLeak.ok, false);
  const prior = toyPrior();
  const records = recordsOf(createIdentifier(prior), toyHeldOut());
  const K = 3;
  const sigma0 = derangement(K, mulberry32(PARAMS.SIGMA0_SEED));
  const drawPerms = PARAMS.DRAW_SEEDS.map((s) => derangement(K, mulberry32(s)));
  const a = analyse(records, { K, languages: TOY_IDS, active: [1, 1, 1], slice: 2, sigma0, drawPerms });
  assert.equal(decide({ analysis: a, causalityIdentical: true, splitClean: true }).pass, true);
  const leaked = decide({ analysis: a, causalityIdentical: true, splitClean: false });
  assert.equal(leaked.pass, false);
  assert.match(leaked.reasons.join(" "), /L4/);
});

test("a perfect system scores 1 at the end of the file, the majority baseline is 1/K, a deranged control is low", () => {
  const prior = toyPrior();
  const identifier = createIdentifier(prior);
  const docs = toyHeldOut();
  const records = recordsOf(identifier, docs);
  const K = TOY_IDS.length;
  const sigma0 = derangement(K, mulberry32(PARAMS.SIGMA0_SEED));
  assert.ok(sigma0.every((x, i) => x !== i), "sigma0 is a derangement");
  const drawPerms = PARAMS.DRAW_SEEDS.map((s) => derangement(K, mulberry32(s)));
  const a = analyse(records, { K, languages: TOY_IDS, active: [1, 1, 1], slice: 0, sigma0, drawPerms });
  assert.equal(a.pool.accuracy.real, 1, "the real arm names every toy file");
  assert.ok(Math.abs(a.pool.accuracy.majority - 1 / 3) < 1e-9, "balanced pool: majority = 1/K");
  assert.ok(a.pool.accuracy.deranged_sigma0 <= 0.1, `deranged keyword control must score low, got ${a.pool.accuracy.deranged_sigma0}`);
  assert.equal(a.pool.accuracy.keyword_only, 1, "the keyword channel alone identifies the toy languages");
  assert.ok(a.pool.accuracy.shape_only < 1, "the shape channel alone cannot: the toy shapes are identical");
  assert.ok(a.pool.signVsSigma0.p < PARAMS.ALPHA);
  assert.ok(a.pool.draws.max <= 0.1, "every deranged draw scores low");
  assert.ok(a.pool.draws.permutationP <= PARAMS.ALPHA);
  assert.equal(a.slice.accuracy, 1);
  assert.equal(a.slice.n, 12);
  // the cost of being causal: stable from the first non-blank line on a clean toy file
  assert.equal(a.pool.lucs.median, 1);
  assert.equal(a.pool.accuracyAtK[1], 1);
});

test("the pre-registered pass rule: passes on a clean toy, refuses when a control does as well as the real arm, null when the slice is tiny", () => {
  const prior = toyPrior();
  const identifier = createIdentifier(prior);
  const records = recordsOf(identifier, toyHeldOut());
  const K = 3;
  const sigma0 = derangement(K, mulberry32(PARAMS.SIGMA0_SEED));
  const drawPerms = PARAMS.DRAW_SEEDS.map((s) => derangement(K, mulberry32(s)));
  const a = analyse(records, { K, languages: TOY_IDS, active: [1, 1, 1], slice: 1, sigma0, drawPerms });
  const d = decide({ analysis: a, causalityIdentical: true });
  assert.equal(d.pass, true, JSON.stringify(d.reasons));
  assert.equal(d.claims.identification.pass, true);
  assert.equal(d.claims.received_prior.pass, true, JSON.stringify(d.claims.received_prior.reasons));
  assert.ok(d.claims.received_prior.licence.L1_repo_sign_vs_sigma0 && d.claims.received_prior.licence.L2_all_draws_beaten);
  assert.ok(d.licence.L3_causality && d.licence.L4_split_clean);
  // a failed causality licence blocks the identification claim
  assert.equal(decide({ analysis: a, causalityIdentical: false }).pass, false);
  // a control that does as well as the real arm: hand the keyword channel the TRUE assignment (identity "derangement") -> the control IS the real arm.
  // Since A5 this breaks CLAIM 2 (the received prior is not shown load-bearing); the identification claim is a separate verdict and still stands.
  const identity = [0, 1, 2];
  const broken = analyse(records, { K, languages: TOY_IDS, active: [1, 1, 1], slice: 1, sigma0: identity, drawPerms: [identity] });
  const db = decide({ analysis: broken, causalityIdentical: true });
  assert.equal(db.claims.received_prior.pass, false, "a control equal to the real arm must make claim 2 false");
  assert.match(db.claims.received_prior.reasons.join(" "), /licence L1 failed/);
  assert.match(db.claims.received_prior.reasons.join(" "), /licence L2 failed/);
  assert.equal(db.claims.identification.pass, true, "the two claims are not conflated: competence is still measured");
  assert.equal(db.pass, db.claims.identification.pass, "card.pass is claim 1 only");
  // a tiny slice is a typed gap, not a pass
  const tiny = analyse(records.slice(0, 9), { K, languages: TOY_IDS, active: [1, 1, 1], slice: 0, sigma0, drawPerms });
  assert.equal(decide({ analysis: tiny }).pass, null);
});

test("causal by construction: the leaders after line k do not depend on lines after k; a lookahead cheat is caught by the L3 licence", () => {
  const prior = toyPrior();
  const identifier = createIdentifier(prior);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c0-test-"));
  try {
    // odd line counts so the donor tail is strictly longer than the kept head (no tie)
    const docs = TOY_IDS.flatMap((id, truth) => Array.from({ length: 4 }, (_, f) => ({ truth, id, text: toyDoc(id, 21 + f * 2, 11 + f) })));
    const records = docs.map((d, i) => {
      const file = path.join(dir, `${d.id}-${i}.txt`);
      fs.writeFileSync(file, d.text);
      return { truth: d.truth, path: file };
    });
    const real = causalityCheck({ identifier, records, sample: 12 });
    assert.equal(real.tested, 12);
    assert.equal(real.real_identical_under_corruption, 1);
    assert.equal(real.real_identical_under_truncation, 1);
    assert.ok(real.ok);
    assert.ok(real.lookahead_decision_changed > 0, "the whole-file leader (what a lookahead arm would use) changes when the tail is swapped");
    // the cheat: every prefix decision is the whole-file leader (it sees the future)
    const cheat = {
      trace(text) {
        const full = identifier.trace(text);
        const idx = full.final ? full.final.index : -1;
        return { transitions: [[1, idx]], transitionsByMode: { sum: [[1, idx]] }, nLines: full.nLines, state: full.state, final: full.final };
      },
    };
    const caught = causalityCheck({ configs: [{ name: "cheat", identifier: cheat, mode: "sum" }], records, sample: 12 });
    assert.equal(caught.ok, false, "the licence must be able to fail: a lookahead arm is not identical under future corruption");
    assert.ok(caught.real_identical_under_corruption < 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a leading #! line and a BOM are hidden; the identifier sees text only", () => {
  assert.equal(stripShebang("#!/usr/bin/env python3\nprint(1)\n"), "print(1)\n");
  assert.equal(stripShebang("﻿#!/bin/sh\necho hi"), "echo hi");
  assert.equal(stripShebang("#include <stdio.h>\n"), "#include <stdio.h>\n", "a #include is content, not a shebang");
  assert.equal(stripShebang("#!only"), "");
  const identifier = createIdentifier(toyPrior());
  const body = toyDoc("bb", 15, 3);
  assert.deepEqual(identifier.identify("#!/usr/bin/env aa\n" + body), identifier.identify(body));
  assert.ok(splitLines("a\r\nb\nc\rd").length === 4);
});

test("exact arithmetic of the instrument: LUCS, leader at k, majority, paired sign test, z-score", () => {
  const tr = [[1, -1], [3, 0], [7, 1]];
  assert.equal(leaderAtLine(tr, 1), -1);
  assert.equal(leaderAtLine(tr, 3), 0);
  assert.equal(leaderAtLine(tr, 100), 1);
  assert.equal(finalLeader(tr), 1);
  assert.equal(finalLeader([]), -1);
  assert.equal(lucs(tr, 1), 7, "stable-correct from line 7");
  assert.equal(lucs(tr, 0), null, "censored: the final leader is not the gold");
  assert.deepEqual(majorityOf([2, 2, 1, 0, 2]), { label: 2, n: 3, share: 0.6 });
  const s = pairedSign([true, true, true, true, true, true, true, true, true, true, false], [false, false, false, false, false, false, false, false, false, false, true]);
  assert.equal(s.wins, 10);
  assert.equal(s.losses, 1);
  assert.ok(s.p < PARAMS.ALPHA && s.p > 0);
  assert.equal(pairedSign([true, false], [true, false]).p, 1, "no discordant pair: no evidence");
  const z = zscoreVec([1, 2, 3]);
  assert.ok(Math.abs(z[0] + z[2]) < 1e-12 && Math.abs(z[1]) < 1e-12 && Math.abs(Math.hypot(...z) - Math.sqrt(3)) < 1e-9);
  assert.deepEqual(zscoreVec([5, 5, 5]), [0, 0, 0]);
  assert.equal(argmaxCombined([0, 0, 0], [0, 0, 0]), 0, "ties go to the lower index");
  assert.equal(argmaxCombined([9, 0, 0], [0, 1, 0]), 0, "no permutation: the keyword evidence for language 0 wins");
  assert.equal(argmaxCombined([9, 0, 0], [0, 1, 0], { perm: [1, 2, 0] }), 2, "handed to the wrong language: slot L reads A[perm[L]], so slot 2 gets A[0]");
});

// ── A4-A6 (2026-10-06): repositories as the independent unit, gold basis, deduplication, two typed claims, strict L2, the TEST lock ──────────
// AUTHORED fixtures: every record states, per file, whether the real arm, its deranged control and its ablation are right. Nothing here is natural data.
const WRONG = (t) => (t + 1) % 3;
const mk = (truth, repo, f = {}) => ({ truth, repo, real: f.real ?? true, ctl: f.ctl ?? false, abl: f.abl ?? false, A: [0, 0, 0], B: [0, 0, 0], transitions: [[1, truth]] });
const ARM = {
  real: (r) => (r.real ? r.truth : WRONG(r.truth)),
  derange: (r, perm) => ((perm && perm.matchReal ? r.real : r.ctl) ? r.truth : WRONG(r.truth)),
  ablate: (r) => (r.abl ? r.truth : WRONG(r.truth)),
};
const draws = (nMatch) => Array.from({ length: 50 }, (_, i) => ({ matchReal: i < nMatch }));
/** a balanced three-language world: `nRepos` repositories per language, `perRepo` files per repository; `over[t]` overrides the flags of language t */
const world = (nRepos, perRepo, over = {}) => [0, 1, 2].flatMap((t) => Array.from({ length: nRepos }, (_, k) => Array.from({ length: perRepo }, () => mk(t, `r${t}-${k}`, over[t] ?? {}))).flat());
const run = (recs, { nMatch = 0, causality = true, split = true, slice = 0, gold = null } = {}) => {
  const a = analyseArm(recs, { slice, sigma0: { matchReal: false }, drawPerms: draws(nMatch), majShare: 1 / 3, ...ARM, transitionsOf: (r) => r.transitions });
  return { a, d: decide({ analysis: a, causalityIdentical: causality, splitClean: split, gold }) };
};

test("analyseArm: a clean arm holds both claims; an arm identical to its control loses claim 2 only", () => {
  const recs = world(5, 2);
  const { a, d } = run(recs);
  assert.equal(a.pool.accuracy.real, 1);
  assert.equal(a.pool.accuracy.deranged_sigma0, 0);
  assert.equal(d.claims.identification.pass, true, JSON.stringify(d.claims.identification.reasons));
  assert.equal(d.claims.received_prior.pass, true, JSON.stringify(d.claims.received_prior.reasons));
  assert.equal(d.pass, true);
  const same = analyseArm(recs, { slice: 0, sigma0: { matchReal: true }, drawPerms: draws(50), majShare: 1 / 3, ...ARM });
  const ds = decide({ analysis: same, causalityIdentical: true });
  assert.equal(ds.claims.received_prior.pass, false);
  assert.equal(ds.claims.identification.pass, true);
});

test("A4-U: with fewer than MIN_REPOS = 5 repositories a holding rule is null (repo-underpowered), but a failing point condition is still false", () => {
  assert.equal(PARAMS.MIN_REPOS, 5, "ceil(log2(1/0.05))");
  for (const n of [1, 3, 4]) {
    const { d } = run(world(n, Math.ceil(12 / n)));
    assert.equal(d.claims.identification.pass, null, `${n} repositories`);
    assert.match(d.claims.identification.reasons.join(" "), /repo-underpowered/);
    assert.equal(d.claims.received_prior.pass, null);
    assert.equal(d.pass, null);
  }
  assert.equal(run(world(5, 2)).d.pass, true, "five repositories can reach alpha");
  const one = (n) => world(n, 3).filter((r) => r.truth === 0);
  assert.equal(repoPaired(one(4), one(4).map(() => true), null, null, { constant: 0.1 }).powered, false);
  assert.equal(repoPaired(one(4), one(4).map(() => true), null, null, { constant: 0.1 }).min_achievable_p, 0.0625);
  assert.equal(repoPaired(one(5), one(5).map(() => true), null, null, { constant: 0.1 }).powered, true);
  // a failing POINT condition is false even with 3 repositories: the keyword channel adds nothing (ablation = real) on the slice
  const { d } = run(world(3, 4, { 0: { abl: true } }));
  assert.equal(d.claims.received_prior.pass, false);
  assert.match(d.claims.received_prior.reasons.join(" "), /own ablation/);
  // the POOL's own ablation is a point condition too: false (not null) even when the slice is underpowered
  const poolBelow = [...world(3, 4).filter((r) => r.truth === 0), ...Array.from({ length: 12 }, (_, k) => mk(1, `p1-${k}`, { abl: true })), ...Array.from({ length: 12 }, (_, k) => mk(2, `p2-${k}`, { real: false, abl: true }))];
  const pb = run(poolBelow);
  assert.equal(pb.a.pool.accuracy.real, pb.a.pool.accuracy.ablation, "the pool's real arm is no better than its ablation");
  assert.equal(pb.d.claims.received_prior.pass, false);
  assert.match(pb.d.claims.received_prior.reasons.join(" "), /on the pool/);
  // and a slice below the majority share is false, not null
  const bad = run(world(3, 4, { 0: { real: false } })).d;
  assert.equal(bad.claims.identification.pass, false);
  assert.match(bad.claims.identification.reasons.join(" "), /majority/);
});

test("A4-S: files of one repository are not independent: a big repository cannot carry a file-level test over the repositories", () => {
  // repository r0 has 40 correct files; five other repositories have 2 files each and none correct. File level: 40/50 correct vs s_max = 1/3 is overwhelming. Repository level: 1 win, 5 losses.
  const slice0 = [...Array.from({ length: 40 }, () => mk(0, "big")), ...Array.from({ length: 5 }, (_, k) => [mk(0, `s${k}`, { real: false }), mk(0, `s${k}`, { real: false })]).flat()];
  const recs = [...slice0, ...world(5, 2).filter((r) => r.truth !== 0)];
  const { a, d } = run(recs);
  assert.ok(a.slice.binomVsMajority.p < 1e-6, "the file-level binomial would call this a pass");
  assert.equal(a.slice.n_repos, 6);
  assert.equal(a.slice.repo.vsMajority.wins, 1);
  assert.equal(a.slice.repo.vsMajority.losses, 5);
  assert.equal(d.claims.identification.pass, false);
  assert.match(d.claims.identification.reasons.join(" "), /repository-level test vs the majority/);
  assert.equal(repoPaired(recs, recs.map((r) => ARM.real(r) === r.truth), null, recs.map((r, i) => (r.truth === 0 ? i : -1)).filter((i) => i >= 0), { constant: 1 / 3 }).majority_of_repos, false);
});

test("A5-C2: L2 is the registered strict rule (the real arm exceeds ALL 50 draws); the old p <= .05 test tolerated one draw >= real", () => {
  const strict = run(world(5, 2), { nMatch: 1 });
  assert.equal(strict.a.pool.draws.atLeastReal, 1);
  assert.ok(strict.a.pool.draws.permutationP <= PARAMS.ALPHA, `the looser (1+k)/51 = ${strict.a.pool.draws.permutationP} would have let it pass`);
  assert.equal(strict.d.claims.received_prior.licence.L2_all_draws_beaten, false);
  assert.equal(strict.d.claims.received_prior.pass, false);
  assert.match(strict.d.claims.received_prior.reasons.join(" "), /licence L2 failed: 1 of 50/);
  assert.equal(strict.d.claims.identification.pass, true, "L2 belongs to claim 2");
  assert.equal(run(world(5, 2), { nMatch: 0 }).d.claims.received_prior.licence.L2_all_draws_beaten, true);
});

test("A5: an arm that beats its deranged control but not its own ablation is competent, and is not the received prior's doing (python's case)", () => {
  // the keyword channel adds nothing: the ablation is as right as the real arm, while the deranged control collapses
  const { d, a } = run(world(5, 2, { 0: { abl: true }, 1: { abl: true }, 2: { abl: true } }));
  assert.equal(a.pool.accuracy.ablation, 1);
  assert.equal(a.pool.accuracy.deranged_sigma0, 0);
  assert.equal(d.claims.identification.pass, true, "competence stands");
  assert.equal(d.claims.received_prior.pass, false, "but the received prior is not load-bearing: it does not beat its own ablation");
  assert.match(d.claims.received_prior.reasons.join(" "), /own ablation/);
  assert.equal(d.pass, true, "card.pass is claim 1");
  // no ablation supplied: claim 2 is unmeasured (null), never true
  const noAbl = analyseArm(world(5, 2), { slice: 0, sigma0: { matchReal: false }, drawPerms: draws(0), majShare: 1 / 3, real: ARM.real, derange: ARM.derange });
  assert.equal(decide({ analysis: noAbl }).claims.received_prior.pass, null);
});

test("A4-G: only extension-labelled gold gates; a slice with no extension rows is gold_circular (null), never a pass", () => {
  assert.deepEqual(goldBasisOf({ ext: ".py" }), { basis: "extension", rule: null });
  assert.deepEqual(goldBasisOf({ ext: ".m", resolution: "m:matlab-syntax" }), { basis: "content_resolved", rule: "m:matlab-syntax" });
  assert.deepEqual(goldBasisOf({ ext: ".h", resolution: "h:repo-dominant-c-or-default" }), { basis: "content_resolved", rule: "h:repo-dominant-c-or-default" });
  const empty = analyseArm(world(5, 2).filter((r) => r.truth !== 0), { slice: 0, sigma0: { matchReal: false }, drawPerms: draws(0), majShare: 1 / 3, ...ARM });
  const circular = decide({ analysis: empty, gold: { content_resolved_n: 156 } });
  assert.equal(circular.pass, null);
  assert.match(circular.reasons.join(" "), /gold_circular: label derived from content rule/);
  assert.equal(circular.claims.received_prior.pass, null);
  assert.match(decide({ analysis: empty, gold: { content_resolved_n: 0 } }).reasons.join(" "), /slice too small/);
  // the stratum is scored apart, per language and per rule
  const recs = [
    { truth: 1, repo: "x", resolution: "m:matlab-syntax", ok: true },
    { truth: 1, repo: "x", resolution: "m:matlab-syntax", ok: false },
    { truth: 0, repo: "y", resolution: "h:cpp-syntax", ok: true },
  ];
  const st = resolvedStratum(recs, { real: (r) => (r.ok ? r.truth : 9), languages: ["cpp", "matlab"], slice: 1 });
  assert.equal(st.non_gating, true);
  assert.match(st.gap, /gold_circular/);
  assert.equal(st.by_language.matlab.accuracy, 0.5);
  assert.equal(st.by_language.matlab.rules["m:matlab-syntax"].n, 2);
  assert.equal(st.slice.n, 2);
  assert.equal(st.pool.accuracy, 2 / 3);
});

test("A4-D: exact and near duplicates (the manifest's own >= 80% of >= 20-char lines rule) are skipped before sampling and do not count toward the limit", () => {
  const doc = (tag, n, changed = 0) => Array.from({ length: n }, (_, i) => `line ${i} of document ${i >= n - changed ? "CHANGED" : tag} padded to pass twenty characters`).join("\n");
  const A = doc("alpha", 10), Anear = doc("alpha", 10, 1), B = doc("bravo", 10), seventy = [...doc("bravo", 10).split("\n").slice(0, 7), ...doc("fresh", 3).split("\n")].join("\n");
  const row = (repo, sha, name) => ({ path: name, rel: name, repo, sha256: sha, bytes: 1, restricted: false });
  const rows = [row("r1", "01", "A"), row("r1", "01", "Acopy"), row("r1", "03", "Anear"), row("r2", "02", "B"), row("r2", "04", "seventy"), row("r2", "05", "gone")];
  const text = { A, Acopy: A, Anear, B, seventy };
  const manifest = { languages: { aa: { dev: rows, train: [], test: [] } } };
  const { items, stats } = samplePoolDetailed(manifest, ["aa"], "dev", 10, { textOf: (r) => text[r.path] ?? null });
  assert.deepEqual(items.map((x) => x.row.path), ["A", "B", "seventy"], "kept: the first copy, a different file, and a 70% overlap (below the 80% rule)");
  assert.equal(stats.aa.exact_dups, 1);
  assert.equal(stats.aa.near_dups, 1);
  assert.equal(stats.aa.unreadable, 1);
  assert.equal(stats.aa.taken, 3);
  // skipped files do not count toward the limit: limit 2 still returns two kept files
  assert.equal(samplePoolDetailed(manifest, ["aa"], "dev", 2, { textOf: (r) => text[r.path] ?? null }).items.length, 2);
  // deterministic, and without a text reader the old behaviour (no dedup) is unchanged
  assert.deepEqual(samplePoolDetailed(manifest, ["aa"], "dev", 10, { textOf: (r) => text[r.path] ?? null }).items, items);
  assert.equal(samplePool(manifest, ["aa"], "dev", 10).length, 6);
  // the fingerprint ignores short lines and whitespace runs, like the manifest's
  assert.equal(normLineSet("short\n" + "a   b   c d e f g h i j k l m n o p").size, 1);
  assert.equal(makeNearDupFilter().admit("s", "x".repeat(30)), null);
  // gold basis filters the sample
  const m2 = { languages: { aa: { dev: [{ ...row("r1", "07", "p"), resolution: "h:cpp-syntax" }, row("r1", "08", "q")], train: [], test: [] } } };
  assert.deepEqual(samplePool(m2, ["aa"], "dev", 5, { basis: "extension" }).map((x) => x.row.path), ["q"]);
  assert.deepEqual(samplePool(m2, ["aa"], "dev", 5, { basis: "content_resolved" }).map((x) => x.row.path), ["p"]);
});

test("repository-level helpers: cluster bootstrap is seeded and needs two repositories; refusal filters are typed per language", () => {
  const recs = world(5, 2);
  const ok = recs.map((r) => ARM.real(r) === r.truth);
  const none = recs.map(() => false);
  const idxs = recs.map((r, i) => (r.truth === 0 ? i : -1)).filter((i) => i >= 0);
  const b1 = clusterBootstrap(recs, ok, none, idxs);
  const b2 = clusterBootstrap(recs, ok, none, idxs);
  assert.deepEqual(b1, b2, "seeded");
  assert.equal(b1.n_repos, 5);
  assert.equal(b1.observed, 1);
  assert.ok(b1.lo <= b1.observed && b1.observed <= b1.hi);
  assert.equal(clusterBootstrap(recs, ok, none, idxs.slice(0, 2)).mean, null, "one repository: nothing to resample");
  const manifest = { stats: { dropped: { "latex:no-tex-command": 21, "scheme:no-scheme-forms": 80 }, ambiguity: { "v:no-module-refused": 9 } }, languages: { latex: { train: [1, 2], dev: [3], test: [] }, scheme: { train: [], dev: [], test: [1] }, verilog: {} } };
  const r = refusalFiltersByLanguage(manifest);
  assert.equal(r.by_language.latex.filters["latex:no-tex-command"].dropped, 21);
  assert.equal(r.by_language.latex.kept_files_all_splits, 3);
  assert.equal(r.by_language.verilog.filters["v:no-module-refused"].ambiguity_count, 9);
  assert.ok(r.unrecorded_filters.includes("m:unresolved-refused"), "a filter the manifest does not count is said to be unrecorded, not guessed");
  assert.match(r.scope, /not record these per split/);
});

test("A6: TEST needs ONE frozen arm and a lock; the lock is created before any read; a second read of a language, another arm or a changed reader is refused", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c0-gate-"));
  try {
    const fp = { arm: "named_sum", limit: 30, prior_sha256: "p1", blind_prior_sha256: "b1", identify_js_sha256: "i1", c0_identify_sha256: "c1", amendment_A4_sha256: "a4" };
    const t = (lang, arm = "named_sum", over = {}) => testGate({ language: lang, arm, fingerprint: { ...fp, arm, ...over }, outDir: dir, now: () => "2026-10-06T00:00:00Z" });
    const noArm = testGate({ language: "python", arm: null, fingerprint: fp, outDir: dir });
    assert.equal(noArm.ok, false);
    assert.match(noArm.reason, /ONE frozen arm/);
    assert.equal(fs.existsSync(path.join(dir, LOCK_FILE)), false, "a refused call creates no lock");
    assert.equal(testGate({ language: "python", arm: "median", fingerprint: fp, outDir: dir }).ok, false);
    const first = t("python");
    assert.equal(first.ok, true);
    assert.equal(first.created, true);
    assert.ok(fs.existsSync(path.join(dir, LOCK_FILE)));
    const reads = fs.readFileSync(path.join(dir, READS_FILE), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(reads.length, 1);
    assert.deepEqual([reads[0].language, reads[0].phase, reads[0].arm], ["python", "started", "named_sum"]);
    const second = t("python");
    assert.equal(second.ok, false, "a held-out set is read once per language");
    assert.match(second.reason, /already read for python/);
    assert.equal(t("go").ok, true, "another language, same frozen instrument");
    const otherArm = t("ruby", "blind_sum");
    assert.equal(otherArm.ok, false);
    assert.ok(otherArm.lock_fields_differing.includes("arm"));
    assert.match(otherArm.reason, /frozen/);
    const rebuilt = t("ruby", "named_sum", { prior_sha256: "p2" });
    assert.equal(rebuilt.ok, false);
    assert.deepEqual(rebuilt.lock_fields_differing, ["prior_sha256"]);
    const edited = t("ruby", "named_sum", { amendment_A4_sha256: "a4x" });
    assert.deepEqual(edited.lock_fields_differing, ["amendment_A4_sha256"]);
    assert.equal(fs.readFileSync(path.join(dir, READS_FILE), "utf8").trim().split("\n").length, 2, "refusals append nothing");
    // a read made through run.mjs (its own card-level log) also counts
    fs.writeFileSync(path.join(dir, "test-reads.jsonl"), `${JSON.stringify({ language: "java", at: "T0", rungs: ["c0", "c1"] })}\n`);
    assert.match(t("java").reason, /already read for java/);
    assert.deepEqual(fingerprintDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }), ["b", "c"]);
    // freeze only: a lock for one arm without a read
    const dir2 = fs.mkdtempSync(path.join(os.tmpdir(), "c0-freeze-"));
    try {
      const fz = testGate({ language: null, arm: "blind_sum", fingerprint: { ...fp, arm: "blind_sum" }, outDir: dir2, freezeOnly: true });
      assert.equal(fz.ok, true);
      assert.equal(fz.created, true);
      assert.equal(fs.existsSync(path.join(dir2, READS_FILE)), false, "freezing reads nothing");
      assert.equal(testGate({ language: "python", arm: "named_sum", fingerprint: fp, outDir: dir2 }).ok, false, "the arm was frozen to blind_sum");
    } finally { fs.rmSync(dir2, { recursive: true, force: true }); }
    assert.deepEqual([...ARM_NAMES], ["named_sum", "named_z", "blind_sum", "blind_z"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("A6: a real TEST card is never overwritten by a refusal or a second read", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c0-card-"));
  try {
    const real = { language: "python", split: "test", pass: true, details: { test_read: { completed: true } } };
    const [f1] = writeCard("python", "test", real, dir);
    const refusal = { language: "python", split: "test", pass: null, gaps: [{ reason: "refused: TEST was already read for python" }], details: {} };
    const written = writeCard("python", "test", refusal, dir);
    assert.equal(JSON.parse(fs.readFileSync(f1, "utf8")).pass, true, "the real card survives");
    assert.ok(written.every((f) => /refused-/.test(f)), "the refusal goes to its own file");
    // a DEV card, or a refusal card from before any read, may be rewritten
    writeCard("go", "dev", { language: "go", pass: false, details: {} }, dir);
    const [d2] = writeCard("go", "dev", { language: "go", pass: true, details: {} }, dir);
    assert.equal(JSON.parse(fs.readFileSync(d2, "utf8")).pass, true);
    // a refusal never takes the canonical TEST card name, so it can neither be mistaken for a TEST card nor block the real one
    const refusedFirst = writeCard("ruby", "test", refusal, dir);
    assert.ok(refusedFirst.every((f) => /refused-/.test(f)));
    assert.equal(fs.existsSync(path.join(dir, "c0-ruby-test.json")), false);
    const [r2] = writeCard("ruby", "test", { language: "ruby", pass: false, details: { test_read: { completed: true } } }, dir);
    assert.equal(path.basename(r2), "c0-ruby-test.json");
    assert.equal(JSON.parse(fs.readFileSync(r2, "utf8")).pass, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("armSpec: each arm names its own trajectory and shape vector; the blind arms read B', the named arms B", () => {
  const spec = (n) => armSpec(n, { K: 3, active: [1, 1, 1] });
  assert.deepEqual([spec("named_sum").tKey, spec("named_z").tKey, spec("blind_sum").tKey, spec("blind_z").tKey], ["transitions", "tz", "tbs", "tbz"]);
  assert.deepEqual([spec("named_sum").Bk, spec("blind_z").Bk], ["B", "Bb"]);
  assert.equal(spec("blind_sum").blind, true);
  const r = { truth: 2, A: [0, 0, 5], B: [0, 9, 0], Bb: [0, 0, 1], transitions: [[1, 1]], tbs: [[1, 2]] };
  assert.equal(spec("named_sum").real(r), 1);
  assert.equal(spec("blind_sum").real(r), 2);
  assert.equal(spec("named_sum").ablate(r), 1, "shape B alone");
  assert.equal(spec("blind_sum").ablate(r), 2, "blind shape B' alone");
  assert.throws(() => armSpec("median", { K: 3, active: [1, 1, 1] }), /unknown arm/);
});

test("sampling is round-robin across repositories, deterministic, excludes restricted rows, and never reads content", () => {
  const row = (repo, sha, restricted = false) => ({ path: `/nope/${repo}/${sha}`, rel: sha, repo, sha256: sha, bytes: 1, restricted });
  const manifest = {
    languages: {
      aa: { dev: [row("r2", "d"), row("r1", "b"), row("r1", "a"), row("r2", "c"), row("r1", "e", true), row("r3", "f")], train: [], test: [] },
      bb: { dev: [row("r1", "z")], train: [], test: [] },
    },
  };
  const s = samplePool(manifest, ["aa", "bb"], "dev", 4);
  assert.deepEqual(s.filter((x) => x.lang === "aa").map((x) => x.row.rel), ["a", "c", "f", "b"], "r1,r2,r3 then r1 again, by sha within a repo, restricted skipped");
  assert.deepEqual(s.filter((x) => x.lang === "bb").map((x) => x.row.rel), ["z"]);
  assert.deepEqual(samplePool(manifest, ["aa", "bb"], "dev", 4), s, "deterministic");
});

test("word shapes are one witness among many, not the signal", () => {
  assert.equal(wordShape("snake_case"), "snake");
  assert.equal(wordShape("camelCase"), "camel");
  assert.equal(wordShape("PascalCase"), "Camel");
  assert.equal(wordShape("URL_PATH"), "UPPER");
  assert.equal(wordShape("__init__"), "dunder");
  assert.equal(wordShape("x"), "c1");
  const lex = new Set(["def"]);
  const f = featuresOfLine("    def foo_bar(self, x):", lex);
  assert.ok(f.shape.includes("a:def") && f.shape.includes("i:4") && f.shape.includes("e::") && f.shape.includes("w:snake"));
  assert.ok(!f.shape.some((x) => x.startsWith("w:") && x.includes("def")), "a received keyword is named, not shape-classed");
  assert.equal(featuresOfLine("   \t  ", lex), null, "a blank line carries no evidence");
});

test("the TEST split is guarded; an unknown language and a missing prior are typed gaps, never a throw or a silent pass", async () => {
  const saved = process.env.C0_FINAL;
  delete process.env.C0_FINAL;
  try {
    const t = await measure({ language: "python", split: "test" });
    assert.equal(t.pass, null);
    assert.equal(t.split, "test");
    assert.equal(t.language, "python");
    assert.match(t.gaps[0].reason, /test split is guarded/);
    const u = await measure({ language: "no-such-language", split: "dev" });
    assert.equal(u.pass, null);
    assert.ok(Array.isArray(u.gaps) && u.gaps.length > 0);
    assert.equal(identifyText("let x = 1;", { prior: null }).language, null);
    assert.equal(identifyText("let x = 1;", { prior: null }).gap, "no_identify_prior");
  } finally {
    if (saved !== undefined) process.env.C0_FINAL = saved;
  }
});

test("A6: with C0_FINAL=1 TEST is still refused without ONE frozen arm and with --limit, before any file is read and before any lock exists", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c0-final-"));
  const cacheDir = path.join(OUT_DIR, "c0");
  const listing = () => (fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir).filter((f) => /^pool-test-/.test(f)).sort() : []);
  const before = listing();
  try {
    const env = { C0_FINAL: "1" };
    const noArm = await measure({ language: "python", split: "test", env, outDir: dir });
    assert.equal(noArm.pass, null);
    assert.match(noArm.gaps[0].reason, /ONE frozen arm/);
    const badArm = await measure({ language: "python", split: "test", env: { ...env, C0_ARM: "median" }, outDir: dir });
    assert.equal(badArm.pass, null);
    assert.match(badArm.gaps[0].reason, /ONE frozen arm/);
    const limited = await measure({ language: "python", split: "test", arm: "named_sum", limit: 5, env, outDir: dir });
    assert.equal(limited.pass, null);
    assert.match(limited.gaps[0].reason, /--limit is a DEV smoke-test device/);
    assert.equal(fs.existsSync(path.join(dir, LOCK_FILE)), false, "no lock was created by a refused call");
    assert.equal(fs.existsSync(path.join(dir, READS_FILE)), false, "no read was logged by a refused call");
    assert.deepEqual(listing(), before, "no TEST pool was scored");
    // DEV takes an unknown arm as a typed gap, not a throw
    const unknown = await measure({ language: "python", split: "dev", arm: "median" });
    assert.equal(unknown.pass, null);
    assert.match(unknown.gaps[0].reason, /unknown arm/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the pre-registration is stamped: the header and the amendments have digests, the rung says what it asks", () => {
  assert.equal(RUNG.id, "R0");
  assert.match(RUNG.question, /content alone/);
  assert.match(amendmentDigest("A1"), /^[0-9a-f]{64}$/);
  assert.match(amendmentDigest("A2"), /^[0-9a-f]{64}$/);
  assert.match(amendmentDigest("A3"), /^[0-9a-f]{64}$/);
  for (const t of ["A4", "A5", "A6", "A7"]) assert.match(amendmentDigest(t), /^[0-9a-f]{64}$/, t);
  // the registered text of v1 and of A1-A3 is untouched by the later amendments (their digests, recorded before A4-A6 were written)
  assert.match(amendmentDigest("A1"), /^07e2ef083347/);
  assert.match(amendmentDigest("A2"), /^84b1f59dd7a1/);
  assert.match(amendmentDigest("A3"), /^3df84a18a15e/);
});

// ── the vendored prior is wired (authored snippets; they can fail) ───────────────────────────────────────────────────
const VENDORED = loadIdentifyPrior();
const SKIP = VENDORED ? false : "priors/code-identify.json is absent (build it with eval/coding-competence/c0-build-prior.mjs)";
const SNIPPETS = {
  python: "import os\nimport sys\n\ndef main(argv):\n    path = os.path.join(argv[0], 'x')\n    if not os.path.exists(path):\n        raise ValueError('missing')\n    for line in open(path):\n        print(line.strip())\n\nclass Thing(object):\n    def __init__(self, name):\n        self.name = name\n",
  go: 'package main\n\nimport (\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\tif len(os.Args) < 2 {\n\t\tfmt.Println("usage")\n\t\treturn\n\t}\n\tfor i, a := range os.Args {\n\t\tfmt.Println(i, a)\n\t}\n}\n',
  c: '#include <stdio.h>\n#include <stdlib.h>\n\nstatic int add(int a, int b)\n{\n\treturn a + b;\n}\n\nint main(int argc, char **argv)\n{\n\tprintf("%d\\n", add(1, 2));\n\treturn 0;\n}\n',
  ruby: 'require "json"\n\nmodule Greeter\n  class Hello\n    def initialize(name)\n      @name = name\n    end\n\n    def greet\n      puts "Hello, #{@name}"\n    end\n  end\nend\n',
  java: 'package com.example;\n\nimport java.util.List;\n\npublic class Main {\n    private final List<String> items;\n\n    public Main(List<String> items) {\n        this.items = items;\n    }\n\n    public static void main(String[] args) {\n        System.out.println("hi");\n    }\n}\n',
};

test("vendored prior: five AUTHORED snippets are named correctly, with the shebang hidden", { skip: SKIP }, () => {
  const identifier = createIdentifier(VENDORED);
  for (const [lang, text] of Object.entries(SNIPPETS)) {
    assert.equal(identifier.identify(text).language, lang, `${lang} snippet`);
    assert.equal(identifier.identify("#!/usr/bin/env whatever\n" + text).language, lang, `${lang} snippet behind a shebang`);
  }
});

test("vendored prior: plain JavaScript is a known JS/TS ambiguity, and the identifier says so by a small margin", { skip: SKIP }, () => {
  const js = 'const fs = require("fs");\n\nfunction read(path) {\n  return new Promise((resolve, reject) => {\n    fs.readFile(path, "utf8", (err, data) => {\n      if (err) return reject(err);\n      resolve(data);\n    });\n  });\n}\n\nmodule.exports = { read };\n';
  const v = createIdentifier(VENDORED).identify(js);
  assert.ok(["javascript", "typescript", "tsx"].includes(v.language), `got ${v.language}`);
});

test("vendored prior: typed keyword gaps are declared (json/yaml/markdown have no received keyword giver), never imputed", { skip: SKIP }, () => {
  const st = Object.fromEntries(VENDORED.languages.map((l) => [l.id, l.status]));
  for (const l of ["json", "yaml", "markdown", "toml", "latex"]) assert.equal(st[l], "gap", l);
  for (const l of VENDORED.languages) assert.ok(l.keywordSource && l.keywordSource.kind, `${l.id} names its keyword source`);
  assert.equal(VENDORED.provenance.split.startsWith("TRAIN only"), true);
});

// ── A6 end to end: the TEST branch of measure() on an AUTHORED toy manifest in a temp directory. No real TEST file is opened (the manifest, the cache,
// the lock and the logs are all injected), so this can fail without spending anything. ─────────────────────────────────────────────────────────────────
test("A6 end to end (toy manifest, injected dirs): one frozen arm, lock before read, started+completed log, no other arm computed, no second read", { skip: SKIP }, async () => {
  const { createHash } = await import("node:crypto");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c0-e2e-"));
  const realCache = path.join(OUT_DIR, "c0");
  const poolTests = () => (fs.existsSync(realCache) ? fs.readdirSync(realCache).filter((f) => /^pool-test-/.test(f)).sort() : []);
  const before = poolTests();
  try {
    fs.mkdirSync(path.join(dir, "files"));
    const uniq = (lang, r, k) => Array.from({ length: 20 }, (_, i) => (lang === "python" ? `value_${r}_${k}_${i}_padding = ${i}  # unique authored line` : `var value_${r}_${k}_${i}_padding = ${i} // unique authored line`)).join("\n");
    const rows = { python: [], go: [] };
    for (let r = 0; r < 6; r++) for (const lang of ["python", "go"]) for (let k = 0; k < 2; k++) {
      const text = `${SNIPPETS[lang]}\n${uniq(lang, r, k)}\n`;
      const file = path.join(dir, "files", `${lang}-${r}-${k}.txt`);
      fs.writeFileSync(file, text);
      rows[lang].push({ path: file, rel: path.basename(file), repo: `toy/test${r}`, sha256: createHash("sha256").update(text).digest("hex"), bytes: text.length, restricted: false });
    }
    const manifest = { generated_at: "AUTHORED-toy", languages: { python: { train: [], dev: [], test: rows.python }, go: { train: [], dev: [], test: rows.go } } };
    const common = { split: "test", env: { C0_FINAL: "1" }, outDir: dir, manifest, cacheDir: path.join(dir, "cache") };
    const first = await measure({ language: "python", arm: "blind_sum", ...common });
    assert.equal(first.details.arm, "blind_sum");
    assert.equal(first.details.test_read.completed, true);
    assert.deepEqual(Object.keys(first.details.causality.byConfig), ["blind_sum"], "only the frozen arm is computed on TEST");
    assert.match(first.details.amendment_A1.withheld, /ONE frozen arm/);
    assert.equal(first.details.amendment_A1.arms, undefined, "no arm table, no recommendation on TEST");
    assert.ok(first.claims.identification && first.claims.received_prior, "both typed claims are present");
    assert.notEqual(first.claims.identification.pass, null, "6 repositories, 12 files: the slice is powered");
    assert.equal(first.pass, first.claims.identification.pass);
    const lock = JSON.parse(fs.readFileSync(path.join(dir, LOCK_FILE), "utf8"));
    assert.equal(lock.fingerprint.arm, "blind_sum");
    assert.match(lock.fingerprint.prior_sha256, /^[0-9a-f]{64}$/);
    assert.match(lock.fingerprint.amendment_A6_sha256, /^[0-9a-f]{64}$/);
    assert.match(lock.fingerprint.amendment_A7_sha256, /^[0-9a-f]{64}$/);
    const log = fs.readFileSync(path.join(dir, READS_FILE), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(log.map((e) => [e.language, e.phase]), [["python", "started"], ["python", "completed"]]);
    assert.ok(log[0].at <= log[1].at);
    // a second read of python, and any other arm, are refused as typed gaps
    const again = await measure({ language: "python", arm: "blind_sum", ...common });
    assert.equal(again.pass, null);
    assert.match(again.gaps[0].reason, /already read for python/);
    const otherArm = await measure({ language: "go", arm: "named_sum", ...common });
    assert.equal(otherArm.pass, null);
    assert.match(otherArm.gaps[0].reason, /frozen/);
    assert.match(otherArm.gaps[0].reason, /arm/);
    // another language with the SAME frozen arm is a fresh read, from the same cached pool
    const go = await measure({ language: "go", arm: "blind_sum", ...common });
    assert.equal(go.details.test_read.completed, true);
    assert.equal(go.details.pool_files.cached, true, "the TEST pool was scored once");
    // cards: the real card survives a later refusal
    const [f] = writeCard("python", "test", first, dir);
    writeCard("python", "test", again, dir);
    assert.equal(JSON.parse(fs.readFileSync(f, "utf8")).details.test_read.completed, true);
    assert.deepEqual(poolTests(), before, "no pool of the real TEST split was scored");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
