// eval/pockets/loaders/_ml_dialect.mjs — dialect / pidgin / creole / social-media / reference pockets of group "ml" (dialects-pidgins-creoles, concepticon).
// Custom readers return string[][] (one array of unit strings per source file) through spec.rawUnits; everything else is the shared buildText path.
import fs from "node:fs";
import { ML_ROOT, CLEAN, body } from "./_ml_text.mjs";
import { T } from "./_ml_specs.mjs";
import { readConllu } from "./_conllu.mjs";
import { interner } from "./_ud_ml_common.mjs";

const D = `${ML_ROOT}/dialects-pidgins-creoles`;
// cleaners local to this module
CLEAN.coraal = (t) => t.split("\n").filter((l) => !l.startsWith("#")).join("\n").replace(/\/(?:RD-[^/\n]{1,30}|unintelligible|\?+)\//g, " ").replace(/<[^>\n]{0,40}>/g, " ").replace(/\([^)\n]{0,60}\)/g, " ");
CLEAN.social = (t) => t.replace(/https?:\/\/\S+/g, " ").replace(/@[\p{L}\p{N}_]+/gu, " ").replace(/#/g, " ").replace(/�/g, " ");
CLEAN.apics = (t) => { const k = t.search(/^---\s*$/m); return k >= 0 ? t.slice(k + 3) : t; };
CLEAN.seg = (t) => t.replace(/####/g, " ").replace(/•/g, " ");

const read = (f) => fs.readFileSync(f, "utf8").replace(/^﻿/, "");
const lines = (f) => read(f).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const tsv = (f, col, header = true) => lines(f).slice(header ? 1 : 0).map((l) => l.split("\t")[col] ?? "").filter(Boolean);
const uniq = (arrs) => { const seen = new Set(); return arrs.map((a) => a.filter((x) => (seen.has(x) ? false : (seen.add(x), true)))); };
const jsonl = (f, key) => lines(f).map((l) => { try { return String(JSON.parse(l)[key] ?? ""); } catch { return ""; } }).filter(Boolean);
export function parseCSV(t) {
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n") { row.push(f); rows.push(row); row = []; f = ""; } else if (c !== "\r") f += c; }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
const ls = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => re.test(x)).sort().map((x) => `${dir}/${x}`) : []);
const storyLines = (f) => lines(f).filter((l) => !/^(Story:|Author:|Work Time|\*{5,})/.test(l));
const base = { script: "latn", kind: "line", wrap: "line" };

const CORAAL = ["dcb", "prv", "roc"].map((site) => T(`ml-coraal-${site}`, { ...base, language: "eng-aal", register: "speech", clean: ["coraal"], files: ls(`${D}/coraal/${site}`, /\.txt$/),
  notes: `CORAAL (African American Language) sociolinguistic interview transcripts, component ${site.toUpperCase()}; one transcript line per unit; redaction tags, non-speech tags and parenthetical annotations removed; one file per speaker; CC BY-NC-SA 4.0` }));
const PIDGIN = [
  T("ml-pcm-news", { ...base, language: "pcm", register: "news", files: [`${D}/creoleval/ner_masakhaner_pcm/dev.txt`, `${D}/creoleval/ner_masakhaner_pcm/test.txt`],
    rawUnits: () => ["dev.txt", "test.txt"].map((n) => read(`${D}/creoleval/ner_masakhaner_pcm/${n}`).split(/\r?\n\s*\r?\n/).map((b) => b.split(/\r?\n/).map((l) => l.split(/\s+/)[0]).filter(Boolean).join(" ")).filter(Boolean)),
    notes: "Nigerian Pidgin news (MasakhaNER 'pcm', BBC Pidgin); pre-tokenised CoNLL column 1 only, NER tags not read; one sentence per unit" }),
  T("ml-pcm-speech", { ...base, language: "pcm", register: "speech", files: ls(`${D}/creoleval/pos_ud_naija_pcm`, /\.conllu$/),
    rawUnits: () => { const I = interner(), st = { droppedNoLetter: 0, punctDropped: 0, spaceTokens: 0, mwtTokens: 0 }; return ls(`${D}/creoleval/pos_ud_naija_pcm`, /\.conllu$/).map((f) => readConllu(f, I, st).map((s) => s.join(" "))); },
    notes: "Nigerian Pidgin spoken corpus (UD Naija-NSC samples: dev, test, train sample), forms only (UPOS PUNCT dropped by the reader)" }),
  T("ml-pcm-tweets", { ...base, language: "pcm", register: "chat", clean: ["social"], files: ls(`${D}/creoleval/sa_afrisenti_pcm`, /\.tsv$/),
    rawUnits: () => ls(`${D}/creoleval/sa_afrisenti_pcm`, /\.tsv$/).map((f) => tsv(f, 1)), notes: "Nigerian Pidgin tweets (AfriSenti 'pcm'), one tweet per unit, sentiment labels not read; URLs and @mentions removed" }),
];
const HAT_SRC = [`${D}/creoleval/mt_mit_haiti/ht-en.trg`, `${D}/creoleval/mt_mit_haiti/ht-fr.trg`, `${D}/creoleval/mt_mit_haiti/ht_monolingual_sample.txt`, `${D}/creoleval/tatoeba_sentence_mining/hat-eng_sample1.tsv`,
  `${D}/creoleval/tatoeba_sentence_mining/hat-fra_sample1.tsv`, `${D}/kreyol-mt/bitexts/hat-eng/hat-eng.tsv`, `${D}/creoleval/mctest/CreoleTranslations/mc160.dev.kreyol1.txt`, `${D}/creoleval/mctest/CreoleTranslations/mc160.dev.kreyol2_localized.txt`];
const CREOLE = [
  T("ml-hat", { ...base, language: "hat", clean: ["seg", "social"], register: "dialect", files: HAT_SRC,
    rawUnits: () => uniq([tsv(HAT_SRC[0], 1, false), tsv(HAT_SRC[1], 1, false), lines(HAT_SRC[2]), tsv(HAT_SRC[3], 0), tsv(HAT_SRC[4], 0), tsv(HAT_SRC[5], 1), storyLines(HAT_SRC[6]), storyLines(HAT_SRC[7])]),
    notes: "Haitian Creole text pooled from 8 small sources (MIT-Haiti translations and monolingual web sample, Tatoeba-mining sources, Kreyol-MT, two MCTest story translations); exact duplicate lines removed; MIXED sources and registers" }),
  T("ml-djk-ndyuka", { ...base, language: "djk", register: "scripture", files: [`${D}/kreyol-mt/bitexts/djk-eng/djk-eng.tsv`], rawUnits: () => uniq([tsv(`${D}/kreyol-mt/bitexts/djk-eng/djk-eng.tsv`, 1)]),
    notes: "Ndyuka (Surinamese creole) Bible verses, the djk side of the OPUS djk-eng bitext (one verse per unit); the djk column repeats lines (7,868 distinct of 15,743) so exact duplicate lines are removed" }),
  T("ml-eng-bible-opus", { ...base, language: "eng", register: "scripture", files: [`${D}/kreyol-mt/bitexts/djk-eng/djk-eng.tsv`], rawUnits: () => [tsv(`${D}/kreyol-mt/bitexts/djk-eng/djk-eng.tsv`, 3)],
    notes: "English Bible verses, the eng side of the OPUS djk-eng bitext (a World English Bible-style text); the same verses as ml-djk-ndyuka (parallel); possibly duplicated by a scripture group" }),
  ...[["sag", "sag", "sag-eng_sample1"], ["tpi", "tpi", "tpi-eng_sample1"], ["pap", "pap", "pap-eng_sample1"]].map(([k, iso, f]) => T(`ml-${k}`, { ...base, language: iso, register: "religion", clean: ["social"], files: [`${D}/creoleval/tatoeba_sentence_mining/${f}.tsv`],
    rawUnits: () => uniq([tsv(`${D}/creoleval/tatoeba_sentence_mining/${f}.tsv`, 0)]), notes: `${iso} side (source_sent column, exact duplicates removed) of the Tatoeba-style sentence-mining set ${f}: sentences from a religious periodical; the English candidate columns are not read` })),
  T("ml-mfe", { ...base, language: "mfe", register: "dialect", clean: ["social"], files: ls(`${D}/creoleval/mt_kreolmorisien`, /\.jsonl$/).concat([`${D}/creoleval/mctest/CreoleTranslations/mc160.dev.mauritian.txt`]),
    rawUnits: () => ls(`${D}/creoleval/mt_kreolmorisien`, /\.jsonl$/).map((f) => jsonl(f, "target")).concat([storyLines(`${D}/creoleval/mctest/CreoleTranslations/mc160.dev.mauritian.txt`)]),
    notes: "Mauritian Creole: target side of the English-Mauritian MT sets (dev, test, train sample) plus the MCTest story translation; mixed sources" }),
];
const ARABIZI = [
  T("ml-tunizi", { ...base, language: "aeb-latn", register: "chat", clean: ["social"], files: [`${D}/dialectbench/tunizi/TUNIZI_V1_full.txt`],
    rawUnits: () => [lines(`${D}/dialectbench/tunizi/TUNIZI_V1_full.txt`).map((l) => l.replace(/;\s*-?\d+\s*$/, ""))],
    notes: "Tunisian Arabizi (Latin-script Tunisian Arabic) social comments, TUNIZI v1 full; sentiment suffix removed; TUNIZI_V2_sample not loaded (may overlap v1)" }),
  T("ml-tsac", { ...base, language: "aeb", script: "arab", register: "chat", clean: ["social"], files: ls(`${D}/dialectbench/tsac`, /_sample\.txt$/), rawUnits: () => ls(`${D}/dialectbench/tsac`, /_sample\.txt$/).map((f) => lines(f)),
    notes: "Tunisian Arabic (Arabic script) sentiment sample comments (TSAC); small, expected to fall under the 20,000-token floor" }),
  T("ml-ajgt", { ...base, language: "ajp", script: "arab", register: "chat", clean: ["social"], files: [`${D}/dialectbench/ajgt/AJGT_full.csv`],
    rawUnits: () => [parseCSV(read(`${D}/dialectbench/ajgt/AJGT_full.csv`)).slice(1).map((r) => r[1] ?? "").filter((x) => x.trim())], notes: "Jordanian Arabic tweets (AJGT), the Feed column only; expected near the 20,000-token floor" }),
  T("ml-ell-cypriot", { ...base, language: "ell-cyp", script: "grek", register: "chat", clean: ["social"], files: ls(`${D}/dialectbench/greek-dialect-classifier`, /^cg_/), rawUnits: () => ls(`${D}/dialectbench/greek-dialect-classifier`, /^cg_/).map(lines),
    notes: "Cypriot Greek social-media and web text (greek-dialect-classifier cg_*); expected thin" }),
  T("ml-ell-smg-social", { ...base, language: "ell", script: "grek", register: "chat", clean: ["social"], files: ls(`${D}/dialectbench/greek-dialect-classifier`, /^smg_/), rawUnits: () => ls(`${D}/dialectbench/greek-dialect-classifier`, /^smg_/).map(lines),
    notes: "Standard Modern Greek social-media and web text (greek-dialect-classifier smg_*); expected thin" }),
];
const REF = [
  T("ml-apics-prose", { language: "eng-ling", script: "latn", register: "academic", kind: "sent", ends: "latin", wrap: "flow", clean: ["apics", "br1"], files: ls(`${D}/apics/surveys`, /\.txt$/),
    notes: "APiCS Online survey chapters: English linguistic description of 76 pidgin/creole languages with interlinear creole examples inline; one file (chapter) per language; CC BY 4.0" }),
  T("ml-ewave-examples", { ...base, language: "eng-var", register: "dialect", files: [`${D}/ewave/cldf/examples.csv`], rawUnits: () => [parseCSV(read(`${D}/ewave/cldf/examples.csv`)).slice(1).map((r) => r[2] ?? "").filter((x) => x.trim())],
    notes: "eWAVE example sentences from 53 varieties of English (creoles, pidgins, L1 and L2 varieties) pooled in source order; MIXED varieties; CC BY 3.0" }),
  T("ml-concepticon-defs", { ...base, language: "eng", register: "lexicon", files: [`${ML_ROOT}/concepticon/concepticon.tsv`],
    rawUnits: () => { const r = lines(`${ML_ROOT}/concepticon/concepticon.tsv`).map((l) => l.split("\t")), h = r.shift(), i = h.indexOf("DEFINITION"); return [r.map((x) => x[i] ?? "").filter(Boolean)]; },
    notes: "Concepticon concept-set definitions (4,165 short English dictionary-style definitions, one per unit); CC BY 4.0" }),
];
export const DIALECT = [...CORAAL, ...PIDGIN, ...CREOLE, ...ARABIZI, ...REF];
