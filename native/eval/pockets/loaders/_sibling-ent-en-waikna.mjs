// loaders/_sibling-ent-en-waikna.mjs — SIBLING pocket (kind: first-person travel narrative) for the confirmation of order.entSlope. Bard (Squier), Waikna; or, Adventures on the Mosquito Shore (1855), file
// misfiled in ethos 11-multi-language/gutenberg-non-en/es/. Body from "Chapter I." to the FOOTNOTES (the appendix of vocabularies and the contents/illustration lists are cut).
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-waikna";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "es/pg74987_La_Metamorfosis__Kafka_.txt", title: "Waikna; or, Adventures on the Mosquito Shore", author: "S. A. Bard (E. G. Squier)", register: "memoir", language: "en",
    cut: { start: /\nChapter I\.\n/, end: /\nFOOTNOTES\n/ }, notes: "file name says La Metamorfosis (Kafka); the text is Waikna (1855 travel narrative)" })];
}
