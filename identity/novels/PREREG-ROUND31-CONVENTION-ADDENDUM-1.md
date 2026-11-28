# PREREG round 31, addendum 1 (before any gold run)

Written 2026-11-28, after the stamp of `PREREG-ROUND31-CONVENTION.md` (sha256 `65e69387680e3387ec8ed571aae283ff4e1c8a20ece3fef551e878e44944e311`, 2026-11-28T03:04:47Z) and BEFORE any run of the rung on gold or on the dev slice. Nothing was measured between the two.

## Why

Implementing step 1 showed the POS prior (`janus/priors/pos-eng.json`, POSPrior@1) is case-folded: it holds only lower-case keys (`court` is `{NOUN: 8, PROPN: 12, VERB: 1}`; there is no `Court`). The r0 of the stamped text ("the share of their occurrences the prior holds under a capitalized key") cannot be computed from it.

## The change (step 1, GROUND, only)

- r0 is the received convention's own measured rate, `janus/priors/conventions-eng.json`, stem `capital-marks-a-name`, witness `nonNameIsCapitalMidSentence`: 0.031 (4,614 of 148,660; "of the other tokens that are not first in their sentence, the share written with a capital"; ground UD_English-GUM train, sha256 `88c410ca…`, an earlier GUM release than the one held out here; GUM train is not the held-out test or dev).
- The counted set changes to match that witness: every token, not first in its sentence, containing a letter, whose lower-case form the POS prior holds with a dominant class other than PROPN (the prior's account of "not a name"). n counts them; k counts those written with a capital first letter. The test is unchanged: the exact one-sided tail P(X >= k | n, r0) < 0.05.

## Unchanged

Step 2 (FIGURE), the data, the measures, the hypotheses H1 to H4, the falsifier K, the bootstrap and the decision rules are as stamped.

## A limitation stated now, before the run

The prior holds 16,654 forms. A common noun it does not hold (`felony`, `tryal`, `indictment` are absent) supports a name under step 2 and is kept. The rung therefore can refuse only common nouns the treebank attests. H2 tests what that buys on GUM; a broader giver (the Wiktionary pack through the hyperlexicon) would be a separate round.
