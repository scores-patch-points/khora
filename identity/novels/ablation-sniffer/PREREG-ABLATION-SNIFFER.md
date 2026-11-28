# PREREG — falsify the ablation sniffer: does the negative space of a removed unit say which cell it acts in?

Written 2026-11-23, before the one run. Frozen with `FREEZE-ABLATION-SNIFFER.md` (sha256 and UTC of this file, of `ablation-eval.mjs`, `embed-client.mjs` and `native/adapters/text/ablation-sniffer.mjs`). The thing falsified is the thing built: the experiment imports the module.

## The claim (the user's, 2026-11-23)
It is about a unit's effect in a sentence when removed. Embed the sentence with and without the unit; the NEGATIVE SPACE (unit(unit(E with) − unit(E without))) is what the sentence lost. Its cosine against the canonical centroids of the cube's cells says which cell the unit acts in, and a unit does not have to be in only one.

## What would falsify it (decided before any number)
Three claims must hold together; each has its own falsifier, so a failure says which part is wrong.
- **H1, the negative space carries the label.** Balanced accuracy of arm P1 (negative space of the REMOVED unit against canonical word centroids) is above the 97.5th percentile of 200 runs with the centroids' labels shuffled. *Fails ⇒ noise.*
- **H2, it is the unit's effect, not the sentence's.** P1 beats P5, the same pipeline when ANOTHER word of the same sentence is removed instead (paired, bootstrap 95% lower bound above 0). *Fails ⇒ what is measured is the sentence, not what the unit did.*
- **H3, ablation adds beyond the word.** P1 beats P4, the bare word's own embedding against the same centroids, no sentence, no ablation (same test). *Fails ⇒ the cells are separable in the embedding space, but the ablation is not what separates them: the claim in its strong form is falsified and a weaker one (the word embedding sorts the cells) survives.*
A stage is **SUPPORTED** only if H1, H2 and H3 all hold; otherwise **FALSIFIED**, naming the ones that failed. Wiring a canon into the priors home is licensed only for a SUPPORTED stage and only for the embedding model that stage used (vectors from two models are not comparable).

## Design
- **Gold.** `eo-lexical-analysis/data/llm_classifications.json` (English, 11,930 verbs, an LLM giver's operator label, 1,386 with an `alternative`) and `data/crossling/<language>/classified.json` (27 languages, native verbs labelled through their glosses). The label is the giver's, never a fact; this tests agreement with it. Nine classes, the study's operator names (DES = DEF, ALT = SIG, SUP = EVA in the current cube).
- **Held out by lemma.** A lemma is a test lemma iff sha256 of its key mod 5 = 0. Canonical centroids, delta centroids and null bounds use train lemmas only; test occurrences are sentences containing a test lemma as a VERB. Cross-language canons are leave-one-language-out: the target language contributes no word to its own centroids.
- **Stage 1, English** (`nomic-embed-text`, prefix "classification: " as embed-personhood.js, local, 768-d). Centroids: per operator up to 400 train lemmas (referent-labelled first). Delta centroids and null bounds: up to 250 train occurrences per operator in UD English-EWT train. Test: UD English-EWT dev+test, up to 1,000 occurrences by even stride.
- **Stage 2, other languages** (`qwen3-embedding:4b`, multilingual, local, 2,560-d, about 2.5 embeddings/s so small by necessity). Canonical words: per operator up to 35 train verbs spread over every language. Test: per language up to 30 held-out-lemma occurrences from the UD files beside the labels, languages with at least 10.
- **Arms** (all cosine to centroids, nearest wins): P1 removed-unit negative space × canonical word centroids (**the claim**); P2 the same × centroids of negative spaces; P3 MASKED unit (the older "___" design) × mask-delta centroids; P4 bare word × word centroids; P5 removed OTHER word × word centroids (control); P5b control × delta centroids; P6 mask delta × word centroids. Stage 2 runs P1, P4, P5.
- **Primary metric: balanced accuracy** (mean per-class recall over the classes present; a constant guess scores 1/classes, so INS's 63% share cannot flatter anything). Plain accuracy and the majority share are reported beside it.
- **Statistics.** Bootstrap over test lemmas (stage 2: language×lemma), 2,000 resamples, seed 20261123; shuffled-label null 200 runs.
- **Descriptive, no verdict.** Calibration of P1 by margin tercile (the earlier ablation-pressure test failed this); the multi-label read (every cell whose cosine clears its own null bound, the 95th percentile of cosines against negative spaces of units of other classes) against {operator, alternative}: cells claimed per unit, any-hit, precision, recall; the 27-cell read on referent-labelled English verbs; per-language accuracy in stage 2.

## My prediction, recorded before the run
H1 true: the aggregate signal the earlier ablation prior found (29% on 13-way POS against 7.7% chance) should reappear. H2 and H3 are where I expect trouble: a one-word removal moves a sentence embedding by a small, noisy amount (the cosine of a sentence with and without a word was 0.95 in a probe), so I expect the delta to carry mostly the sentence, P5 near P1, and the bare word (P4) to beat the delta. If that happens the strong form of the claim is falsified at both stages, and what is left is a nearest-centroid sorter on word embeddings, which already exists (`pos-smell.js`).

## Known limits, stated now
Only VERB units are tested, because the canonical centroids and gold are verbs; nouns, particles, phrases and clauses are untested, and a multi-word unit is supported by the module but not exercised here. One embedder per stage; a different one could change the answer. The labels are an LLM giver's, at operator grain (the 27-cell read has only 1,194 English verbs). Stage 2 is small. A removal changes the sentence's length, which the P5 control matches only roughly.

## Deviations log
(empty; any change after the freeze is written here, never hidden)
