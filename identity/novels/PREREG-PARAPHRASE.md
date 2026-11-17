# PREREG: a mechanical paraphrase fold for book questions (round 2), written 2026-11-17 before any holdout book is read

Round 1 (NOVELS-RESULTS.md) failed: F1 0.000 vs best baseline 0.069. A diagnostic on the 103 SPENT questions (no system change; counts only) found, for the sentences that contain a reference answer: in 37/103 the sentence shares no
content word with the question even by a 5-character stem (pure paraphrase or anaphora); where it does share a word the best answer-bearing sentence ranks first only 23 times, top-5 47 times, median rank 6 of ~2,300 sentences.
So two things fail: reaching the answer's sentence, and choosing the span inside it. This round addresses the first with a mechanical paraphrase fold, and reports the second separately.

## Data
- DEVELOPMENT: the 8 spent evaluation books of round 1 (their 103 questions and answers are seen; any fold design may use them) and dev book 4a92bf27. The fold may be tuned only on these.
- HOLDOUT (never read before this round): the next 8 books of the seeded order of NOVELS-PREREG (books-order.json positions 13-20; the same integrity rule as AMEND-1b; a book that fails it is replaced by the next). Their questions are
  filtered (Q1-Q5, unchanged) and opened only after the round-2 code is frozen (FREEZE-PARAPHRASE.md with sha256s).

## The fold (the one new mechanism; no model of any kind, no list of words, no thresholds set by hand)
Two words are folded when the evidence that they occur in the same company is high relative to that word's own spread:
- Context vectors: for every word type with >= 5 occurrences in the background text (the 10 round-1 books plus the target book: text only, no questions), positive PMI over a window of +-4 words.
- For a question word w and any book word v: cosine(w, v). Relative unit as in the surprise ladder: the median and 1.4826 x MAD of cosine(w, u) over ALL vocabulary u; w ~ v when the robust z of cosine(w, v) >= sqrt(2 ln V)
  (the universal threshold for V comparisons, Donoho-Johnstone: expected false folds < 1 per question word under the null). The threshold is derived from V, not chosen.
- A word's own forms are also folded through the book's lemma lexicon (clause predicates, as round 1).
- Anchors for sentence scoring are then fold classes (w and its folded words); an anchor's surprisal is that of its class (share of sentences carrying any member).
- TERRAIN LADDER for reaching: the sentence's score is accumulated over a window of neighbouring sentences with each sentence's anchors counted once (Link -> Network); the answer span is still one reader span inside the best window (drill-down).
Everything else (candidates, type filter T, excluded overlap, pronoun exclusion, frame role) is round 1's answerer, unchanged.

## Systems (holdout)
B1 (most frequent typed candidate), B2 (BM25), F (round 1's frozen answerer, byte-identical), and the new: B2f (BM25 over fold classes, same span rule as B2), FWf (fold-class sentence scoring + window, span = first typed candidate, role-blind, as R),
FRf (fold-class window score + the frame's role/head choice as in round 1's F, falling back to FWf when the frame is unsatisfied).
## Primary metrics
- RETRIEVAL (the new mechanism's own target): a question is "reached" when a reference answer, SQuAD-normalised, occurs in one of the top-5 sentences/windows (by the system's score). Reported for plain BM25, BM25 with fold, window+fold. Chance level reported (top-5 of ~2,000+ sentences).
- ANSWER: SQuAD token F1 and EM (max over the two references), unanswered = 0, book-cluster bootstrap 95% intervals (10,000), as round 1.
## Hypotheses
- R1: fold raises retrieval over plain BM25 on the holdout (cluster-bootstrap interval of the difference in top-5 share excludes 0).
- R2: window adds beyond fold alone (same test).
- R3: the folded BM25 B2f beats round-1 B2 in F1 (interval excludes 0).
- R4: FRf beats B1 (the best baseline in round 1) in F1 (interval excludes 0).
- R5 (the paraphrase-wall control): the share of questions whose answer sentence shares no content word with the question (37/103 in dev) is reached by the fold at a rate above plain BM25's (those questions only).
Predictions stated now so they can fail: retrieval improves modestly (top-5 share from 0.47 to under 0.60 on the holdout); R4 fails (answer-choice inside the sentence stays the bottleneck, F1 under 0.12); the fold also introduces false folds, visible as an increase of off-topic
sentences at rank 1 (reported, not hidden). A negative result is reported at the same weight.
## Not tested
Whether the fold finds true paraphrases as meaning (only whether it reaches the answer's sentence); non-extractive questions; anything beyond the extractive subset.
