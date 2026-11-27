# How we iterate: ground rules for an omnimodal system with no model (a proposal)

2026-11-23, second version. The owner: "we are inventing a new type of prompt engineering; I don't want you to hand-set this just for English talking about War and Peace; what are your ground rules; we need to discover how this works differently than LLM prompting", then, on the first version: "this needs to in theory be omnimodal; think deeper about the rules."

This is a proposal. Nothing here is in `CLAUDE.md` until the owner says so. The first version said "marks, not words"; that still let the chat read word classes and grammatical features, which only text has. This version starts from the shape of the system instead.

## The shape: an hourglass

- **Readers** at the top, one per medium and language: text in English, text in Russian, mathematical notation, code, an image, a video shot, speech. A reader is the only thing that knows its medium.
- **The middle**, which no medium owns: referents, events with their participants and roles, identity edges, voids, acts, each with an address back into its source; the marks placed in the 27 cells (`native/kernel/cube.js`, `universal-grammar.js`). All reasoning happens here.
- **Voices** at the bottom: a reader facing the other way, from the middle to a surface.

English is not special. "English" is a reader parameter in exactly the way "image" is. A rule that would not make sense for a video shot is not a rule of the middle.

**The chatbot is the first worked example, not the point** (the owner, 2026-11-23: "we do want to create a chatbot as first example, but it is just an example of what you can do, since natural-language codecs and characters are quite easy"). Natural language is the easiest reader to build, so the chat is where the middle gets exercised first. It is built so that swapping the reader, for another language now and another medium later, changes nothing in the middle.

The nexus already says this. `native/organs/question-void.js`: a question is declared as a void, "medium-blind: it never sees a word of any language, only the reading an adapter produced". `native/organs/void-satisfaction.js` is written as "general, omnimodal, level-addressed". `native/reading-one.mjs` routes by modality (text, code and notation wired; image, video and audio return typed gaps). And a non-text source is already on the log: slate's observations of a video shot (banners, standees, a tote, with frame-range addresses) in `~/.pharos/default/slate-vfx-scale.jsonl`.

## What my chat violates (audited 2026-11-23)

- **A second router beside the medium-blind one.** `native/chat/thread.mjs` decides what a message is by reading the English reader's rows itself. Counted: the reasoning layer matches text-only fields 206 times (word class 51, dependency label 27, features 12, lemma 31, written form 71, direct reader calls 9, sentence splitter 1, the literal `"eng"` 4; 57 in the thread, 149 in the engine).
- **English in code**: question words, arithmetic words, greetings with English replies, time words, `endsWith("?")`, the words on the DAG's arrows, and every reply sentence as a template.
- **The reader fixed to English.** Run in Spanish: "Hola." was stored as a fact, a who-question returned an empty ".", arithmetic and the clock failed, and nothing said the language had no reader.
- **Units and numbers from one book**: a salience horizon of "706 sentences", an episode gap of 15 sentences, thresholds chosen while looking at War and Peace.
- **My own knowledge used as evidence.** My alias gold "Bezúkhov ~ Pierre" was wrong (he is Pierre's father until his death). The "should be" lines in the pins are mine.
- **Tested on five sentences I wrote.**
- **Boundary.** By the nexus cards khora perceives, janus relates and penelope voices. `native/chat` puts answering, identity work and reply text in khora.

## A. Boundary rules: where a thing may live

1. **The middle is blind.** Code that routes, answers, merges or finds voids may read only the middle's types (referent, event and roles, identity edge, void, act, address, cell). It may not read a token, a word class, a feature string, a pixel or a sample. This is checkable: a ratchet on text-only field reads in the reasoning layer, like the regex ratchet. Today 206; it may only go down; the target is 0.
2. **A reader declares itself.** Its address type (byte span, time range, region, syntax-tree path); its arrow (reading order, time, containment, definition before use, or none); which marks it can produce, measured; what its chrome is (headings, boilerplate, watermarks, silence, UI furniture: structure, never content); and its gaps. No reader for a medium or language is a typed gap that says so.
3. **A voice is gated by round trip, and prefers pointing.** In order: point at the evidence in its source (a quoted span, a frame range, a region: language-free); give the filler in its own form; give a structure (a small DAG, a table); compose language, only if re-reading it gives back the same event (measured at 85% on a fresh book for voice alternation). Never a free template.
4. **The system's own chrome is authored and says so.** Messages about the system's state (a typed gap, an acknowledgement) are strings in one table per language, keyed by state, marked as authored. They may state a system state, never content.
5. **Holon boundaries hold.** A chat is a thin composition of khora (read), janus (relate, rules, givers, merge gate) and penelope (voice, judge).

## B. Knowledge rules: what may count as known

6. **Three doors for a fact, and no fourth.** *Presented*: it is in the thread, in any medium, attributed to whoever presented it. *Given*: a giver with provenance and a validity time (a dictionary, Wikidata, the clock, a calculator). *Induced*: derived from presented material against a null (kinds, classes, a horizon). Every reply says which door. A language model's fourth door, what it happens to remember, does not exist here and is never imitated.
7. **The developer is not a giver.** I am a language model building a system that must not contain one, so my own knowledge of English, of the book and of the world is the likeliest contraband. It may enter only as a giver-backed prior, or as a filed opinion with a holder (janus `kinship.js` already has the slot: an opinion is never a fact and never counted as evidence). Never as constants in code, and never as gold.
8. **The conversation is itself read as events.** A message is an act with the same roles as any event: who presented, to whom, when, through which medium, what. Then deixis (I, you, here, now, this) binds to the act's participants and not to words; "you told me" is a recalled event; "are you sure?" is a question about an earlier act; memory is replaying acts; a persona is identity assertions about the system's own referent; and an instruction inside a presented document is something its author said, not a request to the system.
9. **Readers and binders list; a declared rule judges.** Outside clean text, perception is uncertain everywhere. A reader or binder emits candidates with their raw facts (janus `binding-evidence.mjs` picks nothing); a rule with a giver decides; the contested band travels to the reply. My cast picks silently and 64% of its cross-clause pronoun links are contested.
10. **Unknown is a shaped output.** A void names the open role, the kind it admits, its grain, and which giver could fill it. Givers and tools declare the void shapes they fill, and choosing one is matching shapes, never spotting a keyword: the clock fills "time of now"; a calculator fills "value of this expression", and the expression is read by the notation reader, not by a list of English operator words.

## C. Measurement rules

11. **Units of the middle only.** Events, mentions, referents, acts. No sentence, token, second or pixel in a rule or dial of the middle.
12. **Every number is derived or declared.** Derived from the material's own spread or a shuffled null; or a dial in one ledger, with its reason, logged with each act. Never tuned on the material it is reported on.
13. **Invariances are the tests.** Gold rarely exists, and an invariance needs none and is the same in every medium: the same content through two readers gives the same answer (a translation, speech and its transcript, a table and its prose); re-voicing the input does not change the answer; an unrelated addition does not change it; order changes it only where the reader's arrow matters; the reply re-reads to the same event; a restart and replay gives the same state. A derivation can be held to these; a sampled model cannot.
14. **Agreement across readers is measured per level, never assumed.** So far, between two text readers: sharing the aligned unit matched 13 of 16 names, participant order 9 of 16 (9 of 10 where it had evidence), role labels 7 of 16 (another session's test; not verified here); our decomposition put the role disagreement on parser faults (18 mentions). Across readers, trust participation and order before role labels. A feature of the middle counts as invariant only at the level where it beats a shifted-alignment null.
15. **A change is a hypothesis.** A falsifier, development on one material, one run on a different reader or material, negative results kept, stamps. Anything else is labelled exploratory.
16. **Done means**: it runs on two readers of different kinds or states the gap; it is measured on a fixed external giver where one exists; it is a declared capacity recorded on every act; and its number is in the baseline so a drop fails the gate.

## D. The loop: how we choose what to do

17. **A gap census chooses the work.** Collect real asks (the owner's are already in `~/.pharos/fold-demo`), run them, and group the typed gaps by what is missing: a reader, a binding, a giver, a rule, a voice. Work on the largest group. "All-purpose" is then a number: the share of asks whose void has a filler, per reader.
18. **Failure, pin, fix, close.** A failure becomes a pin with evidence. The fix goes to the layer that owns it, as data or a rule with a giver. The pin closes with its cause. Then the invariances, then a fresh reader, then canonical.

## How this differs from LLM prompting (hypotheses to test)

| | LLM prompting | here |
|---|---|---|
| where the "prompt" lives | in the data's own medium (text steering text) | in the middle's vocabulary: voids, rules, givers, identity assertions; never in a medium |
| the engineer's knowledge | flows in freely through the prompt | contraband without a giver (rule 7) |
| an example | steers the model | is a fixture or a pin |
| the reasoning shown | generated text about reasoning | the trace is the computation |
| uncertainty | a sampling temperature | the contested band and shaped voids |
| memory | a window of tokens | the fold, replayable from the log |
| injected instructions | a standing risk | attributed to their author by construction (rule 8) |
| a new medium | a new model | a new reader; the middle is untouched (the test of the design) |
| evaluation | reading outputs | invariances and external givers |

## What I do not know (open)

- Whether **roles** are reader-invariant at all. The kārakas have no cell of their own, and role labels were the weakest witness across two readers. The invariant middle may be participation plus cells, with roles relative to a reader.
- What an image's **arrow** is (containment? salience?), and what plays the part of a clause in audio or video.
- Whether a voice can be **derived** from its reader, or must be authored per language.
- How to keep the authored system strings (rule 4) from growing into templated content.

## First experiments under these rules (none run)

- **X1.** Add no features. Put the chat behind the existing medium-blind void (`question-void.js`, `void-shape.js`) and drive the ratchet from 206 toward 0.
- **X2.** A reader matrix with what exists today: English text, Russian or Spanish text, mathematical notation (`native/adapters/math`), and slate's video observations already in pharos (answer "what is in the shot?" by pointing at frame ranges). Count the gaps by kind.
- **X3.** The invariance suite (rule 13) on the chat.
- **X4.** The gap census (rule 17) over the asks already in the fold-demo log.
