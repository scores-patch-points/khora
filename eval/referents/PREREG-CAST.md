# CAST: a capital that is only the sentence's — pre-registration 1, written before any code change and before any result on a confirmation set

Date: 2026-10-27. Agent: cc-cast-initial. Stacked on khora PR #79 (`pronoun-non-personal`), whose `pronoun-golden.mjs` it reuses.

## The defect

`read-core.mjs` names a being "what the capital tier names": `extractSurfaces(cuts, {})` over the document's sentences, intersected with the
referents the reader's index admitted. Of 2,321 cast beings over GUM slices B, C, D, 70 are one word with every mention at a sentence start;
38 overlap a gold mention (Belgian, Tuesday, Sunday, Friday, St, Photo, Sports, Andrew, Wikinews, El, He …) and about 32 overlap none (IF, Well,
First, After, Don't, Why, While, Ask, Actually, Create, Remain, Pay, Wow, Sometimes, Continually, Locate, Cheer).

Read on slice A before this file was frozen (27 such beings: Grab, Remember, Forget, Anything, Okay, Right, Well, Each, Recent, Figure, Image,
Gather, Stay, Color, Made, Three, We, He, Sorta, Ca, Portrait, Tuesday ×2, Saturday, Austen, Marx, Twain): every one has exactly one capitalised
occurrence the sentence cut calls mid-sentence, and **no lower-case occurrence anywhere in the document**. In the contexts printed, the cut calls
it mid-sentence because GUM's headings, bylines and list items carry no terminal punctuation and the eval joins sentences with a space, so the
next sentence's leading capital stands inside the same cut (a hypothesis the newline-join diagnostic below tests).
`surfaces.js::surfacesFromEvidence` reads "capitalised, never lower-case" as "the strongest possible evidence for namehood" and skips the
capitalisation test (`lower > 0 && cap > 0 && !capitalisationIsSignificant`) — the document has no lower-case side to test against, so a
word like "Grab" or "Well" passes with a count of one. Nothing else in the text can tell "Grab" from "Tuesday": both are one capital, once, no
lower-case. Only a giver can supply the missing side.

## The mechanism (one quantity, no category)

No part-of-speech list, no word list, no rule about sentence position. The existing test asks, of a word written both ways, whether its capital
count exceeds a FAIR COIN at its own sample size (`capitalisationIsSignificant`, exact one-sided binomial tail, `CAP_SIG_ALPHA` 0.05, unchanged).
When the document has no lower-case side, the same test is asked against **the giver's own rate** instead of a fair coin:

- `p0(w)` = (N + 1) / (N + O + 2), the rule of succession, where N = the number of name senses the giver lists for `w` as written (entries
  whose pos is `name` / `proper noun`) and O = the number of non-name senses it lists for `w` lower-cased. Senses counted, one per listed
  sense (one per entry when an entry lists none).
- The giver is SILENT, and the test is not run (today's behaviour exactly), when: no lexicon was handed to the read; the language is not English;
  the lower-cased form is not listed (nothing attests an ordinary use); or the word has a lower-case occurrence in the document (the
  document's own two-sided evidence stands, untouched).
- Otherwise the word passes only if `p0(w)^k < CAP_SIG_ALPHA`, k = its non-initial capitalised occurrences (all of its non-initial
  occurrences, since it has no lower-case one): the more ordinary the giver says the word is, the more capitals the document must show. A name
  that is also a common word ("Rose", "Mark") passes on a few capitals; a once-capitalised "Grab" or "Well" does not. A word the giver does not
  list stays a being (undecided stays a being, so recall is not lost).
- A word that fails leaves the capital tier and is kept with the heard rows (`entry.heard`), the typed home read-core already has for it.
- p0 is a witness of how ordinary the giver says the word is (a share of listed senses), not a usage frequency; the report says so.

Where it applies: `extractSurfaces` takes an optional `nameRate(surface)` → `p0 | null` (omitted: byte-identical). read-core builds it from the
same lexicon `consultNonPersonal` already asked (it asks every word of the text as written and lower-cased: no new ask).

## Slices

`slicesOf` of `pronoun-golden.mjs`, extended to also return A and `aside` (no change to B, C, D):

| set | draw | role |
|---|---|---|
| A | 30 docs, seed 20261110 | DESIGN: the rule's form is chosen here; its errors are read |
| E | 30 of the 65 documents set aside by seed 20261140, shuffled with mulberry32 seed 20261150, first 30 | CONFIRMATION: never read; scored once |
| B, C, D | the pronoun golden's slices | REGRESSION of the pronoun binding (B in-sample of the pronoun work, C and D out) |

Variants that may be compared on A (and only on A), before this file is amended with the choice:
V1 senses vs entries as the unit of N and O; V2 the rule in the cast tier only vs in the cast tier and the reader's index (the same
`nameRate` handed to the organ the index admits through). Choice: the variant that meets B1–B4 on A with the fewest gold-overlapping beings
dropped; a tie goes to the simpler (cast tier only, senses). The estimator `p0`, the test and alpha are fixed by this file and are not varied.
After the choice the file is amended (`PREREG-CAST-A1.md`, hashed) BEFORE E, B, C, D are scored. Nothing moves after.

## Quantities (the same harness for both arms; `before` = the rule off, `after` = on; same lexicon, documents, dials)

- A **cast being** is a row of `entry.cast`. A being is **dropped** when it is in `before.cast` and not in `after.cast` (matched by its sorted
  `allSurfaces`).
- **IO** (initial-only): every surface is one token and every mention span starts at a GUM sentence start (the parent probe's definition).
- **gold-overlapping**: some mention span overlaps a gold coreference mention (any entity, any head).

## Bars (numbers decided now; each reported held / failed with its number)

On the confirmation set E:
- **B1** the false admissions leave: of IO beings with no gold mention, at least 50% are dropped. Untestable (reported as such, not held) if
  there are fewer than 10 of them in E.
- **B2** recall is kept: at most 25% of IO beings with a gold mention are dropped, AND at most 1.0% of all gold-overlapping cast beings are
  dropped (the collateral across the whole cast).
- **B3** the cast's precision does not fall: the share of cast beings with a gold mention is not lower after than before.
- **B4** nothing else moves: no being appears in `after.cast` that was not in `before.cast`, and no multi-word surface is dropped.
- **B5** byte-identical when the evidence is absent: (a) with `lexicon: false`, every one of the 30 documents of E reads to an entry deep-equal
  (excluding `ms`) to the one the base commit (`origin/pronoun-non-personal`, run in a second checkout) reads; (b) a German passage read with the
  English lexicon, same comparison.
On the pronoun golden (B, C, D pooled, the eval's own run, both arms):
- **B6** unchanged or better: `shipped` right ≥ 18 and wrong ≤ 44; `shipped + np` right ≥ 49 and wrong ≤ 29.

## Controls (built to fail)

- **K1** `drop every IO`: drop every initial-only being on E. It must FAIL B2 (it drops every gold-overlapping IO being). If it held B2, B2 would
  not bite.
- **K2** `shuffled giver`: the same rule fed a lexicon whose answers are permuted across forms (seeded, mulberry32 seed 20261160), so each word is
  rated by another word's senses. It must FAIL at least one of B1–B4. If it holds all four, the bars cannot tell a giver from noise and that is
  said in the result.

## What this can and cannot show

It can show whether the lexicon's name-sense share, used as the null of the existing capitalisation test, removes the cast beings whose only
claim is a lone capital, without removing the gold-overlapping ones, on documents no rule was designed on. It cannot show: that it generalises
beyond GUM's genres or to text whose headings are newline-separated (a diagnostic on slice A, reported without a bar, re-reads A with the
sentences joined by a newline to say how much of the defect is the eval's join); that it holds for any language but English; that p0 is a usage
rate; that the beings it drops are not real mentions of something (GUM marks "Photo" and "Sports" as mentions; a caption is a mention of a
thing that is not a being by this cast's own definition — those are counted as gold-overlapping, against the rule, in B2).
