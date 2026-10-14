// callimachus.js — the research record, read up the ladder, with no model. Spec: CALLIMACHUS draft 1 (2026-10-14), §6–§9. Increments B + C
// (atoms, located/reported by embedding, independence by shared bytes, standing) and the first lenses (claim sheet, dossier).
// Pure: no IO, no clock, no model. Fixity is pinax.js; the instruments are the engine's own (relations.js, surfaces.js, spans.js, web.js).
//
//   queriesFrom(question)                  → round-0 queries: the question's own tokens, quoted phrases kept whole (§6.1)
//   readCorpus(records, { question })      → Record { entities, vocab, atoms, claims, chains, absences, presupposition, ladder }
//   claimSheet(record) / dossier(record)   → { text, drops, provenance } — lenses: select, order, frame; never add (L10)
//
// The walls (pinned in callimachus.test.mjs):
//   EVERY ATOM IS A SPAN (L4, L5) — an atom's text is never stored: lenses slice it from the Pinax layer by its versioned address. No kind,
//     no render.
//   REPORTED BY STRUCTURE, NOT BY A VERB LIST (§7.4) — an atom is `reported` when its sentence sits in a quotation region (Unicode quotation
//     punctuation; giver: the Unicode Character Database, classes Pi/Pf, plus U+0022 toggling) or when the object of its Link itself binds
//     a Link (an embedding). The outer verb is carried verbatim as the attitude; it is never classified.
//   POLARITY'S GIVER IS STAMPED — relations.js NEGATION_WORDS is an unnamed giver today; every atom says so (§7.4).
//   CHAINS, NOT URLS (§7.5) — two atoms are one chain when their sentences share winnowed fingerprints past SHARE_FLOOR, when one source
//     hyperlinks the other, or when they are two versions of one URL. `independent_count` counts chains.
//   NO SIMILARITY — same-claim is exact: same subject referent, same predicate surface, same polarity, same object form.
//
// DECLARED, not measured (Constitution II.11, P9) — first values, giver: the author, 2026-10-14; a shuffled-corpus null replaces them:
//   WINNOW_K = 24 chars, WINNOW_W = 8, SHARE_FLOOR = 0.5 (Schleimer, Wilkerson & Aiken 2003 for the method; the numbers are ours).
//   MIN_ENTITY_SENTENCES = 2 — a surface is admitted as a referent only on recurrence (the Born gate's first test) AND only if it fills a
//   subject or object slot of at least one Link (a stand-in for the consequence test: page furniture and ticker lists name things that
//   do nothing). Not yet the full Born gate (no void-mask null); every entity says `gate: "recurrence+consequence"`.
import { extractReadable } from "./web.js";
import { splitSentences, deriveAbbreviations } from "../adapters/text/spans.js";
import { extractSurfaces, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../adapters/text/material.js";
import { offsetMap, convertOffset, formatAddress } from "./pinax.js";
import { bylineOf } from "./byline.js";
import { isIndexUrl, footnotesOf, marksOf, trailOf } from "./index-source.js";

export const WINNOW_K = 24;
export const WINNOW_W = 8;
export const SHARE_FLOOR = 0.5;
export const MIN_ENTITY_SENTENCES = 2;
// An attitude verb is EARNED, never listed: one-sided binomial against this corpus's own base rate (quote adjacency, clausal objects).
// ATTITUDE_ALPHA giver: Fisher's 0.01 convention (1925), declared; a permutation null over shuffled quote positions replaces it.
export const ATTITUDE_ALPHA = 0.01;
// Giver: the author, 2026-10-14 — English attribution sits within three words of the mark (“…,” said X / “…,” X said / X said, “…”).
export const QUOTE_FRAME_WORDS = 3;
export const POLARITY_GIVER = "relations.js NEGATION_WORDS (unnamed)";
export const ENTITY_GATE = "recurrence+consequence";

const dec = new TextDecoder();
const textOf = (rec) => dec.decode(rec.layers.text);

/** The extractor recipe: web.js extractReadable, its text face. The runner hashes web.js and records it as extractor_sha256. */
export const extractText = (html) => extractReadable(html).text;

/** Document time and declared hyperlinks, read from the RAW markup: the author's own declarations (§7.2). */
export function declaredOf(rawHtml) {
  const h = String(rawHtml);
  const meta = (p) => h.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${p}["'][^>]*content=["']([^"']+)["']`, "i"))?.[1]
    ?? h.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${p}["']`, "i"))?.[1] ?? null;
  const published = meta("article:published_time") ?? meta("datePublished") ?? h.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1] ?? h.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ?? null;
  const modified = meta("article:modified_time") ?? meta("dateModified") ?? h.match(/"dateModified"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const links = [...h.matchAll(/<a\s[^>]*href=["'](https?:\/\/[^"'#]+)/gi)].map((m) => m[1]);
  return { published, modified, links: [...new Set(links)] };
}

// ---- collection: queries from the question itself (§6.1, round 0) -----------------------------------------------------------------

export function queriesFrom(question) {
  const q = String(question ?? "");
  const phrases = [...q.matchAll(/["“]([^"”]+)["”]/g)].map((m) => m[1]);
  const rest = q.replace(/["“][^"”]+["”]/g, " ").split(/[^\p{L}\p{N}'-]+/u).filter(Boolean);
  return [[...phrases.map((p) => `"${p}"`), ...rest].join(" ").trim()];
}

// ---- Field: passages, sentences, quotation regions (§7.2) ---------------------------------------------------------------------------

/** Quotation regions as UTF-16 [start,end) ranges: Pi opens, Pf closes, U+0022 toggles. Unclosed openers run to the paragraph end. */
export function quotationRegions(text) {
  const out = [];
  let open = null, straight = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\n" && text[i + 1] === "\n") { if (open != null) out.push([open, i]); if (straight != null) out.push([straight, i]); open = straight = null; continue; }
    if (/\p{Pi}/u.test(c)) { if (open == null) open = i; }
    else if (/\p{Pf}/u.test(c) && c !== "’") { if (open != null) { out.push([open, i + 1]); open = null; } }
    else if (c === "”" || (c === "’" && open != null && text[open] === "‘")) { if (open != null) { out.push([open, i + 1]); open = null; } }
    else if (c === '"') { if (straight == null) straight = i; else { out.push([straight, i + 1]); straight = null; } }
  }
  if (open != null) out.push([open, text.length]);
  return out;
}

const overlaps = (regions, s, e) => regions.some(([a, b]) => a < e && s < b);

/**
 * The attribution frame of one quotation region (§7.4 applied to quotation): the clause right after the closing mark (to the next sentence
 * end or line break), else the clause right before the opening mark. In it, the first token in the MEASURED verb vocabulary is the attitude;
 * the giver is the capitalised run right after that verb (inverted: “…,” said Rep. Smith) or the run / closed-class word right before it
 * (“…,” she said; Smith said: “…”). No speech-verb list: `verbs` is relations.js's own measurement over this corpus.
 */
export function attributionOf(text, [qs, qe], { verbs, functionWords, abbreviations = new Set(), isReferent = () => false }) {
  const W = /[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu;
  const tokensIn = (a, b) => [...text.slice(a, b).matchAll(W)].map((m) => ({ w: m[0].replace(/[.’']+$/u, ""), raw: m[0], u: a + m.index }));
  const cap = (t) => /^\p{Lu}/u.test(t.w) && !functionWords.has(t.w.toLowerCase());
  // Name-runs in a token list: maximal runs of capitalised, non-closed-class tokens; a token that ends a sentence (a period that is not one
  // of this corpus's own abbreviations) closes the run after it.
  const runsOf = (toks) => {
    const runs = [];
    let cur = [];
    for (const t of toks) {
      if (cap(t)) { cur.push(t); if (/\.$/.test(t.raw) && !abbreviations.has(t.raw.toLowerCase()) && !abbreviations.has(t.w.toLowerCase())) { runs.push(cur); cur = []; } }
      else if (cur.length) { runs.push(cur); cur = []; }
    }
    if (cur.length) runs.push(cur);
    return runs.filter((r) => r.length);
  };
  const strip = (r) => { while (r.length > 1 && (abbreviations.has(r[0].raw.toLowerCase()) || abbreviations.has(r[0].w.toLowerCase()))) r = r.slice(1); return r; };
  const pick = (runs) => runs.map(strip).find((r) => isReferent(r.map((t) => t.w).join(" "))) ?? null;
  // The name inside a title chain is what follows its last title abbreviation ("Chairman Rep. Brett Guthrie" → "Brett Guthrie").
  // With no title in the chain, the name is its first run, before any joiner ("Vern Buchanan of Florida" → "Vern Buchanan").
  const nameOf = (run) => {
    let k = -1;
    run.forEach((t, j) => { if (j < run.length - 1 && (abbreviations.has(t.raw.toLowerCase()) || abbreviations.has(t.w.toLowerCase()))) k = j; });
    const tail = strip(run.slice(k + 1));
    const cut = tail.findIndex((t) => !cap(t));
    return cut > 0 ? tail.slice(0, cut) : tail;
  };
  // Extend a run through closed-class joiners into the next run ("House Energy and Commerce Committee Chairman Rep. Brett Guthrie").
  const chainFrom = (toks, start) => {
    const run = [];
    let j = start;
    const broken = (k) => k > start && /[,;:()\[\]“”"]/.test(text.slice(toks[k - 1].u + toks[k - 1].raw.length, toks[k].u));
    while (j < toks.length) {
      if (broken(j)) break;
      if (cap(toks[j])) { run.push(toks[j]); j++; continue; }
      if (run.length && j + 1 < toks.length && functionWords.has(toks[j].w.toLowerCase()) && /^[a-z]+$/.test(toks[j].raw) && cap(toks[j + 1])) { run.push(toks[j]); j++; continue; }
      break;
    }
    return run.filter((t) => cap(t) || run.indexOf(t) < run.length - 1);
  };
  const ok = (run) => run && run.length && !isCalendarSurface(run.map((t) => t.w).join(" "));
  const done = (run, v, side, pronoun = false) => {
    const gs = run[0].u, last = run.at(-1), ge = last.u + last.w.length;
    return { side, giverU: gs, giverEnd: ge, giver: text.slice(gs, ge), verbU: v.u, verb: v.w, pronoun };
  };
  const tryFrame = (a, b, side) => {
    const toks = tokensIn(a, b);
    const i = toks.findIndex((t) => verbs.has(t.w.toLowerCase()));
    if (i < 0) return null;
    const v = toks[i];
    if (side === "after") {
      // “…,” Thune said / “…,” Sen. Ed Markey, a Democrat from Massachusetts, said: the run that OPENS the frame is the speaker.
      if (i > 0) { const open = chainFrom(toks, 0); if (ok(open) && open.length) { const r = nameOf(open); if (ok(r)) return done(r, v, side); } }
      // “…,” said Rep. Brett Guthrie: the chain right after the verb, its name after the last title.
      const next = chainFrom(toks, i + 1);
      if (ok(next) && next.length) { const r = nameOf(next); if (ok(r)) return done(r, v, side); }
    } else {
      // Rep. Vern Buchanan of Florida … said, “…”: the clause's first name-run is its subject.
      const first = toks.findIndex((t) => cap(t));
      if (first >= 0 && first < i) { const r = nameOf(chainFrom(toks, first)); if (ok(r)) return done(r, v, side); }
    }
    if (i > 0 && functionWords.has(toks[i - 1].w.toLowerCase())) return done([toks[i - 1]], v, side, true);
    return null;
  };
  // The frame ends at the next sentence end that is not an abbreviation.
  let afterEnd = text.length;
  const re = /[.!?](?=\s|$)|\n/g;
  re.lastIndex = qe;
  for (let m; (m = re.exec(text)); ) {
    if (m[0] === "." ) { const word = text.slice(0, m.index + 1).match(/(\S+)$/)?.[1]?.toLowerCase(); if (word && abbreviations.has(word.replace(/^[^\p{L}]+/u, ""))) continue; }
    afterEnd = m.index; break;
  }
  const beforeText = text.slice(0, qs);
  const lastStop = Math.max(beforeText.lastIndexOf("\n"), beforeText.search(/[.!?]\s[^.!?]*$/) >= 0 ? beforeText.search(/[.!?]\s[^.!?]*$/) + 1 : -1);
  // A quotation that ends its own sentence (terminal punctuation inside the marks) has no attribution after it: what follows is a new
  // sentence. Only the clause before it can frame it.
  const endsSentence = /[.!?]\s*[”"’]?\s*$/.test(text.slice(qs, qe));
  return (endsSentence ? null : tryFrame(qe, Math.min(afterEnd, qe + 160), "after")) ?? tryFrame(Math.max(lastStop + 1, qs - 160), qs, "before");
}

// ---- Entity (§7.3): referents by recurrence; names corefer by the engine's own namesCorefer ----------------------------------------

// Month and weekday names are dates, not figures. Read from Unicode CLDR through ICU (Intl), every locale the runtime carries: a received
// convention used for form only (L7). Giver: Unicode CLDR.
const CALENDAR = (() => {
  const out = new Set();
  const locales = typeof Intl.supportedValuesOf === "function" ? ["en", "es", "fr", "de", "it", "pt", "ru", "el", "ar", "hi", "zh", "ja"] : ["en"];
  for (const loc of locales) {
    for (const style of ["long", "short"]) {
      try {
        const mf = new Intl.DateTimeFormat(loc, { month: style, timeZone: "UTC" });
        const wf = new Intl.DateTimeFormat(loc, { weekday: style, timeZone: "UTC" });
        for (let m = 0; m < 12; m++) out.add(mf.format(new Date(Date.UTC(2026, m, 15))).toLowerCase().replace(/\.$/, ""));
        for (let d = 0; d < 7; d++) out.add(wf.format(new Date(Date.UTC(2026, 5, 7 + d))).toLowerCase().replace(/\.$/, ""));
      } catch { /* a locale the runtime lacks is skipped, not guessed */ }
    }
  }
  return out;
})();
/**
 * Title abbreviations measured from the corpus (Rep., Sen., Asm., Gov.): a capitalised token always written with a period, always followed by
 * a capitalised word (one occurrence suffices: the other three tests carry it), and shorter than this corpus's median capitalised word. spans.js deriveAbbreviations' length bar (the
 * 10th-percentile token, ~2 letters on English) excludes three-letter titles by construction — its own comment names the gap.
 */
export function titleAbbreviations(text) {
  const withDot = new Map(), followedCap = new Map(), bare = new Map(), capLens = [];
  for (const m of text.matchAll(/(\p{Lu}[\p{L}]*)\.(\s+)(\S)?/gu)) { withDot.set(m[1], (withDot.get(m[1]) ?? 0) + 1); if (m[3] && /\p{Lu}/u.test(m[3])) followedCap.set(m[1], (followedCap.get(m[1]) ?? 0) + 1); }
  for (const m of text.matchAll(/\p{Lu}[\p{L}]*(?!\.)\b/gu)) { bare.set(m[0], (bare.get(m[0]) ?? 0) + 1); capLens.push(m[0].length); }
  capLens.sort((a, b) => a - b);
  const median = capLens[Math.floor(capLens.length / 2)] ?? 0;
  const out = new Set();
  for (const [t, n] of withDot) if (n >= 1 && followedCap.get(t) === n && !bare.get(t) && t.length < median) out.add(t);
  return out;
}

export const isCalendarSurface = (s) => String(s).split(/\s+/).every((w) => CALENDAR.has(w.toLowerCase().replace(/[.,]$/, "")));

function admitEntities(perSource) {
  const tally = new Map();
  for (const { pinax, surfaces } of perSource) {
    for (const s of surfaces) {
      const k = s.surface;
      const t = tally.get(k) ?? { surface: k, sentences: 0, sources: new Set() };
      t.sentences += s.sentences; t.sources.add(pinax);
      tally.set(k, t);
    }
  }
  // Two runs where one extends the other (A ⊂ A B): if the longer recurs as often, the shorter only ever rides inside it (Metropolitan ⊂
  // Metropolitan Transportation Authority) and is dropped; if the shorter recurs MORE, the extension is an accident of adjacency (a name run
  // into a headline word: "Sunshine Protection Act Heads") and the longer is dropped. Recurrence decides; no list.
  const all = [...tally.values()].filter((t) => !isCalendarSurface(t.surface));
  const extendsOf = (o, t) => o !== t && o.surface.startsWith(t.surface + " ");
  const kept = all.filter((t) => !all.some((o) => extendsOf(o, t) && o.sentences >= t.sentences) && !all.some((o) => extendsOf(t, o) && o.sentences > t.sentences));
  const admitted = kept.filter((t) => t.sentences >= MIN_ENTITY_SENTENCES).sort((a, b) => b.sentences - a.sentences || b.surface.length - a.surface.length);
  const referents = [];
  for (const t of admitted) {
    const home = referents.find((r) => r.surfaces.some((s) => s === t.surface || namesCorefer(s, t.surface)));
    if (home) { home.surfaces.push(t.surface); home.sentences += t.sentences; t.sources.forEach((p) => home.sources.add(p)); if (t.surface.length > home.name.length && t.sentences * 2 >= home.top) home.name = t.surface; }
    else referents.push({ id: null, name: t.surface, top: t.sentences, surfaces: [t.surface], sentences: t.sentences, sources: new Set(t.sources), gate: ENTITY_GATE });
  }
  referents.forEach((r, i) => { r.id = `r_${String(i).padStart(3, "0")}`; });
  const unadmitted = kept.filter((t) => t.sentences < MIN_ENTITY_SENTENCES).map((t) => t.surface);
  return { referents, unadmitted };
}

export function referentsIn(str, referents) {
  const s = ` ${str} `;
  const hits = [];
  for (const r of referents) {
    if (r.surfaces.some((f) => new RegExp(`[^\\p{L}\\p{N}]${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\p{L}\\p{N}]`, "u").test(s))) hits.push(r.id);
  }
  return hits;
}

// ---- Network (§7.5): winnowing fingerprints ---------------------------------------------------------------------------------------

function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; }

/** Winnowed fingerprints of a string (whitespace-collapsed, lowercased form only). Exact hashes; no similarity score anywhere. */
export function winnow(str, { k = WINNOW_K, w = WINNOW_W } = {}) {
  const t = String(str).toLowerCase().replace(/\s+/g, " ").trim();
  if (t.length < k) return new Set(t ? [fnv(t)] : []);
  const hs = [];
  for (let i = 0; i + k <= t.length; i++) hs.push(fnv(t.slice(i, i + k)));
  const out = new Set();
  for (let i = 0; i + w <= hs.length; i++) { let m = hs[i]; for (let j = i + 1; j < i + w; j++) if (hs[j] <= m) m = hs[j]; out.add(m); }
  if (hs.length < w) hs.forEach((h) => out.add(h));
  return out;
}

const lgam = (n) => { let x = 0; for (let i = 2; i <= n; i++) x += Math.log(i); return x; };
/** P(X ≥ x) for X ~ Bin(n, p), exact. */
export function binomTail(x, n, p) {
  if (x <= 0) return 1;
  if (p <= 0) return x > 0 ? 0 : 1;
  if (p >= 1) return 1;
  let t = 0;
  for (let k = x; k <= n; k++) t += Math.exp(lgam(n) - lgam(k) - lgam(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
  return Math.min(1, t);
}

/** Verbs that earn attitude standing on this material: quote-adjacent, or clause-taking, past ATTITUDE_ALPHA against the base rate. */
export function earnAttitudes({ docs, verbs, rel, functionWords, alpha = ATTITUDE_ALPHA }) {
  const near = new Map(), seen = new Map();
  let nearAll = 0, all = 0;
  for (const d of docs) {
    const marks = d.quotes.flatMap(([a, b]) => [a, b]);
    for (const m of d.text.matchAll(/[\p{L}][\p{L}'’-]*/gu)) {
      const w = m[0].toLowerCase();
      if (!verbs.has(w)) continue;
      if (d.quotes.some(([a, b]) => a <= m.index && m.index < b)) continue; // a frame is outside the quotation, by definition
      // Near = within QUOTE_FRAME_WORDS words of a quotation mark, on the same line: where English attribution sits ("”, Thune said").
      const isNear = marks.some((q) => { const gap = d.text.slice(Math.min(q, m.index), Math.max(q, m.index)); return !gap.includes("\n") && (gap.match(/[\p{L}\p{N}]+/gu) ?? []).length <= QUOTE_FRAME_WORDS + 1; });
      seen.set(w, (seen.get(w) ?? 0) + 1); all++;
      if (isNear) { near.set(w, (near.get(w) ?? 0) + 1); nearAll++; }
    }
  }
  const clause = new Map(), uses = new Map();
  let clauseAll = 0, usesAll = 0;
  for (const d of docs) for (const s of d.sentences) {
    let ts; try { ts = rel(s.text); } catch { continue; }
    for (const t of ts) {
      const v = t.verb.toLowerCase();
      const opens = !!t.object && rel(t.object).some((x) => { const lead = t.object.slice(0, x.subjectOffset ?? x.offset).trim().toLowerCase().split(/\s+/).filter(Boolean); return lead.length === 0 || (lead.length === 1 && functionWords.has(lead[0])); });
      uses.set(v, (uses.get(v) ?? 0) + 1); usesAll++;
      if (opens) { clause.set(v, (clause.get(v) ?? 0) + 1); clauseAll++; }
    }
  }
  // Leave-one-out base rates: a verb is tested against every OTHER measured verb, never against a pool it dominates.
  const loo = (x, n, X, N) => (N - n > 0 ? (X - x) / (N - n) : 0);
  const earned = new Map();
  for (const v of verbs) {
    const pq = binomTail(near.get(v) ?? 0, seen.get(v) ?? 0, loo(near.get(v) ?? 0, seen.get(v) ?? 0, nearAll, all));
    const pc = binomTail(clause.get(v) ?? 0, uses.get(v) ?? 0, loo(clause.get(v) ?? 0, uses.get(v) ?? 0, clauseAll, usesAll));
    if ((near.get(v) ?? 0) >= 2 && pq < alpha) earned.set(v, { by: "quote_adjacency", p: pq, x: near.get(v), n: seen.get(v) });
    else if ((clause.get(v) ?? 0) >= 2 && pc < alpha) earned.set(v, { by: "clausal_object", p: pc, x: clause.get(v), n: uses.get(v) });
  }
  return { earned, base: { quote_adjacency: all ? nearAll / all : 0, clausal_object: usesAll ? clauseAll / usesAll : 0, leave_one_out: true }, alpha };
}

const shareOf = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const x of a) if (b.has(x)) n++; return n / Math.min(a.size, b.size); };

// ---- the reading ------------------------------------------------------------------------------------------------------------------

/**
 * records: [{ entry, layers, declared?: { published, modified, links } }] — Pinax records (pinax.js) for every source version collected.
 * absences: typed absence events from collection (§7.1, L6), carried through untouched.
 */
export function readCorpus(records, { question = "", absences = [] } = {}) {
  const docs = records.map((rec) => {
    const text = textOf(rec);
    const sentences = splitSentences(text).filter((s) => s.text.trim());
    return { rec, text, sentences, map: offsetMap(text), quotes: quotationRegions(text) };
  });
  const perSource = docs.map((d) => ({ pinax: d.rec.entry.id, surfaces: extractSurfaces(d.sentences.map((s) => ({ text: s.text }))) }));
  const { referents, unadmitted } = admitEntities(perSource);

  // Relation vocabulary measured over the whole corpus as one reading (no hand verb list): recurrence across ≥2 surfaces.
  const corpusText = docs.map((d) => d.text).join("\n\n");
  const corpusSentences = docs.flatMap((d) => d.sentences.map((s) => ({ text: s.text })));
  // The closed class is this corpus's own Zipf head (material.js), never a stored stopword list: it walls the verb slot and the
  // complementiser slot of an embedding alike.
  const functionWords = functionWordSet(buildFrequencyTable(tokenize(corpusText)));
  const vocab = discoverRelationVocab(corpusText, { surfaces: extractSurfaces(corpusSentences), minSurfaces: 2, functionWords });
  const verbs = vocab.verbs;
  // functionWords walls the VERB slot (vocab discovery) only: passed to extraction it ends an object at its next closed-class word and
  // cuts the clause an embedding is made of ("said the budget office approved the plan" → object "the budget office approved").
  const rel = (str) => extractRelations(str, { verbs, nounPhraseSubjects: true });
  const attitudes = earnAttitudes({ docs, verbs, rel, functionWords });
  const attitudeVerbs = new Set(attitudes.earned.keys());
  // Abbreviations measured from this corpus (spans.js), lowercased with their period: "rep.", "sen.", "asm.". Never a list.
  const abbreviations = new Set([...deriveAbbreviations(corpusText), ...titleAbbreviations(corpusText)].map((x) => String(x).toLowerCase()).flatMap((x) => [x, x.endsWith(".") ? x : `${x}.`]));

  const atoms = [];
  const drops = [];
  for (const d of docs) {
    const { rec, map } = d;
    const layerSha = rec.entry.text.sha256;
    const addr = (u0, u1) => formatAddress({ pinax: rec.entry.id, layer: "text", layerSha256: layerSha, start: convertOffset(map, "u", "b", u0), end: convertOffset(map, "u", "b", u1) });
    const quoteGivers = d.quotes.map((q) => ({ q, at: attributionOf(d.text, q, { verbs: attitudeVerbs, functionWords, abbreviations, isReferent: (str) => referentsIn(str, referents).length > 0 }) }));
    const giverOfQuote = (g) => ({ surface: addr(g.giverU, g.giverEnd), surface_verbatim: g.giver, referent: g.pronoun ? null : referentsIn(g.giver, referents)[0] ?? null, pronoun: g.pronoun, attitude: addr(g.verbU, g.verbU + g.verb.length), attitude_verbatim: g.verb, via: `quotation_frame_${g.side}` });
    // Every attributed quotation is a reported atom in its own right: its span is exactly the quoted bytes. A quotation with no
    // attribution frame is a mention (a title, a scare quote), not testimony; it is dropped, with that reason.
    for (const { q, at } of quoteGivers) {
      if (!at) { drops.push({ at: addr(q[0], q[1]), why: "quotation without an attribution frame: a mention, not testimony" }); continue; }
      atoms.push({
        schema: "ClaimAtom@1", id: `a_${fnv(addr(q[0], q[1])).toString(16)}q${atoms.length.toString(36)}`,
        pinax: rec.entry.id, url: rec.entry.url, span: addr(q[0], q[1]),
        kind: "reported", why_kind: "quotation", giver: giverOfQuote(at), relation: null,
        entities: referentsIn(d.text.slice(q[0], q[1]), referents),
        valid_time: { value: null, precision: null, why: "undated: the CLDR date parse (§7.2) is not yet wired" },
        document_time: rec.declared?.published ?? null, transaction_time: rec.entry.retrieved_at,
        _sentence: d.text.slice(q[0], q[1]), _object: "",
      });
    }
    for (const s of d.sentences) {
      const lead = s.text.length - s.text.trimStart().length;
      const s0 = s.offset + lead, s1 = s.offset + s.text.trimEnd().length;
      let triples;
      try { triples = rel(s.text); } catch (err) { drops.push({ at: addr(s0, s1), why: `relations.js refused: ${err.message}` }); continue; }
      // One Link per (subject, verb, object) position: relations.js can return the same triple twice for one clause.
      const seenT = new Set();
      triples = triples.filter((t) => { const k = `${t.subjectOffset ?? t.offset}|${t.verb}|${t.objectOffset}`; if (seenT.has(k)) return false; seenT.add(k); return true; });
      const placed = triples.map((t) => {
        const subjU = s.offset + (t.subjectOffset ?? t.offset);
        const verbU = s.offset + s.text.indexOf(t.verb, (t.subjectOffset ?? 0) + String(t.subject).length);
        const objU = s.offset + (t.objectOffset ?? 0);
        const objEnd = objU + String(t.object ?? "").length;
        const inQuote = d.quotes.some(([a, b]) => a <= verbU && verbU < b);
        const objQuoted = !!t.object && overlaps(d.quotes, objU, objEnd);
        return { t, subjU, verbU, objU, inQuote, attribution: !inQuote && objQuoted };
      });
      // A quotation is the object of the Link OUTSIDE it (§7.4 applied to quotation regions): the Link whose verb sits outside every quote
      // in the same sentence is the attribution; its subject is the giver of every Link inside the quote, its verb the attitude, verbatim.
      const outside = placed.filter((p) => !p.inQuote);
      for (const p of placed) {
        const { t, subjU, verbU, objU } = p;
        if (verbU < s.offset) { drops.push({ at: addr(s0, s1), why: "verb not found at its own offset" }); continue; }
        // An embedding: the object IS a clause — an inner Link whose subject opens the object, after at most one closed-class word
        // (a complementiser such as "that", measured as closed by this corpus's own distribution). A Link deeper inside the object is a
        // relative clause or an adjunct, not a report, and does not count.
        const inner = t.object ? rel(t.object).filter((x) => {
          const lead = t.object.slice(0, x.subjectOffset ?? x.offset).trim().toLowerCase().split(/\s+/).filter(Boolean);
          return lead.length === 0 || (lead.length === 1 && functionWords.has(lead[0]));
        }) : [];
        const embedded = inner.length > 0 && attitudeVerbs.has(t.verb.toLowerCase());
        const kind = p.inQuote || p.attribution || embedded ? "reported" : "located";
        const subjRefs = referentsIn(t.subject, referents);
        const objRefs = referentsIn(t.object ?? "", referents);
        const sentenceAt = addr(s0, s1);
        let giver = null;
        const qg = p.inQuote ? quoteGivers.find(({ q }) => q[0] <= verbU && verbU < q[1])?.at : null;
        if (qg) {
          giver = giverOfQuote(qg);
        } else if (p.inQuote) {
          const by = outside.slice().sort((x, y) => Math.abs(x.verbU - verbU) - Math.abs(y.verbU - verbU))[0];
          giver = by
            ? { surface: addr(by.subjU, by.subjU + String(by.t.subject).length), surface_verbatim: by.t.subject, pronoun: functionWords.has(String(by.t.subject).toLowerCase()), referent: referentsIn(by.t.subject, referents)[0] ?? null, attitude: addr(by.verbU, by.verbU + by.t.verb.length), attitude_verbatim: by.t.verb, via: "attribution_outside_quote" }
            : { surface: null, surface_verbatim: null, referent: null, attitude: null, attitude_verbatim: null, via: "attribution_not_found" };
        } else if (kind === "reported") {
          giver = { surface: addr(subjU, subjU + String(t.subject).length), surface_verbatim: t.subject, pronoun: functionWords.has(String(t.subject).toLowerCase()), referent: subjRefs[0] ?? null, attitude: addr(verbU, verbU + t.verb.length), attitude_verbatim: t.verb, via: p.attribution ? "attribution" : "embedding" };
        }
        atoms.push({
          schema: "ClaimAtom@1",
          id: `a_${fnv(sentenceAt + t.verb + subjU).toString(16)}${atoms.length.toString(36)}`,
          pinax: rec.entry.id, url: rec.entry.url,
          span: sentenceAt,
          kind, why_kind: p.inQuote ? "inside_quotation" : p.attribution ? "attribution_of_quotation" : embedded ? "embedding" : "own_voice",
          giver,
          relation: {
            subj: subjRefs[0] ?? null, subj_surface: addr(subjU, subjU + String(t.subject).length),
            pred: t.verb, obj_refs: objRefs, obj_surface: t.object ? addr(objU, objU + t.object.length) : null,
            polarity: t.polarity ?? "unknown", polarity_giver: POLARITY_GIVER,
            inner: embedded ? inner.map((x) => ({ subj: referentsIn(x.subject, referents)[0] ?? null, pred: x.verb, polarity: x.polarity })) : [],
          },
          entities: [...new Set([...subjRefs, ...objRefs])],
          valid_time: { value: null, precision: null, why: "undated: the CLDR date parse (§7.2) is not yet wired" },
          document_time: rec.declared?.published ?? null,
          transaction_time: rec.entry.retrieved_at,
          _sentence: s.text, _object: t.object ?? "",
        });
      }
    }
  }

  // Consequence: a referent survives only if some Link puts it in a subject or object slot. Pruned ids leave every atom.
  const acting = new Set(atoms.flatMap((a) => (a.relation ? [a.relation.subj, ...a.relation.obj_refs] : [])).filter(Boolean));
  const dropped = referents.filter((r) => !acting.has(r.id));
  for (let i = referents.length - 1; i >= 0; i--) if (!acting.has(referents[i].id)) referents.splice(i, 1);
  for (const a of atoms) {
    a.entities = a.entities.filter((e) => acting.has(e));
    if (a.relation) a.relation.obj_refs = a.relation.obj_refs.filter((e) => acting.has(e));
    if (a.giver?.referent && !acting.has(a.giver.referent)) a.giver.referent = null;
  }
  unadmitted.push(...dropped.map((r) => r.name));

  // Same claim, exact: subject referent + predicate surface + polarity + object (its referents if any, else its lowercased form).
  const keyOf = (a) => a.relation?.subj && [a.relation.subj, a.relation.pred.toLowerCase(), a.relation.polarity, a.relation.obj_refs.length ? a.relation.obj_refs.join("+") : diaNorm(a._object)].join("|");
  const claims = new Map();
  for (const a of atoms) { const k = keyOf(a); if (!k) continue; (claims.get(k) ?? claims.set(k, []).get(k)).push(a); }

  // Chains: union-find over the atoms of each claim.
  const byId = Object.fromEntries(records.map((r) => [r.entry.id, r]));
  const urlOf = (p) => byId[p]?.entry?.final_url ?? byId[p]?.entry?.url;
  const linksOf = (p) => new Set(byId[p]?.declared?.links ?? []);
  const fp = new Map(atoms.map((a) => [a.id, winnow(a._sentence)]));
  let chainN = 0;
  const claimList = [];
  for (const [key, group] of claims) {
    const parent = group.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const why = [];
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j];
      let reason = null;
      if (a.pinax === b.pinax || urlOf(a.pinax) === urlOf(b.pinax)) reason = "same_source";
      else if (linksOf(a.pinax).has(urlOf(b.pinax)) || linksOf(b.pinax).has(urlOf(a.pinax))) reason = "declared_citation";
      else if (shareOf(fp.get(a.id), fp.get(b.id)) >= SHARE_FLOOR) reason = "shared_bytes";
      if (reason) { parent[find(i)] = find(j); why.push({ a: a.id, b: b.id, reason }); }
    }
    const roots = new Map();
    group.forEach((a, i) => { const r = find(i); if (!roots.has(r)) roots.set(r, `ch_${(chainN++).toString().padStart(3, "0")}`); a.chain = roots.get(r); });
    const independent = roots.size;
    group.forEach((a) => { a.independent_count = independent; });
    claimList.push({ key, atoms: group.map((a) => a.id), independent_count: independent, collapses: why });
  }

  // Contest and differs (§7.5): same subject + predicate across independent chains.
  const bySP = new Map();
  for (const c of claimList) { const [s, p] = c.key.split("|"); const k = `${s}|${p}`; (bySP.get(k) ?? bySP.set(k, []).get(k)).push(c); }
  const atomById = new Map(atoms.map((a) => [a.id, a]));
  for (const c of claimList) {
    const [s, p, pol] = c.key.split("|");
    // Contest and differs both need another SOURCE: one page disagreeing with itself is not two standpoints.
    const mine = new Set(c.atoms.map((id) => atomById.get(id).pinax));
    const rivals = bySP.get(`${s}|${p}`).filter((o) => o !== c && o.atoms.some((id) => !mine.has(atomById.get(id).pinax)));
    const contested = rivals.some((o) => o.key.split("|")[2] !== pol && pol !== "unknown" && o.key.split("|")[2] !== "unknown");
    const differs = rivals.some((o) => o.key.split("|")[2] === pol);
    c.standing = contested ? "CONTRADICTED" : c.independent_count >= 2 ? "AGREE" : differs ? "UNDETERMINED" : "SINGLE";
    c.rivals = rivals.map((o) => o.key);
    for (const id of c.atoms) atomById.get(id).standing = c.standing;
  }
  for (const a of atoms) if (!a.standing) { a.standing = "SINGLE"; a.independent_count = 1; a.chain = a.chain ?? null; a.why_unkeyed = "subject is not an admitted referent"; }

  // Presupposition (§6.3): the question's definite descriptions against admitted referents.
  const qRefs = referentsIn(question, referents);

  // Lens per source (§7.8): referents carried by ≥2 other sources that this source never names — "within this corpus".
  const omissions = Object.fromEntries(records.map((r) => {
    const mine = new Set(atoms.filter((a) => a.pinax === r.entry.id).flatMap((a) => a.entities));
    const named = new Set(referents.filter((x) => x.sources.has(r.entry.id)).map((x) => x.id));
    return [r.entry.id, referents.filter((x) => !named.has(x.id) && !mine.has(x.id) && [...x.sources].filter((p) => p !== r.entry.id).length >= 2).map((x) => x.id)];
  }));

  // Each figure's first occurrence, as a byte span of a text layer: prose names a figure by copying these bytes, never by typing them.
  for (const r of referents) {
    for (const d of docs) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${r.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "u");
      const m = re.exec(d.text);
      if (!m) continue;
      r.at = formatAddress({ pinax: d.rec.entry.id, layer: "text", layerSha256: d.rec.entry.text.sha256, start: convertOffset(d.map, "u", "b", m.index), end: convertOffset(d.map, "u", "b", m.index + r.name.length) });
      break;
    }
  }

  // Each page's own title, as a byte span of its RAW layer: the title is the publisher's declared name for the page (§7.2).
  const titles = {};
  for (const r of records) {
    const raw = dec.decode(r.layers.raw);
    // The publisher's declared name for itself (og:site_name) is preferred; the page title is the fallback. Both are raw-layer bytes.
    const m = /<meta[^>]+property=["']og:site_name["'][^>]*content=["']([^"'<]{2,120})["']/i.exec(raw) ?? /<title[^>]*>([^<]{3,300})<\/title>/i.exec(raw);
    if (!m) continue;
    const lead = m[1].length - m[1].trimStart().length;
    const t = m[1].trim();
    const u0 = m.index + m[0].indexOf(m[1]) + lead;
    const b0 = new TextEncoder().encode(raw.slice(0, u0)).length;
    titles[r.entry.id] = { text: t, address: formatAddress({ pinax: r.entry.id, layer: "raw", layerSha256: r.entry.raw.sha256, start: b0, end: b0 + new TextEncoder().encode(t).length }) };
  }

  return {
    schema: "CallimachusRecord@1",
    question,
    // ROLE and GIVER, decided from the page's own bytes with no input: an encyclopedia is an INDEX (its claims lead to a source and are never
    // one: index-source.js); and WHO SAID IT is read from the page's markup (byline.js), as copied bytes with a raw-layer address.
    sources: records.map((r) => {
      const url = r.entry.final_url ?? r.entry.url;
      const role = r.declared?.role ?? (isIndexUrl(url) ? "index" : "source");
      const addr = (at) => (at ? formatAddress({ pinax: r.entry.id, layer: "raw", layerSha256: r.entry.raw.sha256, start: at.start, end: at.end }) : null);
      let byline = null;
      try {
        const b = bylineOf({ raw: dec.decode(r.layers.raw), text: dec.decode(r.layers.text), url, title: titles[r.entry.id]?.text ?? "" });
        byline = {
          authors: b.authors.map((a) => ({ name: a.name, kind: a.kind, witnesses: a.witnesses, address: addr(a.at) })),
          institutional: b.institutional ? { name: b.institutional.name, type: b.institutional.type, address: addr(b.institutional.at) } : null,
          no_named_giver: b.no_named_giver, ambiguous_article: b.ambiguous_article,
        };
      } catch { byline = null; }
      // THE POINTERS of an index page: every sentence that stands over footnotes with an origin URL, as a text-layer address plus the
      // origin hrefs (index-source.js trailOf). The pages those hrefs name, once pinned, are matched back to the sentence by typed slots
      // (pointer-match.js). Empty for a page that is not an index.
      let index_trail = [];
      if (role === "index") {
        try {
          const d = docs.find((x) => x.rec === r), raw = dec.decode(r.layers.raw);
          const fn = footnotesOf(raw), marks = marksOf(d.text);
          for (const sn of d.sentences) {
            const s0 = sn.offset, s1 = sn.offset + sn.text.trimEnd().length;
            const t = trailOf({ text: d.text, footnotes: fn, marks, span: [s0, s1], pinax: r.entry.id });
            if (t.follow.length) index_trail.push({ span: formatAddress({ pinax: r.entry.id, layer: "text", layerSha256: r.entry.text.sha256, start: convertOffset(d.map, "u", "b", s0), end: convertOffset(d.map, "u", "b", s1) }), text: d.text.slice(s0, s1), hrefs: t.follow.map((f) => f.href), notes: t.notes });
          }
        } catch { index_trail = []; }
      }
      return { ...r.entry, declared: r.declared ?? null, title: titles[r.entry.id] ?? null, role, byline, index_trail };
    }),
    entities: referents.map((r) => ({ ...r, sources: [...r.sources] })),
    unadmitted_surfaces: unadmitted,
    vocab: [...verbs],
    attitudes: { earned: Object.fromEntries(attitudes.earned), base: attitudes.base, alpha: attitudes.alpha, giver: "Fisher 0.01 convention (declared); permutation null pending" },
    atoms, claims: claimList, omissions, absences, drops,
    presupposition: { question_referents: qRefs, status: qRefs.length ? "bound" : "unbound_or_undescribed" },
    ladder: { reached: ["void", "field", "entity", "link", "network", "lens"], skipped: ["kind", "atmosphere", "paradigm"], why_skipped: { kind: "increment D not built", atmosphere: "increment D not built", paradigm: "increment D not built" } },
  };
}

// ---- lenses (§9) ------------------------------------------------------------------------------------------------------------------

/** slice(address) is injected: it returns the verified bytes at an address (pinax.js quoteOf over the store), or null. Lenses never hold text. */
const MARK = { located: "L", reported: "R" };
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export async function claimSheet(record, { slice, sigilOf = () => "" }) {
  const rows = [];
  const drops = [];
  for (const a of record.atoms) {
    if (!a.kind) { drops.push({ id: a.id, why: "no kind (L5)" }); continue; }
    const q = await slice(a.span);
    if (q == null) { drops.push({ id: a.id, why: "span did not verify" }); continue; }
    const giver = a.giver ? `${esc(await slice(a.giver.surface))} · *${esc(a.giver.attitude_verbatim)}*` : "—";
    rows.push(`| ${sigilOf(a)} | ${MARK[a.kind]} | ${esc(q)} | ${giver} | ${a.standing} | ${a.independent_count} | \`${a.id}\` |`);
  }
  const text = [
    `# Claim sheet`, ``, `Question: ${record.question}`, ``,
    `| fix | kind | claim (sliced from source) | giver · attitude | standing | chains | atom |`,
    `|---|---|---|---|---|---|---|`, ...rows, ``,
    drops.length ? `Dropped: ${drops.length} (${[...new Set(drops.map((d) => d.why))].join("; ")})` : `Dropped: none`,
  ].join("\n");
  return { text, rows: rows.length, drops };
}

export async function dossier(record, { slice, sigilOf = () => "", verdicts = {} }) {
  const ent = Object.fromEntries(record.entities.map((e) => [e.id, e]));
  const nameOf = (id) => ent[id]?.name ?? "(unadmitted)";
  const out = [];
  const drops = [];
  const shown = new Set();
  const line = async (a) => { const q = await slice(a.span); if (q == null) { drops.push({ id: a.id, why: "span did not verify" }); return null; } shown.add(a.id); return `${sigilOf(a)} “${esc(q)}” — [${hostOf(a.url)}](${a.url}) \`${a.id}\``; };

  out.push(`# Dossier`, ``, `**Question:** ${record.question}`, ``);
  const nLoc = record.atoms.filter((a) => a.kind === "located").length, nRep = record.atoms.length - nLoc;
  out.push(`**Scope.** ${record.sources.length} source versions, ${record.atoms.length} claim atoms (${nLoc} located, ${nRep} reported), ${record.entities.length} admitted referents, ${record.claims.filter((c) => c.standing === "AGREE").length} claims carried by ≥2 independent chains. Ladder reached: ${record.ladder.reached.join(", ")}${record.ladder.skipped?.length ? `; skipped: ${record.ladder.skipped.join(", ")} (${Object.values(record.ladder.why_skipped ?? {})[0] ?? ""})` : ""}${record.ladder.organs ? `; read by the engine's cell organs: ${Object.entries(record.ladder.organs).map(([k, v]) => `${k} = ${v}`).join("; ")}` : ""}${record.ladder.stand_ins ? `; declared stand-ins: ${Object.entries(record.ladder.stand_ins).map(([k, v]) => `${k} = ${v}`).join("; ")}` : ""}.`, ``);

  // Perspectives: who says what. One block per giver, their attitude verbs verbatim, every quote sliced.
  out.push(`## Perspectives (reported claims, grouped by who gives them)`, ``);
  // Group by admitted referent; else by the giver's verbatim named surface (unadmitted: named once, so not linked across sources, §7.3).
  // A pronoun giver is unresolved — no coreference organ here — and is counted, never guessed.
  const givers = new Map();
  let pronouns = 0, none = 0;
  for (const a of record.atoms.filter((x) => x.kind === "reported")) {
    const g = a.giver;
    if (!g?.surface_verbatim) { none++; continue; }
    if (g.pronoun) { pronouns++; continue; }
    const key = g.referent ? `ref:${g.referent}` : /^\p{Lu}/u.test(g.surface_verbatim) ? `sfc:${g.surface_verbatim}` : null;
    if (!key) { none++; continue; }
    (givers.get(key) ?? givers.set(key, []).get(key)).push(a);
  }
  const quotesFirst = (as) => as.slice().sort((x, y) => (y.why_kind === "quotation") - (x.why_kind === "quotation"));
  const ranked = [...givers].sort((x, y) => new Set(y[1].map((a) => a.pinax)).size - new Set(x[1].map((a) => a.pinax)).size || y[1].length - x[1].length);
  for (const [key, as] of ranked) {
    const title = key.startsWith("ref:") ? nameOf(key.slice(4)) : `${key.slice(4)} *(unadmitted surface, verbatim)*`;
    const verbs = [...new Set(as.map((a) => a.giver.attitude_verbatim))];
    out.push(`### ${title}`, `Attitudes, verbatim: ${verbs.map((v) => `*${v}*`).join(", ")} · ${as.length} reported atoms across ${new Set(as.map((a) => a.pinax)).size} sources`, ``);
    const seenSpan = new Set();
    for (const a of quotesFirst(as)) { if (seenSpan.has(a.span)) continue; seenSpan.add(a.span); const l = await line(a); if (l) out.push(`- ${l}`); }
    out.push(``);
  }
  out.push(`*Not grouped: ${pronouns} reported atoms whose giver is a pronoun (no coreference organ yet), ${none} whose attribution frame was not found. All are in the claim sheet.*`, ``);

  out.push(`## Key facts (located, in a source's own voice, carried by ≥2 independent chains)`, ``);
  const agree = record.atoms.filter((a) => a.kind === "located" && a.standing === "AGREE");
  if (!agree.length) out.push(`None. No located claim recurs, exactly, across two independent chains in this material. That is a finding about the material, not a gap filled.`, ``);
  for (const a of agree) { const l = await line(a); if (l) out.push(`- ${l}`); }

  const atomById = new Map(record.atoms.map((a) => [a.id, a]));
  const srcCount = (c) => new Set(c.atoms.map((id) => atomById.get(id).pinax)).size;
  out.push(`## Points in tension (same subject and predicate, opposite polarity, independent sources)`, ``);
  const contested = record.claims.filter((c) => c.standing === "CONTRADICTED");
  if (!contested.length) out.push(`None raised. Contest needs the same subject and predicate with opposite polarity in two independent sources; polarity's giver is ${POLARITY_GIVER}.`, ``);
  for (const c of contested) {
    const [s, p, pol] = c.key.split("|");
    out.push(`- **${nameOf(s)} · ${p} · ${pol}** (rivals: ${c.rivals.length}):`);
    for (const id of c.atoms) { const l = await line(atomById.get(id)); if (l) out.push(`  - ${l}`); }
  }
  out.push(``);

  // Differs is not contradiction (§7.5): without a predicate earned as functional, different objects are only different objects.
  out.push(`## Where sources diverge (same subject and predicate, different objects — *differs*, not contradiction)`, ``);
  const groups = new Map();
  for (const c of record.claims.filter((x) => x.standing === "UNDETERMINED")) { const [s, p] = c.key.split("|"); const k = `${s}|${p}`; (groups.get(k) ?? groups.set(k, []).get(k)).push(c); }
  const spread = [...groups].map(([k, cs]) => [k, cs, new Set(cs.flatMap((c) => c.atoms.map((id) => atomById.get(id).pinax))).size]).filter(([, , n]) => n >= 2).sort((x, y) => y[2] - x[2]);
  if (!spread.length) out.push(`None spanning two sources.`, ``);
  for (const [k, cs, n] of spread.slice(0, 12)) {
    const [s, p] = k.split("|");
    out.push(`- **${nameOf(s)} · ${p}** — ${cs.length} different objects across ${n} sources:`);
    for (const c of cs.slice(0, 6)) { const l = await line(atomById.get(c.atoms[0])); if (l) out.push(`  - ${l}`); }
  }
  out.push(``);

  out.push(`## Chain collapses (sources that are not independent)`, ``);
  const coll = record.claims.flatMap((c) => c.collapses.filter((x) => x.reason !== "same_source"));
  if (!coll.length) out.push(`None found: no claim was carried by two sources sharing bytes past the floor or linked by citation.`, ``);
  for (const x of coll) out.push(`- \`${x.a}\` ↔ \`${x.b}\`: ${x.reason.replace("_", " ")}`);
  out.push(``);

  out.push(`## Entity index`, ``, `| referent | surfaces | sources | gate |`, `|---|---|---|---|`);
  for (const e of record.entities.slice().sort((a, b) => b.sources.length - a.sources.length || b.sentences - a.sentences).slice(0, 60)) out.push(`| ${esc(e.name)} | ${esc(e.surfaces.join(", "))} | ${e.sources.length} | ${e.gate} |`);
  out.push(``);

  out.push(`## What each source does not name (within this corpus)`, ``);
  for (const s of record.sources) {
    const om = record.omissions[s.id] ?? [];
    out.push(`- [${hostOf(s.url)}](${s.url}): ${om.length ? om.map(nameOf).join(", ") : "nothing named by ≥2 other sources is missing"}`);
  }
  out.push(``);

  out.push(`## Gaps`, ``);
  out.push(`- Presupposition: ${record.presupposition.status}${record.presupposition.question_referents.length ? ` (${record.presupposition.question_referents.map(nameOf).join(", ")})` : ""}.`);
  out.push(`- Valid time: every atom is undated (date parsing not yet wired); document times are kept separately in the provenance table.`);
  for (const ab of record.absences) out.push(`- ${ab.type}: ${ab.url ?? ab.query ?? ""} ${ab.detail ? `(${ab.detail})` : ""}`);
  out.push(`- Open leads, with no model to supply them: [M] thesis, [M] recommendation. Owner: the author.`, ``);

  out.push(`## Provenance`, ``, `| fixity | source | retrieved | published | text sha256 | bytes · lines · passages |`, `|---|---|---|---|---|---|`);
  for (const s of record.sources) {
    const v = verdicts[s.id];
    out.push(`| ${v ? `${v.sigil} ${v.verdict}` : "—"} | [${hostOf(s.url)}](${s.url}) | ${s.retrieved_at ?? "—"} | ${s.declared?.published ?? "—"} | \`${s.text.sha256.slice(0, 12)}\` | ${s.stichometry.bytes} · ${s.stichometry.lines} · ${s.stichometry.passages} |`);
  }
  out.push(``);
  const notShown = record.atoms.filter((a) => !shown.has(a.id));
  out.push(`## Drops`, ``, `${notShown.length} atoms are not shown in this dossier (they are located-SINGLE, or reported with an unadmitted giver); every one is in the claim sheet. ${drops.length} failed span verification.`);
  return { text: out.join("\n"), drops: [...drops, ...notShown.map((a) => ({ id: a.id, why: "not selected by the dossier lens" }))] };
}

const hostOf = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return String(u); } };
