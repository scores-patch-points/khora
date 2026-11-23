# How we iterate (a proposal, for the owner to adopt or change)

2026-11-23. The owner, after watching the chat get hand-built: "we are inventing a new type of prompt engineering; I don't want you to hand-set this just for English talking about War and Peace; what are your ground rules; we need to discover how this works differently than LLM prompting."

This is my answer, written after auditing my own work against it. It is a proposal: nothing here is in `CLAUDE.md` until the owner says so.

## What I did that breaks the discipline (audited 2026-11-23)

- **English words in code.** `native/chat/thread.mjs`: `WH`, `WH_ANY` (who, what, when…), `OPS` and `FILLER` (the arithmetic words), `SMALL` (hello, thanks, bye, with English replies), the help and "sure" tests, the time words (day, time, date), the alias `"u"`, `t.endsWith("?")`. `native/chat/engine.mjs`: `WH`, `WH_KARAKA` (where → locus…), `PREP` and `SAME_WORD` (the English words on the DAG's arrows). Every reply sentence is an English template in code ("Noted.", "I haven't been told that.").
- **The reader is fixed to English.** `rowsOfFor("eng")` is hard-wired in the thread, the engine and the personas. A Spanish message is read the English way and nothing says so (rule 8). Run today: "Hola." is stored as a fact; "¿Quién le dio un libro a Jonathan?" returns an empty "."; arithmetic and the clock fail in Spanish.
- **Numbers.** Declared with a reason but not derived: the title share 0.1, `TITLE_RECUR` 2, `HORIZON_PCT` 0.9 (derived from the text's own gaps, but the 90th percentile is declared), `KIND_MIN_MENTIONS` 20, G² ≥ 3.84, GAP 15 sentences, smoothing 4, 2.5 standard deviations, k = 3 neighbours, blocks of 150. None was tuned on a fresh text, but all were chosen while looking at War and Peace.
- **Evidence.** The chat was tested on five sentences I wrote. The identity experiments ran on one book plus one fresh run of 9 names. That is a demo, not evidence.

## Ground rules

1. **Marks, not words.** Code decides from the reader's marks: UPOS, FEATS (`PronType=Int` is a question word, `Mood=Imp` or a bare infinitive is a request, `NUM`, `INTJ`), the dependency relation, the kāraka label, the referent's kind. A word may appear in code only as **data keyed by language** with a named giver, loaded by the prior door (a language's closed classes come from its treebank lexicon, not from me).
2. **Language is a parameter, never a default.** Every path takes the stem from the detector. No prior for the language means a typed gap that says so; the system never falls back to English. Reply sentences are a per-language realization prior; English is one entry.
3. **Every number has a reason.** Derived from the data's own spread or a shuffled null, or declared in one named dials file with its reason and written to pharos with each act. None is tuned on the text it is reported on.
4. **A change is a hypothesis with a falsifier and a split.** Develop on one text; run once on a different text (another book, another language); keep the negative results; stamp them. Five sentences are not evidence.
5. **Fix at the layer that owns the failure.** Reader, binding (the cast), giver, rule, or void. Never patch the chat. A failure becomes a pin with evidence first (`eval/identity-reid/PINS.md`); the fix is data or a rule with a giver; the pin is closed with its cause.
6. **A reply is a derivation.** It names the marks, givers and rules it used (the trace). No derivation, no reply: a typed gap that says what is missing and which giver would fill it.
7. **Unknown is an output.** Gaps are first-class and actionable, never smoothed over.
8. **One door, no LLM, embeddings only as a frozen codec** (model and digest named in the record), everything written to pharos, the baseline guard on every reading-critical file.
9. **Measure on a fixed external giver where one exists** (the CorefUD scorer, the UD evaluation script); otherwise a falsifier. Quote the split and the stamp.
10. **A capability is not done until it runs on two languages** (or states the gap) with the same code and different priors.

## How this should differ from LLM prompting (hypotheses to test, not conclusions)

| | LLM prompting | this |
|---|---|---|
| the thing you change | instruction text | a prior, a rule or a giver (data with provenance), and pins |
| behaviour | emergent and sampled | derived, deterministic, replayable from pharos |
| a failure looks like | plausible wrong text | a typed gap, or a wrong binding with its evidence |
| generalization | from training | by construction: marks are language-independent, language lives in priors |
| evaluation | reading outputs | an external giver, a falsifier, a baseline guard |
| "system prompt" | text | the visible declared rules and the persona's identity assertions |
| "context window" | tokens | the fold and its horizon |
| "temperature" | a sampling dial | the contested band and the gaps |
| "hallucination" | the default failure | not possible by construction; a wrong binding is, and is pinned |

## What to discover (experiments, none run)

- **E1, the language × text matrix.** Replace the router's word lists with marks and per-language priors; run the same code on English, Spanish and Russian; count what breaks. The first run (Spanish, today) already breaks five of six.
- **E2.** Which closed classes can be derived from a treebank lexicon (WH words, greetings, operators, the days) and which need a giver of their own.
- **E3.** Does the pin → fix loop converge: do pins close without regressions on the matrix.
- **E4.** How much of "all-purpose" comes from tools and how much from reading; where each stops.
- **E5.** Sensitivity of the declared dials: which ones change what is reported.

## Proposed first step

Do E1 before any new feature: marks for the router, a per-language prior file for the closed classes and the reply templates, the stem from the detector, and a test that runs the chat on at least two languages. Then continue the features (yes/no questions, follow-ups, memory across restarts) under these rules.
