// the-fold/read-door-canonical.mjs — THE BODY OF POST /v1/read, CANONICAL.
//
// The door openfold, the fold surface and heimdall all call serves the canonical
// reading pipeline: read-process.mjs::readToWeft (reader-bundle.js::
// engineRelationsFor, whole document, in order, primed from native/priors). This
// module is that door's body as a function a test can call without a server —
// the same convention read-door.mjs had for the 6.1 host, moved to the reader
// that superseded it (native/docs/THE-READING-PIPELINE.md).
//
// The WeftEntry@4 is served in the door's EORead@1 shape — referents ← the
// reader's admitted CAST (the beings), relations ← the addressed edges — plus
// the canonical fields (cast, edges, surprise, vocabulary, primed, readerScope).
// An undeclared language is null/unreported, NEVER a silent "en" (the defect the
// old door's own header names; found by the chorus, Greenberg).
import {readToWeft} from "./read-process.mjs";
import {splitSentences} from "../adapters/text/spans.js";

export const CANONICAL_READER = "read-process.mjs::readToWeft";
export const READER_SCOPE = "readToWeft reads with the English priors (pos-eng + morphology-eng) in this build; it does not switch ears per document";

const LANG_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/;

/** The canonical reading in the door's shape. Throws on a malformed language tag (a typed refusal). */
export function readCanonical(text, {name = "", language = null, category = null, maxCharacters = 60000} = {}) {
  if (!Number.isInteger(maxCharacters) || maxCharacters < 1 || maxCharacters > 1000000) throw new TypeError("maxCharacters must be an integer from 1 to 1000000");
  const declared = language ? String(language) : null;
  if (declared && !LANG_TAG.test(declared)) throw new TypeError(`unsupported language tag: ${declared}`);
  const t0 = Date.now();
  const doc = String(text ?? "").slice(0, maxCharacters);
  const w = readToWeft(doc, {address: name || "read", category, language: declared ?? undefined});
  return {
    schema: "EORead@1",
    reader: CANONICAL_READER,
    name: name || null,
    language: declared,
    languageSource: declared ? "declared" : "unreported",
    readerScope: READER_SCOPE,
    chars: doc.length,
    primed: w.vocabulary?.grammarPrior === true,
    sentences: splitSentences(doc),
    referents: (w.cast ?? []).map((c) => ({surfaces: c.allSurfaces?.length ? c.allSurfaces : [c.surface], routes: ["referent"], grain: null, mentions: c.mentionsAt?.length ?? 0, standing: c.standing ?? null})),
    relations: (w.edges ?? []).map((e) => ({participants: [{surface: e.end1Face ?? e.end1 ?? null}, {surface: e.end2Face ?? e.end2 ?? null}], relation: e.label ?? null, polarity: e.polarity ?? null, scope: {refs: e.refs ?? null, spans: e.spans ?? null}, assertion: e.assertion ?? null})),
    descriptorBeings: [],
    cast: w.cast ?? [],
    edges: w.edges ?? [],
    surprise: w.surprise ?? null,
    vocabulary: w.vocabulary ?? null,
    gaps: w.skipped ? [{reason: w.skipped}] : [],
    error: w.error ?? null,
    ms: Date.now() - t0,
  };
}
