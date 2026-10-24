// opencode-stitch.mjs — LAYER A of a generation: the piece as far as CONTENT ALONE fills it, with NO model, for ANY KIND of unit.
//
// A long grounded work is many verified units at byte addresses, not one long draw (penelope GL-BD-19). The longform essay is one kind of
// generation; the same organ builds a table from rows, a list from items, a file from code lines, a brief from a dataset's records. The pages a
// gather read are split into clean UNITS with true byte addresses by a splitter the caller chooses (the default, prose sentences, follows
// penelope/organs/source-index.mjs SourceIndex@1, commit c0b2a65; its hand-set "dirty" word list is replaced by a measured rule, see buildIndex;
// `lineUnits` makes every line a unit for rows, items, records and code). The piece's slots are found by a RECURSIVE VOID HUNT over those units
// (after opencode-gather-voids.mjs, one level deeper), and each leaf slot is filled with verbatim units, each carrying its source and byte span.
// Nothing between the units asserts anything: the piece is units at addresses under headings. A slot nothing fills is a typed GAP, never a
// paraphrase. The gaps are the WORK ORDER for layer B (a model draws for one gap), and `admit` takes what the model drew back through the same
// hunt: each drawn unit FACES an addressed snip or is MARKED as the model's own, and the referents it raises that the sources do speak to become
// child gaps. The recursion (stitch → gaps → draw → admit → new gaps → …) lives in the caller; this module never calls a model, never fetches, and
// the test asserts both. `generateStitched` and `admitDrawn` are the generation-facing names of `stitch` and `admit`.
//
// Measured rules, no word lists: a term is a word form conflated with the forms the corpus itself contains (keeper/keepers, lens/lenses); a
// seed is a noun by the language's counted prior (opencode-route classOf, UD counts; unknown is allowed) shared by `minSupport` units from
// `minSupport` distinct sources and by no more than half the pool (what most units share is the topic's own vocabulary); furniture is a
// line that recurs verbatim at the edges of two pages or twice within one, or (prose only) that is not prose by structure: too few words, no terminal, title-cased, a url.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as EOT from "./opencode-eot.mjs";
import { taskDir } from "./opencode-worknotes.mjs";
import { fileOf, applySection } from "./opencode-longform.mjs";
import { classOf } from "./opencode-route.mjs";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const slug = (s) => clean(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "stitch";
const enc = new TextEncoder();
const bytes = (s) => enc.encode(s).length;

export const LIMITS = Object.freeze({ depth: 2, minSupport: 2, perSlot: 3, slotsPerLevel: [6, 4], gapsPerLevel: 3, minWords: 5, maxChars: 400, maxShare: 0.5, minTerm: 4, carry: 0.6, minCarryStems: 3, corroborate: 3, context: 3 });
export const KINDS = Object.freeze(["prose", "rows", "list", "code", "records"]);
export const GAP_LINE = (label) => `(no page stated this: ${label})`;
export const ONE_PAGE_LINE = (label, n = 1) => `(only ${n} page spoke to this: ${label})`;

// ── units: what a passage is made of, by the caller's splitter; a unit is { text, index } (its character index in the passage) ─────────────

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
/** Prose by structure: enough words, a terminal, a capital or quote or digit to open, not title-cased, no url or address in it. */
const proseLike = (s) => { const w = s.split(/\s+/); return w.length >= LIMITS.minWords && s.length <= LIMITS.maxChars && /[.!?]["”’)]?$/.test(s) && /^[\p{Lu}\p{N}"“(]/u.test(s) && w.filter((x) => /^\p{Lu}/u.test(x)).length / w.length <= 0.5 && !/https?:|www\.|@\w/.test(s); };
/** Each line in turn: `each(line, lineIndex)` yields the units of a line that is not furniture. */
const byLine = (each) => (text, { skip = () => false } = {}) => { const out = []; let at = 0; for (const line of text.split(/\n/)) { if (!skip(line)) out.push(...each(line, at)); at += line.length + 1; } return out; };
/** Prose: the clean sentences of each line (a sentence never crosses a line; a line wrapped by the page's extractor is the page's furniture, not a sentence). */
export const proseUnits = byLine((line, at) => { const out = []; for (const seg of segmenter.segment(line)) { const lead = seg.segment.length - seg.segment.trimStart().length; const text = seg.segment.trim(); if (text && proseLike(text)) out.push({ text, index: at + seg.index + lead }); } return out; });
/** Lines: every non-blank line is one unit, as written (a table row, a list item, a record, a line of code). */
export const lineUnits = byLine((line, at) => { const lead = line.length - line.trimStart().length; const text = line.trim(); return text ? [{ text, index: at + lead }] : []; });
export const unitsFor = (kind) => (kind === "prose" ? proseUnits : lineUnits);
/** The drawn text's units, for `admit`: prose splits into sentences; any other kind into lines. */
const drawnUnits = (kind, t) => { const s = String(t ?? "").replace(/^```[a-z]*\n?|```$/gim, "").replace(/<!--[\s\S]*?-->/g, ""); return kind === "prose" ? clean(s).split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"“(])/u).map((x) => x.trim()).filter(Boolean) : s.split(/\n/).map((x) => x.trim()).filter(Boolean); };

// ── terms: forms conflated by what the corpus holds, nouns by the counted prior ─────────────────────────────────────────────────────────────

const formsOf = (t) => String(t).toLowerCase().match(/[\p{L}][\p{L}'’_-]*/gu) ?? [];
/** Conflation anchored in the corpus's own vocabulary: `keepers` is `keeper` only when the pages also write `keeper`. */
export const conflator = (vocab) => (w) => {
  if (w.length < 3) return w;
  const tries = [w.endsWith("ies") ? `${w.slice(0, -3)}y` : null, w.endsWith("es") ? w.slice(0, -2) : null, w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : null].filter(Boolean);
  return tries.find((b) => b.length >= 3 && vocab.has(b)) ?? w;
};
const isNounBy = (wordClass) => (form) => { try { const c = wordClass ? wordClass(form) : null; return c === null || c === "NOUN" || c === "PROPN"; } catch { return true; } };

// ── the index: clean units at true byte addresses, furniture measured out ──────────────────────────────────────────────────────────────────

const normLine = (l) => clean(l).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** buildIndex(passages, { quotes, kind, units }) → { sources, sentences (the units), furniture, refused }. A passage is { name, url?, text }; the door's
 * own "research record" is not a page. A unit's `start`/`end` are byte offsets into the passage text as given, so `Buffer.from(text).subarray(start, end)`
 * is its bytes; a splitter's unit whose text is not at its index is refused, never addressed. */
export function buildIndex(passages = [], { quotes = [], kind = "prose", units = unitsFor(kind), wordClass = (w) => classOf("en", w) } = {}) {
  const pages = (passages ?? []).filter((p) => p && typeof p.text === "string" && p.text.trim() && !/^research record/i.test(String(p.name ?? "")));
  const sources = pages.map((p, i) => ({ n: i + 1, name: String(p.name ?? p.url ?? `page ${i + 1}`), url: String(p.url ?? (/^https?:/.test(String(p.name ?? "")) ? p.name : "")) }));
  // furniture: a line written twice on one page, or the same line on two pages at the pages' EDGES (a nav bar, a copyright notice, a table's
  // header row sit in the first or last lines of each page they are on); the same record in the body of two pages is the pages agreeing, not furniture
  const EDGE = 1;
  const lineSeen = new Map();
  pages.forEach((p, i) => { const ls = p.text.split(/\n/).map(normLine); const idx = ls.map((k, j) => [k, j]).filter(([k]) => k); const own = new Map(); idx.forEach(([k, j], pos) => { const e = own.get(k) ?? own.set(k, { n: 0, edge: true }).get(k); e.n++; if (pos >= EDGE && pos < idx.length - EDGE) e.edge = false; }); for (const [k, o] of own) { const e = lineSeen.get(k) ?? lineSeen.set(k, { pages: new Set(), max: 0, edge: true }).get(k); e.pages.add(i); e.max = Math.max(e.max, o.n); e.edge = e.edge && o.edge; } });
  const furniture = new Set([...lineSeen].filter(([, e]) => e.max >= 2 || (e.pages.size >= 2 && e.edge)).map(([k]) => k));
  const quoteKeys = new Set((quotes ?? []).map(normLine).filter(Boolean));
  const vocab = new Set();
  const raw = [], refused = [];
  pages.forEach((p, src) => {
    for (const u of units(p.text, { skip: (line) => furniture.has(normLine(line)) })) {
      const text = String(u.text ?? ""), index = Number(u.index);
      if (!text || !Number.isInteger(index) || p.text.slice(index, index + text.length) !== text) { refused.push({ src, text: text.slice(0, 80), index }); continue; }
      const forms = formsOf(text).filter((w) => w.length >= LIMITS.minTerm);
      for (const w of forms) vocab.add(w);
      const start = bytes(p.text.slice(0, index));
      raw.push({ src, text, start, end: start + bytes(text), forms, quoted: quoteKeys.has(normLine(text)) });
    }
  });
  const stem = conflator(vocab);
  const shown = new Map(); // stem -> form counts, for a label a person can read
  const sentences = raw.map((s, id) => { const stems = new Set(); for (const w of s.forms) { const k = stem(w); stems.add(k); const m = shown.get(k) ?? shown.set(k, new Map()).get(k); m.set(w, (m.get(w) ?? 0) + 1); } return { id, src: s.src, text: s.text, start: s.start, end: s.end, stems, quoted: s.quoted }; });
  const form = (k) => [...(shown.get(k) ?? new Map([[k, 1]]))].sort((a, b) => b[1] - a[1])[0][0];
  const noun = isNounBy(wordClass);
  return { schema: "StitchIndex@1", kind, sources, sentences, units: sentences, furniture: [...furniture], refused, stem, form, isNoun: (k) => noun(form(k)), vocab };
}

// ── the void hunt: slots found by measured recurrence, one level inside another ────────────────────────────────────────────────────────────

const title = (label) => { const bits = clean(label).split("·").map((s) => s.trim()).filter(Boolean); const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s); return bits.length <= 1 ? cap(bits[0] ?? "") : `${cap(bits[0])} and ${bits.slice(1).join(", ")}`; };
const node = (o) => ({ children: [], gaps: [], gap: null, fill: [], admitted: [], ...o });

/** One level: peel the pool by its most shared seed, slot by slot; what recurs but on one page only is a GAP at this level. */
function huntLevel(pool, { index, exclude, minSupport, maxSlots, maxGaps, prefix, level, from = 0 }) {
  const slots = [], gaps = [];
  let left = pool.slice();
  const tally = (ss) => { const df = new Map(); for (const s of ss) for (const k of s.stems) { if (exclude.has(k)) continue; const e = df.get(k) ?? df.set(k, { n: 0, srcs: new Set() }).get(k); e.n++; e.srcs.add(s.src); } return df; };
  const rank = (a, b) => b[1].srcs.size - a[1].srcs.size || b[1].n - a[1].n || a[0].localeCompare(b[0]);
  while (slots.length < maxSlots && left.length >= minSupport) {
    const df = tally(left);
    const seed = [...df].filter(([k, e]) => e.n >= minSupport && e.srcs.size >= minSupport && (left.length < 4 || e.n <= left.length * LIMITS.maxShare) && index.isNoun(k)).sort(rank)[0];
    if (!seed) break;
    const mine = left.filter((s) => s.stems.has(seed[0]));
    const co = tally(mine);
    co.delete(seed[0]);
    // the label: the seed, then the noun the slot's own units from enough pages share with it (two words at most)
    const second = [...co].filter(([k, e]) => e.n >= 2 && e.srcs.size >= minSupport && index.isNoun(k)).sort(rank)[0]?.[0] ?? null;
    slots.push(node({ id: `${prefix}${from + slots.length + 1}`, level, label: [seed[0], second].filter(Boolean).map(index.form).join(" · "), terms: [seed[0], second].filter(Boolean), seed: seed[0], sentences: mine.map((s) => s.id), sources: [...seed[1].srcs].sort(), count: mine.length, found: { by: "recurrence", seed: index.form(seed[0]), sentences: seed[1].n, sources: seed[1].srcs.size, pool: left.length } }));
    const gone = new Set(mine.map((s) => s.id));
    left = left.filter((s) => !gone.has(s.id));
  }
  // what recurs on one page only is measured over the whole pool at this level, before the peel: a slot may carry those units, the question stays one page's
  const taken = new Set(slots.flatMap((x) => x.terms));
  const df = tally(pool);
  for (const [k, e] of [...df].filter(([k, e]) => !taken.has(k) && e.n >= minSupport && e.srcs.size < minSupport && index.isNoun(k)).sort(rank).slice(0, maxGaps)) {
    const mine = pool.filter((s) => s.stems.has(k));
    gaps.push(node({ id: `${prefix}g${gaps.length + 1}`, level, label: index.form(k), terms: [k], seed: k, sentences: mine.map((s) => s.id), sources: [...e.srcs], count: mine.length, found: { by: "recurrence", seed: index.form(k), sentences: e.n, sources: e.srcs.size, pool: pool.length }, gap: { kind: "one-source", why: `${e.n} unit(s) from ${e.srcs.size} page(s) speak to ${index.form(k)}; a slot needs ${minSupport} pages` } }));
  }
  return { slots, gaps, left };
}

/** voidHunt({ passages, quotes, topic, voids, kind, units, depth, minSupport, index }) → the tree. Level 0 is the piece; level 1 its facets; level 2 what each
 * facet's own units keep returning to. A gather's voids, when given, seed level 1 by their labels' terms (their material is the pages'), and the units
 * they leave are hunted by recurrence after them; otherwise the facets are found from the index alone. Every slot carries how it was found. */
export function voidHunt({ passages = [], quotes = [], topic = "", voids = null, kind = "prose", units, depth = LIMITS.depth, minSupport = LIMITS.minSupport, index = null, wordClass } = {}) {
  index = index ?? buildIndex(passages, { quotes, kind, units, wordClass });
  const topicStems = new Set(formsOf(topic).map(index.stem));
  const root = node({ id: "root", level: 0, label: clean(topic), terms: [...topicStems], sentences: index.sentences.map((s) => s.id), sources: index.sources.map((s) => s.n - 1), count: index.sentences.length, found: { by: "topic" } });
  const byId = (ids) => ids.map((i) => index.sentences[i]);
  const used = new Set();
  const slots = [], gaps = [];
  // level 1 from the gather's voids: a void's label names its terms; the slot is the index units that carry them, from enough pages
  for (const v of Array.isArray(voids) ? voids : []) {
    const terms = [...new Set(formsOf(v.label ?? "").filter((w) => w.length >= LIMITS.minTerm).map(index.stem))].filter((k) => !topicStems.has(k));
    if (!terms.length) continue;
    const mine = index.sentences.filter((s) => !used.has(s.id) && terms.some((k) => s.stems.has(k)));
    const srcs = new Set(mine.map((s) => s.src));
    const n = node({ id: `s${slots.length + 1}`, level: 1, label: clean(v.label), terms, seed: terms[0], sentences: mine.map((s) => s.id), sources: [...srcs].sort(), count: mine.length, found: { by: "gather-void", void: v.id ?? null, sentences: mine.length, sources: srcs.size } });
    if (mine.length >= minSupport && srcs.size >= minSupport) { slots.push(n); mine.forEach((s) => used.add(s.id)); } else gaps.push({ ...n, id: `sg${gaps.length + 1}`, gap: { kind: srcs.size ? "one-source" : "unstated", why: `${mine.length} unit(s) from ${srcs.size} page(s) speak to ${clean(v.label)}; a slot needs ${minSupport} pages` } });
  }
  // then recurrence over what the voids left (everything, when none were given)
  const r = huntLevel(index.sentences.filter((s) => !used.has(s.id)), { index, exclude: new Set([...topicStems, ...slots.flatMap((s) => s.terms)]), minSupport, maxSlots: Math.max(0, LIMITS.slotsPerLevel[0] - slots.length), maxGaps: LIMITS.gapsPerLevel, prefix: "s", level: 1, from: slots.length });
  const seen = new Set([...slots, ...gaps].map((x) => x.seed));
  root.children = [...slots, ...r.slots];
  root.gaps = [...gaps, ...r.gaps.filter((g) => !seen.has(g.seed)).map((g, i) => ({ ...g, id: `sg${gaps.length + i + 1}` }))];
  // deeper: inside each slot, with the slot's own terms and the topic's excluded, the same hunt over the slot's own units; a question already
  // declared a gap higher up is not declared again inside a slot
  const declared = new Set(root.gaps.map((g) => g.seed));
  const descend = (n, lvl) => {
    if (lvl > depth) return;
    const exclude = new Set([...topicStems, ...n.terms, ...(n.chain ?? [])]);
    const d = huntLevel(byId(n.sentences), { index, exclude, minSupport, maxSlots: LIMITS.slotsPerLevel[Math.min(lvl - 1, LIMITS.slotsPerLevel.length - 1)], maxGaps: LIMITS.gapsPerLevel, prefix: `${n.id}.`, level: lvl });
    d.gaps = d.gaps.filter((g) => !declared.has(g.seed));
    for (const c of [...d.slots, ...d.gaps]) c.chain = [...(n.chain ?? []), ...n.terms];
    for (const g of d.gaps) declared.add(g.seed);
    n.children = d.slots;
    n.gaps = d.gaps;
    n.rest = d.left.map((s) => s.id);
    for (const c of d.slots) descend(c, lvl + 1);
  };
  for (const s of root.children) descend(s, 2);
  return { schema: "StitchTree@1", kind, topic: clean(topic), depth, minSupport, root, index };
}

export const leavesOf = (n) => (n.children?.length ? n.children.flatMap(leavesOf) : [n]);
export const slotsOf = (root) => { const out = []; const walk = (n) => { out.push(n); for (const c of n.children ?? []) walk(c); for (const g of n.gaps ?? []) walk(g); }; walk(root); return out; };
export const findSlot = (tree, id) => slotsOf(tree.root).find((n) => n.id === id) ?? null;
const sectionOf = (tree, id) => tree.root.children.find((s) => s.id === id || slotsOf(s).some((n) => n.id === id)) ?? tree.root.gaps.find((g) => g.id === id) ?? null;

// ── the fill: verbatim units, ranked by the terms they carry and the pages that agree ─────────────────────────────────────────────────────

const shared = (a, b) => { let n = 0; for (const k of a) if (b.has(k)) n++; return n; };
/** Pages agree on a unit when another page's unit shares enough of its terms: the count of such other pages. */
const corroboration = (s, index) => { const srcs = new Set(); for (const o of index.sentences) { if (o.src === s.src) continue; const n = shared(s.stems, o.stems); if (n >= LIMITS.corroborate || (s.stems.size && n / new Set([...s.stems, ...o.stems]).size >= 0.3)) srcs.add(o.src); } return srcs.size; };
const address = (s, index) => ({ text: s.text, source: index.sources[s.src].name, url: index.sources[s.src].url, n: index.sources[s.src].n, start: s.start, end: s.end, id: s.id });
export const marker = (a) => `[S${a.n} #${a.start}-${a.end}]`;

/** fillSlots({ tree, index, perSlot }) → the tree with every leaf's `fill` chosen; a unit serves one slot. */
export function fillSlots({ tree, index = tree.index, perSlot = LIMITS.perSlot } = {}) {
  const used = new Set(), seenText = new Set();
  const corr = new Map();
  const corrOf = (s) => corr.get(s.id) ?? corr.set(s.id, corroboration(s, index)).get(s.id);
  for (const leaf of leavesOf(tree.root)) {
    if (leaf.level === 0) continue;
    const terms = new Set([...leaf.terms, ...(leaf.chain ?? [])]);
    const cands = leaf.sentences.map((i) => index.sentences[i]).filter((s) => !used.has(s.id) && !seenText.has(normLine(s.text)))
      .map((s) => ({ s, carry: shared(terms, s.stems), agree: corrOf(s) }))
      .sort((a, b) => b.carry - a.carry || b.agree - a.agree || (b.s.quoted ? 1 : 0) - (a.s.quoted ? 1 : 0) || a.s.id - b.s.id);
    // pages first: the second unit of a slot comes from another page when one has anything to say
    const picked = [];
    for (const pass of [true, false]) for (const c of cands) { if (picked.length >= perSlot || picked.includes(c)) continue; if (pass && picked.some((p) => p.s.src === c.s.src)) continue; picked.push(c); }
    picked.sort((a, b) => a.s.src - b.s.src || a.s.start - b.s.start);
    leaf.fill = picked.map((c) => ({ ...address(c.s, index), carry: c.carry, agree: c.agree }));
    for (const c of picked) { used.add(c.s.id); seenText.add(normLine(c.s.text)); }
    if (!leaf.fill.length) leaf.gap = { kind: "unfilled", why: `no unit from ${leaf.sources.length} page(s) was free to fill ${leaf.label}` };
  }
  return tree;
}

/** The addressed snips nearest a gap: what the pages do say around what they do not. */
const contextOf = (n, index) => { const terms = new Set([...n.terms, ...(n.chain ?? [])]); return index.sentences.map((s) => ({ s, n: shared(terms, s.stems) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.s.id - b.s.id).slice(0, LIMITS.context).map((x) => address(x.s, index)); };
export const gapsOf = (tree, index = tree.index) => {
  const seen = new Map();
  return slotsOf(tree.root).filter((n) => n.gap).map((n) => {
    const context = contextOf(n, index);
    const key = context.map((c) => `${c.n}#${c.start}-${c.end}`).sort().join("|");
    const twin = key && seen.get(key);
    if (!twin) seen.set(key, n.id);
    return { slot: n.id, label: n.label, level: n.level, kind: n.gap.kind, why: n.gap.why, answered: n.gap.answered ?? null, section: sectionOf(tree, n.id)?.id ?? null, context, ...(twin ? { foldedInto: twin } : {}) };
  });
};

// ── the piece: units at addresses under headings, rendered per kind, nothing between them that asserts ────────────────────────────────────

const mark = (a) => (a.marked ? "[M]" : marker(a));
/** How one slot's units stand on the page, by kind: prose runs them into a paragraph; rows keep each on its own line (a table row gets the address as a
 * last column); a list bullets them; code keeps the verbatim lines in a fence with the addresses, in order, on the line after it. */
export const RENDER = Object.freeze({
  prose: (us) => us.map((a) => `${a.text} ${mark(a)}`).join(" "),
  rows: (us) => us.map((a) => (/^\|.*\|$/.test(a.text) ? `${a.text} ${mark(a)} |` : `${a.text} ${mark(a)}`)).join("\n"),
  list: (us) => us.map((a) => `- ${a.text.replace(/^[-*•]\s+/, "")} ${mark(a)}`).join("\n"),
  code: (us) => `\`\`\`\n${us.map((a) => a.text).join("\n")}\n\`\`\`\n${us.map(mark).join(" ")}`,
  records: (us) => us.map((a) => `${a.text} ${mark(a)}`).join("\n"),
});
const render = (kind, us) => (RENDER[kind] ?? RENDER.prose)(us);
/** One slot's block: its fill, then what was admitted into it, in order; a slot with neither shows its typed gap, never a paraphrase. */
const blockOf = (kind, n) => { const us = [...(n.fill ?? []), ...(n.admitted ?? []).flatMap((r) => r.sentences)]; return us.length ? render(kind, us) : n.gap?.kind === "one-source" ? ONE_PAGE_LINE(n.label, n.sources.length) : GAP_LINE(n.label); };
/** A section's blocks: one per leaf under it; a slot with children adds what was admitted to it as its own block; a child gap shows only once something was admitted into it. */
const blocksOf = (kind, n) => {
  const out = [];
  if (n.children?.length) { for (const c of n.children) out.push(...blocksOf(kind, c)); if (n.admitted?.length) out.push(render(kind, n.admitted.flatMap((r) => r.sentences))); } else out.push(blockOf(kind, n));
  for (const g of n.gaps ?? []) if (g.admitted?.length) out.push(...blocksOf(kind, g));
  return out;
};
export const sectionBody = (section, kind = "prose") => blocksOf(kind, section).filter(Boolean).join("\n\n");
const countOf = (section) => slotsOf(section).reduce((n, s) => n + (s.fill?.length ?? 0) + (s.admitted ?? []).reduce((m, r) => m + r.sentences.length, 0), 0);
export const sectionsOf = (tree) => [...tree.root.children, ...tree.root.gaps].map((s) => ({ id: s.id, title: title(s.label), slot: s.id, gap: !!s.gap, text: sectionBody(s, tree.kind), sentences: countOf(s), units: countOf(s) }));
const sourcesBlock = (index) => index.sources.length ? `\n## Sources\n\n${index.sources.map((s) => `- S${s.n} — ${s.name}${s.url && s.url !== s.name ? ` (${s.url})` : ""}`).join("\n")}\n` : "";

/** stitch({ passages, quotes, topic, voids, kind, units, depth, minSupport, index }) → { tree, index, sections, filled, gaps, text, sources, kind, calls: 0 }:
 * the piece as content alone fills it, and the gaps as the work order for the drawn layer. */
export function stitch({ passages = [], quotes = [], topic = "", voids = null, kind = "prose", units, depth = LIMITS.depth, minSupport = LIMITS.minSupport, perSlot = LIMITS.perSlot, index = null, wordClass } = {}) {
  const tree = fillSlots({ tree: voidHunt({ passages, quotes, topic, voids, kind, units, depth, minSupport, index, wordClass }), perSlot });
  const sections = sectionsOf(tree);
  const filled = leavesOf(tree.root).filter((l) => l.fill.length).map((l) => ({ slot: l.id, label: l.label, sentences: l.fill, units: l.fill }));
  const text = [`# ${clean(topic)}`, ...sections.flatMap((s) => [`## ${s.title}`, s.text])].join("\n\n") + `\n${sourcesBlock(tree.index)}`;
  return { tree, index: tree.index, sections, filled, gaps: gapsOf(tree), text, sources: tree.index.sources, kind, calls: 0 };
}
export const generateStitched = stitch;

const record = (job, detail, now) => { try { return EOT.append({ task: job.id, agent: "longform", stage: "reason", source: { kind: "tool", locator: `stitch:${detail.section ?? detail.slot ?? "tree"}:${detail.round ?? 0}`, meta: { sha256: sha(JSON.stringify(detail)), exit: 0, judge: "index" } }, unit: `${detail.section ?? detail.slot ?? "tree"}:${detail.round ?? 0}`, detail, now }); } catch { return null; } };
export const treeView = (n) => ({ id: n.id, level: n.level, label: n.label, terms: n.terms, found: n.found, count: n.count, sources: n.sources, gap: n.gap, fill: (n.fill ?? []).map((a) => ({ n: a.n, start: a.start, end: a.end })), children: (n.children ?? []).map(treeView), gaps: (n.gaps ?? []).map(treeView) });

/** stitchStart({ ask, topic, gathered, kind, units, root }) → the piece written as a longform file (the drawn mode's markers), every section on the EOT log as
 * fully facing, the tree on the log, the job for `admit`. Zero model calls. */
export function stitchStart({ ask = "", topic = "", gathered = {}, kind = "prose", units, root = null, depth = LIMITS.depth, minSupport = LIMITS.minSupport, now = Date.now(), wordClass } = {}) {
  const r = stitch({ passages: gathered?.passages ?? [], quotes: gathered?.quotes ?? [], voids: gathered?.voids ?? null, topic, kind, units, depth, minSupport, wordClass });
  if (!r.index.sentences.length) return { gap: { kind: "nothing-read", reason: `no clean ${kind} unit was read for ${clean(topic)}${gathered?.stop?.reason ? ` (${gathered.stop.reason})` : ""}` } };
  if (!r.tree.root.children.length) return { gap: { kind: "no-facet", reason: `${r.index.sentences.length} unit(s) from ${r.index.sources.length} page(s) share no facet that ${minSupport} pages speak to` } };
  const id = `longform-stitch-${slug(topic)}-${sha(`${ask}|${now}`).slice(0, 8)}`;
  const dir = root ?? taskDir(id);
  if (!dir) return { gap: { kind: "bad-address", reason: "no work tree for this piece" } };
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "longform.md");
  const outline = r.sections.map((s) => ({ id: s.id, title: s.title }));
  fs.writeFileSync(file, fileOf(topic, outline, Object.fromEntries(r.sections.map((s) => [s.id, s.text]))) + sourcesBlock(r.index));
  const job = { id, ask, topic, kind, file, tree: r.tree, index: r.index, outline, passages: gathered?.passages ?? [], calls: 0, admits: 0, startedAt: now, stitched: true };
  for (const s of r.sections) record(job, { kind: "longform-section", section: s.id, round: 0, sentences: s.units, supported: s.units, accepted: true, stitched: true, unitKind: kind, gaps: r.gaps.filter((g) => g.section === s.id).map((g) => ({ slot: g.slot, label: g.label, kind: g.kind })) }, now);
  record(job, { kind: "stitch-tree", unitKind: kind, tree: treeView(r.tree.root), gaps: r.gaps.map(({ context, ...g }) => g), sources: r.index.sources, furniture: r.index.furniture.length, units: r.index.sentences.length, refused: r.index.refused.length }, now);
  return { ok: true, job, path: file, text: r.text, tree: r.tree, sections: r.sections, filled: r.filled, gaps: r.gaps, sources: r.index.sources, kind, calls: 0 };
}

// ── admit: the drawn text taken back through the hunt; faces an address or carries the mark; what it raises becomes a child gap ──────────

/** The snip a drawn unit faces: the index unit that carries the most of its terms, when that is enough of them (LIMITS.carry of at least
 * LIMITS.minCarryStems terms, the bar the drawn mode's tests grade by). An optional `judge(units) → standings` can only demote. */
export function faceOf(text, index) {
  const stems = new Set(formsOf(text).filter((w) => w.length >= LIMITS.minTerm).map(index.stem));
  if (stems.size < LIMITS.minCarryStems) return null;
  let best = null, bestN = 0;
  for (const s of index.sentences) { const n = shared(stems, s.stems); if (n > bestN) { best = s; bestN = n; } }
  return best && bestN / stems.size >= LIMITS.carry ? { ...address(best, index), carry: bestN / stems.size } : null;
}

export async function admit({ tree, slot, drawn = "", index = tree.index, kind = tree.kind ?? "prose", job = null, judge = null, minSupport = tree.minSupport ?? LIMITS.minSupport, now = Date.now() } = {}) {
  const n = findSlot(tree, slot);
  if (!n) return { ok: false, gap: { kind: "unknown-slot", reason: `no slot ${slot}` } };
  const us = drawnUnits(kind, drawn);
  const standings = typeof judge === "function" ? await judge(us) : null;
  const placed = [], marked = [];
  us.forEach((text, i) => {
    const face = faceOf(text, index);
    const judged = standings ? standings[i] !== "unsupported" : true;
    if (face && judged) placed.push({ text, faces: face, n: face.n, start: face.start, end: face.end });
    else marked.push({ text, marked: true, why: face ? "the grader did not find it stated" : "no page unit carries its terms" });
  });
  const round = (n.admitted?.length ?? 0) + 1;
  // the admitted units are placed in the order drawn; a placed one carries its snip's address, a marked one the model's mark
  const ordered = us.map((t) => placed.find((p) => p.text === t) ?? marked.find((m) => m.text === t));
  n.admitted = [...(n.admitted ?? []), { round, sentences: ordered, units: ordered }];
  if (n.gap && ordered.length) n.gap = { ...n.gap, answered: `round ${round}: ${placed.length} facing, ${marked.length} marked` };
  // what the drawn text raises: a term it names that enough pages speak to and that no unit standing in the slot (a fill or a faced snip) carries
  const topicStems = new Set(formsOf(tree.topic).map(index.stem));
  const standing = new Set([...(n.fill ?? []).map((a) => a.id), ...placed.map((p) => p.faces.id)].flatMap((id) => [...index.sentences[id].stems]));
  const own = new Set([...topicStems, ...n.terms, ...(n.chain ?? [])]);
  const raised = new Map();
  for (const t of us) for (const k of new Set(formsOf(t).filter((w) => w.length >= LIMITS.minTerm).map(index.stem))) if (!own.has(k) && !standing.has(k) && index.isNoun(k)) raised.set(k, (raised.get(k) ?? 0) + 1);
  const newGaps = [];
  for (const [k] of [...raised].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    const mine = index.sentences.filter((s) => s.stems.has(k));
    const srcs = new Set(mine.map((s) => s.src));
    if (mine.length < minSupport || srcs.size < minSupport || newGaps.length >= LIMITS.gapsPerLevel) continue;
    if ((n.gaps ?? []).some((g) => g.seed === k) || (n.children ?? []).some((c) => c.seed === k)) continue;
    newGaps.push(node({ id: `${n.id}.g${(n.gaps?.length ?? 0) + newGaps.length + 1}`, level: n.level + 1, label: index.form(k), terms: [k], seed: k, chain: [...(n.chain ?? []), ...n.terms], sentences: mine.map((s) => s.id), sources: [...srcs].sort(), count: mine.length, found: { by: "drawn", round, sentences: mine.length, sources: srcs.size }, gap: { kind: "raised", why: `the drawn text names ${index.form(k)}; ${srcs.size} pages speak to it; the slot does not state it` } }));
  }
  n.gaps = [...(n.gaps ?? []), ...newGaps];
  const section = sectionOf(tree, n.id);
  let body = null;
  if (section) { body = sectionBody(section, kind); if (job?.file) { try { const applied = applySection(fs.readFileSync(job.file, "utf8"), section.id, body); if (applied.ok) fs.writeFileSync(job.file, applied.file); } catch { /* the file is a projection; the log is the record */ } } }
  if (job) {
    job.admits = (job.admits ?? 0) + 1;
    record(job, { kind: "longform-admit", unitKind: kind, slot: n.id, section: section?.id ?? null, round, sentences: us.length, facing: placed.length, marked: marked.length, newGaps: newGaps.map((g) => ({ slot: g.id, label: g.label })) }, now);
    // the same admit as a section grade, keyed by slot and round, so the residue ledger counts the drawn layer's marked share apart from the stitched sections
    record(job, { kind: "longform-section", section: `${n.id}#admit${round}`, round: 0, sentences: us.length, supported: placed.length, accepted: true, admitted: true, unitKind: kind, slot: n.id }, now);
  }
  const ctx = (g) => ({ slot: g.id, label: g.label, level: g.level, kind: g.gap.kind, why: g.gap.why, section: section?.id ?? null, context: contextOf(g, index) });
  return { ok: true, tree, kind, slot: n.id, section: section?.id ?? null, body, placed, marked, newGaps: newGaps.map(ctx), gaps: gapsOf(tree, index), calls: 0 };
}
export const admitDrawn = admit;

/** The drawn layer's ledger from the log: per admit, how much faced and how much stayed the model's own. */
export function admitLedger({ task } = {}) {
  let events = [];
  try { events = EOT.read(task)?.events ?? []; } catch { events = []; }
  const runs = events.filter((e) => e?.detail?.kind === "longform-admit").map((e) => ({ slot: e.detail.slot, round: e.detail.round, sentences: e.detail.sentences, facing: e.detail.facing, marked: e.detail.marked, share: e.detail.sentences ? e.detail.marked / e.detail.sentences : null, newGaps: e.detail.newGaps ?? [] }));
  const total = runs.reduce((a, r) => ({ sentences: a.sentences + r.sentences, facing: a.facing + r.facing, marked: a.marked + r.marked }), { sentences: 0, facing: 0, marked: 0 });
  return { task, admits: runs.length, total, share: total.sentences ? total.marked / total.sentences : null, runs };
}
