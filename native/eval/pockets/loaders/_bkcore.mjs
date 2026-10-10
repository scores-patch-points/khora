// loaders/_bkcore.mjs — helpers of the "bk" (books) pocket group. Leading underscore: run-atlas.mjs ignores this file; books.mjs imports it.
// Everything here is deterministic (no Math.random, no Date) and uses only node built-ins.
import fs from "node:fs";
import path from "node:path";
import { sha256, MAX_TOKENS } from "../lib/pocket.mjs";

export const ETHOS = "/Users/mlacy/Documents/3.0/ethos";

/** Read a text file: strip BOM, CRLF/CR -> LF, NFC. */
export function readText(rel) {
  let s = fs.readFileSync(path.join(ETHOS, rel), "utf8");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s.replace(/\r\n?/g, "\n").normalize("NFC");
}

/** Leading metadata: YAML front matter (--- ... ---) or a "Title:" header block that ends at the first blank line. */
export function stripFront(s) {
  const y = s.match(/^---\n([\s\S]*?)\n---\n/);
  if (y) {
    const meta = {};
    for (const l of y[1].split("\n")) { const m = l.match(/^([A-Za-z_]+):\s*(.*)$/); if (m) meta[m[1]] = m[2]; }
    return { text: s.slice(y[0].length), front: meta };
  }
  if (/^Title:/.test(s)) {
    const k = s.search(/\n[ \t]*\n/);
    if (k > 0) return { text: s.slice(k), front: { header: s.slice(0, k).slice(0, 200) } };
  }
  return { text: s, front: null };
}

/** Project-Gutenberg boilerplate: START/END markers, "Produced by" credit paragraphs near the top, trailing "End of Project Gutenberg" notices. */
export function stripPG(s) {
  const st = s.match(/\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (st) s = s.slice(st.index + st[0].length);
  const en = s.search(/\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG/i);
  if (en >= 0) s = s.slice(0, en);
  const tail = s.search(/\n[^\n]*end of (?:the )?project gutenberg/i);
  if (tail >= 0 && tail > s.length * 0.5) s = s.slice(0, tail);
  const head = s.slice(0, 9000).replace(/(^|\n)[ \t]*(?:Produced by|E-?text (?:prepared|produced)|Transcribed from|This (?:e-?text|file) was produced|Updated editions will|HTML version by|Prepared by)[\s\S]*?(?:\n[ \t]*\n|$)/gi, "\n");
  return head + s.slice(9000);
}

/** Markup and artefacts that are not running text. */
export function scrub(s, extra = []) {
  s = s.replace(/\[Illustration[^\]]*\]/gi, " ").replace(/(?:https?:\/\/|www\.)\S+/gi, " ");
  s = s.replace(/^[ \t]*[+|][^\n]*[+|][ \t]*$/gm, " ");                                   // ascii boxes / tables of transcriber notes
  s = s.replace(/\[(?:HW|TR|TN|Date Stamp|Transcriber)[^\]]*\]/gi, " ");                    // editorial brackets of the WPA volumes and other transcriptions
  for (const re of extra) s = s.replace(re, " ");
  return s;
}

/** Optional cut: keep from the first match of `start` (inclusive) and up to the last (endLast) or first match of `end`. */
export function cut(s, { start = null, end = null, endLast = false } = {}) {
  if (start) { const m = s.search(start); if (m >= 0) s = s.slice(m); }
  if (end) {
    let k = -1;
    if (endLast) { const re = new RegExp(end.source, end.flags.replace("g", "") + "g"); let m; while ((m = re.exec(s))) k = m.index; } else k = s.search(end);
    if (k > 0) s = s.slice(0, k);
  }
  return s;
}

/** Tokenisation: Unicode letters / marks / numbers, apostrophes only inside words, lowercase NFC. No punctuation tokens, no pure-number tokens. */
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;
const INTERN = new Map();   // one string object per distinct token: a full atlas run holds ~10M tokens of this group in memory
const intern = (w) => { const x = INTERN.get(w); if (x !== undefined) return x; INTERN.set(w, w); return w; };
export function tokenise(str) {
  const out = [];
  for (const m of str.matchAll(WORD)) {
    const w = m[0].replace(/’/g, "'").normalize("NFC").toLowerCase();
    if (/\p{L}/u.test(w) && w === w.toLowerCase()) out.push(intern(w));
  }
  return out;
}

/** Data-driven abbreviation set (Punkt-like, case-blind): short word types that are almost always followed by a full stop ("mr.", "st.", initials). A stop after them does not end a sentence. */
export function abbrevSet(text, { maxLen = 5, minDot = 5, ratio = 0.85 } = {}) {
  const dot = new Map(), all = new Map();
  for (const m of text.matchAll(/(?<![\p{L}\p{M}'’])([\p{L}\p{M}]{1,5})(\.?)(?![\p{L}\p{M}\p{N}'’])/gu)) {
    const w = m[1].toLowerCase();
    all.set(w, (all.get(w) || 0) + 1);
    if (m[2]) dot.set(w, (dot.get(w) || 0) + 1);
  }
  const set = new Set();
  for (const [w, d] of dot) if (w.length <= maxLen && d >= minDot && d / all.get(w) >= ratio) set.add(w);
  return set;
}

/** Back matter: an INDEX / GLOSSARY / ERRATA heading after 85% of the text, or any "Transcriber's notes" after 95%, ends the text. */
export function trimBack(s) {
  const re = /\n[ \t\u25cf\u25cb]*(?:(?:GENERAL |ALPHABETICAL )?INDEX(?: OF [^\n]{0,60})?|GLOSSARY|ERRATA|TRANSCRIBER['\u2019]?S? NOTES?|FOOTNOTES? TO THE INDEX)[ \t.:]*(?=\n)/gi;
  let m, k = -1;
  while ((m = re.exec(s))) if (m.index > s.length * 0.85) { k = m.index; break; }
  const t = s.slice(Math.floor(s.length * 0.95)).search(/transcriber['\u2019]?s?\s+(?:notes?|corrections?)/i);
  if (t >= 0) { const at = Math.floor(s.length * 0.95) + t; if (k < 0 || at < k) k = at; }
  return k > 0 ? s.slice(0, k) : s;
}

/** Skip front matter (title pages, informant lists) up to the first blank-line block that looks like running prose: >= minWords words, >= 2 sentence stops, >= 3 lines, >= 60% lower-case-initial words (loader-side cleaning only; no statistic sees case). */
export function startProse(s, minWords = 40) {
  let pos = 0;
  for (const b of s.split(/\n[ \t]*\n+/)) {
    const k = s.indexOf(b, pos); pos = k + b.length;
    if (/transcriber/i.test(b)) continue;
    const words = b.match(/\p{L}[\p{L}'\u2019]*/gu) || [];
    if (words.length >= minWords && (b.match(/[.!?]/g) || []).length >= 2 && b.split("\n").length >= 3 && words.filter((w) => /^\p{Ll}/u.test(w)).length / words.length >= 0.6) return s.slice(k);   // lists of names are mostly capitalised, prose is not
  }
  return s;
}
