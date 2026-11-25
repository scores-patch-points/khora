# RESULTS — the sheet's proposed placements against matched random edits (REUSED SPLIT)

Preregistered (`PREREG-SHEET-EDITS-ON-PUD.md`, sha256 4c8f3b49…), frozen 2026-11-23T22:10:41Z with `sheet-edits-test.mjs` (sha256 b47c6971…), run **once**. **Split: reused** — the same 21 PUD treebanks, 1,000 aligned sentences each, already scored for the unedited table. The reproduction gate passed (the script regenerated the first run's 0.7641151264691259 before running anything). Raw output: `RESULTS-SHEET-EDITS-ON-PUD.json`. No deviation from the freeze.

## Verdict: NOT SUPPORTED

| analysis | unedited table | sheet's edits | Δ (paired 95%) | matched-random-edit null Δ (mean; 95% range) | one-sided p |
|---|---|---|---|---|---|
| **A: all channels** | 0.7641 | 0.7661 | **+0.0019** (−0.0003 to +0.0040) | +0.0039 (−0.0237 to +0.0313) | 0.58 |
| B: feature values only | 0.6550 | 0.6595 | +0.0045 (+0.0025 to +0.0066) | +0.0089 (−0.0321 to +0.0381) | 0.60 |

Applying the 29 applicable groups moved 36 categories (265,665 placements) and raised the macro retrieval AUC by 0.002, a gain that does not exceed zero beyond sampling noise on A and sits well inside what 200 random edit sets matched on channel and frequency produce (they average +0.004 and range ±0.03). The sheet's edits do no better than random edits of the same size and frequency. Random edits help on average because the real table already sits slightly below random regroupings (first run: 0.764 against 0.776).

## What PUD can and cannot see
- 24 of 29 groups have at least one category present in PUD; five (collective number, iterative, antipassive, honorifics, distributivity) have none. 21 of the named values are absent: Number=Coll; Case Sup, Sub, Del, Lat, Add, Sbe, Sbl, Spl, Ter, Per; Definite Spec, Cons, Com; Aspect=Iter; Voice=Antip; Evident=Fh; Degree=Equ; Polite Elev, Humb; NumType=Dist.
- Six groups carry 90% of the moved placements (gender and noun class 135,107; definiteness 38,351; adjective 30,845; coordination 13,147; auxiliary 11,991; numeral 9,608). The rare-category proposals have almost no mass: abessive 4 placements, comitative 5, interjection 16, modality 26, clusivity 45, evidentiality 219. PUD cannot adjudicate them.

## Each group alone (descriptive, no verdict; 95% paired intervals from 300 resamples, 29 groups so a few will exclude 0 by chance)
| group (to cell) | ΔA | placements moved |
|---|---|---|
| Adjective (DEF·Figure) | **+0.0121** | 30,845 |
| Gender and noun class (SEG·Pattern) | **+0.0075** | 135,107 |
| Demonstrative (DEF·Figure) | +0.0024 | 3,967 |
| Definiteness (DEF·Figure) | +0.0020 (features-only −0.0053) | 38,351 |
| Equative/copula (DEF·Figure) | +0.0011 | 6,019 |
| Numeral and quantifier (SEG·Figure) | **−0.0094** | 9,608 |
| Coordination of clauses (CON·Ground) | **−0.0048** | 13,147 |
| Case: local grid (SEG·Ground) | −0.0008 | 1,897 |
| Case: partitive (SEG·Figure) | −0.0005 | 1,167 |
| all others | within ±0.0004 | 4 to 11,991 |

The groups are not additive: the single-group gains and losses sum to about +0.011, the combined table gains +0.002, because several move categories into the same cells (DEF·Figure receives adjective, demonstrative, definiteness, copula and comparison while numerals leave it).

## Reading
- The sheet's proposals are neither supported nor refuted by this data: the aggregate does not beat random edits, and most of the proposals touch categories PUD hardly contains.
- The few large single effects are on frequent categories: moving adjectives to DEF·Figure and gender to SEG·Pattern each raised translation-invariance (both leave NUL·Pattern); moving numerals to SEG·Figure and conjunction to CON·Ground each lowered it. These are four hypotheses to carry to held-out data, not findings.
- Caution on the "reused" label: the edit list was fixed before the first PUD scoring, but the diagnostics of that scoring were seen before this prereg was written, and both tables are scored on the same sentences.

## Limits
Sentence-level only; one query language; a group's value list was fixed from its row's wording; the null matches channel and frequency tercile of the moved categories, not their meaning; the relative-clause row could not be applied.
