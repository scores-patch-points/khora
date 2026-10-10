#!/usr/bin/env node
// verify-java-priors-loader.mjs: does loadCodeKeywordPrior("java") (adapters/text/code-structure.js) load the java priors, and if not, what is the
// smallest source edit that makes it? Nothing under native/ is edited: the proposed edit is applied to a COPY in a scratch tree and measured there.
//
//   node eval/coding-competence/verify-java-priors-loader.mjs [--out DIR] [--candidate DIR]
//
// Reads : the real adapters/text/code-structure.js and adapters/code/name-gate.js (imported, unmodified), priors/code-kw-java.json, priors/code-name-java.json,
//         priors/code-ctx-java.json (existing), and the candidate priors from build-java-priors.mjs (default <out>/priors-candidate).
// Writes: <out>/loader-check/** (patched copies + candidate priors) and <out>/loader-check.json (the findings, with the proposed diff).
//
// PRE-REGISTRATION (written before the first run). L1: the REAL loadCodeKeywordPrior("java") returns null (its tables hold py and js only); the REAL
// loadCodeNamePriorSplit("java") returns null; parseDeclarations on a .java file returns [] (no recipe). L2: the REAL name-gate loadKeywordSet("java") loads the
// EXISTING code-kw-java.json (it reads code-kw-<code>.json directly). L3: with three one-line table additions in a COPY of code-structure.js,
// loadCodeKeywordPrior("java") loads the CANDIDATE: schema CodeKeywordPrior@1, language java, keywordSetOf has the candidate's hard words, contains `this`
// and not `when`; loadCodeNamePriorSplit("java") loads a CodeNamePrior@1 whose genericityOf("toString") is 3. L4 (coupling): with the candidate keyword
// prior and the EXISTING code-ctx-java.json, a COPY of name-gate.js reports the disclosure `closed-class-keywords-differ-from-keyword-prior`, i.e. the
// keyword prior and the context prior are one coupled change, not two independent files.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "../..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const OUT = opt("--out", "/private/tmp/claude-501/coding-competence/java-priors");
const CAND = opt("--candidate", path.join(OUT, "priors-candidate"));
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const res = { schema: "JavaLoaderCheck@1", checkedAt: new Date().toISOString(), checks: {}, verdicts: {} };

// L1, L2: the REAL modules
const real = await import(pathToFileURL(path.join(NATIVE, "adapters/text/code-structure.js")).href);
const realGate = await import(pathToFileURL(path.join(NATIVE, "adapters/code/name-gate.js")).href);
const L1 = {
  loadCodeKeywordPrior_java: real.loadCodeKeywordPrior("java"),
  loadCodeKeywordPrior_py_hard: real.loadCodeKeywordPrior("python")?.keywords?.length ?? null,
  loadCodeNamePriorSplit_java: real.loadCodeNamePriorSplit("java"),
  parseDeclarations_java: real.parseDeclarations("public class A { void f() { } }", "A.java").length,
};
res.checks.L1 = { ...L1, loadCodeKeywordPrior_java: L1.loadCodeKeywordPrior_java === null ? null : "loaded" };
res.verdicts.L1 = L1.loadCodeKeywordPrior_java === null && L1.loadCodeNamePriorSplit_java === null && L1.parseDeclarations_java === 0 ? "pass (loader does NOT load java: source edit needed)" : "prediction-not-held";
const gateKw = realGate.loadKeywordSet("java");
res.checks.L2 = { file: gateKw.file, prior: gateKw.prior ? { schema: gateKw.prior.schema, hard: gateKw.prior.keywords.length, giver: gateKw.prior.provenance?.giver } : null, setSize: gateKw.set?.size ?? null, hasContextualWords: ["record", "to", "with", "when", "open"].filter((w) => gateKw.set?.has(w)) };
res.verdicts.L2 = gateKw.set && gateKw.set.size > 0 ? "pass (name-gate loads the EXISTING file)" : "fail";

// L3, L4: patched COPIES in a scratch tree
const root = path.join(OUT, "loader-check", "native");
fs.rmSync(path.join(OUT, "loader-check"), { recursive: true, force: true });
for (const d of ["adapters/text", "adapters/code", "priors"]) fs.mkdirSync(path.join(root, d), { recursive: true });
const origSrc = fs.readFileSync(path.join(NATIVE, "adapters/text/code-structure.js"), "utf8");
const edits = [
  ['const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json" });', 'const CODE_KW_FILE = Object.freeze({ py: "code-kw-py.json", js: "code-kw-js.json", java: "code-kw-java.json" });'],
  ['const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js" });', 'const CODE_KW_LANG = Object.freeze({ python: "py", py: "py", javascript: "js", js: "js", java: "java" });'],
  ['const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json" });', 'const CODE_NAME_SPLIT_FILE = Object.freeze({ py: "code-name-py.json", c: "code-name-c.json", go: "code-name-go.json", js: "code-name-js.json", java: "code-name-java.json" });'],
];
let patched = origSrc;
const applied = [];
for (const [from, to] of edits) {
  const n = patched.split(from).length - 1;
  applied.push({ occurrences: n, from: from.slice(0, 70) + "..." });
  if (n === 1) patched = patched.replace(from, to);
}
res.checks.patchApplied = applied;
const allApplied = applied.every((a) => a.occurrences === 1);
fs.writeFileSync(path.join(root, "adapters/text/code-structure.js"), patched);
fs.copyFileSync(path.join(NATIVE, "adapters/code/name-gate.js"), path.join(root, "adapters/code/name-gate.js"));
fs.writeFileSync(path.join(OUT, "loader-check", "code-structure.proposed.patch"), spawnSync("diff", ["-u", "--label", "a/adapters/text/code-structure.js", "--label", "b/adapters/text/code-structure.js", path.join(NATIVE, "adapters/text/code-structure.js"), path.join(root, "adapters/text/code-structure.js")], { encoding: "utf8" }).stdout);
for (const f of ["code-kw-java.json", "code-name-java.json"]) fs.copyFileSync(path.join(CAND, f), path.join(root, "priors", f));
fs.copyFileSync(path.join(NATIVE, "priors/code-ctx-java.json"), path.join(root, "priors/code-ctx-java.json"));
// the py/js keyword priors are copied too so the "py and js still load through the patched copy" regression check is meaningful (first run omitted
// them and L3 failed on that harness gap alone, not on the loader)
for (const f of ["code-kw-py.json", "code-kw-js.json"]) fs.copyFileSync(path.join(NATIVE, "priors", f), path.join(root, "priors", f));
res.proposedPatch = fs.readFileSync(path.join(OUT, "loader-check", "code-structure.proposed.patch"), "utf8");

const cs = await import(pathToFileURL(path.join(root, "adapters/text/code-structure.js")).href);
const gate = await import(pathToFileURL(path.join(root, "adapters/code/name-gate.js")).href);
const kwPrior = cs.loadCodeKeywordPrior("java");
const kwSet = cs.keywordSetOf(kwPrior);
const namePrior = cs.loadCodeNamePriorSplit("java");
const candKw = readJson(path.join(CAND, "code-kw-java.json"));
res.checks.L3 = {
  patchApplied: allApplied,
  schema: kwPrior?.schema ?? null, language: kwPrior?.language ?? null, hard: kwSet?.size ?? null, candidateHard: candKw.keywords.length,
  hasThis: kwSet?.has("this") ?? null, hasVoid: kwSet?.has("void") ?? null, hasWhen: kwSet?.has("when") ?? null, softHasWhen: kwPrior?.softKeywords?.includes("when") ?? null,
  nameSchema: namePrior?.schema ?? null, genericityOf_toString: cs.genericityOf(namePrior, "toString"), genericityOf_unseen: cs.genericityOf(namePrior, "zzNeverDeclaredName"),
  pyStillLoads: cs.loadCodeKeywordPrior("python")?.keywords?.length ?? null, jsStillLoads: cs.loadCodeKeywordPrior("javascript")?.keywords?.length ?? null,
};
res.verdicts.L3 = allApplied && kwPrior?.schema === "CodeKeywordPrior@1" && kwPrior.language === "java" && kwSet.size === candKw.keywords.length && kwSet.has("this") && !kwSet.has("when") && namePrior?.schema === "CodeNamePrior@1" && res.checks.L3.genericityOf_toString === 3 && res.checks.L3.genericityOf_unseen === null && res.checks.L3.pyStillLoads === real.loadCodeKeywordPrior("python").keywords.length ? "pass" : "fail";

const gp = gate.loadNameGatePriors("java");
res.checks.L4 = { disclosure: gp.disclosure, keywordSetSize: gp.kw.set?.size ?? null, ctxClosedClassKeywords: gp.ctxPrior?.closedClass?.keywords?.length ?? null, nameDeclEntries: gp.nameDecl?.size ?? null };
res.verdicts.L4 = gp.disclosure.some((d) => d.gap === "closed-class-keywords-differ-from-keyword-prior") ? "pass (coupled: code-ctx-java.json must be rebuilt with the keyword prior)" : "prediction-not-held";

fs.writeFileSync(path.join(OUT, "loader-check.json"), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ verdicts: res.verdicts, L1: res.checks.L1, L2: res.checks.L2, L3: res.checks.L3, L4: res.checks.L4 }, null, 1));
console.log(res.proposedPatch);
