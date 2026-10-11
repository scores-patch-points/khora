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
| `terrain-arena-step14.mjs` | Repaired instrument (in-distribution clause hold-out, participant-conditioned): does ANY reading earn standing on real text? | **CONFIRMED**: multi-occasion participation (the seat/Network reading) effect +0.348, selection-aware shuffle-p 0.002; Kind membership earns nothing (−0.03) |

## The standing conviction this battery enforces

Coherence alone earns nothing. A Kind of Kinds is not a higher order. Monitoring
is governance, not a signal. A candidate abstraction may be promoted only by a
measured consequence on held-out evidence, with its defeat preserved, and the
instrument that measures the consequence must itself be falsified first
(step 13 → step 14). The first real-corpus abstraction that earned standing did
so on the Network terrain — the same evidence that Kind could not use.