#!/usr/bin/env node
// ruby-priors-loader-check.mjs: does adapters/text/code-structure.js::loadCodeKeywordPrior("ruby") load the new ruby keyword prior?
// If not, say exactly which source edit would make it so. It READS the adapters and the priors and EDITS NOTHING (rule 10: the main agent owns
// existing source). Prints one JSON object; exit code 0 whether or not an edit is needed.
//
//   node eval/coding-competence/ruby-priors-loader-check.mjs
//
// PRE-REGISTRATION (READING-POLICY II.5; written before the first run). Prediction and pass rule:
//   L1 loadCodeKeywordPrior("ruby") and ("rb") return null today (CODE_KW_LANG has no ruby row), so the new prior is NOT served: a source edit is needed.
//   L2 The new file is loadable by the reader's own loader contract: schema CodeKeywordPrior@1 and keywordSetOf(prior) is a non-empty Set equal to its
//      `keywords` (38 words). Pass: both.
//   L3 Every OTHER consumer reads priors/code-kw-ruby.json (the incumbent, 34 words with i, r, ri), never the -grammar file: adapters/code/name-gate.js
//      loadKeywordSet("ruby"), adapters/code/edges.js keywordsFor("ruby") and eval/coding-competence/c0-build-prior.mjs. Prediction: each serves the
//      incumbent set (they do not see the new prior).
//   L4 loadCodeNamePriorSplit("ruby") returns null (no ruby row in CODE_NAME_SPLIT_FILE) and parseDeclarations returns [] for a .rb file (RECIPES has no
//      ruby recipe).
//   L5 After promotion (copying the new kw file over priors/code-kw-ruby.json), priors/code-ctx-ruby.json's closedClass.keywords (derived from the
//      incumbent) differs from the keyword prior, which name-gate.js discloses as closed-class-keywords-differ-from-keyword-prior until the ctx prior is
//      rebuilt. Prediction: they differ (the incumbent has i, r, ri and lacks seven of the new words).
//   L6 The proposed Option B edit (two table rows for the keyword prior, one for the name split) is VERIFIED, not asserted, on a patched COPY of
//      code-structure.js in a scratch directory (the source file is never written): with it, loadCodeKeywordPrior("ruby") and ("rb") return the
//      grammar prior (the same 38 words as the file), loadCodeNamePriorSplit("ruby") returns the name prior, and the py and js priors are unchanged.
//      Pass: all of that, and each textual replacement matched exactly once.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadCodeKeywordPrior, loadCodeNamePriorSplit, loadCodeNamePriorSplits, keywordSetOf, parseDeclarations } from "../../adapters/text/code-structure.js";
import { loadKeywordSet, loadNameGatePriors } from "../../adapters/code/name-gate.js";
import { keywordsFor as edgesKeywordsFor } from "../../adapters/code/edges.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", f), "utf8"));
const size = (f) => fs.statSync(path.join(NATIVE, "priors", f)).size;
const newKw = read("code-kw-ruby-grammar.json"), oldKw = read("code-kw-ruby.json");
const newName = read("code-name-ruby-grammar.json"), oldName = read("code-name-ruby.json");

const src = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8").split("\n");
const lineOf = (needle) => { const i = src.findIndex((l) => l.includes(needle)); return i < 0 ? null : { line: i + 1, text: src[i].trim() }; };
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

const served = loadCodeKeywordPrior("ruby"), servedRb = loadCodeKeywordPrior("rb");
const newSet = keywordSetOf(newKw);
const nameGate = loadKeywordSet("ruby");
const edges = edgesKeywordsFor("ruby");
const gate = loadNameGatePriors("ruby");
const ctx = read("code-ctx-ruby.json");
const ctxKw = ctx.closedClass?.keywords ?? [];
const toyRb = "class Foo\n  def bar(x); x; end\nend\n";

// L6: apply the proposed edit to a COPY and import the copy (priors are symlinked so the copy resolves ../../priors/ exactly like the original)
async function patchedCopyCheck() {
  const edits = [
    ['const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json" });', 'const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json", ruby: "code-kw-ruby-grammar.json" });'],
    ['const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });', 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js", ruby: "ruby", rb: "ruby" });'],
    ['const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json" });', 'const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json", ruby: "code-name-ruby-grammar.json" });'],
  ];
  let text = src.join("\n");
  const matched = edits.map(([a, b]) => { const n = text.split(a).length - 1; if (n === 1) text = text.replace(a, b); return n; });
  const root = "/private/tmp/claude-501/coding-competence/ruby-priors/patched-loader";
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, "adapters/text"), { recursive: true });
  fs.symlinkSync(path.join(NATIVE, "priors"), path.join(root, "priors"));
  const file = path.join(root, "adapters/text/code-structure.js");
  fs.writeFileSync(file, text);
  const m = await import(pathToFileURL(file).href);
  const k = m.loadCodeKeywordPrior("ruby"), kb = m.loadCodeKeywordPrior("rb"), n = m.loadCodeNamePriorSplit("ruby");
  const py0 = loadCodeKeywordPrior("python"), js0 = loadCodeKeywordPrior("javascript"), py1 = m.loadCodeKeywordPrior("python"), js1 = m.loadCodeKeywordPrior("javascript");
  const res = {
    replacementsMatchedOnce: matched.every((x) => x === 1), matchCounts: matched,
    "patched loadCodeKeywordPrior('ruby')": k ? { hard: k.keywords.length, sameAsFile: sameSet(k.keywords, newKw.keywords), hasI: k.keywords.includes("i"), hasSelf: k.keywords.includes("self") } : null,
    "patched loadCodeKeywordPrior('rb')": kb ? { hard: kb.keywords.length } : null,
    "patched loadCodeNamePriorSplit('ruby')": n ? { distinctNames: n.counts.distinctNames, repos: n.counts.repos } : null,
    pythonUnchanged: sameSet(py0.keywords, py1.keywords), javascriptUnchanged: sameSet(js0.keywords, js1.keywords),
    patchedCopy: file, note: "a scratch COPY; native/adapters/text/code-structure.js was not written",
  };
  res.pass = res.replacementsMatchedOnce && Boolean(k) && res["patched loadCodeKeywordPrior('ruby')"].sameAsFile && Boolean(kb) && Boolean(n) && res.pythonUnchanged && res.javascriptUnchanged;
  return res;
}

const out = {
  files: Object.fromEntries(["code-kw-ruby-grammar.json", "code-name-ruby-grammar.json", "code-kw-ruby.json", "code-name-ruby.json"].map((f) => [f, { bytes: size(f) }])),
  L1_loadCodeKeywordPrior: {
    ruby: served ? { hard: served.keywords.length } : null, rb: servedRb ? { hard: servedRb.keywords.length } : null,
    predicted: "null for both", asPredicted: served === null && servedRb === null,
    verdict: served ? "serves a ruby prior already" : "does NOT load the new prior: loadCodeKeywordPrior('ruby') is null (CODE_KW_LANG has no ruby row); a source edit is needed",
  },
  L2_newFileIsLoadable: { pass: newKw.schema === "CodeKeywordPrior@1" && newSet instanceof Set && newSet.size > 0 && sameSet([...newSet], newKw.keywords), schema: newKw.schema, hard: newSet?.size ?? null, soft: newKw.softKeywords.length, builtins: newKw.builtins.length, stdlibModules: newKw.stdlibModules.length },
  L3_otherConsumers: {
    "name-gate.js loadKeywordSet('ruby')": nameGate.set ? { file: nameGate.file, hard: nameGate.set.size, isNew: sameSet([...nameGate.set], newKw.keywords), isIncumbent: sameSet([...nameGate.set], oldKw.keywords), hasI: nameGate.set.has("i") } : null,
    "edges.js keywordsFor('ruby')": edges ? { source: edges.source, hard: edges.keywords.size, isIncumbent: sameSet([...edges.keywords], oldKw.keywords), hasI: edges.keywords.has("i") } : null,
    "c0-build-prior.mjs": "reads priors/code-kw-<lang>.json for lang ruby = code-kw-ruby.json (the incumbent); it never tries a -grammar name",
    allServeIncumbent: Boolean(nameGate.set && edges && sameSet([...nameGate.set], oldKw.keywords) && sameSet([...edges.keywords], oldKw.keywords)),
  },
  L4_nameAndReader: {
    "loadCodeNamePriorSplit('ruby')": loadCodeNamePriorSplit("ruby") ? "served" : null,
    "loadCodeNamePriorSplits() keys": Object.keys(loadCodeNamePriorSplits()),
    "parseDeclarations(toy .rb)": parseDeclarations(toyRb, "toy.rb").length,
    note: "ruby is in no RECIPES row and in no split family: the reader declares nothing in a .rb file (card N7: 0 of 1492 gold core defs on TRAIN)",
  },
  L5_afterPromotion: {
    ctxPriorClosedClassKeywords: ctxKw.length, newHard: newKw.keywords.length, ctxEqualsNew: sameSet(ctxKw, newKw.keywords), ctxEqualsIncumbent: sameSet(ctxKw, oldKw.keywords),
    ctxOnlyIncumbent: ctxKw.filter((w) => !newKw.keywords.includes(w)).sort(), newOnly: newKw.keywords.filter((w) => !ctxKw.includes(w)).sort(),
    currentDisclosure: gate.disclosure.map((d) => d.gap),
    note: "name-gate.js discloses closed-class-keywords-differ-from-keyword-prior once the new set is served; rebuild the ctx prior (node eval/coding-competence/build-c2-priors.mjs ruby) and re-measure C2 before trusting any number",
  },
  incumbentVsNew: {
    keywords: { incumbent: oldKw.keywords.length, new: newKw.keywords.length, incumbentOnly: oldKw.keywords.filter((w) => !newKw.keywords.includes(w)).sort(), newOnly: newKw.keywords.filter((w) => !oldKw.keywords.includes(w)).sort() },
    names: { incumbent: { distinctNames: oldName.counts.distinctNames, repos: oldName.counts.repos, files: oldName.counts.files }, new: { distinctNames: newName.counts.distinctNames, repos: newName.counts.repos, files: newName.counts.files }, note: "the incumbent includes the one ethos-local rails/rails file; the new prior excludes it (licence not verified locally; see the card, I1)" },
  },
  L6_proposedEditVerifiedOnACopy: await patchedCopyCheck(),
  editSites: {
    CODE_KW_FILE: lineOf("const CODE_KW_FILE"),
    CODE_KW_LANG: lineOf("const CODE_KW_LANG"),
    CODE_NAME_SPLIT_FILE: lineOf("const CODE_NAME_SPLIT_FILE"),
    RECIPES: lineOf("const RECIPES = ["),
  },
  proposedEdit: [
    "OPTION A (no source edit, serves every consumer at once): promote the file, then rebuild the ctx prior. `cp native/priors/code-kw-ruby-grammar.json native/priors/code-kw-ruby.json` (name-gate.js, edges.js and c0-build-prior.mjs all read code-kw-ruby.json), then `node eval/coding-competence/build-c2-priors.mjs ruby` and re-measure C0 and C2 deliberately (c0 identification and the name gate both change their keyword source).",
    "OPTION B (the loader the question asks about): adapters/text/code-structure.js, CODE_KW_FILE: add `ruby: \"code-kw-ruby-grammar.json\"` and CODE_KW_LANG: add `ruby: \"ruby\", rb: \"ruby\"` (loadCodeKeywordPrior('ruby') and ('rb') then serve the grammar+MRI prior: 38 hard words, binding-only refusal). Other consumers keep the incumbent until the file is promoted (Option A).",
    "adapters/text/code-structure.js, CODE_NAME_SPLIT_FILE: ADD `ruby: \"code-name-ruby-grammar.json\"` (loadCodeNamePriorSplit('ruby') then serves the TRAIN-only prior); note loadCodeNamePriorSplits() returns only py, c, go, js and would need a ruby key too.",
    "adapters/text/code-structure.js, RECIPES: ruby has NO declaration recipe, so parseDeclarations(.rb) returns [] and buildCodeIndex finds no beings in ruby (card N7: 0 of 1492). A recipe must be measured against gold before it is added; none is proposed here.",
    "if the new name prior is promoted over priors/code-name-ruby.json, build-c2-priors.mjs will refuse to overwrite it afterwards (it only overwrites files it built itself); keep the incumbent's name or rebuild the ctx prior from the new one deliberately.",
  ],
};
console.log(JSON.stringify(out, null, 1));
