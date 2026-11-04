// dev inventory + the ignore patterns an annotator would add for a mention that sits inside a longer capitalised name (dev-only helper, flagged in the prereg)
import fs from "node:fs"; import { scan } from "../../../native/organs/cast-identity.js";
const { goldMentions } = await import(process.env.SCORE_CAST ?? "./score-cast.mjs");   // the parent session's scorer; run from a folder holding text/ and inv.json
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function loadInv(doc) {
  const d = JSON.parse(fs.readFileSync(process.env.INV ?? "inv.json")).docs[doc]; const text = fs.readFileSync(`${process.env.TEXTDIR ?? "text"}/${doc}.txt`, "utf8");
  const sc = scan(text); const gm = goldMentions(text, d.entities, []); const ign = new Set();
  const CAP = /^\p{Lu}/u;
  const tail = "\\n={2,}[ \\t]*(?:See also|Notes|Notes and references|References|Bibliography|Further reading|External links|Sources|Citations)[ \\t]*={2,}[\\s\\S]*$";
  ign.add(tail); for (const x of (JSON.parse(fs.readFileSync(process.env.INV ?? "inv.json")).docs[doc].ignore ?? [])) ign.add(x);
  for (const m of gm) {
    const before = text.slice(0, m.start).match(/([\p{L}][\p{L}'’-]*)[ \t]$/u); const after = text.slice(m.end).match(/^[ \t]([\p{L}][\p{L}'’-]*)/u);
    const opens = (i) => { let j = i - 1; while (j >= 0 && /[ \t"'“‘(\[]/.test(text[j])) j--; return j < 0 || !/[\p{L}\p{N},&’-]/u.test(text[j]); };
    if (before && CAP.test(before[1]) && !opens(m.start - before[0].length)) ign.add(esc(before[1] + " " + text.slice(m.start, m.end)));
    if (after && CAP.test(after[1])) ign.add(esc(text.slice(m.start, m.end) + " " + after[1]));
  }
  return { text, entities: d.entities, ignore: [...ign] };
}
