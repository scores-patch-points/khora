# A 25-message chain, driven in the browser (2026-11-24)

EXPLORATORY: developer-written conversation, run once through the page at http://127.0.0.1:4861 (typed into the message box, one message at a time), on the chat as of commit df181e3 plus nothing else. **That server ran on the 20-file STAND-IN priors (KHORA_PRIORS_DIR unset: the prior door takes `../janus/priors` before `~/Documents/janus/priors`, 1,957 files); see the last section for the same chain on the real priors.** The chain was written before the run; the dry run of the same 25 messages through the API (before df181e3) is the "before" column. No model; every reply is read off what was said in the thread.

| # | you said | the chat said | right? | before df181e3 |
|---|---|---|---|---|
| 1 | Hello. | Hello. | social | same |
| 2 | Mina gave Jonathan a book. | Noted. | read | same |
| 3 | She lives in the village. | Noted. | read | same |
| 4 | Jonathan wrote a letter to Mina. | Noted. | read | same |
| 5 | The letter was long. | Noted. | read | same |
| 6 | Mina read the letter in the garden. | Noted. | read | same |
| 7 | Who gave Jonathan a book? | Mina. | yes | same |
| 8 | Who wrote the letter? | Jonathan. | yes | same |
| 9 | Where did Mina read the letter? | I haven't been told that. | NO | same |
| 10 | What is 15% of 80? | 12. (arithmetic, cited) | yes | same |
| 11 | Who lives in the village? | Mina. | yes (recall across the digression) | same |
| 12 | Pierre visited Mina in the village. | Noted. | read | same |
| 13 | Pierre brought a basket of apples. | Noted. | read | same |
| 14 | He gave the apples to Jonathan. | Noted. | read | same |
| 15 | Who gave the apples to Jonathan? | Pierre. | yes | "“He”, but I can't tell whether that is Jonathan or Pierre." |
| 16 | Who is she? | That would be Mina. You told me “Mina gave Jonathan a book.” and “She lives in the village.” and “Jonathan wrote a letter to Mina.” | yes | same |
| 17 | Who did Jonathan write a letter to? | I haven't been told that. | NO | same |
| 18 | Mina did not read the book. | Noted. | read | same |
| 19 | Who read the letter? | Mina. | yes (the negation is about the book, not the letter) | same |
| 20 | Thanks. | You're welcome. | social | same |
| 21 | What did Pierre bring? | A basket of apples. I read “brought” as “bring”, which is what I hold. | yes (the note is odd, see below) | same |
| 22 | Who did Pierre give the apples to? | I couldn't read some of those words, so I didn't look anything up. | NO (and the reason given is wrong) | same |
| 23 | Who is Pierre? | You told me “Pierre visited Mina in the village.” and “Pierre brought a basket of apples.” and “He gave the apples to Jonathan.” | yes | same |
| 24 | Where does Mina live? | In the village. | yes (the answer was in "She lives in the village.") | "I haven't been told that." |
| 25 | Who gave Jonathan a book? | Mina. | yes (the first fact, 24 turns later) | same |

Of the 14 questions: 11 right, 3 not (9, 17, 22). Before df181e3 the same 14 were 9 right, 5 not. Nothing drifted off topic: the digressions (arithmetic, thanks) changed nothing, and every answer came from the thread.

## What df181e3 changed, and why it was needed
The first run of this chain (through the API) failed 15 and 24 and 17 in ways that were the chat's, not the parser's:
- **24, "Where does Mina live?"**: the frame held "She lives in the village", so the question's name "Mina" matched no frame (the match was on the word "she"). A role a pronoun fills is now matched through the referent the pronoun settles to (the referent rule), and an open pronoun matches no one.
- **15, "Who gave the apples to Jonathan?"**: "He gave the apples to Jonathan." left "he" open between Pierre and Jonathan. A personal pronoun is not another argument of its own verb, so Jonathan is not a candidate.
- **17 and 22**: a stranded "to" ("Who did X write it to?") was counted as a participant the question names; it is now the gap's role.

## What is still wrong (found by the chain, not fixed)
- **9 and 17**: the reader attaches "in the garden" and "to Mina" to the noun ("the letter in the garden", "a letter to Mina") instead of the verb. The frame the chat needs does not exist. This is the reader's prepositional-phrase attachment (CLAUDE.md measures about one phrase in five with its head in the wrong class). A bridge from a noun-attached phrase to the verb's question is possible but would be a guess about attachment.
- **22**: "to Jonathan" came back as a patient (`karman`) of "give", so no recipient frame exists; and the sentence the chat said, "I couldn't read some of those words", is not the reason (no word was unreadable). That wording comes from a different check and fires here by mistake.
- **21**: "I read “brought” as “bring”, which is what I hold." The fold keys the frame under the surface form "brought" while the question's lemma is "bring", so the near-verb stand-in ran on what is really one verb. The answer is right; the note is noise, and the fold should key by lemma.

## The same chain on the real priors (KHORA_PRIORS_DIR=$HOME/Documents/janus/priors), through the engine, run once
10 of the 14 questions right (the page run on the stand-in was 11). Differences: **15** stays "“He”, but I can't tell whether that is Jonathan or Pierre." (an honest open, not a guess): the real parser attaches "to Jonathan" to "apples", so no clause says "he" and Jonathan are arguments of the same verb. **21** answers "A basket of apples." with no "read brought as bring" note (the note was a stand-in lemma effect). **9, 17, 22** fail the same way. The turns take 3 to 100 ms warm (0.2 to 1.8 s for the first reads).
The chat's own tests were all written against the stand-in: on the real priors 11 of 123 chat tests failed before I guarded one parse-dependent assertion (condense, puzzle, addressing, define, say-more, persona, restate; the other session's tests among them). Which home the server runs on is the owner's call; `KHORA_PRIORS_DIR=$HOME/Documents/janus/priors node native/chat/server.mjs` runs it on the real one.
