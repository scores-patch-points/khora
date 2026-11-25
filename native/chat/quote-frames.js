// chat/quote-frames.js — A QUOTATION IS A FRAME: words held by someone, which the narrator reports and does not assert.
//
// In karaka terms the quotation fills the karman slot of a verb of saying and is itself a whole frame with its own roles; in the operators it is a DEF held within the speaker's frame (the narrator
// asserts only that the saying happened). This module finds the boundaries and the holder; it reads no language. PURE: text in, spans out.
//
// WHAT IS DECLARED, per language, as data (typographic convention, not a reading): which characters open and close a quotation, which toggle, which end a sentence. A language with no table is a
// typed gap ("no_quote_table"), never an English reading (nexus rule 2 and 8). An unbalanced quotation is a typed gap with its position, never a guess.
//
// THE HOLDER is the name in the tag after the quotation (up to the next quotation or the sentence's end), else the tag before it; a name INSIDE a quotation is the addressee, never the speaker; none found is
// ANONYMOUS, which is a finding, not an error. Names come from the caller (the thread's cast); none is typed here.
// NOT DONE: reported speech inside a quotation ("Mrs. Long says that…" is a second frame inside the first); a speaker named only by a pronoun; em-dash dialogue (no closing mark).
export const QUOTE_TABLES = Object.freeze({
  eng: Object.freeze({ pairs: [["“", "”"]], toggle: ['"'], end: [".", "!", "?"] }),
  fra: Object.freeze({ pairs: [["«", "»"], ["“", "”"]], toggle: ['"'], end: [".", "!", "?"], dash: ["—", "–", "―"] }),
  spa: Object.freeze({ pairs: [["«", "»"], ["“", "”"]], toggle: ['"'], end: [".", "!", "?"], dash: ["—", "–", "―"] }),
  rus: Object.freeze({ pairs: [["«", "»"], ["„", "“"]], toggle: ['"'], end: [".", "!", "?"], dash: ["—", "–", "―"] }),
  ita: Object.freeze({ pairs: [["«", "»"], ["“", "”"]], toggle: ['"'], end: [".", "!", "?"], dash: ["—", "–", "―"] }),
  deu: Object.freeze({ pairs: [["„", "“"], ["»", "«"]], toggle: [], end: [".", "!", "?"] }),
  jpn: Object.freeze({ pairs: [["「", "」"], ["『", "』"]], toggle: [], end: ["。", "！", "？"] }),
  zho: Object.freeze({ pairs: [["“", "”"], ["「", "」"], ["『", "』"]], toggle: [], end: ["。", "！", "？"] }),
});

// A CODEC REGISTERS ITS OWN TABLE (the conventions differ by codec and edition, so the tables are data a codec brings, not code here). A built-in cannot be replaced silently.
const REGISTERED = new Map();
const tableOf = (lang) => QUOTE_TABLES[lang] ?? REGISTERED.get(lang) ?? null;
export function registerQuoteTable(lang, table) {
  if (QUOTE_TABLES[lang]) throw new Error(`a built-in quote table for "${lang}" cannot be replaced; register under another code`);
  const ok = (a) => Array.isArray(a) && a.every((x) => typeof x === "string");
  if (!Array.isArray(table?.pairs) || !table.pairs.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "string" && typeof p[1] === "string")) throw new Error("a quote table needs pairs: [[open, close], ...]");
  if (!ok(table.toggle ?? []) || !ok(table.end ?? [])) throw new Error("toggle and end must be arrays of strings");
  REGISTERED.set(lang, Object.freeze({ pairs: table.pairs, toggle: table.toggle ?? [], end: table.end ?? [".", "!", "?"], ...(table.dash ? { dash: table.dash } : {}) })); return true;
}
// the marks a text uses that could be quotation marks (apostrophes and single curly quotes are not counted: they are mostly apostrophes)
const CANDIDATES = ["“", "”", '"', "«", "»", "„", "‹", "›", "「", "」", "『", "』"];
const marksIn = (s, except = new Set()) => { const m = {}; for (const ch of s) if (CANDIDATES.includes(ch) && !except.has(ch)) m[ch] = (m[ch] ?? 0) + 1; return m; };

/**
 * quoteSpans(text, lang) -> { spans: [{ open, close, inner: [a, b], depth, continues?, continued? }], gap, gaps }  (character offsets into `text`)
 * An opener with no closer is a quotation that CONTINUES (the convention when a speech runs into the next paragraph, which reopens): it runs to the end of the text, `continues: true`, gap "quotation_continues".
 * A closer with no opener closes one that began before this text: it runs from the start, `continued: true`, open -1, gap "quotation_continued". Neither is an error and neither is silent: they are typed and the frame stands.
 * `gap` is the first of `gaps` (kept for callers that read one).
 */
export function quoteSpans(text, lang = "eng") {
  const T = tableOf(lang); if (!T) { const g = { gap: "no_quote_table", lang, marks: marksIn(String(text ?? "")) }; return { spans: [], gap: g, gaps: [g] }; }
  const opens = new Map(T.pairs.map(([o, c]) => [o, c])), closes = new Set(T.pairs.map(([, c]) => c)), toggles = new Set(T.toggle);
  const stack = [], spans = [], gaps = []; const s = String(text ?? "");
  const close = (o, i) => spans.push({ open: o.open, close: i, inner: [o.open + 1, i], depth: stack.length });
  for (let i = 0; i < s.length; i++) {
    const c = s[i], top = stack[stack.length - 1];
    if (toggles.has(c)) { if (top && top.mark === c) close(stack.pop(), i); else stack.push({ open: i, mark: c, closer: c }); continue; }
    if (opens.has(c) && !(closes.has(c) && top && top.closer === c)) { stack.push({ open: i, mark: c, closer: opens.get(c) }); continue; }
    if (closes.has(c)) {
      if (top && top.closer === c) close(stack.pop(), i);
      else { spans.push({ open: -1, close: i, inner: [0, i], depth: 0, continued: true }); gaps.push({ gap: "quotation_continued", at: i }); }
    }
  }
  while (stack.length) { const o = stack.pop(); spans.push({ open: o.open, close: s.length, inner: [o.open + 1, s.length], depth: stack.length, continues: true }); gaps.push({ gap: "quotation_continues", at: o.open }); }
  gaps.sort((a, b) => a.at - b.at);
  const known = new Set([...T.pairs.flat(), ...T.toggle]), stray = marksIn(s, known); if (Object.keys(stray).length) gaps.push({ gap: "marks_outside_table", lang, marks: stray });
  return { spans: spans.sort((a, b) => a.open - b.open), gap: gaps[0] ?? null, gaps };
}

/** does this paragraph open with a dash that marks speech (no closing mark follows)? Only for a language whose table declares it; otherwise false (no claim). */
export function dashDialogue(paragraph, lang = "eng") {
  const d = tableOf(lang)?.dash; if (!d) return false;
  const t = String(paragraph ?? "").trimStart(); return d.some((m) => t.startsWith(m));
}

/** the deepest quotation holding character position `pos`, or null */
export function innermostAt(spans, pos) { let best = null; for (const q of spans) if (pos > q.open && pos < q.close && (!best || q.depth > best.depth)) best = q; return best; }

const isLetter = (c) => c !== undefined && c.toLowerCase() !== c.toUpperCase();
const inSpan = (spans, pos) => spans.some((q) => pos >= q.open && pos <= q.close);

/** every occurrence of a known name in [from, to) that lies outside every quotation and is bounded by non-letters; adjacent ones (a title and its surname) join into one holder */
function namesIn(text, spans, from, to, names) {
  const hits = []; const sorted = [...names].filter(Boolean).sort((a, b) => b.length - a.length);
  for (let i = from; i < to; i++) {
    if (inSpan(spans, i) || isLetter(text[i - 1])) continue;
    for (const n of sorted) if (text.startsWith(n, i) && i + n.length <= to && !isLetter(text[i + n.length]) && !inSpan(spans, i + n.length - 1)) { hits.push({ a: i, b: i + n.length, n }); i += n.length - 1; break; }
  }
  const joined = []; for (const h of hits) { const p = joined[joined.length - 1]; if (p && h.a - p.b === 1 && text[p.b] === " ") { p.b = h.b; p.n = `${p.n} ${h.n}`; } else joined.push({ ...h }); }
  return joined;
}

/** speakerOfSpan(text, spans, i, names, lang) -> { holder: name|null, via: "tag after"|"tag before"|"anonymous", depth } for the quotation spans[i] (only a depth-0 quotation has a holder here) */
export function speakerOfSpan(text, spans, i, names, lang = "eng") {
  const q = spans[i], T = QUOTE_TABLES[lang] ?? QUOTE_TABLES.eng, end = new Set(T.end);
  if (q.depth > 0) return { holder: null, via: "nested_unresolved", depth: q.depth };
  // a sentence-end mark inside a known name ("Mr.") does not end the tag: the name, not the mark, is read first (a title the cast does not hold still ends it: a typed miss, never a guess)
  const next = spans.find((x) => x.open > q.close && x.depth === 0); const a = q.close + 1, stop = next ? next.open : text.length, hitsA = namesIn(text, spans, a, stop, names);
  const inName = (hits, k) => hits.some((h) => k >= h.a && k < h.b);
  let b = a; while (b < stop && (!end.has(text[b]) || inName(hitsA, b)) && text[b] !== "\n") b++;
  const after = hitsA.find((h) => h.a < b); if (after) return { holder: after.n, via: "tag after", depth: 0 };
  const prev = [...spans].reverse().find((x) => x.close < q.open && x.depth === 0); const floor = prev ? prev.close : -1, hitsB = namesIn(text, spans, floor + 1, q.open, names);
  let s = q.open - 1; while (s > floor && (!end.has(text[s]) || inName(hitsB, s)) && text[s] !== "\n") s--;
  const before = hitsB.filter((h) => h.a > s).pop(); if (before) return { holder: before.n, via: "tag before", depth: 0 };
  return { holder: null, via: "anonymous", depth: 0 };
}
