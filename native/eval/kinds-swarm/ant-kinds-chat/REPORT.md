# ant-kinds-chat — kind induction in non-standard English (IRC / SMS / cosem / enron)

Pre-registration: PREREG.md (header sha256 0b7ebeba45da9ec1a28d91472b1f4437f7ede987aa2eca565e12541ae8fb2878, written before any run; amendment A1 appended, dated, before any K2/K3 row was read).
Code: lib.mjs (loaders, company vectors on integer ids, randomized PCA, spherical k-means, ARI/NMI), induce.mjs (K1, K1b), signature.mjs (collector for K2/K3), analyse.mjs (analysis).
Raw outputs: results/ (induce.<corpus>.json/.log, kindmap.<corpus>.<dev|conf>.json, kinds.<corpus>.<dev|conf>.txt = the samples I READ, rows.*.jsonl, analysis.*.json).
Instrument checks: my integer-id company vectors equal kind-standing.js contextVectors exactly (0 mismatches over 863 features of 25 forms); sham ablation gives 100% null signatures (IRC day 0, SMS, cosem, enron);
determinism 15/15 in every corpus. No gold, no POS, no capital, no word list entered the induction, K selection or any score. Gold (IRC speaker field) is used only to describe kinds (K1b) and as the K3 positive class.

## 0. Plain-language summary
(see section 8; predictions with outcomes in section 7)

## 1. K1 — are there company-induced kinds? (IRC, DEV pool = 14 channel-days, 782k tokens; CONF pool = 17 channel-days)
Method (fixed in PREREG): form vectors = sqrt counts of before=/after= tokens (^ and $ their own tokens), mean-centred, L2-normalised, randomized PCA to 48 dims, spherical k-means;
K ladder 2..24; number of kinds derived as the K maximising [half-split ARI of two independently clustered halves of the DEV days] minus [the same under within-message-shuffled text, 4 draws, max].

| K | half-split ARI real | shuffled-company null (max of 4) | gap |
|---|---|---|---|
| 2 | 0.766 | 0.798 | -0.032 |
| 3 | 0.722 | 0.747 | -0.025 |
| 4 | 0.577 | 0.690 | -0.114 |
| 6 | 0.385 | 0.543 | -0.158 |
| 8 | 0.349 | 0.404 | -0.055 |
| 12 | 0.326 | 0.296 | +0.029 |
| 16 | 0.281 | 0.277 | +0.004 |
| 24 | 0.271 | 0.241 | +0.030 |

K* = 24 (largest gap), gap 0.030 < SESOI 0.10. **The pre-registered K1 gap clause FAILS on IRC (P1 FAILED).** The shuffled-company null is as stable as the real partition at every K <= 8: a
within-message shuffle keeps the message-level bag of words, the length and the frequency, so its clusters are stable frequency/bag bands. Independent clusterings of two halves of a continuum
at K=24 agree at ARI 0.27, no more than a frequency-preserving null does. I did not retune.

Evidence that points the other way (reported, but it is NOT the pre-registered pass line):
- Frozen-basis TRANSFER to the CONF channel-days (never used for induction): the DEV partition's label of a form vs the label assigned from its CONF-pool company (1993 shared forms): ARI 0.474 vs 0.09 on shuffled CONF (4 draws, 0.091-0.097). Independent re-induction on CONF vs the transferred labels: ARI 0.511 vs 0.15-0.18 null. The shuffled null of the transfer test is weak (shuffled vectors project to a few centroids), so this is a lower bar than the half-split.
- NMI(kind, log2-frequency decile) = 0.24 (<= 0.5, P2 holds); ARI with K* equal-size frequency bands = 0.06: the kinds are not frequency bands.
- The kinds are linguistically coherent (section 2).
Verdict K1 (pre-registered composite): NOT SHOWN — the half-split gap clause fails; the structure replicates across held-out channel-days at ARI ~0.5 but cannot be told apart from a message-bag null by half-split stability.
P10 (shuffled company: gap < 0.10 everywhere) is trivially true and uninformative in this form: the shuffled text IS the null.

## 2. K1b — what the 24 IRC kinds are, and where the nicknames land (characterised AFTER induction by READING samples; kinds.irc.dev.txt / kinds.irc.conf.txt)
My reading of the DEV kinds (kind id: top members; the id order is by token mass; the same ids carry the same centroids on CONF):
- 0 function words that take a clause/NP complement (to is you and in that for on of but not with what if how or so there no are from ...); 1 determiner/pronoun-like words PLUS product names that follow a preposition (the it a ubuntu my this your linux sudo windows apt gnome grub kde firefox ...);
  2 base-form verbs (have do get be install use know see try need run boot ...); 3 modals/auxiliaries (can don't will anyone should would could ...); 4 singular count nouns after "the/a/my" (file problem command package server error drive kernel driver ...);
  5 discourse particles/replies (me help ok thanks yes please sure sorry lol ...); 7 -ing/-ed participles after be (installed trying running working ...); 10 prenominal modifiers (same wireless wiki live best old main audio ...);
  11 abstract/mass nouns after "the" (community cache kind archive permission step speed ...); 12 plural nouns (problems ideas issues options errors apps partitions ...); 13 past/perfect verbs after I (had thought seem made believe downloaded ...);
  14 adjectives/noun-modifiers after "a" (lot few little non big radeon ...); 15 gradable adjectives (good new much very better different hard ...); 16 base verbs after to/can (figure turn learn send allow ...); 18 3sg verbs (seems worked looks shows ...);
  21 -ing forms (reading, making, thinking ...); 19 SOFTWARE/PACKAGE names (php sh vlc samba gedit gparted python pulseaudio gtk xfce totem apache virtualbox amarok pidgin skype ...; signature before=showthread/install/use/using);
  20 release names, paths and file-system words (www usr var lucid gutsy karmic ext3 amd64 multiverse mozilla eth0 ...); 8 URL/foreign/rare fragments (org php nl launchpad ubuntuforums showthread ...);
  6 greetings, interjections AND nicknames (hi hello hey oh hmm okay thanks + actionparsnip jrib ubotu ...); 9 NICKNAMES / vocative names (jack joe jordan crimsun seveas wgrant ... plus a few message-initial words: ive theres nobody somebody damn err um).
- Nickname gold (speaker metadata) vs kinds, DEV pool: 227 nick types (>= 50% of a form's occurrences are gold name occurrences, form count >= 30). 190 land in kind 9 and 36 in kind 6 (226 of 227 in these two); a frequency-matched non-nick type lands in kind 9 with probability 0.022
  (nick types 0.837). Kind 9: 248 types, purity (nick-type share of the kind's types) 0.77, enrichment E = P(kind | gold occurrence)/P(kind | token) = 16.2; kind 6: 76 types, purity 0.47, E = 7.5.
  CONF (frozen DEV centroids, CONF-pool company): 379 nick types, 290 in kind 9 and 89 in kind 6; matched non-nick types in kind 9: 0.042 vs nick types 0.765; purities 0.76 / 0.61; E = 15.2 / 10.0. The landing REPLICATES on channel-days that were never used for induction.
- The two kinds are signed by POSITION company, not by capitalisation or a list: kind 9's signature is before=^ and after = yes/i/ok/u/no/what/yeah/you (an utterance-initial vocative; the IRC colon is dropped by the tokeniser), kind 6's is before=^, after=$, after=i. So the "nickname kind" is really the
  VOCATIVE / ADDRESSEE-SLOT kind of a chat register: it also holds real first names (jack joe ryan linus johnny), bots (ubotu), "mr", "doc", "god", and a few non-name message-initial words (nobody, somebody, damn, err). It does NOT hold software names (kind 19, plus the product names in kind 1) and does NOT hold common nouns (kinds 4, 11, 12).
- P3 (>= 50% of gold-occurrence mass in ONE kind, E >= 2): over ALL gold occurrences the largest kind (9) holds 0.252 DEV / 0.260 CONF because 56% (DEV) / 47% (CONF) of gold occurrence mass is forms below 30 occurrences in the pool (thin, unassigned): by the literal reading **P3 FAILS** (max share 0.26 < 0.35).
  Over assigned forms only (A1.5b) kind 9 holds 0.252/0.440 = 57% (DEV) and 0.260/0.525 = 49.5% (CONF, just under the 50% line), kinds 9+6 together 87% / 92%, E >= 15 for kind 9: P3 holds on that reading on DEV and misses the 50% line by half a point on CONF. Nick forms that are rare in the pool have no usable company and are not placed.
- P4 (purity of c* in [0.15, 0.60]; c* mixes nicks with software names): FAILED. c* (kind 9) purity 0.77/0.76, and by reading the software/package names are NOT in it (they sit in kind 19 and in the product names of kind 1); the nick kind is separable from common nouns and software names. The qualitative clause "separable from common nouns and software names" is READ, not scored (no word list exists to score it).

## 3. K2-J — JOINT ablation of a whole kind (IRC; 6 channel-days per stage x 2 windows of 256 messages; delete all tokens of kind c, classes >= 20 tokens; null = 6 global frequency-stratified label permutations: same sizes, same frequency strata, company-free content)
The shadow of a kind is the 24-d (slot family x delta type) distribution of the slots that changed. J1 = mean pairwise (1 - cosine) between the shadows of the kinds present in a window (how different kinds look from each other), real minus the permuted partitions.
| stage | J1 real | J1 null mean | diff | block-bootstrap 95% (over days) | windows real > null mean | real > null max | J2 margin real | J2 null (6 draws) |
|---|---|---|---|---|---|---|---|---|
| DEV  | 0.1745 | 0.1369 | +0.0376 | [+0.023, +0.056] | 10 / 12 | 6 / 12 | 0.0565 | 0.024-0.033 (mean 0.027), real above all 6 |
| CONF | 0.1528 | 0.1435 | +0.0093 | [-0.010, +0.027] | 7 / 12 | 2 / 12 | 0.0576 | 0.025-0.035 (mean 0.030), real above all 6 |
J2 = a kind's shadow in one window resembles the same kind's shadow in another window more than the other kinds' shadows (margin of cosines).
Reading: kinds differ from each other in shadow by a SMALL amount beyond random frequency-stratified partitions (+0.038 on DEV, P5 predicted < 0.05: holds; the effect is a few percent of a cosine distance) and the DEV difference did NOT replicate on CONF (interval spans 0).
What does replicate on both stages is J2: each kind's shadow is reproducible across windows and days at about twice the margin of a random partition (0.057 vs 0.027-0.030, above all 6 null draws, both stages). So kinds have a recognisable, if modest, shadow identity; they do not have shadows that differ strongly from one another.
Descriptive (DEV/CONF agree): changed slots per deleted token ("fragility"): function-word kind 0 1.56/1.58, kind 1 1.65/1.62, nouns kind 4 1.58/1.75, base verbs kind 2 2.09/2.18, modals kind 3 2.61/2.72, nick kind 9 2.41/2.52, greetings+nicks kind 6 2.35/2.53, software kind 19 2.09/1.99, release-names kind 20 2.02/1.51.
CAUTION, then a correction I made by checking: changed-slots-per-token falls with class size (deleting 650 function-word tokens dilutes), so the raw differences above are mostly SIZE. Matched on class size (tokens deleted: <30, 30-59, 60-149, >=150), real kinds vs the random same-size partitions: DEV 2.22 vs 2.08, 2.13 vs 2.21, 2.09 vs 2.12, 1.92 vs 1.90; CONF 1.82 vs 2.10, 2.16 vs 2.14, 2.54 vs 2.32, 1.90 vs 1.89 (changed slots per deleted token).
For the nick kinds alone (kind 9 and 6, 26-90 tokens per window) the values scatter between 0.4 and 3.6 around the same-size random mean 2.2 (sd 0.75-0.80). So there is NO kind-specific fragility beyond what the size of the deleted set predicts: this is the pooled-negative result of NAME-SHAPE-RESULTS reproduced on induced kinds of informal English, including the nick kind.
Controls: the sham ablation produced 100% null signatures; the label-permuted partitions are the random-partition control. K2-J verdict (pre-registered clause J1 lower bound > 0): DEV holds, CONF does not: NOT REPLICATED.

## 4. Robustness: SMS (nus-sms/en, 25 files of one contributor, 38k tokens), cosem (40 files, 56k tokens), enron (60 mailbox-month files of 10 mailboxes, 79k tokens; one mailbox, allen-p, for impact)
Same pipeline, MINC = 10. NO gold: nothing below about nouns, names or software is SCORED; kinds were READ (kinds.<corpus>.dev.txt).
| corpus | K* | gap at K* | K1 (gap >= 0.10)? | NMI(kind, freq decile) | note |
|---|---|---|---|---|---|
| sms | 8 | 0.098 | no (0.002 short) | 0.155 | real 0.297 vs null max 0.199 |
| cosem | 16 | 0.071 | no | 0.240 | real 0.324 vs null max 0.253 |
| enron | 6 | 0.102 | yes | 0.137 | real 0.338 vs null max 0.236 |
P9 (K1 holds on all three with K* in [3,12]) FAILED on sms (just under), cosem (also K*=16 outside [3,12]); enron passes. The data are 20x smaller than IRC and K is chosen by the same rule; in all three corpora the shuffled null is a strong competitor at K <= 4 (frequency bands).
What I read: SMS kinds are signed by the data's own artefacts ("sent via way2sms" frame: before=via/after=way2sms; Hinglish: bhai/kya/hai/na) next to pronoun/verb/determiner-noun kinds; cosem separates pronouns+conjunctions (i you so and u it we but), interjections/particles (haha lah leh lor sia), prepositions+determiners, modals+verbs, base verbs after to, modal/past verbs, and place/time nouns (class lecture bus home today); enron separates function words, verbs, nouns, and a header/boilerplate kind. Names of persons in these registers are not scorable here (no gold) and I do not claim a name kind exists in them.
Joint arm (K2-J, one document so the bootstrap is degenerate: the verdict rests on the window counts): sms real 0.063 vs null 0.048 (2/2 windows above; J2 0.013 vs null mean 0.019, NOT above); cosem real 0.163 vs null 0.179 (1/4 windows above: real BELOW random partitions; J2 0.083 vs 0.035, above all); enron real 0.279 vs null 0.199 (2/2; J2 0.195 vs 0.082, above all).
Single-token arm: balanced accuracy of predicting the kind from the 104-d record, leave-block-out: sms 0.19 (null q95 0.18, chance 0.125, frequency-only 0.25), cosem 0.12 (q95 0.096, chance 0.06, freq-only 0.135), enron 0.28 (q95 0.264, chance 0.17, freq-only 0.25). The record beats the permutation null in all three but does not beat the 2-feature frequency classifier by 0.03 in sms (-0.06) and cosem (-0.01); enron +0.028 (just under 0.03).

## 5. K2-S — single-token records by kind (IRC; 6 DEV and 6 CONF channel-days, M=256; 12 token occurrences per kind per day, recurring in their causal window; record = 85-d IMPACT-SLOT + 19-d atmosphere)
| stage | rows | kinds | S1 balanced accuracy of "kind from record" | null q95 (200 perms within day x count bin) | chance | frequency-only classifier [log1p local count, log1p day count] | record - freq |
|---|---|---|---|---|---|---|---|
| DEV  | 1730 | 25 | 0.094 | 0.067 | 0.040 | 0.136 | -0.042 |
| CONF | 1732 | 24 | 0.101 | 0.071 | 0.042 | 0.129 | -0.028 |
S1: the record separates kinds beyond the frequency-stratified random-label null on both stages (clause "above null q95" holds), but a two-feature frequency classifier is better than the 104-d record, and adding the record to frequency does not help (0.117/0.122 < 0.136/0.129).
So the signature differences between kinds are mostly carried by how often the form recurs locally and in the day (P6 held as predicted: above the null, not above frequency by 0.03). K2 pre-registered verdict: SPLIT (J1 holds on DEV only; S1 above null but not beyond frequency).
S2 (fragility vs mention count, the Simpson check): slope of log1p(changed slots) on log1p(local mentions in the causal window), per kind, day-block bootstrap:
- pooled slope DEV -0.221 [-0.265, -0.186], CONF -0.229 [-0.276, -0.152]: NEGATIVE. More recurrences in the window -> an ablation of one of them changes FEWER slots (a redundant mention is inert; the "inertia" direction), in every kind.
- per kind: 18 of 25 kinds (DEV) and 17 of 24 (CONF) have an interval entirely below 0, NONE has an interval above 0, the rest cross 0. NO SIGN REVERSAL between kinds (P8's "no reversal" holds). P8's other half, a POSITIVE pooled slope, FAILED: it is negative.
- the magnitude differs strongly by kind: nick kinds 6 and 9 are the flattest (-0.23/-0.25 DEV, -0.29 CONF kind 9) next to function-word kinds (crossing 0), open-class kinds fall steeply (nouns kind 4 -0.63/-0.71, kinds 10-15 -0.7 to -1.3, -ing forms kind 21 -2.1/-2.3, kind 22 -1.6/-2.0). See exploratory.slopes.json for whether this heterogeneity exceeds frequency-stratified random labels (NOT pre-registered; labelled exploratory below).
Share of single-token ablations with a non-null signature (the token leaves any trace): 0.68 DEV / 0.67 CONF over the kind sample; for gold nick occurrences 0.83 / 0.88 vs 0.65 / 0.63 for pooled matched negatives and 0.63 / 0.59 for kind-mate negatives.

## 6. K3 — nicknames: pooled negatives vs kind-mates; does a kind-conditioned FULL-record model beat the local mention count?
Design as pre-registered (+ A1/A2): the SAME positives (4th-or-later gold nickname occurrences, form recurs in the causal 256-message window, kind assigned; 40/day/6 days) in three arms of frequency-matched negatives: P (any kind), K (same induced kind as the positive's form), NR (same label under a RANDOM same-size partition; control A1.2).
Scores: COUNT = log1p(local mentions) [pre-registered rival]; BURST, RECENCY [A2]; S_ENTRY (the earlier scalar); LOC = fitted [count, burst, count4, recency, position in message, message length] [A2]; REC = ridge-logistic, leave-one-DAY-out, PCA-24, on the 104-d record
(pooled: fitted on arm P, all kinds; conditioned: fitted within the kind on other days, kinds with >= 30 training pairs: in practice kinds 6 and 9, with 82-96 positives each). Pairs: DEV 240 P / 207 K / 178 NR; CONF 240 / 194 / 148. AUC [95% interval over the 6 days].
| AUC | DEV P arm | DEV K arm | DEV NR arm | CONF P arm | CONF K arm | CONF NR arm |
|---|---|---|---|---|---|---|
| COUNT (local mentions) | 0.803 | 0.632 | 0.737 | 0.828 | 0.731 | 0.784 |
| BURST | 0.750 | 0.628 | 0.619 | 0.755 | 0.688 | 0.653 |
| S_ENTRY (earlier scalar) | 0.825 | 0.652 | 0.781 | 0.869 | 0.711 | 0.828 |
| LOC (fitted local context incl. position, length) | 0.924 | 0.645 pooled / 0.662 cond | 0.854 | 0.944 | 0.756 pooled / 0.780 cond | 0.887 |
| REC pooled (full record) | 0.893 | 0.749 | 0.859 | 0.903 | 0.805 | 0.884 |
| REC conditioned on kind | - | 0.812 [0.793, 0.832] | - | - | 0.828 [0.776, 0.875] | - |
| REC + COUNT conditioned | - | 0.800 | - | - | 0.819 | - |
| position-in-stream control (P arm; must be 0.45-0.55) | 0.480 | | | 0.519 | | |
Label-swap null q95 for every AUC: 0.54-0.56. Controls: sham 100% null signatures; position control inside [0.45, 0.55] on both stages; determinism 15/15.
Paired differences on the K-arm rows where the conditioned model exists (368 DEV / 350 CONF rows; block bootstrap over days, pair bootstrap in brackets):
| difference | DEV | CONF |
|---|---|---|
| REC cond - COUNT (pre-registered tier 1) | +0.155 [0.051, 0.269] ([0.088, 0.217]) | +0.084 [0.028, 0.170] ([0.038, 0.131]) |
| REC+COUNT cond - COUNT (pre-registered tier 1) | +0.143 [0.058, 0.242] | +0.075 [0.012, 0.151] ([0.025, 0.123]) |
| REC cond - LOC cond (A2 tier 2) | +0.150 [0.037, 0.265] ([0.086, 0.218]) | +0.049 [0.008, 0.093] (pair [-0.001, 0.101]) |
| RECLOC cond - LOC cond (A2 tier 2) | +0.147 [0.060, 0.235] | +0.048 [0.016, 0.099] |
| REC cond - BURST | +0.161 [0.061, 0.256] | +0.118 [0.071, 0.169] |
| REC cond - REC pooled (on K rows): does conditioning the MODEL on kind help? | +0.036 [-0.052, 0.130] | -0.009 [-0.063, 0.022] |
| S_ENTRY - COUNT | +0.014 [-0.030, 0.054] | -0.019 [-0.080, 0.056] |
| AUC(REC cond, K arm) - AUC(REC pooled, P arm) | -0.081 | -0.075 |
Reading:
1. Pooled negatives: the earlier IRC result is reproduced and explained. The single scalar S_ENTRY (0.825 / 0.869) sits next to the local count (0.803 / 0.828; on the K-arm rows the difference is +0.014 / -0.019 with intervals spanning 0), and a fitted local-context model that includes only WHERE in the message the token stands and how long the message is (LOC 0.92-0.94) beats the full impact record (0.89-0.90). In the pooled arm a nickname is separable largely because it sits at the start of messages, recurs, and is bursty.
2. Kind-mates (the new test): the local rivals fall to 0.63-0.78 (COUNT 0.63/0.73, LOC cond 0.66/0.78) while the full record stays at 0.81/0.83. Conditioned on kind, the record beats the pre-registered local count by +0.155 (DEV) and +0.084 (CONF) AUC; the REC+COUNT-minus-COUNT clause (>= 0.03, lower bound > 0) is met on both stages.
   Against the strongest added rival (fitted local context) the margin is +0.15 on DEV and +0.049 on CONF (block interval above 0, pair interval touching 0): real but small on held-out days.
   K3 pre-registered verdict: HOLDS on CONF (AUC REC cond 0.83, lower bound 0.78 > 0.5; REC+COUNT cond - COUNT +0.075 >= 0.03 with lower bound 0.012 > 0), and on DEV.
3. What does the work is the KIND-MATCHED NEGATIVE SET, not a kind-conditioned model: the REC model fitted on pooled data scores kind-mates almost as well as the kind-conditioned fit (0.75 vs 0.81 DEV, 0.81 vs 0.83 CONF; the model difference is +0.036 and -0.009, interval spans 0). Conditioning on kind does not help the AUC: kind-mates are harder negatives (P-arm 0.89/0.90 -> K-arm 0.81/0.83) and the random-partition mates (NR) are in between (REC 0.86/0.88).
4. Nicks leave a trace more often (83-88% non-null) than frequency-matched pooled words (65/63%) or kind-mates (63/59%), and the contrast has the same sign in both nick kinds (kind 6 and kind 9, both stages) for local count, S_ENTRY, changed slots, non-null share and extent: NO Simpson reversal inside the nick kinds. Kind 3 (modals; 15 DEV pairs, nick forms that are also auxiliaries) has the opposite sign for changed slots and extent (-0.55, -1.4): a single low-n kind, DEV only, not replicated (0 pairs on CONF).

Exploratory (NOT pre-registered; exploratory.mjs): heterogeneity of the per-kind fragility-vs-count slopes: observed SD of slopes across kinds 0.55 (DEV) / 0.58 (CONF) vs 0.40 / 0.42 mean and q95 0.47 / 0.50 under frequency-stratified random kind labels (300 draws): the kinds differ in HOW fragility falls with recurrence by more than random partitions do, on both stages.

## 7. Predictions, pre-registered, with outcomes
| # | prediction | outcome |
|---|---|---|
| P1 | K1 holds on IRC: gap(K*) >= 0.10, K* in [3,12] | FAILED: K* = 24 (ladder end), gap 0.030; shuffled-company null as stable as real at K <= 8. Held-out transfer ARI 0.47 (null 0.09) is the only supportive number |
| P2 | NMI(kind, frequency decile) <= 0.5 | HELD: 0.24 (ARI with frequency bands 0.06) |
| P3 | >= 50% of gold mass in one kind, E >= 2 | FAILED on the literal reading (0.25 / 0.26: 56% / 47% of gold mass is forms < 30 occurrences); HELD on assigned forms (57% DEV, 49.5% CONF, E 15-16) |
| P4 | c* purity in [0.15, 0.60], mixes nicks with software names | FAILED: purity 0.77 / 0.76; software names are in a different kind (19). The nick kind is separable from common nouns and software names (READ) |
| P5 | K2-J1 passes with effect < 0.05 | HELD on DEV (+0.038, lower bound 0.023); NOT REPLICATED on CONF (+0.009, interval spans 0) |
| P6 | S1 beats null q95 but not frequency-only by 0.03 | HELD on both stages (0.094 / 0.101 vs q95 0.067 / 0.071; record - freq -0.042 / -0.028) |
| P7 | nick-vs-kind-mate AUC REC cond >= 0.60 (HELD: 0.81 / 0.83); K-arm < P-arm (HELD); REC cond - COUNT < 0.03 | FAILED: +0.155 / +0.084 and REC+COUNT - COUNT +0.143 / +0.075 with lower bounds > 0 on both stages: my falsifier fired; the user's guess is supported |
| P8 | no sign reversal; pooled slope positive | HALF: no reversal (HELD), pooled slope is NEGATIVE -0.22 (FAILED): in every kind more recurrences means fewer slot changes per ablated token |
| P9 | small corpora: K1 holds at some K (gap >= 0.10), K* in [3,12], S1 beats null | MIXED: enron holds (K 6, gap 0.102); sms 0.098, cosem 0.071 (K 16) fail; S1 beats null q95 in all three |
| P10 | shuffled company: gap < 0.10 | uninformative as stated (the shuffled text is the null itself) |
| K4 | families | NOT TESTED (English only) |

## 8. Plain-language summary
1. Kinds can be induced from company alone on informal English (no capitals, tags, lists): 24 kinds on IRC come out as linguistically recognisable classes (function words, base verbs, modals, past verbs, -ing forms, singular and plural nouns, adjectives, software/package names, release names and paths, greetings, and a nickname kind). They replicate on held-out channel-days (ARI 0.47-0.51) and are not frequency bands (NMI 0.24). BUT by the pre-registered stability test (two independently clustered halves vs a within-message shuffled null) the gap is only 0.03: K1 is formally NOT SHOWN, because that null (which keeps message bags and frequency) is just as stable at small K.
2. Nicknames land in a recognisable induced kind: kind 9 (and kind 6 with greetings), 87-92% of the nick-type mass of placed forms, on DEV and on CONF with the frozen DEV centroids (a frequency-matched non-nick word lands there 2-4% of the time). It is the vocative / addressee-slot kind (position company: message-initial, followed by yes/I/ok/you), it holds real first names and bots as well, and it excludes software names and common nouns. It is a property of the chat register's addressing convention.
3. The shadow/shape of kinds under joint ablation differs between kinds only slightly beyond random same-size partitions (J1 +0.038 on DEV, not on CONF); the per-token fragility differences between kinds are a SIZE effect. Kinds do have reproducible shadow identities across windows (J2 about 2x random) and different fragility-vs-recurrence slopes (SD 0.55 vs 0.40 random).
4. The Simpson hypothesis in its strong form is not supported for the fragility signal: every kind shows the same sign (more recurrence, less fragility), no reversal. But kind-conditioning DOES change the nickname result: against pooled negatives the earlier scalar ties a local count and is beaten by a position/length model, i.e. pooling hides nothing there; against kind-mates (negatives of the same induced kind) the local rivals drop to 0.63-0.78 and the full impact record keeps 0.81-0.83 AUC, beating the local mention count by +0.08 to +0.16 AUC, on held-out days too (and the strongest local-context rival by +0.05 to +0.15). The gain comes from the kind-matched comparison, not from fitting a model per kind.
5. Non-standard registers beyond IRC (SMS, cosem, one Enron mailbox) are small (38-79k tokens); kinds there are readable but K1's gap is 0.07-0.10 and there is no gold, so nothing about names or nouns is scored there.

## 9. Not done / limits (stated plainly)
- Six impact days per stage (6 blocks): block-bootstrap intervals are coarse; the CONF margin over the strongest local rival (+0.049) has a pair-bootstrap interval touching 0.
- K* = 24 was used as pre-registered; its kinds are small and the K arm effectively involves two kinds (6 and 9: 82-96 positives each); the kind-conditioned model exists only there. The K arm for other kinds (software names, common nouns) has no gold and is not scored.
- The nick kind is a vocative-position kind; in a register where names occur mid-sentence only, it would not form. SMS/cosem have no gold: whether a name kind exists there is NOT TESTED.
- Gold occurrences of rare nicks (< 30 pool occurrences, about half of the gold token mass) are not placed in any kind and are absent from K3.
- The single-token reader sees only message bodies; nick-vs-kind-mate separation might partly reflect conversational structure (recency of the exchange) beyond the features I gave LOC; BURST/RECENCY/position/length were controlled, a dialogue-turn model was not.
- Amendments A1/A2 were written after reading K1 and partial K3 numbers (disclosed in PREREG.md); the pre-registered primary comparison is tier 1.
- The small-corpus joint bootstraps are degenerate (one or two documents). No CONF split exists for them.

## 10. Pooled over both stages (12 days; blocks = days; analysis.irc.dev+conf.json; run after the per-stage reads, same code)
Pairs 480 P / 401 K / 326 NR. K arm AUC: COUNT 0.680, LOC conditioned 0.745, REC pooled 0.788, REC conditioned 0.850 [0.833, 0.871], REC+COUNT conditioned 0.841.
REC cond - COUNT +0.150 [0.091, 0.218]; REC+COUNT cond - COUNT +0.141 [0.092, 0.199]; REC cond - LOC cond +0.105 [0.058, 0.160] (pair [0.071, 0.142]); RECLOC cond - LOC cond +0.087 [0.047, 0.133]; REC cond - BURST +0.172 [0.124, 0.224];
REC cond - REC pooled on K rows +0.029 [-0.011, 0.064] (pair [0.005, 0.052]: the kind-conditioned FIT adds at most a few hundredths); S_ENTRY - COUNT -0.003 [-0.048, 0.041].
K2-J pooled: J1 +0.0235 [0.007, 0.039], 17 of 24 windows above the random-partition mean, 8 of 24 above its maximum; J2 margin 0.058 vs 0.023-0.031 for the 6 null partitions (real above all).
K2-S pooled: record 0.109 vs null q95 0.066, frequency-only 0.122; pooled slope -0.226, 19 kinds with interval below 0, none above, no reversal.
