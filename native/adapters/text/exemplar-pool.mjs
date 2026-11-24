// exemplar-pool.mjs — kind-induced pool of most unique exemplars per phasepost cell.
// "Sniffing" = embedding ablation + kind-induced pool of most unique exemplars.
// Uses the FULL 3072-dim embeddings from the eo-lexical-analysis study.
// Supports 27 languages via the phasepost_embeddings_3d.json (for 3D visualization)
// and phasepost-centroids-full.json (for full-dimensional nearest-cell).
//
// The pool contains the most representative verbs for each of the 27 cells.
// Given a new word, we can check if it's in the pool (exact match) or
// find the nearest centroid (by string similarity or embedding distance).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { priorJson } from "../../the-fold/prior-source.mjs";
import { cellOf, OPERATOR_CHAIN } from "../../kernel/cube.js";

// WHERE THE STUDY'S DATA IS. Three absolute paths on one machine (/Users/mlacy/...) were hard-coded here, and a machine without them did not read less: it threw on the first row.
// Now: the study's directory is $EO_LEXICAL_ANALYSIS_DIR, else ~/eo-lexical-analysis (the eo-lexical-analysis study's own checkout); the full-dimensional centroids come through the
// priors door by name (janus/priors holds them); a file that is not there is a typed gap that `smellStatus()` states, never a throw and never a silent empty.
const STUDY_DIR = process.env.EO_LEXICAL_ANALYSIS_DIR ? path.resolve(process.env.EO_LEXICAL_ANALYSIS_DIR) : path.join(os.homedir(), "eo-lexical-analysis");
const EMBEDDINGS_3D_PATH = path.join(STUDY_DIR, "output", "phasepost_embeddings_3d.json");
const CROSSING_PATH = path.join(STUDY_DIR, "output", "crossling_27_cells.json");
const FULL_CENTROIDS_NAME = "phasepost-centroids-full.json";

let _fullCentroids = null;
let _pool3d = null;

export function loadFullCentroids() {
  if (_fullCentroids) return _fullCentroids;
  _fullCentroids = priorJson(FULL_CENTROIDS_NAME) ?? null;
  return _fullCentroids;
}

// The study (2026-02, eo-lexical-analysis) named the nine operators by an older registry: DES, ALT and SUP stand where the kernel says SIG, DEF and EVA (cube.js: "ALT and SUP are
// not canonical operators"). The study's own records carry each operator's MODE (pos) and DOMAIN (tri), which is what the kernel's operators are defined by, so the translation is
// DERIVED from the data, never typed: the kernel operator with the same mode and domain. DES is (Relate, Existence) = SIG; ALT (Differentiate, Interpretation) = DEF; SUP (Relate,
// Interpretation) = EVA; the other six are the same operator under the same name. An operator with no kernel counterpart, or two that collide, is a gap in the status.
function kernelOpMap(centroids) {
  const byModeDomain = new Map(OPERATOR_CHAIN.map((op) => { const c = cellOf(op, "Ground"); return [`${c.mode}|${c.domain}`, op]; }));
  const map = {}, gaps = [];
  for (const c of centroids) {
    const k = byModeDomain.get(`${c.pos}|${c.tri}`);
    if (!k) { gaps.push({ op: c.op, why: `no kernel operator is (${c.pos}, ${c.tri})` }); continue; }
    if (map[c.op] && map[c.op] !== k) gaps.push({ op: c.op, why: `maps to both ${map[c.op]} and ${k}` });
    map[c.op] = k;
  }
  const used = Object.values(map); if (new Set(used).size !== used.length) gaps.push({ why: "two study operators map to one kernel operator" });
  return { map, gaps };
}

const GAP = (why, lang) => ({ pool: null, centroidMap: null, nCells: 0, K: 0, lang, opMap: {}, gap: why });   // carries the language so a gap is not rebuilt on every row

export function buildExemplarPool(lang = "English", K = 10) {
  let data;
  try { data = JSON.parse(fs.readFileSync(EMBEDDINGS_3D_PATH, "utf8")); } catch (e) { return GAP(`the study's file ${EMBEDDINGS_3D_PATH} could not be read (${String(e?.code ?? e?.message ?? e).slice(0, 60)}); set EO_LEXICAL_ANALYSIS_DIR`, lang); }
  const langData = data[lang];
  if (!langData) return GAP(`the study has no language "${lang}"`, lang);
  const centroids = langData.centroids;
  const scatter = langData.scatter;

  // Build centroid map: op|ref -> centroid
  const centroidMap = {};
  for (const c of centroids) {
    centroidMap[`${c.op}|${c.ref}`] = { x: c.x, y: c.y, z: c.z, op: c.op, ref: c.ref, n: c.n, sample_verbs: c.sample_verbs || [] };
  }

  // Use sample_verbs as exemplars (the study's most representative verbs per cell)
  const pool = {};
  for (const c of centroids) {
    const key = `${c.op}|${c.ref}`;
    const verbs = c.sample_verbs || [];
    pool[key] = verbs.slice(0, K).map((v) => ({
      verb: v,
      op: c.op,
      ref: c.ref,
      x: c.x, y: c.y, z: c.z,
    }));
  }

  const { map: opMap, gaps } = kernelOpMap(centroids);
  return { pool, centroidMap, nCells: Object.keys(pool).length, K, lang, opMap, ...(gaps.length ? { gap: `operator translation: ${gaps.map((g) => g.why).join("; ")}` } : {}) };
}

export function getExemplarPool(lang = "English") {
  if (!_pool3d || _pool3d.lang !== lang) {
    _pool3d = buildExemplarPool(lang);
  }
  return _pool3d;
}

export function mostUniqueExemplars(cellKey, K = 5, lang = "English") {
  const { pool } = getExemplarPool(lang);
  return (pool?.[cellKey] ?? []).slice(0, K);
}

export function allExemplars(lang = "English") {
  const { pool } = getExemplarPool(lang);
  const result = [];
  for (const [cell, exemplars] of Object.entries(pool ?? {})) {
    for (const ex of exemplars) result.push({ cell, ...ex });
  }
  return result;
}

// Both lookups are pure functions of (word, language) over a fixed pool, and the read asks them for EVERY row: memoised per
// distinct word (a novel repeats its words; measured 2026-11-23: nearestCellByString was 48% of a 300k-char read's CPU).
// The pool is rebuilt only when the language changes, and the memo with it.
const _memo = { lang: null, sniff: new Map(), nearest: new Map() };
const memoFor = (lang) => { if (_memo.lang !== lang || _memo.pool !== getExemplarPool(lang)) { _memo.lang = lang; _memo.pool = getExemplarPool(lang); _memo.sniff = new Map(); _memo.nearest = new Map(); } return _memo; };

// Sniff a word by checking if it's in the exemplar pool (exact match)
export function sniffByExemplar(word, lang = "English") {
  const M = memoFor(lang), key = String(word ?? "").toLowerCase().trim();
  if (M.sniff.has(key)) return M.sniff.get(key);
  const out = sniffByExemplarUncached(key, lang);
  M.sniff.set(key, out);
  return out;
}
function sniffByExemplarUncached(word, lang) {
  const { pool } = getExemplarPool(lang);
  const w = String(word ?? "").toLowerCase().trim();
  for (const [cell, exemplars] of Object.entries(pool ?? {})) {
    for (const ex of exemplars) {
      if (ex.verb.toLowerCase() === w) {
        return { cell, op: ex.op, ref: ex.ref, match: "exact" };
      }
    }
  }
  return null;
}

// Nearest cell by string similarity (fallback when no embedding available)
export function nearestCellByString(word, lang = "English") {
  const M = memoFor(lang), key = String(word ?? "").toLowerCase().trim();
  if (M.nearest.has(key)) return M.nearest.get(key);
  const out = nearestCellByStringUncached(key, lang);
  M.nearest.set(key, out);
  return out;
}
function nearestCellByStringUncached(word, lang) {
  const { pool } = getExemplarPool(lang);
  const w = String(word ?? "").toLowerCase().trim();
  let bestCell = null, bestSim = -1;
  for (const [cell, exemplars] of Object.entries(pool ?? {})) {
    for (const ex of exemplars) {
      const sim = stringSimilarity(w, ex.verb.toLowerCase());
      if (sim > bestSim) { bestSim = sim; bestCell = cell; }
    }
  }
  return bestCell ? { cell: bestCell, similarity: Math.round(bestSim * 100) / 100 } : null;
}

function stringSimilarity(a, b) {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  // Simple Levenshtein-based similarity
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

// two rows instead of an (m+1)x(n+1) matrix: the same distance, no per-call matrix allocation
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = new Uint16Array(n + 1), cur = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      const del = prev[j] + 1, ins = cur[j - 1] + 1, sub = prev[j - 1] + cost;
      cur[j] = del < ins ? (del < sub ? del : sub) : (ins < sub ? ins : sub);
    }
    const t = prev; prev = cur; cur = t;
  }
  return prev[n];
}

// Full-dimensional nearest centroid (using the 3072-dim centroids)
export function nearestCellFull(embedding) {
  const fc = loadFullCentroids();
  if (!fc || !embedding) return null;
  let bestKey = null, bestDist = Infinity;
  for (let i = 0; i < fc.keys.length; i++) {
    const centroid = fc.centroids[i];
    let dist = 0;
    for (let j = 0; j < embedding.length && j < centroid.length; j++) {
      dist += (embedding[j] - centroid[j]) ** 2;
    }
    if (dist < bestDist) { bestDist = dist; bestKey = fc.keys[i]; }
  }
  return bestKey ? { cell: bestKey, distance: Math.round(Math.sqrt(bestDist) * 1000) / 1000 } : null;
}

// List supported languages
/** A cell key of the study ("DES|GROUND") in the kernel's own form ("SIG·Ground"), or null where the translation has a gap. The reader's rows still carry the study's form (row.phasepost,
 *  from reading.js, which is a baseline-guarded file); a consumer that joins the smell with the grammar's cells translates with this. */
export function kernelCell(cellKey, lang = "English") {
  const [op, ref] = String(cellKey ?? "").split("|"), { opMap } = getExemplarPool(lang), k = opMap?.[op];
  return k && ref ? `${k}·${ref[0]}${ref.slice(1).toLowerCase()}` : null;
}

/** What the smell stands on, said: whether the study's data was found, how many exemplar verbs it holds, how its operators were translated, and any gap. Never throws. */
export function smellStatus(lang = "English") {
  const P = getExemplarPool(lang), exists = (f) => { try { return fs.existsSync(f); } catch { return false; } };
  const exemplars = P.pool ? Object.values(P.pool).reduce((n, v) => n + v.length, 0) : 0;
  return { on: !!P.pool && !P.gap, gap: P.gap ?? null, lang, cells: P.nCells, exemplars, opMap: P.opMap ?? {},
    files: [{ what: "study embeddings (exemplar verbs per cell)", path: EMBEDDINGS_3D_PATH, found: exists(EMBEDDINGS_3D_PATH) }, { what: "study cross-language cells", path: CROSSING_PATH, found: exists(CROSSING_PATH) }, { what: `full centroids, through the priors door as ${FULL_CENTROIDS_NAME}`, found: !!loadFullCentroids() }],
    how: "a token is smelled when its form is one of the exemplar verbs (exact), or within 0.8 string similarity of one: a lookup of at most K verbs per cell, not an embedding of the word" };
}

export function supportedLanguages() {
  try {
    const data = JSON.parse(fs.readFileSync(EMBEDDINGS_3D_PATH, "utf8"));
    return Object.keys(data);
  } catch (e) {
    return [];
  }
}
