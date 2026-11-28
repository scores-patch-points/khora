# PREREG round 31, addendum 2 (after the DEV run, before any held-out run)

Written 2026-11-28, after ADDENDUM-1 (sha256 `97c8f35df4758a2dfd280370c8293fa57d2c21aa2559b8d2d287ebc79f49cae4`) and after the DEV run on GUM train slice B, which the stamped text allows freely. No held-out document (GUM test, GUM dev) has been read by the rung.

## What the DEV run showed (slice B, 30 documents; recorded in the results file)

- Shifted: GROUND fired on 30 of 30; FB 4,242 to 1,194; P 0.263 to 0.518, ΔP 95% [+0.210, +0.297]; R 0.872 to 0.773, ΔR [−0.135, −0.067]; the 5 random-refusal arms reached ΔP 0.061 at most.
- Plain (modern English): GROUND fired on **15 of 30** (the stamped prediction was 0 of 60); ΔR −0.080, 95% [−0.117, −0.045], wholly below 0: H1 as stamped would fail.

## Why, and the change

The stamped GROUND tests each document against ONE pooled rate (0.031). Documents differ in how often they capitalize non-names (titles, headings, interviews, lists), so a pooled binomial ignores the spread between documents and fires on ordinary modern texts. The standing rule is a reference's own spread, not a pooled point.

GROUND now reads the received rate as a DISTRIBUTION over documents: `native/priors-shipped/convention-spread-eng.json`, built by `identity/novels/build-convention-spread.mjs` from GUM train (sha256 `4672bc446b6f516877b023384d2e33952bb012aca052506b197c92ddba67b78e`, all 197 documents, train only: neither held-out split is read), counting each document exactly as the rung counts it at read time (`name-convention.js` `nameConventionOf`, the reader's own sentence cut `spans.js` `splitSentences`). r0 is that distribution's 95th percentile of per-document rates. The test is unchanged in form: the exact tail P(X >= k | n, r0) < 0.05. A text fires only when it capitalizes non-names more than 95% of the reference's documents do, beyond chance at its own length. Without the spread prior the rung refuses nothing and says `no_convention_spread`.

## Unchanged

FIGURE, the data, the measures, H1 to H4 (H1's prediction "0 of 60" stays as stamped, and is now a real test of the new null), K, the bootstrap and the decisions. The dev numbers above are not evidence for H1 or H2; only the held-out run is.
