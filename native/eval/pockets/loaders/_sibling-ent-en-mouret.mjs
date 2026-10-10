// loaders/_sibling-ent-en-mouret.mjs — SIBLING pocket (kind: novel, English translation) for the confirmation of order.entSlope. Zola, Abbe Mouret's Transgression (Vizetelly translation), from the file
// misfiled in ethos 11-multi-language/gutenberg-non-en/es/ (the atlas skipped it: _ml_skips.mjs). The translator's introduction is cut (the novel starts at "BOOK I").
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-mouret";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "es/pg14200_La_Divina_Comedia__Dante_.txt", title: "Abbe Mouret's Transgression (English translation)", author: "E. Zola / E. A. Vizetelly", register: "novel", language: "en",
    cut: { start: /\nBOOK I\n/, end: /\n[ \t]*THE END[ \t]*\s*$/ }, notes: "file name says Divina Comedia (Dante); the text is Zola's novel in English translation; Vizetelly's introduction cut" })];
}
