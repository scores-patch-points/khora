// loaders/_sibling-entcurv-en-dolls-lysistrata.mjs — SIBLING pocket (kind: drama, English translations of two plays) for the confirmation of order.entCurv: ONE pocket of two plays from files misfiled in
// ethos 11-multi-language/gutenberg-non-en/ (the atlas skipped both: _ml_skips.mjs ENGLISH_MISFILED):
//   (a) Ibsen, A Doll's House (file en/pg2542, name says War and Peace): dramatis personae cut, speaker labels ("NORA." alone on a line) and bracketed stage directions removed with the atlas rule stripDrama(allcaps);
//   (b) Aristophanes, Lysistrata, translated by Jack Lindsay, with Norman Lindsay's illustrations (file fr/pg7700, name says Tocqueville): foreword cut (the play starts at the list of persons), speaker labels
//       (an upper-case name alone on a line, no full stop) and italic stage directions (_..._) removed here.
// Each play alone is thin or close to the 20,000-token floor, hence one pooled pocket (units of (a) then (b); documents are blocks of ~100 units across the pool).
import { GBNE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-dolls-lysistrata";
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const fa = GBNE + "en/pg2542_War_and_Peace.txt", fb = GBNE + "fr/pg7700_De_la_d_mocratie_en_Am_rique__Tocqueville_.txt";
  const a = bookUnits({ file: fa, cut: { start: /\nA DOLL’S HOUSE\n/ }, drama: "allcaps" });
  const b = bookUnits({ file: fb, noStrip: true, cut: { start: /\n[ \t]*\*[ \t]+\*[ \t]+\*[ \t]+\*[ \t]+\*[ \t]*\n+[ \t]*LYSISTRATA\n/ },
    pre: (t) => t.replace(/_[^_]{0,400}_/g, " ").replace(/^[ \t]*\p{Lu}[\p{Lu} ’'.\-]{1,40}[ \t]*$/gmu, "") });   // italic directions first, then label lines (also those left bare by a removed italic)
  return [bookPocket({ id: ID, files: [fa, fb], title: "A Doll's House + Lysistrata (English translations)", author: "H. Ibsen; Aristophanes / J. Lindsay", register: "drama", language: "en",
    notes: "two English-language plays pooled; both files misfiled in ethos gutenberg-non-en (names say Tolstoy and Tocqueville)" }, [a, b], { pooledPlays: 2 })];
}
