# ant-shape — PRE-REGISTRATION (written before the first real collection and before any analysis of a real record)

Swarm: kind-induction, 2026-10-06. Ant: ant-shape. Atom: the LEARNED SHAPE over the FULL single-token impact record
(sig 85 + atm 19 + span 32 + c 8 = 144 features, impact.mjs impactBatch) for proper nouns: does it exist, is it word-order-family
specific, does it survive on non-formatted text, is it company or counts.

Zero-model: no LLM in any code or score. Gold UPOS (UD DEV) is used ONLY to choose which tokens are positives / matched negatives and to
stratify the evaluation; no reader sees gold, no prior, no capital (streams are impact.mjs's case-stripped lowercase word units).
Learner: eval/law/name-war-and-peace.mjs fitLogit / predict / standardise / aucOf (ridge-logistic, lambda 1.0, IRLS 25 iterations, no
tuning anywhere). Arms wider than 24 features are projected to PCA-24 fitted on the TRAINING fold (docs/LAW-FALSIFICATION.md T5, as
cvScores does); arms of width <= 24 are used raw (standardised). The PCA never sees labels, so it is fitted once per fold and re-used under
label permutation (a speed device, identical in result to refitting).

## DISCLOSURE (what was seen before this header)
- eval/law/NAME-SHAPE-RESULTS.md (pooled PROPN shadow cosine 0.98 to random sets; no family specificity), NAME-RULE-RESULTS.md (IRC single
  scalar AUC 0.84 but a local count ties it; War and Peace 0.51), the War and Peace supervised run (fitted classifier on the whole
  signature AUC 0.75; 0.63 at first mention). I have NOT seen any learned-shape result on UD.
- Feasibility counts only, no impact record: per stem N (sentences), M, and the number of PROPN tokens whose form recurs >= 2 times in
  their causal window. Thin stems: arb 12, kor 10, swe 2 candidates (cannot support a test); rus 65, jpn 76, deu 89, pol 92, ukr 92.
- Timing smoke (6 English tokens, no analysis): impactOfToken is cheap (about 0.05 s/token), so the sample can be larger than the brief's 100.
- The IRC channel-days are the same six drawn by name-rule-informal.mjs (same seed, so comparable); I have read its aggregate result
  (S_ENTRY 0.84), not any record.
- The marks of the other ants at the time of writing: none (only boss vetoes). L5 reads them later, if present.

## DATA (every typed number is said, with its reason)
UD: 25 stems, DEV only (TEST splits are spent, never read). Windows M = min(128, floor(N/5)), causal window [s-M, s] (impact.mjs F=0).
Positives: PROPN tokens at s >= M whose form occurs >= 2 times in [s-M, s] (token included; the reader needs a recurrence).
Negatives: one NOUN/VERB/ADJ token per positive, at s >= M, same recurrence condition, matched on log2 whole-stream frequency of its form
(as eval/law/name-shape.mjs). Pairs: up to NPAIR = 200 (typed: cost is small, SE of an AUC at n=400 rows is about 0.03, the brief's 100 gives
0.04), at most 5 tokens per form per class (typed: stops one frequent name from dominating; relaxes by availability only: fewer pairs, never more tokens per form).
A stem is INFORMATIVE if it yields >= 60 pairs (typed: with 8 blocks that is >= 15 rows per block; it is also the L2 per-language training cap, so every
training language contributes the same number of pairs). Non-informative stems are reported as typed gaps and removed from every denominator
AND from every training pool. The brief's "15 of 25" (= 0.6) is applied as ceil(0.6 x informative) (for 22 informative stems: 14);
the literal count of languages meeting the per-language rule is also reported.
Per record stored: sig, atm, span, c, counts(72), isNull, noSlot, nTokenSlots, extent{tokens,frames,radius}, hash; causal rivals; position;
gold UPOS (evaluation only); form.
IRC: ubuntu/kubuntu/xubuntu/ubuntu-server channel-days (>= 1500 messages), six drawn with seed seedFor("name-rule-informal","irc"); nickname positives
(speaker-metadata gold, copied loadIrc rule) vs unlabelled forms matched on log2 count, 4th-or-later occurrence, M=256 messages, 300 LATER pairs
(typed: 50 per channel-day, cost small; the brief said 150).
SHUFFLED (L4): the same sampled tokens (tracked through the permutation) read after a within-sentence shuffle of the whole stream
(impact.mjs shuffleSentences on index-tagged tokens: marginals and sentence membership kept, order = company destroyed), for ALL informative stems and IRC.

## ARMS (all single-token, all causal, all fixed functions of the record, no gold)
FULL 144 | SLOT 85 | ATM 19 | SPAN 32 | C 8 | SHAPE24 = the 24 (slot family x delta type) counts summed over radius bands and divided by their sum (zeros when nothing changed)
(the representation of name-shape.mjs) | MAGNITUDE = [log1p(changed slots), log1p(extent.tokens), log1p(extent.frames), log1p(extent.radius), isNull] |
RIVALS (causal, no ablation): log1p window count before the token, log1p prefix count, log1p recency gap (sentences), log1p distinct window sentences,
burstiness log((last16+.5)/(prefixRate*16+.5)), log1p last16, log1p window frequency of left / right neighbour word, distinct-left / distinct-right
share among earlier window occurrences, same-left / same-right share (company-lite), sentence-initial, sentence-final flags, log1p sentence length,
log word length | FULL+RIVALS (FULL -> PCA-24 on the training fold, RIVALS appended raw, standardised) | POSITION (control) = [log1p(s), s/N, quartile one-hot x3].

## TESTS
L1 own language. Blocks = 8 contiguous position blocks of s over [M, N) (typed: ~50 rows per block); leave-one-block-out CV; AUC pooled over out-of-fold
scores per arm; permutation null: labels permuted within blocks, B = 200, the null of the 22-language mean is built draw-by-draw (draw b uses permutation b in every
language); also per-language q95. SECONDARY check A2: blocks = hash(form) mod 8 (leave-forms-out; identity leakage check).
L2 family transfer. Target language t (informative), train FULL on OTHER informative languages, excluding the same-language twin (cmn<->cmn-hans, hin<->urd; typed:
the same language in another script is not another language), pooled, each language capped at 60 pairs (seeded subset), same-family vs other-family pools EQUALISED to
k = min(#same-family candidates, #other-family candidates) languages; the side with the larger pool is sampled (seeded, 20 draws, averaged), a side equal to its pool is one fit.
Families are RECOMPUTED from priors/role-config-*.json by the name-shape k-means (K=3) and must reproduce the brief's clusters. Primary scheme: SOV-like vs merged SVO-like;
secondary: the 3 clusters (other = the union of the other two clusters). Report per language AUC(same), AUC(other), AUC(all-others, cap 60 pairs each, not equalised), mean difference
with a bootstrap-over-languages interval, the count same > other and the one-sided binomial sign test. Secondary L2z: each training language and the target standardised by
its own mean/sd (label-free adaptation). Secondary L2b: model-free shape-vector similarity: v_l[j] = AUC_j - 0.5 of each of the 144 features within language l (position-block
free, all rows); mean Pearson correlation of v between same-family language pairs minus other-family pairs (twins excluded), one-sided label-permutation p (B = 10000).
L3 cross-register. (a) UD-eng -> IRC; (b) all informative UD (cap 60 pairs each) -> IRC; (c) IRC leave-one-channel-day-out CV with within-file label permutation null (B=200);
(d) IRC -> UD-eng; secondary: (e) all UD except eng -> IRC, (f) 6 SOV-like vs 6 SVO-like (equalised, 20 draws) -> IRC and -> UD-eng (family test across a register shift:
English chat belongs to the SVO-like family), (g) per-corpus z-scoring variants of a-d. Transfer null: the target labels permuted (B = 200), q95.
L4 company shuffle. FULL own-language CV AUC on the shuffled stream, same tokens, per language and IRC; the paired drop real - shuffled; compare with the L1 permutation q95.
L5 kinds. Read marks of ant-kinds-ud / ant-kinds-chat when I get there; if they published a per-form kind label, test (i) FULL + kind one-hot, (ii) per-kind models vs pooled, and
report sign reversals of per-class (PROPN vs NOUN / VERB / ADJ) AUC. Not waited for.
Descriptive extras (no verdict): A6 per negative class (PROPN vs NOUN, vs VERB, vs ADJ) AUC from the single FULL out-of-fold scores; A7 univariate AUC of each feature pooled over
languages, sign consistency across languages (which components carry the shape); A8 per-arm table for all languages.

## VERDICTS (SESOI 0.03 AUC, a bare provisional number inherited from the repo)
V1 LEARNED SHAPE EXISTS: FULL L1 AUC >= 0.60 in >= ceil(0.6 x informative) informative languages AND the mean FULL AUC exceeds the q95 of the permutation null of the mean.
V2 FAMILY-SPECIFIC: mean(same - other) >= 0.03 AND same > other in >= ceil(0.6 x informative) languages AND one-sided sign p <= 0.05 (primary 2-family scheme).
V3 REGISTER-ROBUST: UD-eng -> IRC AUC >= 0.60 and above the transfer-null q95.
V4 REPRESENTATION MATTERED: mean(FULL - SHAPE24) >= 0.05.
V5 BEYOND RIVALS: (FULL+RIVALS - RIVALS) >= 0.03 in >= ceil(0.6 x informative) languages (the mean difference and a language-bootstrap interval are also reported).
V6 COMPANY-DEPENDENT: mean(real FULL - shuffled FULL) >= 0.03; it COLLAPSES if the mean shuffled AUC is below the L1 permutation q95, it is PARTIAL if it stays above it.
Controls built to fail: POSITION must be in [0.47, 0.53] on average (K4); the permutation null (K2); the company shuffle (V6); K1 sham ablation (40 tokens, 100% null signature);
K6 determinism (40-token re-collection reproduces every hash); A2 identity-leakage check. A control that fails is reported as a failure of that arm's licence.

## FALSIFIERS (stated before running)
V1 is FALSIFIED if FULL >= 0.60 in fewer than the required share of languages or the mean does not clear q95 -> there is no learned single-token shape beyond noise in this record.
V2 is FALSIFIED (as 'not shown') if the mean difference is < 0.03 or the sign test p > 0.05 -> a word-order-family-specific shape is not detectable by transfer.
V3 is FALSIFIED if UD-eng -> IRC < 0.60 -> the shape learned on well-formatted text does not carry to chat.
V5 is FALSIFIED if FULL+RIVALS adds < 0.03 in too many languages -> whatever FULL learns, the rivals already hold.
V6: if the shuffled mean AUC is within 0.03 of the real one the signal is counts, not company.

## PREDICTIONS (blind; my honest priors; the orders are the claims)
P1 FULL >= 0.60 in 10-17 of the ~22 informative languages (point guess 13); mean FULL AUC 0.60 (0.56-0.66). V1 true with probability about 0.5.
P2 Mean FULL clears the permutation q95 (about 0.52 for a mean of 22): yes, 0.9.
P3 POSITION mean in [0.47, 0.53]: yes, 0.85.
P4 FULL - SHAPE24 >= 0.05 (V4 true): 0.7. SHAPE24 mean around 0.55.
P5 MAGNITUDE within 0.03 of FULL: 0.6 (size, not shape, carries most of what is learned).
P6 V5 fails (RIVALS already hold it): FULL+RIVALS - RIVALS mean about +0.01; the count with >= +0.03 below the threshold: 0.7.
P7 V2 fails: mean(same - other) in [-0.02, +0.02], same > other in 10-14 languages: 0.75. L2b correlation gap p > 0.05: 0.75.
P8 V3 partial: UD-eng -> IRC in [0.50, 0.60): 0.55; all-UD -> IRC similar; IRC LOFO >= 0.65: 0.7; IRC -> UD-eng in [0.48, 0.58].
P9 V6 partial collapse: real - shuffled >= 0.03: 0.65, shuffled mean still above q95: 0.5.
P10 Form-block CV within 0.03 of position-block CV: 0.7.
P11 K1 sham 100% null: 0.98. K6 determinism 40/40: 0.98.
P12 Simpson check (A6): |AUC(PROPN vs VERB) - AUC(PROPN vs NOUN)| >= 0.05 on average over languages: 0.5.
P13 The brief's headline: shape exists weakly, family effect < 0.03, register transfer partial.

## ANALYSIS RULES
No threshold, arm, block count or draw count is changed after the first real record is read. A second round is a dated amendment on fresh held-out data
(FOLD fold80B, or other channel-days). Every typed number above is said with its reason. The header hash is in PREREG.sha256 (sha256 of this file up to the END marker).

<!-- END OF PRE-REGISTRATION -->
