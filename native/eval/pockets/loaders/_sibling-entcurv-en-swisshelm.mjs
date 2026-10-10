// loaders/_sibling-entcurv-en-swisshelm.mjs — SIBLING pocket (kind: memoir, English) for the confirmation of order.entCurv: Jane Grey Swisshelm, "Half a Century" (1880; Project Gutenberg #12052), a file of the
// eoPriors global_south_corpus under "New Project/eochat-content-cv-demo" that no atlas pocket reads. Cut: from "CHAPTER I." to "THE END." (preface and licence left out).
import { GS, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-swisshelm";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const file = GS + "pg12052.txt";
  const units = bookUnits({ file, noStrip: true, cut: { start: /\nCHAPTER I\.\n/, end: /\nTHE END\.\n/ } });
  return [bookPocket({ id: ID, files: [file], title: "Half a Century (Swisshelm)", author: "J. G. Swisshelm", register: "memoir", language: "en",
    notes: "English memoir (1880) from the eoPriors global_south_corpus gutenberg folder; preface and licence cut" }, [units])];
}
