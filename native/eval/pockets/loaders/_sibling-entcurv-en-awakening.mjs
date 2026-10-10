// loaders/_sibling-entcurv-en-awakening.mjs — SIBLING pocket (kind: novel + short stories, English) for the confirmation of order.entCurv: K. Chopin, The Awakening and Selected Short Stories, from the file
// misfiled in ethos 11-multi-language/gutenberg-non-en/en/ (name says Crime and Punishment; the atlas skipped it: _ml_skips.mjs ENGLISH_MISFILED). The contents list is cut (the text starts at the novel's heading).
import { GBNE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-awakening";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const file = GBNE + "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt";
  const units = bookUnits({ file, cut: { start: /\nTHE AWAKENING\n\n+I\n/ } });
  return [bookPocket({ id: ID, files: [file], title: "The Awakening and Selected Short Stories", author: "K. Chopin", register: "novel", language: "en",
    notes: "file name says Crime and Punishment (Dostoyevsky); the text is Chopin's novel followed by short stories; contents cut" }, [units])];
}
