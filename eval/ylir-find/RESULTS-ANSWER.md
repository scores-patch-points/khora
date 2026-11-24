# Can the chat's hunt answer from Ýlir-One? (2026-11-24, DEV / EXPLORATORY)

The owner: the ground is the source, the figure is Ýlir-One, the pattern is attention (the SIG pheromone trails, synapses, expressways); "reference first": the full read (the hunt, over the cited documents) must succeed before a trail layer has anything to learn from.
Protocol: `answers-dev.json` (stamp `STAMP-ANSWERS.txt`, 2026-11-24T17:11:52Z), the 20 dev questions of `questions.json` (already scored for document finding), ten with a short checkable answer; the fresh set is untouched. Documents: the top 3 by log(1 + count) x log(N / df); passages: the sentences that carry the rarest anchor word, labelled with their byte addresses (`native/organs/hunt-source-ylir.js`, written against the ingestion session's door; `door-adapter.mjs` over `Zenodotus/scripts/ylir-one.mjs`); the hunt (`native/organs/void-hunt.js`) reads them with the reader. DEVIATIONS-ANSWERS.md: the judge compares whole words after the first identity arm showed "son" matching inside "garrison"; every arm was rescored the same way (`rejudge.mjs`).

| arm (each change made after looking at the arm before: no clean test after the first) | right | wrong | gap | controls (3, no answer exists) |
|---|---|---|---|---|
| 1 exact relation only | 0 | 0 | 10 | 3 gaps |
| 2 + the relation stand-in (near verbs, DMD guard) | 0 | 0 | 10 | 3 gaps |
| 3 + identity tier, first version | 0 | 5 | 5 | 3 gaps |
| 4 identity tier tightened (subject is the anchor; noun phrases only; no all-caps sentences) | 0 | 4 | 6 | 3 gaps |
| 4, through the real Ýlir-One door instead of the stand-in index | 0 | 4 | 6 | 3 gaps (answers identical) |
| 5 + corroboration: an identity description needs two different sentences (IDENTITY_MIN_SUPPORT = 2) | 0 | 2 ("friend", "Dr.") | 8 | 3 gaps |

What the arms say:
- The relation stand-in never fired on these questions: the sentences that carry the anchor hold no near verb of the relation (the Mongol Empire article has no sentence "X founded the Mongol Empire"; it has a noun, "the establishment of the Mongol Empire", and "Genghis Khan's grandson and founder of the Il-Khanate"). The unit tests show it works where a near verb is present.
- The identity tier answers real text badly: "violent" for Aristotle's student, "friend" for Harker, "into that bay" for Jim Hawkins, "Dr." for Van Helsing (arguably right, wrong by the stamped list). Single sentences of novels and plays (verse, headings, odd parses) are not a safe source of what someone IS; corroboration by more than one sentence is the missing guard, not yet built.
- The first arm's only "right" was a false positive (substring), and the oracle check says the answer-bearing sentences are often in the retrieved documents ("Professor Van Helsing, of Amsterdam" in Dracula; "NARRATIVE RESUMED BY JIM HAWKINS" is not an identity).
- The controls were gaps in every arm: no answer where there is none.
- Two unscored open questions got wrong-looking answers in every arm ("book" for the Tractatus, "man" for the perihelion of Mercury): a false-positive mode of the older tiers that this work did not touch.
Hunt tests: 25 pass (`native/organs/void-hunt.test.mjs`, which also runs against another checkout's reader with KHORA_NATIVE).
Not done: corroboration for identity answers, noun relations ("student", "father"), nominalisations, multi-sentence answers; the trail layer.

## The fact set (FRESH for the answer test; stamped 2026-11-24T18:10:28Z before any answer was read: answers-facts.json, STAMP-FACTS.txt)
31 questions in the hunt's own domain over the corpus's 50 Wikipedia articles (birth place and year, death year, who wrote a work, a capital, a founder), each checked by hand to have a sentence in its own article that holds the subject and an accepted word (one question failed that check and was dropped: Tolstoy's birth year). Real door; arms declared in advance, no code change between them: A exact relation, B with the near-verb stand-in. Whole-word judge.
| arm | right | wrong | gap | controls |
|---|---|---|---|---|
| A exact | 3 | 1 | 27 | 3 gaps |
| B + near-verb stand-in | 3 | 1 | 27 | 3 gaps (answers identical) |
Right: Kant born "22 April 1724", Goethe died "1832", Faust "Goethe". Wrong: Kant's birthplace "LutheranismLutheran" (link markup fused into the corpus text). These are the first successful answers from Ýlir-One, and each carries its sentence and byte address.
Why the other 27 are gaps (read from the results, diagnosed, not yet fixed; they fall in three layers):
- QUESTION READING: "Where was Aristotle born?" declares no void at all; "Dante Alighieri" is read with the anchor "Alighieri" only; "What was the capital of the Byzantine Empire?" loses the relation "capital" (it read "thing", relation none) so the answer "Constantinople" stands only as a lead.
- RETRIEVAL: with common-word anchors the sum of per-word scores prefers long documents ("Who wrote War and Peace?" and "Who wrote Hamlet?" retrieve the Complete Works of Shakespeare; "When did World War I begin?" never reaches the World War I article). The score has no length normalisation and no use of the document's own TITLE (the catalog has one for 90.6% of documents): a document named for the anchor should lead, as the Wikipedia page named for the subject does.
- ANSWER READING: an encyclopedia lead says "Immanuel Kant (22 April 1724 – 12 February 1804)": the death year is a parenthetical date range, and no sentence says "died", so "When did Kant die?" finds nothing; likewise a birth place said in a fused markup artefact.
Next, in this order: the parenthetical life dates and the void reading of those three questions (reader-level, small, testable), then title-named documents in retrieval; the trail layer after, on the successes. Any change is made knowing these 31 answers: a new fact set is needed to test it.
