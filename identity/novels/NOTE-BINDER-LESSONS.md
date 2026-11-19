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
