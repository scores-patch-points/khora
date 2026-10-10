// eval/notation-competence/closed_codes.mjs — FAMILY closed_codes: does the khora closed-code reader
// (adapters/notation/closed_codes.js) identify, segment, classify and cross-agree on Morse (ITU-R M.1677-1),
// Braille (UEB grade 1, Unicode cells) and the ICAO spelling alphabet, on HELD-OUT text, against controls built to fail?
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run of measure(). Nothing between the PRE-REGISTRATION markers is tuned after a
// result; a prediction that fails is reported as failed. The sha256 of this block is stamped into every
// result (details.prereg_sha256) and recorded at write time in
// /private/tmp/claude-501/notation/closed_codes/logs/prereg.sha256, so an edit after the fact is visible.
//
// WHAT THIS IS, HONESTLY. The corpus is DERIVED, not natural: public-domain English sentences (the only natural
// part) are ENCODED by an author-written Python encoder (scripts/encode_corpus.py; independent of the JS adapter;
// it reads machine-extracted giver tables, never the priors/ files) and every noise/jitter/decoy transform is
// AUTHORED. No held-out natural Morse/Braille/spelling-alphabet text exists in the open here. A score is therefore
// a statement about reading derived streams, never about reading the wild. The three givers are standards
// (ITU-R M.1677-1; en.wikipedia English Braille/UEB tables citing BANA/ICEB, cell identities from the Unicode
// Character Database; ICAO spelling alphabet via en.wikipedia). The reader's TABLES are the same standard the
// encoder used, so on CLEAN streams table lookup is an identity (the TAUTOLOGY FLOOR, reported, never counted).
// Every pass rule below rests on arms where the answer is NOT a bare table lookup: decoys, timing jitter, run-on
// (unspaced) codes that need a language prior, corrupted tokens that must be REFUSED, context-dependent Braille.
//
// CLAIM
//   (R0) from the prefix alone, by a sequential likelihood-ratio rule over received priors, the reader names the
//        system of a held-out stream (morse | braille | nato) or says "not a closed code", and does so on decoys
//        that merely share glyphs with the codes; it beats an alphabet-only reader and priors deranged to fail.
//   (R1) it hears tokens: letter/word gaps and dit/dah in jittered key-timing logs (adaptive tempo from the prefix);
//        letters in run-on Morse words using a TRAIN-built letter n-gram; lexeme boundaries in Braille (indicators
//        bind forward); word boundaries in concatenated spelling-alphabet words.
//   (R2) it classifies tokens, REFUSING out-of-table tokens as `unassigned` rather than admitting the nearest, and
//        reading Braille cell class in context (a-j after the numeric indicator are digits).
//   (R3,R4) NOT APPLICABLE (typed): a closed code declares no beings and no relations; the beings live in the
//        decoded plaintext, scored on the natural-language card.
//   (R5) blind-read forms of the SAME sentence in different codes decode to the same text more often than forms of
//        different sentences do.
//
// SPLIT BY SOURCE (assigned before any run; manifest.json). train: pride-and-prejudice, moby-dick,
//   origin-of-species, tale-of-two-cities. dev: frankenstein, on-liberty. test: sherlock-holmes, dracula,
//   art-of-war, time-machine, un-udhr-1948. Priors' counts are built from TRAIN only (checked at run time: the
//   priors' train.sources must be disjoint from the split's sources, else pass=false and gap `leak`).
//   Final card = test, ONCE. All development and smoke runs use dev.
//
// STREAMS. A UNIT is one normalised sentence (scripts/cc_norm.py: accent-fold, curly->straight, ; -> , ! -> .).
//   n_units = 100 per measurement, taken round-robin by source in file order (limit overrides downward).
//   Forms: morse_spaced (letters ' ', words ' / '), morse_ws (words 3 spaces), morse_unspaced (word = one run of
//   dots/dashes), keylog_s{0,15,30} ('+ms -ms ...' key-down/up durations, ITU ratios 1:3 / 1:3:7, lognormal jitter
//   sigma 0/.15/.30, tempo log-uniform 40..120 ms per stream, slow drift), morse_spaced_noisy (5% tokens get one
//   symbol edit), braille (UEB g1 cells; word space U+2800 or U+0020), braille_noisy (3% letter cells replaced by an
//   unassigned cell), nato (ICAO words for letters+digits, ' / ' between words, 15% variant spellings),
//   nato_concat (a word's NATO words run together), nato_noisy (5% words corrupted out of lexicon). 360 DECOYS per
//   split (9 kinds x 40: prose, prose_ellipsis_dash, rules, noise_dotdash, binary, hex, dna, unicode_pattern,
//   pseudo_nato), all labelled authored.
//
// THE SYSTEM UNDER TEST (declared parameters, none tuned on dev; adapters/notation/closed_codes.js).
//   Identify: tokens = whitespace runs (Braille: one token per non-space cell). Per system s a token contributes
//   LLR_s = ln[(1-eta) p_s(tok)/u_s(tok) + eta] if the token is in-alphabet, ln(eta) if in-alphabet but invalid
//   (p=0), ln(eta_f) if outside the alphabet; p_s from the giver's inventory weighted by TRAIN counts, u_s the
//   max-entropy null over the system's alphabet. eta=0.05 (declared transmission-error ceiling), eta_f=0.01.
//   Morse takes the larger of a SPACED score (token = one signal; null uniform over dot/dash strings of length
//   1..8, 8 = longest ITU signal) and a RUN score (token = one word; p = forward probability under the TRAIN letter
//   4-gram summed over every segmentation; null = geometric length with TRAIN mean Morse word length). NATO tokens
//   are scored as a run over the lexicon (forward over segmentations). Sequential decision (Wald): after n>=3
//   tokens, verdict = s if LLR_s >= A=ln(99) and s is the unique maximum; "none" if every LLR_s <= -A; else
//   unheard. A=ln((1-beta)/alpha) with alpha=beta=0.01 (declared). Keylog logs are identified by FORMAT only
//   (tokens '[+-]digits', signs alternating) and are NOT scored in R0 (typed gap).
//   Hear (keylog): tempo T = lower median of the previous min(i,24) runs (first run seeds T); classify each run by
//   ratio to T against geometric midpoints of the ITU ratios (sqrt3 for dit|dah and intra|letter, sqrt21 for
//   letter|word); T is never updated from the run being classified.
//   Hear (run-on Morse): beam search (width 64) over letter sequences, score = Witten-Bell-smoothed TRAIN letter
//   4-gram incl. end-of-word; committed at the word gap (so the word, not the sentence, is the causal unit).
//   Hear (Braille): a forward state machine (numeric mode, pending capital/grade-1 indicators, two-cell
//   punctuation, '.'/',' held open until the next cell says digit or not). Hear (NATO runs): lexicon DP.
//
// MATCHERS
//   R0 verdict v(stream) in {morse, braille, nato, none, null=unheard}; correct iff v == gold system (decoys: none).
//        SCORE_R0 = BALANCED accuracy over the four gold classes (morse, braille, nato, none; unheard counts
//        wrong, reported separately). Also: decoy_false_alarm = share of decoys labelled a system; latency = tokens
//        to the first non-null verdict, median over correct closed-code verdicts.
//   R1a  keylog: per gap run, class in {intra, letter, word} vs gold; macro-F1 over the three classes per sigma tier;
//        SCORE = mean over the three tiers. (dit/dah accuracy reported.)
//   R1b  run-on Morse: letter accuracy = 1 - (sum Levenshtein(decoded word, gold word) / sum gold word length),
//        over every word of every unit, word = causal unit.
//   R1c  Braille: F1 of lexeme-start positions per cell (indicators bind forward) vs gold, over braille + braille_noisy.
//   R1d  nato_concat: F1 of NATO-word-start positions vs gold.
//   R2a  morse_spaced_noisy tokens matched to gold by exact span; class in {letter, figure, punctuation, signal,
//        unassigned, wordgap} (observed-token class under the ITU table; a corrupted token that lands on another
//        valid signal is that signal's class); SCORE = macro-F1 over classes with support >= 5.
//   R2b  braille + braille_noisy cells: class in {letter, digit, numeric_indicator, capital_indicator,
//        grade1_indicator, punctuation, space, unassigned}; macro-F1.
//   R2c  nato_noisy words: class in {letter, digit, unassigned, wordgap}; macro-F1.
//   R5   for each unit the blind read() of each form gives plaintext; alnum projection = [A-Z0-9 ] upper-cased,
//        spaces collapsed; agreement(A,B) = 1 - Levenshtein/max length. PRIMARY = mean over the DEGRADED cross-system
//        pairs {keylog_s30|braille, morse_unspaced|braille, morse_spaced_noisy|braille, nato_noisy|braille,
//        keylog_s30|nato, morse_unspaced|nato}; the clean pairs {morse_spaced|braille|nato} are the TAUTOLOGY FLOOR.
//
// CONTROLS, BUILT TO FAIL (II.23), seeds {101,202,303}, strongest seed is the control
//   R0: alphabet_only (an alternative reader that sees character sets only), inventory_deranged (the SAME reader,
//       priors re-dealt: Morse signal set re-drawn per length, Braille cells permuted, NATO words replaced by random
//       pseudo-words of the same lengths), scrambled_tokens (the SAME reader on streams whose characters are
//       permuted within each token), majority (constant most-frequent gold class).
//   R1a: fixed_tempo (T fixed at 80 ms, no adaptation), ratio_deranged (thresholds from ratios dash=2,letter=2,
//       word=4), shuffled_gaps (gap runs permuted within the stream). Reference, NOT a control: oracle_T (true T0).
//   R1b: greedy_longest (longest valid prefix, no language prior), unigram_lm (TRAIN letter frequencies, no context),
//       deranged_lm (n-gram built on letter-permuted text). Dose reference: order 2, 3.
//   R1c: cell_per_token, word_split. R1d: fixed_chunk4, lexicon_deranged.
//   R2a: length_heuristic (<=4 letter, 5 figure, >=6 punctuation, never refuses), deranged_table (signal->class
//       re-dealt), majority. R2b: context_free (no numeric mode), deranged_table, majority. R2c: lexicon_deranged, majority.
//   R5: deranged_pairing (unit i's form A vs unit i+1's form B), table_deranged_read (reader with deranged tables).
//   LICENCE (a control counts only if it can fail and, for perturbations, only if it moves the statistic):
//     alternative-reader controls: licensed iff their own score < 0.999 on the sample (cannot fail otherwise).
//     perturbation controls (inventory_deranged, scrambled_tokens, deranged_lm, deranged_table, lexicon_deranged):
//     licensed iff, over the units, the real reader's evidence statistic for the true answer is significantly
//     lower under the perturbation (exact one-sided sign test, p<0.05): R0 uses the LLR of the gold system; R1b the
//     mean log-probability of the gold word; R2 the coverage of gold tokens by the table.
//     An unlicensed control is REPORTED (controls{}), flagged (details.licence), never used as `control`, never
//     gates the pass. Expected unlicensed: R0 scrambled_tokens on Braille (cell identity unchanged: reading is
//     order-free there) -> flagged script_determined.
//
// PASS RULE (pre-registered; every sub-measure of a rung must pass; pass=null if a rung has no licensed control)
//   sub passes iff ALL of: (a) score >= its declared floor; (b) for EVERY licensed control c: score - c >= delta
//   (delta = 0.05) AND the exact one-sided paired sign test over units (real vs c, ties dropped) has p < 0.05;
//   (c) for R1/R2, the causal check: for sampled prefixes the committed tokens equal the full-run tokens (0
//   violations); (d) no leak. A licensed control that scores within delta of the real arm is REPORTED as
//   `control_matches_real` (instrument or mechanism broken) and fails the sub.
//   Floors (declared): R0 balanced accuracy >= 0.90 AND decoy_false_alarm <= 0.10 AND median latency <= 30 tokens;
//   R1a >= 0.80, R1b >= 0.50, R1c >= 0.95, R1d >= 0.95; R2a,b,c >= 0.90; R5 primary >= 0.80.
//   Rung score = mean of its sub scores; control = mean of each sub's strongest licensed control; margin = difference.
//
// PREDICTIONS (written before the run; each can fail)
//   R0: balanced accuracy 0.95-1.00; braille and nato near 1.00; run-on Morse the weakest (0.70-0.95, latency tens of
//       tokens); prose_ellipsis_dash and noise_dotdash decoys rejected (false alarm < 0.05); alphabet_only ~0.5;
//       inventory_deranged 0.4-0.7; scrambled_tokens 0.5-0.8 on Morse/NATO and UNLICENSED on Braille; majority 0.25.
//   R1a: tiers ~0.97 (sigma 0), ~0.90 (.15), ~0.70 (.30): pooled ~0.85; fixed_tempo ~0.4; ratio_deranged ~0.5.
//   R1b: letter accuracy ~0.65 (0.50-0.80); greedy_longest ~0.25; unigram_lm ~0.35; deranged_lm ~0.25.
//        Dose: order 2 < 3 <= 4.
//   R1c: ~1.00 (cell_per_token ~0.6). R1d: ~1.00 if the lexicon is uniquely decodable (fixed_chunk4 ~0.4).
//   R2: a ~0.97, b ~1.00, c ~0.99; length_heuristic macro-F1 ~0.6 (it never refuses); context_free ~0.8.
//   R5: degraded cross-system agreement ~0.85 (0.7-0.95); deranged_pairing ~0.3; clean pairs 1.00 (tautology floor).
//   Expected FAILURES worth watching: R1b may miss its 0.50 floor; keylog sigma .30 tier may fall below 0.70; the R0
//   latency floor may fail on run-on Morse; any control matching the real arm.
//
// NOT CLAIMED / TYPED GAPS (reported in every rung's gaps[])
//   semaphore and maritime signal flags: channel-bound (visual); in text the flag alphabet IS the spelling alphabet,
//   so text cannot tell them apart; semaphore arm positions exist only as images (public-domain SVGs fetched, no
//   geometry gold derived). Braille grade 2 (contractions), formatting indicators beyond capitals/numeric, Nemeth,
//   music, IPA braille; Morse accented letters other than e, non-ITU signs (! ; _), prosign streams; natural keying
//   timing; natural Morse/Braille text; keylog identification; R3/R4. UEB numeric-mode corners (digit adjacent to
//   hyphen/slash/other punctuation) are excluded from the corpus by a coverage filter, counted in manifest.json.
// ═══ END PRE-REGISTRATION ═══════════════════════════════════════════════════════

// ═══ AMENDMENT 1 (dated 2026-10-06T08:52Z; written BEFORE the first run of the amended instrument) ═════════
// The PRE-REGISTRATION block above is BYTE-UNCHANGED (sha256 74a4e6ac5bcb11ee45fc64ee0a32917e20b4728e2e6ee8ffa37790985fd855d6,
// still stamped as details.prereg_sha256). This amendment is hashed on its own (details.amendment1_sha256) and that hash is
// appended to logs/prereg.sha256 before the amended run. The v1 DEV card (logs/dev_card_v1_registered.json: R0 0.998 vs
// alphabet_only 0.719 'pass'; R1d/R2a/R2c 'pass') is kept verbatim and is SUPERSEDED, never edited. The rules above are not
// weakened: every change below makes a gate stricter or adds one, except A1, which corrects a rule that let a perfect
// control escape gating. Nothing in this amendment was tuned on a result of the amended instrument.
//
// WHY (an independent review of v1, dev data only, found these; all reproduced by the reviewer before this amendment):
//   (a) R0's only licensed alternative reader was alphabet_only (a strawman: no lexicon check, so NATO scores 0 by
//       construction). A 15-25 line baseline with NO priors, NO SPRT, NO LM (Braille-block script test, all-dot/dash alphabet
//       test, share of tokens that parse into the ICAO lexicon, ITU table membership) scores balanced accuracy 0.969
//       (script+lexicon) and 0.9994 (table membership) on the v1 dev streams and decoys, against the reader's 0.998:
//       the registered rule would have called control_matches_real. R0 v1 measured script/lexicon membership.
//   (b) R1d / R2a / R2c were table identities: the gold is a lookup in the same giver table the prior was copied from
//       (a greedy longest-match NATO splitter scores word-start F1 0.9991 vs 1.000; R2a/R2c 'unassigned' is exactly 'not in
//       the table'); the delimiter class (wordgap/space) is trivially perfect and was one macro-F1 class in four.
//   (c) R0 had no gating causality check (a lookahead mutant that overwrote the trace from n>=3 with the final verdict kept
//       pass=true); latency counted the first NON-NULL verdict, not the first CORRECT STABLE one.
//   (d) the licence rule alt-reader 'licensed iff score < 0.999' exempts exactly the controls that match the real arm.
//   (e) licence of two givers: see A6.
//
// A1  LICENCE RULE (replaces the sentence "alternative-reader controls: licensed iff their own score < 0.999 on the sample"):
//     an alternative-reader control is licensed whenever its score is defined. A control scoring >= 0.999 stays licensed and
//     GATES: the real arm cannot beat it by delta, so the sub is reported control_matches_real (and `table_determined`, a typed
//     status, when the control is a table/lexicon reader: that sub is NOT competence evidence). Perturbation-control licence
//     (exact sign test that the evidence statistic moves) is unchanged.
//
// A2  R0 ALTERNATIVE READERS (licensed controls; see only the GIVER tables, no TRAIN counts, no SPRT, no language model).
//     Streams are tokenised by the adapter's tokeniser (whitespace runs; one token per Braille cell); '/' tokens are ignored.
//       script_lexicon_baseline  every token a Braille-block cell (U+2801..U+28FF) -> braille; every token all dots/dashes ->
//                                morse; share of tokens that parse (DP, no probabilities) into the giver's ICAO lexicon
//                                >= tau -> nato; else none.
//       table_membership_baseline  Braille: share of cells in the giver's UEB grade-1 inventory >= tau (else none); Morse:
//                                share of tokens in the giver's ITU table >= tau, OR mean token length > the longest ITU
//                                signal (8, derived from the table) with a '/' word separator present (run-on form); NATO:
//                                lexicon-parse share >= tau; else none.
//     tau is taken from the declared grid {0.5, 0.6, 0.7, 0.8, 0.9}; the control is the STRONGEST tau (a stronger control only
//     makes passing harder); the whole dose curve is reported. Each baseline also has a TOKEN-COUNT-MATCHED variant
//     (..._prefix_matched): it reads only the first k_i tokens of stream i, k_i = the token at which the real reader's verdict
//     became correct and stayed correct (the whole stream if it never did), so it sees no more than the SPRT needed.
//     alphabet_only and majority stay as FLOOR references (licensed, never the binding control). R0 pass requires the
//     table-aware baselines to exist (giver tables handed to the instrument); without them R0 pass is null (strawman only).
//
// A3  R0 CAUSAL GATE AND LATENCY. (c) gains an R0 clause: for the first 10 streams of every form and decoy kind and every
//     k in {1, 2, 3, 5, 8, 13} with k < tokens, the committed verdict AND the log-likelihood ratios after token k of the
//     whole-stream listen() must equal listen() of the prefix that ends at token k (0 violations). Latency becomes the number of
//     tokens to the first CORRECT STABLE verdict (the earliest n from which every later verdict equals the gold system),
//     median over correct closed-code verdicts, floor <= 30 (unchanged); the first-non-null latency and the count of streams
//     whose first non-null verdict differs from the final one are REPORTED, not gated.
//
// A4  HARD DECOY TIER AND HEAVY-NOISE POSITIVES (authored; labelled; corpus/{split}-decoys-hard.jsonl by scripts/build_hard_decoys.py,
//     seed 20261007, 40 per kind, never tuned):
//       H1 braille_outside_inventory  20..60 Braille-block cells, every one outside the UEB grade-1 giver table  (GATED)
//       H2 prose_embeds_nato_words    a real sentence with exactly round(0.20*words) words replaced by giver-named ICAO words  (GATED)
//       H3 dotdash_short_unassigned   8..30 dot/dash tokens of length <= 4 drawn from the 4 strings <= 4 the ITU table does not assign  (GATED)
//       H4 dotdash_short_valid_gibberish  8..30 dot/dash tokens of length <= 4 from the 26 strings the table does assign (Morse of
//          random letters): AMBIGUOUS BY CONSTRUCTION, no table reader can separate it from Morse; REPORTED for the reader and every
//          baseline with its denominator, never gated, never in a balanced-accuracy class (typed gap `ambiguous_by_construction`).
//     R0 gold classes and balanced accuracy are unchanged (morse, braille, nato, none), over the 360 v1 decoys + the 120 gated hard ones.
//     Three heavy-noise POSITIVE forms are generated on the fly, deterministically per unit id (seed 20261007), from the clean forms:
//       morse_heavy   25% of tokens of morse_spaced get one symbol edit (flip / delete / insert)
//       braille_heavy 15% of the non-blank cells of braille become a uniformly drawn 8-dot cell (U+2840..U+28FF)
//       nato_heavy    25% of the words of nato become a random out-of-lexicon capitalised pseudo-word of the same length
//     They are AUTHORED corruption of a valid message: the gold system is the message's. R0 pass floors, added: decoy_false_alarm
//     <= 0.10 pooled over gated decoys AND <= 0.10 on the gated hard tier alone (v1: pooled <= 0.10 only).
//
// A5  R1d / R2a / R2c. New licensed alternative-reader controls built from the GIVER table only:
//       R1d greedy_longest_lexicon   longest lexicon word at every position of the run-on text, no priors, no DP
//       R2a table_lookup             class of the OBSERVED token by exact ITU-table lookup (unassigned if absent; '/' is wordgap)
//       R2c table_lookup             class of the OBSERVED word by exact giver-lexicon lookup (letter | digit | unassigned)
//     The delimiter classes (R2a/R2c wordgap, R2b space) are excluded from the macro-F1 and from the per-unit statistic; the
//     score WITH delimiters is reported beside it. Every sub carries a typed `status`: pass | below_floor | table_determined |
//     control_matches_real | sign_test_not_significant | no_licensed_control. A `table_determined` sub is never competence evidence.
//
// A6  PROVENANCE / LICENCE (rule 11), the actions the instrument side can take without asking: the UN UDHR (UN Terms of Use;
//     public-domain status asserted only by a Wikisource tag) is REMOVED from the TEST split (4 sources remain: sherlock-holmes,
//     dracula, art-of-war, time-machine) before any TEST measurement; the v1 test files are kept under corpus/v1/. ITU-R M.1677-1
//     (c) ITU stays the user-named giver of the Morse table; the PDF stays outside every repository, only the factual table is in
//     the prior, and the letters and figures (36/36) are cross-checked identical to the CC BY-SA 4.0 en.wikipedia table
//     (gold/audit_morse_wikipedia.json), so a permissively licensed giver for the same facts exists. The user's explicit sign-off
//     on the ITU fetch is still OWED (remaining item, not claimed as done).
//
// A7  PREDICTIONS for the amended arms (written before the run; each can fail)
//     R0   real balanced accuracy 0.95-1.00; hard-tier false alarm: H1 <= 0.03, H2 <= 0.10, H3 <= 0.03 (gated tier <= 0.10);
//          H4 (ambiguous) false alarm >= 0.90 for the reader AND for both baselines (reported only). table_membership_baseline
//          (strongest tau) >= 0.97 -> R0 expected FAIL as control_matches_real / table_determined (margin 0.00-0.03); the
//          reader can only pass if it beats that baseline by >= 0.05 on the heavy-noise forms (predicted: it does not).
//          script_lexicon_baseline 0.88-0.97, fooled by H1 and H3 (false alarm >= 0.90 on those kinds). Causal gate: 0 violations.
//          Stable-correct latency median <= 10 tokens and within 3 tokens of the first-non-null latency.
//     R1d  greedy_longest_lexicon >= 0.999 -> control_matches_real, status table_determined (R1d expected FAIL).
//     R2a  table_lookup >= 0.999 -> table_determined (expected FAIL); R2c likewise; R2b unchanged (v1 verdict: sign test not
//          significant, 2 of 100 dev units contain a numeral). With delimiters dropped R2a/R2c scores stay >= 0.95.
//     R1 and R2 rungs: expected pass=false. R5 unchanged (not touched by this amendment).
//
// A8  NOT CHANGED: every v1 floor, delta, seed, matcher, perturbation control, the SPRT parameters, the split by source, the
//     leak check, the TRAIN-only priors, the adapter. Newly typed gap: `ambiguous_by_construction` (H4).
// ═══ END AMENDMENT 1 ════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// BODY (written after the pre-registration block above was fixed and hashed).
// Instrument code only: nothing here changes a registered rule. Result shape for every rung:
//   { id, rung, split, n, applicable, score, control, margin, pass, controls: {name: value}, gaps: [{reason,count}],
//     notes: [], details: {} }
// ════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import * as ADAPTER from "../../adapters/notation/closed_codes.js";
const { SYSTEMS } = ADAPTER;
export const FAMILY = "closed_codes";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CORPUS_ROOT = process.env.CLOSED_CODES_CORPUS || "/private/tmp/claude-501/notation/closed_codes";
export const CONST = Object.freeze({
  n_units: 100, delta: 0.05, alpha_test: 0.05, seeds: [101, 202, 303], licence_perfect: 0.999,
  // floors: v1 values unchanged; r0_false_alarm_hard and the stable-correct latency basis are AMENDMENT 1 (A3, A4)
  floors: { r0_bal: 0.90, r0_false_alarm: 0.10, r0_false_alarm_hard: 0.10, r0_latency: 30, r1a: 0.80, r1b: 0.50, r1c: 0.95, r1d: 0.95, r2: 0.90, r5: 0.80 },
  causal_units: 30, fixed_tempo_ms: 80,
  // AMENDMENT 1 declared parameters (A2, A3, A4)
  taus: [0.5, 0.6, 0.7, 0.8, 0.9], causal_r0_per_form: 10, causal_r0_ks: [1, 2, 3, 5, 8, 13], hard_seed: 20261007,
  heavy: { morse_heavy: { base: "morse_spaced", rate: 0.25 }, braille_heavy: { base: "braille", rate: 0.15 }, nato_heavy: { base: "nato", rate: 0.25 } },
});
export const R0_FORMS = ["morse_spaced", "morse_ws", "morse_unspaced", "braille", "nato", "nato_concat", "morse_spaced_noisy", "braille_noisy", "nato_noisy"];
export const R0_HEAVY = Object.freeze(Object.keys(CONST.heavy));
const systemOfForm = (f) => (f.startsWith("morse") || f.startsWith("keylog") ? "morse" : f.startsWith("braille") ? "braille" : "nato");
// alternative readers built from the GIVER table only whose agreement with the real arm marks a sub `table_determined` (A1, A5)
export const TABLE_DETERMINED = Object.freeze(new Set(["script_lexicon_baseline", "table_membership_baseline", "script_lexicon_prefix_matched", "table_membership_prefix_matched", "greedy_longest_lexicon", "table_lookup"]));

// ── pre-registration stamp ───────────────────────────────────────────────
export function preregSha256() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const a = src.indexOf("// ═══ PRE-REGISTRATION"), b = src.indexOf("// ═══ END PRE-REGISTRATION");
  return crypto.createHash("sha256").update(src.slice(a, b)).digest("hex");
}
/** AMENDMENT 1 is hashed on its own: the original block's hash above must stay 74a4e6ac... */
export function amendment1Sha256() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  const a = src.indexOf("// ═══ AMENDMENT 1"), b = src.indexOf("// ═══ END AMENDMENT 1");
  return crypto.createHash("sha256").update(src.slice(a, b)).digest("hex");
}

// ── numeric helpers ──────────────────────────────────────────────────────
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled(arr, rnd) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function lgamma(z) { const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp); let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += c[j] / ++y; return -tmp + Math.log(2.5066282746310005 * ser / x); }
/** exact one-sided sign test: P(X >= wins | n = wins + losses, p = .5); ties dropped by the caller */
export function signTestP(wins, losses) {
  const n = wins + losses; if (n === 0) return 1;
  let p = 0;
  for (let k = wins; k <= n; k++) p += Math.exp(lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1) + n * Math.log(0.5));
  return Math.min(1, p);
}
export function pairedSign(real, ctl) {
  let w = 0, l = 0, t = 0;
  for (let i = 0; i < real.length; i++) { const d = real[i] - ctl[i]; if (d > 1e-12) w++; else if (d < -1e-12) l++; else t++; }
  return { wins: w, losses: l, ties: t, p: signTestP(w, l) };
}
export function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
export const sim = (a, b) => { const m = Math.max(a.length, b.length, 1); return 1 - lev(a, b) / m; };
export function f1(tp, fp, fn) { const p = tp + fp ? tp / (tp + fp) : 0, r = tp + fn ? tp / (tp + fn) : 0; return p + r ? (2 * p * r) / (p + r) : 0; }
/** macro-F1 over classes with gold support >= minSupport; pairs = [[gold, pred], ...] */
export function macroF1(pairs, minSupport = 5) {
  const classes = new Map();
  for (const [g] of pairs) classes.set(g, (classes.get(g) || 0) + 1);
  const keep = [...classes].filter(([, n]) => n >= minSupport).map(([c]) => c);
  if (!keep.length) return { f1: null, per: {} };
  const per = {};
  for (const c of keep) {
    let tp = 0, fp = 0, fn = 0;
    for (const [g, p] of pairs) { if (g === c && p === c) tp++; else if (g !== c && p === c) fp++; else if (g === c && p !== c) fn++; }
    per[c] = { f1: f1(tp, fp, fn), support: classes.get(c) };
  }
  return { f1: mean(keep.map((c) => per[c].f1)), per };
}

// ── corpus ───────────────────────────────────────────────────────────────
function readJsonl(file) { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
export function sampleBySource(units, n) {
  const by = new Map();
  for (const u of units) { if (!by.has(u.source)) by.set(u.source, []); by.get(u.source).push(u); }
  const lists = [...by.values()]; const out = [];
  for (let i = 0; out.length < Math.min(n, units.length); i++) { let any = false; for (const l of lists) { if (i < l.length && out.length < n) { out.push(l[i]); any = true; } } if (!any) break; }
  return out;
}
export function sampleByKind(items, n) {
  const by = new Map();
  for (const u of items) { if (!by.has(u.kind)) by.set(u.kind, []); by.get(u.kind).push(u); }
  const lists = [...by.values()]; const out = [];
  for (let i = 0; out.length < Math.min(n, items.length); i++) { let any = false; for (const l of lists) { if (i < l.length && out.length < n) { out.push(l[i]); any = true; } } if (!any) break; }
  return out;
}
export function loadCorpus({ split, root = CORPUS_ROOT }) {
  try {
    const units = readJsonl(path.join(root, "corpus", `${split}.jsonl`));
    const easy = readJsonl(path.join(root, "corpus", `${split}-decoys.jsonl`)).map((d) => ({ tier: "easy", gated: true, ...d }));
    // AMENDMENT 1 (A4): the HARD decoy tier, if present. Absent file = typed gap (hard_decoys_missing), never a silent pass.
    let hard = [], hardMissing = false;
    try { hard = readJsonl(path.join(root, "corpus", `${split}-decoys-hard.jsonl`)).map((d) => ({ tier: "hard", gated: true, ...d })); } catch { hardMissing = true; }
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    return { split, units, decoys: [...easy, ...hard], manifest, hardMissing };
  } catch (e) { return { split, units: [], decoys: [], manifest: null, error: String(e && e.message || e) }; }
}

// ── derangements (the SAME reader, priors re-dealt) ───────────────────────
const clone = (o) => JSON.parse(JSON.stringify(o));
export function derangeRaw(raw, kind, seed) {
  const rnd = mulberry32(seed * 7919 + kind.length);
  const r = clone(raw);
  if (kind === "morse_table" && r.morse) {
    const uniq = [...new Set(r.morse.signals.map((s) => s.signal))];
    const map = new Map();
    const byLen = new Map();
    for (const s of uniq) { if (!byLen.has(s.length)) byLen.set(s.length, []); byLen.get(s.length).push(s); }
    const used = new Set();
    for (const [L, list] of byLen) {
      const all = []; for (let v = 0; v < 2 ** L; v++) all.push(v.toString(2).padStart(L, "0").replace(/0/g, ".").replace(/1/g, "-"));
      const pool = shuffled(all, rnd).slice(0, list.length);
      const tgt = shuffled(pool, rnd);
      list.forEach((s, i) => map.set(s, tgt[i]));
    }
    for (const s of r.morse.signals) s.signal = map.get(s.signal);
  } else if (kind === "braille_table" && r.braille) {
    const b = r.braille;
    const cells = new Set([...Object.values(b.letters), ...Object.values(b.digits), ...Object.values(b.indicators), ...Object.values(b.punct_cells).flat(), ...Object.values(b.punct_multi_cell).flat()]);
    const pool = []; for (let i = 1; i < 256; i++) pool.push(String.fromCharCode(0x2800 + i));
    const tgt = shuffled(pool, rnd); const map = new Map(); let k = 0;
    for (const c of [...cells].sort()) map.set(c, tgt[k++]);
    const mp = (c) => map.get(c) ?? c;
    for (const key of Object.keys(b.letters)) b.letters[key] = mp(b.letters[key]);
    for (const key of Object.keys(b.digits)) b.digits[key] = mp(b.digits[key]);
    for (const key of Object.keys(b.indicators)) b.indicators[key] = mp(b.indicators[key]);
    for (const key of Object.keys(b.punct_cells)) b.punct_cells[key] = b.punct_cells[key].map(mp);
    for (const key of Object.keys(b.punct_multi_cell)) b.punct_multi_cell[key] = b.punct_multi_cell[key].map(mp);
    const cc = {}; for (const [c, n] of Object.entries(b.counts.cell_counts)) cc[mp(c)] = (cc[mp(c)] || 0) + n; b.counts.cell_counts = cc;
  } else if (kind === "nato_lexicon" && r.nato) {
    const n = r.nato;
    const pseudo = (len) => { let w = ""; for (let i = 0; i < len; i++) w += "abcdefghijklmnopqrstuvwxyz"[Math.floor(rnd() * 26)]; return w[0].toUpperCase() + w.slice(1); };
    for (const grp of ["letters", "digits", "digits_itu_imo"]) for (const k of Object.keys(n[grp] || {})) n[grp][k] = pseudo(n[grp][k].length);
    for (const grp of ["letter_variants", "digit_variants"]) for (const k of Object.keys(n[grp] || {})) n[grp][k] = n[grp][k].map((w) => pseudo(w.length));
  } else if (kind === "lm" && r.lm) {
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); const P = shuffled(L, rnd); const map = Object.fromEntries(L.map((c, i) => [c, P[i]]));
    const mp = (s) => [...s].map((c) => map[c] ?? c).join("");
    const ctx = {};
    for (const [k, v] of Object.entries(r.lm.contexts)) { const nv = {}; for (const [c, n] of Object.entries(v)) nv[mp(c)] = n; ctx[mp(k)] = nv; }
    r.lm.contexts = ctx;
  } else if (kind === "timing" && r.morse) {
    r.morse.timing_ratios = { dot: 1, dash: 2, intra_letter_gap: 1, letter_gap: 2, word_gap: 4 };
  }
  return r;
}

// ── readers (the interface the instrument consumes) ───────────────────────
export function adapterReader(rawPriors, over = {}) {
  const priors = ADAPTER.buildPriors(rawPriors);
  const R = {
    name: over.name || "adapter",
    listen: (text, ab = {}) => ADAPTER.listen(text, { priors, ablate: ab }),
    ear: (text, o = {}) => ADAPTER.ear(text, { priors, system: o.system, ablate: o.ablate }),
    read: (text, o = {}) => ADAPTER.read(text, { priors, system: o.system, ablate: o.ablate }),
    derange: (kinds, seed) => { let raw = rawPriors; for (const k of [].concat(kinds)) raw = derangeRaw(raw, k, seed); return adapterReader(raw, { name: `deranged:${[].concat(kinds).join("+")}:${seed}` }); },
    stat: {
      runLogProb: (sig) => (priors.morse && priors.lm ? ADAPTER.morseRunLogProb(sig, priors.morse, priors.lm) : null),
    },
    priorsInfo: () => ({ train_sources: rawPriors.morse?.train?.sources ?? null, kinds: Object.keys(rawPriors).filter((k) => rawPriors[k]) }),
    raw: rawPriors,
  };
  return R;
}

// ── alternative readers (controls that are NOT the adapter) ───────────────
export function alphabetOnlyVerdict(text) {
  const chars = [...text].filter((c) => !/\s/.test(c) && c !== "⠀");
  if (!chars.length) return { verdict: null };
  if (chars.every((c) => ".-/·−–".includes(c))) return { verdict: "morse" };
  if (chars.every((c) => c >= "⠁" && c <= "⣿")) return { verdict: "braille" };
  return { verdict: "none" };
}
export function scrambleTokens(text, seed) {
  const rnd = mulberry32(seed);
  return text.replace(/[^\s⠀]+/g, (tok) => shuffled([...tok], rnd).join(""));
}
export function shuffleGaps(text, seed) {
  const rnd = mulberry32(seed);
  const toks = text.split(" ");
  const idx = toks.map((t, i) => (t.startsWith("-") ? i : -1)).filter((i) => i >= 0);
  const vals = shuffled(idx.map((i) => toks[i]), rnd);
  idx.forEach((i, k) => { toks[i] = vals[k]; });
  return toks.join(" ");
}
const lengthClass = (sig) => (sig.length <= 4 ? "letter" : sig.length === 5 ? "figure" : "punctuation");

// ── AMENDMENT 1 (A2, A5): alternative readers that see only the GIVER tables (no TRAIN counts, no SPRT, no LM) ──────────
const flatStrings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(flatStrings) : v && typeof v === "object" ? Object.values(v).flatMap(flatStrings) : []);
/** the tables of the three givers as plain sets/maps; null when a giver is missing */
export function giverTables(raw) {
  if (!raw || !raw.morse || !raw.braille || !raw.nato) return null;
  const rank = { letter: 0, figure: 1, punctuation: 2, signal: 3 };
  const morse = new Set(), signalClass = new Map();
  for (const s of raw.morse.signals) {
    morse.add(s.signal);
    const cur = signalClass.get(s.signal);
    if (cur === undefined || (rank[s.class] ?? 9) < (rank[cur] ?? 9)) signalClass.set(s.signal, s.class);
  }
  const cells = new Set();
  for (const k of ["letters", "digits", "indicators", "punct_cells", "punct_multi_cell"]) for (const c of flatStrings(raw.braille[k])) for (const ch of c) if (ch >= "⠁" && ch <= "⣿") cells.add(ch);
  const lex = new Map();
  const addW = (w, cls) => { const lw = w.toLowerCase(); if (!lex.has(lw)) lex.set(lw, cls); const nh = lw.replace(/-/g, ""); if (!lex.has(nh)) lex.set(nh, cls); };
  for (const g of ["letters", "letter_variants"]) for (const w of flatStrings(raw.nato[g] || {})) addW(w, "letter");
  for (const g of ["digits", "digits_itu_imo", "digit_variants"]) for (const w of flatStrings(raw.nato[g] || {})) addW(w, "digit");
  let lexMin = Infinity, lexMax = 0;
  for (const w of lex.keys()) { lexMin = Math.min(lexMin, w.length); lexMax = Math.max(lexMax, w.length); }
  return { morse, signalClass, cells, lex, lexMin, lexMax, maxMorseLen: Math.max(...[...morse].map((x) => x.length)) };
}
/** does the token parse (DP, no probabilities) into giver lexicon words? */
function lexParses(tok, G) {
  const w = tok.toLowerCase().replace(/-/g, "");
  if (!/^[a-z]+$/.test(w)) return false;
  const ok = new Array(w.length + 1).fill(false); ok[0] = true;
  for (let i = 0; i < w.length; i++) if (ok[i]) for (let l = G.lexMin; l <= G.lexMax && i + l <= w.length; l++) if (G.lex.has(w.slice(i, i + l))) ok[i + l] = true;
  return ok[w.length];
}
/**
 * the registered alternative reader (A2). mode: "script_lexicon" | "table_membership"; tau from the declared grid;
 * limit = read only the first `limit` tokens ('/' counts as a token, like the reader's trace). null = no verdict.
 */
export function baselineVerdict(text, G, { mode, tau, limit = null }) {
  let toks = ADAPTER.tokenize(text);
  if (limit != null) toks = toks.slice(0, limit);
  const body = toks.filter((t) => t.text !== "/");
  if (!body.length) return null;
  if (body.every((t) => t.text.length === 1 && t.text >= "⠁" && t.text <= "⣿")) {
    if (mode === "script_lexicon") return "braille";
    return body.filter((t) => G.cells.has(t.text)).length / body.length >= tau ? "braille" : "none";
  }
  const dd = body.map((t) => ADAPTER.dotdash(t.text));
  if (dd.every((x) => x !== null)) {
    if (mode === "script_lexicon") return "morse";
    const mem = dd.filter((x) => G.morse.has(x)).length / dd.length;
    const meanLen = dd.reduce((a, x) => a + x.length, 0) / dd.length;
    return mem >= tau || (meanLen > G.maxMorseLen && toks.some((t) => t.text === "/")) ? "morse" : "none";
  }
  return body.filter((t) => lexParses(t.text, G)).length / body.length >= tau ? "nato" : "none";
}
/** R1d control: longest lexicon word at every position of every letter run (no priors, no DP). Returns the set of word-start offsets. */
export function greedyLexiconStarts(text, G) {
  const starts = new Set();
  for (const m of text.matchAll(/[A-Za-z-]+/g)) {
    const w = m[0].toLowerCase(); let i = 0;
    while (i < w.length) {
      let took = 0;
      for (let l = Math.min(G.lexMax + 1, w.length - i); l >= 1; l--) if (G.lex.has(w.slice(i, i + l))) { took = l; break; }
      starts.add(m.index + i); i += took || 1;
    }
  }
  return starts;
}
/** R2a control: class of the OBSERVED token by exact ITU-table lookup */
export const tableLookupMorse = (tokText, G) => (tokText === "/" ? "wordgap" : (() => { const dd = ADAPTER.dotdash(tokText); return dd && G.signalClass.has(dd) ? G.signalClass.get(dd) : "unassigned"; })());
/** R2c control: class of the OBSERVED word by exact giver-lexicon lookup */
export const tableLookupNato = (tokText, G) => (tokText === "/" ? "wordgap" : G.lex.get(tokText.toLowerCase()) ?? G.lex.get(tokText.toLowerCase().replace(/-/g, "")) ?? "unassigned");

// ── AMENDMENT 1 (A4): heavy-noise POSITIVE forms, authored, deterministic per unit id ─────────────────────────────────
function hash32(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
export function heavyText(unit, name) {
  const spec = CONST.heavy[name]; const base = spec ? unit.forms?.[spec.base] : null;
  if (typeof base !== "string") return null;
  const rnd = mulberry32(hash32(`${unit.id}|${name}|${CONST.hard_seed}`));
  if (name === "morse_heavy") {
    return base.split(" ").map((tok) => {
      if (!tok || !/^[.\-]+$/.test(tok) || rnd() >= spec.rate) return tok;
      const op = Math.floor(rnd() * 3), pos = Math.floor(rnd() * (tok.length + 1)), i = Math.min(pos, tok.length - 1);
      if (op === 0) return tok.slice(0, i) + (tok[i] === "." ? "-" : ".") + tok.slice(i + 1);
      if (op === 1 && tok.length > 1) return tok.slice(0, i) + tok.slice(i + 1);
      return tok.slice(0, pos) + (rnd() < 0.5 ? "." : "-") + tok.slice(pos);
    }).join(" ");
  }
  if (name === "braille_heavy") return [...base].map((c) => (c >= "⠁" && c <= "⣿" && rnd() < spec.rate ? String.fromCharCode(0x2840 + Math.floor(rnd() * 192)) : c)).join("");
  if (name === "nato_heavy") {
    return base.split(" ").map((w) => {
      if (!w || w === "/" || rnd() >= spec.rate) return w;
      let q = ""; for (let i = 0; i < Math.max(3, w.length); i++) q += "abcdefghijklmnopqrstuvwxyz"[Math.floor(rnd() * 26)];
      return q[0].toUpperCase() + q.slice(1);
    }).join(" ");
  }
  return null;
}

// ── typed gaps shared by every rung ──────────────────────────────────────
const SCOPE_GAPS = [
  { reason: "scope:semaphore_and_maritime_flags_channel_bound_visual (in text the flag alphabet is the spelling alphabet; semaphore arm positions exist only as images)", count: null },
  { reason: "scope:braille_grade2_contractions_formatting_indicators_nemeth_music_ipa_not_in_prior", count: null },
  { reason: "scope:morse_accented_letters_other_than_e_non_ITU_signs_prosign_streams_not_measured", count: null },
  { reason: "scope:no_natural_held_out_morse_braille_or_spelling_alphabet_text_all_streams_derived", count: null },
];
const result = (rung, split, o) => ({ id: `closed_codes.${rung}`, rung, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {}, ...o });
const notApplicable = (rung, split, reason) => result(rung, split, { applicable: false, reason, notes: ["typed: not applicable, never a silent pass"], gaps: [], details: { reason } });
const unmeasured = (rung, split, why) => result(rung, split, { gaps: [{ reason: `unmeasured: ${why}`, count: null }], pass: null });

// ── generic sub-measure verdict ──────────────────────────────────────────
/**
 * arms: { real: perUnit[], controls: { name: {values: perUnit[], licensed: bool, why: str, score: number} } }
 * returns the sub record and whether it passes by the pre-registered rule.
 */
export function judgeSub({ name, score, floor, realUnits, controls, extra = {} }) {
  const C = CONST;
  const rec = { name, score, floor, controls: {}, licensed: [], unlicensed: [], tests: {}, notes: [], ...extra };
  let strongest = null;
  let passCtl = true;
  const matched = [];
  for (const [cn, c] of Object.entries(controls)) {
    rec.controls[cn] = c.score;
    if (!c.licensed) { rec.unlicensed.push({ control: cn, why: c.why }); continue; }
    rec.licensed.push(cn);
    if (strongest === null || c.score > strongest) strongest = c.score;
    const t = pairedSign(realUnits, c.values);
    rec.tests[cn] = { margin: score - c.score, ...t };
    if (score - c.score < C.delta) {
      passCtl = false; matched.push(cn);
      rec.notes.push(`control_matches_real:${cn} (margin ${(score - c.score).toFixed(3)} < delta ${C.delta})`);
      if (TABLE_DETERMINED.has(cn)) rec.notes.push(`table_determined:${cn} (the control reads the giver table only: this sub is not competence evidence)`);
    }
    else if (!(t.p < C.alpha_test)) { passCtl = false; rec.notes.push(`sign_test_not_significant:${cn} (p=${t.p.toFixed(4)})`); }
  }
  rec.control = strongest;
  rec.margin = strongest === null ? null : score - strongest;
  const floorOk = score !== null && score >= floor;
  rec.floor_ok = floorOk;
  rec.pass = strongest === null ? null : floorOk && passCtl;
  // AMENDMENT 1 (A5): typed status. table_determined outranks control_matches_real: it says WHY the control matched.
  rec.status = strongest === null ? "no_licensed_control" : !floorOk ? "below_floor" : matched.some((n) => TABLE_DETERMINED.has(n)) ? "table_determined" : matched.length ? "control_matches_real" : !passCtl ? "sign_test_not_significant" : "pass";
  if (strongest === null) rec.notes.push("no licensed control: pass is null (typed gap)");
  return rec;
}
/** a sub whose table-only alternative reader could not be built cannot pass (typed gap), whatever else holds */
function needGiver(sub, haveGiver, control) {
  if (haveGiver) return;
  if (sub.pass === true) sub.pass = null;
  if (sub.status === "pass") sub.status = "no_giver_for_table_control";
  sub.notes.push(`no giver tables handed to the instrument: the table-only control ${control} could not be built: pass cannot be true`);
}
// AMENDMENT 1 (A1): an alternative reader is licensed whenever its score is defined. A control scoring ~1 is NOT exempt:
// it gates (control_matches_real), because it says the real arm cannot beat what a lookup achieves.
export const licenceAlt = (score) => ({ licensed: score !== null && score !== undefined, why: null, cannot_fail: score !== null && score !== undefined && score >= CONST.licence_perfect });
function licencePerturb(realStat, ctlStat, label) {
  const t = pairedSign(realStat, ctlStat);
  const ok = t.p < CONST.alpha_test;
  return { licensed: ok, why: ok ? null : `${label}: real ${mean(realStat)?.toFixed?.(3)} vs perturbed ${mean(ctlStat)?.toFixed?.(3)} (wins ${t.wins}, losses ${t.losses}, p=${t.p.toFixed(3)}) — the perturbation did not lower the statistic`, test: t };
}

// ── R0 ───────────────────────────────────────────────────────────────────
// streams: the 9 v1 forms + the 3 heavy-noise positive forms (A4) + gated decoys (v1 easy tier + hard tier); the
// ambiguous-by-construction decoys (H4) are kept apart: reported, never gated, in no balanced-accuracy class.
function r0Streams(corpus, n, decoyN, hardN) {
  const units = sampleBySource(corpus.units, n);
  const streams = [], ambiguous = [];
  for (const f of R0_FORMS) for (const u of units) streams.push({ id: `${u.id}|${f}`, form: f, gold: systemOfForm(f), text: u.forms[f], source: u.source, tier: "closed" });
  for (const f of R0_HEAVY) for (const u of units) { const t = heavyText(u, f); if (t != null) streams.push({ id: `${u.id}|${f}`, form: f, gold: systemOfForm(f), text: t, source: u.source, tier: "closed" }); }
  const easy = corpus.decoys.filter((d) => (d.tier ?? "easy") !== "hard"), hard = corpus.decoys.filter((d) => d.tier === "hard");
  const push = (d) => { const o = { id: d.id, form: `decoy:${d.kind}`, kind: d.kind, gold: "none", text: d.text, source: "decoy", tier: d.tier ?? "easy" }; (d.gated === false ? ambiguous : streams).push(o); };
  for (const d of sampleByKind(easy, decoyN)) push(d);
  for (const d of sampleByKind(hard, hardN)) push(d);
  return { streams, ambiguous };
}
const GOLD_CLASSES = ["morse", "braille", "nato", "none"];
function balancedAcc(streams, verdicts) {
  const per = {};
  for (const c of GOLD_CLASSES) { const idx = streams.map((s, i) => (s.gold === c ? i : -1)).filter((i) => i >= 0); per[c] = idx.length ? idx.filter((i) => verdicts[i] === c).length / idx.length : null; }
  const vals = GOLD_CLASSES.map((c) => per[c]).filter((v) => v !== null);
  return { bal: mean(vals), per };
}
/** the earliest trace index from which every later verdict equals gold (null if the final verdict is not gold). A3. */
export function stableCorrect(trace, gold) {
  if (!trace.length || trace[trace.length - 1].verdict !== gold) return null;
  let j = trace.length - 1; while (j > 0 && trace[j - 1].verdict === gold) j--;
  return { j, n: trace[j].n };
}
/** A3: the committed verdict and LLRs after token k of the whole-stream listen() must equal listen() of the prefix ending at token k. */
export function causalR0(reader, streams, real, { perForm = CONST.causal_r0_per_form, ks = CONST.causal_r0_ks } = {}) {
  let checked = 0, violations = 0; const examples = []; const seen = new Map();
  streams.forEach((s, i) => {
    const c = seen.get(s.form) || 0; if (c >= perForm) return; seen.set(s.form, c + 1);
    const toks = ADAPTER.tokenize(s.text);
    for (const k of ks) {
      if (toks.length <= k) continue;
      const e = real[i].trace[k - 1]; if (!e) continue;
      const pre = reader.listen(s.text.slice(0, toks[k - 1].end));
      checked++;
      let bad = (e.verdict ?? null) !== (pre.verdict ?? null);
      if (!bad && e.llr && pre.llr) for (const key of Object.keys(e.llr)) { const a = e.llr[key], b = pre.llr[key]; if (a !== b && !(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)))) bad = true; }
      if (bad) { violations++; if (examples.length < 3) examples.push({ stream: s.id, k, full: e.verdict ?? null, prefix: pre.verdict ?? null }); }
    }
  });
  return { checked, violations, examples };
}
function baselineArms(streams, G, kTok) {
  const out = {};
  for (const mode of ["script_lexicon", "table_membership"]) for (const matched of [false, true]) {
    const name = `${mode}_${matched ? "prefix_matched" : "baseline"}`;
    let best = null; const dose = {};
    for (const tau of CONST.taus) {
      const v = streams.map((s, i) => baselineVerdict(s.text, G, { mode, tau, limit: matched ? kTok[i] : null }));
      const b = balancedAcc(streams, v); dose[tau] = b.bal;
      if (!best || b.bal > best.score) best = { score: b.bal, verdicts: v, tau, per: b.per };
    }
    out[name] = { ...best, mode, dose, values: streams.map((s, i) => (best.verdicts[i] === s.gold ? 1 : 0)), ...licenceAlt(best.score) };
  }
  return out;
}
export function measureR0(ctx) {
  const { corpus, reader, split } = ctx;
  const C = CONST;
  const { streams, ambiguous } = r0Streams(corpus, ctx.n, ctx.decoyN, ctx.hardN ?? ctx.decoyN);
  if (!streams.length) return unmeasured("r0", split, "no streams");
  const G = giverTables(ctx.giver ?? reader.raw);
  const run = (rd, tf = (t) => t, list = streams) => list.map((s) => { const out = rd.listen(tf(s.text)); return { v: out.verdict, first: out.first ?? null, trace: out.trace || [], llr: out.llr }; });
  const real = run(reader);
  const rv = real.map((x) => x.v);
  const { bal, per } = balancedAcc(streams, rv);
  const correct = (arr) => streams.map((s, i) => (arr[i] === s.gold ? 1 : 0));
  const realCorrect = correct(rv);
  const decoyIdx = streams.map((s, i) => (s.gold === "none" ? i : -1)).filter((i) => i >= 0);
  const faOf = (pred) => { const idx = decoyIdx.filter((i) => pred(streams[i])); return idx.length ? { n: idx.length, false_alarms: idx.filter((i) => SYSTEMS.includes(rv[i])).length, rate: idx.filter((i) => SYSTEMS.includes(rv[i])).length / idx.length } : null; };
  const faAll = faOf(() => true), faEasy = faOf((s) => s.tier !== "hard"), faHard = faOf((s) => s.tier === "hard");
  const faKind = Object.fromEntries([...new Set(decoyIdx.map((i) => streams[i].kind))].map((k) => [k, faOf((s) => s.kind === k)]));
  const falseAlarm = faAll ? faAll.rate : null;
  const unheard = rv.filter((v) => v === null).length / rv.length;
  // latency: the first CORRECT STABLE verdict gates (A3); the first non-null verdict and the flips are reported
  const stable = real.map((x, i) => stableCorrect(x.trace, streams[i].gold));
  const closedOk = (i) => streams[i].gold !== "none" && rv[i] === streams[i].gold;
  const latStable = streams.map((s, i) => (closedOk(i) && stable[i] ? stable[i].n : null)).filter((x) => x !== null);
  const latFirst = streams.map((s, i) => (closedOk(i) && real[i].first != null ? real[i].first : null)).filter((x) => x !== null);
  const firstNeFinal = real.filter((x) => { const f = x.trace.find((e) => e.verdict !== null); return f && f.verdict !== x.v; }).length;
  const causal = causalR0(reader, streams, real);
  const curve = {};
  for (const k of [3, 6, 12]) { const vs = real.map((x) => { let v = null; for (const e of x.trace) if (e.n <= k) v = e.verdict; return v; }); const b = balancedAcc(streams, vs); curve[`k${k}`] = b.bal; }  // verdict after the first k tokens (a stream shorter than k keeps its last verdict)
  const byForm = {};
  for (const f of new Set(streams.map((s) => s.form))) { const idx = streams.map((s, i) => (s.form === f ? i : -1)).filter((i) => i >= 0); byForm[f] = { n: idx.length, accuracy: mean(idx.map((i) => realCorrect[i])), unheard: idx.filter((i) => rv[i] === null).length / idx.length, verdicts: Object.fromEntries([...new Set(idx.map((i) => rv[i]))].map((v) => [String(v), idx.filter((i) => rv[i] === v).length])) }; }
  // controls
  const controls = {};
  const alphaV = streams.map((s) => alphabetOnlyVerdict(s.text).verdict);
  const alphaB = balancedAcc(streams, alphaV);
  controls.alphabet_only = { score: alphaB.bal, values: correct(alphaV), ...licenceAlt(alphaB.bal), per: alphaB.per };
  controls.majority = (() => { const v = streams.map(() => "morse"); const b = balancedAcc(streams, v); return { score: b.bal, values: correct(v), ...licenceAlt(b.bal) }; })();
  // AMENDMENT 1 (A2): the table-aware alternative readers. Absent giver tables: typed gap, R0 pass cannot be true.
  const baselines = G ? baselineArms(streams, G, stable.map((x) => (x ? x.j + 1 : null))) : {};
  for (const [k, b] of Object.entries(baselines)) controls[k] = b;
  const llrOf = (x, s) => (x.llr && x.llr[s.gold] !== undefined ? x.llr[s.gold] : null);
  const closedIdx = streams.map((s, i) => (s.gold !== "none" ? i : -1)).filter((i) => i >= 0);
  const bestOf = (mk) => { let best = null; for (const seed of C.seeds) { const arm = mk(seed); if (!best || arm.score > best.score) best = arm; } return best; };
  controls.inventory_deranged = bestOf((seed) => {
    const rd = reader.derange(["morse_table", "braille_table", "nato_lexicon"], seed);
    const out = run(rd); const v = out.map((x) => x.v); const b = balancedAcc(streams, v);
    const lic = licencePerturb(closedIdx.map((i) => llrOf(real[i], streams[i]) ?? realCorrect[i]), closedIdx.map((i) => llrOf(out[i], streams[i]) ?? (v[i] === streams[i].gold ? 1 : 0)), "inventory_deranged LLR(gold system)");
    return { score: b.bal, values: correct(v), ...lic, seed, per: b.per };
  });
  const scrambledArm = (seed) => {
    const out = run(reader, (t) => scrambleTokens(t, seed)); const v = out.map((x) => x.v); const b = balancedAcc(streams, v);
    const perClass = {};
    for (const cls of ["morse", "braille", "nato"]) {
      const idx = streams.map((s, i) => (s.gold === cls ? i : -1)).filter((i) => i >= 0);
      const t = pairedSign(idx.map((i) => llrOf(real[i], streams[i]) ?? 0), idx.map((i) => llrOf(out[i], streams[i]) ?? 0));
      perClass[cls] = { licensed: t.p < C.alpha_test, wins: t.wins, losses: t.losses, ties: t.ties, p: t.p };
    }
    const lic = licencePerturb(closedIdx.map((i) => llrOf(real[i], streams[i]) ?? realCorrect[i]), closedIdx.map((i) => llrOf(out[i], streams[i]) ?? (v[i] === streams[i].gold ? 1 : 0)), "scrambled_tokens LLR(gold system)");
    return { score: b.bal, values: correct(v), ...lic, seed, per: b.per, perClass };
  };
  controls.scrambled_tokens = bestOf(scrambledArm);
  const sub = judgeSub({ name: "r0.identify", score: bal, floor: C.floors.r0_bal, realUnits: realCorrect, controls });
  const falseOk = falseAlarm !== null && falseAlarm <= C.floors.r0_false_alarm;
  const hardOk = faHard === null ? true : faHard.rate <= C.floors.r0_false_alarm_hard;
  const medLat = median(latStable);
  const latOk = medLat !== null && medLat <= C.floors.r0_latency;
  const causalOk = causal.violations === 0;
  let pass = sub.pass;
  if (pass !== null) pass = pass && falseOk && hardOk && latOk && causalOk;
  const notes = [...sub.notes];
  if (!falseOk) notes.push(`decoy_false_alarm ${falseAlarm?.toFixed?.(3)} > floor ${C.floors.r0_false_alarm}`);
  if (!hardOk) notes.push(`hard-tier decoy_false_alarm ${faHard?.rate?.toFixed?.(3)} > floor ${C.floors.r0_false_alarm_hard}`);
  if (!latOk) notes.push(`median stable-correct latency ${medLat} tokens > floor ${C.floors.r0_latency}`);
  if (!causalOk) notes.push(`causality violation: ${causal.violations} of ${causal.checked} prefix checks disagree with the whole-stream trace`);
  if (controls.scrambled_tokens.perClass && !controls.scrambled_tokens.perClass.braille?.licensed) notes.push("script_determined: braille identification is unchanged by within-word cell scrambling (cell identity and order-free evidence) — control not licensed on braille");
  if (!G) { if (pass === true) pass = null; notes.push("no giver tables handed to the instrument: the table-aware alternative readers (A2) could not be built, R0 is licensed only against strawmen: pass is null"); }
  if (corpus.hardMissing) { if (pass === true) pass = null; notes.push("hard_decoys_missing: the hard decoy tier (A4) is absent from this corpus: pass cannot be true"); }
  const controlsOut = Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.score]));
  // ambiguous-by-construction decoys (H4): reported for the reader and for every baseline's chosen tau, never gated
  const ambReport = ambiguous.length ? (() => {
    const rr = ambiguous.map((s) => reader.listen(s.text).verdict);
    const o = { n: ambiguous.length, reader_false_alarm: rr.filter((v) => SYSTEMS.includes(v)).length / ambiguous.length, kinds: [...new Set(ambiguous.map((s) => s.kind))] };
    if (G) for (const [k, b] of Object.entries(baselines)) if (!k.endsWith("prefix_matched")) o[k] = ambiguous.map((s) => baselineVerdict(s.text, G, { mode: b.mode, tau: b.tau })).filter((v) => SYSTEMS.includes(v)).length / ambiguous.length;
    return o;
  })() : null;
  return result("r0", split, {
    n: streams.length, score: bal, control: sub.control, margin: sub.margin, pass, controls: controlsOut,
    gaps: [{ reason: "verdict_unheard", count: rv.filter((v) => v === null).length }, { reason: "keylog_identification_untested (identified by format only, not scored)", count: null },
      ...(ambiguous.length ? [{ reason: "ambiguous_by_construction: H4 dotdash_short_valid_gibberish (Morse of random letters) is indistinguishable from Morse for any table reader: reported with denominators, never gated", count: ambiguous.length }] : []),
      ...SCOPE_GAPS],
    notes,
    details: {
      balanced_accuracy: bal, per_class: per, status: sub.status,
      decoy_false_alarm: falseAlarm, false_alarm: { pooled: faAll, easy: faEasy, hard: faHard, by_kind: faKind }, ambiguous_decoys: ambReport,
      unheard_rate: unheard, median_latency_tokens: medLat, latency_n: latStable.length, latency_basis: "first correct stable verdict (A3)",
      latency_first_nonnull_median: median(latFirst), first_nonnull_ne_final: firstNeFinal, causal,
      prefix_curve_balanced_accuracy: curve, by_form: byForm, sub,
      baseline_dose_curves: Object.fromEntries(Object.entries(baselines).map(([k, b]) => [k, { best_tau: b.tau, dose: b.dose }])),
      giver_tables: G ? { morse_signals: G.morse.size, braille_cells: G.cells.size, lexicon_words: G.lex.size } : null,
      controls_detail: Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, { score: c.score, licensed: c.licensed, cannot_fail: c.cannot_fail ?? false, why: c.why ?? null, seed: c.seed ?? null, tau: c.tau ?? null, per: c.per ?? null, perClass: c.perClass ?? null }])),
    },
  });
}

// ── R1 ───────────────────────────────────────────────────────────────────
function causalCheck(reader, texts, system, ab = {}, take = CONST.causal_units) {
  let checked = 0, violations = 0; const examples = [];
  for (let k = 0; k < Math.min(take, texts.length); k++) {
    const t = texts[k]; const rnd = mulberry32(1000 + k);
    const full = reader.ear(t, { system, ablate: ab }).tokens;
    for (const frac of [0.3, 0.6]) {
      const cut = Math.max(1, Math.floor(t.length * frac) + Math.floor(rnd() * 3));
      const pre = reader.ear(t.slice(0, cut), { system, ablate: ab }).tokens;
      const m = pre.length - 1;                       // the last token's right edge is not seen: not committed
      for (let i = 0; i < m; i++) {
        const a = pre[i], b = full[i];
        if (a.open) continue;
        checked++;
        if (!b || a.start !== b.start || a.end !== b.end || a.class !== b.class || (a.value ?? "") !== (b.value ?? "") || (a.lexemeStart ?? null) !== (b.lexemeStart ?? null)) { violations++; if (examples.length < 3) examples.push({ cut, i, pre: a, full: b }); }
      }
    }
  }
  return { checked, violations, examples };
}
function gapClassF1(units, getPred, getGold) {
  const perUnit = []; const all = [];
  for (const u of units) {
    const pairs = getGold(u).map((g, i) => [g, getPred(u)[i]]);
    all.push(...pairs);
    const m = macroF1(pairs, 1); perUnit.push(m.f1 ?? 0);
  }
  return { perUnit, pooled: macroF1(all, 5), pairs: all.length };
}
export function measureR1(ctx) {
  const { corpus, reader, split } = ctx; const C = CONST;
  const units = sampleBySource(corpus.units, ctx.n);
  if (!units.length) return unmeasured("r1", split, "no units");
  const subs = {}; const allControlsOut = {};
  // R1a keylog
  {
    const tiers = ["keylog_s0", "keylog_s15", "keylog_s30"];
    const gapsOf = (u, f) => u.truth[f].tokens.filter((t) => t.sign === "-").map((t) => t.cls);
    const predGaps = (rd, ab, tf) => (u, f) => { const txt = tf ? tf(u.forms[f], u) : u.forms[f]; const e = rd.ear(txt, { system: "morse", ablate: typeof ab === "function" ? ab(u, f) : ab }); return e.tokens.filter((t) => t.sign === "-").map((t) => t.gap ?? "?"); };
    const evalArm = (pred) => { const per = {}, perUnit = []; for (const f of tiers) { const r = gapClassF1(units.map((u) => ({ u, f })), (x) => pred(x.u, x.f), (x) => gapsOf(x.u, x.f)); per[f] = r.pooled.f1; perUnit.push(r.perUnit); } const sc = mean(Object.values(per)); const pu = units.map((_, i) => mean(perUnit.map((a) => a[i]))); return { score: sc, per, perUnit: pu }; };
    const real = evalArm(predGaps(reader, {}));
    const dd = {};
    const oracle = evalArm((u, f) => predGaps(reader, (uu, ff) => ({ oracleT: uu.truth[ff].T0_ms }))(u, f));
    dd.oracle_T_reference = oracle.score;
    const controls = {};
    const fixed = evalArm(predGaps(reader, { tempo: C.fixed_tempo_ms }));
    controls.fixed_tempo = { score: fixed.score, values: fixed.perUnit, ...licenceAlt(fixed.score), per: fixed.per };
    let best = null;
    for (const seed of C.seeds) { const rd = reader.derange("timing", seed); const a = evalArm(predGaps(rd, {})); if (!best || a.score > best.score) best = { ...a, seed }; if (seed === C.seeds[0]) break; } // timing derangement is deterministic: one seed
    controls.ratio_deranged = { score: best.score, values: best.perUnit, ...licenceAlt(best.score), per: best.per };
    let bestS = null;
    for (const seed of C.seeds) { const a = evalArm(predGaps(reader, {}, (txt, u) => shuffleGaps(txt, seed + u.id.length))); if (!bestS || a.score > bestS.score) bestS = { ...a, seed }; }
    controls.shuffled_gaps = { score: bestS.score, values: bestS.perUnit, ...licenceAlt(bestS.score), per: bestS.per, seed: bestS.seed };
    // dit/dah accuracy (reported)
    let dd_ok = 0, dd_n = 0;
    for (const u of units) for (const f of tiers) { const g = u.truth[f].tokens.filter((t) => t.sign === "+").map((t) => t.cls); const p = reader.ear(u.forms[f], { system: "morse" }).tokens.filter((t) => t.sign === "+").map((t) => t.element); g.forEach((x, i) => { dd_n++; if (p[i] === x) dd_ok++; }); }
    const causal = causalCheck(reader, units.map((u) => u.forms.keylog_s15), "morse");
    subs.r1a = judgeSub({ name: "r1a.keylog_gap_macroF1", score: real.score, floor: C.floors.r1a, realUnits: real.perUnit, controls, extra: { per_tier: real.per, dit_dah_accuracy: dd_n ? dd_ok / dd_n : null, reference_oracle_T: oracle.score, causal } });
    subs.r1a.causal_ok = causal.violations === 0;
  }
  // R1b run-on Morse
  {
    const goldWords = (u) => u.truth.morse_unspaced.map((w) => w.word);
    const predWords = (rd, ab) => (u) => rd.ear(u.forms.morse_unspaced, { system: "morse", ablate: { form: "unspaced", ...ab } }).tokens.filter((t) => t.class !== "wordgap").map((t) => t.value ?? "");
    const evalArm = (pred) => { let e = 0, g = 0; const per = []; for (const u of units) { const gw = goldWords(u), pw = pred(u); let ue = 0, ug = 0; gw.forEach((w, i) => { const d = lev(pw[i] ?? "", w); ue += d; ug += w.length; }); e += ue; g += ug; per.push(ug ? Math.max(0, 1 - ue / ug) : 0); } return { score: g ? Math.max(0, 1 - e / g) : null, perUnit: per }; };
    const real = evalArm(predWords(reader, {}));
    const controls = {};
    const greedy = evalArm(predWords(reader, { unspaced: "greedy" })); controls.greedy_longest = { score: greedy.score, values: greedy.perUnit, ...licenceAlt(greedy.score) };
    const uni = evalArm(predWords(reader, { lmOrder: 1 })); controls.unigram_lm = { score: uni.score, values: uni.perUnit, ...licenceAlt(uni.score) };
    // deranged LM (perturbation): strongest of 3 seeds; licence = mean ln P(run) real vs deranged over units
    let best = null;
    for (const seed of C.seeds) {
      const rd = reader.derange("lm", seed); const a = evalArm(predWords(rd, {}));
      const runStat = (R) => units.map((u) => { const ps = u.truth.morse_unspaced.map((w) => R.stat.runLogProb(w.sigs.join(""))).filter((x) => x !== null && Number.isFinite(x)); return ps.length ? mean(ps) : -1e9; });
      const lic = licencePerturb(runStat(reader), runStat(rd), "deranged_lm mean ln P(gold run)");
      if (!best || a.score > best.score) best = { ...a, ...lic, seed };
    }
    controls.deranged_lm = { score: best.score, values: best.perUnit, licensed: best.licensed, why: best.why, seed: best.seed };
    const dose = {}; for (const o of [2, 3]) dose[`order${o}`] = evalArm(predWords(reader, { lmOrder: o })).score;
    const causal = causalCheck(reader, units.map((u) => u.forms.morse_unspaced), "morse", { form: "unspaced" });
    subs.r1b = judgeSub({ name: "r1b.runon_morse_letter_accuracy", score: real.score, floor: C.floors.r1b, realUnits: real.perUnit, controls, extra: { dose, causal, unit: "word (committed at the word gap)" } });
    subs.r1b.causal_ok = causal.violations === 0;
  }
  // R1c Braille lexemes
  {
    const forms = ["braille", "braille_noisy"];
    const evalArm = (pred) => { let tp = 0, fp = 0, fn = 0; const per = []; for (const u of units) { let a = 0, b = 0, c = 0; for (const f of forms) { const g = u.truth[f].map((t) => !!t.lexeme_start); const p = pred(u, f); g.forEach((x, i) => { const y = !!p[i]; if (x && y) a++; else if (!x && y) b++; else if (x && !y) c++; }); } tp += a; fp += b; fn += c; per.push(f1(a, b, c)); } return { score: f1(tp, fp, fn), perUnit: per }; };
    const earStarts = (u, f) => reader.ear(u.forms[f], { system: "braille" }).tokens.map((t) => t.lexemeStart);
    const real = evalArm(earStarts);
    const controls = {};
    const cpt = evalArm((u, f) => u.truth[f].map(() => true)); controls.cell_per_token = { score: cpt.score, values: cpt.perUnit, ...licenceAlt(cpt.score) };
    const wsplit = evalArm((u, f) => { const s = u.forms[f]; const out = []; for (let i = 0; i < s.length; i++) out.push(i === 0 || s[i - 1] === " " || s[i - 1] === "⠀" || s[i] === " " || s[i] === "⠀"); return out; }); controls.word_split = { score: wsplit.score, values: wsplit.perUnit, ...licenceAlt(wsplit.score) };
    const causal = causalCheck(reader, units.map((u) => u.forms.braille), "braille");
    subs.r1c = judgeSub({ name: "r1c.braille_lexeme_F1", score: real.score, floor: C.floors.r1c, realUnits: real.perUnit, controls, extra: { causal } });
    subs.r1c.causal_ok = causal.violations === 0;
  }
  // R1d NATO concatenated
  {
    const gold = (u) => new Set(u.truth.nato_concat.filter((t) => t.cls !== "wordgap").map((t) => t.s));
    const evalArm = (starts) => { let tp = 0, fp = 0, fn = 0; const per = []; for (const u of units) { const g = gold(u), p = starts(u); let a = 0, b = 0, c = 0; for (const x of p) (g.has(x) ? a++ : b++); for (const x of g) if (!p.has(x)) c++; tp += a; fp += b; fn += c; per.push(f1(a, b, c)); } return { score: f1(tp, fp, fn), perUnit: per }; };
    const startsOf = (rd, ab = {}) => (u) => new Set(rd.ear(u.forms.nato_concat, { system: "nato", ablate: ab }).tokens.filter((t) => t.class !== "wordgap").map((t) => t.start));
    const real = evalArm(startsOf(reader));
    const controls = {};
    const chunk = evalArm(startsOf(reader, { chunk: 4 })); controls.fixed_chunk4 = { score: chunk.score, values: chunk.perUnit, ...licenceAlt(chunk.score) };
    // AMENDMENT 1 (A5): the giver-table-only alternative reader; it gets no priors and no DP
    const Gl = giverTables(ctx.giver ?? reader.raw);
    if (Gl) { const gr = evalArm((u) => greedyLexiconStarts(u.forms.nato_concat, Gl)); controls.greedy_longest_lexicon = { score: gr.score, values: gr.perUnit, ...licenceAlt(gr.score) }; }
    let best = null;
    const cover = (R) => units.map((u) => { const g = u.truth.nato_concat.filter((t) => t.cls !== "wordgap"); const e = R.ear(u.forms.nato_concat, { system: "nato" }).tokens; const at = new Map(e.map((t) => [t.start + ":" + t.end, t])); const ok = g.filter((t) => { const x = at.get(t.s + ":" + t.e); return x && x.class !== "unassigned"; }).length; return g.length ? ok / g.length : 0; });
    for (const seed of C.seeds) { const rd = reader.derange("nato_lexicon", seed); const a = evalArm(startsOf(rd)); const lic = licencePerturb(cover(reader), cover(rd), "lexicon_deranged coverage of gold NATO words"); if (!best || a.score > best.score) best = { ...a, ...lic, seed }; }
    controls.lexicon_deranged = { score: best.score, values: best.perUnit, licensed: best.licensed, why: best.why, seed: best.seed };
    const causal = causalCheck(reader, units.map((u) => u.forms.nato_concat), "nato");
    subs.r1d = judgeSub({ name: "r1d.nato_concat_word_start_F1", score: real.score, floor: C.floors.r1d, realUnits: real.perUnit, controls, extra: { causal } });
    subs.r1d.causal_ok = causal.violations === 0;
    needGiver(subs.r1d, !!Gl, "greedy_longest_lexicon");
  }
  return composeRung("r1", split, units.length, subs, { notes: ["R1 hearing: keylog gaps, run-on Morse letters, Braille lexemes, concatenated NATO words; a licensed control that matches the real arm fails the sub"], extraGaps: [{ reason: "scope:keylog_timing_is_authored_lognormal_jitter_no_natural_operator_keying_data", count: null }, { reason: "scope:clean_spaced_forms_are_a_table_identity_tautology_floor_not_scored", count: null }] });
}

function composeRung(rung, split, n, subs, { notes = [], extraGaps = [], details = {} } = {}) {
  const list = Object.values(subs);
  const scores = list.map((s) => s.score).filter((x) => x !== null);
  const controls = list.map((s) => s.control).filter((x) => x !== null);
  const causalFail = list.some((s) => s.causal_ok === false);
  let pass;
  const passes = list.map((s) => s.pass);
  if (passes.every((p) => p === null)) pass = null;
  else if (passes.some((p) => p === false) || causalFail) pass = false;
  else if (passes.some((p) => p === null)) pass = null;
  else pass = true;
  const nts = [...notes];
  for (const s of list) for (const x of s.notes) nts.push(`${s.name}: ${x}`);
  if (causalFail) nts.push("causality violation: committed tokens of a prefix differ from the full run");
  const ctl = {};
  for (const s of list) for (const [k, v] of Object.entries(s.controls)) ctl[`${s.name}/${k}`] = v;
  const score = mean(scores), control = controls.length === list.length ? mean(controls) : null;
  return result(rung, split, { n, score, control, margin: control === null || score === null ? null : score - control, pass, controls: ctl, gaps: [...extraGaps, ...SCOPE_GAPS], notes: nts, details: { subs, ...details } });
}

// ── R2 ───────────────────────────────────────────────────────────────────
const brailleClass = (role) => (role === "punctuation_in_number" ? "punctuation" : role);
const DELIM = new Set(["wordgap", "space"]);   // AMENDMENT 1 (A5): delimiter classes are trivially perfect; excluded from the macro-F1 and the per-unit statistic
export function measureR2(ctx) {
  const { corpus, reader, split } = ctx; const C = CONST;
  const units = sampleBySource(corpus.units, ctx.n);
  if (!units.length) return unmeasured("r2", split, "no units");
  const G = giverTables(ctx.giver ?? reader.raw);
  const subs = {};
  const align = (pred, gold, pairsOut) => { const m = new Map(pred.map((t) => [t.start + ":" + t.end, t])); return gold.map((g) => { const p = m.get(g.s + ":" + g.e); return [g.cls ?? g.role, p ? p.class : "missing", g]; }); };
  const accOf = (pairs) => (pairs.length ? pairs.filter(([a, b]) => a === b).length / pairs.length : 0);
  const evalForms = (forms, goldOf, rd, ab, tf = (x) => x, system) => {
    const allPairs = []; const withDelim = []; const per = [];
    for (const u of units) { const pairs = []; for (const f of forms) { const e = rd.ear(tf(u.forms[f], f), { system, ablate: ab }); const g = goldOf(u, f); pairs.push(...align(e.tokens, g).map((x) => [x[0], x[1]])); } const kept = pairs.filter(([g]) => !DELIM.has(g)); withDelim.push(...pairs); allPairs.push(...kept); per.push(accOf(kept)); }
    const m = macroF1(allPairs, 5);
    return { score: m.f1, score_with_delimiters: macroF1(withDelim, 5).f1, per: m.per, perUnit: per, pairs: allPairs };
  };
  // an alternative reader given as (observedTokenText -> class) over the observed tokens of a form, scored like evalForms
  const lookupArm = (forms, goldOf, classOf) => {
    const per = [], all = [];
    for (const u of units) { const pairs = []; for (const f of forms) { const m = new Map(); for (const t of ADAPTER.tokenize(u.forms[f])) m.set(t.start + ":" + t.end, classOf(t.text)); for (const g of goldOf(u, f)) if (!DELIM.has(g.cls)) pairs.push([g.cls, m.get(g.s + ":" + g.e) ?? "missing"]); } all.push(...pairs); per.push(accOf(pairs)); }
    return { score: macroF1(all, 5).f1, perUnit: per };
  };
  const covOf = (forms, goldOf, rd, system) => units.map((u) => { let ok = 0, n = 0; for (const f of forms) { const e = rd.ear(u.forms[f], { system }); const g = goldOf(u, f).filter((x) => (x.cls ?? brailleClass(x.role)) !== "unassigned" && (x.cls ?? x.role) !== "wordgap" && x.role !== "space"); const m = new Map(e.tokens.map((t) => [t.start + ":" + t.end, t])); for (const x of g) { n++; const p = m.get(x.s + ":" + x.e); if (p && p.class !== "unassigned") ok++; } } return n ? ok / n : 0; });
  const majorityArm = (pairsReal) => { const cnt = {}; for (const [g] of pairsReal) cnt[g] = (cnt[g] || 0) + 1; const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; return top; };
  // R2a morse
  {
    const forms = ["morse_spaced_noisy"]; const goldOf = (u, f) => u.truth[f].map((t) => ({ s: t.s, e: t.e, cls: t.cls }));
    const real = evalForms(forms, goldOf, reader, {}, undefined, "morse");
    const controls = {};
    // length heuristic: an alternative reader that classifies the dot/dash token by length and never refuses
    const lenArm = lookupArm(forms, goldOf, (txt) => (txt === "/" ? "wordgap" : lengthClass(ADAPTER.dotdash(txt) || txt)));
    controls.length_heuristic = { score: lenArm.score, values: lenArm.perUnit, ...licenceAlt(lenArm.score) };
    if (G) { const tl = lookupArm(forms, goldOf, (txt) => tableLookupMorse(txt, G)); controls.table_lookup = { score: tl.score, values: tl.perUnit, ...licenceAlt(tl.score) }; }
    let best = null;
    for (const seed of C.seeds) { const rd = reader.derange("morse_table", seed); const a = evalForms(forms, goldOf, rd, {}, undefined, "morse"); const lic = licencePerturb(covOf(forms, goldOf, reader, "morse"), covOf(forms, goldOf, rd, "morse"), "deranged_table coverage of gold tokens"); if (!best || a.score > best.score) best = { ...a, ...lic, seed }; }
    controls.deranged_table = { score: best.score, values: best.perUnit, licensed: best.licensed, why: best.why, seed: best.seed };
    const top = majorityArm(real.pairs); const maj = (() => { const per = []; const all = []; for (const u of units) { const pairs = goldOf(u, forms[0]).filter((g) => !DELIM.has(g.cls)).map((g) => [g.cls, top]); all.push(...pairs); per.push(accOf(pairs)); } return { score: macroF1(all, 5).f1, perUnit: per }; })();
    controls.majority = { score: maj.score, values: maj.perUnit, ...licenceAlt(maj.score) };
    const causal = causalCheck(reader, units.map((u) => u.forms.morse_spaced_noisy), "morse");
    const refusal = (() => { const un = real.pairs.filter(([g]) => g === "unassigned"); return { gold_unassigned: un.length, recalled: un.filter(([, p]) => p === "unassigned").length }; })();
    subs.r2a = judgeSub({ name: "r2a.morse_class_macroF1", score: real.score, floor: C.floors.r2, realUnits: real.perUnit, controls, extra: { per_class: real.per, score_with_delimiters: real.score_with_delimiters, refusal, causal } });
    subs.r2a.causal_ok = causal.violations === 0;
    needGiver(subs.r2a, !!G, "table_lookup");
  }
  // R2b braille
  {
    const forms = ["braille", "braille_noisy"]; const goldOf = (u, f) => u.truth[f].map((t) => ({ s: t.s, e: t.e, cls: brailleClass(t.role) }));
    const real = evalForms(forms, goldOf, reader, {}, undefined, "braille");
    const controls = {};
    const cf = evalForms(forms, goldOf, reader, { contextFree: true }, undefined, "braille"); controls.context_free = { score: cf.score, values: cf.perUnit, ...licenceAlt(cf.score) };
    let best = null;
    for (const seed of C.seeds) { const rd = reader.derange("braille_table", seed); const a = evalForms(forms, goldOf, rd, {}, undefined, "braille"); const lic = licencePerturb(covOf(forms, (u, f) => u.truth[f].map((t) => ({ s: t.s, e: t.e, role: t.role })), reader, "braille"), covOf(forms, (u, f) => u.truth[f].map((t) => ({ s: t.s, e: t.e, role: t.role })), rd, "braille"), "deranged_table coverage of gold cells"); if (!best || a.score > best.score) best = { ...a, ...lic, seed }; }
    controls.deranged_table = { score: best.score, values: best.perUnit, licensed: best.licensed, why: best.why, seed: best.seed };
    const top = majorityArm(real.pairs); const maj = (() => { const per = []; const all = []; for (const u of units) { const pairs = []; for (const f of forms) pairs.push(...goldOf(u, f).filter((g) => !DELIM.has(g.cls)).map((g) => [g.cls, top])); all.push(...pairs); per.push(accOf(pairs)); } return { score: macroF1(all, 5).f1, perUnit: per }; })();
    controls.majority = { score: maj.score, values: maj.perUnit, ...licenceAlt(maj.score) };
    const causal = causalCheck(reader, units.map((u) => u.forms.braille_noisy), "braille");
    subs.r2b = judgeSub({ name: "r2b.braille_cell_class_macroF1", score: real.score, floor: C.floors.r2, realUnits: real.perUnit, controls, extra: { per_class: real.per, score_with_delimiters: real.score_with_delimiters, causal } });
    subs.r2b.causal_ok = causal.violations === 0;
  }
  // R2c nato
  {
    const forms = ["nato_noisy"]; const goldOf = (u, f) => u.truth[f].map((t) => ({ s: t.s, e: t.e, cls: t.cls }));
    const real = evalForms(forms, goldOf, reader, {}, undefined, "nato");
    const controls = {};
    if (G) { const tl = lookupArm(forms, goldOf, (txt) => tableLookupNato(txt, G)); controls.table_lookup = { score: tl.score, values: tl.perUnit, ...licenceAlt(tl.score) }; }
    let best = null;
    for (const seed of C.seeds) { const rd = reader.derange("nato_lexicon", seed); const a = evalForms(forms, goldOf, rd, {}, undefined, "nato"); const lic = licencePerturb(covOf(forms, goldOf, reader, "nato"), covOf(forms, goldOf, rd, "nato"), "lexicon_deranged coverage of gold words"); if (!best || a.score > best.score) best = { ...a, ...lic, seed }; }
    controls.lexicon_deranged = { score: best.score, values: best.perUnit, licensed: best.licensed, why: best.why, seed: best.seed };
    const top = majorityArm(real.pairs); const maj = (() => { const per = []; const all = []; for (const u of units) { const pairs = goldOf(u, forms[0]).filter((g) => !DELIM.has(g.cls)).map((g) => [g.cls, top]); all.push(...pairs); per.push(accOf(pairs)); } return { score: macroF1(all, 5).f1, perUnit: per }; })();
    controls.majority = { score: maj.score, values: maj.perUnit, ...licenceAlt(maj.score) };
    const causal = causalCheck(reader, units.map((u) => u.forms.nato_noisy), "nato");
    subs.r2c = judgeSub({ name: "r2c.nato_class_macroF1", score: real.score, floor: C.floors.r2, realUnits: real.perUnit, controls, extra: { per_class: real.per, score_with_delimiters: real.score_with_delimiters, causal } });
    subs.r2c.causal_ok = causal.violations === 0;
    needGiver(subs.r2c, !!G, "table_lookup");
  }
  return composeRung("r2", split, units.length, subs, { notes: ["R2 classifies tokens and REFUSES out-of-table tokens (`unassigned`); Braille classes are read in context; delimiter classes are excluded from the macro-F1 (A5)"], extraGaps: [{ reason: "scope:an_unassigned_token_that_lands_on_another_valid_signal_is_undetectable_and_is_that_signals_class", count: null }, { reason: "scope:signal_-..-_is_X_and_the_multiplication_sign (table non-injective; corpus has no x-sign)", count: null }, { reason: "table_determined_subs_are_not_competence_evidence: r2a and r2c gold is the observed token's own table lookup (A5)", count: null }] });
}

// ── R5 ───────────────────────────────────────────────────────────────────
export const proj = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const CLEAN = ["morse_spaced", "braille", "nato"];
const DEGRADED_PAIRS = [["keylog_s30", "braille"], ["morse_unspaced", "braille"], ["morse_spaced_noisy", "braille"], ["nato_noisy", "braille"], ["keylog_s30", "nato"], ["morse_unspaced", "nato"]];
export function measureR5(ctx) {
  const { corpus, reader, split } = ctx; const C = CONST;
  const units = sampleBySource(corpus.units, ctx.n);
  if (units.length < 2) return unmeasured("r5", split, "fewer than 2 units");
  const forms = [...new Set([...CLEAN, ...DEGRADED_PAIRS.flat()])];
  const readAll = (rd) => units.map((u) => Object.fromEntries(forms.map((f) => [f, proj(rd.read(u.forms[f]).decoded?.text)])));
  const real = readAll(reader);
  // two EMPTY decodes agree on nothing (vacuous): agreement is 0, not 1 (instrument fix, see amendments)
  const agree = (a, b) => (a.length === 0 && b.length === 0 ? 0 : sim(a, b));
  const pairScore = (R, pairs, shift = 0) => units.map((u, i) => mean(pairs.map(([a, b]) => agree(R[i][a], R[(i + shift) % units.length][b]))));
  const realDeg = pairScore(real, DEGRADED_PAIRS), realClean = pairScore(real, [[CLEAN[0], CLEAN[1]], [CLEAN[0], CLEAN[2]], [CLEAN[1], CLEAN[2]]]);
  const score = mean(realDeg);
  const controls = {};
  const dp = pairScore(real, DEGRADED_PAIRS, 1); controls.deranged_pairing = { score: mean(dp), values: dp, ...licenceAlt(mean(dp)) };
  let best = null;
  for (const seed of C.seeds) {
    const rd = reader.derange(["morse_table", "braille_table", "nato_lexicon"], seed); const R = readAll(rd); const v = pairScore(R, DEGRADED_PAIRS);
    // licence: the reader's decode of the gold alnum text must be lower under the deranged tables (similarity to the gold plaintext)
    const stat = (RR) => units.map((u, i) => mean(forms.map((f) => sim(RR[i][f], proj(u.text)))));
    const lic = licencePerturb(stat(real), stat(R), "table_deranged_read similarity to the gold plaintext");
    if (!best || mean(v) > best.score) best = { score: mean(v), values: v, ...lic, seed };
  }
  controls.table_deranged_read = best;
  const sub = judgeSub({ name: "r5.cross_system_agreement", score, floor: C.floors.r5, realUnits: realDeg, controls, extra: { clean_pairs_tautology_floor: mean(realClean), pairs: DEGRADED_PAIRS.map((p) => p.join("|")) } });
  const perPair = Object.fromEntries(DEGRADED_PAIRS.map((p) => [p.join("|"), mean(units.map((u, i) => agree(real[i][p[0]], real[i][p[1]])))]));
  const accVsGold = Object.fromEntries(forms.map((f) => [f, mean(units.map((u, i) => sim(real[i][f], proj(u.text))))]));
  const formOk = (() => { let n = 0, ok = 0; for (const u of units.slice(0, 30)) for (const f of ["morse_spaced", "morse_unspaced", "keylog_s30", "nato", "nato_concat", "braille"]) { const r = reader.read(u.forms[f]); n++; const want = { morse_spaced: "spaced", morse_unspaced: "unspaced", keylog_s30: "keylog", nato: "spaced", nato_concat: "concatenated", braille: "cells" }[f]; if (r.form === want) ok++; } return { n, ok }; })();
  const controlsOut = Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.score]));
  return result("r5", split, {
    n: units.length, score, control: sub.control, margin: sub.margin, pass: sub.pass, controls: controlsOut,
    gaps: [...SCOPE_GAPS, { reason: "scope:clean_pair_agreement_is_a_table_identity_tautology_reported_not_scored", count: null }],
    notes: sub.notes,
    details: { sub, per_pair_agreement: perPair, clean_pairs_tautology_floor: mean(realClean), similarity_to_gold_plaintext_by_form: accVsGold, blind_form_identification: formOk, controls_detail: Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, { score: c.score, licensed: c.licensed, why: c.why ?? null, seed: c.seed ?? null }])) },
  });
}

// ── leak check ───────────────────────────────────────────────────────────
export function leakCheck(corpus, reader) {
  const info = reader.priorsInfo ? reader.priorsInfo() : { train_sources: null };
  const splitSources = new Set(corpus.units.map((u) => u.source));
  const trainSources = info.train_sources || null;
  if (!trainSources) return { ok: null, reason: "priors do not name their train sources" };
  const overlap = trainSources.filter((s) => splitSources.has(s));
  return { ok: overlap.length === 0, overlap, train_sources: trainSources, split_sources: [...splitSources] };
}

// ── the measurement ───────────────────────────────────────────────────────
export function measureWith({ corpus, reader, split = "dev", limit = null, giver = undefined }) {
  const n = limit == null ? CONST.n_units : Math.min(CONST.n_units, limit);
  const easyN = corpus.decoys.filter((d) => (d.tier ?? "easy") !== "hard").length, hardCount = corpus.decoys.filter((d) => d.tier === "hard").length;
  const decoyN = limit == null ? easyN : Math.min(easyN, Math.max(9, limit));
  const hardN = limit == null ? hardCount : Math.min(hardCount, Math.max(8, limit));
  // the giver tables the table-aware alternative readers may see: handed in, or carried by the reader (the adapter reader does)
  const ctx = { corpus, reader, split, n, decoyN, hardN, giver: giver === undefined ? reader.raw : giver };
  const leak = leakCheck(corpus, reader);
  const rungs = {};
  const guard = (rung, fn) => { try { return fn(); } catch (e) { return unmeasured(rung, split, `instrument error: ${String(e && e.stack || e).split("\n").slice(0, 3).join(" | ")}`); } };
  rungs.r0 = guard("r0", () => measureR0(ctx));
  rungs.r1 = guard("r1", () => measureR1(ctx));
  rungs.r2 = guard("r2", () => measureR2(ctx));
  rungs.r3 = notApplicable("r3", split, "a closed code declares no beings; the beings of the decoded plaintext belong to the natural-language card (read() hands the plaintext off)");
  rungs.r4 = notApplicable("r4", split, "a closed code declares no relations or claims; decode-then-read belongs to the natural-language card");
  rungs.r5 = guard("r5", () => measureR5(ctx));
  if (leak.ok === false) for (const r of Object.values(rungs)) { if (r.applicable) { r.pass = false; r.gaps.push({ reason: "leak: priors' train sources overlap this split's sources", count: leak.overlap.length }); r.notes.push("leak check failed: pass forced false"); } }
  const stamp = { prereg_sha256: preregSha256(), amendment1_sha256: amendment1Sha256(), adapter_params: ADAPTER.PARAMS, const: CONST, leak, n_units: n, decoys: decoyN, hard_decoys: hardN, split, corpus: { units: corpus.units.length, decoys: corpus.decoys.length, manifest_units: corpus.manifest?.units ?? null } };
  for (const r of Object.values(rungs)) { r.details.prereg_sha256 = stamp.prereg_sha256; r.details.amendment1_sha256 = stamp.amendment1_sha256; }
  return { family: FAMILY, split, rungs, stamp };
}

/** the real measurement: the real adapter on the real corpus. Never throws for missing data. */
export async function measure({ split = "dev", limit = null, root = CORPUS_ROOT } = {}) {
  const corpus = loadCorpus({ split, root });
  if (!corpus.units.length) {
    const why = `corpus for split "${split}" missing under ${root} (${corpus.error || "empty"})`;
    const rungs = Object.fromEntries(["r0", "r1", "r2", "r5"].map((r) => [r, unmeasured(r, split, why)]));
    rungs.r3 = notApplicable("r3", split, "a closed code declares no beings"); rungs.r4 = notApplicable("r4", split, "a closed code declares no relations");
    return { family: FAMILY, split, rungs: Object.fromEntries(["r0", "r1", "r2", "r3", "r4", "r5"].map((r) => [r, rungs[r]])), stamp: { prereg_sha256: preregSha256(), amendment1_sha256: amendment1Sha256(), error: why } };
  }
  const raw = ADAPTER.loadRawPriors();
  const reader = adapterReader(raw);
  const out = measureWith({ corpus, reader, split, limit, giver: raw });
  const priorsSha = {};
  for (const k of Object.keys(raw)) { const f = path.join(ADAPTER.PRIORS_DIR, `notation-closed_codes-${k}.json`); try { priorsSha[k] = crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16); } catch { priorsSha[k] = null; } }
  out.stamp.priors_sha256_16 = priorsSha;
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const split = (args.find((a) => a.startsWith("--split=")) || "--split=dev").split("=")[1];
  const lim = args.find((a) => a.startsWith("--limit="));
  if (split === "test" && !args.includes("--final")) { console.error("test is spent ONCE: pass --final to run it (final card only)"); process.exit(2); }
  const t0 = Date.now();
  const out = await measure({ split, limit: lim ? Number(lim.split("=")[1]) : null });
  out.stamp.elapsed_ms = Date.now() - t0;
  console.log(JSON.stringify(out, null, 1));
}
