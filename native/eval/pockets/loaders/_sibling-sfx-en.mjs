// loaders/_sibling-sfx-en.mjs — NEW English book pockets for the SIBLING REPLICATION of para.suffixCopy (underscore: ignored by run-atlas.mjs).
// Source: English books MISFILED in ethos 11-multi-language/gutenberg-non-en, which the atlas "ml" loader deliberately skipped (loaders/_ml_skips.mjs ENGLISH_MISFILED; the file names are wrong, the contents
// were identified by reading the text). They are in no atlas pocket. The same files were used by the sibling replications of other laws (fig.introRight, order.depLen, para.prefixCopy ...): the MATERIAL is shared
// with those, but the pocket ids here (sfx-en-*) are new, so the document-hash half split and the whole-block cap use sha256 of THESE ids. Left out: books that ARE atlas pockets (the file named Zarathustra is
// Pride and Prejudice; the Prince; Dorian Gray), plays (speaker labels would need format rules), a slang dictionary (a lexicon), Cary's Divine Comedy (a second translation of an atlas work) and works under
// the 20,000-token floor. Segmentation = the atlas "bk" group (helpers of loaders/_bk*.mjs): sentence = unit, ~100-sentence blocks = documents (>= 30 documents where the book allows), whole-block 300k cap.
import { readText, stripFront, stripPG, scrub, trimBack, startProse } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble } from "./_bkseg.mjs";

const D = "11-multi-language/gutenberg-non-en/";
// cls: the pre-registered prediction class (prose | children)
const B = (id, file, title, author, register, cls, o = {}) => ({ id: `sfx-en-${id}`, files: [D + file], title, author, register, cls, language: "en", ...o });
export const SPECS = [
  B("poe-works2", "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", "The Works of Edgar Allan Poe, vol II", "E. A. Poe", "novel", "prose", { notes: "file name says Werther; the text is Poe's tales vol II" }),
  B("chopin-awakening", "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", "The Awakening and Selected Short Stories", "K. Chopin", "novel", "prose", { notes: "file name says Crime and Punishment; the text is Chopin" }),
  B("hesse-siddhartha", "en/pg2500_The_Brothers_Karamazov.txt", "Siddhartha", "H. Hesse", "novel", "prose", { notes: "file name says Brothers Karamazov; the text is Siddhartha (English)" }),
  B("zola-mouret", "es/pg14200_La_Divina_Comedia__Dante_.txt", "Abbe Mouret's Transgression", "E. Zola", "novel", "prose", { notes: "file name says Divina Commedia; the text is Zola in English (Vizetelly)" }),
  B("waikna", "es/pg74987_La_Metamorfosis__Kafka_.txt", "Waikna: Adventures on the Mosquito Shore", "E. G. Squier", "reportage", "prose", { notes: "file name says La Metamorfosis; the text is a travel narrative" }),
  B("about-london", "it/pg32773_Il_Principe__Machiavelli_.txt", "About London", "J. E. Ritchie", "reportage", "prose", { notes: "file name says Il Principe; the text is a Victorian London sketch book" }),
  B("warren-forces", "fr/pg15807_Nana.txt", "Among the Forces", "H. W. Warren", "treatise", "prose", { notes: "file name says Nana; the text is Bishop Warren's 1898 book" }),
  B("aesop-stickney", "fi/pg49010_Runeberg_runoelmat__Finnish_.txt", "Aesop's Fables, a version for young readers", "J. H. Stickney", "children", "children", { notes: "file name says Runeberg (Finnish); the text is English" }),
  B("pooh", "de/pg67098_Die_Verwandlung__Kafka_.txt", "Winnie-the-Pooh", "A. A. Milne", "children", "children", { notes: "file name says Die Verwandlung (Kafka); the text is Winnie-the-Pooh (English)" }),
];
function fileUnits(spec) {
  let { text } = stripFront(readText(spec.files[0]));
  text = scrub(trimBack(stripPG(text)));
  text = startProse(text);
  return toUnits(splitSentences(scrub(text), { paraBreak: true }));
}
export const IDS = SPECS.map((s) => s.id);
export const CLASS = Object.fromEntries(SPECS.map((s) => [s.id, s.cls]));
export async function load(onlyIds = null) {
  const out = [];
  for (const s of SPECS) {
    if (onlyIds && !onlyIds.includes(s.id)) continue;
    const { pocket, v } = assemble({ ...s, notes: s.notes }, [fileUnits(s)], { files: 1, loader: "_sibling-sfx-en.mjs (bk helpers)", predictionClass: s.cls });
    pocket.group = "sib"; pocket.meta.thinAtBuild = v.thin;
    out.push(pocket);
  }
  return out;
}
