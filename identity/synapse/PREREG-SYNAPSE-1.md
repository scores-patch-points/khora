# PREREG-SYNAPSE-1 (2026-11-17, before any synapse code is run): do pheromone trails promoted to synapses form basins?
No LLM. Counts, graphs, simple dynamics. Data: the 25 weft files in identity/novels/weft (cast referents with mention offsets; sentences with offsets). Pure Python, seeded.

## Objects
Referent = a cast entry. Time = sentence index. Window W_t = sentences t-2..t (w=3, declared). Pair (i,j) is co-present at t when both occur in W_t.
TRAIN = first 2/3 of a book's sentences, cut into R=4 equal ROUNDS (declared). TEST = last third.
## Pheromone layer (fast, per sentence, transient)
Every co-presence at t deposits 1 on the pair's trail: tau <- tau * rho^(dt) + 1. rho = 1 - 1/Wbook, where Wbook = the median gap between successive co-presences of a pair that exceed w (true re-encounters, TRAIN only), a derived quantity, not set. If there are no such gaps the book carries a typed gap and is excluded. PEAK_ij(r) = highest tau the trail reached in round r.
## Credit (net saving) and promotion (slow, per round), no hand-set threshold
credit_ij(r) = n_ij(r) - n_i(r) n_j(r) / N(r) (windows holding both, minus the count expected if i and j were independent; the pheromone's time integral minus its independence expectation). Candidate pairs = pairs with n_ij(r) >= 1.
unit_c(r) = 1.4826 x MAD of the candidates' credits; unit_p(r) = 1.4826 x MAD of their peaks. Slow trace s_ij <- 0.5 s_ij + credit_ij(r) (RHO = 0.5, reused from attend.mjs).
TAG in round r: s_ij > unit_c(r) AND PEAK_ij(r) > median(PEAKs) + unit_p(r). If a unit is 0 or there are < 3 candidates the round promotes nothing and records a typed gap.
CAPTURE (synaptic tagging and capture): a pair tagged in >= 2 distinct rounds becomes a synapse. Weight: w <- 0.5 w + max(credit,0) when tagged that round, w <- 0.5 w when not (consolidation by reinforcement, forgetting by non-use). DEMOTION: a synapse is deleted when w < median(w) - 1.4826 MAD(w) over the synapses (needs >= 3 synapses, else typed gap and no deletion). Variant NODEMOTE: weight = cumulative credit, never deleted. Variant RAW: every pair with total positive credit, weight = total credit (no promotion).
Graph weights are symmetric-normalised (w_ij / sqrt(S_i S_j), S_i the weighted degree) to damp hubs.
## Basin dynamics
State x = a set of nodes, the cue clamped. Field h_j = sum over i in x of W_ij for j not in x. Active = cue + {j : h_j > median(h+) + 1.4826 MAD(h+)} over nodes with h > 0 (MAD 0: h_j > median; a flat field is counted as a typed gap). Iterate to a fixed set or a cycle, max 20 steps (non-convergence counted). The result is the completion C(cue).
BASIN: a completion of size >= 3 reached from the endpoints of a synapse; completions of different edge cues merge when Jaccard >= 0.8. Cue-invariance of a basin A = fraction of edges inside A whose endpoints complete to a set with Jaccard >= 0.8 to A.
STABILITY: Jaccard between C(cue) on the full graph and on the graph with k% of edges removed at random (k = 10, 20, 40; 10 draws), for cues with a non-empty completion.
## Tests
SCENE: a block of 20 sentences (declared) in TEST; members = referents occurring in it. Per book, up to 30 blocks (seeded). CUE = two members co-present in a window inside the block and both nodes of the graph. TARGET = other members that are graph nodes (need >= 2). Score = F1 of C(cue) minus the cue against TARGET.
NULL: the same graph with edges rewired by double edge swaps preserving every node's degree (10 x E swaps), weights permuted among edges; 10 shuffles per book, mean taken. FREQ baseline: the m most frequent TRAIN referents among nodes, m = |C minus cue|.
Per-book summaries; across books a two-sided exact sign test on per-book differences (ties dropped), alpha 0.05. Books with a typed gap or < 3 scored cues are listed and excluded.
## Hypotheses (can fail)
H1 selectivity: median over books of (synapses / candidate pairs in round 4) < 0.5, and >= 20 of 25 books give a graph with >= 1 basin.
H2 completion: mean F1 real > mean F1 NULL (sign test p < .05) AND real > FREQ (sign test p < .05). Also reported: real vs RAW.
H3 stability: mean Jaccard at k=20% real > NULL (sign test p < .05).
H4 forgetting: held-out edge precision (fraction of synapse pairs co-present at least once in TEST) of the demoting graph > NODEMOTE (sign test p < .05).
H5 spurious basins: fraction of basins (size >= 3) whose members are not half-covered by any 20-sentence block anywhere in the book is lower for real than NULL (sign test p < .05).
Also reported, no prediction: giant-basin fraction (largest basin / nodes), Gini of weighted degree, counts of typed gaps, non-convergent runs, share of scene members that are nodes.
## Predictions, so they can fail
H1 holds. H2: beats NULL holds; beats FREQ FAILS (popular characters recover scenes without any structure). H3 FAILS (a degree-preserving null is as stable). H4 FAILS (3-4 rounds is too short for forgetting to matter). H5 holds.
Not tested: that basins are meaningful in any sense beyond held-out co-presence; anything about meaning or experience.
