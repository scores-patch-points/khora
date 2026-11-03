# Development-set result (tuned on; not evidence)

Ruling: text_evidence (no Wiktionary pack on this machine). DEV sha256 ed01e0d3c9356f89d729722b5a830b5e4bae3ae58442545d6b7ab8ec5f8904c7.

## Sweep (window x margin x boost, floor 0.5, feed, centerVeto, clauseMateVeto as declared per row; last four rows vary the vetoes)
```
window=6 margin=0.1 boost=1  bound 8 right 4 precision 0.50 coverage 0.42 trapsBoundWrong 3
window=6 margin=0.1 boost=2  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
window=6 margin=0.1 boost=3  bound 15 right 13 precision 0.87 coverage 0.79 trapsBoundWrong 3
window=6 margin=0.2 boost=1  bound 7 right 4 precision 0.57 coverage 0.37 trapsBoundWrong 2
window=6 margin=0.2 boost=2  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 2
window=6 margin=0.2 boost=3  bound 15 right 13 precision 0.87 coverage 0.79 trapsBoundWrong 2
window=6 margin=0.3 boost=1  bound 6 right 4 precision 0.67 coverage 0.32 trapsBoundWrong 2
window=6 margin=0.3 boost=2  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 2
window=6 margin=0.3 boost=3  bound 12 right 10 precision 0.83 coverage 0.63 trapsBoundWrong 2
window=12 margin=0.1 boost=1  bound 12 right 9 precision 0.75 coverage 0.63 trapsBoundWrong 3
window=12 margin=0.1 boost=2  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
window=12 margin=0.1 boost=3  bound 17 right 15 precision 0.88 coverage 0.89 trapsBoundWrong 3
window=12 margin=0.2 boost=1  bound 10 right 8 precision 0.80 coverage 0.53 trapsBoundWrong 2
window=12 margin=0.2 boost=2  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
window=12 margin=0.2 boost=3  bound 16 right 14 precision 0.88 coverage 0.84 trapsBoundWrong 3
window=12 margin=0.3 boost=1  bound 9 right 8 precision 0.89 coverage 0.47 trapsBoundWrong 2
window=12 margin=0.3 boost=2  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 3
window=12 margin=0.3 boost=3  bound 11 right 10 precision 0.91 coverage 0.58 trapsBoundWrong 2
window=24 margin=0.1 boost=1  bound 10 right 8 precision 0.80 coverage 0.53 trapsBoundWrong 3
window=24 margin=0.1 boost=2  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
window=24 margin=0.1 boost=3  bound 17 right 15 precision 0.88 coverage 0.89 trapsBoundWrong 3
window=24 margin=0.2 boost=1  bound 10 right 8 precision 0.80 coverage 0.53 trapsBoundWrong 3
window=24 margin=0.2 boost=2  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
window=24 margin=0.2 boost=3  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 3
window=24 margin=0.3 boost=1  bound 9 right 8 precision 0.89 coverage 0.47 trapsBoundWrong 3
window=24 margin=0.3 boost=2  bound 14 right 13 precision 0.93 coverage 0.74 trapsBoundWrong 3
window=24 margin=0.3 boost=3  bound 11 right 10 precision 0.91 coverage 0.58 trapsBoundWrong 2
centerVeto=true clauseMateVeto=true  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 3
centerVeto=true clauseMateVeto=false  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 3
centerVeto=false clauseMateVeto=true  bound 15 right 14 precision 0.93 coverage 0.79 trapsBoundWrong 4
centerVeto=false clauseMateVeto=false  bound 16 right 15 precision 0.94 coverage 0.84 trapsBoundWrong 4
```

## Declared dials, per case
```
```

## Shuffled-referent control (5 seeds)
```
control seed=20261103  bound 17 right 0 precision 0.00 trapsBoundWrong 2
control seed=20261104  bound 14 right 3 precision 0.21 trapsBoundWrong 2
control seed=20261105  bound 17 right 0 precision 0.00 trapsBoundWrong 2
control seed=20261106  bound 17 right 0 precision 0.00 trapsBoundWrong 2
control seed=20261107  bound 16 right 0 precision 0.00 trapsBoundWrong 2
```

Failures on dev, plainly: d05 (it → Laboulaye, a person the text-evidence ruling does not catch), d15 (it → Hoover Dam; the antecedent is Edison), d24 (Its → Soviet Union; the antecedent is Sputnik 1, an object in the previous sentence), d21 (it → the state Mississippi, not the river), and gaps on d07, d22 (thin margin) and d23 ("The mission": no predicate kind for Apollo 11 in the cast).
