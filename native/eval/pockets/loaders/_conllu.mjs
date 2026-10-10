// eval/pockets/loaders/_conllu.mjs — CoNLL-U reader shared by loaders/ud.mjs and loaders/ml.mjs (same semantics as readConlluStream in eval/law/impact.mjs, but it also
// reads test splits): integer-ID word lines, UPOS PUNCT dropped, tokens without a letter dropped, lowercase NFC, spaces inside a form joined by "_".
import fs from "node:fs";
import { lc, apos, keepToken } from "./_ud_ml_common.mjs";

/** readConllu(file, intern, st, grain = "words") -> string[][] sentences. st collects {droppedNoLetter, punctDropped, spaceTokens, mwtTokens}. */
export function readConllu(file, intern, st, grain = "words") {
  const sents = []; let cur = [], mwtEnd = 0;
  const flush = () => { if (cur.length) sents.push(cur); cur = []; mwtEnd = 0; };
  const emit = (form, inMwt) => {
    const w = apos(lc(form).replace(/\s+/g, "_"));
    if (!keepToken(w)) { st.droppedNoLetter++; return; }
    if (/\s/.test(form)) st.spaceTokens++;
    if (inMwt) st.mwtTokens++;
    cur.push(intern(w));
  };
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line) { flush(); continue; }
    if (line[0] === "#") continue;
    const f = line.split("\t");
    if (f.length < 10) continue;
    const rg = /^(\d+)-(\d+)$/.exec(f[0]);
    if (rg) { mwtEnd = +rg[2]; if (grain === "surface") emit(f[1], true); continue; }
    if (!/^\d+$/.test(f[0])) continue;
    const inMwt = +f[0] <= mwtEnd;
    if (grain === "surface" && inMwt) continue;
    if (f[3] === "PUNCT") { st.punctDropped++; continue; }
    emit(f[1], inMwt && grain === "words");
  }
  flush();
  return sents;
}
