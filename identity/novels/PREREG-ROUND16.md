# PREREG-ROUND16 — the fast smell: a static (word-vector) version of the context ruling, no model call at read time

Context: round 15 judges whether a being is a person from embeddings of its string, role frame and context window, with a model call per frame (slow). The fast version keeps one stored vector per WORD (the vector library, organs/vector-library.js, embedded once) and builds every frame by averaging word vectors: nothing else is computed at read time.

## Static arms (same GUM train mentions, same person / not-person labels, same sign rule as round 15)
- SS  the string: normalised mean of the word vectors of the mention's words (cased as written).
- SR  the role frame: normalised mean of [role word vector, verb-lemma vector, SS].
- SWr, r in {0,1,2,4,8}: the window: normalised sum of SS and the mean word vector of each sentence within r sentences (the mention's own sentence included), the mean taken per sentence. The context window per being comes from `kernel/activation.js::dmdWindow` over the same declared radii as round 15 NOTE-2; S9W = the conclusion at that window.
- The word vectors come from the same model and prefix as round 15 (nomic-embed-text, "classification: " + word), embedded once for the vocabulary of the GUM texts (words only, no labels; train, dev and test vocabulary, declared). A word the library lacks at read time is skipped and counted (the OOV share is reported).
Centroids: person / not-person means over all non-pronoun GUM TRAIN mentions (without U for the confirmatory run).

## Data
Confirmatory: U (PREREG-ROUND14 NOTE-1), the same 66 documents, same S0 and S6 as rounds 14-15; the round-15 embedding arms are run on it first (their registration stands). Dev and test: exploratory, sighted.

## Hypotheses (pooled over U, document-cluster bootstrap and permutation as in rounds 14-15)
- F1 (fidelity): the static ruling S9W agrees with the embedding ruling S7W on at least the share of beings that S7W agrees with its own half-split (the embedding ruling computed from two disjoint halves of its training mentions): reported with the agreement rate; the bar is the model's own self-agreement, not a number I chose.
- F2: S9W precision >= S0 precision, 95% interval of the difference above zero.
- F3: coverage change interval includes zero or is above it.
- F4 (falsifier): static centroids with labels shuffled (20 seeds): no arm reaches the observed precision change.
- F5 (speed): reading one document's rulings takes no model call after the library is built; the wall time per document is reported against the embedding arm's.
- F6 (ablation, as the user asked): SS (string alone) is reported as the baseline; context arms SR / SWr must beat it for the claim "context carries it" (95% interval above zero for at least one).
Failures reported. Nothing tuned. If F1 or F2 fails, the static version is not wired and the embedding version (if it held) stays the slow reference.
