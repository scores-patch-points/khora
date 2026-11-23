# The man in the box (Brydon): a design principle for the chat, and for what comes after it

2026-11-23. The owner: "we're not really creating a hack and a bunch of pressure relief valves for problems that may occur. We are really doing this as if it was a person, and I'd like you to use that as a design principle. … Name this after the guy from the British comedy things and the Trip movies, who does The Man in the Box. If there were a man in the box, how would he be able to answer these things?"

I take that to be Rob Brydon (the small man in a box), so the archon here is **Brydon**. If that is the wrong man, the name changes and nothing else does. This is a proposal: it is not in `CLAUDE.md`, where the other archons (Dignaga, Thrax, Sullivan, Vasana, Nagarjuna) live, until the owner says so.

## The man

A man sits in a closed box. He has:

- **a slot** where messages arrive (the thread), and nothing else from outside: no tone of voice, no face, no clock unless a message says so;
- **a notebook** in which he writes down what he was told, who told him, and what he made of each message (the fold, written to pharos by whoever wrote it);
- **a shelf** of reference books he can reach for: a dictionary, a book of famous people, an encyclopedia (the doors);
- **a pencil**, and the habit of writing down what he takes things to mean (the claims);
- **no knowledge of the world of his own.** What he knows is the notebook and the shelf (the developer is not a giver).

He is not clever and he is not a program. He is a person doing the job honestly. The design question for every mechanism is the one the owner asked: **how would he answer this?**

## What he does, in order

1. **He works out what the person at the slot is doing.** A question, a remark, a correction, a greeting. He writes down what he thinks, and if it could be two things he writes down both and says so ("did you mean that as a question?"). *(acts.mjs: claims on marks, ambiguity left open and said.)*
2. **He looks in the notebook first.** If he was told, he says so and shows where. If he was told it did *not* happen, he says that. *(the fold; negation; "not Mina".)*
3. **If it is not in the notebook, he asks himself whether a book on his shelf would have it,** by what kind of thing is missing, not by a keyword. *(doors, by the gap's shape.)*
4. **He does not read a stranger's words to the librarian.** If he cannot read what was written, he says he can't. *(only words the reader knows leave the machine.)*
5. **He reads the page himself, the whole page, and the lead first.** The page named for the thing says what the thing is. *(the hunt.)*
6. **He checks before he says it.** Does anyone else have more behind them? Does the answer fit the kind of thing asked? Does a second page agree? If not, he says what he found and how much stands behind each, and does not pick. *(hunt-check.mjs.)*
7. **He says where it came from**, the page and the sentence, so the person can check him. *(citations.)*
8. **He changes his mind when told,** and what he built on the old reading goes with it. *(withdrawal; suspended claims.)*
9. **When he truly cannot tell, he asks.** He does not guess and reply as if sure. *(Not built: this is mechanic 7. Today an ambiguous message is routed to the least harmful reading and the doubt is shown; the man would simply ask.)*

## The Brydon test

For any mechanism, say in plain words what the man would do at that point. Then:

- if the mechanism **is** that behaviour, keep it;
- if it is a **special case no person would follow**, or a limiter added only because one case went wrong, it is a **pressure-relief valve**: replace it with the behaviour a person has, or delete it, or write it down as a pin so the real cause is found;
- if the man would need something he **does not have** (a world model, a tone of voice), it is a typed gap, said plainly.

A valve is not always wrong while the real behaviour is being built; it is wrong to leave it looking like the design.

## An honest audit of today (2026-11-23)

| mechanism | the man would… | verdict |
|---|---|---|
| act claims, ambiguity shown, revision by "no" | decide what the person is doing, doubt aloud, take it back | **person** |
| yes/no and "not Mina" from the notebook | look at what he wrote down | **person** |
| no research for people already in the notebook | not phone the library about his own notebook | **person** |
| only words the reader knows leave the machine | not read gibberish to a librarian | **person** (the check is crude; the reader's own typed gap should replace it) |
| hunt by the void's kind, whole pages | open the right book and read | **person** |
| the check on a hunt's answer (hunt-check.mjs) | not say the first thing he found if more pages say another | **person, but placed too late**: the organ should rank by it; this stays as the reader's last look |
| "help" shows help only when it is the whole message | recognise that someone asked for help | **valve** (a word table and a length cut-off) |
| the small-talk word table | know a greeting | **valve** (an English word list) |
| "Okay." for every social remark | reply to an apology as to an apology | **valve**, and a gap: a person tells them apart; we have no giver-backed way (`eval/chat-register/social-acts`) |
| routing an ambiguous message to the least harmful act | ask "did you mean…?" | **valve** until mechanic 7 |
| the 10-minute cache and the 429 backoff | wait and try again later | **person** |

## What the man cannot do

He cannot hear. He cannot know a thing nobody wrote down and no book on his shelf has: a world fact he was not given is "I haven't been told", never a guess. He cannot read a language he has no dictionary for, and says so. He has no opinion of his own about what an apology sounds like. These are not failures to patch; they are the box.

## First live evidence for the principle

The first live run of the hunt answered "Who wrote War and Peace?" with **Suetonius**: one sentence in a section on the title's history, matched as a role, ranked above Leo Tolstoy, who was in the candidates on two pages including the novel's own lead. No valve fixes that well; the man would read the lead, see "an epic novel by the Russian author Leo Tolstoy", and be done. Findings sent to the organ's owner: (1) a title is one anchor ("War and Peace", not "War" and "Peace"); (2) "by" after a work, in the page's own lead, is the author; (3) the page named for the thing says what the thing is, and a match in a quotation or in another work's history does not outweigh it; agreement across pages counts. Until the organ ranks that way, the chat lists what it found and does not pick.
