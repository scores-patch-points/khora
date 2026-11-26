// adapters/text/frames-layer.js — THE FRAMES LAYER, ONE IMPLEMENTATION: who holds the words a verb sits in.
//
// Two front doors call this and nothing else decides a frame: the canonical reader (the-fold/read-framed.mjs, over a readDocument entry) and the chat (chat/ingest.mjs, over its own thread). A frame is marked by two independent
// layers that agree on one shape: quote-frames.js (quotation marks, per-language declared tables) and speech-frames.js (a verb of saying, no marks needed, speech verbs from a prior). Neither reads a word list; neither guesses:
// a language with no table, a dash dialogue, or a missing prior is a typed gap and the frame is UNKNOWN (null), never narration.
//
// frameVerbs({ text, sentences, targets, names, lang, speech }) -> { frames, speech: [{ order, a, b, holder, mode }], gap }
//   text       the string the sentence offsets are expressed in (a paragraph for the chat, the whole document for the canonical reader)
//   sentences  [{ order, offset, rows }]  offset = where the sentence starts in `text`; each row's start/end are the SENTENCE's own
//   targets    [{ order, row, form, kriya }]  the verbs to frame (the caller chooses which rows count)
//   names      the known names (the cast's surfaces), only to name the holder of a quotation from its tag
//   speech     { isSpeech, gap } from speech-frames.js::speechVerbFromActPrior (a non-English language passes a gap)
// frame: { order, form, kriya, framed (inside quotation marks: true/false/null), holder, via, depth, reported (inside reported speech: true/false/null), reportedBy, reportedHead, mode }
import { quoteSpans, speakerOfSpan, innermostAt, dashDialogue } from "./quote-frames.js";
import { speechFrames, heldAt } from "./speech-frames.js";

// the quotations that can be the TAG of this sentence's speech verb: those overlapping the sentence, or closing within a few characters before it IN THE SAME PARAGRAPH (the splitter may cut "“Hello.” said Pierre." after the quote).
// One that closed in an earlier paragraph is not a tag: found by running the canonical door over a whole document (the chat door, one paragraph at a time, never saw it).
const quotesNear = (spans, s, text) => { const end = s.offset + Math.max(0, ...s.rows.map((r) => r.end)); return spans.filter((q) => (q.close >= s.offset && q.open <= end) || (q.close < s.offset && s.offset - q.close <= 4 && !text.slice(q.close + 1, s.offset).includes("\n"))); };

export function frameVerbs({ text, sentences, targets, names, lang = "eng", speech, ablate = [] }) {
  // ablate: ["quotes"] switches the quotation-mark layer off, and the speech layer is switched off by passing a speech gap; either way the frames are UNKNOWN (null), never false: an ablated layer is not an absent one
  const { spans, gap: spanGap } = ablate.includes("quotes") ? { spans: [], gap: { gap: "ablated:quotes" } } : quoteSpans(text, lang), noTable = spanGap && (spanGap.gap === "no_quote_table" || spanGap.gap === "ablated:quotes") ? spanGap : null;
  const sentByOrder = new Map(sentences.map((s) => [s.order, s])), perOrder = new Map(), speechOut = [], frames = [], dashed = new Map();
  const paragraphStart = (pos) => { const i = text.lastIndexOf("\n\n", pos); return i < 0 ? 0 : i + 2; };
  for (const t of targets) {
    const s = sentByOrder.get(t.order); if (!s || !t.row) continue;
    const pStart = paragraphStart(s.offset), dash = dashed.has(pStart) ? dashed.get(pStart) : (dashed.set(pStart, dashDialogue(text.slice(pStart), lang)), dashed.get(pStart)), gap = dash ? { gap: "dash_dialogue_not_read" } : noTable;
    if (!perOrder.has(t.order)) {
      // the mark-free layer, per sentence, on the sentence's own rows; a quotation abutting the speech verb is that quotation's tag and is left to the mark layer
      const frs = speech.gap ? [] : speechFrames(s.rows, speech.isSpeech, { quotes: quotesNear(spans, s, text).map((q) => ({ open: q.open - s.offset, close: q.close - s.offset, depth: q.depth })) });
      perOrder.set(t.order, frs); for (const x of frs) speechOut.push({ order: t.order, a: s.offset + x.known[0], b: s.offset + x.known[1], holder: x.holder, mode: x.mode });
    }
    const held = speech.gap ? null : heldAt(perOrder.get(t.order), t.row.start);
    const rep = speech.gap || dash ? { reported: null, reportedBy: null, reportedHead: null, mode: null } : held ? { reported: held.unknown ? null : true, reportedBy: held.holder?.text ?? null, reportedHead: held.holder?.head ?? null, mode: held.mode } : { reported: false, reportedBy: null, reportedHead: null, mode: null };
    const base = { order: t.order, form: t.form, kriya: t.kriya };
    if (gap) { frames.push({ ...base, framed: null, holder: null, via: gap.gap, depth: 0, ...rep }); continue; }
    const pos = s.offset + t.row.start, q = innermostAt(spans, pos);
    if (!q) { frames.push({ ...base, framed: false, holder: null, via: null, depth: 0, ...rep }); continue; }
    const top = spans.findIndex((x) => x.depth === 0 && x.open <= q.open && x.close >= q.close), h = speakerOfSpan(text, spans, top < 0 ? 0 : top, names, lang);
    frames.push({ ...base, framed: true, holder: h.holder, via: h.via, depth: q.depth, ...rep });
  }
  const gaps = [...(spanGap ? [spanGap] : [])]; if (sentences.some((s) => dashDialogue(text.slice(paragraphStart(s.offset)), lang))) gaps.push({ gap: "dash_dialogue_not_read" });
  return { frames, speech: speechOut, gap: noTable ?? null, gaps };
}
