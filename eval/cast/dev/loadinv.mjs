// dev inventory + the ignore patterns an annotator would add for a mention that sits inside a longer capitalised name (dev-only helper, flagged in the prereg)
import fs from "node:fs"; import { scan } from "../../../native/organs/cast-identity.js";
const { goldMentions } = await import(process.env.SCORE_CAST ?? "./score-cast.mjs");   // the parent session's scorer (score-cast.mjs); run from a folder holding text/ and inv.json
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function loadInv(doc) {
  const d = JSON.parse(fs.readFileSync("inv.json")).docs[doc]; const text = fs.readFileSync(`text/${doc}.txt`, "utf8");
  const sc = scan(text); const gm = goldMentions(text, d.entities, []); const ign = new Set();
  const CAP = /^\p{Lu}/u;
  for (const m of gm) {
    const before = text.slice(0, m.start).match(/([\p{L}][\p{L}'’-]*)[ \t]$/u); const after = text.slice(m.end).match(/^[ \t]([\p{L}][\p{L}'’-]*)/u);
    if (before && CAP.test(before[1]) && !sc.positional(before[1])) ign.add(esc(before[1] + " " + text.slice(m.start, m.end)));
    if (after && CAP.test(after[1]) && !sc.positional(after[1])) ign.add(esc(text.slice(m.start, m.end) + " " + after[1]));
  }
  return { text, entities: d.entities, ignore: [...ign] };
}
