# Merge state of khora, 2026-11-24 (written by the top session at the user's request: "see if there's work to finalize and merge")

Nothing here is a decision. Pushing and merging into `main` need the owner's fresh yes; a local commit of paths you can name does not.

## Where the branches are (checked with `git ls-remote`, not the local tracking ref, which is stale: the fetch refspec tracks only `main`)
- GitHub `chat-engine` = a6584f5: 118 commits ahead of `main`, 2 behind (PR #112). A trial merge in memory has **no conflicts**. PR #113 is open and mergeable.
- Local `chat-engine` = 208008d: one docs commit ahead of GitHub. The working tree of `khora-chat` has about 130 uncommitted entries from at least six sessions.
- `chat-engine-local` (93abf6c) and `formicary` (e000ad1) are also on GitHub; the first is now an ancestor of `chat-engine`.

## CI: why PR #113 is red, and why that is mostly one line
The only red check is `native-kernel` ("Native v7 kernel parity"). `main` is red on it too (every run since 11-23): 2 failing tests (`R1: with castIdentity absent or false...`, and a `# TODO PP attachment` test). `chat-engine` fails 41: those 2 plus 39 new. **38 of the 39 are one error:**
`ENOENT: /Users/mlacy/eo-lexical-analysis/output/phasepost_embeddings_3d.json`, thrown by `native/adapters/text/exemplar-pool.mjs` (hard-coded study paths on the owner's machine, lines 14-15), reached from `native/reading.js:107` (`sniffByExemplar` on every parse row, since d238357 on 2026-11-21). Any test that reads real text on a machine without that file throws. The tests that hit it: `void-hunt.test.mjs` (25), `puzzle-reader.test.mjs` (7), `convo-referents.test.mjs` (6). The 39th is a live-embedder test (`verb-equivalents`, "fetch failed"). Nexus rule 2: a missing prior is a typed gap, never a crash. The fix is in the sniffer's loader, not in 38 tests.

**The fix already exists: khora PR #114** (branch `smell-kernel-names`, one commit ccf2033 off `main`, opened by the ingestion session): the study directory is `EO_LEXICAL_ANALYSIS_DIR`, else `~/eo-lexical-analysis`, and a missing file is a typed gap (`smellStatus()` says `on: false` and why); the parse carries on without the smell. Tested on a clean checkout of `chat-engine` a6584f5 with ccf2033 cherry-picked and a study directory that does not exist: ENOENT mentions 0, convo-referents 6 of 6; the 38 ENOENT failures become 8 others (void-hunt 3, puzzle-reader 5) that the session could not tie to the missing file. A clean checkout of a6584f5 on this machine (default priors home, study files present) passes puzzle-reader, void-hunt and convo-referents at 42 of 43, so those 8 may be a priors-home or runner difference; only a CI run after #114 lands will say. #114 asks for a **merge commit** so ccf2033 stays reachable (the stamp on all 11,796 readings names it). Order: merge #114 into `main`, then PR #113's checks re-run on the merge with `main`. Nobody should write a second fix. **Merged 2026-11-25 02:51Z** on the owner's "Yes, merge #114" (to the top session), as a merge commit: `main` is d7b6410 (parents 1510d27 and ccf2033), ccf2033 is reachable from it. At merge time `native-kernel` failed only the two tests `main` already fails; `frankenstein` was still running, and it has ended "cancelled" at about 20 minutes on every `chat-engine` run since 11-23, so it is not a pass/fail signal. PR #113's own checks have not re-run since: a re-run of an old run reuses its old merge ref, so a new event (a push to `chat-engine`, or a reopen) is needed.

## The chat cannot start from a clean checkout of the working tree
`thread.mjs`, `doors.mjs` and `server.mjs` (all modified, uncommitted) import 23 files that are in no commit. Committing the three without them breaks the chat; GitHub's version loads them optionally. By each file's own header (claim yours or correct me):
- code session: `code-door`, `code-hunt`, `code-meaning`, `code-nl`, `code-route`, `code-shortlist`, `crispr`, `crispr-thoughts`, `request-void` (all `native/chat/`)
- improviser / intent: `delclose`, `program-env`, `plausible`, `witness`, `intent-satisfy`
- language gate / Spanish / codec on the fly: `language-place`, `voice`, `codec-hunt`, `karaka-attune`, `native/adapters/text/negation.js`
- improviser session (it answered: all four are its, with `delclose`, `plausible`, `witness`, `referent`, `intent-satisfy`, `program-env`, `office-holder` and its test, and `eval/delclose`, `eval/ylir-heads`, `eval/difference-demo`): `ylir-shelf`, `ylir-material`, `ylir-pairdocs`, `office-holder`. `ylir-material` reads the ingestion session's Ýlir-One door by `../../../Zenodotus/scripts/ylir-one.mjs` (env `YLIR_DOOR`) and returns null when it is absent, which is the clean-checkout case (that door is itself uncommitted in the local Zenodotus checkout and on no remote).
- the improviser session's small negation hunks are also in the working tree of three tracked files, `native/chat/engine.mjs`, `native/adapters/text/grammar-en.js` and `native/kernel/eot-claim-match.js`: they travel with its commit, not with the chat owner's.

## The order that works
1. Each session commits its own named paths locally (no push), tests in its own area passing.
2. The chat owner (top session) then commits `thread.mjs`, `doors.mjs`, `server.mjs` and `app.html` **together**, from a clean checkout where every import resolves, and runs the chat tests there. Each session commits only after the owner's own yes in that session: a relay between sessions is not that yes, and four sessions have said so.
3. CI fix for `exemplar-pool.mjs` goes first or alongside, on a branch off `main` so both `main` and `chat-engine` get it.
4. Only then does the owner choose: merge `chat-engine` into `main` (PR #113). After it, `eval/reading-baseline/record.mjs` must be re-run (both sides edit the baseline).

## Owner's (not any session's) to decide
Merge PR #113; the `formicary` fade exponent against PR #109; Ýlir-One index; whether `main`'s red `native-kernel` check is acceptable meanwhile.
