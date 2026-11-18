// build-register.mjs — the Sanskrit PronounPrior@1, derived from the two UD treebanks (CC BY-SA 4.0). Usage: node build-register.mjs <vedic-dir> <ufal-dir> <out-register.json> <out-report.json>
import fs from "node:fs"; import path from "node:path";
import { readConllu, iast } from "./conllu.mjs";
import { finalVariants } from "../../../native/adapters/text/sanskrit-sandhi.js";
const [VED, UFAL, OUT, REP] = process.argv.slice(2);
const uf = readConllu(path.join(UFAL, "sa_ufal-ud-test.conllu"));
const ved = readConllu(path.join(VED, "sa_vedic-ud-train.conllu"));
// 1. the lemmas the UFAL treebank itself marks third person: PronType=Dem, or PronType=Prs with Person=3
const lem = new Map();
for (const s of uf) for (const t of s.toks) if (t.upos === "PRON") {
  const L = iast(t.misc.LTranslit ?? t.lemma), pt = t.feats.PronType, pe = t.feats.Person;
  const r = lem.get(L) ?? { Dem: 0, Prs3: 0, other: 0, n: 0 }; r.n++;
  if (pt === "Dem") r.Dem++; else if (pt === "Prs" && pe === "3") r.Prs3++; else r.other++;
  lem.set(L, r);
}
const L3 = new Set([...lem].filter(([, r]) => r.Dem + r.Prs3 > 0).map(([l]) => l));
const inL3 = (l) => L3.has(l) || (l.endsWith("d") && L3.has(l.slice(0, -1)));
// 2. count forms (Vedic: IAST surface, train split; UFAL: IAST Translit and Devanagari surface)
const forms = new Map(); const bump = (k, t, src) => { const r = forms.get(k) ?? { gender: {}, number: {}, case: {}, src: {} }; for (const [f, m] of [["Gender", "gender"], ["Number", "number"], ["Case", "case"]]) if (t.feats[f]) r[m][t.feats[f]] = (r[m][t.feats[f]] ?? 0) + 1; r.src[src] = (r.src[src] ?? 0) + 1; forms.set(k, r); };
let nVed = 0, nUf = 0;
for (const s of ved) for (const t of s.toks) if (t.upos === "PRON" && t.feats.Case && !t.feats.Compound && inL3(iast(t.lemma))) { bump(iast(t.form), t, "vedic-train"); nVed++; }
for (const s of uf) for (const t of s.toks) if (t.upos === "PRON" && t.feats.Case && !t.feats.Compound && inL3(iast(t.misc.LTranslit ?? t.lemma))) {
  bump(t.form.normalize("NFC"), t, "ufal-deva"); if (t.misc.Translit) bump(iast(t.misc.Translit), t, "ufal-iast"); nUf++;
}
// 3. the rule: majority number Singular, majority gender not Neuter, a gender attested
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const keep = {}, drop = {}, keptSrc = {};
for (const [k, r] of forms) {
  const g = r.gender, n = r.number, mf = Math.max(g.Masc ?? 0, g.Fem ?? 0), neut = g.Neut ?? 0;
  const why = !sum(g) ? "no gender attested" : (n.Sing ?? 0) * 2 <= sum(n) ? "majority number not singular" : neut >= mf ? "neuter majority" : null;
  const rec = { gender: g, number: n }; const recS = { ...rec, src: r.src };
  if (why) drop[k] = { ...rec, why, src: r.src }; else { keep[k] = rec; keptSrc[k] = recS; }
}
// 4. the final-sound closure (native/adapters/text/sanskrit-sandhi.js): a variant of an IAST kept form that is not itself a kept form carries the source form's counts
const variants = {};
for (const [k, v] of Object.entries(keep)) if (/^[a-zāīūṛṝḷṃḥśṣṭḍṇñṅ]+$/.test(k)) for (const w of finalVariants(k)) if (!(w in keep) && !(w in variants)) variants[w] = { gender: v.gender, number: v.number, from: k };
const allForms = { ...keep }; for (const [w, v] of Object.entries(variants)) allForms[w] = { gender: v.gender, number: v.number };
// 5. the nominal case endings the Vedic treebank attests, relative to the CONSONANTAL stem (the lemma without its final vowel), count >= 2 (the repo's MIN_OBSERVATIONS), length <= 4, closed under the same final-sound variants
const endCount = {};
for (const s of ved) for (const t of s.toks) if ((t.upos === "NOUN" || t.upos === "PROPN") && t.feats.Case && !t.feats.Compound) {
  const lm = iast(t.lemma), f = iast(t.form), stem0 = /[aāiīuūṛ]$/.test(lm) ? lm.slice(0, -1) : lm;
  if (stem0.length >= 3 && f.startsWith(stem0)) { const e = f.slice(stem0.length); if (e.length >= 1 && e.length <= 4) endCount[e] = (endCount[e] ?? 0) + 1; }
}
const endings = new Set(Object.entries(endCount).filter(([, n]) => n >= 2).map(([e]) => e));
for (const e of [...endings]) for (const w of finalVariants(e)) endings.add(w);
const reg = { schema: "PronounPrior@1", language: "san", provenance: {
  source: "Universal Dependencies Sanskrit-Vedic (train split; IAST, unsandhied forms) and Sanskrit-UFAL (Panchatantra; Devanagari forms and their IAST Translit, sandhied surface forms)",
  license: "CC BY-SA 4.0 (LICENSE.txt in each treebank repository)", built_by: "identity/pronouns-multilingual/san/build-register.mjs",
  third_person_lemmas: { rule: "UFAL tokens with UPOS=PRON and PronType=Dem, or PronType=Prs with Person=3, by LTranslit; Vedic tokens with UPOS=PRON and a lemma equal to one of these or to one plus final d (ena/enad)", lemmas: [...L3].sort() },
  form_rule: "kept iff a gender is attested, the majority number is Singular and Neuter is not the majority gender; excluded forms are in the build report",
  tokens: { vedic_train: nVed, ufal: nUf }, distinct_forms_kept: Object.keys(keep).length, sandhi_variants_added: Object.keys(variants).length, sandhi_closure: "final-sound variants of each kept IAST form (m/anusvara, -ah to o/a/as/as/ar, final t/d, ...) added with the source form's counts: native/adapters/text/sanskrit-sandhi.js; the Vedic forms are unsandhied, running text is not", endings_count: endings.size, distinct_forms_excluded: Object.keys(drop).length,
  note: "Vedic forms are unsandhied; UFAL forms are surface forms (some sandhied). Not hand-listed: every form and count is read from the treebanks. Devanagari and IAST forms sit side by side (distinct strings)."
}, beings: "heard-nominals", endings: [...endings].sort(), forms: allForms };
fs.writeFileSync(OUT, JSON.stringify(reg));
fs.writeFileSync(REP, JSON.stringify({ L3: [...L3], lemmaTable: Object.fromEntries(lem), kept: keptSrc, dropped: drop, variants, endings: [...endings].sort() }, null, 1));
console.log("L3", [...L3].join(" "), "| tokens vedic", nVed, "ufal", nUf, "| kept", Object.keys(keep).length, "dropped", Object.keys(drop).length);
