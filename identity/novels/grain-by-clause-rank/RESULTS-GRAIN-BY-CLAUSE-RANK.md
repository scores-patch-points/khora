# RESULTS — grain by clause rank against grain by feature

Preregistered (`PREREG-GRAIN-BY-CLAUSE-RANK.md`, sha256 9f3552b2…), frozen 2026-11-23T21:30:21Z with `grain-rank-test.mjs` (sha256 75f8f289…), then run **once**. Data: CorefUD 1.3 public dev, 23 corpora (Ancient Greek PROIEL excluded as the measured table's source); 22 languages gave a defined kappa (Korean has no feature column). Raw output: `RESULTS-GRAIN-BY-CLAUSE-RANK.json`. No deviation from the freeze.

## Verdict: NOT SUPPORTED

| analysis (split: dev, preregistered, one run) | macro kappa | bootstrap 95% | note |
|---|---|---|---|
| **primary**: measured-table values, Ground/Figure grain, main vs adjunct clauses (503,256 instances) | **-0.0135** | -0.0184 to -0.0085 | stratified-by-POS null: mean +0.0082, 97.5th percentile +0.0141, p = 1.0 |
| secondary: every placed value (measured and declared) | -0.0100 | -0.0145 to -0.0056 | no verdict |
| sensitivity: argument clauses counted as Figure | -0.0060 | -0.0102 to -0.0016 | no verdict |

The decision needed the interval's lower end above 0 and the kappa above the null's 97.5th percentile. Neither holds: the kappa is slightly *below* zero and below the null. The size is negligible (|kappa| about 0.01); read it as no agreement, not as an opposed one.

The plain version: among the 503,256 instances, 27.9% of those the table calls Figure sit in adjunct clauses and 27.6% of those it calls Ground do (pooled 2x2, rank-F/feat-F 290,433; rank-F/feat-G 72,857; rank-G/feat-F 112,244; rank-G/feat-G 27,722). The table's grain tells you nothing about the clause's rank. Pooled kappa -0.0027. Positive kappa in 6 of 22 languages (Catalan, both Czech corpora, German-PotsdamCC, Hungarian-KorKor, Turkish), each at most +0.027; the most negative are Old Church Slavonic (-0.076), French-Democrat (-0.059) and English-ParCorFull (-0.058).

My prediction in the prereg was "near zero after controlling for part of speech, with a positive raw kappa absorbed by the null". Half right: near zero, yes; but the raw kappa was not positive, it was slightly negative.

## What the rule cannot reach (a ceiling, independent of the verdict)
The two-way rule (main = Figure, adjunct = Ground) cannot produce Pattern. 31.4% of the 897,124 measured-table instances and 42.5% of the 1,529,086 placed instances have Pattern grain in the repo's table and are outside what the rule can address.

## The essay's polarity prediction, descriptively (no verdict attached)
Adjunct share of main-plus-adjunct instances, pooled over languages (overall mean for all placed instances: 28.5%):

| value | repo cell | n | in adjunct clauses |
|---|---|---|---|
| Polarity=Neg | DEF·Ground (declared) | 5,468 | 28.2% |
| Polarity=Pos | DEF·Ground (declared) | 45,984 | 28.4% |
| Mood=Ind | EVA·Ground (measured) | 40,627 | 27.9% |
| Mood=Imp | NUL·Ground (measured) | 607 | 5.6% |
| Person=1 | SIG·Ground (measured) | 9,173 | 21.6% |
| Mood=Sub | EVA·Pattern (measured) | 329 | 92.4% |
| VerbForm=Conv | SEG·Pattern (declared) | 365 | 84.4% |
| VerbForm=Inf | SYN·Figure (measured) | 5,625 | 61.8% |
| Mood=Cnd | EVA·Pattern (declared) | 1,721 | 58.7% |

Negation is no more subordinate than affirmation (28.2% against 28.4%), so a rank rule would send roughly a quarter of all negations to Ground, as it would almost any other value. The values that do track clause rank are the subordinating verb forms (subjunctive, converb, infinitive, conditional), and the table puts three of those four in Pattern. The imperative and first person are almost all main-clause, and the table gives both a Ground cell.

## What this data cannot test
Several of the essay's candidate forms are absent or nearly absent in the CorefUD dev sets: `Evident=Fh` 0, `Evident=Nfh` 22, `Deixis` 0, `Case=Abe` 0, `Case=Par` 1, `Case=Tra` 8, `Case=Ade` 19. The local-case grid is thin (Ine 165, Sup 230). Those candidates need treebanks of languages that mark them (the essay itself names Turkish, Quechua, Mandarin, Japanese), and nothing was downloaded.

## Limits
Clause rank is read off UD relations; Hopper's foreground and background is a discourse notion and an adverbial clause is a proxy for it. The UD layer's provenance differs by corpus and was not audited. This tests whether the *table's* grain follows rank; the table is rank-blind by construction, so it does not refute the essay's rule as a rule.
