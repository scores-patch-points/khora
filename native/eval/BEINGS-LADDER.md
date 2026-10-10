# Beings ladder — three changes to the beings tier, measured recursively

Written 2026-10-06. The instrument is `eval/beings-ladder.mjs`; its header holds the pre-registration and four dated amendments, each written
before the run it governs. Raw results: `eval/beings-ladder-results/<stage>/<stem>.json`. Re-run: `node eval/beings-ladder.mjs run --stage <label> ...`
then `report --stage <label> [--vs <earlier>]`.

## What was changed

| | change | where |
|---|---|---|
| **S** | The 5% keyness test stops being a membership test for every candidate. A word is **exempt** (exists at the structural floor of 2 arrivals) when the prior itself nominates it as a name: it has never met the word, or its tally is PROPN/X at ≥ 0.5. Any other word the prior has met must still be key against the received rate. Keyness is reported on every being (`standing`, `salience`). | `adapters/text/listening-cast.js` (`standing: "names-exempt"`, now the default) |
| **R** | A word the prior has not met is refused only when its frame's naming mass is below a **derived floor** — the mass below which only 5% of true naming occurrences fall, measured on held-out folds of the language's own treebank. A seen word keeps the type-level rule. | `listening-cast.js` (`refusal: "loss-bounded"`, default); `scripts/build-refusal-floor.mjs`; `priors/refusal-<stem>.json` (25 files) |
| **A** | The ear splits what the treebank splits: whole surfaces (`del → de el`, `don't → do n't`), apostrophe-bound affixes and fused prefixes (`l'`, `dell'italia → di l' italia`, `'s`), host-guarded suffixes (`hacerlo`, `ayahnya`). Every rule is derived by simulating the rule on the treebank and keeping it only if it is right at least half the times it fires. | `adapters/text/ear.js` (`contractions`); `scripts/build-contraction-prior.mjs`; `priors/contractions-<stem>.json` (13 files); wired through `grammarFor`, the language listener/context, `name-candidates`, the recursive perceiver |

The original design is still available as `ORIGINAL` (`{standing:"gate", refusal:"plurality"}`); the competence instruments (r3, r5, run, reading-helps-falsify) pin it so their recorded cards stay reproducible.

## The recursion (each stage was read before the next was designed)

| stage | what it measured | what it showed | what it changed |
|---|---|---|---|
| **s0** DEV | S as plain salience, R as "refuse below 5% naming mass" | S +0.021 (15 up / 9 down, p 0.15): big win in cased scripts, small loss in caseless; salience as a rank on names is near chance (AUC 0.52, below 0.5 in pol ita rus por fin). R met its loss bound **by refusing almost nothing** (caught 3.5% of non-names vs 36% for plurality). | S → "descriptors"; R → a derived floor |
| **s1** DEV | S' (only settled common nouns earn standing), R' (calibrated floor) | S' +0.037 (19/4/2, p 0.0013), caseless scripts all fixed; R' neutral (+0.003), median caught 0.31 at loss near 5% | built A |
| **s2→s3** DEV | A | A +0.018 (10 up / 2 down / 13 flat, p 0.019), ita +0.21. A **deranged** prior still raised F1 in 7 stems (ita +0.15): the *surface list alone* removes fused contractions from the ledger. Two instrument defects found and fixed: a multi-word token written against the next word (`dell'italia`) is one surface word; a quote mark is not a word to glue to. | S' → "names-exempt" (S' still lost to the gate in ita, eng, swe: seen non-name words slipped in) |
| **s4** DEV | S'' | S +0.049, **22 up / 0 down / 3 flat**; ita −0.041 → +0.009 | confirmation |
| **t1** fold A | final configuration on the last 20% of each TRAIN treebank, every prior rebuilt on the first 80% | F1 F2 F4 F5 held; F3 failed | replication |
| **t2** fold B | the same on the first 20% | F1 F2 F4 F5 held; F3 failed again (predicted) | — |
| **s5** DEV | re-run after wiring A into production | reproduces s4 bit for bit | — |

## Result (PROPN macro F1 per stem, recurring PROPN gold, case-stripped, 25 stems)

old = original design (000), new = all three changes (111). DEV was used to design the changes (optimistic by construction); folds A and B were not seen by any prior or diagnostic.

| stem | DEV old | DEV new | fold A old | fold A new | fold B old | fold B new | S | R | A | (fold A main effects) |
|---|---|---|---|---|---|---|---|---|---|---|
| eng | 0.495 | 0.586 | 0.367 | 0.427 | 0.546 | 0.617 | +0.030 | +0.009 | +0.020 | |
| spa | 0.679 | 0.785 | 0.638 | 0.774 | 0.460 | 0.552 | +0.127 | +0.005 | +0.004 | |
| rus | 0.396 | 0.429 | 0.348 | 0.378 | 0.401 | 0.447 | +0.026 | +0.004 | +0.000 | |
| cmn | 0.298 | 0.332 | 0.250 | 0.349 | 0.242 | 0.326 | +0.098 | +0.001 | +0.000 | |
| cmn-hans | 0.291 | 0.330 | 0.247 | 0.348 | 0.243 | 0.329 | +0.101 | +0.001 | +0.000 | |
| arb | 0.003 | 0.003 | 0.000 | 0.000 | 0.002 | 0.002 | +0.000 | +0.000 | +0.000 | gold names ≈ 0 |
| heb | 0.273 | 0.288 | 0.280 | 0.311 | 0.208 | 0.238 | +0.033 | -0.002 | +0.000 | |
| fas | 0.135 | 0.207 | 0.127 | 0.236 | 0.138 | 0.212 | +0.108 | -0.000 | +0.002 | |
| kor | 0.038 | 0.038 | 0.000 | 0.000 | 0.026 | 0.026 | +0.000 | +0.000 | +0.000 | gold names ≈ 0 |
| jpn | 0.174 | 0.226 | 0.171 | 0.227 | 0.164 | 0.223 | +0.056 | +0.000 | +0.000 | |
| fra | 0.526 | 0.698 | 0.474 | 0.671 | 0.470 | 0.650 | +0.115 | +0.002 | +0.081 | |
| deu | 0.435 | 0.492 | 0.543 | 0.684 | 0.347 | 0.405 | +0.114 | +0.001 | +0.026 | |
| ita | 0.544 | 0.771 | 0.471 | 0.596 | 0.544 | 0.654 | +0.020 | +0.008 | +0.097 | |
| por | 0.460 | 0.711 | 0.495 | 0.761 | 0.442 | 0.718 | +0.252 | +0.002 | +0.013 | |
| nld | 0.707 | 0.731 | 0.569 | 0.585 | 0.512 | 0.598 | +0.024 | -0.009 | +0.000 | |
| pol | 0.451 | 0.525 | 0.186 | 0.204 | 0.432 | 0.441 | +0.015 | -0.005 | +0.008 | |
| ukr | 0.291 | 0.313 | 0.265 | 0.281 | 0.282 | 0.299 | +0.020 | -0.004 | +0.000 | |
| hin | 0.422 | 0.560 | 0.425 | 0.586 | 0.431 | 0.557 | +0.163 | -0.002 | +0.000 | |
| vie | 0.067 | 0.075 | 0.261 | 0.273 | 0.086 | 0.076 | +0.028 | -0.016 | +0.000 | |
| ind | 0.568 | 0.717 | 0.558 | 0.717 | 0.599 | 0.723 | +0.143 | -0.000 | +0.016 | |
| swe | 0.119 | 0.117 | 0.159 | 0.180 | 0.161 | 0.161 | +0.014 | +0.007 | +0.000 | |
| urd | 0.361 | 0.424 | 0.399 | 0.484 | 0.398 | 0.482 | +0.086 | -0.000 | +0.000 | |
| tur | 0.223 | 0.256 | 0.293 | 0.324 | 0.138 | 0.157 | +0.000 | +0.026 | +0.005 | |
| ell | 0.317 | 0.378 | 0.379 | 0.434 | 0.332 | 0.348 | +0.007 | +0.006 | +0.041 | |
| fin | 0.377 | 0.426 | 0.536 | 0.547 | 0.178 | 0.203 | +0.012 | -0.001 | +0.001 | |
| **mean** | 0.346 | 0.417 | 0.338 | 0.415 | 0.311 | 0.378 | | | | |

Counts: new − old is **23 up / 0 down / 2 flat, mean +0.077** on fold A (across-stem sign test p ≈ 1e-7) and **21 up / 2 down / 2 flat, mean +0.067** on fold B (worst −0.010). Main effects: **S** +0.064 / +0.056 (22 and 19 stems up, 0 and 1 down); **A** +0.013 / +0.012 (12 up, 0 down on both folds; all eight stems with the most surface splits up on both); **R** +0.001 / −0.001 (neutral on F1).

## Pre-registered predictions that FAILED (reported as failures)

- **PS1** (s0) S beats the gate in ≥ 18 of 25 stems: 15. (Led to S′, S″.)
- **PR4** (s1) the calibrated floor keeps lost-naming ≤ 5% in ≥ 20 of 25 stems on DEV: 13. **F3** (t1) same on fold A: 15. (t2) predicted to fail again, ≤ 17: 12. The floor is a better trade than plurality (median loss ~0.05 vs ~0.08 at a similar catch) but it is **not** the bound it is named for — the held-out loss runs 5–7% in many stems. Not retuned after reading fold A (the held-out discipline).
- **PR5** (s1) R′ with ≤ 10 stems down: 11 (each by ≤ 0.016).
- **PA1** (s2) English split-recall ≥ 0.90: 0.83 (the misses are annotated typos, `its = it 's`). Held on the folds: fold B 0.96.
- **PA4** (s2) a deranged contraction prior does not raise F1: it raised ita +0.15, ell +0.04, deu +0.02. The surface list carries most of the gain in ita; the components carry the rest (+0.07 ita, +0.05 eng, +0.07 fra).
- Also: the original salience-as-rank idea — AUC 0.52 on DEV, 0.45 on fold B; **salience does not rank names**, only the "is it key" membership question for descriptors was worth keeping.

## Regression checks

- Full native suite: 1251 tests / 3 failing before, **1266 / 3 failing after** — the same three (`barker-induce` ×2, `law-corpus` ×1; unfinished Barker/law work). +15 new tests (`tests/beings-tier.test.js`), each rule with a control built to fail.
- One regression of mine found by the recursion and fixed: `tests/competence-r4.test.js` pinned the registered prediction "eng and spa: ear_inert"; the English ear now peels contractions, so the test asserts the new truth.
- Production paths: language detection still 21/22 on UDHR (unchanged), with higher attested coverage (ita 0.944 → 0.999, ind 0.922 → 0.943). `name-candidates` DEV: precision up in 9 of 14 stems (fas +0.047, ind +0.045, ita +0.027), recall unchanged or within ±0.006 except ell +0.019.
- Ladder controls on every stem: C1 (misaligned gold), C2 (the 000 config equals the shipped cast, set for set), C3 (prefix invariance), C5 (a stem with no contraction file is identical with A on) hold; C1 is undefined on fold A for arb and kor (no recurring PROPN gold there: typed underpowered).

## What this does NOT show

- **The listening cast is not wired into the production reading path** (`createListeningCast` is used only by the evals; the production heard path is `heardNominals`). S and R change the cast; only **A** reaches production. Deciding whether the cast should feed or replace the heard path is the next design question, not made here.
- Gold is **UD PROPN**: names only, recurring ≥ 2 times in a block, exact string match. arb and kor have almost no PROPN gold (their treebanks tag names X / NOUN), so S and R are unmeasured there; the score says nothing for them.
- **R1 (hear words) still says `ear_inert` for spa fra deu ita por ind tur ell**, because r1-hear builds its ear from the proclitic/enclitic lists only and does not see the contraction prior; the ladder's M3 (split-recall 0.94–1.00 on fra deu ita por ell spa; false-split ≤ 0.0063) is the instrument that does. R1 needs an amendment.
- **The existing proclitic ear is worse than the new layer on false splits**: arb splits 2.4–2.6% of plain words, heb **14–15%** (M3, unchanged by this work). That is a defect surfaced here, not fixed.
- Agglutinative languages (tur 0.35–0.51 split-recall, fin, hun) need their own affix priors; ukr/hin/urd/swe/nld have almost no surface splits in their treebanks.
- DEV was used to design S″ and the fused-prefix fix across three rounds, so DEV numbers are optimistic; the folds are the evidence. The folds are slices of the *training* treebanks (same domain), so they say nothing about domain shift; DEV, which is shifted, shows the same direction at a smaller size.
- Fold priors are built on 80% of the training data; the shipped priors use 100%.
