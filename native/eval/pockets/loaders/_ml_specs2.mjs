// eval/pockets/loaders/_ml_specs2.mjs — more plain-text pocket specs of group "ml": Japanese, Persian, Old Norse, French, German, Italian, English translations,
// parallel classics, War and Peace, Wikipedia. (Same conventions as _ml_specs.mjs.)
import fs from "node:fs";
import { ML_ROOT } from "./_ml_text.mjs";
import { T } from "./_ml_specs.mjs";

const F = (dir, names) => names.map((n) => `${ML_ROOT}/${dir}/${n}.txt`);
const DECL = "title declared in the file front matter, not independently verified";
const JA = { language: "jpn-cls", ends: "cjk", wrap: "line", kind: "sent", tok: "char", clean: ["br1", "html"] };

export const JAPANESE = [
  T("ml-jpn-genji", { ...JA, register: "book", files: F("japanese-originals", ["murasaki-tale-of-genji"]), notes: "classical Japanese narrative; character chunks (no word segmentation exists)" }),
  T("ml-jpn-zuihitsu", { ...JA, register: "book", files: F("japanese-originals", ["kenko-tsurezuregusa", "kamono-chomei-hojoki", "seishonagon-pillow-book", "basho-oku-no-hosomichi"]), notes: "classical essays and travel diary (Kenko, Chomei, Sei Shonagon, Basho); character chunks" }),
  T("ml-jpn-soseki", { language: "jpn", register: "book", ends: "cjk", wrap: "line", kind: "sent", tok: "char", clean: ["aozora"], files: [`${ML_ROOT}/gutenberg-non-en/ja/aozora789_Wagahaiwa_Nekodearu__Natsume_Soseki_.txt`], notes: "modern Japanese novel (Aozora Bunko), ruby and annotation markup removed; character chunks; sits in the gutenberg-non-en directory whose labels are unreliable, content verified Japanese" }),
];
export const OTHER_ORIGINALS = [
  T("ml-fas-masnavi", { language: "fas", script: "arab", register: "poetry", kind: "line", clean: ["hashhead", "br1"], files: Array.from({ length: 6 }, (_, i) => `${ML_ROOT}/persian-originals/masnavi-maanavi-daftar-${i + 1}.txt`), notes: "Rumi, Masnavi, six daftars, one couplet per unit (two hemistichs); Ganjoor" }),
  T("ml-non-edda-poetic", { language: "non", script: "latn", register: "poetry", kind: "line", clean: ["br1"], files: F("old-norse-originals", ["eddukvaedi"]), notes: "Poetic Edda in normalised Old Norse orthography; stanza numbers dropped as numbers, prose links kept" }),
  T("ml-non-edda-prose", { language: "non", script: "latn", register: "book", kind: "sent", ends: "latin", wrap: "line", clean: ["br1"], files: F("old-norse-originals", ["snorra-edda"]), notes: "Prose Edda in normalised Old Norse orthography (Icelandic Wikisource)" }),
  T("ml-fra-brillat", { language: "fra", script: "latn", register: "book", kind: "sent", ends: "latin", wrap: "line", clean: ["br1"], files: F("french-originals", ["brillat-savarin-physiologie-du-gout"]), notes: `19th-century essay on gastronomy; ${DECL}` }),
  T("ml-fra-pascal", { language: "fra", script: "latn", register: "treatise", kind: "sent", ends: "latin", wrap: "flow", clean: ["br1"], files: F("french-originals", ["pascal-pensees"]), notes: `17th-century fragments (Brunschvicg ed.); ${DECL}` }),
  T("ml-fra-hugo-miserables", { language: "fra", script: "latn", register: "book", kind: "sent", ends: "latin", wrap: "hard", clean: ["br1"], files: [`${ML_ROOT}/gutenberg-non-en/fr/pg17489_Madame_Bovary.txt`], notes: "content verified French: Hugo, Les Miserables Tome I (the file NAME says Madame Bovary: that directory's labels are unreliable, see ethos CORPUS-INTEGRITY-FINDING)" }),
  T("ml-deu-ranke", { language: "deu-1824", script: "latn", register: "history", kind: "sent", ends: "latin", wrap: "flow", clean: ["dehyph", "br1"], files: F("german-originals", ["ranke-geschichten-der-romanischen-und-germanischen-voelker-1824"]), notes: "1824 German history, Fraktur machine OCR: OCR noise, long s kept as a letter, double-hyphen line breaks rejoined, one flow (no usable paragraph marks)" }),
  T("ml-deu-nietzsche", { language: "deu", script: "latn", register: "treatise", kind: "sent", ends: "latin", wrap: "hard", clean: ["br1"], files: ["pg60360_Der-Wille-zur-Macht-Nietzsche", "pg7202_Ecce-Homo-Nietzsche", "pg7203_Gotzen-Dammerung-Nietzsche", "pg7204_Jenseits-von-Gut-und-Bose-Nietzsche", "pg7206_Die-Geburt-der-Tragodie-Nietzsche", "pg7207_Menschliches-Allzumenschliches-Nietzsche"].map((n) => `${ML_ROOT}/gutenberg-non-en/de/${n}.txt`), notes: "6 Nietzsche works, content verified German (file names in that directory are partly unreliable: pg2148/pg67098/pg42671 in the same directory are English)" }),
  T("ml-deu-frege", { language: "deu", script: "latn", register: "treatise", kind: "sent", ends: "latin", wrap: "line", clean: ["br1"], files: F("german-originals", ["frege-ueber-begriff-und-gegenstand"]), notes: "Frege 1892 essay (Wikisource); expected thin" }),
  T("ml-ita-dante", { language: "ita-med", script: "latn", register: "poetry", kind: "line", clean: ["br1"], files: F("italian-originals", ["pg1000_La-Divina-Commedia-di-Dante-Italian"]), notes: "Divina Commedia, tercet lines, Gutenberg text possibly with editorial front matter" }),
];
const TR = { language: "eng-tr", script: "latn", register: "translation", ends: "latin", wrap: "hard", clean: ["br1"] };
export const TRANSLATIONS = [
  T("ml-en-hippocrates", { ...TR, kind: "sent", files: F("translations-en", ["adams-1849-the-genuine-works-of-hippocrates-volume-2"]), notes: "1849 translation of Greek medical texts, machine OCR" }),
  T("ml-en-younger-edda", { ...TR, kind: "sent", files: F("translations-en", ["anderson-1880-the-younger-edda"]), notes: "1880 translation of the Prose Edda" }),
  T("ml-en-ranke", { ...TR, kind: "sent", files: F("translations-en", ["ashworth-1887-ranke-history-of-the-latin-and-teutonic-nations"]), notes: "1887 translation of German history, machine OCR" }),
  T("ml-en-poetic-edda", { ...TR, kind: "line", files: F("translations-en", ["bellows-1923-the-poetic-edda"]), notes: "1923 verse translation of the Poetic Edda with notes" }),
  T("ml-en-plato-sophist", { ...TR, kind: "sent", files: F("translations-en", ["jowett-plato-sophist"]), notes: "Jowett translation" }),
  T("ml-en-pindar", { ...TR, kind: "sent", files: F("translations-en", ["myers-1874-the-extant-odes-of-pindar"]), notes: "1874 prose translation of Pindar" }),
  T("ml-en-livy", { ...TR, kind: "sent", files: F("translations-en", ["spillan-livy-history-of-rome-books-1-8"]), notes: "Spillan translation of Livy 1-8" }),
  T("ml-en-nirvana", { ...TR, kind: "sent", files: F("translations-en", ["stcherbatsky-1927-the-conception-of-buddhist-nirvana"]), notes: "1927 scholarly translation/study of Buddhist philosophy, machine OCR" }),
  T("ml-en-plutarch", { ...TR, kind: "sent", files: F("translations-en", ["stewart-long-1880-plutarchs-lives-volume-1"]), notes: "1880 translation of Plutarch's Lives vol 1" }),
];
const PC = `${ML_ROOT}/parallel-classics`;
const DUPBOOK = { alice: "bk-alice", gulliver: "bk-gulliver", robinson: "bk-crusoe" };
const LANG = { en: "eng", de: "deu", fr: "fra", it: "ita", nl: "nld", fi: "fin", hu: "hun", es: "spa" };
const WORKS = { alice: ["alice-in-wonderland", "children", "sent", "de:19778 en:11 fr:55456 it:28371"], faust: ["faust-part-1", "drama", "line", "de:2229 en:3023 es:68566 fr:54202 nl:67276"],
  grimm: ["grimms-fairy-tales", "children", "sent", "de:77905 en:2591 fi:45046 fr:12250 hu:40088"], gulliver: ["gullivers-travels", "book", "sent", "en:829 fi:44892 fr:17640 hu:76042 it:61179 nl:37442"],
  perrault: ["perraults-fairy-tales", "children", "sent", "de:42900 en:17208 fi:48713"], pinocchio: ["pinocchio", "children", "sent", "en:500 fi:53077 it:52484"],
  robinson: ["robinson-crusoe", "book", "sent", "de:60344 en:521 fi:48387 fr:38705 nl:41427"] };
const pcFile = (dir, lang, pg) => { const d = `${PC}/${dir}/${lang}`; const f = fs.existsSync(d) ? fs.readdirSync(d).filter((x) => x.startsWith(`pg${pg}_`) && x.endsWith(".txt")).sort()[0] : null; return f ? `${d}/${f}` : `${d}/MISSING-pg${pg}`; };
export const PARALLEL = Object.entries(WORKS).flatMap(([w, [dir, reg, kind, eds]]) => eds.split(" ").map((e) => { const [l, pg] = e.split(":");
  return T(`ml-pc-${w}-${l}`, { language: LANG[l], script: "latn", register: reg, kind, ends: "latin", wrap: "hard", clean: ["br1", "html"], files: [pcFile(dir, l, pg)],
    notes: `parallel-classics edition of ${w} (Gutenberg #${pg}); the same work exists in the sibling pockets ml-pc-${w}-*: pockets of one work are NOT independent in content${l === "en" && DUPBOOK[w] ? `; EXACT Gutenberg #${pg} duplicate of the books-group pocket ${DUPBOOK[w]} (seen in loaders/books.manifest.json): count only one of the two` : ""}` }); }));
export const WARPEACE = [
  T("ml-wap-en", { language: "eng-tr", script: "latn", register: "book", kind: "sent", ends: "latin", wrap: "hard", clean: ["pg", "br1"], files: [`${ML_ROOT}/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt`], notes: "War and Peace, Maude translation (Gutenberg #2600); also the book used by earlier khora name tests, so possibly duplicated by another group's pocket" }),
  T("ml-wap-fr", { language: "fra-tr", script: "latn", register: "book", kind: "sent", ends: "latin", wrap: "line", clean: ["br1"], files: [`${ML_ROOT}/war-and-peace/fr/guerre-et-paix_Tolstoy_Bienstock_wikisource.txt`], notes: "French translation excerpt (Wikisource); expected thin" }),
  T("ml-wap-ru", { language: "rus", script: "cyrl", register: "book", kind: "sent", ends: "latin", wrap: "line", clean: ["br1"], files: [`${ML_ROOT}/war-and-peace/ru/voyna-i-mir_Tolstoy_wikisource.txt`], notes: "Russian original excerpt (Wikisource); expected thin" }),
];
const WK = `${ML_ROOT}/wikipedia-lang`;
const wk = (l) => (fs.existsSync(`${WK}/${l}`) ? fs.readdirSync(`${WK}/${l}`).filter((x) => x.endsWith(".txt")).sort().map((x) => `${WK}/${l}/${x}`) : []);
export const WIKI = [["fr", "fra", "latin"], ["el", "ell", "greek"], ["fa", "fas", "arabic"], ["he", "heb", "latin"], ["ko", "kor", "latin"], ["tr", "tur", "latin"]].map(([l, iso, ends]) =>
  T(`ml-wiki-${l}`, { language: iso, register: "encyclopedia", kind: "sent", ends, wrap: "line", clean: ["br1", "html"], files: wk(l), notes: `Wikipedia articles (${wk(l).length} files); most languages here hold far fewer than 20,000 tokens and are dropped by the thin rule` }));
