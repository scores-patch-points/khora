# AMENDMENT 2 to NOVELS-PREREG.md (candidates and units follow the codec), 2026-11-17, before any question is read or matched

The books were read through the ONE reader (`readToWeft`, whole document, EOT sidecar with byte addresses; see PREREG-AMEND-1). Its output is not UD rows: it is WeftEntry@4 =
cast (beings with every mention span), edges (end1 · label · end2 with spans), clauses (subject / predicate{lemma} / object / complement, each with character spans and polarity) and sentences (text, offset).
The prereg's "noun chunk from rows" is therefore replaced, for ALL systems, by:
- CANDIDATE: a span that the reader itself delimited: a clause subject, a clause object, a cast mention span (the cast referent's longest surface replaces a short or pronominal mention), or an edge end (`end1Face`, `end2Face`) located in its sentence.
  Distinct spans only. A candidate whose text shares a content word with the question is excluded.
- T(question), with no part-of-speech tags in the codec: who/whom/whose -> candidates that are cast beings or whose surface starts with a capital letter and is not sentence-initial-only; where -> candidates directly preceded in the sentence by a
  preposition from the closed list {in, at, to, from, into, near, on, upon, through, towards, toward, across, over, under, behind, beyond, within, outside, inside, of}; how many/how much -> candidates containing a digit or a number word from
  the closed list {one..twenty, thirty, forty, fifty, hundred, thousand, million, dozen, half, both, several, many, few, some, no}; what/which -> any candidate.
- LEMMA LEXICON: the book's own: form -> lemma from the clauses' predicates (the reader's own lemmas, `predicate.text` -> `predicate.lemma`); other words are their lower-cased surface. No external lemmatiser.
- The QUESTION is read by the same reader (`readToWeft`, one call per question); its clause gives the wh-word's role (subject or object of the predicate; otherwise an oblique, the role "other").
Everything else in the prereg stands (filters Q1-Q5, B0-B2, F and ablations, controls, abstention, metrics, hypotheses, predictions, freeze rule). Stage A's oracle is now the best of THESE candidates.
Also disclosed: the development book e72d83e5, titled by NarrativeQA "The Autobiography of a Flea", resolves to a zoology text on fleas ("British Fleas" style). It is a development book; it is never scored.
