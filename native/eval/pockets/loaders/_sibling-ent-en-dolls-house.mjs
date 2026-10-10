// loaders/_sibling-ent-en-dolls-house.mjs — SIBLING pocket (kind: drama, English translation of a prose play) for the confirmation of order.entSlope. Ibsen, A Doll's House, file misfiled in
// ethos 11-multi-language/gutenberg-non-en/en/. Speaker labels ("NORA." alone on a line) and bracketed stage directions are removed with the atlas rule stripDrama(allcaps), as for bk-faust-de.
import { bookSibling, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-dolls-house";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  return [bookSibling({ id: ID, rel: GBNE + "en/pg2542_War_and_Peace.txt", title: "A Doll's House (English translation)", author: "H. Ibsen", register: "drama", language: "en", drama: "allcaps",
    cut: { start: /\nA DOLL’S HOUSE\n/ }, notes: "file name says War and Peace; the text is Ibsen's A Doll's House (prose drama in English translation); dramatis personae cut; speaker labels and bracketed stage directions removed" })];
}
