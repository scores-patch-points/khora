# Falsification battery — terrain-grade abstraction, one step at a time

*A falsification-first development record, 2026-10-10. Every arena names a
pre-registered falsifier, runs the real shipped machinery or the levels-0-1
organs that probe it, and reports a verdict the reader can check. Nothing in
this directory is tuned to pass; several steps are falsified, and the ones
that later "passed" did so by finding the falsifier first.*

## How to run

Args are the `native/` root (or its `kernel/` for the kernel-only arenas):

```
node native/eval/the-fold/falsification/terrain-arena-step14.mjs native
```

Steps 6-10 are self-contained (regime micro-simulations, no kernel imports).
Steps 11-14 read the repo's real Fold seams
(`native/eval/the-fold/scene/eot-rigveda-60000.json`,
`native/eval/the-fold/scene/eot-english-pnp.json`). `NULL_RUNS` (default 200)
controls the discrimination sweep for steps 12/12b.

## The record

| Arena | Question | Verdict |
| --- | --- | --- |
| `fold_self_audit_assay.mjs` | Can the Fold recognize and correct a recurring failure of its own Kind induction (verified against the published engine; see `native/eval` counterpart)? | reproduced |
| `terrain-arena.mjs` | Do Kind / Network / Paradigm organs support genuinely different held-out predictions, or restate one cluster? | CONFIRMED (after the apparatus caught 3 measurement smells) |
| `terrain-arena-step2.mjs` | Is the Network reading terrain-correct (beats a cluster reading on identical evidence; collapses when the law is destroyed)? | CONFIRMED (after a tautological-control smell) |
| `terrain-arena-step3.mjs` | Does the shipped meta law mint second floors out of nothing? | FALSIFIED -> repaired `withMetaMembership` (bound-floor gates) -> CONFIRMED |
| `terrain-arena-step4.mjs` | Does the standing ladder change any downstream decision? | FALSIFIED (nothing consumed standing) -> repaired `releaseDecision` -> CONFIRMED |
| `terrain-arena-step5.mjs` | Do we have a genuine Commons higher-order ascent, or a recursion loop? (repo `the-fold/mhc.js`) | CONFIRMED: release-coordinated ensemble beats constituents + arbitrary coordination, held-out on mixed task |
| `terrain-arena-step6.mjs` | Is polycentric governance more robust than a central planner? | FALSIFIED for the accountable-monitor layer (flat voting matched it on clean evidence) |
| `terrain-arena-step7.mjs` | Monitoring under an inert incumbent — does it win the danger windows? | FALSIFIED (monitor loses danger windows; fairness re-entry holds, 0.93) |
| `terrain-arena-step8.mjs` | Monitoring under compounding consequences (tragedy-of-commons)? | FALSIFIED (the pool never strains; the monitor is the worse steward) |
| `terrain-arena-step9.mjs` | Monitoring under cheap talk / inflated confidence? | FALSIFIED as built: un-gated monitor collapses (143 vs 0) — the release gate is what repairs it |
| `terrain-arena-step10b.mjs` | The real dial: release eligibility threshold, long vs short re-earn horizon | release-gate makes monitoring parity-or-better, no coup on either horizon; strict head-to-head ceilinged |
| `terrain-arena-step11.mjs` | Do real-corpus Kinds (Rigveda seam) earn standing by the four checks? | FALSIFIED: inner cohesion passes, outer-null p≈0.58, consequence −0.29 |
| `terrain-arena-step12.mjs` | The weld cure at the FEATURE level? | empty: universal seats are 0 — the weld is a feature-model artifact, not per-feature prevalence |
| `terrain-arena-step12b.mjs` | The weld cure at the REFERENT level (company model)? | FALSIFIED: hubs 0 on both seams; company-kind basins are inside their own null (p=1.0) |
| `terrain-arena-step13.mjs` | The weld as Network vs Kind on real text? | instrument confound exposed (text-position split) — negative effects untrustworthy |
| `terrain-arena-step14.mjs` | Repaired instrument (in-distribution clause hold-out, participant-conditioned): does ANY reading earn standing on real text? | ~~CONFIRMED~~ **RETRACTED by step 16b** (multi-occasion effect +0.348, shuffle-p 0.002 on the random holdout) |
| `rigveda-frontier-step16b.mjs` | The stricter temporal-frontier instrument on the SAME Rigveda material: clauses 0-60% predict participation 60-100% | **FALSIFIED**: multi-occasion −0.01 (p 0.66) — the step-14 earning was an artifact of the random holdout and collapses under the honest temporal instrument |
| `odyssey-frontier-step16.mjs` | The weld's home: Greek Odyssey seam (22 books, 128 noun-beings, 1 universal seat), temporal frontier books 1-14 → 15-22 | FALSIFIED: multi-occasion +0.01 (p 0.59); no reading predicts the future (local-pipeline arena; needs the khora/Zenodotus paths) |
| `rigveda-network-step17.mjs` | The SHIPPED Network organ (relationNetworkComponents cycle-rank/motifs) on the Rigveda temporal frontier | FALSIFIED: cycle −0.29 (p 1), large-component −0.22 (p 1), membership −0.33 — the null is closed against co-occurrence, degree, membership, AND topology |
| `odyssey-enriched-step18.mjs` | With the CAST in the population (data-derived proper-name tier: οδύσσεια, ζεύς, τηλέμαχος, παλλὰς, πηνελόπεια…, 261 names), the Odyssey temporal frontier | FALSIFIED: networkMulti −0.14 (p 1), roleMulti −0.23 (p 1), membership −0.53 — the mechanical null holds even with the actors present (local-pipeline arena) |
| `terrain-arena-step19.mjs` | Are STANCES real takings? Three Relate-stances (Tracing/Binding/Tending) over the same Rigveda seam | FALSIFIED — collapsed operationalizations (Tracing≈Binding 0.99 on the sparse seam); only the arrangement reading broke its shuffle-null early |
| `terrain-arena-step19b.mjs` | Stance discrimination on the DENSE Odyssey seam + permutation-null control | **FALSIFIED, noiselessly**: the three orderings (max Spearman 0.089) sit INSIDE the random-order permutation null (p95 0.13) and each score was near-constant/lumpy — distinct arbitrarily, not meaningfully. A stance earns standing only if structured + orthogonal beyond the null + anchored to a verifiable world property |
| `terrain-arena-step20.mjs` | The ANCHORED-stance falsifier: each stance must be graded, track ONE verifiable property (beyond its shuffle null), and not ride the other anchors | FALSIFIED: stances became perceptually grounded (Tracing ρ=0.996 with arrangement-degree; Binding ρ=−0.59 with temporal span, sign-flipped; Tending ρ=0.375 with context density — all beyond their nulls) but NONE is both discriminant (they collapse onto the general participation/rarity axis) and graded (flat or lumpy). The precise rule: a real stance is graded, specific, and not-rarity |
| `terrain-arena-step22.mjs` | The PARTIAL-discriminant finale: residualize each stance on its own anchor, then require nothing of the others remains | FALSIFIED, near-resolved: all three stances are count-free, robustly anchored (0.71/0.67/0.44, p=0.002), and discriminant after partial control — each now fails exactly ONE named gate (Tracing: not graded; Binding: −0.26 residual bleed; Tending: 0.35 of degree survives). The perceiver-term is falsifiable to the interpretation line |
| `terrain-arena-step21.mjs` | Residualized/two-sided/graded stance test — not-rarity now enforced | FALSIFIED, productively: all three stances are now GRADED, COUNT-FREE (ρ≤0.14 vs participation), and STILL ANCHORED to their own properties (0.71 / 0.67 / 0.44, all p=0.002); the discriminant gate failed BUT the anchors inter-correlate in the world (degree↔span↔context density), confounding cross-ρ — the correct control is PARTIAL (residualize the stance on its own anchor first, then check nothing of the others remains) |

## The standing conviction this battery enforces

Coherence alone earns nothing. A Kind of Kinds is not a higher order. Monitoring
is governance, not a signal. A candidate abstraction may be promoted only by a
measured consequence on held-out evidence, with its defeat preserved, and the
instrument that measures the consequence must itself be falsified first
(step 13 → step 14 → step 16b). To date, NO real-corpus abstraction — Kind
membership, network-degree, active participation, shipped Network topology,
or predication roles; Rigveda, PnP, and Odyssey, including with the poem's
own cast (proper names) in the population — earns standing under the honest
TEMPORAL instrument. The one positive result (step 14, +0.35) was an artifact
of the random in-distribution holdout and failed on its own temporal frontier
and again with the cast present (step 18). The discipline's answer to the real
material is a strong, reproducible null, closed against the full space of
mechanical readings.