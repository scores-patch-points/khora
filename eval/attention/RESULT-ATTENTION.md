# RESULT — PARA-GOLD v0 binding cases, scored once (2026-11-03), under PREREG-ATTENTION.md + A1

Code: this branch at the commit that adds this file. Dials as declared. Ruling: `text_evidence` (no Wiktionary pack on the machine; giver untested).
Match rule as pre-registered. Scored once; nothing was changed after seeing these numbers.

## Bars
| bar | result | number |
|---|---|---|
| P1 precision ≥ 0.80 (bound ≥ 5) | **held** | 11 / 12 right = 0.92 |
| P2 coverage ≥ 0.50 | **held** | 12 / 13 bound = 0.92 |
| P3 the trap b09 not bound to the Eiffel Tower | **FAILED** | b09 "It came to a head…" was bound to the Eiffel Tower (activation 10.1, margin 0.53); `center_elsewhere` did not fire |
| K1 shuffled-referent control fails P1 on every seed | **held** | right / bound over seeds 20261103–07: 0/8, 1/7, 0/7, 0/8, 0/8 (precision ≤ 0.14) |
| G1 no word list | held | `gates.mjs` |
| G2 he/she regression (+ A1 files, G3 not imported) | held | `gates.mjs`; one existing test needs the Wiktionary pack and fails the same at base |

## Per case (raw `gold.out`)
```
b01 attended  It         right        The Eiffel Tower             act=2.00 margin=0.50 attended
b02 attended  The tower  right        The Eiffel Tower             act=7.00 margin=1.00 surface-word
b03 attended  It         right        The Eiffel Tower             act=11.00 margin=0.71 attended
b04 attended  The tower  right        The Eiffel Tower             act=12.00 margin=1.00 surface-word
b05 attended  It         right        The Eiffel Tower             act=16.00 margin=0.81 attended
b06 attended  The tower  right        The Eiffel Tower             act=16.50 margin=0.78 surface-word
b07 attended  It         right        The Eiffel Tower             act=12.24 margin=0.74 attended
b08 out_of_scope He         out_of_scope                              act=- margin=- 
b09 elsewhere It         wrong        The Eiffel Tower             act=10.10 margin=0.53 attended
b10 attended  It         right        Concorde                     act=3.41 margin=0.28 attended
b11 attended  it         right        Concorde                     act=4.41 margin=0.49 attended
b12 attended  The airliner right        Concorde                     act=5.41 margin=1.00 predicate-kind
b13 attended  Its        right        Concorde                     act=6.07 margin=0.49 attended
b14 attended  it         gap          pronoun_no_margin            act=1.83 margin=0.08 
b15 attended  The river  wrong        Middle Tennessee             act=2.00 margin=1.00 surface-word
{"set":"gold","control":false,"dials":{"window":12,"minActivation":0.5,"minMargin":0.2,"boost":2,"feed":true,"centerVeto":true,"clauseMateVeto":false},"giver":null,"ruling":"text_evidence","attended":13,"bound":12,"right":11,"precision":0.9166666666666666,"coverage":0.9230769230769231,"traps":1,"trapsBoundWrong":1,"trapsGapped":0,"outOfScope":1}
```

## Failures, plainly
- **b09 (the pre-registered trap) bound wrong.** The previous sentence evidently did not begin with another cast candidate or with an unknown "The <word>" description, so the centering veto had nothing to catch; the attended tower led by a margin of 0.53. This is the failure mode the whole design worries about: an "It" that continues the previous sentence's content rather than the attended topic.
- **b15 "The river" bound to "Middle Tennessee" (wrong), not to the Cumberland River.** A single candidate in the pool held the word "river" with enough presence (margin 1.0 because it was alone), so the bind was confident and wrong. Not diagnosed further on the gold set, to avoid tuning on it. Both wrong bindings were confident (margin ≥ 0.53), not thin: a margin gate does not catch them.
- **b14 left a typed gap** (`pronoun_no_margin`, margin 0.08): the cast splits Concorde's neighbourhood and two candidates tied.
- b08 (a personal "He") is out of scope and was not attempted.
- On the development set the same dials left 3 of 5 traps wrongly bound (d05, d15, d24). Across 6 trap cases (5 dev + b09) the binder bound the wrong referent 4 times. **Trap handling is the weak part of this binder.**

## What this did not show
15 cases, one author's labels, no second reader; 11/12 has a 95% interval of roughly 0.65–0.99. All texts are single-topic Wikipedia leads, the easiest case for "attend to the topic". Expletive "it" is not detected. Never run under the lexicon giver's ruling. Not wired anywhere; no end-to-end effect on any downstream reading has been measured.
