Review-fix scripts (second session, 2026-10-06). Order to rebuild the review-fixed corpus state from the first-session state:
  1. gold_abc_lex.py            rebuild gold/abclex: classes by the first character of the core (z8 is a rest), a tie belongs to its note (cross-checked against music21's ABCTie), bar spans trimmed
  2. validate_structure.mjs     independent abcjs certification of rests, measure boundaries, onsets, ties, meter and key of the derived ABC gold -> derived/structure.json
  3. build_negatives.py         NATURAL R0 negatives: installed software read in place, split by package (sha256("repo:"+package) mod 3) -> manifest.negatives.json
  4. author_hard_negatives.py   AUTHORED stress fixtures (labelled authored; never in a prior) -> manifest.negatives_authored.json
  5. merge_manifest.py          manifest.json = manifest.pre-review-fix.json + the two negative manifests
  6. node eval/notation-competence/music_abc-build-priors.mjs   rebuild priors/notation-music_abc-standard.json (anchors) and -lexicon.json (natural TRAIN negatives only)
  7. node eval/notation-competence/music_abc.mjs --split dev    DEV only; TEST is run once, by the card (--split test --card)
