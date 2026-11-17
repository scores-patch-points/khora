# Addendum B (written after the v1 evaluation reads; the v1 results and their stamps stay as they are)

Written 2026-11-17 after reading the v1 numbers (identity/pronouns-multilingual/san/RESULTS-SAN.md, section "v1"). v1 = commit a479929.

## What v1 showed that I then changed
Of the 105 bound pronouns on the Panchatantra, by eye about two thirds went to a being that is not a character (tataś "then", nāma "named", sukhaṃ "happiness", 'pi "also", maryādā, kasmiṃścid). Two causes are SPELLING gaps in the final-sound closure, not dials: the treebank spells tatas with a final -s and v1 closed only forms ending -ḥ, so tataś looked unseen; and an elided initial a is written ' ('pi for api, 'haṃ for aham) so those looked unseen. v2 (a2 below) closes both, in native/adapters/text/sanskrit-sandhi.js. Nothing else changed: dials, register, cast rule, fold are v1's.

## v2 evaluation (frozen before running)
- Fresh, unread slices: Panchatantra chunks at a shifted grid (GRID_SHIFT 0.25, 12 chunks of 12,000 characters), which overlap the v1 chunks little or not at all (I check and report the overlap).
- v1 is run on the SAME fresh slices from a clean checkout of a479929 (the harness copied in), so v1 and v2 are paired.
- Predictions (can fail): (B1) v2 binds fewer pronouns to the junk words named above (tataś, nāma, 'pi, 'haṃ): their count of bound pronouns falls to <= half of v1's on the same slices. (B2) pooled contradiction lower bound stays below its permuted null for both v1 and v2 (the falsifier carries gender information in both). (B3) the total number of bound pronouns changes by less than 30% either way. (B4) v2 does not make the share of bound pronouns on character-like beings, judged by eye from the printed top beings, worse.
- The v1 outcomes of H1-H11 are reported as they are in RESULTS-SAN.md; v2 is reported as a post-evaluation fix on fresh data, not as a replacement of the v1 outcomes.
