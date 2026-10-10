# ant-production PREREG (CONTAMINATED arm: the production reader carries a POS prior, a frame prior and an ear)
Written 2026-10-06 BEFORE the first run of tok.mjs. Header (this file down to "END HEADER") is hashed into PREREG.sha256.

## Disclosure (what was seen before this header)
Two cost/shape probes only, no ablation: one 128-sentence window (middle of War and Peace, middle of English UD DEV) read in each arm.
Seen: referents real=16/20, company(pos only)=2/3, deranged=48/38 (junk: could, the, but, you), null (no prior)=0/0; relations null=36/35
(relations exist without any prior), real=121/84; a read costs ~0.15-0.25 s. The earlier probe eval/law/results/name-war-and-peace-real.json
(names changed the referent index 0.40 vs 0.05 for frequency-matched common words; REAL features add nothing over frequency) was read before.

## What is measured (per ablated TOKEN, frame-causal: window = the M sentences before the token's sentence plus that sentence; one token deleted)
Read the window twice through readProd (lib.mjs; one read gives referent index AND relations), once as is, once ablated.
Record: ownExists (token is a word of a base referent's surface), ownMentions, ownDelta (mentions lost by that referent), nOwn;
refChanged / refAbs (OTHER referents whose mention count changed; sum |delta|), refBorn, refLost (others); relLost, relBorn (multiset difference of
relation|participant-surface keys), relRebound (sum over labels of min(lost,born)), relCollateral (lost+born keys not containing the token word);
kinds: the reader's own kind standing (organs/kind-standing.js discoverCompanyKinds over the window, floors minMentions 2 / minShare 0.3 / minMembers 2 =
what adapters/text/recursive.js passes to heardSurfaces): kindSig of the token's word, nKinds before/after, kindFlips = words (other than the token)
whose kind signature changed under the ablation.
Arms: real (pos+frame), company (pos only: the heardSurfaces/kind-standing tier), deranged (scramblePrior of r3-beings: pos class vectors deranged among
forms, frame distributions among frame keys, Sattolo seed 20261006), null (no prior), shuffle (real reader on within-sentence shuffled text: company destroyed).
## Sample (same units in every arm)
NAME = occurrence whose gold flag is set (War and Peace: cast forms of the 48-referent hand-verified list minus forms shared by >=3 referents;
IRC: nick of a speaker with >=3 messages that day, speaker different, not a topic word; fas: PROPN). CONTROL = occurrence of a form that is not NAME and
(wp, irc) is settled NOUN by the shipped English prior used as a LABEL tool only (fas: UPOS NOUN). LATER = 4th occurrence onwards, window inside its document.
Each NAME occurrence is paired with a control matched EXACTLY on: log2 bin of the form's corpus count, position stratum (i=0 / i=1 / i=2-3 / i>=4),
last-in-message flag, glued-punctuation-after flag (new: user/boss correction 2026-10-06, IRC nick vocatives are message-initial). Pairs with no match are dropped
and counted. Types drawn uniformly (not by frequency). N pairs: wp 100, irc 60, fas 60 (typed; cost-driven).

## Analyses and the leave-block-out learner
Learner: eval/law/name-war-and-peace.mjs cvScores (ridge-logistic, lambda 1, standardised, leave-one-block-out) unchanged; blocks = 10 position blocks (wp, fas),
the channel-day (irc). Feature arms: REAL=[ownExists, log1p ownMentions, log1p refAbs, log1p refBorn+refLost, log1p relLost, log1p relBorn, log1p relCollateral,
kindFlips]; FREQ=[log1p earlier mentions in window, log1p recency gap, log1p window DF]; POS=[i, i==0, last, len] (control: ~chance by matching);
KIND=one-hot of the reader's kindSig (kinds with >=8 occurrences, else "other") plus the token's before=^ share in the window; COMPANY-LITE=log neighbour counts.
Pooled: AUC(REAL), AUC(REAL+FREQ+POS) - AUC(FREQ+POS), bootstrap over blocks (B=1000). Kind-conditioned (K3): AUC(FREQ+POS+KIND), AUC(REAL+FREQ+POS+KIND)
(kind main effect) vs CONDITIONED = the same model fitted separately inside each kind stratum (strata with >=12 rows; others pooled) - the Simpson check also reports the
sign of the within-kind NAME-minus-CONTROL difference of ownDelta and relLost per kind against the pooled sign.
Kind signature (K2): between-kind variance of {ownExists, refAbs, relLost, relCollateral, kindFlips} against 1000 permutations of the kind labels within
the matched-pair strata (log2 count bin x position stratum).
CONTAMINATION CONTROL: every number above repeated in arms deranged and null (and shuffle on the first 60 pairs); SURVIVAL = (AUC_arm - 0.5)/(AUC_real - 0.5)
for REAL features, and the same for the name-vs-control non-null share gap. A separation that is not in deranged/null is the prior's and not the field's;
a separation that is in the shuffle arm is counts, not company.
## Predictions (blind) and falsifiers
P1 (wp, real) names change the referent index more often than the matched controls: non-null share gap >= +0.15 (the 0.40 vs 0.05 of the earlier probe survives position matching).
   FALSIFIED if gap < 0.15 or the controls are not matched (K4: POS arm AUC outside [0.45, 0.55]).
P2 (wp) SURVIVAL in deranged <= 0.35 and in null <= 0.15 (the prior, not the field, makes the index): FALSIFIED if deranged SURVIVAL > 0.5.
P3 (wp) REAL adds < 0.03 AUC over FREQ+POS (field adds nothing beyond rivals): FALSIFIED if the lower bootstrap bound of the gain is > 0 and the gain >= 0.03.
P4 kinds differ in signature (K2) in the real arm (p < 0.05 on >= 2 of 5 statistics) but NOT in deranged (<= 1 of 5): FALSIFIED if they also differ in deranged.
P5 kind-conditioning (K3) does not beat the kind-main-effect model by 0.03 AUC; no sign reversal (Simpson) between kinds on ownDelta/relLost.
P6 (irc, position-matched) the nick AUC of REAL falls to <= 0.58 (the 0.84 was position); FALSIFIED if >= 0.65.
P7 (fas) the production reader separates names by the prior's grammar (real AUC >= 0.60) and deranged survival <= 0.35; a different word order does not change the ordering of arms.
Typed numbers (said once): SESOI 0.03 AUC; M wp 128 / irc 256 / fas 128; B=1000; kind floor 8 occurrences; stratum floor 12 rows; permutations 1000; derangement seed 20261006.
END HEADER

## AMENDMENT A2 (dated 2026-10-06, written AFTER ana.mjs/ana2.mjs were read on the round-1 wp arms (real, deranged, company, null; shuffle 87/200) and fas arms; BEFORE any A2 run)
Round 1 showed (reading these, so they are NOT predictions of A2): wp REAL-feature AUC real .684, deranged .711, company .594, null .371, shuffle .680; FREQ+POS .725;
REAL adds -0.013 (CI -.036..+.008) to FREQ+POS in every arm. 85% of NAME tokens are UNSEEN by the English POS prior and 100% of the CTL tokens are seen (the controls were
chosen by that very prior): prior-vocabulary coverage separates the classes (AUC of "seen" alone .075 inverted). Deranging keeps the SET of forms, so it does not remove
coverage. fas round 1: only ~10% of both classes are referents (tokens are not recurring inside the 128-sentence window: deaf by the floor of two mentions).
Round 1 stays as run and reported. A2 is a FRESH sample (seed tag "A2") with the matching extended:
 - match also on the window-prefix mention class wc = min(3, earlier mentions of the form inside the window) and REQUIRE wc >= 1 (hearable: floor 2 incl. the token);
 - wp gets TWO controls per name: CTL-S = prior-settled NOUN (seen, as round 1) and CTL-U = a form the English prior has NOT seen, not in the cast, count >= 5, written with a
   capital in <= 1% of >= 3 non-initial occurrences (a LABEL use of capitals, never read by any reader: the text is lowercased; the earlier probe's labelBook does the same);
 - fas: CTL = gold NOUN, hearable-matched (60 pairs); irc: NOT repeated in A2 unless time allows (cost), round 1 irc stays the pre-registered design;
 - names are drawn afresh (100 wp names, 60 fas names).  Arms real, deranged, company, null (+shuffle on wp if time).  Same record, same learner.
A2 predictions (blind to A2): A2-1 NAME vs CTL-S: REAL adds < 0.03 to FREQ+POS+WC in every arm (round 1 pattern holds once window count is matched).
A2-2 NAME vs CTL-U (both unseen, so coverage cannot separate): REAL-feature AUC in the real arm in [0.50, 0.62] and deranged SURVIVAL <= 0.35 (P2 retested fairly);
FALSIFIED if the real arm AUC >= 0.65 with a lower bootstrap bound > 0.55 and the deranged arm keeps >= 0.5 of the excess.
A2-3 fas hearable-matched: REAL-feature AUC in [0.45, 0.60] in the real arm (the Persian grammar prior hears no name/noun difference at this grain).
A2-4 ownExists share NAME - CTL-U in the deranged arm <= 0.10 (no coverage difference, no frame information); in the real arm the gap is the frame prior's and may be larger.
END A2

## AMENDMENT A3 (dated 2026-10-06; written after ana.mjs/ana2.mjs on irc round 1 real+null (120 units) and wp A2 partial NOT read; before any A3 run)
Read: irc round 1 (position+corpus-count matched): REAL-feature AUC .836, FREQ+POS .888, "seen" AUC .017 (97% of nick tokens are unseen by the English prior vs 100% of controls), FREQ_n alone .91
(window-prefix count differs hugely between nicks and corpus-count-matched nouns), null arm relation-only AUC .645. So P6 (<= .58) is already FALSIFIED in round 1 and reported so.
A3 = irc repeated with the A2 matching: 30 nick names, each with CTL-S (prior-settled NOUN, seen) and CTL-U (unseen, non-nick, count >= 5, apostrophe-free; capitals unusable in irc, so positive-unlabelled noise
is possible and is stated), all matched exactly on corpus-count bin, position stratum, last/punct flags and a FINE window-prefix class wc = 1 + min(4, floor(log2 n)) (n >= 1 earlier mentions in the window).
Arms real, deranged, null. Predictions: A3-1 FREQ+POS AUC <= 0.62 (window count matched: FREQ_n alone <= 0.62); A3-2 REAL adds < 0.03 to FREQ+POS in every arm; A3-3 NAME vs CTL-U REAL-feature AUC in the
real arm <= 0.62 and deranged survival <= 0.35.  FALSIFIED if REAL adds >= 0.03 with a lower bootstrap bound > 0 against FREQ+POS in the real arm and not in null. (30 names: low power, said now.)
END A3
