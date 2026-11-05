// identity-fixture.mjs — shared fixtures for the identity-path tests (identity-*.test.mjs, navbox-contamination.test.mjs).
// Every log here is written by the REAL reader (adapters/text/recursive.js::createCausalTextPerceiver stepped by kernel/reading.js over the adapter's own
// textEncounters; text that is read as a document goes through native/reading.js::readDocument). Nothing is typed in: no log entry is hand-built except where a
// test says it is an absent schema being proposed. Run with KHORA_PRIORS_DIR=<the ten English priors> (the canon preflight's stand-in folder).
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { createRecursiveReader } from "../kernel/reading.js";
import { grammarFor } from "./language-grammar.js";
import { readDocument } from "../reading.js";

/** The reader is not degraded: the English priors are present and a probe read raises no gap and has clauses (the canon preflight's own three checks, run here
 *  so a test on a degraded reader fails loudly instead of passing on nothing). */
export async function assertCanon(assert) {
  const g = grammarFor("en", { text: "x" });
  assert.ok(g.posPrior && g.framePrior, `the English POS/frame priors are not loaded (grammar gap: ${g.gap}) — set KHORA_PRIORS_DIR`);
  const probe = "Machu Picchu is a 15th-century Inca citadel in southern Peru. It was built around 1450. The site was abandoned a century later.";
  const r = await readDocument(probe, { language: "en", minCharacters: 0, lexicon: false });
  const gaps = (r.gaps ?? []).map((x) => x.gap);
  assert.deepEqual(gaps, [], `the reader reports gaps on the probe: ${gaps}`);
  assert.ok(Array.isArray(r.clauses), "no clauses (no parser prior)");
}

// Three fragments of one name recurring, then the fuller name: the shape that makes the reader RE-ADDRESS a fragment and RECORD that two addresses are one being.
// At refreshEvery 2 (a reprojection every second encounter, the capital tier alone) the reader writes both an EOReferentMerge@1 and an EOReferentReassignment@1 for
// the SAME pair, ref:auto:petrovitch -> ref:auto:pyotr. At refreshEvery 1 or 3 it writes neither; the cadence is part of the fixture.
export const PYOTR_SENTENCES = [
  "The clerk saw Pyotr at the door.", "Then the clerk heard Pyotr in the hall.", "Later the clerk praised Pyotr again.",
  "The clerk saw Petrovitch at the door.", "Then the clerk heard Petrovitch in the hall.", "Later the clerk praised Petrovitch again.",
  "The clerk saw Pyotr Petrovitch at the door.", "Then the clerk heard Pyotr Petrovitch in the hall.", "Later the clerk praised Pyotr Petrovitch again.",
  "The clerk saw Sonia in the street.", "Then the clerk heard Sonia in the church.", "Later the clerk met Sonia Marmeladov by the river.", "Then the clerk met Sonia Marmeladov near the bridge.",
];
export const PYOTR_TEXT = PYOTR_SENTENCES.join(" ");

/** Step a text through the constitutional reader; returns { log, graph } — the log as the reader wrote it and every graph entry the Observation@1 rows carry. */
export async function readLog(text, { refreshEvery = 2, source = "t", grammar = false } = {}) {
  const g = grammar ? grammarFor("en", { text }) : null;
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery, reprojectEvery: null, ...(g ? { posPrior: g.posPrior, framePrior: g.framePrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions, language: g.language } : {}) });
  const reading = await createRecursiveReader({ perceivers: [perceiver], adapters: {} }).read(textEncounters(text, { source }));
  return { log: reading.log, graph: reading.log.flatMap((e) => e.graphEntries ?? []) };
}

/** The perceiver's own observations for a text, fed through the production door's configuration (corpus-session.js: grammar priors, reproject at the default cadence). */
export async function perceive(text, { language = "en" } = {}) {
  const g = grammarFor(language, { text });
  const perceiver = createCausalTextPerceiver({ posPrior: g.posPrior, framePrior: g.framePrior, proclitics: g.proclitics, enclitics: g.enclitics, contractions: g.contractions, reprojectEvery: null, language: g.language });
  const out = [];
  for (const enc of textEncounters(text, { source: "t" })) out.push(...(await perceiver.perceive(enc)));
  return out;
}

/** Every schema-bearing entry nested anywhere in a list of observations (the perceiver nests graphEntries under candidates). */
export function entriesOf(observations, schema = null) {
  const out = new Map();
  const walk = (o, d = 0) => { if (!o || typeof o !== "object" || d > 8) return; if (typeof o.schema === "string" && (!schema || o.schema === schema)) out.set(o.id ?? out.size, o); for (const v of Object.values(o)) walk(v, d + 1); };
  walk(observations);
  return [...out.values()];
}

/** Every EOReferent@1 id -> surfaces seen in a list of observations. */
export function referentsOf(observations) {
  const m = new Map();
  for (const e of entriesOf(observations, "EOReferent@1")) m.set(e.id, [...new Set([...(m.get(e.id) ?? []), ...(e.surfaces ?? [])])]);
  return m;
}

/** A copy of the log with every entry of one schema removed from the Observation@1 rows' graphEntries (the log itself is never mutated). */
export const withoutSchema = (log, schema) => log.map((e) => (e.graphEntries ? { ...e, graphEntries: e.graphEntries.filter((g) => g.schema !== schema) } : e));

/** A copy of the log with one graph entry (by id) replaced by fn(entry), or dropped when fn returns null. */
export const mapGraphEntry = (log, id, fn) => log.map((e) => (e.graphEntries ? { ...e, graphEntries: e.graphEntries.map((g) => (g.id === id ? fn(g) : g)).filter(Boolean) } : e));

export const mergeOf = (graph) => graph.find((g) => g.schema === "EOReferentMerge@1");
export const reassignmentOf = (graph) => graph.find((g) => g.schema === "EOReferentReassignment@1");

/** The reading's OWN sentences as the injected splitter reviewIdentityMerges asks for: the pipeline's cut, not a splitter of ours. */
export async function pipelineSplitter(text) {
  const entry = await readDocument(text, { language: "en", minCharacters: 0, lexicon: false });
  const sentences = entry.sentences.map((s) => ({ text: s.text }));
  return () => sentences;
}
