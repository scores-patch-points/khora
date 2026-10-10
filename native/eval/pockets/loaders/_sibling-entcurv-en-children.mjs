// loaders/_sibling-entcurv-en-children.mjs — SIBLING pocket (kind: children's books, English) for the confirmation of order.entCurv: ONE pocket of two English children's books from files misfiled in ethos
// 11-multi-language/gutenberg-non-en/ (the atlas skipped all of them: _ml_skips.mjs ENGLISH_MISFILED):
//   (a) A. A. Milne, Winnie-the-Pooh (file de/pg67098, name says Kafka, Die Verwandlung): from "CHAPTER I" to the printer's colophon;
//   (b) J. H. Stickney, Aesop's Fables, a Version for Young Readers (file fi/pg49010, name says Runeberg): from the first fable to the Appendix (which repeats the fables in shorter form: left out).
// Each alone is close to the 20,000-token floor, hence one pooled pocket (units of (a) then (b); documents are blocks of ~100 units across the pool).
import { GBNE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-children";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const fa = GBNE + "de/pg67098_Die_Verwandlung__Kafka_.txt", fb = GBNE + "fi/pg49010_Runeberg_runoelmat__Finnish_.txt";
  const a = bookUnits({ file: fa, cut: { start: /\n[ \t]+CHAPTER I\n/, end: /\n[ \t]*Printed in Canada/ } });
  const b = bookUnits({ file: fb, noStrip: true, cut: { start: /\nTHE WOLF AND THE LAMB\n/, end: /\nAPPENDIX\n/ } });
  return [bookPocket({ id: ID, files: [fa, fb], title: "Winnie-the-Pooh + Aesop's Fables for Young Readers", author: "A. A. Milne; J. H. Stickney", register: "children", language: "en",
    notes: "two English children's books pooled to clear the token floor; files misfiled in ethos gutenberg-non-en (names say Kafka and Runeberg)" }, [a, b], { pooledBooks: 2 })];
}
