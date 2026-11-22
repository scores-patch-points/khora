// gender-chain.js — the name-gender giver as a CHAIN (the user's "all three, in a chain"), one
// overcomeable prior layered over the next. Priority, highest first, exactly the standing rule
// "the text's own clause-local evidence overrides a prior only when it recurs":
//
//   corpus (open)  >  Wikidata given-name giver (m/f)  >  word-count table (m/f)
//
// Each source speaks only for a being it has evidence for, and a higher source overrides a lower
// one for the same being. The corpus is the only OPEN source (m/f/n/x, the pro-form agreement
// classes); the Wikidata giver and the word table are m/f, their own known limitation, never
// promoted past it. A being ruled by the corpus stays ruled by the corpus: no lower binary source
// is allowed to overwrite a higher open one.
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { priorGenderFromNames, loadNameGender } from "./name-gender.js";
import { genderPriorFromGiver, snapshotGiverFrom } from "./wikidata-name-giver.js";
import { genderPriorFromCorpus } from "./gender-from-corpus.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

/** The chain itself: { text, cast } -> Map ref -> class, layering name table (lowest) then Wikidata giver then corpus (highest). */
export function genderPriorChain({ text, cast, corpusTable = null, giver = null, nameTable = null }) {
  const out = new Map();
  if (nameTable) for (const [r, c] of priorGenderFromNames({ text, cast, table: nameTable })) out.set(r, c);
  if (giver) for (const [r, c] of genderPriorFromGiver({ text, cast, giver })) out.set(r, c);
  if (corpusTable) for (const [r, c] of genderPriorFromCorpus({ text, cast, corpusTable })) out.set(r, c);
  return out;
}

// The corpus table is built offline (scripts/build-corpus-gender.mjs) from already-ingested
// material and stored as { table: { name: { class: count } }, language, provenance }; the Map is
// rebuilt here so genderPriorFromCorpus keeps its Map shape.
const loadCorpusTable = (stem) => { try { const j = JSON.parse(fs.readFileSync(path.join(HERE, "name-gender", `corpus-${stem}.json`), "utf8")); return { table: new Map(Object.entries(j.table ?? {}).map(([n, c]) => [n, new Map(Object.entries(c))])), language: j.language, provenance: j.provenance }; } catch { return null; } };
const loadWikidataSnapshot = () => { try { return snapshotGiverFrom(path.join(REPO, "identity", "givers", "wikidata-given-names-en.json")); } catch { return null; } };

/**
 * The canonical gender giver for a stem, or null (no giver for this language -> the prior is
 * absent, which is the honest answer, not a silent binary default). Same shape the read expects:
 * a function of the stem returning ({ text, cast }) -> Map ref -> class.
 */
export const genderPriorChainFor = (stem) => {
  const corpusTable = loadCorpusTable(stem);
  const giver = stem === "eng" ? loadWikidataSnapshot() : null;          // the Wikidata snapshot is English given-names
  const nameTable = stem === "eng" ? loadNameGender() : null;            // name-gender/eng.json (absent until built)
  if (!corpusTable && !giver && !nameTable) return null;
  return ({ text, cast }) => genderPriorChain({ text, cast, corpusTable, giver, nameTable });
};
