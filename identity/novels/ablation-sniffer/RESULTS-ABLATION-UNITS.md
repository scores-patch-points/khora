# RESULTS — larger units: phrase and clause ablation (REUSED SPLIT)

Preregistered (`PREREG-ABLATION-UNITS.md`, sha256 684e4305…), frozen 2026-11-24T04:02:11Z with `unit-eval.mjs` (sha256 614027dc…) and the module at its new hash (ab6e51d2…; one additive export, `unitTexts`), run **once** per stage (English 04:03 to 04:07, cross-language 04:07 to about 04:25). Same lemma split, treebank, labels and embedders as `RESULTS-ABLATION-SNIFFER.md`; the occurrences differ (verbs that head a subordinate clause), so this is a reused split and I had seen the first test's results. No deviation from the freeze. Raw output: `RESULTS-UNITS-english.json`, `RESULTS-UNITS-cross.json`.

## Verdict: FALSIFIED at both stages. Larger units made the negative space worse, not better.

**English** (`nomic-embed-text`, 421 held-out clause-head verbs over about 90 lemmas, 6 classes present, chance balanced accuracy 0.167). Balanced accuracy, arms trained on the same level:

| level (mean tokens) | A negative space | size-matched control | B bare unit | F fusion | shuffled null p97.5 | cos(negative space, bare unit) |
|---|---|---|---|---|---|---|
| L0 verb (1.0) | 0.230 | 0.077 | **0.619** | 0.422 | 0.270 | 0.158 |
| L1 phrase (5.8) | 0.215 | 0.086 | **0.443** | 0.240 | 0.282 | 0.367 |
| **L2 clause (6.6), the verdict level** | **0.141** | 0.082 | **0.439** | 0.178 | 0.311 | 0.396 |

At the clause level all three required claims fail: H1 (beats shuffled labels: 0.141 against 0.311), H2 (beats the size-matched control: interval −0.022 to +0.142) and H3 (beats the unit's own embedding: interval −0.463 to −0.051, the bare clause wins).

- **H5 fails:** fusing the negative space with the bare unit makes it worse, not better, at every level (fusion minus bare: L0 −0.370 to −0.058; L1 −0.369 to +0.064; L2 −0.424 to −0.020).
- **H6 fails the other way:** the clause negative space is worse than the word's (A2 minus A0: −0.210 to −0.024), not better.
- **The negative space is unit-specific at the word and phrase level** (H2 holds at L0 and L1: controls sit at 0.08), but unit-specific is not enough: it never beats the shuffled null in this setup.
- Against the canonical word centroids (descriptive): word 0.361, phrase 0.275, clause 0.288.

**Cross-language** (`qwen3-embedding:4b`, 405 clause occurrences, 27 languages, 9 classes, chance 0.111; centroids the canonical word centroids, leave-one-language-out):

| A negative space | control | B bare clause | F fusion | null (mean; p97.5) | cos(negative space, bare clause) |
|---|---|---|---|---|---|
| 0.195 | 0.049 | **0.350** | 0.336 | 0.115; 0.238 | 0.401 |

H1 fails (0.195 against 0.238). H2 holds (A minus control +0.081 to +0.229). H3 fails (A minus bare −0.194 to −0.010, the bare clause wins). H5 fails (fusion minus bare −0.053 to +0.023: fusion adds nothing).

## What it adds
- **The negative space is not a noisy copy of the unit's own embedding.** Its cosine with the unit rises with the unit's size (0.16, 0.37, 0.40 in English; 0.40 across languages) but stays near 0.4 even for a whole clause. What is left is sentence-level residue that does not help the classification, which is why fusing it with the bare unit lowers accuracy.
- **What works is the unit's own embedding.** The bare clause text sorted by the canonical word centroids scores 0.350 across 27 languages (the bare word scored 0.282 in the first test); the bare word scored 0.614 in English. That is a nearest-centroid sorter on unit embeddings, which already exists in the repo (`pos-smell.js`).
- **Prediction record.** H3 and H5 as predicted. Wrong on H1 (I predicted it would hold; the delta centroids built from a small, lopsided train set, 800 occurrences with 1 SUP and 39 REC, did not clear the null) and wrong on H6 (I thought it might hold; the effect is significantly negative).

## Limits
Reused split; the unit's gold is its head verb's label (declared, a clause may act differently); English has about 90 test lemmas, few in the rare classes; the delta centroids at unit level come from far fewer occurrences than the canonical word centroids; one embedder per stage; the larger unit's centroids in stage 2 are word-sized (the mismatch handicaps A and B alike). Not tested: non-verb units, a downstream-loss ablation (what the sentence's meaning, in a task, loses without the unit) in place of an embedding cosine, token-level attribution inside a model.

## Wiring
None. Nothing in the priors home, nothing in any reader path; `native/adapters/text/ablation-sniffer.mjs` stays untracked and unused.
