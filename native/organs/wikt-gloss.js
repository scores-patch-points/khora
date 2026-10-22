import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
// wikt-gloss.js — a word of any language → its NEUTRAL KEY, from English Wiktionary's gloss of it: "descubrir" (Spanish verb) → "to discover"
// → discover; "proceso" → "process"; "grande" → "big". The keys the meaning check compares (eot-claim-match.js) are these glosses, so one
// relation said in two languages is one key. The gloss of a word is its entry's first sense for the part of speech the parse gave it; a
// sense that only names another form ("plural of grande", "first-person singular of pesar") is followed once to that form's entry. A word
// with no entry keeps its own lemma (the caller's fallback): nothing is guessed.
//   makeGlossary(lookup) → gloss(lang, lemma, upos) → key | null; lookup(lang, word) → wiktextract entries [{ pos, senses: [{ glosses, form_of }] }]
const POS = { VERB: ["verb"], AUX: ["verb"], NOUN: ["noun"], ADJ: ["adj", "verb"], ADV: ["adv"], NUM: ["num"] };
const ARTICLE = /^(a|an|the|to be|to)\s+/;

/** the head word of an English gloss for that part of speech: "to carry out" → carry; "the process of making" → process; "big, large" → big */
export function headOfGloss(gloss, pos) {
  // "synonym of クロロフィル (kurorofiru, “chlorophyll”)": the gloss is the quoted English, not the word "synonym"
  const q = /^(synonym|alternative form|alternative spelling|abbreviation|short form|clipping) of\b.*?“([^”]+)”/i.exec(String(gloss ?? ""));
  if (q) return headOfGloss(q[2], pos);
  let t = String(gloss ?? "").replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").toLowerCase().split(/[;,:]/)[0].replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (pos === "verb") { t = t.replace(/^to\s+/, "").replace(/^be\s+/, ""); return t.split(" ")[0] || null; }
  t = t.replace(ARTICLE, "").replace(ARTICLE, "");
  if (pos === "noun") { t = t.split(/\s+(of|that|which|who|in|for|from|with|used)\s+/)[0]; return t.split(" ").at(-1) || null; }
  return t.split(" ")[0] || null;
}

// a gloss of a word in ANOTHER language is a translation ("neck part of body connecting the head …", "to connect, link, join, relate to"):
// each comma-separated item's first word (after "to", "a", "the") is an English key for the word, the first one its key
export function translationsOfGloss(gloss, pos) {
  const t = String(gloss ?? "").replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").toLowerCase().split(/[;:]/)[0];
  // "for a river, airstream, etc. to flow into a larger body": a frame around the verb, read whole before the commas
  if (pos === "verb" && /^for\b/.test(t.trim())) { const m = /\bto\s+([a-z][a-z'-]*)/.exec(t); if (m) return [m[1]]; }
  const items = t.split(/,|\s+or\s+/).map((x) => x.trim()).filter(Boolean);
  const head = (x) => {
    let w = x.replace(/^(to be|to)\s+/, "").replace(ARTICLE, "").replace(ARTICLE, "").trim();
    if (pos === "verb") {
      // "for a river … to flow into a larger body" → flow; "to carefully select" → select
      const late = /\bto\s+([a-z][a-z'-]*)/.exec(w.split(/\s+/).slice(1).join(" ")); if (/^for\b/.test(w) && late) return late[1];
      return w.split(/\s+/).find((x) => !/ly$/.test(x) && !/^(be|to|a|an|the)$/.test(x)) ?? null;
    }
    // a short item is a noun phrase, its head last ("careful selection"); a long one is a translation with its description run on, the
    // translation first ("neck part of body connecting the head …")
    if (pos === "noun") { const ws = w.split(/\s+/); if (ws.length > 3) return ws[0]; w = w.split(/\s+(of|that|which|who|in|for|from|with|used|measured)\s+/)[0]; return w.split(/\s+/).at(-1) ?? null; }
    return w.split(/\s+/)[0] ?? null;
  };
  return [...new Set(items.map(head).filter((x) => /^\p{L}[\p{L}'-]*$/u.test(x ?? "") && !/^(or|and|etc)$/.test(x)))];
}

// translations(lang, word) → [[english, pos], …]: the English entries whose translation tables list the word (cli/wikt-translations.mjs).
// A second source of keys, after the word's own gloss: "topónimo" has the gloss "placename", and English "toponym" lists it as a translation.
export function loadTranslations(dir) {
  const cache = new Map();
  return (lang, word) => {
    if (!cache.has(lang)) { const f = `${dir}/translations-${lang}.json.gz`; let m = null; try { m = JSON.parse(gunzipSync(readFileSync(f)).toString("utf8")).words; } catch { m = null; } cache.set(lang, m); }
    const m = cache.get(lang); return m ? m[word] ?? m[String(word).toLowerCase()] ?? null : null;
  };
}

export function makeGlossary(lookup, { translations = null } = {}) {
  const memo = new Map();
  // ctx.reflexive: the verb has its reflexive pronoun ("se llama", "sich verlaufen"); a sense Wiktionary tags reflexive holds only then
  const first = (lang, word, pos, depth, ctx) => {
    // a language that capitalizes its nouns (German) files them under the capital: "vorgang" is Vorgang, and "pflanze" (a verb form) is
    // also Pflanze — the capital is read whenever no entry has the part of speech the parse gave
    let es = []; try { es = lookup(lang, word) ?? []; if (!es.some((e) => pos.includes(e.pos)) && /^\p{Ll}/u.test(word)) es = [...es, ...(lookup(lang, word[0].toUpperCase() + word.slice(1)) ?? [])]; } catch { es = []; }
    for (const p of pos) for (const e of es ?? []) {
      if (e.pos !== p) continue;
      const senses = e.senses ?? [], refl = (s) => (s.tags ?? []).some((t) => /reflexive|pronominal/i.test(t));
      const order = ctx.reflexive ? [...senses.filter(refl), ...senses.filter((s) => !refl(s))] : senses.filter((s) => !refl(s));
      for (const s of order) {
        const of = s.form_of?.[0]?.word ?? s.alt_of?.[0]?.word;
        if (of && depth < 1 && of !== word) { const g = first(lang, of, pos, depth + 1, ctx); if (g) return g; continue; }
        if (of) continue;
        const g = (s.glosses ?? []).at(-1); if (!g) continue;
        const q = /^(synonym|alternative form|alternative spelling|abbreviation|short form|clipping) of\b.*?“([^”]+)”/i.exec(g);
        const keys = lang === "en" ? [headOfGloss(g, p === "adj" ? "adj" : p)].filter(Boolean) : translationsOfGloss(q ? q[2] : g, p);
        if (keys.length) return keys;
      }
    }
    return null;
  };
  const all = (lang, lemma, upos, ctx = {}) => {
    const k = `${lang}\t${lemma}\t${upos}\t${ctx.reflexive ? 1 : 0}`;
    if (!memo.has(k)) {
      let keys = POS[upos] ? first(lang, lemma, POS[upos], 0, ctx) : null;
      // the English entries that translate to the word add their own headwords (single words of the same part of speech), after its gloss
      if (translations && lang !== "en" && POS[upos]) {
        const tr = (translations(lang, lemma) ?? []).filter(([w, p]) => POS[upos].includes(p) && /^\p{L}[\p{L}'-]*$/u.test(w)).map(([w]) => w.toLowerCase());
        if (tr.length) keys = [...new Set([...(keys ?? []), ...tr])];
      }
      memo.set(k, keys?.length ? keys : null);
    }
    return memo.get(k);
  };
  /** gloss(lang, lemma, upos, ctx) → the word's key; gloss.all(…) → every English key its gloss gives (synonyms), the key first */
  const gloss = (lang, lemma, upos, ctx) => all(lang, lemma, upos, ctx)?.[0] ?? null;
  gloss.all = all;
  return gloss;
}

/** makeSynonymy({ lookup, translations, pivots }) → same(lang, a, b, upos) → { same, why, weight }: two words of one language mean the same when
 *  their keys meet. For a word of another language, its keys are its gloss and the English entries translating to it. For English words, two
 *  are synonyms when they share translations in several pivot languages (pivoting): a word and its antonym almost never translate alike. */
export function makeSynonymy({ lookup, translations = null, pivots = ["es", "fr", "de", "it", "pt", "ru", "nl", "sv", "pl", "ja"], minLanguages = 2 } = {}) {
  const G = makeGlossary(lookup, { translations });
  const trOf = new Map();
  const transOfEn = (w, upos) => {
    const k = `${w}\t${upos}`; if (trOf.has(k)) return trOf.get(k);
    const want = POS[upos] ?? ["noun", "verb", "adj"], out = new Map();
    for (const e of lookup("en", w) ?? []) if (want.includes(e.pos)) for (const t of e.translations ?? []) if (pivots.includes(t.code)) { const set = out.get(t.code) ?? new Set(); set.add(String(t.word).toLowerCase()); out.set(t.code, set); }
    trOf.set(k, out); return out;
  };
  // the dictionary's own lists come first: a word in the other's synonym list means the same; one in its antonym list never does
  const listed = (lang, w, upos, kind) => {
    const want = POS[upos] ?? ["noun", "verb", "adj", "adv"], out = new Set();
    for (const e of lookup(lang, w) ?? []) if (want.includes(e.pos)) { for (const s of e.senses ?? []) for (const x of s[kind] ?? []) out.add(String(x.word).toLowerCase()); for (const x of e.rel?.[kind] ?? []) out.add(String(x.word).toLowerCase()); }
    return out;
  };
  const judge = (lang, a, b, upos) => {
    if (a === b) return { same: true, why: "same word", weight: 1 };
    const A = String(a).toLowerCase(), B = String(b).toLowerCase();
    if (listed(lang, a, upos, "ant").has(B) || listed(lang, b, upos, "ant").has(A)) return { same: false, why: "listed antonyms", weight: 0 };
    if (listed(lang, a, upos, "syn").has(B) || listed(lang, b, upos, "syn").has(A)) return { same: true, why: "listed synonyms", weight: 0.95 };
    if (lang !== "en") {
      // a Japanese する verb is its noun's meaning done (位置する: 位置 "position, location"); the dictionary files the noun
      const keysOf = (w) => G.all(lang, w, upos) ?? (lang === "ja" && /(する|させる|される)$/.test(w) ? G.all(lang, w.replace(/(する|させる|される)$/, ""), "NOUN") : null) ?? [];
      const ka = keysOf(a), kb = keysOf(b);
      // a noun key and a verb key of one derivation meet ("selection" / "select", "recognition" / "recognize")
      const stem = (x) => x.replace(/(ation|ition|ion|ment|ance|ence|ing|ize|ise|ate|al|e|s)$/, "");
      const derive = (x, y) => x !== y && x.length >= 5 && y.length >= 5 && stem(x).length >= 5 && stem(x) === stem(y);
      // a key meets only through the first key of one of the two words: a later sense shared ("étang": pond, lake) is not the same meaning
      const meets = (x, y) => x === y || derive(x, y);
      const shared = [...new Set([...ka.slice(0, 1).filter((x) => kb.some((y) => meets(x, y))), ...kb.slice(0, 1).filter((y) => ka.some((x) => meets(x, y)))])];
      if (shared.length) return { same: true, why: `shared keys: ${shared.slice(0, 3).join(", ")}`, weight: shared.includes(ka[0]) && shared.includes(kb[0]) ? 0.9 : 0.75 };
      // no shared key: two keys that are English synonyms (listed, or translated alike) — one step further, so weighed lower
      for (const x of ka.slice(0, 3)) for (const y of kb.slice(0, 3)) { const r = sameEn(x, y, upos); if (r.same && (r.why === "listed synonyms" || r.weight >= 0.5)) return { same: true, why: `keys ${x} ~ ${y}: ${r.why}`, weight: 0.65 * (r.weight || 0.5) }; }
      return { same: false, why: "no shared key", weight: 0 };
    }
    const ta = transOfEn(a, upos), tb = transOfEn(b, upos);
    const langs = [...ta.keys()].filter((l) => tb.has(l) && [...ta.get(l)].some((x) => tb.get(l).has(x)));
    const covered = [...ta.keys()].filter((l) => tb.has(l)).length;
    return langs.length >= minLanguages ? { same: true, why: `shared translations in ${langs.length} of ${covered} languages (${langs.slice(0, 4).join(", ")})`, weight: covered ? langs.length / covered : 0 }
      : { same: false, why: `shared translations in ${langs.length} of ${covered} languages`, weight: covered ? langs.length / covered : 0 };
  };
  const sameEn = (x, y, upos) => judge("en", x, y, upos);
  return judge;
}
