# ant-adversary PREREG_IRC amendment A1 (2026-10-06, written BEFORE build_irc2.mjs was run; fresh data = Set A2)

WHY. PREREG_IRC.md's own control C5 (position-only arm F_POS in [0.45,0.55] after matching) is a licence for every IRC AUC. A DEBUG run of analyse_irc.mjs on 19 of 22 built
days (partial, plumbing check, rows read) showed F_POS about 0.68 on INIT and 0.61 on NONINIT, i.e. matching on (initial, token-index bucket, log2 frequency) leaves
message LENGTH (positives sit in longer messages), local mention count and recency unmatched (class means: log length 2.15 vs 1.51; log window mentions 1.71 vs 1.26; mentions in
the last 16 messages 1.9 vs 0.9; log gap 1.95 vs 3.2 on INIT). I have therefore seen that the first-round matching is too weak. The first-round full analysis (Sets A, B) is
reported as pre-registered, with its C5 failure stated; this amendment is a SECOND ROUND on fresh days, not a re-read of the first.

SET A2 = the five fresh days with >=1500 messages that Set A did not draw: ubuntu/2007-07-15, ubuntu/2009-03-15, ubuntu/2013-07-15, kubuntu/2007-03-15, kubuntu/2007-07-15 (none read
by any impact instrument by any ant; ant-kinds-chat's induction pool contained their text).
MATCHING (exact, inside each day, per stratum INIT / NONINIT): (a) initial status, (b) token-index bucket, (c) log2 day-count bin, (d) message-length bucket {1,2,3-4,5-8,9-16,17+ tokens},
(e) window-mention bin {1,2,3+}, (f) recency bucket by messages since the last mention {0-1, 2-4, 5-16, 17+}. Empty cell -> relax (c) to +-1; else drop (reported). Quota 80 pairs
per stratum per day. Everything else (eligibility, gold, reader, M=256, F=0, rivals, learners, leave-one-day-out, C1-C6, SESOI 0.03, verdict rules) is PREREG_IRC.md unchanged.
Additional rival (now matched, so expected near 0.5): all six R_ scalars remain reported.
PREDICTIONS A1 (blind): Q1 C5 passes (F_POS in [0.45,0.55]) on INIT and NONINIT. Q2 F_IMP falls from the first-round level by >= 0.10 on INIT and stays above 0.55 on NONINIT.
Q3 increment over F_RIV < 0.03 on INIT; NONINIT increment in [0, 0.06]. Q4 shuffle drops F_IMP to within 0.06 of 0.5 on NONINIT STRICT-like rows (company dependence). If Q1 fails again the
verdict is UNDERPOWERED(matching): no IRC claim survives.
