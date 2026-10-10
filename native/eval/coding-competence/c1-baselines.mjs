// c1-baselines.mjs: the CHEAP BASELINES of c1-lex.mjs amendment A13 (2026-10-06). Controls only: nothing here is a prior and nothing
// here is read by any reader. Every table below is AUTHORED by the instrument's author (the model) from the language references named
// beside it, BEFORE any DEV run of A13 and without looking at any DEV or TRAIN file or gold token; none is derived from a corpus. A model-authored
// control is labelled authored and is never presented as received knowledge.
//
// WHY. c1-lex.mjs compared the lexer with whitespace splitting (F1 0.22 to 0.33) and with a constant class (share 0.37 to 0.49): any scanner
// beats those. The honest question is what the RECEIVED prior adds over what a person with a language reference but no corpus can type in an
// hour. "Cheap" is declared as: a typed table of the language's comment and string delimiters, a typed table of multi-character operators
// (language-blind), the generic punctuation set, and the scanner's own word / pp-number shapes. It deliberately does NOT contain a keyword
// list (the keyword derangement control c1 measures that knowledge; the standard's keyword lists are reported as a separate, non-gating arm
// `standardUnion` in c1-lex.mjs, see c1-standards.mjs).
//
// ARMS (each is a CodeLexPrior@1-shaped object run through the SAME scanner lexCode(); only the prior's content differs from the real arm):
//   shape            the scanner with an EMPTY prior (words, pp-numbers, single-character symbols; no delimiters). This is the existing
//                    `generic` arm (withoutKnowledge) and is built in c1-lex.mjs, not here.
//   genericDelims    ONE language-blind delimiter table for every language: comments `//` EOL, `/* */`, `#` EOL; strings `"` and `'` (single-line,
//                    backslash escape), `` ` `` (multi-line); the generic punctuation set.
//   typedDelims      the language's own delimiter table, typed from its reference (TYPED below); the generic punctuation set.
//   typedDelimsOps   typedDelims + one language-blind table of multi-character operators (GENERIC_OPS), each dropped for a language when it
//                    contains one of that language's quote characters or comment openers (the same guard the prior builder applies, A7).
// CONTROL = the strongest of these arms on the pooled DEV score, chosen separately for boundary F1 and for class accuracy (c1-lex.mjs A13).
//
// GIVERS of the typed tables (language references; none is paywalled text reproduced here, only the lexical facts):
//   python      Python Language Reference, 2. Lexical analysis (comments 2.1.x, string and bytes literals 2.4.x, f-strings)
//   javascript  ECMA-262 12 ECMAScript Language: Lexical Grammar (comments, string literals, template literals; identifiers allow `$`)
//   c           ISO/IEC 9899:2011 6.4 Lexical elements (the public draft N1570), 6.4.4.4 character constants, 6.4.5 string literals
//   go          The Go Programming Language Specification, Lexical elements (comments, rune and string literals, raw strings)
//   ruby        Ruby language documentation, syntax/literals (# and =begin/=end comments, quoted strings with #{ } interpolation)
//   java        The Java Language Specification SE 21, 3 Lexical Structure (3.7 comments, 3.10.4 char, 3.10.5 string, 3.10.6 text blocks, 3.8 `$`)
// Edit rule: any change to a table is an amendment dated in c1-lex.mjs, never silent (the file's sha256 is recorded in A13's header).
import { LEX_SCHEMA } from "../../adapters/code/lex.js";

const BS = "\\";
const sl = (open, extra = {}) => ({ open, close: open, escape: BS, multiline: false, trailing: false, interp: [], interpQuotes: [], prefixes: [], class: "string", ...extra });
const ml = (open, extra = {}) => sl(open, { multiline: true, ...extra });
const line = (open) => ({ open, close: null });
const block = (open, close) => ({ open, close });

/** punctuation proper: the one class split a cheap lexer makes (everything else attested or not is an operator). */
export const PUNCT1 = Object.freeze(["(", ")", "[", "]", "{", "}", ",", ";", ":", "."]);

/** language-blind multi-character operators (a union over the C family, Python, Go, Ruby, JavaScript, Java; typed once). */
export const GENERIC_OPS = Object.freeze([
  ">>>=", "<<=", ">>=", ">>>", "**=", "//=", "...", "&&=", "||=", "??=", "===", "!==", "&^=",
  "==", "!=", "<=", ">=", "&&", "||", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "->", "=>", "::", "**", "//", "?.", "??", "..", "<-", ":=", "&^",
]);

const PY_PREFIXES = ["r", "R", "u", "U", "b", "B", "f", "F", "t", "T", "br", "bR", "Br", "BR", "rb", "rB", "Rb", "RB", "fr", "fR", "Fr", "FR", "rf", "rF", "Rf", "RF", "tr", "tR", "Tr", "TR", "rt", "rT", "Rt", "RT"];
const QUOTES3 = ['"', "'", "`"];

/** TYPED: the per-language delimiter tables (AUTHORED, see the header). */
export const TYPED = Object.freeze({
  python: { comments: [line("#")], strings: [ml('"""', { prefixes: PY_PREFIXES }), ml("'''", { prefixes: PY_PREFIXES }), sl('"', { prefixes: PY_PREFIXES }), sl("'", { prefixes: PY_PREFIXES })], extra: [] },
  javascript: { comments: [line("//"), block("/*", "*/")], strings: [sl('"'), sl("'"), ml("`", { interp: ["${"], interpQuotes: QUOTES3 })], extra: ["$"] },
  c: { comments: [line("//"), block("/*", "*/")], strings: [sl('"'), sl("'")], extra: [] },
  go: { comments: [line("//"), block("/*", "*/")], strings: [sl('"'), sl("'"), ml("`", { escape: null })], extra: [] },
  ruby: { comments: [line("#"), block("=begin", "=end")], strings: [ml('"', { interp: ["#{"], interpQuotes: ['"', "'"] }), ml("'"), ml("`")], extra: [] },
  java: { comments: [line("//"), block("/*", "*/")], strings: [ml('"""'), sl('"'), sl("'")], extra: ["$"] },
});

/** GENERIC: the language-blind table. */
export const GENERIC = Object.freeze({
  comments: [line("//"), block("/*", "*/"), line("#")],
  strings: [sl('"'), sl("'"), ml("`")],
  extra: [],
});

function buildPrior(id, spec, ops) {
  const table = {};
  for (const p of PUNCT1) table[p] = "punctuation";
  const quoteChars = new Set(spec.strings.flatMap((s) => [...s.open]));
  const openers = spec.comments.map((c) => c.open);
  for (const o of ops) {
    if ([...o].some((c) => quoteChars.has(c)) || openers.some((q) => o.includes(q))) continue;
    table[o] = "operator";
  }
  let maxLen = 1;
  for (const k of Object.keys(table)) if (k.length > maxLen) maxLen = k.length;
  return {
    schema: LEX_SCHEMA,
    language: null,
    grammar: null,
    provenance: { giver: "AUTHORED by the instrument's author from the language reference (a control, never a received prior)", control: id, trainRepos: [], trainFiles: [] },
    words: { keyword: [], literal: [], counts: {}, identifierSample: [] },
    wordChars: { extra: [...spec.extra], prefixes: [], suffix: [] },
    shape: { number: "literal", unknownWord: "identifier", unknownSymbol: "operator" },
    comments: spec.comments.map((c) => ({ ...c })),
    strings: spec.strings.map((s) => ({ ...s, interp: [...s.interp], interpQuotes: [...s.interpQuotes], prefixes: [...s.prefixes] })),
    conditional: [],
    symbols: { table, maxLen },
    classShare: {},
  };
}

export const genericDelimPrior = () => buildPrior("cheap baseline: language-blind delimiters", GENERIC, []);
export const typedDelimPrior = (language) => (TYPED[language] ? buildPrior(`cheap baseline: typed delimiters (${language})`, TYPED[language], []) : null);
export const typedDelimOpsPrior = (language) => (TYPED[language] ? buildPrior(`cheap baseline: typed delimiters + operator table (${language})`, TYPED[language], GENERIC_OPS) : null);

/** baselinePriors(language) -> { genericDelims, typedDelims?, typedDelimsOps? } (typed arms only for a language with a typed table: a typed gap otherwise) */
export function baselinePriors(language) {
  const out = { genericDelims: genericDelimPrior() };
  const t = typedDelimPrior(language), o = typedDelimOpsPrior(language);
  if (t) out.typedDelims = t;
  if (o) out.typedDelimsOps = o;
  return out;
}
