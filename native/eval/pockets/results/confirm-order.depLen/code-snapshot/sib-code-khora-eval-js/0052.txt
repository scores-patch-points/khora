// lib-ud.mjs — a UD treebank split as a DOCUMENT for the ablation-scope lens (NEW FILE). Same tokenisation as impact.mjs readConlluStream (PUNCT removed, NFC lowercase),
// re-implemented here because readConlluStream refuses the TEST split; the TEST split is read only by a confirmation run, never by discovery.
// Gold (evaluation only): NAME = a PROPN occurrence of a form >= 3 characters. Negative pool excludes every form that is PROPN anywhere in the split.
import fs from "node:fs";
export const UD = "/private/tmp/claude-501/ud-eval";
export function loadUd(stem, split) {
  const p = `${UD}/${stem}/${split}.conllu`;
  const sents = [], upos = [];
  let cur = [], cu = [];
  const flush = () => { if (cur.length) { sents.push(cur); upos.push(cu); } cur = []; cu = []; };
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10 || !/^\d+$/.test(f[0]) || f[3] === "PUNCT") continue;
    cur.push(f[1].normalize("NFC").toLowerCase()); cu.push(f[3]);
  }
  flush();
  const goldPos = new Set(), negExclude = new Set();
  sents.forEach((s, k) => s.forEach((w, i) => { if (upos[k][i] === "PROPN") { negExclude.add(w); if ([...w].length >= 3) goldPos.add(`${k}:${i}`); } }));
  return { name: `${stem}.${split}`, kind: "ud", stream: sents, goldPos, negExclude, goldForms: [...negExclude] };
}
