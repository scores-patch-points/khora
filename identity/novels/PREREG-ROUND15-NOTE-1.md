# PREREG-ROUND15 NOTE 1 — the ablation the user asked for, registered before any embedding was computed

The user's direction: ablate the embedding. Does the string smell like a person, and does its ROLE IN CONTEXT have the shape of an entity? Three arms, each its own pair of centroids (person / not-person) from the same GUM train mentions, same model, same prefix, same sign rule:
- ES  the mention string alone.
- ER  its role frame from the clause parse: "<subj|obj|mention> of <verb lemma>: <string>" (a subject or object of a verb as the read's own clauses show it, otherwise "mention: <string>").
- EC  the sentence it sits in with the mention marked: the sentence text with "[" and "]" around the mention.
- EA  the mean of the three scores.
A being's score per arm = the mean over ALL its mentions of (cos person - cos not-person); non-personal iff < 0. Training uses every non-pronoun gold mention (equal weight per distinct frame and type).
The round-15 hypotheses H1-H6 apply to each arm; the ablation hypotheses are:
- A1: ER or EC adds precision over ES on U (95% interval of the precision difference above zero for at least one).
- A2: on the beings the word table has not seen (no word in the table), the share ruled correctly (against the gold entity type) is higher for the best context arm than for ES.
Gold is used only to score. Order of events: this note stamped, code written, FREEZE-ROUND15.md, then one run on U.
