# PREREG — kind induction in non-standard English (ant-kinds-chat)

Written 2026-10-06 BEFORE the first run of lib.mjs / induce.mjs / signature.mjs on any corpus. Every script records the sha256 of this file (the text up to the END marker)
in its output. Nothing in this file is edited after the first run; a later change is a dated AMENDMENT section appended below the END marker, with fresh held-out data.

DISCLOSURE. Read before this was written: the BRIEF; kind-standing.js; name-rule-informal.mjs (header + loadIrc); name-shape.mjs header; impact.mjs API; corpus README and
the first 700 bytes of one IRC channel-day, one SMS file, one cosem file, one enron file; corpus sizes (counts of files, messages, words); a TIMING PROBE of impact.mjs on one
IRC day (0.49 s per window snapshot, 0.27 s per ablated token; no result of any claim read). No induced kind, no nick landing, no signature has been seen by me.

## 0. Instrument and units (all corpora)
- Unit = a MESSAGE BODY (IRC: the text after `<nick> `; SMS: one line; cosem: one line; enron: one SENTENCE of the body text, headers/forward banners dropped). Tokens by the repo's
  own `tokensOf` (copied from name-rule-informal.mjs): letters/marks/digits/apostrophes, pure-digit tokens dropped, NFC, LOWERCASE. NO capitals, NO POS, NO prior, NO word list,
  no treebank anywhere in a label or a score. The reader sees message bodies only.
- COMPANY of a word form = counts of `before=<token>` and `after=<token>` with `^` (message start) and `$` (message end) as their own tokens (kind-standing.js contextVectors
  semantics, re-implemented on integer ids for speed; a conformance check against contextVectors itself is run and reported by induce.mjs).
- Gold exists ONLY for IRC nicknames (the speaker field). Rule copied from name-rule-informal.mjs loadIrc: a body token is a NAME OCCURRENCE when its form (nick stripped to
  letters+digits, lowercased, length >= 3) equals the form of a nick that spoke >= 3 messages that day, the speaker is a different nick, and the form is not a topic word
  (share of the day's body tokens >= 1/300). The gold is used AFTER the induction to DESCRIBE kinds and as the positive class of K3; it never enters induction, K selection, or a feature.
- A form is a NICK TYPE when >= 50% of its occurrences in the pool are gold occurrences (nu >= 0.5; typed: majority).

## 1. Pools and held-out discipline
- Eligible IRC channel-days: ubuntu, kubuntu, xubuntu, ubuntu-server, lang en, messages >= 1500 (as name-rule-informal). Each is assigned DEV or CONF by the parity of the first
  byte of sha256("kinds-chat|" + relative path) (even = DEV) — fixed now, before any look. Kind induction (K selection included) uses DEV days only. CONF days are touched only
  by (a) transfer assignment of DEV centroids to CONF company, (b) the re-induction stability check of K1, (c) the stage-2 impact runs.
- Impact days: 6 DEV days and 6 CONF days drawn by seed (seedFor("kinds-chat", stage)) from the eligible days of each pool, min 3000 messages (so a window of M=256 and later
  windows exist). Stage 1 = DEV impact days; the analysis code is FROZEN after stage 1 is read except by dated amendment; Stage 2 = CONF impact days with the same code.

## 2. K1 — kinds from company, number derived from the material
Typed numbers (each said once, with its reason):
- MINC = 30 occurrences in the pool for IRC (a form with fewer has < 30 context tokens, its sqrt-count vector is mostly sampling noise); MINC = 10 for the three small corpora
  (they hold ~20x fewer tokens). Context vocabulary: the F = min(1000, #types with count >= MINC) most frequent tokens as before=/after= features, plus ^ and $ (the rest dropped).
- Representation: x = sqrt(count) (Hellinger: counts, not sets), minus the type-mean vector, L2-normalised; randomized PCA (seeded Gaussian sketch, 2 power iterations) to
  D = 48 dims; rows L2-normalised again; SPHERICAL k-means with k-means++ seeding, 30 Lloyd iterations, 3 restarts (half-split runs) / 8 restarts (final fit), best objective.
- Ladder K in {2, 3, 4, 6, 8, 12, 16, 24}.
- Half-splits: split A = even vs odd DEV channel-days (sorted by path); split B = a seeded random halving of the DEV days. Shared vocabulary = forms with count >= MINC in the pool
  and >= 8 in each half. Each half gets its OWN basis and its OWN clustering; stability(K) = mean over the two splits of ARI(P_half1, P_half2) on the shared vocabulary.
- NULL (shuffled company): the same pipeline on the DEV pool with every message's tokens shuffled within the message (marginals kept exactly, company destroyed), 4 independent draws
  (each re-split the same two ways). gap(K) = stability_real(K) - max over the 4 draws of stability_null(K). K* = argmax_K gap(K) (ties to the smaller K).
- FREQUENCY control: NMI between the real partition at K* and the log2-count decile of the form; reported. Also ARI between the partition and K* equal-mass log-frequency bands.
- HELD-OUT K1: (i) TRANSFER: assign each CONF-pool form (count >= MINC in the CONF pool) to the DEV centroid nearest to its CONF company projected through the FROZEN DEV basis;
  agreement = ARI between each shared form's DEV label and its CONF-assigned label, versus the same on the shuffled-company CONF pool (4 draws); (ii) RE-INDUCTION: cluster the CONF
  pool independently at K*; ARI against the transferred labels, versus the null.
- K1 HOLDS if gap(K*) >= 0.10 ARI (typed SESOI, provisional) AND the CONF transfer ARI exceeds the CONF null max by >= 0.10 AND NMI(kind, frequency decile) <= 0.5 (the structure is
  not only frequency bands). K1 is FALSIFIED if gap(K) < 0.10 for every K on the ladder. Anything else is reported as partial with the failed clause named.

## 3. K1b — characterisation AFTER the fact (describe, never train)
Per kind: types, token share, nick-type count and nick-OCCURRENCE share (P(kind | gold occurrence)), enrichment E = P(kind | gold occurrence) / P(kind | any token), purity = share of
the kind's types that are nick types; the 40 most frequent and 40 seeded-random members are written out and READ by me to describe the kind in prose. Whatever cannot be scored
without a word list (software names, common nouns) is stated as READ, not scored.

## 4. K2 — do kinds differ in holographic signature? (IRC, readers = impact.mjs's three PRIOR-FREE readers, M = 256 messages, F = 0 causal)
Kind map = the DEV-induced K* partition (DEV days: the DEV-pool labels; CONF days: the CONF-pool forms assigned to DEV centroids). Forms below MINC in the pool are kind -1 (thin;
never a class).
- J (JOINT ablation, 2 windows per impact day): delete ALL tokens of kind c (classes with >= 20 token occurrences in the window); shadow = the 24 (family x type) counts of the
  non-unchanged slot deltas, as a distribution; direct/collateral split, imprint and amplification as in name-shape.mjs. RANDOM PARTITIONS OF THE SAME SIZES: the kind labels are
  permuted GLOBALLY among forms inside log2(pool count) bins (so sizes and frequency strata are kept and class identity persists across windows), 6 draws.
  J1 DISPERSION: per window, mean over pairs of present classes of (1 - cos(shadow_a, shadow_b)); paired difference real - mean(null draws) per window; one-sided, bootstrap over days
  (and sign count over windows). J2 REPRODUCIBILITY: the margin cos(c@w1, c@w2) - mean_{c'!=c} cos(c@w1, c'@w2) over window pairs, real vs null draws.
- S (SINGLE-token records, impactOfToken, A-DEL): per day, per assigned kind, 12 token occurrences drawn uniformly over occurrences (s >= 256, the form recurs >= 1 time in the token's
  causal window of 256 messages; gold name occurrences excluded). Record = 85-d IMPACT-SLOT + 19-d atmosphere. S1: leave-one-day-out nearest-centroid balanced accuracy of
  predicting the kind from the standardised record, versus a null that permutes kind labels within (day x log2 local-count bin) strata (200 draws) and versus a frequency-only classifier
  on [log1p local count, log1p day count] ; S2: per-kind slope of log1p(all changed slots) on log1p(local mention count), with a day-block bootstrap (1000) 95% interval, versus the pooled
  slope (the Simpson check: SIGN REVERSAL = a kind whose interval excludes 0 on the side opposite to the pooled slope).
- K2 HOLDS if J1 mean paired difference > 0 with the bootstrap lower bound > 0 AND S1 balanced accuracy > null q95 AND (record accuracy - frequency-only accuracy) >= 0.03 (SESOI).
  K2 FALSIFIED (kinds do not differ beyond random frequency-stratified partitions) if J1's lower bound <= 0 AND S1 <= null q95. A split verdict is reported with the clauses named.

## 5. K3 — kind-conditioned vs pooled, nicknames (IRC)
- POSITIVES: gold name occurrences, 4th-or-later occurrence of the form in its day, s >= 256, the form recurs >= 1 time in the causal 256-message window, kind assigned; up to 40 per day
  (seeded). The SAME positives are used for both arms.
- NEG-P (pooled): non-gold forms, count >= 3 in the day, not a nick type anywhere in the pool, matched on log2 day-count bin, any kind (including -1), same recurrence conditions.
  NEG-K (kind-mates): as NEG-P and additionally of the SAME induced kind as the positive's form; a positive without a matching kind-mate is dropped from the K arm only.
- SCORES (fixed directions: larger = more nick-like). COUNT = log1p(local mentions in the causal window) [the local mention count] and BURST (as name-rule-informal); S_ENTRY (the
  earlier scalar); REC = ridge-logistic leave-one-day-out CV (cvScores of name-war-and-peace.mjs: standardise, PCA-24 on the training fold, ridge) on the 104-d record.
  Conditioned model = REC fitted separately within each kind having >= 30 pairs in the other days (leave-day-out), scoring that kind's rows; pooled model = REC fitted on the P arm
  (all kinds) and scored on both arms. REC+COUNT adds [log1p local count, burst] to the feature vector.
- TESTS: T1 AUC of every score on the P arm and on the K arm (day-block bootstrap 95% interval, B = 1000; also a pair-level bootstrap, reported). T2 K-arm AUC(REC conditioned)
  minus AUC(COUNT), and AUC(REC+COUNT conditioned) minus AUC(COUNT): paired block-bootstrap difference. T3 AUC(REC conditioned, K arm) minus AUC(REC pooled, P arm) (does conditioning
  on kind help). Controls built to fail: label permutation of the positive class within day (B = 1000) for every AUC; sham ablation share of null signatures = 1; the same pipeline on
  company-shuffled text must give kind = noise (J1 and K arm collapse); a position control (log s) AUC in [0.45, 0.55] on the P arm.
- K3 HOLDS if on the CONF stage (and, separately, pooled over both stages): AUC(REC conditioned, K arm) >= 0.60 with bootstrap lower bound > 0.5 AND AUC(REC+COUNT cond.) - AUC(COUNT)
  >= 0.03 with lower bound > 0 (the full record adds beyond the local count). K3 is FALSIFIED if the K-arm AUC(REC cond.) lower bound <= 0.5 on CONF. The nick-landing claim (K1b) is separate.

## 6. Robustness on non-standard registers (small corpora)
nus-sms/en (units = contributor files concatenated per contributor), cosem (per conversation), one enron mailbox (induction pools all 10 mailboxes; impact on mailbox allen-p).
Same induction (MINC = 10), half-splits by document parity, same null. Characterisation by READING only (no gold: NOT SCORABLE: nouns of any type, names, software). K2-S only
(12 tokens per kind per document-window); K3 is not run (no gold). Windows M = min(256, 0.4 x stream length).

## 7. PREDICTIONS (blind; failures are reported as failures)
P1 K1 holds on IRC: gap(K*) >= 0.10; K* in [3, 12].
P2 NMI(kind, frequency decile) <= 0.5 at K* (the kinds are not only frequency bands). [uncertain: I expect 0.25-0.45]
P3 nicks concentrate: >= 50% of gold-occurrence mass in ONE kind c* with E >= 2.0; falsified if max kind share < 0.35 or E < 1.5.
P4 c* is not a pure nick kind: purity in [0.15, 0.60]; by reading, c* mixes nick handles with other rigid designators (software/package names, names of places/people) and is NOT
   made of ordinary common nouns. (qualitative clause judged by reading, stated as READ)
P5 K2-J1 passes (real dispersion > random frequency-stratified partitions) but with a small effect (< 0.05 cosine distance): kinds differ mostly in size/frequency, which the null keeps.
P6 K2-S1 beats the permutation null (q95) but record accuracy beats the frequency-only classifier by < 0.03 (the signature is largely local count).
P7 K3: nick-vs-kind-mate AUC(REC conditioned) >= 0.60 (nicks are separable from kind-mates), but AUC(REC cond.) - AUC(COUNT) < 0.03 (the full record does not beat the local count);
   AUC on the K arm (kind-mates) < AUC on the P arm (kind-mates are harder negatives). The user's guess (conditioning wins by a margin the count does not explain) is the rival; the
   falsifier of MY prediction is AUC(REC+COUNT cond.) - AUC(COUNT) >= 0.03 with lower bound > 0.
P8 S2 Simpson: NO sign reversal; every kind's slope of log1p(changed slots) on log1p(local mentions) is >= 0 and the pooled slope is positive.
P9 Small corpora: K1 holds on SMS, cosem and enron at some K in the ladder with gap >= 0.10; K* in [3, 12] on each; K2-S1 beats its null on each.
P10 Shuffled-company control: on company-shuffled IRC text, gap(K) < 0.10 for all K (K1 control built to fail).
K4 (word-order families) is NOT TESTED here: English only. Stated, not predicted.

# END OF PRE-REGISTRATION

# AMENDMENT A1 — dated 2026-10-06 (after the K1 curve and the K1b characterisation were read; BEFORE any K2/K3 row was read)
What was read first: induce.irc.json — K* = 24 (gap 0.030 < 0.10: the pre-registered K1 gap clause FAILS on IRC; the shuffled-company null is as stable as the real partition at K <= 8), the
held-out transfer ARI 0.47 vs null 0.09, NMI(kind, frequency decile) 0.24, and the nick landing table (nicks concentrate in kinds 9 and 6). No impact record has been read.
- A1.1 The K2/K3 collectors run on the K* = 24 partition as pre-registered (K1's gap failure is reported as a failure, the partition is not changed).
- A1.2 CONTROL ARM "NR" added for K3: for each positive, a negative that shares the positive's label under a RANDOM partition of the same sizes (frequency-stratified global label
  permutation, the same construction as the J-null) and the same log2 day-count bin. It answers: is a kind-mate harder than a frequency-matched random-partition mate? Scores: COUNT,
  S_ENTRY, REC pooled. It is collected by `signature.mjs --part control` (same positives as the single part: same seeds).
- A1.3 BURST (name-rule-informal's burstiness rival) is NOT computed (it needs the per-message history, not stored in the rows); COUNT = log1p(local mentions in the 256-message causal window)
  is the pre-registered main rival and is reported alone.
- A1.4 For the three small corpora the document bootstrap has one or two blocks: the J1 bootstrap interval is then degenerate and the verdict rests on the window sign count; stated in the report.
- A1.5 P3 is evaluated both ways, because the text did not say what is in the denominator: (a) over ALL gold occurrences (thin forms, count < MINC in the pool, are a class), (b) over gold
  occurrences of assigned forms only. Both are reported; the literal reading (a) is the one used for the pass/fail line.

# AMENDMENT A2 — dated 2026-10-06, written while the IRC single-token collection was still running (6 of 12 impact days finished) and AFTER a test run of analyse.mjs on those partial rows
Disclosure: that test run printed preliminary K3 numbers on 3 DEV + 3 CONF days (P arm AUC: COUNT 0.83, S_ENTRY 0.83, REC pooled 0.88; K arm: COUNT 0.66, REC pooled 0.75, REC conditioned 0.81 on 362 rows;
REC cond - COUNT +0.15). The pre-registered primary comparisons (REC cond vs COUNT; REC+COUNT cond vs COUNT) are UNCHANGED and are the verdict. A2 only ADDS stronger case-free rivals computed from the message stream (they were
named in A1.3 as not computed; I now compute them because the full-record model beat the one-number COUNT by a margin that a richer local-context model could explain):
- BURST = log((mentions in the last 16 messages + 0.5) / (form rate x 16 + 0.5)); COUNT4 = log1p(mentions in the last 4 messages); RECENCY = -log1p(messages since the previous mention of the form).
- LOCAL = ridge-logistic leave-block-out on [log1p local count, BURST, COUNT4, RECENCY] (pooled: fitted on arm P; conditioned: fitted within kind like REC_cond); RECLOCAL = REC features + LOCAL features.
- Extra tests: REC_cond - LOCAL_cond, RECLOCAL_cond - LOCAL_cond, REC_cond - BURST (paired block bootstrap). The reading of K3 is therefore two-tier: beats the pre-registered COUNT (tier 1), beats the added local-context rivals (tier 2).
- A2 extension (same date, before the final run): the LOCAL feature set also contains the within-message token position log1p(i) and the message length log1p(len): an ablation-free rival that knows only where in a
  message the token stands. (loc = [log1p count, BURST, COUNT4, RECENCY, log1p position, log1p message length]; BURST/RECENCY remain the scalar rivals reported on their own.)
