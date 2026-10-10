# Can a reader that admits at the first mention register a name that appears once? — results (2026-10-07)

Instrument: `eval/law/name-floor1.mjs` (pre-registration in its header, with one dated disclosure added before the full run; header sha256
`e0dd1d60ce6d0014121391308cb0773ce774add0fb15f5ba2590613bd9d636fa`). Records: `results/name-floor1/records-V{0,1,2}.json`, report `results/name-floor1/report.json`, post-hoc
`results/name-floor1/posthoc.json` (`name-floor1-posthoc.mjs`, not pre-registered).

## Design in one paragraph

FIRST-mention pairs: a positive is the first occurrence of a name form in the stream (UD PROPN; IRC a nickname that spoke that day), a negative the first occurrence of an ordinary form
matched on log2 frequency, within-sentence index bucket, character length and sentence length. Corpora: UD eng spa rus fas jpn tur (100 pairs each) and 8 IRC channel-days (50 pairs each),
1,998 token rows in all. Three variants of the same tokens read by impact.mjs's three prior-free readers with A-DEL: V0 floor 2 causal (the reference), V1 floor 1 causal (the test), V2 floor 1 with 32
sentences of lookahead (never a claim about reading). Scores: the slot scalar S_ENTRY, and a learned 144-d record (slot 85 + atmosphere 19 + span 32 + company-structure 8) by ridge-logistic
leave-one-block-out CV, against LEFT (the company profile of the two left neighbours), POSITION (control) and RIVALS.

## Registered results (pooled leave-one-block-out, 14 blocks)

| | V0 floor 2 | V1 floor 1 | V2 floor 1 + lookahead |
|---|---|---|---|
| names' non-null share / controls' | 0.272 / 0.325 | 0.391 / 0.400 | 0.514 / 0.418 |
| S_ENTRY AUC | 0.4995 | 0.4995 | 0.553 |
| learned record, pooled AUC (permutation q95) | 0.575 (0.520) | **0.546 (0.521)** | 0.647 (0.522) |
| of which UD blocks / IRC blocks | 0.550 / 0.602 | 0.524 / 0.558 | 0.540 / 0.770 |
| blocks with AUC >= 0.60 (of 14) | 6 | **3** | 10 |

Rivals on the same rows: LEFT 0.569, POSITION 0.513 (control valid, in [0.45, 0.55]), RIVALS 0.516. Controls: sham ablation 200/200 null; determinism 40/40.

| test | rule | result |
|---|---|---|
| F1 reference deaf | V0 names' non-null share <= 0.20 and S_ENTRY in [0.45, 0.55] | **FAILS as registered** (non-null 0.272; S_ENTRY 0.4995 is flat) |
| F2 floor-1 causal hears | V1 pooled >= 0.60, above q95, in >= 8 of 14 blocks | **FAILS** (0.546; 3 of 14 blocks) |
| F3 beyond company | (FULL + LEFT) − LEFT >= 0.03 with lower bound > 0 (V1) | **FAILS** (−0.009 [−0.047, 0.026]) |
| F4 lookahead adds | V2 − V1 >= 0.03 | **HOLDS** (+0.101 [0.047, 0.165]) |
| F5 UD vs IRC | reported | V1 UD 0.524, IRC 0.558 |

Predictions (blind): P1 F1 holds — **failed**. P2 F2 fails narrowly, pooled V1 in [0.52, 0.62] — **held** (0.546). P3 F3 fails — **held**. P4 F4 holds — **held**. P5 IRC above UD — **held**
(narrowly). V1 − V0 is −0.029 [−0.055, 0.001]: removing the recurrence floor did not improve the pooled record.

## Post-hoc, per register (not pre-registered)

The pooled learner is trained mostly on UD blocks (1,200 rows) and scored on IRC days (800), which is a register mismatch. An earlier IRC-dominated smoke had given IRC 0.700 at V1. Re-scoring each
register with its own leave-one-block-out learner:

| | V0 | V1 | V2 |
|---|---|---|---|
| IRC only (8 days, 798 rows), learned record (q95 ≈ 0.536) | 0.686 | **0.701** | 0.774 |
| … by channel: slot / atmosphere / span / company-structure | 0.588 / 0.546 / 0.580 / **0.676** | 0.554 / 0.546 / 0.557 / **0.676** | 0.684 / 0.714 / 0.750 / 0.777 |
| UD only (6 languages, 1,200 rows), learned record (q95 ≈ 0.537) | 0.560 | 0.533 | 0.536 |

IRC-only controls: LEFT 0.548, POSITION 0.522, RIVALS 0.523. UD-only controls: LEFT 0.584, POSITION 0.494, RIVALS 0.494.

## What it says, and what it does not

- **The ablation reader does not register a first mention through its slots.** The slot channel at floor 1 and no lookahead is 0.554 in IRC and 0.525 in UD, and the slot scalar is exactly flat. In UD the
  whole 144-d record is at its permutation limit (0.533 vs 0.539) and adds nothing to company (LEFT 0.584). Removing the floor changes almost nothing (V1 − V0 −0.03 pooled, +0.015 in IRC).
- **In chat, first mentions of nicknames are audible at about 0.70 from a day-held-out learner, but not through the slots.** The channel that carries it (company-structure, 0.676) is
  equally strong at floor 2 (V0 0.686 overall), so it does not need the floor removed. It is plausibly company: the ablation record's company channel sees the rest of the message around the token
  (the current sentence is whole even when later sentences are hidden), so it is not a prefix-only quantity. Whether it is a vocative-slot echo is untested; the position control is valid at the
  bucket level (0.522), and the earlier IRC findings (IRC position confound; ant-adversary) say to treat any IRC number as an upper bound.
- **Lookahead lets the slots hear the name** (V2 slot 0.684, span 0.750 in IRC): the field registers a name when a later mention exists, which is the recurrence rule restated. That is not a
  single-mention result.
- **The single-mention rule is neither supported nor falsified by these readers.** The registered causal test fails; the best causal signal in the data is a company effect that the prefix-only
  LEFT arm only partly reproduces in IRC (0.548) and reproduces better in treebanks (UD first mention 0.584 here; 0.624 across 23 languages in NAME-COMPANY-RESULTS.md).
- **Not covered:** a reader that admits at first mention inside the production pipeline, more than six UD languages, non-English chat, and whether the `c` channel's IRC signal survives removal
  of the right-hand side of the message.
