// c4-edges.mjs: C4 EDGES, the coding-competence rung "find relations" (ladder R4) for PROGRAMMING LANGUAGES.
// Lovelace (Coding Capability Circle): the engine does what it is ordered to perform. Reading code is recovering what
// the text ORDERS (calls, imports, inheritance), never guessing intent. This file is an INSTRUMENT: it measures two
// readers against an independent authority and says, per language, whether the claim holds. It never calls a model.
//
//   node eval/coding-competence/c4-edges.mjs --language python [--split dev|train|test] [--limit N] [--offset N] [--no-probe]
//   prints ONE JSON line and writes /private/tmp/claude-501/coding-competence/c4-<language>-<split>.json
//   (an --offset run writes c4-<language>-<split>-offset<N>.json instead and never overwrites the base file;
//    a REFUSED run writes c4-<language>-<split>-refused.json and never the card; a test card is created with wx, never replaced;
//    a dev run also scores the unseen-repo TRAIN probe into details.unseen_repo_probe unless --no-probe)
//   import { RUNG, measure } from "./c4-edges.mjs";   // measure({ language, split = "dev", limit = null })
//   SEE AMENDMENT A8 (2026-10-06) at the end of the header: the pass rule was STRENGTHENED there (clauses g, h, i added; nothing
//   above was loosened) and every DEV result is flagged `development: true` (PASS-DEV / FAIL-DEV, never a competence PASS).
//
// ===================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written BEFORE the first run of this file or of adapters/code/edges.js
// against any gold. Nothing below is tuned after seeing a result. Failures are reported as failures.
// ===================================================================================================================
//
// CLAIM. A reader that sees only the PREFIX of a source file (causal, file order) and is driven by RECEIVED priors
// (the language's hard-keyword closed class, named giver) recovers the file's three kinds of ordered relation:
//   calls    caller -> callee        what a body orders to be invoked
//   imports  file -> module          what a file orders to be loaded
//   extends  child -> base           what a declaration orders to inherit / implement / mix in / embed
// better than chance structure explains, and better than controls built to fail.
//
// GOLD (independent authority, not khora): eval/coding-competence/gold.mjs, tree-sitter grammars. Calls = the
// grammar's call nodes resolved to the final callee name; imports = module as written (quotes/angles stripped);
// extends = child/base names (final segment). A file is SCORED only if gold parsed it with error_bytes_frac <= 0.02
// (gold.py's own P2 tolerance), the gold capability for that kind is `ok`, and it is <= MAX_BYTES. Every exclusion is a
// typed gap with a count. Gold caveats that bind the metric (disclosed, not hidden):
//   * Java extends gold only sees simple type names: `extends B<T>`, `implements D<E>`, `extends a.F` and
//     `record R implements M` are NOT in gold (class/interface/enum only, type_identifier only). A reader that finds
//     them is charged false positives for it. Extends is therefore reported with an `fp_in_gold_blindspot` diagnostic.
//   * JS `constructor` is not a gold def (its tags.scm excludes it), so a constructor body has no callable def.
//   * C function defs are the DECLARATOR only; the body extent is recovered from gold's own punctuation tokens
//     (a `{` right after the declarator, brace-matched over gold tokens, so strings and comments never count).
//   * `new X(...)`, `super(...)`, `this(...)`, enum-constant arguments and `sizeof(...)` are not calls in gold.
//
// EDGE KEYS. Every name is reduced to its final segment (after the last `.` or `::`, the gold convention); modules
// are kept as written. Per file each kind is a SET (duplicates collapse; counts are not scored).
//   calls    key = caller + "\u0001" + callee. caller = the innermost enclosing NAMED def of kind function, method,
//            class, interface, enum or module at the call site (so a constructor body or a class-body statement is
//            charged to its class); "<top>" when there is none.
//   calls*   (secondary diagnostic "calleeSet") key = callee only: which names the file calls, caller ignored.
//   imports  key = module string.
//   extends  key = child + "\u0001" + base. The gold relation label (extends/implements/mixin/embeds) is NOT part of
//            the key (labels are the gold's own vocabulary); relation agreement over matched edges is reported.
// Micro-averaged: TP, FP, FN pooled over scored files; P = TP/(TP+FP), R = TP/(TP+FN), F1 = 2PR/(P+R).
//
// SYSTEMS.
//   edges         adapters/code/edges.js with the received keyword prior. Prior = vendored priors/code-kw-<code>.json
//                 where one exists (python, javascript); for c/go/java/ruby no vendored file exists, so the prior is
//                 PROJECTED IN MEMORY from the giver (ethos/derived-priors/code-priors/<lang>-language-law-prior-v1.json,
//                 LanguageLawPrior@1, hard keywords only, the same projection scripts/build-code-keyword-prior.mjs
//                 makes) and labelled `projected-from-giver (not vendored)`. Giver note: those lists are tree-sitter
//                 derived, the SAME authority family as the gold; the prior only closes the keyword class, it carries no
//                 edge. It REFUSES a bare keyword as a callee; it never admits anything.
//   edges_noprior the same reader with keywords = null (ablation: what the prior buys).
//   callEdges     the existing adapters/text/code-structure.js parseDeclarations + callEdges (calls only: intra-file
//                 declared->declared). Not causal by construction: it resolves a call against declarations of the WHOLE
//                 file. It is measured as the baseline and its `lookahead_share` (edges whose every call site
//                 precedes the callee's declaration) is reported. Languages with no declaration recipe in it
//                 (ruby, java) are a typed gap, not a zero.
//
// CONTROLS BUILT TO FAIL (II.23 / II.4), all scored against the SAME gold:
//   fileShuffle   the system's edges of file pi(f) scored against gold of f. pi = rotation of the files ordered by
//                 (repo, path) by m = the largest repo block (forces a different repo whenever there is more than one);
//                 the share of files actually crossing repos is reported.
//   pairShuffle   (calls, extends) callers/children of file f paired positionally with callees/bases of file pi(f),
//                 same edge count as the system emitted for f. "Pair a caller from file A with callees from file B."
//   random        same edge count per file; callers/children drawn uniformly from the file's own system callers /
//                 children, callees/bases/modules drawn uniformly from the split-wide distinct vocabulary the system
//                 emitted. REPS = 25 replicates, seeded; the arm's counts are the replicate mean.
//   noPrior       (ablation, reported, NOT in `control`) edges_noprior.
// control = the strongest F1 among fileShuffle, pairShuffle, random. A control that does as well as the real arm
// means the instrument or the mechanism is broken, and is reported as such.
//
// SIGNIFICANCE. File-level paired bootstrap, B = 1000 resamples, seeded: the same resample for the real arm and every
// control; margin_b = F1_real - max control F1. CI = 2.5 and 97.5 percentiles. Files inside one repo are correlated
// (near-duplicate vocabulary), so the file bootstrap is optimistic; the per-repo check below is the counterweight.
//
// PASS RULE (per language; gating kinds = calls and imports; extends is reported, never gating).
// A gating kind K that is applicable and measured PASSES iff ALL of:
//   (a) CI lower bound of margin_K > 0;
//   (b) margin_K >= 0.10 (declared minimal effect: F1 points over the strongest control);
//   (c) LICENCE: strongest control F1 <= 0.5 * real F1 (the statistic MOVES under the perturbation; otherwise the
//       metric is dominated by file-independent vocabulary and K is reported `licence_failed`, pass=false);
//   (d) REPO CONSISTENCY: in every repo with >= 3 scored files and >= 10 gold edges of that kind, real F1 > that repo's
//       strongest control F1;
//   (e) COVERAGE: >= 20 scored files and >= 50 gold edges of that kind, else K is `pass:null` (too few, NOT a fail);
//   (f) CAUSALITY AUDIT of the reader (below) has zero violations on the sampled files.
// Language pass = AND over gating kinds that were measured; null when none was measurable. Absolute F1 is reported as
// `score` and is NOT a pass condition (the rung asks whether the reader recovers what the text orders beyond what
// vocabulary overlap alone gives, and the number is there to be read). Headline `score` = mean F1 of the measured
// gating kinds, `control` = mean of their strongest-control F1, `margin` = score - control.
//
// CAUSALITY AUDIT. For up to 12 scored files and cuts at 25/50/75 percent: read the prefix with final:false (the end of
// text is NOT a statement terminator, the last token is dropped as possibly truncated) and the whole file. Violation
// "retracted": a prefix edge absent from the full-file edges. Violation "missed": a full-file edge whose evidence
// ended before the prefix's consumed offset but is absent from the prefix. Zero of each = prefix-monotone = causal.
//
// PREDICTIONS (made blind, 2026-10-05, before any run). Dev, edges, micro-F1:
//   calls   python 0.55-0.80; go 0.55-0.80; c 0.55-0.80; java 0.50-0.75; javascript 0.45-0.75; ruby 0.25-0.55
//           (paren-less command calls are the hard part of ruby). imports: >= 0.90 for python, c, go, java;
//           javascript >= 0.85; ruby >= 0.80. extends: python/javascript/ruby 0.6-0.9; java 0.2-0.6 (gold blind spot
//           caps its precision); go 0.4-0.9; c not applicable.
//   controls  calls fileShuffle <= 0.12 and pairShuffle <= 0.12, random <= 0.03 in every language. imports
//           fileShuffle 0.10-0.50 for python/c/go (shared stdlib names) and <= 0.25 for java/ruby/javascript.
//   PASS    calls and imports pass in all six languages EXCEPT that I expect ruby calls to be the most likely failure;
//           the licence check (c) is the likeliest to fail for python and c imports (stdlib overlap), not the margin.
//   prior   noPrior costs calls precision: c >= 0.15 points (if/while/for/switch/return become calls), python >= 0.03,
//           javascript >= 0.03, go >= 0.05, java >= 0.05; if python and javascript both move < 0.01 the prior is not
//           earning its keep and that is the finding. Contextual keywords the giver lists as hard (js get/set/of/from,
//           java when/with/to/open/record) are predicted to COST recall a little; the noPrior arm will show it.
//   callEdges  calls F1 <= 0.25 (it can only emit intra-file declared callees) and precision >= 0.5; beats fileShuffle
//           but fails the 0.10-margin-over-reader comparison; lookahead_share >= 0.05 for python, javascript, go.
//   causality  zero violations for edges; callEdges is not run through the audit (its lookahead is measured directly).
//
// WHAT THIS DOES NOT CLAIM. It does not claim the reader understands semantics, resolves a callee to its definition,
// follows dynamic dispatch, or handles macros. It measures syntactic ordering against a grammar's parse. DEV only: the
// reader's recipes were developed while looking at DEV gold mismatches (disclosed below), so a DEV number is a
// development figure. The held-out TEST split is consumed once per language (ledger below) by the final card, never here.
//
// HELD-OUT DISCIPLINE. Split by repository (manifest.json). measure() on split "test" is refused if the ledger
// (C4_LEDGER, default /private/tmp/claude-501/coding-competence/test-ledger.json) already holds c4:<language>; a test
// run records itself. This agent ran DEV only.
//
// ===================================================================================================================
// AMENDMENTS AND RUN LOG (append only; never edit the sections above)
// ===================================================================================================================
// A1. FIRST DEV RUN, as run (2026-10-05, --limit 60, round-robin over repos, MAX_BYTES 150000; frozen here BEFORE any
//     fix made against DEV mismatches; two fixes to edges.js had been made earlier against AUTHORED probe snippets only:
//     python `from . import x`, and js `#private` names / declaration-header ownership of calls).
//   lang        files | calls: gold  P     R     F1    ctrl(max)  | imports: gold  P     R     F1    ctrl | extends: gold F1
//   python       60   |   968 1.000 1.000 1.000 0.025(random) |  260 1.000 1.000 1.000 0.104 |   8 1.000
//   javascript   60   |   764 1.000 0.999 0.999 0.076(random) |  158 1.000 0.829 0.907 0.178 |   7 1.000
//   c            59   |  2223 0.914 0.924 0.919 0.017(random) |  296 1.000 1.000 1.000 0.129 | n/a (gold: no inheritance)
//   go           60   |  2310 0.984 0.978 0.981 0.029(pair)   |  370 1.000 1.000 1.000 0.103 |   4 1.000
//   ruby         59   |  1860 0.988 0.980 0.984 0.037(pair)   |   51 1.000 1.000 1.000 0.098 |  82 1.000
//   java         60   |  2049 0.992 0.991 0.992 0.016(pair)   |  648 1.000 1.000 1.000 0.060 |  31 0.795 (gold blind spot)
//   Every language passes calls and imports on DEV; causality audit 0 retracted / 0 missed everywhere (12 files x 3 cuts).
//   noPrior calls precision cost: c 0.185, java 0.180, javascript 0.104, go 0.033, python 0.009, ruby 0.000 (ruby's
//   structural keywords are in the recipe, not the prior). callEdges: python 0.150, javascript 0.050, c 0.111, go 0.260
//   F1 (recall 0.03-0.15); lookahead_share python 0.057, javascript 0.091, c 0.180, go 0.372; ruby/java typed gap.
//   AGAINST THE BLIND PREDICTIONS: the reader is far BETTER than predicted on calls (ruby predicted 0.25-0.55, got 0.98;
//   python/go/c/java predicted 0.50-0.80, got 0.92-1.00), so those predictions FAILED on the pessimistic side. Met:
//   control ceilings (calls shuffles <= 0.12, random <= 0.03: yes except js random 0.076), import floors (js 0.907 >=
//   0.85), causality 0 violations, callEdges F1 <= 0.25 (go 0.260: marginally missed) and precision >= 0.5 (python 0.486:
//   marginally missed), lookahead_share >= 0.05 (met), noPrior c >= 0.15 (met), js >= 0.03 (met), java >= 0.05 (met),
//   python >= 0.03 (MISSED, 0.009) and go >= 0.05 (MISSED, 0.033), "python and js both < 0.01" (not met: js 0.104).
//   Predicted licence failure for python/c imports (stdlib overlap): did NOT happen (fileShuffle 0.104 / 0.129).
//   Reading: near-ceiling dev scores on regular syntax are a property of DEV repos and of syntax that is nearly context
//   free; they are NOT evidence about held-out repos or macro-heavy C. See limits in the final report.
// A2. Reporting additions made after A1 (no threshold, rule or control changed): `calls_at` (occurrence-level: callee
//     name at gold's start offset, caller ignored) and `caller_acc` (of the occurrences found, the share whose caller
//     agrees) split DETECTION from ATTRIBUTION and defeat the set-dedupe; `noScope` ablation (every caller <top>) shows
//     the pair metric really scores the caller binding. All three are reported outside `control` and outside the pass rule.
// (dev-loop log: each later fix to edges.js against DEV mismatches is appended below with before/after.)
// A3. AUDIT NOTE AND PRE-REGISTRATION OF A FRESH-DEV SLICE (2026-10-06; written BEFORE any fresh-slice run; no rule above changed).
//     (1) THE DEV-LOOP LOG PROMISED ABOVE WAS NOT KEPT. Re-running the present edges.js (git 0cb1492 plus a SCAN_CAP termination
//         guard that only bounds look-ahead/back loops to 2000 tokens) on the SAME first-60 DEV slices gives numbers that differ
//         from the A1 table (js imports recall 0.829 -> 1.000, c calls F1 0.919 -> 0.9996, go calls 0.981 -> 0.9998, ...). So
//         recipes were fixed against DEV mismatches between A1 and now, with no record of which. The first-60 DEV figures are
//         therefore DEVELOPMENT figures (the reader is fit to them, and edges.js itself carries comments naming tree-sitter
//         conventions it reproduces: a class declaration vs expression, `constructor` not a def, `#private` not a property).
//         They are NOT evidence of competence on unseen code. Present first-60 figures (reproduced 2026-10-06, same rule):
//           lang        calls: gold F1 ctrl(max)        | imports: gold F1 ctrl | extends: gold F1
//           python           968 1.0000 0.025(random)   |  260 1.0000 0.104     |   8 1.000
//           javascript       764 1.0000 0.074(random)   |  158 1.0000 0.144     |   7 1.000
//           c               2223 0.9996 0.022(random)   |  296 1.0000 0.129     |  n/a
//           go              2310 0.9998 0.032(pair)     |  370 1.0000 0.103     |   4 1.000
//           ruby            1860 1.0000 0.037(pair)     |   51 1.0000 0.098     |  82 1.000
//           java            2049 0.9995 0.016(pair)     |  648 1.0000 0.060     |  31 0.795 (gold blind spot)
//     (2) FRESH-DEV SLICE. A new option `offset` skips the first `offset` files of the SAME deterministic round-robin selection
//         (selectFiles), so `--offset 60 --limit 60` scores DEV files 61..120 of that order: files the A1/A3(1) numbers were
//         not computed on. Whether the earlier dev loop ever LOOKED at them is not recorded, so they are "not known to have
//         been looked at", not "held out". The slice shares its 3-5 repositories with the first-60 slice (DEV has only 3 repos
//         for python, javascript, go, ruby, java and 5 for c), so it tests generalisation across FILES inside known repos, never
//         across repositories: only the TEST split can do that and it is untouched. Same rule, controls and constants as above.
//         Output goes to c4-<language>-dev-offset60.json (the base file is never overwritten by an offset run).
//         PREDICTIONS for the fresh slice (point, band), made before running it:
//           calls   python 0.99 [0.95,1.00]; javascript 0.97 [0.90,1.00]; c 0.97 [0.88,1.00]; go 0.99 [0.95,1.00];
//                   ruby 0.97 [0.90,1.00]; java 0.99 [0.95,1.00].
//           imports >= 0.97 [0.92,1.00] for python, c, go, java, ruby; javascript 0.97 [0.90,1.00].
//           PASS    calls and imports pass wherever measurable. Likely nulls (typed gap, not a fail): ruby imports may fall below
//                   the 50 gold-edge coverage floor (51 on the first slice); extends is never gating.
//           DIRECTION fresh F1 <= first-60 F1 for every kind in every language (the dev loop could only have helped the first
//                   slice). If the fresh calls F1 is within 0.01 of the first-60 F1 in >= 5 of 6 languages, the near-ceiling
//                   number is not a first-slice artefact; if it is more than 0.03 lower in any language, the dev loop over-fit
//                   that language and that is the finding. Causality audit: 0 retracted / 0 missed.
//           CONTROLS unchanged in kind: calls shuffles <= 0.12 and random <= 0.10.
// A4. FRESH-DEV RUN, as run (2026-10-06; `--limit 60 --offset 60`, DEV files 61..120 of the round-robin; edges.js, rules and constants
//     unchanged between writing A3 and this run; edges.js = git 0cb1492 + the SCAN_CAP guard).
//   lang        files(repos) | calls: gold P      R      F1     ctrl(max)         | imports: gold F1     ctrl   | extends: gold F1
//   python       60(2)       | 1372 1.0000 1.0000 1.0000 0.020(random)           |  309 1.0000 0.084           |  24 1.000
//   javascript   60(3)       |  602 1.0000 1.0000 1.0000 0.025(random)           |  174 1.0000 0.099           |  12 1.000
//   c            60(2)       | 1100 0.9991 0.9973 0.9982 0.027(random)           |  214 1.0000 0.118           | n/a
//   go           60(3)       | 2083 1.0000 1.0000 1.0000 0.019(random)           |  386 1.0000 0.086           |  10 1.000
//   ruby         60(3)       | 1288 0.9992 1.0000 0.9996 0.018(pair)             |   47 1.0000 (null: < 50)    |  77 1.000
//   java         60(3)       | 1219 1.0000 1.0000 1.0000 0.015(random)           |  480 1.0000 0.049           |  33 0.880 (P 0.786; 9 FP, all gold blind spot)
//   Every gating kind with enough data PASSES on the fresh slice; ruby imports is pass:null (47 gold edges < 50, a typed coverage
//   gap and not a fail); causality audit 0 retracted / 0 missed in all six; fresh `noPrior` precision cost: python 0.011, javascript
//   0.164, c 0.193, go 0.043, java 0.143, ruby 0.000; callEdges F1 python 0.179, javascript 0.262, c 0.116, go 0.186 (ruby/java typed
//   gap), lookahead_share python 0.164, javascript 0.099, c 0.117, go 0.557.
//   AGAINST THE A3 PREDICTIONS: every calls and imports value is inside its band (the point predictions were again too pessimistic);
//   the predicted ruby imports coverage null happened; controls <= 0.027 (met). The DIRECTION clause FAILED as written: fresh F1 was
//   lower than first-60 only for ruby calls (1.0000 -> 0.9996) and c calls (0.9996 -> 0.9982), equal for python and javascript,
//   and HIGHER for go (0.9998 -> 1.0000) and java (0.9995 -> 1.0000). The other clause held: all six fresh calls F1 are within
//   0.002 of the first-60 value (>= 5 of 6 within 0.01) and none is lower by 0.03, so the near-ceiling number is not an artefact of
//   the particular 60 files per language. What it still does not show: other repositories (python and c fresh slices have only 2
//   repos), files over 150 kB, or anything the grammar gets wrong in the SAME way as the reader (xauth-c4-edges.mjs probes that).
// A5. SECOND AUTHORITY: eval/coding-competence/xauth-c4-edges.mjs scores the same DEV slices against python's own `ast`, ruby's own
//     `Ripper` and node's bundled `acorn` for javascript (go, java, c: typed gap, no engine). Result in that file's run log: the reader equals the tree-sitter
//     edges to the edge (reader~gold F1 1.000 on every kind in ruby), python and javascript agree with the grammar to 0.997-1.000, and ruby's distance to Ripper (calls F1 0.974 / 0.997) is the
//     grammar's: operator/setter defs and capitalised calls such as `Array(x)` follow the grammar's convention, not the parser's.
// A6. PRIORS: the SYSTEMS paragraph above says c/go/java/ruby had no vendored keyword prior. By 2026-10-06 priors/code-kw-{c,go,java,
//     ruby}.json exist and priorFor() resolves a vendored CodeKeywordPrior@1 for all six languages (the projection fallback is
//     unused in the figures above). The giver of those files is the tree-sitter grammar, the same authority family as the gold.
// A7. RESULT LAYOUT (2026-10-06, reporting only; no rule, control, constant or reader changed). The aggregator (run.mjs) audits any
//     `controls` entry at or above the score, so the prior ablation (noPrior) and the occurrence-level / callee-only views, which are
//     not controls, moved from `controls` to `details.ablations`; `controls` keeps the arms built to fail (fileShuffle, pairShuffle,
//     random, and the caller-ablated noScope). The result also carries `language`, `licence` {ok, rule, kinds} (ok = every measured
//     gating kind passed the licence clause) and a typed `reason` when no gating kind applies, and `margin` is computed from the
//     rounded score and control so that margin == score - control to the printed digits.
// A8. REVIEW-DRIVEN STRENGTHENING (2026-10-06). Written AFTER (i) re-running the UNMODIFIED instrument on DEV --limit 60 as a
//     baseline (calls F1 / imports F1: python 1.0000 / 1.0000, javascript 1.0000 / 1.0000, c 0.9996 / 1.0000, go 0.9998 / 1.0000,
//     A3's figures to the digit; train c calls 0.9004 with python/cpython Python_ceval.c at 0.0165), and (ii) ONE probe of the C
//     scope fix below on the file that motivated it (Python_ceval.c, TRAIN: pair F1 0.0165 -> 0.9972, its two remaining false
//     positives are the gold-side extent artefact of (7)); and BEFORE any run of the strengthened instrument. A review found the
//     pass rule could not fail a mostly-wrong reader and the TEST discipline had holes. Nothing in A1..A7 is edited; clauses are
//     ADDED, so no verdict that failed before can pass now. Dated amendment, as READING-POLICY II.5 requires, BEFORE re-running.
//     (1) WHAT THE SHUFFLE CONTROLS TEST. fileShuffle, pairShuffle and random test whether the reader's edges are BOUND TO THE FILE
//         (vocabulary-vs-file binding), NOT whether the reader recovers structure: any regex that lists the file's own `name(`
//         tokens passes them with ease. They are the LICENCE controls (clause c: the statistic moves under the perturbation) and
//         nothing more. The review's scratch figure: a vocabulary-aware regex scores far above them (callee-set F1 python 0.901,
//         javascript 0.881, c 0.649, go 0.840 on 40 DEV files), so "beats shuffled and random, licence ok" alone says almost nothing.
//     (2) NAIVE-LEXICAL ARM (naiveLexical(), below), FROZEN here. The skeptic's reader: no lexer (strings and comments are just text),
//         no scope stack, no causality (it sees the whole file). calls: every `identifier(` in the raw text, minus the SAME received
//         keyword prior (it refuses a bare keyword, like the reader) and minus the name a definition regex has just introduced; the
//         caller is the name captured by the LAST definition regex match before the call site (`<top>` before the first). Definition
//         regexes, one set per language, written from the language reference: python def|class; javascript function|class|`const f =
//         function|=>`|`name(..) {` member; c a column-0 declarator line; go func|type..struct|interface; ruby def|class|module; java
//         class|interface|enum|record and modified method headers. imports: one line regex per language as that language writes its
//         import (python import|from..import; javascript import..from|import "x"|require("x"); c #include; go import "x" and import
//         blocks; java import [static]; ruby require|require_relative). It is never shown gold. Disclosure: the review's callee-set
//         figures above were known when this was written; this arm is a re-implementation and its CALLER-BOUND (pair) scores were not.
//     (3) NEW PASS CLAUSES (per gating kind that has a naive arm = calls and imports; extends has none and stays ungated).
//         (g) NAIVE BASELINE: let N = naive F1 on the same files, headroom = 1 - N, required = min(MIN_MARGIN, HEADROOM_FRACTION x
//             headroom) (0.10 when the naive arm is weak; when it leaves little room, the reader must remove at least half of the
//             naive arm's errors: a margin of 0.10 is unreachable above N = 0.90 and a gate that cannot be passed is as uninformative as
//             one that cannot be failed). PASS needs: the 95% bootstrap CI lower bound of (F1_real - N) > 0 (the SAME resamples as the
//             controls), F1_real - N >= required, and F1_real > N in every judged repo (>= 3 files and >= 10 gold edges). Failing any
//             of these is pass:false. TYPED NON-DISCRIMINATION: if headroom < MIN_HEADROOM (0.02: the margin cannot be resolved on a
//             few dozen files) and F1_real >= N, the kind is pass:null with reason non_discriminating_vs_naive (the rung cannot tell
//             the reader from a regex there: a gap, never a pass and never silently good); F1_real < N is a plain fail.
//         (h) CATASTROPHIC FILES: a scored file with >= CATASTROPHIC_MIN_EDGES (20) gold edges of the kind and per-file F1 <
//             CATASTROPHIC_F1 (0.5) is a catastrophic file. MAX_CATASTROPHIC = 0 for a gating kind to pass (micro-F1 hid one 705-edge
//             file at 0.0165). Always reported: per-file F1 distribution (min, p05, p25, median, p75) and the file names.
//         (i) READER ERRORS: a lexer or reader exception (readEdges returns disclosure.error, with partial or empty edges) is a typed
//             gap reader_error with its denominator and is never silently scored as plain zero recall. The file stays scored (dropping
//             it would flatter the reader) AND MAX_READER_ERRORS = 0 for the language to pass: the reader is the thing under test.
//         Clauses a-f are unchanged. The naive arm is also listed in `controls` as <kind>_naiveLexical, and the headline `control` is
//         the mean over measured gating kinds of the strongest of (fileShuffle, pairShuffle, random, naiveLexical), so the headline
//         `margin` is the margin over the strongest rival. The licence clause (c) stays about the perturbation controls only: a rival
//         reader is not a perturbation and is not expected to fall below half of the real score.
//     (4) DEV IS A DEVELOPMENT FIGURE. Every result of a split other than test carries `development: true` and a verdict_label
//         PASS-DEV / FAIL-DEV / UNMEASURED; only a TEST run (once) can carry PASS / FAIL. Gold = tree-sitter grammars PLUS khora's own
//         gold.py mapping of their nodes to calls/defs/extends (a khora-authored convention), and edges.js reproduces that convention
//         by name (constructor is not a def, #private is not a property, a class declaration vs expression, `new` is not a call).
//         F1 = 1.0000 on DEV is therefore conformance to that mapping, not competence. A second authority exists only for python
//         (stdlib ast), ruby (Ripper) and javascript (acorn) in xauth-c4-edges.mjs; C, Go and Java have NONE (result.provenance.
//         second_authority is null, a typed gap). run.mjs is not edited here: it should print `development: true` results as PASS-DEV.
//     (5) UNSEEN-REPOSITORY PROBE. The TRAIN split holds repositories the DEV loop never touched, and no prior is built from them
//         (the keyword priors come from the tree-sitter giver). A dev run scores the first PROBE_LIMIT = 60 round-robin TRAIN files
//         with the identical instrument and attaches the summary (score, control, naive margin, catastrophic files, reader errors,
//         per repo) as details.unseen_repo_probe. It is a probe, never gating, and it is NOT held out in the TEST sense: the
//         reviewer already ran it, and the C scope fix of (7) was motivated by one of its files, so for C the probe no longer
//         measures that fix on unseen code (stated in the result). The one true held-out figure remains the single TEST run.
//     (6) TEST DISCIPLINE. (a) measure() refuses --limit as well as --offset on test (a sample read would spend TEST). (b) The ledger
//         entry is claimed (status started, under an O_EXCL lock) BEFORE any test file is read and marked completed or failed after,
//         so a crash after the read still counts as consumption; the claim comes after the checks that read no test data (reader
//         exists, gold toolchain, manifest). (c) A refused run returns refused:true and the CLI writes c4-<lang>-<split>-refused.json,
//         never the card; a test card is created with the wx flag and a second one goes to ...-dup-<ms>.json with exit code 3.
//         (d) --allow-retest is gone from the CLI; the programmatic option remains for the tests and is LOGGED (ledger retests[], result
//         retest:true and a note), never silent. (e) The ledger lives in /private/tmp and could be wiped, so a test card already on disk
//         (c4-<lang>-test.json in the out dir) is also treated as consumption. File placement is writeResult().
//     (7) C SCOPE. Reader (edges.js readC, EDGES_VERSION edges-2): the arms of #if/#elif/#else/#endif are alternatives. The lexer emits a
//         `ppd` marker (a nl-typed token every lookup already skips); at #else/#elif the scope is rewound to its state at the #if, and
//         at #endif the reader commits to the state at the end of the first arm. Prefix-only, so causal. Gold side (defExtent below):
//         the brace matcher over gold's tokens had the SAME flaw (the extent of Python_ceval.c's first function ran to end of file, so
//         file-scope calls after it were charged to it), so it applies the same alternatives rule to gold's own `#if/#else/#endif`
//         tokens. That is a change to how gold keys are DERIVED for C files with diverging arms (a gold-convention repair, not a
//         tuning to the reader); both sides are reported before and after in the run log.
//     (8) PREDICTIONS (point [band]), made before any run of the strengthened instrument, DEV --limit 60 unless stated.
//         naive CALLS pair-level F1: python 0.78 [0.55,0.90]; javascript 0.60 [0.40,0.80]; c 0.58 [0.40,0.80]; go 0.75 [0.55,0.90].
//         naive IMPORTS F1: python 0.98 [0.93,1.00]; javascript 0.92 [0.80,0.98]; c 0.99 [0.93,1.00]; go 0.99 [0.93,1.00].
//         Real arm: calls and imports F1 unchanged to 4 digits for python, javascript, go; c within 0.002 of the baseline above.
//         Verdicts: calls PASS (clause g included) in all four languages; imports: pass:null non_discriminating_vs_naive in at least two
//         of python, c, go (their regex is near perfect), PASS for javascript; language pass true in all four, carried by calls, with the
//         imports gap typed. Catastrophic files 0 and reader errors 0 on DEV in all four; train c: 1 catastrophic file before the fix,
//         0 after. Causality audit 0 retracted / 0 missed in all four (the ppd marker must not break prefix-monotonicity).
//         Unseen probe (TRAIN, limit 60): calls F1 >= 0.98 for python, javascript, go; c >= 0.97 (was 0.9004); every language
//         margin over naive >= 0.05. A language whose reader beats the naive arm by LESS than required, or any catastrophic file, is
//         a finding and is reported as a failure, not a threshold to move.
//     (9) STILL NOT CLAIMED. Semantics, callee resolution, dynamic dispatch, macros. Not a competence PASS on any DEV or TRAIN
//         result. C, Go and Java have a single authority.
// A9. FIRST RUN OF THE STRENGTHENED INSTRUMENT, AS RUN (2026-10-06; `--limit 60`, edges.js edges-2, the A8 rule exactly as written;
//     the unseen-repo probe is TRAIN `--limit 60`). Real-arm F1 is identical to the baseline of A8 in all four languages
//     (python 1.0000/1.0000, javascript 1.0000/1.0000, c 0.9996/1.0000, go 0.9998/1.0000 calls/imports).
//   lang        DEV: naive calls F1 (P,R)    margin [CI95]       req.   | naive imports F1 -> imports verdict | catastrophic / reader errors
//   python           0.9047 (0.858,0.957)   0.0953 [0.079,0.115] 0.0476 | 1.0000 -> null non_discriminating   | 0 of 21 / 0 of 60
//   javascript       0.4693 (0.445,0.496)   0.5307 [0.360,0.628] 0.1000 | 0.9937 -> null non_discriminating   | 0 of 9  / 0 of 60
//   c                0.7811 (0.676,0.924)   0.2185 [0.108,0.417] 0.1000 | 0.9983 -> null non_discriminating   | 0 of 21 / 0 of 59
//   go               0.9303 (0.879,0.989)   0.0694 [0.048,0.088] 0.0348 | 1.0000 -> null non_discriminating   | 0 of 30 / 0 of 60
//   Calls PASS in all four (headline control = the naive arm: python 0.9047, javascript 0.4693, c 0.7811, go 0.9303; headline margin
//   0.0953, 0.5307, 0.2185, 0.0695), imports are typed gaps in all four, language pass true = PASS-DEV, causality 0 retracted / 0 missed.
//   C scope on python/cpython Python_ceval.c (TRAIN): pair F1 0.0165 (before) -> 0.9972 (reader fix) -> 1.0000 (reader fix + gold-side
//   extent); TRAIN C calls pooled 0.9004 -> 0.9966 with zero catastrophic files (was one).
//   UNSEEN PROBE (TRAIN, as run): python 5 repos calls 1.0000 (naive 0.7751), imports 0.9988 vs naive 0.9889 (null), PASS-TRAIN; javascript 4
//   repos calls 0.9985 (naive 0.4970), imports 1.0000 vs naive 0.9723: pass:false `naive_repo_inconsistent: ElemeFE/element,TanStack/query`,
//   FAIL-TRAIN; c 10 repos calls 0.9966 (naive 0.9534, margin 0.0432), imports 1.0 vs 1.0 (null), PASS-TRAIN; go 5 repos calls 0.9995 (naive
//   0.9113, margin 0.0882), imports 1.0000 vs naive 0.9795: pass:false (`naive_ci_lower_not_above_zero` and `naive_repo_inconsistent:
//   apache/thrift,google/flatbuffers,ollama/ollama`), FAIL-TRAIN.
//   AGAINST THE A8 (8) PREDICTIONS. MET: real-arm F1 unchanged (4 of 4); calls PASS (4 of 4); catastrophic 0, reader errors 0, causality 0/0;
//   imports null in at least two of python/c/go (it is all three); naive imports python/c/go inside their bands; naive calls javascript and c
//   inside their bands; probe calls F1 >= 0.98 for python/javascript/go and c >= 0.97; train c catastrophic 1 -> 0. MISSED: naive calls F1
//   for python 0.9047 (band [0.55,0.90]) and go 0.9303 (band [0.55,0.90]), the naive arm is STRONGER than I predicted there; naive imports for
//   javascript 0.9937 (band [0.80,0.98]); "imports PASS for javascript" (it is null, not a pass); "every language margin over naive >= 0.05 on
//   the probe" (c: 0.0432). NOT PREDICTED: two probe imports verdicts of FAIL-TRAIN (javascript, go) for a reader at F1 1.0000 on imports.
//   WHAT THE RESULT SAYS. (1) The reader beats the strongest rival by a margin that is thin on python (0.095) and go (0.069): it clears
//   the declared headroom rule (it removes all of the naive arm's errors) and would NOT clear a flat 0.10, so the headline margin is the
//   figure to read. (2) The imports rung cannot tell the reader from a line regex on DEV (a typed gap everywhere), so the C4 pass is carried
//   by calls alone. (3) The two probe FAILs are defects of clause (g) as written, found by the data and recorded as such in A10.
// A10. AMENDMENT TO CLAUSE (g), 2026-10-06, written AFTER A9 and BEFORE the re-run; a post-hoc change made against probe data, disclosed as
//     such. Only the per-repo part changes; MIN_HEADROOM, HEADROOM_FRACTION, required margin, the CI test and every other clause stand.
//     DEFECT: "F1_real > N in every judged repo" is unsatisfiable where the naive arm is perfect in that repo (nothing is strictly above
//     1.0); the aggregate case was already typed (saturation), the per-repo case was not. A reader that ties a perfect regex is not worse
//     than it. CORRECTED RULE: in every judged repo F1_real >= N_repo, and strictly greater unless 1 - N_repo < MIN_HEADROOM (the repo then
//     cannot discriminate; it is listed in naive.repos_not_discriminating and not counted as a failure). A reader BELOW the regex in a repo
//     still fails the kind. EFFECT, stated before the re-run: no DEV verdict changes (every DEV imports kind is saturated and every DEV
//     calls kind passes with strict > in all judged repos); the javascript probe imports verdict can change from false to a pass; the go probe
//     imports verdict stays false (its CI clause, below). DISCLOSED, NOT FIXED HERE: the go probe case (reader 1.0000, naive 0.9795, headroom
//     0.0205 a hair above the 0.02 cliff, the naive errors concentrated in a few files so the 95% CI of the margin includes 0) shows that clause
//     (g) can fail a PERFECT reader for lack of resolution when the headroom sits just above MIN_HEADROOM. A power-based replacement (the kind
//     is non-discriminating when even a perfect reader's margin 1 - N has a bootstrap CI that includes 0) is proposed, not applied: it would
//     change a second verdict after seeing it, and it must be decided before the single TEST run, not after.
// A11. RE-RUN AFTER A10, AS RUN (2026-10-06, DEV `--limit 60` plus the TRAIN probe `--limit 60`; rule = A8 + A10, edges-2). Every DEV
//     figure and verdict is IDENTICAL to A9 (the A10 prediction held: python/javascript/go/c calls PASS, imports null non_discriminating,
//     language PASS-DEV in all four, headline margin over the strongest rival 0.0953 / 0.5307 / 0.2185 / 0.0695). The only changes are on
//     the probe: javascript TRAIN imports (reader 1.0000, naive 0.9723) false -> PASS (the two tied repos are now not discriminating),
//     javascript probe PASS-TRAIN (calls 0.9985 vs naive 0.4970); go TRAIN imports stays pass:false (`naive_ci_lower_not_above_zero: real 1
//     vs naive 0.9795`), go probe FAIL-TRAIN, which is the disclosed resolution defect of A10, not a reader miss. python probe PASS-TRAIN,
//     c probe PASS-TRAIN. The one reader miss the probe shows on imports is python TRAIN Lib_typing.py `lazy import annotationlib` (PEP 810
//     syntax newer than the recipe; imports 0.9988); it is NOT fixed here (outside the findings, and it would spend the TRAIN probe).
//     Untouched and open: TEST (ledger empty for c4), a second authority for C/Go/Java, the extends kind (< 50 gold edges in every language).
//
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { goldBatch, goldAvailable } from "./gold.mjs";
import { readEdges, keywordsFor, edgeLanguages } from "../../adapters/code/edges.js";
import { parseDeclarations, callEdges } from "../../adapters/text/code-structure.js";

export const RUNG = Object.freeze({
  id: "C4",
  ladder: "R4",
  name: "edges",
  question: "Does the reader recover what a source file ORDERS (calls caller->callee, imports file->module, inheritance child->base) from its prefix, with received keyword priors, beyond what shuffled and random edges score?",
});

// ---- declared constants (every threshold is declared; none tuned after a run) -----------------------------------
export const CONST = Object.freeze({
  MAX_BYTES: 150_000,        // dev smoke budget: larger files are a typed gap (file_too_large)
  PARSE_TOL: 0.02,           // gold.py P2 tolerance
  MIN_FILES: 20,
  MIN_EDGES: 50,
  MIN_MARGIN: 0.10,
  LICENCE_RATIO: 0.5,
  REPO_MIN_FILES: 3,
  REPO_MIN_EDGES: 10,
  BOOT: 1000,
  REPS: 25,
  SEED: 0xc4ed6e5,
  CAUSAL_FILES: 12,
  CAUSAL_CUTS: Object.freeze([0.25, 0.5, 0.75]),
  // ---- A8 (2026-10-06), declared before the strengthened instrument's first run ----
  HEADROOM_FRACTION: 0.5,    // (g) the reader must remove at least this share of the naive arm's errors when 0.10 is unreachable
  MIN_HEADROOM: 0.02,        // (g) below this headroom the margin cannot be resolved: non_discriminating_vs_naive (pass:null)
  CATASTROPHIC_F1: 0.5,      // (h) a file below this per-file F1 ...
  CATASTROPHIC_MIN_EDGES: 20, // (h) ... that has at least this many gold edges of the kind is catastrophic
  MAX_CATASTROPHIC: 0,       // (h) allowed catastrophic files for a gating kind to pass
  MAX_READER_ERRORS: 0,      // (i) allowed lexer/reader exceptions for the language to pass
  PROBE_LIMIT: 60,           // (5) TRAIN files scored by the standing unseen-repository probe
});
export const GATING = Object.freeze(["calls", "imports"]);
export const KINDS = Object.freeze(["calls", "imports", "extends"]);
export const CALLER_KINDS = new Set(["function", "method", "class", "interface", "enum", "module"]);
const DECLARATOR_ONLY = new Set(["c"]); // gold def spans the declarator, not the body
const SEP = "\u0001";
const TOP = "<top>";
// read at call time (not at import) so a test or a scratch run can redirect them with the environment
const OUT_DIR = () => process.env.C4_OUT_DIR || "/private/tmp/claude-501/coding-competence";
const MANIFEST = () => process.env.C4_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";
const LEDGER = () => process.env.C4_LEDGER || "/private/tmp/claude-501/coding-competence/test-ledger.json";
const GIVER_DIR = "/Users/mlacy/Documents/3.0/ethos/derived-priors/code-priors";
const LANG_ALIAS = { py: "python", js: "javascript", rb: "ruby" };

// ---- small deterministic helpers ----------------------------------------------------------------------------------
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(...parts) {
  const h = crypto.createHash("sha256").update(parts.join("|")).digest();
  return h.readUInt32LE(0) ^ CONST.SEED;
}
export function finalName(s) {
  const t = String(s ?? "");
  const i = Math.max(t.lastIndexOf("::"), t.lastIndexOf("."));
  const j = t.lastIndexOf("::") > t.lastIndexOf(".") ? t.lastIndexOf("::") + 2 : i + 1;
  return t.slice(j);
}
const key2 = (a, b) => `${a}${SEP}${b}`;

// ---- counts, F1 ----------------------------------------------------------------------------------------------------
export function countSets(sys, gold) {
  let tp = 0;
  for (const k of sys) if (gold.has(k)) tp += 1;
  return { tp, fp: sys.size - tp, fn: gold.size - tp };
}
export function prf(c) {
  const p = c.tp + c.fp > 0 ? c.tp / (c.tp + c.fp) : null;
  const r = c.tp + c.fn > 0 ? c.tp / (c.tp + c.fn) : null;
  const f1 = p !== null && r !== null && p + r > 0 ? (2 * p * r) / (p + r) : (c.tp + c.fp + c.fn === 0 ? null : 0);
  return { precision: p, recall: r, f1, tp: c.tp, fp: c.fp, fn: c.fn };
}
const add = (a, b) => ({ tp: a.tp + b.tp, fp: a.fp + b.fp, fn: a.fn + b.fn });
const ZERO = () => ({ tp: 0, fp: 0, fn: 0 });
const f1Of = (c) => { const x = prf(c).f1; return x === null ? 0 : x; };
const round = (x, d = 4) => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

// ---- gold edges ----------------------------------------------------------------------------------------------------
/** Callable extent of a gold def: [start, end). Declarator-only languages are extended over the brace body using gold's
 *  own punctuation tokens (strings/comments are atomic tokens, so a brace inside either never counts). */
export function defExtent(def, gold, text, language) {
  if (!DECLARATOR_ONLY.has(language)) return [def.start, def.end];
  const toks = gold.tokens;
  let lo = 0, hi = toks.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (toks[mid].start < def.end) lo = mid + 1; else hi = mid; }
  let i = lo;
  while (i < toks.length && toks[i].class === "comment") i += 1;
  if (i >= toks.length || text.slice(toks[i].start, toks[i].end) !== "{") return [def.start, def.end];
  let depth = 0;
  // A8 (7): the arms of #if/#elif/#else/#endif are ALTERNATIVES. Gold keeps both arms' tokens, so `#if A { #else { #endif ... }`
  // opened two braces and closed one, and the function's extent ran to the end of the file (Python_ceval.c). At #else/#elif the
  // depth is rewound to its value at the #if; at #endif it is the depth at the end of the first arm. Gold's own `#...` tokens drive it.
  const pps = [];
  for (; i < toks.length; i++) {
    const tk = toks[i];
    if (tk.class !== "punctuation") {
      if (tk.end - tk.start <= 10) {
        const d = /^#\s*(ifdef|ifndef|if|elifdef|elifndef|elif|else|endif)$/.exec(text.slice(tk.start, tk.end));
        if (d) {
          const k = d[1] === "else" || d[1].startsWith("elif") ? "alt" : d[1] === "endif" ? "end" : "open";
          if (k === "open") pps.push({ entry: depth, first: null, arm: 0 });
          else if (pps.length) {
            const f = pps[pps.length - 1];
            if (k === "alt") { if (f.arm === 0) { f.first = depth; f.arm = 1; } depth = f.entry; }
            else { pps.pop(); if (f.arm > 0) depth = f.first; }
          }
        }
      }
      continue;
    }
    const s = text.slice(tk.start, tk.end);
    if (s === "{") depth += 1;
    else if (s === "}") { depth -= 1; if (depth === 0) return [def.start, tk.end]; }
  }
  return [def.start, text.length];
}

/** Gold edges of one file: { calls:Set, calleeSet:Set, imports:Set, extends:Set, relations:Map } */
export function goldEdgesOf(gold, text, language) {
  const defs = [];
  for (const d of gold.defs ?? []) {
    if (!CALLER_KINDS.has(d.kind) || !d.name) continue;
    const [s, e] = defExtent(d, gold, text, language);
    if (e > s) defs.push({ name: finalName(d.name), s, e });
  }
  const calls = new Set(), calleeSet = new Set(), callsAt = new Set(), callerAt = new Map();
  for (const c of gold.calls ?? []) {
    let best = null;
    for (const d of defs) if (d.s <= c.start && c.start < d.e && (best === null || d.s >= best.s)) best = d;
    const callee = finalName(c.callee);
    const caller = best ? best.name : TOP;
    calls.add(key2(caller, callee));
    calleeSet.add(callee);
    callsAt.add(`${callee}@${c.start}`);
    callerAt.set(`${callee}@${c.start}`, caller);
  }
  const imports = new Set((gold.imports ?? []).map((i) => i.module));
  const ext = new Set(), relations = new Map();
  for (const x of gold.extends ?? []) {
    const k = key2(finalName(x.child), finalName(x.base));
    ext.add(k);
    relations.set(k, x.relation);
  }
  return { calls, calleeSet, callsAt, callerAt, imports, extends: ext, relations };
}

// ---- system edges --------------------------------------------------------------------------------------------------
export function systemEdgesFrom(res) {
  const calls = new Set(), calleeSet = new Set(), callsAt = new Set(), callerAt = new Map(), imports = new Set(), ext = new Set(), relations = new Map();
  for (const c of res.calls ?? []) { calls.add(key2(c.caller ?? TOP, c.callee)); calleeSet.add(c.callee); callsAt.add(`${c.callee}@${c.at}`); callerAt.set(`${c.callee}@${c.at}`, c.caller ?? TOP); }
  for (const i of res.imports ?? []) imports.add(i.module);
  const shapes = new Map();
  for (const x of res.extends ?? []) { const k = key2(x.child, x.base); ext.add(k); relations.set(k, x.relation); if (x.shape) shapes.set(k, x.shape); }
  return { calls, calleeSet, callsAt, callerAt, imports, extends: ext, relations, shapes };
}

// ---- the naive-lexical arm (A8 (2)): a skeptic's regex, frozen before the first run -----------------------------------
// No lexer, no scope stack, no causality: it reads the whole file as raw text. It receives the SAME keyword prior (refusal)
// and is never shown gold. It is a RIVAL READER, not a perturbation: it is held to clause (g), never to the licence clause.
const NAIVE_CALL_RE = {
  python: /(?<![\w])([A-Za-z_]\w*)[ \t]*\(/g,
  javascript: /(?<![\w$])([A-Za-z_$][\w$]*)[ \t]*\(/g,
  c: /(?<![\w])([A-Za-z_]\w*)[ \t]*\(/g,
  go: /(?<![\w])([A-Za-z_]\w*)[ \t]*\(/g,
  ruby: /(?<![\w])([A-Za-z_]\w*[?!]?)[ \t]*\(/g,
  java: /(?<![\w$])([A-Za-z_$][\w$]*)[ \t]*\(/g,
};
const NAIVE_DEF_RES = {
  python: [/\b(?:def|class)[ \t]+([A-Za-z_]\w*)/dg],
  javascript: [
    /\bfunction[ \t]*\*?[ \t]*([A-Za-z_$][\w$]*)/dg,
    /\bclass[ \t]+([A-Za-z_$][\w$]*)/dg,
    /\b(?:const|let|var)[ \t]+([A-Za-z_$][\w$]*)[ \t]*=[ \t]*(?:async[ \t]*)?(?:function\b|\([^()\n]*\)[ \t]*=>|[A-Za-z_$][\w$]*[ \t]*=>)/dg,
    /^[ \t]+(?:(?:async|static|get|set)[ \t]+)*([A-Za-z_$][\w$]*)[ \t]*\([^()\n]*\)[ \t]*\{/dgm,
  ],
  c: [/^(?!#)(?:[A-Za-z_][\w \t*]*?[ \t*])?([A-Za-z_]\w*)[ \t]*\(/dgm],
  go: [/\bfunc[ \t]+(?:\([^)\n]*\)[ \t]*)?([A-Za-z_]\w*)/dg, /\btype[ \t]+([A-Za-z_]\w*)[ \t]+(?:struct|interface)\b/dg],
  ruby: [/\bdef[ \t]+(?:[A-Za-z_]\w*\.)?([A-Za-z_]\w*[?!=]?)/dg, /\b(?:class|module)[ \t]+(?:[A-Z]\w*::)*([A-Z]\w*)/dg],
  java: [
    /\b(?:class|interface|enum|record)[ \t]+([A-Za-z_$][\w$]*)/dg,
    /^[ \t]+(?:(?:public|protected|private|static|final|abstract|synchronized|native|default)[ \t]+)+(?:<[^>\n]+>[ \t]+)?(?:[\w$.<>\[\],?]+[ \t]+)?([A-Za-z_$][\w$]*)[ \t]*\(/dgm,
  ],
};
/** Module strings as the language's import statement writes them, from one line-level regex family per language. */
function naiveImports(text, language) {
  const out = new Set();
  const grab = (re, g = 1) => { re.lastIndex = 0; let m; while ((m = re.exec(text))) { if (m[g]) out.add(m[g]); if (m[0] === "") re.lastIndex += 1; } };
  if (language === "python") {
    let m;
    const imp = /^[ \t]*import[ \t]+([^\n#;]+)/gm;
    while ((m = imp.exec(text))) for (const part of m[1].split(",")) { const mod = part.trim().split(/\s+as\s+/)[0].trim(); if (mod) out.add(mod); }
    grab(/^[ \t]*from[ \t]+([.\w]+)[ \t]+import\b/gm);
  } else if (language === "javascript") {
    grab(/\bimport\s*(?:[^'";]*?\bfrom\s*)?['"]([^'"\n]+)['"]/g);
    grab(/\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g);
  } else if (language === "c") {
    grab(/^[ \t]*#[ \t]*(?:include|import)[ \t]*[<"]([^>"\n]+)[>"]/gm);
  } else if (language === "go") {
    grab(/^[ \t]*import[ \t]+(?:[\w.]+[ \t]+)?"([^"\n]+)"/gm);
    let b; const blk = /\bimport[ \t]*\(([^)]*)\)/g;
    while ((b = blk.exec(text))) { let m; const q = /(?:^|\n)[ \t]*(?:[\w.]+[ \t]+)?"([^"\n]+)"/g; while ((m = q.exec(b[1]))) out.add(m[1]); }
  } else if (language === "java") {
    grab(/^[ \t]*import[ \t]+(?:static[ \t]+)?([\w.]+(?:\.\*)?)[ \t]*;/gm);
  } else if (language === "ruby") {
    grab(/^[ \t]*(?:require|require_relative)[ \t(]+['"]([^'"\n]+)['"]/gm);
  }
  return out;
}
/** The naive reading of one file: { calls:Set(caller\u0001callee), calleeSet:Set, imports:Set }. null language -> null. */
export function naiveLexical(text, language, keywords = null) {
  const callRe = NAIVE_CALL_RE[language];
  if (!callRe) return null;
  const refused = (n) => Boolean(keywords && keywords.has(n));
  const defs = [], defStart = new Set();
  for (const re of NAIVE_DEF_RES[language]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m[0] === "") { re.lastIndex += 1; continue; }
      const [a] = m.indices[1];
      if (!refused(m[1])) { defs.push({ pos: a, name: m[1] }); }
      defStart.add(a); // a definition's own name is never a call, keyword or not
    }
  }
  defs.sort((x, y) => x.pos - y.pos);
  const calls = new Set(), calleeSet = new Set();
  callRe.lastIndex = 0;
  let m;
  while ((m = callRe.exec(text))) {
    const at = m.index;
    const name = m[1];
    if (refused(name) || defStart.has(at)) continue;
    let lo = 0, hi = defs.length; // last def whose name position precedes the call
    while (lo < hi) { const mid = (lo + hi) >> 1; if (defs[mid].pos < at) lo = mid + 1; else hi = mid; }
    calls.add(key2(lo > 0 ? defs[lo - 1].name : TOP, name));
    calleeSet.add(name);
  }
  return { calls, calleeSet, imports: naiveImports(text, language) };
}

// ---- controls ------------------------------------------------------------------------------------------------------
/** Rotation derangement over files ordered by (repo, id): shift by the largest repo block. */
export function derange(files) {
  const order = files.map((f, i) => i).sort((a, b) => (files[a].repo < files[b].repo ? -1 : files[a].repo > files[b].repo ? 1 : files[a].id < files[b].id ? -1 : 1));
  const n = order.length;
  const blocks = new Map();
  for (const f of files) blocks.set(f.repo, (blocks.get(f.repo) ?? 0) + 1);
  const m = Math.max(...blocks.values());
  const shift = n < 2 ? 0 : (m < n ? m : Math.ceil(n / 2)) % n;
  const pi = new Array(n);
  for (let j = 0; j < n; j++) pi[order[j]] = order[(j + shift) % n];
  const cross = n ? pi.filter((p, i) => files[p].repo !== files[i].repo).length / n : 0;
  const fixed = pi.filter((p, i) => p === i).length;
  return { pi, shift, crossRepoShare: cross, fixedPoints: fixed };
}

const splitKey = (k) => { const i = k.indexOf(SEP); return [k.slice(0, i), k.slice(i + 1)]; };

/** Per-file count arrays for the real arm and every control of one kind. `sys[i]` and `gold[i]` are Sets of keys. */
export function armCounts({ kind, sys, gold, files, seed, reps = CONST.REPS, pair = kind === "calls" || kind === "extends" }) {
  const n = files.length;
  const real = sys.map((s, i) => countSets(s, gold[i]));
  const { pi, shift, crossRepoShare, fixedPoints } = derange(files);
  const fileShuffle = sys.map((_, i) => countSets(sys[pi[i]], gold[i]));
  const out = { real, fileShuffle, derangement: { shift, crossRepoShare, fixedPoints } };
  if (pair) {
    out.pairShuffle = sys.map((s, i) => {
      const k = s.size;
      const callers = [...s].map((e) => splitKey(e)[0]);
      const callees = [...sys[pi[i]]].map((e) => splitKey(e)[1]);
      const made = new Set();
      if (callees.length) for (let j = 0; j < k; j++) made.add(key2(callers[j], callees[j % callees.length]));
      return countSets(made, gold[i]);
    });
  }
  // random: same count, own callers/children, split-wide vocabulary
  const vocab = new Set();
  for (const s of sys) for (const e of s) vocab.add(pair ? splitKey(e)[1] : e);
  const V = [...vocab].sort();
  const rnd = mulberry32(seedOf("random", kind, seed));
  const acc = Array.from({ length: n }, () => ({ tp: 0, fp: 0, fn: 0 }));
  for (let r = 0; r < reps; r++) {
    for (let i = 0; i < n; i++) {
      const k = sys[i].size;
      const made = new Set();
      if (V.length) {
        const own = pair ? [...sys[i]].map((e) => splitKey(e)[0]) : null;
        for (let j = 0; j < k; j++) {
          const v = V[Math.floor(rnd() * V.length)];
          made.add(pair ? key2(own[Math.floor(rnd() * own.length)], v) : v);
        }
      }
      const c = countSets(made, gold[i]);
      acc[i].tp += c.tp; acc[i].fp += c.fp; acc[i].fn += c.fn;
    }
  }
  out.random = acc.map((a) => ({ tp: a.tp / reps, fp: a.fp / reps, fn: a.fn / reps }));
  return out;
}

const sumCounts = (arr, idx) => { let c = ZERO(); for (const i of idx) c = add(c, arr[i]); return c; };
const percentile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

/** Evaluate one kind: P/R/F1 of the real arm and each control, bootstrap CI of margin, per-repo check, verdict. */
/** `naiveSys` (A8 clause g, per-file Sets of the naive-lexical arm) and `strict` (A8 clause h, catastrophic files) are OPT-IN: without
 *  them the verdict is exactly the A1 rule, which keeps the other instruments that call evaluateKind (xauth-c4-edges.mjs) unchanged. */
export function evaluateKind({ kind, files, sys, gold, seed = "x", boot = CONST.BOOT, reps = CONST.REPS, gating = GATING.includes(kind), priorSys = null, pair = kind === "calls" || kind === "extends", naiveSys = null, strict = false }) {
  const n = files.length;
  const goldEdges = gold.reduce((a, g) => a + g.size, 0);
  const sysEdges = sys.reduce((a, g) => a + g.size, 0);
  const arms = armCounts({ kind, sys, gold, files, seed, reps, pair });
  const names = ["fileShuffle", ...(arms.pairShuffle ? ["pairShuffle"] : []), "random"];
  const all = [...Array(n).keys()];
  const realC = sumCounts(arms.real, all);
  const realF1 = f1Of(realC);
  const ctrl = {};
  for (const nm of names) { const c = sumCounts(arms[nm], all); ctrl[nm] = { ...prf(c), counts: c }; }
  let strongest = { name: null, f1: 0 };
  for (const nm of names) if ((ctrl[nm].f1 ?? 0) >= strongest.f1) strongest = { name: nm, f1: ctrl[nm].f1 ?? 0 };
  const margin = realF1 - strongest.f1;
  // the rival (A8 clause g): the naive-lexical arm scored against the same gold, file by file
  const naiveCounts = naiveSys ? naiveSys.map((s, i) => countSets(s, gold[i])) : null;
  const naiveCt = naiveCounts ? sumCounts(naiveCounts, all) : null;
  const naiveF1 = naiveCt ? f1Of(naiveCt) : null;
  // bootstrap (one resample drives the real arm, every control and the naive arm; the RNG draws are unchanged by the naive arm)
  const rnd = mulberry32(seedOf("boot", kind, seed));
  const ms = [], mn = [];
  for (let b = 0; b < boot && n > 0; b++) {
    const idx = new Array(n);
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rnd() * n);
    const rf = f1Of(sumCounts(arms.real, idx));
    let cf = 0;
    for (const nm of names) cf = Math.max(cf, f1Of(sumCounts(arms[nm], idx)));
    ms.push(rf - cf);
    if (naiveCounts) mn.push(rf - f1Of(sumCounts(naiveCounts, idx)));
  }
  ms.sort((a, b) => a - b);
  mn.sort((a, b) => a - b);
  const ci = ms.length ? [percentile(ms, 0.025), percentile(ms, 0.975)] : [null, null];
  const ciN = mn.length ? [percentile(mn, 0.025), percentile(mn, 0.975)] : [null, null];
  // per-repo
  const byRepo = new Map();
  files.forEach((f, i) => { if (!byRepo.has(f.repo)) byRepo.set(f.repo, []); byRepo.get(f.repo).push(i); });
  const perRepo = {};
  let repoFail = [], naiveRepoFail = [], naiveRepoSaturated = [];
  for (const [repo, idx] of byRepo) {
    const rc = sumCounts(arms.real, idx);
    let cf = 0;
    for (const nm of names) cf = Math.max(cf, f1Of(sumCounts(arms[nm], idx)));
    const g = idx.reduce((a, i) => a + gold[i].size, 0);
    const judged = idx.length >= CONST.REPO_MIN_FILES && g >= CONST.REPO_MIN_EDGES;
    perRepo[repo] = { files: idx.length, gold_edges: g, f1: round(f1Of(rc)), strongest_control_f1: round(cf), judged };
    const nRepo = naiveCounts ? f1Of(sumCounts(naiveCounts, idx)) : null;
    if (naiveCounts) perRepo[repo].naive_f1 = round(nRepo);
    if (judged && !(f1Of(rc) > cf)) repoFail.push(repo);
    // A10: >= the naive arm in every judged repo, strictly > unless the naive arm leaves < MIN_HEADROOM there (then it cannot discriminate)
    if (judged && naiveCounts) {
      const rRepo = f1Of(rc);
      if (rRepo < nRepo) naiveRepoFail.push(repo);
      else if (!(rRepo > nRepo)) { if (1 - nRepo >= CONST.MIN_HEADROOM) naiveRepoFail.push(repo); else naiveRepoSaturated.push(repo); }
    }
  }
  // per-file F1 of the real arm: the micro-F1 hides a catastrophic file (A8 (h)); always reported, gating only when `strict`
  const fileF1 = arms.real.map((c, i) => ({ i, gold: gold[i].size, f1: f1Of(c) }));
  const withGold = fileF1.filter((x) => x.gold > 0).map((x) => x.f1).sort((a, b) => a - b);
  const catastrophic = fileF1.filter((x) => x.gold >= CONST.CATASTROPHIC_MIN_EDGES && x.f1 < CONST.CATASTROPHIC_F1).sort((a, b) => a.f1 - b.f1);
  const perFile = {
    files_with_gold: withGold.length,
    f1: withGold.length ? { min: round(withGold[0]), p05: round(percentile(withGold, 0.05)), p25: round(percentile(withGold, 0.25)), median: round(percentile(withGold, 0.5)), p75: round(percentile(withGold, 0.75)) } : null,
    catastrophic: { rule: `per-file F1 < ${CONST.CATASTROPHIC_F1} with >= ${CONST.CATASTROPHIC_MIN_EDGES} gold edges`, count: catastrophic.length, of: fileF1.filter((x) => x.gold >= CONST.CATASTROPHIC_MIN_EDGES).length, files: catastrophic.slice(0, 10).map((x) => ({ file: files[x.i].id, gold_edges: x.gold, f1: round(x.f1) })) },
  };
  const nHead = naiveCt ? 1 - naiveF1 : null;                                   // unrounded: the verdict compares these, not their printed digits
  const nMargin = naiveCt ? realF1 - naiveF1 : null;
  const nRequired = naiveCt ? Math.min(CONST.MIN_MARGIN, CONST.HEADROOM_FRACTION * nHead) : null;
  const naive = naiveCt ? { f1: round(naiveF1), precision: round(prf(naiveCt).precision), recall: round(prf(naiveCt).recall), margin: round(nMargin), headroom: round(nHead), required_margin: round(nRequired), saturated: nHead < CONST.MIN_HEADROOM } : null;
  // verdict
  const reasons = [];
  let pass = null;
  const covered = n >= CONST.MIN_FILES && goldEdges >= CONST.MIN_EDGES;
  const licence = strongest.f1 <= CONST.LICENCE_RATIO * realF1;
  if (!covered) reasons.push(`too_few: ${n} files / ${goldEdges} gold edges (need ${CONST.MIN_FILES}/${CONST.MIN_EDGES})`);
  else {
    const a = ci[0] !== null && ci[0] > 0;
    const b = margin >= CONST.MIN_MARGIN;
    const d = repoFail.length === 0;
    if (!a) reasons.push("ci_lower_not_above_zero");
    if (!b) reasons.push(`margin_below_${CONST.MIN_MARGIN}`);
    if (!licence) reasons.push("licence_failed: strongest control retains more than half of the real F1");
    if (!d) reasons.push(`repo_inconsistent: ${repoFail.join(",")}`);
    let base = a && b && licence && d;
    // (h) catastrophic files (strict only)
    if (strict && catastrophic.length > CONST.MAX_CATASTROPHIC) { reasons.push(`catastrophic_files: ${catastrophic.length} (${catastrophic.slice(0, 3).map((x) => `${files[x.i].id} F1 ${round(x.f1)} on ${x.gold} gold edges`).join("; ")})`); base = false; }
    // (g) the naive-lexical rival
    let gOk = true, nonDisc = false;
    if (naive) {
      if (naive.saturated && realF1 >= naiveF1) { nonDisc = true; reasons.push(`non_discriminating_vs_naive: naive F1 ${naive.f1} leaves ${naive.headroom} headroom, below the ${CONST.MIN_HEADROOM} the margin could resolve (reader ${round(realF1)}): the rung cannot tell the reader from a regex on this kind`); }
      else {
        const ga = ciN[0] !== null && ciN[0] > 0, gb = nMargin >= nRequired, gd = naiveRepoFail.length === 0;
        if (!ga) reasons.push(`naive_ci_lower_not_above_zero: real ${round(realF1)} vs naive ${naive.f1}`);
        if (!gb) reasons.push(`naive_margin_below_${naive.required_margin}: real ${round(realF1)} - naive ${naive.f1} = ${naive.margin}`);
        if (!gd) reasons.push(`naive_repo_inconsistent: ${naiveRepoFail.join(",")}`);
        gOk = ga && gb && gd;
      }
    }
    pass = nonDisc ? (base ? null : false) : base && gOk;
  }
  const out = {
    kind, gating, n_files: n, gold_edges: goldEdges, system_edges: sysEdges,
    ...mapRound(prf(realC)), f1_real: round(realF1),
    controls: Object.fromEntries([...names.map((nm) => [nm, mapRound(ctrl[nm])]), ...(naiveCt ? [["naiveLexical", mapRound({ ...prf(naiveCt), counts: naiveCt })]] : [])]),
    strongest_control: { name: strongest.name, f1: round(strongest.f1) },
    margin: round(margin), margin_ci95: ci.map((x) => round(x)), licence_ok: covered ? licence : null,
    per_repo: perRepo, per_file: perFile, derangement: arms.derangement, verdict: { pass, reasons },
  };
  if (naive) {
    out.naive = { ...naive, margin_ci95: ciN.map((x) => round(x)), repo_fail: naiveRepoFail, repos_not_discriminating: naiveRepoSaturated, note: "rival reader (regex, no lexer, no scope): clause g, never the licence clause" };
    const rival = naiveF1 > strongest.f1 ? { name: "naiveLexical", f1: round(naiveF1) } : out.strongest_control;
    out.strongest_incl_naive = rival;
  }
  if (priorSys) {
    // ablation: same gold, other system, no control machinery
    const c = sumCounts(priorSys.map((s, i) => countSets(s, gold[i])), all);
    out.ablation_noPrior = { ...mapRound(prf(c)), delta_f1: round(realF1 - f1Of(c)), delta_precision: round((prf(realC).precision ?? 0) - (prf(c).precision ?? 0)), delta_recall: round((prf(realC).recall ?? 0) - (prf(c).recall ?? 0)) };
  }
  return out;
}
function mapRound(o) { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = typeof v === "number" ? round(v) : (v && typeof v === "object" && !Array.isArray(v) ? mapRound(v) : v); return r; }

// ---- file selection ------------------------------------------------------------------------------------------------
export function selectFiles(rows, { limit = null, maxBytes = CONST.MAX_BYTES, offset = 0 } = {}) {
  const gaps = [];
  let tooBig = 0;
  const ok = [];
  for (const r of rows) { if (r.bytes > maxBytes) tooBig += 1; else ok.push(r); }
  if (tooBig) gaps.push({ reason: "file_too_large", count: tooBig });
  const byRepo = new Map();
  for (const r of ok) { if (!byRepo.has(r.repo)) byRepo.set(r.repo, []); byRepo.get(r.repo).push(r); }
  for (const v of byRepo.values()) v.sort((a, b) => (a.sha256 < b.sha256 ? -1 : 1));
  const repos = [...byRepo.keys()].sort();
  const picked = [];
  for (let round_ = 0; repos.some((r) => byRepo.get(r).length > round_); round_++) {
    for (const r of repos) { const v = byRepo.get(r); if (round_ < v.length) picked.push(v[round_]); }
    if (limit !== null && picked.length >= offset + limit) break;
  }
  return { rows: limit === null ? picked.slice(offset) : picked.slice(offset, offset + limit), gaps };
}

// ---- priors --------------------------------------------------------------------------------------------------------
export function priorFor(language) {
  const lang = LANG_ALIAS[language] ?? language;
  const own = keywordsFor(lang); // a vendored priors/code-kw-<code>.json (CodeKeywordPrior@1), any language
  if (own) return { keywords: own.keywords, source: own.source };
  try {
    const g = JSON.parse(fs.readFileSync(path.join(GIVER_DIR, `${lang}-language-law-prior-v1.json`), "utf8"));
    if (g.schema === "LanguageLawPrior@1" && g.language === lang && g.lexical?.keywords?.length) {
      return { keywords: new Set(g.lexical.keywords), source: `projected-from-giver (not vendored): ${lang}-language-law-prior-v1.json LanguageLawPrior@1, ${g.lexical.keywords.length} hard keywords` };
    }
  } catch { /* typed gap below */ }
  return { keywords: null, source: null };
}

// ---- baseline: existing callEdges, with the lookahead measure ------------------------------------------------------
const BASELINE_EXTS = { python: ".py", javascript: ".js", c: ".c", go: ".go" };
export function baselineCalls(text, language, keywords) {
  const ext = BASELINE_EXTS[language];
  if (!ext) return null;
  const fileName = `x${ext}`;
  const decls = parseDeclarations(text, fileName, { keywords });
  const edges = callEdges(text, decls);
  const set = new Set(edges.map((e) => key2(e.caller, e.callee)));
  // lookahead: re-derive call sites with callEdges' own regex and test each against the callee's first declaration
  const first = new Map();
  for (const d of decls) if (!first.has(d.name) || d.start < first.get(d.name)) first.set(d.name, d.start);
  const names = [...first.keys()].filter((n) => n.length >= 2);
  let late = 0, total = 0, rederived = new Set();
  if (names.length) {
    const re = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*\\(`, "g");
    const sites = new Map();
    for (const caller of decls) {
      const body = text.slice(caller.bodyStart ?? caller.start, caller.end);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(body))) {
        const pos = (caller.bodyStart ?? caller.start) + m.index;
        const k = key2(caller.name, m[1]);
        if (!sites.has(k)) sites.set(k, []);
        sites.get(k).push(pos);
      }
    }
    rederived = new Set(sites.keys());
    for (const [k, ps] of sites) {
      total += 1;
      const callee = splitKey(k)[1];
      if (ps.every((p) => p < first.get(callee))) late += 1;
    }
  }
  const same = rederived.size === set.size && [...set].every((k) => rederived.has(k));
  return { set, lookahead: { edges: total, lookahead_only: late }, consistent: same };
}

// ---- causality audit -----------------------------------------------------------------------------------------------
export function causalityAudit({ language, texts, keywords, nFiles = CONST.CAUSAL_FILES, cuts = CONST.CAUSAL_CUTS }) {
  const keyOf = (r) => {
    const o = new Set();
    for (const c of r.calls) o.add(`c${SEP}${c.caller}${SEP}${c.callee}${SEP}${c.at}`);
    for (const i of r.imports) o.add(`i${SEP}${i.module}${SEP}${i.at}`);
    for (const x of r.extends) o.add(`e${SEP}${x.child}${SEP}${x.base}${SEP}${x.at}`);
    return o;
  };
  const endsOf = (r) => {
    const m = new Map();
    for (const c of r.calls) m.set(`c${SEP}${c.caller}${SEP}${c.callee}${SEP}${c.at}`, c.end);
    for (const i of r.imports) m.set(`i${SEP}${i.module}${SEP}${i.at}`, i.end);
    for (const x of r.extends) m.set(`e${SEP}${x.child}${SEP}${x.base}${SEP}${x.at}`, x.end);
    return m;
  };
  let retracted = 0, missed = 0, checks = 0;
  const examples = [];
  const step = Math.max(1, Math.floor(texts.length / nFiles));
  const chosen = texts.filter((_, i) => i % step === 0).slice(0, nFiles);
  for (const { text, fileName } of chosen) {
    const full = readEdges({ text, language, fileName, keywords, final: true });
    const fk = keyOf(full), fe = endsOf(full);
    for (const q of cuts) {
      const cut = Math.floor(text.length * q);
      const pre = readEdges({ text: text.slice(0, cut), language, fileName, keywords, final: false });
      const pk = keyOf(pre);
      checks += 1;
      for (const k of pk) if (!fk.has(k)) { retracted += 1; if (examples.length < 5) examples.push({ file: fileName, cut, retracted: k }); }
      for (const [k, end] of fe) if (end <= pre.consumed && !pk.has(k)) { missed += 1; if (examples.length < 5) examples.push({ file: fileName, cut, missed: k }); }
    }
  }
  return { files: chosen.length, checks, retracted, missed, ok: retracted === 0 && missed === 0, examples };
}

// ---- provenance, labels, refusals ---------------------------------------------------------------------------------
const SECOND_AUTHORITY = { python: "stdlib ast (xauth-c4-edges.mjs)", ruby: "Ripper (xauth-c4-edges.mjs)", javascript: "acorn bundled in node (xauth-c4-edges.mjs)" };
const provenanceOf = (language) => ({
  gold: "tree-sitter grammars + khora's own gold.py mapping of their nodes to calls/defs/extends (a khora-authored convention the reader reproduces by name)",
  second_authority: SECOND_AUTHORITY[language] ?? null,
  ...(SECOND_AUTHORITY[language] ? {} : { second_authority_gap: `no second authority for ${language}: tree-sitter is the only authority` }),
});
/** PASS / FAIL only for the single TEST run; every other split is a development figure and says so. */
export function verdictLabel(pass, split) {
  if (pass !== true && pass !== false) return "UNMEASURED";
  return split === "test" ? (pass ? "PASS" : "FAIL") : `${pass ? "PASS" : "FAIL"}-${String(split).toUpperCase()}`;
}
function stamp(res) {
  res.development = res.split !== "test";
  res.verdict_label = res.refused ? "REFUSED" : verdictLabel(res.pass, res.split);
  return res;
}
function unmeasured(language, split, reason, extra = {}) {
  return stamp({ id: RUNG.id, rung: RUNG.ladder, language, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, controls: {}, gaps: [{ reason, count: 1 }], notes: [], details: { language, ...extra } });
}
/** A refusal reads no test data and is never a card: the CLI writes it to a -refused file. */
function refusal(language, split, reason, extra = {}) {
  return stamp({ ...unmeasured(language, split, reason, extra), refused: true });
}

// ---- the TEST ledger (A8 (6)) -----------------------------------------------------------------------------------------
function sleepMs(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function ledgerError(code, msg) { const e = new Error(msg); e.code = code; return e; }
/** Read-modify-write of the ledger under an O_EXCL lock. fn(led) returns { write:boolean, ...result }. */
function ledgerTx(fn) {
  const file = LEDGER(), lock = `${file}.lock`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let have = false;
  for (let k = 0; k < 200 && !have; k++) {
    try { fs.closeSync(fs.openSync(lock, "wx")); have = true; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 120_000) fs.unlinkSync(lock); } catch { /* raced with its owner */ }
      sleepMs(25);
    }
  }
  if (!have) throw ledgerError("LEDGER_LOCKED", "could not take the ledger lock");
  try {
    let led = {};
    if (fs.existsSync(file)) {
      try { led = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw ledgerError("LEDGER_UNREADABLE", "the ledger exists but cannot be parsed: refusing rather than guessing that TEST is unspent"); }
    }
    const out = fn(led) ?? {};
    if (out.write) { fs.writeFileSync(`${file}.tmp`, JSON.stringify(led, null, 1)); fs.renameSync(`${file}.tmp`, file); }
    return out;
  } finally { try { fs.unlinkSync(lock); } catch { /* already gone */ } }
}
/** Read-only look: is c4:<language> already in the ledger? (any entry, started or completed, is consumption) */
function ledgerPeek(language) {
  return ledgerTx((led) => ({ write: false, entry: led[`c4:${language}`] ?? null })).entry;
}
/** Claim TEST for this language BEFORE any test file is read. A retest is allowed only programmatically and is logged. */
function claimTest(language, allowRetest) {
  const key = `c4:${language}`;
  return ledgerTx((led) => {
    const cur = led[key];
    if (cur && !allowRetest) return { write: false, granted: false, entry: cur };
    const at = new Date().toISOString();
    if (cur) { led[key] = { ...cur, retests: [...(cur.retests ?? []), { at, status: "started" }] }; return { write: true, granted: true, retest: true }; }
    led[key] = { status: "started", at, pid: process.pid };
    return { write: true, granted: true, retest: false };
  });
}
function settleTest(language, retest, status, extra = {}) {
  const key = `c4:${language}`;
  ledgerTx((led) => {
    const cur = led[key] ?? { at: new Date().toISOString() };
    const stamp_ = { status, settled_at: new Date().toISOString(), ...extra };
    if (retest && cur.retests?.length) { const r = cur.retests.slice(); r[r.length - 1] = { ...r[r.length - 1], ...stamp_ }; led[key] = { ...cur, retests: r }; }
    else led[key] = { ...cur, ...stamp_ };
    return { write: true };
  });
}

// ---- the measurement -----------------------------------------------------------------------------------------------
/** Measure one language on one split. Never throws. split "test" is the single held-out run: it is claimed in the ledger first,
 *  refuses limit/offset, and a refused call is flagged refused:true. `allowRetest` is programmatic only and is logged. */
export async function measure({ language, split = "dev", limit = null, offset = 0, maxBytes = CONST.MAX_BYTES, boot = CONST.BOOT, reps = CONST.REPS, allowRetest = false, _readEdges = null } = {}) {
  const lang = LANG_ALIAS[language] ?? language;
  // _readEdges is a TEST HOOK (substitute reader, to prove a reader exception becomes a typed gap); nothing else passes it
  const ctx = { testClaimed: false, retest: false, read: _readEdges ?? readEdges };
  try {
    return await measureInner({ language: lang, split, limit, offset, maxBytes, boot, reps, allowRetest, ctx });
  } catch (e) {
    const msg = String(e?.message ?? e).slice(0, 200);
    if (e?.code === "LEDGER_LOCKED") return refusal(lang, split, "ledger_locked", { error: msg });
    if (e?.code === "LEDGER_UNREADABLE") return refusal(lang, split, "ledger_unreadable", { error: msg });
    const r = unmeasured(lang, split, `unmeasured: ${msg}`);
    if (ctx.testClaimed) {
      // the claim was made before any test file was read, so a failure after it still counts as consumption
      try { settleTest(lang, ctx.retest, "failed", { error: msg }); } catch { /* the claim stands */ }
      r.gaps.push({ reason: "test_split_consumed_by_failed_run", count: 1 });
    }
    return r;
  }
}

/** DEV result plus the standing unseen-repository TRAIN probe (A8 (5)); the probe never gates. -> { result, probeFull } */
export async function measureWithProbe(opts = {}) {
  const result = await measure(opts);
  if ((opts.split ?? "dev") !== "dev" || result.refused) return { result, probeFull: null };
  const probeFull = await measure({ ...opts, split: "train", limit: CONST.PROBE_LIMIT, offset: 0 });
  result.details.unseen_repo_probe = summarizeProbe(probeFull);
  return { result, probeFull };
}
export function summarizeProbe(p) {
  const kinds = {};
  for (const k of GATING) {
    const v = p.details?.systems?.edges?.[k];
    if (!v || v.n_files === undefined) { kinds[k] = v ?? null; continue; }
    kinds[k] = { f1: v.f1_real, gold_edges: v.gold_edges, naive_f1: v.naive?.f1 ?? null, margin_over_naive: v.naive?.margin ?? null, strongest_control: v.strongest_incl_naive ?? v.strongest_control, catastrophic: v.per_file?.catastrophic ?? null, per_file_f1: v.per_file?.f1 ?? null, verdict: v.verdict, per_repo: v.per_repo };
  }
  const contamination = p.language === "c" ? "the C preprocessor-arm fix (A8 (7)) was motivated by python/cpython Python_ceval.c in this split: for C this probe no longer measures that fix on unseen code" : null;
  return {
    split: p.split, role: "unseen-repository probe (TRAIN split; never gating, not held out in the TEST sense)", measured: p.pass !== undefined && p.n > 0,
    files: p.n, repos: p.details?.repos?.length ?? 0, pass: p.pass, verdict_label: p.verdict_label, score: p.score, control: p.control, margin: p.margin,
    kinds, reader_errors: p.details?.reader_errors ?? null, gaps: (p.gaps ?? []).map((g) => g.reason), contamination,
  };
}

async function measureInner({ language, split, limit, offset, maxBytes, boot, reps, allowRetest, ctx }) {
  const t0 = Date.now();
  if (!edgeLanguages().includes(language)) return unmeasured(language, split, `unmeasured: no edge reader for ${language}`);
  if (split === "test" && offset) return refusal(language, split, "offset_not_allowed_on_test: the test split is consumed once, whole");
  if (split === "test" && limit !== null) return refusal(language, split, "limit_not_allowed_on_test: a sample read would spend the one TEST run");
  if (split === "test") {
    const cur = ledgerPeek(language); // reads no test data
    if (cur && !allowRetest) return refusal(language, split, "test_split_already_consumed", { ledger: cur });
    // the ledger lives in /private/tmp and can be wiped; a held-out card already on disk is independent evidence that TEST is spent
    const card = path.join(OUT_DIR(), `c4-${language}-test.json`);
    if (!allowRetest && fs.existsSync(card)) return refusal(language, split, "test_split_already_consumed", { ledger: null, card_exists: card });
  }
  const av = goldAvailable();
  if (!av.available) return unmeasured(language, split, `unmeasured: gold extractor unavailable (${av.reason})`);
  const man = JSON.parse(fs.readFileSync(MANIFEST(), "utf8"));
  const lang = man.languages?.[language];
  if (!lang?.[split]) return unmeasured(language, split, `unmeasured: manifest has no ${split} split for ${language}`);
  if (split === "test") {
    // CLAIM BEFORE READING: the manifest lists paths, it reads no test file; the next statements do
    const c = claimTest(language, allowRetest);
    if (!c.granted) return refusal(language, split, "test_split_already_consumed", { ledger: c.entry });
    ctx.testClaimed = true; ctx.retest = c.retest;
  }
  const gaps = [];
  const sel = selectFiles(lang[split], { limit, maxBytes, offset });
  gaps.push(...sel.gaps);
  const texts = sel.rows.map((r) => fs.readFileSync(r.path, "utf8"));
  const golds = await goldBatch(sel.rows.map((r, i) => ({ language, text: texts[i], fileName: r.path })));
  const files = [], G = [], texts2 = [];
  let parseFail = 0, goldErr = 0;
  sel.rows.forEach((r, i) => {
    const g = golds[i];
    if (g.error) { goldErr += 1; return; }
    if (g.parse.error_bytes_frac > CONST.PARSE_TOL) { parseFail += 1; return; }
    files.push({ id: r.rel ?? r.path, repo: r.repo, path: r.path, bytes: r.bytes });
    G.push(goldEdgesOf(g, texts[i], language));
    texts2.push({ text: texts[i], fileName: r.path, caps: g.capabilities });
  });
  if (goldErr) gaps.push({ reason: "gold_error", count: goldErr });
  if (parseFail) gaps.push({ reason: "gold_parse_failure", count: parseFail });
  if (!files.length) {
    if (ctx.testClaimed) settleTest(language, ctx.retest, "completed", { files: 0 });
    return { ...unmeasured(language, split, "no_scored_files"), gaps: [...gaps, { reason: "no_scored_files", count: 1 }] };
  }

  const caps = texts2[0].caps;
  const prior = priorFor(language);
  if (!prior.keywords) gaps.push({ reason: `no_keyword_prior_for_${language}`, count: 1 });
  // A8 (i): a lexer/reader exception is a typed reader_error, counted with its denominator, never plain zero recall
  const readerErrors = { prior: [], noPrior: [] };
  const run = (kw, tag) => texts2.map((t) => {
    const r = ctx.read({ text: t.text, language, fileName: t.fileName, keywords: kw, final: true });
    if (r.disclosure?.error) readerErrors[tag].push({ file: path.basename(t.fileName), error: String(r.disclosure.error).slice(0, 120) });
    return systemEdgesFrom(r);
  });
  const S = run(prior.keywords, "prior");
  const S0 = run(null, "noPrior");
  const N = texts2.map((t) => naiveLexical(t.text, language, prior.keywords));
  const details = { language, split, offset, files: files.length, repos: [...new Set(files.map((f) => f.repo))], reader: "adapters/code/edges.js", prior: { source: prior.source, keywords: prior.keywords ? prior.keywords.size : 0 }, systems: {}, causality: null };

  const capOf = (k) => caps?.[k]?.status ?? "gap";
  const kinds = {};
  const kindGaps = [];
  for (const k of KINDS) {
    const status = capOf(k);
    if (status !== "ok") { kinds[k] = { applicable: false, reason: status === "not_applicable" ? `gold: ${caps[k].reason}` : `gold gap: ${caps?.[k]?.reason ?? "no capability"}` }; kindGaps.push({ reason: `${k}_${status === "not_applicable" ? "not_applicable" : "gold_gap"}`, count: 1 }); continue; }
    const rival = (k === "calls" || k === "imports") && N.every((x) => x);
    kinds[k] = evaluateKind({ kind: k, files, sys: S.map((s) => s[k]), gold: G.map((g) => g[k]), seed: language, boot, reps, priorSys: S0.map((s) => s[k]), naiveSys: rival ? N.map((x) => x[k]) : null, strict: GATING.includes(k) });
  }
  if (capOf("calls") === "ok") {
    kinds.calleeSet = evaluateKind({ kind: "calleeSet", pair: false, files, sys: S.map((s) => s.calleeSet), gold: G.map((g) => g.calleeSet), seed: `${language}-calleeSet`, boot: Math.min(boot, 300), reps, gating: false });
    kinds.callsAt = evaluateKind({ kind: "callsAt", pair: false, files, sys: S.map((s) => s.callsAt), gold: G.map((g) => g.callsAt), seed: `${language}-callsAt`, boot: Math.min(boot, 300), reps, gating: false });
    let m = 0, ag = 0;
    S.forEach((s, i) => { for (const [k, caller] of s.callerAt) if (G[i].callerAt.has(k)) { m += 1; if (G[i].callerAt.get(k) === caller) ag += 1; } });
    kinds.callsAt.caller_acc = { matched_occurrences: m, caller_agrees: ag, share: m ? round(ag / m) : null, note: "of the call occurrences found at gold's offset, the share whose caller is also right (attribution, apart from detection)" };
    const ns = S.map((s) => new Set([...s.calls].map((k) => key2(TOP, splitKey(k)[1]))));
    const nsC = ns.reduce((a, x, i) => add(a, countSets(x, G[i].calls)), ZERO());
    kinds.calls.ablation_noScope = { ...mapRound(prf(nsC)), note: "every caller set to <top>: the pair metric must fall if it really scores the caller binding" };
  }
  // extends: relation agreement and gold blind spot diagnostic
  if (kinds.extends?.n_files) {
    let matched = 0, same = 0;
    S.forEach((s, i) => { for (const [k, rel] of s.relations) if (G[i].relations.has(k)) { matched += 1; if (G[i].relations.get(k) === rel) same += 1; } });
    kinds.extends.relation_agreement = { matched, same, share: matched ? round(same / matched) : null };
    if (language === "java") {
      let fp = 0, blind = 0;
      S.forEach((s, i) => { for (const k of s.extends) if (!G[i].extends.has(k)) { fp += 1; const sh = s.shapes.get(k); if (sh && (sh.generic || sh.qualified || sh.record)) blind += 1; } });
      kinds.extends.fp_in_gold_blindspot = { fp, blindspot: blind, note: "Java gold only sees simple type names: a generic base (`extends B<T>`), a qualified base (`a.F`) and a record's interfaces are not in it; the reader flags that shape on each edge" };
    }
  }
  details.systems.edges = Object.fromEntries(Object.entries(kinds).filter(([, v]) => v.n_files !== undefined || v.applicable === false));
  // baseline callEdges
  if (capOf("calls") === "ok") {
    const b = texts2.map((t) => baselineCalls(t.text, language, prior.keywords));
    if (b[0] === null) {
      details.systems.callEdges = { applicable: false, reason: `adapters/text/code-structure.js has no declaration recipe for ${language}` };
      gaps.push({ reason: `callEdges_no_recipe_for_${language}`, count: 1 });
    } else {
      const ev = evaluateKind({ kind: "calls", files, sys: b.map((x) => x.set), gold: G.map((g) => g.calls), seed: `${language}-callEdges`, boot: Math.min(boot, 500), reps, gating: false });
      const tot = b.reduce((a, x) => a + x.lookahead.edges, 0), late = b.reduce((a, x) => a + x.lookahead.lookahead_only, 0);
      ev.lookahead = { edges: tot, lookahead_only: late, lookahead_share: tot ? round(late / tot) : null, note: "edges whose every call site precedes the callee's declaration: a causal reader could not emit them" };
      ev.rederivation_consistent = b.every((x) => x.consistent);
      details.systems.callEdges = ev;
    }
  }
  const au = causalityAudit({ language, texts: texts2, keywords: prior.keywords });
  details.causality = au;
  details.reader_errors = { count: readerErrors.prior.length, of: files.length, examples: readerErrors.prior.slice(0, 5), noPrior_arm_count: readerErrors.noPrior.length, rule: `a lexer/reader exception is a typed gap and fails the language when > ${CONST.MAX_READER_ERRORS} (the file stays scored)` };

  // headline
  const measured = GATING.filter((k) => kinds[k]?.verdict && kinds[k].verdict.pass !== null);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const score = measured.length ? mean(measured.map((k) => kinds[k].f1_real)) : null;
  // the headline control is the strongest RIVAL: shuffle / pair / random and, A8, the naive-lexical arm
  const control = measured.length ? mean(measured.map((k) => (kinds[k].strongest_incl_naive ?? kinds[k].strongest_control).f1)) : null;
  let pass = measured.length ? measured.every((k) => kinds[k].verdict.pass === true) : null;
  const notes = [];
  if (pass !== null && !au.ok) { pass = false; notes.push(`causality audit failed: ${au.retracted} retracted, ${au.missed} missed`); }
  if (readerErrors.prior.length) {
    gaps.push({ reason: "reader_error", count: readerErrors.prior.length, of: files.length, examples: readerErrors.prior.slice(0, 3) });
    if (readerErrors.prior.length > CONST.MAX_READER_ERRORS && pass !== null) { pass = false; notes.push(`reader errors: ${readerErrors.prior.length} of ${files.length} files raised a lexer/reader exception (allowed ${CONST.MAX_READER_ERRORS})`); }
  }
  for (const k of GATING) if (kinds[k]?.verdict?.pass === null && kinds[k]?.n_files !== undefined) gaps.push({ reason: `${k}_not_measurable: ${kinds[k].verdict.reasons.join("; ")}`, count: 1 });
  for (const k of GATING) { const c = kinds[k]?.per_file?.catastrophic; if (c && c.count > 0) gaps.push({ reason: `${k}_catastrophic_files`, count: c.count, of: c.of, examples: c.files.slice(0, 3) }); }
  gaps.push(...kindGaps);
  // `controls` holds only arms built to fail or rivals (fileShuffle, pairShuffle, random, the caller-ablated noScope and, for a measured
  // gating kind, naiveLexical); the prior ablation and the occurrence-level / callee-only views are diagnostics and live in
  // details.ablations (reporting layout: A7). A kind that is not in the headline keeps its naive arm in details only.
  const controls = {}, ablations = {};
  for (const k of KINDS) {
    const v = kinds[k];
    if (!v || v.n_files === undefined) continue;
    for (const [nm, c] of Object.entries(v.controls)) { if (nm === "naiveLexical" && !measured.includes(k)) ablations[`${k}_naiveLexical`] = c.f1; else controls[`${k}_${nm}`] = c.f1; }
    if (v.ablation_noScope) controls[`${k}_noScope`] = v.ablation_noScope.f1;
    if (v.ablation_noPrior) ablations[`${k}_noPrior`] = { f1: v.ablation_noPrior.f1, delta_f1: v.ablation_noPrior.delta_f1, delta_precision: v.ablation_noPrior.delta_precision, delta_recall: v.ablation_noPrior.delta_recall };
  }
  for (const k of ["callsAt", "calleeSet"]) if (kinds[k]?.n_files !== undefined) { ablations[`${k}_real`] = kinds[k].f1_real; ablations[`${k}_fileShuffle`] = kinds[k].controls.fileShuffle.f1; }
  if (split === "test") notes.push(ctx.retest ? "RETEST: the ledger already held this language; this run is logged in ledger retests[] and is not the held-out figure" : "TEST: the one held-out run for this language (ledger claimed before the first test file was read)");
  else notes.push(`${split.toUpperCase()} figure, a development figure (development: true): edges.js recipes were developed while looking at DEV gold mismatches and gold is tree-sitter plus khora's own gold.py mapping (see A4 and A8 in c4-edges.mjs); TEST is untouched`);
  notes.push(`prior: ${prior.source ?? "none (typed gap)"}`);
  if (!provenanceOf(language).second_authority) notes.push(provenanceOf(language).second_authority_gap);
  const applicable = GATING.some((k) => kinds[k]?.n_files !== undefined);
  const result = {
    id: RUNG.id, rung: RUNG.ladder, language, split, n: files.length,
    applicable,
    score: round(score), control: round(control), margin: score === null ? null : round(round(score) - round(control)),
    licence: { ok: measured.length ? measured.every((k) => kinds[k].licence_ok === true) : null, rule: `strongest perturbation control F1 <= ${CONST.LICENCE_RATIO} x real F1, per measured gating kind (the naive rival is held to clause g, not to the licence)`, kinds: Object.fromEntries(measured.map((k) => [k, kinds[k].licence_ok])) },
    ...(applicable ? {} : { reason: GATING.map((k) => kinds[k]?.reason).filter(Boolean).join("; ") || "no gating kind applies to this language" }),
    pass, controls, gaps, notes, provenance: provenanceOf(language),
    ...(ctx.retest ? { retest: true } : {}),
    details: { ...details, ablations, kinds_applicability: Object.fromEntries(KINDS.map((k) => [k, kinds[k]?.applicable === false ? { applicable: false, reason: kinds[k].reason } : { applicable: true }])), seconds: round((Date.now() - t0) / 1000, 1) },
  };
  if (split === "test") settleTest(language, ctx.retest, "completed", { files: files.length });
  return stamp(result);
}

// ---- result files ----------------------------------------------------------------------------------------------------
/** Where a result goes (A8 (6)): a refusal is never a card and never takes the card's name; the TEST card is created with wx and an
 *  existing one is never replaced (the result goes to a -dup file); every other split overwrites its own file as before. */
export function writeResult(outDir, base, res, split) {
  fs.mkdirSync(outDir, { recursive: true });
  const json = JSON.stringify(res, null, 1);
  if (res.refused) { const p = path.join(outDir, `${base}-refused.json`); fs.writeFileSync(p, json); return { path: p, kind: "refused" }; }
  const p = path.join(outDir, `${base}.json`);
  if (split !== "test") { fs.writeFileSync(p, json); return { path: p, kind: "card" }; }
  try { fs.writeFileSync(p, json, { flag: "wx" }); return { path: p, kind: "card" }; }
  catch (e) {
    if (e.code !== "EEXIST") throw e;
    const d = path.join(outDir, `${base}-dup-${Date.now()}.json`);
    fs.writeFileSync(d, json);
    return { path: d, kind: "dup", existing: p };
  }
}

// ---- CLI -----------------------------------------------------------------------------------------------------------
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const a = process.argv.slice(2);
  const get = (f, d = null) => { const i = a.indexOf(f); return i === -1 ? d : a[i + 1]; };
  const language = get("--language");
  if (!language) { console.error("usage: node c4-edges.mjs --language <lang> [--split dev|train|test] [--limit N] [--offset N] [--no-probe]"); process.exit(2); }
  if (a.includes("--allow-retest")) { console.error("--allow-retest does not exist: a spent TEST split is not re-run from the command line (A8 (6))"); process.exit(2); }
  const split = get("--split", "dev");
  const limit = get("--limit") === null ? null : Number(get("--limit"));
  const offset = get("--offset") === null ? 0 : Number(get("--offset"));
  const lang = LANG_ALIAS[language] ?? language;
  const wantProbe = split === "dev" && !a.includes("--no-probe");
  const { result: res, probeFull } = wantProbe ? await measureWithProbe({ language, split, limit, offset }) : { result: await measure({ language, split, limit, offset }), probeFull: null };
  const base = `c4-${lang}-${split}${offset ? `-offset${offset}` : ""}`;
  const w = writeResult(OUT_DIR(), base, res, split);
  let code = 0;
  if (w.kind === "dup") { console.error(`the test card ${base}.json already exists and was NOT replaced; this result went to ${w.path}`); code = 3; }
  if (probeFull) fs.writeFileSync(path.join(OUT_DIR(), `c4-${lang}-train-probe.json`), JSON.stringify(probeFull, null, 1));
  console.log(JSON.stringify(res));
  process.exitCode = code;
}
