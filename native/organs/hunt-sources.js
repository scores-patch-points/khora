// hunt-sources.js — SOURCES FOR THE HUNT: whole documents, section by section, from more than one place.
// A source is { name, find(void) -> [{ title, url, passages: [{ section, text }] }] } (void-hunt.js). Nothing here reads language: a source only
// fetches and divides. What a page's own furniture is (the reference list, the external links, the navigation sections) is the source's to
// declare, because it is the source's structure, never the content the hunt should read; each source says what it drops.
//
// WHERE IT GOES: the network, through one injected `getJson(url)` (the caller's own, with its cache and its backoff). The default here sends a
// plain client name, no personal details, and waits and retries once on a rate limit.
// Wikimedia asks every client for a descriptive agent with a way to reach its operator. This default names the client only (no personal details
// go to an outside service unasked); set HUNT_USER_AGENT to add the operator's own contact, which is what lifts the throttle in practice.
const UA = (typeof process !== "undefined" && process.env?.HUNT_USER_AGENT) || "khora-chat/0.1 (read-only research)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const memo = new Map();   // a page fetched once is not fetched again in this process
/** a GET that asks for JSON, answers from memory when it has already been asked, and waits as long as the server's own `retry-after` says (up to `maxWait`) when it is rate limited */
export async function defaultGetJson(url, { tries = 3, ms = 9000, maxWait = 8000 } = {}) {
  if (memo.has(url)) return memo.get(url);
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms);
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: ac.signal });
      if (r.status === 429) { const said = (Number(r.headers.get("retry-after")) || 2 * (i + 1)) * 1000, wait = Math.min(maxWait, said); if (i + 1 < tries) { await sleep(wait); continue; } throw Object.assign(new Error(`rate limited (HTTP 429, retry-after ${r.headers.get("retry-after") ?? "unsaid"}s)`), { retryAfterMs: said }); }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json(); memo.set(url, j); return j;
    } finally { clearTimeout(t); }
  }
  throw new Error("rate limited (HTTP 429)");
}

const qs = (o) => new URLSearchParams(o).toString();
/** Wikipedia's own structure sections: what the page says about itself, not about its subject. Dropped, and said. */
export const WIKIPEDIA_FURNITURE = Object.freeze(["references", "external links", "see also", "notes", "further reading", "bibliography", "sources", "citations", "footnotes"]);

/** the plain text of a page, divided at its `== Heading ==` lines into passages (the lead has section null) */
export function passagesOfWikipediaText(text, { drop = WIKIPEDIA_FURNITURE } = {}) {
  const out = []; let section = null, buf = [], dropped = false;
  const flush = () => { if (buf.join("").trim() && !dropped) out.push({ section, text: buf.join("\n") }); buf = []; };
  for (const line of String(text ?? "").split("\n")) {
    const t = line.trim();
    if (t.startsWith("==") && t.endsWith("==")) { flush(); section = t.split("=").join("").trim(); dropped = drop.includes(section.toLowerCase()); }
    else buf.push(line);
  }
  flush(); return out;
}

/**
 * wikipediaSource({ getJson, documents }) : searches Wikipedia for the void's anchors and the relation, then fetches the WHOLE plain text of the
 * best pages (a page named for an anchor first), so a Cast section, an infobox sentence or a biography's middle is as readable as a lead.
 */
export function wikipediaSource({ getJson: given = null, documents = 4, lang = "en", maxWait = 8000, trails = null, now = () => Date.now() } = {}) {
  const base = given ?? ((u) => defaultGetJson(u, { maxWait }));   // how long a throttled request waits, at most, before it is reported as throttled
  const MARK = `wikipedia.${lang}:throttled`;
  // THE SHARED THROTTLE. A refusal is left in the environment for every other session and every later call to read: nobody keeps asking while it holds. A request that
  // finds the mark waits for it if that is within `maxWait` and otherwise does not go out at all.
  const getJson = !trails ? base : async (u) => {
    const until = trails.markedUntil(MARK);
    if (until) { const wait = until - now(); if (wait > maxWait) throw Object.assign(new Error(`rate limited (shared mark: another request was refused; wait ${Math.ceil(wait / 1000)}s)`), { retryAfterMs: wait }); await sleep(Math.max(0, wait)); }
    try { return await base(u); }
    catch (e) { if (["rate limit", "429"].some((x) => String(e?.message).includes(x))) trails.mark(MARK, now() + (e.retryAfterMs ?? 30000), String(e.message).slice(0, 80)); throw e; }
  };
  const api = `https://${lang}.wikipedia.org/w/api.php`;
  return {
    name: "Wikipedia",
    /** is there a page named exactly this? (the full-name test for a title like “War and Peace”) */
    async exists(name, { deadline = Infinity } = {}) {
      if (Date.now() > deadline) return false;
      const j = await getJson(`${api}?${qs({ action: "query", list: "search", srsearch: name, srlimit: "3", format: "json", origin: "*" })}`);
      return (j.query?.search ?? []).some((x) => String(x.title).split(" (")[0].toLowerCase() === String(name).toLowerCase());
    },
    /** one page by its title (the whole text, section by section), or null: what a remembered route asks for */
    async page(title, { deadline = Infinity } = {}) {
      if (Date.now() > deadline) return null;
      const j = await getJson(`${api}?${qs({ action: "query", prop: "extracts", explaintext: "1", redirects: "1", titles: title, format: "json", origin: "*" })}`);
      const pg = Object.values(j.query?.pages ?? {})[0]; if (!pg?.extract) return null;
      return { title: pg.title, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(pg.title).split(" ").join("_"))}`, passages: passagesOfWikipediaText(pg.extract) };
    },
    async find(v, { note = () => {}, deadline = Infinity } = {}) {
      const names = v.anchors.map((a) => a.text), titles = [];
      // one search for the anchors together, one for each anchor alone (a page named for an anchor is the best place to look for the rest)
      const queries = [...new Set([names.join(" "), ...names])].slice(0, 3);
      for (const [i, q] of queries.entries()) {
        if (Date.now() > deadline) { note({ step: "search", query: q, error: "time budget spent" }); break; }
        try { const j = await getJson(`${api}?${qs({ action: "query", list: "search", srsearch: q, srlimit: i === 0 ? "4" : "2", format: "json", origin: "*" })}`); for (const x of j.query?.search ?? []) titles.push(x.title); }
        catch (e) { note({ step: "search", query: q, error: String(e?.message ?? e).slice(0, 120) }); }
      }
      const exact = (t) => names.some((n) => n.toLowerCase() === t.toLowerCase());
      const ranked = [...new Set(titles)].sort((a, b) => Number(exact(b)) - Number(exact(a))).slice(0, documents);
      const docs = [];
      for (const title of ranked) {
        if (Date.now() > deadline) { note({ step: "fetch", title, error: "time budget spent" }); break; }
        try {
          const j = await getJson(`${api}?${qs({ action: "query", prop: "extracts", explaintext: "1", redirects: "1", titles: title, format: "json", origin: "*" })}`);
          const page = Object.values(j.query?.pages ?? {})[0]; if (!page?.extract) { note({ step: "fetch", title, error: "no text" }); continue; }
          docs.push({ title: page.title, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(page.title).split(" ").join("_"))}`, passages: passagesOfWikipediaText(page.extract) });
        } catch (e) { note({ step: "fetch", title, error: String(e?.message ?? e).slice(0, 120) }); }
      }
      return docs;
    },
  };
}
