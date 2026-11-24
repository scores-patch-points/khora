# Prompted, and audited

2026-11-23. The owner: "prove we can make the system respond differently by how it's prompted, and make that auditable. If we have it responding as Claude that should be observable and auditable." EXPLORATORY (fixtures written for this, one cached Claude prompt, one run).

`node eval/prompted/server.mjs` (port 4871) is the page; `node eval/prompted/audit.mjs` runs the experiment and prints the evidence; `--pins` writes the findings as pins; `node --test eval/prompted/audit.test.mjs` runs the five checks on the fixtures (about 30 s, most of it reading one prompt).

The system is the real chat (`native/chat`, not edited). A prompt is read into a persona; the persona answers questions about "you" from the prompt's own sentences. No model runs. Each reply carries an audit record (`PromptedTurn@1`, pharos kind `prompted-turn`, writer `prompt-audit`): the prompt's source and sha256, the span of the sentence the reply came from, `simulated: true, model: none`, the route and tools, and a replay command.

## Five checks, each of which can fail (first run)

| check | result |
|---|---|
| DIFFERENCE: the same question under different prompts | "Who are you?" gives 4 distinct replies over no prompt, Captain Salt, Ada and a Claude Sonnet 5.5 prompt from the persona cache ("I'm Claude Sonnet 5.5."); "What do you love?" 3 |
| INVARIANCE: questions a prompt cannot speak to | arithmetic, a greeting and "Who wrote Hamlet?" are identical under every prompt |
| DETERMINISM | 6 of 6 replays give identical bytes |
| CAUSE: remove the sentence the reply came from, run again from scratch | the reply changes under 3 of 3 prompts (identity), and for "What do you love?" |
| COVERAGE: where the prompt says it, did the system use it | **3 of 8** on the first run (the finding). After the chat's owner read the prompt about the persona (commit 51c7464), **8 of 8**: the loop closed (finding, pin, fix at the owning layer, re-measure) |

"As Claude" here means: answered from a Claude system prompt's words, and nothing else. The audit says the prompt (by sha256 and source), the span ("This iteration of Claude is Claude Sonnet 5.5.", bytes 132 to 178), and that no model ran.

## What the misses are (pins, owner of the persona route)

`persona-passive-made-by` ("You were made by X" is not used for "Who made you?"), `persona-modal-can` ("You can read maps" for "What can you do?"), `persona-love-voice` (voiced "Rum and treasure and and treasure."), `persona-love-ada` ("You love quiet reading rooms" missed while "You love rum and treasure" is found), `persona-fallback-quotes-label` (with the identity sentence removed the reply quotes the persona's label and the start of the prompt). The prompt's *behaviours* ("never use bullets", "be concise") are read and counted by the chat and nothing follows them: a prompt changes what the system SAYS ABOUT ITSELF, not yet how it behaves.

## Fixes, first slice (2026-11-23, "go")

- **Verb equivalence** (`native/organs/verb-equivalents.js`, tests, demo `node eval/prompted/verb-demo.mjs`): when the question's verb finds nothing in the fold, the fold's verbs are asked which of them say the same thing (the frozen embedder; the bar is the spread of random verb pairs, 0.84; the candidate must also have the question's verb among its three nearest). "Who made Claude?" now finds "Claude was created by Anthropic" (0.93), and the reverse. On 5 questions x 3 prompts: 3 of 15 answered with the question's own verb, 5 of 15 with the equivalent tried, and the verb that should find nothing ("killed") found nothing. "build" and "develop" are below the bar: recall is low and precision is the point.
- **What a prompt asks** (`native/organs/prompt-policy.js`, the page's button "What does this prompt ask of the system?"): the chat reads a prompt's rules and nothing follows them. They are now sorted with evidence, against a bar measured on sentences of an unrelated book (Alice, Zenodotus) and a margin so that a rule near two capacities is said to be ambiguous and not forced onto one. A fixture with plain rules sorts 4 of 4 correctly (names the source, keeps answers short: the system acts on; prose and not apologising: it can be checked against). The Claude Sonnet 5.5 prompt, 40 rules: it acts on 1, can be checked against 1, 19 are about two capacities at once (formatting and tone, which the embedder cannot tell apart), and 19 are about work this system does not do (safety, advice, referrals). Every one is listed in full with its character range. That is the honest reading of "as Claude" for a system with no model: a small part of Claude's prompt is something it can act on.
- **Left for the chat's owner** (sent): bind the prompt's "you" to the name when the fold is built; drop contained answer spans in the voice; a capability void for "what can you do"; a typed gap instead of the label quote. The coverage number to move is 3 of 8.

## What the page shows for each reply (2026-11-24)

The owner found the first card hard to read and asked for more disclosure and no suggested questions. The page has no preset question buttons now: you type the question. Under each reply a card in four parts says: (1) where the reply came from, the sentence highlighted in the prompt, with the whole prompt one click away; (2) how the system got there: that no model ran, the route, the persona it read, the sentences it quoted, what it cited, the tools; (3) whether that sentence is the cause: the reply with it and without it side by side; (4) the record written to pharos, the full sha256, and the replay command. Every cell of the experiment table opens the same card, and each of the five checks lists every case it ran.

A finding the policy view made visible: for the fixture "Ada with rules" it reads 4 rules, and the prompt has 5 ("Ada does not give medical advice." is not read as a rule). It is the pin `persona-behaviour-do-not-missed` in `audit.mjs`.
