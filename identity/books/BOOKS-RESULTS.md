# BOOKS RESULTS (BOOKS-PREREG.md, stamped 2026-11-17T07:00:32Z, sha256 386fef27…; books.py eb7f8c57…)

A net-new kind with no stated rules: 600 Open Library works (10 subjects x 60), 7,119 edition records, truth = the work key, never used
inside the score. Rules and the identity ladder learned from edition records alone, leave-subject-out. Output: `books-output.txt`,
`books-results.json`.

| question | result |
|---|---|
| Q1 soundness: true pairs (two editions of one work) at SURPRISE or above | 107 / 600 = **17.8%**, 95% [15.3, 20.6]; by subject from 2/60 (religion) to 22/60 (fiction) |
| Q2 power: distinct pairs (editions of different works) at SURPRISE or above | 11,972 / 12,000 = **99.8%**, 95% [99.7, 99.8]; startle 3.1-10.5% by subject |
| Q3 by comparable relations | true pairs with 3 or more: 17.1% (n 590); with 1-2: tiny n. **Distinct pairs with zero comparable relations: 0.0%** |
| Q4 translation: true pairs at SURPRISE+ by language relation | **languages disjoint 61.8% (34/55)**; overlapping 5.9% (22/372); unknown 29.5% (51/173) |
| Q5 drop one relation (pooled true / distinct; baseline 17.8% / 99.8%) | author 10.0% / 96.8% (the one that matters); title words 16.0% / 99.4%; publisher 19.7% / 99.9% (dropping it RAISES false splits); the others move under 2 points |
| Controls | C1 truth scrambled: 2.2% / 27.0% (power collapses, as it must); C2 year categorical: 16.7% / 99.8% (by-closeness year did not help here); C3 reference learned from the test subject: 19.2% / 99.9% |

## Predictions stated in advance
1. **Translated editions are the weakest stratum: CONFIRMED.** Pairs whose languages differ are flagged 62% of the time, against 6% when they overlap.
2. **Register: CONFIRMED.** Learned from the records alone, year, publisher, pages, format, classification, subject and series are PLURAL (editions of one work all agree
   exactly in only 2-17% of works; a work's editions are disjoint from each other 47-75% of the time). Author (64% all agree, 87% share a value, disjoint
   only 5.7%, strangers overlap 0.2%), title words (44%, 70%) and language (63%) are the most single-like. The year gap: a work's editions are a median 4 years
   apart, strangers 21 (ratio 5.3). Not compared with the people ladder's birth years (no like-for-like number was computed).
3. **At least 20% of distinct pairs have zero comparable relations: FALSIFIED.** Strangers always share some relation (title words, publisher, year).

## Readings (mine, not separately tested except where Q5 says so)
- Power is near-perfect and soundness is poor, the reverse of the people ladder's balance (6.9% / 66%): the ladder's unit is the spread of the self
  reference, which here is about 3x the stranger spread (about 6.8 against 2.2 bits), because a work's editions disagree on many plural relations.
- Q5 points at author as the source of most false splits: dropping it cuts them 17.8% to 10.0%. Author sets are disjoint in 13% of works (87% share a
  value), and a disjoint author pair costs about 4 bits. Most plausibly the same author under different Open Library keys, which is a record
  disagreeing with itself, as with the Wikidata cases; the split by author-key duplicates was not checked.
- Translations are the same WORK but not the same text, so a mechanical identity that only sees surface fields should often decline to merge them.
- The learner found no rules at the 0.9 level except `translated_from` (35 works): too few to call a rule.

## Limits
One source (Open Library), one editions endpoint capped at 40 per work, 10 subjects; works found under several subjects stay with the first, but different work
keys for the same text were not looked for. Truth is Open Library's own work grouping, which is itself curated and imperfect.
