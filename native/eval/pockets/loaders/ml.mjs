// eval/pockets/loaders/ml.mjs — group "ml": the multi-language corpus /Users/mlacy/Documents/3.0/ethos/11-multi-language (originals in several languages, English translations,
// parallel classics, dialects/pidgins/creoles, dictionary glosses, Wikipedia). One pocket per language/variety/genre-group with >= 20,000 tokens (else dropped and listed).
//   export async function load(onlyIds = null) -> Pocket[]     export async function loadWithReport(onlyIds) -> {pockets, rows, skipped}
// Lazy: build() runs only for the requested ids. See ml.manifest.json for the produced pockets and every skipped source.
import { runLoader } from "./_ud_ml_run.mjs";
import { GREEK, LATIN, SANSKRIT, ARABIC, CHINESE } from "./_ml_specs.mjs";
import { JAPANESE, OTHER_ORIGINALS, TRANSLATIONS, PARALLEL, WARPEACE, WIKI } from "./_ml_specs2.mjs";
import { DIALECT } from "./_ml_dialect.mjs";
import { STATIC_SKIPS } from "./_ml_skips.mjs";

export const GROUP = "ml";
export const SPECS = [...GREEK, ...LATIN, ...SANSKRIT, ...ARABIC, ...CHINESE, ...JAPANESE, ...OTHER_ORIGINALS, ...TRANSLATIONS, ...PARALLEL, ...WARPEACE, ...WIKI, ...DIALECT];
export const IDS = SPECS.map((s) => s.id);
export { STATIC_SKIPS };
if (new Set(IDS).size !== IDS.length) throw new Error("ml.mjs: duplicate pocket ids");
export const loadWithReport = (onlyIds = null) => runLoader(SPECS, onlyIds);
export async function load(onlyIds = null) { return (await loadWithReport(onlyIds)).pockets; }
