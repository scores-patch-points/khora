# Round 22: French, a register from the treebank and the first measured pronoun baseline

Preregistered (PREREG-ROUND22.md, 2026-11-18T05:33:57Z); code frozen (FREEZE-ROUND22.md) before the test was read. Register derived from UD French-GSD (CC BY-SA 4.0; 14 forms: il, elle, lui, lui-meme, elle-meme and the hyphenated inversions -il -elle -t-il -t-elle, plus noise such as "notre"); gold CorefUD 1.3 French-Democrat (CC BY-SA 4.0; written French of the 19th-21st centuries); the canonical read, language fra, default dials, nothing tuned.

| set | documents | answerable | bound on answerable | right | wrong | precision | coverage | shuffled null | resolved correctly (the bar's measure) |
|---|---|---|---|---|---|---|---|---|---|
| development (train, first 8 docs) | 8 | 1,327 | 565 | 397 | 168 | 0.703 | 42.6% | 0.479 | 29.9% |
| TEST (dev split, read once) | 46 | 204 | 75 | 41 | 34 | 0.547 | 36.8% | 0.312 | 20.1% |

- F1 HOLDS: the French register's binding beats the shuffled-referent null on the test set (0.547 vs 0.312) and on development (0.703 vs 0.479).
- F2: by form on the test: elle 30 right / 13 wrong (0.70), il 10 right / 21 wrong (0.32), -il 1 / 0; the object clitics le (4 answerable) and la (24) are not in the register (the treebank tags them mostly as articles) and are never bound. Bindings on tokens the gold does not call a mention: 33 of 156 on the test, 262 of 939 on development: most are the expletive il ("il faut", "il y a"), which the precision over gold pronouns ignores.
- F4 (gaps of the French read): no_morphology, no_dotted_prior, pronoun_presence_no_nonpersonal_ruling; the clause reader is the English-shaped positional one, unvalidated for French.
- The test set is small (204 answerable) and much lower than development (0.547 against 0.703): the French precision is not yet stable.
Reading: French now binds, on measured evidence, at about half the rate of the 94% bar's measure: 20% of answerable pronouns resolved correctly on the test. The weak spot is the masculine il (32%): French has no neuter, so il is also the pronoun of every masculine non-person and of the expletive, which a name ruling and an expletive detector would address. The register ships with this evaluation (the guard requires it). The UDHR Rosetta work found in ~/eoreader7 is a parallel grid for the seam, with no French coreference; the gold here is CorefUD.
