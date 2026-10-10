# Do proper nouns have a specific shape in the holograph? (name-shape.mjs, 2026-10-06)

Instrument: `eval/law/name-shape.mjs` (pre-registration in its header; sha256 in `results/name-shape/_report.json`). 25 languages, UD DEV used only for gold
class labels, case-stripped, impact.mjs's three prior-free readers, 4 windows of up to 128 sentences per language, joint ablation of ALL tokens of a class.
Objects: shadow (typed slot changes when the class is removed), imprint (which slots the class fills), collateral shadow (changes outside the slots it
filled), amplification (collateral / direct). Word-order families are k-means (K=3) over each language's measured subject-before-verb and
object-before-verb shares (role-config priors): SOV-like {fas kor jpn nld hin urd tur}, and two SVO-like clusters.

## Result: shape NOT shown; family-specific NOT shown

| test (pre-registered threshold) | result |
|---|---|
| T1 the PROPN shadow differs from the shadow of deleting the same number of equally frequent words (>= 18 of the informative languages) | **1 of 20** (cosine to the random-set shadow ~0.98 nearly everywhere) |
| T2 the PROPN shadow reproduces across window halves and differs from NOUN / VERB / ADJ shadows (>= 18 of 25) | **12 of 25** |
| T3 a held-out token is labelled by its resemblance to the PROPN shadow (mean AUC >= 0.60) | **0.545**; >= 0.60 in 4 languages; above its own permutation limit in 6 of 24 |
| T4a shadows are more alike within a word-order family than across (p <= 0.05) | +0.010, **p = 0.16** |
| T4b a prototype from the same family labels better than one from another family (>= +0.03) | **-0.004**; same-family better in 8 of 24 |
| T4c imprint shape by family / collateral shape by family | p = 0.90 / p = 0.21 |
| T5 the PROPN imprint differs from the imprint of random frequency-matched words | **2 of 15** informative |
| T6 amplification of PROPN deletion exceeds that of random deletion (>= 18 of 25) | **4 of 25**; mean 2.42 for PROPN vs 2.80 for random |

Controls held: sham deletion changes nothing; the joint ablation is deterministic. Pre-registered predictions P1-P5 and P7-P9 failed; P6 held (the SOV-like
family is recovered from measured order: fas kor jpn hin urd tur, plus nld).

## What it does and does not say

- With these readers and this representation, deleting all the proper nouns leaves the same kind of hole as deleting any equally frequent words, and the
  hole is not family-specific. Names are not anchors that the field rearranges around: deleting them disturbs the field slightly LESS than random words.
- Names often fill no slot at all in these readers (no-slot share 0.22-0.86), because the prior-free readers only form slots from recurrences.
- **This does not close the user's claim.** The representation used here is deliberately coarse: a normalised 24-cell distribution, which throws away
  magnitude, the radius bands of the 85-d signature, the activation/atmosphere channel (recall, novelty, reach) and the span channel. The only positive
  hint remains the fitted classifier on the whole signature (AUC 0.75 on War and Peace; 0.63 at first mention). The test that would answer the user's claim
  is a cross-validated, learned shape over the FULL record on non-formatted gold (IRC nicknames), by word-order family, and/or through the production
  reader (which hears names through priors), not through the three prior-free readers.
