# PREREG-ROUND14 NOTE 1 — a deviation, logged before the confirmatory run

D1. The harness `gum-name-veto.mjs` was run on GUM dev and test as a smoke test BEFORE FREEZE-ROUND14.md was written. Its output was seen:
dev S0 96 right / 27 wrong, S6 107 / 18; test S0 130 / 15, S6 146 / 15; S0 rerun mismatches 0 (the harness reproduces the canonical S0 exactly).
So dev and test are SIGHTED for this hypothesis and are reported as EXPLORATORY only.

Replacement confirmatory data: the GUM train documents (>= 20 sentences) that belong to no slice C, D, E, F (the "U" set, 72 documents in the exploration; never evaluated, only used as table source in the exploration).
For U the table is built WITHOUT them: `build-name-prior.mjs --exclude u-ids.txt` (the 125 slice documents only). The shipped table is built from all 197 train documents.
Hypotheses H1-H5, the rule, and the bootstrap/permutation procedure are unchanged; pooled over U.
