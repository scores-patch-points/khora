# RESULT-BIND-V6: the binder with trap evidence on the held-out exam v6, scored once by the parent, 2026-11-04

Exam: `PARA-GOLD-BIND-V6` frozen 2026-11-04T19:14:00Z (`PARA-GOLD-BIND-V6.sha256` hash 24a866af…). Code: khora `binder-traps` at `fa769a7` (git clone, tests 37 + 8 pass, gate pass), canon preflight CANON-OK (output hash 24616459…), priors the stand-in folder. Raw: `V6-C.json`, `V6-B.json`, `V6-C-CONTROL.txt`.

## Registered configuration C (traps on)
Bound 15, right 15 of 22 attended; 3 of 18 traps wrongly bound; silent 0.
- **P1** precision 15/15 = 1.00 (≥ 0.80, 15 bound ≥ 8): PASS
- **P2'** right-bound ÷ attended 15/22 = 0.68 (≥ 0.45): PASS
- **T1** trap wrong-bind rate 3/18 = 0.167 (≤ 0.20): PASS
- **S1** silent outcomes 0: PASS
- **K1** shuffled-referent control, five seeds: precision 0.00 on every seed (right 0 of 9 to 11 bound): PASS

All five bars hold as scored. By meaning (the same rows, cast names that are different things): no change; the 15 right bindings all name the topic (Eiffel Tower, Statue of Liberty, Hoover Dam, Tower Bridge, Concorde); the three wrong traps stay wrong.

| type | n | right | gap | wrong |
|---|---|---|---|---|
| attended pronoun | 9 | 7 | 2 | 0 |
| attended description | 13 | 8 | 5 | 0 |
| trap new thing | 8 | 0 | 6 | 2 (u06, u07) |
| trap definite-other | 6 | 1 (u18, right_other) | 4 | 1 (u16) |
| expletive | 4 | 0 | 4 | 0 |

## Reference configuration B (no trap evidence, not registered)
Bound 15, right 15 of 22; traps wrongly bound 4 of 18 = 0.222. B alone would have missed T1. The trap evidence changed one case on this exam: u08 ("It also reports that there were 700 men", the Carew biography) went from wrongly bound to the Mary Rose to a typed gap (`trap_expletive_or_cleft`). Attended outcomes are identical in B and C. So on this exam the trap rules are worth one case, and the as-scored pass of T1 depends on that one case: 3 of 18 is 0.167, 4 of 18 is 0.222.

## Failures, named
- u06 "It uses films, photos, and interactive displays" (the Tower Bridge attraction) bound to Tower Bridge: the thing introduced contains the topic's name, which the repaired cast holds as the topic.
- u07 "It would have higher thrust engines" (the Concorde "B" model) bound to Concorde: same pattern, a variant named by the topic's name.
- u16 "The aircraft had poor control at low speeds" (the Tupolev Tu-144) bound to Concorde: head noun shared with the topic.
- Missed attended (gaps): 7 of 22: w05, w06, w07 (statue pronoun and description, margin 0.09 to 0.14), w15, w20, w21, w22 (the Mary Rose "The ship" ×3 and "The structure"; descriptions unbound or below floor).
- u18's bound span is "Mary Rose Trust. ISBN" (a layer-3 span that swallowed a full stop and the next word): scored right_other, but the cast defect is visible.

## What this does not show
40 cases, six articles, one genre family. 3 of 18 trap errors has a 95% interval of about 0.04 to 0.39; a pass at 0.167 is not a measured rate under 0.20. P2' passes with room (0.68) on this set but dev v5 sat at 0.45. The trap rules gain one case here over the binder without them. The binder passed its pre-registered bars for the first time (six rounds), on an exam labelled by a labeller who had not seen the system. Not tested: other languages, quotations, speech, the binder without castIdentity.
