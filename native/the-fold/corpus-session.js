// the-fold/corpus-session.js — the canonical corpus session seam.
//
// Defect-001 resolution (2026-10-04): proxy-runner.mjs and proxy.mjs imported
// the stripped legacy host at native/legacy-ported/packages/host/corpus.js,
// which the canonical khora deliberately does not carry (migration Step 1.5:
// legacy-ported left behind). This module replaces that seam with the same API
// surface — createSession, admitChunked, sessionReferents, sessionRelations —
// built on the canonical native reader (adapters/text/recursive.js +
// kernel/reading.js) that the migration KEPT. Nothing is re-imported from
// legacy-ported; nothing is a stub. The referents and relations projected here
// come from the native perceiver's own observations, which is the same
// machinery the canonical reading pipeline runs.
//
// This is a RECONSTRUCTION of the seam, not a rename of the rejection: the
// falsifying control for defect-001 is that `import("./proxy-runner.mjs")`
// resolves, and that the seam produces referents/relations from the native
// reader rather than a hardcoded answer.

import { createHash } from "node:crypto";
import { splitSentences } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { grammarFor, detectLanguage } from "./language-grammar.js";

export const CORPUS_SESSION_SCHEMA = "CorpusSession@1";
export const CORPUS_SESSION_VERSION = 1;

const DEFAULT_SPAN_CAP = 4096;
const MIN_CHUNK_CHARS = 32;

export const stableHash = (value) =>
  createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex").slice(0, 20);

// ── createSession ───────────────────────────────────────────────────────────
// A session carries admitted documents (keyed by sourceId) and spans. The
// documents Map is the surface proxy-runner and proxy.mjs read; spans are
// kept so a caller that wants byte-anchored chunks has them.
export function createSession({ spanCap = DEFAULT_SPAN_CAP } = {}) {
  return {
    schema: CORPUS_SESSION_SCHEMA,
    version: CORPUS_SESSION_VERSION,
    documents: new Map(),
    spans: new Map(),
    spanCap,
  };
}

// ── admitChunked ────────────────────────────────────────────────────────────
// Admits material under a sourceId. Content-addressed dedup: re-admitting
// byte-identical text for the same sourceId is a no-op (reported as deduped),
// never an unbounded append. Returns { chunks, admitted, deduped } — the shape
// proxy-runner reads. Synchronous by construction (proxy-runner calls it
// without await).
export function admitChunked(session, { text, sourceId, language } = {}) {
  if (!text || !sourceId) return { chunks: 0, admitted: [] };
  const docId = sourceId;
  const admissionHash = stableHash({ sourceId, text });
  const existing = session.documents.get(docId);
  if (existing && existing.admissionHashes?.includes(admissionHash)) {
    return { chunks: existing.chunks.length, admitted: existing.chunks, deduped: true };
  }

  const sentences = splitSentences(text);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i];
    const chunkText = sentence.text.trim();
    if (chunkText.length < MIN_CHUNK_CHARS) continue;
    const byteStart = new TextEncoder().encode(text.slice(0, sentence.offset)).length;
    const textBytes = new TextEncoder().encode(chunkText).length;
    const spanId = `span:${stableHash({ sourceId, chunkText })}`;
    chunks.push({
      id: `${sourceId}:chunk-${i}`,
      span_id: spanId,
      source_id: `${sourceId}:chunk-${i}`,
      byte_start: byteStart,
      byte_end: byteStart + textBytes,
      text: chunkText,
      preview: chunkText.slice(0, 110),
      phrase: chunkText.slice(0, 60),
      chunk_index: i,
    });
    if (session.spans.size < session.spanCap) session.spans.set(spanId, chunks[chunks.length - 1]);
  }

  if (existing) {
    existing.chunks = existing.chunks.concat(chunks);
    existing.text = existing.text + text;
    existing.admissionHashes = (existing.admissionHashes ?? []).concat(admissionHash);
    if (language) existing.language = language;
    return { chunks: existing.chunks.length, admitted: existing.chunks };
  }

  const doc = {
    id: docId,
    path: sourceId,
    chunks,
    pieces: chunks.map((c) => ({ byteStart: c.byte_start, text: c.text, length: c.byte_end - c.byte_start })),
    text,
    language: language ?? null,
    admissionHashes: [admissionHash],
  };
  session.documents.set(docId, doc);
  return { chunks: chunks.length, admitted: chunks };
}

// ── the native read ─────────────────────────────────────────────────────────
// Runs the canonical perceiver over a document's chunks and returns the
// observations it produces. The perceiver is async-declared but contains no
// internal await, so the seam awaits it once here and projects synchronously
// downstream — the same reader the canonical pipeline uses.
async function readDocument(session, sourceId) {
  const doc = session.documents.get(sourceId);
  if (!doc) return null;
  // THE LANGUAGE LEG: a declared language, else the one the text's own words
  // attest (language-grammar.js — measured, never a silent default). Its
  // received POS prior, frame prior and proclitics go to the perceiver, so the
  // being tier hears nominals in any script instead of listening for capitals.
  // An undetected / ungrammared language is recorded on the document as a
  // typed gap and read with capitalisation alone — disclosed, not hidden.
  let grammar = doc.language ? grammarFor(doc.language, { text: doc.text }) : { language: null, gap: "no language declared" };
  if (!grammar.language) {
    const heard = detectLanguage(doc.text);
    grammar = heard.language ? { ...grammarFor(heard.language, { text: doc.text }), detected: heard } : { ...grammar, detected: heard };
  }
  doc.grammar = { language: grammar.language, gap: grammar.gap ?? null, detected: grammar.detected ?? null };
  const perceiver = createCausalTextPerceiver({
    ...(grammar.language ? { posPrior: grammar.posPrior, framePrior: grammar.framePrior, proclitics: grammar.proclitics, enclitics: grammar.enclitics } : {}),
    // refreshEvery: 1 is the perceiver's documented default (recursive.js:426):
    // batching at 25 is stale. The cast projection runs at the first content
    // refresh regardless (reprojectEveryFinal guard), so a short document is
    // never starved of a cast.
    reprojectEvery: null,
    language: grammar.language ?? doc.language ?? null,
  });
  const observations = [];
  // The canonical encounter generator feeds the perceiver every sentence —
  // including short ones that the storage chunker drops below MIN_CHUNK_CHARS.
  // The stored chunks gate what proxy-runner can cite; the perceiver reads the
  // whole document, exactly as the native pipeline would.
  for (const encounter of textEncounters(doc.text, { source: sourceId })) {
    observations.push(...(await perceiver.perceive(encounter)));
  }
  return observations;
}

function projectReferents(observations) {
  const byId = new Map();
  // ADDRESSABILITY (foundation, 2026-10-07). The reader already emits EOMention@1 (one per sighting,
  // carrying its encounter anchor) — the projection threw the anchor away, keeping only a mention COUNT.
  // That made the read un-auditable: a later (better) parser could not re-locate where a being was seen.
  // We now carry each mention's byte anchor through as `mentionsAt`, so the cast is addressable and the
  // reading is re-verifiable against the material (READING-SPEC span rule: a span that cannot show its
  // bytes cannot be self-verified). Pure preservation: no decision changes.
  const mentionsAt = new Map();
  for (const obs of observations) {
    for (const graph of obs?.candidate?.graphEntries ?? []) {
      if (graph?.schema === "EOMention@1" && graph.referent != null) {
        const addr = Number.isFinite(graph?.anchor?.start) ? graph.anchor.start : Number.isFinite(graph?.anchor?.at) ? graph.anchor.at : null;
        if (addr != null) { if (!mentionsAt.has(graph.referent)) mentionsAt.set(graph.referent, []); mentionsAt.get(graph.referent).push(addr); }
        continue;
      }
      if (graph?.schema !== "EOReferent@1") continue;
      if (!byId.has(graph.id)) byId.set(graph.id, { id: graph.id, surfaces: [], mentions: 0, standing: "established_by_evidence", fromPrior: false });
      const ref = byId.get(graph.id);
      for (const s of graph.surfaces ?? []) if (!ref.surfaces.includes(s)) ref.surfaces.push(s);
      ref.mentions += graph.mentions ?? 1;
    }
  }
  return [...byId.values()]
    .map((r) => ({
      ...r,
      display: [...r.surfaces].sort((a, b) => b.length - a.length)[0] ?? r.id,
      individuation: null,
      surfaces: [...r.surfaces],
      mentionsAt: [...new Set(mentionsAt.get(r.id) ?? [])].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.mentions - a.mentions);
}

function projectRelations(observations) {
  const edges = [];
  const seen = new Set();
  for (const obs of observations) {
    for (const edge of obs?.candidate?.hyperedges ?? []) {
      const key = `${edge.relation}|${(edge.participants ?? []).map((p) => p?.ref ?? p?.surface ?? "").join("|")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // ADDRESSABILITY (foundation, 2026-10-07). The edge already carries its ABSOLUTE byte address
      // (`scope.byteOffset`) and each participant carries its own STANDING (`referent` | `unresolved_surface`
      // | `hypothesis`) and `resolution` — the projection threw all of it away, so a relation end could not be
      // told resolved from unresolved and had no address. We preserve them (pure retention; the join is still
      // by ref/surface downstream, so nothing decides differently). This is what lets v2 ask "is this end a
      // cast referent?" without re-reading.
      edges.push({
        relation: edge.relation,
        scope: edge.scope ? { byteOffset: edge.scope.byteOffset ?? null, offset: edge.scope.offset ?? null } : null,
        participants: (edge.participants ?? []).map((p) => ({
          ref: p?.ref ?? p?.surface ?? null,
          surface: p?.surface ?? null,
          standing: p?.standing ?? null,
          resolution: p?.resolution ?? null,
          role: p?.role ?? null,
          ...(p?.occurrence ? { occurrence: p.occurrence } : {}),
          ...(p?.surfaceKey ? { surfaceKey: p.surfaceKey } : {}),
        })),
      });
    }
  }
  return edges;
}

// ── sessionReferents / sessionRelations ─────────────────────────────────────
// These are ASYNC (they await the native perceiver). proxy.mjs's reading door
// is async and calls them; a synchronous caller must await them. This is a
// deliberate contract change from the stripped host's sync projection: the
// values come from the native reader, which is the point of the seam.
export async function sessionReferents(session, { sourceId, priors = [], limit = 100 } = {}) {
  const doc = session.documents.get(sourceId);
  if (!doc) return { referents: [], gaps: [`unknown document ${sourceId}`] };
  const observations = await readDocument(session, sourceId);
  if (!observations) return { referents: [], gaps: [`no observations for ${sourceId}`] };
  let referents = projectReferents(observations);
  for (const prior of priors) {
    const id = prior.id || prior.name || `ref:${stableHash(prior)}`;
    const surfaces = (prior.surfaces || [prior.name]).filter(Boolean).map((s) => (typeof s === "string" ? s : s?.surface)).filter(Boolean);
    referents = [
      { id, display: prior.display || prior.name || id, surfaces, mentions: 0, fromPrior: true, individuation: prior.individuation ?? null },
      ...referents.filter((r) => !surfaces.some((s) => r.surfaces.includes(s))),
    ];
  }
  const kept = Number.isFinite(limit) ? referents.slice(0, limit) : referents;
  const gaps = kept.length < referents.length ? [{ reason: "cast_truncated", tier: "host", detail: `${referents.length} referents discovered, ${kept.length} returned (limit=${limit})` }] : [];
  return { referents: kept, gaps };
}

export async function sessionRelations(session, { sourceId } = {}) {
  const doc = session.documents.get(sourceId);
  if (!doc) return { relations: [], gaps: [`unknown document ${sourceId}`] };
  const observations = await readDocument(session, sourceId);
  if (!observations) return { relations: [], gaps: [`no observations for ${sourceId}`] };
  return { relations: projectRelations(observations), gaps: [] };
}

export const CORPUS_SESSION = {
  schema: CORPUS_SESSION_SCHEMA,
  version: CORPUS_SESSION_VERSION,
  seam: "the-fold/corpus-session.js",
  note: "canonical reconstruction of the stripped legacy host seam, backed by the native reader",
};