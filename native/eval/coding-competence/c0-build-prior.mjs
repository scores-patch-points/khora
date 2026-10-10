// eval/coding-competence/c0-build-prior.mjs — build priors/code-identify.json (CodeIdentifyPrior@1) for adapters/code/identify.js.
//
// SPLIT DISCIPLINE (RULE 9). Only TRAIN files of the corpus manifest (split by REPOSITORY) are counted; `restricted` (copyleft)
// rows are not read; dev and test files are never opened here. The keyword sets are RECEIVED from named givers, never counted
// on a corpus; only the two membership rates a_L / b_L and the shape feature counts come from TRAIN.
//
// KEYWORD GIVERS, in order of preference (the choice per language is recorded in the prior as languages[].keywordSource):
//   1. native/priors/code-kw-<lang>.json  (CodeKeywordPrior@1: python = the CPython engine, javascript = tree-sitter) and any
//      other code-kw-<lang>.json that exists when this script runs;
//   2. the ethos LanguageLawPrior@1 files (tree-sitter node-types: lexical.keywords + #directive tokens of lexical.operators);
//      EXCEPTION, declared: typescript's law prior is skipped because native/adapters/text/code-structure.js records that its
//      keyword list was measured as grammar-heuristic junk (3 of 21 intersect javascript's); the grammar-derived set is used;
//   3. a set derived by eval/coding-competence/c0_grammar_keywords.py from the language's tree-sitter grammar (one declared rule);
//   a language none of these gives a set for (json, yaml, toml, clojure, scheme, markdown, latex, svelte ...) is a TYPED GAP:
//   its keyword channel contributes nothing and it is identified by shape alone.
//
// --variant blind (amendment A1): builds priors/code-identify-blind.json (CodeIdentifyShapePrior@1): the SAME TRAIN files and the SAME
// keyword sets (frozen: read back from the existing priors/code-identify.json, never re-derived), but the shape channel is counted with
// word identity WITHHELD (every word is W in the first-token features), so the only word identity left in the identifier is the received set.
//
// usage: node eval/coding-competence/c0-build-prior.mjs [--out priors/code-identify.json] [--limit-files N] [--variant named|blind]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { trainPrior, IDENTIFY_VERSION } from "../../adapters/code/identify.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const MANIFEST = "/private/tmp/claude-501/code-corpus/manifest.json";
const WORKDIR = "/private/tmp/claude-501/coding-competence/c0";
const GRAMMAR_KW = path.join(WORKDIR, "grammar-keywords.json");
const LAW_DIR = "/Users/mlacy/Documents/3.0/ethos/derived-priors/code-priors";
const PY = "/private/tmp/claude-501/venv/bin/python";
const DIRECTIVE = /^[#@][A-Za-z][A-Za-z0-9_]*$/;

const args = process.argv.slice(2);
const argOf = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const VARIANT = argOf("--variant", "named");
const MAIN_PRIOR = path.join(NATIVE, "priors/code-identify.json");
const OUT = path.resolve(argOf("--out", VARIANT === "blind" ? path.join(NATIVE, "priors/code-identify-blind.json") : MAIN_PRIOR));
const FILE_LIMIT = Number(argOf("--limit-files", 0)) || Infinity;

const readJson = (f) => {
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
};
const manifest = readJson(MANIFEST);
if (!manifest) throw new Error(`corpus manifest missing: ${MANIFEST}`);
if (!fs.existsSync(GRAMMAR_KW)) {
  fs.mkdirSync(WORKDIR, { recursive: true });
  const r = spawnSync(PY, [path.join(HERE, "c0_grammar_keywords.py"), GRAMMAR_KW], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`grammar keyword extraction failed: ${r.stderr.slice(0, 400)}`);
}
const grammarKw = readJson(GRAMMAR_KW);

/** {keywords, source} for one language, by the declared order of givers (or {keywords:null, source:null} = typed gap). */
function keywordsFor(lang) {
  const codes = [lang, { python: "py", javascript: "js" }[lang]].filter(Boolean);
  for (const c of codes) {
    const p = readJson(path.join(NATIVE, `priors/code-kw-${c}.json`));
    if (p?.schema === "CodeKeywordPrior@1" && p.keywords?.length) {
      return { keywords: p.keywords, source: { giver: p.provenance?.giver ?? "CodeKeywordPrior@1", file: `priors/code-kw-${c}.json`, kind: "received:code-kw" } };
    }
  }
  if (lang !== "typescript") {
    const law = readJson(path.join(LAW_DIR, `${lang.replace(/_/g, "-")}-language-law-prior-v1.json`));
    if (law?.schema === "LanguageLawPrior@1") {
      const kws = [...(law.lexical?.keywords ?? []), ...(law.lexical?.operators ?? []).filter((o) => DIRECTIVE.test(o))];
      if (kws.length) return { keywords: kws, source: { giver: law.giver?.resource ?? "LanguageLawPrior@1", file: `ethos/derived-priors/code-priors/${lang.replace(/_/g, "-")}-language-law-prior-v1.json`, kind: "received:law-prior" } };
    }
  }
  const g = grammarKw?.languages?.[lang];
  if (g?.keywords?.length) {
    return { keywords: g.keywords, source: { giver: `tree-sitter grammar "${g.grammar}" (node kinds)`, file: "c0_grammar_keywords.py", kind: "derived:grammar", rule: grammarKw.rule } };
  }
  return { keywords: null, source: { giver: null, kind: "gap", reason: g?.error ? `grammar unavailable: ${g.error}` : "no received keyword giver and the grammar names no word-like tokens" } };
}

if (VARIANT === "blind") {
  const main = readJson(MAIN_PRIOR);
  if (main?.schema !== "CodeIdentifyPrior@1") throw new Error("blind variant needs priors/code-identify.json (build the named prior first)");
  const langsB = [];
  const statB = { files: 0, bytes: 0, unreadable: 0, restricted_skipped: 0 };
  for (const lg of main.languages) {
    const files = [];
    for (const row of manifest.languages[lg.id].train) {
      if (row.restricted) { statB.restricted_skipped++; continue; }
      try { files.push({ text: fs.readFileSync(row.path, "utf8"), repo: row.repo }); statB.files++; statB.bytes += row.bytes; } catch { statB.unreadable++; }
    }
    langsB.push({ id: lg.id, keywords: lg.keywords.length ? lg.keywords : null, keywordSource: lg.keywordSource, files });
  }
  const tb = Date.now();
  const bodyB = trainPrior({ languages: langsB, shapeNamesWords: false });
  const shapePrior = {
    schema: "CodeIdentifyShapePrior@1",
    version: IDENTIFY_VERSION,
    basedOn: { file: "priors/code-identify.json", sha256: createHash("sha256").update(fs.readFileSync(MAIN_PRIOR)).digest("hex") },
    languageIds: main.languages.map((l) => l.id),
    provenance: {
      giver: "shape statistics counted on TRAIN files of the code corpus manifest, word identity withheld (amendment A1 of eval/coding-competence/c0-identify.mjs)",
      builder: "eval/coding-competence/c0-build-prior.mjs --variant blind (+ adapters/code/identify.js::trainPrior shapeNamesWords:false)",
      split: "TRAIN only, by repository; restricted rows skipped; dev/test never opened",
      read: statB,
      builtAt: new Date().toISOString().slice(0, 10),
    },
    features: bodyB.features,
    counts: bodyB.counts,
    params: bodyB.params,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(shapePrior) + "\n");
  console.log(JSON.stringify({ out: OUT, bytes: fs.statSync(OUT).size, seconds: (Date.now() - tb) / 1000, read: statB, vocabulary: bodyB.params.vocabularySize }));
  process.exit(0);
}

const names = Object.keys(manifest.languages).sort();
const languages = [];
const readStats = { files: 0, bytes: 0, unreadable: 0, restricted_skipped: 0 };
for (const lang of names) {
  const { keywords, source } = keywordsFor(lang);
  const files = [];
  for (const row of manifest.languages[lang].train) {
    if (row.restricted) { readStats.restricted_skipped++; continue; }
    if (files.length >= FILE_LIMIT) break;
    try {
      const text = fs.readFileSync(row.path, "utf8");
      files.push({ text, repo: row.repo });
      readStats.files++;
      readStats.bytes += row.bytes;
    } catch { readStats.unreadable++; }
  }
  languages.push({ id: lang, keywords, keywordSource: source, files });
}

const t0 = Date.now();
const body = trainPrior({ languages });
const prior = {
  schema: "CodeIdentifyPrior@1",
  version: IDENTIFY_VERSION,
  provenance: {
    giver: "keyword sets: RECEIVED per language (see languages[].keywordSource); shape statistics: counted on TRAIN files of the code corpus manifest",
    builder: "eval/coding-competence/c0-build-prior.mjs (+ adapters/code/identify.js::trainPrior, c0_grammar_keywords.py)",
    manifest: { path: MANIFEST, schema: manifest.schema, generated_at: manifest.generated_at, sha256: createHash("sha256").update(fs.readFileSync(MANIFEST)).digest("hex") },
    split: "TRAIN only, by repository (manifest.languages[L].train); restricted rows skipped; dev/test never opened",
    read: readStats,
    builtAt: new Date().toISOString().slice(0, 10),
    note: "closed candidate set = the manifest languages; keyword gaps are typed (status 'gap'), never imputed",
  },
  ...body,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(prior) + "\n");
const summary = {
  out: OUT,
  bytes: fs.statSync(OUT).size,
  seconds: (Date.now() - t0) / 1000,
  read: readStats,
  vocabulary: body.params.vocabularySize,
  vocabularyBeforeCap: body.params.vocabularyBeforeCap,
  keyword: Object.fromEntries(body.languages.map((l) => [l.id, { status: l.status, n: l.keywords.length, mode: l.mode, a: l.a == null ? null : +l.a.toFixed(3), b: l.b == null ? null : +l.b.toFixed(3), source: l.keywordSource?.kind }])),
};
fs.mkdirSync(WORKDIR, { recursive: true });
fs.writeFileSync(path.join(WORKDIR, "prior-summary.json"), JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, keyword: undefined, keywordStatus: Object.fromEntries(Object.entries(summary.keyword).map(([k, v]) => [k, v.status])) }));
