# Round 14: a measured name-personhood ruling for he/she (confirmatory on 66 unused GUM train documents)

Preregistered (PREREG-ROUND14.md, 21:32:18Z), deviation D1 logged (the harness was run on dev and test before the freeze, so those are exploratory only), frozen 21:33:23Z, run once on U (66 documents, 552 answerable he/she pronouns) with a table built WITHOUT those documents.

| | right | wrong | precision | coverage |
|---|---|---|---|---|
| S0 default | 305 | 44 | 0.874 | 63.2% |
| S6 + name ruling | 319 | 31 | 0.911 | 63.4% |

- H1 holds: the 18 bindings the ruling changed were wrong 83% of the time against 12.6% for S0 overall (permutation p = 0.0001). 15 wrong bindings became unbound, 3 right ones became unbound, none turned wrong-to-right by moving; 17 pronouns newly bound (15 right, 2 wrong).
- H2 holds, barely: precision +0.038, 95% interval [+0.002, +0.110].
- H3 holds: coverage +0.2 points, interval [-0.048, +0.049].
- H4 (permuted-table falsifier) holds: 20 permuted tables give a mean precision change of -0.061 (max +0.034); none reaches +0.038.
- H5 not run here (English-only by construction; to be checked when wired).

Exploratory (sighted before the freeze, not confirmatory): dev S0 96/27 -> S6 107/18; test S0 130/15 -> S6 146/15.

Limits: the table is English words from GUM, so an unseen name carries no evidence; the interval's lower end is near zero; U has 38 documents with any answerable pronoun.
Not wired into the canonical read yet.
