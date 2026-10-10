#!/usr/bin/env node
// build-c-name-prior-train.mjs : the held-out-safe CodeNamePrior@1 for C, measured over the manifest's TRAIN repositories.
// (khora / Lovelace, Coding Capability Circle.  Zero model.)
//
//   node eval/coding-competence/build-c-name-prior-train.mjs [--no-write]
//
// WHAT. priors/code-name-train-recipe-c.json : for every name the C declaration RECIPE finds, how many DISTINCT TRAIN repositories
// declare it (the genericity fact adapters/text/code-structure.js::genericityOf reads).  The recipe is the one in
// scripts/build-code-name-prior-split.mjs (function definitions at line start; identical to live_priors build-code-name-prior.mjs).
//
// WHY A NEW FILE.  priors/code-name-c.json is the OLDER ethos-built tally: its tree contains repositories the manifest holds in
// dev/test (see PROVENANCE-c2.md), so it is not held-out safe, and rule 10 forbids editing it.  priors/code-name-train-c.json
// already holds the TRAIN tally by the tree-sitter (gold-1) route; THIS file is the TRAIN tally by the recipe route that
// loadCodeNamePriorSplit("c") consumers were built against, so the two routes can be compared (N5).
//
// HOW (no existing source is edited).  The manifest's TRAIN, non-restricted files of c, go, python, javascript, typescript and tsx
// are COPIED into a staging tree <stage>/<owner_repo>/<rel> (scratch only, never distributed).  The existing, unmodified
// scripts/build-code-name-prior-split.mjs runs on it as a subprocess.  Staging all four families is what makes its sum-check real
// (blended attestations across c/go/py/js must equal the sum over the splits; staging C alone would make it vacuous).  Only the C
// output is kept.  The builder's `names` and `counts` are carried VERBATIM; only provenance is added.
// LICENCE (rule 11, amendment A4 of the C2 work): files the manifest marks `restricted` (git/git, python/cpython) are excluded.
//
// AMENDMENT A1 (POST HOC: written after the FIRST run, which aborted).  The pre-registered N2 below FAILED as registered: the
// unmodified builder refused on the four-family TRAIN tree with "blended attestations (8191) != split attestations (8192)".
// Diagnosis (reproduced to the unit by an independent tally, section DIAG): the one extra attestation is `main` declared in
// apache/thrift in BOTH a C file and a Go file.  The builder's blended tally counts a (name, repo) pair once, its splits count it
// once per family, so its sum-check silently assumes no repository attests a name in two families (true of the ethos tree it was
// written for, false for a multilingual repository).  That is a limitation of the existing check, NOT a recipe drift.  The
// pre-registered N2 verdict is therefore recorded as FAIL (with the numbers), and the C prior is produced from a C-only staging
// tree, where the builder's check runs and is vacuous across families; the sum-check's real content is restored for the one
// family that is kept by N2b: sum over names of per-name repo counts == number of distinct (name, repo) pairs in the independent
// recount.  A fix proposal for the builder is in the report (key the blended tally by family).  No threshold was touched.
//
// AMENDMENT A2 (POST HOC: written after the second run).  N5 below FAILED as registered (set-level share 0.51 < 0.80).  The
// registered comparison was confounded: the gold route drops the 19 TRAIN files whose parse is > 2% error (the C2 constant), the
// recipe route reads them (1,349 of its names come from those files, e.g. CUDA intrinsic headers), and a set-level share ignores
// which file a name came from.  N5b is the FILE-LEVEL comparison on the parse-ok files only (precision/recall of the recipe's per-file
// function names against gold-1 function/method defs of the same file), plus the hard keywords found among the names of both
// name priors.  N5b is descriptive and is NOT a re-grading of N5: the N5 verdict stays FAIL.
//
// PRE-REGISTERED PREDICTIONS AND PASS RULES (II.5), written before the first run of this file:
//  N1  INDEPENDENT RECOUNT.  A second implementation (below: same recipe regex, kept in step by hand, own tally with Maps) over the
//      same staged C files reproduces the builder's `names` (repos, files, kinds per name) and all `counts` EXACTLY.  FAIL on any
//      difference (a drifted recipe, or a name the builder's plain-object output cannot hold, e.g. `__proto__`).
//  N2  SUM CHECK.  The builder's own check passes (blended attestations == split attestations over the staged c/go/py/js tree)
//      and the C family's sum of per-name repo counts equals the recount's.  FAIL otherwise.
//  N3  TRAIN ONLY.  Every staged file is a manifest TRAIN, unrestricted file of its language; no staged repository appears in the
//      dev or test split of the same language; no dev/test path is opened.  FAIL otherwise (the build aborts).
//  N4  GENERICITY FLOOR.  The old 10-repo / 18-file tally had namesAtOrAboveGenericFloor = 0 (every name admitted).  With 8 TRAIN
//      repositories and 246 files I predict 0 < namesAtOrAboveGenericFloor (repos >= 2) < 10% of distinctNames.  FAIL if 0 or >= 10%.
//      DISCLOSURE written now: 240 of the 246 files come from four repositories (60 each); curl, httpd, openssh and openssl give
//      1 or 2 files each, so "repos >= 2" is dominated by what the four large repositories share.
//  N5  ROUTE AGREEMENT (recipe vs tree-sitter), set level.  Of the recipe's function names, the share that is also a FUNCTION name
//      in code-name-train-c.json (the gold route over the same repositories): prediction >= 0.80.  CONTROL built to fail: the share
//      that is a function/method name in code-name-train-go.json (a wrong-language tally): prediction <= 0.33 x the C share.
//      FAIL if either holds the other way.  The reverse share (recipe recall of the gold route's function names) is descriptive.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable } from "./gold.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const PRIORS = path.join(NATIVE, "priors");
const BUILDER = path.join(NATIVE, "scripts/build-code-name-prior-split.mjs");
const MANIFEST = process.env.C_PRIORS_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
const WORK = "/private/tmp/claude-501/coding-competence/c-priors";
const STAGE = path.join(WORK, "stage-train");
const STAGE_C = path.join(WORK, "stage-train-c");
const SPLIT_OUT = path.join(WORK, "split-out");
const SPLIT_OUT_C = path.join(WORK, "split-out-c");
const FINAL = path.join(PRIORS, "code-name-train-recipe-c.json");
const WRITE = !process.argv.includes("--no-write");
const STAGE_EXT = new Set([".c", ".h", ".go", ".py", ".ts", ".tsx", ".js", ".mjs", ".jsx"]);
const LANGS = ["c", "go", "python", "javascript", "typescript", "tsx"];

// the C recipe, copied from scripts/build-code-name-prior-split.mjs FAMILIES (the convention that file's header holds: recipes are kept in step by hand)
const C_RE = /^(?:[A-Za-z_][\w\s*]*[\s*])([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:\n|\s)*\{/gm;

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const die = (m) => { console.error("REFUSING: " + m); process.exit(2); };

// ── N3: stage TRAIN only ────────────────────────────────────────────────────────────────────────────────────────────
const manifest = readJson(MANIFEST);
fs.rmSync(STAGE, { recursive: true, force: true });
fs.rmSync(STAGE_C, { recursive: true, force: true });
fs.rmSync(SPLIT_OUT, { recursive: true, force: true });
fs.rmSync(SPLIT_OUT_C, { recursive: true, force: true });
fs.mkdirSync(STAGE, { recursive: true });
fs.mkdirSync(STAGE_C, { recursive: true });
const stagedByLang = {};
const restrictedExcluded = {};
for (const lang of LANGS) {
  const L = manifest.languages[lang];
  if (!L) continue;
  const heldOut = new Set([...L.dev, ...L.test].map((f) => f.repo));
  const heldOutPaths = new Set([...L.dev, ...L.test].map((f) => f.path));
  const rows = L.train.filter((f) => !f.restricted);
  restrictedExcluded[lang] = L.train.length - rows.length;
  stagedByLang[lang] = 0;
  for (const f of rows) {
    if (heldOut.has(f.repo)) die(`${lang}: TRAIN repository ${f.repo} also appears in dev/test`);
    if (heldOutPaths.has(f.path)) die(`${lang}: ${f.path} is in dev/test`);
    const ext = path.extname(f.path).toLowerCase();
    if (!STAGE_EXT.has(ext)) continue;
    for (const root of lang === "c" ? [STAGE, STAGE_C] : [STAGE]) {
      const dest = path.join(root, f.repo.replace("/", "_"), f.rel);
      if (fs.existsSync(dest)) continue; // the same file listed under two languages is staged once
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(f.path, dest);
    }
    stagedByLang[lang]++;
  }
}
const cTrain = manifest.languages.c.train.filter((f) => !f.restricted);
const cReposStaged = [...new Set(cTrain.map((f) => f.repo))].sort();

// ── run the existing, unmodified builder: (A) four families as pre-registered; (B) C only, which produces the prior ──────────
const runBuilder = (stage, out) => spawnSync(process.execPath, [BUILDER, stage, out], { encoding: "utf8", maxBuffer: 1 << 26 });
const runA = runBuilder(STAGE, SPLIT_OUT);
const refusal = (runA.stderr || "").match(/blended attestations \((\d+)\) != split attestations \((\d+)\)/);
const sumA = runA.status === 0
  ? (() => { const m = runA.stderr.match(/sum check: (\d+) blended attestations = (\d+) split attestations/) || []; return { blended: Number(m[1]), split: Number(m[2]), pass: m[1] === m[2] }; })()
  : { blended: refusal ? Number(refusal[1]) : null, split: refusal ? Number(refusal[2]) : null, pass: false, builderRefused: (runA.stderr || "").trim().split("\n").slice(-1)[0] };
const runB = runBuilder(STAGE_C, SPLIT_OUT_C);
if (runB.status !== 0) die("scripts/build-code-name-prior-split.mjs failed on the C-only tree: " + (runB.stderr || "").trim().split("\n").slice(-3).join(" | "));
const sumB = (() => { const m = runB.stderr.match(/sum check: (\d+) blended attestations = (\d+) split attestations/) || []; return { blended: Number(m[1]), split: Number(m[2]), pass: !!m[1] && m[1] === m[2], note: "single family: vacuous across families" }; })();
const N2_builder = { fourFamilyTree_preregistered: sumA, cOnlyTree: sumB, pass: sumA.pass };
const built = readJson(path.join(SPLIT_OUT_C, "code-name-c.json"));

// ── DIAG: why the four-family check cannot pass (independent tally of every family's recipe) ─────────────────────────────────
const FAMILY_RECIPES = [
  { family: "c", exts: [".c", ".h"], re: C_RE, g: 1 },
  { family: "go", exts: [".go"], re: /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*\(/gm, g: 1 },
  { family: "py", exts: [".py"], re: /^[ \t]*(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/gm, g: 2 },
  { family: "js", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/gm, g: 1 },
  { family: "js", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm, g: 1 },
  { family: "js", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/gm, g: 1 },
];
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (e.isFile()) out.push(p); } return out; };
const pairFams = new Map();
for (const abs of walk(STAGE)) {
  const ext = path.extname(abs).toLowerCase();
  const repo = path.relative(STAGE, abs).split(path.sep)[0];
  const text = fs.readFileSync(abs, "utf8");
  for (const r of FAMILY_RECIPES) {
    if (!r.exts.includes(ext)) continue;
    const re = new RegExp(r.re.source, r.re.flags);
    let m;
    while ((m = re.exec(text))) { const k = m[r.g] + " @ " + repo; if (!pairFams.has(k)) pairFams.set(k, new Set()); pairFams.get(k).add(r.family); }
  }
}
let diagSplit = 0; const multiFamily = [];
for (const [k, f] of pairFams) { diagSplit += f.size; if (f.size > 1) multiFamily.push({ pair: k, families: [...f].sort().join("+") }); }
const DIAG = { independentBlended: pairFams.size, independentSplit: diagSplit, reproducesBuilderNumbers: pairFams.size === sumA.blended && diagSplit === sumA.split, nameRepoPairsInTwoFamilies: multiFamily,
  reading: "the builder's sum-check requires every (name, repo) attestation to sit in exactly one family; a repository that declares the same name in two languages breaks it",
  proposedFix: "scripts/build-code-name-prior-split.mjs: key the blended tally by `${family}\\0${name}` (or compare blended repo sets per family) so the check compares like with like; do not edit from this workflow" };

// ── N1: independent recount over the staged C files ─────────────────────────────────────────────────────────────────
const cFiles = walk(STAGE_C).filter((p) => [".c", ".h"].includes(path.extname(p).toLowerCase())).sort();
const tally = new Map();
const fileInfo = [];
for (const abs of cFiles) {
  const rel = path.relative(STAGE_C, abs);
  const repo = rel.split(path.sep)[0];
  const bytes = fs.readFileSync(abs);
  const text = bytes.toString("utf8");
  const re = new RegExp(C_RE.source, C_RE.flags);
  let m, n = 0;
  while ((m = re.exec(text))) {
    n++;
    let rec = tally.get(m[1]);
    if (!rec) { rec = { repos: new Set(), files: new Set(), kinds: new Set() }; tally.set(m[1], rec); }
    rec.repos.add(repo); rec.files.add(rel); rec.kinds.add("function");
  }
  fileInfo.push({ repo, bytes: bytes.length, decl: n });
}
const recountCounts = {
  files: fileInfo.length, repos: new Set(fileInfo.map((f) => f.repo)).size, totalBytes: fileInfo.reduce((a, f) => a + f.bytes, 0),
  distinctNames: tally.size, totalDeclarations: fileInfo.reduce((a, f) => a + f.decl, 0), namesAtOrAboveGenericFloor: [...tally.values()].filter((r) => r.repos.size >= 2).length,
};
const diffs = [];
for (const k of Object.keys(recountCounts)) if (recountCounts[k] !== built.counts[k]) diffs.push({ count: k, recount: recountCounts[k], builder: built.counts[k] });
const builtNames = Object.keys(built.names);
if (builtNames.length !== tally.size) diffs.push({ names: "distinct", recount: tally.size, builder: builtNames.length });
let sumReposRecount = 0, sumReposBuilt = 0;
for (const [name, rec] of tally) {
  sumReposRecount += rec.repos.size;
  const b = Object.hasOwn(built.names, name) ? built.names[name] : null;
  if (!b) { diffs.push({ name, missingInBuilder: true }); continue; }
  if (b.repos !== rec.repos.size || b.files !== rec.files.size || b.kinds.join() !== [...rec.kinds].sort().join()) diffs.push({ name, recount: [rec.repos.size, rec.files.size], builder: [b.repos, b.files] });
}
for (const b of Object.values(built.names)) sumReposBuilt += b.repos;
const N1 = { pass: diffs.length === 0, differences: diffs.slice(0, 10), nDifferences: diffs.length };
const distinctPairsRecount = [...tally.values()].reduce((a, r) => a + r.repos.size, 0);
const N2b = { sumOfPerNameRepoCounts: { recount: sumReposRecount, builder: sumReposBuilt }, distinctNameRepoPairsInRecount: distinctPairsRecount, pass: sumReposRecount === sumReposBuilt && sumReposBuilt === distinctPairsRecount, label: "A1 (post hoc): the within-family identity the builder's check protects" };
const N2 = { preregistered: { builder: N2_builder, pass: N2_builder.pass, verdict: N2_builder.pass ? "pass" : "FAIL (builder refused on the four-family tree; see DIAG)" }, N2b, diag: null };

// ── N3 report ───────────────────────────────────────────────────────────────────────────────────────────────────────
const stagedFiles = walk(STAGE);
const N3 = { stagedFiles: stagedFiles.length, stagedC: walk(STAGE_C).length, stagedByLang, restrictedExcluded, cRepos: cReposStaged, heldOutNeverOpened: true, pass: true };

// ── N4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const filesPerRepo = {};
for (const f of fileInfo) filesPerRepo[f.repo] = (filesPerRepo[f.repo] || 0) + 1;
const floorShare = built.counts.distinctNames ? built.counts.namesAtOrAboveGenericFloor / built.counts.distinctNames : null;
const N4 = { namesAtOrAboveGenericFloor: built.counts.namesAtOrAboveGenericFloor, distinctNames: built.counts.distinctNames, share: floorShare, filesPerRepo, oldPriorFloorNames: readJson(path.join(PRIORS, "code-name-c.json")).counts.namesAtOrAboveGenericFloor, pass: built.counts.namesAtOrAboveGenericFloor > 0 && floorShare < 0.10 };

// ── N5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const fnNames = (p, kinds) => new Set(Object.entries(p.names).filter(([, v]) => v.kinds.some((k) => kinds.includes(k))).map(([n]) => n));
const recipeFn = fnNames(built, ["function"]);
const goldC = fnNames(readJson(path.join(PRIORS, "code-name-train-c.json")), ["function"]);
const goldGo = fnNames(readJson(path.join(PRIORS, "code-name-train-go.json")), ["function", "method"]);
const inter = (a, b) => [...a].filter((x) => b.has(x)).length;
const shareC = recipeFn.size ? inter(recipeFn, goldC) / recipeFn.size : null;
const shareGo = recipeFn.size ? inter(recipeFn, goldGo) / recipeFn.size : null;
const N5 = { recipeFunctionNames: recipeFn.size, goldCFunctionNames: goldC.size, shareOfRecipeInGoldC: shareC, controlShareOfRecipeInGoldGo: shareGo, recipeRecallOfGoldC: goldC.size ? inter(recipeFn, goldC) / goldC.size : null, pass: shareC >= 0.80 && shareGo <= 0.33 * shareC };

// ── N5b (A2, post hoc): file-level recipe vs gold on parse-ok files; hard keywords among the names ─────────────────────────────
let N5b = { gap: "gold unavailable" };
if (goldAvailable().available) {
  const items = cTrain.map((f) => ({ language: "c", text: fs.readFileSync(f.path, "utf8"), fileName: path.basename(f.path) }));
  const golds = await goldBatch(items);
  let tp = 0, rec = 0, gl = 0, nOk = 0, nBad = 0, recBad = 0;
  const byRepo = {};
  golds.forEach((g, k) => {
    const re = new RegExp(C_RE.source, C_RE.flags);
    const rn = new Set();
    let mm;
    while ((mm = re.exec(items[k].text))) rn.add(mm[1]);
    if (g.error || (g.parse?.error_bytes_frac ?? 0) > 0.02) { nBad++; recBad += rn.size; return; }
    nOk++;
    const gfn = new Set(g.defs.filter((d) => d.kind === "function" || d.kind === "method").map((d) => d.name));
    rec += rn.size; gl += gfn.size;
    const r = (byRepo[cTrain[k].repo] ||= { recipe: 0, gold: 0, tp: 0 });
    r.recipe += rn.size; r.gold += gfn.size;
    for (const n of rn) if (gfn.has(n)) { tp++; r.tp++; }
  });
  const kw = readJson(path.join(PRIORS, "code-kw-c-grammar.json"));
  const hard = new Set(kw.keywords);
  const inBoth = (p) => Object.keys(p.names).filter((n) => hard.has(n));
  N5b = {
    label: "A2 POST HOC (descriptive; the N5 verdict stays FAIL)",
    filesParseOk: nOk, filesParseFail: nBad, recipeNamesInParseFailFiles: recBad,
    filePrecision: rec ? tp / rec : null, fileRecall: gl ? tp / gl : null, recipeNames: rec, goldFunctionNames: gl, truePositives: tp,
    perRepo: Object.fromEntries(Object.entries(byRepo).map(([k, v]) => [k, { precision: v.recipe ? +(v.tp / v.recipe).toFixed(3) : null, recall: v.gold ? +(v.tp / v.gold).toFixed(3) : null, recipeNames: v.recipe, goldNames: v.gold }])),
    hardKeywordsAmongNames: { recipePrior: inBoth(built), goldRoutePrior_code_name_train_c: inBoth(readJson(path.join(PRIORS, "code-name-train-c.json"))), reading: "a hard keyword among declared names is a parse artefact in both routes; a consumer should cross-check names against the keyword prior" },
    reading: "recipe names are real functions (high precision) but the recipe finds only about half of what the grammar finds, and its recall is style-dependent (column-0 `type name(args) {` code)",
  };
}
N2.diag = DIAG;
const checks = { N1, N2, N3, N4, N5, N5b };
const out = {
  schema: "CodeNamePrior@1",
  language: "c",
  provenance: {
    giver: "regex declaration recipe for C (function definitions at line start; identical to live_priors build-code-name-prior.mjs and scripts/build-code-name-prior-split.mjs) tallied over the manifest TRAIN split only, in distinct repositories; sum-checked against the blended tally over the c/go/py/js families staged from the same TRAIN split",
    source: "manifest " + path.basename(MANIFEST) + " split=train (BY REPOSITORY: sha256(lower(owner/repo)) mod 4 in {0,1}); restricted (copyleft) files excluded",
    builder: "native/scripts/build-code-name-prior-split.mjs (unmodified, run as a subprocess on a TRAIN-only staging tree), post-processed by native/eval/coding-competence/build-c-name-prior-train.mjs",
    builderOriginalGiver: built.provenance.giver,
    train: { manifest: path.basename(MANIFEST), split: "train", repos: cReposStaged, filesPerRepo, restrictedExcluded: restrictedExcluded.c, devTestRead: false },
    familyFiles: built.provenance.familyFiles,
    familyRepos: built.provenance.familyRepos,
    note: "held-out safe: built from TRAIN repositories only (the bare code-name-c.json is the older ethos tally and is not). genericity is a fact about this language's own codebases: repos counts the distinct TRAIN repositories that declare the name through the C recipe. DISCLOSURE: 240 of the files come from four repositories; curl/httpd/openssh/openssl contribute 1-2 files each, so repos>=2 mostly records what the four large repositories share. The recipe finds function definitions only (no macros, types or prototypes).",
    builtOn: new Date().toISOString().slice(0, 10),
    checks,
  },
  counts: built.counts,
  names: built.names,
};
const text = JSON.stringify(out);
if (WRITE) fs.writeFileSync(FINAL, text);
console.log(JSON.stringify({ out: WRITE ? FINAL : null, bytes: text.length, sha256: crypto.createHash("sha256").update(text).digest("hex").slice(0, 16), counts: built.counts, checks: { N1: { pass: N1.pass, n: N1.nDifferences }, N2: { preregistered: N2.preregistered.verdict, sumsA: sumA, DIAG: { reproduces: DIAG.reproducesBuilderNumbers, pairs: DIAG.nameRepoPairsInTwoFamilies }, N2b: N2b.pass }, N3: { pass: N3.pass, staged: N3.stagedFiles, byLang: stagedByLang }, N4, N5, N5b: { filePrecision: N5b.filePrecision, fileRecall: N5b.fileRecall, hardKeywordsAmongNames: N5b.hardKeywordsAmongNames?.recipePrior } } }, null, 1));
