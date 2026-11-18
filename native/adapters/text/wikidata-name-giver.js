// wikidata-name-giver.js — a GIVER for names: what is this word, in the world? (identity/novels PREREG-ROUND20 NOTE-2.)
// For a capitalised word of a being's mentions, public Wikidata (CC0) says which entities carry exactly that label and what each IS (P31): a human, a male / female / unisex given name, a family name, or something else (a municipality, a planet).
// Only the name string is sent, never text of a document. Every answer is cached with its query date and replayed offline, so a read never needs the network: ask first (async), then read (sync), as consultNonPersonal does for the lexicon.
//   makeWikidataNameGiver({ cacheFile, fetchImpl, rps })  .ask(words) -> Promise  .get(word) -> record | undefined  .size
//   genderPriorFromGiver({ text, cast, giver })  -> Map ref -> "m" | "f"        (a categorical attestation, overcomeable: pronouns.js priorGender)
//   nonPersonalFromGiver({ text, cast, giver })  -> Set of refs: a being with at least one word the giver answered and NO word with a person reading (human, given name, family name)
// Status: EXPERIMENTAL.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
export const Q = Object.freeze({ human: "Q5", male: "Q12308941", female: "Q11879590", unisex: "Q3409032", family: "Q101352" });
const API = "https://www.wikidata.org/w/api.php"; const UA = "khora-reader/1.0 (name lookups; no document text is sent)";
export const defaultCache = () => path.join(process.env.KHORA_GIVER_CACHE_DIR || path.join(os.homedir(), ".khora", "giver-cache"), "wikidata-names.jsonl");
export function makeWikidataNameGiver({ cacheFile = defaultCache(), fetchImpl = globalThis.fetch, rps = 4 } = {}) {
  const cache = new Map(); if (cacheFile && fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, "utf8").split("\n")) { if (!l.trim()) continue; try { const r = JSON.parse(l); cache.set(r.word, r); } catch { /* a torn last line is dropped */ } }
  let last = 0; const gap = 1000 / rps; const wait = async () => { const d = last + gap - Date.now(); if (d > 0) await new Promise((r) => setTimeout(r, d)); last = Date.now(); };
  const get = async (params) => { await wait(); const u = API + "?" + new URLSearchParams({ format: "json", origin: "*", ...params }); const r = await fetchImpl(u, { headers: { "user-agent": UA } }); if (!r.ok) throw new Error("wikidata " + r.status); return r.json(); };
  const append = (rec) => { cache.set(rec.word, rec); if (cacheFile) { fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.appendFileSync(cacheFile, JSON.stringify(rec) + "\n"); } };
  async function askOne(word) {
    const s = await get({ action: "wbsearchentities", search: word, language: "en", uselang: "en", type: "item", limit: "10" });
    const exact = (s.search ?? []).filter((x) => String(x.label ?? "").toLowerCase() === word.toLowerCase()); let ents = [];
    if (exact.length) { const g = await get({ action: "wbgetentities", ids: exact.map((x) => x.id).join("|"), props: "claims" }); ents = exact.map((x) => ({ id: x.id, p31: (g.entities?.[x.id]?.claims?.P31 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) })); }
    append({ word, exact: ents, asked: new Date().toISOString(), api: "wbsearchentities+wbgetentities" });
  }
  return { get: (w) => cache.get(w), get size() { return cache.size; }, async ask(words, { onProgress = null } = {}) { const need = [...new Set(words)].filter((w) => !cache.has(w)); let n = 0; for (const w of need) { try { await askOne(w); } catch (e) { if (onProgress) onProgress({ word: w, error: String(e.message) }); } if (onProgress && ++n % 50 === 0) onProgress({ done: n, of: need.length }); } return { asked: need.length, size: cache.size }; } };
}
const wordsOf = (T, b) => [...new Set((b.mentionSpans ?? []).flatMap(([s, e]) => (T.slice(s, e).match(/\p{Lu}[\p{L}’'-]*/gu) ?? [])))];
export const capitalisedWords = (text, cast) => [...new Set((cast ?? []).flatMap((b) => wordsOf(String(text ?? ""), b)))];
const personReading = (r) => (r.exact ?? []).some((e) => e.p31.some((c) => c === Q.human || c === Q.male || c === Q.female || c === Q.unisex || c === Q.family));
export function genderPriorFromGiver({ text, cast, giver }) {
  const out = new Map(); const T = String(text ?? "");
  for (const b of cast ?? []) { let m = 0, f = 0; for (const w of wordsOf(T, b)) { const r = giver.get(w); if (!r) continue; const isM = r.exact.some((e) => e.p31.includes(Q.male)), isF = r.exact.some((e) => e.p31.includes(Q.female)); if (isM && !isF) m++; else if (isF && !isM) f++; } if (m !== f) out.set(b.ref, m > f ? "m" : "f"); }
  return out;
}
export function nonPersonalFromGiver({ text, cast, giver }) {
  const out = new Set(); const T = String(text ?? "");
  for (const b of cast ?? []) { const recs = wordsOf(T, b).map((w) => giver.get(w)).filter((r) => r && r.exact.length); if (recs.length && !recs.some(personReading)) out.add(b.ref); }
  return out;
}

/** snapshotGiverFrom(file): the GivenNames@1 snapshot (identity/givers/wikidata-given-names-en.json: male / female / unisex given-name labels, one-time fetch, completeness named inside) as a giver with the same `get(word)` shape as the live one. A word in both the male and female lists is attested as both (the gender rule then says unknown). */
export function snapshotGiverFrom(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8")); const M = new Set(j.male), F = new Set(j.female), U = new Set(j.unisex);
  return { snapshot: { giver: j.giver, fetched: j.fetched, completeness: j.completeness }, get(w) { const p31 = []; if (M.has(w)) p31.push(Q.male); if (F.has(w)) p31.push(Q.female); if (U.has(w)) p31.push(Q.unisex); return p31.length ? { word: w, exact: [{ id: "snapshot", p31 }] } : undefined; }, get size() { return M.size + F.size + U.size; } };
}
