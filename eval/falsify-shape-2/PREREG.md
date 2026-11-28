# PREREG 2: does parse-consistency make the fold abstain where it used to err? HELD-OUT.
Written before any arm is run on these items. The items and gold (72 sentences: 60 English, 12 French, the same nine categories plus more French) were written by a SEPARATE agent on a different model, told to read no file; the author of the fix has not read them (only validated their JSON shape by script). Code under test is frozen at khora 47253dd (branch weave-roles-polarity-question). Split: HELD-OUT for the consistency checks, which were built on the 48 seen sentences of eval/falsify-shape. Still exploratory in size, and both labellers are LLMs.

**Arms** (one run each):
- FOLD-V1: exactly the rule of PREREG 1 (no consistency). 
- FOLD-V2: the same, plus: if the sentence's `text-roles.sentences[s].unknown.polarity` is true -> negated = ABSTAIN; if `unknown.roles` is true -> agent = patient = ABSTAIN. form unchanged.
- POSITION: as PREREG 1.
- LLM: a fresh subagent on the smallest model, same prompt as PREREG 1, shown items.json only.

**Falsifiers for the fix**
- G1: FOLD-V2 is not wrong less often than FOLD-V1 -> the checks catch nothing new.
- G2: among V1's answers on negated, agent and patient, the share that is WRONG is not higher inside flagged sentences than outside -> the flag is noise, not a reliability signal.
- G3: FOLD-V2 is still wrong more often than the LLM -> "wrong less often than a model" stays false even with abstention.
- G4 (cost, reported not judged): how many of V1's CORRECT fields V2 abstains on.
Everything is reported, including a loss. Not measured: a corpus, a human labeller, other languages, the decide phase.
