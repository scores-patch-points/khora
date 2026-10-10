// c2-names.mjs : C2 NAMES (ladder rung R2 for programming languages): can an identifier OCCURRENCE name a being?
//
// ============================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written BEFORE the first run of this instrument or of any system it
// scores. Nothing below is tuned after a result is seen; a later change is an AMENDMENT block at the bottom of
// this header with its date and the result that prompted it, never an edit of this text.
// ============================================================================================================
//
// WHAT THE AUTHOR HAD SEEN BEFORE WRITING THIS (disclosed): the shape of gold output (token-class counts, def-kind
// counts, the word-like literal/keyword lists) on 8 DEV python files, and on 10 TRAIN files per language for
// javascript, c, go, ruby, java. No khora system was run on any file. No DEV or TEST score existed.
//
// LOVELACE'S LAW applied: the engine does what it is ordered to perform. This instrument orders a reader to say, for
// each word-like lexeme, whether the text (its prefix, plus a declared one-token commit delay) ORDERS it to be a
// declared name, refuses it, or leaves it unsettled. It measures; it originates nothing. No model is called anywhere:
// not in the reader, not in a prior, not in a score. Priors are received (named givers); thresholds are declared here.
//
// CLAIM (C2). For each of python, javascript, c, go, ruby, java, a causal reader that holds (a) a received closed class
// of hard keywords (giver: the language's tree-sitter grammar / its engine), (b) TRAIN-derived settled non-names and a
// TRAIN-derived context table (giver: tree-sitter parses of TRAIN-repository files, a treebank-like corpus), can
//   (1) REFUSE tokens that are truly not declared names, with refusal precision above the base rate of non-names, and
//   (2) ADMIT the declared names of HELD-OUT repositories with F1 above a reader that holds no prior.
// "Being" here means a gold CORE definition (function, method, class, interface, type, enum, variant, module, macro,
// ...; gold.mjs CORE_DEF_KINDS). The gold knows tags-level definitions only: a local variable, a parameter, an
// import binding is NOT a definition in the gold, so it counts as a non-name (a limit, stated again in LIMITS).
//
// UNITS U. Every word-like lexeme of a DEV file: a gold token whose class is not string/comment and whose text begins
// with a Unicode letter, '_' or '$'. Boundaries come from gold (segmentation is R1, scored elsewhere; C2 isolates
// classification). Numbers, punctuation, sigiled names (@x, :sym, $1) are not in U. Each unit gets a gold label y:
//   core      some gold def of a CORE kind has nameStart inside the token;
//   secondary only value-level defs (constant, variable, property, field, label, ...);  NEUTRAL for admission;
//   none      everything else (keywords, references, calls, types, literals, parameters, imports, locals).
// A gold def whose name token is not word-like (ruby `==`, `[]`, `name=`) or maps to no token is counted and
// reported as a typed gap (defs_outside_units), never silently dropped.
//
// THE READER (adapters/code/name-gate.js). Judges unit i from the lexeme stream of the file (comments dropped; texts
// only: the reader is NOT told the gold class) as one of  refuse | admit | unsettled :
//   T1  w in the received hard-keyword set (CodeKeywordPrior@1)                                  -> refuse[keyword]
//   T2  w in the TRAIN-settled non-names (>= 100 occurrences in TRAIN, >= 2 TRAIN repos, never a def of ANY kind
//       in TRAIN; 100 = ceil(3/0.03): the rule-of-three upper bound 3% is below the DEV declared-name base rate)
//                                                                                                  -> refuse[settled]
//   A   otherwise a context key from the CLOSED CLASS (keywords + settled non-names keep their text; every other
//       word becomes ID; strings STR, numbers NUM; punctuation keeps its text) is looked up in the TRAIN context
//       table with backoff:   S0 (H=0, strictly causal): (p2,p1) -> (p1)
//                             S1 (H=1, delayed commit):  (p2,p1,n1) -> (p1,n1) -> (p1)
//       first level with >= 20 TRAIN occurrences decides; ADMIT iff smoothed-free ratio defs/occurrences >= 0.5
//       (the majority rule); no level with support -> unsettled.
// H is the COMMIT DELAY in lexemes: S1 emits its judgement of lexeme i when lexeme i+1 has been heard and uses nothing
// later (a lexeme's own right edge needs one peek). S0 uses only lexemes <= i. NO whole-file statistic is used by
// either (READING-SPEC S3). The instrument checks this: verdicts computed on the prefix [0, i+H] equal the verdicts
// computed on the whole file (the causality licence, reported as details.causality; a mismatch voids the run).
// PRIMARY arm = S1. S0 is reported beside it (strict causal). Priors REFUSE or NOMINATE, never admit: the context
// table only nominates; the admit verdict is the nomination surviving T1/T2 refusal.
//
// ARMS (every one scored on the same units, same labels):
//   real        S1 (primary), S0 (strict), S1_kwOnly (T2 off), S1N (S1 plus: when the context is unsettled or below 0.5
//               and the word is a TRAIN-declared name in >= 2 repos (genericFloor of code-structure.js) -> admit),
//               nameOnly (admit iff declared in >= 2 TRAIN repos, no context)
//   existing    recipes: adapters/text/code-structure.js::parseDeclarations(text,file,{keywords}) with the existing
//               refusal. It reads the WHOLE file (regexes over the following text): a LOOKAHEAD BOUND (S3), never
//               the causal reader. Languages with no recipe (ruby, java) are a typed gap for this arm.
//   controls    majority  (predict the majority class non-name everywhere: F1 0, refusal precision = base rate)
//               noPrior   (a reader with no prior: code-structure.js's null-prior policy "admit the unseen" = admit
//                          every unit, refuse none; F1 = 2b/(1+b) with b the core rate)
//               randomMatched (admit/refuse the same numbers as S1 at random positions; seeded)
//               deranged  (S1 with the keyword set and settled set of ANOTHER language, cyclic shift of
//                          [python,javascript,c,go,ruby,java], and the context table's values permuted among its keys)
//               shuffled  (S1 on the file whose word-like lexeme TEXTS are permuted among the word-like positions
//                          (labels stay at their positions); breaks word-label association, keeps punctuation)
//               ablated   (S1 with the closed class removed: kw = settled = empty, so keys no longer match the table)
//
// STATISTICS. Admission: precision = |A and core| / |A minus secondary|; recall = |A and core| / |core|; F1.
// Refusal: precision = |R and none| / |R| (a refused unit that is a def of ANY kind is an error); base rate =
// |none| / |U|; coverage = |R and none| / |none|. Significance: a paired, repository-stratified file-cluster
// bootstrap (resample files with replacement inside each repo), B = 1000, seed from the language name, ONE-SIDED 5%:
// the 5th percentile of the paired difference must exceed 0. Files in one repo are correlated, so this is optimistic
// (declared); the repo-consistency condition below is the guard.
//
// PASS RULE (per language, on the primary arm S1; all of A, B, C):
//   A  refusal: |R| >= 200 AND the 5th percentile of (refusal precision of S1 - base rate) > 0.
//   B  admission: |core| >= 200 AND the 5th percentile of (F1(S1) - F1(noPrior)) > 0 AND F1(S1) > F1(noPrior) in every
//      DEV repo that has >= 20 core units.
//   C  licence (II.23 / II.4: the statistic must move under the perturbation): max(F1(deranged), F1(shuffled)) <=
//      0.5 * F1(S1) AND (refusal precision of shuffled - base rate) <= 0.5 * (refusal precision of S1 - base rate).
//      If C fails the run reports pass=false with licence=false: the instrument or mechanism is broken, not good.
//   pass = null (typed gap, never a pass) when A or B is unmeasurable (too few units), gold is unavailable or too few
//   files parse. result.score = F1(S1); result.control = max F1 over {majority,noPrior,randomMatched,deranged,
//   shuffled,ablated}; margin = score - control.
//
// CONSTANTS (declared, not tuned): N_MIN_CTX 20; THETA_ADMIT 0.5; SETTLED_MIN_OCC 100; SETTLED_MIN_REPOS 2;
// NAME_FLOOR 2; BOOT_B 1000; BOOT_ALPHA 0.05; MIN_REFUSED 200; MIN_CORE 200; MIN_CORE_PER_REPO 20; LICENCE_RATIO 0.5;
// PARSE_FAIL 0.02 (files whose gold error_bytes_frac exceeds it are excluded and counted, gold.py P2's tolerance).
//
// PREDICTIONS (written before any run; each can fail and will be reported as a failure if it does):
//   P1  F1(S1): python >= 0.90, ruby >= 0.85, go >= 0.80 (an introducer keyword or receiver form precedes the name).
//   P2  F1(S1): javascript, c, java in [0.55, 0.90) and each lower than python's (methods, calls and declarators
//       share the same neighbours).
//   P3  S1 beats S0 by >= 0.05 F1 in javascript, c, java; |S1 - S0| < 0.05 in python and ruby.
//   P4  nameOnly F1 < S1 F1 in all six: context, not name memory, carries admission.
//   P5  S1N does not improve S1's F1 by >= 0.01 in at least 4 of 6 languages: genericity does not nominate occurrences.
//   P6  keyword (T1) refusal precision >= 0.995 for python, c, go, java, ruby; javascript lower than python's, with at
//       least one of {get,set,from,of,as,async,static,target,meta,using} among its refusal errors (contextual words
//       the JS prior lists as hard keywords).
//   P7  licence (C) holds in all six, and the randomMatched refusal precision is within 0.01 of the base rate.
//   P8  pass = true in at least 4 of 6 languages.
//   P9  recipes F1 < S1 F1 on javascript (methods are not in the recipes); recipes admit declaration-shaped text
//       inside strings/comments (docstrings) in at least one of python, javascript, c, go.
//
// ENGINE AUDIT (extra, never part of the pass rule): of the distinct T1-refused words, how many does the language's
// own engine (CPython, node, ruby, gcc, javac) accept as the name of a declaration? Go has no toolchain here: typed gap.
// Prediction E1: python 0; javascript, ruby, java > 0 (contextual words, `i`/`r`/`ri` in the ruby keyword prior).
//
// HELD-OUT DISCIPLINE (rule 9). Priors are built from the manifest TRAIN split only (scripts: build-c2-priors.mjs).
// Repositories never straddle splits (manifest global_split). This file is developed and smoke-tested on DEV. TEST is
// guarded by a ledger: one TEST run per (instrument sha, language); a second is refused unless C2_TEST_REPEAT=1.
// The existing priors/code-name-{py,js,c,go}.json were built from the ethos tree, which holds repositories that
// the manifest places in dev/test (flask, fastapi, libsodium, postgres, ...): they are NOT used as held-out
// priors here; the TRAIN-derived name priors are.
//
// MODULE CONTRACT: export RUNG; export async function measure({language, split='dev', limit=null}); never throws for
// missing data; CLI:  node eval/coding-competence/c2-names.mjs --language <lang> [--split dev|test] [--limit N]
// ============================================================================================================
//
// AMENDMENT A1 (2026-10-05, after the TRAIN priors were built and BEFORE any DEV run of this instrument; no result prompted it).
// The header lists `deranged` as the wrong-language closed class together with permuted table values. That control moves
// both the refusals and the table at once, so it cannot show whether the TABLE alone carries admission. One more control is
// added: `derangedTable` = S1 with the correct closed class and correct keyword refusal, only the table's values permuted
// among its keys (seeded cyclic shift). It is part of `control` (the max over control arms) and of licence C
// (max(F1(deranged), F1(derangedTable), F1(shuffled)) <= 0.5 * F1(S1)). Nothing else in the header changes.
//
// AMENDMENT A2 (2026-10-05, after the FIRST DEV run of python, a bug in the reference arm only). The `recipes` arm located a
// declaration's name by searching the whole remainder of the file for `name (`; for `class Foo:` it therefore found a later
// `Foo(` (an instantiation) instead of the class name, which showed up as recipes precision == recall == 0.943 with admitted
// count == core count (31 admits on the wrong token). The search is now restricted to the declaration's own header window
// [start, bodyStart). This changes the recipes arm only; S1, S0, the controls and the pass rule are untouched, and the
// python result of the first run for every other arm is unchanged by it.
//
// AMENDMENT A3 (2026-10-05, POST HOC, DIAGNOSTIC ONLY; written after the first DEV run of all six languages). That run showed licence C
// FAILING for c (shuffled F1 0.621 > 0.5 * 0.935) and java (0.495 > 0.5 * 0.975). The `shuffled` control permutes the texts of the
// word-like units among the unit positions and leaves the punctuation skeleton in place; in the C family the skeleton (`ID ID (`)
// carries most of the declaration signal, so the control stays high. The pre-registered rule is NOT changed: c and java stand as
// pass=false (licence), reported as failures. To show whether the statistic moves when the skeleton is destroyed, a diagnostic arm
// `shuffledAll` (every lexeme text, punctuation included, permuted over every position) is added to details.arms. It is not in
// `control`, not in licence C, not in the pass rule. The engine audit (c2-engine-audit.mjs) was also added at this point as a
// reported-only extra (it was already announced in the header as ENGINE AUDIT).
//
// AMENDMENT A4 (2026-10-05, LICENCE, after the DEV runs; before any further analysis). The manifest marks 3 TRAIN files of python and c as
// `restricted` (python/cpython: PSF licence, not on the fetch list; git/git: GPL-2.0, copyleft, read in place). Priors that ship
// in the repository are no longer built from restricted files (build-c2-priors.mjs skips them; evaluation still reads restricted
// DEV files in place). The python and c priors were rebuilt and the python and c DEV runs repeated; the other four languages have
// no restricted TRAIN file and are unchanged. Numbers before the rebuild, for transparency: python S1 F1 0.9972, c S1 F1 0.9348
// (shuffled 0.6213, licence false); see the final report for the numbers after.
// ============================================================================================================
// AMENDMENT A5 (2026-10-06, POST HOC, DIAGNOSTIC ONLY; written after all six DEV runs had been seen, before the diagnostics below were run).
// A reviewer's objection to pass-rule A: the T1 tier (hard keywords) refuses 13-23% of all DEV non-names at precision ~1.000 by
// construction, so S1's overall refusal precision clears the base rate even if the LEARNED tier (T2, TRAIN-settled non-names) did
// nothing. Three diagnostics are added to details; none enters `control`, the licence, or the pass rule (which is unchanged):
//   T2only      refusals whose basis is `settled` (the words T1 did not already refuse): refusal precision, base-rate margin, the
//               5th percentile of that margin under the same bootstrap, and its coverage of the non-names;
//   T1only      the keyword tier alone, for the same table;
//   kwAdmitRest the existing refusal logic with ONLY the received keyword prior (refuse a hard keyword, admit every other word):
//               what the code-structure.js polarity does without any TRAIN-derived prior; a stronger no-prior reading than noPrior.
// plus recall by gold def kind (function/method/class/type/...). Predictions, written before the first run of these arms:
//   D1  T2-only refusal precision exceeds the base rate (5th percentile of the margin > 0) in at least 5 of 6 languages (a language
//       with fewer than MIN_REFUSED T2-only refusals is a typed gap, not a pass).
//   D2  kwAdmitRest F1 < 0.30 in every language, and the 5th percentile of F1(S1) - F1(kwAdmitRest) is > 0 in every language.
//   D3  c: the gold kind `type` (struct/union/enum/typedef names) has the lowest recall among kinds with >= 20 core units: the
//       two-lexeme left window cannot see `typedef struct {...} NAME;` and `} NAME;`.
// DISCLOSURE (A5): only D2 is a blind prediction (the kwAdmitRest arm had never been run). D1 was written after the T1/T2 tier
// precisions (details.refusalTiers) of all six DEV runs had been seen, so it is a CONFIRMATION of a visible pattern, now given a
// significance test; D3 was written after details.s1.coreMissedByKind of the c run had been seen (type: 202 of 254 core misses), so it
// is a post hoc description. They are reported as such and never counted as pre-registered successes.
// ============================================================================================================
// AMENDMENTS A6-A9 (2026-10-06). WRITTEN BEFORE any run of the arms they add. They answer five review findings on this instrument
// (an independent reviewer reproduced the builder's DEV numbers exactly and then objected to what they were compared with). Nothing
// below weakens the pre-registered rule to make a language pass: every change ADDS a comparator or a guard, and the original rule
// (A, B, C of this header, unchanged) is still computed and reported as `passV1` / `details.passRuleV1` beside the new `pass`.
//
// WHAT WAS SEEN BEFORE THIS TEXT (disclosed): every number in the six existing DEV result files for the arms listed in the header
// (S1, S0, S1_kwOnly, S1N, nameOnly, recipes, noPrior, deranged, derangedTable, shuffled, shuffledAll, T1only, T2only, kwAdmitRest,
// recall by kind); from the review text: ablated F1 for c 0.7867, java 0.7885, go 0.4519, recipes python 1.0 and go 0.911, S1_kwOnly
// python 1.0. NOT seen: ablated for python, javascript, ruby; anything at all for the arms freqT2, freqT2only, declKw, S1_lex.
//
// AMENDMENT A6 (hand baselines, the frequency-matched T2 control, `ablated` promoted; pass rule V2).
//  FINDING. The hand recipes beat or equal the reader on python (recipes F1 1.0 vs S1 0.9963; S1_kwOnly 1.0) and sit outside `control`
//  and the pass rule; pass rule A (overall refusal precision above the base rate) is carried by T1 keyword refusal at ~1.000 by
//  construction and by the base rate being 95-98% non-names; B compared against noPrior (admit every unit), a strawman.
//  CHANGES (all per language, all on S1):
//   (a) `recipes` (python, javascript, c, go) and a new `declKw` hand baseline (all six) enter CONTROL_ARMS and the pass rule.
//       declKw: admit unit i iff stream[i-1] is in the language's declarator-keyword set and stream[i] is not a hard keyword;
//       causal (H=0), refuses nothing. The sets are declared HERE, not tuned, from each language's reference grammar:
//         python {def, class}; javascript {function, class}; c {struct, union, enum}; go {func, type};
//         ruby {def, class, module}; java {class, interface, enum}
//       (the return-type slot of a C/Java declarator and a Go receiver are unsolvable by it: that is the point of the baseline).
//       The run discloses any set member that is not in the received keyword prior.
//   (b) `freqT2` (frequency-matched T2 control): S1 whose settled tier is replaced by the top-K most frequent TRAIN non-keyword words
//       (>= SETTLED_MIN_OCC occurrences in >= SETTLED_MIN_REPOS TRAIN repositories), K = the number of settled words, IGNORING the
//       never-a-definition filter; the closed class and the table are the real ones, so only the refusal tier differs. It is recomputed
//       from the manifest TRAIN split (restricted files excluded, as in build-c2-priors.mjs) and must reproduce the shipped settled set
//       or the control is a typed gap (A2 then unmeasurable, pass null). `freqT2only` = its refusals of basis `settled`.
//   (c) `ablated` (kw = settled = closed class empty) is the one control that is a real skeleton baseline: it enters licence C and B.
//   (d) `noPrior` and `kwAdmitRest` are SANITY FLOORS only (S1 must exceed both, p5 of the paired difference > 0), not comparators.
//  PASS RULE V2 (per language; pass = true iff A2, B2, C2, D all hold; null when A2 or B2 is unmeasurable; the causal licence still voids):
//   A2  refusal, T2 tier: |T2-only refusals| >= MIN_REFUSED AND p5(refusal-precision margin of T2only over the base rate) > 0 AND
//       p5(refusal precision of T2only - refusal precision of freqT2only) > 0   (D1 of A5 promoted to pre-registered, plus the control).
//       The overall refusal figure of rule A stays reported as `A_overall`; it is not the pass criterion because T1 carries it.
//   B2  admission: |core| >= MIN_CORE AND p5(F1(S1) - F1(ablated)) > 0 AND F1(ablated) <= ABLATED_RATIO * F1(S1)  [ABLATED_RATIO 0.9]
//       AND F1(S1) > F1(ablated) in every DEV repo with >= MIN_CORE_PER_REPO core units AND the floors hold.
//   C2  licence: rule C of this header (deranged, derangedTable, shuffled <= 0.5 * F1(S1); shuffled refusal margin <= 0.5 * S1's)
//       AND F1(ablated) <= ABLATED_RATIO * F1(S1).
//   D   hand baselines: for every available baseline h in {recipes, declKw}: p5(F1(S1) - F1(h)) > 0. If D fails the card says in
//       so many words that "learned priors help" is NOT SUPPORTED for that language (details.claims.learnedPriorsHelp).
//  `result.control` is now the max F1 over CONTROL_ARMS = {majority, noPrior, randomMatched, deranged, derangedTable, shuffled,
//  ablated, recipes, declKw, freqT2}; `margin` = score - control (negative = a control beat the reader).
//
// AMENDMENT A7 (segmentation is not free: S1 is causal GIVEN GOLD SEGMENTATION).
//  FINDING. The primary reader is handed gold tree-sitter tokens of the WHOLE file: string/regex/heredoc/template/comment extents,
//  preprocessor handling, `foo?` and `A::B` shapes, and the exclusion of non-word units by gold class. Those are whole-file parse
//  decisions, i.e. look-ahead and a delimiter given for free. checkCausality garbles only the stream after i+H and cannot see it.
//  CHANGES. (a) The arm is labelled in the card as "S1: causal gate over GOLD segmentation (whole-file tree-sitter tokens)" and
//  `details.segmentationLookahead` = "gold tokens, whole-file". The card never calls the primary score `causal` without that
//  qualifier. (b) New arm `S1_lex`: the same gate S1 over the lexemes of khora's own left-to-right lexer
//  (adapters/code/lex.js lexCode with the TRAIN-derived priors/code-lex-<language>.json), comments dropped as in the primary arm,
//  word-like non-string lexemes are its units. A gold unit is read iff the lexer produced a unit with EXACTLY its [start, end)
//  (otherwise the gold unit is unsettled: a segmentation miss, counted); a lexer unit that is no gold unit is an EXTRA: a
//  false positive if admitted, a (correct) non-name refusal if refused. (c) segmentation-leak cost = F1(S1) - F1(S1_lex), reported
//  with its bootstrap interval. (d) Lexer causality licence: lexing the prefix that ends at lexeme k, or that prefix followed by
//  garbage, reproduces lexemes 0..k-1 of the whole-file lexing exactly (40 files x 20 cut points); a mismatch is reported, never
//  hidden. The one look-ahead the lexer is declared to have is a lexeme's own extent (a string/comment finds its terminator).
//  (e) The END-TO-END causal claim is licensed (details.claims.causalEndToEnd) only if F1(S1_lex) >= SEG_RATIO * F1(S1)
//  [SEG_RATIO 0.9] AND the lexer licence holds; otherwise the card says its score is on gold segmentation and not end-to-end causal.
//  A language whose lexer prior is absent or built from a repository of this split is a typed gap for the arm, not a pass.
//
// AMENDMENT A8 (the gold was tuned with TEST-split repositories in view; the gold is frozen).
//  FINDING. gold.py's DISCLOSURE says its token-class rules and authored queries were corrected "while looking at DEV smoke files".
//  gold-smoke.json names pallets/flask, tiangolo/fastapi (python TEST), kubernetes/kubernetes (go TEST) and torvalds/linux (c TEST).
//  The independent authority was therefore corrected with TEST-split files in view: TEST is NOT blind with respect to the gold
//  (it is blind with respect to every prior, which are TRAIN-only). Every TEST card of this instrument carries that caveat
//  (details.gold.caveat). gold.py is FROZEN as of this amendment: its sha256 is pinned in GOLD_PY_PIN below, recorded in every card
//  (details.gold), and a TEST run refuses (typed gap `gold-not-frozen-version`) if the file differs from the pin; changing the pin
//  needs a new dated amendment. gold.py must not be edited after the first TEST read. Re-validation that uses no TEST file: the
//  authored fixtures (tests/coding-gold.test.js, P4) and an independent-engine cross-check on a fixed DEV sample
//  (eval/coding-competence/c2-gold-revalidate.mjs: python ast, ruby Ripper; js, c, go, java have no independent engine here: a typed gap).
//
// AMENDMENT A9 (the TEST-once guard).
//  FINDING. The ledger key hashed the instrument source including comments, so any header edit re-opened TEST; the ledger lived
//  under C2_OUT_DIR (redirectable to an empty directory); C2_TEST_REPEAT=1 bypassed it; the record was written before measuring
//  and a write failure was swallowed.
//  CHANGES. (a) Key = sha256 of (language, the sha256 of each shipped TRAIN-derived prior the reader holds: code-ctx, the name prior it
//  names, code-kw, code-lex, and the sha256 of the language's manifest rows [split, repo, path, sha256]). The instrument source and
//  its comments are NOT in the key, so a header edit cannot re-open TEST, while a rebuilt prior (a new reader) is a new key.
//  The gold.py hash is stored in the entry and a changed gold.py under the same key is refused (stricter than keying on it, which
//  would let an edit of gold.py after a TEST read re-open TEST). (b) The ledger is written to two FIXED places that no environment
//  variable moves (/private/tmp/claude-501/coding-competence/c2-test-ledger.json and eval/coding-competence/c2-test-ledger.json);
//  an entry in either blocks. (c) A write failure to either is FATAL: the run refuses (`test-ledger-unwritable`) and measures nothing.
//  (d) The entry is written after every precondition passes and BEFORE any gold of the TEST files is read, with state `started`;
//  `completed` + a result digest is written at the end. A `started` entry still blocks (a crash after labels were read is a peek).
//  (e) C2_TEST_REPEAT is gone. A repeat needs C2_TEST_REPEAT_REASON (>= REPEAT_REASON_MIN 20 characters); it is appended to the
//  entry, the result is stamped details.testRepeat and is NOT a card (pass = null, gap `test-repeat-not-a-card`).
//  (f) Every TEST card records details.testLedger { key, firstLook, previousKeysForLanguage }: if this language's TEST was read
//  before under different priors, firstLook is false and the card says it is not a first-look held-out result.
//  A ledger cannot stop someone who edits it or the manifest; it makes a second read visible and costs a stated reason.
//
// AMENDMENT A10 (2026-10-06, POST HOC: written after the first DEV run of S1_lex, which showed S1_lex within 0.011 F1 of S1 in every
// language). A near-equal arm needs a licence that it responds to the lexer at all (II.23). Added: `S1_lexDeranged` = the same gate over
// the lexemes of FOREIGN lexer priors (the cyclic-shift language of derangedLanguageOf, applied to priors/code-lex-*.json), scored
// exactly like S1_lex. The end-to-end claim (A7(e)) is licensed only if, in addition, F1(S1_lexDeranged) <= LICENCE_RATIO * F1(S1_lex)
// [0.5]; otherwise the card says the lexer arm does not move under a wrong lexer and the claim is not licensed. Prediction E7
// (written before the arm was first run): F1(S1_lexDeranged) <= 0.5 * F1(S1_lex) in all six languages. It enters neither `control` nor
// the pass rule (it is a licence of the lexer arm only). Disclosure: E7 and the arm were added after S1_lex results were seen.
//
// AMENDMENT A11 (2026-10-06, POST HOC DIAGNOSTIC; written after the first DEV run of S1_lexDeranged, which did NOT collapse in any of the six
// languages: F1 0.72-0.99, so by A10 the end-to-end claim is NOT licensed, and that verdict stands, unchanged). To learn whether the lexer arm
// responds to segmentation at all, one more arm is added: `S1_lexWs` = the same gate over the lexemes of lex.js whitespaceSplit (maximal
// non-whitespace runs: the C1 no-boundary-knowledge baseline), scored like S1_lex. It is a DIAGNOSTIC: it is not in `control`, not in the pass
// rule and not in the claim logic. Prediction E8 (written before its first run): F1(S1_lexWs) <= 0.5 * F1(S1_lex) in all six languages,
// i.e. the statistic does move under GROSS segmentation loss even though it does not move under a foreign (wrong-language) lexer.
//
// PREDICTIONS for A6-A9 (written before the first run of the new arms; each can fail; "seen" marks a prediction that restates a
// pattern the author had already seen, so it is a confirmation and is never counted as a pre-registered success):
//   E1  rule D vs recipes: python F1(recipes) >= F1(S1) (seen: 1.000 vs 0.9963); javascript, c, go: p5(F1(S1) - F1(recipes)) > 0
//       (seen as point values 0.811/0.707, 0.935/0.375, 0.976/0.911; the interval is new).
//   E2  declKw (blind): python F1 >= 0.95 and p5(F1(S1) - F1(declKw)) <= 0 (so python fails D, "learned priors help" not supported);
//       ruby F1 in [0.80, 0.95) and p5 > 0; go F1 in [0.60, 0.95) and p5 > 0; javascript F1 < 0.60 and p5 > 0;
//       c F1 < 0.40 and p5 > 0; java F1 < 0.50 and p5 > 0 (methods, whose return-type slot it cannot see, dominate java's core units).
//   E3  freqT2 (blind): the T2 refusal precision beats the frequency-matched control (p5 of the difference > 0) in >= 5 of 6 languages
//       (a language with < MIN_REFUSED T2-only refusals is a typed gap and counts as not held).
//   E4  ablated: F1(ablated) <= 0.9 * F1(S1) and p5(F1(S1) - F1(ablated)) > 0 in all six (seen for c, java, go: ratios 0.84, 0.81, 0.46;
//       python, javascript, ruby blind).
//   E5  S1_lex (blind): F1(S1_lex) >= 0.9 * F1(S1) in >= 5 of 6 languages; the lexer causality licence holds in all six.
//   E6  pass V2 (a consequence of seen results, not a gamble): false for c and java (rule C is unchanged and failed under V1: shuffled
//       0.621 > 0.5*0.935, 0.495 > 0.5*0.975) and for python (E1); true in at most 3 of 6 languages; so P8 (>= 4 of 6) is read on
//       passV1 (4 of 6 as seen) and the V2 count is reported beside it.
//
// DECLARED CONSTANTS added by A6-A9 (not tuned): ABLATED_RATIO 0.9; SEG_RATIO 0.9; REPEAT_REASON_MIN 20; LEX_CAUSALITY_FILES 40;
// LEX_CAUSALITY_PER_FILE 20; the freqT2 K is derived (the settled count); the declKw sets are listed in A6(a).
// (implementation follows; the header above is frozen)

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { goldAvailable, goldBatch, GOLD_PY, GOLD_VERSION } from "./gold.mjs";
import {
  OUT_DIR, CONSTS, LANGUAGES, DECL_KEYWORDS, LEDGER_PATHS, derangedLanguageOf, loadManifest, selectFiles, prepareFile, tallyFile, baseCounts, sumCounts,
  metricsOf, stratifiedBootstrap, flattenFile, armOf, baseOf, f1Of, refMarginOf, derangeTables, shuffleUnitTexts, shuffleAllTexts,
  fnv1a, mulberry32, shuffleInPlace, topN, sha256File, sha256Json, manifestRowsSha, testLedgerKey, testLedgerCheck, testLedgerComplete,
  declKwJudge, frequentSetOf, lexStreamOf, lexArmFile, checkLexCausality,
} from "./c2-lib.mjs";
import { deriveFromPrepared } from "./build-c2-priors.mjs";
import { PARAMS, LANG_CODE, loadNameGatePriors, createNameGate, checkCausality } from "../../adapters/code/name-gate.js";
import { lexCode, whitespaceSplit, loadCodeLexPrior } from "../../adapters/code/lex.js";
import { parseDeclarations } from "../../adapters/text/code-structure.js";

export const RUNG = Object.freeze({
  id: "R2",
  name: "classify tokens: can an identifier occurrence name a being",
  question: "For a word-like lexeme of source code, does the text (prefix plus a one-lexeme commit delay) order it to be a declared name, refuse it, or leave it unsettled, against tree-sitter definition-name gold on held-out repositories?",
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_FILES = [fileURLToPath(import.meta.url), path.resolve(HERE, "c2-lib.mjs"), path.resolve(HERE, "../../adapters/code/name-gate.js")];
/** informational only (it is NOT in the TEST ledger key: amendment A9): which instrument source produced a card */
export function instrumentSha() {
  const h = crypto.createHash("sha256");
  for (const f of SRC_FILES) h.update(fs.readFileSync(f));
  return h.digest("hex").slice(0, 16);
}

/** AMENDMENT A8: gold.py is frozen. sha256 of eval/coding-competence/gold.py as of 2026-10-06 (gold-1, last edited 2026-10-05 15:03).
 *  A TEST run refuses if the file differs; a new pin needs a new dated amendment. */
export const GOLD_PY_PIN = "43a31f749a06ae80cc78c77747cce4ab574d83c17ffeb5123c4dbd7e965e1ff5";
const GOLD_CAVEAT = "The gold extractor (gold.py) was corrected while looking at smoke files that include TEST-split repositories (pallets/flask, tiangolo/fastapi: python; kubernetes/kubernetes: go; torvalds/linux: c; see gold-smoke.json and gold.py DISCLOSURE). TEST is blind with respect to every prior (TRAIN-only) but NOT blind with respect to the gold. gold.py is frozen (sha256 pinned, amendment A8).";

/** the controls that enter `control` (amendment A6 added ablated, recipes, declKw, freqT2), and the order they are reported in */
export const CONTROL_ARMS = Object.freeze(["majority", "noPrior", "randomMatched", "deranged", "derangedTable", "shuffled", "ablated", "recipes", "declKw", "freqT2"]);
const CONTEXTUAL_JS = new Set(["get", "set", "from", "of", "as", "async", "static", "target", "meta", "using"]);
const RECIPE_LANGS = new Set(["python", "javascript", "c", "go"]);

// ── the pass rule, pure (tested on toy numbers) ───────────────────────────────────────────────────────────────────
/**
 * decidePassV1({ base, refused, boot, perRepo, f1, refMargin }) -> { pass, A, B, C, reasons }
 * THE ORIGINAL PRE-REGISTERED RULE (header: A, B, C), unchanged. Still computed and reported as `passV1` (amendment A6); it is no
 * longer the card's `pass`, because its comparators (noPrior, overall refusal) cannot fail.
 *   base {U, core, none}; refused = |R| of S1; boot = { refMarginS1:{p5}, f1DeltaNoPrior:{p5} }
 *   perRepo = [{ repo, core, f1S1, f1NoPrior }]; f1 = { S1, deranged, derangedTable, shuffled };
 *   refMargin = { S1, shuffled }
 */
export function decidePassV1({ base, refused, boot, perRepo, f1, refMargin }) {
  const reasons = [];
  const A = { measurable: refused >= CONSTS.MIN_REFUSED && boot?.refMarginS1?.p5 != null, ok: false };
  if (!A.measurable) reasons.push(`A unmeasurable: refused ${refused} < ${CONSTS.MIN_REFUSED} or no bootstrap`);
  else { A.ok = boot.refMarginS1.p5 > 0; if (!A.ok) reasons.push(`A fails: refusal-precision margin over base rate has 5th percentile ${boot.refMarginS1.p5.toFixed(4)} <= 0`); }
  const B = { measurable: base.core >= CONSTS.MIN_CORE && boot?.f1DeltaNoPrior?.p5 != null, ok: false, repoConsistent: null };
  if (!B.measurable) reasons.push(`B unmeasurable: core ${base.core} < ${CONSTS.MIN_CORE} or no bootstrap`);
  else {
    const reps = perRepo.filter((r) => r.core >= CONSTS.MIN_CORE_PER_REPO);
    B.repoConsistent = reps.length > 0 && reps.every((r) => r.f1S1 > r.f1NoPrior);
    B.ok = boot.f1DeltaNoPrior.p5 > 0 && B.repoConsistent;
    if (!(boot.f1DeltaNoPrior.p5 > 0)) reasons.push(`B fails: F1 delta vs noPrior 5th percentile ${boot.f1DeltaNoPrior.p5.toFixed(4)} <= 0`);
    if (!B.repoConsistent) reasons.push(`B fails: not every dev repo with >= ${CONSTS.MIN_CORE_PER_REPO} core units beats noPrior (${reps.filter((r) => !(r.f1S1 > r.f1NoPrior)).map((r) => r.repo).join(", ") || "no repo with enough core units"})`);
  }
  const worst = Math.max(f1.deranged ?? 0, f1.derangedTable ?? 0, f1.shuffled ?? 0);
  const C = {
    f1Ok: f1.S1 != null && worst <= CONSTS.LICENCE_RATIO * f1.S1,
    refOk: refMargin.S1 != null && refMargin.shuffled != null ? refMargin.shuffled <= CONSTS.LICENCE_RATIO * refMargin.S1 : null,
    ok: false,
  };
  C.ok = C.f1Ok && C.refOk !== false;
  if (!C.f1Ok) reasons.push(`C licence fails: a control reached F1 ${worst.toFixed(4)} > ${CONSTS.LICENCE_RATIO} * F1(S1)=${((f1.S1 ?? 0) * CONSTS.LICENCE_RATIO).toFixed(4)} (instrument or mechanism broken)`);
  if (C.refOk === false) reasons.push("C licence fails: shuffled refusal margin did not collapse");
  const pass = A.measurable && B.measurable ? A.ok && B.ok && C.ok : null;
  return { pass, A, B, C, reasons };
}


/**
 * decidePass(inp) -> { pass, A2, B2, C2, D, reasons, claims }   PASS RULE V2 (amendment A6).
 *   inp = { base:{U,core,none}, t2Refused, freqAvailable,
 *           boot:{ refMarginT2:{p5}, refPrecDeltaFreq:{p5}, f1DeltaAblated:{p5}, f1DeltaNoPrior:{p5}, f1DeltaKwAdmitRest:{p5},
 *                  f1DeltaRecipes:{p5}|null, f1DeltaDeclKw:{p5} },
 *           perRepo:[{repo, core, f1S1, f1Ablated}],
 *           f1:{S1, deranged, derangedTable, shuffled, ablated}, refMargin:{S1, shuffled},
 *           hand:{ recipes:boolean (available), declKw:boolean } }
 * pass = true iff A2, B2, C2 and D all hold; null when A2 or B2 is unmeasurable (never a pass). claims states what the card may say.
 */
export function decidePass({ base, t2Refused, freqAvailable = true, boot, perRepo, f1, refMargin, hand = { recipes: false, declKw: true } }) {
  const reasons = [];
  const num = (x) => typeof x === "number" && !Number.isNaN(x);
  // A2: the T2 (learned, settled) refusal tier beats the base rate AND a frequency-matched control
  const A2 = { measurable: freqAvailable && t2Refused >= CONSTS.MIN_REFUSED && num(boot?.refMarginT2?.p5) && num(boot?.refPrecDeltaFreq?.p5), ok: false };
  if (!A2.measurable) reasons.push(`A2 unmeasurable: ${!freqAvailable ? "frequency-matched control unavailable" : `T2-only refusals ${t2Refused} < ${CONSTS.MIN_REFUSED} or no bootstrap`}`);
  else {
    const m = boot.refMarginT2.p5 > 0, d = boot.refPrecDeltaFreq.p5 > 0;
    A2.ok = m && d;
    if (!m) reasons.push(`A2 fails: T2-only refusal-precision margin over base rate has 5th percentile ${boot.refMarginT2.p5.toFixed(4)} <= 0`);
    if (!d) reasons.push(`A2 fails: T2-only refusal precision does not beat the frequency-matched control (p5 of the difference ${boot.refPrecDeltaFreq.p5.toFixed(4)} <= 0)`);
  }
  // B2: admission beats the skeleton baseline (`ablated`), overall and per repo; noPrior/kwAdmitRest are floors
  const B2 = { measurable: base.core >= CONSTS.MIN_CORE && num(boot?.f1DeltaAblated?.p5), ok: false, repoConsistent: null, ratioOk: null, floorsOk: null };
  if (!B2.measurable) reasons.push(`B2 unmeasurable: core ${base.core} < ${CONSTS.MIN_CORE} or no bootstrap`);
  else {
    const reps = perRepo.filter((r) => r.core >= CONSTS.MIN_CORE_PER_REPO);
    B2.repoConsistent = reps.length > 0 && reps.every((r) => r.f1S1 > r.f1Ablated);
    B2.ratioOk = num(f1.ablated) && num(f1.S1) && f1.ablated <= CONSTS.ABLATED_RATIO * f1.S1;
    B2.floorsOk = (!num(boot?.f1DeltaNoPrior?.p5) || boot.f1DeltaNoPrior.p5 > 0) && (!num(boot?.f1DeltaKwAdmitRest?.p5) || boot.f1DeltaKwAdmitRest.p5 > 0);
    B2.ok = boot.f1DeltaAblated.p5 > 0 && B2.ratioOk && B2.repoConsistent && B2.floorsOk;
    if (!(boot.f1DeltaAblated.p5 > 0)) reasons.push(`B2 fails: F1(S1) - F1(ablated) has 5th percentile ${boot.f1DeltaAblated.p5.toFixed(4)} <= 0`);
    if (!B2.ratioOk) reasons.push(`B2 fails: F1(ablated) ${num(f1.ablated) ? f1.ablated.toFixed(4) : "n/a"} > ${CONSTS.ABLATED_RATIO} * F1(S1) = ${num(f1.S1) ? (CONSTS.ABLATED_RATIO * f1.S1).toFixed(4) : "n/a"}`);
    if (!B2.repoConsistent) reasons.push(`B2 fails: not every dev repo with >= ${CONSTS.MIN_CORE_PER_REPO} core units beats ablated (${reps.filter((r) => !(r.f1S1 > r.f1Ablated)).map((r) => r.repo).join(", ") || "no repo with enough core units"})`);
    if (!B2.floorsOk) reasons.push("B2 fails: a sanity floor (noPrior or kwAdmitRest) is not beaten");
  }
  // C2: licence (rule C of the header) plus the ablated ratio
  const worst = Math.max(f1.deranged ?? 0, f1.derangedTable ?? 0, f1.shuffled ?? 0);
  const C2 = {
    f1Ok: num(f1.S1) && worst <= CONSTS.LICENCE_RATIO * f1.S1,
    refOk: num(refMargin?.S1) && num(refMargin?.shuffled) ? refMargin.shuffled <= CONSTS.LICENCE_RATIO * refMargin.S1 : null,
    ablatedOk: num(f1.S1) && num(f1.ablated) ? f1.ablated <= CONSTS.ABLATED_RATIO * f1.S1 : null,
    ok: false,
  };
  C2.ok = C2.f1Ok && C2.refOk !== false && C2.ablatedOk !== false;
  if (!C2.f1Ok) reasons.push(`C2 licence fails: a control reached F1 ${worst.toFixed(4)} > ${CONSTS.LICENCE_RATIO} * F1(S1)=${((f1.S1 ?? 0) * CONSTS.LICENCE_RATIO).toFixed(4)} (instrument or mechanism broken)`);
  if (C2.refOk === false) reasons.push("C2 licence fails: shuffled refusal margin did not collapse");
  if (C2.ablatedOk === false) reasons.push(`C2 licence fails: ablated F1 ${f1.ablated.toFixed(4)} > ${CONSTS.ABLATED_RATIO} * F1(S1)`);
  // D: the hand baselines
  const baselines = {};
  for (const [name, avail] of Object.entries({ recipes: hand.recipes, declKw: hand.declKw })) {
    if (!avail) { baselines[name] = { available: false, ok: null }; continue; }
    const key = name === "recipes" ? "f1DeltaRecipes" : "f1DeltaDeclKw";
    const p5 = boot?.[key]?.p5;
    baselines[name] = { available: true, p5: num(p5) ? p5 : null, ok: num(p5) ? p5 > 0 : null };
    if (baselines[name].ok === false) reasons.push(`D fails: F1(S1) - F1(${name}) has 5th percentile ${p5.toFixed(4)} <= 0 (a hand baseline does as well as the reader)`);
    if (baselines[name].ok === null) reasons.push(`D unmeasurable for ${name}: no bootstrap`);
  }
  const avail = Object.values(baselines).filter((b) => b.available);
  const D = { baselines, measurable: avail.length > 0 && avail.every((b) => b.ok !== null), ok: avail.length > 0 && avail.every((b) => b.ok === true) };
  const pass = A2.measurable && B2.measurable ? A2.ok && B2.ok && C2.ok && D.ok : null;
  const claims = {
    learnedPriorsHelp: !D.measurable ? "unmeasured" : D.ok ? "supported (S1 beats every hand baseline, p5 > 0)" : `NOT SUPPORTED (a hand baseline does as well as the reader: ${Object.entries(baselines).filter(([, b]) => b.available && b.ok !== true).map(([n]) => n).join(", ")})`,
  };
  return { pass, A2, B2, C2, D, reasons, claims };
}

// ── recipes (the existing hand-kept declaration regexes: whole-file, a LOOKAHEAD BOUND) ───────────────────────────────
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function recipeAdmitStarts(text, fileName, keywords) {
  const decls = parseDeclarations(text, fileName, { keywords });
  const positions = [];
  for (const d of decls) {
    // the name is searched ONLY inside the declaration's own header window [start, bodyStart): the first word-bounded
    // `name (` (a declarator), else the first word-bounded `name` (class/def/type). (AMENDMENT A2.)
    const win = text.slice(d.start, Math.max(d.start + d.name.length, d.bodyStart ?? d.start));
    const call = new RegExp(`(?<![\\w$])${escapeRe(d.name)}(?![\\w$])\\s*\\(`);
    let m = call.exec(win);
    if (!m) m = new RegExp(`(?<![\\w$])${escapeRe(d.name)}(?![\\w$])`).exec(win);
    positions.push(m ? d.start + m.index : -1);
  }
  return { declarations: decls.length, positions };
}

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────
function round(x, d = 4) { return x == null || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d; }
function gap(reason, extra = {}) { return { reason, count: 1, ...extra }; }
function emptyResult(split) {
  return { id: "c2-names", rung: RUNG.id, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [], notes: [], details: {} };
}
function pctDelta(b, k) { return b?.[k] ? { p5: round(b[k].p5), p50: round(b[k].p50), p95: round(b[k].p95) } : null; }

const PRIORS_DIR = path.resolve(HERE, "../../priors");

/** TRAIN word statistics for the frequency-matched control (amendment A6(b)): recomputed from the manifest TRAIN split exactly as
 *  build-c2-priors.mjs does (restricted files excluded); it must reproduce the SHIPPED settled set, or the control is a typed gap. */
async function trainStatFor(lang, priors, manifest) {
  const L = manifest.languages[lang];
  const rows = (L?.train ?? []).filter((f) => !f.restricted);
  const items = rows.map((f) => ({ language: lang, text: fs.readFileSync(f.path, "utf8"), fileName: path.basename(f.path) }));
  const golds = await goldBatch(items);
  const files = [];
  golds.forEach((g, k) => {
    if (g.error) return;
    if ((g.parse?.error_bytes_frac ?? 0) > CONSTS.PARSE_FAIL) return;
    files.push({ repo: rows[k].repo, path: rows[k].path, prepared: prepareFile(items[k].text, g) });
  });
  const d = deriveFromPrepared(files, priors.kw.set);
  return { stat: d.stat, settledWords: d.settled.map((x) => x[0]), filesUsed: files.length };
}

const sameSet = (a, b) => a.length === b.length && new Set(a).size === new Set(b).size && a.every((x) => new Set(b).has(x));
const normRepos = (x) => (Array.isArray(x) ? x.map((r) => (typeof r === "string" ? r : r?.repo)).filter(Boolean) : []);

/**
 * acquireTestRead({ lang, priorFiles, manifestSha, goldSha, instrument, reason, paths }) -> { ok, gap?, key, repeat, firstLook, ... }
 * The TEST-once gate (amendment A9), separated from measureInner so it can be tested on temporary ledger paths. `paths` defaults to
 * the two FIXED ledger places; measure() never passes it (no environment variable and no caller of the CLI can redirect it).
 */
export function acquireTestRead({ lang, priorFiles, manifestSha, goldSha, instrument = null, reason = null, paths = LEDGER_PATHS }) {
  const lk = testLedgerKey({ language: lang, priorFiles, manifestSha });
  const probe = testLedgerCheck(paths, lk.key, { repeatReason: reason, record: false, language: lang });
  if (!probe.allowed) return { ok: false, key: lk.key, gap: gap("test-already-used", { key: lk.key, previous: probe.previous, error: probe.error }) };
  if (probe.previous?.meta?.goldPySha && probe.previous.meta.goldPySha !== goldSha) {
    return { ok: false, key: lk.key, gap: gap("test-already-used-gold-changed: gold.py differs from the version in force at the first TEST read", { key: lk.key }) };
  }
  const acq = testLedgerCheck(paths, lk.key, { repeatReason: reason, record: true, language: lang, meta: { language: lang, instrumentSha: instrument, goldPySha: goldSha, manifestSha: lk.parts.manifestSha, priors: lk.parts.priors } });
  if (!acq.allowed) return { ok: false, key: lk.key, gap: gap(acq.error?.startsWith("ledger-unwritable") ? "test-ledger-unwritable" : "test-already-used", { key: lk.key, error: acq.error }) };
  return { ok: true, key: lk.key, repeat: acq.repeat, reason, previous: probe.previous, previousKeysForLanguage: probe.previousKeysForLanguage, firstLook: !probe.previous && probe.previousKeysForLanguage.length === 0, paths, priors: lk.parts.priors };
}

// ── the measurement ───────────────────────────────────────────────────────────────────────────────────────────────
export async function measure({ language, split = "dev", limit = null } = {}) {
  const res = emptyResult(split);
  try {
    return await measureInner(res, { language, split, limit });
  } catch (e) {
    res.pass = null;
    res.gaps.push(gap("measure-error", { message: String(e?.message ?? e).slice(0, 300) }));
    return res;
  }
}

async function measureInner(res, { language, split, limit }) {
  const lang = String(language ?? "").toLowerCase();
  res.details.language = lang;
  res.details.instrumentSha = instrumentSha();
  if (!LANGUAGES.includes(lang)) {
    res.gaps.push(gap("unmeasured", { note: `C2 has priors only for ${LANGUAGES.join(", ")}` }));
    return res;
  }
  if (split !== "dev" && split !== "test") { res.gaps.push(gap("bad-split", { split })); return res; }
  if (split === "test" && limit != null) { res.gaps.push(gap("test-requires-full-split: a limited TEST run would spend the one TEST read on a smoke sample", { limit })); return res; }
  const av = goldAvailable();
  if (!av.available) { res.gaps.push(gap("gold-unavailable", { why: av.reason })); return res; }
  // AMENDMENT A8: the gold is frozen; its hash is recorded in every card, and a TEST run refuses a changed gold.py
  const goldSha = sha256File(GOLD_PY);
  const goldFrozen = goldSha === GOLD_PY_PIN;
  res.details.gold = { goldVersion: GOLD_VERSION, goldPySha: goldSha, pinned: GOLD_PY_PIN, frozen: goldFrozen, caveat: GOLD_CAVEAT, revalidation: "authored fixtures (tests/coding-gold.test.js P4) and an independent-engine DEV cross-check (eval/coding-competence/c2-gold-revalidate.mjs: python ast, ruby Ripper; js/c/go/java: typed gap, no independent engine here)" };
  try {
    const rv = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "c2-gold-revalidation.json"), "utf8"));
    res.details.gold.revalidationResult = Object.fromEntries(Object.entries(rv.languages ?? {}).map(([l, v]) => [l, v.gap ? { gap: v.gap } : { authority: v.authority, files: v.files?.used, goldCoreDefs: v.goldCoreDefs, engineDefs: v.engineDefs, f1: v.f1 == null ? null : Math.round(v.f1 * 10000) / 10000, held: v.held, voided: v.voided }]));
  } catch { res.details.gold.revalidationResult = "not run (eval/coding-competence/c2-gold-revalidate.mjs writes c2-gold-revalidation.json)"; }
  if (!goldFrozen) {
    if (split === "test") { res.gaps.push(gap("gold-not-frozen-version", { goldPySha: goldSha, pinned: GOLD_PY_PIN })); return res; }
    res.notes.push("WARNING: gold.py differs from the pinned (frozen) version; a TEST run would be refused until a new dated amendment re-pins it");
  }
  const priors = loadNameGatePriors(lang);
  res.details.priorDisclosure = priors.disclosure;
  if (!priors.ctxPrior || !priors.kw.set) {
    res.gaps.push(gap("unmeasured: TRAIN priors absent (run eval/coding-competence/build-c2-priors.mjs)", { disclosure: priors.disclosure }));
    return res;
  }
  const manifest = loadManifest();
  const L = manifest.languages[lang];
  const rowsAll = L?.[split] ?? [];
  const rows = selectFiles(rowsAll, limit);
  const repoSet = new Set(rows.map((r) => r.repo));
  const trainRepos = new Set(priors.ctxPrior.provenance?.trainRepos ?? []);
  const leak = [...repoSet].filter((r) => trainRepos.has(r));
  if (leak.length) { res.gaps.push(gap("leak: priors were built from a repository present in this split", { repos: leak })); return res; }
  if (priors.ctxPrior.provenance?.split !== "train") { res.gaps.push(gap("prior-not-train")); return res; }
  if (!rows.length) { res.gaps.push(gap("no-files", { split })); return res; }

  // khora's own lexer prior (amendment A7): TRAIN-built; a prior built from a repository of this split is a typed gap for the arm
  const lexPrior = loadCodeLexPrior(lang);
  let lexOk = Boolean(lexPrior);
  if (!lexPrior) res.gaps.push(gap("S1_lex: no code-lex prior for this language (typed gap; the end-to-end causal claim is unmeasured)", { language: lang }));
  else {
    const lexLeak = normRepos(lexPrior.provenance?.trainRepos).filter((r) => repoSet.has(r));
    if (lexLeak.length || lexPrior.provenance?.selection?.split !== "train") { lexOk = false; res.gaps.push(gap("S1_lex: lexer prior is not TRAIN-only for this split (typed gap)", { repos: lexLeak, split: lexPrior.provenance?.selection?.split ?? null })); }
  }

  const lexPriorOther = lexOk ? loadCodeLexPrior(derangedLanguageOf(lang)) : null;
  const lexOtherOk = Boolean(lexPriorOther);
  // AMENDMENT A9: the TEST ledger. Written after every precondition passes and BEFORE any TEST gold is read.
  let ledgerKey = null;
  let testRepeat = false;
  if (split === "test") {
    const priorFiles = [path.join(PRIORS_DIR, `code-ctx-${priors.code}.json`), path.join(PRIORS_DIR, priors.ctxPrior.provenance?.namePriorFile ?? ""), path.join(PRIORS_DIR, priors.kw.file ?? ""), path.join(PRIORS_DIR, `code-lex-${lang}.json`)];
    const acq = acquireTestRead({ lang, priorFiles, manifestSha: manifestRowsSha(L), goldSha, instrument: instrumentSha(), reason: process.env.C2_TEST_REPEAT_REASON || null });
    if (!acq.ok) { res.gaps.push(acq.gap); return res; }
    ledgerKey = acq.key;
    testRepeat = acq.repeat;
    res.details.testLedger = { key: acq.key, firstLook: acq.firstLook, previousKeysForLanguage: acq.previousKeysForLanguage, paths: acq.paths, priors: acq.priors };
    if (testRepeat) { res.details.testRepeat = { reason: acq.reason, previous: acq.previous }; res.notes.push("TEST REPEAT: this is a second read of TEST for this reader; it is NOT a card (pass = null)"); }
    if (!acq.firstLook && !testRepeat) res.notes.push(`TEST for this language was read before under different priors/manifest (${acq.previousKeysForLanguage.length} earlier key(s)): this card is NOT a first-look held-out result`);
    res.notes.push("TEST CAVEAT (gold): " + GOLD_CAVEAT);
  }

  // gold for the selected files
  const items = rows.map((f) => ({ language: lang, text: fs.readFileSync(f.path, "utf8"), fileName: path.basename(f.path) }));
  const golds = await goldBatch(items);
  const files = [];
  const excluded = { gold_error: 0, parse_fail: 0 };
  const goldErrors = new Map();
  golds.forEach((g, k) => {
    if (g.error) { excluded.gold_error++; goldErrors.set(g.error.split(":")[0], (goldErrors.get(g.error.split(":")[0]) ?? 0) + 1); return; }
    if ((g.parse?.error_bytes_frac ?? 0) > CONSTS.PARSE_FAIL) { excluded.parse_fail++; return; }
    files.push({ repo: rows[k].repo, path: rows[k].path, text: items[k].text, fileName: items[k].fileName, prepared: prepareFile(items[k].text, g) });
  });
  res.details.files = {
    requested: rows.length, used: files.length, excluded, goldErrors: Object.fromEntries(goldErrors),
    repos: Object.fromEntries([...repoSet].sort().map((r) => [r, files.filter((f) => f.repo === r).length])),
  };
  if (excluded.gold_error) res.gaps.push(gap("gold-error", { count: excluded.gold_error, kinds: Object.fromEntries(goldErrors) }));
  if (excluded.parse_fail) res.gaps.push(gap("gold-parse-failure (error_bytes_frac > 0.02, file excluded)", { count: excluded.parse_fail }));
  if (!files.length) { res.gaps.push(gap("no-usable-files")); return res; }

  // the frequency-matched control's word set (amendment A6(b)): TRAIN only, must reproduce the shipped settled set
  let freqSet = null;
  const freqInfo = { available: false };
  try {
    const tr = await trainStatFor(lang, priors, manifest);
    const shipped = priors.ctxPrior.closedClass.settled;
    const matches = sameSet(tr.settledWords, shipped);
    Object.assign(freqInfo, { K: shipped.length, trainFilesRecomputed: tr.filesUsed, trainFilesShipped: priors.ctxPrior.provenance.filesUsed, settledMatchesShipped: matches });
    if (matches && tr.filesUsed === priors.ctxPrior.provenance.filesUsed) {
      freqSet = frequentSetOf(tr.stat, priors.kw.set, shipped.length, { minOcc: PARAMS.SETTLED_MIN_OCC, minRepos: PARAMS.SETTLED_MIN_REPOS });
      freqInfo.available = true;
      freqInfo.overlapWithSettled = [...freqSet].filter((w) => priors.settled.has(w)).length;
      freqInfo.sampleOnlyFrequent = [...freqSet].filter((w) => !priors.settled.has(w)).slice(0, 12);
      freqInfo.sampleOnlySettled = shipped.filter((w) => !freqSet.has(w)).slice(0, 12);
    } else res.gaps.push(gap("freqT2: TRAIN recomputation does not reproduce the shipped settled set (control unavailable; A2 unmeasurable)", { ...freqInfo }));
  } catch (e) { freqInfo.error = String(e?.message ?? e).slice(0, 200); res.gaps.push(gap("freqT2: could not recompute TRAIN word statistics", { error: freqInfo.error })); }
  const freqOk = freqInfo.available;

  // ── the arms ──
  const otherLang = derangedLanguageOf(lang);
  const otherPriors = loadNameGatePriors(otherLang);
  const dSeed = fnv1a(`c2-derange:${lang}`);
  const dTables = derangeTables(priors.tables, dSeed);
  const gates = {
    S1: createNameGate(priors, { H: 1 }),
    S0: createNameGate(priors, { H: 0 }),
    S1_kwOnly: createNameGate(priors, { H: 1, tiers: { settled: false } }),
    S1N: createNameGate(priors, { H: 1, nominateNames: true }),
    nameOnly: createNameGate(priors, { H: 1, useContext: false }),
    ablated: createNameGate({ kw: { set: null }, settled: new Set(), closed: new Set(), tables: priors.tables, nameDecl: null }, { H: 1 }),
    deranged: createNameGate({ kw: otherPriors.kw, settled: otherPriors.settled, closed: otherPriors.closed, tables: dTables, nameDecl: null }, { H: 1 }),
    derangedTable: createNameGate({ kw: priors.kw, settled: priors.settled, closed: priors.closed, tables: dTables, nameDecl: null }, { H: 1 }),
  };
  if (freqOk) gates.freqT2 = createNameGate({ kw: priors.kw, settled: freqSet, closed: priors.closed, tables: priors.tables, nameDecl: null }, { H: 1 });
  const GATE_ARMS = Object.keys(gates);
  const hasRecipes = RECIPE_LANGS.has(lang);
  const declSet = new Set(DECL_KEYWORDS[lang]);
  const kwSet = priors.kw.set;
  const declNotInKw = [...declSet].filter((w) => !kwSet.has(w));
  const ARMS = [...GATE_ARMS, "shuffled", "shuffledAll", "recipes", "majority", "noPrior", "randomMatched", "T1only", "T2only", "kwAdmitRest", "declKw", ...(freqOk ? ["freqT2only"] : []), ...(lexOk ? ["S1_lex", "S1_lexWs"] : []), ...(lexOk && lexOtherOk ? ["S1_lexDeranged"] : [])];
  const perFile = [];
  const tierStats = { keyword: { n: 0, err: 0, words: new Map() }, settled: { n: 0, err: 0, words: new Map() } };
  const fpByClass = new Map(), fpWords = new Map(), missBasis = new Map(), missByKind = new Map(), coreByKind = new Map();
  const causality = { gate: {}, checked: 0, mismatches: [] };
  const lexCausality = { checked: 0, mismatches: [], selfUnstable: 0, files: 0, errors: 0 };
  const segTotals = { goldUnits: 0, unmatchedGold: 0, unmatchedGoldCore: 0, extras: 0, extrasAdmitted: 0, extrasRefused: 0, lexErrors: 0 };
  const recipeInfo = { declarations: 0, outsideUnits: 0, filesWithZeroDeclarations: 0, mappedAdmits: 0 };
  const samplerRng = mulberry32(fnv1a(`c2-sample:${lang}`));
  const lexSamplerRng = mulberry32(fnv1a(`c2-lexsample:${lang}`));

  files.forEach((f, fi) => {
    const P = f.prepared;
    const U = P.units;
    const counts = {};
    const verdicts = {};
    for (const name of GATE_ARMS) {
      const g = gates[name];
      const arr = new Array(U.length);
      for (let k = 0; k < U.length; k++) arr[k] = g.judge(P.stream, U[k].i);
      verdicts[name] = arr;
      counts[name] = tallyFile(P, (_u, k) => arr[k].verdict);
    }
    // shuffled: S1 on the file whose unit texts are permuted among the unit positions
    {
      const rng = mulberry32(fnv1a(`c2-shuffle:${lang}:${f.path}`));
      const stream2 = shuffleUnitTexts(P, rng);
      const g = gates.S1;
      const arr = U.map((u) => g.judge(stream2, u.i));
      counts.shuffled = tallyFile(P, (_u, k) => arr[k].verdict);
    }
    // shuffledAll: DIAGNOSTIC (amendment A3), not a control of the pass rule
    {
      const rng = mulberry32(fnv1a(`c2-shuffleall:${lang}:${f.path}`));
      const stream3 = shuffleAllTexts(P, rng);
      counts.shuffledAll = tallyFile(P, (u) => gates.S1.judge(stream3, u.i).verdict);
    }
    // recipes (existing, lookahead bound)
    if (hasRecipes) {
      const { declarations, positions } = recipeAdmitStarts(f.text, f.fileName, kwSet);
      if (!declarations) recipeInfo.filesWithZeroDeclarations++;
      recipeInfo.declarations += declarations;
      const byStart = new Map(U.map((u, k) => [u.start, k]));
      const admitIdx = new Set();
      for (const pos of positions) { const k = byStart.get(pos); if (k === undefined) recipeInfo.outsideUnits++; else admitIdx.add(k); }
      recipeInfo.mappedAdmits += admitIdx.size;
      counts.recipes = tallyFile(P, (_u, k) => (admitIdx.has(k) ? "admit" : null));
    } else counts.recipes = null;
    // trivial arms
    counts.majority = tallyFile(P, () => "refuse");
    counts.noPrior = tallyFile(P, () => "admit");
    {
      const rng = mulberry32(fnv1a(`c2-random:${lang}:${f.path}`));
      const order = shuffleInPlace(U.map((_, k) => k), rng);
      const nRef = counts.S1.ref, nAdm = counts.S1.adm;
      const role = new Array(U.length).fill(null);
      for (let j = 0; j < Math.min(nRef, order.length); j++) role[order[j]] = "refuse";
      for (let j = nRef; j < Math.min(nRef + nAdm, order.length); j++) role[order[j]] = "admit";
      counts.randomMatched = tallyFile(P, (_u, k) => role[k]);
    }
    // AMENDMENT A5 diagnostics (never in `control`, never in the pass rule)
    {
      const v = verdicts.S1;
      counts.T1only = tallyFile(P, (_u, k) => (v[k].verdict === "refuse" && v[k].basis === "keyword" ? "refuse" : null));
      counts.T2only = tallyFile(P, (_u, k) => (v[k].verdict === "refuse" && v[k].basis === "settled" ? "refuse" : null));
      counts.kwAdmitRest = tallyFile(P, (u) => (kwSet.has(P.stream[u.i]) ? "refuse" : "admit"));
    }
    // AMENDMENT A6: the hand baseline declKw, and the T2-tier of the frequency-matched control
    counts.declKw = tallyFile(P, (u) => declKwJudge(P.stream, u.i, declSet, kwSet).verdict);
    if (freqOk) {
      const vf = verdicts.freqT2;
      counts.freqT2only = tallyFile(P, (_u, k) => (vf[k].verdict === "refuse" && vf[k].basis === "settled" ? "refuse" : null));
    }
    // AMENDMENT A7: S1 over khora's own left-to-right lexer
    if (lexOk) {
      let lexemes = null;
      try { lexemes = lexCode(f.text, lexPrior); } catch { segTotals.lexErrors++; lexemes = []; }
      const lex = lexStreamOf(f.text, lexemes);
      const r = lexArmFile(P, lex, (st, i) => gates.S1.judge(st, i));
      counts.S1_lex = r.counts;
      for (const k of Object.keys(r.seg)) segTotals[k] += r.seg[k];
      {
        // AMENDMENT A11 (diagnostic): the lexer arm under whitespace-delimited runs (gross segmentation loss)
        let wsx = [];
        try { wsx = whitespaceSplit(f.text, lexPrior); } catch { wsx = []; }
        counts.S1_lexWs = lexArmFile(P, lexStreamOf(f.text, wsx), (st, i) => gates.S1.judge(st, i)).counts;
      }
      if (lexOtherOk) {
        // AMENDMENT A10: the lexer arm under a FOREIGN lexer prior (a control built to fail)
        let lexemesD = [];
        try { lexemesD = lexCode(f.text, lexPriorOther); } catch { lexemesD = []; }
        counts.S1_lexDeranged = lexArmFile(P, lexStreamOf(f.text, lexemesD), (st, i) => gates.S1.judge(st, i)).counts;
      }
      if (fi < CONSTS.LEX_CAUSALITY_FILES && lexemes.length) {
        const idx = [];
        for (let s = 0; s < Math.min(CONSTS.LEX_CAUSALITY_PER_FILE, lexemes.length); s++) idx.push(Math.floor(lexSamplerRng() * lexemes.length));
        try {
          const r2 = checkLexCausality(f.text, lexemes, (t) => lexCode(t, lexPrior), idx);
          lexCausality.checked += r2.checked; lexCausality.selfUnstable += r2.selfUnstable; lexCausality.files++;
          lexCausality.mismatches.push(...r2.mismatches.map((m) => ({ file: f.path, ...m })));
        } catch { lexCausality.errors++; }
      }
    }
    // diagnostics on S1
    const v1 = verdicts.S1;
    U.forEach((u, k) => {
      const v = v1[k];
      const w = P.stream[u.i];
      if (v.verdict === "refuse") {
        const t = tierStats[v.basis];
        t.n++;
        if (u.label !== "none") { t.err++; t.words.set(w, (t.words.get(w) ?? 0) + 1); }
      }
      if (v.verdict === "admit" && u.label === "none") {
        fpByClass.set(u.cls, (fpByClass.get(u.cls) ?? 0) + 1);
        fpWords.set(`${w}|${u.cls}`, (fpWords.get(`${w}|${u.cls}`) ?? 0) + 1);
      }
      if (u.label === "core") coreByKind.set(u.kind ?? "?", (coreByKind.get(u.kind ?? "?") ?? 0) + 1);
      if (u.label === "core" && v.verdict !== "admit") {
        const b = v.verdict === "refuse" ? `refuse:${v.basis}` : `unsettled:${v.basis.split(":")[0]}`;
        missBasis.set(b, (missBasis.get(b) ?? 0) + 1);
        missByKind.set(u.kind ?? "?", (missByKind.get(u.kind ?? "?") ?? 0) + 1);
      }
    });
    // causality licence on a sample of units (the gate over the gold stream)
    if (fi < 40 && U.length) {
      const idx = [];
      for (let s = 0; s < Math.min(20, U.length); s++) idx.push(U[Math.floor(samplerRng() * U.length)].i);
      for (const gname of ["S0", "S1", "S1N"]) {
        const r = checkCausality(gates[gname], P.stream, idx);
        causality.gate[gname] = (causality.gate[gname] ?? 0) + r.checked;
        causality.checked += r.checked;
        causality.mismatches.push(...r.mismatches.map((m) => ({ gate: gname, file: f.path, ...m })));
      }
    }
    perFile.push({ repo: f.repo, path: f.path, base: baseCounts(P), counts, defs: { total: P.defsTotal, outside: P.defsOutsideUnits, partial: P.defsPartial } });
  });

  // ── aggregate ──
  const armKeys = ARMS.filter((a) => a !== "recipes" || hasRecipes);
  const totals = {};
  const baseTotal = sumCounts(perFile.map((p) => p.base));
  for (const a of armKeys) totals[a] = sumCounts(perFile.map((p) => p.counts[a]));
  const armMetrics = Object.fromEntries(armKeys.map((a) => [a, metricsOf(totals[a], baseTotal)]));
  const fileVecs = perFile.map((p) => ({ repo: p.repo, v: flattenFile(p.base, Object.fromEntries(armKeys.map((a) => [a, p.counts[a]]))) }));
  const seed = fnv1a(`c2-boot:${lang}`);
  const boot = stratifiedBootstrap(fileVecs, (s) => {
    const refPrec = (arm) => metricsOf(armOf(s, arm), baseOf(s)).refuse.precision;
    const out = {
      refMarginS1: refMarginOf(s, "S1"),
      f1S1: f1Of(s, "S1"),
      f1DeltaNoPrior: f1Of(s, "S1") - f1Of(s, "noPrior"),
      f1DeltaS0: f1Of(s, "S1") - f1Of(s, "S0"),
      f1DeltaNameOnly: f1Of(s, "S1") - f1Of(s, "nameOnly"),
      f1DeltaS1N: f1Of(s, "S1N") - f1Of(s, "S1"),
      f1DeltaDerangedTable: f1Of(s, "S1") - f1Of(s, "derangedTable"),
      refMarginT2: refMarginOf(s, "T2only"),
      f1DeltaKwAdmitRest: f1Of(s, "S1") - f1Of(s, "kwAdmitRest"),
      // amendment A6
      f1DeltaAblated: f1Of(s, "S1") - f1Of(s, "ablated"),
      f1DeltaKwOnly: f1Of(s, "S1") - f1Of(s, "S1_kwOnly"),
      f1DeltaDeclKw: f1Of(s, "S1") - f1Of(s, "declKw"),
    };
    if (hasRecipes) out.f1DeltaRecipes = f1Of(s, "S1") - f1Of(s, "recipes");
    if (freqOk) {
      const a = refPrec("T2only"), b = refPrec("freqT2only");
      out.refPrecDeltaFreq = a == null || b == null ? null : a - b;
      out.f1DeltaFreqT2 = f1Of(s, "S1") - f1Of(s, "freqT2");
    }
    if (lexOk) {
      out.f1LeakCost = f1Of(s, "S1") - f1Of(s, "S1_lex");
      const l = f1Of(s, "S1_lex"), g = f1Of(s, "S1");
      out.f1LexRatio = l == null || !g ? null : l / g;
    }
    return out;
  }, { B: CONSTS.BOOT_B, seed });

  // per repo
  const perRepo = [];
  for (const repo of [...repoSet].sort()) {
    const fv = fileVecs.filter((f) => f.repo === repo);
    if (!fv.length) continue;
    const sum = {};
    for (const f of fv) for (const [k, x] of Object.entries(f.v)) sum[k] = (sum[k] ?? 0) + x;
    perRepo.push({ repo, files: fv.length, units: sum["base.U"], core: sum["base.core"], f1S1: round(f1Of(sum, "S1")), f1S0: round(f1Of(sum, "S0")), f1NoPrior: round(f1Of(sum, "noPrior")), f1Ablated: round(f1Of(sum, "ablated")), f1DeclKw: round(f1Of(sum, "declKw")), f1Recipes: hasRecipes ? round(f1Of(sum, "recipes")) : null, f1S1Lex: lexOk ? round(f1Of(sum, "S1_lex")) : null, refusalMargin: round(refMarginOf(sum, "S1")) });
  }
  const perRepoRaw = perRepo.map((r) => ({ ...r, f1S1: r.f1S1 ?? 0, f1NoPrior: r.f1NoPrior ?? 0, f1Ablated: r.f1Ablated ?? 0 }));

  const f1 = Object.fromEntries(armKeys.map((a) => [a, armMetrics[a].admit.f1]));
  const refMargin = { S1: armMetrics.S1.refuse.margin, shuffled: armMetrics.shuffled.refuse.margin };
  const baseRate = baseTotal.U ? baseTotal.none / baseTotal.U : null;
  const f1Gate = { S1: f1.S1, deranged: f1.deranged, derangedTable: f1.derangedTable, shuffled: f1.shuffled };
  const verdictV1 = decidePassV1({ base: baseTotal, refused: totals.S1.ref, boot, perRepo: perRepoRaw, f1: f1Gate, refMargin });
  const verdict = decidePass({ base: baseTotal, t2Refused: totals.T2only.ref, freqAvailable: freqOk, boot, perRepo: perRepoRaw, f1: { ...f1Gate, ablated: f1.ablated }, refMargin, hand: { recipes: hasRecipes, declKw: true } });

  const controls = {};
  for (const c of CONTROL_ARMS) controls[c] = round(f1[c]);
  const controlVals = CONTROL_ARMS.map((c) => f1[c]).filter((x) => x != null);
  const control = controlVals.length ? Math.max(...controlVals) : null;
  const strongest = CONTROL_ARMS.filter((c) => f1[c] != null).reduce((best, c) => (best == null || f1[c] > f1[best] ? c : best), null);

  const tierOut = (t) => ({ n: t.n, errors: t.err, precision: t.n ? round(1 - t.err / t.n) : null, topErrors: topN(t.words, 10) });
  const causal = { checked: causality.checked, mismatches: causality.mismatches.slice(0, 3), ok: causality.mismatches.length === 0, perGate: causality.gate };
  if (!causal.ok) res.notes.push("CAUSALITY LICENCE FAILED: a verdict changed when the future was removed or garbled; the run is voided");

  // the segmentation block (amendment A7)
  const lexLicenceOk = lexOk && lexCausality.checked > 0 && lexCausality.mismatches.length === 0 && lexCausality.errors === 0;
  const lexRatio = lexOk && f1.S1 ? f1.S1_lex / f1.S1 : null;
  const foreign = lexOk && lexOtherOk ? { arm: "S1_lexDeranged", foreignLexerFrom: derangedLanguageOf(lang), f1: round(f1.S1_lexDeranged), ratioToS1Lex: f1.S1_lex ? round(f1.S1_lexDeranged / f1.S1_lex) : null, licenceMoves: f1.S1_lex ? f1.S1_lexDeranged <= CONSTS.LICENCE_RATIO * f1.S1_lex : null } : { arm: "S1_lexDeranged", gap: "no foreign lexer prior (typed gap)", licenceMoves: null };
  const segmentation = {
    primary: { arm: "S1", label: "causal gate over GOLD segmentation (whole-file tree-sitter tokens)", segmentationLookahead: "gold tokens, whole-file", endToEndCausal: false },
    khoraLexer: lexOk ? {
      arm: "S1_lex", lexer: "adapters/code/lex.js lexCode, left-to-right; declared look-ahead = a lexeme's own extent", prior: `priors/code-lex-${lang}.json`, priorGiver: lexPrior.provenance?.giver ?? null,
      f1: round(f1.S1_lex), precision: round(armMetrics.S1_lex.admit.precision), recall: round(armMetrics.S1_lex.admit.recall),
      leakCost: round(f1.S1 != null && f1.S1_lex != null ? f1.S1 - f1.S1_lex : null), leakCostBootstrap: pctDelta(boot, "f1LeakCost"), ratio: round(lexRatio), ratioBootstrap: pctDelta(boot, "f1LexRatio"), requiredRatio: CONSTS.SEG_RATIO,
      foreignLexerControl: foreign,
      wsBaselineDiagnostic: { arm: "S1_lexWs", note: "amendment A11, post hoc diagnostic; not in control, pass rule or claim logic", f1: round(f1.S1_lexWs), ratioToS1Lex: f1.S1_lex ? round(f1.S1_lexWs / f1.S1_lex) : null, moves: f1.S1_lex ? f1.S1_lexWs <= CONSTS.LICENCE_RATIO * f1.S1_lex : null },
      segmentation: { ...segTotals, unmatchedGoldShare: round(segTotals.goldUnits ? segTotals.unmatchedGold / segTotals.goldUnits : null), unmatchedGoldCoreShare: round(baseTotal.core ? segTotals.unmatchedGoldCore / baseTotal.core : null) },
      causalityLicence: { ok: lexLicenceOk, checked: lexCausality.checked, files: lexCausality.files, mismatches: lexCausality.mismatches.slice(0, 3), mismatchCount: lexCausality.mismatches.length, selfUnstable: lexCausality.selfUnstable, errors: lexCausality.errors },
    } : { arm: "S1_lex", gap: "no usable code-lex prior for this language (typed gap)" },
  };
  const causalEndToEnd = !lexOk ? "unmeasured (no usable lexer prior: typed gap)"
    : lexRatio != null && lexRatio >= CONSTS.SEG_RATIO && lexLicenceOk && foreign.licenceMoves === true ? "licensed (S1_lex >= SEG_RATIO * S1, the lexer causality licence holds, and the arm collapses under a foreign lexer)"
      : `NOT licensed (S1_lex/S1 = ${lexRatio == null ? "n/a" : lexRatio.toFixed(3)} vs required ${CONSTS.SEG_RATIO}; lexer causality licence ${lexLicenceOk ? "holds" : "does not hold"}; foreign-lexer control ${foreign.licenceMoves === true ? "moves" : foreign.licenceMoves === false ? "DOES NOT move (the arm does not respond to the lexer)" : "unmeasured"}): the score is on gold segmentation, not an end-to-end causal reading`;
  const claims = { primaryScoreIs: "F1 of the S1 gate over GOLD segmentation (whole-file tree-sitter tokens), not an end-to-end causal reading unless causalEndToEnd says licensed", causalEndToEnd, learnedPriorsHelp: verdict.claims.learnedPriorsHelp };

  res.n = baseTotal.U;
  res.score = round(f1.S1);
  res.control = round(control);
  res.margin = res.score != null && res.control != null ? round(res.score - res.control) : null;
  res.pass = causal.ok && !testRepeat ? verdict.pass : null;
  if (!causal.ok) res.gaps.push(gap("causality-licence-failed"));
  if (testRepeat) res.gaps.push(gap("test-repeat-not-a-card"));
  res.controls = controls;
  const defsTotals = { total: 0, outsideUnits: 0, partialToken: 0 };
  for (const p of perFile) { defsTotals.total += p.defs.total; defsTotals.outsideUnits += p.defs.outside; defsTotals.partialToken += p.defs.partial; }
  if (defsTotals.outsideUnits) res.gaps.push(gap("defs_outside_units (def name not a word-like non-string token, e.g. operator methods; not scored)", { count: defsTotals.outsideUnits, of: defsTotals.total }));
  if (!hasRecipes) res.gaps.push(gap("existing recipes: none for this language (code-structure.js RECIPES cover py/js/c/go); the declKw hand baseline stands in (amendment A6)", { language: lang }));
  if (declNotInKw.length) res.gaps.push(gap("declKw: declarator keyword(s) not in the received keyword prior", { words: declNotInKw }));
  for (const d of priors.disclosure) res.gaps.push(gap(`prior-disclosure: ${d.gap}`, d));
  res.notes.push("primary arm S1 = delayed-commit (H=1) gate over GOLD segmentation (whole-file tree-sitter tokens: segmentationLookahead); S0 strict; S1_lex = the same gate over khora's own left-to-right lexer; recipes = existing whole-file regexes (LOOKAHEAD BOUND)");
  res.notes.push(`claim causalEndToEnd: ${causalEndToEnd}`);
  res.notes.push(`claim learnedPriorsHelp: ${verdict.claims.learnedPriorsHelp}`);
  res.notes.push(`strongest control: ${strongest} F1 ${round(control)} vs S1 ${round(f1.S1)} (margin ${res.margin})`);
  res.notes.push("gold limit: tags-level definitions only; locals, parameters, imports are non-names in the gold");

  const refuseBlock = (a) => ({ n: armMetrics[a].refuse.n, errors: armMetrics[a].refuse.errors, precision: round(armMetrics[a].refuse.precision), baseRate: round(baseRate), margin: round(armMetrics[a].refuse.margin), coverage: round(armMetrics[a].refuse.coverage) });
  const refuseAdmit = (a) => ({ n: armMetrics[a].admit.n, precision: round(armMetrics[a].admit.precision), recall: round(armMetrics[a].admit.recall), f1: round(armMetrics[a].admit.f1) });
  res.details = {
    ...res.details,
    primaryArm: "S1", primaryArmLabel: "S1: causal gate over GOLD segmentation (whole-file tree-sitter tokens)", segmentationLookahead: "gold tokens, whole-file", H: { S1: 1, S0: 0 },
    split, limit, constants: { ...PARAMS, ...CONSTS },
    priors: {
      keyword: { file: priors.kw.file, n: priors.kw.set.size, giver: priors.kw.prior?.provenance?.giver ?? null },
      ctx: { code: priors.code, trainRepos: priors.ctxPrior.provenance.trainRepos, trainFiles: priors.ctxPrior.provenance.filesUsed, settled: priors.ctxPrior.closedClass.settled.length, rows: priors.ctxPrior.counts.rows, builtOn: priors.ctxPrior.provenance.builtOn },
      namePrior: priors.ctxPrior.provenance.namePriorFile,
      derangedFrom: otherLang,
    },
    units: { U: baseTotal.U, core: baseTotal.core, secondary: baseTotal.secondary, none: baseTotal.none, baseRateNonNames: round(baseRate), coreRate: round(baseTotal.U ? baseTotal.core / baseTotal.U : null), defs: defsTotals },
    arms: Object.fromEntries(armKeys.map((a) => [a, { admit: { n: armMetrics[a].admit.n, precision: round(armMetrics[a].admit.precision), recall: round(armMetrics[a].admit.recall), f1: round(armMetrics[a].admit.f1) }, refuse: { n: armMetrics[a].refuse.n, errors: armMetrics[a].refuse.errors, precision: round(armMetrics[a].refuse.precision), margin: round(armMetrics[a].refuse.margin), coverage: round(armMetrics[a].refuse.coverage) } }])),
    controlArms: CONTROL_ARMS, strongestControl: strongest,
    refusalTiers: { keyword: tierOut(tierStats.keyword), settled: tierOut(tierStats.settled) },
    bootstrap: {
      B: CONSTS.BOOT_B, seed, refusalMarginS1: pctDelta(boot, "refMarginS1"), f1S1: pctDelta(boot, "f1S1"), f1DeltaNoPrior: pctDelta(boot, "f1DeltaNoPrior"), f1DeltaS0: pctDelta(boot, "f1DeltaS0"), f1DeltaNameOnly: pctDelta(boot, "f1DeltaNameOnly"), f1DeltaS1N: pctDelta(boot, "f1DeltaS1N"), f1DeltaDerangedTable: pctDelta(boot, "f1DeltaDerangedTable"), refusalMarginT2: pctDelta(boot, "refMarginT2"), f1DeltaKwAdmitRest: pctDelta(boot, "f1DeltaKwAdmitRest"), f1DeltaRecipes: pctDelta(boot, "f1DeltaRecipes"),
      f1DeltaAblated: pctDelta(boot, "f1DeltaAblated"), f1DeltaKwOnly: pctDelta(boot, "f1DeltaKwOnly"), f1DeltaDeclKw: pctDelta(boot, "f1DeltaDeclKw"), refPrecDeltaFreq: pctDelta(boot, "refPrecDeltaFreq"), f1DeltaFreqT2: pctDelta(boot, "f1DeltaFreqT2"),
      note: "paired, repository-stratified file-cluster bootstrap; optimistic (files in a repo correlate); one-sided 5%",
    },
    passRule: { A2_refusalT2: verdict.A2, B2_admission: verdict.B2, C2_licence: verdict.C2, D_handBaselines: verdict.D, reasons: verdict.reasons, licence: verdict.C2.ok, rule: "V2 (amendment A6)" },
    passRuleV1: { A_refusal: verdictV1.A, B_admission: verdictV1.B, C_licence: verdictV1.C, reasons: verdictV1.reasons, licence: verdictV1.C.ok, rule: "V1 (the original pre-registered A, B, C; its comparators cannot fail)" },
    passV1: causal.ok && !testRepeat ? verdictV1.pass : null,
    claims,
    segmentation,
    handBaselines: {
      declKw: { declarators: [...declSet], notInKeywordPrior: declNotInKw, ...refuseAdmit("declKw"), f1DeltaBootstrap: pctDelta(boot, "f1DeltaDeclKw") },
      recipes: hasRecipes ? { f1: round(f1.recipes), f1DeltaBootstrap: pctDelta(boot, "f1DeltaRecipes") } : { gap: "no recipe for this language: declKw stands in" },
    },
    freqControl: freqOk ? {
      ...freqInfo, T2only: refuseBlock("T2only"), freqT2only: refuseBlock("freqT2only"), precisionDeltaBootstrap: pctDelta(boot, "refPrecDeltaFreq"),
      admission: { freqT2F1: round(f1.freqT2), S1F1: round(f1.S1), f1DeltaBootstrap: pctDelta(boot, "f1DeltaFreqT2") },
    } : { ...freqInfo, gap: "frequency-matched control unavailable (typed gap): A2 unmeasurable" },
    diagnosticsA5: { note: "post hoc diagnostics (amendment A5); not in control, licence or pass rule", T1only: refuseBlock("T1only"), T2only: { ...refuseBlock("T2only"), marginP5: round(boot.refMarginT2?.p5), measurable: totals.T2only.ref >= CONSTS.MIN_REFUSED }, kwAdmitRest: { admit: refuseAdmit("kwAdmitRest"), f1DeltaS1P5: round(boot.f1DeltaKwAdmitRest?.p5) } },
    perRepo,
    s1: { falsePositivesByGoldClass: Object.fromEntries(fpByClass), topFalsePositives: topN(fpWords, 15), coreMissedBy: Object.fromEntries(missBasis), coreMissedByKind: Object.fromEntries(missByKind), coreByKind: Object.fromEntries(coreByKind), recallByKind: Object.fromEntries([...coreByKind].map(([k, n]) => [k, round(1 - (missByKind.get(k) ?? 0) / n)])) },
    recipes: hasRecipes ? { ...recipeInfo, f1: round(f1.recipes), precision: round(armMetrics.recipes.admit.precision), recall: round(armMetrics.recipes.admit.recall), note: "whole-file regexes: LOOKAHEAD BOUND (READING-SPEC S3); outsideUnits = declaration-shaped text inside a string/comment or not at a token start" } : null,
    causality: causal,
    ...(res.details.testLedger ? { testLedger: res.details.testLedger } : {}),
    ...(res.details.testRepeat ? { testRepeat: res.details.testRepeat } : {}),
  };
  res.details.predictions = predictionChecks(lang, res);
  try {
    const mod = await import("./c2-engine-audit.mjs").catch(() => null);
    if (mod?.auditRefusedWords && process.env.C2_NO_ENGINE_AUDIT !== "1") {
      res.details.engineAudit = await mod.auditRefusedWords(lang, [...priors.kw.set], { settledWords: priors.ctxPrior.closedClass.settled });
    }
  } catch (e) { res.details.engineAudit = { available: false, reason: String(e?.message ?? e).slice(0, 200) }; }
  if (ledgerKey) {
    const done = testLedgerComplete(LEDGER_PATHS, ledgerKey, { resultDigest: sha256Json({ score: res.score, controls: res.controls, pass: res.pass, passV1: res.details.passV1 }).slice(0, 16), n: res.n });
    res.details.testLedger = { ...res.details.testLedger, completed: done.ok, completionErrors: done.errors };
  }
  return res;
}

// ── the pre-registered predictions, evaluated per language where a per-language reading exists ───────────────────────
export function predictionChecks(lang, res) {
  const d = res.details;
  const A = d.arms;
  const f1 = (a) => A[a]?.admit?.f1 ?? null;
  const out = {};
  const bands = { python: [0.90, 1], ruby: [0.85, 1], go: [0.80, 1] };
  if (bands[lang]) out.P1 = { predicted: `F1(S1) >= ${bands[lang][0]}`, observed: f1("S1"), held: f1("S1") != null ? f1("S1") >= bands[lang][0] : null };
  if (["javascript", "c", "java"].includes(lang)) out.P2 = { predicted: "F1(S1) in [0.55, 0.90)", observed: f1("S1"), held: f1("S1") != null ? f1("S1") >= 0.55 && f1("S1") < 0.90 : null };
  const d10 = f1("S1") != null && f1("S0") != null ? f1("S1") - f1("S0") : null;
  if (["javascript", "c", "java"].includes(lang)) out.P3 = { predicted: "S1 - S0 >= 0.05", observed: round(d10), held: d10 != null ? d10 >= 0.05 : null };
  if (["python", "ruby"].includes(lang)) out.P3 = { predicted: "|S1 - S0| < 0.05", observed: round(d10), held: d10 != null ? Math.abs(d10) < 0.05 : null };
  out.P4 = { predicted: "nameOnly F1 < S1 F1", observed: { nameOnly: f1("nameOnly"), S1: f1("S1") }, held: f1("nameOnly") != null && f1("S1") != null ? f1("nameOnly") < f1("S1") : null };
  const dN = f1("S1N") != null && f1("S1") != null ? f1("S1N") - f1("S1") : null;
  out.P5 = { predicted: "S1N - S1 < 0.01 (counted across languages: held in >= 4 of 6)", observed: round(dN), held: dN != null ? dN < 0.01 : null };
  const kwTier = d.refusalTiers.keyword;
  if (lang === "javascript") {
    const hit = kwTier.topErrors.filter(([w]) => CONTEXTUAL_JS.has(w)).map(([w]) => w);
    out.P6 = { predicted: "T1 precision lower than python's and a contextual word among errors", observed: { precision: kwTier.precision, contextualErrors: hit }, held: hit.length > 0 };
  } else out.P6 = { predicted: "T1 precision >= 0.995", observed: kwTier.precision, held: kwTier.precision != null ? kwTier.precision >= 0.995 : null };
  const rp = A.randomMatched?.refuse?.precision;
  // P7 and P8 are the ORIGINAL pre-registered predictions: they read the ORIGINAL rule V1 (A6 keeps it beside V2)
  const licV1 = d.passRuleV1?.licence ?? d.passRule?.licence;
  const passV1 = d.passV1 !== undefined ? d.passV1 : res.pass;
  out.P7 = { predicted: "licence holds and randomMatched refusal precision within 0.01 of base rate", observed: { licence: licV1, randomMatchedRefusalPrecision: rp, baseRate: d.units.baseRateNonNames }, held: rp != null ? licV1 === true && Math.abs(rp - d.units.baseRateNonNames) <= 0.01 : null };
  out.P8 = { predicted: "pass (rule V1) = true (counted across languages: held in >= 4 of 6)", observed: passV1, held: passV1 == null ? null : passV1 === true };
  if (d.recipes) {
    const rs = f1("recipes");
    out.P9 = { predicted: lang === "javascript" ? "recipes F1 < S1 F1 and recipes declare text outside units" : "recipes declare text outside units (docstrings/strings/comments)", observed: { recipesF1: rs, S1: f1("S1"), outsideUnits: d.recipes.outsideUnits }, held: lang === "javascript" ? rs < f1("S1") && d.recipes.outsideUnits > 0 : d.recipes.outsideUnits > 0 };
  }
  // AMENDMENT A5 diagnostics (post hoc; read only when the run produced them)
  const dg = d.diagnosticsA5;
  if (dg) {
    out.D1 = { predicted: "T2-only refusal precision above base rate (p5 of margin > 0); counted across languages: held in >= 5 of 6", observed: { n: dg.T2only.n, precision: dg.T2only.precision, baseRate: dg.T2only.baseRate, marginP5: dg.T2only.marginP5 }, held: dg.T2only.measurable && dg.T2only.marginP5 != null ? dg.T2only.marginP5 > 0 : null };
    const kf = dg.kwAdmitRest.admit.f1, kp5 = dg.kwAdmitRest.f1DeltaS1P5;
    out.D2 = { predicted: "kwAdmitRest F1 < 0.30 and p5 of F1(S1) - F1(kwAdmitRest) > 0", observed: { kwAdmitRestF1: kf, deltaP5: kp5 }, held: kf != null && kp5 != null ? kf < 0.30 && kp5 > 0 : null };
    if (lang === "c") {
      const rk = d.s1?.recallByKind ?? {}, ck = d.s1?.coreByKind ?? {};
      const kinds = Object.keys(rk).filter((k) => (ck[k] ?? 0) >= 20);
      const lowest = kinds.length ? kinds.reduce((a, b) => (rk[a] <= rk[b] ? a : b)) : null;
      out.D3 = { predicted: "c: kind `type` has the lowest recall among kinds with >= 20 core units", observed: { recallByKind: rk, lowest }, held: lowest != null ? lowest === "type" : null };
    }
  }
  // AMENDMENTS A6-A9: E1..E6 (read only when the run produced the new arms)
  const bs = d.bootstrap ?? {};
  const s1 = f1("S1");
  if (d.handBaselines) {
    const rP5 = bs.f1DeltaRecipes?.p5 ?? null, dP5 = bs.f1DeltaDeclKw?.p5 ?? null;
    const rs = f1("recipes"), dk = f1("declKw");
    if (lang === "python") out.E1 = { predicted: "python: F1(recipes) >= F1(S1) (SEEN pattern: confirmation only)", observed: { recipes: rs, S1: s1 }, held: rs != null && s1 != null ? rs >= s1 : null, seen: true };
    else if (RECIPE_LANGS.has(lang)) out.E1 = { predicted: "p5(F1(S1) - F1(recipes)) > 0 (point values SEEN, the interval is new)", observed: { recipes: rs, S1: s1, p5: rP5 }, held: rP5 != null ? rP5 > 0 : null, seen: true };
    const e2 = {
      python: { text: "F1(declKw) >= 0.95 and p5 <= 0 (python fails D)", ok: (x, p) => x >= 0.95 && p <= 0 },
      ruby: { text: "F1(declKw) in [0.80, 0.95) and p5 > 0", ok: (x, p) => x >= 0.80 && x < 0.95 && p > 0 },
      go: { text: "F1(declKw) in [0.60, 0.95) and p5 > 0", ok: (x, p) => x >= 0.60 && x < 0.95 && p > 0 },
      javascript: { text: "F1(declKw) < 0.60 and p5 > 0", ok: (x, p) => x < 0.60 && p > 0 },
      c: { text: "F1(declKw) < 0.40 and p5 > 0", ok: (x, p) => x < 0.40 && p > 0 },
      java: { text: "F1(declKw) < 0.50 and p5 > 0", ok: (x, p) => x < 0.50 && p > 0 },
    }[lang];
    if (e2) out.E2 = { predicted: e2.text, observed: { declKw: dk, S1: s1, p5: dP5 }, held: dk != null && dP5 != null ? e2.ok(dk, dP5) : null };
  }
  if (d.freqControl) {
    const p5 = d.freqControl.precisionDeltaBootstrap?.p5 ?? null;
    out.E3 = { predicted: "T2 refusal precision beats the frequency-matched control (p5 of the difference > 0); counted: held in >= 5 of 6", observed: { T2only: d.freqControl.T2only?.precision ?? null, freqT2only: d.freqControl.freqT2only?.precision ?? null, p5 }, held: p5 != null && (d.freqControl.T2only?.n ?? 0) >= CONSTS.MIN_REFUSED ? p5 > 0 : null };
  }
  if (A.ablated) {
    const p5 = bs.f1DeltaAblated?.p5 ?? null;
    out.E4 = { predicted: "F1(ablated) <= 0.9 * F1(S1) and p5(F1(S1) - F1(ablated)) > 0", observed: { ablated: f1("ablated"), S1: s1, ratio: s1 ? round(f1("ablated") / s1) : null, p5 }, held: s1 != null && f1("ablated") != null && p5 != null ? f1("ablated") <= CONSTS.ABLATED_RATIO * s1 && p5 > 0 : null };
  }
  if (d.segmentation?.khoraLexer?.f1 != null) {
    const sg = d.segmentation.khoraLexer;
    out.E5 = { predicted: "F1(S1_lex) >= 0.9 * F1(S1) (counted: >= 5 of 6) and the lexer causality licence holds (6 of 6)", observed: { ratio: sg.ratio, licence: sg.causalityLicence.ok }, held: sg.ratio != null ? sg.ratio >= CONSTS.SEG_RATIO && sg.causalityLicence.ok === true : null, ratioHeld: sg.ratio != null ? sg.ratio >= CONSTS.SEG_RATIO : null, licenceHeld: sg.causalityLicence.ok };
  }
  if (d.segmentation?.khoraLexer?.foreignLexerControl && d.segmentation.khoraLexer.foreignLexerControl.licenceMoves != null) {
    const fc = d.segmentation.khoraLexer.foreignLexerControl;
    out.E7 = { predicted: "F1(S1_lexDeranged) <= 0.5 * F1(S1_lex) (A10, post hoc arm; prediction written before its first run)", observed: { foreignF1: fc.f1, ratioToS1Lex: fc.ratioToS1Lex }, held: fc.licenceMoves === true };
  }
  if (d.segmentation?.khoraLexer?.wsBaselineDiagnostic?.moves != null) {
    const w = d.segmentation.khoraLexer.wsBaselineDiagnostic;
    out.E8 = { predicted: "F1(S1_lexWs) <= 0.5 * F1(S1_lex) (A11, post hoc diagnostic; prediction written before its first run)", observed: { wsF1: w.f1, ratioToS1Lex: w.ratioToS1Lex }, held: w.moves === true };
  }
  if (["python", "c", "java"].includes(lang)) out.E6 = { predicted: "pass V2 = false (python: D vs recipes; c, java: licence C unchanged from V1)", observed: res.pass, held: res.pass == null ? null : res.pass === false };
  return out;
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function argOf(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const language = argOf("language");
  const split = argOf("split", "dev");
  const limitArg = argOf("limit");
  if (!language) { console.error("usage: node eval/coding-competence/c2-names.mjs --language <lang> [--split dev|test] [--limit N]"); process.exit(2); }
  const result = await measure({ language, split, limit: limitArg ? Number(limitArg) : null });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  // a --limit run is a smoke run: it must never overwrite the full-split result file (c3 uses the same `.limitN` suffix)
  const out = path.join(OUT_DIR, `c2-names-${String(language).toLowerCase()}-${split}${limitArg ? `.limit${Number(limitArg)}` : ""}.json`);
  fs.writeFileSync(out, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result));
}
