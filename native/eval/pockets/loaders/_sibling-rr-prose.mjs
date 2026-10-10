// loaders/_sibling-rr-prose.mjs — SIBLING pockets (English prose and plays) for the replication of comp.rigidR (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Built with the atlas "bk" pipeline (helpers imported UNCHANGED from _bkcore.mjs / _bkseg.mjs): front matter, PG boilerplate, markup scrub, start/end cuts, optional speaker-label removal (drama),
// sentence units (blank lines also end a unit), documents = blocks of ~100 units, 300k cap by whole documents. Pocket group is "sib" (never part of an atlas count).
// SOURCE: ethos 11-multi-language/gutenberg-non-en/ files that are MISFILED English books (the atlas ml loader skipped all 19, see _ml_skips.mjs ENGLISH_MISFILED; the atlas bk loader reads none of these
//   files; one of the 19 (Dorian Gray, it/pg174) DOES exist as an atlas pocket bk-dorian-gray and is NOT used here) plus Marlowe's Faustus (ethos 15-western-canon) and the English Elizabethan play in sv/pg43668.
//   The cut rules were read off the raw file heads/tails by an earlier sibling loader (_sibling-asym-prose.mjs) and are COPIED here, not edited; this file is self-contained so that nothing it depends on can be
//   changed by another agent (only atlas helper modules are imported).
//   rr-en-about-london   reportage  J. E. Ritchie, About London (1860)
//   rr-en-among-forces   essay      H. W. Warren, Among the Forces (1898)
//   rr-en-mouret         novel      Zola, Abbe Mouret's Transgression (Vizetelly)
//   rr-en-waikna         memoir     Squier ("Bard"), Waikna (1855 travel narrative)
//   rr-en-poe2           novel      Poe, Works vol II (tales)
//   rr-en-dolls-house    drama      Ibsen, A Doll's House (English), speaker labels removed
//   rr-en-early-plays    drama      Marlowe, Doctor Faustus + Greene, James the Fourth, pooled (each alone is under the floor)
import { readText, stripFront, stripPG, scrub, cut, trimBack } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";

const GBNE = "11-multi-language/gutenberg-non-en/", GROUP = "sib";
const FAUSTUS = "15-western-canon/marlowe/doctor-faustus-1604-quarto.txt", JAMES = GBNE + "sv/pg43668_F_ders_brott__Swedish_.txt";
export const SPECS = [
  { id: "rr-en-about-london", rel: GBNE + "it/pg32773_Il_Principe__Machiavelli_.txt", title: "About London (J. Ewing Ritchie, 1860)", author: "J. E. Ritchie", register: "reportage",
    cut: { start: /\nCHAPTER I\.\nNEWSPAPER PEOPLE\./, end: /\n\s*ADVERTISEMENTS\.\s*\n/ }, notes: "file name says Il Principe; Victorian London sketches; contents and publisher advertisements cut" },
  { id: "rr-en-among-forces", rel: GBNE + "fr/pg15807_Nana.txt", title: "Among the Forces (H. W. Warren, 1898)", author: "H. W. Warren", register: "essay",
    cut: { start: /\nAMONG THE FORCES\n\n\nWHY WRITTEN/, end: /\n\[1\]The action that drives off the material/ }, notes: "file name says Nana; popular-science essays with a religious frame; contents, illustration list and footnotes cut" },
  { id: "rr-en-dolls-house", rel: GBNE + "en/pg2542_War_and_Peace.txt", title: "A Doll's House (English translation)", author: "H. Ibsen", register: "drama", drama: "allcaps",
    cut: { start: /\nA DOLL’S HOUSE\n/ }, notes: "file name says War and Peace; prose drama; dramatis personae cut; speaker labels and bracketed stage directions removed (atlas rule stripDrama allcaps)" },
  { id: "rr-en-mouret", rel: GBNE + "es/pg14200_La_Divina_Comedia__Dante_.txt", title: "Abbe Mouret's Transgression (English translation)", author: "E. Zola", register: "novel",
    cut: { start: /\nBOOK I\n/, end: /\n[ \t]*THE END[ \t]*\s*$/ }, notes: "file name says Divina Comedia; Vizetelly's introduction cut" },
  { id: "rr-en-poe2", rel: GBNE + "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", title: "The Works of Edgar Allan Poe, vol II: tales", author: "E. A. Poe", register: "novel",
    cut: { start: /\nTHE PURLOINED LETTER\n/, end: /\nNOTES TO THE SECOND VOLUME\n/ }, notes: "file name says Werther; tales; contents list and endnotes cut" },
  { id: "rr-en-waikna", rel: GBNE + "es/pg74987_La_Metamorfosis__Kafka_.txt", title: "Waikna; or, Adventures on the Mosquito Shore (1855)", author: "S. A. Bard (E. G. Squier)", register: "memoir",
    cut: { start: /\nChapter I\.\n/, end: /\nFOOTNOTES\n/ }, notes: "file name says La Metamorfosis; first-person travel narrative" },
];
/** one English book / play file -> Pocket (same code path as the atlas bk pipeline) */
function bookSibling(spec) {
  const { text: t0 } = stripFront(readText(spec.rel));
  let text = scrub(trimBack(stripPG(t0)));
  text = cut(text, spec.cut || {});
  if (spec.drama) text = stripDrama(text, spec.drama, !!spec.stageParen);
  text = scrub(text, spec.extra || []);
  const units = toUnits(splitSentences(text, { paraBreak: spec.paraBreak !== false }));
  const { pocket } = assemble({ ...spec, language: "en", files: [spec.rel], notes: spec.notes || "" }, [units], { sibling: true, sourceRel: spec.rel });
  return { ...pocket, group: GROUP };
}
const faustusUnits = () => { let t = stripFront(readText(FAUSTUS)).text; t = cut(scrub(t), { start: /\n[ \t]*Enter CHORUS\./, end: /\nFOOTNOTES:\n/ }); return toUnits(splitSentences(scrub(stripDrama(t, "marlowe", false)), { paraBreak: true })); };
const jamesUnits = () => {
  let t = scrub(trimBack(stripPG(stripFront(readText(JAMES)).text))); t = cut(t, { start: /\nMusicke playing within\./, end: /\nFINIS\.\s*$/ });
  t = t.replace(/^_[^_\n]{1,30}\._[ \t]*/gm, "").replace(/_(?:Enter|Exit|Exeunt|Manet|Musicke|Sound|Dance|Alarum|Drum|Trumpets)[^_]{0,500}_/g, " ");
  return toUnits(splitSentences(scrub(t), { paraBreak: true }));
};
function earlyPlays() {
  const spec = { id: "rr-en-early-plays", files: [FAUSTUS, JAMES], title: "Doctor Faustus (1604) + James the Fourth (1598)", author: "C. Marlowe; R. Greene", register: "drama", language: "en",
    notes: "two Elizabethan plays pooled to clear the token floor; speaker labels, stage directions and editorial matter removed" };
  return { ...assemble(spec, [faustusUnits(), jamesUnits()], { sibling: true, pooledPlays: 2 }).pocket, group: GROUP };
}
export const IDS = [...SPECS.map((s) => s.id), "rr-en-early-plays"];
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) if (!onlyIds || onlyIds.includes(s.id)) out.push(bookSibling(s));
  if (!onlyIds || onlyIds.includes("rr-en-early-plays")) out.push(earlyPlays());
  return out;
}
