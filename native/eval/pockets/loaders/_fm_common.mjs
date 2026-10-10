// loaders/_fm_common.mjs — shared helpers for group "fm" (formal registers: scripture, legal, academic, encyclopedic).
// Underscore-prefixed: run-atlas.mjs ignores it. Pure Node ESM, deterministic (no Math.random, no Date).
import fs from "node:fs";
import { sha256, MAX_TOKENS, MIN_TOKENS, MIN_DOCS, tokenCount, validate } from "../lib/pocket.mjs";

export const ETHOS = "/Users/mlacy/Documents/3.0/ethos";
export const GROUP = "fm";
export const MIN_PIECE = 1200; // smallest piece target for small pockets
export const MAXDOC = 6000; // a natural document longer than this many tokens is cut into equal consecutive pieces (cut at unit boundaries)

export const read = (f) => fs.readFileSync(f, "utf8").replace(/^﻿/, "");
export const lsSync = (d) => fs.readdirSync(d).sort();

// ---------- tokenisation ----------
// word = run of letters/marks/numbers, apostrophes (' ’ ʼ) and Hebrew geresh/gershayim allowed BETWEEN word characters. Lowercase, NFC. Tokens without a letter are dropped (pure numbers, lone marks).
const WORD = /[\p{L}\p{M}\p{N}]+(?:['\u2019\u02BC\u05F3\u05F4][\p{L}\p{M}\p{N}]+)*/gu;
const HASLETTER = /\p{L}/u;
const NOSPACE = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{M}]+$/u;
/** makeTokenizer({strip, pre, bigram}): strip = RegExp of characters deleted BEFORE tokenising (they do not split words); pre = string->string; bigram = true => runs written without
 *  word spaces (Han, kana, Thai, Lao, Khmer, Myanmar) become overlapping character bigrams (a run of one character stays a unigram). */
export function makeTokenizer({ strip = null, pre = null, bigram = false } = {}) {
  return (s) => {
    let t = s.normalize("NFC");
    if (pre) t = pre(t);
    if (strip) t = t.replace(strip, "");
    t = t.toLowerCase().normalize("NFC");
    const out = [];
    for (const m of t.matchAll(WORD)) {
      const w = m[0];
      if (!HASLETTER.test(w)) continue;
      if (bigram && NOSPACE.test(w)) {
        const cs = [...w].filter((c) => /\p{L}/u.test(c));
        if (cs.length === 1) out.push(cs[0]); else for (let i = 0; i + 1 < cs.length; i++) out.push(cs[i] + cs[i + 1]);
      } else out.push(w);
    }
    return out;
  };
}
export const tokDefault = makeTokenizer();

// ---------- segmentation ----------
export const SENT_SPLIT = /(?<=[.!?…。！？؟۔।॥׃])\s+|\n+/u;
/** split free text into sentence-like strings: newline always ends a unit; . ! ? … 。！？ ؟ ۔ । ॥ ׃ followed by whitespace ends a unit. */
export const sentencesOf = (text) => text.split(SENT_SPLIT).map((s) => s.trim()).filter(Boolean);
/** tokenise strings into non-empty token arrays */
export const unitsOf = (strs, tok = tokDefault) => { const o = []; for (const s of strs) { const t = tok(s); if (t.length) o.push(t); } return o; };

// ---------- markdown / markup cleaning (formatting residue, not language) ----------
export function stripFrontmatter(t) { return t.startsWith("---") ? t.replace(/^---\n[\s\S]*?\n---\n?/, "") : t; }
export function cleanMarkdown(t, { dropHeadings = false, dropCode = true, dropMath = false, dropTables = false } = {}) {
  let s = t.replace(/\r/g, "");
  if (dropCode) s = s.replace(/```[\s\S]*?```/g, "\n");
  if (dropMath) s = s.replace(/\$\$[\s\S]*?\$\$/g, " ").replace(/\$[^$\n]{1,200}\$/g, " ");
  s = s.replace(/<[^>\n]{1,200}>/g, " ").replace(/&nbsp;|&#8203;|&amp;|&quot;|&lt;|&gt;/g, " ");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/https?:\/\/\S+/g, " ").replace(/www\.\S+/g, " ");
  s = s.replace(/^\s*[-*_]{3,}\s*$/gm, "");
  if (dropHeadings) s = s.replace(/^#{1,6}\s.*$/gm, "");
  else s = s.replace(/^#{1,6}\s+/gm, "");
  if (dropTables) s = s.replace(/^\s*\|.*$/gm, "");
  s = s.replace(/^\s*[-*+]\s+/gm, "").replace(/[*_`~]+/g, " ");
  return s;
}

// ---------- documents -> pocket ----------
// A source build() returns NATURAL DOCUMENTS = string[][] (one array of unit strings per document: verse, sentence or line). Tokenisation is lazy: only the documents that survive the cap are tokenised.
//  1. a natural document longer than ~MAXDOC tokens (estimated from characters per token on a sample) is cut into k equal consecutive pieces (by character mass, at unit boundaries)
//  2. pieces are indexed in source order (docIndex); if the pocket exceeds MAX_TOKENS, pieces are taken WHOLE in sha256(id:docIndex) order and the scan STOPS at the first piece that would exceed the cap
//  3. kept pieces return to source order and are renumbered 0..n-1 (docOf)
export const SKIPPED = []; // filled at build time: {id, why}
export function finalize(spec, naturalDocs, extraMeta = {}) {
  const tok = spec.tok ?? tokDefault;
  const labelsIn = naturalDocs.labels ?? null; // optional: naturalDocs.labels[i] = human label of natural doc i (carried into meta.docLabels)
  let nat = [], natLabel = [];
  naturalDocs.forEach((d, i) => { const f = d.filter((s) => s && s.trim()); if (f.length) { nat.push(f); natLabel.push(labelsIn ? labelsIn[i] : null); } });
  if (spec.blockUnits) { // one long text: documents = consecutive blocks of ~blockUnits units (a short last block is merged into the previous one)
    const B = spec.blockUnits, out = [];
    for (const d of nat) { const ch = []; for (let i = 0; i < d.length; i += B) ch.push(d.slice(i, i + B)); if (ch.length > 1 && ch[ch.length - 1].length < B / 2) ch[ch.length - 2] = ch[ch.length - 2].concat(ch.pop()); out.push(...ch); }
    nat = out; natLabel = natLabel.length === nat.length ? natLabel : []; // blocks lose per-doc labels
  }
  let c = 0, t = 0;
  outer: for (const d of nat) for (const s of d) { c += s.length; t += tok(s).length; if (t >= 3000 || c > 60000) break outer; }
  const cpt = t ? c / t : 6, totalChars = nat.reduce((a, d) => a + d.reduce((x, s) => x + s.length, 0), 0);
  // piece size: MAXDOC tokens, but small pockets get smaller pieces so that they can reach >= ~40 documents (never below MIN_PIECE tokens)
  const pieceTok = Math.min(MAXDOC, Math.max(MIN_PIECE, Math.round(totalChars / cpt / 40))), maxChars = Math.max(1000, Math.round(pieceTok * cpt));
  const pieces = [], pieceSrc = [];
  for (const [di, d] of nat.entries()) {
    const C = d.reduce((a, s) => a + s.length, 0);
    if (C <= maxChars || spec.blockUnits) { pieces.push(d); pieceSrc.push(di); continue; } // blockUnits pockets: the blocks ARE the documents, never cut again
    const k = Math.ceil(C / maxChars), target = C / k; let cur = [], acc = 0, made = 0;
    for (const s of d) { cur.push(s); acc += s.length; if (made < k - 1 && acc >= target * (made + 1)) { pieces.push(cur); cur = []; made++; } }
    if (cur.length) pieces.push(cur);
    while (pieceSrc.length < pieces.length) pieceSrc.push(di);
  }
  const hk = pieces.map((_, i) => sha256(`${spec.id}:${i}`));
  const order = pieces.map((_, i) => i).sort((a, b) => (hk[a] < hk[b] ? -1 : hk[a] > hk[b] ? 1 : a - b));
  const cache = new Map(), unitsOfPiece = (i) => { let u = cache.get(i); if (!u) { u = unitsOf(pieces[i], tok); cache.set(i, u); } return u; };
  const take = []; let acc = 0, capped = false;
  for (const i of order) { const u = unitsOfPiece(i), n = tokenCount(u); if (!n) continue; if (acc + n > MAX_TOKENS) { capped = true; break; } take.push(i); acc += n; }
  take.sort((a, b) => a - b);
  const units = [], docOf = [];
  take.forEach((pi, k) => { for (const u of unitsOfPiece(pi)) { units.push(u); docOf.push(k); } });
  const estTotal = Math.round(pieces.reduce((a, d) => a + d.reduce((x, s) => x + s.length, 0), 0) / cpt);
  const p = { id: spec.id, group: GROUP, register: spec.register, language: spec.language, script: spec.script, units, docOf,
    meta: { tokenisation: spec.tokenisation, docDef: spec.docDef, source: spec.source, notes: spec.notes ?? "", ...(spec.extra ?? {}), ...extraMeta,
      ...(natLabel.length ? { docLabels: take.map((pi) => natLabel[pieceSrc[pi]]) } : {}), counts: { naturalDocs: nat.length, pieces: pieces.length, pieceTokensTarget: pieceTok, charsPerTokenEst: Math.round(cpt * 100) / 100, tokensBeforeCapEst: estTotal, capped, docsKept: take.length, tokensKept: acc } } };
  const v = validate(p);
  if (v.thin) { SKIPPED.push({ id: spec.id, why: `thin after build: ${v.tokens} tokens, ${v.docs} docs (minimum ${MIN_TOKENS} tokens and ${MIN_DOCS} docs)` }); return null; }
  return p;
}
/** build a loader: specs = [{id, register, language, script, tok, tokenisation, docDef, source, notes, extra, build: () => string[][]}] */
export function makeLoad(specs) {
  const load = async (onlyIds = null) => {
    const out = [];
    for (const s of specs) { if (onlyIds && !onlyIds.includes(s.id)) continue; const p = finalize(s, s.build()); if (p) out.push(p); }
    return out;
  };
  return { load, specs };
}

// ---------- hard-wrapped text (pdftotext / OCR / markdown books) ----------
/** blank lines separate paragraphs; single newlines inside a paragraph are spaces; a hyphen at a line end followed by a letter is removed (pdf hyphenation); sentences end at . ! ? … + whitespace */
export function sentencesWrapped(text) {
  const out = [];
  for (const para of text.replace(/\r/g, "").replace(/(\p{L})-\n\s*(\p{L})/gu, "$1$2").split(/\n\s*\n/)) {
    const flat = para.replace(/\s*\n\s*/g, " ").trim(); if (!flat) continue;
    for (const s of flat.split(/(?<=[.!?…])\s+/u)) { const t = s.trim(); if (t) out.push(t); }
  }
  return out;
}
/** drop lines made mostly of single characters (pdf running heads such as "A N I N T R O D U C T I O N" and OCR confetti): >= 5 whitespace tokens of which > 50% have length 1 */
export function dropConfettiLines(text) {
  return text.split("\n").filter((l) => { const w = l.trim().split(/\s+/); if (w.length < 5) return true; return w.filter((x) => [...x].length === 1).length / w.length <= 0.5; }).join("\n");
}
const ENT = { nbsp: " ", amp: "&", quot: '"', lt: "<", gt: ">", apos: "'" };
export const decodeEntities = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? " ");
