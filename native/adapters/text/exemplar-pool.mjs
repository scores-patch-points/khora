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

const FULL_CENTROIDS_PATH = "/Users/mlacy/Downloads/workspace/khora-clone/native/priors/phasepost-centroids-full.json";
const EMBEDDINGS_3D_PATH = "/Users/mlacy/eo-lexical-analysis/output/phasepost_embeddings_3d.json";
const CROSSING_PATH = "/Users/mlacy/eo-lexical-analysis/output/crossling_27_cells.json";

let _fullCentroids = null;
let _pool3d = null;

export function loadFullCentroids() {
  if (_fullCentroids) return _fullCentroids;
  try {
    _fullCentroids = JSON.parse(fs.readFileSync(FULL_CENTROIDS_PATH, "utf8"));
  } catch (e) {
    _fullCentroids = null;
  }
  return _fullCentroids;
}

export function buildExemplarPool(lang = "English", K = 10) {
  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_3D_PATH, "utf8"));
  const langData = data[lang];
  if (!langData) return null;
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

  return { pool, centroidMap, nCells: Object.keys(pool).length, K, lang };
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
export function supportedLanguages() {
  try {
    const data = JSON.parse(fs.readFileSync(EMBEDDINGS_3D_PATH, "utf8"));
    return Object.keys(data);
  } catch (e) {
    return [];
  }
}
