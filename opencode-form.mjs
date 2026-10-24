// opencode-form.mjs — LAYER 4 of a longform: FORM. Section titles and measure come from a MEASURED genre skeleton, with the void hunt's
// slots mapped onto it.
//
// What this replaces: opencode-longform.mjs's `defaultOutline`, which titles a section from a void's label by joining its two facet nouns
// ("Asia and bulls", "Alexandria and lighthouse"), brackets them with "Introduction" and "Conclusion", and sizes every section by the same
// constant. None of that was measured on any piece of the kind asked for. Here the shape of the kind is READ off pieces of that kind
// (essays, briefs) by recurrence, the way the void hunt reads a facet off pages: what recurs across pieces is the skeleton; what a slot's own
// sentences say is its title; how long the pieces' parts run is the measure.
//
// LAWS (fold-suite/THE-META-PLAN.md; the seed is native/organs/essay-shape-register.js, whose 27 cells are ASSERTIONS a specimen can refute,
// never a ladder): every rule here is a measurement with printed parameters, never a word list or a genre fact typed by hand. There is no
// stop-word list: a piece's own vocabulary is the terms every one of its parts carries (never absent, so never returned to), the language's
// furniture is the terms more than half the corpus's pieces carry, both counted. There is no list of heading words: the opener is the slot whose terms recur in the most other
// slots, the closer the one that shares the most with it. There is no title template: a title is a clause of the slot's own sentences.
// Nothing is dropped: a slot that fits no part is an appendix. The shape is CURRENT BEST, revisable by the next corpus (Wilson's law,
// quoted in the register): the output carries n, the counts, and the parameters, so the next measurement can refute it.
//
// GENERATE-ANYTHING (the user's direction, 2026-10-24): this is not an essay organ. `skeletonFrom({ pieces, kind })` measures a skeleton for
// whatever kind the pieces are; only the SEGMENTER is per kind (headings or paragraph recurrence for prose; the header row and the rows for a
// table; the items for a list; the top-level declarations for a code file), the recurrence measure is one and the same: a first part whose
// terms later parts return to, middle parts each bringing a term a later part returns to, a last part that returns to the first. A kind whose
// pieces do not show that recurrence gets a skeleton that says so (shares near zero), which is the finding, not a failure of the segmenter.
//
// PURE. No fetch, no model, no file. `skeletonFrom` reads texts; `outlineFrom` reads a slot tree (opencode-stitch.mjs's `StitchTree@1`:
// `{ root: { children, gaps }, index }`, or a plain array of `{ id, label, terms?, text | sentences }`) and a skeleton of a kind.

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const formsOf = (t) => String(t).toLowerCase().match(/[\p{L}][\p{L}'’-]*/gu) ?? [];
const wordCount = (t) => (clean(t) ? clean(t).split(" ").length : 0);

/** The segmenter's and the measures' thresholds. Every one is printed with the skeleton; none is a word. */
export const PARAMS = Object.freeze({
  k: 2,               // a term "recurs" when it returns in at least k later parts (the opener's question)
  minTerm: 4,         // a term is a word form of at least this many letters (the stitch's own floor)
  newTerms: 2,        // without headings, a paragraph opens a new part when it introduces at least this many terms that later paragraphs return to
  pieceShare: 1,      // a term this share of a piece's parts carry (1: every part) is the piece's own vocabulary (its topic): never absent, so never returned to
  corpusShare: 0.5,   // a term more than this share of the corpus's pieces carry is the language's furniture, not a recurrence
  minParts: 3,        // a piece is read as parts when it has at least this many (fewer is one part: no shape to read)
  minPartWords: 15,   // a heading's stretch shorter than this is a label, not a part; it joins the next
  titleWords: [2, 12],// a title clause: at least this many words, at most this many
  shuffles: 200,      // the cadence null: how many shuffled orders are measured
  order: "exhaustive",// the middle order: "exhaustive" (the permutation with the largest mean step, ends held; up to maxExhaustive middle slots) or "greedy" (next = most new terms)
  maxExhaustive: 8,   // above this many middle slots the exhaustive order falls back to greedy (8! = 40320 orders)
});

// ── terms: forms conflated by what the corpus itself holds ───────────────────────────────────────────────────────────────────────────────

/** `keepers` is `keeper` only when the corpus also writes `keeper` (after opencode-stitch.mjs's conflator). */
export const conflator = (vocab) => (w) => {
  if (w.length < 3) return w;
  const tries = [w.endsWith("ies") ? `${w.slice(0, -3)}y` : null, w.endsWith("es") ? w.slice(0, -2) : null, w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : null].filter(Boolean);
  return tries.find((b) => b.length >= 3 && vocab.has(b)) ?? w;
};

const quantile = (xs, q) => {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return null;
  const pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (pos - lo);
};
/** { median, iqr: [q1, q3], n } of a sample; an empty sample is a typed null. */
export const distribution = (xs) => (xs.length ? { median: Math.round(quantile(xs, 0.5)), iqr: [Math.round(quantile(xs, 0.25)), Math.round(quantile(xs, 0.75))], n: xs.length } : { median: null, iqr: [null, null], n: 0 });

// ── the segmenter: parts by heading when the piece has them, else by the paragraphs' own recurrence ─────────────────────────────────────

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Parts by heading: the shallowest heading level that appears at least `minParts` times cuts the piece; a title line (the first heading,
 * the piece's name) is not a part; deeper headings stay inside their part; the preamble before the first cut is a part when it has words. */
const partsByHeading = (lines, params) => {
  const heads = lines.map((l, i) => ({ i, m: HEADING.exec(l) })).filter((x) => x.m).map((x) => ({ i: x.i, level: x.m[1].length, text: x.m[2] }));
  if (!heads.length) return null;
  const title = heads[0].i === lines.findIndex((l) => l.trim()) ? heads[0] : null; // the first non-blank line, when a heading, names the piece
  const rest = heads.filter((h) => h !== title);
  const levels = [...new Set(rest.map((h) => h.level))].sort((a, b) => a - b);
  const level = levels.find((lv) => rest.filter((h) => h.level === lv).length >= params.minParts);
  if (!level) return null;
  const cuts = rest.filter((h) => h.level === level);
  const parts = [];
  const push = (heading, from, to) => { const body = lines.slice(from, to).filter((l) => !HEADING.test(l)).join("\n"); const text = body.trim(); if (!text) return; parts.push({ heading, text, words: wordCount(text) }); };
  push(null, title ? title.i + 1 : 0, cuts[0].i);
  cuts.forEach((h, j) => push(h.text, h.i + 1, j + 1 < cuts.length ? cuts[j + 1].i : lines.length));
  // a heading's stretch too short to be a part (a label, a one-line lead) joins the part that follows it, its heading kept as the joined part's
  const joined = [];
  for (const p of parts) {
    const prev = joined[joined.length - 1];
    if (prev && prev.words < params.minPartWords) { prev.text = `${prev.text}\n\n${p.text}`; prev.words = wordCount(prev.text); prev.heading = prev.heading ?? p.heading; } else joined.push({ ...p });
  }
  return { by: "heading", level, parts: joined };
};

/** Parts by recurrence: a paragraph that introduces at least `newTerms` terms no earlier paragraph carried, which at least `k` later paragraphs
 * return to, opens a new part (the void hunt's rule, read along the piece instead of across pages). */
const partsByRecurrence = (text, stem, params) => {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (paras.length < params.minParts) return { by: "none", parts: [{ heading: null, text, words: wordCount(text) }] };
  const sets = paras.map((p) => new Set(formsOf(p).filter((w) => w.length >= params.minTerm).map(stem)));
  const seen = new Set(sets[0]);
  const parts = [{ heading: null, text: paras[0], words: wordCount(paras[0]) }];
  for (let i = 1; i < paras.length; i++) {
    const fresh = [...sets[i]].filter((t) => !seen.has(t));
    const returning = fresh.filter((t) => sets.slice(i + 1).filter((s) => s.has(t)).length >= params.k);
    const cur = parts[parts.length - 1];
    if (returning.length >= params.newTerms && cur.words >= params.minPartWords) parts.push({ heading: null, text: paras[i], words: wordCount(paras[i]) });
    else { cur.text = `${cur.text}\n\n${paras[i]}`; cur.words = wordCount(cur.text); }
    for (const t of sets[i]) seen.add(t);
  }
  return { by: "recurrence", parts };
};

/** A markdown table: the header row, then each row, cells joined; the separator row (`|---|`) is structure, not a part. */
const partsByTable = (lines, params) => {
  const rows = lines.map((l) => l.trim()).filter((l) => /^\|.*\|$/.test(l) && !/^\|[\s:|-]+\|$/.test(l));
  if (!rows.length) return null;
  const cells = (r) => r.slice(1, -1).split("|").map((c) => clean(c)).filter(Boolean);
  const parts = rows.map((r, i) => { const text = cells(r).join(" | "); return { heading: i === 0 ? "header" : null, text, words: wordCount(text) }; }).filter((p) => p.text);
  return { by: "table", parts };
};
/** A list: each item (a line opening with a bullet or a number, with its indented continuation lines) is a part; text before the first item is the lead. */
const partsByList = (lines, params) => {
  const item = /^\s*(?:[-*+•]|\d+[.)])\s+/;
  if (!lines.some((l) => item.test(l))) return null;
  const parts = [];
  let cur = null;
  for (const l of lines) {
    if (item.test(l)) { cur = { heading: null, text: l.replace(item, "").trim(), words: 0 }; parts.push(cur); }
    else if (cur && /^\s+\S/.test(l)) cur.text = `${cur.text}\n${l.trim()}`;
    else if (!cur && l.trim() && !HEADING.test(l)) { cur = { heading: "lead", text: l.trim(), words: 0 }; parts.push(cur); cur = null; }
    else cur = null;
  }
  for (const p of parts) p.words = wordCount(p.text);
  return { by: "list", parts: parts.filter((p) => p.text) };
};
/** A code file: each top-level declaration (a line at column 0 that opens a stretch) with the indented lines under it is a part; a leading comment block is the first part. */
const partsByCode = (lines, params) => {
  const parts = [];
  let cur = null;
  for (const l of lines) {
    if (!l.trim()) continue;
    const top = !/^\s/.test(l) && !/^[\]})\s;]*$/.test(l.trim());
    const comment = /^\s*(?:\/\/|#|\/\*|\*)/.test(l);
    if (top && !(comment && cur?.heading === "comment")) { cur = { heading: comment ? "comment" : l.trim().slice(0, 60), text: l, words: 0 }; parts.push(cur); }
    else if (cur) cur.text = `${cur.text}\n${l}`;
  }
  for (const p of parts) p.words = wordCount(p.text);
  return parts.length ? { by: "code", parts } : null;
};
const partsByProse = (lines, stem, params) => partsByHeading(lines, params) ?? partsByRecurrence(lines.join("\n"), stem, params);

/** The segmenter of each kind. A kind not named here is prose (headings, else paragraph recurrence): essay, brief, readme, memo, note. */
export const SEGMENTERS = Object.freeze({
  prose: (lines, stem, params) => partsByProse(lines, stem, params),
  table: (lines, stem, params) => partsByTable(lines, params) ?? partsByProse(lines, stem, params),
  list: (lines, stem, params) => partsByList(lines, params) ?? partsByProse(lines, stem, params),
  code: (lines, stem, params) => partsByCode(lines, params) ?? partsByProse(lines, stem, params),
});
export const segmenterOf = (kind) => SEGMENTERS[String(kind ?? "").toLowerCase()] ?? SEGMENTERS.prose;

/** segment(text, { kind, stem, params }) → { by, parts: [{ heading, text, words }] }. */
export function segment(text, { kind = "prose", stem = (w) => w, params = PARAMS } = {}) {
  const lines = String(text ?? "").split(/\r?\n/);
  return segmenterOf(kind)(lines, stem, params);
}

// ── the skeleton: what recurs across pieces of a kind ────────────────────────────────────────────────────────────────────────────────────

/**
 * skeletonFrom({ pieces, kind, params }) → { kind, n, params, parts: [{ role, words: { median, iqr }, recurrence }], partsPerPiece, furniture, pieces }.
 * `pieces` are texts (strings or { name, text }) of one kind. For each piece: its parts, each part's terms (less the piece's own vocabulary and the
 * corpus's furniture, both counted); then whether the FIRST part names the piece's question (at least one of its terms returns in >= k later parts),
 * whether the LAST returns to the first's terms, and whether each MIDDLE part introduces at least one new term a later part returns to. The
 * recurrence of each role is the share of pieces in which it holds; the words of each role are the distribution of its parts' lengths.
 * Nothing is set by hand beyond `params`, which are returned. The caller judges the shares; this function counts.
 */
export function skeletonFrom({ pieces = [], kind = "essay", params = PARAMS } = {}) {
  const P = { ...PARAMS, ...params };
  const texts = pieces.map((p, i) => (typeof p === "string" ? { name: `piece ${i + 1}`, text: p } : { name: p?.name ?? `piece ${i + 1}`, text: String(p?.text ?? "") }));
  // one conflator over the whole corpus's vocabulary, so a term is the same term in every piece
  const vocab = new Set();
  for (const t of texts) for (const w of formsOf(t.text)) if (w.length >= P.minTerm) vocab.add(w);
  const stem = conflator(vocab);
  const segs = texts.map((t) => ({ ...t, ...segment(t.text, { kind, stem, params: P }) }));
  const termsOf = (txt) => new Set(formsOf(txt).filter((w) => w.length >= P.minTerm).map(stem));
  const partTerms = segs.map((s) => s.parts.map((p) => termsOf(p.text)));
  // the language's furniture: a term more than corpusShare of the pieces carry (counted, never listed)
  const pieceDf = new Map();
  partTerms.forEach((parts) => { for (const t of new Set(parts.flatMap((s) => [...s]))) pieceDf.set(t, (pieceDf.get(t) ?? 0) + 1); });
  const furniture = new Set([...pieceDf].filter(([, n]) => texts.length > 1 && n / texts.length > P.corpusShare).map(([t]) => t));
  const pieceRows = segs.map((s, pi) => {
    const parts = partTerms[pi];
    const n = parts.length;
    // the piece's own vocabulary: a term pieceShare of its parts carry (by default every part: a term never absent cannot be returned to)
    const df = new Map();
    for (const set of parts) for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
    const own = new Set([...df].filter(([, c]) => n >= P.minParts && c / n >= P.pieceShare).map(([t]) => t));
    const T = parts.map((set) => new Set([...set].filter((t) => !own.has(t) && !furniture.has(t))));
    if (n < P.minParts) return { name: s.name, by: s.by, parts: n, words: s.parts.map((p) => p.words), shape: null, note: `${n} part(s): no shape to read` };
    const first = T[0], last = T[n - 1];
    const opensTerms = [...first].filter((t) => T.slice(1).filter((set) => set.has(t)).length >= P.k);
    const closeShared = [...last].filter((t) => first.has(t));
    const middleShared = T.slice(1, -1).map((set) => [...set].filter((t) => first.has(t)).length);
    const meanMiddle = middleShared.length ? middleShared.reduce((a, b) => a + b, 0) / middleShared.length : 0;
    const develops = T.slice(1, -1).map((set, j) => {
      const i = j + 1;
      const before = new Set(T.slice(0, i).flatMap((x) => [...x]));
      const fresh = [...set].filter((t) => !before.has(t));
      return fresh.filter((t) => T.slice(i + 1).some((x) => x.has(t))).length;
    });
    return {
      name: s.name, by: s.by, parts: n, words: s.parts.map((p) => p.words), headings: s.parts.map((p) => p.heading),
      shape: {
        opens: { holds: opensTerms.length >= 1, terms: opensTerms.length, laterParts: n - 1 },
        closes: { holds: closeShared.length >= 1, shared: closeShared.length, meanMiddleShared: Number(meanMiddle.toFixed(2)), strict: closeShared.length > meanMiddle },
        develops: { holds: develops.length > 0 && develops.every((d) => d >= 1), partsWithNew: develops.filter((d) => d >= 1).length, middleParts: develops.length, newPerPart: develops },
      },
    };
  });
  const shaped = pieceRows.filter((r) => r.shape);
  const share = (f) => (shaped.length ? Number((shaped.filter(f).length / shaped.length).toFixed(3)) : null);
  const roleWords = { opens: shaped.map((r) => r.words[0]), develops: shaped.flatMap((r) => r.words.slice(1, -1)), closes: shaped.map((r) => r.words[r.words.length - 1]) };
  const parts = [
    { role: "opens", words: distribution(roleWords.opens), recurrence: { pieces: shaped.filter((r) => r.shape.opens.holds).length, of: shaped.length, share: share((r) => r.shape.opens.holds), rule: `>= 1 term of the first part returns in >= ${P.k} later parts` } },
    { role: "develops", words: distribution(roleWords.develops), recurrence: { pieces: shaped.filter((r) => r.shape.develops.holds).length, of: shaped.length, share: share((r) => r.shape.develops.holds), middleParts: shaped.reduce((a, r) => a + r.shape.develops.middleParts, 0), middlePartsWithNew: shaped.reduce((a, r) => a + r.shape.develops.partsWithNew, 0), rule: "every middle part introduces >= 1 new term a later part returns to" } },
    { role: "closes", words: distribution(roleWords.closes), recurrence: { pieces: shaped.filter((r) => r.shape.closes.holds).length, of: shaped.length, share: share((r) => r.shape.closes.holds), strict: shaped.filter((r) => r.shape.closes.strict).length, rule: "the last part shares >= 1 term with the first (strict: more than the middle parts do on average)" } },
  ];
  return { schema: "FormSkeleton@1", kind, n: texts.length, shaped: shaped.length, params: P, parts, partsPerPiece: distribution(shaped.map((r) => r.parts)), furniture: furniture.size, segmenter: segmenterOf(kind) === SEGMENTERS.prose ? "prose" : String(kind).toLowerCase(), segmented: Object.fromEntries([...new Set(segs.map((x) => x.by))].map((b) => [b, segs.filter((x) => x.by === b).length])), pieces: pieceRows };
}

export const partOf = (skeleton, role) => (skeleton?.parts ?? []).find((p) => p.role === role) ?? null;

// ── the slots: read from a stitch tree or a plain list, with their terms, bodies and defining sentences ─────────────────────────────────

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
const splitSentences = (t) => [...segmenter.segment(clean(t))].map((s) => s.segment.trim()).filter(Boolean);
const leavesOf = (n) => (n.children?.length ? n.children.flatMap(leavesOf) : [n]);
const underOf = (n) => [n, ...(n.children ?? []).flatMap(underOf)];

/** slotsFrom(tree, { params }) → [{ id, label, terms, question, body, sentences, facts, gap, form }]: the level-1 slots (and level-1 gaps) of a
 * StitchTree@1, or a plain list's items. `terms` are the slot's own stems (the void's label), `question` those plus its children's, `body` every
 * stem its sentences carry, `sentences` its defining sentences (the fill first, then its sentences ranked by the question terms they carry). */
export function slotsFrom(tree, { params = PARAMS } = {}) {
  const P = { ...PARAMS, ...params };
  if (Array.isArray(tree)) {
    const vocab = new Set();
    for (const s of tree) for (const w of formsOf(`${s.label ?? ""} ${(s.terms ?? []).join(" ")} ${s.text ?? ""} ${(s.sentences ?? []).join(" ")}`)) if (w.length >= P.minTerm) vocab.add(w);
    const stem = conflator(vocab);
    const shown = new Map();
    const stemsOf = (t) => { const out = new Set(); for (const w of formsOf(t)) { if (w.length < P.minTerm) continue; const k = stem(w); out.add(k); const m = shown.get(k) ?? shown.set(k, new Map()).get(k); m.set(w, (m.get(w) ?? 0) + 1); } return out; };
    const rows = tree.map((s, i) => {
      const sentences = s.sentences ?? splitSentences(s.text ?? "");
      const terms = s.terms?.length ? s.terms.map(stem) : [...stemsOf(s.label ?? "")];
      const body = new Set([...terms, ...sentences.flatMap((x) => [...stemsOf(x)])]);
      return { id: s.id ?? `s${i + 1}`, label: clean(s.label ?? terms.join(" ")), terms, question: terms, body, sentences, facts: s.facts ?? sentences.length, gap: !!s.gap };
    });
    const form = (k) => [...(shown.get(k) ?? new Map([[k, 1]]))].sort((a, b) => b[1] - a[1])[0][0];
    return rows.map((r) => ({ ...r, form }));
  }
  const root = tree?.root ?? tree?.tree?.root;
  const index = tree?.index ?? tree?.tree?.index ?? null;
  if (!root) return [];
  const sentenceOf = (i) => index?.sentences?.[i] ?? null;
  const form = typeof index?.form === "function" ? index.form : (k) => k;
  const stemsOfText = (t) => new Set(formsOf(t).filter((w) => w.length >= P.minTerm).map(index?.stem ?? ((w) => w)));
  return [...(root.children ?? []), ...(root.gaps ?? [])].map((n) => {
    const under = underOf(n);
    const question = [...new Set(under.flatMap((x) => x.terms ?? []))];
    const own = (n.sentences ?? []).map(sentenceOf).filter(Boolean);
    const fill = leavesOf(n).flatMap((l) => l.fill ?? []);
    const body = new Set([...question, ...own.flatMap((s) => [...(s.stems ?? stemsOfText(s.text))])]);
    const carry = (t) => { const st = stemsOfText(t); return question.filter((k) => st.has(k)).length; };
    const ranked = own.map((s) => s.text).sort((a, b) => carry(b) - carry(a) || a.length - b.length);
    const sentences = [...new Set([...fill.map((a) => a.text), ...ranked])];
    return { id: n.id, label: clean(n.label), terms: [...(n.terms ?? [])], question, body, sentences, facts: fill.length || own.length, gap: !!n.gap, form };
  });
}

// ── titles: the slot's own question in the reader's words, taken from its sentences ─────────────────────────────────────────────────────

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const trimClause = (c) => clean(c).replace(/^[^\p{L}\p{N}"“]+|[^\p{L}\p{N}%"”)]+$/gu, "").replace(/[.]+$/, "");
/** The shape `facetTitle` makes and this layer refuses: exactly two words joined by the joiner it used ("Asia and bulls" is three tokens with
 * "and" in the middle). A structural check on the title's own tokens, not a word list: the joiner is named because that is the shape under test. */
export const isFacetJoin = (title) => { const w = clean(title).split(" "); return w.length === 3 && w[1].toLowerCase() === "and"; };

/**
 * titleOf(slot, { reader, params }) → { title, by, clause }: the shortest clause of the slot's defining sentences that carries all the slot's top
 * terms (then: the seed alone); clauses are cut at the sentences' own punctuation; a reader's words (the ask's) break ties toward the clause that
 * uses them; a clause in the facet-join shape is passed over; when no clause is found, the top term alone, as the corpus writes it.
 */
export function titleOf(slot, { reader = null, params = PARAMS } = {}) {
  const P = { ...PARAMS, ...params };
  const top = slot.terms?.length ? slot.terms : slot.question.slice(0, 2);
  const readerStems = new Set(formsOf((reader?.words ?? []).join(" ")));
  const stemsIn = (c) => new Set(formsOf(c).filter((w) => w.length >= P.minTerm).map((w) => slot.stem ? slot.stem(w) : w));
  const carries = (c, terms) => { const st = stemsIn(c); const fs = formsOf(c); return terms.every((k) => st.has(k) || fs.some((f) => f.startsWith(k) || k.startsWith(f.slice(0, Math.max(3, f.length - 2))))); };
  const clauses = [...new Set((slot.sentences ?? []).flatMap((s) => s.split(/[,;:()\[\]—–]|\s[-]\s|(?<=[.!?])\s+/)).map(trimClause).filter((c) => { const n = wordCount(c); return n >= P.titleWords[0] && n <= P.titleWords[1]; }))];
  const readerHits = (c) => formsOf(c).filter((w) => readerStems.has(w)).length;
  const pick = (terms) => clauses.filter((c) => carries(c, terms) && !isFacetJoin(c)).sort((a, b) => readerHits(b) - readerHits(a) || wordCount(a) - wordCount(b) || a.length - b.length)[0] ?? null;
  const all = top.length ? pick(top) : null;
  if (all) return { title: cap(all), by: "clause: all top terms", clause: all };
  const seed = top.length ? pick([top[0]]) : null;
  if (seed) return { title: cap(seed), by: "clause: seed term", clause: seed };
  const term = top.length ? slot.form(top[0]) : slot.label;
  return { title: cap(term), by: "term alone", clause: null };
}

// ── the order: opener by recurrence, middle by cadence, closer by return ─────────────────────────────────────────────────────────────────

const shared = (a, b) => { let n = 0; for (const k of a) if (b.has(k)) n++; return n; };
/** The cadence of an order: for each slot after the first, step = the share of its body terms not yet seen. */
export function cadenceOf(slots, order) {
  const seen = new Set();
  const steps = [];
  order.forEach((i, pos) => {
    const s = slots[i];
    if (pos > 0) { const fresh = [...s.body].filter((k) => !seen.has(k)).length; steps.push({ slot: s.id, step: s.body.size ? Number((fresh / s.body.size).toFixed(3)) : 0, new: fresh, size: s.body.size }); }
    for (const k of s.body) seen.add(k);
  });
  const mean = steps.length ? steps.reduce((a, x) => a + x.step, 0) / steps.length : 0;
  return { steps, mean: Number(mean.toFixed(4)) };
}
const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** The null: the mean step of `trials` shuffled orders of the same slots (seeded, so the number is reproducible). */
export function shuffledCadence(slots, order, { trials = PARAMS.shuffles, seed = 1 } = {}) {
  const rnd = mulberry(seed);
  const means = [];
  for (let t = 0; t < trials; t++) {
    const o = order.slice();
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
    means.push(cadenceOf(slots, o).mean);
  }
  const mean = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0;
  return { trials, mean: Number(mean.toFixed(4)), max: Math.max(...means, 0) };
}

/**
 * outlineFrom({ tree, skeleton, kind, topic, reader, params }) → { outline: [{ id, title, role, words, slot }], appendix, steps, order, measures }.
 * Opener: the slot whose QUESTION terms recur in the most other slots' bodies. Closer: of the rest, the slot whose body shares the most terms
 * with the opener's (the return). Middle: greedy by cadence, each next slot the one with the largest share of terms not yet seen. Appendix: a
 * slot whose body shares no term with any other slot fits no part of a chained piece; it is kept, never dropped. Words: the skeleton's median for
 * the role, scaled by the slot's facts against the median facts of the slots, clipped to the role's IQR.
 */
export function outlineFrom({ tree, skeleton, kind = skeleton?.kind ?? "essay", topic = "", reader = null, params = PARAMS } = {}) {
  const P = { ...PARAMS, ...params };
  // the slots are laid onto the parts of the kind asked for: a skeleton of another kind is used, and the mismatch is disclosed in the measures
  const kindMismatch = skeleton && skeleton.kind !== kind ? { asked: kind, skeleton: skeleton.kind } : null;
  const slots = slotsFrom(tree, { params: P });
  if (!slots.length) return { outline: [], appendix: [], steps: [], order: [], measures: { slots: 0, kind, kindMismatch } };
  const idx = slots.map((_, i) => i);
  // isolation is measured on the body: a slot no other slot shares a term with
  const isolated = new Set(idx.filter((i) => !idx.some((j) => j !== i && shared(slots[i].body, slots[j].body) > 0)));
  const live = idx.filter((i) => !isolated.has(i));
  const appendix = [...isolated].map((i) => ({ id: slots[i].id, slot: slots[i].id, title: titleOf(slots[i], { reader, params: P }).title, role: "appendix", why: "shares no term with any other slot; fits no part of the chain" }));
  if (!live.length) return { outline: [], appendix, steps: [], order: [], measures: { slots: slots.length, isolated: isolated.size } };
  const recurrence = (i) => live.filter((j) => j !== i && slots[i].question.some((k) => slots[j].body.has(k))).length;
  const opener = live.slice().sort((a, b) => recurrence(b) - recurrence(a) || slots[b].facts - slots[a].facts || a - b)[0];
  const rest = live.filter((i) => i !== opener);
  const closer = rest.length ? rest.slice().sort((a, b) => shared(slots[b].body, slots[opener].body) - shared(slots[a].body, slots[opener].body) || a - b)[0] : null;
  const middle = rest.filter((i) => i !== closer);
  // THE MIDDLE ORDER. Pre-registered frame (eval/form/PREREG.md, B2): greedy, each next slot the one with the largest share of terms not yet seen.
  // REC 2026-10-24, after B2 failed on two of three real trees: greed per step is not the largest mean step, because a broad slot taken early
  // swallows the small slots' terms and every later step collapses; the frame is now the permutation of the middle with the largest mean step
  // (the ends held), exhaustive while the middle is small, greedy above `maxExhaustive`. Which frame ran is disclosed in `measures.orderBy`.
  const meanStepOf = (mid) => cadenceOf(slots, [opener, ...mid, ...(closer === null ? [] : [closer])]).mean;
  const greedy = () => { const left = middle.slice(), out = [], seen = new Set(slots[opener].body); while (left.length) { const scored = left.map((i) => { const fresh = [...slots[i].body].filter((k) => !seen.has(k)).length; return { i, step: slots[i].body.size ? fresh / slots[i].body.size : 0, fresh }; }).sort((a, b) => b.step - a.step || b.fresh - a.fresh || a.i - b.i); out.push(scored[0].i); left.splice(left.indexOf(scored[0].i), 1); for (const k of slots[scored[0].i].body) seen.add(k); } return out; };
  const exhaustive = () => { let best = null, bestMean = -1; const rec = (left, acc) => { if (!left.length) { const m = meanStepOf(acc); if (m > bestMean) { bestMean = m; best = acc.slice(); } return; } for (let i = 0; i < left.length; i++) rec([...left.slice(0, i), ...left.slice(i + 1)], [...acc, left[i]]); }; rec(middle.slice(), []); return best ?? []; };
  const orderBy = P.order === "exhaustive" && middle.length <= P.maxExhaustive ? "exhaustive" : "greedy";
  const order = [opener, ...(orderBy === "exhaustive" ? exhaustive() : greedy())];
  if (closer !== null) order.push(closer);
  const cadence = cadenceOf(slots, order);
  const facts = slots.map((s) => s.facts);
  const medianFacts = quantile(facts, 0.5) || 1;
  const wordsFor = (role, f) => {
    const part = partOf(skeleton, role) ?? partOf(skeleton, "develops");
    const w = part?.words;
    if (!w || w.median === null) return null;
    const [lo, hi] = w.iqr;
    const scaled = w.median * (f / medianFacts);
    return Math.round(Math.min(hi ?? scaled, Math.max(lo ?? scaled, scaled)));
  };
  const outline = order.map((i, pos) => {
    const role = pos === 0 ? "opens" : i === closer ? "closes" : "develops";
    const t = titleOf(slots[i], { reader, params: P });
    return { id: `f${pos + 1}`, title: t.title, by: t.by, role, words: wordsFor(role, slots[i].facts), slot: slots[i].id, label: slots[i].label, facts: slots[i].facts, gap: slots[i].gap };
  });
  return {
    outline, appendix, steps: cadence.steps, order: order.map((i) => slots[i].id),
    measures: { topic: clean(topic), slots: slots.length, isolated: isolated.size, orderBy, opener: { slot: slots[opener].id, recursIn: recurrence(opener), of: live.length - 1 }, closer: closer === null ? null : { slot: slots[closer].id, sharedWithOpener: shared(slots[closer].body, slots[opener].body) }, cadence: cadence.mean, medianFacts, kind, kindMismatch, skeleton: skeleton ? { kind: skeleton.kind, n: skeleton.n } : null },
  };
}
