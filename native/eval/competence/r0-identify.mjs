// eval/competence/r0-identify.mjs — RUNG R0, IDENTIFY: does the CAUSAL language
// listener name the language of a stream of HELD-OUT sentences?
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run. Nothing below is tuned after a result. A
// prediction that fails is reported as failed. The sha256 of this leading
// comment block is stamped into every result (details.prereg_sha256), so an
// edit to the claim after the fact is visible to anyone who compares digests.
//
// CLAIM
//   the-fold/language-listener.js::createLanguageListener (fresh instance per
//   trial, NO declared language) hears, from the prefix alone, which language a
//   stream of held-out sentences is in; it says so more often than a listener
//   whose candidate priors have been deranged, and it does not hide behind the
//   typed gap `language_unheard` for half the stream.
//
// WHAT IS FED (causal, S3). Gold = the stem whose dev/test conllu the sentences
//   come from (the "# text =" lines, in file order). A STREAM is a contiguous
//   block of sentences. A fresh listener is created per stream and is given the
//   sentences ONE AT A TIME; the verdict for sentence i is read before sentence
//   i+1 exists to the system (the instrument never hands over the tail). Nothing
//   about the whole stream, the gold, or the other streams reaches the listener.
//
// VERDICT. listen(text) -> { language: stem|null, gap? }.  language===null is a
//   typed gap: gap "language_unheard" (evidence did not clear), or "no letters
//   in a known script" (reported here as `no_script`). A null is never a guess,
//   and in the accuracy it is counted as NOT the stem.
//
// METRICS (all per stem; N = streams x sentences-per-stream, all sentences)
//   d_t            first decision of stream t: the 1-based index of the first
//                  sentence whose verdict is non-null (the cost of being causal:
//                  how many sentences were needed). null = never decided.
//   accuracy       SCORE. Pooled over streams, over each stream's window
//                  [d_t .. end] (the sentences "after the first decision",
//                  inclusive of the deciding one): share whose verdict === stem.
//                  Strict: cmn is NOT correct for cmn-hans nor the reverse
//                  (script variant matters). A stream that never decides is
//                  scored 0 over its whole length.
//   collapsed      the same with cmn == cmn-hans (language-level), reported only.
//   swap_rate      for cmn / cmn-hans only: share of the window's DECIDED
//                  verdicts that are the other variant; null elsewhere.
//   precision      correct / decided inside the window (unheard excluded).
//   unheard        language_unheard sentences / N  (all sentences, incl. pre-
//                  decision). no_script is a separate typed gap with its own rate.
//   confusions     top wrong labels among decided window verdicts, with shares.
//   case_stripped  VIEW (not a control): the same listener on text.toLowerCase().
//                  Priors are keyed by lowercase and the listener does not fold
//                  case, so the as-given arm is the production input and this is
//                  the HEARD-rule view (READING-POLICY 4). Reported with its own
//                  numbers; the pass rule is applied to the as-given arm.
//
// CONTROLS, BUILT TO FAIL (II.23). Each is run on the SAME sentences, windowed by
//   the REAL arm's d_t so that the comparison is sentence-for-sentence.
//   deranged_priors   the SAME listener code, but every candidate prior's forms
//                     are re-dealt at random across the languages that share its
//                     script (each language keeps its table size and its
//                     per-form class counts; the KEYS are shuffled across the
//                     script family; seeded; 3 seeds, the strongest seed is the
//                     control). Mechanism under test: that identification rides
//                     on language-specific vocabulary, not on script, table
//                     size, or the evidence rule's thresholds.
//   scrambled_text    the real listener on text whose letter-clusters (letter +
//                     its marks; digits) are permuted within each sentence (seed
//                     fixed). Same script, same length, same character multiset;
//                     lexical identity destroyed.
//   majority_script   no listening at all: the label is the language with the
//                     largest received prior (provenance.tokens_read) among the
//                     candidates of the sentence's script family — what a reader
//                     knowing only the script and the giver's volumes would say.
//   LICENCE CHECKS (a control counts only if it perturbs what it claims to):
//     deranged_priors  licensed iff the script family has >= 2 candidate priors
//                      (else the derangement is the identity) AND the stem's own
//                      prior, once deranged, attests significantly LESS of the
//                      stream's words than the real prior (per-stream coverage,
//                      exact sign test, alpha) — measured on the text, not read
//                      off the verdict.
//     scrambled_text   licensed iff the stem's own prior attests significantly
//                      LESS of the scrambled stream's words than of the real one
//                      (same test). Expected to be UNlicensed for Han, where
//                      every single character is itself an attested word.
//     majority_script  licensed iff its label is not the stem (a constant that
//                      names the gold language cannot fail on that language).
//   An unlicensed control is still REPORTED (controls{}), flagged in
//   details.licence, never used as `control`, and never gates the pass.
//
// PASS RULE (pre-registered). pass === true iff ALL of
//   (a) language_unheard < 50% of N;
//   (b) for EVERY licensed control c: the real accuracy exceeds c's AND the
//       stream-level exact one-sided sign test on per-stream accuracies (real vs
//       c; ties dropped) has p < alpha=0.05. THE STREAM IS THE UNIT, not the
//       sentence: the listener's view is a running tally, so a stream's
//       sentences are not independent and a sentence-level binomial would be
//       anti-conservative. (It is reported anyway: details.tests.*.p_sentence,
//       a paired exact binomial on sentences, and p_vs_control_rate, the exact
//       one-sample binomial of the real count against the control's rate.)
//       With 8 streams the test needs >= 7 clear wins (or >= 5 with no loss).
//   (c) at least one control is licensed.
//   pass === false iff (a) or (b) fails with licensed controls; pass === null
//   (typed gap) iff no control is licensed or the stem cannot be measured.
//   `control` = the strongest LICENSED control accuracy; margin = score - control.
//
// DEVIATIONS FROM THE TASK TEXT (the closest honest alternative, said up front)
//   1. Significance is a stream-level sign test, not a sentence-level binomial
//      (dependence, above).  The sentence-level numbers are still reported.
//   2. A script family with ONE candidate (Hangul->kor, Devanagari->hin,
//      Hebrew->heb, Greek->ell) has no "other language of the same script": the
//      derangement is the identity and the majority baseline names the gold. The
//      deranged control is therefore UNlicensed there and the scrambled-text
//      control is the control that can fail. The result is flagged
//      `script_determined`: R0 there is mostly script identification, and the
//      real content of the claim is the language_unheard rate and the cost.
//   3. `--limit N` is the total sentences per arm (default 480 = 8 streams x 60).
//   4. The mid-stream switch is MEASURED, not gated (the task asks "within a
//      measured number of sentences"): see SWITCH.
//
// SWITCH (mid-stream). A (lenA=20 sentences of stem A) then (lenB=60 sentences
//   of partner B), fresh listener, 4 trials per pair at spread offsets. Two
//   partners per stem: SAME_FAMILY (same script, the hard case: the listener's
//   per-family tally is undecayed so the new language must out-weigh history) and
//   CROSS_FAMILY (another script). Measured per pair: first_B (first B verdict,
//   1-based within B), settle_B (start of the final unbroken run of B verdicts
//   reaching the end of the B segment; null = never settled), the share of
//   trials that settled, and the listener's own revisions() events (from->to, at)
//   that occur inside B.
//   PARTNERS (declared, not chosen after a result). SAME_FAMILY: eng>deu spa>por
//   por>spa ita>spa fra>ita deu>nld nld>deu swe>deu pol>deu fin>swe tur>fin
//   ind>vie vie>ind rus>ukr ukr>rus arb>fas fas>arb urd>fas cmn-hans>jpn cmn>jpn
//   jpn>cmn; none for kor hin heb ell (their script has a single candidate).
//   CROSS_FAMILY: rus for a Latin-script stem, eng for every other stem.
//
// PARAMETERS (declared; every bare integer is PROVISIONAL, P4 — chosen for run
//   time, to be replaced by a derived value once there is a material reason)
//   ALPHA 0.05 and UNHEARD_MAX 0.5 are the task's.  STREAMS 8 (the smallest that
//   lets a sign test reach p<0.05 with a loss to spare), PER_STREAM 60, SEEDS
//   [11,23,37], SCRAMBLE_SEED 101, SWITCH {lenA 20, lenB 60, trials 4}.
//
// PREDICTIONS (my guesses before running; failures are reported as failures)
//   P1  pass===true on dev for eng, spa, arb, cmn-hans, kor, tur.
//   P2  accuracy: eng >= .85, spa >= .85, arb >= .70, cmn-hans (strict) >= .60 with
//       collapsed >= .90 and swap_rate > 0, kor >= .80, tur >= .60.
//   P3  unheard < .25 for eng, spa, arb, cmn-hans; < .50 for kor, tur.
//   P4  the deranged control is licensed and loses (p<.05) for eng, spa, arb,
//       cmn-hans, tur; it is UNlicensed for kor (one candidate).
//   P5  majority_script scores 0 on eng, arb, cmn-hans, tur (labels spa / fas /
//       jpn) and 1 on spa and kor, where it is unlicensed.
//   P6  scrambled_text is licensed everywhere except cmn-hans (Han).
//   P7  median first decision <= 3 sentences on every stem.
//   P8  case_stripped accuracy >= as-given accuracy on the Latin stems (the
//       listener does not fold case; capitalised words are unattested).
//   P9  SWITCH: same-family median settle_B >= lenA/2 (history-bound) or never;
//       cross-family median settle_B <= 3 with ZERO revisions() events (a change
//       of script is a change of family view, not a revision).
//
// CAVEATS FIXED IN ADVANCE. Single-language streams only (no code-switching
//   inside a sentence); no out-of-inventory language (a language with no prior
//   should come out as a gap — NOT measured here, a gap in this instrument);
//   UD sentence order is document order, so a stream is one or two documents.
// ═══ END PREREGISTRATION ═══════════════════════════════════════════════════════
// ---- END PREREGISTRATION ----
import fs from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLanguageListener } from "../../the-fold/language-listener.js";
import { availableStems, grammarFor } from "../../the-fold/language-grammar.js";
import { makeEar } from "../../adapters/text/ear.js";
import {
  conlluPath, readConllu, mulberry32, shuffled, binomUpperTail, signTest, minDiscordantFor,
  parseArgs, writeResult, headerDigest,
} from "./lib.mjs";

// ═══ AMENDMENT A1 — written 2026-10-05 AFTER the first DEV run of all 25 stems and BEFORE the first run of anything below ═══
// REPORTED ONLY. It changes no `pass`, no threshold and no v1 number; the v1 pre-registration above (digest
// details.prereg_sha256) stands as run. This block has its own digest (details.prereg_amendment_a1_sha256).
//
// WHAT DEV RUN 1 SHOWED (stated so the motivation is visible, not hidden)
//   · v1 pass: 19 true, 6 false. Every listener verdict is >= .975 on the dev streams; the six fails are all a CONTROL
//     doing as well as the real arm: scrambled_text on Han (cmn .988, cmn-hans .988, jpn .998: scrambling characters keeps
//     the character inventory, which is what the listener hears) and on one-candidate scripts (kor .994, heb .985); and
//     deranged_priors on the two stems whose prior is the BIGGEST of their script family (fas 1.000, jpn .992), plus
//     a lottery on 3-language families (rus .765, cmn-hans seeds .04/.83/.08).
//   · HYPOTHESIS H1: the deranged control names a language by its TABLE SIZE (a bigger table attests more of any text),
//     not by vocabulary; and one seed is an all-or-nothing lottery (one slot wins every sentence).
// WHAT A1 ADDS (one arm, one number)
//   deranged_equalised  the same derangement, but every language in a script family is first cut to the family's SMALLEST
//                       table (its first m class-count entries; the keys are re-dealt from the family's full key pool),
//                       so no slot has more words than another. 4 seeds (11, 23, 37, 53), each its own fresh listener per
//                       stream; the per-stream control accuracy is the MEAN over the seeds (the lottery averaged out).
//                       Reported: details.deranged_equalised { accuracy, per_seed, per_stream, wins, losses, ties,
//                       p_stream (exact sign test, stream unit, as v1), beats, table_size } and
//                       details.pass_deranged_equalised_only (unheard < 50% AND real beats it at alpha; null for a
//                       one-candidate script). Also details.family.table_sizes and size_rank (1 = largest).
// PREDICTIONS A1 (before running; failures are reported as failures)
//   A1-1  H1: with sizes equalised the deranged control falls to the chance of its family — mean accuracy <= 2/k
//         (chance 1/k with a factor-2 allowance; the 2 is PROVISIONAL) — on every multi-candidate stem; in particular
//         fas and jpn fall from ~1.0 to <= .67 and real beats it with p < .05.
//   A1-2  pass_deranged_equalised_only === true on every multi-candidate stem whose real accuracy >= .95.
//   A1-3  H1 is FALSE (and the real arm cannot be separated from a lottery on that stem) wherever the equalised
//         control stays above 2/k.
// IF H1 HOLDS the recommended v2 pass rule (to be pre-registered before any TEST run, NOT applied here) replaces
//   deranged_priors by deranged_equalised and licenses scrambled_text only when the scramble removes more of the stem's
//   own-prior coverage than separates the stem from its best rival (so it cannot "fail" on Han).
// ═══ END AMENDMENT A1 ═══════════════════════════════════════════════════════════════════════════════════════════════════


// ═══ AMENDMENT A2 — v2 PASS RULE — written 2026-10-06, BEFORE the first run of anything below ═══════════════════════════
// STATUS. A2 SUPERSEDES the v1 PASS RULE, v1 CONTROLS and v1 LICENCES above for every card written from this file after this
//   date (details.rule_version === "v2/A2"). It STRENGTHENS the rule; it relaxes nothing. The v1 header (digest
//   details.prereg_sha256, unchanged since the first dev run) and amendment A1 (details.prereg_amendment_a1_sha256) are kept as
//   they were. The v1 rule is still computed, on the v2 arms, and reported as details.pass_v1 / details.v1 (REPORTED ONLY, it
//   gates nothing). This block has its own digest, details.prereg_amendment_a2_sha256.
//   Every card /private/tmp/claude-501/competence/r0-*-dev.json written before this amendment (2026-10-05, 12:46-16:03) came
//   from an unpinned prior inventory and the v1 rule, and is DISCARDED (moved to _r0_pre_v2/); none of it is evidence here.
// WHY (a reviewer ran the v1 instrument and found five faults; the RULE was wrong, not only the listener)
//   F1 script-determined stems: for one-candidate scripts (kor, heb, ell, ...) and for Han (character inventory tells
//      simplified from traditional, kana tells jpn) the gold is derivable from the input alone. v1 reported that as
//      "pass=false, mechanism broken" because the scramble control (which keeps the character inventory) scored as well as the
//      real arm (kor .994, cmn-hans .9875). The scramble licence only checked that coverage drops, not that the VERDICT can move.
//   F2 the candidate inventory was read live from priors/ (37 Latin candidates now, lzh in Han) and was neither declared nor
//      pinned: the TEST card could silently differ in difficulty from the dev card.
//   F3 the gating deranged control was size-confounded (it names the family's biggest table every sentence: fas/jpn ~1.0) and the
//      controls were constants (eng: deranged = scrambled = majority = 0, below the 1/37 chance level).
//   F4 no absolute floor: with controls near 0 a listener right on a few sentences per stream passes (a mutant with 45% silence,
//      25% wrong labels and 30% right passed with 8 wins, 0 losses).
//   F5 gate (a) was dodgeable: only the literal gap "language_unheard" counted as silence; a listener answering "no letters in
//      a known script" for 80% of sentences that DO have letters passed with unheard_rate 0.
// V2 DEFINITIONS (all in force together)
//   D1 verdict accounting (F5). A null verdict is a legitimate `no_script` iff the instrument's own replica familyOf(text fed)
//      is null. EVERY OTHER null is SILENT, whatever gap string the listener gave. silent_rate = silent / N_evidence, where
//      N_evidence = the sentences that have a letter in a known script. A listener that says "no letters" about a sentence that
//      has them is additionally reported as gap `gap_misreport`. Gate G1: silent_rate < UNHEARD_MAX (0.5).
//   D2 pinned inventory (F2). eval/competence/r0-inventory.json declares, per script family, the candidate stems, the sha256 of
//      each candidate's prior files (pos, frame, proclitics, enclitics), SAME_FAMILY (v1's map plus lzh>cmn, nothing else), the
//      foreign partners of every stem, and the out-of-inventory (OOV) UDHR languages. Its own sha256 is stamped in
//      details.inventory.pin_sha256. measure() REFUSES (pass:null, typed gap `inventory_mismatch`, nothing run) when the live
//      candidate set of the stem's family, of any foreign partner's family, or the content digest of any of those priors, differs
//      from the pin. Re-pinning is a deliberate act (`--print-inventory`) that needs its own dated amendment before a TEST run.
//      PINNED CANDIDATES (53): Latin 37 {afr cat ces cym dan deu eng est eus fin fra gle glg hrv hun hye ind ita kat lav lit mlt nld
//      nob pol por ron slk slv spa srp swe tam tel tur vie wol}; Arabic 4 {arb fas uig urd}; Cyrillic 3 {bul rus ukr}; Han 4 {cmn
//      cmn-hans jpn lzh}; Devanagari 2 {hin mar}; Greek {ell}; Hebrew {heb}; Hangul {kor}. (hye, kat, tam, tel are filed under
//      Latin by the listener's own prior-script sampler because their scripts are not in its table: a finding, left as it is.)
//   D3 controls (F3). GATING, each must be beaten if licensed:
//        deranged_equalised  A1's size-equalised derangement, MEAN over the 4 seeds per stream (the v1 "strongest of 3 seeds"
//                            deranged_priors becomes REPORTED ONLY). Licence: >= 2 candidates AND the stem's own-prior coverage
//                            drops significantly (stream sign test) under every seed.
//        scrambled_text      Licence (v2): the v1 coverage-drop licence AND the verdict statistic moves: the per-stream silent
//                            rate under the scramble exceeds the real arm's in a significant number of streams (sign test, stream
//                            unit). A scramble that leaves the listener speaking exactly as before is blind to what the verdict
//                            reads (the character inventory): UNlicensed there, not "broken".
//        majority_script     unchanged (licensed iff its label is not the stem).
//      REFERENCE (reported, NOT gating, because it is a rival identifier, not a perturbation of the listener; gating on it
//      would turn R0 into a language-ID race the claim does not make): char_bigram, a causal character-bigram identifier
//      trained on the first CHAR_TRAIN_SENTENCES TRAIN sentences of each candidate (the same TRAIN text the priors came from; no
//      held-out text), cumulative, undecayed over the prefix, never silent. It is non-constant and needs no word identity: if it
//      scores as well as the real arm the card says so (note), and the pass then shows the listener names the language, not that
//      word identity was needed.
//   D4 script_determined (F1). script_determined iff (structural) the stem's family has ONE candidate, or (measured)
//      verdict_invariance >= INVARIANCE (= 1 - ALPHA): on the real arm's window, the verdict on the scrambled text equals the
//      verdict on the real text for at least 95% of sentences, i.e. the verdict reads only what the scramble leaves (the
//      character inventory). Then pass:null with typed gap `script_determined` (score, silent rate and first-decision cost are
//      still reported) and aggregate_eligible:false: such a stem is excluded from every cross-language aggregate. A floor or
//      specificity failure (G2, G4) still gives pass:false before this applies.
//   D5 the v2 PASS RULE. Let k = pinned candidates in the stem's family; c0 = 1/k (0 when k = 1: a one-candidate script has
//      no wrong label to guess, the only chance baseline is silence); gc = the strongest LICENSED gating control accuracy
//      (c0 stays 1/k if none); chance = max(c0, gc); EFFECT = 1/2; FLOOR F = chance + EFFECT * (1 - chance): the real arm must
//      close at least half the gap between the best no-listening reference and perfect.
//        G1 silent_rate < 0.5 (D1).
//        G2 FLOOR: pooled window accuracy >= F AND pooled precision (correct / decided, i.e. wrong-verdict rate <= 1 - F) >= F AND
//           the stream-level sign test that streams reach F (wins = streams with window accuracy >= F) has p < alpha.
//        G4 SPECIFICITY (negative arm): FOREIGN_STREAMS streams of held-out sentences of OTHER languages (the pinned partners,
//           round robin: SAME_FAMILY partner, then the next two candidates of the family in stem order, then rus for Latin /
//           eng otherwise) are fed to a fresh listener each. The foreign false-positive rate (share of window verdicts equal to
//           the stem) must be <= 1 - F pooled AND per stream (sign test over streams, p < alpha). Licence: the stem's own prior
//           must attest significantly LESS of the foreign streams than of the real ones (so the text is foreign to it).
//        G3 every licensed gating control is beaten: real accuracy > the control's AND stream sign test p < alpha (D3).
//      ORDER. First, fewer streams than a one-sided sign test needs to reach alpha (< 5) gives pass:null `too_few_streams`
//      (G2 and G4 are stream-level tests and cannot be judged; at the default 8 streams this never fires). Then pass === false iff
//      G1, G2 or G4 fails. Else pass === null (typed gap) if script_determined (D4), or the foreign arm could not be built or is
//      unlicensed, or no gating control is licensed. Else pass === G3.
//      PROVISIONAL numbers (P4): EFFECT 1/2, CHAR_TRAIN_SENTENCES 2000, FOREIGN_STREAMS 8, OOV 60 sentences per language.
//   D6 reported, not gating: OOV arm. UDHR sentences of languages that have NO prior but use the stem's script (pinned list) are
//      fed to a fresh listener. A prior-less language must come out as the typed gap, not as a candidate (Greenberg): reported
//      are silent_rate, names_stem_rate and names_any_rate. For one-candidate scripts this is the only arm that can fail;
//      where no such text is on disk (Hangul, Greek) it is the typed gap `no_oov_text`.
//   D7 stems whose own text has no letter in a script the listener knows in MORE than UNHEARD_MAX of its sentences (hye, kat,
//      tam, tel): pass:null, typed gap `listener_script_unsupported`, with the denominator; such a card would measure the
//      listener's script table, not its language identification. (Clarified 2026-10-06 before the final run: the first
//      implementation guarded only the all-sentences case, which let tam, whose dev text is 77 of 80 sentences in Tamil script,
//      through as a spurious floor FAIL; the typed gap was always the stated intent.) Likewise `script_family_mismatch`
//      (pass:null, nothing run) when the text's dominant script is not the family the prior is filed under, since the listener
//      would consult the wrong candidates.
// PREDICTIONS A2 (my guesses before running; failures are reported as failures)
//   A2-1  pass === true on dev for eng, spa, arb, tur.
//   A2-2  pass === null with gap script_determined and aggregate_eligible === false for kor and cmn-hans (and for cmn, jpn,
//         heb, ell when they are swept).
//   A2-3  deranged_equalised accuracy <= 2/k for eng, spa, arb, tur.
//   A2-4  foreign false-positive rate <= .10 for eng, spa, tur, kor and <= .25 for arb.
//   A2-5  char_bigram accuracy >= real accuracy - .02 on eng, spa, tur: the listener is NOT shown to beat a character-statistics
//         identifier (said, not gated).
//   A2-6  scrambled_text licensed on eng, spa, arb, tur; UNlicensed on kor and cmn-hans.
//   A2-7  pass_v1 !== pass on kor and cmn-hans (v1 said false by "control matches"; v2 says null).
//   A2-8  heb: OOV names_stem_rate <= .10 on Yiddish (ydd).
//   A2-9  (instrument, tests) the four mutants of the review, wrapped around a toy listener, all give pass === false: noisy (45%
//         silent / 25% wrong label / 30% right), noscript (80% "no letters" nulls), always-the-stem (also on foreign text),
//         always-wrong. v1 passed the first two.
// ═══ END AMENDMENT A2 ═══════════════════════════════════════════════════════════════════════════════════════════════════

import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { TB_DIR } from "./lib.mjs";
import { PRIORS_DIR } from "../../the-fold/language-grammar.js";

export const RUNG = Object.freeze({
  id: "r0",
  name: "identify",
  question: "Does the causal language listener (fresh, nothing declared) name the language of held-out sentences, sentence by sentence, from the prefix alone?",
});

// ── declared parameters (see the header: the bare integers are PROVISIONAL) ──
export const PARAMS = Object.freeze({
  ALPHA: 0.05,           // the task's
  UNHEARD_MAX: 0.5,      // the task's
  STREAMS: 8,            // smallest count at which a stream-level sign test can lose one and still reach alpha
  DEFAULT_LIMIT: 480,    // sentences per arm = STREAMS x 60
  SEEDS: Object.freeze([11, 23, 37]),
  SCRAMBLE_SEED: 101,
  SWITCH: Object.freeze({ lenA: 20, lenB: 60, trials: 4 }),
});
export const A1_SEEDS = Object.freeze([11, 23, 37, 53]);   // amendment A1 (the gating deranged control since A2)
/** amendment A2 (declared in the header before the first v2 run; EFFECT, CHAR_TRAIN_SENTENCES, FOREIGN_STREAMS, OOV_MAX_SENTENCES are PROVISIONAL, P4) */
export const A2P = Object.freeze({
  RULE_VERSION: "v2/A2",
  EFFECT: 0.5,                         // the real arm must close this share of the gap between the best no-listening reference and perfect
  INVARIANCE: 1 - PARAMS.ALPHA,        // verdict(scrambled) === verdict(real) on at least this share => script_determined (derived from alpha)
  FOREIGN_STREAMS: 8,
  CHAR_TRAIN_SENTENCES: 2000,          // per candidate, from the front of its TRAIN file (equal volume per language)
  OOV_MAX_SENTENCES: 60,
  EPS: 1e-9,
});
export const SAME_FAMILY = Object.freeze({
  eng: "deu", spa: "por", por: "spa", ita: "spa", fra: "ita", deu: "nld", nld: "deu", swe: "deu", pol: "deu", fin: "swe", tur: "fin",
  ind: "vie", vie: "ind", rus: "ukr", ukr: "rus", arb: "fas", fas: "arb", urd: "fas", "cmn-hans": "jpn", cmn: "jpn", jpn: "cmn", lzh: "cmn",   // lzh: A2 (the only addition to v1's map)
});
/** UDHR languages with NO prior, by the script family they are written in (the pinned out-of-inventory list; Hangul and Greek have none on disk) */
export const OOV_UDHR = Object.freeze({
  Latin: Object.freeze(["swh", "zul", "haw"]), Cyrillic: Object.freeze(["bel", "kaz", "mkd"]), Arabic: Object.freeze(["pbu", "pnb", "skr"]),   // (ckb is Latin-script in the UDHR file: a data error caught by the first dev run, replaced before any TEST run)
  Hebrew: Object.freeze(["ydd"]), Greek: Object.freeze([]), Devanagari: Object.freeze(["nep", "mai"]), Han: Object.freeze(["yue"]), Hangul: Object.freeze([]),
});
export const UDHR_DIR = "/Users/mlacy/Documents/3.0/ethos/06-government-legal/un-udhr";
export const TRAIN_DIR = Object.freeze({ kor: "kor-gsd" });   // the stem's TRAIN treebank directory when it is not <stem>
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PIN_FILE = path.join(HERE, "r0-inventory.json");

// ── the script family, replicated from the listener so a trial can say which candidates it had ──
// (replica of the-fold/language-listener.js; a run asserts the listener's verdicts agree with it)
const SCRIPTS = [
  ["Han", /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu], ["Hangul", /\p{Script=Hangul}/gu],
  ["Arabic", /\p{Script=Arabic}/gu], ["Hebrew", /\p{Script=Hebrew}/gu], ["Cyrillic", /\p{Script=Cyrillic}/gu],
  ["Greek", /\p{Script=Greek}/gu], ["Devanagari", /\p{Script=Devanagari}/gu], ["Latin", /\p{Script=Latin}/gu],
];
export function familyOf(text) {
  let best = null, n = 0;
  for (const [name, re] of SCRIPTS) { const c = (String(text).match(re) ?? []).length; if (c > n) { n = c; best = name; } }
  return best;
}
export function priorFamily(forms) {
  const keys = Object.keys(forms).slice(0, 4000);
  let sample = null;
  for (const [name, re] of SCRIPTS) { const c = keys.filter((w) => (re.lastIndex = 0, re.test(w))).length; if (!sample || c > sample[1]) sample = [name, c]; }
  return sample[0];
}
let TABLE = null;
/** candidate table { family: [{stem, tokens}] } — the stems the listener will consider for each script, with the giver's volume */
export function candidateTable() {
  if (TABLE) return TABLE;
  const t = {};
  for (const stem of availableStems()) {
    const g = grammarFor(stem);
    if (!g.language || !g.framePrior) continue;
    (t[priorFamily(g.posPrior.forms)] ??= []).push({ stem, tokens: g.posPrior.provenance?.tokens_read ?? 0 });
  }
  return (TABLE = t);
}
export const familyOfStem = (table, stem) => { for (const [family, list] of Object.entries(table)) if (list.some((c) => c.stem === stem)) return family; return null; };
/** the language a script-only reader would name: the largest received prior in the family (ties: stem order) */
export const majorityLabel = (table, family) => [...(table[family] ?? [])].sort((a, b) => b.tokens - a.tokens || (a.stem < b.stem ? -1 : 1))[0]?.stem ?? null;

// ── the pinned inventory (A2 D2) ────────────────────────────────────────────
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const digestCache = new Map();
/** sha256 of the prior files the listener reads for a candidate (pos, frame, proclitics, enclitics), names included */
export function priorDigest(stem, dir = PRIORS_DIR) {
  const key = `${dir}|${stem}`;
  if (digestCache.has(key)) return digestCache.get(key);
  const h = createHash("sha256");
  for (const f of [`pos-${stem}.json`, `frame-${stem}.json`, `proclitics-${stem}.json`, `enclitics-${stem}.json`]) {
    const p = path.join(dir, f);
    h.update(`${f}\0`);
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
    h.update("\0");
  }
  const d = h.digest("hex");
  digestCache.set(key, d);
  return d;
}
/** the declared foreign partners of a stem: its SAME_FAMILY partner, then the next two candidates of its family in stem order (cyclic), then rus (Latin) / eng (otherwise) */
export function foreignPartnersOf(stem, table, family, same = SAME_FAMILY) {
  const fam = (table[family] ?? []).map((c) => c.stem).sort();
  const out = [];
  if (same[stem] && same[stem] !== stem) out.push(same[stem]);
  const i = fam.indexOf(stem);
  for (let d = 1; d < fam.length && out.length < 3; d++) { const s = fam[(i + d) % fam.length]; if (s !== stem && !out.includes(s)) out.push(s); }
  const cross = family === "Latin" ? "rus" : "eng";
  if (cross !== stem && !out.includes(cross)) out.push(cross);
  return out;
}
const sortedObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
/** the pin of the CURRENT live inventory (what `--print-inventory` prints; committing it as r0-inventory.json is the act of pinning) */
export function buildPin(table = candidateTable()) {
  const families = {}, priors = {}, partners = {};
  for (const [f, list] of Object.entries(table)) {
    families[f] = list.map((c) => c.stem).sort();
    for (const c of list) { priors[c.stem] = priorDigest(c.stem); partners[c.stem] = foreignPartnersOf(c.stem, table, f); }
  }
  return {
    schema: "r0-inventory@1", pinned_on: "2026-10-06",
    note: "Pinned candidate inventory for the R0 instrument (amendment A2 D2). measure() refuses with the typed gap inventory_mismatch when the live candidate set of the stem's family or of a foreign partner's family, or the content digest of any such prior, differs. Re-pin only with a dated amendment before a TEST run.",
    families: sortedObj(families), priors_sha256: sortedObj(priors), same_family: sortedObj(SAME_FAMILY),
    cross_family: { Latin: "rus", other: "eng" }, foreign_partners: sortedObj(partners), oov_udhr: sortedObj(OOV_UDHR),
  };
}
export function loadPin(file = PIN_FILE) {
  try { const raw = fs.readFileSync(file); return { pin: JSON.parse(raw), sha256: sha256(raw) }; } catch { return null; }
}
/** compare the live inventory with the pin for the families a stem's card touches; { ok, problems, involved } */
export function checkPin(pin, table, stem, dir = PRIORS_DIR) {
  const problems = [];
  const famPinned = (s) => Object.entries(pin.families ?? {}).find(([, l]) => l.includes(s))?.[0] ?? null;
  const family = familyOfStem(table, stem);
  const partners = pin.foreign_partners?.[stem];
  if (!partners) problems.push(`stem ${stem} has no pinned foreign partners (it is not in the pinned inventory)`);
  const involved = new Set([family, famPinned(stem)].filter(Boolean));
  for (const p of partners ?? []) { const f = famPinned(p); if (f) involved.add(f); else problems.push(`pinned foreign partner ${p} is in no pinned family`); }
  for (const f of involved) {
    const live = (table[f] ?? []).map((c) => c.stem).sort(), pinned = pin.families?.[f] ?? [];
    if (live.join(",") !== pinned.join(",")) {
      const added = live.filter((s) => !pinned.includes(s)), removed = pinned.filter((s) => !live.includes(s));
      problems.push(`family ${f}: live candidates differ from the pin (added: ${added.join(" ") || "none"}; removed: ${removed.join(" ") || "none"})`);
    }
    for (const s of new Set([...live, ...pinned])) if (pin.priors_sha256?.[s] && live.includes(s) && priorDigest(s, dir) !== pin.priors_sha256[s]) problems.push(`prior content of ${s} changed since the pin`);
  }
  const sameLive = JSON.stringify(sortedObj(SAME_FAMILY)), samePinned = JSON.stringify(sortedObj(pin.same_family ?? {}));
  if (sameLive !== samePinned) problems.push("SAME_FAMILY differs from the pinned partner map");
  return { ok: problems.length === 0, problems, involved: [...involved].sort() };
}

// ── verdicts ────────────────────────────────────────────────────────────────
const gapKey = (g) => (g == null ? null : g === "language_unheard" ? "language_unheard" : /^no letters/.test(g) || g === "no_script" ? "no_script" : "other");
/**
 * norm(listenerResult, textFed?) -> { language, gap, said? }
 * With the text fed (A2 D1) a null verdict is `no_script` ONLY when the replica familyOf(text) is null; every other null is
 * `language_unheard` (silent) whatever the listener called it, and what it called it is kept in `said` when it differs.
 * Without the text (legacy callers) the listener's own typed gap is trusted.
 */
export const norm = (r, text) => {
  const language = r?.language ?? null;
  if (language) return { language, gap: null };
  const said = gapKey(r?.gap) ?? "language_unheard";
  if (text === undefined) return { language: null, gap: said };
  const evidence = familyOf(text) != null;
  const gap = evidence ? "language_unheard" : "no_script";
  return said === gap ? { language: null, gap } : { language: null, gap, said };
};
const collapse = (l) => (l === "cmn-hans" ? "cmn" : l);
const swapOf = (stem) => (stem === "cmn" ? "cmn-hans" : stem === "cmn-hans" ? "cmn" : null);
const median = (xs) => { const v = xs.filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const hash32 = (...parts) => { let h = 2166136261 >>> 0; for (const c of parts.join("|")) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const round = (x, d = 4) => (x == null ? null : Number(x.toFixed(d)));

// ── streams and causal collection ───────────────────────────────────────────
/** evenly spread offsets of `count` blocks of `len` over n items (non-overlapping when n >= count*len) */
export const blockOffsets = (n, len, count) => (count <= 1 ? [0] : Array.from({ length: count }, (_, t) => Math.floor((t * (n - len)) / (count - 1))));
/** STREAMS contiguous blocks of PER sentences, spread over the file in file order; [] when there are not enough sentences */
export function makeStreams(texts, { streams = PARAMS.STREAMS, limit = PARAMS.DEFAULT_LIMIT } = {}) {
  const per = Math.min(Math.floor(limit / streams), Math.floor(texts.length / streams));
  if (per < 1) return { streams: [], per: 0, offsets: [] };
  const offsets = blockOffsets(texts.length, per, streams);
  return { streams: offsets.map((o) => texts.slice(o, o + per)), per, offsets };
}
/**
 * collect(streams, factory, transform) — the CAUSAL feed. A fresh listener per stream; sentence i is
 * handed over ALONE (one argument), its verdict recorded, and only then does sentence i+1 get read out
 * of the array. The listener never receives the array, the gold, or any later sentence. The verdict is
 * normalised against the text that was actually fed (A2 D1).
 */
export function collect(streams, factory, transform = (t) => t) {
  return streams.map((sents) => {
    const listener = factory();
    const verdicts = [];
    for (let i = 0; i < sents.length; i++) { const fed = transform(sents[i], i); verdicts.push(norm(listener.listen(fed), fed)); }
    return { verdicts, revisions: typeof listener.revisions === "function" ? listener.revisions() : [] };
  });
}

// ── scoring (pure: verdict arrays in, numbers out) ──────────────────────────
/** the real arm's window start per stream: its first decision (0-based), or 0 when it never decides */
export const startsOf = (streamsV) => streamsV.map((vs) => Math.max(0, vs.findIndex((v) => v.language != null)));

export function armStats(streamsV, stem, starts) {
  const other = swapOf(stem);
  const per = streamsV.map((vs, t) => {
    const s = starts[t], len = vs.length;
    let correct = 0, collapsed = 0, decided = 0, swapped = 0, unheard = 0, noScript = 0, winNoScript = 0, misreport = 0;
    const wrong = {}, hits = [];
    // a null that is not a legitimate `no_script` is SILENT (A2 D1), whatever string the listener gave
    for (let i = 0; i < len; i++) { const v = vs[i]; if (v.language == null) { if (v.gap === "no_script") noScript++; else unheard++; if (v.said) misreport++; } }
    for (let i = s; i < len; i++) {
      const v = vs[i], ok = v.language === stem;
      hits.push(ok);
      if (ok) correct++;
      if (v.language != null) {
        decided++;
        if (collapse(v.language) === collapse(stem)) collapsed++;
        if (!ok) wrong[v.language] = (wrong[v.language] ?? 0) + 1;
        if (other && v.language === other) swapped++;
      } else if (v.gap === "no_script") winNoScript++;
    }
    const fd = vs.findIndex((v) => v.language != null);
    return { len, start: s, win: len - s, correct, collapsed, decided, swapped, unheard, noScript, winNoScript, misreport, wrong, hits, firstDecision: fd < 0 ? null : fd + 1 };
  });
  const sum = (k) => per.reduce((a, p) => a + p[k], 0);
  const N = sum("len"), W = sum("win"), correct = sum("correct"), decided = sum("decided");
  const wrong = {};
  for (const p of per) for (const [l, c] of Object.entries(p.wrong)) wrong[l] = (wrong[l] ?? 0) + c;
  const wnoScript = sum("winNoScript");
  const evidenceN = N - sum("noScript");      // sentences that have a letter in a known script: the denominator of the silent rate
  const wrongN = decided - correct;
  return {
    per, N, W, correct, decided, evidenceN, wrongN,
    accuracy: W ? correct / W : 0,
    accuracyExclNoScript: W - wnoScript ? correct / (W - wnoScript) : 0,
    precision: decided ? correct / decided : null,
    wrongRate: W ? wrongN / W : 0,                 // decided AND wrong, over the window
    collapsed: W ? sum("collapsed") / W : 0,
    swapRate: other ? (decided ? sum("swapped") / decided : null) : null,
    unheard: evidenceN ? sum("unheard") / evidenceN : 0,   // silent rate (A2 D1)
    noScript: N ? sum("noScript") / N : 0,
    unheardN: sum("unheard"), noScriptN: sum("noScript"), misreportN: sum("misreport"),
    silentPerStream: per.map((p) => (p.len - p.noScript ? p.unheard / (p.len - p.noScript) : 0)),
    firstDecisions: per.map((p) => p.firstDecision),
    confusions: Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, c]) => ({ label, count: c, share_of_decided: decided ? round(c / decided) : null })),
    perStreamAccuracy: per.map((p) => (p.win ? round(p.correct / p.win) : 0)),
  };
}

/** paired comparison of two arms scored over the SAME windows */
export function compareArms(real, ctrl, alpha = PARAMS.ALPHA) {
  let wins = 0, losses = 0, ties = 0, b = 0, c = 0;
  real.per.forEach((r, t) => {
    const k = ctrl.per[t];
    if (r.win !== k.win) throw new Error("arms were scored over different windows");
    if (r.correct > k.correct) wins++; else if (r.correct < k.correct) losses++; else ties++;
    for (let i = 0; i < r.hits.length; i++) { if (r.hits[i] && !k.hits[i]) b++; else if (!r.hits[i] && k.hits[i]) c++; }
  });
  const pStream = signTest(wins, losses).p;
  const W = real.W;
  const p0 = (ctrl.correct + 0.5) / (W + 1);
  const pRate = real.correct <= 0 ? 1 : binomUpperTail(real.correct, W, p0);
  return {
    wins, losses, ties, sentence_wins: b, sentence_losses: c,
    p_stream: pStream, p_sentence: signTest(b, c).p, p_vs_control_rate: pRate,
    beats: real.accuracy > ctrl.accuracy && pStream < alpha,
  };
}

/** the control that scores highest among several arms of the same kind (e.g. deranged seeds); first wins ties */
export function strongest(named) { let best = null; for (const [k, a] of Object.entries(named)) if (!best || a.accuracy > best[1].accuracy) best = [k, a]; return best; }

/**
 * equalisedReport(real, seedStats, alpha) — A1 (the GATING deranged control since A2). The control is the MEAN over seeds, per stream; paired with
 * the real arm by the same stream sign test. `seedStats` = armStats() of each seed's arm over the real arm's windows.
 */
export function equalisedReport(real, seedStats, alpha = PARAMS.ALPHA) {
  const T = real.per.length, EPS = 1e-9;
  const perStream = Array.from({ length: T }, (_, t) => seedStats.reduce((a, s) => a + (s.per[t].win ? s.per[t].correct / s.per[t].win : 0), 0) / (seedStats.length || 1));
  let wins = 0, losses = 0, ties = 0;
  real.per.forEach((r, t) => { const a = r.win ? r.correct / r.win : 0; if (a > perStream[t] + EPS) wins++; else if (a < perStream[t] - EPS) losses++; else ties++; });
  const accuracy = seedStats.reduce((a, s) => a + s.accuracy, 0) / (seedStats.length || 1);
  const p = signTest(wins, losses).p;
  return { accuracy: round(accuracy), per_seed: seedStats.map((s) => round(s.accuracy)), per_stream: perStream.map((x) => round(x)), wins, losses, ties, p_stream: round(p, 6), beats: real.accuracy > accuracy && p < alpha };
}

/**
 * silenceMoves(real, ctl) — A2 D3. Does the control move the VERDICT statistic (speaks / stays silent), not only the coverage?
 * Per-stream silent rate of the control against the real arm's; exact one-sided sign test over streams (the stream is the unit).
 */
export function silenceMoves(real, ctl, alpha = PARAMS.ALPHA) {
  let wins = 0, losses = 0, ties = 0;
  real.silentPerStream.forEach((r, t) => { const c = ctl.silentPerStream[t]; if (c > r + 1e-9) wins++; else if (c < r - 1e-9) losses++; else ties++; });
  const p = signTest(wins, losses).p;
  return { wins, losses, ties, p, licensed: p < alpha, mean_real_silent: round(real.unheard), mean_control_silent: round(ctl.unheard) };
}
/** share of the real arm's window sentences on which two arms give the SAME verdict (a null equals a null); pooled over streams */
export function verdictInvariance(realV, ctlV, starts) {
  let same = 0, win = 0;
  realV.forEach((vs, t) => { for (let i = starts[t]; i < vs.length; i++) { win++; if ((vs[i].language ?? null) === (ctlV[t]?.[i]?.language ?? null)) same++; } });
  return win ? same / win : null;
}

// ── the controls ────────────────────────────────────────────────────────────
/**
 * derangePlan(forms, families, seed) — deal the KEYS of the same-script languages' form tables out again at
 * random. Each language keeps its table size and its per-form class counts; only which words they attach
 * to is shuffled. A family with one language has no derangement (identity): it is not in the plan.
 *   forms    { stem: { form: counts } }      families { stem: family }
 *   → { plan: { stem: newForms }, perturbation: { stem: share of the new keys the language did not have } }
 */
export function derangePlan(forms, families, seed, { equalise = false } = {}) {
  const byFamily = {};
  for (const s of Object.keys(forms)) (byFamily[families[s]] ??= []).push(s);
  const plan = {}, perturbation = {};
  for (const [family, stems] of Object.entries(byFamily)) {
    if (stems.length < 2) continue;
    const pool = [];
    for (const s of stems) pool.push(...Object.keys(forms[s]));
    const dealt = shuffled(pool, mulberry32(hash32(seed, family)));
    const m = equalise ? Math.min(...stems.map((s) => Object.keys(forms[s]).length)) : Infinity;   // A1: every slot as small as the smallest
    let at = 0;
    for (const s of stems) {
      const vals = Object.values(forms[s]).slice(0, m), had = forms[s];
      const next = {};
      let kept = 0;
      for (let i = 0; i < vals.length; i++) {
        const k = dealt[at++];
        if (k === "__proto__" || Object.hasOwn(next, k)) continue;
        next[k] = vals[i];
        if (Object.hasOwn(had, k)) kept++;
      }
      const size = Object.keys(next).length;
      plan[s] = next;
      perturbation[s] = size ? 1 - kept / size : 0;
    }
  }
  return { plan, perturbation };
}
/** run fn() with every candidate prior's forms deranged (restored afterwards, even on a throw); the listener itself is untouched. `only: family` deranges just that family (the other families cannot affect a stem's own arm) */
export function withDeranged(seed, fn, opts = {}) {
  const table = candidateTable();
  const priors = {}, forms = {}, families = {};
  for (const [family, list] of Object.entries(table)) { if (opts.only && family !== opts.only) continue; for (const c of list) { const p = grammarFor(c.stem).posPrior; priors[c.stem] = p; forms[c.stem] = p.forms; families[c.stem] = family; } }
  const { plan, perturbation } = derangePlan(forms, families, seed, opts);
  const saved = {};
  try {
    for (const [stem, nf] of Object.entries(plan)) { saved[stem] = priors[stem].forms; priors[stem].forms = nf; }
    return { value: fn(), perturbation };
  } finally {
    for (const [stem, f] of Object.entries(saved)) priors[stem].forms = f;
  }
}
/** the letter-clusters (a letter with its marks; a digit) of a sentence permuted among their own positions */
export function scramble(text, rng) {
  const units = [], spans = [];
  for (const m of String(text).matchAll(/\p{L}\p{M}*|\p{N}/gu)) { units.push(m[0]); spans.push([m.index, m.index + m[0].length]); }
  if (units.length < 2) return String(text);
  const perm = shuffled(units, rng);
  let out = "", at = 0;
  spans.forEach(([a, b], i) => { out += text.slice(at, a) + perm[i]; at = b; });
  return out + text.slice(at);
}
/** share of a stream's words the stem's OWN prior attests, heard through its own ear exactly as the listener does it */
export function streamCoverages(stem, streams, transform = (t) => t) {
  const g = grammarFor(stem);
  const ear = makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics });   // built once (the prior is in whatever state the caller set)
  return streams.map((sentences) => {
    let hit = 0, words = 0;
    for (let i = 0; i < sentences.length; i++) {
      let t = transform(sentences[i], i);
      if (ear.segment) t = ear.segment(t);
      if (ear.peel) t = ear.peel(t);
      for (const w of t.match(/[\p{L}\p{M}\p{N}]+/gu) ?? []) { words++; if (g.posPrior.forms[w]) hit++; }
    }
    return words ? hit / words : 0;
  });
}
/** licence by MEASUREMENT: did the perturbation lower what the statistic reads? per-stream paired exact sign test */
export function coverageDrop(real, perturbed, alpha = PARAMS.ALPHA) {
  let wins = 0, losses = 0;
  real.forEach((r, t) => { if (r > perturbed[t]) wins++; else if (r < perturbed[t]) losses++; });
  const p = signTest(wins, losses).p;
  return { wins, losses, p, licensed: p < alpha, mean_real: round(real.reduce((a, b) => a + b, 0) / (real.length || 1)), mean_perturbed: round(perturbed.reduce((a, b) => a + b, 0) / (perturbed.length || 1)) };
}

// ── the REFERENCE arm: a causal character-bigram identifier (A2 D3; reported, not gating) ──
/** the character bigrams of a text's words, with word-boundary marks: "_a", "ab", ..., "z_" (lower-cased; letters and marks only) */
export const bigramsOf = (text) => {
  const out = [];
  for (const tok of String(text).toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? []) { const cs = Array.from(`_${tok}_`); for (let i = 0; i + 1 < cs.length; i++) out.push(cs[i] + cs[i + 1]); }
  return out;
};
const TEXT_LINE = /^#\s*text\s*=\s*(.*)$/;   // the same line shape lib.mjs::parseConllu reads ("# text = X", "# text =X")
/** the first `n` "# text =" lines of a stem's TRAIN treebank (read from the front of the file, never the whole of it); null when the file is absent */
export function readTrainTexts(stem, n, dir = TB_DIR) {
  const file = path.join(dir, TRAIN_DIR[stem] ?? stem, "train.conllu");
  if (!fs.existsSync(file)) return null;
  const fd = fs.openSync(file, "r"), dec = new StringDecoder("utf8"), buf = Buffer.alloc(1 << 20), out = [];
  let pos = 0, carry = "";
  try {
    while (out.length < n) {
      const r = fs.readSync(fd, buf, 0, buf.length, pos);
      if (r <= 0) break;
      pos += r;
      carry += dec.write(buf.subarray(0, r));
      const lines = carry.split("\n");
      carry = lines.pop();
      for (const l of lines) { const m = TEXT_LINE.exec(l); if (m && out.length < n) out.push(m[1]); }
    }
    const last = TEXT_LINE.exec(carry);
    if (last && out.length < n) out.push(last[1]);
  } finally { fs.closeSync(fd); }
  return out;
}
export function trainCharModel(textsByStem) {
  const stems = Object.keys(textsByStem).sort();
  const counts = {}, totals = {}, vocab = new Set();
  for (const s of stems) {
    const m = new Map();
    let tot = 0;
    for (const t of textsByStem[s]) for (const b of bigramsOf(t)) { m.set(b, (m.get(b) ?? 0) + 1); tot++; vocab.add(b); }
    counts[s] = m; totals[s] = tot;
  }
  return { stems, counts, totals, V: vocab.size + 1 };
}
export const charLL = (model, stem, bigrams) => { const m = model.counts[stem], d = model.totals[stem] + model.V; let ll = 0; for (const b of bigrams) ll += Math.log(((m.get(b) ?? 0) + 1) / d); return ll; };
/** a causal listener over trained models { family: model }: the running log-likelihood of each candidate over the prefix, undecayed; names the leader every sentence (never silent when the sentence has letters) */
export function makeCharListener(modelsByFamily) {
  const cum = new Map();
  return {
    listen(text) {
      const family = familyOf(text);
      if (!family) return { language: null, gap: "no letters in a known script" };
      const model = modelsByFamily[family], bg = bigramsOf(text);
      if (!model || !bg.length) return { language: null, gap: "language_unheard" };
      const acc = cum.get(family) ?? Object.fromEntries(model.stems.map((s) => [s, 0]));
      let best = null;
      for (const s of model.stems) { acc[s] += charLL(model, s, bg); if (best == null || acc[s] > acc[best]) best = s; }
      cum.set(family, acc);
      return { language: best };
    },
    revisions: () => [],
  };
}
const CHAR_MODELS = new Map();
/** the character model of a family's candidates, trained once per process; { model } or { gap } (a candidate without TRAIN text makes the reference arm a typed gap, never a shortened one) */
export function charModelFor(table, family, n = A2P.CHAR_TRAIN_SENTENCES) {
  const stems = (table[family] ?? []).map((c) => c.stem).sort();
  const key = `${family}|${n}|${stems.join(",")}`;
  if (CHAR_MODELS.has(key)) return CHAR_MODELS.get(key);
  const texts = {}, missing = [];
  for (const s of stems) { const t = readTrainTexts(s, n); if (!t || !t.length) missing.push(s); else texts[s] = t; }
  const r = missing.length ? { gap: `no TRAIN text for ${missing.join(" ")}` } : { model: trainCharModel(texts), trained_sentences: Object.fromEntries(Object.entries(texts).map(([s, t]) => [s, t.length])) };
  CHAR_MODELS.set(key, r);
  return r;
}

// ── the foreign (negative) arms ─────────────────────────────────────────────
/** FOREIGN_STREAMS blocks of held-out sentences of the pinned partners, round robin; { streams, plan, skipped } */
export function foreignStreams(partners, textsFor, per, count = A2P.FOREIGN_STREAMS) {
  const usable = [], skipped = [];
  for (const p of partners) { const t = textsFor(p); if (t && t.length) usable.push([p, t]); else skipped.push(p); }
  if (!usable.length) return { streams: [], plan: [], skipped };
  const mine = usable.map(() => []);
  for (let t = 0; t < count; t++) mine[t % usable.length].push(t);
  const streams = new Array(count), plan = new Array(count);
  usable.forEach(([p, texts], j) => {
    const len = Math.min(per, texts.length), offs = blockOffsets(texts.length, len, mine[j].length);
    mine[j].forEach((t, i) => { streams[t] = texts.slice(offs[i], offs[i] + len); plan[t] = { partner: p, offset: offs[i], length: len }; });
  });
  return { streams: streams.filter(Boolean), plan: plan.filter(Boolean), skipped };
}
/** UDHR paragraphs -> sentences (header lines dropped; split after . ! ? 。 ！ ？ ؟ । ։ and the like) */
export function udhrSentences(code, dir = UDHR_DIR) {
  const file = path.join(dir, `udhr-${code}.txt`);
  if (!fs.existsSync(file)) return null;
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n").slice(4)) {
    const t = line.trim();
    if (t.length < 20) continue;
    for (const s of t.split(/(?<=[.!?։。！？؟।۔])\s*/u)) { const u = s.trim(); if (u.length >= 8 && /\p{L}/u.test(u)) out.push(u); }
  }
  return out;
}

// ── the switch ──────────────────────────────────────────────────────────────
/** pure analysis of one A-then-B verdict stream */
export function analyseSwitch(verdicts, revisions, { lenA, stemA, stemB }) {
  const A = verdicts.slice(0, lenA), B = verdicts.slice(lenA);
  const dA = A.findIndex((v) => v.language != null);
  const aWin = dA < 0 ? A.length : A.length - dA;
  const aCorrect = dA < 0 ? 0 : A.slice(dA).filter((v) => v.language === stemA).length;
  const firstB = B.findIndex((v) => v.language === stemB);
  let settle = null;
  if (B.length && B[B.length - 1].language === stemB) { let i = B.length - 1; while (i > 0 && B[i - 1].language === stemB) i--; settle = i + 1; }
  // REPORTED, NOT THE PRE-REGISTERED SETTLE (added after the first dev runs): a sentence with no letters carries no
  // language evidence and the listener answers it with a null, which breaks the unbroken run above; this twin skips those.
  let settleSkip = null;
  const evidence = B.map((v, i) => [v, i]).filter(([v]) => v.gap !== "no_script");
  if (evidence.length && evidence[evidence.length - 1][0].language === stemB) { let k = evidence.length - 1; while (k > 0 && evidence[k - 1][0].language === stemB) k--; settleSkip = evidence[k][1] + 1; }
  const revInB = revisions.filter((r) => r.at >= lenA);
  const toB = revInB.find((r) => r.to === stemB);
  return { a_accuracy: aWin ? round(aCorrect / aWin) : 0, first_B: firstB < 0 ? null : firstB + 1, settle_B: settle, settle_B_ignoring_no_script: settleSkip, revisions_in_B: revInB.length, revised_to_B_at: toB ? toB.at - lenA + 1 : null };
}
export function summariseSwitch(trials, { lenA, lenB }) {
  const inf = (x) => (x == null ? Infinity : x);
  const med = (xs) => { const v = xs.slice().sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; const r = v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; return Number.isFinite(r) ? r : null; };
  return {
    trials: trials.length, lenA, lenB,
    settled_share: trials.length ? round(trials.filter((x) => x.settle_B != null).length / trials.length) : null,
    median_settle_B: med(trials.map((x) => inf(x.settle_B))),               // null = the median trial never settled
    median_settle_B_ignoring_no_script: med(trials.map((x) => inf(x.settle_B_ignoring_no_script))),   // reported only
    median_first_B: med(trials.map((x) => inf(x.first_B))),
    revisions_in_B: trials.reduce((a, x) => a + x.revisions_in_B, 0),
    revised_to_B_share: trials.length ? round(trials.filter((x) => x.revised_to_B_at != null).length / trials.length) : null,
    mean_a_accuracy: trials.length ? round(trials.reduce((a, x) => a + x.a_accuracy, 0) / trials.length) : null,
    per_trial: trials,
  };
}
function runSwitch({ stemA, textsA, stemB, textsB, factory }) {
  const { lenA, lenB, trials } = PARAMS.SWITCH;
  if (textsA.length < lenA || textsB.length < lenB) return { gap: "too_few_sentences" };
  const oa = blockOffsets(textsA.length, lenA, trials), ob = blockOffsets(textsB.length, lenB, trials);
  const out = [];
  for (let k = 0; k < trials; k++) {
    const seq = [...textsA.slice(oa[k], oa[k] + lenA), ...textsB.slice(ob[k], ob[k] + lenB)];
    const [{ verdicts, revisions }] = collect([seq], factory);
    out.push(analyseSwitch(verdicts, revisions, { lenA, stemA, stemB }));
  }
  return summariseSwitch(out, { lenA, lenB });
}

// ── the card ────────────────────────────────────────────────────────────────
/**
 * scoreR0({stem, streams, arms, licence, ctx}) — pure. The v2/A2 rule (see AMENDMENT A2); the v1 rule is recomputed on the same arms and reported.
 *   arms     { real, case_stripped?, scrambled_text?, majority_script?, deranged_equalised?: [arm per seed], deranged_priors?, char_bigram?, foreign? }
 *            each arm = verdict arrays per stream ({language, gap, said?}); `foreign` = verdict arrays per FOREIGN stream (other languages' text)
 *   licence  { <control>: { licensed: bool, reason?: string, ... }, foreign?: { licensed } }   (the v1 coverage licences; the v2 scramble licence is added here)
 *   ctx      { k: candidates in the family, single?: k < 2 }
 */
export function scoreR0({ stem, streams, arms, licence = {}, ctx = {}, params = PARAMS, a2 = A2P }) {
  const starts = startsOf(arms.real);
  const real = armStats(arms.real, stem, starts);
  const T = real.per.length, EPS = a2.EPS;
  const k = ctx.k ?? 2, single = ctx.single ?? k < 2;
  const notes = [], gaps = [];
  const stats = {}, tests = {}, controls = {};
  for (const name of ["scrambled_text", "majority_script", "deranged_priors", "char_bigram"]) {
    if (!arms[name]) continue;
    stats[name] = armStats(arms[name], stem, starts);
    tests[name] = compareArms(real, stats[name], params.ALPHA);
    controls[name] = round(stats[name].accuracy);
  }
  let eq = null, eqAcc = null;
  if (arms.deranged_equalised?.length) {
    const seedStats = arms.deranged_equalised.map((a) => armStats(a, stem, starts));
    eq = equalisedReport(real, seedStats, params.ALPHA);
    eqAcc = seedStats.reduce((a, s) => a + s.accuracy, 0) / seedStats.length;
    tests.deranged_equalised = { wins: eq.wins, losses: eq.losses, ties: eq.ties, p_stream: eq.p_stream, beats: eq.beats };
    controls.deranged_equalised = eq.accuracy;
  }
  // v2 scramble licence: the v1 coverage licence AND the verdict statistic (speaks / silent) moves
  const silence = stats.scrambled_text ? silenceMoves(real, stats.scrambled_text, params.ALPHA) : null;
  const L = { ...licence };
  if (licence.scrambled_text) {
    const cov = Boolean(licence.scrambled_text.licensed);
    L.scrambled_text = { ...licence.scrambled_text, licensed_v1: cov, licensed: cov && Boolean(silence?.licensed), silence_moves: silence };
    if (cov && !silence?.licensed) L.scrambled_text.reason = `the scramble does not move the verdict statistic: the listener is as silent on scrambled text as on real (${silence?.mean_real_silent} -> ${silence?.mean_control_silent}; stream sign p=${round(silence?.p)}); it reads only what the scramble leaves, the character inventory`;
  }
  const GATING = ["deranged_equalised", "scrambled_text", "majority_script"];
  const built = (n) => (n === "deranged_equalised" ? eq != null : stats[n] != null);
  const accOf = (n) => (n === "deranged_equalised" ? eqAcc : stats[n].accuracy);
  const beatsOf = (n) => (n === "deranged_equalised" ? eq.beats : tests[n].beats);
  const licensedG = GATING.filter((n) => built(n) && L[n]?.licensed);
  for (const n of GATING) {
    if (built(n) && !licensedG.includes(n)) { gaps.push({ reason: "control_not_licensed", count: T, of: T, detail: `${n}: ${L[n]?.reason ?? "no licence evidence"}` }); notes.push(`control ${n} is reported but NOT licensed for ${stem} (${L[n]?.reason ?? "no licence evidence"}); it does not gate the pass`); }
    if (!built(n)) gaps.push({ reason: "control_not_built", count: 1, detail: `${n}: ${L[n]?.reason ?? "no arm"}` });
  }
  for (const n of ["char_bigram", "deranged_priors"]) if (!built(n)) gaps.push({ reason: "reference_not_built", count: 1, detail: `${n}: ${L[n]?.reason ?? "no arm"}` });
  const control = licensedG.length ? Math.max(...licensedG.map(accOf)) : null;

  // G1 silence (D1), G2 floor (D5), G4 specificity (D5)
  const unheardOk = real.unheard < params.UNHEARD_MAX;
  const c0 = single ? 0 : 1 / k;
  const chance = Math.max(c0, control ?? 0);
  const F = chance + a2.EFFECT * (1 - chance);
  const perAcc = real.per.map((p) => (p.win ? p.correct / p.win : 0));
  const atFloor = perAcc.filter((a) => a >= F - EPS).length;
  const floorP = signTest(atFloor, T - atFloor).p;
  const floorOk = real.accuracy >= F - EPS && (real.precision ?? 0) >= F - EPS && floorP < params.ALPHA;
  const floor = { c0: round(c0), strongest_licensed_control: control == null ? null : round(control), chance: round(chance), effect: a2.EFFECT, F: round(F), pooled_accuracy: round(real.accuracy), pooled_precision: round(real.precision), wrong_of_decided: real.precision == null ? null : round(1 - real.precision), wrong_rate_of_window: round(real.wrongRate), streams_at_floor: atFloor, streams_below_floor: T - atFloor, p_stream: round(floorP, 6), ok: floorOk };
  let foreign = null;
  if (arms.foreign?.length) {
    const fS = armStats(arms.foreign, stem, startsOf(arms.foreign));
    const fpPer = fS.per.map((p) => (p.win ? p.correct / p.win : 0));
    const within = fpPer.filter((x) => x <= 1 - F + EPS).length;
    const pF = signTest(within, fpPer.length - within).p;
    const lic = licence.foreign?.licensed ?? true;
    foreign = {
      streams: fpPer.length, window_sentences: fS.W, false_positive_rate: round(fS.accuracy), per_stream: fpPer.map((x) => round(x)), bound: round(1 - F),
      streams_within_bound: within, p_stream: round(pF, 6), silent_rate: round(fS.unheard), names_another_language_rate: round(fS.W ? fS.wrongN / fS.W : 0), top_labels: fS.confusions.slice(0, 3),
      licensed: lic, licence: licence.foreign ?? null, enough_streams: fpPer.length >= minDiscordantFor(params.ALPHA),
      ok: fS.accuracy <= 1 - F + EPS && pF < params.ALPHA,
    };
  }
  // D4 script_determined
  const inv = arms.scrambled_text ? verdictInvariance(arms.real, arms.scrambled_text, starts) : null;
  const scriptDetermined = Boolean(single || (inv != null && inv >= a2.INVARIANCE - EPS));
  const enough = T >= minDiscordantFor(params.ALPHA);
  let pass;
  if (!enough) { pass = null; gaps.push({ reason: "too_few_streams", count: T, of: minDiscordantFor(params.ALPHA), detail: "a stream-level sign test cannot reach alpha" }); }
  else if (!unheardOk || !floorOk || (foreign && foreign.licensed && foreign.enough_streams && !foreign.ok)) pass = false;
  else if (scriptDetermined) { pass = null; gaps.push({ reason: "script_determined", count: real.N, of: real.N, detail: single ? `${stem}'s script family has one candidate prior: naming it is script identification` : `the verdict on scrambled text equals the verdict on real text for ${round(inv)} of the window (>= ${round(a2.INVARIANCE)}): it reads only the character inventory` }); }
  else if (!foreign) { pass = null; gaps.push({ reason: "foreign_arm_not_built", count: 1, detail: "no held-out text of another language to test specificity" }); }
  else if (!foreign.licensed || !foreign.enough_streams) { pass = null; gaps.push({ reason: "foreign_arm_unlicensed", count: foreign.streams, of: A2P.FOREIGN_STREAMS, detail: !foreign.licensed ? "the stem's own prior attests the foreign text as well as its own (the text is not foreign to it)" : "too few foreign streams for a sign test" }); }
  else if (!licensedG.length) { pass = null; gaps.push({ reason: "no_licensed_control", count: 1, detail: "no gating control can fail here; the real arm cannot be separated from its controls" }); }
  else pass = licensedG.every(beatsOf);

  // v1 (REPORTED ONLY): the v1 rule on the same arms
  const V1 = ["deranged_priors", "scrambled_text", "majority_script"];
  const licensedV1 = V1.filter((n) => stats[n] && (L[n]?.licensed_v1 ?? L[n]?.licensed));
  const passV1 = !licensedV1.length || !enough ? null : Boolean(unheardOk && licensedV1.every((n) => tests[n].beats));

  if (real.unheardN) gaps.push({ reason: "language_unheard", count: real.unheardN, of: real.evidenceN, detail: "null verdicts on sentences that have a letter in a known script (whatever the listener called the gap)" });
  if (real.noScriptN) gaps.push({ reason: "no_script", count: real.noScriptN, of: real.N, detail: "sentences with no letter in a known script (replica): legitimately outside the evidence" });
  if (real.misreportN) gaps.push({ reason: "gap_misreport", count: real.misreportN, of: real.N, detail: "the listener answered a different gap than the instrument's replica says (counted as silent when the sentence has letters)" });
  const never = real.firstDecisions.filter((d) => d == null).length;
  if (never) gaps.push({ reason: "never_decided", count: never, of: T, detail: "streams in which the listener gave no verdict at all" });
  if (!unheardOk) notes.push(`silent rate ${round(real.unheard)} >= ${params.UNHEARD_MAX}: the listener hides behind a null for at least half of the sentences that have letters`);
  if (!floorOk) notes.push(`FLOOR not met: accuracy ${round(real.accuracy)}, precision ${round(real.precision)}, ${atFloor}/${T} streams at F=${round(F)} (chance ${round(chance)} + ${a2.EFFECT} x headroom; stream sign p=${round(floorP)})`);
  if (foreign && foreign.licensed && foreign.enough_streams && !foreign.ok) notes.push(`SPECIFICITY not met: the listener names ${stem} on ${round(foreign.false_positive_rate)} of other languages' sentences (bound ${round(1 - F)}; ${foreign.streams_within_bound}/${foreign.streams} streams within; stream sign p=${round(foreign.p_stream)})`);
  for (const n of licensedG) if (!beatsOf(n)) notes.push(`real does not beat licensed control ${n} (stream sign p=${round(tests[n].p_stream)}, wins ${tests[n].wins} losses ${tests[n].losses} ties ${tests[n].ties}, real ${round(real.accuracy)} vs ${round(accOf(n))})`);
  for (const n of licensedG) if (accOf(n) >= real.accuracy) notes.push(`WARNING: licensed control ${n} does as well as the real arm; the instrument or the mechanism is broken (II.23)`);
  if (stats.char_bigram && stats.char_bigram.accuracy >= real.accuracy - 0.02) notes.push(`reference char_bigram scores ${round(stats.char_bigram.accuracy)} vs real ${round(real.accuracy)}: a character-statistics identifier does as well; the listener names the language, it is not shown to need word identity (reported, not gating)`);
  if (scriptDetermined && pass === null && enough) notes.push(`script_determined: ${single ? `${stem}'s script family has one candidate` : `the verdict survives the scramble (invariance ${round(inv)})`}; no pass or fail is claimed about reading, and the stem is excluded from cross-language aggregates`);
  if (real.swapRate != null && real.swapRate > 0) notes.push(`script-variant swap (cmn <-> cmn-hans): ${round(real.swapRate)} of decided verdicts; strict accuracy ${round(real.accuracy)} vs language-level ${round(real.collapsed)}`);
  const cs = arms.case_stripped ? armStats(arms.case_stripped, stem, startsOf(arms.case_stripped)) : null;
  const eqDetails = eq ? { ...eq } : null;
  return {
    stem, rung: RUNG.id, n: real.N,
    score: round(real.accuracy), control: control == null ? null : round(control), margin: control == null ? null : round(real.accuracy - control),
    pass, controls, gaps, notes,
    aggregate_eligible: !scriptDetermined,
    details: {
      rule_version: a2.RULE_VERSION,
      streams: T, per_stream: real.per[0]?.len ?? 0,
      first_decision: { per_stream: real.firstDecisions, median: median(real.firstDecisions), max: real.firstDecisions.every((d) => d != null) ? Math.max(...real.firstDecisions) : null, never },
      per_stream_accuracy: real.perStreamAccuracy,
      pass_v1: passV1,
      // the task's literal rule (real beats the DERANGED v1 control, unheard < 50%); reported only
      pass_deranged_only: L.deranged_priors?.licensed && tests.deranged_priors ? Boolean(unheardOk && tests.deranged_priors.beats) : null,
      gates: {
        G1_silent: { ok: unheardOk, silent_rate: round(real.unheard), max: params.UNHEARD_MAX, silent: real.unheardN, of: real.evidenceN },
        G2_floor: floor,
        G4_specificity: foreign ? { ...foreign, ok: foreign.licensed && foreign.enough_streams ? foreign.ok : null } : { ok: null, gap: "foreign_arm_not_built" },
        G3_controls: Object.fromEntries(GATING.filter(built).map((n) => [n, { licensed: Boolean(L[n]?.licensed), beats: beatsOf(n), accuracy: round(accOf(n)) }])),
        script_determined: { determined: scriptDetermined, structural: single, verdict_invariance: round(inv), threshold: round(a2.INVARIANCE) },
      },
      control_roles: { deranged_equalised: "gating", scrambled_text: "gating (v2 licence)", majority_script: "gating", foreign: "gating (specificity)", char_bigram: "reference (not gating)", deranged_priors: "v1, reported only" },
      v1: {
        pass: passV1,
        note: "the v1 pass rule recomputed on the v2 arms (silence accounted as in D1); reported only, it gates nothing",
        controls: Object.fromEntries(V1.filter((n) => controls[n] != null).map((n) => [n, controls[n]])),
        licence: Object.fromEntries(Object.entries({ deranged_priors: L.deranged_priors, scrambled_text: L.scrambled_text ? { ...L.scrambled_text, licensed: L.scrambled_text.licensed_v1 } : undefined, majority_script: L.majority_script }).filter(([, v]) => v !== undefined)),
        tests: Object.fromEntries(V1.filter((n) => tests[n]).map((n) => [n, { ...tests[n], p_stream: round(tests[n].p_stream, 6), p_sentence: round(tests[n].p_sentence, 6), p_vs_control_rate: round(tests[n].p_vs_control_rate, 6) }])),
      },
      window_sentences: real.W, precision: round(real.precision), wrong_verdict_rate: round(real.wrongRate), collapsed_accuracy: round(real.collapsed), swap_rate: round(real.swapRate),
      accuracy_excl_no_script: round(real.accuracyExclNoScript),
      unheard_rate: round(real.unheard), no_script_rate: round(real.noScript), evidence_sentences: real.evidenceN,
      confusions: real.confusions,
      case_stripped: cs && { accuracy: round(cs.accuracy), collapsed_accuracy: round(cs.collapsed), unheard_rate: round(cs.unheard), first_decision_median: median(cs.firstDecisions), per_stream_accuracy: cs.perStreamAccuracy },
      arms: Object.fromEntries(Object.entries(stats).map(([n, a]) => [n, { accuracy: round(a.accuracy), precision: round(a.precision), unheard_rate: round(a.unheard), per_stream_accuracy: a.perStreamAccuracy, top_labels: a.confusions.slice(0, 3) }])),
      tests: Object.fromEntries(Object.entries(tests).map(([n, t]) => [n, { ...t, p_stream: round(t.p_stream, 6), ...(t.p_sentence != null ? { p_sentence: round(t.p_sentence, 6), p_vs_control_rate: round(t.p_vs_control_rate, 6) } : {}) }])),
      foreign,
      deranged_equalised: eqDetails,
      pass_deranged_equalised_only: eq ? Boolean(unheardOk && eq.beats) : null,
      licence: L,
    },
  };
}

// ── predictions (the header's, evaluated mechanically; never edited after a run) ──
const P_ACC = { eng: 0.85, spa: 0.85, arb: 0.70, "cmn-hans": 0.60, kor: 0.80, tur: 0.60 };
const P_UNHEARD = { eng: 0.25, spa: 0.25, arb: 0.25, "cmn-hans": 0.25, kor: 0.5, tur: 0.5 };
const P_MAJORITY = { eng: 0, arb: 0, "cmn-hans": 0, tur: 0, spa: 1, kor: 1 };
const P_STEMS = Object.keys(P_ACC);
/** the v1 view of a v2 card: the v1 pass, controls, licences and tests, so the v1 predictions are evaluated on the v1 rule (reported only) */
const v1View = (card) => { const v = card.details?.v1; return v ? { ...card, pass: v.pass, controls: { ...card.controls, ...v.controls }, details: { ...card.details, licence: { ...card.details.licence, ...v.licence }, tests: { ...card.details.tests, ...v.tests } } } : card; };
export function checkPredictions(card0) {
  const card = v1View(card0);
  const stem = card.stem, d = card.details ?? {}, out = [];
  const add = (id, text, held) => out.push({ id, text, held });
  const named = P_STEMS.includes(stem);
  if (named) {
    add("P1", "pass === true", card.pass == null ? null : card.pass === true);
    add("P2", `accuracy >= ${P_ACC[stem]}${stem === "cmn-hans" ? "; collapsed >= .90; swap_rate > 0" : ""}`, card.score == null ? null : card.score >= P_ACC[stem] && (stem !== "cmn-hans" || (d.collapsed_accuracy >= 0.9 && d.swap_rate > 0)));
    add("P3", `unheard < ${P_UNHEARD[stem]}`, d.unheard_rate == null ? null : d.unheard_rate < P_UNHEARD[stem]);
    const dl = d.licence?.deranged_priors?.licensed, dt = d.tests?.deranged_priors;
    add("P4", stem === "kor" ? "deranged control UNlicensed (one candidate)" : "deranged control licensed and loses (p<.05)", stem === "kor" ? dl === false : (dl == null ? null : dl === true && dt?.beats === true));
    const mj = card.controls?.majority_script;
    add("P5", `majority_script scores ${P_MAJORITY[stem]}${P_MAJORITY[stem] ? " (unlicensed)" : ""}`, mj == null ? null : mj === P_MAJORITY[stem] && (P_MAJORITY[stem] ? d.licence?.majority_script?.licensed === false : true));
    const sl = d.licence?.scrambled_text?.licensed;
    add("P6", stem === "cmn-hans" ? "scrambled_text UNlicensed (Han)" : "scrambled_text licensed", sl == null ? null : stem === "cmn-hans" ? sl === false : sl === true);
  }
  add("P7", "median first decision <= 3 sentences", d.first_decision?.median == null ? null : d.first_decision.median <= 3);
  if (d.family?.name === "Latin") add("P8", "case_stripped accuracy >= as-given (Latin)", d.case_stripped ? d.case_stripped.accuracy >= card.score : null);
  const de = d.deranged_equalised, k = d.family?.candidates?.length;
  if (de && !de.gap && k > 1) {
    add("A1-1", `equalised deranged control <= 2/k (= ${round(2 / k)}) and real beats it`, de.accuracy <= 2 / k && de.beats === true);
    if (card.score >= 0.95) add("A1-2", "pass_deranged_equalised_only === true (real >= .95)", d.pass_deranged_equalised_only === true);
  }
  const sw = d.switch;
  if (sw?.same && !sw.same.gap) add("P9a", `same-family median settle_B >= lenA/2 (${sw.same.lenA / 2}) or never`, sw.same.median_settle_B == null || sw.same.median_settle_B >= sw.same.lenA / 2);
  if (sw?.cross && !sw.cross.gap) add("P9b", "cross-family median settle_B <= 3 with zero revisions() events", sw.cross.median_settle_B != null && sw.cross.median_settle_B <= 3 && sw.cross.revisions_in_B === 0);
  return out;
}
const A2_TRUE = ["eng", "spa", "arb", "tur"], A2_NULL = ["kor", "cmn-hans", "cmn", "jpn", "heb", "ell"], A2_FP = { eng: 0.1, spa: 0.1, tur: 0.1, kor: 0.1, arb: 0.25 };
/** amendment A2's predictions, evaluated mechanically from the card (held: null = not shown) */
export function checkPredictionsA2(card) {
  const stem = card.stem, d = card.details ?? {}, out = [];
  const add = (id, text, held) => out.push({ id, text, held });
  const de = d.deranged_equalised, k = d.family?.candidates?.length;
  if (A2_TRUE.includes(stem)) {
    add("A2-1", "pass === true", card.pass == null ? null : card.pass === true);
    add("A2-3", "deranged_equalised accuracy <= 2/k", de && !de.gap && k > 1 ? de.accuracy <= 2 / k : null);
    add("A2-6", "scrambled_text licensed", d.licence?.scrambled_text?.licensed == null ? null : d.licence.scrambled_text.licensed === true);
  }
  if (A2_NULL.includes(stem)) add("A2-2", "pass === null with gap script_determined and aggregate_eligible === false", card.pass === null && (card.gaps ?? []).some((g) => g.reason === "script_determined") && card.aggregate_eligible === false);
  if (stem === "kor" || stem === "cmn-hans") {
    add("A2-6", "scrambled_text UNlicensed", d.licence?.scrambled_text?.licensed == null ? null : d.licence.scrambled_text.licensed === false);
    add("A2-7", "pass_v1 !== pass", d.pass_v1 === undefined ? null : d.pass_v1 !== card.pass);
  }
  if (A2_FP[stem] != null) add("A2-4", `foreign false-positive rate <= ${A2_FP[stem]}`, d.foreign?.false_positive_rate == null ? null : d.foreign.false_positive_rate <= A2_FP[stem]);
  if (["eng", "spa", "tur"].includes(stem)) add("A2-5", "char_bigram accuracy >= real accuracy - .02", d.arms?.char_bigram?.accuracy == null || card.score == null ? null : d.arms.char_bigram.accuracy >= card.score - 0.02);
  if (stem === "heb") { const y = d.oov?.per_language?.ydd; add("A2-8", "OOV Yiddish names_stem_rate <= .10", y?.names_stem_rate == null ? null : y.names_stem_rate <= 0.1); }
  return out;
}

/** sha256 of an amendment block ("A1", "A2"), so an edit to it after a run is visible */
export function blockDigest(file, tag) {
  const m = new RegExp(`// ═══ AMENDMENT ${tag}[\\s\\S]*?// ═══ END AMENDMENT ${tag}[^\\n]*\\n`).exec(fs.readFileSync(file, "utf8"));
  return m ? createHash("sha256").update(m[0]).digest("hex") : null;
}
export const amendmentDigest = (file) => blockDigest(file, "A1");
export const amendmentDigestA2 = (file) => blockDigest(file, "A2");

// ── the measurement ─────────────────────────────────────────────────────────
const textsOf = (stem, split) => { const f = conlluPath(stem, split); return f ? readConllu(f).map((s) => s.text).filter((t) => t && t.trim()) : null; };
const unmeasuredCard = (stem, split, detail) => ({ stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [{ reason: "unmeasured", count: 1, detail }], notes: [`unmeasured: ${detail} — a gap, not a pass`], details: { reason: detail } });
const typedGapCard = (stem, split, reason, detail, extra = {}) => ({ stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, aggregate_eligible: false, gaps: [{ reason, count: extra.count ?? 1, ...(extra.of != null ? { of: extra.of } : {}), detail }], notes: [`${reason}: ${detail}; nothing was run, a gap, not a pass`], details: { rule_version: A2P.RULE_VERSION, reason, detail, ...(extra.details ?? {}) } });

export async function measure({ stem, split = "dev", limit = null, streams = PARAMS.STREAMS, pin: pinOverride = null } = {}) {   // pinOverride: a test seam for the inventory refusal; production reads r0-inventory.json
  const t0 = Date.now(), c0 = process.cpuUsage();
  const ms = {};
  const lap = (name, f) => { const t = Date.now(); const r = f(); ms[name] = Date.now() - t; return r; };
  const inventory0 = availableStems().join(",");   // priors are read live from disk and other builders add languages: the live set is compared with the PIN (A2 D2) and again at the end
  try {
    const table = candidateTable();
    const family = familyOfStem(table, stem);
    if (!family) return unmeasuredCard(stem, split, "the stem has no candidate prior (typed gap: the listener cannot name a language it has no prior for)");
    const memo = new Map();
    const textsFor = (s) => { if (!memo.has(s)) memo.set(s, textsOf(s, split)); return memo.get(s); };
    const texts = textsFor(stem);
    if (!texts) return unmeasuredCard(stem, split, `no ${split} conllu for ${stem}`);
    const loaded = pinOverride ? { pin: pinOverride, sha256: sha256(JSON.stringify(pinOverride)) } : loadPin();
    if (!loaded) return typedGapCard(stem, split, "inventory_mismatch", `the pinned inventory ${PIN_FILE} is missing or unreadable: the candidate set is not declared`);
    const chk = checkPin(loaded.pin, table, stem);
    if (!chk.ok) return typedGapCard(stem, split, "inventory_mismatch", chk.problems.join("; "), { count: chk.problems.length, details: { inventory: { pin_sha256: loaded.sha256, involved_families: chk.involved, problems: chk.problems } } });
    const { streams: S, offsets } = makeStreams(texts, { streams, limit: limit ?? PARAMS.DEFAULT_LIMIT });
    if (!S.length) return unmeasuredCard(stem, split, `too few sentences (${texts.length}) for ${streams} streams`);
    const per = S[0].length;
    // D7: has the stem's own text any letter in a script the listener knows? does it agree with the prior's family?
    const famCount = {};
    for (const s of S.flat()) { const f = familyOf(s) ?? "none"; famCount[f] = (famCount[f] ?? 0) + 1; }
    const total = S.flat().length, noneN = famCount.none ?? 0;
    if (noneN / total > PARAMS.UNHEARD_MAX) return typedGapCard(stem, split, "listener_script_unsupported", `${noneN} of the ${total} sentences have no letter in a script the listener's family table knows (more than UNHEARD_MAX ${PARAMS.UNHEARD_MAX}; the prior is filed under ${family} by its own vocabulary)`, { count: noneN, of: total, details: { text_families: famCount, prior_family: family } });
    const dominant = Object.entries(famCount).filter(([f]) => f !== "none").sort((a, b) => b[1] - a[1])[0][0];
    if (dominant !== family) return typedGapCard(stem, split, "script_family_mismatch", `the text is mostly ${dominant} but the prior is filed under ${family}: the listener would consult the wrong candidates`, { count: total, of: total, details: { text_families: famCount, prior_family: family } });

    const factory = () => createLanguageListener({});
    const arms = {}, licence = {};
    const candidates = table[family].map((c) => c.stem);
    const k = candidates.length, single = k < 2;
    const majority = majorityLabel(table, family);
    const tableSizes = Object.fromEntries(table[family].map((c) => [c.stem, Object.keys(grammarFor(c.stem).posPrior.forms).length]));   // before any derangement
    const sizeRank = 1 + Object.values(tableSizes).filter((n) => n > tableSizes[stem]).length;

    // real arm, and the heard-rule view (case stripped)
    const real = lap("real", () => collect(S, factory));
    arms.real = real.map((r) => r.verdicts);
    arms.case_stripped = lap("case_stripped", () => collect(S, factory, (t) => t.toLowerCase()).map((r) => r.verdicts));
    // does the replica of the family agree with what the listener did? (every non-null verdict must be a candidate of the sentence's script)
    let replicaChecked = 0, replicaBroken = 0;
    S.forEach((sents, t) => sents.forEach((s, i) => { const v = arms.real[t][i]; if (!v.language) return; replicaChecked++; const f = familyOf(s); if (!(table[f] ?? []).some((c) => c.stem === v.language)) replicaBroken++; }));

    // control: scrambled text (v1 licence: coverage of the stem's own prior drops; the v2 licence is added in scoreR0)
    const scrambledS = S.map((sents, t) => sents.map((s, i) => scramble(s, mulberry32(hash32(PARAMS.SCRAMBLE_SEED, t, i)))));
    arms.scrambled_text = lap("scrambled_text", () => collect(scrambledS, factory).map((r) => r.verdicts));
    const covReal = streamCoverages(stem, S);
    licence.scrambled_text = { ...coverageDrop(covReal, streamCoverages(stem, scrambledS)), reason: "own-prior coverage must drop significantly under the scramble" };
    if (!licence.scrambled_text.licensed) licence.scrambled_text.reason = `the scramble did not significantly lower the stem's own-prior coverage (${licence.scrambled_text.mean_real} -> ${licence.scrambled_text.mean_perturbed}; sign p=${round(licence.scrambled_text.p, 4)})`;

    // control: majority script (no listening)
    arms.majority_script = S.map((sents) => sents.map((s) => { const f = familyOf(s); const l = f ? majorityLabel(table, f) : null; return l ? { language: l, gap: null } : { language: null, gap: f ? "language_unheard" : "no_script" }; }));
    licence.majority_script = { licensed: majority !== stem, label: majority, reason: majority === stem ? `its label for ${family} is ${majority}, the gold: a constant naming the gold cannot fail` : "its label is not the stem" };

    // controls: deranged priors. v1 = 3 seeds, strongest (REPORTED ONLY); A1/v2 = size-equalised, 4 seeds, mean (GATING). Only the stem's own family is deranged.
    const starts = startsOf(arms.real);
    if (single) {
      const why = `script family ${family} has one candidate (${candidates[0]}): deranging forms across languages of the same script is the identity`;
      licence.deranged_priors = { licensed: false, reason: why };
      licence.deranged_equalised = { licensed: false, reason: why };
    } else {
      try {
        const seedArms = {}, seedLicence = {};
        for (const seed of PARAMS.SEEDS) {
          const { value, perturbation } = lap(`deranged_v1_${seed}`, () => withDeranged(seed, () => ({ arm: collect(S, factory).map((r) => r.verdicts), cov: streamCoverages(stem, S) }), { only: family }));
          seedArms[seed] = value.arm;
          seedLicence[seed] = { ...coverageDrop(covReal, value.cov), perturbation: round(perturbation[stem]) };
        }
        const stats = Object.fromEntries(Object.entries(seedArms).map(([kk, v]) => [kk, armStats(v, stem, starts)]));
        const [bestSeed] = strongest(stats);
        arms.deranged_priors = seedArms[bestSeed];
        const all = Object.values(seedLicence);
        licence.deranged_priors = { licensed: all.every((x) => x.licensed), strongest_seed: Number(bestSeed), seeds: seedLicence, seed_accuracy: Object.fromEntries(Object.entries(stats).map(([kk, a]) => [kk, round(a.accuracy)])), reason: all.every((x) => x.licensed) ? "own-prior coverage drops significantly under every seed" : "the derangement did not significantly lower the stem's own-prior coverage under every seed" };
      } catch (e) {
        licence.deranged_priors = { licensed: false, reason: `control not buildable: ${String(e?.message ?? e)}` };
      }
      try {
        const eqArms = [], eqLicence = {};
        for (const seed of A1_SEEDS) {
          const { value, perturbation } = lap(`deranged_eq_${seed}`, () => withDeranged(seed, () => ({ arm: collect(S, factory).map((r) => r.verdicts), cov: streamCoverages(stem, S) }), { only: family, equalise: true }));
          eqArms.push(value.arm);
          eqLicence[seed] = { ...coverageDrop(covReal, value.cov), perturbation: round(perturbation[stem]) };
        }
        arms.deranged_equalised = eqArms;
        const all = Object.values(eqLicence);
        licence.deranged_equalised = { licensed: all.every((x) => x.licensed), seeds: eqLicence, reason: all.every((x) => x.licensed) ? "own-prior coverage drops significantly under every equalised seed" : "the equalised derangement did not significantly lower the stem's own-prior coverage under every seed" };
      } catch (e) {
        licence.deranged_equalised = { licensed: false, reason: `control not buildable: ${String(e?.message ?? e)}` };
      }
    }

    // reference: character-bigram identifier (TRAIN text only; not gating)
    if (single) licence.char_bigram = { licensed: false, reason: `${family} has one candidate: nothing to discriminate` };
    else {
      const cm = charModelFor(table, family);
      if (cm.gap) licence.char_bigram = { licensed: false, reason: cm.gap };
      else { arms.char_bigram = lap("char_bigram", () => collect(S, () => makeCharListener({ [family]: cm.model })).map((r) => r.verdicts)); licence.char_bigram = { licensed: false, role: "reference", trained_sentences: cm.trained_sentences, reason: "reference arm: reported, never gating" }; }
    }

    // negative arm: other languages' held-out text (gating, specificity)
    const partners = loaded.pin.foreign_partners[stem];
    const fo = foreignStreams(partners, textsFor, per);
    if (fo.streams.length) {
      arms.foreign = lap("foreign", () => collect(fo.streams, factory).map((r) => r.verdicts));
      const covF = streamCoverages(stem, fo.streams), covPaired = fo.streams.map((_, t) => covReal[t % covReal.length]);
      licence.foreign = { ...coverageDrop(covPaired, covF), plan: fo.plan, skipped: fo.skipped, reason: "the stem's own prior must attest significantly LESS of the foreign streams than of the real ones" };
      if (!licence.foreign.licensed) licence.foreign.reason = `the stem's own prior does not attest the foreign text significantly less (${licence.foreign.mean_real} -> ${licence.foreign.mean_perturbed}; sign p=${round(licence.foreign.p, 4)})`;
    } else licence.foreign = { licensed: false, plan: [], skipped: fo.skipped, reason: `no held-out ${split} text for any pinned partner (${partners.join(" ")})` };

    const card = scoreR0({ stem, streams: S, arms, licence, ctx: { k, single } });
    card.split = split;
    if (card.details.deranged_equalised) card.details.deranged_equalised = { ...card.details.deranged_equalised, table_size: Math.min(...Object.values(tableSizes)), seeds: [...A1_SEEDS] };
    else card.details.deranged_equalised = { gap: single ? "single_candidate" : "not_built", detail: licence.deranged_equalised?.reason };
    if (licence.deranged_priors?.licensed && card.details.tests?.deranged_priors && !card.details.tests.deranged_priors.beats && sizeRank === 1)
      card.notes.push(`size_confound: ${stem} has the LARGEST prior in ${family} (${tableSizes[stem]} forms); the v1 deranged control can name it by table size alone (v1 deranged_priors is reported only; the gating control is deranged_equalised)`);
    if (replicaBroken) card.notes.push(`replica check: ${replicaBroken}/${replicaChecked} verdicts named a language outside the sentence's script family`);

    // reported, not gating: out-of-inventory same-script text (UDHR) must come out as the typed gap, not as a candidate
    const oovCodes = loaded.pin.oov_udhr?.[family] ?? [];
    const oov = { codes: oovCodes, per_language: {} };
    for (const code of oovCodes) {
      const all = udhrSentences(code);
      const sents = (all ?? []).filter((s) => familyOf(s) === family).slice(0, A2P.OOV_MAX_SENTENCES);
      if (sents.length < 5) { oov.per_language[code] = { gap: all ? "too_few_sentences_in_script" : "no_udhr_file", n: sents.length }; continue; }
      const [{ verdicts }] = collect([sents], factory);
      const n = verdicts.length, silent = verdicts.filter((v) => v.language == null).length, named = {};
      for (const v of verdicts) if (v.language) named[v.language] = (named[v.language] ?? 0) + 1;
      oov.per_language[code] = { n, silent_rate: round(silent / n), names_stem_rate: round((named[stem] ?? 0) / n), names_any_rate: round((n - silent) / n), top_labels: Object.entries(named).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label, c]) => ({ label, count: c })) };
    }
    if (!oovCodes.length) { oov.gap = "no_oov_text"; card.gaps.push({ reason: "no_oov_text", count: 1, detail: `no out-of-inventory ${family} text on disk: the refusal test (a language with no prior must be a typed gap) is unmeasured for ${stem}` }); }
    for (const [code, r] of Object.entries(oov.per_language)) if (r.names_any_rate > 0) card.gaps.push({ reason: "oov_named_a_candidate", count: Math.round(r.names_any_rate * r.n), of: r.n, detail: `${code} has no prior but its sentences were named ${r.top_labels.map((l) => `${l.label} (${l.count})`).join(", ")}: a candidate's grammar was applied to a language it was not built from (Greenberg); reported, not gating` });
    card.details.oov = oov;

    Object.assign(card.details, {
      prereg_sha256: headerDigest(fileURLToPath(import.meta.url)),
      prereg_amendment_a1_sha256: amendmentDigest(fileURLToPath(import.meta.url)),
      prereg_amendment_a2_sha256: amendmentDigestA2(fileURLToPath(import.meta.url)),
      split, source_sentences: texts.length, offsets, requested_limit: limit ?? PARAMS.DEFAULT_LIMIT,
      family: { name: family, candidates, single_candidate: single, majority_label: majority, table_sizes: tableSizes, size_rank: sizeRank },
      replica: { checked: replicaChecked, broken: replicaBroken },
      listener_revisions_per_stream: real.map((r) => r.revisions.length),
      text_families: famCount,
      params: { ...PARAMS, SWITCH: { ...PARAMS.SWITCH }, A2: { ...A2P } },
    });

    // the switch (measured, not gated)
    const sw = {};
    const sameP = SAME_FAMILY[stem] ?? null, crossP = family === "Latin" ? "rus" : "eng";
    const trySwitch = (partner) => {
      if (!partner || partner === stem) return { gap: "no_partner" };
      const tb = textsFor(partner);
      if (!tb) return { gap: "unmeasured", detail: `no ${split} conllu for ${partner}` };
      const r = lap(`switch_${partner}`, () => runSwitch({ stemA: stem, textsA: texts, stemB: partner, textsB: tb, factory }));
      return r.gap ? r : { partner, ...r };
    };
    sw.same = sameP ? trySwitch(sameP) : { gap: "no_same_family_partner", detail: `${family} has ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}; no partner declared for ${stem}` };
    sw.cross = trySwitch(crossP);
    card.details.switch = sw;
    for (const [kind, r] of Object.entries(sw)) if (r.gap) card.gaps.push({ reason: `switch_${kind}_${r.gap}`, count: 1, ...(r.detail ? { detail: r.detail } : {}) });

    card.details.predictions = checkPredictions(card);          // v1's, evaluated on the v1 rule (reported only)
    card.details.predictions_a2 = checkPredictionsA2(card);
    if (!P_STEMS.includes(stem)) card.notes.push("no pre-registered per-stem prediction for this stem: exploratory (P7-P9 still apply)");
    const inventory1 = availableStems().join(",");
    card.details.inventory = { pin_sha256: loaded.sha256, pin_file: path.basename(PIN_FILE), involved_families: chk.involved, pinned_candidates: Object.values(loaded.pin.families).flat().length, stems: inventory0.split(","), changed_during_run: inventory0 !== inventory1 };
    if (inventory0 !== inventory1) { card.notes.push(`the prior inventory CHANGED while this card ran (${inventory0.split(",").length} -> ${inventory1.split(",").length} stems): candidate sets may differ between arms; rerun`); card.gaps.push({ reason: "inventory_changed_during_run", count: 1 }); }
    const cpu = process.cpuUsage(c0);
    card.details.ms = Date.now() - t0;
    card.details.ms_by_step = ms;
    card.details.cpu_ms = Math.round((cpu.user + cpu.system) / 1000);
    return card;
  } catch (e) {
    return { ...unmeasuredCard(stem, split, `instrument error: ${String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")}`), details: { error: String(e?.message ?? e) } };
  }
}

// ── CLI: node eval/competence/r0-identify.mjs --stem eng [--split dev|test] [--limit N] [--streams N] [--all] [--print-inventory] ──
async function main() {
  const args = parseArgs();
  const argv = process.argv.slice(2);
  const sIdx = argv.indexOf("--streams");
  const streams = sIdx >= 0 ? Number(argv[sIdx + 1]) : PARAMS.STREAMS;
  const split = args.split ?? "dev";
  if (args.flags.has("print-inventory")) { console.log(JSON.stringify(buildPin(), null, 2)); return; }
  let stems;
  if (args.all) {
    const have = new Set(availableStems());
    stems = Object.keys(candidateTable()).flatMap((f) => candidateTable()[f].map((c) => c.stem)).filter((s) => have.has(s)).sort();
  } else if (args.stem) stems = [args.stem];
  else { console.error("usage: node eval/competence/r0-identify.mjs --stem <stem> [--split dev|test] [--limit N] [--streams N] [--all] [--print-inventory]"); process.exit(2); }
  for (const stem of stems) {
    const card = await measure({ stem, split, limit: args.limit, streams });
    writeResult(RUNG.id, stem, split, card);
    console.log(JSON.stringify(card));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
