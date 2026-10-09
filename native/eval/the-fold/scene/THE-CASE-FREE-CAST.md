# The case-free cast — a standing finding (2026-10-09)

**The rule:** a being is found by **recurrence + company**, never by
capitalisation. Capitalisation is *a* signal, not *the* signal; it dies on
non-standard English (all-lowercase text, dialect, OCR, code, scripts without
case).

## Measured

On *Pride and Prejudice* Chapter X:

| method | normal | lowercased |
|---|---|---|
| `surfaces.discoverReferents` (production) | 30 referents (Darcy, Elizabeth, Bingley, Miss Bingley, Caroline, Charles, Jane, Netherfield, Pemberley …) | **0 referents** |
| `relations-gfp.extractGfpRelations` (recurrence+company) | Elizabeth · Darcy · Bingley · Miss · Mrs … | **elizabeth · darcy · bingley · miss · mrs …** — IDENTICAL |

So the production surface organ leans on `capCounts` and **collapses on
low-ercase input**; the recurrence+company path is case-free and reproduces the
same figures. (`relations-gfp.js`'s own header already states the law: *"NO
capitalisation-based figure discovery — figures are found by RECURRENCE +
company, which works on Russian, Hebrew, Korean, a musical motif, a code
identifier."*)

## The fix

`surfaces.discoverReferents` / `createSurfaceEvidence` must not require
`capCounts` — recurrence + company + the individuation test (a being keeps
company with *other* recurring tokens; a function word does not) must carry it,
case-free. Until then the fold reads standard-cased English only.

## Why this matters downstream

Everything built tonight hangs off the referent universe: kind induction is
over referents; abstractions trace referent → byte; the correspondence censor
checks against referent mentions; a summary is meaningful only if its beings
are bound. **A capitalization-dependent referent tier makes the whole chain
fail silently on non-standard English** — it doesn't error, it returns nothing,
and the summary degrades to `furniture examined`. The case-free rule is the
floor under every layer.
