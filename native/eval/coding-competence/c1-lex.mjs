// c1-lex.mjs: C1 LEX, rung R1 ("hear tokens") of the coding-competence ladder, for programming languages.
// Lovelace (Coding Capability Circle): the engine has no pretensions to originate anything, it does what it is ordered
// to perform. A lexer is the plainest case: what the reader may call a token is ordered by RECEIVED priors (here a
// CodeLexPrior@1 derived from TRAIN gold) plus one language-blind scanner; this file MEASURES whether that order
// recovers what an independent authority (a tree-sitter grammar, via eval/coding-competence/gold.mjs) calls a leaf token,
// on files of repositories the prior never saw. Nothing here is a model call; nothing is assumed to work.
//
// =====================================================================================================================
// PRE-REGISTRATION (READING-POLICY II.5). Written 2026-10-05 BEFORE adapters/code/lex.js, eval/coding-competence/
// build-lex-prior.mjs, priors/code-lex-*.json and this instrument's code had ever been written or run. [WITHDRAWN 2026-10-06
// (amendment A14): that sentence was NOT TRUE as written. lex.js, build-lex-prior.mjs and the priors existed before this
// instrument's first scoring run (git: adapters/code/lex.js and priors/code-lex-*.json are in commit 0cb1492, 2026-10-05 16:53;
// file mtimes on 2026-10-05: build-lex-prior.mjs 15:52, priors/code-lex-python.json 15:57, lex.js 16:29), and the lexer was revised
// while looking at DEV misses (A3..A7). What this header can honestly be said to have fixed is the CLAIM, the METRICS, the CONTROLS,
// the PASS RULE with its thresholds and the PREDICTION BANDS; no amendment through A11 moved any of those.] The prediction
// and the pass rule below are fixed. Any later change is an AMENDMENT at the foot of this header, dated, with the numbers
// that prompted it. Nothing was tuned after a result without an amendment.
// =====================================================================================================================
//
// CLAIM (C1). A pure, priors-driven lexer (adapters/code/lex.js: one scanner, NO per-language code; every language-specific
// fact lives in a CodeLexPrior@1 whose giver is the tree-sitter grammar of that language, read through gold.mjs on TRAIN
// repositories only) recovers, on held-out repositories,
//   (a) the grammar's leaf-token BOUNDARIES better than splitting on whitespace, and
//   (b) the grammar's coarse token CLASS (keyword | identifier | literal | operator | punctuation | comment | string)
//       better than the best constant guess,
// and the received knowledge is what does the work: deranging the keyword set, or removing the comment/string delimiter
// prior, makes the statistic move. A secondary, separately reported claim (c): splitting an identifier at its own
// casing / underscore / digit seams yields sub-words that the English POS prior (priors/pos-eng.json, giver: UD English
// EWT) attests more often than an un-split identifier or a random cut with the same number of pieces.
//
// GOLD AND UNITS. gold = goldFor({language,text,fileName}).tokens: [{start,end,type,class}], UTF-16 offsets, every
// non-whitespace character covered, strings and comments atomic (one lexeme each), whitespace never a token.
//   G   = all gold tokens of a file (boundary scoring).
//   Gc  = gold tokens whose class is not "other" (class scoring; "other" = ERROR leaves and text the grammar hides:
//         no class authority, so it is a TYPED GAP with a count, never scored as right or wrong).
//   CLASS FOLD (declared): gold class "type" folds into "identifier". Reason: whether `String` is a type or a variable
//         is read off a parse, not off the lexeme; the lexer sees lexemes. The share of type tokens is reported.
//   Scored classes: keyword, identifier, literal, operator, punctuation, comment, string.
//
// METRICS (all micro-pooled over the evaluated files; per-file counts kept for the bootstrap).
//   P = the lexer's tokens (non-overlapping spans {start,end,class}).
//   span match: a predicted token and a gold token match iff start and end are both equal.
//   BOUNDARY F1 (primary score): precision = |P and G| / |P|, recall = |P and G| / |G|, F1 = harmonic mean (span-exact).
//     (diagnostic only: the same on boundary POINTS, i.e. offsets where a token starts or ends.)
//   CLASS ACCURACY (strict, end-to-end): |{g in Gc : a predicted token has g's exact span AND class(pred) = fold(class(g))}|
//     / |Gc|.  (diagnostic: conditional accuracy over span-matched tokens; per-class precision/recall.)
//   MAJORITY CONTROL: the share of Gc held by its most frequent folded class on the SAME held-out files, i.e. the best a
//     constant predictor could do even with PERFECT boundaries (the strongest version of the control; stricter than a
//     TRAIN-derived constant).
//   SUB-WORD COVERAGE (secondary). Unit: DISTINCT identifier strings (types, not tokens: `self` seen 5000 times is one
//     identifier) that are gold tokens of folded class identifier and made of ASCII letters/digits/_/$ only. The splitter
//     (lex.js splitIdentifier) cuts each into pieces at underscore, hyphen, lower>Upper, ACRONYM>Word and letter/digit seams.
//     Only identifiers cut into >= 2 pieces ("multi-piece identifiers": the only ones a splitter can act on) are scored.
//     A piece is SCORED iff it is alphabetic (digit pieces are not words and are dropped from numerator and denominator in
//     every arm); a scored piece is ATTESTED iff it is >= 2 characters long (a single letter counts as unattested) and
//     priors/pos-eng.json forms[lower-cased piece] has total count >= ATTEST_FLOOR (2; the repository's own "floor 2"
//     convention for attestation: one occurrence may be a typo). Coverage = attested pieces / scored pieces. Reported also
//     token-weighted (each identifier counted once per gold occurrence) and over all identifiers. Coverage measures
//     plausibility of a split in English, not its truth: abbreviations (buf, ctx, kmalloc) are unattested; that is a typed
//     limit, not a failure of the splitter.
//
// CONTROLS (II.23/II.4: each built to fail, each scored on the same files by the same metric code):
//   whitespace   split on whitespace runs; class by the same lexicon (a fair class baseline). Boundary control.
//   majority     constant most-frequent class given perfect boundaries. Class control.
//   deranged-kw  the SAME lexer and prior with the keyword/literal word set deranged: every keyword and literal word of the
//                prior swaps class with a distinct identifier-class word of similar TRAIN frequency (so set size and
//                frequency profile are kept, no keyword keeps its class). Three seeds (1,2,3); the control value is the
//                STRONGEST (highest class accuracy) of the three. Licence for the received keyword set.
//   no-delims    the SAME lexer with the comment and string delimiter prior removed. Licence for the received delimiters.
//   foreign      the SAME lexer with ANOTHER language's whole prior (fixed cyclic order python>c>ruby>go>javascript>java>
//                python, nobody keeps its own). REPORTED, NOT GATING: C-family pairs legitimately share delimiters, so
//                a small drop there is not evidence of a broken instrument. A foreign prior that does AS WELL as the real
//                prior on a pair that does not share delimiters is flagged in notes.
//   sub-words:   nosplit (the whole identifier is one piece) and random-cut (same number of pieces, cut points drawn
//                uniformly at random from the identifier with its separators removed; 20 seeded draws per identifier, the
//                expected coverage is used).
//
// PASS RULE (per language and split; thresholds declared, with their reasons):
//   Evaluated only if n_files >= MIN_FILES (10): a smaller sample is pass:null with gap "n<10", never a verdict.
//   (a) BOUNDARY: F1(real) - F1(whitespace) >= F1_MARGIN (0.10: a gain under ten points is not a different instrument for
//       the downstream rungs), AND the lower end of a paired file-bootstrap 95% interval (B=1000, seed 20261005) of that
//       difference > 0, AND the difference > 0 in every held-out repo that has >= 3 evaluated files (three repos per dev
//       split is too few for a clustered interval; this is the honest stand-in: no repo may disagree).
//   (b) CLASS: ACC(real) - majority >= ACC_MARGIN (0.10, same reason), AND bootstrap lower end > 0, AND positive in every
//       repo with >= 3 files.
//   (c) LICENCE (the statistic must MOVE under the perturbation): ACC(real) - ACC(deranged-kw) >= LICENCE_DROP (0.02) with
//       bootstrap lower end > 0; AND F1(real) - F1(no-delims) >= LICENCE_DROP (0.02) with bootstrap lower end > 0.
//       If either licence clause fails the lexer's score is NOT credited: pass=false with note "licence-failed" (a control
//       that does as well as the real arm means the instrument or the mechanism is broken, II.23).
//   pass = (a) and (b) and (c). pass:false names the failed clause. pass:null when unmeasurable (typed gap).
//   SECONDARY (does not gate pass): sub-word claim holds iff coverage(real, multi-piece) - max(coverage nosplit, coverage
//   random-cut) >= SUBWORD_MARGIN (0.10) with a bootstrap lower end > 0; reported as details.subword.pass.
//
// PREDICTIONS (point guess and band, on DEV, written before any run; a band that misses is a reported failure of the
// prediction, not of the data):
//   language    boundary F1 (real)   whitespace F1   class acc (strict)   deranged-kw class acc
//   python      0.96  [0.93,0.99]    0.28 [0.15,0.40]  0.93 [0.88,0.97]   0.78 [0.60,0.90]
//   javascript  0.91  [0.85,0.96]    0.28 [0.15,0.40]  0.87 [0.80,0.93]   0.72 [0.55,0.85]
//   c           0.92  [0.85,0.97]    0.30 [0.15,0.42]  0.87 [0.80,0.93]   0.74 [0.55,0.86]
//   go          0.97  [0.93,0.99]    0.30 [0.15,0.42]  0.93 [0.88,0.97]   0.80 [0.62,0.90]
//   ruby        0.86  [0.75,0.93]    0.30 [0.15,0.42]  0.82 [0.70,0.91]   0.68 [0.50,0.82]
//   java        0.96  [0.93,0.99]    0.30 [0.15,0.42]  0.92 [0.88,0.97]   0.78 [0.60,0.90]
//   Expected failure modes (named in advance so they are not discovered as surprises): C preprocessor payloads (a `#define`
//   body is one hidden token for the grammar), JS regex literals and JSX text, Ruby heredocs / %-literals / symbols with
//   quotes / nested interpolation, Java generic `>>`, any token whose boundary the grammar decides by parse context.
//   Majority control: identifier share, 0.40 to 0.55. Foreign-prior F1 drop >= 0.05 for python>c, c>ruby, ruby>go, java>python
//   (different comment syntax), small (< 0.05) for go>javascript and javascript>java (shared //, /* */ and quotes).
//   Sub-words: coverage(real, multi-piece) 0.55 to 0.80; nosplit 0.05 to 0.25 (a whole camelCase identifier is not an
//   English word); random-cut 0.20 to 0.45. Overall: all six languages pass (a)(b)(c); ruby is the likeliest to fall short.
//   WHAT WOULD FALSIFY THE CLAIM: real F1 within 0.10 of whitespace, or real class accuracy within 0.10 of the majority
//   share, or deranged-kw / no-delims within 0.02 of real (mechanism not doing the work), or any repo disagreeing in sign.
//
// DATA DISCIPLINE (READING-POLICY rule 9). Priors are built from TRAIN files only (build-lex-prior.mjs), split by repository.
// measure() REFUSES to score when a file's repo is among the prior's train repos (typed gap "leak"). Development and
// smoke-testing use split=dev only. split=test is allowed by the CLI so the final card can use it ONCE; every test run is
// appended to /private/tmp/claude-501/coding-competence/test-ledger.jsonl and a second test run of the same rung/language
// is flagged in notes. The author of this file never ran split=test. A model-authored toy fixture lives only in
// tests/coding-c1.test.js, labelled authored, and tests the INSTRUMENT, not natural data.
//
// DISCLOSURE (what DEV is and is not). The lexer and the prior builder were written after this header and iterated while
// looking at DEV smoke output and DEV error samples; the first-run numbers and every later revision are logged below with
// the dev numbers that prompted it. DEV scores are therefore optimistic (an instrument built by looking at DEV, not a blind
// measurement); the thresholds above were not moved. The held-out evidence is the single TEST run.
//
// RESULT SHAPE (module contract): { id, rung, split, n, applicable, score, control, margin, pass, controls, gaps, notes, details }
//   score = boundary F1 (real); control = the control FOR THE BOUNDARY CLAIM, the whitespace-split F1 (the other arms
//   test other claims: deranged-kw is a class-licence arm and does not change boundaries; no-delims and foreign are
//   reported under controls{}); margin = score - control. The class claim, its majority control and the licence arms are
//   in controls{} and details.class / details.licence, and all of them feed pass.
//   [AMENDED 2026-10-06, A12..A15: control is now the STRONGEST CHEAP BASELINE F1 (whitespace stays in controls.whitespaceF1); the shape also carries
//   evidence {tier, creditable, reason} and credited (A14: read `credited`, never `pass` alone, as the competence verdict); pass includes d1 d2 s1 s2;
//   details.baseline, details.specificity, details.classConvention, details.keywordStandard and details.clauses.{d1,d2,s1,s2} are new; details.licence.ok
//   includes language specificity and details.licence.registered keeps the old c1 and c2 verdict.]
//
// USAGE  node eval/coding-competence/c1-lex.mjs --language python [--split dev|test] [--limit N]   (default: every eligible file)
//        prints one JSON line and writes /private/tmp/claude-501/coding-competence/c1-lex-<language>-<split>.json
//
// AMENDMENTS AND RUN LOG (append only; nothing above this line is edited after the first run)
// A1 (2026-10-05, BEFORE any scoring run; made after reading only the TRAIN prior-build summaries, no dev file seen).
//     lex.js DERIVE.STRING_MIN_COUNT 20 -> 5. The Java TRAIN prior got its character-literal opener only as a conditional
//     opener because char literals are rare in Java (< 20 in 150 files) although the delimiter's precision is 1.0; the
//     precision gate (0.95) already guards noise and 5 is the floor the comment (OPENER_MIN_COUNT) and conditional
//     (COND_MIN_COUNT) derivations use. Priors rebuilt after this change. No pre-registered threshold above is touched.
// A2 (2026-10-05, BEFORE any scoring run; TRAIN prior summary only). lex.js comment-opener derivation: (i) a one-character
//     opener that is already unambiguous alone (precision >= 0.999, i.e. `#`) is no longer LCP-extended, and (ii) no
//     opener ever extends over whitespace. Reason: the Ruby TRAIN prior came out as `# ` (hash+space) because 99% of the
//     sampled comments had a space, an over-fit that would miss `#comment` in any held-out repo. `=b` -> `=begin` extension
//     (a 2-char precision path) is kept. Priors rebuilt. A2b (same day, still before any scoring run): the Ruby TRAIN gold has
//     81 `#{` operator tokens (interpolation inside non-atomic string bodies), so `#` was 96.7% comment and missed the 99.9%
//     gate. OPENER1_PRECISION 0.999 -> 0.95 AND a new guard: a one-character opener may not itself be a complete gold
//     token (an attested symbol), which keeps `/` (division), `-` and `{` out. Priors rebuilt.

// R1 FIRST DEV RUN (2026-10-05, priors built from the first 150 TRAIN files per language, repo-interleaved; DEV, all eligible
//     files, no --limit; the instrument and lexer exactly as above, no revision yet). Reported as run:
//   python     n=134 F1=0.9979 ws=0.2577 acc=0.9994 maj=0.4106 (punctuation) dKw=0.8877 noDel=0.7774 foreign[c]=0.8839 subword real/nosplit/random=0.552/0.000/0.134 pass=True
//   javascript n=151 F1=0.9885 ws=0.3065 acc=0.9931 maj=0.4786 (punctuation) dKw=0.9016 noDel=0.8003 foreign[java]=0.8978 subword real/nosplit/random=0.566/0.000/0.141 pass=True
//   c          n=120 F1=0.9829 ws=0.2206 acc=0.9983 maj=0.4445 (punctuation) dKw=0.9252 noDel=0.6434 foreign[ruby]=0.7543 subword real/nosplit/random=0.434/0.000/0.096 pass=True
//   go         n=176 F1=1.0000 ws=0.2888 acc=1.0000 maj=0.4372 (punctuation) dKw=0.8759 noDel=0.6608 foreign[javascript]=0.9453 subword real/nosplit/random=0.628/0.000/0.137 pass=True
//   ruby       n=177 F1=0.9370 ws=0.3223 acc=0.9420 maj=0.3711 (identifier) dKw=0.8336 noDel=0.5906 foreign[go]=0.7314 subword real/nosplit/random=0.679/0.000/0.136 pass=True
//   java       n=180 F1=0.9995 ws=0.3279 acc=0.9966 maj=0.4587 (punctuation) dKw=0.8639 noDel=0.8730 foreign[python]=0.9015 subword real/nosplit/random=0.655/0.000/0.139 pass=True
//     All six clauses (a)(b)(c1)(c2) hold in all six languages; every repo agrees in sign. PREDICTION SCORECARD: the bands were
//     too pessimistic. Boundary F1 above its band in all six (python .998 vs [.93,.99], javascript .9885 vs [.85,.96], c .983 vs
//     [.85,.97], go 1.000 vs [.93,.99], ruby .937 vs [.75,.93], java .9995 vs [.93,.99]); class accuracy above its band in all
//     six; whitespace F1 inside its band in all six; deranged-keyword accuracy inside its band for python, go, java and above it
//     for javascript, c, ruby (the deranged lexicon hurt less than guessed because keywords are a minority of tokens); the
//     majority class is PUNCTUATION (0.37 to 0.48 share), not identifier (ruby alone has identifier as majority, 0.371);
//     foreign-prior drops are >= 0.05 for python>c (0.114), c>ruby (0.229), ruby>go (0.206), java>python (0.098) as predicted,
//     but go>javascript (0.055) and javascript>java (0.091) were NOT small as predicted; sub-word coverage of the real split
//     was inside [.55,.80] for ruby, java, go, javascript (.566) and python (.552) and below it for c (.434), while nosplit
//     (0.000) and random-cut (0.10 to 0.14) were BELOW their predicted bands. The ordering prediction held: ruby had the
//     lowest boundary F1. A SECOND-AUTHORITY WORRY recorded here, not yet answered: lexer and gold share one authority
//     (the grammar), so F1 near 1.0 measures reproduction of that grammar's lexical conventions on unseen repositories, not
//     a truth about code; see details/limits.
//
// R1 REVISIONS AFTER THE FIRST DEV RUN (2026-10-05). The lexer and the prior builder were then revised while looking at DEV
//     boundary misses (an instrument built by looking at DEV; the pre-registered thresholds, metrics and controls were not
//     touched). Each revision, what DEV showed, and nothing else:
//   A3  build-lex-prior.mjs default --max-files 150 -> every eligible TRAIN file (python 240, javascript 240, c 227, go 185,
//       ruby 241, java 204). DEV class errors showed real keywords missing from the lexicon (JS: static, class, instanceof,
//       finally, void; Ruby: yield, alias): 150 files did not show them 3 times in 2 repositories.
//   A4  lex.js: the munch filter for multi-character symbols is now measured under LONGEST MATCH (what the lexer would actually
//       take) and iterated; symbol-only gold tokens the grammar leaves unclassed ("other": `?.`, `...`) join the symbol table.
//       DEV showed JS `==`, `!=`, `**`, `-=`, `?.` split into single characters: `==` had been dropped because the more frequent `===`
//       counted against it.
//   A5  lex.js: conditional lexemes generalised from "after this exact previous token" to "after this previous token text OR class",
//       and a second kind, SIGNED NUMBER (`-1` after `=`, `(`, `,`, return), derived the same way. DEV showed 228 C `-1` misses
//       (tree-sitter-c lexes the sign into the literal when the parse state has no left operand) and Ruby/JS regex literals.
//   A6  c1-lex.mjs: a prior-free arm (the scanner with an EMPTY prior) is reported as controls.priorFreeF1 / priorFreeClassAcc. No pass
//       clause uses it.
//   A8  c1-lex.mjs: an engine-union arm for python and javascript (the same lexer with the existing received keyword prior
//       priors/code-kw-<lang>.json, giver: the language engine, nominated on top of the TRAIN-derived keywords) is reported as
//       controls.engineUnionClassAcc and details.keywordAgreementWithEnginePrior. Reported, non-gating. Result on DEV: python +0.0000
//       (the TRAIN-derived set already equals the engine's 35 words), javascript +0.0000: the engine's hard keywords that TRAIN
//       missed (class, static, continue, instanceof, void...) are fixed, and the contextual words it also lists (get, set, target,
//       meta, using) are used as property names that the grammar calls identifiers, which costs the same number of tokens.
//   A7  lex.js: a symbol that contains a string delimiter or a comment opener is dropped from the symbol table. DEV showed one Ruby file
//       (test/integration/authenticatable_test.rb) put ~800 tokens out of step because the grammar's `:"` token (opens a quoted
//       symbol) was in the table and swallowed the delimiter, flipping every later quote in the file.
// R1 SECOND DEV RUN, after A3..A7 (same DEV files, no --limit). Reported as run:
//   python     n=134 F1=0.9979 ws=0.2577 priorFree=0.7686 noDel=0.7775 foreign[c]=0.8814 | acc=0.9995 maj=0.4106 dKw=0.8857 | CI(a)=[0.728,0.753] CI(b)=[0.581,0.597] | subword real/nosplit/random=0.552/0.000/0.134 pass=True
//   javascript n=151 F1=0.9960 ws=0.3065 priorFree=0.7293 noDel=0.8084 foreign[java]=0.8979 | acc=0.9976 maj=0.4786 dKw=0.9108 | CI(a)=[0.665,0.721] CI(b)=[0.499,0.535] | subword real/nosplit/random=0.566/0.000/0.141 pass=True
//   c          n=120 F1=0.9842 ws=0.2206 priorFree=0.6135 noDel=0.6434 foreign[ruby]=0.8208* | acc=0.9992 maj=0.4445 dKw=0.9308 | CI(a)=[0.712,0.816] CI(b)=[0.519,0.603] | subword real/nosplit/random=0.434/0.000/0.096 pass=True
//   go         n=176 F1=1.0000 ws=0.2888 priorFree=0.6223 noDel=0.6608 foreign[javascript]=0.9644 | acc=1.0000 maj=0.4372 dKw=0.8773 | CI(a)=[0.690,0.737] CI(b)=[0.547,0.575] | subword real/nosplit/random=0.628/0.000/0.137 pass=True
//   ruby       n=177 F1=0.9576 ws=0.3223 priorFree=0.5107 noDel=0.5901 foreign[go]=0.7315 | acc=0.9720 maj=0.3711 dKw=0.8594 | CI(a)=[0.602,0.666] CI(b)=[0.573,0.625] | subword real/nosplit/random=0.679/0.000/0.136 pass=True
//   java       n=180 F1=0.9998 ws=0.3279 priorFree=0.8540 noDel=0.8730 foreign[python]=0.9017 | acc=0.9980 maj=0.4587 dKw=0.8536 | CI(a)=[0.656,0.688] CI(b)=[0.532,0.548] | subword real/nosplit/random=0.655/0.000/0.139 pass=True
//     (* 0.8194 in the run made before the Ruby prior was rebuilt for A7; 0.8208 with the final Ruby prior. Only this cell differs.)
//     F1 first run -> revised: python .9979 -> .9979, javascript .9885 -> .9960, c .9829 -> .9842, go 1.0000 -> 1.0000, ruby .9370 ->
//     .9576, java .9995 -> .9998. All four pass clauses (a)(b)(c1)(c2) still hold for all six languages. What the lexer still gets
//     wrong on DEV, named: C macro bodies (`preproc_arg`, one hidden token to the end of the line: ~0.4% of tokens) and spaced
//     directives (`#  define`, one grammar token containing blanks); JS regex literals (35 in TRAIN: too few to derive a context);
//     Ruby %w()/%i() word lists, heredoc bodies, `?c` character literals; every case where the grammar's boundary depends on
//     parse state (Java generic `>>`).
//
// A9 (2026-10-06, a re-verification pass by a later session; PRE-REGISTERED BEFORE the code below it was written or run. Nothing in
//     the pass rule, the thresholds, the metrics or the existing controls above is touched; lex.js and the priors are not touched.)
//   Re-run of all six DEV languages before any edit: the numbers of the SECOND DEV RUN above reproduced at every logged decimal (the instrument is
//   deterministic), the 18 tests of tests/coding-c1.test.js pass, the train/dev/test repositories are disjoint per language (checked
//   against manifest.json and each prior's trainRepos/trainFiles), lexCode never emits a zero-length, overlapping or out-of-order
//   token and covers every non-whitespace character on 360 DEV files and 1,800 fuzz strings (python 40.8k, javascript 21.2k, c
//   156.1k, go 74.9k, ruby 36.3k, java 48.4k tokens), and no TEST run exists (no test-ledger.jsonl, no *-test.json).
//   Added, all REPORTED and NON-GATING:
//   (a) result.language at the top level (the card aggregator keys on it; before this it was only in details.language).
//   (b) SUB-WORD, a stronger control. nosplit is 0.000 in all six languages BY CONSTRUCTION (a whole identifier such as foo_bar is
//       never a form of an English treebank), so it cannot fail in a way that informs; and random-cut changes the piece LENGTHS as well
//       as the cut positions, so its low coverage partly says "short fragments are not words". New arm `shifted`: every real seam is
//       moved ONE character to the right (to the left when that would pass the end), same piece count, same letters. If attestation does
//       not move when the seams move, "seams matter" is not licensed. PREDICTION: coverage(shifted) in [0.03, 0.25] in all six languages
//       and real - shifted >= 0.20 in all six; real - shifted < 0.10 in any language would falsify "the splitter's seams are what the
//       POS prior attests" for that language. Reported as details.subword.coverage.shifted / tokenWeighted.shifted /
//       marginWithShift / ci95WithShift / passWithShift; the registered secondary pass (against nosplit and random-cut) is unchanged.
//   (c) SUB-WORD, the abbreviation limit made concrete: details.subword.topUnattested lists the 20 most frequent (token-weighted)
//       alphabetic pieces of the real split that the POS prior does not attest. PREDICTION: at least 12 of the 20 are <= 4 characters
//       (abbreviation-like: buf, ctx, idx ...), i.e. the unattested mass is mostly a typed limit of the English prior, not splitter
//       error; fewer than 12 in any language would mean the splitter itself is cutting words badly.
//   c1-loro.mjs (leave-one-repository-out inside TRAIN: the DEV-optimism check) and c1-xauth.mjs javascript (acorn as a second
//   authority) are separate files with their own pre-registrations; their numbers are in their headers.
// A9 RESULT (2026-10-06, DEV, all six languages, full runs after the code was written; the registered statistics were checked equal
//   before and after: every F1, class accuracy, bootstrap interval, control, per-repo row, registered sub-word coverage / margin / pass).
//   (b) coverage of the seam-shifted cut: python 0.0602, javascript 0.0630, c 0.0626, go 0.0501, ruby 0.0512, java 0.0539, i.e. inside
//       the predicted [0.03,0.25] in all six, and real - shifted = 0.492, 0.503, 0.371, 0.578, 0.628, 0.601 (>= 0.20 predicted: held in
//       all six). The shifted cut is a WEAKER control than random-cut in all six (random-cut 0.096 to 0.141), so max(nosplit, random,
//       shifted) is still random-cut and marginWithShift equals the registered margin (python 0.418, javascript 0.425, c 0.338, go 0.492,
//       ruby 0.543, java 0.516; every interval above 0.33): the shifted arm adds a second licence that the seams matter, and changes no verdict.
//   (c) PREDICTION MISSED: at least 12 of the 20 most frequent unattested pieces being <= 4 characters held for python (17), javascript
//       (14) and go (12) and FAILED for c (10), ruby (10) and java (6). What is in those lists is the finding: besides abbreviations (conn,
//       err, msg, ctx, addr, obj, opt, dir, url, ui) and project names (ghostty, lynx, lepus, lottie, devise, uptime), there is a large
//       share of ORDINARY TECHNICAL ENGLISH that the English POS prior simply does not hold: string, config, buffer, array, token, import,
//       attribute, template, handler, listener, layout, offset, controller, generator, directory, animation, builder (priors/pos-eng.json is
//       UD English-EWT: 12,544 sentences, 16,654 forms; `string`, `config`, `buffer`, `array`, `token`, `import`, `attribute` are absent,
//       `component` and `node` occur once). So the sub-word coverage of 0.43 to 0.68 is mostly a measure of the treebank's vocabulary reach,
//       a LOWER BOUND on how many pieces are real words, not evidence that the splitter cuts well or badly, and the c / ruby / java
//       numbers are not "worse splitting". The secondary claim (c) therefore stands only in its registered, narrow form: seam cuts are
//       attested far more than non-seam cuts (>= 0.34 over the strongest control); it says nothing about absolute split quality.
// A10 (2026-10-06, STRUCTURE ONLY, after reading the card aggregator's audit of this rung; no statistic, threshold, control or
//     pass clause changed, and the six DEV runs were repeated to confirm every number is identical):
//   The aggregator (run.mjs) compares every number in controls{} with the boundary-F1 score and printed `arms_at_or_above_score:
//   classAccReal=...,engineUnionClassAcc=...` on four of six languages, because two entries of controls{} are not controls: classAccReal
//   is the REAL arm's own class accuracy and engineUnionClassAcc is a non-gating variant of the real arm. Both are removed from controls{}
//   (they stay in details.class.strictAcc and details.keywordAgreementWithEnginePrior.unionClassAcc). It also printed
//   `no_licence_ok_reported`: details.licence now carries `ok` = clauses (c1) and (c2) = the registered licence verdict, which is what the
//   aggregator reads. c1-loro.mjs reads the DEV class accuracy from details.class.strictAcc.
// A11 (2026-10-06; PRE-REGISTERED BEFORE its code was written; REPORTED, NON-GATING: the registered pass rule is frozen).
//   CAUSALITY (READING-POLICY rule 1: a reader sees only the prefix) is claimed in the header of adapters/code/lex.js and no instrument
//   measured it. New check details.causal, real arm only: per file up to CAUSAL_CUTS (3) cut points are drawn at token boundaries of the
//   full lexing (seeded by the file's length); the PREFIX text[0..cut) is lexed alone and its lexemes must equal the full-text lexemes
//   that end at or before the cut (span and class), the last one touching the cut included (a boundary-cut has no unfinished lexeme).
//   Counts: cuts, mismatching cuts, files with a mismatch. PREDICTION: 0 mismatching cuts in all six languages. DISCLOSED: a scratch
//   probe of the same idea (40 DEV files per language, 6 cuts each, 1,440 cuts, not logged anywhere) had found 0 mismatches before this
//   amendment was written, so this is a prediction the author already had evidence for. CONTROL BUILT TO FAIL (tests/coding-c1.test.js):
//   the same check on a deliberately non-causal lexer (a word is called a keyword when the WHOLE text holds it 3 or more times) must
//   report mismatches. A non-zero count on real files is a defect of lex.js (rule 1), put in notes as `causal-violation` and shown on the
//   card; it does not change `pass`, which stays the registered four clauses.
// A11 RESULT (2026-10-06, DEV, all six languages, full runs; the registered statistics were checked equal before and after):
//   mismatching prefix cuts / cuts: python 0/402, javascript 0/453, c 0/357, go 0/528, ruby 0/531, java 0/540 = 0 of 2,811. The
//   prediction held (it was not a blind one, see above). So lexCode is causal at lexeme granularity on these files: lexing only what
//   has been read reproduces every lexeme already emitted. What this does not cover: cuts INSIDE a lexeme (an unterminated string at the
//   cut is, correctly, not the same lexeme as the finished one), and the (declared) one-character munch look-ahead that every lexer
//   has at the cut itself, which a boundary-cut never exposes.
//
// =====================================================================================================================
// A12 to A15 (2026-10-06). PRE-REGISTERED BEFORE THE CODE BELOW THEM WAS WRITTEN OR RUN. They answer an independent review of this
// instrument (four major findings: the licence clauses cannot tell a right language prior from a wrong one; DEV is not held out for
// the lexer and the priors; the class gold is one hand-authored mapping and the lexicon is fitted to it; gates (a) and (b) are beaten by
// any trivial tokenizer). RULE FOR ALL FOUR: they ADD gating clauses and reports; none lowers a threshold, none removes a registered
// clause; the six DEV priors, the lexer (adapters/code/lex.js sha256 5cd2ada81002...) and clauses (a)(b)(c1)(c2) are untouched; no
// pass:true that the review disproved is kept, and a language that fails a new clause is reported pass:false, not re-margined.
// WHAT I KNEW BEFORE WRITING THESE PREDICTIONS (disclosed, because it makes them not blind): the reviewer's scratch numbers, DEV, limit
// 60, never logged by this file. (i) wrong-language prior mutations: python<-c F1 0.854 acc 0.916; python<-go 0.857 / 0.929; ruby<-python
// 0.834 / 0.809; javascript<-c 0.962 / 0.934; go<-c 0.938 / 0.934; java<-c 0.9975 / 0.917, all six passing all four clauses. (ii) no-prior
// regex tokenizers (word / number / single symbol, class by first character): python F1 0.742 acc 0.778; c 0.607 / 0.803; ruby 0.505 / 0.637;
// with hand-typed quote and comment patterns: python 0.913, c 0.770, ruby 0.835. I had NO number for the baselines or priors defined below
// beyond those, and I have not run anything of A12..A15 on any DEV file when writing this block (the controls were smoke-run on six
// authored one-line snippets to see that they lex).
//
// A12  LANGUAGE SPECIFICITY (finding 1). New gating clauses, both licence clauses (does the received knowledge being RIGHT matter?):
//   Arms: for every vendored CodeLexPrior of a language other than the claimed prior's own (`prior.language`; priors/code-lex-*.json today:
//   python, javascript, c, go, ruby, java, so FIVE others), the same lexer with that prior: arm other:<lang>. The control is the STRONGEST
//   other prior, chosen separately on pooled boundary F1 and on pooled class accuracy (not one cyclic partner; the old `foreign` arm stays,
//   reported, non-gating).
//   (s1) F1(real) - F1(strongest other) >= SPEC_MARGIN (0.02) AND the paired file-bootstrap lower end (same B, seed) > 0.
//   (s2) ACC(real) - ACC(strongest other) >= SPEC_MARGIN AND lower end > 0.
//   SPEC_MARGIN 0.02 = LICENCE_DROP, with the reason (c) already gives: two points is the smallest difference this file calls a real effect.
//   details.licence.ok is now c1 and c2 and s1 and s2 (the registered c1 and c2 alone are kept as details.licence.registered); pass requires s1 and s2.
//   MUTATION TEST (tests/coding-c1.test.js): the `_prior` hook given another language's prior must return pass:false for each of the six
//   reviewer mutations; the claimed prior's language is excluded from the others, so the true prior of the measured language is among them and must win.
//   EXPECTED FAILURES NAMED IN ADVANCE: java s1 (the C prior shares //, /* */, " and '; reviewer: C-prior-on-java F1 0.9975 vs the real 0.9998:
//   expect margin ~0.00, FAIL, so java pass:false); c s1 (go or java prior may sit within 0.02: 50/50); javascript s1 narrowly (c prior 0.962 vs
//   real 0.996: +0.034, expect PASS but weak). Expected PASS: python (+0.14), go (+0.06), ruby (+0.12) on F1; s2 on all six (the reviewer's best wrong
//   class accuracy is 0.934, margins 0.06 to 0.08). If java fails s1 it stays failed.
//
// A13  STRONGEST CHEAP BASELINE (finding 4). New gating clauses (d1) and (d2). Arms (eval/coding-competence/c1-baselines.mjs, sha256
//   b21cc5491eed..., tables AUTHORED by me from the language references named there; a cheap baseline is what a person with a language reference and no
//   corpus can type: delimiters, an operator table, the generic punctuation set, plus the scanner's own word / pp-number shapes; NO keyword list):
//   shape (the existing prior-free arm `generic`), genericDelims (one language-blind table), typedDelims (the language's own delimiters), typedDelimsOps (+ a language-blind multi-
//   character operator table). The control is the STRONGEST arm, chosen separately for boundary F1 and for class accuracy on the pooled score.
//   (d1) F1(real) - F1(strongest baseline) >= F1_MARGIN (0.10) AND bootstrap lower end > 0 AND positive in every repo with >= 3 files.
//   (d2) ACC(real) - ACC(strongest baseline) >= ACC_MARGIN (0.10) AND bootstrap lower end > 0 AND positive in every repo with >= 3 files.
//   The margins are the SAME declared 0.10 as (a) and (b), for the same reason (a gain under ten points is not a different instrument for
//   the downstream rungs); they are not lowered. (a) and (b) stay as registered. res.control, the control FOR THE BOUNDARY CLAIM, is now the strongest
//   cheap baseline F1 (whitespace stays in controls.whitespaceF1), and res.margin follows it.
//   THE CEILING, DISCLOSED IN ADVANCE: an absolute margin cannot be reached when the baseline is strong (headroom = 1 - F1(baseline) < 0.10
//   makes (d1) unpassable by construction). I know from the reviewer's python number (0.913) that this will bite. It is reported as a FAILURE, not waived:
//   pass:false, failed d1, and details.baseline.boundary.ceilingBound = true, with headroom and the relative error reduction
//   (F1real - F1base) / (1 - F1base) reported non-gating beside it. I do NOT switch to an error-reduction rule: choosing a different form
//   because I know the outcome of this one is tuning after a result. A relative-error rule would be a NEW pre-registration with its own TEST.
//   (d2) is expected NOT to bite (the baseline has no keyword list, and keyword class is exactly what the received prior adds); a failed d2 would be news.
//   PREDICTIONS (point [band], DEV, cheap-baseline strongest arm F1 / class acc; margin = real DEV F1 of the second run minus baseline F1):
//     python      F1 0.95 [0.90,0.98]  acc 0.80 [0.70,0.90]  margin 0.05 [0.02,0.09]  d1 FAIL (ceiling)
//     javascript  F1 0.90 [0.82,0.95]  acc 0.78 [0.68,0.88]  margin 0.09 [0.04,0.15]  d1 borderline, lean FAIL
//     c           F1 0.80 [0.72,0.90]  acc 0.76 [0.66,0.86]  margin 0.18 [0.08,0.26]  d1 PASS (preprocessor payloads, `#include <..>` are one grammar token)
//     go          F1 0.96 [0.90,0.98]  acc 0.79 [0.68,0.88]  margin 0.04 [0.02,0.10]  d1 FAIL (ceiling)
//     ruby        F1 0.86 [0.78,0.92]  acc 0.72 [0.60,0.85]  margin 0.10 [0.04,0.18]  d1 borderline
//     java        F1 0.96 [0.92,0.985] acc 0.78 [0.68,0.88]  margin 0.04 [0.01,0.07]  d1 FAIL (ceiling)
//   Overall expected: d2 passes in all six; d1 passes at most in c (and perhaps javascript / ruby); therefore pass:false in most languages. That is
//   a prediction that the registered R1 claim, as a margin over a strong cheap baseline, is mostly not provable on programming languages whose lexical
//   structure is easy; it is not a prediction that the lexer is bad (its absolute F1 stays 0.96 to 1.00).
//
// A14  EVIDENCE TIER AND PROVENANCE (finding 2). (i) The correction at the top of this header. (ii) Every DEV figure produced by this file is DEV-TUNED:
//   the lexer, the prior builder and the priors were revised while looking at DEV (A3..A7), so a DEV pass:true is NOT competence. Results now carry
//   `evidence: {tier, creditable, reason}` (tier "dev-tuned" for split=dev, "held-out-test" for split=test) and a top-level `credited`, which is true
//   ONLY for split=test, the FIRST test run of this rung and language, and pass === true. A card must read `credited`, never `pass`, as the competence
//   verdict (run.mjs does not yet: a proposal is in the report of this amendment). The clean interim estimate is c1-loro.mjs (leave-one-repository-out
//   inside TRAIN), which also predates A12/A13 and does NOT yet apply their clauses; until it does, the new clauses have no clean (non-DEV) number.
//   (iii) PREDICTION SCORECARD of the first run, which the run log did not tally: of the 24 point-band cells in the PREDICTIONS table (4 columns x 6
//   languages) 15 missed UPWARD (boundary F1 6 of 6, class accuracy 6 of 6, deranged-keyword accuracy 3 of 6: javascript, c, ruby), 9 were inside their
//   band (whitespace F1 6 of 6, deranged-keyword accuracy for python, go, java), 0 below; the majority class was punctuation, not the predicted identifier;
//   foreign-prior drops for go>javascript and javascript>java were not small. A band that is missed upward 15 times in 24 means the author's expectation of
//   how well the lexer would do was too LOW: that is a calibration finding about the author, it is not evidence of competence. (iv) NOT DONE, listed
//   as remaining: a FRESH confirmatory set of repositories outside the manifest (no fetch was made; it would need provenance and licence work). TEST has
//   NOT been run by this session and must not be spent before A12/A13/A15 are applied to c1-loro.mjs.
//
// A15  THE CLASS CONVENTION AND THE LANGUAGE STANDARDS (finding 3). The class gold is gold.py's `leaf_class` (a hand-authored mapping over tree-sitter
//   node types: `keyword` is any anonymous word-shaped token that is not a literal word and whose parent is not in TYPE_PARENTS, `type` comes from
//   TYPE_PARENTS / TYPE_LEAF_RE, the default for symbols is `operator`), and the lexicon is derived from that same mapping, so "class accuracy" means
//   AGREES WITH gold.py's CONVENTION; it is not agreement with a language standard. Reported, non-gating (the registered clauses are not moved):
//   (a) notes carry that sentence and details.classConvention carries it with the mapping's description.
//   (b) details.keywordStandard: the prior's keyword + literal words against the language's STANDARD reserved words (c1-standards.mjs, sha256
//       59bf6d65c32d...; givers: Python Language Reference / CPython keyword, ECMA-262, ISO C11 6.4.1, Go spec, Ruby Ripper, JLS 3.9; cross-checked
//       live against CPython, clang, Ripper, acorn and the Go spec page where possible, Java not: no JVM here, a typed gap), as a typed gap with counts
//       and the missing words listed.
//   (c) class accuracy THREE ways: strict (registered, type folded into identifier), excludingType (denominator without gold `type` tokens), and
//       standardRelabel (gold `type` tokens whose text is a standard reserved word count as `keyword`; the others stay folded). Also the same lexer with the
//       standard reserved words NOMINATED on top of the TRAIN-derived keywords (arm standardUnion, scored the same three ways). details.classConvention
//       reports typeFoldedShare and typeFoldedStandardKeywordShare (the share of ALL gold tokens that are type tokens spelled like a standard reserved word).
//   (d) a second authority that CLASSIFIES, in c1-xauth-class.mjs (own header, own pre-registration).
//   PREDICTIONS (written before the run): the prior misses many standard words: c >= 10 of 44 (the reviewer lists int char long short unsigned signed void float
//   double auto register restrict), java >= 9 of 50, ruby >= 8 of 41, javascript 3 to 10 of 37, go 0 to 2 of 25, python 0 to 2 of 35 (soft keywords are not
//   in the list). typeFoldedStandardKeywordShare: c 0.02 to 0.04, java 0.02 to 0.05, go ~0 (Go's int and string are predeclared identifiers, not keywords), python
//   and javascript ~0. standardRelabel accuracy of the real lexer: c about 0.97, java about 0.95, the rest unchanged to the 3rd decimal. standardUnion under the
//   REGISTERED fold should LOSE about typeFoldedStandardKeywordShare against real for c and java (gold folds `int` into identifier, the standard calls it a keyword:
//   the two conventions are in direct conflict) and GAIN it back under standardRelabel; go, python, javascript within 0.003 of real.
//   WHAT WOULD FALSIFY "class accuracy is mostly gold.py's convention": standardRelabel accuracy within 0.005 of strict for c and java.
//   DISCLOSURE ADDED BEFORE ANY FULL RUN (2026-10-06): the first execution of the new code was a CODE-DEBUG smoke on python DEV, --limit 12 (the existing
//   test's sample), run to find crashes. The test's old assertion (score > control) then failed and I looked at the numbers: the strongest cheap baseline
//   (typedDelimsOps) had boundary F1 1.0000 on those 12 files, equal to the real lexer, and class accuracy 0.918 (real about 0.999), so the (d1) margin was 0.00
//   and (d2) 0.08. CONSEQUENCES, so that nothing is hidden: (1) the (d2) prediction above ("passes in all six", baseline class accuracy 0.80) was WRONG on its
//   arithmetic: keyword words are only 4.9% to 7.4% of tokens (the TRAIN class shares recorded in priors/code-lex-*.json; numbers and quoted strings the scanner already gets right), so a scanner that gets
//   everything but keywords right is at 0.93 to 0.95 on that count (0.918 measured on python, whose cheap baseline also misses some punctuation / operator conventions), and an absolute
//   margin of 0.10 over it is unreachable by ANY lexer, a perfect one included. I did not see that when I wrote the rule. (2) I changed NOTHING in the rule, the margins,
//   the tables or the code of the clauses because of those numbers: d1 and d2 stay as registered above and will be reported as failed where they fail, with the
//   ceiling flag (details.baseline.<claim>.ceilingBound) that says a perfect lexer could not pass either. A rule that no lexer can pass is a DEFECT OF THE RULE, not
//   a finding about the lexer; the replacement I would propose (the real arm must recover at least half of the headroom the baseline leaves, capped at the 0.10
//   used here) is NOT applied: it would be a NEW pre-registration for the owner to adopt, with its own TEST run. (3) The python d1 prediction (baseline 0.95,
//   FAIL) was right in sign and too weak in size.
//
// A12..A15 FIRST FULL DEV RUN (2026-10-06; DEV, every eligible file, no --limit; lexer, priors, tables and rules exactly as pre-registered above; the four
//   DEV figures of the registered clauses are identical to the second DEV run logged earlier, to the logged decimals). DEV-TUNED, not competence (credited:false
//   in all six). Reported as run (F1 | class acc; baseline = the strongest cheap arm, b_typedDelimsOps in all six; other = the strongest other-language prior):
//   lang       n   real F1 cheap F1  d1 margin [95% CI]         real acc cheap acc d2 margin [95% CI]  other F1 (lang)  s1 margin [CI]     other acc (lang)  s2 margin | pass failed
//   python     134 0.9979  0.9999    -0.0020 [-.0038,-.0004] c  0.9995  0.9367   0.0628 [.055,.072] c   0.9861 (ruby)    0.0118 [.009,.014] 0.9536 (javascript) 0.0458 | false d1 d2 s1
//   javascript 151 0.9960  0.9961    -0.0002 [-.0005,0.000]  c  0.9976  0.9228   0.0748 [.069,.084] c   0.9160 (go)      0.0800 [.017,.140] 0.9019 (go)         0.0957 | false d1 d2
//   c          120 0.9842  0.9581    +0.0260 [.016,.047]     c  0.9992  0.9441   0.0551 [.039,.078] c   0.9583 (java)    0.0258 [.016,.046] 0.9678 (go)         0.0314 | false d1 d2
//   go         176 1.0000  1.0000     0.0000 [0,0]           c  1.0000  0.9267   0.0733 [.066,.080] c   0.9644 (javascript) 0.0356 [.031,.040] 0.9427 (javascript) 0.0573 | false d1 d2
//   ruby       177 0.9576  0.8764    +0.0812 [.071,.093]       0.9720  0.7924   0.1796 [.167,.192]     0.8430 (python)  0.1145 [.094,.131] 0.8143 (python)     0.1578 | false d1
//   java       180 0.9998  0.9991    +0.0006 [.0003,.001]    c 0.9980  0.8870   0.1110 [.105,.118]     0.9982 (go)      0.0016 [.0009,.0024] 0.9497 (javascript) 0.0483 | false d1 s1
//   (c = ceilingBound: the baseline leaves less headroom than the registered margin, so a perfect lexer fails that clause too. errorReduction is null where the headroom
//   is under 0.001: the ratio is noise there, a reporting guard added before this log was written.) Registered (a)(b)(c1)(c2): pass in all six, as before.
//   RESULTS IN WORDS. (1) NO language passes. d1 fails in all six, d2 in python, javascript, c, go (all four ceiling-bound), s1 in python and java. (2) The cheap
//   hand-typed delimiter + operator table EQUALS the corpus-derived prior on boundary F1 in python, javascript, go and java (differences -0.002 to +0.0006), is
//   0.026 behind it in c and 0.081 behind it in ruby, the two languages with preprocessor payloads and heredoc / %-literal forms. A scratch diff (not logged
//   as a result) shows where the derived prior loses to the typed table: python raw / prefixed triple-quoted strings (r""", rf"...") and `import`, javascript `**`
//   `**=` `-=` `^=` `%=`: derived priors are only as good as their TRAIN coverage; where the typed table is right it does not need coverage. (3) The reviewer's six mutations
//   are now all pass:false through s1 and s2 (their numbers reproduce to four decimals: python<-c 0.8544, python<-go 0.8571, ruby<-python 0.8342, javascript<-c 0.9622, go<-c
//   0.9381, java<-c 0.9975) while the registered (a)(b)(c1)(c2) still pass for all six of them (pinned in tests/coding-c1.test.js). (4) The honest reading of R1 for programming
//   languages: lexing is nearly solved by a language reference, the received prior's own value shows only where the language has lexical forms that need a corpus (c, ruby), and
//   for java the GO prior (0.9982 on java DEV against java's own 0.9998) is as good as java's own, so the prior is not shown to be java-specific.
//   PREDICTION SCORECARD. A12: java s1 FAIL right (+0.0016); c s1 50/50 -> PASS (+0.0258); javascript s1 narrowly PASS right in sign (the strongest other on the full DEV
//   set is go 0.916, not the reviewer's c prior, so the margin is +0.080 not +0.034); python s1 PASS predicted, WRONG: FAIL (+0.0118), because the strongest other is the RUBY
//   prior (same # comments and quotes; the reviewer's mutation list had no ruby-on-python pair); go PASS right (+0.0356, I had said +0.06); ruby PASS right; s2 PASS in all six, right
//   (0.031 to 0.158). A13: baseline F1 inside its band only for ruby (python 0.9999 vs [0.90,0.98], javascript 0.9961 vs [0.82,0.95], c 0.9581 vs [0.72,0.90], go 1.0000 vs [0.90,0.98],
//   java 0.9991 vs [0.92,0.985]: five of six ABOVE); baseline class accuracy above its band in five of six (ruby inside; java 0.887 vs [0.68,0.88]); d1 margins BELOW their bands in
//   five of six (python, javascript, c, go, java; ruby 0.0812 inside [0.04,0.18]); d1 verdict: python FAIL right, javascript lean FAIL right, c PASS WRONG (FAIL, +0.026), go FAIL right, ruby borderline
//   (FAIL), java FAIL right; d2 "passes in all six" WRONG in four (python, javascript, c, go fail by ceiling; ruby and java pass). The author's expectation of the cheap baselines was too LOW
//   by 0.05 to 0.15 in every language but ruby. A15: standard words missing from the prior: c 23 of 44 (>= 10 right), java 19 of 51 (>= 9 right), ruby 14 of 41 (>= 8 right), javascript 11 of 38
//   (predicted 3 to 10 of 37: a slight miss, and the list has 38), go 0 right, python 0 right; typeFoldedStandardKeywordShare c 0.0215 and java 0.0227 inside their bands, go, python, javascript
//   0 right; standardRelabel accuracy c 0.9776 (about 0.97 right), java 0.9753 (about 0.95: above), the others equal to strict to the 3rd decimal; standardUnion changes strict accuracy by
//   c -0.0220 and java -0.0225 (lose about the type share, right) and by +0.0212 / +0.0229 under standardRelabel (right); python and go 0.0000, javascript +0.0005, ruby -0.0003 (all within 0.003, right).
//   The A15 falsifier (standardRelabel within 0.005 of strict for c and java) did NOT occur (0.0216 and 0.0227 apart): "class accuracy is partly gold.py's convention" stands for c and java.
//   OTHER FACTS FOUND: the prior's keyword set has 13 words the C standard does not list (`#define`, `#include`, ... `defined`, `asm`, `__attribute__`: the grammar's preprocessor tokens and
//   compiler extensions are `keyword` in gold.py), 6 for javascript (as async from let meta of: contextual words), 2 for python (`__future__`, `case`); the prior misses 23 C reserved words
//   (all of int char long short unsigned signed void float double auto register restrict inline and the ten _Underscore keywords), 19 Java ones (_ assert boolean byte char const do double enum
//   float goto int long native short strictfp transient void volatile), 14 Ruby ones (BEGIN END __ENCODING__ __FILE__ __LINE__ and for in not or redo retry undef until), 11 JavaScript ones
//   (break class continue debugger delete do enum instanceof void with yield). The second class authority (c1-xauth-class.mjs, its own header and log) agrees: see there.
//
// =====================================================================================================================
// CODE (written after the header above)
// =====================================================================================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { goldAvailable } from "./gold.mjs";
import { loadManifest, selectRows, loadDocs, OUT_DIR, MAX_BYTES, GOLD_ERR_TOL } from "./c1-common.mjs";
import {
  lexCode, whitespaceSplit, loadCodeLexPrior, derangeKeywords, withoutDelimiters, withoutKnowledge, splitIdentifier, mulberry32, LEX_CLASSES,
} from "../../adapters/code/lex.js";
import { loadCodeKeywordPrior } from "../../adapters/text/code-structure.js";
import { baselinePriors } from "./c1-baselines.mjs";
import { STANDARDS, standardKeywordSet, compareKeywordSets, standardUnionPrior, relabelGoldByStandard, dropTypeFromClassScoring } from "./c1-standards.mjs";

export const ID = "c1-lex";
export const RUNG = {
  id: "R1",
  name: "hear tokens (lexemes)",
  question: "Does a priors-driven lexer recover a tree-sitter grammar's leaf-token boundaries and coarse classes on held-out repositories, better than whitespace and constant controls, with the received words and delimiters doing the work?",
};
// declared constants (reasons in the pre-registration header)
export const CONSTANTS = Object.freeze({
  MIN_FILES: 10, F1_MARGIN: 0.10, ACC_MARGIN: 0.10, LICENCE_DROP: 0.02, SUBWORD_MARGIN: 0.10, ATTEST_FLOOR: 2,
  SPEC_MARGIN: 0.02,       // A12: F1 and class accuracy of the real prior over the STRONGEST other-language prior (= LICENCE_DROP, same reason)
  BOOT_B: 1000, BOOT_SEED: 20261005, REPO_MIN_FILES: 3, KW_SEEDS: [1, 2, 3], RANDOM_DRAWS: 20,
  CAUSAL_CUTS: 3, CAUSAL_MIN_TOKENS: 20,   // A11: cut points per file; a file with fewer lexemes has no interior to cut
});
export const FOREIGN = Object.freeze({ python: "c", c: "ruby", ruby: "go", go: "javascript", javascript: "java", java: "python" });
const ALIASES = { py: "python", js: "javascript", golang: "go", rb: "ruby" };
export const CLASS_ORDER = LEX_CLASSES;
const POS_ENG = new URL("../../priors/pos-eng.json", import.meta.url);
const TEST_LEDGER = path.join(OUT_DIR, "test-ledger.jsonl");

// ---------------------------------------------------------------------------------------------------------------------
// scoring (pure; exported so tests/coding-c1.test.js can check the instrument itself)
// ---------------------------------------------------------------------------------------------------------------------
export const foldClass = (c) => (c === "type" ? "identifier" : c);
// per-file count vector
const V = { tp: 0, nP: 1, nG: 2, correct: 3, nGc: 4, matched: 5, ptp: 6, pnP: 7, pnG: 8, cls: 9 };
const VLEN = V.cls + CLASS_ORDER.length;
export const zeroVec = () => new Array(VLEN).fill(0);

/** scoreFile(goldTokens, predTokens) -> count vector (boundary, class, boundary-point and gold class counts) */
export function scoreFile(goldTokens, predTokens) {
  const v = zeroVec();
  const pred = new Map();
  for (const p of predTokens) pred.set(`${p.start},${p.end}`, p.class);
  v[V.nP] = predTokens.length;
  v[V.nG] = goldTokens.length;
  const gp = new Set(), pp = new Set();
  for (const g of goldTokens) {
    gp.add(g.start); gp.add(g.end);
    const gc = foldClass(g.class);
    const scored = gc !== "other";
    if (scored) {
      v[V.nGc]++;
      const ci = CLASS_ORDER.indexOf(gc);
      if (ci >= 0) v[V.cls + ci]++;
    }
    const pc = pred.get(`${g.start},${g.end}`);
    if (pc !== undefined) {
      v[V.tp]++;
      if (scored) { v[V.matched]++; if (pc === gc) v[V.correct]++; }
    }
  }
  for (const p of predTokens) { pp.add(p.start); pp.add(p.end); }
  let ptp = 0;
  for (const x of pp) if (gp.has(x)) ptp++;
  v[V.ptp] = ptp; v[V.pnP] = pp.size; v[V.pnG] = gp.size;
  return v;
}
export const addVec = (a, b) => { for (let i = 0; i < VLEN; i++) a[i] += b[i]; return a; };
const prf = (tp, nP, nG) => {
  const p = nP ? tp / nP : 0, r = nG ? tp / nG : 0;
  return { precision: p, recall: r, f1: p + r ? (2 * p * r) / (p + r) : 0 };
};
export const f1Of = (v) => prf(v[V.tp], v[V.nP], v[V.nG]).f1;
export const pointF1Of = (v) => prf(v[V.ptp], v[V.pnP], v[V.pnG]).f1;
export const accOf = (v) => (v[V.nGc] ? v[V.correct] / v[V.nGc] : 0);
export const condAccOf = (v) => (v[V.matched] ? v[V.correct] / v[V.matched] : 0);
export function majorityOf(v) {
  let best = -1, cls = null;
  for (let i = 0; i < CLASS_ORDER.length; i++) if (v[V.cls + i] > best) { best = v[V.cls + i]; cls = CLASS_ORDER[i]; }
  return { cls, share: v[V.nGc] ? best / v[V.nGc] : 0 };
}
export const majShareOf = (v) => majorityOf(v).share;

/** percentile bootstrap over files (paired: one resample draws the same files for every arm). perFile = [{arm: vec}] */
export function bootstrap(perFile, stat, B = CONSTANTS.BOOT_B, seed = CONSTANTS.BOOT_SEED, only = null) {
  // `only` (optional): the arms the statistic reads. The resample indices do not depend on it, so the numbers are identical to summing every arm.
  const n = perFile.length;
  const arms = only ?? Object.keys(perFile[0] ?? {});
  const point = stat(sumArms(perFile, arms));
  if (n < 2) return { point, lo: NaN, hi: NaN, mean: point, B: 0 };
  const rnd = mulberry32(seed);
  const vals = [];
  for (let b = 0; b < B; b++) {
    const sums = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
    for (let k = 0; k < n; k++) { const f = perFile[Math.floor(rnd() * n)]; for (const a of arms) addVec(sums[a], f[a]); }
    vals.push(stat(sums));
  }
  vals.sort((x, y) => x - y);
  const q = (p) => vals[Math.min(vals.length - 1, Math.max(0, Math.floor(p * vals.length)))];
  return { point, lo: q(0.025), hi: q(0.975), mean: vals.reduce((a, c) => a + c, 0) / vals.length, B };
}
function sumArms(perFile, arms) {
  const sums = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
  for (const f of perFile) for (const a of arms) addVec(sums[a], f[a]);
  return sums;
}

// ---------------------------------------------------------------------------------------------------------------------
// causality (pure; A11)
// ---------------------------------------------------------------------------------------------------------------------
/**
 * prefixConsistency(text, lex, full, {cuts}) -> {cuts, mismatches}
 * lex: text -> [{start,end,class}]; full = lex(text) (passed in so the caller's own run is reused). For `cuts` token boundaries of
 * `full` (deterministic: seeded by text.length) the prefix text.slice(0, cut) is lexed ALONE and must reproduce exactly the lexemes of
 * `full` that end at or before the cut. A reader that sees only the prefix cannot tell a different story about what it already read.
 */
export function prefixConsistency(text, lex, full, { cuts = CONSTANTS.CAUSAL_CUTS } = {}) {
  if (full.length < CONSTANTS.CAUSAL_MIN_TOKENS) return { cuts: 0, mismatches: 0 };
  const rnd = mulberry32((text.length * 2654435761) >>> 0);
  let done = 0, bad = 0;
  for (let k = 0; k < cuts; k++) {
    const i = 5 + Math.floor(rnd() * (full.length - 10));
    const cut = full[i].end;
    const pre = lex(text.slice(0, cut));
    const want = full.filter((t) => t.end <= cut);
    let ok = pre.length === want.length;
    for (let j = 0; ok && j < want.length; j++) if (pre[j].start !== want[j].start || pre[j].end !== want[j].end || pre[j].class !== want[j].class) ok = false;
    done++;
    if (!ok) bad++;
  }
  return { cuts: done, mismatches: bad };
}

// ---------------------------------------------------------------------------------------------------------------------
// sub-word coverage (pure)
// ---------------------------------------------------------------------------------------------------------------------
const ASCII_ID = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const ALPHA = /^\p{L}+$/u;
function hash32(s, seed) {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** attested(piece): piece is >= 2 chars and the POS prior has it with total count >= floor. posTotals: Map(form -> total) */
export function makeAttested(posTotals, floor = CONSTANTS.ATTEST_FLOOR) {
  return (piece) => piece.length >= 2 && (posTotals.get(piece.toLowerCase()) ?? 0) >= floor;
}
function scorePieces(pieces, attested) {
  let sc = 0, at = 0;
  for (const p of pieces) { if (!ALPHA.test(p)) continue; sc++; if (attested(p)) at++; }
  return [sc, at];
}
function randomCutPieces(id, m, rnd) {
  const core = id.replace(/[_$-]/g, "");
  const L = core.length;
  const k = Math.min(m - 1, L - 1);
  if (k <= 0) return [core];
  const cuts = new Set();
  while (cuts.size < k) cuts.add(1 + Math.floor(rnd() * (L - 1)));
  const pos = [0, ...[...cuts].sort((a, b) => a - b), L];
  const out = [];
  for (let i = 0; i < pos.length - 1; i++) out.push(core.slice(pos[i], pos[i + 1]));
  return out;
}
/** shiftedPieces(pieces) -> the same letters cut with every real seam moved one character right (left if it would pass the end).
 *  (amendment A9: the seam-shift control; same piece count unless two shifted seams coincide) */
export function shiftedPieces(pieces) {
  const core = pieces.join("");
  const L = core.length;
  const cuts = new Set();
  let c = 0;
  for (let i = 0; i < pieces.length - 1; i++) {
    c += pieces[i].length;
    const s = c + 1 < L ? c + 1 : c - 1;
    if (s >= 1 && s <= L - 1) cuts.add(s);
  }
  const pos = [0, ...[...cuts].sort((a, b) => a - b), L];
  const out = [];
  for (let i = 0; i < pos.length - 1; i++) out.push(core.slice(pos[i], pos[i + 1]));
  return out;
}
const W_IDX = 8; // weight column of a subword row
/**
 * subwordEval(counts, attested) -> coverage of the real splitter vs nosplit vs random-cut (registered) and vs the seam-shifted cut
 * (A9, reported) over multi-piece identifiers. counts: Map(identifier -> occurrences). Bootstrap over identifier TYPES.
 */
export function subwordEval(counts, attested, { seed = CONSTANTS.BOOT_SEED, draws = CONSTANTS.RANDOM_DRAWS, B = CONSTANTS.BOOT_B } = {}) {
  const rows = []; // per multi-piece identifier: [realSc, realAt, nosSc, nosAt, rndSc, rndAt, shiftSc, shiftAt, weight]
  let nIds = 0, nAllScored = 0, nAllAtt = 0;
  const unattested = new Map(); // lower-cased alphabetic piece the POS prior does not attest -> token weight (A9 diagnostic)
  for (const [id, w] of counts) {
    if (!ASCII_ID.test(id)) continue;
    nIds++;
    const pieces = splitIdentifier(id);
    const [rs, ra] = scorePieces(pieces, attested);
    nAllScored += rs; nAllAtt += ra;
    if (pieces.length < 2) continue;
    for (const p of pieces) if (ALPHA.test(p) && !attested(p)) unattested.set(p.toLowerCase(), (unattested.get(p.toLowerCase()) ?? 0) + w);
    const [ns, na] = ALPHA.test(id.toLowerCase()) ? scorePieces([id], attested) : [1, attested(id.toLowerCase()) ? 1 : 0];
    const rnd = mulberry32(hash32(id, seed));
    let qs = 0, qa = 0;
    for (let d = 0; d < draws; d++) { const [s, a] = scorePieces(randomCutPieces(id, pieces.length, rnd), attested); qs += s; qa += a; }
    const [ss, sa] = scorePieces(shiftedPieces(pieces), attested);
    rows.push([rs, ra, 1, na, qs / draws, qa / draws, ss, sa, w]);
  }
  const cov = (rs, idx, weighted) => {
    let sc = 0, at = 0;
    for (const r of rs) { const w = weighted ? r[W_IDX] : 1; sc += r[idx] * w; at += r[idx + 1] * w; }
    return sc ? at / sc : 0;
  };
  const arms = { real: 0, nosplit: 2, random: 4, shifted: 6 };
  const point = {};
  for (const [k, idx] of Object.entries(arms)) point[k] = cov(rows, idx, false);
  const strongest = point.nosplit >= point.random ? "nosplit" : "random";
  const margin = point.real - Math.max(point.nosplit, point.random);                      // REGISTERED secondary margin
  const marginWithShift = point.real - Math.max(point.nosplit, point.random, point.shifted); // A9, reported
  let lo = NaN, hi = NaN, loS = NaN, hiS = NaN;
  if (rows.length >= 2) {
    const rnd = mulberry32(seed);
    const vals = [], valsS = [];
    for (let b = 0; b < B; b++) {
      const s = new Array(rows.length);
      for (let i = 0; i < rows.length; i++) s[i] = rows[Math.floor(rnd() * rows.length)];
      const c0 = cov(s, 0, false), c2 = cov(s, 2, false), c4 = cov(s, 4, false), c6 = cov(s, 6, false);
      vals.push(c0 - Math.max(c2, c4));
      valsS.push(c0 - Math.max(c2, c4, c6));
    }
    vals.sort((x, y) => x - y); valsS.sort((x, y) => x - y);
    lo = vals[Math.floor(0.025 * vals.length)]; hi = vals[Math.min(vals.length - 1, Math.floor(0.975 * vals.length))];
    loS = valsS[Math.floor(0.025 * valsS.length)]; hiS = valsS[Math.min(valsS.length - 1, Math.floor(0.975 * valsS.length))];
  }
  const topUnattested = [...unattested].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 20).map(([piece, weight]) => ({ piece, weight }));
  return {
    nIdentifierTypes: nIds, nMultiPiece: rows.length,
    coverage: point, tokenWeighted: Object.fromEntries(Object.entries(arms).map(([k, idx]) => [k, cov(rows, idx, true)])),
    realOverAllIdentifiers: nAllScored ? nAllAtt / nAllScored : 0,
    strongestControl: strongest, margin, ci95: [lo, hi],
    pass: rows.length >= 2 ? margin >= CONSTANTS.SUBWORD_MARGIN && lo > 0 : null,
    marginWithShift, ci95WithShift: [loS, hiS],
    passWithShift: rows.length >= 2 ? marginWithShift >= CONSTANTS.SUBWORD_MARGIN && loS > 0 : null,
    topUnattested, shortUnattestedOfTop20: topUnattested.filter((x) => x.piece.length <= 4).length,
  };
}

let _posTotals = null;
function posTotals() {
  if (_posTotals) return _posTotals;
  try {
    const p = JSON.parse(fs.readFileSync(POS_ENG, "utf8"));
    _posTotals = new Map(Object.entries(p.forms).map(([f, tags]) => [f, Object.values(tags).reduce((a, b) => a + b, 0)]));
  } catch { _posTotals = null; }
  return _posTotals;
}

// ---------------------------------------------------------------------------------------------------------------------
// A12 language specificity and A13 strongest cheap baseline (pure; exported so tests/coding-c1.test.js can exercise the gates)
// ---------------------------------------------------------------------------------------------------------------------
export const BASELINE_ARMS = Object.freeze(["generic", "b_genericDelims", "b_typedDelims", "b_typedDelimsOps"]); // `generic` = shape: the empty-prior scanner
const PRIOR_DIR = new URL("../../priors/", import.meta.url);
/** the languages that have a vendored priors/code-lex-<language>.json (sorted) */
export function listLexPriorLanguages() {
  try { return fs.readdirSync(PRIOR_DIR).map((f) => /^code-lex-([a-z0-9_+-]+)\.json$/.exec(f)?.[1]).filter(Boolean).sort(); } catch { return []; }
}
/** otherLanguagePriors(claimed) -> [{language, prior}]: every vendored prior whose language is not the claimed prior's own. */
export function otherLanguagePriors(claimed) {
  const own = claimed?.language ?? null;
  const out = [];
  for (const l of listLexPriorLanguages()) {
    if (l === own) continue;
    const p = loadCodeLexPrior(l);
    if (p) out.push({ language: l, prior: p });
  }
  return out;
}
function strongestArm(total, names, stat) {
  let best = null, bv = -Infinity;
  for (const a of names) { if (!(a in total)) continue; const v = stat(total[a]); if (v > bv + 1e-12) { bv = v; best = a; } }
  return best == null ? null : { arm: best, value: bv };
}
/**
 * gateClauses(perFile, perRepo) -> { baseline, specificity } (A12, A13). perFile = [{arm: countVector}], perRepo = Map(repo -> {files, arms}).
 * Arms read: real; baselines BASELINE_ARMS present in perFile; other languages' priors (arm names "o_<language>").
 * baseline.boundary / baseline.class = clauses (d1) / (d2): real minus the STRONGEST cheap baseline (chosen on the pooled score, separately for F1
 *   and for class accuracy), margin F1_MARGIN / ACC_MARGIN, bootstrap lower end > 0, positive in every repo with >= REPO_MIN_FILES files.
 * specificity.f1 / specificity.class = clauses (s1) / (s2): real minus the STRONGEST other-language prior, margin SPEC_MARGIN, lower end > 0.
 * A strongest arm is chosen on the pooled score, then the paired bootstrap is run on that fixed arm.
 */
export function gateClauses(perFile, perRepo) {
  const arms = Object.keys(perFile[0] ?? {});
  const total = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
  for (const f of perFile) for (const a of arms) addVec(total[a], f[a]);
  const repoPos = (armName, stat) => [...perRepo].filter(([, pr]) => pr.files >= CONSTANTS.REPO_MIN_FILES).every(([, pr]) => stat(pr.arms.real) - stat(pr.arms[armName]) > 0);
  const out = { baseline: null, specificity: null };

  const baseArms = BASELINE_ARMS.filter((a) => arms.includes(a));
  if (baseArms.length) {
    const bF = strongestArm(total, baseArms, f1Of), bA = strongestArm(total, baseArms, accOf);
    const clause = (best, stat, margin) => {
      const D = bootstrap(perFile, (s) => stat(s.real) - stat(s[best.arm]), CONSTANTS.BOOT_B, CONSTANTS.BOOT_SEED, ["real", best.arm]);
      const real = stat(total.real), head = 1 - best.value;
      const repoSignOk = repoPos(best.arm, stat);
      return { arm: best.arm, real, baseline: best.value, margin: D.point, lo: D.lo, hi: D.hi, required: margin, headroom: head, ceilingBound: head < margin,
        errorReduction: head >= 0.001 ? (real - best.value) / head : null,   // null under 0.001 of headroom: the ratio is noise
        repoSignOk, pass: D.point >= margin && D.lo > 0 && repoSignOk };
    };
    out.baseline = {
      arms: Object.fromEntries(baseArms.map((a) => [a, { f1: f1Of(total[a]), acc: accOf(total[a]) }])),
      boundary: clause(bF, f1Of, CONSTANTS.F1_MARGIN),
      class: clause(bA, accOf, CONSTANTS.ACC_MARGIN),
    };
  }

  const otherArms = arms.filter((a) => a.startsWith("o_"));
  if (otherArms.length) {
    const oF = strongestArm(total, otherArms, f1Of), oA = strongestArm(total, otherArms, accOf);
    const clause = (best, stat) => {
      const D = bootstrap(perFile, (s) => stat(s.real) - stat(s[best.arm]), CONSTANTS.BOOT_B, CONSTANTS.BOOT_SEED, ["real", best.arm]);
      return { arm: best.arm, language: best.arm.slice(2), real: stat(total.real), strongestOther: best.value, margin: D.point, lo: D.lo, hi: D.hi, required: CONSTANTS.SPEC_MARGIN,
        pass: D.point >= CONSTANTS.SPEC_MARGIN && D.lo > 0 };
    };
    out.specificity = {
      others: Object.fromEntries(otherArms.map((a) => [a.slice(2), { f1: f1Of(total[a]), acc: accOf(total[a]) }])),
      f1: clause(oF, f1Of),
      class: clause(oA, accOf),
    };
  }
  return out;
}

/** evidenceOf(split) -> the evidence tier of a run (A14). Only a first, full TEST run can become creditable; the caller refines it. */
export function evidenceOf(split) {
  if (split === "test") return { tier: "held-out-test", creditable: true, reason: "split=test: the held-out run (creditable only if it is the FIRST test run of this rung and language and covers every eligible file)" };
  if (split === "dev") return { tier: "dev-tuned", creditable: false, reason: "split=dev: the lexer, the prior builder and the priors were revised while looking at DEV (A3..A7); DEV figures are an instrument built by looking at DEV, not a competence claim" };
  return { tier: String(split), creditable: false, reason: `split=${split}: not a held-out split` };
}
export const CLASS_MEANING = "class accuracy means AGREES WITH gold.py's leaf_class convention (a hand-authored mapping over tree-sitter node types: keyword = any anonymous word-shaped token that is not a literal word and whose parent is not a type node, type from TYPE_PARENTS / TYPE_LEAF_RE folded into identifier, default operator), and the lexicon was derived from that same mapping; it is not agreement with a language standard (A15)";

// ---------------------------------------------------------------------------------------------------------------------
// the measurement
// ---------------------------------------------------------------------------------------------------------------------
function emptyResult(split, language) {
  const evidence = evidenceOf(split);
  return { id: ID, rung: RUNG.id, language, split, n: 0, applicable: true, score: null, control: null, margin: null, pass: null, credited: false, evidence: { ...evidence, creditable: false }, controls: {}, gaps: [], notes: [], details: { language } };
}
const r4 = (x) => (Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null);
/** round every number in a (shallow) clause object to 4 decimals for the report; strings, booleans and null are kept */
const round = (o) => (o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : null) : v])) : o);

export async function measure({ language, split = "dev", limit = null, _prior = null } = {}) {  // _prior: test hook only (a prior object instead of the vendored file)
  const lang = ALIASES[String(language ?? "").toLowerCase()] ?? String(language ?? "").toLowerCase();
  const res = emptyResult(split, lang);
  const gap = (reason, count = 1) => res.gaps.push({ reason, count });
  try {
    if (!lang) { gap("unmeasured: no language given"); return res; }
    const av = goldAvailable();
    if (!av.available) { gap(`unmeasured: gold extractor unavailable (${av.reason})`); return res; }
    const prior = _prior ?? loadCodeLexPrior(lang);
    if (!prior) { gap(`unmeasured: no CodeLexPrior for ${lang} (build: node eval/coding-competence/build-lex-prior.mjs --language ${lang})`); return res; }
    let manifest;
    try { manifest = loadManifest(); } catch { gap("unmeasured: corpus manifest missing (/private/tmp/claude-501/code-corpus/manifest.json)"); return res; }
    const sel = selectRows(manifest, lang, split, limit);
    if (sel.missing) { gap(`unmeasured: manifest has no ${split} split for ${lang}`); return res; }
    if (sel.excluded.restricted) gap("excluded: restricted (copyleft) rows", sel.excluded.restricted);
    if (sel.excluded.tooBig) gap(`excluded: over ${MAX_BYTES} bytes`, sel.excluded.tooBig);

    const loaded = await loadDocs(lang, sel.rows);
    for (const g of loaded.gaps) gap(g.reason, g.count);
    // leak guard: a file from a repository (or a file hash) the prior was built from is never scored
    const trainRepos = new Set((prior.provenance?.trainRepos ?? []).map((r) => r.repo));
    const trainSha = new Set((prior.provenance?.trainFiles ?? []).map((f) => f.sha256));
    let leak = 0;
    const docs = loaded.docs.filter((d) => { if (trainRepos.has(d.repo) || trainSha.has(d.row.sha256)) { leak++; return false; } return true; });
    if (leak) gap("leak: file from the prior's own train repositories (refused)", leak);
    res.n = docs.length;
    if (docs.length < CONSTANTS.MIN_FILES) {
      gap(`n<${CONSTANTS.MIN_FILES}: ${docs.length} evaluable files, no verdict`, 1);
      res.pass = null;
      if (!docs.length) return res;
    }

    // arms
    const kwSeeds = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, prior: derangeKeywords(prior, s) }));
    const noDel = withoutDelimiters(prior);
    const empty = withoutKnowledge(prior);
    const foreignLang = FOREIGN[lang] ?? null;
    const foreignPrior = foreignLang ? loadCodeLexPrior(foreignLang) : null;
    if (!foreignPrior) gap(`foreign-prior control unmeasured: ${foreignLang ? `no prior for ${foreignLang}` : `no cyclic partner declared for ${lang}`}`);

    // received-engine union (python, javascript only): the same lexer with the engine's hard keywords nominated on top of the
    // TRAIN-derived ones (a prior's second giver). Reported, non-gating: it answers "what would the received keyword prior add?"
    const eng = loadCodeKeywordPrior(lang);
    let unionPrior = null;
    if (eng?.keywords?.length) {
      unionPrior = JSON.parse(JSON.stringify(prior));
      const lit = new Set(prior.words.literal), kw = new Set(prior.words.keyword);
      for (const w of eng.keywords) if (!lit.has(w)) kw.add(w);
      unionPrior.words.keyword = [...kw].sort();
    }

    // A13 cheap baselines (authored controls, c1-baselines.mjs), A12 every other language's prior, A15 the standard's reserved words nominated on top.
    // Each prior is built once; the scanner compiles it once.
    const baseP = baselinePriors(lang);
    if (!baseP.typedDelims) gap(`cheap-baseline typed arms unmeasured: no typed delimiter table for ${lang} (the language-blind arm only)`);
    const others = otherLanguagePriors(prior);
    if (!others.length) gap("unmeasured: language-specificity (A12): no vendored prior of another language, clauses s1 and s2 cannot be evaluated");
    const stdSet = standardKeywordSet(lang);
    const stdUnion = stdSet ? standardUnionPrior(prior, lang) : null;
    if (!stdUnion) gap(`unmeasured: language-standard keyword comparison (A15): no standard list held for ${lang}`);

    const perFile = [];
    const perRepo = new Map();
    const classTable = Object.fromEntries(CLASS_ORDER.map((c) => [c, { gold: 0, pred: 0, tp: 0 }]));
    const missed = new Map(), totalByType = new Map();
    const idCounts = new Map();
    let nGold = 0, nOther = 0, nType = 0, nTypeStd = 0, nParseErrFiles = 0;
    const typeStdWords = new Map();
    const causal = { cuts: 0, mismatches: 0, filesWithCuts: 0, filesWithMismatch: 0 };   // A11
    for (const d of docs) {
      const text = d.text, G = d.tokens;
      const real = lexCode(text, prior);
      { const pc = prefixConsistency(text, (t) => lexCode(t, prior), real); causal.cuts += pc.cuts; causal.mismatches += pc.mismatches; if (pc.cuts) causal.filesWithCuts++; if (pc.mismatches) causal.filesWithMismatch++; }
      const arms = {
        real: scoreFile(G, real),
        whitespace: scoreFile(G, whitespaceSplit(text, prior)),
        noDelims: scoreFile(G, lexCode(text, noDel)),
        generic: scoreFile(G, lexCode(text, empty)),
      };
      for (const k of kwSeeds) arms[`kw${k.seed}`] = scoreFile(G, lexCode(text, k.prior));
      if (foreignPrior) arms.foreign = scoreFile(G, lexCode(text, foreignPrior));
      if (unionPrior) arms.engineUnion = scoreFile(G, lexCode(text, unionPrior));
      for (const [k, bp] of Object.entries(baseP)) arms[`b_${k}`] = scoreFile(G, lexCode(text, bp));
      for (const o of others) arms[`o_${o.language}`] = scoreFile(G, lexCode(text, o.prior));
      if (stdUnion) {   // A15: class accuracy three ways (registered fold, without gold `type` tokens, gold type spelled like a standard reserved word = keyword)
        const ul = lexCode(text, stdUnion);
        const gStd = relabelGoldByStandard(text, G, lang).tokens, gNoType = dropTypeFromClassScoring(G);
        arms.stdUnion = scoreFile(G, ul);
        arms.realStd = scoreFile(gStd, real); arms.realNoType = scoreFile(gNoType, real);
        arms.stdUnionStd = scoreFile(gStd, ul); arms.stdUnionNoType = scoreFile(gNoType, ul);
      }
      perFile.push(arms);
      if (!perRepo.has(d.repo)) perRepo.set(d.repo, { files: 0, arms: Object.fromEntries(Object.keys(arms).map((a) => [a, zeroVec()])) });
      const pr = perRepo.get(d.repo);
      pr.files++;
      for (const a of Object.keys(arms)) addVec(pr.arms[a], arms[a]);
      // diagnostics for the real arm
      const pred = new Map(real.map((p) => [`${p.start},${p.end}`, p.class]));
      for (const p of real) classTable[p.class] && classTable[p.class].pred++;
      for (const g of G) {
        nGold++;
        const gc = foldClass(g.class);
        if (g.class === "other") nOther++;
        if (g.class === "type") {
          nType++;
          if (stdSet) { const tx = text.slice(g.start, g.end); if (stdSet.has(tx)) { nTypeStd++; typeStdWords.set(tx, (typeStdWords.get(tx) ?? 0) + 1); } }
        }
        const key = `${g.class}:${g.type}`;
        totalByType.set(key, (totalByType.get(key) ?? 0) + 1);
        const pc = pred.get(`${g.start},${g.end}`);
        if (pc === undefined) missed.set(key, (missed.get(key) ?? 0) + 1);
        if (classTable[gc]) { classTable[gc].gold++; if (pc === gc) classTable[gc].tp++; }
        if (gc === "identifier" && g.class !== "other") {
          const t = text.slice(g.start, g.end);
          idCounts.set(t, (idCounts.get(t) ?? 0) + 1);
        }
      }
      if (d.gold.parse.error_bytes_frac > 0) nParseErrFiles++;
    }
    if (nOther) gap("gold class 'other' (ERROR leaves / hidden text): boundary-scored, not class-scored", nOther);

    // pooled
    const arms = Object.keys(perFile[0]);
    const total = Object.fromEntries(arms.map((a) => [a, zeroVec()]));
    for (const f of perFile) for (const a of arms) addVec(total[a], f[a]);
    const R = total.real;
    const kwBest = CONSTANTS.KW_SEEDS.map((s) => ({ seed: s, acc: accOf(total[`kw${s}`]) })).sort((a, b) => b.acc - a.acc)[0];
    const kwArm = `kw${kwBest.seed}`;
    const maj = majorityOf(R);

    // bootstrap clauses
    const BB = CONSTANTS.BOOT_B, BS = CONSTANTS.BOOT_SEED;
    const A = bootstrap(perFile, (s) => f1Of(s.real) - f1Of(s.whitespace), BB, BS, ["real", "whitespace"]);
    const Bc = bootstrap(perFile, (s) => accOf(s.real) - majShareOf(s.real), BB, BS, ["real"]);
    const C1 = bootstrap(perFile, (s) => accOf(s.real) - accOf(s[kwArm]), BB, BS, ["real", kwArm]);
    const C2 = bootstrap(perFile, (s) => f1Of(s.real) - f1Of(s.noDelims), BB, BS, ["real", "noDelims"]);
    const FOR = foreignPrior ? bootstrap(perFile, (s) => f1Of(s.real) - f1Of(s.foreign), BB, BS, ["real", "foreign"]) : null;
    const gates = gateClauses(perFile, perRepo);   // A12 (specificity) and A13 (strongest cheap baseline)

    // per repo
    const repoRows = [];
    for (const [repo, pr] of [...perRepo].sort()) {
      const rr = pr.arms;
      repoRows.push({
        repo, files: pr.files,
        f1: r4(f1Of(rr.real)), wsF1: r4(f1Of(rr.whitespace)), acc: r4(accOf(rr.real)), majShare: r4(majShareOf(rr.real)),
        dF1: r4(f1Of(rr.real) - f1Of(rr.whitespace)), dAcc: r4(accOf(rr.real) - majShareOf(rr.real)),
        ...(gates.baseline ? { dF1Cheap: r4(f1Of(rr.real) - f1Of(rr[gates.baseline.boundary.arm])), dAccCheap: r4(accOf(rr.real) - accOf(rr[gates.baseline.class.arm])) } : {}),
        ...(gates.specificity ? { dF1Other: r4(f1Of(rr.real) - f1Of(rr[gates.specificity.f1.arm])), dAccOther: r4(accOf(rr.real) - accOf(rr[gates.specificity.class.arm])) } : {}),
      });
    }
    const repoOk = (key) => repoRows.filter((r) => r.files >= CONSTANTS.REPO_MIN_FILES).every((r) => r[key] > 0);

    const clauseA = { margin: A.point, lo: A.lo, hi: A.hi, repoSignOk: repoOk("dF1"), pass: A.point >= CONSTANTS.F1_MARGIN && A.lo > 0 && repoOk("dF1") };
    const clauseB = { margin: Bc.point, lo: Bc.lo, hi: Bc.hi, repoSignOk: repoOk("dAcc"), pass: Bc.point >= CONSTANTS.ACC_MARGIN && Bc.lo > 0 && repoOk("dAcc") };
    const clauseC1 = { drop: C1.point, lo: C1.lo, hi: C1.hi, pass: C1.point >= CONSTANTS.LICENCE_DROP && C1.lo > 0 };
    const clauseC2 = { drop: C2.point, lo: C2.lo, hi: C2.hi, pass: C2.point >= CONSTANTS.LICENCE_DROP && C2.lo > 0 };
    const licenceRegistered = clauseC1.pass && clauseC2.pass;       // the registered licence (c1, c2): A10's details.licence.ok before A12
    const clauseD1 = gates.baseline?.boundary ?? { pass: null }, clauseD2 = gates.baseline?.class ?? { pass: null };   // A13
    const clauseS1 = gates.specificity?.f1 ?? { pass: null }, clauseS2 = gates.specificity?.class ?? { pass: null };   // A12
    const licence = gates.specificity ? licenceRegistered && clauseS1.pass && clauseS2.pass : null;   // A12: the licence now includes language specificity

    // sub-words
    let subword = { pass: null, gap: "unmeasured: priors/pos-eng.json unreadable" };
    const totals = posTotals();
    if (totals) subword = subwordEval(idCounts, makeAttested(totals));

    // notes
    if (FOR) {
      res.controls.foreignLanguage = foreignLang;
      if (FOR.point < 0.05) res.notes.push(`foreign prior (${foreignLang}) within ${r4(FOR.point)} of the real prior's F1: shared delimiter syntax, or a weak instrument for this pair (non-gating, reported)`);
    }
    if (docs.length < CONSTANTS.MIN_FILES) res.notes.push(`n=${docs.length} < ${CONSTANTS.MIN_FILES}: numbers reported, no verdict`);
    if (causal.mismatches) res.notes.push(`causal-violation: ${causal.mismatches} of ${causal.cuts} prefix cuts lexed differently from the full text (${causal.filesWithMismatch} files): lex.js is not causal here (rule 1); the registered pass is unchanged`);
    if (licence === false || (licence === null && !licenceRegistered)) res.notes.push(`licence-failed: a received-knowledge control did not move the statistic (II.23): the lexer's score is not credited (c1 ${clauseC1.pass}, c2 ${clauseC2.pass}, s1 ${clauseS1.pass}, s2 ${clauseS2.pass})`);
    if (gates.specificity && !(clauseS1.pass && clauseS2.pass)) res.notes.push(`language-specificity failed (A12): the strongest OTHER-language prior is ${clauseS1.language} on F1 (real minus it = ${r4(clauseS1.margin)}, needs >= ${CONSTANTS.SPEC_MARGIN} with a lower end > 0) and ${clauseS2.language} on class accuracy (${r4(clauseS2.margin)}): the received knowledge is not shown to be the RIGHT knowledge for ${lang}`);
    if (gates.baseline) {
      const bb = gates.baseline.boundary, bc = gates.baseline.class;
      res.notes.push(`strongest cheap baseline (A13): boundary F1 ${r4(bb.baseline)} (${bb.arm}), class accuracy ${r4(bc.baseline)} (${bc.arm}); real minus it: F1 ${r4(bb.margin)} (needs >= ${CONSTANTS.F1_MARGIN}), class ${r4(bc.margin)} (needs >= ${CONSTANTS.ACC_MARGIN})`);
      if (bb.ceilingBound) res.notes.push(`ceiling (A13): the strongest cheap baseline already has F1 ${r4(bb.baseline)}, so the headroom ${r4(bb.headroom)} is below the registered margin ${CONSTANTS.F1_MARGIN}: clause d1 cannot pass by construction for this language (a perfect lexer would fail it too); reported as FAILED, not waived (relative error reduction ${r4(bb.errorReduction)}, non-gating)`);
      if (bc.ceilingBound) res.notes.push(`ceiling (A13): a scanner with no keyword knowledge already has class accuracy ${r4(bc.baseline)}, so the headroom ${r4(bc.headroom)} is below the registered margin ${CONSTANTS.ACC_MARGIN}: clause d2 cannot pass by construction for this language (a perfect lexer would fail it too); reported as FAILED, not waived (share of the headroom recovered ${r4(bc.errorReduction)}, non-gating)`);
    }
    res.notes.push(CLASS_MEANING);
    if (split === "dev") res.notes.push(`dev-tuned (A14): ${evidenceOf("dev").reason}. This figure is not competence; the held-out evidence is the single TEST run, plus c1-loro.mjs as the clean interim estimate.`);
    let prevTestRuns = 0;
    if (split === "test") {
      try { prevTestRuns = fs.readFileSync(TEST_LEDGER, "utf8").split("\n").filter((l) => { try { const o = JSON.parse(l); return o.rung === ID && o.language === lang; } catch { return false; } }).length; } catch { prevTestRuns = 0; }
      if (prevTestRuns) res.notes.push(`TEST RE-RUN: ${prevTestRuns} earlier test run(s) of ${ID}/${lang} are in the ledger; the held-out discipline allows ONE`);
      if (limit != null) res.notes.push(`TEST run on a partial sample (--limit ${limit}): not creditable as the final card`);
    }
    // A14: the evidence tier. DEV is never competence; a TEST run is creditable only as the first, full run.
    {
      const ev = evidenceOf(split);
      if (split === "test") ev.creditable = prevTestRuns === 0 && limit == null;
      res.evidence = ev;
    }
    if (!trainRepos.size) res.notes.push("prior carries no train repo list: leak guard could only check file hashes");

    // keyword agreement with the received engine prior (python, javascript): an independent giver for the same words
    let kwAgree = null;
    if (eng?.keywords?.length) {
      const mine = new Set([...prior.words.keyword, ...prior.words.literal]);
      const theirs = new Set(eng.keywords);
      const inter = [...mine].filter((w) => theirs.has(w));
      kwAgree = { giver: eng.provenance?.giver ?? "CodeKeywordPrior@1", engineWords: theirs.size, derivedWords: mine.size, intersect: inter.length,
        jaccard: r4(inter.length / (mine.size + theirs.size - inter.length)), engineNotDerived: [...theirs].filter((w) => !mine.has(w)).sort(), derivedNotEngine: [...mine].filter((w) => !theirs.has(w)).sort(),
        unionClassAcc: r4(accOf(total.engineUnion)), unionF1: r4(f1Of(total.engineUnion)), unionGainOverDerived: r4(accOf(total.engineUnion) - accOf(R)) };
    }

    const kwStd = compareKeywordSets(prior, lang);   // A15 (b): the prior's words against the language standard, a typed gap with counts
    if (kwStd && kwStd.missingCount) gap(`keyword-set vs standard (A15): ${kwStd.missingCount} of ${kwStd.standardWords} reserved words of ${kwStd.giver.split(",")[0]} are in neither the prior's keywords nor its literals (e.g. ${kwStd.standardMissingFromPrior.slice(0, 6).join(" ")}); typed gap, not a verdict`, kwStd.missingCount);
    if (kwStd && kwStd.crossCheck?.status?.startsWith("typed-gap")) gap(`standard keyword list for ${lang} has no executable cross-check on this machine (${kwStd.crossCheck.engine})`);

    const bound = prf(R[V.tp], R[V.nP], R[V.nG]);
    res.score = r4(bound.f1);
    // A13: the control FOR THE BOUNDARY CLAIM is the strongest cheap baseline (whitespace stays in controls.whitespaceF1)
    const ctlF1 = gates.baseline ? gates.baseline.boundary.baseline : f1Of(total.whitespace);
    res.control = r4(ctlF1);
    res.margin = r4(res.score - res.control);   // from the rounded figures, so that margin = score - control holds exactly for the aggregator's audit
    const failed = [];
    if (!clauseA.pass) failed.push("a:boundary-vs-whitespace");
    if (!clauseB.pass) failed.push("b:class-vs-majority");
    if (!clauseC1.pass) failed.push("c1:deranged-keywords-did-not-move-class-accuracy");
    if (!clauseC2.pass) failed.push("c2:no-delimiters-did-not-move-boundary-F1");
    if (gates.baseline && !clauseD1.pass) failed.push("d1:boundary-vs-strongest-cheap-baseline");
    if (gates.baseline && !clauseD2.pass) failed.push("d2:class-vs-strongest-cheap-baseline");
    if (gates.specificity && !clauseS1.pass) failed.push("s1:F1-not-specific-to-the-language-prior");
    if (gates.specificity && !clauseS2.pass) failed.push("s2:class-accuracy-not-specific-to-the-language-prior");
    // a clause that could not be evaluated is a typed gap: it never turns a missing control into a pass
    res.pass = docs.length < CONSTANTS.MIN_FILES ? null : failed.length ? false : (gates.baseline && gates.specificity ? true : null);
    res.controls = {
      ...res.controls,
      whitespaceF1: r4(f1Of(total.whitespace)),
      majorityClassAcc: r4(maj.share),
      derangedKeywordsClassAcc: r4(kwBest.acc),
      derangedKeywordsClassAccBySeed: Object.fromEntries(CONSTANTS.KW_SEEDS.map((s) => [s, r4(accOf(total[`kw${s}`]))])),
      noDelimitersF1: r4(f1Of(total.noDelims)), noDelimitersClassAcc: r4(accOf(total.noDelims)),
      priorFreeF1: r4(f1Of(total.generic)), priorFreeClassAcc: r4(accOf(total.generic)),
      ...(foreignPrior ? { foreignPriorF1: r4(f1Of(total.foreign)), foreignPriorClassAcc: r4(accOf(total.foreign)) } : {}),
      whitespaceClassAcc: r4(accOf(total.whitespace)),
      ...(gates.baseline ? {
        strongestCheapBaselineF1: r4(gates.baseline.boundary.baseline), strongestCheapBaselineF1Arm: gates.baseline.boundary.arm,
        strongestCheapBaselineClassAcc: r4(gates.baseline.class.baseline), strongestCheapBaselineClassAccArm: gates.baseline.class.arm,
        cheapBaselines: Object.fromEntries(Object.entries(gates.baseline.arms).map(([k, v]) => [k, { f1: r4(v.f1), classAcc: r4(v.acc) }])),
      } : {}),
      ...(gates.specificity ? {
        strongestOtherLanguagePriorF1: r4(gates.specificity.f1.strongestOther), strongestOtherLanguagePriorF1Language: gates.specificity.f1.language,
        strongestOtherLanguagePriorClassAcc: r4(gates.specificity.class.strongestOther), strongestOtherLanguagePriorClassAccLanguage: gates.specificity.class.language,
        otherLanguagePriors: Object.fromEntries(Object.entries(gates.specificity.others).map(([k, v]) => [k, { f1: r4(v.f1), classAcc: r4(v.acc) }])),
      } : {}),
    };
    const top = [...missed].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, m]) => ({ goldClassType: k, missed: m, of: totalByType.get(k), recall: r4(1 - m / totalByType.get(k)) }));
    res.details = {
      language: lang, files: docs.length, repos: repoRows.length, goldTokens: nGold, predictedTokens: R[V.nP],
      typeFoldedShare: r4(nType / Math.max(1, nGold)), otherShare: r4(nOther / Math.max(1, nGold)), filesWithAnyParseError: nParseErrFiles,
      sample: { limit, selection: "repo-interleaved, sha256-ordered", eligibleInSplit: sel.total },
      boundary: { precision: r4(bound.precision), recall: r4(bound.recall), f1: r4(bound.f1), pointF1: r4(pointF1Of(R)), whitespaceF1: r4(f1Of(total.whitespace)),
        diff: r4(A.point), ci95: [r4(A.lo), r4(A.hi)] },
      class: { strictAcc: r4(accOf(R)), conditionalAcc: r4(condAccOf(R)), majorityClass: maj.cls, majorityShare: r4(maj.share), diff: r4(Bc.point), ci95: [r4(Bc.lo), r4(Bc.hi)],
        perClass: Object.fromEntries(CLASS_ORDER.map((c) => {
          const t = classTable[c];
          return [c, { gold: t.gold, pred: t.pred, recall: r4(t.gold ? t.tp / t.gold : 0), precision: r4(t.pred ? t.tp / t.pred : 0) }];
        })) },
      licence: { ok: licence, registered: licenceRegistered, keywords: { drop: r4(C1.point), ci95: [r4(C1.lo), r4(C1.hi)], pass: clauseC1.pass, strongestSeed: kwBest.seed },
        delimiters: { drop: r4(C2.point), ci95: [r4(C2.lo), r4(C2.hi)], pass: clauseC2.pass },
        foreign: FOR ? { language: foreignLang, drop: r4(FOR.point), ci95: [r4(FOR.lo), r4(FOR.hi)], gating: false } : null,
        specificity: gates.specificity ? { s1: round(clauseS1), s2: round(clauseS2), gating: true } : null },
      clauses: { a: clauseA, b: clauseB, c1: clauseC1, c2: clauseC2, d1: round(clauseD1), d2: round(clauseD2), s1: round(clauseS1), s2: round(clauseS2), failed },
      baseline: gates.baseline ? { boundary: round(clauseD1), class: round(clauseD2), arms: Object.fromEntries(Object.entries(gates.baseline.arms).map(([k, v]) => [k, { f1: r4(v.f1), classAcc: r4(v.acc) }])),
        note: "A13: controls AUTHORED by the instrument's author (c1-baselines.mjs), no corpus, no keyword list" } : null,
      specificity: gates.specificity ? { f1: round(clauseS1), class: round(clauseS2), others: Object.fromEntries(Object.entries(gates.specificity.others).map(([k, v]) => [k, { f1: r4(v.f1), classAcc: r4(v.acc) }])) } : null,
      classConvention: {
        meaning: CLASS_MEANING,
        strictAcc: r4(accOf(R)),
        ...(stdUnion ? {
          excludingTypeAcc: r4(accOf(total.realNoType)), standardRelabelAcc: r4(accOf(total.realStd)),
          typeTokens: nType, typeFoldedShare: r4(nType / Math.max(1, nGold)), typeFoldedStandardKeywordShare: r4(nTypeStd / Math.max(1, nGold)),
          topTypeStandardKeywords: [...typeStdWords].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 12).map(([word, n]) => ({ word, n })),
          standardUnion: { giver: STANDARDS[lang].giver, strictAcc: r4(accOf(total.stdUnion)), excludingTypeAcc: r4(accOf(total.stdUnionNoType)), standardRelabelAcc: r4(accOf(total.stdUnionStd)),
            f1: r4(f1Of(total.stdUnion)), deltaStrict: r4(accOf(total.stdUnion) - accOf(R)), deltaStandardRelabel: r4(accOf(total.stdUnionStd) - accOf(total.realStd)) },
        } : { gap: `unmeasured: no standard list held for ${lang}` }),
      },
      keywordStandard: kwStd ?? { gap: `unmeasured: no standard list held for ${lang}` },
      subword: { ...subword, coverage: subword.coverage && Object.fromEntries(Object.entries(subword.coverage).map(([k, x]) => [k, r4(x)])),
        tokenWeighted: subword.tokenWeighted && Object.fromEntries(Object.entries(subword.tokenWeighted).map(([k, x]) => [k, r4(x)])),
        margin: r4(subword.margin), ci95: subword.ci95 && subword.ci95.map(r4), realOverAllIdentifiers: r4(subword.realOverAllIdentifiers), attestFloor: CONSTANTS.ATTEST_FLOOR,
        marginWithShift: r4(subword.marginWithShift), ci95WithShift: subword.ci95WithShift && subword.ci95WithShift.map(r4) },
      perRepo: repoRows,
      causal: { ...causal, cutsPerFile: CONSTANTS.CAUSAL_CUTS, gating: false },
      worstMissedGoldTypes: top,
      keywordAgreementWithEnginePrior: kwAgree,
      prior: { file: `priors/code-lex-${lang}.json`, trainRepos: [...trainRepos], trainFiles: prior.provenance?.trainFiles?.length ?? null, keywords: prior.words.keyword.length, literals: prior.words.literal.length,
        comments: (prior.comments ?? []).length, strings: (prior.strings ?? []).length, conditional: (prior.conditional ?? []).length },
      constants: CONSTANTS,
    };
    res.credited = res.evidence.creditable === true && res.pass === true;   // A14: the competence verdict a card must read (never `pass` alone)
    if (split === "test") {
      try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.appendFileSync(TEST_LEDGER, JSON.stringify({ rung: ID, language: lang, n: res.n, score: res.score, pass: res.pass }) + "\n"); } catch { /* the ledger is a courtesy, never a requirement */ }
    }
    return res;
  } catch (e) {
    gap(`unmeasured: ${e?.code ?? "error"}: ${String(e?.message ?? e).split("\n")[0].slice(0, 200)}`);
    res.pass = null;
    return res;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const language = opt("--language");
  const split = opt("--split", "dev");
  const limit = opt("--limit", null) ? Number(opt("--limit")) : null;
  if (!language) { console.error("usage: node eval/coding-competence/c1-lex.mjs --language <lang> [--split dev|test] [--limit N]"); process.exit(2); }
  const r = await measure({ language, split, limit });
  try { fs.mkdirSync(OUT_DIR, { recursive: true }); fs.writeFileSync(path.join(OUT_DIR, `c1-lex-${r.details.language}-${split}.json`), JSON.stringify(r, null, 1) + "\n"); } catch { /* printing is enough */ }
  console.log(JSON.stringify(r));
}
