// chat/ingest.mjs — THE DOCUMENT DOOR OF THE CHAT: a text is READ into the thread's fold, paragraph by paragraph, never routed.
//
// WHY. turn() decides first whether a message is a statement or a question, which is right for a person typing. A paragraph of a novel that holds a quoted question ("Do not you want to know
// who has taken it?") or opens with a quotation is routed to ANSWERING, and its facts never enter the fold (measured 2026-11-25, pg1342 chapter I: 9 of the first 14 paragraphs read; handed to say()
// directly, 27 of 27, and the dialogue could then be asked about). The reader was never the limit. This door hands each paragraph to the thread's own say(), which reads every sentence with the
// chat's parser, quotations included. It adds no reader and no rule: it chooses the door.
//
// WHAT IT DOES NOT DO. It does not bind the I and you inside a quotation to the quoted speaker: the canonical read does that (adapters/text/speakers.js) and the chat's pronoun binder does not
// (thread.mjs bindings: "inside a quotation: not the user's words"). It does not write the log: each read is offered to `onRead(paragraph, result)` and the caller weaves it (server.mjs does with weaveSay).
// A paragraph that is not text (a bracketed note) or that say() sets aside (an imperative is a request, and the chat acts on no request) is REPORTED with its reason, never dropped silently.
//
// ingestDocument(thread, text, { onRead }) -> { paragraphs, read, sentences, facts, setAside: [{ text, why }], gap }
const paragraphsOf = (text) => {
  const out = []; let cur = [];
  for (const line of String(text ?? "").split("\n")) { if (line.trim() === "") { if (cur.length) out.push(cur.join(" ")); cur = []; } else cur.push(line.trim()); }
  if (cur.length) out.push(cur.join(" "));
  return out.map((p) => p.split(" ").filter(Boolean).join(" ")).filter(Boolean);   // the file's hard wraps become spaces
};
const bracketed = (p) => p.startsWith("[") && p.endsWith("]");   // a note in the source's own markup (an illustration credit), not a sentence of the text

export async function ingestDocument(thread, text, { onRead = null } = {}) {
  const paras = paragraphsOf(text);
  if (!paras.length) return { paragraphs: 0, read: 0, sentences: 0, facts: 0, setAside: [], gap: "empty_text" };
  const res = { paragraphs: paras.length, read: 0, sentences: 0, facts: 0, setAside: [], gap: null };
  for (const p of paras) {
    if (bracketed(p)) { res.setAside.push({ text: p, why: "a bracketed note in the source's markup, not a sentence" }); continue; }
    const r = await thread.say(p);
    if (!r || r.type !== "read") { res.setAside.push({ text: p, why: `the thread did not read it (${r?.type ?? "nothing"})` }); continue; }
    if (!r.sentences) { res.setAside.push({ text: p, why: r.requests?.length ? "it reads as a request, which the chat does not act on" : "no sentence in it could be read" }); continue; }
    res.read += 1; res.sentences += r.sentences; res.facts += (r.facts ?? []).length;
    if (r.requests?.length) res.setAside.push({ text: r.requests[0], why: "a sentence in the paragraph reads as a request, which the chat does not act on" });
    if (onRead) onRead(p, r);
  }
  return res;
}
