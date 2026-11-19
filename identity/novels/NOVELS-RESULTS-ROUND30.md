# Round 30: referents first, part 1 — speaker and addressee referents (I / you)

Preregistered (PREREG-ROUND30.md, 2026-11-19T02:44:49Z), frozen (FREEZE-ROUND30.md), held-out scored once each. The fixed giver: the official CorefUD scorer 4fd7b0e, head match, the same system writer as round 24 (`predict-corefud.mjs`). Added: `native/adapters/text/speakers.js` (quotations; the speaker is the cast being named in the tag, else an anonymous referent of the quotation; I-forms inside a quotation go to the speaker, you-forms to the previous quotation's speaker in a two-party exchange; a recurring first person outside quotations is the narrator).

## Result (CoNLL F1, singletons ignored / included)
| set | control (round 24) | speakers | shuffled-speaker control | one referent per document (post hoc, see below) |
|---|---|---|---|---|
| English-LitBank dev | 36.80 / 33.34 | **43.75** / 39.94 | 42.19 / 38.81 | 44.74 |
| English-GUM dev | 19.62 / 19.71 | **29.18** / 27.60 | 28.77 / 27.33 | 29.22 |

The control reproduces round 24 exactly (36.80, 19.62), so the comparison is like for like. LitBank dev, MUC recall 41.2 -> 55.5 and MUC precision 84.0 -> 86.3 (the added links did not cost precision); B-cubed F1 31.5 -> 40.4; CEAFe precision fell 37.6 -> 30.6 (larger clusters). Mentions added on LitBank dev: 385 (1,216 -> 1,601), against 530 first/second/third-person-other pronoun mentions in the gold chains (we/us are not handled).

## Claims
- R1 MET: LitBank dev rises 36.80 -> 43.75 (+6.95), and GUM dev 19.62 -> 29.18 (+9.56, not claimed).
- R2 MET, narrowly: on LitBank dev the speakers beat the shuffled-speaker control on CoNLL F1 (43.75 against 42.19, +1.6) and on MUC precision (86.3 against 85.1). On GUM dev they beat it by 0.4 (29.18 against 28.77): the control is strong because a document has few speaker referents, so a random choice among them is often right.
- R3, R4 reported above.

## What the result actually says (failure first)
- The quote-structure attribution does NOT earn its complexity. After seeing the results I ran one more arm, post hoc and exploratory (not preregistered): every first-person mention of a document into ONE referent and every second-person mention into ONE referent, no quotation structure at all. It scores 44.74 on LitBank dev and 29.22 on GUM dev: at least as good as the speaker attribution (43.75, 29.18). Mixing speakers hurts a little in the gold, but on these documents one narrator or one dominant speaker carries most first-person mentions.
- So the gain is from ADMITTING the kind: I/you/we as referents (the 22.5% the read never made referents), not from the cleverness of who speaks. That is the point of the referent rule, and it is worth about 7 to 10 CoNLL points here.
- Development (10 LitBank train documents, before the freeze): 39.45 without, 46.51 with speakers, 42.22 for the shuffled control. The held-out gain over the control (1.6) is smaller than the development gain (4.3), the same pattern as the binder session's rounds.
- English is still at 43.8 (LitBank) and 29.2 (GUM) against a bar of 94. Not near.

## Limits
- The typed-list problem: the I/you detection is a closed-class regex of pronoun forms, declared in the preregistration; under the repo's "earned, never typed" ruling the version to keep reads Person=1 and Person=2 from the parser's own UD features (and works in other languages). Not done.
- Not handled: we/us/our, it, they, and noun-phrase referents (19% of the gold mentions, and the "it/they" share). The binder session's lessons for that round are in `identity/novels/NOTE-BINDER-LESSONS.md`.
- Not wired into the read: `speakers.js` is an adapter used by the scoring writer only (`SPEAKERS=1`). The profile still lists `speaker_addressee` as unadmitted; wiring changes read-core.mjs and the hash-pinned set of the Math/binder session (they asked to be told first).
- The tag rule found a named speaker rarely on its own; every I in an unnamed quotation is an anonymous referent of that quotation, never merged across quotations.
