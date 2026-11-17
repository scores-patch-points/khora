# PREREG-GRC — Ancient Greek third-person pronoun binding in the canonical read (zero-LLM)

Written before any result run. Stamped (sha256 + UTC time) in the files beside it. Anything changed after the stamp is a logged deviation in the results file, never a silent edit.

## What is under test

The canonical read (`native/the-fold/read-process.mjs::readToWeft`) with language `grc`, DEFAULT presence dials (window 4, boost 2, feed 1, floor 2, margin 0.3; unchanged, never tuned here), against
the Greek New Testament (PROIEL `greek-nt.xml`) with PROIEL's `antecedent-id` links as coreference GOLD, and gold-free on the NT and on Herodotus (PROIEL `hdt.xml`, no antecedent links).
English reference (native/docs/PRONOUN-BINDING-STATUS.md, NOVELS-RESULTS-ROUND10.md): precision about 0.69 at about 50% coverage on unseen GUM documents; margin does not separate right from wrong.

## Arms (all on the same book texts, same cast unless stated)

- BASE: the register on main today (`pronoun-registers/grc.json` at commit 31bb3aa: the PROIEL TEST file only, article forms included), no case-fold.
- REG: the new register, built from PROIEL (train+dev+test) and Perseus MINUS the NT test books (hold-out register, see split), no case-fold.
- REGFOLD: REG plus the case-fold (a declension prior mined from the treebanks' own proper-noun form/lemma pairs, consulted pairwise by the existing declension organ; Greek only). This is the proposed canonical arm.
- FULL: the register built from ALL of PROIEL and Perseus (the one shipped), plus the case-fold. A sensitivity arm for the hold-out.
- NULL: REGFOLD's bound referents permuted across the same bound pronouns (200 draws per book, seeded).

## Register derivation (A), fixed before running

Inputs: UD Ancient Greek PROIEL and Perseus conllu files. A surface form (NFC, lower-cased) is a register member iff, over both treebanks, (1) most of its tokens are UPOS PRON, (2) most of its PRON tokens are third-person personal
(PROIEL: Person=3 with PronType=Prs; Perseus has no Person feature, so its PRON tokens count when their lemma is a lemma PROIEL measured as third-person personal by the same majority), and (3) among those third-person tokens Sing outnumbers Plur
(the binder binds one being; a mostly plural form is not a singular binder). "Most" means strictly more than half. No other threshold; no word list. Output stays a PronounPrior@1 with `forms[token] = { gender: {...}, number: {...} }`, with provenance
(counts, the three filters' parameters, per-form PRON share kept in a side file). Gender counts are from the member's third-person tokens; `normalizePronounClass` decides clean/soft from them as it does today (clean = singular-only, one gender, 2 or more observations).

## Case-fold (B), fixed before running

A DeclensionPrior@1 for Greek: rules (case-form ending to lemma ending) mined from PROPN tokens of both treebanks (form to lemma), a rule kept iff attested in 2 or more DISTINCT lemmas (a transform, not an item; the repo's declension builder's own floor of 100 is for a
473,000-row table and has no meaning for a name list). It is consulted only pairwise by the existing `declension.js` and gated by the part-of-speech prior (a form the POS prior mostly sees as other than a nominal is never folded). Only the Greek read enables it, through a stem function
(`readToWeft` passes `declension: (stem) => ...`; any other stem gets `false`, so every other language stays byte-identical).

## Score definitions (as eval/referents/pronoun-golden.mjs scores English)

Entity = connected component of the antecedent-id links (union-find). GOLD pronoun = a token with PROIEL part-of-speech Pp or Pk, person 3, number s. ANSWERABLE = a gold pronoun whose entity has a PROPER-NOUN mention (part-of-speech Ne) that some cast span of the read overlaps.
BOUND = the presence rung bound a being at the pronoun's character position. RIGHT iff the bound being's cast mention spans overlap a token of that entity. precision = right/(right+wrong), coverage = bound answerable / answerable.
Unbound pronouns are classified by reason: not_in_register (the form is not a register member), no_candidate (no being with presence after non-personal and gender veto), below_floor, margin, plus unanswerable counted apart. (A `trace` option is added to `resolvePronounsByPresence`; absent, the function is unchanged.)
Per-book numbers, pooled numbers, bootstrap over BOOKS (10000 resamples, seeded) for every difference.

## Split, fixed before looking at anything

The 24 NT books in the file, ordered by sha256 of the book code (first 8 hex digits, ascending). The first 8 are DEVELOPMENT (for debugging code; no dial, threshold or rule may be chosen on them beyond making the code run): 2COR PHILEM ROM 2TIM JUDE HEB 1PET GAL.
The other 16 are the UNTOUCHED TEST: JOHN MATT ACTS COL 1TIM 3JOHN JAS 2THESS 1COR 1THESS MARK PHIL LUKE TIT REV EPH. (3JOHN and JUDE are shorter than the reader's 200-character floor in this treebank; they are reported as skipped.) The test is run ONCE after the code is frozen.
Herodotus (HDT1, HDT4-HDT8; the six chunks the file holds) is gold-free only and untouched: one run, no dev. Each book is read whole, in order (no sampling unless a book exceeds 5 minutes, then the first 60000 characters at a sentence end, said in the results).

## Hypotheses and predictions (each can fail)

P1 Register. (a) Every member has PRON share above 0.5 by construction; the old register's article forms (οἱ, τὰ, τὸν, τῷ, τοὺς, τοῖσι) are all absent from the new one. (b) αὐτοῦ and αὐτῷ are SOFT (not clean) in the new register; αὐτήν, αὐτῆς and αὐτῇ are clean feminine.
P2 Primary. On the TEST books, REGFOLD pooled precision >= 0.50 and coverage >= 0.25; NULL precision is at least 0.15 lower, with the bootstrap interval of (REGFOLD minus NULL) over books excluding 0. And Greek precision is BELOW English's 0.69 (pro-drop leaves fewer named antecedents in reach).
P3 The old register. At least 30% of BASE's bindings land on tokens the gold does not mark as a third-person pronoun (articles, relatives, demonstratives); at most 10% of REG's do. REG precision exceeds BASE precision by >= 0.05 pooled on the test books.
P4 The case-fold. REGFOLD has >= 10% fewer cast beings per answerable gold entity than REG (pooled); REGFOLD coverage >= REG coverage; REGFOLD precision >= REG precision minus 0.02; false merges (a cast being whose spans overlap proper-noun mentions of 2 or more gold entities) are <= 1% of beings.
P5 Margin. The presence margin does not separate right from wrong: AUC of margin for right-vs-wrong on the REGFOLD test bindings <= 0.60 (as in English). Failing this would mean margin is a usable confidence here.
P6 Gold-free falsifier. A referent bound to both a masculine and a feminine CLEAN pronoun has at least one wrong binding. Observed lower-bound error rate (sum over referents of min(masc, fem), over gendered bindings) is below the permuted null, pooled over the NT test books and separately over Herodotus.
   This needs enough feminine bindings; a corpus or book with fewer than 20 gendered bindings is reported as too thin, not as a pass.
P7 Unbound reasons. Of answerable gold pronouns not bound by REGFOLD, the largest single reason is no_candidate plus below_floor combined (no being in reach), not margin, and not_in_register is under 15% of all gold 3sg pronouns.
P8 Hold-out. FULL and REGFOLD differ by < 0.02 in pooled test precision and by < 0.02 in coverage (the form-to-gender register is a closed-class fact that does not leak the test).

## Declared non-claims

Nothing here shows more than measurable binding behaviour against PROIEL's annotation. Where a prediction fails it is reported as failed. If every arm's precision is at or below the NULL, the result is that the rung does not bind Greek better than chance.
