// eval/competence/r2-class.mjs — RUNG R2, CLASSIFY: can an occurrence — one the
// prior has never seen included — name a being?
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5) ═════════════════════════════════
// Written BEFORE the first run of this file. Nothing below is tuned after a
// result; a prediction that fails is reported as failed. The sha256 of this
// leading comment block is stamped into every result (details.prereg_sha256) so
// an after-the-fact edit of the claim is visible by comparing digests.
//
// CLAIM
//   The being tier needs one question answered per occurrence: "can this name a
//   being?" (gold: UPOS NOUN or PROPN, against everything else). The reader
//   answers it with adapters/text/heard-nominals.js::classAt over the language's
//   RECEIVED priors (priors/pos-<stem>.json, priors/frame-<stem>.json). For a
//   word the POS prior attests, the answer is its own tally. For a word it has
//   NEVER seen, the answer is the FRAME prior's: the class implied by the
//   classes of its two neighbours. The claim has two halves:
//     (A) on UNSEEN words the frame prior carries real information about
//         nominality: more than a constant answer, more than the same prior with
//         its rows deranged;
//     (B) the prior may only REFUSE, and what it refuses (a form it SETTLES as a
//         non-naming class) really is non-nominal more often than chance.
//
// WHAT IS SCORED (the matcher). The HELD-OUT gold the priors never saw
//   (/private/tmp/claude-501/ud-eval/<stem>/<split>.conllu; DEV while developing,
//   TEST once at the end). One row per UD syntactic word (multi-word-token range
//   lines and empty nodes are not rows) that the listening cast would itself
//   classify. SCOPE MIRRORS listening-cast.js::add: lowercased form is a whole
//   reader unit (letters/marks/numbers/apostrophe only), is not numeric, is not
//   onomatopoeic reduplication, and is at least script-floor.js::wordFloor(form,3)
//   long. Gold tokens the reader would see as a DIFFERENT unit are not rows and
//   are COUNTED AS TYPED GAPS: multi-word-token surface forms (Spanish "del"),
//   tokens the reader glues across an apostrophe (English do|n't, French l'|homme),
//   non-word tokens (punctuation, "e-mail", numbers), short words below the floor.
//   Each row is classified by the REAL classAt on (lowercased form, previous gold
//   token, next gold token): the neighbours the frame prior was built on.
//   UNSEEN := classAt's own basis starts with "unseen" (form absent from the POS
//   prior after its apostrophe-stem lookup, or known to it only as X). SEEN := the
//   rest. The two strata are scored separately; the pass rule reads UNSEEN.
//   PREDICTION := nominal iff NOUN+PROPN mass of classAt's distribution >= 0.5
//   (NAME_SHARE; heardNominals' default nameShare, and the Bayes point for a
//   binary question). A null distribution (an unseen word with no frame prior) is
//   an ABSTENTION: it admits nothing, so it counts as "not nominal" — which is
//   exactly what the production index does (it skips a word with no evidence).
//   REFUSAL := the cast's own rule: settledClass(dist) — the class with share
//   >= 0.5 (SETTLE_SHARE = GRAMMAR_MIN_SHARE, the repo's declared settledness
//   cut) — exists and is not NOUN/PROPN. An unsettled form is KEPT, not refused.
//
// ARMS (all on the SAME rows; F1 is of the NOMINAL class)
//   real            classAt with the stem's own frame prior.
//   majority_oracle constant: the more frequent gold class of the stratum (ties:
//                   nominal). ORACLE — it reads held-out labels, so it is the
//                   strongest honest "majority" there is.
//   all_nominal     constant "nominal". The best constant for nominal-class F1
//                   (a minority-nominal majority has F1 = 0, which is no baseline).
//   train_marginal  the frame prior with its CONTEXT removed (only its "*|*" row,
//                   the hapax class marginal): the non-oracle constant. Isolates
//                   what the NEIGHBOURS add over the hapax base rate.
//   prior_only      classAt with NO frame prior: an unseen word gets no
//                   distribution and is not admitted (the production behaviour,
//                   disclosed as it is: its nominal F1 on unseen is 0 by design).
//   deranged        the frame prior with its ROWS PERMUTED (every frame key gets
//                   a different key's row — a Sattolo derangement, marginal kept).
//                   DERANGE_DRAWS = 5 seeds (stability, not a gate on a claim;
//                   provisional); the control is the BEST of the 5 by F1, so the
//                   real arm must beat the luckiest deranged draw.
//   shuffled_gold   LICENCE arm: the real predictions against the unseen gold
//                   labels randomly re-paired (SHUFFLE_DRAWS = 200, provisional).
//                   Its (1-alpha) quantile is the F1 a prior with NO information
//                   about THESE labels reaches by chance on THESE predictions.
//
// METRICS. F1 (nominal class) is the score; accuracy, precision, recall,
//   macro-F1 and a threshold-free ROC-AUC of the nominal mass are reported
//   beside it. Settled-refusal precision = of the tokens the reader REFUSES, the
//   share that are truly non-nominal; base rate = the share of non-nominal tokens
//   in the scored stratum (the precision of refusing at random); coverage = the
//   share of non-nominal tokens refused; lost-nominal rate = the share of true
//   nominals wrongly refused (a refusal that kills a real being).
//   SIGNIFICANCE. Exact one-sided SIGN test (binomial, p=1/2) of "arm A beats arm
//   B" on the discordant units, at alpha = KEY_ALPHA = 0.05 (the repo's declared
//   5%). THE UNIT OF INDEPENDENCE IS THE SENTENCE (a word's frame is its
//   neighbours, so tokens of one sentence share their evidence): per sentence
//   d = (#unseen tokens real got right) - (#arm B got right); wins = sentences
//   d > 0, losses = d < 0, ties dropped. The token-level sign test is reported
//   beside it, not gated on.
//
// PASS RULE (per stem, on the scored split; all must hold)
//   (1) MEASURABLE. At least minDiscordant = ceil(log2(1/alpha)) = 5 SENTENCES
//       contain an unseen scored token — below that no sign test can reach alpha
//       and a test that cannot fail cannot pass. Else pass = null (gap unmeasured).
//       No POS prior, no frame prior, no gold file, no nominal among the unseen:
//       pass = null with that typed gap. "unmeasured" is never "good".
//   (2) vs CONSTANTS. On UNSEEN: F1(real) > F1(majority_oracle) AND sign p < alpha,
//       and F1(real) > F1(all_nominal) AND sign p < alpha.
//   (3) vs DERANGED. On UNSEEN: F1(real) > F1(best deranged draw) AND sign p < alpha
//       against that draw.
//   (4) REFUSAL. Pooled over seen+unseen rows, settled-refusal precision >= the
//       base rate of non-nominal rows, with >= 1 refusal.
//   (5) LICENCE (II.4/II.23: the statistic must move under the perturbation).
//       (a) the derangement changed >= 1 unseen prediction (else the control did
//       nothing and cannot be read), and (b) F1(real) > the (1-alpha) quantile of
//       shuffled_gold.
//   (2) and (3) are an intersection-union test: all must reject, so no
//   multiplicity correction is needed. score = F1(real, unseen); control = the
//   largest F1 among all control arms on unseen; margin = score - control.
//
// DESIGN DECISIONS (where the brief was unworkable, the closest honest choice):
//   D1 "majority-class baseline" is degenerate for the nominal class when
//      nominals are the minority (F1 = 0). Both constants are scored and BOTH
//      must be beaten (above, 2).
//   D2 Gold boundaries are the treebank's (an ORACLE ear): R1 owns word boundaries
//      and bound morphemes, R2 isolates classification. Because Korean/Arabic/
//      Hebrew need their ear, a SECONDARY diagnostic (details.peelView, NOT part
//      of the pass rule) re-runs the real arm through the reader's own bound-
//      morpheme peeler (a token is nominal iff any of its heard units is).
//   D3 Capitalisation is not an input: classAt reads lowercased forms, the gold is
//      never case-keyed, and nothing here reads case (heard rule).
//   D4 Gold X (a transliterated name in Arabic/Hebrew treebanks) is NON-nominal,
//      per the brief (NOUN or PROPN). The unseen X count is reported as a typed
//      gap so a language where X hides names is visible, not smoothed over.
//   D5 CAUSAL (S3): each row is classified from its own sentence's neighbours and
//      the received priors only; no statistic of the scored material reaches the
//      classifier. The ORACLE majority and the shuffled-gold arm read gold on
//      purpose and are labelled so: they are controls, not the reader.
//
// PREDICTIONS (reasoned from the priors' own TRAIN-side hapax marginals; no dev
//   result had been seen when this was written). Confidence in brackets.
//   P1  vs DERANGED: the frame arm beats the deranged draw in eng, spa, arb,
//       cmn-hans [medium]; NOT significantly in kor and fin [medium-low] — their
//       hapax neighbours are mostly UNK (an agglutinative or eojeol-sized token
//       leaves little class context), so the frame is near its base rate.
//   P2  vs CONSTANTS: the train hapax nominal share is eng .57, cmn-hans .60,
//       kor .55, fin .63, spa .47, arb .32, so all_nominal F1 = 2p/(1+p) is
//       strong (.70-.77) in eng/cmn-hans/kor/fin and weak (.63, .49) in spa/arb.
//       Predicted: the frame arm beats all_nominal in spa and arb [low-medium],
//       and does NOT in eng, cmn-hans, kor, fin [medium]. Predicted FULL PASS:
//       spa and arb at most; eng, cmn-hans, kor, fin fail on (2).
//   P3  REFUSAL (4): passes in 6/6 stems [high] — attested function words are
//       settled and non-nominal. The UNSEEN-only refusal precision is above its
//       own base in eng, spa, arb [medium] and near it elsewhere.
//   P4  AUC of the unseen nominal mass: real > 0.60 in 6/6 [medium]; the best
//       deranged draw within 0.50 +- 0.06 [medium]. (reported, not gated)
//   P5  SEEN words are near ceiling in eng and spa (F1 >= 0.90) and the SEEN
//       refusal precision >= 0.95 [high]. Arabic unseen F1 is the lowest of the
//       six (< 0.60) because gold X names count against it [medium].
//   P6  UNSEEN share of scored rows (for the record): eng .06-.14, spa .04-.10,
//       arb .12-.30, cmn-hans .06-.18, kor >= .45, fin >= .30 [low].
//
// KNOWN LIMITS (stated in advance): boundaries are oracle (R1's job); MWT surface
//   forms are not rows (typed gap, a known weak spot); the sentence-block sign
//   test is conservative on small unseen sets; UD gold is one annotation scheme
//   (X, ADJ/NOUN conventions differ by treebank); first-N-sentences --limit is
//   deterministic, not a random sample; unseen is OOV vs the TRAIN prior, so the
//   share depends on genre drift between train and dev.
// ═══════════════════════════════════════════════════════════════════════════════
// ═══ PRE-REGISTRATION v2 — AMENDMENT 2026-10-06 ═══════════════════════════════
// Written BEFORE the first v2 run, in answer to five reviewer findings on the v1
// instrument (1 blocker, 4 major). DISCLOSURE (II.5): the v1 DEV cards had been read
// when this was written, so v2's rule and predictions are NOT blind on DEV. No R2
// TEST card exists, so v2 IS blind on TEST, where the final card is computed once.
// The v1 block above (everything before this line) is left UNEDITED: its sha256 is
//   e41189ce0b0d56607982ec9d1bf1e053470380df7d8c184c989752d53e8e921b
// and is recomputed from this very file at run time (details.prereg_v1_sha256,
// details.prereg_v1_verified), so an edit of v1 shows. Where v1 and v2 disagree v2
// governs; the v1 verdict is still computed and stored (details.rule.v1_superseded)
// so the disagreement stays visible. No v1 declared number (NAME_SHARE .5,
// SETTLE_SHARE .5, ALPHA .05, minDiscordant 5) changes. v2 REPLACES one test and ADDS
// gates; it removes none. Nothing below was chosen by looking for the verdict it gives.
//
// V2.1 THE TEST NAMES THE STATISTIC IT COMPARES (blocker). v1 gated "F1(real) >
//   F1(control)" on a sentence sign test of per-token CORRECTNESS (accuracy): another
//   quantity. An arm could pass by winning accuracy while its F1 was no better than a
//   constant, and fail while clearly better at everything but F1. v2 tests
//   dF1 = F1(real) - F1(control), nominal class, UNSEEN stratum, for control in
//   {majority_oracle, all_nominal, the best deranged draw by F1}. dF1 is DEMONSTRATED
//   iff BOTH hold:
//     (a) a paired SENTENCE-SWAP randomization test, one-sided: under "within a
//         sentence the two arms are exchangeable" each sentence on which they differ
//         is swapped or not; p = share of swaps with dF1' >= dF1. EXACT by
//         enumeration when m <= 14 sentences differ (2^14 <= PERM_DRAWS), else
//         PERM_DRAWS Monte-Carlo swaps with p = (1+#>=)/(1+draws). Its smallest p is
//         2^-m, so it CAN reject at ALPHA only with m >= ceil(log2(1/ALPHA)) = 5
//         discordant sentences (v1's minDiscordant, now also a per-comparison floor):
//         with fewer the comparison is UNDERPOWERED and not demonstrated;
//     (b) a SENTENCE-CLUSTER BOOTSTRAP (BOOT_DRAWS resamples of whole sentences,
//         seeded, percentile) whose one-sided (1-ALPHA) LOWER bound of dF1 is > 0.
//   The v1 sign test stays as reported figures. MCC is reported beside F1.
// V2.2 INFORMATION, THRESHOLD-FREE (major). F1 of the nominal class rewards volume: a
//   constant that says "nominal" scores a strong F1 wherever nominals are the
//   majority, and a volume-heavy arm can out-score a better classifier. So claim A
//   also needs a statistic every constant scores at the floor on: ROC-AUC of the
//   naming mass (NOUN+PROPN) on the unseen stratum, with
//     (a) bootstrap lower bound of AUC(real) - AUC(uninformed) > 0; uninformed = the
//         constant (AUC .5); in the heard arm, the RECOVERY INDICATOR (the ear alone);
//     (b) bootstrap lower bound of AUC(real) - AUC(best deranged draw by AUC) > 0.
//   CLAIM A (the frame carries information) := V2.1 for all three controls AND V2.2 (a)
//   and (b). It is an intersection-union test: no multiplicity correction.
// V2.3 LOOKAHEAD LABEL (major). D5 above says CAUSAL (S3). The headline arm is not
//   token-causal: the frame prior is keyed on prev|next, so it reads the NEXT word of
//   the same sentence. v2 relabels it SENTENCE-LOOKAHEAD (an S3 variant, legitimate
//   for the cast, which folds whole sentences) and says plainly: THE PASS IS AT
//   SENTENCE GRANULARITY. A PREFIX-ONLY arm is added beside it (details.prefixOnly):
//   the same classAt with the frame prior cut to its backoff rows "P|*" and "*|*"
//   (every key with a concrete right-neighbour class removed, so the lookup can only
//   back off to P|*; no placeholder neighbour is invented), with its own deranged
//   controls, scored with the same battery. REPORTED, never gating.
// V2.4 CLAIM B ON THE UNSEEN STRATUM (major). v1 gated refusal on a POOLED precision
//   >= base with >= 1 refusal; pooled rows are mostly SEEN function words whose tallies
//   are the prior's own TRAIN tallies, and that gate could not fail. v2 gates B on the
//   UNSEEN stratum, where the frame prior alone decides:
//     B1 refused >= minDiscordant (5) tokens, AND the token binomial
//        P(X >= right | n = refused, chance = non-nominal base rate of the stratum)
//        < ALPHA, AND the sentence-cluster bootstrap lower bound of (precision - base)
//        > 0;
//     B2 CONTROL BUILT TO FAIL: the same refusal rule run over each DERANGED frame
//        prior; the real unseen refusal precision must beat the best-precision
//        deranged draw among those that refuse >= 5 unseen tokens (bootstrap lower
//        bound of the difference > 0). If NO deranged draw refuses that many the
//        control is VACUOUS: B2 holds and the card says so (vacuousControl);
//     B3 LOST BEINGS: the share of true naming occurrences in the unseen stratum that
//        the reader wrongly refuses must be <= LOST_CEILING = ALPHA = .05. DERIVED,
//        not fitted: the repo's declared 5% (keyness.js) is the most the standing
//        gate lets a form be wrong; the same figure is the most a prior that "may
//        only refuse" may wrongly refuse. Provisional (P4) until the cast's own
//        tolerance is measured. DISCLOSURE: the v1 dev lost-nominal rates were already
//        seen (eng .075, spa .078, kor .076, arb .217, cmn-hans .026); the ceiling is
//        read off ALPHA, not off them.
//   CLAIM B := B1 and B2 and B3. Pooled and seen figures stay in the card, ungated.
// V2.5 THE HEARD RULE FOR THE EAR (major). v1's boundaries are the treebank's: for Han
//   and Kana the reader's own segmenter decided nothing, and the unseen words a
//   lexicon-DP cannot find are exactly the OOV ones, so the unseen stratum was
//   conditional on an oracle ear. v2 adds a HEARD ARM, gated, for every stem whose ear
//   changes units:
//     · UNSPACED prior (makeEar supplies a segmenter: cmn, cmn-hans, jpn, lzh): the
//       sentence's own raw "# text" goes through makeSegmenter(posPrior); a gold token
//       is RECOVERED iff a heard unit has exactly its character span (whitespace
//       ignored); recovered rows are classified by classAt on the HEARD unit with its
//       HEARD neighbours. END-TO-END accounting on the headline unseen stratum: an
//       unrecovered gold row is predicted non-nominal with mass 0 (the reader never
//       heard it as a word), and EVERY control goes through the same recovery mask
//       (all_nominal = nominal iff recovered; the majority constant likewise; the
//       deranged arms are the heard arm over deranged priors). Recovery is a TYPED GAP
//       with denominators (unseen and seen); a sentence whose gold tokens do not
//       concatenate to its raw text is a typed gap.
//     · PEELER (arb, heb, kor: ear.peel changes >= 1 scored form): the v1 peelView
//       promoted: a token is nominal iff any heard unit is, its stratum is its HEAD
//       (longest) unit's seen/unseen, its mass the max naming mass of its units, it is
//       refused iff all its units are; the same battery.
//   pass = (oracle-boundary rule) AND (heard-arm rule). A heard arm that cannot be
//   measured leaves pass NULL when the oracle rule passes (unmeasured is never good).
//   A stem with no ear arm is stamped details.boundary.scope = "gold-token boundaries;
//   the ear changes no unit". V2.1, V2.2, V2.4 and V2.6 apply to the heard arm.
// V2.6 LICENCE (II.4/II.23). L1 as v1 (a): the derangement changed >= 1 unseen
//   prediction. L2 as v1 (b): F1(real) > the (1-ALPHA) quantile of shuffled_gold. L3
//   NEW: AUC(real) > the (1-ALPHA) quantile of the AUC of the real mass against gold
//   re-paired at random (SHUFFLE_DRAWS): the statistic V2.2 uses must also move under
//   the perturbation. licensed := L1 and L2 and L3.
// V2.7 DECLARED (provisional resolutions; none gates a claim except through the tests
//   above): BOOT_DRAWS = 2000, PERM_DRAWS = 20000, LOST_CEILING = ALPHA, AUC ties are
//   scores equal to 12 decimals, MCC of a constant is 0 by convention.
// V2.8 PREDICTIONS (v2 on DEV, informed by the v1 DEV cards; TEST blind). [confidence]
//   Q1  eng FAILS: dF1 against all_nominal is negative (v1 F1 .813 < .852) and B3
//       fails (v1 .075 > .05) [high].
//   Q2  spa: claim A HOLDS (v1 AUC .915; F1 .862 vs all_nominal .740) [medium-high];
//       claim B fails on B3 (v1 .078 > .05) [medium]; so pass = false and v1's one
//       pass among the five is overturned by the loss ceiling, not by the F1 test.
//   Q3  cmn-hans and kor FAIL V2.1 against all_nominal (v1 .748 < .812; .703 < .711)
//       [medium-high]. arb: no demonstrated dF1 over all_nominal (v1 .3757 vs .3734)
//       and B3 fails (v1 .217) [high].
//   Q4  AUC(real) beats its best deranged draw with a positive lower bound in all five
//       [medium-high] (v1 AUC .67-.92 against deranged .49-.56).
//   Q5  cmn-hans heard arm: makeSegmenter recovers far fewer than all unseen gold
//       tokens (the reviewer saw about 19% of the instrument's unseen rows survive)
//       [high]; end-to-end unseen F1 sits below the oracle-boundary F1 [high].
//   Q6  prefix-only: unseen AUC below the lookahead arm's in eng, spa, kor [high]
//       (the reviewer's placeholder variant fell eng .79 -> .59, spa .92 -> .72; this
//       variant backs off to P|* instead, so the fall should be milder).
//   Q7  across all DEV stems v2 passes strictly fewer than v1 did (15 pass, 11 fail,
//       3 unmeasured among the v1 dev cards on disk) [high].
// KNOWN LIMITS added by v2: the heard arm is end-to-end on the headline unseen rows
//   only (spurious heard units that match no gold token are R1's), the recovery
//   exactness test is character-span equality, the peeled arm for arb/heb applies the
//   peeler to gold syntactic words (glued MWT surfaces are in details.mwtSurface.peeled,
//   ungated), and the loss ceiling is a declared tolerance, not a measured one.
// CORRECTION (2026-10-06, after the first v2 DEV runs, before any TEST run; no rule, test
//   or number changed): the opening paragraph says v2 "REPLACES one test and ADDS gates;
//   it removes none". That understates. v2 REPLACES TWO v1 tests: the accuracy sign test
//   (V2.1) and the pooled refusal gate (now B1-B3 on the UNSEEN stratum, V2.4). No gate is
//   dropped without a replacement; the pooled and seen refusal figures stay in the card,
//   ungated. Appended rather than edited so the original wording stays visible.
// ═══════════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { classAt } from "../../adapters/text/heard-nominals.js";
import { wordFloor } from "../../adapters/text/script-floor.js";
import { grammarFor, availableStems } from "../../the-fold/language-grammar.js";
import { makeEar } from "../../adapters/text/ear.js";
import {
  KEY_ALPHA, conlluPath, readConllu, mulberry32, shuffled, derangement, signTest, minDiscordantFor,
  confusion, summarise, auc, parseArgs, writeResult, headerDigest, COMPETENCE_OUT, binomUpperTail,
} from "./lib.mjs";

export const RUNG = Object.freeze({
  id: "r2",
  name: "classify",
  question: "Can this occurrence — one the prior has never seen included — name a being (NOUN or PROPN)?",
});

// ── declared numbers (P4: every threshold declared or derived) ───────────────
export const PREREG_VERSION = "v2";
export const PREREG_V1_SHA256 = "e41189ce0b0d56607982ec9d1bf1e053470380df7d8c184c989752d53e8e921b";
export const NAME_SHARE = 0.5;     // nominal iff NOUN+PROPN mass >= this (heardNominals' nameShare; the Bayes point)
export const SETTLE_SHARE = 0.5;   // a class is SETTLED at this share (listening-cast MIN_SHARE, GRAMMAR_MIN_SHARE)
export const ALPHA = KEY_ALPHA;    // 0.05, keyness.js — the repo's declared resolution
export const DERANGE_DRAWS = 5;    // provisional: control stability, gates no claim
export const SHUFFLE_DRAWS = 200;  // provisional: licence-arm resolution, gates no claim
export const BOOT_DRAWS = 2000;    // v2, provisional: resolution of the percentile bound
export const PERM_DRAWS = 20000;   // v2, provisional: Monte-Carlo swaps when 2^m > PERM_DRAWS
export const PERM_EXACT_MAX = Math.floor(Math.log2(PERM_DRAWS)); // 14: enumerate every swap up to this many discordant sentences
export const LOST_CEILING = ALPHA; // v2 B3: the most true naming occurrences a prior that "may only refuse" may wrongly refuse (declared, provisional)
const SEED = 20261005;
const NAMING = new Set(["NOUN", "PROPN"]);
const EPS = 1e-12;

// ── the reader's own scope (mirrors listening-cast.js::add) ──────────────────
const WORDISH = /^[\p{L}\p{M}\p{N}'’]+$/u;
const NUMERIC = /^[\p{N}'’]+$/u;
const APOS = /['’]/;
const isReduplication = (w) => { const cs = [...w]; return cs.length >= 4 && new Set(cs).size <= 2; };

/** Why a (lowercased) form is or is not a unit the reader classifies: "in" or a typed reason. */
export function scopeOf(form, upos = null) {
  if (!WORDISH.test(form)) return upos === "PUNCT" || upos === "SYM" ? "punct_or_symbol" : "not_a_word_unit";
  if (NUMERIC.test(form)) return "numeric";
  if (isReduplication(form)) return "reduplication";
  if (form.length < wordFloor(form, 3)) return "below_script_floor";
  return "in";
}

/**
 * prepare(sentences) → { sents, rows, excluded, nSentences, nTokens }
 *   rows: one per scored token {si, ti, unit, prev, next, gold, upos}
 *   sents: per sentence {forms, scopes} (kept for the heard-through-the-ear view)
 */
export function prepare(sentences) {
  const excluded = {};
  const bump = (r) => { excluded[r] = (excluded[r] ?? 0) + 1; };
  const rows = [];
  const sents = [];
  const mwtRows = []; // DIAGNOSTIC (post-registration): multi-word-token surface forms as the reader sees them
  let nTokens = 0;
  sentences.forEach((s, si) => {
    const toks = s.tokens;
    const forms = toks.map((t) => t.form.toLowerCase());
    const mwt = new Set();
    for (const r of s.ranges ?? []) for (let i = r.from; i <= r.to; i++) mwt.add(i);
    // the reader's tokenizer glues letters, marks, numbers and apostrophes into ONE unit
    // when no space intervenes: do|n't -> "don't", l'|homme -> "l'homme".
    const glued = new Set();
    for (let i = 1; i < toks.length; i++) {
      if (toks[i - 1].spaceAfter || mwt.has(toks[i].id)) continue;
      if (!WORDISH.test(forms[i - 1]) || !WORDISH.test(forms[i])) continue;
      if (APOS.test(forms[i - 1]) || APOS.test(forms[i])) { glued.add(i - 1); glued.add(i); }
    }
    const scopes = toks.map((t, i) => (mwt.has(t.id) ? "mwt_surface" : glued.has(i) ? "apostrophe_glued" : scopeOf(forms[i], t.upos)));
    scopes.forEach((sc, i) => {
      nTokens++;
      if (sc !== "in") { bump(sc); return; }
      rows.push({ si, ti: i, unit: forms[i], prev: i > 0 ? forms[i - 1] : null, next: i + 1 < toks.length ? forms[i + 1] : null, gold: NAMING.has(toks[i].upos), upos: toks[i].upos });
    });
    sents.push({ forms, scopes });
    const at = new Map(toks.map((t, i) => [t.id, i]));
    for (const r of s.ranges ?? []) {
      const a = at.get(r.from), b = at.get(r.to);
      if (a == null || b == null) continue;
      const unit = String(r.form).toLowerCase();
      if (scopeOf(unit) !== "in") continue;
      mwtRows.push({ si, unit, prev: a > 0 ? forms[a - 1] : null, next: b + 1 < toks.length ? forms[b + 1] : null, gold: toks.slice(a, b + 1).some((t) => NAMING.has(t.upos)) });
    }
  });
  return { sents, rows, excluded, nSentences: sentences.length, nTokens, mwtRows };
}

// ── what the reader says about one distribution ──────────────────────────────
const naming = (dist) => (dist ? (dist.NOUN ?? 0) + (dist.PROPN ?? 0) : null);
/** nominal iff the naming mass reaches NAME_SHARE; no distribution = abstention = not nominal. */
export const predictNominal = (dist) => { const m = naming(dist); return m != null && m >= NAME_SHARE; };
/** listening-cast.js::settledClass, verbatim in effect. */
export const settledClass = (dist) => {
  if (!dist) return null;
  const [c, p] = Object.entries(dist).sort((a, b) => b[1] - a[1])[0] ?? [];
  return p >= SETTLE_SHARE ? c : null;
};
/** The cast REFUSES a form its prior settles as unable to name a being. */
export const refusedBy = (dist) => { const c = settledClass(dist); return Boolean(c) && !NAMING.has(c); };

// ── control priors ───────────────────────────────────────────────────────────
/** The frame prior with its ROWS permuted among its own keys (no key keeps its row); null when it cannot be (fewer than 2 keys). */
export function derangeFramePrior(framePrior, seed) {
  const frames = framePrior?.frames;
  const keys = frames ? Object.keys(frames).sort() : [];
  const perm = derangement(keys.length, mulberry32(seed));
  if (!perm) return null;
  const out = {};
  keys.forEach((k, i) => { out[k] = frames[keys[perm[i]]]; });
  return { ...framePrior, frames: out, derangedSeed: seed };
}
/** The frame prior with its CONTEXT removed: only the hapax class marginal row. */
export const marginalOnlyFramePrior = (framePrior) => (framePrior?.frames?.["*|*"] ? { ...framePrior, frames: { "*|*": framePrior.frames["*|*"] } } : null);
/**
 * v2 (V2.3): the frame prior as a reader that has NOT yet seen the next word would hold it —
 * only the backoff rows "P|*" (left-neighbour class known, right unknown) and "*|*". Every key
 * with a concrete right class (including the sentence edge "$") is removed, so classAt's lookup
 * P|N → P|* → *|N → *|* can only land on P|* or the marginal. No placeholder neighbour is invented.
 */
export function prefixOnlyFramePrior(framePrior) {
  const frames = framePrior?.frames;
  if (!frames) return null;
  const keep = Object.fromEntries(Object.entries(frames).filter(([k]) => k.endsWith("|*")));
  return Object.keys(keep).length ? { ...framePrior, frames: keep, prefixOnly: true } : null;
}

// ── statistics ───────────────────────────────────────────────────────────────
/** v1 (SUPERSEDED as a gate, still reported): sentence-block sign test of "A beats B" on per-token correctness. */
export function blockSign(sent, aOk, bOk) {
  const d = new Map();
  let tw = 0, tl = 0;
  for (let i = 0; i < sent.length; i++) {
    const delta = (aOk[i] ? 1 : 0) - (bOk[i] ? 1 : 0);
    d.set(sent[i], (d.get(sent[i]) ?? 0) + delta);
    if (delta > 0) tw++; else if (delta < 0) tl++;
  }
  let w = 0, l = 0;
  for (const v of d.values()) { if (v > 0) w++; else if (v < 0) l++; }
  return { block: signTest(w, l), token: signTest(tw, tl) };
}
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
const round = (x, k = 4) => (x == null || !Number.isFinite(x) ? x : Number(x.toFixed(k)));
// p-values keep three significant figures (a 1e-9 p must not round to 0); everything else four decimals
const roundObj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v !== "number" || !Number.isFinite(v) ? v : /^(p|binomP|permutationP)$/.test(k) ? Number(v.toPrecision(3)) : round(v)]));

/** F1 of the positive class from counts; null when the gold has no positive (undefined, not 0). */
export const f1c = (tp, fp, fn) => (tp + fn === 0 ? null : tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn));
/** Matthews correlation from a confusion; a constant predictor (a zero margin) is 0 by convention (declared, V2.7). */
export function mccOf({ tp, fp, fn, tn }) {
  const d = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  return d === 0 ? 0 : (tp * tn - fp * fn) / d;
}
/** Map arbitrary sentence labels to 0..k-1. */
export function compactIds(sent) {
  const m = new Map();
  const ids = new Int32Array(sent.length);
  sent.forEach((s, i) => { if (!m.has(s)) m.set(s, m.size); ids[i] = m.get(s); });
  return { ids, k: m.size };
}
/** Per-sentence tp/fp/fn of boolean predictions against boolean gold. */
export function sentenceCounts(ids, k, pred, gold) {
  const tp = new Float64Array(k), fp = new Float64Array(k), fn = new Float64Array(k);
  for (let i = 0; i < ids.length; i++) {
    const s = ids[i];
    if (pred[i]) { if (gold[i]) tp[s]++; else fp[s]++; } else if (gold[i]) fn[s]++;
  }
  return { tp, fp, fn };
}
const sumAt = (arr, idx) => { let t = 0; if (idx) for (let i = 0; i < idx.length; i++) t += arr[idx[i]]; else for (let i = 0; i < arr.length; i++) t += arr[i]; return t; };

/**
 * V2.1(a): paired SENTENCE-SWAP randomization test of dF1 = F1(A) - F1(B), one-sided.
 * a, b: per-sentence {tp,fp,fn}. Sentences on which the arms do not differ are constants.
 * Exact enumeration when m <= PERM_EXACT_MAX discordant sentences, else Monte-Carlo.
 */
export function pairedF1Permutation(a, b, { maxDraws = PERM_DRAWS, rng = mulberry32(1) } = {}) {
  const k = a.tp.length;
  const C = [0, 0, 0];
  const D = [];
  for (let s = 0; s < k; s++) {
    if (a.tp[s] === b.tp[s] && a.fp[s] === b.fp[s] && a.fn[s] === b.fn[s]) { C[0] += a.tp[s]; C[1] += a.fp[s]; C[2] += a.fn[s]; } else D.push(s);
  }
  const m = D.length;
  const at = D.map((s) => [a.tp[s], a.fp[s], a.fn[s]]);
  const bt = D.map((s) => [b.tp[s], b.fp[s], b.fn[s]]);
  const T = [0, 0, 0];
  for (let j = 0; j < m; j++) for (let c = 0; c < 3; c++) T[c] += at[j][c] + bt[j][c];
  const f = (x) => f1c(x[0], x[1], x[2]) ?? 0;
  const dOf = (sel) => f([C[0] + sel[0], C[1] + sel[1], C[2] + sel[2]]) - f([C[0] + T[0] - sel[0], C[1] + T[1] - sel[1], C[2] + T[2] - sel[2]]);
  const selA = [0, 0, 0];
  for (let j = 0; j < m; j++) for (let c = 0; c < 3; c++) selA[c] += at[j][c];
  const observed = dOf(selA);
  if (m === 0) return { observed, p: 1, discordantSentences: 0, exact: true, draws: 1 };
  let ge = 0;
  if (m <= PERM_EXACT_MAX && 2 ** m <= maxDraws) {
    const total = 2 ** m;
    for (let mask = 0; mask < total; mask++) {
      const sel = [0, 0, 0];
      for (let j = 0; j < m; j++) { const v = (mask >> j) & 1 ? bt[j] : at[j]; sel[0] += v[0]; sel[1] += v[1]; sel[2] += v[2]; }
      if (dOf(sel) >= observed - EPS) ge++;
    }
    return { observed, p: ge / total, discordantSentences: m, exact: true, draws: total };
  }
  for (let d = 0; d < maxDraws; d++) {
    const sel = [0, 0, 0];
    for (let j = 0; j < m; j++) { const v = rng() < 0.5 ? bt[j] : at[j]; sel[0] += v[0]; sel[1] += v[1]; sel[2] += v[2]; }
    if (dOf(sel) >= observed - EPS) ge++;
  }
  return { observed, p: (1 + ge) / (1 + maxDraws), discordantSentences: m, exact: false, draws: maxDraws };
}

/**
 * SENTENCE-CLUSTER bootstrap: resample whole sentences with replacement, evaluate every
 * statistic in `stats` ({name: (idx:Int32Array) => number|null}) on the SAME resample.
 * → {name: {lower, upper, median, draws}} with lower = the alpha percentile (one-sided (1-alpha) lower bound).
 */
export function clusterBootstrap(k, stats, { draws = BOOT_DRAWS, rng = mulberry32(2), alpha = ALPHA } = {}) {
  const names = Object.keys(stats);
  const acc = Object.fromEntries(names.map((n) => [n, []]));
  const idx = new Int32Array(k);
  for (let b = 0; b < draws; b++) {
    for (let i = 0; i < k; i++) idx[i] = Math.floor(rng() * k);
    for (const n of names) { const v = stats[n](idx); if (v != null && Number.isFinite(v)) acc[n].push(v); }
  }
  const out = {};
  for (const n of names) {
    const a = acc[n].sort((x, y) => x - y);
    out[n] = a.length
      ? { lower: a[Math.min(a.length - 1, Math.floor(alpha * a.length))], upper: a[Math.min(a.length - 1, Math.ceil((1 - alpha) * a.length) - 1)], median: a[Math.floor(a.length / 2)], draws: a.length }
      : { lower: null, upper: null, median: null, draws: 0 };
  }
  return out;
}

/** Per-sentence score histograms, so a bootstrap AUC is O(entries) not O(n log n). */
export function aucTable(ids, k, score, gold) {
  const key = (x) => Number(x.toFixed(12));
  const vals = [...new Set(score.map(key))].sort((x, y) => x - y);
  const bin = new Map(vals.map((v, i) => [v, i]));
  const per = Array.from({ length: k }, () => new Map());
  for (let i = 0; i < ids.length; i++) {
    const b = bin.get(key(score[i]));
    const m = per[ids[i]];
    const e = m.get(b) ?? [0, 0];
    if (gold[i]) e[0]++; else e[1]++;
    m.set(b, e);
  }
  return { entries: per.map((m) => [...m].map(([b, [p, n]]) => [b, p, n])), nBins: vals.length, pos: new Float64Array(vals.length), neg: new Float64Array(vals.length) };
}
/** ROC-AUC of an aucTable over a resample `idx` (sentence indices) or over everything (null); ties half-counted. */
export function aucAt(table, idx = null) {
  const { entries, nBins, pos, neg } = table;
  pos.fill(0); neg.fill(0);
  const add = (s) => { for (const [b, p, n] of entries[s]) { pos[b] += p; neg[b] += n; } };
  if (idx) for (let i = 0; i < idx.length; i++) add(idx[i]); else for (let s = 0; s < entries.length; s++) add(s);
  let P = 0, cum = 0, acc = 0;
  for (let b = 0; b < nBins; b++) { acc += pos[b] * (cum + neg[b] / 2); cum += neg[b]; P += pos[b]; }
  return P === 0 || cum === 0 ? null : acc / (P * cum);
}

/** Per-sentence refusal counts. */
export function refusalTable(ids, k, refused, gold) {
  const t = { ref: new Float64Array(k), right: new Float64Array(k), lost: new Float64Array(k), non: new Float64Array(k), nom: new Float64Array(k) };
  for (let i = 0; i < ids.length; i++) {
    const s = ids[i];
    if (gold[i]) t.nom[s]++; else t.non[s]++;
    if (refused[i]) { t.ref[s]++; if (gold[i]) t.lost[s]++; else t.right[s]++; }
  }
  return t;
}
/** Settled-refusal figures on a set of rows. base = share of non-nominal rows (the precision of refusing at random). */
export function refusalSummary(gold, refused) {
  let refusedN = 0, right = 0, goldNon = 0, goldNom = 0, lost = 0;
  for (let i = 0; i < gold.length; i++) {
    if (gold[i]) goldNom++; else goldNon++;
    if (refused[i]) { refusedN++; if (!gold[i]) right++; else lost++; }
  }
  const n = gold.length, base = n ? goldNon / n : null;
  return {
    n, refused: refusedN, refusedShare: n ? refusedN / n : null, precision: refusedN ? right / refusedN : null, base,
    lift: refusedN && base != null ? right / refusedN - base : null, coverage: goldNon ? right / goldNon : null,
    lostNominal: lost, lostNominalRate: goldNom ? lost / goldNom : null,
    binomP: refusedN && base != null ? binomUpperTail(right, refusedN, base) : null, // P(X >= right | refused, chance = base)
    right,
  };
}

// ── the ear's units: what the reader HEARS (v2, V2.5) ────────────────────────
const UNIT = /[\p{L}\p{M}\p{N}'’]+|[^\s\p{L}\p{M}\p{N}]/gu;
const WS = /\s/u;
const nsChars = (s) => [...s].filter((c) => !WS.test(c));

/** The reader's own segmenter over a raw sentence → heard units with [s,e) spans in whitespace-free code points. */
export function heardSpans(lc, segment) {
  const chunks = String(segment(lc) ?? "").split(/\s+/u).filter(Boolean);
  const units = [];
  let pos = 0;
  for (const ch of chunks) for (const m of ch.matchAll(UNIT)) { const n = [...m[0]].length; units.push({ u: m[0], s: pos, e: pos + n }); pos += n; }
  return { units, total: pos };
}

/**
 * Unspaced scripts: per scored row, the HEARD unit whose span is exactly the gold token's, with its HEARD
 * neighbours. per[i] = {units:[{u,prev,next}] | [] (not recovered), unaligned?}.
 */
export function heardUnitsUnspaced({ sentences, rows, segment }) {
  const per = new Array(rows.length).fill(null);
  const bySent = new Map();
  rows.forEach((r, i) => { if (!bySent.has(r.si)) bySent.set(r.si, []); bySent.get(r.si).push(i); });
  let unalignedSentences = 0, unalignedRows = 0;
  for (const [si, list] of bySent) {
    const s = sentences[si];
    const raw = String(s.text ?? s.tokens.map((t) => t.form).join("")).toLowerCase();
    const ns = nsChars(raw);
    const goldForms = s.tokens.map((t) => nsChars(t.form.toLowerCase()));
    const spans = [];
    let pos = 0;
    for (const f of goldForms) { spans.push([pos, pos + f.length]); pos += f.length; }
    const { units, total } = heardSpans(raw, segment);
    if (goldForms.map((f) => f.join("")).join("") !== ns.join("") || total !== ns.length) {
      unalignedSentences++; unalignedRows += list.length;
      for (const i of list) per[i] = { units: [], unaligned: true };
      continue;
    }
    const at = new Map(units.map((u, j) => [`${u.s}:${u.e}`, j]));
    for (const i of list) {
      const [a, b] = spans[rows[i].ti];
      const j = at.get(`${a}:${b}`);
      per[i] = j == null ? { units: [] } : { units: [{ u: units[j].u, prev: units[j - 1]?.u ?? null, next: units[j + 1]?.u ?? null }] };
    }
  }
  return { per, unalignedSentences, unalignedRows };
}

/** Bound morphemes: each scored token through the reader's peeler; its scorable heard units with flat neighbours (the v1 peelView). */
export function heardUnitsPeeled({ sents, rows, posPrior, peel }) {
  const perTok = new Map();
  sents.forEach((s, si) => {
    const flat = [];
    s.forms.forEach((f, ti) => { for (const u of (peel(f).match(UNIT) ?? [])) flat.push({ u, ti }); });
    flat.forEach((f, j) => {
      if (s.scopes[f.ti] !== "in" || scopeOf(f.u) !== "in") return;
      const key = `${si}:${f.ti}`;
      const e = perTok.get(key) ?? [];
      e.push({ u: f.u, prev: flat[j - 1]?.u ?? null, next: flat[j + 1]?.u ?? null });
      perTok.set(key, e);
    });
  });
  const headUnseen = [];
  const per = rows.map((r) => {
    const units = perTok.get(`${r.si}:${r.ti}`) ?? [];
    if (!units.length) { headUnseen.push(false); return { units: [] }; }
    const head = units.reduce((a, b) => (b.u.length > a.u.length ? b : a));
    headUnseen.push(classAt(head.u, head.prev, head.next, { posPrior, framePrior: null, minShare: SETTLE_SHARE }).basis.startsWith("unseen"));
    return { units };
  });
  return { per, headUnseen };
}

/** One token's verdict from its heard units: nominal iff any is; mass = the max naming mass; refused iff ALL are; no unit = silent. */
function classifyHeard(per, posPrior, fp) {
  const pred = [], mass = [], refused = [];
  for (const h of per) {
    const units = h?.units ?? [];
    if (!units.length) { pred.push(false); mass.push(0); refused.push(false); continue; }
    let any = false, mx = 0, all = true;
    for (const u of units) {
      const c = classAt(u.u, u.prev, u.next, { posPrior, framePrior: fp, minShare: SETTLE_SHARE });
      if (predictNominal(c.dist)) any = true;
      mx = Math.max(mx, naming(c.dist) ?? 0);
      if (!refusedBy(c.dist)) all = false;
    }
    pred.push(any); mass.push(mx); refused.push(all);
  }
  return { pred, mass, refused };
}

// ── one stratum, one battery (V2.1, V2.2, V2.4, V2.6) ────────────────────────
/**
 * analyseStratum({ gold, sent, idx, classify, variants, mask, ... })
 *   gold[i], sent[i]  over ALL rows; idx = the rows of this stratum
 *   classify(fp) → {pred[], mass[], refused[]} over ALL rows (fp = a frame prior or null)
 *   variants = { real: fp, marginal: fp|null, deranged: [fp...] }
 *   mask[i] = the ear delivered a unit for row i (null = every row; constants are scored THROUGH the mask)
 */
export function analyseStratum({ gold, sent, idx, classify, variants, mask = null, alpha = ALPHA, shuffleDraws = SHUFFLE_DRAWS, bootDraws = BOOT_DRAWS, permDraws = PERM_DRAWS, full = true, seed = SEED }) {
  const take = (arr) => idx.map((i) => arr[i]);
  const g = take(gold);
  const { ids, k } = compactIds(take(sent));
  const nNom = g.filter(Boolean).length;
  const majNom = nNom * 2 >= g.length;
  const mk = idx.map((i) => (mask ? Boolean(mask[i]) : true));
  const none = g.map(() => false);
  const arm = (fp) => { const c = classify(fp); return { pred: take(c.pred), mass: take(c.mass), refused: take(c.refused) }; };
  const A = { real: arm(variants.real) };
  if (full) A.prior_only = arm(null);
  if (variants.marginal) A.train_marginal = arm(variants.marginal);
  const derNames = [];
  (variants.deranged ?? []).forEach((fp, d) => { A[`deranged_${d}`] = arm(fp); derNames.push(`deranged_${d}`); });
  A.all_nominal = { pred: mk.slice(), mass: mk.map((x) => (x ? 1 : 0)), refused: none };
  A.majority_oracle = { pred: majNom ? mk.slice() : none, mass: mk.map((x) => (x ? 1 : 0)), refused: none };
  const sum = Object.fromEntries(Object.entries(A).map(([n, a]) => [n, summarise(confusion(a.pred, g))]));
  const mcc = Object.fromEntries(Object.entries(sum).map(([n, s]) => [n, mccOf(s)]));
  const f1 = (n) => sum[n]?.f1;
  const argmax = (names, val) => { let best = null; for (const n of names) if (best == null || (val(n) ?? -Infinity) > (val(best) ?? -Infinity)) best = n; return best; };
  const bestDraw = argmax(derNames, (n) => f1(n) ?? -1);
  const aucOf = (n) => auc(A[n].mass, g);
  const aucs = { real: aucOf("real"), uninformed: aucOf("all_nominal") };
  for (const n of derNames) aucs[n] = aucOf(n);
  const bestDrawAuc = argmax(derNames, (n) => aucs[n] ?? -1);
  aucs.deranged_best = bestDrawAuc ? aucs[bestDrawAuc] : null;
  const minDisc = minDiscordantFor(alpha);
  const flips = derNames.map((n) => A.real.pred.filter((p, i) => p !== A[n].pred[i]).length);

  const base = {
    n: g.length, nNominal: nNom, majorityIsNominal: majNom, sentences: k, sum, mcc, aucs, bestDraw, bestDrawAuc, derangedF1PerDraw: derNames.map((n) => f1(n)),
    flipsPerDraw: flips, arms: A, g, ids, k, mk, minDisc,
  };
  const why = !variants.real?.frames ? "no frame prior" : !g.length ? "no unseen tokens" : !nNom ? "no nominal among the unseen tokens (F1 undefined)" : k < minDisc ? `only ${k} sentences hold an unseen token (< ${minDisc}, the fewest a sign test can reject on)` : !bestDraw ? "frame prior too small to derange" : null;
  if (why) return { ...base, measurable: false, why };

  // ── V2.1: paired dF1 tests ─────────────────────────────────────────────────
  const rngP = mulberry32(seed + 2000), rngB = mulberry32(seed + 3000);
  const cnt = (n) => sentenceCounts(ids, k, A[n].pred, g);
  const C = { real: cnt("real"), majority_oracle: cnt("majority_oracle"), all_nominal: cnt("all_nominal"), der: cnt(bestDraw) };
  const tabs = { real: aucTable(ids, k, A.real.mass, g), uninformed: aucTable(ids, k, A.all_nominal.mass, g), der: aucTable(ids, k, A[bestDrawAuc].mass, g) };
  const R = { real: refusalTable(ids, k, A.real.refused, g) };
  const refOf = (n) => refusalSummary(g, A[n].refused);
  const eligible = derNames.filter((n) => refOf(n).refused >= minDisc);
  const bestRef = argmax(eligible, (n) => refOf(n).precision ?? -1);
  if (bestRef) R.der = refusalTable(ids, k, A[bestRef].refused, g);

  const sums3 = (c, ix) => [sumAt(c.tp, ix), sumAt(c.fp, ix), sumAt(c.fn, ix)];
  const dF1 = (b) => (ix) => { const x = f1c(...sums3(C.real, ix)), y = f1c(...sums3(b, ix)); return x == null || y == null ? null : x - y; };
  const precOf = (t, ix) => { const r = sumAt(t.ref, ix); return r ? sumAt(t.right, ix) / r : null; };
  const stats = {
    dMaj: dF1(C.majority_oracle), dAll: dF1(C.all_nominal), dDer: dF1(C.der),
    aucVsUninformed: (ix) => { const a = aucAt(tabs.real, ix), b = aucAt(tabs.uninformed, ix); return a == null || b == null ? null : a - b; },
    aucVsDeranged: (ix) => { const a = aucAt(tabs.real, ix), b = aucAt(tabs.der, ix); return a == null || b == null ? null : a - b; },
    refLift: (ix) => { const p = precOf(R.real, ix); const non = sumAt(R.real.non, ix), nom = sumAt(R.real.nom, ix); return p == null || non + nom === 0 ? null : p - non / (non + nom); },
    lostRate: (ix) => { const nom = sumAt(R.real.nom, ix); return nom ? sumAt(R.real.lost, ix) / nom : null; },
  };
  if (bestRef) stats.refDiffDer = (ix) => { const a = precOf(R.real, ix), b = precOf(R.der, ix); return a == null || b == null ? null : a - b; };
  const boot = clusterBootstrap(k, stats, { draws: bootDraws, rng: rngB, alpha });

  const f1Test = (name, ctlKey, ctlArm, bootName) => {
    const perm = pairedF1Permutation(C.real, C[ctlKey], { maxDraws: permDraws, rng: rngP });
    const b = boot[bootName];
    const delta = (f1("real") ?? 0) - (f1(ctlArm) ?? 0);
    const demonstrated = delta > 0 && perm.p < alpha && b.lower != null && b.lower > 0;
    return roundObj({
      arm: ctlArm, f1_real: f1("real"), f1_control: f1(ctlArm), delta, mcc_real: mcc.real, mcc_control: mcc[ctlArm],
      discordantSentences: perm.discordantSentences, underpowered: perm.discordantSentences < minDisc,
      permutationP: perm.p, permutationExact: perm.exact, bootLower: b.lower, bootUpper: b.upper, demonstrated, significant: demonstrated,
    });
  };
  const vsMaj = f1Test("majority_oracle", "majority_oracle", "majority_oracle", "dMaj");
  const vsAll = f1Test("all_nominal", "all_nominal", "all_nominal", "dAll");
  const vsDer = f1Test("deranged_best", "der", bestDraw, "dDer");
  const aucTest = (name, ctl, bootName) => {
    const delta = (aucs.real ?? 0) - (ctl ?? 0);
    const b = boot[bootName];
    return roundObj({ auc_real: aucs.real, auc_control: ctl, delta, bootLower: b.lower, bootUpper: b.upper, demonstrated: delta > 0 && b.lower != null && b.lower > 0 });
  };
  const aucVsUninformed = aucTest("uninformed", aucs.uninformed, "aucVsUninformed");
  const aucVsDeranged = aucTest("deranged", aucs.deranged_best, "aucVsDeranged");
  const claimA = vsMaj.demonstrated && vsAll.demonstrated && vsDer.demonstrated && aucVsUninformed.demonstrated && aucVsDeranged.demonstrated;

  // ── V2.4: claim B on this stratum ──────────────────────────────────────────
  const refReal = refOf("real");
  const b1 = refReal.refused >= minDisc && refReal.binomP != null && refReal.binomP < alpha && boot.refLift.lower != null && boot.refLift.lower > 0;
  const refDer = Object.fromEntries(derNames.map((n) => { const r = refOf(n); return [n, { refused: r.refused, precision: r.precision }]; }));
  const vacuousControl = !bestRef;
  const b2 = vacuousControl ? true : (boot.refDiffDer.lower != null && boot.refDiffDer.lower > 0);
  const b3 = refReal.lostNominalRate != null && refReal.lostNominalRate <= LOST_CEILING;
  const claimB = Boolean(b1 && b2 && b3);
  const claimBparts = {
    B1_unseen_refusal_beats_chance: Boolean(b1), refusedTokens: refReal.refused, minRefused: minDisc, binomP: refReal.binomP, liftBootLower: round(boot.refLift.lower),
    B2_beats_deranged_refusal: Boolean(b2), vacuousControl, bestDerangedDraw: bestRef, bestDerangedPrecision: bestRef ? round(refOf(bestRef).precision) : null, precisionDiffBootLower: bestRef ? round(boot.refDiffDer.lower) : null, derangedRefusal: refDer,
    B3_lost_beings_within_ceiling: Boolean(b3), lostNominalRate: round(refReal.lostNominalRate), lostNominalRateBootUpper: round(boot.lostRate.upper), ceiling: LOST_CEILING,
  };

  // ── V2.6: the licence ──────────────────────────────────────────────────────
  const rngS = mulberry32(seed + 1000);
  const shF1 = [], shAuc = [];
  for (let d = 0; d < shuffleDraws; d++) {
    const gs = shuffled(g, rngS);
    shF1.push(summarise(confusion(A.real.pred, gs)).f1 ?? 0);
    shAuc.push(auc(A.real.mass, gs) ?? 0.5);
  }
  shF1.sort((x, y) => x - y); shAuc.sort((x, y) => x - y);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const shQ = shF1.length ? quantile(shF1, 1 - alpha) : null;
  const shAucQ = shAuc.length ? quantile(shAuc, 1 - alpha) : null;
  const licence = {
    derangementChangedPredictions: Math.max(0, ...flips) > 0, flipsPerDraw: flips, flipsBestDraw: A.real.pred.filter((p, i) => p !== A[bestDraw].pred[i]).length,
    shuffledGoldMean: round(mean(shF1)), shuffledGoldQuantile: round(shQ), quantileLevel: 1 - alpha,
    realAboveShuffledQuantile: shQ != null && (f1("real") ?? -1) > shQ,
    shuffledAucMean: round(mean(shAuc)), shuffledAucQuantile: round(shAucQ), realAucAboveShuffledQuantile: shAucQ != null && (aucs.real ?? -1) > shAucQ,
  };
  licence.licensed = licence.derangementChangedPredictions && licence.realAboveShuffledQuantile && licence.realAucAboveShuffledQuantile;

  return {
    ...base, measurable: true, why: null,
    tests: { vsMajorityOracle: vsMaj, vsAllNominal: vsAll, vsDerangedBest: vsDer, aucVsUninformed, aucVsDeranged },
    claimA, claimB, claimBparts, refusal: roundObj(refReal), licence, shuffledGoldF1Mean: mean(shF1),
    pass: Boolean(claimA && claimB && licence.licensed),
  };
}

// ── the core: priors + parsed gold in, a result card out ─────────────────────
/**
 * measureCore({ sentences, posPrior, framePrior, peel, segment, derangeDraws, shuffleDraws, alpha })
 * → { n, score, control, margin, pass, controls, gaps, notes, details }   (stem/split are added by measure)
 * Pure: priors, ear and parsed sentences are the caller's.
 */
export function measureCore({ sentences, posPrior, framePrior = null, peel = null, segment = null, derangeDraws = DERANGE_DRAWS, shuffleDraws = SHUFFLE_DRAWS, bootDraws = BOOT_DRAWS, permDraws = PERM_DRAWS, alpha = ALPHA }) {
  const gaps = [], notes = [];
  const { sents, rows, excluded, nSentences, nTokens, mwtRows } = prepare(sentences);
  for (const [reason, count] of Object.entries(excluded).sort((a, b) => b[1] - a[1])) gaps.push({ reason: `unscored:${reason}`, count });
  const empty = (why) => ({ n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [...gaps, { reason: "unmeasured", count: 0, note: why }], notes: [why, ...notes], details: { sentences: nSentences, tokens: nTokens, scored: rows.length, excluded } });
  if (!posPrior?.forms) return empty("no POS prior");
  if (!rows.length) return empty("no scorable rows");
  if (!framePrior?.frames) { gaps.push({ reason: "no_frame_prior", count: rows.length }); notes.push("no frame prior: an unseen word gets no distribution and is not admitted"); }

  // headline classification (gold-token boundaries, gold neighbours: SENTENCE-LOOKAHEAD, V2.3)
  const memo = new Map();
  const classifyHead = (fp) => {
    if (!memo.has(fp)) {
      const cl = rows.map((r) => classAt(r.unit, r.prev, r.next, { posPrior, framePrior: fp, minShare: SETTLE_SHARE }));
      memo.set(fp, { cl, pred: cl.map((c) => predictNominal(c.dist)), mass: cl.map((c) => naming(c.dist) ?? 0), refused: cl.map((c) => refusedBy(c.dist)) });
    }
    return memo.get(fp);
  };
  const real = classifyHead(framePrior).cl;
  const unseen = real.map((c) => c.basis.startsWith("unseen"));
  const G = rows.map((r) => r.gold);
  const S = rows.map((r) => r.si);
  const unseenIdx = rows.map((_, i) => i).filter((i) => unseen[i]);
  const seenIdx = rows.map((_, i) => i).filter((i) => !unseen[i]);
  const mkVariants = (fp) => {
    const dr = [];
    for (let k = 0; k < derangeDraws; k++) { const d = derangeFramePrior(fp, SEED + k); if (d) dr.push(d); }
    return { real: fp, marginal: marginalOnlyFramePrior(fp), deranged: dr };
  };
  const variants = mkVariants(framePrior);
  const common = { gold: G, sent: S, alpha, shuffleDraws, bootDraws, permDraws };
  const H = analyseStratum({ ...common, idx: unseenIdx, classify: classifyHead, variants, full: true });
  const headline = H.measurable;

  // PREFIX-ONLY (V2.3): reported, never gating
  const prefixFP = prefixOnlyFramePrior(framePrior);
  const Pfx = headline && prefixFP ? analyseStratum({ ...common, idx: unseenIdx, classify: classifyHead, variants: { real: prefixFP, marginal: null, deranged: mkVariants(prefixFP).deranged }, full: false, seed: SEED + 7 }) : null;

  // HEARD ARM (V2.5): the reader's own ear
  let heard = null;
  if (segment) {
    const hu = heardUnitsUnspaced({ sentences, rows, segment });
    heard = { kind: "segmenter", per: hu.per, idx: unseenIdx, unaligned: { sentences: hu.unalignedSentences, rows: hu.unalignedRows } };
  } else if (peel && rows.some((r) => peel(r.unit) !== r.unit)) {
    const hu = heardUnitsPeeled({ sents, rows, posPrior, peel });
    heard = { kind: "peeler", per: hu.per, idx: rows.map((_, i) => i).filter((i) => hu.headUnseen[i]) };
  }
  let HA = null;
  if (heard && headline) {
    const hmemo = new Map();
    const classifyH = (fp) => { if (!hmemo.has(fp)) hmemo.set(fp, classifyHeard(heard.per, posPrior, fp)); return hmemo.get(fp); };
    const mask = heard.per.map((h) => (h?.units?.length ?? 0) > 0);
    HA = analyseStratum({ ...common, idx: heard.idx, classify: classifyH, variants, mask, full: false, seed: SEED + 13 });
    HA.kind = heard.kind;
    HA.maskShare = mask.filter(Boolean).length / mask.length;
  }

  const P = { real: classifyHead(framePrior).pred };
  const unseenX = unseenIdx.filter((i) => rows[i].upos === "X").length;
  if (unseenX) gaps.push({ reason: "unseen_gold_X_counted_non_nominal", count: unseenX });
  const abstained = unseenIdx.filter((i) => real[i].dist == null).length;
  if (abstained) gaps.push({ reason: "unseen_abstained_no_distribution", count: abstained });

  // ── seen / refusal (pooled and seen stay reported, ungated) ──
  const allIdx = rows.map((_, i) => i);
  const refRows = (idx) => roundObj(refusalSummary(idx.map((i) => G[i]), idx.map((i) => classifyHead(framePrior).refused[i])));
  const refusalDetails = { pooled: refRows(allIdx), seen: refRows(seenIdx), unseen: refRows(unseenIdx) };
  for (const r of Object.values(refusalDetails)) delete r.right;
  const seenGold = seenIdx.map((i) => G[i]);
  const nNomSeen = seenGold.filter(Boolean).length;
  const seenMajNom = nNomSeen * 2 >= seenGold.length;
  const seenSummary = (pv) => roundObj(summarise(confusion(seenIdx.map((i) => pv[i]), seenGold)));
  const byBasis = {};
  for (const i of seenIdx) { const b = real[i].basis.split("|")[0]; byBasis[b] = (byBasis[b] ?? 0) + 1; }
  const ctx = { informative: 0, contextFree: 0, marginal: 0 };
  for (const i of unseenIdx) {
    const key = real[i].basis.split("frame:")[1];
    if (key == null) continue;
    if (key === "*|*") { ctx.marginal++; continue; }
    const [a, b] = key.split("|");
    if (["UNK", "*"].includes(a) && ["UNK", "*"].includes(b)) ctx.contextFree++; else ctx.informative++;
  }
  const seenDeranged = H.bestDraw && variants.deranged.length ? seenSummary(classifyHead(variants.deranged[Number(H.bestDraw.split("_")[1])]).pred) : null;

  // ── v1's verdict, kept for the record (SUPERSEDED; reported, never gates) ──
  const v1 = (() => {
    if (!headline) return null;
    const correct = (n) => H.arms[n].pred.map((p, i) => p === H.g[i]);
    const sentU = unseenIdx.map((i) => S[i]);
    const cmp = (n) => {
      const s = blockSign(sentU, correct("real"), correct(n));
      const f1r = H.sum.real.f1, f1n = H.sum[n].f1;
      return { arm: n, f1_real: round(f1r), f1_control: round(f1n), f1Wins: (f1r ?? -1) > (f1n ?? -1), sentenceSign: roundObj(s.block), tokenSign: roundObj(s.token), significant: s.block.p < alpha, beats: (f1r ?? -1) > (f1n ?? -1) && s.block.p < alpha };
    };
    const cMaj = cmp("majority_oracle"), cAll = cmp("all_nominal"), cDer = cmp(H.bestDraw);
    const pooled = refusalSummary(G, classifyHead(framePrior).refused);
    const refusalOk = pooled.refused >= 1 && pooled.precision != null && pooled.precision >= pooled.base;
    const licV1 = H.licence.derangementChangedPredictions && H.licence.realAboveShuffledQuantile;
    return { note: "SUPERSEDED by v2 (V2.1): a sentence sign test on per-token ACCURACY gating an F1 comparison, and a pooled refusal gate. Kept so the disagreement is visible.", pass: Boolean(cMaj.beats && cAll.beats && cDer.beats && refusalOk && licV1), vsMajorityOracle: cMaj, vsAllNominal: cAll, vsDerangedBest: cDer, refusalOk, licenceV1: licV1 };
  })();

  // ── THE RULE ──
  let pass = null;
  const oraclePass = headline ? H.pass : null;
  let heardPass = null;
  if (HA) heardPass = HA.measurable ? HA.pass : null;
  if (!headline) {
    gaps.push({ reason: "unmeasured", count: H.g.length, note: H.why }); notes.push(`unmeasured: ${H.why}`);
  } else if (HA && !HA.measurable) {
    gaps.push({ reason: "heard_arm_unmeasured", count: HA.n, note: HA.why });
    pass = oraclePass === false ? false : null;
    if (oraclePass !== false) notes.push(`heard arm (${HA.kind}) unmeasured: ${HA.why}; pass is null, not true`);
  } else {
    pass = HA ? Boolean(oraclePass && heardPass) : oraclePass;
  }

  // typed recovery gaps for the heard arm
  if (heard?.kind === "segmenter") {
    const rec = (idx) => idx.filter((i) => heard.per[i]?.units?.length).length;
    const uRec = rec(unseenIdx), sRec = rec(seenIdx);
    gaps.push({ reason: "heard_unit_not_recovered:unseen", count: unseenIdx.length - uRec, denominator: unseenIdx.length });
    gaps.push({ reason: "heard_unit_not_recovered:seen", count: seenIdx.length - sRec, denominator: seenIdx.length });
    if (heard.unaligned.sentences) gaps.push({ reason: "heard_arm_unaligned_sentence", count: heard.unaligned.sentences, rows: heard.unaligned.rows });
  }
  if (heard?.kind === "peeler") {
    const noUnit = heard.per.filter((h) => !h.units.length).length;
    if (noUnit) gaps.push({ reason: "peel_no_scorable_unit", count: noUnit, denominator: rows.length });
  }

  // notes
  if (headline) {
    const T = H.tests;
    for (const [lab, t] of [["all-nominal", T.vsAllNominal], ["oracle majority", T.vsMajorityOracle], ["best deranged", T.vsDerangedBest]]) {
      if (!t.demonstrated) notes.push(`dF1 vs ${lab}: ${t.f1_real} vs ${t.f1_control} (delta ${t.delta}, permutation p=${t.permutationP}, bootstrap lower ${t.bootLower}${t.underpowered ? `, UNDERPOWERED: ${t.discordantSentences} discordant sentences` : ""}): not demonstrated`);
    }
    if (!T.aucVsUninformed.demonstrated) notes.push(`AUC ${T.aucVsUninformed.auc_real} not demonstrably above the uninformed control ${T.aucVsUninformed.auc_control} (bootstrap lower ${T.aucVsUninformed.bootLower})`);
    if (!T.aucVsDeranged.demonstrated) notes.push(`AUC ${T.aucVsDeranged.auc_real} not demonstrably above the best deranged draw ${T.aucVsDeranged.auc_control} (bootstrap lower ${T.aucVsDeranged.bootLower})`);
    const B = H.claimBparts;
    if (!B.B1_unseen_refusal_beats_chance) notes.push(`B1: UNSEEN refusals do not demonstrably beat chance (refused ${B.refusedTokens}, binomial p=${B.binomP}, lift bootstrap lower ${B.liftBootLower})`);
    if (!B.B2_beats_deranged_refusal) notes.push(`B2: UNSEEN refusal precision does not demonstrably beat the deranged prior's (${B.bestDerangedPrecision}, difference bootstrap lower ${B.precisionDiffBootLower})`);
    if (!B.B3_lost_beings_within_ceiling) notes.push(`B3: the reader wrongly refuses ${B.lostNominalRate} of true UNSEEN naming occurrences (> ceiling ${B.ceiling})`);
    if (!H.licence.licensed) notes.push(`licence NOT granted: derangement changed predictions=${H.licence.derangementChangedPredictions}, real F1 above shuffled-gold q${H.licence.quantileLevel}=${H.licence.realAboveShuffledQuantile}, real AUC above shuffled-gold q=${H.licence.realAucAboveShuffledQuantile}`);
    if (HA) notes.push(`heard arm (${HA.kind}) ${HA.measurable ? (HA.pass ? "PASSES" : "FAILS") : "unmeasured"}; claim A ${HA.measurable ? HA.claimA : "n/a"}, claim B ${HA.measurable ? HA.claimB : "n/a"}`);
    if (v1 && v1.pass !== H.pass) notes.push(`v1 (superseded) verdict ${v1.pass} differs from v2 ${H.pass}`);
  }

  // ── DIAGNOSTICS ADDED AFTER THE FIRST DEV RUN (not pre-registered; never gate `pass`) ──
  // (i) Arabic holds 27% of its gold tokens in multi-word-token ranges (clitic-glued surface forms);
  // (ii) gold X (transliterated names, which ARE beings) is 57% of Arabic's unseen tokens and is
  //      counted non-nominal by the brief (D4).
  const mwtSurface = (() => {
    if (!mwtRows.length) return null;
    const run = (r) => classAt(r.unit, r.prev, r.next, { posPrior, framePrior, minShare: SETTLE_SHARE });
    const cl = mwtRows.map(run);
    const pred = cl.map((c) => predictNominal(c.dist));
    const gold = mwtRows.map((r) => r.gold);
    const sm = summarise(confusion(pred, gold));
    const nonNom = gold.filter((x) => !x).length;
    const falseNominal = pred.filter((p, i) => p && !gold[i]).length;
    // the same surface units through the reader's bound-morpheme peeler (a unit is nominal iff any heard part is)
    const peeled = !peel ? null : (() => {
      const pp = [], unseenHead = [];
      let noUnit = 0;
      for (const r of mwtRows) {
        const parts = peel(r.unit).match(UNIT) ?? [];
        const hd = [];
        parts.forEach((u, j) => {
          if (scopeOf(u) !== "in") return;
          const c = classAt(u, j === 0 ? r.prev : parts[j - 1], j === parts.length - 1 ? r.next : parts[j + 1], { posPrior, framePrior, minShare: SETTLE_SHARE });
          hd.push({ u, nominal: predictNominal(c.dist), unseen: c.basis.startsWith("unseen") });
        });
        if (!hd.length) { noUnit++; pp.push(false); unseenHead.push(false); continue; }
        pp.push(hd.some((h) => h.nominal));
        unseenHead.push(hd.reduce((a, b) => (b.u.length > a.u.length ? b : a)).unseen);
      }
      const sp = summarise(confusion(pp, gold));
      return { accuracy: sp.accuracy, precision: sp.precision, recall: sp.recall, f1: sp.f1, falseNominalRate: nonNom ? pp.filter((x, i) => x && !gold[i]).length / nonNom : null, unseenShare: unseenHead.filter(Boolean).length / mwtRows.length, noScorableUnit: noUnit };
    })();
    return roundObj({
      note: "what the reader sees for a multi-word-token surface form (Spanish del, Arabic clitic-glued words): gold nominal iff any of its syntactic words is NOUN/PROPN; classified as ONE unit",
      n: mwtRows.length, goldNominalShare: gold.filter(Boolean).length / gold.length,
      unseenShare: cl.filter((c) => c.basis.startsWith("unseen")).length / cl.length,
      accuracy: sm.accuracy, precision: sm.precision, recall: sm.recall, f1: sm.f1,
      allNominalF1: summarise(confusion(gold.map(() => true), gold)).f1,
      falseNominalRate: nonNom ? falseNominal / nonNom : null, // a non-nominal contraction/clitic word read as a possible being
      peeled: peeled ? roundObj(peeled) : null,
    });
  })();
  const xSensitivity = (() => {
    const xi = unseenIdx.filter((i) => rows[i].upos === "X");
    if (!xi.length) return null;
    const goldX = unseenIdx.map((i) => NAMING.has(rows[i].upos) || rows[i].upos === "X");
    const rl = unseenIdx.map((i) => P.real[i]);
    return roundObj({
      note: "unseen tokens with gold X (transliterated names, foreign words) counted as NOMINAL instead — the reader's naming mass is NOUN+PROPN only",
      unseenX: xi.length, xShareOfUnseen: xi.length / unseenIdx.length,
      xPredictedNominal: xi.filter((i) => P.real[i]).length / xi.length,
      f1_real: summarise(confusion(rl, goldX)).f1, f1_allNominal: summarise(confusion(goldX.map(() => true), goldX)).f1,
      accuracy_real: summarise(confusion(rl, goldX)).accuracy, nominalShare: goldX.filter(Boolean).length / goldX.length,
    });
  })();

  // ── the card ──
  const controls = {};
  const armF1 = (n) => round(H.sum[n]?.f1);
  for (const nme of ["majority_oracle", "all_nominal", "prior_only", ...(H.sum.train_marginal ? ["train_marginal"] : [])]) controls[nme] = armF1(nme);
  if (H.bestDraw) controls.deranged_best = armF1(H.bestDraw);
  if (headline) controls.shuffled_gold = round(H.licence.shuffledGoldMean);
  const score = H.sum.real.f1;
  const strongest = Object.values(controls).filter((v) => v != null);
  const control = strongest.length ? Math.max(...strongest) : null;
  const armRow = (n) => (H.sum[n] ? roundObj({ ...H.sum[n], mcc: H.mcc[n] }) : null);
  const rule = headline ? {
    version: PREREG_VERSION, measurable: true, minDiscordantSentences: H.minDisc, unseenSentences: H.sentences,
    ...H.tests, claimA: H.claimA, claimB: H.claimB, refusalOk: H.claimB, refusal: H.claimBparts, licence: H.licence,
    oracleBoundaryPass: oraclePass, heardArm: HA ? { kind: HA.kind, measurable: HA.measurable, pass: HA.measurable ? HA.pass : null } : null,
    prefixOnlyClaimA: Pfx?.measurable ? Pfx.claimA : null, v1_superseded: v1, pass,
  } : { version: PREREG_VERSION, measurable: false, why: H.why, pass: null };
  const heardCard = HA ? {
    kind: HA.kind,
    note: HA.kind === "segmenter"
      ? "END-TO-END heard arm: the reader's own segmenter over the raw sentence text; a gold token is recovered iff a heard unit has exactly its span; unrecovered unseen rows count as predicted non-nominal with mass 0; every control is scored through the same recovery mask"
      : "heard arm: the reader's bound-morpheme peeler; token nominal iff any heard unit is; stratum = the HEAD unit's seen/unseen; mass = max naming mass; refused iff all units are",
    stratumRows: heard.idx.length, ...(heard.kind === "segmenter" ? { unseenGoldRows: unseenIdx.length, recoveredUnseen: heard.idx.filter((i) => heard.per[i]?.units?.length).length, recoveredShareUnseen: round(heard.idx.filter((i) => heard.per[i]?.units?.length).length / Math.max(1, heard.idx.length)), recoveredShareAllRows: round(HA.maskShare), unaligned: heard.unaligned } : { tokensWithUnit: round(HA.maskShare) }),
    measurable: HA.measurable, why: HA.why, n: HA.n, claimA: HA.measurable ? HA.claimA : null, claimB: HA.measurable ? HA.claimB : null, pass: HA.measurable ? HA.pass : null,
    arms: Object.fromEntries(["real", "all_nominal", "majority_oracle"].map((n) => [n, roundObj({ ...HA.sum[n], mcc: HA.mcc[n] })])),
    deranged_best: HA.bestDraw ? roundObj({ ...HA.sum[HA.bestDraw], mcc: HA.mcc[HA.bestDraw] }) : null, auc: roundObj({ real: HA.aucs.real, uninformed_recovery_only: HA.aucs.uninformed, deranged_best: HA.aucs.deranged_best }),
    ...(HA.measurable ? { tests: HA.tests, refusal: HA.claimBparts, licence: HA.licence } : {}),
  } : null;
  const prefixCard = Pfx ? {
    note: "PREFIX-ONLY (V2.3): the frame prior cut to its P|* and *|* rows; the next word is not read. REPORTED, never gating",
    measurable: Pfx.measurable, why: Pfx.why, claimA: Pfx.measurable ? Pfx.claimA : null,
    real: roundObj({ ...Pfx.sum.real, mcc: Pfx.mcc.real }), deranged_best: Pfx.bestDraw ? roundObj({ ...Pfx.sum[Pfx.bestDraw], mcc: Pfx.mcc[Pfx.bestDraw] }) : null,
    auc: roundObj({ real: Pfx.aucs.real, deranged_best: Pfx.aucs.deranged_best }), ...(Pfx.measurable ? { tests: Pfx.tests } : {}),
    lookaheadF1: round(H.sum.real.f1), lookaheadAuc: round(H.aucs.real),
  } : null;
  const details = {
    sentences: nSentences, tokens: nTokens, scored: rows.length,
    excluded, unseenShare: round(unseenIdx.length / rows.length), seenN: seenIdx.length, unseenN: unseenIdx.length,
    granularity: "SENTENCE-LOOKAHEAD (S3 variant): each row is classified from both neighbours of its own sentence; the pass is at sentence granularity; the token-causal variant is details.prefixOnly",
    unseenGold: { nominalShare: round(H.nNominal / Math.max(1, H.n)), majorityIsNominal: H.majorityIsNominal, upos: countBy(unseenIdx.map((i) => rows[i].upos)) },
    unseen: {
      real: armRow("real"), majority_oracle: armRow("majority_oracle"), all_nominal: armRow("all_nominal"), prior_only: armRow("prior_only"), ...(H.sum.train_marginal ? { train_marginal: armRow("train_marginal") } : {}),
      deranged_best: H.bestDraw ? armRow(H.bestDraw) : null, derangedF1PerDraw: H.derangedF1PerDraw.map((x) => round(x)),
      auc: { real: round(H.aucs.real), deranged_best: round(H.aucs.deranged_best) }, contextOfUnseen: ctx,
    },
    seen: {
      real: seenSummary(P.real), majority_oracle: seenSummary(rows.map(() => seenMajNom)), all_nominal: seenSummary(rows.map(() => true)),
      deranged_best: seenDeranged, nominalShare: round(nNomSeen / Math.max(1, seenGold.length)), byBasis,
    },
    refusal: refusalDetails,
    boundary: { oracleBoundaries: true, ear: heard ? heard.kind : "none", scope: heard ? `gold-token boundaries AND the heard arm (${heard.kind}); pass requires both` : "gold-token boundaries; the ear changes no unit" },
    rule,
    heardArm: heardCard,
    prefixOnly: prefixCard,
    postRegistrationDiagnostics: ["mwtSurface", "xSensitivity"],
    mwtSurface, xSensitivity,
    constants: { NAME_SHARE, SETTLE_SHARE, ALPHA: alpha, DERANGE_DRAWS: derangeDraws, SHUFFLE_DRAWS: shuffleDraws, BOOT_DRAWS: bootDraws, PERM_DRAWS: permDraws, LOST_CEILING, SEED },
  };
  return { n: H.n, score: round(score), control: round(control), margin: score == null || control == null ? null : round(score - control), pass, controls, gaps, notes, details };
}

const countBy = (arr) => { const o = {}; for (const x of arr) o[x] = (o[x] ?? 0) + 1; return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); };

/** The pre-registration digests of THIS file: the whole leading comment block, and the v1 block recomputed (to prove v1 was not edited). */
export function preregDigests(file) {
  const lines = [];
  for (const l of fs.readFileSync(file, "utf8").split("\n")) { if (l.startsWith("//") || !l.trim()) lines.push(l); else break; }
  const cut = lines.findIndex((l) => l.startsWith("// ═══ PRE-REGISTRATION v2"));
  const sha = (ls) => createHash("sha256").update(ls.join("\n").trim()).digest("hex");
  const v1 = cut < 0 ? null : sha(lines.slice(0, cut));
  return { whole: headerDigest(file), v1, v1Verified: v1 === PREREG_V1_SHA256 };
}

// ── the module contract ─────────────────────────────────────────────────────
export async function measure({ stem, split = "dev", limit = null }) {
  const base = { stem, rung: RUNG.id, split };
  const unmeasured = (why, typed) => ({ ...base, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [...(typed ? [{ reason: typed, count: 0 }] : []), { reason: "unmeasured", count: 0, note: why }], notes: [why], details: {} });
  try {
    const g = grammarFor(stem);
    if (!g.language) return unmeasured(g.gap ?? `no received grammar for ${stem}`, "no_pos_prior");
    const file = conlluPath(stem, split);
    if (!file) return unmeasured(`no held-out ${split} gold on disk for ${stem}`, "no_gold");
    const sentences = readConllu(file, { limit });
    const ear = makeEar({ posPrior: g.posPrior, proclitics: g.proclitics, enclitics: g.enclitics });
    const out = measureCore({ sentences, posPrior: g.posPrior, framePrior: g.framePrior, peel: ear.peel, segment: ear.segment });
    const dg = preregDigests(fileURLToPath(import.meta.url));
    out.details.prereg_version = PREREG_VERSION;
    out.details.prereg_sha256 = dg.whole;
    out.details.prereg_v1_sha256 = PREREG_V1_SHA256;
    out.details.prereg_v1_verified = dg.v1Verified;
    out.details.limit = limit;
    out.details.priors = { pos: g.posPrior.provenance?.tokens_read ?? null, frameHapax: g.framePrior?.provenance?.hapax ?? null, language: g.language };
    return { ...base, ...out };
  } catch (e) {
    return unmeasured(`instrument error: ${e?.message ?? e}`, "instrument_error");
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// node eval/competence/r2-class.mjs --stem eng [--split dev|test] [--limit N]
// node eval/competence/r2-class.mjs --all [--split dev]
// The TEST split is computed ONCE (rule 9): an existing test card is not overwritten without --rerun.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs();
  if (args.split === "test" && !args.flags.has("rerun")) {
    const stems = args.all ? availableStems() : [args.stem];
    const done = stems.filter((s) => s && fs.existsSync(path.join(COMPETENCE_OUT, `r2-${s}-test.json`)));
    if (done.length) { console.error(`r2: test card already computed for ${done.join(", ")} — the final card is computed once; pass --rerun to override`); process.exit(2); }
  }
  const stems = args.all ? availableStems() : args.stem ? [args.stem] : null;
  if (!stems) { console.error("usage: node eval/competence/r2-class.mjs --stem <stem> [--split dev|test] [--limit N] | --all"); process.exit(1); }
  for (const stem of stems) {
    const res = await measure({ stem, split: args.split, limit: args.limit });
    writeResult(RUNG.id, stem, args.split, res);
    console.log(JSON.stringify(res));
  }
}
