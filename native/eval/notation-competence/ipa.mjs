// eval/notation-competence/ipa.mjs — the COMPETENCE INSTRUMENT for the INTERNATIONAL PHONETIC ALPHABET (family "ipa").
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRE-REGISTRATION (READING-POLICY II.5). This header was written BEFORE the first run of this instrument. Nothing below was tuned
// after seeing a result; the run log at the bottom of the file records every later change and why. Failures are reported as failures.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//
// [DATED NOTE 2026-10-06, AMENDMENT A3, written BEFORE its first run: three independent reviews found that the registered controls were straw men
//  (R0: 'any non-ASCII'; R1/R4: 'grapheme' and an 'ablated' arm that removed Unicode knowledge, not chart knowledge). The PASS RULES below are NOT changed.
//  Controls were ADDED (Unicode-block membership, a chart-free Unicode-category segmenter, a chart-role-only ablation) and the strongest of all controls
//  is the margin and sign-test reference. The full registration (predictions, controls, relabelling of R1/R4 as convention replication) is the block
//  "AMENDMENT A3" at the bottom of this file. Run 1-3 text and numbers below stay on record unedited.]
//
// SYSTEM UNDER TEST: adapters/notation/ipa.js (ear/read/classify/canon/identify). It is NEVER the gold. Zero model: no LLM call is in
// the adapter, the priors or any score here. Priors: priors/notation-ipa-{chart,binding,segments,identify}.json (givers named inside).
//
// CHANNEL: text (Unicode). Unit = a transcription string (a word, or a line of words separated by spaces).
//
// CORPUS (all open; PROVENANCE.md in /private/tmp/claude-501/notation/ipa/):
//   WikiPron "Big Scrape" TSVs (CUNY-CL/wikipron; code Apache-2.0; data from Wiktionary, CC BY-SA 4.0 / GFDL): 213 languages, 309
//   unfiltered files with >= 500 entries, deterministic word-hash sample <= 2000 words/language, 33 big files by systematic range chunks.
//   PHOIBLE 2.0 (phoible/dev data/phoible.csv; data CC BY 4.0, code MIT): 3,020 inventories, 2,096 ISO codes.
// SPLIT: BY LANGUAGE (ISO 639-3 = the source). Inside each script group, languages sorted by sha256("khora-ipa-split-v1|"+iso), rank
//   u=(r+0.5)/n: u<0.6 train, u<0.8 dev, else test. PHOIBLE follows the WikiPron split for shared ISOs, else a hash of the key. All files of
//   one language (broad, narrow, dialects) share a split. Priors are built from TRAIN only. This run touches DEV only; TEST is untouched
//   (the instrument supports split="test": it is meant to be run ONCE, by the owner, for the final card).
// GOLD AUTHORITIES (independent of the adapter):
//   G1 segmentation: the WikiPron segmentation (cldf `segments` library 2.4.0, ipa mode: grapheme clusters, a modifier letter binds to the
//      PRECEDING cluster except at word start where it binds forward, a tie bar joins the next segment, tone letters (Sk) group). It was
//      re-derived here from the joined string (seglib reproduction rate) and cross-checked with panphon 0.22.2 ipa_segs (a different
//      segmenter; its agreement is the AUDIT of how conventional the gold is, reported in details, never used to score the reader).
//   G2 class + inventory: PHOIBLE SegmentClass (consonant|vowel|tone) and per-language phoneme/allophone inventories (different authors,
//      different notation conventions than Wiktionary editors).
//
// WHAT THE RUNGS MEAN FOR IPA (typed, not silent):
//   R0 identify  : is a line IPA? Positives = WikiPron pronunciations (6 words/line, words joined by a space); negatives = the ORTHOGRAPHY
//                  of the same words (hard when Latin script). Causal: the verdict is a running sum; prefix-stability is checked.
//   R1 hear      : segmentation of a transcription into segments (base + bound modifiers + tie-bar joins + tone groups) vs G1.
//   R2 classify  : (a) PRIMARY: the class (consonant|vowel|tone) of PHOIBLE segment types vs PHOIBLE SegmentClass (G2). (b) diagnostic: can
//                  a code point open a segment (name a being)? gold = G1 head share; NOT in the pass rule (the G1 algorithm is itself a
//                  Unicode-category rule, so Unicode-category baselines tie the reader: the chart cannot be separated there).
//   R3 beings    : the base letters a language's text declares as beings vs PHOIBLE's inventory of that language (G2), notation-folded (matcher).
//   R4 relations : binding edges (modifier -> its segment) as scored LABELLED EDGES, macro over edge classes (tie, length, modifier letter,
//                  combining mark, prefix modifier). Structurally derivative of R1 for IPA (typed note); IPA states no propositions, so
//                  CLAIMS are typed not-applicable ({reason:"claims_not_applicable"}); only structural relations are measured.
//   R5 agreement : the SAME word in two representations (broad vs narrow transcription of the same language): retrieval of the broad form
//                  from the narrow form through the reader's base-letter skeleton. Orthography<->IPA needs a G2P prior (none received) ->
//                  typed gap; cross-language same-content has no gold -> typed gap.
//
// MATCHER DEFINITIONS (declared, applied identically to every arm including gold)
//   token span      [start,end) in UTF-16 units of the joined (space-free) string; two tokens match iff both ends equal.
//   marked token    >= 2 code points. Primary R1 number = MARKED-TOKEN F1 (TP = gold marked tokens reproduced exactly; FP = predicted marked
//                   tokens not in gold; FN = gold marked tokens missed), micro within a language, MACRO over languages with >= 20 gold marked
//                   tokens. All-token F1 is reported (details), not primary (plain letters dominate it and every control scores ~0.9 on them).
//   token classes   by gold-token composition: tie (U+0361/U+035C), length (U+02D0/U+02D1), modifier_letter (other Lm), combining (other
//                   M*), tone_group (>=2 chars all gc Sk), prefix_modifier (token opens with Lm/M*), digit_tone (No).
//   modifier cp     gc in {Lm, Mn, Me, Mc} (Unicode 16.0 general category). Edge = (modifier span -> its token span).
//   base letter     (R3 PHOIBLE side) NFD code point with \p{L} and not \p{Lm}; ASCII g folded to U+0261. Reader side: the first NFD code
//                   point of each base the reader declared (no filter: a modifier declared as a being is the reader's error).
//   skeleton        (R5) the concatenation of those base letters.
//   balanced acc.   mean per-class recall over classes with >= 5 gold items; an 'unknown' answer is a miss.
//
// CONTROLS, BUILT TO FAIL (II.23/II.4), each with a LICENCE CHECK that the statistic moves
//   R0  c_nonascii   rule 'any non-ASCII code point => IPA' (the naive strongest baseline)
//       c_deranged   the real verdicts permuted across items (seeded derangement of the label vector)
//       c_ascii      the real reader on ASCII-folded pairs (NFD, drop non-ASCII): IPA is then invisible, expect ~chance
//       c_ablated    the real reader with the chart table emptied (block + category evidence gone)
//   R1  codepoint    every code point its own token (no notation knowledge)
//       grapheme     Unicode UAX#29 grapheme clusters (Intl.Segmenter): binds combining marks, not modifier letters or tie bars
//       ablated      chart table emptied (script-only roles)
//       deranged     chart roles/categories of non-ASCII code points permuted (seeded derangement)
//   R2  majority     always 'consonant'
//       ascii_rule   'vowel iff first NFD char in aeiouy, tone iff not a letter, else consonant'
//       deranged     gold labels permuted across types
//       train_lookup exact TRAIN majority else 'consonant' (memorisation, no chart)
//       ablated      chart + TRAIN lookup emptied (everything unknown)
//   R3  codepoint    every non-space code point a being (modifiers become beings)
//       deranged_lang  each language's inventory scored against another language's PHOIBLE inventory
//       ablated      chart emptied
//       (ceiling = the gold segmentation's own heads vs PHOIBLE: not a control, the best any segmenter can do on this matcher)
//   R4  codepoint, grapheme, ablated, deranged as R1, edges derived from their spans by the same matcher
//   R5  raw          skeletons replaced by the raw string (spaces removed)
//       mn_strip     NFD, delete \p{Mn} only (what Unicode knowledge alone gives)
//       ablated      chart emptied
//       deranged     each query scored against another query's truth set (seeded derangement)
//   CAUSALITY: prefix-stability (every token/being closed in read(prefix, final:false) with at <= |prefix| equals the same one in read(full))
//   must be 1.0 for the real arm; a PEEKING mock (decides tone grouping / class from whole-text statistics) must score < 1 (licence).
//
// PASS RULES (per rung; ALPHA = KEY_ALPHA = 0.05 from adapters/text/keyness.js; SEED = 20261006; every other constant is below and declared)
//   pass requires ALL of: n >= MIN_N; score >= FLOOR; margin = score - strongest control >= MARGIN; exact one-sided SIGN test of
//   real-beats-strongest-control over the rung's units (languages / types) p <= ALPHA; every BUILT-TO-FAIL control <= score - 0.05
//   ("licensed"; a control within 0.05 of the real arm means the instrument or the mechanism is broken, and pass is false); causal
//   stability == 1 (R0, R1, R3); rung-specific extras:
//     R0  FLOOR 0.85 balanced accuracy on the HARD subset (Latin-script orthography negatives); MARGIN 0.05; MIN_N 20 hard languages.
//     R1  FLOOR 0.95 marked-token F1; MARGIN 0.10; MIN_N 10 languages; EVERY token class with >= 30 gold tokens must reach recall >= 0.90.
//     R2  FLOOR 0.90 balanced accuracy over all DEV PHOIBLE types AND >= 0.85 on types NOT in TRAIN (when >= 50 such types);
//         MARGIN 0.05; MIN_N 100 types. Sign test over types.
//     R3  FLOOR: score >= ceiling - 0.05; MARGIN 0.05; MIN_N 10 languages with a PHOIBLE inventory. Sign test over languages.
//     R4  FLOOR 0.90 macro-F1 over edge classes with >= 30 gold edges (>= 3 such classes); MARGIN 0.10; sign test over languages.
//     R5  FLOOR 0.60 top-1 retrieval (expected credit, ties shared); MARGIN 0.05; MIN_N 8 language groups with >= 30 pairs; sign test over groups.
//   pass = null (not measurable) when a MIN_N is not met or data are missing; the gap is typed with its denominator.
//
// PREDICTIONS (honest best guesses written before running; a wrong prediction is a finding, not a bug):
//   R0  hard-subset balanced accuracy 0.80-0.90; the real arm loses on (i) ASCII-only IPA (Spanish-like broad transcription: no exclusive
//       glyph, a typed gap, ~10-25% of positives) and (ii) orthographies that use chart letters (ä ü ø æ ð ŋ ç: Swedish, German-like,
//       Basque, Occitan). c_nonascii ~0.60-0.75 (false-positives on every accented orthography). c_ascii ~0.50. Pass is a coin-flip.
//   R1  marked-token F1 0.97-0.995 (the reader reimplements the segments convention from the chart + category); residual errors:
//       modifier letter followed by a combining mark (the library keeps that cluster apart), tone-letter groups with non-tone Sk,
//       tie bars next to modifiers. codepoint ~0.0, grapheme ~0.2-0.5 (misses length/aspiration/tie), ablated ~0.4-0.6. Pass likely.
//       Stress marks and syllable breaks are NOT in the corpus (WikiPron strips them): their reading is unmeasured (typed gap).
//   R2  balanced accuracy 0.93-0.98; novel types 0.90-0.97; the weakest class is tone (arrows, ^ strings not read as beings).
//   R3  F1 ceiling 0.75-0.90 (notation differences between Wiktionary and PHOIBLE); reader within 0.01 of ceiling; margin over the
//       codepoint control 0.03-0.10 (modifier letters are rare types); over the deranged-language control 0.2-0.4. Only ~17 DEV
//       languages have a PHOIBLE inventory under the same ISO (typed gap for the rest): power is low.
//   R4  macro-F1 0.93-0.99 (inherits R1); the weakest class: prefix_modifier (few) and combining after a modifier letter.
//   R5  skeleton retrieval 0.75-0.92; raw 0.45-0.70; mn_strip 0.55-0.80; deranged ~chance (<0.01). Pass likely.
//   NOT MEASURED, typed: stress marks and syllable breaks (absent from WikiPron), extIPA/VoQS symbols beyond the chart, Unicode
//   normalisation variants of PHOIBLE (only NFC compared), orthography<->IPA agreement (no G2P prior), claims (not applicable),
//   the IPA Handbook's prose (not open: only the chart is a giver), languages whose ISO differs between WikiPron and PHOIBLE.
//
// RESULT SHAPE for every rung: { id, rung, split, n, applicable, score, control, margin, pass, controls:{name:value}, gaps:[{reason,count}],
//   notes:[], details:{} }; measure({split="dev", limit=null}) -> { family, rungs:{r0..r5}, ... }. `limit` = the maximum number of items PER
//   LANGUAGE/GROUP (lines for R1/R4, chunk pairs for R0, queries for R5), taken from the head of the deterministic hash order; R2 takes the
//   first `limit` types in sorted order; R3 the first `limit` languages. null = all.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { KEY_ALPHA, logBinomialUpperTail } from "../../adapters/text/keyness.js";
import * as ipa from "../../adapters/notation/ipa.js";

export const FAMILY = "ipa";
export const ROOT = process.env.KHORA_IPA_ROOT ?? "/private/tmp/claude-501/notation/ipa";
export const SEED = 20261006;
export const ALPHA = KEY_ALPHA;
/** The declared constants of the pass rules (mirrors the header; the header is the pre-registration, this is its machine form). */
export const PREREG = Object.freeze({
  chunkWords: 6, chunksPerFile: 40, licenceDelta: 0.05,
  r0: { floor: 0.85, margin: 0.05, minN: 20, xfamMinN: 100, asciiHeavy: 0.9, kGrid: [1, 2, 3, 4, 5, 6, 7, 8], trainLinesPerFile: 240 },
  r1: { floor: 0.95, margin: 0.10, minN: 10, minGoldMarked: 20, classMinSupport: 30, classFloor: 0.90, replicationFloor: 0.95 },
  r2: { floor: 0.90, floorNovel: 0.85, minNovel: 50, margin: 0.05, minN: 100, minPerClass: 5 },
  r3: { ceilingSlack: 0.05, margin: 0.05, minN: 10 },
  r4: { floor: 0.90, margin: 0.10, minClasses: 3, classMinSupport: 30, minN: 10, replicationFloor: 0.90 },
  r5: { floor: 0.60, margin: 0.05, minGroups: 8, minPairs: 30, queriesPerGroup: 300 },
  dependentHeadShare: 0.2,
});

// ── small pure helpers (exported: the test file exercises them on toy data) ─────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A DERANGEMENT of 0..n-1 (no fixed point; Sattolo's algorithm, one n-cycle). n < 2 has none -> null. */
export function derangement(n, rng) {
  if (n < 2) return null;
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}
/** One-sided exact sign test that A beats B: p = P(X >= wins | wins+losses, 1/2). */
export function signTest(wins, losses) {
  const n = wins + losses;
  return { wins, losses, n, p: n === 0 ? 1 : Math.exp(logBinomialUpperTail(wins, n, 0.5)) };
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const f1of = (tp, fp, fn) => (tp + fp + fn === 0 ? null : (2 * tp) / (2 * tp + fp + fn));
const cpLen = (s) => { let n = 0; for (const _ of s) n++; return n; };
const gcOf = (ch) => (/\p{Lm}/u.test(ch) ? "Lm" : /\p{Mn}/u.test(ch) ? "Mn" : /\p{Me}/u.test(ch) ? "Me" : /\p{Mc}/u.test(ch) ? "Mc" : /\p{Sk}/u.test(ch) ? "Sk" : /\p{No}/u.test(ch) ? "No" : /\p{L}/u.test(ch) ? "L" : "other");
const isModGc = (g) => g === "Lm" || g === "Mn" || g === "Me" || g === "Mc";
const TIE = new Set(["͡", "͜"]);

// ── A3: chart-free baselines (Unicode knowledge only; no IPA chart, no priors) ────────────────────────────
/** Unicode canonical combining class 233/234 ("double diacritics", UnicodeData.txt 16.0): marks that straddle TWO bases. A Unicode property, not the IPA chart. */
export const UCD_DOUBLE_DIACRITICS = new Set([0x035c, 0x035d, 0x035e, 0x035f, 0x0360, 0x0361, 0x0362, 0x1dcd, 0x1dfc]);
const RE_DEP = /[\p{Lm}\p{M}]/u, RE_SK = /\p{Sk}/u, RE_WS = /\s/u;
/**
 * ucdSegment(str) -> [[s,e)] spans. The reviewers' 15-line baseline made total. Uses ONLY Unicode general category (Lm, M*, Sk), whitespace and the double-diacritic
 * class: Lm/M* bind to the previous cluster (at word start they bind FORWARD to the next code point; with no host at all they are a stray token of their own),
 * a double diacritic joins the next code point, and a run of Sk code points groups. NO chart, NO TRAIN prior: if this ties the reader the reader adds nothing.
 */
export function ucdSegment(str) {
  const spans = []; let cur = null, pre = null, tie = false, i = 0;
  const close = () => { if (cur) { spans.push([cur.s, cur.e]); cur = null; tie = false; } };
  const flushPre = () => { if (pre) { spans.push([pre.s, pre.e]); pre = null; } };
  for (const ch of str) {
    const e = i + ch.length, cp = ch.codePointAt(0);
    if (RE_WS.test(ch)) { close(); flushPre(); }
    else if (UCD_DOUBLE_DIACRITICS.has(cp)) { if (cur) { cur.e = e; tie = true; } else pre = pre ? { s: pre.s, e } : { s: i, e }; }
    else if (RE_DEP.test(ch)) { if (cur) cur.e = e; else pre = pre ? { s: pre.s, e } : { s: i, e }; }
    else if (cur && tie) { cur.e = e; tie = false; }
    else if (cur && cur.sk && RE_SK.test(ch)) { cur.e = e; }
    else { close(); cur = { s: pre ? pre.s : i, e, sk: RE_SK.test(ch) }; pre = null; }
    i = e;
  }
  close(); flushPre();
  return spans;
}
export const armUcd = (s) => ucdSegment(s);

/** R0 block-membership baselines (A3). Blocks are Unicode BLOCK ranges, the standard's own home of phonetic notation; nothing here is learned. */
export const BLOCKS_EXT = Object.freeze([[0x0250, 0x02ff]]); // IPA Extensions + Spacing Modifier Letters
export const BLOCKS_ALL = Object.freeze([[0x0250, 0x036f], [0x1d00, 0x1dbf]]); // + Combining Diacritical Marks, Phonetic Extensions (+ Supplement)
export const BLOCKS_COUNT = Object.freeze([[0x0250, 0x02ff], [0x1d00, 0x1dbf]]); // the letters/modifiers counted by c_extcount
export function countIn(str, blocks) { let n = 0; for (const ch of str) { const cp = ch.codePointAt(0); for (const [a, b] of blocks) if (cp >= a && cp <= b) { n++; break; } } return n; }
export const ruleBlockExt = (t) => countIn(t, BLOCKS_EXT) >= 1;
export const ruleBlockAll = (t) => countIn(t, BLOCKS_ALL) >= 1;
export const ruleNonAscii = (t) => /[^\x00-\x7f]/.test(t);
export const asciiShare = (t) => { let a = 0, n = 0; for (const ch of t) { if (RE_WS.test(ch)) continue; n++; if (ch.codePointAt(0) < 0x80) a++; } return n ? a / n : 1; };

/** Spans [s,e) of a list of segments laid end to end. */
export function spansOfSegs(segs) { let o = 0; return segs.map((s) => { const sp = [o, o + s.length]; o += s.length; return sp; }); }
const key = (sp) => `${sp[0]}-${sp[1]}`;

/** Token classes of one gold token string (a token may be in several). */
export function tokenClasses(tok) {
  const cs = [...tok]; const out = [];
  if (cs.some((c) => TIE.has(c))) out.push("tie");
  if (cs.some((c) => c === "ː" || c === "ˑ")) out.push("length");
  if (cs.some((c) => gcOf(c) === "Lm" && c !== "ː" && c !== "ˑ")) out.push("modifier_letter");
  if (cs.some((c) => (gcOf(c) === "Mn" || gcOf(c) === "Me" || gcOf(c) === "Mc") && !TIE.has(c))) out.push("combining");
  if (cs.length >= 2 && cs.every((c) => gcOf(c) === "Sk")) out.push("tone_group");
  if (cs.length >= 2 && (isModGc(gcOf(cs[0])))) out.push("prefix_modifier");
  if (cs.length === 1 && gcOf(cs[0]) === "No") out.push("digit_tone");
  return out;
}

/** Counts of a predicted span list against gold spans of one string: all-token and marked-token TP/FP/FN + per-class gold/hit. */
export function scoreSpans(str, goldSp, predSp, acc) {
  const g = new Map(goldSp.map((s) => [key(s), s])), p = new Map(predSp.map((s) => [key(s), s]));
  const marked = (sp) => cpLen(str.slice(sp[0], sp[1])) >= 2;
  for (const [k, s] of g) {
    const hit = p.has(k);
    if (hit) acc.tpAll++; else acc.fnAll++;
    if (marked(s)) { if (hit) acc.tpM++; else acc.fnM++; }
    for (const c of tokenClasses(str.slice(s[0], s[1]))) { const e = (acc.classes[c] ??= { gold: 0, hit: 0 }); e.gold++; if (hit) e.hit++; }
  }
  for (const [k, s] of p) if (!g.has(k)) { acc.fpAll++; if (marked(s)) acc.fpM++; }
  return acc;
}
export const newAcc = () => ({ tpAll: 0, fpAll: 0, fnAll: 0, tpM: 0, fpM: 0, fnM: 0, classes: {} });
const addAcc = (a, b) => { for (const k of ["tpAll", "fpAll", "fnAll", "tpM", "fpM", "fnM"]) a[k] += b[k]; for (const [c, v] of Object.entries(b.classes)) { const e = (a.classes[c] ??= { gold: 0, hit: 0 }); e.gold += v.gold; e.hit += v.hit; } return a; };

/** Modifier edges of a tokenisation: (modifier cp span -> token span), by the matcher (gc in Lm/Mn/Me/Mc). Same function for gold and for control arms. */
export function edgesFromSpans(str, spans) {
  const out = [];
  for (const sp of spans) {
    if (cpLen(str.slice(sp[0], sp[1])) < 2) continue; // a one-code-point token binds nothing
    let i = sp[0];
    for (const ch of str.slice(sp[0], sp[1])) {
      const e = i + ch.length;
      if (isModGc(gcOf(ch))) out.push({ k: `${i}-${e}>${sp[0]}-${sp[1]}`, cls: edgeClass(ch, i === sp[0]) });
      i = e;
    }
  }
  return out;
}
export function edgeClass(ch, atTokenStart) {
  if (TIE.has(ch)) return "tie";
  if (atTokenStart) return "prefix_modifier";
  if (ch === "ː" || ch === "ˑ") return "length";
  return gcOf(ch) === "Lm" ? "modifier_letter" : "combining";
}

/** Lines -> expected top-1 credit helpers for R5. */
export function lev(a, b) {
  if (a === b) return 0;
  const n = a.length, m = b.length;
  if (!n) return m; if (!m) return n;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1));
    prev = cur;
  }
  return prev[m];
}
/** Expected credit of ranking `pool` (array of strings) against a query string; truth = indices into pool; ties share credit. */
export function retrievalCredit(q, pool, truth) {
  let best = Infinity, ties = [];
  for (let j = 0; j < pool.length; j++) {
    const mx = Math.max(q.length, pool[j].length, 1);
    if (Math.abs(q.length - pool[j].length) / mx > best + 1e-12) continue; // the length gap alone already exceeds the best distance
    const d = lev(q, pool[j]) / mx;
    if (d < best - 1e-12) { best = d; ties = [j]; } else if (Math.abs(d - best) <= 1e-12) ties.push(j);
  }
  const hit = ties.filter((j) => truth.has(j)).length;
  return ties.length ? hit / ties.length : 0;
}

/** Balanced accuracy over classes with >= minPerClass gold items. pairs = [[gold, pred]]. */
export function balancedAccuracy(pairs, minPerClass = 5) {
  const by = new Map();
  for (const [g, p] of pairs) { const e = by.get(g) ?? { n: 0, ok: 0 }; e.n++; if (g === p) e.ok++; by.set(g, e); }
  const rec = {}; const used = [];
  for (const [c, e] of by) { rec[c] = { n: e.n, recall: e.ok / e.n }; if (e.n >= minPerClass) used.push(e.ok / e.n); }
  return { ba: used.length ? mean(used) : null, perClass: rec, n: pairs.length };
}

// ── data ────────────────────────────────────────────────────────────────────────────────────
const cache = new Map();
const memo = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
export const dataAvailable = () => fs.existsSync(path.join(ROOT, "manifest.wikipron.json")) && fs.existsSync(path.join(ROOT, "corpus"));
export function loadManifest() { return memo("manifest", () => JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.wikipron.json"), "utf8"))); }
/** WikiPron files of a split: [{meta, lines:[{word, segs, pron}]}] in manifest order (lines in deterministic hash order). */
export function loadWikipron(split) {
  return memo(`wp:${split}`, () => {
    const man = loadManifest(); const out = [];
    for (const meta of man.files.filter((f) => f.split === split)) {
      const lines = [];
      for (const ln of fs.readFileSync(path.join(ROOT, "corpus", split, meta.file), "utf8").split("\n")) {
        if (!ln) continue;
        const i = ln.indexOf("\t"); const word = ln.slice(0, i); const segs = ln.slice(i + 1).split(" ").map((s) => s.normalize("NFC"));
        lines.push({ word, segs, pron: segs.join("") });
      }
      out.push({ meta, lines });
    }
    return out;
  });
}
export function loadPhoible(split) {
  return memo(`ph:${split}`, () => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT, "corpus", "phoible", `${split}.json.gz`))).toString("utf8")));
}
function loadGoldAudit(split) {
  return memo(`gold:${split}`, () => {
    const f = path.join(ROOT, "gold", `wikipron-${split}.jsonl.gz`);
    if (!fs.existsSync(f)) return null;
    const rows = zlib.gunzipSync(fs.readFileSync(f)).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return rows;
  });
}
const sortedLimit = (arr, limit) => (limit == null ? arr : arr.slice(0, limit));
const byIso = (files) => { const m = new Map(); for (const f of files) { if (!m.has(f.meta.iso)) m.set(f.meta.iso, []); m.get(f.meta.iso).push(f); } return m; };

// ── result builders ─────────────────────────────────────────────────────────────────────────
const blank = (rung, split) => ({ id: `${FAMILY}.${rung.toLowerCase()}`, rung, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} });
const unmeasured = (rung, split, reason, notes = []) => ({ ...blank(rung, split), gaps: [{ reason: "unmeasured", count: 1 }, { reason, count: 1 }], notes });
const r6 = (x) => (x == null ? x : Math.round(x * 1e6) / 1e6);

// ── prior variants for the controls ─────────────────────────────────────────────────────────
function rawPriors() { const P = ipa.loadPriors(); return { chart: P.chart, binding: P.binding, segments: P.segments, identify: P.identify }; }
const clone = (o) => JSON.parse(JSON.stringify(o));
export function ablatedChart(raw) { const r = { ...raw, chart: clone(raw.chart) }; r.chart.codepoints = {}; r.chart.sequences = {}; return ipa.compilePriors(r); }
export function derangedChart(raw, seed = SEED) {
  const r = { ...raw, chart: clone(raw.chart) };
  const keys = Object.keys(r.chart.codepoints).filter((h) => parseInt(h, 16) >= 0x80);
  const d = derangement(keys.length, mulberry32(seed));
  const tuples = keys.map((h) => { const e = r.chart.codepoints[h]; return { role: e.role, gc: e.gc, cls: e.cls, desc: e.desc, chartProper: e.chartProper }; });
  keys.forEach((h, i) => { const t = tuples[d[i]]; const e = r.chart.codepoints[h]; for (const k of ["role", "gc", "cls"]) { if (t[k] === undefined) delete e[k]; else e[k] = t[k]; } });
  r.binding = { ...raw.binding, codepoints: {} }; // the TRAIN binding table would re-correct the deranged roles: ablate it too
  return ipa.compilePriors(r);
}

/** A3: remove ONLY chart knowledge: role, class, description, chartProper and multi-code-point sequences go; the UCD general category (gc), block and script STAY.
 *  `binding:false` also empties the TRAIN binding table. (The older `ablatedChart` empties the whole table, gc included: it removes Unicode knowledge too.) */
export function ablatedChartKeepGc(raw, { binding = true } = {}) {
  const r = { ...raw, chart: clone(raw.chart) };
  const cps = {}; for (const [h, e] of Object.entries(r.chart.codepoints)) cps[h] = { gc: e.gc, b: e.b };
  r.chart.codepoints = cps; r.chart.sequences = {};
  if (!binding) r.binding = { ...raw.binding, codepoints: {} };
  return ipa.compilePriors(r);
}
/** A3: the TRAIN binding table emptied (chart kept intact). */
export function ablatedBinding(raw) { return ipa.compilePriors({ ...raw, binding: { ...raw.binding, codepoints: {} } }); }
/** The controls the LICENCE check applies to (built to fail: if one does as well as the real arm the instrument or the mechanism is broken) vs the NATURAL BASELINES
 *  (a legitimate competing method: it may tie the reader, and then the margin says so). Both kinds feed the strongest-control margin and sign test. */
export const BUILT_TO_FAIL = Object.freeze({ r1: ["codepoint", "ablated_unicode", "deranged"], r3: ["deranged_lang", "ablated_unicode", "codepoint"], r4: ["codepoint", "ablated_unicode", "deranged"], r5: ["deranged", "ablated_unicode"] });

// ── R1: arms ────────────────────────────────────────────────────────────────────────────────
const SEG = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
export const armCodepoint = (s) => { const out = []; let i = 0; for (const ch of s) { out.push([i, i + ch.length]); i += ch.length; } return out; };
export const armGrapheme = (s) => (SEG ? [...SEG.segment(s)].map((g) => [g.index, g.index + g.segment.length]) : armCodepoint(s));
export const armReader = (P) => (s) => ipa.earTokens(s, { priors: P }).tokens.map((t) => t.span);

function r1Arms(raw) {
  const real = ipa.compilePriors(raw);
  return {
    real: armReader(real),
    // built to fail (licence-checked)
    codepoint: armCodepoint, ablated_unicode: armReader(ablatedChart(raw)), deranged: armReader(derangedChart(raw)),
    // natural baselines (A3): they may tie the reader
    grapheme: armGrapheme, ucd_category: armUcd, ablated_chart: armReader(ablatedChartKeepGc(raw)), ablated_binding: armReader(ablatedBinding(raw)), ablated_chart_binding: armReader(ablatedChartKeepGc(raw, { binding: false })),
  };
}

/** A PEEKING mock reader: groups tone letters only if the WHOLE text is at least PEEK_LEN code units long (a whole-text statistic judging an earlier unit).
 *  AMENDMENT A1 (see the run log): the first registered mock (group iff the whole text holds >= 2 tone letters) did not diverge on the corpus (stability 1.0). */
export const PEEK_LEN = 10;
export function peekTokens(s, P, { final = true } = {}) {
  const toks = ipa.earTokens(s, { priors: P, final }).tokens;
  if (s.length >= PEEK_LEN) return toks;
  const out = [];
  for (const t of toks) { if (t.kind === "tone" && cpLen(t.text ?? "") > 1) { let o = t.span[0]; for (const ch of t.text) { out.push({ ...t, span: [o, o + ch.length], text: ch }); o += ch.length; } } else out.push(t); }
  return out;
}
/** Prefix-stability of a reader function f(text, {final}) -> closed tokens [{span, at, ...}]: share of (line, cut) whose closed tokens in the prefix run are all in the full run. */
export function prefixStability(lines, f, { cutsPerLine = 3, maxLines = 200 } = {}) {
  let ok = 0, tot = 0;
  for (const s of lines.slice(0, maxLines)) {
    const L = s.length; if (L < 6) continue;
    const full = f(s, { final: true }); const fk = new Set(full.map((t) => `${t.span[0]}-${t.span[1]}`));
    for (let c = 1; c <= cutsPerLine; c++) {
      let cut = Math.floor((L * c) / (cutsPerLine + 1)); if (s.charCodeAt(cut - 1) >= 0xd800 && s.charCodeAt(cut - 1) <= 0xdbff) cut++;
      const pre = f(s.slice(0, cut), { final: false }).filter((t) => !t.open);
      for (const t of pre) { tot++; if (t.at <= cut && fk.has(`${t.span[0]}-${t.span[1]}`)) ok++; else if (t.at > cut) { /* cannot happen for a causal reader */ } }
    }
  }
  return { ok, tot, stability: tot ? ok / tot : null };
}

// ── generic pass decision ───────────────────────────────────────────────────────────────────
/** The pre-registered pass rule as a pure function. conds = {minN, floor, margin, signP, licensed, causal, extras:[{name, ok}]}. */
export function decide({ n, minN, score, floor, margin, marginMin, signP, licensed, causal = true, extras = [] }) {
  const why = [];
  if (n == null || n < minN || score == null) return { pass: null, why: [`n=${n} < minN=${minN} or no score`] };
  if (!(score >= floor)) why.push(`score ${r6(score)} < floor ${r6(floor)}`);
  if (!(margin >= marginMin)) why.push(`margin ${r6(margin)} < ${marginMin}`);
  if (!(signP <= ALPHA)) why.push(`sign-test p ${signP == null ? "n/a" : r6(signP)} > ${ALPHA}`);
  if (!licensed.ok) why.push(`control(s) not licensed: ${licensed.bad.join(",")}`);
  if (!causal) why.push("not causal (prefix stability < 1)");
  for (const e of extras) if (!e.ok) why.push(e.name);
  return { pass: why.length === 0, why };
}
const licence = (real, built, delta = PREREG.licenceDelta) => { const bad = Object.entries(built).filter(([, v]) => v != null && !(v <= real - delta)).map(([k]) => k); return { ok: bad.length === 0, bad }; };
const strongest = (o) => { let bk = null, bv = -Infinity; for (const [k, v] of Object.entries(o)) if (v != null && v > bv) { bv = v; bk = k; } return { name: bk, value: bk == null ? null : bv }; };

// ═════════════════════════════════════════════════ R0 ═════════════════════════════════════════════════
/** CROSS-FAMILY false-positive probe (v2 amendment, registered in the run log): does the IPA identifier call OTHER notation families' strings IPA? Reads sibling
 *  families' files of the SAME split read-only if present (English prose + Morse from closed_codes, SMILES/InChI/IUPAC names from chem_smiles); nothing is copied. */
export const OTHER_ROOT = process.env.KHORA_NOTATION_ROOT ?? "/private/tmp/claude-501/notation";
export function crossFamilyProbe(P, split = "dev", per = 300, cut = 80) {
  const pools = {};
  try {
    const f = path.join(OTHER_ROOT, "closed_codes", "corpus", `${split}.jsonl`);
    if (fs.existsSync(f)) { const rows = fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); pools.english_prose = rows.map((r) => r.text).filter(Boolean); pools.morse = rows.map((r) => r.forms?.morse_spaced).filter(Boolean); }
  } catch { /* absent */ }
  try {
    const f = path.join(OTHER_ROOT, "chem_smiles", "corpus", `${split}.json`);
    if (fs.existsSync(f)) { const recs = JSON.parse(fs.readFileSync(f, "utf8")).records ?? []; pools.smiles = recs.map((r) => r.smiles).filter(Boolean); pools.inchi = recs.map((r) => r.inchi).filter(Boolean); pools.iupac_name = recs.map((r) => r.name).filter(Boolean); }
  } catch { /* absent */ }
  const out = {};
  for (const [k, arr] of Object.entries(pools)) { const xs = arr.slice(0, per).map((x) => x.slice(0, cut)); const ipaN = xs.filter((x) => ipa.identify(x, { priors: P }).verdict === "ipa").length; out[k] = { n: xs.length, calledIPA: ipaN, rate: xs.length ? r6(ipaN / xs.length) : null }; }
  return Object.keys(out).length ? out : null;
}
const asciiFold = (s) => s.normalize("NFD").replace(/[^\x00-\x7f]/g, "").replace(/\s+/g, " ").trim();
/** Chunks of `chunkWords` consecutive lines of each file -> items {iso, script, file, ipa, ortho} (the registered R0 item builder, factored out in A3 so TRAIN can reuse it). */
export function chunksOf(files, limit) {
  const items = [];
  for (const f of files) {
    const K = PREREG.chunkWords; const per = limit ?? PREREG.chunksPerFile;
    for (let c = 0; c < per; c++) {
      const ch = f.lines.slice(c * K, (c + 1) * K); if (ch.length < K) break;
      items.push({ iso: f.meta.iso, script: f.meta.script, file: f.meta.file, ipa: ch.map((l) => l.pron).join(" ").normalize("NFC"), ortho: ch.map((l) => l.word).join(" ").normalize("NFC") });
    }
  }
  return items;
}
const r0Items = (split, limit) => chunksOf(loadWikipron(split), limit);
/** The first `nLines` lines of every file of a split (TRAIN is only needed up to the 40 chunks R0 uses, so the whole corpus is not loaded). */
export function loadWikipronHead(split, nLines) {
  return memo(`wph:${split}:${nLines}`, () => {
    const out = []; let man; try { man = loadManifest(); } catch { return out; }
    for (const meta of man.files.filter((f) => f.split === split)) {
      const fp = path.join(ROOT, "corpus", split, meta.file); if (!fs.existsSync(fp)) continue;
      const lines = [];
      for (const ln of fs.readFileSync(fp, "utf8").split("\n")) {
        if (!ln) continue; if (lines.length >= nLines) break;
        const i = ln.indexOf("\t"); const word = ln.slice(0, i); const segs = ln.slice(i + 1).split(" ").map((s) => s.normalize("NFC"));
        lines.push({ word, segs, pron: segs.join("") });
      }
      out.push({ meta, lines });
    }
    return out;
  });
}
const baOf = (tp, fn, tn, fp) => { const tpr = tp + fn ? tp / (tp + fn) : null, tnr = tn + fp ? tn / (tn + fp) : null; return tpr == null || tnr == null ? null : (tpr + tnr) / 2; };
/** A3: fit the c_extcount threshold k on TRAIN ONLY (maximise hard-subset balanced accuracy; ties to the smaller k). null = no TRAIN corpus (a typed gap, never a guess). */
export function fitExtCountK(trainItems, grid = PREREG.r0.kGrid) {
  const hard = trainItems.filter((x) => x.script === "Latin"); if (!hard.length) return null;
  let best = null;
  for (const k of grid) {
    let tp = 0, fn = 0, tn = 0, fp = 0;
    for (const x of hard) { countIn(x.ipa, BLOCKS_COUNT) >= k ? tp++ : fn++; countIn(x.ortho, BLOCKS_COUNT) >= k ? fp++ : tn++; }
    const ba = baOf(tp, fn, tn, fp);
    if (ba != null && (best == null || ba > best.ba + 1e-12)) best = { k, ba };
  }
  return best ? { ...best, n: hard.length } : null;
}
export function measureR0(split, limit, P, raw) {
  const out = blank("R0", split);
  const items = r0Items(split, limit);
  if (!items.length) return unmeasured("R0", split, "no_items");
  const Pabl = ablatedChart(raw);
  const rng = mulberry32(SEED);
  // A3: the c_extcount threshold is fit on TRAIN (the registered 40 chunks per file), or absent (typed gap)
  const kfit = fitExtCountK(chunksOf(loadWikipronHead("train", PREREG.chunkWords * PREREG.chunksPerFile), null));
  // predictions per arm over a list of texts: returns array of booleans (IPA?)
  const real = (t, PP = P) => ipa.identify(t, { priors: PP }).verdict === "ipa";
  const nonascii = ruleNonAscii;
  const all = []; // {iso, script, label, text}
  for (const it of items) { all.push({ it, label: true, text: it.ipa }); all.push({ it, label: false, text: it.ortho }); }
  const pReal = all.map((x) => real(x.text));
  const pNon = all.map((x) => nonascii(x.text));
  const pAbl = all.map((x) => real(x.text, Pabl));
  const pAsc = all.map((x) => real(asciiFold(x.text)));
  const perm = derangement(all.length, rng);
  const pDer = all.map((_, i) => pReal[perm[i]]);
  const pBlkExt = all.map((x) => ruleBlockExt(x.text)), pBlkAll = all.map((x) => ruleBlockAll(x.text));
  const pExtCount = kfit ? all.map((x) => countIn(x.text, BLOCKS_COUNT) >= kfit.k) : null;
  const counts = (pred, filt = () => true) => { let tp = 0, fn = 0, tn = 0, fp = 0; all.forEach((x, i) => { if (!filt(x)) return; if (x.label) { pred[i] ? tp++ : fn++; } else { pred[i] ? fp++ : tn++; } }); return { tp, fn, tn, fp, ba: baOf(tp, fn, tn, fp) }; };
  const hardF = (x) => x.it.script === "Latin";
  const arms = { real: pReal, c_nonascii: pNon, c_block_ext: pBlkExt, c_block_all: pBlkAll, ...(pExtCount ? { c_extcount: pExtCount } : {}), c_deranged: pDer, c_ascii: pAsc, c_ablated: pAbl };
  const hard = {}, allv = {};
  for (const [k, v] of Object.entries(arms)) { hard[k] = counts(v, hardF); allv[k] = counts(v); }
  // per-language hard BA for the sign test
  const langs = [...new Set(all.filter(hardF).map((x) => x.it.iso))];
  const perLang = (pred) => langs.map((l) => counts(pred, (x) => x.it.iso === l && hardF(x)).ba);
  const lReal = perLang(pReal);
  const controlsHard = Object.fromEntries(Object.keys(arms).filter((k) => k !== "real").map((k) => [k, hard[k].ba]));
  const st = strongest(controlsHard);
  const lStrong = perLang(arms[st.name]);
  let w = 0, l = 0, ties = 0; lReal.forEach((v, i) => { if (v == null || lStrong[i] == null) return; if (v > lStrong[i]) w++; else if (v < lStrong[i]) l++; else ties++; });
  const sign = signTest(w, l);
  // witnessed breakdown + prefix curve + causality
  const pos = all.filter((x) => x.label && hardF(x));
  const unw = pos.filter((x) => !ipa.identify(x.text, { priors: P }).witnessed);
  const unwHit = unw.filter((x) => real(x.text)).length;
  const curve = {};
  for (const L of [8, 16, 32, 64]) { let tp = 0, fn = 0, tn = 0, fp = 0; for (const x of all) { if (!hardF(x)) continue; const v = real(x.text.slice(0, L)); if (x.label) { v ? tp++ : fn++; } else { v ? fp++ : tn++; } } curve[L] = r6(baOf(tp, fn, tn, fp)); }
  // causal: running-LLR trace equals the LLR of the prefix; peeking mock (LLR / sqrt(total length)) does not
  let okC = 0, totC = 0, okPeek = 0, totPeek = 0;
  for (const x of all.slice(0, 600)) {
    const r = ipa.identify(x.text, { priors: P, trace: true });
    for (const frac of [0.25, 0.5, 0.75]) {
      let cut = Math.floor(x.text.length * frac); if (cut < 2) continue; if (x.text.charCodeAt(cut - 1) >= 0xd800 && x.text.charCodeAt(cut - 1) <= 0xdbff) cut++;
      const pre = ipa.identify(x.text.slice(0, cut), { priors: P }).llr;
      totC++; if (Math.abs(pre - r.trace[cut - 1]) < 1e-9) okC++;
      const peekFull = r.trace[cut - 1] / Math.sqrt(x.text.length), peekPre = pre / Math.sqrt(cut);
      totPeek++; if (Math.abs(peekFull - peekPre) < 1e-9) okPeek++;
    }
  }
  const stability = totC ? okC / totC : null, peekStab = totPeek ? okPeek / totPeek : null;
  const real_hard = hard.real.ba;
  const xf = crossFamilyProbe(P, split);
  const xfMeasurable = !!xf && Object.values(xf).every((v) => v.n >= PREREG.r0.xfamMinN);
  const xfMax = xf ? Math.max(...Object.values(xf).map((v) => v.rate ?? 0)) : null;

  // ── A3 DIAGNOSTIC STRATA (registered, not in the pass rule): items on which a block rule is wrong by construction, ASCII-heavy IPA, NFD stress ──
  const armPreds = { real: pReal, c_nonascii: pNon, c_block_ext: pBlkExt, c_block_all: pBlkAll, ...(pExtCount ? { c_extcount: pExtCount } : {}) };
  const idx = (f) => all.map((x, i) => (hardF(x) && f(x) ? i : -1)).filter((i) => i >= 0);
  const calledRate = (pred, ix) => (ix.length ? r6(ix.filter((i) => pred[i]).length / ix.length) : null);
  const stratum = (ix, note) => ({ n: ix.length, calledIPA: Object.fromEntries(Object.entries(armPreds).map(([k, v]) => [k, calledRate(v, ix)])), note });
  const trapNeg = idx((x) => !x.label && countIn(x.text, BLOCKS_ALL) >= 1);
  const freePos = idx((x) => x.label && countIn(x.text, BLOCKS_EXT) === 0);
  const asciiPos = idx((x) => x.label && asciiShare(x.text) >= PREREG.r0.asciiHeavy);
  const unionIx = [...trapNeg, ...freePos];
  const unionBA = Object.fromEntries(Object.entries(armPreds).map(([k, v]) => {
    const tp = freePos.filter((i) => v[i]).length, fn = freePos.length - tp, fp = trapNeg.filter((i) => v[i]).length, tn = trapNeg.length - fp; return [k, r6(baOf(tp, fn, tn, fp))];
  }));
  const trapLangs = {}; for (const i of trapNeg) trapLangs[all[i].it.iso] = (trapLangs[all[i].it.iso] ?? 0) + 1;
  // NFD stress: the whole hard subset with both sides NFD-normalised
  const hardIx = all.map((x, i) => (hardF(x) ? i : -1)).filter((i) => i >= 0);
  const nfdTexts = hardIx.map((i) => all[i].text.normalize("NFD"));
  const nfdLabels = hardIx.map((i) => all[i].label);
  const nfdPermIdx = derangement(hardIx.length, mulberry32(SEED + 3));
  const nfdPreds = { real: nfdTexts.map((t) => real(t)), c_nonascii: nfdTexts.map(ruleNonAscii), c_block_ext: nfdTexts.map(ruleBlockExt), c_block_all: nfdTexts.map(ruleBlockAll), ...(kfit ? { c_extcount: nfdTexts.map((t) => countIn(t, BLOCKS_COUNT) >= kfit.k) } : {}) };
  nfdPreds.c_deranged = nfdPreds.real.map((_, i) => nfdPreds.real[nfdPermIdx[i]]);
  const nfdBA = (pred) => { let tp = 0, fn = 0, tn = 0, fp = 0; pred.forEach((v, i) => { if (nfdLabels[i]) { v ? tp++ : fn++; } else { v ? fp++ : tn++; } }); return { ba: r6(baOf(tp, fn, tn, fp)), tpr: r6(tp / (tp + fn)), tnr: r6(tn / (tn + fp)) }; };
  const nfdRes = Object.fromEntries(Object.entries(nfdPreds).map(([k, v]) => [k, nfdBA(v)]));
  const nfdDrop = Object.fromEntries(Object.keys(nfdRes).filter((k) => hard[k]).map((k) => [k, r6(hard[k].ba - nfdRes[k].ba)]));
  const strata = {
    registered: "A3 diagnostic strata; NOT in the pass rule. calledIPA = share of the stratum's items the arm calls IPA (positives: higher is better; negatives: lower is better).",
    s1_block_trap_negatives: { ...stratum(trapNeg, "orthography chunks that hold a code point of the c_block_all ranges (negatives): every block rule calls them IPA by construction"), byLanguage: trapLangs },
    s2_block_free_positives: stratum(freePos, "IPA chunks with no code point in U+0250-02FF (positives): c_block_ext misses them by construction"),
    s3_ascii_heavy_positives: stratum(asciiPos, `IPA chunks whose ASCII share of non-space code points >= ${PREREG.r0.asciiHeavy} (declared)`),
    s4_trap_union_balancedAccuracy: { n: unionIx.length, positives: freePos.length, negatives: trapNeg.length, ba: unionBA, note: "S1 + S2 together: where block membership is wrong by construction, what does the reader do?" },
    s5_nfd_stress: { n: hardIx.length, arms: nfdRes, dropVsNfcHardBA: nfdDrop, note: "the hard subset with both sides NFD-normalised (precomposed diacritics become combining marks U+0300-036F in orthography as in IPA); c_deranged permutes the real verdicts" },
  };
  out.n = all.filter(hardF).length; out.applicable = true;
  out.score = r6(real_hard); out.control = r6(st.value); out.margin = r6(real_hard - st.value);
  out.controls = Object.fromEntries(Object.entries(controlsHard).map(([k, v]) => [k, r6(v)]));
  // the licence applies to the BUILT-TO-FAIL controls only (c_deranged, c_ascii, c_ablated); the natural baselines (c_nonascii, block rules, c_extcount) may tie or beat the reader
  const lic = licence(real_hard, { c_deranged: controlsHard.c_deranged, c_ascii: controlsHard.c_ascii, c_ablated: controlsHard.c_ablated });
  const d = decide({ n: langs.length, minN: PREREG.r0.minN, score: real_hard, floor: PREREG.r0.floor, margin: real_hard - st.value, marginMin: PREREG.r0.margin, signP: sign.p, licensed: lic, causal: stability === 1 && peekStab < 1,
    extras: xfMeasurable ? [{ name: `cross-family false-positive max ${r6(xfMax)} > ALPHA ${ALPHA} (v2 clause)`, ok: xfMax <= ALPHA }] : [] });
  out.pass = d.pass;
  out.gaps = [{ reason: "ipa_without_exclusive_glyph_indistinguishable_from_orthography", count: unw.length }, ...(kfit ? [] : [{ reason: "c_extcount_control_needs_a_train_corpus_absent_so_unmeasured", count: 1 }]), ...(xfMeasurable ? [] : [{ reason: "other_family_corpora_absent_or_too_small_cross_family_false_positives_unmeasured", count: 1 }]), { reason: "arbitration_among_all_systems_is_the_orchestrators_only_one_vs_rest_here", count: 1 }, { reason: "ascii_only_ipa_absent_from_wikipron_so_barely_measured_see_strata_s2_s3", count: pos.length - pos.filter((x) => /[^\x00-\x7f]/.test(x.text)).length }];
  out.notes = [`strongest control: ${st.name}`, `sign test over ${langs.length} hard languages vs ${st.name}: ${w} wins, ${l} losses, ${ties} ties, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "A3: the margin and sign test are taken against the strongest of ALL controls, including the Unicode-block membership rules (c_block_ext, c_block_all, c_extcount); the registered rule is unchanged",
    "A3: if the margin over c_block_* is ~0 the identifier is a block/category lookup, not chart competence: R0 'identify' then means 'block membership', and the real arm adds nothing the standard's block table does not",
    "verdict 'undecided' is scored as 'not IPA' (the default answer to 'is it IPA?' is no)",
    "negatives are the ORTHOGRAPHY of the very same words; non-Latin orthographies are easy negatives and reported in details.all"];
  out.details = {
    hard: Object.fromEntries(Object.entries(hard).map(([k, v]) => [k, { ba: r6(v.ba), tp: v.tp, fn: v.fn, tn: v.tn, fp: v.fp }])),
    all: Object.fromEntries(Object.entries(allv).map(([k, v]) => [k, { ba: r6(v.ba), tp: v.tp, fn: v.fn, tn: v.tn, fp: v.fp }])),
    unwitnessedPositives: { n: unw.length, of: pos.length, recalled: unwHit },
    prefixCurveHardBA: curve,
    causal: { stabilityReal: r6(stability), n: totC, peekingMockStability: r6(peekStab), licensed: peekStab != null && peekStab < 1 },
    chunks: items.length, wordsPerChunk: PREREG.chunkWords, hardLanguages: langs.length, tau: ipa.identify("a", { priors: P }).tau,
    perLanguageHardBA: Object.fromEntries(langs.map((l, i) => [l, r6(lReal[i])])),
    perLanguageHardBAStrongestControl: Object.fromEntries(langs.map((l, i) => [l, r6(lStrong[i])])),
    signTest: { against: st.name, wins: w, losses: l, ties, p: r6(sign.p) },
    blocks: { c_block_ext: BLOCKS_EXT, c_block_all: BLOCKS_ALL, c_extcount: { blocks: BLOCKS_COUNT, fit: kfit ? { k: kfit.k, trainHardBA: r6(kfit.ba), trainHardChunks: kfit.n, fitOn: "TRAIN only" } : null } },
    strata,
    crossFamily: xf,
    decision: d,
  };
  return out;
}

// ═════════════════════════════════════════════════ R1 ═════════════════════════════════════════════════
export function measureR1(split, limit, raw) {
  const out = blank("R1", split);
  const files = loadWikipron(split);
  if (!files.length) return unmeasured("R1", split, "no_files");
  const arms = r1Arms(raw);
  const names = Object.keys(arms);
  const perLang = new Map(); // iso -> {arm -> acc}
  let lines = 0;
  for (const [iso, fs_] of byIso(files)) {
    const accs = Object.fromEntries(names.map((n) => [n, newAcc()]));
    for (const f of fs_) for (const ln of sortedLimit(f.lines, limit)) {
      lines++;
      const gold = spansOfSegs(ln.segs);
      for (const n of names) scoreSpans(ln.pron, gold, arms[n](ln.pron), accs[n]);
    }
    perLang.set(iso, accs);
  }
  const markedF1 = (a) => f1of(a.tpM, a.fpM, a.fnM);
  const goldMarked = (a) => a.tpM + a.fnM;
  const usable = [...perLang.entries()].filter(([, a]) => goldMarked(a.real) >= PREREG.r1.minGoldMarked);
  const macro = (n) => mean(usable.map(([, a]) => markedF1(a[n])).filter((x) => x != null));
  const scores = Object.fromEntries(names.map((n) => [n, macro(n)]));
  const pooled = Object.fromEntries(names.map((n) => { const t = newAcc(); for (const [, a] of perLang) addAcc(t, a[n]); return [n, t]; }));
  const ctr = Object.fromEntries(names.filter((n) => n !== "real").map((n) => [n, r6(scores[n])]));
  const st = strongest(ctr);
  let w = 0, l = 0, ties = 0; for (const [, a] of usable) { const r = markedF1(a.real), c = markedF1(a[st.name]); if (r == null || c == null) continue; if (r > c + 1e-12) w++; else if (r < c - 1e-12) l++; else ties++; }
  const sign = signTest(w, l);
  // class recall (pooled over DEV)
  const classRecall = {}; const failing = [];
  for (const [c, v] of Object.entries(pooled.real.classes)) { classRecall[c] = { gold: v.gold, recall: r6(v.hit / v.gold) }; if (v.gold >= PREREG.r1.classMinSupport && v.hit / v.gold < PREREG.r1.classFloor) failing.push(c); }
  const underpowered = Object.entries(classRecall).filter(([, v]) => v.gold < PREREG.r1.classMinSupport).map(([c, v]) => ({ reason: `class_underpowered:${c}`, count: v.gold }));
  const classCtr = {};
  for (const n of names.filter((x) => x !== "real")) for (const [c, v] of Object.entries(pooled[n].classes)) { (classCtr[c] ??= {})[n] = r6(v.hit / v.gold); }
  // causal stability on a sample of lines, tone-bearing lines for the peeking mock
  const P = ipa.compilePriors(raw);
  const sample = [], toneSample = [];
  for (const f of files) for (let i = 0; i < f.lines.length; i += 211) { sample.push(f.lines[i].pron); }
  for (const f of files) for (const ln of f.lines) { if (/[˥-˩]/.test(ln.pron)) { toneSample.push(ln.pron); if (toneSample.length >= 400) break; } if (toneSample.length >= 400) break; }
  const stab = prefixStability(sample, (s, o) => ipa.earTokens(s, { priors: P, ...o }).tokens, { maxLines: 400 });
  const peek = prefixStability(toneSample, (s, o) => peekTokens(s, P, o), { maxLines: 400 });
  // A human-curated authority for "what is one segment": PHOIBLE segment strings. A3: registered, reported for the reader AND the chart-free arms (they tie).
  let phSingle = null;
  try {
    const ph = loadPhoible(split); const types = new Set();
    for (const L of Object.values(ph)) for (const [p, e] of Object.entries(L.phonemes)) if (e.cls !== "tone") types.add(p);
    const nb = (t) => [...t.normalize("NFD")].filter((c) => isBaseLetter(c)).length;
    const phArms = { real: arms.real, ucd_category: arms.ucd_category, ablated_chart: arms.ablated_chart, grapheme: arms.grapheme, codepoint: arms.codepoint };
    const row = () => ({ n: 0, readAsOne: Object.fromEntries(Object.keys(phArms).map((k) => [k, 0])), examples: [] });
    const single = row(), multi = row();
    for (const t of [...types].sort()) {
      const r = nb(t) <= 1 ? single : multi; r.n++;
      for (const [k, f] of Object.entries(phArms)) { const n1 = f(t).length === 1; if (n1) r.readAsOne[k]++; else if (k === "real" && r.examples.length < 12) r.examples.push([t, f(t).map(([a, b]) => t.slice(a, b))]); }
    }
    const rates = (r) => ({ n: r.n, readAsOne: r.readAsOne, rate: Object.fromEntries(Object.entries(r.readAsOne).map(([k, v]) => [k, r6(v / r.n)])), examples: r.examples });
    phSingle = { singleBase: rates(single), multiBase: rates(multi),
      note: "PHOIBLE authors decided each string is ONE segment. Single-base types (one base letter + modifiers) should be read as one token; multi-base types (ts, mb, ɡb written without a tie bar) are a PHOIBLE convention the segments library does not share, so a reader that follows G1 splits them. A3: the chart-free ucd_category arm is shown beside the reader." };
  } catch { phSingle = null; }
  // authority audit on DEV gold
  const audit = loadGoldAudit(split);
  let auditD = null;
  if (audit) {
    let seglib = 0, pp = 0, aligned = 0; const tPan = newAcc();
    const panArms = { gold_g1: null, real: arms.real, ucd_category: arms.ucd_category, ablated_chart: arms.ablated_chart, ablated_binding: arms.ablated_binding, grapheme: arms.grapheme, codepoint: arms.codepoint };
    const tPanArms = Object.fromEntries(Object.keys(panArms).map((k) => [k, newAcc()]));
    for (const r of audit) {
      seglib += r.seglib ? 1 : 0;
      const pan = r.panphon.map((x) => x.normalize("NFC"));
      pp += JSON.stringify(pan) === JSON.stringify(r.segs.map((x) => x.normalize("NFC"))) ? 1 : 0;
      if (pan.join("") === r.pron) { // panphon drops some symbols (e.g. a prenasal superscript): such lines cannot be span-aligned
        aligned++; const ps = spansOfSegs(pan);
        scoreSpans(r.pron, spansOfSegs(r.segs), ps, tPan);
        for (const [k, f] of Object.entries(panArms)) scoreSpans(r.pron, ps, f ? f(r.pron) : spansOfSegs(r.segs), tPanArms[k]);
      }
    }
    const pf = (a) => r6(f1of(a.tpM, a.fpM, a.fnM));
    auditD = { lines: audit.length, seglibReproduction: r6(seglib / audit.length), panphonLineExact: r6(pp / audit.length), panphonAlignedLines: aligned, panphonMarkedF1VsGold: r6(f1of(tPan.tpM, tPan.fpM, tPan.fnM)), panphonAllTokenF1VsGold: r6(f1of(tPan.tpAll, tPan.fpAll, tPan.fnAll)),
      panphonMarkedF1ByArm: Object.fromEntries(Object.keys(panArms).map((k) => [k, pf(tPanArms[k])])),
      note: "panphon is an INDEPENDENT segmenter; its disagreement with G1 shows how conventional G1 is. The headline reader score is against G1 only; A3 reports every arm against panphon beside it (marked-token F1 on the span-alignable lines)." };
  }
  const real = scores.real;
  out.n = lines; out.score = r6(real); out.control = r6(st.value); out.margin = r6(real - st.value);
  out.controls = ctr;
  const lic = licence(real, Object.fromEntries(BUILT_TO_FAIL.r1.map((k) => [k, scores[k]])));
  const causalOk = stab.stability === 1 && peek.stability != null && peek.stability < 1;
  const d = decide({ n: usable.length, minN: PREREG.r1.minN, score: real, floor: PREREG.r1.floor, margin: real - st.value, marginMin: PREREG.r1.margin, signP: sign.p, licensed: lic,
    causal: causalOk, extras: failing.map((c) => ({ name: `class ${c} recall < ${PREREG.r1.classFloor}`, ok: false })) });
  out.pass = d.pass;
  out.claim = "convention_replication";
  out.gaps = [...underpowered, { reason: "stress_marks_and_syllable_breaks_absent_from_wikipron_unmeasured", count: 1 }, { reason: "gold_is_the_segments_library_convention_not_phonetic_truth", count: 1 }, { reason: "chart_free_unicode_category_segmenter_ties_the_reader_so_no_chart_competence_is_separable_here", count: 1 }];
  out.notes = [`strongest control: ${st.name}`, `sign test over ${usable.length} languages vs ${st.name}: ${w} wins, ${l} losses, ${ties} ties, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "A3: R1 scores AGREEMENT WITH THE SEGMENTS-LIBRARY CONVENTION (replica fidelity), not IPA chart competence: the gold is itself a Unicode-category rule and a chart-free, prior-free segmenter (ucd_category) reproduces it; see details.replication and details.independentAuthority",
    "A3: 'ablated' is renamed ablated_unicode (chart + gc + block table emptied: it removes Unicode knowledge); ablated_chart removes ONLY the chart role/class and keeps gc; ablated_binding empties the TRAIN binding table",
    "primary number is MARKED-token F1 (tokens of >= 2 code points); all-token F1 is in details because plain letters dominate it"];
  out.details = {
    pooledAllTokenF1: Object.fromEntries(names.map((n) => [n, r6(f1of(pooled[n].tpAll, pooled[n].fpAll, pooled[n].fnAll))])),
    pooledMarkedF1: Object.fromEntries(names.map((n) => [n, r6(f1of(pooled[n].tpM, pooled[n].fpM, pooled[n].fnM))])),
    classRecallReal: classRecall, classRecallControls: classCtr, failingClasses: failing,
    languagesUsed: usable.length, languagesSkippedFewMarked: perLang.size - usable.length, lines,
    signTest: { against: st.name, wins: w, losses: l, ties, p: r6(sign.p) },
    builtToFail: BUILT_TO_FAIL.r1, naturalBaselines: names.filter((n) => n !== "real" && !BUILT_TO_FAIL.r1.includes(n)),
    replication: { claim: "convention_replication", meaning: "agreement with the segments-library convention (G1); a replica of a Unicode-category rule, NOT a claim of IPA chart competence", floor: PREREG.r1.replicationFloor, score: r6(real), causal: causalOk, pass: causalOk && real >= PREREG.r1.replicationFloor, chartFreeUcdCategoryScore: r6(scores.ucd_category), realMinusUcdCategory: r6(real - scores.ucd_category), chartRoleOnlyAblationScore: r6(scores.ablated_chart), bindingAblationScore: r6(scores.ablated_binding), competencePass: d.pass },
    independentAuthority: { panphon: auditD, phoibleSingleSegment: phSingle },
    worstLanguages: usable.map(([iso, a]) => [iso, r6(markedF1(a.real)), goldMarked(a.real)]).sort((a, b) => a[1] - b[1]).slice(0, 6),
    causal: { stabilityReal: r6(stab.stability), n: stab.tot, peekingMockStability: r6(peek.stability), peekN: peek.tot, licensed: peek.stability != null && peek.stability < 1 },
    goldAudit: auditD, exploratory: { phoibleSingleSegment: phSingle, postHoc: false, note: "registered in A3 (was post-hoc exploratory in runs 1-3)" }, decision: d,
  };
  return out;
}

// ═════════════════════════════════════════════════ R2 ═════════════════════════════════════════════════
const ctrs0 = (ba, p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, ba(v).ba]));
export function measureR2(split, limit, raw, P) {
  const out = blank("R2", split);
  let ph; try { ph = loadPhoible(split); } catch { return unmeasured("R2", split, "no_phoible"); }
  const types = new Map(); // seg -> cls
  for (const L of Object.values(ph)) for (const [p, e] of Object.entries(L.phonemes)) types.set(p, e.cls);
  let list = [...types.keys()].sort(); list = sortedLimit(list, limit);
  const gold = list.map((s) => types.get(s));
  const trainSeen = (s) => P.idx.phoible.has(s);
  const Pabl = ipa.compilePriors({ ...raw, chart: { ...clone(raw.chart), codepoints: {}, sequences: {} }, segments: { ...raw.segments, phoible: {} } });
  const predReal = list.map((s) => ipa.classify(s, { priors: P }).cls);
  const predMaj = list.map(() => "consonant");
  const predAscii = list.map((s) => { const c = [...s.normalize("NFD")][0]; return /[aeiouy]/.test(c) ? "vowel" : /\p{L}/u.test(c) ? "consonant" : "tone"; });
  const predLookup = list.map((s) => (P.idx.phoible.get(s)?.cls ?? "consonant"));
  const predAbl = list.map((s) => ipa.classify(s, { priors: Pabl }).cls);
  const perm = derangement(list.length, mulberry32(SEED + 2));
  const predDer = list.map((_, i) => gold[perm[i]]);
  const ba = (pred, idxs = null) => balancedAccuracy(list.map((s, i) => [gold[i], pred[i]]).filter((_, i) => !idxs || idxs.includes(i)), PREREG.r2.minPerClass);
  const novelIdx = list.map((s, i) => (trainSeen(s) ? -1 : i)).filter((i) => i >= 0);
  const R = ba(predReal), Rn = ba(predReal, novelIdx);
  if (R.ba == null || Object.values(ctrs0(ba, { predMaj, predAscii, predLookup, predAbl })).some((v) => v == null)) return unmeasured("R2", split, "too_few_types_per_class_for_balanced_accuracy", [`n=${list.length} types; a class needs >= ${PREREG.r2.minPerClass}`]);
  const ctrs = { majority: ba(predMaj).ba, ascii_rule: ba(predAscii).ba, deranged: ba(predDer).ba, train_lookup: ba(predLookup).ba, ablated: ba(predAbl).ba };
  const st = strongest(ctrs);
  const strongPred = { majority: predMaj, ascii_rule: predAscii, deranged: predDer, train_lookup: predLookup, ablated: predAbl }[st.name];
  let w = 0, l = 0; list.forEach((_, i) => { const a = predReal[i] === gold[i], b = strongPred[i] === gold[i]; if (a && !b) w++; else if (!a && b) l++; });
  const sign = signTest(w, l);
  const unknown = predReal.filter((c) => c === "unknown").length;
  const how = {}; list.forEach((s) => { const h = ipa.classify(s, { priors: P }).how; how[h] = (how[h] ?? 0) + 1; });
  // R2b diagnostic: can a code point open a segment? gold = DEV WikiPron head share
  const diag = r2Diagnostic(split, P);
  out.n = list.length; out.score = r6(R.ba); out.control = r6(st.value); out.margin = r6(R.ba - st.value);
  out.controls = Object.fromEntries(Object.entries(ctrs).map(([k, v]) => [k, r6(v)]));
  const lic = licence(R.ba, { deranged: ctrs.deranged, ablated: ctrs.ablated, majority: ctrs.majority });
  const novelOk = novelIdx.length >= PREREG.r2.minNovel ? Rn.ba >= PREREG.r2.floorNovel : true;
  const d = decide({ n: list.length, minN: PREREG.r2.minN, score: R.ba, floor: PREREG.r2.floor, margin: R.ba - st.value, marginMin: PREREG.r2.margin, signP: sign.p, licensed: lic, extras: [{ name: `novel-type balanced accuracy ${r6(Rn.ba)} < ${PREREG.r2.floorNovel}`, ok: novelOk }] });
  out.pass = d.pass;
  out.gaps = [{ reason: "class_unknown", count: unknown }, { reason: "types_not_in_train_phoible", count: novelIdx.length }, { reason: "tone_class_is_tone_letters_and_marks_only_digit_and_arrow_tone_conventions_unmeasured", count: 1 }];
  out.notes = [`strongest control: ${st.name}`, `sign test over ${list.length} types: ${w} wins, ${l} losses, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "types are DISTINCT PHOIBLE segment strings of DEV languages (each counted once); PHOIBLE classes never conflict per string (checked at build)",
    "R2b diagnostic (details.canNameBeing) is NOT in the pass rule: its gold is a Unicode-category algorithm, so category baselines tie the reader"];
  out.details = { perClass: R.perClass, novel: { n: novelIdx.length, ba: r6(Rn.ba), perClass: Rn.perClass }, how, canNameBeing: diag, decision: d };
  return out;
}
function r2Diagnostic(split, P) {
  const head = new Map(), tot = new Map();
  for (const f of loadWikipron(split)) for (const ln of f.lines) for (const s of ln.segs) { let first = true; for (const ch of s) { tot.set(ch, (tot.get(ch) ?? 0) + 1); if (first) head.set(ch, (head.get(ch) ?? 0) + 1); first = false; } }
  const rows = []; for (const [c, n] of tot) if (n >= 5) rows.push({ c, namer: (head.get(c) ?? 0) / n >= PREREG.dependentHeadShare, n });
  const pred = (c) => { const a = ipa.charInfo(c.codePointAt(0), P).attach; return a === "head" || a === "tone" || a === "solo"; };
  const catRule = (c) => !isModGc(gcOf(c)) && !(gcOf(c) === "Sk" && false);
  const acc = (f) => mean(rows.map((r) => (f(r.c) === r.namer ? 1 : 0)));
  return { types: rows.length, reader: r6(acc(pred)), unicodeCategoryRule: r6(acc(catRule)), majority: r6(Math.max(rows.filter((r) => r.namer).length, rows.filter((r) => !r.namer).length) / rows.length), headShareThreshold: PREREG.dependentHeadShare,
    note: "gold = a code point opens a gold segment in >= 20% of its occurrences (tie-bar second components inflate continuation, so not 1/2). The G1 algorithm is itself a Unicode-category rule: do not read a tie with the category baseline as chart competence." };
}

// ═════════════════════════════════════════════════ R3 ═════════════════════════════════════════════════
export const isBaseLetter = (ch) => /\p{L}/u.test(ch) && !/\p{Lm}/u.test(ch);
const foldG = (d) => (d === "g" ? "ɡ" : d);
export function phoibleBaseSets(L) {
  const ph = new Set(), all = new Set();
  for (const [p, e] of Object.entries(L.phonemes)) { if (e.cls === "tone") continue; for (const d of p.normalize("NFD")) if (isBaseLetter(d)) { ph.add(foldG(d)); all.add(foldG(d)); } }
  for (const a of L.allophones) for (const d of a.normalize("NFD")) if (isBaseLetter(d)) all.add(foldG(d));
  return { phonemes: ph, all };
}
export function setPRF(R, truthAll, truthPh) {
  let hitP = 0; for (const x of R) if (truthAll.has(x)) hitP++;
  let hitR = 0; for (const x of truthPh) if (R.has(x)) hitR++;
  const P = R.size ? hitP / R.size : 0, Rc = truthPh.size ? hitR / truthPh.size : 0;
  return { p: P, r: Rc, f1: P + Rc ? (2 * P * Rc) / (P + Rc) : 0 };
}
export function measureR3(split, limit, raw, P) {
  const out = blank("R3", split);
  let ph; try { ph = loadPhoible(split); } catch { return unmeasured("R3", split, "no_phoible"); }
  const files = loadWikipron(split);
  const phByIso = new Map(); for (const [k, L] of Object.entries(ph)) if (L.iso) { if (!phByIso.has(L.iso)) phByIso.set(L.iso, { phonemes: new Map(), allophones: new Set(), n: 0 }); const e = phByIso.get(L.iso); for (const [p, v] of Object.entries(L.phonemes)) e.phonemes.set(p, v); for (const a of L.allophones) e.allophones.add(a); e.n += L.n_inventories; }
  const groups = byIso(files);
  const evalIsos = []; let noInv = 0;
  for (const iso of [...groups.keys()].sort()) { if (phByIso.has(iso)) evalIsos.push(iso); else noInv++; }
  const use = sortedLimit(evalIsos, limit);
  if (!use.length) return unmeasured("R3", split, "no_language_with_both_text_and_phoible_inventory");
  const Pabl = ablatedChart(raw), PablGc = ablatedChartKeepGc(raw);
  const truth = {}; for (const iso of use) { const e = phByIso.get(iso); truth[iso] = phoibleBaseSets({ phonemes: Object.fromEntries(e.phonemes), allophones: [...e.allophones] }); }
  const arms = { real: {}, codepoint: {}, ablated_unicode: {}, ablated_chart: {}, ceiling: {} };
  const typeF1 = {}; // diagnostic: exact segment types vs gold types
  for (const iso of use) {
    const text = groups.get(iso).flatMap((f) => f.lines.map((l) => l.pron)).join(" ");
    const goldSegs = groups.get(iso).flatMap((f) => f.lines.flatMap((l) => l.segs));
    const rd = ipa.read(text, { priors: P });
    arms.real[iso] = ipa.baseSetOf(rd);
    arms.ablated_unicode[iso] = ipa.baseSetOf(ipa.read(text, { priors: Pabl }));
    arms.ablated_chart[iso] = ipa.baseSetOf(ipa.read(text, { priors: PablGc }));
    const cps = new Set(); for (const ch of text) { if (/\s/.test(ch)) continue; cps.add(foldG([...ch.normalize("NFD")][0])); } arms.codepoint[iso] = cps;
    const cl = new Set(); for (const s of new Set(goldSegs)) { if (/^[˥-˩¹²³⁰-⁹⁻]+$/.test(s)) continue; for (const d of s.normalize("NFD")) if (isBaseLetter(d)) cl.add(foldG(d)); } arms.ceiling[iso] = cl;
    const rt = new Set(rd.beings.filter((b) => b.kind === "segment").map((b) => b.type)); const gt = new Set(goldSegs.filter((s) => !/^[˥-˩¹²³⁰-⁹⁻]+$/.test(s)).map((s) => s.normalize("NFC")));
    let tp = 0; for (const t of rt) if (gt.has(t)) tp++; typeF1[iso] = f1of(tp, rt.size - tp, gt.size - tp);
  }
  const f1s = (setsByIso, derange = false) => use.map((iso, i) => { const t = truth[derange ? use[(i + 1) % use.length] : iso]; return setPRF(setsByIso[iso], t.all, t.phonemes); });
  const mac = (xs) => mean(xs.map((x) => x.f1));
  const res = { real: f1s(arms.real), codepoint: f1s(arms.codepoint), ablated_unicode: f1s(arms.ablated_unicode), ablated_chart: f1s(arms.ablated_chart), ceiling: f1s(arms.ceiling), deranged_lang: f1s(arms.real, true) };
  const scores = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, mac(v)]));
  const ctr = { codepoint: scores.codepoint, deranged_lang: scores.deranged_lang, ablated_unicode: scores.ablated_unicode, ablated_chart: scores.ablated_chart };
  const st = strongest(ctr);
  let w = 0, l = 0; res.real.forEach((r, i) => { const c = res[st.name][i]; if (r.f1 > c.f1 + 1e-12) w++; else if (r.f1 < c.f1 - 1e-12) l++; });
  const sign = signTest(w, l);
  // causal stability over beings
  const P2 = P; const sample = []; for (const iso of use) for (const f of groups.get(iso)) for (let i = 0; i < f.lines.length; i += 331) sample.push(f.lines[i].pron);
  const stab = prefixStability(sample, (s, o) => ipa.read(s, { priors: P2, ...o }).beings, { maxLines: 300 });
  // POST-HOC EXPLORATORY (not in the pass rule): exact SEGMENT TYPES (single-base, tie bars folded) vs PHOIBLE strings: sensitive to modifier binding
  const foldSeg = (t) => [...t.normalize("NFC")].filter((c) => !TIE.has(c)).map((c) => (c === "g" ? "\u0261" : c)).join("");
  const nbase = (t) => [...t.normalize("NFD")].filter((c) => isBaseLetter(c)).length;
  const expl = { real: [], codepoint: [], ablated_unicode: [], ablated_chart: [], ceiling: [] };
  for (const iso of use) {
    const e = phByIso.get(iso);
    const phAll = new Set([...e.phonemes].filter(([, v]) => v.cls !== "tone").map(([p]) => foldSeg(p)).concat([...e.allophones].map(foldSeg)).filter((t) => nbase(t) === 1));
    const phPh = new Set([...e.phonemes].filter(([, v]) => v.cls !== "tone").map(([p]) => foldSeg(p)).filter((t) => nbase(t) === 1));
    const text = groups.get(iso).flatMap((f) => f.lines.map((l) => l.pron)).join(" ");
    const typesOf = (rd) => new Set(rd.beings.filter((b) => b.kind === "segment").map((b) => foldSeg(b.type)).filter((t) => nbase(t) === 1));
    const cps = new Set([...text].filter((c) => !/\s/.test(c)).map(foldSeg));
    const gold = new Set(groups.get(iso).flatMap((f) => f.lines.flatMap((l) => l.segs)).map(foldSeg).filter((t) => nbase(t) === 1));
    expl.real.push(setPRF(typesOf(ipa.read(text, { priors: P })), phAll, phPh).f1);
    expl.ablated_unicode.push(setPRF(typesOf(ipa.read(text, { priors: Pabl })), phAll, phPh).f1);
    expl.ablated_chart.push(setPRF(typesOf(ipa.read(text, { priors: PablGc })), phAll, phPh).f1);
    expl.codepoint.push(setPRF(cps, phAll, phPh).f1);
    expl.ceiling.push(setPRF(gold, phAll, phPh).f1);
  }
  const exploratory = { postHoc: true, exactSingleBaseSegmentTypeF1VsPhoible: Object.fromEntries(Object.entries(expl).map(([k, v]) => [k, r6(mean(v))])), note: "segment types (tie bars removed, g->U+0261) of ONE base letter vs PHOIBLE phonemes+allophones of one base letter; macro over the same languages. Sensitive to modifier binding, unlike the registered base-letter matcher." };
  out.n = use.length; out.score = r6(scores.real); out.control = r6(st.value); out.margin = r6(scores.real - st.value);
  out.controls = Object.fromEntries(Object.entries(ctr).map(([k, v]) => [k, r6(v)]));
  const lic = licence(scores.real, Object.fromEntries(BUILT_TO_FAIL.r3.map((k) => [k, ctr[k]])));
  const d = decide({ n: use.length, minN: PREREG.r3.minN, score: scores.real, floor: scores.ceiling - PREREG.r3.ceilingSlack, margin: scores.real - st.value, marginMin: PREREG.r3.margin, signP: sign.p, licensed: lic, causal: stab.stability === 1 });
  out.pass = d.pass;
  out.gaps = [{ reason: "language_has_text_but_no_phoible_inventory_under_the_same_iso", count: noInv }, { reason: "segment_types_vs_phoible_notation_differs_only_base_letters_compared", count: 1 }, { reason: "tone_beings_not_compared_to_phoible_tone_inventory", count: 1 }];
  out.notes = [`ceiling (gold segmentation heads vs PHOIBLE) macro F1 = ${r6(scores.ceiling)}: the best any segmenter can do on this matcher`, `strongest control: ${st.name}`, `sign test over ${use.length} languages: ${w} wins, ${l} losses, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "score = macro over languages of F1(precision vs PHOIBLE phonemes+allophones base letters, recall vs PHOIBLE phoneme base letters)"];
  out.details = { ceiling: r6(scores.ceiling), scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, r6(v)])), perLanguage: Object.fromEntries(use.map((iso, i) => [iso, { real: r6(res.real[i].f1), p: r6(res.real[i].p), r: r6(res.real[i].r), ceiling: r6(res.ceiling[i].f1), codepoint: r6(res.codepoint[i].f1), ablated_chart: r6(res.ablated_chart[i].f1) }])),
    exactTypeF1VsGoldTypes: r6(mean(Object.values(typeF1).filter((x) => x != null))), causal: { stabilityReal: r6(stab.stability), n: stab.tot }, exploratory, decision: d };
  return out;
}

// ═════════════════════════════════════════════════ R4 ═════════════════════════════════════════════════
export function measureR4(split, limit, raw, P) {
  const out = blank("R4", split);
  const files = loadWikipron(split);
  if (!files.length) return unmeasured("R4", split, "no_files");
  const Pabl = ablatedChart(raw), Pder = derangedChart(raw);
  // built to fail: codepoint, ablated_unicode, deranged. Natural baselines (A3): grapheme, ucd_category (chart-free, prior-free), ablated_chart (gc kept), ablated_binding, ablated_chart_binding
  const armSpans = { codepoint: armCodepoint, ablated_unicode: armReader(Pabl), deranged: armReader(Pder), grapheme: armGrapheme, ucd_category: armUcd, ablated_chart: armReader(ablatedChartKeepGc(raw)), ablated_binding: armReader(ablatedBinding(raw)), ablated_chart_binding: armReader(ablatedChartKeepGc(raw, { binding: false })) };
  const names = ["real", ...Object.keys(armSpans)];
  const perLang = new Map(); const cls = Object.fromEntries(names.map((n) => [n, {}]));
  const bump = (n, c, k) => { const e = (cls[n][c] ??= { tp: 0, fp: 0, fn: 0 }); e[k]++; };
  let lines = 0;
  for (const [iso, fs_] of byIso(files)) {
    const acc = Object.fromEntries(names.map((n) => [n, { tp: 0, fp: 0, fn: 0 }]));
    for (const f of fs_) for (const ln of sortedLimit(f.lines, limit)) {
      lines++;
      const gold = edgesFromSpans(ln.pron, spansOfSegs(ln.segs)); const gk = new Map(gold.map((e) => [e.k, e.cls]));
      const rd = ipa.read(ln.pron, { priors: P });
      const realE = rd.relations.filter((r) => r.label === "binds" || r.label === "ties").map((r) => { const b = rd.beings.find((x) => x.id === r.end2); const [s, e] = r.span; return { k: `${s}-${e}>${b.span[0]}-${b.span[1]}`, cls: edgeClass(r.mod, s === b.span[0]) }; });
      const arms = { real: realE, ...Object.fromEntries(Object.entries(armSpans).map(([n, f2]) => [n, edgesFromSpans(ln.pron, f2(ln.pron))])) };
      for (const n of names) {
        const pk = new Map(arms[n].map((e) => [e.k, e.cls]));
        for (const [k, c] of gk) { if (pk.has(k)) { acc[n].tp++; bump(n, c, "tp"); } else { acc[n].fn++; bump(n, c, "fn"); } }
        for (const [k, c] of pk) if (!gk.has(k)) { acc[n].fp++; bump(n, c, "fp"); }
      }
    }
    perLang.set(iso, acc);
  }
  // gold support of a class = its gold edges = tp + fn of ANY arm (the gold set does not depend on the arm)
  const support = {}; for (const c of new Set(names.flatMap((n) => Object.keys(cls[n])))) support[c] = (cls.real[c]?.tp ?? 0) + (cls.real[c]?.fn ?? 0);
  const usedClasses = Object.keys(support).filter((c) => support[c] >= PREREG.r4.classMinSupport);
  const macro = (n) => mean(usedClasses.map((c) => { const e = cls[n][c] ?? { tp: 0, fp: 0, fn: 0 }; return f1of(e.tp, e.fp, e.fn); }).filter((x) => x != null));
  const scores = Object.fromEntries(names.map((n) => [n, macro(n)]));
  const ctr = Object.fromEntries(names.filter((n) => n !== "real").map((n) => [n, r6(scores[n])]));
  const st = strongest(ctr);
  let w = 0, l = 0, ties = 0; for (const [, a] of perLang) { const r = f1of(a.real.tp, a.real.fp, a.real.fn), c = f1of(a[st.name].tp, a[st.name].fp, a[st.name].fn); if (r == null || c == null) continue; if (r > c + 1e-12) w++; else if (r < c - 1e-12) l++; else ties++; }
  const sign = signTest(w, l);
  const clsF1 = (n, c) => r6(f1of(cls[n][c]?.tp ?? 0, cls[n][c]?.fp ?? 0, cls[n][c]?.fn ?? 0));
  const perClass = Object.fromEntries(usedClasses.map((c) => [c, { support: support[c], real: clsF1("real", c), codepoint: clsF1("codepoint", c), grapheme: clsF1("grapheme", c), ucd_category: clsF1("ucd_category", c), ablated_chart: clsF1("ablated_chart", c) }]));
  const underpowered = Object.keys(support).filter((c) => support[c] < PREREG.r4.classMinSupport).map((c) => ({ reason: `edge_class_underpowered:${c}`, count: support[c] }));
  out.n = lines; out.score = r6(scores.real); out.control = r6(st.value); out.margin = r6(scores.real - st.value);
  out.controls = ctr;
  const lic = licence(scores.real, Object.fromEntries(BUILT_TO_FAIL.r4.map((k) => [k, scores[k]])));
  const d = decide({ n: perLang.size, minN: PREREG.r4.minN, score: scores.real, floor: PREREG.r4.floor, margin: scores.real - st.value, marginMin: PREREG.r4.margin, signP: sign.p, licensed: lic, extras: [{ name: `fewer than ${PREREG.r4.minClasses} edge classes with support >= ${PREREG.r4.classMinSupport}`, ok: usedClasses.length >= PREREG.r4.minClasses }] });
  out.pass = d.pass;
  out.gaps = [...underpowered, { reason: "claims_not_applicable", count: 1 }, { reason: "relation_class_of_segment_is_R2_not_repeated", count: 1 }, { reason: "stress_prefix_and_syllable_break_edges_absent_from_wikipron_unmeasured", count: 1 }];
  out.claim = "convention_replication";
  out.notes = [`strongest control: ${st.name}`, `sign test over ${perLang.size} languages vs ${st.name}: ${w} wins, ${l} losses, ${ties} ties, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "A3: R4 scores AGREEMENT WITH THE SEGMENTS-LIBRARY CONVENTION's binding edges (replica fidelity), not chart competence: edges follow spans and a chart-free segmenter (ucd_category) reproduces them; see details.replication",
    "relations here are STRUCTURAL (a modifier binds to its segment; a tie bar joins two bases). IPA text states no propositions: claims are typed not-applicable.",
    "R4 is derivative of R1 for IPA by construction (edges follow spans); it adds the per-edge-class macro, which weights rare classes equally. The real arm is scored on the reader's emitted `binds`/`ties` relations, not on its spans."];
  const causalNote = { checked: false, note: "R4 edges are derived from R1 tokens; R1's prefix-stability (details.causal there) is the causal check" };
  out.details = { perClass, macroOver: usedClasses, signTest: { against: st.name, wins: w, losses: l, ties, p: r6(sign.p) }, builtToFail: BUILT_TO_FAIL.r4, naturalBaselines: names.filter((n) => n !== "real" && !BUILT_TO_FAIL.r4.includes(n)),
    replication: { claim: "convention_replication", meaning: "agreement with the segments-library convention's binding edges (G1); NOT a claim of chart competence", floor: PREREG.r4.replicationFloor, score: r6(scores.real), pass: usedClasses.length >= PREREG.r4.minClasses && scores.real >= PREREG.r4.replicationFloor, chartFreeUcdCategoryScore: r6(scores.ucd_category), realMinusUcdCategory: r6(scores.real - scores.ucd_category), chartRoleOnlyAblationScore: r6(scores.ablated_chart), bindingAblationScore: r6(scores.ablated_binding), competencePass: d.pass, causal: causalNote },
    notApplicable: [{ part: "claims", applicable: false, reason: "claims_not_applicable: an IPA transcription states no propositions; only structural relations (binding, tie, class) exist" }], decision: d };
  return out;
}

// ═════════════════════════════════════════════════ R5 ═════════════════════════════════════════════════
export function measureR5(split, limit, raw, P) {
  const out = blank("R5", split);
  const files = loadWikipron(split);
  if (!files.length) return unmeasured("R5", split, "no_files");
  const Pabl = ablatedChart(raw), PablGc = ablatedChartKeepGc(raw);
  const groups = new Map(); // iso|script|dialect -> {Broad, Narrow}
  for (const f of files) { const k = `${f.meta.iso}|${f.meta.script}|${f.meta.dialect}`; if (!groups.has(k)) groups.set(k, {}); groups.get(k)[f.meta.nb] = f; }
  const rng = mulberry32(SEED + 5);
  const arms = { real: (s) => ipa.canon(s, { priors: P }), raw: (s) => s.replace(/\s+/g, ""), mn_strip: (s) => s.normalize("NFD").replace(/\p{Mn}/gu, "").normalize("NFC"), ablated_unicode: (s) => ipa.canon(s, { priors: Pabl }), ablated_chart: (s) => ipa.canon(s, { priors: PablGc }) };
  const names = [...Object.keys(arms), "deranged"];
  // POST-HOC EXPLORATORY arm (not in the pass rule): the skeleton that KEEPS vowel/consonant length (contrastive in many languages)
  const keepLen = (s) => ipa.earTokens(s, { priors: P }).tokens.filter((t) => t.kind === "segment").map((t) => t.bases.map((b) => { const d = [...b.normalize("NFD")][0]; return d === "g" ? "\u0261" : d; }).join("") + (t.mods.some((m) => m.role === "length") ? "\u02d0" : "")).join("");
  const explo = [];
  const perGroup = []; let pairsTotal = 0, noPair = 0;
  for (const [k, g] of [...groups].sort()) {
    if (!g.Broad || !g.Narrow) { noPair++; continue; }
    const bw = new Map(); g.Broad.lines.forEach((l, i) => { if (!bw.has(l.word)) bw.set(l.word, []); bw.get(l.word).push(i); });
    const qs = []; g.Narrow.lines.forEach((l) => { if (bw.has(l.word)) qs.push(l); });
    const Q = sortedLimit(qs, limit ?? PREREG.r5.queriesPerGroup);
    if (Q.length < PREREG.r5.minPairs) { noPair++; continue; }
    const perm = derangement(Q.length, rng);
    const rec = { key: k, n: Q.length, pool: g.Broad.lines.length, credit: {} };
    const pools = Object.fromEntries(Object.entries(arms).map(([n, f]) => [n, g.Broad.lines.map((l) => f(l.pron))]));
    const truths = Q.map((q) => new Set(bw.get(q.word)));
    for (const n of Object.keys(arms)) { const f = arms[n]; rec.credit[n] = mean(Q.map((q, i) => retrievalCredit(f(q.pron), pools[n], truths[i]))); if (n === "real") rec.credit.deranged = mean(Q.map((q, i) => retrievalCredit(f(q.pron), pools.real, truths[perm[i]]))); }
    rec.chance = 1 / g.Broad.lines.length;
    const poolKL = g.Broad.lines.map((l) => keepLen(l.pron)); rec.keepLength = mean(Q.map((q, i) => retrievalCredit(keepLen(q.pron), poolKL, truths[i])));
    pairsTotal += Q.length; perGroup.push(rec);
  }
  if (!perGroup.length) return unmeasured("R5", split, "no_broad_narrow_pairs");
  const scores = Object.fromEntries(names.map((n) => [n, mean(perGroup.map((g) => g.credit[n]))]));
  const ctr = Object.fromEntries(names.filter((n) => n !== "real").map((n) => [n, r6(scores[n])]));
  const st = strongest(ctr);
  let w = 0, l = 0; for (const g of perGroup) { if (g.credit.real > g.credit[st.name] + 1e-12) w++; else if (g.credit.real < g.credit[st.name] - 1e-12) l++; }
  const sign = signTest(w, l);
  out.n = pairsTotal; out.score = r6(scores.real); out.control = r6(st.value); out.margin = r6(scores.real - st.value);
  out.controls = ctr;
  const lic = licence(scores.real, Object.fromEntries(BUILT_TO_FAIL.r5.map((k) => [k, scores[k]])));
  const d = decide({ n: perGroup.length, minN: PREREG.r5.minGroups, score: scores.real, floor: PREREG.r5.floor, margin: scores.real - st.value, marginMin: PREREG.r5.margin, signP: sign.p, licensed: lic });
  out.pass = d.pass;
  out.gaps = [{ reason: "orthography_to_ipa_needs_a_g2p_prior_none_received", count: 1 }, { reason: "same_content_across_languages_has_no_gold", count: 1 }, { reason: "language_groups_without_a_broad_narrow_pair_with_enough_shared_words", count: noPair }];
  out.notes = [`strongest control: ${st.name}`, `sign test over ${perGroup.length} language groups: ${w} wins, ${l} losses, p=${r6(sign.p)}`, ...(d.why ?? []).map((x) => `pass blocked: ${x}`),
    "task: from the NARROW transcription of a word retrieve the BROAD transcription of the same word among all broad entries of the same language (normalised edit distance on skeletons; ties share credit)"];
  out.details = { groups: perGroup.map((g) => ({ key: g.key, n: g.n, pool: g.pool, chance: r6(g.chance), real: r6(g.credit.real), raw: r6(g.credit.raw), mn_strip: r6(g.credit.mn_strip), ablated_chart: r6(g.credit.ablated_chart), ablated_unicode: r6(g.credit.ablated_unicode), deranged: r6(g.credit.deranged), keepLength: r6(g.keepLength) })),
    notMeasured: [{ part: "orthography_to_ipa", applicable: true, measured: false, reason: "needs a received G2P (grapheme-to-phoneme) prior per language; none exists in khora" }, { part: "same_content_across_languages", applicable: true, measured: false, reason: "no parallel gold" }],
    exploratory: { postHoc: true, keepLengthSkeleton: r6(mean(perGroup.map((g) => g.keepLength))), note: "skeleton + length marks kept (post-hoc; the registered arm drops length, which is contrastive in e.g. Maori, Finnish)" }, decision: d };
  return out;
}

// ═════════════════════════════════════════════════ measure ═════════════════════════════════════════════════
/** measure({split="dev", limit=null}) -> {family, split, rungs:{r0..r5}}. Never throws for missing data: {pass:null, gaps:[{reason:"unmeasured"}]}. */
export async function measure({ split = "dev", limit = null } = {}) {
  const t0 = Date.now();
  const all = (reason) => ({ family: FAMILY, split, rungs: Object.fromEntries(["R0", "R1", "R2", "R3", "R4", "R5"].map((r) => [r.toLowerCase(), unmeasured(r, split, reason)])) });
  let P, raw;
  try { P = ipa.loadPriors(); raw = rawPriors(); } catch (e) { return all(`adapter_or_priors_unavailable:${e.message}`); }
  if (!P.ok) return { ...all("prior_missing"), gaps: P.gaps };
  if (!dataAvailable()) return all(`corpus_missing:${ROOT}`);
  const rungs = {};
  const run = (k, f) => { try { rungs[k] = f(); } catch (e) { rungs[k] = { ...unmeasured(k.toUpperCase(), split, `error:${e.message}`), notes: [e.stack?.split("\n").slice(0, 3).join(" | ")] }; } };
  run("r0", () => measureR0(split, limit, P, raw));
  run("r1", () => measureR1(split, limit, raw));
  run("r2", () => measureR2(split, limit, raw, P));
  run("r3", () => measureR3(split, limit, raw, P));
  run("r4", () => measureR4(split, limit, raw, P));
  run("r5", () => measureR5(split, limit, raw, P));
  return { family: FAMILY, split, limit, seconds: Math.round((Date.now() - t0) / 100) / 10, priorsDir: P.dir, rungs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const split = process.argv[2] ?? "dev"; const limit = process.argv[3] ? Number(process.argv[3]) : null;
  measure({ split, limit }).then((r) => console.log(JSON.stringify(r, null, 1)));
}

// ── RUN LOG (appended after the pre-registration above; the registered text above is not edited) ────────────────
// RUN 1 (DEV, registered rules, 2026-10-06, 80 s). r0 PASS (hard BA 0.9839 vs strongest control c_nonascii 0.6549; 21 wins/0 losses over 24 hard
//   languages); r1 marked-F1 0.99989 BLOCKED ONLY by the causal licence (the registered peeking mock scored stability 1.0 on 4,220 checks: it never
//   diverged on this corpus, so the licence was not established); r2 PASS (BA 0.9945 vs ascii_rule 0.8396; novel types 0.9835); r3 FAIL (score 0.8581 =
//   ceiling 0.8581, but margin 0.0036 < 0.05, sign p 0.254, and the `ablated` control 0.8546 is within 0.05 of the real arm: NOT licensed); r4 PASS
//   (macro-F1 0.9988 over 4 classes); r5 FAIL (score 0.8074 < strongest control mn_strip 0.8200; 4 wins / 6 losses, p 0.83; `ablated` 0.8074 not licensed).
//   Predictions that were WRONG: R0 (predicted 0.80-0.90, got 0.984), R5 (predicted raw 0.45-0.70, got 0.805; predicted pass, got fail).
// AMENDMENT A1 (after run 1; instrument licence only, the reader and every threshold untouched): the registered peeking mock (group tone letters iff the
//   whole text has >= 2 tone letters) was INEFFECTIVE; replaced by PEEK_LEN (group iff the whole text is >= 10 code units). The unit test proves the
//   checker can fail (tests/notation-ipa.test.js), and the amended mock scores 0.874 on the corpus (licensed).
// AMENDMENT A2 (after run 1): `details.exploratory.*` blocks added (PHOIBLE single-segment check, exact segment-type F1 vs PHOIBLE, keep-length R5 skeleton,
//   cross-family false-positive probe). They are POST-HOC, never in a pass rule, and flagged `postHoc: true`.
// RUN 2 (DEV, after A1/A2, 74 s). r1 now PASS (peeking mock stability 0.874, licensed); every other number identical to run 1 (deterministic).
//   POST-HOC FINDING (cross-family probe, v1 identify prior): the IPA identifier calls other notations IPA: English prose 22%, Morse 100%, SMILES 98.7%,
//   InChI 100%, IUPAC names 95% (first 80 chars of the first 300 items of each sibling DEV file). The registered R0 negatives were ORTHOGRAPHY only.
//   Diagnosis from the prior itself: TRAIN IPA lines carry more punctuation than TRAIN orthography (LLR +2.0 per punct char), uppercase ASCII letters are not
//   modelled, and chart symbols that never occur in TRAIN IPA text ('.', stress marks) were pooled with attested ones.
// AMENDMENT v2 (REGISTERED 2026-10-06 AFTER run 2 AND BEFORE ITS FIRST RUN; this block is the pre-registration of the v2 identify prior):
//   CHANGE (adapter + TRAIN-only prior; R1-R5 cannot change because they do not call classOfChar): the R0 class grammar is refined from 14 to 17 classes:
//     ascii_letter -> ascii_letter_chart (a-z, chart symbols) + ascii_letter_nonchart (A-Z: IPA has no capitals; casing is ONE witness, its LLR is TRAIN-derived);
//     punct -> ipa_punct (boundary chart symbols ATTESTED in TRAIN IPA) + other_punct; and any chart symbol that is NOT attested in TRAIN IPA text (a code point
//     absent from the TRAIN binding table: '.', stress marks, rare letters) is the NEUTRAL class chart_unattested (priors NOMINATE only what TRAIN attests).
//     The LLR table is re-estimated on TRAIN only (same Jeffreys smoothing A=0.5, same tau = ln((1-a)/a)).
//   PREDICTION v2: IPA-vs-orthography hard BA 0.97-0.99 (unchanged within 0.01); cross-family false-positive rate <= 0.05 for English prose, Morse, InChI;
//     <= 0.10 for SMILES and IUPAC names (digits/parentheses/hyphens become negative evidence; capitals are decisive for SMILES).
//   PASS RULE v2 for R0 = the registered R0 rule AND (when the sibling DEV corpora are present with n >= 100 items per family) the MAXIMUM cross-family
//     false-positive rate <= ALPHA (0.05). If the sibling corpora are absent the cross-family arm is a typed gap and does not block.
//   v2 REFINEMENT (still BEFORE the first v2 run; written after inspecting the rebuilt v2 prior's LLR TABLE, not any result): the class chart_unattested is
//     degenerate when estimated (TRAIN IPA count is 0 BY CONSTRUCTION, so its raw LLR is -9: it would be anti-evidence for every rare legitimate chart symbol), and
//     the pooled other_punct LLR (+2.0) is driven by 4,143 ASCII '*' of one language and by superscript tone-number signs. Two rules, both from the policy
//     "priors REFUSE or NOMINATE, never admit": (i) chart_unattested has ZERO evidence (LLR := 0: TRAIN cannot estimate what the corpus removed); (ii) only classes
//     the CHART NOMINATES (ascii_letter_chart, chart_latin_letter, ipa_extension_letter, modifier_letter, combining_mark, tone_letter, ipa_punct) may carry positive
//     LLR; every other class is capped at <= 0 (it can REFUSE, never nominate). The raw TRAIN LLRs are kept in the prior (`llrRaw`). Consequence for the
//     prediction: Chinese-variety lines lose the superscript-digit witness (they keep the IPA letters and modifiers); DEV hard-subset BA predicted 0.97-0.99.
//   This changes the system under test AFTER the registered runs; run 1/2 numbers stay on record above, and v2 is judged by the SAME rule plus the new clause.
// RUN 3 (DEV, v2 identify prior, 117 s). r0 PASS under the v2 rule: hard BA 0.9828 (v1 0.9839; prediction 0.97-0.99 held), strongest control c_nonascii 0.6549, 21 wins /
//   0 losses over 24 hard languages, and the v2 clause held: cross-family false positives 0/300 for English prose, Morse, SMILES, InChI and IUPAC names (v1 prior: 22%, 100%,
//   98.7%, 100%, 95%; prediction <= 0.05 / <= 0.10 held). c_ablated and c_ascii are now exactly 0.5 (no IPA evidence survives). r1-r5 identical to run 2 (they do not call
//   classOfChar): r1 PASS (marked-F1 0.99989), r2 PASS (BA 0.9945, novel 0.9835), r3 FAIL (margin 0.0036: the instrument cannot separate chart knowledge from script-only
//   reading at INVENTORY level; ceiling = real = 0.8581), r4 PASS (macro-F1 0.9988 over 4 edge classes; prefix_modifier n=5 underpowered), r5 FAIL (skeleton 0.8074 vs mn_strip
//   0.8200: dropping modifier letters loses contrastive length; exploratory keep-length skeleton 0.8240).
//   CAVEATS THAT TRAVEL WITH THE NUMBERS: (1) R1/R4 score agreement with the segments-library CONVENTION (a reference replica of its algorithm is what the reader is); the human-curated
//   PHOIBLE check (post-hoc) agrees: 769/769 single-base PHOIBLE types are read as one segment, 0/459 multi-base types without a tie bar are (a PHOIBLE convention the library does
//   not share). (2) The split is by language; Wiktionary editor conventions span all splits. (3) The cross-family clause was designed after looking at sibling DEV strings; sibling TEST
//   is the real arbiter. (4) TEST was not run.

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// AMENDMENT A3 (REGISTERED 2026-10-06, AFTER run 3 AND BEFORE ITS FIRST RUN; this block is the pre-registration of the A3 controls and claims)
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY. Three independent reviews (scratch runs on DEV, known to the author before this registration) found that the strongest registered controls were straw
// men: R0's strongest control was 'any non-ASCII' (0.655) while a one-line Unicode BLOCK rule scores 0.988-0.990 on the DEV hard subset (real reader 0.983);
// R1/R4's gold (the cldf segments convention) is itself a Unicode-category rule, and a 15-line segmenter with no chart and no priors scores marked-F1 0.99996
// (real 0.99995) while the registered 'ablated' arm emptied chart.codepoints, which also deletes the UCD general-category column (it removed UNICODE
// knowledge, not CHART knowledge, and collapsed onto 'grapheme', 0.315). Consequences stated honestly: the primary R0, R1 and R4 passes of runs 1-3 are
// NOT evidence of IPA competence; they are agreement with a block lookup (R0) and replica fidelity to a Unicode-category convention (R1, R4).
//
// WHAT CHANGES (instrument only; the adapter, the priors, every pass-rule constant and every threshold below are UNCHANGED):
//  (1) PASS RULES unchanged. The margin and the sign test are now taken against the STRONGEST of ALL controls, natural baselines included. A natural baseline
//      may legitimately tie the reader; only the BUILT-TO-FAIL controls (the set the licence check is applied to) must lose by >= 0.05.
//  (2) R0 gains natural baselines (never built to fail): c_block_ext = 'any code point in U+0250-02FF' (IPA Extensions + Spacing Modifier Letters);
//      c_block_all = 'any code point in U+0250-036F or U+1D00-1DBF' (adds Combining Diacritical Marks, Phonetic Extensions + Supplement; includes the tone letters
//      U+02E5-02E9); c_extcount = 'at least k code points in U+0250-02FF or U+1D00-1DBF' with k in 1..8 FIT ON TRAIN (maximise TRAIN hard-subset balanced
//      accuracy, ties to the smaller k; absent TRAIN corpus = typed gap, never a guess). c_nonascii stays (it is just no longer the strongest).
//  (3) R0 harder items, reported as registered DIAGNOSTIC STRATA (not in the pass rule: the pass rule is already decided by the primary margin):
//      S1 block_trap negatives (hard-subset orthography chunks holding >= 1 c_block_all code point, e.g. Hausa b/d with hook), S2 block_free positives (hard-subset
//      IPA chunks with no c_block_ext code point), S3 ascii_heavy positives (ASCII share of non-space code points >= ASCII_HEAVY = 0.9, declared), S4 trap_union
//      (S1 + S2 together: items on which a block rule is wrong by construction), S5 nfd_stress (the whole hard subset, both sides NFD-normalised: Vietnamese/Yoruba/
//      Czech diacritics become U+0300-036F; balanced accuracy of real vs the block rules, c_nonascii and a seeded deranged control).
//  (4) R1 and R4 gain: ucd_category (a chart-free, prior-free segmenter written in the instrument from Unicode general categories only: Lm and M* bind to the previous
//      cluster, at word start they bind FORWARD, a double diacritic (canonical combining class 233/234: U+035C-0362, U+1DCD, U+1DFC) joins the next code point, a run
//      of Sk code points groups; it is the reviewers' 15-line baseline, made total: a stray modifier with no host is its own token); ablated_chart (chart role,
//      class, description and sequences REMOVED, the UCD general category and script KEPT: this removes only chart knowledge); ablated_binding (TRAIN binding table
//      emptied); ablated_chart_binding (both). The old 'ablated' arm is RENAMED ablated_unicode (what it always was: chart + gc + block table emptied) in R1, R3, R4
//      and R5, and ablated_chart is added beside it in R3 and R5. BUILT-TO-FAIL (licence-checked): codepoint, ablated_unicode, deranged. NATURAL BASELINES (not
//      licence-checked): grapheme, ucd_category, ablated_chart, ablated_binding, ablated_chart_binding.
//  (5) RELABELLING. R1 and R4 results carry details.replication = {claim:'convention_replication', ...}: agreement with the segments-library convention (G1) is replica
//      fidelity, not chart competence. Its OWN rule (restated claim, never the competence claim): score >= floor (R1 0.95 marked-F1; R4 0.90 macro-F1) AND causal. The
//      competence `pass` of R1/R4 keeps the registered rule and is judged against ucd_category.
//  (6) INDEPENDENT AUTHORITY reported beside the headline: details.independentAuthority = {panphon: marked-F1 of the reader and of every control against the panphon
//      0.22.2 segmentation on the span-alignable DEV lines (and the gold's own agreement), phoibleSingleSegment: the share of single-base PHOIBLE types each arm reads
//      as ONE token}. These are agreement with a human-curated / independent segmentation, not scored pass rules.
//
// PREDICTIONS A3 (honest; the three primaries are NOT blind because the reviews' scratch numbers are known; everything else is blind):
//   R0 primary: FAIL. real hard BA 0.983; strongest control c_block_all ~0.990 (c_extcount k=1 ~0.988); margin ~ -0.007 << 0.05; sign test p > 0.05 (wins <= losses).
//     S1: real false-positive rate on block_trap negatives 0.1-0.6 (c_block is 1.0 by construction). S2: real recall on block_free positives 0.3-0.9 (c_block 0.0 by
//     construction). S3: real recall >= 0.9. S5 NFD: real hard BA falls >= 0.05 below its NFC value (the combining-mark class is a positive witness TRAIN estimated on
//     NFC text where only IPA carries combining marks); c_block_all falls >= 0.10; c_deranged ~0.5.
//   R1 primary: FAIL on the margin (real 0.9999 vs ucd_category ~0.9999, |margin| < 0.001 << 0.10; sign test: ~0 wins, 0-2 losses, mostly ties). ablated_chart 0.97-0.995
//     (it loses tie-bar joins and tone-letter groups, i.e. the chart's role column); ablated_binding within 1e-4 of real (the TRAIN binding prior adds nothing here);
//     ablated_unicode and grapheme as before (0.315). details.replication.pass TRUE (0.9999 >= 0.95 and causal). independentAuthority panphon: reader, ucd_category and
//     gold all ~0.935 (within 0.002 of each other).
//   R4 primary: FAIL on the margin (macro-F1 real 0.9988 vs ucd_category ~0.9999: the margin is NEGATIVE or ~0). replication.pass TRUE.
//   R3, R5: verdicts unchanged (FAIL, FAIL); ablated_chart within 0.01 of the real arm in both (the gc column carries what these rungs use).
//   R2: unchanged and not re-argued here (its primary gold is PHOIBLE, an independent authority; its ablation removes the chart class column, which Unicode cannot supply).
// WHAT WOULD CHANGE MY MIND (declared): R0 would stop failing only if real - max(control) >= 0.05 with sign p <= 0.05; R1/R4 competence only if real beats ucd_category by the registered margin.
// NOT DONE and not claimed: no change to the reader (II.5: not tuning the adapter on DEV after seeing these results); TEST not run.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// RUN 4 (DEV, AMENDMENT A3 controls, 2026-10-06, 29 s; results: /private/tmp/claude-501/notation/ipa/results/dev-run4-A3.json). Adapter, priors and every pass-rule constant UNCHANGED.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
//   R0  FAIL (as predicted). real hard BA 0.9828 vs strongest control c_block_all 0.9896 (c_block_ext 0.9882; c_extcount k=2 fit on TRAIN [TRAIN hard BA 0.9659] 0.9818;
//       c_nonascii 0.6549 is no longer the strongest); margin -0.0068 << 0.05; sign test vs c_block_all 1 win / 7 losses / 16 ties, p 0.996. Licensed (c_deranged 0.4925,
//       c_ascii 0.5, c_ablated 0.5). Cross-family false positives 0/300 for all five sibling families (v2 clause holds), causal stability 1.0 (peeking mock 0). READING: R0 as
//       registered measures BLOCK MEMBERSHIP; the LLR machinery adds nothing over a Unicode-block rule on WikiPron, whose IPA is almost always marked (only 4 of 1,398 hard
//       positives are ASCII-only; 48 lack an IPA-Extensions letter, 42 of those still called IPA).
//       Strata (diagnostic): S1 block_trap negatives n=24 (klj 16, phl 7, wln 1: Hausa and Yoruba, the trap languages the review named, are TRAIN languages, not DEV: typed gap;
//       Vietnamese is DEV but its NFC orthography is no block trap, see S5): real calls 0.833 of them IPA (c_block_ext 0.792, c_block_all 1.0, c_extcount 0.542). S2 block_free
//       positives n=14: real recall 0.643 (c_block_ext 0). S3 ascii_heavy positives n=48: real recall 0.917 (= every block rule). S4 trap union (14 + 24): BA real 0.405,
//       c_nonascii 0.357, c_block_all 0.321, c_block_ext 0.104: ON ITEMS WHERE A BLOCK RULE IS WRONG BY CONSTRUCTION THE READER IS ALSO BELOW CHANCE (n is small; two of the three
//       trap languages are one-language-dominated). S5 NFD stress (hard subset, both sides NFD): real BA 0.7085 (drop 0.274 vs NFC; TNR 0.42), c_block_all 0.667 (drop 0.322),
//       c_nonascii 0.655, but c_block_ext 0.988 and c_extcount 0.982 do not move (NFD diacritics U+0300-036F are outside U+0250-02FF): THE READER IS NOT NFD-ROBUST and loses to a
//       one-line rule by 0.28 there (c_deranged 0.493: the statistic moves). Cause (from the prior): the combining_mark class carries a positive LLR estimated on NFC text where
//       only IPA has combining marks; canonically equivalent strings get different verdicts. NOT FIXED here (II.5; see proposals at the end of this block).
//   R1  FAIL on the margin (as predicted). real marked-F1 0.999894 (macro over 38 languages; pooled 0.999947) vs strongest control ucd_category 0.999905: margin -0.000011, 0 wins / 1 loss /
//       37 ties. ablated_binding 0.999894 = real (the TRAIN binding prior adds nothing, as predicted). details.replication.pass TRUE (0.9999 >= 0.95, causal 1.0, peeking mock 0.874):
//       the reader is a REPLICA of the segments-library convention, which a gc-only segmenter replicates too. WRONG PREDICTION: ablated_chart (chart role removed, gc kept) scored
//       0.689 macro / 0.786 pooled, not 0.97-0.995: the chart's role column carries the TIE BAR (class recall 0.0004 without it, 13,765 gold tokens) and the TONE-LETTER GROUP
//       (0.0 without it, 15,167), which gc alone cannot give; the ucd_category control had to be GIVEN them as Unicode properties (combining class 233/234; the Sk run), so what the
//       chart contributes here is knowledge Unicode itself also carries. ablated_unicode and grapheme 0.315 as before (identical: confirmed the old 'ablated' was a Unicode ablation).
//       INDEPENDENT AUTHORITY: against panphon on the 74,271 span-alignable lines marked-F1 is 0.935262 for the reader, for ucd_category and for the gold alike (the reader is the gold's
//       replica); ablated_chart 0.860, grapheme 0.504. PHOIBLE single-base types read as ONE token: real 769/769, ucd_category and ablated_chart 757/769 (0.984), grapheme 0.476,
//       codepoint 0.155; multi-base types without a tie bar 0/459 for every arm. The ONE place the chart separates from gc + combining class + Sk runs: the rhotic hook U+02DE
//       (gc Sk, a diacritic in the chart): 12 PHOIBLE types (a-hook, i-hook, ...) that only the chart reads as one segment.
//   R2  unchanged: PASS (BA 0.9945 vs ascii_rule 0.8396; the registered rule against its registered controls; its ablation removes the chart class column, which Unicode cannot supply).
//   R3  FAIL, unchanged (score 0.8581 = ceiling; margin 0.0036; ablated_unicode and ablated_chart 0.8546 are identical: the base-letter matcher uses nothing the gc column does not carry).
//   R4  FAIL on the margin (as predicted). macro-F1 0.998751 vs ucd_category 0.999877: margin -0.0011 (NEGATIVE), 0 wins / 3 losses / 35 ties. replication.pass TRUE. DIAGNOSTIC (not tuned): the
//       reader's edge list is emitted per BEING, so (i) 118 gold modifier-letter edges (116 U+02B7, 2 U+02B0) of tokens like U+207D+U+02B7 ('l⁽ʷ⁾' in vie, 'q⁽ʰ⁾' in klj) are missed because read()
//       emits no relation for a modifier bound to a punctuation-kind token, and (ii) in scn ('t͡ːs') 12 gold tie/length edges are missed and 10 spurious ones emitted: a tie bar followed by a length
//       mark keeps the tie pending and swallows the next base, where the convention closes the token at the length mark. The chart-free segmenter has neither defect.
//   R5  FAIL, unchanged (0.8074 vs mn_strip 0.8200; ablated_chart 0.8074).
//   PREDICTIONS THAT WERE WRONG (findings, not bugs): R1 ablated_chart (0.97-0.995 predicted, 0.689 got); R0 S1 real false-positive rate on block-trap negatives (0.1-0.6 predicted, 0.833 got;
//   n=24 from 3 languages); c_extcount fitted k=1 predicted, k=2 got (0.9818). PREDICTIONS THAT HELD: R0/R1/R4 fail on the margin; sign tests; S2 0.3-0.9 (0.643); S3 >= 0.9 (0.917); S5 real drop >= 0.05
//   (0.274), c_block_all drop >= 0.10 (0.322), c_deranged ~0.5; ablated_binding = real; replication pass; panphon within 0.002 (identical); R3/R5 ablated_chart within 0.01.
//   WHAT THIS CHANGES IN THE CARD: R0 = 'identify' is block membership (FAIL vs the strongest natural baseline); R1 and R4 = convention replication (competence margin ~0); R2 stands; R3/R5 fail.
//   FIX PROPOSALS (adapter, NOT applied: they react to results seen here, so a change would be tuning on DEV; they should be registered in a new amendment and judged on a fresh split / TEST by
//   the owner): (a) identify(): make the class of a combining mark depend on whether (previous base + mark) composes canonically (NFC-equivalent strings get one verdict; causal: decided at the mark,
//   no lookahead); (b) read(): emit `binds` relations for modifiers carried by non-being tokens (punctuation-kind), so R4 edges equal R1 spans; (c) earTokens(): a length mark after a tie bar must not
//   keep tiePending (scn 't͡ːs'). TEST was not run.
