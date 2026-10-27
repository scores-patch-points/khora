# Identity determination — the append-only log

One entry per gate or finding, dated, never edited; a correction is a later entry that names the one it corrects. Plan: "Identity Determination" (2026-10-26), seven phases P0-P6, each ending in a pre-registered gate.
Every number cites the commit it was run at. Failures are entries too.

## 2026-10-26 — P0 / G0: the baseline, grounded (khora main `1cf8891f`, PR #70 merged)
- The branch `pipeline-atoms` was merged into main after two merges of main into it (package.json's test list, both times). The weft-reader work in flight (the reader as a projection of the weft, 3 of 4 tests) was set aside on branch `weft-reader`, not merged.
- **G0 PASSED.** From a clean worktree of main, every reported number reproduced:
  - `stage-run.mjs`: rules C 3/35 (0 false), E 20/57 (1 false); stage C 8/35 (0 false), E 22/57 (1 false); control 0/0; determinism 108/108; checker 5/5, 20/20.
  - `stage-run.mjs` with `IDENTITY=cancel`: stage unchanged; ambiguous binds 18; 9 chosen by cancellation.
  - `reader-identity-run.mjs`: 272 ends; same 132, right 132; 15 above the null; 33 new; the discrepancy finder 4 flagged, 4 contradictions, 0 false.
  - `reread-run.mjs` with `IDENTITY=cancel`: one-way C 8 E 23; directed C 8 E 24 (moved 1, right); blanket C 9 E 24; random C 8 E 24.
- The plan's starting point said "24 supports (1 false)": that is the directed re-entry arm; the plain one-way stage is 22. Both reproduce. "Coverage 30%" = 32 commits of 108 on the one-way stage.
- **Frozen:** the 108 pairs as a regression set, `regression-108.json` (sha256 of the seven set files, the baseline numbers) with `regression-108.mjs` as the check. Never tuned on, never relabelled.
- A correction to the plan's P2 premise: the 3-occurrence floor belongs to the OLD holographic test (corpus-identity.js). The reader-side test (kernel/reader-identity.js) has no occurrence floor; its coverage limit is the null's arithmetic (a one-sentence source holds 2-4 beings, so two shared facts sit at the chance floor). "Document on both sides" is still the remedy, for that reason.
- A finding for P2: under the holograph's alpha = 1 a slot seen once has the same predictive probability as an empty slot, so a single admission teaches the reader nothing (found by the failing weft-reader test). A prior that yields to one sighting is owed.
- Not done in P0: eoreader7 reachability (the operator's ledger names it legacy; the decision is theirs); revendoring the-fold.
