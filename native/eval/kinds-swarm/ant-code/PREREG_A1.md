# ant-code PREREG amendment A1 (2026-10-06, written BEFORE any impact record was read on code; PREREG.md sha256 31651645...)
Reason (stream statistics only, no reader output, no AUC): the typed caliper ladder {0.60, 0.45, 0.30} on the 6-d standardised Euclid distance of section 3 yields 35 / 10 / 3 matched pairs
out of ~440 JS positives (the nearest neighbour in 6 dimensions is farther than 0.6 SD): the ladder was typed without knowing the scale of that distance. Measured on JS
(offline matching only): caliper 1.5 -> 290 pairs (PE) / 341 (PO), balance gate fails on PO (SMD 0.106); 1.0 -> 183 / 188, both pass; 0.8 -> 92 / 114, both pass.
CHANGES (all that change): (1) caliper ladder = {1.5, 1.0, 0.8, 0.6, 0.45, 0.30}, the LARGEST caliper whose pooled matched set passes the balance gate is used (rule unchanged, per language
and per dataset kind); (2) positives per file PMAX = 100 (LATER) and 50 (FIRST) instead of 40 / 20, because a reader read costs ~0.07 s and matched pairs are only ~40% of positives;
the UD-English (T4) sample cap is 300 positives instead of 150. Everything else (gate: |SMD| <= 0.10 and covariate AUC in [0.44, 0.56], form cap 5, exact first-in-line, tests,
verdict rules, predictions) is unchanged. If no caliper passes, the dataset is UNDERMATCHED exactly as before.
