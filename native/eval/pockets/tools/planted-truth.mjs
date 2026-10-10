// eval/pockets/tools/planted-truth.mjs — assemble results/planted-truth.json (truth statements + realised measurements + reference-run outcomes) and loaders/planted.manifest.json.
//   node tools/planted-truth.mjs      (needs results/planted-selfcheck.json and results/planted-calibration.json from planted-selfcheck.mjs and planted-calibrate.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256, validate } from "../lib/pocket.mjs";
import { load, SPECS } from "../loaders/planted.mjs";
import { V, DOC_TOKENS, LEN_PARAMS, LENGTH_LAW, TAG } from "../loaders/_planted-core.mjs";
import * as M from "./planted-measure.mjs";
import * as M2 from "./planted-measure2.mjs";
import { A } from "./planted-truth-text-a.mjs";
import { B } from "./planted-truth-text-b.mjs";
import { INSTRUMENT_NOTES, GATE_MAP } from "./planted-truth-notes.mjs";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const sc = rd("results/planted-selfcheck.json"), cal = rd("results/planted-calibration.json"), TEXT = { ...A, ...B };
const pockets = await load(), P = Object.fromEntries(pockets.map((p) => [p.id, p]));
const fired = (id) => { const h = sc.pockets[id], out = []; for (const s of Object.keys(h.discover)) { const a = h.discover[s], b = h.confirm[s]; if (a.z != null && b.z != null && Math.abs(a.z) >= 4 && Math.abs(b.z) >= 4 && Math.sign(a.z) === Math.sign(b.z)) out.push({ stat: s, sign: a.z > 0 ? "+" : "-", null: a.null, z: [+a.z.toFixed(1), +b.z.toFixed(1)], v: [+a.v.toFixed(4), +b.v.toFixed(4)], nullMean: [+a.nullMean.toFixed(4), +b.nullMean.toFixed(4)] }); } return out; };
const LEXSTATS = ["lenFreq", "zipfSlope", "meanUnitLen"];
const cells = (id) => { const h = sc.pockets[id]; let defined = 0, ge4 = 0; for (const w of ["discover", "confirm"]) for (const [s, c] of Object.entries(h[w])) if (c.z != null && !LEXSTATS.includes(s)) { defined++; if (Math.abs(c.z) >= 4) ge4++; } return { definedCells: defined, cellsAbsZge4: ge4 }; };
const realised = { "pl-burst": { burst: M.burst(P["pl-burst"]) }, "pl-markov": { markov: M.markov(P["pl-markov"]) }, "pl-frames": { frames: M2.frames(P["pl-frames"]) }, "pl-parallel": { parallel: M.parallel(P["pl-parallel"]) }, "pl-length": { length: M.length(P["pl-length"]) }, "pl-mix": { mix: M2.mix(P["pl-mix"]) } };
const worlds = {};
for (const spec of SPECS) {
  const t = TEXT[spec.id];
  worlds[spec.id] = { id: spec.id, summary: t.summary, design: t.design, phenomena: t.phenomena.map((x) => ({ zDetectable: true, ...x })), byProducts: t.byProducts || [], mustNotFire: t.mustNotFire, latentConstants: t.latentConstants || null,
    realised: { common: M.common(P[spec.id]), ...(realised[spec.id] || {}) }, referenceRun: { statisticsFiredInBothHalvesSameSign: fired(spec.id), ...cells(spec.id), note: "reference statistics of tools/selfcheck-stats.mjs, not the atlas laws; definedCells = cells with a z that is not null, excluding the three lexicon-level reference statistics lenFreq, zipfSlope, meanUnitLen (their z is null or float noise); nInitBound has a null z when the null draws are all 0" } };
}
const truth = { version: 1, date: "2026-10-07", group: "pl", protocol: "eval/pockets/PROTOCOL.md sha256 3b7363c5b01642c06ad5df8d059e5909f237516481e0ed8af3379aa39c4330fc", generator: { loader: "loaders/planted.mjs (+ _planted-core.mjs, _planted-worlds1.mjs, _planted-worlds2.mjs)", seedNamespace: TAG, designedVocabulary: V, documentTokens: DOC_TOKENS, unitLengthLaws: LEN_PARAMS, lengthLaw: LENGTH_LAW, determinism: "every document has its own rngOf(seedOf(TAG, worldId, 'doc', d)); no Math.random, no Date" },
  gate: GATE_MAP, instrumentNotes: INSTRUMENT_NOTES, calibration: { file: "results/planted-calibration.json", reps: cal.reps, statistics: cal.stats, worlds: Object.fromEntries(Object.entries(cal.worlds).map(([k, v]) => [k, { cells: v.cells, absZge4: v.ge4, absZge2: v.ge2, hits: v.hits }])) }, referenceRunFile: "results/planted-selfcheck.json", worlds };
fs.writeFileSync(path.join(ROOT, "results/planted-truth.json"), JSON.stringify(truth, null, 1) + "\n");
const manifest = { group: "pl", loader: "loaders/planted.mjs", pockets: pockets.map((p) => { const v = validate(p); return { id: p.id, tokens: v.tokens, units: v.units, docs: v.docs, types: new Set(p.units.flat()).size, register: p.register, language: p.language, script: p.script, tokenisation: "synthetic words", capApplied: false, contentSha256: sha256(JSON.stringify([p.units, p.docOf])) }; }),
  skipped: [], notes: "All eight planted pockets are below the 300,000-token cap, so no whole-document capping was applied. Content hashes allow the G2 determinism check (two separate processes give identical hashes)." };
fs.writeFileSync(path.join(ROOT, "loaders/planted.manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
console.error("wrote planted-truth.json and planted.manifest.json");
