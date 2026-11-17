# PREREG: answering questions about novels it has not read, with no model (NarrativeQA, extractive subset)

Written before any novel text is downloaded and before any reference answer is matched against any text. Stamped (`NOVELS-PREREG.md.sha256`, `.time`) first.
Builds on: khora's reader (`readFull`, via `readTexts`, into the binary pharos log), the surprise ladder, the identity fold, and janus's paraphrase fold
(`pair-diff`: align two readings row by row; the hole of one lands on the answer's rows). No model of any kind is part of the system.

## Data (public, read-only)
NarrativeQA (DeepMind, Apache 2.0): `documents.csv`, `qaps.csv` from github.com/deepmind/narrativeqa (saved). Test-split, kind `gutenberg`, 177 books, 5,207
questions (structure profiled before this prereg: 64% of answer1 are <= 4 words; first words what 39%, who 24%, how 10%, why 9%, where 7%).
Questions were written by people from Wikipedia plot summaries, so many answers are not in the novel; the filters below keep only questions an extractive
answerer could in principle meet.

## Books (seeded, fixed now)
Candidates: test-split Gutenberg books with 15,000 <= story_word_count <= 50,000 (39 books). Sort by document_id, shuffle with Python `random.Random('nqa-novels-20261129')`;
the first 2 are DEVELOPMENT (tuning and debugging allowed; never scored), the next 8 are EVALUATION. Each story is downloaded from its `story_url` (polite: 2 s between
requests), cut between the document's `story_start` and `story_end` markers (Gutenberg's own header and footer removed), and read in full through khora's reader.
A book that fails to download, cut or read is dropped and replaced by the next in the shuffled order (reported). All 10 books are read before the answerer exists.

## Questions (rules fixed now; applied mechanically, answers never inspected by hand)
- Q1: the question's first word is one of who, whom, whose, what, which, where, or "how many"/"how much".
- Q2: answer1 or answer2 has <= 4 words.
- Q3: some reference answer, SQuAD-normalised (lower-cased, punctuation and articles a/an/the removed, whitespace collapsed), occurs as a contiguous token sequence in the
  normalised text of the cut novel (extractive in principle).
- Q4: identical question text within a book: keep the first.
- Q5: at most 30 questions per book, drawn with `random.Random('nqa-questions-<document_id>')`.
Gold for scoring = the answers as given (not their location in the text). The filter is applied to evaluation books only AFTER the answerer's code is frozen (below).

## The reader's candidates (one definition for ALL systems, so only the choosing differs)
A candidate answer is a NOUN CHUNK from the reader's rows: a NOUN, PROPN or NUM head with its dependents of deprel det, amod, compound, nummod, flat, flat:name, nmod:poss
(coordinated heads are separate chunks); its surface string and byte span come from the rows; the referent's longest name replaces a pronoun or short alias where the reader resolved one.
Type filter T(question): who/whom/whose -> chunks headed by PROPN, or by a lemma that the book's own claims co-refer with a PROPN referent; where -> chunks that are the object of an
ADP; how many/how much -> NUM chunks; what/which -> any chunk. A candidate that overlaps the question's own content lemmas is excluded.

## Systems
- B0: uniform random type-matched chunk of the book (seed per question).
- B1: the most frequent type-matched chunk of the book (by normalised text; ties by first occurrence).
- B2: BM25 over the book's sentences (k1 = 1.2, b = 0.75, the standard constants, not tuned), query = the question's content lemmas (upos in NOUN PROPN VERB ADJ ADV NUM) minus the wh-word;
  answer = the first type-matched chunk, in reading order, of the best sentence (next sentence if none; up to 5).
- F (the system): TIER 1, the frame fold. Read the question with the same reader. Its wh-word has a dependency role (nsubj, obj, iobj, obl:*) under a head. Among the book's sentences, align the
  question's content rows to each sentence's rows (pair-diff: longest common subsequence over lemma keys, as janus's `pair-diff`) and score the sentence by the surprisal of its aligned anchors
  (the sum over aligned lemmas of -log2 of the share of the book's sentences carrying that lemma: the answer ladder's perception layer). In the best sentence the answer is the type-matched chunk
  that fills the same role under the aligned head. TIER 2, the entity fold: if the question names a referent E (a PROPN chunk) and a relation lemma, take the book's claims whose ARG0 or ARG1 resolves to E
  and whose relation lemma matches, and answer with the other argument's chunk; copular questions (who/what is E) take the claim of E's appositive or predicate nominal. The two tiers are tried in
  the order of higher evidence (Tier 1's anchor surprisal; Tier 2's count of matching claims, converted to surprisal against the book's claim base rate). No tier's choice uses the gold.
- Ablations: F1only, F2only; R (role-blind: any type-matched chunk of the aligned sentence).
- Controls: C1 each question's answer taken from a question of another book (the system must fall to baseline).

## Abstention on the ladder
For every system with a score, the answered set at ladder SURPRISE = questions whose best-evidence score is at least one robust unit (1.4826 x MAD) above the median best-evidence of ALL the
book's questions. The primary result does not abstain (every question is answered); abstention is reported beside it.

## Metrics
SQuAD token F1 and exact match after the normalisation above, maximum over the two reference answers. Unit of analysis: the question; uncertainty by BOOK-CLUSTER bootstrap (10,000 resamples of
the 8 books, then of the questions within each), 95% intervals. Per question type reported separately.

## Stage A: the reader's ceiling (measured before the answerer is run on evaluation books)
For every evaluation question: does any reader chunk, anywhere in the book, equal a reference answer after normalisation? And the F1 of the ORACLE chunk (the best chunk in the book by F1 against the
gold): the highest score ANY chunk-extracting system on this reader can reach. Reported, with the share of failures where the answer is in the text but not a chunk of this reader.

## Hypotheses (each can fail)
- N1: F's F1 over all evaluation questions exceeds the best of B0, B1, B2 (cluster-bootstrap 95% interval of the difference excludes 0).
- N2: abstention is informative: F's F1 on the answered set at ladder SURPRISE exceeds its F1 on the rest (interval excludes 0); reported for B2 on its own BM25 scores for comparison.
- N3: both tiers matter: F beats F1only and F2only (each interval excludes 0).
- N4: the frame is what helps: F beats R (role-blind) (interval excludes 0).
- N5: C1 (answers taken from another book's question) falls to within the baselines' range (not above B2's upper bound).
Predictions stated now, so they can fail: P1 F beats B2 on who and where questions but not on what/which; P2 the oracle-chunk ceiling is below 70% of Q3-filtered questions; P3 Tier 2 adds under 3 F1 points over Tier 1.

## Freeze and development rules
Development (the 2 books) may change the answerer freely. Before the evaluation questions are filtered or opened, the answerer's script is stamped with its sha256 in `FREEZE.md` and nothing changes after.
Any later change is a dated, labelled amendment and the evaluation is rerun under it with both results reported.

## Not tested
Questions needing synthesis across scenes (why, how, motives); non-extractive answers; books outside the size window; anything about whether a system understands the novel in a deeper sense.
Q3 favours questions whose answers repeat in the text. The result says how far mechanical alignment of a question's frame to the book's frames reaches, on exactly these questions.
