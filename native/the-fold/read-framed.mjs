// the-fold/read-framed.mjs — THE CANONICAL READ, WITH ITS FRAMES: one door that reads a document and says, for every verb, who holds the words it sits in.
//
// It adds no reader. It calls the canonical front door (reading.js::readDocument, rows: true: the language decision, the priors, the cut, the cast, the UD parse, the clause tree, the pharos write) and then runs the ONE
// frames layer (adapters/text/frames-layer.js) over the entry's own parse rows, sentences and cast. The chat's ingest door (chat/ingest.mjs) calls the same layer, so the two doors cannot disagree about a frame except
// through the rows they were handed (native/tests/read-framed.test.mjs measures exactly that).
//
// THE LANGUAGE IS DECLARED, never defaulted: no `language` is a typed gap and no frames; a language the reader does not hold (it fell back to default priors) is a typed gap and no frames. A language with no quote table or
// no speech-verb prior says so and its frames are unknown (null), never narration.
//
// readFramed(text, { language, actPrior, ...readDocumentOptions }) -> the canonical entry + entry.frames = { schema: "Frames@1", lang, frames, speech, gaps, crossCheck }
import { readDocument } from "../reading.js";
import { frameVerbs } from "../adapters/text/frames-layer.js"; import { codecQuotes } from "../adapters/text/quote-frames.js";
import { speechVerbFromActPrior, loadActPrior } from "../adapters/text/speech-frames.js";
import { layerLedger } from "./reading-standard.mjs";

export const FRAMES_SCHEMA = "Frames@1";
const norm = (t) => String(t ?? "").split("\r\n").join("\n").split("\r").join("\n");

export async function readFramed(text, { language, actPrior, ablate = [], ...opts } = {}) {
  const T = norm(text);
  if (!language) { const entry = await readDocument(T, { rows: true, ...opts }); entry.frames = { schema: FRAMES_SCHEMA, lang: null, frames: [], speech: [], gaps: [{ gap: "language_not_declared", how: "pass language (a stem such as eng): the frames layer never reads a language it was not told" }], crossCheck: null }; entry.layers = layerLedger(entry, { ablate }); return entry; }
  const entry = await readDocument(T, { language, rows: true, ...opts }), stem = entry.language?.stem ?? null, held = (entry.gaps ?? []).map((g) => g.gap ?? g);
  const fail = (gap) => { entry.frames = { schema: FRAMES_SCHEMA, lang: stem, frames: [], speech: [], gaps: [gap], crossCheck: null }; entry.layers = layerLedger(entry, { stem, ablate }); return entry; };
  if (!stem || held.includes("unknown_language") || held.includes("language_default")) return fail({ gap: "language_not_held", declared: language, read_as: stem, how: "the reader fell back to default priors; frames are not read for a language it does not hold" });
  if (!Array.isArray(entry.parse) || !entry.parse.length) return fail({ gap: "no_parse_rows", how: "the language has no UD codec filed (reading.js::rowsOfFor): frames need rows" });
  // the canonical entry's sentence offsets are into the normalised text; if they do not line up the layer refuses rather than frame the wrong span
  const bad = entry.parse.filter((p) => T.slice(p.offset, p.offset + p.text.length) !== p.text).length;
  if (bad) return fail({ gap: "offsets_not_aligned", sentences: bad, of: entry.parse.length });
  const speech = ablate.includes("speech") ? { isSpeech: () => false, gap: { gap: "ablated:speech" } } : stem === "eng" ? speechVerbFromActPrior(actPrior === undefined ? loadActPrior() : actPrior) : { isSpeech: () => false, gap: { gap: "no_speech_verbs_for_language", lang: stem } };
  const sentences = entry.parse.map((p) => ({ order: p.order, offset: p.offset, rows: p.rows ?? [] }));
  const targets = entry.parse.flatMap((p) => (p.rows ?? []).filter((r) => r.upos === "VERB").map((r) => ({ order: p.order, row: r, form: r.form, kriya: String(r.lemma ?? r.form).toLowerCase() })));
  const names = [...new Set((entry.cast ?? []).flatMap((c) => [c.surface, ...(c.allSurfaces ?? [])]).filter(Boolean))];
  const cq = ablate.includes("quotes") ? null : codecQuotes(stem, T), out = frameVerbs({ text: T, sentences, targets, names, lang: stem, speech, ablate, quotes: cq?.table ?? null }), gaps = [...out.gaps]; if (speech.gap) gaps.push(speech.gap);
  const noTable = out.gaps.find((g) => g.gap === "no_quote_table");
  entry.frames = { schema: FRAMES_SCHEMA, lang: stem, frames: out.frames, speech: out.speech, gaps, ablate, quotes: cq ? { source: cq.source, differs: cq.differs, table: cq.table } : null, crossCheck: clauseTreeAgreement(entry, out.frames, speech) };
  entry.layers = layerLedger(entry, { stem, quotes: noTable ? { gap: "no_quote_table" } : {}, speech, ablate });
  return entry;
}

/**
 * An INDEPENDENT check of the speech layer against the canonical clause tree: a sentence the position rule calls reported speech (direct or indirect) should also hold, in the clause tree, a complement clause under a
 * speech verb. The two read the same text by different means (position over rows; the dependency attachment), and the tree is only as good as the parser: it sees the complement when the parser happened to attach it.
 * Returns counts, never a verdict: where they disagree is information about one of them.
 */
export function clauseTreeAgreement(entry, frames, speech) {
  if (!Array.isArray(entry.clauses) || !speech?.isSpeech) return { gap: "no_clause_tree", how: "the clause tree is English or case-marked only (read-quality.mjs)" };
  const byId = new Map(entry.clauses.map((c) => [c.id, c])), sentOf = (c) => String(c.id).split(".")[0];
  const treeSentences = new Set(entry.clauses.filter((c) => c.relation === "complement" && byId.get(c.parent) && speech.isSpeech(String(byId.get(c.parent).predicate?.lemma ?? "").toLowerCase())).map(sentOf));
  const layerSentences = new Set(frames.filter((f) => f.reported === true).map((f) => `s${f.order}`));
  const both = [...layerSentences].filter((s) => treeSentences.has(s)).length;
  return { reportedByLayer: layerSentences.size, speechComplementByTree: treeSentences.size, both, onlyLayer: layerSentences.size - both, onlyTree: treeSentences.size - both };
}
