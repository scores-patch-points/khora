// eval/notation-competence/music_abc.mjs — THE MUSIC NOTATION CARD (ABC, MusicXML, LilyPond) for the polyglot ladder R0..R5.
// SYSTEM UNDER TEST: adapters/notation/music_abc.js (never the gold). Zero model: nothing here or there calls an LLM.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first scored run of the instrument and BEFORE the adapter was smoke-tested against any gold. Nothing in
// this block is tuned after a result. A prediction that fails is reported as failed. The sha256 of this leading comment block is
// stamped into every result (details.prereg_sha256) so a post-hoc edit is visible. Later clarifications go in an ADDENDUM block
// below the code (never here) and are listed in result.notes.
//
// CLAIM
//   The music adapter reads, from the text alone and causally (a prefix is all it ever has), (R0) which notation it is looking at,
//   (R1) the lexemes the notation's grammar defines, (R2) their class, in particular which lexemes can name a being (a note, a
//   rest, a chord) and which cannot (a title, a lyric, a chord symbol), (R3) the BEINGS the text declares: the sounding notes and
//   the rests, each located at the slot where the text puts it (line, measure, onset), (R4) the CLAIMS the text makes about
//   them (pitch, duration, tie, and the meter and key in force at each measure), and (R5) that two renderings of the same piece
//   agree. It does so better than controls built to fail.  LOVELACE'S LAW applies: what is read is what the text ORDERS (note
//   letters, accidentals, key signature, lengths, bars), never a guess of intent.
//
// THE SYSTEMS AND THE CHANNEL
//   ABC 2.1 (text), MusicXML 4.x (structured text: an XML document, so its tokens are elements, not characters), LilyPond (text).
//   Channel: text / structured-text. Not channel-bound: no audio, no image of a score.
//   MusicXML  NATURAL data: OpenScore Lieder (CC0), OpenScore StringQuartets (CC0), Leone Allemandes (CC-BY-4.0), Ciciban (CC-BY-4.0),
//             scorewriter-comparison (CC-BY-4.0; the same test scores authored in Dorico, Finale, MuseScore, Sibelius).
//   ABC       DERIVED data ONLY. No permissively licensed natural ABC corpus could be verified (The Session: ODbL plus a
//             prohibition of LLM use; Nottingham: no permissive licence; music21's bundled ABC: per-piece, non-commercial or
//             unstated; a Zenodo "10k ABC" set is a scrape of third-party hymnals relabelled CC-BY). The ABC arm is therefore a
//             DETERMINISTIC CONVERSION (agent-authored script, label "derived") of the natural MusicXML above. It is NOT natural
//             ABC and NEVER presented as held-out natural data. The converter is not an authority: a derived piece is ADMITTED only
//             if an independent ABC engine (abcjs 6.7.1, MIT; its MIDI export) reproduces the music21-derived gold note for note,
//             line by line. Pieces it cannot certify are excluded and counted. Natural ABC idioms (repeats, ornaments, user-defined
//             symbols, multi-tune files, folk-tune conventions) are UNMEASURED and reported as typed gaps.
//   LilyPond  NATURAL data: Mutopia Project sources (per-piece licence from the piece's .rdf, only PD / CC-BY / CC-BY-SA / CC0
//             kept). R0, R1, R2 only (lexer-level). R3, R4, R5 are UNMEASURED (typed): no LilyPond event reader is built, and the
//             engine (lilypond) is not installed.
//
// GOLD AUTHORITIES (independent of the system under test, and of each other)
//   events (MusicXML)   music21 10.5.0 (BSD-3) parsing the MusicXML: parts (staves split as PartStaff), measures in file order,
//                       notes/rests/chord members with exact Fraction onset and quarterLength, midi, tie. Excluded and counted: grace
//                       notes, chord symbols (harmony), unpitched notes. A file music21 cannot import is a typed gap, never a zero.
//   spans (MusicXML)    Python's expat: element spans of <note>, <measure>, <part>; class of a note from its children per the
//                       MusicXML content model (pitched / pitched_chord / rest / grace / cue / unpitched).
//   events (derived ABC) the SAME music21 event table of the source MusicXML (the ABC was made from it) AFTER the admission test
//                       above. Admission compares abcjs's MIDI export (note-ons and note-offs per line, ties merged, +-1/480 tick)
//                       with the gold.
//   lexemes (ABC)       abcjs element spans, trimmed to the core by the ABC 2.1 grammar; cross-checked by music21's ABC tokenizer:
//                       where both define a class (note, chord, rest, bar) and disagree, the lexeme is DISPUTED, excluded and
//                       counted. Info-field and lyric lines come from the standard's line rule.
//   lexemes (LilyPond)  python-ly 0.9.10 lexer (Frescobaldi's), token spans and classes.
//   identity (R0)       the collection a file came from (its declared format), never its content.
//
// SPLITS (by SOURCE; never by file within a source; priors are built from TRAIN only)
//   TRAIN  openscore_lieder (300 of 1462, sha256-ordered, <=120 KB)     | negatives: 3 of 9 hashed repos of ethos/09-source-code,
//          openscore_lieder_mscx near-miss negatives                     | Mutopia maintainers hashed to train
//   DEV    zenodo_leone_allemandes (24), zenodo_ciciban (123)           | negatives: hashed DEV repos, MEI sample encodings
//   TEST   openscore_quartets (36), scorewriter_comparison (100)        | negatives: hashed TEST repos, openscore_quartets_mscx
//          TEST IS RUN ONCE, BY THE CARD, AFTER THIS FILE IS FROZEN. This session ran DEV only.
//   Mutopia (LilyPond) is split by its maintainer, ethos negatives by repository: split = sha256(key) mod 3 -> train/dev/test
//   (Mutopia: train 25, dev 75, test 60 pieces; ethos negatives: train 33, dev 21, test 53 files; near-miss negatives 12 per split).
//   Derived ABC inherits the split of its source piece and exists only if admitted: converted 297 + 36 + 143 + 83; ADMITTED
//   TRAIN 107, DEV 143 (Ciciban 120, Leone 23), TEST 89 (quartets 6, scorewriter 83). Pieces the independent engine could not
//   certify (irregular tuplets, same-pitch overlap across voices, ...) are excluded: the derived arm is biased toward the simpler
//   pieces and says so.
//   The sources of one split never appear in another. Known weakness, stated: every natural MusicXML source is a MuseScore
//   export except scorewriter-comparison (TEST), so exporter robustness is first measured on TEST, not on DEV.
//
// WHAT THE PRIORS ARE (priors/notation-music_abc-*.json; REFUSE or NOMINATE, never admit)
//   standard : tables from named standards, no TRAIN counts. ABC 2.1 (pitch letters, accidentals, key/mode table, default unit
//              note length, tuplet defaults, bar symbols, info fields, rests), W3C MusicXML 4.1 XSD (element vocabulary, content
//              model, step and note-type enumerations), the LilyPond Notation Reference (note names, commands), plus the
//              signature features R0 weighs. ABC 2.1 gives accidental propagation as "pitch" (all octaves) by default; abcjs
//              applies it per octave; the reader follows the standard and counts every note where the two differ
//              (gap accidental_propagation_ambiguous); the derived corpus is written so the two never differ.
//   lexicon  : counts from TRAIN: signature-feature weights (log-odds from TRAIN positives vs TRAIN negatives, Laplace) and the
//              per-system acceptance thresholds tau_s = (max score of any TRAIN negative) + 1 nat. Every threshold is derived.
//
// CAUSALITY (S3). The reader is one forward pass. read(prefix) must be a subset of read(full) on every unit the prefix completes
//   (R3 licence check, below). Whole-text statistics judging earlier units would be lookahead; none is used.
//
// RUNGS: METRICS, MATCHERS, CONTROLS, PASS RULES
//   Result shape of every rung: { id, rung, split, n, applicable, score, control, margin, pass, controls{}, gaps[], notes[], details{} }.
//   A control is LICENSED only if it moves the statistic: real minus control > 0 with an exact one-sided sign test over the
//   per-unit scores, p < 0.05 (units: documents for R0/R1/R2, pieces for R3/R4/R5). An unlicensed control is reported, flagged
//   details.licence, never used as `control`, and never gates the pass. `control` = the strongest LICENSED control; margin =
//   score - control. pass===null when nothing is measurable or no control is licensed.
//
//   R0 IDENTIFY. Input: the first 4096 bytes of a document (fed in 64-byte chunks; the verdict after each chunk is the verdict
//     of the prefix so far). Gold: abc | musicxml | lilypond | other. `other` = the non-music negatives: code, prose, markup,
//     JSON and SVG/HTML from ethos/09-source-code, plus two NEAR-MISS music dialects that are XML but not MusicXML: MEI (DEV) and
//     MuseScore .mscx (TRAIN, TEST; truncated to their first 16 KB). A verdict of null is a typed gap and counts as `other`.
//     SCORE = balanced accuracy at 4096 bytes: mean over the gold classes present of the share identified correctly.
//     Cost: d = first chunk after which the verdict equals the final verdict and never changes; reported (median bytes).
//     Controls: (a) shuffled_text: characters permuted within each document (seeded), mechanism: identification rides on
//       notation structure; (b) deranged_signatures: the signature table's system labels permuted (abc->musicxml->lilypond->abc);
//       (c) no_train_weights: the standard's signature features with unit weight and threshold 3 hits (an ABLATION of the TRAIN
//       prior, reported as a VARIANT: if it ties the real arm the TRAIN prior bought nothing, and that is a finding).
//     PASS iff balanced accuracy >= 0.95, share of `other` documents given a music verdict <= 0.05, every system with >= 10
//       documents recalled >= 0.90, and for every licensed control (a),(b): margin >= 0.30.
//
//   R1 HEAR. Gold lexemes per format. musicxml: spans of <note> (all subclasses collapsed), <measure>, <part>. abc: core spans of
//     note, chord, rest, spacer (x), bar, plus the whole line of an info field (field) and of a lyric (lyric). Disputed ABC
//     lexemes are excluded. lilypond: python-ly token spans of pitch (Note), rest (Rest, Spacer, Skip), duration (Length),
//     octave (Octave), command (any token whose text begins with a backslash), string (a quoted string, start..end merged),
//     comment (line comment, block comment merged), bracket ({ } << >> < > [ ] ( ) and the markup braces), bar (|), word (lyric
//     and markup words); every other lexer class is not scored. SCORE = micro F1 over exact (class, start, end) triples,
//     macro-averaged over the formats present (musicxml, abc, lilypond).
//     Controls: (a) whitespace_ear: a notation-blind reader, one token per whitespace-delimited run; (b) shifted_spans: the
//       real spans moved by a fixed per-document offset (seeded) so counts are kept and alignment destroyed; (c) deranged_prior:
//       the prior's lexeme roles permuted (musicxml: the element named as note becomes another element; abc: the set of pitch
//       letters replaced by another seven letters).
//     PASS iff each format with >= 10 documents reaches F1 >= 0.90 and margin >= 0.30 over every licensed control, AND the causal
//       check below is clean.
//
//   R2 CLASSIFY. For each gold lexeme (undisputed) the SUT token starting at the same offset names its class; none = `unheard` (a
//     miss). Gold classes: musicxml {pitched, pitched_chord, rest, grace, cue, unpitched, measure, part}; abc {note, chord, rest,
//     spacer, bar, field, lyric}; lilypond the classes of R1 (class agreement with the lexer only: no names_being, macro-F1 only). NEGATIVES (can-not-name-a-being): every whitespace word inside a gold field or lyric line; its
//     class is the class of the SUT token that CONTAINS it. Derived binary: names_being is true for note, chord, rest, pitched,
//     pitched_chord and cue; false for grace, unpitched, spacer, bar, measure, part, field, lyric and every negative.
//     SCORE = the mean of (a) the macro-F1 over the gold classes present (equal weight per class, then per format) and (b) the F1
//     of names_being (positive class = true).
//     Controls: (a) deranged_classes: the SUT's class labels permuted among its tokens (seeded derangement); (b) letter_rule: a
//       notation-blind rule that calls any token starting with A-G or a-g a note; (c) majority_class.
//     PASS iff score >= 0.90, names_being F1 >= 0.95, margin >= 0.30 over licensed controls.
//
//   R3 BEINGS. A BEING is a note (each chord member is one) or a rest, located at SLOT = (line, measure index, onset in
//     quarters as an exact fraction, kind). Lines = parts then staves in file order (ABC: voices in declaration order). Measures
//     are counted in text order (a pickup is measure 0). The SUT is credited for a being iff the gold has a being at the same
//     slot: per slot, matched = min(SUT count, gold count). Pitch and duration do NOT enter the slot, so a being can be found
//     with the wrong pitch (that is an R4 failure, not an R3 one); a wrong duration moves every later onset in its measure.
//     SCORE = micro F1 over all slots of the pieces. Pieces whose line counts differ are scored on the common lines and the
//     difference is counted as FP/FN and listed as a gap.
//     Controls: (a) deranged_pairing: piece i read, scored against the gold of piece (i+1) in the derangement; (b)
//       ablate_duration: the reader with every duration forced to the unit; (c) blind_tokens: one `note` per whitespace/tag-free
//       token at consecutive onsets (a notation-blind reader).
//     CAUSAL LICENCE CHECK: for 20 pieces and 4 cut points each (20/40/60/80 % of the text, moved back to the last token boundary),
//       every being read from the prefix must appear, identically (slot, midi, duration), in the full read. Violations = 0 required.
//     PASS iff F1 >= 0.90 on musicxml and on derived abc (each with >= 10 pieces), margin >= 0.30 over licensed controls, and
//       zero causal violations.
//
//   R4 CLAIMS. Claims per being: pitch (midi), dur (exact quarters), tie (a tie starts here); per measure: meter (n/d or
//     `composite`), key (fifths). A claim = (slot, label, value); multiset intersection over matched slots; claims of unmatched
//     beings are misses. SCORE = micro F1 over all claims. Per-label F1 reported.
//     Controls: (a) deranged_pitch: the prior's pitch-class table permuted among the seven steps; (b) ablate_key_accidentals:
//       the reader that ignores key signature and accidentals; (c) deranged_claims: the SUT's claim values shuffled among its
//       beings within a piece (seeded).
//     PASS iff F1 >= 0.90, pitch-label F1 >= 0.90, margin >= 0.30 over licensed controls.
//
//   R5 AGREEMENT ACROSS REPRESENTATIONS. Pairs (derived ABC, natural MusicXML) of the same piece, both read by the SUT with no
//     access to the gold. agreement = F1 between the two claim multisets (pitch and dur claims at slots). On TEST also the
//     CROSS-EXPORTER pairs of scorewriter-comparison (same test content from different programs): reported with the gold's own
//     cross-exporter agreement as the ceiling. Controls: (a) deranged_pairs: ABC of piece i with MusicXML of piece j; (b)
//       pitch_deranged_one_side: the ABC side read with the deranged pitch table.
//     PASS iff derived-pair agreement >= 0.85 and margin >= 0.50 over licensed controls.
//
//   UNMEASURED BY CONSTRUCTION (typed): natural ABC; ABC repeats, ornaments, grace notes, user symbols, multi-tune files;
//     LilyPond R3-R5; MusicXML exporters other than MuseScore on DEV; microtones; transposing-instrument sounding pitch;
//     tablature, chant, Braille music, Nashville numbers, any other notation of music.
//
// PREDICTIONS (written now; the card reports which failed)
//   P-R0  pass on DEV: balanced accuracy >= 0.97; no_train_weights ties within 0.03 (the standard's features carry the verdict,
//         the TRAIN prior buys little); shuffled_text collapses to <= 0.40; the MEI near-misses are refused, not called MusicXML.
//   P-R1  musicxml F1 >= 0.99; abc F1 in [0.93, 0.99] (risk: tuplet prefixes and overlay tokens); whitespace_ear <= 0.15.
//   P-R2  pass; the weakest classes are `cue` and `grace` (absent in DEV, so unmeasured there) and abc `spacer` vs `rest`.
//   P-R3  musicxml F1 >= 0.97 on DEV (all MuseScore); derived abc >= 0.95; deranged_pairing <= 0.10; ablate_duration <= 0.60.
//         On TEST, scorewriter (Dorico/Finale/Sibelius) is predicted LOWER than OpenScore: overall F1 in [0.80, 0.97].
//   P-R4  F1 >= 0.95 on DEV; pitch F1 is the label most exposed to accidental and key handling; ablate_key_accidentals <= 0.70.
//   P-R5  derived-pair agreement >= 0.93; deranged_pairs <= 0.10.
//   P-ALL the causal check finds 0 violations.
//
// DEVIATIONS FROM THE ASSIGNMENT TEXT, said up front
//   1. ABC is derived, not natural (above). 2. R1/R2 on LilyPond are lexer-agreement with python-ly, not a semantic reading.
//   3. TEST is not run by the author of this file.


import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { ear, read, identify, createIdentifier, loadPriors, preparePriors, SYSTEMS, Q } from "../../adapters/notation/music_abc.js";
import { CORPUS_DIR, loadManifest, loadText, verifyEntry, loadGoldEvents, loadGoldLex, loadGoldAbcLex, loadGoldLy, loadStructure } from "./music_abc-io.mjs";

export const FAMILY = "music_abc";
const SELF = fileURLToPath(import.meta.url);
export const PRIOR_DIR_USED = path.resolve(path.dirname(SELF), "../../priors");
export const RESULTS_DIR = path.join(CORPUS_DIR, "results");

/** sha256 of this file's leading comment block: the stamp that makes a post-hoc edit of the pre-registration visible. */
export function headerDigest(file = SELF) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  return createHash("sha256").update(lines.join("\n").trim()).digest("hex");
}
export const PREREG_SHA256 = headerDigest();

/** sha256 of a delimited addendum block (the lines from the one that starts with `open` to the one that starts with `close`): the stamp that makes a post-hoc edit of a revised rule visible. */
export function blockDigest(open, close, file = SELF) {
  const lines = fs.readFileSync(file, "utf8").split("\n"); const a = lines.findIndex((l) => l.startsWith(open)); const b = lines.findIndex((l) => l.startsWith(close));
  if (a < 0 || b < a) return null;
  return createHash("sha256").update(lines.slice(a, b + 1).join("\n")).digest("hex");
}
export const rulesV2Digest = (file = SELF) => blockDigest("// ═══ RULES-V2 (", "// ═══ END RULES-V2 ═══", file);
export const rulesV21Digest = (file = SELF) => blockDigest("// ═══ RULES-V2.1 (", "// ═══ END RULES-V2.1 ═══", file);
export const rulesV22Digest = (file = SELF) => blockDigest("// ═══ RULES-V2.2 (", "// ═══ END RULES-V2.2 ═══", file);
export const RULES_V2_SHA256 = rulesV2Digest();
export const RULES_V21_SHA256 = rulesV21Digest();
export const RULES_V22_SHA256 = rulesV22Digest();
export const RULE_VERSION = "v2.2 (addenda A10-A22; the header's rules are still computed and reported as pass_header_rule where they differ)";

// ── declared constants (every one is in the pre-registration header) ──────────────────────────────────────────────────────────────
const PREFIX = 4096, CHUNK = 64, SEED = 20261006, ALPHA = 0.05, MIN_UNITS = 10;
const CUTS = [0.2, 0.4, 0.6, 0.8], CAUSAL_PIECES = 20;
const BEING_CLASSES = new Set(["note", "chord", "rest", "pitched", "pitched_chord", "cue"]);

// ── small numerics ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash32 = (s) => parseInt(createHash("sha256").update(String(s)).digest("hex").slice(0, 8), 16);
function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function derangement(n, rng) { if (n < 2) return null; const p = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * i); [p[i], p[j]] = [p[j], p[i]]; } return p; }
const _lf = [0];
const logFact = (n) => { while (_lf.length <= n) _lf.push(_lf[_lf.length - 1] + Math.log(_lf.length)); return _lf[n]; };
/** exact one-sided sign test p = P(X >= wins | n = wins+losses, 1/2) */
export function signTest(wins, losses) {
  const n = wins + losses; if (n === 0) return { wins, losses, n, p: 1 };
  let s = -Infinity;
  for (let i = wins; i <= n; i++) { const lt = logFact(n) - logFact(i) - logFact(n - i) - n * Math.LN2; s = s === -Infinity ? lt : Math.max(s, lt) + Math.log1p(Math.exp(-Math.abs(s - lt))); }
  return { wins, losses, n, p: Math.min(1, Math.exp(s)) };
}
export const f1 = (tp, fp, fn) => (tp + fn === 0 && tp + fp === 0 ? null : (2 * tp) / (2 * tp + fp + fn));
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (x, k = 4) => (x == null ? null : Number(x.toFixed(k)));

/** multiset intersection size of two Maps key->count, and the sizes */
export function msetStats(a, b) { let tp = 0, na = 0, nb = 0; for (const [k, c] of a) { na += c; const d = b.get(k); if (d) tp += Math.min(c, d); } for (const c of b.values()) nb += c; return { tp, na, nb }; }
const inc = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);

// ── result shape ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function shape(id, rung, split, o = {}) {
  return { id, rung, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: { prereg_sha256: PREREG_SHA256 }, ...o };
}
const unmeasured = (id, rung, split, reason, extra = {}) => shape(id, rung, split, { applicable: true, pass: null, gaps: [{ reason: `unmeasured: ${reason}`, count: 1 }], ...extra });
const notApplicable = (id, rung, split, reason) => shape(id, rung, split, { applicable: false, pass: null, notes: [reason], gaps: [{ reason: `not_applicable: ${reason}`, count: 1 }] });

/** Wilson score interval upper bound (default 95%, two-sided z) of k successes in n trials; null when n = 0. */
export function wilsonUpper(k, n, z = 1.959964) {
  if (!n) return null;
  const p = k / n, z2 = z * z;
  return Math.min(1, (p + z2 / (2 * n) + z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n));
}

/**
 * Decide `control`, `margin`, licences from per-unit arrays. controls: {name: {score, perUnit:[...]}} ; real: {score, perUnit}.
 *   status per control: `licensed` (real > control and an exact one-sided sign test over the per-unit scores p < ALPHA), `underpowered` (real > control but the test
 *   does not reject: reported, never gates: the header's rule), `tied_or_beaten` (real <= control) and `unmeasured` (a score is null).
 *   REVIEW FIX (RULES-V2 A10): a control that ties or beats the real arm is the II.23 / II.4 failure (the instrument or the mechanism is broken): it is returned in
 *   `broken`, and the callers must fail the rung (pass=false, details.instrument_broken). Before this fix such a control was silently dropped as "unlicensed".
 */
export function judgeControls(real, controls) {
  const out = { controls: {}, licence: {}, tests: {}, status: {} };
  let best = null; const broken = [], underpowered = [];
  for (const [name, c] of Object.entries(controls)) {
    out.controls[name] = round(c.score);
    let wins = 0, losses = 0;
    const n = Math.min(real.perUnit.length, c.perUnit.length);
    for (let i = 0; i < n; i++) { if (real.perUnit[i] > c.perUnit[i] + 1e-12) wins++; else if (c.perUnit[i] > real.perUnit[i] + 1e-12) losses++; }
    const t = signTest(wins, losses);
    const measurable = real.score != null && c.score != null;
    const tiedOrBeaten = measurable && !(real.score > c.score + 1e-12);
    const licensed = measurable && !tiedOrBeaten && t.p < ALPHA;
    out.licence[name] = licensed; out.tests[name] = { ...t, p: round(t.p, 6) };
    out.status[name] = !measurable ? "unmeasured" : tiedOrBeaten ? "tied_or_beaten" : licensed ? "licensed" : "underpowered";
    if (tiedOrBeaten) broken.push(name); else if (measurable && !licensed) underpowered.push(name);
    if (licensed && (best == null || c.score > best.score)) best = { name, score: c.score };
  }
  return { ...out, best, broken, underpowered };
}

/** Fold a judgeControls result into a rung: a tied or beaten control FAILS the rung and says why; underpowered controls are listed. */
export function applyJudgement(rung, judgements) {
  const broken = [], under = [];
  for (const [where, j] of Object.entries(judgements)) { for (const n of j?.broken ?? []) broken.push(where ? `${where}:${n}` : n); for (const n of j?.underpowered ?? []) under.push(where ? `${where}:${n}` : n); }
  rung.details.instrument_broken = broken;
  rung.details.underpowered_controls = under;
  if (broken.length) { rung.pass = false; rung.notes.push(`INSTRUMENT BROKEN (II.23): control(s) ${broken.join(", ")} tie or beat the real arm; pass forced to false (RULES-V2 A10)`); }
  return rung;
}

// ── corpus access for a split ───────────────────────────────────────────────────────────────────────────────────────────────────
let _man = null;
const manifest = () => (_man ??= loadManifest());
const textCache = new Map();
function textOf(e) { if (!textCache.has(e.id)) textCache.set(e.id, loadText(e)); return textCache.get(e.id); }
const byId = () => { const m = new Map(); for (const e of manifest() ?? []) m.set(e.id, e); return m; };
const takeN = (arr, limit) => (limit == null ? arr : arr.slice(0, limit));
const positives = (split, system) => (manifest() ?? []).filter((e) => e.split === split && e.role === "positive" && e.system === system).sort((a, b) => (a.id < b.id ? -1 : 1));

// ── priors, plain and deranged ───────────────────────────────────────────────────────────────────────────────────────────────────
const PRIORS = () => loadPriors({ dir: PRIOR_DIR_USED });
export function derangedPriors(kind) {
  const base = PRIORS();
  if (!base.standard) return base;
  const std = JSON.parse(JSON.stringify(base.standard));
  const rng = mulberry32(SEED + 7);
  if (kind === "pitch") {
    const steps = Object.keys(std.musicxml.step_pc);
    const p = derangement(steps.length, rng);
    const orig = { ...std.musicxml.step_pc };
    steps.forEach((s, i) => { std.musicxml.step_pc[s] = orig[steps[p[i]]]; });
    const letters = Object.keys(std.abc.pitch_class);
    const p2 = derangement(letters.length, mulberry32(SEED + 8));
    const orig2 = { ...std.abc.pitch_class };
    letters.forEach((s, i) => { std.abc.pitch_class[s] = orig2[letters[p2[i]]]; });
  } else if (kind === "roles") {
    const R = std.musicxml.roles; [R.note, R.measure] = [R.measure, R.note];
    const map = { A: "H", B: "I", C: "J", D: "K", E: "L", F: "M", G: "N" };
    std.abc.pitch_class = Object.fromEntries(Object.entries(std.abc.pitch_class).map(([k, v]) => [map[k], v]));
    std.abc.key.fifths_major = { ...std.abc.key.fifths_major };
    // LilyPond (RULES-V2.1 A18): the first version of this control left the LilyPond prior untouched, so on LilyPond it equalled the real arm (0.971 = 0.971) and was dropped
    // silently as "unlicensed". Built to fail: the seven note names are replaced by seven other letters and the rest names by other words, so no pitch or rest is heard as one.
    std.lilypond.note_names = ["h", "i", "j", "k", "l", "m", "n"];
    std.lilypond.rest_names = ["q", "Q", "t"];
  } else if (kind === "signatures") {
    const perm = { abc: "musicxml", musicxml: "lilypond", lilypond: "abc" };
    std.signatures = std.signatures.map((f) => ({ ...f, system: perm[f.system] }));
    const lex = base.lexicon ? JSON.parse(JSON.stringify(base.lexicon)) : null;
    if (lex) { const th = {}; for (const [s, v] of Object.entries(lex.thresholds)) th[perm[s]] = v; lex.thresholds = th; }
    return preparePriors({ standard: std, lexicon: lex });
  }
  return preparePriors({ standard: std, lexicon: base.lexicon });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// R0
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function r0docs(split, limit) {
  const man = (manifest() ?? []).filter((e) => e.split === split);
  // gold class: music system | other (natural non-music + near-miss dialects) | authored (the AUTHORED stress fixtures: a separate stratum, never in the balanced accuracy)
  const cls = (e) => (e.role === "positive" ? e.system : e.role === "negative_authored" ? "authored" : "other");
  const groups = new Map();
  for (const e of man.sort((a, b) => (a.id < b.id ? -1 : 1))) { const c = cls(e); if (!groups.has(c)) groups.set(c, []); groups.get(c).push(e); }
  const docs = [];
  for (const [c, es] of groups) for (const e of takeN(es, limit)) docs.push({ e, gold: c });
  return docs;
}
function verdictStream(text, priors, mode) {
  const idr = createIdentifier({ priors, mode });
  const out = [];
  for (let i = 0; i < text.length && i < PREFIX; i += CHUNK) out.push(idr.feed(text.slice(i, Math.min(i + CHUNK, PREFIX))).system);
  if (!out.length) out.push(null);
  return out;
}
function r0Score(rows) {
  const classes = [...new Set(rows.map((r) => r.gold))];
  const rec = {};
  for (const c of classes) { const rs = rows.filter((r) => r.gold === c); rec[c] = mean(rs.map((r) => (c === "other" ? (r.verdict === null ? 1 : 0) : r.verdict === c ? 1 : 0))); }
  return { ba: mean(Object.values(rec)), recall: rec };
}
export function measureR0({ split = "dev", limit = null } = {}) {
  const id = "r0";
  if (!manifest()) return unmeasured(id, "R0", split, "no corpus manifest");
  const priors = PRIORS();
  if (!priors.standard) return unmeasured(id, "R0", split, "no standard prior");
  let drifted = 0;
  const allDocs = r0docs(split, limit).map((d) => ({ ...d, text: (textOf(d.e) ?? "") })).filter((d) => d.text.length > 0).filter((d) => { if (verifyEntry(d.e)) return true; drifted++; return false; });
  const authored = allDocs.filter((d) => d.gold === "authored");
  const docs = allDocs.filter((d) => d.gold !== "authored");
  if (!docs.length) return unmeasured(id, "R0", split, "no documents in split");
  const rng = mulberry32(SEED);
  const rows = docs.map((d, i) => {
    const stream = verdictStream(d.text, priors, "train");
    const fin = stream[stream.length - 1];
    let dcost = null;
    if (fin && fin === d.gold) { let k = stream.length - 1; while (k > 0 && stream[k - 1] === fin) k--; dcost = k * CHUNK + CHUNK; }
    const at = (n) => stream[Math.min(stream.length - 1, Math.max(0, Math.ceil(n / CHUNK) - 1))];
    const idr = identify(d.text.slice(0, PREFIX), { priors });
    return { id: d.e.id, gold: d.gold, role: d.e.role, kind: d.e.kind ?? d.e.format, verdict: fin, v256: at(256), v1024: at(1024), dcost, refused: idr.gap ?? null, system: d.e.system };
  });
  const real = r0Score(rows);
  const per = (rs, verdictKey = "verdict") => rs.map((r) => (r.gold === "other" ? (r[verdictKey] === null ? 1 : 0) : r[verdictKey] === r.gold ? 1 : 0));
  // controls
  const shufRows = docs.map((d, i) => {
    const sh = shuffled([...d.text.slice(0, PREFIX)], mulberry32(SEED + 100 + i)).join("");
    return { gold: d.gold, verdict: identify(sh, { priors }).system };
  });
  const derP = derangedPriors("signatures");
  const derRows = docs.map((d) => ({ gold: d.gold, verdict: identify(d.text.slice(0, PREFIX), { priors: derP }).system }));
  const unitRows = docs.map((d) => ({ gold: d.gold, verdict: identify(d.text.slice(0, PREFIX), { priors, mode: "unit" }).system }));
  const sShuf = r0Score(shufRows), sDer = r0Score(derRows), sUnit = r0Score(unitRows);
  const realPer = per(rows);
  const j = judgeControls({ score: real.ba, perUnit: realPer }, {
    shuffled_text: { score: sShuf.ba, perUnit: per(shufRows) },
    deranged_signatures: { score: sDer.ba, perUnit: per(derRows) },
  });
  const otherRows = rows.filter((r) => r.gold === "other");
  const otherMusic = otherRows.length ? otherRows.filter((r) => r.verdict !== null).length / otherRows.length : null;
  // ── false-music rate with a Wilson bound (review fix A11): natural negatives only; near-miss dialects and the AUTHORED stress stratum are reported apart
  const natural = otherRows.filter((r) => r.role === "negative"), nearMissRows = otherRows.filter((r) => r.role === "negative_near_miss");
  const nat = { n: natural.length, music: natural.filter((r) => r.verdict !== null).length };
  nat.rate = nat.n ? nat.music / nat.n : null; nat.wilson95_upper = round(wilsonUpper(nat.music, nat.n), 5);
  const byKind = {};
  for (const r of natural) { const k = (byKind[r.kind] ??= { n: 0, music: 0 }); k.n++; if (r.verdict !== null) k.music++; }
  const nByKindMin = Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, { ...v, wilson95_upper: round(wilsonUpper(v.music, v.n), 4) }]));
  const authRows = authored.map((d) => ({ kind: d.e.kind, verdict: identify(d.text.slice(0, PREFIX), { priors }).system }));
  const auth = { n: authRows.length, music: authRows.filter((r) => r.verdict !== null).length, by_kind: {} };
  for (const r of authRows) { const k = (auth.by_kind[r.kind] ??= { n: 0, music: 0 }); k.n++; if (r.verdict !== null) k.music++; }
  auth.wilson95_upper = round(wilsonUpper(auth.music, auth.n), 4); auth.label = "AUTHORED stress fixtures (model-written look-alikes): not natural data, non-gating, never in the balanced accuracy";
  const nBy = {}; for (const r of rows) nBy[r.gold] = (nBy[r.gold] ?? 0) + 1;
  const sysOk = Object.entries(real.recall).filter(([c]) => c !== "other" && nBy[c] >= MIN_UNITS).every(([, v]) => v >= 0.9);
  const nearMiss = nearMissRows;
  const nearMissRefused = nearMiss.length ? nearMiss.filter((r) => r.verdict === null).length / nearMiss.length : null;
  const gaps = [{ reason: "unmeasured: natural ABC documents (the ABC class is derived from MusicXML)", count: nBy.abc ?? 0 }, { reason: "unmeasured: confusion with the other notation families beyond the three AUTHORED look-alikes (pgn, smiles, fasta): chem_smiles, chess_pgn, genetic corpora are not in the negatives", count: 1 },
    { reason: "unmeasured: natural YAML / INI / key-value text with X: T: K: M: header lines (none found among the installed files searched; only the AUTHORED look-alikes cover it)", count: 1 },
    { reason: `thin natural strata: numeric tables ${byKind.table?.n ?? 0}, tex ${byKind.tex?.n ?? 0}, rst ${byKind.rst?.n ?? 0}, plist ${byKind.plist?.n ?? 0} (each < 60; see details.natural_negatives.by_kind for every Wilson bound)`, count: 1 },
    { reason: "abc_identification_requires_header_and_body_anchor: natural ABC without an X:..K: header (a bare tune fragment) is refused by design, not read", count: 1 }];
  if (drifted) gaps.push({ reason: "negatives whose file on disk no longer matches the manifest hash (dropped)", count: drifted });
  if (!nBy.lilypond || nBy.lilypond < MIN_UNITS) gaps.push({ reason: "r0 lilypond documents < 10 in split", count: nBy.lilypond ?? 0 });
  for (const s of SYSTEMS) if (!nBy[s]) gaps.push({ reason: `no documents of system ${s} in split`, count: 1 });
  const dco = rows.map((r) => r.dcost).filter((x) => x != null);
  const marginsOk = Object.entries(j.licence).every(([name, lic]) => !lic || real.ba - j.controls[name] >= 0.3);
  const anyLicensed = Object.values(j.licence).some(Boolean);
  const headerPass = anyLicensed ? (real.ba >= 0.95 && (otherMusic == null || otherMusic <= 0.05) && sysOk && marginsOk) : null;
  // RULES-V2 A11: the false-music rate on the natural negatives must be BOUNDED below 0.05 (Wilson 95% upper); a point estimate under 0.05 that cannot be bounded is not a pass
  const bounded = nat.wilson95_upper != null && nat.wilson95_upper <= 0.05;
  let pass = headerPass;
  if (pass === true && !bounded) { pass = nat.rate != null && nat.rate > 0.05 ? false : null; gaps.push({ reason: `false_music_rate_not_bounded: ${nat.music}/${nat.n} natural negatives, Wilson 95% upper ${nat.wilson95_upper} > 0.05`, count: nat.n }); }
  const rung = shape(id, "R0", split, {
    n: rows.length, score: round(real.ba), control: j.best ? round(j.best.score) : null, margin: j.best ? round(real.ba - j.best.score) : null, pass,
    controls: { ...j.controls, no_train_weights_VARIANT: round(sUnit.ba) },
    gaps,
    notes: ["prefix measured in UTF-16 code units (chunks of 64); score = balanced accuracy over gold classes present at 4096 units", "no_train_weights is a VARIANT (ablation of the TRAIN prior), not a control: it does not gate the pass",
      `negatives: ${nat.n} natural (installed software read in place, split by package), ${nearMiss.length} near-miss dialects, ${auth.n} AUTHORED stress fixtures (separate stratum)`,
      `false-music rate on the natural negatives: ${nat.music}/${nat.n}, Wilson 95% upper bound ${nat.wilson95_upper} (gate: <= 0.05); on the authored stress stratum ${auth.music}/${auth.n}, upper ${auth.wilson95_upper} (non-gating)`],
    details: {
      prereg_sha256: PREREG_SHA256, n_by_class: nBy, recall_by_class: Object.fromEntries(Object.entries(real.recall).map(([k, v]) => [k, round(v)])),
      other_given_music_verdict_rate: round(otherMusic), near_miss_refused_rate: round(nearMissRefused), n_near_miss: nearMiss.length,
      natural_negatives: { ...nat, rate: round(nat.rate, 5), by_kind: nByKindMin, bound_ok: bounded },
      authored_stress_stratum: auth, drifted_negatives: drifted, pass_header_rule: headerPass,
      accuracy_at_256: round(r0Score(rows.map((r) => ({ gold: r.gold, verdict: r.v256 }))).ba), accuracy_at_1024: round(r0Score(rows.map((r) => ({ gold: r.gold, verdict: r.v1024 }))).ba),
      median_decision_cost_units: median(dco), n_never_decided_correctly: rows.filter((r) => r.dcost == null && r.gold !== "other").length,
      licence: j.licence, tests: j.tests, status: j.status,
      variant_no_train_weights_ties_within_0_03: Math.abs(sUnit.ba - real.ba) <= 0.03,
      errors: rows.filter((r) => (r.gold === "other" ? r.verdict !== null : r.verdict !== r.gold)).slice(0, 25).map((r) => ({ id: r.id, gold: r.gold, verdict: r.verdict, gap: r.refused })),
    },
  });
  return applyJudgement(rung, { "": j });
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// gold -> comparable shapes
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export function goldSlots(g) {
  const slots = new Map(), claims = new Map(); const lineN = g.parts.length;
  g.parts.forEach((p, li) => {
    for (const m of p.measures) {
      for (const e of m.ev) {
        const kind = e.k === "n" ? "note" : "rest";
        inc(slots, `${li}|${m.i}|${e.on}|${kind}`);
        const base = `${li}|${m.i}|${e.on}|${kind}`;
        if (e.k === "n") inc(claims, `${base}|pitch|${e.midi}`);
        inc(claims, `${base}|dur|${e.dur}`);
        if (e.tie === "start" || e.tie === "continue") inc(claims, `${base}|tie|start`);
      }
      if (m.meter != null) inc(claims, `${li}|${m.i}|-|measure|meter|${m.meter}`);
      if (m.fifths != null) inc(claims, `${li}|${m.i}|-|measure|key|fifths:${m.fifths}`);
    }
  });
  return { slots, claims, lineN };
}
export function sutSlots(r, { claimLabels = null } = {}) {
  const slots = new Map(), claims = new Map(); const byId = new Map();
  let lineN = 0;
  for (const b of r.beings) { byId.set(b.id, b); if (b.kind === "line") lineN++; }
  for (const b of r.beings) if (b.kind === "note" || b.kind === "rest") inc(slots, `${b.line}|${b.measure}|${b.onset}|${b.kind}`);
  for (const rel of r.relations) {
    const b = byId.get(rel.end1); if (!b) continue;
    if (rel.label === "pitch") inc(claims, `${b.line}|${b.measure}|${b.onset}|${b.kind}|pitch|${rel.end2.replace(/^midi:/, "")}`);
    else if (rel.label === "dur") inc(claims, `${b.line}|${b.measure}|${b.onset}|${b.kind}|dur|${rel.end2.replace(/^q:/, "")}`);
    else if (rel.label === "tie") inc(claims, `${b.line}|${b.measure}|${b.onset}|${b.kind}|tie|start`);
    else if (rel.label === "meter") inc(claims, `${b.line}|${b.measure}|-|measure|meter|${rel.end2}`);
    else if (rel.label === "key") inc(claims, `${b.line}|${b.measure}|-|measure|key|${rel.end2}`);
  }
  return { slots, claims, lineN };
}
const labelOf = (k) => k.split("|")[k.split("|")[3] === "measure" ? 4 : 4];

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// R1 / R2 (lexemes)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const MX_NOTE = new Set(["pitched", "pitched_chord", "rest", "grace", "cue", "unpitched", "other"]);          // gold side (expat)
const MX_NOTE_SUT = new Set(["pitched", "pitched_chord", "rest", "grace", "cue", "unpitched", "note_other"]);  // SUT side
function goldLexemes(entry, format) {
  if (format === "musicxml") {
    const g = loadGoldLex(entry.id); if (!g || g.astral) return null;
    return { lex: g.spans.filter((x) => x.s != null && x.e != null).map((x) => ({ s: x.s, e: x.e, r1: MX_NOTE.has(x.k) ? "note" : x.k, r2: x.k })), negatives: [], disputed: new Map() };
  }
  if (format === "abc") {
    const g = loadGoldAbcLex(entry.derived_from ?? entry.id); if (!g?.ok) return null;
    const lex = [], disputed = new Map(); const total = {};
    for (const x of g.lex) { total[x.k] = (total[x.k] ?? 0) + 1; if (!x.agree) { disputed.set(`${x.s}:${x.e}`, x.k); continue; } lex.push({ s: x.s, e: x.e, r1: x.k, r2: x.k }); }
    for (const f of g.fields) lex.push({ s: f.s, e: f.e, r1: f.k, r2: f.k });
    return { lex, negatives: g.fields, disputed, total };
  }
  if (format === "lilypond") {
    const g = loadGoldLy(entry.id); if (!g?.ok) return null;
    return { lex: g.lex.map((x) => ({ s: x.s, e: x.e, r1: x.k, r2: x.k })), negatives: [], disputed: new Map() };
  }
  return null;
}
const R1_CLASSES = { musicxml: new Set(["note", "measure", "part"]), abc: new Set(["note", "chord", "rest", "spacer", "bar", "field", "lyric"]), lilypond: new Set(["pitch", "rest", "duration", "octave", "command", "string", "comment", "bracket", "bar", "word"]) };
function sutTokens(tokens, format) {
  const set = R1_CLASSES[format];
  return tokens.map((t) => ({ s: t.s, e: t.e, c: format === "musicxml" ? (MX_NOTE_SUT.has(t.class) ? "note" : t.class) : t.class, raw: t.class, text: t.text })).filter((t) => set.has(t.c));
}
function r1Doc(goldLex, toks, disputed, format) {
  const set = R1_CLASSES[format];
  const gold = new Map(), pred = new Map();
  for (const x of goldLex) if (set.has(x.r1)) inc(gold, `${x.r1}|${x.s}|${x.e}`);
  for (const t of toks) { if (disputed.has(`${t.s}:${t.e}`)) continue; inc(pred, `${t.c}|${t.s}|${t.e}`); }
  const st = msetStats(gold, pred);
  return { tp: st.tp, fp: st.nb - st.tp, fn: st.na - st.tp };
}
function wsTokens(text, format) {
  const out = []; const re = /\S+/g; let m;
  while ((m = re.exec(text))) out.push({ s: m.index, e: m.index + m[0].length, c: "note", raw: "ws", text: m[0] });
  return out;
}
function shiftTokens(toks, k) { return toks.map((t) => ({ ...t, s: t.s + k, e: t.e + k })); }

export function measureR1R2({ split = "dev", limit = null } = {}) {
  const r1 = shape("r1", "R1", split), r2 = shape("r2", "R2", split);
  if (!manifest()) return { r1: unmeasured("r1", "R1", split, "no corpus manifest"), r2: unmeasured("r2", "R2", split, "no corpus manifest") };
  const priors = PRIORS();
  if (!priors.standard) return { r1: unmeasured("r1", "R1", split, "no standard prior"), r2: unmeasured("r2", "R2", split, "no standard prior") };
  const derRoles = derangedPriors("roles");
  const fmts = [["musicxml", positives(split, "musicxml")], ["abc", positives(split, "abc")], ["lilypond", positives(split, "lilypond")]];
  const perFormat = {}, gaps = [];
  const r2perFormat = {};
  for (const [format, es0] of fmts) {
    const es = takeN(es0, limit);
    if (!es.length) { gaps.push({ reason: `no ${format} documents in split`, count: 1 }); continue; }
    const acc = { real: [], ws: [], shift: [], der: [] }, counts = { real: [0, 0, 0], ws: [0, 0, 0], shift: [0, 0, 0], der: [0, 0, 0] };
    const perClass = new Map();
    let skipped = 0, disputedN = 0;
    const disp = { total: {}, disputed: {}, by_source: {} };           // review fix A12: what the gold drops as disputed, per class and per source (a split can hold several sources)
    // R2 accumulators
    const r2 = { realConf: new Map(), realBeing: [0, 0, 0], perDocAcc: { real: [], derC: [], letter: [], major: [] }, ctl: { derC: new Map(), letter: new Map(), major: new Map() }, ctlBeing: { derC: [0, 0, 0], letter: [0, 0, 0], major: [0, 0, 0] }, nLex: 0, nNeg: 0, unheard: 0 };
    const globalClassCount = new Map();
    const prepared = [];
    for (const e of es) {
      const text = textOf(e); const gl = goldLexemes(format === "abc" ? e : e, format);
      if (text == null || !gl) { skipped++; continue; }
      prepared.push({ e, text, gl });
      for (const x of gl.lex) if (R1_CLASSES[format].has(x.r1) || true) inc(globalClassCount, x.r2);
      disputedN += gl.disputed.size;
      for (const [c, n] of Object.entries(gl.total ?? {})) disp.total[c] = (disp.total[c] ?? 0) + n;
      for (const c of gl.disputed.values()) disp.disputed[c] = (disp.disputed[c] ?? 0) + 1;
      if (gl.total) { const src = e.source ?? "?"; const b = (disp.by_source[src] ??= { total: 0, disputed: 0 }); b.total += Object.values(gl.total).reduce((a, x) => a + x, 0); b.disputed += gl.disputed.size; }
    }
    const majorClass = [...globalClassCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    prepared.forEach((d, di) => {
      const sys = format;
      const toks = ear(d.text, { system: sys, priors });
      const toksDer = ear(d.text, { system: sys, priors: derRoles });
      const real = sutTokens(toks, format), der = sutTokens(toksDer, format), ws = wsTokens(d.text, format);
      const shift = shiftTokens(real, 1 + (hash32(d.e.id) % 7));
      for (const [name, tk] of [["real", real], ["ws", ws], ["shift", shift], ["der", der]]) {
        const r = r1Doc(d.gl.lex, tk, d.gl.disputed, format);
        counts[name][0] += r.tp; counts[name][1] += r.fp; counts[name][2] += r.fn;
        acc[name].push(f1(r.tp, r.fp, r.fn) ?? 0);
      }
      // ---- R2
      const startMap = new Map(); for (const t of toks) if (!startMap.has(t.s)) startMap.set(t.s, t);
      const startMapD = new Map(); for (const t of toksDer) if (!startMapD.has(t.s)) startMapD.set(t.s, t);
      const lexScored = d.gl.lex.filter((x) => R1_CLASSES[format].has(x.r1) || format === "musicxml" && R1_CLASSES.musicxml.has(x.r1) || true).filter((x) => x.r2 !== "other");
      const predReal = lexScored.map((x) => { const t = startMap.get(x.s); return t ? t.class : "unheard"; });
      const rng = mulberry32(SEED + 300 + di);
      const dp = derangement(predReal.length, rng);
      const predDer = dp ? dp.map((k) => predReal[k]) : predReal.slice();
      const predLetter = lexScored.map((x) => { const ch = d.text[x.s]; return format === "abc" ? (/[A-Ga-g]/.test(ch) ? "note" : "other") : format === "musicxml" ? "pitched" : "other"; });
      const predMajor = lexScored.map(() => majorClass);
      const goldCls = lexScored.map((x) => x.r2);
      const addConf = (m, gold, pred) => { for (let i = 0; i < gold.length; i++) inc(m, `${gold[i]}>${pred[i]}`); };
      addConf(r2.realConf, goldCls, predReal);
      addConf(r2.ctl.derC, goldCls, predDer); addConf(r2.ctl.letter, goldCls, predLetter); addConf(r2.ctl.major, goldCls, predMajor);
      const accOf = (pred) => (goldCls.length ? goldCls.filter((g, i) => g === pred[i]).length / goldCls.length : 0);
      r2.perDocAcc.real.push(accOf(predReal)); r2.perDocAcc.derC.push(accOf(predDer)); r2.perDocAcc.letter.push(accOf(predLetter)); r2.perDocAcc.major.push(accOf(predMajor));
      r2.nLex += goldCls.length; r2.unheard += predReal.filter((p) => p === "unheard").length;
      // names_being: positives vs negatives (gold non-being lexemes + words inside field/lyric lines)
      const beingGold = goldCls.map((c) => BEING_CLASSES.has(c));
      const negWords = [];
      for (const nl of d.gl.negatives) { const seg = d.text.slice(nl.s, nl.e); const re = /\S+/g; let m; while ((m = re.exec(seg))) negWords.push(nl.s + m.index); }
      const containing = (pos, map) => { // class of the SUT token that contains pos (the narrowest)
        let best = null; for (const t of map) if (t.s <= pos && pos < t.e && (best == null || t.e - t.s < best.e - best.s)) best = t; return best ? best.class : "unheard";
      };
      const negPredReal = negWords.map((p) => BEING_CLASSES.has(containing(p, toks))), negPredDer = negWords.map((p) => BEING_CLASSES.has(containing(p, toksDer)));
      const negPredLetter = negWords.map((p) => /[A-Ga-g]/.test(d.text[p]));
      const upd = (acc2, goldB, predB, negP) => { for (let i = 0; i < goldB.length; i++) { if (goldB[i] && predB[i]) acc2[0]++; else if (!goldB[i] && predB[i]) acc2[1]++; else if (goldB[i] && !predB[i]) acc2[2]++; } for (const x of negP) if (x) acc2[1]++; };
      upd(r2.realBeing, beingGold, predReal.map((c) => BEING_CLASSES.has(c)), negPredReal);
      upd(r2.ctlBeing.derC, beingGold, predDer.map((c) => BEING_CLASSES.has(c)), negPredDer);
      upd(r2.ctlBeing.letter, beingGold, predLetter.map((c) => c === "note"), negPredLetter);
      upd(r2.ctlBeing.major, beingGold, predMajor.map((c) => BEING_CLASSES.has(c)), []);
      r2.nNeg += negWords.length;
    });
    const mic = (c) => f1(c[0], c[1], c[2]);
    const realF1 = mic(counts.real);
    const J = judgeControls({ score: realF1, perUnit: acc.real }, {
      whitespace_ear: { score: mic(counts.ws), perUnit: acc.ws }, shifted_spans: { score: mic(counts.shift), perUnit: acc.shift }, deranged_prior: { score: mic(counts.der), perUnit: acc.der },
    });
    const marginsOk = Object.entries(J.licence).every(([n, lic]) => !lic || realF1 - J.controls[n] >= 0.3);
    const dTot = Object.values(disp.total).reduce((a, x) => a + x, 0);
    const dispReport = { gold_lexemes: dTot, disputed_dropped: disputedN, share_dropped: dTot ? disputedN / dTot : null, by_class: Object.fromEntries(Object.keys(disp.total).map((c) => [c, { total: disp.total[c], disputed: disp.disputed[c] ?? 0 }])), by_source: disp.by_source };
    if (format === "abc") { if (dTot && disputedN) gaps.push({ reason: `abc_gold_lexemes_dropped_as_disputed: ${disputedN} of ${dTot} (${(100 * disputedN / dTot).toFixed(3)}%): removed from the gold AND from the SUT's predictions`, count: disputedN }); }
    perFormat[format] = { n: prepared.length, skipped, disputed_lexemes_excluded: disputedN, gold_dispute_report: dispReport, f1: realF1, controls: J.controls, licence: J.licence, tests: J.tests, status: J.status, broken: J.broken, underpowered: J.underpowered, margin: J.best ? realF1 - J.best.score : null,
      pass: prepared.length >= MIN_UNITS && J.best ? realF1 >= 0.9 && marginsOk : null, counts: counts.real };
    // R2 per format
    const classes = [...new Set([...r2.realConf.keys()].map((k) => k.split(">")[0]))];
    const macro = (conf) => {
      const fs = [];
      for (const c of classes) { let tp = 0, fp = 0, fn = 0; for (const [k, v] of conf) { const [g, p] = k.split(">"); if (g === c && p === c) tp += v; else if (g === c) fn += v; else if (p === c) fp += v; } if (tp + fn > 0) fs.push(f1(tp, fp, fn) ?? 0); }
      return mean(fs);
    };
    const realMacro = macro(r2.realConf), realBeingF1 = mic(r2.realBeing);
    const s2 = format === "lilypond" ? realMacro : 0.5 * (realMacro + (realBeingF1 ?? 0));
    const ctlScore = (k) => (format === "lilypond" ? macro(r2.ctl[k]) : 0.5 * (macro(r2.ctl[k]) + (mic(r2.ctlBeing[k]) ?? 0)));
    const J2 = judgeControls({ score: s2, perUnit: r2.perDocAcc.real }, {
      deranged_classes: { score: ctlScore("derC"), perUnit: r2.perDocAcc.derC }, letter_rule: { score: ctlScore("letter"), perUnit: r2.perDocAcc.letter }, majority_class: { score: ctlScore("major"), perUnit: r2.perDocAcc.major },
    });
    const m2 = Object.entries(J2.licence).every(([n, lic]) => !lic || s2 - J2.controls[n] >= 0.3);
    const perClassF1 = {};
    for (const c of classes) { let tp = 0, fp = 0, fn = 0; for (const [k, v] of r2.realConf) { const [g, p] = k.split(">"); if (g === c && p === c) tp += v; else if (g === c) fn += v; else if (p === c) fp += v; } if (tp + fn > 0) perClassF1[c] = round(f1(tp, fp, fn)); }
    r2perFormat[format] = { n: prepared.length, score: s2, macro_f1: realMacro, names_being_f1: realBeingF1, controls: J2.controls, licence: J2.licence, tests: J2.tests, status: J2.status, broken: J2.broken, underpowered: J2.underpowered, margin: J2.best ? s2 - J2.best.score : null,
      pass: prepared.length >= MIN_UNITS && J2.best ? s2 >= 0.9 && (format === "lilypond" || (realBeingF1 ?? 0) >= 0.95) && m2 : null, per_class_f1: perClassF1, n_lexemes: r2.nLex, n_negative_words: r2.nNeg, unheard: r2.unheard, confusion_top: [...r2.realConf.entries()].filter(([k]) => k.split(">")[0] !== k.split(">")[1]).sort((a, b) => b[1] - a[1]).slice(0, 8) };
  }
  const assemble = (id, rung, pf, key) => {
    const fmtNames = Object.keys(pf);
    const scores = fmtNames.map((f) => pf[f][key]).filter((x) => x != null);
    const score = mean(scores);
    const ctlNames = fmtNames.length ? Object.keys(pf[fmtNames[0]].controls) : [];
    const controls = {}; for (const n of ctlNames) { controls[n] = round(mean(fmtNames.map((f) => pf[f].controls[n]).filter((x) => x != null))); }
    const licensedAll = ctlNames.filter((n) => fmtNames.every((f) => pf[f].licence[n]));
    const bestCtl = licensedAll.length ? Math.max(...licensedAll.map((n) => controls[n])) : null;
    const measurable = fmtNames.filter((f) => pf[f].pass !== null);
    const pass = measurable.length ? measurable.every((f) => pf[f].pass === true) : null;
    const rg = shape(id, rung, split, {
      n: fmtNames.reduce((a, f) => a + pf[f].n, 0), score: round(score), control: bestCtl == null ? null : round(bestCtl), margin: bestCtl == null ? null : round(score - bestCtl), pass,
      controls, gaps: [...gaps, ...fmtNames.filter((f) => pf[f].n < MIN_UNITS).map((f) => ({ reason: `${f}: fewer than ${MIN_UNITS} documents; not gating`, count: pf[f].n })), ...(fmtNames.length ? [] : [{ reason: "unmeasured: no documents", count: 1 }])],
      details: { prereg_sha256: PREREG_SHA256, formats: Object.fromEntries(fmtNames.map((f) => [f, Object.fromEntries(Object.entries(pf[f]).map(([k, v]) => [k, typeof v === "number" ? round(v) : v]))])) },
    });
    return applyJudgement(rg, Object.fromEntries(fmtNames.map((f) => [f, { broken: pf[f].broken, underpowered: pf[f].underpowered }])));
  };
  const R1 = assemble("r1", "R1", perFormat, "f1"), R2 = assemble("r2", "R2", r2perFormat, "score");
  R1.notes.push("score = mean over formats of micro F1 over exact (class,start,end); control = strongest control licensed on EVERY format");
  { const rep = perFormat.abc?.gold_dispute_report; if (rep) R1.notes.push(`ABC gold lexemes dropped as disputed (removed from the gold AND from the SUT's predictions): ${rep.disputed_dropped} of ${rep.gold_lexemes} (${rep.gold_lexemes ? (100 * rep.disputed_dropped / rep.gold_lexemes).toFixed(3) : "n/a"}%); by class ${JSON.stringify(rep.by_class)}; by source ${JSON.stringify(rep.by_source)}`); }
  R1.gaps.push({ reason: "unmeasured: natural ABC lexemes (repeats, ornaments, decorations, multi-tune files); derived ABC only", count: 1 });
  R2.notes.push("score = mean over formats of 0.5*(macro-F1 over gold classes present + F1 of names_being); lilypond uses macro-F1 only");
  return { r1: R1, r2: R2 };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// R3 / R4 / R5 (events)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function pieces(split, system, limit) {
  const out = [];
  const st = system === "abc" ? loadStructure() : null;
  for (const e of takeN(positives(split, system), limit == null ? null : limit)) {
    const goldId = system === "abc" ? e.derived_from : e.id;
    const g = loadGoldEvents(goldId);
    const text = textOf(e);
    if (!g || !g.ok || text == null) { out.push({ e, skipped: true, why: !g ? "no_gold" : !g.ok ? "gold_unavailable:" + (g.error ?? "") .slice(0, 60) : "unreadable" }); continue; }
    // RULES-V2 A13: a derived-ABC piece enters the R3/R4/R5 headline only if abcjs independently certifies its structure (scripts/validate_structure.mjs)
    if (st) {
      const r = st[e.derived_from];
      if (!r || !r.certified) {
        const failed = new Set(); for (const ln of r?.lines ?? []) if (!ln.ok && ln.facets) for (const [f, ok] of Object.entries(ln.facets)) if (!ok) failed.add(f);
        out.push({ e, skipped: true, uncertified: true, why: `structure_uncertified:${r ? (r.why ?? "") : "no_record"}${failed.size ? ":" + [...failed].join("+") : ""}` }); continue;
      }
    }
    out.push({ e, g, text, gold: goldSlots(g) });
  }
  return out;
}
function scoreSlots(sut, gold) {
  // slots: per line index compare; lines beyond the other's count count as FP/FN
  const a = msetStats(gold.slots, sut.slots);
  return { tp: a.tp, fp: a.nb - a.tp, fn: a.na - a.tp, lineDiff: sut.lineN !== gold.lineN };
}
function claimsStats(sut, gold, labels = null) {
  const sel = (m) => (labels ? new Map([...m].filter(([k]) => labels.includes(k.split("|")[k.split("|")[3] === "measure" ? 5 : 5 - 0]))) : m);
  const a = msetStats(sel(gold.claims), sel(sut.claims));
  return { tp: a.tp, fp: a.nb - a.tp, fn: a.na - a.tp };
}
const labelOfClaim = (k) => k.split("|")[4];
function claimsByLabel(sut, gold) {
  const per = {};
  const labels = ["pitch", "dur", "tie", "meter", "key"];
  for (const l of labels) {
    const g = new Map([...gold.claims].filter(([k]) => labelOfClaim(k) === l)), s = new Map([...sut.claims].filter(([k]) => labelOfClaim(k) === l));
    const st = msetStats(g, s); per[l] = { tp: st.tp, fp: st.nb - st.tp, fn: st.na - st.tp };
  }
  return per;
}
export function blindRead(text) {
  // a notation-blind reader: one `note` per whitespace-delimited token, at consecutive onsets of one line / one measure
  const beings = [{ id: "L0", kind: "line", span: [0, 0], line: 0 }], relations = [];
  let i = 0; const re = /\S+/g; let m;
  while ((m = re.exec(text))) { beings.push({ id: `b${i}`, kind: "note", span: [m.index, m.index + m[0].length], line: 0, measure: 0, onset: String(i), midi: 60, dur: "1" }); relations.push({ end1: `b${i}`, label: "pitch", end2: "midi:60" }, { end1: `b${i}`, label: "dur", end2: "q:1" }); i++; }
  return { beings, relations };
}
export function causalCheck(items, system, priors, readFn = read) {
  let violations = 0, checked = 0, compared = 0;
  for (const it of items.slice(0, CAUSAL_PIECES)) {
    const full = readFn(it.text, { system, priors });
    const fullSet = new Map();
    for (const b of full.beings) if (b.kind === "note" || b.kind === "rest") inc(fullSet, `${b.line}|${b.measure}|${b.onset}|${b.kind}|${b.midi}|${b.dur}`);
    for (const c of CUTS) {
      let cut = Math.floor(it.text.length * c);
      if (system === "musicxml") { const k = it.text.lastIndexOf(">", cut); cut = k >= 0 ? k + 1 : cut; }
      else { let k = cut; while (k > 0 && !/\s/.test(it.text[k - 1])) k--; cut = k; }
      const pre = readFn(it.text.slice(0, cut), { system, priors });
      checked++;
      const preSet = new Map();
      for (const b of pre.beings) if (b.kind === "note" || b.kind === "rest") inc(preSet, `${b.line}|${b.measure}|${b.onset}|${b.kind}|${b.midi}|${b.dur}`);
      for (const [k, v] of preSet) { compared += v; const f = fullSet.get(k) ?? 0; if (v > f) violations += v - f; }
    }
  }
  return { violations, checked_prefixes: checked, beings_compared: compared };
}

// ── R4 v2 labels (RULES-V2 A14): per-label claim sets, each with the control built to fail for THAT label
const BLACK_PC = new Set([1, 3, 6, 8, 10]);
export const R4_LABELS = Object.freeze(["pitch", "pitch_black", "dur", "tie", "meter", "key"]);
export const R4_LABEL_CONTROL = Object.freeze({ pitch: "deranged_pitch", pitch_black: "ablate_key_accidentals", dur: "ablate_duration", tie: "no_tie_claims", meter: "constant_meter_4_4", key: "constant_key_C" });
const MIN_STRATUM_CLAIMS = 30, DEGENERATE_SHARE = 0.95, LABEL_F1 = 0.9, LABEL_MARGIN = 0.3;
export const R5_DERIVED_AGREEMENT = 0.98;
const labelPred = (L) => (k) => {
  const lab = labelOfClaim(k);
  if (L === "pitch_black") return lab === "pitch" && BLACK_PC.has((((Number(k.split("|")[5]) % 12) + 12) % 12));
  return lab === L;
};
const claimValue = (k) => k.split("|").slice(5).join("|");
const pickClaims = (m, pred) => new Map([...m].filter(([k]) => pred(k)));
/** a claim set with every value of `label` replaced by `value` (the blind guess: the same slots, a constant claim) */
const constantClaims = (m, label, value) => { const out = new Map(); for (const [k, v] of m) if (labelOfClaim(k) === label) { const parts = k.split("|"); parts[5] = value; inc(out, parts.join("|"), v); } return out; };

/**
 * The gate for ONE label. acc = {perReal:[F1 per piece], perCtl:[...], real:[tp,fp,fn], ctl:[tp,fp,fn], n pieces, gold claims, modalShare}.
 * status: pass | fail | instrument_broken | no_gate_possible | unmeasured. (A tied or beaten control is `instrument_broken` unless the gold label is degenerate
 * (>= 95% one value) and the control is a constant guess: then it is a typed `no_gate_possible`, never a pass.)
 */
export function labelGate(L, acc) {
  const mic = (c) => f1(c[0], c[1], c[2]);
  const real = mic(acc.real), ctl = mic(acc.ctl), ctlName = R4_LABEL_CONTROL[L];
  const base = { label: L, control: ctlName, f1: round(real), control_f1: round(ctl), n_pieces: acc.n, gold_claims: acc.gold, modal_share: round(acc.modalShare) };
  if (acc.n < MIN_UNITS) return { ...base, status: "unmeasured", why: `fewer than ${MIN_UNITS} pieces carry this label (${acc.n})` };
  if (L === "pitch_black" && acc.gold < MIN_STRATUM_CLAIMS) return { ...base, status: "unmeasured", why: `fewer than ${MIN_STRATUM_CLAIMS} gold claims in the stratum (${acc.gold})` };
  const J = judgeControls({ score: real, perUnit: acc.perReal }, { [ctlName]: { score: ctl, perUnit: acc.perCtl } });
  const degenerate = (L === "meter" || L === "key") && acc.modalShare >= DEGENERATE_SHARE;
  const o = { ...base, licensed: J.licence[ctlName], sign_test: J.tests[ctlName], margin: real == null || ctl == null ? null : round(real - ctl), degenerate_gold: degenerate };
  if (J.broken.length) return degenerate ? { ...o, status: "no_gate_possible", why: `the gold label is ${(100 * acc.modalShare).toFixed(1)}% one value: a constant guess ties the real arm; this split cannot certify the label` } : { ...o, status: "instrument_broken", why: `control ${ctlName} ties or beats the real arm` };
  if (!(real >= LABEL_F1)) return { ...o, status: "fail", why: `F1 ${round(real)} < ${LABEL_F1}` };
  if (!J.licence[ctlName]) return { ...o, status: "no_gate_possible", why: `control ${ctlName} not licensed (sign test p=${J.tests[ctlName].p}, n=${acc.n})` };
  if (real - ctl < LABEL_MARGIN) return { ...o, status: "fail", why: `margin ${round(real - ctl)} < ${LABEL_MARGIN} over ${ctlName}: the label's gate does not separate the reader from the control` };
  return { ...o, status: "pass" };
}
/** R4 v2 verdict from the label gates of one format: false if any gate failed or the instrument broke; null if none failed but some label cannot be gated or measured; true only if every label passed. */
export function r4VerdictV2(gates, microF1) {
  const st = gates.map((g) => g.status);
  if (st.includes("fail") || st.includes("instrument_broken") || !(microF1 >= LABEL_F1)) return false;
  if (st.includes("no_gate_possible") || st.includes("unmeasured")) return null;     // RULES-V2.1 A17: a label that cannot be measured leaves the claim unproven (never a pass)
  return st.some((x) => x === "pass") ? true : null;
}

export function measureR3R4R5({ split = "dev", limit = null, readFn = read } = {}) {
  const r3 = shape("r3", "R3", split), r4 = shape("r4", "R4", split), r5 = shape("r5", "R5", split);
  if (!manifest()) return { r3: unmeasured("r3", "R3", split, "no corpus manifest"), r4: unmeasured("r4", "R4", split, "no corpus manifest"), r5: unmeasured("r5", "R5", split, "no corpus manifest") };
  const priors = PRIORS();
  if (!priors.standard) { const u = (id, r) => unmeasured(id, r, split, "no standard prior"); return { r3: u("r3", "R3"), r4: u("r4", "R4"), r5: u("r5", "R5") }; }
  const derPitch = derangedPriors("pitch");
  const formats = {}; const gaps = [];
  const store = {};
  const structure = loadStructure();
  for (const system of ["musicxml", "abc"]) {
    const ps = pieces(split, system, limit);
    const ok = ps.filter((p) => !p.skipped);
    const skipped = ps.filter((p) => p.skipped);
    const uncertified = skipped.filter((p) => p.uncertified);
    if (!ok.length) { gaps.push({ reason: `${system}: no measurable pieces in split (${skipped.length} skipped)`, count: skipped.length }); continue; }
    const rdReal = ok.map((p) => readFn(p.text, { system, priors }));
    const rdAblDur = ok.map((p) => readFn(p.text, { system, priors, ablate: ["duration"] }));
    const rdAblKey = ok.map((p) => readFn(p.text, { system, priors, ablate: ["accidentals", "key"] }));
    const rdDerPitch = ok.map((p) => readFn(p.text, { system, priors: derPitch }));
    store[system] = { ok, rdReal, rdAblDur, rdDerPitch };
    const sutReal = rdReal.map((r) => sutSlots(r));
    // R3
    const per = { real: [], der: [], abl: [], blind: [] }, cnt = { real: [0, 0, 0], der: [0, 0, 0], abl: [0, 0, 0], blind: [0, 0, 0] };
    const rng = mulberry32(SEED + 500);
    const dp = derangement(ok.length, rng);
    let lineMismatch = 0;
    ok.forEach((p, i) => {
      const add = (name, sut, gold) => { const s = scoreSlots(sut, gold); cnt[name][0] += s.tp; cnt[name][1] += s.fp; cnt[name][2] += s.fn; per[name].push(f1(s.tp, s.fp, s.fn) ?? 0); return s; };
      const sr = add("real", sutReal[i], p.gold); if (sr.lineDiff) lineMismatch++;
      add("der", sutReal[i], ok[dp ? dp[i] : i].gold);
      add("abl", sutSlots(rdAblDur[i]), p.gold);
      add("blind", sutSlots(blindRead(p.text)), p.gold);
    });
    const mic = (c) => f1(c[0], c[1], c[2]);
    const realF1 = mic(cnt.real);
    const J = judgeControls({ score: realF1, perUnit: per.real }, { deranged_pairing: { score: mic(cnt.der), perUnit: per.der }, ablate_duration: { score: mic(cnt.abl), perUnit: per.abl }, blind_tokens: { score: mic(cnt.blind), perUnit: per.blind } });
    const causal = causalCheck(ok, system, priors, readFn);
    // R4 micro (header rule), unchanged
    const p4 = { real: [], dpitch: [], abl: [], dclaims: [] }, c4 = { real: [0, 0, 0], dpitch: [0, 0, 0], abl: [0, 0, 0], dclaims: [0, 0, 0] };
    const lab = {}; for (const l of ["pitch", "dur", "tie", "meter", "key"]) lab[l] = [0, 0, 0];
    const pitchCtl = { deranged_pitch: [0, 0, 0], ablate_key_accidentals: [0, 0, 0] };
    // R4 v2: per-label accumulators
    const L2 = Object.fromEntries(R4_LABELS.map((L) => [L, { real: [0, 0, 0], ctl: [0, 0, 0], perReal: [], perCtl: [], n: 0, gold: 0, vals: new Map() }]));
    ok.forEach((p, i) => {
      const sr = sutReal[i];
      const st = (sut, gold) => msetStats(gold.claims, sut.claims);
      const push = (name, sut) => { const s = st(sut, p.gold); c4[name][0] += s.tp; c4[name][1] += s.nb - s.tp; c4[name][2] += s.na - s.tp; p4[name].push(f1(s.tp, s.nb - s.tp, s.na - s.tp) ?? 0); };
      push("real", sr);
      const sDer = sutSlots(rdDerPitch[i]), sAbl = sutSlots(rdAblKey[i]), sAD = sutSlots(rdAblDur[i]);
      push("dpitch", sDer); push("abl", sAbl);
      // deranged_claims: shuffle the claim VALUES among the SUT's own claims within the piece
      const keys = [...sr.claims.keys()]; const vals = keys.map((k) => k.split("|").slice(5).join("|")); const labs = keys.map((k) => labelOfClaim(k));
      const sh = shuffled(vals.map((v, j) => j), mulberry32(SEED + 900 + i));
      const dm = new Map(); keys.forEach((k, j) => { const parts = k.split("|"); const jj = sh[j]; if (labs[jj] === labs[j]) { parts[5] = vals[jj]; } inc(dm, parts.join("|"), sr.claims.get(k)); });
      push("dclaims", { claims: dm });
      const bl = claimsByLabel(sr, p.gold); for (const l of Object.keys(lab)) { lab[l][0] += bl[l].tp; lab[l][1] += bl[l].fp; lab[l][2] += bl[l].fn; }
      for (const [nm, sutc] of [["deranged_pitch", sDer], ["ablate_key_accidentals", sAbl]]) { const b2 = claimsByLabel(sutc, p.gold).pitch; pitchCtl[nm][0] += b2.tp; pitchCtl[nm][1] += b2.fp; pitchCtl[nm][2] += b2.fn; }
      // per-label real vs the label's own control
      const ctlClaims = { pitch: sDer.claims, pitch_black: sAbl.claims, dur: sAD.claims, tie: new Map(), meter: constantClaims(sr.claims, "meter", "4/4"), key: constantClaims(sr.claims, "key", "fifths:0") };
      for (const L of R4_LABELS) {
        const pred = labelPred(L);
        const gL = pickClaims(p.gold.claims, pred), rL = pickClaims(sr.claims, pred);
        if (!gL.size && !rL.size) continue;
        const cL = pickClaims(ctlClaims[L], pred);
        const a = msetStats(gL, rL), c = msetStats(gL, cL);
        const A = L2[L];
        A.real[0] += a.tp; A.real[1] += a.nb - a.tp; A.real[2] += a.na - a.tp;
        A.ctl[0] += c.tp; A.ctl[1] += c.nb - c.tp; A.ctl[2] += c.na - c.tp;
        A.perReal.push(f1(a.tp, a.nb - a.tp, a.na - a.tp) ?? 0); A.perCtl.push(f1(c.tp, c.nb - c.tp, c.na - c.tp) ?? 0);
        A.n++; A.gold += a.na;
        for (const [k, v] of gL) inc(A.vals, claimValue(k), v);
      }
    });
    const real4 = mic(c4.real);
    const J4 = judgeControls({ score: real4, perUnit: p4.real }, { deranged_pitch: { score: mic(c4.dpitch), perUnit: p4.dpitch }, ablate_key_accidentals: { score: mic(c4.abl), perUnit: p4.abl }, deranged_claims: { score: mic(c4.dclaims), perUnit: p4.dclaims } });
    const labF1 = Object.fromEntries(Object.entries(lab).map(([l, c]) => [l, round(mic(c))]));
    for (const L of R4_LABELS) { const A = L2[L]; const tot = [...A.vals.values()].reduce((a, x) => a + x, 0); A.modalShare = tot ? Math.max(...A.vals.values()) / tot : 0; }
    const gates = R4_LABELS.map((L) => labelGate(L, L2[L]));
    const verdictV2 = r4VerdictV2(gates, real4);
    const gapAgg = new Map(); for (const r of rdReal) for (const g of r.gaps) inc(gapAgg, g.reason, g.count);
    const reasons = {}; for (const u of uncertified) reasons[u.why] = (reasons[u.why] ?? 0) + 1;
    const absent = system === "abc" ? { available: !!structure, certified: ok.length, excluded_uncertified: uncertified.length, excluded_reasons: reasons, uncertified_ids: uncertified.map((u) => u.e.derived_from) } : null;
    formats[system] = { n: ok.length, skipped: skipped.length, skipped_why: skipped.slice(0, 5).map((s) => `${s.e.id}:${s.why}`), abc_structure: absent,
      r3: { f1: realF1, controls: J.controls, licence: J.licence, tests: J.tests, status: J.status, broken: J.broken, underpowered: J.underpowered, best: J.best, causal, line_mismatch_pieces: lineMismatch, counts: cnt.real },
      r4: { f1: real4, controls: J4.controls, licence: J4.licence, tests: J4.tests, status: J4.status, broken: J4.broken, underpowered: J4.underpowered, best: J4.best, per_label_f1: labF1, pitch_label_f1_under_controls: { deranged_pitch: round(mic(pitchCtl.deranged_pitch)), ablate_key_accidentals: round(mic(pitchCtl.ablate_key_accidentals)) }, counts: c4.real,
        label_gates: gates, verdict_v2: verdictV2, failed_labels: gates.filter((g) => g.status === "fail" || g.status === "instrument_broken").map((g) => g.label), ungated_labels: gates.filter((g) => g.status === "no_gate_possible" || g.status === "unmeasured").map((g) => `${g.label}:${g.status}`) },
      sut_gaps: [...gapAgg.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 12) };
  }
  const structNote = (f) => {
    const s = formats.abc?.abc_structure;
    if (!f.includes("abc")) return [];
    if (!s) return [];
    return s.available
      ? [`ABC gold, independently certified by abcjs (scripts/validate_structure.mjs): measure boundaries, onsets within a measure, rest slots, durations, ties, meter and key (pitch: by the MIDI admission test). ${s.certified} piece(s) certified and used, ${s.excluded_uncertified} admitted piece(s) EXCLUDED as uncertified (${Object.entries(s.excluded_reasons).map(([k, v]) => `${k} x${v}`).join("; ") || "none"}). Not certifiable by abcjs: rests inside overlay voices (abcjs drops rest-only overlays) and a whole-bar z-rest after an inline meter change (abcjs rewrites its length).`]
      : ["ABC gold: derived/structure.json ABSENT. Rest slots, measure indices, onsets, meter and key of the derived ABC gold are the converter's OWN table, independently certified for sounding notes only (abcjs MIDI admission). Do not present the ABC R3/R4 rest, meter and key figures as independently gold-checked."];
  };
  const build = (id, rung, key, passFn, headerFn = null) => {
    const fm = Object.keys(formats);
    if (!fm.length) return unmeasured(id, rung, split, "no measurable pieces", { gaps });
    const scores = fm.map((f) => formats[f][key].f1);
    const cn = Object.keys(formats[fm[0]][key].controls);
    const controls = {}; for (const n of cn) controls[n] = round(mean(fm.map((f) => formats[f][key].controls[n]).filter((x) => x != null)));
    const licensedAll = cn.filter((n) => fm.every((f) => formats[f][key].licence[n]));
    const best = licensedAll.length ? Math.max(...licensedAll.map((n) => controls[n])) : null;
    const score = mean(scores);
    const meas = fm.filter((f) => formats[f].n >= MIN_UNITS);
    const headerPass = meas.length && best != null ? (headerFn ?? passFn)(meas, score, best) : null;
    const pass = meas.length && best != null ? passFn(meas, score, best) : null;
    const rg = shape(id, rung, split, { n: fm.reduce((a, f) => a + formats[f].n, 0), score: round(score), control: best == null ? null : round(best), margin: best == null ? null : round(score - best), pass, controls,
      gaps: [...gaps, ...fm.filter((f) => formats[f].n < MIN_UNITS).map((f) => ({ reason: `${f}: fewer than ${MIN_UNITS} pieces; not gating`, count: formats[f].n })), ...fm.flatMap((f) => formats[f].skipped ? [{ reason: `${f}: pieces without usable gold or text, or (abc) without independent structural certification`, count: formats[f].skipped }] : []),
        { reason: "unmeasured: lilypond events (no event reader, no engine)", count: 1 }, { reason: "unmeasured: natural ABC (derived ABC only)", count: 1 },
        ...(split !== "test" ? [{ reason: "unmeasured: MusicXML from exporters other than MuseScore (the only non-MuseScore source, scorewriter-comparison, is TEST)", count: 1 }] : [])],
      notes: [...structNote(fm)],
      details: { prereg_sha256: PREREG_SHA256, rules_v2_sha256: RULES_V2_SHA256, rules_v2_1_sha256: RULES_V21_SHA256, rules_v2_2_sha256: RULES_V22_SHA256, rule_version: RULE_VERSION, pass_header_rule: headerPass, formats: Object.fromEntries(fm.map((f) => [f, JSON.parse(JSON.stringify(formats[f], (k, v) => (typeof v === "number" ? round(v) : v)))])), licence: Object.fromEntries(cn.map((n) => [n, fm.map((f) => formats[f][key].licence[n])])) } });
    return applyJudgement(rg, Object.fromEntries(fm.map((f) => [f, { broken: [...formats[f][key].broken, ...(key === "r4" ? formats[f].r4.label_gates.filter((g) => g.status === "instrument_broken").map((g) => g.control) : [])], underpowered: formats[f][key].underpowered }])));
  };
  const R3 = build("r3", "R3", "r3", (meas, score, best) => meas.every((f) => formats[f].r3.f1 >= 0.9) && score - best >= 0.3 && meas.every((f) => formats[f].r3.causal.violations === 0));
  // R4: the header rule (micro margin) is computed and reported as pass_header_rule; `pass` is the RULES-V2 verdict (per-label gates)
  const R4 = build("r4", "R4", "r4",
    (meas) => { const vs = meas.map((f) => formats[f].r4.verdict_v2); return vs.includes(false) ? false : vs.includes(null) ? null : true; },
    (meas, score, best) => meas.every((f) => formats[f].r4.f1 >= 0.9 && (formats[f].r4.per_label_f1.pitch ?? 0) >= 0.9) && score - best >= 0.3);
  R3.notes.push("score = mean over formats of micro slot F1; beings = notes and rests at (line, measure, onset); control = strongest control licensed on every format");
  R4.notes.push("score = mean over formats of micro claim F1 over pitch, dur, tie, meter, key; per-label F1 and the per-label gates (RULES-V2 A14) in details; `pass` is the per-label verdict, pass_header_rule is the header's micro-margin rule (A4: an exact reader cannot satisfy it)");
  R4.details.rules = { label_f1: LABEL_F1, label_margin: LABEL_MARGIN, min_stratum_claims: MIN_STRATUM_CLAIMS, degenerate_share: DEGENERATE_SHARE, controls: R4_LABEL_CONTROL };
  // ---- R5
  const R5 = (() => {
    const xml = store.musicxml, abc = store.abc;
    const rows = [];
    if (xml && abc) {
      const xmlByGold = new Map(xml.ok.map((p, i) => [p.e.id, i]));
      abc.ok.forEach((p, i) => { const j = xmlByGold.get(p.e.derived_from); if (j != null) rows.push({ ai: i, xi: j, id: p.e.derived_from }); });
    }
    const exporter = split === "test" ? exporterPairs(priors, readFn) : null;
    if (!rows.length) return unmeasured("r5", "R5", split, "no (derived ABC, MusicXML) pairs in split", { details: { prereg_sha256: PREREG_SHA256, rules_v2_sha256: RULES_V2_SHA256, rules_v2_1_sha256: RULES_V21_SHA256, rules_v2_2_sha256: RULES_V22_SHA256, rule_version: RULE_VERSION, exporter_pairs: exporter }, gaps: [...(split !== "test" ? [{ reason: "no_exporter_pairs_in_split (scorewriter-comparison is a TEST source)", count: 1 }] : [])] });
    const claimsFast = (r) => { const idx = new Map(r.beings.map((b) => [b.id, b])); const m = new Map(); for (const rel of r.relations) if (rel.label === "pitch" || rel.label === "dur") { const b = idx.get(rel.end1); if (b) inc(m, `${b.line}|${b.measure}|${b.onset}|${b.kind}|${rel.label}|${rel.end2.replace(/^midi:|^q:/, "")}`); } return m; };
    const agree = (a, b) => { const s = msetStats(a, b); return f1(s.tp, s.nb - s.tp, s.na - s.tp) ?? 0; };
    const only = (m, lab) => new Map([...m].filter(([k]) => k.split("|")[4] === lab));
    const cx = xml.rdReal.map(claimsFast), ca = abc.rdReal.map(claimsFast);
    const caDer = abc.ok.map((p) => claimsFast(readFn(p.text, { system: "abc", priors: derPitch })));
    const caAblDur = abc.rdAblDur.map(claimsFast);
    const dp = derangement(rows.length, mulberry32(SEED + 700));
    const arm = (lab) => {
      const f = (m) => (lab ? only(m, lab) : m);
      return {
        real: rows.map((r) => agree(f(cx[r.xi]), f(ca[r.ai]))),
        deranged_pairs: rows.map((r, i) => agree(f(cx[rows[dp ? dp[i] : i].xi]), f(ca[r.ai]))),
        pitch_deranged_one_side: rows.map((r) => agree(f(cx[r.xi]), f(caDer[r.ai]))),
        ablate_duration_one_side: rows.map((r) => agree(f(cx[r.xi]), f(caAblDur[r.ai]))),
      };
    };
    const A = { combined: arm(null), pitch: arm("pitch"), dur: arm("dur") };
    const judge = (a, names) => judgeControls({ score: mean(a.real), perUnit: a.real }, Object.fromEntries(names.map((n) => [n, { score: mean(a[n]), perUnit: a[n] }])));
    const Jc = judge(A.combined, ["deranged_pairs", "pitch_deranged_one_side"]);                       // the header's pair of controls on the combined claim set
    const Jp = judge(A.pitch, ["deranged_pairs", "pitch_deranged_one_side"]);
    const Jd = judge(A.dur, ["deranged_pairs", "ablate_duration_one_side"]);
    const score = mean(A.combined.real), sp = mean(A.pitch.real), sd = mean(A.dur.real);
    const headerPass = Jc.best ? score >= 0.85 && score - Jc.best.score >= 0.5 : null;
    const M = 0.5, T = R5_DERIVED_AGREEMENT;                                                       // RULES-V2.2 A20: ceiling 1.0 (the derived ABC is generated from the gold) minus a declared 0.02
    const gate = (s, J, names) => ({ agreement: round(s), controls: Object.fromEntries(names.map((n) => [n, { score: J.controls[n], status: J.status[n], margin: round(s - J.controls[n]) }])),
      pass: s >= T && names.every((n) => J.licence[n] && s - J.controls[n] >= M) });
    const gp = gate(sp, Jp, ["deranged_pairs", "pitch_deranged_one_side"]);
    const gd = gate(sd, Jd, ["deranged_pairs"]);                                                      // ablate_duration_one_side is reported, licence-checked, and non-gating for the margin
    const broken = [...Jc.broken.map((n) => `combined:${n}`), ...Jp.broken.map((n) => `pitch:${n}`), ...Jd.broken.map((n) => `dur:${n}`)];
    let pass = (Jc.best == null && Jp.best == null) || rows.length < MIN_UNITS ? null : (gp.pass && gd.pass && score >= T);
    const rung = shape("r5", "R5", split, { n: rows.length, score: round(score), control: Jc.best ? round(Jc.best.score) : null, margin: Jc.best ? round(score - Jc.best.score) : null, pass,
      controls: Jc.controls, notes: ["agreement = F1 between the claim multisets (pitch, dur at slots) of the SUT's reading of the derived ABC and of the natural MusicXML of the same piece; the SUT never sees the gold",
        `RULES-V2 A15 / V2.2 A20: \`pass\` gates the pitch-only and the dur-only agreement (>= ${R5_DERIVED_AGREEMENT}, the derived-pair ceiling 1.0 minus a declared 0.02; margin >= 0.50 over each gating control) as well as the combined agreement; the header's rule (agreement >= 0.85, combined margin) is pass_header_rule (an exact reader fails its margin when half of the claims are durations a pitch control cannot touch, and a reader that shifts every lowercase ABC octave keeps 0.86 pitch agreement and passes its 0.85)`,
        "RULES-V2.2 A21: R5's claim set is pitch and dur at slots; tie, meter and key are NOT part of it, so a reader that drops ties or meters passes R5 by construction. Those labels are gated in R4 (per-label gates); here they are a typed no_gate_possible, never a pass.",
        ...structNote(["abc"])],
      gaps: [...(split !== "test" ? [{ reason: "no_exporter_pairs_in_split (scorewriter-comparison is a TEST source)", count: 1 }] : []), { reason: "unmeasured: natural-natural pairs (OpenScore .mscx is a different notation: MuseScore XML)", count: 1 }, { reason: "unmeasured: lilypond pairs (no event reader)", count: 1 }],
      details: { prereg_sha256: PREREG_SHA256, rules_v2_sha256: RULES_V2_SHA256, rules_v2_1_sha256: RULES_V21_SHA256, rules_v2_2_sha256: RULES_V22_SHA256, rule_version: RULE_VERSION, pass_header_rule: headerPass, licence: Jc.licence, tests: Jc.tests, status: Jc.status, mean_agreement: round(score),
        pitch_only: { ...gp, licence: Jp.licence, tests: Jp.tests, status: Jp.status }, dur_only: { ...gd, ablate_duration_one_side: { score: Jd.controls.ablate_duration_one_side, status: Jd.status.ablate_duration_one_side, margin: round(sd - Jd.controls.ablate_duration_one_side), gating: false }, licence: Jd.licence, tests: Jd.tests, status: Jd.status },
        pitch_only_agreement: { real: round(sp), deranged_pairs: Jp.controls.deranged_pairs, pitch_deranged_one_side: Jp.controls.pitch_deranged_one_side },
        not_gated_labels: { tie: "no_gate_possible: not an R5 claim (gated in R4)", meter: "no_gate_possible: not an R5 claim (gated in R4)", key: "no_gate_possible: not an R5 claim (gated in R4)" }, agreement_threshold: T, exporter_pairs: exporter } });
    return applyJudgement(rung, { "": { broken, underpowered: [...Jc.underpowered, ...Jp.underpowered, ...Jd.underpowered] } });
  })();
  return { r3: R3, r4: R4, r5: R5 };
}

function exporterPairs(priors, readFn = read) {
  const es = (manifest() ?? []).filter((e) => e.source === "scorewriter_comparison" && e.split === "test" && e.role === "positive");
  const byTest = new Map();
  for (const e of es) { const k = e.test; if (!byTest.has(k)) byTest.set(k, []); byTest.get(k).push(e); }
  const rows = []; let skipped = 0;
  const claimsFast = (r) => { const idx = new Map(r.beings.map((b) => [b.id, b])); const m = new Map(); for (const rel of r.relations) if (rel.label === "pitch" || rel.label === "dur") { const b = idx.get(rel.end1); if (b) inc(m, `${b.line}|${b.measure}|${b.onset}|${b.kind}|${rel.label}|${rel.end2.replace(/^midi:|^q:/, "")}`); } return m; };
  const goldClaims = (g) => { const m = new Map(); const gs = goldSlots(g); for (const [k, v] of gs.claims) { const l = labelOfClaim(k); if (l === "pitch" || l === "dur") m.set(k, v); } return m; };
  for (const [test, list] of byTest) {
    const items = [];
    for (const e of list) { const g = loadGoldEvents(e.id); const t = textOf(e); if (!g?.ok || t == null) { skipped++; continue; } items.push({ e, sut: claimsFast(readFn(t, { system: "musicxml", priors })), gold: goldClaims(g) }); }
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      if (items[a].e.exporter === items[b].e.exporter) continue;
      const f = (x, y) => { const s = msetStats(x, y); return f1(s.tp, s.nb - s.tp, s.na - s.tp) ?? 0; };
      rows.push({ test, a: items[a].e.exporter, b: items[b].e.exporter, sut: f(items[a].sut, items[b].sut), gold: f(items[a].gold, items[b].gold) });
    }
  }
  if (!rows.length) return { n_pairs: 0, skipped };
  const byPair = {}; for (const r of rows) { const k = [r.a, r.b].sort().join("~"); (byPair[k] ??= []).push(r); }
  return { n_pairs: rows.length, skipped, mean_sut_agreement: round(mean(rows.map((r) => r.sut))), mean_gold_agreement_ceiling: round(mean(rows.map((r) => r.gold))),
    by_exporter_pair: Object.fromEntries(Object.entries(byPair).map(([k, v]) => [k, { n: v.length, sut: round(mean(v.map((r) => r.sut))), gold: round(mean(v.map((r) => r.gold))) }])) };
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// the card
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
/** Where the one-time TEST run is recorded: a second TEST run is flagged in the result, never silently allowed to look like held-out evidence. */
export const TEST_LEDGER = path.join(RESULTS_DIR, "test-ledger.jsonl");

/**
 * measure({split, limit, rungs}) -> { family, split, limit, pre_registration_digest, priors, rungs: {r0..r5}, notes }.
 * Never throws: a failing rung is {pass:null, gaps:[{reason}]}. `rungs` selects which rungs run (default all six).
 */
export async function measure({ split = "dev", limit = null, rungs: want = ["r0", "r1", "r2", "r3", "r4", "r5"], readFn = read } = {}) {
  const notes = ["music_abc card: MusicXML natural; ABC DERIVED (never natural); LilyPond lexer-level only (R0-R2)"];
  if (split === "test") {
    try {
      fs.mkdirSync(path.dirname(TEST_LEDGER), { recursive: true });
      const prior = fs.existsSync(TEST_LEDGER) ? fs.readFileSync(TEST_LEDGER, "utf8").split("\n").filter(Boolean).length : 0;
      fs.appendFileSync(TEST_LEDGER, JSON.stringify({ at: new Date().toISOString(), split, limit, digest: PREREG_SHA256, rungs: want }) + "\n");
      notes.push(prior === 0 ? "TEST run #1 (the one-time held-out run)" : `TEST run #${prior + 1}: TEST has been run before; this is NOT the one-time held-out evidence`);
    } catch (e) { notes.push("test ledger unwritable: " + e.message); }
  }
  const guard = (id, rung, fn) => { try { return fn(); } catch (err) { return unmeasured(id, rung, split, `rung raised: ${String(err?.message ?? err).slice(0, 160)}`); } };
  const rungs = {};
  if (want.includes("r0")) rungs.r0 = guard("r0", "R0", () => measureR0({ split, limit }));
  let lex = null;
  if (want.includes("r1") || want.includes("r2")) {
    try { lex = measureR1R2({ split, limit }); } catch (err) { const m = `rung raised: ${String(err?.message ?? err).slice(0, 160)}`; lex = { r1: unmeasured("r1", "R1", split, m), r2: unmeasured("r2", "R2", split, m) }; }
    if (want.includes("r1")) rungs.r1 = lex.r1;
    if (want.includes("r2")) rungs.r2 = lex.r2;
  }
  let ev = null;
  if (want.some((r) => ["r3", "r4", "r5"].includes(r))) {
    try { ev = measureR3R4R5({ split, limit, readFn }); } catch (err) { const m = `rung raised: ${String(err?.message ?? err).slice(0, 160)}`; ev = { r3: unmeasured("r3", "R3", split, m), r4: unmeasured("r4", "R4", split, m), r5: unmeasured("r5", "R5", split, m) }; }
    for (const r of ["r3", "r4", "r5"]) if (want.includes(r)) rungs[r] = ev[r];
    // the pre-registered R1 rule includes the causal licence check (computed with R3): a lookahead reader does not pass R1
    if (rungs.r1) {
      const viol = Object.values(ev.r3.details?.formats ?? {}).reduce((a, f) => a + (f.r3?.causal?.violations ?? 0), 0);
      rungs.r1.details.causal_violations_from_r3 = viol;
      if (viol > 0 && rungs.r1.pass === true) { rungs.r1.pass = false; rungs.r1.notes.push(`R1 pass withdrawn: the causal licence check found ${viol} violation(s)`); }
    }
  }
  const pri = PRIORS();
  return { family: FAMILY, split, limit, pre_registration_digest: PREREG_SHA256, prereg_sha256: PREREG_SHA256, rules_v2_sha256: RULES_V2_SHA256, rules_v2_1_sha256: RULES_V21_SHA256, rules_v2_2_sha256: RULES_V22_SHA256, rule_version: RULE_VERSION,
    priors: { standard: pri.standard ? "loaded" : "MISSING " + "notation-music_abc-standard.json", lexicon: pri.lexicon ? "loaded" : "MISSING notation-music_abc-lexicon.json" }, rungs, notes };
}

// ── CLI: node eval/notation-competence/music_abc.mjs --split dev [--limit N]
if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  const a = process.argv.slice(2); const get = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const split = get("--split", "dev"); const limit = get("--limit", null) ? Number(get("--limit", null)) : null;
  if (split === "test" && !a.includes("--card")) { console.error("TEST is run once, by the card: pass --card to confirm"); process.exit(2); }
  const res = await measure({ split, limit });
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const out = path.join(RESULTS_DIR, `music_abc-${split}${limit ? "-n" + limit : ""}.json`);
  fs.writeFileSync(out, JSON.stringify(res) + "\n");
  for (const [k, r] of Object.entries(res.rungs)) console.log(k, `n=${r.n} score=${r.score} control=${r.control} margin=${r.margin} pass=${r.pass}`, JSON.stringify(r.controls), r.gaps.slice(0, 3).map((g) => g.reason).join(" ; "));
  console.log("written", out);
}

// ═══ ADDENDUM (written after the first DEV runs; the pre-registration above is unchanged: see PREREG_SHA256) ════════════════════════
// A1  INSTRUMENT bugs found by the first DEV run and fixed; no matcher, threshold or pass rule changed:
//     (a) the SUT's generic MusicXML class `other` (every element without a class) was collapsed into `note` by the R1 mapping: the
//         adapter's fallback for a <note> without pitch or rest is now `note_other`; (b) the ABC gold lookup used the derived piece's id
//         instead of its source piece's id; (c) the ABC lexeme gold contained abcjs ARTEFACTS: abcjs materialises a voice overlay (&) as an
//         extra voice of invisible rests that carry the SOURCE SPANS of the other voice's notes, so every overlaid bar listed each note again
//         as a `spacer`; the gold script now drops an invisible rest whose text is not x/X/y and de-duplicates (gold/abclex rebuilt, all splits).
//         The ABC `spacer` class scored 0.09 before (c) and 1.0 after: the instrument, not the reader, was wrong.
// A2  The LilyPond ear was developed on DEV against the python-ly lexer (class mapping fixed in scripts/gold_ly_lex.py before the first
//     LilyPond score): rests and durations glued to a digit, octave marks, non-music words, scheme strings. Its first score was R1 0.89;
//     after the changes R1 0.97, R2 0.99. Note names are nederlands only: a file that switches language (\language, \include "deutsch.ly")
//     is heard with `name` instead of `pitch` and says so (gap ly_language_note_names_unread).
// A3  DEV RESULTS vs the PREDICTIONS above (DEV, 2026-10-06; every number is in results/music_abc-dev.json):
//     P-R0  balanced accuracy 1.00 (>= .97 held); shuffled_text .347 (<= .40 held); MEI near-misses refused 12/12 (held); no_train_weights
//           .967: it does NOT tie within .03 (gap .033): the TRAIN prior bought 3.3 points. FAILED narrowly.
//     P-R1  musicxml F1 1.00 (held); abc F1 .9997 (predicted .93-.99: too pessimistic, FAILED as stated); whitespace_ear on abc .50 (predicted
//           <= .15: FAILED: in ABC a whitespace-delimited run is very often exactly one note).
//     P-R2  pass held. R3 musicxml 1.00, abc 1.00 (held); deranged_pairing .30 (predicted <= .10: FAILED: two pieces share many slots,
//           e.g. (line 0, measure 0, onset 0)); ablate_duration .68 (predicted <= .60: FAILED on abc .77, held on musicxml .59).
//     P-R4  F1 1.00 (held); ablate_key_accidentals .87 (predicted <= .70: FAILED). P-R5 agreement 1.00 (held); deranged_pairs .117 (<= .10 FAILED).
//     P-ALL causal violations 0 (held).
// A4  R4 and R5 are `pass: false` ON DEV BY THE PRE-REGISTERED MARGIN RULE although the reader is exact (F1 1.00): the rule demanded a
//     control 0.30 (R4) / 0.50 (R5) below the real arm, and the strongest licensed control keeps most claims intact (ablating the key and
//     accidentals leaves every duration, tie and meter claim right; deranging one side's pitch table leaves every duration claim right).
//     Per II.23 a control that does nearly as well as the real arm marks a WEAK INSTRUMENT, not a good reader: the claim set is dominated by
//     claims the control cannot touch. Reported, not rescued: `pass` stays false; `details.formats.*.r4.pitch_label_f1_under_controls`
//     and `details.pitch_only_agreement` (R5) give the informative margins (pitch label only) for a revised, pre-registered rule next time.
// A5  A TRAIN diagnostic (NOT a card; TRAIN is the lexicon prior's own source, though R3/R4 use no TRAIN count) ran R3/R4/R5 on 300 voice+piano
//     MusicXML (326,070 beings, F1 1.000; claims F1 .9999, 51 duration claims wrong of 733,282) and 107 derived ABC (83,928 beings, F1 1.000):
//     the reader is exact on MuseScore exports, so TEST is where robustness is decided (other exporters, quartets).
// A6  The TEST code path (including cross-exporter pairs) was exercised once on a FAKE corpus (six DEV pieces relabelled as exporters) to
//     check that it runs; no real TEST file was scored.
// A7  WHY LILYPOND R3-R5 STAY UNMEASURED (checked, not assumed): (i) no LilyPond event reader exists in the adapter (it hears LilyPond; it does not
//     resolve \relative octaves, duration inheritance, variables and \include, simultaneous music, repeats, tuplets); (ii) there is no independent
//     event gold: the lilypond engine is not installed, and python-ly 0.9.10's LilyPond->MusicXML export, tried on the 25 TRAIN Mutopia files,
//     failed on 5 and produced zero notes for 14 more (only 6 of 25 gave notes), so it is not a trustworthy gold. Mutopia ships engine-made MIDI
//     per piece (-mids.zip), which could serve at the sounding-note level once repeat unfolding is matched: not built.
// A8  The R1/R2 gold for LilyPond is a LEXER, not a semantic reader: `pitch` includes the reference pitch of \relative and \key (python-ly
//     calls it Note too). Reading names in another language (\language, \include "deutsch.ly") is a typed gap; R1 0.97 / R2 0.99 on DEV is
//     therefore lexer agreement on nederlands-name files plus `name` for the rest.
// A9  CORRECTION of a sentence in the frozen header (not edited there, so the digest stays): the SPLITS block says the TRAIN negatives are "3 of 9
//     hashed repos of ethos/09-source-code". The corpus has 30 repositories with files; sha256("repo:"+name) mod 3 gave TRAIN 8, DEV 8, TEST 14
//     repositories (33, 21 and 53 files, as the later line of that block says). The split rule, not the count, is what was pre-registered.

// ═══ ADDENDUM, SECOND SESSION: REVIEW FIXES (2026-10-06). Written BEFORE this instrument was re-run on DEV, and before any TEST run. The header above is UNCHANGED
// (PREREG_SHA256 is the same value as before); everything below is an addendum, never a header edit. DEV had already been scored by the first version of this
// card, so the rules below were written with DEV numbers in sight (stated in A16); they are pre-registered for TEST, and every DEV number reported under them is
// labelled as such. The header's own rules are still computed and reported as `pass_header_rule` wherever the two differ.
//
// ═══ RULES-V2 (pre-registered; sha256 of this block is stamped as details.rules_v2_sha256; do not edit between the marker lines after the first re-run) ═══
// A10  CONTROLS THAT TIE OR BEAT THE REAL ARM (II.23, II.4). The header said an unlicensed control is excluded and never gates. A control that does as well as, or better
//      than, the real arm (real <= control) means the instrument or the mechanism is broken, and was silently dropped. From now: every rung fails (pass=false,
//      details.instrument_broken lists the control, a note says so). A control with real > control whose sign test does not reject is `underpowered`: listed in
//      details.underpowered_controls, still never gating (the header's rule, unchanged). The one typed exception is a constant-guess control on a DEGENERATE gold
//      label (>= 95% of the gold values of the label equal): `no_gate_possible`, never a pass.
// A11  R0 NEGATIVES AND THE FALSE-MUSIC BOUND. The `other` class is enlarged from 33 to ~900 NATURAL files per split (installed software on this machine read in place:
//      py, c, h, js, minified js, md, rst, txt, html, xml, svg, plist, json, yaml, ini/cfg/toml, numeric tables, css, sh, tex; at most 60 per (split, type), 6 or 25 per
//      package; the split unit is the PACKAGE: sha256("repo:"+package) mod 3; music libraries and music file extensions are excluded by provenance, never by a verdict;
//      scripts/build_negatives.py). The TRAIN lexicon is rebuilt from the natural TRAIN negatives only. NEW GATE: the Wilson 95% upper bound of the false-music rate on the
//      natural negatives must be <= 0.05; a point estimate under 0.05 that cannot be bounded is pass=null, not true. The 12 near-miss music dialects (MEI, MuseScore) stay
//      as before. A separate AUTHORED stress stratum (YAML / key-value text with X: T: K: M: L: lines, header-only ABC, pipe tables, note-letter prose, minified-code
//      look-alikes, and PGN / SMILES / FASTA look-alikes; model-written, labelled authored) is REPORTED with its own Wilson bound, never in the balanced accuracy, never
//      in the lexicon, non-gating. ANCHORS: the standard prior gains `identify.anchors`: a nomination of `abc` is refused unless a tune header (the %abc identification,
//      or X: ... K: per ABC 2.1 2.2.2) AND a tune body line after a K: line (2.2.3) are both present; body-like regexes alone (a chord-shaped `[a,b]` in JavaScript) never
//      identify ABC. Cost, stated: a bare ABC tune fragment without X: ... K: is refused (typed gap anchor_missing:abc); natural ABC is unmeasured anyway.
// A12  ABC LEXEME GOLD. Class is read from the first character of the core (z/Z rest, x/X/y spacer, [ chord), not from abcjs rest.type (a whole-bar rest is typed `whole`,
//      and the first version fell through to `note`); a tie `-` written after a note or chord is part of the lexeme (the SUT's convention) and is cross-checked against
//      music21's separate ABCTie token; bar spans are trimmed of whitespace. gold/abclex rebuilt (the previous files are kept in gold/abclex.pre-review-fix). The dispute
//      counts are reported per class and per source in R1/R2 details.formats.abc.gold_dispute_report, with a gap line whenever any lexeme is dropped.
// A13  DERIVED-ABC STRUCTURE IS NOW INDEPENDENTLY CERTIFIED. scripts/validate_structure.mjs recomputes, with abcjs parseOnly alone, per line: (measure, onset, kind, duration)
//      of every note and rest, tie starts, and the meter and key in force at each measure, and compares them with the gold table. A piece enters the ABC R3/R4/R5
//      headline only if certified on every facet; the others are excluded and counted with their reason. Pitch is certified by the MIDI admission test (unchanged).
// A14  R4 PASS RULE (replaces the header's micro-margin as the gating rule; the header rule stays as pass_header_rule). For each format with >= 10 pieces and for each of the
//      labels pitch, pitch_black (the stratum of pitches that are black keys, i.e. the notes a key signature or an accidental can change; >= 30 gold claims),
//      dur, tie, meter, key (each with >= 10 pieces that carry it): F1 of the label >= 0.90 AND margin >= 0.30 over THAT label's control (units: pieces; the control must
//      be licensed by the sign test). Controls: pitch: deranged_pitch; pitch_black: ablate_key_accidentals; dur: ablate_duration; tie: no_tie_claims (the reader's tie
//      claims removed); meter: constant_meter_4_4 (every measure claims 4/4, a declared blind guess); key: constant_key_C (every measure claims fifths:0). Verdict per format:
//      false if any label fails, any control ties or beats the real arm (A10), or micro F1 < 0.90; null if no label failed but some label cannot be gated; true if every
//      measurable label passed. R4 passes iff every format with >= 10 pieces is true. The pitch-label margin over ablate_key_accidentals CANNOT reach 0.30 for an exact reader
//      (about 82% of pitch claims are untouched by key and accidentals: the control stays at ~0.82 pitch F1), which is why the margin for that control is measured on the
//      pitch_black stratum, the notes it can change; the plain pitch label is gated by deranged_pitch.
// A15  R5 PASS RULE. Agreement is computed per label as well as combined. R5 passes iff: pitch-only agreement >= 0.85 with margin >= 0.50 over deranged_pairs and over
//      pitch_deranged_one_side (both licensed); dur-only agreement >= 0.85 with margin >= 0.50 over deranged_pairs (licensed); combined agreement >= 0.85; no control ties or
//      beats the real arm. ablate_duration_one_side (the ABC side read with every duration forced to the unit) is reported and licence-checked for the dur label but does not
//      gate the margin (most notes in children's songs have the unit length). Fewer than 10 pairs: pass=null. The header's combined-margin rule is pass_header_rule.
// A16  WHAT WAS KNOWN WHEN THIS BLOCK WAS WRITTEN (disclosure): the first DEV run showed R4 and R5 pass=false with an exact reader (A4), pitch-label F1 under ablate_key_accidentals
//      0.82 and under deranged_pitch 0.01, and pitch-only R5 agreement 1.00 with controls 0.05 and 0.01. The thresholds (0.90, 0.85, 0.30, 0.50) are the header's; the new
//      declared constants are DEGENERATE_SHARE 0.95 and MIN_STRATUM_CLAIMS 30. TEST has not been run. Mutation regression (tests/notation-music_abc.test.js): a reader whose tie
//      claims are removed, one with the lowercase ABC octave shifted by one, one with the MusicXML tie claim removed, one with every meter claim set to 4/4, must each FAIL the
//      R4 v2 rule on DEV; if one passes, this block is wrong.
// PREDICTIONS FOR THIS RE-RUN (DEV only): R0 balanced accuracy >= 0.97 with the natural false-music Wilson upper bound <= 0.01 and the authored stress stratum <= 0.05; R1 abc
//      F1 >= 0.99 and the dispute share = 0 (+-0.1%); R4 v2 true or null on DEV (pitch, tie, key pass; `meter` and `dur` may be `fail` or `no_gate_possible` if 4/4 or unit-length
//      notes dominate); R5 v2 pitch-only passes; the four mutants fail.
// ═══ END RULES-V2 ═══

// ═══ RULES-V2.1 (written AFTER the first re-run of RULES-V2 on DEV, which exposed the two defects below; both CHANGES ARE TIGHTENINGS; the sha256 of this block is stamped as details.rules_v2_1_sha256) ═══
// A17  UNMEASURED LABEL = UNPROVEN CLAIM. The first DEV re-run under A14 gave R4 pass=true while the `tie` label was unmeasured (ONE DEV piece carries a tie: 1 gold tie claim in
//      12,141 pitch claims): a reader that never claims a tie would have passed on DEV. A14's verdict is amended: R4 is true only if EVERY label (pitch, pitch_black, dur, tie,
//      meter, key) passes; a label with too few pieces or claims to measure makes the verdict null (typed gap `ungated_labels`), never true. Likewise no_gate_possible. (The first
//      run's file is kept as results/music_abc-dev.rerun1-rules-v2.json.)
// A18  INSTRUMENT DEFECT FOUND BY A10: the R1 control deranged_prior did not touch LilyPond at all (the header lists musicxml and abc only), so on LilyPond it scored exactly the real
//      arm (0.971 = 0.971). The first version dropped it silently as "unlicensed"; the A10 flag fired on the first re-run (`lilypond:deranged_prior tied_or_beaten`, R1 pass=false).
//      Fixed: the roles-deranged prior now also replaces the seven LilyPond note names by seven other letters and the rest names by other words (the same pattern as the ABC
//      pitch letters). No threshold or pass rule changed.
// A19  TIE AND MUTATION EVIDENCE COMES FROM TRAIN, AS AN INSTRUMENT DIAGNOSTIC. DEV has no way to exercise the tie label (A17), so the mutation regression of A16 runs the R3-R5
//      code path on the TRAIN split (OpenScore Lieder; the R3-R5 reader uses no TRAIN count), limit 60 pieces per format. It tests the INSTRUMENT, not the reader, and is never a card
//      result. The TEST card is still run once, by the card.
// ═══ END RULES-V2.1 ═══

// ═══ RULES-V2.2 (written after the TRAIN mutation diagnostic of A19, which showed that RULES-V2's R5 does not detect a reader whose lowercase ABC octave is shifted by one: pitch-only
// agreement 0.856 on TRAIN stays above 0.85. Both changes are TIGHTENINGS; the sha256 of this block is stamped as details.rules_v2_2_sha256) ═══
// A20  R5 on DERIVED pairs: the agreement threshold for the pitch-only, the dur-only and the combined agreement is 0.98, not the header's 0.85. Derivation (P4): the derived ABC is generated
//      from the gold and admitted by an independent engine, so the gold's own agreement across the two representations is 1.0 (the ceiling); the tolerance is the declared 0.02.
//      The header's 0.85 allowed a 15% error rate in the claims; it stays as pass_header_rule. Cross-exporter pairs of scorewriter-comparison (TEST) are NOT gated by this: they are
//      reported with the gold's own cross-exporter agreement as their ceiling, as the header says.
// A21  R5's claims are pitch and dur at slots. tie, meter and key are not R5 claims; a reader that drops them passes R5 by construction. The result carries them as a typed
//      no_gate_possible (details.not_gated_labels), never a pass; they are gated in R4 (A14).
// A22  Mutation regression (A16, run on TRAIN, A19): the four mutants plus a dropped key claim and a constant meter on both sides must FAIL R4; the octave-shifted ABC reader must also
//      FAIL R5; the unmutated reader must pass both on TRAIN. A mutant that passes means the pass rule is broken.
// ═══ END RULES-V2.2 ═══

// A23  DEV RESULTS OF THE RE-RUN (DEV only, 2026-10-06; rule_version v2.2; header digest 0016dd6b..., RULES-V2 4fee2c81..., V2.1 835e4cb9...; every number is in results/music_abc-dev.json; the
//      earlier runs are kept: music_abc-dev.pre-review-fix.json, ...rerun1-rules-v2.json, ...rerun2-rules-v2.1.json). Predictions of RULES-V2 against results:
//      R0  balanced accuracy 1.00 (>= .97 held); natural false-music rate 0 of 899, Wilson 95% upper 0.0043 (<= 0.01 held); authored stress 0 of 60 (rate held; its Wilson upper is 0.060
//          because n = 60: a bound under 0.05 needs n >= 73); near-miss dialects refused 12 of 12; no_train_weights variant 0.967 (the TRAIN prior still buys 3.3 points); pass = true.
//          The same identifier on the pre-fix lexicon fired on 5 of 907 TRAIN negatives (minified JavaScript: abc.chord + abc.tuplet) and on 18 of 18 header-only authored look-alikes.
//      R1  abc F1 0.9997 (>= .99 held); disputed lexemes 0 of 13,921 (held). R1 pass = FALSE, NOT predicted: A10 fired on the first re-run (A18, a no-op LilyPond control); with the control
//          fixed, LilyPond real F1 .971 against deranged_prior .723 gives margin .248 < 0.30. The control touches only pitch and rest names, a minority of LilyPond lexemes, so the
//          header's 0.30 margin cannot be met by an exact LilyPond reader (the A4 pattern). Not rescued: the rule is unchanged; a stratified margin would be a weakening of the header
//          and was NOT added. It needs a decision before TEST.
//      R2  pass = true (macro-F1 .998; LilyPond pitch class .950 is the weakest). R3 pass = true on 142 + 147 pieces (abc 142 of 143: 1 uncertified); causal violations 0.
//      R4  pass = NULL: every label that can be measured passes (pitch, pitch_black, dur, meter, key; margins .53 to 1.0) but `tie` is unmeasured on DEV (1 piece), so by A17 the claim is
//          unproven. pass_header_rule = false, as before. R5  pass = true under the v2.2 rule (pitch-only 1.00, dur-only 1.00, both licensed at margins >= .83); pass_header_rule = false.
//      MUTATION REGRESSION (A19, TRAIN, 60 pieces per format): exact reader passes R4 and R5; dropped ABC ties, dropped MusicXML ties, shifted ABC octave (also R5: pitch agreement .856),
//          constant 4/4 meter and dropped key claims each FAIL R4 on the label they break; the micro F1 the header rule gates on stays above 0.99 for the tie mutants.
//      NOT RUN: TEST. The TEST negatives were built by the same rule and never scored. Disclosure: the review's own census read local files that may sit in TEST packages; the anchor rule
//          comes from the standard's header structure (2.2.2, 2.2.3), not from those files.
