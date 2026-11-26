// the-fold/codec-fold.mjs — MEET ANYTHING: find the codec by SURPRISE REDUCTION, as a distribution, folded in on demand.
//
// A codec is a language's UD grammar (janus/priors/ud-grammar-<code>.json.gz, committed or vendored on demand: nl-eot.mjs, THE-ISTHMUS.md). Its FORM TABLE is the vocabulary a text is scored against. The text is read under every candidate codec
// and the least surprising explains it best; the answer is a PROBABILITY DISTRIBUTION over codecs (not a language switch), so a short or mixed text is allowed to be unsure, and a text no held codec explains is a TYPED GAP that names the nearest.
//
// SURPRISE. A unigram escape model: a token in the codec's vocabulary costs log2(V / (1 - e)) bits, an unseen one log2(U / e) (a word drawn from a universe of U strings), V the vocabulary size. The constants e and U are the model's
// escape probability and universe, not a threshold: the choice is checked for insensitivity (scripts/measure-codec-fold.mjs). The posterior is 2^(-total bits), so more evidence sharpens it and three words leave it flat.
// FOLDED ON DEMAND. A cheap pass over each codec's ALPHABET (built once from the grammar and cached, a deletable derived index) prunes codecs that cannot write the text's script; only the surviving candidates have their vocabulary loaded,
// and loading is memoised. loadVocab.stats() says how many codecs were considered and how many were ever loaded.
// "NO CODEC EXPLAINS IT" IS MEASURED, not typed: the best codec's coverage must beat a NULL of the same text with the letters of every token shuffled (a seeded permutation). At or below the null's maximum: the typed gap, with the nearest codec.
// THE OPEN WORLD. The distribution above assumes the text's language is among the held codecs, which made a Traditional-Chinese text (the held Chinese codec is Simplified) choose Japanese at p = 1.00. So the answer also carries pOwn, the probability that the
// best codec is the text's own language GIVEN HOW MUCH OF THE TEXT IT EXPLAINS, calibrated on 65 Genesis editions (scripts/measure-codec-fold.mjs, codec-fold-calibration.json: logistic on coverage, class-balanced, modest: AUC 0.865, because a related language
// explains a neighbour's text, Norwegian under Danish reaching 0.76 to 0.80). pOwn below one half is the typed gap, with the nearest codec named. No calibration file: pOwn is null and a typed note says so.
// KNOWN GAP: unspaced scripts (Chinese, Japanese, Thai) have no calibrated open-world term, so Traditional Chinese (no held codec) still chooses Japanese at p = 1.00; it needs word or bigram surprise there (the todo test in codec-fold.test.mjs).
// NOT HERE (stated, not hidden): morphology beyond the form table (an inflected form the table never attested counts as unseen); a codec that exists but is not vendored yet (nl-eot.mjs loadGrammar vendors it, in the background); mixed-language text.
import { codecQuotes } from "../adapters/text/quote-frames.js";
import fs from "node:fs"; import path from "node:path"; import zlib from "node:zlib"; import os from "node:os"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PRIORS = process.env.KHORA_PRIORS_DIR ? path.resolve(process.env.KHORA_PRIORS_DIR) : path.resolve(HERE, "..", "..", "..", "janus", "priors");
const CAL_FILE = path.join(HERE, "codec-fold-calibration.json"); let CAL; const calibration = () => (CAL !== undefined ? CAL : (CAL = (() => { try { return JSON.parse(fs.readFileSync(CAL_FILE, "utf8")); } catch { return null; } })()));
export const ESCAPE = 0.1, UNIVERSE = 2 ** 22, NULL_SHUFFLES = 20, INDEX_CACHE = process.env.FOLD_CODEC_INDEX || path.join(os.homedir(), ".cache", "fold", "codec-index.json");
// a letter is a Unicode letter or a combining mark (Devanagari vowel signs, Arabic points), so caseless scripts count: Chinese, Japanese, Korean, Persian, Thai, the Indic scripts (found by the Genesis measurement: the case-difference test made them letterless)
const LETTER = /[\p{L}\p{M}]/u;   // regex-ok: a Unicode property, not a reading of any language
const isLetter = (c) => c !== undefined && LETTER.test(c);
const gunzipJson = (f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(f)));
const codesHeld = () => (fs.existsSync(PRIORS) ? fs.readdirSync(PRIORS).filter((f) => f.startsWith("ud-grammar-") && f.endsWith(".json.gz")).map((f) => f.slice(11, -8)).sort() : []);

// ── the alphabet index: one pass over the grammars, kept in memory and on disk (a derived cache; deleting it changes no answer) ──
let INDEX = null;
function index() {
  if (INDEX) return INDEX;
  try { const c = JSON.parse(fs.readFileSync(INDEX_CACHE, "utf8")); if (c.priors === PRIORS && c.codes?.length === codesHeld().length) return (INDEX = c); } catch { /* none yet */ }
  const codes = {}; for (const code of codesHeld()) { const g = gunzipJson(path.join(PRIORS, `ud-grammar-${code}.json.gz`)); const a = new Set(); for (const f of Object.values(g.forms ?? {})) for (const ch of String(f).toLowerCase()) if (isLetter(ch)) a.add(ch); codes[code] = { alphabet: [...a].join(""), spaced: g.spaced !== false, size: Object.keys(g.forms ?? {}).length }; }
  INDEX = { schema: "CodecIndex@1", priors: PRIORS, codes: Object.keys(codes), by: codes };
  try { fs.mkdirSync(path.dirname(INDEX_CACHE), { recursive: true }); fs.writeFileSync(INDEX_CACHE, JSON.stringify(INDEX)); } catch { /* an unwritable cache is only slower */ }
  return INDEX;
}

// ── the vocabulary of one codec, loaded when it is a candidate and memoised ──
const VOCAB = new Map(); let considered = 0;
export function loadVocab(code) {
  if (VOCAB.has(code)) return VOCAB.get(code);
  const g = gunzipJson(path.join(PRIORS, `ud-grammar-${code}.json.gz`)), forms = new Set(); let maxLen = 1;
  for (const f of Object.values(g.forms ?? {})) { const w = String(f).toLowerCase(); forms.add(w); if (w.length > maxLen) maxLen = w.length; }
  for (const m of Object.values(g.markers ?? {})) { const w = String(m.lemma ?? "").toLowerCase(); if (w) { forms.add(w); if (w.length > maxLen) maxLen = w.length; } }
  const v = { code, forms, spaced: g.spaced !== false, maxLen, size: forms.size }; VOCAB.set(code, v); return v;
}
loadVocab.stats = () => ({ considered, loaded: VOCAB.size, held: codesHeld().length });

// tokens of a text under a codec: letter runs (with an inner apostrophe or hyphen) when the script is spaced, else greedy longest match against the vocabulary
function tokensOf(text, v) {
  const t = String(text ?? "").toLowerCase(), out = [];
  if (v.spaced) { let cur = ""; for (const ch of t) { if (isLetter(ch) || ((ch === "'" || ch === "’" || ch === "-") && cur)) cur += ch; else { if (cur) out.push(cur.replace(/['’-]+$/u, "")); cur = ""; } } if (cur) out.push(cur.replace(/['’-]+$/u, "")); return out.filter(Boolean); }
  const chars = [...t].filter(isLetter); for (let i = 0; i < chars.length;) { let n = Math.min(v.maxLen, chars.length - i), w = null; for (; n >= 1; n--) { const s = chars.slice(i, i + n).join(""); if (v.forms.has(s)) { w = s; break; } } if (w) { out.push(w); i += w.length ? [...w].length : 1; } else { out.push(chars[i]); i += 1; } }
  return out;
}
const knownIn = (v, tok) => v.forms.has(tok) || (v.spaced && tok.includes("'") && v.forms.has(tok.split("'").pop())) || (v.spaced && tok.includes("’") && v.forms.has(tok.split("’").pop()));

/** surpriseOf(text, code) -> { code, tokens, known, coverage, totalBits, bitsPerToken } */
export const KNOWN_BITS_MODELS = Object.freeze(["vocab", "constant"]);   // how a KNOWN word is priced: "vocab" = log2(this codec's table size) (the table's size is the TREEBANK's, not the language's); "constant" = one language-independent price
export const NOMINAL_VOCAB = 2 ** 14;
export function surpriseOf(text, code, { bits = "vocab" } = {}) {
  const v = loadVocab(code), toks = tokensOf(text, v), known = toks.filter((t) => knownIn(v, t)).length, n = toks.length || 1;
  const bitsKnown = Math.log2((bits === "constant" ? NOMINAL_VOCAB : v.size) / (1 - ESCAPE)), bitsUnknown = Math.log2(UNIVERSE / ESCAPE), total = known * bitsKnown + (toks.length - known) * bitsUnknown;
  return Promise.resolve({ code, tokens: toks.length, known, coverage: known / n, totalBits: total, bitsPerToken: total / n });
}
export const entropyOf = (dist) => -dist.reduce((s, d) => s + (d.p > 0 ? d.p * Math.log2(d.p) : 0), 0);
const rngf = (s) => () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffleLetters = (text, r) => String(text).replace(/[\p{L}\p{M}]+/gu, (w) => { const a = [...w]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.join(""); });

/**
 * foldCodec(text, { codes }) -> { chosen, distribution: [{ code, p, coverage, bitsPerToken, tokens }], entropy, pruned, nullCoverage, gap? }
 * `distribution` is over the codecs that survived the alphabet pass, sorted by probability; `chosen` is its head, and is null with a typed gap when the best codec's coverage does not beat the shuffled null.
 */
export async function foldCodec(text, { codes = null, seed = 1, bits = process.env.CODEC_FOLD_BITS ?? "vocab" } = {}) {
  const idx = index(), held = codes ?? idx.codes; considered = held.length;
  const letters = [...String(text ?? "").toLowerCase()].filter(isLetter); if (!letters.length) return { chosen: null, distribution: [], entropy: 0, pruned: held.length, gap: { gap: "no_letters" } };
  // stage 1: the alphabet pass: how much of the text's letters can this codec write at all? keep the codecs within a whisker of the best (relative, not a typed floor)
  const cover = Object.fromEntries(held.map((c) => { const a = new Set(idx.by[c].alphabet); return [c, letters.filter((ch) => a.has(ch)).length / letters.length]; })), best = Math.max(...Object.values(cover));
  const cand = held.filter((c) => cover[c] >= best - 0.02);
  // stage 2: surprise under each candidate's vocabulary (loaded now, memoised)
  const rows = []; for (const c of cand) rows.push(await surpriseOf(text, c, { bits }));
  const minBits = Math.min(...rows.map((r) => r.totalBits)), z = rows.reduce((s, r) => s + 2 ** (-(r.totalBits - minBits)), 0);
  const distribution = rows.map((r) => ({ code: r.code, p: 2 ** (-(r.totalBits - minBits)) / z, coverage: r.coverage, bitsPerToken: r.bitsPerToken, tokens: r.tokens })).sort((a, b) => b.p - a.p);
  // the measured null: the same text with each token's letters shuffled, under the best codec: coverage by chance
  // the null is only valid where the token is a word: in an unspaced script the whole text is one run and a shuffle only permutes characters, which leaves character coverage exactly as it was (found on Chinese: null 0.91 v. observed 0.89)
  const top = distribution[0], r = rngf(seed), spacedTop = loadVocab(top.code).spaced; let nullMax = spacedTop ? 0 : null; if (spacedTop) for (let i = 0; i < NULL_SHUFFLES; i++) nullMax = Math.max(nullMax, (await surpriseOf(shuffleLetters(text, r), top.code)).coverage);
  // the calibration is for WORD coverage in spaced scripts; character coverage in unspaced scripts is inflated (a kanji is 'known' to the Chinese and the Japanese codec alike), so there the term is a typed gap, not a made-up number
  const spaced = loadVocab(top.code).spaced, cal = spaced ? calibration() : null, pOwn = cal ? 1 / (1 + Math.exp(-(cal.a + cal.b * top.coverage))) : null;
  const out = { chosen: top.code, distribution, entropy: entropyOf(distribution), pruned: held.length - cand.length, nullCoverage: nullMax, pOwn, ...(!spaced ? { calibrationGap: "uncalibrated_for_unspaced_scripts" } : cal ? {} : { calibrationGap: "no_codec_fold_calibration" }) };
  if (cal && pOwn < 0.5) return { ...out, chosen: null, gap: { gap: "no_codec_explains_it", nearest: top.code, coverage: top.coverage, pOwn, bitsPerToken: top.bitsPerToken, how: "the nearest held codec explains too little of this text to be its own language (calibrated on Genesis in 65 editions); vendor a codec for this language (nl-eot.mjs loadGrammar, vendor-ud-codec.mjs)" } };
  if (spacedTop && !(top.coverage > nullMax)) return { ...out, chosen: null, gap: { gap: "no_codec_explains_it", nearest: top.code, coverage: top.coverage, nullCoverage: nullMax, bitsPerToken: top.bitsPerToken, how: "no held codec's vocabulary beats a letter-shuffled version of this text; vendor a codec for this language (nl-eot.mjs loadGrammar, vendor-ud-codec.mjs)" } };
  return { ...out, quotes: codecQuotes(top.code, String(text ?? "")) };   // the codec carries its conventions: the quote table (the default, or this text's own variant)
}
