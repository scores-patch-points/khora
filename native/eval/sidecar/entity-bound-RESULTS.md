# v2 step (b) — entity-bounded relation ends: the share rises, but containment invents binds

Instrument: `eval/sidecar/entity-bound.mjs` (pre-registration in the file, and in `corpus-session.js`
`projectRelations`). Reader change: with `entityBound:true`, a relation end that did NOT resolve at read time is
rebound to the FINAL cast — **exact** surface, else **unique containment** (the end contains exactly one cast
surface of length ≥ 3). Default **OFF** (the read is byte-identical unless asked). Re-read of the v1 families,
10 docs each, 3000 chars, `earSelection:"auto"`.

## The numbers (off → on)

| family | docs | relations | both-bound | share | rebound (exact/containment) |
|---|---|---|---|---|---|
| gitenberg | 10 | 163 | 13 → 33 | 0.0798 → **0.2025** | 6 / 61 |
| world-factbook | 10 | 218 | 32 → 48 | 0.1468 → **0.2202** | 9 / 58 |
| un-udhr | 10 | 143 | 99 → 107 | 0.6923 → **0.7483** | 22 / 8 |
| **aggregate** | 30 | 524 | 144 → 188 | 0.2748 → **0.3588 (Δ +0.084)** | 37 / 127 |

Relation count unchanged OFF↔ON (0 mismatches) — the rebind relabels ends, adds/drops nothing. Deterministic.

## The finding: only the EXACT tier is trustworthy

The pre-registered claim ("raises the both-bound share **without inventing binds**") splits:

- **HOLDS** on the count/share clause: the share rises on every family, from real cast knowledge.
- **FALSIFIED** on "without inventing binds": the gain is dominated by the **containment** tier (127 of 164
  rebinds), and containment is too loose — it binds clause ends to common-noun cast surfaces. Read the samples:

```
factbook   proceeded: of Algeria | throughout the 19th century and was marked by many atrocities→century
factbook   led: ...to prevent what the secular elite feared...→extremist
factbook   entered: year Machiavelli | the public service→the_prince
gitenberg  increasing: activity and | influence→influence
gitenberg  following: taste the | narrative has been designed→narrative
```

A whole clause bound to `century`/`extremist`/`the_prince` is a manufactured warrant, not a bind. The **exact**
tier (37 rebinds) is the real, trustworthy gain; the other 127 inflation is the false-bind class.

## Verdict and the amendment

**PARTIAL**, and the honest direction is clear: **restrict the rebind to the EXACT (and multi-word unique)
tier; drop single-common-noun containment.** Per the pre-registration rule ("a second round is a new, dated
amendment"), that is **Amendment A1** to the instrument, not a retune of this run:

> **A1 (proposed, not yet run):** rebind only by exact surface, or by containment of a cast surface **that is
> itself name-witnessed / multi-word** — never a single lowercase common noun. Predicts: the share gain shrinks
> toward the exact figures (gitenberg +6, factbook +9, udhr +22) and the false binds fall out.

The reader change is committed **default OFF**, disclosed, and adds real (exact) binds today; the containment
tier is present, measured, and flagged as the thing A1 must fix.

Reproduce: `node eval/sidecar/entity-bound.mjs --per-family 10`.
