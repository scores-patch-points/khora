# ANT-SCENES — the arena-grain test (draft, 2026-10-08)

**Hypothesis.** The scene-kind induction fails because the SCENES are too small (each
scene's company ~2–4 elements → clustering starved). Re-size to OSTROM ARENA grain
(dozens of clauses) and re-induce.

**Verdict: FALSIFIED.** Arena grain does not resolve the scene-kinds — it *deepens* the
single blob. Every arena segmentation (pure fixed runs 8/15/25; bayes-p95 cut with the
same minimum span; and the DMD-typed variant) yields **one kind over all arenas**
(blob = 1.000, singletons = 0.000). Company per arena is already **15–49 distinct
elements** — the "2–4 element" premise does not hold even at the base 68-scene cut — yet
bigger arenas weld *tighter*, because each arena contains *more* of the same generic
elements (`o:∅`, the pro-drop role pair, the narrative `v:Past:Act:Ind` cell).

## Per scene-grain (janus `induceKinds`, idf-cosine, element grain held fixed = {paradigm-cell · role-pair · outcome})

```text
segment            clauses  arenas  dist.el/arena  kinds  blob   singletons(share)  best-cell
base driver (p90)  14.4      68       ~23              1    1.000  0.000              —
pure runs @8        8.0     123      15.0              1    1.000  0.000    thr0.2: 4k blob0.976 s0.024
pure runs @15      14.9      66      23.0              1    1.000  0.000    thr0.2: 2k blob0.985 s0.015
pure runs @25      24.5      40      32.7              1    1.000  0.000    (no escape)
bayes p95 @8       24.5      40      30.9              1    1.000  0.000    (no escape)
bayes p95 @15      33.8      29      39.9              1    1.000  0.000    (no escape)
bayes p95 @25      44.6      22      49.0              1    1.000  0.000    (no escape)
DMD-typed (@15)    33.8      29      39.9              1    1.000  0.000    all one DMD class
```

Controls (base thr = 0.03): the **band** partition (k=5 quantile frequency) gives
blob 0.20 / singleton 0.00 — i.e. a sparse spread; the **shuffled-company null** gives
**blob = 1.000, singleton = 0.000, sep = the induced sep exactly** at *every* grain. The
induced separation is reproduced by the null ⇒ the residual is a company artifact, not a
kind.

## What actually happens when arenas grow

- **"Starved company" is not the mechanism.** Distinct elements per arena rise 15 → 49
  across the sweep; the blob stays 1.000 and the singleton share stays 0.000 the whole way.
- **Within-blob separation RISES with arena size, with no partition**: pure 0.137 → 0.238
  → 0.377; bayes 0.311 → 0.428 → 0.536. Bigger arenas are *more* similar to each other
  (they share more generic elements), so idf-cosine welds the graph into one component even
  harder. This is separation without partition — the frequency-band blob, not a kind.
- **DMD typing degenerates.** At arena grain the bayes-delta stream is a decaying ONCE for
  every arena: all 29 arenas type `ONCE-finite`, so there is one class and nothing to induce
  within. (Even given a delay embedding so a complex/recurring mode is representable, the
  arenas do not cycle.) The "recurring ones kind together" clause has no recurring ones to
  work with at this grain.

## The falsifier that fires (same one the terrain ant measured)

The blob-to-singletons transition is a cliff, and arena grain walks the wrong way off it.
A single **generic element shared by every arena** (in practice `o:∅` plus the pro-drop
`r:(∅):(∅)` seat and `v:Past:Act:Ind`) holds the component together at any threshold below
its pairwise similarity; the first threshold above it collapses everything to singletons.
Enlarging scenes adds more generic co-presence, so the threshold that would split them must
be *higher*, and the middle narrows — the observed best cells (pure@8/@15 at thr=0.2,
blob ≈ 0.98) are the cliff edge, not a kind.

## Standing note (for the content-rules ledger — kept here per experiment scope)

- **Signal:** a scene/arena company whose components are welded by a generic element present
  in (almost) every unit; the induction sits at blob = 1.000 and a shuffled-company null
  reproduces it.
- **Read that works:** search for the welded generic element first (IDF floor / stop-element
  removal) before believing any cluster count; test partition, not separation (within−between
  separation can rise while the partition stays one component).
- **Falsifying control:** if a non-degenerate (blob ≤ 0.5) cell appears once the generic
  element is dropped, the arena hypothesis is wrong and size matters after all. It did not.

## The named cure (unchanged by this test)

The failure is at the **element grain**, not the scene grain — so re-sizing scenes cannot
fix it. Induce the elements into kinds first (verb lemma/paradigm-cell, ROLE-class, outcome
kind) and drop the universal generic elements, *then* re-run the scene-kind induction.

## Files

- `arena-kinds.mjs` — the driver (base EOT read + arena segmentations + DMD typing).
- `arena.log` — captured stdout of the run (`node experiments/scenes/arena-kinds.mjs 120000`).
