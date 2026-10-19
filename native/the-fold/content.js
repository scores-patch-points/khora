// the-fold/content.js — THE CONTENT PREDICATES (canonical home).
//
// `isContent` / `contentSignal` / `noiseOf` used to live only in read-door.mjs —
// the 6.1 legacy host's door (corpus-session.js: createSession → admitChunked →
// sessionReferents/sessionRelations), which the reading pipeline supersedes
// (native/docs/THE-READING-PIPELINE.md: the canonical reader is read-process.mjs
// ::readToWeft). A pure predicate is not a host: callers that only need "is this
// participant a content token" must not import the 6.1 assembly to get it.
// read-door.mjs re-exports these for back-compat; new callers import HERE.
//
// A relation's SIGNAL is the relations whose participant surfaces are ALL content
// tokens. Noise is propped on the/and/,/of. RAW signal is a size magnet (a big
// prior finds more relations by volume), so ear selection scores LIFT: signal
// divided by what the SAME ear predicts on a collocation-free control.

const CLOSED = new Set(["a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by", "from", "as", "is", "was", "were", "be", "been", "are", "he", "she", "it", "they", "his", "her", "its", "that", "this", "which", "who", "had", "has", "have", "not", "de", "la", "el", "los", "las", "y", "que", "il", "lo", "le", "les", "et", "der", "die", "das", "und", "o", "os", "as", "uma", "um", "e"]);
const PUNCT = /^[\p{P}\p{S}]+$/u;

/** A content token: non-empty, not a closed-class word, not pure punctuation. */
export const isContent = (s) => { const t = String(s ?? "").trim(); return t.length > 0 && !CLOSED.has(t.toLowerCase()) && !PUNCT.test(t); };

/** The SIGNAL of a read: relations whose participant surfaces are ALL content tokens. */
export const contentSignal = (relations = []) => relations.filter((rel) => { const parts = (rel.participants ?? []).map((p) => p.surface).filter((s) => s != null); return parts.length >= 2 && parts.every(isContent); }).length;

/** A DETERMINISTIC noise control: the same text with every token's letters re-shuffled, so token count, length and
 *  script are preserved but no collocation or lexica is. An ear's signal on THIS is what its prior predicts by chance. */
export function noiseOf(text) {
  return (String(text ?? "").match(/[\p{L}\p{M}]+|\p{P}+|\p{S}+|\s+/gu) ?? []).map((tok) => {
    if (!/^\p{L}/u.test(tok) || tok.length < 4) return tok;
    const seeded = (ch, i) => { let h = 5381; for (const c of tok) h = Math.imul(h, 33) ^ c.codePointAt(0); h = Math.imul(h, 33) ^ ch.codePointAt(0) ^ (i * 31); return h >>> 0; };
    return [...tok].map((ch, i) => [seeded(ch, i), ch]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])).map((x) => x[1]).join("");
  }).join("");
}
