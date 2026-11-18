// language-competency.js — what THIS read can do in THIS language, stated on the entry (the competency profile the canonical read had lost).
// The competency boards of 2026-10-10 (Zenodotus LANGUAGE-READINESS / NATIVE-COMPETENCY / EO-LANGUAGE-COMPETENCY; generators recovered under eval/competency/) lived in side scripts and the read said nothing about a language but typed gaps.
// This is the readiness logic of language-readiness.mjs, restated against what the CANONICAL read actually uses today, per stem: which pieces are on disk (through the priors door), which clause reader runs, whether pronouns bind and on what measured evidence, and what is missing.
// Pure and deterministic (a function of the stem, the priors the door serves and the shipped registers): it measures nothing at read time and claims no score; the numbers it carries are the ones recorded in the registers' own `evaluation`. Status: EXPERIMENTAL.
import { priorNames } from "../../the-fold/prior-source.mjs";
import { registerFor } from "./pronoun-registers.js";
import { CASE_MARKED_STEMS } from "./case-marked-clauses.js";
export const COMPETENCY_SCHEMA = "LanguageCompetency@1";
// English binds from the built-in pronoun table (adapters/text/pronouns.js), not a register file; its measured evaluation is the one recorded in eval/reading-baseline/BASELINE.json (the canonical English read with the overcomeable name ruling, 66 unseen GUM documents; the test reading-baseline.test.mjs keeps the two equal).
export const ENGLISH_EVALUATION = Object.freeze({ precision: 0.915, coverage: 0.636, nullPrecision: null, gold: true, resultsFile: "identity/novels/NOVELS-RESULTS-ROUND20.md" });
const cache = new Map();
export function competencyOf(stem) {
  const names = priorNames(); const key = `${stem}|${names.length}`; if (cache.has(key)) return cache.get(key); const has = (n) => names.includes(n);
  const reg = registerFor(stem); const ev = reg?.register?.evaluation ?? null;
  const pieces = { pos: has(`pos-${stem}.json`), posLexicon: has(`pos-${stem}-lexicon.json`), unimorph: has(`pos-${stem}-unimorph.json`), morphology: has(`morphology-${stem}.json`), caseMarking: has(`case-marking-${stem}.json`), params: has(`params-${stem}.json`),
    frame: has(`frame-${stem}.json`), punctuation: has(`punctuation-${stem}.json`), dotted: has(`dotted-${stem}.json`), personLexicon: has(`person-lexicon-${stem}.json`), roleConfig: has(`role-config-${stem}.json`) };
  const clauseReader = CASE_MARKED_STEMS.has(stem) ? "case-marked (the Chomsky seam: case and pro-drop)" : stem === "eng" ? "positional (English parser)" : "positional (unvalidated for this language)";
  const pronouns = stem === "eng" ? { status: "bound", origin: "built-in", ...ENGLISH_EVALUATION } : !reg ? { status: "no_register" } : !ev ? { status: "unmeasured", origin: reg.origin } : { status: "bound", origin: reg.origin, precision: ev.precision, coverage: ev.coverage, nullPrecision: ev.nullPrecision ?? null, gold: !/NO GOLD/i.test(String(ev.method ?? "")), resultsFile: ev.resultsFile ?? null };
  // dropped (null) subjects: bound for Greek by default (identity/novels NOVELS-RESULTS-ROUND21.md: PROIEL empty-pronoun gold, 0.551 precision at 43.3% coverage on the test books, 0.705 at 46.6% on JOHN, above the shuffled null); other case-marked stems run it only when asked and have no measurement
  const proDrop = stem === "grc" ? { status: "bound", precision: 0.551, coverage: 0.433, nullPrecision: 0.415, gold: true, resultsFile: "identity/novels/NOVELS-RESULTS-ROUND21.md" } : CASE_MARKED_STEMS.has(stem) ? { status: "unmeasured" } : { status: "not_applicable" };
  const next = []; if (!pieces.pos) next.push(`pos-${stem}.json (a part-of-speech prior from a treebank)`);
  if (pieces.unimorph) next.push(`pos-${stem}-unimorph.json is on disk and the read does not load it`);
  if (pieces.pos && !pieces.morphology && !pieces.unimorph) next.push(`morphology-${stem}.json (verbs match exactly without it)`);
  if (pieces.pos && !CASE_MARKED_STEMS.has(stem) && stem !== "eng") next.push(clauseReader.startsWith("positional") ? "a clause reader validated for this language (the positional one is English-shaped)" : "");
  if (stem !== "eng" && !reg) next.push(`a pronoun register for ${stem} (forms, gender class) with its evaluation`); else if (stem !== "eng" && !ev) next.push(`the register's evaluation (no unmeasured binding ships)`);
  if (pronouns.status === "bound" && !pronouns.gold) next.push(`gold coreference for ${stem} (the recorded precision is gold-free)`);
  if (!pieces.punctuation) next.push(`punctuation-${stem}.json`); if (!pieces.dotted) next.push(`dotted-${stem}.json`);
  const tier = !pieces.pos ? "bare" : (CASE_MARKED_STEMS.has(stem) || stem === "eng") && pronouns.status === "bound" ? "reading+pronouns" : CASE_MARKED_STEMS.has(stem) || stem === "eng" ? "reading" : "lexical";
  const out = Object.freeze({ schema: COMPETENCY_SCHEMA, stem, tier, pieces: Object.freeze(pieces), clauseReader, pronouns: Object.freeze(pronouns), proDrop: Object.freeze(proDrop), next: next.filter(Boolean) });
  if (cache.size > 64) cache.clear(); cache.set(key, out); return out;
}
