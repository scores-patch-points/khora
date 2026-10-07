# identity as a fold, BY COMPARISON (result)

Instrument: `eval/law/identity-fold-compare.mjs` (new file, 2026-10-07; pre-registration header in the file). No perturbation:
the word is empty, so this compares two folds. FOLD(s) = the typed, directed relations reachable from s's slots within radius
w=2, weighted by frame distance, bounded by the MEASURED reach of the present (kernel/activation.js::dmdWindow over sentence
recency, conclusion = the cast). Distance = 1 - cosine. Gold: CorefUD dev (bucket 4 of TRAIN; the test file is never opened).
Controls pass: K1 (self-fold cosine exactly 1), K2 (deterministic).

## The two criteria disagree — and the one you named works

| treebank | pairs | **fold AUC** | company | span | **nearest-fold MRR vs chance** | measured reach |
|---|---|---|---|---|---|---|
| Catalan-AnCora | 400 | 0.506 | 0.584 | 0.558 | **0.269 / 0.051** (~5x) | 4 |
| English-GUM | 400 | 0.407 | 0.763 | 0.684 | **0.147 / 0.009** (~16x) | 64 |
| English-LitBank | 400 | 0.399 | 0.624 | 0.665 | **0.205 / 0.014** (~15x) | whole doc |

- As a **global similarity**, the fold is at chance (Catalan) or *below* it (English): raw fold cosine says same-referent pairs
  are no closer, sometimes farther, than random pairs. `foldNoDmd` is identical to `fold` on all three — the measured reach did
  not change anything (GUM's reach is 64 sentences, Catalan's 4; LitBank's dmdWindow returned `reach_exceeds_candidates`, so the
  whole document is the fold).
- As the criterion you actually stated — *is the true coreferent less different than the other folds, by chance?* — it **works**:
  the nearest fold to a span is its true coreferent **5x (Catalan), 15x (LitBank), 16x (GUM)** more often than chance (MRR).

## Why the two disagree: the same degree confound

Cosine of these sparse, weighted fold vectors is dominated by how many relations a word carries. Frequent forms (a name and
its pronoun) have rich folds and dilute similarity; rare forms with one shared key look artificially close. So the *magnitude*
of fold similarity is confounded by degree — the recurrence of the same trap as v1/A/B. The **rank within a document** escapes it,
which is why the nearest-fold test shows signal while the global AUC does not. This says: identity-as-fold is real as a
*relative/ordering* claim (your phrasing), and false as an *absolute similarity threshold*.

## What this establishes

1. Fold-vs-fold comparison (no deletion/exchange) is the right shape — it carries signal (nearest-fold, 15x) where the
   perturbation tests carried none (0.35–0.45, anti).
2. The signal must be read **rank-relative**, not as a magnitude: degree normalization (or a rank/Jaccard distance) is required
   before any AUC-style claim.
3. The measured DMD reach made no difference here — either the folds are local anyway or the reach is coarse; the DMD bound must
   be applied on the *graph-radius* axis per span, not (only) the sentence axis per document.
4. Plain company (bag-of-words context) still beats the raw structural fold (0.58–0.76 vs 0.40–0.51); the fold's advantage is
   not yet in the score but in the ordering test.

## Next

- Degree-normalize the fold distance (per-key inverse document frequency, or rank-based nearest-fold as the primary metric) and
  re-pre-register.
- The dependency ORDER of operations still needs the reader that emits ordered operations (`kernel/fold.js` / `the-fold/fold.js`),
  not the stateless impact readers; that is the untested half of the claim.

Runtime: 3 treebanks in 6 s. Reproduce: `node eval/law/identity-fold-compare.mjs run --tbs English-GUM,English-LitBank,Catalan-AnCora`.
