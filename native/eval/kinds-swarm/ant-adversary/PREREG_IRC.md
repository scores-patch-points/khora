# ant-adversary PREREG_IRC (2026-10-06, written BEFORE any run of build_irc.mjs; supersedes my Phase 1; PREREG.md for UD-kinds is shelved, see CRITIQUE.md)

QUESTION (coordinator, priority 1): does ANY single-token impact signal for IRC nicknames survive when negatives are matched on message position?
Known before this header: boss correction (92.1% of nick mentions message-initial vs 9.3% of tokens); ant-shape: initial-only rival 0.918, non-initial UD->IRC 0.58-0.67 (34 positives).
I have not read any IRC token through any impact instrument. Counting of days only (message counts in file headers).

DATA (fresh): ubuntu-irc days, lang en, NOT in results/name-rule-informal.irc.json gold.files, NOT among ant-kinds-chat's 12 impact days
(ubuntu 2005-03 2005-07 2006-03 2006-07 2007-03 2008-03 2008-07 2010-03 2010-07 2012-03 2012-07 2013-03). Set A = 10 days drawn (seedFor("adv-irc","A")) from the 15
fresh days with >=1500 messages (their text was in ant-kinds-chat's INDUCTION pool, never read by an impact instrument). Set B = all 12 short days (600-1499 messages), never
eligible for any ant. Gold = the loadIrc rule of name-rule-informal.mjs (nick forms speaking >=3 messages, length>=3, not a topic word (>=1/300), not the speaker); metadata only.
READING: impact.mjs impactBatch, M=256 messages, F=0 (frame-causal), A-DEL, prior-free readers, lowercased word units, no punctuation, no capital, no kind, no prior.

ELIGIBLE token: message index s >= 256; the form occurred earlier inside [s-256, s] (earlier in the same message counts); form day-count >= 3.
Positives: gold name occurrence. Negatives: eligible token whose form is not a nick form of that day.
MATCHING (inside each day, exact): positive and negative share (a) message-initial status (i==0), (b) token-index bucket {0,1,2,3-4,5-8,9+}, (c) log2 day-count bin of the
form. Empty cell -> relax (c) to +-1 bin inside the same (a,b); else drop (reported). <=10 occurrences per form per class per day; controls without replacement.
Two samples per day, strata drawn separately: INIT (positives with i==0): quota 40 pairs/day (A) / 12 (B); NONINIT (i>0): same quotas.
POOL = INIT union NONINIT (balanced 50/50; also reported with weights 0.92/0.08 = the natural mixture, weighted AUC). STRICT = pairs whose window-mention bins {1,2,3+} also agree.

SCORES (fixed direction, larger = more name-like): S_ENTRY, S_OWN, S_ALL, S_SPAN (name-rule-informal definitions, from the record).
RIVALS (causal): R_LOCAL log1p(mentions in window), R_BURST log((mentions in last 16 + .5)/(rate*16 + .5)), R_RECENCY -log1p(messages since last mention), R_MSGLEN log(message
length in tokens), R_IDX token index, R_FREQ log(day count) (matched by design), R_POSMSG message index (position control).
FITTED (ridge-logistic IRLS lambda 1, standardise, PCA-24 on train when wider; leave-one-DAY-out; the learner exported by name-war-and-peace.mjs): F_IMP = sig(85)+atm(19);
F_FULL = + span(32)+company(8); F_RIV = [log1p nwin, burst, recency, log len, idx, log dayCount]; F_RIVIMP = F_RIV + F_IMP; F_POS = [idx, idx==0, log len].
Statistics: AUC with day-block bootstrap (B=1000), within-pair label-flip null (B=1000, applied to out-of-fold scores), increment AUC(F_RIVIMP)-AUC(F_RIV) with day bootstrap
and a fit-level permutation null (labels flipped within pair, whole CV re-run, B=50) on POOL. All reported separately for INIT, NONINIT, POOL, STRICT, for A, B and A+B.
CONTROLS BUILT TO FAIL: C1 within-pair label flip; C2 company shuffle (shuffleSentences inside each message, the same token relocated by occurrence ordinal; kept labels): a
company signal collapses; C3 sham ablation (100 rows, must be 100% null); C4 determinism (30 rows); C5 F_POS and R_POSMSG: with matching, F_POS must be in [0.45,0.55] on INIT
and NONINIT (else matching failed and every AUC is suspect); C6 K5 licence: positives' non-null share >= 0.5.

PREDICTIONS (blind; I expect the confound to explain most of it):
P1 matching works: F_POS in [0.45,0.55] on INIT and on NONINIT (A).
P2 INIT: F_IMP AUC in [0.50, 0.60] (vocative initial positions leave the same slot trace as other initial words) and does NOT beat F_RIV by >= 0.03.
P3 NONINIT: F_IMP AUC in [0.55, 0.68]; S_ENTRY in [0.52, 0.65]; local mention count R_LOCAL ties or beats it.
P4 increment F_RIVIMP - F_RIV < 0.03 (lower bound <= 0) in INIT; in NONINIT it is in [0, 0.05] and not significant after the fit-level null.
P5 pooled (natural weights) S_ENTRY drops from 0.84 to <= 0.65.
P6 shuffle collapses F_IMP in NONINIT to within 0.05 of 0.5 on at least one of A/B (company-dependent) -- I predict it only DROPS (counts survive).
P7 Set B reproduces Set A within 0.05 on every arm (sign agreement).
P8 sham 100% null; determinism 30/30; K5 passes.

VERDICT RULES (SESOI 0.03 AUC, the repo's bare number): "NAME SIGNAL SURVIVES POSITION MATCHING" in a stratum iff F_IMP >= 0.60, day-bootstrap lower bound > 0.5, > the C1 q95,
AND increment over F_RIV >= 0.03 with lower bound > 0 AND the shuffle drops it by >= 0.03. "SURVIVES BUT NOT BEYOND RIVALS" iff the first three hold and the increment fails.
"DOES NOT SURVIVE" iff F_IMP lower bound <= 0.5 or F_IMP <= F_RIV - 0.03 with no increment. Rules fixed now; no retuning after a result.
