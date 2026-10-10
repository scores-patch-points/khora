// c1-xauth-class.mjs: C1 LEX, SECOND AUTHORITY FOR CLASS (amendment A15(d) of c1-lex.mjs). A cross-check of c1-lex.mjs, never gating it.
//
// WHY. c1-lex.mjs scores token CLASS against gold.py's `leaf_class`, a hand-authored mapping over tree-sitter node types, and the lexer's lexicon was
// derived from that same mapping. c1-xauth.mjs already checks token BOUNDARIES against engines that are not tree-sitter, but it scores boundaries only.
// This file asks the missing question: when the class of a token is decided by an authority that CLASSIFIES and shares nothing with gold.py (CPython's
// keyword table and tokenize, clang's keyword table and raw lexer, acorn's token types, Ripper's on_kw / on_ident events), does the lexer's class
// accuracy survive? For go and java no executable authority exists on this machine (no Go toolchain; javac is the macOS stub, no JVM): the authority is
// then the language STANDARD's reserved-word list (c1-standards.mjs: Go spec; JLS 3.9), applied to word-shaped tokens only, and the result says so.
//
// =====================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written 2026-10-06 BEFORE this file's code had been run on any DEV file. What had been seen before writing:
// the numbers of c1-lex.mjs A12..A15 on DEV (the type-fold reports: standardRelabel accuracy c 0.9776, java 0.9753; standardUnion: python, go, javascript
// within 0.001), and the existing c1-xauth.mjs boundary results. Fixed; changes are AMENDMENTS at the foot, dated. The class-mapping functions and the
// engine scripts (xauth/class_py.py, the Ruby and JS event mappers below) were smoke-run on authored snippets only.
// =====================================================================================================================
// CLAIM (K1). On held-out DEV files, the lexer's class agrees with an INDEPENDENT classifying authority about as well as it agrees with gold.py's
// convention, and the received keyword knowledge is what makes it agree.
//
// DATA. The same DEV files, selection and exclusions as c1-lex.mjs (c1-common.mjs), default every eligible file (--limit optional), restricted rows
// excluded; for C only ASCII-only files (clang reports byte columns), as c1-xauth.mjs; a file the engine rejects is a typed gap with a count.
//
// COARSE CLASSES (declared; the lexer's, gold's and the authority's classes are all folded into these six; operator and punctuation are ONE class `symbol`
// because the operator / punctuation split is a convention no engine states):
//   reserved    a keyword, or a word-shaped literal (True, None, true, null, nil: the engines' keyword tables list them)
//   identifier  an identifier; a gold `type` is folded into identifier (the registered fold of c1-lex.mjs)
//   number      a digit-initial (or sign+digit, or dot+digit) literal
//   string      a string, char, template or regexp literal (one lexeme)
//   comment     a comment
//   symbol      an operator or punctuation
// gold class `other` is not scored (no class authority).
// ENGINE MAPPINGS (declared, not tuned): python: NAME -> reserved iff keyword.iskeyword (hard keywords; the soft keywords match / case / type / _ are
//   identifiers: tokenize has no parse context); NUMBER, STRING (an f-string is one lexeme), COMMENT, OP -> symbol. javascript (acorn): a token whose
//   label equals its own letters-only text and is not `name` is reserved (acorn types its keywords by label), `name` and `privateId` -> identifier,
//   `num` -> number, `string`, `regexp`, TEMPLATE -> string, COMMENT -> comment, all else -> symbol; a keyword-typed token directly after `.` or `?.`
//   is an IdentifierName (ES 12.3), so identifier (acorn's tokenizer has no such context: a declared correction). ruby (Ripper): on_kw -> reserved;
//   on_ident, on_const, on_ivar, on_gvar, on_cvar, on_label -> identifier; on_int, on_float, on_rational, on_imaginary -> number; STRING (the merged
//   outermost string / regexp / %w / symbol), on_CHAR -> string; on_comment, on_embdoc_beg, on_embdoc, on_embdoc_end, on___end__ -> comment; on_op and
//   the delimiter events -> symbol; heredoc and other events -> unscored. c (clang): a raw_identifier is reserved iff clang's own keyword table lexes
//   the same spelling as a keyword token (asked once for every distinct raw identifier of the sample, `clang -Xclang -dump-tokens`, default language
//   mode gnu17: a keyword token prints its spelling as its kind); numeric_constant -> number; string_literal, char_constant, wide / utf8 / utf16 / utf32
//   variants -> string; comment -> comment; every other raw token -> symbol.
//   STANDARD-TEXT (go, java only): the authority tokens are the gold's WORD-shaped tokens (gold class keyword, identifier, type or literal); the class is
//   reserved iff the text is in the standard's reserved list (c1-standards.mjs) or is a LITERAL WORD the standard reserves (STANDARD_LITERALS below: java
//   true false null, JLS 3.10; go has none: nil, true, false, iota are PREDECLARED IDENTIFIERS in the Go spec, which gold.py calls literal), else identifier;
//   no other class is judged. Said in details.authority.kind = "standard-text".
// UNIT. A token is SCORED iff the lexer, the gold and the authority all have a lexeme with exactly the same span (a triple match), the gold class is not
//   `other`, and (engines) the authority class is judged. Triple matching keeps every arm on the same tokens, so the numbers compare. The share of the
//   authority's tokens that are triple-matched is reported (the rest are boundary disagreements: c1-xauth.mjs's business).
// METRICS (micro-pooled, paired file bootstrap B=1000 seed 20261005, the functions of c1-lex.mjs):
//   aLex    agreement(lexer, authority)             the number of interest
//   aGold   agreement(gold, authority)              how far gold.py's convention is from the authority (the ceiling for a gold-trained lexer)
//   aLG     agreement(lexer, gold)                  the same triple set, scored against gold.py (what c1-lex.mjs calls class accuracy, here on this set)
//   controls (each built to fail): aEmpty = the scanner with an EMPTY prior; aKw = the same lexer with the keyword/literal sets DERANGED (3 seeds, the
//   highest agreement of the three, as c1-lex.mjs); aForeign = the whole prior of another language (reported, non-gating).
// PASS RULE (per language; secondary evidence; evaluated only if n_files >= 10):
//   (y1) AUTHORITIES COMPARABLE: aGold >= 0.90. Otherwise pass:null, typed "authorities disagree".
//   (y2) CONVENTION GAP: aLG - aLex <= CONV_TOL (0.01): the lexer's class accuracy against gold.py does not depend on gold.py's convention by more than a point.
//   (y3) LICENCE: aLex - aKw >= 0.02 with a bootstrap lower end > 0 AND aLex - aEmpty >= 0.05 with a lower end > 0 (the received knowledge moves
//        agreement with an authority it was not derived from).
//   pass = y1 and y2 and y3; pass:false names the failed clause; pass:null when y1 fails, n < 10 or the authority is absent.
// PREDICTIONS (point, band; written before the first run):
//   python      aLex 0.999 [0.995,1.000]  aGold 0.999 [0.995,1.000]  aLG - aLex 0.000 [0.000,0.004]  -> PASS (the lexer's python keyword set equals the interpreter's)
//   javascript  aLex 0.993 [0.985,0.999]  aGold 0.994 [0.985,0.999]  gap 0.005 [0.000,0.015]        -> coin flip on y2: the lexer calls let / async / of / from / as
//               keywords (gold does), acorn types them `name`; `undefined` is a gold literal, a name in acorn
//   c           aLex 0.960 [0.940,0.985]  aGold 0.960 [0.940,0.985]  gap 0.035 [0.020,0.055]        -> FAIL y2: gold folds int / char / void into identifier, clang calls them keywords
//   ruby        aLex 0.960 [0.930,0.990]  aGold 0.985 [0.960,0.998]  gap 0.005 [-0.020,0.030]       -> uncertain; the lexer misses 14 of the 41 reserved words
//   go          standard-text: aLex 0.975 [0.950,0.995]  gap 0.025 [0.005,0.050]                    -> FAIL y2 likely: gold.py and the lexer call nil / true / false
//               literal (reserved here), the Go spec calls them predeclared identifiers; with them removed the gap would be ~0 (I had first written PASS and
//               corrected this prediction before the first run, on re-reading the Go spec's definition of predeclared identifiers)
//   java        standard-text: aLex 0.955 [0.930,0.985]  gap 0.040 [0.020,0.060]                    -> FAIL y2 (gold folds int / void / boolean into identifier; the JLS lists them)
//   y3 (licence) expected to hold in all six (deranged keywords cost 5 to 15 points of agreement).
//   WHAT WOULD FALSIFY K1: y2 failing in c and java is the PREDICTED falsification for those two (it is what the review says: class accuracy there
//   is partly gold.py's convention). K1 holds for a language if y1 and y2 and y3 hold.
// LIMITS (declared): (1) each engine's convention is also a convention: acorn's tokenizer is context-free about contextual keywords, tokenize about soft
//   keywords, Ripper's states decide `.class`; where they differ from gold the confusion table shows which side is wrong by example, but the verdict only
//   says they differ; (2) go and java are standard-text only (word tokens), so their number is not an engine cross-check; (3) one pooled number per
//   language on DEV (dev-tuned; no TEST here); (4) clang is asked about keywords by spelling, not by position.
//
// USAGE  node eval/coding-competence/c1-xauth-class.mjs --language python|javascript|c|ruby|go|java [--limit N]   (dev only; there is no --split)
//        writes /private/tmp/claude-501/coding-competence/c1-xauth-class-<language>-dev.json
//
// AMENDMENTS AND RUN LOG (append only)
// K1 FIRST RUN (2026-10-06; DEV, every eligible file; nothing in the rule, the mappings or the code revised between the pre-registration above and this run, except
//   that the GO and JAVA predictions and the STANDARD_LITERALS rule were corrected BEFORE the run, as said in the header). Reported as run:
//   lang       n   authority (kind)                  aLex    aGold   aLG(same tokens) gap(aLG-aLex) [95% CI]     tripleMatched  y1 y2 y3 | pass
//   python     134 CPython tokenize+keyword (engine) 0.9998  1.0000  0.9998           0.0000 [0,0]                0.9996         T  T  T  | TRUE
//   javascript 150 acorn (engine)                    0.9747  0.9753  0.9984           0.0238 [0.0189,0.0271]      0.9986         T  F  T  | FALSE (y2)
//   c          112 clang (engine)                    0.9664  0.9662  0.9997           0.0333 [0.0247,0.0457]      0.9347         T  F  T  | FALSE (y2)
//   ruby       176 Ripper (engine)                   0.9990  0.9996  0.9994           0.0004 [0.0002,0.0007]      0.8882         T  T  T  | TRUE
//   go         176 Go spec list (standard-text)      0.9581  0.9581  1.0000           0.0419 [0.0377,0.0464]      1.0000         T  F  T  | FALSE (y2)
//   java       180 JLS list (standard-text)          0.9486  0.9490  0.9996           0.0510 [0.0421,0.0594]      1.0000         T  F  T  | FALSE (y2)
//   y3 (licence) held in all six: deranged keywords cost 0.0211 (c) to 0.2581 (java) of agreement, the empty prior 0.096 (go) to 0.288 (ruby), every lower end above 0.
//   WHERE THE GAP IS (the confusion table, token counts; authority class > lexer class): c: reserved>identifier 5,355 (int 2,095, char 1,402, void 604, double 352, long 351,
//   float 287, unsigned 248: gold.py folds primitive types into identifier, clang keys them as keywords), identifier>reserved 1,235 (NULL 1,083, defined 130: gold.py
//   calls them literal / keyword, clang sees a macro name and an identifier); java: reserved>identifier 3,321 (int 1,104, void 1,021, boolean 529, float 423, long 100, byte 64:
//   the same fold); go: identifier>reserved 3,647, ALL of it nil 2,774, true 482, false 391 (gold.py and the lexer call them literal, the Go spec calls them predeclared
//   identifiers); javascript: identifier>reserved 2,693 (let 1,621, await 578, async 195, undefined 106, from 102, of 51, meta 21: acorn's tokenizer is context-free about
//   contextual keywords, the lexer and gold call them keywords) and reserved>identifier 91 (class 37, continue 15, instanceof 13, void 10: reserved words the TRAIN-derived
//   lexicon lacks, the same 11 words c1-lex.mjs details.keywordStandard lists as missing); python: 13 tokens, 12 of them the soft keyword `case` (the lexer calls it a
//   keyword, tokenize an identifier); ruby: 55 tokens (class 26 as identifier>reserved, __FILE__ 20 reserved>identifier).
//   RESULT: K1 holds for python and ruby. It FAILS y2 (the convention gap is above 0.01) for javascript, c, go and java, by 2.4 to 5.1 points: in c, go and java the whole gap is
//   a CONVENTION difference between gold.py's class mapping and the language's own terms (primitive types, NULL / nil / true / false), in javascript it is contextual keywords.
//   So the class accuracy of c1-lex.mjs (0.9976 to 1.0000 strict) is class agreement with gold.py's convention and is 2 to 5 points lower against an authority that is not gold.py,
//   in the four languages where the conventions differ; python and ruby are the two where it is not. This is NOT evidence that the lexer misreads those languages: it is that "keyword"
//   is a convention (the review's finding 3, measured).
//   PREDICTION SCORECARD: inside band: python aLex / aGold / gap, c aLex / aGold / gap, ruby gap, go aLex / gap (the corrected prediction), java aLex / gap; BELOW band: javascript aLex 0.9747 vs
//   [0.985,0.999] and aGold 0.9753 vs [0.985,0.999]; ABOVE band: javascript gap 0.0238 vs [0,0.015] (the coin flip went the wrong way, and I sized let / async / of / from at about 0.5%, it is
//   2.4% because `let` alone is 1.5% of JavaScript tokens and `await` 0.5%), ruby aLex 0.9990 vs [0.93,0.99] and aGold 0.9996 vs [0.96,0.998] (just above). y2 verdicts: python PASS right, javascript
//   coin flip WRONG, c FAIL right, ruby uncertain (PASS), go FAIL (right after the correction), java FAIL right; y3 held in all six, right.
//   LIMITS carried: the engines' own conventions differ from gold's in the places listed (the verdict says "they differ"; the confusion table says which words); c: 8 non-ASCII files excluded
//   and only 93% of authority tokens are triple-matched (preprocessor directives are tokenised differently by clang and the grammar); ruby: 11% of authority tokens are not triple-matched
//   (Ripper's comment token carries its newline, heredoc and %-literal pieces differ); go and java are standard-text, word tokens only.
// =====================================================================================================================
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { goldAvailable, PYTHON } from "./gold.mjs";
import { loadManifest, selectRows, loadDocs, OUT_DIR } from "./c1-common.mjs";
import { lexCode, loadCodeLexPrior, withoutKnowledge, derangeKeywords } from "../../adapters/code/lex.js";
import { zeroVec, addVec, bootstrap, CONSTANTS, FOREIGN, foldClass } from "./c1-lex.mjs";
import { STANDARDS, standardKeywordSet } from "./c1-standards.mjs";

export const ID = "c1-xauth-class";
export const RUNG = { id: "R1", name: "hear tokens, class second authority", question: "Does the lexer's class agree with an independent classifying authority as well as with gold.py's convention?" };
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const K = Object.freeze({ MIN_FILES: 10, COMPARABLE: 0.90, CONV_TOL: 0.01, KW_DROP: 0.02, EMPTY_DROP: 0.05 });
export const COARSE = Object.freeze(["reserved", "identifier", "number", "string", "comment", "symbol"]);
const ENGINES = {
  python: { kind: "engine", name: "CPython 3.14 stdlib tokenize + keyword.iskeyword" },
  javascript: { kind: "engine", name: "acorn tokenizer (Node 24 bundled copy, --expose-internals)" },
  ruby: { kind: "engine", name: "Ruby Ripper.lex (on_kw / on_ident events)" },
  c: { kind: "engine", name: "clang raw lexer + clang keyword table (-Xclang -dump-raw-tokens / -dump-tokens)" },
  go: { kind: "standard-text", name: "Go spec keyword list (no Go toolchain here): word tokens only" },
  java: { kind: "standard-text", name: "JLS 3.9 keyword list (no JVM here): word tokens only" },
};

// ---------------------------------------------------------------------------------------------------------------------
// class mappings (pure; exported for tests)
// ---------------------------------------------------------------------------------------------------------------------
const NUMERIC = /^[+-]?\.?[0-9]/;
/** coarseOfClass(cls, text) -> coarse class of a LEXER or GOLD class (gold `type` folds into identifier); null for `other` / unknown */
export function coarseOfClass(cls, text) {
  switch (foldClass(cls)) {
    case "keyword": return "reserved";
    case "identifier": return "identifier";
    case "literal": return NUMERIC.test(text) ? "number" : "reserved";
    case "string": return "string";
    case "comment": return "comment";
    case "operator": case "punctuation": return "symbol";
    default: return null;
  }
}
/** acorn token label -> coarse class. prevLabel: the label of the previous non-comment token ("" at the start) */
export function jsCoarse(label, text, prevLabel = "") {
  if (label === "COMMENT") return "comment";
  if (label === "name" || label === "privateId") return "identifier";
  if (label === "num" || label === "bigint") return "number";
  if (label === "string" || label === "regexp" || label === "TEMPLATE" || label === "template") return "string";
  if (label === text && /^[A-Za-z]+$/.test(text)) return prevLabel === "." || prevLabel === "?." ? "identifier" : "reserved";
  return "symbol";
}
const RB_IDENT = new Set(["on_ident", "on_const", "on_ivar", "on_gvar", "on_cvar", "on_label"]);
const RB_NUM = new Set(["on_int", "on_float", "on_rational", "on_imaginary"]);
const RB_COMMENT = new Set(["on_comment", "on_embdoc_beg", "on_embdoc", "on_embdoc_end", "on___end__"]);
const RB_SYMBOL = new Set(["on_op", "on_lparen", "on_rparen", "on_lbracket", "on_rbracket", "on_lbrace", "on_rbrace", "on_comma", "on_period", "on_semicolon", "on_tlambda", "on_tlambeg", "on_backtick"]);
/** Ripper event -> coarse class (null: unscored, e.g. heredoc pieces) */
export function rubyCoarse(ev) {
  if (ev === "on_kw") return "reserved";
  if (RB_IDENT.has(ev)) return "identifier";
  if (RB_NUM.has(ev)) return "number";
  if (ev === "STRING" || ev === "on_CHAR") return "string";
  if (RB_COMMENT.has(ev)) return "comment";
  if (RB_SYMBOL.has(ev)) return "symbol";
  return null;
}
const CLANG_STRING = /^(string_literal|char_constant|wide_string_literal|wide_char_constant|utf8_string_literal|utf8_char_constant|utf16_string_literal|utf16_char_constant|utf32_string_literal|utf32_char_constant)$/;
/** clang raw token kind -> coarse class; keywordSet = Set of the spellings clang lexes as keywords */
export function clangCoarse(kind, text, keywordSet) {
  if (kind === "raw_identifier") return keywordSet.has(text) ? "reserved" : "identifier";
  if (kind === "numeric_constant") return "number";
  if (CLANG_STRING.test(kind)) return "string";
  if (kind === "comment") return "comment";
  return "symbol";
}
const WORD = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** literal words a standard reserves although it does not list them among the keywords (Java: JLS 3.10 true / false / null). Go: none (predeclared identifiers). */
export const STANDARD_LITERALS = Object.freeze({ java: ["true", "false", "null"], go: [] });
/** standard-text authority: a word-shaped text is reserved iff the standard lists it (or reserves it as a literal word), else identifier; anything else is not judged (null) */
export function standardCoarse(text, stdSet, litSet = null) {
  if (!WORD.test(text)) return null;
  return stdSet.has(text) || (litSet && litSet.has(text)) ? "reserved" : "identifier";
}

// ---------------------------------------------------------------------------------------------------------------------
// engines
// ---------------------------------------------------------------------------------------------------------------------
function runJsonTool(cmd, args, paths) {
  const r = spawnSync(cmd, args, { input: JSON.stringify(paths), encoding: "utf8", maxBuffer: 1 << 29, timeout: 600000 });
  if (r.status !== 0) throw new Error(`${cmd} failed: ${(r.stderr || r.error?.message || "").toString().split("\n").slice(-2).join(" | ")}`);
  return JSON.parse(r.stdout);
}
function clangRaw(file, text) {
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
    out.push([s, s + tok.length, kind, tok]);
  }
  if (!n) throw new Error("clang produced no raw tokens");
  return out;
}
/** the spellings (among `words`) that clang's own lexer returns as keyword tokens (kind == spelling) */
export function clangKeywordSet(words) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "c1cls-"));
  try {
    const f = path.join(dir, "probe.c");
    fs.writeFileSync(f, [...words].join("\n") + "\n");
    const r = spawnSync("clang", ["-fsyntax-only", "-x", "c", "-Xclang", "-dump-tokens", f], { encoding: "utf8", maxBuffer: 1 << 28, timeout: 120000 });
    const out = new Set();
    let n = 0;
    for (const m of (r.stderr || "").matchAll(/^(\S+) '([^'\n]*)'/gm)) { n++; if (m[1] === m[2] && WORD.test(m[2])) out.add(m[2]); }
    if (!n) throw new Error("clang produced no tokens for the keyword probe");
    return out;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

/** authorityTokens(language, docs, gap) -> Map(path -> {tokens:[[s,e,coarse]]} | {error}) */
export function authorityTokens(language, docs) {
  const by = new Map();
  if (language === "python") {
    const res = runJsonTool(PYTHON, [path.join(HERE, "xauth", "class_py.py")], docs.map((d) => d.row.path));
    for (const d of docs) by.set(d.row.path, res[d.row.path]);
  } else if (language === "ruby") {
    const res = runJsonTool("ruby", [path.join(HERE, "xauth", "xauth_rb.rb")], docs.map((d) => d.row.path));
    for (const d of docs) { const e = res[d.row.path]; by.set(d.row.path, !e || e.error ? e : { tokens: e.tokens.map(([s, t, ev]) => [s, t, rubyCoarse(ev)]).filter((x) => x[2]) }); }
  } else if (language === "javascript") {
    const res = runJsonTool(process.execPath, ["--expose-internals", path.join(HERE, "xauth", "xauth_js.mjs")], docs.map((d) => d.row.path));
    for (const d of docs) {
      const e = res[d.row.path];
      if (!e || e.error) { by.set(d.row.path, e); continue; }
      let prev = "";
      const toks = [];
      for (const [s, t, label] of e.tokens) {
        if (t <= s) continue;
        toks.push([s, t, jsCoarse(label, d.text.slice(s, t), prev)]);
        if (label !== "COMMENT") prev = label;
      }
      by.set(d.row.path, { tokens: toks });
    }
  } else if (language === "c") {
    const raws = new Map();
    const words = new Set();
    for (const d of docs) {
      if (!/^[\x00-\x7f]*$/.test(d.text)) { by.set(d.row.path, { error: "non-ASCII file" }); continue; }
      try { const r = clangRaw(d.row.path, d.text); raws.set(d.row.path, r); for (const [, , kind, tok] of r) if (kind === "raw_identifier") words.add(tok); } catch (e) { by.set(d.row.path, { error: String(e.message).slice(0, 100) }); }
    }
    const kw = clangKeywordSet(words);
    for (const [p, r] of raws) by.set(p, { tokens: r.map(([s, t, kind, tok]) => [s, t, clangCoarse(kind, tok, kw)]) });
  } else if (ENGINES[language]?.kind === "standard-text") {
    const set = standardKeywordSet(language);
    const lits = new Set(STANDARD_LITERALS[language] ?? []);
    for (const d of docs) {
      const toks = [];
      for (const g of d.tokens) { const c = standardCoarse(d.text.slice(g.start, g.end), set, lits); if (c && (g.class === "keyword" || g.class === "identifier" || g.class === "type" || g.class === "literal")) toks.push([g.start, g.end, c]); }
      by.set(d.row.path, { tokens: toks });
    }
  }
  return by;
}

// ---------------------------------------------------------------------------------------------------------------------
// the measurement
// ---------------------------------------------------------------------------------------------------------------------
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
const agr = (v) => (v[0] ? v[1] / v[0] : 0);
const mapOf = (toks, text) => { const m = new Map(); for (const t of toks) m.set(`${t.start},${t.end}`, coarseOfClass(t.class, text.slice(t.start, t.end))); return m; };

/** scoreClassFile(text, goldTokens, authority, arms) -> {armName: [n, agree]} on the triple-matched tokens; plus confusion tallies. Pure. */
export function scoreClassFile(text, gold, authority, lexArms) {
  const vec = Object.fromEntries(["lexer", "gold", "lexerGold", ...Object.keys(lexArms).filter((k) => k !== "lexer")].map((k) => [k, zeroVec()]));
  const goldMap = mapOf(gold.filter((g) => g.class !== "other"), text);
  const armMaps = Object.fromEntries(Object.entries(lexArms).map(([k, toks]) => [k, mapOf(toks, text)]));
  const lexMap = armMaps.lexer;
  const conf = new Map(), words = new Map();
  let matchedAuthority = 0;
  for (const [s, e, cls] of authority) {
    const key = `${s},${e}`;
    const gm = goldMap.get(key), lm = lexMap.get(key);
    if (lm === undefined || gm === undefined || gm === null) continue;
    matchedAuthority++;
    for (const k of Object.keys(vec)) { if (k === "gold" || k === "lexerGold") continue; vec[k][0]++; if (armMaps[k].get(key) === cls) vec[k][1]++; }
    vec.gold[0]++; if (gm === cls) vec.gold[1]++;
    vec.lexerGold[0]++; if (lm === gm) vec.lexerGold[1]++;
    if (lm !== cls) {
      const ck = `${cls}>${lm}`;
      conf.set(ck, (conf.get(ck) ?? 0) + 1);
      if ((cls === "reserved" && lm === "identifier") || (cls === "identifier" && lm === "reserved")) { const wk = `${ck}:${text.slice(s, e)}`; words.set(wk, (words.get(wk) ?? 0) + 1); }
    }
  }
  return { vec, conf, words, matchedAuthority, authorityTokens: authority.length };
}

export async function measure({ language, limit = null } = {}) {
  const lang = String(language ?? "").toLowerCase();
  const res = { id: ID, rung: RUNG.id, language: lang, split: "dev", n: 0, applicable: true, score: null, control: null, margin: null, pass: null, credited: false,
    evidence: { tier: "dev-tuned", creditable: false, reason: "split=dev: the lexer and priors were revised while looking at DEV (c1-lex.mjs A3..A7); not a competence claim" },
    controls: {}, gaps: [], notes: [], details: { language: lang } };
  const gap = (reason, count = 1) => res.gaps.push({ reason, count });
  try {
    const eng = ENGINES[lang];
    if (!eng) { gap(`unmeasured: no classifying authority (engine or standard list) for ${lang || "(none)"}; python, javascript, c, ruby, go, java only`); return res; }
    const av = goldAvailable();
    if (!av.available) { gap(`unmeasured: gold extractor unavailable (${av.reason})`); return res; }
    const prior = loadCodeLexPrior(lang);
    if (!prior) { gap(`unmeasured: no CodeLexPrior for ${lang}`); return res; }
    if (eng.kind === "engine") {
      const tool = lang === "python" ? PYTHON : lang === "ruby" ? "ruby" : lang === "c" ? "clang" : process.execPath;
      const probe = spawnSync(tool, ["--version"], { encoding: "utf8" });
      if (probe.error || probe.status !== 0) { gap(`unmeasured: the ${eng.name} engine is not runnable here (${tool})`); return res; }
    }
    const manifest = loadManifest();
    const sel = selectRows(manifest, lang, "dev", limit);
    if (sel.excluded.restricted) gap("excluded: restricted (copyleft) rows", sel.excluded.restricted);
    const loaded = await loadDocs(lang, sel.rows);
    for (const g of loaded.gaps) gap(g.reason, g.count);
    const trainRepos = new Set((prior.provenance?.trainRepos ?? []).map((r) => r.repo));
    const docs0 = loaded.docs.filter((d) => !trainRepos.has(d.repo));
    if (docs0.length < loaded.docs.length) gap("leak: file from the prior's own train repositories (refused)", loaded.docs.length - docs0.length);
    const auth = authorityTokens(lang, docs0);
    const docs = [];
    const errs = new Map();
    for (const d of docs0) { const e = auth.get(d.row.path); if (!e || e.error) { const k = `authority rejected file: ${(e?.error ?? "no result").split(":")[0]}`; errs.set(k, (errs.get(k) ?? 0) + 1); } else docs.push({ ...d, authority: e.tokens }); }
    for (const [k, c] of errs) gap(k, c);
    res.n = docs.length;
    res.details.authority = { kind: eng.kind, name: eng.name, ...(eng.kind === "standard-text" ? { giver: STANDARDS[lang]?.giver, crossCheck: STANDARDS[lang]?.crossCheck } : {}) };
    if (eng.kind === "standard-text") gap(`authority is the standard's reserved-word list applied to word tokens only (no executable authority for ${lang} on this machine): not an engine cross-check`);
    if (docs.length < K.MIN_FILES) { gap(`n<${K.MIN_FILES}: ${docs.length} files with an authority tokenisation, no verdict`); if (!docs.length) return res; }

    const kwSeeds = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, prior: derangeKeywords(prior, s) }));
    const empty = withoutKnowledge(prior);
    const foreignLang = FOREIGN[lang] ?? null;
    const foreignPrior = foreignLang ? loadCodeLexPrior(foreignLang) : null;
    const perFile = [];
    const conf = new Map(), words = new Map();
    let matched = 0, authTotal = 0;
    for (const d of docs) {
      const arms = { lexer: lexCode(d.text, prior), empty: lexCode(d.text, empty) };
      for (const k of kwSeeds) arms[`kw${k.seed}`] = lexCode(d.text, k.prior);
      if (foreignPrior) arms.foreign = lexCode(d.text, foreignPrior);
      const sc = scoreClassFile(d.text, d.tokens, d.authority, arms);
      perFile.push(sc.vec);
      matched += sc.matchedAuthority; authTotal += sc.authorityTokens;
      for (const [k, v] of sc.conf) conf.set(k, (conf.get(k) ?? 0) + v);
      for (const [k, v] of sc.words) words.set(k, (words.get(k) ?? 0) + v);
    }
    const armNames = Object.keys(perFile[0]);
    const total = Object.fromEntries(armNames.map((a) => [a, zeroVec()]));
    for (const f of perFile) for (const a of armNames) addVec(total[a], f[a]);
    const kwBest = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, acc: agr(total[`kw${s}`]) })).sort((a, b) => b.acc - a.acc)[0];
    const kwArm = `kw${kwBest.seed}`;
    const BB = CONSTANTS.BOOT_B, BS = CONSTANTS.BOOT_SEED;
    const Gap = bootstrap(perFile, (s) => agr(s.lexerGold) - agr(s.lexer), BB, BS, ["lexerGold", "lexer"]);
    const Kw = bootstrap(perFile, (s) => agr(s.lexer) - agr(s[kwArm]), BB, BS, ["lexer", kwArm]);
    const Em = bootstrap(perFile, (s) => agr(s.lexer) - agr(s.empty), BB, BS, ["lexer", "empty"]);
    const Fo = foreignPrior ? bootstrap(perFile, (s) => agr(s.lexer) - agr(s.foreign), BB, BS, ["lexer", "foreign"]) : null;
    const aLex = agr(total.lexer), aGold = agr(total.gold), aLG = agr(total.lexerGold), aEmpty = agr(total.empty), aKw = kwBest.acc;
    const y1 = aGold >= K.COMPARABLE;
    const y2 = Gap.point <= K.CONV_TOL;
    const y3 = Kw.point >= K.KW_DROP && Kw.lo > 0 && Em.point >= K.EMPTY_DROP && Em.lo > 0;
    const failed = [];
    if (!y2) failed.push("y2:class-accuracy-depends-on-gold-convention-by-more-than-0.01");
    if (!y3) failed.push("y3:received-knowledge-did-not-move-agreement-with-the-authority");
    const ctl = Math.max(aEmpty, aKw);
    res.score = r4(aLex);
    res.control = r4(ctl);
    res.margin = r4(res.score - res.control);   // from the rounded figures: margin = score - control holds exactly for the aggregator's audit
    if (docs.length < K.MIN_FILES) res.pass = null;
    else if (!y1) { res.pass = null; gap(`authorities disagree: agreement(gold, authority) = ${r4(aGold)} < ${K.COMPARABLE}: no verdict`); }
    else res.pass = failed.length === 0;
    res.controls = { emptyPriorAgreement: r4(aEmpty), derangedKeywordsAgreement: r4(aKw), ...(foreignPrior ? { foreignLanguage: foreignLang, foreignPriorAgreement: r4(agr(total.foreign)) } : {}) };
    const top = (pairs, n) => [...pairs].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
    res.details = {
      language: lang, authority: res.details.authority, files: docs.length, authorityTokens: authTotal, tripleMatchedTokens: matched, tripleMatchedShare: r4(matched / Math.max(1, authTotal)),
      agreement: { lexerVsAuthority: r4(aLex), goldVsAuthority: r4(aGold), lexerVsGoldSameTokens: r4(aLG), conventionGap: r4(Gap.point), conventionGapCi95: [r4(Gap.lo), r4(Gap.hi)] },
      clauses: { y1, y2, y3, failed,
        licence: { keywords: { drop: r4(Kw.point), ci95: [r4(Kw.lo), r4(Kw.hi)], strongestSeed: kwBest.seed }, empty: { drop: r4(Em.point), ci95: [r4(Em.lo), r4(Em.hi)] },
          foreign: Fo ? { language: foreignLang, drop: r4(Fo.point), ci95: [r4(Fo.lo), r4(Fo.hi)], gating: false } : null } },
      confusion: top(conf, 12).map(([k, n]) => ({ authority_lexer: k, n })),
      reservedIdentifierWords: top(words, 24).map(([k, n]) => { const [pair, ...w] = k.split(":"); return { authority_lexer: pair, word: w.join(":"), n }; }),
      constants: { ...K, BOOT_B: BB, BOOT_SEED: BS, limit },
    };
    res.notes.push("dev-tuned (c1-lex.mjs A14): not a competence claim");
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
  if (!language) { console.error("usage: node eval/coding-competence/c1-xauth-class.mjs --language python|javascript|c|ruby|go|java [--limit N]"); process.exit(2); }
  const limit = opt("--limit", null) ? Number(opt("--limit")) : null;
  const r = await measure({ language, limit });
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, `c1-xauth-class-${r.details.language}-dev.json`), JSON.stringify(r, null, 1) + "\n"); } catch { /* printing is enough */ }
  console.log(JSON.stringify(r));
}
