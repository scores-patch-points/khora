# ERRATUM 3 to OMNI-PREREG.md (after ERRATUM-2 3842f760…): a numerical fix, filed before any result was seen

The scoring script stamped in ERRATUM-2 (omni-score.py e7302a10…) crashed when run, BEFORE printing anything: the
pooled Clopper–Pearson bound computes binomial terms with math.comb, which overflows a float at the pooled n
(~3,600 people). The runs (runs/*.json) existed; no score, rate or bound had been printed or opened.

Fix: the same one-sided 95% Clopper–Pearson definition, with each binomial term computed in log space (lgamma, log1p).
Nothing else changed. Re-checked against the values already reported: 0/42 upper 0.0688; 7/144 bounds 0.023 / 0.0894
(identical to before the fix). The crashed version is kept as omni-score.erratum2.py.

## Script under this erratum (sha256)
- `omni-score.py` bbb2c4eb2e7ca37e7bef25ebe9c7b0ebf45d58c18a4bd3b59114281242fd8a28
