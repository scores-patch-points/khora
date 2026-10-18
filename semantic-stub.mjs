// A deterministic stand-in for the embedder, for tests only: words in one CONCEPT group share an axis (so "resend" and
// "retry" are near), everything else gets a small fixed pseudo-random vector (so unrelated words stay below the null
// ceiling). It encodes a handful of synonym facts; it is not a model and measures nothing about nomic-embed-text.
const CONCEPTS = [
  ["retry", "retries", "resend", "redo", "reattempt", "again"],
  ["patient", "backoff", "jittered", "delay", "wait", "slow"],
  ["cache", "memoize", "stash"],
  ["parser", "lexer", "tokenize"],
];
const DIM = CONCEPTS.length + 24;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
export const STUB = async (texts) => texts.map((t) => {
  const v = new Array(DIM).fill(0);
  const words = String(t).toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  let hit = false;
  for (const w of words) CONCEPTS.forEach((g, i) => { if (g.includes(w)) { v[i] += 1; hit = true; } });
  if (!hit) { let h = hash(String(t)); for (let i = CONCEPTS.length; i < DIM; i++) { h = Math.imul(h, 1103515245) + 12345 >>> 0; v[i] = ((h % 1000) / 1000 - 0.5) * 0.1; } }
  return v;
});
