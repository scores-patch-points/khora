# The Isthmus — every material crosses at one narrow place

**Standing: charter, ratified by the person 2026-10-26.** Owner: **Chomsky**. Enforcement arm: **Greenberg**
(`native/organs/greenberg.js`, shapes 5 and 6). It is a reading of the code, and where they disagree the code wins.
It names a law the repo already states in pieces. `the-fold/language-grammar.js:1-3`, `docs/CALLIMACHUS-SHAPE.md:11`,
`organs/claim-realize.js:8` and janus `native/organs/nl-eot.mjs:1-12` each state part of it.
`docs/THE-READING-PIPELINE.md:36-39` states the typed-gap half. This document names the whole and says where the
code does not yet keep it.

## The name, and the words

```
material ──decode──▶ EOT ──reason──▶ EOT ──encode──▶ material
          (its codec)                     (the target's codec)
```

- **The Isthmus** is the whole round trip and the law that it is the only crossing. Every language and every modality
  crosses at the same narrow neck, and no language is the hub. "Pivot" is retired for this use. In this repo and in
  penelope it already means an English hub: `PIVOT = "eng"` (`eval/the-fold/scene/omnilingual-concepts.mjs:34`),
  and "a pivot is not the core" (penelope `GLAUCA-EOT.md:2360`). That is exactly what the Isthmus refuses.
- **Codec** is what was called the "specific grammar": the per-material pair that **decodes** a material into EOT and
  **encodes** EOT back out. For a language the codec is its UD grammar: `UDTokenizer@1` + `UDParser@1` in, and
  `UDGrammar@1` out (`scripts/train-ud-language.mjs`). Naming it a codec makes the law **omnimodal by construction**:
  anything that has a codec can become EOT, and so can be reasoned over with everything else. The modality adapters
  are codecs on the same footing:

  | material | decode (into EOT) | encode (out of EOT) |
  |---|---|---|
  | a language | `adapters/text/ud-tokenizer.js` + `ud-parser.js` → `kernel/eot-rich.js::toEot` | `kernel/eot-realize.js`, `UDGrammar@1` (janus `nl-eot.mjs::write`) |
  | the same, at clause and telling grain | `adapters/text/question-grammar.{en,es}.js` | `adapters/text/telling-grammar.{en,es}.js`, `organs/claim-realize.js` |
  | an image or screen | `adapters/image/screen-read.js` (pixels + Tesseract) | none yet |
  | code | `adapters/code/*` (`CodeLexPrior@1`, declaration frames) | none yet |
  | audio, video, midi, math | `adapters/{audio,video,midi,math}` | none yet |

  A codec is **declared, with a giver**, and it is per material, never per repo. Chomsky's posture
  (`kernel/eot-rich.js:1`, "deep structure is universal; each language is a projection") is that the codec is a
  projection and EOT is not anyone's language.
- **EOT** here means only the meaning layer (`EOTRich@1`: content nodes, cube-addressed relations and features,
  function words absorbed as markers, no word order, no surface form). The event log `OpenCodeEOT@1`
  (`opencode-eot.mjs`) is a different thing that shares the letters. It is disclosed here, not renamed.

## The law (five clauses)

1. **One crossing.** Material reaches reasoning only as EOT, decoded by *its* codec. Matching, deriving, licensing and
   contradiction happen in EOT, never on words and never on one language's parse.
2. **The material chooses the codec.** The codec is declared, or heard from the material. It is never chosen by a
   default in the code: `lang = "en"`, `?? "eng"`, or `language: "eng"` hard-wired at a call.
3. **No codec is a typed gap.** The gap vocabulary already exists in janus `nl-eot.mjs`: `no_grammar`,
   `tokenizer_absent`, `parser_absent`, `grammar_absent`, `no_marker`, `no_correspondence`, `form_unattested`. On
   the read side there are also `no_parser` (weft-rows `reading.js`), `unknown_language` and `language_default`
   (`read-core.mjs:305-306`). A gap is never filled by the English codec.
4. **One reader.** A surface that reads calls THE reader (`read-core.mjs::readDocument` / `readToWeft`). It never
   assembles a second cut, a second parse, or a second language decision (`THE-READING-PIPELINE.md:13`; the
   meaning-stage lesson below).
5. **Out through the target's codec.** What is said back is encoded by the target's codec (`eot-realize`,
   `telling-grammar.<lang>`). Copied source bytes are never translated. A model mouth may phrase what the encode
   produced (II.9), and its language instruction is a disclosure, not a codec.

## Why this was named now: the defect that shipped

- **Stage@1, the model-free reasoner** (`kernel/stage.js`, khora #57–#61). Its atoms came from `readAtoms`
  (`organs/read-atoms.js:32`, `lang = "en"`), with its own cut, its own parse call and its own coreference. That is a
  second reader under clause 4, with an English codec default under clause 2. Seven PRs of reader fixes landed on it.
  PR #66 (merged 2026-10-26) builds atoms from THE reader's own rows instead (`the-fold/weft-atoms.js`;
  655/664 texts in 5 languages read identical atoms). The eval drivers that use it still declare `language: "en"`,
  and no door asks for rows. Greenberg's shape 2 reported **0** on `read-atoms.js`, because
  it matched only `language == null … || "eng"`. Shape 5 now finds it (`greenberg.test.mjs`, real-material pin).
- **foldcode's mechanical-first resolver** (`packages/core/src/plugin/physics-mech.ts`, foldcode `register-door`,
  #11). It decides by English words under an ASCII `\b` (`EXPORTS`, `LISTISH`, `SAME`, `/\bwhat('s| is| was)\b/`),
  and it decides before khora's route, register and lane. It has no typed language gap. A symbol plus a path is
  served as a read-only lookup in any language and for any verb, edits included. Shape 6 reports 7 witnesses in the
  file.

## Where the code stands (latest GitHub, 2026-10-26)

khora `origin/main` 5a6fb208 (weft-rows #66 and #64 merged); janus 1ce40bd; penelope 644cfbc; holodeck 8803b10;
the-fold d10174e; foldcode `fold` b314d1e321.

| operation | decodes via its codec? | reasons in EOT? | encodes via target codec? | the breach |
|---|---|---|---|---|
| THE reader (`read-core.mjs`) | per-language priors and extractors; no UD parse on main | n/a (writes the weft, GFP rows) | n/a | `?? "eng"` default, disclosed as a `language_default` gap |
| THE reader, rows (`reading.js::rowsOfFor`, #66) | **yes**: UD per language, `no_parser` gap | — | — | opt-in; only eval drivers ask, all with `language: "en"` |
| Stage@1 / meaning layer | default still `readAtoms` (`lang="en"`); `ATOMS_VIA=weft` / `atomsOfPage` read the weft | yes (atoms) | n/a | eval-only; no door or lane calls it |
| janus `nl-eot.mjs` | **yes** | — | **yes** | imported by nothing; main has 5 parsers and 0 `ud-grammar-*` (the rest are untracked local files) |
| `eot-realize.js::realizeRecord` | — | — | yes | zero callers |
| conversation router | partly (8-language kind dictionary; English-only parse) | no | no | `opencode-route.mjs:64`: plain ASCII with nothing read is `en` |
| reason-gate mechanical lane | no (`arithmetic.js` `WORD_OPS`, puzzle parsers) | no | no | English word patterns; no language gap |
| register, gather, profile, research | no (surface regex) | no | no | Latin script passes as English; only non-Latin script is gapped |
| fact-gate | closed classes, 11 lenses | no | yes (lens templates) | `fact-gate.js:69` falls back to the English lens, against `fact-lenses.js:13` |
| Callimachus telling | en/es question grammar | yes (void, cells) | yes (en/es) | no door calls it |
| holodeck (the fold) | no | no | phrasebook (`holodeck-lang.js`), else LLM | `holodeck-reader.js:257` `foreign?.iso3 \|\| 'eng'`, with no live caller passing `foreign`: every source is read as English and labelled `declared` |
| the-fold | no (own mini-reader) | no | LLM, English prompt | never calls THE reader |
| penelope | no (own composed reader, `pos-eng`) | no | LLM | never calls THE reader, `eot-realize` or `nl-eot` |
| foldcode | delegates to the door | — | English notices | English regex fallback (`physics.ts`) takes over exactly when the door returns a typed gap; `physics-mech.ts` as above |

**The one sentence (2026-10-26, before the repairs below):** every piece of the Isthmus exists, and none is joined to a door. Decode is `rowsOfFor` and
`nl-eot.read`, reasoning is Stage@1, and encode is `eot-realize` and `nl-eot.write`. Every serving path crosses
somewhere else.

### Greenberg's census on the latest trees (witnesses, never verdicts)

`node native/organs/greenberg.js --summary <dir>`; test files skipped; vendored copies counted where present.

| tree | files | english_codec_default (param · fallback · literal) | english_word_pattern | old shape 2 |
|---|---|---|---|---|
| khora main (5a6fb208) | 1340 | 142 (59 · 39 · 44) | 697 | 5 |
| janus | 62 | 6 (0 · 0 · 6) | 2 | 0 |
| penelope | 92 | 0 | 16 | 0 |
| holodeck | 589 | 60 (27 · 24 · 9) | 422 | 2 |
| the-fold | 860 | 158 (56 · 38 · 64) | 551 | 2 |
| foldcode plugin | 79 | 0 | 17 | 0 |

The old shape 2 saw 8 of these across all trees. Sample precision on khora, read by hand: codec defaults 9 of 12
real once HTML `lang` attributes were excluded (now excluded); word patterns 10 of 12 English lexicon. The two misses
were UD deprel tags (`^(ccomp|csubj|xcomp)`) and Python builtins, which are a codec's own closed vocabulary. A
witness says where to look; S89's licensed case (an English-scoped mechanism, declared) is judged from the context
attached.

## Order of repair — what landed (2026-10-26) and what is owed

**Landed** (each measured; the numbers are in the PR and its RESULT files):
- **Decode joined to THE reader.** #66 put the UD rows on the entry. #71 made any language's codec readable, from the
  priors or this machine's codec cache, and a codec with no closed-class pack still decodes.
- **Codecs committed or pointed at** (janus #25). 78 codecs are committed under their treebank's licence. 17 are pointed
  at by repo, file and sha256, and vendored on the machine that uses them on first use (`codec_vendoring` meanwhile).
- **The mechanical lane reads a notation.** #68: digits and operator symbols are their own codec, in any language's
  sentence. An unsettled `mechanical` route is typed `no_codec`, and a failed engine load is disclosed. #73 earned the
  frame bound (7). **Its falsifying control fired:** a word count cannot separate an ask from a statement. #72: code
  outranks an unsettled computation.
- **English fallbacks that overrode a typed gap, removed:** fact-gate (#69: the lens is the heard language, and no lens
  is a gap), holodeck #28 (never declare English for a document), foldcode #17 and #18 (a symbol is not a question; the
  door's route and lane read the ask first, and #74 carries the lane's mood on the route).
- **The encode leg, in shadow** (#75). `organs/encode.js` says a fact through the target's codec, recorded beside the
  fact-gate's lens template on every turn. It agrees with the hand lens on the copula in eng, spa, fra, ita and hin.
  **It is wrong in rus, because the codec's own table tags *будет* `Tense=Pres`.**
- **One reader at the surfaces.** the-fold #41: the meaning ledger is read by the vendored read-core. penelope #9: the
  prose box on THE reader was **measured and not adopted**. It settles 16 units where the composed reader settles 1,
  but only 1 of the 4 the universe gate admits answers its question.

**Owed:**
1. **The ask's mood and role, read through its codec.** It now blocks two adoptions: the notation gate (an ask vs a
   statement) and penelope's box (which role the unit's question asks for). Pre-register it with #73's statements as its
   negative set and GL-UD-16's units as its positives.
2. **Per-language adoption of the encode leg**, pre-registered: agreement with the lens, plus a falsifying control per
   language. Russian is excluded until its table's present tense is checked.
3. **khora's language table** should file stems for the codecs it can now read (lij, auv…), so a declared language is not
   read as `declared-unknown` with English priors.

## Falsifying controls

- A serving path that reasons over a non-English material and returns a verdict with no codec in its trace (no UD
  rows, no `EOTRich@1`), or returns one where a typed gap was owed, breaks clause 1 or clause 3.
- The same claim in two languages that lands in different EOT cells after both decode cleanly breaks the
  "no hub" claim. It would mean a codec is projecting a language's surface into EOT.
- A material whose codec is declared, read with another language's codec while the entry says `declared`, breaks
  clause 2. This is holodeck's case today.
- Greenberg shape 5 or 6 passing on any of the shipped defects above (`read-atoms.js:32`, `english-parser.js`
  `toEot(…, { language: "eng" })`, `arithmetic.js` `/\bplus\b/`, foldcode `LISTISH`) breaks the enforcement arm.
  `greenberg.test.mjs` pins all four.

## Dissent and limits

- **"Codec" is a metaphor, not yet a schema.** No `Codec@1` record exists. A codec is today a family of priors with a
  giver. The image, code and audio "codecs" decode only, and none encodes.
- **EOT is English-shaped in places.** `eot-rich.js` says keeping "of" as a node is English-shaped. The no-hub claim
  is therefore a target that the second falsifying control measures, not a property already held.
- **Greenberg is lexical.** It cannot see a codec chosen by data flow (a variable holding `"eng"` set far away), and
  it cannot tell a declared English scope from a silent one. Both are left to the reader of the attached context, as
  its header has always said. It is not wired into CI, and the chorus script only suggests running it.
- **Lesson numbering.** Since #64/#66 merged, `CODING-LESSONS.md` carries two lessons 83 and two lessons 84 (lines
  2155/2213 and 2833/2861). The next free number is 113; renumbering is left to the lessons' author.
