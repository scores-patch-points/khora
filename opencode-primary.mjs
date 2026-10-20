// opencode-primary.mjs — the PRIMARY tier: a page of another kind of host that says what an encyclopedia says (or what nothing read said).
//
// The Fold's findPrimary does the finding (queries from the claim, mirrors and tertiary hosts dropped, hosts ranked by kind, the SAME strict gate: every content stem
// and figure of the claim, and the sentence must ASSERT it). Its model step is "point by number"; here the pointer is mechanical: the first sentence that already passes
// the gate (prefilter keeps only those, ordered declarative first), and the gate checks the pick again. No model is called.
import { findPrimary, kindOf } from "./vendor/the-fold/fold-chat-primary.js";
import { openClassOf } from "./opencode-keyed.mjs";
import { makeSearch, makeBraveSearch, makeMarginaliaSearch, marginaliaTerms, makeReadPage, citedFor } from "./opencode-web.mjs";

const point = async () => "1";

/** primaryFor({ claim, sentence?, indexHost?, indexText?, indexUrl?, deadline }) -> { tier:"primary", evidence, trail } | { tier:"index", trail } */
export async function primaryFor({ claim, sentence = null, indexHost = "en.wikipedia.org", indexTitle = null, indexText = null, indexUrl = null, deadline = Infinity, fetchImpl, engines = process.env.FOLD_WEB_ENGINES === "1", brave = process.env.FOLD_BRAVE === "1", marginalia = process.env.FOLD_MARGINALIA !== "0" } = {}) {
  let found;
  const isOpen = await openClassOf();
  // the strict gate asks `fw.has(token)` for the tokens it leaves out of a claim's content: the closed-class ones, by the same parser prior
  const fw = { has: (t) => !isOpen(t) };
  try {
    // The candidates are the index's own references (the encyclopedia is an index to primary sources); a search engine is asked only when switched on,
    // because the scraped ones refuse this address. Ranking by host kind and one page per host are findPrimary's.
    const cited = indexTitle ? await citedFor(indexTitle, claim, { deadline, fetchImpl }).catch((e) => ({ sentence: null, links: [], why: String(e?.message ?? e) })) : { sentence: null, links: [] };
    const links = cited.links;
    if (!links.length && !engines && !brave && !marginalia) return { tier: "index", trail: [{ verdict: "read", why: `index_cites_nothing:${cited.why ?? "no title"}` }], ...(cited.sentence ? { indexSentence: cited.sentence } : {}) };
    const ask = brave ? makeBraveSearch({ deadline, fetchImpl }) : marginalia ? makeMarginaliaSearch({ deadline, fetchImpl }) : engines ? makeSearch({ deadline, fetchImpl }) : null;
    // A small-web index ANDs its terms, so the query is the claim's own names and figures plus its remaining content words (at most 6), not the encyclopedia sentence's phrasing
    const terms = (() => { const w = marginaliaTerms(claim.replace(/[.,;:()]/g, " "), isOpen).split(" ").filter(Boolean); const key = (x) => (/^\d/.test(x) || /^\p{Lu}/u.test(x) ? 0 : 1); return [...w].sort((a, b) => key(a) - key(b)).slice(0, 6).join(" "); })();
    const search = async (query) => [...links, ...(ask ? await ask(marginalia && !brave ? terms : query).catch(() => []) : [])];
    found = await findPrimary({ claim, sentence: cited?.sentence ?? sentence ?? claim, indexHost, indexText, indexUrl, search, readPage: makeReadPage({ deadline, fetchImpl }), point, fw, limits: { maxResults: 80, maxPages: 6, maxQueries: brave || marginalia ? 3 : 1 } });
  } catch (e) {
    return { tier: "index", trail: [{ verdict: "unreadable", why: `primary_failed:${String(e?.message ?? e).slice(0, 80)}` }] };
  }
  const p = (found.pointers ?? []).find((x) => x && x.ok);
  const trail = (found.trail ?? []).map((t) => ({ host: t.host, verdict: t.verdict, ...(t.why ? { why: t.why } : {}), ...(t.url ? { url: t.url } : {}) }));
  if (!p) return { tier: "index", trail, queries: found.queries };
  const passage = found.passages[p.index];
  return {
    tier: "primary",
    evidence: { source: `${p.host}${p.title ? ` — ${p.title}` : ""}`, ref: p.host, url: p.url, text: p.quote, kind: kindOf(p.host).id },
    trail,
    queries: found.queries,
    pages: passage ? 1 : 0,
  };
}
