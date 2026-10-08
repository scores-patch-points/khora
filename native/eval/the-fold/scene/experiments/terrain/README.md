# Scene-kind induction — THE TERRAIN (draft, 2026-10-08)

An assessment of the base driver `../../scene-kinds.mjs` on the SAME Greek Odyssey EOT. Not a tuned answer — the whole (similarity, threshold) surface, with the frequency-band and shuffled-company nulls alongside.

## Method

- EOT read exactly as the base driver (pro-drop seam + Iliad-seeded holograph; ~981 clauses).
- Scenes held FIXED within a boundary mode; only the induction cell varies:
  - **coarse** = base driver boundary (local-max bayes revision, p90, min-len 4) → 68 scenes.
  - **fine** = raw revision boundary (every bayes≥p50, min-len 2) → 317 scenes.
- Cell columns: `kinds`, `blob` = largest kind ÷ scenes, `single` = singleton kinds ÷ scenes, `sep` = mean within-kind similarity − mean between-kind similarity.
- `null*` = median over 20 shuffled-scene-company re-inductions (permute each scene's company onto another scene, seeded).
- `[band k=5]` = quantile frequency-band partition of the same scenes (scene clause-count).

## Terrain

```

████ BOUNDARY coarse — 981 clauses → 68 scenes (bounded by bayes + position-vocabulary) ████
     blob>0.5 = degenerate blob · singletons>0.7 = degenerate singletons
sim         thr    kinds  blob   single  sep      | nullBlob nullSingle nullSep  nullSep95
---------   -----  -----  -----  ------  -------  | -------- ---------- --------  ---------
[band k=5]           ~      0.206  0.000  0.0181
[weld]                all 68 scenes connect at jaccard=0.206 via v:νίψασθαι + r:(∅):pat + o:τράπεζαν + v:Past:Act:Ind + o:σῖτον + r:(∅):gen
[pairs]               mean 0.176 sd 0.057 cv 0.327 · mean shared elems/pair 6.1
jaccard     0.1        1  1.000  0.000   +0.1756  | 1.000    0.000      0.1756    0.1756
jaccard     0.2        1  1.000  0.000   +0.1756  | 1.000    0.000      0.1756    0.1756
jaccard     0.3       29  0.574  0.397   +0.0525  | 0.574    0.397      0.0525    0.0525
[band k=5]           ~      0.206  0.000  0.0151
[weld]                all 68 scenes connect at cosine=0.484 via r:(∅):pat + r:agt:gen + v:Pres:Mid:Ind + r:agt:(∅) + o:∅
[pairs]               mean 0.546 sd 0.183 cv 0.335 · mean shared elems/pair 6.1
cosine      0.1        1  1.000  0.000   +0.5459  | 1.000    0.000      0.5459    0.5459
cosine      0.2        1  1.000  0.000   +0.5459  | 1.000    0.000      0.5459    0.5459
[band k=5]           ~      0.206  0.000  0.0188
[weld]                all 68 scenes connect at idf-cosine=0.128 via r:(∅):pat + r:agt:gen + v:Pres:Mid:Ind + r:agt:(∅) + o:∅
[pairs]               mean 0.193 sd 0.114 cv 0.590 · mean shared elems/pair 6.1
idf-cosine  0.01       1  1.000  0.000   +0.1926  | 1.000    0.000      0.1926    0.1926
idf-cosine  0.03       1  1.000  0.000   +0.1926  | 1.000    0.000      0.1926    0.1926
idf-cosine  0.06       1  1.000  0.000   +0.1926  | 1.000    0.000      0.1926    0.1926
idf-cosine  0.1        1  1.000  0.000   +0.1926  | 1.000    0.000      0.1926    0.1926
idf-cosine  0.2        2  0.985  0.015   +0.1324  | 0.985    0.015      0.1324    0.1324

████ BOUNDARY fine — 981 clauses → 317 scenes (bounded by bayes + position-vocabulary) ████
     blob>0.5 = degenerate blob · singletons>0.7 = degenerate singletons
sim         thr    kinds  blob   single  sep      | nullBlob nullSingle nullSep  nullSep95
---------   -----  -----  -----  ------  -------  | -------- ---------- --------  ---------
[band k=5]           ~      0.202  0.000  0.0074
[weld]                all 317 scenes connect at jaccard=0.143 via r:agt:gen
[pairs]               mean 0.152 sd 0.106 cv 0.701 · mean shared elems/pair 1.8
jaccard     0.1        1  1.000  0.000   +0.1519  | 1.000    0.000      0.1519    0.1519
jaccard     0.2        3  0.994  0.006   +0.1209  | 0.994    0.006      0.1209    0.1209
jaccard     0.3       28  0.915  0.085   +0.0979  | 0.915    0.085      0.0979    0.0979
[band k=5]           ~      0.202  0.000  0.0117
[weld]                all 317 scenes connect at cosine=0.341 via r:(∅):pat + r:agt:agt
[pairs]               mean 0.297 sd 0.206 cv 0.692 · mean shared elems/pair 1.8
cosine      0.1        1  1.000  0.000   +0.2968  | 1.000    0.000      0.2968    0.2968
cosine      0.2        1  1.000  0.000   +0.2968  | 1.000    0.000      0.2968    0.2968
[band k=5]           ~      0.202  0.000  0.0047
[weld]                all 317 scenes connect at idf-cosine=0.073 via v:Past:Act:Ind + r:agt:pat + r:(∅):pat
[pairs]               mean 0.073 sd 0.082 cv 1.110 · mean shared elems/pair 1.8
idf-cosine  0.01       1  1.000  0.000   +0.0734  | 1.000    0.000      0.0734    0.0734
idf-cosine  0.03       1  1.000  0.000   +0.0734  | 1.000    0.000      0.0734    0.0734
idf-cosine  0.06       1  1.000  0.000   +0.0734  | 1.000    0.000      0.0734    0.0734
idf-cosine  0.1        2  0.997  0.003   +0.0493  | 0.997    0.003      0.0493    0.0493
idf-cosine  0.2       11  0.965  0.028   +0.0451  | 0.965    0.028      0.0451    0.0451

═══════════════════════════════════════════════════════════════════════════
VERDICT: cells swept = 20. Non-degenerate cells (blob<=0.5 AND single<=0.7): 0.
  NONE. Every (similarity, threshold) cell is a blob or all-singletons. The terrain has no middle.
NEAREST-TO-MIDDLE: [coarse] jaccard @ 0.3 → kinds=29 blob=0.574 single=0.397 (max=0.574), null blob=0.574 single=0.397
═══════════════════════════════════════════════════════════════════════════
```

## Verdict

**NONE.** Across jaccard {0.1,0.2,0.3}, cosine {0.1,0.2}, idf-cosine {0.01,0.03,0.06,0.1,0.2} — and across both scene-boundary regimes — every cell is either a blob (>0.5 of scenes in one kind) or all-singletons (>0.7). The terrain has no middle on the current element grain.

## The most informative failing measure

`coarse / jaccard @ 0.3` is the cell nearest the middle: kinds=29, blob=0.574, singleton=0.397 (max=0.574). It is still a blob (blob>0.5).

**The single most informative failing measure is the weld threshold** (the single-linkage connectivity bottleneck): all scenes collapse into ONE component at a low similarity carried by shared generic seats. Coarse: 68 scenes weld at jaccard=0.206 via v:νίψασθαι + r:(∅):pat + o:τράπεζαν + v:Past:Act:Ind. Fine: 317 scenes weld at jaccard=0.143 via the single shared element `r:agt:gen` alone — one near-universal role seat welds the entire corpus. Each scene's company is a near-commodity with a large shared core (mean 6.1 shared elements per pair on the coarse scenes; `o:∅`, `r:(∅):(∅)`, `v:Past:Act:Ind` are near-universal).

This makes generation a CLIFF, not a gradient: below the weld the graph is one blob (jaccard 0.1/0.2 → 1 kind), just above it the blob only partly sheds members into a singleton tail (jaccard 0.3 → blob 0.574 + 27 singletons), and no threshold sits between. That is why every (similarity, threshold) cell is a blob or all-singletons: the generic core fixes a floor on pairwise similarity, single-linkage welds everything below the floor, and above the floor only the unique-tail scenes survive as singletons. The frequency-band floor (blob≈0.2, separation≈0.018, zero singletons) is the smooth rung the induced terrain never reaches.

## Caveat — the shuffled-company null is a relabeling (it cannot fire here)

The null column is reported as specified, but it is VACUOUS under an intrinsic separation: permuting whole company vectors between scenes is a permutation (relabeling) of the similarity graph, so the component-size distribution and the mean within−between separation are exactly invariant. Measured, all 20 draws equal the induced cell to 4 decimals (e.g. coarse/jaccard@0.3: induced sep=+0.0525, null median=+0.0525, null p95=+0.0525). So the null cannot falsify an intrinsic partition — it only discriminates when an EXTERNAL per-referent gold is injected (as janus `falsifyKinds` does via `goldOf`). The scene data carries no such gold. The degeneracy therefore stands on the weld measure above, not on the null.

## The measurement that WOULD be informative next

Induce at the element grain first (verb lemmas via the case-morph priors, role-classes, outcome-kinds) and attach an outcome gold per scene, then re-run this same table with a gold-anchored null — the terrain cannot be assessed with the intrinsic null, but the weld floor is a property of the element grain and should move when the grain moves.

## Files

- `scene-kinds.mjs` — the instrumented driver (copy of the base + the sweep/band/null instrumentation).
- `terrain.log` — the captured stdout of the run.

Run: `node experiments/terrain/scene-kinds.mjs`
