// loaders/_sibling-ent-en-early-plays.mjs — SIBLING pocket (kind: drama, Elizabethan English plays) for the confirmation of order.entSlope: ONE pocket of two plays that no atlas pocket reads,
//   (a) Marlowe, Doctor Faustus (1604 quarto, Dyce text), ethos 15-western-canon/marlowe (evaluated by the atlas, 'bk-faustus', but thin and never loaded as a pocket), speaker labels removed with the atlas rule stripDrama(marlowe);
//   (b) Greene, The Scottish History of James the Fourth (1598, Malone Society reprint, original spelling), file misfiled in ethos 11-multi-language/gutenberg-non-en/sv/ (the atlas skipped it): editorial front matter and
//       textual notes cut (body = from the Induction to FINIS), inline italic speaker labels (_Bohan._ ...) and italic stage directions removed here; right-margin line numbers are numeric tokens and vanish in tokenisation.
// Each play alone is under the 20,000-token floor, hence one pooled pocket (units of play (a) then play (b); documents are blocks of ~100 units across the pool).
import { ETHOS, readText, stripFront, stripPG, scrub, cut, trimBack } from "./_bkcore.mjs";
import { stripDrama, splitSentences, toUnits, assemble } from "./_bkseg.mjs";
import { GROUP, GBNE } from "./_sibling-ent-common.mjs";
export const ID = "ent-en-early-plays";
const FAUSTUS = "15-western-canon/marlowe/doctor-faustus-1604-quarto.txt", JAMES = GBNE + "sv/pg43668_F_ders_brott__Swedish_.txt";

function faustus() {
  let text = stripFront(readText(FAUSTUS)).text;
  text = cut(scrub(text), { start: /\n[ \t]*Enter CHORUS\./, end: /\nFOOTNOTES:\n/ });
  return toUnits(splitSentences(scrub(stripDrama(text, "marlowe", false)), { paraBreak: true }));
}
function james() {
  let text = scrub(trimBack(stripPG(stripFront(readText(JAMES)).text)));
  text = cut(text, { start: /\nMusicke playing within\./, end: /\nFINIS\.\s*$/ });
  text = text.replace(/^_[^_\n]{1,30}\._[ \t]*/gm, "");                                   // inline italic speaker labels at line start ("_Bohan._", "_Ober._", "_K._")
  text = text.replace(/_(?:Enter|Exit|Exeunt|Manet|Musicke|Sound|Dance|Alarum|Drum|Trumpets)[^_]{0,500}_/g, " ");   // italic stage directions (may span lines)
  return toUnits(splitSentences(scrub(text), { paraBreak: true }));
}
export async function load(onlyIds = null) {
  if (onlyIds && !onlyIds.includes(ID)) return [];
  const spec = { id: ID, files: [FAUSTUS, JAMES], title: "Doctor Faustus (1604) + James the Fourth (1598)", author: "C. Marlowe; R. Greene", register: "drama", language: "en", notes: "two Elizabethan plays pooled to clear the token floor; Faustus in Dyce's edited spelling, James IV in 1598 spelling (u/v, i/j, -e endings); labels, stage directions and editorial matter removed" };
  const { pocket } = assemble(spec, [faustus(), james()], { sibling: true, pooledPlays: 2 });
  return [{ ...pocket, group: GROUP }];
}
