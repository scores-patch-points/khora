# CAST: the name/function-word twin — pre-registration, written before the verdict is implemented and before the fresh set is read

Date: 2026-10-27. Agent: cc-cast-initial. Follows `PREREG-CAST.md` / `PREREG-CAST-A1.md` (merged, khora#80). Spec: PIPELINE-LOG
`P-20261027T144520Z-identity-1` next 2 ("a name/function-word twin ... is decided by counts, so route it to undecided with the tied set named"), axioms
A3 (three-valued) and "a gap never becomes a hit: undecided and refused are never counted as met or missed".

## The defect

`form-usage.js` hands `surfaces.js` the treebank's `{ nominal, other }` for a lone capital, and the exact tail refuses the form when `other` exceeds what
`nominal` plus the text's capitals balance. For a form that is BOTH a name and a function word ("US"/"us", "May"/"may") the treebank's key is the
case-folded form, so its counts are dominated by the lower-case function word: "May" (53 name tags, 186 closed-class) is refused, "US" (162, 169) is
kept, and either way the form was DECIDED BY COUNTS that mostly describe the other reading.

## What the giver supports (read on the spent design slice A and on the prior; nothing on the fresh set)

- A loose twin (any PROPN tag and any closed-class tag) is 47 forms of the prior, mostly annotation noise ("a": 7 name tags among about 3,763 tokens; "you": 2 among 2,155; "i").
- Derived, no typed threshold: with the prior's own base rates, PROPN 0.0617 of tokens and closed-class 0.4198 (204,578 tokens), a form is a **twin** when its
  PROPN count AND its closed-class count each exceed those base rates by the exact one-sided binomial tail at alpha `CAP_SIG_ALPHA` 0.05 (the same alpha as
  the rule it amends; the null rate is the prior's own base rate instead of a fair coin). That is **two forms: "us" (162 of 331 name, 169 closed) and
  "may" (53 and 186 of 239)**. "Will" is NOT a twin by this giver (1 name tag in 835); "Rose", "Mark" have no closed-class tag. The example in the spec
  ("May", "Will") is half supported.
- Density in GUM train (191 documents of at least 20 sentences, counted from the corpus text, not from the fresh set): mid-sentence "US" 40 tokens in 21
  documents, "May" 22 tokens in 15; **all 62 are PROPN in the gold**. So in GUM every such twin is a name: the three-valued verdict cannot improve precision
  here, and it costs recall unless a later signal separates them. In 35 documents about 7 "US" and 4 "May" tokens are expected.

## The mechanism (one added branch, no word list)

`formUsageOf(posPrior)` also returns `twin` (derived above; the closed class is UD's own declared split, ADP AUX CCONJ DET NUM PART PRON SCONJ, a declared
reading like `NOMINAL`). In `surfaces.js`, for a single word with no lower-case occurrence in the text and a usage that is a twin, the verdict is **no longer
refused/kept by counts**:

- **separated**: the text shows the form heading a capitalised run of two or more tokens ("US Army", "May Day": a multi-word surface in `capCounts` whose
  first word it is): the text's own evidence separates the readings, the form stays a candidate (admitted as before the rule, a hit earned by the text).
- otherwise **undecided**, `tied: ["name", "function word"]`: not a candidate (it is not a being yet), and never counted as a hit or a miss. It is reported
  in the non-enumerable `entry.formUsageReport.undecided` with its counts, and stays in `entry.heard` as any non-candidate does.
Every other form is decided exactly as in khora#80. Absent `formUsage`, no pos prior, or not English: byte-identical.

Constants (declared, none derived by a plateau): `CAP_SIG_ALPHA` 0.05; the nominal class {NOUN, PROPN, ADJ}; the closed class above; the capitals at weight 1.

## Sets

| set | draw | role |
|---|---|---|
| A | seed 20261110, 30 documents | DESIGN (spent; read to find the twin set above) |
| E | khora#80's confirmation set | SPENT (scored once for the earlier rule); reported with no bar |
| F | the 35 of the 65 set-aside documents (seed 20261140) that E did not draw, in `slicesOf` order | CONFIRMATION: never read; scored once |
| B, C, D | the pronoun golden's slices | regression |

F's freshness is as asserted by the brief that named the 65 documents; this session did not verify that no other experiment read them.

## Arms (same lexicon, documents, dials)

`none` (rule off), `v1` (khora#80: the usage with no twin field), `v2` (this change, default), and the controls below.

## Bars (numbers decided now; each reported held / failed / untestable with its number)

On F:
- **T1 the tie is named and a gap is never a hit**: of the rule-off cast beings that are one word, have no lower-case occurrence and whose surface is a twin by the
  prior (the oracle, computed from the prior and the text, not from `v2`), 100% are in `v2`'s report as `undecided` with `tied` = both readings, or as
  `separated`; and no `undecided` surface is in `v2`'s cast. Untestable if there are fewer than 5 such twin candidates.
- **T3 the cost is bounded**: beings that leave the cast between `v1` and `v2` and have a gold mention are at most 0.5% of `v1`'s gold-overlapping cast beings
  (half of khora#80's own allowance for the whole rule).
- **T4 nothing else moves**: the cast of `v2` equals `v1`'s except for twins (every being added is a `separated` twin, every being removed is a twin).
- **T5 the separating signal earns its keep**: of the `separated` twins, at least 80% have a gold mention. Untestable if fewer than 5.
- **T6 byte-identical when the evidence is absent**: the 35 documents of F with the pos prior withheld, and a German passage, read to deep-equal entries
  (excluding `ms`) by the khora#81 commit (4ea6fa9, run in a second checkout) and by this branch.
- **T7 pronoun golden B+C+D unchanged or better**: shipped right >= 18 and wrong <= 44; shipped + np right >= 49 and wrong <= 29.

## Controls (built to fail)

- **K1** `v1` itself, the twin decided by counts: must FAIL T1 (no twin is reported undecided).
- **K2** `everything undecided`: the usage reports every form with a measured count as a twin; must FAIL T3.
- **K3** `shuffled giver`: the prior's per-form tag counts permuted across forms (mulberry32 seed 20261160), the twin derived from the permuted prior; must FAIL T1
  (the true twins go undetected). If K3 holds T1, T3 and T4 the bars cannot tell a giver from noise, and that is said.

Reported with no bar: every undecided and separated twin with its gold status (an undecided is neither met nor missed); the same on A and E (spent).

## What this can and cannot show

It can show whether the verdict is named, auditable and bounded in cost on documents no one designed on. It cannot show an accuracy gain: in GUM every such twin is a
name, so moving "US" from decided-kept to undecided can only lose recall, and the registration expects a cost (T3 may fail). It rests on about 11 tokens of two
forms in F, so T1, T3 and T5 are nearly unit tests with a real corpus; it says nothing about "Will", "Rose" or any form the prior does not mark as a twin; the
tied set names two readings, not the lower-case twin's sense; the separating signal (a capitalised run) is a judgement made here, not a giver's.
