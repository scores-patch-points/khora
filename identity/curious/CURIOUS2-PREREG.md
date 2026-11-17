# PREREG (v2): the curious loop on real readings, with context from Zenodotus's genre priors

Written before any loop run. Stamped first. Supersedes CURIOUS-PREREG.md (fd53b0d7…, superseded before its real run: its
CURIOUS policy was identical to ROUND-ROBIN because exploration swamped rewards scaled by the largest surprisal; its surprise
was context-free; its facts bypassed the reader's codec). The user's goal: a curious mind that seeks to be surprised while
trying to understand the world.

## What was done before this prereg (data preparation only; no loop result exists)
- 200 passages (90-170 words, paragraph-aligned, seeded) cut from Zenodotus documents: literature 42, government-legal 25,
  encyclopedic 35, academic 28, first-person voices 28 (shift material), plus 42 generated pseudo-word passages (NOISE: nothing
  to learn) and one fixed passage (CONSTANT: the Gutenberg licence text, learned at once).
- Ingested through the real codec: each passage woven as a `text` entry by an asker, then read by khora's own `readTexts` /
  `readFull` (cli/paraphrase-read.mjs, khora main 148037f, unchanged) into a `text-reading` entry, in a pharos log stored in the
  binary format (pharos S1). Result: 201 texts, 201 readings, 0 failed, 0 corrupt, 44-172 rows per reading.

## World
6 sources: literature, government-legal, encyclopedic, academic, noise, constant. One encounter = one passage, read from the log's
`text-reading` rows. For each of 20 seeds, each source's passages are shuffled (seeded); for literature, encyclopedic and academic the
last 5 are HELD OUT (never shown). Streams cycle when exhausted (a repeated passage has been seen). Budget T = 150 encounters. At tick 75
the government-legal stream is REPLACED by the 28 first-person passages (narrative prose that no legal prior expects); the model keeps
its counts and the agent is not told.

## The model (khora's holograph, reused unchanged)
Facts per passage from its logged rows (punctuation rows were already dropped by the reader): slot `w` = lower-cased form, slot `x` =
`upos|deprel`. Per source, per slot: Dirichlet counts, alpha = 1, with the novel bucket (`predict`, `klAdmit` of
native/kernel/bayes-surprise.js); no decay. Surprisal S of an encounter = mean bits per fact under the model BEFORE learning it.
Expected surprisal E = the model's slot-frequency-weighted predictive entropy before the encounter (the agent's prediction).

## The ladder (as in the identity ladder and v1)
Per source, relative to its own earlier S (discounted), unit 1.4826 x MAD floored by the median unit of the other sources; fewer than 5
earlier encounters is a typed gap, never a level. Levels: usual, SURPRISE (s >= 1), STARTLE, SHOCK (each one unit relative to the level
below).

## Context from Zenodotus (what is contextually surprising)
GenrePrior@1 files fetched from Zenodotus derived-priors/genre-priors (sha256 prefixes): academic daef797a6bae, encyclopedic
f7b611ec43ac, government-legal de127a526bf7, literature 75c7a724717c. Tokens: /\p{L}+/gu lower-cased, length >= 4 (the priors' own
tokenizer and minLen). fit_G(p) = share of p's tokens that are terms of genre G's prior. For a passage met in a source of genre G0:
cs(p) = max over other genres G of fit_G(p) - fit_G0(p). cs > 0: the passage fits another genre better than its own (contextually
surprising). NOISE and CONSTANT have no genre: cs is a typed gap. Disclosed leak: the four priors were measured over whole
categories that include the documents these passages come from, so own-genre fit is flattered for the four genres' own passages
(C0, V1). The shift material (first-person voices, category 20) is in no prior's corpus.

## Policies (each starts with one visit to each source)
RANDOM; ROUND-ROBIN; NOVELTY (highest discounted mean S); CURIOUS: discounted UCB1. Reward r = clip(LP / u, 0, 1), LP = discounted mean of
the source's earlier S minus this S (compression progress), u = the ladder's unit for that source at that encounter (so a unit of
progress is a difference that makes a difference to that source); r = 0 while the ladder has a gap. Index = discounted mean r +
sqrt(2 ln N / N_i) (UCB1's constant 2, not tuned; N_i discounted counts). Discount gamma_i in {0.99, 0.95, 0.90}; 0.95 is the preregistered one,
the others are sensitivity. MUTANT M1: CURIOUS with v1's reward (max(LP,0) / largest S so far), gamma_i 0.95.

## Hypotheses (each can fail; 20 seeds)
- C0 the context signal works: for each of the four genres, cs < 0 for >= 80% of that genre's passages. If a genre fails, V1 and C5's
  context clause are reported for it as uninterpretable.
- C1 the pathology exists: NOVELTY spends > 50% of its encounters after tick 20 on NOISE (median over seeds).
- C2 not drawn to noise or to the satiated: CURIOUS(0.95) spends <= 1/6 of its encounters after tick 20 on NOISE and <= 1/6 on CONSTANT (medians).
- C3 it is not round-robin: for CURIOUS(0.95) the median over seeds of max_i |share_i - 1/6| >= 0.03; M1 is expected to fail this.
- C4 it learns: final held-out surprisal (mean bits per fact over literature, encyclopedic, academic; lower is better), paired over seeds:
  CURIOUS(0.95) lower than RANDOM and lower than ROUND-ROBIN, one-sided exact sign test p < 0.05 each.
- C5 it notices the shift: CURIOUS(0.95) revisits government-legal within 30 ticks after tick 75 in >= 90% of seeds; the first post-shift
  encounter there is at SURPRISE or above in >= 90% of those revisits, and has cs > 0 in >= 90% of them.
- C6 the log is the record: seeds 1-3 of CURIOUS(0.95) are logged to the pharos log (a prediction entry before each encounter; an outcome
  entry citing it and the reading entry). Folding the log alone, recomputing every S from the logged readings and every level from the S
  sequence reproduces all logged values (100%).
- V1 (reported; predicted: higher): pooled over genre-source encounters of RANDOM, ROUND-ROBIN and CURIOUS(0.95), P(cs > 0 | level >= 1) vs
  P(cs > 0 | level = 0): does history-relative surprise track context?
- Reported: shares per source per policy; calibration of E against S (median Spearman per source); sensitivity to gamma_i.

## Not tested
Choosing a source it has never met; whether anything is experienced; text beyond these 200 passages. A "no" on C4 means this loop does not
beat round-robin at this scale, which is a finding, not a failure to be tuned away.
