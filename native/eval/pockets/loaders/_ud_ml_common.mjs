// eval/pockets/loaders/_ud_ml_common.mjs — shared helpers of the "ud" and "ml" loaders (underscore: ignored by run-atlas importAll).
// Pure Node ESM. No Math.random, no Date: same input gives byte-identical pockets.
import { validate, sha256, MAX_TOKENS } from "../lib/pocket.mjs";

/** Word token: letters / marks / numbers, apostrophes allowed INSIDE a word. Applied to NFC text (lowercased by tokenise). */
const WORD = /[\p{L}\p{M}\p{N}\u200c\u200d]+(?:['’ʼ][\p{L}\p{M}\p{N}\u200c\u200d]+)*/gu;
export const lc = (s) => s.normalize("NFC").toLowerCase().normalize("NFC");
/** A token is kept iff it holds at least one letter (this drops pure numbers and pure symbols/punctuation). */
export const keepToken = (w) => /\p{L}/u.test(w);
export const apos = (w) => w.replace(/[’ʼ]/g, "'");

/** tokenise(text, intern): lowercase NFC word tokens of a string; `intern` is a function from interner() that shares string objects (memory). */
export function tokenise(text, intern = null) {
  const out = [];
  for (const m of lc(text).matchAll(WORD)) {
    const w = apos(m[0]).replace(/^[\u200c\u200d]+|[\u200c\u200d]+$/g, "");
    if (!keepToken(w)) continue;
    out.push(intern ? intern(w) : w);
  }
  return out;
}
export const interner = () => { const m = new Map(); return (w) => m.get(w) ?? (m.set(w, w), w); };

/** Character-chunk tokens for scripts without spaces. grain "bigram" = NON-overlapping 2-character chunks taken from the start of each clause (a lone final
 *  character is kept as a 1-character token); "unigram" = one token per character. Overlapping bigrams are not used: adjacent tokens would share a
 *  character, a deterministic artefact that every order statistic would read as structure. Only letters count (no marks stripped from the base letter). */
export function charTokens(text, grain = "bigram", intern = null) {
  const clauses = lc(text).split(/[^\p{L}\p{M}]+/u).filter(Boolean), out = [];
  const T = (w) => (intern ? intern(w) : w);
  for (const c of clauses) {
    const cs = [...c].reduce((a, ch) => { if (/\p{M}/u.test(ch) && a.length) a[a.length - 1] += ch; else a.push(ch); return a; }, []);
    if (grain === "unigram") for (const ch of cs) out.push(T(ch));
    else for (let i = 0; i < cs.length; i += 2) out.push(T(cs.slice(i, i + 2).join("")));
  }
  return out;
}

/** Document ids for n units: consecutive blocks of `size` units; when that would give fewer than `minDocs` documents the block is shrunk (>= 10 units). */
export function blockDocs(n, size = 100, minDocs = 24) {
  let s = size; if (n / s < minDocs) s = Math.max(10, Math.floor(n / minDocs));
  return { docOf: Array.from({ length: n }, (_, k) => Math.floor(k / s)), blockSize: s };
}

/** Cap a pocket at `max` tokens by taking WHOLE documents in the order of sha256(id:docIndex); the kept documents stay in original order and are renumbered 0.. */
export function capByHash(id, units, docOf, max = MAX_TOKENS) {
  const docs = [];
  units.forEach((u, k) => { const d = docOf[k]; if (!docs.length || docs[docs.length - 1].d !== d) docs.push({ d, from: k, to: k, tokens: 0 }); const e = docs[docs.length - 1]; e.to = k; e.tokens += u.length; });
  const total = docs.reduce((a, d) => a + d.tokens, 0);
  let keep = docs, n = total;
  if (total > max) {
    const order = docs.slice().sort((a, b) => { const x = sha256(`${id}:${a.d}`), y = sha256(`${id}:${b.d}`); return x < y ? -1 : x > y ? 1 : 0; });
    const sel = new Set(); n = 0;
    for (const d of order) if (n + d.tokens <= max) { sel.add(d); n += d.tokens; }
    keep = docs.filter((d) => sel.has(d));
  }
  const U = [], D = [];
  keep.forEach((d, i) => { for (let k = d.from; k <= d.to; k++) { U.push(units[k]); D.push(i); } });
  return { units: U, docOf: D, cap: { max, docsBefore: docs.length, docsKept: keep.length, tokensBefore: total, tokensKept: n, capped: total > max } };
}

/** scriptOf(units): dominant Unicode script label (latn cyrl arab hebr grek hani jpan hang deva armn geor taml telu ...) from the letters of the first 4000 tokens. */
export function scriptOf(units) {
  const R = { latn: /\p{Script=Latin}/u, cyrl: /\p{Script=Cyrillic}/u, arab: /\p{Script=Arabic}/u, hebr: /\p{Script=Hebrew}/u, grek: /\p{Script=Greek}/u, hani: /\p{Script=Han}/u,
    kana: /[\p{Script=Hiragana}\p{Script=Katakana}]/u, hang: /\p{Script=Hangul}/u, deva: /\p{Script=Devanagari}/u, armn: /\p{Script=Armenian}/u, geor: /\p{Script=Georgian}/u,
    taml: /\p{Script=Tamil}/u, telu: /\p{Script=Telugu}/u, ethi: /\p{Script=Ethiopic}/u, thai: /\p{Script=Thai}/u };
  const c = {}; let seen = 0;
  for (const u of units) { for (const w of u) { for (const ch of w) { if (!/\p{L}/u.test(ch)) continue; for (const k in R) if (R[k].test(ch)) { c[k] = (c[k] ?? 0) + 1; break; } } if (++seen >= 4000) break; } if (seen >= 4000) break; }
  const top = Object.entries(c).sort((a, b) => b[1] - a[1]);
  if (!top.length) return null;
  if (c.kana && c.hani && (c.kana + c.hani) / top.reduce((a, b) => a + b[1], 0) > 0.8) return "jpan";
  return top[0][0];
}
