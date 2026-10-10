# The reading pipeline — which reader is "the reader"

**Standing: nomination.** A reading of the code; the code wins. Written 2026-10-07 after a run was found
**unprimed** (the legacy host pointed at a 6.1 prior path that no longer exists). This names the real,
native v7 reader, its priors, and what it does *not* run.

## Two readers, and only one is real

| | the 6.1 baseline | **the v7 reader (real)** |
|---|---|---|
| runner | `native/eval/constitutional-read.mjs` | production: `proxy.mjs` `POST /v1/read`, `proxy-runner.mjs`, `swarm-server.mjs`, `cli/reason.mjs` |
| assembly | legacy host `native/legacy-ported/packages/host/corpus.js` (`createSession`/`admitChunked`/`sessionReferents`/`sessionRelations`) | native — `native/the-fold/reader-bundle.js` + `native/kernel/reading.js` |
| priors | declares `bin/priors/lang/en.json` — **does not exist** (6.1 layout) → **unprimed** | loads `native/priors/{pos-eng.json, morphology-eng.json, role-config-eng.json, parser-eng-ewt.json}` → **primed** |
| stages | 1–5a only (`stagesNotRun`: 5b, 6, 7, 8) | perceiver (void→being→fold) + relations |
| status | an assembly with a `stagesNotRun` list (S1 warning) | what the serving path calls |

## The real reader — two assemblies it composes

**A. The relation reader** — `native/the-fold/reader-bundle.js::engineRelationsFor(list, {language})`
(`:188`) → `makeEngineRelationReader` (`:110`) → `makeRelationReader` (`organs/hypergraph.js`) with
`relationExtractorsFor` in **GFP mode, clauseAware** (`:136-138`). Priors loaded once by `loadPriors()`
(`:53`): `pos-eng.json` (verb attestation), `morphology-eng.json` (+ `createLemmatizer`). The language leg
is `language-context.js` (the ear + capital◻caseless-nominal surfaces). **Consumers:** `proxy-runner.mjs:4074`,
`swarm-server.mjs:44`, `cli/reason.mjs:200`.

Returns (measured, *The Elements of Style*, 88 KB, 8.7 s):
```
{ examined: true,
  vocabulary: { verbs: 532, minSurfaces: 1, grammarPrior: true, candidates: 2534 },   ← primed (Sullivan)
  edges: [ { end1, label, end2, polarity, refs:["material#450-475"], spans:[{ref,start,end,text}],
             assertion:{standing, statements, verbSupport}, end1Face, end2Face } ],
  read, queryReferents }
```
Every edge carries an **address** (`refs`/`spans`) — the holograph's "every part points at the whole."

**B. The recursive session reader** — `proxy-runner.mjs::createSessionReader()` (`:2322`) →
`native/kernel/reading.js::createRecursiveReader` (`:79`). Its perceivers:
`createCausalTextPerceiver({ posPrior, roleConfig: role-config-eng.json, parseModel: parser-eng-ewt.json,
language:"eng", reprojectEvery })` **plus** `createEnglishParserPerceiver`. Driven by
`session.reader.step(encounter)` over `textEncounters(text, {source})` (`proxy-runner.admitWorkspaceEntries`).

**The reader core** (`reading.js`): per encounter — perceive → witness → hypergraph → fold; then
`log.push(encounter, …observations, …deltas)` (`:163`). **The log is the record; the fold is state**
(P159: the fold is the log's projection at a seq, reconstructed on demand — `:186` `get fold()`).
`getLog()` / `read()` / `restore(entries)` (replays `Encounter@1` to resume — a resumed reader is the same
instrument, `:191`).

## The priors (Sullivan)

`native/priors/` — **present**: `pos-eng.json`, `pos-en.json`, `morphology-eng.json`,
`role-config-eng.json` (UD EWT), `parser-eng-ewt.json`, `morph-cues-{en,en-pud,la,grc,ar,he,sa-ufal,sa-vedic}.json`,
`lang/{en,en-AAVE,eu,pcm}.json`. **Sullivan** (Annie Sullivan) is the morphology/tense witness: the
`morph-cues-*` priors + `clause-tense.js` + `sullivan-morph.mjs` (CHORUS-LOG 2026-09-25: *"Bring Annie
Sullivan in here"*). The legacy host did **not** load these; the native reader does.

## What the real reader does NOT run

**Stage 8, kind (jati/induceKinds), is not a read stage.** Kind induction lives in *organs*
(`kind-standing.js`, `heard-surfaces.js`, `company-index.js`, `barker.js`, `signal.js`, `parmenides.js`,
`notes-text.js`) and in `kernel/kind-induction.js` — none are called by `engineRelationsFor` or
`createSessionReader`. So the real read yields **beings + addressed edges**, and kinds are a *separate*
projection — which is exactly the step the weft/ruliad work needs wired.

## The reading process — canonical (`native/the-fold/read-process.mjs`)

**One function, one way.** `readToWeft(text, {address, category}) → WeftEntry@2`. It calls
`engineRelationsFor` **whole-document, in order, primed** (Sullivan's `native/priors`; proof:
`vocabulary.grammarPrior === true`), and returns edges with `refs`/`spans` addresses. Everything that reads into
the weft goes through it — no second reader, no second normalisation. `ReadProcess@1` is exported and names its
supersedes: **the 6.1 legacy host (`constitutional-read.mjs`) and any chunked read — both are not this.**

```
khora reads:  read-process.mjs::readToWeft  →  the weft (WeftEntry@2, edges + addresses)
janus folds:  weftAttestations / weftReferents@2  →  the field + kinds        (one-way; khora never imports janus)
```

Runners: `native/eval/weft/build-weft.mjs` (corpus, shardable, resumable) + `run-weft.sh` (supervised) +
`watch.mjs` (live). The wrong builders — chunked, legacy-host — are gone.

## The rule this review exists to enforce

Reading a document uses **`engineRelationsFor` (relations) + `createSessionReader` (the recursive reader
with the fold/log)**, with priors from `native/priors/`. The `constitutional-read.mjs` / legacy-host path
is the 6.1 baseline (unprimed here), kept for the spec's baseline and named as an assembly with a
`stagesNotRun` list — never reported as "the reader" (S1/P0). Chunking a read is not this pipeline.
