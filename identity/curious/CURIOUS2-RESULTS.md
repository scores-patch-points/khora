# CURIOUS-2 RESULTS (CURIOUS2-PREREG.md, stamped 2026-11-17T07:39:52Z, sha256 353a868f…; curious2.mjs cab3196b…, run-curious2.mjs cd4cffcb…)

Real codec end to end: 201 passages woven as `text` entries, read by khora's own `readTexts`/`readFull` into 201 `text-reading`
entries (0 failed), in the pharos BINARY store; the loop reads its facts from the log's readings. 20 seeds, 150 encounters, 6 sources.

| | result | verdict |
|---|---|---|
| C0 context signal: own genre fits best >= 80% | literature 0.21, government-legal 0.12, encyclopedic 0.97, academic 0.96 | FAILS for two genres |
| C1 novelty spends > 50% after tick 20 on noise (median) | median 0; but novelty fixates on ONE source at 100% per seed, a different one each seed (noise in 2 of 6 seeds shown) | FAILS as stated; the pathology is fixation, which the statistic misses |
| C2 curious: noise <= 1/6 and constant <= 1/6 | noise 0.215, constant 0.138 | FAILS (noise) |
| C3 curious is not round-robin: max share deviation >= 0.03 | 0.049; mutant M1 (v1's reward scaling) 0.005 | HOLDS; the reward fix is what separates them |
| C4 learns: held-out lower than random AND round-robin (sign test) | vs round-robin 15/20 wins, p = 0.021; vs random 7/20, p = 0.94 | FAILS, and the metric is invalid (D2) |
| C5 shift: revisit <= 30 ticks / first encounter SURPRISE / context cs > 0 | 100% / 95% / 80% | holds, holds, FAILS (bar 90%) |
| C6 the log is the record (seeds 1-3) | 450 outcomes, 450 predictions, 0 mismatches, deterministic; 1,311 entries, 0 corrupt | HOLDS |
| V1 history-relative surprise tracks context | P(cs>0 given surprise) 0.396 vs given usual 0.436 (n 1,283 / 3,502) | direction wrong |

Calibration: the agent's expected surprisal tracks the outcome for the genre sources (Spearman 0.62-0.74), 0.23 for noise.

## Post-hoc diagnostics (not preregistered; diagnose2.mjs; curious2.mjs gained one export, factsFor)
- D2 invalidates C4. khora's holograph (alpha 1 with a novel bucket) is a poor open-vocabulary model: held-out bits per fact RISE as
  it learns (literature 5.87 after 1 passage -> 7.28 after 37; academic 6.48 -> 7.46) because each unseen word costs log2(N + K), and an
  EMPTY model scores 1.00 bit per fact, the best. A metric that rewards learning less cannot test whether the agent learns. The
  held-out gap between policies (7.32 vs 7.32) is noise; novelty's lower score (6.40) is it learning less about most sources.
- D3 shows part of C0's failure is prior SIZE: the term lists differ (literature 2,000, academic 2,000, encyclopedic 1,808,
  government-legal 856), so raw fit favours the bigger lists. Normalised by z-score over all passages, own genre fits best for
  literature 0.74, government-legal 0.48, encyclopedic 0.94, academic 0.82; first-person text fits another genre better than legal
  0.86. Better; still under 0.8 for two genres. Also disclosed in the prereg: the priors' corpora contain these documents.
- D1: novelty fixates (a source per seed, 100%). That is the novelty-seeker's failure, in a form the median hid.

## What this says
1. What worked: ingestion through the real codec into the binary pharos; the agent's whole run is a replayable record; the ladder notices
   a shift (19/20 first encounters at SURPRISE); the reward fix (rewards in units of each source's own spread) turned a round-robin
   look-alike into a policy with preferences.
2. What did not: Zenodotus genre priors are over-representation LISTS, not probability models, so as a raw fit they are confounded by
   size and say little about what is contextually surprising for a passage; and khora's holograph is the wrong model for open
   vocabulary, so "does it learn" is not yet measurable. CURIOUS is mildly drawn to noise (0.215 vs 1/6), plausibly because the
   structure slot of gibberish is genuinely learnable at first.
3. Next, each its own preregistration: a model with a vocabulary-aware base measure (so held-out loss falls with learning); the context
   signal normalised by prior size or taken from a prior that carries frequencies; fixation reported as a first-class statistic.
