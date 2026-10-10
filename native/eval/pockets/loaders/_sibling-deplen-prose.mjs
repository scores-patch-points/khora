// loaders/_sibling-deplen-prose.mjs — SIBLING pockets for the replication of order.depLen: prose books that no atlas pocket uses.
// Underscore prefix: run-atlas.mjs ignores this file. Contract: export async function load(onlyIds = null) -> Pocket[] (whole-document cap, same tokeniser and
// sentence splitter as loaders/books.mjs, imported from the same helper modules _bkcore.mjs and _bkseg.mjs: the atlas "bk" pipeline, unchanged).
// SOURCE: /Users/mlacy/Documents/3.0/ethos/11-multi-language/gutenberg-non-en/. The atlas ml loader deliberately did NOT load these files (loaders/_ml_skips.mjs ENGLISH_MISFILED:
//   the directory is labelled non-English, the file names are wrong, the content is English). Contents were READ (head of every file) before use:
//   de/pg2148  -> Poe, Works vol II (tales)       en/pg160  -> Chopin, The Awakening and Selected Short Stories   en/pg2500 -> Hesse, Siddhartha (English translation)
//   es/pg14200 -> Zola, Abbe Mouret's Transgression (English translation by Vizetelly)    es/pg74987 -> Squier (as "Bard"), Waikna, 1855 travel narrative
//   it/pg32773 -> J. Ewing Ritchie, About London (1860)                                   la/pg5200 -> Kafka, Metamorphosis (English translation)
// NOT used (checked): de/pg42671 is Pride and Prejudice (another edition of bk-pride-prej), it/pg174 is Dorian Gray (= bk-dorian-gray), nl/pg1232 is The Prince (= bk-prince),
//   fr/pg42108 is a slang dictionary (a lexicon, not prose), la/pg8800 is Cary's Dante (poetry; a second translation of bk-dante's work).
import fs from "node:fs";
import path from "node:path";
import { sha256 } from "../lib/pocket.mjs";
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack } from "./_bkcore.mjs";
import { splitSentences, toUnits, assemble } from "./_bkseg.mjs";

const D = "11-multi-language/gutenberg-non-en/";
const find = (dir, prefix) => { const f = fs.readdirSync(path.join(ETHOS, D, dir)).filter((x) => x.startsWith(prefix) && x.endsWith(".txt")).sort(); if (f.length !== 1) throw new Error(`sibling source ${dir}/${prefix}*: ${f.length} matches`); return `${D}${dir}/${f[0]}`; };
export const SPECS = [
  { id: "sib-bk-zola", dir: "es", pre: "pg14200", register: "novel", title: "Abbe Mouret's Transgression (Zola, Vizetelly translation)", author: "E. Zola", kind: "prose-fiction", cut: { start: /\nBOOK I\n/, end: /\n\s*THE END\s*\n/ }, notes: "English translation of a French novel; Vizetelly's introduction (before BOOK I) cut" },
  { id: "sib-bk-chopin", dir: "en", pre: "pg160", register: "novel", title: "The Awakening and Selected Short Stories", author: "K. Chopin", kind: "prose-fiction", cut: { start: /\nTHE AWAKENING\n\n\nI\n/ }, notes: "novel plus nine short stories; contents list cut" },
  { id: "sib-bk-poe", dir: "de", pre: "pg2148", register: "tales", title: "The Works of Edgar Allan Poe, vol II (tales)", author: "E. A. Poe", kind: "prose-fiction", cut: { start: /\nTHE PURLOINED LETTER\n\n\nNil/, end: /\nNOTES TO THE SECOND VOLUME\n/ }, notes: "short tales; contents and end notes cut; the tales are indented in the source (whitespace is collapsed by the splitter)" },
  { id: "sib-bk-siddhartha", dir: "en", pre: "pg2500", register: "novel", title: "Siddhartha (Hesse, English translation)", author: "H. Hesse", kind: "prose-fiction", cut: { start: /\nFIRST PART\n/ }, notes: "English translation of a German novella; SMALL (about 40k tokens): low-power sibling" },
  { id: "sib-bk-kafka", dir: "la", pre: "pg5200", register: "novel", title: "The Metamorphosis (Kafka, English translation)", author: "F. Kafka", kind: "prose-fiction", cut: {}, notes: "English translation of a German novella; SMALL: low-power sibling (may fall under the thin floor)" },
  { id: "sib-bk-about-london", dir: "it", pre: "pg32773", register: "reportage", title: "About London (J. Ewing Ritchie, 1860)", author: "J. E. Ritchie", kind: "reportage", cut: { start: /\nCHAPTER I\.\nNEWSPAPER PEOPLE\./, end: /\n\s*ADVERTISEMENTS\.\s*\n/ }, notes: "Victorian reportage on London life; contents and the publisher's advertisements cut" },
  { id: "sib-bk-waikna", dir: "es", pre: "pg74987", register: "memoir", title: "Waikna; or, Adventures on the Mosquito Shore (1855)", author: "S. A. Bard (E. G. Squier)", kind: "memoir", cut: { start: /\nChapter I\.\n/, end: /\nAPPENDIX\.\n/ }, notes: "first-person travel narrative (partly fictionalised); contents and the appendix (extracts and vocabularies) cut" },
];
export const ids = () => SPECS.map((s) => s.id);

function build(spec) {
  const rel = find(spec.dir, spec.pre);
  let { text } = stripFront(readText(rel));
  text = stripPG(text);
  text = scrub(trimBack(text));
  text = cut(text, spec.cut);
  text = scrub(text);
  const units = toUnits(splitSentences(text, { paraBreak: true }));
  const s = { id: spec.id, register: spec.register, language: "en", title: spec.title, author: spec.author, files: [rel], notes: spec.notes, tokenisation: undefined };
  const { pocket } = assemble(s, [units], { siblingOf: "order.depLen", siblingKind: spec.kind, fileSha256: sha256(fs.readFileSync(path.join(ETHOS, rel))).slice(0, 16) });
  return pocket;
}
export async function load(onlyIds = null) { return SPECS.filter((s) => !onlyIds || onlyIds.includes(s.id)).map(build); }
