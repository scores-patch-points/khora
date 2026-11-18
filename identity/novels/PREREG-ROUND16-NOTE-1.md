# PREREG-ROUND16 NOTE 1 — two more smells on the same library, registered before any result

The user's directions: (a) embed the sentence the pronoun is bound in and use it to identify what is most likely a proper noun; (b) the same embedding smells parts of speech.

## P: the part-of-speech / proper-noun smell
Frame = the sentence with the token (or mention head) marked, as in EC; centroids per UD upos (PROPN, NOUN, VERB, ADJ, PRON, ...) from GUM TRAIN gold (without U). A token's smell = the upos whose centroid is nearest by cosine. Scored against GUM gold upos on U's tokens and, for the cast, on the share of cast beings whose head is PROPN by gold. Question: does the context smell identify proper nouns better than the reader's own capitalisation/finder rule, and does it say so for a name never seen (not in the training vocabulary)? Hypotheses: P1 accuracy on U's mention heads for PROPN vs not above the finder's own PROPN rate (95% interval of the difference above zero); P2 the same on heads whose word is absent from the training words; P3 the fraction of the 15 vocabulary-unseen names correct reported without a bar.

## Q: the substitution smell for the pronoun's own slot
For a pronoun with candidate beings, the frame is the pronoun's sentence with the pronoun replaced by each candidate's string; the candidate whose substituted sentence has the highest person-smell score (the round-15 context centroid) is that slot's smell vote. It enters the chase-free default only as a voice reported beside S0: Q1 the vote agrees with the gold referent more often than the presence rung's top candidate when the two disagree (counts, no bar); Q2 the vote's precision on the pronouns where S0 and S6 are both unbound.
Nothing is tuned; failures reported. P and Q are run after F1-F6 (PREREG-ROUND16) and are exploratory outputs of the same frozen centroids, not new tuning.
