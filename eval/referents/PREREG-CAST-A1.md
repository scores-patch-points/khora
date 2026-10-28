# CAST: a capital that is only the sentence's — amendment 1 (written after the design set A was read, before the confirmation set E or B, C, D were scored)

Amends `PREREG-CAST.md` (sha256 in `PREREG-CAST.sha`, written 2026-10-27T14:13:51Z, kept unchanged). Nothing in E, B, C or D has been scored.

## What slice A showed, and what it overturned

1. **The registered mechanism was wrong, in direction.** Registration 1 asked whether `p0^k < 0.05`, p0 the lexicon's name-sense share. A word the
   giver rates mostly a name has a LARGE p0, so its p0^k is large and it fails the test: on A the rule dropped 179 of 806 gold-overlapping beings
   (22%: Texas, Canada, English, Mary, Google …). I had checked the direction on the ordinary words only. The mechanism is replaced, not tuned.
2. **No dictionary-only rating can do it.** Of the 145 gold single-word beings on A with one capital, no lower-case twin in the text and an entry in
   the lexicon, many are listed as verbs ("Google", "Skype", "French") or as mostly ordinary ("Government", "Professor"), as "Grab" and "Well" are.
   Any threshold on the sense share, or on the non-nominal share of senses, drops dozens of them.
3. **The defect is not the eval's space-join.** Registration 1 hypothesised that GUM's unpunctuated headings run into the next sentence because the
   eval joins sentences with a space. Re-reading A with the sentences joined by a newline leaves 26 of the 27 initial-only single-word beings (10
   without a gold mention, 16 with; with the space-join, 27: 11 and 16). The sentence cut does not break at a heading with or without a newline. The
   defect is the cut's and is out of this change's reach; this change answers what the capital tier does with the lone capital the cut leaves.

## The mechanism, replaced

The giver is the pos prior the reader already holds (`pos-eng.json`, a received prior: UD_English-EWT train, human-annotated, per-form tag COUNTS kept;
`wordclass.js::classifyWord` is the repo's lens over it). GUM is a different corpus, so the giver has not seen the ground the cast is scored on.

For a single-word candidate with `cap` non-initial capitalised occurrences and NO lower-case occurrence in the text, `form-usage.js` returns the
treebank's use of the form: `nominal` = its count under NOUN, PROPN or ADJ (a name, a noun, or an adjective that names a people or a language),
`other` = its count under every other tag. `surfaces.js` asks the test it already has, `capitalisationIsSignificant(other, nominal + cap)` (the exact
one-sided tail at a fair coin, `CAP_SIG_ALPHA` 0.05, unchanged): the word is refused when its non-nominal uses exceed what its nominal uses plus the
text's own capitals can balance. `other` = 0, a form the treebank has not seen, a text with a lower-case occurrence, no pos prior, or a language other
than English: the test is not asked and the word is what it was (undecided stays a being). Cast tier only: the reader's index is not changed, and a
refused word is kept with the heard rows.

Variants compared on A, the whole of the exploration (the cast under each, replayed from a rule-off read):

| nominal class | text's capitals counted | IO without gold dropped (of 11) | gold-overlapping dropped (of 806) | of which IO with gold (of 16) |
|---|---|---|---|---|
| the repo's THRAX_MAP "noun" (NOUN, PROPN) | yes | 9 | 30 (3.7%) | 7 |
| NOUN, PROPN, ADJ | yes | 7 | 12 (1.5%) | 6 |
| NOUN, PROPN, ADJ | no | 7 | 13 (1.6%) | 6 |

Choice, by the criterion registered in 1 (B1 holds, then the fewest gold-overlapping beings dropped): **NOUN, PROPN, ADJ, the text's capitals counted.**
The adjective is added to the repo's declared map because 18 of the gold beings the narrower class dropped on A, and the chosen one does not, are 17
occurrences of ten demonyms and language names ("Chinese" 3, "American" 3, "Japanese" 2, "French" 2, "British" 2, "Western", "Spanish", "Israeli",
"Indian", "Canadian") and "Recent". That is a choice made by reading A. Counting the text's own capitals changes little on A (13 against 12 dropped); it is
kept because it is the same quantity the two-sided test counts.
Registration 1's second variant (the rule in the reader's index as well as the cast tier) was not evaluated.

## Bars and controls

The bar NUMBERS of registration 1 are unchanged: B1 ≥ 50% of the initial-only beings without a gold mention dropped (untestable under 10); B2 ≤ 25% of the
initial-only beings with a gold mention dropped AND ≤ 1.0% of all gold-overlapping cast beings dropped; B3 cast precision not lower; B4 nothing added,
no multi-word surface dropped; B6 the pronoun golden unchanged or better. On A the chosen rule would hold B1 (7/11 = 64%), fail B2's first part (6/16 = 37.5%
of initial-only gold dropped, though they are "Anything", "We", "Three", "Each", "Figure", "He": a pronoun, a determiner, a numeral, a caption) and sit near
B2's second (12/806 = 1.5%). They are not relaxed to fit A; E is scored against them as registered, and a failure is reported as one.

B5 (byte-identical when the evidence is absent) is restated for the new giver: (a) with the pos prior withheld (`priors` with `posPrior: null`, the same for
the base commit and this one) every document of E reads to an entry deep-equal (excluding `ms`) to the base commit's; (b) a German passage read the same way
is deep-equal. The lexicon is no longer an input of this change.

K1 is unchanged. K2 (the shuffled giver) now permutes the pos prior's per-form tag counts across forms (mulberry32 seed 20261160), so each word is judged
by another word's use; it must fail at least one of B1–B4, else the bars are said to be unable to tell a giver from noise.

Reported with no bar: the narrower class (THRAX "noun" only) replayed on E; the dropped beings listed with their gold status; the entry's `heard` rows that
gain a refused being.

## The ledger

`native/adapters/text/conventions.js` is the nomos of the capital tier: one `NomosRule@1`-shaped row per convention the cast reads a capital by (capital marks a
name; a capital opens a sentence; a sentence end is marked; the treebank attests a form's use), each with its standing, giver or builder, witnesses and the address
where the reader stands on it, and where it departs. The figures in its witnesses are measured by `convention-witness.mjs` on GUM train (sha256 pinned) and
DESCRIBE how closely English keeps each convention; the cast never reads them.
