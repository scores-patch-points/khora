# relation binding as an assertion — result (Track A, step 1)

Instrument: `eval/sidecar/bind-relations.mjs` (new file, 2026-10-07; pre-registration in the file). A projection: it does NOT
re-join strings. For every relation participant it emits a STANDING-bearing binding — `witness` (the reader gave a referent
id), `probe` (unique surface match, nominated), `ambiguous` (never silent), `unbound` (typed gap with the reason) — and writes
only both-bound relations out as `EORelationAssertion@1`. The binding is an assertion because it is refutable and revisable,
not a lookup.

## The honest bound share (before any reader change)

| family | relations | both-bound | share | basis (witness/probe/mixed) | unbound | self |
|---|---|---|---|---|---|---|
| gitenberg | 325 | 30 | **9.2%** | 30/0/0 | 295 | 2 |
| world-factbook | 453 | 63 | **13.9%** | 52/0/11 | 390 | 24 |
| un-udhr | 200 | 128 | **64.0%** | 95/6/27 | 72 | 20 |

- `probe` (surface-only) binds almost nothing: where the reader didn't already resolve it, the participant surface never equals
  the cast's display surface — that is the coreference/individuation gap, measured.
- `unbound` is the honest remainder: the extractor gave a relation whose end is a clause, a function word, or an unresolvable
  variant. Reported as typed gaps, never silently dropped.

## The bound layer is real and the noise is specified

- Genuine assertions appear and bind: `Nicolo Machiavelli |was born at| Florence`, `Alexander Hamilton |,| John Jay`,
  `John Jay |, and| James Madison`, `The Call |OF THE| Wild`.
- Specified noise, in two classes:
  1. **Chrome leaks into relation ends** — `gutenberg ebook |THE| The Prince`. Cast-chrome projection happened at the cast tier;
     the relation ends were not run through it. Fix: apply the family-genericity/name filter to relation ends too (a projection
     step, not a reader change).
  2. **Non-name ends bind** — `life |of| Lorenzo` (title word), and in UDHR the ends are named-keyword tokens (`Dirêtu`,
     `Hómé`, `mundu`), not proper names. Fix: the name-witness gate on ends.

## What this establishes

1. The **binding-as-assertion machinery works**: ends resolve by witness where the reader resolved them, and everything else is
   typed, never silent. The 9–64% spread across families is the true before-fix relation floor — that IS the v2 starting point.
2. The **reader is the lever**, not the binding: `unbound` is dominant because extraction emits clause/function-word ends, and
   `probe`≈0 because there is no coreference/individuation. Raised bound-share requires entity-bounded extraction + coreference.
3. **Chrome and non-name ends must be filtered at the relation tier too** (projection, cheap) before the bound layer is presentable.

## Repro

`node eval/sidecar/bind-relations.mjs --in eval/sidecar/v1-<family>/sidecar.jsonl --out eval/sidecar/v1-<family>-bound`
(assertions at `<out>/assertions.jsonl`, metrics at `<out>/summary.json`).

Next: (a) filter relation ends through the cast-chrome + name-witness gates (projection, now); (b) the reader change —
entity-bounded extraction and a coreference/individuation pass — to raise `unbound`/`probe` into `witness`.