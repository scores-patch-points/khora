// loaders/_cd_util.mjs — shared helpers of loader group "cd" (code, notation, misc). Underscore prefix: run-atlas.mjs ignores this file; codemisc.mjs imports it.
import fs from "node:fs";
import path from "node:path";
import { sha256, validate, tokenCount, MAX_TOKENS } from "../lib/pocket.mjs";

export const GROUP = "cd";
export const nfcLower = (s) => s.normalize("NFC").toLowerCase().normalize("NFC");
// Scripts written without spaces: a token containing one of these characters is DROPPED from code pockets (never bigram-split), and the drop is counted.
export const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}\p{Script=Tibetan}]/u;
const WORD = /[\p{L}\p{M}\p{N}_]+/gu;
export const MAX_TOKEN_CHARS = 64, MAX_LINE_CHARS = 1000;

/** Fresh drop counters (summed into the manifest). */
export const newStats = () => ({ lines: 0, emptyLines: 0, overlongLines: 0, tokens: 0, droppedNumeric: 0, droppedUnspaced: 0, droppedLong: 0, droppedPunct: 0 });

/** Code tokenisation of one physical line: identifiers/keywords/word-like literals = maximal runs of letters, marks, digits and underscore; lowercased NFC;
 *  NOT split on camelCase or snake_case; tokens that start with a digit (numeric literals: 0xff, 1e5, 10ul) are dropped; tokens made only of underscores/punctuation are dropped;
 *  tokens containing an unspaced-script character (Han, kana, Thai ...) or longer than 64 characters (blobs, hashes) are dropped. */
function accept(raw, st) {
  if (/^\p{N}/u.test(raw)) { st.droppedNumeric++; return null; }
  if (UNSPACED.test(raw)) { st.droppedUnspaced++; return null; }
  if (raw.length > MAX_TOKEN_CHARS) { st.droppedLong++; return null; }
  const w = nfcLower(raw);
  if (!w || w !== w.toLowerCase() || /^[\p{P}_\p{S}]+$/u.test(w) || /^\p{N}+$/u.test(w)) { st.droppedPunct++; return null; }
  return w;
}
export function codeLine(line, st) {
  const out = [];
  if (line.length > MAX_LINE_CHARS) { st.overlongLines++; return out; }
  for (const raw of line.match(WORD) ?? []) { const w = accept(raw, st); if (w) out.push(w); }
  return out;
}
const PROSE_WORD = /[\p{L}\p{M}\p{N}_]+(?:['\u2019][\p{L}\p{M}]+)*/gu;
/** Prose tokenisation of one sentence/line: like codeLine but an apostrophe between letters stays inside the word (don't). */
export function proseLine(line, st) {
  const out = [];
  for (const raw of line.match(PROSE_WORD) ?? []) { const w = accept(raw, st); if (w) out.push(w); }
  return out;
}
/** Prose text -> sentence units: paragraphs (blank-line separated) are kept with their line breaks, then split after . ! ? followed by whitespace. A "sentence" of more than 150 tokens that
 *  spans several source lines (changelog bullets, badge rows, author lists without punctuation) is split into one unit per source line instead. Fenced code blocks (```) are skipped. */
export const MAX_SENT = 150;
export function proseSentences(text, st = newStats()) {
  const units = []; let fence = false; const paras = []; let cur = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    if (!line.trim()) { if (cur.length) paras.push(cur.join("\n")); cur = []; } else cur.push(line.trim());
  }
  if (cur.length) paras.push(cur.join("\n"));
  const push = (t) => { st.lines++; if (t.length) { units.push(t); st.tokens += t.length; } else st.emptyLines++; };
  for (const para of paras) for (const sent of para.split(/(?<=[.!?])\s+(?=\S)/)) {
    const t = proseLine(sent, st);
    if (t.length > MAX_SENT && sent.includes("\n")) { st.lines--; for (const l of sent.split("\n")) push(proseLine(l, newStats())); }
    else push(t);
  }
  return units;
}

export const sumStats = (list) => list.reduce((a, s) => { for (const k of Object.keys(a)) a[k] += s[k] ?? 0; return a; }, newStats());

/** Tokenise a text into units of tokens, one unit per non-empty physical line. */
export function codeText(text, st = newStats()) {
  const units = [];
  for (const line of text.split(/\r\n|\n|\r/)) {
    st.lines++;
    const t = codeLine(line, st);
    if (t.length) { units.push(t); st.tokens += t.length; } else st.emptyLines++;
  }
  return units;
}

/** Uppercase letters carry meaning in some notations (SMILES aromatic vs aliphatic, SAN piece vs pawn, ABC octave). validate() demands lowercase tokens, so each uppercase letter X becomes
 *  U+00B7 + x: a bijective renaming; the statistics see only opaque strings. */
export const markCase = (s) => s.normalize("NFC").replace(/\p{Lu}/gu, (c) => "·" + c.toLowerCase());

export const readText = (f) => fs.readFileSync(f, "utf8");
export const sortedFiles = (dir, pred = () => true) => fs.readdirSync(dir).filter(pred).sort().map((f) => path.join(dir, f));

/** Consecutive blocks of `size` units -> array of unit-arrays (documents for one long text). */
export function blocksOf(units, size) { const out = []; for (let i = 0; i < units.length; i += size) out.push(units.slice(i, i + size)); return out; }

/** Hash order of candidate documents: sha256(`${id}:${docIndex}`). */
export const hashOrder = (id, n) => Array.from({ length: n }, (_, i) => i).map((i) => [sha256(`${id}:${i}`), i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map((x) => x[1]);

/** Take WHOLE documents in hash order until the cap is reached (never truncate a document). cands: array; loadDoc(cand, index) -> units (array of token arrays) or [].
 *  A document that does not fit is skipped; after 40 consecutive misses (or 97% of the cap) the scan stops. Chosen documents are returned in candidate order. */
export function takeDocs(id, cands, loadDoc, cap = MAX_TOKENS) {
  const chosen = []; let total = 0, miss = 0, considered = 0, skippedBig = 0;
  for (const i of hashOrder(id, cands.length)) {
    const d = loadDoc(cands[i], i); considered++;
    const n = tokenCount(d);
    if (!n) continue;
    if (total + n > cap) { skippedBig++; if (++miss >= 40) break; continue; }
    chosen.push([i, d]); total += n; miss = 0;
    if (total >= cap * 0.97) break;
  }
  chosen.sort((a, b) => a[0] - b[0]);
  const units = [], docOf = [], docKeys = [];
  chosen.forEach(([i, d], k) => { docKeys.push(i); for (const u of d) { units.push(u); docOf.push(k); } });
  return { units, docOf, docKeys, considered, candidates: cands.length, skippedBig };
}

/** Assemble and validate a pocket. */
export function makePocket({ id, register, language, script, units, docOf, meta }) {
  const pool = new Map(); // intern token strings: a 300k-token pocket then holds only its vocabulary as distinct string objects
  units = units.map((u) => u.map((w) => { let c = pool.get(w); if (c === undefined) { c = w; pool.set(w, c); } return c; }));
  const p = { id, group: GROUP, register, language, script, units, docOf, meta };
  validate(p);
  return p;
}
export const entry = (id, build) => ({ id, build });
