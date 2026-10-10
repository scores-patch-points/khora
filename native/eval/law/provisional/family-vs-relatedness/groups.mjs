// eval/law/provisional/family-vs-relatedness/groups.mjs — LINGUISTIC GROUPS, WRITTEN BEFORE ANY RUN OF THIS LENS.
//
// Purpose. The user believes the shape of a name is specific to WORD-ORDER FAMILIES. name-company C2 found same-word-order-family training beat other-family training by
// +0.033 (12/22 languages), concentrated in Romance (+0.08..+0.18) plus rus/ell, with losses in heb/deu. Word order and RELATEDNESS (genus/branch) are confounded in C2 (Romance
// are all SVO and all related). This file fixes, before any transfer AUC of this lens is computed, which languages belong to which group on each axis, so that
// genus, word order, script and morphological type can be crossed and separated.
//
// DISCLOSURE (what the author had seen when this file was written). Read: name-company.mjs and NAME-COMPANY-RESULTS.md, including the per-language C2 table of the valid run
// (results/name-company-pairblocks/report.json: own-language AUCs and the C2 same/other per language for the 22 non-thin languages of the 25-stem set). Role-config word-order
// shares (priors/role-config-<stem>.json) for all 53 stems. NOT seen: any transfer AUC for the 28 stems outside the 25-stem set, any single-donor transfer AUC, any genus-,
// order-, script- or morphology-contrast on any language, any UD test.conllu content. No AUC of this lens has been computed.
//
// SOURCES. FAMILY / GENUS / SCRIPT / MORPH / woKnow are linguistic knowledge (WALS/Glottolog-style, the author's recollection, written down here and not tuned). Disputable cases
// are flagged in comments; none was chosen after looking at a result. WORD ORDER from data is the role-config share pair (subjectBefore, objectBefore) of the language's own UD
// training treebank (the same source name-shape used); two labelings are defined, wo3 primary and wo2 for comparability with C2.
//
// TWINS (leakage guards). cmn and cmn-hans are the SAME corpus (zhgsd) in two scripts: cmn-hans is dropped from the roster entirely. team marks languages whose UD treebanks come
// from the same annotation team (AnCora es/ca, SET hr/sr): a same-genus donor from the same team shares annotation conventions, a confound for relatedness; the
// "no-twin" variants exclude it.

import fs from "node:fs";

const PRIORS = "/Users/mlacy/Documents/3.0/khora/native/priors";

// stem: [family, genus, script, morph, woKnow, team]
//   family: top-level (Indo-European, Afro-Asiatic, Uralic, Sino-Tibetan, Turkic, Dravidian, Japonic, Koreanic, Austronesian, Austroasiatic, Kartvelian, Basque, Niger-Congo)
//   genus : the grouping used for "same genus" (WALS-style genus; Germanic, Romance, Slavic ... are the three large ones; the rest have 1-3 members)
//   morph : analytic | fusional | agglutinative | templatic   (coarse; disputable at the margin; used only in a secondary regression term)
//   woKnow: dominant order from linguistic knowledge: SOV | SVO | VSO | free (V2/no dominant order). Used only in the sensitivity label.
export const LANG = {
  afr: ["Indo-European", "Germanic", "Latin", "analytic", "SVO", null],
  arb: ["Afro-Asiatic", "Semitic", "Arabic", "templatic", "VSO", null],
  bul: ["Indo-European", "Slavic", "Cyrillic", "fusional", "SVO", null],
  cat: ["Indo-European", "Romance", "Latin", "fusional", "SVO", "AnCora"],
  ces: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", null],
  cmn: ["Sino-Tibetan", "Sinitic", "Han", "analytic", "SVO", null],
  cym: ["Indo-European", "Celtic", "Latin", "fusional", "VSO", null],
  dan: ["Indo-European", "Germanic", "Latin", "analytic", "SVO", null],
  deu: ["Indo-European", "Germanic", "Latin", "fusional", "free", null],
  ell: ["Indo-European", "Hellenic", "Greek", "fusional", "SVO", null],
  eng: ["Indo-European", "Germanic", "Latin", "analytic", "SVO", null],
  est: ["Uralic", "Finnic", "Latin", "agglutinative", "SVO", null],
  eus: ["Basque", "Basque", "Latin", "agglutinative", "SOV", null],
  fas: ["Indo-European", "Iranian", "Arabic", "fusional", "SOV", null],
  fin: ["Uralic", "Finnic", "Latin", "agglutinative", "SVO", null],
  fra: ["Indo-European", "Romance", "Latin", "fusional", "SVO", null],
  gle: ["Indo-European", "Celtic", "Latin", "fusional", "VSO", null],
  glg: ["Indo-European", "Romance", "Latin", "fusional", "SVO", null],
  heb: ["Afro-Asiatic", "Semitic", "Hebrew", "templatic", "SVO", null],
  hin: ["Indo-European", "Indo-Aryan", "Devanagari", "fusional", "SOV", null],
  hrv: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", "SET"],
  hun: ["Uralic", "Ugric", "Latin", "agglutinative", "free", null],
  hye: ["Indo-European", "Armenian", "Armenian", "fusional", "SOV", null],
  ind: ["Austronesian", "Malayo-Sumbawan", "Latin", "analytic", "SVO", null],
  ita: ["Indo-European", "Romance", "Latin", "fusional", "SVO", null],
  jpn: ["Japonic", "Japonic", "Kana-Han", "agglutinative", "SOV", null],
  kat: ["Kartvelian", "Kartvelian", "Georgian", "agglutinative", "free", null],
  kor: ["Koreanic", "Koreanic", "Hangul", "agglutinative", "SOV", null],
  lav: ["Indo-European", "Baltic", "Latin", "fusional", "SVO", null],
  lit: ["Indo-European", "Baltic", "Latin", "fusional", "SVO", null],
  lzh: ["Sino-Tibetan", "Sinitic", "Han", "analytic", "SVO", null],
  mar: ["Indo-European", "Indo-Aryan", "Devanagari", "fusional", "SOV", null],
  mlt: ["Afro-Asiatic", "Semitic", "Latin", "templatic", "SVO", null],
  nld: ["Indo-European", "Germanic", "Latin", "fusional", "free", null],
  nob: ["Indo-European", "Germanic", "Latin", "analytic", "SVO", null],
  pol: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", null],
  por: ["Indo-European", "Romance", "Latin", "fusional", "SVO", null],
  ron: ["Indo-European", "Romance", "Latin", "fusional", "SVO", null],
  rus: ["Indo-European", "Slavic", "Cyrillic", "fusional", "SVO", null],
  slk: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", null],
  slv: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", null],
  spa: ["Indo-European", "Romance", "Latin", "fusional", "SVO", "AnCora"],
  srp: ["Indo-European", "Slavic", "Latin", "fusional", "SVO", "SET"],
  swe: ["Indo-European", "Germanic", "Latin", "analytic", "SVO", null],
  tam: ["Dravidian", "Dravidian", "Tamil", "agglutinative", "SOV", null],
  tel: ["Dravidian", "Dravidian", "Telugu", "agglutinative", "SOV", null],
  tur: ["Turkic", "Turkic", "Latin", "agglutinative", "SOV", null],
  uig: ["Turkic", "Turkic", "Arabic", "agglutinative", "SOV", null],
  ukr: ["Indo-European", "Slavic", "Cyrillic", "fusional", "SVO", null],
  urd: ["Indo-European", "Indo-Aryan", "Arabic", "fusional", "SOV", null],
  vie: ["Austroasiatic", "Vietic", "Latin", "analytic", "SVO", null],
  wol: ["Niger-Congo", "Atlantic", "Latin", "agglutinative", "SVO", null],
};
// Disputable on purpose-flagged: afr (analytic Germanic; V2 with SOV subordinates), deu/nld (V2: "free"), arb (VSO/SVO mixed), swe/dan/nob (mildly inflected: "analytic"), mar (fusional, SOV).

export const STEMS = Object.keys(LANG);                       // 52 languages (cmn-hans dropped as the same corpus as cmn)
export const STEMS25 = ["eng", "spa", "rus", "cmn", "arb", "heb", "fas", "kor", "jpn", "fra", "deu", "ita", "por", "nld", "pol", "ukr", "hin", "vie", "ind", "swe", "urd", "tur", "ell", "fin"]; // the 25-stem set of name-company (cmn-hans omitted)
export const fam = (s) => LANG[s][0];
export const genus = (s) => LANG[s][1];
export const script = (s) => LANG[s][2];
export const morph = (s) => LANG[s][3];
export const woKnow = (s) => LANG[s][4];
export const team = (s) => LANG[s][5];

/** role-config word-order shares: [subjectBefore, objectBefore] from the language's own UD training treebank (priors/role-config-<stem>.json). */
export function roleShares(stem) {
  const d = JSON.parse(fs.readFileSync(`${PRIORS}/role-config-${stem}.json`, "utf8"));
  return [d.subject.before / Math.max(1, d.subject.total), d.object.before / Math.max(1, d.object.total)];
}
/** wo3 (PRIMARY): SOV-like if subjectBefore >= 0.5 and objectBefore >= 0.65; SVO-like if subjectBefore >= 0.5 and objectBefore < 0.35; else MIXED (verb-first or intermediate).
 *  The 0.65 and 0.35 cut points are those name-shape.mjs used to name its centroids. MIXED languages take part in no word-order contrast. */
export function wo3(stem) { const [s, o] = roleShares(stem); return s >= 0.5 && o >= 0.65 ? "SOV" : s >= 0.5 && o < 0.35 ? "SVO" : "MIXED"; }
/** wo2 (SENSITIVITY; the C2 two-family labeling, reproduces name-company's membership for the 25 stems): SOV if objectBefore >= 0.5 else SVO. */
export function wo2(stem) { const [, o] = roleShares(stem); return o >= 0.5 ? "SOV" : "SVO"; }
export const WO3 = Object.fromEntries(STEMS.map((s) => [s, wo3(s)]));
export const WO2 = Object.fromEntries(STEMS.map((s) => [s, wo2(s)]));

/** genera with >= 4 members in the roster (so a target has >= 3 same-genus donors): the only ones that can carry the equalised same-genus set of size 3. */
export function genusMembers() { const m = {}; for (const s of STEMS) (m[genus(s)] ??= []).push(s); return m; }

if (process.argv[2] === "--describe") {
  const g = genusMembers();
  console.log(JSON.stringify({ n: STEMS.length, genera: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.join(" ")])), WO3: Object.fromEntries(["SOV", "SVO", "MIXED"].map((k) => [k, STEMS.filter((s) => WO3[s] === k).join(" ")])), wo2Check: STEMS25.map((s) => `${s}:${WO2[s]}`).join(" ") }, null, 1));
}
