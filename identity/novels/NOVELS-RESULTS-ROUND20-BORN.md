# Round 20 / NOTE 7: does the Born rule help? The exponent of the activation-to-probability map

Preregistered (PREREG-ROUND20-NOTE-7.md, 2026-11-18T04:46:29Z); one fit on the training slices E, C, D, F, one evaluation on U (66 documents).
- Pronouns with a candidate set: 1,070 (train; the gold being is among the candidates in 930) and 552 (U; 551).
- Fitted exponent k* = 1. Log loss on train by k: 0.25: 1.807, 0.5: 1.506, 0.75: 1.357, 1: 1.294, 1.5: 1.313, 2: 1.407, 3: 1.681, 4: 1.982, 6: 2.598. Bootstrap 95% of k* over documents: 0.75 to 2, which contains 2.
- U: k = 1: log loss 1.530, Brier 0.557; k = 2 (Born): log loss 1.632, Brier 0.447 (sharper). Log loss at k = 2 minus k = 1: 95% [-0.344, +0.574], includes zero.
- B1: the interval contains 2: the Born exponent is not rejected; the fitted exponent is 1, not 2; the squared form is not special. B2: no significant difference. B3 (non-commuting questions, an order effect) was not tested.
Reading: squaring non-negative activations is a power transform of the same ranking; it adds no information, and the calibration shows neither an advantage nor a harm. Interference (signed amplitudes) and order effects are the only places the rule could carry content, and neither is tested here.
