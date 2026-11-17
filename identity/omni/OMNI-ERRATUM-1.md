# ERRATUM 1 to OMNI-PREREG.md (43205d94…), filed before any result was computed

Prompted by an independent review from the "Math capabilities" session (the user asked it to review the
preregistration). At filing time the entity fetch was still running and no run or score existed.

## Deviations, now corrected
- Turkish (Q256): the ordered query had timed out and an unordered sample was used. Retried ordered (bounded, 3 tries):
  succeeded on try 1, 120 items. The unordered ids and entities are set aside in `ids/Q256.json.unordered-superseded`
  and `superseded/`, and are not used.
- Swahili (Q7838): ordered retry succeeded and returns 34 items, all that exist under the criteria. It stays too thin
  (< 40) and out of the bars, as preregistered.

## O1 replaced (multiplicity): exact intervals, per language and pooled
Per language, one-sided 95% Clopper–Pearson bounds on the true-pair contradiction rate. A language FALSIFIES soundness
only if its LOWER bound exceeds 5%. A language whose UPPER bound exceeds 5% is reported as "cannot show <= 5% at this
n" (e.g. 0/42 bounds the rate only at 6.9%), not as a pass. Pooled over unique people (below): HOLDS if the upper bound
is <= 5%, FALSIFIED if the lower bound exceeds 5%, otherwise INCONCLUSIVE.

## Adjudicating a contradicted true pair
In split-half, every contradicted true pair is the item holding two values the rule reads as rival. Each is classed:
`rank-permitted` if every convicting proof is a single-best-value rule on a property where the item has a
preferred-rank statement (the rule allows alternatives; rank is unused, a known gap, so this is a rule MISFIRE);
otherwise `record-disagreement`. O1 counts BOTH (conservative); the split is reported beside it.

## Independence
A person with several P1412 values can appear in several language samples. Pooled O1 counts each person once (their
first language in sorted id order); the number of repeat appearances dropped is reported. O3 (Spearman) and the
per-language power are descriptive only; independence across languages is not claimed.

## Limitations stated, not fixed
"First 120 by item id" takes the lowest ids (older, more-edited items). P1412 values are often macro-language items
(Chinese, Arabic, Greek), so coverage of each language's speakers is partial and uneven.

## Scripts and selection files under this erratum (sha256)
- `langs.json` 3250e224b975d993cde2bf5717552390f993a7335fc7e7bdb26bf5948cc30d61
- `fetch-ids.sh` ada8f6baad8fceaba64a43b70fec73f0f0c3733ba6be664b9d2dccd321114e28
- `fetch-entities.py` f1d74e2a4a8c8a89c4d1cdae3b11968ef833095a0550ebb047c83983d1caf0c2
- `omni-run.sh` ab5a992b787e690e30232aafb09f4d7d9ad4813eab4115bdb5b3d00733e902bf
- `omni-score.py` 18b55ea1b8c0d18302787596f7da271b0d0829cc0dd4bde0812fc9cd9921cd03
- `real-rules.mjs` 6f2eb7963a182d52eaba4c57fb3ef087f4ee64119fd5c39c245c461cd7405786
- `ids/Q11059.json` 66108bbd63a1660f
- `ids/Q1321.json` 290959578e5fc81f
- `ids/Q13955.json` 97a8e52d23ee83ee
- `ids/Q150.json` 812559f026617c08
- `ids/Q1568.json` 9baf9699e0b4691c
- `ids/Q1860.json` ea7fbc39f67d1f6b
- `ids/Q188.json` 0db0142ce97468f3
- `ids/Q256.json` 373a1a78beb75a2e
- `ids/Q28244.json` ccc2d2c7ff73e792
- `ids/Q36730.json` e4c09a63db21706b
- `ids/Q397.json` 8d92b9bb919a2625
- `ids/Q5146.json` 5d3dea7f0b51a617
- `ids/Q5287.json` f007ab00e638fad8
- `ids/Q5885.json` c17fab383ec961f5
- `ids/Q652.json` 95d3d50572385ffe
- `ids/Q7737.json` 39f2712bb1873b44
- `ids/Q7838.json` 69b1d2147da21627
- `ids/Q7850.json` 2c42f896ed093c15
- `ids/Q809.json` 9bc480bcde59bf16
- `ids/Q8641.json` 619cfe37a937dcd4
- `ids/Q8798.json` 8b4eeea3885f4c6e
- `ids/Q9027.json` c29b7d2e8969f30f
- `ids/Q9043.json` a533b8d2ded41068
- `ids/Q9056.json` 19bcd268c32db92c
- `ids/Q9067.json` 74e24307ab6e66e3
- `ids/Q9129.json` 573c590f3e86178d
- `ids/Q9168.json` fb4c77d1fb2bff6a
- `ids/Q9176.json` 76d1ca57c1f90c82
- `ids/Q9199.json` f6b69f1bef097ebc
- `ids/Q9217.json` bb8652f960a77e7f
- `ids/Q9240.json` cd0fba6510720111
- `ids/Q9288.json` 5a5322c14920cdba
- `ids/Q9610.json` 2ddd6f85cea67d75
