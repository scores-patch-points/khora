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
// FRAMES (quote-frames.js). Each verb the chat found is marked framed when it sits inside a quotation, with the holder of that quotation (a name from the tag, else anonymous). The narrator asserts only that the
// saying happened; askFramed() says whose words an answer is. Direct quotation only: reported speech inside a quotation is a second frame, not read yet.
//
// ingestDocument(thread, text, { onRead, lang }) -> { paragraphs, read, sentences, facts, setAside: [{ text, why }], frames: [{ order, form, kriya, framed, holder, via, depth }], quoteGaps, gap }
import { quoteSpans, speakerOfSpan, innermostAt, dashDialogue } from "./quote-frames.js";
const STORE = new WeakMap();   // thread -> frames, so a question asked later can say whose words an answer is
const paragraphsOf = (text) => {
  const out = []; let cur = [];
  for (const line of String(text ?? "").split("\n")) { if (line.trim() === "") { if (cur.length) out.push(cur.join(" ")); cur = []; } else cur.push(line.trim()); }
  if (cur.length) out.push(cur.join(" "));
  return out.map((p) => p.split(" ").filter(Boolean).join(" ")).filter(Boolean);   // the file's hard wraps become spaces
};
const bracketed = (p) => p.startsWith("[") && p.endsWith("]");   // a note in the source's own markup (an illustration credit), not a sentence of the text

// `lang` is the language of the QUOTATION CONVENTIONS, and the result says which one was used (`lang`): the chat reads English only today, so its thread declares English; a caller reading another
// language passes its own, and a language with no table is a typed gap on every frame, never an English reading.
export async function ingestDocument(thread, text, { onRead = null, lang = "eng" } = {}) {
  const paras = paragraphsOf(text);
  if (!paras.length) return { paragraphs: 0, read: 0, sentences: 0, facts: 0, setAside: [], frames: [], quoteGaps: [], gap: "empty_text" };
  const res = { lang, paragraphs: paras.length, read: 0, sentences: 0, facts: 0, setAside: [], frames: [], quoteGaps: [], gap: null };
  const store = STORE.get(thread) ?? STORE.set(thread, []).get(thread);
  for (const [pi, p] of paras.entries()) {
    if (bracketed(p)) { res.setAside.push({ text: p, why: "a bracketed note in the source's markup, not a sentence" }); continue; }
    const r = await thread.say(p);
    if (!r || r.type !== "read") { res.setAside.push({ text: p, why: `the thread did not read it (${r?.type ?? "nothing"})` }); continue; }
    if (!r.sentences) { res.setAside.push({ text: p, why: r.requests?.length ? "it reads as a request, which the chat does not act on" : "no sentence in it could be read" }); continue; }
    res.read += 1; res.sentences += r.sentences; res.facts += (r.facts ?? []).length;
    if (r.requests?.length) res.setAside.push({ text: r.requests[0], why: "a sentence in the paragraph reads as a request, which the chat does not act on" });
    const fr = framesOf(thread, p, r, lang); for (const x of fr.frames) x.para = pi; res.frames.push(...fr.frames); store.push(...fr.frames); if (fr.gap) res.quoteGaps.push({ text: p.slice(0, 60), ...fr.gap });
    if (onRead) onRead(p, r);
  }
  return res;
}

/** the frames of one just-read paragraph: for each verb the chat found, is it inside a quotation, and whose */
function framesOf(thread, p, r, lang) {
  const S = thread.engine.S, base0 = quoteSpans(p, lang), spans = base0.spans, dash = dashDialogue(p, lang);
  const gap = dash ? { gap: "dash_dialogue_not_read" } : base0.gap && base0.gap.gap === "no_quote_table" ? base0.gap : null, base = S.text.length - p.length, orders = new Set((r.facts ?? []).map((f) => f.order));
  const names = (S.read?.cast?.referents ?? []).filter((b) => b.kind === "name").map((b) => b.forms?.[0]?.[0]).filter(Boolean);
  const out = [];
  for (const f of S.frames) {
    if (!orders.has(f.order)) continue;
    const rows = S.rowsOf.get(f.order)?.rows ?? [], row = rows.find((x) => x.form === f.form), off = S.read.sentences.find((s) => s.order === f.order)?.offset;
    if (!row || off == null) continue;
    if (gap) { out.push({ order: f.order, form: f.form, kriya: f.kriya, framed: null, holder: null, via: gap.gap, depth: 0 }); continue; }
    const pos = off + row.start - base, q = innermostAt(spans, pos);
    if (!q) { out.push({ order: f.order, form: f.form, kriya: f.kriya, framed: false, holder: null, via: null, depth: 0 }); continue; }
    const top = spans.findIndex((x) => x.depth === 0 && x.open <= q.open && x.close >= q.close), h = speakerOfSpan(p, spans, top < 0 ? 0 : top, names, lang);
    out.push({ order: f.order, form: f.form, kriya: f.kriya, framed: true, holder: h.holder, via: h.via, depth: q.depth });
  }
  return { frames: out, gap };
}

/** askFramed(thread, question) -> the thread's own reply, plus { framed, holder }: an answer drawn wholly from inside a quotation says whose words they are; a mixed or narrated one is left as it was */
export async function askFramed(thread, question) {
  const r = await thread.turn(question), frames = STORE.get(thread) ?? [];
  if (r.type !== "answer" || !(r.evidence ?? []).length) return { ...r, framed: false, holder: null };
  const orders = new Set(r.evidence.map((e) => e.order)), mine = frames.filter((f) => orders.has(f.order));
  if (!mine.length || mine.every((f) => f.framed === false || f.framed === null)) return { ...r, framed: false, holder: null };
  if (!mine.every((f) => f.framed === true)) return { ...r, framed: "mixed", holder: null };
  const hs = [...new Set(mine.map((f) => f.holder))], holder = hs.length === 1 ? hs[0] : null;
  return { ...r, framed: true, holder, text: `According to ${holder ?? "a speaker the text does not name"}: ${r.text}` };
}
