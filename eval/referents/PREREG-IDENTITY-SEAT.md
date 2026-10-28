# PREREG-IDENTITY-SEAT — the opinion limit at the identity seat: the necessity count, a plain baseline, and the slot (no model is called)

Registered 2026-10-27 by `referent-read`, before the English test documents or the Russian dev blocks named below are read by the ledger or by any harness of mine. Hash and time beside it (`.sha256`, `.time`) and in the log.
Leave: the coordinating session's relay of the user's direction (claude-ring-39, `reading-rules-audit/THE-OPINION-LIMIT.md`): an LLM may take part in the reasoning only as an auditable **opinion** filed into the fold, and the precise limit is to be found per seat by necessity, quality and avoidability. This file does the **identity seat**'s first two numbers on the plain side and the third thing, the slot. It calls no model.

## What is registered

- **(a) Necessity**: how many mention pairs the plain mechanics leave open, on English and on Russian, after the plain arms (the ledger, `referents: true`, with the declension fold for Russian).
- **(b) A plain baseline**: for each class of pair, how right the mechanics' own verdict is against gold; the majority-class baseline; a shuffled baseline.
- **(c) The slot**: the event under which an opinion would be filed in the ledger (kind, holder, lens, supersede), as a builder, a validator and a fold test. An opinion is an `EVA` event (Relate, Significance; site Lens, stance Binding), not a `SYN` or `CON`: `foldLog` (reading-timeline.js) applies SYN and CON and ignores EVA, so an opinion **cannot license by construction**.
- Not registered, not claimed: any model's quality; that any seat survives; that an opinion may enter a verdict.

## The pair space and its classes

Gold names (as in `PREREG-REFERENT-READ.md` for English, `PREREG-DECLENSION-RU.md` for Russian): the evaluation set G is the gold names a plain cast span overlaps; each is labelled by the ledger span of largest overlap (cast beings only, `universeSpans`); a gold name with no ledger label is **unbound**.
For every unordered pair of G within a document, its **gold relation** is *same* (equal gold identity: the entity id in GUM, the lower-cased lemma sequence in Russian) or *different*. Its **mechanical class** is the first that holds:

1. **UNDECIDED** (strict): either mention is unbound, or both mentions' referents are one referent that the ledger filed `referent_merge_unearned` on (the gap says the merge is unearned).
2. **DIFF_SPLIT**: two referents the ledger separated with a typed `referent_split` (a decision on a structural cue, filed as a gap).
3. **SAME_FORM**: one referent and equal normalized spellings (the same string).
4. **SAME_VARIANT**: one referent and different spellings (a variant, containment or case form joined by the index: spelling evidence alone, rung 1 of the ladder).
5. **DIFF_SHARED**: two referents, no typed gap, and the two spellings share a name token (the mechanics kept them apart while the spelling overlaps: "Anna Smith"/"Boris Smith", "Padalecki"/"Jared Padalecki").
6. **DIFF_DISJOINT**: two referents with no token in common.

The **contestable set** = UNDECIDED ∪ SAME_VARIANT ∪ DIFF_SHARED: the decisions the mechanics make on spelling evidence or not at all. By the ladder (rung 1 is evidence, never a verdict) these are the pairs a verdict has not been earned for; **strict necessity** is UNDECIDED alone.
Pronouns (English): from the pronoun golden's own rule on the same documents, the **answerable** gold pronouns are bound right, bound wrong, or **unbound** (undecided; the resolver's gaps do not reach the entry, so none is typed). Counted and reported; no slot can be filed for an unbound pronoun until the resolver's gaps are surfaced, and the file says so.

## What is measured, per slice

For each class: the number of pairs, the share gold-*same*, the **mechanics' verdict accuracy** (SAME_* counts a gold-same pair as right; DIFF_* and DIFF_SPLIT a gold-different pair; UNDECIDED has no verdict, only the gold-same share), the **majority-class baseline** (the larger of the two shares), and a **shuffled baseline** (the gold labels permuted within the class, 199 draws, seed 20261128; the mechanics' accuracy must lie above the draws' 95th percentile to say the verdict carries information in that class). Also: the number of pairs, of documents, of typed gaps by kind; and the **error mass** in the contestable classes (gold-same pairs the mechanics kept apart: fission; gold-different pairs it joined: fusion).

## Data (unread by the ledger and by these classes)

- **English, E1**: the 30 documents of `UD_English-GUM/en_gum-ud-test.conllu` (sha256 `cd96a285e7339f401f4803dd0f4f61109c51692e3ef6f9186a1f977544080b69`). Disclosure: claude-ladder-3 used this file as the ground of another question (the reader at arm's length, two halves of one document); nothing of that question is a pair class here. The lexicon is the local Wiktionary pack, as for the other English harnesses.
- **Russian, R1**: `UD_Russian-GSD/ru_gsd-ud-dev.conllu` (sha256 `e3e3d4e8d1d7544e531b2b81ae64257efacc97f93276ce6d2ce52fd1de052fa2`), 579 sentences cut into blocks of 100 (no document marks), `declension: true`. The part-of-speech prior was built from GSD train, so the gate is in-distribution here; stated.
- **Not touched**: the oracle pilot's reserved P (30 documents of `gum-slices.json`) and the leftover 5.
Each is read **once** by the harness at the frozen commit; no module or harness change after reading; the result stands whichever way it falls.

## Bars (this is a measurement; the bars are about the harness and the slot, not about the numbers)

- **S1** the classes are mutually exclusive and exhaustive over every pair, and a unit test builds one pair of each class from a crafted reading.
- **S2** the opinion builder refuses an event without a holder of the form `self:model:<id>`, a lens that is a sha256 of the prompt, an `about`, and a verdict from {same, different, undecided, refused}; an opinion always carries `licensing: false` and `opinionDependent: true` and cannot be made licensing by a field; a retraction is an event that supersedes.
- **S3** `foldLog` over the ledger's log with any number of opinions appended returns exactly the state it returns without them (an opinion changes no referent, no mention, no assignment): the property that makes it unable to license.
- **S4** the harness's numbers are reproduced by a fixture with known counts.
- The numbers are reported as they fall. Expectation, written now so it can be wrong: strict necessity (UNDECIDED) is near zero on both languages; the contestable set is not; the mechanics' accuracy on DIFF_SHARED is where an opinion would have room, and SAME_VARIANT accuracy is high.

## Decision rule and what is not claimed

If S1 to S4 hold, the slot module and the harness are offered as a PR (additive; no reader change; the option stays as it is). The numbers are logged either way. Not claimed whatever they say: that a model should sit in any seat; that the contestable set is where one would help (that needs the model arm, a separate registration, after this); that gold coreference is truth (it is the annotators' reading); that anything here holds for a third language.
