// adapters/text/telling-grammar.en.js — the ENGLISH grammar for the research record's telling. Handle: the adapter's own grammar.
//
// The lens (organs/cube-telling.js) is MEDIUM-BLIND: it emits propositions { type, slots, grounds } and never a word of any language.
// This file is how ENGLISH realizes them: EOT → English grammar → NL. Swap the file and the lens is unchanged (LAVAR.md §8: the kernel is
// medium-blind and the grammar lives in the adapter). Copied source bytes are never translated: a quotation stays in its own language.
//
// What English contributes, and where each piece comes from:
//   constructions   one per proposition type, below — the only English words written here (giver: the author, 2026-10-14)
//   lists, dates    Unicode CLDR through Intl (ListFormat.formatToParts, DateTimeFormat) — received, every locale the runtime carries
//   plural choice   Unicode CLDR plural rules through Intl.PluralRules; the English forms are the lexicon's
//   numbers         CMOS 9.2 (zero to nine spelled out) and 9.7 (a sentence with any count ≥ 10 sets every count in numerals)
//   quotation marks “ ” (CLDR delimiters for en); logical punctuation keeps a copied quotation's bytes exact (CMOS 6.9, alternative system)
//   laws            the English-specific prose laws (CMOS 9.5 no numeral opener, 9.2/9.7, a/an, agreement) beside the universal ones
import { seg, sentence, num } from "../../organs/prose-laws.js";

export const LANG = "en";
export const GIVER = "English construction table v1 (author, 2026-10-14); CLDR via Intl for lists, dates and plural categories; CMOS 17th ed.";
export const QUOTES = Object.freeze({ open: "“", close: "”", inner: ["‘", "’"] });

const F = seg.frame;
const V = seg.value;
const plural = new Intl.PluralRules("en");
const pick = (k, one, other) => (plural.select(k) === "one" ? one : other);
const n = (k) => ({ ...V(num(k)), count: k });
const lf = new Intl.ListFormat("en", { type: "conjunction" });
/** A list of segment-arrays joined by CLDR's English conjunction pattern; the joiners are CLDR values, not frame words. */
export function list(items) {
  if (!items.length) return [];
  const parts = lf.formatToParts(items.map((_, i) => `\u0000${i}\u0000`));
  return parts.flatMap((p) => (p.type === "element" ? items[Number(p.value.replace(/\u0000/g, ""))] : [{ ...V(p.value), cldr: true }]));
}
const dfLong = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
const dfMonth = new Intl.DateTimeFormat("en", { year: "numeric", month: "long", timeZone: "UTC" });
const date = (iso) => V(dfLong.format(new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)));
const month = (ym) => V(dfMonth.format(new Date(`${ym}-15T12:00:00Z`)));

const Cap = (segs) => { const [h, ...r] = segs; if (!h) return segs; return [{ ...h, t: h.kind === "source" ? h.t : h.t.charAt(0).toUpperCase() + h.t.slice(1) }, ...r]; };
// CMOS 9.7: within one sentence, if any count needs numerals (10 or more), every count is set in numerals.
const consistent = (segs) => (segs.some((x) => x.count >= 10) ? segs.map((x) => (x.count != null ? { ...x, t: Number(x.count).toLocaleString("en-US") } : x)) : segs);
export const finish = (segs, grounds) => sentence(Cap(consistent(segs)), grounds);
const q = (s) => [F(QUOTES.open), s, F(QUOTES.close), ...(/[.!?]$/.test(s.t) ? [] : [F(".")])];
const qmid = (s) => [F(QUOTES.open), s, F(QUOTES.close)];

/**
 * The constructions. Each takes the proposition's RESOLVED slots (figures, pages and spans already turned into segments by the lens's
 * resolver) and returns segments. `null` = this construction cannot say it (the cell goes silent, never filled with something nearby).
 */
export const CONSTRUCTIONS = {
  refused: ({ hosts }) => [n(hosts.length), F(` ${pick(hosts.length, "publisher", "publishers")} refused the request for ${pick(hosts.length, "its page", "their pages")}: `), ...list(hosts), F(".")],
  search_empty: ({ query }) => [F("The search for “"), ...query, F("” returned nothing.")],
  question_names: ({ figs }) => [F("The question names "), ...list(figs), F(`, and the pages name ${pick(figs.length, "it", "them")} too.`)],
  question_names_none: () => [F("Nothing the question names recurs in the pages as a figure.")],
  collection: ({ read, search, hand }) => [F("Of the "), n(read), F(" pages read, "), n(search), F(" came from a search built from the question’s own words and "), n(hand), F(" were added by hand.")],
  declined_names: ({ k }) => [F("Of the capitalised words in these pages, "), n(k), F(" were declined as figures: they are dates, or never act in any claim.")],
  most_named: ({ items, total }) => [F("The figures named on the most pages are "), ...list(items.map((it, i) => [...it.fig, F(" ("), n(it.pages), ...(i ? [] : [F(" of "), n(total)]), F(")")])), F(".")],
  figures_total: ({ k, single }) => [F("In all, "), n(k), F(" figures recur and act in some claim; "), ...(single ? [n(single), F(" of them appear on only one page.")] : [F("every one of them appears on more than one page.")])],
  unsorted: ({ claims, unsorted }) => [F("Of "), n(claims), F(" claims, "), n(unsorted), F(" name no figure in any group.")],
  groups: ({ k }) => [n(k), F(` ${pick(k, "group", "groups")} of figures ${pick(k, "is", "are")} named together more often than chance allows.`)],
  groups_none: () => [F("No group of figures is named together more often than chance allows.")],
  largest_groups: ({ groups }) => [...groups.flatMap((g, i) => [...(i ? [F("; the next joins ")] : [F(groups.length === 1 ? "The group joins " : "The largest joins ")]), ...list(g.figs), F(" ("), n(g.claims), F(` ${pick(g.claims, "claim", "claims")})`)]), F(".")],
  holdings: ({ pages, bytes, passages }) => [F("The record holds "), n(pages), F(" pages, "), n(bytes), F(" bytes of text in "), n(passages), F(" passages, each pinned by a hash of its exact bytes.")],
  pub_range: ({ from, to, undated }) => [F("Their publication dates run from "), date(from), F(" to "), date(to), ...(undated ? [F("; "), n(undated), F(` ${pick(undated, "page declares", "pages declare")} none`)] : []), F(".")],
  voices: ({ claims, own, reported, quoted }) => [F("Of "), n(claims), F(" claims, "), n(own), F(" are in a page’s own voice and "), n(reported), F(" report someone else, "), n(quoted), F(" of them in quotation marks.")],
  page_says: ({ page, quote }) => [F("As "), ...page, F(" puts it, "), ...qmid(quote), F(".")],
  both_weigh: ({ a, b }) => [F("Two readings weigh the same here: "), ...a, F("; and "), ...b, F(".")],
  both: ({ a, b }) => [F("The record cannot choose between two readings: "), ...a, F("; or "), ...b, F(".")],
  nothing_carries: () => [F("Nothing in this record carries what the question asks: none of its figures, kind of answer, relation or words appear in the pages.")],
  said: ({ who, verb, quote }) => [who, F(" "), verb, F(", "), ...q(quote)],
  said_that: ({ who, verb, clause }) => [who, F(" "), verb, F(" that "), clause, F(".")],
  collapses: ({ pairs }) => [n(pairs), F(` ${pick(pairs, "pair", "pairs")} of pages that look separate share their wording or cite each other, and each pair counts once.`)],
  agree: ({ k, quote }) => [n(k), F(" independent pages carry the same claim, one of them in these words: "), ...qmid(quote), F(".")],
  agree_none: () => [F("No claim recurs, in the same terms, on two independent pages.")],
  differ: ({ subject, pageA, quoteA, pageB, quoteB }) => [F("About "), ...subject, F(", the pages add to each other rather than conflict: "), ...pageA, F(" has "), ...qmid(quoteA), F(", and "), ...pageB, F(" has "), ...qmid(quoteB), F(".")],
  undated_claims: () => [F("No claim carries a date of its own, so the dates here are when pages were published, not when claims held.")],
  periods: ({ items, undated }) => [F("The pages fall into "), n(items.length), F(` ${pick(items.length, "period", "periods")}: `), ...list(items.map((it) => [month(it.month), F(" ("), n(it.pages), F(` ${pick(it.pages, "page", "pages")})`)])), ...(undated ? [F(", with the rest undated")] : []), F(".")],
  fixity: ({ held, reencoded, changed, unreached }) => [F("On a second fetch of every page, the cited bytes held where they were on "), n(held), F(` ${pick(held, "page", "pages")}`), ...(reencoded ? [F(" ("), n(reencoded), F(` ${pick(reencoded, "page", "pages")} changed ${pick(reencoded, "its", "their")} markup but not ${pick(reencoded, "its", "their")} text)`)] : []), ...(changed ? [F(", and "), n(changed), F(` ${pick(changed, "page", "pages")} changed`)] : []), ...(unreached ? [F(", and "), n(unreached), F(" could not be reached")] : []), F(".")],
  own_voice: ({ pages, own }) => (own === pages ? [F("Every page speaks mostly in its own voice.")] : own === 0 ? [F("No page speaks mostly in its own voice.")] : [F("Of "), n(pages), F(" pages, "), n(own), F(` ${pick(own, "speaks", "speak")} mostly in ${pick(own, "its", "their")} own voice.`)]),
  floors: ({ items }) => [F("The pages that quote people give the floor to different voices: "), ...items.flatMap((it, i) => [...(i === 0 ? [] : i === items.length - 1 ? [F("; and ")] : [F("; ")]), ...it.page, F(" quotes "), ...list(it.figs)]), F(".")],
  silences: ({ page, figs }) => [F("Silences show too: "), ...page, F(" never names "), ...list(figs), F(`, ${pick(Math.min(3, figs.length), "whom", "all of whom")} at least two other pages name.`)],
  camps: ({ items }) => [F("The pages divide into "), n(items.length), F(` ${pick(items.length, "camp", "camps")} by what they center on: `), ...items.flatMap((it, i) => [...(i === 0 ? [] : i === items.length - 1 ? [F("; and ")] : [F("; ")]), ...list(it.figs), F(" for "), ...list(it.pages)]), F(".")],
  camps_none: () => [F("The pages do not divide into camps the record can detect.")],
  camp_one: ({ figs, pages, total, rest }) => [F("Of the "), n(total), F(" pages, "), n(pages.length), F(` ${pick(pages.length, "forms", "form")} one camp by the figures they name, centered on `), ...list(figs), F(": "), ...list(pages), ...(rest ? [F("; the other "), n(rest), F(` ${pick(rest, "stands", "stand")} apart`)] : []), F(".")],
  kinds_challenged: ({ held, tried }) => [...(held === tried ? [F("Every group of figures found holds")] : [F("Of "), n(tried), F(` ${pick(tried, "group", "groups")} of figures found, `), n(held), F(` ${pick(held, "holds", "hold")}`)]), F(" when tested against random sets of the same size and against the same figures with their pairings shuffled.")],
  ground_meter: ({ moved, steady, unmeasured }) => [F("Page by page in order of publication, "), ...(moved ? [n(moved), F(` ${pick(moved, "page", "pages")} brought wording the pages before ${pick(moved, "it", "them")} did not predict`)] : [F("no page brought wording the pages before it did not predict")]), ...(steady.length ? [F("; "), ...list(steady), F(" kept closer to it than chance")] : []), ...(unmeasured ? [F("; the first "), n(unmeasured), F(" had nothing before them")] : []), F(".")],
  regime: ({ starts }) => [F("Taken whole, the wording shifts "), ...(starts.length === 1 ? [F("once")] : [n(starts.length), F(" times")]), F(": a new stretch begins with "), ...list(starts.map((x) => [...x.page, ...(x.date ? [F(" ("), date(x.date), F(")")] : [])])), F(".")],
  regime_one: () => [F("Taken whole, the wording holds as one stretch throughout.")],
  contested: ({ k }) => (k ? [n(k), F(` ${pick(k, "claim appears", "claims appear")} with opposite polarity on independent pages.`)] : [F("No claim is contradicted between independent pages.")]),
};

/** Narrow a reported clause for this language's complementiser: "said that X" — the source's own "that" is left out by narrowing. */
export const COMPLEMENTISER = /^that\s+/i;

/** English-specific laws (the universal ones live in prose-laws.js). Returns violations [{ law, detail }]. */
export function lawsOf(s) {
  const v = [];
  const text = s.text;
  if (/^\s*[“"(]?\d/.test(text)) v.push({ law: "PL3", detail: text.slice(0, 12) });
  const numeralMode = s.segs.some((x) => x.count >= 10);
  for (const x of s.segs.filter((y) => (y.kind === "frame" || y.kind === "value") && !y.cldr)) {
    if (!(numeralMode && x.count != null)) for (const m of x.t.matchAll(/(?<![\d,.\-–:])\b([0-9])\b(?![\d,.\-–:%])/g)) v.push({ law: "PL4", detail: `“${m[0]}” in “${x.t.trim()}”` });
    for (const m of x.t.matchAll(/\b(a|an) ([\p{L}]+)/giu)) {
      const want = /^[aeiou]/i.test(m[2]) ? "an" : "a";
      if (m[1].toLowerCase() !== want && !/^(one|uni|use|eu|hour|honest|honou?r)/i.test(m[2])) v.push({ law: "PL6", detail: m[0] });
    }
    if (/\b(one|1) [\p{L}]+s (are|were|have|declare|appear|carry|name|speak)\b/iu.test(x.t)) v.push({ law: "PL5", detail: x.t.trim() });
  }
  return v;
}

export const CAUSAL = /\b(because|therefore|thus|hence|consequently|as a result|so that|led to|caused|causes|due to)\b/i;
export const MACHINERY = /\b(atoms?|referents?|pinax|facets?|terrains?|ladder|holons?|spans?|sha256|EOT|GFP|nulls?)\b/;
export const MAX_FRAME_WORDS = 35;

/**
 * The declared frame words, PER CONSTRUCTION: the literal text inside each construction's own source (quoted strings, and template
 * strings with their ${…} expressions removed), so the set can never drift from what the construction writes. PL14 checks a realized
 * sentence against its own construction's set.
 */
export function wordsOf(fn) {
  const src = String(fn);
  const quoted = [...src.matchAll(/"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g)].map((m) => m[1] ?? m[2]);
  const tmpl = [...src.matchAll(/`((?:\\.|[^`\\])*)`/g)].map((m) => m[1].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, " "));
  return new Set([...quoted, ...tmpl, QUOTES.open, QUOTES.close].join(" ").match(/[\p{L}][\p{L}'’-]*/gu)?.map((w) => w.toLowerCase()) ?? []);
}
export const FRAME_WORDS = Object.fromEntries(Object.entries(CONSTRUCTIONS).map(([k, fn]) => [k, wordsOf(fn)]));

export const TITLES = Object.freeze({ Void: "What is missing", Entity: "Who is named", Kind: "What is named together", Field: "What was read", Link: "Who says what", Network: "What holds across pages", Atmosphere: "When, and whether it held", Lens: "Where each page stands", Paradigm: "How the pages divide" });

export default Object.freeze({ titles: TITLES, lang: LANG, giver: GIVER, quotes: QUOTES, constructions: CONSTRUCTIONS, list, finish, lawsOf, causal: CAUSAL, machinery: MACHINERY, maxFrameWords: MAX_FRAME_WORDS, frameWords: FRAME_WORDS, complementiser: COMPLEMENTISER });
