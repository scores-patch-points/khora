# PREREG-ROUND20 NOTE 6 — Dignāga's embedding system: relative centroids on a ground, with ablation (registered before the name embeddings finish and before any score)

The user's direction: build Dignāga's embedding system; centroids are relativistic (relative to a ground of kind-induced, relevant priors); compare by ablation. The archon is Dignāga (apoha: a thing belongs to a class by what it excludes, never by capturing an essence; support is counted); Vasana keeps compiled grounds (conditioning, never testimony); Nagarjuna checks (a proposal stands only by its consequences). Credit line must say "our handle": the dossier's bends (partial verdict; the "claim is a hypothesis with counted support" attribution is not found in his sources).

## The system (native/adapters/text/apoha.js)
- GROUND: a named kind in a slice (e.g. kind "given-name:en", slice "wikidata-2026-11-18"): its member vectors with their classes. Its centroid G and its own SPREAD s (the root-mean-square distance of its members to G) are the units.
- RELATIVE coordinates: rel(v) = (v - G) / s. Class centroids are taken in relative coordinates: C_c (the members of class c) and C_notc (the members of the ground that are NOT c: exclusion within the ground, never a fixed opposite).
- APOHA score: score(x, c) = cos(rel(x), C_c) - cos(rel(x), C_notc). A claim is made only when |score| exceeds the null: the 95th percentile of |score| over 50 random ground members whose class labels are shuffled (janus Smell@1's own count); below it the smell abstains.
- ABLATIONS, each a switch: no-ground (absolute cosine to the class centroid and to the complement centroid, no translation or scale), no-contrast (cos to C_c only, against the same null), no-null (the sign of the score, claims always), and the full system.

## Test (the gender of given names; this is NOTE-5's design with the ablation arms)
Data as NOTE-5: names of the Wikidata snapshot, unisex and both-gender names excluded; 19% held out by sha256 of the name; ground trained on the rest. GUM beings with a gold gender that the snapshot cannot answer; ground trained on ALL snapshot names.
Arms: B1 majority class; B2 suffix naive Bayes (last 1-3 letters); P-full; P-no-ground; P-no-contrast; P-no-null.
- A1: P-full accuracy on the names it claims exceeds B2's accuracy on the same names, bootstrap over names, 95% interval above zero; claimed share reported.
- A2 (the ablation question): P-full vs each ablation: accuracy among claimed names and the claimed share, on the same names; which switch costs what.
- A3: the GUM beings the giver cannot answer: P-full coverage gained and accuracy against gold, above B1 and B2.
- A4 (falsifier): grounds built with shuffled gender labels (20 seeds) give chance.
- A5: the spread-unit scores are comparable across grounds: the same names scored in a ground of male names only vs the two-class ground keep their order (Spearman, reported).
Failures reported. Not claimed: other languages (the same system per language, on the nominative stem of a name in a case language, from that language's own given-name labels); kind-induced grounds (the ground here is the given Wikidata kind; induction later).
