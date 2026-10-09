# The boarding clause — a canonical note on the binding fallback tiers

*2026-10-08. What it took to make the machine say "Telemachus boarded the ship"
(Odyssey 2.415: ἂν δ' ἄρα Τηλέμαχος νηὸς βαῖν'), and the doctrine the fix keeps.*

## The sentence was never the problem

The raw text always carried it — the clause reader had the words, the spans, the
verb slot. What it could not do was BIND the action: empty clause, NULL subject,
"the read could not bind an act here." For a long while we mislabeled the wall
the "δ'-wall" (the δέ elision mid-sentence). It was never δ'. The wall was two
PRIOR-COVERAGE gaps, both in janus:

1. **Verb inflections unattested in the POSPrior** — ὁμάδησαν, βαῖνε, βαῖν'.
   `confirmedVerbSet` only admits forms the treebank tagged VERB/AUX; the rare
   inflected heads of the manuscripts were absent, so no clause formed.
2. **Proper-noun inflections unattested** — Τηλέμαχος, Ἀθήνη. The POSPrior and
   case-prior never saw them, so `nominalClass` refused and the hero never
   entered the beings — the ship (νηὸς) muddled in as the wrongly-cased subject.

## The remedy: measured fallback tiers, never hand-typed words

The seam already carried the two tables that could attest what the priors'
FORM-vocabularies lacked: the case prior's `verbPersonalEndings` (via `personOf`)
and `nominalEndings` (via `caseOf`). The fix reads CLASS from those measured
tables at the prior's OWN confidence floor, with one veto:

- **verbLike(w)**: attested as VERB, OR `personOf` votes an unambiguous personal
  person. Elided finals restored for the vote (βαῖν' → βαῖνε), because the
  apostrophe cut the vowel the ending-table votes on.
- **nominalLike(w)**: `caseOf` votes a strong nominal case (Nom/Acc/Gen/Dat),
  AND `personOf` does NOT also attest it as a verbal person (the veto: a
  personal-verb form that also wears a case-like ending is still a verb).
- The same fallback admits the referent universe (`refMap`), so the bound
  subject becomes a BEING, named through the dictionary.

## Discipline kept

- **No hand-typed forms or classes.** Every fallback is a vote from a prior
  table at its declared floor; nothing was added by hand. One FALSIFIED attempt
  removed: an invented `minShare: 0.8` literal in the fallbacks — rejected as a
  hand-set value ("a magic number wearing a derivation's clothes") and reverted
  to the tables' own defaults. Class of an unseen word is REFUSED, never
  improvised, when the measured tables cannot attest it.
- **Result measured**: the read grew from 1,210 to ~5,900+ clauses as the
  unattested verbs surfaced; the boarding edge became
  `verb=βαῖν' subj=Τηλέμαχος`; the hero is a being (
  `r_10016c7a`, "Telemachus") who acts as subject in 26 edges.
- The prior-coverage gaps themselves remain real janus work (the PRODUCTIVE
  vocabulary of inflection is not in the treebanks the priors were built from);
  the fallback is a seam-tier that reads class from the measured tables the
  treebanks DID provide, and stands REFUSED where none of them vote.

## Why this belongs in the canon

This is the same motion everywhere in the fold: the law (janus) names the
anchors; the perception (khora) reads what the law has not yet measured; where
NEITHER can attest, the reader refuses rather than guesses. The boarding clause
is proof the seam can follow the raw's own grammar through its priors — and
that the sentence was there to be found the whole time.