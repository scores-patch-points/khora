# IDENTITY RESULTS (preregistered in IDENTITY-PREREG.md, stamped 2026-11-17T02:31:59Z, sha256 67648a5c…)

`identity-warrant.js` derives same-as from ground: **different** (one witnessed discernment; stable), **same** (agreement;
provisional), **unjudged** (a hunger list of facts to fetch). Synthetic worlds, seed 20261118, 300 worlds per D in {2,3,5}.

## Preregistered (identity-exp.mjs) — all hypotheses held; implemented
| | main | W1 ignores polarity | W2 plain relation discerns |
|---|---|---|---|
| H1 `different` never wrong on true facts | 0 / 4,506 same-entity pairs (95,705 pairs) | 0 | **53** |
| H2 the hunger list always decides the pair | 0 / 78,431 unjudged, 4.8 fetches each | 0 | 0 |
| H3 `different` <=> the kernel raises a new conflict | 0 / 31,325 | **252** | **361** |
Shipped in `khora-identity.diff`: `identity-warrant.js` + `identity-warrant.test.mjs` (passes on the module, fails 2/5 on each mutant).
Noise arm (10% wrong one-valued facts): 4.1% of truly-same pairs called `different`; the conflicting claim ids are reported.

## Measured: `same` on bare agreement is NOT a merge
74–93% of `same` verdicts were distinct entities (only ~4.7% of name pairs are coreferent; small value domains make agreement cheap).

## Post-hoc (NOT preregistered): the hunger to satiety, merge only above a coincidence strength T
Strength = sum over distinct agreeing keys of log10(1 / smoothed frequency of that value). From the claims alone.
- Rich world (12 relations x 4 values): false-merge 0.83 (T=0) -> 0.42 (0.5) -> 0.049 (1.0) -> **0.000 (1.5) at recall 1.00**, ~7 fetches.
- Poor world (4 x 2; 6.3% of distinct pairs identical on everything): false-merge never reaches 0 while merging;
  above ~1.2 decades nothing can merge and 461 pairs are held (= 203 truly same + 258 indiscernible distinct).
Reading: the knee sits at log10(1 / prior odds of coreference) ~ 1.3 decades. The asymptote is the world's capacity
(max reachable strength); below the knee the only true output is "held: indiscernible on every observable".

## Open
The prior (coreference rate among names) was known here; estimating it mechanically is not done. The stop rule is not
yet in identity-warrant.js and needs its own preregistration. Real claims, scoped grounds, transitive merging: untested.
