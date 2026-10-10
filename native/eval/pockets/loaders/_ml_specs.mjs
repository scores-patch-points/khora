// eval/pockets/loaders/_ml_specs.mjs — plain-text pocket specs of group "ml" (originals, English translations, parallel classics, War and Peace, Wikipedia, Nietzsche).
// Language codes are ISO 639-3 plus a free tag; registers: poetry drama history treatise scripture book children translation encyclopedia lexicon.
import { ML_ROOT, buildText } from "./_ml_text.mjs";

const F = (dir, names) => names.map((n) => `${ML_ROOT}/${dir}/${n}.txt`);
export const T = (id, o) => ({ id, build: async () => buildText({ id, ...o }) });
const GR = { language: "grc", script: "grek", ends: "greek", wrap: "line", clean: ["br1"] };
const LA = { language: "lat", script: "latn", ends: "latin", wrap: "line", clean: ["br1"] };
const SA = { language: "san", script: "latn", clean: ["san"], notes: "Sanskrit in IAST transliteration (GRETIL); verse locators stripped" };
const AR = { language: "arb-cls", script: "arab", ends: "arabic", wrap: "line", kind: "sent", clean: ["br1", "html"], notes: "Classical Arabic, Arabic Wikisource scrape; sparse punctuation, so units can be long" };
const ZH = { language: "lzh", script: "hani", ends: "cjk", wrap: "line", kind: "sent", tok: "char", clean: ["br1", "html", "zhnav"] };
const DECL = "title declared in the file front matter, not independently verified";

export const GREEK = [
  T("ml-grc-homer", { ...GR, register: "poetry", kind: "line", files: F("greek-originals", ["homer-iliad", "homer-odyssey"]), notes: `hexameter epic, one verse line per unit; ${DECL}` }),
  T("ml-grc-tragedy", { ...GR, register: "drama", kind: "line", speakers: "block-head", files: F("greek-originals", ["aeschylus-agamemnon", "aeschylus-choephori", "aeschylus-eumenides", "aeschylus-prometheus-bound", "sophocles-ajax", "sophocles-antigone", "sophocles-oedipus-colonus", "sophocles-oedipus-rex", "sophocles-philoctetes", "euripides-bacchae", "euripides-hippolytus", "euripides-medea"]), notes: `12 Attic tragedies, verse lines; speaker-label lines dropped by layout rule where the scrape has them (the 4 Aeschylus files are one long line with inline speaker names and verse numbers, split at sentence terminators); ${DECL}` }),
  T("ml-grc-comedy", { ...GR, register: "drama", kind: "line", speakers: "block-head", files: F("greek-originals", ["aristophanes-birds", "aristophanes-clouds", "aristophanes-frogs"]), notes: `3 Aristophanes comedies; speaker-label lines dropped by layout rule; ${DECL}` }),
  T("ml-grc-lyric", { ...GR, register: "poetry", kind: "line", files: F("greek-originals", ["pindar-isthmian-odes", "pindar-nemean-odes", "pindar-olympian-odes", "pindar-pythian-odes", "sappho-poems"]), notes: `Pindar odes + Sappho fragments (choral and monodic lyric); ${DECL}` }),
  T("ml-grc-plato", { ...GR, register: "treatise", kind: "sent", files: F("greek-originals", ["plato-apology", "plato-crito", "plato-gorgias", "plato-meno", "plato-parmenides", "plato-phaedo", "plato-phaedrus", "plato-republic", "plato-sophist", "plato-symposium", "plato-theaetetus", "plato-timaeus"]), notes: `12 dialogues; ${DECL}` }),
  T("ml-grc-aristotle", { ...GR, register: "treatise", kind: "sent", files: F("greek-originals", ["aristotle-categories", "aristotle-de-anima", "aristotle-metaphysics", "aristotle-nicomachean-ethics", "aristotle-poetics", "aristotle-politics"]), notes: `6 treatises; ${DECL}` }),
  T("ml-grc-hellenistic-hist", { ...GR, register: "history", kind: "sent", files: F("greek-originals", ["herodotus-histories"]), notes: "file is DECLARED Herodotus Histories but spot checks at 6 positions read as Polybius-type Hellenistic Koine history (Polybius named in the third person, Cannae, Antiochus, sarissa phalanx); labelled by content, author not independently verified" }),
  T("ml-grc-thucydides", { ...GR, register: "history", kind: "sent", files: F("greek-originals", ["thucydides-history"]), notes: DECL }),
  T("ml-grc-plotinus", { ...GR, register: "treatise", kind: "sent", files: F("greek-originals", ["plotinus-enneads"]), notes: `Neoplatonist treatises; ${DECL}` }),
  T("ml-grc-stoic", { ...GR, register: "treatise", kind: "sent", files: F("greek-originals", ["epictetus-discourses", "epictetus-enchiridion", "marcus-aurelius-meditations"]), notes: `Imperial-period Koine Stoic prose; ${DECL}` }),
  T("ml-grc-minor", { ...GR, register: "treatise", kind: "sent", files: F("greek-originals", ["corpus-hermeticum-krater", "corpus-hermeticum-poimandres", "corpus-hermeticum-tat", "hippocrates-aphorisms", "plutarch-life-of-solon", "thrax-tekhne-grammatike"]), notes: "HETEROGENEOUS residue of short Greek prose (hermetica, Hippocrates, Plutarch, grammar); only kept if it reaches the token floor" }),
];
export const LATIN = [
  T("ml-lat-livy", { ...LA, register: "history", kind: "sent", clean: ["br1", "numlines"], files: F("latin-originals", ["livy-history"]), notes: `Wikisource scrape with page index lines removed; ${DECL}` }),
  T("ml-lat-tacitus", { ...LA, register: "history", kind: "sent", clean: ["br1", "numlines"], files: F("latin-originals", ["tacitus-annals", "tacitus-histories"]), notes: DECL }),
  T("ml-lat-patristic", { ...LA, register: "treatise", kind: "sent", clean: ["br1", "numlines"], files: F("latin-originals", ["augustine-confessions", "boethius-consolation", "anselm-proslogion"]), notes: `late-antique and medieval devotional/philosophical prose; ${DECL}` }),
  T("ml-lat-summa", { ...LA, register: "treatise", kind: "sent", files: F("latin-originals", ["summa-theologiae-prima-pars", "summa-theologiae-prima-secundae", "summa-theologiae-secunda-secundae", "summa-theologiae-tertia-pars"]), notes: "Leonine text, Corpus Thomisticum, 4 parts; the Wikisource 'aquinas-summa-prima.txt' (same work) is NOT loaded to avoid duplicate text; ~2.5% of the 11.7M characters survive the 300k cap" }),
  T("ml-lat-bacon", { ...LA, register: "treatise", kind: "sent", files: F("latin-originals", ["bacon-novum-organum"]), notes: `early-modern philosophy of science; ${DECL}` }),
  T("ml-lat-copernicus", { ...LA, register: "treatise", kind: "sent", files: F("latin-originals", ["copernicus-revolutionibus"]), notes: `astronomy with diagram letters; OCR noise (long s read as f); ${DECL}` }),
  T("ml-lat-newton", { ...LA, register: "treatise", kind: "sent", wrap: "hard", files: F("latin-originals", ["newton-principia"]), notes: `mathematical physics, hard-wrapped lines joined; ${DECL}` }),
  T("ml-lat-spinoza", { ...LA, register: "treatise", kind: "sent", files: F("latin-originals", ["spinoza-ethica"]), notes: `geometric-method philosophy; ${DECL}` }),
  T("ml-lat-martial", { ...LA, register: "poetry", kind: "line", files: F("latin-originals", ["martial-epigrammata", "martial-liber-spectaculorum"]), notes: `epigrams, verse lines; ${DECL}` }),
];
export const SANSKRIT = [
  T("ml-san-mahabharata", { ...SA, register: "poetry", kind: "line", files: Array.from({ length: 18 }, (_, i) => `${ML_ROOT}/sanskrit-originals/mahabharata-book${i + 1}.txt`), notes: `${SA.notes}; epic, half-verse lines, 18 books sampled by whole blocks` }),
  T("ml-san-ramayana", { ...SA, register: "poetry", kind: "line", files: F("sanskrit-originals", ["ramayana"]), notes: `${SA.notes}; epic` }),
  T("ml-san-rigveda", { ...SA, register: "scripture", kind: "line", files: F("sanskrit-originals", ["rigveda"]), notes: `${SA.notes}; Vedic hymns` }),
  T("ml-san-lotus", { ...SA, register: "scripture", kind: "sent", ends: "danda", wrap: "line", files: F("sanskrit-originals", ["lotus-sutra"]), notes: `${SA.notes}; Buddhist Hybrid Sanskrit prose and verse, split at danda` }),
  T("ml-san-natyasastra", { ...SA, register: "treatise", kind: "line", files: F("sanskrit-originals", ["bharata-natyasastra"]), notes: `${SA.notes}; dramaturgy treatise in verse and prose` }),
  T("ml-san-kavya", { ...SA, register: "poetry", kind: "line", files: F("sanskrit-originals", ["kumarasambhava", "meghaduta", "raghuvamsha", "shakuntala"]), notes: `${SA.notes}; Kalidasa: three court poems and one play` }),
  T("ml-san-sutra", { ...SA, register: "treatise", kind: "sent", ends: "danda", wrap: "line", files: F("sanskrit-originals", ["panini-ashtadhyayi", "jaimini-mimamsa-sutra", "nyaya-sutras", "vaisheshika-sutras", "yoga-sutras", "yoga-sutras-bhasya", "samkhya-karika", "nagarjuna-mulamadhyamakakarika", "brahmagupta-brahmasphutasiddhanta"]), notes: `${SA.notes}; sutra/karika literature (grammar, ritual exegesis, logic, yoga, samkhya, madhyamaka, astronomy), split at danda` }),
];
export const ARABIC = [
  T("ml-arb-hadith", { ...AR, register: "scripture", files: F("arabic-originals", ["sahih-al-bukhari"]), notes: `${AR.notes}; hadith collection` }),
  T("ml-arb-fiqh", { ...AR, register: "treatise", files: F("arabic-originals", ["ibn-rushd-bidayat-al-mujtahid"]), notes: `${AR.notes}; comparative jurisprudence` }),
  T("ml-arb-nights", { ...AR, register: "book", files: F("arabic-originals", ["alf-layla-wa-layla"]), notes: `${AR.notes}; tales` }),
  T("ml-arb-muqaddimah", { ...AR, register: "history", files: F("arabic-originals", ["ibn-khaldun-muqaddimah"]), notes: `${AR.notes}; historiography/sociology` }),
  T("ml-arb-fihrist", { ...AR, register: "history", files: F("arabic-originals", ["ibn-al-nadim-fihrist"]), notes: `${AR.notes}; bio-bibliographic catalogue` }),
  T("ml-arb-optics", { ...AR, register: "treatise", files: F("arabic-originals", ["ibn-al-haytham-manazir"]), notes: `${AR.notes}; optics` }),
  T("ml-arb-kalam", { ...AR, register: "treatise", files: F("arabic-originals", ["al-ghazali-incoherence", "al-ghazali-deliverance-from-error", "ibn-rushd-decisive-treatise"]), notes: `${AR.notes}; theology and philosophy (al-Ghazali x2, Ibn Rushd)` }),
];
export const CHINESE = [
  T("ml-lzh-bencao", { ...ZH, register: "treatise", files: F("chinese-originals", ["bencao-gangmu"]), notes: "Literary Chinese materia medica; character chunks (no word segmentation exists)" }),
  T("ml-lzh-shiji", { ...ZH, register: "history", files: F("chinese-originals", ["shiji"]), notes: "Literary Chinese history; character chunks" }),
  T("ml-lzh-philosophy", { ...ZH, register: "treatise", files: F("chinese-originals", ["mozi", "xunzi", "dai-zhen"]), notes: "Mozi, Xunzi, Dai Zhen; character chunks" }),
  T("ml-lzh-jiuzhang", { ...ZH, register: "treatise", files: F("chinese-originals", ["jiuzhang-suanshu"]), notes: "mathematics with interlinear commentary in angle brackets kept; character chunks" }),
  T("ml-lzh-shuowen", { ...ZH, register: "lexicon", files: F("chinese-originals", ["shuowen-jiezi"]), notes: "character dictionary entries (many rare characters are blanks in the scrape); character chunks" }),
];
