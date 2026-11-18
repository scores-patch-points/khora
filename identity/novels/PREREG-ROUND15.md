# PREREG-ROUND15 — do the strings smell like a person? An embedding ruling for he/she (the non-personal giver)

Context: round 14's word table (S6) lifted precision 0.874 -> 0.911 on U, but knows only words it has seen. An embedding of the string can judge a name it has never seen.

## Candidates
- S7: S0 + ruling R_emb. Table = two centroids (person, not-person) of embeddings of GUM TRAIN gold mention strings (non-pronoun mentions, each distinct string once per type, equal weight), model nomic-embed-text (digest prefix 0a109f422b47), fixed prefix "classification: ", L2-normalised. Score of a string = cos(v, person) - cos(v, not-person). A being is non-personal iff the mean score over its distinct mention strings is < 0 (the sign; no threshold, no dial).
- S8: S0 + (R_emb union R_names, the round-14 word table).
Embedding is a codec here (a frozen model, local ollama, no generation, no prompt).

## Data (declared before running)
Confirmatory: U = the 66 GUM train documents of PREREG-ROUND14 NOTE-1. The centroids for U are built WITHOUT U (the 125 slice documents only). U was already scored for S0 and S6 (round 14), so S7 vs S0 is new but S7 vs S6 is a head-to-head on sighted data; it is reported as such.
Secondary (sighted for S6 only): dev and test, centroids from all train.
Code and centroids hashed in FREEZE-ROUND15.md before the run.

## Hypotheses, pooled over U, document-cluster bootstrap (10000), permutation null (10000)
- H1: the bindings R_emb changes are wrong more often than a random set of the same size of S0's bindings (p < 0.05).
- H2: precision(S7) - precision(S0): 95% interval above zero.
- H3: coverage(S7) - coverage(S0): interval includes zero or above.
- H4 (falsifier): centroids built with person/not-person labels permuted across strings (20 seeds) give no gain: no arm reaches the observed precision change.
- H5: R_emb catches names the word table has not seen: among beings R_emb rules non-personal with no word of theirs in the table, the share ruled correctly is above 0.5 against gold (gold is used only to score).
- H6: S7 precision >= S6 precision on U (head-to-head, sighted).
Failures reported as such. Nothing tuned. If H1 fails, the ruling is not wired.
