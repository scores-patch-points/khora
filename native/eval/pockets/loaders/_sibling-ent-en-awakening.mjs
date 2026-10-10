// loaders/_sibling-ent-en-awakening.mjs — SIBLING pocket (kind: novel + short stories) for the confirmation of order.entSlope. K. Chopin, The Awakening and Selected Short Stories, file misfiled in
// ethos 11-multi-language/gutenberg-non-en/en/. Contents list cut (starts at the heading of the novel).
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-awakening";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt", title: "The Awakening and Selected Short Stories", author: "K. Chopin", register: "novel", language: "en",
    cut: { start: /\nTHE AWAKENING\n\n+I\n/ }, notes: "file name says Crime and Punishment (Dostoyevsky); the text is Chopin" })];
}
