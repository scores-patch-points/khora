# Is the name shape in the company? — results (2026-10-06/07)

Question (the user's belief, tested in its best form): a name has a specific shape in the holograph, specific to word-order language families; "you know a word by the
company it keeps". Instrument: `eval/law/name-company.mjs` (pre-registration in its header; header sha256
`c3234d9b030573ca82c85049929c35cb65d1eafd4c16dd4344de018cb03652e1`, identical in both runs). Reports: `results/name-company/report.json` (first run) and
`results/name-company-pairblocks/report.json` (amended run, `NAME_COMPANY_PAIRBLOCK=1`).

## What was measured

For one token occurrence: the **company profile** = its two left and two right neighbours, each coded only by the neighbour's frequency-rank bin in that language's own
text (12 log2 bins + edge). No neighbour string, no capital, no POS prior, no list. Positive = a proper-noun occurrence (UD gold UPOS, 25 treebanks; IRC: a word equal to a
nickname that spoke that day). Negative = an ordinary open-class occurrence paired on form frequency, within-sentence position, character length and sentence length.
Strata: LATER (not the form's first occurrence) and FIRST (first occurrence: the single-mention case). The learner is a ridge-logistic probe on held-out position
blocks; it exists to ask whether a shape is *there*, not as a proposed production rule (a production rule would have to be zero-shot).
Arms: LEFT (prefix only, causal), RIGHT, BOTH, and the rivals POSITION / CHARLEN / FREQ.

## A control failed, and what I did about it (read this before the numbers)

In the first run the POSITION control, which was matched out and must sit in [0.45, 0.55], sat at **0.38** (RIVALS 0.36). It cannot be a real signal, so I diagnosed it
(`name-company-diag.mjs`, post-hoc): the two members of a matched pair fell in different sentence-quartile blocks, so removing a block unbalances the training cells in the
opposite direction (leave-block-out anti-learning). Re-blocking each pair by its positive member's block returns POSITION to 0.49–0.51 on all five languages tried. I then
added `NAME_COMPANY_PAIRBLOCK=1` (a dated amendment in the code; unset it reproduces the first run exactly) and re-ran everything. C1, C4 and C5 use blocks and change; C2
and C3 train and test on whole languages and are identical in both runs. **The amended run is the valid one**; the first run's company arms were biased downward and its
"beyond rivals" margin (+0.23) was an artefact of rivals sitting far below chance. Caveat on order: I had seen the first run's P3 miss (11 of 23 languages where 12 were
required) before the amendment; the amendment was motivated by the control failure, and both numbers are reported.

## Results (amended run unless marked; 22 non-thin languages LATER, 23 FIRST)

| | first run | **amended run** |
|---|---|---|
| POSITION / CHARLEN / FREQ / RIVALS control, LATER mean AUC | 0.38 / 0.41 / 0.43 / **0.36 (control FAILED)** | 0.500 / 0.500 / 0.501 / 0.501 (ok) |
| BOTH, LATER, mean AUC; languages ≥ 0.60; ≥ 0.65 | 0.608; 14; 7 | **0.615; 14; 7** (permutation q95 mean 0.552) |
| LEFT, FIRST (prefix only), mean AUC; languages ≥ 0.60; ≥ 0.65 | 0.598; 11; 6 | **0.624; 14; 9** (q95 mean 0.543) |
| BOTH, FIRST, mean; ≥ 0.60; ≥ 0.65 | 0.637; 16; 8 | 0.655; 19; 12 |
| C5 BOTH+RIVALS − RIVALS (LATER), mean [CI], languages ≥ 0.03 | +0.228 (invalid) | **+0.115 [0.091, 0.139]**, 20 of 22 |
| C5 LEFT+RIVALS − RIVALS (FIRST) | +0.200 (invalid) | **+0.118 [0.094, 0.141]**, 22 of 23 |
| C4 word-order shuffle, BOTH over 8 languages | mean 0.602 → 0.494 | **0.612 → 0.516** |

Other tests (identical in both runs):
- **C2 family transfer** (train on same-family vs an equalised other-family set; BOTH, LATER): 2-family scheme same − other = **+0.033** [0.006, 0.059], but same > other in only
  **12 of 22** languages (sign p 0.33); 3-cluster scheme **+0.006**. SOV-like languages individually: hin +0.06, urd +0.07, tur +0.06, but fas −0.02, jpn −0.01, nld −0.04.
- **C3 cross-register**: UD pooled → IRC **0.457** (UD-English → IRC 0.467; SOV-like → IRC 0.529); IRC leave-one-day-out **0.607**; IRC → UD-English 0.505. At FIRST (LEFT): UD → IRC
  0.515, IRC leave-one-day-out 0.526. The IRC position arm is in band (0.528 / 0.546), so the IRC numbers are properly controlled.

## Verdicts and predictions

| | registered rule | result |
|---|---|---|
| COMPANY SHAPE EXISTS | BOTH LATER ≥ 0.65 in ≥ 15 languages, mean above q95, and C5 | **NO** — mean is above q95 and C5 holds, but only 7 of 22 languages reach 0.65 |
| SINGLE-MENTION (causal) | LEFT at FIRST ≥ 0.60 in ≥ 12 languages, mean above q95 | **YES in the amended run** (14 of 23, mean 0.624 vs q95 0.543); missed by one in the first run |
| FAMILY-SPECIFIC | same − other ≥ 0.03 and same > other in ≥ 70% | **NO** — +0.033 but 12 of 22 (55%) |
| REGISTER-ROBUST | UD pooled → IRC ≥ 0.60 | **NO** — 0.457 |
| COMPANY (not counts) | C4 brings company arms to within 0.03 of the shuffled POSITION arm | **Only in aggregate** (mean 0.516, within 0.02 of chance); per language eng +0.04, fas +0.06, jpn +0.13 above the shuffled position arm |

Predictions: P1 failed (7 vs 15 languages). P2 held (C5, with a valid control). P3 held in the amended run (14 vs 12). P4 held (not family-specific). P5 failed (0.457).
P6 partial (see C4).

## What it says, and what it does not

- A language-general company shape exists. A profile built only from the frequency-rank bins of four neighbours, with no string, capital or prior, separates proper nouns from
  position-, length- and frequency-matched open-class words at about 0.62 (0.66 with right-side lookahead), above its permutation limit, and word-order shuffling takes it
  back to about 0.52. It is modest: only 7 of 22 languages reach 0.65 later. Strongest: fra 0.73, spa 0.69, fas 0.69, urd 0.69, heb 0.68, hin 0.66, por 0.65 (three of them SOV-like); weakest: tur 0.48, ukr 0.53, pol 0.55, fin 0.55, deu 0.55 (several of these have 80–200 pairs).
- It is audible at the **first mention** from the prefix alone (LEFT, FIRST 0.624; 14 of 23 languages ≥ 0.60). First mentions scored as high or higher than later ones
  (BOTH 0.655 vs 0.615). That is the single-mention rule seen through company rather than through ablation, and the ablation record could not do it (floor-1 test pending).
- It is **not** specific to word-order families as tested. The mean gain from same-family training is 0.033 and its language-bootstrap interval excludes zero, but the
  gain is not consistent across languages (12 of 22) and the 3-cluster scheme gives nothing. Post-hoc, not a test: the positive differences concentrate in Romance (spa +0.13,
  fra +0.18, ita +0.14, por +0.08) plus rus +0.10, ell +0.10 — relatedness may explain more than word order. A phylogeny-controlled design would be needed to separate them.
- It does **not** transfer from treebank text to chat (0.457). Inside chat it exists at about 0.61 (LATER) but is near chance at first mention (0.526). The shape is
  register-bound. Together with ant-code (code identifiers: the signal there is neighbour-company diversity, reversed in polarity on IRC), the lesson is that the signal
  lives in the company, not in the ablation record, and its sign and size depend on the register.
- Not covered: neighbour-identity features (language-specific), production-reader nomination, SMS/Enron, languages with fewer than 60 matched pairs (`thin`: arb, kor, swe at LATER; arb, swe at FIRST), and
  Japanese, where the shuffled stream scores as high as the real one (0.617 → 0.662 on 88 pairs), which I have not explained.
