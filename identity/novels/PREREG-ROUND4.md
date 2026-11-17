# PREREG round 4: a tracked graph (every clause argument attached to a referent), then the holograph query (2026-11-17, before any fresh book is read and before any fresh question is opened)
Builds on PREREG-ROUND3 + NOTE-1, the holograph reading of THE-HOLOGRAPH.md, and the user's framing (the holograph is the reader's graph of the text; surprise is change to the reader; coreference is tracking).
Dev finding on SEEN books (17 books, 195 questions; development only): with only exact mention spans, 7% of clause subjects and 2% of objects attach to a cast referent; 66% of subjects are pronouns/function words; the graph-act answer (H) answered 17 of 195 at F1 0.005.
## The tracker (tracker.mjs, frozen)
(1) a clause argument whose span overlaps a cast mention span is that referent; (2) a third-person singular pronoun bound by khora's presence rung (native/adapters/text/pronouns.js::resolvePronounsByPresence) with the dials declared and validated in eval/referents/PREREG-PRESENCE.md
(window 4, boost 2, feed 1, floor 2, margin 0.3, locality off; NOT retuned on these books) attaches its argument to the bound referent; (3) "I / me / my / myself" in a quotation, or in a play's speech paragraph, attaches to the speaker: the nearest cast mention after the closing quote else before the opening quote in the same paragraph without crossing a quote mark; a cast mention opening a paragraph and followed by "." ":" or a newline (optionally after a parenthesis) labels a play speech.
"you", "we", "it", "they", relatives and below-margin pronouns stay typed gaps. No gold exists for the speaker rung; its correctness is tested only through the answers it enables.
## Systems (fresh books)
E (round 3), H (holograph query on exact mention spans), H4 (the same query on the tracked graph: an attached clause counts as a mention of its referent in its sentence; acts about active referents come from attached clauses), baselines B0 B1 B2 (round 1 frozen answer.mjs), R (round 1 role-blind).
## Metrics
Attachment: share of clause subjects / objects attached (before: exact-span only; after: tracked). Retrieval: the answer's sentence inside the cut (H, H4) with the cut as a share of the book; top-5 / top-25 by ranked order. Answer: F1 / EM (unanswered = 0), answered count; book-cluster bootstrap 95% (10,000).
## Hypotheses (can fail)
T1: tracked attachment of subjects at least doubles (exact-span share to tracked share) on every fresh book. T2: H4's cut contains the answer sentence more often than H's (cluster interval of the difference excludes 0). T3: H4 answers more questions than H.
T4: H4's F1 exceeds B1's. T5: H4's F1 exceeds E's.
Predictions: T1 holds on most books (dev: 5-39%, plays variable); T2 holds weakly (dev 0.381 -> 0.449); T3 holds (dev 17 -> 44); T4 and T5 FAIL (the graph's acts stay too sparse; H4 F1 under 0.05).
## Not tested
Whether the speaker attribution is right (no gold); "you"/"we"/"it"/"they"; descriptions ("the girl"); salience. A negative result is reported at the same weight.
