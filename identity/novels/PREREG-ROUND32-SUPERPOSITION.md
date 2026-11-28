# PREREG round 32: a span's role held open until an act collapses it

Written 2026-11-28 before any code or run of what follows. Stamp: `PREREG-ROUND32-SUPERPOSITION.md.sha256` and `.time` beside this file.

## Why (from round 31, `NOVELS-RESULTS-ROUND31.md`)

Round 31's rung decided twice and early: per document (GROUND) and per span (refuse). On held-out shifted GUM it cut false beings by 75% but lost 11.9 points of name recall, and on two modern training documents (`GUM_news_election`, `GUM_bio_moreau`) it refused real names built from common words (Civic Party, The Trial, Seven Days) and changed the pronoun gold (H4 failed). The owner's reading: a span's role is several at once until it collapses. This round holds the role open and collapses it only at an act.

## The rung (opt-in `readerOptions.roleCollapse: true`; off, the read is unchanged)

Every capital-tier being of the read (a `cast` row) carries a role distribution over {name, not-a-name} that the read updates and collapses at two acts, in order:

1. BINDING (the act that measures it): a row a pronoun binds to (`pronounsPresence` or `pronounsGuess` names its ref) collapses to a being. The pronoun rungs run on the uncollapsed cast, exactly as off.
2. WRITING THE CAST (the end of the read): every other row collapses by its posterior. Features, each read from the read itself or a declared prior, never from surface strings:
   - support: `propn` (a token of its surfaces the POS prior holds with dominant class PROPN), `unseen` (else a token the prior has never seen), `common` (every token known, none PROPN);
   - ground: round 31's GROUND (`name-convention.js` `nameConventionOf`, the reference spread) fired for this text;
   - multi: one of its surfaces has two or more tokens;
   - recur: two or more mention spans in the document.
   Posterior P(name | features) by naive Bayes over these four, with the counts in `native/priors-shipped/role-collapse-eng.json`, built by `identity/novels/build-role-collapse.mjs` from GUM **train** only (all 197 documents, plain and shifted), Laplace +1 on every count (declared). A row collapses to not-a-name, and stays in the read as `heard`, when P(name) < 0.5 (the decision that minimizes expected error under the model; declared). Gold label for training: a row is a name if a mention span overlaps a gold mention headed PROPN; not-a-name if it overlaps one headed NOUN and none headed PROPN; otherwise it is not used.

The report per row (features, posterior, the act that collapsed it) is on the entry, non-enumerable.

## Data

- Model: GUM train (sha256 `4672bc44…`). DEV mechanics: GUM train slice B (in-sample for the model; mechanics only).
- HELD OUT, one run: GUM test + dev (60 documents). Disclosed: round 31 read them once, for its own rung; only its pooled summaries were looked at, no per-document output of test or dev was inspected.
- Arms per document: OFF, R31 (`nameConvention: true`), R32 (`roleCollapse: true`), plain and SHIFTED (every gold NOUN capitalized, as round 31), and K (below).

## Measures

As round 31: NB, FB, P, R (cast spans against gold mentions); pronouns by `gum-falsify3.mjs` CANON and CONTROL on E, C, D, F. Document bootstrap, 2,000 resamples, seed 20261128, 95% percentile.

## Hypotheses and decisions

- H1 (no harm, modern): plain, R32 vs OFF: ΔR and ΔP intervals include 0 or lie above. Fails if either lies wholly below 0.
- H2 (the convention is read): shifted, R32 vs OFF: ΔFB wholly below 0 and ΔP wholly above 0.
- H5 (the point of holding the role open): shifted, R(R32) − R(R31), paired by document, interval wholly above 0: delayed collapse keeps names round 31 lost.
- K: shifted, demoting the same number of non-bound rows at random (20 seeds) gives ΔP whose 95th percentile is below R32's ΔP.
- H4: CANON identical with the rung on, on E, C, D, F (the pronoun rungs see the uncollapsed cast: predicted by construction); CONTROL's pooled right count not lower than OFF's. Fails otherwise.

## Decision

All of H1, H2, H5, K, H4 hold: the rung is turned on in the canonical options in a separate commit, the baseline re-recorded with this round's numbers. Otherwise it stays opt-in and the failure is recorded with its falsifier.

## Deviations

Any change after the stamp is logged in the results file, never hidden.
