# ant-code PREREG amendment A2 (2026-10-06, written BEFORE any joint-ablation statistic was computed; the only thing read from the v0 joint run was its RAND coverage, below)
Seen from the superseded v0 run (results/joint-*-v0-superseded.json, never analysed): in a 128-unit code window the user-identifier class U is the MAJORITY of the visible (>= 3 char) tokens
(JS window 1 of file 0: U 312, E 110, K 150, L 27), so a set of the size of U drawn from non-U tokens cannot exist: token-for-token matching on (log2 freq bin, first-in-line, length bucket)
covered only ~0.3 of the U tokens and the rest of the draws is nearly "everything that is not U". Section 5 T1's RAND design is therefore IMPOSSIBLE in code, not merely weak.
REPLACEMENT T1 (paired draws, same machinery, same objects): per window with |U| and |N| visible tokens (N = E u K u L), m = floor(min(|U|, |N|) / 2) (windows with m < 10 are skipped); for each
of D = 20 draws: a uniformly random m-subset of U, and an m-subset of N matched token-for-token to it by a hierarchical rule (exact (freq bin, first-in-line, length bucket); else (freq bin, any
position, length bucket); else (freq bin +-1); else nearest freq bin), without replacement; coverage = fraction matched exactly at the first level is reported. Both subsets are deleted jointly
(shadow / imprint / collateral shadow / amplification / magnitude exactly as before). Pooled per draw over the windows of a language: 20 paired (U_d, N_d) objects.
TESTS (paired, exchangeable under H0 "U-sets and frequency-matched N-sets leave the same hole"): (a) shadow shape distance = Euclid(mean_d U_d shape, mean_d N_d shape) vs the null that swaps U_d/N_d
within each pair (B = 5000 sign flips); (b) the same for the imprint shape, the collateral shadow shape; (c) amplification and magnitude: mean of (U_d - N_d) with the sign-flip p. SPECIFIC if
p <= 0.01 (typed: 5 tests per language, Bonferroni-ish on 0.05). Falsifier of "identifiers have a hole of their own": p > 0.01 on (a) in both languages. Also kept, descriptive only: deleting the
WHOLE class U, E, K, L per window (no size match), their pooled shapes and the cosines between them and across languages (JS vs PY), sham (delete nothing) = 0 changes, determinism.
Everything else in PREREG.md unchanged. Prediction P6 stays as written but is re-read as: shadow (a) specific in both languages 0.45, amplification different from the matched-N hole 0.45.
