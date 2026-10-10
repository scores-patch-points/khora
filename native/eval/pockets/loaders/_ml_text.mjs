// eval/pockets/loaders/_ml_text.mjs — generic plain-text pocket builder for loaders/ml.mjs (underscore: ignored by run-atlas). Structure-only cleaning:
// no word lists, no capital letters, no POS information; cleaning removes front matter, locator ids, markup and edit-link brackets only.
import fs from "node:fs";
import { tokenise, charTokens, interner, scriptOf } from "./_ud_ml_common.mjs";
import { sha256, MAX_TOKENS } from "../lib/pocket.mjs";

export const ML_ROOT = process.env.ML_ROOT ?? "/Users/mlacy/Documents/3.0/ethos/11-multi-language";
export const CJK_GRAIN = process.env.ML_CJK_GRAIN === "unigram" ? "unigram" : "bigram";

/** text of a file without BOM and without the leading '---' front-matter block (title/source/licence lines written by the fetch scripts) */
export function body(file) {
  let t = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
  if (t.startsWith("---\n")) { const k = t.indexOf("\n---\n", 4); if (k > 0) t = t.slice(k + 5); }
  return t;
}

export const CLEAN = {
  // Wikisource footnote lines start with an up-arrow (editorial apparatus, not text); applied to every file source
  fn: (t) => t.replace(/^[ \t]*↑.*$/gm, ""),
  // Sanskrit (GRETIL): verse locators such as 03,120.005c  R_4,012.007  bhn_11.1  ps_4,2.140  KSak_4.3a  ys_2.22
  san: (t) => t.replace(/^\d{1,2},\d{1,3}\.\d{3}[a-z]?[ \t]*/gm, "").replace(/\b[A-Za-z]{1,8}_\d[\w.,]*/g, " ").replace(/\(\s*\)/g, " "),
  // single-token bracketed notes: [ 1 ]  [1119]  [ recensere ]  [ 编辑 ]  [ edit ]
  br1: (t) => t.replace(/\[\s*[^\]\s]{1,24}\s*\]/g, " "),
  html: (t) => t.replace(/<[^>\n]{0,200}>/g, " "),
  // lines holding only Roman numerals / bars / digits / brackets (indexes of Wikisource pages)
  numlines: (t) => t.replace(/^[\s|ivxlcdmIVXLCDM0-9.,()\[\]\-–—]*$/gm, ""),
  // Wikisource-zh navigation lines mentioning the host wiki
  zhnav: (t) => t.split("\n").filter((l) => !/维基|維基|閲文言/u.test(l)).join("\n"),
  // Aozora Bunko markup: ruby 《…》, ｜ marks, ［＃…］ notes; header block (up to the second dashed rule) and the colophon (from 底本：)
  aozora: (t) => { const m = t.split(/^-{20,}$/m); let x = m.length >= 3 ? m.slice(2).join("\n") : t; const k = x.indexOf("底本："); if (k > 0) x = x.slice(0, k); return x.replace(/《[^》]*》/g, "").replace(/［＃[^］]*］/g, "").replace(/｜/g, ""); },
  // Fraktur OCR: a line ending in the double hyphen ⸗ continues in the next line
  dehyph: (t) => t.replace(/⸗\s*\n\s*/g, ""),
  // heading lines of Ganjoor poems "### 00 - title"
  hashhead: (t) => t.replace(/^#{1,6}\s.*$/gm, ""),
  // Project Gutenberg boilerplate if still present
  pg: (t) => { const a = t.search(/\*\*\* ?START OF [^\n]*\*\*\*/); if (a >= 0) t = t.slice(t.indexOf("\n", a) + 1); const b = t.search(/\*\*\* ?END OF [^\n]*\*\*\*/); return b >= 0 ? t.slice(0, b) : t; },
};

const END_LATIN = /([.!?…]+["'»”’)\]]*)(\s+)/g, END_GREEK = /([.!?…;·\u037e\u0387]+["'»”’)\]]*)(\s+)/g, END_AR = /([.!?…؟]+["'»”’)\]]*)(\s+)/g, END_CJK = /([。！？；!?]+[」』”’）]*)/g, END_DANDA = /([|।॥/.]+)(\s*)/g;
const ENDS = { latin: END_LATIN, greek: END_GREEK, arabic: END_AR, cjk: END_CJK, danda: END_DANDA };

/** split a text into units of strings. kind "line": every non-empty line is a unit; "sent": paragraphs, then sentences.
 *  wrap "hard" = paragraphs are blank-line separated and hard-wrapped (Gutenberg); "line" = one paragraph per line (Wikisource scrapes); "flow" = no usable paragraph marks, the whole text is one flow. */
export function unitStrings(text, s) {
  const lines = text.split(/\r?\n/), re0 = ENDS[s.ends ?? "latin"];
  const sentSplit = (p) => p.replace(re0, (m, a) => a + "\u0001").split("\u0001").map((x) => x.trim()).filter(Boolean);
  if (s.kind === "line") {
    let ls = lines.map((l) => l.trim());
    // drama scrapes: a speaker label is the short first line of a blank-line separated block that has further lines (layout rule, no names are read)
    if (s.speakers === "block-head") { ls = []; for (const b of text.split(/\r?\n[ \t]*\r?\n/)) { const bl = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean); if (bl.length >= 2 && bl[0].split(/\s+/).length <= 3) bl.shift(); ls.push(...bl); } }
    // a "line" longer than 400 characters is not a verse line (whole play or prose paragraph on one line): split it at sentence terminators
    return ls.filter(Boolean).flatMap((l) => (l.length > 400 ? sentSplit(l) : [l]));
  }
  const paras = s.wrap === "flow" ? [text.replace(/\s*\n\s*/g, " ").trim()] : s.wrap === "hard" ? text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()) : lines.map((l) => l.trim());
  const re = ENDS[s.ends ?? "latin"], out = [];
  for (const p of paras) { if (!p) continue; for (const x of p.replace(re, (m, a, b) => a + "\u0001").split("\u0001")) if (x.trim()) out.push(x.trim()); }
  return out;
}

/** build a plain-text pocket input (for finish()) from spec s = {id, files, register, language, kind, wrap, ends, clean[], tok, script?, block?, title, notes, speakers?}.
 *  Documents are consecutive blocks of `block` (100) SOURCE units, restarted at each file, numbered 0.. over the whole source; when the source is larger than the cap the documents are
 *  taken whole in the order of sha256(id:docIndex) and tokenised lazily until MAX_TOKENS is filled (a document that does not fit is skipped; 8 misses in a row stop the scan). */
export function buildText(s) {
  // rawUnits(): custom sources (tables, CoNLL, CSV) return string[][] (one array of unit strings per source file); otherwise the files are read and split here
  const raw = s.rawUnits ? s.rawUnits().map((us) => us.map((x) => { for (const c of s.clean ?? []) x = CLEAN[c](x); return x; })) : s.files.map((f) => { let t = CLEAN.fn(body(f)); for (const c of s.clean ?? []) t = CLEAN[c](t); return unitStrings(t, s); });
  const n = raw.reduce((a, u) => a + u.length, 0);
  if (!n) return { skip: "no units" };
  let size = s.block ?? 100; if (n / size < 24) size = Math.max(10, Math.floor(n / 24));
  const docs = []; for (const us of raw) for (let k = 0; k < us.length; k += size) docs.push(us.slice(k, k + size));
  const intern = interner(), tokDoc = (d) => d.map((x) => (s.tok === "char" ? charTokens(x, CJK_GRAIN, intern) : tokenise(x, intern))).filter((u) => u.length);
  const order = docs.map((d, i) => i).sort((a, b) => { const x = sha256(`${s.id}:${a}`), y = sha256(`${s.id}:${b}`); return x < y ? -1 : x > y ? 1 : 0; });
  const got = new Map(); let tot = 0, misses = 0, scanned = 0, allScanned = true;
  for (const i of order) {
    const us = tokDoc(docs[i]); scanned++; const t = us.reduce((a, u) => a + u.length, 0);
    if (tot + t <= MAX_TOKENS) { got.set(i, us); tot += t; misses = 0; } else if (++misses >= 8) { allScanned = false; break; }
  }
  const units = [], docOf = []; let nd = 0;
  for (const i of [...got.keys()].sort((a, b) => a - b)) if (got.get(i).length) { for (const u of got.get(i)) { units.push(u); docOf.push(nd); } nd++; }
  const lens = units.map((u) => u.length).sort((a, b) => a - b), q = (p) => lens[Math.min(lens.length - 1, Math.floor(p * lens.length))];
  const tokenisation = s.tok === "char" ? `char-${CJK_GRAIN}: no source word segmentation exists; ${CJK_GRAIN === "bigram" ? "NON-overlapping 2-character chunks taken from the start of each clause (a lone final character stays a 1-character token)" : "one token per character"}; clauses split at every non-letter; lowercase NFC`
    : "unicode words (letters, marks, digits; apostrophes inside a word kept; zero-width joiners kept inside a word); tokens without a letter dropped; lowercase NFC";
  const cap = { max: MAX_TOKENS, docsBefore: docs.length, docsKept: nd, tokensBefore: allScanned ? tot : null, tokensKept: tot, capped: !allScanned || got.size < docs.length, lazy: true, docsScanned: scanned };
  return { id: s.id, group: "ml", register: s.register, language: s.language, script: s.script ?? scriptOf(units), units, docOf, meta: {
    tokenisation: s.tokenisation ?? tokenisation, docDef: `consecutive blocks of ${size} source units, restarted at each source file (${s.files.length} file${s.files.length > 1 ? "s" : ""}); over-cap sources keep whole blocks in sha256(id:blockIndex) order`,
    source: s.files.map((f) => f.replace(ML_ROOT + "/", "")).join(" + "), notes: s.notes ?? null, title: s.title ?? null, unitKind: s.kind === "line" ? "line" : "sentence", cap,
    unitLen: { mean: +(tot / units.length).toFixed(2), p50: q(0.5), p99: q(0.99), max: lens[lens.length - 1] }, grainCharsPerToken: +(units.reduce((a, u) => a + u.reduce((b, w) => b + [...w].length, 0), 0) / Math.max(1, tot)).toFixed(3) } };
}
