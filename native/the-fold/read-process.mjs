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
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents } from "../adapters/text/surfaces.js";
import { tokenEvents, surpriseCut } from "./surprise-gate.mjs";
import { applyPolarity, readGates, nestedClauses, scopePolarity } from "./read-quality.mjs";
import { admitReferent, referentFrame } from "../kernel/for-whom.js";

// EVERY REFERENT HAS A FOR-WHOM (S113/S42). A whole-document read is read FOR the
// reader — the frame a bare document read stands under is { giver: "the reader",
// question: null (no ask yet), ground: the address }. A caller may pass its own
// for-whom (a question-bearing frame); a caller that passes `null` explicitly gets
// the gate's refusal — the referents become typed gaps, never bare admits.
const READER_FRAME = (address) => ({ id: "reader", giver: "the reader", question: null, ground: address ?? null });

export const READ_PROCESS = Object.freeze({
  schema: "ReadProcess@1",
  reader: "native/the-fold/reader-bundle.js::engineRelationsFor",
  primed: "native/priors (pos-eng.json, morphology-eng.json) — grammarPrior === true proves it",
  unit: "one document, whole, in order (sentence-by-sentence inside the reader)",
  emits: "WeftEntry@4 (cast: the admitted referents; edges with refs/spans addresses; vocabulary; surprise: the SEG+EVA cut)",
  supersedes: "the 6.1 legacy host (constitutional-read.mjs) and any chunked read — both are not this",
  constitutive: "coreferent resolution (the cast) and surprise (surprise-gate.mjs: SEG cuts where the ground was most wrong, EVA corroborates against the shuffled null) — the canonical cycle's two gates; neither is optional",
});

const edge = (e) => ({ end1: e.end1, end1Face: e.end1Face ?? null, label: e.label, end2: e.end2, end2Face: e.end2Face ?? null, polarity: e.polarity ?? null, refs: e.refs ?? null, spans: e.spans ?? null, assertion: e.assertion ?? null });

/** Read a source into a `WeftEntry@4`. The ONE reading call. Whole text in, edges out; a short source is a
 *  typed skip, a reader failure is a typed error — never silent. */
export function readToWeft(text, { address, category = null, language = "en", quality = true, forWhom = READER_FRAME(address) } = {}) {
  const str = String(text ?? "");
  const bytes = Buffer.byteLength(str);
  if (str.trim().length < 200) return { schema: "WeftEntry@4", address, category, bytes, readCharacters: 0, skipped: "too_short", vocabulary: null, cast: [], castGaps: [], edges: [], surprise: null, error: null, ms: 0 };
  const t0 = Date.now();
  let out = null, err = null;
  try { out = engineRelationsFor([{ text: str }], {}); } catch (e) { err = String(e?.message ?? e); }
  // THE CAST — the reader's own admitted referents (the SAME organs the reader uses: extractSurfaces
  // + discoverReferents; a WeftEntry@2 dropped them, so `weftReferents` fell back to treating every
  // edge-end as a being and kind induction was judged on a polluted company graph — see
  // khora/native/eval/weft/treebank-seed.mjs + fold-plot-test/treebank-kinds-RESULTS.md). No new reading
  // rule: the beings are the engine's own, only persisted. `standing:"referent"` is the both-bound mark.
  let cast = [];
  let castGaps = [];
  try {
    const surfaces = extractSurfaces(splitSentences(str), {});
    const disc = discoverReferents(surfaces, {});
    const byRef = new Map();
    for (const ev of disc.events ?? []) {
      if (ev?.type !== "DEF.admit" || !ev.referent_id || !ev.surface) continue;
      const r = byRef.get(ev.referent_id) ?? { ref: ev.referent_id, surface: ev.surface, allSurfaces: new Set(), mentionsAt: [], standing: "referent" };
      r.allSurfaces.add(ev.surface); byRef.set(ev.referent_id, r);
    }
    // Every referent is admitted FOR the frame; a frameless one (forWhom === null)
    // is a typed gap, never a bare admit (S113/S42).
    for (const r of byRef.values()) {
      const base = { ref: r.ref, surface: r.surface, allSurfaces: [...r.allSurfaces], mentionsAt: r.mentionsAt, standing: "referent" };
      const adm = admitReferent(base, forWhom);
      if (adm.admitted) cast.push(adm.referent); else castGaps.push(adm.gap);
    }
  } catch (e) { if (!err) err = `cast_failed: ${String(e?.message ?? e)}`; }
  // SURPRISE — the canonical cycle's second constitutive gate (SEG+EVA), called
  // here so the read that feeds the weft carries it. The instrument is the
  // material's own token stream; the kernel's null is inside it (EVA), so a
  // document whose ground is never surprised reports figures: 0 and says so.
  let surprise = null;
  try { surprise = surpriseCut(tokenEvents(str)); }
  catch (e) { if (!err) err = `surprise_failed: ${String(e?.message ?? e)}`; }
  // THE QUALITY LAYER (read-quality.mjs — Sullivan's learned Polarity cues, scoped above the GFP record as Chomsky's
  // dispatch leaves room for; Champollion's per-read gates). The reader's polarity is the constant "+" (relations-gfp.js:190).
  // `quality: false` returns the reader's own edges untouched, so the layer can be A/B'd on the same bytes.
  let edges = (out?.edges ?? []).map(edge);
  let qualityReport = null;
  let clauses = null;
  if (quality !== false) {
    const applied = applyPolarity(edges, language);
    edges = applied.edges;
    qualityReport = { polarity: applied.report };
    // THE CLAUSE TREE: nested clauses kept as a tree, and each edge's polarity scoped to the clause that holds its ends
    const nested = nestedClauses(str, language);
    if (!nested.gap) {
      const sc = scopePolarity(edges, nested.clauses, language);
      edges = sc.edges; clauses = nested.clauses;
      qualityReport.polarity = { ...applied.report, scoped: sc.report };
      qualityReport.clauses = { sentences: nested.sentences, clauses: nested.clauses.length, nested: nested.clauses.filter((c) => c.parent).length, skippedLong: nested.skippedLong };
    } else qualityReport.clauses = { gap: nested.gap };
    qualityReport.gates = readGates({ edges, cast, text: str });
  }
  return {
    schema: "WeftEntry@4", address, category, bytes,
    readCharacters: str.length,
    vocabulary: out?.vocabulary ?? null,                 // { verbs, candidates, grammarPrior } — primed proof
    cast,                                                 // the admitted referents (both-bound; the kind-induction cast)
    castGaps,                                             // referents refused admission for lack of a frame (typed, never dropped silently)
    edges,
    clauses,                                              // the nested clause TREE (parent, relation, marker, own words, polarity) — null for a language with no parser
    quality: qualityReport,
    surprise,                                             // SurpriseCut@1 — where the reading's ground was most wrong, vs its shuffled null
    error: err, ms: Date.now() - t0,
  };
}
