# ant-code PREREG — source-code identifiers as an unambiguous test of the name rule (written 2026-10-06 BEFORE any impact record was read on code)

Rule under test (user): "a name is that which affects the holographic field like a name" (ablate the token, re-read, the slots it filled change; a name has a SHAPE in the holograph).
Why code: in source code "name" has exact, formatting-independent gold from a real parser: a USER IDENTIFIER is a token the program binds (declares) and refers to.
Zero-model: no LLM, no keyword list, no prior, no capital, no POS anywhere in a reader or a score. Gold (parser output) only selects tokens, matches negatives and evaluates.

## 0. Disclosure (what I had seen before this file was hashed)
BRIEF.md, CRITIQUE.md sections 2-3 (the confound lessons), NAME-RULE-RESULTS.md with its CORRECTION, the headers of impact.mjs / name-shape.mjs / ant-shape collect.mjs+cvlib.mjs.
Plumbing only on code: lexer class counts for stdlib shlex.py and native/organs/kind-standing.js (not in the file list below), and ONE timing run of impactBatch on 8 tokens of
kind-standing.js (null/non-null pattern 1,0,1,1,1,0,0,0 — not an AUC, not a class contrast). No AUC, no class contrast, no joint ablation has been computed on code.
Lessons taken from the adversary and applied here BEFORE running: (a) the reader hears only tokens of >= 3 characters (windowFigures wordFloor 3): every class is restricted to
>= 3 encoded characters (not just matched on it); (b) match on first-in-line position AND index, line length, window mention count, recency, frequency, character length, with
a balance gate that must pass before ANY impact record is read; (c) report declaration sites separately from later uses; (d) company shuffle as a control built to fail;
(e) a scalar of the old rule is reported but the verdict uses the fitted record AND is compared with fitted case-free rivals.

## 1. Data (files fixed by a MECHANICAL result-blind rule; list in data/files.json, produced by select_files.mjs before any reader ran)
Rule: candidates = 20-150 KB (py 20-120 KB), >= 500 lines, mean line length <= 100, not generated/minified/test; hash order sha256("ant-code-select|"+path); JS: 6 from
khora/native (<=1 per directory) + 6 from /Users/mlacy/Documents/jupyter/node_modules (<=1 per package); PY: 12 from the Homebrew python3.14 stdlib (<=2 per subpackage).
A file that fails to parse or has < 500 units is skipped and the next in hash order is taken (skipped: 1 JS khora, 0 JS node_modules, 9 PY). I may NOT replace a file after seeing results.
JS (12): native/eval/coding-competence/build-java-priors.mjs, native/organs/measure.js, native/eval/competence/r2-class.mjs, native/eval/barker/transfer.mjs,
  native/adapters/text/recursive.js, native/adapters/notation/genetic.js, node_modules/{minimatch/minimatch.js, webpack/lib/cache/PackFileCacheStrategy.js,
  es-abstract/operations/2018.js, uri-js/dist/es5/uri.all.js, doctrine/lib/doctrine.js, @xmldom/xmldom/lib/entities.js}.
PY (12): email/message.py logging/config.py re/_compiler.py importlib/_bootstrap.py _py_warnings.py _collections_abc.py pydoc.py annotationlib.py optparse.py
  asyncio/proactor_events.py xml/etree/ElementTree.py email/_header_value_parser.py.
Third language (Ruby via the system ruby's Ripper): exploratory ONLY, built only if JS and PY collection finish with > 40 min of budget left; its result cannot enter a verdict count.
Natural-language side (T4): UD English DEV (/private/tmp/claude-501/ud-eval/eng/dev.conllu, readConlluStream) collected by me with the SAME matching code; IRC nicknames: the
RECORDS of ant-adversary's round C (data/irc/C-*.json, already position/length/count matched by them; read-only, strata INIT and NONINIT kept separate, feature set FULL 144-d, sig+atm+span+c).

## 2. Gold per lexical token (parser output; lex_py.py = ast+tokenize, lex_js.mjs = acorn 8.15 found in jupyter/node_modules)
U user identifier: a name bound in THIS file (def/class/param/assignment target/for/with/except/comprehension/walrus/self.x= / this.x= / method / class field / object-literal key /
  var-let-const / catch), every occurrence of that (lowercased) name. E external: imported names, built-in globals, attribute or free names not bound here. K keyword (language
  keywords, true/false/null/None/this/super, JS contextual of/async/await/static/get/set/from/as/yield/let when not user-bound and not after a dot). L literal (numbers, strings,
  regexes, template parts). P operator/punctuation. A ambiguous = excluded everywhere: a name bound here AND imported/built-in, Python dunders, or one lowercase form seen in two classes.
decl=1 marks the BINDING occurrence (first binding site = DECL; every other occurrence of a U form = USE; independently FIRST = first occurrence of the form in the file stream).
Reader form: lowercase; every character outside [a-z0-9] -> 'z' (underscores, $); numbers 'n'+alnum; any string/regex/template part 's'+7-hex hash of its content (unique per content);
keywords as their lowercase spelling. Comments are dropped. One unit ("sentence") = one logical statement (Python: NEWLINE-terminated logical line; JS: split at ; { } ${ and at
a newline when the bracket depth inside the current brace level is 0).
OPERATORS/PUNCT: the primary reader variant NP drops them (as the natural-language streams drop punctuation; the reader hears only [letter|digit]+ words, so P tokens can never fill a slot
and are not sampleable). Secondary variant RAW keeps P tokens as separate raw-text words in the stream (tests whether code structure carried by punctuation changes the result); all
sampling, matching and ranking is done on the NP view in both variants (the same tokens are ablated; in RAW the P tokens stay in the text).

## 3. Reader, windows, sampling, matching (all numbers typed here, with the reason)
READER: impact.mjs's three prior-free readers (R-A readForward, R-B company beings, R-C relations) via impactBatch, mode "delete", withC true, causal F=0, M=128 units
(the repo's standard window; a code unit is ~6 tokens vs ~25 word units per NL sentence, so the window is shorter in tokens: a sensitivity arm M=384 on the primary LATER sample
is run only if time allows, exploratory). Slot deltas at the SLOT, not the span. seedTag "ant-code:<lang>:<file>".
CANDIDATE occurrence (s,i) of a form w: s >= M (full window), encoded length >= 3 (the reader's figure floor; applied to BOTH classes), class in {U,E,K,L}.
  LATER: w occurs >= 2 times in the causal window [s-M, s] counting itself. FIRST: w has no earlier occurrence anywhere in the file (k=0). (LATER and FIRST are separate datasets.)
POSITIVE = class U. NEGATIVES: pool E ("EXT": same lexical kind, hardest) and pool O = K u L ("NONID": keywords, literals). Matching is done offline on the stream only (no reader output):
  covariates c = [log2 form freq in file, log1p(window mentions), log1p(gap to previous occurrence in units, M+1 if none), log(length), log1p(unit length in non-P tokens), log1p(index in unit)];
  exact on first-in-line (i==0); distance = Euclid over the 6 covariates each standardised by its SD in (positives u pool); greedy in a seeded random order of positives, nearest unused
  negative within a CALIPER; negative form cap 5 and positive form cap 5 per file (so `self`, `i`, a loop variable cannot dominate); per file: up to 40 LATER positives and 20 FIRST
  positives (FIRST on covariates 1,4,5,6 plus first-in-line, since window mentions and gap are fixed by construction).
  CALIPER chosen from {0.60, 0.45, 0.30}: the LARGEST whose pooled (all files, per language) matched sets pass the BALANCE GATE, evaluated before any impact record is read:
  every covariate |standardised mean difference| <= 0.10 AND every single-covariate AUC (positive vs matched negatives) in [0.44, 0.56], for each of PE (U vs E) and PO (U vs K u L).
  If 0.30 fails the dataset is labelled UNDERMATCHED: reported, but it can neither support nor refute a verdict (the adversary's licence C7). 0.10/0.44-0.56 are the conventional
  balance numbers; the caliper ladder is typed and coarse (3 values) so it cannot be tuned to a result.
  Datasets per language: PE = positives vs E-negatives; PO = positives vs O-negatives; PA = positives vs PE u PO negatives pooled (each positive once with weight 1; negatives 2:1) — PA is the primary dataset.
COSTS: sampled tokens are read once; shuffled arm re-reads the SAME sampled occurrences on within-unit shuffled text (T6).
BLOCKS: leave-one-FILE-out (12 files per language). AUC pooled over held-out scores. Bootstrap over files (B=1000), permutation null = labels permuted within file (B=200, folds cached).

## 4. Features and learner
Learner: ridge-logistic of name-war-and-peace.mjs (fitLogit lambda 1.0, standardise, PCA to D_IMP=24 when a block has > 24 dims), via ant-shape/cvlib.mjs (sha256 of that file is recorded in
results at run time). Arms: FULL (sig85+atm19+span32+c8 = 144-d), SLOT (sig85), SHAPE24 (4 slot families x 6 delta types, normalised counts), MAGNITUDE (log1p of changed slots, extent tokens/frames/radius,
isNull), RIVALS (16 case-free causal rivals of ant-shape/collect.mjs rivalsOf: window/prefix mentions, gap, burst, last16, neighbour window frequencies, neighbour diversity, line flags, line length,
word length), SCALARS (S_ENTRY analogue = number of ref-entry slots changed, local window count, burst, recency, line length, index: each a single-feature AUC, direction fixed higher=name-like),
POSITION (stream position), COMPANY (T5, below), and the combinations FULL+RIVALS, FULL+COMPANY.
COMPANY arm (T5, language-general): from the NP view of the causal window [s-M, s]: rank every form by window frequency (mid-rank for ties), bin = min(11, floor(log2 rank)); features = one-hot
(12 bins + line-edge flag = 13) of the bin of the left-1, right-1, left-2, right-2 neighbours of the sampled occurrence (52) and the MEAN of the same one-hots over the form's earlier occurrences
in the window (52) = 104-d. It knows no identity, no gold, no priors.
Transfers (T3/T4): fit on all rows of the source, score all rows of the target, features standardised on the source; a second variant z-scores each corpus separately (label-free). AUC with a
bootstrap over target files/blocks and a label-permutation null within block (B=1000).

## 5. Tests, each with its falsifier (SESOI 0.03 AUC)
T1 JOINT ablation (name-shape.mjs logic copied): per file W=4 windows of M=128 units (ends spread evenly over [M, N)); delete ALL visible (>=3 char) tokens of a class at once:
  classes U, E, K, L; RAND = 20 draws per window of a set of the SAME SIZE as U, drawn from non-U non-P non-A visible tokens matched token-for-token on (log2 freq bin, first-in-line, length bucket
  {3,4,5-6,7-9,10+}). Objects: shadow (24 = 4 families x 6 types counts / sum), imprint (slot families filled by the class in X0, 4 + no-slot, normalised), collateral shadow, amplification
  (collateral / direct records), magnitude. Pooled per language over all windows (RAND draw d pooled over windows -> 20 pooled null shapes). SPECIFIC if cos(shape_U, mean RAND) is below
  the 5th percentile of the 20 leave-one-out cos(RAND_d, mean of the others); amplification SPECIFIC if amp_U > the 95th percentile of the 20 RAND amplifications.
  Also cos(U shape JS, U shape PY) vs cos(U shape JS, RAND shape PY), and the same for E, K, L (is the shape code-language-general?).
  Controls built to fail: sham (delete nothing) leaves every record unchanged; K3 informativeness (if all RAND-RAND cosines > 0.99 the language is `uninformative`); determinism (re-run one window).
  Falsifier of "identifiers have a shadow shape": cos_U inside the RAND range AND amp_U inside the RAND range in both languages.
T2 SINGLE-TOKEN record shape: leave-one-file-out CV per language, arms above, datasets PA (primary), PE, PO, LATER; AUC, file-bootstrap CI, within-file permutation q95; the best rival = max(AUC of
  RIVALS, MAGNITUDE, POSITION, best single SCALAR). Falsifier: FULL AUC (PA) < 0.65 OR lower bound <= permutation q95 OR FULL - best rival < 0.03 in one of the two languages.
T3 cross-language transfer JS -> PY and PY -> JS (PA datasets, arms FULL, SHAPE24, COMPANY, MAGNITUDE; raw and z-scored). Falsifier: AUC < 0.60 in either direction.
T4 cross-modal: (a) code (JS, PY, and JS+PY) -> UD English DEV PROPN vs position-matched NOUN/VERB/ADJ (matching code identical to section 3: first-in-line exact, index, unit length, window
  mentions, gap, length, freq; PROPN LATER mentions, 150 per language-block cap, blocks = 8 consecutive stretches of the stream), (b) UD-English -> JS and -> PY, (c) code -> IRC nicknames
  (round C INIT and NONINIT separately; carries ant-adversary's licence C7 residual of 0.60-0.62 local-count AUC; state it), (d) IRC/UD-eng within-modality CV on the same arms as the
  reference ceiling. Falsifier of cross-modal application: code -> NL AUC < 0.60 on position-matched negatives.
T5 company-profile arm as the language-general candidate (COMPANY, section 4) in T2/T3/T4. Falsifier of "the shape is company": COMPANY AUC < FULL AUC - 0.05 in both languages AND T6 shows
  no collapse.
T6 company shuffle: the SAME sampled occurrences re-read after shuffling tokens within each unit (index mapped through the permutation; seeded); FULL AUC recomputed with the same CV.
  A company-based signal must collapse: falsifier of "the signal is company": FULL AUC_shuffled > FULL AUC - 0.05 (drop < 0.05) in both languages. A negative control built to fail:
  the shuffled-text COMPANY arm must also drop.
T7 declaration vs use: dataset FIRST (U first occurrences vs E/L first occurrences matched) in the causal reader (F=0): AUC FULL, non-null share per class; exploratory F=16 lookahead on the
  same occurrences (non-causal, labelled). Also within LATER: DECL sites (binding occurrences that happen to be LATER) vs USE sites of U (counts only if >= 40 DECL rows). Prediction
  below: causal FIRST is deaf (single mention invisible to a reader that needs >= 2 mentions in the window), i.e. AUC in [0.45, 0.55] and non-null share <= 0.10.
Reporting: SMD table of the matched sets; sham 100% null; determinism 3/3; variants NP (primary) and RAW; tables per language and pooled.

## 6. Verdict rules (pre-registered thresholds; the brief's, plus the balance and control licences)
IDENTIFIER SHAPE EXISTS in a language iff, on PA with balance gate passed: FULL CV AUC >= 0.65, file-bootstrap lower bound > permutation q95, FULL - best rival >= 0.03, sham 100% null,
and the shuffle drop >= 0.05 (otherwise it is a signal but "not company"). IDENTIFIER SHAPE EXISTS overall iff it holds in >= 2 of {JS, PY} (Ruby, if built, does not count).
TRANSFERS ACROSS CODE LANGUAGES iff T3 AUC >= 0.60 in both directions (lower bound > permutation q95).
CROSS-MODAL iff code -> natural-language names (UD English PROPN, position matched) >= 0.60 with lower bound > permutation q95; the verdict for the natural-language names is stated separately
for UD and for IRC. If a balance gate fails the dataset is UNDERMATCHED and no verdict (support or refutation) is drawn from it. Failed predictions are reported as failures; no retuning after
reading a result (a second round would be a new dated amendment on fresh files).

## 7. Honest prior predictions (blind; orders are the claims)
P1 PA FULL AUC >= 0.65 in JS and in PY: P(each) 0.60; my point guesses JS 0.68, PY 0.66. The reason: user identifiers keep recurring with declaration keywords and assignment frames around them
   (code company is rigid), which a company reader hears; but matching on mention count and position removes much of the easy part.
P2 FULL beats the best fitted rival by >= 0.03 in both: 0.55. COMPANY arm within 0.05 of FULL in >= 1 language: 0.65 (the shape is mostly frame, i.e. company in disguise).
P3 T6 shuffle drops FULL AUC by >= 0.05 in both languages: 0.70.
P4 T3 transfer >= 0.60 both ways: 0.35 (guesses JS->PY 0.60, PY->JS 0.57); one direction >= 0.60: 0.60.
P5 T4 code -> UD-English PROPN >= 0.60: 0.20 (guess 0.53). code -> IRC nicknames >= 0.60: 0.30. UD-English -> code >= 0.60: 0.25.
P6 T1 USER shadow cos below RAND q5 in both languages: 0.45; amplification above RAND q95 in both: 0.35. U and E shapes differ more from each other than from RAND: 0.5.
P7 T7 causal FIRST deaf (AUC 0.45-0.55, non-null share <= 0.10) in both languages: 0.85; F=16 lookahead FIRST AUC > 0.58 in >= 1 language: 0.40.
P8 The old scalar (ref-entry slots changed) AUC on PA is below the fitted FULL by >= 0.05 in both: 0.75, and a local mention count scalar is within 0.05 of it: 0.5.
P9 Overall: IDENTIFIER SHAPE EXISTS (as defined) 0.40; TRANSFERS ACROSS CODE LANGUAGES 0.30; CROSS-MODAL 0.15.
