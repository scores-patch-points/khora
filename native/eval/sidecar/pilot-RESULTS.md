# reading sidecar — bounded pilot (result)

Instrument: `eval/sidecar/pilot.mjs` (new dir/file, 2026-10-07; pre-registration in the file). Full production reader
(`readDoor`), ear chosen by SIGNAL, 40 documents sampled across all 16 ethos categories, 4,000 chars each. Sidecar written
append-only to `eval/sidecar/pilot-results-big/sidecar.jsonl`, summary to `summary.json`.

## By the declared floor it PASSES

- **40 documents, 0 errors, ~0.8 s/doc.**
- usable (>= 3 referents AND >= 3 relations): **39/40 = 0.975**.
- mean **32.4 referents**, mean **24.2 relations** per document.
- ear-by-signal picked an English-family ear on **20/21** English-category documents; code-switched docs came out
  `by-ear-mixed` (per-script segments), e.g. `cat+arb+eng` on a Qur'an parallel text.

## But the layer is noisy — the floor is too low to call it good

Eyeballing the sidecar (this is the real result):

- **Casts mix real entities with junk and boilerplate.** The Jungle Book: `Rudyard Kipling, Father Wolf, Mowgli, Seeonee,
  Tabaqui` — but also `gutenberg ebook, Project Gutenberg (x3), night, luck, wolves, tiger, madness`. Heart of Darkness:
  `Joseph Conrad, ...` alongside `sea, sails, tide, river, gloom, shores, sky`. Roughly half real names, half common nouns;
  Project Gutenberg front matter dominates the first 4 KB of every Gitenberg text.
- **Relations are grammatical but often nonsensical.** `Character encoding: ASCII :: set`, `Gutenberg License ... :: included`,
  `EBOOK JUNGLE :: THE`, `reader his work :: understand`, `evenings in aloud to their children :: reading`. These parse; they
  don't mean.
- **The ear selector is an English magnet.** On Latin-script documents it chose `eng` for French, Spanish, Greek and Pali
  texts (`henry-iv-part-1-frenc` -> eng; `es-ni` -> eng), because the English prior is largest and therefore emits the most
  relations — so "most signal" rewards the biggest ear, not the right one. One code doc (`ziglang`) chose `deu`. The selector
  works for the misdetection it was built for (English->lat), but it is biased toward high-prior Latin ears.
- **Non-Latin / code-switch:** the Chinese SMS doc returned a cast of 16 with **0 relations**; the mixed docs returned few
  referents. Known weakness, disclosed, not hidden.

## What the pilot establishes

- **The machinery is real and cheap:** an append-only sidecar, one line per document, with address, ear, cast, relations,
  gaps — end to end, in under a second per document. That part is done and reusable.
- **The layer is not yet trustworthy.** The 0.975 pass is an artifact of a lenient floor (3 and 3). The honest reading is that
  the first sidecar layer is *populated* but *unclean*: boilerplate and common nouns in the cast, grammatical-but-empty
  relations, and an ear selector that needs a size-bias correction before it means "right ear" and not "biggest ear."
- **Concrete next fixes, in order:** (1) cast hygiene — suppress boilerplate (front-matter spans) and settle common nouns
  (the "no name" tier); (2) the English-magnet in the ear selector — normalize signal by the ear's own base rate, or score
  "signal per unit prior," not raw signal count; (3) relation meaning — the clause relations need a quality gate, not just a
  count.

## Scope

40 documents, 4,000 chars each, one sample; the trail table is per-process, not yet the persistent log; correctness is not
adjudicated against gold. "Usable" was a floor, and the pilot shows the floor is too low — a useful negative result.

Reproduce: `node eval/sidecar/pilot.mjs --docs 40 --per-cat 3 --chars 4000`.
