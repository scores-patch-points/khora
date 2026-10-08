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

## Amendment A1 (2026-10-07) — step (a) done, and it splits: chrome helps, the capital name-gate hurts

The gate functions were already written into `bindEnd`; `main()` simply never passed them. A1 wires them as a **new run**
(`--chrome-gate` / `--name-gate`, `chromeDf 0.5` family genericity). A0 reproduces *exactly* with the gates off (K1 ✔:
9.23% / 13.91% / 64.0%). Chrome and the name gate are measured **separately** so each is judged on its own.

| family | A0 bound (share) | A1c chrome-only | A1 chrome+name |
|---|---|---|---|
| gitenberg | 30 (9.23%) | 21 (6.46%) — 29 chrome ends dropped | 18 (5.54%) — +31 non-name ends |
| world-factbook | 63 (13.91%) | 59 (13.02%) — 9 chrome ends dropped | 23 (5.08%) — +89 non-name ends |
| un-udhr | 128 (64.0%) | 128 (64.0%) — chrome inert (no ≥0.5 df) | 4 (2.0%) — +163 non-name ends |

**Chrome (A1c): a small, clean win.** It removes the boilerplate ends A0 named (`gutenberg ebook` ×29 on gitenberg;
`president` etc. on factbook) at a cost of 9 and 4 assertions, and is correctly inert on UDHR. Keep it.

**The capital name-gate (A1): FALSIFIED as an improvement.** It removes 31/89/163 ends — but it is rejecting **genuine names
the reader already found**, not junk. The reader's cast displays are **majority lowercase** in every family (gitenberg 174/314,
factbook 302/534, udhr 446/586 lowercased), e.g. `abdelmadjid tebboune`, `bouteflika`, `mundu`, `punda`. Capitalisation is the
**source's** witness, not the reader's — a factbook that prints a name lowercase (or a UDHR translation that never capitalises)
is scored as "no name", and bound share collapses (UDHR 64% → 2%). So the gate does not measure name-ness; it measures the
source's casing. `--name-gate` is left in the instrument **demonstrated and off**, not wired as a default.

### What this changes about the plan

- Step (a) is done: keep the **chrome** gate; drop the **capital** name-gate.
- The name witness at this tier must be the **cast's own admission standing** (was the surface admitted as a name-bearing
  being by the projected cast / a non-capital witness), **not** `isNameWitness` on the display's first letter.
- Step (b) is unchanged and is now the whole of the remaining lever: the reader must emit relation ends that carry a `ref`
  (entity-bounded extraction) and a coreference/individuation pass must move `probe`→`witness`; the low bound share is a
  property of the reader's ends, not of the binding.

### Repro (A1)

`node eval/sidecar/bind-relations.mjs --dir eval/sidecar/v1-gitenberg --chrome-gate --out <out>` / add `--name-gate` for A1.
Summary JSON now carries `chromeEnds`, `nonNameEnds`, `gate`, `verdict`, `rejections`.