# RESULTS (preregistered in PREREG.md, stamped 2026-11-17T02:12:07Z, sha256 95ee5ece…)

Subject: khora `lintGfp` @ b12728493c662d1b87a6c56a0cf69ef36a276c2a + `khora-identity.diff`; pharos `compare` (`pharos-compare-only.patch`).
All content claims are synthetic (6 names, 7-holon tree, 4-8 content claims, 0-5 same-as claims). Seed 20261117.

## Preregistered run (`falsify-identity.mjs`, 3000 trials, E3 on the first 200) — result-patched.json
| | n | violations |
|---|---|---|
| H1 sufficiency: equal partitions => identical verdict | 1649 equal-partition trials, 1007 with different identity claims | 0 |
| H2 necessity: differing partitions => a probe separates the two lints | 1351 differing, 1351 probed | 0 |
| H3 end to end through pharos `compare`: inSync <=> equal partitions | 200 | 0 mismatches |
Minimums (300 / 300 / —) met. Verdict: **not falsified**.

## Power check (the experiment must be able to fail)
| broken reporter | caught by | violations |
|---|---|---|
| M1 scope-blind (partition at "/" for every holon) | H1 (behavioural) | 51 |
| M2 count only (what `basis.declared.identity` carries today) | H2 (structural: it cannot name a merged pair) | 2053 |
Both caught. Weakness found: preregistered H1 did not catch M2 because the generator never substituted one alias for another.

## Post-hoc (NOT preregistered) — `falsify-identity-posthoc.mjs`, adds a substitution mutation
- patched lint: 1647 equal-partition (1070 different claims), 0 violations; 1353 differing, 1353 probed, 0 violations.
- M2: now also caught by H1 behaviourally (30 violations), in addition to H2.

## E4 (measured, not a falsifier)
Of 1247 trials with the same verdict but different partitions: 1001 (80%) merged names that both appear in the content ("live"),
246 (20%) did not ("latent"). "Live" is loose: both names present anywhere in the content, not necessarily in scope.

## Shipped test
`native/organs/reasoning-lint-identity.test.mjs` (in the diff): 300 seeded trials, non-vacuity asserted. Passes on the patched lint;
fails on the unpatched lint and on both broken reporters.

## Not tested
Real claim sets; `baseIdf` other than exact identity; claims with force `strict`; the khora callers of `lintGfp`;
khora's own other tests (the one test file found in the tree covers claim-lint.js, not lintGfp).
