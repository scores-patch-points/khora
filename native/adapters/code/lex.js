// adapters/code/lex.js: the code channel's LEXER (C1 LEX). Lovelace's law: the engine does what it is ordered to
// perform. What counts as a token here is ORDERED by a received prior (CodeLexPrior@1) and by one language-blind scanner;
// nothing in this file knows a language by name, and no word of any language is typed here.
//
// WHAT IS IN THIS FILE
//   lexCode(text, prior)            -> [{start,end,class}]  non-overlapping lexemes, UTF-16 offsets, whitespace is never one.
//   whitespaceSplit(text, prior)    -> the same shape: the baseline control (maximal non-whitespace runs).
//   splitIdentifier(name)           -> sub-words of an identifier (snake_case, camelCase, PascalCase, ACRONYMCase, digits).
//   deriveLexPrior(docs, meta)      -> CodeLexPrior@1, from TRAIN gold only (docs = [{repo,text,tokens}], tokens as gold.mjs gives).
//   derangeKeywords / withoutDelimiters -> the two ablation controls the instrument (eval/coding-competence/c1-lex.mjs) needs.
//   loadCodeLexPrior(language)      -> the vendored priors/code-lex-<language>.json, or null (admit nothing, disclosed).
//
// RULES THIS FILE OBEYS (READING-SPEC / READING-POLICY / FOLD-CONSTITUTION)
//   CAUSAL: the lexer reads left to right and decides each lexeme from the text so far and the lexemes it already emitted
//   (the one look-ahead is inside a single string/comment lexeme to find its own terminator: a lexeme's extent is part of
//   the lexeme, as in every lexer). No whole-file statistic is used to judge an earlier unit.
//   PRIORS REFUSE OR NOMINATE: a prior only nominates (which words are keywords, which delimiters open a comment); a word
//   the prior has not seen is an identifier by default, never admitted as anything stronger. An absent prior is a typed
//   gap (loadCodeLexPrior returns null), never a silent default language.
//   CASING IS ONE WITNESS: the scanner never reads letter-casing to decide a class. splitIdentifier reads casing only to
//   find sub-word SEAMS (a boundary), the same use code-structure.js documents; it grants no identity and no class.
//   EVERY THRESHOLD IS DECLARED: see DERIVE below; each has its reason beside it.
//
// THE ONE DECLARED GENERAL TABLE (the only language-blind lexical shape the scanner carries, with its giver):
//   numbers. A token that starts with a digit (or a dot followed by a digit) is a numeric literal and is scanned as a
//   "pp-number" (ISO/IEC 9899 section 6.4.8: digits, letters, underscores, and an e/E/p/P followed by a sign), with one
//   declared deviation: a dot joins the number only when a digit follows it (so `1..5`, `1.foo` and `x[0].y` keep their
//   dots). The class a prior gives to digit-initial tokens is DERIVED (shape.number), not typed. The same C lexical
//   grammar is the giver for the word shape: identifiers are Unicode XID_Start/XID_Continue words (UAX #31) plus the
//   extra word characters a prior derives from the grammar's own tokens.
//
// WHAT THE PRIOR CARRIES (derived from TRAIN gold, never hand-typed per language):
//   words.keyword / words.literal   words that the grammar's own tokens label that way (majority, count, repo floors)
//   wordChars.extra / prefixes / suffix   characters that live inside / lead / trail the grammar's words (e.g. `$`, `@`, `?`)
//   comments[]   {open, close|null}  openers chosen by precision against ALL gold tokens, closers by reproducing the gold end
//   strings[]    {open, close, escape, multiline, trailing, interp[], prefixes[]}  likewise, by simulation on TRAIN tokens
//   conditional[] lexemes (strings, or signed numbers) that exist only after a previous token the prior names, by text or by class
//                (`<..>` after #include, a regex after `=`, `-1` after `=`)
//   symbols{}    attested operator/punctuation strings with their majority class and a munch-precision filter
import fs from "node:fs";

export const LEX_SCHEMA = "CodeLexPrior@1";
export const LEX_CLASSES = Object.freeze(["keyword", "identifier", "literal", "operator", "punctuation", "comment", "string"]);

// Every threshold used to DERIVE a prior from gold. Declared once here and copied into each prior's provenance.
export const DERIVE = Object.freeze({
  MIN_WORD_COUNT: 3,        // a word is a keyword/literal only if the grammar labelled it so at least 3 times (one-offs are noise)
  MIN_WORD_REPOS: 2,        // ...in at least 2 independent repositories (capped at the number of train repos): grammar words recur across projects
  MIN_SYMBOL_COUNT: 1,      // a single-character symbol is always scannable; longer ones must pass the munch filter below
  MUNCH_PRECISION: 0.5,     // a multi-character symbol is kept iff the grammar emits it whole at least half the time it matches (majority)
  OPENER_MIN_COUNT: 5,      // a comment opener needs 5 gold comment tokens
  OPENER1_PRECISION: 0.95,  // a ONE-char opener (`#`) must start comments in 95% of all gold tokens that start with it AND never be a complete gold token itself (so `/`, `-`, `{` never qualify)
  OPENER2_PRECISION: 0.99,  // a longer opener (`//`, `/*`, `=b`) 99%
  LCP_SHARE: 0.99,          // an opener is extended while 99% of its comments continue with the same character (=b -> =begin)
  STRING_MIN_COUNT: 5,      // an unconditional string opener needs 5 gold string tokens (amendment A1 in c1-lex.mjs; was 20)
  STRING_OPEN_PRECISION: 0.95, // ...and 95% of all gold tokens that start with its delimiter must be strings (so `/` never qualifies)
  MATCH_MIN: 0.9,           // a spec is admitted iff, on TRAIN tokens, scanning from the opener reproduces the gold lexeme end 90% of the time
  EXTRA_MIN_COUNT: 20, EXTRA_PRECISION: 0.9,   // an extra word char: inside >= 20 grammar words and 90% of the tokens that contain it are words
  PREFIX_MIN_COUNT: 20, PREFIX_ATTACH: 0.5,    // a word prefix: leads >= 20 grammar words and the grammar attaches it at least half the time
  SUFFIX_MIN_COUNT: 20, SUFFIX_ATTACH: 0.5,    // a word suffix: same, per following-character bucket
  COND_MIN_COUNT: 5, COND_PRECISION: 0.95,     // conditional opener: 5 gold strings after the same previous token, 95% of gold tokens there
  INTERP_MIN_COUNT: 20, INTERP_MIN_SHARE: 0.02, // string interpolation opener: in >= 20 tokens and >= 2% of that opener's strings
  STRPREFIX_MIN_COUNT: 3,   // a string prefix letter group (r, b, f, L, u8) seen at least 3 times
  SAMPLE: 400,              // tokens simulated per candidate spec (bounded work; deterministic first-N by file then offset)
  IDENT_SAMPLE_MIN: 300,    // identifier words kept for the keyword-derangement control
});

// ----------------------------------------------------------------------------------------------------------------
// character helpers (pure)
// ----------------------------------------------------------------------------------------------------------------
const RE_ID_START = /[\p{ID_Start}_]/u;
const RE_ID_CONT = /[\p{ID_Continue}]/u;
const RE_LETTER = /\p{L}/u;
const RE_SPACE = /\s/;
const A = { ID: (c) => (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || c === 95 || (c >= 97 && c <= 122) };

function cpAt(text, i) {
  const c = text.codePointAt(i);
  return { c, w: c > 0xffff ? 2 : 1 };
}

function isSpaceCode(c, ch) {
  if (c <= 32) return true;
  if (c < 128) return false;
  return RE_SPACE.test(ch);
}

/** is the code point starting at text[i] a word start / word continue char under this compiled prior */
function startsWord(text, i, C) {
  const c = text.charCodeAt(i);
  if (c < 128) return (c >= 65 && c <= 90) || c === 95 || (c >= 97 && c <= 122) || (C && C.extra.has(text[i]));
  const { c: cp } = cpAt(text, i);
  return RE_ID_START.test(String.fromCodePoint(cp));
}
function contWord(text, i, C) {
  const c = text.charCodeAt(i);
  if (c < 128) return A.ID(c) || (C && C.extra.has(text[i]));
  const { c: cp } = cpAt(text, i);
  return RE_ID_CONT.test(String.fromCodePoint(cp));
}
function isDigit(c) { return c >= 48 && c <= 57; }
function isAsciiLetter(c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }

// ----------------------------------------------------------------------------------------------------------------
// atomic lexemes (comments and strings): one scanner shared by the lexer and by the prior builder's simulation
// ----------------------------------------------------------------------------------------------------------------
function skipInterp(text, k, quotes) {
  const n = text.length;
  let depth = 1;
  while (k < n) {
    const ch = text[k];
    if (quotes && quotes.length && quotes.includes(ch)) {
      let m = k + 1;
      while (m < n && text[m] !== ch) { if (text[m] === "\\") m++; m++; }
      k = m + 1;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return k + 1; }
    k++;
  }
  return n;
}

/**
 * scanAtomic(text, i, spec) -> end offset of the comment/string lexeme that starts at i, or -1 if unterminated
 * (a single-line string that meets a newline first, or any string that meets end of text first).
 * spec: {open, close|null, escape?, multiline?, trailing?, interp?[], interpQuotes?[], eofOk?}
 *   close === null  a LINE comment: ends before the next "\n".
 */
export function scanAtomic(text, i, spec) {
  const n = text.length;
  let j = i + spec.open.length;
  if (spec.close == null) { const k = text.indexOf("\n", j); return k < 0 ? n : k; }
  const { close, escape: esc, interp: ip } = spec;
  const ml = spec.multiline !== false;
  while (j < n) {
    const ch = text[j];
    if (esc && ch === esc) { j += 2; continue; }
    if (ip && ip.length) {
      let hit = false;
      for (const q of ip) if (text.startsWith(q, j)) { j = skipInterp(text, j + q.length, spec.interpQuotes); hit = true; break; }
      if (hit) continue;
    }
    if (text.startsWith(close, j)) {
      j += close.length;
      if (spec.trailing) while (j < n && contWord(text, j, null)) j++;
      return j;
    }
    if (!ml && ch === "\n") return -1;
    j++;
  }
  return spec.eofOk ? n : -1;
}

// ----------------------------------------------------------------------------------------------------------------
// compiled prior
// ----------------------------------------------------------------------------------------------------------------
const _compiled = new WeakMap();

export function compilePrior(prior) {
  if (_compiled.has(prior)) return _compiled.get(prior);
  const kw = new Map();
  for (const w of prior.words?.keyword ?? []) kw.set(w, "keyword");
  for (const w of prior.words?.literal ?? []) kw.set(w, "literal");
  const wc = prior.wordChars ?? {};
  const byLen = (a, b) => b.open.length - a.open.length;
  const strings = [...(prior.strings ?? [])].sort(byLen);
  const strPrefix = new Set();
  for (const s of strings) for (const p of s.prefixes ?? []) strPrefix.add(p);
  const symbols = new Map(Object.entries(prior.symbols?.table ?? {}));
  let maxLen = 1;
  for (const s of symbols.keys()) if (s.length > maxLen) maxLen = s.length;
  const suffix = new Map();
  for (const s of wc.suffix ?? []) suffix.set(s.c, s.attach ?? { _: 0 });
  const C = {
    prior, kw,
    extra: new Set(wc.extra ?? []),
    prefixes: [...(wc.prefixes ?? [])].sort((a, b) => b.length - a.length),
    suffix,
    comments: [...(prior.comments ?? [])].sort(byLen),
    strings,
    strPrefix,
    cond: [...(prior.conditional ?? [])].map((s) => ({ ...s, kind: s.kind ?? "string", afterTextSet: new Set(s.afterText ?? s.after ?? []), afterClassSet: new Set(s.afterClass ?? []) })).sort(byLen),
    symbols, maxLen,
    numberClass: prior.shape?.number ?? "literal",
    unknownWord: prior.shape?.unknownWord ?? "identifier",
    unknownSymbol: prior.shape?.unknownSymbol ?? "operator",
  };
  _compiled.set(prior, C);
  return C;
}

function suffixBucket(text, k) {
  if (k >= text.length) return "ws";
  const c = text.charCodeAt(k);
  if (c <= 32) return "ws";
  if (A.ID(c)) return "w";
  return text[k];
}

function numberEnd(text, i) {
  const n = text.length;
  let j = i;
  const hex = text[i] === "0" && (text[i + 1] === "x" || text[i + 1] === "X");
  if (text[j] === ".") j++;
  while (j < n) {
    const c = text.charCodeAt(j);
    if (isDigit(c) || isAsciiLetter(c) || c === 95) {
      const last = text[j];
      j++;
      const sign = text[j];
      if ((sign === "+" || sign === "-") && isDigit(text.charCodeAt(j + 1) || 0)) {
        if (last === "p" || last === "P" || ((last === "e" || last === "E") && !hex)) j++;
      }
    } else if (c === 46 && isDigit(text.charCodeAt(j + 1) || 0)) j++;
    else break;
  }
  return j;
}

/**
 * lexCode(text, prior) -> [{start, end, class}]. class in LEX_CLASSES. Whitespace is skipped, never a lexeme.
 * A null/absent prior is a TypeError: the caller must hold a received prior (an unmeasured language says so).
 */
export function lexCode(text, prior) {
  if (!prior) throw new TypeError("lexCode: a CodeLexPrior is required (no prior is a typed gap, not a default)");
  const C = compilePrior(prior);
  const n = text.length;
  const out = [];
  let i = 0;
  let prevS = -1, prevE = -1, prevClass = "";
  const emit = (s, e, cls) => { out.push({ start: s, end: e, class: cls }); prevS = s; prevE = e; prevClass = cls; };
  // the previous lexeme's text as the contexts see it: a string or a comment is blank (as in derivation)
  const prevText = () => (prevS < 0 || prevClass === "string" || prevClass === "comment" ? "" : text.slice(prevS, prevE));

  outer:
  while (i < n) {
    const code = text.charCodeAt(i);
    const ch = text[i];
    if (isSpaceCode(code, ch)) { i++; continue; }

    // 1. comments (received openers)
    for (const cm of C.comments) {
      if (!text.startsWith(cm.open, i)) continue;
      const e = scanAtomic(text, i, { ...cm, eofOk: true });
      emit(i, e, "comment"); i = e;
      continue outer;
    }

    // 2. conditional lexemes: strings or signed numbers that exist only after a previous token the prior names (by text or class):
    //    `<stdio.h>` after #include, a regex after `=`, `-1` after `=`
    if (C.cond.length) {
      const pt = prevText();
      for (const sp of C.cond) {
        if (!text.startsWith(sp.open, i) || !(sp.afterTextSet.has(pt) || sp.afterClassSet.has(prevClass))) continue;
        if (sp.kind === "number") {
          if (!isDigit(text.charCodeAt(i + sp.open.length) || 0)) continue;
          const e = numberEnd(text, i + sp.open.length);
          emit(i, e, sp.class ?? C.numberClass); i = e; continue outer;
        }
        const e = scanAtomic(text, i, sp);
        if (e > i) { emit(i, e, sp.class ?? "string"); i = e; continue outer; }
      }
    }

    // 3. strings: a received opener, or a received prefix word (r, b, f, L, u8) glued to one
    let unterminated = false;
    for (const sp of C.strings) {
      if (!text.startsWith(sp.open, i)) continue;
      const e = scanAtomic(text, i, sp);
      if (e > i) { emit(i, e, sp.class ?? "string"); i = e; continue outer; }
      unterminated = true;
    }
    if (!unterminated && C.strPrefix.size && isAsciiLetter(code)) {
      let j = i + 1;
      while (j < n && (isAsciiLetter(text.charCodeAt(j)) || isDigit(text.charCodeAt(j)))) j++;
      const w = text.slice(i, j);
      if (j - i <= 3 && C.strPrefix.has(w)) {
        for (const sp of C.strings) {
          if (!(sp.prefixes ?? []).includes(w) || !text.startsWith(sp.open, j)) continue;
          const e = scanAtomic(text, j, sp);
          if (e > j) { emit(i, e, sp.class ?? "string"); i = e; continue outer; }
        }
      }
    }

    // 4. numbers (pp-number, declared general shape)
    if (isDigit(code) || (code === 46 && isDigit(text.charCodeAt(i + 1) || 0) && !(i > 0 && (contWord(text, i - 1, C) || text[i - 1] === ")" || text[i - 1] === "]")))) {
      const e = numberEnd(text, i);
      emit(i, e, C.numberClass); i = e;
      continue;
    }

    // 5. words: [prefix] start cont* [suffix]
    {
      let j = i;
      let ok = false;
      if (startsWord(text, i, C)) ok = true;
      else {
        for (const p of C.prefixes) {
          if (text.startsWith(p, i) && i + p.length < n && startsWord(text, i + p.length, C)) { j = i + p.length; ok = true; break; }
        }
      }
      if (ok) {
        j += 1;
        // surrogate pair start
        if (text.charCodeAt(j - 1) >= 0xd800 && text.charCodeAt(j - 1) <= 0xdbff) j++;
        while (j < n && contWord(text, j, C)) j += (text.charCodeAt(j) >= 0xd800 && text.charCodeAt(j) <= 0xdbff) ? 2 : 1;
        const sf = C.suffix.size ? C.suffix.get(text[j]) : undefined;
        if (sf) {
          const b = suffixBucket(text, j + 1);
          const p = sf[b] ?? sf._ ?? 0;
          if (p >= 0.5) j++;
        }
        const w = text.slice(i, j);
        emit(i, j, C.kw.get(w) ?? C.unknownWord);
        i = j;
        continue;
      }
    }

    // 6. symbols: longest attested match (the munch table), else one code point
    {
      let len = 0;
      for (let L = Math.min(C.maxLen, n - i); L >= 2; L--) {
        if (C.symbols.has(text.substr(i, L))) { len = L; break; }
      }
      if (!len) len = cpAt(text, i).w;
      const s = text.substr(i, len);
      emit(i, i + len, C.symbols.get(s) ?? C.unknownSymbol);
      i += len;
    }
  }
  return out;
}

/** classOfSurface: the class a whitespace-delimited chunk gets from the lexicon and shape alone (no scanning). */
function classOfSurface(s, C) {
  const k = C.kw.get(s);
  if (k) return k;
  const c0 = s.charCodeAt(0);
  if (isDigit(c0)) return C.numberClass;
  if (C.symbols.has(s)) return C.symbols.get(s);
  if (startsWord(s, 0, C)) return C.unknownWord;
  return C.unknownSymbol;
}

/** whitespaceSplit(text, prior) -> the baseline control: maximal non-whitespace runs, classed by lexicon and shape only. */
export function whitespaceSplit(text, prior) {
  const C = compilePrior(prior);
  const out = [];
  const re = /\S+/gu;
  let m;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length, class: classOfSurface(m[0], C) });
  return out;
}

// ----------------------------------------------------------------------------------------------------------------
// identifiers: sub-word seams
// ----------------------------------------------------------------------------------------------------------------
const SEAM = /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+|\p{Lu}+|\p{N}+|\p{L}+/gu;

/** splitIdentifier(name) -> pieces, in order. snake_case, kebab-case, camelCase, PascalCase, HTTPServer, parseXML2, digits.
 *  Casing is read ONLY to find the seam; the pieces keep their original case. Separators (_ - $ . @ ...) are dropped. */
export function splitIdentifier(name) {
  return String(name).match(SEAM) ?? [];
}

// ----------------------------------------------------------------------------------------------------------------
// controls over a prior (pure, seeded)
// ----------------------------------------------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { mulberry32 };

/**
 * derangeKeywords(prior, seed) -> a copy of the prior whose keyword and literal word sets are DERANGED: every keyword or
 * literal word swaps its class with a distinct identifier-class word of similar TRAIN frequency (nearest by log count,
 * seeded tie-breaks), so the set sizes and the frequency profile are kept and no keyword/literal keeps its class.
 */
export function derangeKeywords(prior, seed = 1) {
  const rnd = mulberry32(seed);
  const counts = prior.words?.counts ?? {};
  const special = [
    ...(prior.words?.keyword ?? []).map((w) => [w, "keyword"]),
    ...(prior.words?.literal ?? []).map((w) => [w, "literal"]),
  ];
  const specialSet = new Set(special.map(([w]) => w));
  const poolWords = (prior.words?.identifierSample ?? []).filter((w) => !specialSet.has(w));
  const used = new Set();
  const newKw = [], newLit = [];
  // process the most frequent specials first so the closest identifier-frequency match goes to the most frequent word
  const order = special.map(([w, c]) => ({ w, c, n: counts[w] ?? 1 })).sort((a, b) => b.n - a.n || (a.w < b.w ? -1 : 1));
  for (const it of order) {
    let best = null, bestD = Infinity;
    for (const w of poolWords) {
      if (used.has(w)) continue;
      const d = Math.abs(Math.log((counts[w] ?? 1)) - Math.log(it.n)) + rnd() * 1e-6;
      if (d < bestD) { bestD = d; best = w; }
    }
    if (best == null) continue;
    used.add(best);
    (it.c === "keyword" ? newKw : newLit).push(best);
  }
  const copy = JSON.parse(JSON.stringify(prior));
  copy.words = { ...copy.words, keyword: newKw, literal: newLit };
  copy.provenance = { ...copy.provenance, control: `deranged keyword set (seed ${seed})` };
  return copy;
}

/** withoutDelimiters(prior) -> the prior with no comment/string/conditional delimiters: the delimiter-ablation control. */
export function withoutDelimiters(prior) {
  const copy = JSON.parse(JSON.stringify(prior));
  copy.comments = []; copy.strings = []; copy.conditional = [];
  copy.provenance = { ...copy.provenance, control: "delimiter prior removed" };
  return copy;
}

/** withoutKnowledge(prior) -> the EMPTY prior: no words, no word chars, no delimiters, no symbol table (every symbol is one
 *  character). The prior-free control: what the scanner's own shape rules (words, pp-numbers, single symbols) give alone. */
export function withoutKnowledge(prior) {
  const copy = JSON.parse(JSON.stringify(prior));
  copy.words = { keyword: [], literal: [], counts: {}, identifierSample: [] };
  copy.wordChars = { extra: [], prefixes: [], suffix: [] };
  copy.comments = []; copy.strings = []; copy.conditional = [];
  copy.symbols = { table: {}, maxLen: 1 };
  copy.provenance = { ...copy.provenance, control: "empty prior (scanner shape rules only)" };
  return copy;
}

// ----------------------------------------------------------------------------------------------------------------
// deriving a prior from gold (TRAIN only; the caller passes only TRAIN docs)
// ----------------------------------------------------------------------------------------------------------------
const foldClass = (c) => (c === "type" ? "identifier" : c);
const ATOMIC = new Set(["comment", "string"]);
const WORDISH = new Set(["keyword", "identifier", "literal", "type"]);

function bump(map, key, by = 1) { map.set(key, (map.get(key) ?? 0) + by); }
function majority(map) {
  let best = null, bn = -1, tot = 0;
  for (const [k, v] of map) { tot += v; if (v > bn || (v === bn && k < best)) { best = k; bn = v; } }
  return { key: best, n: bn, total: tot };
}
function hasLetter(s) { return RE_LETTER.test(s); }

/** prefix extension: grow `p` while >= `share` of the texts that start with p continue with the same next char */
function extendPrefix(texts, p, share) {
  for (;;) {
    const next = new Map();
    let tot = 0;
    for (const t of texts) { if (t.startsWith(p)) { tot++; if (t.length > p.length) bump(next, t[p.length]); } }
    if (!tot || !next.size) return p;
    const m = majority(next);
    if (/\s/.test(m.key)) return p; // an opener never swallows whitespace (a `# ` opener would miss `#comment`)
    if (m.n / tot >= share) p += m.key; else return p;
    if (p.length >= 12) return p;
  }
}

/** candidate closers: for each suffix length 1..8, the most common suffix among tokens (token must be longer than open+k) */
function suffixCandidates(texts, openLen) {
  const out = new Set();
  for (let k = 1; k <= 8; k++) {
    const m = new Map();
    for (const t of texts) if (t.length >= openLen + k) bump(m, t.slice(-k));
    if (m.size) out.add(majority(m).key);
  }
  return [...out];
}

function simRate(docs, toks, spec) {
  // toks: [{di, s, e}] -> share whose scanned end equals the gold end
  let ok = 0;
  for (const t of toks) {
    const e = scanAtomic(docs[t.di].text, t.s, spec);
    if (e === t.e) ok++;
  }
  return toks.length ? ok / toks.length : 0;
}

/** the tokens a spec is simulated on: an evenly spaced D.SAMPLE of all, plus up to D.SAMPLE of those that exercise the variants
 *  (a backslash, a brace, a newline inside the token): deterministic, content-blind apart from that, never the first-N of the first files. */
function pickSample(toks) {
  if (toks.length <= DERIVE.SAMPLE) return toks;
  const stride = toks.length / DERIVE.SAMPLE;
  const picked = new Set();
  for (let k = 0; k < DERIVE.SAMPLE; k++) picked.add(Math.floor(k * stride));
  let extra = 0;
  for (let k = 0; k < toks.length && extra < DERIVE.SAMPLE; k++) {
    if (picked.has(k)) continue;
    const t = toks[k].txt;
    if (t !== undefined && (t.includes("\\") || t.includes("{") || t.includes("\n"))) { picked.add(k); extra++; }
  }
  return [...picked].sort((a, b) => a - b).map((k) => toks[k]);
}

/**
 * deriveLexPrior(docs, meta) -> CodeLexPrior@1
 *   docs: [{ repo, text, tokens:[{start,end,class,...}] }]  gold from the tree-sitter extractor, TRAIN files only.
 *   meta: { language, grammar, giver, goldVersion, trainRepos:[{repo,commit?,license?}], trainFiles:[{rel,sha256,repo,bytes}], builder }
 */
export function deriveLexPrior(docs, meta = {}) {
  const D = DERIVE;
  const nRepos = new Set(docs.map((d) => d.repo)).size;
  const minRepos = Math.min(D.MIN_WORD_REPOS, nRepos);

  // ---- pass 1: lexicon, symbols, class shares, digit-initial class ------------------------------------------------
  const wordCls = new Map();   // word -> Map(class -> n)
  const wordRepos = new Map(); // word -> Set(repo)
  const symCls = new Map();    // symbol -> Map(class -> n)
  const share = new Map();
  const numberCls = new Map();
  let nTokens = 0;
  const all1 = new Map(), all2 = new Map(); // gold tokens (any class) by first 1 / 2 chars
  for (const d of docs) {
    for (const t of d.tokens) {
      const txt = d.text.slice(t.start, t.end);
      nTokens++;
      const c = foldClass(t.class);
      if (c !== "other") bump(share, c);
      bump(all1, txt.slice(0, 1)); bump(all2, txt.slice(0, 2));
      if (ATOMIC.has(t.class) || t.class === "other") continue;
      if (/\s/.test(txt)) continue;
      if (WORDISH.has(t.class) || t.class === "literal") {
        if (isDigit(txt.charCodeAt(0))) { bump(numberCls, c); continue; }
        if (hasLetter(txt)) {
          if (!wordCls.has(txt)) { wordCls.set(txt, new Map()); wordRepos.set(txt, new Set()); }
          bump(wordCls.get(txt), c); wordRepos.get(txt).add(d.repo);
        }
      } else if (t.class === "operator" || t.class === "punctuation") {
        if (!symCls.has(txt)) symCls.set(txt, new Map());
        bump(symCls.get(txt), t.class);
      }
    }
  }
  const keyword = [], literal = [], counts = {}, identCand = [];
  for (const [w, m] of wordCls) {
    const mj = majority(m);
    const total = mj.total;
    const repos = wordRepos.get(w).size;
    if ((mj.key === "keyword" || mj.key === "literal") && total >= D.MIN_WORD_COUNT && repos >= minRepos && mj.n / total >= 0.5) {
      (mj.key === "keyword" ? keyword : literal).push(w);
      counts[w] = total;
    } else if (mj.key === "identifier" && total >= 2) identCand.push([w, total]);
  }
  keyword.sort(); literal.sort();
  identCand.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const nSample = Math.max(D.IDENT_SAMPLE_MIN, 4 * (keyword.length + literal.length));
  const identifierSample = identCand.slice(0, nSample).map(([w, n]) => { counts[w] = n; return w; });

  // symbols: every gold operator/punctuation token, plus symbol-only tokens the grammar leaves unclassed ("other": `?.`, `...`),
  // then the MUNCH filter under LONGEST-MATCH: at each gold symbol token the lexer would take the longest attested symbol that
  // matches there; a multi-character symbol is kept iff that choice equals the gold token at least MUNCH_PRECISION of the time.
  // Iterated (a removed symbol changes what the longest match is) until stable.
  const SYMONLY = /^[^\p{L}\p{N}_\s"'`]+$/u;
  const symTable = {};
  for (const [s, m] of symCls) symTable[s] = majority(m).key;
  for (const d of docs) for (const t of d.tokens) {
    if (t.class !== "other") continue;
    const txt = d.text.slice(t.start, t.end);
    if (txt.length <= 6 && SYMONLY.test(txt) && !(txt in symTable)) symTable[txt] = "operator";
  }
  const isSymTok = (d, t) => t.class === "operator" || t.class === "punctuation" || (t.class === "other" && SYMONLY.test(d.text.slice(t.start, t.end)) && t.end - t.start <= 6);
  let symbols = { ...symTable };
  for (let iter = 0; iter < 6; iter++) {
    let maxSym = 1;
    for (const k of Object.keys(symbols)) if (k.length > maxSym) maxSym = Math.min(k.length, 6);
    const tries = new Map(), hits = new Map();
    for (const d of docs) for (const t of d.tokens) {
      if (!isSymTok(d, t)) continue;
      const txt = d.text.slice(t.start, t.end);
      for (let L = maxSym; L >= 2; L--) {
        const sub = d.text.substr(t.start, L);
        if (sub in symbols) { bump(tries, sub); if (sub === txt) bump(hits, sub); break; }
      }
    }
    const drop = [];
    for (const k of Object.keys(symbols)) {
      if (k.length === 1) continue;
      const tr = tries.get(k) ?? 0;
      if (k.length > 6 || (tr >= 2 && (hits.get(k) ?? 0) / tr < D.MUNCH_PRECISION)) drop.push(k);
    }
    if (!drop.length) break;
    for (const k of drop) delete symbols[k];
  }
  let symMax = 1;
  for (const k of Object.keys(symbols)) if (k.length > symMax) symMax = k.length;

  // ---- comments -----------------------------------------------------------------------------------------------------
  const comTok = []; // {di, s, e, txt}
  docs.forEach((d, di) => d.tokens.forEach((t) => { if (t.class === "comment") comTok.push({ di, s: t.start, e: t.end, txt: d.text.slice(t.start, t.end) }); }));
  const openers = [];
  const by1 = new Map();
  for (const t of comTok) { const k = t.txt.slice(0, 1); if (!by1.has(k)) by1.set(k, []); by1.get(k).push(t); }
  for (const [c1, g1] of by1) {
    if (g1.length < D.OPENER_MIN_COUNT) continue;
    if (g1.length / (all1.get(c1) ?? Infinity) >= D.OPENER1_PRECISION && g1.length >= 20 && !(c1 in symTable)) {
      openers.push(c1); // already unambiguous alone (precision >= OPENER1_PRECISION): no extension, so `#comment` and `# comment` both open
      continue;
    }
    const by2 = new Map();
    for (const t of g1) { const k = t.txt.slice(0, 2); if (k.length === 2) { if (!by2.has(k)) by2.set(k, []); by2.get(k).push(t); } }
    for (const [c2, g2] of by2) {
      if (g2.length >= D.OPENER_MIN_COUNT && g2.length / (all2.get(c2) ?? Infinity) >= D.OPENER2_PRECISION) {
        openers.push(extendPrefix(g2.map((t) => t.txt), c2, D.LCP_SHARE));
      }
    }
  }
  const openerSet = [...new Set(openers)].filter((p) => !openers.some((q) => q !== p && p.startsWith(q))).sort();
  const comments = [];
  for (const op of openerSet) {
    const grp = comTok.filter((t) => t.txt.startsWith(op) && !openerSet.some((q) => q !== op && q.length > op.length && t.txt.startsWith(q)));
    if (grp.length < D.OPENER_MIN_COUNT) continue;
    const sample = pickSample(grp);
    const cands = [null, ...suffixCandidates(grp.map((t) => t.txt), op.length)];
    let best = null, bestRate = -1;
    for (const q of cands) {
      const spec = { open: op, close: q, eofOk: true };
      const r = simRate(docs, sample, spec);
      if (r > bestRate + 1e-9) { bestRate = r; best = q; }
    }
    if (bestRate >= D.MATCH_MIN) comments.push({ open: op, close: best, matchRate: +bestRate.toFixed(4), n: grp.length });
  }

  // ---- strings ------------------------------------------------------------------------------------------------------
  const strTok = [];
  docs.forEach((d, di) => d.tokens.forEach((t) => { if (t.class === "string") strTok.push({ di, s: t.start, e: t.end, txt: d.text.slice(t.start, t.end), prev: null }); }));
  // symmetric quote form: [A-Za-z]{0,3} then a delimiter char c (or ccc) and the token closes with the same c (or ccc)
  const symGroups = new Map(); // open -> {toks:[{...,pre}], prefixes: Map}
  const leftover = [];
  for (const t of strTok) {
    const m = /^((?:[A-Za-z][A-Za-z0-9]{0,2})?)([^\sA-Za-z0-9_])/u.exec(t.txt);
    let form = null;
    if (m) {
      const pre = m[1], c = m[2];
      const body = t.txt.slice(pre.length);
      let open = c;
      if (body.startsWith(c + c + c) && body.endsWith(c + c + c) && body.length >= 6) open = c + c + c;
      if (body.length >= 2 * open.length && body.endsWith(open) && (open.length === 3 || body.length >= 2)) form = { open, pre };
    }
    if (form && (all1.get(form.open[0]) ?? 0) > 0) {
      if (!symGroups.has(form.open)) symGroups.set(form.open, { toks: [], prefixes: new Map() });
      const g = symGroups.get(form.open);
      g.toks.push({ ...t, s: t.s + form.pre.length, pre: form.pre });
      if (form.pre) bump(g.prefixes, form.pre);
    } else leftover.push(t);
  }
  // delimiter precision: share of ALL gold tokens starting with the delimiter char that are strings of this form
  const startCount = new Map();
  for (const t of strTok) { if (!/^[A-Za-z0-9_\s]/u.test(t.txt)) bump(startCount, t.txt[0]); }
  const strings = [];
  const quoteChars = [];
  const specsPre = [];
  for (const [open, g] of [...symGroups].sort((a, b) => b[1].toks.length - a[1].toks.length)) {
    const c = open[0];
    // precision of the DELIMITER: of all gold tokens that start with c, the share that are strings (so `/` never qualifies)
    const allStarting = all1.get(c) ?? 0;
    const precision = allStarting ? (startCount.get(c) ?? 0) / allStarting : 0;
    if (g.toks.length < D.STRING_MIN_COUNT || precision < D.STRING_OPEN_PRECISION) {
      for (const t of g.toks) leftover.push({ ...t, s: t.s - t.pre.length });
      continue;
    }
    specsPre.push({ open, g });
    if (!quoteChars.includes(c)) quoteChars.push(c);
  }
  for (const { open, g } of specsPre) {
    const sample = pickSample(g.toks);
    // interpolation candidates: X{ sequences inside the strings of this opener
    const ipCount = new Map();
    for (const t of g.toks) {
      const body = t.txt.slice(t.pre.length);
      const seen = new Set();
      for (let k = 1; k < body.length - 1; k++) if (body[k] === "{" && /[^\sA-Za-z0-9_{}]/.test(body[k - 1])) seen.add(body[k - 1] + "{");
      for (const q of seen) bump(ipCount, q);
    }
    const ipCands = [...ipCount].filter(([, v]) => v >= D.INTERP_MIN_COUNT && v / g.toks.length >= D.INTERP_MIN_SHARE).map(([k]) => k).sort();
    let best = null, bestRate = -1, bestCost = 99;
    for (const esc of [null, "\\"]) for (const ml of [false, true]) for (const tr of [false, true]) for (const ip of (ipCands.length ? [[], ipCands] : [[]])) {
      const spec = { open, close: open, escape: esc, multiline: ml, trailing: tr, interp: ip, interpQuotes: quoteChars };
      const r = simRate(docs, sample, spec);
      const cost = (esc ? 1 : 0) + (ml ? 1 : 0) + (tr ? 1 : 0) + ip.length;
      if (r > bestRate + 1e-9 || (Math.abs(r - bestRate) <= 1e-9 && cost < bestCost)) { bestRate = r; best = spec; bestCost = cost; }
    }
    if (bestRate >= D.MATCH_MIN) {
      const prefixes = [...g.prefixes].filter(([, v]) => v >= D.STRPREFIX_MIN_COUNT).map(([k]) => k).sort();
      const s = { open, close: open, escape: best.escape, multiline: best.multiline, trailing: best.trailing, interp: best.interp,
        interpQuotes: best.interp.length ? quoteChars : [], prefixes, class: "string", matchRate: +bestRate.toFixed(4), n: g.toks.length };
      strings.push(s);
    } else for (const t of g.toks) leftover.push({ ...t, s: t.s - t.pre.length });
  }

  // ---- conditional lexemes: strings (a regex after `=`, `<..>` after #include) and signed numbers (`-1` after `=`) -------------
  // Context = the previous gold token: its exact text (key t:<text>, short tokens only) or its folded class (key c:<class>).
  // A (opener char, context key) pair is admitted iff, over ALL gold tokens that start with the opener in that context (for a
  // number: followed by a digit), the grammar emits the conditional lexeme at least COND_PRECISION of the time, >= COND_MIN_COUNT times.
  const conditional = [];
  {
    const prevOf = (d) => { let prevText = "", prevClass = ""; return { next(t) { const r = [prevText, prevClass]; const txt = d.text.slice(t.start, t.end); prevText = (t.class === "string" || t.class === "comment") ? "" : txt; prevClass = foldClass(t.class); return r; } }; };
    const ctxKeys = (pt, pc) => { const k = []; if (pt && pt.length <= 12) k.push("t:" + pt); if (pc) k.push("c:" + pc); return k; };
    const isSigned = (txt) => /^[+-][0-9]/.test(txt);
    const leftSet = new Set(leftover.map((t) => `${t.di}:${t.s}`));
    const groups = new Map(); // `${kind}\u0000${open}` -> {kind, open, num:Map, den:Map}
    const gget = (kind, open) => { const k = kind + "\u0000" + open; if (!groups.has(k)) groups.set(k, { kind, open, num: new Map(), den: new Map(), toks: [] }); return groups.get(k); };
    const stringOpeners = new Set(), numberOpeners = new Set();
    for (const t of leftover) if (t.txt.length) stringOpeners.add(t.txt[0]);
    docs.forEach((d) => d.tokens.forEach((t) => { if (t.class === "literal") { const x = d.text.slice(t.start, t.end); if (isSigned(x)) numberOpeners.add(x[0]); } }));
    const strFloor = new Map();
    for (const t of leftover) bump(strFloor, t.txt[0]);
    for (const o of [...stringOpeners]) if ((strFloor.get(o) ?? 0) < D.COND_MIN_COUNT) stringOpeners.delete(o);
    docs.forEach((d, di) => {
      const pv = prevOf(d);
      for (const t of d.tokens) {
        const [pt, pc] = pv.next(t);
        const c0 = d.text[t.start];
        const keys = ctxKeys(pt, pc);
        if (stringOpeners.has(c0)) {
          const g = gget("string", c0);
          const member = t.class === "string" && leftSet.has(`${di}:${t.start}`);
          for (const k of keys) { bump(g.den, k); if (member) bump(g.num, k); }
          if (member) g.toks.push({ di, s: t.start, e: t.end, txt: d.text.slice(t.start, t.end), keys });
        }
        if (numberOpeners.has(c0) && isDigit(d.text.charCodeAt(t.start + 1) || 0)) {
          const g = gget("number", c0);
          const member = t.class === "literal" && isSigned(d.text.slice(t.start, t.end));
          for (const k of keys) { bump(g.den, k); if (member) bump(g.num, k); }
          if (member) g.toks.push({ di, s: t.start, e: t.end, txt: d.text.slice(t.start, t.end), keys });
        }
      }
    });
    for (const g of groups.values()) {
      const adm = new Set();
      for (const [k, nn] of g.num) if (nn >= D.COND_MIN_COUNT && nn / g.den.get(k) >= D.COND_PRECISION) adm.add(k);
      if (!adm.size) continue;
      const toks = g.toks.filter((t) => t.keys.some((k) => adm.has(k)));
      if (toks.length < D.COND_MIN_COUNT) continue;
      const afterText = [...adm].filter((k) => k.startsWith("t:")).map((k) => k.slice(2)).sort();
      const afterClass = [...adm].filter((k) => k.startsWith("c:")).map((k) => k.slice(2)).sort();
      const sample = pickSample(toks);
      if (g.kind === "number") {
        let ok = 0;
        for (const t of sample) { if (docs[t.di].text.startsWith(g.open, t.s) && numberEnd(docs[t.di].text, t.s + 1) === t.e) ok++; }
        const rate = sample.length ? ok / sample.length : 0;
        if (rate >= D.MATCH_MIN) conditional.push({ kind: "number", open: g.open, class: majority(numberCls).key ?? "literal", afterText, afterClass, matchRate: +rate.toFixed(4), n: toks.length });
        continue;
      }
      const closers = [...new Set([g.open, ...suffixCandidates(toks.map((t) => t.txt), 1)])];
      let best = null, bestRate = -1, bestCost = 99;
      for (const q of closers) for (const esc of [null, "\\"]) for (const tr of [false, true]) {
        const spec = { open: g.open, close: q, escape: esc, multiline: false, trailing: tr };
        const r = simRate(docs, sample, spec);
        const cost = (esc ? 1 : 0) + (tr ? 1 : 0) + (q === g.open ? 0 : 1);
        if (r > bestRate + 1e-9 || (Math.abs(r - bestRate) <= 1e-9 && cost < bestCost)) { bestRate = r; best = spec; bestCost = cost; }
      }
      if (bestRate >= D.MATCH_MIN) conditional.push({ kind: "string", open: g.open, close: best.close, escape: best.escape, multiline: false, trailing: best.trailing, class: "string", afterText, afterClass, matchRate: +bestRate.toFixed(4), n: toks.length });
    }
  }

  // ---- word characters: extras, prefixes, suffixes -----------------------------------------------------------------
  const wordTok = [];
  for (const d of docs) for (const t of d.tokens) {
    if (!(WORDISH.has(t.class))) continue;
    const txt = d.text.slice(t.start, t.end);
    if (txt.length < 2 || /\s/.test(txt) || isDigit(txt.charCodeAt(0))) continue;
    wordTok.push(txt);
  }
  const wordCount = new Map(), otherCount = new Map();
  for (const txt of wordTok) {
    const seen = new Set();
    for (let k = 0; k < txt.length - 1; k++) { const c = txt[k]; if (c.charCodeAt(0) < 128 && !A.ID(c.charCodeAt(0))) seen.add(c); }
    for (const c of seen) bump(wordCount, c);
  }
  for (const d of docs) for (const t of d.tokens) {
    if (ATOMIC.has(t.class) || t.class === "other" || WORDISH.has(t.class)) continue;
    const txt = d.text.slice(t.start, t.end);
    if (txt.length < 2) continue;
    const seen = new Set();
    for (const c of txt) if (c.charCodeAt(0) < 128 && !A.ID(c.charCodeAt(0))) seen.add(c);
    for (const c of seen) bump(otherCount, c);
  }
  const extra = [];
  for (const [c, wn] of wordCount) {
    if (wn >= D.EXTRA_MIN_COUNT && wn / (wn + (otherCount.get(c) ?? 0)) >= D.EXTRA_PRECISION) extra.push(c);
  }
  extra.sort();
  const extraSet = new Set(extra);
  const compShape = { extra: extraSet };
  // prefixes: leading non-word run (1..2 chars) of word tokens whose first char is not an extra
  const preNum = new Map();
  for (const txt of wordTok) {
    if (extraSet.has(txt[0])) continue;
    if (txt.charCodeAt(0) < 128 && !A.ID(txt.charCodeAt(0))) {
      for (let L = 1; L <= 2; L++) {
        const p = txt.slice(0, L);
        if (p.length === L && txt.length > L && startsWord(txt, L, compShape) && [...p].every((ch) => ch.charCodeAt(0) < 128 && !A.ID(ch.charCodeAt(0)))) { bump(preNum, p); break; }
      }
    }
  }
  const preCands = [...preNum].filter(([, v]) => v >= D.PREFIX_MIN_COUNT).map(([k]) => k);
  const prefixes = [];
  if (preCands.length) {
    const den = new Map(), num = new Map();
    for (const d of docs) for (const t of d.tokens) {
      if (ATOMIC.has(t.class) || t.class === "other") continue;
      for (const p of preCands) {
        if (d.text.startsWith(p, t.start) && startsWord(d.text, t.start + p.length, compShape)) {
          bump(den, p);
          const len = t.end - t.start;
          if (len > p.length && startsWord(d.text, t.start + p.length, compShape)) bump(num, p);
        }
      }
    }
    for (const p of preCands) if ((num.get(p) ?? 0) / (den.get(p) ?? Infinity) >= D.PREFIX_ATTACH) prefixes.push(p);
    prefixes.sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  }
  // suffixes: ASCII punctuation chars that end >= SUFFIX_MIN_COUNT grammar words; attach probability per next-char bucket
  const sufCount = new Map();
  for (const txt of wordTok) { const c = txt[txt.length - 1]; if (c.charCodeAt(0) < 128 && !A.ID(c.charCodeAt(0)) && !extraSet.has(c)) bump(sufCount, c); }
  const suffix = [];
  for (const [c, nn] of sufCount) {
    if (nn < D.SUFFIX_MIN_COUNT) continue;
    const den = new Map(), num = new Map();
    for (const d of docs) for (const t of d.tokens) {
      if (ATOMIC.has(t.class) || t.class === "other") continue;
      let j = t.start;
      if (!startsWord(d.text, j, compShape)) continue;
      j++;
      while (j < d.text.length && contWord(d.text, j, compShape)) j++;
      if (d.text[j] !== c) continue;
      if (t.end !== j && t.end !== j + 1) continue;
      const b = suffixBucket(d.text, j + 1);
      bump(den, b); bump(den, "_");
      if (t.end === j + 1) { bump(num, b); bump(num, "_"); }
    }
    const attach = {};
    attach._ = +(((num.get("_") ?? 0) / (den.get("_") ?? Infinity)) || 0).toFixed(4);
    for (const [b, dn] of den) if (b !== "_" && dn >= 10) attach[b] = +((num.get(b) ?? 0) / dn).toFixed(4);
    if (attach._ >= D.SUFFIX_ATTACH || Object.values(attach).some((v) => v >= D.SUFFIX_ATTACH)) suffix.push({ c, attach });
  }

  // a symbol that contains a string delimiter or a comment opener is not a symbol: lexing it would swallow the delimiter and put
  // every later quote out of step (the Ruby grammar's `:"` token that opens a quoted symbol did exactly that on DEV: amendment A7)
  for (const k of Object.keys(symbols)) {
    if (k.length < 2) continue;
    if ([...k].some((c) => quoteChars.includes(c)) || comments.some((cm) => k.includes(cm.open))) delete symbols[k];
  }
  symMax = 1;
  for (const k of Object.keys(symbols)) if (k.length > symMax) symMax = k.length;

  const total = [...share.values()].reduce((a, b) => a + b, 0) || 1;
  const classShare = {};
  for (const [k, v] of share) classShare[k] = +(v / total).toFixed(5);

  return {
    schema: LEX_SCHEMA,
    language: meta.language ?? null,
    grammar: meta.grammar ?? null,
    provenance: {
      giver: meta.giver ?? "tree-sitter grammar read through eval/coding-competence/gold.mjs",
      goldVersion: meta.goldVersion ?? null,
      trainRepos: meta.trainRepos ?? [],
      trainFiles: meta.trainFiles ?? [],
      trainTokens: nTokens,
      builder: meta.builder ?? "eval/coding-competence/build-lex-prior.mjs",
      derive: { ...D },
      note: "Derived from TRAIN gold only (split by repository). Every threshold is in provenance.derive. A prior nominates and refuses; it never admits an identity.",
    },
    words: { keyword, literal, counts, identifierSample },
    wordChars: { extra, prefixes, suffix },
    shape: { number: majority(numberCls).key ?? "literal", unknownWord: "identifier", unknownSymbol: "operator" },
    comments, strings, conditional,
    symbols: { table: symbols, maxLen: symMax },
    classShare,
  };
}

// ----------------------------------------------------------------------------------------------------------------
// loading (read once, null when absent: an unmeasured language says so)
// ----------------------------------------------------------------------------------------------------------------
const FILE_OF = Object.freeze({ python: "python", py: "python", javascript: "javascript", js: "javascript", c: "c", go: "go", golang: "go", ruby: "ruby", rb: "ruby", java: "java" });
const _loaded = new Map();
export function lexPriorFile(language) {
  const lang = FILE_OF[String(language ?? "").toLowerCase()] ?? String(language ?? "").toLowerCase().replace(/[^a-z0-9_+-]/g, "");
  return new URL(`../../priors/code-lex-${lang}.json`, import.meta.url);
}
export function loadCodeLexPrior(language) {
  const f = lexPriorFile(language);
  const key = f.href;
  if (!_loaded.has(key)) {
    let prior = null;
    try { prior = JSON.parse(fs.readFileSync(f, "utf8")); if (prior?.schema !== LEX_SCHEMA) prior = null; } catch { prior = null; }
    _loaded.set(key, prior);
  }
  return _loaded.get(key);
}
