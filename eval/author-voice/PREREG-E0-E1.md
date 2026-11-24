# PREREG: do the ingested priors carry an author, and a voice? (E0, E1)

Written 2026-11-24 before any Austen number was read. Owner's question: "see if we can use these priors to answer from and to answer in the voice of one of the authors."
Priors under test: the per-document `lex` in the ingestion session's `Zenodotus/derived-priors/corpus-lexicon/checkpoint-en-v3.jsonl` (the reader khora@ccf2033+baseline@2026-11-23, 40 English books). I read it and write nothing there. The file-to-author table is `authors.json` here.

## Sets
- DEV (already looked at, used to find bugs and to see what the numbers look like): Carroll, Alice (pg11) and Through the Looking-Glass (pg12).
- FRESH (read once, after this stamp): Austen, Sense and Sensibility (pg161) and Pride and Prejudice (pg1342), both directions (train on one, test on the other): two directed tests.
- NOT USED: the six works the ingestion session reserved for its own held-out role test (Emma, Dracula, The Time Machine, A Tale of Two Cities, Moby Dick, The Origin of Species), as a test or training book of mine. They stay in the pool of "other authors' books" as counts only (an other-author book is a comparison, never a target).

## E0: does the lexicon carry an author at all? (Burrows' Delta)
`e0-author-signal.mjs --words 200 --query Sense-and-Sensibility,Pride_and_Prejudice`. For each query book, the rank by Delta of the same author's other fresh book among the 39 other books. Under no author signal the rank is uniform on 1..39.
- SUPPORTED if the same-author book is in the top 4 (the top ten percent, p = 0.1 each under the null) for BOTH queries. Otherwise NOT SUPPORTED. Dev: Alice and Looking-Glass were each other's nearest (rank 1 of 39, Delta 0.47 against 0.76 or more for the rest), so E0 is expected to hold; it is a sanity check, and it is a weak one (two sequels share a style, a period and a genre).

## E1: is the author's CHOICE among near-synonymous verbs the author's? 
`e1-lexical-preference.mjs`, training book T, test book S, same author. The pairs are the organ's own (native/organs/verb-equivalents.js: mutual and above the bar of random verb pairs, bar 0.855), over the verbs both books use at least K times. A pair is scored when the test book uses its two verbs a different number of times. Predictors: the smoothed log-ratio of the training book's counts; the pooled counts of every other author's books; the same log-ratio from each other author's single book. Measures: accuracy of each; the rank of the same-author book among the 38 other-author books (rank 1 = best; uniform under no author effect); an exact McNemar test of the same-author book against the pooled preference.
- PRIMARY (the organ's own settings, no extra dial): K = 5, band 0. SUPPORTED iff the same-author book ranks in the top 4 of 39 in BOTH directions. Otherwise NOT SUPPORTED. Reported either way: accuracies, the McNemar counts, the best other-author book.
- SECONDARY, flagged as chosen after the dev pair looked best there (K = 3, band 1, more pairs): reported, never the headline. CLAUDE.md trap: dials that looked better in sample were worse out of sample.
- Why K and the bar: a verb used fewer than K times has a count dominated by chance; the bar is the organ's mean + 2.5 sd of random verb pairs.
- Known weakness, declared before reading: the organ's "near" pairs are loose (dev: bring/come, get/have, have/keep, consider/think), so a pair's preference is partly grammar, not choice. The pooled preference has far more data than one book; a same-author book that merely ties the pooled preference is NOT evidence of a voice. The rank among single other-author books is the fair comparison.

## What each outcome means for the owner's question
- E0 yes, E1 no: the priors carry the author as a whole (a profile), not as a choice between ways of saying the same thing; a voiced reply then has to be built from the author's own sentences and phrases, not by swapping verbs.
- E0 yes, E1 yes: a verb swap toward the author's preference is licensed by the data and can be wired behind the DMD guard.
- E0 no: the lexicon does not carry the author; stop.
Nothing here is a claim about the experience of reading a voiced reply; it is a measurement of counts.

Frozen: the stamp file STAMP-E0-E1.txt holds the sha256 of this file, of the two scripts, of authors.json, of verb-equivalents.js and of the checkpoint, and the UTC time, written before the fresh run.

## Deviations and slips (logged 2026-11-24, after the stamp, before the E1 results were all read)
1. The rank's denominator is 38, not 39, on the Austen pair: the same author's other books (Emma) are left out of the "other authors" set, as the protocol says. Under no author effect the chance of the top 4 is 4/38 (10.5%), not 4/39. The support rule (top 4 in both directions) is unchanged.
2. The first attempt at the E1 fresh runs passed the two book names as one shell argument (zsh does not split an unquoted variable), so the script stopped on its own check ("matches 0 books") and scored nothing. No E1 number was read from it.
3. The first direction (test Pride and Prejudice, train Sense and Sensibility, K=5, band 0) was run once and was first seen through `head -12` (accuracies, not the rank); its result file was then read in full. It was not run again.
4. E0 was run on the fresh pair once (rank 1 of 39 each way; Emma rank 2, as the nearest after it); `E0-w200.json` holds it, copied to `E0-fresh-austen.json`. The dev run of E0 (Carroll) was overwritten in the same file name; its numbers are in the first message of this work (rank 1 of 39 each way, Delta 0.47).
