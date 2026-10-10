// xauth-c4-edges.mjs: C4 EDGES, SECOND AUTHORITY. A cross-check of c4-edges.mjs, never a replacement and never gating it.
//
//   node eval/coding-competence/xauth-c4-edges.mjs --language python|ruby|javascript [--limit N] [--offset N]      (DEV only)
//   prints ONE JSON line and writes /private/tmp/claude-501/coding-competence/xauth-c4-<language>-dev[-offset<N>].json
//   import { RUNG, measure } from "./xauth-c4-edges.mjs";
//
// WHY. c4-edges.mjs scores the reader against ONE authority (a tree-sitter grammar's call/import/inheritance nodes), and the
// reader's recipes were fitted to DEV mismatches against exactly that authority (c4-edges.mjs A3; edges.js even carries comments
// naming tree-sitter conventions it reproduces). F1 near 1.0 then shows the reader reproduces the grammar's conventions on
// files of the same repositories; it does not show the conventions are the language's. Here the same DEV files are scored
// against an authority that shares no code with tree-sitter: the language's OWN parser, python's stdlib `ast` (CPython's
// compiler front end) and ruby's `Ripper.sexp` (the interpreter's parser). Local toolchains seen: node, python3 3.14, ruby 2.6.10,
// gcc/clang. javascript, go, java and c have NO second authority here (below) and that is a typed gap, not a pass.
//
// =====================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written 2026-10-06 BEFORE this file's code, xauth/xauth_c4_py.py and
// xauth/xauth_c4_rb.rb had been run on any DEV file of the corpus (the two extractors were smoke-run on 7-line AUTHORED toy
// files to see that they execute). Fixed; changes are amendments at the foot of this header.
// =====================================================================================================================
// CLAIM (X4). On DEV files, the edges the reader emits (adapters/code/edges.js) agree with the edges the language's own
// parser yields about as well as the tree-sitter gold's do, and the agreement is file-specific (shuffled and random edges do
// not reproduce it).
//
// ENGINE EDGES. The edge DEFINITIONS are c4-edges.mjs's own syntactic rules (so the parser, not the rule, is the independent
// part; this is a limit: if both the grammar and the reader share a wrong rule, this check cannot see it). Declared per
// language in the extractors' headers; in short:
//   python (ast)    calls: ast.Call whose func is a Name or an Attribute (callee = id / attr), caller = innermost enclosing
//                   def / async def / class (a def's decorators belong to the enclosing scope; its defaults, annotations and a
//                   class's bases belong to the def / class), `<top>` otherwise. imports: Import alias names as written,
//                   ImportFrom as "."*level + module, `__future__` excluded. extends: class bases that are a Name or an
//                   Attribute (final attr); keywords, starred items, calls and subscripts are not bases.
//   ruby (Ripper)   calls: :fcall, :command, :call, :command_call (callee = the method-name token); NOT :vcall (a bare
//                   identifier: Ruby itself cannot tell it from a local without scope), `r.()`, super, yield, operators, index
//                   access. caller = innermost enclosing def / defs / class / module. imports: require, require_relative, load
//                   with a static string first argument. extends: `A < B` / `A < M::B` constant superclass, and include /
//                   extend / prepend of constants called directly in a class or module body (child = that class or module).
// A file is SCORED only if the tree-sitter gold parsed it with error_bytes_frac <= 0.02 AND the engine parser accepted it (a
// parser rejection, e.g. python-2 syntax, or ruby syntax newer than Ripper 2.6, is a typed gap with a count per error class),
// and it is <= c4-edges.mjs MAX_BYTES. Same selection (selectFiles, round-robin over repositories), same keys, same controls,
// same bootstrap, same constants as c4-edges.mjs; the engine plays the part of the gold.
//
// SYSTEMS PER KIND K in {calls, imports, extends} (+ the diagnostic calleeSet = callee names only, caller ignored):
//   A = reader vs engine           the number this file is about (with the c4-edges controls: fileShuffle, pairShuffle, random)
//   B = tree-sitter gold vs engine the REFERENCE: how far the grammar itself is from the language's parser (the ceiling for any
//                                  grammar-fitted reader). Reported with the same machinery; its controls are not read.
//   C = reader vs gold             c4-edges.mjs's number on the same files, for orientation.
//
// PASS RULE (per language; secondary evidence, it does not gate c4-edges.mjs). For each GATING kind K (calls, imports):
//   (x1) AUTHORITIES COMPARABLE: F1_B(K) >= 0.80. If the grammar and the language's parser disagree more than that about what
//        a call / import is, there is no verdict (pass:null, typed `authorities_disagree`): F1 against either measures a
//        convention.
//   (x2) F1_A(K) >= F1_B(K) - 0.05: the reader is no farther from the language's own parser than the grammar is, within 0.05.
//   (x3) A passes c4-edges.mjs's own rule against the engine (CI lower bound of margin > 0, margin >= 0.10, licence: strongest
//        control <= 0.5 * real, repo consistency, coverage >= 20 files and >= 50 engine edges; evaluateKind unchanged).
//   K passes iff x1 && x2 && x3; pass:null when x1 fails or coverage fails; pass:false names the failed clause. Language pass =
//   AND over the measured gating kinds, null when none. extends is reported, never gating. Headline score = mean F1_A of the
//   measured gating kinds, control = mean strongest-control F1, margin = score - control.
//   WHAT WOULD FALSIFY X4: F1_A < F1_B - 0.05 on a gating kind (the reader reproduces conventions the tree-sitter grammar has
//   and the language's own parser does not), or a control within 0.10 of A.
//
// PREDICTIONS (point [band]; blind, before the first run).
//   python  F1_B calls 0.985 [0.95,1.00]; imports 0.995 [0.97,1.00]; extends 0.97 [0.85,1.00].
//           F1_A calls 0.985 [0.93,1.00]; imports 0.995 [0.97,1.00]; extends 0.97 [0.85,1.00]; |F1_A - F1_B| <= 0.02.
//           Parser rejections: <= 5% of files (python-2 syntax). Pass: calls yes, imports yes.
//   ruby    F1_B calls 0.90 [0.70,0.98]; imports 0.95 [0.80,1.00]; extends 0.90 [0.70,1.00].
//           F1_A calls 0.88 [0.65,0.98]; imports 0.95 [0.80,1.00]; extends 0.90 [0.70,1.00].
//           Ripper 2.6 rejects 5-30% of files (modern syntax). Pass: imports yes; calls the likeliest failure (p 0.6 of a
//           pass): paren-less command calls and bare identifiers are where a grammar's call rule and the interpreter's differ.
//   javascript, go, java, c: no engine. Typed gaps: javascript (node exposes no parser; no acorn/@babel/parser in node_modules,
//           and nothing is installed from npm here), go (no go toolchain), java (javac/java: "Unable to locate a Java Runtime"),
//           c (clang's AST dump needs every include resolved: not available for repository files).
//
// WHAT THIS DOES NOT CLAIM. The engine is one parser per language, accepting only the files it can parse; files the engine
// rejects are not scored (selection bias toward conventional syntax, counted). DEV only. TEST is not touched.
//
// AMENDMENT X0 (2026-10-06, written BEFORE any javascript run, after the python and ruby runs; the python and ruby rules,
// predictions and figures above and in the run log are untouched). The header above says "javascript: node exposes no
// parser". THAT WAS WRONG: Node bundles acorn 8.15 (an ECMAScript parser written independently of tree-sitter), reachable as
// `node --expose-internals` -> require("internal/deps/acorn/acorn/dist/acorn") (xauth/xauth_js.mjs, written by the C1 instrument,
// uses it for tokens). So javascript gets an engine: xauth/xauth_c4_js.mjs, acorn.parse (module first, script on failure;
// hashbang, return outside function allowed). acorn parses ECMAScript only: a file with JSX, TypeScript, Flow or decorators is a
// typed engine rejection with a count, never a guess. Engine edge definitions (c4-edges.mjs's, stated for acorn nodes):
//   calls    CallExpression whose callee is an Identifier (name) or a non-computed MemberExpression (property name; a private
//            `#x` property keeps its `#`), seen through optional chaining; TaggedTemplateExpression with such a tag; NOT:
//            `new X()` (NewExpression), `super(...)`, a callee that is itself a call result / sequence / function / computed
//            member (no name), and `require("static string")` / `import("static string")` which are IMPORTS, not calls.
//            caller = innermost enclosing NAMED scope: FunctionDeclaration id, MethodDefinition key (a `constructor` and any
//            class-field initializer belong to the class), ClassDeclaration id (heritage, field initializers and computed keys
//            belong to the class), and a function/arrow VALUE named by what it is assigned to (VariableDeclarator id,
//            AssignmentExpression left Identifier or final property, object Property key, a function expression's own id);
//            `<top>` otherwise. A ClassExpression is not a named scope.
//   imports  ImportDeclaration source, ExportNamedDeclaration / ExportAllDeclaration source, ImportExpression with a string
//            literal, `require("string literal")`.
//   extends  ClassDeclaration with an Identifier or non-computed MemberExpression superClass (final name); class EXPRESSIONS are
//            values and are not read (the c4-edges.mjs rule); relation `extends`.
// PREDICTIONS for javascript (point [band]; blind). F1_B (gold vs acorn): calls 0.97 [0.88,0.995], calleeSet 0.99 [0.95,1.00],
//   imports 0.99 [0.95,1.00], extends 0.95 [0.70,1.00]. F1_A (reader vs acorn): calls 0.97 [0.85,0.995], imports 0.99 [0.95,1.00],
//   extends 0.95; |F1_A - F1_B| <= 0.02 (the reader tracks the grammar). acorn rejections (JSX, TypeScript, decorators, Flow):
//   5-25% of files. The likeliest differences from the grammar: private `#x()` calls and `require`, class-field arrow functions,
//   constructor bodies, caller naming of anonymous functions. Pass: calls yes (p 0.7), imports yes (p 0.85).
//
// RUN LOG (append only)
// X4 FIRST RUN (2026-10-06; DEV; `--limit 60` at offset 0 and at offset 60; no change to the extractors, the instrument or
// edges.js between writing the header and this run).
//   lang    slice    files | calls: engine-edges  A(reader~engine) B(gold~engine) | imports: A / B (engine edges) | extends: A / B (edges)
//   python  0..59     60   | 968   1.0000 / 1.0000                                | 1.0000 / 1.0000 (260)         | 1.0000 / 1.0000 (8, null)
//   python  60..119   60   | 1372  1.0000 / 1.0000                                | 1.0000 / 1.0000 (309)         | 1.0000 / 1.0000 (24, null)
//   ruby    0..59     59   | 1815  0.9741 / 0.9741                                | 0.9901 / 0.9901 (50)          | 1.0000 / 1.0000 (82)
//   ruby    60..119   58   | 1174  0.9966 / 0.9966                                | 1.0000 / 1.0000 (39, null)    | 1.0000 / 1.0000 (72)
//   Controls (A): python calls max 0.025 (random), imports max 0.104 (fileShuffle); ruby calls max 0.037 (pairShuffle), imports max
//   0.099 (fileShuffle). x1, x2, x3 all met wherever coverage allowed a verdict: python calls+imports pass on both slices; ruby calls
//   passes on both, ruby imports passes on slice 0..59 (50 edges, at the floor) and is coverage-null on 60..119 (39 < 50). Parser
//   rejections: python 0 of 120; ruby 0 of 59 and 2 of 60 (RuntimeError from Ripper.sexp), one ruby file failed the gold parse.
//   READER ~ GOLD (C): F1 = 1.000 on every kind in both languages: the reader's edges ARE the tree-sitter edges on these files,
//   so A = B everywhere (A - B = 0, CI [0,0]). Ruby's distance from Ripper is therefore the grammar's, and it is systematic:
//     * a def named by an operator or setter (`def <<(x)`, `def roles=(v)`) is a named def to Ripper and not to gold or reader,
//       so the calls inside it are charged to the enclosing class by gold and reader;
//     * a capitalised method call `Array(x)` is a call to Ripper, not to gold or reader (edges.js applies the lowercase-method
//       rule of the Ruby grammar, which is the grammar's convention and here not the interpreter's);
//     * an interpolated require string (`require "devise/orm/#{X}"`) is an import to gold and reader and not to the static-string
//       engine rule (an edge-definition difference, not a parser difference).
//   calleeSet (caller ignored): ruby 0.9858 / 0.9959, python 1.0000 / 1.0000.
//   AGAINST THE PREDICTIONS: python: F1_B and F1_A are 1.000 (top of band), |A - B| = 0, rejections 0 (met). ruby: F1_B calls 0.974
//   (band [0.70,0.98], met) and 0.997 (above the band); imports and extends in or above band; the predicted Ripper rejection rate of
//   5-30% was WRONG (0 of 59, 2 of 60: Ripper 2.6 parsed nearly everything); the predicted likeliest failure (ruby calls) did NOT
//   occur; ruby imports on 60..119 is coverage-null where a pass was predicted.
//   FALSIFIER X4: not triggered (A - B = 0 everywhere). Reading, said plainly: the reader has no information about the language beyond
//   the grammar's conventions on these files, it reproduces them exactly, and the language's own parser agrees with the grammar to
//   0.97-1.00 F1 on calls and imports for python and ruby. That bounds how wrong a grammar-fitted reader can be on conventional
//   code of these two languages; it says nothing about repositories outside DEV, nothing about javascript, go, java or c
//   (no engine), and the edge DEFINITIONS are shared with the grammar (only the parser is independent).
// X4b JAVASCRIPT RUN (2026-10-06; after amendment X0; `--limit 60` at offset 0 and 60; no change to anything between X0 and this run).
//   lang        slice    files | calls: engine-edges  A(reader~engine) B(gold~engine) | imports: A / B (edges) | extends: A / B (edges)
//   javascript  0..59     59   | 759   1.0000 / 1.0000                                | 1.0000 / 1.0000 (155)  | 1.0000 / 1.0000 (6, null)
//   javascript  60..119   60   | 606   0.9967 / 0.9967                                | 1.0000 / 1.0000 (174)  | 1.0000 / 1.0000 (12, null)
//   Controls (A): calls max 0.072 (random) / 0.024 (pairShuffle), imports max 0.149 / 0.089 (random); x1, x2, x3 met: calls and
//   imports PASS on both slices, the language passes. calleeSet 1.0000 / 0.9990. READER ~ GOLD F1 = 1.000 on every kind (A = B
//   everywhere, CI [0,0]). The only disagreement with acorn anywhere is on slice 60..119: 4 calls `require(<non-literal>)`,
//   which acorn (the language) counts as calls to `require` and the grammar's tags (and so the reader, and the engine's own
//   `require("literal")` = import rule) do not. acorn rejected 1 of 60 files at offset 0 and 0 at offset 60 (SyntaxError); 1
//   file of the DEV split was over the size cap and is excluded before selection.
//   AGAINST THE X0 PREDICTIONS: F1_B calls 1.000 (above band [0.88,0.995]) and 0.9967 (in band); calleeSet, imports, extends in band;
//   |A - B| = 0 (met); acorn rejections 5-25% predicted, 1 of 119 seen (MISSED, the dev JavaScript is conventional ES); pass calls
//   and imports yes (met). The predicted divergences (private `#x()` calls, class-field arrows, constructor bodies, anonymous
//   function naming) did not appear on these files; `#private` calls and class fields may be rare in them.
//
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { goldBatch, goldAvailable } from "./gold.mjs";
import { readEdges } from "../../adapters/code/edges.js";
import {
  CONST as C4, GATING, KINDS, countSets, prf, evaluateKind, selectFiles, goldEdgesOf, systemEdgesFrom, priorFor, mulberry32,
} from "./c4-edges.mjs";

export const RUNG = Object.freeze({
  id: "C4x",
  ladder: "R4",
  name: "edges-second-authority",
  question: "Do the edges the reader emits agree with the edges the language's own parser yields (not tree-sitter) about as well as the tree-sitter gold's do, beyond shuffled and random edges?",
});
export const XCONST = Object.freeze({ COMPARABLE_F1: 0.8, MAX_BELOW_GOLD: 0.05, BOOT: 1000, REPS: 25, EX: 6 });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.C4_OUT_DIR || "/private/tmp/claude-501/coding-competence";
const MANIFEST = process.env.C4_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
const VENV_PY = "/private/tmp/claude-501/venv/bin/python";
const SEP = "\u0001";
const key2 = (a, b) => `${a}${SEP}${b}`;
const round = (x, d = 4) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

export const ENGINES = Object.freeze({
  python: { name: "CPython ast (stdlib, python 3.14)", cmd: () => (fs.existsSync(VENV_PY) ? VENV_PY : "python3"), args: () => [path.join(HERE, "xauth", "xauth_c4_py.py")] },
  ruby: { name: "Ripper.sexp (ruby 2.6.10 interpreter parser)", cmd: () => "ruby", args: () => [path.join(HERE, "xauth", "xauth_c4_rb.rb")] },
  javascript: { name: `acorn ${process.versions.acorn ?? "8.x"} (the ECMAScript parser bundled in node ${process.version}, via --expose-internals)`, cmd: () => process.execPath, args: () => ["--expose-internals", path.join(HERE, "xauth", "xauth_c4_js.mjs")] },
});
export const NO_ENGINE = Object.freeze({
  go: "no second authority: no go toolchain (go/parser) on this machine",
  java: "no second authority: javac/java report 'Unable to locate a Java Runtime'",
  c: "no second authority: a C AST (clang -ast-dump) needs every #include resolved, which repository files do not allow here",
});
const LANG_ALIAS = { py: "python", js: "javascript", rb: "ruby" };

function unmeasured(language, split, reason, extra = {}) {
  return { id: RUNG.id, rung: RUNG.ladder, language, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [{ reason, count: 1 }], notes: [], details: { language, ...extra } };
}

/** Engine edges of one parsed file as sets in the c4-edges key space. */
export function engineEdgesFrom(e) {
  const calls = new Set(), calleeSet = new Set(), imports = new Set(), ext = new Set();
  for (const [caller, callee] of e.calls ?? []) { calls.add(key2(caller, callee)); calleeSet.add(callee); }
  for (const m of e.imports ?? []) imports.add(m);
  for (const [child, base] of e.extends ?? []) ext.add(key2(child, base));
  return { calls, calleeSet, imports, extends: ext };
}

function runEngine(language, paths) {
  const eng = ENGINES[language];
  const r = spawnSync(eng.cmd(), eng.args(), { input: JSON.stringify(paths), encoding: "utf8", maxBuffer: 1 << 29, timeout: 300_000 });
  if (r.error || r.status !== 0) throw new Error(`engine ${eng.name} failed: ${r.error?.message ?? (r.stderr || "").slice(0, 200)}`);
  return JSON.parse(r.stdout);
}

const pool = (arr, idx) => idx.reduce((a, i) => ({ tp: a.tp + arr[i].tp, fp: a.fp + arr[i].fp, fn: a.fn + arr[i].fn }), { tp: 0, fp: 0, fn: 0 });
const f1Of = (c) => prf(c).f1 ?? 0;

/** paired file bootstrap of F1_A - F1_B (report only) */
function pairedDiff(cA, cB, boot, seed) {
  const n = cA.length, rnd = mulberry32(seed >>> 0), ds = [];
  for (let b = 0; b < boot && n > 0; b++) {
    const idx = new Array(n);
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rnd() * n);
    ds.push(f1Of(pool(cA, idx)) - f1Of(pool(cB, idx)));
  }
  ds.sort((x, y) => x - y);
  return ds.length ? [ds[Math.floor(0.025 * (ds.length - 1))], ds[Math.floor(0.975 * (ds.length - 1))]] : [null, null];
}

export function judgeKind({ kind, gating, A, B }) {
  const reasons = [];
  let pass = null;
  const x1 = (B.f1_real ?? 0) >= XCONST.COMPARABLE_F1;
  const x2 = (A.f1_real ?? 0) >= (B.f1_real ?? 0) - XCONST.MAX_BELOW_GOLD;
  const x3 = A.verdict.pass;
  if (!x1) reasons.push(`authorities_disagree: F1(gold,engine)=${B.f1_real} < ${XCONST.COMPARABLE_F1}`);
  else if (x3 === null) reasons.push(`coverage: ${A.verdict.reasons.join("; ")}`);
  else {
    if (!x2) reasons.push(`x2: reader ${A.f1_real} is more than ${XCONST.MAX_BELOW_GOLD} below gold ${B.f1_real} against the language's own parser`);
    if (!x3) reasons.push(`x3: ${A.verdict.reasons.join("; ")}`);
    pass = x2 && Boolean(x3);
  }
  return { kind, gating, x1, x2, x3, pass, reasons };
}

export async function measure({ language, split = "dev", limit = null, offset = 0, maxBytes = C4.MAX_BYTES, boot = XCONST.BOOT, reps = XCONST.REPS } = {}) {
  try {
    return await measureInner({ language: LANG_ALIAS[language] ?? language, split, limit, offset, maxBytes, boot, reps });
  } catch (e) {
    return unmeasured(language, split, `unmeasured: ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

async function measureInner({ language, split, limit, offset, maxBytes, boot, reps }) {
  const t0 = Date.now();
  if (split !== "dev") return unmeasured(language, split, "xauth_is_dev_only: the held-out split is consumed by the final card, never by a cross-check");
  if (NO_ENGINE[language]) return { ...unmeasured(language, split, `no_second_authority: ${NO_ENGINE[language]}`), applicable: false, reason: NO_ENGINE[language] };
  if (!ENGINES[language]) return unmeasured(language, split, `unmeasured: no engine declared for ${language}`);
  const av = goldAvailable();
  if (!av.available) return unmeasured(language, split, `unmeasured: gold extractor unavailable (${av.reason})`);
  const man = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const rows = man.languages?.[language]?.[split];
  if (!rows) return unmeasured(language, split, `unmeasured: manifest has no ${split} split for ${language}`);
  const gaps = [];
  const sel = selectFiles(rows, { limit, maxBytes, offset });
  gaps.push(...sel.gaps);
  const texts = sel.rows.map((r) => fs.readFileSync(r.path, "utf8"));
  const golds = await goldBatch(sel.rows.map((r, i) => ({ language, text: texts[i], fileName: r.path })));
  const eng = runEngine(language, sel.rows.map((r) => r.path));
  const prior = priorFor(language);
  const files = [], G = [], R = [], E = [];
  const rejected = {};
  let goldBad = 0;
  const examples = Object.fromEntries(KINDS.map((k) => [k, { reader_only: [], engine_only: [], gold_only: [] }]));
  sel.rows.forEach((r, i) => {
    const g = golds[i], e = eng[r.path];
    if (g.error || g.parse.error_bytes_frac > C4.PARSE_TOL) { goldBad += 1; return; }
    if (!e || e.error) { const cls = String(e?.error ?? "no engine output").split(/[:(]/)[0].slice(0, 40); rejected[cls] = (rejected[cls] ?? 0) + 1; return; }
    files.push({ id: r.rel ?? r.path, repo: r.repo, path: r.path, bytes: r.bytes });
    G.push(goldEdgesOf(g, texts[i], language));
    R.push(systemEdgesFrom(readEdges({ text: texts[i], language, fileName: r.path, keywords: prior.keywords, final: true })));
    E.push(engineEdgesFrom(e));
  });
  if (goldBad) gaps.push({ reason: "gold_parse_failure_or_error", count: goldBad });
  for (const [cls, count] of Object.entries(rejected)) gaps.push({ reason: `engine_parser_rejected: ${cls}`, count });
  if (!files.length) return { ...unmeasured(language, split, "no_scored_files"), gaps: [...gaps, { reason: "no_scored_files", count: 1 }] };

  const kinds = {};
  const verdicts = {};
  const kindsToRun = [...KINDS, "calleeSet"];
  for (const k of kindsToRun) {
    const gating = GATING.includes(k);
    const pair = k === "calls" || k === "extends";
    const A = evaluateKind({ kind: k, files, sys: R.map((s) => s[k]), gold: E.map((s) => s[k]), seed: `${language}-x-${k}`, boot, reps, gating, pair });
    const B = evaluateKind({ kind: k, files, sys: G.map((s) => s[k]), gold: E.map((s) => s[k]), seed: `${language}-xg-${k}`, boot: 50, reps: 3, gating: false, pair });
    const cA = R.map((s, i) => countSets(s[k], E[i][k])), cB = G.map((s, i) => countSets(s[k], E[i][k]));
    const cC = R.map((s, i) => countSets(s[k], G[i][k]));
    const diff = pairedDiff(cA, cB, Math.min(boot, 500), 0xc4a + k.length);
    const all = [...files.keys()];
    const C = prf(pool(cC, all));
    const j = judgeKind({ kind: k, gating, A, B });
    kinds[k] = {
      kind: k, gating, n_files: files.length, engine_edges: A.gold_edges,
      A_reader_vs_engine: { precision: A.precision, recall: A.recall, f1: A.f1_real, controls: Object.fromEntries(Object.entries(A.controls).map(([n, c]) => [n, c.f1])), strongest_control: A.strongest_control, margin: A.margin, margin_ci95: A.margin_ci95, licence_ok: A.licence_ok, per_repo: A.per_repo, c4_verdict: A.verdict },
      B_gold_vs_engine: { precision: B.precision, recall: B.recall, f1: B.f1_real, gold_edges: B.system_edges },
      C_reader_vs_gold: { precision: round(C.precision), recall: round(C.recall), f1: round(C.f1) },
      A_minus_B: { diff: round((A.f1_real ?? 0) - (B.f1_real ?? 0)), ci95: diff.map((x) => round(x)) },
      verdict: j,
    };
    verdicts[k] = j;
    if (k !== "calleeSet") {
      files.forEach((f, i) => {
        for (const [name, a, b] of [["reader_only", R[i][k], E[i][k]], ["engine_only", E[i][k], R[i][k]], ["gold_only", G[i][k], E[i][k]]]) {
          if (examples[k][name].length >= XCONST.EX) continue;
          for (const x of a) if (!b.has(x)) { examples[k][name].push(`${path.basename(f.path)}: ${x.replace(SEP, " -> ")}`); if (examples[k][name].length >= XCONST.EX) break; }
        }
      });
    }
  }
  const measured = GATING.filter((k) => verdicts[k].pass !== null);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const score = measured.length ? mean(measured.map((k) => kinds[k].A_reader_vs_engine.f1)) : null;
  const control = measured.length ? mean(measured.map((k) => kinds[k].A_reader_vs_engine.strongest_control.f1)) : null;
  const pass = measured.length ? measured.every((k) => verdicts[k].pass === true) : null;
  for (const k of GATING) if (verdicts[k].pass === null) gaps.push({ reason: `${k}_not_judged: ${verdicts[k].reasons.join("; ")}`, count: 1 });
  const controls = {};
  for (const k of KINDS) {
    const a = kinds[k].A_reader_vs_engine;
    controls[`${k}_reader_vs_engine`] = a.f1;
    controls[`${k}_gold_vs_engine`] = kinds[k].B_gold_vs_engine.f1;
    for (const [n, f] of Object.entries(a.controls)) controls[`${k}_${n}`] = f;
  }
  return {
    id: RUNG.id, rung: RUNG.ladder, language, split, n: files.length, applicable: true,
    score: round(score), control: round(control), margin: score === null ? null : round(score - control), pass, controls, gaps,
    notes: [
      `second authority: ${ENGINES[language].name}; the edge definitions are c4-edges.mjs's, only the PARSER is independent`,
      "DEV only; secondary evidence, it does not gate c4-edges.mjs; files the engine parser rejects are not scored (counted in gaps)",
      `prior: ${prior.source ?? "none (typed gap)"}`,
    ],
    details: { language, split, offset, files: files.length, repos: [...new Set(files.map((f) => f.repo))], engine: ENGINES[language].name, kinds, examples, seconds: round((Date.now() - t0) / 1000, 1) },
  };
}

// ---- CLI -----------------------------------------------------------------------------------------------------------
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const a = process.argv.slice(2);
  const get = (f, d = null) => { const i = a.indexOf(f); return i === -1 ? d : a[i + 1]; };
  const language = get("--language");
  if (!language) { console.error("usage: node xauth-c4-edges.mjs --language python|ruby|javascript [--limit N] [--offset N]"); process.exit(2); }
  const limit = get("--limit") === null ? null : Number(get("--limit"));
  const offset = get("--offset") === null ? 0 : Number(get("--offset"));
  const res = await measure({ language, split: get("--split", "dev"), limit, offset });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const lang = LANG_ALIAS[language] ?? language;
  fs.writeFileSync(path.join(OUT_DIR, `xauth-c4-${lang}-${res.split}${offset ? `-offset${offset}` : ""}.json`), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res));
}
