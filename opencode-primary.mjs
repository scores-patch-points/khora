// opencode-primary.mjs — the PRIMARY tier: a page of another kind of host that says what an encyclopedia says (or what nothing read said).
//
// The Fold's findPrimary does the finding (queries from the claim, mirrors and tertiary hosts dropped, hosts ranked by kind, the SAME strict gate: every content stem
// and figure of the claim, and the sentence must ASSERT it). Its model step is "point by number"; here the pointer is mechanical: the first sentence that already passes
// the gate (prefilter keeps only those, ordered declarative first), and the gate checks the pick again. No model is called.
import { ENCYCLOPEDIAS, findPrimary, kindOf } from "./vendor/the-fold/fold-chat-primary.js";
import { isTertiary } from "./vendor/the-fold/fold-chat-tertiary.js";
import { openClassOf } from "./opencode-keyed.mjs";
import { makeSearch, makeBraveSearch, makeMarginaliaSearch, marginaliaTerms, makeReadPage, citedFor } from "./opencode-web.mjs";

const point = async () => "1";

/** primaryFor({ claim, sentence?, indexHost?, indexText?, indexUrl?, deadline }) -> { tier:"primary", evidence, trail } | { tier:"index", trail } */
export async function primaryFor({ claim, sentence = null, indexHost = "en.wikipedia.org", indexTitle = null, indexText = null, indexUrl = null, deadline = Infinity, fetchImpl, engines = process.env.FOLD_WEB_ENGINES === "1", brave = process.env.FOLD_BRAVE === "1", marginalia = process.env.FOLD_MARGINALIA !== "0" } = {}) {
  let found;
  let citedBy = null;
  const isOpen = await openClassOf();
  // the strict gate asks `fw.has(token)` for the tokens it leaves out of a claim's content: the closed-class ones, by the same parser prior
  const fw = { has: (t) => !isOpen(t) };
  try {
    // The candidates are the index's own references (the encyclopedia is an index to primary sources); a search engine is asked only when switched on,
    // because the scraped ones refuse this address. Ranking by host kind and one page per host are findPrimary's.
    const cited = indexTitle ? await citedFor(indexTitle, claim, { deadline, fetchImpl }).catch((e) => ({ sentence: null, links: [], why: String(e?.message ?? e) })) : { sentence: null, links: [] };
    citedBy = cited;
    const links = cited.links;
    if (!links.length && !engines && !brave && !marginalia) return { tier: "index", trail: [{ verdict: "read", why: `index_cites_nothing:${cited.why ?? "no title"}` }], cites: cited.cites ?? [], citesWhy: cited.why ?? null, ...(cited.sentence ? { indexSentence: cited.sentence } : {}) };
    const ask = brave ? makeBraveSearch({ deadline, fetchImpl }) : marginalia ? makeMarginaliaSearch({ deadline, fetchImpl }) : engines ? makeSearch({ deadline, fetchImpl }) : null;
    // A small-web index ANDs its terms, so the query is the claim's own names and figures plus its remaining content words (at most 6), not the encyclopedia sentence's phrasing
    const terms = (() => { const w = marginaliaTerms(claim.replace(/[.,;:()]/g, " "), isOpen).split(" ").filter(Boolean); const key = (x) => (/^\d/.test(x) || /^\p{Lu}/u.test(x) ? 0 : 1); return [...w].sort((a, b) => key(a) - key(b)).slice(0, 6).join(" "); })();
    const search = async (query) => [...links, ...(ask ? await ask(marginalia && !brave ? terms : query).catch(() => []) : [])];
    found = await findPrimary({ claim, sentence: cited?.sentence ?? sentence ?? claim, indexHost, indexText, indexUrl, search, readPage: makeReadPage({ deadline, fetchImpl }), point, fw, limits: { maxResults: 80, maxPages: 6, maxQueries: brave || marginalia ? 3 : 1 } });
  } catch (e) {
    return { tier: "index", trail: [{ verdict: "unreadable", why: `primary_failed:${String(e?.message ?? e).slice(0, 80)}` }], cites: citedBy?.cites ?? [], citesWhy: citedBy?.why ?? null };
  }
  const p = (found.pointers ?? []).find((x) => x && x.ok);
  const trail = (found.trail ?? []).map((t) => ({ host: t.host, verdict: t.verdict, ...(t.why ? { why: t.why } : {}), ...(t.url ? { url: t.url } : {}) }));
  const cites = citedBy?.cites ?? []
  if (!p) return { tier: "index", trail, queries: found.queries, cites, citesWhy: citedBy?.why ?? null };
  const passage = found.passages[p.index];
  return {
    tier: "primary",
    evidence: { source: `${p.host}${p.title ? ` — ${p.title}` : ""}`, ref: p.host, url: p.url, text: p.quote, kind: kindOf(p.host).id },
    trail,
    queries: found.queries,
    pages: passage ? 1 : 0,
    cites,
  };
}

// AN ENCYCLOPEDIA IS AN INDEX. A claim the turn's own reading supports from an encyclopedia page (a gathered Wikipedia article, a page read
// in the workspace) rests on what that page cites, not on the page: its footnote is followed to the page it points to, and the strict
// gate is asked again there. Found: the cited page becomes the evidence, the encyclopedia sentence kept as `via` (the index it was found
// through). Not found: the support stays, tier "index", saying so — and either way the claim carries what the index CITES (`cites`), each
// with what became of it, so the underlying source is named even when it could not be read. FOLD_FOLLOW_MAX bounds the follows (default 12).

const FOLLOW_MAX = Number(process.env.FOLD_FOLLOW_MAX ?? 12);
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
const urlOfEvidence = (e) => e?.url || (/^https?:\/\//.test(String(e?.source ?? "")) ? e.source : null);
/** The Wikipedia article an index evidence comes from, as a title, or null when it is another kind of index (or no index). */
const wikiTitleOf = (e) => {
  const name = String(e?.source ?? "");
  if (name.startsWith("wikipedia:")) return name.replace(/^wikipedia:\s*/, "");
  const url = urlOfEvidence(e);
  const m = url && /(^|\.)wikipedia\.org$/.test(hostOf(url)) ? /\/wiki\/([^?#]+)/.exec(new URL(url).pathname) : null;
  return m ? decodeURIComponent(m[1]).replace(/_/g, " ") : null;
};
/** Is this evidence from an index (an encyclopedia or another tertiary reference) rather than a source? */
export const fromIndex = (e) => {
  if (wikiTitleOf(e)) return true;
  const url = urlOfEvidence(e);
  return !!url && (isTertiary(url) || ENCYCLOPEDIAS.some((re) => re.test(hostOf(url))));
};

/** What the index cites for the claim, each with what became of it: "states" (the gate found the claim there), "read" (read, but it does
 *  not state the claim in its words), "unreadable" (the page refused or failed), "offline" (a book or paper with no page to read), or
 *  "untried" (not reached before the budget ran out). */
const citesOf = (pr) => {
  const trail = pr.trail ?? [];
  return (pr.cites ?? []).map((cite) => {
    if (!cite.url) return { ...cite, status: "offline" };
    if (pr.tier === "primary" && pr.evidence?.url === cite.url) return { ...cite, status: "states" };
    const t = trail.find((x) => x.url === cite.url);
    const status = !t ? "untried" : t.verdict === "unreadable" ? "unreadable" : t.verdict === "read" || t.verdict === "unsupported" ? "read" : t.verdict;
    return { ...cite, status, ...(t?.why ? { why: t.why } : {}) };
  });
};

/** followIndexes(claims, { deadline, fetchImpl }) -> { claims, pages, log }: every supported claim whose evidence is an index, followed to what it cites. */
export async function followIndexes(claims, { deadline = Infinity, fetchImpl } = {}) {
  const pages = [];
  const log = [];
  let used = 0;
  const out = [];
  for (const c of claims) {
    const e = c.evidence;
    if (c.standing !== "supported" || c.tier === "primary" || !e || !fromIndex(e)) { out.push(c); continue; }
    const title = wikiTitleOf(e);
    const via = { source: e.source, url: urlOfEvidence(e), text: e.text, ref: e.ref };
    if (!title || used >= FOLLOW_MAX || Date.now() >= deadline) {
      const why = !title ? "an index whose citations cannot be followed" : "not followed (budget)";
      // past the budget the citations are still named (the article is usually cached already): what it cites, not yet tried
      const cited = title && Date.now() < deadline ? await citedFor(title, c.text, { deadline, fetchImpl }).catch(() => null) : null;
      const cites = (cited?.cites ?? []).map((cite) => ({ ...cite, status: cite.url ? "untried" : "offline" }));
      out.push({ ...c, tier: "index", via, ...(cites.length ? { cites } : cited?.why ? { citesWhy: cited.why } : {}), searched: [...(c.searched ?? ["material"]), `cited source: ${why}`] });
      continue;
    }
    used++;
    // following is reading what the index cites: no search engine (that is research's own step, and the slow one)
    const pr = await primaryFor({ claim: c.text, sentence: e.text, indexTitle: title, indexUrl: via.url, deadline, fetchImpl, engines: false, brave: false, marginalia: false });
    log.push({ where: "follow", query: c.text.slice(0, 60), index: title, tier: pr.tier, hosts: (pr.trail ?? []).map((t) => `${t.host ?? ""}:${t.verdict}`).slice(0, 6) });
    if (pr.tier === "primary") {
      pages.push({ name: pr.evidence.source, url: pr.evidence.url, text: pr.evidence.text });
      out.push({ ...c, evidence: pr.evidence, via, tier: "primary", primary: pr.evidence, cites: citesOf(pr), searched: [...(c.searched ?? ["material"]), `cited source: ${pr.evidence.source}`] });
      continue;
    }
    const why = (pr.trail ?? []).at(-1)?.why ?? (pr.trail ?? []).at(-1)?.verdict ?? "no cited page states it";
    out.push({ ...c, tier: "index", via, cites: citesOf(pr), ...(pr.citesWhy && !(pr.cites ?? []).length ? { citesWhy: pr.citesWhy } : {}), searched: [...(c.searched ?? ["material"]), `cited source: none (${why})`] });
  }
  return { claims: out, pages, log };
}
