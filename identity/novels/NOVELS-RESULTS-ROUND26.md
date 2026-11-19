# Round 26: a fixed external giver for the sentence diagrammer

Preregistered (PREREG-ROUND26.md, 2026-11-18T15:35:03Z, addendum for the GUM source), frozen (FREEZE-ROUND26.md), one run per set and condition. Giver: the official CoNLL 2018 UD Shared Task script `conll18_ud_eval.py` 1.2 (vendored, hashes in `identity/givers/ud-eval/PROVENANCE.md`; gold-as-system control scores 100 on every row). The diagrammer is the English parser the read already runs (`parser-eng-ewt.json`). Outputs and scorer text: `identity/pronouns-multilingual/diagram/out/`.

## Primary: "diagram" (gold tokens given; our tagger, lemmatiser, parser, labeller)
| set | UPOS | UFeats | Lemmas | UAS | LAS | CLAS |
|---|---|---|---|---|---|---|
| EWT test (possibly sighted in training) | 93.80 | 90.15 | 95.98 | 80.54 | 76.60 | 71.29 |
| EWT dev (possibly sighted) | 93.80 | 89.51 | 96.37 | 79.96 | 75.84 | 70.86 |
| GUM dev (clean, different genre) | 94.14 | 85.86 | 96.45 | 77.14 | 72.74 | 66.73 |

## Secondary: "raw" (our own sentence split and tokenizer, no multiword marking)
| set | Tokens | Sentences | Words | UPOS | UAS | LAS |
|---|---|---|---|---|---|---|
| EWT test | 94.35 | 96.58 | 95.82 | 90.01 | 76.69 | 73.05 |
| EWT dev | 93.99 | 96.28 | 95.27 | 89.54 | 75.49 | 71.60 |
| GUM dev | 96.04 | 95.07 | 98.54 | 92.91 | 75.66 | 71.47 |

## Preposition attachment (diagnostic from the gold, diagram condition): "at the station on Tuesday"
Phrases whose noun carries a `case` ADP and is itself obl or nmod; is our head for the noun a verbal word or a nominal word, as in the gold.
| set | phrases | head class right | exact head right | gold verbal head | gold nominal head |
|---|---|---|---|---|---|
| EWT test | 1,684 | 0.791 | 0.712 | 0.763 | 0.828 |
| EWT dev | 1,723 | 0.803 | 0.710 | 0.783 | 0.826 |
| GUM dev | 2,208 | 0.790 | 0.682 | 0.742 | 0.846 |

## Reading
- The diagrammer's own claim was UPOS 95.4 on its own held-out tenth; the clean GUM dev number is 94.1, so the claim survives a change of genre, a little lower. LAS is 72.7 on GUM and 76.6 on EWT test. No threshold was set and none is applied.
- Prepositional phrases are the weak point the viewer showed: about one in five gets its head in the wrong class, and about three in ten get the exact head wrong. The error is symmetric enough (verbal heads 74-78% right, nominal 83-85%) that it is not one simple bias, such as always attaching low; it needs a real attachment decision.
- Tokenization and sentence splitting cost about 3 to 5 points of LAS (raw against diagram).
- Failures and deviations: the first scripted run died on the GUM set with a Node error whose text was not captured (not reproduced; both conditions rerun once by hand and succeeded; the EWT numbers are from the first run). `/tmp/gum-data` has been cleared since round 23, so the English coreference harnesses that read it cannot be rerun until it is rebuilt.
- Not claimed: the official EWT splits may have been in the parser's training data (13,024 sentences trained against EWT train's 12,544); only GUM dev is clean.
