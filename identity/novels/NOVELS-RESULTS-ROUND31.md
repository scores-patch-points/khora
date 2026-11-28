# Round 31: does a capital mark a name in THIS text? The convention rung for the being ladder

Preregistered `PREREG-ROUND31-CONVENTION.md` (sha256 `65e69387…`, 2026-11-28T03:04:47Z), ADDENDUM-1 (`97c8f35d…`, 03:05:56Z, before any run), ADDENDUM-2 (`ea5d4483…`, 03:10:19Z, after the DEV run, before any held-out run); frozen `FREEZE-ROUND31.md` (2026-11-28T03:13:10Z); one held-out run. Opt-in `readerOptions.nameConvention: true` (`native/adapters/text/name-convention.js`, applied in `read-core.mjs` after the capital tier); off, the read is unchanged (`native/tests/name-convention.test.mjs` 1; GUM slice E re-run off: CANON 113/19, CONTROL 101/40, the baseline's).

## Held out: GUM test + dev (60 documents, never read for being admission)

| | GROUND fired | P (names among cast spans on gold) | R (gold PROPN mentions covered) | FB (spans on gold common nouns) |
|---|---|---|---|---|
| plain, off | | 0.838 | 0.895 | 413 |
| plain, on | **0 of 60** | 0.838 | 0.895 | 413 |
| shifted (every gold NOUN capitalized), off | | 0.246 | 0.906 | 7,811 |
| shifted, on | 60 of 60 | **0.499** | 0.786 | **1,946** |

- **H1 HOLDS**: on modern English GROUND fired on 0 of 60 (the stamped prediction); ΔR = 0, ΔP = 0, intervals [0, 0].
- **H2 HOLDS**: shifted, ΔFB = −5,865, 95% [−6,376, −5,356] (−75%); ΔP = +0.252, [+0.225, +0.279]. The cost, reported without a decision as stamped: ΔR = −0.119, [−0.156, −0.089] (names whose every word the treebank holds as a common word are demoted with the nouns).
- **K HOLDS**: refusing the same number of capital surfaces at random (20 seeds) gives ΔP at most +0.079 (95th percentile +0.077); the rung's +0.252 is beyond it. The selection, not the count of refusals, carries the gain.
- **H4 FAILS**: the pronoun gold on GUM train slices with the rung on is not identical. E: CANON 113/19 → 112/19, CONTROL 101/40 → 100/40; C: CANON 113/25 → 114/25, CONTROL 95/47 → 91/47; D and F identical. GROUND fires on a few modern training documents (by construction the top of the reference's own spread, with significance), and there the CONTROL arm loses 5 right bindings with no wrong ones removed; CANON nets 0. Falsifier of H4 as stamped: a difference on any slice, met.

**Decision (as stamped): the rung stays off by default.** H1, H2 and K hold; H4 does not. Turning it on in the canonical options needs H4's cost resolved (a GROUND that never fires on a modern document, or a binding pass that keeps those bindings), measured in a new round.

## DEV (GUM train slice B, mechanics; not evidence)

- Stamped null (one pooled rate, 0.031): plain fired on 15 of 30, ΔR −0.080 [−0.117, −0.045]: H1 would have failed. This is what ADDENDUM-2 changed: the null became the reference's spread of per-document rates (`native/priors-shipped/convention-spread-eng.json`, GUM train, 197 documents: p50 0.043, p95 0.116, max 0.348), the standing rule's "units of a reference's own spread". With it, plain fired on 3 of 30; shifted 30 of 30.

## Exploratory: Old Bailey (16 trials, no gold, no decision; H3)

The rung fired on 8 of 16 trials (the other 8 capitalize non-names at 8–9%, under the reference's p95). Admitted-being mentions by what the treebank holds the head's lower-case form as: names 2,859 → 2,855; common nouns 5,435 → 4,113 (−24%); adjectives 352 → 186; verbs 330 → 131; forms the treebank never saw 1,460 → 1,460 (kept, the limitation ADDENDUM-1 stated: `felony`, `tryal`, `indictment` are not in the 16,654-form prior).

## Deviations

- ADDENDUM-1: the stamped r0 could not be computed (the POS prior is case-folded); r0 taken from the convention prior's witness, counted set aligned to it. Before any run.
- ADDENDUM-2: the null changed from a pooled rate to the reference's spread, after the DEV run showed the pooled null fires on modern texts. Before any held-out read.
- `gum-falsify3.mjs` gained an environment switch (`R31_NAME_CONVENTION=1`) to run H4's arm; frozen before the run.
- The unit test's first fixture claimed a sentence-initial name (Boris) as a being; the capital tier never admits a name that only opens a sentence, with the rung off or on. The test was corrected; the rung was not changed.

## What remains open

- H4's cost, above.
- Common nouns the treebank never saw: a broader giver (the Wiktionary pack through the hyperlexicon) is the next rung to test, in its own round.
- Part-name absorption ("Carter Lane London" holding every "London"): not addressed here.
