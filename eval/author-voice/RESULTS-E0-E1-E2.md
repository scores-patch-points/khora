# Results: do the ingested priors carry an author, and a voice? (2026-11-24)

Owner's question: "see if we can use these priors to answer from and to answer in the voice of one of the authors." Priors: the per-document `lex` of the ingestion session's corpus-lexicon build, **v3**, `checkpoint-en-v3.jsonl` sha256 `451a3da5…a33d` (reader khora@ccf2033+baseline@2026-11-23; a v4 build under a different priors directory is in progress and is a new row when it is read, not these numbers). Protocol and stamp: `PREREG-E0-E1.md`, `STAMP-E0-E1.txt` (2026-11-24T05:32:00Z). Code, authors table, organ and checkpoint match the stamp (the prereg file grew its deviations section, as logged).

## E0: does the lexicon carry an author at all? (Burrows' Delta, 200 words, proper nouns left out) — SUPPORTED (FRESH)
| query book | nearest book of 39 | rank of the other same-author books |
|---|---|---|
| Sense and Sensibility | Pride and Prejudice (Delta 0.340) | P&P 1, Emma 2 |
| Pride and Prejudice | Sense and Sensibility (0.340) | S&S 1, Emma 2 |
Rule: the same author's other book in the top 4 for both queries. Held. DEV (Carroll, Alice and Looking-Glass): each other's nearest, Delta 0.47 against 0.76 or more for the rest.

## E1: is the author's choice among near-synonymous verbs the author's? — SUPPORTED on the stamped rule (FRESH), with caveats
Pairs: the organ's mutual near verbs above the bar (0.855) over the verbs both books use at least 5 times. Predictor: the smoothed log-ratio of the training book's counts.
| test <- train (K=5, band 0, PRIMARY) | pairs scored | same-author book | pooled other authors | other-author books (mean, best) | rank of the same-author book | against pooled (McNemar, exact) |
|---|---|---|---|---|---|---|
| P&P <- S&S | 188 | 0.798 | 0.731 | 0.660, 0.737 (Moby Dick) | 1 of 38 | 29 vs 22, p 0.40 |
| S&S <- P&P | 180 | 0.811 | 0.747 | 0.670, 0.761 (Robinson Crusoe) | 1 of 38 | 29 vs 19, p 0.19 |
Rule: top 4 in both directions. Held. SECONDARY (K=3, band 1, 559 and 553 pairs; chosen after the dev pair looked best there, so not the headline): rank 1 both ways, against pooled p 0.022 and 0.0006.
What it does and does not say:
- One book by the same author predicts which near verb the author uses in another book better than any single other-author book does. That is the voice, as counts.
- At the primary setting it is NOT distinguishable from the pooled preference of 37 other books (p 0.40, 0.19): the pooled estimate has far more data. Only the dev-chosen secondary setting separates them.
- DEV (Carroll, 30 pairs at the primary setting): rank 10 of 39, same-author 0.867 = pooled 0.867. Too few pairs to say; it is a mark against calling the effect general. Two authors only.
- The near pairs are loose (bring/come, get/have, have/keep, consider/think): a pair's preference is partly grammar. Same-author books also share a period and a genre, so "author" here may be "author, period and register".
- Post-hoc robustness (EXPLORATORY): the biggest author-versus-rest deviations for Austen include "pleasure", "such", "game", "humour" counted as verbs by the reader (e3-voice-table.mjs): a parser habit in her syntax. Requiring the other authors to use the verb as a verb too (e1c, 3 verbs dropped) leaves the ranks at 1 and 1 (0.802, 0.816). A strict treebank-share filter (e1b) leaves 6 to 10 pairs (ranks 7, 9, 13): uninformative.

## E2: answer from the priors — does usage agree with the embedder about which verbs say the same? — weakly (EXPLORATORY)
450 verbs used at least 200 times; usage = idf-weighted `company` and `heads` of the merged lexicon (sha256 `f7f398c8…42c6` = the v3 merge, now named `corpus-lexicon-en.superseded-standin.json`). For 237 pairs the embedder calls equivalent, the chance that the pair shares more usage than a random pair of the same frequency is 0.736 (4,740 comparisons); for 367 near misses 0.673. Pairs with the most shared usage include antonyms and relatives (forget/remember 0.60, give/let, have/need): usage overlap cannot tell opposites apart either, and the lowest include true synonyms (acquire/buy, keep/retain) because the stored company lists are capped at 30 words. So usage does not replace the answer-invariance test of `standsIn`.

## What this means
- Answer FROM: the lexicon holds how words are used (counts, roles, heads, company), not facts. Facts come from reading the books themselves (the void hunt over the documents). The lexicon can add usage evidence to a guard; it cannot be the guard.
- Answer IN A VOICE: the lexicon carries the author as a profile (E0) and as a preference among near verbs (E1). A voiced reply built from it can only change word choices, and a short chat reply holds few verbs. For wording beyond a swapped verb the voice has to come from the author's own phrases, which the lexicon does not store; that needs a per-author phrase inventory built from the books (as the expression library does), and surface forms per lemma to say a swapped verb in the right form (asked of the ingestion session).
- Nothing here has been wired into the chat.
