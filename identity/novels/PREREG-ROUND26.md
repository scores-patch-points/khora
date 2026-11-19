# PREREG-ROUND26 — a fixed external giver for the sentence diagrammer

The diagrammer is the English dependency parser the read already runs (`english-parser.js`, prior `parser-eng-ewt.json`: tagger, transition parser, labeller, lexicon), whose output Scholia shows. It has been judged only by its own held-out split (every tenth training sentence) and by nested-clause F1 0.54. This round puts it under a fixed external standard.

## Giver
- Scorer: the official CoNLL 2018 UD Shared Task script, `conll18_ud_eval.py` 1.2, vendored with provenance and hashes at `identity/givers/ud-eval/`. Reports Tokens, Sentences, Words, UPOS, XPOS, UFeats, AllTags, Lemmas, UAS, LAS, CLAS, MLAS, BLEX.
- Data: UD_English-EWT test and dev (hashes in PROVENANCE.md); UD_English-GUM dev (`/tmp/gum-data/en_gum-ud-dev.conllu`, the GUM release already on disk).
- Control: gold as system scores 100 on every row (done on EWT test before this prereg).

## Two conditions, one run each, decided now
- PRIMARY, "diagram": gold tokenization and gold multiword tokens given; our parser tags, lemmatises, attaches and labels. Primary metrics: LAS and UAS F1, UPOS. This is the diagrammer's own job.
- SECONDARY, "raw": raw text in (all sentences of the file joined), our own sentence split and tokenizer, no multiword-token marking; the scorer aligns by characters. All rows reported (Tokens, Sentences, Words show how much tokenization costs).

## What is not claimed
- The prior was trained on "UD_English-EWT+gold-round1+round2" (13,024 sentences; EWT train alone is 12,544) with every tenth sentence held out; the official test and dev files were not on disk then. I cannot verify that the official EWT test sentences are absent from training, so EWT numbers are reported as possibly sighted. GUM dev is a different genre and was never in training: it is the clean number, and it is what is compared against the prior's own held-out claim (UPOS 95.42 on its own split).
- No threshold is set: this round reports the numbers. The user's 94 bar is declared for competency in coreference; it has not been restated for parsing, and I do not apply it here.
- A diagnostic from the gold, not the scorer: preposition attachment (for every gold `case` ADP whose noun is an obl or nmod, whether our head for that noun is a verb or a noun, vs gold), reported with the count. This is the "at the station on Tuesday" case.

## Failure handling
Every number is recorded whatever it is. If the raw condition crashes the scorer, the crash and the fix are logged and the run repeated once.

## ADDENDUM (before any parser output was scored)
`/tmp/gum-data` no longer exists (the temp directory was cleared), so the GUM UD file named above is gone. GUM dev is taken instead from the CorefUD 1.3 public edition already on disk: `/Users/mlacy/Documents/khora-cast/khora/identity/pronouns-multilingual/data/fra/corefud/CorefUD-1.3-public/data/CorefUD_English-GUM/en_gum-corefud-dev.conllu` (sha256 22f3bc73da9516d20134cb156cde3eb3b6e765d3de0e12c59fda3a2ec3f93244), whose UD columns (UPOS, features, heads, relations) are GUM's own. Same role: the clean, different-genre set. Consequence: the round 23 English harnesses that read `/tmp/gum-data` cannot be rerun until that data is rebuilt.
