# PREREG-ROUND19 — the Chomsky seam as the canonical clause source for Greek and Sanskrit; roles into the pronoun rung

Findings that motivate it (2026-11-18): the canonical read gave 0 clauses for grc and san; the pronoun rung's subject weight is "the first mention of the sentence" (an English word-order proxy); the Greek seam (adapters/text/greek-seam.js, formerly eval/lavar/greek.mjs; case-read subject / object / dative, null subjects from the verb) read 45 clauses per 1,000 characters in NATIVE-COMPETENCY.md (Zenodotus, 10 Oct) and was never connected.

## What is wired (code frozen in FREEZE-ROUND19.md before any score)
- adapters/text/case-marked-clauses.js: grc and san stems read their clauses through the seam with pos-<stem> and case-marking-<stem> priors; the read's `clauses` are these (source "case-marked") where the core found none.
- pronouns.js `roles` option: the clause's case-read SUBJECT weighs the boost dial instead of the sentence's first mention (a sentence with no subject span keeps the first-mention rule); `roles.coArgument` bars refs with a mention on a sibling argument of the pronoun's own clause (disjoint reference).
- read-core `caseRoles`: "off" | "subject" | "subject+coarg". English and every other stem: unchanged (verified: 60 GUM documents give identical bindings with the option absent).

## Measure (Greek, PROIEL gold, same scorer as PREREG-GRC / eval-nt.mjs, the shipped FULL arm: shipped register + shipped declension, default dials, nothing tuned)
Arms: FULL-off (today), FULL-subject, FULL-subject+coarg. Sets: JOHN (development) and MATT, MARK, LUKE (the test books, already scored once for the registered arms of PREREG-GRC: this is a NEW hypothesis on SIGHTED books, reported as such).
- G1: FULL-subject precision > FULL-off, pooled over the test books; per-book signs reported.
- G2: FULL-subject+coarg precision >= FULL-subject.
- G3: coverage (bound / answerable) of each arm reported; the shuffled-referent null stays below each arm.
- Rule for making a mode the canonical default for grc/san: the mode with the higher pooled test precision, only if it is also higher than FULL-off on JOHN. Otherwise the default stays "off" and the machinery ships dark. Coverage is reported, not gating.
- Sanskrit: no gold; the gold-free falsifier (a referent bound to both genders marks a wrong binding) and coverage on the four local texts (Gita, Brihadaranyaka, Chandogya, Aitareya), before and after; reported without a bar, because that falsifier cannot see a non-character being.
Failures reported. No dial tuned.
