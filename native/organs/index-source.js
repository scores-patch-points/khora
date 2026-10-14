// organs/index-source.js — an encyclopedia is an INDEX, never a source. Pure: no IO, no clock, no model; bytes in, addresses out.
//
// The rule (the user, 2026-10-06, kept in the-fold `fold-chat-tertiary.js` / `fold-chat-origin.js`; restated 2026-10-14 for Callimachus):
// Wikipedia is not cited. What it says is a LEAD. The thing to cite is the original page the article itself points at, fetched, with the
// path there kept:   the article → the footnote under the sentence → the page the footnote names.
//
//   isIndexUrl(url)                     → the declared index host the URL belongs to, or null
//   footnotesOf(rawHtml)                → Map<n, { n, id, urls: [{ href, host, archived }], at: { start, end } }>   `at` = RAW-layer BYTE span
//   marksOf(text)                       → [{ n, start, end }]   the "[ n ]" marks of an extracted text layer (UTF-16 offsets)
//   notesUnder(text, marks, s0, s1)     → [n…]   the footnote numbers standing under the sentence text.slice(s0, s1)
//   trailOf({ atom, text, footnotes, pinax }) → the pointer trail for one index claim: which footnotes, which origin URLs, at which addresses
//   indexRecord(rec)                    → rec marked `declared.role = "index"`: its claims are pointers, never candidates for an answer line
//
// WHAT THIS DOES NOT DO: it does not decide whether an origin page carries the claim. That is the same-claim reading the record already
// does once the origin is pinned beside it (callimachus.js standing: a declared citation edge collapses the two into one chain). It only
// names where to look, as bytes, and keeps the path.
//
// DECLARED, not measured (Constitution II.11):
//   INDEX_HOSTS — giver: the user, 2026-10-06 ("wikipedia should not be cited, it should be a pointer to original sources that should be
//     fetched, with the path there tracked"). The same declaration as the-fold/fold-chat-tertiary.js TERTIARY; add a host here and the whole
//     record treats it the same way.
//   MAX_ORIGINS_PER_CLAIM = 3 — giver: the-fold fold-chat-origin.js ORIGIN.maxAttempts (footnotes tried per claim), reused unchanged.
export const INDEX_HOSTS = Object.freeze([Object.freeze({ id: "wikipedia", host: /(^|\.)wikipedia\.org$/i })]);
export const MAX_ORIGINS_PER_CLAIM = 3;

const hostOf = (u) => { try { return new URL(String(u)).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const isIndexUrl = (url) => { const h = hostOf(url); return (h && INDEX_HOSTS.find((t) => t.host.test(h))) || null; };

// A footnote link that is the encyclopedia's own plumbing (wiki internals, Wikimedia, Wikidata, a "Special:" page) is not an origin.
const PLUMBING = /(^|\.)(wikipedia|wikimedia|wikidata|mediawiki|wikisource)\.org$/i;
const ARCHIVE = /(^|\.)(web\.archive\.org|archive\.org|archive\.today|archive\.ph|archive\.is)$/i;
const decodeHref = (h) => h.replace(/&amp;/g, "&").replace(/&#38;/g, "&").replace(/&quot;/g, '"');
const enc = new TextEncoder();

/** The reference list of a Parsoid article: each `<li … data-mw-footnote-number="N">` with the external hrefs it holds. */
export function footnotesOf(rawHtml) {
  const html = String(rawHtml ?? "");
  const out = new Map();
  const re = /<li\b[^>]*\bid="cite_note-[^"]*"[^>]*>/g;
  let m;
  while ((m = re.exec(html))) {
    const num = /data-mw-footnote-number="(\d+)"/.exec(m[0]);
    if (!num) continue;
    const end = html.indexOf("</li>", re.lastIndex);
    if (end < 0) continue;
    const body = html.slice(m.index, end + 5);
    const urls = [];
    for (const a of body.matchAll(/\bhref="(https?:\/\/[^"]+)"/g)) {
      const href = decodeHref(a[1]);
      const host = hostOf(href);
      if (!host || PLUMBING.test(host)) continue;
      const archived = ARCHIVE.test(host);
      if (!urls.some((u) => u.href === href)) urls.push({ href, host, archived });
    }
    const n = Number(num[1]);
    if (!out.has(n)) out.set(n, { n, id: /\bid="([^"]+)"/.exec(m[0])?.[1] ?? null, urls, at: { start: enc.encode(html.slice(0, m.index)).length, end: enc.encode(html.slice(0, end + 5)).length } });
  }
  return out;
}

/** Numeric "[ n ]" marks of an extracted text layer. Letters ("[ a ]", notes) are not footnote marks of the reference list. */
export function marksOf(text) {
  const out = [];
  for (const m of String(text ?? "").matchAll(/\[\s*(\d{1,3})\s*\]/g)) out.push({ n: Number(m[1]), start: m.index, end: m.index + m[0].length });
  return out;
}

/**
 * The footnote numbers standing under a sentence. A mark that closes a sentence is carried at the HEAD of the next sentence by the sentence
 * splitter ("… the following month. [ 57 ] President Donald Trump …"), so:
 *   - marks at the very head of [s0, s1) belong to the PREVIOUS sentence and are skipped;
 *   - marks inside the sentence, after its first word, stand under it;
 *   - the contiguous run of marks right after s1 (only whitespace between) stands under it too.
 */
export function notesUnder(text, marks, s0, s1) {
  const t = String(text);
  let head = s0;
  for (const m of marks) if (m.start >= head && /^\s*$/.test(t.slice(head, m.start))) head = m.end; // skip the previous sentence's marks
  const inside = marks.filter((m) => m.start >= head && m.end <= s1).map((m) => m.n);
  const after = [];
  let at = s1;
  for (const m of marks) {
    if (m.start < at) continue;
    if (/^\s*$/.test(t.slice(at, m.start))) { after.push(m.n); at = m.end; } else break;
  }
  return [...new Set([...inside, ...after])];
}

/** The pointer trail of one claim on an index page: footnote → origin URLs, each with the address of its footnote in the pinned raw layer. */
export function trailOf({ text, footnotes, marks, span, pinax }) {
  const [s0, s1] = span;
  const nums = notesUnder(text, marks, s0, s1);
  const refs = [];
  for (const n of nums) {
    const f = footnotes.get(n);
    if (!f) { refs.push({ n, status: "no_footnote", urls: [] }); continue; }
    const origins = f.urls.filter((u) => !u.archived);
    const archived = f.urls.filter((u) => u.archived);
    refs.push({ n, status: origins.length ? "origin" : archived.length ? "archived_only" : "no_link", urls: origins, archived, footnote: `${pinax}/raw#b${f.at.start}-${f.at.end}` });
  }
  const origin = refs.filter((r) => r.urls.length).slice(0, MAX_ORIGINS_PER_CLAIM);
  return { notes: nums, refs, follow: origin.flatMap((r) => r.urls.slice(0, 1).map((u) => ({ href: u.href, host: u.host, via: r.footnote, n: r.n }))) };
}

/** Mark a pinned record as an INDEX page: its claims lead the reader to a source and are never one. */
export function indexRecord(rec, kind = "wikipedia") {
  rec.declared = { ...(rec.declared ?? {}), role: "index", index_kind: kind };
  return rec;
}
