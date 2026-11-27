# The ordered read, the kāraka holograph and the cast: where everything is

Written 2026-11-23 so another agent can find this work and carry it on. Read this before touching `reading-in-order.mjs`, `referents-in-order.mjs`, `karaka-total.mjs` or the panel.

## What was built, in order

1. **karaka-total** (`native/adapters/text/karaka-total.mjs`): every row gets one Pāṇinian label (`panini`) and its English name (`PANINI_LABELS`: agent, patient, instrument, recipient, source, locus, time, cause, purpose, …). One kāraka frame per action; coverage is measured.
2. **text-mereology** (`native/adapters/text/text-mereology.mjs`): document > paragraph > sentence > phrase > token, every part addressed in the source (`entry.mereology`).
3. **The ordered read** (`native/reading-in-order.mjs` + `.worker.mjs`): the cut, per-sentence trees on the performance cores, and the whole folded in reading order (the arrow of time). War and Peace takes 9.1 to 9.6 s against 1,751 s through the canonical door, with identical trees (exploratory, M3 Air).
4. **A name's pronoun from the grammar** (`native/adapters/text/gender-from-corpus.js`, the rows half): reflexives and possessives its own clause binds, read off FEATS, decided by an exact sign test. A capacity: `proform-agreement`.
5. **The cast in reading order** (`native/adapters/text/referents-in-order.mjs`):
   - names (one name, one being; titles from the text's own lower-case nouns; short forms go to the being already called by them);
   - noun phrases (an indefinite opens; a definite returns within the horizon; a possessed one is keyed by its possessor);
   - third-person pronouns across clauses (the most recent present being whose pronoun agrees);
   - identity ACROSS referents as typed edges, never merges (apposition, title, predicate, shared-name, same-head, possessor). `mergeBy(cast, types)` is one perspective's collapse.

   On War and Peace, 70.0% of the participants in the six kāraka roles are now referents, up from 9.7%.
6. **Everything writes to pharos**: `readInOrder` is refused up front without `allowDegraded`, and otherwise writes one degraded act entry plus the cast (`referent`, `identity`) in one `weaveMany` (`native/the-fold/pharos-gate.mjs`). The door weaves `proform` per being.

Numbers, with their splits and stamps, are in `eval/reading-baseline/CHANGES.md` (one note per change).

## Where the rest of the work lives (not all of it in git)

| What | Where | State |
|---|---|---|
| This work | branch `karaka-total`, PR scores-patch-points/khora#110 | pushed; merge to main pending |
| foldcode's fold chat and ask pipeline (`native/demo/`, `ask.mjs`, `wh-narrow`, `gap-fill`, `span-resolver`, form and row recovery, `sound-match`) | snapshot on branch `foldcode-ask`, PR scores-patch-points/khora#111 (draft); the live copy is **untracked** in the `khora-clone` checkout, where foldcode keeps writing (`coherence.js` is newer than the snapshot) | snapshot pushed; live copy uncommitted |
| foldcode's runtime record | `~/.pharos/fold-demo/khora-demo.jsonl`; chat at `http://localhost:4860` while running | local |
| The holograph panel (War and Peace reader + profile panel: `chat-server.mjs`, `read.html`) | `~/Downloads/workspace/holograph-viewer` | **not in any repository**; its home by boundary is scholia |
| The ordered read's log | `~/.pharos/khora/khora.jsonl` (kinds `act`, `referent`, `identity`) | local |
| The PR #111 wiring plan (the fold chat's questions, and the organ that answers each) | PR #111 description | on GitHub |

### Other agents' work this connects to (reported to the owner by those agents; not verified here)

- **foldcode's plan (2026-11-23)**, for the thread chat: (1) resolve the WHOLE proper-noun mention ("Donald Trump" is one name, not `donald` + `trump`) and admit a resolved referent only when it is a genuine being, never a title or office; (2) time-aware knowledge (the *current* officeholder, like the clock and the timezone); (3) entity fallback ("what did he do" falls back to the person's description when the fold holds no relation); (4) generation (imperatives, register, structure shapes, the recursive void); (5) omnimodal, EOT-native (move the void detector off the text parser onto the EOT arcs). Items (1) and (3) are what the cast and `propositionsOf` already give (a name referent is the whole mention; a description such as "the president" is a separate `nominal` referent and is never a cast name); (2), (4) and (5) are not in the cast and stay with foldcode.
- **eodb's deterministic chat** (`app/vendor/falsify.js`, `tools/bundle-falsify.mjs`, eodb commit `15196ab`): its judge `window.Falsify.falsifyAnswer`, called by the chat's `gradeAnswer`, now runs on the real 40-language Zenodotus priors. Open there: the bundle grew from 147 KB to 11.5 MB (the original design said the priors should load live, not bundled), and `restateClaimMessages` in the same file is an LLM prompt, which the zero-LLM direction removes.

### Identity (exploratory; the full numbers and the failures are in `eval/identity-reid/RESULTS.md`)

The owner's definition: two things are the same if the universe folded at two points, bounded by differences that make a difference, has the same shape of relationships between referents. Measured: relations to other referents re-identify a name across context (8× chance); what it does alone, much less; keeping only statistically significant features makes it worse (a negative result: what makes a difference is what recurs, not what is unusual); and the residual after the name's *kind* (kinds induced from role:verb channels: characters, aides, places) re-identifies best (top-1 83% on 29 names). Fold similarity alone confuses close associates for aliases; a cannot-link (two names that are arguments of one verb are two people) separates them. Kin facts bind both ends for 57% of kin mentions but about half are wrong; composing them (functional parents, derived siblings) is too sparse and noisy yet. Deal-breakers and dependencies (death, one father, one place at a time) are the owner's next layer and are not built.

## The owner's standing rules for this work

- Everything writes to pharos, and pipelines merge to main so no work is lost.
- When a piece works, make it canonical: put it in the door, make it a declared capacity recorded on every act, and put its measured numbers in the baseline so a drop fails the gate. "Works" means measured on the fixed giver (the CorefUD scorer for referents and pronouns), not by inspection.
- No regex, no LLM: language is read through the rows.
- Merging referents is question- and perspective-dependent: keep typed edges and collapse them per perspective.
- Identity is everything that makes a referent different from others, bounded by differences that make a difference (keyness against the ground, kept only when significant).
- Summaries are definitions (genus + differentia) reformatted from the book's own clauses, never stitched from counts ("not a ransom note").
- Chrome (headings, numbering, licence text) is structure, not content: never a referent, frame or paraphrase.
- The void for generation is the fold plus what comes next, cached on the thread's log at its current state.

## Direction (the owner's, 2026-11-23): zero LLM, one engine, foldcode too

- **Zero LLM in the pipeline.** Reading, asking, answering and voicing the answer are all mechanical, from the rows, the kāraka frames and the cast. `native/organs/mouth-repair.js` (gemma2:2b as a grammar fixer) and eodb's `restateClaimMessages` are the known model calls in the nexus; neither belongs in this pipeline and both are slated to go.
- **One engine, two faces.** The book panel and the thread chat (`native/demo/`, formerly foldcode's toy at :4860) run the same code: `native/chat/`. Everything either writes goes to pharos.
- **foldcode works this way too.** foldcode (the OpenCode fork, `scores-patch-points/foldcode`) is the coding agent; it should end up on the same engine: a thread is a fold, the void is read off the fold plus what comes next, every act is written to pharos, no model in the loop. **Recorded as direction only; none of it is done.** The nearest existing piece is `opencode-record.mjs nextVoid` ("a pure function of the record", code tasks only, recomputed on every call, nothing cached).

## Open, in order

1. Score the cast against gold (CorefUD scorer on LitBank and GUM) before it goes into the door; record the numbers in BASELINE.
2. Chrome: recognise headings and boilerplate from the trees (today "CHAPTER XI" is a referent), and use section boundaries as the scope for descriptions and pronouns.
3. Speaker and addressee referents for I/you/we (`speakers.js` exists): 14.2% of participants.
4. Surnames shared within a family should not link to one member without doubt ("old Prince Bolkónski" goes to Prince Andrew today); an epithet distinguishes.
5. Wire the fold chat's ask pipeline to the cast (PR #111 table); cache the thread's fold per turn.
6. Move the panel into a repository (scholia), and the definition lead into penelope's mouth once it is measured.
