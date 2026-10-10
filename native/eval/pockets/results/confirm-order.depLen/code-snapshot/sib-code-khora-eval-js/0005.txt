#!/usr/bin/env node
// build-c2-priors.mjs : build the TRAIN-derived priors the C2 NAMES reader holds, for one or more languages.
//
//   node eval/coding-competence/build-c2-priors.mjs python javascript c go ruby java
//
// Writes, into native/priors/ (never overwriting a file that exists under a name this script does not own):
//   code-ctx-<code>.json         CodeContextPrior@1  settled non-names + context tables (the reader's nominations)
//   code-name-<code>.json        CodeNamePrior@1     names declared in TRAIN, distinct-repo counts (ruby, java: new files)
//   code-name-train-<code>.json  same schema, for py/js/c/go whose bare code-name-<code>.json is the OLDER ethos-built prior
//                                (built from a tree that includes repositories the manifest holds in dev/test; not held-out)
// It reads ONLY the manifest's TRAIN split (rule 9: priors from TRAIN only, split by repository). It never opens a dev or
// test file and asserts that no TRAIN repository appears in another split of the same language.
//
// GIVER (every prior names its giver, rule 3): the labels are tree-sitter parses (gold.mjs / gold.py, tree-sitter-language-pack
// 1.21.0) of TRAIN-repository files: a treebank-like corpus. The keyword closed class is the received CodeKeywordPrior@1
// (the language's tree-sitter grammar / engine; scripts/build-code-keyword-prior.mjs). No model is called.
//
// THRESHOLDS are the ones declared in c2-names.mjs's header (adapters/code/name-gate.js PARAMS). They are written into the
// prior's `params` and the loader reports any mismatch.
//
//   settled non-name  = word-like unit word w not a keyword with  occurrences >= SETTLED_MIN_OCC (100, = ceil(3/0.03))
//                       in >= SETTLED_MIN_REPOS (2) TRAIN repositories and ZERO definition-name occurrences of ANY kind
//   closed class      = keywords U settled non-names (they keep their text in context keys; other words are ID)
//   context tables    = for every unit whose word is open-class (not keyword, not settled) and not a secondary def:
//                       per level shape (p2p1n1, p1n1, p2p1, p1) the counts [core defs, occurrences]; only rows with
//                       >= N_MIN_CTX (20) occurrences are stored
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { goldBatch, goldAvailable, GOLD_VERSION } from "./gold.mjs";
import { loadManifest, prepareFile, CONSTS, LANGUAGES } from "./c2-lib.mjs";
import { PARAMS, LANG_CODE, contextKeys, loadKeywordSet } from "../../adapters/code/name-gate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../../priors");
const LEVEL_SHAPES = ["p2p1n1", "p1n1", "p2p1", "p1"];
const OLD_BARE_NAME_PRIOR = new Set(["py", "js", "c", "go"]); // bare code-name-<code>.json exists from the ethos build

/**
 * deriveFromPrepared(files, kwSet) -> { stat, settled:[[w,occ,repos]], settledSet, closed, tables:{level:{key:[defs,occ]}}, openUnits }
 * The pure core of the build (also used by the toy-fixture test). files: [{ repo, prepared }] from prepareFile.
 */
export function deriveFromPrepared(files, kwSet) {
  // pass 1: word statistics
  const stat = new Map(); // w -> {occ, any, core, repos:Set, declRepos:Set, files:Set, kinds:Set}
  files.forEach((f, fi) => {
    for (const u of f.prepared.units) {
      const w = f.prepared.stream[u.i];
      let s = stat.get(w);
      if (!s) { s = { occ: 0, any: 0, core: 0, repos: new Set(), declRepos: new Set(), files: new Set(), kinds: new Set() }; stat.set(w, s); }
      s.occ++; s.repos.add(f.repo);
      if (u.label !== "none") s.any++;
      if (u.label === "core") { s.core++; s.declRepos.add(f.repo); s.files.add(fi); if (u.kind) s.kinds.add(u.kind); }
    }
  });
  const settled = [];
  for (const [w, s] of stat) {
    if (kwSet.has(w)) continue;
    if (s.occ >= PARAMS.SETTLED_MIN_OCC && s.repos.size >= PARAMS.SETTLED_MIN_REPOS && s.any === 0) settled.push([w, s.occ, s.repos.size]);
  }
  settled.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const settledSet = new Set(settled.map((x) => x[0]));
  const closed = new Set([...kwSet, ...settledSet]);

  // pass 2: context tables over open-class words
  const tabs = Object.fromEntries(LEVEL_SHAPES.map((s) => [s, new Map()]));
  let openUnits = 0;
  for (const f of files) {
    const stream = f.prepared.stream;
    for (const u of f.prepared.units) {
      const w = stream[u.i];
      if (kwSet.has(w) || settledSet.has(w) || u.label === "secondary") continue;
      openUnits++;
      const keys = contextKeys(stream, u.i, closed, 1);
      for (const s of LEVEL_SHAPES) {
        const m = tabs[s];
        let row = m.get(keys[s]);
        if (!row) { row = [0, 0]; m.set(keys[s], row); }
        row[1]++;
        if (u.label === "core") row[0]++;
      }
    }
  }
  const tables = {};
  for (const s of LEVEL_SHAPES) {
    const out = {};
    for (const [k, row] of [...tabs[s].entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (row[1] >= PARAMS.N_MIN_CTX) out[k] = row;
    tables[s] = out;
  }

  return { stat, settled, settledSet, closed, tables, openUnits };
}

export async function buildFor(language, { write = true, maxFiles = null } = {}) {
  const code = LANG_CODE[language];
  if (!code) throw new Error(`no code for ${language}`);
  const manifest = loadManifest();
  const L = manifest.languages[language];
  if (!L) throw new Error(`manifest has no ${language}`);
  // split discipline: no TRAIN repo may appear in dev/test of this language
  const other = new Set([...L.dev, ...L.test].map((f) => f.repo));
  const trainRepos = [...new Set(L.train.filter((f) => !f.restricted).map((f) => f.repo))].sort();
  const leaked = trainRepos.filter((r) => other.has(r));
  if (leaked.length) throw new Error(`TRAIN/dev-test repository overlap for ${language}: ${leaked.join(", ")}`);

  const kw = loadKeywordSet(code);
  if (!kw.set) throw new Error(`no keyword prior for ${language} (${kw.file}); build it first with scripts/build-code-keyword-prior.mjs`);

  // LICENCE (rule 11): files the manifest marks `restricted` (copyleft / not on the fetch list, read in place and never
  // redistributed) are NOT used to build priors that ship in the repository; evaluation may read them in place.
  const trainAll = L.train;
  const trainRows = trainAll.filter((f) => !f.restricted);
  const restrictedExcluded = trainAll.length - trainRows.length;
  const rows = maxFiles ? trainRows.slice(0, maxFiles) : trainRows;
  const items = rows.map((f) => ({ language, text: fs.readFileSync(f.path, "utf8"), fileName: path.basename(f.path) }));
  const golds = await goldBatch(items);
  const files = [];
  const excluded = { gold_error: 0, parse_fail: 0 };
  golds.forEach((g, k) => {
    if (g.error) { excluded.gold_error++; return; }
    if ((g.parse?.error_bytes_frac ?? 0) > CONSTS.PARSE_FAIL) { excluded.parse_fail++; return; }
    files.push({ repo: rows[k].repo, path: rows[k].path, prepared: prepareFile(items[k].text, g) });
  });

  const { stat, settled, settledSet, closed, tables, openUnits } = deriveFromPrepared(files, kw.set);

  // the name prior (CodeNamePrior@1 shape): TRAIN-declared names, distinct repos
  const names = {};
  for (const [w, s] of [...stat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (s.core > 0) names[w] = { repos: s.declRepos.size, files: s.files.size, kinds: [...s.kinds].sort() };
  }
  const namePriorFile = OLD_BARE_NAME_PRIOR.has(code) ? `code-name-train-${code}.json` : `code-name-${code}.json`;
  const sha = (o) => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);

  const provenanceCommon = {
    giver: "tree-sitter grammar parses (tree-sitter-language-pack 1.21.0 via eval/coding-competence/gold.py, " + GOLD_VERSION + ") of the manifest TRAIN split: a treebank-like corpus; labels are definition-name nodes of the grammar's own tags.scm plus authored top-ups",
    split: "train",
    manifest: path.basename(process.env.C2_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json"),
    trainRepos,
    trainRepoFiles: Object.fromEntries(trainRepos.map((r) => [r, files.filter((f) => f.repo === r).length])),
    filesUsed: files.length, filesExcluded: { ...excluded, restricted_licence: restrictedExcluded },
    builder: "eval/coding-competence/build-c2-priors.mjs", builtOn: new Date().toISOString().slice(0, 10),
    note: "held-out discipline: built from TRAIN only; no TRAIN repository appears in dev or test of this language (asserted at build time)",
  };
  const ctxPrior = {
    schema: "CodeContextPrior@1", language, code,
    provenance: { ...provenanceCommon, keywordPrior: kw.file, namePriorFile, keywordGiver: kw.prior?.provenance?.giver ?? null },
    params: { N_MIN_CTX: PARAMS.N_MIN_CTX, THETA_ADMIT: PARAMS.THETA_ADMIT, SETTLED_MIN_OCC: PARAMS.SETTLED_MIN_OCC, SETTLED_MIN_REPOS: PARAMS.SETTLED_MIN_REPOS, NAME_FLOOR: PARAMS.NAME_FLOOR, levels: LEVEL_SHAPES },
    closedClass: { keywords: [...kw.set].sort(), settled: settled.map((x) => x[0]) },
    settledStats: Object.fromEntries(settled.map(([w, occ, repos]) => [w, { occ, repos }])),
    counts: { units: [...stat.values()].reduce((a, s) => a + s.occ, 0), openUnits, distinctWords: stat.size, settled: settled.length, rows: Object.fromEntries(LEVEL_SHAPES.map((s) => [s, Object.keys(tables[s]).length])) },
    tables,
  };
  const namePrior = {
    schema: "CodeNamePrior@1", language: code,
    provenance: { ...provenanceCommon, giver: provenanceCommon.giver, familyFiles: files.length, familyRepos: trainRepos.length, note: "TRAIN-only per-language declared-name tally: repos = distinct TRAIN repositories in which the word is the name of a CORE definition (function/method/class/...). Same schema as the ethos-built code-name-<code>.json; this one is held-out safe." },
    counts: { files: files.length, repos: trainRepos.length, totalBytes: rows.reduce((a, r) => a + r.bytes, 0), distinctNames: Object.keys(names).length, totalDeclarations: [...stat.values()].reduce((a, s) => a + s.core, 0), namesAtOrAboveGenericFloor: Object.values(names).filter((n) => n.repos >= PARAMS.NAME_FLOOR).length },
    names,
  };
  if (write) {
    // never overwrite a prior this builder does not own (another agent's, or the main agent's)
    const ownedWrite = (name, obj) => {
      const p = path.join(PRIORS, name);
      if (fs.existsSync(p)) {
        let prev = null;
        try { prev = JSON.parse(fs.readFileSync(p, "utf8")); } catch { prev = null; }
        if (prev?.provenance?.builder !== "eval/coding-competence/build-c2-priors.mjs") throw new Error(`refusing to overwrite ${name}: not built by this script`);
      }
      fs.writeFileSync(p, JSON.stringify(obj));
    };
    ownedWrite(`code-ctx-${code}.json`, ctxPrior);
    ownedWrite(namePriorFile, namePrior);
  }
  return { language, code, files: files.length, excluded, trainRepos, settled: settled.length, rows: ctxPrior.counts.rows, names: Object.keys(names).length, namePriorFile, hash: sha(ctxPrior.tables), sampleSettled: settled.slice(0, 15).map((x) => x[0]) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const langs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const chosen = langs.length ? langs : LANGUAGES;
  const av = goldAvailable();
  if (!av.available) { console.error("gold unavailable: " + av.reason); process.exit(2); }
  for (const l of chosen) {
    const r = await buildFor(l);
    console.log(JSON.stringify(r));
  }
}
