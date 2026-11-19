# PREREG-ROUND30 — referents first, part 1: speakers and addressees (I / you)

THE REFERENT RULE (CLAUDE.md, saved 2026-11-19): a mention resolves to a referent the read admitted, never a string; the read only admits names. On English-LitBank dev, the official scorer counts 2,353 mentions in chains: names 15%, third-person pronouns 42%, I/you/we 22.5%, common noun phrases 19%. This round admits the speaker and addressee referents, the 22.5%. Noun-phrase referents are a separate later round (the attention-binder session's five held-out rounds, `eval/attention/`, say the weak part is traps and that a cast that cannot say "this sentence introduces something new" is the limit; it advised reusing typed gaps, earlier-sentences-only, longest naming wins, the document-weight test, and not tuning on spent sets).

## What is built: `native/adapters/text/speakers.js`
Quotations are paired straight or curly double quotes (a quotation over 1,200 characters is a typed gap, unbalanced). The speaker of a quotation is the cast being named in the tag after the closing quote (up to the next quote or sentence-final punctuation), else the tag before the opening quote; no name: an anonymous referent of that quotation. A first-person pronoun (I, me, my, mine, myself, I'm/I'll/I've/I'd) inside a quotation belongs to the speaker's referent. A second-person pronoun (you, your, yours, yourself, thou, thee, thy) inside a quotation belongs to the speaker referent of the immediately preceding quotation when that is a different speaker and at most one sentence-final punctuation separates them (a two-party exchange); otherwise a typed gap (addressee unknown). Outside quotations, a first person that recurs (2 or more) is the narrator referent of the text. No word list of names; the structure is quotes, punctuation and the cast's own spans. The pronoun lists above are closed-class grammar, declared. A we/us/our, it and they are not handled here.

## Measure: the fixed giver, unchanged
The official CorefUD scorer (4fd7b0e, head match, singletons ignored; singletons included as the second view), the same writer as round 24 (`predict-corefud.mjs`), with one environment switch: SPEAKERS=1 adds the speaker, addressee and narrator mentions to their referents' clusters (a named speaker's mentions join that being's cluster, so they merge with its names and its he/she); SPEAKERS=null is the control for the added links: the same added mentions, each assigned a random speaker referent of the same document (seeded).
- Development (debug only, by eye): the first 10 documents of LitBank train.
- Evaluated once each: English-LitBank dev (10 docs) and English-GUM dev (30 docs). The round 24 numbers are the control (36.80 and 19.62); the run reproduces them with SPEAKERS unset before anything else is read.

## Claims, decided before running
- R1: on LitBank dev, CoNLL F1 with SPEAKERS=1 is above the control (36.80). Not claimed for GUM (few quotations: 121 straight quotation marks in 30 documents), reported.
- R2: on LitBank dev, SPEAKERS=1 beats SPEAKERS=null on CoNLL F1 and on MUC precision. If the null matches, the added links are chance-level and the speaker referents carry nothing.
- R3 (reported): the number of speaker, addressee and narrator mentions added, and the typed gaps (anonymous speakers, unknown addressees, unbalanced quotations), against the 530 I/you/we gold mentions of LitBank dev.
- R4 (reported): MUC precision with and without, so a recall gain bought with wrong links is visible.

## What it does not show
Third-person pronouns it/they, we/us, noun-phrase referents, and any cross-quotation identity beyond the two-party alternation are not handled. The addressee rule is a convention for two-party dialogue and is expected to fail in group scenes. No claim about the other languages.
