// loaders/_fm_legal_src.mjs — parsers for 06-government-legal (natural documents = string[][]).
import { ETHOS, read, lsSync, stripFrontmatter, cleanMarkdown, sentencesOf, makeTokenizer } from "./_fm_common.mjs";
const L = `${ETHOS}/06-government-legal`;

// jurisdiction directory -> [language, short name]. Languages are the publishing state's official legal language; frontmatter has a language field only for be (fr) and uk (en).
export const JURIS = {
  ad: ["ca", "Andorra"], ar: ["es", "Argentina"], at: ["de", "Austria"], be: ["fr", "Belgium (+ Luxembourg)"], ch: ["de", "Switzerland"], cl: ["es", "Chile"], co: ["es", "Colombia"],
  cz: ["cs", "Czechia"], de: ["de", "Germany"], es: ["es", "Spain"], eu: ["en", "European Union"], fi: ["fi", "Finland"], fr: ["fr", "France"], gr: ["el", "Greece"], it: ["it", "Italy"],
  li: ["de", "Liechtenstein"], lv: ["lv", "Latvia"], nl: ["nl", "Netherlands"], no: ["no", "Norway (Bokmal and Nynorsk)"], pl: ["pl", "Poland"], pt: ["pt", "Portugal"], ro: ["ro", "Romania"],
  se: ["sv", "Sweden"], sk: ["sk", "Slovakia"], uk: ["en", "United Kingdom"], us: ["en", "United States"], uy: ["es", "Uruguay"],
};
export const SCRIPT_OF = { el: "grek" }; // every other jurisdiction language is written in Latin script

/** each law file = one natural document: frontmatter removed, markdown heading lines (article numbers, part titles) removed, markdown/HTML residue and urls removed, newline and . ! ? ; : sentence punctuation end units */
export function lawDocs(dirs) {
  const docs = [];
  for (const d of dirs) for (const f of lsSync(`${L}/world-legislation/${d}`).filter((x) => x.endsWith(".md"))) {
    const t = cleanMarkdown(stripFrontmatter(read(`${L}/world-legislation/${d}/${f}`)), { dropHeadings: true });
    const u = sentencesOf(t); if (u.length) docs.push(u);
  }
  return docs;
}

// ---- UDHR (516 translations; header 4 lines "title / Language: name (code) / Adopted / Publisher") ----
const SC = [["cyrl", /\p{Script=Cyrillic}/u], ["latn", /\p{Script=Latin}/u], ["arab", /\p{Script=Arabic}/u], ["hani", /\p{Script=Han}/u], ["kana", /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ["thai", /\p{Script=Thai}/u], ["laoo", /\p{Script=Lao}/u], ["khmr", /\p{Script=Khmer}/u], ["mymr", /\p{Script=Myanmar}/u]];
const NOSPACE_SCRIPTS = new Set(["hani", "kana", "thai", "laoo", "khmr", "mymr"]);
/** dominant script bucket of a text (majority of its first 600 letters among the buckets above; anything else = "other") */
export function scriptBucket(body) {
  const cnt = {}; let tot = 0;
  for (const ch of body) { if (!/\p{L}/u.test(ch)) continue; if (++tot > 600) break; /* first 600 letters decide */ let hit = "other"; for (const [k, re] of SC) if (re.test(ch)) { hit = k; break; } cnt[hit] = (cnt[hit] || 0) + 1; }
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : "other";
}
export const udhrFiles = () => lsSync(`${L}/un-udhr`).filter((f) => /^udhr-.*\.txt$/.test(f) && !f.endsWith(".json"));
/** class = "latn" | "cyrl" | "bigram" (hani, kana, thai, lao, khmer, myanmar: no word spaces) | "other" (every remaining space-delimited script: arab, deva, greek, hebrew, ...) */
export function udhrDocs(cls) {
  const docs = [], labels = [];
  for (const f of udhrFiles()) {
    const t = read(`${L}/un-udhr/${f}`), lines = t.split("\n"), lang = (/^Language: (.*)$/m.exec(t) || [])[1] ?? f;
    const body = lines.slice(4).join("\n"), b = scriptBucket(body);
    const c = b === "latn" ? "latn" : b === "cyrl" ? "cyrl" : NOSPACE_SCRIPTS.has(b) ? "bigram" : "other";
    if (c !== cls) continue;
    const u = sentencesOf(body); if (u.length) { docs.push(u); labels.push(`${f.replace(/^udhr-|\.txt$/g, "")}:${lang}`); }
  }
  docs.labels = labels;
  return docs;
}
export const tokBigram = makeTokenizer({ bigram: true });

// ---- CIA World Factbook: one file per country/entity, markdown + html residue (templated field labels kept as text) ----
export function factbookDocs() {
  const docs = [];
  for (const f of lsSync(`${L}/world-factbook`).filter((x) => x.endsWith(".txt") && !x.endsWith(".json"))) {
    const t = cleanMarkdown(read(`${L}/world-factbook/${f}`).replace(/<br\s*\/?>/gi, "\n"));
    const u = sentencesOf(t); if (u.length) docs.push(u);
  }
  return docs;
}
