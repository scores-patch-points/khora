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
import { IS_NODE, priorsHome } from "./prior-source.mjs";
import { assertPharos, recordRead } from "./pharos-gate.mjs";
import { presenceOptionsFor } from "../adapters/text/pronoun-registers.js";
import { PRONOUN_GUESS_DIALS } from "../adapters/text/pronoun-presence-chosen.js";
import { loadNamePrior, nonPersonalFromNames } from "../adapters/text/name-prior.js";
import { caseMarkedReaderFor } from "../adapters/text/case-marked-clauses.js";
import { genderPriorChainFor } from "../adapters/text/gender-chain.js";
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
// THE CANONICAL OPTIONS (2026-11-18): the readerOptions and the declension that make a read THE canonical read. They live in one place so that
// no door can read without them: readToWeft applies them here and reading.js::readDocument applies the same ones, so the two front doors give the same
// answer (native/tests/one-door.test.mjs proves it on a probe and fails when a door stops applying them). A caller's own readerOptions win.
export const canonicalReaderOptions = () => ({ pronounPresence: (stem) => presenceOptionsFor(stem), namePersonhood: namePersonhoodFor, caseMarked: caseMarkedReaderFor, caseProDrop: (stem) => (stem === "grc" ? "on" : "off"), pronounGuess: (stem) => (stem === "eng" ? PRONOUN_GUESS_DIALS : null), genderPrior: genderPriorChainFor });
export const canonicalDeclension = shippedDeclensionFor;
// THE NON-PERSONAL RULING IS A GIVER'S (adapters/text/non-personal.js: the lexicon pack + the time prior), passed as readerOptions.nonPersonalOf. Without it "he" and "she" may bind a place, a topic, an organisation: on 92 GUM documents
// 69% of the wrong bindings (21% of all bound) were exactly that (identity/novels NOVELS-RESULTS-ROUND10.md, the error diagnosis). A canonical read without the ruling says so, never runs silently without it.
export function noteMissingRuling(w, readerOptions = {}) {
  if (w && Array.isArray(w.pronounsPresence) && typeof readerOptions?.nonPersonalOf !== "function" && !w.presenceInputs?.nameRuling && !(w.gaps ?? []).some((g) => g?.gap === "pronoun_presence_no_nonpersonal_ruling"))
    (w.gaps ??= []).push({ gap: "pronoun_presence_no_nonpersonal_ruling", detail: "no non-personal ruling was given to this read (no lexicon giver): the pronoun rung may bind he/she to a place, a topic or an organisation; measured, about a fifth of what it binds" });
  return w;
}
// A READ WITH NO PRIORS IS NOT A READ (2026-11-18). Without the language's priors the reader used to return an entry with typed gaps (no_pos_prior, no_morphology ...) and empty rows, which looked like a reader that "cannot read".
// The canonical doors now REFUSE such a read under Node and say what is missing and where the priors were looked for. A caller who wants the degraded read says so: `allowDegraded: true` or KHORA_ALLOW_DEGRADED=1; a page (no Node) keeps the typed gaps.
const PRIMING_GAPS = ["no_pos_prior", "no_morphology", "no_punctuation_prior"];
export function assertPrimed(w, { allowDegraded = false } = {}) {
  if (allowDegraded || !IS_NODE || process.env.KHORA_ALLOW_DEGRADED === "1" || !w || w.skipped) return w;
  const missing = (w.gaps ?? []).map((g) => g?.gap ?? g).filter((g) => PRIMING_GAPS.includes(g));
  if (w.vocabulary?.grammarPrior === true || !missing.length) return w;
  const home = priorsHome();
  throw new Error(`khora read refused: the reader is not primed for language "${w.language?.stem ?? w.language ?? "?"}" (gaps: ${[...new Set(missing)].join(", ")}). Priors were looked for in ${home.dir ?? home.base ?? "(no directory)"}. Set KHORA_PRIORS_DIR to the janus priors folder (janus/priors), or pass { allowDegraded: true } / KHORA_ALLOW_DEGRADED=1 to read without them knowingly. See native/docs/THE-READING-PIPELINE.md.`);
}
export function readToWeft(text, { address, category = null, language = null, quality = true, aliases = [], abbreviations = null, priors = null, aliasReport = null, readerOptions = {}, declension = canonicalDeclension, allowDegraded = false, rowsOf = null, admitNominals = false, speakers = false } = {}) {
  assertPharos(); // khora works only through pharos: its rules are held there (pharos-gate.mjs)
  // the canonical read binds pronouns by presence with the class of the language the reader settles on (a function of the stem); readerOptions.pronounPresence: null turns it off, an object or function overrides
  const w = readWith(text, { declension, address, category, language, quality, aliases, abbreviations, priors, aliasReport, rowsOf, admitNominals, speakers, readerOptions: { ...canonicalReaderOptions(), ...readerOptions } });
  assertPrimed(w, { allowDegraded });
  noteMissingRuling(w, readerOptions);
  return recordRead(w, text, { door: "native/the-fold/read-process.mjs#readToWeft", allowDegraded }); // written into pharos, or refused (a capacity left out; pharos rules WRITES-TO-PHAROS, FULL-CAPACITY)
}
