# Can a question find its document in Ýlir-One? (2026-11-24, EXPLORATORY)

The owner: "the hyperlexicon shouldn't carry the facts but the newly made Ýlir-One should." So "answer from" goes to Ýlir-One, by address. This is a throwaway probe of the first step, finding the document. It reads the ingestion session's scratch `.lex` records (read only; reader `khora@ccf2033+baseline@2026-11-23+priors@Documents/janus/priors+body@fm1`) and the readings' sentence spans; it writes nothing into Ýlir-One. The index itself is the ingestion session's and is NOT built yet (it waits for the owner's go).
Protocol: 20 questions and 3 controls written before the index was built (`questions.json`, sha256 4156327a…a3a3, stamped 2026-11-24T15:03:26Z in `STAMP.txt`). Score: sum over the question's content lemmas (NOUN, PROPN, VERB, ADJ, by the reader) of log(1 + count in the document) × log(N / document frequency); no free dial. `ylir-find-probe.mjs`, `results.json`.

## The index (in memory, 113 s)
11,640 English documents, 2,028,792 lemma types, 19,438,368 postings (lemma, document, count, first-sentence index).

## Finding the document
| gold document among the top | found | chance for one document |
|---|---|---|
| 1 | 10 of 20 | 0.009% |
| 3 | 12 of 20 | 0.03% |
| 10 | 16 of 20 | 0.09% |

## The misses, and why (the finding)
- **Hobbes** (rank 164): the question names the author, and an author's name is not in his own book's addressable text (title and author lines are front matter, outside the body). It needs a works table, as the ingestion session said.
- **Alexander the Great** (rank 255): the reader dropped "Alexander" from the question (content lemmas were "tutor great"): a reader finding, to pin.
- **Ophelia's father** (rank 1302 for the Folger Hamlet): the two copies of the Complete Works of Shakespeare outrank it and DO contain Hamlet, so my gold was too narrow; Miss Ophelia in Uncle Tom's Cabin also scores. The count is as stamped.
- **Long John Silver** (rank 9): a name made of common words; a sum of per-word scores cannot see that the words stand together (the records hold no phrases).
- **Polonius** (rank 18, the whole-works copies first), **Cheshire Cat** (4), **Aristotle's student** (4), **Divine Comedy** (9), **allegory of the cave** (2), **thermodynamics** (2, the Entropy page first): near neighbours; none of these fails in the document, it is a ranking question.
- **Noise and duplicates in the corpus:** a file of cryptic crossword clues (`guardian-cryptic-clues-1999-2020.txt`) is in the top 3 for 10 of 20 questions, and some documents are listed twice (Dracula, the Shakespeare), so the runner-up can be the same text. The catalog has to deduplicate and the score has to cope with list-like documents.

## What the find cannot do yet
- **Say "not in the corpus".** The three controls (a 2022 World Cup question, a capital of Burkina Faso, the chief executive of Anthropic) score 18 to 25 for their top document; the answerable questions score 20 to 78. The ratio of the top score to the runner-up overlaps too (found at rank 1: 1.01 to 5.7; controls: 1.00 to 1.12). No confidence signal is established, so a find alone would answer anything.
- **Give the answer sentence.** `at` is the FIRST occurrence of the rarest lemma, and it is usually a title or table-of-contents line ("Jonathan Harker's Journal 1", "A room in Polonius's house Scene IV."). The sentence has to come from reading the document with the chat's document hunt, with the span as the citation.

## What the index must hold, from this
A document-frequency floor (typos and names occurring once), a catalog that deduplicates and gives a works and author table, and something for words that stand together (a name of common words). Not tested: a length-normalised score (it would be a post-hoc change; a fresh question set is needed after any change).
Next, not done: hand the top documents to the chat's document hunt, answer with the span as the cite, and count right answers.
