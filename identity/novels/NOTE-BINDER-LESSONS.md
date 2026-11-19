# Lessons from the attention-binder session (khora#95, five held-out rounds), for the noun-phrase referent round

Source: a cross-session answer on 2026-11-19 from the session that owned khora PR 95 (`attention-binder`, head d14a274, `eval/attention/`, `NOTE-ROUND3-DIAGNOSIS.md`). Quoted as data, from files only; nothing was run on fiction or LitBank (everything was encyclopedic single-topic leads, sets of 30 to 40 cases, so intervals are wide).

Record as scored: round 1 precision 11/12, coverage 12/13, trap failed; round 2 coverage 5/16 (failed); round 3 precision 8/12 (failed), traps 4/16; round 4 precision 14/14, right-bound coverage 14/22, silent 4 (failed); round 5 precision 6/9, right-bound coverage 6/22, traps 6/18. Development always far better than held-out (round 3: 0.97 against 0.67).

Their reading: not "cannot work", not "just under-specified". The binder is limited by what the cast hands it and has no way to say a sentence introduces something the cast does not hold. In 3 of 4 wrong traps the thing the sentence was about was never a cast being. That supports admitting noun-phrase referents; it does not show it fixes pronoun precision (more candidates means more ties).

Reuse: typed gaps with named reasons and every target ending as a binding or a gap (a scorer matching on token start that reports silent cases); causal reading (earlier sentences only); longest naming claims its bytes; the expletive-it rule; the document-weight bearer test (an owner of a head word must carry at least 20% of the topic's undecayed count); carry and centre vetoes (trap safety at a large coverage cost); earned noun evidence only behind the topic test. Do not reuse the tie-breaker by fuller name or previous subject.

Mistakes to avoid (their list):
1. A pool of one is not confidence (margin 1.0 by construction).
2. Cast quality dominates: split beings (Hagia, Sophia, Hagia Sophia) and merged ones (LHC into the Grid), truncated names. Decide the alias-versus-prefix match rule BEFORE scoring and keep each bound being's full surface list in the raw rows.
3. Count coverage as right-bound over all cases, never bound over all cases.
4. Tuning on spent sets that contain the misses inflates development by 0.2 to 0.3: pre-register what was tuned on.
5. Presence ranking is not the topic: the undecayed document count worked better than who is most present now.
6. Their sets were single-topic leads; fiction has several protagonists and no attended topic, so the topic and bearer tests do not carry over (the continuity and carry rules might).
7. A non-person ruling matters more when it/they are bound to common nouns (their runs lacked the Wiktionary pack).
8. Their sets were built to hit the last failure, so their numbers are pessimistic; score a set where the hardest kinds are rare if possible.

---
# Downstream need, from the Wikipedia fr/de claims session (2026-11-19, a peer's message, quoted as data)

It needs two referent kinds the read does not produce: (a) definite descriptions and common noun phrases ("the province", "the capital", "the city", "the region") resolved to the article subject or to a different referent; (b) "it/its/they" bound to the article subject. Its failure mode when they are missing: a number extracted for the wrong referent. Population claims with a stated year are still disputed on true pairs at 5-7% on administrative divisions (fr 3/42, de 5/79; 3/35 on a third fresh set) because the province's lead gives its capital's figure: Groningen 231,299 (city) against 601,000 (province); Meghalaya 3.2M against 143,000 (Shillong). A text-window rule for which referent a number describes failed to generalise. On its 321-lead unprimed corpus: 796 referents, but only 262 of 6,435 subject-verb-object relations (4%) have both ends resolving to a referent. I/you/we do not occur in those leads.
Independent gold it offers (not built from the read): land area agrees on true interlanguage-linked pairs 0.86-0.87 against 5-6% by chance among same-category impostors (fr 13/15, de 30/35), birth year (true pairs never rejected). Pair files `fresh*-.json` in its scratch folder `wikipedia/`, fr 306-363 pairs per set. It creates no referents and edits nothing in khora.
So a noun-phrase and it/they referent round has a downstream test that is not the coreference scorer: whether "the capital" resolves away from the province, scored by whether the number then agrees across languages.
Follow-up from the same session: no objection to using its capital-versus-province case and its pair files. A typed-gap stopgap (a claim is untied if a role word such as capital, capitale, Hauptstadt, city, ville, Stadt or town sits in its clause; its `wikipedia/RESULT-TIE.md`) cut true-pair disputes on the data it was tuned on (fr 0/54, de 1/84) but not on a fresh set (de 3/35, upper 0.22; fr coverage fell to 1.4%): the other language's lead states a sub-entity figure in a clause with no role word (Qom 1,292,283 against 11,526; Kahramanmaraş 1,177,436 against 1,176). So a typed gap on "the city" or "the capital" is necessary and not sufficient: the bound referent needs the number's own subject. What worked as a tie with no referents: land area as a second quantity (agrees 0.86-0.87 on true pairs, 5-6% by chance).
