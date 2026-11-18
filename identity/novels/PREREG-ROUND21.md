# PREREG-ROUND21 — Greek: binding the dropped subject (the gold the harness never scored)

The user: "our Greek isn't very good." Found 2026-11-18: PROIEL's New Testament gold has 6,332 empty pronoun tokens (`empty-token-sort="P"`, the dropped pronoun), 6,091 of them with an antecedent-id, and eval-nt.mjs has always excluded empty tokens (`!t.empty`): nearly half of the gold pronouns of the four gospels are null subjects the reader never tried to bind. Greek, like Sanskrit, drops its subject pronoun; the verb's ending carries person and number.

## What is built (code frozen in FREEZE-ROUND21.md before any score)
- adapters/text/case-marked-clauses.js: each case-read clause carries the verb's character span (`predicate.at`).
- pronouns.js `nullSubjects` input: for each clause with no nominative whose verb is third person singular, one EVENT at the verb: the same presence decision as an overt pronoun (floor, margin, the non-personal ruling; no gender, a Greek verb does not mark it), recorded in `proDrop` (additive; `bindings` unchanged; the null subject does not feed the presence state).
- read-core `caseProDrop` ("off" | "on", default off).
## Gold and measure
Gold: PROIEL empty P tokens with relation `sub`, with an antecedent-id, whose head verb is finite, third person, singular (verb morphology positions 1-2); the entity = the union-find entity of the antecedent links; answerable when the entity has a proper-noun (`Ne`) token a cast span overlaps (as for overt pronouns). A prediction is RIGHT iff the bound being's cast spans overlap a token of the entity. Matched to a seam clause by the overlap of the clause verb's span with the gold head verb's span.
Arms (the shipped FULL register and fold, default dials, nothing tuned): OFF (today: overt only), ON (+ null-subject binding). Sets: JOHN (development; 402 overt answerable) and MATT, MARK, LUKE (sighted: scored for PREREG-GRC and PREREG-ROUND19; this is a NEW hypothesis, reported as such).
- H1: the null-subject bindings are right more often than the shuffled-referent null (referents permuted over the same bound events, 200 draws).
- H2: the share of gold third-person singular pronouns (overt + dropped, answerable) that are bound rises with ON; the overt bindings are byte-identical to OFF.
- H3: precision of the null-subject bindings alone and of overt + dropped together, reported against the overt-only 0.530 (test) / 0.741 (JOHN).
- H4 (the order test the user pointed at): the null subject is bound AFTER the overt pronouns of its sentence (causal order in the event loop); a variant that binds dropped subjects first is reported as a control.
Failures reported. Nothing tuned. If H1 fails, the machinery ships dark.
