// gender-chain.js — the name-gender giver as a CHAIN (the user's "all three, in a chain"), one
// overcomeable prior layered over the next. Priority, highest first, exactly the standing rule
// "the text's own clause-local evidence overrides a prior only when it recurs":
//
//   told (what the user said)  >  corpus (open)  >  title  >  dictionary given-name sense  >  Wikidata snapshot  >  (word-count table, absent until built)
//
// The three lower layers after the corpus are ONE source, native/adapters/text/gender-of-words.js (the given-name prior: a title that precedes a name, the name's dictionary sense, the Wikidata snapshot where the
// two are silent; each with its measured reliability), and "told" is the same prior's top layer, from the user's corrections (a pharos entry of kind correction, read by the caller and passed in). The old
// Wikidata vote-giver stays only as the fallback when that prior cannot load (a typed gap: `layers` says so), so the chain never runs with a silent hole.
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
import { makeDefaultNameGenderPrior, genderPriorFromWords } from "./gender-of-words.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..", "..");

/** The chain itself: { text, cast } -> Map ref -> class, layering name table (lowest), Wikidata vote-giver (fallback), the words prior (title, dictionary, snapshot), then the corpus, then what the user told (highest). */
export function genderPriorChain({ text, cast, corpusTable = null, giver = null, nameTable = null, words = null, told = null }) {
  const out = new Map();
  if (nameTable) for (const [r, c] of priorGenderFromNames({ text, cast, table: nameTable })) out.set(r, c);
  if (giver) for (const [r, c] of genderPriorFromGiver({ text, cast, giver })) out.set(r, c);
  if (words) for (const [r, c] of genderPriorFromWords({ text, cast, prior: words, sources: ["title", "name", "snapshot"] })) out.set(r, c);
  if (corpusTable) for (const [r, c] of genderPriorFromCorpus({ text, cast, corpusTable })) out.set(r, c);
  if (told) for (const [r, c] of genderPriorFromWords({ text, cast, prior: told, sources: ["told"] })) out.set(r, c);
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
let WORDS_PRIOR = null;   // the given-name prior without corrections, loaded once per process
const wordsPriorFor = (corrections) => (corrections?.size ? makeDefaultNameGenderPrior({ corrections }) : (WORDS_PRIOR ??= makeDefaultNameGenderPrior({})));
export const genderPriorChainFor = (stem, { corrections = null } = {}) => {
  const corpusTable = loadCorpusTable(stem);
  const words = stem === "eng" ? wordsPriorFor(corrections) : null, wordsOk = !!words && !words.missing;       // the given-name prior: English given names (the dictionary and the Wikidata snapshot are English)
  const giver = stem === "eng" && !wordsOk ? loadWikidataSnapshot() : null;                                       // the old vote-giver only when the prior cannot load
  const nameTable = stem === "eng" ? loadNameGender() : null;                                                      // name-gender/eng.json (absent until built)
  if (!corpusTable && !giver && !nameTable && !wordsOk) return null;
  const fn = ({ text, cast }) => genderPriorChain({ text, cast, corpusTable, giver, nameTable, words: wordsOk ? words : null, told: wordsOk && corrections?.size ? words : null });
  // every layer says whether it is there: a missing one is a typed gap, not a silent no-op
  fn.layers = { told: wordsOk ? (corrections?.size ? `${corrections.size} remembered` : "absent: no corrections were passed to the chain (the caller reads kind correction from the pharos log)") : "absent: the given-name prior did not load",
    corpus: corpusTable ? "loaded" : `absent: name-gender/corpus-${stem}.json`, title: wordsOk ? words.layers.title : "absent: the given-name prior did not load", dictionary: wordsOk ? words.layers.dictionary : "absent: the given-name prior did not load",
    snapshot: wordsOk ? words.layers.snapshot : (giver ? "loaded (the old vote-giver, as the fallback)" : "absent"), nameTable: nameTable ? "loaded" : "absent: name-gender/eng.json has not been built", legacyGiver: giver ? "used: the given-name prior could not load" : "not used" };
  return fn;
};
