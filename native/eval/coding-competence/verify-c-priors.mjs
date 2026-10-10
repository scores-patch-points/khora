#!/usr/bin/env node
// verify-c-priors.mjs : the loader check and the corpus-facing checks (with controls built to fail) for the C priors
//   priors/code-kw-c-grammar.json   (built by build-c-kw-prior.py)
//   priors/code-name-train-recipe-c.json (built by build-c-name-prior-train.mjs)
//
//   node eval/coding-competence/verify-c-priors.mjs [--no-network] [--out REPORT.json]
//
// ZERO MODEL. READS ONLY the manifest's C TRAIN split (unrestricted files). DEV and TEST are never opened by this file.
// Existing source and priors are only READ (code-structure.js, name-gate.js, code-kw-*.json, code-ctx-c.json).
//
// PRE-REGISTERED PREDICTIONS AND PASS RULES (II.5): written before the first run of this file or of build-c-kw-prior.py.
// Nothing below is tuned after seeing a result; a failed rule is reported as a failure.
//
//  L1  LOADER.  loadCodeKeywordPrior("c") returns null, because CODE_KW_FILE / CODE_KW_LANG in adapters/text/code-structure.js
//      carry only py and js.  The same call for "python" and "javascript" returns a prior (positive control: the loader works).
//      A self-contained re-implementation of the loader's own read (JSON parse + schema check + keywordSetOf) over the new file
//      returns a non-empty Set.  The needed source edit is REPORTED, never made.
//  S1  REFUSAL COST (precision).  Denominator: every CORE definition occurrence (gold-1 CORE_DEF_KINDS, macros included) in the
//      parse-ok TRAIN files (error_bytes_frac <= 0.02, the C2 constant).  S1(list) = occurrences whose name is in `list`
//      / denominator.  Prediction: S1(keywords) <= 0.01 (hard keywords almost never name a being) and > 0 (at least one hard
//      keyword is `#define`d as a portability shim in TRAIN: inline/const/restrict/volatile/...).  CONTROLS built to fail:
//        deranged  : 1000 seeded draws; each replaces every real hard keyword that occurs in TRAIN by a random non-prior word
//                    from the same log2 occurrence bucket (same size, same token mass, different identity);
//        decoy     : the 20 most frequently declared TRAIN names as a "keyword list" (a list that must hurt).
//      LICENCE (the statistic must move under perturbation): median S1(deranged) >= 3 x S1(real) (or, when S1(real) = 0,
//      median S1(deranged) > 0), AND S1(decoy) >= 0.05.  PASS(S1) = S1(real) <= 0.01 AND licence holds.  If the licence fails the
//      claim is NOT asserted: S1 is then reported as uninformative.
//  P5  THE ENGINE SPLIT CARRIES INFORMATION.  Per-word declared-name rate (core defs named w / occurrences of w), pooled over the
//      words that occur in TRAIN: rate(softKeywords U builtins) > rate(keywords) (the words the engines let a programmer
//      declare are declared more often than the words they forbid).  FAIL otherwise (the split would be taxonomy, not signal).
//  S2  COVERAGE.  Gold-1 tokens of class `keyword` that are word-shaped (not `#directive`) in the parse-ok TRAIN files: the
//      occurrence-weighted share whose text is in keywords U softKeywords U builtins.  Prediction >= 0.99.  Directive tokens
//      (`#include` ...) are covered by `directives` (reported separately, prediction 1.0).  CONTROLS: deranged = 1000 seeded
//      size-matched random draws of non-prior TRAIN words (licence: median coverage <= 0.10); wrong-language priors = the existing
//      code-kw-{go,java,ruby,py}.json (each must cover at least 0.05 LESS than the real prior; if one does not, report that the
//      statistic does not distinguish the language from that neighbour).  Descriptive, no pass rule: the OLD code-kw-c.json
//      (38 words); prediction: the new prior covers at least as much.
//  S3  GRAMMAR SOURCE AUDIT (needs the network; a typed gap when offline).  Fetch grammar.js at the pinned rev (read to memory,
//      nothing saved), extract the `primitive_type` token list, compare with the lexer-probed primitive words.  Prediction:
//      probed subset of grammar.js list (soundness, must be 100%) and probed recall >= 0.80 of the list.  Words of the list
//      the TRAIN lexicon never exhibited are REPORTED as `unprobed` and are a proposed rebuild lexicon; the shipped prior is
//      not changed by this audit.
//  S5  SWAP CONSEQUENCES (reported, no rule): diff old vs new keyword sets; whether code-ctx-c.json's closed-class keyword list
//      equals the new set (name-gate.js discloses a mismatch otherwise, so code-ctx-c would need a rebuild after the swap).
//
// The name prior's own checks (N1 independent recount equal to the builder output, N2 sum-check against the blended tally,
// N3 TRAIN-only, N4 genericity floor counts) live in build-c-name-prior-train.mjs; this file only reads and reports the result.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { goldBatch, goldAvailable, CORE_DEF_KINDS } from "./gold.mjs";
import { mulberry32, fnv1a } from "./c2-lib.mjs";
import { loadCodeKeywordPrior, keywordSetOf, loadCodeNamePriorSplit } from "../../adapters/text/code-structure.js";
import { loadKeywordSet } from "../../adapters/code/name-gate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.resolve(HERE, "../../priors");
const MANIFEST = process.env.C_PRIORS_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
const OUT = (() => { const i = process.argv.indexOf("--out"); return i > 0 ? process.argv[i + 1] : "/private/tmp/claude-501/coding-competence/c-priors/verify-report.json"; })();
const NETWORK = !process.argv.includes("--no-network");
const PARSE_FAIL = 0.02; // = c2-lib CONSTS.PARSE_FAIL
const DRAWS = 1000;
const SEED = 20261006;
const CORE = new Set(CORE_DEF_KINDS);

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };
const log2b = (n) => Math.floor(Math.log2(Math.max(1, n)));
const report = { script: "verify-c-priors.mjs", date: new Date().toISOString().slice(0, 10), results: {} };

// ── L1 loader ───────────────────────────────────────────────────────────────────────────────────────────────────────
const kwFile = path.join(PRIORS, "code-kw-c-grammar.json");
const newKw = readJson(kwFile);
{
  const sim = (() => { try { const p = JSON.parse(fs.readFileSync(kwFile, "utf8")); return p?.schema === "CodeKeywordPrior@1" ? keywordSetOf(p) : null; } catch { return null; } })();
  const L1 = {
    loadCodeKeywordPrior_c_is_null: loadCodeKeywordPrior("c") === null,
    loadCodeKeywordPrior_python_loads: !!loadCodeKeywordPrior("python"),
    loadCodeKeywordPrior_javascript_loads: !!loadCodeKeywordPrior("javascript"),
    selfContainedReadOfNewFile: { schemaOk: newKw.schema === "CodeKeywordPrior@1", keywordSetSize: sim ? sim.size : null },
    nameGate_loadKeywordSet_c: (() => { const k = loadKeywordSet("c"); return { file: k.file, size: k.set ? k.set.size : null, note: "name-gate.js reads priors/code-kw-c.json by name: the OLD prior" }; })(),
    nameSplit_c_loader: (() => { const p = loadCodeNamePriorSplit("c"); return { file: "code-name-c.json", repos: p?.counts?.repos, distinctNames: p?.counts?.distinctNames, namesAtOrAboveGenericFloor: p?.counts?.namesAtOrAboveGenericFloor, heldOutSafe: false, note: "OLD ethos-built tally; its tree includes repositories the manifest holds in dev/test" }; })(),
    neededSourceEdit: [
      { file: "native/adapters/text/code-structure.js", line: "const CODE_KW_FILE = Object.freeze({ py: \"code-kw-py.json\", js: \"code-kw-js.json\" });", change: "add  c: \"code-kw-c.json\"  (after the swap below) or  c: \"code-kw-c-grammar.json\"" },
      { file: "native/adapters/text/code-structure.js", line: "const CODE_KW_LANG = Object.freeze({ python: \"py\", py: \"py\", javascript: \"js\", js: \"js\" });", change: "add  c: \"c\"" },
    ],
    nonSourceAlternative: "cp native/priors/code-kw-c-grammar.json native/priors/code-kw-c.json  (name-gate.js already reads code-kw-c.json by name; no source edit needed for the C2 reader; loadCodeKeywordPrior still needs the two source edits above)",
  };
  L1.pass = L1.loadCodeKeywordPrior_c_is_null && L1.loadCodeKeywordPrior_python_loads && L1.loadCodeKeywordPrior_javascript_loads && !!sim && sim.size > 0;
  report.results.L1 = L1;
}

// ── gold over TRAIN ─────────────────────────────────────────────────────────────────────────────────────────────────
if (!goldAvailable().available) { console.error("gold unavailable: " + goldAvailable().reason); process.exit(3); }
const manifest = readJson(MANIFEST);
const Lc = manifest.languages.c;
const other = new Set([...Lc.dev, ...Lc.test].map((f) => f.repo));
const trainRows = Lc.train.filter((f) => !f.restricted);
const leaked = [...new Set(trainRows.map((f) => f.repo))].filter((r) => other.has(r));
if (leaked.length) { console.error("TRAIN/dev-test repository overlap: " + leaked.join(",")); process.exit(4); }
const items = trainRows.map((f) => ({ language: "c", text: fs.readFileSync(f.path, "utf8"), fileName: path.basename(f.path) }));
const golds = await goldBatch(items);
const files = [];
const excluded = { gold_error: 0, parse_fail: 0 };
golds.forEach((g, k) => {
  if (g.error) { excluded.gold_error++; return; }
  if ((g.parse?.error_bytes_frac ?? 0) > PARSE_FAIL) { excluded.parse_fail++; return; }
  files.push({ repo: trainRows[k].repo, rel: trainRows[k].rel, text: items[k].text, g });
});
const WORDY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const HARD_FOR_POSTHOC = new Set(newKw.keywords);
const occ = new Map();      // word -> occurrences as a non-comment non-string token
const declN = new Map();    // word -> core def occurrences
const declRepos = new Map(); // word -> Set(repos)
const declKinds = new Map();
let totalDecl = 0;
let totalDeclErrorFree = 0;           // post hoc (A1): core defs in files with zero tree-sitter error nodes
const hardDefHits = [];               // post hoc (A1): every core def whose name is a hard keyword, with where it came from
const kwTokens = new Map(); // gold keyword-class word tokens -> count
const dirTokens = new Map();
const identPool = new Set();
for (const f of files) {
  for (const t of f.g.tokens) {
    const w = f.text.slice(t.start, t.end);
    if (t.class === "keyword" && w.startsWith("#")) { dirTokens.set(w, (dirTokens.get(w) || 0) + 1); continue; }
    if (!WORDY.test(w) || t.class === "comment" || t.class === "string") continue;
    occ.set(w, (occ.get(w) || 0) + 1);
    if (t.class === "keyword") kwTokens.set(w, (kwTokens.get(w) || 0) + 1);
    if (t.class === "identifier" || t.class === "type") identPool.add(w);
  }
  for (const d of f.g.defs) {
    if (!CORE.has(d.kind)) continue;
    totalDecl++;
    if ((f.g.parse?.error_nodes ?? 0) === 0) totalDeclErrorFree++;
    if (HARD_FOR_POSTHOC.has(d.name)) hardDefHits.push({ repo: f.repo, file: f.rel, line: f.text.slice(0, d.nameStart).split("\n").length, kind: d.kind, name: d.name, fileErrorNodes: f.g.parse?.error_nodes ?? 0, fileErrorBytesFrac: f.g.parse?.error_bytes_frac ?? 0 });
    declN.set(d.name, (declN.get(d.name) || 0) + 1);
    if (!declRepos.has(d.name)) declRepos.set(d.name, new Set());
    declRepos.get(d.name).add(f.repo);
    if (!declKinds.has(d.name)) declKinds.set(d.name, {});
    declKinds.get(d.name)[d.kind] = (declKinds.get(d.name)[d.kind] || 0) + 1;
  }
}
report.train = { files: files.length, repos: [...new Set(files.map((f) => f.repo))].sort(), excluded, restricted_excluded: Lc.train.length - trainRows.length, coreDefOccurrences: totalDecl, distinctWords: occ.size };

const hardSet = new Set(newKw.keywords), softSet = new Set(newKw.softKeywords), builtinSet = new Set(newKw.builtins), dirSet = new Set(newKw.directives);
const closedAll = new Set([...hardSet, ...softSet, ...builtinSet, ...dirSet]);
const s1 = (list) => { let h = 0; for (const w of list) h += declN.get(w) || 0; return totalDecl ? h / totalDecl : null; };

// ── S1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const real = s1(hardSet);
  const hitWords = [...hardSet].filter((w) => declN.get(w)).map((w) => ({ word: w, decls: declN.get(w), repos: [...declRepos.get(w)].sort(), kinds: declKinds.get(w) })).sort((a, b) => b.decls - a.decls);
  // pool by log2 bucket of occurrence count
  const byBucket = new Map();
  for (const w of identPool) {
    if (closedAll.has(w)) continue;
    const b = log2b(occ.get(w));
    if (!byBucket.has(b)) byBucket.set(b, []);
    byBucket.get(b).push(w);
  }
  for (const arr of byBucket.values()) arr.sort();
  const realInTrain = [...hardSet].filter((w) => occ.get(w));
  const rng = mulberry32(fnv1a("S1:" + SEED));
  const nearest = (b) => { for (let d = 0; d < 40; d++) for (const bb of [b - d, b + d]) if ((byBucket.get(bb) || []).length) return byBucket.get(bb); return []; };
  const draws = [];
  for (let i = 0; i < DRAWS; i++) {
    const used = new Set();
    for (const w of realInTrain) {
      const arr = nearest(log2b(occ.get(w)));
      let pick = null;
      for (let tries = 0; tries < 50 && !pick; tries++) { const c = arr[Math.floor(rng() * arr.length)]; if (!used.has(c)) pick = c; }
      if (pick) used.add(pick);
    }
    draws.push(s1(used));
  }
  const top20 = [...declN.entries()].filter(([w]) => !closedAll.has(w)).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 20).map(([w]) => w);
  const decoy = s1(top20);
  const medCtl = median(draws);
  const licence = (real === 0 ? medCtl > 0 : medCtl >= 3 * real) && decoy >= 0.05;
  const pass = real <= 0.01 && licence;
  // P5
  const rate = (set) => { let d = 0, o = 0; for (const w of set) if (occ.get(w)) { d += declN.get(w) || 0; o += occ.get(w); } return o ? d / o : null; };
  const rHard = rate(hardSet), rSoftB = rate(new Set([...softSet, ...builtinSet]));
  const softBuiltinDeclared = [...softSet, ...builtinSet].filter((w) => declN.get(w)).map((w) => ({ word: w, class: softSet.has(w) ? "soft" : "builtin", decls: declN.get(w), repos: [...declRepos.get(w)].sort() })).sort((a, b) => b.decls - a.decls);
  const posthoc = {
    label: "A1 POST HOC (written after the first S1 run; not part of the pre-registered pass rule, licence or verdict)",
    hits: hardDefHits.length,
    hitsInFilesWithZeroErrorNodes: hardDefHits.filter((h) => h.fileErrorNodes === 0).length,
    hitsByKind: hardDefHits.reduce((a, h) => { a[h.kind] = (a[h.kind] || 0) + 1; return a; }, {}),
    coreDeclInErrorFreeFiles: totalDeclErrorFree,
    S1_real_errorFreeFilesOnly: totalDeclErrorFree ? hardDefHits.filter((h) => h.fileErrorNodes === 0).length / totalDeclErrorFree : null,
    macroKindHits: hardDefHits.filter((h) => h.kind === "macro").length,
    sites: hardDefHits.slice(0, 20),
    reading: "the hits are tree-sitter error-recovery artefacts (an `else if(...)` chain broken by #ifdef branches is recovered as a function named `if`), not beings: gold-1 defs are not trustworthy inside error regions",
  };
  report.results.S1 = { totalCoreDecl: totalDecl, S1_real: real, hardKeywordsDeclaredAsBeings: hitWords, deranged: { draws: DRAWS, size: realInTrain.length, median: medCtl, p5: pct(draws, 0.05), p95: pct(draws, 0.95), max: Math.max(...draws), seed: SEED }, decoy: { words: top20, S1: decoy }, licence, pass, posthoc,
    note: "S1 = share of CORE definition occurrences (macros included) whose name is a hard keyword. A positive value is a real finding: portability macros shadow keywords." };
  report.results.P5 = { rate_hard_per_occurrence: rHard, rate_soft_and_builtins_per_occurrence: rSoftB, softBuiltinDeclared, pass: rSoftB != null && rHard != null && rSoftB > rHard };
}

// ── S2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const totalKw = [...kwTokens.values()].reduce((a, b) => a + b, 0);
  const cover = (set) => { let c = 0; for (const [w, n] of kwTokens) if (set.has(w)) c += n; return totalKw ? c / totalKw : null; };
  const realSet = new Set([...hardSet, ...softSet, ...builtinSet]);
  const real = cover(realSet);
  const uncovered = [...kwTokens].filter(([w]) => !realSet.has(w)).sort((a, b) => b[1] - a[1]).map(([w, n]) => ({ word: w, n }));
  const dirTotal = [...dirTokens.values()].reduce((a, b) => a + b, 0);
  let dirCov = 0; for (const [w, n] of dirTokens) if (dirSet.has(w.slice(1))) dirCov += n;
  // deranged: size-matched random non-prior TRAIN words
  const poolArr = [...identPool].filter((w) => !closedAll.has(w)).sort();
  const rng = mulberry32(fnv1a("S2:" + SEED));
  const sizeN = realSet.size;
  const draws = [];
  for (let i = 0; i < DRAWS; i++) {
    const s = new Set();
    while (s.size < sizeN && s.size < poolArr.length) s.add(poolArr[Math.floor(rng() * poolArr.length)]);
    draws.push(cover(s));
  }
  const wrong = {};
  for (const lang of ["go", "java", "ruby", "py"]) {
    try {
      const p = readJson(path.join(PRIORS, `code-kw-${lang}.json`));
      wrong[lang] = { keywords: p.keywords.length, coverage: cover(new Set([...p.keywords, ...(p.softKeywords || []), ...(p.builtins || [])])) };
    } catch (e) { wrong[lang] = { gap: String(e.message).slice(0, 80) }; }
  }
  const old = readJson(path.join(PRIORS, "code-kw-c.json"));
  const oldCov = cover(new Set([...old.keywords, ...(old.softKeywords || []), ...(old.builtins || [])]));
  const medCtl = median(draws);
  const wrongOk = Object.values(wrong).every((w) => w.coverage == null || w.coverage <= real - 0.05);
  report.results.S2 = { goldKeywordWordTokens: totalKw, distinctGoldKeywordWords: kwTokens.size, coverage_real: real, uncovered, directiveTokens: dirTotal, directiveCoverage: dirTotal ? dirCov / dirTotal : null,
    deranged: { draws: DRAWS, size: sizeN, median: medCtl, max: Math.max(...draws) }, wrongLanguage: wrong, wrongLanguageAllAtLeast0_05Below: wrongOk, oldPrior: { keywords: old.keywords.length, coverage: oldCov },
    licence: medCtl <= 0.10, pass: real >= 0.99 && medCtl <= 0.10 && wrongOk };
}

// ── S3 grammar.js audit ────────────────────────────────────────────────────────────────────────────────────────────
{
  const rev = newKw.provenance.grammar.rev;
  const url = `https://raw.githubusercontent.com/tree-sitter/tree-sitter-c/${rev}/grammar.js`;
  const probed = new Set(newKw.builtins.concat(newKw.keywords.filter((w) => ["bool", "char", "int", "float", "double", "void"].includes(w))));
  let S3;
  if (!NETWORK) S3 = { gap: "offline (--no-network): audit not run", pass: null };
  else {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const src = await res.text();
      const m = src.match(/primitive_type:\s*_\s*=>\s*token\(choice\(([\s\S]*?)\)\s*\)\s*,/);
      if (!res.ok || !m) S3 = { gap: `could not extract the primitive_type token from ${url} (status ${res.status})`, pass: null };
      else {
        const body = m[1];
        const list = new Set([...body.matchAll(/(?<![`\w])'([A-Za-z_][A-Za-z0-9_]*)'/g)].map((x) => x[1]));
        for (const mm of body.matchAll(/\.\.\.\s*\[([\d,\s]+)\]\.map\(\s*\w+\s*=>\s*`([^`]*)`\s*\)/g)) {
          for (const n of mm[1].split(",").map((s) => s.trim()).filter(Boolean)) list.add(mm[2].replace(/\$\{\w+\}/, n));
        }
        const inList = [...probed].filter((w) => list.has(w));
        const sound = [...probed].filter((w) => !list.has(w));
        const unprobed = [...list].filter((w) => !probed.has(w)).sort();
        S3 = { url, grammarJsPrimitiveWords: list.size, probed: probed.size, soundness: probed.size ? inList.length / probed.size : null, probedNotInGrammarJs: sound, recall: list.size ? inList.length / list.size : null, unprobed, pass: sound.length === 0 && list.size > 0 && inList.length / list.size >= 0.8 };
      }
    } catch (e) { S3 = { gap: "network read failed: " + String(e.message).slice(0, 100), pass: null }; }
  }
  report.results.S3 = S3;
}

// ── S5 swap consequences ───────────────────────────────────────────────────────────────────────────────────────────
{
  const old = readJson(path.join(PRIORS, "code-kw-c.json"));
  const oldSet = new Set(old.keywords), newSet = new Set(newKw.keywords);
  const ctx = (() => { try { return readJson(path.join(PRIORS, "code-ctx-c.json")); } catch { return null; } })();
  const ctxKw = ctx?.closedClass?.keywords ? new Set(ctx.closedClass.keywords) : null;
  const eq = (a, b) => a && b && a.size === b.size && [...a].every((x) => b.has(x));
  report.results.S5 = {
    oldKeywords: oldSet.size, newKeywords: newSet.size, newSoft: softSet.size, newBuiltins: builtinSet.size, newDirectives: dirSet.size,
    inOldNotHard: [...oldSet].filter((w) => !newSet.has(w)).sort().map((w) => ({ word: w, now: softSet.has(w) ? "soft" : builtinSet.has(w) ? "builtin" : "absent" })),
    inNewHardNotOld: [...newSet].filter((w) => !oldSet.has(w)).sort(),
    ctxClosedClassKeywordsEqualOld: eq(ctxKw, oldSet), ctxClosedClassKeywordsEqualNew: eq(ctxKw, newSet),
    consequence: "after cp code-kw-c-grammar.json code-kw-c.json, name-gate.js discloses a keyword-set mismatch against code-ctx-c.json until code-ctx-c.json is rebuilt (build-c2-priors.mjs c)",
  };
}

// ── name prior (read and report) ───────────────────────────────────────────────────────────────────────────────────
{
  const f = path.join(PRIORS, "code-name-train-recipe-c.json");
  if (!fs.existsSync(f)) report.results.name = { gap: "code-name-train-recipe-c.json not built yet (run build-c-name-prior-train.mjs)" };
  else {
    const p = readJson(f);
    const names = Object.keys(p.names);
    const g2 = names.filter((n) => p.names[n].repos >= 2);
    report.results.name = { file: "code-name-train-recipe-c.json", counts: p.counts, trainRepos: p.provenance?.train?.repos, namesAtRepos2: g2.length, topGeneric: g2.sort((a, b) => p.names[b].repos - p.names[a].repos || (a < b ? -1 : 1)).slice(0, 15).map((n) => [n, p.names[n].repos]), checks: p.provenance?.checks };
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
const r = report.results;
console.log(JSON.stringify({
  report: OUT, train: report.train,
  L1: { pass: r.L1.pass, c_null: r.L1.loadCodeKeywordPrior_c_is_null },
  S1_posthoc: { hits: r.S1.posthoc.hits, inErrorFreeFiles: r.S1.posthoc.hitsInFilesWithZeroErrorNodes, macroKindHits: r.S1.posthoc.macroKindHits, kinds: r.S1.posthoc.hitsByKind },
  S1: { real: r.S1.S1_real, derangedMedian: r.S1.deranged.median, decoy: r.S1.decoy.S1, licence: r.S1.licence, pass: r.S1.pass, hitWords: r.S1.hardKeywordsDeclaredAsBeings.slice(0, 12).map((h) => `${h.word}:${h.decls}`) },
  P5: { hard: r.P5.rate_hard_per_occurrence, softBuiltin: r.P5.rate_soft_and_builtins_per_occurrence, pass: r.P5.pass },
  S2: { real: r.S2.coverage_real, uncovered: r.S2.uncovered.slice(0, 10), derangedMedian: r.S2.deranged.median, wrong: Object.fromEntries(Object.entries(r.S2.wrongLanguage).map(([k, v]) => [k, v.coverage])), old: r.S2.oldPrior.coverage, directive: r.S2.directiveCoverage, pass: r.S2.pass },
  S3: r.S3.gap ? { gap: r.S3.gap } : { soundness: r.S3.soundness, recall: r.S3.recall, unprobed: r.S3.unprobed, pass: r.S3.pass },
}, null, 1));
