// organs/byline.js — WHO SAID IT: the author of a page, read from the page's own markup. Pure: bytes in, named givers with addresses out.
// No model, no name list, no network. The rule it serves (the user, 2026-10-14): "we can't cite a publication, we should cite the author or
// the speaker of the content within the publication." A publication is the path; the party is a person (or a named body) on the record.
//
//   bylineOf({ raw, text, url, title }) → { authors: [{ name, kind, witnesses, at }], publisher, refused: [{ name, why }] }
//        authors  accepted givers, each with the witness kinds that named it and its RAW-layer byte span (the name is copied bytes)
//        publisher the page's own name for itself (og:site_name / JSON-LD publisher / host stem): never an author
//        refused  every candidate that did not pass, with the typed reason: nothing is dropped silently
//
// FOUR WITNESSES, each reading a different thing, so agreement between them is evidence and one alone is not:
//   jsonld   a schema.org Article-family node's `author` (the page's OWN article, resolved against its headline or url; a page that lists
//            several articles is ambiguous and says so)
//   meta     <meta name=author | article:author | parsely-author | dc.creator | citation_author | byl | sailthru.author>
//   rel      rel="author" or itemprop="author" markup
//   visible  a "By X" / "Written by X" line at the head of the extracted text layer
// ACCEPT when a STRONG witness names it (a resolved JSON-LD Article author, or a page-level <meta>: both describe this page's own article)
// or when two distinct WEAK witnesses (rel/itemprop markup, a visible line) agree. A name seen by one weak witness is refused
// (`one_witness`): a related-article card's byline, a footer credit and a sidebar all look like that.
//
// WHAT MAKES A NAME A NAME (shape only; no list): no URL, no @handle, no digits, 2–5 tokens, each token capitalised (lower-case particles
// de, van, von, bin, al, la, le, du, di, da, del, der, den, ter, ten allowed inside), no all-caps run longer than a token of acronym.
// A candidate equal to the publisher's own name is a PUBLISHER, not an author, and is refused as such.
//
// DECLARED, not measured (Constitution II.11) — giver for every row: the author, 2026-10-14, from schema.org Article/Person/Organization
// and the HTML `rel=author` / `itemprop=author` conventions; the meta names are the ones those conventions and the major CMSs emit.
// The visible witness reads the HEAD of the text layer: its lines up to the first body-length block. Two hand-set numbers bound that
// (a line over HEAD_LINE_CHARS ends the head; at most HEAD_LINES lines are read): declared, giver the author, 2026-10-14, owed a null.
const PARTICLES = new Set(["de", "van", "von", "bin", "al", "la", "le", "du", "di", "da", "del", "der", "den", "ter", "ten", "dos", "das", "el"]);
// Connectives that sit lower-case inside the name of a body (American Academy of Sleep Medicine): a closed English class, giver: the author.
const CONNECTIVES = new Set(["of", "for", "the", "on", "in", "and", "&", "to"]);
const ARTICLE = /(?:^|[^A-Za-z])(?:News)?Article$|BlogPosting|Report|Review|LiveBlogPosting|OpinionNewsArticle|ReportageNewsArticle|AnalysisNewsArticle|NewsArticle/;
// schema.org types the markup uses for a BODY. NEWS_TYPES are publications (cited as a path, never as a speaker); ORG_TYPES minus those are
// bodies that can speak for themselves (an NGO's statement, a government body's page). Giver: schema.org's own type hierarchy.
const ORG_TYPES = /^(NGO|Organization|GovernmentOrganization|EducationalOrganization|MedicalOrganization|ResearchOrganization|Corporation|NewsMediaOrganization|NewsAgency|Newspaper|OnlineBusiness|LocalBusiness|Project|ResearchProject)$/;
const NEWS_TYPES = /^(NewsMediaOrganization|NewsAgency|Newspaper|OnlineNewsMediaOrganization)$/;
const META_NAMES = /^(author|article:author|parsely-author|dc\.creator|dcterms\.creator|citation_author|byl|sailthru\.author|og:article:author)$/i;
const enc = new TextEncoder();

const unent = (s) => String(s ?? "").replace(/&amp;/g, "&").replace(/&#0*39;|&#x27;|&apos;/g, "'").replace(/&quot;|&#34;/g, '"').replace(/&nbsp;|&#160;/g, " ").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const squash = (s) => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^\p{L}]/gu, "");
/** An HTML tag's attributes: quoted ("…" or '…') and unquoted (name=value) alike, lower-cased names. */
export function attrsOf(tag) {
  const out = {};
  for (const m of String(tag).matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>\/][^\s>]*))/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}
const hostOf = (u) => { try { return new URL(String(u)).hostname.replace(/^www\./, ""); } catch { return ""; } };

/** Split a credit string into individual names: "A and B", "A, B", "A; B", "A & B". Leading "By " and trailing roles are stripped. */
export function splitNames(credit) {
  let s = unent(credit).replace(/^\s*(?:written\s+)?by[:\s]+/i, "").replace(/\s*[|•·–—-]\s*(?:updated|published|posted|staff|reporter|correspondent|editor)\b.*$/i, "");
  s = s.replace(/\b(?:and|&)\b/gi, ",").replace(/;/g, ",");
  return s.split(",").map((x) => x.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** Shape test for a person's name; returns null if it passes, else the typed reason. */
export function nameShapeProblem(name) {
  if (!name) return "empty";
  if (/^@|https?:\/\/|www\./i.test(name)) return "handle_or_url";
  if (/\d/.test(name)) return "digits";
  if (/[{}()[\];=<>\\/]/.test(name)) return "markup_debris";
  const toks = name.split(/\s+/);
  if (toks.length < 2 || toks.length > 5) return "token_count";
  for (const t of toks) {
    if (PARTICLES.has(t.toLowerCase())) continue;
    if (toks.length >= 3 && CONNECTIVES.has(t.toLowerCase())) continue;
    if (!/^\p{Lu}[\p{L}.'’-]*$/u.test(t)) return "token_not_capitalised";
  }
  if (toks.some((t) => t.length > 1 && t === t.toUpperCase() && /^\p{Lu}+$/u.test(t) && toks.length < 3)) return "all_caps_run";
  return null;
}

const walk = (node, fn, depth = 0) => {
  if (!node || depth > 12) return;
  if (Array.isArray(node)) { for (const n of node) walk(n, fn, depth + 1); return; }
  if (typeof node !== "object") return;
  fn(node);
  for (const v of Object.values(node)) if (v && typeof v === "object") walk(v, fn, depth + 1);
};
const typesOf = (n) => [].concat(n["@type"] ?? []).map(String);
const authorNames = (a) => {
  const out = [];
  for (const x of [].concat(a ?? [])) {
    if (typeof x === "string") out.push({ name: x, kind: "unknown" });
    else if (x && typeof x === "object" && x.name) out.push({ name: String(x.name), kind: typesOf(x).some((t) => /Organization/i.test(t)) ? "organization" : "person" });
  }
  return out;
};

/** The structured witnesses. Returns { cands: [{ witness, name, kind, resolved }], publisher: Set<squashed>, ambiguous } */
function witnessesOf(raw, title, url) {
  const cands = [];
  const publisher = new Set([squash(hostOf(url).split(".").slice(-2, -1)[0] ?? "")]);
  let ambiguous = false;
  const tn = squash(title);
  // meta (page-level: a <meta> describes THIS page, not the cards listed on it)
  for (const m of raw.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrsOf(m[0]);
    const name = a.name ?? a.property ?? a.itemprop;
    const content = a.content;
    if (!name || content == null) continue;
    if (/^og:site_name$|^application-name$|^apple-mobile-web-app-title$/i.test(name)) publisher.add(squash(unent(content)));
    if (META_NAMES.test(name)) for (const n of splitNames(content)) cands.push({ witness: "meta", name: n, kind: "unknown", resolved: true });
  }
  // JSON-LD
  const articles = [];
  const bodies = [];
  for (const m of raw.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/^application\/ld\+json$/i.test(attrsOf(`<script ${m[1]}>`).type ?? "")) continue; // quoted or unquoted
    let j; try { j = JSON.parse(m[2].trim()); } catch { continue; }
    walk(j, (n) => {
      const ty = typesOf(n);
      if (n.publisher) for (const p of authorNames(n.publisher)) publisher.add(squash(p.name));
      if (ty.some((t) => /^WebSite$/.test(t)) && n.name) publisher.add(squash(String(n.name)));
      if (ty.some((t) => ARTICLE.test(t)) && n.author) articles.push(n);
      // A body the markup itself types: collected for the institutional voice (never as the publisher, never as an author by itself).
      if (ty.some((t) => ORG_TYPES.test(t)) && n.name) bodies.push({ name: String(n.name), types: ty });
    });
  }
  const pageUrl = String(url ?? "").replace(/[#?].*$/, "").replace(/\/$/, "");
  const own = articles.filter((a) => {
    const h = squash(a.headline ?? a.name ?? "");
    const u = String(a.url ?? a.mainEntityOfPage?.["@id"] ?? a.mainEntityOfPage ?? "").replace(/[#?].*$/, "").replace(/\/$/, "");
    return (h && tn && (tn.startsWith(h.slice(0, 24)) || h.startsWith(tn.slice(0, 24)))) || (u && pageUrl && (u === pageUrl || pageUrl.endsWith(u) || u.endsWith(pageUrl)));
  });
  const chosen = own.length ? own : articles.length === 1 ? articles : [];
  if (articles.length > 1 && !own.length) ambiguous = true;
  for (const a of chosen) for (const p of authorNames(a.author)) for (const n of splitNames(p.name)) cands.push({ witness: "jsonld", name: n, kind: p.kind, resolved: true });
  // rel=author / itemprop=author
  for (const m of raw.matchAll(/<(a|span|div|p|li|address)\b[^>]*\b(?:rel\s*=\s*["']?author["']?|itemprop\s*=\s*["']?author["']?)(?=[\s>"'/])[^>]*>([\s\S]{0,200}?)<\/\1>/gi)) {
    const inner = m[2];
    const nm = /itemprop\s*=\s*["']name["'][^>]*>([\s\S]*?)</i.exec(inner)?.[1] ?? inner;
    for (const n of splitNames(nm)) cands.push({ witness: "rel", name: n, kind: "unknown", resolved: true });
  }
  return { cands, publisher, ambiguous, bodies };
}

/** The head of the extracted text layer: its lines up to the first body-length block (a structural boundary, not a count). */
export const HEAD_LINE_CHARS = 200;
export const HEAD_LINES = 40;
function headLines(text) {
  const out = [];
  for (const l of String(text ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean)) { if (l.length > HEAD_LINE_CHARS) break; out.push(l); if (out.length >= HEAD_LINES) break; }
  return out;
}
/** The visible witness. "By X" lines name givers; and a bare line at the head that holds a structured candidate's name corroborates it. */
function visibleBy(text, structured) {
  const out = [];
  const head = headLines(text);
  for (const l of head) {
    const m = /^(?:written\s+)?by[:\s]+(.{2,160})$/i.exec(l);
    if (m) for (const n of splitNames(m[1])) out.push({ witness: "visible", name: n, kind: "unknown", resolved: true });
  }
  const lower = head.map((l) => l.toLowerCase());
  for (const c of structured) if (lower.some((l) => l.includes(c.name.toLowerCase()))) out.push({ witness: "visible", name: c.name, kind: "unknown", resolved: true });
  return out;
}

export function bylineOf({ raw = "", text = "", url = "", title = "" } = {}) {
  const R = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  const t = title || unent(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(R)?.[1] ?? "");
  const { cands, publisher, ambiguous, bodies } = witnessesOf(R, t, url);
  cands.push(...visibleBy(text, cands.filter((c) => c.witness !== "visible")));
  const byName = new Map();
  const refused = [];
  for (const c of cands) {
    const name = c.name.replace(/\s+/g, " ").trim();
    const problem = nameShapeProblem(name);
    if (problem && c.kind !== "organization") { refused.push({ name, witness: c.witness, why: problem }); continue; }
    if (publisher.has(squash(name))) { refused.push({ name, witness: c.witness, why: "publisher_not_author" }); continue; }
    const k = squash(name);
    const e = byName.get(k) ?? { name, kind: c.kind === "unknown" ? "person" : c.kind, witnesses: new Set() };
    e.witnesses.add(c.witness);
    if (c.kind === "organization") e.kind = "organization";
    byName.set(k, e);
  }
  const authors = [];
  for (const e of byName.values()) {
    const w = [...e.witnesses];
    // STRONG witnesses describe this page's own article: a resolved JSON-LD Article author, or a page-level <meta>. WEAK ones also occur on
    // the related-article cards a page lists (rel/itemprop markup, a visible line): they count only with a second witness.
    const strong = w.some((x) => x === "jsonld" || x === "meta") || w.length >= 2;
    if (!strong) { refused.push({ name: e.name, witness: w[0], why: "one_witness" }); continue; }
    const idx = R.indexOf(e.name);
    const at = idx >= 0 ? { start: enc.encode(R.slice(0, idx)).length, end: enc.encode(R.slice(0, idx + e.name.length)).length } : null;
    authors.push({ name: e.name, kind: e.kind, witnesses: w.sort(), at });
  }
  // INSTITUTIONAL VOICE: with no person on record, a body the markup itself types as a non-news organization speaks for itself. A news
  // publication with no byline is a publication, and a publication is not cited: the result is the typed gap `no_named_giver`.
  let institutional = null;
  if (!authors.length) {
    const news = bodies.some((b) => b.types.some((t) => NEWS_TYPES.test(t)));
    const body = bodies.find((b) => !b.types.some((t) => NEWS_TYPES.test(t)) && !nameShapeProblem(b.name.trim()));
    if (body && !news) {
      const nm = body.name.trim();
      const i = R.indexOf(nm);
      institutional = { name: nm, type: body.types.find((t) => ORG_TYPES.test(t)), news_media: false, at: i >= 0 ? { start: enc.encode(R.slice(0, i)).length, end: enc.encode(R.slice(0, i + nm.length)).length } : null };
    }
  }
  return { authors, institutional, no_named_giver: !authors.length && !institutional, publisher: [...publisher].filter(Boolean), ambiguous_article: ambiguous, refused };
}
