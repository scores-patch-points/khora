// loaders/_sibling-oasym-prose.mjs — SIBLING prose pockets for the replication of order.asym (underscore: ignored by run-atlas.mjs). NEW FILE; nothing else is edited.
// Every pocket goes through the atlas "bk" pipeline (helpers imported unchanged): front matter, PG boilerplate, markup scrub, optional cuts, sentence units, ~100-unit blocks as documents, 300k cap by whole blocks.
// SOURCES (the cut/format rules were read off the raw file heads and tails before any statistic of any sibling was computed):
//   oasym-en-aesop       children   J. H. Stickney, Aesop's Fables, a version for young readers (misfiled: ethos 11-multi-language/gutenberg-non-en/fi/pg49010, the atlas ml loader skipped it as English)
//   oasym-en-cary-dante  poetry     H. F. Cary's blank-verse Divine Comedy (misfiled: .../la/pg8800); the atlas holds Longfellow's Dante (bk-dante), a different translation and a different file
//   oasym-en-siddhartha  novel      H. Hesse, Siddhartha (English translation; misfiled: .../en/pg2500)
//   oasym-en-mayhew-held reportage  HELD-OUT BLOCKS of bk-mayhew1 (London Labour and the London Poor, vol 1): the atlas cap kept ~300k of its ~503k tokens; the blocks it did not keep are this pocket
//   oasym-en-lesmis-held, oasym-es-quixote-held, oasym-en-wpa-ar-held  HELD-OUT BLOCKS of the capped atlas pockets bk-lesmis (English translation of a French novel), bk-quixote-es (Spanish novel), bk-wpa-ar (English dialect transcriptions)
//   oasym-en-cryptic-held wordplay  HELD-OUT clues of bk-cryptic (Guardian cryptic crossword clues; atlas kept ~300k of ~943k tokens); the remaining blocks capped at 300k under this id
import { bookNew, heldOutOf, GBNE } from "./_sibling-oasym-common.mjs";

export const BOOKS = [
  { id: "oasym-en-aesop", rel: GBNE + "fi/pg49010_Runeberg_runoelmat__Finnish_.txt", title: "Aesop's Fables, a version for young readers", author: "J. H. Stickney", register: "children", language: "en",
    cut: { start: /\nTHE WOLF AND THE LAMB\n/, end: /\nAPPENDIX\n/ }, startProse: false,
    notes: "file name says Runeberg (Finnish); the text is English fables for children; cut from the first fable to the APPENDIX (preface, contents, introduction, the appendix's shorter duplicates and the publisher's announcements removed)" },
  { id: "oasym-en-cary-dante", rel: GBNE + "la/pg8800_De_Rerum_Natura__Lucretius_.txt", title: "The Divine Comedy (Cary)", author: "Dante Alighieri / H. F. Cary", register: "poetry", language: "en", paraBreak: false,
    notes: "file name says Lucretius; the text is Cary's blank-verse Divine Comedy; blank lines do not end units" },
  { id: "oasym-en-siddhartha", rel: GBNE + "en/pg2500_The_Brothers_Karamazov.txt", title: "Siddhartha", author: "H. Hesse", register: "novel", language: "en",
    notes: "file name says Brothers Karamazov; the text is Hesse's Siddhartha (English translation)" },
];
export const HELD = [
  { id: "oasym-en-mayhew-held", atlasId: "bk-mayhew1", register: "reportage", title: "London Labour and the London Poor, vol 1 (blocks not in bk-mayhew1)", author: "H. Mayhew", notes: "verbatim street interviews inside investigator's prose; same source as the atlas pocket, different blocks" },
  { id: "oasym-en-lesmis-held", atlasId: "bk-lesmis", register: "novel", title: "Les Miserables, Hapgood translation (blocks not in bk-lesmis)", author: "V. Hugo", notes: "Hapgood's English translation (the atlas spec labels it en); same source as the atlas pocket, different blocks" },
  { id: "oasym-es-quixote-held", atlasId: "bk-quixote-es", register: "novel", title: "Don Quijote (blocks not in bk-quixote-es)", author: "M. de Cervantes", notes: "Spanish novel; same source as the atlas pocket, different blocks" },
  { id: "oasym-en-wpa-ar-held", atlasId: "bk-wpa-ar", register: "dialect", title: "WPA slave narratives, Arkansas and South Carolina part 5 (blocks not in bk-wpa-ar)", author: "WPA interviewers", notes: "first-person dialect transcriptions; same sources as the atlas pocket, different blocks" },
  { id: "oasym-en-cryptic-held", atlasId: "bk-cryptic", register: "wordplay", title: "Guardian cryptic crossword clues (clues not in bk-cryptic)", author: "61 setters", notes: "one clue = one unit; unit order is sha256 order, not discourse" },
];
export const IDS = [...BOOKS.map((b) => b.id), ...HELD.map((h) => h.id)];
export async function load(onlyIds = null) {
  const out = [];
  for (const b of BOOKS) if (!onlyIds || onlyIds.includes(b.id)) out.push(bookNew(b));
  for (const h of HELD) if (!onlyIds || onlyIds.includes(h.id)) out.push(heldOutOf(h));
  return out;
}
