// ud-tokenizer.js — apply a UDTokenizer@1 prior: text -> tokens, for any language whose treebank taught one (scripts/train-ud-language.mjs).
//
// The prior carries DATA only, measured from the treebank: multiword splits (mwt: "du" -> ["de","le"]), abbreviations that keep their
// period, elision words that end in an apostrophe ("l'"), hyphen clitics ("-il"), whether letter-hyphen-letter forms are split, and —
// where the script writes no spaces — an averaged-perceptron character segmenter (B = a token boundary before this character). This is
// the code that reads it; it was first written in identity-udhr-emergence/run3/ud5.mjs (2026-10-24) and moved here, its home beside
// ud-parser.js, unchanged in behaviour. Sentences: the script's own ICU rules (Intl.Segmenter).
const PUNCT = /^[\p{P}\p{S}]$/u;
const cap = (orig, s) => (orig[0] !== orig[0].toLowerCase() ? s[0].toUpperCase() + s.slice(1) : s);

export function tokenizeSpaced(text, T = null) {
  const out = []; const abbrev = new Set(T?.abbrev || []); const mwt = T?.mwt || {};
  const el = (T?.words || []).map((w) => w.toLowerCase().replace(/’/g, "'")).filter((w) => w.endsWith("'"));
  const hc = [...(T?.hyphenClitics || [])].sort((a, b) => b.length - a.length);
  const emit = (p) => { const lp = p.toLowerCase(); if (mwt[lp]) { const ex = mwt[lp]; out.push(cap(p, ex[0]), ...ex.slice(1)); } else out.push(p); };
  for (const chunk of String(text ?? "").split(/\s+/).filter(Boolean)) {
    let c = chunk; const lead = [], trail = [];
    if (!abbrev.has(c.toLowerCase())) {
      while (c.length > 1 && PUNCT.test(c[0]) && !/^[$€£¥]\d/.test(c)) { lead.push(c[0]); c = c.slice(1); }
      while (c.length > 1 && PUNCT.test(c[c.length - 1]) && !abbrev.has(c.toLowerCase())) { trail.unshift(c[c.length - 1]); c = c.slice(0, -1); }
    }
    out.push(...lead);
    const lc = c.toLowerCase().replace(/’/g, "'"); let done = false;
    for (const h of hc) if (lc.length > h.length && lc.endsWith(h)) { emit(c.slice(0, -h.length)); out.push(c.slice(-h.length)); done = true; break; }
    if (!done) for (const w of el) if (lc.length > w.length && lc.startsWith(w)) { out.push(c.slice(0, w.length)); emit(c.slice(w.length)); done = true; break; }
    if (!done && T?.splitHyphens && /\p{L}-\p{L}/u.test(c)) { c.split(/(-)/).filter(Boolean).forEach((p) => out.push(p)); done = true; }
    if (!done) emit(c);
    out.push(...trail);
  }
  return out;
}

const ctype = (ch) => (ch === "_" ? "_" : /\p{Script=Hiragana}/u.test(ch) ? "h" : /[\p{Script=Katakana}ー]/u.test(ch) ? "H" : /\p{Script=Han}/u.test(ch) ? "k" : /\p{Script=Thai}/u.test(ch) ? "T" : /[0-9０-９]/.test(ch) ? "D" : /\p{L}/u.test(ch) ? "L" : "P");
/** The segmenter's features for character i — the same fourteen the builder trains on. */
export function segmentFeatures(ch, i) { const g = (j) => (j < 0 || j >= ch.length ? "_" : ch[j]), ty = (j) => ctype(g(j)); return ["b", "c0=" + g(i), "c-1=" + g(i - 1), "c1=" + g(i + 1), "c-2=" + g(i - 2), "c2=" + g(i + 2), "c-1c0=" + g(i - 1) + g(i), "c0c1=" + g(i) + g(i + 1), "c-2c-1=" + g(i - 2) + g(i - 1), "c-1c1=" + g(i - 1) + g(i + 1), "t0=" + ty(i), "t-1t0=" + ty(i - 1) + ty(i), "t0t1=" + ty(i) + ty(i + 1), "t-1t0t1=" + ty(i - 1) + ty(i) + ty(i + 1)]; }

export function tokenizeUnspaced(text, T) {
  const ch = [...String(text ?? "").replace(/\s+/g, "")]; if (!ch.length) return [];
  const w = T.segmenter.w; const B = T.segmenter.classes.indexOf("B"), I = T.segmenter.classes.indexOf("I"); const out = []; let cur = "";
  for (let i = 0; i < ch.length; i++) {
    let sI = 0, sB = 0; for (const k of segmentFeatures(ch, i)) { const v = w[k]; if (!v) continue; for (let j = 0; j < v.length; j += 2) { if (v[j] === I) sI += v[j + 1]; else if (v[j] === B) sB += v[j + 1]; } }
    if (sB > sI && cur) { out.push(cur); cur = ""; }
    cur += ch[i];
  }
  if (cur) out.push(cur); return out;
}

/** tokenize(text, prior) — by the prior's own kind: a segmenter means an unspaced script. No prior: whitespace and punctuation only. */
export function tokenize(text, T = null) { return T?.segmenter ? tokenizeUnspaced(text, T) : tokenizeSpaced(text, T); }

/** sentences(text, locale) — the script's own sentence rules; a paragraph break always ends a sentence. */
export function sentences(text, locale = "und") {
  const seg = new Intl.Segmenter(locale, { granularity: "sentence" }); const out = [];
  for (const para of String(text ?? "").split(/\n\s*\n/)) for (const s of seg.segment(para)) { const t = s.segment.trim(); if (t) out.push(t); }
  return out;
}
