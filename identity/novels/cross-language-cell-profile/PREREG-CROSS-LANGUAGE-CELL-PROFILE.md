# PREREG — do translations get more alike under the cube's cells than under arbitrary groupings?

Written 2026-11-23, before the one run. Frozen with `FREEZE-CROSS-LANGUAGE-CELL-PROFILE.md` (sha256 and UTC of this file, of `pud-cell-profile-test.mjs`, and of the two kernel files it reads).

## Question
The idea: natural languages overtly mark a closed set of distinctions (case endings, particles, word order, function words); the kernel's table (`native/kernel/universal-grammar.js`) puts every UD part of speech, relation and feature value in one of 27 cells; so the same meaning, said with an ending in one language and a word in another, should land in the same cells, and EOT would be a universal record of meaning. `CODING-LESSONS.md` 49 names the missing test: typing a marker by what it MEANS needs the same sentence in a language that spends a word and one that spends an ending, a parallel treebank. UD PUD is that: the same 1,000 sentences in 21 languages, with matching `sent_id`.

This tests whether the table's *grouping* carries meaning across languages. It does not test whether any single cell is the right place for a category, and it cannot show that EOT is a universal language; it can only fail to refute (or refute) the cross-language part of the claim.

## Data (held out for this hypothesis; nothing here has been scored before)
UD PUD treebanks in `workspace/ud-treebanks` (fetched 2026-11-23, commits in `PROVENANCE.tsv`): the 21 that carry data, 1,000 sentences each, all 1,000 `sent_id` shared with English-PUD (checked). Bengali, Magahi, Persian and Ukrainian PUD are empty stubs and are not used. The kernel's measured table was tallied on Ancient Greek, so no PUD text is in its history. Alignment is at sentence level only; there is no word alignment.

## Definitions (declared now)
- **Placement**: a token contributes one placement for its UPOS (`addressOfUpos`), one for its relation (`addressOfRelation` on the base relation, subtype ignored), and one per feature value (`addressOfFeature`, layered features take their plain dimension's cell, surface features skipped). Unplaced items are counted, not guessed.
- **Profile**: a sentence's count of placements in each of the 27 cells.
- **Retrieval AUC**: for an English sentence (query), the share of 200 other sentences of language X (fixed random draw per language, seed 20261123+100+k, reused by every table and analysis) whose profile is less like the query's, by cosine, than the query's own translation (ties count half); averaged over queries, then over the 20 non-English languages (macro). 0.5 is chance.
- **Shuffled-table null**: the same categories regrouped into cells at random, keeping each cell's number of categories (the cells are dealt out again over the categories). It controls for sentence length, the part-of-speech mix and the fact that any 27-way grouping makes translations look alike; what it removes is the table's *particular* grouping.

## Analyses
- **A (primary, the only verdict)**: all three channels (UPOS, relation, feature value); 200 shuffled tables.
- **B**: feature values only (the "stated signals"); **C**: relations only; **D**: parts of speech only. 100 shuffled tables each; a sentence with an empty profile on either side is skipped for that query. Diagnostics, no verdict.
- **Reference**: the same retrieval on the raw categories with no cells at all (finer than any 27-cell table); the ceiling the cells can be read against, never a competitor to the null.
- **Descriptive**: AUC for all 210 language pairs (100 distractors each) summarised per language; per-cell agreement with English (Pearson r of the cell's count across the 1,000 aligned sentences, mean over languages) for analyses A and B.

## Decision for A (no hand-set threshold)
**Supported** iff both hold: the observed macro AUC exceeds the 97.5th percentile of the 200 shuffled-table macro AUCs, and the lower end of its sentence bootstrap 95% interval (1,000 resamples, seed 20261123+7) is above the null's median. Otherwise **not supported**: the table's grouping does no better across languages than an arbitrary grouping of the same shape.

## What a result would and would not show
- Supported: the kernel's grouping puts translation-equivalent content in the same cells more than chance groupings do, on sentence-level evidence. Not shown: that the cells mean what their names say, that any particular placement is right, or that the agreement comes from the stated signals (analyses B, C, D say which channel carries it).
- Not supported: the grouping is not detectably more translation-invariant than a random one. That is a finding about the table, and it names where the table fails if the per-cell and per-channel diagnostics point at a cause.

## My prediction, recorded before the run
Aligned translations will be far above 0.5 under every table, null included (shared content words and length), so the verdict turns on a small gap. I expect the real table to beat the shuffled ones on A by a small margin carried by the relation and part-of-speech channels, and to do no better than the null on the feature channel B, because English spends words where Finnish, Turkish and Russian spend endings and the table's feature placements were tallied on one language. The cells that agree worst across languages should be the case and local-grid cells (SEG·Ground, CON·Ground, SIG·Ground).

## Known limits, stated now
Sentence-level only; translation divergence and annotation differences between PUD treebanks (conversion, tokenisation: Chinese, Japanese and Thai have 1 to 14% of tokens carrying features) lower every AUC; a profile ignores order and which word carries which category; English is the single query language for the verdict, so the verdict speaks for English against 20 languages, not for every pair (the all-pairs table is descriptive). The shuffled-table null keeps cell sizes in categories, not in tokens.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
