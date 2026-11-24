# What mechanics does real chat need? (EXPLORATORY, 2026-11-23)

Question (the owner, on choosing the 297 chat logs already in Zenodotus): "use this to see what type of mechanics we have to add."

Method, in one paragraph. The chat-log documents of Zenodotus `19-organic-community` (NUS SMS en 25 files, CoSEM 40, Ubuntu/Kubuntu IRC 45; 3,610 + 17,685 + 195,547 messages) were sampled by hash (1,200 per source; the sample does not depend on who picks) and read through khora's reader. What a message is *doing* is taken from the reader's marks (mood, person, PronType, polarity, INTJ, vocative, whether there is a verb), not from word lists. A formal control (Alice in Wonderland, 1,200 sentences) was read the same way. Then the chat, offline (no givers, no janus), was given two examples of each of the 22 commonest kinds. Nothing is hand-labelled, nothing is a threshold. `mechanics.mjs`, `invariance.mjs`; raw numbers in `mechanics.json`, `invariance.json`. Split label: EXPLORATORY (no preregistration, no held-out set). Stamp: see the `stamp` field of each json.

Limits. The kinds are what the *reader* sees, and the reader is itself unreliable on this register (it read "Helo krish ji.. H0w areu?" as an imperative), so a share here is a share of what the reader sees, not of true acts. The formal control is one book. The invariance asks are the 56 I wrote for the 2026-11-23 census, so that part measures the reader's stability, not real asks. Chat logs here are human to human; they show the mechanics of chat, not of asking a bot.

## 1. The register gap (share of tokens or messages)

| | SMS | CoSEM | IRC | formal control |
|---|---|---|---|---|
| tokens per message | 10.2 | 3.2 | 9.9 | 14.3 |
| words unknown to the POS prior | 31% | 23% | 18% | 9% |
| messages that start lowercase | 2% | 12% | 71% | 15% |
| messages with final punctuation | 41% | 31% | 30% | 57% |
| messages with no verb | 33% | 33% | 18% | 7% |
| proper-noun tags that are lowercase | 12% | 6% | 33% | 0.1% |
| messages with an emoticon or symbol token | 5% | 2% | 7% | 1% |

## 2. What the reader sees messages doing (union of the three chat sources, 3,600 messages)

fragment (no verb) 26.7% · statement (no clear subject) 12.8% · statement (noun subject) 10.8% · question with no subject 7.8% · statement by "I" 7.6% · empty (no readable word) 6.2% · imperative 4.4% · question (noun subject) 3.4% · interjection 3.3% · question about "I" 2.3% · negative statements about 7.6% together · question about "you" 0.8% · question about "it" 0.4%. 43 kinds in IRC, 32 in each of SMS and CoSEM, 37 in the formal control.

**What the chat does with them today.** Every statement, fragment and interjection becomes "Noted." and is recorded as a fact ("Ok dear", "Yes.", "Sorry Dear", "Okay...", "Boring. Bored. Waiting for david."). Every question is sent to the encyclopedia, including ones that are not about the world: "Where are you now exactely?shall we wait for dinner?" read an article headed "Élisabeth o…", "Why don't you wait 'til at least wednesday..." read articles headed "Stranger T…", "Do you always celebrate NY's with your family ?" read ones headed "Christmas…"; "I am great! How are you?" also went looking (the search door was rate-limited that run, so the answer was a failure message, not an article). An imperative misread from register ("Goin 2 study..") is refused as a request.

## 3. Conversation (IRC only, 195,547 lines in 45 daily logs; from the log's own structure, no parsing)

- 39% of lines are addressed to another speaker by name ("nick: ..."); the addressee's last line is a median 3 lines back (p90 11, n = 76,868).
- Of questions that name an addressee, 71% are answered by that addressee within 5 lines. (The other statistic, that 99.9% of "?" lines are followed by another speaker within 5, says nothing in a busy channel and is not used.)
- 15% of lines continue the same speaker's previous line: a turn is often several lines.

## 4. Invariance of the reader on how people type (the 56 asks; same content, perturbed)

| variant | messages changed | read identically | (word, tag) pairs kept | proper nouns still proper nouns | relations kept (Jaccard) |
|---|---|---|---|---|---|
| all lowercase | 24 (the ones with capitals) | 17% | 74% | **14%** (22 messages with names) | 70% |
| final punctuation removed | 41 | 83% | 99.5% | 100% | 90% |
| one adjacent-letter swap (the swapped word left out of both sides) | 52 | 90% | 99.5% | 100% | 93% |
| control: the same message read twice | 56 | 100% | | | 100% |

Reading: typos are not the problem. **Case is** (on average across the 22 messages with names, 14% of proper nouns survive): lowercase "who is marie curie?" gives no proper noun at all, and "pierre loves natasha." loses both names. The final "?" carries structure: "how tall is Mount Everest" without it loses every relation.

## 5. Mechanics to add, ranked by how much of real chat they touch

1. **Social acts that are not facts** (acknowledgement, backchannel, apology, laughter, thanks; fragments and interjections are about 30% of messages). Reply socially or not at all; never "Noted." and never store them.
2. **Participant questions** (a question whose subject is "I" or "you", about 3%, more in a one-to-one chat where every "you" is the bot): the void is a participant's, filled from the thread or from the system's own description, never from an encyclopedia. Research is for voids whose arguments are in the world.
3. **Names without capitals**: 86% of proper nouns lost under lowercase; 33% of the proper-noun tags in IRC are already lowercase. A giver (a name table, Wikidata) re-casing before the read, measured by this invariance, is the candidate; it belongs to the reader's side and needs the reading baseline re-recorded, so it is reported, not done.
4. **Register normalisation** (18-31% of words unknown to the prior, against 9% formal): abbreviations and spellings ("u", "wat", "2morow"). Induced from the data against the POS prior's vocabulary (not a typed list), judged by the same invariance.
5. **Language and code-switching**: the "empty" class (6.2%) holds punctuation runs and Chinese; romanised Tamil in the SMS set is read as English noise. A message in a language with no codec is a typed gap (CLAUDE.md rule 8), not English by default.
6. **Turn assembly** (15% continuation lines): several quick lines are one turn.
7. **A question pairs with the next turn from its addressee** (71%): when the chat asks something back (a clarifying question), the user's next message fills that void. It is what makes clarification possible, and what makes a fragment ("ok dear", "yes") readable as an answer rather than a new statement (fragments are 27%).
8. **Negation as a sign** (about 8% of messages carry it): "I don't want to talk about this" must not be stored as the positive fact; a correction ("no, ... a pen") replaces a fact.
9. **Affect marks** (emoticons 2-7%, elongation "Buzzzz", repeated "?"): the stance of the speaker, which a reply's tone depends on.
10. **Addressing** (39% in a group, a vocative in one-to-one): the name the user calls the system by is a deixis, not a referent to research.

## Pins (also woven into the pharos log, kind `pin`, writer `chat-register`)

- `chat-acks-become-facts`: acknowledgements, interjections and fragments are recorded as facts and answered "Noted."
- `chat-participant-questions-go-to-the-encyclopedia`: "how are you?" / "where are you now?" trigger research.
- `chat-lowercase-names`: 86% of proper nouns lost when the same message is lowercased.
- `chat-register-misread-as-request`: "Goin 2 study.." and "Helo krish ji.. H0w areu?" read as imperatives.

## Material and attribution

The messages quoted and counted here are excerpts of three public research corpora held in Zenodotus `19-organic-community` (read-only; nothing was added there): the NUS SMS Corpus (Chen and Kan, 2013; research use, contributor IDs anonymous), the Corpus of Singapore English Messages, CoSEM (Gonzales et al., 2021; scrubbed and anonymised), and the Ubuntu and Kubuntu IRC logs (publicly served by Canonical). Each excerpt is at most about 110 characters, kept to show what a count is made of (`mechanics.json`, `declared-vs-done.json`, `fragments-to-label.tsv`). A formal control sentence set from Alice's Adventures in Wonderland (Project Gutenberg, public domain) is used for contrast. Before this folder is pushed anywhere public, the owner should decide whether the excerpts stay or are replaced by hashes and counts. Everything here is EXPLORATORY: no preregistration, no held-out set, and the labels in `fragments-mine.json` are the developer's, not gold.
