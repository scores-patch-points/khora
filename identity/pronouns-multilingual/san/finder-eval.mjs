// finder-eval.mjs — H2, H3, H4: the register's FINDER against the treebanks' own tags (gold for the pronoun finder, not for coreference).
// Usage: node finder-eval.mjs <vedic-dir> <ufal-dir>   (the register under test is the build report's `kept`, Vedic-train forms only for H2/H3)
import fs from "node:fs"; import path from "node:path";
import { readConllu, iast } from "./conllu.mjs";
import { findThirdPersonSingular } from "../../../native/adapters/text/pronouns.js";
const [VED, UFAL] = process.argv.slice(2);
const rep = JSON.parse(fs.readFileSync(new URL("./register-build-report.json", import.meta.url)));
const L3 = new Set(rep.L3); const inL3 = (l) => L3.has(l) || (l.endsWith("d") && L3.has(l.slice(0, -1)));
const vedForms = Object.fromEntries(Object.entries(rep.kept).filter(([, v]) => v.src["vedic-train"]).map(([k, v]) => [k, { gender: v.gender, number: v.number }]));
const regV = { forms: vedForms };
const goldTok = (t) => t.upos === "PRON" && t.feats.Case && !t.feats.Compound && inL3(iast(t.misc.LTranslit ?? t.lemma)) && t.feats.Number === "Sing" && (t.feats.Gender === "Masc" || t.feats.Gender === "Fem");
// H2: Vedic test split
const test = readConllu(path.join(VED, "sa_vedic-ud-test.conllu"));
let gold = 0, found = 0, hits = 0, hitRight = 0; const miss = {}, fp = {};
for (const s of test) {
  let text = "", starts = new Map();
  for (const t of s.toks) { if (text) text += " "; starts.set(text.length, t); text += iast(t.form); }
  const hs = findThirdPersonSingular(text, regV);
  const hitAt = new Map(hs.map((h) => [h.index, h]));
  for (const t of s.toks) { const at = [...starts].find(([, x]) => x === t)[0]; if (goldTok(t)) { gold++; if (hitAt.has(at)) found++; else miss[iast(t.form)] = (miss[iast(t.form)] ?? 0) + 1; } }
  for (const h of hs) { hits++; const t = starts.get(h.index); if (t && goldTok(t)) hitRight++; else { const k = iast(t?.form ?? "?") + "/" + (t?.upos ?? "?") + "/" + (t?.lemma ?? "?"); fp[k] = (fp[k] ?? 0) + 1; } }
}
const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k}:${v}`).join(" ");
console.log(`H2 Vedic test (${test.length} sents): gold tokens ${gold}, found ${found}, recall ${(found / gold).toFixed(3)}; finder hits ${hits}, right ${hitRight}, precision ${(hitRight / hits).toFixed(3)}`);
console.log("  missed forms:", top(miss)); console.log("  false-positive (form/upos/lemma):", top(fp));
// H3 / H4: UFAL
const uf = readConllu(path.join(UFAL, "sa_ufal-ud-test.conllu"));
let g = 0, fused = 0, freeIn = 0, freeOut = 0; const outForms = {};
for (const s of uf) for (const t of s.toks) if (goldTok(t)) {
  g++; const m = s.mwt.find((x) => t.id >= x.a && t.id <= x.b);
  if (m) { fused++; continue; }
  const surf = iast(t.misc.Translit ?? t.form); if (vedForms[surf]) freeIn++; else { freeOut++; outForms[surf] = (outForms[surf] ?? 0) + 1; }
}
console.log(`H3 UFAL (${uf.length} sents): gold singular m/f third-person pronoun tokens ${g}; inside a multiword token ${fused} (${(fused / g).toFixed(3)}); free-standing form NOT in the Vedic register ${freeOut} (${(freeOut / g).toFixed(3)}) ${top(outForms, 12)}; free-standing and in it ${freeIn} (${(freeIn / g).toFixed(3)})`);
for (const [name, sents] of [["UFAL", uf], ["Vedic test", test]]) {
  let fin = 0, overt = 0, nominal = 0, none = 0, other = 0;
  for (const s of sents) for (const v of s.toks) if ((v.upos === "VERB" || v.upos === "AUX") && v.feats.Person === "3" && (v.feats.Mood || v.feats.Tense) && v.feats.VerbForm !== "Part" && v.feats.VerbForm !== "Conv") {
    fin++; const subs = s.toks.filter((c) => c.head === v.id && /^(nsubj|csubj)/.test(c.rel));
    if (!subs.length) none++; else if (subs.some((c) => c.upos === "PRON" && inL3(iast(c.misc.LTranslit ?? c.lemma)))) overt++; else if (subs.some((c) => c.upos === "NOUN" || c.upos === "PROPN")) nominal++; else other++;
  }
  console.log(`H4 ${name}: finite 3rd-person verbs ${fin}: overt 3rd-person pronoun subject ${overt} (${(overt / fin).toFixed(3)}), nominal subject ${nominal} (${(nominal / fin).toFixed(3)}), other subject ${other}, no subject (dropped) ${none} (${(none / fin).toFixed(3)})`);
}
