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
import { presenceOptionsFor } from "../adapters/text/pronoun-registers.js";
import { loadNamePrior, nonPersonalFromNames } from "../adapters/text/name-prior.js";
import { caseMarkedReaderFor } from "../adapters/text/case-marked-clauses.js";
import { shippedDeclensionFor } from "../adapters/text/declension-shipped.js";

export const READ_PROCESS = Object.freeze({
  schema: "ReadProcess@1",
  reader: "native/the-fold/read-core.mjs::readWith (reader-bundle.js is its Node loader for the older callers)",
  primed: "janus/priors by name through prior-source.mjs (pos-<stem>, pos-<stem>-lexicon, morphology-<stem>, punctuation-<stem>) — grammarPrior === true proves it",
  unit: "one document, whole, in order (sentence-by-sentence inside the reader)",
  language: "declared, else heard from the text's own words, else English as the repo's default — recorded in `language`, never silent",
  abbreviations: "the language's measured punctuation prior + the text's own + the hyperlexicon's aliases (reading.js asks it); never a hand list",
  emits: "WeftEntry@4 (cast: the reader's own index with every mention's address; edges with refs/spans addresses; vocabulary; sentences; pronouns; surprise: the SEG+EVA cut; gaps)",
  supersedes: "the 6.1 legacy host (constitutional-read.mjs), any chunked read, and the second cast this module once read beside the reader",
  pronouns: "the presence rung (adapters/text/pronouns.js::resolvePronounsByPresence), ON by default, with the class of the language the read settles on (adapters/text/pronoun-registers.js::presenceOptionsFor): ENGLISH uses the built-in he/she class and the dials PRONOUN_PRESENCE_DEFAULT (window 4, boost 2, feed 1, floor 2, margin 0.3; about half the answerable pronouns bound at about 0.69 precision on unseen GUM documents, 0.49-0.5 on fiction); another language uses its measured register (adapters/text/pronoun-registers/<stem>.json or a pronoun-<stem>.json prior) and the same dials, unspaced scripts matched without a word boundary; a language with NO register gets the typed gap `pronoun_presence_no_register`. `pronounsPresence` on the entry. Off with readerOptions: { pronounPresence: null }. I, you, we, it, they and relatives are never bound here (docs: native/docs/PRONOUN-BINDING-STATUS.md)",
  constitutive: "coreferent resolution (the cast) and surprise (surprise-gate.mjs: SEG cuts where the ground was most wrong, EVA corroborates against the shuffled null) — the canonical cycle's two gates; neither is optional",
});

/** Read a source into a `WeftEntry@4`. The ONE reading call. Whole text in, edges out; a short source is a typed skip, a reader
 *  failure is a typed error — never silent. `language` null means heard from the text. `aliases` (the dotted forms the
 *  hyperlexicon resolved), `abbreviations`, `priors` and `aliasReport` pass straight to the core. */
// THE NAME RULING of the canonical read: a function of the language stem. English has the measured table (adapters/text/name-prior.js, built from UD English GUM train, identity/novels PREREG-ROUND14.md and
// NOVELS-RESULTS-ROUND14.md: precision 0.874 -> 0.911 on 66 unseen documents, coverage unchanged). Any other language has no table: null, and the typed gap stays.
const namePersonhoodFor = (stem) => { if (stem !== "eng") return null; const prior = loadNamePrior(); return prior ? ({ text, cast }) => nonPersonalFromNames({ text, cast, prior }) : null; };
export function readToWeft(text, { address, category = null, language = null, quality = true, aliases = [], abbreviations = null, priors = null, aliasReport = null, readerOptions = {}, declension = shippedDeclensionFor } = {}) {
  // the canonical read binds pronouns by presence with the class of the language the reader settles on (a function of the stem); readerOptions.pronounPresence: null turns it off, an object or function overrides
  const w = readWith(text, { declension, address, category, language, quality, aliases, abbreviations, priors, aliasReport, readerOptions: { pronounPresence: (stem) => presenceOptionsFor(stem), namePersonhood: namePersonhoodFor, caseMarked: caseMarkedReaderFor, caseProDrop: (stem) => (stem === "grc" ? "on" : "off"), ...readerOptions } });
  // THE NON-PERSONAL RULING IS A GIVER'S (adapters/text/non-personal.js: the lexicon pack + the time prior), passed as readerOptions.nonPersonalOf. Without it "he" and "she" may bind a place, a topic, an organisation: on 92 GUM documents
  // 69% of the wrong bindings (21% of all bound) were exactly that (identity/novels NOVELS-RESULTS-ROUND10.md, the error diagnosis). A canonical read without the ruling says so, never runs silently without it.
  if (w && Array.isArray(w.pronounsPresence) && typeof readerOptions?.nonPersonalOf !== "function" && !w.presenceInputs?.nameRuling)
    (w.gaps ??= []).push({ gap: "pronoun_presence_no_nonpersonal_ruling", detail: "no non-personal ruling was given to this read (no lexicon giver): the pronoun rung may bind he/she to a place, a topic or an organisation; measured, about a fifth of what it binds" });
  return w;
}
