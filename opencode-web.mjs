// opencode-web.mjs — THE ONE CROSSING to the open web for the falsifier: a search (Brave, DuckDuckGo, asked together) and a page read.
//
// A claim an encyclopedia states is verified there; "Wikipedia is an index, not a source", so the primary tier goes and finds a page of another kind of host
// (government, education, news agency, organisation) that says the same (the-fold/fold-chat-primary.js findPrimary; this file only does the network).
// On demand and bounded: a search is spaced by FOLD_WEB_GAP_MS (default 4 s; the engines throttle one address at ~45 searches an hour, and the cooldown in
// fold-chat-engines.js backs off a refusing engine), every answer is cached on disk by its URL or query, a request that would overrun the deadline is skipped.
// DECLARED: the page reader sends one GET per URL with an honest user agent and does not read robots.txt; a page over 2 MB or not text/html is not read.
// FOLD_WEB_OFFLINE=1 replays the cache only (a miss is an error, never a fetch) — eval/keyed uses it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { searchDirect, ENGINES } from "./vendor/the-fold/fold-chat-engines.js";
import { extractReadable } from "./native/organs/web.js";
import { wikiGet } from "./opencode-wiki.mjs";

const GAP_MS = Number(process.env.FOLD_WEB_GAP_MS ?? 4000);
const CACHE = process.env.FOLD_RESEARCH_CACHE ?? path.join(os.homedir(), ".cache", "fold-research");
const UA = "foldcode-ground/0.2 (local grounding check; on demand, cached, one GET per page)";
const MAX_BYTES = 2_000_000;
export const stats = { searches: 0, pages: 0, cached: 0, skipped: 0 };
let last = 0;
let chain = Promise.resolve();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (kind, s) => path.join(CACHE, "web", kind, crypto.createHash("sha256").update(s).digest("hex").slice(0, 32) + ".json");
const offline = () => process.env.FOLD_WEB_OFFLINE === "1";
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
function remember(kind, s, value, host) {
  try {
    const f = key(kind, s);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(value));
    fs.appendFileSync(path.join(CACHE, "web", "index.jsonl"), JSON.stringify({ kind, host, at: new Date().toISOString() }) + "\n");
  } catch { /* a miss next time */ }
}

/** search(query) -> [{ title, url, snippet }] — cached by query; throws a typed error the caller records. */
export function makeSearch({ deadline = Infinity, fetchImpl = globalThis.fetch } = {}) {
  return (query) => {
    const hit = read(key("search", query));
    if (hit) { stats.cached++; return Promise.resolve(hit); }
    if (offline()) return Promise.reject(new Error("offline: not in the recording"));
    const run = chain.then(async () => {
      const wait = Math.max(0, last + GAP_MS - Date.now());
      if (Date.now() + wait + 5000 > deadline) { stats.skipped++; throw new Error("skipped: the search gap would overrun this answer's research budget"); }
      if (wait) await sleep(wait);
      last = Date.now();
      stats.searches++;
      const r = await searchDirect(query, { fetchImpl, min: 3 });
      if (!r.results.length) throw new Error("no results" + (r.blocked.length ? ` (${r.blocked.join(", ")} refused)` : "") + (r.tried?.length ? `: ${r.tried.map((t) => `${t.id} ${t.why ?? "ok"}`).join("; ")}` : ""));
      remember("search", query, r.results, r.engine);
      return r.results;
    });
    chain = run.catch(() => {});
    return run;
  };
}

/** readPage(url) -> string|null — the readable text of an html/text page, cached by URL. */
export function makeReadPage({ deadline = Infinity, fetchImpl = globalThis.fetch } = {}) {
  return async (url) => {
    const hit = read(key("page", url));
    if (hit) { stats.cached++; return hit.text; }
    if (offline()) throw new Error("offline: not in the recording");
    if (Date.now() + 4000 > deadline) { stats.skipped++; throw new Error("skipped: past this answer's research budget"); }
    stats.pages++;
    const res = await fetchImpl(url, { headers: { "user-agent": UA, accept: "text/html,text/plain;q=0.9" }, redirect: "follow", signal: AbortSignal.timeout(Math.max(3000, Math.min(12_000, deadline - Date.now()))) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)|application\/xhtml/.test(type)) throw new Error(`not text (${type.split(";")[0] || "unknown"})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("too large");
    const html = buf.toString("utf8");
    const text = /text\/plain/.test(type) ? html : extractReadable(html).text;
    remember("page", url, { text }, new URL(url).hostname);
    return text;
  };
}

const ent = (t) => String(t).replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const stemsOfText = (t) => [...new Set((String(t).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []))];

/** THE INDEX'S OWN FOOTNOTE FOR A CLAIM. An encyclopedia article is an index to its sources: the sentence that states the claim carries a footnote, and the
 *  footnote's reference is the page to go and read. Returns { sentence, links:[{title,url,snippet}], refs } for the article sentence that best carries the
 *  claim (every figure of the claim, most content stems), or { sentence:null, links:[] }. One gated Wikimedia request (action=parse), cached. */
export async function citedFor(title, claim, { lang = "en", deadline = Infinity, fetchImpl } = {}) {
  const q = new URLSearchParams({ action: "parse", format: "json", origin: "*", page: title, prop: "text", redirects: "1", disableeditsection: "1", disabletoc: "1" });
  const r = await wikiGet(`https://${lang}.wikipedia.org/w/api.php?${q}`, { deadline, fetchImpl });
  if (!r.ok) throw new Error(r.why);
  const html = String(r.json?.parse?.text?.["*"] ?? r.json?.parse?.text ?? "").replace(/&#95;/g, "_");
  if (!html) return { sentence: null, links: [], why: "no article text" };
  // 1. footnote id -> the page it cites (the original URL, not an archive copy, when both are given)
  const refs = new Map();
  for (const m of html.matchAll(/<li id="(cite_note-[^"]+)"[^>]*>([\s\S]*?)<\/li>/g)) {
    // a short-form note (sfn) names a bibliography entry (#CITEREF…) instead of linking out: the entry's own links are the note's
    const via = [...m[2].matchAll(/href="#(CITEREF[^"]+)"/g)].map((x) => x[1]);
    let body = m[2];
    for (const id of via) { const e = new RegExp(`id="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>([\\s\\S]*?)</cite>`).exec(html); if (e) body += " " + e[1]; }
    const hrefs = [...body.matchAll(/<a[^>]*class="[^"]*external[^"]*"[^>]*href="(https?:\/\/[^"]+)"/g)].map((x) => ent(x[1]));
    const own = hrefs.find((u) => !/web\.archive\.org|archive\.(is|today|ph)|webcitation/.test(u)) ?? hrefs[0];
    if (own) refs.set(m[1], own);
  }
  // 2. the prose, with each footnote mark kept as a token on the sentence it ends
  const body = html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<sup[^>]*class="[^"]*\breference\b[^"]*"[^>]*>\s*<a[^>]*href="#(cite_note-[^"]+)"[^>]*>[\s\S]*?<\/a>\s*<\/sup>/g, "⟦$1⟧");
  const want = stemsOfText(claim);
  const figures = (String(claim).match(/\b\d[\d,.]*\b/g) ?? []).map((x) => x.replace(/,/g, ""));
  let best = null;
  for (const blk of body.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const text = ent(blk[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text.length < 30) continue;
    for (const sent of text.split(/(?<=[.!?](?:⟦[^⟧]*⟧)*)\s+(?=[\p{Lu}⟦])/u)) {
      const plain = sent.replace(/⟦[^⟧]*⟧/g, "");
      if (figures.some((f) => !plain.replace(/,/g, "").includes(f))) continue;
      const have = new Set(stemsOfText(plain));
      const score = want.filter((w) => have.has(w)).length;
      if (score >= (figures.length ? 1 : Math.max(2, Math.ceil(want.length * 0.5))) && (!best || score > best.score)) best = { score, sent };
    }
  }
  if (!best) return { sentence: null, links: [], why: "no article sentence carries the claim" };
  const ids = [...best.sent.matchAll(/⟦([^⟧]+)⟧/g)].map((m) => m[1]);
  const links = [...new Set(ids.map((id) => refs.get(id)).filter(Boolean))].map((url) => ({ title: new URL(url).hostname.replace(/^www\./, ""), url, snippet: "" }));
  return { sentence: best.sent.replace(/⟦[^⟧]*⟧/g, "").trim(), links, footnotes: ids.length, why: links.length ? null : ids.length ? "its footnotes cite no web page" : "that sentence carries no footnote" };
}
