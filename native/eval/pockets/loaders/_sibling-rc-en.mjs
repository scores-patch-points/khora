// loaders/_sibling-rc-en.mjs — SIBLING pockets (English prose and English verse drama) for the replication of the atlas law order.rareCurve (underscore: ignored by run-atlas.mjs).
// New files only; nothing here edits another file. Every pocket is built with the atlas "bk" pipeline helpers (_bkcore/_bkseg: front-matter and Project-Gutenberg strip, sentence units, ~100-unit blocks as documents,
// 300k cap by whole blocks); group "sib". No atlas pocket reads any of these texts (the atlas reads the ethos trees 01-literature-books, 20-first-person-voices, 15-western-canon first-folio Henry IV Part 1 and the
// non-misfiled 11-multi-language files; the files below are (a) books MISFILED in ethos 11-multi-language/gutenberg-non-en/ that the atlas ml loader skipped (loaders/_ml_skips.mjs ENGLISH_MISFILED), (b) English books of
// the eoPriors global_south_corpus under "New Project", and (c) the Shakespeare Complete Works file of the eochat vendor copy, Henry IV Part 1 left out because bk-hen4-* read it).
// Pockets (id : text : kind):
//   sib-rc-en-mouret       Zola, Abbe Mouret's Transgression (English, Vizetelly)        novel       (file es/pg14200 whose name says Divina Commedia)
//   sib-rc-en-poe-chopin   Poe, Works vol II (tales) + Chopin, The Awakening and stories novel       (files de/pg2148 and en/pg160, names say Werther and Crime and Punishment); pooled, two books
//   sib-rc-en-halfcentury  J. G. Swisshelm, Half a Century (memoir, 1880s)                memoir      (GS pg12052)
//   sib-rc-en-travel       Squier, Waikna (travel) + Ritchie, About London (sketches)     reportage   (files es/pg74987, it/pg32773); pooled, two books
//   sib-rc-en-shake-trag   Shakespeare, ten tragedies                                      drama
//   sib-rc-en-shake-com    Shakespeare, eighteen comedies / romances / problem plays       drama
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack, startProse } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { GS, SHAKE, readAbs, bookUnits } from "./_sibling-entcurv-common.mjs";

const D = "11-multi-language/gutenberg-non-en/";
export const IDS = ["sib-rc-en-mouret", "sib-rc-en-poe-chopin", "sib-rc-en-halfcentury", "sib-rc-en-travel", "sib-rc-en-shake-trag", "sib-rc-en-shake-com"];

/** misfiled ethos book -> units (same chain as loaders/_sibling-en.mjs fileUnits: stripFront, stripPG, trimBack, scrub, startProse, sentences) */
function ethosUnits(rel, paraBreak = true, cutSpec = {}) {
  let { text } = stripFront(readText(D + rel));
  text = startProse(cut(scrub(trimBack(stripPG(text))), cutSpec));
  return toUnits(splitSentences(scrub(text), { paraBreak }));
}

// ---- Shakespeare: title lists (genre by the play title itself: TRAGEDY OF / TIMON; the rest = comedies, romances, problem plays; the histories are left out of both pockets) ----
const TITLES = ["ALL’S WELL THAT ENDS WELL", "THE TRAGEDY OF ANTONY AND CLEOPATRA", "AS YOU LIKE IT", "THE COMEDY OF ERRORS", "THE TRAGEDY OF CORIOLANUS", "CYMBELINE", "THE TRAGEDY OF HAMLET, PRINCE OF DENMARK",
  "THE FIRST PART OF KING HENRY THE FOURTH", "THE SECOND PART OF KING HENRY THE FOURTH", "THE LIFE OF KING HENRY THE FIFTH", "THE FIRST PART OF HENRY THE SIXTH", "THE SECOND PART OF KING HENRY THE SIXTH",
  "THE THIRD PART OF KING HENRY THE SIXTH", "KING HENRY THE EIGHTH", "THE LIFE AND DEATH OF KING JOHN", "THE TRAGEDY OF JULIUS CAESAR", "THE TRAGEDY OF KING LEAR", "LOVE’S LABOUR’S LOST", "THE TRAGEDY OF MACBETH",
  "MEASURE FOR MEASURE", "THE MERCHANT OF VENICE", "THE MERRY WIVES OF WINDSOR", "A MIDSUMMER NIGHT’S DREAM", "MUCH ADO ABOUT NOTHING", "THE TRAGEDY OF OTHELLO, THE MOOR OF VENICE", "PERICLES, PRINCE OF TYRE",
  "KING RICHARD THE SECOND", "KING RICHARD THE THIRD", "THE TRAGEDY OF ROMEO AND JULIET", "THE TAMING OF THE SHREW", "THE TEMPEST", "THE LIFE OF TIMON OF ATHENS", "THE TRAGEDY OF TITUS ANDRONICUS", "TROILUS AND CRESSIDA",
  "TWELFTH NIGHT; OR, WHAT YOU WILL", "THE TWO GENTLEMEN OF VERONA", "THE TWO NOBLE KINSMEN", "THE WINTER’S TALE"];   // order of the file; the section of play j runs from its heading to the heading of play j+1
const HISTORIES = new Set(["THE FIRST PART OF KING HENRY THE FOURTH", "THE SECOND PART OF KING HENRY THE FOURTH", "THE LIFE OF KING HENRY THE FIFTH", "THE FIRST PART OF HENRY THE SIXTH", "THE SECOND PART OF KING HENRY THE SIXTH",
  "THE THIRD PART OF KING HENRY THE SIXTH", "KING HENRY THE EIGHTH", "THE LIFE AND DEATH OF KING JOHN", "KING RICHARD THE SECOND", "KING RICHARD THE THIRD"]);   // incl. Henry IV Part 1 (an atlas text)
const isTragedy = (t) => /^THE TRAGEDY OF /.test(t) || t === "THE LIFE OF TIMON OF ATHENS";
const GENRE = { trag: (t) => !HISTORIES.has(t) && isTragedy(t), com: (t) => !HISTORIES.has(t) && !isTragedy(t) };
export function playsText(text, genre) {
  const lines = text.split("\n"), head = [];
  for (const t of TITLES) { const i = lines.findIndex((l, k) => k > 60 && l.trim() === t && !/^\s/.test(l)); if (i < 0) throw new Error(`heading not found: ${t}`); head.push(i); }
  const endAll = lines.findIndex((l, k) => k > head[head.length - 1] && l.trim() === "A LOVER’S COMPLAINT");
  if (endAll < 0) throw new Error("end of the plays not found");
  const out = [], kept = [];
  TITLES.forEach((t, j) => {
    if (!GENRE[genre](t)) return;
    const a = head[j], b = j + 1 < TITLES.length ? head[j + 1] : endAll;
    let at = -1;   // body = the LAST line "ACT I" of the section (a contents list, when present, names "ACT I" first)
    for (let k = a; k < b; k++) if (lines[k].trim() === "ACT I") at = k;
    if (at < 0) throw new Error(`body start (ACT I) not found in ${t}`);
    out.push(lines.slice(at, b).join("\n")); kept.push(t);
  });
  playsText.last = kept;
  return out.join("\n\n\n");
}

const SHAKE_EXTRA = [/(^|\n\n)[ \t]*(?:Enter|Exit|Exeunt|Re-enter|ACT|SCENE|Scene|Act|Flourish|Alarum|Sennet)\b[^\n]*(?:\n(?!\n)[^\n]*)*/g];   // stage-direction paragraphs (same rule as the entcurv Shakespeare sibling)
const SPECS = {
  "sib-rc-en-mouret": () => ({ lists: [ethosUnits("es/pg14200_La_Divina_Comedia__Dante_.txt")], files: [D + "es/pg14200_La_Divina_Comedia__Dante_.txt"], title: "Abbe Mouret's Transgression", author: "E. Zola (English, Vizetelly)", register: "novel",
    notes: "file name says Divina Commedia; the text is Zola in English" }),
  "sib-rc-en-poe-chopin": () => ({ lists: [ethosUnits("de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt"), ethosUnits("en/pg160_Crime_and_Punishment__Dostoyevsky_.txt")],
    files: [D + "de/pg2148_Die_Leiden_des_jungen_Werther__Goethe_.txt", D + "en/pg160_Crime_and_Punishment__Dostoyevsky_.txt"], title: "Poe, Works vol II + Chopin, The Awakening and Selected Short Stories", author: "E. A. Poe; K. Chopin", register: "novel",
    notes: "two books pooled (units of Poe then Chopin; documents are blocks across the pool); file names say Werther (Goethe) and Crime and Punishment", extra: { pooledBooks: 2 } }),
  "sib-rc-en-halfcentury": () => { const f = GS + "pg12052.txt"; return { lists: [bookUnits({ file: f, noStrip: true, cut: { start: /\nCHAPTER I\.\n/, end: /\nTHE END\./ } })], files: [f], title: "Half a Century", author: "J. G. C. Swisshelm", register: "memoir",
    notes: "eoPriors global_south_corpus gutenberg pg12052; cut from 'CHAPTER I.' to 'THE END.' (contents list, licence and Gutenberg footer outside)" }; },
  "sib-rc-en-travel": () => ({ lists: [ethosUnits("es/pg74987_La_Metamorfosis__Kafka_.txt"), ethosUnits("it/pg32773_Il_Principe__Machiavelli_.txt", true, { end: /\nADVERTISEMENTS\.\n/ })],
    files: [D + "es/pg74987_La_Metamorfosis__Kafka_.txt", D + "it/pg32773_Il_Principe__Machiavelli_.txt"], title: "Waikna (Squier) + About London (Ritchie)", author: "E. G. Squier; J. E. Ritchie", register: "reportage",
    notes: "two travel/sketch books pooled; file names say La Metamorfosis and Il Principe", extra: { pooledBooks: 2 } }),
  "sib-rc-en-shake-trag": () => shake("trag", "ten tragedies (Antony and Cleopatra, Coriolanus, Hamlet, Julius Caesar, King Lear, Macbeth, Othello, Romeo and Juliet, Titus Andronicus, Timon of Athens)"),
  "sib-rc-en-shake-com": () => shake("com", "eighteen comedies, romances and problem plays (all plays that are neither a tragedy nor a history)"),
};
function shake(genre, what) {
  const units = bookUnits({ file: SHAKE, noStrip: true, pre: (t) => playsText(t, genre), drama: "allcaps", extra: SHAKE_EXTRA });
  return { lists: [units], files: [SHAKE], title: `Shakespeare: ${what}`, author: "W. Shakespeare", register: "drama", drama: true,
    notes: `eochat vendor Complete Works (PG #100): ${what}; plays kept: ${playsText.last.length}; speaker labels (stripDrama allcaps) and stage-direction paragraphs removed; histories and Henry IV Part 1 left out`, extra: { plays: playsText.last.length } };
}
export async function load(onlyIds = null) {
  const out = [];
  for (const id of IDS) {
    if (onlyIds && !onlyIds.includes(id)) continue;
    const s = SPECS[id]();
    const { pocket } = assemble({ id, files: s.files, title: s.title, author: s.author, register: s.register, language: "en", notes: s.notes, drama: s.drama }, s.lists, { sibling: true, loader: "_sibling-rc-en.mjs (bk helpers)", ...(s.extra || {}) });
    out.push({ ...pocket, group: "sib" });
  }
  return out;
}
