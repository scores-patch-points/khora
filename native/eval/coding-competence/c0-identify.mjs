// eval/coding-competence/c0-identify.mjs — RUNG R0 for PROGRAMMING LANGUAGES ("C0"): given a HELD-OUT file with its
// extension, shebang and file name HIDDEN, does the CAUSAL line-by-line identifier (adapters/code/identify.js) name the language?
//
// ═══ PRE-REGISTRATION (READING-POLICY II.5; FOLD-CONSTITUTION II.5, II.23) ═══════════════════════════════════════════════════
// Written BEFORE the first run of this instrument (and before the first run of the identifier on any DEV file). Nothing below
// is tuned after a result: a prediction that fails is reported as failed, an instrument bug found later is recorded in an
// AMENDMENT block at the foot of this header (never by editing this text). The sha256 of this leading comment block is
// stamped into every result (details.prereg_sha256), so an edit after the fact is visible to anyone who compares digests.
//
// CLAIM
//   A zero-model, causal identifier that knows only (a) RECEIVED keyword sets (giver: the language's own grammar / engine, see
//   PRIORS) and (b) lexical SHAPE statistics counted on TRAIN files, names the language of a held-out file from content alone,
//   more often than (i) the majority-language baseline and (ii) the same identifier whose keyword evidence has been DERANGED
//   (handed to the wrong languages), and it does so from a prefix of the file, not the whole file.
//   Lovelace's law applied: the identifier only RECOVERS what the text orders (reserved words, punctuation grammar, line
//   structure); it originates nothing, and a language it has no keyword giver for is a TYPED GAP, never a silent pass.
//
// WHAT IS FED (causal, READING-SPEC). Gold = the manifest's own label for the file (manifest.languages[L][split]; the path,
//   extension and file name are NEVER given to the identifier — it receives text only). A leading `#!` line (and a UTF-8 BOM) is
//   stripped. The text is cut into physical lines (\n, \r\n); at most the first 3000 lines and the first 2000 characters of each
//   line are read (declared caps, P4). Lines are handed over ONE AT A TIME; the verdict after line i is a function of lines
//   1..i only (no whole-file statistic judges an earlier line).
//   Candidate set K = every manifest language that has an entry in priors/code-identify.json (a closed set, 51 languages, which
//   includes data/markup (json, yaml, markdown, html, css, latex ...); uniform language prior, declared — no language is favoured).
//   POOL = for every candidate language up to LIMIT (default 30) files of the requested split, taken round-robin across that
//   language's repositories (repo name order, then sha256 order; selection never looks at the content or at any verdict);
//   `restricted` (copyleft) rows are excluded. A file with fewer than MIN_NONBLANK = 5 non-blank lines (after the shebang) is
//   INELIGIBLE (nothing to identify): it is excluded from every denominator and reported as a typed gap with its count.
//
// IDENTIFIER (summary; adapters/code/identify.js is the authority). Two channels of one-vs-rest log-likelihood ratios, summed:
//   A keyword channel — per language L, each DISTINCT word of a line is scored "is a member of L's received keyword set":
//     member -> ln(a_L/b_L), non-member -> ln((1-a_L)/(1-b_L)), with a_L = P(word in set | file is L) and b_L = P(word in set |
//     file is not L), both counted on TRAIN (Jeffreys +0.5), b_L the uniform mean over the other languages. Case-exact or
//     case-folded matching per language, whichever has the larger Bernoulli KL(a||b) on TRAIN. A language with no keyword set
//     (gap) or whose set does not separate on TRAIN (a <= b: "uninformative") contributes 0 and is reported typed.
//   B shape channel — per language L, naive-Bayes ln[P(f|L)/P(f|not L)] over line-level DISTINCT shape features (punctuation
//     runs, first-token / first-two-tokens (a word is named only if some received keyword set owns it, else W/N), last
//     character, indent style, line-length bucket, word-case shapes UPPER/Cap/Camel/lower/snake/camel...), Laplace alpha=1,
//     vocabulary = features with TRAIN count >= 30 and TRAIN file support >= 5 (at most 20000 by count). Casing is ONE witness.
//   Decision after each line = argmax_L (A_L + B_L); no abstention in the primary metric (nomination, never admission).
//
// PRIORS (priors REFUSE or NOMINATE, never admit; every prior names its giver; built from TRAIN only, split by REPOSITORY)
//   keyword sets, in this order of preference: priors/code-kw-<lang>.json (CodeKeywordPrior@1: python = CPython engine,
//   javascript = tree-sitter grammar) > the ethos LanguageLawPrior@1 files (tree-sitter node-types, keywords + #directive
//   tokens) > a set derived by this instrument from the language's tree-sitter grammar (anonymous word-like node kinds and
//   named keyword_* kinds, one declared rule for all). Each language's source is recorded in the prior. Shape statistics:
//   TRAIN files of the manifest (non-restricted). TEST is never read by the builder or by any dev run.
//
// METRICS (eligible files only; pool = all candidates, slice = the files whose gold is the requested language)
//   accuracy@EOF   share whose leader after the last line equals the gold. score = slice accuracy (= recall of the language).
//   accuracy@k     the same with the leader after the first k lines, k in {1,3,5,10,25,50,100} (a file shorter than k counts at
//                  its last line): the price of being causal.
//   LUCS           lines-until-correct-and-stable: the smallest i such that the leader is the gold after every line j >= i
//                  to the end; defined only for files whose final leader is correct (censored otherwise); reported as median,
//                  p90 and the share stable by 10/25/50/100 lines.
//   confusions     top (gold -> predicted) pairs among wrong files, pool and slice.
//   strata         accuracy on files whose label came from an ambiguous-extension RESOLUTION RULE of the manifest (.h .m .v .pl .f
//                  .cl) vs the rest (label noise is possible there: reported, not corrected).
//   risk-coverage  accuracy among the files with the largest final margin (top1 - top2 in nats): coverage 1.0/.8/.6/.4/.2.
//
// CONTROLS, BUILT TO FAIL (II.23 / II.4). All arms are computed on the SAME eligible files.
//   majority        no content: always the language with the largest share of the eligible pool (s_max; the pool is balanced by
//                   construction, so s_max ~ 1/K — a weak floor, said so).
//   deranged_sigma0 the SAME identifier whose keyword channel is handed to the wrong languages: A'_L = A_sigma(L), sigma a
//                   derangement (Sattolo, no fixed point) of the alphabetically sorted candidates, seed 1001. The shape channel
//                   is untouched, so this isolates "the received keyword set belongs to THIS language".
//   deranged_draws  50 more derangements (seeds 1..50): pool accuracy of each; used by the permutation licence below.
//   shape_only / keyword_only  ablations (A=0 / B=0), reported, not gating.
//   lookahead       a CHEAT arm: the leader at every prefix is the whole-file leader (it sees the future). It must have LUCS 1
//                   (it knows from the first line) — its job is to show the metric moves under lookahead.
//   LICENCE CHECKS (a control counts only if it perturbs what it claims to):
//     L1 deranged_sigma0 licensed iff the pool accuracy of the real arm exceeds it by an exact one-sided SIGN test on the
//        paired files (wins = real right, control wrong; losses = the reverse), p < 0.05;
//     L2 permutation: pool accuracy of the real arm exceeds ALL 50 deranged draws (empirical p = 1/51 <= 0.05);
//     L3 causality: on a sample of 40 eligible files the tail after line k = floor(n/2) is REPLACED by the tail of a file of
//        another language; the real arm's leaders at lines <= k must be IDENTICAL (100%), and the lookahead arm's must differ in
//        some files (it is allowed to be 0 only if the instrument finds no file whose tail changes the leader; reported).
//   If L1 or L2 fails the mechanism or the instrument is broken (a control that does as well as the real arm): every
//   language's pass is false with that reason, never silently true.
//
// PASS RULE (pre-registered; the task's own: beat the deranged control with binomial significance at 5% AND beat majority)
//   For the requested language L (n_L eligible files, k_L correct):
//   (a) n_L >= 10, else pass = null (typed gap: slice too small);
//   (b) majority: k_L/n_L > s_max and the exact binomial upper tail P(X >= k_L | n_L, s_max) < 0.05;
//   (c) deranged_sigma0: exact one-sided sign test on L's files, p < 0.05;
//   (d) licences L1, L2, L3(real arm: 100% identical) hold.
//   pass = (b) and (c) and (d). score = k_L/n_L; control = max(s_max, slice accuracy of deranged_sigma0); margin = score - control.
//   A pass with score < 0.5 carries the note "weak": the rule is met but the language is mostly mis-named.
//   Non-gating but pre-registered and reported: PREDICTIONS below.
//
// PARAMETERS (declared; every bare integer is PROVISIONAL, P4 — chosen for run time or taken from the task, to be replaced by a
//   derived value once there is a material reason): ALPHA = KEY_ALPHA = 0.05; MIN_NONBLANK 5; line caps 3000 / 2000;
//   LIMIT 30; MIN_COUNT 30; MIN_FILES 5; MAX_FEATURES 20000; Laplace alpha 1; Jeffreys 0.5; sigma0 seed 1001; draws seeds 1..50;
//   causality sample 40; MIN_SLICE_N 10; k grid {1,3,5,10,25,50,100}.
//
// PREDICTIONS (my guesses BEFORE running; failures are reported as failures)
//   P1  pool accuracy@EOF >= 0.75 over the 51 candidates on DEV (limit 30).
//   P2  slice accuracy@EOF: python, go, ruby, java >= 0.80; c >= 0.70; javascript >= 0.55 (its mass leaks to typescript/tsx/vue/svelte).
//   P3  pass === true for python, javascript, c, go, ruby, java (all six).
//   P4  L1, L2 licensed; the strongest of the 50 deranged draws is <= real - 0.10 pool accuracy.
//   P5  deranged_sigma0 slice accuracy <= half the real arm's on at least 5 of the 6 dev languages.
//   P6  shape_only pool accuracy >= keyword_only; and real >= shape_only + 0.03 (the received keyword sets add something to shape).
//   P7  LUCS median <= 20 lines among files whose final leader is right; >= 80% of those are stable by line 100.
//   P8  at least 3 of the top-5 pool confusions (unordered pairs) fall inside a declared confusion family: {c,cpp,objc},
//       {javascript,typescript,tsx}, {python,nim}, {bash,powershell}, {html,vue,svelte} (the task's list) or {scheme,racket,
//       commonlisp,clojure} (my addition).
//   P9  lookahead LUCS is 1 for every file it gets right; the real arm is 100% identical under future corruption (L3).
//   P10 accuracy on ambiguous-extension-resolution files is at least 0.05 below the rest (their gold is a heuristic).
//
// CAVEATS FIXED IN ADVANCE. Closed-set (no "none of the above"): an unseen language gets a wrong name, said in the limits.
//   Strings and comments are not masked (no language is known yet): English words inside them score as keywords. A file that is
//   valid in two candidate languages (a C header read as C++, plain JS read as TypeScript) is inherently ambiguous; its gold is
//   the manifest's, and the confusion is reported, not hidden. The keyword sets are what the givers say (tree-sitter anonymous
//   tokens do not include named primitive types such as C `int`/`void`), so a set can be thin; that is the giver's gap.
//   Dev and TEST: this file never reads TEST unless C0_FINAL=1 is set in the environment (the final card, run once).
// ═══ END PREREGISTRATION ════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createIdentifier, loadIdentifyPrior, loadIdentifyShapePrior, splitLines, IDENTIFY_VERSION, IDENTIFY_PRIOR_FILE } from "../../adapters/code/identify.js";
import { KEY_ALPHA, mulberry32, derangement, binomUpperTail, signTest, headerDigest, minDiscordantFor } from "../competence/lib.mjs";

// ═══ AMENDMENT A1 — written 2026-10-05 AFTER DEV run 1 of the six dev languages (v1 exactly as registered above) and BEFORE the first run of anything below ═══
// REPORTED ONLY. It changes no v1 `pass`, no threshold and no v1 number; the v1 pre-registration at the top of this file (digest
// details.prereg_sha256 = 543ee1de...) stands as run. This block has its own digest (details.prereg_amendment_a1_sha256).
//
// WHAT DEV RUN 1 SHOWED (stated so the motivation is visible, not hidden). Pool (1530 eligible files, 51 candidates): real .892,
//   shape_only .891, deranged_sigma0 .885, keyword_only .342, majority .020. L1 held (sign p .0096), L2 FAILED (3 of 50 deranged draws
//   >= real, permutation p .078). pass === false for all six dev languages (python .967, javascript .200, c .667, go 1.000, ruby .900,
//   java 1.000): the received keyword sets carry almost nothing beyond what the TRAIN shape statistics already carry. Median across-
//   language SD of the final scores: B (shape) 369 nats, A (keyword) 11 nats. P4, P5, P6b, P10 failed; P1, P2 (python), P7, P8, P9 held.
// HYPOTHESES (for the failure, not for any pass)
//   H1 LEAK: the shape channel's first-token features (a:/b:) NAME the words some received set owns, so TRAIN counts of "line starts
//      with def / func / #include" already give per-language keyword statistics; the keyword ASSIGNMENT (which language owns the
//      set) is redundant, and deranging it moves nothing.
//   H2 SCALE: even without the leak, A is dwarfed by B in a raw sum (naive-Bayes overcounting makes B's totals huge), so it cannot move
//      the argmax.
// WHAT A1 ADDS (end-of-file arms on the SAME eligible files; each combined arm has its own deranged_sigma0 (A handed to the wrong
//   languages, sigma seed 1001) and its own 50 deranged draws; the pool and the slice are reported for each)
//   named_sum    v1 (reference, = real).
//   named_z      v1's two channels, each z-scored across the active languages (mean 0, SD 1 over the K candidate scores, an SD of 0 gives 0)
//                and then summed with equal weight (declared, not fitted).
//   blind_sum    keyword channel A + a shape channel B' counted on TRAIN with word identity WITHHELD (every word is W in a:/b:, so
//                the only word identity in the identifier is the RECEIVED set); raw sum.
//   blind_z      A + B', z-scored per channel, summed. B' is priors/code-identify-blind.json (CodeIdentifyShapePrior@1, built from the
//                same TRAIN files and the same frozen keyword sets by c0-build-prior.mjs --variant blind).
//   blind_shape_only   B' alone.
//   The z-score is computed from the scores of the prefix only (causal); A1 arms are reported at the end of the file.
// PREDICTIONS A1 (before running; failures are reported as failures)
//   A1-1  (H1) blind_shape_only pool accuracy <= named shape_only (.891) - 0.03: word identity at line start carries information B' lacks.
//   A1-2  (H1) blind_sum does NOT beat its 50 deranged draws (permutation p > .05): without a scale fix A is still dwarfed (H2).
//   A1-3  (H2) blind_z beats all 50 of its deranged draws (permutation p <= .05) and exceeds blind_shape_only by >= .03 pool accuracy.
//   A1-4  (H1) named_z does NOT beat all 50 of its deranged draws: the leak persists even when the scale is fixed.
//   A1-5  blind_z pool accuracy >= .80.
// DECISION RULE (for the recommendation only). An arm "meets the v1 rule" on a dev language iff the v1 PASS RULE (b)(c)(d) holds with
//   that arm as the real arm and its own deranged control and licences (L1, L2 on the pool; L3 is the identifier's own, unchanged).
//   If blind_z (or another arm) meets the rule on the dev languages it is RECOMMENDED as v2 for the TEST card with the disclosure
//   "selected on DEV after v1 failed its licence"; TEST is read once, by the main agent, for ONE frozen arm. If no arm meets it, the
//   finding stands: the received keyword sets are not load-bearing in this identifier and the shape statistics do the identifying.
// ═══ END AMENDMENT A1 ═════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A2 — written 2026-10-05 AFTER the first A1 run (python only; the POOL-level A1 numbers were therefore seen: named_sum .892,
//   named_z .817, blind_sum .857, blind_z .786, blind_shape_only .846; named_z deranged sigma0 .531) and BEFORE A1/A2 were run for the other five dev languages ═══
// REPORTED ONLY. Changes no v1 `pass`, no A1 number. Own digest: details.prereg_amendment_a2_sha256.
// WHAT THE A1 RUN SHOWED. The deranged control can collapse because WRONG evidence is harmful, not because the RIGHT evidence is helpful:
//   named_z hands the keyword channel as much weight as the shape channel, its deranged control falls to .531 (so the v1 rule would be met on
//   python) while its real arm (.817) is BELOW the shape-only ablation (.891). A derangement test alone cannot tell "the received set adds
//   information" from "an equal-weight channel that is wrong hurts"; the ablation can.
// WHAT A2 ADDS (per A1 arm): `ablation` = the same arm with the keyword channel removed (named arms: B alone = shape_only; blind arms: B' alone),
//   the accuracy difference real - ablation, and the paired exact one-sided sign test "arm beats its ablation" on the pool and on the slice.
//   An arm ADDS iff pool real > ablation with p < 0.05. This is the stronger reading of "the received prior contributes"; it is reported beside
//   the user's rule, it does not replace it, and it gates nothing.
// PREDICTIONS A2 (the pool means above were seen; the sign tests and every slice number were not)
//   A2-1  named_sum does NOT add (p >= .05).   A2-2  blind_sum ADDS (difference >= +.005 and p < .05).
//   A2-3  named_z and blind_z do NOT add (their pool accuracy is below their ablation).
//   A2-4  on at least 4 of the 6 dev languages no arm both meets the v1 rule and adds over its ablation (the received sets are not what identifies).
// ═══ END AMENDMENT A2 ══════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A3 — written 2026-10-05 after the A1/A2 runs on DEV (limit 30 and limit 80) and BEFORE this guard was ever evaluated ═══
// A GUARD, not a measurement. It can only turn a pass into a fail; it changes no number and no v1/A1/A2 result. Own digest: details.prereg_amendment_a3_sha256.
// L4 SPLIT AUDIT (RULE 9: held-out discipline is checked, not trusted). The identifier is a pooled, cross-language classifier, so the guard is
//   cross-language too: (i) no repository of the pool is a repository named in priors/code-identify.json (languages[].repos, the repositories the
//   prior was counted on), and (ii) no sha256 of a pool file equals the sha256 of ANY TRAIN row of the manifest (any language). Either overlap makes
//   decide() return pass === false with the reason "licence L4 failed: split leakage". The check was run offline on the manifest before writing this
//   block: 0 repositories and 0 sha256 are shared between TRAIN and DEV, TRAIN and TEST, or DEV and TEST (the manifest splits by repo hash globally).
// ═══ END AMENDMENT A3 ══════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A4 — written 2026-10-06 AFTER an independent review of the DEV runs 1-3 and BEFORE the re-run of anything below ═══
// GATING CHANGE: it can only turn a pass into a null or a fail; no threshold is relaxed and nothing above is edited. The v1 header digest and the
// digests of A1-A3 are unchanged (card details carry them beside this block's own digest, details.prereg_amendment_a4_sha256).
// WHAT THE REVIEW FOUND (stated so the motivation is visible). (1) The manifest labels the files of the ambiguous extensions .h .m .v .pl .cl .f .for
//   by CONTENT REGEXES (corpus/langmap.py resolve_ambiguous) and the identifier was counted on TRAIN rows labelled by the same regexes: matlab is 156/156
//   'm:matlab-syntax' on DEV, 46 'c' rows are .h files with NO content evidence ('h:repo-dominant-c-or-default'), cpp/objc/verilog/perl carry large
//   content-resolved shares. On those slices "gold" is not independent of what is measured. The manifest's refusal-only content filters
//   (latex:no-tex-command, scheme:no-scheme-forms, pl:no-perl-syntax-refused, v:no-module-refused ...) also deleted hard cases before scoring.
//   (2) The pool holds exact and near duplicates (9 sha groups of 21 files; flutter-examples/*/web/index.html x7; xmake lua modules) that the tests
//   count as independent. (3) Each DEV language has 3-5 repositories: a test that takes FILES as the independent units says nothing about held-out
//   SOURCES (with 3 repositories the smallest achievable repository-level one-sided p is 0.125).
// CHANGES
//   G  GOLD BASIS. A manifest row is "extension" (no `resolution` field: its label is the extension registry's) or "content_resolved" (a `resolution`
//      rule chose its language: .h .m .v .pl .cl .f .for, by a content regex, by the repository's other files, or by default). EVERY gating statistic
//      (pool accuracy, slice, majority share s_max, controls, licences L1/L2, the pass rule) is computed on the EXTENSION rows only. Content-resolved
//      rows are scored in a separate NON-GATING stratum, reported per language and per rule, with the typed gap "gold_circular: label derived from content
//      rule". A language with fewer than MIN_SLICE_N extension rows in its eligible slice gets pass null: with that gap when it has content-resolved rows
//      (matlab has none that are extension-labelled), else "slice too small". The c slice is scored on its .c files only.
//   R  REFUSAL FILTERS. The counts the manifest records for its refusal-only content filters (stats.dropped, stats.ambiguity) are printed per candidate
//      language as a typed selection-bias gap (the manifest does not record them per split: said so, not guessed).
//   D  DEDUPLICATION. Before sampling, inside each (language, gold-basis) list and in the sampling order, a file is skipped when its sha256 equals a kept
//      file's (exact) or when >= NEAR_DUP_FRAC = 0.8 of its whitespace-normalised lines of >= NEAR_DUP_MIN_LINE = 20 characters (md5[:12] of each) occur in
//      the union of the lines of the files already kept (near): the manifest's OWN NEAR_DUP rule (corpus/build_manifest.py) applied inside the pool.
//      Skipped files do not count toward LIMIT; the skipped counts are reported per language. Selection now reads file CONTENT (the registered rule said it
//      never would); it still never looks at any verdict.
//   S  REPOSITORY-LEVEL EVIDENCE. Files of one repository are not independent. Every gating test is over REPOSITORIES: per repository the arm's accuracy is
//      compared with the control's (or with s_max); higher = win, lower = loss, equal = tie (dropped). The one-sided exact sign test over the repositories
//      must give p < ALPHA AND wins > n_repos / 2 (the arm beats its control in a MAJORITY of the language's repositories). The file-level sign, binomial and
//      permutation numbers of v1 stay in the card as REPORT-ONLY (files as independent units: anecdote). A repository-resampled interval (cluster bootstrap,
//      B = 1000, seed 9001) of the accuracy difference is reported, not gating. L1 (pool) is the repository-level sign test over the pool's repositories.
//   U  POWER. MIN_REPOS = ceil(log2(1/ALPHA)) = 5 (lib.minDiscordantFor: with fewer repositories no one-sided exact sign test can reach ALPHA). A slice with fewer
//      than MIN_REPOS repositories whose POINT conditions hold gets pass null with the typed gap "repo-underpowered"; a point condition that FAILS is still
//      false (more repositories cannot be assumed to rescue it).
// PREDICTIONS A4 (before the re-run; manifest FACTS are not predictions: DEV python / javascript / go have 3 repositories and c has 4 extension-labelled
//   ones, so U makes their pass null by derivation)
//   A4-1  pass is null with a repo-underpowered gap for python, javascript, go and c on DEV (derivation; falsified only by a code error).
//   A4-2  the gating pool accuracy@EOF of the v1 arm stays within 0.05 of DEV run 1 (.892): removing content-resolved files and duplicates moves it little.
//   A4-3  the content-resolved stratum scores at least as well as the gating pool (the identifier learned the regexes), and matlab >= .90.
//   A4-4  deduplication skips between 1% and 8% of the files the old selection would have taken.
//   A4-5  the gating pool has >= 100 repositories, so L1 is powered.
// ═══ END AMENDMENT A4 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A5 — written 2026-10-06 BEFORE the re-run, same review. TWO TYPED CLAIMS instead of one conflated verdict; the L2 rule aligned with its registration ═══
// WHAT THE REVIEW FOUND. (a) The deranged control touches only the keyword channel A; the shape channel B is TRAIN-fit and (v1) names the line-start words the
//   received sets own, so it is untouched by the derangement. Python scored .967 (very competent) yet got pass=false, while named_z / blind_z "met the v1 rule" at
//   pool .817 / .786, BELOW their keyword-removed ablations (.891 / .846). One verdict cannot say "competent" and "the received prior is load-bearing" at once,
//   and the recommendation could select an arm worse than its own ablation. (b) The header's L2 says the real arm must exceed ALL 50 deranged draws (p = 1/51)
//   but the code accepted permutationP <= 0.05, which tolerates one draw >= real (2/51 = .039): code and header disagreed.
// CHANGES
//   C1  CLAIM 1, identification competence (card.pass, card.score, card.control = s_max): the arm names held-out files' language better than the majority
//       baseline: slice accuracy > s_max AND the repository-level test vs s_max (A4-S) AND licences L3 (causal) and L4 (split). It does NOT have to beat a shape-only
//       or other non-received baseline: those are REPORTED beside it (controls.shape_only, claims.identification.vs_nonreceived), because a trained shape classifier that
//       is competent is still competent.
//   C2  CLAIM 2, received-prior contribution (card.claims.received_prior): the received keyword set is load-bearing. (i) L1 (pool, repository-level) and L2 (the real
//       arm exceeds ALL 50 draws: atLeastReal === 0, the registered rule; the code's looser 2/51 test is WITHDRAWN) hold; (ii) the slice beats its deranged_sigma0
//       control at the repository level; (iii) the slice AND the pool beat the arm's own ABLATION (keyword channel removed: named arms B alone, blind arms B' alone) by
//       the paired exact sign test over repositories, p < ALPHA, and in a majority of the slice's repositories. A failed licence or point condition = false; otherwise
//       a slice with < MIN_REPOS repositories = null (repo-underpowered).
//   C3  card.pass is claim 1 only; claim 2 never edits it and has its own licence object (a failed claim-2 licence is not a failed claim-1 licence).
//   C4  recommendation.meets = the arms for which BOTH claims are true (an arm below its own ablation can never be recommended); meets_and_adds_over_ablation is kept
//       and equals it. recommendation.pool_level reports, per arm, whether the keyword channel adds over its ablation across the POOL's repositories (powered).
//   C5  For the named arms the ablation (shape B) still names the received words (the A1 H1 leak), so claim 2 on a named arm is a conservative marginal test; the blind
//       arms (word identity enters only through the received set) are the clean control. The card says so.
// PREDICTIONS A5 (before the re-run)
//   A5-1  claim 2 is false (not null) on every dev language for the v1 arm: L2 fails or the keyword channel does not add over the shape-only ablation (A2-1, A2-3, A2-4 stand).
//   A5-2  python claim 1: point conditions hold (accuracy far above s_max), so it is null (repo-underpowered), never true.
//   A5-3  no arm is recommended (meets = []) on any dev language.
//   A5-4  L2 (strict) fails for the v1 arm: at least one of the 50 deranged draws is >= the real arm on the gating pool (3 of 50 were in DEV run 1).
// ═══ END AMENDMENT A5 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A6 — written 2026-10-06 BEFORE the re-run. SINGLE-READ TEST DISCIPLINE ENFORCED IN CODE, not by one environment variable ═══
// WHAT THE REVIEW FOUND. TEST was guarded only by C0_FINAL=1, while measure() on TEST computed the v1 verdict plus all four A1 arms, their ablations and the recommendation in
//   ONE read; choosing an arm after seeing TEST would destroy its held-out status. The CLI wrote no read log and refused no second read.
// CHANGES. split "test" now requires: (1) C0_FINAL=1; (2) ONE frozen arm named in advance (--arm named_sum|named_z|blind_sum|blind_z, or C0_ARM); no --limit; (3) a lock file
//   OUT_DIR/c0-final.lock, created exclusively BEFORE any TEST file is opened (by the first TEST call, or by `--freeze --arm X` alone), recording the arm, the sha256 of
//   priors/code-identify.json and code-identify-blind.json, of adapters/code/identify.js and of this file, the header and A1-A6 digests, the limit, the manifest stamp and the
//   time; a later TEST call whose fingerprint differs in ANY field (another arm, a rebuilt prior, an edited amendment or instrument) is REFUSED and the fields are listed; the lock
//   is never rewritten by this code; (4) a per-language read log OUT_DIR/c0-test-reads.jsonl (its own file: run.mjs's test-reads.jsonl is the card-level log and would be double
//   counted): an entry "started" is appended before the first TEST file is read, an entry "completed" (with the card's sha256) after; any entry for that language, or an entry of
//   run.mjs's log whose rungs include c0, makes a second TEST read of the language REFUSED (a typed gap, never a silent pass). A real TEST card is never overwritten by a refusal.
//   On TEST only the frozen arm is computed: no other arm, no A1/A2 ablation table, no recommendation (details.amendment_A1.withheld); claims 1 and 2 are computed for that arm
//   alone, with its own ablation and deranged control. A DEV call with --arm runs the same code path on DEV (a dry run that spends nothing).
// ═══ END AMENDMENT A6 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

// ═══ AMENDMENT A7 — written 2026-10-06 AFTER the first DEV re-run under A4-A6 (python, javascript, c, go: pool numbers seen) and BEFORE the final DEV re-run. PLUMBING ONLY ═══
// None of this changes a gating number, a threshold or an A4-A6 rule on any pool the DEV or TEST splits can produce (their pools hold >= 95 repositories); it closes edge cases the
// unit tests found and adds report fields. Own digest: details.prereg_amendment_a7_sha256 (A1-A6 digests are unchanged).
//   P1  CLAIM 2 AND A SMALL POOL. A pool with fewer than MIN_REPOS repositories can neither establish nor refute L1: claim 2 is then null with the typed gap "repo-underpowered (pool, licence
//       L1)", not false (A5-C2 said only that an underpowered SLICE is null). A failing L2 or point condition is still false.
//   P2  SAMPLING TIE-BREAK. Two rows of one repository with the same sha256 (exact duplicates) are ordered by path, so the sampling order is a total order (the v1 comparator left it open).
//   P3  REPORT FIELDS. details.gold_basis.per_language (extension / content-resolved row counts and the gold basis of every candidate language), resolution `kind` (content_regex | repo_vote |
//       default_no_evidence) on every rule of the content-resolved stratum; measure() accepts an injected manifest, cache directory, output directory and environment so the TEST branch is
//       exercised end to end on an AUTHORED toy manifest without opening a real TEST file (tests/coding-c0.test.js).
//   P4  The lock fingerprint (A6) also carries this block's digest.
// ═══ END AMENDMENT A7 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

const THIS_FILE = fileURLToPath(import.meta.url);
export const RUNG = Object.freeze({
  id: "R0",
  name: "identify",
  question: "Does a causal, zero-model identifier name the programming language (or notation) of a held-out file from its content alone, beating the majority baseline and a keyword-deranged control?",
});

export const MANIFEST_FILE = "/private/tmp/claude-501/code-corpus/manifest.json";
export const OUT_DIR = "/private/tmp/claude-501/coding-competence";
const CACHE_DIR = path.join(OUT_DIR, "c0");

/** Declared parameters (see PARAMETERS in the header). */
export const PARAMS = Object.freeze({
  ALPHA: KEY_ALPHA,
  MIN_NONBLANK: 5,
  LIMIT: 30,
  MIN_SLICE_N: 10,
  SIGMA0_SEED: 1001,
  DRAW_SEEDS: Object.freeze(Array.from({ length: 50 }, (_, i) => i + 1)),
  CAUSALITY_SAMPLE: 40,
  K_GRID: Object.freeze([1, 3, 5, 10, 25, 50, 100]),
  COVERAGE: Object.freeze([1, 0.8, 0.6, 0.4, 0.2]),
  WEAK_BELOW: 0.5,
  MIN_REPOS: minDiscordantFor(KEY_ALPHA), // A4-U, derived: the fewest repositories at which a one-sided exact sign test CAN reach ALPHA (2^-5 = .031 <= .05 < 2^-4 = .0625)
  NEAR_DUP_FRAC: 0.8, // A4-D: the manifest's own (corpus/build_manifest.py NEAR_DUP_FRAC / NEAR_DUP_MIN_LINE)
  NEAR_DUP_MIN_LINE: 20,
  BOOT_B: 1000, // A4-S: cluster-bootstrap resamples of repositories (report only), PROVISIONAL (P4)
  BOOT_SEED: 9001,
  FAMILIES: Object.freeze([
    ["c", "cpp", "objc"],
    ["javascript", "typescript", "tsx"],
    ["python", "nim"],
    ["bash", "powershell"],
    ["html", "vue", "svelte"],
    ["scheme", "racket", "commonlisp", "clojure"],
  ]),
});

// ── pure arithmetic over per-file records (exported: tests/coding-c0.test.js drives them on a toy fixture) ───────────────
// A record: { truth: index, A: number[K], B: number[K], transitions: [[line, idx|-1], ...], nLines, margin?, resolution?, repo? }

/** z-score over the active languages (mean 0, SD 1; SD 0 -> zeros): the same rule as identify.js (A1 arms). */
export function zscoreVec(v, active = null) {
  const idx = [];
  for (let L = 0; L < v.length; L++) if (!active || active[L]) idx.push(L);
  const out = new Array(v.length).fill(0);
  if (!idx.length) return out;
  const mean = idx.reduce((s, L) => s + v[L], 0) / idx.length;
  const sd = Math.sqrt(idx.reduce((s, L) => s + (v[L] - mean) ** 2, 0) / idx.length);
  if (sd > 0) for (const L of idx) out[L] = (v[L] - mean) / sd;
  return out;
}

/**
 * index of max_L (A[perm?perm[L]:L] + B[L]) over active languages; -1 when none. Ties go to the lower index (deterministic).
 * mode "z": each channel is z-scored across the active languages first (A1 arms); the permutation then hands the z-scored A to the wrong languages.
 */
export function argmaxCombined(A, B, { perm = null, active = null, mode = "sum" } = {}) {
  const a = mode === "z" ? zscoreVec(A, active) : A;
  const b = mode === "z" ? zscoreVec(B, active) : B;
  let best = -1;
  let bs = -Infinity;
  for (let L = 0; L < b.length; L++) {
    if (active && !active[L]) continue;
    const s = a[perm ? perm[L] : L] + b[L];
    if (s > bs) { bs = s; best = L; }
  }
  return best;
}

/** the leader after the first k lines (-1 before any evidence). */
export function leaderAtLine(transitions, k) {
  let idx = -1;
  for (const [line, i] of transitions) { if (line <= k) idx = i; else break; }
  return idx;
}
export const finalLeader = (transitions) => (transitions.length ? transitions[transitions.length - 1][1] : -1);

/** lines-until-correct-and-stable: null (censored) unless the final leader is the gold; else the line at which the final run began. */
export function lucs(transitions, gold) {
  if (!transitions.length || finalLeader(transitions) !== gold) return null;
  return transitions[transitions.length - 1][0];
}

export const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : null);

/** majority share and label of the truth distribution */
export function majorityOf(truths) {
  const c = new Map();
  for (const t of truths) c.set(t, (c.get(t) ?? 0) + 1);
  let best = null;
  for (const [t, n] of [...c].sort((a, b) => a[0] - b[0])) if (!best || n > best.n) best = { label: t, n };
  return best ? { label: best.label, n: best.n, share: best.n / truths.length } : null;
}

/** Paired exact sign test of "A beats B" from per-file correctness vectors. Since amendment A4 the FILE-level tests are REPORT-ONLY (files of one repository are not independent). */
export function pairedSign(aCorrect, bCorrect) {
  let wins = 0, losses = 0;
  for (let i = 0; i < aCorrect.length; i++) {
    if (aCorrect[i] && !bCorrect[i]) wins++;
    else if (!aCorrect[i] && bCorrect[i]) losses++;
  }
  return signTest(wins, losses);
}

// ── repository-level evidence (amendment A4-S / A4-U): the independent unit is the REPOSITORY, not the file ──────────────
const repoOf = (r) => r.repo ?? "?";
function repoGroups(records, idxs) {
  const g = new Map();
  for (const i of idxs) {
    const k = repoOf(records[i]);
    let e = g.get(k);
    if (!e) g.set(k, (e = []));
    e.push(i);
  }
  return g;
}

/**
 * Repository-level paired sign test. Per repository: accuracy of arm A (`aOk`, a per-file correctness vector) minus the accuracy of arm B
 * (`bOk`) or of the constant `constant` (e.g. the majority share s_max). Higher = win, lower = loss, equal = tie (dropped).
 * -> { n_repos, wins, losses, ties, p (one-sided exact sign test over the repositories), majority_of_repos (wins > n_repos/2),
 *      min_achievable_p (2^-n_repos: all repositories win), powered (min_achievable_p <= ALPHA, i.e. n_repos >= MIN_REPOS), per_repo? }
 */
export function repoPaired(records, aOk, bOk, idxs = null, { constant = null, detail = false } = {}) {
  const sel = idxs ?? records.map((_, i) => i);
  const groups = repoGroups(records, sel);
  let wins = 0, losses = 0, ties = 0;
  const rows = [];
  for (const [repo, ix] of [...groups].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))) {
    const a = ix.filter((i) => aOk[i]).length / ix.length;
    const b = constant != null ? constant : ix.filter((i) => bOk[i]).length / ix.length;
    if (a > b + 1e-12) wins++;
    else if (a < b - 1e-12) losses++;
    else ties++;
    if (detail) rows.push({ repo, n: ix.length, a, b });
  }
  const n_repos = groups.size;
  const s = signTest(wins, losses);
  const min_achievable_p = n_repos ? 0.5 ** n_repos : 1;
  const out = { n_repos, wins, losses, ties, p: s.p, majority_of_repos: n_repos > 0 && wins > n_repos / 2, min_achievable_p, powered: min_achievable_p <= PARAMS.ALPHA };
  if (detail) out.per_repo = rows;
  return out;
}

/**
 * Cluster bootstrap (REPORT-ONLY): resample the REPOSITORIES with replacement and recompute the pooled accuracy difference (A minus B, or minus the
 * constant). -> { n_repos, B, observed, mean, lo, hi (2.5% / 97.5%), p_le_zero (share of resamples with difference <= 0) }; null fields below 2 repositories.
 */
export function clusterBootstrap(records, aOk, bOk, idxs = null, { B = PARAMS.BOOT_B, seed = PARAMS.BOOT_SEED, constant = null } = {}) {
  const sel = idxs ?? records.map((_, i) => i);
  const groups = [...repoGroups(records, sel).values()].map((ix) => ({
    n: ix.length,
    a: ix.filter((i) => aOk[i]).length,
    b: constant != null ? constant * ix.length : ix.filter((i) => bOk[i]).length,
  }));
  const R = groups.length;
  const tot = groups.reduce((s, g) => ({ n: s.n + g.n, a: s.a + g.a, b: s.b + g.b }), { n: 0, a: 0, b: 0 });
  const observed = tot.n ? (tot.a - tot.b) / tot.n : null;
  if (R < 2) return { n_repos: R, B: 0, observed, mean: null, lo: null, hi: null, p_le_zero: null, note: "fewer than 2 repositories: nothing to resample" };
  const rng = mulberry32(seed);
  const diffs = [];
  for (let t = 0; t < B; t++) {
    let n = 0, a = 0, b = 0;
    for (let k = 0; k < R; k++) { const g = groups[Math.floor(rng() * R)]; n += g.n; a += g.a; b += g.b; }
    diffs.push((a - b) / n);
  }
  diffs.sort((x, y) => x - y);
  const q = (p) => diffs[Math.min(B - 1, Math.floor(p * B))];
  return { n_repos: R, B, observed, mean: diffs.reduce((s, x) => s + x, 0) / B, lo: q(0.025), hi: q(0.975), p_le_zero: diffs.filter((d) => d <= 0).length / B };
}

/**
 * armCore(records, { slice, sigma0, drawPerms, real, derange, ablate, majShare, transitionsOf }) -> { pool, slice? } (pure).
 * `real(r)` is the arm's own end-of-file prediction, `derange(r, perm)` the same arm with its keyword channel handed to the wrong languages, `ablate(r)` the same arm
 * with the keyword channel REMOVED (A2). File-level numbers (signVs*, binomVsMajority, draws) are kept; repository-level numbers sit under `.repo` and gate (A4-S).
 */
export function armCore(records, { slice = null, sigma0, drawPerms = [], real, derange, ablate = null, majShare = null, transitionsOf = null }) {
  const n = records.length;
  const realOk = records.map((r) => real(r) === r.truth);
  const ctlOk = records.map((r) => derange(r, sigma0) === r.truth);
  const ablOk = ablate ? records.map((r) => ablate(r) === r.truth) : null;
  const acc = (c, idxs = null) => {
    const sel = idxs ?? c.map((_, i) => i);
    return sel.length ? sel.filter((i) => c[i]).length / sel.length : null;
  };
  const pool = {
    n,
    n_repos: new Set(records.map(repoOf)).size,
    accuracy: { real: acc(realOk), deranged_sigma0: acc(ctlOk), ablation: ablOk ? acc(ablOk) : null },
    signVsSigma0: pairedSign(realOk, ctlOk), // files as units: report-only
    signVsAblation: ablOk ? pairedSign(realOk, ablOk) : null,
    repo: { vsSigma0: repoPaired(records, realOk, ctlOk), vsAblation: ablOk ? repoPaired(records, realOk, ablOk) : null },
  };
  const drawAcc = drawPerms.map((perm) => records.filter((r) => derange(r, perm) === r.truth).length / n);
  const realAcc = pool.accuracy.real;
  const atLeast = drawAcc.filter((x) => x >= realAcc).length;
  pool.draws = {
    n: drawAcc.length,
    mean: drawAcc.length ? drawAcc.reduce((a, b) => a + b, 0) / drawAcc.length : null,
    max: drawAcc.length ? Math.max(...drawAcc) : null,
    min: drawAcc.length ? Math.min(...drawAcc) : null,
    atLeastReal: atLeast,
    permutationP: drawAcc.length ? (1 + atLeast) / (1 + drawAcc.length) : null, // report-only; the gate is atLeastReal === 0 (A5-C2)
  };
  if (transitionsOf) pool.lucs = lucsSummary(records.map((r) => lucs(transitionsOf(r), r.truth)).filter((x) => x != null).sort((a, b) => a - b), n);
  const out = { pool };
  if (slice != null) {
    const idxs = records.map((r, i) => (r.truth === slice ? i : -1)).filter((i) => i >= 0);
    const k = idxs.filter((i) => realOk[i]).length;
    const sub = (c) => idxs.map((i) => c[i]);
    out.slice = {
      n: idxs.length,
      n_repos: new Set(idxs.map((i) => repoOf(records[i]))).size,
      correct: k,
      accuracy: acc(realOk, idxs),
      arms: { deranged_sigma0: acc(ctlOk, idxs), ablation: ablOk ? acc(ablOk, idxs) : null },
      signVsSigma0: pairedSign(sub(realOk), sub(ctlOk)), // files as units: report-only
      signVsAblation: ablOk ? pairedSign(sub(realOk), sub(ablOk)) : null,
      binomVsMajority: majShare != null ? { share: majShare, p: idxs.length ? binomUpperTail(k, idxs.length, majShare) : 1 } : null, // files as units: report-only
      repo: {
        vsMajority: majShare != null ? repoPaired(records, realOk, null, idxs, { constant: majShare, detail: true }) : null,
        vsSigma0: repoPaired(records, realOk, ctlOk, idxs, { detail: true }),
        vsAblation: ablOk ? repoPaired(records, realOk, ablOk, idxs, { detail: true }) : null,
        bootstrap: {
          vsMajority: majShare != null ? clusterBootstrap(records, realOk, null, idxs, { constant: majShare }) : null,
          vsSigma0: clusterBootstrap(records, realOk, ctlOk, idxs),
          vsAblation: ablOk ? clusterBootstrap(records, realOk, ablOk, idxs) : null,
        },
      },
    };
    if (transitionsOf) out.slice.lucs = lucsSummary(idxs.map((i) => lucs(transitionsOf(records[i]), slice)).filter((x) => x != null).sort((a, b) => a - b), idxs.length);
  }
  return out;
}

/**
 * analyse(records, { K, languages, active, slice, sigma0, drawPerms, mode }) -> pool and slice numbers for every arm.
 * Pure: no files, no manifest. `slice` is a language index (or null for pool only). `mode` ("sum" | "z") is how the arm combines its two channels
 * for the derangement control; `records[i].transitions` is the arm's own trajectory and `records[i].B` its shape vector (the caller projects them).
 */
export function analyse(records, { K, languages, active = null, slice = null, sigma0, drawPerms = [], mode = "sum" }) {
  const n = records.length;
  const truth = records.map((r) => r.truth);
  const real = records.map((r) => finalLeader(r.transitions));
  const zeros = new Array(K).fill(0);
  const arms = {
    real,
    deranged_sigma0: records.map((r) => argmaxCombined(r.A, r.B, { perm: sigma0, active, mode })),
    shape_only: records.map((r) => argmaxCombined(zeros, r.B, { active })),
    keyword_only: records.map((r) => argmaxCombined(r.A, zeros, { active })),
  };
  const maj = majorityOf(truth);
  arms.majority = records.map(() => (maj ? maj.label : -1));
  const correct = Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, v.map((p, i) => p === truth[i])]));
  const acc = (c, idxs = null) => {
    const sel = idxs ?? c.map((_, i) => i);
    return sel.length ? sel.filter((i) => c[i]).length / sel.length : null;
  };
  const core = armCore(records, {
    slice,
    sigma0,
    drawPerms,
    real: (r) => finalLeader(r.transitions),
    derange: (r, perm) => argmaxCombined(r.A, r.B, { perm, active, mode }),
    ablate: (r) => argmaxCombined(zeros, r.B, { active }),
    majShare: maj ? maj.share : null,
  });
  const pool = { n, n_repos: core.pool.n_repos, majority: maj ? { label: languages[maj.label], n: maj.n, share: maj.share } : null, accuracy: Object.fromEntries(Object.entries(correct).map(([k, c]) => [k, acc(c)])) };
  pool.accuracy.ablation = core.pool.accuracy.ablation; // = shape_only (the arm's keyword channel removed)
  // per-language recall (real) and macro recall
  const byLang = new Map();
  records.forEach((r, i) => { if (!byLang.has(r.truth)) byLang.set(r.truth, []); byLang.get(r.truth).push(i); });
  pool.recall = {};
  let macro = 0;
  for (const [L, idxs] of [...byLang].sort((a, b) => a[0] - b[0])) {
    const rc = acc(correct.real, idxs);
    pool.recall[languages[L]] = { n: idxs.length, recall: rc };
    macro += rc;
  }
  pool.macroRecall = byLang.size ? macro / byLang.size : null;
  // L1 / L2 inputs: file-level sign test (report-only), repository-level sign tests (gating), the deranged draws
  pool.signVsSigma0 = core.pool.signVsSigma0;
  pool.signVsAblation = core.pool.signVsAblation;
  pool.repo = core.pool.repo;
  pool.draws = core.pool.draws;
  // confusions (pool)
  const confMap = new Map();
  records.forEach((r, i) => {
    if (real[i] !== r.truth) {
      const key = `${languages[r.truth]}->${real[i] >= 0 ? languages[real[i]] : "(none)"}`;
      confMap.set(key, (confMap.get(key) ?? 0) + 1);
    }
  });
  pool.confusions = [...confMap].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12).map(([pair, count]) => ({ pair, count }));
  // accuracy at k (pool), LUCS (pool)
  pool.accuracyAtK = Object.fromEntries(PARAMS.K_GRID.map((k) => [k, acc(records.map((r) => leaderAtLine(r.transitions, k) === r.truth))]));
  const lu = records.map((r) => lucs(r.transitions, r.truth)).filter((x) => x != null).sort((a, b) => a - b);
  pool.lucs = lucsSummary(lu, n);
  // strata: the gating pool holds extension-labelled files only (A4-G); the content-resolved stratum is scored apart (measure() fills this in)
  const amb = records.map((r, i) => (r.resolution ? i : -1)).filter((i) => i >= 0);
  const non = records.map((r, i) => (r.resolution ? -1 : i)).filter((i) => i >= 0);
  pool.strata = { ambiguousResolution: { n: amb.length, accuracy: acc(correct.real, amb) }, other: { n: non.length, accuracy: acc(correct.real, non) } };
  // risk-coverage by final margin (nats)
  const order = records.map((r, i) => i).sort((a, b) => (records[b].margin ?? 0) - (records[a].margin ?? 0));
  pool.riskCoverage = PARAMS.COVERAGE.map((cov) => {
    const sel = order.slice(0, Math.max(1, Math.round(cov * n)));
    return { coverage: cov, n: sel.length, accuracy: acc(correct.real, sel), minMargin: sel.length ? records[sel[sel.length - 1]].margin ?? null : null };
  });
  const out = { pool, arms, correct, maj };
  if (slice != null) {
    const idxs = byLang.get(slice) ?? [];
    const s = { language: languages[slice], n: idxs.length, n_repos: core.slice.n_repos, correct: idxs.filter((i) => correct.real[i]).length };
    s.accuracy = acc(correct.real, idxs);
    s.arms = Object.fromEntries(Object.entries(correct).map(([k, c]) => [k, acc(c, idxs)]));
    s.arms.ablation = core.slice.arms.ablation; // = shape_only on the slice
    s.signVsSigma0 = core.slice.signVsSigma0;
    s.signVsAblation = core.slice.signVsAblation;
    s.binomVsMajority = core.slice.binomVsMajority;
    s.repo = core.slice.repo;
    s.accuracyAtK = Object.fromEntries(PARAMS.K_GRID.map((k) => [k, idxs.length ? idxs.filter((i) => leaderAtLine(records[i].transitions, k) === slice).length / idxs.length : null]));
    s.lucs = lucsSummary(idxs.map((i) => lucs(records[i].transitions, slice)).filter((x) => x != null).sort((a, b) => a - b), idxs.length);
    const sc = new Map();
    for (const i of idxs) if (real[i] !== slice) { const k = real[i] >= 0 ? languages[real[i]] : "(none)"; sc.set(k, (sc.get(k) ?? 0) + 1); }
    s.confusions = [...sc].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([to, count]) => ({ to, count }));
    const rep = new Map();
    for (const i of idxs) { const r = records[i].repo ?? "?"; const e = rep.get(r) ?? { n: 0, ok: 0 }; e.n++; if (correct.real[i]) e.ok++; rep.set(r, e); }
    s.byRepo = Object.fromEntries([...rep].sort().map(([r, e]) => [r, { n: e.n, accuracy: e.ok / e.n }]));
    const ambS = idxs.filter((i) => records[i].resolution);
    s.strata = { ambiguousResolution: { n: ambS.length, accuracy: acc(correct.real, ambS) }, other: { n: idxs.length - ambS.length, accuracy: acc(correct.real, idxs.filter((i) => !records[i].resolution)) } };
    out.slice = s;
  }
  return out;
}

/** analyseArm(records, { slice, sigma0, drawPerms, real, derange, ablate, majShare, transitionsOf }) -> { pool, slice } in the shape decide() reads (the A1 arms; = armCore). Pure. */
export function analyseArm(records, opts) {
  const c = armCore(records, opts);
  return c.slice ? { pool: c.pool, slice: c.slice } : { pool: c.pool };
}

function lucsSummary(sortedLucs, nAll) {
  const stableBy = Object.fromEntries([10, 25, 50, 100].map((k) => [k, nAll ? sortedLucs.filter((x) => x <= k).length / nAll : null]));
  return {
    n_final_correct: sortedLucs.length,
    n_censored: nAll - sortedLucs.length,
    median: quantile(sortedLucs, 0.5),
    p90: quantile(sortedLucs, 0.9),
    stableBy,
    stableByAmongCorrect: Object.fromEntries([10, 25, 50, 100].map((k) => [k, sortedLucs.length ? sortedLucs.filter((x) => x <= k).length / sortedLucs.length : null])),
  };
}

/**
 * The pass rules on top of analyse() / analyseArm() (pure; the test drives it too). Since amendments A4-A6 the verdict is TWO TYPED CLAIMS:
 *   claims.identification   (card.pass) slice accuracy > s_max, the repository-level test vs s_max, licences L3 (causal) and L4 (split);
 *   claims.received_prior   L1 + L2 (strict) licences, beats its deranged control and its own keyword ablation at the repository level.
 * Each is true | false | null. null = typed gap (slice too small, gold_circular, repo-underpowered, unmeasured); a failing POINT condition is false.
 * `gold` = { content_resolved_n } (A4-G): the language's content-resolved rows (non-gating) when it has too few extension-labelled ones.
 */
export function decide({ analysis, nSliceMin = PARAMS.MIN_SLICE_N, alpha = PARAMS.ALPHA, causalityIdentical = true, splitClean = true, minRepos = PARAMS.MIN_REPOS, gold = null }) {
  const { pool, slice } = analysis;
  const typed = (reason) => ({ pass: null, reasons: [reason], licence: null });
  if (!slice || slice.n < nSliceMin) {
    const circular = gold && gold.content_resolved_n > 0;
    const reason = circular
      ? `gold_circular: label derived from content rule (${slice ? slice.n : 0} extension-labelled eligible files < ${nSliceMin}; ${gold.content_resolved_n} content-resolved files sit in a non-gating stratum)`
      : `slice too small (n=${slice ? slice.n : 0} < ${nSliceMin})`;
    return { pass: null, reasons: [reason], licence: null, tests: null, claims: { identification: typed(reason), received_prior: typed(reason) } };
  }
  const underpowered = (n) => `repo-underpowered: ${n} repositories < ${minRepos} (a one-sided exact repository-level sign test cannot reach alpha=${alpha} below ${minRepos}; its smallest achievable p is ${(0.5 ** n).toFixed(4)})`;
  const fmt = (t) => `wins ${t.wins} / losses ${t.losses} / ties ${t.ties} of ${t.n_repos} repositories, p ${t.p.toFixed(4)}`;
  const licenceCore = { L3_causality: !!causalityIdentical, L4_split_clean: !!splitClean };

  // ── CLAIM 1: identification competence
  const sMax = slice.binomVsMajority ? slice.binomVsMajority.share : null;
  const rm = slice.repo?.vsMajority ?? null;
  const idFail = [];
  const idNotes = [];
  if (!(sMax != null && slice.accuracy > sMax)) idFail.push("does not beat the majority baseline (slice accuracy is not above s_max)");
  if (!causalityIdentical) idFail.push("licence L3 failed: the real arm's leaders changed when the future was corrupted");
  if (!splitClean) idFail.push("licence L4 failed: split leakage (a pool repository or file also sits in the TRAIN the prior was counted on)");
  let idPass;
  if (idFail.length) idPass = false;
  else if (!rm) { idPass = null; idNotes.push("unmeasured: no repository-level comparison with the majority baseline was supplied"); }
  else if (slice.n_repos < minRepos) { idPass = null; idNotes.push(underpowered(slice.n_repos)); }
  else {
    idPass = rm.p < alpha && rm.majority_of_repos;
    if (!idPass) idFail.push(`repository-level test vs the majority baseline not met (${fmt(rm)}${rm.majority_of_repos ? "" : "; not a majority of the repositories"})`);
  }
  if (idPass === true && slice.accuracy < PARAMS.WEAK_BELOW) idNotes.push(`weak: the rule is met but accuracy ${slice.accuracy.toFixed(2)} < ${PARAMS.WEAK_BELOW}`);

  // ── CLAIM 2: received-prior contribution
  const pr = pool.repo ?? {};
  const poolUnder = !!pr.vsSigma0 && pr.vsSigma0.n_repos < minRepos; // L1 cannot be established (nor refuted) on fewer than MIN_REPOS pool repositories
  const L1 = poolUnder ? null : !!pr.vsSigma0 && pr.vsSigma0.p < alpha && pool.accuracy.real > pool.accuracy.deranged_sigma0;
  const L2 = pool.draws.n > 0 && pool.draws.atLeastReal === 0;
  const rpFail = [];
  const rpNotes = [];
  if (L1 === false) rpFail.push("licence L1 failed: across the pool's repositories the real arm does not beat its deranged keyword control (control not moved, or mechanism broken)");
  if (poolUnder) rpNotes.push(underpowered(pr.vsSigma0.n_repos).replace("repo-underpowered:", "repo-underpowered (pool, licence L1):"));
  if (!L2) rpFail.push(`licence L2 failed: ${pool.draws.atLeastReal} of ${pool.draws.n} deranged draws matched or beat the real arm (the registered rule needs none)`);
  if (!(slice.accuracy > slice.arms.deranged_sigma0)) rpFail.push("does not beat the deranged keyword control on this language's files");
  const hasAbl = slice.arms.ablation != null && pool.accuracy.ablation != null && !!slice.repo?.vsAblation && !!pr.vsAblation;
  let rpPass;
  const vs = {};
  if (!hasAbl) {
    rpPass = rpFail.length ? false : null;
    if (rpPass === null) rpNotes.push("unmeasured: no ablation arm (keyword channel removed) was supplied");
  } else {
    if (!(slice.accuracy > slice.arms.ablation)) rpFail.push("does not beat its own ablation (keyword channel removed) on this language's files: the received keyword set adds nothing here");
    if (!(pool.accuracy.real > pool.accuracy.ablation)) rpFail.push("does not beat its own ablation (keyword channel removed) on the pool");
    if (rpFail.length) rpPass = false;
    else if (poolUnder || slice.n_repos < minRepos) { rpPass = null; if (slice.n_repos < minRepos) rpNotes.push(underpowered(slice.n_repos)); }
    else {
      const t1 = slice.repo.vsSigma0.p < alpha && slice.repo.vsSigma0.majority_of_repos;
      const t2 = slice.repo.vsAblation.p < alpha && slice.repo.vsAblation.majority_of_repos;
      const t3 = pr.vsAblation.p < alpha;
      vs.deranged = t1; vs.ablation_slice = t2; vs.ablation_pool = t3;
      if (!t1) rpFail.push(`repository-level test vs the deranged keyword control not met (${fmt(slice.repo.vsSigma0)})`);
      if (!t2) rpFail.push(`repository-level test vs the arm's own ablation not met on this language (${fmt(slice.repo.vsAblation)})`);
      if (!t3) rpFail.push(`repository-level test vs the arm's own ablation not met on the pool (${fmt(pr.vsAblation)})`);
      rpPass = t1 && t2 && t3;
    }
  }
  const claims = {
    identification: {
      pass: idPass,
      reasons: [...idFail, ...idNotes],
      licence: licenceCore,
      control: "majority baseline s_max (non-received baselines are reported beside it, not gating)",
      tests: { vs_majority: rm ? { wins: rm.wins, losses: rm.losses, ties: rm.ties, n_repos: rm.n_repos, p: rm.p, majority_of_repos: rm.majority_of_repos } : null },
    },
    received_prior: {
      pass: rpPass,
      reasons: [...rpFail, ...rpNotes],
      licence: { L1_repo_sign_vs_sigma0: L1, L2_all_draws_beaten: L2 },
      tests: { vs_deranged: slice.repo?.vsSigma0 ? { wins: slice.repo.vsSigma0.wins, losses: slice.repo.vsSigma0.losses, n_repos: slice.repo.vsSigma0.n_repos, p: slice.repo.vsSigma0.p } : null, vs_ablation_slice: slice.repo?.vsAblation ? { wins: slice.repo.vsAblation.wins, losses: slice.repo.vsAblation.losses, n_repos: slice.repo.vsAblation.n_repos, p: slice.repo.vsAblation.p } : null, vs_ablation_pool: pr.vsAblation ? { wins: pr.vsAblation.wins, losses: pr.vsAblation.losses, n_repos: pr.vsAblation.n_repos, p: pr.vsAblation.p } : null, gates_met: vs },
    },
  };
  return { pass: idPass, reasons: claims.identification.reasons, licence: licenceCore, tests: { majority: idPass === true, deranged: slice.accuracy > slice.arms.deranged_sigma0 }, claims };
}

// ── corpus access (manifest rows). Selection reads file CONTENT only to de-duplicate (A4-D) and never looks at a verdict ─────────
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => createHash("md5").update(s, "utf8").digest("hex");
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };

/**
 * Gold basis of a manifest row (A4-G): "extension" = the label is the extension registry's (no `resolution` field); "content_resolved" = a resolution rule
 * (.h .m .v .pl .cl .f .for: a content regex, the repository's other files, or a default) chose the language. Only "extension" rows gate.
 */
export function goldBasisOf(row) {
  const rule = row?.resolution ?? null;
  return rule ? { basis: "content_resolved", rule } : { basis: "extension", rule: null };
}

/** The manifest's own near-duplicate fingerprint (corpus/build_manifest.py norm_lines, ported): md5[:12] of every whitespace-normalised line of >= minLen characters. */
export function normLineSet(text, minLen = PARAMS.NEAR_DUP_MIN_LINE) {
  const out = new Set();
  for (const ln of String(text).split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/)) {
    const s = ln.split(/\s+/).filter(Boolean).join(" ");
    if ([...s].length >= minLen) out.add(md5(s).slice(0, 12));
  }
  return out;
}

/** One filter per (language, gold-basis) list: admit(sha, text) -> null when kept (and remembered), "exact" | "near" when skipped. */
export function makeNearDupFilter({ frac = PARAMS.NEAR_DUP_FRAC } = {}) {
  const shas = new Set();
  const lines = new Set();
  return {
    admit(sha, text) {
      if (sha && shas.has(sha)) return "exact";
      const nl = normLineSet(text);
      if (nl.size) {
        let hit = 0;
        for (const h of nl) if (lines.has(h)) hit++;
        if (hit / nl.size >= frac) return "near";
      }
      if (sha) shas.add(sha);
      for (const h of nl) lines.add(h);
      return null;
    },
  };
}

/**
 * Up to `limit` non-restricted files per candidate language, round-robin across repositories (repo name order, then sha256). `basis` keeps only that gold basis
 * ("extension" | "content_resolved"); `textOf(row)` (when given) turns on the exact + near de-duplication of A4-D: a skipped or unreadable file does not count toward `limit`.
 * -> { items: [{ lang, row }], stats: { lang: { available, repos, taken, exact_dups, near_dups, unreadable } } }
 */
export function samplePoolDetailed(manifest, languages, split, limit, { basis = null, textOf = null } = {}) {
  const items = [];
  const stats = {};
  for (const lang of languages) {
    let rows = (manifest.languages[lang]?.[split] ?? []).filter((r) => !r.restricted);
    if (basis) rows = rows.filter((r) => goldBasisOf(r).basis === basis);
    const byRepo = new Map();
    for (const r of rows) { if (!byRepo.has(r.repo)) byRepo.set(r.repo, []); byRepo.get(r.repo).push(r); }
    const queues = [...byRepo.keys()].sort().map((k) => byRepo.get(k).sort((a, b) => (a.sha256 < b.sha256 ? -1 : a.sha256 > b.sha256 ? 1 : a.path < b.path ? -1 : a.path > b.path ? 1 : 0)));
    const st = { available: rows.length, repos: queues.length, taken: 0, exact_dups: 0, near_dups: 0, unreadable: 0 };
    const filter = textOf ? makeNearDupFilter() : null;
    for (let round = 0; st.taken < limit; round++) {
      let any = false;
      for (const q of queues) {
        if (round < q.length && st.taken < limit) {
          any = true;
          const row = q[round];
          if (filter) {
            const text = textOf(row);
            if (text == null) { st.unreadable++; continue; }
            const why = filter.admit(row.sha256, text);
            if (why) { st[why === "exact" ? "exact_dups" : "near_dups"]++; continue; }
          }
          items.push({ lang, row });
          st.taken++;
        }
      }
      if (!any) break;
    }
    stats[lang] = st;
  }
  return { items, stats };
}

/** The items of samplePoolDetailed (v1's samplePool: no basis filter and no de-duplication unless asked). */
export const samplePool = (manifest, languages, split, limit, opts = {}) => samplePoolDetailed(manifest, languages, split, limit, opts).items;

/**
 * Selection-bias gap (A4-R): the manifest's refusal-only content filters deleted files before any scoring. The manifest records the counts corpus-wide (stats.dropped,
 * stats.ambiguity), NOT per split, and not at all for some filters: said so, never guessed.
 */
const REFUSAL_KEYS = [
  ["latex:no-tex-command", ["latex"]],
  ["v:no-module-refused", ["verilog"]],
  ["scheme:no-scheme-forms", ["scheme"]],
  ["pl:no-perl-syntax-refused", ["perl"]],
  ["perl:no-perl-syntax", ["perl"]],
  ["m:unresolved-refused", ["matlab", "objc"]],
  ["cl:no-lisp-form-refused", ["commonlisp"]],
  ["f:no-fortran-syntax-refused", ["fortran"]],
  ["scala:sc-not-scala", ["scala"]],
];
export function refusalFiltersByLanguage(manifest) {
  const d = manifest?.stats?.dropped ?? {};
  const a = manifest?.stats?.ambiguity ?? {};
  const by_language = {};
  const unrecorded = [];
  for (const [key, langs] of REFUSAL_KEYS) {
    if (d[key] == null && a[key] == null) { unrecorded.push(key); continue; }
    for (const lang of langs) {
      const rows = manifest.languages?.[lang];
      const kept = rows ? ["train", "dev", "test"].reduce((s, sp) => s + (rows[sp]?.length ?? 0), 0) : null;
      const e = by_language[lang] ?? { filters: {}, kept_files_all_splits: kept };
      e.filters[key] = { dropped: d[key] ?? null, ambiguity_count: a[key] ?? null };
      by_language[lang] = e;
    }
  }
  return { by_language, unrecorded_filters: unrecorded, resolved_to_other_language: d["resolved-to-other-language"] ?? null, scope: "corpus-wide, all splits, before the per-repository cap and de-duplication; the manifest does not record these per split" };
}

function scoreFile({ named, blind }, text) {
  const n = named.trace(text, { modes: ["sum", "z"] });
  const b = blind ? blind.trace(text, { modes: ["sum", "z"] }) : null;
  return {
    A: Array.from(n.state.A),
    B: Array.from(n.state.B),
    transitions: n.transitionsByMode.sum, // v1, exactly as registered
    tz: n.transitionsByMode.z, // A1 arms below
    Bb: b ? Array.from(b.state.B) : null,
    tbs: b ? b.transitionsByMode.sum : null,
    tbz: b ? b.transitionsByMode.z : null,
    nLines: n.nLines,
    nonblank: n.state.evidence,
    margin: n.final && Number.isFinite(n.final.margin) ? n.final.margin : null,
  };
}

const fileSha = (f) => { try { return sha256(fs.readFileSync(f)); } catch { return null; } };
const urlPath = (u) => (u instanceof URL ? fileURLToPath(u) : u);
export const BLIND_PRIOR_FILE = new URL("../../priors/code-identify-blind.json", import.meta.url);
const textOfRow = (row) => { try { return fs.readFileSync(row.path, "utf8"); } catch { return null; } };

/**
 * Score the pool (cached on disk by priors + code + sampling rule + split + limit). Two lists, scored identically (A4-G):
 *   records  = the GATING pool: extension-labelled files, de-duplicated (A4-D);
 *   resolved = the content-resolved NON-GATING stratum (gold derived from a content rule: gold_circular).
 * returns { records, resolved, ineligible, unreadable, sampled, sampled_resolved, dedup, key, cached }
 */
export function scorePool({ prior, manifest, split, limit, identifiers, useCache = true, textOf = textOfRow, cacheDir = CACHE_DIR }) {
  const languages = prior.languages.map((l) => l.id);
  const key = sha256(JSON.stringify({ v: IDENTIFY_VERSION, a1: 1, sampling: "A4", nd: [PARAMS.NEAR_DUP_FRAC, PARAMS.NEAR_DUP_MIN_LINE], prior: fileSha(urlPath(IDENTIFY_PRIOR_FILE)), blind: fileSha(urlPath(BLIND_PRIOR_FILE)), code: fileSha(fileURLToPath(new URL("../../adapters/code/identify.js", import.meta.url))), split, limit, min: PARAMS.MIN_NONBLANK, manifest: manifest.generated_at })).slice(0, 12);
  const cacheFile = path.join(cacheDir, `pool-${split}-${limit}-${key}.json`);
  if (useCache && fs.existsSync(cacheFile)) { const c = readJson(cacheFile); if (c?.key === key) return { ...c, cached: true }; }
  const out = { key, split, limit, records: [], resolved: [], ineligible: [], unreadable: [], sampled: 0, sampled_resolved: 0, dedup: {} };
  for (const basis of ["extension", "content_resolved"]) {
    const { items, stats } = samplePoolDetailed(manifest, languages, split, limit, { basis, textOf });
    out.dedup[basis] = stats;
    const into = basis === "extension" ? out.records : out.resolved;
    if (basis === "extension") out.sampled = items.length; else out.sampled_resolved = items.length;
    for (const { lang, row } of items) {
      const text = textOf(row);
      if (text == null) { out.unreadable.push({ lang, path: row.path, basis }); continue; }
      const s = scoreFile(identifiers, text);
      const rec = { truth: languages.indexOf(lang), lang, path: row.path, rel: row.rel, repo: row.repo, sha256: row.sha256, bytes: row.bytes, basis, resolution: row.resolution ?? null, ...s };
      if (s.nonblank < PARAMS.MIN_NONBLANK) out.ineligible.push({ lang, path: row.path, nonblank: s.nonblank, basis }); else into.push(rec);
    }
  }
  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = `${cacheFile}.${process.pid}.tmp`; // atomic: a parallel run never reads a half-written cache
  fs.writeFileSync(tmp, JSON.stringify(out));
  fs.renameSync(tmp, cacheFile);
  return { ...out, cached: false };
}

/**
 * L3 causality check. For a sample of eligible files, replace the tail after line k = floor(n/2) with the head of a file of
 * ANOTHER language; the real arm's leaders at lines <= k must be identical, to the original AND to a run on the truncated text.
 * The lookahead arm (decision at every prefix = whole-file leader) is the cheat the check must be able to catch.
 * `configs` = [{ name, identifier, mode }]; the first one fills the v1 fields, every one is reported in byConfig.
 */
export function causalityCheck({ identifier = null, configs = null, records, sample = PARAMS.CAUSALITY_SAMPLE }) {
  const cfgs = configs ?? [{ name: "v1_sum", identifier, mode: "sum" }];
  const pick = [];
  const step = Math.max(1, Math.floor(records.length / sample));
  for (let i = 0; i < records.length && pick.length < sample; i += step) pick.push(records[i]);
  const acc = Object.fromEntries(cfgs.map((c) => [c.name, { identicalOrig: 0, identicalTrunc: 0, lookaheadChanged: 0, tested: 0, tailLanguageFlips: 0 }]));
  const textOf = (r) => { try { return fs.readFileSync(r.path, "utf8"); } catch { return null; } };
  for (let i = 0; i < pick.length; i++) {
    const r = pick[i];
    const donor = pick.slice(i + 1).concat(pick.slice(0, i)).find((x) => x.truth !== r.truth);
    const text = textOf(r);
    const dtext = donor ? textOf(donor) : null;
    if (text == null || dtext == null) continue;
    const lines = splitLines(text);
    const k = Math.floor(lines.length / 2);
    if (k < 1) continue;
    const tail = splitLines(dtext).slice(0, lines.length - k);
    const corrupted = lines.slice(0, k).concat(tail).join("\n");
    const truncated = lines.slice(0, k).join("\n");
    const upTo = (tr) => tr.filter(([line]) => line <= k);
    for (const c of cfgs) {
      const o = c.identifier.trace(text, { modes: [c.mode] }), cc = c.identifier.trace(corrupted, { modes: [c.mode] }), t = c.identifier.trace(truncated, { modes: [c.mode] });
      const a = acc[c.name];
      a.tested++;
      if (JSON.stringify(upTo(o.transitions)) === JSON.stringify(upTo(cc.transitions))) a.identicalOrig++;
      if (JSON.stringify(upTo(o.transitions)) === JSON.stringify(upTo(t.transitions))) a.identicalTrunc++;
      // lookahead arm: its decision at prefix k is the whole-file leader, which the corrupted tail can change
      if (finalLeader(o.transitions) !== finalLeader(cc.transitions)) a.lookaheadChanged++;
      if (finalLeader(cc.transitions) === donor.truth) a.tailLanguageFlips++;
    }
  }
  const sum = (a) => ({
    tested: a.tested,
    real_identical_under_corruption: a.tested ? a.identicalOrig / a.tested : null,
    real_identical_under_truncation: a.tested ? a.identicalTrunc / a.tested : null,
    lookahead_decision_changed: a.tested ? a.lookaheadChanged / a.tested : null,
    tail_language_took_over: a.tested ? a.tailLanguageFlips / a.tested : null,
    ok: a.tested > 0 && a.identicalOrig === a.tested && a.identicalTrunc === a.tested,
  });
  const byConfig = Object.fromEntries(cfgs.map((c) => [c.name, sum(acc[c.name])]));
  return { ...byConfig[cfgs[0].name], byConfig };
}

/** L4 (amendment A3): repository / sha256 overlap between the pool and everything the prior was counted on. Pure. */
export function splitAudit({ trainRepos, trainShas, poolRepos, poolShas }) {
  const repoOverlap = [...poolRepos].filter((r) => trainRepos.has(r));
  const shaOverlap = [...poolShas].filter((h) => trainShas.has(h));
  return { repo_overlap_n: repoOverlap.length, repo_overlap: repoOverlap.slice(0, 10), sha_overlap_n: shaOverlap.length, ok: repoOverlap.length === 0 && shaOverlap.length === 0, pool_repos: poolRepos.size, pool_files: poolShas.size, train_repos: trainRepos.size, train_shas: trainShas.size };
}

// ── arms (A1) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const ARM_NAMES = Object.freeze(["named_sum", "named_z", "blind_sum", "blind_z"]);

/** One combined arm: its trajectory key, its shape-vector key, its mode, and the closures armCore() needs (real, derange = keyword channel to the wrong languages, ablate = keyword channel removed). */
export function armSpec(name, { K, active }) {
  if (!ARM_NAMES.includes(name)) throw new TypeError(`unknown arm ${name}`);
  const mode = name.endsWith("_z") ? "z" : "sum";
  const blindArm = name.startsWith("blind");
  const Bk = blindArm ? "Bb" : "B";
  const tKey = { named_sum: "transitions", named_z: "tz", blind_sum: "tbs", blind_z: "tbz" }[name];
  const zeros = new Array(K).fill(0);
  return {
    name,
    mode,
    Bk,
    tKey,
    blind: blindArm,
    causalityName: name === "named_sum" ? "v1_sum" : name,
    ablationChannel: blindArm ? "blind shape B' alone" : "shape B alone",
    real: (r) => finalLeader(r[tKey]),
    derange: (r, perm) => argmaxCombined(r.A, r[Bk], { perm, active, mode }),
    ablate: (r) => argmaxCombined(zeros, r[Bk], { active }),
    trans: (r) => r[tKey],
  };
}
/** records seen through one arm: `transitions` and `B` are the arm's own (analyse() reads those two). */
const projectRecords = (records, spec) => records.map((r) => ({ ...r, transitions: r[spec.tKey], B: r[spec.Bk] }));

/** What a manifest resolution rule is: a content regex, a vote of the repository's other files, or a bare default (no evidence at all). */
export const resolutionKind = (rule) => (/default/.test(rule) ? "default_no_evidence" : /repo-dominant/.test(rule) ? "repo_vote" : rule === "(none)" ? "none" : "content_regex");

/** The content-resolved NON-GATING stratum (A4-G), per language and per resolution rule: accuracy of the arm's real prediction. Pure. */
export function resolvedStratum(records, { real, languages, slice = null }) {
  const ok = records.map((r) => real(r) === r.truth);
  const acc = (ix) => (ix.length ? ix.filter((i) => ok[i]).length / ix.length : null);
  const all = records.map((_, i) => i);
  const by_language = {};
  for (const L of [...new Set(records.map((r) => r.truth))].sort((a, b) => a - b)) {
    const ix = all.filter((i) => records[i].truth === L);
    const rules = {};
    for (const rule of [...new Set(ix.map((i) => records[i].resolution ?? "(none)"))].sort()) {
      const rx = ix.filter((i) => (records[i].resolution ?? "(none)") === rule);
      rules[rule] = { n: rx.length, accuracy: acc(rx), kind: resolutionKind(rule) };
    }
    by_language[languages[L]] = { n: ix.length, n_repos: new Set(ix.map((i) => repoOf(records[i]))).size, accuracy: acc(ix), rules };
  }
  return {
    non_gating: true,
    gap: "gold_circular: label derived from content rule",
    note: "the identifier's TRAIN rows were labelled by the same rules; this stratum measures, in part, rediscovery of the manifest's own regex, and gates nothing",
    pool: { n: records.length, accuracy: acc(all) },
    by_language,
    slice: slice != null ? by_language[languages[slice]] ?? { n: 0, n_repos: 0, accuracy: null, rules: {} } : null,
  };
}

// ── TEST discipline (amendment A6): one frozen arm, a lock, a per-language single read ───────────────────────────────────────
export const LOCK_FILE = "c0-final.lock";
export const READS_FILE = "c0-test-reads.jsonl";
const readJsonl = (f) => {
  try { return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); } catch { return []; }
};

/** Everything the TEST answer depends on besides the TEST files: frozen in the lock, compared on every later TEST call. Flat, so a diff names the field. */
export function testFingerprint({ arm, limit, manifestStamp = null } = {}) {
  const fp = {
    arm,
    limit,
    identify_version: IDENTIFY_VERSION,
    manifest_generated_at: manifestStamp,
    prior_sha256: fileSha(urlPath(IDENTIFY_PRIOR_FILE)),
    blind_prior_sha256: fileSha(urlPath(BLIND_PRIOR_FILE)),
    identify_js_sha256: fileSha(fileURLToPath(new URL("../../adapters/code/identify.js", import.meta.url))),
    c0_identify_sha256: fileSha(THIS_FILE),
    prereg_sha256: headerDigest(THIS_FILE),
  };
  for (const t of ["A1", "A2", "A3", "A4", "A5", "A6", "A7"]) fp[`amendment_${t}_sha256`] = amendmentDigest(t);
  return fp;
}
export const fingerprintDiff = (a, b) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter((k) => JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])).sort();

/**
 * testGate({ language, arm, fingerprint, outDir, freezeOnly }) -> { ok, reason?, created, lock }. In order: the arm must be one of ARM_NAMES; the lock
 * is created exclusively if absent (BEFORE any TEST file is opened) and otherwise compared field by field with `fingerprint`; a language with ANY read-log entry
 * (this log, or run.mjs's test-reads.jsonl naming c0 among its rungs) is refused; otherwise a "started" entry is appended and the read may proceed.
 */
export function testGate({ language, arm, fingerprint, outDir = OUT_DIR, now = () => new Date().toISOString(), freezeOnly = false }) {
  if (!ARM_NAMES.includes(arm)) return { ok: false, reason: `refused: TEST needs ONE frozen arm (${ARM_NAMES.join("|")}), got ${arm == null ? "none" : arm}; the arm may not be chosen after TEST was seen (amendment A6)` };
  fs.mkdirSync(outDir, { recursive: true });
  const lockFile = path.join(outDir, LOCK_FILE);
  let lock = readJson(lockFile);
  let created = false;
  if (!lock) {
    const fresh = { schema: "C0FinalLock@1", frozen_at: now(), fingerprint, note: "TEST is read for this one arm and this one instrument/reader; never rewritten by c0-identify.mjs (amendment A6)" };
    try {
      fs.writeFileSync(lockFile, `${JSON.stringify(fresh, null, 2)}\n`, { flag: "wx" });
      created = true;
      lock = fresh;
    } catch (e) {
      if (e.code !== "EEXIST") return { ok: false, reason: `refused: cannot create the freeze lock ${lockFile}: ${e.message}` };
      lock = readJson(lockFile);
    }
    if (!lock) return { ok: false, reason: `refused: the freeze lock ${lockFile} is unreadable` };
  }
  const diff = fingerprintDiff(lock.fingerprint, fingerprint);
  if (diff.length) return { ok: false, created, lock_fields_differing: diff, reason: `refused: TEST is frozen (${lockFile}, ${lock.frozen_at}) and the fingerprint differs in [${diff.join(", ")}]: another arm, a rebuilt prior, an edited reader, instrument or amendment re-reading TEST is tuning on held-out data (amendment A6)` };
  if (freezeOnly) return { ok: true, created, lock, freeze_only: true };
  const readsFile = path.join(outDir, READS_FILE);
  const earlier = readJsonl(readsFile).filter((r) => r.language === language);
  const viaRun = readJsonl(path.join(outDir, "test-reads.jsonl")).filter((r) => r.language === language && Array.isArray(r.rungs) && r.rungs.some((x) => /^c?r?0$/i.test(String(x))));
  if (earlier.length || viaRun.length) {
    const at = (earlier[0] ?? viaRun[0])?.at ?? "an earlier time";
    return { ok: false, created, reason: `refused: TEST was already read for ${language} (${earlier.length ? READS_FILE : "test-reads.jsonl"}, ${at}); a held-out set is read once` };
  }
  fs.appendFileSync(readsFile, `${JSON.stringify({ language, arm, phase: "started", at: now(), lock_sha256: sha256(fs.readFileSync(lockFile)) })}\n`);
  return { ok: true, created, lock };
}
const recordTestCompleted = (outDir, entry) => { try { fs.appendFileSync(path.join(outDir, READS_FILE), `${JSON.stringify({ ...entry, phase: "completed", at: new Date().toISOString() })}\n`); } catch { /* the "started" entry already spends the read */ } };

// ── measure ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const gapResult = (base, reason, extra = {}) => ({ ...base, pass: null, gaps: [{ reason, count: 1 }], notes: [reason], ...extra });
const passWord = (p) => (p === true ? "pass" : p === false ? "FAIL" : "null (typed gap)");

/** `manifest`, `cacheDir`, `outDir` and `env` are injectable so the TEST branch can be exercised end to end on an AUTHORED toy manifest without ever opening a real TEST file. */
export async function measure({ language, split = "dev", limit = null, useCache = true, arm = null, outDir = OUT_DIR, env = process.env, manifest: injected = null, cacheDir = CACHE_DIR } = {}) {
  const lim = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : PARAMS.LIMIT;
  const base = { id: "C0-identify", rung: RUNG.id, language, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: { language, limit: lim, prereg_sha256: headerDigest(THIS_FILE), identify_version: IDENTIFY_VERSION } };
  if (split === "test" && env.C0_FINAL !== "1") return gapResult(base, "test split is guarded: the final card reads TEST once, with C0_FINAL=1 and ONE frozen --arm (never in development)");
  if (split !== "dev" && split !== "test" && split !== "train") return gapResult(base, `unknown split ${split}`);
  if (split === "test" && limit != null) return gapResult(base, "refused: --limit is a DEV smoke-test device; a limited TEST read would spend the held-out set on a sample (rule 9)");
  const armName = split === "test" ? arm ?? env.C0_ARM ?? null : arm ?? "named_sum";
  if (!ARM_NAMES.includes(armName)) return gapResult(base, split === "test" ? "refused: TEST is read for ONE frozen arm named in advance (--arm named_sum|named_z|blind_sum|blind_z, or C0_ARM); the arm may not be chosen after TEST was seen (amendment A6)" : `unknown arm ${armName} (one of ${ARM_NAMES.join(", ")})`);
  base.details.arm = armName;
  const prior = loadIdentifyPrior();
  if (!prior) return gapResult(base, "unmeasured: priors/code-identify.json is absent (build it: node eval/coding-competence/c0-build-prior.mjs)");
  const manifest = injected ?? readJson(MANIFEST_FILE);
  if (!manifest) return gapResult(base, `unmeasured: corpus manifest missing (${MANIFEST_FILE})`);
  const languages = prior.languages.map((l) => l.id);
  const slice = languages.indexOf(language);
  if (slice < 0) return gapResult(base, `language ${language} is not in the identifier's candidate set (no received prior: typed gap)`);
  const identifier = createIdentifier(prior);
  const shapePrior = loadIdentifyShapePrior(BLIND_PRIOR_FILE);
  let blind = null;
  try { blind = shapePrior ? createIdentifier(prior, { shapePrior }) : null; } catch { blind = null; }
  const active = prior.languages.map((l) => (l.nFiles > 0 ? 1 : 0));
  const K = languages.length;
  const spec = armSpec(armName, { K, active });
  if (spec.blind && !blind) return gapResult(base, "unmeasured: this arm needs priors/code-identify-blind.json (build it: node eval/coding-competence/c0-build-prior.mjs --variant blind)");
  if (split === "test") {
    const gate = testGate({ language, arm: armName, fingerprint: testFingerprint({ arm: armName, limit: lim, manifestStamp: manifest.generated_at }), outDir });
    if (!gate.ok) return gapResult(base, gate.reason, { details: { ...base.details, test_gate: gate } });
    base.details.test_gate = { ok: true, arm: armName, lock_file: path.join(outDir, LOCK_FILE), lock_created_by_this_call: !!gate.created, frozen_at: gate.lock.frozen_at };
  }
  const { records, resolved, ineligible, unreadable, sampled, sampled_resolved, dedup, cached, key } = scorePool({ prior, manifest, split, limit: lim, identifiers: { named: identifier, blind }, useCache, cacheDir });
  if (spec.blind && !records.every((r) => r.Bb)) return gapResult(base, "unmeasured: the cached pool lacks the blind shape scores");
  const sigma0 = derangement(K, mulberry32(PARAMS.SIGMA0_SEED));
  const drawPerms = PARAMS.DRAW_SEEDS.map((s) => derangement(K, mulberry32(s)));
  const analysis = analyse(projectRecords(records, spec), { K, languages, active, slice, sigma0, drawPerms, mode: spec.mode });
  // the content-resolved stratum is scored apart and gates nothing (A4-G); it replaces the strata of v1
  const stratum = resolvedStratum(resolved, { real: spec.real, languages, slice });
  analysis.pool.strata = { ambiguousResolution: { n: stratum.pool.n, accuracy: stratum.pool.accuracy }, other: { n: analysis.pool.n, accuracy: analysis.pool.accuracy.real } };
  const order = split === "test" ? [spec] : [spec, ...ARM_NAMES.filter((n) => n !== armName).map((n) => armSpec(n, { K, active })).filter((s) => !s.blind || blind)];
  const causality = causalityCheck({ configs: order.map((s) => ({ name: s.causalityName, identifier: s.blind ? blind : identifier, mode: s.mode })), records });
  const poolAll = [...records, ...resolved];
  const audit = splitAudit({
    trainRepos: new Set(prior.languages.flatMap((l) => l.repos ?? [])),
    trainShas: new Set(languages.flatMap((L) => (manifest.languages[L]?.train ?? []).map((r) => r.sha256))),
    poolRepos: new Set(poolAll.map((r) => r.repo)),
    poolShas: new Set(poolAll.map((r) => r.sha256).filter(Boolean)),
  });
  const rowsOfLang = (manifest.languages[language]?.[split] ?? []).filter((r) => !r.restricted);
  const goldPerLanguage = Object.fromEntries(languages.map((L) => {
    const rows = (manifest.languages?.[L]?.[split] ?? []).filter((r) => !r.restricted);
    const e = rows.filter((r) => goldBasisOf(r).basis === "extension").length;
    const c = rows.length - e;
    return [L, { extension_rows: e, content_resolved_rows: c, gold_basis: rows.length === 0 ? "no_rows" : c === 0 ? "extension_only" : e === 0 ? "content_resolved_only" : "mixed" }];
  }));
  const gold = { content_resolved_n: rowsOfLang.filter((r) => goldBasisOf(r).basis === "content_resolved").length, extension_rows: rowsOfLang.filter((r) => goldBasisOf(r).basis === "extension").length };
  const dec = decide({ analysis, causalityIdentical: causality.byConfig?.[spec.causalityName]?.ok ?? false, splitClean: audit.ok, gold });
  const { pool, slice: sl } = analysis;
  const sMax = pool.majority?.share ?? null;
  const kwGap = prior.languages.filter((l) => l.status === "gap").map((l) => l.id);
  const kwWeak = prior.languages.filter((l) => l.status === "uninformative").map((l) => l.id);
  const inelGate = ineligible.filter((x) => x.basis === "extension");
  const shortSlice = inelGate.filter((x) => x.lang === language).length;
  const refusal = refusalFiltersByLanguage(manifest);
  const dd = dedup.extension ?? {};
  const ddTot = Object.values(dd).reduce((s, x) => ({ taken: s.taken + x.taken, exact: s.exact + x.exact_dups, near: s.near + x.near_dups, unreadable: s.unreadable + x.unreadable }), { taken: 0, exact: 0, near: 0, unreadable: 0 });
  const dedupSummary = { total: { ...ddTot, skipped_share: ddTot.taken + ddTot.exact + ddTot.near ? (ddTot.exact + ddTot.near) / (ddTot.taken + ddTot.exact + ddTot.near) : null }, slice: dd[language] ?? null, rule: `exact sha256, or >= ${PARAMS.NEAR_DUP_FRAC} of the whitespace-normalised lines of >= ${PARAMS.NEAR_DUP_MIN_LINE} chars already seen in the kept files of the same language (the manifest's own NEAR_DUP rule)` };
  const resolvedLangs = Object.keys(stratum.by_language);
  const res = {
    ...base,
    n: sl.n,
    score: sl.accuracy,
    control: sMax, // claim 1's control is the majority baseline; the deranged control and the ablation belong to claim 2 (amendment A5)
    margin: sl.accuracy == null || sMax == null ? null : sl.accuracy - sMax,
    pass: dec.pass, // claim 1, identification competence, only
    claims: dec.claims,
    // arms comparable to the slice accuracy (the aggregator flags any listed value >= score as informational); p-values live in details
    controls: {
      majority: sMax,
      deranged_sigma0: sl.arms.deranged_sigma0,
      shape_only: sl.arms.shape_only,
      keyword_only: sl.arms.keyword_only,
    },
    licence: dec.licence ? { ok: dec.licence.L3_causality && dec.licence.L4_split_clean, ...dec.licence } : undefined,
    gaps: [
      ...(inelGate.length ? [{ reason: `ineligible: fewer than ${PARAMS.MIN_NONBLANK} non-blank lines (excluded from every denominator)`, count: inelGate.length, in_slice: shortSlice }] : []),
      ...(unreadable.length ? [{ reason: "unreadable file", count: unreadable.length }] : []),
      ...(resolved.length || gold.content_resolved_n ? [{ reason: "gold_circular: label derived from content rule (content-resolved files are scored in a non-gating stratum, never in the pass rule)", count: resolved.length, in_slice: stratum.slice?.n ?? 0, languages: resolvedLangs }] : []),
      ...(sl.n_repos < PARAMS.MIN_REPOS ? [{ reason: `repo-underpowered: ${sl.n_repos} repositories < ${PARAMS.MIN_REPOS} in this language's extension-labelled slice (no repository-level test can reach alpha ${PARAMS.ALPHA})`, count: sl.n_repos }] : []),
      ...(Object.keys(refusal.by_language).length ? [{ reason: "selection_bias: the manifest's refusal filters deleted hard cases before any scoring (corpus-wide counts; not recorded per split)", count: Object.values(refusal.by_language).reduce((s, e) => s + Object.values(e.filters).reduce((t, f) => t + (f.dropped ?? 0), 0), 0), languages: Object.keys(refusal.by_language), in_slice: refusal.by_language[language] ? Object.values(refusal.by_language[language].filters).reduce((t, f) => t + (f.dropped ?? 0), 0) : 0 }] : []),
      ...(kwGap.length ? [{ reason: "no received keyword giver: keyword channel absent, identified by shape alone", count: kwGap.length, languages: kwGap }] : []),
      ...(kwWeak.length ? [{ reason: "received keyword set does not separate on TRAIN (a <= b): channel zeroed", count: kwWeak.length, languages: kwWeak }] : []),
    ],
    notes: [
      `claim 1, identification competence (arm ${armName}): ${passWord(dec.claims.identification.pass)}${dec.claims.identification.reasons.length ? ` — ${dec.claims.identification.reasons.join("; ")}` : ""}`,
      `claim 2, received-prior contribution (arm ${armName}): ${passWord(dec.claims.received_prior.pass)}${dec.claims.received_prior.reasons.length ? ` — ${dec.claims.received_prior.reasons.join("; ")}` : ""}`,
      ...(spec.blind ? [] : ["claim 2 on a named arm is a conservative marginal test: its ablation (shape B) still names the received words (A1 H1 leak); the blind arms are the clean control"]),
    ],
    details: {
      ...base.details,
      candidates: K,
      pool_files: { sampled, eligible: records.length, ineligible: inelGate.length, sampled_content_resolved: sampled_resolved, eligible_content_resolved: resolved.length, cached, cache_key: key, pool_repos: pool.n_repos, slice_repos: sl.n_repos },
      gold_basis: { gating: "extension-labelled files only (A4-G)", per_language: goldPerLanguage, slice: { extension_rows: gold.extension_rows, content_resolved_rows: gold.content_resolved_n, scored_gating: sl.n, scored_content_resolved: stratum.slice?.n ?? 0 } },
      content_resolved_stratum: stratum,
      dedup: dedupSummary,
      selection_bias: refusal,
      slice: sl,
      pool,
      tests_numbers: {
        // repository-level (gating) and file-level (report-only, files as independent units) side by side, with n_repos
        n_repos_slice: sl.n_repos,
        n_repos_pool: pool.n_repos,
        repo_sign_slice_vs_majority: sl.repo.vsMajority ? { p: sl.repo.vsMajority.p, wins: sl.repo.vsMajority.wins, losses: sl.repo.vsMajority.losses, n_repos: sl.repo.vsMajority.n_repos } : null,
        repo_sign_slice_vs_sigma0: { p: sl.repo.vsSigma0.p, wins: sl.repo.vsSigma0.wins, losses: sl.repo.vsSigma0.losses, n_repos: sl.repo.vsSigma0.n_repos },
        repo_sign_slice_vs_ablation: sl.repo.vsAblation ? { p: sl.repo.vsAblation.p, wins: sl.repo.vsAblation.wins, losses: sl.repo.vsAblation.losses, n_repos: sl.repo.vsAblation.n_repos } : null,
        repo_sign_pool_vs_sigma0: { p: pool.repo.vsSigma0.p, wins: pool.repo.vsSigma0.wins, losses: pool.repo.vsSigma0.losses, n_repos: pool.repo.vsSigma0.n_repos },
        repo_sign_pool_vs_ablation: pool.repo.vsAblation ? { p: pool.repo.vsAblation.p, wins: pool.repo.vsAblation.wins, losses: pool.repo.vsAblation.losses, n_repos: pool.repo.vsAblation.n_repos } : null,
        deranged_draws_at_least_real: pool.draws.atLeastReal,
        deranged_draws_n: pool.draws.n,
        files_as_units_report_only: {
          sign_p_slice_vs_sigma0: sl.signVsSigma0.p,
          sign_p_pool_vs_sigma0: pool.signVsSigma0.p,
          permutation_p_pool: pool.draws.permutationP,
          binom_p_slice_vs_majority: sl.binomVsMajority?.p ?? null,
        },
        deranged_draws_mean_pool: pool.draws.mean,
        deranged_draws_max_pool: pool.draws.max,
        real_pool: pool.accuracy.real,
        lookahead_lucs_by_construction: 1,
      },
      tests: dec.tests,
      causality,
      split_audit: audit,
      prereg_amendment_a3_sha256: amendmentDigest("A3"),
      prereg_amendment_a4_sha256: amendmentDigest("A4"),
      prereg_amendment_a5_sha256: amendmentDigest("A5"),
      prereg_amendment_a6_sha256: amendmentDigest("A6"),
      prereg_amendment_a7_sha256: amendmentDigest("A7"),
      keyword_status: Object.fromEntries(prior.languages.map((l) => [l.id, l.status])),
      keyword_status_slice: prior.languages[slice].status,
      keyword_source_slice: prior.languages[slice].keywordSource,
      prediction_checks: predictionChecks({ analysis, causality, languages }),
      prereg_amendment_a1_sha256: amendmentDigest("A1"),
      prereg_amendment_a2_sha256: amendmentDigest("A2"),
      amendment_A1:
        split === "test"
          ? { withheld: "TEST is read for ONE frozen arm (amendment A6): no other arm, no A1/A2 ablation table and no recommendation are computed on TEST" }
          : blind && records.every((r) => r.Bb)
            ? amendmentA1({ records, K, languages, active, slice, sigma0, drawPerms, majShare: sMax, causality, splitClean: audit.ok, gold })
            : { gap: "unmeasured: priors/code-identify-blind.json is absent (build it: node eval/coding-competence/c0-build-prior.mjs --variant blind)" },
    },
  };
  const a1 = res.details.amendment_A1;
  res.details.predictions_A4_A5 = predictionsA4A5({ armName, analysis, dec, stratum, dedupSummary, sl, pool, a1 });
  if (a1 && a1.arms) {
    const r = a1.recommendation;
    res.notes.push(`A1/A2/A5 (reported only, see details.amendment_A1): arms for which BOTH claims hold on this language: [${r.meets.join(", ")}]; identification only: [${r.meets_identification.join(", ")}]; received-prior only: [${r.meets_received_prior.join(", ")}]; underpowered (null): [${r.underpowered.join(", ")}]. Pool: shape-only ${pool.accuracy.shape_only.toFixed(3)}, ${armName} ${pool.accuracy.real.toFixed(3)}, deranged sigma0 ${pool.accuracy.deranged_sigma0.toFixed(3)}.`);
  }
  if (prior.languages[slice].status !== "ok") res.notes.push(`this language's keyword channel is ${prior.languages[slice].status}: identified by shape alone`);
  if (split === "test") {
    res.details.test_read = { completed: true, arm: armName, card_sha256: sha256(JSON.stringify({ ...res, details: { ...res.details, test_read: undefined } })) };
    recordTestCompleted(outDir, { language, arm: armName, card_sha256: res.details.test_read.card_sha256 });
  }
  return res;
}

/** The A4/A5 PREDICTIONS evaluated where the data allow (reported, never gating). */
export function predictionsA4A5({ armName, analysis, dec, stratum, dedupSummary, sl, pool, a1 }) {
  const named = armName === "named_sum";
  const matlab = stratum.by_language?.matlab ?? null;
  return {
    "A4-1_pass_null_repo_underpowered": dec.pass === null && sl.n_repos < PARAMS.MIN_REPOS,
    "A4-2_pool_within_0_05_of_dev_run_1_(.892)": named ? Math.abs(pool.accuracy.real - 0.892) <= 0.05 : null,
    "A4-3_resolved_stratum_ge_gating_pool_and_matlab_ge_0_90": stratum.pool.accuracy != null ? { stratum: stratum.pool.accuracy, gating: pool.accuracy.real, matlab: matlab ? matlab.accuracy : null, met: stratum.pool.accuracy >= pool.accuracy.real && (matlab ? matlab.accuracy >= 0.9 : null) } : null,
    "A4-4_dedup_skips_1_to_8_percent": dedupSummary.total.skipped_share != null ? { share: dedupSummary.total.skipped_share, met: dedupSummary.total.skipped_share >= 0.01 && dedupSummary.total.skipped_share <= 0.08 } : null,
    "A4-5_pool_has_ge_100_repositories": pool.n_repos >= 100,
    "A5-1_claim2_false_v1": named ? dec.claims.received_prior.pass === false : null,
    "A5-2_claim1_null_not_true": dec.claims.identification.pass === null ? true : dec.claims.identification.pass === true ? false : null,
    "A5-3_no_arm_recommended": a1 && a1.recommendation ? a1.recommendation.meets.length === 0 : null,
    "A5-4_L2_strict_fails_v1": named ? pool.draws.atLeastReal >= 1 : null,
  };
}

/** sha256 of an amendment block (between its own markers), so a later edit of the pre-registered text is visible. */
export function amendmentDigest(tag = "A1", file = THIS_FILE) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const a = lines.findIndex((l) => l.startsWith(`// ═══ AMENDMENT ${tag} `));
  const b = lines.findIndex((l) => l.startsWith(`// ═══ END AMENDMENT ${tag} `));
  return a >= 0 && b > a ? sha256(lines.slice(a, b + 1).join("\n").trim()) : null;
}

/**
 * AMENDMENTS A1 + A2 + A5 (reported only on DEV; withheld on TEST): the same gating pool, four combined arms and a blind-shape ablation, each with its own deranged
 * control, 50 draws, ablation (keyword channel removed) and BOTH typed claims (identification competence, received-prior contribution) decided by the same rule as the card.
 * Pure given the records. An arm is recommended only if BOTH claims are true (A5-C4).
 */
export function amendmentA1({ records, K, languages, active, slice, sigma0, drawPerms, majShare, causality, splitClean = true, gold = null }) {
  const out = { arms: {}, consistency: {} };
  const zeros = new Array(K).fill(0);
  for (const name of ARM_NAMES) {
    const spec = armSpec(name, { K, active });
    const core = armCore(records, { slice, sigma0, drawPerms, real: spec.real, derange: spec.derange, ablate: spec.ablate, majShare, transitionsOf: spec.trans });
    const cz = causality.byConfig?.[spec.causalityName];
    const dec = decide({ analysis: core, causalityIdentical: cz ? cz.ok : false, splitClean, gold });
    const abl = core.pool.repo.vsAblation;
    const pr = core.pool.accuracy;
    out.arms[name] = {
      pool: core.pool,
      slice: core.slice,
      decision: { pass: dec.pass, reasons: dec.reasons, licence: dec.licence },
      claims: dec.claims,
      causality_ok: cz ? cz.ok : null,
      // A2 (+ A4-S): the arm against its own ablation. `adds` is now the REPOSITORY-level test over the pool's repositories (the file-level sign test is report-only).
      ablation: {
        channel: spec.ablationChannel,
        pool: { real: pr.real, ablation: pr.ablation, difference: pr.real - pr.ablation, sign_files_report_only: core.pool.signVsAblation, repo: abl },
        slice: { real: core.slice.accuracy, ablation: core.slice.arms.ablation, difference: core.slice.accuracy == null ? null : core.slice.accuracy - core.slice.arms.ablation, sign_files_report_only: core.slice.signVsAblation, repo: core.slice.repo.vsAblation },
        adds: abl.p < PARAMS.ALPHA && pr.real > pr.ablation,
      },
    };
    // integrity: the stored final vectors must reproduce the trajectory's final leader
    out.consistency[name] = { mismatches: records.filter((r) => argmaxCombined(r.A, r[spec.Bk], { active, mode: spec.mode }) !== spec.real(r)).length, of: records.length };
  }
  const shapeBlind = records.map((r) => argmaxCombined(zeros, r.Bb, { active }) === r.truth);
  const idxs = records.map((r, i) => (r.truth === slice ? i : -1)).filter((i) => i >= 0);
  out.blind_shape_only = { pool: shapeBlind.filter(Boolean).length / records.length, slice: idxs.length ? idxs.filter((i) => shapeBlind[i]).length / idxs.length : null };
  const P = (n) => out.arms[n].pool;
  const namedShape = out.arms.named_sum.pool.accuracy.ablation; // = the v1 shape-only arm
  out.predictions = {
    "A1-1_blind_shape_only_le_named_shape_only_minus_0_03": out.blind_shape_only.pool <= namedShape - 0.03,
    "A1-2_blind_sum_does_not_beat_its_draws": P("blind_sum").draws.permutationP > PARAMS.ALPHA,
    "A1-3_blind_z_beats_its_draws_and_blind_shape_plus_0_03": P("blind_z").draws.permutationP <= PARAMS.ALPHA && P("blind_z").accuracy.real >= out.blind_shape_only.pool + 0.03,
    "A1-4_named_z_does_not_beat_its_draws": P("named_z").draws.permutationP > PARAMS.ALPHA,
    "A1-5_blind_z_pool_accuracy_ge_0_80": P("blind_z").accuracy.real >= 0.8,
  };
  out.predictions_A2 = {
    "A2-1_named_sum_does_not_add": !out.arms.named_sum.ablation.adds,
    "A2-2_blind_sum_adds_ge_0_005": out.arms.blind_sum.ablation.adds && out.arms.blind_sum.ablation.pool.difference >= 0.005,
    "A2-3_named_z_and_blind_z_do_not_add": !out.arms.named_z.ablation.adds && !out.arms.blind_z.ablation.adds && out.arms.named_z.ablation.pool.difference < 0 && out.arms.blind_z.ablation.pool.difference < 0,
    "A2-4_no_arm_has_both_claims_true_on_this_language": !ARM_NAMES.some((n) => out.arms[n].claims.identification.pass === true && out.arms[n].claims.received_prior.pass === true),
  };
  const both = (n) => out.arms[n].claims.identification.pass === true && out.arms[n].claims.received_prior.pass === true;
  const meets = ARM_NAMES.filter(both);
  out.recommendation = {
    rule: "an arm is recommended for the single TEST read only if BOTH claims are true on this language: identification competence (above the majority baseline at the repository level, licences L3 and L4) and received-prior contribution (L1, L2 strict, beats its deranged control and its OWN keyword-ablation at the repository level)",
    meets,
    meets_identification: ARM_NAMES.filter((n) => out.arms[n].claims.identification.pass === true),
    meets_received_prior: ARM_NAMES.filter((n) => out.arms[n].claims.received_prior.pass === true),
    underpowered: ARM_NAMES.filter((n) => out.arms[n].claims.identification.pass === null || out.arms[n].claims.received_prior.pass === null),
    meets_and_adds_over_ablation: meets, // kept for the card schema of A1/A2: with A5 an arm that meets the rule necessarily adds over its ablation
    pool_level: Object.fromEntries(ARM_NAMES.map((n) => {
      const a = out.arms[n].ablation.pool;
      return [n, { adds_over_ablation: out.arms[n].ablation.adds, difference: a.difference, repo_wins: a.repo.wins, repo_losses: a.repo.losses, repo_n: a.repo.n_repos, repo_p: a.repo.p, L1: out.arms[n].claims.received_prior.licence?.L1_repo_sign_vs_sigma0 ?? null, L2: out.arms[n].claims.received_prior.licence?.L2_all_draws_beaten ?? null }];
    })),
    note: "reported only; any arm named here was SELECTED ON DEV and must be frozen (--arm, c0-final.lock) before the single TEST read; an empty `meets` with a non-empty `underpowered` means DEV has too few repositories to decide, not that the arm failed",
  };
  return out;
}

/** The pre-registered PREDICTIONS evaluated where the data allow (reported, never gating). Pool-level ones are the same for every language. */
export function predictionChecks({ analysis, causality, languages }) {
  const { pool, slice } = analysis;
  const fam = (a, b) => PARAMS.FAMILIES.some((f) => f.includes(a) && f.includes(b));
  const topPairs = new Map();
  for (const { pair, count } of pool.confusions) { const [a, b] = pair.split("->"); const key = [a, b].sort().join("|"); topPairs.set(key, (topPairs.get(key) ?? 0) + count); }
  const top5 = [...topPairs].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const inFam = top5.filter(([k]) => { const [a, b] = k.split("|"); return fam(a, b); }).length;
  const L = slice.language;
  const sliceFloor = { python: 0.8, go: 0.8, ruby: 0.8, java: 0.8, c: 0.7, javascript: 0.55 }[L] ?? null;
  return {
    P1_pool_accuracy_ge_0_75: pool.accuracy.real >= 0.75,
    P2_slice_floor: sliceFloor == null ? null : { floor: sliceFloor, value: slice.accuracy, met: slice.accuracy >= sliceFloor },
    P4_strongest_draw_le_real_minus_0_10: pool.draws.max != null ? pool.draws.max <= pool.accuracy.real - 0.1 : null,
    P5_sigma0_slice_le_half_real: slice.arms.deranged_sigma0 <= 0.5 * slice.accuracy,
    P6_shape_ge_keyword: pool.accuracy.shape_only >= pool.accuracy.keyword_only,
    P6b_real_ge_shape_plus_0_03: pool.accuracy.real >= pool.accuracy.shape_only + 0.03,
    P7_lucs: { median: pool.lucs.median, median_le_20: pool.lucs.median != null ? pool.lucs.median <= 20 : null, stable_by_100_among_correct: pool.lucs.stableByAmongCorrect[100], ge_0_80: pool.lucs.stableByAmongCorrect[100] >= 0.8 },
    P8_top5_pairs_in_declared_families: { in_family: inFam, of: top5.length, met: inFam >= 3, top5: top5.map(([k, c]) => `${k}:${c}`) },
    P9_real_identical_under_future_corruption: causality.real_identical_under_corruption === 1,
    P10_ambiguous_ext_5pts_below_rest: pool.strata.ambiguousResolution.accuracy != null && pool.strata.other.accuracy != null ? pool.strata.ambiguousResolution.accuracy <= pool.strata.other.accuracy - 0.05 : null,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function parseCli(argv) {
  const o = { language: null, split: "dev", limit: null, arm: null, freeze: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--language") o.language = argv[++i];
    else if (argv[i] === "--split") o.split = argv[++i];
    else if (argv[i] === "--limit") o.limit = Number(argv[++i]);
    else if (argv[i] === "--arm") o.arm = argv[++i];
    else if (argv[i] === "--freeze") o.freeze = true;
  }
  return o;
}

/** Cards go to OUT_DIR/c0-<language>-<split>.json and R0-<language>-<split>.json. On TEST only a completed read takes those names; a refusal (no arm, no lock match, a second read) goes to its own .refused-<time> file, and a real TEST card is NEVER overwritten. */
export function writeCard(language, split, result, outDir = OUT_DIR) {
  fs.mkdirSync(outDir, { recursive: true });
  const line = JSON.stringify(result) + "\n";
  let files = [path.join(outDir, `c0-${language}-${split}.json`), path.join(outDir, `R0-${language}-${split}.json`)];
  const realTestCard = result?.details?.test_read?.completed === true;
  if (split === "test" && (!realTestCard || files.some((f) => readJson(f)?.details?.test_read?.completed))) {
    files = [path.join(outDir, `c0-${language}-test.refused-${new Date().toISOString().replace(/[:.]/g, "-")}.json`)];
  }
  for (const f of files) fs.writeFileSync(f, line);
  return files;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const cli = parseCli(process.argv.slice(2));
  if (cli.freeze) {
    // create the lock for ONE arm without reading any TEST file (amendment A6)
    const manifest = readJson(MANIFEST_FILE);
    const g = testGate({ language: null, arm: cli.arm, fingerprint: testFingerprint({ arm: cli.arm, limit: PARAMS.LIMIT, manifestStamp: manifest?.generated_at ?? null }), freezeOnly: true });
    console.log(JSON.stringify({ freeze: g.ok, created: g.created ?? false, reason: g.reason ?? null, lock: g.lock ? { arm: g.lock.fingerprint?.arm, frozen_at: g.lock.frozen_at } : null }));
    process.exit(g.ok ? 0 : 3);
  }
  if (!cli.language) { console.error("usage: node eval/coding-competence/c0-identify.mjs --language <lang>[,<lang>...] [--split dev|test] [--limit N] [--arm named_sum|named_z|blind_sum|blind_z]\n       node eval/coding-competence/c0-identify.mjs --freeze --arm <arm>   (TEST: C0_FINAL=1, ONE frozen arm, read once per language; amendment A6)"); process.exit(2); }
  for (const language of cli.language.split(",")) {
    const result = await measure({ language, split: cli.split, limit: cli.limit, arm: cli.arm });
    writeCard(language, cli.split, result);
    console.log(JSON.stringify(result));
  }
}
