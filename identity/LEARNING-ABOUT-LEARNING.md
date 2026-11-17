# Learning about learning: lessons that make the next experiment cheaper
Append-only. One entry per lesson: what happened, why it matters, what to do next time, and where the evidence is. Dated 2026-11-17 unless noted. Written by the session that ran the experiments; the user's own framings are marked (user).

## How we work
1. **Preregister and stamp before running, and keep the failures.** sha256 and UTC time of the prereg go beside it before any code runs; predictions are written so they can fail. Several of ours did, and those were the most useful outputs. Evidence: every PREREG-*.md and its .sha256/.time in identity/ and identity/novels/.
2. **No hand-set thresholds.** Use units of a reference's own spread (1.4826 x MAD), a derived quantity (sqrt(2 ln V)), or a declared dial with its reason; leave a typed gap when data are too few. A near-zero unit is as bad as zero (it cost us the F2 collapse). Evidence: identity/SUMMARY.md results 6; PREREG-PARAPHRASE.md; attend.mjs.
3. **Test on unread data, once, with the code frozen.** The round 3 holdout "leads" (F1 0.115, 0.078) vanished on fresh books. A result is a lead until it replicates. Freeze files list their sha256. Evidence: novels/NOVELS-RESULTS-ROUNDS-2-3.md vs NOVELS-RESULTS-ROUND4.md.
4. **Write for the user in plain statements.** Asked twice. Say what failed first; short sentences; no jargon unexplained.
5. **Use khora's own parts, through their real codecs.** The reader (readToWeft, EOT with byte addresses), the presence tracker, the activation retrieval. My first ingest script bypassed the real codec and had to be replaced. Look at what exists before building.

## How to find the bottleneck
6. **Run an oracle check before improving a stage.** Hand the stage the right input and see what it does. That showed reaching the answer's sentence and choosing the answer in it are separate failures (frame logic worse than no frame logic when given the sentence). Evidence: novels/NOVELS-RESULTS.md, oracle runs.
7. **Measure the distance or the gap before building a shortcut.** Promoted edges shortened nothing (97% already shared a sentence); the measured gap was questions that name no character (26%). Evidence: synapse/RESULTS-SYNAPSE-2.md; NOVELS-RESULTS-ROUND6.md.
8. **Break ties pessimistically.** My first retrieval diagnostic ranked ties optimistically and overstated reach (0.47 vs the true 0.15). Evidence: PREREG-PARAPHRASE-ERRATUM-1.md.

## What worked and what did not
9. **Word matching fails on these books.** BM25, the PPMI fold (280k tokens of background; ~130 false folds per question), and company likelihood all sit at or near chance for paraphrase. Do not retry word matching without far more text or a new idea. Evidence: ROUNDS-2-3, ROUND7.
10. **Referent identity localises.** The named characters (all mentions linked, tracker-attached) put the answer's sentence in about 1.5% of a book, about 30x chance. This replicated on three sets of unread books. Evidence: ROUND4 results.
11. **Centrality is a real prior.** With no character named, the most-mentioned character gives F1 0.17-0.22 on questions whose answer is a character. Thin evidence (11 test questions). Evidence: ROUND7.
12. **A universal learner can find what to attend to, but its attention rule can over-prune.** Same attend.mjs on identity kept title+author (AUC 0.990 vs 0.994 ungated); on answer choice it collapsed to the frequency channel and did worse than ungated. Declared constants; do not tune them to rescue it. Evidence: ROUND5 results.
13. **Learned beats hand-written, in direction.** The learned chooser: F1 0.085 (cross-validation) and 0.113 (unread) vs baseline 0.059 and 0.053; intervals include 0. More data of the same kind adds about +0.01 F1 per doubling; the pool (35% of questions have a usable candidate) is the cap.

## The user's framings (use them, they unlocked results)
14. **The holograph is the reader's graph of the text** (referents, acts, addresses back to bytes); a question is a query over it, cut where more stops changing the reach. Surprise is the change an observation makes to the reader, not a slot count (user).
15. **Coreference is tracking.** Predict, associate, update, birth; leave detections unassigned rather than force them (user, via the asset scale-vs-position tracker).
16. **A pixel (a word, a referent) is the company it keeps** (user). Works for identity (a referent links all its mentions); did not work as bag-of-words matching.
17. **A synapse is both an expressway and the INS of an induced kind** (user); a wormhole is an identity claim between far places, admitted when no difference survives, not by use (user). Two records over one edge store. Evidence: identity/synapse/, ROUND6.

## Open
Wormholes for wording, places and kinds untested. The tracker's attachment is 8-40% of subjects (no gold for the speaker rung). Question-answering at its best is still EM 0-9% zero-LLM.
