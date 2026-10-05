// edges.js: read the EDGES a source file ORDERS (calls, imports, inheritance) from its text, causally, in file order.
//
// Lovelace's law: the engine has no pretensions to originate anything, it does what it is ordered to perform. A
// call, an import and a `class A(B)` are not guesses about intent: they are orders the text states in the language's
// own declaration / invocation syntax. This module recovers exactly those orders and nothing else.
//
//   readEdges({ text, language, fileName, keywords = null, final = true })
//     -> { language, calls:[{caller,callee,at,end}], imports:[{module,at,end}], extends:[{child,base,relation,at,end}],
//          declared:[{name,kind,at}], consumed, disclosure }
//
// CAUSAL. One left-to-right pass over a token stream; every decision uses the tokens seen so far plus a bounded local
// lookahead of a few tokens (the `(` after a callee, the `{` after a parameter list, the terminator of an import).
// `end` is the offset where the evidence for an edge completes; `consumed` is the offset up to which tokens were
// consumed. With final:false the end of the text is NOT a statement terminator and the last token is dropped as
// possibly truncated, so readEdges(prefix, final:false) is a prefix-monotone view of readEdges(whole): the C4
// instrument audits that (eval/coding-competence/c4-edges.mjs, causalityAudit).
//
// PRIORS REFUSE, NEVER ADMIT. `keywords` is a Set of the language's HARD keywords from a received giver
// (CodeKeywordPrior@1: priors/code-kw-<code>.json, or a LanguageLawPrior@1 projection the caller names). A bare
// keyword can never be a callee: `if (x)`, `while (x)`, `return (x)` are refused as calls. The prior nominates
// nothing; with keywords = null the reader admits those shapes (the ablation arm) and says so in `disclosure`.
// A keyword AFTER a member access (`x.default()`, `promise.catch()`) is a method name, not a keyword, and is never
// refused. The structural keywords a parser needs to track scope (def, class, function, func, end, import ...) are
// part of the per-language RECIPE below (giver: the language reference), not of the prior.
//
// WHAT IT DOES NOT DO. No semantic resolution (which definition does this callee name?), no type information, no
// macro expansion, no dynamic dispatch; `new X()` is an instantiation, not a call (the C4 gold agrees). It is a
// lexer plus a scope stack, not a parser: it is measured against a parser (tree-sitter) by C4, never assumed.
//
// CASING IS ONE WITNESS, NEVER IDENTITY. Capitalisation is used only where a language's own syntax defines it
// (Ruby: a method name starts lowercase, a constant uppercase, which is the language law that separates `Foo.bar`
// from `Foo(1)`); no name is granted identity by letter-casing.
import fs from "node:fs";

export const EDGES_VERSION = "edges-1";

const LANG_ALIAS = { py: "python", js: "javascript", rb: "ruby", golang: "go" };
const CODE = { python: ["py", "python"], javascript: ["js", "javascript"], ruby: ["rb", "ruby"], c: ["c"], go: ["go"], java: ["java"] };
export function edgeLanguages() { return ["python", "javascript", "c", "go", "ruby", "java"]; }
export function resolveLanguage(language, fileName = "") {
  const l = LANG_ALIAS[String(language ?? "").toLowerCase()] ?? String(language ?? "").toLowerCase();
  if (edgeLanguages().includes(l)) return l;
  const ext = /\.([A-Za-z0-9]+)$/.exec(fileName ?? "")?.[1]?.toLowerCase();
  return { py: "python", js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript", rb: "ruby", c: "c", h: "c", go: "go", java: "java" }[ext] ?? null;
}

// ── received keyword priors (any language; vendored CodeKeywordPrior@1 file if it exists, else null = typed gap) ──
const _kw = new Map();
export function keywordsFor(language) {
  const lang = resolveLanguage(language);
  if (!lang) return null;
  if (_kw.has(lang)) return _kw.get(lang);
  let out = null;
  for (const code of CODE[lang]) {
    try {
      const p = JSON.parse(fs.readFileSync(new URL(`../../priors/code-kw-${code}.json`, import.meta.url), "utf8"));
      if (p?.schema === "CodeKeywordPrior@1" && p.keywords?.length) { out = { keywords: new Set(p.keywords), source: `vendored priors/code-kw-${code}.json (CodeKeywordPrior@1)` }; break; }
    } catch { /* try the next code */ }
  }
  _kw.set(lang, out);
  return out;
}

// ═══════════════════════════════ LEXER ═══════════════════════════════
// token: { t: id|num|str|sym|re|op|nl|inc, v, s, e, ln, bol?, col?, tmpl?, val? }
const OPS3 = ["...", "<=>", "===", "!==", "**=", "||=", "&&=", "<<=", ">>="];
const OPS2_BASE = ["=>", "->", "::", "..", "==", "!=", "<=", ">=", "&&", "||", ":=", "++", "--", "+=", "-=", "*=", "/=", "%=", "|=", "&=", "^=", "**", "=~", "!~"];
const NUM_RE = /(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[a-zA-Z]*|\.\d[\d_]*(?:[eE][+-]?\d+)?[a-zA-Z]*)/y;
const ID_RE = /[A-Za-z_$\u0080-￿][\w$\u0080-￿]*/y;
const JS_REGEX_AFTER_ID = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const RUBY_KW_BEFORE_VALUE = new Set(["if", "unless", "while", "until", "when", "and", "or", "not", "then", "do", "else", "elsif", "case", "in", "begin", "return", "puts", "print", "p", "raise", "yield", "rescue", "ensure"]);

function lexSetup(lang) {
  return {
    lang,
    hash: lang === "python" || lang === "ruby",
    slash: lang !== "python" && lang !== "ruby",
    ops2: lang === "javascript" ? [...OPS2_BASE, "?."] : lang === "ruby" ? [...OPS2_BASE, "&."] : OPS2_BASE,
  };
}

function lexAll(text, lang, final) {
  const L = lexSetup(lang);
  const out = [];
  const S = { ln: 0, bd: 0, atStart: true, col: 0, leading: true, lineStart: true, tmpl: [], heredocs: [], noBol: false };
  lexRange(text, 0, text.length, L, out, S);
  if (!final && out.length) {
    const last = out[out.length - 1];
    if (last.e >= text.length && last.t !== "nl") out.pop();
  }
  return out;
}

function push(out, S, tok) {
  tok.ln = S.ln;
  if (S.pp) tok.pp = true;
  if (!S.noBol && S.atStart && tok.t !== "nl") { tok.bol = true; tok.col = S.col; S.atStart = false; }
  S.lineStart = false; S.leading = false;
  out.push(tok);
  return tok;
}

function endOfLine(text, i) { const j = text.indexOf("\n", i); return j === -1 ? text.length : j; }

function lexRange(text, i, end, L, out, S) {
  const lang = L.lang;
  const prevTok = () => out[out.length - 1];
  const isValueEnd = (t) => {
    if (!t) return false;
    if (t.t === "num" || t.t === "str" || t.t === "sym" || t.t === "re") return true;
    if (t.t === "id") return lang === "ruby" ? !RUBY_KW_BEFORE_VALUE.has(t.v) : !JS_REGEX_AFTER_ID.has(t.v);
    if (t.t === "op") return t.v === ")" || t.v === "]" || t.v === "}";
    return false;
  };
  while (i < end) {
    const c = text[i];
    // ── newline ──
    if (c === "\n") {
      if (!(lang === "python" && (S.bd > 0 || S.atStart))) push2nl(out, S, i);
      if (S.heredocs.length) i = skipHeredocs(text, i + 1, S, out, end, L); else i += 1;
      S.ln += 1; S.lineStart = true; S.leading = true; S.col = 0;
      if (!(lang === "python" && S.bd > 0)) S.atStart = true;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r" || c === "\f") {
      if (S.leading) S.col += c === "\t" ? 8 - (S.col % 8) : 1;
      i += 1; continue;
    }
    if (c === "\\" && text[i + 1] === "\n" && (lang === "python" || lang === "c" || lang === "ruby")) { i += 2; S.ln += 1; continue; }
    if (c === "\\" && text[i + 1] === "\r" && text[i + 2] === "\n") { i += 3; S.ln += 1; continue; }
    // ── comments ──
    if (L.slash && c === "/" && text[i + 1] === "/") { i = endOfLine(text, i); continue; }
    if (L.slash && c === "/" && text[i + 1] === "*") {
      const j = text.indexOf("*/", i + 2);
      const stop = j === -1 ? text.length : j + 2;
      for (let k = i; k < stop; k++) if (text[k] === "\n") S.ln += 1;
      i = stop; continue;
    }
    if (c === "#" && L.hash) {
      i = endOfLine(text, i); continue;
    }
    if (lang === "ruby" && c === "=" && S.lineStart && text.startsWith("=begin", i)) {
      const m = /^=end\b.*$/m.exec(text.slice(i));
      const stop = m ? i + m.index + m[0].length : text.length;
      for (let k = i; k < stop; k++) if (text[k] === "\n") S.ln += 1;
      i = stop; continue;
    }
    if (lang === "c" && c === "#" && S.lineStart) { i = lexDirective(text, i, out, S); continue; }
    if (lang === "javascript" && c === "#" && i === 0 && text[1] === "!") { i = endOfLine(text, i); continue; }
    if (lang === "javascript" && c === "#" && /[A-Za-z_$]/.test(text[i + 1] ?? "")) { ID_RE.lastIndex = i + 1; const m = ID_RE.exec(text); push(out, S, { t: "id", v: "#" + m[0], s: i, e: i + 1 + m[0].length }); i += 1 + m[0].length; continue; }
    // ── strings ──
    if (c === '"' || c === "'" || (c === "`" && (lang === "javascript" || lang === "go" || lang === "ruby"))) {
      if (c === "`" && lang === "javascript") { i = scanTemplate(text, i + 1, i, L, out, S, end); continue; }
      i = lexString(text, i, i, "", L, out, S, end);
      continue;
    }
    // template continuation: a `}` closing a `${` interpolation
    if (c === "}" && S.tmpl.length && S.bd === S.tmpl[S.tmpl.length - 1]) {
      S.tmpl.pop();
      i = scanTemplate(text, i + 1, i, L, out, S, end);
      continue;
    }
    // ── numbers ──
    if ((c >= "0" && c <= "9") || (c === "." && text[i + 1] >= "0" && text[i + 1] <= "9" && !isValueEnd(prevTok()))) {
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(text);
      let j = m ? i + m[0].length : i + 1;
      if (lang === "ruby" && m && /\.\./.test(m[0])) j = i + m[0].indexOf("..");
      push(out, S, { t: "num", v: text.slice(i, j), s: i, e: j });
      i = j; continue;
    }
    // ── identifiers (with python string prefixes, ruby sigils/suffixes) ──
    if (/[A-Za-z_$\u0080-￿]/.test(c) || (lang === "ruby" && (c === "@" || (c === "$" && /[\w]/.test(text[i + 1] ?? ""))))) {
      let j = i;
      if (lang === "ruby") { while (text[j] === "@") j += 1; if (text[j] === "$") j += 1; }
      ID_RE.lastIndex = j;
      const m = ID_RE.exec(text);
      if (!m) { push(out, S, { t: "op", v: c, s: i, e: i + 1 }); i += 1; continue; }
      j += m[0].length;
      if (lang === "python" && (text[j] === '"' || text[j] === "'") && /^(?:[rRbBuUfF]|[rR][bBfF]|[bBfF][rR])$/.test(text.slice(i, j))) {
        i = lexString(text, j, i, text.slice(i, j), L, out, S, end); continue;
      }
      if (lang === "ruby" && (text[j] === "?" || text[j] === "!") && text[j + 1] !== "=") j += 1; // method-name suffix (`valid?`, `save!`)
      push(out, S, { t: "id", v: text.slice(i, j), s: i, e: j });
      i = j; continue;
    }
    // ── ruby literals: symbols, %-strings, regex, heredoc ──
    if (lang === "ruby") {
      const pv = prevTok();
      const spaceBefore = i > 0 && /\s/.test(text[i - 1]);
      const valueEnd = isValueEnd(pv);
      if (c === ":" && text[i + 1] !== ":" && (!valueEnd || (spaceBefore && !/\s/.test(text[i + 1] ?? " ")))) {
        if (text[i + 1] === '"' || text[i + 1] === "'") { i = lexString(text, i + 1, i, "", L, out, S, end, "sym"); continue; }
        const m = /^:(?:[A-Za-z_][\w]*[?!=]?|\[\]=?|<=>|===?|=~|[+\-*\/%<>!~^&|`]+@?)/.exec(text.slice(i, i + 40));
        if (m && !(m[0].endsWith("=") && /^[=>~]/.test(text[i + m[0].length] ?? ""))) { push(out, S, { t: "sym", v: m[0], s: i, e: i + m[0].length }); i += m[0].length; continue; }
      }
      if (c === "%" && (!valueEnd || (spaceBefore && !/\s|=/.test(text[i + 1] ?? " ")))) {
        const m = /^%([wWiIqQrsx]?)([\[({<|!\/])/.exec(text.slice(i, i + 4));
        if (m) {
          const open = m[2], close = { "[": "]", "(": ")", "{": "}", "<": ">" }[open] ?? open;
          let j = i + m[0].length, depth = 1;
          while (j < end && depth > 0) {
            if (text[j] === "\\") { j += 2; continue; }
            if (text[j] === "\n") S.ln += 1;
            if (open !== close && text[j] === open) depth += 1;
            else if (text[j] === close) depth -= 1;
            j += 1;
          }
          push(out, S, { t: "str", v: text.slice(i, j), s: i, e: j, val: text.slice(i + m[0].length, j - 1) });
          if (/^[QWIrx]?$/.test(m[1]) && m[1] !== "") lexInterp(text, i + m[0].length, j - 1, "ruby", L, out, S);
          else if (m[1] === "" && open !== "'") lexInterp(text, i + m[0].length, j - 1, "ruby", L, out, S);
          i = j; continue;
        }
      }
      if (c === "/" && (!valueEnd || (spaceBefore && !/\s|=/.test(text[i + 1] ?? " ")))) {
        let j = i + 1, inCls = false;
        while (j < end && text[j] !== "\n") {
          if (text[j] === "\\") { j += 2; continue; }
          if (text[j] === "[") inCls = true; else if (text[j] === "]") inCls = false;
          else if (text[j] === "/" && !inCls) break;
          j += 1;
        }
        if (text[j] === "/") { const bodyEnd = j; j += 1; while (/[imxounse]/.test(text[j] ?? "")) j += 1; push(out, S, { t: "re", v: text.slice(i, j), s: i, e: j }); lexInterp(text, i + 1, bodyEnd, "ruby", L, out, S); i = j; continue; }
      }
      if (c === "<" && text[i + 1] === "<") {
        const m = /^<<([~-]?)(["'`]?)([A-Za-z_][\w]*)\2/.exec(text.slice(i, i + 80));
        if (m && (!valueEnd || (spaceBefore && !/\s/.test(text[i + 2] ?? " ")))) {
          S.heredocs.push({ id: m[3], indent: m[1] !== "", raw: m[2] === "'", at: i, e: i + m[0].length });
          push(out, S, { t: "str", v: m[0], s: i, e: i + m[0].length, val: "", heredoc: true });
          i += m[0].length; continue;
        }
      }
    }
    // ── javascript regex literal ──
    if (lang === "javascript" && c === "/") {
      const pv = prevTok();
      const allowed = !pv || (pv.t === "op" && pv.v !== ")" && pv.v !== "]" && pv.v !== "}") || pv.t === "nl" || (pv.t === "id" && JS_REGEX_AFTER_ID.has(pv.v));
      if (allowed) {
        let j = i + 1, inCls = false;
        while (j < end && text[j] !== "\n") {
          if (text[j] === "\\") { j += 2; continue; }
          if (text[j] === "[") inCls = true; else if (text[j] === "]") inCls = false;
          else if (text[j] === "/" && !inCls) break;
          j += 1;
        }
        if (text[j] === "/") { j += 1; while (/[a-z]/.test(text[j] ?? "")) j += 1; push(out, S, { t: "re", v: text.slice(i, j), s: i, e: j }); i = j; continue; }
      }
    }
    // ── operators ──
    let op = null;
    const t3 = text.slice(i, i + 3);
    if (OPS3.includes(t3) && !(lang !== "ruby" && (t3 === "<=>"))) op = t3;
    else { const t2 = text.slice(i, i + 2); if (L.ops2.includes(t2)) op = t2; }
    if (op === "?." && /\d/.test(text[i + 2] ?? "")) op = null; // a ?.5 : b
    if (!op) op = c;
    if (op === "(" || op === "[" || op === "{") S.bd += 1;
    else if (op === ")" || op === "]" || op === "}") S.bd = Math.max(0, S.bd - 1);
    push(out, S, { t: "op", v: op, s: i, e: i + op.length });
    i += op.length;
  }
}

function push2nl(out, S, i) { out.push({ t: "nl", v: "\n", s: i, e: i + 1, ln: S.ln, bd: S.bd }); }

function lexDirective(text, i, out, S) {
  let j = i + 1;
  const start = i;
  while (j < text.length) {
    if (text[j] === "\\" && text[j + 1] === "\n") { j += 2; S.ln += 1; continue; }
    if (text[j] === "/" && text[j + 1] === "*") { const k = text.indexOf("*/", j + 2); const stop = k === -1 ? text.length : k + 2; for (let q = j; q < stop; q++) if (text[q] === "\n") S.ln += 1; j = stop; continue; }
    if (text[j] === "\n") break;
    j += 1;
  }
  const line = text.slice(start, j);
  const m = /^#\s*(?:include|import)\s*(?:<([^>\n]*)>|"([^"\n]*)")/.exec(line);
  if (m) { out.push({ t: "inc", v: m[1] ?? m[2], s: start, e: j, ln: S.ln }); }
  // the condition of #if / #elif is an expression the grammar parses (calls such as __has_builtin(x) are calls);
  // the body of a #define is raw text and is skipped
  const cond = /^#\s*(?:if|elif)\b/.exec(line);
  if (cond) { const sub = { ...S, bd: 0, atStart: false, noBol: true, tmpl: [], heredocs: [], pp: true }; lexRange(text, start + cond[0].length, j, lexSetup("c"), out, sub); }
  S.lineStart = false;
  return j;
}

function skipHeredocs(text, i, S, out, end, L) {
  // i is just after the newline; consume the body of every heredoc opened on the finished line
  while (S.heredocs.length) {
    const h = S.heredocs.shift();
    const bodyStart = i;
    let found = false;
    while (i < text.length) {
      const j = endOfLine(text, i);
      const line = text.slice(i, j);
      S.ln += 1;
      i = j + 1;
      if ((h.indent ? line.trim() : line.replace(/\r$/, "")) === h.id) { found = true; break; }
    }
    // the body is one string lexeme (interpolation inside heredoc bodies is not read: a disclosed recall loss)
    const prev = out.slice().reverse().find((t) => t.heredoc && t.val === "");
    if (prev) prev.val = text.slice(bodyStart, Math.min(i, text.length)); // body text kept for debugging only
    if (!found && i >= text.length) { i = text.length; }
    // an interpolating heredoc (`<<~EOS`, not `<<~'EOS'`) holds #{ expr } the grammar parses
    if (!h.raw) lexInterp(text, bodyStart, Math.min(i, text.length), "ruby", L, out, S);
  }
  return Math.min(i, text.length);
}

// quote-delimited string. `from` = where the token starts (a python prefix begins before the quote).
function lexString(text, q, from, prefix, L, out, S, end, tt = "str") {
  const lang = L.lang;
  const quote = text[q];
  let triple = false;
  if ((lang === "python" && (text.startsWith(quote.repeat(3), q))) || (lang === "java" && quote === '"' && text.startsWith('"""', q))) triple = true;
  let j = q + (triple ? 3 : 1);
  const open = j;
  const multi = triple || lang === "go" && quote === "`" || lang === "ruby";
  const interp = (lang === "python" && /[fF]/.test(prefix)) || (lang === "ruby" && quote !== "'" );
  let closed = false;
  while (j < end) {
    const ch = text[j];
    if (ch === "\\") { if (text[j + 1] === "\n") S.ln += 1; j += 2; continue; }
    if (lang === "ruby" && quote !== "'" && ch === "#" && text[j + 1] === "{") { j = skipRubyInterp(text, j + 2, end); continue; }
    if (ch === "\n") {
      if (!multi) break; // an unterminated single-line string ends at the line (error recovery)
      S.ln += 1;
    }
    if (triple) { if (text.startsWith(quote.repeat(3), j)) { closed = true; break; } }
    else if (ch === quote) { closed = true; break; }
    j += 1;
  }
  const bodyEnd = j;
  const stop = closed ? j + (triple ? 3 : 1) : j;
  const tok = { t: tt, v: text.slice(from, stop), s: from, e: stop, val: text.slice(open, bodyEnd), closed };
  if (!closed && !text.slice(open, bodyEnd).includes("\n") && lang !== "ruby") tok.e = stop;
  const savedLn = S.ln;
  push(out, S, tok);
  // interpolations: python f-strings {expr}, ruby #{expr}
  if (interp && closed) lexInterp(text, open, bodyEnd, lang, L, out, S);
  S.ln = savedLn;
  return stop;
}

// index just after the `}` closing a Ruby `#{ ... }` that starts at j (nested braces and quoted strings are skipped)
function skipRubyInterp(text, j, end) {
  let depth = 1;
  while (j < end && depth > 0) {
    const d = text[j];
    if (d === "\\") { j += 2; continue; }
    if (d === '"' || d === "'") {
      const q = d; j += 1;
      while (j < end && text[j] !== q) {
        if (text[j] === "\\") { j += 2; continue; }
        if (q === '"' && text[j] === "#" && text[j + 1] === "{") { j = skipRubyInterp(text, j + 2, end); continue; }
        j += 1;
      }
      j += 1; continue;
    }
    if (d === "{") depth += 1; else if (d === "}") depth -= 1;
    j += 1;
  }
  return j;
}

function lexInterp(text, a, b, lang, L, out, S) {
  let i = a;
  while (i < b) {
    const ch = text[i];
    if (ch === "\\") { i += 2; continue; }
    if (lang === "python") {
      if (ch === "{" && text[i + 1] === "{") { i += 2; continue; }
      if (ch !== "{") { i += 1; continue; }
    } else {
      if (!(ch === "#" && text[i + 1] === "{")) { i += 1; continue; }
    }
    const start = i + (lang === "python" ? 1 : 2);
    let depth = 1, j = start;
    while (j < b && depth > 0) {
      const d = text[j];
      if (d === '"' || d === "'") { const k = text.indexOf(d, j + 1); j = k === -1 ? b : k + 1; continue; }
      if (d === "{") depth += 1; else if (d === "}") depth -= 1;
      j += 1;
    }
    if (depth !== 0) break;
    const sub = { ...S, bd: 0, atStart: false, noBol: true, tmpl: [], heredocs: [] };
    const from = out.length;
    lexRange(text, start, j - 1, L, out, sub);
    // an interpolation is its own little expression: end it with a sentinel so its last token is not read as the first
    // word of a command whose argument happens to be the next token of the surrounding code
    out.push({ t: "nl", v: "", s: j - 1, e: j - 1, ln: S.ln, bd: 1, sentinel: true });
    for (let k = from; k < out.length; k++) out[k].interp = true;
    i = j;
  }
}

// JS template literal body starting at `i` (after the backtick or the closing `}` of an interpolation)
function scanTemplate(text, i, from, L, out, S, end) {
  let j = i;
  while (j < end) {
    const ch = text[j];
    if (ch === "\\") { j += 2; continue; }
    if (ch === "\n") S.ln += 1;
    if (ch === "`") { push(out, S, { t: "str", v: text.slice(from, j + 1), s: from, e: j + 1, tmpl: true, val: text.slice(i, j), closed: true }); return j + 1; }
    if (ch === "$" && text[j + 1] === "{") {
      push(out, S, { t: "str", v: text.slice(from, j + 2), s: from, e: j + 2, tmpl: true, val: text.slice(i, j), closed: false, part: true });
      S.tmpl.push(S.bd);
      return j + 2;
    }
    j += 1;
  }
  push(out, S, { t: "str", v: text.slice(from, j), s: from, e: j, tmpl: true, val: text.slice(i, j), closed: false });
  return j;
}

// ═══════════════════════════════ READER CORE ═══════════════════════════════
class Ctx {
  constructor({ text, lang, keywords, final, T }) {
    this.text = text; this.lang = lang; this.keywords = keywords; this.final = final; this.T = T;
    this.calls = []; this.imports = []; this.extends = []; this.declared = [];
  }
  /** end offset of the evidence at token index j, or null when the stream stops before it and the end is not final */
  endAt(j) { const t = this.T[j]; if (t) return t.e; return this.final ? this.text.length : null; }
  refused(name) { return Boolean(this.keywords && this.keywords.has(name)); }
  call(caller, tok, end) { if (end === null) return; this.calls.push({ caller: caller ?? "<top>", callee: tok.v, at: tok.s, end }); }
  imp(module, at, end) { if (end === null || !module) return; this.imports.push({ module, at, end }); }
  ext(child, base, relation, at, end, shape = null) { if (end === null || !child || !base) return; this.extends.push(shape ? { child, base, relation, at, end, shape } : { child, base, relation, at, end }); }
  decl(name, kind, at) { this.declared.push({ name, kind, at }); }
}

const isOp = (t, v) => Boolean(t) && t.t === "op" && t.v === v;
const isId = (t, v) => Boolean(t) && t.t === "id" && (v === undefined || t.v === v);

function prevSigIdx(T, i) { let k = i - 1; while (k >= 0 && T[k].t === "nl") k -= 1; return k; }
function nextSigIdx(T, i) { let k = i + 1; while (k < T.length && T[k].t === "nl") k += 1; return k; }

// innermost named callable/class entry in a scope stack (anything with .name and .named === true)
// A declaration's HEADER (parameter defaults, a class heritage list) belongs to the declaration: `pend` is the header
// still waiting for its body brace.
function callerOf(stack, pend = null) {
  if (pend && pend.name && pend.level <= stack.length) return pend.name;
  for (let k = stack.length - 1; k >= 0; k--) { const e = stack[k]; if (e.named && e.name) return e.name; }
  return "<top>";
}

// qualified name starting at index i: id ((.|::) id)*  ->  { last, idx (index after), first }
function qualName(T, i, seps = ["."]) {
  if (!isId(T[i])) return null;
  let j = i;
  while (isOp(T[j + 1], seps[0]) || (seps[1] && isOp(T[j + 1], seps[1]))) { if (!isId(T[j + 2])) break; j += 2; }
  return { last: T[j], after: j + 1, first: T[i] };
}

// ═══════════════════════════════ PYTHON ═══════════════════════════════
function readPython(C) {
  const T = C.T;
  const frames = []; // {kind:'def'|'class', name, indent}
  let lineIndent = 0;
  let bd = 0;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "nl") continue;
    if (t.bol) {
      lineIndent = t.col;
      while (frames.length && frames[frames.length - 1].indent >= t.col) frames.pop();
    }
    if (t.t === "op") { if ("([{".includes(t.v)) bd += 1; else if (")]}".includes(t.v)) bd = Math.max(0, bd - 1); continue; }
    if (t.t !== "id") continue;
    let pk = i - 1; while (pk >= 0 && T[pk].interp && !t.interp) pk -= 1;
    const prev = T[pk]; // past tokens lexed out of an f-string interpolation
    const stmt = t.bol || isOp(prev, ";") || (isOp(prev, ":") && bd === 0) || (isId(prev, "async") && prev.bol);
    // ── def / class ──
    if (t.v === "def" && stmt && isId(T[i + 1])) {
      const nm = T[i + 1];
      frames.push({ kind: "def", name: nm.v, indent: lineIndent, named: true });
      C.decl(nm.v, "function", nm.s);
      i += 1; continue;
    }
    if (t.v === "async" && isId(T[i + 1], "def") && stmt && isId(T[i + 2])) {
      const nm = T[i + 2];
      frames.push({ kind: "def", name: nm.v, indent: lineIndent, named: true });
      C.decl(nm.v, "function", nm.s);
      i += 2; continue;
    }
    if (t.v === "class" && stmt && isId(T[i + 1])) {
      const nm = T[i + 1];
      frames.push({ kind: "class", name: nm.v, indent: lineIndent, named: true });
      C.decl(nm.v, "class", nm.s);
      i += 1;
      if (isOp(T[i + 1], "(")) pyBases(C, T, i + 1, nm.v);
      continue;
    }
    // ── imports ──
    if (t.v === "import" && stmt) { i = pyImport(C, T, i); continue; }
    if (t.v === "from" && stmt) { i = pyFrom(C, T, i); continue; }
    // ── calls ──
    if (isOp(T[i + 1], "(")) {
      const member = isOp(prev, ".");
      if (!member && C.refused(t.v)) continue;
      if (isId(prev, "def") || isId(prev, "class")) continue;
      C.call(callerOf(frames), t, T[i + 1].e);
    }
  }
}

// base list of `class Name(...)`: pure lookahead that emits `extends` for each plain `id(.id)*` item at depth 1 (keyword
// arguments, subscripts, calls and starred items are not bases: the gold agrees). Tokens are NOT consumed; the main loop
// still reads calls inside the list.
function pyBases(C, T, openIdx, child) {
  let j = openIdx + 1, depth = 1;
  while (j < T.length && depth > 0) {
    const t = T[j];
    if (t.t === "nl") { j += 1; continue; }
    if (depth === 1 && isId(t)) {
      const q = qualName(T, j);
      const nx = T[q.after];
      const starred = isOp(T[j - 1], "*") || isOp(T[j - 1], "**") || isOp(T[j - 1], "=");
      if (nx && (isOp(nx, ",") || isOp(nx, ")")) && !starred) C.ext(child, q.last.v, "extends", q.last.s, nx.e);
      j = q.after; continue;
    }
    if (t.t === "op") { if ("([{".includes(t.v)) depth += 1; else if (")]}".includes(t.v)) depth -= 1; }
    j += 1;
  }
}

function pyDotted(T, j) {
  if (!isId(T[j])) return null;
  let k = j, text = T[j].v;
  while (isOp(T[k + 1], ".") && isId(T[k + 2])) { text += "." + T[k + 2].v; k += 2; }
  return { text, after: k + 1, start: T[j].s };
}

function pyImport(C, T, i) {
  let j = i + 1;
  for (;;) {
    const d = pyDotted(T, j);
    if (!d) return Math.max(i, j - 1);
    j = d.after;
    if (isId(T[j], "as") && isId(T[j + 1])) j += 2;
    // the module is complete once the token after it (`,`, `as X`, newline, `;`) is seen
    C.imp(d.text, d.start, C.endAt(j));
    if (isOp(T[j], ",")) { j += 1; continue; }
    return Math.max(i, j - 1);
  }
}

function pyFrom(C, T, i) {
  let j = i + 1;
  let text = "";
  const s0 = T[j]?.s;
  while (T[j] && (isOp(T[j], ".") || isOp(T[j], "..") || isOp(T[j], "..."))) { text += T[j].v; j += 1; }
  const d = isId(T[j], "import") ? null : pyDotted(T, j);
  if (d) { text += d.text; j = d.after; }
  // `from __future__ import x` is a directive to the compiler (its own grammar node), not the load of a module
  if (isId(T[j], "import") && text && text !== "__future__") { C.imp(text, s0 ?? T[i].s, T[j].e); return j; }
  return Math.max(i, j - 1);
}

// ═══════════════════════════════ BRACE LANGUAGES ═══════════════════════════════
// shared stack machinery. Stack entries: { ch:'{'|'('|'[', kind, name, named, ... }
function openEntry(stack, e) { stack.push(e); }

function closeEntry(stack, ch) {
  // pop until a matching opener; expr frames sitting above are popped first
  while (stack.length > 1 && stack[stack.length - 1].ch === "expr") stack.pop();
  if (stack.length > 1) return stack.pop();
  return null;
}

// ── JavaScript ──
const JS_MEMBER_PREV_IDS = new Set(["static", "async", "get", "set", "public", "private", "protected", "readonly", "override", "abstract"]);
const JS_OBJ_PREV_OPS = new Set(["=", "(", ",", "[", "?", "||", "&&", "??", "!", "...", "=>"]);
const JS_STMT_PREV_KW = new Set(["export", "default"]);

function readJavaScript(C) {
  const T = C.T;
  const stack = [{ ch: "file", kind: "file" }];
  let pend = null;       // { kind:'func'|'class', name, level }
  let heritage = null;
  let pendingParen = null;
  const top = () => stack[stack.length - 1];
  const topBrace = () => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].ch === "{" || stack[k].ch === "file") return stack[k]; return stack[0]; };
  const memberLevel = () => { const e = top(); return e.ch === "{" && (e.kind === "class" || e.kind === "obj"); };
  const sigBefore = (i) => T[prevSigIdx(T, i)];
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "nl") {
      const e = top();
      if (e.ch === "expr") {
        const p = sigBefore(i), nx = T[nextSigIdx(T, i)];
        const cont = !p || (p.t === "op" && !")]}".includes(p.v) && p.v !== "++" && p.v !== "--") || !nx || (nx.t === "op" && /^[.?:,+\-*\/|&=<>]|^\?\./.test(nx.v) && nx.v !== "++" && nx.v !== "--" && !"([{".includes(nx.v)) ;
        if (!cont) stack.pop();
      }
      continue;
    }
    if (t.t === "inc") continue;
    if (t.t === "str") {
      // tagged template: identifier immediately followed by a template literal is a call
      continue;
    }
    if (t.t === "op") {
      const v = t.v;
      if (v === "(" || v === "[") {
        const e = { ch: v, kind: v };
        if (v === "(" && pendingParen) { Object.assign(e, pendingParen); pendingParen = null; } else pendingParen = null;
        stack.push(e);
      } else if (v === "{") {
        let e = { ch: "{", kind: "block", name: null, named: false };
        const p = sigBefore(i);
        if (pend && pend.level === stack.length) { e = { ch: "{", kind: pend.kind, name: pend.name, named: Boolean(pend.name) }; pend = null; if (e.kind === "func") C.decl(e.name, "function", t.s); }
        else if (p && p.t === "op" && (JS_OBJ_PREV_OPS.has(p.v) && p.v !== "=>")) e.kind = "obj";
        else if (p && p.t === "op" && p.v === ":" && topBrace().kind === "obj") e.kind = "obj";
        else if (isId(p, "return") || isId(p, "default")) e.kind = "obj";
        stack.push(e);
      } else if (v === ")" || v === "]" || v === "}") {
        const e = closeEntry(stack, v);
        if (e && e.ch === "{" && v === "}") { /* function / class frame closed */ }
        if (pend && v === "}" && pend.level > stack.length) pend = null;
      } else if (v === ";") {
        while (top().ch === "expr") stack.pop();
        if (pend && pend.level === stack.length) pend = null;
      } else if (v === ",") {
        while (top().ch === "expr") stack.pop();
        if (pend && pend.level === stack.length) pend = null;
      } else if (v === "=>") {
        // a named arrow: look back over the parameter list
        let name = null;
        const j = prevSigIdx(T, i);
        let k = j;
        if (isOp(T[j], ")")) { let d = 0; for (k = j; k >= 0; k--) { if (isOp(T[k], ")")) d += 1; else if (isOp(T[k], "(")) { d -= 1; if (d === 0) break; } } }
        if (k >= 0) {
          let a = k - 1;
          if (isId(T[a], "async")) a -= 1;
          const eq = T[a];
          if (eq && eq.t === "op" && (eq.v === "=" || eq.v === ":") && isId(T[a - 1]) && !memberLevelForField(stack, eq)) name = T[a - 1].v;
        }
        const nx = T[nextSigIdx(T, i)];
        if (isOp(nx, "{")) { if (name) pend = { kind: "func", name, level: stack.length }; }
        else if (name) { stack.push({ ch: "expr", kind: "func", name, named: true }); C.decl(name, "function", t.s); }
      }
      continue;
    }
    if (t.t !== "id") continue;
    const prev = sigBefore(i);
    const member = prev && prev.t === "op" && (prev.v === "." || prev.v === "?.");
    const nx = T[i + 1];
    // ── class ──
    if (t.v === "class" && !member) {
      const nm = isId(T[i + 1]) && T[i + 1].v !== "extends" ? T[i + 1] : null;
      // only a class DECLARATION (statement start, after export/default) is read for inheritance: the gold's query is
      // class_declaration; a class expression `x = class extends Y {}` is a value
      const decl = jsStmtStart(T, i);
      pend = { kind: "class", name: nm ? nm.v : null, level: stack.length };
      if (nm) C.decl(nm.v, "class", nm.s);
      const jx = nm ? i + 2 : i + 1;
      if (isId(T[jx], "extends")) {
        const q = qualName(T, jx + 1);
        // `extends a.b.C {` is a plain heritage; `extends mixin(X) {` is a call expression and is not an edge
        if (q && isOp(T[q.after], "{") && decl && nm) C.ext(nm.v, q.last.v, "extends", q.last.s, T[q.after].e);
        i = jx; // the heritage tokens are still read (a call inside them is a call)
      } else i = nm ? i + 1 : i;
      continue;
    }
    // ── function ──
    if (t.v === "function" && !member) {
      let j = i + 1;
      if (isOp(T[j], "*")) j += 1;
      const nameTok = isId(T[j]) && isOp(T[j + 1], "(") ? T[j] : null;
      let name = nameTok ? nameTok.v : null;
      if (!nameTok) {
        // a function value is named by what it is assigned to: `x = function`, `a.b = function`, `{ k: function }`
        let a = prevSigIdx(T, i);
        if (isId(T[a], "async")) a = prevSigIdx(T, a);
        const eq = T[a], idt = T[prevSigIdx(T, a)];
        if (eq && eq.t === "op" && (eq.v === "=" || eq.v === ":") && isId(idt) && !memberLevelForField(stack, eq)) name = idt.v;
      }
      pend = { kind: "func", name, level: stack.length };
      if (name) C.decl(name, "function", t.s);
      if (nameTok) i = j; // the name of a declaration is not a call
      continue;
    }
    // ── imports ──
    if (t.v === "import" && !member) {
      const stmt = jsStmtStart(T, i);
      if (isOp(nx, "(") && T[i + 2]?.t === "str" && !T[i + 2].tmpl) { C.imp(T[i + 2].val, T[i + 2].s, T[i + 2].e); continue; }
      if (stmt) {
        if (nx?.t === "str" && !nx.tmpl) { C.imp(nx.val, nx.s, nx.e); i += 1; continue; }
        let d = 0;
        for (let j = i + 1; j < T.length && j < i + 400; j++) {
          const u = T[j];
          if (u.t === "op") { if (u.v === "{") d += 1; else if (u.v === "}") d -= 1; else if (u.v === ";" && d === 0) break; }
          if (d === 0 && isId(u, "from") && T[j + 1]?.t === "str" && !T[j + 1].tmpl) { C.imp(T[j + 1].val, T[j + 1].s, T[j + 1].e); i = j + 1; break; }
          if (d === 0 && u.t === "id" && !["from", "as", "type"].includes(u.v) && T[j + 1] && !(isOp(T[j + 1], ",") || isId(T[j + 1], "from") || isId(T[j + 1], "as"))) break;
        }
      }
      continue;
    }
    if (t.v === "export" && !member) {
      const stmt = jsStmtStart(T, i);
      if (stmt && (isOp(nx, "{") || isOp(nx, "*"))) {
        let d = 0;
        for (let j = i + 1; j < T.length && j < i + 400; j++) {
          const u = T[j];
          if (u.t === "op") { if (u.v === "{") d += 1; else if (u.v === "}") d -= 1; else if (u.v === ";" && d === 0) break; }
          if (d === 0 && isId(u, "from") && T[j + 1]?.t === "str" && !T[j + 1].tmpl) { C.imp(T[j + 1].val, T[j + 1].s, T[j + 1].e); i = j + 1; break; }
        }
      }
      continue;
    }
    if (t.v === "require" && !member && isOp(nx, "(") && T[i + 2]?.t === "str" && !T[i + 2].tmpl) { C.imp(T[i + 2].val, T[i + 2].s, T[i + 2].e); continue; }
    if (t.v === "new" && !member) { /* instantiation: the callee of `new a.b.C(` is not a call */ i = skipNew(T, i); continue; }
    // ── calls / method declarations ──
    const taggedTemplate = nx && nx.t === "str" && nx.tmpl && nx.v.startsWith("`");
    const optionalCall = isOp(nx, "?.") && isOp(T[i + 2], "("); // a?.b?.(x): the callee b is followed by `?.(`
    if ((isOp(nx, "(") || taggedTemplate || optionalCall) && !(t.v === "super" && !member) && !(t.v === "require" && !member)) {
      if (isOp(nx, "(") && memberLevel() && !member && (prev == null || (prev.t === "op" && (prev.v === "{" || prev.v === "}" || prev.v === ";" || prev.v === "," || prev.v === "*")) || (prev.t === "id" && JS_MEMBER_PREV_IDS.has(prev.v)))) {
        // a method declaration at class / object-literal member level
        pendingParen = {};
        // JS `constructor` is not a named def in the gold (its tags exclude it): its body belongs to the class
        pend = { kind: "func", name: t.v === "constructor" || t.v.startsWith("#") ? null : t.v, level: stack.length };
        C.decl(t.v, "method", t.s);
        continue;
      }
      if (!member && C.refused(t.v)) continue;
      if (t.v.startsWith("#")) continue; // a private name is not a property_identifier in the gold grammar
      C.call(callerOf(stack, pend), t, optionalCall ? T[i + 2].e : nx.e);
    }
  }
}

// Statement start in JavaScript with optional semicolons (ASI): the previous significant token ends a statement, or the
// previous token is a line break after a token that can end an expression.
function jsStmtStart(T, i) {
  const k = prevSigIdx(T, i);
  const sp = T[k];
  if (!sp) return true;
  if (sp.t === "op" && (sp.v === ";" || sp.v === "{" || sp.v === "}")) return true;
  if (sp.t === "id" && (sp.v === "export" || sp.v === "default")) return true;
  if (T[i - 1] && T[i - 1].t === "nl") {
    if (sp.t === "num" || sp.t === "str" || sp.t === "re") return true;
    if (sp.t === "id") return !JS_REGEX_AFTER_ID.has(sp.v) && sp.v !== "extends";
    if (sp.t === "op") return sp.v === ")" || sp.v === "]" || sp.v === "++" || sp.v === "--";
  }
  return false;
}

function memberLevelForField(stack, eqTok) {
  // `=` at the member level of a CLASS body is a class field: tree-sitter's tags do not name it (JS tags.scm names
  // variable declarators, assignments and object pairs only)
  const e = stack[stack.length - 1];
  return e.ch === "{" && e.kind === "class" && eqTok.v === "=";
}

function skipNew(T, i) {
  // `new a.b.C<T>(` : consume the type up to the argument list so its callee is not read as a call
  let j = i + 1;
  while (j < T.length) {
    const u = T[j];
    if (u.t === "id" || isOp(u, ".")) { j += 1; continue; }
    break;
  }
  // stop just before `(`, `{`, or whatever follows; the `(` is then read as an ordinary bracket
  return Math.max(i, j - 1);
}

// ── Java ──
function readJava(C) {
  const T = C.T;
  const stack = [{ ch: "file", kind: "file" }];
  let pend = null;
  let lastClosedNew = false;
  let newPending = false;
  const top = () => stack[stack.length - 1];
  const memberLevel = () => { const e = top(); return e.ch === "{" && e.kind === "class"; };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "nl" || t.t === "inc" || t.t === "str" || t.t === "num") continue;
    const prev = T[prevSigIdx(T, i)];
    if (t.t === "op") {
      const v = t.v;
      if (v === "(" || v === "[") {
        const e = { ch: v, kind: v };
        if (v === "(" && newPending) { e.isNew = true; newPending = false; }
        else if (v === "[") newPending = false; // `new T[n]` creates an array: no constructor argument list follows
        stack.push(e);
        lastClosedNew = false;
      } else if (v === "{") {
        let e = { ch: "{", kind: "block", name: null, named: false };
        if (pend && pend.level === stack.length) { e = { ch: "{", kind: pend.kind, name: pend.name, named: Boolean(pend.name), isEnum: Boolean(pend.isEnum) }; pend = null; if (e.kind === "func") C.decl(e.name, "method", t.s); }
        else if (isOp(prev, ")") && lastClosedNew) e = { ch: "{", kind: "class", name: null, named: false };
        newPending = false; lastClosedNew = false;
        stack.push(e);
      } else if (v === ")" || v === "]" || v === "}") {
        const e = closeEntry(stack, v);
        lastClosedNew = Boolean(e && e.isNew);
        if (v === "}" ) { newPending = false; if (pend && pend.level > stack.length) pend = null; }
      } else if (v === ";") {
        if (pend && pend.level === stack.length) pend = null;
        newPending = false; lastClosedNew = false;
      } else if (v === "," || v === "=") {
        // a comma ends an enum constant `RED(1), BLUE(2)`; inside a `throws A, B` list it does not end the method header
        if (pend && pend.level === stack.length && !(v === "," && pend.throws)) pend = null;
        lastClosedNew = false;
      } else lastClosedNew = false;
      continue;
    }
    if (t.t !== "id") continue;
    const nx = T[i + 1];
    const member = isOp(prev, ".");
    // ── type declarations ──
    if ((t.v === "class" || t.v === "interface" || t.v === "enum" || t.v === "record") && !member && isId(T[i + 1]) && !isOp(prev, ".")) {
      if (t.v === "record" && !(isOp(T[i + 2], "(") || isOp(T[i + 2], "<"))) { /* a method or variable named record */ }
      else {
        const nm = T[i + 1];
        pend = { kind: "class", name: nm.v, level: stack.length, isEnum: t.v === "enum" };
        C.decl(nm.v, "class", nm.s);
        i = javaHeritage(C, T, i + 2, nm.v, t.v);
        continue;
      }
    }
    if (t.v === "interface" && isOp(prev, "@") && isId(T[i + 1])) { pend = { kind: "class", name: T[i + 1].v, level: stack.length }; i += 1; continue; }
    // ── imports ──
    if (t.v === "import" && (!prev || (prev.t === "op" && (prev.v === ";" || prev.v === "}")) || prev.t === "id")) {
      let j = i + 1;
      if (isId(T[j], "static")) j += 1;
      const first = T[j];
      let text = "";
      while (T[j] && (isId(T[j]) || isOp(T[j], "."))) { text += T[j].v; j += 1; }
      if (isOp(T[j], "*")) { j += 1; }
      if (isOp(T[j], ";")) { text = text.replace(/\.$/, ""); C.imp(text, first?.s ?? t.s, T[j].e); i = j; }
      continue;
    }
    if (t.v === "throws" && pend && pend.level === stack.length) { pend.throws = true; continue; }
    if (t.v === "package") { while (i < T.length && !isOp(T[i], ";")) i += 1; continue; }
    if (t.v === "new" && !member) { newPending = true; continue; }
    if (!isOp(nx, "(")) continue;
    // ── ident ( ──
    if (isOp(prev, "@")) continue; // annotation
    if (newPending) continue;      // constructor name of `new X(...)`
    if (!member && (t.v === "this" || t.v === "super")) continue;
    if (memberLevel() && !member && prev && (prev.t === "id" || (prev.t === "op" && (prev.v === "{" || prev.v === "}" || prev.v === ";" || prev.v === ">" || prev.v === "]" || prev.v === ")" || prev.v === ",")))) {
      if (!(prev.t === "id" && (prev.v === "new" || prev.v === "return" || prev.v === "throw")) && !C.refused(t.v)) {
        // an enum constant `A(1) { ... }` opens an anonymous class body, not a method
        const enumConst = top().isEnum && prev.t === "op" && (prev.v === "{" || prev.v === ",");
        pend = enumConst ? { kind: "class", name: null, level: stack.length } : { kind: "func", name: t.v, level: stack.length };
        if (!enumConst) C.decl(t.v, "method", t.s);
        continue;
      }
    }
    if (memberLevel() && !member && !prev) continue;
    if (!member && C.refused(t.v)) continue;
    C.call(callerOf(stack), t, nx.e);
  }
}

// type header after `class Name`: generics, record components, extends / implements / permits lists. Returns the index
// of the last token consumed before the body `{`.
function javaHeritage(C, T, j, child, declKind = "class") {
  let rel = null;
  let angle = 0;
  while (j < T.length) {
    const u = T[j];
    if (u.t === "nl") { j += 1; continue; }
    if (isOp(u, "{") || isOp(u, ";")) return j - 1;
    if (isOp(u, "<")) { angle += 1; j += 1; continue; }
    if (isOp(u, ">")) { angle = Math.max(0, angle - 1); j += 1; continue; }
    if (angle > 0) { j += 1; continue; }
    if (isOp(u, "(")) { let d = 0; for (; j < T.length; j++) { if (isOp(T[j], "(")) d += 1; else if (isOp(T[j], ")")) { d -= 1; if (d === 0) break; } } j += 1; continue; }
    if (isId(u, "extends") || isId(u, "implements")) { rel = u.v; j += 1; continue; }
    if (isId(u, "permits")) { rel = "permits"; j += 1; continue; }
    if (isId(u) && rel) {
      const q = qualName(T, j);
      const after = T[q.after];
      if (rel !== "permits" && after && (isOp(after, ",") || isOp(after, "{") || isOp(after, "<") || isId(after, "implements") || isId(after, "permits") || isId(after, "extends"))) C.ext(child, q.last.v, rel, q.last.s, after.e, { generic: isOp(after, "<"), qualified: q.first !== q.last, record: declKind === "record" });
      j = q.after; continue;
    }
    j += 1;
  }
  return j - 1;
}

// ── C ──
// C reserved words the received tree-sitter keyword list does not carry (ISO C11 6.4.1 `_Alignas _Atomic _Generic
// _Noreturn _Static_assert _Thread_local`, the GNU C keyword family `__asm__ __volatile__ __typeof__ __attribute__
// __extension__ ...`, MSVC `__declspec`): a recipe fact of the language, applied in BOTH the prior and no-prior arms.
const C_NONCALL = new Set(["__attribute__", "__typeof__", "__typeof", "typeof", "_Static_assert", "static_assert", "_Alignof", "_Alignas", "__alignof__", "__alignof", "__asm__", "__asm", "asm", "__volatile__", "__volatile", "__declspec", "_Generic", "_Atomic", "__extension__", "__builtin_va_arg", "__inline__", "__restrict__", "__restrict"]);
function readC(C) {
  const T = C.T;
  const stack = [{ ch: "file", kind: "file" }];
  let pend = null;
  let fileCall = null;
  const top = () => stack[stack.length - 1];
  const atFile = () => { const e = top(); return e.ch === "file" || (e.ch === "{" && e.kind === "link"); };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "inc") { C.imp(t.v, t.s, t.e); continue; }
    if (t.t === "nl" || t.t === "str" || t.t === "num") continue;
    if (t.pp) {
      // the condition of #if / #elif is an expression: `__has_builtin(x)` is a call (the grammar parses it)
      if (t.t === "id" && isOp(T[i + 1], "(") && T[i + 1].pp && !C_NONCALL.has(t.v) && !C.refused(t.v) && !isOp(T[i - 1], ".")) C.call("<top>", t, T[i + 1].e);
      continue;
    }
    const prev = T[prevSigIdx(T, i)];
    if (t.t === "op") {
      const v = t.v;
      if (v === "(" || v === "[") {
        const e = { ch: v, kind: v };
        if (v === "(" && fileCall && fileCall.idx === i - 1) { e.fileCall = fileCall.tok; }
        fileCall = null;
        stack.push(e);
      } else if (v === "{") {
        let e = { ch: "{", kind: "block", name: null, named: false };
        if (pend && pend.level === stack.length) { e = { ch: "{", kind: "func", name: pend.name, named: true }; pend = null; C.decl(e.name, "function", t.s); }
        else if (prev && prev.t === "str" && isId(T[prevSigIdx(T, prevSigIdx(T, i))], "extern")) e.kind = "link";
        else if (isId(prev, "struct") || isId(prev, "union") || isId(prev, "enum")) e.kind = "struct";
        else if (prev && prev.t === "id" && (isId(T[prevSigIdx(T, prevSigIdx(T, i))], "struct") || isId(T[prevSigIdx(T, prevSigIdx(T, i))], "union") || isId(T[prevSigIdx(T, prevSigIdx(T, i))], "enum"))) e.kind = "struct";
        stack.push(e);
      } else if (v === ")" || v === "]" || v === "}") {
        const e = closeEntry(stack, v);
        // a file-scope `NAME(args)` with no type before it is a top-level expression (a macro invocation: `NAME(x);` or an
        // X-macro table line), i.e. a call; with a body `NAME(args) { ... }` it is a macro-defined definition the grammar
        // does not read as a call. The decision waits for the token after `)`.
        if (e && e.fileCall && v === ")") {
          const nx2 = T[nextSigIdx(T, i)];
          if (nx2 && !isOp(nx2, "{")) C.call("<top>", e.fileCall, nx2.e);
          else if (!nx2 && C.final) C.call("<top>", e.fileCall, C.text.length);
        }
        if (pend && v === "}" && pend.level > stack.length) pend = null;
      } else if (v === ";" || v === "," || v === "=") { if (pend && pend.level === stack.length) pend = null; }
      continue;
    }
    if (t.t !== "id") continue;
    const nx = T[i + 1];
    if (!isOp(nx, "(")) continue;
    const member = isOp(prev, ".") || isOp(prev, "->");
    // a function-pointer declarator `int (*)(void*)` / `int (*f)(int)` is not a call
    if (isOp(T[i + 2], "*") && (isOp(T[i + 3], ")") || (T[i + 3]?.t === "id" && isOp(T[i + 4], ")") && isOp(T[i + 5], "(")))) continue;
    if (atFile() && !member) {
      // A declarator at file scope needs declaration specifiers (a type) before it, as in the C grammar; the LAST name
      // before `{` names the function, except attribute / asm forms. With no type before it (statement start) it is a
      // top-level expression statement, i.e. a macro invocation, read as a call only when `;` follows its argument list.
      if (C_NONCALL.has(t.v) || C.refused(t.v)) continue;
      // (a `)` ends a macro invocation or an attribute list: it counts as a declaration specifier only on the same line)
      const typed = prev && (prev.t === "id" || isOp(prev, "*") || isOp(prev, "**") || (isOp(prev, ")") && T[i - 1] === prev));
      if (typed) pend = { kind: "func", name: t.v, level: stack.length };
      else fileCall = { tok: t, idx: i };
      continue;
    }
    // inside a struct body or a parameter list nothing is called
    const e = top();
    if (e.ch === "{" && e.kind === "struct") continue;
    if (!member && (C_NONCALL.has(t.v) || C.refused(t.v))) continue;
    C.call(callerOf(stack), t, nx.e);
  }
}

// ── Go ──
function readGo(C) {
  const T = C.T;
  const stack = [{ ch: "file", kind: "file" }];
  let importParen = -1;
  let pend = null;
  let typeParen = -1;
  let fieldToks = [];
  const top = () => stack[stack.length - 1];
  const flushField = (endTok) => {
    const e = top();
    if (e.ch === "{" && (e.kind === "struct" || e.kind === "iface") && e.name && fieldToks.length) {
      let a = fieldToks.slice();
      if (a.length && a[a.length - 1].t === "str") a = a.slice(0, -1);
      if (a.length && isOp(a[0], "*")) a = a.slice(1);
      let ok = a.length > 0 && a[0].t === "id";
      let k = 0;
      if (ok) { k = 1; if (isOp(a[1], ".") && a[2]?.t === "id") k = 3; }
      let base = ok ? a[k - 1] : null;
      if (ok && k < a.length) { // optional [T] type arguments
        if (isOp(a[k], "[") && isOp(a[a.length - 1], "]")) k = a.length; else ok = false;
      }
      if (ok && k === a.length && base && !(e.kind === "iface" && false)) C.ext(e.name, base.v, "embeds", base.s, endTok ? endTok.e : C.endAt(Infinity));
    }
    fieldToks = [];
  };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.t === "inc" || t.t === "num") continue;
    const e0 = top();
    const inType = e0.ch === "{" && (e0.kind === "struct" || e0.kind === "iface");
    if (t.t === "nl") { if (inType) flushField(t); continue; }
    if (t.t === "str") {
      if (importParen >= 0 && stack.length - 1 === importParen) C.imp(t.val, t.s, t.e);
      else if (inType) fieldToks.push(t);
      continue;
    }
    const prev = T[prevSigIdx(T, i)];
    if (t.t === "op") {
      const v = t.v;
      if (inType && v !== "{" && v !== "}" && v !== ";" ) fieldToks.push(t);
      if (v === "(" || v === "[") {
        const e = { ch: v, kind: v };
        if (v === "(" && isId(prev, "type")) { typeParen = stack.length; e.typeGroup = true; }
        stack.push(e);
      } else if (v === "{") {
        let e = { ch: "{", kind: "block", name: null, named: false };
        // a brace right after `struct` / `interface` is that type's body (so `interface{}` in a signature never takes the
        // function's own body brace); only then does a pending `func` header claim the brace
        if (isId(prev, "struct") || isId(prev, "interface")) {
          // the type's name sits before the keyword, or before its `[K comparable, V any]` type-parameter list
          let ni = prevSigIdx(T, prevSigIdx(T, i));
          if (isOp(T[ni], "]")) { let d = 0; for (; ni >= 0; ni--) { if (isOp(T[ni], "]")) d += 1; else if (isOp(T[ni], "[")) { d -= 1; if (d === 0) break; } } ni = prevSigIdx(T, ni); }
          const nmTok = T[ni];
          const nm2 = T[prevSigIdx(T, ni)];
          const named = isId(nmTok) && (isId(nm2, "type") || (top().ch === "(" && top().typeGroup));
          e = { ch: "{", kind: prev.v === "struct" ? "struct" : "iface", name: named ? nmTok.v : null, named: false };
          if (named) C.decl(nmTok.v, "type", nmTok.s);
        } else if (pend && pend.level === stack.length) { e = { ch: "{", kind: "func", name: pend.name, named: true }; pend = null; C.decl(e.name, "function", t.s); }
        stack.push(e);
        fieldToks = [];
      } else if (v === ")" || v === "]" || v === "}") {
        if (v === "}" && inType) flushField(t);
        const e = closeEntry(stack, v);
        if (e && v === ")" && importParen === stack.length) importParen = -1;
        if (v === "}") fieldToks = [];
        if (pend && v === "}" && pend.level > stack.length) pend = null;
      } else if (v === ";") { if (inType) flushField(t); if (pend && pend.level === stack.length) pend = null; }
      continue;
    }
    if (t.t !== "id") continue;
    if (inType) fieldToks.push(t);
    const nx = T[i + 1];
    // ── imports ──
    if (t.v === "import" && stack.length === 1) {
      if (isOp(nx, "(")) { importParen = stack.length; /* the `(` pushes one level */ importParen = stack.length; }
      else {
        const j = T[i + 1]?.t === "str" ? i + 1 : (T[i + 2]?.t === "str" ? i + 2 : -1);
        if (j > 0) { C.imp(T[j].val, T[j].s, T[j].e); i = j; }
      }
      continue;
    }
    // ── func declarations ──
    if (t.v === "func" && stack.length === 1) {
      if (isId(nx) && (isOp(T[i + 2], "(") || isOp(T[i + 2], "["))) { pend = { kind: "func", name: nx.v, level: 1 }; i += 1; continue; }
      if (isOp(nx, "(")) {
        let d = 0, j = i + 1;
        for (; j < T.length; j++) { if (isOp(T[j], "(")) d += 1; else if (isOp(T[j], ")")) { d -= 1; if (d === 0) break; } }
        const nm = T[j + 1];
        if (isId(nm) && (isOp(T[j + 2], "(") || isOp(T[j + 2], "["))) { pend = { kind: "func", name: nm.v, level: 1 }; i = j + 1; continue; }
      }
      continue;
    }
    if (!isOp(nx, "(")) continue;
    if (isId(prev, "func")) continue;
    if (inType) continue;
    const member = isOp(prev, ".");
    if (!member && C.refused(t.v)) continue;
    if (isOp(prev, "]")) continue; // []byte(x), map[string]int(x): a conversion to a composite type, not a call
    C.call(callerOf(stack), t, nx.e);
  }
}

// ── Ruby ──
const RUBY_STRUCT = new Set(["def", "class", "module", "begin", "case", "for", "while", "until", "if", "unless", "do", "end", "then", "else", "elsif", "when", "in", "rescue", "ensure", "return", "break", "next", "redo", "retry", "yield", "self", "super", "nil", "true", "false", "and", "or", "not", "alias", "undef", "defined?", "BEGIN", "END", "__FILE__", "__LINE__", "__method__"]);
const RUBY_BLOCK_PREV_OPEN = new Set(["then", "do", "else", "elsif", "begin", "ensure", "rescue", "when", "and", "or", "not", "in"]);
const RUBY_VALUE_KW = new Set(["self", "nil", "true", "false", "__FILE__", "__method__", "super", "yield", "defined?", "lambda", "proc"]);
const RUBY_MIXINS = new Set(["include", "extend", "prepend"]);
const RUBY_REQUIRES = new Set(["require", "require_relative", "load", "autoload"]);
const RUBY_NONCALL = new Set(["defined?", "block_given?_"]);
function readRuby(C) {
  const T = C.T;
  const stack = []; // {ch:'kw', kind:'def'|'class'|'module'|'sclass'|'block', name, named, endless} | {ch:'br'}
  let loopDo = false;
  const topKw = () => { for (let k = stack.length - 1; k >= 0; k--) if (stack[k].ch === "kw") return stack[k]; return null; };
  // the token before i, looking past tokens lexed out of a #{ } interpolation (they follow their string in the stream)
  const prevOf = (i) => { let k = i - 1; while (k >= 0 && T[k].interp && !T[i].interp) k -= 1; return T[k]; };
  const isStmtStart = (i) => { const p = prevOf(i); return !p || p.t === "nl" || isOp(p, ";") || isOp(p, "{") || isOp(p, "|") || (p.t === "id" && RUBY_BLOCK_PREV_OPEN.has(p.v) && p.v !== "and" && p.v !== "or" && p.v !== "not" && p.v !== "in"); };
  const lowerStart = (s) => /^[a-z_]/.test(s);
  const constPath = (j) => {
    // Const(::Const)* ; returns { last, after } or null
    if (!(T[j]?.t === "id" && /^[A-Z]/.test(T[j].v))) { if (isOp(T[j], "::") && T[j + 1]?.t === "id" && /^[A-Z]/.test(T[j + 1].v)) return constPath(j + 1); return null; }
    let k = j;
    while (isOp(T[k + 1], "::") && T[k + 2]?.t === "id" && /^[A-Z]/.test(T[k + 2].v)) k += 2;
    return { last: T[k], after: k + 1 };
  };
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.sentinel) continue;
    if (t.t === "nl") {
      if (t.bd === 0) { const e = stack[stack.length - 1]; if (e && e.endless) stack.pop(); }
      loopDo = false; continue;
    }
    if (t.t === "inc" || t.t === "str" || t.t === "num" || t.t === "sym" || t.t === "re") continue;
    if (t.t === "op") {
      if (t.v === "(" || t.v === "[" || t.v === "{") stack.push({ ch: "br", kind: t.v });
      else if (t.v === ")" || t.v === "]" || t.v === "}") { while (stack.length && stack[stack.length - 1].ch === "kw" && stack[stack.length - 1].endless) stack.pop(); if (stack.length && stack[stack.length - 1].ch === "br") stack.pop(); }
      continue;
    }
    if (t.t !== "id") continue;
    const prev = prevOf(i);
    const member = isOp(prev, ".") || isOp(prev, "&.");
    const scoped = isOp(prev, "::");
    const nx = T[i + 1];
    const v = t.v;
    if (!member && !scoped) {
      // ── scope openers / closers ──
      if (v === "end") { while (stack.length && stack[stack.length - 1].ch === "br") stack.pop(); if (stack.length) stack.pop(); continue; }
      if (v === "def") {
        // def [recv.]name[(params)] [= expr]. Only an IDENTIFIER names a method: an operator (`==`, `[]`, `<=>`) or a setter
        // (`x=(v)`) has no identifier name in the gold grammar, so its entry is transparent (its calls belong to the class).
        let j = i + 1;
        let nm = T[j];
        if (isId(nm) && isOp(T[j + 1], ".")) { j += 2; nm = T[j]; }
        let named = isId(nm);
        let k = j + 1;
        if (named && isOp(T[k], "=") && T[k].s === nm.e && isOp(T[k + 1], "(")) { named = false; k += 1; }
        if (!isId(nm)) { k = j + 1; while (T[k] && T[k].t === "op" && !isOp(T[k], "(")) k += 1; }
        const e = { ch: "kw", kind: "def", name: named ? nm.v : null, named };
        if (isOp(T[k], "(")) { let d = 0; for (; k < T.length; k++) { if (isOp(T[k], "(")) d += 1; else if (isOp(T[k], ")")) { d -= 1; if (d === 0) break; } } k += 1; }
        if (isOp(T[k], "=") && !isOp(T[k + 1], "=")) e.endless = true; // `def f(x) = expr` has no `end`
        stack.push(e);
        if (named) C.decl(nm.v, "method", nm.s);
        i = j; continue;
      }
      if (v === "class" || v === "module") {
        if (v === "class" && isOp(nx, "<") ) { stack.push({ ch: "kw", kind: "sclass", name: null, named: false }); i += 1; continue; }
        const cp = constPath(i + 1);
        if (cp) {
          const e = { ch: "kw", kind: v, name: cp.last.v, named: true };
          stack.push(e);
          C.decl(cp.last.v, v, cp.last.s);
          let j = cp.after;
          if (v === "class" && isOp(T[j], "<")) {
            const sp = constPath(j + 1);
            if (sp) {
              const after = T[sp.after];
              if (!after || after.t === "nl" || isOp(after, ";")) { const end = after ? after.e : C.endAt(sp.after); C.ext(cp.last.v, sp.last.v, "extends", sp.last.s, end); }
              j = sp.after;
            }
          }
          i = j - 1; continue;
        }
        stack.push({ ch: "kw", kind: "block", name: null, named: false });
        continue;
      }
      if (v === "begin" || v === "case") { stack.push({ ch: "kw", kind: "block", name: null, named: false }); continue; }
      if (v === "for") { stack.push({ ch: "kw", kind: "block", name: null, named: false }); loopDo = true; continue; }
      if (v === "while" || v === "until" || v === "if" || v === "unless") {
        const p = prev;
        const valueEnd = p && ((p.t === "num" || p.t === "str" || p.t === "sym" || p.t === "re") || (p.t === "id" && !RUBY_BLOCK_PREV_OPEN.has(p.v) && !(p.v === "else")) || (p.t === "op" && (p.v === ")" || p.v === "]" || p.v === "}")));
        if (!valueEnd) { stack.push({ ch: "kw", kind: "block", name: null, named: false }); if (v === "while" || v === "until") loopDo = true; }
        continue;
      }
      if (v === "do") { if (loopDo) loopDo = false; else stack.push({ ch: "kw", kind: "block", name: null, named: false }); continue; }
      if (v === "alias" || v === "undef") { let k = i + 1; let n = 0; while (T[k] && T[k].t !== "nl" && n < (v === "alias" ? 2 : 1)) { k += 1; n += 1; } i = k - 1; continue; }
      if (RUBY_STRUCT.has(v)) continue;
      // ── mixins: include / extend / prepend as a direct statement of a class or module body ──
      if (RUBY_MIXINS.has(v) && isStmtStart(i)) {
        const e = stack[stack.length - 1];
        if (e && e.ch === "kw" && (e.kind === "class" || e.kind === "module") && e.name) {
          let j = i + 1;
          if (isOp(T[j], "(")) j += 1;
          for (;;) {
            const cp = constPath(j);
            if (!cp) break;
            const after = T[cp.after];
            if (after && (isOp(after, ",") || after.t === "nl" || isOp(after, ";") || isOp(after, ")"))) C.ext(e.name, cp.last.v, "mixin", cp.last.s, after.e);
            else if (!after) { const end = C.endAt(cp.after); C.ext(e.name, cp.last.v, "mixin", cp.last.s, end); }
            if (isOp(after, ",")) { j = cp.after + 1; continue; }
            break;
          }
        }
      }
      // ── requires ──
      if (RUBY_REQUIRES.has(v)) {
        let j = i + 1;
        if (isOp(T[j], "(")) j += 1;
        if (T[j]?.t === "str" && !T[j].heredoc) C.imp(T[j].val, T[j].s, T[j].e);
      }
    }
    // ── calls ──
    if (RUBY_NONCALL.has(v)) continue;
    const caller = rubyCaller(stack);
    if (member) { if (/^[a-z_]/.test(v) || /^[^\x00-\x7f]/.test(v)) C.call(caller, t, nx ? nx.e : t.e); continue; }
    if (scoped) { if (lowerStart(v)) C.call(caller, t, nx ? nx.e : t.e); continue; }
    if (!lowerStart(v) && !/^[^\x00-\x7f]/.test(v)) continue; // constants and sigiled names are not callees
    if (v.startsWith("@") || v.startsWith("$")) continue;
    if (C.refused(v)) continue;
    if (isOp(prev, "def")) continue;
    if (isOp(nx, "(") && nx.s === t.e) { C.call(caller, t, nx.e); continue; }
    if (/[?!]$/.test(v)) { C.call(caller, t, nx ? nx.e : t.e); continue; }
    // command call: `name arg` / `name do` / `name { }`
    if (nx && nx.s > t.e) {
      const stmt = isStmtStart(i);
      const isKwWord = nx.t === "id" && RUBY_STRUCT.has(nx.v) && !RUBY_VALUE_KW.has(nx.v);
      const tight = (u) => u && T[i + 2] && T[i + 2].s === u.e; // the operator hugs its operand: `f *xs`, `f &blk`
      const argStart = nx.t === "str" || nx.t === "sym" || nx.t === "num" || nx.t === "re"
        || (nx.t === "id" && /^[A-Z]/.test(nx.v))
        || isOp(nx, "->")
        || (isOp(nx, "::") && T[i + 2]?.t === "id")
        || (nx.t === "id" && !isKwWord && nx.v !== "do") // two adjacent words are only valid Ruby as `command argument`
        || (stmt && isOp(nx, "[") && nx.s > t.e)
        || ((isOp(nx, "*") || isOp(nx, "**") || isOp(nx, "&")) && tight(nx) && nx.s > t.e)
        || (isId(nx, "do") && !loopDo && (stmt || isOp(prev, "="))) // a `do` block belongs to the outermost command on the line
        || isOp(nx, "{");
      if (argStart) C.call(caller, t, nx.e);
    }
  }
}
function rubyCaller(stack) {
  for (let k = stack.length - 1; k >= 0; k--) { const e = stack[k]; if (e.ch === "kw" && e.named && e.name) return e.name; }
  return "<top>";
}

// ═══════════════════════════════ ENTRY ═══════════════════════════════
const READERS = { python: readPython, javascript: readJavaScript, java: readJava, c: readC, go: readGo, ruby: readRuby };

export function readEdges({ text, language, fileName = "", keywords = null, final = true } = {}) {
  const lang = resolveLanguage(language, fileName);
  if (!lang) return { language: null, calls: [], imports: [], extends: [], declared: [], consumed: 0, disclosure: { error: `no edge reader for ${language ?? fileName}` } };
  const src = String(text ?? "");
  const kw = keywords ? (keywords instanceof Set ? keywords : new Set(keywords)) : null;
  const T = lexAll(src, lang, final);
  const C = new Ctx({ text: src, lang, keywords: kw, final, T });
  try { READERS[lang](C); } catch (e) { return { language: lang, calls: C.calls, imports: C.imports, extends: C.extends, declared: C.declared, consumed: 0, disclosure: { error: `reader error: ${e.message}` } }; }
  const consumed = final ? src.length : (T.length ? T[T.length - 1].e : 0);
  return {
    language: lang, calls: C.calls, imports: C.imports, extends: C.extends, declared: C.declared, consumed,
    disclosure: {
      version: EDGES_VERSION, tokens: T.length,
      keywordPrior: kw ? `${kw.size} hard keywords refuse a bare callee` : "none: every bare `name (` is admitted (ablation / typed gap)",
      causal: "single left-to-right pass, bounded local lookahead; end = where the evidence completes",
      final,
    },
  };
}
