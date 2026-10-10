// eval/competence/r5-parallel.mjs — RUNG R5: CROSS-LANGUAGE AGREEMENT ON PARALLEL TEXT.
//
//   node eval/competence/r5-parallel.mjs --stem <stem> [--split dev|test] [--limit N] [--corpus udhr|classics] [--verbose]
//   node eval/competence/r5-parallel.mjs --all [--split dev|test]          (one JSON line per stem)
//   import { RUNG, measure, measureAll } from "./r5-parallel.mjs"
//   Result cards are also written to /private/tmp/claude-501/competence/r5-<stem>-<split>.json.
//
// ═══ PRE-REGISTRATION (FOLD-CONSTITUTION II.5: written before the first run of this file; ═══
// ═══ no threshold below is tuned after a result; a failure is reported as a failure)       ═══
// DISCLOSURE. Before this header was written I inspected only the STRUCTURE of the data: the paragraph/heading
// layout of the UDHR files, the chapter-heading counts of the parallel-classics editions, the paragraph counts
// of the War and Peace aligned excerpts. No being was read, no instrument was run, no number was computed.
//
// CLAIM. Parallel text must give the same cast in every language. Read causally, one sentence at a time,
// lowercased (no capital is ever seen), by its DECLARED listener and the listening cast, a language's admitted
// beings (cast.beings(): nominated at 2 arrivals, standing vs the received baseline at 5%) are distributed over
// the aligned UNITS the way an English being is: the concept in Article 12 in English is in Article 12 in
// Spanish. Matched with NO dictionary — by the correlation of per-unit PRESENCE only, English as pivot — the
// head of a language's beings finds an English counterpart more strongly than (i) chance (shuffled unit order),
// (ii) non-parallel English of the SAME unit-length profile, (iii) a deranged unit alignment.
//
// PARALLEL TEXT AND SPLITS (rule 9, said plainly). The UDHR is in no UD treebank, so for every PRIOR it is
// held-out by construction; R5 itself has NO fitted parameter — every constant below is declared here.
//   split dev  = corpus UDHR: 31 units = Preamble + Articles 1..30, one file per language (stem -> file below).
//   split test = corpus CLASSICS (parallel-classics): units = chapters; pinocchio (en, it, fi; 36 chapters),
//                then alice-in-wonderland (en, de, fr, it; 12 chapters). Never read by the author: only its
//                chapter-HEADING COUNTS were inspected. A stem with no edition there gets the typed gap
//                `no_parallel_text` (pass null) — R5 TEST COVERS ONLY ita, fin, deu, fra, and eng (vs ita).
//   `--corpus` overrides the corpus (the orchestrator's decision, recorded in details.corpus); it is NOT a
//   licence to call a UDHR run held-out-test: the dev smoke runs on UDHR have been seen.
//   War and Peace en/fr/ru "aligned": NOT USABLE AS PARALLEL (3-4 chapters; 111 / 107 / 106 blank-separated
//   paragraphs: the paragraphs do not align 1:1, and 3 chapters cannot support a correlation). A typed gap, not
//   a corpus. Its English edition (pg2600) is used ONLY as the NON-PARALLEL control text.
//   Units must AGREE IN COUNT with the English units or the language is a typed gap `unit_count_mismatch`.
//   UDHR heading detection (declared, structural, no word list): after the metadata paragraph, the native title
//   and the preamble heading (paragraph index 2, short), the heading FAMILY is the short paragraph (<= 24
//   characters) whose first letter-word (first character, for Han/kana) occurs exactly 30 times; any other
//   count, or two such families, is the gap. Unit 0 = every paragraph before the first heading; unit k =
//   the paragraphs after heading k.  `--limit N` = read at most the first N sentences of EACH unit.
//
// PIVOT. English; English itself is read against SPANISH (the pivot cannot be scored against itself: 1 by
// construction); on classics English is read against Italian. Roles swapped, same instrument.
//
// DEFINITIONS (all declared; presence not counts; retrospective matching).
//   Ledger(L)   the cast's beings() for language L after the whole corpus, ordered mentions desc, sentences
//               desc, surface asc. Each being gets the PRESENCE vector v in {0,1}^U: v[u] = 1 iff the being has
//               >= 1 occurrence (the cast's own per-occurrence evidence, sentence -> unit) in unit u.
//   corr(a, b)  Pearson of two presence vectors; 0 when either is constant (undefined is 0, never rewarded).
//   best(a, B)  max over the pivot candidates b in B of corr(a, b)    (no dictionary, no cognate, no script).
//   m(A, B)     mean over the target's top-K beings a of best(a, B).   K = 20 (PROVISIONAL: a bare integer, P4;
//               a sweep K in {10, 20, 40} is DESCRIPTIVE only and never enters the pass rule). K_eff = min(K,
//               |A|); a shortfall is the typed gap `beings_below_K`. B = the pivot's top-M_c beings, where M_c =
//               the SMALLEST pivot ledger among the real pivot and the 19 non-parallel ones (derived from the
//               material, so no arm gets more candidates to match than another).
//   share       fraction of the target's top-K whose best(a, B) exceeds tau, tau = the 95th percentile of the
//               POOLED shuffled-null best values (all K x 999 of them) — the spec's second metric, reported in
//               details, never in the rule.
//   RETROSPECTIVE. The match is a whole-text statistic computed AFTER reading: it judges beings against their
//   full distribution over units, i.e. it is S3 lookahead BY CONSTRUCTION and is LABELLED so (details.matching).
//   It is a measurement of the reader's output, not part of the reader. The READER's causality is checked
//   separately (clause C).
//
// ARMS (the real arm and its controls; every arm reads the same lowercased units through the same listener):
//   real          target ledger vs pivot ledger, units aligned.                                      [REAL ARM]
//   shuffled      B = 999 uniform random permutations pi of the TARGET's unit order (the same pi for every
//                 being of the target), each scored by m; p = (1 + #{m_pi >= m_real}) / 1000; tau_m =
//                 the 95th percentile of m_pi.                                                          [control]
//   deranged      ONE Sattolo derangement of the target's units (no unit keeps its place), scored by m. [control]
//   nonparallel   R = 19 (the fewest giving p = 1/20 = 0.05) readings of War and Peace (English), consecutive
//                 disjoint windows, each cut into U units by the SAME token-length profile as the English
//                 UDHR units (so unit LENGTH stays aligned and only the CONCEPTS are non-parallel — the
//                 stricter control; an equal-chunk control would let a long preamble and short articles cost
//                 nothing). For a non-English target the pivot is replaced by the window; for English (target
//                 side English) the TARGET is replaced by the window against the Spanish pivot.          [control]
//   ablations     [SUPERSEDED BY A1-R: `rawTop` is now raw_both, a GATING reader arm and part of `control`; `nominated` stays
//                 descriptive but its failure is STATED] DESCRIPTIVE ONLY, in `controls` as ablation_*, never in the rule and never in `control`:
//                 `nominated` = same ledger WITHOUT the standing test (rateOf = 1e-300: every form with >= 2
//                 arrivals; prior refusals kept); `rawTop` = same ear, NO prior (nothing refused), no
//                 standing: every word unit with >= 2 arrivals ranked by frequency. Each is read on BOTH
//                 sides the same way and tested against its own shuffled null.
//
// PASS RULE (PASS iff ALL; not softened after a run).   [AMENDMENT A1 below ADDS clauses S H R, REWRITES D and C
// stricter, and relabels N; read it with this list. Nothing in this list was relaxed.]
//  (P) the real m exceeds the shuffled null at 5%: p <= 0.05 (exact permutation test above).
//  (N) NON-PARALLEL CONTROL DOES NOT MATCH THE REAL ARM: m_real > m of EACH of the 19 non-parallel readings
//      (p = 1/20). [The spec asked for "the non-parallel control does not [pass the shuffled null]"; that
//      literal quantity is REPORTED as details.np.passShuffleShare, but the pass uses the direct comparison,
//      because a length-matched control may pass a shuffled null by length alone and the real arm must beat it.]
//  (D) m_real > m of the deranged arm.   [A1-D: now the MAX over 19 derangements, not one Sattolo draw]
//  (L) LICENCE (II.23): the statistic moves under the perturbation — the shuffled-null mean is below m_real and
//      the null has spread (sd > 0). A control that reaches the real arm means the instrument or the mechanism
//      is broken: pass = false with a note saying so, never a pass.
//  (C) CAUSAL CHECK of the reader (S3): the target's beings after 60% of its sentences, snapshotted mid-read,
//      equal a fresh cast fed only that prefix.   [SUPERSEDED BY A1-C: that check shared ONE hear closure between the
//      snapshot and the fresh cast and so could not see lookahead in the listener; see the amendment]
//  pass = null (typed gap) when the corpus has no edition (`no_parallel_text`), the unit count disagrees
//  (`unit_count_mismatch`), the language has no prior/baseline (`no_prior`/`no_baseline`), the language is
//  unheard (`language_unheard`), or the target or the pivot admits no being (`underpowered`).
//  score = max(0, m_real) (0..1); control = max(tau_m, max of the 19 non-parallel m, m_deranged); margin =
//  score - control > 0 exactly when the continuous parts of P, N, D hold.
//
// PREDICTIONS (written blind; the ORDERS are the claims, the numbers are guesses):
//  P1 real m exceeds the shuffled null in every UDHR stem with a settled ear (spa, fra, deu, ita, rus, cmn-hans,
//     arb, eng-vs-spa); the question is the control, not the null.
//  P2 the length-matched non-parallel readings often pass a shuffled null by length alone (details.np.
//     passShuffleShare >= 0.25 in most stems): the shuffled null alone does NOT license a concept claim.
//  P3 clause N holds in the cased, spaced stems (spa, fra, deu, ita, eng); it is the clause that fails first
//     in the stems with a weak ear (kor: the particle stays on the unseen stem and splits one concept over
//     several forms; arb: al- is not folded; cmn-hans: segmentation quality).
//  P4 ablation: the prior-free rawTop arm (function words) agrees AS WELL AS OR BETTER than the keyed arm in
//     at least half the stems — frequent forms are present in every long unit in every language, so frequency
//     profile = length profile. The cast's 5% standing gate (already falsified on recurrence) does not improve
//     cross-language agreement either: nominated >= keyed in most stems.
//  P5 licence holds (shuffled-null mean < m_real) wherever P holds, by construction of the permutation test.
//  P6 headline guess: m_real in [0.55, 0.85] for spa/fra, [0.40, 0.70] for kor/arb; shuffled-null 95th ~ 0.35-0.50.
//
// LIMITS (declared): 31 units give sparse presence vectors (a concept in 2 articles has C(31,2) alignments),
// so single-being matches are noisy and the statistic is a MEAN over the head; the retrospective match
// uses the whole text; English is the only pivot (no transitivity check); R4 claims are NOT measured here
// (typed gap `claims_unmeasured`: a claim needs a relation matcher across languages and no dictionary-free
// one is licensed); UDHR is legal register, 1 text, 1 translator per language; the non-parallel text is
// English literature only; the test corpus covers 4 stems.
//
// ═══ AMENDMENT A1 — 2026-10-06 — PRE-REGISTERED BEFORE THE FIRST RUN OF THIS AMENDED FILE (II.5) ═══════════════════
// WHY. A reviewer ran this instrument on readers broken ON PURPOSE (no prior; a deranged POS prior; a wrong-language listener:
// Finnish reading Spanish/French/German/Polish/Turkish, Ukrainian reading Russian, Persian reading Arabic; the ear off) and EVERY
// ONE STILL PASSED on every stem tried. The cause is mechanical: a being here is a surface string and its presence vector depends
// only on where the string occurs, so the original rule measured whether frequent words recur in the same articles across
// languages (frequency and unit-length profiles hold in any parallel text; UDHR unit lengths correlate 0.99+) and could not see the
// READER. The shipped ablation rawTop had already said so (rawTop >= keyed in 5 of 24 DEV stems) and II.23 says what that means: a
// control that does as well as the real arm means the instrument or the mechanism is broken; those ablations belonged in the rule.
//   F1 (major)   clause C could not detect lookahead: the snapshot and the fresh cast shared ONE hear closure, so a hear that reads the
//                whole text passed; it ran on one ledger only; `causalOk !== false` let a MISSING check pass; no control built to fail.
//   F2 (major)   rawTop / nominated were outside the rule and outside `control`; R5 passed readers that frequency alone matches.
//   F3 (major)   clause N's control (War and Peace) is another genre with sparser beings (a dense-vs-sparse confound); the deranged
//                arm was a single Sattolo draw; the length-matched stratified null with both ledgers real was kept out of the rule.
//   F4 (blocker) the verdict was insensitive to reader quality (the four breaks above all passed).
// DISCLOSURE (II.5, said plainly). The 24 DEV stems were run under the ORIGINAL rule and those numbers (rawTop and nominated
// included) have been seen, so A1 is NOT blind on DEV. It was written before the amended file's first run and none of its constants
// is tuned on a dev result: alpha is the declared 5%; "19" is the fewest draws that give p = 1/20 (as N_NP); strata = min(8, floor(U/3))
// (the reviewer's "8 or more", each stratum holding >= 3 units); the cyclic shifts are ALL U-1 non-trivial ones. The first card BLIND to
// A1 is the TEST run (parallel-classics), which has NOT been run. A1 only ADDS clauses or makes an existing one stricter.
//
// SCOPE LABEL (F2). What this rung measures is the PARALLEL-TEXT AGREEMENT OF THE HEARD LEDGER. It is evidence of READING competence
// only through clause R (the reader adds over frequency, a deranged prior, a wrong-language listener and no ear). A pass with rawTop
// >= keyed would mean "instrument does not separate the reader from frequency", and R makes that case a FAIL, not a pass.
//
// A1-C  CAUSALITY OF THE READER (REPLACES C). A reader is a FACTORY `seen -> hear`; `seen = {sentences, text}` is ALL it may have
//   heard. A ledger is read with factory(seen = everything); the check snapshots cast.beings() after 60% of the sentences and compares
//   it with a FRESH cast, fed only the prefix by a FRESH hear built by factory(seen = the prefix): a hear that consults more than the
//   prefix gives a different ledger. It runs on EVERY ledger read (target, pivot, every reader arm and draw, every one of the 19
//   non-parallel windows) and C holds only if EVERY one is `ok === true`: no check, no pass (a hear passed as a bare closure cannot be
//   checked and says ok = null). LICENCE (a control built to fail, II.23): the mechanical mutant `lookahead_deaf` (a hear that does not
//   listen to the first half of what it is told it will hear: it needs the TOTAL) must be CAUGHT on this very text; else C is
//   unlicensed: typed gap `causality_unlicensed`, pass null. Reported, not gating: `lookahead` (forms of whole-text frequency >= 3 forced
//   to NOUN) caught or not. WHAT C STILL DOES NOT SHOW (S3, labelled): the final ledger is a WHOLE-TEXT ledger: cast.beings() judges early
//   occurrences with end-of-text token totals and ranks by whole-text mentions, the match is retrospective; C shows that cast.add,
//   cast.beings and the (declared, stateless) listener are functions of the prefix, not that early occurrences were admitted causally.
//
// A1-R  THE READER ADDS (new, GATING). Every arm reads the same lowercased units and differs ONLY in the target-language READER (the
//   pivot is the real production pivot ledger; K_c, M_c as the real arm) unless noted:
//     raw_target     target read prior-free, no standing test (mode raw);
//     raw_both       BOTH sides prior-free, no standing: the old rawTop ablation, now gating, each side's FULL ledger as candidates (a
//                    control may hold more candidates than the real arm: the stricter reading; the capped value is reported too);
//     deranged_prior N_DP = 19 draws, each a full reading with the POS class vectors deranged among the language's forms and the frame
//                    prior's distributions among its frame keys (Sattolo, seeded; the ear left real); gating value = the MAX over draws;
//     wrong_language the listener of another language reading this one (declared WRONG_LISTENER; a CONTROL, never a fallback reading);
//     ear_off        the ear removed (no segmentation, no proclitic/enclitic peeling).
//   LICENCE per arm (II.23): its top-K_c head differs from the production head (the perturbation moved the statistic's input). An arm
//   that did not move is typed `control_not_licensed` and does not gate (an inert ear is not a reader that fails); deranged_prior is
//   licensed only with 19 draws that moved the head (up to 57 attempts). R holds iff m_real > m of EVERY licensed arm (strict: a tie
//   "does as well", II.23) AND at least one raw arm is licensed. `nominated` (no standing test) stays DESCRIPTIVE: its failure
//   (nominated >= keyed) is STATED in notes and `reader_adds.over_nominated`, not gated: it removes one component of the same reader,
//   and R5 cannot separate "the standing gate does not help" from "denser presence vectors agree better" (the gate's own claim is R3's).
//
// A1-S  SAME-GENRE STRATIFIED NULL (new, GATING). Real target against the REAL pivot (both ledgers real), the target's units permuted
//   only WITHIN g = min(8, floor(U/3)) strata of the English unit token-length profile; 999 draws; p = (1 + #{m_perm >= m_real}) / 1000
//   <= 5%. Concepts are misaligned, unit LENGTH and the pivot's density are kept: the control the War and Peace arm is not.
// A1-H  CYCLIC SHIFTS (new, GATING). m_real > the MAX of m over ALL U-1 non-trivial cyclic shifts of the target's unit order.
// A1-D  DERANGEMENTS (REPLACES D). m_real > the MAX of m over N_DER = 19 seeded Sattolo derangements (one draw was noise).
// A1-N  RETAINED, RELABELLED. War and Peace is another genre and density: a PASS of N does not show parallelism (it can be won on
//   density alone), so N is a NECESSARY clause only; the same-genre evidence is S and H. Descriptive genre control; still gating.
// A1-V  VERDICT LICENCE (opt-in on dev with `--mutants` / {mutants:true}; REQUIRED for the TEST card, so ON BY DEFAULT on split test). The whole rule is re-run with the system
//   under test replaced by each broken reader: raw, deranged_prior (a draw not among the 19 controls), wrong_language, ear_off,
//   lookahead, lookahead_deaf. A mutant whose head did not move is not counted (`mutant_not_moving`). If any COUNTED mutant PASSES,
//   the production pass on that stem is OVERRIDDEN to false with the II.23 warning `verdict_not_sensitive`.
// pass = P and N and D and L and C and S and H and R (and V when run). A missing input FAILS CLOSED (a clause that was not computed is
// never a pass). score = max(0, m_real); control = max(tau_m, np max, max derangement, stratified tau, shift max, every licensed
// reader arm); margin = score - control (> 0 exactly when the continuous parts of P N D S H R hold).
//
// A1 PREDICTIONS (written blind to the amended run; the ORDERS are the claims, the numbers are not):
//  A1-P1 broken readers FAIL: on each of eng, cmn-hans, arb, kor, spa the raw, wrong_language and lookahead_deaf mutants FAIL the
//        amended rule (raw and wrong_language fail R, lookahead_deaf fails C); the deranged_prior mutant is one draw exchangeable with
//        the 19 control draws, so its false-pass rate is 1/20 by construction: it fails in at least 4 of the 5 stems. ear_off fails
//        R where the ear moves the ledger (expected cmn-hans, kor, arb); where it does not (expected eng, spa) it is `mutant_not_moving`.
//  A1-P2 production: eng and spa PASS the amended rule; kor passes; arb is a coin flip (its raw_both was within 0.02 of keyed in the
//        first run); cmn-hans FAILS R (its first-run rawTop, 0.785, was above its keyed 0.743). Across all 24 dev stems the pass count
//        falls below 24, with R the failing clause in cmn, cmn-hans, heb, pol, vie (rawTop >= keyed in the first run).
//  A1-P3 the standing gate does not help agreement: nominated >= keyed in at least 4 of the 5 stems (STATED as a failure, not gated).
//  A1-P4 S and H hold wherever P holds in these 5 stems (a reviewer's independent check: stratified p 0.001-0.003 at 4-15 strata).
//  A1-P5 C is licensed in all 5 stems (the mechanical lookahead mutant is caught) and the freq lookahead mutant is caught in at least 4.
//  A1-P6 the old non-parallel margins stay thin where they were thin (vie 0.011, tur 0.045, fin 0.066): N is not what separates readers.
//
// A1.1 — 2026-10-06 — AMENDMENT TO A1, MADE AFTER THE FIRST RUN OF A1 (5 DEV stems, mutants on) AND BEFORE ITS SECOND. DISCLOSED.
//   What the first run showed: with the ear off, cmn-hans admitted ONE being; its m was 1.0 = a mean over a head of ONE, that single being
//   having found a perfect partner by luck. That is a head-size artifact, not a control that "does as well as the real arm" (a mean over
//   K_eff = 1 beats a mean over 20 by variance alone). FIX, a principle and not a threshold: every READER arm is compared over the SAME K_c
//   slots, and a slot the arm did not fill is 0 ("undefined is 0, never rewarded", this header's own rule for a constant vector, applied to
//   a missing being): m_arm = (sum of the best matches of its first K_c beings) / K_c. The real arm already has K_c = K_eff by construction
//   (armCaps) and the nulls are taken on the real arm's head, so only the reader arms change. DIRECTION, said plainly: it can only LOWER a
//   control whose head is short, i.e. it can make R EASIER for the real arm; in the 5 stems it moves cmn-hans ear_off (1.0 -> 1/K_c) and
//   possibly some deranged draws; the other cmn-hans arms (raw_both 0.7849, wrong_language 0.7467 against the real 0.7425) have a full
//   head and beat the real arm with or without A1.1, so cmn-hans fails R either way. The first run's unpadded numbers are in the report.
//
// A1 OUTCOMES vs the predictions (2026-10-06, DEV; the 5 smoke stems with mutants, then all 24 measurable dev stems with mutants after A1.1).
//   A1-P1 HELD. In every one of the 24 stems every COUNTED broken reader FAILS the rule (raw and wrong_language fail R; lookahead_deaf fails C;
//         deranged_prior fails R in all 24; lookahead fails C and R); no counted mutant passed anywhere. ear_off does not move the head in
//         eng and spa (not counted) and does in arb, cmn, cmn-hans, heb, kor (counted; fails R). The verdict licence is ok in 24 of 24.
//   A1-P2 HELD. eng, spa, kor, arb PASS; cmn-hans FAILS R (raw_both 0.7849 and wrong_language 0.7467 against its 0.7425). Over all 24: 19 pass,
//         5 fail = cmn cmn-hans heb pol vie, all on R, exactly the five whose rawTop was >= keyed in the first run. 32 more stems are typed gaps.
//   A1-P3 HELD. nominated >= keyed in 23 of the 24 stems (the standing gate does not help agreement: STATED, not gated).
//   A1-P4 HELD. S (stratified null, 8 strata) and H (cyclic shifts) hold in every stem that passes P (24 of 24).
//   A1-P5 HELD. C is licensed (the lookahead_deaf mutant is caught) in 24 of 24; the freq lookahead mutant is caught in 24 of 24.
//   A1-P6 NOT RE-EXAMINED here.
//   WHAT THE PASS IS WORTH (weak, said plainly): the margins over the strongest reader arm are small. pass margins: kor 0.005 (ear_off 0.7204 vs
//   keyed 0.7256), tur 0.008, arb 0.013, fin 0.019; larger in deu 0.180, fra 0.151, ita 0.145, urd 0.135, nld 0.128. The strongest arm is usually the
//   deranged prior (spa 0.765 and eng 0.791 vs keyed 0.845 and 0.885): a scrambled POS prior recovers most of the agreement, so the POS prior's own
//   contribution to R5 agreement is about 0.08-0.09 where it is shown and frequency/unit length carries the rest. R compares POINT ESTIMATES; a
//   margin of 0.005-0.02 is not statistically established (no bootstrap over the head beings is implemented): those passes are fragile.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createListeningCast, ORIGINAL } from "../../adapters/text/listening-cast.js";
import { splitSentences, stripContainer } from "../../adapters/text/spans.js";
import { createLanguageListener } from "../../the-fold/language-listener.js";
import { grammarFor, availableStems } from "../../the-fold/language-grammar.js";
import { mulberry32, shuffled, derangement, parseArgs, writeResult, KEY_ALPHA } from "./lib.mjs";

// ── ADDENDUM (AFTER the first DEV runs; outside the pre-registered header; changes NO rule) ────────────────────────
// 1. POST-HOC arm, DESCRIPTIVE ONLY (added after all 24 measured DEV stems passed, because the non-parallel control is a
//    different genre with sparser beings): details.stratified / controls.posthoc_length_stratified_null_p95 = the shuffled
//    null re-run with units permuted only WITHIN 4 length strata (units ranked by English token length): the concepts are
//    misaligned, the unit-LENGTH alignment is kept, and the pivot beings (their density) are the real ones. It never enters
//    pass, score, control or margin.   [SUPERSEDED BY A1-S, 2026-10-06: at min(8, floor(U/3)) strata it is now a GATING clause;
//    the 4-strata post-hoc arm and its `posthoc_length_stratified_null_p95` key are retired.]
// 2. Details the header left open: classics default per-unit cap = 25 sentences (CLASSICS_UNIT_CAP, PROVISIONAL); for an
//    English TARGET the cap K_c over the non-parallel readings plays the role M_c plays elsewhere (armCaps); a non-parallel
//    reading with no being makes K_c or M_c 0: typed gap `underpowered`, never a silent fail.
// 3. DEV data defects, typed not repaired: udhr-jpn_tokyo (and udhr-jpn) carries the heading "弟23 条" and udhr-ukr "таття 3."
//    (a lost first character), so the pre-registered heading family has 29 members: `unit_count_mismatch`. The Osaka-dialect
//    variant parses but is not standard Japanese (the treebank's), so it was NOT substituted. The Finnish Pinocchio heading
//    regex allows a trailing period (the file has "XXXIII.") — a loader fix made from heading COUNTS only.
// 4. FIRST DEV OUTCOMES vs the predictions (24 stems measured, 5 typed gaps: ces grc lat san no UDHR; jpn ukr defect):
//    P1 held (24/24 reject the shuffled null). P2 held (a length-matched non-parallel reading passes the shuffled null in 68-95%
//    of cases). P3 half held: N holds in spa fra deu ita eng, but kor arb cmn-hans ALSO pass N; the smallest margins are
//    vie 0.011, tur 0.045, fin 0.066. P4 FALSIFIED on rawTop (rawTop >= keyed in 5 of 24: cmn cmn-hans heb pol vie, not half);
//    held on nominated (nominated >= keyed in 23 of 24: the standing gate does not help agreement). P5 held. P6 partly
//    wrong: spa 0.845 and fra 0.819 inside the guessed band, kor 0.726 and arb 0.759 ABOVE it, shuffled-null 95th 0.37-0.60
//    (guessed 0.35-0.50). The post-hoc stratified null was rejected in 24 of 24. 24/24 pass means R5-on-UDHR does not
//    separate good from bad readers by pass/fail; its information is the MARGIN ordering and the ablations.

export const RUNG = Object.freeze({
  id: "r5",
  name: "agree across languages",
  question: "parallel-text agreement of the HEARD LEDGER: does each language's head of beings find an English counterpart, by per-unit presence alone, more strongly than shuffled / stratified / shifted / deranged units and non-parallel English; and (the only part that is about READING) does the reader beat frequency alone, a deranged prior, a wrong-language listener and no ear?",
  claim: "parallel-text agreement of the heard ledger; evidence of reading competence only through clause R (A1)",
});

// ── declared constants (every one is in the pre-registration above) ─────────
export const TOP_K = 20;                       // PROVISIONAL bare integer (P4); K_SWEEP is descriptive only
export const K_SWEEP = Object.freeze([10, 20, 40]);
export const N_PERM = 999;                     // shuffled unit orders; the smallest p is 1/(N_PERM+1)
export const N_PERM_NP = 199;                  // the first 199 of the same permutations, for each non-parallel reading's OWN test
export const N_NP = 19;                        // non-parallel readings: the fewest that give p = 1/(N_NP+1) = 0.05
export const ALPHA = KEY_ALPHA;                // the declared 5%
export const CAUSAL_FRACTION = 0.6;            // snapshot at 60% of the target's sentences (off the dyadic checkpoint grid)
export const HEADING_MAX = 24;                 // a heading paragraph is at most this many characters (PROVISIONAL, structural)
export const NO_STANDING_RATE = 1e-300;        // rateOf for the ablations: every form with >= 2 arrivals has standing
export const ARTICLES = 30;                    // UDHR: Preamble + 30 articles = 31 units
export const CLASSICS_UNIT_CAP = 25;           // default per-unit sentence cap on classics only (speed; PROVISIONAL)
// ── amendment A1 constants (every one is in the A1 header above) ──
export const N_DER = 19;                       // A1-D: derangements of the unit alignment, gating value = the max (fewest giving p = 1/20)
export const N_DP = 19;                        // A1-R: deranged-prior readings, gating value = the max (fewest giving p = 1/20)
export const DP_ATTEMPT_FACTOR = 3;            // up to 3 x N_DP seeds are tried to find N_DP draws that MOVED the head (the licence)
export const STRATA = 8;                       // A1-S: fine length strata (capped so a stratum holds >= STRATUM_MIN_UNITS units)
export const STRATUM_MIN_UNITS = 3;
export const SUTS = Object.freeze(["production", "raw", "deranged_prior", "wrong_language", "ear_off", "lookahead", "lookahead_deaf"]);
export const MUTANTS = Object.freeze(SUTS.filter((s) => s !== "production"));
export const LOOKAHEAD_MIN = 3;                // the freq lookahead MUTANT: forms with whole-text frequency >= this are forced to NOUN
const EPS = 1e-12;

// ── where the parallel text lives ───────────────────────────────────────────
const ETHOS = "/Users/mlacy/Documents/3.0/ethos";
export const UDHR_DIR = `${ETHOS}/06-government-legal/un-udhr`;
export const CLASSICS_DIR = `${ETHOS}/11-multi-language/parallel-classics`;
export const WP_EN_FILE = `${ETHOS}/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt`;

/** stem -> UDHR file code. A declared fact about file names. deu uses the 1996 orthography (the treebank's), cmn = Traditional. */
export const UDHR_CODE = Object.freeze({
  eng: "eng", spa: "spa", rus: "rus", cmn: "cmn_hant", "cmn-hans": "cmn_hans", arb: "arb", heb: "heb", fas: "pes_1", kor: "kor",
  jpn: "jpn_tokyo", fra: "fra", deu: "deu_1996", ita: "ita", por: "por_BR", nld: "nld", pol: "pol", ukr: "ukr", hin: "hin",
  vie: "vie", ind: "ind", swe: "swe", urd: "urd", tur: "tur", ell: "ell_monotonic", fin: "fin", bul: "bul",
});

/** parallel-classics: unit = chapter; the heading LINE regexes are declared per edition; counts must equal `units`. */
export const CLASSICS = Object.freeze([
  {
    work: "pinocchio", dir: "pinocchio", units: 36,
    editions: {
      eng: { glob: /^pg500_/, heading: /^\s*CHAPTER \d+\s*$/ },
      ita: { glob: /^pg52484_/, heading: /^\s*[IVXL]+\.\s*$/ },
      fin: { glob: /^pg53077_/, heading: /^\s*[IVXL]+\.?\s*$/ },
    },
  },
  {
    work: "alice-in-wonderland", dir: "alice-in-wonderland", units: 12,
    editions: {
      eng: { glob: /^pg11_/, heading: /^\s*CHAPTER [IVXL]+\.\s*$/ },
      deu: { glob: /^pg19778_/, heading: /^\s*\p{L}+ Kapitel\.?\s*$/u },
      fra: { glob: /^pg55456_/, heading: /^\s*CHAPITRE (?:PREMIER|[IVXL]+)\.\s*$/ },
      ita: { glob: /^pg28371_/, heading: /^\s*CAPITOLO [IVXL]+\.\s*$/ },
    },
  },
]);

/** The pivot of a target: English; English itself is read against Spanish (UDHR) or Italian (classics). */
export const pivotOf = (stem, corpus = "udhr") => (stem === "eng" ? (corpus === "classics" ? "ita" : "spa") : "eng");

/**
 * A1-R wrong_language: the listener of ANOTHER language that is made to read this one. A declared CONTROL, never a fallback reading
 * (Greenberg: a language with no prior is a typed gap, never another language's grammar). Same-script partners where the stem has
 * one (Cyrillic, Arabic script, Han: the hard wrong listener, some forms are shared); otherwise Finnish, a large prior of a
 * typologically distant language (every Latin-script stem; for the others the form is simply unseen). Finnish is read as Turkish.
 */
export const WRONG_LISTENER = Object.freeze({
  rus: "ukr", ukr: "rus", bul: "rus", arb: "fas", fas: "arb", urd: "fas", cmn: "jpn", "cmn-hans": "jpn", jpn: "cmn", fin: "tur",
});
export const wrongStemFor = (stem) => WRONG_LISTENER[stem] ?? "fin";

// ── small arithmetic ────────────────────────────────────────────────────────
const round = (x, d = 4) => (typeof x === "number" && Number.isFinite(x) ? Number(x.toFixed(d)) : x);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const tokCount = (s) => (String(s).match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).length;

/** The q-quantile of a sample: the ceil(q*n)-th order statistic (the "higher" definition; never interpolated). */
export function percentile(values, q) {
  const a = Float64Array.from(values).sort();
  if (!a.length) return null;
  return a[Math.min(a.length - 1, Math.max(0, Math.ceil(q * a.length) - 1))];
}
const sd = (xs) => { if (xs.length < 2) return 0; const mu = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - mu) ** 2, 0) / xs.length); };

/** z-scored presence vector (population sd); a CONSTANT vector becomes all zeros so its correlation is 0, never rewarded. */
export function zOf(vec) {
  const U = vec.length;
  let s = 0;
  for (let u = 0; u < U; u++) s += vec[u];
  const mu = s / U;
  let v = 0;
  for (let u = 0; u < U; u++) v += (vec[u] - mu) ** 2;
  const sdv = Math.sqrt(v / U);
  const z = new Float64Array(U);
  if (sdv > 0) for (let u = 0; u < U; u++) z[u] = (vec[u] - mu) / sdv;
  return z;
}
/** Pearson correlation of two vectors; 0 when either is constant or the lengths differ. */
export function pearson(a, b) {
  if (a.length !== b.length || !a.length) return 0;
  const za = zOf(a), zb = zOf(b);
  let s = 0;
  for (let u = 0; u < za.length; u++) s += za[u] * zb[u];
  return s / za.length;
}

/**
 * bestMatches(T, P, perm) -> Float64Array: for each target z-vector the BEST correlation with any pivot z-vector.
 * `perm` (optional) reorders the TARGET's units: target unit u is read as unit perm[u]. No dictionary anywhere.
 */
export function bestMatches(T, P, perm = null) {
  const out = new Float64Array(T.length);
  if (!P.length) return out;
  const U = T[0]?.length ?? 0;
  for (let k = 0; k < T.length; k++) {
    const t = T[k];
    let best = -Infinity;
    for (let m = 0; m < P.length; m++) {
      const p = P[m];
      let s = 0;
      if (perm) for (let u = 0; u < U; u++) s += t[perm[u]] * p[u];
      else for (let u = 0; u < U; u++) s += t[u] * p[u];
      s /= U;
      if (s > best) best = s;
    }
    out[k] = best;
  }
  return out;
}
const meanOf = (arr, K) => { let s = 0; const n = Math.min(K, arr.length); for (let i = 0; i < n; i++) s += arr[i]; return n ? s / n : null; };
/** A1.1: the mean over K SLOTS: a slot the arm did not fill is 0 ("undefined is 0, never rewarded"); an arm with one being cannot beat one with twenty by variance. */
export const slotMean = (arr, K) => { if (!(K > 0)) return 0; let s = 0; const n = Math.min(K, arr.length); for (let i = 0; i < n; i++) s += arr[i]; return s / K; };

/** `count` uniform random permutations of 0..U-1 (seeded). */
export function makePerms(U, count, seed) {
  const rng = mulberry32(seed);
  const base = Array.from({ length: U }, (_, i) => i);
  return Array.from({ length: count }, () => shuffled(base, rng));
}

/**
 * `count` permutations that move units only WITHIN length strata (units ranked by `key`, cut into `strata` contiguous
 * groups): the concepts are misaligned but the unit-LENGTH alignment is kept. Originally POST-HOC and descriptive (ADDENDUM below); now the GATING clause A1-S.
 */
export function makeStratPerms(U, key, count, seed, strata = 4) {
  const rng = mulberry32(seed);
  const order = Array.from({ length: U }, (_, i) => i).sort((a, b) => key[a] - key[b] || a - b);
  const g = Math.max(1, Math.min(strata, Math.floor(U / 2)));
  const groups = Array.from({ length: g }, (_, i) => order.slice(Math.floor((i * U) / g), Math.floor(((i + 1) * U) / g)));
  return Array.from({ length: count }, () => {
    const perm = new Array(U);
    for (const grp of groups) { const sh = shuffled(grp, rng); grp.forEach((u, i) => { perm[u] = sh[i]; }); }
    return perm;
  });
}

/** All U-1 non-trivial cyclic shifts of 0..U-1: unit u is read as unit (u + sh) mod U. A1-H. */
export function shiftPermutations(U) {
  return Array.from({ length: Math.max(0, U - 1) }, (_, i) => Array.from({ length: U }, (_, u) => (u + i + 1) % U));
}
/** The number of length strata A1-S uses for U units: at most STRATA, never fewer than STRATUM_MIN_UNITS units per stratum. */
export const strataFor = (U) => Math.max(1, Math.min(STRATA, Math.floor(U / STRATUM_MIN_UNITS)));

/**
 * agree({T, P, K, M, perms, derPerm | derPerms, shiftPerms, stratPerms, Ks}) — the pure instrument core, tested on a toy.
 * T = target z-vectors ordered by rank, P = pivot z-vectors ordered by rank. K_eff = min(K, |T|), M_eff = min(M, |P|).
 * Returns the real mean best-match m, the shuffled null (every perm applied to the SAME target), the exact permutation
 * p, the null's 95th percentile of m, the pooled-null 95th percentile of single best values and the share above it,
 * the deranged arm (A1-D: the MAX over `derPerms`; `derPerm` is a one-element `derPerms`), the cyclic-shift arm (A1-H: the max
 * over `shiftPerms`) and the same-genre stratified null (A1-S: `stratPerms`, exact p). Presence is the caller's job; this knows
 * nothing about languages.
 */
export function agree({ T, P, K = TOP_K, M = null, perms, derPerm = null, derPerms = null, shiftPerms = null, stratPerms = null, Ks = [] }) {
  const Kmax = Math.max(K, ...Ks);
  const Tk = T.slice(0, Kmax), Pm = P.slice(0, M ?? P.length);
  const Keff = Math.min(K, Tk.length);
  const real = bestMatches(Tk, Pm, null);
  const nullBest = perms.map((perm) => bestMatches(Tk, Pm, perm));
  const ders = (derPerms ?? (derPerm ? [derPerm] : [])).map((perm) => bestMatches(Tk, Pm, perm));
  const shifts = (shiftPerms ?? []).map((perm) => bestMatches(Tk, Pm, perm));
  const strats = (stratPerms ?? []).map((perm) => bestMatches(Tk, Pm, perm));
  const at = (kk) => {
    const k = Math.min(kk, Tk.length);
    const m = meanOf(real, k);
    const nullM = nullBest.map((b) => meanOf(b, k));
    const ge = nullM.filter((x) => x >= m - EPS).length;
    const pooled = nullBest.flatMap((b) => Array.from(b.subarray(0, k)));
    const tauShare = percentile(pooled, 0.95);
    let above = 0;
    for (let i = 0; i < k; i++) if (real[i] > tauShare) above++;
    const dm = ders.map((d) => meanOf(d, k));
    const sm = shifts.map((d) => meanOf(d, k));
    const stm = strats.map((d) => meanOf(d, k));
    return {
      K: k, m, nullMean: mean(nullM), nullSd: sd(nullM), tauM: percentile(nullM, 0.95), p: (1 + ge) / (perms.length + 1),
      tauShare, share: k ? above / k : null,
      mDer: dm.length ? Math.max(...dm) : null, mDerMean: dm.length ? mean(dm) : null, nDer: dm.length,
      shiftMax: sm.length ? Math.max(...sm) : null, nShift: sm.length,
      strat: stm.length ? { nullMean: mean(stm), tauM: percentile(stm, 0.95), p: (1 + stm.filter((x) => x >= m - EPS).length) / (stm.length + 1), n: stm.length } : null,
      nullM,
    };
  };
  const main = at(K);
  const sweep = {};
  for (const kk of Ks) sweep[kk] = (({ K: kx, m, p, share }) => ({ K: kx, m, p, share }))(at(kk));
  return { ...main, Keff, Meff: Pm.length, real: Array.from(real.subarray(0, Keff)), sweep };
}

/**
 * decide(...) — the pre-registered pass rule (header + AMENDMENT A1) on already-computed numbers (pure; tested on a toy).
 * Clauses: P shuffled null at 5%; N real exceeds EVERY non-parallel reading (and there are N_NP of them); D real exceeds the MAX
 * over the deranged alignments; L licence (null mean below m, null has spread); C causal (EVERY ledger `=== true`: no check, no
 * pass); S same-genre stratified null at 5%; H real exceeds the MAX over the cyclic shifts; R the reader adds: real exceeds EVERY
 * licensed reader arm in `readerControls` [{id, family, m, licensed, gating?}] and at least one `raw` arm is licensed.
 * A MISSING input fails its clause CLOSED (and is listed in `unevaluated`): a clause that was not computed is never a pass.
 */
export function decide({ m, p, nullMean, nullSd, tauM, mDer, npMs, causalOk, nNp = N_NP, alpha = ALPHA, stratP = null, stratTauM = null, shiftMax = null, readerControls = null }) {
  const npMax = npMs?.length ? Math.max(...npMs) : null;
  const rc = Array.isArray(readerControls) ? readerControls : null;
  const gating = rc ? rc.filter((c) => c.gating !== false && c.licensed && Number.isFinite(c.m)) : [];
  const rawLicensed = gating.some((c) => c.family === "raw");
  const readerFailed = gating.filter((c) => !(m > c.m + EPS)).map((c) => c.id);
  const checks = {
    P: p <= alpha,
    N: (npMs?.length ?? 0) >= nNp && m > npMax,
    D: mDer != null && m > mDer,
    L: nullMean != null && nullMean < m && nullSd > 0,
    C: causalOk === true,
    S: stratP != null && stratP <= alpha,
    H: shiftMax != null && m > shiftMax,
    R: rc != null && rawLicensed && readerFailed.length === 0,
  };
  const unevaluated = [];
  if (causalOk !== true && causalOk !== false) unevaluated.push("C");
  if (stratP == null) unevaluated.push("S");
  if (shiftMax == null) unevaluated.push("H");
  if (rc == null || !rawLicensed) unevaluated.push("R");
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
  const score = Math.max(0, m);
  const control = Math.max(tauM ?? 0, npMax ?? 0, mDer ?? 0, stratTauM ?? 0, shiftMax ?? 0, ...gating.map((c) => c.m));
  const broken = checks.P && ["N", "D", "S", "H", "R"].some((k) => !checks[k]);
  return {
    pass: failed.length === 0, checks, failed, unevaluated, readerFailed, score, control, margin: score - control,
    broken: broken ? "a control reaches the real arm while the shuffled null is rejected: the shuffled null alone is not a licence (II.23)" : null,
  };
}

// ── UDHR: split a file into Preamble + 30 articles ──────────────────────────
/** Blank-line paragraphs of a file, whitespace collapsed. */
export const paragraphs = (raw) => String(raw).replace(/\r/g, "").split(/\n[ \t]*\n/).map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);

/** The first letter-word of a short paragraph (first character for Han/kana, which are written unspaced); null when it has no letter. */
export function headingKey(p) {
  const m = /[\p{L}\p{M}]+/u.exec(String(p).trim());
  if (!m) return null;
  const first = [...m[0]][0];
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(first) ? first : m[0].toLowerCase();
}

/**
 * splitUdhr(raw, {articles}) -> { units:string[]|null, gap, info }.
 * Metadata paragraph ("Language:"), native title, preamble heading; then the heading FAMILY (short paragraphs sharing a first
 * letter-word) that occurs exactly `articles` times. Anything else is a typed gap, never a guess.
 */
export function splitUdhr(raw, { articles = ARTICLES } = {}) {
  const paras = paragraphs(raw);
  const meta = paras.findIndex((p) => /^Language:/m.test(p) || /\bLanguage:/.test(p));
  if (meta < 0) return { units: null, gap: "no_metadata_paragraph", info: {} };
  const preHead = paras[meta + 2];
  const start = preHead != null && [...preHead].length <= HEADING_MAX ? meta + 3 : meta + 2;
  const fam = new Map();
  for (let i = start; i < paras.length; i++) {
    if ([...paras[i]].length > HEADING_MAX) continue;
    const k = headingKey(paras[i]);
    if (k == null) continue;
    if (!fam.has(k)) fam.set(k, []);
    fam.get(k).push(i);
  }
  const hits = [...fam].filter(([, idx]) => idx.length === articles);
  const biggest = [...fam].sort((a, b) => b[1].length - a[1].length)[0] ?? null;
  if (hits.length !== 1) {
    return { units: null, gap: "unit_count_mismatch", info: { reason: hits.length ? "heading_family_ambiguous" : "heading_family_not_found", largestFamily: biggest ? { key: biggest[0], count: biggest[1].length } : null, expected: articles } };
  }
  const [key, heads] = hits[0];
  const units = [];
  const body = (a, b) => paras.slice(a, b).join("\n\n");
  units.push(body(start, heads[0]));
  for (let k = 0; k < heads.length; k++) units.push(body(heads[k] + 1, k + 1 < heads.length ? heads[k + 1] : paras.length));
  const empty = units.findIndex((u) => !u.trim());
  if (empty >= 0) return { units: null, gap: "unit_count_mismatch", info: { reason: `unit_${empty}_empty`, key } };
  return { units, gap: null, info: { key, headings: heads.length, preambleHeading: start === meta + 3 } };
}

// ── classics: split a Gutenberg edition into chapters by heading LINES ──────
export function splitByHeadingLines(text, re, expected) {
  const lines = String(text).replace(/\r/g, "").split("\n");
  const idx = [];
  lines.forEach((l, i) => { if (re.test(l)) idx.push(i); });
  if (idx.length !== expected) return { units: null, gap: "unit_count_mismatch", info: { found: idx.length, expected } };
  const units = idx.map((s, k) => lines.slice(s + 1, k + 1 < idx.length ? idx[k + 1] : lines.length).join("\n").trim());
  const empty = units.findIndex((u) => !u);
  if (empty >= 0) return { units: null, gap: "unit_count_mismatch", info: { reason: `unit_${empty}_empty`, expected } };
  return { units, gap: null, info: { headings: idx.length } };
}

const unitCache = new Map();
/** loadUnits(corpus, work, lang) -> { units:string[]|null, gap, info } ; cached. */
export function loadUnits(corpus, work, lang) {
  const key = `${corpus}|${work}|${lang}`;
  if (unitCache.has(key)) return unitCache.get(key);
  let res;
  try {
    if (corpus === "udhr") {
      const code = UDHR_CODE[lang];
      const file = code ? path.join(UDHR_DIR, `udhr-${code}.txt`) : null;
      res = file && fs.existsSync(file) ? { ...splitUdhr(fs.readFileSync(file, "utf8")), file } : { units: null, gap: "no_parallel_text", info: { reason: `no UDHR edition for ${lang}` } };
    } else if (corpus === "classics") {
      const w = CLASSICS.find((c) => c.work === work);
      const ed = w?.editions[lang];
      const dir = w ? path.join(CLASSICS_DIR, w.dir, lang === "eng" ? "en" : { ita: "it", fin: "fi", deu: "de", fra: "fr" }[lang] ?? "") : null;
      const f = ed && fs.existsSync(dir) ? fs.readdirSync(dir).find((n) => ed.glob.test(n) && n.endsWith(".txt")) : null;
      if (!f) res = { units: null, gap: "no_parallel_text", info: { reason: `no ${work} edition for ${lang}` } };
      else res = { ...splitByHeadingLines(stripContainer(fs.readFileSync(path.join(dir, f), "utf8")).text, ed.heading, w.units), file: path.join(dir, f) };
    } else res = { units: null, gap: "unmeasured", info: { reason: `unknown corpus ${corpus}` } };
  } catch (e) { res = { units: null, gap: "unmeasured", info: { reason: `load error: ${e?.message ?? e}` } }; }
  unitCache.set(key, res);
  return res;
}

/** TEST SEAM: put units for (corpus, work, lang) in the cache, so the whole pipeline can run on a toy corpus with the real listeners. */
export function seedUnits(corpus, work, lang, units) { unitCache.set(`${corpus}|${work}|${lang}`, { units, gap: null, info: { seeded: true } }); }
/** Drop every cache (units, ledgers, non-parallel readings): a test seam. */
export function resetCaches() { unitCache.clear(); ledgerCache.clear(); npCache.clear(); }

/** The work a stem is read in: udhr -> "udhr"; classics -> the first work with BOTH its edition and the pivot's, headings verified; any other corpus names its own work. */
export function resolveWork(corpus, stem) {
  if (corpus !== "classics") return corpus;
  const pivot = pivotOf(stem, corpus);
  for (const c of CLASSICS) {
    if (!c.editions[stem] || !c.editions[pivot]) continue;
    if (loadUnits("classics", c.work, stem).units && loadUnits("classics", c.work, pivot).units && loadUnits("classics", c.work, "eng").units) return c.work;
  }
  return null;
}

/** Units -> sentences per unit. Lowercased BEFORE splitting (no capital is ever seen); `limit` = at most N sentences per unit. */
export function sentencesOfUnits(units, limit = null) {
  return units.map((u) => {
    const ss = splitSentences(String(u).toLowerCase()).map((s) => s.text.trim()).filter(Boolean);
    return limit ? ss.slice(0, limit) : ss;
  });
}

// ── non-parallel text: War and Peace (English), cut to a token-length profile ──
/**
 * chunkByProfile(sentences, profile, from) -> { units: string[][], next } — consecutive sentences, unit i taking sentences
 * until it holds >= profile[i] tokens (at least one). The unit LENGTHS follow the profile; the CONCEPTS do not.
 */
export function chunkByProfile(sentences, profile, from = 0) {
  const units = [];
  let at = from;
  for (const want of profile) {
    const u = [];
    let got = 0;
    while (at < sentences.length && (got < want || !u.length)) { u.push(sentences[at]); got += tokCount(sentences[at]); at++; }
    if (!u.length) return { units: null, next: at };
    units.push(u);
  }
  return { units, next: at };
}

let wpSentencesCache = null;
function wpSentences(charsNeeded) {
  if (wpSentencesCache && wpSentencesCache.chars >= charsNeeded) return wpSentencesCache.sentences;
  const raw = fs.readFileSync(WP_EN_FILE, "utf8");
  const body = stripContainer(raw).text;
  const at = body.search(/^CHAPTER I\s*$/m);
  const text = (at >= 0 ? body.slice(at) : body).slice(0, Math.max(60000, charsNeeded));
  const sentences = splitSentences(text.toLowerCase()).map((s) => s.text.trim()).filter(Boolean);
  wpSentencesCache = { chars: charsNeeded, sentences };
  return sentences;
}

// ── readers: a hear FACTORY, so that what a reader may have heard is explicit (A1-C) ───────────────────────────────
// A reader is `seen -> hear`; `seen = {sentences, text}` is everything the reader is ALLOWED to have heard when it is asked about
// a sentence. The production listener ignores `seen` (a declared language is a fact, S39: stateless). A hear that reads more of
// `seen` than the prefix is lookahead, and the causal check, which builds the FRESH reader from the PREFIX ONLY, sees it.
/** The production reader of a language: a fresh declared listener per factory call. */
export const baseFactory = (lang) => () => { const l = createLanguageListener({ declared: lang }); return (t, si) => l.listen(t, si); };

const argmaxClass = (m) => Object.entries(m ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
/**
 * A1-R deranged_prior: a copy of the grammar's priors with the posPrior class-count VECTORS deranged among its forms (Sattolo, seeded:
 * no form keeps its own vector, so refusals AND received rates move) and the framePrior's class DISTRIBUTIONS deranged among its frame
 * keys. Null-prototype objects, so a form named "__proto__" stays a key. Mirrors r3-beings.mjs::scramblePrior (A2 there); the ear is
 * left real. `stats.classChanged` counts forms whose majority class moved.
 */
export function scramblePrior(posPrior, framePrior, seed) {
  const rng = mulberry32(seed);
  const names = Object.keys(posPrior?.forms ?? {});
  const perm = derangement(names.length, rng);
  const out = Object.create(null);
  names.forEach((n, i) => { out[n] = posPrior.forms[perm ? names[perm[i]] : n]; });
  const classChanged = names.filter((n) => argmaxClass(out[n]) !== argmaxClass(posPrior.forms[n])).length;
  let fp = framePrior ?? null, frameKeys = 0;
  if (framePrior?.frames) {
    const keys = Object.keys(framePrior.frames);
    frameKeys = keys.length;
    const p2 = derangement(keys.length, rng);
    const frames = Object.create(null);
    keys.forEach((k, i) => { frames[k] = framePrior.frames[p2 ? keys[p2[i]] : k]; });
    fp = { ...framePrior, frames };
  }
  return { posPrior: { ...posPrior, forms: out }, framePrior: fp, stats: { forms: names.length, classChanged, frameKeys } };
}
/** A reader factory whose POS and frame priors are deranged (one draw = one seed). The scramble is built once per draw. */
export const derangedPriorFactory = (base, seed) => {
  const memo = new Map();
  return (seen) => {
    const h = base(seen);
    return (t, si) => {
      const c = h(t, si);
      if (!c?.language || !c.grammar?.posPrior?.forms) return c;
      let s = memo.get(c.grammar.posPrior);
      if (!s) { s = scramblePrior(c.grammar.posPrior, c.grammar.framePrior, seed); memo.set(c.grammar.posPrior, s); }
      return { ...c, grammar: { ...c.grammar, posPrior: s.posPrior, framePrior: s.framePrior } };
    };
  };
};
/** A reader factory with the ear removed: no segmentation, no proclitic/enclitic peeling. */
export const earOffFactory = (base) => (seen) => {
  const h = base(seen);
  return (t, si) => { const c = h(t, si); return c?.language ? { ...c, ear: null } : c; };
};
/**
 * MUTANT (the reviewer's lookahead): every form whose frequency in the WHOLE text it was told about is >= LOOKAHEAD_MIN is forced to
 * NOUN. A function of `seen.text`, so a fresh reader built from the prefix promotes a different set. Reported, not gating.
 */
export const lookaheadFactory = (base) => (seen) => {
  const h = base(seen);
  let promoted = null;
  const memo = new Map();
  return (t, si) => {
    const c = h(t, si);
    if (!c?.language || !c.grammar?.posPrior?.forms) return c;
    if (!promoted) {
      let x = String(seen?.text ?? "").toLowerCase();
      if (c.ear?.segment) x = c.ear.segment(x);
      if (c.ear?.peel) x = c.ear.peel(x);
      const freq = new Map();
      for (const w of x.match(/[\p{L}\p{M}\p{N}'’]+/gu) ?? []) freq.set(w, (freq.get(w) ?? 0) + 1);
      promoted = [...freq].filter(([, n]) => n >= LOOKAHEAD_MIN).map(([w]) => w);
    }
    let pp = memo.get(c.grammar.posPrior);
    if (!pp) {
      const forms = Object.assign(Object.create(null), c.grammar.posPrior.forms);
      for (const w of promoted) forms[w] = { NOUN: 100 };
      pp = { ...c.grammar.posPrior, forms };
      memo.set(c.grammar.posPrior, pp);
    }
    return { ...c, grammar: { ...c.grammar, posPrior: pp } };
  };
};
/**
 * MUTANT (mechanical; the licence of clause C): a reader that is deaf to the first half of what it is told it will hear. It needs the
 * TOTAL length of the text, so it is lookahead whenever the text it was told about is longer than the prefix: it must be caught.
 */
export const lookaheadDeafFactory = (base) => (seen) => {
  const h = base(seen);
  const N = seen?.sentences?.length ?? 0;
  return (t, si) => (si < N / 2 ? { language: null, gap: "lookahead_deaf mutant: not listening yet" } : h(t, si));
};

/** readerSpec(kind, lang, seed) -> { id, kind, lang, mode, factory, wrong? }: a reader (and the cast mode it is read in). */
export function readerSpec(kind, lang, seed = 0) {
  const prod = baseFactory(lang);
  const mk = (factory, mode = "real") => ({ id: `${kind}:${lang}:${kind === "deranged_prior" ? seed : ""}:${mode}`, kind, lang, mode, factory });
  switch (kind) {
    case "production": return mk(prod);
    case "raw": return mk(prod, "raw");
    case "nominated": return mk(prod, "nominated");
    case "deranged_prior": return mk(derangedPriorFactory(prod, seed));
    case "wrong_language": return { ...mk(baseFactory(wrongStemFor(lang))), wrong: wrongStemFor(lang) };
    case "ear_off": return mk(earOffFactory(prod));
    case "lookahead": return mk(lookaheadFactory(prod));
    case "lookahead_deaf": return mk(lookaheadDeafFactory(prod));
    default: throw new Error(`unknown reader kind ${kind}`);
  }
}

// ── reading one language: the cast, the occurrence vectors ──────────────────
const sig = (beings) => JSON.stringify(beings.map((b) => [b.surface, b.mentions, b.sentences, b.refires, b.presence]).sort());
const rankOrder = (a, b) => b.mentions - a.mentions || b.sentences - a.sentences || (a.surface < b.surface ? -1 : a.surface > b.surface ? 1 : 0);
/** The same listener with NO POS/frame prior: nothing is refused (the ear's segment/peel stay: word hearing is R1's business). */
const barePrior = (hear) => (t, si) => {
  const c = hear(t, si);
  return c?.language ? { ...c, grammar: { ...c.grammar, posPrior: { forms: {} }, framePrior: null } } : c;
};
const wrapMode = (mode, hear) => (mode === "raw" ? barePrior(hear) : hear);
const seenOf = (sentences) => ({ sentences: sentences.slice(), text: sentences.join("\n") });

/**
 * readLedger({sentencesByUnit, hearFactory | hear, mode, causal}) -> { beings:[{surface, mentions, sentences, presence:Uint8Array, z}], units,
 *   sentences, languageUnheard, causal }.   mode: "real" (production cast) | "nominated" (no standing test) | "raw" (no prior, no standing).
 * Each being's presence over units is its cast EVIDENCE (sentence -> unit); nothing is read twice but the causal check's prefix.
 * A1-C: with a `hearFactory`, `causal` snapshots beings() after 60% of the sentences and compares it with a FRESH cast fed the prefix by
 * a FRESH hear built from the prefix ALONE (ok true/false). A bare `hear` closure cannot be checked: causal.ok = null, never true.
 */
export function readLedger({ sentencesByUnit, hear = null, hearFactory = null, mode = "real", causal = false }) {
  const U = sentencesByUnit.length;
  const flat = [], unitOf = [];
  sentencesByUnit.forEach((ss, u) => ss.forEach((s) => { flat.push(s); unitOf.push(u); }));
  const rateOf = mode === "real" ? null : () => NO_STANDING_RATE;
  const mk = (h) => createListeningCast({ hear: wrapMode(mode, h), rateOf, ...ORIGINAL });
  const h0 = hearFactory ? hearFactory(seenOf(flat)) : hear;
  if (typeof h0 !== "function") throw new TypeError("readLedger: a hear function or a hearFactory is required");
  const cast = mk(h0);
  const snapAt = causal ? Math.max(1, Math.floor(flat.length * CAUSAL_FRACTION)) : null;
  let snap = null;
  flat.forEach((s, i) => { cast.add(s); if (snapAt === i + 1) snap = sig(cast.beings()); });
  let causalRes = null;
  if (causal) {
    const items = JSON.parse(snap ?? "[]").length;
    if (!hearFactory) causalRes = { k: snapAt, of: flat.length, ok: null, items, reason: "no hear factory: a bare hear closure is shared by the snapshot and the fresh cast, so lookahead in it cannot be seen" };
    else {
      const prefix = flat.slice(0, snapAt);
      const fresh = mk(hearFactory(seenOf(prefix)));
      prefix.forEach((s) => fresh.add(s));
      causalRes = { k: snapAt, of: flat.length, ok: sig(fresh.beings()) === (snap ?? "[]"), items };
    }
  }
  const beings = cast.beings().sort(rankOrder).map((b) => {
    const presence = new Uint8Array(U);
    for (const o of b.evidence) presence[unitOf[o.si]] = 1;
    return { surface: b.surface, mentions: b.mentions, sentences: b.sentences, presence, z: zOf(presence) };
  });
  const rep = cast.report();
  return { beings, units: U, sentences: flat.length, languageUnheard: rep.languageUnheard, causal: causalRes, report: rep };
}

const ledgerCache = new Map();
/** A cached ledger for (corpus, work, lang, reader, limit): the pivot is read once for the whole run. Every ledger carries the causal check. */
function ledgerFor({ corpus, work, lang, spec, limit, causal = true }) {
  const key = `${corpus}|${work}|${lang}|${spec.id}|${limit ?? ""}|${causal}`;
  if (!ledgerCache.has(key)) {
    const { units } = loadUnits(corpus, work, lang);
    ledgerCache.set(key, readLedger({ sentencesByUnit: sentencesOfUnits(units, limit), hearFactory: spec.factory, mode: spec.mode, causal }));
  }
  return ledgerCache.get(key);
}

const npCache = new Map();
/** The N_NP non-parallel English readings of War and Peace, each cut to `profile` (token counts of the English units); each carries the causal check. */
export function npWindows(profile, { count = N_NP, spec = readerSpec("production", "eng") } = {}) {
  const key = `${profile.join(",")}|${count}|${spec.id}`;
  if (npCache.has(key)) return npCache.get(key);
  const total = profile.reduce((a, b) => a + b, 0);
  const sentences = wpSentences(Math.ceil(count * total * 9.5));
  const out = { windows: [], exhausted: false };
  let at = 0;
  for (let w = 0; w < count; w++) {
    const { units, next } = chunkByProfile(sentences, profile, at);
    if (!units) { out.exhausted = true; break; }
    at = next;
    out.windows.push(readLedger({ sentencesByUnit: units, hearFactory: spec.factory, mode: spec.mode, causal: true }));
  }
  npCache.set(key, out);
  return out;
}

// ── one arm against its pivot ───────────────────────────────────────────────
const pearsonLen = (a, b) => { const n = Math.min(a.length, b.length); return n > 1 ? pearson(Float64Array.from(a.slice(0, n)), Float64Array.from(b.slice(0, n))) : null; };

/**
 * The caps (header: derived from the material). The replaced side may not give any arm more beings to match than another:
 * M_c = the smallest pivot ledger among the real and the non-parallel readings (English-pivot case), K_c = the same for the
 * target side (English-target case), and K_c <= K and <= |target|.
 */
export function armCaps({ target, pivot, np = null }) {
  let Kc = TOP_K, Mc = pivot.beings.length;
  if (np) {
    if (np.replaces === "pivot") Mc = Math.min(Mc, ...np.windows.map((w) => w.beings.length));
    else Kc = Math.min(Kc, ...np.windows.map((w) => w.beings.length));
  }
  return { Kc: Math.min(Kc, target.beings.length), Mc };
}

/**
 * The real arm for one (target ledger, pivot ledger) pair, with the shuffled null, the A1-D derangements, the A1-H cyclic shifts, the A1-S
 * same-genre stratified null and (optionally) the NP readings. `controls: false` (the descriptive ablations) skips D/H/S.
 * `light` skips the descriptive per-window shuffled tests of the NP readings (the verdict-licence reruns).
 */
function runArm({ target, pivot, np = null, seed, Ks = [], lengthKey = null, controls = true, light = false }) {
  const U = target.units;
  const perms = makePerms(U, N_PERM, seed);
  const derPerms = Array.from({ length: N_DER }, (_, i) => derangement(U, mulberry32((seed ^ fnv(`der${i}`)) >>> 0))).filter(Boolean);
  const g = strataFor(U);
  const shiftPerms = controls ? shiftPermutations(U) : null;
  const stratPerms = controls && lengthKey ? makeStratPerms(U, lengthKey, N_PERM, (seed ^ 0x5bd1e995) >>> 0, g) : null;
  const { Kc, Mc } = armCaps({ target, pivot, np });
  const T = target.beings.map((b) => b.z), P = pivot.beings.map((b) => b.z);
  const a = agree({ T, P, K: Kc, M: Mc, perms, derPerms: controls ? derPerms : null, shiftPerms, stratPerms, Ks });
  let npOut = null;
  if (np) {
    const npMs = [], npP = [];
    for (const w of np.windows) {
      const Tw = np.replaces === "target" ? w.beings.map((b) => b.z).slice(0, Kc) : T.slice(0, Kc);
      const Pw = np.replaces === "pivot" ? w.beings.map((b) => b.z).slice(0, Mc) : P.slice(0, Mc);
      npMs.push(meanOf(bestMatches(Tw, Pw, null), Kc));
      if (!light) {
        const nullM = perms.slice(0, N_PERM_NP).map((perm) => meanOf(bestMatches(Tw, Pw, perm), Kc));
        npP.push((1 + nullM.filter((x) => x >= npMs[npMs.length - 1] - EPS).length) / (N_PERM_NP + 1));
      }
    }
    npOut = { npMs, npP };
  }
  return { ...a, np: npOut, Kc, Mc, strata: a.strat ? g : null };
}

// ── the measurement ─────────────────────────────────────────────────────────
const unmeasured = (base, reason, detail, extraGaps = []) => ({ ...base, pass: null, gaps: [{ reason, count: 1, detail }, ...extraGaps, { reason: "unmeasured", count: 1, detail }], notes: [...base.notes, `${reason}: ${detail}`] });
const setEq = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

/**
 * measure({stem, split, limit, corpus, sut, mutants}) -> the rung's result card. Never throws for a stem lacking data.
 *   sut      the SYSTEM UNDER TEST (default "production"): a broken reader substituted for the target-language reader (A1-V); the
 *            controls stay the production-derived ones, so a broken reader must fail the same rule.
 *   mutants  A1-V: also re-run the rule with every broken reader as the system under test; a counted mutant that passes overrides the pass.
 *            Default: ON for split "test" (the verdict licence is required for the TEST card), OFF for dev (opt in with true / --mutants).
 */
export async function measure({ stem, split = "dev", limit = null, corpus = null, sut = "production", mutants = null } = {}) {
  const corp = corpus ?? (split === "test" ? "classics" : "udhr");
  mutants = mutants ?? split === "test";      // A1-V is REQUIRED for the TEST card, so it is ON by default there and opt-in on dev
  const base = { stem, rung: RUNG.id, split, n: 0, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: { corpus: corp, sut } };
  try {
    return await measureInner({ stem, split, limit, corp, base, sut, mutants });
  } catch (e) {
    return { ...base, pass: null, gaps: [{ reason: `error: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`, count: 1 }], notes: [`error: ${e?.message ?? e}`] };
  }
}

async function measureInner({ stem, split, limit, corp, base, sut = "production", mutants = false, light = false }) {
  if (!SUTS.includes(sut)) return unmeasured(base, "unknown_sut", `${sut} is not one of ${SUTS.join(", ")}`);
  const g = stem ? grammarFor(stem) : { language: null };
  if (!g.language || !g.posPrior?.forms) return unmeasured(base, "no_prior", g.gap ?? `no POS prior for ${stem}: a typed gap, never another language's grammar`);
  if (!(Number(g.posPrior?.provenance?.tokens_read) > 0)) return unmeasured(base, "no_baseline", `the ${stem} prior carries no tokens_read: the standing gate admits nothing (S137)`);
  const pivotStem = pivotOf(stem, corp);
  const pg = grammarFor(pivotStem);
  if (!pg.language || !(Number(pg.posPrior?.provenance?.tokens_read) > 0)) return unmeasured(base, "pivot_gap", `the pivot ${pivotStem} has no prior/baseline`);
  const work = resolveWork(corp, stem);
  if (!work) {
    const t = loadUnits(corp, corp === "udhr" ? "udhr" : CLASSICS[0].work, stem);
    return unmeasured(base, t.gap === "unit_count_mismatch" ? "unit_count_mismatch" : "no_parallel_text", `corpus ${corp}: no work with a verified edition for ${stem} and its pivot ${pivotStem}${t.info?.reason ? ` (${t.info.reason})` : ""}`);
  }
  const eng = loadUnits(corp, work, "eng"), tgt = loadUnits(corp, work, stem), piv = loadUnits(corp, work, pivotStem);
  for (const [lang, u] of [["eng", eng], [stem, tgt], [pivotStem, piv]]) {
    if (!u.units) return unmeasured(base, u.gap === "unit_count_mismatch" ? "unit_count_mismatch" : "no_parallel_text", `${work}/${lang}: ${JSON.stringify(u.info)}`);
  }
  if (tgt.units.length !== eng.units.length || piv.units.length !== eng.units.length) {
    return unmeasured(base, "unit_count_mismatch", `${work}: ${stem} has ${tgt.units.length} units, ${pivotStem} ${piv.units.length}, English ${eng.units.length}`);
  }
  const cap = limit ?? (corp === "classics" ? CLASSICS_UNIT_CAP : null);
  const U = eng.units.length;
  const notes = [], gaps = [];
  const key = { corpus: corp, work, limit: cap };
  const seed = fnv(`${stem}|${corp}|${work}`);

  // every ledger read for this card is registered: the causal check (A1-C) is read off ALL of them
  const registry = new Map();
  const L = (lang, sp, { register = true } = {}) => {
    const led = ledgerFor({ ...key, lang, spec: sp });
    if (register) registry.set(`${lang}|${sp.id}`, led);
    return led;
  };
  const prodSpec = readerSpec("production", stem), pivSpec = readerSpec("production", pivotStem);
  const sutSpec = sut === "production" ? prodSpec : readerSpec(sut, stem, (seed ^ fnv("sut")) >>> 0);
  const prodT = L(stem, prodSpec);
  const pivot = L(pivotStem, pivSpec);
  const target = sut === "production" ? prodT : L(stem, sutSpec);
  const underpowered = (detail) => ({ ...unmeasured(base, "underpowered", detail), details: { ...base.details, sut, sutMoved: sut !== "production" } });
  if (!target.beings.length || !pivot.beings.length) {
    return underpowered(`${!target.beings.length ? `${stem} (${sut})` : pivotStem} admitted no being (target ${target.beings.length}, pivot ${pivot.beings.length})`);
  }

  // the non-parallel English readings: replace the English side with War and Peace cut to the English units' token profile
  const engSentences = sentencesOfUnits(eng.units, cap);
  const profile = engSentences.map((ss) => ss.reduce((a, s) => a + tokCount(s), 0));
  const npSpec = stem === "eng" ? sutSpec : readerSpec("production", "eng");
  const npw = npWindows(profile, { spec: npSpec });
  const np = { windows: npw.windows, replaces: stem === "eng" ? "target" : "pivot" };
  if (npw.exhausted || npw.windows.length < N_NP) {
    return unmeasured(base, "underpowered", `non-parallel text exhausted: ${npw.windows.length} of ${N_NP} readings (the fewest that give p = 0.05)`);
  }
  npw.windows.forEach((w, i) => registry.set(`np${i}|${npSpec.id}`, w));

  const caps = armCaps({ target, pivot, np });
  if (caps.Kc < 1 || caps.Mc < 1) {
    return underpowered(`a non-parallel reading admitted no being (K_c ${caps.Kc}, M_c ${caps.Mc}): nothing to compare the real arm with`);
  }
  const { Kc, Mc } = caps;

  // ── A1-R: the reader arms (each differs from production ONLY in the target-language reader; the pivot is real) ──
  const headOf = (led, k) => new Set(led.beings.slice(0, k).map((b) => b.surface));
  const prodHeadT = headOf(prodT, Kc), prodHeadP = headOf(pivot, Mc);
  const moved = (led) => !setEq(headOf(led, Kc), prodHeadT);
  const zs = (led, k) => led.beings.slice(0, k).map((b) => b.z);
  const mArm = (led, pivLed, M) => { const Tk = zs(led, Kc), Pm = zs(pivLed, M); return Tk.length && Pm.length ? slotMean(bestMatches(Tk, Pm, null), Kc) : 0; };   // A1.1: Kc slots, an unfilled slot is 0
  const readerControls = [];
  const arm = (a) => { readerControls.push(a); if (!a.licensed) gaps.push({ reason: "control_not_licensed", count: 1, arm: a.id, detail: a.why }); };

  const rawT = L(stem, readerSpec("raw", stem)), rawP = L(pivotStem, readerSpec("raw", pivotStem));
  arm({ id: "raw_target", family: "raw", m: mArm(rawT, pivot, Mc), beings: rawT.beings.length, licensed: moved(rawT), why: "the prior-free target head equals the production head" });
  const rawPMoved = !setEq(headOf(rawP, Mc), prodHeadP);
  arm({ id: "raw_both", family: "raw", m: mArm(rawT, rawP, rawP.beings.length), mCapped: mArm(rawT, rawP, Mc), beings: rawT.beings.length, licensed: moved(rawT) || rawPMoved, why: "neither prior-free head differs from production" });

  const dp = { ms: [], sizes: [], tried: 0 };
  for (let i = 0; i < N_DP * DP_ATTEMPT_FACTOR && dp.ms.length < N_DP; i++) {
    const led = L(stem, readerSpec("deranged_prior", stem, (seed ^ fnv(`dp${i}`)) >>> 0));
    dp.tried += 1;
    if (moved(led)) { dp.ms.push(mArm(led, pivot, Mc)); dp.sizes.push(led.beings.length); }
  }
  arm({ id: "deranged_prior", family: "deranged_prior", m: dp.ms.length ? Math.max(...dp.ms) : null, mMean: dp.ms.length ? mean(dp.ms) : null, draws: dp.ms.length, tried: dp.tried, beings: dp.sizes.length ? Math.min(...dp.sizes) : null, licensed: dp.ms.length >= N_DP, why: `only ${dp.ms.length} of ${N_DP} deranged draws moved the head (${dp.tried} tried)` });

  const wrongSpec = readerSpec("wrong_language", stem);
  const wrongT = L(stem, wrongSpec);
  arm({ id: "wrong_language", family: "wrong_language", m: mArm(wrongT, pivot, Mc), beings: wrongT.beings.length, licensed: moved(wrongT), wrong: wrongSpec.wrong, why: `the ${wrongSpec.wrong} listener reads ${stem} with the same head` });
  const earT = L(stem, readerSpec("ear_off", stem));
  arm({ id: "ear_off", family: "ear_off", m: mArm(earT, pivot, Mc), beings: earT.beings.length, licensed: moved(earT), why: `the ear does not change the ${stem} head: it is inert on this text` });

  // ── the real arm and its pivot-side nulls ──
  const A = runArm({ target, pivot, np, seed, Ks: light ? [] : K_SWEEP, lengthKey: profile, light });

  // ── A1-C: the causal check read off EVERY ledger of this card, and its licence (a mutant that MUST be caught) ──
  const causal = { checked: 0, failed: [], unchecked: [] };
  for (const [id, led] of registry) { causal.checked += 1; if (led.causal?.ok === false) causal.failed.push(id); else if (led.causal?.ok !== true) causal.unchecked.push(id); }
  causal.ok = causal.checked > 0 && !causal.failed.length && !causal.unchecked.length;
  const deaf = L(stem, readerSpec("lookahead_deaf", stem), { register: false });
  const freq = L(stem, readerSpec("lookahead", stem), { register: false });
  const causalLicensed = deaf.causal?.ok === false;
  const causality = {
    scope: "regression + lookahead check of cast.add/beings and the listener: a fresh reader built from the prefix ALONE must reproduce the 60% snapshot, on every ledger of this card; NOT shown: occurrence-time admission in the final whole-text ledger (S3, labelled)",
    ledgersChecked: causal.checked, failed: causal.failed, unchecked: causal.unchecked, ok: causal.ok,
    licence: { mutant: "lookahead_deaf", caught: causalLicensed }, freqMutantCaught: freq.causal?.ok === false,
  };

  const D = decide({
    m: A.m, p: A.p, nullMean: A.nullMean, nullSd: A.nullSd, tauM: A.tauM, mDer: A.mDer, npMs: A.np.npMs, causalOk: causal.ok,
    stratP: A.strat?.p ?? null, stratTauM: A.strat?.tauM ?? null, shiftMax: A.shiftMax, readerControls,
  });

  // ── descriptive ablations (as in the original header; `nominated` is STATED, not gated) ──
  const abl = {};
  const nomT = L(stem, readerSpec("nominated", stem)), nomP = L(pivotStem, readerSpec("nominated", pivotStem));
  const nomM = mArm(nomT, nomP, nomP.beings.length);
  if (!light) {
    for (const [mode, t, p] of [["nominated", nomT, nomP], ["raw", rawT, rawP]]) {
      if (!t.beings.length || !p.beings.length) { abl[mode] = { m: null, note: "no beings on one side" }; continue; }
      const r = runArm({ target: t, pivot: p, np: null, seed: (seed ^ fnv(mode)) >>> 0, controls: false });
      abl[mode] = { m: round(r.m), p: round(r.p), nullMean: round(r.nullMean), tauM: round(r.tauM), share: round(r.share), K: r.Keff, M: r.Meff, targetBeings: t.beings.length, pivotBeings: p.beings.length };
    }
  }

  // ── reader_adds: the reader against each way of not reading (F2) ──
  const by = Object.fromEntries(readerControls.map((c) => [c.id, c]));
  const adds = (id) => (by[id]?.licensed ? A.m > by[id].m + EPS : null);
  const readerAdds = {
    over_raw_target: adds("raw_target"), over_raw_both: adds("raw_both"), over_deranged_prior: adds("deranged_prior"),
    over_wrong_language: adds("wrong_language"), over_ear_off: adds("ear_off"),
    over_nominated: A.m > nomM + EPS, gating: D.checks.R, failedArms: D.readerFailed,
  };
  const strongest = readerControls.filter((c) => c.licensed && Number.isFinite(c.m)).sort((a, b) => b.m - a.m)[0] ?? null;

  // ── the verdict licence (A1-V): the whole rule with the system under test replaced by each broken reader ──
  let verdict = null;
  if (mutants && sut === "production") {
    const suts = {};
    for (const kind of MUTANTS) {
      const r = await measureInner({ stem, split, limit, corp, base, sut: kind, light: true });
      suts[kind] = { moved: r.details?.sutMoved ?? false, pass: r.pass, failed: r.details?.failed ?? null, m: r.details?.m_real ?? null, gap: r.pass === null ? r.gaps?.[0]?.reason ?? null : null };
    }
    const counted = Object.entries(suts).filter(([, v]) => v.moved).map(([k]) => k);
    verdict = { run: true, suts, counted, notMoving: Object.keys(suts).filter((k) => !suts[k].moved), ok: counted.every((k) => suts[k].pass !== true) };
  }

  // ── the card ──
  const unheard = target.languageUnheard + pivot.languageUnheard;
  if (unheard) gaps.push({ reason: "language_unheard", count: unheard, of: target.sentences + pivot.sentences });
  if (A.Keff < TOP_K) gaps.push({ reason: "beings_below_K", count: TOP_K - A.Keff, of: TOP_K, detail: `${stem} admits ${target.beings.length} beings; K_eff = ${A.Keff}` });
  if (A.Mc < pivot.beings.length) gaps.push({ reason: "pivot_candidates_capped", count: pivot.beings.length - A.Mc, of: pivot.beings.length, detail: "M_c = the smallest pivot ledger among the real and the non-parallel readings (header)" });
  if (!causalLicensed) gaps.push({ reason: "causality_unlicensed", count: 1, detail: "the mechanical lookahead mutant was NOT caught on this text: clause C cannot fail here, so causality is unproven (II.23)" });
  if (causal.failed.length) gaps.push({ reason: "causality_violated", count: causal.failed.length, of: causal.checked, detail: causal.failed.slice(0, 4).join(", ") });
  if (causal.unchecked.length) gaps.push({ reason: "causality_unchecked", count: causal.unchecked.length, of: causal.checked });
  gaps.push({ reason: "claims_unmeasured", count: 1, detail: "R5 matches beings only; R4 claims have no dictionary-free cross-language matcher (header)" });

  let pass = D.pass;
  const nonC = D.failed.filter((c) => c !== "C");
  if (!causalLicensed) pass = nonC.length ? false : null;
  if (pass === true && verdict && !verdict.ok) {
    pass = false;
    gaps.push({ reason: "verdict_not_sensitive", count: verdict.counted.filter((k) => verdict.suts[k].pass === true).length, of: verdict.counted.length, detail: verdict.counted.filter((k) => verdict.suts[k].pass === true).join(", ") });
  }
  if (pass === null) gaps.push({ reason: "unmeasured", count: 1, detail: "clause C is unlicensed on this text" });

  const npPassShuffleShare = A.np.npP.length ? A.np.npP.filter((p) => p <= ALPHA).length / A.np.npP.length : null;
  const examples = light ? [] : target.beings.slice(0, 8).map((b) => {
    let best = -Infinity, who = null;
    pivot.beings.slice(0, A.Mc).forEach((q) => { let s = 0; for (let u = 0; u < U; u++) s += b.z[u] * q.z[u]; s /= U; if (s > best) { best = s; who = q.surface; } });
    return { target: b.surface, pivot: who, corr: round(best, 3), units: b.presence.reduce((a, x) => a + x, 0) };
  });

  notes.push("claim: PARALLEL-TEXT AGREEMENT OF THE HEARD LEDGER; it is evidence of reading competence only through clause R (the reader adds over frequency, a deranged prior, a wrong-language listener, no ear)");
  if (sut !== "production") notes.push(`SYSTEM UNDER TEST is the ${sut} mutant, not the production reader (A1-V): the card says whether the rule can see a broken reader`);
  if (stem === "eng") notes.push(`English cannot be scored against itself: read against the ${pivotStem} pivot (roles swapped)`);
  notes.push(`matching is RETROSPECTIVE (whole-text, S3 lookahead by construction); the reader's causality (clause C, every one of ${causal.checked} ledgers, licence ${causalLicensed ? "held: the lookahead_deaf mutant is caught" : "NOT held"}): ${causal.ok ? "held" : "NOT held"}`);
  notes.push(`pass: ${pass} — ${pass === true ? "all of P N D L C S H R hold" : pass === null ? "unmeasured (causality unlicensed)" : `failed ${D.failed.join(", ") || "V"}`}`);
  if (D.broken) notes.push(`INSTRUMENT/MECHANISM WARNING: ${D.broken}`);
  if (causal.failed.length) notes.push(`CAUSALITY VIOLATED on ${causal.failed.length} of ${causal.checked} ledgers (S3 lookahead): ${causal.failed.slice(0, 3).join(", ")}`);
  if (D.readerFailed.length) notes.push(`READER ADDS NOTHING over: ${D.readerFailed.join(", ")} — a control that does as well as the real arm means the instrument or the mechanism is broken (II.23)${D.readerFailed.includes("raw_both") || D.readerFailed.includes("raw_target") ? "; instrument does not separate the reader from frequency here" : ""}`);
  if (!readerControls.some((c) => c.family === "raw" && c.licensed)) notes.push("no raw arm moved the head: on this text the prior-free reader reads exactly what the production reader reads, so the text does not separate the reader from frequency; clause R fails closed (a pass would be evidence of nothing)");
  if (!readerAdds.over_nominated) notes.push(`FAILURE (stated, not gating): the standing gate does not help agreement: nominated ${round(nomM)} >= keyed ${round(A.m)}`);
  notes.push(`reader arms (m, K_c ${Kc}, M_c ${Mc}): keyed ${round(A.m)} vs ${readerControls.map((c) => `${c.id} ${c.licensed ? round(c.m) : "unlicensed"}`).join(" | ")} | nominated ${round(nomM)}`);
  notes.push(`same-genre stratified null (${A.strata} strata, gating): p ${round(A.strat?.p)} (${A.strat && A.strat.p <= ALPHA ? "rejected" : "NOT rejected: agreement not shown beyond unit length"}); cyclic-shift max ${round(A.shiftMax)} vs real ${round(A.m)}`);
  if (verdict) notes.push(`verdict licence: ${verdict.counted.length} counted mutants (${verdict.counted.join(", ") || "none"}) ${verdict.ok ? "all FAIL the rule" : "AT LEAST ONE PASSES: verdict_not_sensitive"}${verdict.notMoving.length ? `; not moving: ${verdict.notMoving.join(", ")}` : ""}`);

  const controls = {
    shuffled_null_p95: round(A.tauM), shuffled_null_mean: round(A.nullMean),
    deranged_units: round(A.mDer), deranged_units_mean: round(A.mDerMean),
    stratified_null_p95: round(A.strat?.tauM), cyclic_shift_max: round(A.shiftMax),
    nonparallel_max: round(Math.max(...A.np.npMs)), nonparallel_mean: round(mean(A.np.npMs)),
    reader_raw_target: by.raw_target.licensed ? round(by.raw_target.m) : null,
    reader_raw_both: by.raw_both.licensed ? round(by.raw_both.m) : null, reader_raw_both_capped: round(by.raw_both.mCapped),
    reader_deranged_prior: by.deranged_prior.licensed ? round(by.deranged_prior.m) : null, reader_deranged_prior_mean: round(by.deranged_prior.mMean),
    reader_wrong_language: by.wrong_language.licensed ? round(by.wrong_language.m) : null,
    reader_ear_off: by.ear_off.licensed ? round(by.ear_off.m) : null,
    ablation_nominated: round(nomM), ablation_rawTop: round(by.raw_both.m),
  };
  const details = {
    corpus: corp, work, sut, sutMoved: moved(target), pivot: pivotStem, unitsRead: U, perUnitCap: cap,
    claim: "parallel-text agreement of the heard ledger (R5); reading competence only through clause R",
    matching: "retrospective (whole-text; S3-labelled lookahead of the MATCH, not of the reader)",
    K: A.Keff, M_c: A.Mc, beings: { target: target.beings.length, pivot: pivot.beings.length },
    m_real: round(A.m), p: round(A.p), nullSd: round(A.nullSd), tauShare: round(A.tauShare), share: round(A.share),
    checks: D.checks, failed: D.failed, unevaluated: D.unevaluated, causal: target.causal, causality,
    np: { count: A.np.npMs.length, ms: A.np.npMs.map((x) => round(x)), mean: round(mean(A.np.npMs)), max: round(Math.max(...A.np.npMs)), passShuffleShare: round(npPassShuffleShare), replaces: np.replaces, note: "genre/density confounded (A1-N): a pass does not show parallelism" },
    stratified: A.strat ? { strata: A.strata, nullMean: round(A.strat.nullMean), p95: round(A.strat.tauM), p: round(A.strat.p), rejected: A.strat.p <= ALPHA, gating: true } : null,
    cyclicShifts: { n: A.nShift, max: round(A.shiftMax), exceeded: A.shiftMax != null && A.m > A.shiftMax },
    derangements: { n: A.nDer, max: round(A.mDer), mean: round(A.mDerMean) },
    readerControls: readerControls.map((c) => ({ id: c.id, family: c.family, licensed: c.licensed, m: Number.isFinite(c.m) ? round(c.m) : null, beings: c.beings ?? null, ...(c.mCapped != null ? { mCapped: round(c.mCapped) } : {}), ...(c.draws != null ? { draws: c.draws, tried: c.tried, mMean: round(c.mMean) } : {}), ...(c.wrong ? { wrongListener: c.wrong } : {}), ...(c.licensed ? {} : { why: c.why }) })),
    reader_adds: readerAdds, strongestControl: strongest ? { id: strongest.id, m: round(strongest.m) } : null,
    verdictLicence: verdict,
    sweep: Object.fromEntries(Object.entries(A.sweep).map(([k, v]) => [k, { K: v.K, m: round(v.m), p: round(v.p), share: round(v.share) }])),
    ablations: abl, topMatches: examples,
    lengthCorrelation: round(pearsonLen(tgt.units.map((u) => [...u].length), eng.units.map((u) => [...u].length))),
    unitFiles: { target: tgt.file ?? null, pivot: piv.file ?? null },
    perBeingBest: A.real.map((x) => round(x, 3)),
  };
  return { ...base, n: U, score: round(D.score), control: round(D.control), margin: round(D.score - D.control), pass, controls, gaps, notes, details };
}

/** measureAll({stems, split}) -> { perStem, pairs, notes } — every stem against its pivot; readings are cached across stems. */
export async function measureAll({ stems = null, split = "dev", limit = null, corpus = null, mutants = null } = {}) {
  const list = stems ?? availableStems();
  const perStem = {}, pairs = [];
  for (const stem of list) {
    const r = await measure({ stem, split, limit, corpus, mutants });
    perStem[stem] = r;
    if (r.details?.m_real != null) pairs.push({ a: r.details.pivot, b: stem, corpus: r.details.corpus, m: r.details.m_real, p: r.details.p, share: r.details.share, nonparallelMax: r.details.np?.max, pass: r.pass });
  }
  const measured = Object.values(perStem).filter((r) => r.pass !== null);
  const notes = [
    `pairs are English-pivot only (Spanish for English); ${measured.length} of ${list.length} stems measured; no non-pivot (transitivity) pairs`,
    `corpus per split: dev = UDHR (31 units); test = parallel-classics (pinocchio, alice; units = chapters, per-unit cap ${CLASSICS_UNIT_CAP})`,
    "claim: parallel-text agreement of the heard ledger; reading competence only through clause R (A1); matching is retrospective (S3-labelled); causality is checked on every ledger (A1-C)",
    (mutants ?? split === "test") ? "verdict licence (A1-V) was run on every stem" : "verdict licence (A1-V) was NOT run: it is required for the TEST card (on by default there)",
  ];
  return { perStem, pairs, notes };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  const a = parseArgs(argv);
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const corpus = arg("--corpus");
  const sut = arg("--sut") ?? "production";
  const mutants = a.flags.has("no-mutants") ? false : a.flags.has("mutants") ? true : null;   // null = the default (on for test, off for dev)
  const verbose = a.flags.has("verbose");
  const stems = a.all ? availableStems() : a.stem ? [a.stem] : [];
  if (!stems.length) { console.error("usage: r5-parallel.mjs --stem <stem> [--split dev|test] [--limit N] [--corpus udhr|classics] [--mutants | --no-mutants] [--sut <kind>] [--verbose] | --all"); process.exit(2); }
  const slim = (r) => (verbose ? r : { ...r, details: { ...r.details, perBeingBest: undefined, np: r.details?.np ? { ...r.details.np, ms: undefined } : undefined } });
  for (const stem of stems) {
    const r = await measure({ stem, split: a.split, limit: a.limit, corpus, sut, mutants });
    if (sut === "production") writeResult(RUNG.id, stem, a.split, r);
    console.log(JSON.stringify(slim(r)));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
