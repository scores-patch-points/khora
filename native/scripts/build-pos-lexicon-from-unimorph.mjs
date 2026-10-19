// khora · build-pos-lexicon-from-unimorph — the received class LEXICON that sits beside the treebank
// POS prior (pos-eng.json), consulted by wordclass.js::classifyWord only when the treebank has no
// entry for a form. Two givers, kept apart in the output:
//
//   1. UniMorph English (github.com/unimorph/eng), as already extracted into the three the-fold
//      fixtures — verb forms, noun-only forms, and the forms tagged BOTH noun and verb. UniMorph
//      attests a form's class; it carries no frequencies, so the lexicon carries none either.
//      Ambiguity is kept as a SET ("NOUN|VERB"), never resolved here (MINE-1's disambiguated run:
//      a per-essay determiner vote traded recall for no real precision and added contradictions).
//   2. A DECLARED closed class: the here-/there-/where- compound adverbs of legal English and a few
//      register words (aforesaid, forthwith, notwithstanding…). A closed class is enumerated, not
//      measured — it says so in its own provenance, and the build reports any listed form the
//      treebank attests with a conflicting class (the falsifying control).
//
// Usage: node native/scripts/build-pos-lexicon-from-unimorph.mjs <fixtures-dir> <pos-eng.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [DIR, TREEBANK, OUT] = process.argv.slice(2);
if (!DIR || !TREEBANK || !OUT) { console.error("usage: build-pos-lexicon-from-unimorph.mjs <fixtures-dir> <pos-eng.json> <out.json>"); process.exit(2); }
const load = (n) => new Set(JSON.parse(readFileSync(path.join(DIR, n), "utf8")));
const V = load("unimorph-eng-verb-forms.json");
const NV = load("unimorph-eng-ambiguous-nv.json");
const N = load("unimorph-eng-noun-only.json");

const classes = { NOUN: [], VERB: [], "NOUN|VERB": [] };
for (const f of V) { if (NV.has(f)) continue; if (N.has(f)) classes["NOUN|VERB"].push(f); else classes.VERB.push(f); }
for (const f of NV) classes["NOUN|VERB"].push(f);
for (const f of N) if (!V.has(f)) classes.NOUN.push(f);

// Declared closed class — enumerated from the grammar of legal English, not measured from a corpus.
const here = "after by in inafter inbefore of to tofore under unto upon with".split(" ");
const there = "after by fore from in inafter of on to under upon with".split(" ");
const where = "as at by fore from in of on to under upon with".split(" ");
const closed = {
  ADV: [...here.map((s) => "here" + s), ...there.map((s) => "there" + s), ...where.map((s) => "where" + s), "insofar", "duly", "forthwith", "heretofore", "hitherto", "thenceforth", "hereinabove", "hereinbelow"],
  ADJ: ["aforesaid", "aforementioned", "abovementioned", "foregoing"],
  "ADP|ADV": ["notwithstanding"],
  "DET|PRON": ["whichever", "whosoever"],
  SCONJ: ["whereas"],
};
const tb = JSON.parse(readFileSync(TREEBANK, "utf8")).forms;
const conflicts = [];
for (const [key, list] of Object.entries(closed)) {
  for (const f of list) {
    const t = tb[f]; if (t && !Object.keys(t).some((u) => key.split("|").includes(u))) conflicts.push({ form: f, declared: key, treebank: t });
    (classes[key] ||= []);
    if (!classes[key].includes(f)) classes[key].push(f);
  }
}
// a closed-class form wins over a UniMorph noun/verb attestation of the same form (it is the narrower, declared giver)
const closedForms = new Set(Object.values(closed).flat());
for (const k of ["NOUN", "VERB", "NOUN|VERB"]) classes[k] = classes[k].filter((f) => !closedForms.has(f));
for (const k of Object.keys(classes)) classes[k] = [...new Set(classes[k])].sort();

const out = {
  schema: "POSLexicon@1",
  language: "eng",
  provenance: {
    givers: [
      { name: "UniMorph English", source: "https://github.com/unimorph/eng", via: "eoreader7 native/eval/the-fold/fixtures/unimorph-eng-{verb-forms,noun-only,ambiguous-nv}.json", kind: "received lexicon", covers: ["NOUN", "VERB", "NOUN|VERB"] },
      { name: "declared closed class: legal-register adverbs and determiners", kind: "enumerated, not measured", covers: Object.keys(closed), note: "the here-/there-/where- compounds and a few register words; any listed form the treebank attests with a conflicting class is reported at build time" },
    ],
    counts: Object.fromEntries(Object.entries(classes).map(([k, v]) => [k, v.length])),
    note: "ATTESTATION, never frequency: a form here is known to be of the class(es) listed, with no counts. classifyWord returns these candidates with share:null, so dominantClass never settles — and heard-surfaces never refuses — a word on a lexicon entry alone. Multi-class keys ('NOUN|VERB') are ambiguity preserved, not resolved.",
    closed_class_conflicts_with_treebank: conflicts,
    built_by: "native/scripts/build-pos-lexicon-from-unimorph.mjs",
  },
  classes,
};
writeFileSync(OUT, JSON.stringify(out));
console.log(JSON.stringify({ out: OUT, counts: out.provenance.counts, conflicts }, null, 1));
