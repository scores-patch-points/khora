// the-fold/read-process.mjs — THE READING PROCESS (canonical). One way to read a source into the weft.
//
// THE READER IS THE REAL ONE — read-core.mjs (the assembly reader-bundle.js, the Holodeck's page and this call all
// share; reader-bundle.js::engineRelationsFor is its Node loader for proxy-runner, swarm-server and cli/reason),
// PRIMED from janus/priors (Sullivan: pos + morphology → `vocabulary.grammarPrior === true`). One document, WHOLE, in order. NOT the 6.1 legacy host
// (native/eval/constitutional-read.mjs — the baseline, unprimed here), NOT chunked. See
// native/docs/THE-READING-PIPELINE.md. khora reads; janus folds (`weftAttestations` / `weftReferents@2`), one-way.
//
// Everything that reads into the weft goes THROUGH `readToWeft` — no second reader, no second normalisation. Since 2026-10-24 the
// read itself is read-core.mjs::readWith (the one assembly every surface shares, Node and page alike); this module keeps the
// canonical call and its record of what the reading is.
import { readWith } from "./read-core.mjs";

export const READ_PROCESS = Object.freeze({
  schema: "ReadProcess@1",
  reader: "native/the-fold/read-core.mjs::readWith (reader-bundle.js is its Node loader for the older callers)",
  primed: "janus/priors by name through prior-source.mjs (pos-<stem>, pos-<stem>-lexicon, morphology-<stem>, punctuation-<stem>) — grammarPrior === true proves it",
  unit: "one document, whole, in order (sentence-by-sentence inside the reader)",
  language: "declared, else heard from the text's own words, else English as the repo's default — recorded in `language`, never silent",
  abbreviations: "the language's measured punctuation prior + the text's own + the hyperlexicon's aliases (reading.js asks it); never a hand list",
  emits: "WeftEntry@4 (cast: the reader's own index with every mention's address; edges with refs/spans addresses; vocabulary; sentences; pronouns; surprise: the SEG+EVA cut; gaps)",
  supersedes: "the 6.1 legacy host (constitutional-read.mjs), any chunked read, and the second cast this module once read beside the reader",
  constitutive: "coreferent resolution (the cast) and surprise (surprise-gate.mjs: SEG cuts where the ground was most wrong, EVA corroborates against the shuffled null) — the canonical cycle's two gates; neither is optional",
});

/** Read a source into a `WeftEntry@4`. The ONE reading call. Whole text in, edges out; a short source is a typed skip, a reader
 *  failure is a typed error — never silent. `language` null means heard from the text. `aliases` (the dotted forms the
 *  hyperlexicon resolved), `abbreviations`, `priors` and `aliasReport` pass straight to the core. */
export function readToWeft(text, { address, category = null, language = null, quality = true, aliases = [], abbreviations = null, priors = null, aliasReport = null } = {}) {
  return readWith(text, { address, category, language, quality, aliases, abbreviations, priors, aliasReport });
}
