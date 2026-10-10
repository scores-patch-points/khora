// c1-standards.mjs: the LANGUAGE STANDARDS' keyword lists, as a SECOND GIVER for the word class (c1-lex.mjs amendment A15, 2026-10-06).
//
// WHY. The lexer's keyword set is derived from TRAIN gold, and the gold's class is gold.py's own mapping over tree-sitter node types; the
// standards of the languages were never consulted. A15 asks how the TRAIN-derived keyword sets stand against what each language's standard
// or reference implementation says is a reserved word, and reports the difference as a TYPED GAP with counts (never as a pass).
//
// WHAT IS HERE. Per language the reserved words of the standard (or, where no open standard exists, the reference implementation's own table),
// the contextual words the standard also names, the giver, and how the list was cross-checked. Lists were typed from the standard's text by
// the instrument's author (the model); the cross-check column says which were then verified against an EXECUTABLE authority on this machine
// (2026-10-06) and which could not be (a typed gap, not a pass):
//   python      CPython 3.14.7 `keyword.kwlist` / `keyword.softkwlist` (the Python Language Reference 2.3.1 "Keywords"). LIVE: the list below is
//               compared with the interpreter by tests/coding-c1.test.js when python3 is present.
//   javascript  ECMA-262 ReservedWord (13.? / 12.7.2) typed; the subset acorn 8.15.0 (bundled in Node 24) tokenises as keywords was compared:
//               every acorn keyword is in the list (acorn omits await, enum, yield, which the spec reserves in some goals).
//   c           ISO/IEC 9899:2011 6.4.1 (public draft N1570), 44 keywords, typed; clang 15 `-std=c11 -Xclang -dump-tokens` lexed ALL 44 as keyword
//               tokens (kind == spelling). Words the compilers add (asm, typeof, __attribute__, ...) are extensions, not in the standard list.
//   go          The Go Programming Language Specification, Keywords (language version go1.27, fetched 2026-10-06 from https://go.dev/ref/spec,
//               content CC BY 4.0 per https://go.dev/copyright; the 25 keywords were read off the page's Keywords section). No Go toolchain here.
//   ruby        Ruby 2.6.10 `Ripper.lex`: every one of the 41 words lexes as on_kw (ruby-lang.org doc/syntax keywords table). LIVE-checked.
//   java        JLS SE 21 3.9 (50 keywords + `_`), typed. NO executable cross-check on this machine (javac is the macOS stub: no JVM). Typed gap.
//               true / false / null are literals (JLS 3.10), not keywords; the contextual (restricted) words are listed apart.
//
// This is a CONTROL/REPORT module: the lexer (adapters/code/lex.js) never reads it, so no reader depends on a typed list.
export const STANDARDS = Object.freeze({
  python: {
    giver: "Python Language Reference 2.3.1 Keywords, as CPython 3.14.7 keyword.kwlist",
    crossCheck: { engine: "CPython 3.14.7 keyword module", status: "verified-live" },
    keywords: ["False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"],
    contextual: ["_", "case", "match", "type"],
  },
  javascript: {
    giver: "ECMA-262 ReservedWord (ECMAScript Language: Lexical Grammar)",
    crossCheck: { engine: "acorn 8.15.0 keywordTypes (Node 24 bundled)", status: "verified-subset" },
    keywords: ["await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "null", "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with", "yield"],
    contextual: ["async", "of", "let", "static", "get", "set", "as", "from", "implements", "interface", "package", "private", "protected", "public"],
  },
  c: {
    giver: "ISO/IEC 9899:2011 6.4.1 Keywords (public draft N1570)",
    crossCheck: { engine: "clang 15 -std=c11 -Xclang -dump-tokens (all 44 are keyword kinds)", status: "verified-live" },
    keywords: ["auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long", "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "_Alignas", "_Alignof", "_Atomic", "_Bool", "_Complex", "_Generic", "_Imaginary", "_Noreturn", "_Static_assert", "_Thread_local"],
    contextual: [],
  },
  go: {
    giver: "The Go Programming Language Specification, Keywords (go1.27, https://go.dev/ref/spec, CC BY 4.0, fetched 2026-10-06)",
    crossCheck: { engine: "the specification page itself (parsed 2026-10-06); no Go toolchain on this machine", status: "verified-against-spec-text" },
    keywords: ["break", "case", "chan", "const", "continue", "default", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"],
    contextual: [],
  },
  ruby: {
    giver: "Ruby keywords (ruby-lang.org doc/syntax), as the interpreter's own lexer Ripper 2.6.10 emits on_kw",
    crossCheck: { engine: "Ruby 2.6.10 Ripper.lex (all 41 are on_kw)", status: "verified-live" },
    keywords: ["BEGIN", "END", "__ENCODING__", "__FILE__", "__LINE__", "alias", "and", "begin", "break", "case", "class", "def", "defined?", "do", "else", "elsif", "end", "ensure", "false", "for", "if", "in", "module", "next", "nil", "not", "or", "redo", "rescue", "retry", "return", "self", "super", "then", "true", "undef", "unless", "until", "when", "while", "yield"],
    contextual: [],
  },
  java: {
    giver: "The Java Language Specification SE 21, 3.9 Keywords",
    crossCheck: { engine: "none available (javac is the macOS stub, no JVM)", status: "typed-gap-no-executable-check" },
    keywords: ["_", "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const", "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float", "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native", "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp", "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void", "volatile", "while"],
    contextual: ["exports", "module", "non-sealed", "open", "opens", "permits", "provides", "record", "requires", "sealed", "to", "transitive", "uses", "var", "when", "with", "yield"],
  },
});

export const standardKeywordSet = (language) => (STANDARDS[language] ? new Set(STANDARDS[language].keywords) : null);

/**
 * compareKeywordSets(prior, language) -> a typed report of the prior's keyword/literal words against the standard's reserved words.
 * null when no standard is held for the language (a typed gap, said by the caller). Counts, never a verdict.
 */
export function compareKeywordSets(prior, language) {
  const std = STANDARDS[language];
  if (!std) return null;
  const stdSet = new Set(std.keywords);
  const kw = new Set(prior?.words?.keyword ?? []);
  const lit = new Set(prior?.words?.literal ?? []);
  const have = new Set([...kw, ...lit]);
  const missing = std.keywords.filter((w) => !have.has(w)).sort();
  const asKeyword = std.keywords.filter((w) => kw.has(w));
  const asLiteral = std.keywords.filter((w) => !kw.has(w) && lit.has(w));
  const extra = [...kw].filter((w) => !stdSet.has(w)).sort();
  return {
    giver: std.giver, crossCheck: std.crossCheck,
    standardWords: std.keywords.length, priorKeywords: kw.size, priorLiterals: lit.size,
    standardWordsInPrior: std.keywords.length - missing.length, standardWordsAsKeyword: asKeyword.length, standardWordsAsLiteral: asLiteral.length,
    standardMissingFromPrior: missing, missingCount: missing.length,
    priorKeywordsNotInStandard: extra, extraCount: extra.length,
    contextualInPriorKeywords: [...kw].filter((w) => (std.contextual ?? []).includes(w)).sort(),
  };
}

/** standardUnionPrior(prior, language) -> a copy of the prior with every standard reserved word nominated as a keyword unless the prior has it as a literal. null if no standard. */
export function standardUnionPrior(prior, language) {
  const std = STANDARDS[language];
  if (!std) return null;
  const copy = JSON.parse(JSON.stringify(prior));
  const lit = new Set(copy.words.literal ?? []);
  const kw = new Set(copy.words.keyword ?? []);
  for (const w of std.keywords) if (!lit.has(w)) kw.add(w);
  copy.words.keyword = [...kw].sort();
  copy.provenance = { ...copy.provenance, control: `standard keyword union (${std.giver})` };
  return copy;
}

/**
 * relabelGoldByStandard(text, goldTokens, language) -> gold tokens with class "type" whose text is a standard reserved word relabelled
 * "keyword" (the declared type-to-identifier fold is NOT applied to them); every other token unchanged. Isolates the tokens where
 * gold.py's convention (a primitive type is a `type`) and the language standard (it is a keyword) disagree.
 */
export function relabelGoldByStandard(text, goldTokens, language) {
  const set = standardKeywordSet(language);
  if (!set) return null;
  let n = 0;
  const out = goldTokens.map((t) => {
    if (t.class === "type" && set.has(text.slice(t.start, t.end))) { n++; return { ...t, class: "keyword" }; }
    return t;
  });
  return { tokens: out, relabelled: n };
}

/** dropTypeFromClassScoring(goldTokens) -> gold with class "type" tokens turned "other": boundary-scored, never class-scored. */
export function dropTypeFromClassScoring(goldTokens) {
  return goldTokens.map((t) => (t.class === "type" ? { ...t, class: "other" } : t));
}
