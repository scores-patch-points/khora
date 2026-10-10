// loaders/_sibling-fcov-prose.mjs — NEW prose / drama pockets for the SIBLING REPLICATION of para.formulaCov (underscore: ignored by run-atlas.mjs). New ids "sf-*" (sf = sibling of formulaCov): the halves and the 300k whole-block cap hash
// these ids, so they differ from the same texts under the para.prefixCopy sibling ids (sp-en-*) and the order.entCurv sibling id (ec-en-shakespeare).
// Material, none of it read by any atlas pocket:
//   sf-en-poe2, sf-en-mouret, sf-en-waikna, sf-en-chopin   English books MISFILED in ethos 11-multi-language/gutenberg-non-en (the atlas ml loader skipped them: _ml_skips.mjs ENGLISH_MISFILED; the file names are wrong, the contents were identified by reading
//                                                          the text): Poe's tales vol II, Zola's Abbe Mouret's Transgression (English), Squier's Waikna (travel), Chopin's The Awakening. (The other misfiled English files are atlas texts (Pride and Prejudice, The Prince, Dorian Gray),
//                                                          a slang dictionary, plays, or sit under the 20k-token floor.) The same texts also stand behind the para.prefixCopy siblings sp-en-* of another agent; no result of those was read here.
//   sf-en-shakespeare                                      THIRTY-FIVE of Shakespeare's plays from the Project Gutenberg Complete Works (#100) in /Users/mlacy/Documents/3.0/eochat/vendor/live_priors (no atlas pocket reads it; the atlas drama pockets read Henry IV
//                                                          Part 1 only). Henry IV Part 1 is left out. Builder = the order.entCurv sibling builder (plays located by heading, speaker labels and stage directions removed with the atlas rule stripDrama(allcaps), sentences = units, ~100-sentence blocks
//                                                          = documents, 300k cap by whole blocks): imported unchanged from _sibling-entcurv-en-shakespeare.mjs / _sibling-entcurv-common.mjs, only the pocket id is new.
// Same segmentation as the atlas "bk" group (helpers of loaders/_bk*.mjs): sentence = unit, ~100-sentence blocks = documents (>= 30 documents), whole-block 300k cap. Pocket group "sib".
import { readText, stripFront, stripPG, scrub, trimBack, startProse } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { SHAKE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
import { playsText } from "./_sibling-entcurv-en-shakespeare.mjs";

const D = "11-multi-language/gutenberg-non-en/";
const B = (id, file, title, author, register, notes) => ({ id: `sf-en-${id}`, files: [D + file], title, author, register, language: "en", notes });
export const SPECS = [
  B("poe2", "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", "The Works of Edgar Allan Poe, vol II", "E. A. Poe", "novel", "file name says Werther; the text is Poe's tales vol II"),
  B("mouret", "es/pg14200_La_Divina_Comedia__Dante_.txt", "Abbe Mouret's Transgression", "E. Zola", "novel", "file name says Divina Commedia; the text is Zola in English (Vizetelly)"),
  B("waikna", "es/pg74987_La_Metamorfosis__Kafka_.txt", "Waikna: Adventures on the Mosquito Shore", "E. G. Squier", "reportage", "file name says La Metamorfosis; the text is a travel narrative"),
  B("chopin", "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", "The Awakening and Selected Short Stories", "K. Chopin", "novel", "file name says Crime and Punishment; the text is Chopin"),
];
function fileUnits(spec) {
  let { text } = stripFront(readText(spec.files[0]));
  text = scrub(trimBack(stripPG(text)));
  text = startProse(text);
  return toUnits(splitSentences(scrub(text), { paraBreak: true }));
}
export const SHAKE_ID = "sf-en-shakespeare";
export const IDS = [...SPECS.map((s) => s.id), SHAKE_ID];
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const { pocket, v } = assemble({ ...s }, [fileUnits(s)], { files: 1, loader: "_sibling-fcov-prose.mjs (bk helpers)" });
    pocket.group = "sib"; pocket.meta.thinAtBuild = v.thin; out.push(pocket);
  }
  if (!onlyIds || onlyIds.includes(SHAKE_ID)) {
    const units = bookUnits({ file: SHAKE, noStrip: true, pre: playsText, drama: "allcaps",
      extra: [/(^|\n\n)[ \t]*(?:Enter|Exit|Exeunt|Re-enter|ACT|SCENE|Scene|Act|Flourish|Alarum|Sennet)\b[^\n]*(?:\n(?!\n)[^\n]*)*/g] });
    out.push(bookPocket({ id: SHAKE_ID, files: [SHAKE], title: "Shakespeare, 35 plays (Henry IV Part 1 left out)", author: "W. Shakespeare", register: "drama", language: "en",
      notes: "Complete Works file of the eochat vendor copy of the ethos priors; plays only; speaker labels and stage directions removed (builder of the order.entCurv sibling, new id)" }, [units], { plays: 35 }));
  }
  return out;
}
