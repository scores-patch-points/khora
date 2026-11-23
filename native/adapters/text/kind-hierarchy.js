// kind-hierarchy.js — the KIND hierarchy from Wikidata, the cleaner half of what the gloss was for.
//
// The gloss (Wiktionary definition) is prose; the kind hierarchy (a city is a kind of municipality,
// a municipality is a kind of administrative entity) is a RELATION — and Wikidata already has it as
// clean triples: P279 "subclass of" and P31 "instance of", CC0. This giver follows the P279 chain
// from a word's entity up to a root, so "is this word a place-type" is a literal reachability check,
// not a gloss parse. Ask-then-read with an offline cache. No document text is ever sent, only the word.
//
// The transitive P279 closure is ONE SPARQL query per word (`wdt:P279*`), not a request per ancestor —
// the recursive form hammered the REST API into a 429; SPARQL answers the whole chain at once.
//
//   makeKindGiver({ cacheFile }) -> { get(word), async ask(words), async isPlaceType(word) }
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEARCH_API = "https://www.wikidata.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
const UA = "khora-reader/1.0 (kind lookups; no document text is sent)";
export const defaultCache = () => path.join(process.env.KHORA_GIVER_CACHE_DIR || path.join(os.homedir(), ".khora", "giver-cache"), "wikidata-kinds.jsonl");

// place roots: a word whose P279 chain reaches any of these is a place-type. The set is the Wikidata
// hierarchy's own place branch — geographic location, administrative territorial entity, settlement,
// municipality, polity — received, not invented; a reach not in the set is a typed gap, never a guess.
export const PLACE_ROOTS = Object.freeze(new Set(["Q2221906", "Q56061", "Q486972", "Q7930989", "Q15284", "Q1645280", "Q6256", "Q7275", "Q1250464"]));

export function makeKindGiver({ cacheFile = defaultCache(), fetchImpl = globalThis.fetch, rps = 1 } = {}) {
  const cache = new Map(); // word -> { entity, ancestors, place, asked }
  if (cacheFile && fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, "utf8").split("\n")) { if (!l.trim()) continue; try { const r = JSON.parse(l); cache.set(r.word, r); } catch { /* torn last line */ } }
  let last = 0; const gap = 1000 / rps;
  const wait = async () => { const d = last + gap - Date.now(); if (d > 0) await new Promise((r) => setTimeout(r, d)); last = Date.now(); };
  const append = (rec) => { cache.set(rec.word, rec); if (cacheFile) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.appendFileSync(cacheFile, JSON.stringify(rec) + "\n"); } };

  async function fetchJson(url, accept = "application/json") {
    for (let i = 0; i < 4; i++) {
      await wait();
      const r = await fetchImpl(url, { headers: { "user-agent": UA, accept } });
      if (r.ok) return r.json();
      if (r.status === 429) { await new Promise((x) => setTimeout(x, 2000 * (i + 1))); continue; }
      throw new Error("wikidata " + r.status);
    }
    throw new Error("wikidata rate-limited, gave up");
  }
  // the word's Wikidata entity id, by exact label match
  async function entityOf(word) {
    const u = SEARCH_API + "?" + new URLSearchParams({ action: "wbsearchentities", search: word, language: "en", uselang: "en", type: "item", limit: "5", format: "json" });
    const j = await fetchJson(u);
    const exact = (j.search ?? []).filter((x) => String(x.label ?? "").toLowerCase() === word.toLowerCase());
    return (exact[0] ?? j.search?.[0])?.id ?? null;
  }
  // the full entity the word points at: id + label + description, from the same search. This is the
  // REFERENCE, not the gloss — "who is Tolstoy" resolves to the person, not the surname's etymology.
  async function entityInfo(word) {
    const u = SEARCH_API + "?" + new URLSearchParams({ action: "wbsearchentities", search: word, language: "en", uselang: "en", type: "item", limit: "5", format: "json" });
    const j = await fetchJson(u);
    const exact = (j.search ?? []).filter((x) => String(x.label ?? "").toLowerCase() === word.toLowerCase());
    const r = exact[0] ?? j.search?.[0] ?? null;
    return r ? { id: r.id, label: r.label ?? null, description: r.description ?? null } : null;
  }
  // the P279 chain WITH English labels, one SPARQL query — the human-readable kind, not raw Q-ids.
  async function kindChain(word) {
    const e = await entityInfo(word);
    if (!e) return { ...e, ancestors: [] };
    const q = `SELECT ?ancestorLabel WHERE { wd:${e.id} wdt:P279* ?ancestor . ?ancestor rdfs:label ?ancestorLabel . FILTER(lang(?ancestorLabel) = "en") }`;
    const j = await fetchJson(SPARQL + "?format=json&query=" + encodeURIComponent(q), "application/sparql-results+json");
    const ancestors = (j.results?.bindings ?? []).map((b) => String(b.ancestorLabel?.value ?? "")).filter(Boolean);
    return { ...e, ancestors };
  }
  // all P279 ancestors, one SPARQL query (the transitive subclass-of closure)
  async function ancestorsOf(id) {
    const q = `SELECT ?ancestor WHERE { wd:${id} wdt:P279* ?ancestor . }`;
    const j = await fetchJson(SPARQL + "?format=json&query=" + encodeURIComponent(q), "application/sparql-results+json");
    return (j.results?.bindings ?? []).map((b) => String(b.ancestor?.value ?? "").split("/").pop()).filter(Boolean);
  }

  async function isPlaceType(word) {
    if (cache.has(word)) return cache.get(word);
    const entity = await entityOf(word);
    if (!entity) { const rec = { word, entity: null, ancestors: [], place: false, gap: "no_entity", asked: new Date().toISOString() }; append(rec); return rec; }
    const ancestors = await ancestorsOf(entity);
    const rec = { word, entity, ancestors, place: ancestors.some((a) => PLACE_ROOTS.has(a)), asked: new Date().toISOString() };
    append(rec); return rec;
  }

  return { get: (word) => cache.get(word), get size() { return cache.size; }, entityOf, ancestorsOf, isPlaceType, async ask(words, { onProgress = null } = {}) { for (const w of words) { try { await isPlaceType(w); } catch (e) { if (onProgress) onProgress({ word: w, error: String(e.message) }); } } return { asked: words.length, size: cache.size }; } };
}
