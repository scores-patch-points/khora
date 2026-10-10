// loaders/_sibling-en.mjs — NEW English prose pockets (novel / narrative / treatise kind: the registers where fig.introRight is ABSENT in the atlas) for the sibling replication of fig.introRight.
// Source: the English books MISFILED in ethos 11-multi-language/gutenberg-non-en (the atlas skipped all 19: loaders/_ml_skips.mjs), minus (a) books whose text is already an atlas pocket (the file named Zarathustra is Pride and Prejudice = bk-pride-prej,
// the file named for Machiavelli's Prince in nl/ = bk-prince, it/pg174 = bk-dorian-gray; found by reading the text), (b) plays (speaker labels would have to be stripped by format rules), (c) works under the 20,000-token floor (reported as thin, never scored), (d) fr/pg42108, which is not Mayhew but Hotten's Slang Dictionary (a lexicon, a register with its own atlas row), so it is not an "absent-kind" sibling.
// Same segmentation as the bk group: loaders/_bk*.mjs helpers (sentence = unit, ~100-sentence blocks = documents, 300k cap by whole blocks). Pocket group is "sib".
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack, startProse } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble } from "./_bkseg.mjs";

const D = "11-multi-language/gutenberg-non-en/";
const B = (id, file, title, author, register, o = {}) => ({ id: `sib-en-${id}`, files: [D + file], title, author, register, language: "en", ...o });
export const SPECS = [
  B("poe-works2", "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", "The Works of Edgar Allan Poe, vol II (Raven Edition)", "E. A. Poe", "novel", { notes: "file name says Werther (Goethe); the text is Poe's tales, volume II" }),
  B("chopin-awakening", "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", "The Awakening and Selected Short Stories", "K. Chopin", "novel", { notes: "file name says Crime and Punishment; the text is Chopin" }),
  B("hesse-siddhartha", "en/pg2500_The_Brothers_Karamazov.txt", "Siddhartha", "H. Hesse", "novel", { notes: "file name says Brothers Karamazov; the text is Hesse's Siddhartha (English translation)" }),
  B("zola-mouret", "es/pg14200_La_Divina_Comedia__Dante_.txt", "Abbe Mouret's Transgression", "E. Zola", "novel", { notes: "file name says Divina Commedia; the text is Zola (English translation, Vizetelly)" }),
  B("waikna", "es/pg74987_La_Metamorfosis__Kafka_.txt", "Waikna: Adventures on the Mosquito Shore", "E. G. Squier", "reportage", { notes: "file name says La Metamorfosis; the text is a travel narrative" }),
  B("aesop-stickney", "fi/pg49010_Runeberg_runoelmat__Finnish_.txt", "Aesop's Fables, a version for young readers", "J. H. Stickney", "children", { notes: "file name says Runeberg (Finnish); the text is English" }),
  B("evolution-plain", "fi/pg76749_Sota_satulavy___Finnish_.txt", "Evolution Made Plain", "J. Mason", "treatise", { notes: "file name says Finnish; the text is English (expected under the 20k floor)" }),
  B("warren-forces", "fr/pg15807_Nana.txt", "Among the Forces", "H. W. Warren", "treatise", { notes: "file name says Nana; the text is Bishop Warren's 1898 book on natural forces and religion" }),
  B("about-london", "it/pg32773_Il_Principe__Machiavelli_.txt", "About London", "J. E. Ritchie", "reportage", { notes: "file name says Il Principe; the text is a Victorian London sketch book" }),
  B("kafka-metamorphosis", "la/pg5200_Metamorphoses__Ovid__Latin_.txt", "The Metamorphosis", "F. Kafka", "novel", { notes: "file name says Ovid (Latin); the text is Kafka's Metamorphosis in English (expected near the 20k floor)", startProse: false }),
  B("cary-dante", "la/pg8800_De_Rerum_Natura__Lucretius_.txt", "The Divine Comedy (Cary)", "Dante Alighieri", "poetry", { paraBreak: false, notes: "file name says Lucretius; the text is H. F. Cary's blank-verse translation; the atlas holds Longfellow's (bk-dante), a different translation" }),
];

function fileUnits(spec) {
  let { text } = stripFront(readText(spec.files[0]));
  text = scrub(trimBack(stripPG(text)));
  if (spec.startProse !== false) text = startProse(text);
  return toUnits(splitSentences(scrub(text), { paraBreak: spec.paraBreak !== false }));
}
export const IDS = SPECS.map((s) => s.id);
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const units = fileUnits(s);
    const { pocket, v } = assemble({ ...s, notes: s.notes }, [units], { files: 1, loader: "_sibling-en.mjs (bk helpers)" });
    pocket.group = "sib"; pocket.meta.thinAtBuild = v.thin;
    out.push(pocket);
  }
  return out;
}
