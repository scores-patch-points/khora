// the-fold/read-process.mjs — THE READING PROCESS (canonical). One way to read a source into the weft.
//
// THE READER IS THE REAL ONE — `reader-bundle.js::engineRelationsFor` (the reading proxy-runner, swarm-server
// and cli/reason invoke; the reading the app uses), PRIMED from `native/priors` (Sullivan: pos-eng +
// morphology-eng → `vocabulary.grammarPrior === true`). One document, WHOLE, in order. NOT the 6.1 legacy host
// (native/eval/constitutional-read.mjs — the baseline, unprimed here), NOT chunked. See
// native/docs/THE-READING-PIPELINE.md. khora reads; janus folds (`weftAttestations` / `weftReferents@2`), one-way.
//
// Everything that reads into the weft goes THROUGH `readToWeft` — no second reader, no second normalisation.
import { engineRelationsFor } from "./reader-bundle.js";

export const READ_PROCESS = Object.freeze({
  schema: "ReadProcess@1",
  reader: "native/the-fold/reader-bundle.js::engineRelationsFor",
  primed: "native/priors (pos-eng.json, morphology-eng.json) — grammarPrior === true proves it",
  unit: "one document, whole, in order (sentence-by-sentence inside the reader)",
  emits: "WeftEntry@2 (edges with refs/spans addresses; vocabulary)",
  supersedes: "the 6.1 legacy host (constitutional-read.mjs) and any chunked read — both are not this",
});

const edge = (e) => ({ end1: e.end1, end1Face: e.end1Face ?? null, label: e.label, end2: e.end2, end2Face: e.end2Face ?? null, polarity: e.polarity ?? null, refs: e.refs ?? null, spans: e.spans ?? null, assertion: e.assertion ?? null });

/** Read a source into a `WeftEntry@2`. The ONE reading call. Whole text in, edges out; a short source is a
 *  typed skip, a reader failure is a typed error — never silent. */
export function readToWeft(text, { address, category = null } = {}) {
  const str = String(text ?? "");
  const bytes = Buffer.byteLength(str);
  if (str.trim().length < 200) return { schema: "WeftEntry@2", address, category, bytes, readCharacters: 0, skipped: "too_short", vocabulary: null, edges: [], error: null, ms: 0 };
  const t0 = Date.now();
  let out = null, err = null;
  try { out = engineRelationsFor([{ text: str }], {}); } catch (e) { err = String(e?.message ?? e); }
  return {
    schema: "WeftEntry@2", address, category, bytes,
    readCharacters: str.length,
    vocabulary: out?.vocabulary ?? null,                 // { verbs, candidates, grammarPrior } — primed proof
    edges: (out?.edges ?? []).map(edge),
    error: err, ms: Date.now() - t0,
  };
}
