# Proposed table changes: DRAFT for the owner's review, nothing applied (2026-11-24)

What the cell tests would justify changing in the grammar-to-cell table, row by row, each tied to a file. Written by the grammatical-categories session on the owner's word ("Draft it"). `cube.js`, `universal-grammar.js`, the Sheet and the essay are untouched; no session has edited them. Untracked, uncommitted. The reading of the tests themselves is in `CELL-FINDINGS-RECONCILED.md`; every number below is quoted from the file named, with its split.

## How to read it
- **The measured entries came from Ancient Greek** (`cube.js`, lines 116 to 123), and every cross-language test left Greek out. "Contradicted" therefore means the placement does not carry across the 25 languages tested (no English among them), not that it is wrong for Greek. The kernel says measured entries are never overridden (`universal-grammar.js`, the three kinds of entry), so no row below changes a Greek cell.
- **All cross-language label evidence is two LLM raters' sentence-level cell labels on the same 11,255 sentences.** Every positive is a lead. Strength words: *two instruments* (a label test and a test of mine agree), *one instrument*, *one rater*, *untestable*.
- **Modes** below are the kernel's own: Differentiate is NUL, SEG, DEF; Relate is SIG, CON, EVA; Generate is INS, SYN, REC (`universal-grammar.js`, the rule for declared placements).

## A. One structural change, recommended
Add to each entry a cross-language status beside its `basis`: `supported`, `unsupported`, `contradicted` or `untestable`, with the evidence file and the number of languages. The cell does not change; a reader that wants a hard prior can skip entries that are not `supported`. This follows the repo's own rules (a typed gap beats a guess; a measure that changed is a recorded pin, not an overwrite). The schema already carries `basis` and an optional `reason`, so this is one more optional field.

## B. Entries to mark as not generalising (the Greek cell stays)
| entry (basis) | what the tests say | mark as | strength |
|---|---|---|---|
| Mood=Imp to NUL·Ground (measured) | significantly negative in both raters: −0.590 (−0.893 to −0.271) claude, −1.114 (−1.528 to −0.646) gpt4, on 104 and 106 clauses; and it is a main-clause form (5.6% adjunct, 607 instances), so no rank reason for Ground either | contradicted | two instruments |
| Mood=Ind to EVA·Ground (measured) | the table gives it to 2,113 of 4,393 sentences (48%) while 45 (1%) carry the label; lift −0.075 (−0.285 to 0.113), rank 24 of 27. Behaves as the unmarked default | unsupported (no cell) | one instrument, large n |
| Person=3 to INS·Figure (measured) | −0.030 (−0.104 to 0.027), rank 18 of 27, n 2,548; the markers that replicate for INS·Figure are numerals and the perfective | unsupported | one instrument, large n |
| Case=Gen to CON·Pattern, Person=2 to SIG·Figure, VerbForm=Part to SEG·Pattern (measured) | significantly negative: −0.943 (−2.42 to −0.18), −1.353 (−3.32 to −0.035), −0.729 (−1.49 to −0.10) | contradicted | one instrument, small counts |
| Voice=Mid to REC·Ground (measured) | gpt4 −1.407 (−2.255 to −0.383); claude −0.559 (−1.170 to 0.000) | contradicted | one rater clear |
| Definite to SIG·Pattern (declared home of the dimension) | testable only in gpt4 (85 labels; 10 and 42 in the other two): Def −0.108 (−0.378 to 0.053), Ind −0.115 (−0.540 to 0.249) | unsupported | weak |

## C. Per-value refinements the data now support (the kernel's `DECLARED_VALUES` style, each with a reason)
The kernel gives the whole PronType dimension one home, SIG·Figure, and says per-value refinements are added only where measured. Two now have a measurement:
| refinement | evidence | strength |
|---|---|---|
| PronType=Neg to DEF·Figure (the home SIG·Figure was killed: +0.584 (−2.238 to 1.439) consensus, all three label sets) | lifts DEF·Figure in all three: +1.799 (1.144 to 2.201), +1.372 (1.021 to 1.639), +1.410 (0.887 to 1.788); but only 1 language in consensus and 5 in each rater carry it | one instrument; coarse |
| PronType=Dem to DEF·Figure (the sheet's row) | one of the two sheet rows that pass the falsification session's test; my PUD edit +0.0024, nothing detectable | one passes, one near zero |
The kernel's three kinds of basis do not include "measured across languages"; whether such a refinement is `declared` with the run in its `reason`, or a fourth basis, is the owner's call.

## D. Negation (Polarity): leave the cell, record the mode
- **Now:** Polarity to DEF·Ground, the declared home. **Sheet:** NUL·Ground. **Falsification run 1:** DEF·Figure.
- **Data (runs 5 and 6, same reused sentences):** the union of Polarity=Neg and PronType=Neg lifts DEF·Figure (+1.912 (1.766 to 2.124) consensus, 21 of 21 languages leaning positive in each rater) and NUL·Figure (+1.874, +1.108, +1.405) more than DEF·Ground (+1.116 (0.610 to 1.522) in claude only, 13 languages positive and 7 negative). The sheet's NUL·Ground cannot be tested (7, 27 and 44 labels). Among cells with enough labels the lifted ones are NUL and DEF cells at all three grains plus SEG·Pattern: the Differentiate mode, by the kernel's own definition.
- **Proposal:** do not move Polarity to DEF·Figure (the session's own run 5 says it is not supported as a single-cell move) and do not adopt NUL·Ground. Keep DEF·Ground (it is not contradicted on the any-token reading) and add a note that negation marks the Differentiate mode, with DEF·Figure and NUL·Figure the best measured grains. The kernel's rule already makes the mode Differentiate; what the data question is the grain.
- **Strength:** one instrument. My tests are silent apart from the rank result: negation is 28.2% adjunct against 28.4% for affirmation.

## E. Sheet proposals that were tested
| sheet row (kernel today) | tests | proposal | strength |
|---|---|---|---|
| Definiteness to DEF·Figure (SIG·Pattern) | Def +0.061 (−0.071 to 0.187) consensus, +0.031 claude, −0.053 gpt4 (observed 91, expected 87.2); Ind −0.118, −0.014, −0.107; my PUD edit +0.0020 on all channels, −0.0053 on features alone | do not adopt | two instruments, both near zero |
| Equative and predicative to DEF·Figure (CON·Ground) | copula marks DEF·Figure (R:cop in 22 of 24 languages, either rater); rank 4, p 0.002 as a near-hit; PUD +0.0011 | candidate to adopt | leaning, one instrument |
| Coordination of clauses to CON·Ground (SYN·Pattern) | labels yes: rank 1 of 27, lift +0.535, p 0.002; PUD −0.0048 | hold for held-out data | instruments disagree |
| Numeral and quantifier to SEG·Figure (DEF·Figure) | near-hit rank 4, p 0.002, but numerals mark INS·Figure (U:NUM z 8.9, 22 of 24 languages); PUD −0.0094 | hold | instruments disagree |
| Adjective to DEF·Figure (NUL·Pattern); gender and noun class to SEG·Pattern (NUL·Pattern) | PUD +0.0121 and +0.0075, the two largest single gains; no label-side test | hold; carry to held-out data | leads, one instrument |
| Clusivity, evidentiality, abessive, antipassive, iterative, habitual, collective, honorifics, distributivity | census: Clusivity 2 sentences, Evident 2, Abe 4, Antip 0, Iter 4, Hab 26 (3 consensus); PUD has none of 21 of the sheet's rarer values | leave as declared; mark `untestable`; need treebanks that mark them (the essay names Turkish, Quechua, Mandarin, Japanese) | untestable |

## F. Kept as is, with a weak note
- **Case=Loc to SIG·Ground (measured):** the best-supported placement of the whole table, and still one rater: claude +1.211 (0.466 to 1.914), rank 1 of 27, p 0.008; gpt4 +0.166, rank 9.
- **Aspect=Perf, INS·Pattern against INS·Figure (measured):** perfective lifts INS·Figure (+0.55, rank 2) and not INS·Pattern (−0.30, rank 15); z 9.8 but in 8 of 24 languages. A lead; change nothing yet.

## G. Not mine to change
- **Cell-level proposals** (merge DEF·Figure, EVA·Figure and REC·Figure; merge INS·Ground; merge CON·Ground toward CON·Pattern; 14 cells, 6 provisional) are the falsification session's, in its `RESULTS.md` 5.2. None of my tests touches them; runs 4 to 6 did not change them, and run 5 adds one pair, NUL·Figure and DEF·Figure, that negation cannot separate.
- **No rank rule.** Clause rank does not predict grain (kappa −0.0135), so nothing here derives Ground from subordination. The values that do track rank are the subordinating verb forms (Mood=Sub 92.4% adjunct, VerbForm=Conv 84.4%, Inf 61.8%, Mood=Cnd 58.7%), and the table puts three of those four in Pattern, which the label tests cannot reach.

## Decisions for the owner
1. Adopt the cross-language status field (section A)? It changes no cell.
2. Mark the section B entries? (Strongest: Mood=Imp, then Mood=Ind and Person=3.)
3. Add the two PronType refinements (section C), and as `declared` with a reason or as a new basis?
4. Leave Polarity at DEF·Ground with the mode note (section D)?
5. Which held-out tests to spend, if any: the sheet rows in section E marked hold, and whether to use the 8,009 fresh sentences (the Stanza models for the languages deleted in cleanup would need re-downloading; not confirmed).
