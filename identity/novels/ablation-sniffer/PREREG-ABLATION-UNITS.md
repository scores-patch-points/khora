# PREREG — does ablating a LARGER unit give a negative space that identifies the cell? (REUSED SPLIT)

Written 2026-11-23, before the one run. Frozen with `FREEZE-ABLATION-UNITS.md` (sha256 and UTC of this file, `unit-eval.mjs`, `embed-client.mjs`, `native/adapters/text/ablation-sniffer.mjs` at its new hash, and the previous freeze).

## Reused split, and what I already know
The first ablation test (`RESULTS-ABLATION-SNIFFER.md`) falsified the claim for single words: the bare word beat the negative space (English 0.614 against 0.435 balanced accuracy), and in 28 languages the negative space was unit-specific but no better than the bare word. I proposed larger units as the next test because one word's removal moves a sentence embedding very little (cosine 0.95), so a phrase or a clause should leave a larger, cleaner negative space. This design follows from those results, so it is not independent of what I knew. What is held fixed: the lemma split (sha256 mod 5), the treebank (UD English-EWT), the gold, the embedders, the centroid words (same cached embeddings), the seeds. What differs: the occurrence set (verbs that head a subordinate clause only) and the units.

## The claim under test
Remove a larger unit (the verb's phrase, the verb's whole clause) and the negative space identifies the unit's cell, better than the unit's own embedding does, and in a way that is the unit's effect and not the sentence's.

## Units (declared now)
For a VERB token v with a gold label whose relation is `advcl`, `ccomp`, `xcomp`, `acl`, `csubj` or `parataxis`:
- **L0**: v alone (the replication on this occurrence set).
- **L1, the phrase**: v and everything that hangs on it except its subject (`nsubj`, `csubj`, `expl` subtrees are left out).
- **L2, the clause**: v's whole subtree, subject included. Removing it leaves the matrix clause.
**Gold for every level is v's operator and alternative** (the study's LLM-giver label). That a clause acts in the cell of its head verb is a declared rule (`unit-karaka.mjs`: a clause's role is its head verb's), not a measurement; a clause could act differently from its verb and this test cannot see that.
Kept only if the clause has at least 3 tokens, the rest of the sentence at least 3 tokens and 2 non-punctuation, and a **size-matched control** exists at every level: a run of other words of the same length, outside the clause, not all punctuation, chosen by a seeded hash.

## Arms (each level L; centroids built on train lemmas at the same level)
- **A_L (the claim)**: negative space of the REMOVED unit against delta centroids of the same level.
- **C_L**: negative space of the size-matched control against the same centroids.
- **B_L**: the unit's own text embedded (L0: the lemma) against bare-unit centroids of the same level.
- **F_L (fusion)**: cosine to the delta centroid plus cosine to the bare-unit centroid, per class.
- Descriptive: A and B against the canonical word centroids (Aw, Bw); the mean cosine between the negative space and the unit's own embedding.
Stage 1: English, `nomic-embed-text`, up to 150 train occurrences per operator, up to 600 test occurrences (dev + test of EWT). Stage 2: 27 languages, `qwen3-embedding:4b`, the clause level only, up to 15 per language (at least 8), centroids the canonical word centroids built leave-one-language-out (the level-matched train deltas are too many embeddings for this model), so stage 2's arms are A, C, B, F against those.

## Hypotheses and the decision (no hand-set threshold)
Balanced accuracy is the metric (a constant guess scores 1 over the classes present). Bootstrap over lemmas, 2,000 resamples, seed 20261123; shuffled-label null 200 runs.
- **H1**: A beats the 97.5th percentile of the shuffled-label null. **H2**: A beats C (paired 95% lower bound above 0). **H3**: A beats B (same).
- **Verdict of the larger-unit claim: the clause level in English (L2), SUPPORTED iff H1, H2 and H3 all hold; otherwise FALSIFIED**, naming the failures. The phrase and word levels, and stage 2, are reported with their own H1 to H3 but carry no verdict of their own.
- **H5 (the negative space adds beyond the unit's own embedding)**: F beats B (paired 95% lower bound above 0), at each level and in stage 2.
- **H6 (the size rationale)**: A2 beats A0 and A1 beats A0 (paired 95% lower bound above 0).
No prior is wired unless the verdict is SUPPORTED, and then only for that embedding model.

## My prediction, recorded before the run
H1 holds. H3 fails at every level: the clause's own text embeds the verb with its arguments, which is what sorts operators, and the negative space of removing the clause is that same text direction plus the sentence's noise (I expect the cosine between the two to rise with unit size). H5 does not hold or is small. H6 may hold for A (larger units sharpen the negative space) without A reaching B. So I expect FALSIFIED at L2, and the useful number is how close the cosine of the negative space to the bare unit gets, which says whether ablation is a noisy copy of the unit's own embedding.

## Known limits, stated now
Gold at unit level is the head verb's label. English has about 420 test occurrences over about 90 lemmas, so intervals will be wide, and the rare classes (SYN, REC, SEG, SUP) have very few test lemmas. Subordinate-clause heads are not typical verbs. The canonical word centroids (stage 2) were built from words and are applied to clause-sized vectors, a mismatch that handicaps both A and B equally. One embedder per stage; units other than verb-headed ones are untested.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
