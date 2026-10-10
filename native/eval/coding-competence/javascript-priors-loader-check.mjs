#!/usr/bin/env node
// javascript-priors-loader-check.mjs: does adapters/text/code-structure.js::loadCodeKeywordPrior("javascript") load priors/code-kw-javascript.json?
// If not, say exactly which source edit would make it so. It READS the adapter and the priors and EDITS NOTHING (rule 10: the main agent owns
// existing source). Prints one JSON object; exit code 0 whether or not the edit is needed.
//
//   node eval/coding-competence/javascript-priors-loader-check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCodeKeywordPrior, loadCodeNamePriorSplit, loadCodeNamePriorSplits, keywordSetOf, parseDeclarations } from "../../adapters/text/code-structure.js";
import { loadKeywordSet, loadNameGatePriors } from "../../adapters/code/name-gate.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", f), "utf8"));
const newKw = read("code-kw-javascript.json"), oldKw = read("code-kw-js.json");
const newName = read("code-name-javascript.json");

const src = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8").split("\n");
const lineOf = (needle) => { const i = src.findIndex((l) => l.includes(needle)); return i < 0 ? null : { line: i + 1, text: src[i].trim() }; };

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const served = loadCodeKeywordPrior("javascript");
const servedJs = loadCodeKeywordPrior("js");
const servesNew = Boolean(served?.provenance?.grammar) && sameSet(served.keywords, newKw.keywords);
const servesOld = sameSet(served?.keywords ?? [], oldKw.keywords);
const nameGate = loadKeywordSet("js");
const gate = loadNameGatePriors("javascript");
const split = loadCodeNamePriorSplits();

// what the edit would change for the reader, measured without making it: parseDeclarations over the TRAIN-free toy below and over the sets
const out = {
  loadCodeKeywordPrior: {
    "javascript": served ? { servesNewPrior: servesNew, servesIncumbent: servesOld, hard: served.keywords.length, soft: served.softKeywords.length, grammar: served.provenance?.grammar ? true : false } : null,
    "js": servedJs ? { servesNewPrior: sameSet(servedJs.keywords, newKw.keywords) } : null,
    verdict: servesNew ? "LOADS code-kw-javascript.json: no source edit needed" : "does NOT load code-kw-javascript.json: it serves the incumbent priors/code-kw-js.json (CODE_KW_LANG maps javascript and js to the code `js`, whose file is code-kw-js.json); a source edit is needed",
  },
  nameGate: { loadKeywordSet_js_serves: nameGate.set ? { hard: nameGate.set.size, isNew: sameSet([...nameGate.set], newKw.keywords) } : null, ctxPriorKeywordsEqualKeywordPrior: gate.disclosure.every((d) => d.gap !== "closed-class-keywords-differ-from-keyword-prior"), disclosure: gate.disclosure.map((d) => d.gap) },
  loadCodeNamePriorSplit: { javascript: loadCodeNamePriorSplit("javascript") ? "served" : null, js: split.js ? { file: "code-name-js.json", distinctNames: split.js.counts.distinctNames, repos: split.js.counts.repos } : null, newFile: { distinctNames: newName.counts.distinctNames, repos: newName.counts.repos, namesAtOrAboveFloor: newName.counts.namesAtOrAboveGenericFloor } },
  editSites: {
    CODE_KW_FILE: lineOf("const CODE_KW_FILE"),
    CODE_KW_LANG: lineOf("const CODE_KW_LANG"),
    CODE_NAME_SPLIT_FILE: lineOf("const CODE_NAME_SPLIT_FILE"),
  },
  proposedEdit: [
    "adapters/text/code-structure.js, CODE_KW_FILE: change js: \"code-kw-js.json\" to js: \"code-kw-javascript.json\" (loadCodeKeywordPrior('javascript') and ('js') then serve the grammar+V8 prior: 35 hard words, binding-only refusal)",
    "adapters/text/code-structure.js, CODE_NAME_SPLIT_FILE: ADD javascript: \"code-name-javascript.json\" (loadCodeNamePriorSplit('javascript') then serves the TRAIN-only prior); keep the `js` row (it also covers ts/tsx and is a different measurement)",
    "after the keyword edit rebuild priors/code-ctx-js.json (node eval/coding-competence/build-c2-priors.mjs javascript): its closedClass.keywords is the incumbent's set and name-gate.js discloses the mismatch otherwise; re-measure C2 before trusting any number",
    "eval/coding-competence/c0-build-prior.mjs already prefers code-kw-javascript.json (it tries the code `javascript` before `js`): the next rebuild of priors/code-identify.json will switch javascript's keyword source with NO source edit; rebuild and re-measure C0 deliberately",
    "adapters/code/edges.js tries `js` before `javascript` (CODE.javascript = [\"js\",\"javascript\"]) so it keeps the incumbent until the `js` file is replaced",
    "OPTIONAL fix to the recipe the prior and the reader share: the const-arrow pattern (js-const-arrow in code-structure.js RECIPES; the same line in scripts/build-code-name-prior-split.mjs) has precision 0.43 on TRAIN; the tightened pattern in the card's postHoc block reaches 1.0 at equal recall",
  ],
};
console.log(JSON.stringify(out, null, 1));
