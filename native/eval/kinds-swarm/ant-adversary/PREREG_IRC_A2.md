# ant-adversary PREREG_IRC amendment A2 "char" (2026-10-06, written BEFORE build_irc3.mjs was run; Set C)

WHY. Reading impact.mjs::windowFigures: a token is a FIGURE (the only thing that can fill a slot) iff it recurs >= 2 times in the window AND its length >= wordFloor(token, 3) characters.
The IRC gold (loadIrc rule) requires nick form length >= 3, so every positive passes the floor, while the first-round and A1 negatives were drawn from ALL forms (i, a, ok, no, is, so, to, it ...), which
the reader can never see as figures: their ablation is null by construction. Evidence from my own rounds: matched negatives' non-null signature share 0.41-0.62 vs 0.74-0.83 for positives; and an EXPLORATORY post hoc
filter on Sets A and A2 (pairs where both forms have >= 3 characters and the same character-length bucket {3,4,5,6-7,8+}) keeps only 16% of the A2 pairs and moves F_RIV, R_LOCAL, F_POS to ~0.5 while F_IMP stays
0.67 (INIT) / 0.79 (NONINIT) on 60/68 pairs in A2 and the company shuffle takes it to 0.52 / 0.51. That is a post hoc subset (exploratory); this amendment is its CONFIRMATION on days never read by me.
First-round (A,B) and A1 (A2) results are reported as pre-registered; they carry this length confound. None of the numbers of this amendment have been seen.

SET C = 8 days drawn (seedFor("adv-irc","C")) from the 16 days used earlier by OTHER ants (the boss's six name-rule-informal.irc.json files; ant-kinds-chat's twelve impact days; union 16, >=1500 messages).
Their records are NOT reused; the days are fresh to my rules (none of my rounds read them). Flagged as such: not fresh to the swarm.
MATCHING, per stratum INIT / NONINIT inside each day. Negatives must have >= 3 characters. Tiers, first that finds a free negative: T1 exact on (token-index bucket, log2 day-count bin, character-length bucket {3,4,5,6-7,8+},
message-length bucket {1,2,3-4,5-8,9-16,17+}, window-mention bin {1,2,3+}, recency bucket {0-1,2-4,5-16,17+}); T2 drop recency; T3 additionally window-mention bin +-1; T4 additionally count bin +-1; else the pair is
dropped. Tier shares, drops and standardised mean differences (SMD) of all covariates are reported. <=10 occurrences per form, 60 pairs per stratum per day.
Everything else is PREREG_IRC.md unchanged (M=256, F=0, A-DEL, arms, leave-one-day-out ridge CV, day bootstrap B=1000, within-pair flip null B=1000, fit-level null B=50, SESOI 0.03, C1-C6).
C7 (new licence): all |SMD| < 0.10 AND F_POS, R_LOCAL, R_BURST, R_RECENCY, R_MSGLEN, R_IDX, R_FREQ in [0.45,0.55] on INIT and on NONINIT; else UNDERPOWERED(matching) and no verdict.
PREDICTIONS (blind): R1 C7 passes. R2 INIT F_IMP AUC in [0.60,0.72], NONINIT in [0.65,0.82]; both lower bounds > 0.5 and above the flip q95. R3 increment over F_RIV >= 0.03 with lower bound > 0 in both strata.
R4 company shuffle takes F_IMP below 0.58 in both strata. R5 non-null signature share of negatives rises to within 0.15 of positives' (the length artefact removed). R6 winner's curse: the confirmatory
F_IMP is at least 0.03 below the exploratory A2-subset values (0.668 INIT, 0.787 NONINIT). VERDICT RULES: PREREG_IRC.md (survives / survives but not beyond rivals / does not survive) per stratum, with C7 as a licence.
