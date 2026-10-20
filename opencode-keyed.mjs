// opencode-keyed.mjs — A CLAIM CHECKED BY IDENTITY: the sentence's relation is looked up as a KEY of the entity's own kind, and the typed value the
// entity carries is compared with the sentence's filler. No prose is parsed to decide it.
//
// The standalone app measured why (the-fold/eval/void/RESULTS.md): clause binding in prose earned nothing (L2 to L4 never beat L1.2), because the right
// value is on the page but cannot be told from the other values near it; ANSWERING BY IDENTITY more than doubled RIGHT (L5-keyed: dev 7 -> 18, held
// 5 -> 15; 38/54 over nine languages). That door is `keyedFill` (vendored, pinned): anchor title -> the encyclopedia's own item (QID) -> the kind's keys
// (P31 -> class -> P1963) -> a relation word equals a key's label or alias, or shares a lemma with a token of it -> the property's own datatype is the
// admits kind -> hl.js verdict. A verb with no noun label is a TYPED REFUSAL, never a guess. This file turns that door around: the sentence has already
// said a value, so the door's value is compared with it.
//
//   checkByIdentity({ claim, anchorNames, entity, getJson }) -> { standing, evidence, why, property, values } | { gap, detail }
//
// DECLARED, NOT MEASURED (eval/keyed/PREREG.md names each): a quantity matches at the sentence's own precision (8,849 against 8848.86); a year matches a
// time value at year grain or finer; a property Wikidata marks single-valued that returns one value which differs from the sentence CONTRADICTS it; a
// property that is not single-valued and does not list the filler leaves the sentence UNSUPPORTED with the listed values shown, never contradicted.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { keyedFill } from "./vendor/the-fold/fold-chat-void-keyed.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(here, "native");

// The received organs, loaded once: the UD English-EWT parser prior (the dominant class and lemma of a word) and the morphology prior (sameAct).
let organs = null;
async function organsOnce() {
  if (organs) return organs;
  const { loadModel, analyseAttested } = await import(path.join(NATIVE, "adapters/text/english-parser.js"));
  const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/parser-eng-ewt.json"), "utf8")));
  const { morphologyFromPrior, createLemmatizer } = await import(path.join(NATIVE, "adapters/text/morphology.js"));
  let lemmatizer = null;
  try {
    const p = morphologyFromPrior(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors/morphology-eng.json"), "utf8")));
    lemmatizer = createLemmatizer(p.forms, { language: p.language });
  } catch { /* no morphology prior: sameAct falls to the dominant lemma */ }
  const cache = new Map();
  const dominantOf = (w) => {
    const k = String(w).toLowerCase();
    if (!cache.has(k)) { const r = analyseAttested(model, [k], { scope: "all" })[0]; cache.set(k, r ? { upos: r.upos, lemma: String(r.lemma ?? k).toLowerCase() } : null); }
    return cache.get(k);
  };
  organs = { dominantOf, sameAct: lemmatizer ? (a, b) => lemmatizer.sameAct(a, b) : null };
  return organs;
}

const fold = (s) => String(s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const words = (s) => String(s ?? "").match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) ?? [];

/** What the sentence says as a VALUE: years, numbers, and the proper names that are not the anchor. */
export function fillerOf(text, anchorNames = []) {
  const own = new Set(anchorNames.flatMap((n) => words(n)).map(fold));
  const years = [...new Set((String(text).match(/\b(?:1\d{3}|20\d{2})\b/g) ?? []).map(Number))];
  const unit = /\b(?:metres?|meters?|m|km|kilomet(?:re|er)s?|miles?|feet|ft|kg|tonnes?|tons?|pounds?|degrees?|percent|%|years?|people|inhabitants)\b/i.test(text);
  const numbers = [...String(text).matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)]
    .map((m) => ({ raw: m[0], n: Number(m[0].replace(/,/g, "")), dec: (m[0].split(".")[1] ?? "").length }))
    .filter((x) => Number.isFinite(x.n) && !(years.includes(x.n) && !unit && !/,/.test(x.raw)));
  // proper names are read from the sentence with the ANCHOR's own words taken out (a run never swallows the anchor), and a name keeps its
  // qualifier: "Nobel Prize in Literature", "University of Ulm" are one name; "Ulm in 1879" is not (a digit does not continue a name)
  let rest = String(text);
  for (const n of [...anchorNames].sort((a, b) => b.length - a.length)) if (n) rest = rest.split(n).join(" § ");
  const runs = [];
  for (const m of rest.matchAll(/(?<![\p{L}])\p{Lu}[\p{L}'’.-]*(?:\s+(?:(?:of|in|for|de|da|von|van|the|and)\s+)*\p{Lu}[\p{L}'’.-]*)*/gu)) {
    const run = m[0].trim().replace(/^(?:The|A|An)\s+/, "");
    if (!run || /^(?:The|A|An|It|He|She|They|This|That|Her|His|Its)$/.test(run)) continue;
    if (words(run).every((w) => own.has(fold(w)))) continue;
    runs.push(run);
  }
  const names = [...new Set(runs)];
  const admits = years.length && !unit ? "date" : numbers.length ? "count" : names.length ? "item" : null;
  return { years, numbers, names, admits };
}

/** The relation words: the sentence's open-class words once the anchor's words, the filler's words, years and numbers are taken out. */
export async function relationWordsOf(text, anchorNames = [], filler = fillerOf(text, anchorNames)) {
  const { dominantOf } = await organsOnce();
  const skip = new Set([...anchorNames, ...filler.names].flatMap((n) => words(n)).map(fold));
  const out = [];
  for (const w of words(text)) {
    const f = fold(w).replace(/['’]s$/, "");
    if (!f || skip.has(f) || /^\d/.test(f)) continue;
    const d = dominantOf(f);
    if (d && !["NOUN", "VERB", "ADJ", "ADV", "PROPN"].includes(d.upos)) continue;
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

const yearOf = (v) => { const m = /^([+-]?\d{1,})-/.exec(String(v?.time ?? "")); return m ? Number(m[1]) : null; };
const closeAt = (value, n, dec) => { const f = 10 ** dec; return Math.round(value * f) / f === n || Math.abs(value - n) <= Math.abs(n) * 1e-9; };

/** Does any of the property's values say what the sentence says? */
function matches(values, filler, wantType) {
  if (wantType === "time") return values.some((v) => v.kind === "time" && (v.precision ?? 11) >= 9 && filler.years.includes(yearOf(v)));
  if (wantType === "quantity") return values.some((v) => v.kind === "quantity" && filler.numbers.some((x) => closeAt(Number(v.amount), x.n, x.dec)));
  const want = filler.names.map(fold);
  // a value's WHOLE label equals the sentence's name or sits inside it ("Ulm, Germany" says "Ulm"); the sentence's shorter name inside a longer
  // label ("Nobel Prize" in "Nobel Prize in Physics") is not a match: that is how "...Prize in Literature" was once supported
  return values.some((v) => (v.kind === "item" || v.kind === "string") && want.some((w) => { const t = fold(v.text ?? v.id); return t.length >= 2 && (t === w || w.includes(t)); }));
}

const JULIAN = "http://www.wikidata.org/entity/Q1985786";
async function hasJulian(getJson, qid, pid) {
  try {
    const j = await getJson(`https://www.wikidata.org/w/api.php?${new URLSearchParams({ format: "json", origin: "*", action: "wbgetentities", ids: qid, props: "claims", languages: "en" })}`);
    return (j?.entities?.[qid]?.claims?.[pid] ?? []).some((c) => c.rank !== "deprecated" && c.mainsnak?.datavalue?.value?.calendarmodel === JULIAN);
  } catch { return true; }   // cannot tell the calendar: do not contradict
}

export async function checkByIdentity({ claim, anchorNames = [], entity, getJson, lang = "en" }) {
  if (!entity?.enwiki && !entity?.label) return { gap: "no_anchor", detail: "the identity step bound no encyclopedia page" };
  const filler = fillerOf(claim, anchorNames);
  if (!filler.admits) return { gap: "no_filler", detail: "the sentence states no year, number or name to compare" };
  const { dominantOf, sameAct } = await organsOnce();
  const relationWords = await relationWordsOf(claim, anchorNames, filler);
  if (!relationWords.length) return { gap: "no_relation_word", detail: "no open-class word names a relation" };
  let r;
  try {
    r = await keyedFill({ fields: { slot: null, admits: filler.admits }, anchor: { title: entity.enwiki ?? entity.label, surface: entity.label }, relationWords, askWords: [], getJson, sameAct, dominantOf, keyed: true, lang, edition: lang, rankByCoverage: true });
  } catch (e) {
    return { gap: "unreachable", detail: String(e?.message ?? e).slice(0, 120) };
  }
  if (r.verdict === "unbound") return { gap: r.refused ?? "unbound", detail: r.refused === "no_matching_key" ? `no key of ${entity.label}'s kind is named by: ${relationWords.join(", ")}${r.openVoid?.length ? ` (its open keys: ${r.openVoid.slice(0, 6).join(", ")})` : ""}` : (r.refused ?? "unbound"), qid: r.qid };
  const typed = r.claim?.values ?? [];
  const wantType = r.property?.datatype;
  const shown = r.values.join("; ");
  const evidence = { source: `wikidata: ${entity.label ?? r.qid} (${r.qid})`, ref: `${r.qid}#${r.property.id}`, url: `https://www.wikidata.org/wiki/${r.qid}#${r.property.id}`, text: `${r.property.label}: ${shown}` };
  const out = { property: r.property, values: r.values, qid: r.qid, evidence };
  const kind = wantType === "time" ? "time" : wantType === "quantity" ? "quantity" : "item";
  if (matches(typed, filler, kind)) return { ...out, standing: "supported" };
  const said = kind === "time" ? filler.years.join(", ") : kind === "quantity" ? filler.numbers.map((x) => x.raw).join(", ") : filler.names.join(", ");
  // AMENDMENT 1 (eval/keyed/PREREG.md): a date or item property that lists exactly ONE value and a sentence that differs is contradicted, as a single-valued one is
  let sole = process.env.FOLD_KEYED_SOLE !== "0" && kind !== "quantity";
  // AMENDMENT 2: a time value stored with the Julian calendar model is never contradicted by a year (the sentence may be Gregorian); the value is shown
  if (sole && kind === "time" && process.env.FOLD_KEYED_JULIAN_GUARD !== "0" && await hasJulian(getJson, r.qid, r.property.id)) sole = false;
  if ((r.property.single || sole) && r.verdict === "bound" && typed.length === 1) return { ...out, standing: "contradicted", why: `${r.property.label} is ${shown}, not ${said}` };
  return { ...out, standing: "unsupported", why: `${r.property.label} lists ${shown}; the sentence says ${said}` };
}
