# PREREG-ROUND20 NOTE 7 — does the Born rule help? Calibrating the exponent of the presence activations (registered before the fit or any score)

The user's question: does the Born rule help at all? The rule says a probability is the squared magnitude of an amplitude. For our non-negative candidate activations a_i that is P_i = a_i^2 / sum_j a_j^2, a sharpening exponent k = 2; it adds no information to the ranking. What can be measured: whether k = 2 calibrates the activations better than other exponents.
## Measure
The presence rung's candidates (after the gender and non-personal gates, with the floor and margin NOT applied) at every pronoun whose gold entity is in the cast and whose gold being is among the candidates; P_k(i) = a_i^k / sum_j a_j^k; the loss is the mean negative log-probability of the gold being (log loss) and the mean Brier score.
- k is fitted by minimum log loss over a grid {0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6} on the training slices E, C, D, F (never U), then evaluated on U (66 documents) with the fitted k*, with k = 1 (linear) and k = 2 (Born).
- B1: k* differs from 2 by more than the bootstrap spread of the fit (95% interval over documents does not contain 2): then the Born exponent is not special; if it does contain 2, it is as good as the calibrated one, and the rule's contribution is only the exponent.
- B2: log loss and Brier at k = 2 against k = 1 on U, bootstrap over documents.
- B3 (the order effect, descriptive): not tested here.
Reported without a bar: the share of pronouns whose gold being is a candidate at all (the ceiling any exponent has). Failures reported. Nothing tuned beyond the single fitted exponent, which is the quantity under test.
