# Round-5 development result (tuned on; not evidence)

DEV-SET-5 sha256 c1201755243eb1674da1573184166f8a77b2479e3180706cd1dd1295de752e33: 167 cases = the 127 of DEV-SET-4 + the 40 SPENT PARA-GOLD-BIND v3 cases (95 attended, 71 traps, 1 out of scope). **The capitalised-target rule was designed from v3's four silent cases and tuned on them.** Ruling: text_evidence.

## Round 4 -> round 5 (only capitalTargets differs)
```
round-4 declared (round-5 option off)          bound 57/95 right 54 prec 0.95 covRight 0.57 trapWrong 8/71 (0.11) silent 4
round-5 declared                               bound 58/95 right 55 prec 0.95 covRight 0.58 trapWrong 8/71 (0.11) silent 0
```

## The four v3 silent cases, now
```
x21 The ISS                  gap      capitalised_name_open_word 
x22 The ISS                  right    The ISS (via cast-name)
y17 The LHC Computing Grid   gap      capitalised_name_open_word 
y18 The Mayflower crew       gap      capitalised_name_open_word 
```

## Final (declared) summary
```
attended 95
bound 58
right 55
rightViaAlias 4
precision 0.9482758620689655
precisionByMeaningProxy 0.8793103448275862
coverageRight 0.5789473684210527
coverageRightByMeaningProxy 0.5368421052631579
traps 71
trapsBoundWrong 8
trapWrongRate 0.11267605633802817
silent 0
```

## Shuffled control (5 seeds)
```
control seed=20261103  bound 61 right 1 precision 0.02 trapsBoundWrong 16
control seed=20261104  bound 56 right 6 precision 0.11 trapsBoundWrong 16
control seed=20261105  bound 63 right 0 precision 0.00 trapsBoundWrong 16
control seed=20261106  bound 61 right 0 precision 0.00 trapsBoundWrong 18
control seed=20261107  bound 55 right 0 precision 0.00 trapsBoundWrong 22
```

## Read plainly
- Silent outcomes go from 4 to 0 on this set, which contains v3's four capitalised cases. No other case changed except x22, which now binds ("The ISS" read as the cast being named there, right), and x21, which is a typed gap because a lower-case word follows the name (`capitalised_name_open_word`). y17 and y18 are typed gaps for the same reason: a name followed by an open-class word is a part of the being or a verb, and the binder cannot tell which without a word list.
- **A first implementation required the mention to START at the capitalised word, and left x21 and x22 as `capitalised_unknown_name` gaps. The cast names "The ISS" as a being whose mention begins at the article. The rule was changed to use the longest mention that COVERS the capitalised word.** That change was made on v3's cases, so v3 is tuned on, as stated in the pre-registration.
- Nothing else moved: precision 0.95 and right-bound coverage 0.57–0.58 are the round-4 figures to within one case; trap wrong 8/71 (0.11). The round-5 change adds closure (S1), not accuracy.
- **By meaning (proxy).** 4 right bindings are right only through an alias the cast merged into the bound being: x02 (LHC Computing Grid, alias "LHC"), and x03, x13, x14 (the Rosetta Stone article's topic is bound to the being "Ezana Stone", whose surfaces include "Rosetta Stone" and "Ezana"). Counting only bindings whose PRIMARY surface matches the case, precision is 0.88 (was 0.95) and right-bound coverage 0.54 (was 0.58). The parent session will recount by meaning from the raw rows, which keep each bound being's full surface list.
- Rounds 1–4 reproduce byte for byte with the new option absent (checked on the round-4 dev rows and on v3's rows).
- Still wrong on this set (11): n11 (Laboulaye, a person), n14 (JNEMA), d24 and n21 (Soviet Union), n01 (Black Hills), t02 (WF, truncated), t14 (The spacecraft → Hubble: the owner is the topic), w07 and w14 (Voyager, truncated), t15 (The tomb → Shah Jahan, a person), y08 (an "It" for a new thing → Stonehenge).
