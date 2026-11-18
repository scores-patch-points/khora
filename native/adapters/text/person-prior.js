// person-prior.js — is this being a PERSON? Naive-Bayes evidence from the verbs it is the subject or object of (PersonPrior@1, native/adapters/text/person-prior/eng.json, built by scripts/build-person-prior.mjs from UD English GUM train).
//
//   loadPersonPrior(stem)          -> the prior or null (no prior for the language: nothing is vetoed)
//   personEvidence(prior, args)    -> { n, score }   args = [{ role: "subj"|"obj", lemma }]; score = sum of log likelihood ratios P(verb,role | person) / P(verb,role | not person) with equal class priors, Laplace-smoothed
//   isNonPerson(evidence)          -> true only when at least MIN_OBSERVATIONS scored arguments say non-person (score < 0)
// DEF·Figure (what a being is) feeding NUL·Figure (veto it as the referent of he/she). A giver may be silent: a being with too little evidence is NOT vetoed, the reader is not told a thing is not a person for lack of an answer.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url)); export const MIN_OBSERVATIONS = 2; const cache = new Map();
export function loadPersonPrior(stem = "eng") {
  const k = String(stem ?? "").toLowerCase().replace(/[-_].*$/, ""); if (cache.has(k)) return cache.get(k); let p = null;
  try { p = JSON.parse(fs.readFileSync(path.join(HERE, "person-prior", `${k}.json`), "utf8")); for (const role of ["subj", "obj"]) { let n0 = 0, n1 = 0; const V = Object.keys(p[role]).length; for (const c of Object.values(p[role])) { n0 += c[0]; n1 += c[1]; } (p._tot ??= {})[role] = { n0, n1, V }; } } catch { p = null; }
  if (p) for (const role of ["subj", "obj"]) { const t = p._tot[role]; const a = 0.5; const l = Object.values(p[role]).map((c) => Math.log(((c[0] + a) / (t.n0 + a * t.V)) / ((c[1] + a) / (t.n1 + a * t.V)))).sort((x, y) => x - y); const med = l[l.length >> 1]; const dev = l.map((x) => Math.abs(x - med)).sort((x, y) => x - y); t.unit = 1.4826 * dev[dev.length >> 1]; } // the prior's own robust spread of one verb's evidence
  cache.set(k, p); return p;
}
export function personEvidence(prior, args) {
  if (!prior) return { n: 0, score: 0 }; let n = 0, score = 0; const a = 0.5;
  for (const x of args ?? []) { const c = prior[x.role]?.[String(x.lemma ?? "").toLowerCase()]; if (!c) continue; const t = prior._tot[x.role]; const llr = Math.log(((c[0] + a) / (t.n0 + a * t.V)) / ((c[1] + a) / (t.n1 + a * t.V)));
    if (Math.abs(llr) <= t.unit) continue; // weak evidence (a verb that persons and non-persons both take) counts for nothing: only a verb that clearly leans one way is a voice
    n++; score += llr; }
  return { n, score };
}
// a veto is a named cause and a wrongly vetoed person is expensive (the true referent is removed and the pronoun goes to someone else): it needs at least MIN_OBSERVATIONS STRONG arguments and a total leaning non-person
export const isNonPerson = (ev) => ev.n >= MIN_OBSERVATIONS && ev.score < 0;
