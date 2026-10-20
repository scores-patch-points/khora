// opencode-primary.mjs — the PRIMARY tier: a page of another kind of host that says what an encyclopedia says (or what nothing read said).
//
// The Fold's findPrimary does the finding (queries from the claim, mirrors and tertiary hosts dropped, hosts ranked by kind, the SAME strict gate: every content stem
// and figure of the claim, and the sentence must ASSERT it). Its model step is "point by number"; here the pointer is mechanical: the first sentence that already passes
// the gate (prefilter keeps only those, ordered declarative first), and the gate checks the pick again. No model is called.
import { findPrimary, kindOf } from "./vendor/the-fold/fold-chat-primary.js";
import { makeSearch, makeBraveSearch, braveKeyed, makeReadPage, citedFor } from "./opencode-web.mjs";

const point = async () => "1";

/** primaryFor({ claim, sentence?, indexHost?, indexText?, indexUrl?, deadline }) -> { tier:"primary", evidence, trail } | { tier:"index", trail } */
export async function primaryFor({ claim, sentence = null, indexHost = "en.wikipedia.org", indexTitle = null, indexText = null, indexUrl = null, deadline = Infinity, fetchImpl, engines = process.env.FOLD_WEB_ENGINES === "1", brave = process.env.FOLD_BRAVE !== "0" && (braveKeyed() || process.env.FOLD_WEB_OFFLINE === "1") } = {}) {
  let found;
  try {
    // The candidates are the index's own references (the encyclopedia is an index to primary sources); a search engine is asked only when switched on,
    // because the scraped ones refuse this address. Ranking by host kind and one page per host are findPrimary's.
    const cited = indexTitle ? await citedFor(indexTitle, claim, { deadline, fetchImpl }).catch((e) => ({ sentence: null, links: [], why: String(e?.message ?? e) })) : { sentence: null, links: [] };
    const links = cited.links;
    if (!links.length && !engines && !brave) return { tier: "index", trail: [{ verdict: "read", why: `index_cites_nothing:${cited.why ?? "no title"}` }], ...(cited.sentence ? { indexSentence: cited.sentence } : {}) };
    const ask = brave ? makeBraveSearch({ deadline, fetchImpl }) : engines ? makeSearch({ deadline, fetchImpl }) : null;
    const search = async (query) => [...links, ...(ask ? await ask(query).catch(() => []) : [])];
    found = await findPrimary({ claim, sentence: cited?.sentence ?? sentence ?? claim, indexHost, indexText, indexUrl, search, readPage: makeReadPage({ deadline, fetchImpl }), point, limits: { maxResults: 80, maxPages: 6, maxQueries: brave ? 3 : 1 } });
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
