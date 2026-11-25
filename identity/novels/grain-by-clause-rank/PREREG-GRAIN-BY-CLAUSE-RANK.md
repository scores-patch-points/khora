# PREREG — does grain by clause rank agree with grain by feature?

Written 2026-11-23, before the one run. Frozen with `FREEZE-GRAIN-BY-CLAUSE-RANK.md` (sha256 and UTC of this file and of `grain-rank-test.mjs`).

## Question (from "The Other Eighteen")
The proposal: clause rank sets the grain and the form sets the operator (Talmy on complex sentences: main clause Figure, subordinate clause Ground; Hopper: foreground and background). The repo today gives a feature value its grain from a table. The essay's test: take the thirteen cells that already have grammar and check, on a held-out sample, whether grain-by-clause-rank agrees with grain-by-feature. If it does, the Ground and Figure cells share one codec rule with the kārakas' case system; if not, the grain axis is carried by something other than syntax.

## What "the thirteen cells" are here
The measured table, `CELL_OF_GRAMMAR` in `native/kernel/cube.js` (31 values, tallied on Ancient Greek), has 21 distinct cells; 13 of them are Ground or Figure: Ground CON, EVA, NUL, REC, SEG, SIG; Figure CON, EVA, INS, REC, SEG, SIG, SYN. That is the essay's "thirteen of the eighteen", and its five without grammar (NUL·Figure, INS·Ground, SYN·Ground, DEF·Ground, DEF·Figure) are the ones absent from the measured table. `native/kernel/universal-grammar.js` later declared placements for more; the secondary analysis uses them.

## Data
CorefUD 1.3 public, every `*-dev.conllu` already on disk (`workspace/corefud`), nothing downloaded. Excluded: `CorefUD_Ancient_Greek-PROIEL`, because the measured table was tallied on that treebank (not held out). Korean has no feature column and contributes no instances. The provenance of each corpus's UD layer (gold or converted or parsed) is not audited.

## Units and rules (declared now)
- **Instance**: one (token, feature value). A multi-valued feature (`Case=Nom,Acc`) gives one instance per value; a layered feature (`Number[psor]`) takes its plain dimension's cell. Features with no placement are counted as unplaced and dropped; surface features (`Abbr`, `Typo`, ...) are dropped.
- **Feature grain**: the grain of `addressOfFeature(feature, value)` in `universal-grammar.js`. Instances whose feature grain is Pattern are dropped from every analysis (the rank rule has two grains, so it cannot say Pattern); the share dropped is reported.
- **Clause rank**: the relation of the nearest ancestor-or-self that is clausal. `root` or head 0 or `parataxis` = **main** (Figure). `advcl` or `acl` (any subtype) = **adjunct** (Ground). `ccomp`, `xcomp`, `csubj` = **argument clause**. `conj` and every other relation pass to the head. A head cycle or broken head is unresolved and dropped, and counted.
- **Primary analysis**: measured-table values, feature grain Ground or Figure, clause rank main or adjunct. **Secondary**: every placed value (measured and declared). **Sensitivity**: primary with argument clauses counted as Figure.

## Statistic
Cohen's kappa between rank grain and feature grain, per language (undefined when a margin is empty; that language is left out and counted), macro-averaged over languages with equal weight. Kappa already removes the agreement that the two grain mixes produce by chance.
- **Interval**: 1,000 bootstrap resamples of sentences within each language, seed 20261123, percentile 95%.
- **Null that controls for part of speech**: 200 permutations that shuffle the feature grain within (language, UPOS) and keep each instance's clause rank; the macro kappa is recomputed each time. Verbs and nouns carry different features and sit in different clauses, so the raw kappa alone could be a part-of-speech effect.

## Decision (stated before the run, no hand-set kappa threshold)
**Supported** only if both hold on the primary analysis: the lower end of the bootstrap 95% interval of the macro kappa is above 0, and the macro kappa is above the 97.5th percentile of the part-of-speech-stratified null. Otherwise **not supported**: the table's grain is not carried by clause rank on this data. The secondary and sensitivity analyses are reported with their intervals and carry no verdict.

## What a result would and would not show
- Supported would show that clause rank and the table's grain move together beyond chance and part of speech. It would not show that rank *sets* the grain, nor that the cell assignments are right; the table's grain is itself declared or measured on one language.
- Not supported would show that the table's feature grain does not track clause rank here. It would not refute the essay's rule, because the table is rank-blind by construction (a value has one grain wherever it occurs). The essay's own prediction (the same polarity marker flips grain with clause rank) is tested only descriptively: the share of each value in adjunct against main clauses is reported for every value, with its repo cell.

## My prediction, recorded before the run
Kappa near zero once part of speech is controlled: I expect the table's grain to follow meaning (frame, argument, agreement), not clause rank. A positive raw kappa that the stratified null absorbs is the likeliest shape.

## Known limits, stated now
Clause rank is read off UD relations, not off discourse; Hopper's foreground and background is a discourse notion and an adverbial clause is only a proxy. UD relation quality differs by corpus. Dev sets of several corpora are small. The test uses the table's grain, which for 13 of 31 measured values was itself fitted on Ancient Greek.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
