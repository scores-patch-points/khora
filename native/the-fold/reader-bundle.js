// reader-bundle.js — the engine's OWN relation-reader bundle, built from
// native organs and native priors (ONE-ENGINE-PLAN: the-fold's browser
// chat must not need to assemble this; the engine already has every piece).
//
// This is the same RELATION_READER_OPTIONS the-fold's app.js builds at
// app.js:915, but sourced entirely from this repo's native/ tree — the
// fold's version reaches into `/engine-v7` for the same files, so there is
// exactly one implementation of "the material's own edges" once this is
// what the proxy turn feeds its reading surface from. Priors come from
// native/priors/ (pos-eng.json, morphology-eng.json) and the fold's
// committed fixtures (unimorph-morphology-prior.json), read once and
// cached — the same data-gated posture app.js uses (exact match until the
// prior resolves; byte-identical to a bare reader when a file is missing).
//
// ONE CORE (2026-10-24): the assembly itself now lives in read-core.mjs, which every surface (this Node loader, the Holodeck's page,
// the canonical read) shares; this file keeps its exports and its byte-identical English reader for the callers that build on it
// (swarm-server, proxy-runner, cli/reason, the claim-frame tests). What it still adds: the English priors read once, the fold's
// UniMorph fixture beside them, and the English closed classes for every language it is asked in, exactly as before.
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildPriors, makeReader, relationsFor, closedClassesFor } from "./read-core.mjs";
import { priorJson, readJsonAt } from "./prior-source.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Received priors, loaded once, never re-read per turn — through the one prior door (prior-source.mjs: janus/priors). `posPrior`
// gates the relation vocabulary at the TYPE level; `morph`/`verbForms` widen verb identity to the same act (took→take). Data-gated:
// absent files leave the reader bare (exact-match only).
let _cache = null;
function loadPriors() {
  if (_cache) return _cache;
  _cache = buildPriors({
    stem: "eng",
    pos: priorJson("pos-eng.json"),
    // the received class lexicon (POSLexicon@1); classifyWord consults it only where the treebank has no entry
    posLexicon: priorJson("pos-eng-lexicon.json"),
    morphology: priorJson("morphology-eng.json"),
    unimorph: readJsonAt(path.join(HERE, "..", "eval", "the-fold", "fixtures"), "unimorph-morphology-prior.json"),
  });
  return _cache;
}

/** The engine's own relation reader — `reader(list)` → the reader `read(answer)` returns per-sentence claims with verdicts and
 *  addresses. `extra.language` picks the GFP dispatch (grc/sa/la read through the case-marked leg); the English priors and closed
 *  classes stand for every language here, as they always have — read-core.mjs::readWith is the per-language read. `extra.priors`
 *  and `extra.abbreviations` are passed to the core; every other key reaches makeRelationReader. */
export function makeEngineRelationReader(extra = {}) {
  const { language = "eng", priors = null, abbreviations = null, ...rest } = extra;
  return makeReader({ priors: priors ?? loadPriors(), language, abbreviations, closedClasses: closedClassesFor("eng"), ...rest });
}

/** The same cached posPrior loadPriors() builds -- exported so other modules
 * (e.g. organs/received-vocabulary-relations.js's propositionSpans-based
 * synthesis) can reuse the one real load instead of re-reading pos-eng.json. */
export function getPosPrior() {
  return loadPriors().posPrior;
}

/** A fresh reader over a list of passages (chunk-shaped or surfaced segments), read whole through the material's own ear (the
 *  declared language, else the one its words attest; English and undetected material read through no ear). */
export function engineRelationsFor(list, extra = {}) {
  return relationsFor(list, { reader: makeEngineRelationReader(extra), language: extra.language ?? null }).report;
}
