// loaders/_sibling-asym-prose.mjs — SIBLING pockets (English prose and plays) for the replication of comp.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Every pocket is built with the atlas "bk" pipeline (helpers imported unchanged: _bkcore/_bkseg through _sibling-ent-common.bookSibling): front matter, PG boilerplate, markup scrub, start/end cuts,
// optional speaker-label removal (drama), sentence units, documents = blocks of ~100 units, 300k cap by whole documents. Group is "sib" (never in an atlas count).
// SOURCE for all of them: ethos 11-multi-language/gutenberg-non-en/ files that are MISFILED English books (the atlas ml loader skipped all 19, see _ml_skips.mjs ENGLISH_MISFILED) and Marlowe's Faustus
//   (ethos 15-western-canon). No atlas pocket reads any of these texts (checked: bk/ml/fm manifests list none of these source files). The cut rules below were read off the raw file heads/tails before any statistic.
//   asym-en-about-london   reportage   J. E. Ritchie, About London (1860)                                  it/pg32773
//   asym-en-among-forces   essay       H. W. Warren, Among the Forces (1898), popular science + faith     fr/pg15807
//   asym-en-evolution-plain essay     J. Mason, Evolution Made Plain (1923), fi/pg76749 (13.7k words: THIN, never scored)
//   asym-en-dolls-house    drama       Ibsen, A Doll's House (English translation), speaker labels removed   en/pg2542
//   asym-en-early-plays    drama       Marlowe, Doctor Faustus (1604) + Greene, James the Fourth (1598), pooled (each alone is thin)
//   asym-en-mouret         novel       Zola, Abbe Mouret's Transgression (Vizetelly)                         es/pg14200
//   asym-en-poe2           novel       Poe, Works vol II (tales)                                              de/pg2148
//   asym-en-awakening      novel       Chopin, The Awakening and Selected Short Stories                      en/pg160
//   asym-en-waikna         memoir      Squier ("Bard"), Waikna (1855 travel narrative)                        es/pg74987
//   asym-en-plays-pooled   drama       POWER-CHECK pool of A Doll's House + Faustus + James IV (re-uses the units of the two drama siblings; not an independent pocket)
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { bookSibling, GBNE, GROUP } from "./_sibling-ent-common.mjs";

const FAUSTUS = "15-western-canon/marlowe/doctor-faustus-1604-quarto.txt", JAMES = GBNE + "sv/pg43668_F_ders_brott__Swedish_.txt";
export const SPECS = [
  { id: "asym-en-about-london", rel: GBNE + "it/pg32773_Il_Principe__Machiavelli_.txt", title: "About London (J. Ewing Ritchie, 1860)", author: "J. E. Ritchie", register: "reportage",
    cut: { start: /\nCHAPTER I\.\nNEWSPAPER PEOPLE\./, end: /\n\s*ADVERTISEMENTS\.\s*\n/ }, notes: "file name says Il Principe; Victorian London sketches; contents and publisher advertisements cut" },
  { id: "asym-en-among-forces", rel: GBNE + "fr/pg15807_Nana.txt", title: "Among the Forces (H. W. Warren, 1898)", author: "H. W. Warren", register: "essay",
    cut: { start: /\nAMONG THE FORCES\n\n\nWHY WRITTEN/, end: /\n\[1\]The action that drives off the material/ }, notes: "file name says Nana; popular-science essays with a religious frame; contents, illustration list and footnotes cut" },
  { id: "asym-en-evolution-plain", rel: GBNE + "fi/pg76749_Sota_satulavy___Finnish_.txt", title: "Evolution Made Plain (J. Mason, 1923)", author: "J. Mason", register: "essay",
    cut: { start: /\nWHAT EVOLUTION IS AND IS NOT\n/ }, notes: "file name says Finnish; popular-science exposition (Haldeman-Julius pocket series); expected UNDER the 20,000-token floor: reported as thin, never scored" },
  { id: "asym-en-dolls-house", rel: GBNE + "en/pg2542_War_and_Peace.txt", title: "A Doll's House (English translation)", author: "H. Ibsen", register: "drama", drama: "allcaps",
    cut: { start: /\nA DOLL’S HOUSE\n/ }, notes: "file name says War and Peace; prose drama; dramatis personae cut; speaker labels and bracketed stage directions removed (atlas rule stripDrama allcaps)" },
  { id: "asym-en-mouret", rel: GBNE + "es/pg14200_La_Divina_Comedia__Dante_.txt", title: "Abbe Mouret's Transgression (English translation)", author: "E. Zola", register: "novel",
    cut: { start: /\nBOOK I\n/, end: /\n[ \t]*THE END[ \t]*\s*$/ }, notes: "file name says Divina Comedia; Vizetelly's introduction cut" },
  { id: "asym-en-poe2", rel: GBNE + "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", title: "The Works of Edgar Allan Poe, vol II: tales", author: "E. A. Poe", register: "novel",
    cut: { start: /\nTHE PURLOINED LETTER\n/, end: /\nNOTES TO THE SECOND VOLUME\n/ }, notes: "file name says Werther; tales; contents list and endnotes cut" },
  { id: "asym-en-awakening", rel: GBNE + "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", title: "The Awakening and Selected Short Stories", author: "K. Chopin", register: "novel",
    cut: { start: /\nTHE AWAKENING\n\n+I\n/ }, notes: "file name says Crime and Punishment; novel plus short stories" },
  { id: "asym-en-waikna", rel: GBNE + "es/pg74987_La_Metamorfosis__Kafka_.txt", title: "Waikna; or, Adventures on the Mosquito Shore (1855)", author: "S. A. Bard (E. G. Squier)", register: "memoir",
    cut: { start: /\nChapter I\.\n/, end: /\nFOOTNOTES\n/ }, notes: "file name says La Metamorfosis; first-person travel narrative" },
];
const dramaUnits = (spec) => {   // the first lines of _sibling-ent-common.bookSibling, up to the sentence units (same code path)
  let text = scrub(trimBack(stripPG(stripFront(readText(spec.rel)).text)));
  text = cut(text, spec.cut || {}); text = stripDrama(text, spec.drama, !!spec.stageParen); text = scrub(text, spec.extra || []);
  return toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
};
const faustusUnits = () => { let t = stripFront(readText(FAUSTUS)).text; t = cut(scrub(t), { start: /\n[ \t]*Enter CHORUS\./, end: /\nFOOTNOTES:\n/ }); return toUnits(splitSentences(scrub(stripDrama(t, "marlowe", false)), { paraBreak: true })); };
const jamesUnits = () => {
  let t = scrub(trimBack(stripPG(stripFront(readText(JAMES)).text))); t = cut(t, { start: /\nMusicke playing within\./, end: /\nFINIS\.\s*$/ });
  t = t.replace(/^_[^_\n]{1,30}\._[ \t]*/gm, "").replace(/_(?:Enter|Exit|Exeunt|Manet|Musicke|Sound|Dance|Alarum|Drum|Trumpets)[^_]{0,500}_/g, " ");
  return toUnits(splitSentences(scrub(t), { paraBreak: true }));
};
const PLAYS_NOTE = "speaker labels, stage directions and editorial matter removed";
function earlyPlays() {
  const spec = { id: "asym-en-early-plays", files: [FAUSTUS, JAMES], title: "Doctor Faustus (1604) + James the Fourth (1598)", author: "C. Marlowe; R. Greene", register: "drama", language: "en", notes: `two Elizabethan plays pooled to clear the token floor; ${PLAYS_NOTE}` };
  return { ...assemble(spec, [faustusUnits(), jamesUnits()], { sibling: true, pooledPlays: 2 }).pocket, group: GROUP };
}
// POWER CHECK pocket (not an independent sibling: it re-uses the units of the two drama pockets above): A Doll's House + Faustus + James IV pooled, one document grid over the pool.
function playsPooled() {
  const dh = SPECS.find((s) => s.id === "asym-en-dolls-house"), spec = { id: "asym-en-plays-pooled", files: [dh.rel, FAUSTUS, JAMES], title: "A Doll's House + Doctor Faustus + James the Fourth (pooled)", author: "H. Ibsen; C. Marlowe; R. Greene", register: "drama", language: "en", notes: `power-check pool of the two drama siblings (same units, a new document grid); ${PLAYS_NOTE}` };
  return { ...assemble(spec, [dramaUnits(dh), faustusUnits(), jamesUnits()], { sibling: true, pooledPlays: 3, powerCheckOf: ["asym-en-dolls-house", "asym-en-early-plays"] }).pocket, group: GROUP };
}
export const IDS = [...SPECS.map((s) => s.id), "asym-en-early-plays", "asym-en-plays-pooled"];
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) if (!onlyIds || onlyIds.includes(s.id)) out.push(bookSibling({ ...s, language: "en" }));
  if (!onlyIds || onlyIds.includes("asym-en-early-plays")) out.push(earlyPlays());
  if (!onlyIds || onlyIds.includes("asym-en-plays-pooled")) out.push(playsPooled());
  return out;
}
