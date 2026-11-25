# RESULTS — do translations get more alike under the cube's cells than under arbitrary groupings?

Preregistered (`PREREG-CROSS-LANGUAGE-CELL-PROFILE.md`, sha256 217bedfb…), frozen 2026-11-23T22:01:07Z with `pud-cell-profile-test.mjs` (sha256 8ecbdb3a…), run **once**. Data: UD PUD, 21 languages with data, 1,000 aligned sentences each (not previously scored for this hypothesis). Raw output: `RESULTS-CROSS-LANGUAGE-CELL-PROFILE.json`. No deviation from the freeze.

## Verdict (analysis A): NOT SUPPORTED

Macro AUC of retrieving an English sentence's own translation among 200 other sentences, English against 20 languages; 0.5 is chance.

| analysis | observed | shuffled-table null (mean; 95% range) | one-sided p |
|---|---|---|---|
| **A: all channels** (200 shuffled tables) | **0.764** (bootstrap 0.761 to 0.767) | 0.776 (0.734 to 0.813) | 0.75 |
| B: feature values only (100) | 0.655 | 0.673 (0.608 to 0.707) | 0.82 |
| C: relations only (100) | 0.785 | 0.767 (0.743 to 0.794) | 0.069 |
| D: parts of speech only (100) | 0.806 | 0.840 (0.805 to 0.870) | 0.97 |
| reference: raw categories, no cells (finer than any 27-cell table) | 0.905 | n/a | n/a |

Translations are findable under the cells (0.76 against 0.5), but the kernel's table does no better than a random regrouping of the same categories into the same-sized cells (0.764 against a null mean of 0.776). The two channels the grammar tables rest on, parts of speech and feature values, are below the null mean; only relations are above it (+0.019), and not significantly. The decision needed the observed value above the 97.5th percentile of the null and the bootstrap lower end above the null's median; neither holds.

## Which languages and cells break (descriptive, not null-adjusted)
- **By language (A, English to X):** Finnish, Indonesian, Portuguese 0.85; German, Spanish 0.84; Turkish 0.74; Russian 0.71; Polish and Czech 0.70; Korean 0.68; Chinese 0.67; Thai 0.66; Japanese 0.64. The case-rich Slavic languages and the feature-thin East Asian ones align worst.
- **Features only (B):** Finnish 0.78 down to Japanese 0.50 (only 158 of 1,000 queries had any feature placement in both languages).
- **Cells that agree best with English across languages (Pearson r of a cell's count over the aligned sentences):** DEF·Figure 0.88, SIG·Figure 0.81, SYN·Pattern 0.78, SEG·Ground 0.76, CON·Pattern 0.73. **Worst on features alone:** SEG·Figure 0.07 (nominative), NUL·Pattern 0.12 (gender), CON·Figure 0.24 (accusative), CON·Pattern 0.32 (genitive): the case cells, where English spends words (prepositions, word order) and its tokens in those cells are few (430, 108 and 520). **NUL·Ground** 0.11 on only 22 English tokens. English has no tokens at all in NUL·Figure, INS·Ground, INS·Pattern and REC·Ground, so those four cannot be read against English.
- **All 210 pairs (A):** Portuguese, Spanish, Italian, English 0.76; Japanese 0.60 lowest.

## Exploratory check after the verdict (not preregistered)
The objection to a shuffled-table null is that it might spread token mass more evenly than the real table, so a lower AUC could be lost information. On English-PUD the real table's token-mass entropy over the 27 cells is 3.79 bits; 1,000 random regroupings of the same cell sizes give 3.85 (95% range 3.59 to 4.08), and the real table sits above 29% of them. The table is statistically ordinary in how it spreads mass, so information loss does not explain the shortfall.

## What this does and does not say
- The prediction in the prereg held in direction: the case and local-grid cells agree worst, and the feature channel does no better than the null. It was wrong that the real table would beat the null by a small margin on A.
- It says the table's *grouping* is not detectably more translation-invariant than a random one at sentence level. It does not say the cells are wrong, and sentence-level profiles cannot see which word carries which category; a word-aligned parallel set would be sharper. The verdict speaks for English against 20 languages.
- It is the cross-language half of "EOT is a universal meaning language", and that half is not shown. The other half, an inventory with a cell for everything any language marks, is built.

## Limits
Sentence-level alignment only. PUD treebanks differ in conversion and tokenisation (features on 1% of Japanese tokens, 94% of Polish). Four cells have no English tokens. The null keeps cell sizes in categories, not in tokens.
