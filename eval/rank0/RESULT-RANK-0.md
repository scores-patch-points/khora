# RESULT-RANK-0 — held-out result (QSET-2), scored once by the parent session, 2026-11-04

Written from the parent's note (`RESULT-RANK-0.md` in its scratchpad); numbers are as scored there. Code and pre-registration are unchanged: branch `rank-0` frozen at e4b7823, `PREREG-RANK-0.md` sha256 `1511e0eb845ea0c8f9138ff48df02397ec416c6fef10c52e62657dca1202078f` (matches GitHub). Run on a tarball snapshot with the stand-in priors; canon preflight CANON-OK. Held-out set QSET-2: 30 questions over 9 texts, frozen 17:42:05Z, before the pre-registration (18:00). Output sha256 `7bcd3713ea9805481f0d3bab98335d55b4eb6fcca6e06884c2eab61aec26440e`.

## Verdict
**B1, B2, B3 and B4 all pass.** Under the registered rule the score may feed the Ask's candidate ranking by rank fusion, as "smelled", never as a verdict. Wiring it in is a separate task; nothing here touches the holodeck Ask.

## Numbers (questions with a gold sentence in the top k; primary pool = the question's own document)
| set | arm | R@1 | R@3 | R@5 | R@10 |
|---|---|---|---|---|---|
| full n=29 | L | 9 | 13 | 14 | 16 |
| | S1g | 14 | 21 | 22 | 26 |
| | F | 12 | 20 | 22 | 24 |
| | SH | 0 | 1 | 1 | 1 |
| | FSH | 0 | 2 | 4 | 7 |
| low-overlap n=15 | L | 2 | 2 | 2 | 3 |
| | S0g | 6 | 8 | 9 | 11 |
| | S1g | 7 | 10 | 10 | 13 |
| | F | 4 | 7 | 9 | 10 |
| | FSH | 0 | 0 | 1 | 3 |
| stratum n=16 | L | 2 | 5 | 6 | 8 |
| | S0g | 5 | 9 | 10 | 11 |
| | S1g | 7 | 12 | 12 | 14 |
| | F | 5 | 11 | 11 | 12 |
| | FSH | 0 | 1 | 2 | 2 |

| bar | result |
|---|---|
| B1 F recall@10 ≥ L (full) | 24 ≥ 16, pass |
| B2 F recall@3 ≥ L + 2 (low-overlap or stratum) | +5 (low-overlap), +6 (stratum), pass |
| B3 S1g recall@10 ≥ S0g + 2 | +2 (low-overlap), +3 (stratum), pass |
| B4 FSH recall@3 − L ≤ 1 (full, low-overlap, stratum) | −11, −2, −4, pass |

## What went wrong or does not fit (published)
- **29 of 30 scored.** q24's gold string (the parent's own label, containing a thin space) matched no reader sentence, so it is unscored. A labelling flaw of the question set, not of the arms.
- **Three earlier attempts crashed** in ollama's embedding runner before producing any score. The successful run used `RANK0_CACHE` (a read/embedding cache; it does not change values).
- **Smell alone beat the registered fusion at every k.** S1g vs F: R@3 21 vs 20, R@10 26 vs 24; low-overlap R@3 10 vs 7. Fusing BM25 with smell cost recall here (as on dev, where S1g R@3 was 21 vs F 22 but R@10 25 vs 22). The registered claim holds, but F is not the best arm; the pre-registration chose F for fusion and that stands.
- The pre-registration expected that RRF with L might be worse than smell alone; it was.

## Limits
29 questions, one genre (famous buildings), one labeller (the parent, not blind). Gold is a single answering sentence, so other correct sentences count as misses for every arm. This is retrieval of candidates, not answer correctness. The primary pool is one document per question, easier than the Ask's all-texts pool (the secondary all-texts pool is in the output file, without a bar). The ±2 bars on subsets of 15–16 are coarse. QSET-2 is now spent. Not wired into the Ask.
