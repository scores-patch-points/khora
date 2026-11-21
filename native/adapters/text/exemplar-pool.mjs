// exemplar-pool.mjs — kind-induced pool of most unique exemplars per phasepost cell.
// "Sniffing" = embedding ablation + kind-induced pool of most unique exemplars.
// Uses the 3D embeddings from the eo-lexical-analysis study (phasepost_embeddings_3d.json).
// For each of the 27 cells, finds the most unique exemplars (verbs farthest from other cells).

import fs from "node:fs";

const EMBEDDINGS_PATH = "/Users/mlacy/eo-lexical-analysis/output/phasepost_embeddings_3d.json";

let _pool = null;

function cellKey(op, ref) { return `${op}|${ref}`; }

export function buildExemplarPool(K = 5) {
  if (_pool) return _pool;
  const data = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf8"));
  const lang = data["English"];
  const centroids = lang.centroids;
  const scatter = lang.scatter;

  // Build centroid map: op|ref -> {x, y, z}
  const centroidMap = {};
  for (const c of centroids) {
    centroidMap[cellKey(c.op, c.ref)] = { x: c.x, y: c.y, z: c.z, op: c.op, ref: c.ref, n: c.n, pos: c.pos, tri: c.tri };
  }

  // Use centroid sample_verbs as exemplars (the study's most representative verbs per cell)
  const pool = {};
  for (const c of centroids) {
    const key = cellKey(c.op, c.ref);
    const verbs = c.sample_verbs || [];
    pool[key] = verbs.slice(0, K).map((v) => ({
      verb: v,
      op: c.op,
      ref: c.ref,
      x: c.x, y: c.y, z: c.z,
      uniqueness: 1.0,
      n: c.n,
    }));
  }

  _pool = { pool, centroidMap, nCells: Object.keys(pool).length, K };
  return _pool;
}

export function getExemplarPool() {
  if (!_pool) buildExemplarPool();
  return _pool;
}

export function mostUniqueExemplars(cellKey, K = 5) {
  const { pool } = getExemplarPool();
  return (pool[cellKey] ?? []).slice(0, K);
}

export function allExemplars() {
  const { pool } = getExemplarPool();
  const result = [];
  for (const [cell, exemplars] of Object.entries(pool)) {
    for (const ex of exemplars) result.push({ cell, ...ex });
  }
  return result;
}

export function nearestCell(x, y, z) {
  const { centroidMap } = getExemplarPool();
  let best = null, bestDist = Infinity;
  for (const [key, c] of Object.entries(centroidMap)) {
    const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2);
    if (d < bestDist) { bestDist = d; best = key; }
  }
  return { cell: best, distance: Math.round(bestDist * 1000) / 1000 };
}
