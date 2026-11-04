# Round-4 development result (tuned on; not evidence)

DEV-SET-4 sha256 61ff26d807feb17965899add2c240ddb62f83695a3bee25f628fa28e22c2d7e4: 127 cases = the 91 of DEV-SET-3 + the 36 SPENT PARA-GOLD-BIND v2 cases (73 attended, 53 traps, 1 out of scope). **The binder's round-4 options were chosen after reading v2's misses (the diagnosis note) and tuned on v2's rows.** Ruling: text_evidence.

## Ablation (the last block of rows is the final choice; earlier rows are the options tried)
```
round-3 declared (round-4 options off)         bound 45/73 right 40 prec 0.89 covRight 0.55 trapWrong 8/53 (0.15) silent 0
round-4 declared minus bearerShare             bound 45/73 right 40 prec 0.89 covRight 0.55 trapWrong 8/53 (0.15) silent 0
round-4 declared minus weakRouteCarry          bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared minus centerRivalShare        bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared minus openerReset             bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared, bearerShare 0.05             bound 45/73 right 40 prec 0.89 covRight 0.55 trapWrong 8/53 (0.15) silent 0
round-4 declared, bearerShare 0.1              bound 45/73 right 40 prec 0.89 covRight 0.55 trapWrong 8/53 (0.15) silent 0
round-4 declared, bearerShare 0.2              bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared, bearerShare 0.3              bound 42/73 right 39 prec 0.93 covRight 0.53 trapWrong 7/53 (0.13) silent 0
round-4 declared, bearerShare 0.5              bound 40/73 right 37 prec 0.93 covRight 0.51 trapWrong 7/53 (0.13) silent 0
round-4 declared, centerRivalShare 0.3         bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared, centerRivalShare 0.5         bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared, centerRivalShare 0.7         bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared, centerRivalShare 1           bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
round-4 declared                               bound 43/73 right 40 prec 0.93 covRight 0.55 trapWrong 7/53 (0.13) silent 0
```

## What the first design did (recorded because it was abandoned)
The first round-4 design (bearer test against the most PRESENT being, continuity for kind and context routes, a rival-share centre veto, a section-opener reset) was scored on this set before it was frozen: right-bound coverage fell from 0.55 to 0.47 for a trap gain of 8 to 6–7 of 53. It lost correct bindings (d08, d09, d16, v10, v14, v16) because the most present being is not always the topic (the cast splits the topic, and a recent aside outranks it), and because kind-route continuity is not what makes "The monument" wrong. The final bearer test compares the owner of the word with the DOCUMENT topic (the undecayed count).

## Final, per effect on this set
```
round 3 -> round 4 (only bearerShare 0.2 is on):
w13 The church   wrong (Eastern Orthodox Church) -> gap description_off_topic
t13 The first church   wrong -> gap description_off_topic
w19 The canal   wrong (Suez Canal Company) -> gap description_off_topic
n05 It   gap -> gap (reason changed)
precision 0.89 -> 0.93 · right-bound coverage 0.55 -> 0.55 (40 of 73) · trap wrong 8/53 -> 7/53 (0.13) · silent 0
```

## Shuffled control (5 seeds)
```
control seed=20261103  bound 47 right 0 precision 0.00 trapsBoundWrong 15
control seed=20261104  bound 44 right 5 precision 0.11 trapsBoundWrong 14
control seed=20261105  bound 51 right 0 precision 0.00 trapsBoundWrong 15
control seed=20261106  bound 49 right 0 precision 0.00 trapsBoundWrong 16
control seed=20261107  bound 45 right 0 precision 0.00 trapsBoundWrong 18
```

## Read plainly
- The one mechanism that helps is the **bearer test** (a description binds to the owner of its head word only if the owner carries at least 20% of the weight the document has given its topic). It turns three confident wrong bindings (two of them attended cases) into typed gaps. It adds no right binding: **coverage of right-bound attended cases does not rise (0.55 → 0.55)**. The round buys precision, not coverage.
- **Causes 3 and 4 of the diagnosis have mechanisms (`centerRivalShare`, `openerReset`) that show no effect on this set at any tested value, so they are declared OFF.** The rival-share veto cannot help the case it was built for (w06): the previous sentence there began with a description the cast does not know, a veto kind it leaves alone by design. The section-opener reset adds nothing once the bearer test is document-weighted.
- `weakRouteCarry` (continuity for kind and context routes) costs right bindings (40 → 37) for one trap: OFF.
- Still wrong on this set (10): t15 "The tomb" → Shah Jahan (a person the text-evidence ruling does not rule out; his weight clears 20%), t14 "The spacecraft" → Hubble (the owner IS the topic, so the test cannot see a description that introduces something new), the truncated names (Voyager ×2, WF), n11 Laboulaye (person), d24/n21 Soviet Union, n14 JNEMA, n01 "Its" → Black Hills.
- Cause 2 (a description that introduces something the cast does not hold) is only half addressed: when the owner is not the topic and light, it ends as a gap (t13); when the owner IS the topic (t14), nothing in the binder says "this is new". That needs a different kind of evidence than word ownership, which this round does not have.
- Rounds 1–3 reproduce byte for byte with the new options absent (checked on the round-3 dev rows and on the v2 rows).
