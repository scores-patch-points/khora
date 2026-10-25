# The reading pipeline — which reader is "the reader"

**Standing: nomination.** A reading of the code; the code wins. Written 2026-10-07 after a run was found
**unprimed** (the legacy host pointed at a 6.1 prior path that no longer exists). This names the real,
native v7 reader, its priors, and what it does *not* run.

## One core, every surface (2026-10-24)

The relation reader is assembled in **one** place: `native/the-fold/read-core.mjs`. Every surface reads through it:

| surface | entry | how it gets its priors |
|---|---|---|
| a document into the weft (build-weft, read-corpus-batch, session-read, document-read) | `read-process.mjs::readToWeft` → `read-core.mjs::readWith` | the prior door |
| `POST /v1/read` (openfold, the fold surface, heimdall) | `read-door-canonical.mjs::readCanonical`, or `native/reading.js::readForDoor` with the hyperlexicon asked first | the prior door |
| proxy-runner, swarm-server, cli/reason, the claim-frame tests | `reader-bundle.js::engineRelationsFor` — the core with the English priors and closed classes, **byte-identical** to before (16 of 16 texts compared against main 49df4a51) | the prior door |
| a page (the Holodeck's reading demo and reader) | the vendored `read-core.mjs` itself | the prior door, preloaded by fetch |

**The prior door** — `the-fold/prior-source.mjs`. Every reading module asks it for a prior by name
(`priorJson("pos-eng.json")`); it is the only code that knows where the bytes are: `<root>/janus/priors` under Node
(`KHORA_PRIORS_DIR` overrides; a vendored tree with no janus beside it reads its own `native/priors`), the vendored
`native/priors/` by fetch in a page (`await preloadPriors(names)` once; `reading-rules.json` is preloaded at import because
three modules read it at their top level). language-grammar, langid, priors-home, read-quality, reading-rules and
reader-bundle read through it, so nothing in the reader's import graph imports `node:` statically
(`tests/reading-pipeline.test.js` walks the graph to prove it).

**What a read uses, per document:**

- **language** — declared, else heard from the text's own words (`language-context.js`), else English as the repo's default;
  the entry's `language` says which (`declared` / `heard` / `default`). A declared language reads with **its own** priors
  (`pos-<stem>`, `pos-<stem>-lexicon`, `morphology-<stem>`, `punctuation-<stem>`); a missing one is a typed gap, never the
  English prior applied to it (Greenberg). The English closed classes (`adapters/text/priors.js`) reach only an English read.
- **abbreviations** — the tokens that keep their period at the sentence cut: the language's **measured** punctuation prior
  (janus `priors/punctuation-<stem>.json`, built by janus `scripts/build-punctuation-priors.mjs` from corpora, never typed),
  the text's own (`spans.js::deriveAbbreviations`), and the **aliases the hyperlexicon resolved** for this text
  (`organs/lexicon.js`: "Messrs." is listed as a form of "Mr.", so the period belongs to the word). The hand-curated
  `lang/en.json` list is not used. The lookup is asynchronous and the read is not, so `native/reading.js::readDocument`
  asks first (the local English Wiktionary pack, `adapters/text/wiktionary-pack.js`; its absence is a typed gap) and hands
  the kept aliases to `readToWeft`.
- **one set of cuts** — the clause parser (`read-quality.mjs::nestedClauses`) parses inside the reader's own sentences,
  so the clause tree and the relations never disagree about where a sentence ends.

**What the entry carries that the reader saw** (WeftEntry@4, additive fields): `cast` — the reader's own referent index (the
ids its edges were resolved against), each being with `mentionsAt` (UTF-8 byte offsets, the weft's `<source>#<byteOffset>` unit) and `mentionSpans` (character spans); `heard` — the rows the index
holds only through the heard tier (common nouns are not beings, so they stay out of the weft's company); `sentences` with
offsets that read back in the caller's text; `pronouns` — every binding the resolver made, addressed and named; `language`,
`abbreviations`, `aliasReport`, and `gaps`. The door adds a `truncated` gap when `maxCharacters` cut the text.

**Not yet:** the hyperlexicon's L1 traversal (`janus` `openHyperlexicon`) needs the hyphae data, so on the Mac the giver is
the Wiktionary pack alone. The engine's pronoun resolver binds conservatively (on "Lincoln was shot in April. He died the next
morning." it reports `pronoun_no_candidate`); the entry now carries what it binds, and the resolver itself is unchanged.
The `cast`/`heard` split is the capital tier's, a cased-script test: a caseless script yields an empty cast (as before) and German
makes every capitalised noun a being (Faust, 20 KB: 443 beings) — disclosed, not solved.
Chunking: `relationsFor` hands the reader the document as `chunkSource` passages (paragraph runs) and the reader reads them
**together, in order** — the cast, the vocabulary and the sentence cuts are the whole document's. "Chunking a read is not
this pipeline" below means reading chunks as separate documents.

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
`notes-text.js`) and in `kernel/terrain-induction.js` — none are called by `engineRelationsFor` or
`createSessionReader`. So the real read yields **beings + addressed edges**, and kinds are a *separate*
projection — which is exactly the step the weft/ruliad work needs wired.

## The reading process — canonical (`native/the-fold/read-process.mjs`)

**One function, one way.** `readToWeft(text, {address, category, language, aliases}) → WeftEntry@4`. It calls
the core (`read-core.mjs::readWith`) **whole-document, in order, primed** (Sullivan's `native/priors`; proof:
`vocabulary.grammarPrior === true`), and returns edges with `refs`/`spans` addresses. Everything that reads into
the weft goes through it — no second reader, no second normalisation. `ReadProcess@1` is exported and names its
supersedes: **the 6.1 legacy host (`constitutional-read.mjs`) and any chunked read — both are not this.**

```
khora reads:  read-process.mjs::readToWeft  →  the weft (WeftEntry@4: cast, edges + addresses, sentences, pronouns)
janus folds:  weftAttestations / weftReferents@2  →  the field + kinds        (one-way; khora never imports janus)
```

Runners: `native/eval/weft/build-weft.mjs` (corpus, shardable, resumable) + `run-weft.sh` (supervised) +
`watch.mjs` (live). The wrong builders — chunked, legacy-host — are gone.

## The rule this review exists to enforce

Reading a document uses **`engineRelationsFor` (relations) + `createSessionReader` (the recursive reader
with the fold/log)**, with priors from `native/priors/`. The `constitutional-read.mjs` / legacy-host path
is the 6.1 baseline (unprimed here), kept for the spec's baseline and named as an assembly with a
`stagesNotRun` list — never reported as "the reader" (S1/P0). Chunking a read is not this pipeline.
