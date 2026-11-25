# PREREG — do the pasted sheet's proposed placements make translations more alike than matched random edits?

Written 2026-11-23, before the one run. Frozen with `FREEZE-SHEET-EDITS-ON-PUD.md` (sha256 and UTC of this file, of `sheet-edits-test.mjs`, and of the kernel files).

## REUSED SPLIT — read this first
The 21 PUD treebanks were already scored once for the unedited table (`../cross-language-cell-profile/RESULTS-CROSS-LANGUAGE-CELL-PROFILE.md`: macro AUC 0.764, NOT SUPPORTED). This is a second hypothesis on the same sentences, so the split is **reused**, not held out. What keeps it honest: (1) the edit list is the sheet verbatim, as reconciled in `../grain-by-clause-rank/SHEET-VS-KERNEL.md` (30 changing rows), pasted into the session before the first PUD scoring; no edit was chosen, dropped or moved because of a PUD result; (2) the one expansion step (which UD values a row stands for) is fixed in the script and was not checked against PUD; (3) the verdict compares against matched random edits, not against zero. What it cannot undo: I had seen the first run's per-language and per-cell diagnostics before writing this, and both tables are scored on the same 1,000 sentences, so the result is not independent evidence about new data. A held-out parallel set (word-aligned, or another language set) is still needed before any placement is adopted.

## Question
`SHEET-VS-KERNEL.md` found 30 sheet rows whose proposed cell differs from the kernel's. Applied together, do they make an English sentence's cell profile closer to its translation's, across 20 languages, than the same number of random edits would?

## Method (declared now)
- **Edited table T'**: the kernel's table with the sheet's 29 applicable groups applied (the 30th, "Relative clause, restrictive", cannot be applied because the test's categories fold `acl:relcl` into `acl`; rows with no UD form are not applied). Each group moves the categories it names to the sheet's cell; the group-to-category lists are in `sheet-edits-test.mjs` and are not changed after this freeze. Categories absent from PUD are listed and have no effect.
- **Statistic**: the same macro retrieval AUC as the first run (English query, 200 fixed random distractors per language, same seeds, analysis A = all channels; analysis B = feature values only). The script first reproduces the first run's unedited 0.7641151264691259 to 1e-9 and refuses to run otherwise.
- **Observed effect**: Δ = AUC(T') − AUC(T), paired on the same queries and distractors; 95% interval by paired sentence bootstrap (1,000 resamples).
- **Null**: 200 random edit sets, each with the same number of moved categories as the sheet, every one matched to a sheet-moved category on channel (part of speech, relation, feature) and frequency tercile in PUD (never an edited category), sent to a random other cell. This controls for the generic fact that moving frequent categories changes the AUC at all.
- **Descriptive only**: each group alone (ΔA, ΔB, a paired interval with 300 resamples), which categories moved and how many placements they carry.

## Decision (no hand-set threshold)
**Supported** iff the observed ΔA exceeds the 97.5th percentile of the 200 matched-random ΔA and the lower end of its paired 95% interval is above 0. Otherwise **not supported**: the sheet's edits help no more than random edits of the same size and frequency. A ΔA below the 2.5th percentile is reported as worse than random edits.

## What a result would and would not show
- Supported: on translation-invariance at sentence level, the sheet's grouping is better than chance edits, on reused data. Not shown: that any single placement is right, that the meaning arguments behind them hold, or that the gain would survive held-out data.
- Not supported: PUD at sentence level cannot tell the sheet's edits from random ones. Because most edits touch rare categories (evidentials, clusivity, antipassive, abessive, the local-case grid) that few of the 21 PUD languages mark, this is also a statement about the data's power: the per-group table will show which proposals PUD can see at all.

## My prediction, recorded before the run
ΔA within about ±0.01 and not above the matched null: the sheet's edits mostly move rare categories, so the groups that move frequent categories (adjective, numeral, auxiliary, copula, coordination, definiteness) will carry nearly all of any effect, in either direction. The feature-only Δ will be negligible. I do not expect to be able to adjudicate the rare-category proposals with PUD.

## Known limits, stated now
Sentence-level only; reused split; one query language; the null keeps the number, channel and frequency tercile of the moved categories but not their meaning; a group's values were fixed from its row's wording (local grid = every spatial case; necessity and ability = Nec and Pot; comparison = Equ, Cmp, Sup; T/V = Form and Infm; honorific = Elev and Humb).

## Deviations log
(empty; any change after the freeze is written here, never hidden)
