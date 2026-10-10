// eval/competence/r1-hear.mjs — RUNG R1, HEAR WORDS: does the EAR put word
// boundaries (and split bound morphemes) where the treebank's own syntactic
// words put them, on HELD-OUT sentences the priors never saw?
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run of this instrument on any text. Nothing below is
// tuned after a result; a prediction that fails is reported as failed. The sha256
// of this leading comment block is stamped into every result
// (details.prereg_sha256), so a post-hoc edit of the claim is visible.
//
// DISCLOSURE. Before this header was written I read the first lines of several
// dev conllu files (kor, arb, heb, spa, cmn-hans, jpn, vie) and counted their
// multi-word-token ("N-M") lines (eng 359, arb 4010, spa 1262, heb 2502, fra 1057,
// ita 775, por 2393, deu 164, kor 0, cmn-hans 0, jpn 0, vie 0). No ear, segmenter
// or arm of this file had been run on any text. Instrument bugs found later by
// the toy-fixture tests (tests/competence-r1.test.js) are fixed in code; no
// declared constant below is ever changed after a dev/test number is seen. Any
// change after the first dev run is listed in the report that accompanies it.
//
// CLAIM
//   adapters/text/ear.js::makeEar({posPrior, proclitics, enclitics}) — the ear a
//   language's received grammar builds (the-fold/language-grammar.js::grammarFor),
//   reached the way production reaches it (active-ear.js: withEar + hear, i.e.
//   lower-case -> segment -> peel) — puts boundaries where the UD gold puts them,
//   where the language NEEDS an ear (an unspaced script, or bound morphemes), and
//   does no harm where it needs none. The claim can fail: an ear that is inert,
//   or whose boundaries are wrong, or that does no better than a wrong-language
//   or scrambled lexicon, fails.
//
// WHAT IS FED (causal, S3). Each held-out sentence (the "# text =" line of
//   <stem>/<split>.conllu) is heard ALONE: the ear is a function of the sentence
//   and the received prior only. No whole-text statistic, no neighbouring
//   sentence, no gold, reaches any arm. (There is no lookahead variant here.)
//   HEARD RULE (READING-POLICY 4): the text is case-folded per code point
//   (length-preserving) before every arm, so no arm can use capitals.
//
// THE TOKENISER (shared by every arm but one). After the arm's own preparation
//   the heard string is cut into units by the PRODUCTION being-tier tokeniser
//   (heard-nominals.js / listening-cast.js UNIT):
//        /[\p{L}\p{M}\p{N}'’]+|[^\s\p{L}\p{M}\p{N}]/gu
//   i.e. a word is a maximal letter/mark/number/apostrophe run, every other
//   non-space character is a unit of its own. So the arms differ ONLY in what the
//   ear did to the string before this one tokeniser. (Hence the no-ear arm puts a
//   boundary at EVERY position except inside a letters-run: that is exactly the
//   set of places only an ear can add.)
//
// GOLD AND METRIC (character-offset boundary F1).
//   Stream: the sentence's non-whitespace code points (case-folded), N of them.
//   A BOUNDARY is a position k, 0<k<N, between code points k-1 and k.
//   DOMAIN: positions where at least one neighbour is a word character
//   (/[\p{L}\p{M}\p{N}'’]/); punctuation-punctuation positions (conventions for
//   "..." or ")." differ by treebank) are out of domain for EVERY arm, and so are
//   positions strictly inside an unrepresentable multi-word token (below).
//   GOLD positive at k: a UD syntactic-word ends at k, where words are aligned to
//   the text by their FORMs (unaligned sentences are dropped and counted):
//     · a plain token ends a unit; Vietnamese-style tokens that contain spaces
//       are one unit (no gold boundary at their inner space);
//     · an MWT range line ("N-M", Arabic/Hebrew/Spanish clitics, English n't):
//       if its component FORMs have the same total code-point length as the
//       surface form (length-preserving, so Arabic ى/ي and hamza normalisation
//       align), a boundary falls at each cumulative component end; otherwise
//       (del = de+el, au = à+le, Hebrew elided ה) the split is UNREPRESENTABLE for
//       an ear that only inserts spaces: its inner positions are masked from the
//       domain and counted as a typed gap (mwt_nonconcatenative), never scored,
//       never passed;
//     · Korean (tier "josa", the main tier): a token whose LEMMA morphs ("a+b")
//       and XPOS tags ("NNG+JKS") agree in number and whose trailing tags are
//       Sejong particle (josa, "J*") tags is split between stem and particle(s)
//       when the morphs concatenate EXACTLY to the surface; otherwise masked.
//       Tier "all" (secondary, reported in details only) splits at every "+".
//   MAIN METRIC `score`: micro F1 over all domain positions of the sample,
//   F1 = 2TP/(2TP+FP+FN) (TP: gold and predicted; FP: predicted only; FN: gold
//   only). SECONDARY (details): the same restricted to INSIDE-RUN positions (two
//   word characters with no whitespace between them) — the ear's own sites;
//   per-kind recall (plain token / MWT inner / Korean morph).
//   SAMPLE: `limit` takes sentences at evenly spaced strides over the whole split
//   (deterministic, spans the genres), never the first N.
//
// ARMS
//   real          the stem's own ear (grammarFor(stem) -> makeEar), production path.
//   CONTROLS, BUILT TO FAIL (II.23):
//   no_ear        the same case-folded text, no ear, the same tokeniser
//                 (letters-only tokenisation) — the PRIMARY control.
//   whitespace    case-folded text split on whitespace only (punctuation stays
//                 glued to words): the weaker, older baseline.
//   deranged_lexicon  the SAME ear machinery with the stem's own affix lists but
//                 the POS prior (the lexicon the segmenter and the peel validate
//                 against) of ANOTHER language: the same-script, different-language
//                 prior sharing the most forms with the target's 3000 most
//                 frequent. If no other language shares the script (Korean,
//                 Hebrew, Greek...) the arm is a typed gap, not silently inert.
//   scrambled_lexicon the same ear with the stem's own lexicon AND affixes passed
//                 through one seeded character derangement per script (word
//                 lengths, counts, structure intact; the words are not the
//                 language's): "right machinery, wrong knowledge".
//   random_boundaries as many boundaries per sentence as the real ear placed in
//                 the domain, at seeded random domain positions: the metric's own
//                 chance floor.
//   MUTATION (the licence for the harness): the real ear with segment and peel
//                 deliberately disabled, through the same arm code. It must
//                 reproduce the no_ear counts EXACTLY, sentence for sentence. If
//                 it does not, something other than the ear moves the score:
//                 pass = false, rule "instrument_broken".
//
// NEEDS AN EAR (derived from the material, not from a language code).
//   need_share = (U + X) / (Gd + X), with Gd the gold boundaries in domain, U
//   those of them strictly inside a letters-run (what the no-ear arm cannot place)
//   and X the unrepresentable MWT component splits. NEEDS := need_share >= 0.02
//   (NEED_FLOOR, declared: at least one gold boundary in fifty is somewhere only
//   an ear could put it; PROVISIONAL, P4).
//   EAR ACTIVE := the real ear's boundary set differs from the no-ear arm's on at
//   least one sentence (decided from the outputs, not from the ear's fields).
//
// PASS RULE (per stem, on the sample; the same on dev and test)
//   Delta(c) = F1(real) - F1(c) with a PAIRED bootstrap over sentences (B = 1000
//   resamples, seed 20260101, 95% percentile interval [lo_c, hi_c]).
//   0. mutation arm != no_ear anywhere                        -> pass = false.
//   1. NEEDS and active : pass iff lo_c > 0 for EVERY control c that exists
//        (no_ear, whitespace, deranged_lexicon, scrambled_lexicon,
//        random_boundaries) AND Delta(no_ear) >= 0.01 (MIN_EFFECT, declared: a
//        gain under one F1 point is not claimed however many sentences there are).
//   2. NEEDS and inert  : pass = false (typed gap ear_inert: the gold hears
//        boundaries the reader does not).
//   3. not NEEDS and active : pass iff hi_{no_ear} >= 0 (the ear is not
//        significantly below the control: no harm).
//   4. not NEEDS and inert  : pass = null with the typed gap ear_inert_not_needed.
//        DEVIATION FROM THE BRIEF, declared: the brief says "pass iff not below
//        the control", which an inert ear satisfies by construction (real == control
//        sentence for sentence). II.23 says a control equal to the real arm cannot
//        license a pass, and the ladder aggregator marks a pass with margin <= 0
//        invalid; so the vacuous case is reported as not-exercised, never as good.
//   `control` = the highest F1 among the existing controls; margin = score - control.
//
// GAPS (typed, with denominators; "unmeasured" is never "good")
//   ear_inert, ear_inert_not_needed, mwt_nonconcatenative (count = unrepresentable
//   splits, tokens = MWT tokens masked), boundaries_unheard (gold inside-run
//   boundaries the real ear missed, of the gold inside-run total),
//   gold_unaligned (sentences dropped), arm_stream_mismatch, no_same_script_donor,
//   language_unheard (no prior for the stem), unmeasured (no gold on disk).
//
// PARAMETERS (declared; every bare number is PROVISIONAL, P4)
//   NEED_FLOOR 0.02, MIN_EFFECT 0.01, bootstrap B 1000, seed 20260101, CI 95%,
//   scramble seed 101, random seed 202, donor-overlap top-N 3000.
//
// PREDICTIONS (my guesses before running; failures are reported as failures)
//   P1  cmn-hans, cmn, jpn: NEEDS, ear active, pass = true. no_ear F1 <= 0.40;
//       real F1 in [0.60, 0.92]; scrambled_lexicon within 0.05 of no_ear; the
//       deranged lexicon (jpn<->cmn) at least 0.05 below real.
//   P2  kor: NEEDS (need_share in [0.10, 0.45]), ear active, pass = true.
//       Inside-run precision of the real ear >= 0.50 (UNCERTAIN: enclitic peel may
//       fire on stems that merely end in a particle-shaped syllable).
//   P3  arb: NEEDS (need_share >= 0.10), ear active; pass is a COIN FLIP (0.5).
//       The ear peels proclitic letters only (never the clitic pronoun suffixes
//       the gold also splits) and may peel stem-initial letters whose remainder is
//       attested. Inside-run recall <= 0.5.
//   P4  heb: as arb (coin flip), with a share of its MWTs masked as non-
//       concatenative (elided ה).
//   P5  spa: ear inert; NEEDS (al/del are unrepresentable; verb+clitic splits are
//       inside-run) -> pass = false with gaps ear_inert and mwt_nonconcatenative.
//       If need_share < 0.02 the result is pass = null instead.
//   P6  eng: ear inert; apostrophe clitics the gold splits (n't, 's, 're, 'm, 'll,
//       'd, 've; cannot, gonna) make need_share >= 0.02 -> pass = false (no clitic
//       ear). If need_share < 0.02, pass = null.
//   P7  the mutation arm equals no_ear exactly on every stem (harness licence).
//   P8  random_boundaries F1 <= 0.5 x real F1 on every stem with an active ear.
//   P9  gold alignment drops < 5% of sentences on every stem (instrument health).
//
// KNOWN LIMITS FIXED IN ADVANCE
//   A joiner (Vietnamese syllables -> words) is outside this ear's remit: its
//   precision shortfall shows up as FP in every arm and is reported in
//   details.arms, not fixed here. The ear inserts spaces; it cannot rewrite
//   (de el). Sentences within a document are not independent, so the bootstrap
//   interval is optimistic. Dev only until the final card.
//
// ═══ AMENDMENT v2 — 2026-10-06 (II.5: written BEFORE any v2 arm, licence or leakage check was run) ═══
// The v1 header above (sha256 30a3b1aa9b0bd6b8c6f724f20c9cd25e4647077e76432f8e5963515ca71b60d1) is kept
// verbatim. Where this amendment and the text above disagree, THIS SECTION GOVERNS; every other sentence
// above still stands. WHY the v1 rule was wrong (an independent review of the v1 instrument, five findings):
//   F1  no LEXICON-FREE affix control. The only lexicon-damaged arm of the peel languages (kor, heb, arb) was
//       scrambled_lexicon, which scrambles the AFFIXES too and so makes the ear inert (kor 0.8491 vs no_ear
//       0.8492: "beats scrambled" was "beats no_ear"). A greedy stripper with no lexicon check, run once by the
//       reviewer on 300 dev sentences, beat the real kor ear (all-domain F1 0.951 vs 0.896; inside-run 0.816 vs
//       0.462). The v1 pass for kor/heb/arb was not shown to be licensed by the prior's knowledge.
//   F2  the v1 headline F1 counted boundaries the INPUT hands over (whitespace, punctuation edges), placed
//       identically by every arm; for spaced scripts it mostly scored the text's own spaces (kor score 0.896 with
//       inside-run F1 0.462). The no_ear arm has inside-run F1 exactly 0 by construction, so "beats no_ear" is
//       not skill; on cmn-hans random_boundaries (0.657) outscored no_ear (0.387).
//   F3  the v1 "mutation" arm (segment = peel = null through withEar) is byte-identical to no_ear BY
//       CONSTRUCTION: it checks the harness plumbing, it does not show the statistic moving under a
//       perturbation of the MECHANISM (II.23).
//   F4  no all-boundaries control: for lzh (gold ~ single characters) splitting every code point is nearly as
//       good (reviewer: real 0.9718 vs every_char 0.9611 on full lzh dev; paired delta 0.0107).
//   F5  no train/dev leakage check: dev sentences that are verbatim train sentences were scored as held-out
//       (reviewer's exact-text counts: lzh 916 of 6102, eng 67 of 2001, arb 4 of 909, kor-GSD 6 of 950).
// DISCLOSURE. v1 dev cards exist for ~50 stems and were read; the reviewer's scratch numbers above were read.
// So the v2 predictions below for kor/heb/arb/lzh and the leakage counts are CONFIRMATORY, not blind.
// No v1 constant (NEED_FLOOR, MIN_EFFECT, B, seeds, donor top-N) is changed, and nothing below weakens a v1
// rule: v2 only ADDS controls, ADDS a licence gate, and MOVES the headline to the sites where an ear works.
//
// v2 DEFINITIONS
//   SITES. Inside-run positions (a word character on both sides, no whitespace in the input between them:
//     the only positions where an ear can ADD a boundary) PLUS one forced miss per unrepresentable MWT split
//     (X: gold de|el, a|le that an ear which only inserts spaces cannot place; a false negative of EVERY arm,
//     not a mask). Counts: tp, fp at inside-run positions; fn = inside-run misses + X.
//   HEADLINE. `score` = site F1 of the real arm; `controls` and `control` are site F1s too. The v1 all-domain
//     F1 is SECONDARY (details.all_domain) and still decides rule 3 (no harm), because harm an ear does shows
//     as false boundaries against the free boundaries the input already has. `margin` = score - control.
//   ARMS ADDED (every arm goes through the same evaluateSentences and the same tokeniser)
//     every_char        a space between every non-space code point (all boundaries). No-split baseline = no_ear.
//     random_inside_run as many boundaries per sentence as the real ear placed inside-run, at seeded random
//                       inside-run positions: the site-level chance floor. (The v1 all-domain random arm is
//                       kept for the secondary table.)
//     affix_only        the stem's own train-derived affixes with NO lexicon check: the proclitic rule of the
//                       real ear (first character in the set, word >= 3 characters) else the longest enclitic
//                       the word ends in (word longer than the enclitic), stripped ONCE. These are the real
//                       ear's own length floors, so the only difference between real and affix_only is the
//                       lexicon check. Only for stems with an affix list (typed gap no_affix_lists otherwise).
//     right_affixes_wrong_lexicon  the real affixes, the lexicon (posPrior.forms) passed through the same seeded
//                       per-script derangement as scrambled_lexicon, the affixes left intact.
//     scrambled_lexicon KEPT, as the separate all-scrambled arm (lexicon AND affixes).
//   MECHANISM MUTATIONS (the licence; they are not controls, they must LOWER the score):
//     dose_10, dose_50  the real ear with a seeded, NESTED random 10% / 50% of the lexicon's forms (affixes
//                       intact). Dose-response must be strictly monotone on site F1: F1(dose_10) < F1(dose_50)
//                       < F1(real).
//     shifted_one       the real ear's own boundaries (those inside an input letters-run) each moved one code
//                       point to the right. Delta(real - shifted_one) must have a 95% paired lower bound > 0.
//     wrong_affixes     the real lexicon, the affix characters passed through the same derangement as
//                       scrambled_lexicon (the 2x2 completes: real/real, wrong-lexicon/right-affixes,
//                       right-lexicon/wrong-affixes, wrong/wrong). Delta(real - wrong_affixes) lower bound > 0;
//                       only for stems with an affix list. (v2 swaps affixes through a derangement, not with
//                       another language's list: Hebrew/Arabic/Persian single-letter proclitic sets overlap, and
//                       Hangul has no donor, so a swap would be a no-op or impossible; the derangement is a
//                       strictly stronger perturbation.)
//     plumbing_ear_disabled  the v1 mutation arm, RENAMED: it must equal no_ear exactly. It checks the plumbing
//                       and is NOT the mechanism licence (F3).
//     LICENCE (only for an active ear; an inert ear has nothing to license) := dose-response monotone AND
//     shifted_one lower bound > 0 AND (when affixes exist) wrong_affixes lower bound > 0.
//   LEAKAGE. Before sampling, dev/test sentences whose whitespace-normalised "# text" equals a TRAIN sentence's
//     are removed (train = tb/<stem>/train.conllu and every tb/<stem>-<name>/train.conllu that is not itself a
//     stem, e.g. kor-gsd). Gap <split>_train_overlap {count, of}; no train file on disk: gap leakage_unchecked.
//     Only the stripped sample is scored; the pass rule reads only that.
//   PARAMETERS ADDED (declared, PROVISIONAL, P4): DOSE_FRACTIONS 0.1 and 0.5, DOSE_SEED 303, SHIFT_CP 1,
//     RANDOM_INSIDE_SEED = RANDOM_SEED + 1000003. Affix floors are the real ear's own (ear.js, heard-surfaces.js).
//
// PASS RULE v2 (replaces rules 0-1; rules 2-4 stand, and rule 3 reads the all-domain no_ear interval)
//   0. plumbing_ear_disabled != no_ear anywhere                                          -> pass = false.
//   1. NEEDS and active: pass = false when the LICENCE fails (rule licence_failed). Otherwise pass iff
//        (a) lo_c > 0 for EVERY control c that exists, on site F1: no_ear, whitespace, every_char,
//            random_inside_run, scrambled_lexicon, deranged_lexicon, right_affixes_wrong_lexicon, affix_only;
//        (b) margin = score - control >= MIN_EFFECT (0.01), where `control` is the highest site F1 among the
//            NON-TRIVIAL controls (every control except no_ear and whitespace, which are floors that place no
//            inside-run boundary at all). no_ear is never the reference.
//   `control` = max over the non-trivial controls. A gap lexicon_gate_loses_to_naive_stripping is emitted
//   whenever affix_only's site F1 exceeds the real ear's; a gap ear_adds_little_over_trivial_splitting whenever
//   real - every_char < MIN_EFFECT. When the stem has no site gold (U + X = 0) score is null and pass is null
//   (gap no_site_gold): a verdict is never given on an empty denominator.
//
// PREDICTIONS v2 (guesses before the first v2 run; failures are reported as failures)
//   V1  kor: affix_only site F1 > real site F1 (confirmatory of the reviewer): pass = false, gap
//       lexicon_gate_loses_to_naive_stripping.
//   V2  arb, heb: affix_only has higher inside-run recall than the real ear; whether it also beats it on site F1
//       is a coin flip (p = 0.5); pass = the coin.
//   V3  cmn-hans, cmn, jpn: pass = true (real beats every_char by > 0.05 on site F1; reviewer on cmn-hans/jpn
//       all-domain: every_char 0.767/0.750 vs real 0.941/0.965); the licence holds.
//   V4  lzh: real - every_char < 0.02 on the leak-stripped sample; p(pass = false) = 0.6, and if it passes the
//       margin is < 0.02.
//   V5  eng, spa: ear inert. eng pass = null (need_share < 0.02); spa pass = false (needs, inert); site F1 of the
//       real arm is 0 and below every_char: an inert ear has no site skill.
//   V6  licence: dose-response strictly monotone on every active stem (p = 0.9 for a segmenter, 0.7 for a peel
//       ear); shifted_one lower bound > 0 everywhere (p = 0.95); wrong_affixes lower bound > 0 on arb, heb, kor
//       (p = 0.8).
//   V7  plumbing_ear_disabled equals no_ear exactly on every stem.
//   V8  right_affixes_wrong_lexicon is far below real on kor, arb, heb (lo > 0, p = 0.85); scrambled_lexicon
//       stays about equal to no_ear on kor (all-domain, v1: 0.8491 vs 0.8492).
//   V9  leakage counts reproduce the reviewer's: eng 67 of 2001, arb 4 of 909, kor 6 of 950 (GSD train), cmn-hans
//       0 of 500, spa 0 of 1654.
// ═══ END PREREGISTRATION ═══════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grammarFor, availableStems, PRIORS_DIR } from "../../the-fold/language-grammar.js";
import { makeEar } from "../../adapters/text/ear.js";
import { hear, withEar } from "../../adapters/text/active-ear.js";
import { conlluPath, readConllu, mulberry32, derangement, parseArgs, writeResult, headerDigest, TB_DIR } from "./lib.mjs";

// (v2 note: the ADDENDUM below describes the v1 descriptive fields; under the v2 amendment `chance_corrected` is
// reported against random_inside_run and every_char on the SITES as well, and the all-domain fields live in
// details.all_domain. Nothing in it is a rule.)
// ADDENDUM (written after the first dev run; NOT part of the pre-registration, so it is outside
// the stamped header block and no declared constant or rule above was changed). Added as
// DESCRIPTIVE statistics only, because the first dev run showed they were needed to read it:
//   details.need.ci95 / borderline   — bootstrap interval of need_share (deu, spa sit at the floor);
//   details.need.inside_apostrophe   — gold inside-run boundaries next to an apostrophe (French/Italian
//                                      elision, but also ASCII quote marks in deu/hin: not bound morphemes);
//   details.residual + gaps tokeniser_cuts_gold_word / gold_word_spans_space — FP of the no-ear arm split
//                                      by whether whitespace was there (Persian ZWNJ; Vietnamese words);
//   details.chance_corrected         — (F1 - F1_random)/(1 - F1_random): random_boundaries scored 0.65 on
//                                      cmn-hans, so the absolute F1 of a dense-gold script is not its skill.
// The pass rule is unchanged: it reads the point estimate of need_share, never the interval.

export const RUNG = Object.freeze({
  id: "r1",
  name: "hear words",
  question: "Does the ear put word boundaries and split bound morphemes where the treebank's syntactic words do, on held-out sentences, better than the same text without the ear and better than a wrong-lexicon ear?",
});

export const PARAMS = Object.freeze({
  NEED_FLOOR: 0.02,
  MIN_EFFECT: 0.01,
  BOOTSTRAP_B: 1000,
  BOOTSTRAP_SEED: 20260101,
  CI: 0.95,
  SCRAMBLE_SEED: 101,
  RANDOM_SEED: 202,
  DONOR_TOP: 3000,
  // v2 (see AMENDMENT v2 in the header): all declared before any v2 run
  DOSE_FRACTIONS: Object.freeze([0.1, 0.5]),
  DOSE_SEED: 303,
  SHIFT_CP: 1,
  RANDOM_INSIDE_SEED: 202 + 1000003,
});

const HERE = fileURLToPath(import.meta.url);

// ── characters, streams ─────────────────────────────────────────────────────
const WORD_CP = /^[\p{L}\p{M}\p{N}'’]$/u;
const APOSTROPHE = /^['’]$/u;
const SPACE_CP = /^\s$/u;
const UNIT = /[\p{L}\p{M}\p{N}'’]+|[^\s\p{L}\p{M}\p{N}]/gu;

/** Length-preserving lower-casing of one code point (İ -> i̇ would change the count, so it stays). */
const foldCp = (ch) => { const l = ch.toLowerCase(); return l === ch ? ch : ([...l].length === 1 ? l : ch); };
export const foldText = (text) => [...String(text ?? "")].map(foldCp).join("");

/** The non-whitespace code points of a text, and for each whether whitespace preceded it. */
export function streamOf(text) {
  const cps = [], ws = [];
  let gap = false;
  for (const ch of String(text ?? "")) {
    if (SPACE_CP.test(ch)) { gap = true; continue; }
    ws.push(gap && cps.length > 0 ? 1 : 0);
    cps.push(ch);
    gap = false;
  }
  return { cps, ws };
}

const nonSpace = (s) => [...String(s ?? "")].filter((c) => !SPACE_CP.test(c));
const sameCp = (a, b) => a === b || foldCp(a) === foldCp(b);
const matchAt = (cps, p, f) => {
  if (p + f.length > cps.length) return false;
  for (let i = 0; i < f.length; i++) if (!sameCp(cps[p + i], f[i])) return false;
  return true;
};

// ── gold from CoNLL-U ───────────────────────────────────────────────────────
/** The surface units of a sentence: MWT ranges (with their component words) and plain tokens, in order. */
export function unitsOf(sent) {
  const byStart = new Map((sent.ranges ?? []).map((r) => [r.from, r]));
  const out = [];
  const toks = sent.tokens ?? [];
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    const r = byStart.get(t.id);
    if (r) {
      const comps = toks.filter((x) => x.id >= r.from && x.id <= r.to);
      out.push({ form: r.form, comps, tok: null });
      i += Math.max(1, comps.length);
    } else { out.push({ form: t.form, comps: null, tok: t }); i += 1; }
  }
  return out;
}

export const KIND = Object.freeze({ token: 1, mwt: 2, morph: 3 });

/**
 * buildGold(sent, {tier}) → { ok:true, N, cps, ws, G, mask, dom, inside, stats } | { ok:false, error }
 *   G[k]  0 = no gold boundary at k, else KIND (1 token end, 2 MWT inner, 3 morph inner)
 *   tier  "josa" (default) | "all" | "none" — which "+"-morph splits (Korean lemma column) count
 */
export function buildGold(sent, { tier = "josa" } = {}) {
  if (!sent?.text) return { ok: false, error: "no_text" };
  const { cps: raw, ws } = streamOf(sent.text);
  const cps = raw.map(foldCp);
  const N = cps.length;
  const G = new Uint8Array(N + 1);
  const mask = new Uint8Array(N + 1);
  const stats = { mwt_concat_splits: 0, mwt_nonconcat_splits: 0, mwt_nonconcat_tokens: 0, morph_aligned: 0, morph_unaligned: 0, morph_candidates: 0 };
  const setG = (k, kind) => { if (k > 0 && k < N && !G[k]) G[k] = kind; };
  let p = 0;
  for (const u of unitsOf(sent)) {
    const f = nonSpace(u.form).map(foldCp);
    if (!f.length || !matchAt(cps, p, f)) return { ok: false, error: "gold_unaligned" };
    const len = f.length;
    if (u.comps) {
      const lens = u.comps.map((c) => nonSpace(c.form).length);
      const sum = lens.reduce((a, b) => a + b, 0);
      if (u.comps.length > 1 && sum === len) {
        let q = p;
        for (let i = 0; i < lens.length - 1; i++) { q += lens[i]; setG(q, KIND.mwt); }
        stats.mwt_concat_splits += lens.length - 1;
      } else if (u.comps.length > 1) {
        for (let q = p + 1; q < p + len; q++) mask[q] = 1;
        stats.mwt_nonconcat_splits += u.comps.length - 1;
        stats.mwt_nonconcat_tokens += 1;
      }
    } else if (tier !== "none" && u.tok && typeof u.tok.lemma === "string" && u.tok.lemma.includes("+") && typeof u.tok.xpos === "string") {
      const morphs = u.tok.lemma.split("+");
      const tags = u.tok.xpos.split("+");
      if (morphs.length >= 2 && morphs.length === tags.length && morphs.every((m) => m.length > 0)) {
        let first = 1; // first morph index whose left edge is a gold boundary
        let eligible = true;
        if (tier === "josa") {
          let i = tags.length;
          while (i > 0 && tags[i - 1].startsWith("J")) i--;   // Sejong J* = particle (josa)
          if (i === tags.length || i === 0) eligible = false; // no particle tail: not a josa split
          else first = i;
        }
        if (eligible) {
          stats.morph_candidates += 1;
          const exact = morphs.join("") === f.join("");   // exact: jamo-level fusions (가깝+ㄴ) are not substrings
          if (exact) {
            let q = p;
            const lens = morphs.map((m) => [...m].length);
            for (let k = 0; k < lens.length - 1; k++) { q += lens[k]; if (k + 1 >= first) setG(q, KIND.morph); }
            stats.morph_aligned += 1;
          } else {
            for (let q = p + 1; q < p + len; q++) mask[q] = 1;
            stats.morph_unaligned += 1;
          }
        }
      }
    }
    p += len;
    setG(p, KIND.token);
  }
  if (p !== N) return { ok: false, error: "gold_unaligned" };
  const isW = cps.map((c) => WORD_CP.test(c));
  const dom = new Uint8Array(N + 1);
  const inside = new Uint8Array(N + 1);
  for (let k = 1; k < N; k++) {
    if (mask[k]) continue;
    if (isW[k - 1] || isW[k]) { dom[k] = 1; if (isW[k - 1] && isW[k] && !ws[k]) inside[k] = 1; }
  }
  return { ok: true, N, cps, ws, G, mask, dom, inside, stats };
}

// ── predicted boundaries ────────────────────────────────────────────────────
/** Boundary flags (Uint8Array N+1) of a heard string under a tokeniser, or null if its non-space length is not N. */
export function predictedFlags(heard, N, tokenise = "unit") {
  const flags = new Uint8Array(N + 1);
  let pos = 0;
  if (tokenise === "space") {
    for (const w of String(heard).split(/\s+/)) {
      if (!w) continue;
      pos += [...w].length;
      if (pos < N) flags[pos] = 1;
    }
  } else {
    for (const m of String(heard).matchAll(UNIT)) {
      pos += [...m[0]].length;
      if (pos < N) flags[pos] = 1;
    }
  }
  return pos === N ? flags : null;
}

// ── the engine: arms over sentences ─────────────────────────────────────────
const f1Of = (tp, fp, fn) => (2 * tp + fp + fn === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn));
const prf = (c) => ({
  tp: c.tp, fp: c.fp, fn: c.fn,
  precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : null,
  recall: c.tp + c.fn ? c.tp / (c.tp + c.fn) : null,
  f1: c.tp + c.fp + c.fn ? f1Of(c.tp, c.fp, c.fn) : null,
});

/**
 * evaluateSentences(sentences, arms, opts)
 *   arms   { name: { text(foldedText) -> heardString, tokenise?: "unit"|"space" } }; must include `no_ear`
 *   opts   { tier, secondary, randomOf, randomSeed, randomInsideSeed }
 * Returns, per arm: the all-domain counts (`totals`, v1's headline, now secondary), the INSIDE-RUN counts
 * (`insideTotals`: the ear's own sites) and the SITE counts (`siteTotals`: inside-run plus one forced miss per
 * unrepresentable MWT split, a false negative of every arm), per-sentence [tp,fp,fn] vectors of the all-domain
 * (`per`) and the site (`perSite`) counts for the paired bootstrap, per-kind recall, what was dropped and why,
 * and for each arm whether its boundary sets equal `no_ear`'s on every sentence.
 * With `randomOf`, two chance arms are added: `random_boundaries` (as many as `randomOf` placed in the domain,
 * at random domain positions) and `random_inside` (as many as `randomOf` placed INSIDE-RUN, at random
 * inside-run positions: the chance floor of the site metric).
 */
export function evaluateSentences(sentences, arms, { tier = "josa", secondary = null, randomOf = null, randomSeed = PARAMS.RANDOM_SEED, randomInsideSeed = PARAMS.RANDOM_INSIDE_SEED } = {}) {
  const names = Object.keys(arms);
  const all = randomOf ? [...names, "random_boundaries", "random_inside"] : names;
  const dropped = { no_text: 0, gold_unaligned: 0, arm_stream_mismatch: {} };
  const zero = () => ({ tp: 0, fp: 0, fn: 0 });
  const mk = () => Object.fromEntries(all.map((n) => [n, zero()]));
  const totals = mk(), insideTotals = mk(), siteTotals = mk();
  const perList = Object.fromEntries(all.map((n) => [n, []]));
  const perSiteList = Object.fromEntries(all.map((n) => [n, []]));
  const kinds = Object.fromEntries(all.map((n) => [n, { 1: { gold: 0, hit: 0 }, 2: { gold: 0, hit: 0 }, 3: { gold: 0, hit: 0 } }]));
  const identical = Object.fromEntries(all.map((n) => [n, true]));
  const residual = { no_ear_fp_within_chunk: 0, no_ear_fp_across_space: 0 };
  const needList = [];
  const gold = { sentences: 0, positives: 0, inside_positives: 0, inside_positions: 0, inside_apostrophe: 0, domain: 0, mwt_concat_splits: 0, mwt_nonconcat_splits: 0, mwt_nonconcat_tokens: 0, morph_aligned: 0, morph_unaligned: 0, morph_candidates: 0 };
  const sec = secondary ? { totals: mk(), per: Object.fromEntries(all.map((n) => [n, []])), gold: { positives: 0, morph_candidates: 0, morph_aligned: 0, morph_unaligned: 0 } } : null;

  const randomPlacement = (pool, m, rng, N) => {
    const flags = new Uint8Array(N + 1);
    const p = pool.slice();
    for (let i = 0; i < Math.min(m, p.length); i++) {
      const j = i + Math.floor(rng() * (p.length - i));
      [p[i], p[j]] = [p[j], p[i]];
      flags[p[i]] = 1;
    }
    return flags;
  };

  let idx = 0;
  for (const sent of sentences) {
    idx += 1;
    const g = buildGold(sent, { tier });
    if (!g.ok) { dropped[g.error] = (dropped[g.error] ?? 0) + 1; continue; }
    const folded = foldText(sent.text);
    const preds = {};
    let bad = null;
    for (const name of names) {
      const arm = arms[name];
      const flags = predictedFlags(arm.text(folded), g.N, arm.tokenise ?? "unit");
      if (!flags) { bad = name; break; }
      preds[name] = flags;
    }
    if (bad) { dropped.arm_stream_mismatch[bad] = (dropped.arm_stream_mismatch[bad] ?? 0) + 1; continue; }

    const domainPositions = [], insidePositions = [];
    for (let k = 1; k < g.N; k++) { if (g.dom[k]) domainPositions.push(k); if (g.inside[k]) insidePositions.push(k); }
    if (randomOf) {
      const m = domainPositions.reduce((a, k) => a + (preds[randomOf][k] ? 1 : 0), 0);
      preds.random_boundaries = randomPlacement(domainPositions, m, mulberry32(randomSeed + idx), g.N);
      const mi = insidePositions.reduce((a, k) => a + (preds[randomOf][k] ? 1 : 0), 0);
      preds.random_inside = randomPlacement(insidePositions, mi, mulberry32(randomInsideSeed + idx), g.N);
    }

    gold.sentences += 1;
    for (const k of Object.keys(g.stats)) gold[k] += g.stats[k];
    const cnt = Object.fromEntries(all.map((n) => [n, zero()]));
    const icnt = Object.fromEntries(all.map((n) => [n, zero()]));
    const base = preds.no_ear;
    let Ui = 0, Gi = 0;
    for (let k = 1; k < g.N; k++) {
      for (const n of all) if (preds[n][k] !== base[k]) identical[n] = false;
      if (!g.dom[k]) continue;
      gold.domain += 1;
      if (g.inside[k]) gold.inside_positions += 1;
      const isGold = g.G[k] > 0;
      if (isGold) {
        gold.positives += 1; Gi += 1;
        if (g.inside[k]) { gold.inside_positives += 1; Ui += 1; if (APOSTROPHE.test(g.cps[k - 1]) || APOSTROPHE.test(g.cps[k])) gold.inside_apostrophe += 1; }
      }
      for (const n of all) {
        const pr = preds[n][k] === 1;
        const c = cnt[n];
        if (n === "no_ear" && pr && !isGold) { if (g.ws[k]) residual.no_ear_fp_across_space += 1; else residual.no_ear_fp_within_chunk += 1; }
        if (pr && isGold) c.tp += 1; else if (pr) c.fp += 1; else if (isGold) c.fn += 1;
        if (isGold) { const kd = kinds[n][g.G[k]]; kd.gold += 1; if (pr) kd.hit += 1; }
        if (g.inside[k]) {
          const ic = insideTotals[n], is = icnt[n];
          if (pr && isGold) { ic.tp += 1; is.tp += 1; } else if (pr) { ic.fp += 1; is.fp += 1; } else if (isGold) { ic.fn += 1; is.fn += 1; }
        }
      }
    }
    const X = g.stats.mwt_nonconcat_splits;   // gold splits no space-inserting ear can place: a miss of every arm
    for (const n of all) {
      totals[n].tp += cnt[n].tp; totals[n].fp += cnt[n].fp; totals[n].fn += cnt[n].fn;
      perList[n].push(cnt[n].tp, cnt[n].fp, cnt[n].fn);
      siteTotals[n].tp += icnt[n].tp; siteTotals[n].fp += icnt[n].fp; siteTotals[n].fn += icnt[n].fn + X;
      perSiteList[n].push(icnt[n].tp, icnt[n].fp, icnt[n].fn + X);
    }
    needList.push(Ui, X, Gi);

    if (sec) {
      const g2 = buildGold(sent, { tier: secondary });
      if (g2.ok) {
        sec.gold.morph_candidates += g2.stats.morph_candidates; sec.gold.morph_aligned += g2.stats.morph_aligned; sec.gold.morph_unaligned += g2.stats.morph_unaligned;
        const c2 = Object.fromEntries(all.map((n) => [n, zero()]));
        for (let k = 1; k < g2.N; k++) {
          if (!g2.dom[k]) continue;
          const isGold = g2.G[k] > 0;
          if (isGold) sec.gold.positives += 1;
          for (const n of all) {
            const pr = preds[n][k] === 1;
            if (pr && isGold) c2[n].tp += 1; else if (pr) c2[n].fp += 1; else if (isGold) c2[n].fn += 1;
          }
        }
        for (const n of all) { sec.totals[n].tp += c2[n].tp; sec.totals[n].fp += c2[n].fp; sec.totals[n].fn += c2[n].fn; sec.per[n].push(c2[n].tp, c2[n].fp, c2[n].fn); }
      }
    }
  }
  const pack = (lst) => Object.fromEntries(all.map((n) => [n, Int32Array.from(lst[n])]));
  return { n: gold.sentences, names: all, dropped, totals, insideTotals, siteTotals, kinds, identical, gold, residual, needPer: Int32Array.from(needList), per: pack(perList), perSite: pack(perSiteList), secondary: sec ? { totals: sec.totals, per: pack(sec.per), gold: sec.gold } : null };
}

// ── statistics: paired bootstrap over sentences ─────────────────────────────
/** Bootstrap distributions of micro-F1 for every arm over the SAME resamples of sentences. per[arm] = Int32Array of [tp,fp,fn] per sentence. */
export function bootstrapF1(per, n, { B = PARAMS.BOOTSTRAP_B, seed = PARAMS.BOOTSTRAP_SEED } = {}) {
  const names = Object.keys(per);
  const dist = Object.fromEntries(names.map((k) => [k, new Float64Array(B)]));
  if (n === 0) return dist;
  const rng = mulberry32(seed);
  const idx = new Int32Array(n);
  for (let b = 0; b < B; b++) {
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rng() * n);
    for (const k of names) {
      const a = per[k];
      let tp = 0, fp = 0, fn = 0;
      for (let i = 0; i < n; i++) { const j = idx[i] * 3; tp += a[j]; fp += a[j + 1]; fn += a[j + 2]; }
      dist[k][b] = f1Of(tp, fp, fn);
    }
  }
  return dist;
}

/** 95% percentile interval of the need share (U+X)/(Gd+X) over the SAME resamples of sentences as bootstrapF1. needPer = Int32Array of [U, X, Gd] per sentence. */
export function bootstrapShare(needPer, n, { B = PARAMS.BOOTSTRAP_B, seed = PARAMS.BOOTSTRAP_SEED, level = PARAMS.CI } = {}) {
  if (n === 0) return [0, 0];
  const rng = mulberry32(seed);
  const out = new Float64Array(B);
  for (let b = 0; b < B; b++) {
    let U = 0, X = 0, G = 0;
    for (let i = 0; i < n; i++) { const j = Math.floor(rng() * n) * 3; U += needPer[j]; X += needPer[j + 1]; G += needPer[j + 2]; }
    out[b] = G + X > 0 ? (U + X) / (G + X) : 0;
  }
  out.sort();
  const tail = (1 - level) / 2;
  return [out[Math.min(B - 1, Math.floor(tail * B))], out[Math.min(B - 1, Math.floor((1 - tail) * B))]];
}

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))];
/** 95% percentile interval of a - b over paired resamples. */
export function diffCI(distA, distB, level = PARAMS.CI) {
  const d = Float64Array.from(distA, (x, i) => x - distB[i]).sort();
  if (!d.length) return { lo: 0, hi: 0 };
  const tail = (1 - level) / 2;
  return { lo: quantile(d, tail), hi: quantile(d, 1 - tail) };
}
export function intervalOf(dist, level = PARAMS.CI) {
  const d = Float64Array.from(dist).sort();
  if (!d.length) return [0, 0];
  const tail = (1 - level) / 2;
  return [quantile(d, tail), quantile(d, 1 - tail)];
}

// ── the pass rule, as a pure function (see PASS RULE and PASS RULE v2 in the header) ─────────
/** The floors: controls that place NO inside-run boundary at all, so they can never be "the strongest control". */
export const FLOOR_ARMS = Object.freeze(["no_ear", "whitespace"]);

/**
 * licenceOf({ active, hasAffixes, f1, diffs }) → { applicable, ok, checks, failed }
 *   The mechanism licence (II.23): perturbing the MECHANISM must lower the site score.
 *   f1     { real, dose_10, dose_50 } site F1s — dose-response must be strictly monotone
 *   diffs  { shifted_one, wrong_affixes } site paired intervals of (real - mutant); each lower bound must be > 0
 *   An inert ear (active=false) has no mechanism to license: applicable = false, ok = null.
 */
export function licenceOf({ active, hasAffixes = false, f1 = {}, diffs = {} }) {
  if (!active) return { applicable: false, ok: null, checks: [], failed: [] };
  const { real, dose_10: d10, dose_50: d50 } = f1;
  const checks = [];
  const doseOk = [real, d10, d50].every((x) => Number.isFinite(x)) && d10 < d50 && d50 < real;
  checks.push({ name: "dose_response_monotone", ok: doseOk, detail: { dose_10: d10 ?? null, dose_50: d50 ?? null, real: real ?? null } });
  checks.push({ name: "shifted_one_lowers", ok: Boolean(diffs.shifted_one && diffs.shifted_one.lo > 0), detail: diffs.shifted_one ?? null });
  if (hasAffixes) checks.push({ name: "wrong_affixes_lowers", ok: Boolean(diffs.wrong_affixes && diffs.wrong_affixes.lo > 0), detail: diffs.wrong_affixes ?? null });
  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  return { applicable: true, ok: failed.length === 0, checks, failed };
}

/**
 * decide({ needs, active, plumbingOk, licence, diffs, nonTrivial, harm }) → { pass, rule, failed }
 *   diffs      { <control>: { delta, lo, hi } } SITE paired intervals of (real - control); must contain no_ear
 *   nonTrivial the controls that can set `control` (default: every key of diffs except the floors)
 *   licence    licenceOf(...) — only read on rule 1; ok === false fails
 *   harm       { delta, lo, hi } ALL-DOMAIN real - no_ear (rule 3); defaults to diffs.no_ear
 *   mutationOk v1 alias of plumbingOk
 */
export function decide({ needs, active, plumbingOk = true, mutationOk = true, licence = null, diffs, nonTrivial = null, harm = null, minEffect = PARAMS.MIN_EFFECT }) {
  if (!plumbingOk || !mutationOk) return { pass: false, rule: "instrument_broken", failed: ["plumbing"] };
  if (needs) {
    if (!active) return { pass: false, rule: "needs_ear_but_inert", failed: ["real_equals_no_ear"] };
    if (licence && licence.ok === false) return { pass: false, rule: "licence_failed", failed: [...(licence.failed ?? [])] };
    const failed = Object.entries(diffs).filter(([, d]) => !(d.lo > 0)).map(([k]) => k);
    if (!(diffs.no_ear.delta >= minEffect)) failed.push("min_effect_vs_no_ear");
    const ref = (nonTrivial ?? Object.keys(diffs).filter((k) => !FLOOR_ARMS.includes(k))).filter((k) => diffs[k]);
    if (ref.length && !(Math.min(...ref.map((k) => diffs[k].delta)) >= minEffect)) failed.push("min_effect_vs_strongest_control");
    return { pass: failed.length === 0, rule: "needs_ear_beats_every_control", failed };
  }
  if (!active) return { pass: null, rule: "not_needed_ear_inert", failed: [] };
  const h = harm ?? diffs.no_ear;
  const harmed = h.hi < 0;
  return { pass: !harmed, rule: "not_needed_no_harm", failed: harmed ? ["no_ear"] : [] };
}

// ── the arms a stem's grammar gives ─────────────────────────────────────────
const SCRIPTS = [
  ["Han", /\p{Script=Han}/u], ["Hiragana", /\p{Script=Hiragana}/u], ["Katakana", /\p{Script=Katakana}/u],
  ["Hangul", /\p{Script=Hangul}/u], ["Arabic", /\p{Script=Arabic}/u], ["Hebrew", /\p{Script=Hebrew}/u],
  ["Cyrillic", /\p{Script=Cyrillic}/u], ["Greek", /\p{Script=Greek}/u], ["Devanagari", /\p{Script=Devanagari}/u],
  ["Thai", /\p{Script=Thai}/u], ["Latin", /\p{Script=Latin}/u],
];
const scriptOfCp = (ch) => { for (const [n, re] of SCRIPTS) if (re.test(ch)) return n; return null; };
const SCRIPT_FAMILY = { Hiragana: "Han", Katakana: "Han" }; // Japanese writes all three; the family decides who can stand in
const familyOf = (s) => SCRIPT_FAMILY[s] ?? s;
const stemFamily = (s) => String(s).replace(/-hans$/, "");
const massOf = (c) => Object.values(c).reduce((a, b) => a + b, 0);

const priorCache = new Map();
const loadPrior = (stem) => {
  if (!priorCache.has(stem)) {
    const f = path.join(PRIORS_DIR, `pos-${stem}.json`);
    priorCache.set(stem, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
  }
  return priorCache.get(stem);
};
const topForms = (prior, n) => Object.entries(prior.forms).map(([f, c]) => [f, massOf(c)]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([f]) => f);
const dominantScript = (forms) => {
  const counts = {};
  for (const f of forms) { const s = scriptOfCp([...f].find((c) => scriptOfCp(c)) ?? ""); if (s) counts[familyOf(s)] = (counts[familyOf(s)] ?? 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

const scriptCache = new Map();
const scriptOfStem = (stem, prior) => {
  if (!scriptCache.has(stem)) {
    // an evenly strided sample of the forms (the keys are not in frequency order, so the first N would be punctuation and Latin)
    const keys = Object.keys(prior.forms);
    const step = Math.max(1, Math.floor(keys.length / 600));
    scriptCache.set(stem, dominantScript(keys.filter((_, i) => i % step === 0)));
  }
  return scriptCache.get(stem);
};
const donorCache = new Map();

/** The OTHER language's POS prior (same script family, most forms shared with the target's most frequent), or null. Memoised per stem. */
export function donorFor(stem, posPrior, { top = PARAMS.DONOR_TOP } = {}) {
  const key = `${stem}:${top}`;
  if (donorCache.has(key)) return donorCache.get(key);
  const target = topForms(posPrior, top);
  const family = dominantScript(target);
  let best = null;
  if (family) {
    for (const s of availableStems()) {
      if (stemFamily(s) === stemFamily(stem)) continue;
      const p = loadPrior(s);
      if (!p?.forms) continue;
      if (scriptOfStem(s, p) !== family) continue;
      let overlap = 0;
      for (const f of target) if (p.forms[f]) overlap += 1;
      if (!best || overlap > best.overlap) best = { stem: s, prior: p, overlap };
    }
  }
  donorCache.set(key, best);
  return best;
}

/** One seeded character derangement per script over every character the prior's forms and affixes use. */
export function scrambleMap(chars, seed = PARAMS.SCRAMBLE_SEED) {
  const groups = new Map();
  for (const ch of chars) { const s = scriptOfCp(ch); if (!s) continue; if (!groups.has(s)) groups.set(s, []); groups.get(s).push(ch); }
  const rng = mulberry32(seed);
  const map = new Map();
  for (const [, list] of [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    list.sort();
    const p = derangement(list.length, rng);
    if (!p) continue;
    list.forEach((c, i) => map.set(c, list[p[i]]));
  }
  return map;
}
const mapWord = (w, map) => [...w].map((c) => map.get(c) ?? c).join("");

/**
 * The same prior and affixes, every word passed through the derangement: right structure, wrong words.
 * { lexicon, affixes } choose WHAT is deranged (both by default = the v1 all-scrambled arm). The character map is
 * built from the forms AND the affixes whatever is deranged, so the lexicon part of right_affixes_wrong_lexicon is
 * the same derangement as scrambled_lexicon's, and the affix part of wrong_affixes is too: a clean 2x2.
 */
export function scrambleGrammar({ posPrior, proclitics, enclitics }, seed = PARAMS.SCRAMBLE_SEED, { lexicon = true, affixes = true } = {}) {
  const chars = new Set();
  for (const f of Object.keys(posPrior.forms)) for (const c of f) chars.add(c);
  for (const a of [...(proclitics ?? []), ...(enclitics ?? [])]) for (const c of a) chars.add(c);
  const map = scrambleMap(chars, seed);
  let forms = posPrior.forms;
  if (lexicon) {
    forms = {};
    for (const [f, c] of Object.entries(posPrior.forms)) {
      const k = mapWord(f, map);
      if (!forms[k]) forms[k] = { ...c };
      else for (const [u, n] of Object.entries(c)) forms[k][u] = (forms[k][u] ?? 0) + n;
    }
  }
  const aff = (list) => (list ? [...list].map((a) => (affixes ? mapWord(a, map) : a)) : null);
  return { posPrior: { ...posPrior, forms }, proclitics: aff(proclitics), enclitics: aff(enclitics) };
}

/**
 * truncateLexicon(posPrior, fraction, seed): a seeded random `fraction` of the prior's forms. One uniform draw per
 * form (in sorted key order) is compared with the fraction, so the subsets are NESTED: the 10% set is inside the
 * 50% set. The dose of the dose-response mutation.
 */
export function truncateLexicon(posPrior, fraction, seed = PARAMS.DOSE_SEED) {
  const rng = mulberry32(seed);
  const forms = {};
  for (const k of Object.keys(posPrior.forms).sort()) { if (rng() < fraction) forms[k] = posPrior.forms[k]; }
  return { ...posPrior, forms };
}

const WORD_RUN = /[\p{L}\p{M}\p{N}']+/gu; // the ear's own word pattern (ear.js)

/**
 * affixOnlyHear({ proclitics, enclitics }) → (text) => text
 * The ear's affixes with NO lexicon check (control affix_only). The real ear's own order and length floors, nothing
 * else: the first character split off when it is in the proclitic set and the word has at least 3 characters
 * (heard-surfaces.js peelProclitics), else the longest enclitic the word ends in and is longer than (ear.js
 * peelEnclitics). One strip per word. The real ear additionally commits only when the remainder is attested and
 * the whole word is not; this arm never asks, so real vs affix_only isolates the lexicon gate.
 */
export function affixOnlyHear({ proclitics = null, enclitics = null } = {}) {
  const pro = proclitics && proclitics.length ? new Set(proclitics) : null;
  const enc = enclitics && enclitics.length ? [...new Set(enclitics)].sort((a, b) => b.length - a.length || (a < b ? -1 : 1)) : null;
  return (text) => String(text ?? "").replace(WORD_RUN, (word) => {
    if (pro && word.length >= 3 && pro.has(word[0])) return `${word[0]} ${word.slice(1)}`;
    if (enc) { const e = enc.find((x) => word.length > x.length && word.endsWith(x)); if (e) return `${word.slice(0, -e.length)} ${e}`; }
    return word;
  });
}

/**
 * shiftedHeard(heard, foldedInput, by): the ear's own boundaries (the ones it placed inside a letters-run of the
 * input) each moved `by` code points to the right; the boundaries the input already has (whitespace, punctuation
 * edges) stay. A boundary that lands on an existing one, or past the end, vanishes. The shifted_one mutation.
 */
export function shiftedHeard(heard, foldedInput, by = PARAMS.SHIFT_CP) {
  const { cps, ws } = streamOf(foldedInput);
  const N = cps.length;
  const flags = predictedFlags(heard, N);
  if (!flags) return heard;   // the arm changed characters: the evaluator drops the sentence for every arm alike
  const isW = cps.map((c) => WORD_CP.test(c));
  const out = new Uint8Array(N + 1);
  for (let k = 1; k < N; k++) {
    if (!flags[k]) continue;
    if (isW[k - 1] && isW[k] && !ws[k]) { const j = k + by; if (j < N) out[j] = 1; } else out[k] = 1;
  }
  let s = "";
  for (let i = 0; i < N; i++) { if (i > 0 && out[i]) s += " "; s += cps[i]; }
  return s;
}

const heardThrough = (ear) => (folded) => withEar(ear, () => hear(folded));

/**
 * The arms for a stem: the real ear, the controls, the mechanism mutations and the plumbing arm.
 * Returns { arms, gaps, meta, roles } with roles { controls, licence, plumbing } naming the arms of each kind
 * (the evaluator adds the chance arms random_boundaries / random_inside).
 */
export function armsFor(stem, grammar) {
  const g = grammar;
  const own = { posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics };
  const real = makeEar(own);
  const disabled = Object.freeze({ ...real, segment: null, peel: null });
  const hasAffixes = Boolean((g.proclitics && g.proclitics.length) || (g.enclitics && g.enclitics.length));
  const realHear = heardThrough(real);
  const arms = {
    real: { text: realHear },
    no_ear: { text: (t) => t },
    whitespace: { text: (t) => t, tokenise: "space" },
    every_char: { text: (t) => [...t.replace(/\s+/g, "")].join(" ") },
    scrambled_lexicon: { text: heardThrough(makeEar(scrambleGrammar(own))) },
    shifted_one: { text: (t) => shiftedHeard(realHear(t), t) },
    plumbing_ear_disabled: { text: heardThrough(disabled) },
  };
  for (const f of PARAMS.DOSE_FRACTIONS) arms[`dose_${Math.round(f * 100)}`] = { text: heardThrough(makeEar({ ...own, posPrior: truncateLexicon(g.posPrior, f) })) };
  const roles = { controls: ["no_ear", "whitespace", "every_char", "scrambled_lexicon"], licence: ["shifted_one", ...PARAMS.DOSE_FRACTIONS.map((f) => `dose_${Math.round(f * 100)}`)], plumbing: "plumbing_ear_disabled" };
  const gaps = [];
  const meta = { ear_parts: { segment: Boolean(real.segment), peel: Boolean(real.peel), proclitics: real.proclitics?.size ?? 0, enclitics: real.enclitics?.size ?? 0 }, has_affixes: hasAffixes, donor: null };
  if (hasAffixes) {
    arms.affix_only = { text: affixOnlyHear({ proclitics: g.proclitics, enclitics: g.enclitics }) };
    arms.right_affixes_wrong_lexicon = { text: heardThrough(makeEar(scrambleGrammar(own, PARAMS.SCRAMBLE_SEED, { lexicon: true, affixes: false }))) };
    arms.wrong_affixes = { text: heardThrough(makeEar(scrambleGrammar(own, PARAMS.SCRAMBLE_SEED, { lexicon: false, affixes: true }))) };
    roles.controls.push("affix_only", "right_affixes_wrong_lexicon");
    roles.licence.push("wrong_affixes");
  } else {
    gaps.push({ reason: "no_affix_lists", count: 3, detail: "this stem's grammar has no proclitic or enclitic list: affix_only, right_affixes_wrong_lexicon and wrong_affixes are not built (every_char is its lexicon-free control)" });
  }
  const donor = donorFor(stem, g.posPrior);
  if (donor) {
    arms.deranged_lexicon = { text: heardThrough(makeEar({ posPrior: donor.prior, proclitics: g.proclitics, enclitics: g.enclitics })) };
    roles.controls.push("deranged_lexicon");
    meta.donor = { stem: donor.stem, overlap_of_top: donor.overlap, top: PARAMS.DONOR_TOP };
  } else {
    gaps.push({ reason: "no_same_script_donor", count: 1, detail: "no other language's prior shares this script family; the deranged-lexicon arm cannot be built (the scrambled arm still runs)" });
  }
  return { arms, gaps, meta, roles };
}

// ── leakage: dev sentences that are train sentences ─────────────────────────
/** A sentence text with whitespace collapsed and trimmed: the key leakage is judged on. */
export const normText = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

const trainCache = new Map();
/**
 * trainTextsFor(stem) → { texts: Set<normText> | null, files: [path] }
 * The "# text" lines of the stem's TRAIN treebank(s): tb/<stem>/train.conllu and every tb/<stem>-<name>/train.conllu
 * that is not itself a stem (kor-gsd is Korean's; cmn-hans is not cmn's). texts is null when no train file exists.
 */
export function trainTextsFor(stem, { tbDir = TB_DIR } = {}) {
  const key = `${tbDir}:${stem}`;
  if (trainCache.has(key)) return trainCache.get(key);
  const files = [];
  const own = path.join(tbDir, stem, "train.conllu");
  if (fs.existsSync(own)) files.push(own);
  const stems = new Set(availableStems());
  let dirs = [];
  try { dirs = fs.readdirSync(tbDir); } catch { dirs = []; }
  for (const d of dirs.sort()) {
    if (!d.startsWith(`${stem}-`) || stems.has(d)) continue;
    const f = path.join(tbDir, d, "train.conllu");
    if (fs.existsSync(f)) files.push(f);
  }
  let texts = null;
  if (files.length) {
    texts = new Set();
    for (const f of files) for (const line of fs.readFileSync(f, "utf8").split("\n")) if (line.startsWith("# text = ")) texts.add(normText(line.slice(9)));
  }
  const out = { texts, files };
  trainCache.set(key, out);
  return out;
}

/** overlapWithTrain(sentences, trainTexts) → { kept, leaked }: the sentences whose normalised text is / is not a train sentence. */
export function overlapWithTrain(sentences, trainTexts) {
  const kept = [], leaked = [];
  for (const s of sentences) (trainTexts.has(normText(s.text)) ? leaked : kept).push(s);
  return { kept, leaked };
}

// ── measure ─────────────────────────────────────────────────────────────────
const chanceCorrected = (f, floor) => (floor >= 1 ? null : (f - floor) / (1 - floor));
const unmeasured = (stem, split, why, extraGap = null) => ({
  stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {},
  gaps: [extraGap ?? { reason: "unmeasured", count: 1, detail: why }],
  notes: [why], details: { prereg_sha256: safeDigest() },
});
function safeDigest() { try { return headerDigest(HERE); } catch { return null; } }

/** strideSample(items, limit): `limit` items at evenly spaced strides over the whole list (deterministic). */
export function strideSample(items, limit) {
  if (limit == null || !Number.isFinite(limit) || limit <= 0 || items.length <= limit) return items;
  const out = [];
  for (let i = 0; i < limit; i++) out.push(items[Math.floor((i * items.length) / limit)]);
  return out;
}

export async function measure({ stem, split = "dev", limit = null } = {}) {
  try {
    const file = conlluPath(stem, split);
    if (!file) return unmeasured(stem, split, `no gold on disk for ${stem}/${split}`);
    const g = grammarFor(stem);
    if (!g.language) return unmeasured(stem, split, `no received grammar for "${stem}" — a typed gap, never another language's grammar`, { reason: "language_unheard", count: 1, detail: g.gap });
    const read = readConllu(file);
    const withText = read.filter((s) => s.text);
    // LEAKAGE (v2): a sentence the priors were trained on is not held out. Dropped BEFORE sampling; counted.
    const train = trainTextsFor(stem);
    const { kept, leaked } = train.texts ? overlapWithTrain(withText, train.texts) : { kept: withText, leaked: [] };
    const sample = strideSample(kept, limit);
    if (!sample.length) return unmeasured(stem, split, "the split has no sentences with a # text line that are not in train");

    const { arms, gaps: armGaps, meta, roles } = armsFor(stem, g);
    const ev = evaluateSentences(sample, arms, { tier: "josa", secondary: "all", randomOf: "real" });
    if (ev.n === 0) return unmeasured(stem, split, "no sentence could be aligned to its gold", { reason: "gold_unaligned", count: sample.length, of: sample.length });

    const distAll = bootstrapF1(ev.per, ev.n);
    const distSite = bootstrapF1(ev.perSite, ev.n);
    const fAll = (name) => f1Of(ev.totals[name].tp, ev.totals[name].fp, ev.totals[name].fn);
    const fSite = (name) => f1Of(ev.siteTotals[name].tp, ev.siteTotals[name].fp, ev.siteTotals[name].fn);
    const armCard = (tot, dist) => Object.fromEntries(ev.names.map((name) => [name, { ...prf(tot[name]), ci95: intervalOf(dist[name]), identical_to_no_ear: ev.identical[name] }]));
    const insideCard = Object.fromEntries(ev.names.map((name) => [name, prf(ev.insideTotals[name])]));

    // the card's control names -> the evaluator's arm names (the site-level chance arm is random_inside)
    const armOf = (c) => (c === "random_inside_run" ? "random_inside" : c);
    const controlNames = [...roles.controls.slice(0, 3), "random_inside_run", ...roles.controls.slice(3)];   // no_ear, whitespace, every_char, random_inside_run, scrambled_lexicon, ...
    const nonTrivial = controlNames.filter((c) => !FLOOR_ARMS.includes(c));
    const controls = Object.fromEntries(controlNames.map((c) => [c, fSite(armOf(c))]));
    const diffs = {};
    for (const c of controlNames) { const ci = diffCI(distSite.real, distSite[armOf(c)]); diffs[c] = { delta: fSite("real") - fSite(armOf(c)), lo: ci.lo, hi: ci.hi }; }
    const allControls = Object.fromEntries([...roles.controls, "random_boundaries"].map((c) => [c, fAll(c)]));
    const diffsAll = {};
    for (const c of Object.keys(allControls)) { const ci = diffCI(distAll.real, distAll[c]); diffsAll[c] = { delta: fAll("real") - fAll(c), lo: ci.lo, hi: ci.hi }; }

    const U = ev.gold.inside_positives, X = ev.gold.mwt_nonconcat_splits, Gd = ev.gold.positives;
    const siteGold = U + X;
    const siteDefined = siteGold > 0;
    const score = siteDefined ? fSite("real") : null;
    const control = siteDefined ? Math.max(...nonTrivial.map((c) => controls[c])) : null;
    const strongest = siteDefined ? nonTrivial.reduce((best, c) => (controls[c] > controls[best] ? c : best), nonTrivial[0]) : null;

    const active = !ev.identical.real;
    const plumbingOk = ev.identical.plumbing_ear_disabled === true
      && ["tp", "fp", "fn"].every((k) => ev.totals.plumbing_ear_disabled[k] === ev.totals.no_ear[k] && ev.siteTotals.plumbing_ear_disabled[k] === ev.siteTotals.no_ear[k]);

    // THE LICENCE: perturb the mechanism, the site score must fall
    const mutDiffs = {};
    for (const m of roles.licence) { const ci = diffCI(distSite.real, distSite[m]); mutDiffs[m] = { delta: fSite("real") - fSite(m), lo: ci.lo, hi: ci.hi, f1: fSite(m) }; }
    const doseNames = PARAMS.DOSE_FRACTIONS.map((f) => `dose_${Math.round(f * 100)}`);
    const licence = licenceOf({ active, hasAffixes: meta.has_affixes, f1: { real: fSite("real"), dose_10: fSite(doseNames[0]), dose_50: fSite(doseNames[1]) }, diffs: mutDiffs });

    const needShare = Gd + X > 0 ? (U + X) / (Gd + X) : 0;
    const needs = needShare >= PARAMS.NEED_FLOOR;
    const needCI = bootstrapShare(ev.needPer, ev.n);
    const borderline = needCI[0] < PARAMS.NEED_FLOOR && needCI[1] >= PARAMS.NEED_FLOOR;
    const harm = diffsAll.no_ear;
    let verdict = decide({ needs, active, plumbingOk, licence: needs && active ? licence : null, diffs, nonTrivial, harm });
    const gaps = [...armGaps];
    if (!siteDefined) {
      if (verdict.pass !== null) verdict = { pass: null, rule: "no_site_gold", failed: [] };
      gaps.push({ reason: "no_site_gold", count: 0, of: Gd, detail: "the sample has no gold boundary inside a letters-run and no unrepresentable MWT split: the site F1 is undefined, so score/control/margin are null and no verdict is given (the all-domain no-harm check is in details.all_domain)" });
    }

    const dropped = ev.dropped;
    const droppedSentences = dropped.no_text + dropped.gold_unaligned + Object.values(dropped.arm_stream_mismatch).reduce((a, b) => a + b, 0);
    if (train.texts) {
      if (leaked.length) gaps.push({ reason: `${split}_train_overlap`, count: leaked.length, of: withText.length, detail: `sentences of the ${split} split whose normalised # text is verbatim in the train treebank(s) the priors were built from; removed before sampling, never scored` });
    } else {
      gaps.push({ reason: "leakage_unchecked", count: withText.length, of: withText.length, detail: `no train treebank on disk under the tb directory for "${stem}": ${split}/train overlap could not be counted` });
    }
    if (dropped.gold_unaligned) gaps.push({ reason: "gold_unaligned", count: dropped.gold_unaligned, of: sample.length, detail: "sentences whose gold token FORMs could not be matched to the # text line" });
    for (const [arm, c] of Object.entries(dropped.arm_stream_mismatch)) gaps.push({ reason: "arm_stream_mismatch", count: c, of: sample.length, arm, detail: "the arm changed the characters (not only spaces)" });
    if (X > 0) gaps.push({ reason: "mwt_nonconcatenative", count: X, tokens: ev.gold.mwt_nonconcat_tokens, of: Gd + X, detail: "gold splits of a contraction whose parts are not substrings of it (de+el, à+le); the ear only inserts spaces and cannot produce them; masked from the all-domain F1, counted as a miss of every arm in the site F1, never passed" });
    if (!active) {
      gaps.push({ reason: needs ? "ear_inert" : "ear_inert_not_needed", count: U, of: Gd, detail: needs ? "the gold has boundaries inside letter-runs and this stem's ear never moves one" : "no ear is built or needed for this stem at the declared floor; real and no_ear are identical sentence for sentence" });
    }
    const fnInside = ev.insideTotals.real.fn;
    if (U > 0) gaps.push({ reason: "boundaries_unheard", count: fnInside, of: U, detail: "gold inside-run boundaries the real ear did not place" });
    const fpWithin = ev.residual.no_ear_fp_within_chunk, fpAcross = ev.residual.no_ear_fp_across_space;
    if (Gd > 0 && fpWithin / Gd >= PARAMS.NEED_FLOOR) gaps.push({ reason: "tokeniser_cuts_gold_word", count: fpWithin, of: Gd, detail: "the letters-only tokeniser cuts a whitespace-delimited chunk where the gold keeps one word (ZWNJ, hyphen, decimal point, quote marks); no ear arm can undo it" });
    if (Gd > 0 && fpAcross / Gd >= PARAMS.NEED_FLOOR) gaps.push({ reason: "gold_word_spans_space", count: fpAcross, of: Gd, detail: "the gold keeps one word across whitespace (multi-syllable words); a joiner would be needed, outside this ear's remit" });
    if (siteDefined && active && controls.affix_only != null && controls.affix_only > fSite("real")) {
      gaps.push({ reason: "lexicon_gate_loses_to_naive_stripping", count: ev.siteTotals.affix_only.tp - ev.siteTotals.real.tp, of: U, detail: `affix_only (the same affixes, no lexicon check) has site F1 ${controls.affix_only.toFixed(4)} against the real ear's ${fSite("real").toFixed(4)}: the extra gold boundaries it places are given as count; the lexicon gate is costing the ear more than it buys` });
    }
    if (siteDefined && active && needs && diffs.every_char.delta < PARAMS.MIN_EFFECT) {
      gaps.push({ reason: "ear_adds_little_over_trivial_splitting", count: 1, detail: `real minus every_char = ${diffs.every_char.delta.toFixed(4)} site F1 (< MIN_EFFECT ${PARAMS.MIN_EFFECT}): the ear adds under a point over splitting every code point` });
    }
    if (licence.applicable && !licence.ok) gaps.push({ reason: "licence_failed", count: licence.failed.length, of: licence.checks.length, detail: `mechanism mutations that did not lower the site score as they must: ${licence.failed.join(", ")}` });

    const notes = [];
    notes.push(`need_share=${needShare.toFixed(4)} [95% ${needCI[0].toFixed(4)}, ${needCI[1].toFixed(4)}] (floor ${PARAMS.NEED_FLOOR}) -> ${needs ? "NEEDS an ear" : "needs none"}${borderline ? " (BORDERLINE: the interval straddles the floor; the verdict would flip under resampling)" : ""}; ear ${active ? "active" : "inert"}; rule ${verdict.rule}${verdict.failed.length ? ` (failed: ${verdict.failed.join(", ")})` : ""}`);
    notes.push(`v2 headline = SITE F1 (inside-run positions + unrepresentable MWT splits); all-domain F1 ${fAll("real").toFixed(4)} is secondary${siteDefined ? `; strongest non-trivial control ${strongest} ${control.toFixed(4)}` : ""}`);
    if (!plumbingOk) notes.push("INSTRUMENT BROKEN: plumbing_ear_disabled (the real ear with segment and peel disabled) did not reproduce the no-ear arm exactly");
    if (licence.applicable) notes.push(`licence ${licence.ok ? "held" : "FAILED"}: ${licence.checks.map((c) => `${c.name}=${c.ok ? "ok" : "no"}`).join(", ")}`);
    if (meta.donor) notes.push(`deranged_lexicon donor: ${meta.donor.stem} (shares ${meta.donor.overlap_of_top} of the target's top ${meta.donor.top} forms)`);
    if (leaked.length) notes.push(`${leaked.length} of ${withText.length} ${split} sentences are verbatim in train and were removed before scoring`);
    if (droppedSentences) notes.push(`${droppedSentences} of ${sample.length} sampled sentences dropped (${JSON.stringify(dropped)})`);
    if (!needs && !active) notes.push(`vacuous: arms identical by construction; absolute all-domain F1 ${fAll("real").toFixed(4)} (the reader tokenises by letters here)`);
    if (needs && active && verdict.pass === false && diffs.no_ear.lo > 0) notes.push("the ear beats the no-ear text but not every control or not the licence: the gain is not licensed");

    const secondary = ev.secondary && ev.secondary.gold.morph_candidates > 0 ? (() => {
      const d2 = bootstrapF1(ev.secondary.per, ev.n);
      const f2 = (n) => f1Of(ev.secondary.totals[n].tp, ev.secondary.totals[n].fp, ev.secondary.totals[n].fn);
      const ci = diffCI(d2.real, d2.no_ear);
      return { tier: "all", gold_positives: ev.secondary.gold.positives, morph_candidates: ev.secondary.gold.morph_candidates, morph_aligned: ev.secondary.gold.morph_aligned, morph_unaligned: ev.secondary.gold.morph_unaligned, real_f1: f2("real"), no_ear_f1: f2("no_ear"), delta: f2("real") - f2("no_ear"), lo: ci.lo, hi: ci.hi };
    })() : null;

    const kindName = { 1: "token", 2: "mwt_inner", 3: "morph_inner" };
    const byKind = {};
    for (const name of ["real", "no_ear", ...(roles.controls.includes("affix_only") ? ["affix_only"] : [])]) { byKind[name] = {}; for (const k of [1, 2, 3]) { const v = ev.kinds[name][k]; if (v.gold) byKind[name][kindName[k]] = { gold: v.gold, heard: v.hit, recall: v.hit / v.gold }; } }

    return {
      stem, rung: RUNG.id, split, n: ev.n, score, control, margin: siteDefined ? score - control : null, pass: verdict.pass,
      controls, gaps, notes,
      details: {
        question: RUNG.question,
        version: "v2",
        rule: verdict.rule, failed: verdict.failed,
        headline: { metric: "site F1 = inside-run positions + unrepresentable MWT splits (forced misses)", sites_gold: siteGold, inside_run: U, forced_misses_X: X, inside_positions: ev.gold.inside_positions, strongest_control: strongest, non_trivial_controls: nonTrivial, floors: FLOOR_ARMS },
        sample: { split_sentences: read.length, with_text: withText.length, not_in_train: kept.length, sampled: sample.length, scored: ev.n, limit, dropped },
        leakage: { checked: Boolean(train.texts), train_files: train.files, train_sentences: train.texts ? train.texts.size : null, overlap: leaked.length, of: withText.length },
        gold: { tier: "josa", boundaries_in_domain: Gd, inside_run: U, domain_positions: ev.gold.domain, mwt_concat_splits: ev.gold.mwt_concat_splits, mwt_nonconcat_splits: X, mwt_nonconcat_tokens: ev.gold.mwt_nonconcat_tokens, morph_candidates: ev.gold.morph_candidates, morph_aligned: ev.gold.morph_aligned, morph_unaligned: ev.gold.morph_unaligned },
        need: { share: needShare, ci95: needCI, borderline, floor: PARAMS.NEED_FLOOR, needs, U, X, Gd, inside_apostrophe: ev.gold.inside_apostrophe },
        residual: { ...ev.residual, gold_boundaries: Gd },
        chance_corrected: {
          site_vs_random_inside_run: { real: chanceCorrected(fSite("real"), fSite("random_inside")), every_char: chanceCorrected(fSite("every_char"), fSite("random_inside")) },
          site_vs_every_char: { real: chanceCorrected(fSite("real"), fSite("every_char")) },
          all_domain_vs_random: { real: chanceCorrected(fAll("real"), fAll("random_boundaries")), no_ear: chanceCorrected(fAll("no_ear"), fAll("random_boundaries")) },
          note: "(F1 - F1_floor) / (1 - F1_floor), descriptive only: the chance floor is high where the gold is dense (Chinese, Japanese) and every_char is the floor an ear must clear there",
        },
        ear: { ...meta.ear_parts, active, has_affixes: meta.has_affixes },
        arms: armCard(ev.siteTotals, distSite),
        inside_run: insideCard,
        by_kind: byKind,
        diffs,
        licence: { ...licence, mutations: mutDiffs, doses: { fractions: PARAMS.DOSE_FRACTIONS, seed: PARAMS.DOSE_SEED, f1: Object.fromEntries(doseNames.map((d) => [d, fSite(d)])), real: fSite("real"), forms_kept: Object.fromEntries(PARAMS.DOSE_FRACTIONS.map((f) => [`dose_${Math.round(f * 100)}`, Object.keys(truncateLexicon(g.posPrior, f).forms).length])), forms_total: Object.keys(g.posPrior.forms).length } },
        plumbing: { ok: plumbingOk, f1: fAll("plumbing_ear_disabled"), no_ear_f1: fAll("no_ear"), note: "the ear disabled must equal no_ear exactly: a plumbing check, NOT the mechanism licence (see details.licence)" },
        all_domain: { score: fAll("real"), controls: allControls, diffs: diffsAll, arms: armCard(ev.totals, distAll), note: "v1 headline, secondary in v2; still decides rule 3 (no harm)" },
        donor: meta.donor,
        secondary_gold: secondary,
        params: PARAMS,
        case_folded: "per code point, length-preserving, before every arm (heard rule)",
        prereg_sha256: safeDigest(),
      },
    };
  } catch (e) {
    return unmeasured(stem, split, `error: ${String(e?.message ?? e).slice(0, 300)}`, { reason: "unmeasured", count: 1, detail: `error: ${String(e?.stack ?? e).slice(0, 600)}` });
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
//   node eval/competence/r1-hear.mjs --stem <stem> [--split dev|test] [--limit N]
//   node eval/competence/r1-hear.mjs --all [--split dev|test] [--limit N]
// One JSON line per stem on stdout; each result is also written to
// /private/tmp/claude-501/competence/r1-<stem>-<split>.json.
async function main() {
  const a = parseArgs(process.argv.slice(2));
  const limit = a.limit != null && Number.isFinite(a.limit) ? a.limit : null;
  const stems = a.all ? availableStems().filter((s) => conlluPath(s, a.split)) : a.stem ? a.stem.split(",") : [];
  if (!stems.length) { console.error("usage: node eval/competence/r1-hear.mjs --stem <stem[,stem]> | --all [--split dev|test] [--limit N]"); process.exit(2); }
  for (const stem of stems) {
    const t0 = Date.now();
    const res = await measure({ stem, split: a.split, limit });
    res.details = { ...(res.details ?? {}), ms: Date.now() - t0 };
    writeResult(RUNG.id, stem, a.split, res);
    console.log(JSON.stringify(res));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === HERE) await main();
