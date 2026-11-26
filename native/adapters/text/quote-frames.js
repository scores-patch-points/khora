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
const tableOf = (lang) => (lang && typeof lang === "object" && Array.isArray(lang.pairs) ? lang : QUOTE_TABLES[lang] ?? REGISTERED.get(lang) ?? null);   // a table OBJECT (e.g. from inferQuoteTable) is accepted directly: the convention belongs to the edition, not the language code
export function registerQuoteTable(lang, table) {
  if (QUOTE_TABLES[lang]) throw new Error(`a built-in quote table for "${lang}" cannot be replaced; register under another code`);
  const ok = (a) => Array.isArray(a) && a.every((x) => typeof x === "string");
  if (!Array.isArray(table?.pairs) || !table.pairs.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === "string" && typeof p[1] === "string")) throw new Error("a quote table needs pairs: [[open, close], ...]");
  if (!ok(table.toggle ?? []) || !ok(table.end ?? [])) throw new Error("toggle and end must be arrays of strings");
  REGISTERED.set(lang, Object.freeze({ pairs: table.pairs, toggle: table.toggle ?? [], end: table.end ?? [".", "!", "?"], ...(table.dash ? { dash: table.dash } : {}) })); return true;
}
// ── INFERRING THE TABLE FROM THE TEXT (measured 2026-11-26 on 209 Genesis editions: 111 of 134 editions that use quotation marks are in languages with no built-in table, and the convention varies by EDITION: English alone shows up as no marks, straight quotes, and closing-first pairs) ──
// A style is a candidate pair or toggle. Its BALANCE is the share of its marks that match cleanly (an opener, then its closer, within a paragraph); a reversed style scores near zero on text that is written the other way, so direction is read from the data, not assumed.
// A toggle (one mark that both opens and closes) is only considered for a mark whose partner mark is absent, so a pair of “ and ” is not misread as two toggles.
const STYLES = [["“", "”"], ["”", "“"], ["«", "»"], ["»", "«"], ["„", "“"], ["„", "”"], ["‟", "”"], ["‹", "›"], ["›", "‹"], ["「", "」"], ["『", "』"]];
export const MIN_MARKS = 6, MIN_BALANCE = 0.8;
// balance alone is weak evidence (random brackets also pair ~90% of the time in one long paragraph), so a style must ALSO be SHORT: its median matched span is compared with the same marks randomly re-ordered (a seeded null); a real quotation is far shorter than a random pairing
function spansOf(paragraphs, open, close, order = null) {   // [positions of this style's marks] -> matched span lengths; `order` re-orders which mark sits at which position (the null)
  let marks = 0, matched = 0; const lens = [];
  for (const para of paragraphs) { const pos = [], ch = []; for (let i = 0; i < para.length; i++) if (para[i] === open || para[i] === close) { pos.push(i); ch.push(para[i]); }
    const seq = order ? order(ch) : ch, stack = []; seq.forEach((c, k) => { marks++; if (c === open) stack.push(pos[k]); else if (stack.length) { lens.push(pos[k] - stack.pop()); matched += 2; } }); }
  return { marks, balance: marks ? matched / marks : 0, lens };
}
const median = (xs) => { if (!xs.length) return Infinity; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
// SHAPE: what surrounds a mark says which way it faces. An OPENER follows a space (or the start) and precedes a non-space; a CLOSER follows a non-space and precedes a space, punctuation or the end. Marks whose surroundings decide neither are not counted (an unspaced script decides almost none, and then the span test above is the fallback).
const WS = /[\s\u00a0]/, shapeAt = (s, i) => { const p = s[i - 1], n = s[i + 1], pw = p === undefined || WS.test(p), nw = n === undefined || WS.test(n) || /[.,;:!?)\]]/.test(n); return pw && !nw ? "O" : !pw && nw ? "C" : null; };
function shapes(text, ch) { const out = []; for (let i = 0; i < text.length; i++) if (text[i] === ch) out.push(shapeAt(text, i)); return out; }
const share = (xs, v) => { const d = xs.filter(Boolean); return { decisive: d.length / (xs.length || 1), p: d.length ? d.filter((x) => x === v).length / d.length : 0 }; };
function balanceOf(paragraphs, open, close, text = paragraphs.join("\n\n")) {
  const r = spansOf(paragraphs, open, close), MIN_DECISIVE = 0.5;
  if (open === close) {   // a toggle: its occurrences must ALTERNATE opener-shaped, closer-shaped
    const sh = shapes(text, open).filter(Boolean); if (sh.length / (shapes(text, open).length || 1) < MIN_DECISIVE) return { marks: r.marks, balance: 0, shape: "undecided" };
    let alt = 0; for (let i = 1; i < sh.length; i++) if (sh[i] !== sh[i - 1]) alt++; return { marks: r.marks, balance: sh.length > 1 ? alt / (sh.length - 1) : 0, shape: "alternation" };
  }
  const so = share(shapes(text, open), "O"), sc = share(shapes(text, close), "C");
  if (Math.min(so.decisive, sc.decisive) >= MIN_DECISIVE) return { marks: r.marks, balance: Math.min(r.balance, so.p, sc.p), shape: "facing" };   // spaced script: balance AND facing, both
  // shape undecided (an unspaced script, or guillemets with a space inside: « Dieu »): the pair must balance very well AND the first of its marks in the text must be the opener (a text does not begin inside a quotation)
  const first = [...text].find((c) => c === open || c === close);
  return { marks: r.marks, balance: first === open && r.balance >= 0.95 ? r.balance : 0, shape: "first-is-opener" };
}
/** inferQuoteTable(text, { shuffle }) -> { table, evidence: [{ style, marks, balance }], gap } the table is built only from styles that clear MIN_MARKS and MIN_BALANCE; none clears -> table null and the typed gap "no_quote_convention_found" (never a default). */
export function inferQuoteTable(text, { end = [".", "!", "?"] } = {}) {
  const paragraphs = String(text ?? "").split(/\n\s*\n/), ev = [], pairs = [], toggle = [], seen = new Set(), count = {};
  for (const ch of String(text ?? "")) if (CANDIDATES.includes(ch)) count[ch] = (count[ch] ?? 0) + 1;
  for (const [o, c] of STYLES) { if (!count[o] || !count[c]) continue; const b = balanceOf(paragraphs, o, c, String(text ?? "")); ev.push({ style: o + c, ...b }); }
  for (const t of ['"', "”", "“"]) { if (!count[t]) continue; const partner = t === "”" ? "“" : t === "“" ? "”" : null; if (partner && count[partner]) continue; const b = balanceOf(paragraphs, t, t, String(text ?? "")); ev.push({ style: t + "(toggle)", ...b }); }
  for (const e of ev.sort((a, b) => b.marks * b.balance - a.marks * a.balance)) {
    if (e.marks < MIN_MARKS || e.balance < MIN_BALANCE) continue; const ms = e.style.endsWith("(toggle)") ? [e.style[0]] : [...e.style]; if (ms.some((m) => seen.has(m))) continue; ms.forEach((m) => seen.add(m));
    if (e.style.endsWith("(toggle)")) toggle.push(ms[0]); else pairs.push([ms[0], ms[1]]);
  }
  if (!pairs.length && !toggle.length) return { table: null, evidence: ev, gap: { gap: "no_quote_convention_found", marks: count } };
  return { table: Object.freeze({ pairs, toggle, end }), evidence: ev, gap: null };
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
  let paraStart = 0;   // where the current paragraph begins: a closer with no opener closes a quotation that began earlier IN THIS PARAGRAPH'S frame, never one from a paragraph before
  for (let i = 0; i < s.length; i++) {
    const c = s[i], top = stack[stack.length - 1];
    // a paragraph break ends every open quotation here (the convention is that a speech that goes on reopens in the next paragraph without the last having closed): typed as continuing, so narration after the final mark is not swallowed
    if (c === "\n" && s[i + 1] === "\n") { while (stack.length) { const o = stack.pop(); spans.push({ open: o.open, close: i, inner: [o.open + 1, i], depth: stack.length, continues: true }); gaps.push({ gap: "quotation_continues", at: o.open }); } while (s[i + 1] === "\n") i++; paraStart = i + 1; continue; }
    if (toggles.has(c)) { if (top && top.mark === c) close(stack.pop(), i); else stack.push({ open: i, mark: c, closer: c }); continue; }
    if (opens.has(c) && !(closes.has(c) && top && top.closer === c)) { stack.push({ open: i, mark: c, closer: opens.get(c) }); continue; }
    if (closes.has(c)) {
      if (top && top.closer === c) close(stack.pop(), i);
      else { spans.push({ open: paraStart - 1, close: i, inner: [paraStart, i], depth: 0, continued: true }); gaps.push({ gap: "quotation_continued", at: i }); }
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
  const q = spans[i], T = tableOf(lang) ?? QUOTE_TABLES.eng, end = new Set(T.end);
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
