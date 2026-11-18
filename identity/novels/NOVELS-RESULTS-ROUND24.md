# Round 24: the fixed external giver — official CorefUD scorer, CorefUD 1.3 dev sets

Preregistered (PREREG-ROUND24.md, 2026-11-18T06:30:14Z), frozen (FREEZE-ROUND24.md), one run each. Giver: ufal/corefud-scorer commit 4fd7b0e (head match; CoNLL F1 = mean of MUC, B-cubed, CEAFe F1; singletons ignored, and with singletons); data CorefUD 1.3 public dev splits (archive sha256 beece2be...4837b). Control: gold written back as the system scores CoNLL 100.00. Every mention counts, pronouns of every person and number and nominals alike; the system's mentions are the cast beings' names plus the pronouns the read binds (English: the always-answering guess).

| dev set | docs | CoNLL F1 (singletons ignored) | MUC R / P / F1 | B-cubed F1 | CEAFe F1 | CoNLL with singletons |
|---|---|---|---|---|---|---|
| English-LitBank (fiction) | 10 | 36.80 | 41.23 / 84.01 / 55.31 | 31.49 | 23.59 | 33.34 |
| English-GUM | 30 | 19.62 | 15.04 / 72.56 / 24.91 | 17.16 | 16.81 | 19.71 |
| French-Democrat | 46 | 14.41 | 11.69 / 55.27 / 19.29 | 10.82 | 13.11 | 13.57 |
| Ancient_Greek-PROIEL | 5 | 9.95 | 11.70 / 71.10 / 20.10 | 6.53 | 3.22 | 11.06 |

- The expected result, stated before the run: recall is low (the reader finds only names and the he/she-class pronouns: no nominal mentions, no I/you/we/it/they, no cluster merging beyond names) and precision is comparatively high (MUC precision 84% on fiction, 73% on GUM, 71% on Greek, 55% on French). The 94% bar is not met by a wide margin on this scale; it cannot be read against this metric as it stands (the metric's own scale for strong published systems is far below 94; not verified here) and needs restating by the user.
- Deviation logged: after the first run the Greek system file failed to load (the writer kept the gold's entity marks on empty nodes, which CorefUD Greek has); the writer now strips them from the system file; only Greek has empty nodes; the other three sets are unaffected and were not rerun. Greek was rerun once.
- The English-GUM dropped 27 crossing mentions in the system file (cast spans that cross), which is conservative.
- Not scored: languages with no CorefUD dev set in the public edition, and Sanskrit (no gold).
