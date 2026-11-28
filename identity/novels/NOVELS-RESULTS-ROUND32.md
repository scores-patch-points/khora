# Round 32: a span's role held open until an act collapses it

Preregistered `PREREG-ROUND32-SUPERPOSITION.md` (sha256 `d8aa8bae…`, 2026-11-28T14:00:09Z), no addendum; frozen `FREEZE-ROUND32.md` (14:07:05Z; one deviation recorded there: `gum-falsify3.mjs` gained H4's switch one step after the freeze, before any held-out run); one held-out run. Opt-in `readerOptions.roleCollapse: true` (`native/adapters/text/role-collapse.js`, applied in `read-core.mjs` after the pronoun rungs); off, the read is unchanged (`native/tests/role-collapse.test.mjs` 1). Model: `native/priors-shipped/role-collapse-eng.json`, GUM train plain and shifted, 24,393 unbound labelled rows (806 bound rows left out: the model decides only unbound rows).

## Held out: GUM test + dev (60 documents; read once before, by round 31, for its own rung)

| | P | R | FB |
|---|---|---|---|
| plain, OFF | 0.838 | 0.895 | 413 |
| plain, R31 | 0.838 | 0.895 | 413 |
| plain, R32 | 0.850 | 0.880 | 369 |
| shifted, OFF | 0.246 | 0.906 | 7,811 |
| shifted, R31 | 0.499 | 0.786 | 1,946 |
| shifted, R32 | **0.572** | **0.666** | **1,174** |

- **H1 FAILS**: plain, R32 vs OFF: ΔR = −0.015, 95% [−0.023, −0.008], wholly below 0 (ΔP +0.011 [+0.006, +0.017]; 44 fewer false beings). The posterior demotes single-word capitalized forms the prior holds as common, mentioned once and unbound, in modern text too; some are real names.
- **H2 HOLDS**: shifted, ΔFB = −6,637 [−7,202, −6,054] (−85%); ΔP = +0.325 [+0.285, +0.365].
- **H5 FAILS, in the opposite direction**: shifted, R(R32) − R(R31) = −0.120 [−0.168, −0.084]: the rung kept FEWER names than round 31, not more (precision +0.073 [+0.042, +0.102]).
- **K HOLDS**: random demotion of the same number of unbound rows (20 seeds): ΔP 95th percentile +0.103; the rung's +0.325.
- **H4 FAILS**: CANON's bindings are computed on the uncollapsed cast, but the gold scorer decides which entities are named from the written cast, so CANON's counts move (slice C answerable 254 → 253; slice D wrong 33 → 32); CONTROL's pooled right falls 443 → 438 (E 101 → 100, C 95 → 91). The stamped prediction ("identical by construction") was wrong about the scorer, and CONTROL fell.

**Decision (as stamped): the rung stays opt-in.** H2 and K hold; H1, H5 and H4 do not.

## What the run shows

Collapsing every unbound row at the writing of the cast with a 0.5 rule is not a role held open: it is a sharper classifier, at a different operating point (higher precision, lower recall). The only act that deferred the decision was binding, and it protected few rows (806 of 25,199 in training). Holding a role open means NOT collapsing where no act asks: a row the evidence leaves undecided stays a being with its mass, reported as contested, and the acts that consume it (binding, the night's standing, recall) read the mass. A binary cast scored by P and R cannot see that; the next round needs a scoring rule on the distribution itself (log loss or Brier of the role against gold), and acts that take a mass, not a set.

## DEV (slice B, in-sample for the model, mechanics only; disclosed in the freeze before the held-out run)

Shifted R 0.651 (R31 0.773), H5 interval [−0.171, −0.084]; plain ΔR [−0.066, −0.011]. The dev run already predicted H1 and H5 would fail; the held-out run was made as stamped rather than redesigned on in-sample data.
