# PREREG-ROUND17 — standardized part-of-speech centroids from what we can identify, and sniffing the rest

The user's direction: embeddings get assigned to POS norms; use the hyperlexicon / what we CAN identify as a POS to build standardized centroids, then sniff POS.

## Centroids (English first)
Source: the POS prior (`janus/priors/pos-eng.json`, POSPrior@1: word -> UPOS counts from UD English EWT train, gold). A form is IDENTIFIED when all its counts fall in one UPOS (single-class forms; no frequency or count threshold). The UPOS centroid = the mean of the unit word vectors of its identified forms (equal weight per form), L2-normalised. Word vectors: nomic-embed-text, prefix "classification: ", from the vector library (missing forms are embedded once). The UniMorph lexicon prior (`pos-eng-lexicon.json`, attestation only, 360k nouns) is a later, larger source: embedding it is not feasible in this round (the measured rate is ~12 words/s) and is listed as an open item.

## Sniffing
For a token: P0 the word's own vector; P1 the unit sum of the word's vector and the unit mean word vector of its sentence (the context blend, same static construction as round 16); the sniffed UPOS = the centroid with the highest cosine.

## Data
Test: UD English GUM test (gold UPOS), a different corpus from the EWT prior, tokens as written. Every token scored; reported overall and split into IN (the form is in the POS prior) and OOV (not in it, the case that needs sniffing).
Baselines: B1 the prior's dominant class for IN tokens and the most frequent UPOS of the prior for OOV tokens; B2 centroids from labels shuffled across forms (20 seeds).

## Hypotheses
- Q1: on OOV tokens P0 accuracy exceeds B1's by a 95% bootstrap interval (over documents) above zero.
- Q2: P1 beats P0 on OOV (95% interval above zero): context carries POS beyond the word.
- Q3: PROPN: recall of PROPN on OOV tokens is above its share among OOV tokens (reported with the confusion row), the proper-noun smell.
- Q4: B2's accuracy on OOV never reaches P0's (falsifier).
- Q5: on IN tokens the sniff (P0) agrees with the prior's dominant class above chance; reported with the confusion between NOUN, PROPN, VERB, ADJ.
Failures reported. Nothing tuned.
