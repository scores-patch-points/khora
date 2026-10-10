#!/usr/bin/env node
// typescript_engine_probe.mjs: the ENGINE half of the typescript keyword giver (typescript_kw_giver.py runs this as a child).
//
// The engine is the TypeScript compiler's own parser + binder + checker (the `typescript` npm package, Apache-2.0), loaded
// READ-ONLY from a directory the caller names (nothing is installed, downloaded or executed from the network; the package
// is already on this machine). It is the ARBITER OF RESERVEDNESS, the role CPython plays for python: the grammar alone cannot
// say which words are reserved (tree-sitter lexes by parse state; its token set also carries contextual words such as `get`,
// `of`, `type`), while the engine says whether a word can be bound.
//
// Protocol: stdin = JSON {tsDir, words:[...], controls:[...]}; stdout = one JSON object:
//   engine        {version, license, tsDir, typescriptJsSha256}
//   tokenTable    [{kind, name, text, range}] every SyntaxKind in [FirstKeyword..LastKeyword], range in reserved|futureReserved|contextual
//                 (the engine's own scanner tables: ts.SyntaxKind ranges; text = ts.tokenToString)
//   probe         {word: {V1..V4, P1..P3: {codes:[...], msg}}}   codes = NEW diagnostic codes against the control identifiers
//   controlOk     {form: true if every control identifier produced no diagnostics on that form}
//   builtins      {values:[...], types:[...], lib:"lib.esnext.d.ts", libFiles:[...]}  global symbols the engine's ES library declares
//
// FORMS (module context, so strict mode applies: the corpus is ES-module TypeScript; the leading `export {};` makes each probe a module):
//   V1 function W() {}   V2 class W {}   V3 const W = 0;   V4 function f(W) {}      (a word is a BINDING name here)
//   P1 class C { W() {} }   P2 const o = { W: 0 };   P3 declare const x: any; x.W;   (a word is a PROPERTY / METHOD name: IdentifierName)
//   P4 import { W as y } from "m";   P5 export { x as W };   (AMENDMENT 1, informational: a word is a MODULE EXPORT NAME; the control identifiers already
//      yield a "cannot find module" diagnostic on P4, so P4 is read against that baseline like every other form)
// A word is REFUSED on a form iff compiling it yields a diagnostic code that the control identifiers do not yield on that form.
// Parsing, binding and checking only; nothing is emitted or executed.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const require = createRequire(import.meta.url);
const ts = require(path.join(input.tsDir, "lib", "typescript.js"));
const K = ts.SyntaxKind;

const FORMS = {
  V1: "export {};\nfunction @@W@@() {}\n",
  V2: "export {};\nclass @@W@@ {}\n",
  V3: "export {};\nconst @@W@@ = 0;\n",
  V4: "export {};\nfunction f(@@W@@) {}\n",
  P1: "export {};\nclass C { @@W@@() {} }\n",
  P2: "export {};\nconst o = { @@W@@: 0 };\n",
  P3: "export {};\ndeclare const x: any;\nx.@@W@@;\n",
  // AMENDMENT 1 (added after the first full run, informational only: no hard/soft decision reads these two forms)
  P4: "export {};\nimport { @@W@@ as y } from \"m\";\n",
  P5: "export {};\nconst x = 0;\nexport { x as @@W@@ };\n",
};

const FILE = "/probe/probe.ts";
function makeProgram(src, extra = {}) {
  const options = { noLib: true, noResolve: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, alwaysStrict: true, skipLibCheck: true, noEmit: true, types: [], ...extra };
  const host = ts.createCompilerHost(options, true);
  const realGet = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, langOrOpts, ...rest) => (fileName === FILE ? ts.createSourceFile(fileName, src, ts.ScriptTarget.ESNext, true) : realGet(fileName, langOrOpts, ...rest));
  host.fileExists = (f) => f === FILE || ts.sys.fileExists(f);
  host.readFile = (f) => (f === FILE ? src : ts.sys.readFile(f));
  host.writeFile = () => {};
  return ts.createProgram([FILE], options, host);
}
function diagnosticsOf(src) {
  const prog = makeProgram(src);
  const sf = prog.getSourceFile(FILE);
  const ds = [...prog.getSyntacticDiagnostics(sf), ...prog.getSemanticDiagnostics(sf)];
  return ds.map((d) => ({ code: d.code, msg: ts.flattenDiagnosticMessageText(d.messageText, " ") }));
}

// the engine's own keyword tables
const range = (k) => (k >= K.FirstReservedWord && k <= K.LastReservedWord ? "reserved" : k >= K.FirstFutureReservedWord && k <= K.LastFutureReservedWord ? "futureReserved" : "contextual");
const tokenTable = [];
for (let k = K.FirstKeyword; k <= K.LastKeyword; k++) {
  const text = ts.tokenToString(k);
  if (typeof text === "string" && /^[A-Za-z][A-Za-z0-9_]*$/.test(text)) tokenTable.push({ kind: k, name: K[k], text, range: range(k) });
}

// the probe
const controls = input.controls;
const baseline = {};
const controlOk = {};
for (const [f, tpl] of Object.entries(FORMS)) {
  const codes = new Set();
  let ok = true;
  for (const c of controls) {
    const ds = diagnosticsOf(tpl.replaceAll("@@W@@", c));
    if (ds.length) ok = false;
    for (const d of ds) codes.add(d.code);
  }
  baseline[f] = codes;
  controlOk[f] = ok;
}
const words = [...new Set([...input.words, ...tokenTable.map((t) => t.text)])].sort();
const probe = {};
for (const w of words) {
  probe[w] = {};
  for (const [f, tpl] of Object.entries(FORMS)) {
    const ds = diagnosticsOf(tpl.replaceAll("@@W@@", w));
    const fresh = ds.filter((d) => !baseline[f].has(d.code));
    probe[w][f] = { codes: [...new Set(fresh.map((d) => d.code))].sort((a, b) => a - b), msg: fresh[0]?.msg ?? null };
  }
}

// builtins: global symbols the engine's ES standard library declares (ECMAScript only; DOM / WebWorker are host APIs, not the language)
const LIB = "lib.esnext.d.ts";
const libProg = makeProgram("", { noLib: false, lib: [LIB] });
const libSf = libProg.getSourceFile(FILE);
const checker = libProg.getTypeChecker();
const ID = /^[A-Za-z_$][\w$]*$/;
const names = (flags) => checker.getSymbolsInScope(libSf, flags).map((s) => s.getName()).filter((n) => ID.test(n));
const values = [...new Set(names(ts.SymbolFlags.Value))].sort();
const types = [...new Set(names(ts.SymbolFlags.Type))].sort();
const libFiles = libProg.getSourceFiles().map((f) => path.basename(f.fileName)).filter((n) => /^lib\..*\.d\.ts$/.test(n)).sort();

const tsJs = path.join(input.tsDir, "lib", "typescript.js");
const pkg = JSON.parse(fs.readFileSync(path.join(input.tsDir, "package.json"), "utf8"));
process.stdout.write(JSON.stringify({
  engine: { version: ts.version, license: pkg.license, tsDir: input.tsDir, typescriptJsSha256: crypto.createHash("sha256").update(fs.readFileSync(tsJs)).digest("hex"), homepage: pkg.homepage ?? null },
  ranges: Object.fromEntries(["FirstKeyword", "LastKeyword", "FirstReservedWord", "LastReservedWord", "FirstFutureReservedWord", "LastFutureReservedWord", "FirstContextualKeyword", "LastContextualKeyword"].map((n) => [n, K[n]])),
  forms: FORMS, tokenTable, probe, controlOk, builtins: { values, types, lib: LIB, libFiles },
}));
