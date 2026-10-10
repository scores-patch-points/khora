#!/usr/bin/env node
// typescript-priors-loader-check.mjs: does adapters/text/code-structure.js::loadCodeKeywordPrior("typescript") load priors/code-kw-typescript.json,
// and does the name side serve priors/code-name-typescript.json? If not, say exactly which source edit would make it so, and PROVE that the edit
// works by applying it to a COPY of the adapter in an output directory (the real file is never touched: rule 10, the main agent owns existing source).
// Prints one JSON object; exit code 0 whether or not the edit is needed.
//
//   node eval/coding-competence/typescript-priors-loader-check.mjs [--out DIR]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCodeKeywordPrior, loadCodeNamePriorSplit, loadCodeNamePriorSplits, keywordSetOf, parseDeclarations } from "../../adapters/text/code-structure.js";
import { loadKeywordSet, loadNameGatePriors, LANG_CODE } from "../../adapters/code/name-gate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const argv = process.argv.slice(2);
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : "/private/tmp/claude-501/coding-competence/typescript-priors/loader-check";
const read = (f) => JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", f), "utf8"));
const kw = read("code-kw-typescript.json"), nm = read("code-name-typescript.json");

const SRC_PATH = path.join(NATIVE, "adapters/text/code-structure.js");
const srcText = fs.readFileSync(SRC_PATH, "utf8");
const lines = srcText.split("\n");
const lineOf = (needle) => { const i = lines.findIndex((l) => l.includes(needle)); return i < 0 ? null : { line: i + 1, text: lines[i].trim() }; };
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// 1. the REAL adapter, unedited
const real = {
  loadCodeKeywordPrior: { typescript: loadCodeKeywordPrior("typescript") ? "served" : null, ts: loadCodeKeywordPrior("ts") ? "served" : null },
  loadCodeNamePriorSplit: { typescript: loadCodeNamePriorSplit("typescript") ? "served" : null, ts: loadCodeNamePriorSplit("ts") ? "served" : null },
  loadCodeNamePriorSplits_keys: Object.keys(loadCodeNamePriorSplits()),
  nameGate: { LANG_CODE_typescript: LANG_CODE.typescript ?? null, loadKeywordSet_typescript: (() => { const k = loadKeywordSet("typescript"); return { file: k.file, hard: k.set ? k.set.size : null }; })(), loadNameGatePriors_typescript: (() => { const g = loadNameGatePriors("typescript"); return { code: g.code, disclosure: g.disclosure.map((d) => d.gap) }; })() },
};

// 2. the proposed edit, applied to a COPY (adapters/text/code-structure.js only; priors/ is symlinked so the copy reads the real files)
const edits = [
  { name: "CODE_KW_FILE", from: 'const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json" });', to: 'const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json", ts: "code-kw-typescript.json" });' },
  { name: "CODE_KW_LANG", from: 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });', to: 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts" });' },
  { name: "CODE_NAME_SPLIT_FILE", from: 'const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json" });', to: 'const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json", ts: "code-name-typescript.json" });' },
  { name: "loadCodeNamePriorSplits", from: 'js: loadCodeNamePriorSplit("js") };', to: 'js: loadCodeNamePriorSplit("js"), ts: loadCodeNamePriorSplit("ts") };' },
  { name: "familyOfFile", from: '    if (recipe.lang.startsWith("js")) return "js";', to: '    if (recipe.lang.startsWith("js")) return ext === ".ts" ? "ts" : "js";' },
];
const applied = [];
let patched = srcText;
for (const e of edits) {
  const hit = patched.includes(e.from);
  applied.push({ edit: e.name, anchorFound: hit });
  if (hit) patched = patched.replace(e.from, e.to);
}
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "adapters/text"), { recursive: true });
fs.writeFileSync(path.join(OUT, "adapters/text/code-structure.js"), patched);
fs.symlinkSync(path.join(NATIVE, "priors"), path.join(OUT, "priors"));
const P = await import(pathToFileURL(path.join(OUT, "adapters/text/code-structure.js")).href);
const served = P.loadCodeKeywordPrior("typescript");
const servedTs = P.loadCodeKeywordPrior("ts");
const split = P.loadCodeNamePriorSplits();
const set = P.keywordSetOf(served);
// what the edit changes for the reader, measured on an AUTHORED toy (never held-out data): a keyword-named function is refused, a property-named method is untouched
const toy = "export function foo() {}\nexport function class() {}\nexport const bar = () => {}\nexport class Baz { delete() {} }\n";
const withPrior = P.parseDeclarations(toy, "x.ts", { keywords: set }).map((d) => d.name);
const without = P.parseDeclarations(toy, "x.ts").map((d) => d.name);
const patchedSplitServesTs = Boolean(split.ts) && split.ts.provenance.trainRepos.length === nm.provenance.trainRepos.length;

const out = {
  language: "typescript",
  files: { keywordPrior: "priors/code-kw-typescript.json", namePrior: "priors/code-name-typescript.json" },
  realAdapter: real,
  verdict: {
    keyword: real.loadCodeKeywordPrior.typescript ? "LOADS: no source edit needed" : "does NOT load: CODE_KW_LANG has no typescript row (and a comment in code-structure.js says there is deliberately NO typescript alias: it was written when the only typescript list was grammar-heuristic junk, 3/21 shared with javascript; code-kw-typescript.json is engine-arbitrated and replaces that reason)",
    name: real.loadCodeNamePriorSplit.typescript || real.loadCodeNamePriorSplit.ts ? "LOADS" : "does NOT load: CODE_NAME_SPLIT_FILE has no typescript/ts row; .ts files are read through the `js` family (priors/code-name-js.json: ethos tree, ts/tsx/js/mjs/jsx blended, not held-out safe)",
  },
  editSites: { CODE_KW_FILE: lineOf("const CODE_KW_FILE"), CODE_KW_LANG: lineOf("const CODE_KW_LANG"), CODE_NAME_SPLIT_FILE: lineOf("const CODE_NAME_SPLIT_FILE"), loadCodeNamePriorSplits: lineOf("export function loadCodeNamePriorSplits"), familyOfFile: lineOf("function familyOfFile"), comment_no_typescript_alias: lineOf("There is deliberately NO typescript alias") },
  proposedEdit: edits.map((e) => ({ site: e.name, replace: e.from, with: e.to })),
  proposedEditNameGate: [
    "adapters/code/name-gate.js LANG_CODE: ADD `typescript: \"typescript\", ts: \"typescript\"`. loadKeywordSet's generic branch then reads priors/code-kw-typescript.json (schema-checked) with NO other change; loadNameGatePriors(\"typescript\") also looks for priors/code-ctx-typescript.json, which does not exist yet (disclosed as no-context-prior until it is built: node eval/coding-competence/build-c2-priors.mjs typescript after c2-lib/name-gate know the language).",
  ],
  proposedEditProof: {
    copy: path.join(OUT, "adapters/text/code-structure.js"),
    editsApplied: applied,
    loadCodeKeywordPrior_typescript: served ? { hard: served.keywords.length, soft: served.softKeywords.length, builtins: served.builtins.length, sameAsFile: sameSet(served.keywords, kw.keywords), refusalScope: served.refusalScope?.positions ?? null } : null,
    loadCodeKeywordPrior_ts_sameObject: servedTs === served,
    loadCodeNamePriorSplit_ts: split.ts ? { distinctNames: split.ts.counts.distinctNames, repos: split.ts.counts.repos, files: split.ts.counts.files, servesTsFile: patchedSplitServesTs } : null,
    toyDeclarations: { text: toy, withoutPrior: without, withPrior, keywordNamedFunctionRefused: without.includes("class") && !withPrior.includes("class") },
  },
  caveat: [
    "the hard set refuses BINDING names only (priors/code-kw-typescript.json refusalScope): a consumer that applies keywordSetOf() to every identifier-class token (not only declaration names) would wrongly refuse property and method names (`.delete(`, `{ default: 1 }`, `export { default as X }`); parseDeclarations applies it only to the names its three recipes capture (function/class/const names), which is binding position, so it is safe there.",
    "OPTIONAL fix to the recipe the prior and the reader share: the const-arrow regex (js-const-arrow in code-structure.js RECIPES; the same line in scripts/build-code-name-prior-split.mjs) matches any `const x =` whose initialiser contains an arrow later (`const data = Array(n).fill(0).map((_, i) => ...)`): precision 0.585 on TypeScript TRAIN (card N3). A tightened pattern scored 0.965 / recall 0.852 on the same TRAIN gold (card N3d, informational; confirm on DEV before adopting).",
  ],
};
console.log(JSON.stringify(out, null, 1));
