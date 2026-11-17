# SEVERITY RESULTS (preregistered in SEVERITY-PREREG.md, stamped 2026-11-17T03:30:18Z, sha256 cc8f3d29…)

**Decision: NOT SHIPPED.** V1 failed. `khora-identity.diff` is unchanged (identity-warrant@2). Candidate @3 in
`severity-not-shipped/`.

## Paired runs (seed 20261123, 40 worlds per type, identical worlds per ordering; facts fetched per pair)
| world | FIRST (@2, shipped) | SEVERE (@3 `next`) | ANTI (least severe) |
|---|---|---|---|
| RICH | 1.927 | 1.888 (0.980x) | 2.993 (1.554x) |
| POOR | 2.536 | 2.502 (0.987x) | 3.252 (1.282x) |
| SKEWED | 1.885 | 1.805 (**0.957x**) | 3.097 (1.643x) |
V1 (SKEWED <= 0.90x): **FAIL** (0.957x). V2 (bounds): pass (RICH false-merge 0.0137, recall 1; SKEWED 0, 1; 0 splits).
V3 (RICH <= 1.02x): pass. Power (ANTI >= 1.10x in SKEWED): caught (1.64x).

## Reading
The ordering matters a great deal (the least severe first costs 28–64% more), but the shipped order already takes the
large step: a fact known for ONE name (one fetch can refute) before a relation known for neither (two). Ranking by
rarity within those adds 2–4%: with 4–6 values, almost any one-step test refutes a distinct pair (70–90%).
Not tested: noise, where single tests are weaker and ordering may matter more; worlds with very uneven relations.
