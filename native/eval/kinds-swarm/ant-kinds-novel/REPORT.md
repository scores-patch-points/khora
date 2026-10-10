# ant-kinds-novel — kinds of beings in long texts, and what mention count does to fragility (2026-10-06)

Zero-model, no capital / POS / prior / word list in anything that induces, reads or scores (capitals and the cast file only DESCRIBE or SCORE kinds afterwards).
Books: War and Peace (Maude; 30,844 sentences) and Pride and Prejudice (pg1342; 6,559 sentences; chosen in PREREG piece 0 before any result).
Pre-registration: PREREG.md (pieces 0-4, append-only, prefix hashes in PREREG.pieces.sha256). Code: lib.mjs induce.mjs joint.mjs fragility.mjs (+ exploratory diag-c4.mjs,
diag-being.mjs, joint-extra.mjs). Data: results/.

## 1. Plain-language summary
* Company kinds exist on a novel and are not frequency bands (War and Peace: 12 kinds from stable bisection; the same pipeline on within-sentence-shuffled text gives 1; two
  independent halves of the book agree, ARI 0.59 vs 0.05). They are POS-like: verb kinds by valence, auxiliaries, prepositions, a nouns kind, an adverb/particle kind.
* Persons do NOT get their own kind. 49 of 62 cast forms sit in ONE kind with the pronouns, determiners and conjunctions (kind 10: the subject-position kind, 592 forms, 37% of
  tokens); places (moscow, smolensk, austerlitz...), nationalities and titles (princess, count, general) sit in the plain-noun kind 11. Persons-vs-places is therefore not separated
  by company at this resolution. Company vectors DO carry a person signature (exploratory C4: cosine to the other cast forms, AUC 0.93 inside kind 10 vs frequency-matched forms),
  and the unsupervised split of that kind missed the registered stability rule by a hair (ARI 0.787 vs null maximum 0.799).
* Fragility (size of the slot change when ONE mention is deleted) vs the number m of mentions in its causal window has one real feature: the CLIFF at the reader's floor of 2.
  Deleting one of exactly two mentions removes the form below the floor and changes 9.5 slot records on average (8.7 of them collateral; mean D1 2.8) against 2.7 records for m>=3
  (mean D1 1.0), in every kind (D1 2.3-3.3 at m=2 in all 12 kinds; the deletion leaves a trace in 95% of m=2 cases vs 56% for m>=3; 97% of the m=2 forms are in the reader's
  figure set, 1% are heard beings). Above the floor the curve is FLAT in the pool (+0.09 log2 units per doubling, 95% [-0.01, +0.24]). The form is a three-level
  step (m=1, m=2, m>=3), not a power law.
* The pooled flat curve hides small opposite slopes: 4 of 12 kinds have a slope interval excluding 0 (nouns -0.15, adverb/particle kind -0.23, aux-adverb kind -0.20: more
  mentions, more robust; predicate-adjective kind +0.44). But the kinds' slope and level spread is NOT larger than random partitions of the same sizes within frequency bins
  (level p=0.10, slope p=0.21), so "Simpson mixture" is a description, not an established effect.
* The cast sits on the SAME curve as frequency-, mention-count- and position-matched ordinary words in War and Peace (diff +0.11 log2 units [-0.11, +0.32]; slope diff +0.03).
  In Pride and Prejudice the levels agree but the SLOPE differs (+0.38 [0.12, 0.64]); that is carried by the reader hearing the names as beings (29% of cast tokens vs 7% of
  controls; entry-slot changes of about 1 record per deleted mention) — which happens in P&P and almost never in W&P (1.3% vs 2.5%).
* Joint ablation of all tokens of a kind (shadow, imprint, amplification) vs frequency- and position-matched random sets: kinds differ from random sets only in tiny cosines
  (0.96-0.997) and kinds do NOT differ from each other more than random partitions of the same sizes do (W&P and P&P). K2 fails at the joint level.

## 2. Numbers that matter
| item | War and Peace | Pride and Prejudice |
|---|---|---|
| kinds (leaves) / shuffled-text leaves | 12 / 1 | 6 / 1 |
| halves ARI (null max) | 0.594 (0.046) | 0.150 (0.010) |
| NMI(kind, frequency bin), real / shuffled | 0.047 / 0.000 | 0.062 / 0.000 |
| person-name forms in the top kind (hypergeometric p) | 49/62 = 79% (1.9e-40), kind 10 with pronouns/determiners | 23/30 = 77% (1.5e-4), kind 5 (72% of tokens) |
| fragility D1 = log2(1+changed), m=1 / m=2 / m=3 (post-stratified) | 1.42 / 2.77 / 0.99 | 1.33 / 2.74 / 1.05 |
| cliff D1(m=2) - D1(m=3), block-bootstrap 95% | +1.78 [1.40, 2.17] | +1.69 [1.29, 2.02] |
| pooled slope above floor per doubling of m | +0.093 [-0.013, 0.239] | +0.005 [-0.112, 0.133] |
| departing kinds (CI excludes 0) | k1 +0.44, k2 -0.23, k4 -0.20, k11 -0.15 | none (6 kinds) |
| CV-best form: FLOOR / FLOORLOG / others (per kind) | 8 / 4 / 0; pooled FLOORLOG 1.702 vs FLOOR 1.703, LOG 1.976, HYP 2.001, CONST 2.080 | 4 / 2 / 0; pooled 1.738 vs 1.750, LOG 2.058, CONST 2.066 |
| cast - CTRL-F, m>=3 (CI) / slope diff (CI) | +0.106 [-0.108, 0.321] / +0.029 [-0.137, 0.191] | +0.050 [-0.292, 0.424] / +0.377 [0.124, 0.641] |
| cast - CTRL-K (same kind), m>=3 | -0.170 [-0.437, 0.051] | +0.108 [-0.262, 0.497] |
| kind heterogeneity: levels H (null q95), p; slopes p | 0.062 (0.072) p=0.10; slope p=0.21 | 0.061 (0.087) p=0.15; slope p=0.78 |
| joint J4 Dbetween vs random partitions (q95) | 0.0712 vs 0.0742: FAILS | 0.190 vs 0.198: FAILS |
| sham changed / determinism | 0 of 100, 0 of 8 windows / 40 of 40 | 0 of 100 / 40 of 40 |

## 3. Every pre-registered prediction and its outcome (failures included)
PIECE 1 (induction). K1a >=4 leaves: HELD (12; P&P 6). K1b shuffled <=2 leaves: HELD (1; 1). K1c halves ARI > null max and >= 0.25: HELD on W&P (0.594), FAILED on P&P (0.150 > null max
0.010 but below the typed 0.25; P&P halves are 3,000 sentences and give 10 vs 5 leaves). K1d NMI(kind, frequency bin) < 0.5: HELD (0.047; 0.062). C1 top kind holds >=50% of the cast with
p<1e-6: HELD on W&P (79%, 1.9e-40) but the kind is the pronoun/determiner subject kind, not a persons kind; FAILED on P&P (77%, p=1.5e-4, only 30 name forms). C3 (blind) persons are
not one kind (>=2 leaves hold them) AND places/nationalities form their own leaf: first half HELD weakly (10 of 62 cast forms and all titles/patronymics fall in the noun kind 11, andrew in
kind 2 because 'prince andrew'); second half FAILED (moscow smolensk austerlitz russia french german all sit in kind 11 with the common nouns).
PIECE 2 (joint, W&P). J4 (kinds' shadows differ more than random same-size partitions, K2): FAILED (0.0712 vs q95 0.0742; one of 12 partitions is higher), same on P&P (0.190 vs 0.198).
PJ1 the cast kind is NOT J1-specific: FAILED as written (its shadow cosine to its random sets is 0.964 < q05 0.989; but the effect is a 0.036 cosine distance, and a third of its tokens
could not be matched: it holds 37% of all tokens). PJ2 J4 holds: FAILED. PJ3 cast-kind amplification above random in <6 of 8 windows: HELD (0 of 8; 1.00 vs 1.55: the cast kind
rearranges LESS of the field beyond what it holds than random sets). PJ4 sham 0: HELD (both books).
PIECE 3 (fragility, W&P). F1 cliff >0 with CI>0: HELD. F2 pooled flat above floor (|b|<0.10 and CI contains 0): HELD, barely (0.093); >=1 departing kind: HELD (4); reversals <=1: FAILED
(three kinds have a negative slope against the pooled +0.093, although the pooled slope is not significant). F3 FLOOR wins >=60% of kinds: HELD (8/12 = 67%; the 4 FLOORLOG winners are exactly
the 4 departing kinds), no log/hyperbolic form wins pooled: HELD. F4 cast = matched controls above the floor and not more fragile at m=2: HELD on W&P; on P&P the level agrees but the slope
differs (CI excludes 0), so by the registered rule the user's "different curve" claim is SUPPORTED in P&P and NOT in W&P. F5 H > q95 (levels differ more than random partitions): FAILED
(p=0.10; P&P 0.15), H_slope <= q95: HELD (p=0.21; 0.78). F6 position reported: cast and CTRL-F have the same share of sentence-initial tokens by construction (17.5% vs 17.2%; P&P 43% vs 42%),
and the m>=3 cast-minus-control difference restricted to middle-position tokens is +0.02 [-0.23, 0.27].  S1 sham 0/100: HELD. S2 determinism 40/40: HELD both books. S3 company-shuffled
book (600 tokens): cliff survives (1.34 [0.95, 1.73] vs 1.72 unweighted in the real book: 78% retained, so the cliff is mostly a count rule), kind heterogeneity H falls to 0.0016 (only 4 kinds had
enough tokens): HELD as predicted, not gating.
PIECE 4 (P&P replication). R1 HELD except K1c; R2 FAILED (p); R3 HELD; R4 HELD (+0.005); R5 FAILED (slope differs in P&P, not in W&P); R6 HELD (H not above q95 in either; slope not either);
R7 HELD (J4 fails in both).
Your three guesses in the task: (i) robustness (inertia) rises with mention count: FAILED pooled (flat, +0.09/doubling); it holds for 3 kinds (nouns, adverb/particle, aux-adverb) and
is reversed for one (predicate adjectives). (ii) the cast sits on a different curve than frequency-matched ordinary words: FAILED on W&P (level and slope), partly SUPPORTED on P&P
(slope only, composition of heard beings). (iii) the null pooled result is a mixture: PARTLY — kinds have opposite-signed small slopes and the pooled flat curve is their average, but their spread
is not beyond random partitions (p=0.10 levels, 0.21 slopes).

## 4. What the reader floor of 2 does to the curve (explicit)
The readers hear a form (figure, being) only if it recurs >= 2 times in the window. So the three regimes are mechanical: m=1: the form is below the floor, a deletion cannot touch a
figure or being of the form (0.8% of m=1 tokens are figures); it still changes about 3.8 slot records because the deleted word is usually a connector between figures (its removal
rewrites the relation label); trace 79%, D1 1.42. m=2: the deletion drops the form below the floor, so the whole figure and its edges vanish: 97% of these tokens are figures, 9.5 records
change (8.7 collateral), trace 95%, D1 2.77; this holds in every kind (2.3-3.3) and survives company shuffling (78% of its size), so it is a count rule, not a kind property.
m>=3: the form stays heard; only that mention's own slots change (0.66 direct, 2.0 collateral records), 44% of deletions change nothing at all, and the mean is flat in m
(+0.09 per doubling pooled). Near the floor the curve is therefore not smooth: the "inertia" question can only be asked for m>=3, and there the answer is "flat, with small
kind-specific slopes of both signs". The m=1 level (1.42) being ABOVE the m>=3 level (0.99) differs from the physics-handles note (n=1 lowest); the two measures differ (theirs counts a
different shadow size), so I report mine as measured, not as a contradiction.

## 5. Reading across the claims (this atom only; K4 needs other languages and was not touched)
K1 company kinds exist, are stable across independent halves of a long book, collapse under company shuffle and are not frequency bands: HELD on War and Peace, partly on Pride and Prejudice.
K2 kinds differ in their holographic signature more than random partitions of the same sizes: NOT SHOWN either way: joint J4 fails in both novels, fragility heterogeneity p=0.10 / 0.15
(slope p=0.21 / 0.78); individual kinds do depart from the pool (4/12) but not beyond what random frequency-stratified partitions produce at these sample sizes.
K3 conditioning on kind reveals a signal pooling hides: NOT SHOWN: matching the cast to ordinary tokens in the SAME kind, same m and same position (CTRL-K) gives -0.17 [-0.44, 0.05] at m>=3
in W&P and +0.11 [-0.26, 0.50] in P&P. The one name-vs-matched difference that does appear (P&P slope) is a property of whether the reader hears the name as a being, which a kind label does not capture.

## 6. Caveats and limits (said so they cannot be hidden)
* Typed numbers: NMIN 20, CTXMIN 50, d 192, 10 observed halvings, 20 null draws, MINLEAF 30, block 100, m-bins, NCELL 30, NCAST 40, 20 position blocks for bootstraps, B 300-1000. Each is
  stated with its reason in PREREG; none was tuned after a result. The registered stopping rule (median ARI beats the MAXIMUM of 20 shuffled draws) is strict; kind 10 (persons+pronouns) and
  kind 11 (nouns) did not split under it (0.787 vs 0.799; 0.527 vs 0.738). A looser rule would have split them; that would be a dated amendment on fresh data, not done here.
* D1 counts changed typed slot records; it is a size of the slot change, not a measure of what the change means. Cells are capped at 30 tokens per (kind, m-bin); pooled curves are
  post-stratified to true cell counts; per-kind slopes are from the capped sample (equal weight per bin).
* The reader's own being rule (a form whose commonest preceding token is the sentence edge, above a shuffle ceiling) hears 1% of W&P cast tokens and 29% of P&P cast tokens. Everything said
  about "beings" in the reader's sense inherits that; the ref-entry slot is almost silent in W&P.
* P&P cast list is hand-written by me from knowledge of the novel (PREREG piece 4), 34 forms, 30 with a kind. K1c on P&P fails because the halves are small.
* Exploratory and post-hoc (labelled, not gating): C4 (company-only separation of the cast, AUC 0.93 inside kind 10, 0.92 over all forms; before-edge share alone 0.66 / 0.85),
  joint-extra (per-kind nulls: all kinds' shadows lie outside the range of their own random draws but by cosine 0.003-0.04; magnitude per deleted token varies across kinds 1.3-3.1 records
  and its between-kind variance does not exceed random partitions: real 0.32 vs partition max 0.45), diag-being (P&P cast heard-as-being share rises 0.23 -> 0.53 with m; W&P ~0).
* Load on the machine was 100-400 throughout; nothing was killed but my own first induction run, restarted with a stage split.

## 7. Files (all under native/eval/kinds-swarm/ant-kinds-novel/)
PREREG.md PREREG.sha256 PREREG.pieces.sha256 REPORT.md lib.mjs induce.mjs joint.mjs fragility.mjs diag-c4.mjs diag-being.mjs joint-extra.mjs
results/: kinds-wp.json/.txt kinds-pp.json/.txt (the kinds, their descriptions, tree nodes, cast table), controls-wp.json controls-pp.json (K1b-d), joint-wp.json joint-wp.report.json
joint-wp.extra.json (+pp), frag-plan-*.json frag-*-shard*.jsonl (every deletion record), frag-wp.report.json frag-wp.cast.json frag-wp.shuf.report.json (+pp), logs *.out *.err.
