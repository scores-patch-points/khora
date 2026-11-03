# Round-3 development result (tuned on; not evidence)

DEV-SET-3 sha256 365acadc6fa313df9fa82bff6e521f7870d17dcbfa4815e24c04c650e7a82b90: 91 cases = the 61 of DEV-SET-2 + the 30 SPENT PARA-GOLD-BIND v1 cases (53 attended, 37 traps). Ruling: text_evidence.

## Ablation
```
round-2 declared (round-3 options off)       bound 30/53 right 30 prec 1.00 cov 0.57 trapWrong 4/37 (0.11) silent 1
round-3 declared minus lineStarts            bound 34/53 right 32 prec 0.94 cov 0.64 trapWrong 5/37 (0.14) silent 1
round-3 declared minus npHead                bound 32/53 right 31 prec 0.97 cov 0.60 trapWrong 5/37 (0.14) silent 0
round-3 declared minus tieResolve            bound 31/53 right 31 prec 1.00 cov 0.58 trapWrong 3/37 (0.08) silent 0
round-3 declared minus foldPlural            bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
round-3 declared minus neverSilent           bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
round-3 declared minus contextMinUses        bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
round-3 declared, contextMinUses 1           bound 34/53 right 29 prec 0.85 cov 0.64 trapWrong 7/37 (0.19) silent 0
round-3 declared, contextMinUses 2           bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
round-3 declared, contextMinUses 3           bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
round-3 declared                             bound 33/53 right 32 prec 0.97 cov 0.62 trapWrong 4/37 (0.11) silent 0
```

## Declared, per case
```
d01 attended  The statue right        Liberty                      act=4.00 margin=1.00 surface-word
d02 attended  The statue right        Liberty                      act=2.49 margin=1.00 surface-word
d03 attended  The statue right        Liberty                      act=4.49 margin=1.00 surface-word
d04 attended  it         right        Liberty                      act=5.49 margin=0.37 attended
d05 entity    it         gap          center_not_carried           act=- margin=- 
n10 entity    It         gap          pronoun_no_margin            act=5.58 margin=0.10 
n11 entity    It         wrong        Laboulaye                    act=8.02 margin=0.46 attended
n12 entity    it         gap          center_not_carried           act=- margin=- 
d06 attended  it         right        Gateway Arch                 act=2.00 margin=0.50 attended
d07 attended  it         gap          pronoun_no_margin            act=3.00 margin=0.00 
d08 attended  The monument right        Gateway Arch                 act=2.12 margin=1.00 predicate-kind
d09 attended  It         right        Gateway Arch                 act=3.12 margin=0.30 attended
d10 entity    It         gap          center_elsewhere             act=- margin=- 
d11 entity    It         gap          center_elsewhere             act=- margin=- 
n13 entity    It         gap          center_not_carried           act=- margin=- 
n14 entity    it         wrong        JNEMA                        act=2.27 margin=0.05 attended-tie
d12 attended  Its        right        Hoover Dam                   act=3.00 margin=0.33 attended
d13 attended  The dam    right        Hoover Dam                   act=7.34 margin=1.00 surface-word
d14 attended  its        right        Hoover Dam                   act=4.00 margin=0.54 attended
d15 competing it         gap          center_not_carried           act=- margin=- 
d16 attended  The river  right        Colorado River               act=1.68 margin=1.00 surface-word
n19 expletive It         gap          center_not_carried           act=- margin=- 
d17 attended  It         right        The Mississippi River        act=2.00 margin=0.50 attended
d18 attended  it         right        The Mississippi River        act=3.00 margin=0.33 attended
d19 attended  The river  right        The Mississippi River        act=6.00 margin=0.85 surface-word
d20 attended  The river  right        The Mississippi River        act=7.94 margin=0.85 surface-word
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
b07 attended  It         gap          center_elsewhere             act=- margin=- 
b08 out_of_scope He         out_of_scope                              act=- margin=- 
b09 event     It         gap          center_elsewhere             act=- margin=- 
n06 attended  Its        right        The Eiffel Tower             act=13.00 margin=0.72 attended
n07 attended  It         gap          center_elsewhere             act=- margin=- 
n08 entity    It         gap          center_not_carried           act=- margin=- 
n09 entity    It         gap          center_not_carried           act=- margin=- 
b10 attended  It         right        Concorde                     act=3.41 margin=0.28 attended
b11 attended  it         right        Concorde                     act=4.41 margin=0.49 attended
b12 attended  The airliner right        Concorde                     act=5.41 margin=1.00 predicate-kind
b13 attended  Its        gap          center_not_carried           act=- margin=- 
b14 attended  it         gap          pronoun_no_margin            act=1.83 margin=0.08 
n15 expletive It         gap          expletive_or_cleft           act=- margin=- 
n16 expletive It         gap          expletive_or_cleft           act=- margin=- 
b15 attended  The river  gap          description_unbound          act=- margin=- 
n01 attended  Its        wrong        Black Hills                  act=2.77 margin=0.19 attended-tie
n02 attended  The sculpture gap          description_unbound          act=- margin=- 
n03 attended  it         gap          pronoun_no_margin            act=3.13 margin=0.18 
n04 competing It         gap          center_not_carried           act=- margin=- 
n05 entity    It         gap          pronoun_no_margin            act=4.43 margin=0.07 
n18 expletive It         gap          center_not_carried           act=- margin=- 
n20 expletive It         gap          center_not_carried           act=- margin=- 
v01 attended  It         gap          pronoun_no_margin            act=2.00 margin=0.00 
v02 attended  Its        gap          center_elsewhere             act=- margin=- 
v11 attended  The span   gap          description_unbound          act=- margin=- 
v17 new-entity It         gap          center_not_carried           act=- margin=- 
v27 definite-other The path   gap          description_unbound          act=- margin=- 
v03 attended  It         right        Colosseum                    act=2.00 margin=0.50 attended
v04 attended  It         right        Colosseum                    act=8.14 margin=0.76 attended
v13 attended  The building gap          description_unbound          act=- margin=- 
v21 new-entity It         gap          center_not_carried           act=- margin=- 
v23 expletive It         gap          center_not_carried           act=- margin=- 
v05 attended  It         gap          center_elsewhere             act=- margin=- 
v10 attended  The bridge right        The Golden Gate Bridge       act=1.29 margin=1.00 surface-word
v16 attended  The bridge right        The Golden Gate Bridge       act=1.81 margin=0.82 surface-word
v30 definite-other The bonds  gap          description_unbound          act=- margin=- 
v06 attended  It         right        The Panama Canal             act=2.00 margin=0.00 attended-tie
v07 attended  It         gap          center_not_carried           act=- margin=- 
v09 attended  The canal  right        The Panama Canal             act=2.62 margin=1.00 surface-word
v14 attended  The expanded waterway right        The Panama Canal             act=2.12 margin=1.00 predicate-kind
v18 new-entity It         gap          center_not_carried           act=- margin=- 
v20 new-entity It         right_other  Gatun Lake                   act=3.02 margin=0.14 attended-tie
v26 expletive It         gap          expletive_or_cleft           act=- margin=- 
v28 definite-other The original locks gap          description_unbound          act=- margin=- 
v29 definite-other The railroad gap          description_unbound          act=- margin=- 
v08 attended  It         gap          pronoun_no_margin            act=2.57 margin=0.06 
v12 attended  The building gap          description_unbound          act=- margin=- 
v15 attended  The facility gap          description_unbound          act=- margin=- 
v19 new-entity It         gap          pronoun_no_margin            act=2.32 margin=0.16 
v22 new-entity It         gap          center_elsewhere             act=- margin=- 
v24 expletive It         gap          expletive_or_cleft           act=- margin=- 
v25 expletive It         gap          expletive_or_cleft           act=- margin=- 
{"set":"dev2","control":false,"dials":{"window":12,"minActivation":0.5,"minMargin":0.2,"boost":2,"feed":true,"centerVeto":true,"clauseMateVeto":false,"minWordShare":0.25,"carryVeto":true,"expletiveVeto":true,"demonstrativeSubject":true,"causalWords":true,"lineStarts":true,"npHead":true,"tieResolve":true,"foldPlural":true,"neverSilent":true,"contextMinUses":2},"giver":null,"ruling":"text_evidence","attended":53,"bound":33,"right":32,"precision":0.9696969696969697,"coverage":0.6226415094339622,"traps":37,"trapsBoundWrong":4,"trapsGapped":32,"silent":0,"outOfScope":1,"trapWrongRate":0.10810810810810811,"byTrapKind":{"entity":{"n":13,"wrong":3},"competing":{"n":2,"wrong":0},"expletive":{"n":10,"wrong":0},"event":{"n":2,"wrong":1},"new-entity":{"n":6,"wrong":0},"definite-other":{"n":4,"wrong":0}}}
```

## Shuffled-referent control
```
control seed=20261103  bound 36 right 0 precision 0.00 trapsBoundWrong 10
control seed=20261104  bound 32 right 4 precision 0.13 trapsBoundWrong 9
control seed=20261105  bound 38 right 0 precision 0.00 trapsBoundWrong 9
control seed=20261106  bound 37 right 0 precision 0.00 trapsBoundWrong 9
control seed=20261107  bound 33 right 0 precision 0.00 trapsBoundWrong 11
```

## Read plainly
- Round-2 options only (round-3 off) on this set: coverage 0.57, trap wrong 4/37, 1 silent. Round-3 declared: coverage **0.62** (33/53), precision 32/33, trap wrong **4/37 = 0.11**, **0 silent**. The gain is modest (+0.05 on 53 cases), and the set was tuned on and includes the spent v1 cases, so it is optimistic.
- Most of the coverage comes from `lineStarts`, `npHead` and the context words; `foldPlural` and `neverSilent` each add one case. `tieResolve` adds 2 bound for 1 more wrong trap (3 → 4 of 37): kept because coverage was the failure, said here.
- `contextMinUses 1` is unsafe (precision 0.85, trap wrong 0.19); 2 and 3 are identical here; 2 declared.
- Synonym head nouns with no earned evidence (v11 "The span", v13 "The building", v15 "The facility") remain typed gaps. The only discriminator between the attended "The facility" and the trap "The path" would be a typed list of what a structure is called, which is refused. So this is the round's honest ceiling for such cases.
- Pronouns after a sentence the binder could not bind (v02, v07) still gap through the carry check: one gap causes the next.
- Round 1 (gold) and round 2 (fresh) outputs are reproduced exactly with the new options absent (checked).
