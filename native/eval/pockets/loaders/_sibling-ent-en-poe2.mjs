// loaders/_sibling-ent-en-poe2.mjs — SIBLING pocket (kind: prose tales) for the confirmation of order.entSlope. The Works of E. A. Poe, Raven Edition vol II (tales), file misfiled in
// ethos 11-multi-language/gutenberg-non-en/de/. The endnotes ("NOTES TO THE SECOND VOLUME") are cut.
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-poe2";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", title: "The Works of Edgar Allan Poe, vol II (Raven Edition): tales", author: "E. A. Poe", register: "novel", language: "en",
    cut: { start: /\nTHE PURLOINED LETTER\n/, end: /\nNOTES TO THE SECOND VOLUME\n/ }, notes: "file name says Werther (Goethe); the text is Poe's tales vol II; contents list and endnotes cut" })];
}
