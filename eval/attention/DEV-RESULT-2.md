# Round-2 development result (tuned on; not evidence)

DEV-SET-2 sha256 3aa188c2fcac6b9cdefbbfbac766f33829e516d52abeba2e19e11aee4a5c0a22: 61 cases = 24 round-1 dev + 15 spent PARA-GOLD v0 + 22 new (37 attended, 23 traps: entity 13, event 2, competing 2, expletive 6; 1 out of scope). Ruling: text_evidence.

## Ablation: each round-2 option removed from the declared set, and the word-share threshold
```
round-1 dials (all round-2 options off)                    bound 30 right 27 prec 0.90 cov 0.81 trapWrong 16/23 (0.70)
declared minus minWordShare                                bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared minus carryVeto                                   bound 29 right 27 prec 0.93 cov 0.78 trapWrong 11/23 (0.48)
declared minus expletiveVeto                               bound 25 right 25 prec 1.00 cov 0.68 trapWrong 4/23 (0.17)
declared minus demonstrativeSubject                        bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared minus causalWords                                 bound 26 right 25 prec 0.96 cov 0.70 trapWrong 3/23 (0.13)
declared, minWordShare 0.05                                bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared, minWordShare 0.1                                 bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared, minWordShare 0.15                                bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared, minWordShare 0.25                                bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared, minWordShare 0.35                                bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared, minWordShare 0.5                                 bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
declared                                                   bound 25 right 25 prec 1.00 cov 0.68 trapWrong 3/23 (0.13)
```

## Declared, per case
```
d01 attended  The statue right        Liberty                      act=3.00 margin=1.00 surface-word
d02 attended  The statue right        Liberty                      act=1.99 margin=1.00 surface-word
d03 attended  The statue right        Liberty                      act=3.99 margin=1.00 surface-word
d04 attended  it         right        Liberty                      act=4.99 margin=0.30 attended
d05 entity    it         gap          center_not_carried           act=- margin=- 
n10 entity    It         gap          pronoun_no_margin            act=5.58 margin=0.10 
n11 entity    It         wrong        Laboulaye                    act=8.02 margin=0.46 attended
n12 entity    it         gap          center_not_carried           act=- margin=- 
d06 attended  it         right        Gateway Arch                 act=2.00 margin=0.50 attended
d07 attended  it         gap          pronoun_no_margin            act=3.00 margin=0.00 
d08 attended  The monument right        Gateway Arch                 act=2.12 margin=1.00 predicate-kind
d09 attended  It         right        Gateway Arch                 act=3.12 margin=0.30 attended
d10 entity    It         gap          pronoun_no_margin            act=4.02 margin=0.05 
d11 entity    It         gap          center_elsewhere             act=- margin=- 
n13 entity    It         gap          center_not_carried           act=- margin=- 
n14 entity    it         gap          pronoun_no_margin            act=2.38 margin=0.04 
d12 attended  Its        right        Hoover Dam                   act=3.00 margin=0.33 attended
d13 attended  The dam    right        Hoover Dam                   act=7.34 margin=1.00 surface-word
d14 attended  its        right        Hoover Dam                   act=4.00 margin=0.54 attended
d15 competing it         gap          center_not_carried           act=- margin=- 
d16 attended  The river  right        Colorado River               act=1.68 margin=1.00 surface-word
n19 expletive It         gap          center_not_carried           act=- margin=- 
d17 attended  It         right        The Mississippi River        act=2.00 margin=0.50 attended
d18 attended  it         right        The Mississippi River        act=3.00 margin=0.33 attended
d19 attended  The river  right        The Mississippi River        act=6.00 margin=0.85 surface-word
d20 attended  The river  right        The Mississippi River        act=6.53 margin=0.82 surface-word
d21 attended  it         gap          center_not_carried           act=- margin=- 
n17 expletive It         gap          expletive_or_cleft           act=- margin=- 
d22 attended  It         gap          pronoun_no_margin            act=1.68 margin=0.03 
d23 attended  The mission gap          description_unbound          act=- margin=- 
d24 entity    Its        wrong        Soviet Union                 act=5.71 margin=0.50 attended
n21 event     it         wrong        Soviet Union                 act=2.84 margin=0.26 attended
n22 entity    It         gap          pronoun_no_margin            act=6.18 margin=0.09 
b01 attended  It         right        The Eiffel Tower             act=2.00 margin=0.50 attended
b02 attended  The tower  right        The Eiffel Tower             act=7.00 margin=1.00 surface-word
b03 attended  It         right        The Eiffel Tower             act=11.00 margin=0.71 attended
b04 attended  The tower  right        The Eiffel Tower             act=12.00 margin=1.00 surface-word
b05 attended  It         right        The Eiffel Tower             act=16.00 margin=0.81 attended
b06 attended  The tower  right        The Eiffel Tower             act=16.50 margin=0.78 surface-word
b07 attended  It         gap          center_not_carried           act=- margin=- 
b08 out_of_scope He         out_of_scope                              act=- margin=- 
b09 event     It         gap          pronoun_no_margin            act=4.70 margin=0.13 
n06 attended  Its        right        The Eiffel Tower             act=13.00 margin=0.72 attended
n07 attended  It         gap          pronoun_no_margin            act=2.15 margin=0.07 
n08 entity    It         gap          center_not_carried           act=- margin=- 
n09 entity    It         gap          pronoun_no_margin            act=2.31 margin=0.13 
b10 attended  It         right        Concorde                     act=3.41 margin=0.28 attended
b11 attended  it         right        Concorde                     act=4.41 margin=0.49 attended
b12 attended  The airliner right        Concorde                     act=5.41 margin=1.00 predicate-kind
b13 attended  Its        gap          center_not_carried           act=- margin=- 
b14 attended  it         gap          pronoun_no_margin            act=1.83 margin=0.08 
n15 expletive It         gap          expletive_or_cleft           act=- margin=- 
n16 expletive It         gap          expletive_or_cleft           act=- margin=- 
b15 attended  The river  gap          description_unbound          act=- margin=- 
n01 attended  Its        gap          pronoun_no_margin            act=2.77 margin=0.19 
n02 attended  The sculpture gap          description_unbound          act=- margin=- 
n03 attended  it         gap          center_not_carried           act=- margin=- 
n04 competing It         gap          pronoun_no_margin            act=3.74 margin=0.02 
n05 entity    It         gap          center_not_carried           act=- margin=- 
n18 expletive It         gap          center_not_carried           act=- margin=- 
n20 expletive It         gap          center_not_carried           act=- margin=- 
{"set":"dev2","control":false,"dials":{"window":12,"minActivation":0.5,"minMargin":0.2,"boost":2,"feed":true,"centerVeto":true,"clauseMateVeto":false,"minWordShare":0.25,"carryVeto":true,"expletiveVeto":true,"demonstrativeSubject":true,"causalWords":true},"giver":null,"ruling":"text_evidence","attended":37,"bound":25,"right":25,"precision":1,"coverage":0.6756756756756757,"traps":23,"trapsBoundWrong":3,"trapsGapped":20,"outOfScope":1,"trapWrongRate":0.13043478260869565,"byTrapKind":{"entity":{"n":13,"wrong":2},"competing":{"n":2,"wrong":0},"expletive":{"n":6,"wrong":0},"event":{"n":2,"wrong":1}}}
```

## Shuffled-referent control (5 seeds)
```
control seed=20261103  bound 23 right 0 precision 0.00 trapsBoundWrong 2
control seed=20261104  bound 21 right 4 precision 0.19 trapsBoundWrong 2
control seed=20261105  bound 23 right 0 precision 0.00 trapsBoundWrong 0
control seed=20261106  bound 25 right 0 precision 0.00 trapsBoundWrong 0
control seed=20261107  bound 22 right 0 precision 0.00 trapsBoundWrong 0
```

## Read plainly
- Round-1 dials on this set: 27/30 right, **16 of 23 traps wrongly bound (0.70)**. Declared round-2 set: 25/25 right, coverage 0.68, **3 of 23 traps wrongly bound (0.13)**: d24 (Its → Soviet Union, the antecedent is Sputnik 1), n11 (It → Laboulaye, a person the text-evidence ruling does not catch; the antecedent is the island), n21 (it → Soviet Union, the antecedent is the broadcast moonwalk).
- Most of the trap gain is `carryVeto` (without it 11/23 wrong) and `expletiveVeto` (without it 4/23). `demonstrativeSubject` removes b09 only together with `carryVeto`: alone it changes nothing on this set.
- **`minWordShare` shows no effect on this set at any threshold (0.05–0.5).** What fixes b15 ("The river" → Middle Tennessee) is `causalWords`: the word "river" reached that being only through a naming in the tail of the target's own sentence ("the Tennessee River"), which the round-1 code counted. The share rule is kept because its unit test shows it does what it says, but this set does not show that it matters.
- The cost is coverage: 0.81 → 0.68. Legitimate "It"s after a sentence that did not name the being are now gaps (b07, b13, n03, d21).
- The set was tuned on and includes the spent gold cases and the round-1 dev cases; these numbers are optimistic.
