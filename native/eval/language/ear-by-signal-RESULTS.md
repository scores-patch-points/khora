# ear by signal-from-noise — result

Instrument: `eval/language/ear-by-signal.mjs` (new dir/file, 2026-10-07; pre-registration in the file). Same text, same full
production read (`the-fold/read-door.mjs::readDoor`), only the EAR changes (`withEar`/`grammarFor(lang).ear`). Signal = relations
whose participant surfaces are all content tokens (not closed-class, not punctuation); noise = the rest.

## Choosing by ear beats the label

Fixture: the Tesla article (true language English), 5,000 chars.

| ear | detected | cast | rel | **signal** | SNR |
|---|---|---|---|---|---|
| **eng** | eng | 39 | 56 | **45** | 0.804 |
| fra | fra | 51 | 6 | 5 | 0.833 |
| deu | deu | 75 | 7 | 5 | 0.714 |
| ita | ita | 75 | 7 | 5 | 0.714 |
| **detected** | **lat** | 15 | 14 | **4** | 0.286 |
| lat | lat | 15 | 14 | 4 | 0.286 |
| spa | spa | 82 | 16 | 4 | 0.250 |
| por | por | 75 | 16 | 4 | 0.250 |

- The production default **detects `lat`** (Latin) for English and extracts only **4** content relations; the true ear (`eng`)
  extracts **45** — an **11× margin**. Choosing the ear by what it hears recovers the right listening where the label fails.
- Other Latin-script ears fragment English (5 or fewer signal relations), so the winner is the true ear, not merely "not lat."

## Method note (amendment): raw SNR is gameable

The first cut ranked by SNR alone and `fra` "won" with 0.833 — on **6** relations. An ear that emits few relations scores high on
ratio. "Extracts the most signal" is the **signal count** (content relations); SNR is a tie-break and rows under a 5-relation
floor are ineligible. Re-ranked by signal, `eng` wins as above.

## What this gives

- A **measurement-based ear selection** that is independent of, and complementary to, the language detector: it can confirm a
  label, or override it (here it overrides `lat`→`eng`). Cost ~11 full reads per document (~11 s at 5 KB) — fine per-document in
  a sidecar.
- Confirms the production default's own failure mode (`lat` on English) that the language-ID work is fixing; when the new
  detector lands, this harness is the cross-check and the fallback.
- Connects to the sidecar: the chosen ear is itself a witnessed, recorded fact ("read X through the eng ear; it extracted 45 vs
  4"), so it belongs in the log as an entry, not as a hidden default.

## Scope

One English fixture; the harness takes any `--text`. Not an omni benchmark. Reproduce:
`node eval/language/ear-by-signal.mjs --tesla --cands eng,lat,spa,fra,deu,ita,por,nld`.
