# The fold chat: ideation as a linted process, and the doors

2026-11-23. Three things the owner asked for, in their order: "the ideation being a janus linted process that we can see in the fold chat"; "as an app all the repos write to pharos"; "doors and explicit tool calling with slash commands, but it should be willing and able to do this research itself", then "a signal for doing research IS not knowing an answer".

## Who writes what

One log, `~/.pharos/fold-demo` (`CHAT_PHAROS_DIR` to change it), one file per writer inside it. The ruling is janus's own (`pharos-door.mjs`, 2026-11-14): no repo reports to another; each writes its own entries and reads the others'.

| writer | what it writes | through |
|---|---|---|
| `khora-chat` | statements, the cast, frames, the nine-operator turn (void, thought, candidate, verdict, utterance), **candidate** entries (every thing a reply could say), **assessment** entries for what khora's own organs computed, **tool** entries (every door call) | `record.mjs`, `ideation.mjs`, `doors.mjs` |
| `janus` | **assessment** entries for what janus's organs tested (a person is not their own wife; no giver states a spouse) | janus's own door (`janus-door.mjs` mounts it; the chat does not write janus's verdicts for it) |

The standing of each candidate is not remembered by the chat: it is read back off the log (every writer's entries, in log order) and projected by janus's reasoning spiral (`reasoning-spiral.js`). A candidate with no ground is `unlicensed`; a deduction with no named license is refused and stays on the record; a claim whose premise is refuted or unmet is `suspended`; a giver's word is `licensed`, never `supported`. A janus checkout that is not there is a typed gap that says how to get it (`JANUS_HOME`, or clone beside khora), not a silent degrade.

## What a reply does

1. The question is read; what it could be answered with is **put forward as candidates** (`ideation.propose`), each with its ground (spans of the thread, or a named giver).
2. Each is **tested by an instrument** and the verdict is written by the instrument's owner. Example, "who was his wife?" after "who is Tolstoy?":
   - "his" stands for Tolstoy: khora's cast, witnessed by the span where the referent was introduced → holds.
   - Tolstoy is Tolstoy's wife (what the old identity route answered): janus `kinship.makeFact` refuses it (`self_relation`) → ruled out.
   - Tolstoy has a wife the thread names: janus's rule for "wife" (read from the Wiktionary gloss) over the facts the thread holds → open (`no_spouse_fact`).
   - Sophia Tolstaya: the door `relation` (Wikidata P26), a giver's record → rests on a giver's word.
3. The reply is the surviving claim, plain, with its sources as numbered citations (no "from Wikidata" in the sentence); "How I thought" shows every candidate, who tested it and who wrote the verdict.

## Doors

`doors.mjs`. A door is declared (name, what it is for, usage, what it needs, whether it is on and why not), read-only, and answers with its source. `/doors` lists them; `/name args` calls one by hand; every call is a `tool` entry in the log.

Research is triggered by **not knowing**. A question the thread cannot answer ends in a typed gap, a gap has a shape (`no_spouse_fact`, `unknown_referent`, `no_answer`), and a door declares the shapes it fills (`fills`). The chat matches shape to door and goes to look without being asked (never by a keyword of the question). What a door brings back enters the thread as a **given** sentence (said by the giver, not the user), so questions can be answered from it with the sentence quoted back under the giver's name. "Go research it" does nothing the chat was not already built to do: with a gap open it looks again at that gap; with none it says it is missing nothing.

An imperative is acted on when it is about what is not known: its object is a pronoun or absent (the open gap), or a name the thread has not met. An imperative about the world ("open the door") is refused and points at `/doors`.

## The page, and what it does while it works

The page is a chat app, not a command line (the owner, 2026-11-23: "make it all feel more like a chat app, the slash commands aren't great"): replies are plain text with numbered **source chips** (`[1] Wikidata · Q7243`), one collapsed **Reasoning** (what was used, what was considered, who tested it), a typing line that says what is being done while a door works ("Searching Wikipedia for …", streamed as lines by `/api/chat` when the page asks), Copy and Try again on a reply, New chat, and a persona picker. Slash commands still work for anyone who types them, and are not advertised.

## Personas: a prompt read as a document about the assistant

A persona is not a mood. `personas.mjs` reads a published system prompt through the reader: the **protagonist** is the name (or "you") the prompt most often makes the subject of a clause, counted over sentences spread across the whole prompt; the **identity** is the clause that says what it is (found by its copula wherever the parser hangs it: "This iteration of Claude is Claude Sonnet 5.5" gives "Claude Sonnet 5.5"; availability like "is accessible via" does not count); the prompt's sentences about the protagonist are read into a **fold of their own** (door: given, the prompt's words). A question about "you" is asked of that fold with "you" turned into the name: "who are you?" is the identity; anything else is answered from the prompt's sentences with them cited, or says "That isn't something my instructions say." The picker lists only prompts (not skills, agent files, tool docs), labelled by file and date, because "claude" used to mean Claude Code's 2 KB FleetView agent file.

## Research by search

A gap of shape `no_answer` goes to the `search` door: the question's content words (chosen by part of speech, never a word list, so lowercase names do not matter) are searched on Wikipedia, the best two matches are read into the thread as Wikipedia's words, and the question is asked again. If what was read does not answer it, the reply says what was read. The door client caches for ten minutes and waits out HTTP 429 and 5xx twice, honouring Retry-After. The `person` door judges its first hit: every word of the name must be in the label, else the closest is named (a search for "marie curie" must not return "Marie de France").

## What is not built (open, with where to look)

- **Answering "who did X play in Y"** from what it read: the opening says "starring Mel Gibson and Danny Glover as … Martin Riggs and Roger Murtaugh", and pairing the two lists is a role-level equivalence the engine does not have. The research now fires and reads the right articles; the answer needs the pairing.
- **Yes/no questions** ("did Mina give Jonathan a book?") return an empty sentence; follow-ups ("where was she born?") are not carried; small talk outside the table ("good morning") is stored as a fact. The owner's census of 53 asks (fork session, exploratory) puts it at 13 right, 24 handled, 27 gaps, 11 rate-limited.


- **Kin facts from the thread.** `kinFacts()` in `thread.mjs` is empty: "Sophia was Tolstoy's wife" is not turned into a janus fact (janus `scripts/kinship/bind-kin.mjs` reads kin from text). Until then the thread-side answer to a kin question is always a gap, and the doors fill it.
- **`/reason`** is declared and off: the epistemic reasoner exists (`native/organs/epistemic-core.js`, tested on the board puzzle and Cheryl's birthday: possible worlds and public announcements), but reading a puzzle's text into it is not wired. The plan is the same shape: candidate readings put forward, each tested (a reading that gives one answer holds, none refutes, several are open), janus projecting the standing.
- **Research quality.** `Who wrote War and Peace?` after reading Wikipedia's opening is not answered (the opening says "best known for the novels", a different frame), and the topic the chat picks for its own research is the first name in the question. Pinned.
- **The door names and the verbs of requests are English** (the 206 text-field reads counted in HOW-WE-ITERATE are still there; this adds a few). The door-fill matching itself is by gap shape.
- **janus cannot take a giver's record as a kin fact** (it requires a span of text), so a researched answer stands as `licensed` and is never counted as janus's evidence. That is janus's law, kept.
