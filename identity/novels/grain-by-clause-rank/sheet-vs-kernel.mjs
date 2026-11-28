// sheet-vs-kernel.mjs — reconcile the pasted concept -> cell sheet ("The Other Eighteen", 2026-11-23) against the kernel.
// For every row that has a UD form, ask the kernel (kernel/universal-grammar.js) which cell it gives that form and compare:
//   a "Repo today" row must equal the kernel's cell; a "Proposed" row is either already the kernel's cell, a real change, or has no UD form.
// A deterministic comparison of two declared tables, not a measurement: no corpus is read.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { addressOfFeature, addressOfRelation, addressOfUpos } from "../../../native/kernel/universal-grammar.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// [concept, family, sheet cell (null = "No cell"), basis, fit, probe]   probe: "F:Dim=Val" | "R:rel" | "U:UPOS" | "" (no UD form)
const SHEET = [
  ["Noun and verb", "Word classes", null, "Proposed", "None", "U:VERB"],
  ["Adjective", "Word classes", "DEF·Figure", "Proposed", "Loose", "U:ADJ"],
  ["Adverb", "Word classes", null, "Proposed", "None", "U:ADV"],
  ["Pronoun, 1st person", "Word classes", "SIG·Ground", "Repo today", "Strong", "F:Person=1"],
  ["Pronoun, 2nd person", "Word classes", "SIG·Figure", "Repo today", "Medium", "F:Person=2"],
  ["Pronoun, 3rd person", "Word classes", "INS·Figure", "Repo today", "Medium", "F:Person=3"],
  ["Clusivity", "Word classes", "SIG·Figure", "Proposed", "Medium", "F:Clusivity=In"],
  ["Demonstrative, near and far", "Word classes", "DEF·Figure", "Proposed", "Medium", "F:PronType=Dem"],
  ["Numeral and quantifier", "Word classes", "SEG·Figure", "Proposed", "Medium", "U:NUM"],
  ["Interrogative word", "Word classes", "SEG·Ground", "Proposed", "Medium", "F:PronType=Int"],
  ["Interjection", "Word classes", "SIG·Ground", "Proposed", "Loose", "U:INTJ"],
  ["Number: singular", "Noun grammar", "SIG·Figure", "Repo today", "Loose", "F:Number=Sing"],
  ["Number: plural", "Noun grammar", "SIG·Pattern", "Repo today", "Medium", "F:Number=Plur"],
  ["Number: dual", "Noun grammar", "SIG·Ground", "Repo today", "Loose", "F:Number=Dual"],
  ["Number: collective", "Noun grammar", "SYN·Figure", "Proposed", "Medium", "F:Number=Coll"],
  ["Case: nominative", "Noun grammar", "SEG·Figure", "Repo today", "Medium", "F:Case=Nom"],
  ["Case: accusative", "Noun grammar", "CON·Figure", "Repo today", "Strong", "F:Case=Acc"],
  ["Case: genitive", "Noun grammar", "CON·Pattern", "Repo today", "Medium", "F:Case=Gen"],
  ["Case: dative", "Noun grammar", "CON·Ground", "Repo today", "Medium", "F:Case=Dat"],
  ["Case: ablative", "Noun grammar", "SEG·Ground", "Repo today", "Loose", "F:Case=Abl"],
  ["Case: instrumental", "Noun grammar", "SIG·Pattern", "Repo today", "Loose", "F:Case=Ins"],
  ["Case: locative", "Noun grammar", "SIG·Ground", "Repo today", "Strong", "F:Case=Loc"],
  ["Case: vocative", "Noun grammar", "SIG·Ground", "Repo today", "Strong", "F:Case=Voc"],
  ["Case: ergative", "Noun grammar", "SEG·Figure", "Proposed", "Medium", "F:Case=Erg"],
  ["Case: partitive", "Noun grammar", "SEG·Figure", "Proposed", "Medium", "F:Case=Par"],
  ["Case: abessive (without)", "Noun grammar", "NUL·Figure", "Proposed", "Medium", "F:Case=Abe"],
  ["Case: translative (becomes)", "Noun grammar", "INS·Figure", "Proposed", "Medium", "F:Case=Tra"],
  ["Case: comitative (together with)", "Noun grammar", "CON·Figure", "Proposed", "Medium", "F:Case=Com"],
  ["Case: local grid (in, on, under, to, from)", "Noun grammar", "SEG·Ground", "Proposed", "Medium", "F:Case=Ine"],
  ["Gender and noun class", "Noun grammar", "SEG·Pattern", "Proposed", "Medium", "F:Gender=Masc"],
  ["Classifier", "Noun grammar", "SEG·Figure", "Proposed", "Medium", "R:clf"],
  ["Definiteness", "Noun grammar", "DEF·Figure", "Proposed", "Strong", "F:Definite=Def"],
  ["Possession, inalienable (my hand)", "Noun grammar", "SEG·Figure", "Proposed", "Strong", ""],
  ["Possession, alienable (my book)", "Noun grammar", "CON·Figure", "Proposed", "Strong", ""],
  ["Tense: past", "Verb grammar", "REC·Pattern", "Repo today", "Loose", "F:Tense=Past"],
  ["Tense: present", "Verb grammar", "EVA·Figure", "Repo today", "Loose", "F:Tense=Pres"],
  ["Tense: future", "Verb grammar", "SYN·Pattern", "Repo today", "Loose", "F:Tense=Fut"],
  ["Aspect: imperfective", "Verb grammar", "NUL·Ground", "Repo today", "Loose", "F:Aspect=Imp"],
  ["Aspect: imperfective as background", "Verb grammar", "INS·Ground", "Proposed", "Medium", ""],
  ["Aspect: perfective", "Verb grammar", "INS·Pattern", "Repo today", "Medium", "F:Aspect=Perf"],
  ["Aspect: progressive", "Verb grammar", "SIG·Pattern", "Repo today", "Medium", "F:Aspect=Prog"],
  ["Aspect: habitual", "Verb grammar", "SIG·Pattern", "Proposed", "Medium", "F:Aspect=Hab"],
  ["Aspect: iterative", "Verb grammar", "INS·Pattern", "Proposed", "Medium", "F:Aspect=Iter"],
  ["Aspect: cessative (no longer)", "Verb grammar", "NUL·Pattern", "Proposed", "Loose", ""],
  ["Mood: indicative", "Verb grammar", "EVA·Ground", "Repo today", "Medium", "F:Mood=Ind"],
  ["Mood: imperative", "Verb grammar", "NUL·Ground", "Repo today", "Loose", "F:Mood=Imp"],
  ["Mood: subjunctive and optative", "Verb grammar", "EVA·Pattern", "Repo today", "Medium", "F:Mood=Sub"],
  ["Modality: necessity and ability", "Verb grammar", "EVA·Ground", "Proposed", "Medium", "F:Mood=Nec"],
  ["Voice: active", "Verb grammar", "EVA·Figure", "Repo today", "Loose", "F:Voice=Act"],
  ["Voice: passive", "Verb grammar", "REC·Figure", "Repo today", "Loose", "F:Voice=Pass"],
  ["Voice: middle", "Verb grammar", "REC·Ground", "Repo today", "Strong", "F:Voice=Mid"],
  ["Voice: antipassive", "Verb grammar", "REC·Ground", "Proposed", "Medium", "F:Voice=Antip"],
  ["Voice: causative", "Verb grammar", "CON·Figure", "Proposed", "Medium", "F:Voice=Cau"],
  ["Voice: applicative", "Verb grammar", "CON·Figure", "Proposed", "Medium", ""],
  ["Reflexive", "Verb grammar", "REC·Figure", "Proposed", "Strong", "F:Reflex=Yes"],
  ["Reciprocal", "Verb grammar", "REC·Figure", "Proposed", "Medium", "F:Voice=Rcp"],
  ["Agreement", "Verb grammar", "CON·Pattern", "Proposed", "Medium", ""],
  ["Transitivity and valency", "Verb grammar", "CON·Figure", "Proposed", "Medium", ""],
  ["Evidentiality", "Verb grammar", "EVA·Figure", "Proposed", "Medium", "F:Evident=Nfh"],
  ["Serial verbs", "Verb grammar", "SYN·Figure", "Proposed", "Medium", ""],
  ["Auxiliary construction", "Verb grammar", "SYN·Pattern", "Proposed", "Medium", "R:aux"],
  ["Finite form", "Verb grammar", "EVA·Pattern", "Repo today", "Loose", "F:VerbForm=Fin"],
  ["Infinitive", "Verb grammar", "SYN·Figure", "Repo today", "Medium", "F:VerbForm=Inf"],
  ["Participle", "Verb grammar", "SEG·Pattern", "Repo today", "Loose", "F:VerbForm=Part"],
  ["Gerund", "Verb grammar", "DEF·Pattern", "Repo today", "Loose", "F:VerbForm=Ger"],
  ["Constituent order", "Clause structure", "CON·Pattern", "Proposed", "Medium", ""],
  ["Alignment (accusative, ergative, split)", "Clause structure", "CON·Pattern", "Proposed", "Medium", ""],
  ["Subject", "Clause structure", "SEG·Figure", "Repo today", "Medium", "R:nsubj"],
  ["Direct object", "Clause structure", "CON·Figure", "Repo today", "Strong", "R:obj"],
  ["Indirect object", "Clause structure", "CON·Ground", "Repo today", "Medium", "R:iobj"],
  ["Oblique: source", "Clause structure", "SEG·Ground", "Repo today", "Loose", "R:obl:from"],
  ["Oblique: place", "Clause structure", "SIG·Ground", "Repo today", "Strong", "R:obl:loc"],
  ["Declarative clause", "Clause structure", "EVA·Ground", "Proposed", "Loose", ""],
  ["Interrogative clause", "Clause structure", "SEG·Ground", "Proposed", "Medium", ""],
  ["Imperative clause", "Clause structure", "NUL·Ground", "Repo today", "Loose", "F:Mood=Imp"],
  ["Negation: clausal", "Clause structure", "NUL·Ground", "Proposed", "Medium", "F:Polarity=Neg"],
  ["Negation: constituent", "Clause structure", "NUL·Figure", "Proposed", "Strong", ""],
  ["Negative existential", "Clause structure", "NUL·Figure", "Proposed", "Strong", ""],
  ["Existential construction (there is)", "Clause structure", "INS·Ground", "Proposed", "Medium", ""],
  ["Locative construction", "Clause structure", "SIG·Ground", "Proposed", "Medium", ""],
  ["Equative and predicative", "Clause structure", "DEF·Figure", "Proposed", "Medium", "R:cop"],
  ["Coordination of clauses", "Complex sentences", "CON·Ground", "Proposed", "Medium", "R:conj"],
  ["Coordination of nouns", "Complex sentences", "CON·Figure", "Proposed", "Medium", ""],
  ["Relative clause, restrictive", "Complex sentences", "DEF·Figure", "Proposed", "Medium", "R:acl:relcl"],
  ["Complement clause", "Complex sentences", "SYN·Figure", "Proposed", "Medium", "R:ccomp"],
  ["Adverbial clause: condition", "Complex sentences", "SYN·Ground", "Proposed", "Medium", "R:advcl:cond"],
  ["Adverbial clause: time (kāla)", "Complex sentences", null, "Proposed", "None", "R:advcl:tcl"],
  ["Adverbial clause: cause (hetu)", "Complex sentences", null, "Proposed", "None", "R:advcl:caus"],
  ["Adverbial clause: purpose (prayojana)", "Complex sentences", null, "Proposed", "None", "R:advcl:fin"],
  ["Adverbial clause: concession", "Complex sentences", "EVA·Ground", "Proposed", "Loose", ""],
  ["Counterfactual", "Complex sentences", "EVA·Ground", "Proposed", "Strong", "F:Mood=Cnd"],
  ["Switch-reference", "Complex sentences", "CON·Ground", "Proposed", "Medium", ""],
  ["Reported speech and quotation", "Complex sentences", "DEF·Ground", "Proposed", "Medium", ""],
  ["Embedding (recursion)", "Complex sentences", "REC·Pattern", "Proposed", "Strong", ""],
  ["Spatial relations", "Meaning-organizing", "SEG·Ground", "Proposed", "Medium", ""],
  ["Absolute directions (north, south)", "Meaning-organizing", "SEG·Ground", "Proposed", "Medium", ""],
  ["Comparison", "Meaning-organizing", "DEF·Figure", "Proposed", "Medium", "F:Degree=Cmp"],
  ["Topic", "Meaning-organizing", "DEF·Ground", "Proposed", "Medium", ""],
  ["Focus and contrast", "Meaning-organizing", "DEF·Figure", "Proposed", "Medium", ""],
  ["T/V address", "Meaning-organizing", "SIG·Figure", "Proposed", "Medium", "F:Polite=Form"],
  ["Elaborate honorific systems", "Meaning-organizing", "DEF·Pattern", "Proposed", "Loose", "F:Polite=Elev"],
  ["Deixis (person, place, time)", "Meaning-organizing", "SIG·Ground", "Proposed", "Strong", "F:Deixis=Prox"],
  ["Distributivity", "Meaning-organizing", "SEG·Figure", "Proposed", "Medium", "F:NumType=Dist"],
  ["Compounding", "Word formation", "SYN·Figure", "Proposed", "Strong", "R:compound"],
  ["Derivation", "Word formation", "INS·Figure", "Proposed", "Medium", ""],
  ["Reduplication", "Word formation", "REC·Pattern", "Proposed", "Loose", ""],
  ["Inflection against derivation", "Word formation", "DEF·Pattern", "Proposed", "Loose", ""],
  ["Templatic morphology", "Word formation", "SYN·Pattern", "Proposed", "Medium", ""],
  ["Affixation", "Word formation", null, "Proposed", "None", ""],
  ["Phonology, prosody, morphophonology", "Sound", null, "Proposed", "None", ""],
];

const kernelOf = (probe) => {
  if (!probe) return null;
  const [kind, rest] = [probe.slice(0, 1), probe.slice(2)];
  if (kind === "F") { const i = rest.indexOf("="); return addressOfFeature(rest.slice(0, i), rest.slice(i + 1)); }
  if (kind === "R") return addressOfRelation(rest);
  if (kind === "U") return addressOfUpos(rest);
  return null;
};

const rows = SHEET.map(([concept, family, cell, basis, fit, probe]) => {
  const k = kernelOf(probe);
  const kc = k?.cell ?? null;
  let status;
  if (!probe) status = "no UD form";
  else if (basis === "Repo today") status = kc === cell ? "repo-today CONFIRMED" : "repo-today WRONG";
  else status = cell === null ? (kc ? "sheet has no cell, kernel places it" : "agree (no cell)") : kc === cell ? "proposed = already in kernel" : kc ? "proposed differs from kernel" : "proposed, kernel has no cell";
  return { concept, family, sheet: cell ?? "No cell", basis, fit, probe, kernel: kc ?? "-", kernelBasis: k?.basis ?? "-", status };
});

const count = (s) => rows.filter((r) => r.status === s).length;
const lines = [];
lines.push("# The pasted sheet against the kernel", "", `Generated by \`sheet-vs-kernel.mjs\` on 2026-11-23. ${rows.length} rows. No corpus read: both sides are declared tables. A row is compared only where UD has a form for it (the "probe"); the kernel is \`native/kernel/universal-grammar.js\` (measured entries from \`cube.js\` CELL_OF_GRAMMAR, declared entries beside them).`, "");
lines.push("| outcome | rows |", "|---|---|");
for (const s of ["repo-today CONFIRMED", "repo-today WRONG", "proposed = already in kernel", "proposed differs from kernel", "sheet has no cell, kernel places it", "agree (no cell)", "proposed, kernel has no cell", "no UD form"]) lines.push(`| ${s} | ${count(s)} |`);
const table = (title, pred) => { const rs = rows.filter(pred); if (!rs.length) return; lines.push("", `## ${title} (${rs.length})`, "", "| concept | sheet | kernel | kernel basis | UD probe |", "|---|---|---|---|---|"); for (const r of rs) lines.push(`| ${r.concept} | ${r.sheet} (${r.basis}) | ${r.kernel} | ${r.kernelBasis} | ${r.probe} |`); };
table('"Repo today" rows the kernel does not support', (r) => r.status === "repo-today WRONG");
table('"Proposed" rows that are already in the kernel', (r) => r.status === "proposed = already in kernel");
table("Sheet says no cell; the kernel places it", (r) => r.status === "sheet has no cell, kernel places it");
table('"Proposed" rows that change the kernel', (r) => r.status === "proposed differs from kernel");
table('"Proposed" rows with a UD form the kernel does not place', (r) => r.status === "proposed, kernel has no cell");
fs.writeFileSync(path.join(HERE, "SHEET-VS-KERNEL.md"), lines.join("\n") + "\n");
console.log(lines.slice(0, 14).join("\n"));
