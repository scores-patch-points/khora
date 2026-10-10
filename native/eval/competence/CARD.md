# khora competence card (language x rung)

Written 2026-10-06 by the synthesizer / completeness critic. Source of every number below: the 25 per-language TEST cards in `/private/tmp/claude-501/competence/card-<stem>-test.json` (read directly, not retyped), plus the agent diagnoses for eng, spa, rus and cmn (DEV-only probes, labelled). The machine-readable version is `/private/tmp/claude-501/competence/card-all.json`. The instruments are `eval/competence/r0-identify.mjs` .. `r5-parallel.mjs` driven by `run.mjs`; nothing in khora source, priors or scripts was edited, and nothing was committed.

## 1. Headline (read this first)

- **No language reads well.** The "reads well" level needs R2, R3 and R4 all passing; no language passes R3, and only English passes R4 (on 4 hits).
- Of 150 language-rungs on TEST: **32 pass, 62 fail, 56 unmeasured.** Unmeasured is not good; it is a hole.
- Levels: partial 12, weak 13, plus 31 stems that have priors but no TEST card (unmeasured, section 5).
- **R3 (find beings) fails everywhere it can be measured: 23 of 23**, and in every one of them the 5% standing gate fails to beat the trivial prior-lexicon filter (K:lexicon_filter failed 23/23, K:shuffled 23/23). Arabic and Korean are underpowered (4 and 2 eligible blocks), so they are holes, not passes.
- On cased scripts the capital-letter witness (non-causal, whole-block; the thing the heard rule says must not be the signal) beats the heard reader in 13 of 16 languages. The heard reader is currently worse than capitals.
- What does work: R0 names the language (19/25 pass, but a character-bigram identifier does as well in 22 cards); R1 hears words in the five languages whose ear is active and needed (cmn, cmn-hans, jpn, arb, heb; Korean fails); R2 passes in 4 (deu, ind, nld, swe) against a hard constant baseline; R5 passes for eng, ita, fin against a pivot on 12-36 units.
- 16 of R2's 21 failures include the B3 clause (the reader wrongly refuses more than 5% of true unseen naming occurrences; refusal is not loss-bounded). That is a fixable defect, not absent information: in the four languages diagnosed (eng, spa, rus, cmn) the frame prior beats a deranged frame (AUC .68-.90 vs .56-.60).
- The 3 failing repo tests behind guard G0 (tests/barker-induce.test.js x2, tests/law-corpus.test.js x1; counts vary 3-8 across cards because other agents are editing) are not reader tests; they make `run.mjs` exit 1 and mark all 25 cards `guards.summary.ok=false`. The reader guards themselves pass where licensed (lowercase and prefix invariance, with licences that can fail), except where the lowercase guard is vacuous (arb, heb, hin) or unlicensed (pol).

## 2. How to read the card

Definitions declared before they were applied (descriptive labels, no new threshold):

- **reads well**: R2 pass AND R3 pass AND R4 pass on TEST.
- **partial**: at least one content rung passes on TEST against its controls (R1 with an ear that is needed and active, R2, R4, R5). Flags say when the pass is thin.
- **weak**: R0 passes (or is script-determined) but no content rung passes and at least one fails.
- **unmeasured**: no TEST card, or R0 only.

Rung rules and controls are the pre-registered ones in each instrument header (v2 R0 with amendments A1/A2; R1 site F1; R2 unseen-word nominal F1 plus refusal clauses B1-B3; R3 keyed PROPN macro F1 over blocks with sign tests; R4 strict F1 with a hit floor; R5 parallel-text agreement). The card reports verdict, score, strongest control and n side by side; it does not reinterpret a verdict.

Split discipline: priors were trained on TRAIN only; instruments were smoke-tested on DEV; TEST was read exactly once per stem (25 rows in `test-reads.jsonl`, module sha1s r0 97437ff57a15, r1 1170753693ef, r2 a74bcd61f49a, r3 084fe8facf08, r4 8c37384a058f, r5 9c1365a165bc). **TEST is therefore spent.** Any fix has to be pre-registered, developed on DEV, and judged on a fresh held-out draw (section 8).

## 3. Language x rung matrix

| lang | R0 identify | R1 hear | R2 classify | R3 beings | R4 claims | R5 agree | level |
|---|---|---|---|---|---|---|---|
| eng | PASS | UNM-NN | FAIL | FAIL | PASS | PASS | **partial** |
| spa | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| rus | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| cmn | FAIL | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| cmn-hans | UNM-SD | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| arb | PASS | PASS | FAIL | UNM-UP | FAIL | UNM-NP | **partial** |
| heb | UNM-SD | PASS | FAIL | FAIL | FAIL | UNM-NP | **partial** |
| fas | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| kor | UNM-SD | FAIL | FAIL | UNM-UP | FAIL | UNM-NP | **weak** |
| jpn | UNM-SD | PASS | FAIL | FAIL | UNM-UP | UNM-NP | **partial** |
| fra | PASS | FAIL | FAIL | FAIL | UNM-UP | FAIL | **weak** |
| deu | PASS | FAIL | PASS | FAIL | UNM-UP | FAIL | **partial** |
| ita | PASS | FAIL | FAIL | FAIL | UNM-UP | PASS | **partial** |
| por | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| nld | PASS | UNM-NN | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| pol | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ukr | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| hin | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| vie | PASS | UNM-NN | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ind | PASS | FAIL | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| swe | PASS | UNM-NN | PASS | FAIL | UNM-UP | UNM-NP | **partial** |
| urd | PASS | UNM-NN | FAIL | FAIL | FAIL | UNM-NP | **weak** |
| tur | PASS | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| ell | UNM-SD | FAIL | FAIL | FAIL | UNM-UP | UNM-NP | **weak** |
| fin | PASS | UNM-NN | FAIL | FAIL | UNM-UP | PASS | **partial** |

Columns total (25 languages): R0 19P/1F/5U, R1 5P/9F/11U, R2 4P/21F/0U, R3 0P/23F/2U, R4 1P/6F/18U, R5 3P/2F/20U. All rungs: 32 pass, 62 fail, 56 unmeasured of 150 language-rungs.

UNM codes: SD = script-determined (R0 returns no claim); NN = ear not needed and inert (R1 returns null by its own rule); UP = underpowered (too few eligible blocks or hits); NP = no parallel text for this language in the TEST corpus.

### Competence level per language

| lang | level | what passes | flags |
|---|---|---|---|
| eng | **partial** | R4, R5 | R4 pass rests on 4 hits; R5 measured only against an English/Italian pivot |
| spa | **weak** | R0 only (or nothing) | - |
| rus | **weak** | R0 only (or nothing) | - |
| cmn | **partial** | R1 | R0 FAIL (language misidentified) |
| cmn-hans | **partial** | R1 | R0 script-determined (no claim) |
| arb | **partial** | R1 | - |
| heb | **partial** | R1 | R0 script-determined (no claim) |
| fas | **weak** | R0 only (or nothing) | - |
| kor | **weak** | R0 only (or nothing) | R0 script-determined (no claim) |
| jpn | **partial** | R1 | R0 script-determined (no claim) |
| fra | **weak** | R0 only (or nothing) | - |
| deu | **partial** | R2 | - |
| ita | **partial** | R5 | only parallel-text agreement passes (eng-pivot, 12-36 units); R5 measured only against an English/Italian pivot |
| por | **weak** | R0 only (or nothing) | - |
| nld | **partial** | R2 | - |
| pol | **weak** | R0 only (or nothing) | - |
| ukr | **weak** | R0 only (or nothing) | - |
| hin | **weak** | R0 only (or nothing) | - |
| vie | **weak** | R0 only (or nothing) | - |
| ind | **partial** | R2 | - |
| swe | **partial** | R2 | - |
| urd | **weak** | R0 only (or nothing) | - |
| tur | **weak** | R0 only (or nothing) | - |
| ell | **weak** | R0 only (or nothing) | R0 script-determined (no claim) |
| fin | **partial** | R5 | only parallel-text agreement passes (eng-pivot, 12-36 units); R5 measured only against an English/Italian pivot |

Levels in plain words: nobody **reads well**. The **partial** languages each pass something real but small: arb, cmn, cmn-hans, heb, jpn hear words (R1) and then fail to class or find beings; deu, ind, nld, swe class unseen words (R2) but fail R3, and R5 (where measured) or R1 fail for deu; eng passes R4 (4 hits) and R5; fin and ita pass only parallel-text agreement against a pivot. The **weak** languages are identified (or script-determined) and no more.

## 4. Per-rung detail (score beside the strongest control)

### R0 identify (causal, per sentence, 8 streams x 60 sentences, no declared language)

| lang | verdict | accuracy | strongest gating control | n | note |
|---|---|---|---|---|---|
| eng | pass | 0.989 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| spa | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| rus | pass | 0.998 | 0.430 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 21/60, 59/60 |
| cmn | fail | 0.446 | 0.035 (deranged_equalised) | 480 | FLOOR not met: accuracy 0.4458, precision 0.4486, 4/8 streams at F=0.625 (chance 0.25 + 0.5 x headroom; stream; OOV named a candidate 58/58 |
| cmn-hans | unmeasured | 0.994 | 0.056 (deranged_equalised) | 480 | script-determined: verdict survives scrambling; no claim about reading; OOV named a candidate 58/58 |
| arb | pass | 1.000 | 0.635 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 59/60, 60/60, 60/60 |
| heb | unmeasured | 1.000 | 0.977 (scrambled_text) | 480 | script-determined: verdict survives scrambling; no claim about reading; OOV named a candidate 59/60 |
| fas | pass | 1.000 | 0.315 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 59/60, 60/60, 60/60 |
| kor | unmeasured | 1.000 | -  | 480 | script-determined: verdict survives scrambling; no claim about reading |
| jpn | unmeasured | 0.996 | 0.478 (deranged_equalised) | 480 | script-determined: verdict survives scrambling; no claim about reading; OOV named a candidate 58/58 |
| fra | pass | 0.998 | 0.000 (scrambled_text) | 416 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| deu | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| ita | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| por | pass | 1.000 | 0.002 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| nld | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| pol | pass | 1.000 | 0.001 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| ukr | pass | 0.950 | 0.153 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 21/60, 59/60 |
| hin | pass | 1.000 | 0.912 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60, 60/60 |
| vie | pass | 1.000 | 0.001 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| ind | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| swe | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| urd | pass | 1.000 | 0.048 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 59/60, 60/60, 60/60 |
| tur | pass | 1.000 | 0.000 (scrambled_text) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |
| ell | unmeasured | 0.987 | 0.002 (scrambled_text) | 456 | script-determined: verdict survives scrambling; no claim about reading |
| fin | pass | 1.000 | 0.001 (deranged_equalised) | 480 | char_bigram reference at or above real arm (not gating); OOV named a candidate 60/60 |

Standing caveats: the reference character-bigram arm scores at or above the real arm in 22 cards (it is not gating, so a pass means the listener names the language, not that it needed word identity). Greenberg breach: a language with no prior is named as the nearest candidate (haw -> ind 60/60 etc.; column "OOV named a candidate"); it is reported, not gating, and it is a rule 3 violation.

### R1 hear words (site F1 on inside-run boundaries + unrepresentable MWT splits)

| lang | verdict | site F1 | strongest control | need share | rule | inside-run boundaries unheard | MWT non-concatenative |
|---|---|---|---|---|---|---|---|
| eng | unmeasured | null (raw 0.000) | 0.011 (every_char) | 0.0175 | not_needed_ear_inert | 399/399 | - |
| spa | fail | 0.000 | 0.002 (every_char) | 0.0231 | needs_ear_but_inert | 203/203 | 982/51215 |
| rus | unmeasured | null (raw -) | -  | 0.0000 | not_needed_ear_inert | - | - |
| cmn | pass | 0.922 | 0.760 (deranged_lexicon) | 0.7591 | needs_ear_beats_every_control | 191/8676 | - |
| cmn-hans | pass | 0.922 | 0.717 (deranged_lexicon) | 0.7591 | needs_ear_beats_every_control | 192/8676 | - |
| arb | pass | 0.682 | 0.621 (affix_only) | 0.1498 | needs_ear_beats_every_control | 1327/3680 | 415/27337 |
| heb | pass | 0.649 | 0.629 (affix_only) | 0.2931 | needs_ear_beats_every_control | 462/2521 | 920/11741 |
| fas | unmeasured | null (raw 0.000) | 0.009 (every_char) | 0.0120 | not_needed_ear_inert | 271/271 | - |
| kor | fail | 0.478 | 0.854 (affix_only) | 0.2475 | needs_ear_beats_every_control | 2113/3115 | - |
| jpn | pass | 0.960 | 0.714 (every_char) | 0.8308 | needs_ear_beats_every_control | 145/10344 | - |
| fra | fail | 0.000 | 0.028 (every_char) | 0.0777 | needs_ear_but_inert | 460/460 | 279/9506 |
| deu | fail | 0.000 | 0.004 (every_char) | 0.0259 | needs_ear_but_inert | 122/122 | 266/15009 |
| ita | fail | 0.000 | 0.023 (every_char) | 0.1008 | needs_ear_but_inert | 404/404 | 589/9853 |
| por | fail | 0.000 | 0.006 (every_char) | 0.0736 | needs_ear_but_inert | 302/302 | 1905/29996 |
| nld | unmeasured | null (raw 0.000) | 0.003 (every_char) | 0.0069 | not_needed_ear_inert | 72/72 | - |
| pol | unmeasured | null (raw 0.000) | 0.004 (every_char) | 0.0086 | not_needed_ear_inert | 268/268 | - |
| ukr | unmeasured | null (raw 0.000) | 0.000 (every_char) | 0.0001 | not_needed_ear_inert | 1/1 | 1/16001 |
| hin | unmeasured | null (raw 0.000) | 0.001 (every_char) | 0.0017 | not_needed_ear_inert | 58/58 | - |
| vie | unmeasured | null (raw -) | -  | 0.0000 | not_needed_ear_inert | - | - |
| ind | fail | 0.000 | 0.009 (every_char) | 0.0202 | needs_ear_but_inert | 224/224 | - |
| swe | unmeasured | null (raw 0.000) | 0.003 (every_char) | 0.0056 | not_needed_ear_inert | 107/107 | - |
| urd | unmeasured | null (raw 0.000) | 0.000 (every_char) | 0.0004 | not_needed_ear_inert | 6/6 | - |
| tur | fail | 0.000 | 0.013 (every_char) | 0.0312 | needs_ear_but_inert | 276/276 | 1/8887 |
| ell | fail | 0.000 | 0.012 (every_char) | 0.0246 | needs_ear_but_inert | 250/250 | - |
| fin | unmeasured | null (raw 0.000) | 0.000 (every_char) | 0.0021 | not_needed_ear_inert | 19/19 | 22/19364 |

`needs_ear_but_inert` is a **fail** (the ear is needed and does nothing). `not_needed_ear_inert` returns null by a bare 0.02 floor and is a hole, not a pass.

### R2 classify (nominal-class F1 on UNSEEN words; B1-B3 refusal clauses)

| lang | verdict | unseen nominal F1 | strongest control (constant) | n unseen | B3 lost-nominal (ceiling 0.05) | vs all-nominal |
|---|---|---|---|---|---|---|
| eng | fail | 0.831 | 0.868 (majority_oracle) | 1410 | 0.060 | delta -0.0374 p=1 |
| spa | fail | 0.850 | 0.720 (majority_oracle) | 2320 | 0.077 | above constant; fails B3 or heard arm |
| rus | fail | 0.733 | 0.717 (majority_oracle) | 2755 | 0.067 | delta 0.0162 p=0.0516 |
| cmn | fail | 0.800 | 0.840 (majority_oracle) | 1355 | ok (<=0.05) | delta -0.0402 p=1 |
| cmn-hans | fail | 0.806 | 0.841 (majority_oracle) | 1347 | ok (<=0.05) | delta -0.0343 p=1 |
| arb | fail | 0.444 | 0.429 (all_nominal) | 2179 | 0.210 | delta 0.0152 p=0.229 |
| heb | fail | 0.764 | 0.734 (majority_oracle) | 769 | 0.087 | above constant; fails B3 or heard arm |
| fas | fail | 0.847 | 0.883 (majority_oracle) | 468 | 0.073 | delta -0.0361 p=0.999 |
| kor | fail | 0.684 | 0.689 (majority_oracle) | 3896 | 0.067 | delta -0.005 p=0.787 |
| jpn | fail | 0.889 | 0.836 (majority_oracle) | 753 | ok (<=0.05) | above constant; fails B3 or heard arm |
| fra | fail | 0.862 | 0.726 (majority_oracle) | 469 | 0.064 | above constant; fails B3 or heard arm |
| deu | pass | 0.870 | 0.811 (majority_oracle) | 1686 | ok (<=0.05) | above constant, p<=0.05 |
| ita | fail | 0.824 | 0.652 (all_nominal) | 500 | 0.079 | above constant; fails B3 or heard arm |
| por | fail | 0.857 | 0.750 (majority_oracle) | 1845 | 0.065 | above constant; fails B3 or heard arm |
| nld | pass | 0.857 | 0.831 (majority_oracle) | 1237 | ok (<=0.05) | above constant, p<=0.05 |
| pol | fail | 0.705 | 0.666 (all_nominal) | 3872 | 0.101 | above constant; fails B3 or heard arm |
| ukr | fail | 0.671 | 0.646 (all_nominal) | 3880 | 0.170 | above constant; fails B3 or heard arm |
| hin | fail | 0.895 | 0.906 (majority_oracle) | 1466 | ok (<=0.05) | delta -0.0106 p=0.931 |
| vie | fail | 0.520 | 0.769 (majority_oracle) | 543 | 0.127 | delta -0.2487 p=1 |
| ind | pass | 0.928 | 0.913 (majority_oracle) | 1269 | ok (<=0.05) | above constant, p<=0.05 |
| swe | pass | 0.847 | 0.766 (majority_oracle) | 2644 | ok (<=0.05) | above constant, p<=0.05 |
| urd | fail | 0.889 | 0.892 (majority_oracle) | 809 | 0.064 | delta -0.0038 p=0.658 |
| tur | fail | 0.697 | 0.676 (majority_oracle) | 2575 | 0.154 | above constant; fails B3 or heard arm |
| ell | fail | 0.736 | 0.621 (all_nominal) | 1627 | 0.168 | above constant; fails B3 or heard arm |
| fin | fail | 0.794 | 0.804 (majority_oracle) | 4347 | ok (<=0.05) | delta -0.0097 p=0.972 |

Languages whose score is above the constant but whose verdict is fail (ell, fra, heb, ita, jpn, pol, por, spa, tur, ukr; margins +0.02 to +0.17) fail on B3 (lost nominals above 5%) or on the heard arm (jpn), not on the constant. arb (+0.015, p=0.23) and rus (+0.016, p=0.0516) are above the constant but not demonstrated.

### R3 find beings (keyed PROPN macro F1, case-stripped, production config, 8 blocks)

| lang | verdict | keyed PROPN F1 | lexicon_filter (gate off, no common nouns) | nominated (gate off) | rawTop | capital witness (non-heard) | n sentences | cased-script production config | clauses failed |
|---|---|---|---|---|---|---|---|---|---|
| eng | fail | 0.527 | 0.524 | 0.348 | 0.191 | 0.511 | 2072 | yes | K:lexicon_filter K:shuffled U:rawTop |
| spa | fail | 0.685 | 0.764 | 0.426 | 0.275 | 0.815 | 1720 | yes | K:lexicon_filter K:shuffled U:rawTop |
| rus | fail | 0.456 | 0.488 | 0.230 | 0.129 | 0.610 | 600 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled U:randomK |
| cmn | fail | 0.272 | 0.521 | 0.302 | 0.217 | 0.000 | 496 | no | K:rawTopK K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:randomK U:rawTop U:prior_scrambled U:randomK |
| cmn-hans | fail | 0.273 | 0.521 | 0.302 | 0.217 | 0.000 | 496 | no | K:rawTopK K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:randomK U:rawTop U:prior_scrambled U:randomK |
| arb | unmeasured | 0.008 | 0.023 | 0.005 | 0.004 | 0.000 | 680 | no | underpowered: 4 eligible PROPN block(s) < 5, the fewest at which the sign test can reach 0.05 |
| heb | fail | 0.234 | 0.438 | 0.222 | 0.153 | 0.000 | 488 | no | K:nominated K:lexicon_filter K:shuffled K:randomK U:rawTopK U:prior_scrambled U:randomK |
| fas | fail | 0.121 | 0.455 | 0.136 | 0.091 | 0.000 | 1448 | no | K:rawTop K:rawTopK K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:prior_scrambled K:randomK |
| kor | unmeasured | 0.019 | 0.000 | 0.017 | 0.008 | 0.000 | 984 | no | underpowered: 2 eligible PROPN block(s) < 5, the fewest at which the sign test can reach 0.05 |
| jpn | fail | 0.112 | 0.400 | 0.134 | 0.065 | 0.000 | 536 | no | K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:prior_scrambled K:randomK U:rawTop U:rawTopK U:prior_scrambled U:randomK |
| fra | fail | 0.383 | 0.443 | 0.180 | 0.063 | 0.572 | 360 | yes | K:rawTop K:rawTopK K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:prior_scrambled K:randomK L:licence |
| deu | fail | 0.504 | 0.517 | 0.267 | 0.096 | 0.174 | 976 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled U:randomK |
| ita | fail | 0.361 | 0.354 | 0.195 | 0.083 | 0.687 | 480 | yes | K:rawTop K:nominated K:lexicon_filter K:shuffled K:rate_permuted |
| por | fail | 0.529 | 0.685 | 0.386 | 0.240 | 0.688 | 1200 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled |
| nld | fail | 0.475 | 0.487 | 0.347 | 0.185 | 0.691 | 592 | yes | K:lexicon_filter K:shuffled K:rate_permuted K:randomK U:rawTop U:rawTopK U:prior_scrambled U:randomK |
| pol | fail | 0.458 | 0.487 | 0.104 | 0.040 | 0.621 | 2208 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled U:randomK |
| ukr | fail | 0.253 | 0.273 | 0.173 | 0.098 | 0.617 | 896 | yes | K:rawTopK K:lexicon_filter K:shuffled K:rate_permuted K:randomK U:rawTop U:rawTopK U:prior_scrambled U:randomK |
| hin | fail | 0.459 | 0.773 | 0.488 | 0.334 | 0.000 | 1680 | no | K:nominated K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled |
| vie | fail | 0.173 | 0.161 | 0.093 | 0.057 | 0.531 | 800 | yes | K:rawTopK K:lexicon_filter K:shuffled K:rate_permuted U:rawTopK U:prior_scrambled U:randomK |
| ind | fail | 0.632 | 0.706 | 0.491 | 0.296 | 0.623 | 552 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled |
| swe | fail | 0.148 | 0.191 | 0.094 | 0.038 | 0.897 | 1216 | yes | K:rawTop K:nominated K:lexicon_filter K:shuffled K:rate_permuted K:prior_scrambled K:randomK |
| urd | fail | 0.423 | 0.663 | 0.416 | 0.280 | 0.000 | 528 | no | K:nominated K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled |
| tur | fail | 0.293 | 0.291 | 0.211 | 0.112 | 0.533 | 1096 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:rawTopK U:prior_scrambled U:randomK |
| ell | fail | 0.338 | 0.361 | 0.225 | 0.134 | 0.537 | 420 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:prior_scrambled U:randomK |
| fin | fail | 0.409 | 0.409 | 0.266 | 0.122 | 0.668 | 1552 | yes | K:lexicon_filter K:shuffled K:rate_permuted U:rawTop U:rawTopK U:prior_scrambled |

Reading the table: lexicon_filter is the nominated ledger with the prior's settled common nouns removed and **no gate**; keyed is the production arm with the 5% standing gate. A control that does as well as the real arm means the mechanism it is tested against adds nothing (II.23). The capital witness is a rival (non-causal, English-listed), not a control; it is reported because the heard rule demands the heard route be at least competitive.

### R4 find claims (strict F1 of subject->object edges vs UD nsubj x obj head pairs)

| lang | verdict | strict F1 | strongest control | gold S-O pairs | edges | hits (needed) | result |
|---|---|---|---|---|---|---|---|
| eng | pass | 0.0432 | 0.0081 (random_nominal_pair) | 122 | 63 | 4 (2) | pass |
| spa | unmeasured | 0.0000 | 0.0037 (random_nominal_pair) | 116 | 19 | 0 (2) | underpowered_hits |
| rus | unmeasured | 0.0000 | 0.0013 (random_nominal_pair) | 73 | 6 | 0 (2) | underpowered_hits |
| cmn | fail | 0.0410 | 0.0218 (random_nominal_pair) | 189 | 222 | 9 (2) | fail:random_nominal_pair |
| cmn-hans | fail | 0.0411 | 0.0233 (random_nominal_pair) | 189 | 221 | 9 (2) | fail:random_nominal_pair |
| arb | fail | 0.0198 | 0.0283 (ear_off_tier_on) | 237 | 1094 | 14 (2) | fail:ear_off_tier_on |
| heb | fail | 0.0099 | 0.0315 (ear_off_tier_on) | 55 | 351 | 2 (2) | fail:shuffled_gold+crossed_edges+random_adjacent+random_pair+random_nominal_pair |
| fas | unmeasured | 0.0000 | 0.0129 (random_nominal_pair) | 52 | 150 | 0 (2) | underpowered_hits |
| kor | fail | 0.0440 | 0.0563 (ear_off_tier_on) | 51 | 60 | 2 (2) | fail:shuffled_gold+crossed_edges+random_adjacent+random_pair+random_nominal_pair |
| jpn | unmeasured | 0.0129 | 0.0135 (random_nominal_pair) | 37 | 118 | 1 (2) | underpowered_hits |
| fra | unmeasured | 0.0000 | 0.0016 (random_nominal_pair) | 119 | 6 | 0 (2) | underpowered_hits |
| deu | unmeasured | 0.0000 | 0.0048 (random_nominal_pair) | 82 | 2 | 0 (2) | underpowered_hits |
| ita | unmeasured | 0.0000 | 0.0032 (random_nominal_pair) | 92 | 3 | 0 (2) | underpowered_hits |
| por | unmeasured | 0.0122 | 0.0091 (random_nominal_pair) | 113 | 51 | 1 (2) | underpowered_hits |
| nld | unmeasured | 0.0000 | 0.0065 (random_nominal_pair) | 102 | 22 | 0 (2) | underpowered_hits |
| pol | unmeasured | 0.0000 | 0.0000 (shuffled_gold) | 57 | 2 | 0 (2) | underpowered_hits |
| ukr | unmeasured | 0.0217 | 0.0087 (random_nominal_pair) | 68 | 24 | 1 (2) | underpowered_hits |
| hin | unmeasured | 0.0000 | 0.0000 (shuffled_gold) | 86 | 1 | 0 (2) | underpowered_hits |
| vie | unmeasured | 0.0118 | 0.0457 (random_nominal_pair) | 95 | 75 | 1 (2) | underpowered_hits |
| ind | unmeasured | 0.0000 | 0.0074 (random_nominal_pair) | 136 | 134 | 0 (2) | underpowered_hits |
| swe | unmeasured | 0.0118 | 0.0286 (random_nominal_pair) | 116 | 53 | 1 (2) | underpowered_hits |
| urd | fail | 0.0235 | 0.0212 (random_nominal_pair) | 170 | 597 | 9 (2) | fail:random_nominal_pair |
| tur | unmeasured | 0.0000 | 0.0283 (random_nominal_pair) | 36 | 10 | 0 (2) | underpowered_hits |
| ell | unmeasured | 0.0000 | 0.0068 (random_nominal_pair) | 71 | 32 | 0 (2) | underpowered_hits |
| fin | unmeasured | 0.0000 | 0.0022 (random_nominal_pair) | 42 | 4 | 0 (2) | underpowered_hits |

### R5 cross-language agreement (heard ledgers on parallel text)

| lang | verdict | agreement m | strongest null | units | note |
|---|---|---|---|---|---|
| eng | pass | 0.706 | 0.533 (nonparallel_max) | 36 | pass: true — all of P N D L C S H R hold  |
| spa | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| rus | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| cmn | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| cmn-hans | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| arb | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| heb | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| fas | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| kor | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| jpn | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| fra | fail | 0.779 | 0.788 (deranged_units) | 12 | pass: false — failed D  |
| deu | fail | 0.793 | 0.803 (nonparallel_max) | 12 | pass: false — failed N  |
| ita | pass | 0.619 | 0.480 (nonparallel_max) | 36 | pass: true — all of P N D L C S H R hold  |
| por | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| nld | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| pol | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| ukr | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| hin | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| vie | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| ind | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| swe | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| urd | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| tur | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| ell | unmeasured | - | -  | 0 | no_parallel_text (no edition in the TEST corpus) |
| fin | pass | 0.613 | 0.579 (cyclic_shift_max) | 36 | pass: true — all of P N D L C S H R hold  |

Cross-language pairs measured on TEST (English pivot, parallel-classics):

| pivot a | b | corpus | m | strongest non-parallel null | share | pass |
|---|---|---|---|---|---|---|
| ita | eng | classics | 0.7056 | 0.5327 | 0.7 | true |
| eng | fra | classics | 0.7789 | 0.7648 | 0.15 | false |
| eng | deu | classics | 0.7934 | 0.8033 | 0.05 | false |
| eng | ita | classics | 0.6185 | 0.4803 | 0.55 | true |
| eng | fin | classics | 0.6132 | 0.5668 | 0.25 | true |

Five of 25 stems measured; no non-pivot pair; eng>fra and eng>deu fail (12 Alice chapters), so a pivot on 12 units is not readable.

## 5. Stems with priors but no TEST card (unmeasured)

31 stems have a prior but no TEST card: 28 with a DEV split on disk (afr bul cat ces cym dan est eus gle glg hrv hun hye kat lav lit lzh mar mlt nob ron slk slv srp tam tel uig wol) and 3 (grc, lat, san) that have a prior and no eval directory at all. Their competence level is **unmeasured**. DEV-only numbers exist for some rungs; they are development evidence, not counted, and were seen by instrument authors:

| stem | R1 dev (pass, site F1 vs ctrl) | R2 dev (pass, unseen F1 vs ctrl) | R5 dev (UDHR, pass, m vs ctrl) |
|---|---|---|---|
| afr | null, 0.000 vs 0.000 | fail, 0.757 vs 0.756 | null, - vs - |
| bul | null, 0.000 vs 0.000 | fail, 0.835 vs 0.633 | pass, 0.816 vs 0.788 |
| cat | fail, 0.000 vs 0.029 | fail, 0.866 vs 0.741 | null, - vs - |
| ces | null, 0.000 vs 0.000 | fail, 0.723 vs 0.621 | null, - vs - |
| cym | fail, 0.000 vs 0.032 | fail, 0.873 vs 0.872 | null, - vs - |
| dan | null, - vs - | pass, 0.859 vs 0.786 | null, - vs - |
| est | null, 0.000 vs 0.000 | fail, 0.817 vs 0.829 | null, - vs - |
| eus | null, 0.000 vs 0.000 | pass, 0.812 vs 0.801 | null, - vs - |
| gle | null, 0.000 vs 0.011 | fail, 0.850 vs 0.847 | null, - vs - |
| glg | fail, 0.000 vs 0.010 | fail, 0.793 vs 0.588 | null, - vs - |
| grc | - | null, - vs - | null, - vs - |
| hrv | null, 0.000 vs 0.001 | fail, 0.743 vs 0.682 | null, - vs - |
| hun | null, - vs - | fail, 0.776 vs 0.764 | null, - vs - |
| hye | null, 0.000 vs 0.001 | fail, 0.787 vs 0.801 | null, - vs - |
| kat | fail, 0.000 vs 0.023 | fail, 0.710 vs 0.753 | null, - vs - |
| lat | - | null, - vs - | null, - vs - |
| lav | null, 0.000 vs 0.000 | fail, 0.704 vs 0.677 | null, - vs - |
| lit | null, - vs - | fail, 0.597 vs 0.667 | null, - vs - |
| lzh | fail, 0.971 vs 0.962 | fail, 0.974 vs 0.988 | null, - vs - |
| mar | fail, 0.000 vs 0.062 | fail, 0.602 vs 0.710 | null, - vs - |
| mlt | null, 0.000 vs 0.007 | fail, 0.316 vs 0.697 | null, - vs - |
| nob | null, 0.000 vs 0.000 | pass, 0.883 vs 0.855 | null, - vs - |
| ron | null, - vs - | pass, 0.781 vs 0.756 | null, - vs - |
| san | - | null, - vs - | null, - vs - |
| slk | null, 0.000 vs 0.000 | fail, 0.663 vs 0.716 | null, - vs - |
| slv | null, 0.000 vs 0.000 | fail, 0.775 vs 0.693 | null, - vs - |
| srp | null, 0.000 vs 0.000 | fail, 0.755 vs 0.669 | null, - vs - |
| tam | fail, 0.000 vs 0.003 | fail, 0.762 vs 0.750 | null, - vs - |
| tel | null, - vs - | fail, 0.418 vs 0.537 | null, - vs - |
| uig | null, - vs - | fail, 0.786 vs 0.738 | null, - vs - |
| wol | fail, 0.000 vs 0.013 | fail, 0.835 vs 0.784 | null, - vs - |

"null" = the rung returned no verdict or no number for that stem (a hole). Ad hoc DEV R0 probes reported for six of them (not the standing instrument, not counted): bul 199/200 fresh-per-sentence, but adding bul drops rus from 0.945 to 0.88 (10 of 16 steals are exact ties won alphabetically); ces 195/201 with 6 typed gaps from capitalised sentence starts; srp 107/200 per sentence (91 named hrv, 56 exact ties) though 199/200 causally cumulative; hrv 196/200 but Serbian is named hrv on 96/200 isolated sentences; slk 148/200 (31 named ces); slv 190/200. The Serbo-Croatian and Czech-Slovak pairs are the live R0 risk, and mlt (R2 DEV .316 vs constant .697) is a DEV-visible failure.

## 6. Root causes (clustered across languages and rungs)

Counts are language-rungs implicated, not a promise of passes: several fixes change the instrument's claim rather than the score. All code changes belong to the main agent (existing source is not editable here). Fix kinds: (a) instrument problem, (b) prior/data problem, (c) mechanism problem, (d) design conflict with the reading rules.

Priority order by language-rungs implicated: RC7 (56), RC1 (24), RC5 (24), RC6 (24), RC3 (21), RC2 (17), RC4 (10); RC8 is a decision that gates RC1, RC2 and RC5.

### RC1 [c] Standing gate (5% binomial vs received baseline) is a rare-word filter that adds nothing over the prior's own lexicon filter

- **Rungs / languages:** R3, R5; eng, spa, rus, cmn, cmn-hans, heb, fas, jpn, fra, deu, ita, por, nld, pol, ukr, hin, vie, ind, swe, urd, tur, ell, fin (24 language-rungs implicated)
- **Evidence:** R3 K:lexicon_filter failed in 23/23 measured languages and K:shuffled in 23/23; the lexicon filter (gate off, settled common nouns removed) scores above keyed in 20/25 languages. eng: keyed is a subset of lexicon_filter in 8/8 blocks, Jaccard(keyed, gate-off) 0.86, 22 true recurring names refused on DEV (bush, september, john...). spa: gate refuses 72% of nominated forms; train-attested names (espana, barcelona, jose) get a high received rate so genuine recurrence is judged ordinary (26% of nominated recurring PROPN dropped on DEV). rus: at ~1,200 tokens a form is keyable at 2 arrivals only if its TRAIN count <= 28. cmn: keyed vs nominated 0 wins 8 losses (recall .574 -> .410, precision unchanged). R5: nominated >= keyed in fra (test .8013 vs .7789), and on DEV for spa, rus, cmn, eng. Same direction as the earlier pre-registered reading-helps-falsify run (3 of 4 predictions falsified).
- **Fix:** New listening-cast variant (main agent owns adapters/text/listening-cast.js and keyness.js): split EXISTENCE from SALIENCE. Existence = form nominated by the prior (or unseen) and arrived >= 2 times (structural floor S16) and not refused. Salience = isKeyInMaterial reported as a rank/flag, never a membership gate. If a gate stays: class-conditioned null (form's rate among its own class, not among all tokens) and abstain with typed gap gate_underpowered(k_min > block capacity) instead of refusing. Fix cannot "pass" K:lexicon_filter by removal: with the gate off keyed == lexicon_filter, so R3 must be re-registered (lexicon_filter becomes an ablation of the system, not a rival).
- **Rule compliance:** Prior still only NOMINATES or REFUSES (rule 3); recurrence at the structural floor admits (identity does not decay, P1); threshold derived from block size and tokens read (rule 5); causal (per-sentence add unchanged); no case read. Needs a NEW pre-registered arm with its own deranged control and licence (rules 6, 7).

### RC2 [c/d] "Cased script" is derived from letter category, so lowercased or caseless-heard text in a cased script is treated as cased and common nouns are deferred to a capital witness that sees nothing (heard-rule breach)

- **Rungs / languages:** R3, R4; eng, spa, rus, fra, deu, ita, por, nld, pol, ukr, vie, ind, swe, tur, ell, fin (17 language-rungs implicated)
- **Evidence:** 16 stems run the R3 production arm with casedScript=true on LOWERCASED input (commonNouns=false). The non-causal capital witness beats the heard keyed arm in 13/16 of them (spa, rus, fra, ita, por, nld, pol, ukr, vie, swe, tur, ell, fin); only deu, eng (4-4) and ind are not beaten. swe keyed .148 vs capital .897. rus (diagnosed on DEV by the rus agent): casedFraction counts Ll as cased, so commonNouns=false on text with no capitals; R4 on lowercase rus gives 6 edges vs 122 on cased text. eng DEV: nominal recall .31-.33 although the ungated ledger finds PROPN|NOUN at F1 .89.
- **Fix:** the-fold/language-context.js casedFraction/casedScript (main agent): "capitals are used in THIS text" = share of non-sentence-initial word tokens beginning uppercase, null = the same share on the language's own TRAIN text with case stripped (0). Lowercased or SMS text then gets commonNouns=true. Cased text unchanged.
- **Rule compliance:** Directly implements the heard rule (rule 4): the system must work as well if it only HEARD the text. Derived from the material (rule 5), causal, no language name in code.

### RC3 [b/c] Refusal of unseen words is not loss-bounded and the frame prior is built on the wrong population; no word-internal (suffix/character) witness

- **Rungs / languages:** R2; eng, spa, rus, cmn, cmn-hans, arb, heb, fas, kor, jpn, fra, ita, por, pol, ukr, hin, vie, urd, tur, ell, fin (21 language-rungs implicated)
- **Evidence:** R2 fails in 21/25. B3 (lost true unseen naming occurrences, ceiling 0.05) fails in 16: eng 0.060, spa 0.077, rus 0.067, arb 0.210, heb 0.087, fas 0.073, kor 0.067, fra 0.064, ita 0.079, por 0.065, pol 0.101, ukr 0.170, vie 0.127, urd 0.064, tur 0.154, ell 0.168. 9 languages are at or below the all-nominal constant on nominal F1 (eng, cmn, cmn-hans, fas, kor, hin, vie, urd, fin); arb (+0.015, p=0.23) and rus (+0.016, p=0.0516) are above it but not demonstrated. The frame carries information everywhere it was checked (eng AUC .776 vs .581 deranged; spa .903 vs .560; cmn .685 vs ~.5; rus .791 vs .600) but at the 0.5 operating point it does not clear the base rate. Defects found on DEV: (eng) frame built from ALL hapax incl. NUM/PUNCT so unseen names refused as NUM; hapax are 57% nominal vs 74-77% for real unseen tokens; (spa) refusal fires when one non-naming class is only a bare plurality (30-49% of occupants are really nouns/names): DEV rule "refuse only when NAMING mass < 0.05" loses 0.66% vs 7.8% at precision .972; suffix prior lifts unseen AUC .9155 -> .9502; (rus) suffix class F1 .74 -> .87, frame x suffix .893; (cmn) last-character class AUC .807, frame x tail x head F1 .886 vs .760.
- **Fix:** (1) heard-nominals.js classAt (main agent): refuse an unseen word only when the frame distribution's NAMING mass (NOUN+PROPN) < KEY_ALPHA; keep MIN_SHARE only to decide which class to report. (2) New scripts/build-suffix-prior.mjs: SuffixPrior@1 from TRAIN hapax (final 2-5 letters, or last/first character for unspaced scripts) with a minimum support derived by exact binomial against the hapax marginal; combine with the frame by dividing out the marginal. (3) New frame builder (build-frame-prior.mjs may not be edited): rows only from the tokens the reader consults, class distribution of unseen words by K-fold pseudo-unseen rather than hapax (eng DEV F1 .813 -> .884, recall .94). Emit under a new file name for wiring.
- **Rule compliance:** Giver-named (UD train), derived counts; prior still only refuses/nominates; the threshold is the declared alpha (not fitted); fold count K is a provisional integer (report a sweep). Re-run on DEV first with the same B1-B3 rule and controls; TEST is spent (see split discipline).

### RC4 [b/c] No affix / contraction layer: ear inert for bound morphemes and MWT contractions; classAt resolves apostrophe forms through the wrong stem

- **Rungs / languages:** R1, R2, R3; spa, fra, deu, ita, por, ind, tur, ell, eng, kor (10 language-rungs implicated)
- **Evidence:** R1 fails with rule needs_ear_but_inert in 8 languages (spa, fra, deu, ita, por, ind, tur, ell); eng returns null only because need share .0175 is under a bare 0.02 floor (MWT-inner recall 1/354). Only arb, heb, kor, cmn, cmn-hans, jpn have an active ear; kor is FAILED by naive stripping (affix_only .854 beats the lexicon-gated ear; 1794/3115 gold boundaries lost to the lexicon gate). Unheard inside-run boundaries: arb 1327/3680, heb 462/2521, kor 2113/3115. Non-concatenative MWTs (del=de+el, au, des, zum) are unrepresentable by an ear that only inserts spaces (spa 982, por 1905, ita 589, arb 415, heb 920, fra 279, deu 266). Downstream: R2 leaks mwt_surface/apostrophe_glued rows (por 4378, arb 7927, heb 6308 unscored); spa DEV 79/176 verb+clitic forms classed nominal; eng "don't" classed PROPN 1.00 via forms["don"], possessives glued so a name splits across arafat / arafat's.
- **Fix:** (1) New builders (existing build-enclitic-prior.mjs reads only Korean lemma "+" splits): derive enclitics-<stem>.json from TRAIN MWT ranges where surface = stem + suffix and the suffix recurs (eng: 's n't 'm 'll 've 're 'd, hears 238/359 DEV MWT tokens at 0.03% false splits; spa: se le la lo ... with a VERB/AUX host guard, DEV precision .75 -> .943). grammarFor already auto-loads the file. (2) ear.js peelEnclitics host guard: commit a peel only when the stem's POS tally is host-class dominant at GRAMMAR_MIN_SHARE. (3) New ContractionPrior@1 (surface -> components, e.g. del -> de el) loaded by grammarFor and applied in ear.peel so the reader grid matches the grid the frame prior was built on. (4) heard-nominals.js classAt: strip a known enclitic BEFORE the apostrophe-stem lookup. (5) arb al- and tur/fin/hun suffixes need their own derived priors (typed gap until then).
- **Rule compliance:** Derived from the giver's own annotation, never typed (P4; min_count 30 is the existing provisional integer); peel commits only when the remainder is prior-attested (refuse/nominate, never admit); unseen stem keeps its glue as a typed gap; per-sentence so causal; no case read; no other language's grammar.

### RC5 [c/d] Claim path: figure-connector-figure adjacency reader cannot read who-did-what-to-whom; production applies English priors to every language

- **Rungs / languages:** R4; spa, rus, cmn, cmn-hans, arb, heb, fas, kor, jpn, fra, deu, ita, por, nld, pol, ukr, hin, vie, ind, swe, urd, tur, ell, fin (24 language-rungs implicated)
- **Evidence:** R4: 1 pass (eng, on 4 hits), 6 fail, 18 unmeasured (underpowered: fewer than 2 gold-pair hits). Hits/pairs: eng:4/122 spa:0/116 rus:0/73 cmn:9/189 cmn-hans:9/189 arb:14/237 heb:2/55 fas:0/52 kor:2/51 jpn:1/37 fra:0/119 deu:0/82 ita:0/92 por:1/113 nld:0/102 pol:0/57 ukr:1/68 hin:0/86 vie:1/95 ind:0/136 swe:1/116 urd:9/170 tur:0/36 ell:0/71 fin:0/42. Structural ceiling: gfp edges need two RECURRING non-function figures; eng DEV first 200 sentences: 54.1% of gold pairs have a PRON end, 12.8% have both ends nominal AND recurring; spa 23.4% both recurring; rus 8.9% at surface level. Edges are PP/possessive/apposition adjacency (district|of|columbia). roleConfig positional reader is OFF in production (spa derived: subject before verb 83%, object after 86%; rus roleConfig arm beats every control at p .043 where production has 0 hits). Every card carries gap english_priors_applied: reader-bundle loads pos-eng for all languages (inert for edges: 0/200 sentences change, but it is a Greenberg breach in code). role-config-eng was built from train+dev (DEV roleConfig numbers contaminated). arb loses to ear_off_tier_on (14 hits but ear hurts).
- **Fix:** New per-occurrence claim extractor beside relations-gfp.js (main agent): nominal heads typed by classAt (naming mass >= 0.5, outside a PP opened by a settled ADP), predicate = settled VERB/AUX, side from RoleConfig@1 (derived), clause-local via clause-spans.js, no recurrence requirement (recurrence admits a being; role evidence nominates a claim). spa DEV prototype: 18 hits at strict precision .150 vs 0 for production. Make reader-bundle.js loadPriors/dispatchExtractors language-aware: no prior => typed gap, not pos-eng. Rebuild role-config on TRAIN only and re-derive marker selection with a recall floor derived from the material (spa admitted marker ninguna at recall .0015). Pro-drop (no overt subject) is a typed gap. Reject edges whose ends fold to one figure.
- **Rule compliance:** Reconcile explicitly with the relations-gfp.js design law ("never write S/V/O onto a record"): either R4 is renamed to adjacency claims or typed role fields live behind the RoleConfig gate (RC8). Thresholds from the config's own null; sentence-local so causal; case-stripped; typed gap for languages without a prior.

### RC6 [c] R0 listener evidence rule: coverage is not a likelihood (Han lzh swallows cmn), exact ties resolved alphabetically, prior-less languages named as the nearest candidate

- **Rungs / languages:** R0; all 25 stems (24 language-rungs implicated)
- **Evidence:** R0 passes 19/25 against its gating controls, but 22 cards record that a character-bigram identifier does as well or better, so no card shows the listener needs word identity. cmn FAILS (accuracy .446 < floor .625; 55% of decided verdicts name lzh, whose 95%-single-character prior attests nearly every Han character: coverage cmn .925 vs lzh .922 on DEV); yue (no prior) named cmn-hans 58/58; production surface tier hears lzh for 11/40 declared-cmn sentences. DEV fix candidate (parameter-free length-weighted attested mass, the segmenter's own DP objective): per-stream accuracy 1.00 on all 8 cmn streams, specificity kept. Greenberg breach (reported, not gating): every card has oov_named_a_candidate (haw -> ind 60/60, mkd -> bul 58/60, ydd -> heb 59/60, pbu -> arb 59/60, pnb/skr -> urd 100%, nep/mai -> hin 100%, bel -> ukr 21/60). Near-twin ties (dev, ad hoc probes): srp 107/200 correct per sentence with 91 named hrv after 56 exact ties went to hrv alphabetically; slk 74% with 31 named ces (42 ties at top coverage); bul takes 8% of short rus sentences (10/16 exact ties). ces: sentence-initial capitals miss lowercase prior keys (language-listener.js does not lowercase), 6/201 typed gaps. Cold start: no minimum-observation floor.
- **Fix:** language-listener.js / language-grammar.js detectLanguage (main agent): (1) length-weighted attested mass per family, skipping the STRONG outright accept for families whose lexicons are mostly single characters (derive from the prior as priorIsUnspaced does); (2) exact tie at the top => language_unheard, never alphabetical order; (3) weight each attested form by 1/(number of candidate priors attesting it) and count only words >= wordFloor; require coverage above the coverage a deranged copy of the prior gets on the same text before naming, else typed gap (haw, mkd, ydd, pbu, bel, yue become silent); (4) lowercase before lookup; (5) minimum observations derived from the binomial power of the strong/floor/margin rule.
- **Rule compliance:** Typed gap, never another language's grammar (rule 3); STRONG 0.3 / FLOOR 0.1 / MARGIN 1.8 are declared constants and any new cut must be derived and pre-registered (rule 5, 6); causal and per-sentence unchanged.

### RC7 [a] Instrument problems: the test is wrong or cannot see the thing

- **Rungs / languages:** R0, R1, R2, R3, R4, R5; all 25 stems (56 language-rungs implicated)
- **Evidence:** 56 of 150 language-rungs are unmeasured. (R0) five stems are script-determined (cmn-hans, ell, heb, jpn, kor: one candidate in the script family or verdict survives scrambling), so R0 says nothing about reading; the pass rule has no instrument-level answer to char_bigram parity. (R1) the 0.02 NEED_FLOOR is a bare integer ratio: eng returns null at .0175 although the ear heard 0 of 399 inside-run boundaries and ind flips at .0202 (borderline CI). For whitespace languages with whole-word UD tokens (rus, vie, ukr, urd, pol, fas, hin, nld, swe, fin) site gold is empty or tiny, so R1 is vacuous, and for agglutinative tur/fin the UD tokenisation never marks suffix boundaries so "not needed" means "not annotated". (R2) the headline is positive-class F1 against an all-nominal constant on a 56-77% nominal base rate; the constant is nearly unbeatable by construction (AUC and lift are reported but do not gate); X-tagged gold counts as non-nominal. (R3) gold is UD PROPN only while the design admits NOUN+PROPN beings, so ledger-correct common nouns count as false positives (eng: PROPN|NOUN F1 .8915 vs PROPN .4802); deranged_constant is the gate switched off, not an independent control (A2); arb and kor have only 4 and 2 eligible PROPN blocks (sign test needs 5); 40-99% (stems with >= 20 gold names; eng 68%, spa 82%, rus 58%) of gold names are in the TRAIN prior (lookup, not hearing). (R4) gold = nsubj x obj head pairs, 54% pronoun-ended in eng, so a recurrence-figure reader has a hard recall ceiling; pass rests on 4 hits (eng) and underpowered rules return null for 18 languages; ear_off controls are unlicensed or degenerate (0 edges) in most cards. (R5) the TEST corpus (parallel-classics: pinocchio it/en/fi, alice de/en/fr/it) covers 5 of 25 stems and English-pivot only; units 12-36; matching is retrospective (S3, labelled); claims are not matched (claims_unmeasured). (all) the regression guard G0 is coupled to unrelated repo tests: 25/25 cards have guards.summary.ok=false only because of failing barker/law tests (3-8 failures, count moving between cards), and arb/cmn guards errored (pass null). TEST has been read once per stem (25 rows in test-reads.jsonl) and is spent.
- **Fix:** Instrument amendments (new files only; pre-register before any re-run): R0 add a prior-less-language arm that GATES (typed gap required) and report char_bigram parity as a standing caveat; R1 replace NEED_FLOOR with a derived need and always report MWT recall when the treebank annotates MWT, add a hyphen/abbreviation/entity-escape tokenisation statistic for spaced languages; R2 gate on a rank statistic (AUC/lift at fixed recall) beside F1, or score a calibrated operating point; R3 score PROPN and PROPN|NOUN as two registered arms, add a TRAIN-frequency-stoplist rival and a seen/unseen split as gating strata, require >= 8 eligible blocks or return a typed power gap; R4 raise the sample beyond 200 sentences, require hits well above the 2-hit minimum, license ear_off by perturbing something that moves edges; R5 add faust-part-1 (es), grimms (hu, de, fr, fi), robinson (nl, fr, fi, de), gulliver (it, nl, fi, hu) as declared units and add non-pivot pairs; add a power floor (units >= 30) before a pivot is read; decouple the card exit code from unrelated repo tests (record G0 as an informational guard) or scope it to reader paths.
- **Rule compliance:** Every amendment written into the file header before the first run (II.5); no threshold tuned after a result; controls built to fail with licences (II.23); gaps typed with denominators (rule 8).

### RC8 [d] Design conflicts with the reading rules and with the gold

- **Rungs / languages:** R3, R4, R5; all 25 stems
- **Evidence:** (i) beings = NOUN+PROPN nominal ledger vs a gold that is proper names; (ii) relations-gfp.js header forbids writing subject/verb/object onto a record, while R4 gold is subject-object pairs and the positional reader that knows sides is OFF; (iii) production applies pos-eng to all languages (rule 3); (iv) the standing gate conflates salience (said more than the language says it) with existence (the thing is there and recurs), which the memory note records as "recurrence is standing, not existence"; (v) R5 matching is retrospective by construction (S3) so it cannot support a causal claim; (vi) casedScript derived from letter category (RC2).
- **Fix:** Main agent decisions, not code patches: pick one definition of "being" (named entity vs nominal) and write the gold to match; rename R4 to adjacency claims or admit typed role fields behind RoleConfig; make the language dispatch language-aware; separate existence from salience; keep R5 labelled retrospective and add a causal variant that scores the prefix only.
- **Rule compliance:** Each is a conflict between existing code and READING-SPEC/READING-POLICY rules 1-4; resolve by amending the design document first, then the code, then the instrument.


### Fix grouping by kind

- (a) instrument: RC7 (plus the instrument halves of RC1, RC2, RC3 re-registration).
- (b) prior/data: RC3 (SuffixPrior, K-fold frame prior), RC4 (enclitic and ContractionPrior builders, train-only role-config), RC6 (nothing to rebuild; a missing-prior gap must be a typed gap).
- (c) mechanism: RC1 (gate), RC4 (peel host guard, classAt order), RC5 (claim extractor), RC6 (listener statistic).
- (d) design conflicts: RC2 (heard rule), RC5 (S/V/O law, English priors), RC8 (being definition, salience vs existence, retrospective R5).

## 7. Is the beings tier the wrong design?

The evidence splits, and the card refuses to collapse it.

**Strongly supported: the standing gate as an admission rule is the wrong mechanism.** Three independent instruments agree: the pre-registered reading-helps-falsify run (3 of 4 predictions falsified), R3 (23/23 languages fail K:lexicon_filter and K:shuffled; the deranged_constant control is by construction the gate switched off, so it is not a second control), and R5 (nominated >= keyed in fra on TEST and in spa, rus, cmn on DEV; eng DEV equal; on eng TEST the gate adds +0.021). The gate measures "said more than the language says it", which is salience; the gold asks for existence, and 40-99% (stems with >= 20 gold names; eng 68%, spa 82%, rus 58%) of recurring gold names are train-attested, so a common name is penalised for being common.

**Not yet shown either way: the nominated ledger as a whole.** For nominals it works: the ungated ledger finds PROPN|NOUN at F1 .73 (cmn) to .91 (rus), beats rawTop, rawTop@K, prior-scrambled and random-K controls, and passes the parallel-text agreement for eng, ita, fin. But three results say the credit belongs to the prior's lookup rather than to listening: (1) on the unseen stratum, where the prior has no vote, bare recurrence (rawTop) ties keyed (clause U:rawTop failed 17/23); (2) the lexicon filter, a stop-list derived from POS counts, scores above keyed in 20 of 25 languages; (3) the capital witness (non-causal, whole-block) beats the heard arm in 13/16 cased languages. R3's PROPN-only gold cannot adjudicate a nominal ledger (instrument conflict RC7/RC8), and no identity test exists: nothing here checks that two surface variants of one referent fold to one being, which is the part of the design the memory notes treat as the point.

**What would show the tier is wrong (pre-registered here, not run).** Prediction and pass rule, written before any run: on coreference-cluster gold (CorefUD where a language has it) or WikiANN-style entity gold, plus the UD PROPN gold, across >= 10 languages and >= 8 blocks each, compare (1) case-stripped string recurrence >= 2, (2) recurrence + prior-nominal filter, (3) arm 2 + current standing gate, (4) arm 2 + identity fold (lemma/declension/enclitic-peeled stem), (5) a TRAIN-frequency stop-list rival with no POS information, (6) capital witness (rival, labelled), with a deranged-prior arm and a shuffled-gold arm as controls. Predictions: P-B1 arm 3 does not beat arm 2 in >= 80% of languages (the gate adds nothing); P-B2 arm 2 beats arm 5 on the SEEN stratum and ties it on the UNSEEN stratum; P-B3 arm 4 beats arm 2 on cluster purity only for case-inflected languages (rus, pol, fin, tur, deu). The beings tier is judged wrong if arm 2 does not beat arm 5 on seen names (the prior's class information then adds nothing over frequency), OR arm 4 fails to beat arm 2 on cluster purity anywhere (identity as fold unshown). Every threshold derived from the material; every arm has a licence that the statistic moves under perturbation. Gold names outside UD need a download the user must approve; nothing was fetched.

## 8. What this card does NOT measure

- **Held-out freshness for any fix.** TEST is spent for all 25 stems; a re-run on the same TEST would be a second read. Fresh draws need a different treebank per language (for example a second UD treebank of the same language) or parallel UD test sets; none is staged.
- **Claims, negation, time, modality, evidentiality, quotation or attribution.** R4 is subject->object head pairs only; no negation scope, tense, aspect, reported speech ("X said that Y") or non-subject-object relations.
- **Coreference and identity.** No pronoun resolution, no name-variant fold, no cross-sentence entity identity gold. R3 scores recurring PROPN forms, not referents.
- **Named entities outside UD gold.** UD PROPN is not NER: no entity types, no multiword names, no nested names, no caseless-script NER gold.
- **Morphology.** R1 only sees UD token boundaries and MWT ranges; it cannot see suffix boundaries in tur/fin/hun, root-and-pattern morphology in arb/heb, or Korean eojeol splits beyond what the treebank annotates. "Not needed" there means "not annotated". No test that inflected forms of one lemma fold to one being.
- **Code-switching and mixed text.** R0 reads one language per stream; the cross-family switch is measured only on stream concatenations (eng>deu settles in median 11 sentences, eng>rus in 1, same-family jpn from cmn 20), not in-sentence mixing.
- **Dialect, register, orthography variants.** Only "non-standard English" is on the data list and it was not scored; no Arabic dialects, Swiss/Austrian German, Brazilian vs European Portuguese, Simplified vs Traditional beyond the two cmn stems, romanised Hindi/Urdu, SMS or chat in any language.
- **Cross-language agreement beyond English-pivot beings.** 5 of 25 stems; no claims; matching is retrospective.
- **Causality of R5 matching** (S3-labelled); only ledger causality is checked.
- **Languages without a prior.** They are typed gaps by design, but R0 names them as a neighbour (Greenberg breach, not gating).
- **Length and domain.** R0 cold start is sampled at 60-sentence streams; R4 reads only the first 200 TEST sentences; genres are whatever the treebank holds (news, web, wiki, fiction).
- **Anything about the 31 expansion stems on TEST**, and the guard G0 (repo regression), which is a repo-health signal, not a reading signal.

## 9. Completeness critique: what a real polyglot reader would still need

Missing from the card (and mostly from the reader):

1. In-sentence code-switching and script mixing (Hinglish, Arabizi, Taglish, Chinese-English), with a per-span language label.
2. Dialect and register: a dialect continuum is a gap of its own kind; Greenberg breach shows up first there (yue -> cmn-hans 58/58, ydd -> heb 59/60, srp/hrv ties).
3. Morphology folding for coreference: case-inflected surface forms (rus 18 of 54 recurring PROPN lemmas per block have no recurring surface form), Arabic definite article, clitic hosts, Turkish/Finnish/Hungarian suffix chains, Korean particles. This is where a ledger that counts surface forms loses identity.
4. Named-entity gold outside UD: WikiANN-style multilingual NER, CorefUD for coreference, a caseless-script NER set; typed entities (person/place/organisation).
5. Claim semantics: negation, modality, tense/aspect, quotation and attribution, pro-drop and zero anaphora (spa 160 objects with no overt subject), passives and non-nominative subjects, ditransitives.
6. Time: event ordering, date and duration expressions, temporal anchoring, tense across languages.
7. Number and unit expressions and their agreement with beings; dates as names.
8. Parallel evidence at the claim level: a dictionary-free claim matcher with a deranged-unit control; sentence-level aligned corpora (UD PUD test sets are sentence-aligned across ~20 languages; availability to be verified before relying on it).
9. A causal R5 variant, and non-pivot pairs to test transitivity.
10. Power and denominators for every rung per language (units >= 30, blocks >= 8, hits well above 2).
11. Speed and cold-start: first-decision latency is reported in R0 only.

Languages in the world with a UD treebank that have no khora prior at all (check each against the current UD release before building; sizes vary widely): Belarusian, Icelandic, Faroese, Norwegian Nynorsk, Albanian, Kazakh, Kyrgyz, Tatar, Uzbek, Turkmen, Mongolian, Kurdish, Pashto, Bengali, Nepali, Kannada, Malayalam, Odia, Sinhala, Burmese, Thai, Lao, Khmer, Filipino/Tagalog, Cebuano, Javanese, Swahili, Yoruba, Amharic, Hausa, Coptic, Old English, Gothic, Old Church Slavonic, Old East Slavic, Middle French and Old French, Cantonese, Breton, Scottish Gaelic, Manx, Macedonian, Ukrainian dialect and Rusyn varieties, Western Armenian, Kurmanji, Guarani, Quechua, Hmong, Nigerian Pidgin, Naija and other creoles, and a long tail of indigenous-language treebanks (for example Inuktitut, Yupik, Apurina). Latin, Ancient Greek and Sanskrit have priors but no eval split on disk. Even within the 56 stems that have priors, only 25 have a TEST card.

## 10. Provenance and honesty notes

- The input handed to the synthesizer was truncated mid-way through the cmn card and listed none of the later stems. The matrix and per-rung tables therefore come from the 25 TEST card files directly; the diagnoses for eng, spa, rus and cmn are the measurement agents' DEV probes (diagnostic evidence, not tuning on TEST); root-cause statements for other languages are derived from card notes and gaps and are marked as such by the cited numbers.
- The instrument build/review reports (R0 v2 with amendments A1/A2; all reviews returned "needs fixes" and the fix and measure agents died) are acknowledged: R0 v2 was rebuilt under A2 with a pinned inventory and 51 tests, but the other instruments' reviewer findings that this card has not seen in full (the review text was cut) are not claimed to be resolved. The R0 inventory pin is `r0-inventory.json`.
- Instrument predictions that failed are failures: R0 A2-8 (yiddish named heb 59/60) and A2-2 for cmn; the cmn-hans R0 pass of the v1 instrument became script-determined (no claim) under v2.
- Lovelace/notation (no code priors, no notation families), Barker, law and physics work are out of this card: the instruments and the pre-registration documents exist, but nothing from them was run into this card, and the 3 repo regression failures sit in that unfinished work.
