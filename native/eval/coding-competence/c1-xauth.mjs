// c1-xauth.mjs: C1 LEX, SECOND AUTHORITY. A cross-check of c1-lex.mjs, never a replacement and never gating it.
//
// WHY. c1-lex.mjs scores the lexer against ONE authority (a tree-sitter grammar), and the lexer's prior was derived from that same
// grammar's tokens on other repositories. F1 near 1.0 then shows the lexer reproduces the grammar's lexical conventions on unseen
// repositories; it does not show the conventions are right. Here the same DEV files are scored against an authority that shares
// nothing with tree-sitter: the language's OWN lexer, python's stdlib `tokenize`, ruby's `Ripper.lex`, clang's raw lexer
// (`-Xclang -dump-raw-tokens`). Local toolchains seen: node, python3 3.14, ruby 2.6, clang; no go / rust / php / JS tokenizer,
// and javac has no public token dump, so go, javascript and java have NO second authority (typed gap, not a pass).
//
// =====================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written 2026-10-05 BEFORE this file's code, xauth/xauth_py.py and xauth/xauth_rb.rb had been
// run on any DEV file (the two extractors were smoke-run on three-line toy inputs to see they execute). Fixed; changes are
// amendments at the foot of this header.
// =====================================================================================================================
// CLAIM (X1). On held-out DEV files the lexer's span boundaries agree with the engine tokenizer's about as well as the tree-sitter
// gold's do, and its received delimiters/words matter to that agreement.
//
// DATA. The same DEV files, selection and exclusions as c1-lex.mjs (c1-common.mjs), --limit files (default 60), restricted rows
// excluded; for C only ASCII-only files (clang reports byte columns; mapping them to UTF-16 for non-ASCII files is out of scope: a
// typed gap with a count). A file the engine tokenizer rejects (TokenError, SyntaxError, a clang failure) is a typed gap.
//
// ENGINE TOKENS (normalisation is declared, not tuned): whitespace/newline/indent/dedent/EOF events are not lexemes. Python: an
// f-string/t-string (FSTRING_START..FSTRING_END, nested) is one lexeme. Ruby: the begin/content/end pieces of ONE outermost string,
// regexp, %w/%i list or quoted symbol are one lexeme; heredoc bodies stay as the engine emits them. C: clang's raw tokens as emitted
// (`#` and `include` are two tokens, `<stdio.h>` is five): the grammar and the engine DISAGREE about C directives, and that is
// expected and reported, not corrected.
//
// METRIC. Span-exact boundary F1 (same function as c1-lex.mjs: scoreFile / f1Of), micro-pooled over files, paired file bootstrap
// (B=1000, seed 20261005) for differences.
//   F1(lexer, engine)       the real prior
//   F1(gold, engine)        the reference: how far the grammar itself is from the engine (the ceiling for any grammar-trained lexer)
//   F1(whitespace, engine)  control
//   F1(foreign, engine)     control: the SAME lexer with another language's whole prior (c1-lex.mjs FOREIGN order)
//   F1(empty, engine)       control: the scanner with an empty prior
//   F1(lexer, gold)         the c1-lex.mjs number on the same files, for orientation
//
// PASS RULE (per language; secondary evidence, it does not gate c1-lex.mjs). Evaluated only if n_files >= 10.
//   (x1) AUTHORITIES COMPARABLE: F1(gold, engine) >= 0.80. If the grammar and the engine disagree more than that about what a token
//        is, there is no verdict (pass:null, typed "authorities disagree"), because then F1 against either measures a convention.
//   (x2) F1(lexer, engine) >= F1(gold, engine) - 0.05: the lexer is no farther from the engine than the grammar is, within 0.05.
//   (x3) F1(lexer, engine) - F1(whitespace, engine) >= 0.10 with a bootstrap lower end > 0.
//   (x4) LICENCE: F1(lexer, engine) - F1(foreign, engine) >= 0.02 with a bootstrap lower end > 0 AND F1(lexer, engine) - F1(empty, engine)
//        >= 0.05 with a lower end > 0 (the received knowledge moves agreement with an authority it was not derived from).
//   pass = x1 and x2 and x3 and x4; pass:false names the failed clause; pass:null when x1 fails or n < 10 or the engine is absent.
//
// PREDICTIONS (point, band; written before the first run).
//   python  F1(gold, engine) 0.97 [0.93,0.99]; F1(lexer, engine) 0.96 [0.92,0.99]; F1(whitespace, engine) 0.26 [0.15,0.40];
//           foreign (c) 0.80 [0.60,0.92]. Likely misses: line continuations, `...`, soft-keyword spacing.
//   ruby    F1(gold, engine) 0.85 [0.70,0.95]; F1(lexer, engine) 0.82 [0.65,0.93]; whitespace 0.30 [0.15,0.42]; foreign (go) 0.65 [0.45,0.85].
//           Likely misses: heredocs, %-literals, `?c`, label tokens (`key:`), method-name suffixes.
//   c       F1(gold, engine) 0.85 [0.65,0.95] (directives: the grammar's `#include`, `<stdio.h>` and macro bodies are single tokens,
//           clang's are not); F1(lexer, engine) 0.83 [0.60,0.95]; whitespace 0.28 [0.15,0.40]; foreign (ruby) 0.60 [0.40,0.80].
//   go, javascript, java: unmeasured (no engine tokenizer here).
//   WHAT WOULD FALSIFY X1: F1(lexer, engine) more than 0.05 below F1(gold, engine) (the lexer reproduces tree-sitter's quirks, not the
//   language's lexical structure), or foreign / empty priors within 0.02 / 0.05 of the real prior.
//
// RUN LOG (append only)
// X1 FIRST RUN (2026-10-05; DEV, --limit 60, no revision of lexer, prior or this file between writing the header and this run):
//   python  n=60 F1(lexer,engine)=0.9972 F1(gold,engine)=0.9999 ws=0.2482 empty=0.7278 foreign[c]=0.8544 F1(lexer,gold)=0.9973 | lexer-gold=-0.0027 CI[-0.0062,-0.0001] | pass=True failed=[]
//   ruby    n=58 F1(lexer,engine)=0.8220 F1(gold,engine)=0.8740 ws=0.3249 empty=0.5131 foreign[go]=0.7319 F1(lexer,gold)=0.9405 | lexer-gold=-0.0521 CI[-0.0860,-0.0151] | pass=False failed=['x2:lexer-farther-from-engine-than-gold-by-more-than-0.05']
//   c       n=55 F1(lexer,engine)=0.9795 F1(gold,engine)=0.9605 ws=0.2544 empty=0.6522 foreign[ruby]=0.8676 F1(lexer,gold)=0.9804 | lexer-gold=+0.0191 CI[+0.0035,+0.0370] | pass=True failed=[]
//     Gaps: python none; ruby 1 file gold parse error share > 0.02, 1 file the engine script rejected (NoMethodError inside Ripper
//     handling: typed, not investigated); c 1 restricted row, 1 gold parse failure, 4 non-ASCII files (clang byte columns, out of scope).
//     RESULT AS RUN: python and c pass x1..x4; RUBY FAILS x2 (the lexer is 0.0521 below the gold in agreement with Ripper, the line
//     is 0.05; the interval [-0.086,-0.015] excludes 0). Reported as a failure, not tuned. Where it fails: of the 0.178 the lexer
//     is short of Ripper, 0.126 (about 70%) is the grammar-versus-Ripper convention disagreement the lexer inherits (gold vs engine
//     0.874) and 0.052 (about 30%) is the lexer's own departure from the grammar (lexer vs gold 0.9405 on these files: heredocs, %w
//     lists, `?c` forms).
//     PREDICTION SCORECARD: inside their bands: python whitespace (.248) and foreign (.854), ruby gold-vs-engine (.874), lexer-vs-engine
//     (.822), whitespace (.325), foreign (.732), c whitespace (.254). ABOVE their bands: python gold-vs-engine (.9999 vs [.93,.99]) and
//     lexer-vs-engine (.9972 vs [.92,.99]), c gold-vs-clang (.9605 vs [.65,.95]), lexer-vs-clang (.9795 vs [.60,.95]), c foreign (.868 vs
//     [.40,.80]). NOT predicted: for C the lexer is CLOSER to clang than the grammar is (+0.019, interval [+0.004,+0.037]): the lexer
//     splits `#`+`define` and macro bodies as clang does, where the grammar keeps `#  define` and `preproc_arg` whole. So the
//     near-1.0 numbers of c1-lex.mjs are, in part, agreement with the grammar's directive conventions, not only with lexical structure.
//
// X-A1 (2026-10-06; PRE-REGISTERED BEFORE the first javascript run of this file; python, ruby and c were not re-scored differently).
//   JAVASCRIPT is added: the engine is acorn 8.x, the ECMAScript parser bundled inside Node 24 (read through `node --expose-internals`
//   by xauth/xauth_js.mjs; ecmaVersion "latest", module source, allowHashBang). It shares nothing with tree-sitter. It was found after
//   the first run, when the header above still said "no JS tokenizer here": esprima-python (ES2017, stops silently at `#priv`/`?.`
//   under tolerant mode) was probed and REJECTED as an authority; acorn tokenised `?.`, `??=`, `#p`, `1_000n`, nested templates.
//   Normalisation (declared): acorn comments come from onComment; the outermost template literal with every nested `${...}` expression
//   is ONE lexeme; every other acorn token is its own lexeme. A file acorn rejects (JSX, a decorator, a syntax error) is a typed gap.
//   PREDICTIONS (written before the run; the pass rule x1..x4 is unchanged):
//     javascript  F1(gold, engine) 0.97 [0.90,0.995]; F1(lexer, engine) 0.96 [0.88,0.99]; F1(whitespace, engine) 0.30 [0.15,0.42];
//                 foreign (java) 0.80 [0.60,0.93]; F1(lexer, gold) ~0.996 (its c1-lex.mjs DEV number).
//     Likely misses: regex-versus-division after `)` or `}`, template boundaries when a `}` closes both a block and an expression,
//     `#!` hashbang lines, `<!--` HTML comments, files rejected for JSX (a gap with a count, not a loss).
//     WHAT WOULD FALSIFY X1 for JS: F1(lexer, engine) more than 0.05 below F1(gold, engine), or foreign / empty within 0.02 / 0.05.
//   go and java stay unmeasured: no Go toolchain, and javac cannot run here (macOS shows a stub, `Unable to locate a Java Runtime`:
//   the earlier note "javac has no public token dump" was the lesser reason; there is no JVM at all).
// X-A1 FIRST RUN (2026-10-06; DEV, --limit 60; nothing revised between the pre-registration above and this run):
//   javascript n=59 F1(lexer,engine)=0.9967 F1(gold,engine)=1.0000 ws=0.2704 empty=0.7605 foreign[java]=0.9634 F1(lexer,gold)=0.9967 |
//   lexer-gold=-0.0033 CI[-0.0071,-0.0011] lexer-whitespace=+0.7263 lexer-foreign=+0.0333 CI[+0.0212,+0.0469] lexer-empty=+0.2362 |
//   pass=True failed=[]. Gaps: 1 file acorn rejected (SyntaxError: JSX or similar, typed). 38,398 engine tokens and 38,398 gold tokens.
//   PREDICTION SCORECARD: inside its band: whitespace (.2704). ABOVE its band: F1(gold,engine) 1.0000 vs [0.90,0.995], F1(lexer,engine)
//   0.9967 vs [0.88,0.99], foreign 0.9634 vs [0.60,0.93] (the java prior shares JS's comment and quote syntax, so this arm is weak
//   evidence for the licence on this pair: the empty-prior arm, +0.236, carries it). NOT predicted: acorn and the tree-sitter grammar
//   agree on EVERY token boundary of these 59 files (the authorities are interchangeable for JS lexemes on this sample), so for JS the
//   near-1.0 c1-lex.mjs number is not an artefact of the grammar's conventions. Limits: 59 files, three repositories, files acorn
//   rejects (JSX) are excluded so the sample leans to plain JS; one pooled number, one engine version.
//
// USAGE  node eval/coding-competence/c1-xauth.mjs --language python|ruby|c|javascript [--limit 60]   (dev only; there is no --split)
//        writes /private/tmp/claude-501/coding-competence/c1-xauth-<language>-dev.json
// =====================================================================================================================
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldAvailable, PYTHON } from "./gold.mjs";
import { loadManifest, selectRows, loadDocs, OUT_DIR } from "./c1-common.mjs";
import { lexCode, whitespaceSplit, loadCodeLexPrior, withoutKnowledge } from "../../adapters/code/lex.js";
import { scoreFile, zeroVec, addVec, f1Of, bootstrap, FOREIGN, CONSTANTS } from "./c1-lex.mjs";

export const ID = "c1-xauth";
export const RUNG = { id: "R1", name: "hear tokens, second authority", question: "Do the lexer's boundaries agree with the language's own lexer about as well as the tree-sitter gold does?" };
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIN_FILES = 10;
const COMPARABLE = 0.80, WITHIN = 0.05, WS_MARGIN = 0.10, FOREIGN_DROP = 0.02, EMPTY_DROP = 0.05;
const ENGINES = {
  python: "CPython stdlib tokenize",
  ruby: "Ruby Ripper.lex",
  c: "clang raw lexer (-Xclang -dump-raw-tokens)",
  javascript: "acorn tokenizer (Node 24 bundled copy, --expose-internals)",   // X-A1
};

function runJsonTool(cmd, args, paths) {
  const r = spawnSync(cmd, args, { input: JSON.stringify(paths), encoding: "utf8", maxBuffer: 1 << 29, timeout: 600000 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || r.error?.message || "").toString().split("\n").slice(-2).join(" | ")}`);
  return JSON.parse(r.stdout);
}

/** clang raw tokens for one ASCII-only file -> [[start,end,kind]] */
function clangTokens(file, text) {
  const r = spawnSync("clang", ["-fsyntax-only", "-x", "c", "-Xclang", "-dump-raw-tokens", file], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 60000 });
  const err = r.stderr || "";
  const lineStart = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lineStart.push(i + 1);
  const re = /^(\w+) '([\s\S]*?)'\t((?: \[[^\]]*\])*)\tLoc=<[^>]*:(\d+):(\d+)>$/gm;
  const out = [];
  let m, n = 0;
  while ((m = re.exec(err))) {
    n++;
    const kind = m[1], tok = m[2];
    if (kind === "eof") continue;
    if (kind === "unknown" && /^\s+$/.test(tok)) continue;
    const s = lineStart[Number(m[4]) - 1] + Number(m[5]) - 1;
    out.push([s, s + tok.length, kind]);
  }
  if (!n) throw new Error("clang produced no raw tokens");
  return out;
}

function engineTokens(language, docs, gap) {
  const byPath = new Map();
  if (language === "python") {
    const res = runJsonTool(PYTHON, [path.join(HERE, "xauth", "xauth_py.py")], docs.map((d) => d.row.path));
    for (const d of docs) byPath.set(d.row.path, res[d.row.path]);
  } else if (language === "ruby") {
    const res = runJsonTool("ruby", [path.join(HERE, "xauth", "xauth_rb.rb")], docs.map((d) => d.row.path));
    for (const d of docs) byPath.set(d.row.path, res[d.row.path]);
  } else if (language === "javascript") {
    const res = runJsonTool(process.execPath, ["--expose-internals", path.join(HERE, "xauth", "xauth_js.mjs")], docs.map((d) => d.row.path));
    for (const d of docs) byPath.set(d.row.path, res[d.row.path]);
  } else if (language === "c") {
    for (const d of docs) {
      if (!/^[\x00-\x7f]*$/.test(d.text)) { byPath.set(d.row.path, { error: "non-ASCII file" }); continue; }
      try { byPath.set(d.row.path, { tokens: clangTokens(d.row.path, d.text) }); } catch (e) { byPath.set(d.row.path, { error: String(e.message).slice(0, 100) }); }
    }
  }
  return byPath;
}

const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);

export async function measure({ language, limit = 60 } = {}) {
  const lang = String(language ?? "").toLowerCase();
  const res = { id: ID, rung: RUNG.id, language: lang, split: "dev", n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: { language: lang } };
  const gap = (reason, count = 1) => res.gaps.push({ reason, count });
  try {
    if (!ENGINES[lang]) { gap(`unmeasured: no independent engine tokenizer for ${lang || "(none)"} on this machine (python, ruby, c, javascript only)`); return res; }
    const av = goldAvailable();
    if (!av.available) { gap(`unmeasured: gold extractor unavailable (${av.reason})`); return res; }
    const prior = loadCodeLexPrior(lang);
    if (!prior) { gap(`unmeasured: no CodeLexPrior for ${lang}`); return res; }
    const manifest = loadManifest();
    const sel = selectRows(manifest, lang, "dev", limit);
    if (sel.excluded.restricted) gap("excluded: restricted (copyleft) rows", sel.excluded.restricted);
    const loaded = await loadDocs(lang, sel.rows);
    for (const g of loaded.gaps) gap(g.reason, g.count);
    const trainRepos = new Set((prior.provenance?.trainRepos ?? []).map((r) => r.repo));
    const docs0 = loaded.docs.filter((d) => !trainRepos.has(d.repo));
    if (docs0.length < loaded.docs.length) gap("leak: file from the prior's own train repositories (refused)", loaded.docs.length - docs0.length);
    const eng = engineTokens(lang, docs0, gap);
    const docs = [];
    const errs = new Map();
    for (const d of docs0) { const e = eng.get(d.row.path); if (!e || e.error) { const k = `engine rejected file: ${(e?.error ?? "no result").split(":")[0]}`; errs.set(k, (errs.get(k) ?? 0) + 1); } else docs.push({ ...d, engine: e.tokens }); }
    for (const [k, c] of errs) gap(k, c);
    res.n = docs.length;
    res.details.engine = ENGINES[lang];
    if (docs.length < MIN_FILES) { gap(`n<${MIN_FILES}: ${docs.length} files with an engine tokenisation, no verdict`); if (!docs.length) return res; }

    const foreignLang = FOREIGN[lang];
    const foreignPrior = foreignLang ? loadCodeLexPrior(foreignLang) : null;
    const empty = withoutKnowledge(prior);
    const perFile = [];
    const asTok = (arr) => arr.map(([start, end, c]) => ({ start, end, class: "x", type: c }));
    for (const d of docs) {
      const E = asTok(d.engine);
      const a = {
        lexer: scoreFile(E, lexCode(d.text, prior)),
        gold: scoreFile(E, d.tokens.map((t) => ({ start: t.start, end: t.end, class: "x" }))),
        whitespace: scoreFile(E, whitespaceSplit(d.text, prior)),
        empty: scoreFile(E, lexCode(d.text, empty)),
        lexerVsGold: scoreFile(d.tokens, lexCode(d.text, prior)),
      };
      if (foreignPrior) a.foreign = scoreFile(E, lexCode(d.text, foreignPrior));
      perFile.push(a);
    }
    const arms = Object.keys(perFile[0]);
    const total = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
    for (const f of perFile) for (const a of arms) addVec(total[a], f[a]);
    const F = Object.fromEntries(arms.map((a) => [a, f1Of(total[a])]));
    const bWs = bootstrap(perFile, (s) => f1Of(s.lexer) - f1Of(s.whitespace));
    const bGold = bootstrap(perFile, (s) => f1Of(s.lexer) - f1Of(s.gold));
    const bFor = foreignPrior ? bootstrap(perFile, (s) => f1Of(s.lexer) - f1Of(s.foreign)) : null;
    const bEmpty = bootstrap(perFile, (s) => f1Of(s.lexer) - f1Of(s.empty));
    const x1 = F.gold >= COMPARABLE;
    const x2 = F.lexer >= F.gold - WITHIN;
    const x3 = F.lexer - F.whitespace >= WS_MARGIN && bWs.lo > 0;
    const x4a = bFor ? F.lexer - F.foreign >= FOREIGN_DROP && bFor.lo > 0 : null;
    const x4b = F.lexer - F.empty >= EMPTY_DROP && bEmpty.lo > 0;
    const x4 = (x4a === null ? true : x4a) && x4b;
    if (!bFor) gap(`foreign-prior control unmeasured: no cyclic partner prior for ${lang}`);
    const failed = [];
    if (!x2) failed.push("x2:lexer-farther-from-engine-than-gold-by-more-than-0.05");
    if (!x3) failed.push("x3:not-better-than-whitespace");
    if (!x4) failed.push("x4:received-knowledge-did-not-move-agreement");
    res.score = r4(F.lexer);
    res.control = r4(F.whitespace);
    res.margin = r4(F.lexer - F.whitespace);
    if (docs.length < MIN_FILES) res.pass = null;
    else if (!x1) { res.pass = null; gap(`authorities disagree: F1(gold, engine)=${r4(F.gold)} < ${COMPARABLE}: no verdict`); }
    else res.pass = x2 && x3 && x4;
    res.controls = { goldVsEngineF1: r4(F.gold), whitespaceF1: r4(F.whitespace), emptyPriorF1: r4(F.empty), ...(foreignPrior ? { foreignLanguage: foreignLang, foreignPriorF1: r4(F.foreign) } : {}), lexerVsGoldF1: r4(F.lexerVsGold) };
    res.details = {
      language: lang, engine: ENGINES[lang], files: docs.length, engineTokens: docs.reduce((a, d) => a + d.engine.length, 0), goldTokens: docs.reduce((a, d) => a + d.tokens.length, 0),
      clauses: { x1, x2, x3, x4a, x4b, failed },
      differences: { lexerMinusGold: { d: r4(bGold.point), ci95: [r4(bGold.lo), r4(bGold.hi)] }, lexerMinusWhitespace: { d: r4(bWs.point), ci95: [r4(bWs.lo), r4(bWs.hi)] },
        lexerMinusForeign: bFor ? { d: r4(bFor.point), ci95: [r4(bFor.lo), r4(bFor.hi)] } : null, lexerMinusEmpty: { d: r4(bEmpty.point), ci95: [r4(bEmpty.lo), r4(bEmpty.hi)] } },
      constants: { MIN_FILES, COMPARABLE, WITHIN, WS_MARGIN, FOREIGN_DROP, EMPTY_DROP, BOOT_B: CONSTANTS.BOOT_B, BOOT_SEED: CONSTANTS.BOOT_SEED, limit },
    };
    return res;
  } catch (e) {
    gap(`unmeasured: ${e?.code ?? "error"}: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`);
    res.pass = null;
    return res;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const language = opt("--language");
  if (!language) { console.error("usage: node eval/coding-competence/c1-xauth.mjs --language python|ruby|c|javascript [--limit N]"); process.exit(2); }
  const r = await measure({ language, limit: Number(opt("--limit", 60)) });
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, `c1-xauth-${r.details.language}-dev.json`), JSON.stringify(r, null, 1) + "\n"); } catch { /* printing is enough */ }
  console.log(JSON.stringify(r));
}
