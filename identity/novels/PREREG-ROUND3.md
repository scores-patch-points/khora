# PREREG round 3: entity -> scene -> role -> word, the way a reader localises (2026-11-17, before any holdout question is filtered, read or opened)

Builds on NOVELS-PREREG (+AMEND-1/2), RESULTS round 1, PREREG-PARAPHRASE (+ERRATUM-1). A person answers from a model of the story: who is involved, in which scene, in which role; the wording comes last. Round 1's frame fold hinged on the predicate (the part
paraphrase changes). A check on SPENT questions (117; 91 name a cast entity): the scene where all named entities co-occur (+-3 sentences) covers 8.8% of the book and holds an answer sentence 57% of the time (6.5x random placement). That check is seen; the radius 3 is the only value used.
## Data
Development: the spent books (round 1's 8 evaluation + 4a92bf27) and their questions (seen). Holdout: the 8 books of PREREG-PARAPHRASE (holdout-ids.txt: db50738d bff11693 9bb9407d 019a9611 78775713 1b82b150 4a130666 fcc49197), read whole through the one reader already;
their questions are filtered (Q1-Q5 unchanged) and opened only after FREEZE-ROUND3.md.
## Systems
- E: (1) NAMED ENTITIES: cast referents with a surface (> 2 characters) in the question. (2) SCENE: sentences within +-3 of a mention of EVERY named entity; if that is empty, within +-3 of the rarest entity's mentions; if no entity is named, the whole book (E then equals plain BM25; reported separately).
  (3) INSIDE the scene, sentences ranked by BM25 (k1 1.2, b .75, df over the whole book) over the question's content terms (relative median rule, lemma lexicon, entity words excluded), ties by the number of named-entity mentions in the sentence, then reading order.
  (4) The answer: the first typed (T), contentful, non-excluded reader candidate of the best sentence, next sentence up to 5 (round 1's R rule, which with the answer sentence given scored F1 0.28 on spent questions).
- Ef: E with the paraphrase fold of PREREG-PARAPHRASE on the content terms inside the scene (fold classes; background = the 10 round-1 books + the target).
- Baselines on the same questions: B0, B1, B2, F (round 1's frozen answer.mjs, byte-identical to FREEZE.md), and plain BM25 retrieval.
- Not tested: SALIENCE from the reader's surprise cut: the cut covers only the first 3,000 tokens of a book (`streamCapped`), so it cannot rank events across a book. Said, not tried.
## Metrics (as before)
RETRIEVAL: a reference answer (normalised, <= 4 words) occurs in a top-k sentence of the system's ranking; scene sentences first (by score), then the rest by plain BM25 (pessimistic ties). k = 5 and 25; plain BM25 and fold BM25 reported. ANSWER: SQuAD F1 / EM (max over refs; unanswered 0);
book-cluster bootstrap (10,000) 95% intervals. Reported on all holdout questions and on the named-entity subset.
## Hypotheses
E1: E's top-5 retrieval exceeds plain BM25's (interval of the difference excludes 0). E2: E's F1 exceeds B1's. E3: Ef adds over E (retrieval top-5, then F1). E4: the paraphrase fold alone (round 2's B2f) does not beat E on retrieval.
Predictions, so they can fail: E top-5 retrieval in 0.20-0.40 on the holdout (plain near 0.15); E2 fails narrowly (E F1 under 0.12); Ef adds under 3 points; questions naming no entity fall back to plain BM25 and carry the failure.
Round 2's own hypotheses (R1-R5, PREREG-PARAPHRASE) are evaluated on the same holdout, same freeze. Everything is reported, positive or negative.
