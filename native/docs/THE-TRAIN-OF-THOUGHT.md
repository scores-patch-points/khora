# The train of thought: a loop, trails in the environment, and wording that varies

2026-11-23. The owner, in order: "think stigmergically"; "how does a human train of thinking work?"; "go"; "show testing in browser". EXPLORATORY: nothing here is preregistered, the questions are mine, and the demo's act layer is a stand-in.

## What was built (all new files, mine, uncommitted)

| file | what it is |
|---|---|
| `native/organs/train.js` | the loop: what they did next settles my last wording; what they are doing; the notebook first; not finding it sends the man to the shelf; check before saying; every step leaves a mark. Knows no language, source or corpus: the parts are handed in. |
| `native/organs/trail-store.mjs` | the shared environment over `kernel/stigmergy.js`: deposits, evaporation, alarms (veto), marks (the shared throttle), merged through one file so two sessions that never call each other read each other's marks. Every mark is also offered to the caller's log (`onMark`), so it can go to pharos. |
| `native/organs/void-hunt.js`, `hunt-sources.js` | the hunt, now with `trails`: a question settled before is tried first from the remembered page (the page named for the subject first), re-read, never trusted from memory; a Wikipedia refusal is left as a shared mark. |
| `native/organs/expression-library.js` (+ build) | the wording: 1,341 short phrases at least three different people typed in three genres (support channel, text messages, Singlish chat), equivalents by embedding neighbours, drawn by trail and seed, in the look of the message answered; what the person did next reinforces or turns down a wording. |
| `eval/train-demo/` | the browser demo (`node eval/train-demo/server.mjs`, port 4870) and its tests button. |

## What a trail is here

Head = what is being asked (`ask:direct:person:lethal weapon`) or what is being said (`say:you're welcome:any`); route = where it was settled (`Wikipedia|Lethal Weapon|Cast`) or which wording. A success deposits; strength evaporates (the kernel's constant is 7 days and is an e-folding time, not a half-life, which its name says it is not); an alarm forgets what the route had deposited; a scout (10%, the kernel's rate) sometimes tries a route or wording never used. The seed makes the draw replayable.

## Measured (EXPLORATORY, live Wikipedia, my questions)

- A question asked twice: the first hunt makes 4 to 7 calls, the second from the trail makes 2 (the remembered page, and the search is skipped). The in-memory page cache makes the second also fast; the saving in calls is the claim, not the time.
- 56 organ tests pass (void-hunt 22, puzzle-reader, epistemic-core, expression-library, trail-store, train).
- Wording: the same intent draws different wordings across seeds, never one used last turn, and a wording the person turned down does not return in that thread but does in another.

## What it does not do, said plainly

- **The equivalents are near-synonyms, not functions.** "hello" gives hello there / hi / hey; "I don't know" gives no idea / I dunno / not sure. "you're welcome" does not reach "np" or "no problem": that is a function, said after thanks, and the corpus reply pairs that would show it were too few (3,240 pairs, 15 formulae after the filters). Some neighbours are wrong in their channel's sense ("exit", "quit" near "goodbye") and corpus misspellings that three people typed ("your welcome") are phrases to the inventory.
- **Reinforcement needs a real person.** The rule for "did it land" (they said the same thing again, or only "?") is structural and crude; a person who thanks twice is not unhappy.
- **No analogies or genre idioms.** Short formulae are what chat corpora give; a genre's figurative idiom needs a corpus of that genre's longer talk.
- **The trail can drift** toward what it already follows (the army-ant mill the kernel's header warns about): found when the demo cited a sequel's page, and answered by trying the page named for the subject first. The kernel's scouts are the other guard.
- **The demo's act layer is eight lines standing in for the chat's.** Wiring is the chat's owner's: `makeTrain({ readAct, voidOf, notebook, hunt, check, library, trails })`.
