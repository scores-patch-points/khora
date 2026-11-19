// speakers.js — speaker and addressee REFERENTS for I/you from quote structure (identity/novels/PREREG-ROUND30.md; THE REFERENT RULE in CLAUDE.md).
// A first-person pronoun inside a quotation is the speaker of that quotation; a second-person pronoun is its addressee. The speaker is a referent the read already admitted (a cast being named beside the quotation) or, when none is named, an anonymous referent of that quotation, so that
// every I and my inside one quotation is one referent and a later you in the reply is that same referent. Outside quotations a recurring first person is the narrator, one referent per text. Nothing here reads a name from a list; the structure is quotes, sentence-final punctuation and the cast's own spans.
// Typed gaps, never guesses: an unbalanced quotation, a quotation whose speaker is not named, a you with no previous quotation. An unnamed speaker stays anonymous.
const FIRST = /\b(?:I|me|my|mine|myself)\b|\bI(?=['’](?:m|ll|ve|d)\b)/g; const SECOND = /\b(?:you|your|yours|yourself|yourselves|thou|thee|thy)\b/gi;
export function quotesOf(text) {
  const out = []; let open = -1; for (let i = 0; i < text.length; i++) { const c = text[i];
    if (c === '"' || c === "“" || c === "”") { const opens = c === "“" || (c === '"' && open < 0); if (opens && open < 0) open = i; else if (open >= 0) { out.push({ open, close: i, inner: [open + 1, i] }); open = -1; } } }
  return out;
}
const SENT_END = /[.!?]/;
export function speakerReferents(text, entry) {
  const mentions = (entry?.cast ?? []).flatMap((c) => (c.mentionSpans ?? []).map(([a, b]) => ({ a, b, ref: c.ref }))).sort((x, y) => x.a - y.a); const qs = quotesOf(text); const out = []; const gaps = [];
  // the speaker of a quotation: the cast mention in the tag after the closing quote (up to the next quote or sentence end), else the one in the tag before the opening quote (back to the previous quote or sentence end)
  const speakerOf = (q, i) => { const nextOpen = qs[i + 1]?.open ?? text.length; let end = q.close + 1; while (end < nextOpen && !SENT_END.test(text[end])) end++; const after = mentions.find((m) => m.a > q.close && m.b <= end);
    if (after) return { ref: after.ref, via: "tag after" }; const prevClose = i > 0 ? qs[i - 1].close : -1; let start = q.open - 1; while (start > prevClose && !SENT_END.test(text[start])) start--; const before = [...mentions].reverse().find((m) => m.b <= q.open && m.a >= start); return before ? { ref: before.ref, via: "tag before" } : null; };
  const spk = qs.map((q, i) => { const s = speakerOf(q, i); return s ? { ...s, id: s.ref } : { ref: null, via: "anonymous", id: `anon:q${i}` }; });
  qs.forEach((q, i) => {
    const inner = text.slice(q.inner[0], q.inner[1]); if (inner.length > 1200) { gaps.push({ gap: "quotation_unbalanced", at: q.open }); return; }
    for (const m of inner.matchAll(FIRST)) out.push({ a: q.inner[0] + m.index, b: q.inner[0] + m.index + m[0].length, cl: spk[i].id, kind: "speaker", via: spk[i].via });
    const prev = i > 0 ? { q: qs[i - 1], s: spk[i - 1] } : null; const between = prev ? text.slice(prev.q.close + 1, q.open) : null; const adjacent = prev && (between.match(/[.!?]/g) ?? []).length <= 1 && !/\n\s*\n/.test(between);
    for (const m of inner.matchAll(SECOND)) { if (adjacent && prev.s.id !== spk[i].id) out.push({ a: q.inner[0] + m.index, b: q.inner[0] + m.index + m[0].length, cl: prev.s.id, kind: "addressee", via: "previous quotation's speaker" }); else gaps.push({ gap: "addressee_unknown", at: q.inner[0] + m.index }); }
  });
  // the narrator: first person outside any quotation, one referent per text when it recurs
  const inQ = (p) => qs.some((q) => p > q.open && p < q.close); const narr = [...text.matchAll(FIRST)].filter((m) => !inQ(m.index)).map((m) => ({ a: m.index, b: m.index + m[0].length, cl: "narrator", kind: "narrator", via: "first person outside quotations" })); if (narr.length >= 2) out.push(...narr);
  return { mentions: out, gaps, quotations: qs.length };
}
