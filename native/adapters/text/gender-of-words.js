// gender-of-words.js — THE GENDER A NAME'S WORDS GIVE IT, as a prior that says where it came from and how often that source has been right.
// The owner (2026-11-23): "(1) priors that would weight this (2) be able to look up the name Natasha (3) Mrs gives it away." In order of strength, each a revisable claim:
//   TITLE       a title word that PRECEDES a name in the being's own words ("Mrs. Bennet", "Madame Defarge", "Uncle Tom"): the name carries it. A title that is the last word ("Sherlock Holmes") says
//               nothing. After a title the next word is a surname, so it is NOT looked up as a given name ("Miss Lucas" is a woman although Lucas is a man's given name).
//   NAME        the first word looked up in the dictionary's given-name senses ("Natasha": "A female given name from Russian"); a word with both kinds of sense, or none, says nothing.
//   SNAPSHOT    the Wikidata given-name snapshot the canonical read already has (CC0, identity/givers), only where the two above are silent, and only a single answer (a label in two lists, or in the
//               unisex list, says nothing). The owner added it (2026-11-23) after it was measured: it adds coverage at a lower reliability than the other two, and says so with every answer.
// TOLD (the owner, 2026-11-24: "if the person says 'that's not right' they can correct the record and the system will be right next time", and yes, across conversations): what the user has said about a
//               name outranks all three, with its date and their own words as the reliability. It is read from the pharos log (entries of kind "correction", written by the chat through its own door),
//               appended and never overwritten: the latest for a name wins, a later one with class null retracts, and the earlier stays in the log as the mistake it was. It is still a prior: the text's own
//               recurring pronouns overcome it, as they overcome the others (another person may share the name).
// Where the words disagree among themselves, or nothing speaks, the answer is null and the claim stays open: the chat asks. A prior is overcome by the text's own recurring pronouns (the cast
// does that). Measured reliability of each source on held-out novels is carried from the table's provenance and returned with every answer, so a reply can show it.
// The table is built by scripts/build-name-gender-dictionary.mjs from the dictionary (a giver, CC BY-SA), not typed here. Pure: the table, the snapshot and the person test are injected.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { snapshotGiverFrom, Q } from "./wikidata-name-giver.js";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DICTIONARY_FILE = path.join(HERE, "name-gender", "dictionary-en.json");
export const SNAPSHOT_FILE = path.join(HERE, "..", "..", "..", "identity", "givers", "wikidata-given-names-en.json");
/** loadNameGenderDictionary(file) -> the NameGenderDictionary@1 table, or null (a typed gap: the caller says the table is missing, it does not run without saying so) */
export function loadNameGenderDictionary(file = DICTIONARY_FILE) { try { const j = JSON.parse(fs.readFileSync(file, "utf8")); return j?.schema === "NameGenderDictionary@1" ? j : null; } catch { return null; } }
const norm = (w) => String(w ?? "").replace(/[.,;:!?'’“”"]+$/u, "").replace(/^[“"'‘]+/u, "").toLowerCase();   // regex-ok: punctuation around a name word
const rate = (m, k) => { const x = m?.[k]; return Array.isArray(x) && x[0] ? { right: x[1], of: x[0] } : null; };
/** the measured reliability of a source, pooled over the held-out splits recorded in the table's provenance: "right 93% (41 of 44) on held-out novels" */
export function reliabilityOf(table, source) {
  const m = table?.provenance?.measured ?? {}, layer = source === "wikidata" ? m.layers?.snapshotWhereOthersSilent : null;   // the snapshot is used only where the table is silent: that is the rate that matters
  if (Array.isArray(layer) && layer[0]) return { right: layer[1], of: layer[0], rate: +(layer[1] / layer[0]).toFixed(2), text: `right ${Math.round(100 * layer[1] / layer[0])}% (${layer[1]} of ${layer[0]}) where the other sources are silent, on held-out novels` };
  let right = 0, of = 0;
  for (const split of ["dev", "fresh", "test"]) { const r = rate(m[split], source); if (r) { right += r.right; of += r.of; } }
  return of ? { right, of, rate: +(right / of).toFixed(2), text: `right ${Math.round(100 * right / of)}% (${right} of ${of}) on held-out novels` } : null;
}
/**
 * readCorrections(entries) — the user's corrections, from pharos entries in log order: { kind: "correction", body: { key, class: "m" | "f" | "x" | null, said, thread, was } }.
 * The key is the name word, lower-cased ("casey"). class "x" means this person goes by "they" (decided: voiced they, not the default). class null retracts what an earlier correction said. Later entries win;
 * the earlier ones are not touched (the log is append-only; this reads it). -> Map key -> { class, said, thread, at }
 */
export function readCorrections(entries) {
  const out = new Map();
  for (const e of entries ?? []) {
    if (e?.kind !== "correction") continue; const b = e.body ?? {}, key = String(b.key ?? "").trim().toLowerCase(); if (!key) continue;
    if (b.class === null) out.delete(key); else if (b.class === "m" || b.class === "f" || b.class === "x") out.set(key, { class: b.class, said: b.said ?? null, thread: b.thread ?? null, at: e.at ?? null });
  }
  return out;
}

/**
 * makeNameGenderPrior({ dictionary, snapshot, isPerson, corrections })
 *   dictionary  the table (loadNameGenderDictionary); null makes every answer open and `missing` true
 *   snapshot    optional { get(capitalisedWord) -> { exact: [{ p31: [...] }] } | undefined } with its Q ids in `ids` ({ male, female, unisex }); only used where the table is silent
 *   isPerson    optional (words) -> boolean: false means "not a person", so no gender (a city, a god)
 *   corrections optional Map key -> { class, said, at } (readCorrections): what the user has said, outranking every other source
 * .explain(words) -> { gender: "m" | "f" | null, class: "m" | "f" | "x" | null, source: "told" | "title" | "name" | "snapshot" | null, word, reliability, pronouns, open: why it is open | null }
 *   `class` is "x" only when the user said this person goes by "they"; `pronouns` is pronounsFor(class), decided or the "they" default
 * .genderOf(words) -> "m" | "f" | null      (the shape the cast's genderOf takes: its name words, flat)
 */
export function makeNameGenderPrior({ dictionary = null, snapshot = null, snapshotIds = null, isPerson = null, corrections = null } = {}) {
  const missing = !dictionary, titles = dictionary?.titles ?? {}, names = dictionary?.words ?? {};
  function explain(words) {
    const ws = (words ?? []).map(String).filter(Boolean), n = ws.length, withWho = (r) => ({ ...r, class: r.gender ?? r.class ?? null, pronouns: pronounsFor(r.gender ?? r.class ?? null, { decided: r.source === "told" || !!r.gender }) });
    const open = (why) => withWho({ gender: null, source: null, word: null, reliability: null, open: why });
    if (!n) return open("no words");
    // what the user said, first: the whole name, then its first word that is not a title
    if (corrections?.size) { const keys = [ws.map(norm).join(" "), ...ws.map(norm).filter((w) => !titles[w])]; for (const k of keys) { const c = corrections.get(k); if (c) return withWho({ gender: c.class === "x" ? null : c.class, class: c.class, source: "told", word: k, reliability: { text: `you told me${c.at ? ` on ${String(c.at).slice(0, 10)}` : ""}${c.said ? `: “${c.said}”` : ""}` }, open: null }); } }
    if (missing) return open("no table of given names");
    if (isPerson && isPerson(ws) === false) return open("not a person");
    // a title that precedes a name word
    const hits = ws.map((w, i) => ({ w: norm(w), i })).filter(({ w, i }) => i < n - 1 && titles[w]);
    if (hits.length) { const sides = [...new Set(hits.map(({ w }) => titles[w]))]; if (sides.length === 1) return withWho({ gender: sides[0], source: "title", word: hits[0].w, reliability: reliabilityOf(dictionary, "title"), open: null }); return open(`the titles disagree (${hits.map((h) => h.w).join(", ")})`); }
    // the first word, as a given name (not after a title: handled above)
    const first = norm(ws[0]), c = names[first];
    if (c && (c[0] > 0) !== (c[1] > 0)) return withWho({ gender: c[0] > 0 ? "m" : "f", source: "name", word: first, reliability: reliabilityOf(dictionary, "dictionary"), open: null });
    if (c && c[0] > 0 && c[1] > 0) return open(`${first} is both a man's and a woman's given name`);
    if (snapshot && snapshotIds) { const r = snapshot.get(String(ws[0]).replace(/[.,;:!?'’“”"]+$/u, "")); const p = r?.exact?.[0]?.p31 ?? [], m = p.includes(snapshotIds.male), f = p.includes(snapshotIds.female), u = p.includes(snapshotIds.unisex); if (!u && m !== f) return withWho({ gender: m ? "m" : "f", source: "snapshot", word: first, reliability: reliabilityOf(dictionary, "wikidata"), open: null }); }
    return open("nothing in the words says");
  }
  /** isGivenName(word) -> { is, source: "name" | "snapshot" | null }: is this ONE word a given name, whatever its gender (even one with both senses)? A name CANDIDATE for the reader (a sentence-initial "Riley" the part-of-speech prior tags as an adjective), never a ruling: "Rose" and "Mark" are also words. */
  function isGivenName(word) {
    const w = norm(word); if (!w) return { is: false, source: null };
    const c = names[w]; if (c && (c[0] > 0 || c[1] > 0)) return { is: true, source: "name" };
    if (snapshot && snapshotIds) { const r = snapshot.get(String(word).replace(/[.,;:!?'’“”"]+$/u, "")), p = r?.exact?.[0]?.p31 ?? []; if (p.includes(snapshotIds.male) || p.includes(snapshotIds.female) || p.includes(snapshotIds.unisex)) return { is: true, source: "snapshot" }; }
    return { is: false, source: null };
  }
  const layers = { told: corrections ? `${corrections.size} remembered` : "absent: no corrections were supplied", title: `${Object.keys(titles).length} title words`, dictionary: dictionary ? `${Object.keys(names).length} given-name words` : "absent: name-gender/dictionary-en.json has not been built", snapshot: snapshot ? "loaded" : "absent: identity/givers/wikidata-given-names-en.json not loaded" };
  return { explain, genderOf: (words) => explain(words).gender, classOf: (words) => explain(words).class, isGivenName, layers, missing };
}

/**
 * pronounsFor(gender, { language }) — THE WORDS THE SYSTEM ITSELF USES FOR A PERSON, "they" when it is not sure (the owner, 2026-11-23: default to "they" when you're not sure).
 * "Sure" is not a threshold set here: a gender is decided or it is not. `m` and `f` (a title, a name, the text's own recurring pronouns, or what the user said) get he / she; anything else (null: the
 * words disagree, say nothing, or the referent is contested) gets singular "they", which takes the plural verb ("they are", "they were"). This is the English register only; another language is a typed
 * gap (null: the caller keeps the person's name), never English by default. The forms are received, not derived: the same set the cast's pronoun register already classes m / f / x.
 *   -> { cls: "m" | "f" | "x", nom, acc, poss, refl, is, was, decided: boolean } | null
 */
const EN_PRONOUNS = {
  m: { nom: "he", acc: "him", poss: "his", refl: "himself", is: "is", was: "was" },
  f: { nom: "she", acc: "her", poss: "her", refl: "herself", is: "is", was: "was" },
  x: { nom: "they", acc: "them", poss: "their", refl: "themself", is: "are", was: "were" },
};
export function pronounsFor(gender, { language = "en", decided = null } = {}) {
  if (String(language).toLowerCase() !== "en") return null;
  const cls = gender === "m" || gender === "f" ? gender : "x";
  return { cls, ...EN_PRONOUNS[cls], decided: decided ?? cls !== "x" };   // decided: true for a person who told us they go by "they"
}


/**
 * genderPriorFromWords({ text, cast, prior, sources }) -> Map ref -> "m" | "f" | "x": the SAME SHAPE as the canonical chain's other sources (gender-chain.js: name table, Wikidata giver, corpus), so the
 * prior can be a layer of genderPriorChainFor. For each being of the cast, each distinct surface of its own mentions (`mentionSpans` into the text) is asked of the prior; the being's class is the one
 * the STRONGEST source gives (told, then title, then the name's dictionary sense, then the Wikidata snapshot), and where that source's surfaces disagree (the same being as "Mrs Bennet" and as a
 * different word) it says nothing. `sources` limits the layer: the chain asks for ["title", "name", "snapshot"] BELOW the corpus and ["told"] ABOVE it ("the text's own recurring evidence overrides a prior").
 */
export function genderPriorFromWords({ text, cast, prior, sources = ["told", "title", "name", "snapshot"] }) {
  const out = new Map(); if (!prior || prior.missing && !sources.includes("told")) return out; const T = String(text ?? ""), ORDER = ["told", "title", "name", "snapshot"].filter((x) => sources.includes(x));
  for (const b of cast ?? []) {
    const surfaces = [...new Set((b.mentionSpans ?? []).map(([s, e]) => T.slice(s, e).trim()).filter(Boolean))], found = {};
    for (const surf of surfaces) { const words = surf.split(/\s+/).filter(Boolean), r = prior.explain(words); if (r.source && ORDER.includes(r.source) && r.class) (found[r.source] ??= new Set()).add(r.class); }   // regex-ok: whitespace between the words of a name
    const best = ORDER.find((x) => found[x]); if (best && found[best].size === 1) out.set(b.ref, [...found[best]][0]);
  }
  return out;
}

/** the prior as the chat uses it: the dictionary table (title, then the name) and the Wikidata given-name snapshot as the third layer. A missing table is `missing` (said, not skipped); a missing snapshot only loses the third layer. */
export function makeDefaultNameGenderPrior({ isPerson = null, corrections = null } = {}) {   // the prior the chat uses, and the layers of the canonical chain (gender-chain.js)
  const dictionary = loadNameGenderDictionary(); let snapshot = null; try { snapshot = snapshotGiverFrom(SNAPSHOT_FILE); } catch { snapshot = null; }
  return makeNameGenderPrior({ dictionary, snapshot, snapshotIds: snapshot ? { male: Q.male, female: Q.female, unisex: Q.unisex } : null, isPerson, corrections });
}
