// loaders/_sibling-entcurv-en-shakespeare.mjs — SIBLING pocket (kind: drama, English verse drama) for the confirmation of order.entCurv: THIRTY-FIVE of Shakespeare's plays from the Project Gutenberg
// "Complete Works" file (#100) kept in the eochat vendor copy of the ethos priors; no atlas pocket reads it (the atlas drama pockets read Henry IV Part 1 only: bk-hen4-folio/-modern/-de/-fr, from
// ethos 15-western-canon). THE FIRST PART OF KING HENRY THE FOURTH is therefore LEFT OUT here; the Sonnets and the narrative poems are left out too (the plays only).
// Per play: the body starts at the LAST line "ACT I" of its section (a table of contents, when present, lists "ACT I" first); the text before it (contents, list of persons) is dropped; the play ends at the
// next play heading (the last, The Winter's Tale, at "A LOVER'S COMPLAINT"). Speaker labels ("HAMLET." alone on a line) and bracketed stage directions are removed with the atlas rule stripDrama(allcaps);
// paragraphs that open with Enter / Exit / Exeunt / ACT / SCENE are removed here. Documents = blocks of ~100 sentence units over the 35 plays; the 300k cap keeps whole blocks in sha256(id:block) order.
import { SHAKE, bookUnits, bookPocket } from "./_sibling-entcurv-common.mjs";
export const ID = "ec-en-shakespeare";
const TITLES = ["ALL’S WELL THAT ENDS WELL", "THE TRAGEDY OF ANTONY AND CLEOPATRA", "AS YOU LIKE IT", "THE COMEDY OF ERRORS", "THE TRAGEDY OF CORIOLANUS", "CYMBELINE", "THE TRAGEDY OF HAMLET, PRINCE OF DENMARK",
  "THE FIRST PART OF KING HENRY THE FOURTH", "THE SECOND PART OF KING HENRY THE FOURTH", "THE LIFE OF KING HENRY THE FIFTH", "THE FIRST PART OF HENRY THE SIXTH", "THE SECOND PART OF KING HENRY THE SIXTH",
  "THE THIRD PART OF KING HENRY THE SIXTH", "KING HENRY THE EIGHTH", "THE LIFE AND DEATH OF KING JOHN", "THE TRAGEDY OF JULIUS CAESAR", "THE TRAGEDY OF KING LEAR", "LOVE’S LABOUR’S LOST", "THE TRAGEDY OF MACBETH",
  "MEASURE FOR MEASURE", "THE MERCHANT OF VENICE", "THE MERRY WIVES OF WINDSOR", "A MIDSUMMER NIGHT’S DREAM", "MUCH ADO ABOUT NOTHING", "THE TRAGEDY OF OTHELLO, THE MOOR OF VENICE", "PERICLES, PRINCE OF TYRE",
  "KING RICHARD THE SECOND", "KING RICHARD THE THIRD", "THE TRAGEDY OF ROMEO AND JULIET", "THE TAMING OF THE SHREW", "THE TEMPEST", "THE LIFE OF TIMON OF ATHENS", "THE TRAGEDY OF TITUS ANDRONICUS", "TROILUS AND CRESSIDA",
  "TWELFTH NIGHT; OR, WHAT YOU WILL", "THE TWO GENTLEMEN OF VERONA", "THE TWO NOBLE KINSMEN", "THE WINTER’S TALE"];
const LEFT_OUT = new Set(["THE FIRST PART OF KING HENRY THE FOURTH"]);
export function playsText(text) {
  const lines = text.split("\n"), head = [];
  for (const t of TITLES) { const i = lines.findIndex((l, k) => k > 60 && l.trim() === t && !/^\s/.test(l)); if (i < 0) throw new Error(`heading not found: ${t}`); head.push(i); }
  const endAll = lines.findIndex((l, k) => k > head[head.length - 1] && l.trim() === "A LOVER’S COMPLAINT");
  if (endAll < 0) throw new Error("end of the plays not found");
  const out = [];
  TITLES.forEach((t, j) => {
    if (LEFT_OUT.has(t)) return;
    const a = head[j], b = j + 1 < TITLES.length ? head[j + 1] : endAll;
    let at = -1;   // body = the LAST line "ACT I" of the section (a table of contents, when the play has one, lists "ACT I" first)
    for (let k = a; k < b; k++) if (lines[k].trim() === "ACT I") at = k;
    if (at < 0) throw new Error(`body start (ACT I) not found in ${t}`);
    out.push(lines.slice(at, b).join("\n"));
  });
  return out.join("\n\n\n");
}
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const units = bookUnits({ file: SHAKE, noStrip: true, pre: playsText, drama: "allcaps",
    extra: [/(^|\n\n)[ \t]*(?:Enter|Exit|Exeunt|Re-enter|ACT|SCENE|Scene|Act|Flourish|Alarum|Sennet)\b[^\n]*(?:\n(?!\n)[^\n]*)*/g] });
  return [bookPocket({ id: ID, files: [SHAKE], title: "Shakespeare, 35 plays (Henry IV Part 1 left out)", author: "W. Shakespeare", register: "drama", language: "en",
    notes: "Complete Works file of the eochat vendor copy of the ethos priors; plays only; speaker labels and stage directions removed" }, [units], { plays: 35 })];
}
