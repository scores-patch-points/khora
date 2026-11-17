# RESULTS PREREG-SYNAPSE-1 (run after stamping; prereg sha256 in PREREG-SYNAPSE-1.md.sha256, script sha256 in synapse_exp.py.sha256)
Deviations, disclosed: (1) the weft directory holds 34 books, not 25; all 34 ran. (2) The script was hashed after its first launch attempt hung on a stray `cat` in my shell command (no python ran); the script was not changed between writing and the real run. (3) H5 metric turned out uninformative (see below).
Raw log: run.log; per-book: results.json.
Usable books: 18 of 34. Excluded (typed gaps): 8 with fewer than 3 synapses, 8 with fewer than 3 scorable cues (scene cue needs two graph nodes co-present and >=2 other member nodes). Only about half of scene members are nodes of the synapse graph (0.50).
H1 selectivity: median synapse fraction of round-4 candidates 0.059 (<0.5: holds); books with >=1 basin: 15 of 34 (needs >=20 of 25: FAILS).
H2a completion vs degree-preserving null: F1 0.180 vs 0.093, up 15 / down 2 of 18, sign p=0.0023: HOLDS.
H2b vs FREQ (most frequent train referents, same size): F1 0.180 vs 0.167, up 9 / down 6, p=0.61: FAILS (as predicted); no better than popularity.
H2c vs RAW (no promotion, all positive-credit pairs): RAW 0.211 > real 0.180, down 12 / up 6, p=0.24 (not significant, but promotion did not help).
H3 stability at 20% edge removal: real minus null Jaccard +0.036, 11 up / 5 down, p=0.21: FAILS (10%: p=0.58; 40%: p=0.45).
H4 demotion vs none, held-out edge precision 0.791 vs 0.782, 6 up / 6 down, p=1.0: FAILS (as predicted). Both far above RAW precision 0.177: promotion (tag+capture) does select edges that persist.
H5 spurious basins: 0.0 in real and null in every book: metric non-discriminating (size-3 sets are always covered by some 20-sentence block); untested, not a pass.
Descriptive: empty completions 52% of cues; giant-basin fraction 0.29 real vs 0.28 null; weighted-degree Gini 0.48; basins per book 5.9 real vs 8.0 null; cue-invariance real-null p=0.39.
Reading: promoted edges are a sparse (~12% of candidates), persistent subset (precision on unseen text 0.79). Cue completion beats structure-free rewiring but not a popularity baseline, and the graphs are too small/sparse to show basin stability beyond the degree-preserving null. Basin claims are NOT supported by this test.
