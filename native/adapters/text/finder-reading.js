// finder-reading.js — the reading the text finder compares. Reader givers for janus's text finder
// (janus native/organs/identity/text-finder.mjs): janus compares readings and never reads text, so the reading is made here.
//
//   surfaceReading(text, { language })            the floor: tokens by the platform's word segmenter, figures valued by a
//                                                 refusing parser, no names, no tags. Hunters that need tags report a gap.
//   readingFromFull(text, full, { language, rev }) khora's own full reading (reading-full.js readFull) turned into the
//                                                 finder's Reading. Nothing is re-read or re-split: tokens, tags and names
//                                                 are the reading's own.
//   finderReader({ readFull, rev })               the two together, as the `read` giver the finder takes.
//
// Pure: no model call, no file access. The caller owns the call to readFull and hands it in.
// Measured 2026-11-14: readFull returns parse rows for English only; Spanish, German and Japanese come back with a cast
// and no parse, so those readings fall to the floor and say so in `by`.

const HAS_DIGIT = /\p{Nd}/u;

// Every token is kept, words and marks alike: a currency sign, a minus sign
// and a question mark are places two texts can part. Only white space is not
// a token.
export function segment(text, language = undefined) {
  const out = [];
  let seg;
  try { seg = new Intl.Segmenter(language || undefined, { granularity: 'word' }); } catch { seg = new Intl.Segmenter(undefined, { granularity: 'word' }); }
  for (const s of seg.segment(String(text))) {
    if (!s.segment.trim()) continue;
    out.push({ form: s.segment, start: s.index, end: s.index + s.segment.length, word: Boolean(s.isWordLike) });
  }
  return out;
}

// A figure is valued only when its written form can be read one way.
//   - Plain digits need no giver.
//   - A separator is read by the language of the text, and only for the tags listed here, whose separators read one way.
//     Any other language or region is refused (null), never guessed: Spanish is not listed because its regions disagree.
//   - More digits than a double can hold exactly are not valued: two different long identifiers must not come out equal.
//   - A token that carries letters ("5M", "20km", "1990s") is a figure nobody valued here. So is one with a leading zero.
// A figure that is not valued is not dropped: it is matched only by the same written form, and otherwise asked about.
export const FIGURE_DIGITS_MAX = 15;
const COMMA_THOUSANDS = /^en(-(US|GB|CA|AU|IE|NZ))?$/, DOT_THOUSANDS = /^de(-DE)?$/;
export function figureValue(form, language) {
  const s = String(form).normalize('NFKC');
  if ((s.match(/\d/g) ?? []).length > FIGURE_DIGITS_MAX) return null;
  if (/^0\d/.test(s)) return null; // a leading zero is written for a reason ("007", "0712"): an identifier, not an amount
  if (/^\d+$/.test(s)) return Number(s);
  const lang = String(language ?? '');
  if (COMMA_THOUSANDS.test(lang)) {
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''));
    if (/^\d+\.\d+$/.test(s)) return Number(s);
  }
  if (DOT_THOUSANDS.test(lang)) {
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
    if (/^\d+,\d+$/.test(s)) return Number(s.replace(',', '.'));
  }
  return null;
}

// The marks written hard against a figure: a currency sign, a mathematical sign, a dash, a percent or per-mille sign.
// "-5" is not "5" and "$500" is not "€500": two figures are the same figure only with the same marks. Character
// classes of the Unicode standard, not a list of words.
const FIGURE_MARK = /^[\p{Sc}\p{Sm}\p{Pd}%‰]+$/u;
export function figureMarks(tokens, i, j) {
  const before = tokens[i - 1], after = tokens[j + 1];
  const pre = before && before.word === false && before.end === tokens[i].start && FIGURE_MARK.test(before.form) ? before.form : '';
  const post = after && after.word === false && after.start === tokens[j].end && FIGURE_MARK.test(after.form) ? after.form : '';
  return pre + post;
}

// Figures as runs: a figure starts at a word token that bears a digit, and takes in the digit-bearing word tokens that
// follow it with at most one character (a space) between. "10 000" is one figure, and nobody here values it.
// `more(token)` lets a parsing reader add its numeral words to a run ("5 million").
export function figuresOf(text, tokens, language, more = () => false) {
  const out = [];
  const digit = (t) => t.word !== false && HAS_DIGIT.test(t.form);
  for (let i = 0; i < tokens.length; i++) {
    if (!digit(tokens[i])) continue;
    let j = i;
    while (j + 1 < tokens.length && (digit(tokens[j + 1]) || more(tokens[j + 1])) && tokens[j + 1].start - tokens[j].end <= 1 && tokens[j + 1].start > tokens[j].end) j++;
    const start = tokens[i].start, end = tokens[j].end, run = text.slice(start, end), marks = figureMarks(tokens, i, j);
    out.push({ text: run, start, end, value: j === i ? figureValue(run, language) : null, ...(marks ? { marks } : {}), ...(j > i ? { unread: 'a figure of several tokens' } : {}) });
    i = j;
  }
  return out;
}

export function surfaceReading(text, { language } = {}) {
  text = String(text);
  const tokens = segment(text, language);
  return { text, language: language ?? null, parsed: false, offersNames: false, tokens, amounts: figuresOf(text, tokens, language), names: [], by: `surface reader (Intl.Segmenter${language ? `, ${language}` : ''}; no parse)` };
}

export const surfaceReader = Object.assign(async (text, opts = {}) => surfaceReading(text, opts), { by: 'surface reader (Intl.Segmenter; no parse)' });

// Pure: khora's full reading of `text` → the finder's Reading.
export function readingFromFull(text, full, { language, rev = 'unknown', gap = null } = {}) {
  text = String(text);
  const sentences = full?.entry?.parse ?? [];
  const rows = sentences.flatMap((s, si) => (s.rows ?? []).map((w) => ({ ...w, sent: si, offset: s.offset ?? 0 })));
  if (!rows.length) {
    const floor = surfaceReading(text, { language });
    // Without a parse the cast cannot tell a name from any capitalised noun (measured: German common nouns come back as
    // names), so no names are offered and the name hunter reports a gap.
    return { ...floor, names: [], offersNames: false, by: `khora readFull@${rev} (no parse for language "${language ?? 'unstated'}"${gap ? `; ${gap}` : ''}); ${floor.by}` };
  }
  // Row offsets: absolute into the text, or relative to the sentence. Decided by looking.
  const fits = (w, base) => text.slice(base + w.start, base + w.end) === w.form;
  const absolute = rows.filter((w) => fits(w, 0)).length >= rows.filter((w) => fits(w, w.offset)).length;
  const tokens = rows.map((w) => {
    const base = absolute ? 0 : w.offset;
    return { form: w.form, start: base + w.start, end: base + w.end, word: w.upos !== 'PUNCT' && w.upos !== 'SYM', upos: w.upos, feats: w.feats, lemma: w.lemma, head: w.head, deprel: w.deprel, id: w.id, sent: w.sent };
  });
  // A figure starts at a token that bears a digit. Numeral tokens that follow it belong to it: "5 million" is one figure,
  // not the figure 5, and nobody here values it (null), so it is asked about. A numeral written wholly as a word is NOT
  // offered as a figure: the parser tags "one another" as a numeral too (measured on development pairs), and telling
  // those apart would take a list of words. Such a word stays a word, for the readers of questions.
  const amounts = figuresOf(text, tokens, language, (t) => t.word !== false && t.upos === 'NUM');
  const names = castNames(full, text);
  for (let i = 0; i < tokens.length; i++) { // proper-noun runs the cast did not carry
    if (tokens[i].upos !== 'PROPN') continue;
    let j = i; while (j + 1 < tokens.length && tokens[j + 1].upos === 'PROPN' && tokens[j + 1].sent === tokens[i].sent) j++;
    const start = tokens[i].start, end = tokens[j].end;
    if (!names.some((n) => n.start <= start && n.end >= end)) names.push({ text: text.slice(start, end), start, end });
    i = j;
  }
  return { text, language: language ?? null, parsed: true, offersNames: true, tokens, amounts, names, by: `khora readFull@${rev}` };
}

function castNames(full, text) {
  const out = [];
  for (const c of full?.entry?.cast ?? []) for (const sp of c.mentionSpans ?? []) {
    let [start, end] = sp;
    if (!(Number.isInteger(start) && Number.isInteger(end) && end > start)) continue;
    // The cast keeps a sentence-final name with its full stop; the name is the span without it.
    while (end > start && /[\s\p{P}]/u.test(text[end - 1])) end--;
    while (start < end && /[\s\p{P}]/u.test(text[start])) start++;
    if (end > start) out.push({ text: text.slice(start, end), start, end });
  }
  return out;
}


// The `read` giver: khora's full reading where it parses, the floor where it does not. `readFull` is handed in.
export function finderReader({ readFull, rev = 'unknown' } = {}) {
  if (typeof readFull !== 'function') throw new Error('finderReader: readFull is required (the caller owns the reading)');
  const read = async (text, { language } = {}) => {
    let full = null, gap = null;
    try { full = await readFull(String(text), { language }); } catch (e) { gap = `khora readFull threw: ${String(e?.message ?? e).slice(0, 160)}`; }
    return readingFromFull(text, full, { language, rev, gap });
  };
  return Object.assign(read, { by: `khora readFull@${rev}` });
}
