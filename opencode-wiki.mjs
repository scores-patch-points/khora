// opencode-wiki.mjs — THE ONE CROSSING to Wikimedia for the falsifier: Wikipedia, Wiktionary and Wikidata.
//
// On demand only. One gate across all three (Wikimedia limits this machine to about one request per 10 s across its
// APIs), every answer cached on disk by its full URL, and a request that would overrun the caller's deadline is
// SKIPPED and said so — never queued past it, never bulk. The payloads are parsed by external-evidence.js (pure,
// captured shapes) where it already has a parser; this file owns only the network and the cache.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { parseWiktionary, parseWikidataSearch } from "./native/adapters/text/external-evidence.js";

const GAP_MS = Number(process.env.FOLD_WIKI_GAP_MS ?? 10_000);
const CACHE = process.env.FOLD_RESEARCH_CACHE ?? path.join(os.homedir(), ".cache", "fold-research");
const UA = "foldcode-ground/0.2 (local grounding check; on demand, cached, one request per 10 s)";
let last = 0;
let chain = Promise.resolve();
export const stats = { requests: 0, cached: 0, skipped: 0 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (url) => path.join(CACHE, "wikimedia", crypto.createHash("sha256").update(url).digest("hex").slice(0, 32) + ".json");

/** GET a Wikimedia JSON endpoint through the gate and the cache: { ok, json, cached } or { ok:false, why, skipped? }. */
export function wikiGet(url, { deadline = Infinity, fetchImpl = globalThis.fetch } = {}) {
  try {
    const hit = JSON.parse(fs.readFileSync(file(url), "utf8"));
    stats.cached++;
    return Promise.resolve({ ok: true, json: hit, cached: true });
  } catch { /* not cached */ }
  // A replay of a recording (eval/keyed, eval/void): a request the recording does not hold is an error, never a fetch.
  if (process.env.FOLD_WIKI_OFFLINE === "1") return Promise.resolve({ ok: false, why: "offline: not in the recording", offline: true });
  // serialized: concurrent callers wait their turn through ONE gate
  const run = chain.then(async () => {
    const wait = Math.max(0, last + GAP_MS - Date.now());
    if (Date.now() + wait + 3000 > deadline) { stats.skipped++; return { ok: false, skipped: true, why: "skipped: the Wikimedia rate gap would overrun this answer's research budget" }; }
    if (wait) await sleep(wait);
    last = Date.now();
    stats.requests++;
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": UA, accept: "application/json" }, signal: AbortSignal.timeout(Math.max(3000, Math.min(15_000, deadline - Date.now()))) });
      if (res.status === 404) { const json = { __missing: true }; remember(url, json); return { ok: true, json }; }
      if (!res.ok) return { ok: false, why: `${new URL(url).host} answered ${res.status}` };
      const json = await res.json();
      remember(url, json);
      return { ok: true, json };
    } catch (e) {
      return { ok: false, why: `${new URL(url).host} unreachable (${e?.name ?? "error"})` };
    }
  });
  chain = run.catch(() => {});
  return run;
}
function remember(url, json) {
  try {
    fs.mkdirSync(path.dirname(file(url)), { recursive: true });
    fs.writeFileSync(file(url), JSON.stringify(json));
    // an index of what was fetched (the host of every request is auditable: eval/keyed V5)
    fs.appendFileSync(path.join(path.dirname(file(url)), "index.jsonl"), JSON.stringify({ url: url.replace(/(search|ids|titles)=[^&]*/g, "$1=…"), host: new URL(url).host, at: new Date().toISOString() }) + "\n");
  } catch { /* a miss next time */ }
}

// ── THE ENTITY STORE: every Wikidata entity (a property, a class, an item) is fetched ONCE and kept ────────────────────────────────────────────────
// The keyed door asks for the same things over and over: the labels, aliases and datatypes of the properties an entity carries, the classes' declared
// keys, the labels of the items a value points at. Measured on the first recording pass of eval/keyed: 63 requests in ten minutes, 27 of them labels and
// 16 claims — none of it changes between one entity and the next. A record keeps WHICH props and languages it holds, so a request for a subset is served
// with no request, and a request for a mix fetches only the ids not held, in one batch. Properties never expire; an item's record is refreshed after 30 days.
const entDir = () => path.join(CACHE, "wikidata-entities");
const entFile = (id) => path.join(entDir(), `${id.replace(/[^A-Za-z0-9]/g, "_")}.json`);
const ITEM_TTL_MS = Number(process.env.FOLD_ENTITY_TTL_MS ?? 30 * 24 * 3600 * 1000);
function entRead(id) {
  try {
    const rec = JSON.parse(fs.readFileSync(entFile(id), "utf8"));
    if (id.startsWith("Q") && Date.now() - (rec.at ?? 0) > ITEM_TTL_MS) return null;
    return rec;
  } catch { return null; }
}
function entWrite(id, props, langs, data) {
  try {
    const old = entRead(id);
    const rec = { at: Date.now(), props: [...new Set([...(old?.props ?? []), ...props])], langs: [...new Set([...(old?.langs ?? []), ...langs])], data: { ...(old?.data ?? {}), ...data } };
    fs.mkdirSync(entDir(), { recursive: true });
    fs.writeFileSync(entFile(id), JSON.stringify(rec));
  } catch { /* a miss next time */ }
}
/** Keep every entity of a wbgetentities response (what one request already paid for). */
export function seedEntities(json, props, langs) {
  for (const [id, e] of Object.entries(json?.entities ?? {})) if (e && !e.missing && /^[PQ]\d+$/.test(id)) entWrite(id, props, langs, e);
}
const csv = (v, d) => String(v || d).split("|").filter(Boolean);
export const entityStats = { served: 0, fetched: 0 };

/** The getJson the keyed door takes: a wbgetentities request is answered from the store for the ids it holds and fetched (one batch) for the rest;
 *  a pageprops lookup for a title whose item is already known is answered without a request; anything else goes through the gate and its cache. */
export function makeGetJson({ known = {}, ...opts } = {}) {
  return async (url) => {
    const u = new URL(url);
    const a = u.searchParams;
    if (u.host.endsWith("wikipedia.org") && a.get("prop") === "pageprops" && known.pageprops?.[a.get("titles")]) {
      return { query: { pages: { 1: { pageprops: { wikibase_item: known.pageprops[a.get("titles")] } } } } };
    }
    if (u.host === "www.wikidata.org" && a.get("action") === "wbgetentities" && a.get("ids")) {
      const ids = a.get("ids").split("|").filter(Boolean);
      const props = csv(a.get("props"), "labels"), langs = csv(a.get("languages"), "en");
      const have = {}, missing = [];
      for (const id of ids) {
        const rec = entRead(id);
        if (rec && props.every((p) => rec.props.includes(p)) && langs.every((l) => rec.langs.includes(l))) have[id] = rec.data;
        else missing.push(id);
      }
      entityStats.served += ids.length - missing.length;
      for (let i = 0; i < missing.length; i += 50) {
        const batch = missing.slice(i, i + 50);
        const b = new URL(url);
        b.searchParams.set("ids", batch.join("|"));
        const r = await wikiGet(b.toString(), opts);
        if (!r.ok) throw new Error(r.why);
        entityStats.fetched += batch.length;
        seedEntities(r.json, props, langs);
        for (const id of batch) if (r.json?.entities?.[id]) have[id] = r.json.entities[id];
      }
      return { entities: have };
    }
    const r = await wikiGet(url, opts);
    if (!r.ok) throw new Error(r.why);
    return r.json;
  };
}

const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");

/** Wikidata wbsearchentities: candidates for a name, ambiguity kept (external-evidence.js's parser). */
export async function wikidataSearch(name, opts) {
  const r = await wikiGet(`https://www.wikidata.org/w/api.php?${q({ action: "wbsearchentities", format: "json", language: "en", uselang: "en", type: "item", limit: 7, search: name })}`, opts);
  return r.ok ? { ...parseWikidataSearch(r.json, name), cached: !!r.cached } : { found: false, candidates: [], why: r.why, skipped: r.skipped };
}

const yearOf = (v) => { const m = /^([+-]?\d{1,4})/.exec(String(v?.time ?? "").replace(/^\+/, "")); return m ? Number(m[1]) : null; };
const timeOf = (v) => String(v?.time ?? "").replace(/^\+/, "").replace(/T.*$/, "").replace(/-00/g, "");
const claimTimes = (claims, p) => (claims?.[p] ?? []).map((c) => c?.mainsnak?.datavalue?.value).filter(Boolean).map((v) => ({ year: yearOf(v), date: timeOf(v) }));
const claimItems = (claims, p) => (claims?.[p] ?? []).map((c) => c?.mainsnak?.datavalue?.value?.id).filter(Boolean);

/** Wikidata wbgetentities for up to 7 ids: per entity its English label/description, enwiki title, and the few facts
 *  the falsifier reads structurally (birth/death dates, instance-of, place ids). */
export async function wikidataEntities(ids, opts) {
  if (!ids.length) return { ok: true, entities: [] };
  const r = await wikiGet(`https://www.wikidata.org/w/api.php?${q({ action: "wbgetentities", format: "json", ids: ids.join("|"), props: "labels|descriptions|aliases|sitelinks|claims", languages: "en|mul", languagefallback: 1, sitefilter: "enwiki" })}`, opts);
  if (!r.ok) return { ok: false, entities: [], why: r.why, skipped: r.skipped };
  seedEntities(r.json, ["labels", "descriptions", "aliases", "sitelinks", "claims"], ["en", "mul"]);   // what this request paid for is kept for the keyed door
  const entities = ids.map((id) => r.json?.entities?.[id]).filter((e) => e && !e.missing).map((e) => ({
    qid: e.id,
    // Wikidata keeps many names (people's especially) under the language-neutral `mul` label, with no `en` one
    label: e.labels?.en?.value ?? e.labels?.mul?.value ?? null,
    description: e.descriptions?.en?.value ?? null,
    aliases: [...(e.aliases?.en ?? []), ...(e.aliases?.mul ?? [])].map((a) => a.value),
    enwiki: e.sitelinks?.enwiki?.title ?? null,
    born: claimTimes(e.claims, "P569"),
    died: claimTimes(e.claims, "P570"),
    instanceOf: claimItems(e.claims, "P31"),
    birthPlace: claimItems(e.claims, "P19"),
    deathPlace: claimItems(e.claims, "P20"),
    url: `https://www.wikidata.org/wiki/${e.id}`,
  }));
  return { ok: true, entities, cached: !!r.cached };
}

/** Wikipedia intros for several titles in ONE request (exintro allows a batch): Map title → intro text. */
export async function wikipediaIntros(titles, opts) {
  if (!titles.length) return { ok: true, intros: new Map() };
  const r = await wikiGet(`https://en.wikipedia.org/w/api.php?${q({ action: "query", format: "json", formatversion: 2, redirects: 1, prop: "extracts", exintro: 1, explaintext: 1, exlimit: "max", titles: titles.join("|") })}`, opts);
  if (!r.ok) return { ok: false, intros: new Map(), why: r.why, skipped: r.skipped };
  const intros = new Map();
  const back = new Map((r.json?.query?.redirects ?? []).map((x) => [x.to, x.from]));
  for (const p of r.json?.query?.pages ?? []) if (p?.extract) { intros.set(p.title, p.extract); if (back.has(p.title)) intros.set(back.get(p.title), p.extract); }
  return { ok: true, intros };
}

/** A whole Wikipedia article as plain text. */
export async function wikipediaArticle(title, opts) {
  const r = await wikiGet(`https://en.wikipedia.org/w/api.php?${q({ action: "query", format: "json", formatversion: 2, redirects: 1, prop: "extracts|pageprops", explaintext: 1, titles: title })}`, opts);
  if (!r.ok) return { found: false, why: r.why, skipped: r.skipped };
  const page = r.json?.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return { found: false, title, why: "no article" };
  if (page.pageprops && "disambiguation" in page.pageprops) return { found: false, title: page.title, why: "a disambiguation page names no one being" };
  return { found: true, title: page.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`, text: page.extract, cached: !!r.cached };
}

/** Wiktionary: what a single word is (its parts of speech), for when the reader is not sure a word is a name at all. */
export async function wiktionary(word, opts) {
  const r = await wikiGet(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, opts);
  if (!r.ok) return { found: false, word, why: r.why, skipped: r.skipped };
  return { ...parseWiktionary(r.json?.__missing ? {} : r.json, word), cached: !!r.cached };
}
