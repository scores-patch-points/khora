// eval/coding-competence/c3-declared.mjs — RUNG C3 (= R3 for programming languages): DECLARED BEINGS.
//
//   node eval/coding-competence/c3-declared.mjs --language <lang> [--split dev|test] [--limit N]
//   node eval/coding-competence/c3-declared.mjs --language all|python,go,... [--split dev]     (pooled card too)
//   node eval/coding-competence/c3-declared.mjs --language python --build-prior     (build the TRAIN prior only)
//   node eval/coding-competence/c3-declared.mjs --language all --loo               (leave-one-repo-out CV INSIDE train: the design-iteration instrument)
//   node eval/coding-competence/c3-declared.mjs --language all --emit-prior <dir>  (write code-decl-<language>.json, TRAIN-built, for vendoring)
//   import { RUNG, measure, measureAll } from "./c3-declared.mjs"
//   measure({language, split="dev", limit=null}) -> { id, rung, split, n, applicable, score, control, margin, pass,
//                                                     controls, gaps, notes, details }   (never throws for missing data)
//   CLI prints ONE JSON line and writes /private/tmp/claude-501/coding-competence/c3-<language>-<split>.json
//   (and, for several languages, c3-pooled-<split>.json). The TRAIN priors this instrument builds are cached under
//   /private/tmp/claude-501/coding-competence/c3-priors/declared-<language>.json.
//
// STATUS NOTE (2026-10-06, see A10 at the end of the header): a DEV card of this instrument is DEVELOPMENT evidence, NOT
// held-out evidence (the lexical derivation and the backoff analysis were changed after DEV errors were read); its cards say
// so (details.evidence). The pass statistics and the denominators below were tightened in A10; where the text of the
// pre-registration and A10 differ, A10 governs (it only adds bars; every earlier bar is kept).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// PRE-REGISTRATION (READING-POLICY II.5; written BEFORE any system arm of this file was run; no number below is
// tuned after a result; a failure is reported as a failure, a licence failure voids the pass).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// DISCLOSURE (what touched DEV before this header). Only the GOLD was looked at, never a system: a per-language
// histogram of gold def kinds and token classes over the first 40 DEV files of python/javascript/c/go/ruby/java
// (this is what showed, for example, that C macros are ~40% of the gold defs of the sample and that Ruby gold has
// no `constant` kind), about a dozen printed def contexts per language, and six AUTHORED toy snippets (labelled
// authored; model-written) probed through gold.mjs to learn its name conventions (qualified Ruby class names,
// JS `exports.h = function`, Java constructors are `method`, Go consts/vars are not defs). Those facts fixed the
// SCOPE and NAME NORMALISATION below. They did not fix any reader parameter.
//
// CLAIM. A reader that knows NOTHING about a language except RECEIVED, giver-named priors can recover the
// entities a source file DECLARES (what the text ORDERS into being: functions, methods, classes, types,
// interfaces, enums, modules, macros, constants), better than three baselines that know less: casing alone, a
// language-independent keyword regex, and the same reader given a DERANGED prior. Lovelace's law: the engine
// recovers what the text orders; it originates nothing. It is NOT claimed that the reader beats the existing
// regex recipes (arm a) where those exist: (a) is reported beside it and may win.
//
// UNIT AND GOLD (independent of every arm: tree-sitter via gold.mjs, gold-1; no khora code touches it).
//   Held-out file = a DEV (or, once, TEST) file of the manifest /private/tmp/claude-501/code-corpus/manifest.json,
//   unrestricted rows only (restricted = copyleft/own-repo rows are neither trained on nor scored here).
//   SCOPE: gold.defs with kind in CORE_DEF_KINDS (gold.mjs) plus "constant". Value-level kinds the task does not
//   name (variable, property, field, label, section, id, anchor, keyframes) are NOT in scope and a reader that
//   names them pays a false positive. A file whose gold errors, or whose parse.error_bytes_frac > 0.02 (gold.py
//   P2 tolerance), is excluded and COUNTED as a typed gap (denominators are reported).
//   NAME NORMALISATION (both gold and predictions): the final segment after the last "::" or "." ; exact,
//   case-sensitive match. COARSE KIND: function|method -> callable; class|interface|type|enum|variant -> type;
//   module -> module; macro -> macro; constant -> constant; any other core kind -> other.
//   ITEM: per file the SET of normalised names (metric N) and the set of (coarse kind, name) (metric KN).
//   METRICS: micro-pooled over files, TP/FP/FN summed: P=TP/(TP+FP), R=TP/(TP+FN), F1=2TP/(2TP+FP+FN). An empty
//   prediction has F1 0 (never "undefined = good"). Secondary scope FT: gold and predictions both restricted to
//   coarse kinds callable|type (the kinds the shipped regex recipes were written for): name F1 only, reported so
//   that arm (a) is judged on its own ground as well. Per-coarse-kind recall of every arm is reported (details).
//
// ARMS (every arm reads the same file text; baselines (c)(d)(e) get the SAME comment/string masking as (b)).
//   a  EXISTING  adapters/text/code-structure.js buildCodeIndex([{fileName,text}],{keywords: received code-kw prior
//               if one exists (py, js)}) as shipped; kind function->callable, class->type. It has recipes only for
//               .c .h .go .py .js .mjs .jsx .ts .tsx: a file whose extension has no recipe is a TYPED GAP (arm predicts
//               nothing; counted; not a measured failure of the method). ruby and java have none.
//   b  REAL      adapters/code/declared.js readDeclared(text, prior). Grammar-agnostic: ONE code path for every
//               language; ALL language knowledge is the received prior JSON (below). It never sees gold of the file.
//   c  CASING-ONLY BASELINE  every distinct identifier token that is PascalCase (type) or SCREAMING_CASE (constant),
//               kind by casing only. No structure, no keyword.
//   d  KEYWORD-REGEX BASELINE  one language-independent AUTHORED regex over the masked text: the declaring words
//               def class function func fn struct enum interface trait type module namespace macro and #define,
//               followed by an optional Go-style receiver group and a name (kind from the word). Authored by the
//               model, labelled so; it is the obvious thing a programmer writes first.
//   e1 DERANGED-FOREIGN  arm (b) with the WHOLE prior (lexical, keywords, frames, witnesses) of another language
//               (fixed cyclic shift of the language list: nobody keeps its own prior; gold.py P3 convention).
//   e2 DERANGED-PERMUTED  arm (b) with its own lexical/keyword prior but the NOMINATING knowledge deranged: the
//               frame tables and the two witness tables have their values moved to another key by a fixed
//               derangement (shift of the sorted key list by floor(m/2)+1, no key keeps its value).
//   ablations of (b), reported not passed on:  b-casing (casing witness off), b-recurrence (recurrence witness
//               off), b-scope (enclosing-scope feature off: frames projected without S).
//   control (the single number) = the strongest of c, d, e1, e2 on the metric at hand.
//
// ARM (b) DESIGN (frozen values in the FREEZE block at the end of this header; parameters named here are bare
// integers/declared fractions (P4), each with its reason, none tuned on DEV).
//   RECEIVED PRIOR  "CodeDeclarationFramePrior@1", one per language, built ONLY from TRAIN rows of the manifest
//   (unrestricted, split by repository), giver = the tree-sitter grammar's own tokens and defs over those files
//   (gold.mjs gold-1, the same independent authority as the held-out gold, applied to DIFFERENT repositories). It
//   is therefore SUPERVISED by an independent authority on train, the way a UD treebank supervises a natural
//   language prior; the measure is transfer to unseen repositories, not zero-shot discovery. It names its giver,
//   gold version, repos and file counts in provenance. It contains:
//     lexical   comment openers/closers and string/char quote openers, derived from the grammar's comment and
//               string/literal tokens (an opener string is kept iff >= 0.95 of its occurrences in non-string code
//               text start a comment token, support >= 5; quotes iff >= 2% of quoted tokens); qualifier "::" iff
//               >= 5 and >= 1% of in-scope def names contain it.
//     keywords  CLOSED CLASS K: word tokens whose grammar class is keyword in >= 0.9 of >= 3 train occurrences
//               (incl. "#define"-style directives). REFUSES: a member of K can never name a being (S83 polarity).
//     declaring words D: words w such that, as the token immediately before an identifier on the same line, they
//               are followed by an in-scope def name in >= 0.5 of >= 5 train cases (def, class, func, #define...).
//               Derived, never hand-typed. V = K union D is the literal alphabet of frames.
//     frames    P(def | frame) with counts and fine-kind counts, over frame keys at five backoff levels:
//               f0 S|L2 L1|R1 R2 R3 ; f1 S|L1|R1 R2 ; f2 L1|R1 R2 ; f3 S|L1|R1 ; f4 L1|R1 ; base rate.
//               L tokens = up to 2 significant tokens before (stop after a newline marker ^ or a statement
//               boundary ; { }), R tokens = up to 3 after (a ( ) or [ ] group is collapsed to one token (G) on both
//               sides, a {..} group only on the left when its } is adjacent; stop after ; { } ; a newline marker
//               is followed by a { token if one comes next). Token abstraction: V word -> itself, other word -> I,
//               number -> N, quoted -> S, punctuation run -> itself, newline -> ^, none -> ".".
//               S = ENCLOSING SCOPE (the bracket/indent structure witness): inside a bracket, the innermost
//               opener ( [ { and, for {, the LAST declaring word D of its header (statement since the last ; { }
//               at that level), else "none"; at bracket depth 0, the declaring word D of the header line of the
//               nearest lower-indented line (or "top"). Estimator at each level: p_k = (d_k + ALPHA p_{k+1}) /
//               (n_k + ALPHA), recursive backoff, keys with n < MIN_N pruned (absent = back off).
//     witnesses CASING class of the final segment (pascal, screaming, camel, snake, lower, other) and RECURRENCE
//               bucket (other occurrences of that exact name token in the file: 0, 1, 2-3, 4-7, 8+): each ONE
//               additive log-likelihood-ratio witness log[P(w|def)/P(w|not def)] (Laplace +1), never THE signal.
//   READING  causal-in-structure single pass: tokenize with the prior's lexical knowledge (comments/strings are
//   skipped, not read); every non-K word token is a CANDIDATE; the prior NOMINATES by its frame probability; the
//   text's own evidence (the frame instance in THIS text, its recurrence, its casing) ADMITS: a candidate is
//   declared iff logit(p_frame) + LLR_casing + LLR_recurrence >= 0 (posterior >= 0.5, the Bayes decision; declared,
//   not tuned). The prior alone never produces a name that is not a token of the text. The kind is the majority
//   fine kind of the deepest frame with >= 3 def cases, mapped to the coarse kind.
//   NOTE the recurrence and the scope are read over the WHOLE FILE (two passes: structure first, then decision):
//   this is a file-level reader of what a file declares, not a streaming reader; the rung asks "what does this
//   file declare", for which the full file is the unit. The CAUSAL discipline is kept where it matters for
//   priors: nothing of the held-out file, of its repository, or of any DEV/TEST file reaches the prior.
//
// STATISTICS. Paired bootstrap over FILES (B = 2000, fixed seed 20261005 mulberry32, two-sided 95% percentile
//   interval of F1_b - F1_control on the resampled micro-pooled counts). Files of one repository are correlated,
//   so a repository-level consistency check is required beside the interval (below). Floors: a language is
//   judged only with >= 20 scored files and >= 100 in-scope gold items; below that pass = null and the gap is typed.
//
// PASS RULE (not softened after a run):
//   PASS_LANG(L) iff, for EACH control in {c, d, e1, e2} and for EACH metric in {N, KN}: (i) the lower bound of the
//   interval of F1_b - F1_control is > 0, AND (ii) F1_b > F1_control in a strict majority of the DEV repositories
//   that have >= 5 in-scope gold items.
//   LICENCE (II.23): the deranged controls must be built to fail and the statistic must move: pooled over all
//   measured languages, F1_b(N) - F1_e1(N) >= 0.10 AND F1_b(N) - F1_e2(N) >= 0.10, and each of e1, e2 is below
//   (b) in at least ceil(2n/3) languages. If the licence fails the instrument or mechanism is broken and PASS is
//   void (false) whatever else holds; the report says which control did as well as the real arm.
//   PASS_POOLED iff (i) holds on the file-pooled micro-F1 over all measured languages for every control and metric
//   and the licence holds. PASS (overall, `measureAll`) iff PASS_POOLED and PASS_LANG in >= ceil(2n/3) of the n
//   measured languages. measure() returns pass = PASS_LANG for its language (the licence is evaluated by measureAll
//   and recorded in details.licence there; a single-language card says licence="needs-pooled").
//
// PREDICTIONS (calibration; recorded so they can be missed; only the PASS RULE above has consequences):
//   P1  both deranged controls lose >= 0.10 pooled N-F1 against (b) (licence holds).
//   P2  casing-only (c) has N-F1 <= 0.25 in every language; (b) beats it everywhere.
//   P3  (b) N-F1 on DEV: python >= 0.80, ruby >= 0.80, go >= 0.75, java >= 0.65, c >= 0.60, javascript >= 0.50;
//       pooled >= 0.65.
//   P4  against the keyword regex (d): (b) significantly better in c, java, go, javascript (keyword-less forms:
//       C functions, Java methods, Go methods, JS methods and object-literal functions); NOT significantly better
//       in python and ruby, where def/class is nearly the whole story. Predicted PASS_LANG in 4 of 6 languages
//       (exactly at the ceil(2n/3)=4 line), so the overall verdict is a coin-flip and is decided by the data.
//   P5  (a) honest: (a) >= (b) - 0.05 on the FT scope in python and go (its home recipes); (a) is a typed gap in
//       ruby and java; pooled (a) N-F1 < pooled (b) N-F1 because (a) has no macro/method/constant recipes.
//   P6  ablations: casing off moves (b) N-F1 by < 0.03 pooled (one witness, not the signal); scope off costs
//       >= 0.05 N-F1 in java.
//
// DATA DISCIPLINE (READING-POLICY II.5/II.23, task rule 9): priors are built from TRAIN only, split by REPOSITORY.
//   Design iterations of arm (b) are judged ONLY by leave-one-repository-out cross-validation INSIDE TRAIN
//   (builder run on the other train repos, scored on the held-out train repo). The pre-registered DEV run is
//   the first scored run of the frozen design. DEV is for development smoke only; TEST is never run by this agent:
//   --split test is refused unless C3_FINAL_TEST=1 is set (the one final card, by the main agent).
//
// FREEZE / AMENDMENTS (appended in order, each with its reason; nothing above this line changes after a run):
//   A1 (2026-10-05, after the first TRAIN-LOO run, BEFORE any DEV run). Implementation names: the five levels of
//      "frames" are called h4 (= f4), h3 (= f3), h2 (= f1), h1 (= f0) in adapters/code/declared.js; f2 (L1|R1 R2)
//      is g2, and g1 (L2 L1|R1 R2 R3, no S) was added so that the scope-off ablation (b-scope) uses the chain
//      h4 -> g2 -> g1 with the same window as the full chain. Nothing else about the frames changed.
//   A2 (same time; reason: the first TRAIN-LOO of javascript, fold ElemeFE/element, listed `switch`/`while`
//      as FALSE POSITIVES because three train repos did not show them >= 3 times as keyword tokens). The closed
//      class K is now the grammar-derived keywords UNION the RECEIVED keyword prior of the language when one
//      exists (priors/code-kw-js.json, code-kw-py.json; giver = the language engine), where a received keyword
//      that the grammar tags as a NAME in >= SOFT_SHARE = 0.1 of >= 3 train occurrences is SOFT (recorded as
//      softKeywords, never refuses: S83, e.g. get/set/static/of in JS). TRAIN-LOO javascript N-F1 0.833 -> 0.850.
//      c, go, ruby, java have no received keyword prior: K is grammar-derived from train only (a limit).
//      Arm (a) uses the received code-kw prior for py/js exactly as shipped, unchanged.
//   FROZEN DESIGN. PARAMS exactly as adapters/code/declared.js exports them: LWIN 2, RWIN 3, ALPHA 2, MIN_N 2,
//      K_SHARE 0.9, K_MIN 3, SOFT_SHARE 0.1, D_P 0.5, D_MIN 5, COMMENT_PRECISION 0.95, COMMENT_SUPPORT 5,
//      QUOTE_SHARE 0.02, QUAL_MIN 5, QUAL_SHARE 0.01, KIND_MIN 3, DECISION_LOGIT 0.
//      Tokenizer notes (implementation of "lexical"): a 1-2 letter prefix adjacent to a quote joins the quoted
//      token (r"", f'', L""); a #word that is in K is one keyword token (#define); "?"/"!" end a name only when
//      derived as a name suffix (Ruby); a single-quote/double-quote string stops at a newline.
//   TRAIN-LOO at freeze (leave-one-repo-out INSIDE train, arm b only, name F1, micro over the train files; these
//      are design-iteration numbers on TRAIN, not scores): python 0.998, javascript 0.850, c 0.943, go 0.996,
//      ruby 0.959, java 0.989. They are an upper-bound sanity check for transfer to DEV, not a result.
//   DEV RUN 1 (the first scored run of the frozen design, 2026-10-05; cards kept as run1-c3-*-dev.json next to the
//      scratch notes). arm b name-F1 / strongest control (which) / pass: python 0.996 / 0.874 (keyword_regex) /
//      pass; javascript 0.926 / 0.801 (keyword_regex) / pass; c 0.907 / 0.622 (keyword_regex) / pass; go 0.990 /
//      0.999 (keyword_regex) / FAIL (0/3 repos); ruby 0.974 / 0.908 (keyword_regex) / pass; java 0.990 / 0.208
//      (keyword_regex) / pass; pooled 0.958 / 0.713 / licence held (drops 0.795 and 0.927), 5 of 6 languages pass:
//      verdict PASS. Arm a name-F1: python 0.878, javascript 0.740, c 0.395, go 0.912, ruby and java 0 (typed gap).
//   A3 (after DEV RUN 1; a DEFECT FIX found by inspecting the derived priors and the C false positives, NOT a
//      threshold tuned for score; DEV is therefore no longer blind for the lexical design, only TEST is).
//      The lexical derivation was mis-specified: (i) it accepted the SHORTEST precise comment prefix, and "/" is
//      precise in C/Go/Java (comments outnumber divisions 20:1, so precision 0.96 >= 0.95), which made "/" a line-comment
//      opener and left every /* ... */ block comment read as code (the false positives `emits`, `attributes` in C
//      doc comments); (ii) the quote rule was a share (>= 2% of quoted tokens), which dropped python's `'` and C's
//      `"` (gold class `other` preprocessor arguments counted as code). Now: LONGEST prefix first, a 1-char opener only on the
//      comment tokens the 2-char openers did not cover (the residual); quotes by the same precision test
//      (>= 0.95, >= QUOTE_MIN = 5 starts); gold class `other` (text the grammar hides) is not counted as code
//      evidence. QUOTE_SHARE removed, QUOTE_MIN = 5 added; COMMENT_PRECISION stays 0.95. TRAIN-LOO (name F1, before ->
//      after): python 0.998 -> 0.999, javascript 0.850 -> 0.852, c 0.943 -> 0.963, go 0.996 -> 0.996, ruby 0.959 ->
//      0.953, java 0.989 -> 0.995. The scored run after A3 is DEV RUN 2; both runs are reported.
//   A5 (found by the instrument's own TOY test, tests/coding-c3.test.js, not by DEV or TRAIN; a second DEFECT FIX
//      to the lexical derivation). A comment opener was judged BLOCK when >= 80% of its tokens shared the same last two
//      non-alphanumeric characters; a toy corpus whose `// ...` lines all happened to end in " {" turned `//` into a
//      block comment closed by " {". It is now judged BLOCK only on tokens that SPAN LINES (>= COMMENT_SUPPORT of them,
//      >= 80% ending alike); a line comment never contains a newline. The derived priors of python, javascript, c, go,
//      ruby and java were rebuilt and are byte-identical in lexical, keywords and frames (checked), so no DEV number moved.
//   A6 (reporting only, no arm or rule changed): the pass rule is also evaluated on each ablation of (b) and stored
//      as details.ablationPass, because the recurrence witness is the only whole-file statistic in (b) (a lookahead
//      beyond a declaration's own header, READING rule 1) and the scope feature S is language-dependent. These
//      ablation verdicts are never part of the pass.
//   DEV RUN 2 (corrected lexical derivation A3, A5; the scored run of record; cards c3-<lang>-dev.json and
//      c3-pooled-dev.json): arm b name-F1 / strongest control / pass: python 0.999 / 0.875 / pass; javascript 0.926 /
//      0.801 / pass; c 0.980 / 0.644 / pass; go 0.990 / 1.000 (keyword_regex) / FAIL (significantly WORSE, 0/3 repos);
//      ruby 0.974 / 0.908 / pass; java 0.992 / 0.210 / pass; pooled 0.981 / 0.722; licence held (pooled drops 0.808
//      foreign, 0.938 permuted); 5 of 6 languages pass; PASS_POOLED true; verdict PASS.
//   Also recorded from TRAIN-LOO ablations at A3 (independent of DEV): the scope feature S is worth +0.094 N-F1 in
//      python (0.905 -> 0.999 without it) and about -0.02..+0.004 elsewhere (javascript -0.022, c +0.003, go -0.002,
//      ruby -0.004, java -0.002): S is language-dependent evidence, not a universal win. Not changed (frozen).
//   A7 (2026-10-06; a SECOND session picked this file up. Written BEFORE any arm or diagnostic named below was run.
//      Nothing in A7 changes arm b, a frozen PARAM, the scope, the gold, the metrics N/KN/FT, the controls c/d/e1/e2,
//      the bootstrap or the pass statistics; it ADDS reporting arms and diagnostics and one stricter pass condition.)
//      STATE FOUND. Header, reader, tests and the DEV RUN 1/2 cards existed, TEST had never been read (no card, no
//      test-reads.jsonl entry). The reviews that judged this instrument "needs fixes" were not available to this session,
//      so it re-audited from the files instead of trusting the header. VERIFIED (by this session, not taken from the
//      header): the 16 toy tests pass; a rebuilt-from-TRAIN prior reproduces the python DEV card of run 2 to the last
//      digit (score and all four controls); for all six languages no repository and no sha256 occurs in two of
//      train/dev/test, and no prior's trainRepos contains a dev or test repository; an independent recount of the
//      javascript DEV arm-b counts (TP 524, FP 8, FN 76) equals the card's P 0.985 / R 0.873; TRAIN-LOO after A5
//      reproduces python 0.9987, javascript 0.8522, c 0.9631, go 0.9962, java 0.9948 and ruby 0.9590 (A3 above says
//      ruby 0.953: the fold priors changed with A5, the full-TRAIN priors and every DEV number did not).
//      DEFECTS AND GAPS FOUND (none is a threshold; the first four are what a reviewer of this instrument would name):
//        D1 BACKOFF HAS NO COARSE LEVEL. The chain h4 -> h3 -> h2 -> h1 starts at L1|R1 and only refines; a frame seen
//           once (n < MIN_N) is skipped and the reader falls straight to the base rate. Found by reading arm b's
//           false negatives on javascript DEV (a spelled-out `class SimpleMigrationServer {` is missed because
//           `class|{` occurs once in TRAIN, while `class` as the previous token alone is a near-certain declaration;
//           likewise `static name(args) {`). This is DEV inspection: the fix below is judged on TRAIN-LOO first and DEV is
//           no longer blind for it; only TEST is.
//        D2 RULE 1 (CAUSAL). Arm b is a CLAUSE reader (right context <= 3 tokens plus the matching bracket group) with a
//           WHOLE-FILE recurrence witness; the card never said how a strictly prefix reader fares, and there was no
//           test that a claimed-causal reading really is prefix-invariant. (Run 2 already shows b-recurrence ~ b.)
//        D3 SUPERVISION CONFOUND. Every control knows less than b: casing, a regex, a deranged prior. "b beats them"
//           confounds the received prior's supervision with the frame structure. A control that is as supervised as b
//           but structurally minimal is missing.
//        D4 DEFERRED LICENCE. A single-language card says licence="needs-pooled", which the aggregator (run.mjs A5)
//           can only show as a provisional PASS*; but each language's own deranged controls can be checked directly.
//        D5 NAME-SET LENIENCY. N and KN score a SET of names per file: a name predicted at a call site counts as found if
//           the file declares it elsewhere. The card did not report where the reader's hits sit.
//      WHAT A7 ADDS (reporting unless stated; all new arms read the same prior files, rebuilt from TRAIN only):
//        b-h4      chain [h4] only: the simplest TRAINED chain (previous token | next token), casing and recurrence
//                  witnesses as in b. Answers D3.
//        b-prefix  STRICT PREFIX reader: frame = previous token / two previous tokens / enclosing scope only (new prior
//                  levels c1, q2, q3: L1 ; S|L1 ; S|L2 L1), NO right context, recurrence witness OFF (its whole-file
//                  count is lookahead), casing witness ON (a property of the token itself). Answers D2.
//        b-coarse  chain [c1, h4, h3, h2, h1]: arm b plus one coarse backoff level (previous token alone). The fix for D1.
//        details.causality   prefix-invariance probe: each DEV file is cut at the first line break after half its
//                  characters; the admit/refuse decision of every candidate token that ends before the cut is compared
//                  between reading the prefix alone and reading the whole file. The statistic = share of those
//                  decisions that agree. It can FAIL: arm b (right context + whole-file recurrence) must come out < 1.
//        details.localisation  of arm b's TP names, the share whose chosen occurrence lies on a gold def-name span
//                  (answers D5; b keeps the highest-logit occurrence of each name).
//        details.worstFiles  the 5 files with most b errors per language (a pointer for the next iteration).
//        details.licence (object)  per-language licence with the pooled thresholds: F1_b(N) - F1_e1(N) >= 0.10 AND
//                  F1_b(N) - F1_e2(N) >= 0.10 in THIS language; ok:boolean (so the aggregator sees a clean verdict, not
//                  a deferred one). STRICTER PASS: measure() now returns pass = PASS_LANG AND licence.ok. From the run-2
//                  cards the smallest per-language drop was 0.231 (javascript, e1), so this cannot flip a DEV verdict.
//                  The pooled licence of measureAll is unchanged.
//        the pass statistics are also evaluated for each new arm and stored in details.ablationPass (never part of pass).
//        --emit-prior <dir>  writes the TRAIN priors as code-decl-<language>.json for the main agent to vendor.
//      PREDICTIONS for the new arms (calibration; written before the first run of any of them; only the pass rule
//      has consequences). DEV, pooled over the six languages unless a language is named:
//        P7  b-h4 N-F1 < b by >= 0.02 pooled and < b in >= 4 of 6 languages; python loses >= 0.10 (no enclosing scope:
//            module-level assignments cannot be told from the same shape inside a function). b-h4 still beats
//            casing_only, deranged_foreign and deranged_permuted in every language: supervision alone is not what
//            separates b from the controls.
//        P8  b-prefix pooled N-F1 in [0.60, 0.90]; ruby and go within 0.05 of b (their declarations are keyword-led:
//            def class module func type); java >= 0.25 below b and c >= 0.15 below b (keyword-less methods and
//            functions need the `(` to their right); javascript >= 0.15 below b. Prefix-invariance of b-prefix = 1.000
//            exactly in every language; of b < 0.995 pooled. A b-prefix that is not exactly 1.000 is a BUG, not a result.
//        P9  b-coarse: TRAIN-LOO N-F1 >= b in >= 4 of 6 languages, javascript gaining >= +0.015, no language losing
//            more than 0.005. ADOPTION RULE: b-coarse is recommended for the TEST card only if that holds; either way
//            arm b (frozen) stays the arm of record in this card, and a b-coarse that fails is reported as a failed fix.
//        P10 localisation >= 0.98 in every language.
//        P11 the per-language licence holds in all six.
//        P12 REGRESSION: arm b and the four controls are byte-identical to run 2 in every language (the new levels
//            are additional tables; nothing the old chain reads changes).
//      TRAIN-LOO of the new arms (design iteration, run BEFORE DEV run 3; N-F1; b -> b-coarse / b-h4 / b-prefix):
//        python 0.9987 -> 0.9998 / 0.9013 / 0.9971; javascript 0.8522 -> 0.8532 / 0.3729 / 0.4491; c 0.9631 -> 0.9644 /
//        0.8257 / 0.7814; go 0.9962 -> 0.9973 / 0.9959 / 0.9978; ruby 0.9590 -> 0.9619 / 0.9006 / 0.9340; java 0.9948 ->
//        0.9952 / 0.9932 / 0.9197. (The D1 fix is real and tiny: +0.0003..+0.0029, javascript +0.0010.)
//   DEV RUN 3 (2026-10-06, after the A7 code; cards c3-<lang>-dev.json, c3-pooled-dev.json; run 2 kept as
//      scratch-c3/run2-of-record/). REGRESSION (P12) HELD: arm a, b, the three ablations, the four controls and every
//      comparison are byte-identical to run 2 in all six languages; pass per language unchanged (5 of 6, go fails),
//      pooled PASS, no named failure. NEW ARMS, N-F1 (b-prefix / b-h4 / b-coarse; b): python 0.981 / 0.895 / 0.999
//      (0.999); javascript 0.839 / 0.842 / 0.929 (0.926); c 0.847 / 0.967 / 0.982 (0.980); go 1.000 / 0.994 / 0.995
//      (0.990); ruby 0.965 / 0.969 / 0.962 (0.974); java 0.870 / 0.991 / 0.992 (0.992); pooled 0.904 / 0.964 / 0.981
//      (0.981). The pass rule evaluated on each new arm: b-prefix and b-coarse pass in the SAME five languages as b (go
//      fails against keyword_regex, 1.000), so the verdict does not depend on right context or lookahead; b-h4 passes in
//      four (it also fails javascript against keyword_regex). Of the old ablations only b-scope differs (python fails).
//      DIAGNOSTICS: prefix-invariance of b-prefix = 1.00000 in every language (0 flips of 5463 decisions pooled); of b
//      0.99618 pooled (20 flips of 5240; python 1, javascript 2, c 6, go 5, ruby 1, java 5); of b-recurrence 0.99866
//      (7 flips). Localisation of b: 0.9998 pooled (8416 of 8418; c 2670/2672, every other language 100%). Per-language
//      licence holds in all six (smallest drop 0.231: javascript, deranged_foreign). b-coarse on DEV: javascript +0.003,
//      c +0.002, go +0.005, python and java 0, ruby -0.012.
//   SCORING OF THE PREDICTIONS (honest; written after DEV run 3; the pass rule above is the only one with consequences).
//      A7 predictions: P7 b-h4 < b by >= 0.02 pooled: MISSED (0.017); < b in >= 4 of 6: HELD (5); python loses >= 0.10:
//        HELD (0.104); b-h4 beats casing_only/e1/e2 in every language: HELD (its only failures are against keyword_regex,
//        in javascript). P8 b-prefix pooled in [0.60, 0.90]: MISSED (0.904); ruby and go within 0.05 of b: HELD;
//        java >= 0.25 below b: MISSED (-0.122); c >= 0.15 below: MISSED (-0.133); javascript >= 0.15 below: MISSED
//        (-0.087); b-prefix prefix-invariance exactly 1 everywhere: HELD; b < 0.995 pooled: MISSED (0.996; the probe
//        does move, 20 flips, but the lookahead changes 0.4% of decisions). P9: TRAIN-LOO >= b in >= 4 of 6: HELD (6);
//        no language loses > 0.005: HELD; javascript >= +0.015: MISSED (+0.001) => by the ADOPTION RULE b-coarse is NOT
//        recommended for the TEST card (failed fix; and on DEV it loses 0.012 in ruby). P10: HELD. P11: HELD. P12: HELD.
//      First-pre-registration predictions (P1-P6, never scored in this header before): P1 HELD (drops 0.808 / 0.938).
//        P2 MISSED (casing-only N-F1 <= 0.25 in every language: c is 0.334; b beats it everywhere: held). P3 HELD with
//        a wide margin (every language and the pooled floor; the numbers were pessimistic). P4 PARTLY MISSED: significantly
//        better than the keyword regex in c, java and javascript as predicted, but NOT in go (significantly WORSE), and
//        significantly better in python and ruby where it was predicted not to be; predicted 4 passing languages, got 5.
//        P5 PARTLY MISSED: (a) is a typed gap in ruby and java and pooled (a) < pooled (b) as predicted, python (a) FT
//        1.000 vs b 1.000 held, but go (a) FT 0.912 is 0.078 below b (predicted within 0.05). P6 PARTLY MISSED: casing
//        off moves pooled N-F1 by +0.001 (held); scope off costs >= 0.05 in java: MISSED (java +0.003 without scope; python
//        -0.126 without scope, the only language where S matters).
//   A8 (2026-10-06, after DEV run 3; written BEFORE the code below was run). Two further REPORTING additions; no arm,
//      parameter, scope, gold, control or pass statistic changes, and neither enters pass:
//        details.shuffledGold  the INSTRUMENT-level control built to fail (II.23): arm b, keyword_regex and casing_only
//                  are scored against the gold of the NEXT file in the selection order (cyclic shift by one: same
//                  repository, usually the same directory, so the shared generic names of neighbours are the hardest
//                  floor). If the instrument measured "has names like a source file" rather than "this file's own
//                  declarations", this number would not fall. details.shuffledGold also stores real - shuffled.
//        details.macro  per-file macro-F1 (mean over files with >= 1 gold or predicted name; F1 = 0 when nothing hit),
//                  for every arm, beside the micro-pooled F1 the pass uses (large files weigh more in the micro).
//      PREDICTIONS (written before the run): P13 shuffled-gold N-F1 of b <= 0.35 in every language and <= 0.25 pooled,
//        and real - shuffled >= 0.50 pooled; P14 b's macro-F1 is within 0.05 of its micro-F1 in every language.
//   DEV RUN 4 (2026-10-06; the scored run of record from here on; same reader as run 3, plus A8; cards
//      c3-<lang>-dev.json, c3-pooled-dev.json; run 3 kept as scratch-c3/run3/). REGRESSION held again (b, the controls and
//      every comparison byte-identical to run 2). A8: SHUFFLED GOLD, arm b N-F1 shuffled / real: python 0.190 / 0.999;
//      javascript 0.110 / 0.926; c 0.090 / 0.980; go 0.036 / 0.990; ruby 0.117 / 0.974; java 0.039 / 0.992; pooled 0.084 /
//      0.981 (gap 0.897); keyword_regex shuffled pooled 0.054, casing_only 0.017. P13 HELD (largest shuffled 0.190 in
//      python, where `__init__`-like names recur across neighbouring files). MACRO-F1 of b: python 0.999, javascript 0.929,
//      c 0.852, go 0.986, ruby 0.964, java 0.991, pooled 0.959 (micro 0.981). P14 MISSED in c only (macro 0.852 vs micro
//      0.980, gap 0.128: the large macro-heavy files, 1000+ gold names in skint, weigh the micro; small headers fail).
//      Priors verified by this session to hold no train identifier: every word token in the frame keys of the six emitted
//      priors is a closed-class keyword, a derived declaring word, one of the abstractions I N S G, or the scope labels
//      top / none.
//   KNOWN LIMITS found while reading arm b's errors on DEV (none fixed; they are proposals, not tuning):
//      L1 operator runs are atomic tokens, so C `char** f(` and `char * f(` are different frames (c: the cmd-run-*.c
//         family, 6+ misses); proposed: split runs of * and & into single-character tokens (untested, TRAIN-LOO first).
//      L2 prototypes `extern T f(void);` are gold defs (function_declarator) and are missed (c headers).
//      L3 gold quirks the reader cannot know: tree-sitter types `typedef enum GHOSTTY_ENUM_TYPED {` by the macro name;
//         javascript constructors are not defs while Java constructors are; C #define lines inside an ERROR region.
//      L4 sparse right contexts fall to the base rate (D1); the coarse level repairs `class X {` but moves N-F1 by +0.001.
//      L5 object-property function assignments (`o.tz = function`, `$$update_x = function`, 35 misses in one generated
//         javascript test file) are the largest javascript miss. Qualified-name declarations (`class Kamal::Cli::Main <
//         Base`, `module Kamal::Docker`; gold name = last segment) are most of the 49 ruby misses (type recall 0.83):
//         TRAIN holds 0 qualified def names in 1552, so the derived lexical prior has NO `::` qualifier (rule: >= 1% of
//         in-scope def names contain it) and the reader cannot read `Kamal::Cli::Main` as one name. A convention absent from
//         TRAIN is invisible to a prior derived on TRAIN (a distribution-shift limit). Proposed fix, NOT validated here
//         (TRAIN-LOO cannot see it): derive the qualifier from `identifier :: identifier` adjacency in the grammar's own
//         token stream rather than from def names.
//      L6 Go: struct FIELDS typed `bool`/`int`/`error` are read as type declarations (all 12 go false positives), and
//         named slice/map types `type RouteList []Route`, `type IDMap map[...]...` are missed (the 12 go misses).
//   A9 (2026-10-06, plumbing; no number can move). measure() now asks the gold's own capability record first
//      (capabilities.defs.status of the first <= 3 files): not_applicable (JSON: "declares no named entities") returns
//      {applicable:false, reason} (typed, pass null, no hole); a gold gap returns an unmeasured typed gap; a gold with no
//      record (an injected toy) makes no claim. Checked: json -> typed not-applicable; --split test without
//      C3_FINAL_TEST=1 -> refused (this session never read TEST). The final DEV run (RUN 5: same numbers as run 4, produced by
//      the final source so card.details.priorProvenance.key matches it) is the card of record.
//   A10 (2026-10-06; a THIRD session, answering an independent review of this instrument: 12 mutations of the pass statistics,
//      six findings. Written BEFORE any arm, statistic or diagnostic named below was run. Nothing here relaxes a bar: items
//      marked [STRICTER] can only turn a former pass into a non-pass; [REPORT] adds numbers. Arm b, the frozen PARAMS, the
//      gold, the scope, the controls c/d/e1/e2 and the bootstrap are untouched.)
//      WHAT THIS SESSION RAN BEFORE WRITING A10 (none of it can inform the new statistics): the 24 existing tests (all pass);
//      the UNCHANGED instrument on python DEV (reproduces the card of DEV run 5 to the last digit: n 134, score 0.99925,
//      strongest control 0.87458, same prior key); a gold-only tabulation of (def kind, node type) over the first 60 TRAIN files
//      of each of the six languages (to confirm which node types the authored gold queries produce; no system arm was read);
//      and the FT point values of the EXISTING run-5 cards (python FT: b 523/0/0 vs keyword_regex 523/2/0; javascript b 0.926 vs
//      0.801; c b 0.956 vs 0.059; go b 0.990 vs 1.000). Those point values are why P17 below is written the way it is.
//      STATUS OF THE DEV NUMBERS (finding 6). DEV is NOT held-out evidence for this reader. The lexical derivation was corrected
//      after DEV was read (A3: reading DEV false positives lifted c N-F1 0.907 -> 0.980; A5 came from toys), the backoff analysis
//      (A7 D1, b-coarse) read DEV false negatives, and the frame/scope design was developed beside DEV smoke runs. Choices were
//      judged on TRAIN-LOO, but the DEV errors that motivated A3 were read, so II.5 does not allow calling the DEV PASS blind.
//      Consequences, enforced in code: every DEV card carries details.evidence = {class: "development", heldOut: false, ...} with
//      the list of post-DEV-read amendments and the run-1 (frozen-before-DEV) numbers; its first note says so; the pooled verdict
//      text of a DEV run ends "(DEV: development evidence, NOT held-out)". The one held-out reading of the reader is ONE TEST
//      read (C3_FINAL_TEST=1, main agent); a DEV PASS is a regression-and-sanity result, never a competence claim.
//      A10-1 [STRICTER] METRICS = {N, KN, FT}. FT (name F1 over coarse kinds callable|type, defined under METRICS above) becomes
//         the THIRD pre-registered pass metric: PASS_LANG(L) needs, for each control in {c, d, e1, e2} and each metric in
//         {N, KN, FT}: lower bound of the paired bootstrap interval > 0 AND a strict repository majority. Reason: N and KN include
//         kinds whose gold the model AUTHORED (A10-2) and on which a regex baseline structurally scores 0; FT is the scope both the
//         shipped tags and the regex recipes claim. Review evidence: python's win over the regex is entirely the authored kind.
//      A10-2 [REPORT + a second verdict] GIVER OF THE GOLD. gold.py gives each language's defs a giver: the grammar's shipped
//         tags.scm, or an AUTHORED query (model-written, labelled so in gold.py). Gold def records carry the node type; a def is
//         tagged `authored` iff its node type owns a @definition capture of the language's authored `defs` query, read from
//         gold.py's own source at run time (expected: python assignment [module-level assignments, kind constant]; c preproc_def and
//         preproc_function_def [macros]; java enum_declaration, record_declaration, annotation_type_declaration; javascript, go and
//         ruby none); every other def is `shipped`. LIMIT: gold.py records no source tag per def, so a def that both giver
//         kinds produce is tagged by node type (fix proposal: record the query tag in each gold def). Per-giver card: SH = name
//         F1 over shipped-giver gold names, with every predicted name that equals an AUTHORED-ONLY gold name of the file removed
//         from the prediction (neither TP nor FP: it is not shipped-scope); AU = recall of authored-only gold names per arm (a
//         false positive cannot be attributed to a giver, so AU has no F1). passShippedOnly = for every control, SH lower bound > 0
//         AND strict repository majority: "the pass without authored kinds". The pass of record stays the all-scope pass (N, KN,
//         FT); BOTH are on every card (details.passByScope) and on the pooled card. A language that passes only with authored kinds
//         is authored-gold conformance (the prior was trained on the same authored convention), not reading skill.
//      A10-3 [STRICTER/REPORT] ARM a OVER COVERED FILES. Arm (a) is scored only on files whose extension has a recipe. Per language
//         details.arms.a is {typedGap: true} when no file is covered; the pooled arm a is over covered files only, with its
//         coverage (files, of, per language) in details.armACoverage, and every uncovered language in the pooled gaps with counts.
//         P5's "pooled (a) < pooled (b)" is rescored with b over the SAME covered files (details.armAvsB). A typed gap is not a
//         measured failure of the method.
//      A10-4 [STRICTER] DENOMINATOR OF THE POOLED PASS. measureAll: n = declared languages minus those whose card says
//         applicable:false (typed not-applicable, listed in details.notApplicable); need = ceil(2n/3). A language with score null
//         (unmeasured), below the floor, or with an unavailable control (pass null) is a NON-PASS and is listed (details.unmeasured,
//         details.undetermined) and in the pooled gaps with counts. The pooled verdict is `PARTIAL (m of n measured)` whenever any
//         applicable language has pass null; it is never PASS then. pooled.pass = true only when no language is null and PASS_POOLED
//         holds; false when the licence fails, the pooled statistics fail, or need cannot be reached even if every undetermined
//         language passed; null otherwise (a typed gap, never a pass).
//      A10-5 [STRICTER] CONTROL AVAILABILITY. If a language's foreign prior cannot be built the instrument falls back
//         deterministically to the next language of DERANGE_ORDER after the intended one (cyclic, never the language itself) that
//         has a train prior, and records details.foreignFallback. If none exists, deranged_foreign is {unavailable: true}: its F1
//         is null (never 0), it is left out of the comparisons and of the pooled licence arithmetic, card.pass is null with a typed
//         gap (or false when an available control already fails), and licence.ok === null is not a pass. A foreign language
//         pinned explicitly (tests) is never substituted. The pooled licence is about the controls moving where they RAN: its drops are
//         taken over the files where the control exists, languagesBelowPermuted must reach ceil(2m/3) of the m languages measured,
//         languagesBelowForeign must reach ceil(2k/3) of the k measured languages that have a foreign control; a missing language
//         or control is the verdict's business (A10-4: PARTIAL), not evidence that the mechanism is broken. The pooled licence is
//         three-valued: false when an evaluated condition fails, null (undetermined, never a PASS) when the foreign control never ran
//         anywhere, true when every condition ran and held. PASS_LANG is three-valued the same way (false as soon as an available bar
//         fails, null when a bar never ran, true only when all ran and held).
//      A10-6 [REPORT] details.evidence on every card (STATUS above); the pooled verdict says DEV is not held-out.
//      A10-7 TESTS. tests/coding-c3.test.js now pins: the bootstrap interval to its extremes on a case with a closed-form answer
//         and to the 2.5/97.5 percentiles of an independent fixed-seed resample; the repository majority (a control that wins the
//         pooled interval but loses 2 of 3 repositories is not ok; ties are not a majority; repositories under REPO_MIN_GOLD are
//         not eligible); the gold parse-error exclusion (a file with error_bytes_frac 0.05 is a typed gap, one at exactly 0.02
//         is scored); the denominator, the control-availability and the arm-a coverage rules above. Mutants of the pass rule are
//         run against the suite in /private/tmp/claude-501/coding-competence/scratch-c3/mut/ (see the DEV RUN 6 note).
//      PREDICTIONS (calibration; recorded before the run; only the pass rule has consequences). DEV, python/javascript/c/go:
//        P15 REGRESSION: arm b's N/KN/FT counts and the four controls' N/KN counts are byte-identical to DEV run 5 in all four
//            languages (the new statistics are additions; python is already reproduced).
//        P16 giver shares: the authored share of in-scope gold names is >= 0.15 in python, >= 0.25 in c, exactly 0 in javascript
//            and go; keyword_regex recovers 0 of python's authored-only names.
//        P17 python's PASS_LANG becomes FALSE under A10-1 (FT against keyword_regex: b 523/0/0 vs 523/2/0, so the lower bound of
//            the interval cannot exceed 0); javascript and c keep passing on FT (keyword-less forms the regex misses); go still
//            fails (regex 1.000). Hence 2 of 4 languages pass against need = ceil(8/3) = 3: the pooled verdict on {python,
//            javascript, c, go} is FAIL, whatever PASS_POOLED says.
//        P18 passShippedOnly: javascript true, c true, python false, go false.
//        P19 arm a over covered files, pooled over the four: N-F1 of a < N-F1 of b on the same files (a has no macro, method or
//            constant recipe); coverage is 1.0 in python, c and go (every DEV extension has a recipe).
//        P20 licence unchanged: the per-language licences and the pooled licence hold with the SAME drops as run 5 (smallest 0.231).
//   DEV RUN 6 (2026-10-06; the first run of the A10 code, python/javascript/c/go as asked; cards c3-<lang>-dev.json and c3-pooled-dev.json;
//      the run-5 cards are kept in scratch-c3/pre-A10/; all six languages were ALSO run into scratch-c3/run6-six/ for context, not the card
//      of record). Written after the run. DEVELOPMENT evidence, NOT held-out (STATUS above).
//      PASS_LANG (A10 rule), before -> after: python TRUE -> FALSE (b_vs_keyword_regex_FT: lower bound 0.000, repository wins 1/3);
//        javascript true; c true; go false (as before: against keyword_regex N, KN and FT all have lower bound -0.015, 0/3 repositories).
//        POOLED: FAIL, 2 of 4 languages pass against need = ceil(8/3) = 3 (PASS_POOLED itself true; licence holds: pooled drops 0.817
//        foreign, 0.924 permuted over 581 files); verdict text "FAIL (DEV: development evidence, NOT held-out)".
//        passShippedOnly (SH, authored kinds masked): python false (keyword_regex_SH lower bound 0.000, 2/3), javascript true, c true,
//        go false (keyword_regex_SH lower bound -0.015, 0/3). SH-F1 b / keyword_regex: python 1.000 / 0.995; javascript 0.926 / 0.801; c 0.965 /
//        0.096; go 0.990 / 1.000.
//        GIVER: authored share of gold names: python 0.217 (145 of 668; b recovers 144, keyword_regex 0, casing_only 56, arm a 0); c 0.461 (macros;
//        b 1259/1265, keyword_regex 1265/1265: here the authored kind favours the regex, which has a #define pattern); javascript 0 and go 0.
//        ARM a on the files that have a recipe (581 of 581 files, coverage 1.0 in all four): N-F1 0.662 against b 0.979 on the same files.
//        SIX-LANGUAGE POOL (scratch): 4 of 6 pass (javascript, c, ruby, java), need 4: pooled PASS at exactly the ceil(2n/3) line, with python
//        and go failing; arm a is a typed gap in ruby (177 files) and java (180 files), listed in the pooled gaps with denominators; its pooled
//        drops (0.808 / 0.938) and every per-language number are those of run 5.
//      SCORING OF THE A10 PREDICTIONS: P15 HELD (arm b, the three ablations, the added arms and the four controls: N, KN and FT counts
//        byte-identical to run 5 in all four languages; the six priors were rebuilt into a fresh directory and their keys equal the cached
//        ones). P16 HELD (python 0.217 >= 0.15; c 0.461 >= 0.25; javascript and go exactly 0; keyword_regex 0 of 145). P17 HELD (python false on
//        FT with lower bound 0.000; javascript and c pass; go fails; 2 of 4; pooled FAIL). P18 HELD (javascript true, c true, python false, go
//        false). P19 HELD (a 0.662 < b 0.979; coverage 1.0). P20 HELD per language (identical drops, smallest 0.231, javascript foreign) and on
//        the six-language pool (0.808 / 0.938); the four-language pool (0.817 / 0.924) has no run-5 counterpart.
//      WHAT THIS CHANGES. Under the rule of record python no longer passes, so the verdict on the four requested languages is FAIL and the
//        six-language verdict PASS sits exactly on the ceil(2n/3) line; python's win over the keyword regex was the authored `constant` kind
//        (it is conformance to a model-written gold convention the prior was trained on), and it ties on the shipped kinds. Go (regex
//        1.000) still fails. javascript and c pass on both scopes. None of this is held-out.
//      INSTRUMENT TESTS. 54 mutants of the pass statistics and of the A10 logic (bootstrap percentile indices, seed, B, repository majority and
//        eligibility, the strict lower bound, MAX_GOLD_ERROR_FRAC and its boundary, METRICS, the licence gates, the three-valued PASS_LANG,
//        the denominators, control availability and fallback, arm-a coverage, the giver, SH masking, the evidence class and the verdict
//        tag, the TRAIN-only prior, the TEST refusal, the deranged and shuffled controls) were applied one at a time to a scratch copy
//        (scratch-c3/mut/run-mutants.mjs): the review reported that the suite of 24 tests let M5 (50th percentile), M7 (no majority)
//        and M10 (no gold parse filter) through; the suite of 54 tests kills all 54 mutants, including those three.
//      STILL OPEN (proposals; none is mine to change): gold.py records no per-def source tag, so the giver is read off the node type; this
//        instrument keeps no TEST-read ledger (c0's c0-test-reads.jsonl does): only the C3_FINAL_TEST=1 gate stands between the reader and a
//        second TEST read; a held-out card needs ONE TEST read by the main agent.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { goldAvailable, goldBatch, CORE_DEF_KINDS, GOLD_VERSION } from "./gold.mjs";
import {
  buildDeclaredPrior, readDeclared, scoreOccurrences, tokenize, maskText, compilePrior, casingOf, coarseKind, finalSegment,
  PARAMS, DECLARED_PRIOR_SCHEMA, LEVELS, CASING_CLASSES, RECURRENCE_BUCKETS, ARM_OPTS,
} from "../../adapters/code/declared.js";
import { buildCodeIndex, loadCodeKeywordPrior, keywordSetOf } from "../../adapters/text/code-structure.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = process.env.C3_OUT_DIR || "/private/tmp/claude-501/coding-competence";
export const PRIOR_DIR = path.join(OUT_DIR, "c3-priors");
export const MANIFEST_PATH = process.env.C3_MANIFEST || "/private/tmp/claude-501/code-corpus/manifest.json";

export const RUNG = Object.freeze({
  id: "c3",
  name: "declared beings",
  question: "Which entities (functions, methods, classes, types, interfaces, enums, modules, macros, constants) does this file declare, by name, from received priors alone?",
});

// declared constants of the instrument (header: STATISTICS, PASS RULE)
export const STAT = Object.freeze({
  B: 2000, SEED: 20261005, MIN_FILES: 20, MIN_GOLD: 100, REPO_MIN_GOLD: 5, LICENCE_DROP: 0.10, MAJORITY: 2 / 3,
  MAX_GOLD_ERROR_FRAC: 0.02,
});
export const DERANGE_ORDER = Object.freeze(["python", "javascript", "c", "go", "ruby", "java"]);
export const CONTROL_NAMES = Object.freeze(["casing_only", "keyword_regex", "deranged_foreign", "deranged_permuted"]);
// pass-of-record metrics (A10-1: FT is the third); SH is the shipped-giver scope behind passShippedOnly (A10-2)
export const METRICS = Object.freeze(["N", "KN", "FT"]);
export const SHIPPED_METRICS = Object.freeze(["SH"]);

// ═══ gold scope, normalisation, scoring (exported: tests/coding-c3.test.js checks them on a toy fixture) ═══════════
export const SCOPE_KINDS = Object.freeze([...CORE_DEF_KINDS, "constant"]);
export const inScopeDef = (d) => SCOPE_KINDS.includes(d.kind);
const FT_KINDS = new Set(["callable", "type"]);

// ═══ GIVER OF THE GOLD (A10-2): shipped tags.scm vs the model-AUTHORED defs query of gold.py ═══════════════════════
const GOLD_PY = path.join(HERE, "gold.py");
let _goldSrc;
const goldSource = () => (_goldSrc ??= fs.readFileSync(GOLD_PY, "utf8"));

/** node types that own an `@definition.*` capture in a tree-sitter query text: `(node ...) @definition.x`, `[(a ...) (b ...)] @definition.x` */
export function definitionOwners(query) {
  const out = new Set();
  const re = /@definition(?:\.[A-Za-z_]+)?/g;
  let m;
  while ((m = re.exec(query))) {
    let i = m.index - 1;
    while (i >= 0 && /\s/.test(query[i])) i -= 1;
    const close = query[i];
    if (close !== ")" && close !== "]") continue;
    const open = close === ")" ? "(" : "[";
    let depth = 0, j = i;
    for (; j >= 0; j -= 1) {
      if (query[j] === close) depth += 1;
      else if (query[j] === open) { depth -= 1; if (depth === 0) break; }
    }
    if (j < 0) continue;
    if (close === ")") {
      const head = /^\(\s*([A-Za-z_]\w*)/.exec(query.slice(j));
      if (head) out.add(head[1]);
    } else {
      // an alternation: the head of every parenthesised child at its top level
      let d = 0;
      for (let k = j + 1; k < i; k += 1) {
        if (query[k] === "(") { if (d === 0) { const head = /^\(\s*([A-Za-z_]\w*)/.exec(query.slice(k)); if (head) out.add(head[1]); } d += 1; }
        else if (query[k] === ")") d -= 1;
      }
    }
  }
  return out;
}

/**
 * The node types that the AUTHORED `defs` query of `language` produces, read from gold.py's own MAPS source.
 * -> Set<string> (empty = the language has no authored defs query: every def is shipped) | null (language not in MAPS: giver unrecorded)
 */
export function authoredDefNodesFromSource(language, src = goldSource()) {
  const end = src.indexOf("@@MAPS-END@@");
  const body = end >= 0 ? src.slice(0, end) : src;
  const re = /\n    "([A-Za-z0-9_+-]+)": L\(/g;
  const starts = [];
  let m;
  while ((m = re.exec(body))) starts.push({ lang: m[1], at: m.index });
  const k = starts.findIndex((x) => x.lang === language);
  if (k < 0) return null;
  const seg = body.slice(starts[k].at, k + 1 < starts.length ? starts[k + 1].at : body.length);
  const q = /\bdefs\s*=\s*(?:'''|""")([\s\S]*?)(?:'''|""")/.exec(seg);
  return new Set(q ? definitionOwners(q[1]) : []);
}

/** def -> "shipped" | "authored" for a language, or null when the giver is unrecorded (language not in gold.py MAPS). deps.authoredNodes = {language: [node types]} overrides (toy corpora). */
export function giverOfFor(language, deps = {}) {
  const override = deps.authoredNodes?.[language];
  const nodes = override !== undefined ? new Set(override) : authoredDefNodesFromSource(language, deps.goldSource ?? goldSource());
  if (!nodes) return null;
  const fn = (d) => (nodes.has(d.node) ? "authored" : "shipped");
  fn.authoredNodes = [...nodes].sort();
  return fn;
}

/**
 * items of a def list: { N:Set(name), KN:Set(kind\0name), FT:Set(name), SH:Set(shipped-giver names), AU:Set(authored-giver names),
 * byKind:Map(kind->Set(name)), giverRecorded }. An item may carry `giver` ("shipped"|"authored"); predictions carry none.
 */
export function itemsOf(list) {
  const N = new Set(), KN = new Set(), FT = new Set(), SH = new Set(), AU = new Set(), byKind = new Map();
  for (const it of list) {
    const name = finalSegment(it.name);
    if (!name) continue;
    const kind = it.kind;
    N.add(name);
    KN.add(`${kind}\u0000${name}`);
    if (FT_KINDS.has(kind)) FT.add(name);
    if (it.giver === "shipped") SH.add(name); else if (it.giver === "authored") AU.add(name);
    if (!byKind.has(kind)) byKind.set(kind, new Set());
    byKind.get(kind).add(name);
  }
  return { N, KN, FT, SH, AU, byKind, giverRecorded: false };
}
/** gold items of a gold record; with opts.giverOf (see giverOfFor) every item is tagged by giver and giverRecorded is true */
export function goldItems(gold, { giverOf = null } = {}) {
  const it = itemsOf(gold.defs.filter(inScopeDef).map((d) => ({ name: d.name, kind: coarseKind(d.kind), ...(giverOf ? { giver: giverOf(d) } : {}) })));
  it.giverRecorded = Boolean(giverOf);
  return it;
}
/** the gold names that ONLY an authored query produced (a name a shipped def also declares is shipped) */
export const authoredOnly = (goldIt) => new Set([...goldIt.AU].filter((x) => !goldIt.SH.has(x)));

/**
 * per-file counts [tp, fp, fn] for N, KN, FT, plus per-coarse-kind (found,total) of the gold names. With a giver-tagged gold:
 * SH = shipped-scope name counts (predicted names equal to an authored-only gold name are removed from the prediction) and
 * AU = [found, total] of the authored-only gold names (a false positive has no giver, so there is no authored F1).
 */
export function countFile(pred, goldIt) {
  const row = {};
  for (const m of ["N", "KN", "FT"]) {
    let tp = 0;
    for (const x of pred[m]) if (goldIt[m].has(x)) tp += 1;
    row[m] = [tp, pred[m].size - tp, goldIt[m].size - tp];
  }
  const kinds = {};
  for (const [k, names] of goldIt.byKind) {
    let found = 0;
    for (const nm of names) if (pred.N.has(nm)) found += 1;
    kinds[k] = [found, names.size];
  }
  row.kinds = kinds;
  if (goldIt.giverRecorded) {
    const au = authoredOnly(goldIt);
    let tp = 0, fp = 0;
    for (const x of pred.N) { if (au.has(x)) continue; if (goldIt.SH.has(x)) tp += 1; else fp += 1; }
    row.SH = [tp, fp, goldIt.SH.size - tp];
    let found = 0;
    for (const x of au) if (pred.N.has(x)) found += 1;
    row.AU = [found, au.size];
  }
  return row;
}
export const f1of = (tp, fp, fn) => (2 * tp + fp + fn > 0 ? (2 * tp) / (2 * tp + fp + fn) : 0);
export function prf([tp, fp, fn]) {
  return { tp, fp, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null, f1: f1of(tp, fp, fn) };
}
export function pool(rows, metric) {
  let tp = 0, fp = 0, fn = 0;
  for (const r of rows) { tp += r[metric][0]; fp += r[metric][1]; fn += r[metric][2]; }
  return [tp, fp, fn];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeResamples(n, B = STAT.B, seed = STAT.SEED) {
  const rng = mulberry32(seed);
  const idx = new Int32Array(B * n);
  for (let i = 0; i < idx.length; i += 1) idx[i] = Math.floor(rng() * n);
  return { n, B, idx };
}
/** paired bootstrap of F1(a) - F1(b) over files: { diff, lo, hi } two-sided 95% percentile interval */
export function bootstrapDiff(rowsA, rowsB, metric, rs) {
  const n = rowsA.length;
  const diffs = new Float64Array(rs.B);
  for (let b = 0; b < rs.B; b += 1) {
    let ta = 0, fa = 0, na = 0, tb = 0, fb = 0, nb = 0;
    const off = b * n;
    for (let i = 0; i < n; i += 1) {
      const k = rs.idx[off + i];
      const ra = rowsA[k][metric], rb = rowsB[k][metric];
      ta += ra[0]; fa += ra[1]; na += ra[2]; tb += rb[0]; fb += rb[1]; nb += rb[2];
    }
    diffs[b] = f1of(ta, fa, na) - f1of(tb, fb, nb);
  }
  diffs.sort();
  const pa = pool(rowsA.map((r) => r), metric), pb = pool(rowsB.map((r) => r), metric);
  return { diff: f1of(...pa) - f1of(...pb), lo: diffs[Math.floor(0.025 * rs.B)], hi: diffs[Math.min(rs.B - 1, Math.floor(0.975 * rs.B))] };
}

// ═══ baselines (authored; labelled so) ════════════════════════════════════════════════════════════════════════════
const KW_REGEX_KIND = Object.freeze({
  def: "callable", function: "callable", func: "callable", fn: "callable",
  class: "type", struct: "type", enum: "type", interface: "type", trait: "type", type: "type",
  module: "module", namespace: "module", macro: "macro",
});
const NAME_RE = "([\\p{L}_$][\\p{L}\\p{N}_$]*(?:::[\\p{L}_$][\\p{L}\\p{N}_$]*)*)";
// AUTHORED by the model: the obvious language-independent declaration regex (header: arm d)
const KW_REGEX = new RegExp(`(?<![\\p{L}\\p{N}_$.])(${Object.keys(KW_REGEX_KIND).join("|")})[ \\t]+(?:\\([^)\\n]*\\)[ \\t]+)?${NAME_RE}`, "gu");
const DEFINE_REGEX = new RegExp(`^[ \\t]*#[ \\t]*define[ \\t]+${NAME_RE}`, "gmu");

/** arm d: keyword regex over the masked text. -> [{name, kind}] */
export function keywordRegexArm(maskedText) {
  const out = [];
  KW_REGEX.lastIndex = 0;
  let m;
  while ((m = KW_REGEX.exec(maskedText))) out.push({ name: finalSegment(m[2]), kind: KW_REGEX_KIND[m[1]] });
  DEFINE_REGEX.lastIndex = 0;
  while ((m = DEFINE_REGEX.exec(maskedText))) out.push({ name: finalSegment(m[1]), kind: "macro" });
  return out;
}

/** arm c: casing only. -> [{name, kind}] */
export function casingOnlyArm(text, prior) {
  const P = compilePrior(prior);
  const { toks } = tokenize(text, P.lex);
  const seen = new Map();
  for (const t of toks) {
    if (t.t !== "w" || t.kw) continue;
    const c = casingOf(t.last);
    if (c === "pascal") seen.set(t.last, "type");
    else if (c === "screaming") seen.set(t.last, "constant");
  }
  return [...seen.entries()].map(([name, kind]) => ({ name, kind }));
}

// arm a: the existing code-structure.js, as shipped
const A_EXTS = new Set([".c", ".h", ".go", ".py", ".ts", ".tsx", ".js", ".mjs", ".jsx"]);
export function existingArm(text, fileName, language) {
  const ext = path.extname(fileName).toLowerCase();
  if (!A_EXTS.has(ext)) return { gap: `no declaration recipe in code-structure.js RECIPES for extension ${ext || "(none)"}` };
  const keywords = keywordSetOf(loadCodeKeywordPrior(language));
  const index = buildCodeIndex([{ fileName, text }], { keywords });
  const out = [];
  for (const [name, decls] of index.entities) for (const d of decls) out.push({ name, kind: coarseKind(d.kind) });
  return { items: out };
}

// ═══ controls on the prior ════════════════════════════════════════════════════════════════════════════════════════
/** e2: move every value of the nominating tables (frames, casing, recurrence) to another key by a fixed derangement */
export function derangePrior(prior) {
  const rot = (tab) => {
    const keys = Object.keys(tab).sort();
    const m = keys.length;
    if (m < 2) return tab;
    const shift = Math.floor(m / 2) + 1;
    const out = {};
    keys.forEach((k, i) => { out[k] = tab[keys[(i + shift) % m]]; });
    return out;
  };
  const frames = {};
  for (const l of LEVELS) frames[l] = rot(prior.frames[l] ?? {});
  return { ...prior, frames, casing: rot(prior.casing), recurrence: rot(prior.recurrence), provenance: { ...prior.provenance, deranged: "permuted: every nominating table value moved to another key (shift floor(m/2)+1 of the sorted keys)" } };
}
export function foreignLanguage(language, deps = {}) {
  if (deps.foreignLanguage) {
    const pinned = typeof deps.foreignLanguage === "object" ? deps.foreignLanguage[language] : deps.foreignLanguage;
    if (pinned) return pinned;
  }
  const i = DERANGE_ORDER.indexOf(language);
  if (i >= 0) return DERANGE_ORDER[(i + 1) % DERANGE_ORDER.length];
  let h = 0;
  for (const c of language) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DERANGE_ORDER[h % DERANGE_ORDER.length];
}

// ═══ corpus access ════════════════════════════════════════════════════════════════════════════════════════════════
let _manifest;
export function loadManifest(deps = {}) {
  if (deps.manifest) return deps.manifest;
  if (_manifest !== undefined) return _manifest;
  try { _manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")); } catch { _manifest = null; }
  return _manifest;
}

/** deterministic, repository-stratified selection: round-robin over repos, sha256 order inside a repo */
export function selectFiles(rows, limit) {
  const usable = rows.filter((r) => !r.restricted);
  if (!limit || limit >= usable.length) return [...usable].sort((a, b) => (a.repo + a.rel < b.repo + b.rel ? -1 : 1));
  const byRepo = new Map();
  for (const r of usable) { if (!byRepo.has(r.repo)) byRepo.set(r.repo, []); byRepo.get(r.repo).push(r); }
  for (const l of byRepo.values()) l.sort((a, b) => (a.sha256 < b.sha256 ? -1 : 1));
  const repos = [...byRepo.keys()].sort();
  const out = [];
  for (let k = 0; out.length < limit; k += 1) {
    let any = false;
    for (const r of repos) { const row = byRepo.get(r)[k]; if (row) { out.push(row); any = true; if (out.length >= limit) break; } }
    if (!any) break;
  }
  return out;
}

const readRow = (r) => { try { return fs.readFileSync(r.path, "utf8"); } catch { return null; } };
const baseName = (r) => path.basename(r.path);

/** gold for rows, dropping unreadable files and gold errors / unreliable parses as TYPED gaps */
async function goldRows(language, rows, deps = {}) {
  const loaded = [];
  const gaps = { unreadable: 0, goldError: 0, parseUnreliable: 0 };
  for (const r of rows) {
    const text = readRow(r);
    if (text === null) { gaps.unreadable += 1; continue; }
    loaded.push({ row: r, text });
  }
  const golds = await (deps.goldBatch ?? goldBatch)(loaded.map((x) => ({ language, text: x.text, fileName: baseName(x.row) })));
  const out = [];
  loaded.forEach((x, i) => {
    const g = golds[i];
    if (!g || g.error) { gaps.goldError += 1; return; }
    if ((g.parse?.error_bytes_frac ?? 0) > STAT.MAX_GOLD_ERROR_FRAC) { gaps.parseUnreliable += 1; return; }
    out.push({ row: x.row, text: x.text, gold: g, repo: x.row.repo });
  });
  return { files: out, gaps };
}

/**
 * Does THIS rung apply to the language? The gold's own capability record says so per file (capabilities.defs.status:
 * ok | not_applicable | gap, e.g. JSON: "declares no named entities"). A system with no declarations gets a TYPED
 * {applicable:false, reason}, never a silent pass; a gold gap is an unmeasured gap, never a pass.
 * -> { status: "ok" | "not_applicable" | "gap", reason? }. A gold with no capability record (an injected toy) makes no claim: ok.
 */
export async function defsCapability(language, rows, deps = {}) {
  const probe = selectFiles(rows, 3).map((r) => ({ r, text: readRow(r) })).filter((x) => x.text !== null);
  if (!probe.length) return { status: "ok" };
  const golds = await (deps.goldBatch ?? goldBatch)(probe.map((x) => ({ language, text: x.text, fileName: baseName(x.r) })));
  const st = golds.map((g) => g?.capabilities?.defs).filter(Boolean);
  if (!st.length) return { status: "ok" };
  if (st.every((c) => c.status === "not_applicable")) return { status: "not_applicable", reason: st[0].reason ?? "the gold declares no entities for this language" };
  if (!st.some((c) => c.status === "ok") && st.some((c) => c.status === "gap")) return { status: "gap", reason: st.find((c) => c.status === "gap").reason ?? "gold defs capability gap" };
  return { status: "ok" };
}

// ═══ the TRAIN prior (built once, cached by content key) ═══════════════════════════════════════════════════════════
const _src = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
export function priorKey(language, trainRows) {
  const h = crypto.createHash("sha256");
  h.update(JSON.stringify({ language, schema: DECLARED_PRIOR_SCHEMA, params: PARAMS, gold: GOLD_VERSION, scope: SCOPE_KINDS,
    adapter: _src(path.join(HERE, "../../adapters/code/declared.js")), rows: trainRows.map((r) => [r.repo, r.rel, r.sha256]) }));
  return h.digest("hex").slice(0, 24);
}

/** build a prior from TRAIN rows (optionally leaving one repository out: leave-one-repo-out CV INSIDE train) */
export async function buildTrainPrior(language, { excludeRepo = null, trainRows = null, deps = {} } = {}) {
  const man = loadManifest(deps);
  const all = trainRows ?? man?.languages?.[language]?.train;
  if (!all) throw new Error(`no train rows for ${language}`);
  const rows = all.filter((r) => !r.restricted && r.repo !== excludeRepo);
  const { files, gaps } = await goldRows(language, rows, deps);
  if (!files.length) throw new Error(`no usable train files for ${language}`);
  const received = keywordSetOf(loadCodeKeywordPrior(language));
  const prior = buildDeclaredPrior({
    language, files: files.map((f) => ({ text: f.text, gold: f.gold, repo: f.repo })), inScope: inScopeDef,
    extraKeywords: received ? [...received] : null,
    provenance: {
      split: "train", manifest: MANIFEST_PATH, goldVersion: GOLD_VERSION, builtAt: new Date().toISOString(),
      excludedRepo: excludeRepo, trainRows: rows.length, trainGaps: gaps, trainRepos: [...new Set(files.map((f) => f.repo))].sort(),
    },
  });
  return prior;
}

const _priors = new Map();
export async function getPrior(language, deps = {}) {
  const memo = deps.manifest ? (deps._priors ??= new Map()) : _priors; // injected corpora (tests) never touch the disk cache
  if (memo.has(language)) return memo.get(language);
  const man = loadManifest(deps);
  const train = man?.languages?.[language]?.train;
  if (!train) throw new Error(`language ${language} has no train split in the manifest`);
  const key = priorKey(language, train.filter((r) => !r.restricted));
  const file = path.join(PRIOR_DIR, `declared-${language}.json`);
  let prior = null;
  if (!deps.manifest) { try { const cached = JSON.parse(fs.readFileSync(file, "utf8")); if (cached?.provenance?.key === key) prior = cached; } catch { /* rebuild */ } }
  if (!prior) {
    prior = await buildTrainPrior(language, { deps });
    prior.provenance.key = key;
    if (!deps.manifest) { fs.mkdirSync(PRIOR_DIR, { recursive: true }); fs.writeFileSync(file, JSON.stringify(prior)); }
  }
  memo.set(language, prior);
  return prior;
}

// ═══ one file through every arm ═══════════════════════════════════════════════════════════════════════════════════
function toPred(list) { return itemsOf(list); }

export function runArms(file, ctx) {
  const { text, row } = file;
  const fileName = baseName(row);
  const { prior, foreign, permuted, language } = ctx;
  const P = compilePrior(prior);
  const { spans } = tokenize(text, P.lex);
  const masked = maskText(text, spans);
  const arms = {};
  const gaps = [];
  const b = readDeclared(text, prior, ARM_OPTS.b);
  arms.b = toPred(b);
  for (const ab of B_FAMILY.slice(1)) arms[ab] = toPred(readDeclared(text, prior, ARM_OPTS[ab]));
  arms.casing_only = toPred(casingOnlyArm(text, prior));
  arms.keyword_regex = toPred(keywordRegexArm(masked));
  // A10-5: a control that could not be built is NULL (never an empty prediction scored as 0)
  arms.deranged_foreign = foreign ? toPred(readDeclared(text, foreign)) : null;
  arms.deranged_permuted = toPred(readDeclared(text, permuted));
  // A10-3: a file with no recipe for arm a is a typed gap (null), never an empty prediction scored as a miss
  const a = existingArm(text, fileName, language);
  if (a.gap) { arms.a = null; gaps.push(a.gap); } else arms.a = toPred(a.items);
  return { arms, gaps, bRaw: b };
}

// the arms that read the SAME prior with a different chain/witness set (declared.js ARM_OPTS): b is the frozen arm of record,
// b-casing/b-recurrence/b-scope are the ablations of the first pre-registration, b-h4/b-prefix/b-coarse were added by A7
const B_FAMILY = Object.freeze(["b", "b-casing", "b-recurrence", "b-scope", "b-h4", "b-prefix", "b-coarse"]);
export const REPORTED_B_ARMS = Object.freeze(B_FAMILY.slice(1));
export const ARM_ORDER = Object.freeze(["a", ...B_FAMILY, "casing_only", "keyword_regex", "deranged_foreign", "deranged_permuted"]);

const emptyCard = (language, split, extra = {}) => ({
  id: RUNG.id, rung: RUNG.id, split, language, n: 0, applicable: true, score: null, control: null, margin: null, pass: null,
  controls: {}, gaps: [], notes: [], details: {}, ...extra,
});
const unmeasured = (language, split, reason, extra = {}) => emptyCard(language, split, { gaps: [{ reason: "unmeasured", detail: reason, count: 1 }], notes: [reason], ...extra });

/** per-repo micro F1 of one arm on one metric (only repos with >= REPO_MIN_GOLD in-scope gold items); a null row (typed gap) is skipped */
function perRepo(files, rowsByArm, arm, metric) {
  const repos = new Map();
  files.forEach((f, i) => {
    const row = rowsByArm[arm][i];
    if (!row) return;
    if (!repos.has(f.repo)) repos.set(f.repo, []);
    repos.get(f.repo).push(row);
  });
  const out = {};
  for (const [repo, rows] of repos) {
    const [tp, fp, fn] = pool(rows, metric);
    out[repo] = { files: rows.length, gold: tp + fn, f1: f1of(tp, fp, fn) };
  }
  return out;
}

/**
 * The pass comparison of arm `a` against `control` on one metric (PASS RULE): (i) the lower bound of the paired bootstrap interval of
 * F1_a - F1_control > 0 AND (ii) a STRICT majority of the repositories with >= REPO_MIN_GOLD in-scope gold items where F1_a > F1_control.
 * Exported: tests/coding-c3.test.js pins both conditions.
 */
export function compare(rowsByArm, files, rs, a, control, metric) {
  const bs = bootstrapDiff(rowsByArm[a], rowsByArm[control], metric, rs);
  const ra = perRepo(files, rowsByArm, a, metric);
  const rc = perRepo(files, rowsByArm, control, metric);
  let eligible = 0, wins = 0;
  for (const repo of Object.keys(ra)) {
    if (ra[repo].gold < STAT.REPO_MIN_GOLD) continue;
    eligible += 1;
    if (ra[repo].f1 > rc[repo].f1) wins += 1;
  }
  const majority = eligible > 0 && wins > eligible / 2;
  return { diff: bs.diff, lo: bs.lo, hi: bs.hi, repoWins: wins, repoEligible: eligible, ok: bs.lo > 0 && majority };
}

/**
 * compare() over the files where BOTH arms exist (A10-5: a control that could not be built has null rows). All files present: exactly
 * compare() (same resamples, same numbers). Some missing: the comparison over the files that have both, with its own deterministic
 * resamples, `partial: true`. None: {unavailable: true, ok: false} (a missing control is never a win and never a 0 score).
 */
export function comparePair(rowsByArm, files, rs, a, control, metric) {
  const ra = rowsByArm[a], rc = rowsByArm[control];
  const keep = [];
  for (let i = 0; i < ra.length; i += 1) if (ra[i] && rc[i]) keep.push(i);
  if (keep.length === 0) return { unavailable: true, ok: false, diff: null, lo: null, hi: null, repoWins: 0, repoEligible: 0, files: 0 };
  if (keep.length === ra.length) return { ...compare(rowsByArm, files, rs, a, control, metric), files: keep.length };
  const sub = { [a]: keep.map((i) => ra[i]), [control]: keep.map((i) => rc[i]) };
  return { ...compare(sub, keep.map((i) => files[i]), makeResamples(keep.length), a, control, metric), files: keep.length, partial: true };
}

/** per-arm tables. A null row (typed gap: no recipe for arm a, no control built) is left out; an arm with no row at all is {unavailable: true}. */
function summarise(rowsByArm) {
  const arms = {};
  for (const arm of Object.keys(rowsByArm)) {
    const rows = rowsByArm[arm].filter(Boolean);
    if (!rows.length) { arms[arm] = { unavailable: true, files: 0 }; continue; }
    const kinds = {};
    for (const r of rows) for (const [k, [f, t]] of Object.entries(r.kinds)) { if (!kinds[k]) kinds[k] = [0, 0]; kinds[k][0] += f; kinds[k][1] += t; }
    arms[arm] = {
      files: rows.length,
      N: prf(pool(rows, "N")), KN: prf(pool(rows, "KN")), FT: prf(pool(rows, "FT")),
      recallByKind: Object.fromEntries(Object.entries(kinds).map(([k, [f, t]]) => [k, { found: f, total: t, recall: t ? f / t : null }])),
    };
    if (rows.every((r) => r.SH)) {
      arms[arm].SH = prf(pool(rows, "SH"));
      let found = 0, total = 0;
      for (const r of rows) { found += r.AU[0]; total += r.AU[1]; }
      arms[arm].authoredRecall = { found, total, recall: total ? found / total : null };
    }
  }
  return arms;
}

const triState = (allAvailableOk, anyMissing) => (!allAvailableOk ? false : anyMissing ? null : true);

/**
 * evaluate one language's (or the pooled) scored files -> arms table, comparisons, pass. Exported for pooled use and tests.
 *   pass            the pass of record (A10-1): every control x {N, KN, FT} ok AND no control missing
 *   passAvailable   the same over the controls that exist (a missing control is not counted as a win or a loss)
 *   passShippedOnly the pass without authored kinds (A10-2): every control on SH; null when the giver is unrecorded or a control is missing
 */
export function evaluate(files, perFileRows, rs) {
  const arms = summarise(perFileRows);
  const comparisons = {};
  for (const c of CONTROL_NAMES) for (const m of METRICS) comparisons[`b_vs_${c}_${m}`] = comparePair(perFileRows, files, rs, "b", c, m);
  const missingControls = CONTROL_NAMES.filter((c) => perFileRows[c].every((r) => !r));
  const partialControls = CONTROL_NAMES.filter((c) => !missingControls.includes(c) && perFileRows[c].some((r) => !r));
  const passAvailable = Object.values(comparisons).filter((x) => !x.unavailable).every((x) => x.ok);
  const pass = passAvailable && missingControls.length === 0;
  const hasSH = perFileRows.b.length > 0 && perFileRows.b.every((r) => r?.SH);
  const shippedComparisons = {};
  if (hasSH) for (const c of CONTROL_NAMES) for (const m of SHIPPED_METRICS) shippedComparisons[`b_vs_${c}_${m}`] = comparePair(perFileRows, files, rs, "b", c, m);
  const passShippedOnly = hasSH ? triState(Object.values(shippedComparisons).filter((x) => !x.unavailable).every((x) => x.ok), missingControls.length > 0) : null;
  // the same rule applied to each ablation / added arm of (b): REPORTED, never part of the pass. `b-recurrence` is the arm that
  // uses no whole-file statistic; `b-scope` uses no structure witness; `b-prefix` reads nothing to the right of the candidate
  // (A7); `b-h4` is the simplest trained chain; `b-coarse` adds one coarse backoff level.
  const ablationPass = {};
  for (const ab of REPORTED_B_ARMS) {
    const res = {};
    for (const c of CONTROL_NAMES) for (const m of METRICS) res[`${c}_${m}`] = comparePair(perFileRows, files, rs, ab, c, m).ok;
    ablationPass[ab] = { all: Object.values(res).every(Boolean), failed: Object.entries(res).filter(([, v]) => !v).map(([k]) => k) };
  }
  return { arms, comparisons, shippedComparisons, pass, passAvailable, passShippedOnly, missingControls, partialControls, ablationPass };
}

function strongest(arms, metric) {
  let best = null;
  for (const c of CONTROL_NAMES) { if (arms[c].unavailable) continue; const v = arms[c][metric].f1; if (!best || v > best.v) best = { name: c, v }; }
  return best;
}

// ═══ A7 diagnostics (reporting only) ═════════════════════════════════════════════════════════════════════════════════
/** of arm b's predicted names that are gold names, how many were chosen AT a gold def-name span: [tp, atGoldSpan] */
export function localisationCount(bRaw, gold) {
  const spans = new Map();
  for (const d of gold.defs) {
    if (!inScopeDef(d)) continue;
    const n = finalSegment(d.name);
    if (!spans.has(n)) spans.set(n, []);
    spans.get(n).push([d.nameStart, d.nameEnd]);
  }
  let tp = 0, at = 0;
  for (const p of bRaw) {
    const sp = spans.get(finalSegment(p.name));
    if (!sp) continue;
    tp += 1;
    if (sp.some(([s, e]) => p.start < e && s < p.end)) at += 1;
  }
  return [tp, at];
}

export const PROBE_ARMS = Object.freeze(["b", "b-recurrence", "b-prefix"]);
/**
 * PREFIX-INVARIANCE PROBE (A7, rule 1). Each file is cut at the first line break at or after half of its characters. For
 * every candidate token that ends before the cut, the admit/refuse decision (logit >= DECISION_LOGIT) of reading the PREFIX
 * ALONE is compared with the decision of reading the WHOLE file. agreement = 1 - flipped / admitted-in-either. A reader that
 * sees only the prefix scores exactly 1; a reader that looks to the right of the candidate or counts the whole file does not.
 * The probe must be able to fail: b (right context + whole-file recurrence) is expected < 1.
 */
export function causalityProbe(files, prior, arms = PROBE_ARMS, deps = {}) {
  const score = deps.score ?? scoreOccurrences; // injectable so the probe's own power can be tested with a reader that cheats
  const out = Object.fromEntries(arms.map((a) => [a, { files: 0, tokens: 0, admitted: 0, flipped: 0, unmatched: 0 }]));
  for (const f of files) {
    const text = f.text;
    const nl = text.indexOf("\n", Math.floor(text.length / 2));
    if (nl < 0 || nl + 1 >= text.length) continue;
    const cut = nl + 1;
    const pre = text.slice(0, cut);
    for (const a of arms) {
      const full = score(text, prior, ARM_OPTS[a]);
      const part = score(pre, prior, ARM_OPTS[a]);
      const thr = full.P.params.DECISION_LOGIT;
      const byStart = new Map(part.rows.map((r) => [r.start, r]));
      const o = out[a];
      o.files += 1;
      for (const r of full.rows) {
        if (r.end > cut) break;
        const q = byStart.get(r.start);
        if (!q) { o.unmatched += 1; continue; }
        o.tokens += 1;
        const af = r.logit >= thr, aq = q.logit >= thr;
        if (af || aq) { o.admitted += 1; if (af !== aq) o.flipped += 1; }
      }
    }
  }
  for (const a of arms) out[a].agreement = out[a].admitted ? 1 - out[a].flipped / out[a].admitted : null;
  return out;
}
const sumProbe = (list) => {
  const out = {};
  for (const probe of list) for (const [a, v] of Object.entries(probe)) {
    if (!out[a]) out[a] = { files: 0, tokens: 0, admitted: 0, flipped: 0, unmatched: 0 };
    for (const k of ["files", "tokens", "admitted", "flipped", "unmatched"]) out[a][k] += v[k];
  }
  for (const v of Object.values(out)) v.agreement = v.admitted ? 1 - v.flipped / v.admitted : null;
  return out;
};

/** the k files with most arm-b errors (name metric): a pointer for the next iteration, not a score */
export function worstFilesOf(files, rowsB, k = 5) {
  return files.map((f, i) => ({ file: f.row.rel ?? f.row.path, repo: f.repo, tp: rowsB[i].N[0], fp: rowsB[i].N[1], fn: rowsB[i].N[2] }))
    .sort((x, y) => (y.fp + y.fn) - (x.fp + x.fn) || (x.file < y.file ? -1 : 1)).slice(0, k).filter((x) => x.fp + x.fn > 0);
}

/**
 * per-language licence (A7, D4): the deranged controls must lose >= LICENCE_DROP of N-F1 against b IN THIS LANGUAGE.
 * A10-5: a foreign control that was never built could not have failed, so its drop is null (never 0 - the F1 of a control that did not run
 * is not 0) and ok is null (deferred, NOT a pass) unless the permuted control already fails (then ok is false whatever the foreign one does).
 */
export function languageLicence(arms, { foreignAvailable = true } = {}) {
  const fu = !foreignAvailable || !arms.deranged_foreign || arms.deranged_foreign.unavailable;
  const dropForeign = fu ? null : arms.b.N.f1 - arms.deranged_foreign.N.f1;
  const dropPermuted = arms.b.N.f1 - arms.deranged_permuted.N.f1;
  const ok = dropPermuted < STAT.LICENCE_DROP ? false : fu ? null : dropForeign >= STAT.LICENCE_DROP;
  const fmt = (x) => (x === null ? "n/a" : x.toFixed(3));
  return {
    ok, scope: "language", threshold: STAT.LICENCE_DROP, dropForeign, dropPermuted,
    reason: ok === null ? "the foreign prior is unavailable: deranged_foreign was never built and could not have failed (its F1 is null, not 0); the licence is undetermined and is not a pass"
      : ok ? "both deranged controls lose >= threshold of N-F1 against b in this language"
        : `a deranged control did as well as the real arm (drops ${fmt(dropForeign)} / ${fmt(dropPermuted)}; need >= ${STAT.LICENCE_DROP}): the instrument or mechanism is suspect, PASS is void`,
    pooled: "the pooled licence (>= threshold pooled and ceil(2n/3) languages) is evaluated by measureAll",
  };
}

export const SHUFFLE_ARMS = Object.freeze(["b", "keyword_regex", "casing_only"]);
/**
 * A8 instrument-level control: score each file's predictions against the gold of the NEXT file (cyclic shift by one in the
 * selection order). -> { arm: [count rows] } ; empty when fewer than 2 files. The statistic must collapse if the instrument
 * measures what THIS file declares.
 */
export function shuffledGoldRows(predByArm, goldList, arms = SHUFFLE_ARMS) {
  const n = goldList.length;
  const out = {};
  for (const a of arms) out[a] = n < 2 ? [] : predByArm[a].map((pred, i) => countFile(pred, goldList[(i + 1) % n]));
  return out;
}
/** per-file macro-F1 of one metric: mean over files with >= 1 gold or predicted name (F1 0 when nothing hit) */
export function macroF1(rows, metric = "N") {
  let sum = 0, k = 0;
  for (const r of rows) {
    if (!r) continue; // a typed gap (no recipe, no control built) is not a file scored 0
    const [tp, fp, fn] = r[metric];
    if (tp + fp + fn === 0) continue;
    sum += f1of(tp, fp, fn);
    k += 1;
  }
  return k ? sum / k : null;
}
const macroTable = (perFileRows) => Object.fromEntries(Object.keys(perFileRows).map((a) => [a, { N: macroF1(perFileRows[a], "N"), KN: macroF1(perFileRows[a], "KN") }]));
const shuffledCard = (rowsByArm, perFileRows) => {
  const o = {};
  for (const a of Object.keys(rowsByArm)) {
    if (!rowsByArm[a].length) continue;
    const sh = prf(pool(rowsByArm[a], "N")).f1;
    o[a] = { shuffledF1: sh, realF1: prf(pool(perFileRows[a], "N")).f1 };
    o[a].gap = o[a].realF1 - sh;
  }
  return o;
};

// ═══ EVIDENCE CLASS (A10-6, finding 6): a DEV card is development evidence, never held-out ════════════════════════════
// numbers as recorded in the header (DEV RUN 1 = the frozen design before any DEV read; DEV RUN 2 = after A3/A5), [name-F1 of b, strongest control, pass]
export const DEV_HISTORY = Object.freeze({
  source: "the header of eval/coding-competence/c3-declared.mjs (DEV RUN 1 and DEV RUN 2 paragraphs)",
  run1_frozenDesignBeforeDevWasRead: Object.freeze({ python: [0.996, 0.874, true], javascript: [0.926, 0.801, true], c: [0.907, 0.622, true], go: [0.990, 0.999, false], ruby: [0.974, 0.908, true], java: [0.990, 0.208, true] }),
  run2_afterA3A5: Object.freeze({ python: [0.999, 0.875, true], javascript: [0.926, 0.801, true], c: [0.980, 0.644, true], go: [0.990, 1.000, false], ruby: [0.974, 0.908, true], java: [0.992, 0.210, true] }),
  note: "run 1 and run 2 pass the same five languages (go fails): the post-DEV-read lexical fixes moved scores (c 0.907 -> 0.980), not a per-language verdict of the old rule",
});
export const POST_DEV_READ_AMENDMENTS = Object.freeze([
  "A3 lexical derivation (longest comment prefix; quote precision): found by reading DEV false positives in C; c N-F1 0.907 -> 0.980",
  "A5 block-comment rule (found by a toy test after A3; priors byte-identical in lexical/keywords/frames)",
  "A7 D1 backoff / b-coarse analysis: motivated by reading DEV false negatives (arm b of record unchanged; b-coarse not adopted)",
  "A10 pass-rule tightening (FT added, denominators, control availability): written after reading the existing DEV cards; it only adds bars",
]);
/** what kind of evidence a card of this split is (II.5). Exported; every card carries it (card.evidence and card.details.evidence). */
export function evidenceOf(split) {
  if (split === "test") {
    return {
      class: "held-out", heldOut: true, split,
      read: "held-out ONLY if this is the first and only TEST read of this reader (this instrument keeps no TEST-read ledger: the C3_FINAL_TEST=1 gate is the only guard)",
      caveat: "the reader, its lexical derivation and the pass rule were fixed on TRAIN-LOO and DEV before TEST was read; nothing may be tuned after this card",
    };
  }
  if (split === "dev") {
    return {
      class: "development", heldOut: false, split,
      reason: "the lexical derivation (A3, A5) and the backoff analysis (A7 D1) were changed after DEV errors were read (II.5): a DEV PASS is a regression-and-sanity result, not a competence claim",
      amendmentsAfterDevRead: POST_DEV_READ_AMENDMENTS, history: DEV_HISTORY,
      heldOutEvidence: "ONE TEST read (C3_FINAL_TEST=1) by the main agent",
    };
  }
  return { class: "train", heldOut: false, split, reason: "the received prior was built from these rows: not held-out" };
}
const evidenceTag = (split) => (split === "test" ? "" : split === "dev" ? " (DEV: development evidence, NOT held-out)" : " (TRAIN: the prior was built from these rows, NOT held-out)");
const evidenceNote = (ev) => `EVIDENCE: ${ev.class}${ev.heldOut ? "" : ", NOT held-out"}: ${ev.reason ?? ev.read}`;

// per-file rows kept for pooling across languages within one process
const _kept = new Map();

/**
 * PASS_LANG as a three-valued function (A10-5): null (typed gap) when the floor is not met; false as soon as an available bar fails (the
 * statistics or the licence), whatever is undetermined; null when nothing has failed but something that could still fail was never run
 * (a missing control: statPass null, an undetermined licence: licenceOk null); true only when every bar was run and met.
 */
export function languageOutcome({ floorOk, statPass, licenceOk }) {
  if (!floorOk) return null;
  if (statPass === false || licenceOk === false) return false;
  if (statPass === null || licenceOk === null) return null;
  return true;
}

/** the intended foreign prior, else (never when pinned) the next language of DERANGE_ORDER that has a train prior (A10-5) */
async function loadForeign(language, deps) {
  const wanted = foreignLanguage(language, deps);
  const attempts = [];
  try { return { foreign: await getPrior(wanted, deps), lang: wanted, fallback: null, note: null }; } catch (e) { attempts.push({ language: wanted, error: e.message }); }
  const pinned = Boolean(deps.foreignLanguage && (typeof deps.foreignLanguage !== "object" || deps.foreignLanguage[language]));
  if (!pinned) {
    const i = DERANGE_ORDER.indexOf(wanted);
    const ring = i >= 0 ? [...DERANGE_ORDER.slice(i + 1), ...DERANGE_ORDER.slice(0, i)] : [...DERANGE_ORDER];
    for (const cand of ring) {
      if (cand === language || cand === wanted) continue;
      try {
        const foreign = await getPrior(cand, deps);
        return { foreign, lang: cand, fallback: { wanted, used: cand, attempts }, note: `foreign prior ${wanted} unavailable (${attempts[0].error}); fell back to ${cand} (next of DERANGE_ORDER with a train prior)` };
      } catch (e) { attempts.push({ language: cand, error: e.message }); }
    }
  }
  return { foreign: null, lang: null, fallback: null, wanted, attempts, note: `foreign prior ${wanted} unavailable (${attempts[0].error})${pinned ? "; pinned, no substitute" : "; no other language has a train prior"}: deranged_foreign was NOT run (null, never 0)` };
}

export async function measure({ language, split = "dev", limit = null, deps = {} } = {}) {
  if (split === "test" && process.env.C3_FINAL_TEST !== "1") {
    return emptyCard(language, split, { gaps: [{ reason: "refused", detail: "split test is the ONE final card; set C3_FINAL_TEST=1 (main agent only)", count: 1 }], notes: ["TEST is never run during development"] });
  }
  if (!["dev", "test", "train"].includes(split)) return unmeasured(language, split, `unknown split ${split}`);
  const av = deps.goldBatch ? { available: true } : goldAvailable();
  if (!av.available) return unmeasured(language, split, `gold extractor unavailable: ${av.reason}`);
  const man = loadManifest(deps);
  if (!man) return unmeasured(language, split, `corpus manifest not found at ${MANIFEST_PATH}`);
  const entry = man.languages?.[language];
  if (!entry || !(entry[split] ?? []).length) return unmeasured(language, split, `language ${language} has no ${split} rows in the manifest`);
  const cap = await defsCapability(language, entry[split], deps);
  if (cap.status === "not_applicable") {
    return emptyCard(language, split, { applicable: false, reason: cap.reason, notes: [`not applicable: ${cap.reason}`], details: { reason: cap.reason, giver: "gold capabilities.defs (eval/coding-competence/gold.mjs)" } });
  }
  if (cap.status === "gap") return unmeasured(language, split, `gold defs capability gap: ${cap.reason}`);
  let prior;
  try { prior = await getPrior(language, deps); } catch (e) { return unmeasured(language, split, `no prior: ${e.message}`); }
  const fl = await loadForeign(language, deps);
  const foreign = fl.foreign, foreignLang = fl.lang;
  let giverOf = null, giverWhy = null;
  try { giverOf = giverOfFor(language, deps); if (!giverOf) giverWhy = `language ${language} is not in the gold.py mapping table`; } catch (e) { giverWhy = e.message; }

  const rows = selectFiles(entry[split], limit);
  const { files, gaps: g0 } = await goldRows(language, rows, deps);
  const gapList = [];
  if (g0.unreadable) gapList.push({ reason: "file unreadable", count: g0.unreadable });
  if (g0.goldError) gapList.push({ reason: "gold extractor error or timeout", count: g0.goldError });
  if (g0.parseUnreliable) gapList.push({ reason: `gold parse unreliable (error_bytes_frac > ${STAT.MAX_GOLD_ERROR_FRAC})`, count: g0.parseUnreliable });
  const evidence = evidenceOf(split);
  const card = emptyCard(language, split, { gaps: gapList, evidence });
  card.notes.push(evidenceNote(evidence));
  card.n = files.length;
  card.details.evidence = evidence;
  if (fl.note) card.notes.push(fl.note);
  if (!files.length) { card.gaps.push({ reason: "unmeasured", detail: "no scoreable files", count: 1 }); return card; }

  const permuted = derangePrior(prior);
  const ctx = { prior, foreign, permuted, language };
  const perFileRows = Object.fromEntries(ARM_ORDER.map((a) => [a, []]));
  const aGaps = new Map();
  const goldCounts = { N: 0, KN: 0 };
  const giverCounts = { shipped: 0, authoredOnly: 0 };
  const loc = [0, 0];
  const predByArm = Object.fromEntries(SHUFFLE_ARMS.map((a) => [a, []]));
  const goldList = [];
  for (const f of files) {
    const gi = goldItems(f.gold, { giverOf });
    goldList.push(gi);
    goldCounts.N += gi.N.size; goldCounts.KN += gi.KN.size;
    if (giverOf) { giverCounts.shipped += gi.SH.size; giverCounts.authoredOnly += authoredOnly(gi).size; }
    let res;
    try { res = runArms(f, ctx); } catch (e) { card.notes.push(`reader threw on ${baseName(f.row)}: ${e.message}`); res = { arms: Object.fromEntries(ARM_ORDER.map((a) => [a, itemsOf([])])), gaps: [], bRaw: [] }; }
    for (const a of ARM_ORDER) perFileRows[a].push(res.arms[a] ? countFile(res.arms[a], gi) : null);
    for (const a of SHUFFLE_ARMS) predByArm[a].push(res.arms[a]);
    for (const g of res.gaps) aGaps.set(g, (aGaps.get(g) ?? 0) + 1);
    const [t, at] = localisationCount(res.bRaw ?? [], f.gold);
    loc[0] += t; loc[1] += at;
  }
  let probe = null;
  try { probe = causalityProbe(files, prior); } catch (e) { card.notes.push(`causality probe failed: ${e.message}`); }
  for (const [reason, count] of aGaps) card.gaps.push({ reason: `arm a: ${reason}`, count });
  card.details.goldItems = goldCounts;
  card.details.repos = [...new Set(files.map((f) => f.repo))].sort();
  const shuffled = shuffledGoldRows(predByArm, goldList);
  const aCovered = perFileRows.a.map((r) => Boolean(r));
  _kept.set(`${language}|${split}`, { files, perFileRows, loc, probe, shuffled, aCovered });

  if (files.length < STAT.MIN_FILES || goldCounts.N < STAT.MIN_GOLD) {
    card.gaps.push({ reason: "below declared floor", detail: `needs >= ${STAT.MIN_FILES} files and >= ${STAT.MIN_GOLD} gold items; have ${files.length} / ${goldCounts.N}`, count: 1 });
  }
  if (!giverOf) card.gaps.push({ reason: "giver of the gold unrecorded", detail: `${giverWhy}: SH, authoredRecall and passShippedOnly are not computed`, count: 1 });
  const rs = makeResamples(files.length);
  const ev = evaluate(files, perFileRows, rs);
  const strong = strongest(ev.arms, "N");
  const floorOk = files.length >= STAT.MIN_FILES && goldCounts.N >= STAT.MIN_GOLD;
  card.score = ev.arms.b.N.f1;
  card.control = strong.v;
  card.margin = card.score - strong.v;
  card.controls = Object.fromEntries(CONTROL_NAMES.map((c) => [c, ev.arms[c].unavailable ? null : ev.arms[c].N.f1]));
  const licence = languageLicence(ev.arms, { foreignAvailable: Boolean(foreign) });
  // THREE-VALUED PASS (A10-5): false as soon as any available control fails or the licence fails; null (typed gap) when something that
  // could still fail was never run (a missing control, an undetermined licence, an unrecorded giver); true only when every bar was run and met
  const gate = (statPass) => languageOutcome({ floorOk, statPass, licenceOk: licence.ok });
  const statOfRecord = !ev.passAvailable ? false : ev.missingControls.length ? null : true;
  card.pass = gate(statOfRecord);
  const passShippedOnly = gate(ev.passShippedOnly);
  if (ev.missingControls.length) card.gaps.push({ reason: `control unavailable: ${ev.missingControls.join(", ")}`, detail: fl.note ?? "a control was not built", count: ev.missingControls.length });
  const armACoverage = { files: aCovered.filter(Boolean).length, of: files.length };
  const armsOut = { ...ev.arms };
  if (ev.arms.a.unavailable) armsOut.a = { typedGap: true, coverage: armACoverage, reason: "no file of this language has a declaration recipe in code-structure.js: a typed gap, not a measured failure (A10-3)" };
  else armsOut.a = { ...ev.arms.a, coverage: armACoverage };
  card.details = {
    ...card.details,
    priorProvenance: { key: prior.provenance.key, repos: prior.provenance.trainRepos, files: prior.provenance.files, reachableShare: prior.provenance.reachableShare, keywords: prior.keywords.length, declaring: prior.declaring, lexical: prior.lexical },
    foreignLanguage: foreign ? foreignLang : null,
    foreignFallback: fl.fallback ?? (fl.foreign ? null : { unavailable: true, wanted: fl.wanted, attempts: fl.attempts }),
    strongestControl: strong.name,
    arms: armsOut,
    armACoverage,
    comparisons: ev.comparisons,
    shippedComparisons: ev.shippedComparisons,
    giver: giverOf
      ? { status: "recorded", source: "gold.py MAPS: node types owning @definition captures of the language's authored defs query (read at run time)", authoredNodes: giverOf.authoredNodes,
        goldNames: { shipped: giverCounts.shipped, authoredOnly: giverCounts.authoredOnly, authoredShare: giverCounts.shipped + giverCounts.authoredOnly ? giverCounts.authoredOnly / (giverCounts.shipped + giverCounts.authoredOnly) : null } }
      : { status: "unrecorded", reason: giverWhy },
    passByScope: {
      withAuthoredKinds: { metrics: [...METRICS], pass: card.pass, note: "the pass of record: all in-scope kinds incl. kinds whose gold the model authored (A10-2)" },
      shippedOnly: { metrics: [...SHIPPED_METRICS], pass: passShippedOnly, note: "the same bars on shipped-giver gold only (authored kinds masked out of both sides); a language that passes only with authored kinds is authored-gold conformance, not reading skill" },
    },
    ablationPass: ev.ablationPass,
    licence,
    localisation: { tpNames: loc[0], atGoldSpan: loc[1], rate: loc[0] ? loc[1] / loc[0] : null },
    shuffledGold: files.length < 2 ? { gap: "fewer than 2 files" } : { rule: "each file's predictions scored against the gold of the next file (cyclic shift by one)", ...shuffledCard(shuffled, perFileRows) },
    macro: macroTable(perFileRows),
    causality: probe ? { cutRule: "first line break at or after half of the characters", arms: probe } : null,
    worstFiles: worstFilesOf(files, perFileRows.b),
    passRule: "PASS_LANG (A10): for each control in {casing_only, keyword_regex, deranged_foreign, deranged_permuted} and metric in {N, KN, FT}: bootstrap lower bound of F1_b - F1_control > 0 AND b wins a strict majority of eligible repos; AND the per-language licence holds (ok === true); false when any available control fails, null (typed gap) when a control was not run",
    bootstrap: { B: STAT.B, seed: STAT.SEED, unit: "file" },
  };
  card.details.perRepoF1_N = Object.fromEntries(ARM_ORDER.filter((a) => ["a", "b", "casing_only", "keyword_regex"].includes(a)).map((a) => [a, perRepo(files, perFileRows, a, "N")]));
  return card;
}

/**
 * The pooled verdict (A10-4) as a pure function of its inputs: nDecl applicable languages, langPass of them pass, nullLangs of them are
 * unmeasured or undetermined (pass null: NON-passes that stay in the denominator). pass is true ONLY when nothing is null, the pooled
 * statistics hold, the licence holds (licenceHolds === true; null = undetermined) and langPass >= ceil(2 nDecl / 3); false when the licence
 * fails, the statistics fail, or need cannot be reached even if every null language passed; null (PARTIAL) otherwise: a gap is never a pass.
 */
export function pooledOutcome({ licenceHolds, statsOk, langPass, nullLangs, nDecl, split = "dev" }) {
  const needPass = Math.ceil((2 * nDecl) / 3);
  const reachable = langPass + nullLangs >= needPass;
  const partial = `PARTIAL (${nDecl - nullLangs} of ${nDecl} measured)`;
  let pass, verdict;
  if (licenceHolds === false) { pass = false; verdict = "VOID: the deranged controls did not lose >= 0.10 (instrument or mechanism suspect)"; }
  else if (!statsOk || !reachable) { pass = false; verdict = "FAIL"; }
  else if (nullLangs) { pass = null; verdict = `${partial}; never a PASS while a language is unmeasured or undetermined (${langPass} of ${nDecl} pass, need ${needPass})`; }
  else if (licenceHolds === null) { pass = null; verdict = `${partial}; the licence is undetermined (a deranged control never ran)`; }
  else { pass = true; verdict = "PASS"; }
  if (nullLangs && pass === false) verdict += `; ${partial}`;
  return { pass, verdict: verdict + evidenceTag(split), needPass, reachable };
}

export async function measureAll({ languages = DERANGE_ORDER, split = "dev", limit = null, deps = {} } = {}) {
  const cards = [];
  for (const language of languages) cards.push(await measure({ language, split, limit, deps }));
  // A10-4: the denominator is the declared languages minus the typed not-applicable ones; an unmeasured / below-floor / control-less
  // language is a NON-PASS that stays in it
  const notApplicable = cards.filter((c) => c.applicable === false);
  const applicable = cards.filter((c) => c.applicable !== false);
  const scored = applicable.filter((c) => c.score !== null);
  const unmeasured = applicable.filter((c) => c.score === null);
  const undetermined = scored.filter((c) => c.pass === null);
  const nDecl = applicable.length;
  const needPass = Math.ceil((2 * nDecl) / 3);
  const evidence = evidenceOf(split);
  const pooledCard = emptyCard("pooled", split, { n: scored.reduce((s, c) => s + c.n, 0), evidence });
  pooledCard.notes.push(evidenceNote(evidence));
  pooledCard.details.evidence = evidence;
  pooledCard.details.languages = languages;
  pooledCard.details.denominator = {
    declared: languages.length, applicable: nDecl, need: needPass,
    notApplicable: notApplicable.map((c) => ({ language: c.language, reason: c.reason ?? c.details?.reason ?? null })),
    unmeasured: unmeasured.map((c) => ({ language: c.language, gaps: c.gaps })),
    undetermined: undetermined.map((c) => ({ language: c.language, gaps: c.gaps })),
  };
  for (const c of unmeasured) pooledCard.gaps.push({ reason: "unmeasured", language: c.language, detail: c.gaps.map((g) => g.detail ?? g.reason).join("; "), count: 1, of: nDecl });
  for (const c of undetermined) pooledCard.gaps.push({ reason: "language pass undetermined", language: c.language, detail: c.gaps.map((g) => g.detail ?? g.reason).join("; "), count: 1, of: nDecl });
  if (nDecl === 0 && notApplicable.length) {
    pooledCard.applicable = false;
    pooledCard.reason = `no declared language declares entities: ${notApplicable.map((c) => `${c.language} (${c.reason})`).join("; ")}`;
    return { cards, pooled: pooledCard };
  }
  if (scored.length < 1) { pooledCard.gaps.push({ reason: "unmeasured", detail: "no language was measurable", count: languages.length }); return { cards, pooled: pooledCard }; }
  const files = [], rowsByArm = Object.fromEntries(ARM_ORDER.map((a) => [a, []]));
  const armACoverage = {};
  for (const c of scored) {
    const kept = _kept.get(`${c.language}|${split}`);
    if (!kept) continue;
    files.push(...kept.files.map((f) => ({ ...f, repo: `${c.language}:${f.repo}` })));
    for (const a of ARM_ORDER) rowsByArm[a].push(...kept.perFileRows[a]);
    const covered = kept.aCovered.filter(Boolean).length;
    armACoverage[c.language] = { files: covered, of: kept.aCovered.length };
    if (covered < kept.aCovered.length) pooledCard.gaps.push({ reason: "arm a: no declaration recipe for the file extension (typed gap, not a measured failure)", language: c.language, count: kept.aCovered.length - covered, of: kept.aCovered.length });
  }
  const rs = makeResamples(files.length);
  const ev = evaluate(files, rowsByArm, rs);
  // the licence: the drop of each deranged control over the files where that control EXISTS (a control that did not run is not a 0)
  const dropOf = (ctl) => {
    const idx = [];
    for (let i = 0; i < rowsByArm.b.length; i += 1) if (rowsByArm.b[i] && rowsByArm[ctl][i]) idx.push(i);
    if (!idx.length) return null;
    return prf(pool(idx.map((i) => rowsByArm.b[i]), "N")).f1 - prf(pool(idx.map((i) => rowsByArm[ctl][i]), "N")).f1;
  };
  const dropForeign = dropOf("deranged_foreign"), dropPermuted = dropOf("deranged_permuted");
  // the controls must move in the languages where they RAN; a missing language or control is the verdict's business (A10-4, A10-5)
  const hasControl = (c, ctl) => c.controls[ctl] !== null && c.controls[ctl] !== undefined;
  const needLic = Math.ceil((2 * scored.length) / 3);
  const foreignLangs = scored.filter((c) => hasControl(c, "deranged_foreign")).length;
  const needForeign = Math.ceil((2 * foreignLangs) / 3);
  const below = (ctl) => scored.filter((c) => hasControl(c, ctl) && c.score > c.controls[ctl]).length;
  const licence = {
    pooledDropForeign: dropForeign, pooledDropPermuted: dropPermuted, threshold: STAT.LICENCE_DROP,
    languagesBelowForeign: below("deranged_foreign"), languagesBelowPermuted: below("deranged_permuted"), need: needLic, needForeign, foreignLanguages: foreignLangs,
    foreignFiles: rowsByArm.deranged_foreign.filter(Boolean).length, files: files.length,
  };
  // THREE-VALUED: false when an evaluated condition fails; null when nothing failed but the foreign control never ran anywhere (undetermined: the
  // controls that did run moved, the one that did not could still fail); true when every condition ran and held
  const permutedHolds = dropPermuted !== null && dropPermuted >= STAT.LICENCE_DROP && licence.languagesBelowPermuted >= needLic;
  const foreignHolds = dropForeign === null ? null : dropForeign >= STAT.LICENCE_DROP && licence.languagesBelowForeign >= needForeign;
  licence.holds = !permutedHolds || foreignHolds === false ? false : foreignHolds === null ? null : true;
  licence.ok = licence.holds; // the name the aggregator (run.mjs licenceStatusOf) reads: null = deferred, never ok
  const strong = strongest(ev.arms, "N");
  const langPass = scored.filter((c) => c.pass === true).length;
  const langPassShipped = scored.filter((c) => c.details.passByScope?.shippedOnly?.pass === true).length;
  const nullLangs = unmeasured.length + undetermined.length;
  // the statistics over the controls that EXIST: a control missing in a language makes that language undetermined (counted in nullLangs: PARTIAL),
  // it is not a failure of the pooled statistics
  const statsOk = ev.passAvailable;
  const { pass, verdict } = pooledOutcome({ licenceHolds: licence.holds, statsOk, langPass, nullLangs, nDecl, split });
  pooledCard.score = ev.arms.b.N.f1;
  pooledCard.control = strong.v;
  pooledCard.margin = pooledCard.score - strong.v;
  pooledCard.controls = Object.fromEntries(CONTROL_NAMES.map((c) => [c, ev.arms[c].unavailable ? null : ev.arms[c].N.f1]));
  pooledCard.pass = pass;
  // the same three-valued verdict for the pass without authored kinds (A10-2): reported beside the pass of record, never part of it
  const shippedPass = (() => {
    if (licence.holds === false || ev.passShippedOnly === false || !(langPassShipped + nullLangs >= needPass)) return false;
    if (ev.passShippedOnly === null || nullLangs || licence.holds === null) return null;
    return true;
  })();
  // arm a pooled over the files that HAVE a recipe, against b over the same files (A10-3; P5 rescored there)
  const covIdx = rowsByArm.a.map((r, i) => (r ? i : -1)).filter((i) => i >= 0);
  const aVsB = covIdx.length
    ? (() => {
      const a = prf(pool(covIdx.map((i) => rowsByArm.a[i]), "N")), b = prf(pool(covIdx.map((i) => rowsByArm.b[i]), "N"));
      return { languages: Object.entries(armACoverage).filter(([, v]) => v.files > 0).map(([l]) => l), files: covIdx.length, of: files.length, a, b, aLessThanB: a.f1 < b.f1 };
    })()
    : { typedGap: true, files: 0, of: files.length, reason: "no scored file has a declaration recipe for arm a" };
  pooledCard.details = {
    ...pooledCard.details, arms: ev.arms, comparisons: ev.comparisons, shippedComparisons: ev.shippedComparisons, ablationPass: ev.ablationPass, licence, strongestControl: strong.name,
    armACoverage, armAvsB: aVsB,
    languagePass: Object.fromEntries(scored.map((c) => [c.language, c.pass])), languagesPassing: langPass, languagesNeeded: needPass,
    languagePassShippedOnly: Object.fromEntries(scored.map((c) => [c.language, c.details.passByScope?.shippedOnly?.pass ?? null])),
    pooledPass: ev.pass, pooledMissingControls: ev.missingControls, pooledPartialControls: ev.partialControls,
    passByScope: {
      withAuthoredKinds: { metrics: [...METRICS], pass, languagesPassing: langPass, note: "the pass of record (all in-scope kinds)" },
      shippedOnly: { metrics: [...SHIPPED_METRICS], pooledStats: ev.passShippedOnly, languagesPassing: langPassShipped, languagesNeeded: needPass, pass: shippedPass, note: "without authored kinds" },
    },
    languageLicence: Object.fromEntries(scored.map((c) => [c.language, c.details.licence?.ok ?? null])),
    shuffledGold: (() => {
      const sh = Object.fromEntries(SHUFFLE_ARMS.map((a) => [a, []]));
      for (const c of scored) { const k = _kept.get(`${c.language}|${split}`); for (const a of SHUFFLE_ARMS) sh[a].push(...(k?.shuffled?.[a] ?? [])); }
      return { rule: "each file's predictions scored against the gold of the next file of its language (cyclic shift by one)", ...shuffledCard(sh, rowsByArm) };
    })(),
    macro: macroTable(rowsByArm),
    localisation: (() => { let t = 0, a = 0; for (const c of scored) { const k = _kept.get(`${c.language}|${split}`); if (k?.loc) { t += k.loc[0]; a += k.loc[1]; } } return { tpNames: t, atGoldSpan: a, rate: t ? a / t : null }; })(),
    causality: { cutRule: "first line break at or after half of the characters", arms: sumProbe(scored.map((c) => _kept.get(`${c.language}|${split}`)?.probe).filter(Boolean)) },
    verdict,
    namedFailures: Object.entries(ev.comparisons).filter(([, v]) => !v.ok).map(([k, v]) => ({ comparison: k, diff: v.diff, lo: v.lo, repoWins: `${v.repoWins}/${v.repoEligible}`, ...(v.unavailable ? { unavailable: true } : {}) })),
  };
  return { cards, pooled: pooledCard };
}

// ═══ leave-one-repository-out CV INSIDE TRAIN: the design-iteration instrument (never touches DEV or TEST) ═══════════
export async function looCv(language, { maxRepos = null } = {}) {
  const man = loadManifest();
  const train = (man?.languages?.[language]?.train ?? []).filter((r) => !r.restricted);
  const repos = [...new Set(train.map((r) => r.repo))].sort();
  const use = maxRepos ? repos.slice(0, maxRepos) : repos;
  const variants = Object.fromEntries(B_FAMILY.map((a) => [a, ARM_OPTS[a]]));
  const rows = Object.fromEntries(Object.keys(variants).map((v) => [v, []]));
  const detail = {};
  for (const repo of use) {
    const prior = await buildTrainPrior(language, { excludeRepo: repo });
    const heldRows = train.filter((r) => r.repo === repo);
    const { files } = await goldRows(language, heldRows);
    const perf = [];
    for (const f of files) {
      const gi = goldItems(f.gold);
      for (const [v, o] of Object.entries(variants)) {
        const r = countFile(itemsOf(readDeclared(f.text, prior, o)), gi);
        rows[v].push(r);
        if (v === "b") perf.push(r);
      }
    }
    const [tp, fp, fn] = pool(perf, "N");
    detail[repo] = { files: files.length, f1: f1of(tp, fp, fn), P: tp / Math.max(1, tp + fp), R: tp / Math.max(1, tp + fn) };
  }
  const N = prf(pool(rows.b, "N")), KN = prf(pool(rows.b, "KN")), FT = prf(pool(rows.b, "FT"));
  const ablations = Object.fromEntries(Object.keys(variants).map((v) => [v, prf(pool(rows[v], "N")).f1]));
  return { language, split: "train-loo", repos: detail, N, KN, FT, ablations };
}

// ═══ CLI ══════════════════════════════════════════════════════════════════════════════════════════════════════════
function writeCard(card, name) {
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(card, null, 1)); } catch { /* the card is also printed */ }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const split = opt("--split", "dev");
  const limit = opt("--limit") ? Number(opt("--limit")) : null;
  const langArg = opt("--language", "python");
  const langs = langArg === "all" ? [...DERANGE_ORDER] : langArg.split(",").map((s) => s.trim()).filter(Boolean);
  if (args.includes("--build-prior")) {
    for (const l of langs) { const p = await getPrior(l); console.log(JSON.stringify({ language: l, key: p.provenance.key, files: p.provenance.files, repos: p.provenance.trainRepos, keywords: p.keywords.length, declaring: p.declaring.length, reachableShare: p.provenance.reachableShare, frames: Object.fromEntries(LEVELS.map((x) => [x, Object.keys(p.frames[x]).length])) })); }
  } else if (args.includes("--emit-prior")) {
    // write the TRAIN priors for vendoring (priors/code-decl-<language>.json is the main agent's to place)
    const dir = opt("--emit-prior");
    if (!dir || dir.startsWith("--")) { console.error("usage: --emit-prior <dir>"); process.exit(2); }
    fs.mkdirSync(dir, { recursive: true });
    for (const l of langs) { const p = await getPrior(l); const f = path.join(dir, `code-decl-${l}.json`); fs.writeFileSync(f, JSON.stringify(p)); console.log(JSON.stringify({ language: l, file: f, key: p.provenance.key, split: p.provenance.split, trainRepos: p.provenance.trainRepos })); }
  } else if (args.includes("--loo")) {
    for (const l of langs) { const r = await looCv(l); console.log(JSON.stringify({ language: l, N: { P: r.N.precision, R: r.N.recall, F1: r.N.f1 }, KN: { F1: r.KN.f1 }, FT: { F1: r.FT.f1 }, ablations: r.ablations, repos: r.repos })); }
  } else if (langs.length === 1) {
    const card = await measure({ language: langs[0], split, limit });
    // a limited run never overwrites the full card; a refused (test) run writes nothing
    if (!card.gaps.some((g) => g.reason === "refused")) writeCard(card, `c3-${langs[0]}-${split}${limit ? `.limit${limit}` : ""}.json`);
    console.log(JSON.stringify(card));
  } else {
    const { cards, pooled } = await measureAll({ languages: langs, split, limit });
    const sfx = limit ? `.limit${limit}` : "";
    for (const c of cards) if (!c.gaps.some((g) => g.reason === "refused")) writeCard(c, `c3-${c.language}-${split}${sfx}.json`);
    if (!cards.every((c) => c.gaps.some((g) => g.reason === "refused"))) writeCard(pooled, `c3-pooled-${split}${sfx}.json`);
    for (const c of cards) console.log(JSON.stringify(c));
    console.log(JSON.stringify(pooled));
  }
}
