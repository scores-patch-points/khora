// loaders/_sibling-entcurv-en-yonge.mjs — SIBLING pocket (kind: novel, English) for the confirmation of order.entCurv: Charlotte M. Yonge, "Love and Life: An Old Story in Eighteenth Century Costume"
// (Project Gutenberg #5700), a file of the eoPriors global_south_corpus under "New Project/eochat-content-cv-demo" that no atlas pocket reads (the atlas reads only ethos trees and /private/tmp/claude-501 data).
// Cut: from the line "LOVE AND LIFE." (after the preface) to the licence ("Updated editions will replace ..."). Epigraph verses of the chapters stay in the text, as in the atlas novels.
import { GS, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-yonge";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const file = GS + "pg5700.txt";
  const units = bookUnits({ file, noStrip: true, cut: { start: /\nLOVE AND LIFE\.\n/, end: /\n[ \t]*Updated editions will replace/ } });
  return [bookPocket({ id: ID, files: [file], title: "Love and Life (Yonge)", author: "C. M. Yonge", register: "novel", language: "en",
    notes: "English novel (1860s) from the eoPriors global_south_corpus gutenberg folder; preface and licence cut" }, [units])];
}
