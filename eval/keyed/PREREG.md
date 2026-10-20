# Entity-property claims, checked by identity: pre-registration

2026-10-20. Written before the keyed tier exists in the pipeline and before any arm is run. Battery: `eval/keyed/battery.mjs`, 33 sentences (14 true and
expressible, 12 false, 6 true but with no key the relation word can name, 1 unverifiable), frozen at sha256 in `battery.sha`.

## The question
The standalone app measured that prose-level clause binding earned nothing while ANSWERING BY IDENTITY (anchor QID, the kind's own keys, a typed
value; `fold-chat-void-keyed.js`, eval/void L5) more than doubled RIGHT. Can the same door CHECK an answer's sentence: does the typed value the
entity carries equal, differ from, or fail to speak to what the sentence says?

## Arms (each sentence alone, as the whole draft, no passages; the pipeline binds the anchor itself)
- **A0, as merged:** `finish` with research on: the bound entity's Wikipedia article judged by The Fold's falsifier, plus the hardcoded
  born/died structured check (`structuredVerdict`).
- **A1, keyed:** A0 plus the keyed door: the claim's relation words against the bound entity's own keys (`keyedFill`), the property's datatype
  as the admits kind, the typed value compared with the sentence's filler.
- Both arms replay the same recording of Wikimedia responses (every request the pipeline makes, recorded once through the 10 s gate; replay is
  offline and a miss is an error, never a fetch).

## Scoring (from the arm's output alone)
- **RIGHT:** the verdict equals the truth (supported for true, contradicted for false).
- **WRONG:** the verdict contradicts the truth (contradicted for true, supported for false, any supported/contradicted for `truth: null`).
- **GAP:** unsupported. Informative if its trace carries a typed refusal naming why (no key matched, datatype mismatch, no identity, no value).
- Reported: RIGHT, WRONG, informative GAP, silent GAP, per arm and per `key` class.

## Bars (A1 is admitted only if every one holds; a failed bar is reported as failed)
- **V1 (earns):** A1 RIGHT is strictly greater than A0 RIGHT.
- **V2 (never more wrong):** A1 WRONG is not greater than A0 WRONG.
- **V3 (typed gaps):** every non-RIGHT, non-WRONG verdict of A1 carries a typed refusal; none is silent.
- **V4 (evidence is earned):** every A1 supported/contradicted cites a Wikidata statement (`Q…#P…`) whose value is shown; every contradicted one shows a
  value that differs from the sentence's filler, and every supported one a value that equals it (checked by the runner, not read by eye).
- **V5 (hosts):** only wikipedia.org, wikidata.org and wiktionary.org were fetched; no model.

## What is declared, not measured (named so a measurement can reverse it)
- A numeric claim matches a stated quantity at the claim's own precision (8,849 against 8848.86), and a year matches a time value at year grain
  or finer. A claim naming a month or day is compared at that grain.
- A property marked single-valued by Wikidata (P2302) that returns one value and a sentence that differs is CONTRADICTED; a multi-valued property
  that does not list the sentence's filler is UNSUPPORTED with the listed values shown, never contradicted.
- Relation words are the sentence's open-class words after the anchor's own words, years and numbers are removed; no verb-to-property table.

## Amendment 1 (written before arm A2 was run)
Run on the frozen battery (battery.sha unchanged) after A0/A1 were measured: 7 false claims were found with the right value shown but left UNSUPPORTED
(k02 k05 k06 k16 k18 k33 and the quantity k26), because their properties are not marked single-valued.
- **A2:** A1 plus: a time or item property that lists exactly ONE value, bound unambiguously, and a sentence whose filler differs, is CONTRADICTED.
  Quantities are excluded (a sentence may round: "about 9,000").
- **Bars for A2:** W1 A2 RIGHT is strictly greater than A1 RIGHT; W2 A2 WRONG is not greater than 0; V3, V4, V5 as above. Failed bars are reported.
- Declared, not measured: a property that has a single stored value is read as a single true value. A fact with several true values stored as one
  (a country with two capitals, one stored) is the case this would get wrong; the battery holds no such claim, so a pass here does not clear it.

### Amendment 1 result (replay, offline)
A0 10 RIGHT / 0 WRONG; A1 12 / 0; A2 17 RIGHT / 1 WRONG. W1 holds (17 > 12). **W2 FAILS: A2 has 1 WRONG.**
The wrong one is k05 ("Isaac Newton was born in 1643", true by the Gregorian calendar): Wikidata stores 25 December 1642 (Julian), so the sole value
differs and A2 contradicts a true sentence. This is the case declared above, arrived as a calendar rather than a second value. A2 is NOT admitted.
Any follow-up (for example, never contradicting a time value whose calendar model is Julian) is a new amendment, and is informed by having seen k05.
