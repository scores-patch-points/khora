// conllu.mjs — a plain CoNLL-U reader for the san experiments (sentences of { id, text, toks, mwt }); multiword-token ranges are kept apart from the words.
import fs from "node:fs";
export function readConllu(file) {
  const sents = []; let cur = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("# sent_id")) { cur = { id: line.split("=")[1].trim(), text: "", toks: [], mwt: [] }; sents.push(cur); continue; }
    if (!cur) continue;
    if (line.startsWith("# text =")) { cur.text = line.slice(8).trim(); continue; }
    if (line.startsWith("#") || !line.trim()) continue;
    const f = line.split("\t"); if (f.length < 10) continue;
    const misc = Object.fromEntries(f[9].split("|").map((x) => { const i = x.indexOf("="); return i < 0 ? [x, ""] : [x.slice(0, i), x.slice(i + 1)]; }));
    const feats = f[5] === "_" ? {} : Object.fromEntries(f[5].split("|").map((x) => x.split("=")));
    if (f[0].includes("-")) { const [a, b] = f[0].split("-").map(Number); cur.mwt.push({ a, b, form: f[1], misc }); continue; }
    cur.toks.push({ id: +f[0], form: f[1], lemma: f[2], upos: f[3], feats, head: +f[6], rel: f[7], misc });
  }
  return sents;
}
export const iast = (s) => String(s ?? "").normalize("NFC").replace(/ṁ/g, "ṃ").toLowerCase();
