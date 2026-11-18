# Round 19: the Chomsky seam is the canonical clause source for Greek and Sanskrit; roles into the pronoun rung

Preregistered (PREREG-ROUND19.md, 2026-11-18T03:17:49Z), code frozen (FREEZE-ROUND19.md, 03:17:56Z) before any score of the new arms.

## What is now canonical
- `readToWeft` reads Greek and Sanskrit clauses through the case-marked seam (adapters/text/case-marked-clauses.js over adapters/text/greek-seam.js, moved from eval/lavar/greek.mjs, which re-exports it): the nominative is the subject, the accusative the object, a finite verb with no nominative is a recorded null subject. Sample text: 0 clauses before, 64 (grc) and 48 (san, 40 with a null subject) after. English and every other stem are unchanged (60 GUM documents give identical pronoun bindings with the new option absent; read-core gives no `case-marked` clause to a stem outside grc and san).
- The pronoun rung takes an optional `roles` input (pronouns.js): a clause's case-read subject weighs the boost dial instead of "the first mention of the sentence" (an English word-order proxy), and a pronoun's clause siblings are barred as its referent (disjoint reference). Modes `off`, `subject`, `subject+coarg` (readerOptions.caseRoles).
- `frame-san.json` ships in native/priors-shipped (the Sanskrit read had no cast without it); the door reads that directory last. The grc and san registers carry their measured evaluation (the guard requires it). The baseline is re-recorded.

## Greek (PROIEL gold; the shipped register and fold; default dials; nothing tuned)
| arm | test books MATT MARK LUKE: right / wrong, precision, coverage | JOHN (dev): right / wrong, precision, coverage |
|---|---|---|
| off (today) | 359 / 318, 0.530, 57.3% | 229 / 80, 0.741, 76.9% |
| subject | 384 / 286, 0.573, 56.7% | 223 / 83, 0.729, 76.1% |
| subject + co-argument | 376 / 302, 0.555, 57.4% | 221 / 64, 0.775, 70.9% |
Null (referents permuted): 0.400 on test, 0.640 on JOHN.
- G1 HOLDS (subject beats off on the test books). G2 FAILS on the test books (0.555 < 0.573), holds on JOHN. G3: every arm is above its null.
- Rule: the mode with the higher pooled test precision (subject) becomes the default only if it also beats off on JOHN. It does not (0.729 < 0.741), so the default stays `off`: the role machinery ships dark.
- Noted, not acted on: subject+coarg beats off on both sets (test +2.5 points, JOHN +3.4) at a cost of 6 points of coverage on JOHN. The rule did not choose it; it is a candidate for a new preregistered decision on fresh gold. The test books were already scored for other arms (PREREG-GRC), so this was new-hypothesis-on-sighted-books.
- Of the 1,181 answerable test pronouns (off): 677 bound (359 right), 232 below the floor, 177 tied, 95 forms not in the register. Nearly half of all 2,116 gold third-person pronouns carry no overt token (null subjects).

## Sanskrit (no gold; the gold-free falsifier; four local texts: Gita, Brihadaranyaka, Chandogya, Aitareya)
Pooled over 1,107 found pronouns: bound 424 (38.3%) with roles off, 417 (37.7%) subject, 416 (37.6%) subject+coarg. The wrong-binding rate against the permuted null is unchanged by mode (Gita 13.3 / 13.2%, Brihadaranyaka 8.1 / 10.3% (the only text clearly under its null), Chandogya about 3 / 4%, Aitareya 7.7 / 5.4%). Roles changed nothing measurable here; the falsifier cannot see a bound being that is not a character, and these are philosophical dialogue and ritual texts with few characters.

## Not done
Latin (the seam covers it; no register); the null-subject anchor (recorded as clauses, not yet turned into bindings: PROIEL gold has no token for them to be scored on); roles measured on fresh Greek gold (none exists beyond the four gospels).
