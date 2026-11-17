# RESULTS-GRC — Ancient Greek pronoun binding, measured against PREREG-GRC.md (stamp 2026-11-17T20:45:43Z, sha256 545fc351...)

Code frozen at commit 3466df3 before the test run; the run time is in RUN-TEST.time. Deviations D1-D4 are in DEVIATIONS.md (D1 register: mostly-neuter forms out; D2 only the four Gospels carry gold, JOHN is development; D3 the case-fold repairs found on JOHN; D4 Herodotus cut to 60000 characters a chunk).
Raw: results/nt-test.json, results/analysis-test.json, results/falsify-nt-test.json, results/falsify-hdt.json, results/nt-dev.json (JOHN, development). Default dials throughout (window 4, boost 2, feed 1, floor 2, margin 0.3). No LLM anywhere.

## The numbers (gold test: MATT + MARK + LUKE, 2116 gold third-person singular pronouns, 1181 answerable)

| arm | bound answerable | right | wrong | precision (95% over books) | coverage | bindings on tokens the gold does not call a 3sg pronoun |
|---|---|---|---|---|---|---|
| BASE (register on main: PROIEL test file, articles in) | 1157 | 70 | 1087 | 0.061 (0.013-0.133) | 0.980 | 5724 of 7725 (74%) |
| REG (new register, hold-out, no fold) | 576 | 270 | 306 | 0.469 (0.368-0.626) | 0.488 | 1 of 916 |
| REGFOLD (new register + case-fold, both hold-out) | 647 | 382 | 265 | 0.590 (0.518-0.705) | 0.548 | 1 of 1022 |
| FULL (what ships: register and fold from all the data) | 677 | 359 | 318 | 0.530 (0.348-0.692) | 0.573 | 53 of 1111 |
| NULL (REGFOLD's referents permuted) | | | | 0.459 | | |

English, for scale (NOVELS-RESULTS-ROUND10): about 0.69 precision at about 50% coverage on unseen GUM documents with these dials. Greek REGFOLD: 0.59 at 55%. Per book (REGFOLD precision / its null): MATT 0.705 / 0.564, MARK 0.518 / 0.453, LUKE 0.537 / 0.360.
REGFOLD minus NULL = 0.131 (95% over books 0.066-0.177). REG minus BASE = 0.408. REGFOLD minus REG = 0.122 (0.079-0.170). FULL minus REGFOLD = -0.060 (-0.170 to -0.010).
Development book JOHN (seen while repairing, REG / REGFOLD hold-out / FULL): precision 0.670 / 0.315 / 0.741, coverage 0.694 / 0.684 / 0.769.

Unbound reasons, REGFOLD, all 2116 gold pronouns: bound 1021, below_floor 633, margin 224, not_in_register 238 (11.2%), no_candidate 0. Among the 1180 answerable: bound 647, below_floor 235, margin 170, not_in_register 128.
Cast: beings 584 (REG) to 450 (REGFOLD) to 420 (FULL); beings per answerable entity 1.258 to 1.131 to 1.093; the fold left 134 fewer beings (584 to 450). Beings that cover two different treebank name lemmas: 20 (3.4%) REG, 20 (4.4%) REGFOLD, 14 (3.3%) FULL.

Gold-free falsifier (a referent bound to both a masculine and a feminine CLEAN pronoun has at least one wrong binding; lower-bound error rate, and the same bindings permuted):
- NT test list (16 books), REGFOLD: 6 books have 20 or more gendered bindings (MATT, MARK, LUKE, JOHN, ACTS, REV), 9 too thin, 3JOHN too short. Pooled observed 14.2% against null 21.1% (529 gendered bindings); null minus observed 0.033-0.110 (95% over books), observed below null in 6 of 6 books. FULL: 14.7% against 20.0%, 5 of 6.
- Herodotus (HDT1, HDT4-HDT8, each cut to 60000 characters): REGFOLD every chunk too thin (9 to 19 gendered bindings; 69 in all, observed 12 against null 12.8: no difference). FULL: 4 chunks usable, 100 gendered bindings, observed 16.0% against null 17.6%, interval -0.022 to 0.054 (includes 0).

## Predictions

- P1 register: HELD. Article forms out (οἱ τὰ τὸν τῷ τοὺς τοῖσι ὁ ἡ); αὐτοῦ, αὐτῷ soft; αὐτῆς, αὐτῇ clean feminine (tests in native/adapters/text/grc-reading.test.mjs). The shipped register has 40 forms; hold-out 32.
- P2 primary: PARTLY FAILED. Precision 0.590 >= 0.50 and coverage 0.548 >= 0.25 held, and below English 0.69 held, and the interval over books excludes 0; but the NULL was only 0.131 lower, not 0.15. The null is high (0.459) because one being (Jesus) is most of the answerable pronouns: a random bound being is often right.
- P3 old register: HELD. 74% of BASE's bindings land on non-pronoun tokens (needed 30%); REG 0.1% (needed 10%); REG minus BASE 0.408 (needed 0.05).
- P4 case-fold: MOSTLY HELD, ONE FAILED. Beings per answerable entity fell 10.1% (needed 10%, a margin of 0.1 point); coverage rose 0.061; precision rose 0.122. FAILED: false merges at most 1% of beings: 4.4% by treebank name lemma, and by gold entity (as preregistered) 32%, a figure that is not usable because the gold does not link a name's mentions to each other (REG, which has no fold, scores 30% on it). The lemma figure is the meaningful one and it failed too (and rose from 3.4% to 4.4% with the fold).
- P5 margin: FAILED. AUC of margin for right against wrong 0.645 (needed <= 0.60); mean margin 0.73 for right, 0.65 for wrong. Margin carries a little signal in Greek (REG 0.575, FULL 0.633). Not used to filter anything here.
- P6 gold-free falsifier: NT HELD (14.2% against 21.1%, 6 of 6 books); Herodotus NOT SHOWN (REGFOLD too thin to score, FULL no difference from null). Feminine bindings are rare (172 of 565 gendered bindings in the NT test books are feminine, 28 of 69 in the Herodotus chunks, REV alone 50 of 57).
- P7 unbound reasons: HELD. Of unbound answerable pronouns no being in reach (below_floor + no_candidate = 235) outweighs margin (170) and not_in_register (128); not_in_register is 11.2% of all gold pronouns (needed under 15%).
- P8 hold-out: FAILED. FULL and REGFOLD differ by 0.060 in precision and 0.025 in coverage (needed 0.02 each). FULL's register also has ὃ, ἣ, τόν, αὐτὸς and others the hold-out register left out, and 53 of its bindings land on non-pronoun tokens. We cannot say from this run whether register or fold causes the gap.

## What this shows and does not show

Measured behaviour only: the rung with the measured register binds about half of the answerable Greek third-person singular pronouns at 59% precision in three Gospels, against a permuted null of 46%; the register fix is worth 0.41 precision (the old register bound articles); the case-fold plus case-run break is worth 0.12 precision and 0.06 coverage when the names were seen by the prior, and is harmful when they were not (JOHN development, hold-out prior: precision 0.315). The Gospels are the only gold; ACTS, the epistles, REV and Herodotus have none. The dev-hold-out result says the fold depends on the treebank having seen the names.
