// loaders/_sibling-ent-en-siddhartha.mjs — SIBLING pocket (kind: novella in English translation) for the confirmation of order.entSlope. H. Hesse, Siddhartha, file misfiled in
// ethos 11-multi-language/gutenberg-non-en/en/. Contents list cut. Small (about 35k tokens): lower power than the other prose siblings.
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-siddhartha";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "en/pg2500_The_Brothers_Karamazov.txt", title: "Siddhartha: An Indian Tale (English translation)", author: "H. Hesse", register: "novel", language: "en",
    cut: { start: /\nTHE SON OF THE BRAHMAN\n/ }, notes: "file name says The Brothers Karamazov; the text is Hesse's Siddhartha" })];
}
