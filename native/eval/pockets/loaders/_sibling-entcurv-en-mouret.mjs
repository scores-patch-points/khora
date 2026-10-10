// loaders/_sibling-entcurv-en-mouret.mjs — SIBLING pocket (kind: novel, English translation) for the confirmation of order.entCurv: Zola, "Abbe Mouret's Transgression" (Vizetelly translation), from the
// file misfiled in ethos 11-multi-language/gutenberg-non-en/es/ (name says La Divina Comedia; the atlas skipped it: _ml_skips.mjs ENGLISH_MISFILED). Translator's introduction cut (novel starts at "BOOK I").
import { GBNE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-mouret";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const file = GBNE + "es/pg14200_La_Divina_Comedia__Dante_.txt";
  const units = bookUnits({ file, cut: { start: /\nBOOK I\n/, end: /\n[ \t]*THE END[ \t]*\s*$/ } });
  return [bookPocket({ id: ID, files: [file], title: "Abbe Mouret's Transgression (English translation)", author: "E. Zola / E. A. Vizetelly", register: "novel", language: "en",
    notes: "file name says Divina Comedia (Dante); the text is Zola's novel in English translation; Vizetelly's introduction cut" }, [units])];
}
