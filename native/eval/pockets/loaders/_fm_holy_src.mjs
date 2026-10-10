// loaders/_fm_holy_src.mjs — parsers for 14-holy-texts (natural documents = string[][]: one array of unit strings per document).
import { ETHOS, read, lsSync, makeTokenizer, sentencesOf } from "./_fm_common.mjs";
const H = `${ETHOS}/14-holy-texts`;

// ---- tokenisers ----
// Hebrew/Aramaic: cantillation marks U+0591-U+05AF, meteg U+05BD, rafe U+05BF and extraordinary points U+05C4-05C5 removed (prosodic/editorial overlay); vowel points kept; maqaf and other punctuation separate words.
export const tokHeb = makeTokenizer({ strip: /[\u0591-\u05AF\u05BD\u05BF\u05C4\u05C5]/g });
// Quranic Arabic: Quranic annotation/recitation signs and tatweel removed; vowel diacritics (U+064B-0652, U+0670) kept; U+06E1 (Quranic sukun) mapped to U+0652.
export const tokArab = makeTokenizer({ pre: (t) => t.replace(/\u06E1/g, "\u0652"), strip: /[\u0610-\u061A\u0640\u06D6-\u06DC\u06DF\u06E0\u06E2-\u06E4\u06E7\u06E8\u06EA-\u06ED\u08D3-\u08FF]/g });
export const tokGreek = makeTokenizer();           // polytonic Greek kept as written; elision apostrophe at word end is dropped
export const tokLatin = makeTokenizer();           // IAST Pali/Sanskrit and English
export const tokSanskrit = makeTokenizer({ pre: (t) => t.replace(/^start .*$/gim, " ").replace(/\b[A-Za-z]+_\d[\d,.A-Za-z]*/g, " ").replace(/\b[a-z]{3,8} \d+,\d+\.\d+/g, " ").replace(/\[=[^\]]*\]/g, " ") }); // GRETIL reference ids (kau_6.9, chup_1,1.1, "start brhup 1,1.1", [=MBh_..]) removed

// ---- Hebrew Bible (WLC): lines "Gen.1.1 text"; document = chapter ----
export function wlcDocs(books) {
  const docs = [];
  for (const b of books) {
    let curKey = null, cur = null;
    for (const line of read(`${H}/wlc-tanakh/${b}.txt`).split("\n")) {
      const m = /^(\S+?)\.(\d+)\.(\d+)\s+(.+)$/.exec(line); if (!m) continue;
      const key = `${m[1]}.${m[2]}`; if (key !== curKey) { cur = []; docs.push(cur); curKey = key; }
      cur.push(m[4]);
    }
  }
  return docs;
}
// ---- SBLGNT (sblgnt-books): lines "01:1:1 text"; document = chapter ----
export function sblgntDocs(fileFilter) {
  const docs = [];
  for (const f of lsSync(`${H}/sblgnt-books`).filter((x) => /^\d\d-.*\.txt$/.test(x) && fileFilter(x))) {
    let curKey = null, cur = null;
    for (const line of read(`${H}/sblgnt-books/${f}`).split("\n")) {
      const m = /^(\d\d):(\d+):(\d+) (.*)$/.exec(line); if (!m) continue;
      const key = `${m[1]}:${m[2]}`; if (key !== curKey) { cur = []; docs.push(cur); curKey = key; }
      cur.push(m[4]);
    }
  }
  return docs;
}
// ---- Nestle 1904 (OSIS xml): <chapter osisId>, <milestone unit="verse"/>, <w>word</w>; unit = verse, document = chapter ----
export function nestleDocs() {
  const docs = [];
  for (const f of lsSync(`${H}/nestle1904`).filter((x) => /^\d\d-.*\.xml$/.test(x))) {
    const xml = read(`${H}/nestle1904/${f}`);
    for (const cm of xml.matchAll(/<chapter osisId="[^"]+">([\s\S]*?)<\/chapter>/g)) {
      const cur = [];
      for (const vs of cm[1].split(/<milestone unit="verse"[^>]*\/>/)) {
        const ws = [...vs.matchAll(/<w\b[^>]*>([^<]*)<\/w>/g)].map((m) => m[1]);
        if (ws.length) cur.push(ws.join(" "));
      }
      if (cur.length) docs.push(cur);
    }
  }
  return docs;
}
// ---- Qur'an (quran-suras): "[2:1] arabic" then two indented lines (transliteration, English); document = sura ----
export function suraDocs(which /* "ar" | "en" */) {
  const docs = [];
  for (const f of lsSync(`${H}/quran-suras`).filter((x) => /^sura-\d+-.*\.txt$/.test(x))) {
    const lines = read(`${H}/quran-suras/${f}`).split("\n"), cur = [];
    for (let i = 0; i < lines.length; i++) {
      const m = /^\[(\d+):(\d+)\]\s*(.*)$/.exec(lines[i]); if (!m) continue;
      if (which === "ar") cur.push(m[3]); else { let k = i + 1, ind = []; while (k < lines.length && /^\s+\S/.test(lines[k]) && ind.length < 2) ind.push(lines[k++].trim()); if (ind[1]) cur.push(ind[1]); }
    }
    if (cur.length) docs.push(cur);
  }
  return docs;
}
// ---- Tanzil English (one line per surah "=== Surah N: ... ==="): sentences split on . ! ? ; document = surah ----
export function tanzilEnDocs(file) {
  const docs = []; let cur = null;
  for (const line of read(`${H}/tanzil-quran/${file}`).split("\n")) {
    if (/^=== Surah \d+:/.test(line)) { cur = []; docs.push(cur); continue; }
    if (cur && line.trim()) for (const s of sentencesOf(line)) cur.push(s);
  }
  return docs;
}
// ---- Pali suttas: header up to the first blank line, 4 title lines dropped, then alternating unindented Pali / 4-space-indented English; document = sutta ----
export function paliDocs(which /* "pi" | "en" */, prefix /* "dn" | "mn" */) {
  const docs = [];
  const files = lsSync(`${H}/pali-suttas`).filter((x) => new RegExp(`^${prefix}\\d+\\.txt$`).test(x)).sort((a, b) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")));
  for (const f of files) {
    const lines = read(`${H}/pali-suttas/${f}`).split("\n"), cur = []; let body = false, seen = 0;
    for (const line of lines) {
      if (!body) { if (!line.trim()) body = true; continue; }
      if (!line.trim()) continue;
      if (seen++ < 4) continue; // first 4 body lines = collection label + sutta title (Pali/English pairs), identical formatting in every sutta
      const indented = /^\s/.test(line);
      if ((which === "en") === indented) cur.push(line.trim());
    }
    if (cur.length) docs.push(cur);
  }
  return docs;
}

// ---- Sanskrit (GRETIL IAST): Bhagavadgita half-verse lines, document = adhyaya; Upanishads (bare / with commentary), clauses split at danda-like marks "/" "//" "|" "||", document = file ----
export function gitaDocs() {
  const docs = new Map();
  for (const line of read(`${H}/bhagavad-gita/bhagavad-gita.txt`).split("\n")) {
    const m = /^(.*?)\s+Bhg_(\d+)\.\d+[a-z]?\s/.exec(line); if (!m || !m[1].trim()) continue;
    if (!docs.has(m[2])) docs.set(m[2], []); docs.get(m[2]).push(m[1].trim());
  }
  return [...docs.keys()].sort().map((k) => docs.get(k));
}
export const SA_SPLIT = /\s*(?:\/\/?|\|\|?|।|॥)\s*|\n+/u;
export function upanishadDocs() {
  const docs = [];
  for (const f of lsSync(`${H}/upanishads`).filter((x) => /^[a-z-]+\.txt$/.test(x))) {
    const body = read(`${H}/upanishads/${f}`).replace(/^---\n[\s\S]*?\n---\n?/, "");
    const cur = body.split(SA_SPLIT).map((s) => s.trim()).filter(Boolean);
    if (cur.length) docs.push(cur);
  }
  return docs;
}
// ---- Talmud Bavli (Sefaria Vilna, vocalised): "### daf 2a — Berakhot 2a" then one long paragraph; unit = sentence (split at . ! ? : ׃ and newline); document = daf (page side) ----
export const SEDER = {
  moed: ["berakhot", "shabbat", "eruvin", "pesachim", "yoma", "sukkah", "beitzah", "rosh-hashanah", "taanit", "megillah", "moed-katan", "chagigah"],
  nashim: ["yevamot", "ketubot", "nedarim", "nazir", "sotah", "gittin", "kiddushin", "niddah"],
  nezikin: ["bava-kamma", "bava-metzia", "bava-batra", "sanhedrin", "makkot", "shevuot", "avodah-zarah", "horayot"],
  kodashim: ["zevachim", "menachot", "chullin", "bekhorot", "arakhin", "temurah", "keritot", "meilah", "tamid"],
};
export function talmudDocs(tractates) {
  const docs = [];
  for (const t of tractates) {
    const txt = read(`${H}/talmud-bavli/${t}.txt`).replace(/^---\n[\s\S]*?\n---\n?/, "");
    const sides = txt.split(/^### .*$/m).slice(1).map((blk) => sentencesOf(blk.replace(/:/g, ":\n"))).filter((c) => c.length);
    for (let i = 0; i < sides.length; i += 4) { const g = sides.slice(i, i + 4).flat(); if (g.length) docs.push(g); } // document = 4 consecutive daf sides (2 dapim, ~1300 tokens)
  }
  return docs;
}
// ---- Sefaria midrash (Hebrew/Aramaic, vocalised, one segment per line): Eichah Rabbah + Ruth Rabbah; document = consecutive blocks (cut by finalize) ----
export function midrashDocs() {
  return ["Eichah_Rabbah_he", "Ruth_Rabbah_he"].map((f) => read(`${H}/sefaria/${f}.txt`).replace(/<small>[\s\S]*?<\/small>/g, " ").replace(/<[^>]+>/g, " ").split("\n").flatMap((l) => sentencesOf(l)));
}
