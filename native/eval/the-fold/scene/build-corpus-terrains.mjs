// scene/build-corpus-terrains.mjs — climb the nine-terrain lattice over the corpus weft.
//
//   node native/eval/the-fold/scene/build-corpus-terrains.mjs [--out ...]
//
// The corpus EOT is the reading; this projects it into the EO cube's OWN nine
// terrains (Existence Void/Entity/Kind · Structure Field/Link/Network ·
// Interpretation Atmosphere/Lens/Paradigm) and says, per terrain, what filled
// it and — where empty — the mechanism that would. Same machinery the reading
// lexicon uses (projectTerrainState + projectEmergentTerrains + merge).
//
// A relation edge is a Structure Link (CON·Figure) when its connector is a
// verb, a Structure Field (CON·Ground) when it is a preposition — LP18's grain
// law, applied mechanically. Referents are Entity. Field/Network emerge from
// edge scope + shared referents. Atmosphere/Lens/Paradigm need the interpretive
// layer (obligations / focused readings), which this reading does not yet emit.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseWeftJsonl } from "../../../the-fold/eot-weft.mjs";
import { TERRAINS, projectTerrainState, terrainCounts } from "../../../kernel/terrain-state.js";
import { projectEmergentTerrains, mergeTerrainStates } from "../../../kernel/emergent-terrain.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const OUT = path.resolve(HERE, opt("--out", "/Users/mlacy/Documents/3.0/Zenodotus/derived-priors/hyperlexicon-priors/udhr-corpus-terrains-v1.json"));
const WEFT = path.resolve(HERE, opt("--weft", "corpus.eot.jsonl"));

const PREP = new Set(["of","in","to","for","with","on","by","from","into","at","as","about","over","under","between","among","through","against","without","within","upon","per","via","an","des","der","von","voor","van","de","del","en"]);
const terrainForConnector = (label) => PREP.has(String(label).toLowerCase()) ? "Field" : "Link";
const cell = (terrain) => terrain === "Field" ? { op: "CON", grain: "Ground" } : { op: "CON", grain: "Figure" };

const weft = parseWeftJsonl(fs.readFileSync(WEFT, "utf8"));

const graphEntries = [];
const obligations = [];
const counts = { referents: 0, links: 0, fields: 0 };

for (const pass of weft ?? []) {
  const src = pass.address;
  // referents (the cast) → Entity
  for (const c of pass.cast ?? []) {
    if (!c?.ref) continue;
    graphEntries.push({ schema: "EOReferent@1", id: c.ref, terrain: "Entity", status: "open", surface: c.surface ?? null, surfaces: c.allSurfaces ?? [] });
    counts.referents++;
  }
  // relations → Link or Field, scoped to their clause so Field/Network emerge
  let i = 0;
  for (const rel of pass.relations ?? []) {
    const parts = rel.participants ?? [];
    if (parts.length < 2 || !rel.relation) continue;
    const t = terrainForConnector(rel.relation);
    const clause = Number.isFinite(rel.clause) ? rel.clause : (Number.isFinite(rel.at) ? rel.at : i);
    const scope = { sequencePosition: clause, byteOffset: rel.at ?? null, source: src };
    graphEntries.push({
      schema: "EOHyperedge@1",
      id: `edge:${pass.seq}:${i++}`,
      terrain: t,
      eo: { ...cell(t), mode: "Relate", domain: "Structure", stance: t === "Field" ? "Tending" : "Binding" },
      status: "open",
      witness: `${src}#${rel.at ?? 0}`,
      scope,
      meta: { encounterRef: `${src}:clause:${clause}`, compositionStanding: { eligible: true } },
      relation: rel.relation,
      participants: parts.map((p) => ({ surface: p.surface ?? null, ref: p.ref ?? null, standing: p.standing ?? "referent" })),
    });
    if (t === "Field") counts.fields++; else counts.links++;
  }
}

const fold = { graphEntries, obligations, transformationObjects: [] };
const declared = projectTerrainState(fold);
const emergent = projectEmergentTerrains(fold);
const state = mergeTerrainStates(declared, emergent);
const tally = terrainCounts(state);

const FILLED_BY = {
  Void: "refusals and typed gaps (exclusions, unresolved alternatives)",
  Entity: "admitted referents and their occurrences",
  Kind: "kind induction over the admitted population (kind-induction.js)",
  Field: "scope projections over relation edges (emergent-terrain.js)",
  Link: "witnessed relation edges (perceiver's SVO extraction)",
  Network: "relation network components (emergent-terrain.js)",
  Atmosphere: "interpretive atmosphere factor field (atmosphere-math.js)",
  Lens: "focused readings of one passage against a claim",
  Paradigm: "paradigm projections surviving upward propagation",
};

const BAND = {
  Existence: ["Void", "Entity", "Kind"],
  Structure: ["Field", "Link", "Network"],
  Interpretation: ["Atmosphere", "Lens", "Paradigm"],
};
const NEEDS = {
  Void: "a refusal/gap line (the reading must say what it could not read)",
  Entity: "—",
  Kind: "a COHERENT POPULATION to cluster (kind-induction.js needs a shared feature space; 32 languages are not one)",
  Field: "edges sharing a scope (have it)",
  Link: "witnessed relation edges (have it)",
  Network: "connected components over edges+referents (have it)",
  Atmosphere: "EOObligation@1 with a material distinction (the reading must open an injunction — Jaimini DEF·Figure)",
  Lens: "a focused reading of one passage against a claim",
  Paradigm: ">=2 obligations sharing an interpretive signature with >=2 independent grounds",
};

console.log(`corpus terrains — weft ${weft.length} passes`);
console.log(`  graph entries: ${graphEntries.length} (${counts.referents} referents · ${counts.links} links · ${counts.fields} fields)\n`);
for (const [band, ts] of Object.entries(BAND)) {
  console.log(`  ${band}`);
  for (const t of ts) {
    const n = tally[t] ?? 0;
    console.log(`    ${t.padEnd(11)} ${String(n).padStart(6)}  ${n === 0 ? "EMPTY — needs " + NEEDS[t] : ""}`);
  }
}

const artifact = {
  schema: "EOLexicon@1",
  kind: "corpus-terrains",
  terrain: "corpus lattice projection",
  source: `${path.relative("/Users/mlacy/Documents/3.0", WEFT)} (the corpus weft)`,
  generated_from: "build-corpus-terrains.mjs (projectTerrainState + projectEmergentTerrains)",
  counts: tally,
  counts_input: counts,
  filled_by: FILLED_BY,
  empty: TERRAINS.filter((t) => (tally[t] ?? 0) === 0),
  falsifying_control: "a terrain claimed non-empty whose entries carry no producing cell/edge, or a Link counted for a preposition connector (LP18), breaks this projection.",
  history: [{ at: new Date().toISOString(), event: "born", note: "first terrain-lattice projection of the UDHR corpus weft" }],
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(artifact, null, 2));
console.log(`\nwrote ${OUT}`);
