// the-fold/session-read.js — THE SESSION'S READING, on the canonical reader.
//
// The proxy's session used to accumulate its reading through the 6.1 host
// (corpus-session.js: createSession → admitChunked → sessionReferents/
// sessionRelations — the assembly native/docs/THE-READING-PIPELINE.md names as
// superseded). This is the same session-scoped store — a Map of sourceId → the
// document's reading — built on the CANONICAL reader, read-process.mjs::
// readToWeft (one document, WHOLE, in order, PRIMED from native/priors). Same
// surface the proxy consumed: `documents` (a Map) and `{deduped}` from admit.
// khora reads; nothing here chunks, and nothing re-normalises a second way.
import {createHash} from "node:crypto";
import {readToWeft} from "./read-process.mjs";

const hashOf = (s) => createHash("sha256").update(String(s)).digest("hex").slice(0, 16);

export function createSessionRead() {
  return {schema: "EOSessionRead@1", reader: "read-process.mjs::readToWeft", documents: new Map(), hashes: new Map()};
}

/** Admit one source's text into the session's reading. Deduped by (sourceId, text). */
export function admitText(session, {text, sourceId} = {}) {
  if (!text || !sourceId) return {deduped: false, admitted: null};
  const h = hashOf(`${sourceId}\u0000${text}`);
  if (session.hashes.get(sourceId) === h) return {deduped: true, admitted: session.documents.get(sourceId) ?? null};
  const w = readToWeft(String(text), {address: sourceId});
  const doc = {sourceId, text: String(text), cast: w.cast ?? [], edges: w.edges ?? [], surprise: w.surprise ?? null, vocabulary: w.vocabulary ?? null, readAt: new Date().toISOString()};
  session.documents.set(sourceId, doc);
  session.hashes.set(sourceId, h);
  return {deduped: false, admitted: doc};
}

/** The session's cast — the admitted beings across every source read this session. */
export function sessionCast(session) {
  const byRef = new Map();
  for (const doc of session.documents.values()) for (const c of doc.cast ?? []) {
    const k = c.surface ?? c.ref;
    if (!byRef.has(k)) byRef.set(k, {surface: k, sources: new Set(), mentions: 0});
    const row = byRef.get(k); row.sources.add(doc.sourceId); row.mentions += c.mentionsAt?.length ?? 0;
  }
  return [...byRef.values()].map((r) => ({surface: r.surface, sources: [...r.sources], mentions: r.mentions}));
}

/** The session's edges — the addressed relations across every source read this session. */
export function sessionEdges(session) {
  const out = [];
  for (const doc of session.documents.values()) for (const e of doc.edges ?? []) out.push({sourceId: doc.sourceId, end1: e.end1Face ?? e.end1 ?? null, label: e.label ?? null, end2: e.end2Face ?? e.end2 ?? null, refs: e.refs ?? null, spans: e.spans ?? null});
  return out;
}
