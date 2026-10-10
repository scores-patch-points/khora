// loaders/_sibling-para-prose.mjs — NEW English prose pockets for the SIBLING REPLICATION of para.prefixCopy (underscore: ignored by run-atlas.mjs).
// Source: English books MISFILED in ethos 11-multi-language/gutenberg-non-en, which the atlas "ml" loader deliberately skipped (loaders/_ml_skips.mjs ENGLISH_MISFILED; the file names are wrong, the contents were
// identified by reading the text). Each id is a NEW pocket id "sp-en-<name>" (sp = sibling of para.prefixCopy): the halves and the 300k cap therefore use sha256 of this id, not of any earlier sibling id.
// Not read by any atlas pocket. Left out: books whose text IS an atlas pocket (Pride and Prejudice, The Prince, Dorian Gray), plays (speaker labels would need format rules), the slang dictionary (a lexicon),
// Cary's Divine Comedy (the same work as atlas bk-dante, a second translation) and works under the 20,000-token floor (Evolution Made Plain): thin pockets are returned flagged, never scored.
// Same segmentation as the atlas "bk" group (helpers of loaders/_bk*.mjs): sentence = unit, ~100-sentence blocks = documents (>= 30 documents), whole-block 300k cap. The pocket group is "sib".
import { readText, stripFront, stripPG, scrub, trimBack, startProse } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble } from "./_bkseg.mjs";

const D = "11-multi-language/gutenberg-non-en/";
// kind: the register recorded in the pocket; cls: the pre-registered prediction class (prose | children)
const B = (id, file, title, author, register, cls, o = {}) => ({ id: `sp-en-${id}`, files: [D + file], title, author, register, cls, language: "en", ...o });
export const SPECS = [
  B("poe-works2", "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", "The Works of Edgar Allan Poe, vol II", "E. A. Poe", "novel", "prose", { notes: "file name says Werther; the text is Poe's tales vol II" }),
  B("chopin-awakening", "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", "The Awakening and Selected Short Stories", "K. Chopin", "novel", "prose", { notes: "file name says Crime and Punishment; the text is Chopin" }),
  B("hesse-siddhartha", "en/pg2500_The_Brothers_Karamazov.txt", "Siddhartha", "H. Hesse", "novel", "prose", { notes: "file name says Brothers Karamazov; the text is Siddhartha (English)" }),
  B("zola-mouret", "es/pg14200_La_Divina_Comedia__Dante_.txt", "Abbe Mouret's Transgression", "E. Zola", "novel", "prose", { notes: "file name says Divina Commedia; the text is Zola in English (Vizetelly)" }),
  B("waikna", "es/pg74987_La_Metamorfosis__Kafka_.txt", "Waikna: Adventures on the Mosquito Shore", "E. G. Squier", "reportage", "prose", { notes: "file name says La Metamorfosis; the text is a travel narrative" }),
  B("about-london", "it/pg32773_Il_Principe__Machiavelli_.txt", "About London", "J. E. Ritchie", "reportage", "prose", { notes: "file name says Il Principe; the text is a Victorian London sketch book" }),
  B("warren-forces", "fr/pg15807_Nana.txt", "Among the Forces", "H. W. Warren", "treatise", "prose", { notes: "file name says Nana; the text is Bishop Warren's 1898 book" }),
  B("kafka-metamorphosis", "la/pg5200_Metamorphoses__Ovid__Latin_.txt", "The Metamorphosis", "F. Kafka", "novel", "prose", { startProse: false, notes: "file name says Ovid (Latin); the text is Kafka in English (expected near the 20k floor)" }),
  B("aesop-stickney", "fi/pg49010_Runeberg_runoelmat__Finnish_.txt", "Aesop's Fables, a version for young readers", "J. H. Stickney", "children", "children", { notes: "file name says Runeberg (Finnish); the text is English" }),
  B("pooh", "de/pg67098_Die_Verwandlung__Kafka_.txt", "Winnie-the-Pooh", "A. A. Milne", "children", "children", { notes: "file name says Die Verwandlung (Kafka); the text is Winnie-the-Pooh (English)" }),
  B("evolution-plain", "fi/pg76749_Sota_satulavy___Finnish_.txt", "Evolution Made Plain", "J. Mason", "treatise", "prose", { notes: "file name says Finnish; the text is English (expected under the 20k floor)" }),
];
function fileUnits(spec) {
  let { text } = stripFront(readText(spec.files[0]));
  text = scrub(trimBack(stripPG(text)));
  if (spec.startProse !== false) text = startProse(text);
  return toUnits(splitSentences(scrub(text), { paraBreak: spec.paraBreak !== false }));
}
export const IDS = SPECS.map((s) => s.id);
export const CLASS = Object.fromEntries(SPECS.map((s) => [s.id, s.cls]));
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const units = fileUnits(s);
    const { pocket, v } = assemble({ ...s, notes: s.notes }, [units], { files: 1, loader: "_sibling-para-prose.mjs (bk helpers)", predictionClass: s.cls });
    pocket.group = "sib"; pocket.meta.thinAtBuild = v.thin;
    out.push(pocket);
  }
  return out;
}
